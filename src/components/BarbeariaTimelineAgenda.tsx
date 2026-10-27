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

import React, { useState, useMemo, useEffect } from "react";
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
  ChevronDown,
  Settings,
  AlertTriangle,
  Megaphone
} from "lucide-react";
import { ProfissionalBarbearia, AgendamentoServico } from "./BarbeariaSalaoEventosModule";
import { ModalConfiguracaoAgendaProfissional } from "./ModalConfiguracaoAgendaProfissional";

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
  onUpdateProfissional?: (prof: ProfissionalBarbearia) => void;
  onOpenComunicados?: () => void;
  showNotification?: (msg: string, type: "success" | "error" | "info") => void;
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
  companyPhone = "",
  companyName = "Nossa Empresa",
  allowCaixaAgendar = true,
  isCaixa = false,
  onSelectSlotToBook,
  onUpdateProfissional,
  onOpenComunicados,
  showNotification = (_msg?: string, _type?: "success" | "error" | "info") => {}
}) => {
  // Data selecionada (padrão hoje)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });

  // Profissional selecionado na barra de avatares (respeita seleção da barra lateral ou primeiro)
  const [selectedProfId, setSelectedProfId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("barbearia_active_prof_filter");
      if (saved && (saved === "todos" || profissionais.some((p) => p.id === saved))) {
        return saved;
      }
    } catch {}
    return profissionais[0]?.id || "todos";
  });

  useEffect(() => {
    const handleProfChange = () => {
      try {
        const saved = localStorage.getItem("barbearia_active_prof_filter");
        if (saved) setSelectedProfId(saved);
      } catch {}
    };
    window.addEventListener("barbearia_prof_filter_changed", handleProfChange);
    return () => window.removeEventListener("barbearia_prof_filter_changed", handleProfChange);
  }, []);

  // Modal de Configuração da Agenda do Profissional
  const [isConfigAgendaModalOpen, setIsConfigAgendaModalOpen] = useState(false);

  // Modal para adicionar agendamento rápido ao clicar em horário livre ou no botão (+)
  const [isQuickAddModalOpen, setIsQuickAddModalOpen] = useState(false);
  const [selectedSlotTime, setSelectedSlotTime] = useState("09:00");
  const [quickClientNome, setQuickClientNome] = useState("");
  const [quickClientTelefone, setQuickClientTelefone] = useState("");
  const [quickServico, setQuickServico] = useState("Máquina e Tesoura (Corte)");
  const [quickValor, setQuickValor] = useState("45");
  const [quickDuracaoMin, setQuickDuracaoMin] = useState("40"); // minutos livres editáveis

  // Modal de detalhes do agendamento ao clicar em um card
  const [selectedAgendamentoDetail, setSelectedAgendamentoDetail] = useState<AgendamentoServico | null>(null);
  const [isEditingAgendamentoTime, setIsEditingAgendamentoTime] = useState(false);
  const [editHorarioInicio, setEditHorarioInicio] = useState("09:00");
  const [editHorarioFim, setEditHorarioFim] = useState("09:40");
  const [editDuracaoMin, setEditDuracaoMin] = useState("40");

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

  // Verificar se o profissional ativo está de folga na data selecionada
  const isDiaDeFolga = useMemo(() => {
    if (!activeProf || !activeProf.diasSemana || activeProf.diasSemana.length === 0) return false;
    try {
      const [ano, mes, dia] = selectedDate.split("-").map(Number);
      const dataObj = new Date(ano, mes - 1, dia, 12, 0, 0);
      const dayOfWeek = dataObj.getDay(); // 0 a 6
      return !activeProf.diasSemana.includes(dayOfWeek);
    } catch {
      return false;
    }
  }, [activeProf, selectedDate]);

  // Manter selectedProfId sincronizado se a lista de profissionais mudar (ex: troca de segmento)
  useEffect(() => {
    if (profissionais.length > 0 && selectedProfId !== "todos") {
      const exists = profissionais.some((p) => p.id === selectedProfId);
      if (!exists) {
        setSelectedProfId(profissionais[0].id);
      }
    }
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

    if (activeProf && activeProf.ativo === false) {
      showNotification(`${activeProf.nome} está marcado como Indisponível / Pausado no momento!`, "error");
      return;
    }

    if (isCaixa && !allowCaixaAgendar) {
      showNotification("Aviso: O caixa não tem permissão para marcar novos horários na agenda.", "error");
      return;
    }

    setSelectedSlotTime(slotTime);
    setIsQuickAddModalOpen(true);
  };

  // Salvar agendamento rápido
  const handleSaveQuickAgendamento = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickClientNome.trim()) {
      showNotification("Por favor, digite o nome do cliente.", "error");
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
      try {
        const link = document.createElement("a");
        link.href = waUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch {
        window.open(waUrl, "_blank");
      }
      showNotification("Agendamento registrado! Abrindo WhatsApp para confirmação... 📲✅", "success");
    }
  };

  // Enviar lembrete no WhatsApp
  const handleSendWhatsAppReminder = (ag: AgendamentoServico) => {
    const cleanPhone = (ag.clienteTelefone || "").replace(/\D/g, "");
    const dataFormatada = ag.data.split("-").reverse().join("/");
    const horaFimStr = ag.horarioFim ? ` às ${ag.horarioFim}` : "";
    const rawMsg =
      `Olá, *${ag.clienteNome}*! 💈✂️\n\n` +
      `Lembramos do seu agendamento na *${companyName}*:\n` +
      `📅 *Dia:* ${dataFormatada}\n` +
      `⏰ *Horário:* ${ag.horario}${horaFimStr}\n` +
      `👤 *Profissional:* ${ag.profissionalNome}\n` +
      `✂️ *Serviço:* ${ag.servico}\n\n` +
      `Estamos te esperando! Caso precise reagendar, avise-nos com antecedência.`;
    const msg = encodeURIComponent(rawMsg);
    const waUrl = cleanPhone
      ? `https://wa.me/55${cleanPhone}?text=${msg}`
      : `https://wa.me/?text=${msg}`;
    try {
      const link = document.createElement("a");
      link.href = waUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      window.open(waUrl, "_blank");
    }
    showNotification("Lembrete enviado para o WhatsApp do cliente! 📲", "success");
  };

  // Lembrete 24h antes
  const handleSendWhatsApp24h = (ag: AgendamentoServico) => {
    const cleanPhone = (ag.clienteTelefone || "").replace(/\D/g, "");
    const dataFormatada = ag.data.split("-").reverse().join("/");
    const horaFimStr = ag.horarioFim ? ` às ${ag.horarioFim}` : "";
    const rawMsg =
      `🏢 *${(companyName || "NOSSO ESTABELECIMENTO").toUpperCase()}*\n` +
      `🔔 *LEMBRETE DE AGENDAMENTO (24H ANTES)*\n\n` +
      `Olá, *${ag.clienteNome}*! Tudo bem?\n` +
      `Passando para lembrar que você tem horário marcado conosco amanhã:\n\n` +
      `📅 *Data:* ${dataFormatada}\n` +
      `⏰ *Horário:* ${ag.horario}${horaFimStr}\n` +
      `👤 *Profissional:* ${ag.profissionalNome}\n` +
      `✂️ *Serviço:* ${ag.servico}\n` +
      `💰 *Valor Estimado:* ${formatCurrency(ag.valor)}\n\n` +
      `Por favor, responda com *SIM* para confirmar que você comparecerá. Estamos ansiosos para te atender! ✨`;
    const msg = encodeURIComponent(rawMsg);
    const waUrl = cleanPhone ? `https://wa.me/55${cleanPhone}?text=${msg}` : `https://wa.me/?text=${msg}`;
    window.open(waUrl, "_blank");
    showNotification("Lembrete 24h enviado para o WhatsApp! 🔔📲", "success");
  };

  // Lembrete 2h antes (Anti-falta)
  const handleSendWhatsApp2hAntiFalta = (ag: AgendamentoServico) => {
    const cleanPhone = (ag.clienteTelefone || "").replace(/\D/g, "");
    const horaFimStr = ag.horarioFim ? ` às ${ag.horarioFim}` : "";
    const rawMsg =
      `🏢 *${(companyName || "NOSSO ESTABELECIMENTO").toUpperCase()}*\n` +
      `⏰ *LEMBRETE IMPORTANTE (FALTAM 2 HORAS!)*\n\n` +
      `Olá, *${ag.clienteNome}*! Faltam apenas 2 horinhas para o seu atendimento hoje às *${ag.horario}*${horaFimStr}!\n\n` +
      `👤 *Profissional:* ${ag.profissionalNome}\n` +
      `✂️ *Serviço:* ${ag.servico}\n\n` +
      `Nosso profissional já está preparando sua bancada com todo carinho. Solicitamos comparecer com 5 a 10 min de tolerância. Caso haja qualquer imprevisto de última hora, nos avise imediatamente por aqui para não travar a agenda. Te esperamos! 💈✨`;
    const msg = encodeURIComponent(rawMsg);
    const waUrl = cleanPhone ? `https://wa.me/55${cleanPhone}?text=${msg}` : `https://wa.me/?text=${msg}`;
    window.open(waUrl, "_blank");
    showNotification("Lembrete anti-falta de 2h enviado! ⏰📲", "success");
  };

  // Confirmar Presença
  const handleConfirmPresence = (ag: AgendamentoServico) => {
    const atualizado: AgendamentoServico = {
      ...ag,
      status: "agendado"
    };
    if (onUpdateAgendamento) onUpdateAgendamento(atualizado);
    const cleanPhone = (ag.clienteTelefone || "").replace(/\D/g, "");
    const dataFormatada = ag.data.split("-").reverse().join("/");
    const rawMsg =
      `🏢 *${(companyName || "NOSSO ESTABELECIMENTO").toUpperCase()}*\n` +
      `✅ *PRESENÇA CONFIRMADA COM SUCESSO!*\n\n` +
      `Olá, *${ag.clienteNome}*! Sua vaga para o dia *${dataFormatada}* às *${ag.horario}* com *${ag.profissionalNome}* está 100% garantida e reservada no nosso sistema!\n\n` +
      `Muito obrigado por confirmar sua presença com pontualidade. Até breve! ✨`;
    const msg = encodeURIComponent(rawMsg);
    const waUrl = cleanPhone ? `https://wa.me/55${cleanPhone}?text=${msg}` : `https://wa.me/?text=${msg}`;
    window.open(waUrl, "_blank");
    showNotification("Presença confirmada e enviada no WhatsApp! ✅", "success");
  };

  // Reagendar com delicadeza
  const handleRescheduleDelicate = (ag: AgendamentoServico) => {
    const cleanPhone = (ag.clienteTelefone || "").replace(/\D/g, "");
    const dataFormatada = ag.data.split("-").reverse().join("/");
    const rawMsg =
      `🏢 *${(companyName || "NOSSO ESTABELECIMENTO").toUpperCase()}*\n` +
      `🔄 *REMARCAÇÃO DE HORÁRIO COM TODA ATENÇÃO*\n\n` +
      `Olá, *${ag.clienteNome}*! Tudo bem? Esperamos que esteja tudo ótimo com você!\n\n` +
      `Devido a uma necessidade de ajuste imprevisto na nossa escala de atendimentos, gostaríamos de verificar com todo carinho a possibilidade de reagendarmos seu horário de *${dataFormatada} às ${ag.horario}* com *${ag.profissionalNome}*.\n\n` +
      `Qual o melhor dia e período para você (manhã, tarde ou noite)? Pedimos sinceras desculpas e garantimos um atendimento especial para você! Muito obrigado(a) pela sua compreensão e parceria! 💛`;
    const msg = encodeURIComponent(rawMsg);
    const waUrl = cleanPhone ? `https://wa.me/55${cleanPhone}?text=${msg}` : `https://wa.me/?text=${msg}`;
    window.open(waUrl, "_blank");
    showNotification("Mensagem delicada de remarcação pronta no WhatsApp! 🔄", "info");
  };

  // Cancelar com delicadeza
  const handleCancelDelicate = (ag: AgendamentoServico) => {
    const cleanPhone = (ag.clienteTelefone || "").replace(/\D/g, "");
    const dataFormatada = ag.data.split("-").reverse().join("/");
    const rawMsg =
      `🏢 *${(companyName || "NOSSO ESTABELECIMENTO").toUpperCase()}*\n` +
      `🤍 *COMUNICADO DE CANCELAMENTO COM RESPEITO E CARINHO*\n\n` +
      `Olá, *${ag.clienteNome}*! Esperamos que esteja bem!\n\n` +
      `Informamos com todo respeito e delicadeza que o seu agendamento previsto para o dia *${dataFormatada} às ${ag.horario}* precisou ser desmarcado em nosso sistema.\n\n` +
      `Lamentamos qualquer transtorno e queremos muito te atender assim que for conveniente para você. Quando desejar remarcar, nossa equipe estará totalmente à disposição!\n\n` +
      `Agradecemos imensamente pelo carinho e compreensão! 🙏✨`;
    const msg = encodeURIComponent(rawMsg);
    const waUrl = cleanPhone ? `https://wa.me/55${cleanPhone}?text=${msg}` : `https://wa.me/?text=${msg}`;
    window.open(waUrl, "_blank");
    showNotification("Mensagem respeitosa de cancelamento enviada! 🤍", "info");
  };

  // Notificar Profissional
  const handleNotifyProfessional = (ag: AgendamentoServico) => {
    const prof = profissionais.find((p) => p.id === ag.profissionalId);
    const cleanProfPhone = (prof?.telefone || "").replace(/\D/g, "");
    const dataFormatada = ag.data.split("-").reverse().join("/");
    const rawMsg =
      `🚨 *AVISO DE ATENDIMENTO MARCADO NA AGENDA!*\n\n` +
      `Olá, *${ag.profissionalNome}*! Fique atento(a) para organizar sua bancada e não haver atrasos:\n\n` +
      `📅 *Data:* ${dataFormatada}\n` +
      `⏰ *Horário:* ${ag.horario} ${ag.horarioFim ? `às ${ag.horarioFim}` : ""}\n` +
      `👤 *Cliente:* ${ag.clienteNome} (${ag.clienteTelefone || "Sem telefone"})\n` +
      `✂️ *Serviço:* ${ag.servico}\n` +
      `💰 *Valor:* ${formatCurrency(ag.valor)}\n\n` +
      `Mantenha sua pontualidade para encantar o cliente! Bom trabalho! 🔥`;
    const msg = encodeURIComponent(rawMsg);
    const waUrl = cleanProfPhone ? `https://wa.me/55${cleanProfPhone}?text=${msg}` : `https://wa.me/?text=${msg}`;
    window.open(waUrl, "_blank");
    showNotification(`Aviso enviado para o WhatsApp de ${ag.profissionalNome}! 📲`, "success");
  };

  // Slots dinâmicos cobrindo o horário integral de trabalho do profissional
  const dynamicTimelineSlots = useMemo(() => {
    const profIni = activeProf?.horaInicio || "08:00";
    const profFim = activeProf?.horaFim || "20:00";
    const hIni = parseInt(profIni.split(":")[0], 10) || 8;
    const hFim = parseInt(profFim.split(":")[0], 10) || 20;
    const minH = Math.min(Math.max(0, hIni - 1), 8);
    const maxH = Math.max(Math.min(23, hFim + 1), 20);

    const slots: string[] = [];
    for (let h = minH; h <= maxH; h++) {
      const hStr = String(h).padStart(2, "0");
      slots.push(`${hStr}:00`);
      slots.push(`${hStr}:30`);
    }
    return slots;
  }, [activeProf]);

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
          {onOpenComunicados && !isClientView && (
            <button
              type="button"
              onClick={onOpenComunicados}
              className="bg-amber-500/20 hover:bg-amber-500/30 active:scale-95 text-amber-300 border border-amber-500/40 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              title="Abrir Comunicados & Lembretes da Agenda para WhatsApp"
            >
              <Megaphone className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Comunicados WhatsApp 📢</span>
              <span className="sm:hidden">Avisos 📢</span>
            </button>
          )}
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

        {/* Botão de Configurar Horários e Folgas da Agenda */}
        {!isClientView && onUpdateProfissional && activeProf && (
          <button
            type="button"
            onClick={() => setIsConfigAgendaModalOpen(true)}
            className="flex flex-col items-center justify-center gap-1.5 p-2 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-500/60 text-amber-300 transition-all cursor-pointer min-w-[82px] shrink-0"
            title={`Configurar horário de abertura, almoço e folgas de ${activeProf.nome}`}
          >
            <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center border border-amber-500/40 shadow">
              <Settings className="w-5 h-5 text-amber-400" />
            </div>
            <span className="text-[10px] font-black uppercase text-amber-300">
              ⚙️ Horários
            </span>
          </button>
        )}
      </div>

      {/* ALERTA DE FOLGA CASO O PROFISSIONAL NÃO ATENDA NESTE DIA */}
      {isDiaDeFolga && (
        <div className="m-3 sm:m-4 p-3.5 bg-red-950/40 border border-red-500/30 rounded-2xl flex items-center justify-between gap-3 text-xs text-red-200 shadow-md">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <div>
              <span className="font-black text-white">{activeProf?.nome}</span> está de folga hoje ({formattedDateLabel}).
            </div>
          </div>
          {!isClientView && onUpdateProfissional && (
            <button
              type="button"
              onClick={() => setIsConfigAgendaModalOpen(true)}
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-[10px] font-black uppercase tracking-wider shrink-0 cursor-pointer"
            >
              Ajustar Folgas
            </button>
          )}
        </div>
      )}

      {/* 4. GRADE VERTICAL DA AGENDA DE HORÁRIOS (TIMELINE DA FOTO) */}
      <div className="p-3 sm:p-5 space-y-1 bg-slate-950/40 min-h-[480px]">
        {dynamicTimelineSlots.map((slotHora) => {
          // 1. Verificar se há agendamento para este horário ou que cobre este horário
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

          // 1B. Se o profissional estiver desativado / em pausa, todos os slots ficam indisponíveis
          if (activeProf && activeProf.ativo === false) {
            return (
              <div key={slotHora} className="flex items-start gap-2.5 sm:gap-4 py-1 group">
                <div className="w-12 sm:w-14 text-right pt-2 shrink-0">
                  <span className="text-xs font-mono font-bold text-slate-600">{slotHora}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="bg-red-950/20 border border-red-500/20 rounded-2xl p-2.5 sm:p-3 text-red-300 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-bold">
                      <Lock className="w-3.5 h-3.5 text-red-400" />
                      <span>⛔ Profissional Indisponível (Pausado para agendamentos)</span>
                    </span>
                    <span className="text-[10px] text-red-400 font-mono font-bold uppercase bg-red-500/10 px-2 py-0.5 rounded-full">
                      Pausa
                    </span>
                  </div>
                </div>
              </div>
            );
          }

          // 2. Se o profissional estiver de folga hoje, todos os slots ficam bloqueados
          if (isDiaDeFolga) {
            return (
              <div key={slotHora} className="flex items-start gap-2.5 sm:gap-4 py-1 group">
                <div className="w-12 sm:w-14 text-right pt-2 shrink-0">
                  <span className="text-xs font-mono font-bold text-slate-600">{slotHora}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-2.5 sm:p-3 text-slate-500 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-bold">
                      <Lock className="w-3.5 h-3.5 text-slate-500" />
                      <span>⛔ Folga / Não Atende neste dia</span>
                    </span>
                    <span className="text-[10px] text-slate-600 font-mono">Indisponível</span>
                  </div>
                </div>
              </div>
            );
          }

          // 3. Verificar horário de abertura da agenda (horaInicio)
          const profHoraInicio = activeProf?.horaInicio || "08:00";
          const isAntesAbertura = slotHora < profHoraInicio;

          // 4. Verificar horário de fechamento da agenda (horaFim)
          const profHoraFim = activeProf?.horaFim || "20:00";
          const isAposFechamento = slotHora >= profHoraFim;

          // 5. Verificar intervalo de almoço
          const lunchStart = activeProf?.intervaloInicio;
          const lunchEnd = activeProf?.intervaloFim;
          const isAlmoco = lunchStart && lunchEnd && lunchStart < lunchEnd && slotHora >= lunchStart && slotHora < lunchEnd;

          // 6. Verificar bloqueios personalizados (Horários Reservados / Indisponíveis)
          const customBlock = activeProf?.bloqueiosPersonalizados?.find((b) => {
            const matchDate = !b.data || b.data === selectedDate;
            if (!matchDate) return false;
            if (b.horarioInicio === b.horarioFim) {
              return slotHora === b.horarioInicio;
            }
            return slotHora >= b.horarioInicio && slotHora < b.horarioFim;
          });

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
                ) : isAntesAbertura ? (
                  /* CASO 2A: ANTES DO HORÁRIO DE ABERTURA */
                  <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-2.5 sm:p-3 text-slate-500 space-y-0.5 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-slate-500" />
                      <span>⛔ Indisponível (Abre às {profHoraInicio})</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">Antes da Abertura</span>
                  </div>
                ) : isAposFechamento ? (
                  /* CASO 2B: APÓS O HORÁRIO DE FECHAMENTO */
                  <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-2.5 sm:p-3 text-slate-500 space-y-0.5 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-slate-500" />
                      <span>⛔ Indisponível (Fecha às {profHoraFim})</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">Fechado</span>
                  </div>
                ) : isAlmoco ? (
                  /* CASO 2C: HORÁRIO DE ALMOÇO DO PROFISSIONAL */
                  <div className="bg-amber-950/20 border border-amber-500/20 rounded-2xl p-3 text-amber-200/80 space-y-0.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Coffee className="w-4 h-4 text-amber-400 shrink-0" />
                      <div>
                        <span className="text-xs font-black text-amber-300 block">
                          {activeProf?.intervaloMotivo || "Horário de Almoço"}
                        </span>
                        <span className="text-[10px] font-mono text-amber-400/70">
                          {lunchStart} às {lunchEnd}
                        </span>
                      </div>
                    </div>
                    <span className="text-[9px] font-black uppercase bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded-full">
                      Pausa
                    </span>
                  </div>
                ) : customBlock ? (
                  /* CASO 2D: BLOQUEIO PERSONALIZADO / HORÁRIO RESERVADO */
                  <div className="bg-purple-950/20 border border-purple-500/20 rounded-2xl p-3 text-purple-200/80 space-y-0.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-purple-400 shrink-0" />
                      <div>
                        <span className="text-xs font-black text-purple-300 block">
                          🔒 {customBlock.motivo || "Horário Reservado"}
                        </span>
                        <span className="text-[10px] font-mono text-purple-400/70">
                          {customBlock.horarioInicio} às {customBlock.horarioFim}
                        </span>
                      </div>
                    </div>
                    <span className="text-[9px] font-black uppercase bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2 py-0.5 rounded-full">
                      Indisponível
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

                <div className="space-y-1.5 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase text-cyan-300 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>Quanto Tempo Para Este Cliente? (Duração Livre)</span>
                    </label>
                    <span className="text-[10px] text-cyan-400 font-mono font-bold">
                      {selectedSlotTime} às {calculateEndTime(selectedSlotTime, Number(quickDuracaoMin) || 40)} ({quickDuracaoMin} min)
                    </span>
                  </div>

                  {/* Presets Rápidos */}
                  <div className="flex flex-wrap gap-1">
                    {[15, 20, 30, 40, 45, 50, 60, 75, 90, 120].map((min) => (
                      <button
                        key={min}
                        type="button"
                        onClick={() => setQuickDuracaoMin(String(min))}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                          Number(quickDuracaoMin) === min
                            ? "bg-cyan-500 text-slate-950 font-black shadow"
                            : "bg-slate-900 text-slate-400 hover:text-white border border-white/5"
                        }`}
                      >
                        {min}m
                      </button>
                    ))}
                  </div>

                  {/* Input livre de minutos */}
                  <div className="flex items-center gap-2 pt-0.5">
                    <input
                      type="number"
                      min="5"
                      max="480"
                      value={quickDuracaoMin}
                      onChange={(e) => setQuickDuracaoMin(e.target.value)}
                      placeholder="40"
                      className="w-20 bg-slate-950 border border-cyan-500/40 rounded-xl px-2.5 py-1 text-xs text-cyan-300 font-bold font-mono outline-none text-center"
                    />
                    <span className="text-[10px] text-slate-400 font-bold">minutos livres (o profissional define quanto tempo quiser)</span>
                  </div>
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
                  className="flex-1 bg-slate-800 text-slate-300 py-3 rounded-xl font-bold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 py-3 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 cursor-pointer"
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
                onClick={() => {
                  setSelectedAgendamentoDetail(null);
                  setIsEditingAgendamentoTime(false);
                }}
                className="p-1.5 text-slate-400 hover:text-white cursor-pointer"
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

            {/* SEÇÃO LIVRE: EDITAR QUANTO TEMPO PARA ESTE CLIENTE */}
            {!isClientView && (
              <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-cyan-500/20 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase text-cyan-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Tempo Livre Deste Atendimento</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingAgendamentoTime(!isEditingAgendamentoTime);
                      setEditHorarioInicio(selectedAgendamentoDetail.horario);
                      setEditHorarioFim(selectedAgendamentoDetail.horarioFim || calculateEndTime(selectedAgendamentoDetail.horario, 40));
                    }}
                    className="text-[10px] font-black uppercase px-2 py-0.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-all cursor-pointer"
                  >
                    {isEditingAgendamentoTime ? "Fechar Edição 🔼" : "Editar Duração ⏱️"}
                  </button>
                </div>

                {isEditingAgendamentoTime && (
                  <div className="space-y-2 pt-1 border-t border-white/5">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] font-bold text-slate-400">Hora Início:</label>
                        <input
                          type="time"
                          value={editHorarioInicio}
                          onChange={(e) => {
                            setEditHorarioInicio(e.target.value);
                            setEditHorarioFim(calculateEndTime(e.target.value, Number(editDuracaoMin) || 40));
                          }}
                          className="w-full bg-slate-900 border border-white/10 rounded-xl px-2 py-1.5 text-xs text-white font-mono font-bold outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400">Hora Término:</label>
                        <input
                          type="time"
                          value={editHorarioFim}
                          onChange={(e) => setEditHorarioFim(e.target.value)}
                          className="w-full bg-slate-900 border border-white/10 rounded-xl px-2 py-1.5 text-xs text-white font-mono font-bold outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] font-bold text-slate-400 block mb-1">
                        Ajustar Duração Rápida:
                      </label>
                      <div className="flex flex-wrap gap-1">
                        {[15, 20, 30, 40, 45, 50, 60, 75, 90, 120].map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => {
                              setEditDuracaoMin(String(m));
                              setEditHorarioFim(calculateEndTime(editHorarioInicio, m));
                            }}
                            className={`px-2 py-0.5 rounded-lg text-[9px] font-black cursor-pointer ${
                              Number(editDuracaoMin) === m
                                ? "bg-cyan-500 text-slate-950"
                                : "bg-slate-900 text-slate-400 hover:text-white border border-white/5"
                            }`}
                          >
                            {m}m
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="number"
                        min="5"
                        max="480"
                        value={editDuracaoMin}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditDuracaoMin(val);
                          setEditHorarioFim(calculateEndTime(editHorarioInicio, Number(val) || 40));
                        }}
                        placeholder="Minutos"
                        className="w-20 bg-slate-900 border border-cyan-500/30 rounded-xl px-2 py-1 text-xs text-cyan-300 font-mono font-bold outline-none text-center"
                      />
                      <span className="text-[10px] text-slate-400 font-bold">minutos livres</span>

                      <button
                        type="button"
                        onClick={() => {
                          const duracaoNum = Number(editDuracaoMin) || 40;
                          const fimCalculado = editHorarioFim || calculateEndTime(editHorarioInicio, duracaoNum);
                          const atualizado: AgendamentoServico = {
                            ...selectedAgendamentoDetail,
                            horario: editHorarioInicio,
                            horarioFim: fimCalculado,
                            duracaoMinutos: duracaoNum
                          };
                          if (onUpdateAgendamento) {
                            onUpdateAgendamento(atualizado);
                          } else {
                            onAddAgendamento(atualizado);
                          }
                          setSelectedAgendamentoDetail(atualizado);
                          setIsEditingAgendamentoTime(false);
                          showNotification("Tempo e horário do cliente alterados com sucesso! ⏱️✅", "success");
                        }}
                        className="ml-auto px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-black uppercase rounded-xl transition-all shadow cursor-pointer"
                      >
                        Salvar Tempo ✅
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Ações Inteligentes de WhatsApp & Gestão de Horários */}
            <div className="space-y-2 pt-1 border-t border-white/5">
              <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider block">
                📲 Ações e Lembretes Automáticos no WhatsApp:
              </span>

              {selectedAgendamentoDetail.clienteTelefone ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSendWhatsApp24h(selectedAgendamentoDetail)}
                    className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white py-2 px-3 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-1.5 shadow transition-all cursor-pointer"
                    title="Enviar lembrete 24 horas antes do horário"
                  >
                    <span>🔔 Lembrete 24h</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSendWhatsApp2hAntiFalta(selectedAgendamentoDetail)}
                    className="bg-amber-600 hover:bg-amber-500 active:scale-95 text-white py-2 px-3 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-1.5 shadow transition-all cursor-pointer"
                    title="Lembrete 2 horas antes para evitar no-show / faltas"
                  >
                    <span>⏰ Lembrete 2h (Anti-Falta)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleConfirmPresence(selectedAgendamentoDetail)}
                    className="bg-blue-600 hover:bg-blue-500 active:scale-95 text-white py-2 px-3 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-1.5 shadow transition-all cursor-pointer"
                    title="Confirmar presença e enviar comprovante"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Confirmar Presença</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRescheduleDelicate(selectedAgendamentoDetail)}
                    className="bg-purple-600 hover:bg-purple-500 active:scale-95 text-white py-2 px-3 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-1.5 shadow transition-all cursor-pointer"
                    title="Enviar mensagem profissional e carinhosa para reagendamento"
                  >
                    <span>🔄 Remarcar com Carinho</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCancelDelicate(selectedAgendamentoDetail)}
                    className="bg-slate-800 hover:bg-slate-700 active:scale-95 text-rose-300 py-2 px-3 rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-1.5 border border-rose-500/30 transition-all cursor-pointer"
                    title="Mensagem de cancelamento delicada e respeitosa"
                  >
                    <span>🤍 Cancelar Educado</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleNotifyProfessional(selectedAgendamentoDetail)}
                    className="bg-slate-800 hover:bg-slate-700 active:scale-95 text-amber-300 py-2 px-3 rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-1.5 border border-amber-500/30 transition-all cursor-pointer"
                    title="Notificar o profissional no WhatsApp para não haver atrasos"
                  >
                    <span>🚨 Avisar Profissional</span>
                  </button>
                </div>
              ) : (
                <p className="text-[11px] text-slate-400">Cliente cadastrado sem número de WhatsApp.</p>
              )}

              {!isClientView && onDeleteAgendamento && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Deseja realmente excluir este agendamento da grade?")) {
                      onDeleteAgendamento(selectedAgendamentoDetail.id);
                      setSelectedAgendamentoDetail(null);
                    }
                  }}
                  className="w-full bg-red-950/40 hover:bg-red-900/60 text-red-300 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border border-red-500/20 cursor-pointer mt-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir Agendamento Definitivamente</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIGURAÇÃO DA AGENDA DO PROFISSIONAL */}
      {isConfigAgendaModalOpen && activeProf && onUpdateProfissional && (
        <ModalConfiguracaoAgendaProfissional
          isOpen={isConfigAgendaModalOpen}
          onClose={() => setIsConfigAgendaModalOpen(false)}
          profissional={activeProf}
          onSave={(atualizado) => {
            onUpdateProfissional(atualizado);
            setIsConfigAgendaModalOpen(false);
          }}
          showNotification={showNotification}
        />
      )}
    </div>
  );
};
