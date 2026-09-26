import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  ShoppingBag, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Clock, 
  CheckCircle2, 
  Trash2,
  AlertCircle,
  Truck,
  Share2,
  AlertTriangle,
  Folder,
  FolderPlus,
  QrCode,
  Building2,
  BellRing,
  Phone,
  Filter,
  Check,
  CheckCheck,
  Copy
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  eachDayOfInterval,
  isToday,
  startOfDay
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { AgendaEvent } from "../types";

interface AgendaProps {
  events: AgendaEvent[];
  addEvent: (event: Omit<AgendaEvent, 'id' | 'createdAt' | 'userId'>) => Promise<void>;
  updateEvent: (id: string, updates: Partial<AgendaEvent>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  formatCurrency: (val: number) => string;
  prefilledAmount?: number | null;
  clearPrefill?: () => void;
  createdFolders?: string[];
}

export const AgendaModule = React.memo(({
  events,
  addEvent,
  updateEvent,
  deleteEvent,
  formatCurrency,
  prefilledAmount,
  clearPrefill,
  createdFolders = ["Fornecedores", "Boletos", "Contas Fixas", "Pagamentos", "Geral"]
}: AgendaProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Filter tab: "all" (por dia selecionado), "urgent" (vencidos e hoje em vermelho), "fornecedores", "boletos", "receber"
  const [filterMode, setFilterMode] = useState<'day' | 'urgent' | 'fornecedores' | 'boletos' | 'receber'>('day');

  // Copy feedback state
  const [copiedEventId, setCopiedEventId] = useState<string | null>(null);

  // Form states
  const [newTitle, setNewTitle] = useState("");
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newTime, setNewTime] = useState(format(new Date(), "HH:mm"));
  const [newType, setNewType] = useState<AgendaEvent['type']>('supplier_debt');
  const [newFolder, setNewFolder] = useState<string>("Fornecedores");
  const [newBarcodePix, setNewBarcodePix] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newDescription, setNewDescription] = useState("");

  // Custom folder in modal
  const [isAddingCustomFolder, setIsAddingCustomFolder] = useState(false);
  const [customFolderInput, setCustomFolderInput] = useState("");
  const [availableFolders, setAvailableFolders] = useState<string[]>(() => {
    return Array.from(new Set([...createdFolders, "Fornecedores", "Boletos", "Contas Fixas", "Pagamentos", "Geral"]));
  });

  // Handle prefilled amount
  React.useEffect(() => {
    if (prefilledAmount !== undefined && prefilledAmount !== null) {
      setNewAmount(prefilledAmount.toString());
      setShowAddModal(true);
      if (clearPrefill) clearPrefill();
    }
  }, [prefilledAmount, clearPrefill]);

  // Helper to extract date from event
  const getEventDate = (event: AgendaEvent): Date => {
    if (!event.date) return new Date();
    if (typeof event.date === 'object' && 'seconds' in event.date) {
      return new Date(event.date.seconds * 1000);
    }
    return new Date(event.date);
  };

  const todayStart = startOfDay(new Date());

  // Check event status
  const checkEventStatus = (event: AgendaEvent) => {
    if (event.status === 'completed') return 'completed';
    const evDate = getEventDate(event);
    if (isSameDay(evDate, new Date())) return 'today';
    if (evDate < todayStart) return 'overdue';
    return 'upcoming';
  };

  // Urgent Events: Overdue (Atrasados) or Due Today (Vencem Hoje)
  const urgentEvents = useMemo(() => {
    return events.filter(e => {
      if (e.status === 'completed') return false;
      const status = checkEventStatus(e);
      return status === 'overdue' || status === 'today';
    }).sort((a, b) => getEventDate(a).getTime() - getEventDate(b).getTime());
  }, [events]);

  const overdueCount = useMemo(() => {
    return urgentEvents.filter(e => checkEventStatus(e) === 'overdue').length;
  }, [urgentEvents]);

  const todayCount = useMemo(() => {
    return urgentEvents.filter(e => checkEventStatus(e) === 'today').length;
  }, [urgentEvents]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate
  });

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  // Day events for selected date
  const dayEvents = useMemo(() => {
    return events.filter(event => {
      const eventDate = getEventDate(event);
      return isSameDay(eventDate, selectedDate);
    });
  }, [events, selectedDate]);

  // Filtered events based on tab
  const displayedEvents = useMemo(() => {
    if (filterMode === 'urgent') return urgentEvents;
    if (filterMode === 'fornecedores') {
      return events.filter(e => e.type === 'supplier_debt' || e.type === 'supplier_visit' || e.folder?.toLowerCase().includes("fornecedor"));
    }
    if (filterMode === 'boletos') {
      return events.filter(e => e.type === 'payment_made' || e.folder?.toLowerCase().includes("boleto") || e.folder?.toLowerCase().includes("fixa"));
    }
    if (filterMode === 'receber') {
      return events.filter(e => e.type === 'payment_received');
    }
    return dayEvents;
  }, [filterMode, urgentEvents, events, dayEvents]);

  const getDayEvents = (day: Date) => {
    return events.filter(event => {
      const eventDate = getEventDate(event);
      return isSameDay(eventDate, day);
    });
  };

  // Submit new event
  const handleAddSubmit = async () => {
    if (!newTitle.trim()) return;
    
    const [hours, minutes] = newTime.split(":").map(Number);
    const finalDate = new Date(selectedDate);
    finalDate.setHours(hours || 0, minutes || 0, 0, 0);

    await addEvent({
      title: newTitle.trim(),
      amount: parseFloat(newAmount) || 0,
      type: newType,
      date: finalDate,
      status: 'pending',
      supplierName: newSupplierName.trim() || undefined,
      barcodePix: newBarcodePix.trim() || undefined,
      folder: newFolder.trim() || "Geral",
      phone: newPhone.trim() || undefined,
      description: newDescription.trim() || undefined
    });

    setNewTitle("");
    setNewSupplierName("");
    setNewAmount("");
    setNewBarcodePix("");
    setNewPhone("");
    setNewDescription("");
    setShowAddModal(false);
  };

  // Generate formatted reminder message
  const generateReminderMessage = (event: AgendaEvent) => {
    const evDate = getEventDate(event);
    const dateFormatted = format(evDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    const status = checkEventStatus(event);

    let statusLine = "STATUS: AGENDADO";
    if (status === 'overdue') {
      statusLine = "🚨 STATUS: PAGAMENTO VENCIDO! FAVOR EFETUAR A QUITAÇÃO IMEDIATAMENTE.";
    } else if (status === 'today') {
      statusLine = "🔴 STATUS: VENCE HOJE! ATENÇÃO PARA NÃO GERAR JUROS OU SUSPENSÃO.";
    }

    let msg = `*🚨 LEMBRETE DE COMPROMISSO & PAGAMENTO*\n\n`;
    msg += `📌 *Conta / Título:* ${event.title}\n`;
    if (event.supplierName) msg += `🏢 *Fornecedor:* ${event.supplierName}\n`;
    if (event.amount && event.amount > 0) msg += `💰 *Valor:* ${formatCurrency(event.amount)}\n`;
    msg += `📅 *Vencimento:* ${dateFormatted}\n`;
    msg += `⚠️ ${statusLine}\n`;
    if (event.folder) msg += `📁 *Pasta:* ${event.folder}\n`;
    if (event.barcodePix) msg += `📋 *Código de Barras / Chave Pix:* ${event.barcodePix}\n`;
    if (event.description) msg += `📝 *Observações:* ${event.description}\n`;
    msg += `\n_Mensagem enviada via Agenda Inteligente do PDV_`;
    return msg;
  };

  // WhatsApp reminder message
  const handleSendWhatsAppReminder = (event: AgendaEvent) => {
    const msg = generateReminderMessage(event);
    const phoneClean = event.phone ? event.phone.replace(/\D/g, "") : "";
    const url = phoneClean 
      ? `https://api.whatsapp.com/send?phone=55${phoneClean}&text=${encodeURIComponent(msg)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  // Copy reminder to clipboard
  const handleCopyReminder = async (event: AgendaEvent) => {
    try {
      const msg = generateReminderMessage(event);
      await navigator.clipboard.writeText(msg);
      setCopiedEventId(event.id);
      setTimeout(() => setCopiedEventId(null), 3000);
    } catch (e) {
      console.error("Erro ao copiar lembrete:", e);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="p-3 sm:p-6 pb-40 space-y-6 min-h-[70vh] bg-slate-900 text-left rounded-3xl"
    >
      {/* 1. NOTIFICAÇÃO URGENTE DE VENCIMENTOS EM VERMELHO */}
      {urgentEvents.length > 0 && (
        <div className="bg-gradient-to-r from-red-950 via-rose-950 to-red-900 border-2 border-red-500 rounded-3xl p-5 shadow-2xl shadow-red-950/60 relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-red-600/50 animate-bounce">
                <BellRing className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-black uppercase text-white tracking-wider">
                    Alerta de Vencimentos em Vermelho 🚨
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-500 text-white shadow animate-pulse">
                    {urgentEvents.length} {urgentEvents.length === 1 ? "Conta Urgente" : "Contas Urgentes"}
                  </span>
                </div>
                <p className="text-xs text-red-200 mt-1 font-semibold">
                  {overdueCount > 0 && todayCount > 0 ? (
                    <span>Existem <strong className="text-white underline">{overdueCount} boleto(s) vencido(s)</strong> e <strong className="text-white underline">{todayCount} vencendo hoje</strong>!</span>
                  ) : overdueCount > 0 ? (
                    <span>Atenção: Você tem <strong className="text-white underline">{overdueCount} pagamento(s) vencido(s)</strong> precisando de quitação!</span>
                  ) : (
                    <span>Hoje é dia de pagar <strong className="text-white underline">{todayCount} conta(s) / fatura(s) de fornecedores</strong>!</span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <button
                type="button"
                onClick={() => setFilterMode('urgent')}
                className={`w-full md:w-auto px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow cursor-pointer flex items-center justify-center gap-2 ${
                  filterMode === 'urgent'
                    ? "bg-white text-red-950 font-black shadow-lg"
                    : "bg-red-600 hover:bg-red-500 text-white"
                }`}
              >
                <span>{filterMode === 'urgent' ? "Visualizando Urgentes ✓" : "Ver Contas em Atraso ⚠️"}</span>
              </button>
            </div>
          </div>

          {/* Mini cards das faturas urgentes com ação rápida de mensagem */}
          <div className="mt-4 pt-3.5 border-t border-red-500/30 flex flex-wrap gap-2">
            {urgentEvents.slice(0, 4).map((ue) => {
              const isOver = checkEventStatus(ue) === 'overdue';
              return (
                <div
                  key={ue.id}
                  className="bg-black/50 border border-red-400/40 rounded-2xl px-3 py-2 flex items-center gap-2.5 text-xs text-white"
                >
                  <span className={`w-2 h-2 rounded-full ${isOver ? "bg-red-500 animate-ping" : "bg-amber-400"}`} />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-black uppercase ${isOver ? "text-red-400" : "text-amber-300"}`}>
                        {isOver ? "Vencido:" : "Vence Hoje:"}
                      </span>
                      <strong className="text-white font-black truncate max-w-[130px]">{ue.title}</strong>
                    </div>
                    {ue.amount ? (
                      <span className="text-[11px] font-mono text-emerald-400 font-bold block">
                        {formatCurrency(ue.amount)}
                      </span>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSendWhatsAppReminder(ue)}
                    className="p-1.5 bg-green-600/30 hover:bg-green-600 text-green-300 hover:text-white rounded-xl text-xs transition-all cursor-pointer ml-1"
                    title="Enviar Lembrete WhatsApp"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
            {urgentEvents.length > 4 && (
              <button
                type="button"
                onClick={() => setFilterMode('urgent')}
                className="text-xs text-red-200 hover:text-white font-bold underline self-center px-2 py-1 cursor-pointer"
              >
                +{urgentEvents.length - 4} outros compromissos...
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2. Top Header & Calendar Container */}
      <div className="bg-slate-950 rounded-[2.5rem] p-5 sm:p-6 shadow-xl border border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-500/20 text-white">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white uppercase tracking-tight leading-none">Agenda & Vencimentos</h2>
                <span className="px-2 py-0.5 rounded text-[8.5px] font-black uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Compromissos
                </span>
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Anotar Pagamento / Conta
            </button>
            <div className="flex gap-1 bg-slate-900 p-1 rounded-xl border border-white/5">
              <button onClick={prevMonth} className="p-2 hover:bg-slate-800 text-slate-300 rounded-lg transition-colors cursor-pointer" title="Mês Anterior">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={nextMonth} className="p-2 hover:bg-slate-800 text-slate-300 rounded-lg transition-colors cursor-pointer" title="Próximo Mês">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Week Days */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(day => (
            <div key={day} className="text-center text-[10px] font-black text-slate-500 uppercase tracking-widest">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, idx) => {
            const isSelected = isSameDay(day, selectedDate);
            const isCurrentMonth = isSameMonth(day, monthStart);
            const evts = getDayEvents(day);
            const hasOverdueOrToday = evts.some(e => e.status === 'pending' && (isSameDay(getEventDate(e), new Date()) || getEventDate(e) < todayStart));
            
            return (
              <button
                key={idx}
                onClick={() => {
                  setSelectedDate(day);
                  setFilterMode('day');
                }}
                className={`relative aspect-square flex flex-col items-center justify-center rounded-2xl transition-all border-2 cursor-pointer ${
                  isSelected 
                    ? "border-emerald-500 bg-emerald-500/15 text-white" 
                    : hasOverdueOrToday
                    ? "border-red-500/50 bg-red-950/20 text-white"
                    : "border-transparent text-slate-300 hover:bg-slate-900"
                } ${!isCurrentMonth ? "opacity-25" : ""}`}
              >
                <span className={`text-xs sm:text-sm font-black ${isToday(day) ? "underline decoration-emerald-400 decoration-2 underline-offset-4 text-emerald-400" : ""}`}>
                  {format(day, "d")}
                </span>
                {evts.length > 0 && (
                  <div className="flex gap-0.5 mt-1 items-center">
                    {hasOverdueOrToday && (
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping inline-block" />
                    )}
                    {evts.slice(0, 3).map((e, i) => {
                      const st = checkEventStatus(e);
                      return (
                        <div 
                          key={i} 
                          className={`w-1 h-1 rounded-full ${
                            st === 'overdue' ? "bg-red-500" :
                            st === 'today' ? "bg-amber-400" :
                            e.status === 'completed' ? "bg-emerald-500" : "bg-sky-400"
                          }`} 
                        />
                      );
                    })}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Filter Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/5 pb-3">
        <button
          type="button"
          onClick={() => setFilterMode('day')}
          className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border ${
            filterMode === 'day'
              ? "bg-emerald-600 text-white border-emerald-400 shadow-md"
              : "bg-slate-950 text-slate-400 hover:text-white border-white/5"
          }`}
        >
          <CalendarIcon className="w-3.5 h-3.5 inline mr-1.5" />
          <span>{isToday(selectedDate) ? "Hoje" : format(selectedDate, "d 'de' MMMM", { locale: ptBR })} ({dayEvents.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterMode('urgent')}
          className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border ${
            filterMode === 'urgent'
              ? "bg-red-600 text-white border-red-400 shadow-lg shadow-red-950/50"
              : "bg-slate-950 text-red-400 hover:text-white border-red-500/20"
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5 inline mr-1.5" />
          <span>🚨 Vencidos & Vence Hoje ({urgentEvents.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterMode('fornecedores')}
          className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border ${
            filterMode === 'fornecedores'
              ? "bg-purple-600 text-white border-purple-400 shadow-md"
              : "bg-slate-950 text-purple-400 hover:text-white border-white/5"
          }`}
        >
          <Truck className="w-3.5 h-3.5 inline mr-1.5" />
          <span>🚚 Fornecedores</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterMode('boletos')}
          className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border ${
            filterMode === 'boletos'
              ? "bg-amber-600 text-white border-amber-400 shadow-md"
              : "bg-slate-950 text-amber-400 hover:text-white border-white/5"
          }`}
        >
          <ArrowUpCircle className="w-3.5 h-3.5 inline mr-1.5" />
          <span>💳 Boletos & Contas</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterMode('receber')}
          className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border ${
            filterMode === 'receber'
              ? "bg-green-600 text-white border-green-400 shadow-md"
              : "bg-slate-950 text-green-400 hover:text-white border-white/5"
          }`}
        >
          <ArrowDownCircle className="w-3.5 h-3.5 inline mr-1.5" />
          <span>💰 A Receber</span>
        </button>
      </div>

      {/* 4. Events List */}
      <div className="space-y-3">
        {displayedEvents.length === 0 ? (
          <div className="bg-slate-950/60 rounded-3xl p-10 text-center border-2 border-dashed border-white/10 space-y-2">
            <Clock className="w-8 h-8 text-slate-600 mx-auto mb-1" />
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
              Nenhum compromisso encontrado nesta visualização
            </p>
            <p className="text-[11px] text-slate-500">
              Clique em <strong className="text-emerald-400">Anotar Pagamento / Conta</strong> no topo para agendar boletos e faturas!
            </p>
          </div>
        ) : (
          displayedEvents.map(event => {
            const evDate = getEventDate(event);
            const status = checkEventStatus(event);
            const isCompleted = event.status === 'completed';

            return (
              <motion.div
                layout
                key={event.id}
                className={`p-4 sm:p-5 rounded-3xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  status === 'overdue'
                    ? "bg-red-950/40 border-red-500 shadow-lg shadow-red-950/30"
                    : status === 'today'
                    ? "bg-rose-950/30 border-rose-500/70 shadow-md"
                    : isCompleted
                    ? "bg-slate-950/40 border-white/5 opacity-60"
                    : "bg-slate-950 border-white/10 hover:border-emerald-500/30"
                }`}
              >
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow ${
                    status === 'overdue' ? "bg-red-600 text-white animate-pulse" :
                    status === 'today' ? "bg-rose-600 text-white" :
                    isCompleted ? "bg-slate-800 text-slate-400" :
                    event.type === 'supplier_debt' || event.type === 'supplier_visit' ? "bg-purple-600 text-white" :
                    event.type === 'payment_made' ? "bg-amber-600 text-white" :
                    event.type === 'payment_received' ? "bg-green-600 text-white" : "bg-emerald-600 text-white"
                  }`}>
                    {event.type === 'supplier_debt' || event.type === 'supplier_visit' ? <Truck className="w-6 h-6" /> :
                     event.type === 'payment_made' ? <ArrowUpCircle className="w-6 h-6" /> :
                     event.type === 'payment_received' ? <ArrowDownCircle className="w-6 h-6" /> :
                     event.type === 'shopping' ? <ShoppingBag className="w-6 h-6" /> : <CalendarIcon className="w-6 h-6" />}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className={`text-sm sm:text-base font-black uppercase tracking-tight ${isCompleted ? "text-slate-400 line-through" : "text-white"}`}>
                        {event.title}
                      </h4>

                      {/* BADGES EM VERMELHO DE VENCIMENTO */}
                      {status === 'overdue' && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-600 text-white border border-red-400 shadow animate-bounce">
                          🚨 VENCIDO
                        </span>
                      )}
                      {status === 'today' && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-600 text-white border border-red-400 shadow">
                          🔴 VENCE HOJE
                        </span>
                      )}
                      {isCompleted && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          ✓ PAGO / QUITADO
                        </span>
                      )}

                      {event.folder && (
                        <span className="px-2 py-0.5 rounded text-[8.5px] font-black uppercase bg-slate-900 text-slate-300 border border-white/10 flex items-center gap-1">
                          <Folder className="w-2.5 h-2.5 text-amber-400" />
                          <span>{event.folder}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                      {event.supplierName && (
                        <span className="flex items-center gap-1 text-purple-300 font-bold">
                          <Building2 className="w-3.5 h-3.5" />
                          <span>{event.supplierName}</span>
                        </span>
                      )}

                      <span>
                        Vencimento: <strong className={status === 'overdue' ? "text-red-400" : status === 'today' ? "text-rose-300" : "text-slate-200"}>
                          {format(evDate, "dd/MM/yyyy 'às' HH:mm")}
                        </strong>
                      </span>

                      {event.amount && event.amount > 0 ? (
                        <span className="font-mono font-black text-emerald-400 text-sm">
                          {formatCurrency(event.amount)}
                        </span>
                      ) : null}
                    </div>

                    {event.barcodePix && (
                      <p className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5 pt-0.5">
                        <QrCode className="w-3 h-3 text-emerald-400" />
                        <span>Código / Pix: <strong className="text-white selection:bg-emerald-500">{event.barcodePix}</strong></span>
                      </p>
                    )}

                    {event.description && (
                      <p className="text-[11px] text-slate-400 italic">"{event.description}"</p>
                    )}
                  </div>
                </div>

                {/* Actions: Send WhatsApp Reminder, Copy, Mark as Paid, Delete */}
                <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleSendWhatsAppReminder(event)}
                    className="px-3 py-2 bg-green-600/20 hover:bg-green-600 text-green-300 hover:text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer border border-green-500/30"
                    title="Enviar Lembrete deste Pagamento no WhatsApp"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Lembrete WhatsApp 📲</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopyReminder(event)}
                    className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer border ${
                      copiedEventId === event.id
                        ? "bg-emerald-600 text-white border-emerald-400"
                        : "bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border-white/10"
                    }`}
                    title="Copiar texto do lembrete"
                  >
                    {copiedEventId === event.id ? (
                      <>
                        <CheckCheck className="w-3.5 h-3.5 text-white" />
                        <span>Copiado! ✓</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar 📋</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => updateEvent(event.id, { status: isCompleted ? 'pending' : 'completed' })}
                    className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer border ${
                      isCompleted
                        ? "bg-slate-800 text-slate-400 border-white/10 hover:text-white"
                        : "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow"
                    }`}
                    title={isCompleted ? "Reabrir Pagamento" : "Confirmar Pagamento"}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isCompleted ? "Pago ✓" : "Pagar"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteEvent(event.id)}
                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-900 rounded-xl transition-all cursor-pointer"
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* 5. MODAL DE NOVO AGENDAMENTO DE PAGAMENTO / CONTA */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 text-white overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-slate-900 border-2 border-emerald-500/30 rounded-[2.5rem] p-6 sm:p-8 shadow-2xl space-y-5 my-auto"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-600 rounded-2xl text-white shadow-lg shadow-emerald-500/20">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black uppercase tracking-tight text-white">
                      Anotar Pagamento / Boleto 📝
                    </h3>
                    <p className="text-xs text-slate-400 font-semibold">
                      Cadastre faturas de fornecedores, contas ou compromissos
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3.5">
                {/* Sugestões Rápidas de Faturas / Contas */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    Sugestões Rápidas de Contas:
                  </label>
                  <div className="flex gap-1.5 flex-wrap">
                    {[
                      { title: "Fatura Hortifruti / Sacolão", supp: "Fornecedor Hortifruti", type: "supplier_debt", folder: "Fornecedores" },
                      { title: "Fatura Distribuidora Bebidas", supp: "Distribuidora Ambev", type: "supplier_debt", folder: "Fornecedores" },
                      { title: "Fatura Frigorífico / Carnes", supp: "Frigorífico Central", type: "supplier_debt", folder: "Fornecedores" },
                      { title: "Boleto Energia / Luz", supp: "Enel / Concessionária", type: "payment_made", folder: "Boletos" },
                      { title: "Aluguel Comercial", supp: "Imobiliária / Proprietário", type: "payment_made", folder: "Contas Fixas" },
                      { title: "DAS MEI / Imposto", supp: "Receita Federal", type: "payment_made", folder: "Boletos" },
                    ].map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setNewTitle(preset.title);
                          setNewSupplierName(preset.supp);
                          setNewType(preset.type as any);
                          setNewFolder(preset.folder);
                        }}
                        className="px-2.5 py-1 rounded-xl bg-slate-950 hover:bg-slate-800 text-[10px] font-bold text-slate-300 border border-white/10 hover:border-emerald-500/30 transition-all cursor-pointer"
                      >
                        + {preset.title}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Título / Motivo */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    Motivo / Título da Conta *
                  </label>
                  <input 
                    type="text"
                    placeholder="Ex: Fatura Fornecedor Hortifruti, Boleto Luz, Aluguel..."
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 hover:border-emerald-500/30 focus:border-emerald-500 rounded-2xl px-4 py-3 font-bold text-white outline-none transition-all text-xs"
                  />
                </div>

                {/* Fornecedor & Valor */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                      Nome do Fornecedor / Empresa
                    </label>
                    <input 
                      type="text"
                      placeholder="Ex: Distribuidora Ambev, Enel, etc."
                      value={newSupplierName}
                      onChange={(e) => setNewSupplierName(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 hover:border-emerald-500/30 focus:border-emerald-500 rounded-2xl px-4 py-3 font-bold text-white outline-none transition-all text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                      Valor a Pagar (R$)
                    </label>
                    <input 
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={newAmount}
                      onChange={(e) => setNewAmount(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 hover:border-emerald-500/30 focus:border-emerald-500 rounded-2xl px-4 py-3 font-mono font-black text-emerald-400 outline-none transition-all text-sm"
                    />
                  </div>
                </div>

                {/* Data & Hora de Vencimento */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                      Data de Vencimento
                    </label>
                    <input 
                      type="date"
                      value={format(selectedDate, "yyyy-MM-dd")}
                      onChange={(e) => {
                        const d = new Date(e.target.value);
                        if (!isNaN(d.getTime())) setSelectedDate(d);
                      }}
                      className="w-full bg-slate-950 border border-white/10 hover:border-emerald-500/30 focus:border-emerald-500 rounded-2xl px-3 py-3 font-bold text-white outline-none transition-all text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                      Horário
                    </label>
                    <input 
                      type="time"
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 hover:border-emerald-500/30 focus:border-emerald-500 rounded-2xl px-3 py-3 font-bold text-white outline-none transition-all text-xs"
                    />
                  </div>
                </div>

                {/* Código de Barras / Chave Pix & WhatsApp */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                      Código de Barras / Chave Pix (Opcional)
                    </label>
                    <input 
                      type="text"
                      placeholder="Cole aqui o código ou chave Pix"
                      value={newBarcodePix}
                      onChange={(e) => setNewBarcodePix(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 hover:border-emerald-500/30 focus:border-emerald-500 rounded-2xl px-4 py-3 font-mono text-white outline-none transition-all text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                      WhatsApp do Fornecedor / Lembrete
                    </label>
                    <input 
                      type="text"
                      placeholder="Ex: 21999999999"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 hover:border-emerald-500/30 focus:border-emerald-500 rounded-2xl px-4 py-3 text-white outline-none transition-all text-xs"
                    />
                  </div>
                </div>

                {/* Pasta de Organização */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                      Salvar na Pasta (Gaveteiro):
                    </label>
                    {!isAddingCustomFolder ? (
                      <button
                        type="button"
                        onClick={() => setIsAddingCustomFolder(true)}
                        className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                      >
                        <FolderPlus className="w-3 h-3" />
                        <span>+ Nova Pasta</span>
                      </button>
                    ) : null}
                  </div>

                  {isAddingCustomFolder && (
                    <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-emerald-500/40 my-1">
                      <input
                        type="text"
                        autoFocus
                        placeholder="Nome da pasta (ex: Carnes)..."
                        value={customFolderInput}
                        onChange={(e) => setCustomFolderInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && customFolderInput.trim()) {
                            const name = customFolderInput.trim();
                            if (!availableFolders.includes(name)) {
                              setAvailableFolders((prev) => [...prev, name]);
                            }
                            setNewFolder(name);
                            setIsAddingCustomFolder(false);
                            setCustomFolderInput("");
                          }
                        }}
                        className="bg-transparent px-3 py-1 text-xs text-white placeholder-slate-500 outline-none flex-1 font-bold"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (customFolderInput.trim()) {
                            const name = customFolderInput.trim();
                            if (!availableFolders.includes(name)) {
                              setAvailableFolders((prev) => [...prev, name]);
                            }
                            setNewFolder(name);
                          }
                          setIsAddingCustomFolder(false);
                          setCustomFolderInput("");
                        }}
                        className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-black cursor-pointer"
                      >
                        OK
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingCustomFolder(false);
                          setCustomFolderInput("");
                        }}
                        className="px-2 py-1 text-slate-400 hover:text-white text-xs cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  <div className="flex gap-1.5 flex-wrap">
                    {availableFolders.map((folderName) => (
                      <button
                        key={folderName}
                        type="button"
                        onClick={() => setNewFolder(folderName)}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border cursor-pointer ${
                          newFolder === folderName
                            ? "bg-amber-500 text-slate-950 border-amber-400 shadow"
                            : "bg-slate-950 text-slate-400 border-white/5 hover:text-white"
                        }`}
                      >
                        <Folder className="w-2.5 h-2.5 inline mr-1" />
                        {folderName}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tipo de Agendamento */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    Tipo do Compromisso
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'supplier_debt', label: 'Fornecedor', icon: <Truck className="w-3.5 h-3.5" /> },
                      { id: 'payment_made', label: 'Boleto / Pagar', icon: <ArrowUpCircle className="w-3.5 h-3.5" /> },
                      { id: 'payment_received', label: 'A Receber', icon: <ArrowDownCircle className="w-3.5 h-3.5" /> },
                    ].map(type => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setNewType(type.id as any)}
                        className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl border transition-all font-black text-[9.5px] uppercase tracking-wider cursor-pointer ${
                          newType === type.id 
                            ? "bg-emerald-600 border-emerald-400 text-white shadow-lg" 
                            : "bg-slate-950 border-white/5 text-slate-400 hover:border-emerald-500/30"
                        }`}
                      >
                        {type.icon} {type.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                <button 
                  type="button"
                  onClick={handleAddSubmit}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase text-xs tracking-wider shadow-xl shadow-emerald-950/50 active:scale-95 transition-all cursor-pointer"
                >
                  Salvar Compromisso de Pagamento ✅
                </button>
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-full sm:w-auto px-6 py-4 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white rounded-2xl font-bold uppercase text-xs tracking-wider transition-all cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});
