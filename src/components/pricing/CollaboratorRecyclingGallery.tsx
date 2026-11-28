import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  Cloud,
  CloudOff,
  Download,
  Edit3,
  ImagePlus,
  Loader2,
  RefreshCw,
  Share2,
  Trash2,
  X
} from "lucide-react";
import {
  RECYCLING_MOMENT_CATEGORIES,
  RecyclingMomentCategory,
  RecyclingMomentPhoto,
  compressRecyclingMomentPhoto,
  deleteRecyclingMomentPhoto,
  getCategoryMeta,
  saveRecyclingMomentPhoto,
  syncPendingLocalPhotosToCloud,
  updateRecyclingMomentPhotoMeta
} from "../../utils/recyclingGalleryCloud";

export interface GalleryCollaboratorRef {
  id: string;
  name: string;
  isFounder?: boolean;
}

interface CollaboratorRecyclingGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  db: any;
  userId?: string | null;
  activeAuthUid?: string | null;
  collaborators: GalleryCollaboratorRef[];
  photos: RecyclingMomentPhoto[];
  initialCollaboratorId?: string | null;
  initialOpenPhotoId?: string | null;
  onPhotosChange: React.Dispatch<React.SetStateAction<RecyclingMomentPhoto[]>>;
  showNotification?: (msg: string, type?: "success" | "error" | "info" | "warning") => void;
}

export function CollaboratorRecyclingGallery({
  isOpen,
  onClose,
  db,
  userId,
  activeAuthUid,
  collaborators,
  photos,
  initialCollaboratorId,
  initialOpenPhotoId,
  onPhotosChange,
  showNotification
}: CollaboratorRecyclingGalleryProps) {
  const [filterCollabId, setFilterCollabId] = useState<string>(initialCollaboratorId || "todos");
  const [filterCategory, setFilterCategory] = useState<RecyclingMomentCategory | "todos">("todos");

  const [uploadCollabId, setUploadCollabId] = useState<string>(
    initialCollaboratorId && initialCollaboratorId !== "todos"
      ? initialCollaboratorId
      : collaborators[0]?.id || "geral"
  );
  const [uploadCategory, setUploadCategory] = useState<RecyclingMomentCategory>("entrega");
  const [uploadCaption, setUploadCaption] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSyncingPending, setIsSyncingPending] = useState(false);

  const [activePhotoId, setActivePhotoId] = useState<string | null>(initialOpenPhotoId || null);
  const [isEditingMeta, setIsEditingMeta] = useState(false);
  const [editCollabId, setEditCollabId] = useState<string>("");
  const [editCategory, setEditCategory] = useState<RecyclingMomentCategory>("entrega");
  const [editCaption, setEditCaption] = useState<string>("");
  const [isSavingMeta, setIsSavingMeta] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (initialCollaboratorId && initialCollaboratorId !== "todos") {
      setFilterCollabId(initialCollaboratorId);
      setUploadCollabId(initialCollaboratorId);
    } else {
      setFilterCollabId("todos");
      if (!uploadCollabId && collaborators[0]?.id) {
        setUploadCollabId(collaborators[0].id);
      }
    }
    if (initialOpenPhotoId) {
      setActivePhotoId(initialOpenPhotoId);
    } else {
      setActivePhotoId(null);
    }
    setIsEditingMeta(false);
    setConfirmDeleteId(null);
  }, [isOpen, initialCollaboratorId, initialOpenPhotoId]);

  const effectiveUid = activeAuthUid || (userId && userId !== "guest_visitor" ? userId : null);
  const isCloudConnected = Boolean(db && effectiveUid);

  const filteredPhotos = useMemo(() => {
    return photos.filter((p) => {
      if (filterCollabId !== "todos" && p.collaboratorId !== filterCollabId) return false;
      if (filterCategory !== "todos" && p.category !== filterCategory) return false;
      return true;
    });
  }, [photos, filterCollabId, filterCategory]);

  const pendingSyncCount = useMemo(
    () => photos.filter((p) => p.syncStatus === "pending").length,
    [photos]
  );

  const activePhoto = useMemo(
    () => photos.find((p) => p.id === activePhotoId) || null,
    [photos, activePhotoId]
  );

  const collabPhotoCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of photos) {
      map[p.collaboratorId] = (map[p.collaboratorId] || 0) + 1;
    }
    return map;
  }, [photos]);

  if (!isOpen) return null;

  const resolveCollabName = (collabId: string) => {
    if (collabId === "geral") return "Pátio / Coleta Geral";
    return collaborators.find((c) => c.id === collabId)?.name || "Colaborador";
  };

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files: File[] = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = "";
    if (files.length === 0) return;

    setIsUploading(true);
    let savedCloud = 0;
    let savedLocal = 0;
    let firstError = "";

    const targetCollabId = uploadCollabId || collaborators[0]?.id || "geral";
    const targetCollabName = resolveCollabName(targetCollabId);

    for (const file of files) {
      try {
        const compressedDataUrl = await compressRecyclingMomentPhoto(file);
        const saved = await saveRecyclingMomentPhoto({
          db,
          uid: effectiveUid,
          collaboratorId: targetCollabId,
          collaboratorName: targetCollabName,
          caption: uploadCaption,
          category: uploadCategory,
          imageDataUrl: compressedDataUrl
        });
        onPhotosChange((prev) => {
          const withoutSame = prev.filter((item) => item.id !== saved.id);
          return [saved, ...withoutSame].sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
        });
        if (saved.syncStatus === "synced") savedCloud++;
        else savedLocal++;
      } catch (err: any) {
        if (!firstError) {
          firstError = err?.message || "Erro ao enviar uma das fotos.";
        }
      }
    }

    setIsUploading(false);
    if (savedCloud > 0 || savedLocal > 0) {
      setUploadCaption("");
      if (filterCollabId !== "todos" && filterCollabId !== targetCollabId) {
        setFilterCollabId(targetCollabId);
      }
      if (showNotification) {
        if (savedCloud > 0 && savedLocal === 0) {
          showNotification(
            `${savedCloud} foto(s) salva(s) na nuvem na galeria de ${targetCollabName}!`,
            "success"
          );
        } else {
          showNotification(
            `${savedLocal} foto(s) salva(s) no aparelho${isCloudConnected ? " (aguardando envio)" : " — entre com Google para enviar à nuvem"}.`,
            "info"
          );
        }
      }
    } else if (firstError && showNotification) {
      showNotification(firstError, "error");
    }
  };

  const handleSyncPendingNow = async () => {
    if (!isCloudConnected) {
      showNotification?.("Entre com sua conta Google para enviar as fotos pendentes à nuvem.", "warning");
      return;
    }
    setIsSyncingPending(true);
    try {
      const res = await syncPendingLocalPhotosToCloud({ db, uid: effectiveUid });
      if (res.syncedCount > 0) {
        onPhotosChange((prev) =>
          prev.map((p) => (p.syncStatus === "pending" ? { ...p, syncStatus: "synced" } : p))
        );
        showNotification?.(`${res.syncedCount} foto(s) enviada(s) para a nuvem!`, "success");
      } else if (res.failedCount > 0) {
        showNotification?.("Algumas fotos ainda aguardam rede estável para sincronizar.", "warning");
      } else {
        showNotification?.("Todas as fotos já estão salvas na nuvem.", "info");
      }
    } finally {
      setIsSyncingPending(false);
    }
  };

  const handleStartEditActivePhoto = () => {
    if (!activePhoto) return;
    setEditCollabId(activePhoto.collaboratorId);
    setEditCategory(activePhoto.category);
    setEditCaption(activePhoto.caption);
    setIsEditingMeta(true);
  };

  const handleSaveMetaEdit = async () => {
    if (!activePhoto) return;
    setIsSavingMeta(true);
    try {
      const updated = await updateRecyclingMomentPhotoMeta({
        db,
        uid: effectiveUid,
        photo: activePhoto,
        collaboratorId: editCollabId || activePhoto.collaboratorId,
        collaboratorName: resolveCollabName(editCollabId || activePhoto.collaboratorId),
        caption: editCaption,
        category: editCategory
      });
      onPhotosChange((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setIsEditingMeta(false);
      showNotification?.("Detalhes da foto atualizados!", "success");
    } catch (err: any) {
      showNotification?.(err?.message || "Não foi possível atualizar a foto.", "error");
    } finally {
      setIsSavingMeta(false);
    }
  };

  const handleConfirmDeletePhoto = async (photo: RecyclingMomentPhoto) => {
    setIsDeleting(true);
    try {
      await deleteRecyclingMomentPhoto({ db, uid: effectiveUid, photo });
      onPhotosChange((prev) => prev.filter((p) => p.id !== photo.id));
      setActivePhotoId(null);
      setConfirmDeleteId(null);
      showNotification?.("Foto removida da galeria.", "info");
    } catch (err: any) {
      showNotification?.(err?.message || "Erro ao excluir foto.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownloadPhoto = (photo: RecyclingMomentPhoto) => {
    const safeName = photo.collaboratorName.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 20);
    const a = document.createElement("a");
    a.href = photo.imageDataUrl;
    a.download = `reciclagem_${safeName}_${photo.id.slice(-6)}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showNotification?.("Foto baixada para o aparelho.", "success");
  };

  const handleSharePhoto = async (photo: RecyclingMomentPhoto) => {
    try {
      const res = await fetch(photo.imageDataUrl);
      const blob = await res.blob();
      const file = new File([blob], `reciclagem_${photo.id.slice(-6)}.jpg`, { type: "image/jpeg" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Momento Reciclagem — ${photo.collaboratorName}`,
          text: photo.caption || `${getCategoryMeta(photo.category).label} • ${photo.capturedAt}`
        });
        return;
      }
    } catch {}
    handleDownloadPhoto(photo);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-white/15 rounded-3xl w-full max-w-5xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden text-left">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-white/10 bg-slate-950/70 shrink-0">
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-bold text-white truncate">
              Galeria na Nuvem — Momentos da Reciclagem
            </h3>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 flex-wrap tabular-nums">
              <span>{photos.length} {photos.length === 1 ? "foto salva" : "fotos salvas"}</span>
              <span aria-hidden="true">·</span>
              {isCloudConnected ? (
                <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                  <Cloud className="w-3.5 h-3.5" />
                  Nuvem Conectada
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-300 font-medium">
                  <CloudOff className="w-3.5 h-3.5" />
                  Salvo no Aparelho (Entre no Google para sincronizar)
                </span>
              )}
              {pendingSyncCount > 0 && isCloudConnected && (
                <>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    onClick={handleSyncPendingNow}
                    disabled={isSyncingPending}
                    className="inline-flex items-center gap-1 text-cyan-300 hover:text-cyan-200 font-semibold underline cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isSyncingPending ? "animate-spin" : ""}`} />
                    Enviar {pendingSyncCount} pendente(s)
                  </button>
                </>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar galeria"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo com scroll */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Painel de Envio de Foto */}
          <div className="p-4 sm:p-5 bg-slate-950 border border-white/10 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-bold text-white">Registrar Novo Momento</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tire foto na hora ou escolha do celular para guardar na pasta do colaborador na nuvem.
                </p>
              </div>
              {isUploading && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-300">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Compactando e salvando na nuvem...
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Colaborador vinculado
                </label>
                <select
                  value={uploadCollabId}
                  onChange={(e) => setUploadCollabId(e.target.value)}
                  className="w-full min-h-[44px] bg-slate-900 border border-white/15 focus:border-emerald-400 rounded-xl px-3 py-2 text-sm font-medium text-white outline-none"
                >
                  {collaborators.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.isFounder ? " (Coleta Própria)" : ""}
                    </option>
                  ))}
                  <option value="geral">Pátio / Momento Geral da Equipe</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Legenda do momento (opcional)
                </label>
                <input
                  type="text"
                  maxLength={240}
                  value={uploadCaption}
                  onChange={(e) => setUploadCaption(e.target.value)}
                  placeholder="Ex: Chegada com garrafas PET, pesagem de latinhas..."
                  className="w-full min-h-[44px] bg-slate-900 border border-white/15 focus:border-emerald-400 rounded-xl px-3 py-2 text-sm text-white outline-none"
                />
              </div>
            </div>

            {/* Seletor de Tipo de Momento */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-300 block">Tipo de momento</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {RECYCLING_MOMENT_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setUploadCategory(cat.id)}
                    className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                      uploadCategory === cat.id
                        ? "bg-emerald-500 text-slate-950 border-emerald-400"
                        : "bg-slate-900 text-slate-300 border-white/10 hover:border-white/25"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Botões de Câmera & Galeria */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFilesSelected}
              className="hidden"
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFilesSelected}
              className="hidden"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                disabled={isUploading}
                onClick={() => cameraInputRef.current?.click()}
                className="min-h-[48px] px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] disabled:opacity-60 text-slate-950 font-bold text-sm rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Camera className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">Tirar Foto Agora</span>
              </button>
              <button
                type="button"
                disabled={isUploading}
                onClick={() => galleryInputRef.current?.click()}
                className="min-h-[48px] px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 active:scale-[0.99] disabled:opacity-60 text-slate-950 font-bold text-sm rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <ImagePlus className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">Escolher Fotos do Celular</span>
              </button>
            </div>
          </div>

          {/* Barra de Filtros */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setFilterCollabId("todos")}
                  className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer border transition-colors ${
                    filterCollabId === "todos"
                      ? "bg-white text-slate-950 border-white"
                      : "bg-slate-950 text-slate-300 border-white/10 hover:border-white/25"
                  }`}
                >
                  Todos ({photos.length})
                </button>
                {collaborators.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setFilterCollabId(c.id);
                      setUploadCollabId(c.id);
                    }}
                    className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer border transition-colors tabular-nums ${
                      filterCollabId === c.id
                        ? "bg-cyan-400 text-slate-950 border-cyan-300"
                        : "bg-slate-950 text-slate-300 border-white/10 hover:border-white/25"
                    }`}
                  >
                    {c.name} ({collabPhotoCounts[c.id] || 0})
                  </button>
                ))}
                {(collabPhotoCounts["geral"] || 0) > 0 && (
                  <button
                    type="button"
                    onClick={() => setFilterCollabId("geral")}
                    className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer border transition-colors tabular-nums ${
                      filterCollabId === "geral"
                        ? "bg-cyan-400 text-slate-950 border-cyan-300"
                        : "bg-slate-950 text-slate-300 border-white/10 hover:border-white/25"
                    }`}
                  >
                    Pátio Geral ({collabPhotoCounts["geral"]})
                  </button>
                )}
              </div>

              <select
                aria-label="Filtrar por tipo de momento"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value as RecyclingMomentCategory | "todos")}
                className="min-h-[40px] bg-slate-950 border border-white/15 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-200 outline-none shrink-0"
              >
                <option value="todos">Todos os Momentos</option>
                {RECYCLING_MOMENT_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Grade de Fotos */}
            {filteredPhotos.length === 0 ? (
              <div className="py-12 px-4 text-center bg-slate-950/70 border border-white/10 rounded-2xl space-y-2">
                <Camera className="w-8 h-8 text-slate-500 mx-auto" />
                <p className="text-sm font-semibold text-slate-300">
                  Nenhuma foto registrada neste filtro ainda.
                </p>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Use os botões acima para fotografar entregas, pesagens, acertos ou cargas e guardar tudo com segurança na nuvem.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredPhotos.map((photo) => {
                  const catMeta = getCategoryMeta(photo.category);
                  return (
                    <button
                      key={photo.id}
                      type="button"
                      onClick={() => {
                        setActivePhotoId(photo.id);
                        setIsEditingMeta(false);
                        setConfirmDeleteId(null);
                      }}
                      className="group relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-950 border border-white/10 hover:border-cyan-400/60 focus-visible:outline-2 focus-visible:outline-cyan-400 text-left cursor-pointer transition-colors"
                    >
                      <img
                        src={photo.imageDataUrl}
                        alt={photo.caption || `${photo.collaboratorName} - ${catMeta.label}`}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-200"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent pointer-events-none" />
                      <div className="absolute bottom-0 inset-x-0 p-2.5 space-y-0.5 pointer-events-none">
                        <div className="text-xs font-bold text-white truncate">
                          {photo.collaboratorName}
                        </div>
                        <div className="text-[11px] text-slate-300 truncate">
                          {catMeta.shortLabel} · {photo.capturedAt.split(",")[0]} ·{" "}
                          {photo.syncStatus === "synced" ? "Nuvem" : "Local"}
                        </div>
                        {photo.caption && (
                          <p className="text-[11px] text-slate-200 truncate">{photo.caption}</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox de Visualização e Edição */}
      {activePhoto && (
        <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
          <div className="bg-slate-900 border border-white/15 rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-white truncate">
                  {activePhoto.collaboratorName}
                </h4>
                <p className="text-xs text-slate-400 truncate">
                  {getCategoryMeta(activePhoto.category).label} · {activePhoto.capturedAt} ·{" "}
                  {activePhoto.syncStatus === "synced" ? "Salvo na nuvem" : "Aguardando envio à nuvem"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActivePhotoId(null);
                  setIsEditingMeta(false);
                  setConfirmDeleteId(null);
                }}
                aria-label="Fechar visualização da foto"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-black flex items-center justify-center p-2">
              <img
                src={activePhoto.imageDataUrl}
                alt={activePhoto.caption || activePhoto.collaboratorName}
                referrerPolicy="no-referrer"
                className="max-h-[56vh] w-auto object-contain rounded-xl"
              />
            </div>

            <div className="p-4 space-y-4">
              {!isEditingMeta ? (
                <>
                  <p className="text-sm text-slate-200">
                    {activePhoto.caption || "Sem legenda adicionada para este momento."}
                  </p>

                  {confirmDeleteId === activePhoto.id ? (
                    <div className="p-3 bg-rose-950/50 border border-rose-500/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-rose-200">
                        Excluir esta foto permanentemente da galeria na nuvem?
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isDeleting}
                          onClick={() => handleConfirmDeletePhoto(activePhoto)}
                          className="min-h-[40px] px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl cursor-pointer"
                        >
                          {isDeleting ? "Excluindo..." : "Confirmar Exclusão"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="min-h-[40px] px-3 py-1.5 bg-slate-800 text-slate-200 text-xs font-semibold rounded-xl cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleStartEditActivePhoto}
                        className="min-h-[44px] px-3.5 py-2 bg-slate-950 hover:bg-slate-800 text-slate-200 text-xs font-bold rounded-xl border border-white/15 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                        <span>Editar Legenda</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadPhoto(activePhoto)}
                        className="min-h-[44px] px-3.5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        <span>Baixar Foto</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSharePhoto(activePhoto)}
                        className="min-h-[44px] px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                      >
                        <Share2 className="w-4 h-4" />
                        <span>Compartilhar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(activePhoto.id)}
                        className="min-h-[44px] px-3.5 py-2 bg-rose-950/60 hover:bg-rose-600 text-rose-200 hover:text-white text-xs font-bold rounded-xl border border-rose-500/35 flex items-center gap-1.5 cursor-pointer ml-auto"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Excluir</span>
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <select
                      value={editCollabId}
                      onChange={(e) => setEditCollabId(e.target.value)}
                      className="min-h-[44px] bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-xs font-medium text-white outline-none"
                    >
                      {collaborators.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                      <option value="geral">Pátio / Coleta Geral</option>
                    </select>
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value as RecyclingMomentCategory)}
                      className="min-h-[44px] bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-xs font-medium text-white outline-none"
                    >
                      {RECYCLING_MOMENT_CATEGORIES.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <input
                    type="text"
                    maxLength={240}
                    value={editCaption}
                    onChange={(e) => setEditCaption(e.target.value)}
                    placeholder="Escreva a legenda do momento..."
                    className="w-full min-h-[44px] bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-sm text-white outline-none"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingMeta(false)}
                      className="min-h-[44px] px-4 py-2 bg-slate-800 text-slate-200 text-xs font-bold rounded-xl cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={isSavingMeta}
                      onClick={handleSaveMetaEdit}
                      className="min-h-[44px] px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl cursor-pointer"
                    >
                      {isSavingMeta ? "Salvando..." : "Salvar Alterações"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
