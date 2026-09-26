import React, { useState, useMemo } from "react";
import {
  Folder,
  FolderPlus,
  FolderOpen,
  FileText,
  ShoppingCart,
  Calculator,
  Trash2,
  RotateCcw,
  Share2,
  Printer,
  Search,
  Plus,
  Eye,
  Check,
  X,
  Pencil,
  Sparkles,
  Archive,
  Layers,
  ChevronRight,
  ShoppingBag,
  FileSignature,
  DollarSign,
  Tag,
  ArrowRight,
  Truck,
  Building2,
  Calendar as CalendarIcon,
  BellRing,
  Copy,
  CheckCheck
} from "lucide-react";
import { format, isSameDay } from "date-fns";
import { SavedList, AgendaEvent } from "../types";

export type GaveteiroCategory = "all" | "calc" | "super" | "notes" | "taloes" | "contas" | "trash";

interface GaveteiroPastasProps {
  key?: string;
  // Lists from Calculadora / Supermercado / Excel
  history: SavedList[];
  localHistory: SavedList[];
  deletedLists: SavedList[];
  onLoadList: (list: SavedList) => void;
  onDeleteList: (id: string, permanent?: boolean) => void;
  onRestoreList?: (list: SavedList) => void;
  onUpdateListFolder?: (id: string, newFolder: string) => void;

  // Notes from Bloco de Notas / Talões
  savedNotes: { id: string; text: string; date: string; signatureImg?: string; folder?: string; pages?: string[] }[];
  onLoadNote: (note: any) => void;
  onDeleteNote: (id: string) => void;
  onUpdateNoteFolder: (id: string, newFolder: string) => void;

  // Agenda events for Bills / Suppliers / Payments
  agendaEvents?: AgendaEvent[];
  onUpdateEvent?: (id: string, updates: Partial<AgendaEvent>) => Promise<void>;
  onDeleteEvent?: (id: string) => Promise<void>;

  // Global folders
  currentFolder: string;
  setCurrentFolder: (folder: string) => void;
  createdFolders: string[];
  setCreatedFolders: React.Dispatch<React.SetStateAction<string[]>>;

  // Navigation
  onNavigateToMode: (mode: any) => void;
  showNotification: (msg: string, type?: "success" | "error" | "info" | "warning") => void;

  // Plan info
  subscriptionTier: string;
  onOpenSubscriptionModal: (source: string, planId?: string) => void;
}

export function GaveteiroPastasModule({
  history,
  localHistory,
  deletedLists,
  onLoadList,
  onDeleteList,
  onRestoreList,
  onUpdateListFolder,
  savedNotes,
  onLoadNote,
  onDeleteNote,
  onUpdateNoteFolder,
  agendaEvents = [],
  onUpdateEvent,
  onDeleteEvent,
  currentFolder,
  setCurrentFolder,
  createdFolders,
  setCreatedFolders,
  onNavigateToMode,
  showNotification,
  subscriptionTier,
  onOpenSubscriptionModal
}: GaveteiroPastasProps) {
  const [activeGaveta, setActiveGaveta] = useState<GaveteiroCategory>("all");
  const [selectedFolder, setSelectedFolder] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [newFolderNameInput, setNewFolderNameInput] = useState<string>("");
  const [isCreatingFolder, setIsCreatingFolder] = useState<boolean>(false);
  const [movingItemId, setMovingItemId] = useState<string | null>(null);
  const [movingItemType, setMovingItemType] = useState<"list" | "note" | null>(null);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [copiedBillId, setCopiedBillId] = useState<string | null>(null);

  // Combine and deduplicate lists (cloud + local)
  const combinedLists = useMemo(() => {
    const map = new Map<string, SavedList>();
    // Prioritize history, then localHistory
    [...localHistory, ...history].forEach((item) => {
      if (item && item.id) {
        map.set(item.id, item);
      }
    });
    return Array.from(map.values());
  }, [history, localHistory]);

  // Extract all existing folder names from lists, notes and agenda
  const allFolderNames = useMemo(() => {
    const set = new Set<string>(["Geral", "Fornecedores", "Boletos", "Contas Fixas", "Pagamentos", "Mercado", "Casa", "Trabalho", "Clientes", "Recibos"]);
    createdFolders.forEach((f) => f && set.add(f.trim()));
    combinedLists.forEach((l) => l.pasta && set.add(l.pasta.trim()));
    savedNotes.forEach((n) => n.folder && n.folder !== "Sem Pasta" && set.add(n.folder.trim()));
    (agendaEvents || []).forEach((e) => e.folder && set.add(e.folder.trim()));
    return Array.from(set).filter(Boolean);
  }, [createdFolders, combinedLists, savedNotes, agendaEvents]);

  // Calculate counters per folder
  const folderCounts = useMemo(() => {
    const counts: Record<string, { total: number; lists: number; notes: number; contas: number }> = {};
    allFolderNames.forEach((name) => {
      counts[name] = { total: 0, lists: 0, notes: 0, contas: 0 };
    });

    combinedLists.forEach((l) => {
      const folder = l.pasta || "Geral";
      if (!counts[folder]) counts[folder] = { total: 0, lists: 0, notes: 0, contas: 0 };
      counts[folder].total += 1;
      counts[folder].lists += 1;
    });

    savedNotes.forEach((n) => {
      const folder = n.folder && n.folder !== "Sem Pasta" ? n.folder : "Geral";
      if (!counts[folder]) counts[folder] = { total: 0, lists: 0, notes: 0, contas: 0 };
      counts[folder].total += 1;
      counts[folder].notes += 1;
    });

    (agendaEvents || []).forEach((e) => {
      const folder = e.folder || "Fornecedores";
      if (!counts[folder]) counts[folder] = { total: 0, lists: 0, notes: 0, contas: 0 };
      counts[folder].total += 1;
      counts[folder].contas = (counts[folder].contas || 0) + 1;
    });

    return counts;
  }, [allFolderNames, combinedLists, savedNotes, agendaEvents]);

  // Count items per category and urgent bills
  const categoryCounts = useMemo(() => {
    const superCount = combinedLists.filter((l) => l.superListData || l.texto_digitado?.includes("[X]") || l.texto_digitado?.toLowerCase().includes("mercado")).length;
    const calcCount = combinedLists.length - superCount;
    const notesCount = savedNotes.filter((n) => !n.text?.includes("RECIBO") && !n.text?.includes("TALÃO")).length;
    const taloesCount = savedNotes.length - notesCount;
    const contasCount = (agendaEvents || []).length;

    const urgentCount = (agendaEvents || []).filter((e) => {
      if (e.status === 'completed') return false;
      const evDate = e.date && e.date.seconds ? new Date(e.date.seconds * 1000) : new Date(e.date);
      return evDate < new Date() || isSameDay(evDate, new Date());
    }).length;

    return {
      all: combinedLists.length + savedNotes.length + contasCount,
      calc: calcCount,
      super: superCount,
      notes: notesCount,
      taloes: taloesCount,
      contas: contasCount,
      urgentContas: urgentCount,
      trash: deletedLists.length
    };
  }, [combinedLists, savedNotes, agendaEvents, deletedLists]);

  // Create folder handler
  const handleCreateFolder = () => {
    const trimmed = newFolderNameInput.trim();
    if (!trimmed) {
      showNotification("Digite um nome para a nova pasta!", "warning");
      return;
    }
    if (allFolderNames.includes(trimmed)) {
      showNotification("Esta pasta já existe!", "info");
      setSelectedFolder(trimmed);
      setIsCreatingFolder(false);
      setNewFolderNameInput("");
      return;
    }
    setCreatedFolders((prev) => Array.from(new Set([...prev, trimmed])));
    setSelectedFolder(trimmed);
    setCurrentFolder(trimmed);
    setIsCreatingFolder(false);
    setNewFolderNameInput("");
    showNotification(`Pasta "${trimmed}" criada no gaveteiro! 📁`, "success");
  };

  // Filtered lists based on category, folder, and search
  const filteredLists = useMemo(() => {
    if (activeGaveta === "notes" || activeGaveta === "taloes" || activeGaveta === "contas" || activeGaveta === "trash") {
      return [];
    }

    return combinedLists.filter((list) => {
      const folder = list.pasta || "Geral";
      const matchesFolder = selectedFolder === "all" || folder === selectedFolder;
      
      const isSuper = Boolean(list.superListData || list.texto_digitado?.includes("[X]") || list.texto_digitado?.toLowerCase().includes("mercado"));
      const matchesCategory =
        activeGaveta === "all" ||
        (activeGaveta === "super" && isSuper) ||
        (activeGaveta === "calc" && !isSuper);

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (list.texto_digitado && list.texto_digitado.toLowerCase().includes(q)) ||
        (list.pasta && list.pasta.toLowerCase().includes(q)) ||
        (list.total_gasto && list.total_gasto.toString().includes(q));

      return matchesFolder && matchesCategory && matchesSearch;
    });
  }, [combinedLists, activeGaveta, selectedFolder, searchQuery]);

  // Filtered notes based on category, folder, and search
  const filteredNotes = useMemo(() => {
    if (activeGaveta === "calc" || activeGaveta === "super" || activeGaveta === "contas" || activeGaveta === "trash") {
      return [];
    }

    return savedNotes.filter((note) => {
      const folder = note.folder && note.folder !== "Sem Pasta" ? note.folder : "Geral";
      const matchesFolder = selectedFolder === "all" || folder === selectedFolder;

      const isTalao = Boolean(note.text?.includes("RECIBO") || note.text?.includes("TALÃO") || note.text?.includes("COMPROVANTE"));
      const matchesCategory =
        activeGaveta === "all" ||
        (activeGaveta === "taloes" && isTalao) ||
        (activeGaveta === "notes" && !isTalao);

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (note.text && note.text.toLowerCase().includes(q)) ||
        (note.date && note.date.toLowerCase().includes(q)) ||
        folder.toLowerCase().includes(q);

      return matchesFolder && matchesCategory && matchesSearch;
    });
  }, [savedNotes, activeGaveta, selectedFolder, searchQuery]);

  // Filtered agenda events for payment commitments & suppliers
  const filteredAgendaEvents = useMemo(() => {
    if (activeGaveta === "calc" || activeGaveta === "super" || activeGaveta === "notes" || activeGaveta === "taloes" || activeGaveta === "trash") {
      return [];
    }

    return (agendaEvents || []).filter((event) => {
      const folder = event.folder || "Fornecedores";
      const matchesFolder = selectedFolder === "all" || folder.toLowerCase() === selectedFolder.toLowerCase();
      const matchesCategory = activeGaveta === "all" || activeGaveta === "contas";

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (event.title && event.title.toLowerCase().includes(q)) ||
        (event.supplierName && event.supplierName.toLowerCase().includes(q)) ||
        folder.toLowerCase().includes(q);

      return matchesFolder && matchesCategory && matchesSearch;
    });
  }, [agendaEvents, activeGaveta, selectedFolder, searchQuery]);

  // Share to WhatsApp
  const handleShareWhatsApp = (text: string, title?: string) => {
    try {
      const msg = encodeURIComponent(`*${title || "Cálculo / Nota Salva - Calculadora Cérebro"}*\n\n${text}`);
      window.open(`https://api.whatsapp.com/send?text=${msg}`, "_blank");
    } catch {
      showNotification("Não foi possível abrir o WhatsApp no momento.", "error");
    }
  };

  // Format currency helper
  const formatCurrency = (val: number) => {
    return (val || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 animate-fadeIn pb-12">
      {/* 1. Header do Gaveteiro */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-2 border-emerald-500/25 p-5 sm:p-6 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/20 shrink-0">
              <Archive className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase">
                  Gaveteiro de Pastas 🗄️
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Arquivo Organizado
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-1">
                Todas as suas listas de supermercado, contas, notas de bloco e talões salvos em um só lugar.
              </p>
            </div>
          </div>

          {/* Plano & Status Badge */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="bg-slate-900/80 border border-white/10 px-3.5 py-2 rounded-2xl flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-slate-400 font-bold uppercase">Armazenamento:</span>
              <span className="text-[11px] font-black text-emerald-400">
                {categoryCounts.all} documentos arquivados
              </span>
            </div>

            <button
              type="button"
              onClick={() => onOpenSubscriptionModal("Gaveteiro de Pastas")}
              className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-[10px] uppercase tracking-wider rounded-2xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-slate-950" />
              <span>Ver Planos & Limites</span>
            </button>
          </div>
        </div>

        {/* 2. Gavetas / Abas Principais do Arquivo */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mt-6 pt-5 border-t border-white/5">
          <button
            type="button"
            onClick={() => { setActiveGaveta("all"); setSelectedFolder("all"); }}
            className={`p-3 rounded-2xl font-black text-xs uppercase tracking-tight transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer border ${
              activeGaveta === "all"
                ? "bg-emerald-600 text-white border-emerald-400 shadow-lg shadow-emerald-900/40 scale-[1.02]"
                : "bg-slate-900/60 hover:bg-slate-800 text-slate-400 border-white/5"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Todas Pastas</span>
            <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${activeGaveta === "all" ? "bg-emerald-800 text-emerald-100" : "bg-slate-800 text-slate-400"}`}>
              {categoryCounts.all}
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveGaveta("calc"); setSelectedFolder("all"); }}
            className={`p-3 rounded-2xl font-black text-xs uppercase tracking-tight transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer border ${
              activeGaveta === "calc"
                ? "bg-emerald-600 text-white border-emerald-400 shadow-lg shadow-emerald-900/40 scale-[1.02]"
                : "bg-slate-900/60 hover:bg-slate-800 text-slate-400 border-white/5"
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>Calculadora</span>
            <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${activeGaveta === "calc" ? "bg-emerald-800 text-emerald-100" : "bg-slate-800 text-slate-400"}`}>
              {categoryCounts.calc}
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveGaveta("super"); setSelectedFolder("all"); }}
            className={`p-3 rounded-2xl font-black text-xs uppercase tracking-tight transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer border ${
              activeGaveta === "super"
                ? "bg-sky-600 text-white border-sky-400 shadow-lg shadow-sky-900/40 scale-[1.02]"
                : "bg-slate-900/60 hover:bg-slate-800 text-slate-400 border-white/5"
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Supermercado</span>
            <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${activeGaveta === "super" ? "bg-sky-800 text-sky-100" : "bg-slate-800 text-slate-400"}`}>
              {categoryCounts.super}
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveGaveta("notes"); setSelectedFolder("all"); }}
            className={`p-3 rounded-2xl font-black text-xs uppercase tracking-tight transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer border ${
              activeGaveta === "notes"
                ? "bg-amber-600 text-white border-amber-400 shadow-lg shadow-amber-900/40 scale-[1.02]"
                : "bg-slate-900/60 hover:bg-slate-800 text-slate-400 border-white/5"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Bloco Notas</span>
            <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${activeGaveta === "notes" ? "bg-amber-800 text-amber-100" : "bg-slate-800 text-slate-400"}`}>
              {categoryCounts.notes}
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveGaveta("taloes"); setSelectedFolder("all"); }}
            className={`p-3 rounded-2xl font-black text-xs uppercase tracking-tight transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer border ${
              activeGaveta === "taloes"
                ? "bg-purple-600 text-white border-purple-400 shadow-lg shadow-purple-900/40 scale-[1.02]"
                : "bg-slate-900/60 hover:bg-slate-800 text-slate-400 border-white/5"
            }`}
          >
            <FileSignature className="w-4 h-4" />
            <span>Talões & Recibos</span>
            <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${activeGaveta === "taloes" ? "bg-purple-800 text-purple-100" : "bg-slate-800 text-slate-400"}`}>
              {categoryCounts.taloes}
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveGaveta("contas"); setSelectedFolder("all"); }}
            className={`p-3 rounded-2xl font-black text-xs uppercase tracking-tight transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer border ${
              activeGaveta === "contas"
                ? "bg-rose-600 text-white border-rose-400 shadow-lg shadow-rose-900/40 scale-[1.02]"
                : "bg-slate-900/60 hover:bg-slate-800 text-slate-400 border-white/5"
            }`}
          >
            <Truck className="w-4 h-4 text-purple-400" />
            <span>Contas & Fornec.</span>
            <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${activeGaveta === "contas" ? "bg-rose-800 text-white" : "bg-slate-800 text-slate-400"}`}>
              {categoryCounts.contas}
              {categoryCounts.urgentContas > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping inline-block" />
              )}
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveGaveta("trash"); setSelectedFolder("all"); }}
            className={`p-3 rounded-2xl font-black text-xs uppercase tracking-tight transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer border ${
              activeGaveta === "trash"
                ? "bg-rose-600 text-white border-rose-400 shadow-lg shadow-rose-900/40 scale-[1.02]"
                : "bg-slate-900/60 hover:bg-slate-800 text-slate-400 border-white/5"
            }`}
          >
            <Trash2 className="w-4 h-4" />
            <span>Lixeira</span>
            <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${activeGaveta === "trash" ? "bg-rose-800 text-rose-100" : "bg-slate-800 text-slate-400"}`}>
              {categoryCounts.trash}
            </span>
          </button>
        </div>
      </div>

      {/* Alerta de Contas Urgentes em Vermelho no Gaveteiro */}
      {categoryCounts.urgentContas > 0 && (
        <div className="bg-gradient-to-r from-red-950 via-rose-950 to-red-900 border-2 border-red-500 rounded-3xl p-4 sm:p-5 shadow-2xl shadow-red-950/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-white relative overflow-hidden">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-red-600 flex items-center justify-center shrink-0 shadow-lg shadow-red-600/50 animate-bounce">
              <BellRing className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black uppercase text-white tracking-wider">
                  Alerta: {categoryCounts.urgentContas} Conta(s) em Vermelho (Vencidas ou Vencem Hoje)! 🚨
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-500 text-white animate-pulse">
                  Atenção Urgente
                </span>
              </div>
              <p className="text-xs text-red-200 mt-0.5 font-medium">
                Você possui faturas de fornecedores ou boletos que precisam de quitação imediata para evitar juros.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
            <button
              type="button"
              onClick={() => {
                setActiveGaveta("contas");
                setSelectedFolder("all");
              }}
              className="px-3.5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md flex items-center gap-1.5"
            >
              <span>Ver Contas em Atraso ⚠️</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateToMode("agenda")}
              className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border border-white/10 flex items-center gap-1.5"
            >
              <CalendarIcon className="w-3.5 h-3.5 text-emerald-400" />
              <span>Abrir Agenda 📅</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Barra de Busca e Filtro de Pastas */}
      <div className="bg-slate-900/90 border border-white/5 p-4 rounded-3xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-emerald-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Buscar por texto, valor ou pasta..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-white/10 rounded-2xl pl-10 pr-9 py-2.5 text-xs text-white placeholder-slate-500 font-medium focus:border-emerald-500 outline-none transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-3 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* Botão de Criar Pasta */}
          {isCreatingFolder ? (
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-2xl border border-emerald-500/40 w-full sm:w-auto">
              <input
                type="text"
                autoFocus
                placeholder="Nome da Pasta..."
                value={newFolderNameInput}
                onChange={(e) => setNewFolderNameInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleCreateFolder(); }}
                className="bg-transparent px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none w-36"
              />
              <button
                type="button"
                onClick={handleCreateFolder}
                className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black"
                title="Salvar Pasta"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => { setIsCreatingFolder(false); setNewFolderNameInput(""); }}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl text-xs"
                title="Cancelar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onNavigateToMode("agenda");
                  showNotification("Abrindo Agenda de Pagamentos! 📝", "info");
                }}
                className="px-3 py-2.5 bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30 rounded-2xl text-[10.5px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                title="Anotar nova conta ou fatura na agenda"
              >
                <Plus className="w-4 h-4" />
                <span>+ Conta / Fatura</span>
              </button>

              <button
                type="button"
                onClick={() => setIsCreatingFolder(true)}
                className="px-3.5 py-2.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 rounded-2xl text-[10.5px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <FolderPlus className="w-4 h-4" />
                <span>Nova Pasta</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 4. Carrossel de Pastas (Estilo Gavetas Físicas) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
            <Folder className="w-3.5 h-3.5" />
            <span>Pastas no Gaveteiro ({allFolderNames.length}):</span>
          </span>
          <span className="text-[9.5px] text-slate-500 font-bold">
            Clique na pasta para filtrar os itens salvos
          </span>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1 px-1">
          <button
            type="button"
            onClick={() => setSelectedFolder("all")}
            className={`px-4 py-2.5 rounded-2xl text-[10.5px] font-black uppercase tracking-wider transition-all shrink-0 flex items-center gap-2 cursor-pointer border ${
              selectedFolder === "all"
                ? "bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-950/40"
                : "bg-slate-900 hover:bg-slate-800 text-slate-400 border-white/5"
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            <span>Todas as Pastas</span>
            <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-extrabold ${selectedFolder === "all" ? "bg-emerald-800 text-white" : "bg-slate-800 text-slate-400"}`}>
              {categoryCounts.all}
            </span>
          </button>

          {allFolderNames.map((folderName) => {
            const count = folderCounts[folderName]?.total || 0;
            const isSelected = selectedFolder === folderName;
            return (
              <button
                key={folderName}
                type="button"
                onClick={() => {
                  setSelectedFolder(folderName);
                  setCurrentFolder(folderName);
                }}
                className={`px-4 py-2.5 rounded-2xl text-[10.5px] font-black uppercase tracking-wider transition-all shrink-0 flex items-center gap-2 cursor-pointer border ${
                  isSelected
                    ? "bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-950/40 scale-[1.02]"
                    : "bg-slate-900 hover:bg-slate-800 text-slate-400 border-white/5"
                }`}
              >
                <Folder className={`w-3.5 h-3.5 ${isSelected ? "text-white" : "text-amber-400"}`} />
                <span>{folderName}</span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-extrabold ${isSelected ? "bg-emerald-800 text-white" : "bg-slate-800 text-slate-400"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Lista de Itens no Gaveteiro */}
      <div className="space-y-4">
        {activeGaveta === "trash" ? (
          /* Visualização da Lixeira */
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-300">
              <div className="flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span className="text-xs font-black uppercase tracking-wider">
                  Lixeira do Gaveteiro ({deletedLists.length} itens apagados)
                </span>
              </div>
              <span className="text-[10px] text-rose-400 font-bold">
                Itens apagados temporariamente
              </span>
            </div>

            {deletedLists.length === 0 ? (
              <div className="p-12 text-center bg-slate-900/50 rounded-3xl border border-white/5 text-slate-500">
                <Trash2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs font-bold uppercase tracking-wider">A lixeira está vazia!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {deletedLists.map((item) => (
                  <div key={item.id} className="p-4 bg-slate-950 border border-rose-500/20 rounded-2xl flex flex-col justify-between gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[9px] font-bold uppercase text-slate-500">
                          Pasta: {item.pasta || "Geral"}
                        </span>
                        <span className="text-xs font-black text-rose-400 mono-display">
                          {formatCurrency(item.total_gasto)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 font-medium line-clamp-2">
                        {item.texto_digitado || "Sem texto registrado"}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      {onRestoreList && (
                        <button
                          type="button"
                          onClick={() => onRestoreList(item)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[9.5px] font-black uppercase tracking-wider flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Restaurar</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onDeleteList(item.id, true)}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[9.5px] font-black uppercase tracking-wider flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Apagar Definitivo</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Visualização Normal de Arquivos */
          <div>
            {filteredLists.length === 0 && filteredNotes.length === 0 && filteredAgendaEvents.length === 0 ? (
              <div className="p-12 text-center bg-slate-900/50 rounded-3xl border-2 border-dashed border-white/10 space-y-3">
                <FolderOpen className="w-12 h-12 text-emerald-400/40 mx-auto" />
                <h3 className="text-sm font-black uppercase text-slate-300 tracking-wider">
                  Nenhum documento encontrado nesta pasta
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {searchQuery
                    ? "Tente buscar com outro termo ou selecione 'Todas as Pastas'."
                    : "Você ainda não salvou listas, contas ou notas nesta pasta. Use a Calculadora, Bloco de Notas, Supermercado ou a Agenda para salvar seus documentos organizados!"}
                </p>
                <div className="flex flex-wrap justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => onNavigateToMode("edit")}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer"
                  >
                    Abrir Calculadora 🧮
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigateToMode("notes")}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer"
                  >
                    Abrir Bloco de Notas 📝
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigateToMode("super")}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer"
                  >
                    Lista de Mercado 🛒
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigateToMode("agenda")}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer"
                  >
                    Contas & Fornecedores 🚚
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* 1. Listas da Calculadora e Supermercado */}
                {filteredLists.map((list) => {
                  const isSuper = Boolean(list.superListData || list.texto_digitado?.includes("[X]") || list.texto_digitado?.toLowerCase().includes("mercado"));
                  const isExpanded = expandedItemId === list.id;
                  const firstLine = list.texto_digitado ? list.texto_digitado.split("\n")[0] : "Cálculo";
                  const folder = list.pasta || "Geral";

                  return (
                    <div
                      key={list.id}
                      className="bg-slate-900 border border-white/10 hover:border-emerald-500/40 rounded-3xl p-5 shadow-lg flex flex-col justify-between gap-4 transition-all"
                    >
                      <div>
                        {/* Header do Card */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                            isSuper
                              ? "bg-sky-500/15 text-sky-400 border-sky-500/30"
                              : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                          }`}>
                            {isSuper ? "🛒 Supermercado" : "🧮 Calculadora & Excel"}
                          </span>

                          <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-md bg-slate-950 text-slate-400 border border-white/5 flex items-center gap-1">
                            <Folder className="w-2.5 h-2.5 text-amber-400" />
                            <span>{folder}</span>
                          </span>
                        </div>

                        {/* Conteúdo resumido */}
                        <h4 className="text-sm font-black text-white line-clamp-1 mb-1">
                          {firstLine}
                        </h4>

                        <div className="flex items-baseline justify-between mt-2 pt-2 border-t border-white/5">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Total Calculado:</span>
                          <span className="text-base font-black text-emerald-400 mono-display">
                            {formatCurrency(list.total_gasto)}
                          </span>
                        </div>

                        {/* Expandable Preview */}
                        {isExpanded && (
                          <div className="mt-3 p-3 bg-slate-950 rounded-2xl border border-white/5 space-y-1.5 text-xs text-slate-300 font-mono max-h-48 overflow-y-auto custom-scrollbar">
                            <p className="text-[9px] font-black uppercase text-emerald-400 tracking-wider font-sans mb-1">
                              Linhas Salvas:
                            </p>
                            {list.texto_digitado ? (
                              list.texto_digitado.split("\n").map((line, idx) => (
                                <p key={idx} className="line-clamp-1">{line}</p>
                              ))
                            ) : (
                              <p className="text-slate-500 italic">Sem linhas salvas</p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Ações do Card */}
                      <div className="space-y-2 pt-2 border-t border-white/5">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              onLoadList(list);
                              if (isSuper) {
                                onNavigateToMode("super");
                              } else {
                                onNavigateToMode("edit");
                              }
                              showNotification("Documento carregado no editor! 📂", "success");
                            }}
                            className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md"
                            title="Carregar no Editor"
                          >
                            <span>Abrir no Editor</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setExpandedItemId(isExpanded ? null : list.id)}
                            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs transition-all cursor-pointer"
                            title={isExpanded ? "Ocultar detalhes" : "Ver detalhes"}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleShareWhatsApp(list.texto_digitado || "", firstLine)}
                            className="p-2 bg-green-600/20 hover:bg-green-600 text-green-300 hover:text-white rounded-xl text-xs transition-all cursor-pointer"
                            title="Compartilhar no WhatsApp"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => onDeleteList(list.id, false)}
                            className="p-2 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white rounded-xl text-xs transition-all cursor-pointer"
                            title="Mover para Lixeira"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Mudar de pasta inline */}
                        {movingItemId === list.id && movingItemType === "list" ? (
                          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-emerald-500/40">
                            <select
                              value={folder}
                              onChange={(e) => {
                                if (onUpdateListFolder) onUpdateListFolder(list.id, e.target.value);
                                setMovingItemId(null);
                                showNotification(`Movido para pasta "${e.target.value}"!`, "success");
                              }}
                              className="bg-transparent text-xs text-white p-1 rounded outline-none flex-1"
                            >
                              {allFolderNames.map((f) => (
                                <option key={f} value={f} className="bg-slate-900 text-white">{f}</option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => setMovingItemId(null)}
                              className="p-1 text-slate-400 hover:text-white"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => { setMovingItemId(list.id); setMovingItemType("list"); }}
                            className="w-full text-center text-[9px] font-bold text-slate-500 hover:text-emerald-400 py-0.5 transition-colors cursor-pointer flex items-center justify-center gap-1"
                          >
                            <Folder className="w-2.5 h-2.5" />
                            <span>Mover de Pasta (atual: {folder})</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* 2. Notas do Bloco de Notas e Talões */}
                {filteredNotes.map((note) => {
                  const isTalao = Boolean(note.text?.includes("RECIBO") || note.text?.includes("TALÃO") || note.text?.includes("COMPROVANTE"));
                  const isExpanded = expandedItemId === note.id;
                  const firstLine = note.text ? note.text.split("\n")[0] : "Nota";
                  const folder = note.folder && note.folder !== "Sem Pasta" ? note.folder : "Geral";

                  return (
                    <div
                      key={note.id}
                      className="bg-slate-900 border border-white/10 hover:border-amber-500/40 rounded-3xl p-5 shadow-lg flex flex-col justify-between gap-4 transition-all"
                    >
                      <div>
                        {/* Header do Card */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                            isTalao
                              ? "bg-purple-500/15 text-purple-400 border-purple-500/30"
                              : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                          }`}>
                            {isTalao ? "🧾 Talão & Recibo" : "📝 Bloco de Notas Comum"}
                          </span>

                          <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-md bg-slate-950 text-slate-400 border border-white/5 flex items-center gap-1">
                            <Folder className="w-2.5 h-2.5 text-amber-400" />
                            <span>{folder}</span>
                          </span>
                        </div>

                        {/* Conteúdo resumido */}
                        <h4 className="text-sm font-black text-white line-clamp-1 mb-1">
                          {firstLine}
                        </h4>

                        <div className="flex items-baseline justify-between mt-2 pt-2 border-t border-white/5">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Data de Gravação:</span>
                          <span className="text-xs font-bold text-slate-300">
                            {note.date || "Sem data"}
                          </span>
                        </div>

                        {/* Expandable Preview */}
                        {isExpanded && (
                          <div className="mt-3 p-3 bg-slate-950 rounded-2xl border border-white/5 space-y-1.5 text-xs text-slate-300 max-h-48 overflow-y-auto custom-scrollbar">
                            <p className="text-[9px] font-black uppercase text-amber-400 tracking-wider mb-1">
                              Conteúdo da Nota:
                            </p>
                            <p className="whitespace-pre-wrap">{note.text}</p>
                          </div>
                        )}
                      </div>

                      {/* Ações do Card */}
                      <div className="space-y-2 pt-2 border-t border-white/5">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              onLoadNote(note);
                              if (isTalao) {
                                onNavigateToMode("receipts");
                              } else {
                                onNavigateToMode("notes");
                              }
                              showNotification("Nota carregada no editor! 📝", "success");
                            }}
                            className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md"
                            title="Carregar no Editor"
                          >
                            <span>Abrir no Editor</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setExpandedItemId(isExpanded ? null : note.id)}
                            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs transition-all cursor-pointer"
                            title={isExpanded ? "Ocultar detalhes" : "Ver detalhes"}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleShareWhatsApp(note.text || "", firstLine)}
                            className="p-2 bg-green-600/20 hover:bg-green-600 text-green-300 hover:text-white rounded-xl text-xs transition-all cursor-pointer"
                            title="Compartilhar no WhatsApp"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => onDeleteNote(note.id)}
                            className="p-2 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white rounded-xl text-xs transition-all cursor-pointer"
                            title="Apagar Nota"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Mudar de pasta inline */}
                        {movingItemId === note.id && movingItemType === "note" ? (
                          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-amber-500/40">
                            <select
                              value={folder}
                              onChange={(e) => {
                                onUpdateNoteFolder(note.id, e.target.value);
                                setMovingItemId(null);
                                showNotification(`Movido para pasta "${e.target.value}"!`, "success");
                              }}
                              className="bg-transparent text-xs text-white p-1 rounded outline-none flex-1"
                            >
                              {allFolderNames.map((f) => (
                                <option key={f} value={f} className="bg-slate-900 text-white">{f}</option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => setMovingItemId(null)}
                              className="p-1 text-slate-400 hover:text-white"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => { setMovingItemId(note.id); setMovingItemType("note"); }}
                            className="w-full text-center text-[9px] font-bold text-slate-500 hover:text-amber-400 py-0.5 transition-colors cursor-pointer flex items-center justify-center gap-1"
                          >
                            <Folder className="w-2.5 h-2.5" />
                            <span>Mover de Pasta (atual: {folder})</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* 3. Contas, Boletos & Faturas de Fornecedores */}
                {filteredAgendaEvents.map((event) => {
                  const evDate = event.date && event.date.seconds ? new Date(event.date.seconds * 1000) : new Date(event.date);
                  const isCompleted = event.status === 'completed';
                  const isOverdue = !isCompleted && evDate < new Date() && !isSameDay(evDate, new Date());
                  const isToday = !isCompleted && isSameDay(evDate, new Date());
                  const folder = event.folder || "Fornecedores";

                  return (
                    <div
                      key={event.id}
                      className={`border rounded-3xl p-5 shadow-lg flex flex-col justify-between gap-4 transition-all ${
                        isOverdue
                          ? "bg-red-950/40 border-red-500 shadow-red-950/30"
                          : isToday
                          ? "bg-rose-950/30 border-rose-500/70"
                          : isCompleted
                          ? "bg-slate-900/60 border-white/5 opacity-60"
                          : "bg-slate-900 border-white/10 hover:border-purple-500/40"
                      }`}
                    >
                      <div>
                        {/* Header do Card */}
                        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                          <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                            event.type === 'supplier_debt' || event.type === 'supplier_visit'
                              ? "bg-purple-500/15 text-purple-300 border-purple-500/30"
                              : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                          }`}>
                            {event.type === 'supplier_debt' ? "🚚 Fornecedor & Fatura" : "💳 Boleto / Pagar"}
                          </span>

                          <div className="flex items-center gap-1.5">
                            {isOverdue && (
                              <span className="px-2 py-0.5 rounded-full text-[8.5px] font-black uppercase bg-red-600 text-white animate-pulse">
                                🚨 VENCIDO
                              </span>
                            )}
                            {isToday && (
                              <span className="px-2 py-0.5 rounded-full text-[8.5px] font-black uppercase bg-red-600 text-white">
                                🔴 VENCE HOJE
                              </span>
                            )}
                            {isCompleted && (
                              <span className="px-2 py-0.5 rounded-full text-[8.5px] font-black uppercase bg-emerald-500/20 text-emerald-300">
                                ✓ PAGO
                              </span>
                            )}
                            <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-md bg-slate-950 text-slate-400 border border-white/5 flex items-center gap-1">
                              <Folder className="w-2.5 h-2.5 text-amber-400" />
                              <span>{folder}</span>
                            </span>
                          </div>
                        </div>

                        <h4 className={`text-sm font-black uppercase tracking-tight line-clamp-2 ${isCompleted ? "text-slate-400 line-through" : "text-white"}`}>
                          {event.title}
                        </h4>

                        {event.supplierName && (
                          <p className="text-xs text-purple-300 font-bold mt-1 flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5" />
                            <span>{event.supplierName}</span>
                          </p>
                        )}

                        <div className="flex items-baseline justify-between mt-2 pt-2 border-t border-white/5">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Vencimento:</span>
                          <span className={`text-xs font-bold ${isOverdue ? "text-red-400" : isToday ? "text-rose-300" : "text-slate-200"}`}>
                            {event.date ? format(evDate, "dd/MM/yyyy HH:mm") : "Sem data"}
                          </span>
                        </div>

                        <div className="flex items-baseline justify-between mt-1">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Valor a Pagar:</span>
                          <span className="text-sm font-black font-mono text-emerald-400">
                            {formatCurrency(event.amount || 0)}
                          </span>
                        </div>

                        {event.barcodePix && (
                          <p className="text-[10.5px] text-slate-400 font-mono mt-1 line-clamp-1">
                            Pix/Cód: <strong className="text-white">{event.barcodePix}</strong>
                          </p>
                        )}
                      </div>

                      {/* Ações do Card */}
                      <div className="space-y-2 pt-2 border-t border-white/5">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              onNavigateToMode("agenda");
                              showNotification("Abrindo na Agenda de Pagamentos! 📅", "info");
                            }}
                            className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md"
                          >
                            <CalendarIcon className="w-3 h-3" />
                            <span>Ver na Agenda</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const evDate = event.date && event.date.seconds ? new Date(event.date.seconds * 1000) : new Date(event.date);
                              const isOverdue = !isCompleted && evDate < new Date() && !isSameDay(evDate, new Date());
                              const isToday = !isCompleted && isSameDay(evDate, new Date());
                              let statusText = isOverdue ? "🚨 PAGAMENTO VENCIDO! FAVOR EFETUAR HOJE." : isToday ? "⚠️ HOJE É A DATA DE VENCIMENTO!" : "Lembrete de Pagamento";
                              let msg = `*🚨 LEMBRETE DE CONTA / FORNECEDOR*\n\n📌 *Título:* ${event.title}\n`;
                              if (event.supplierName) msg += `🏢 *Fornecedor:* ${event.supplierName}\n`;
                              msg += `💰 *Valor:* ${formatCurrency(event.amount || 0)}\n📅 *Vencimento:* ${format(evDate, "dd/MM/yyyy HH:mm")}\n⚠️ *Status:* ${statusText}\n`;
                              if (event.barcodePix) msg += `📋 *Código/Pix:* ${event.barcodePix}\n`;
                              window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, "_blank");
                            }}
                            className="p-2 bg-green-600/20 hover:bg-green-600 text-green-300 hover:text-white rounded-xl text-xs transition-all cursor-pointer"
                            title="Enviar Lembrete no WhatsApp"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const evDate = event.date && event.date.seconds ? new Date(event.date.seconds * 1000) : new Date(event.date);
                                const isOverdue = !isCompleted && evDate < new Date() && !isSameDay(evDate, new Date());
                                const isToday = !isCompleted && isSameDay(evDate, new Date());
                                let statusText = isOverdue ? "🚨 PAGAMENTO VENCIDO! FAVOR EFETUAR HOJE." : isToday ? "⚠️ HOJE É A DATA DE VENCIMENTO!" : "Lembrete de Pagamento";
                                let msg = `*🚨 LEMBRETE DE CONTA / FORNECEDOR*\n\n📌 *Título:* ${event.title}\n`;
                                if (event.supplierName) msg += `🏢 *Fornecedor:* ${event.supplierName}\n`;
                                msg += `💰 *Valor:* ${formatCurrency(event.amount || 0)}\n📅 *Vencimento:* ${format(evDate, "dd/MM/yyyy HH:mm")}\n⚠️ *Status:* ${statusText}\n`;
                                if (event.barcodePix) msg += `📋 *Código/Pix:* ${event.barcodePix}\n`;
                                await navigator.clipboard.writeText(msg);
                                setCopiedBillId(event.id);
                                showNotification("Lembrete copiado para a área de transferência! 📋", "success");
                                setTimeout(() => setCopiedBillId(null), 3000);
                              } catch (e) {
                                console.error("Erro ao copiar:", e);
                              }
                            }}
                            className={`p-2 rounded-xl text-xs transition-all cursor-pointer ${
                              copiedBillId === event.id
                                ? "bg-emerald-600 text-white"
                                : "bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700"
                            }`}
                            title="Copiar Lembrete"
                          >
                            {copiedBillId === event.id ? <CheckCheck className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>

                          {onUpdateEvent && (
                            <button
                              type="button"
                              onClick={() => {
                                onUpdateEvent(event.id, { status: isCompleted ? 'pending' : 'completed' });
                                showNotification(isCompleted ? "Pagamento reaberto!" : "Conta marcada como PAGA! ✅", "success");
                              }}
                              className={`p-2 rounded-xl text-xs transition-all cursor-pointer ${
                                isCompleted
                                  ? "bg-slate-800 text-slate-400 hover:text-white"
                                  : "bg-emerald-600/30 text-emerald-300 hover:bg-emerald-600 hover:text-white"
                              }`}
                              title={isCompleted ? "Reabrir Pagamento" : "Marcar como Pago"}
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {onDeleteEvent && (
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteEvent(event.id);
                                showNotification("Compromisso removido.", "info");
                              }}
                              className="p-2 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white rounded-xl text-xs transition-all cursor-pointer"
                              title="Excluir"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
