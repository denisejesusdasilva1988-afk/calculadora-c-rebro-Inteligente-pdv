// Utilitários de Persistência de Tela Fixada, Rascunhos em Edição, Notas Rápidas & Fotos de Referência
// Evita perda de telas/modais/carrinhos ao alternar entre o app, Galeria de Fotos e Bloco de Notas no Android/PWA.

export interface PinnedReferencePhoto {
  id: string;
  label: string;
  dataUrl: string;
  addedAt: string;
}

export interface AppNotepadSnapshot {
  draftCalc: string;
  freeNotes: string;
  savedNotes: Array<{ id?: string; text: string; date?: string; folder?: string }>;
}

export function loadPersistedString(key: string, fallback = ""): string {
  try {
    if (typeof window === "undefined" || !window.localStorage) return fallback;
    const raw = window.localStorage.getItem(key);
    return raw !== null ? raw : fallback;
  } catch {
    return fallback;
  }
}

export function savePersistedString(key: string, value: string | null | undefined): void {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    if (value === null || value === undefined || value === "") {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, value);
    }
  } catch {}
}

export function loadPersistedJson<T>(key: string, fallback: T): T {
  try {
    if (typeof window === "undefined" || !window.localStorage) return fallback;
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed !== null && parsed !== undefined ? (parsed as T) : fallback;
  } catch {
    return fallback;
  }
}

export function savePersistedJson(key: string, value: unknown): void {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    if (value === null || value === undefined) {
      window.localStorage.removeItem(key);
      return;
    }
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function removePersistedKey(key: string): void {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    window.localStorage.removeItem(key);
  } catch {}
}

export function readAppNotepadSnapshot(userId?: string | null): AppNotepadSnapshot {
  if (typeof window === "undefined" || !window.localStorage) {
    return { draftCalc: "", freeNotes: "", savedNotes: [] };
  }
  const cleanUid = userId && userId !== "guest_visitor" ? userId : null;
  const suffix = cleanUid ? `_user_${cleanUid}` : `_guest`;

  const draftCalc =
    loadPersistedString(`notepad_draft${suffix}`) ||
    loadPersistedString("notepad_draft") ||
    "";

  const freeNotes =
    loadPersistedString(`notepad_free_notes${suffix}`) ||
    loadPersistedString("notepad_free_notes") ||
    "";

  const scopedSaved = loadPersistedJson<any[]>(`notepad_saved_notes${suffix}`, []);
  const globalSaved = loadPersistedJson<any[]>("notepad_saved_notes", []);
  const combinedRaw = [...(Array.isArray(scopedSaved) ? scopedSaved : []), ...(Array.isArray(globalSaved) ? globalSaved : [])];

  const seen = new Set<string>();
  const savedNotes: AppNotepadSnapshot["savedNotes"] = [];
  for (const item of combinedRaw) {
    if (!item || typeof item.text !== "string" || !item.text.trim()) continue;
    const dedupKey = `${item.id || ""}|${item.text.trim()}`;
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);
    savedNotes.push({
      id: item.id,
      text: item.text,
      date: item.date,
      folder: item.folder
    });
  }

  return { draftCalc, freeNotes, savedNotes };
}

export const PINNED_REF_PHOTOS_KEY = "pdv_dw_pinned_ref_photos_v1";

export function loadPinnedReferencePhotos(): PinnedReferencePhoto[] {
  const list = loadPersistedJson<PinnedReferencePhoto[]>(PINNED_REF_PHOTOS_KEY, []);
  return Array.isArray(list) ? list.filter((p) => p && typeof p.dataUrl === "string") : [];
}

export function savePinnedReferencePhotos(photos: PinnedReferencePhoto[]): boolean {
  try {
    if (typeof window === "undefined" || !window.localStorage) return false;
    window.localStorage.setItem(PINNED_REF_PHOTOS_KEY, JSON.stringify(photos.slice(0, 8)));
    return true;
  } catch {
    return false;
  }
}

export async function compressGalleryImageToReferenceDataUrl(
  file: File,
  maxDim = 820,
  quality = 0.74
): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = objectUrl;
    });
    const natW = img.naturalWidth || 640;
    const natH = img.naturalHeight || 480;
    const scale = Math.min(1, maxDim / Math.max(natW, natH));
    const w = Math.max(1, Math.round(natW * scale));
    const h = Math.max(1, Math.round(natH * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas context unavailable");
    }
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
