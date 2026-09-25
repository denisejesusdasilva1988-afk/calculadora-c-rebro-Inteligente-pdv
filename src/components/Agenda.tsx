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
  Truck
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
  isToday
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
}

export const AgendaModule = React.memo(({
  events,
  addEvent,
  updateEvent,
  deleteEvent,
  formatCurrency,
  prefilledAmount,
  clearPrefill
}: AgendaProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newTime, setNewTime] = useState(format(new Date(), "HH:mm"));
  const [newType, setNewType] = useState<'shopping' | 'payment_received' | 'payment_made' | 'general'>('general');

  // Handle prefilled amount
  React.useEffect(() => {
    if (prefilledAmount !== undefined && prefilledAmount !== null) {
      setNewAmount(prefilledAmount.toString());
      setShowAddModal(true);
      if (clearPrefill) clearPrefill();
    }
  }, [prefilledAmount, clearPrefill]);

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

  const dayEvents = useMemo(() => {
    return events.filter(event => {
      const eventDate = event.date && event.date.seconds ? new Date(event.date.seconds * 1000) : new Date(event.date);
      return isSameDay(eventDate, selectedDate);
    });
  }, [events, selectedDate]);

  const getDayEvents = (day: Date) => {
    return events.filter(event => {
      const eventDate = event.date && event.date.seconds ? new Date(event.date.seconds * 1000) : new Date(event.date);
      return isSameDay(eventDate, day);
    });
  };

  const handleAddSubmit = async () => {
    if (!newTitle.trim()) return;
    
    // Combine selectedDate and newTime
    const [hours, minutes] = newTime.split(":").map(Number);
    const finalDate = new Date(selectedDate);
    finalDate.setHours(hours || 0, minutes || 0, 0, 0);

    await addEvent({
      title: newTitle,
      amount: parseFloat(newAmount) || 0,
      type: newType,
      date: finalDate,
      status: 'pending'
    });
    setNewTitle("");
    setNewAmount("");
    setShowAddModal(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="p-4 sm:p-6 pb-40 space-y-8 min-h-[70vh] bg-slate-50"
    >
      {/* Calendar Header */}
      <div className="bg-white rounded-[2.5rem] p-6 shadow-xl shadow-slate-200/50 border border-slate-100">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-500/30">
              <CalendarIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none">Agenda</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={prevMonth} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <button onClick={nextMonth} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
              <ChevronRight className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>

        {/* Week Days */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(day => (
            <div key={day} className="text-center text-[10px] font-black text-slate-300 uppercase tracking-widest">
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
            
            return (
              <button
                key={idx}
                onClick={() => setSelectedDate(day)}
                className={`relative aspect-square flex flex-col items-center justify-center rounded-2xl transition-all border-2 ${isSelected ? "border-emerald-600 bg-emerald-50/50" : "border-transparent"} ${!isCurrentMonth ? "opacity-20" : "hover:bg-slate-50"}`}
              >
                <span className={`text-sm font-black ${isSelected ? "text-emerald-700" : "text-slate-700"} ${isToday(day) ? "underline decoration-emerald-500 decoration-2 underline-offset-4" : ""}`}>
                  {format(day, "d")}
                </span>
                {evts.length > 0 && (
                  <div className="flex gap-0.5 mt-1">
                    {evts.slice(0, 3).map((e, i) => (
                      <div 
                        key={i} 
                        className={`w-1 h-1 rounded-full ${
                          e.type === 'shopping' ? "bg-amber-500" : 
                          e.type === 'payment_received' ? "bg-green-500" : 
                          e.type === 'payment_made' ? "bg-red-500" : 
                          e.type === 'supplier_visit' ? "bg-purple-500" : 
                          e.type === 'supplier_debt' ? "bg-indigo-500" : "bg-emerald-500"
                        }`} 
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Events */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
            {isToday(selectedDate) ? "Hoje" : format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
          </h3>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all"
          >
            <Plus className="w-3 h-3" /> Novo
          </button>
        </div>

        <div className="space-y-3">
          {dayEvents.length === 0 ? (
            <div className="bg-white rounded-[2rem] p-10 text-center border-2 border-dashed border-slate-200">
               <Clock className="w-8 h-8 text-slate-200 mx-auto mb-3" />
               <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nenhum compromisso agendado</p>
            </div>
          ) : (
            dayEvents.map(event => (
              <motion.div
                layout
                key={event.id}
                className="bg-white rounded-[2rem] p-4 border-2 border-slate-100 shadow-sm flex items-center justify-between group"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                    event.type === 'shopping' ? "bg-amber-50 text-amber-500" : 
                    event.type === 'payment_received' ? "bg-green-50 text-green-500" : 
                    event.type === 'payment_made' ? "bg-red-50 text-red-500" : 
                    event.type === 'supplier_visit' ? "bg-purple-50 text-purple-500" : 
                    event.type === 'supplier_debt' ? "bg-indigo-50 text-indigo-500" : "bg-emerald-50 text-emerald-500"
                  }`}>
                    {event.type === 'shopping' ? <ShoppingBag className="w-6 h-6" /> : 
                     event.type === 'payment_received' ? <ArrowDownCircle className="w-6 h-6" /> : 
                     event.type === 'payment_made' ? <ArrowUpCircle className="w-6 h-6" /> : 
                     event.type === 'supplier_visit' ? <Truck className="w-6 h-6" /> : 
                     event.type === 'supplier_debt' ? <AlertCircle className="w-6 h-6" /> : 
                     <CalendarIcon className="w-6 h-6" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className={`text-sm font-black uppercase tracking-tight ${event.status === 'completed' ? "text-slate-300 line-through" : "text-slate-900"}`}>
                        {event.title}
                      </h4>
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">
                        {format(event.date && event.date.seconds ? new Date(event.date.seconds * 1000) : new Date(event.date), "HH:mm")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                       {event.amount > 0 && (
                         <span className="text-[10px] font-black text-slate-400 mono-display">
                           {formatCurrency(event.amount)}
                         </span>
                       )}
                       <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                         event.status === 'completed' ? "bg-slate-100 text-slate-400" : "bg-emerald-50 text-emerald-600"
                       }`}>
                         {event.status === 'completed' ? "Concluído" : "Pendente"}
                       </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => updateEvent(event.id, { status: event.status === 'completed' ? 'pending' : 'completed' })}
                    className={`p-2 rounded-xl transition-all ${event.status === 'completed' ? "text-green-500 bg-green-50" : "text-slate-300 hover:text-green-500 hover:bg-green-50"}`}
                  >
                    <CheckCircle2 className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => deleteEvent(event.id)}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Add Event Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-slate-950/80"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-[3rem] p-8 shadow-2xl space-y-6"
            >
              <div className="flex items-center gap-3">
                 <div className="p-3 bg-emerald-600 rounded-2xl">
                    <Plus className="w-5 h-5 text-white" />
                 </div>
                 <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Novo Agendamento</h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Motivo / Título</label>
                  <input 
                    type="text"
                    placeholder="Ex: Ir em Madureira, Compras..."
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-800 focus:border-emerald-500 outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Data</label>
                    <input 
                      type="date"
                      value={format(selectedDate, "yyyy-MM-dd")}
                      onChange={(e) => {
                        const d = new Date(e.target.value);
                        if (!isNaN(d.getTime())) setSelectedDate(d);
                      }}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-4 font-bold text-slate-800 focus:border-emerald-500 outline-none transition-all text-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Hora</label>
                    <input 
                      type="time"
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-4 font-bold text-slate-800 focus:border-emerald-500 outline-none transition-all text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Valor (opcional)</label>
                  <input 
                    type="number"
                    placeholder="0.00"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-800 focus:border-emerald-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Tipo</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'shopping', label: 'Compras', icon: <ShoppingBag className="w-3 h-3" /> },
                      { id: 'payment_received', label: 'Receber', icon: <ArrowDownCircle className="w-3 h-3" /> },
                      { id: 'payment_made', label: 'Pagar', icon: <ArrowUpCircle className="w-3 h-3" /> },
                      { id: 'supplier_visit', label: 'Fornecedor', icon: <Truck className="w-3 h-3" /> },
                      { id: 'supplier_debt', label: 'Dívida Forn.', icon: <AlertCircle className="w-3 h-3" /> },
                      { id: 'general', label: 'Outro', icon: <CalendarIcon className="w-3 h-3" /> }
                    ].map(type => (
                      <button
                        key={type.id}
                        onClick={() => setNewType(type.id as any)}
                        className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all font-black text-[9px] uppercase tracking-widest ${newType === type.id ? "bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-500/20" : "bg-white border-slate-100 text-slate-400 hover:border-emerald-200"}`}
                      >
                        {type.icon} {type.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button 
                  onClick={handleAddSubmit}
                  className="w-full bg-emerald-600 text-white rounded-[2rem] py-5 font-black uppercase text-xs tracking-widest shadow-xl shadow-emerald-600/20 active:scale-95 transition-all"
                >
                  Confirmar Agendamento
                </button>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="w-full py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest"
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
