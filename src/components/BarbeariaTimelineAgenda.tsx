/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Componente Visual de Timeline da Agenda de Barbearia & Salão
 * Inspirado exatamente no layout real de agendamento de barbearia (Trinks / AppBarber):
 * 1. Navegador de data: < [ 📅 ter, 13/10/2026 ▾ ] > com filtro
 * 2. Barra horizontal de profissionais com avatares circulares
 * 3. Grade vertical de horários (08:00 às 20:00) com blocos:
 *    - Indisponível (08:00 às 09:00)
 *    - AGENDADO (09:00 às 09:40 - BRUNO VIEIRA DA SILVA - Máquina e Tesoura) [AGENDADO]
 *    - Horário de almoço (12:00 às 14:00)
 *    - Horários Livres (Toque para agendar)
 * 4. Funciona tanto na visão interna (Proprietário/Caixa) quanto na visão pública do Cliente via WhatsApp!
 */

import React, { useState, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
  Plus,
  Clock,
  CheckCircle2,
  Lock,
  MessageCircle,
  Trash2,
  User,
  Scissors,
  Coffee,
  X,
  Phone,
  Sparkles,
  ChevronDown
} from "lucide-react";
import { ProfissionalBarbearia, AgendamentoServico } from "./BarbeariaSalaoEventosModule";

export interface BloqueioHorario {
  id: string;
  horarioInicio: string; // HH:mm
  horarioFim: string; // HH:mm
  motivo: string; // "Indisponível", "Horário de almoço", etc.
  tipo: "indisponivel" | "almoco" | "pausa";
  profissionalId?: string; // se vazio, vale para todos
}

interface BarbeariaTimelineAgendaProps {
  profissionais: ProfissionalBarbearia[];
  agendamentos: AgendamentoServico[];
  onAddAgendamento: (ag: AgendamentoServico) => void;
  onUpdateAgendamento?: (ag: AgendamentoServico) => void;
  onDeleteAgendamento?: (id: string) => void;
  formatCurrency?: (val: number) => string;
  isClientView?: boolean;
  companyPhone?: string;
  companyName?: string;
  allowCaixaAgendar?: boolean;
  isCaixa?: boolean;
  onSelectSlotToBook?: (slot: { data: string; horario: string; profissionalId: string }) => void;
}

// Dias da semana em português abreviado
const DIAS_SEMANA_ABREV = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MESES_ABREV = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

// Bloqueios padrão de intervalo e almoço caso não configurados
const BLOQUEIOS_PADRAO: BloqueioHorario[] = [
  {
    id: "blq_1",
    horarioInicio: "08:00",
    horarioFim: "09:00",
    motivo: "Indisponível",
    tipo: "indisponivel"
  },
  {
    id: "blq_2",
    horarioInicio: "12:00",
    horarioFim: "14:00",
    motivo: "Horário de almoço",
    tipo: "almoco"
  }
];

// Grade de horários padrão de 30 em 30 minutos (08:00 às 20:00)
const SLOTS_HORARIOS = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
  "17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00"
];

export const BarbeariaTimelineAgenda: React.FC<BarbeariaTimelineAgendaProps> = ({
  profissionais,
  agendamentos,
  onAddAgendamento,
  onUpdateAgendamento,
  onDeleteAgendamento,
  formatCurrency = (v) => `R$ ${Number(v || 0).toFixed(2).replace(".", ",")}`,
  isClientView = false,
  companyPhone = "(21) 96671-3263",
  companyName = "Barbearia & Salão Cérebro PDV",
  allowCaixaAgendar = true,
  isCaixa = false,
  onSelectSlotToBook
}) => {
  // Data selecionada (padrão hoje)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });

  // Profissional selecionado na barra de avatares (primeiro por padrão ou "todos")
  const [selectedProfId, setSelectedProfId] = useState<string>(() => {
    return profissionais[0]?.id || "todos";
  });

  // Modal para adicionar agendamento rápido ao clicar em horário livre ou no botão (+)
  const [isQuickAddModalOpen, setIsQuickAddModalOpen] = useState(false);
  const [selectedSlotTime, setSelectedSlotTime] = useState("09:00");
  const [quickClientNome, setQuickClientNome] = useState("");
  const [quickClientTelefone, setQuickClientTelefone] = useState("");
  const [quickServico, setQuickServico] = useState("Máquina e Tesoura (Corte)");
  const [quickValor, setQuickValor] = useState("45");
  const [quickDuracaoMin, setQuickDuracaoMin] = useState("40"); // 40 minutos padrão como na foto

  // Modal de detalhes do agendamento ao clicar em um card
  const [selectedAgendamentoDetail, setSelectedAgendamentoDetail] = useState<AgendamentoServico | null>(null);

  // Formatação de data amigável: "ter, 13/10/2026"
  const formattedDateLabel = useMemo(() => {
    try {
      const [ano, mes, dia] = selectedDate.split("-").map(Number);
      const dataObj = new Date(ano, mes - 1, dia, 12, 0, 0);
      const diaSemana = DIAS_SEMANA_ABREV[dataObj.getDay()];
      const diaStr = String(dia).padStart(2, "0");
      const mesStr = String(mes).padStart(2, "0");
      return `${diaSemana}, ${diaStr}/${mesStr}/${ano}`;
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  // Avançar / retroceder dia
  const handleNavDay = (direction: -1 | 1) => {
    try {
      const [ano, mes, dia] = selectedDate.split("-").map(Number);
      const dataObj = new Date(ano, mes - 1, dia, 12, 0, 0);
      dataObj.setDate(dataObj.getDate() + direction);
      const novoAno = dataObj.getFullYear();
      const novoMes = String(dataObj.getMonth() + 1).padStart(2, "0");
      const novoDia = String(dataObj.getDate()).padStart(2, "0");
      setSelectedDate(`${novoAno}-${novoMes}-${novoDia}`);
    } catch {}
  };

  // Profissional ativo
  const activeProf = useMemo(() => {
    return profissionais.find((p) => p.id === selectedProfId) || profissionais[0];
  }, [profissionais, selectedProfId]);

  // Filtrar agendamentos do dia selecionado e do profissional ativo
  const agendamentosDoDia = useMemo(() => {
    return agendamentos.filter((ag) => {
      const matchDate = ag.data === selectedDate;
      if (!matchDate) return false;
      if (selectedProfId === "todos") return true;
      return ag.profissionalId === selectedProfId;
    });
  }, [agendamentos, selectedDate, selectedProfId]);

  // Calcular horário de fim baseado no início e duração
  const calculateEndTime = (startTime: string, minutesToAdd: number = 40): string => {
    try {
      const [h, m] = startTime.split(":").map(Number);
      const totalMin = h * 60 + m + minutesToAdd;
      const endH = Math.floor(totalMin / 60) % 24;
      const endM = totalMin % 60;
      return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
    } catch {
      return startTime;
    }
  };

  // Abrir agendamento em horário livre
  const handleSlotClick = (slotTime: string) => {
    if (isClientView && onSelectSlotToBook) {
      onSelectSlotToBook({
        data: selectedDate,
        horario: slotTime,
        profissionalId: activeProf?.id || profissionais[0]?.id || ""
      });
      return;
    }

    if (isCaixa && !allowCaixaAgendar) {
      alert("Aviso: O caixa não tem permissão para marcar novos horários na agenda.");
      return;
    }

    setSelectedSlotTime(slotTime);
    setIsQuickAddModalOpen(true);
  };

  // Salvar agendamento rápido
  const handleSaveQuickAgendamento = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickClientNome.trim()) {
      alert("Por favor, digite o nome do cliente.");
      return;
    }

    const duracaoNum = Number(quickDuracaoMin) || 40;
    const horarioFim = calculateEndTime(selectedSlotTime, duracaoNum);

    const novoAg: AgendamentoServico = {
      id: "ag_" + Date.now(),
      data: selectedDate,
      horario: selectedSlotTime,
      horarioFim,
      clienteNome: quickClientNome.trim(),
      clienteTelefone: quickClientTelefone.trim() || (isClientView ? "" : "21999998888"),
      profissionalId: activeProf?.id || "prof_1",
      profissionalNome: activeProf?.nome || "Profissional",
      servico: quickServico.trim(),
      valor: Number(quickValor) || 45,
      status: "agendado",
      criadoEm: new Date().toISOString()
    };

    onAddAgendamento(novoAg);
    setIsQuickAddModalOpen(false);
    setQuickClientNome("");
    setQuickClientTelefone("");

    if (isClientView) {
      // Abre WhatsApp direto para confirmar
      const cleanCompanyPhone = companyPhone.replace(/\D/g, "");
      const dataFormatada = selectedDate.split("-").reverse().join("/");
      const msg = encodeURIComponent(
        `Olá! 💈✂️ Gostaria de confirmar meu agendamento na *${companyName}*:\n\n` +
        `📅 *Data:* ${dataFormatada}\n` +
        `⏰ *Horário:* ${selectedSlotTime} às ${horarioFim}\n` +
        `👤 *Profissional:* ${activeProf?.nome || "Equipe"}\n` +
        `✂️ *Serviço:* ${quickServico}\n` +
        `💰 *Valor Estimado:* ${formatCurrency(Number(quickValor) || 45)}\n\n` +
        `*Cliente:* ${quickClientNome.trim()}\n` +
        `*WhatsApp:* ${quickClientTelefone.trim() || "Mesmo deste número"}\n\n` +
        `Poderia confirmar minha vaga? Obrigado(a)!`
      );
      const waUrl = cleanCompanyPhone
        ? `https://wa.me/55${cleanCompanyPhone}?text=${msg}`
        : `https://wa.me/?text=${msg}`;
      window.open(waUrl, "_blank");
    }
  };

  // Enviar lembrete no WhatsApp
  const handleSendWhatsAppReminder = (ag: AgendamentoServico) => {
    const cleanPhone = (ag.clienteTelefone || "").replace(/\D/g, "");
    const dataFormatada = ag.data.split("-").reverse().join("/");
    const horaFimStr = ag.horarioFim ? ` às ${ag.horarioFim}` : "";
    const msg = encodeURIComponent(
      `Olá, *${ag.clienteNome}*! 💈✂️\n\n` +
      `Lembramos do seu agendamento na *${companyName}*:\n` +
      `📅 *Dia:* ${dataFormatada}\n` +
      `⏰ *Horário:* ${ag.horario}${horaFimStr}\n` +
      `👤 *Profissional:* ${ag.profissionalNome}\n` +
      `✂️ *Serviço:* ${ag.servico}\n\n` +
      `Estamos te esperando! Caso precise reagendar, avise-nos com antecedência.`
    );
    const waUrl = cleanPhone
      ? `https://wa.me/55${cleanPhone}?text=${msg}`
      : `https://wa.me/?text=${msg}`;
    window.open(waUrl, "_blank");
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-slate-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl font-sans text-left">
      {/* 1. CABEÇALHO DO APLICATIVO (EXATAMENTE COMO NA FOTO) */}
      <div className="bg-slate-950 px-5 py-4 border-b border-white/10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400">
            <CalendarIcon className="w-4 h-4 text-amber-400" />
          </div>
          <h2 className="text-white font-black text-lg tracking-tight">
            Agenda
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {isClientView && (
            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase px-2.5 py-1 rounded-full">
              Visão dos Clientes
            </span>
          )}
          <div className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-xs font-bold">
            <User className="w-3.5 h-3.5 text-slate-300" />
          </div>
        </div>
      </div>

      {/* 2. NAVEGADOR DE DATA: < [ 📅 ter, 13/10/2026 ▾ ] > E BOTÃO FILTRO */}
      <div className="bg-slate-900 px-4 py-3 border-b border-white/5 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => handleNavDay(-1)}
          className="w-9 h-9 rounded-xl bg-slate-950 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          title="Dia Anterior"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Input / Botão de Seleção da Data */}
        <div className="relative flex-1 max-w-xs">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
          />
          <div className="bg-slate-950 hover:bg-slate-800/80 border border-white/10 text-white rounded-xl py-2 px-3 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-inner">
            <CalendarIcon className="w-3.5 h-3.5 text-amber-400" />
            <span>{formattedDateLabel}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </div>
        </div>

        <button
          type="button"
          onClick={() => handleNavDay(1)}
          className="w-9 h-9 rounded-xl bg-slate-950 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          title="Próximo Dia"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={() => {
            setSelectedDate(new Date().toISOString().slice(0, 10));
          }}
          className="w-9 h-9 rounded-xl bg-slate-950 hover:bg-slate-800 border border-white/10 text-amber-400 flex items-center justify-center transition-all cursor-pointer"
          title="Voltar para Hoje"
        >
          <Filter className="w-4 h-4" />
        </button>
      </div>

      {/* 3. BARRA HORIZONTAL DE PROFISSIONAIS (AVATARES CIRCULARES) */}
      <div className="bg-slate-950/60 px-4 py-3 border-b border-white/5 overflow-x-auto custom-scrollbar flex items-center gap-3">
        {profissionais.map((prof) => {
          const isSelected = selectedProfId === prof.id;
          return (
            <button
              key={prof.id}
              type="button"
              onClick={() => setSelectedProfId(prof.id)}
              className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-all cursor-pointer min-w-[76px] ${
                isSelected
                  ? "bg-amber-500/20 border-2 border-amber-400 shadow-md shadow-amber-500/10 scale-105"
                  : "bg-slate-900 border border-white/5 opacity-70 hover:opacity-100"
              }`}
            >
              <img
                src={prof.fotoUrl}
                alt={prof.nome}
                className="w-12 h-12 rounded-full object-cover border-2 border-amber-500/40 shadow"
              />
              <span className={`text-[11px] font-black truncate max-w-[70px] ${
                isSelected ? "text-amber-300 font-bold" : "text-slate-300"
              }`}>
                {prof.apelido || prof.nome.split(" ")[0]}
              </span>
            </button>
          );
        })}

        {/* Opção Ver Todos */}
        {profissionais.length > 1 && (
          <button
            type="button"
            onClick={() => setSelectedProfId("todos")}
            className={`flex flex-col items-center justify-center gap-1.5 p-2 rounded-2xl transition-all cursor-pointer min-w-[76px] ${
              selectedProfId === "todos"
                ? "bg-amber-500/20 border-2 border-amber-400 text-amber-300 scale-105 shadow"
                : "bg-slate-900 border border-white/5 text-slate-400 hover:text-white opacity-70"
            }`}
          >
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center border border-white/10">
              <User className="w-5 h-5 text-slate-300" />
            </div>
            <span className="text-[11px] font-black">Todos</span>
          </button>
        )}
      </div>

      {/* 4. GRADE VERTICAL DA AGENDA DE HORÁRIOS (TIMELINE DA FOTO) */}
      <div className="p-3 sm:p-5 space-y-1 bg-slate-950/40 min-h-[480px]">
        {SLOTS_HORARIOS.map((slotHora) => {
          // Verificar se há agendamento para este horário ou que cobre este horário
          const agendamentoDoSlot = agendamentosDoDia.find((ag) => {
            if (ag.horario === slotHora) return true;
            // Se tiver duração/horarioFim
            if (ag.horarioFim && slotHora > ag.horario && slotHora < ag.horarioFim) {
              return true;
            }
            return false;
          });

          // Verificar se é início de um agendamento
          const isInicioAgendamento = agendamentoDoSlot && agendamentoDoSlot.horario === slotHora;

          // Se estiver no meio de um agendamento longo, já é desenhado pelo bloco principal
          if (agendamentoDoSlot && !isInicioAgendamento) {
            return null;
          }

          // Verificar se há bloqueio fixo (ex: 08:00 Indisponível ou 12:00 Almoço)
          const bloqueio = BLOQUEIOS_PADRAO.find((b) => b.horarioInicio === slotHora);

          return (
            <div key={slotHora} className="flex items-start gap-2.5 sm:gap-4 py-1 group">
              {/* Coluna da esquerda: Marcador de Hora (ex: 08:00, 08:30) */}
              <div className="w-12 sm:w-14 text-right pt-2 shrink-0">
                <span className="text-xs font-mono font-bold text-slate-500 group-hover:text-slate-300 transition-colors">
                  {slotHora}
                </span>
              </div>

              {/* Coluna da direita: Conteúdo do Slot */}
              <div className="flex-1 min-w-0">
                {/* CASO 1: HORÁRIO COM AGENDAMENTO (CARD AZUL CLARO COM BADGE "AGENDADO" DA FOTO) */}
                {isInicioAgendamento && agendamentoDoSlot ? (
                  <div
                    onClick={() => setSelectedAgendamentoDetail(agendamentoDoSlot)}
                    className="bg-blue-600/15 hover:bg-blue-600/25 border-2 border-blue-500/50 rounded-2xl p-3 sm:p-3.5 transition-all shadow-md cursor-pointer text-left space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-mono font-black text-blue-300">
                        {agendamentoDoSlot.horario} às {agendamentoDoSlot.horarioFim || calculateEndTime(agendamentoDoSlot.horario, 40)}
                      </span>

                      {/* BADGE "AGENDADO" DA FOTO */}
                      <span className="bg-blue-500 text-white font-black text-[9px] uppercase px-2 py-0.5 rounded-full tracking-wider shadow-sm">
                        AGENDADO
                      </span>
                    </div>

                    <div className="text-xs font-black text-white uppercase tracking-tight truncate">
                      {isClientView ? (
                        /* Na visão do cliente protege o nome completo por privacidade */
                        <span>
                          {agendamentoDoSlot.clienteNome.split(" ")[0]} • {agendamentoDoSlot.servico}
                        </span>
                      ) : (
                        <span>
                          {agendamentoDoSlot.clienteNome} - {agendamentoDoSlot.servico}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-blue-200/80 pt-0.5">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-blue-400" />
                        <span>{agendamentoDoSlot.profissionalNome}</span>
                      </span>
                      {!isClientView && (
                        <span className="font-mono font-bold text-emerald-400">
                          {formatCurrency(agendamentoDoSlot.valor)}
                        </span>
                      )}
                    </div>
                  </div>
                ) : bloqueio ? (
                  /* CASO 2: BLOQUEIO FIXO (INDISPONÍVEL / ALMOÇO COMO NA FOTO) */
                  <div className="bg-slate-900/90 border border-white/5 rounded-2xl p-3 text-slate-400 space-y-0.5">
                    <span className="text-[11px] font-mono font-bold text-slate-500 block">
                      {bloqueio.horarioInicio} às {bloqueio.horarioFim}
                    </span>
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      {bloqueio.tipo === "almoco" ? (
                        <Coffee className="w-3.5 h-3.5 text-amber-400" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                      )}
                      <span>{bloqueio.motivo}</span>
                    </span>
                  </div>
                ) : (
                  /* CASO 3: HORÁRIO LIVRE (TOQUE PARA MARCAR) */
                  <div
                    onClick={() => handleSlotClick(slotHora)}
                    className="border border-dashed border-white/10 hover:border-emerald-500/50 bg-slate-900/30 hover:bg-emerald-500/10 rounded-2xl p-2.5 sm:p-3 transition-all cursor-pointer flex items-center justify-between group/slot"
                  >
                    <span className="text-xs font-bold text-slate-500 group-hover/slot:text-emerald-400 flex items-center gap-1.5 transition-colors">
                      <Plus className="w-3.5 h-3.5 text-slate-500 group-hover/slot:text-emerald-400" />
                      <span>Horário Disponível (Livre)</span>
                    </span>

                    <span className="text-[10px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md opacity-80 group-hover/slot:opacity-100 transition-opacity">
                      {isClientView ? "Marcar Aqui ✂️" : "Agendar"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* BOTÃO FLUTUANTE (+) NO CANTO INFERIOR (COMO NA FOTO) */}
      {(!isCaixa || allowCaixaAgendar) && (
        <div className="p-4 bg-slate-950 border-t border-white/10 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-400 font-medium">
            <span className="text-white font-bold">{agendamentosDoDia.length}</span> atendimentos marcados nesta data
          </div>

          <button
            type="button"
            onClick={() => handleSlotClick("14:00")}
            className="w-12 h-12 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/30 active:scale-95 transition-all cursor-pointer"
            title="Marcar Novo Horário"
          >
            <Plus className="w-6 h-6 stroke-[3]" />
          </button>
        </div>
      )}

      {/* MODAL RÁPIDO PARA AGENDAR NO HORÁRIO CLICADO */}
      {isQuickAddModalOpen && (
        <div className="fixed inset-0 z-[10050] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 w-full max-w-md space-y-4 my-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <Scissors className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-white font-black text-sm">
                    {isClientView ? "Confirmar Meu Horário" : "Marcar Agendamento"}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {formattedDateLabel} às {selectedSlotTime}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickAgendamento} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-300">
                  Profissional Selecionado
                </label>
                <div className="flex items-center gap-2.5 bg-slate-950 p-2.5 rounded-xl border border-white/5">
                  <img
                    src={activeProf?.fotoUrl}
                    alt={activeProf?.nome}
                    className="w-10 h-10 rounded-full object-cover border border-amber-500/40"
                  />
                  <div>
                    <strong className="text-white text-xs block">{activeProf?.nome}</strong>
                    <span className="text-[10px] text-amber-400">{activeProf?.especialidade}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-300">
                  Nome do Cliente *
                </label>
                <input
                  type="text"
                  required
                  value={quickClientNome}
                  onChange={(e) => setQuickClientNome(e.target.value)}
                  placeholder="Ex: Bruno Vieira da Silva"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none font-bold focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-300">
                  WhatsApp do Cliente {isClientView ? "*" : "(Opcional)"}
                </label>
                <input
                  type="text"
                  required={isClientView}
                  value={quickClientTelefone}
                  onChange={(e) => setQuickClientTelefone(e.target.value)}
                  placeholder="Ex: (21) 99999-8888"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none font-bold font-mono focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-300">
                    Serviço
                  </label>
                  <input
                    type="text"
                    value={quickServico}
                    onChange={(e) => setQuickServico(e.target.value)}
                    placeholder="Ex: Máquina e Tesoura"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-300">
                    Duração Estimada
                  </label>
                  <select
                    value={quickDuracaoMin}
                    onChange={(e) => setQuickDuracaoMin(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none font-bold"
                  >
                    <option value="30">30 min</option>
                    <option value="40">40 min (padrão)</option>
                    <option value="50">50 min</option>
                    <option value="60">1 hora</option>
                    <option value="90">1h30</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-300">
                  Valor Estimado (R$)
                </label>
                <input
                  type="number"
                  value={quickValor}
                  onChange={(e) => setQuickValor(e.target.value)}
                  placeholder="45"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none font-bold font-mono"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsQuickAddModalOpen(false)}
                  className="flex-1 bg-slate-800 text-slate-300 py-3 rounded-xl font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 py-3 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20"
                >
                  {isClientView ? "Confirmar no WhatsApp 💬" : "Salvar Horário ✅"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE DETALHES DO AGENDAMENTO AO CLICAR EM UM CARD */}
      {selectedAgendamentoDetail && (
        <div className="fixed inset-0 z-[10050] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 w-full max-w-md space-y-4 my-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                  <Scissors className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-white font-black text-sm">
                    Detalhes do Agendamento
                  </h3>
                  <span className="bg-blue-500/20 text-blue-400 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                    {selectedAgendamentoDetail.status}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAgendamentoDetail(null)}
                className="p-1.5 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 bg-slate-950 p-4 rounded-2xl border border-white/5 text-xs">
              <div className="flex justify-between items-center text-slate-400">
                <span>Cliente:</span>
                <strong className="text-white">{selectedAgendamentoDetail.clienteNome}</strong>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Horário:</span>
                <strong className="text-blue-300 font-mono">
                  {selectedAgendamentoDetail.horario} às {selectedAgendamentoDetail.horarioFim || calculateEndTime(selectedAgendamentoDetail.horario, 40)}
                </strong>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Profissional:</span>
                <strong className="text-amber-300">{selectedAgendamentoDetail.profissionalNome}</strong>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Serviço:</span>
                <strong className="text-slate-200">{selectedAgendamentoDetail.servico}</strong>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Valor:</span>
                <strong className="text-emerald-400 font-mono">{formatCurrency(selectedAgendamentoDetail.valor)}</strong>
              </div>
            </div>

            {/* Ações (WhatsApp, Concluir, Excluir) */}
            <div className="flex flex-col gap-2 pt-1">
              {selectedAgendamentoDetail.clienteTelefone && (
                <button
                  type="button"
                  onClick={() => handleSendWhatsAppReminder(selectedAgendamentoDetail)}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 px-3 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 shadow"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Lembrar Cliente no WhatsApp</span>
                </button>
              )}

              {!isClientView && onDeleteAgendamento && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Deseja realmente cancelar este agendamento?")) {
                      onDeleteAgendamento(selectedAgendamentoDetail.id);
                      setSelectedAgendamentoDetail(null);
                    }
                  }}
                  className="w-full bg-slate-800 hover:bg-red-950/60 text-slate-300 hover:text-red-400 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors border border-white/5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Cancelar Agendamento</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
