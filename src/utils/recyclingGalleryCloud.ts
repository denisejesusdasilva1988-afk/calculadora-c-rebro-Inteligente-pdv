import {
  collection,
  deleteDoc,
  doc,
  getDocFromServer,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { FirestoreErrorInfo, OperationType } from "../types";
import {
  getIsFirestoreQuotaPaused,
  isQuotaExhaustedError,
  markFirestoreQuotaPaused
} from "./firestoreQuotaManager";

export type RecyclingMomentCategory =
  | "entrega"
  | "pesagem"
  | "coleta"
  | "pagamento"
  | "carga"
  | "outro";

export interface RecyclingMomentPhoto {
  id: string;
  userId: string;
  collaboratorId: string;
  collaboratorName: string;
  caption: string;
  category: RecyclingMomentCategory;
  imageDataUrl: string;
  capturedAt: string;
  createdAtMs: number;
  syncStatus: "synced" | "pending";
}

export const RECYCLING_MOMENT_CATEGORIES: {
  id: RecyclingMomentCategory;
  label: string;
  shortLabel: string;
}[] = [
  { id: "entrega", label: "Entrega no Portão", shortLabel: "Entrega" },
  { id: "pesagem", label: "Pesagem na Balança", shortLabel: "Pesagem" },
  { id: "coleta", label: "Coleta na Rua", shortLabel: "Coleta" },
  { id: "pagamento", label: "Acerto / Recibo", shortLabel: "Acerto" },
  { id: "carga", label: "Carga / Caminhão", shortLabel: "Carga" },
  { id: "outro", label: "Outro Momento", shortLabel: "Outro" }
];

const IDB_NAME = "pdv_dw_recycling_gallery_idb_v1";
const IDB_STORE = "photos";
const MAX_FIRESTORE_DATA_URL_LEN = 430_000;

export function sanitizeValidFirestoreId(raw: string, fallbackPrefix = "item"): string {
  const cleaned = String(raw || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 120);
  return cleaned || `${fallbackPrefix}_${Date.now()}`;
}

export function buildNewGalleryPhotoId(): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return sanitizeValidFirestoreId(`rec_photo_${Date.now()}_${rand}`, "rec_photo");
}

export function getCategoryMeta(cat: RecyclingMomentCategory) {
  return RECYCLING_MOMENT_CATEGORIES.find((c) => c.id === cat) || RECYCLING_MOMENT_CATEGORIES[5];
}

function handleFirestoreGalleryError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  if (isQuotaExhaustedError(error)) {
    markFirestoreQuotaPaused();
  }
  const auth = getAuth();
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email
        })) || []
    }
  };
  console.error("Firestore Gallery Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function verifyFirestoreGalleryConnection(db: any): Promise<boolean> {
  if (!db || getIsFirestoreQuotaPaused()) return false;
  try {
    await getDocFromServer(doc(db, "test", "connection"));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.warn("Galeria na nuvem aguardando conexão com o Firestore.");
    }
    return false;
  }
}

export async function compressRecyclingMomentPhoto(file: File): Promise<string> {
  if (!file || !file.type.startsWith("image/")) {
    throw new Error("Selecione um arquivo de imagem válido.");
  }

  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Não foi possível ler a foto selecionada."));
    reader.onload = (ev) => {
      const res = ev.target?.result;
      if (typeof res === "string" && res.startsWith("data:image/")) {
        resolve(res);
      } else {
        reject(new Error("Formato de imagem inválido."));
      }
    };
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onerror = () => reject(new Error("Não foi possível abrir esta foto."));
    el.onload = () => resolve(el);
    el.src = rawDataUrl;
  });

  const attempts: { maxDim: number; quality: number }[] = [
    { maxDim: 1080, quality: 0.8 },
    { maxDim: 920, quality: 0.72 },
    { maxDim: 760, quality: 0.62 },
    { maxDim: 600, quality: 0.54 }
  ];

  for (const step of attempts) {
    let width = img.naturalWidth || img.width || step.maxDim;
    let height = img.naturalHeight || img.height || step.maxDim;
    if (width > step.maxDim || height > step.maxDim) {
      if (width >= height) {
        height = Math.round((height * step.maxDim) / width);
        width = step.maxDim;
      } else {
        width = Math.round((width * step.maxDim) / height);
        height = step.maxDim;
      }
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, width);
    canvas.height = Math.max(1, height);
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const encoded = canvas.toDataURL("image/jpeg", step.quality);
    if (encoded.length <= MAX_FIRESTORE_DATA_URL_LEN) {
      return encoded;
    }
  }

  // Fallback compact final pass
  const fallbackCanvas = document.createElement("canvas");
  fallbackCanvas.width = 480;
  fallbackCanvas.height = Math.max(
    1,
    Math.round(((img.naturalHeight || 480) * 480) / Math.max(1, img.naturalWidth || 480))
  );
  const fCtx = fallbackCanvas.getContext("2d");
  if (fCtx) {
    fCtx.fillStyle = "#ffffff";
    fCtx.fillRect(0, 0, fallbackCanvas.width, fallbackCanvas.height);
    fCtx.drawImage(img, 0, 0, fallbackCanvas.width, fallbackCanvas.height);
    const compact = fallbackCanvas.toDataURL("image/jpeg", 0.48);
    if (compact.length <= MAX_FIRESTORE_DATA_URL_LEN) {
      return compact;
    }
  }

  throw new Error("A imagem ficou muito pesada mesmo após compactação. Tente outra foto.");
}

function openGalleryDb(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || !window.indexedDB) return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const database = req.result;
        if (!database.objectStoreNames.contains(IDB_STORE)) {
          database.createObjectStore(IDB_STORE, { keyPath: "id" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function readLocalGalleryCache(scopeUid?: string | null): Promise<RecyclingMomentPhoto[]> {
  const idb = await openGalleryDb();
  if (!idb) return [];
  return new Promise((resolve) => {
    try {
      const tx = idb.transaction(IDB_STORE, "readonly");
      const store = tx.objectStore(IDB_STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        const rows = Array.isArray(req.result) ? (req.result as RecyclingMomentPhoto[]) : [];
        const filtered = scopeUid
          ? rows.filter((p) => p.userId === scopeUid || p.userId === "local")
          : rows;
        filtered.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
        resolve(filtered);
      };
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

export async function putLocalGalleryPhoto(photo: RecyclingMomentPhoto): Promise<void> {
  const idb = await openGalleryDb();
  if (!idb) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = idb.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).put(photo);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function removeLocalGalleryPhoto(photoId: string): Promise<void> {
  const idb = await openGalleryDb();
  if (!idb) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = idb.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).delete(photoId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export function subscribeCloudRecyclingGallery({
  db,
  uid,
  onPhotosUpdate,
  onSyncError
}: {
  db: any;
  uid: string;
  onPhotosUpdate: (cloudPhotos: RecyclingMomentPhoto[]) => void;
  onSyncError?: (msg: string) => void;
}): () => void {
  if (!db || !uid || uid === "guest_visitor" || getIsFirestoreQuotaPaused()) {
    return () => {};
  }

  const colPath = `users/${uid}/recycling_gallery`;
  const q = query(collection(db, "users", uid, "recycling_gallery"), where("userId", "==", uid));

  const unsub = onSnapshot(
    q,
    (snap) => {
      const items: RecyclingMomentPhoto[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        if (!d || typeof d.imageDataUrl !== "string") return;
        const item: RecyclingMomentPhoto = {
          id: String(d.id || docSnap.id),
          userId: String(d.userId || uid),
          collaboratorId: String(d.collaboratorId || "geral"),
          collaboratorName: String(d.collaboratorName || "Reciclagem"),
          caption: String(d.caption || ""),
          category: (d.category as RecyclingMomentCategory) || "entrega",
          imageDataUrl: d.imageDataUrl,
          capturedAt: String(d.capturedAt || ""),
          createdAtMs: Number(d.createdAtMs) || Date.now(),
          syncStatus: "synced"
        };
        items.push(item);
        void putLocalGalleryPhoto(item);
      });
      items.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
      onPhotosUpdate(items);
    },
    (error) => {
      if (isQuotaExhaustedError(error)) {
        markFirestoreQuotaPaused();
        onSyncError?.("Cota diária gratuita da nuvem atingida; exibindo cache local.");
        return;
      }
      try {
        handleFirestoreGalleryError(error, OperationType.LIST, colPath);
      } catch (wrappedErr: any) {
        onSyncError?.(wrappedErr?.message || "Erro ao sincronizar galeria na nuvem.");
      }
    }
  );

  return unsub;
}

export async function saveRecyclingMomentPhoto({
  db,
  uid,
  collaboratorId,
  collaboratorName,
  caption,
  category,
  imageDataUrl,
  existingPhotoId,
  existingCapturedAt,
  existingCreatedAtMs
}: {
  db: any;
  uid?: string | null;
  collaboratorId: string;
  collaboratorName: string;
  caption: string;
  category: RecyclingMomentCategory;
  imageDataUrl: string;
  existingPhotoId?: string;
  existingCapturedAt?: string;
  existingCreatedAtMs?: number;
}): Promise<RecyclingMomentPhoto> {
  const auth = getAuth();
  const activeUid =
    auth?.currentUser?.uid && (!uid || auth.currentUser.uid === uid) ? auth.currentUser.uid : null;

  const photoId = sanitizeValidFirestoreId(existingPhotoId || buildNewGalleryPhotoId(), "rec_photo");
  const safeCollabId = sanitizeValidFirestoreId(collaboratorId || "geral", "collab");
  const safeCollabName = String(collaboratorName || "Colaborador").trim().slice(0, 120) || "Colaborador";
  const safeCaption = String(caption || "").trim().slice(0, 240);
  const safeCapturedAt =
    String(existingCapturedAt || new Date().toLocaleString("pt-BR")).trim().slice(0, 64) ||
    new Date().toLocaleString("pt-BR");
  const createdAtMs = Math.max(1, Math.floor(existingCreatedAtMs || Date.now()));

  if (imageDataUrl.length > MAX_FIRESTORE_DATA_URL_LEN) {
    throw new Error("A imagem ultrapassou o tamanho máximo permitido (430 KB).");
  }

  const localPhoto: RecyclingMomentPhoto = {
    id: photoId,
    userId: activeUid || uid || "local",
    collaboratorId: safeCollabId,
    collaboratorName: safeCollabName,
    caption: safeCaption,
    category,
    imageDataUrl,
    capturedAt: safeCapturedAt,
    createdAtMs,
    syncStatus: "pending"
  };

  await putLocalGalleryPhoto(localPhoto);

  if (!db || !activeUid || getIsFirestoreQuotaPaused()) {
    return localPhoto;
  }

  const docPath = `users/${activeUid}/recycling_gallery/${photoId}`;
  try {
    await setDoc(doc(db, "users", activeUid, "recycling_gallery", photoId), {
      id: photoId,
      userId: activeUid,
      collaboratorId: safeCollabId,
      collaboratorName: safeCollabName,
      caption: safeCaption,
      category,
      imageDataUrl,
      capturedAt: safeCapturedAt,
      createdAtMs,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    const syncedPhoto: RecyclingMomentPhoto = {
      ...localPhoto,
      userId: activeUid,
      syncStatus: "synced"
    };
    await putLocalGalleryPhoto(syncedPhoto);
    return syncedPhoto;
  } catch (error) {
    if (isQuotaExhaustedError(error)) {
      markFirestoreQuotaPaused();
      return localPhoto;
    }
    handleFirestoreGalleryError(error, OperationType.CREATE, docPath);
  }
}

export async function updateRecyclingMomentPhotoMeta({
  db,
  uid,
  photo,
  collaboratorId,
  collaboratorName,
  caption,
  category
}: {
  db: any;
  uid?: string | null;
  photo: RecyclingMomentPhoto;
  collaboratorId: string;
  collaboratorName: string;
  caption: string;
  category: RecyclingMomentCategory;
}): Promise<RecyclingMomentPhoto> {
  const safeCollabId = sanitizeValidFirestoreId(collaboratorId || photo.collaboratorId, "collab");
  const safeCollabName = String(collaboratorName || photo.collaboratorName).trim().slice(0, 120) || "Colaborador";
  const safeCaption = String(caption || "").trim().slice(0, 240);

  const updatedLocal: RecyclingMomentPhoto = {
    ...photo,
    collaboratorId: safeCollabId,
    collaboratorName: safeCollabName,
    caption: safeCaption,
    category
  };
  await putLocalGalleryPhoto(updatedLocal);

  const auth = getAuth();
  const activeUid =
    auth?.currentUser?.uid && (!uid || auth.currentUser.uid === uid) ? auth.currentUser.uid : null;

  if (!db || !activeUid || photo.syncStatus !== "synced" || getIsFirestoreQuotaPaused()) {
    return updatedLocal;
  }

  const docPath = `users/${activeUid}/recycling_gallery/${photo.id}`;
  try {
    await updateDoc(doc(db, "users", activeUid, "recycling_gallery", photo.id), {
      collaboratorId: safeCollabId,
      collaboratorName: safeCollabName,
      caption: safeCaption,
      category,
      updatedAt: serverTimestamp()
    });
    return updatedLocal;
  } catch (error) {
    if (isQuotaExhaustedError(error)) {
      markFirestoreQuotaPaused();
      return updatedLocal;
    }
    handleFirestoreGalleryError(error, OperationType.UPDATE, docPath);
  }
}

export async function deleteRecyclingMomentPhoto({
  db,
  uid,
  photo
}: {
  db: any;
  uid?: string | null;
  photo: RecyclingMomentPhoto;
}): Promise<void> {
  await removeLocalGalleryPhoto(photo.id);

  const auth = getAuth();
  const activeUid =
    auth?.currentUser?.uid && (!uid || auth.currentUser.uid === uid) ? auth.currentUser.uid : null;

  if (!db || !activeUid || photo.syncStatus !== "synced" || getIsFirestoreQuotaPaused()) {
    return;
  }

  const docPath = `users/${activeUid}/recycling_gallery/${photo.id}`;
  try {
    await deleteDoc(doc(db, "users", activeUid, "recycling_gallery", photo.id));
  } catch (error) {
    if (isQuotaExhaustedError(error)) {
      markFirestoreQuotaPaused();
      return;
    }
    handleFirestoreGalleryError(error, OperationType.DELETE, docPath);
  }
}

export async function syncPendingLocalPhotosToCloud({
  db,
  uid
}: {
  db: any;
  uid?: string | null;
}): Promise<{ syncedCount: number; failedCount: number }> {
  const auth = getAuth();
  const activeUid =
    auth?.currentUser?.uid && (!uid || auth.currentUser.uid === uid) ? auth.currentUser.uid : null;
  if (!db || !activeUid || getIsFirestoreQuotaPaused()) {
    return { syncedCount: 0, failedCount: 0 };
  }

  const cached = await readLocalGalleryCache();
  const pending = cached.filter((p) => p.syncStatus === "pending");
  let syncedCount = 0;
  let failedCount = 0;

  for (const photo of pending) {
    try {
      await saveRecyclingMomentPhoto({
        db,
        uid: activeUid,
        collaboratorId: photo.collaboratorId,
        collaboratorName: photo.collaboratorName,
        caption: photo.caption,
        category: photo.category,
        imageDataUrl: photo.imageDataUrl,
        existingPhotoId: photo.id,
        existingCapturedAt: photo.capturedAt,
        existingCreatedAtMs: photo.createdAtMs
      });
      syncedCount++;
    } catch {
      failedCount++;
    }
  }

  return { syncedCount, failedCount };
}
