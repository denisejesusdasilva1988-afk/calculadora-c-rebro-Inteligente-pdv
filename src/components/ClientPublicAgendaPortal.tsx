/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Portal Público de Autoatendimento do Cliente (Barbearia, Salão & Encomendas de Festas)
 * 
 * Esta tela é aberta quando o cliente acessa pelo link enviado pelo WhatsApp (?agendar=true).
 * Não exibe dados sigilosos da empresa (caixa, faturamento ou lucros), apenas a tela amigável
 * para o cliente escolher o profissional, o horário ou fazer sua encomenda para festas!
 */

import React, { useState, useMemo, useEffect } from "react";
import {
  Scissors,
  Cake,
  Calendar,
  Clock,
  User,
  Phone,
  CheckCircle2,
  Sparkles,
  MessageCircle,
  Building2,
  ArrowRight,
  PartyPopper,
  X,
  Copy,
  ExternalLink,
  AlertCircle
} from "lucide-react";
import { ProfissionalBarbearia, AgendamentoServico, EncomendaFesta } from "./BarbeariaSalaoEventosModule";
import { BarbeariaTimelineAgenda } from "./BarbeariaTimelineAgenda";

export type CategoriaPortal =
  | "barbearia"
  | "salao"
  | "manicure"
  | "podologia"
  | "terapia_ocupacional"
  | "psicologia"
  | "nutricionista"
  | "encomendas";

export const SERVICOS_POR_SEGMENTO: Record<
  "barbearia" | "salao" | "manicure" | "podologia" | "terapia_ocupacional" | "psicologia" | "nutricionista",
  { nome: string; preco: number; duracao: string }[]
> = {
  barbearia: [
    { nome: "Corte Degradê / Navalhado", preco: 40, duracao: "35 min" },
    { nome: "Corte Tradicional na Tesoura", preco: 35, duracao: "30 min" },
    { nome: "Barba Terapia com Toalha Quente", preco: 35, duracao: "30 min" },
    { nome: "Combo Cabelo + Barba Completo", preco: 65, duracao: "50 min" },
    { nome: "Pigmentação de Cabelo / Barba", preco: 30, duracao: "25 min" },
    { nome: "Design de Sobrancelha Masculina", preco: 20, duracao: "15 min" },
    { nome: "Pezinho / Acabamento", preco: 15, duracao: "15 min" },
    { nome: "Corte Infantil Masculino", preco: 35, duracao: "30 min" }
  ],
  salao: [
    { nome: "Corte Feminino & Modelagem", preco: 60, duracao: "45 min" },
    { nome: "Escova Modelada + Lavagem Especial", preco: 50, duracao: "40 min" },
    { nome: "Coloração / Tinta Raiz", preco: 90, duracao: "60 min" },
    { nome: "Luzes / Mechas no Papel", preco: 180, duracao: "120 min" },
    { nome: "Hidratação Profunda / Nutrição", preco: 70, duracao: "40 min" },
    { nome: "Botox Capilar / Alinhamento", preco: 130, duracao: "90 min" },
    { nome: "Penteado para Festas & Eventos", preco: 120, duracao: "60 min" },
    { nome: "Maquiagem Social", preco: 110, duracao: "50 min" }
  ],
  manicure: [
    { nome: "Manicure Simples (Cutilagem e Esmaltação)", preco: 25, duracao: "35 min" },
    { nome: "Pedicure Completo", preco: 30, duracao: "40 min" },
    { nome: "Combo Manicure + Pedicure", preco: 50, duracao: "70 min" },
    { nome: "Alongamento em Fibra de Vidro", preco: 140, duracao: "120 min" },
    { nome: "Alongamento em Gel", preco: 130, duracao: "110 min" },
    { nome: "Manutenção de Alongamento (Fibra/Gel)", preco: 80, duracao: "60 min" },
    { nome: "Esmaltação em Gel", preco: 55, duracao: "45 min" },
    { nome: "Spa dos Pés / Plástica dos Pés", preco: 60, duracao: "45 min" }
  ],
  podologia: [
    { nome: "Podologia Tradicional (Higienização, Corte & Calosidades)", preco: 80, duracao: "50 min" },
    { nome: "Tratamento de Unha Encravada (Espícula)", preco: 70, duracao: "40 min" },
    { nome: "Desbaste de Calos e Calosidades Plantares", preco: 60, duracao: "35 min" },
    { nome: "Podologia Preventiva & Hidratação com Ozônio", preco: 90, duracao: "50 min" },
    { nome: "Tratamento de Fissuras e Rachaduras nos Calcanhares", preco: 65, duracao: "40 min" },
    { nome: "Correção de Curvatura de Unha (Órtese)", preco: 85, duracao: "45 min" },
    { nome: "Reflexologia Podal Relaxante", preco: 75, duracao: "45 min" },
    { nome: "Podologia Geriátrica / Pés Diabéticos", preco: 100, duracao: "60 min" }
  ],
  terapia_ocupacional: [
    { nome: "Avaliação de Terapia Ocupacional Inicial", preco: 180, duracao: "60 min" },
    { nome: "Sessão de T.O. (Desenvolvimento Motor & Cognitivo)", preco: 140, duracao: "50 min" },
    { nome: "Reabilitação de Atividades da Vida Diária (AVD)", preco: 130, duracao: "50 min" },
    { nome: "Integração Sensorial & Estimulação Psicomotora", preco: 150, duracao: "50 min" },
    { nome: "Terapia Ocupacional Infantil / Neurodesenvolvimento", preco: 160, duracao: "50 min" },
    { nome: "Terapia Ocupacional Geriátrica e Estimulação Cognitiva", preco: 140, duracao: "50 min" },
    { nome: "Orientação e Treino para Cuidadores e Familiares", preco: 120, duracao: "45 min" },
    { nome: "Adaptação de Recursos e Tecnologia Assistiva", preco: 150, duracao: "60 min" }
  ],
  psicologia: [
    { nome: "Sessão de Psicoterapia Individual (Adulto)", preco: 150, duracao: "50 min" },
    { nome: "Primeira Consulta / Acolhimento Psicológico", preco: 160, duracao: "60 min" },
    { nome: "Psicoterapia para Adolescentes e Jovens", preco: 140, duracao: "50 min" },
    { nome: "Ludoterapia e Psicoterapia Infantil", preco: 150, duracao: "50 min" },
    { nome: "Terapia de Casal e Mediação de Conflitos", preco: 220, duracao: "75 min" },
    { nome: "Orientação Vocacional e Transição de Carreira", preco: 140, duracao: "50 min" },
    { nome: "Atendimento Psicológico Online (Vídeo)", preco: 130, duracao: "50 min" },
    { nome: "Terapia Cognitivo-Comportamental (Foco em Ansiedade)", preco: 150, duracao: "50 min" }
  ],
  nutricionista: [
    { nome: "Consulta Nutricional Completa + Bioimpedância", preco: 180, duracao: "60 min" },
    { nome: "Retorno, Avaliação de Metas & Ajuste do Cardápio", preco: 100, duracao: "30 min" },
    { nome: "Plano Alimentar para Emagrecimento Saudável", preco: 160, duracao: "50 min" },
    { nome: "Nutrição Esportiva, Performance & Ganho de Massa", preco: 170, duracao: "50 min" },
    { nome: "Reeducação Alimentar e Saúde Digestiva / Intestinal", preco: 150, duracao: "50 min" },
    { nome: "Nutrição Clínica (Diabetes, Colesterol e Hipertensão)", preco: 160, duracao: "50 min" },
    { nome: "Acompanhamento Nutricional Materno-Infantil / Gestantes", preco: 170, duracao: "50 min" },
    { nome: "Consultoria para Alergias e Intolerâncias Alimentares", preco: 160, duracao: "50 min" }
  ]
};

export const SEGMENTO_INFO: Record<
  CategoriaPortal,
  {
    nomeCurto: string;
    nomeCompleto: string;
    icone: string;
    descricao: string;
    cor: string;
  }
> = {
  barbearia: {
    nomeCurto: "Barbeiro",
    nomeCompleto: "Barbearia Tradicional",
    icone: "💈",
    descricao: "Agende seu corte degradê, barba terapia e visual masculino com nossos barbeiros!",
    cor: "amber"
  },
  salao: {
    nomeCurto: "Salão de Beleza",
    nomeCompleto: "Salão de Beleza & Cabeleireiras(os)",
    icone: "💇‍♀️",
    descricao: "Cortes femininos, escovas, mechas, hidratação e cuidados capilares especiais!",
    cor: "purple"
  },
  manicure: {
    nomeCurto: "Manicure & Pedicure",
    nomeCompleto: "Esmalteria & Cuidados com as Unhas",
    icone: "💅",
    descricao: "Alongamento em gel, fibra, esmaltação perfeita, cutilagem e spa dos pés!",
    cor: "pink"
  },
  podologia: {
    nomeCurto: "Podologia",
    nomeCompleto: "Podologia Clínica & Saúde dos Pés",
    icone: "🦶",
    descricao: "Tratamentos para unhas encravadas, calosidades, ozônio e conforto para os pés!",
    cor: "teal"
  },
  terapia_ocupacional: {
    nomeCurto: "Terapia Ocupacional",
    nomeCompleto: "Terapia Ocupacional & Reabilitação",
    icone: "🧩",
    descricao: "Desenvolvimento motor, autonomia, integração sensorial e reabilitação de AVDs!",
    cor: "cyan"
  },
  psicologia: {
    nomeCurto: "Psicologia",
    nomeCompleto: "Psicologia Clínica & Psicoterapia",
    icone: "🧠",
    descricao: "Espaço acolhedor e sigiloso para psicoterapia, cuidados emocionais e saúde mental!",
    cor: "indigo"
  },
  nutricionista: {
    nomeCurto: "Nutricionista",
    nomeCompleto: "Nutrição Clínica & Consultório",
    icone: "🥗",
    descricao: "Consulta nutricional completa, bioimpedância, reeducação alimentar e emagrecimento!",
    cor: "emerald"
  },
  encomendas: {
    nomeCurto: "Festas & Encomendas",
    nomeCompleto: "Encomendas para Festas & Eventos",
    icone: "🎂",
    descricao: "Bolos confeitados, salgadinhos artesanais, docinhos gourmet e kits para festa!",
    cor: "rose"
  }
};

interface ClientPublicAgendaPortalProps {
  companyName: string;
  companyLogo?: string;
  companyPhone: string;
  profissionais: ProfissionalBarbearia[];
  agendamentos?: AgendamentoServico[];
  onSaveAgendamento: (ag: AgendamentoServico) => void;
  onSaveEncomenda: (enc: EncomendaFesta) => void;
  onClosePortal?: () => void;
  formatCurrency?: (val: number) => string;
  isOnlineBookingActive?: boolean;
  businessSegment?: CategoriaPortal | "multi";
}

export const ClientPublicAgendaPortal: React.FC<ClientPublicAgendaPortalProps> = ({
  companyName,
  companyLogo,
  companyPhone,
  profissionais,
  agendamentos = [],
  onSaveAgendamento,
  onSaveEncomenda,
  onClosePortal,
  formatCurrency = (v) => `R$ ${Number(v || 0).toFixed(2).replace(".", ",")}`,
  isOnlineBookingActive = true,
  businessSegment = "multi"
}) => {
  const [selectedSegment, setSelectedSegment] = useState<CategoriaPortal>(() => {
    if (typeof window !== "undefined") {
      try {
        const params = new URLSearchParams(window.location.search);
        const seg = params.get("segmento") as CategoriaPortal;
        if (
          seg === "barbearia" ||
          seg === "salao" ||
          seg === "manicure" ||
          seg === "podologia" ||
          seg === "terapia_ocupacional" ||
          seg === "psicologia" ||
          seg === "nutricionista" ||
          seg === "encomendas"
        ) {
          return seg;
        }
      } catch {}
    }
    if (businessSegment && businessSegment !== "multi") {
      return businessSegment;
    }
    const saved = localStorage.getItem("pdv_business_segment") as CategoriaPortal;
    if (
      saved === "barbearia" ||
      saved === "salao" ||
      saved === "manicure" ||
      saved === "podologia" ||
      saved === "terapia_ocupacional" ||
      saved === "psicologia" ||
      saved === "nutricionista" ||
      saved === "encomendas"
    ) {
      return saved;
    }
    return "barbearia";
  });

  const [viewModeSalao, setViewModeSalao] = useState<"timeline" | "form">("timeline");

  // Form states agendamento
  const [selectedProfId, setSelectedProfId] = useState<string>(profissionais[0]?.id || "");
  const [selectedServico, setSelectedServico] = useState<string>(
    SERVICOS_POR_SEGMENTO.barbearia[0].nome
  );
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [selectedTime, setSelectedTime] = useState<string>("14:00");
  const [clientName, setClientName] = useState<string>("");
  const [clientPhone, setClientPhone] = useState<string>("");
  const [agendamentoSucesso, setAgendamentoSucesso] = useState(false);

  // Estados de envio WhatsApp e feedback
  const [lastWhatsAppUrl, setLastWhatsAppUrl] = useState<string>("");
  const [lastWhatsAppMessage, setLastWhatsAppMessage] = useState<string>("");
  const [formError, setFormError] = useState<string>("");
  const [copiedMessage, setCopiedMessage] = useState<boolean>(false);

  // Ler profissional do link público (?prof=id ou ?segmento=...)
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const params = new URLSearchParams(window.location.search);
        const pId = params.get("prof");
        if (pId) {
          const match = profissionais.find((p) => p.id === pId);
          if (match) {
            setSelectedProfId(match.id);
            if (match.categoria && match.categoria !== "todos") {
              setSelectedSegment(match.categoria as any);
            }
          }
        }
      } catch {}
    }
  }, [profissionais]);

  // Atualiza primeiro serviço quando o segmento muda
  useEffect(() => {
    if (selectedSegment !== "encomendas") {
      const servicosDoSegmento = SERVICOS_POR_SEGMENTO[selectedSegment];
      if (servicosDoSegmento && servicosDoSegmento.length > 0) {
        setSelectedServico(servicosDoSegmento[0].nome);
      }
    }
  }, [selectedSegment]);

  // Form states encomenda festa
  const [eventoData, setEventoData] = useState<string>(() => new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10));
  const [eventoHora, setEventoHora] = useState<string>("15:00");
  const [eventoTipo, setEventoTipo] = useState<string>("Festa de Aniversário");
  const [eventoDescricao, setEventoDescricao] = useState<string>("");
  const [encomendaSucesso, setEncomendaSucesso] = useState(false);

  // Segmento travado no link exclusivo enviado para o cliente (impede misturar com outros negócios)
  const isSegmentLocked = useMemo(() => {
    if (businessSegment && businessSegment !== "multi") return true;
    if (typeof window !== "undefined") {
      try {
        const params = new URLSearchParams(window.location.search);
        const seg = params.get("segmento");
        if (seg && seg !== "todos" && seg !== "multi") return true;
      } catch {}
    }
    return false;
  }, [businessSegment]);

  const infoSegmento = SEGMENTO_INFO[selectedSegment] || SEGMENTO_INFO.barbearia;

  // Profissionais 100% isolados pelo segmento do negócio (sem misturar barbearia com psicólogo ou manicure)
  const profissionaisDoSegmento = useMemo(() => {
    if (selectedSegment === "encomendas") return [];
    return profissionais.filter((p) => (p.categoria || "barbearia") === selectedSegment);
  }, [profissionais, selectedSegment]);

  // Agendamentos 100% isolados pelo segmento do negócio
  const agendamentosDoSegmento = useMemo(() => {
    return agendamentos.filter((a) => {
      if (a.categoria) return a.categoria === selectedSegment;
      const prof = profissionais.find((p) => p.id === a.profissionalId);
      return (prof?.categoria || "barbearia") === selectedSegment;
    });
  }, [agendamentos, profissionais, selectedSegment]);

  // Mantém profissional selecionado válido dentro do segmento atual
  useEffect(() => {
    if (profissionaisDoSegmento.length > 0) {
      const match = profissionaisDoSegmento.some((p) => p.id === selectedProfId);
      if (!match) {
        setSelectedProfId(profissionaisDoSegmento[0].id);
      }
    } else {
      setSelectedProfId("");
    }
  }, [profissionaisDoSegmento, selectedProfId]);

  const selectedProf = profissionaisDoSegmento.find((p) => p.id === selectedProfId) || (profissionaisDoSegmento.length > 0 ? profissionaisDoSegmento[0] : null);
  const servicosAtuais = selectedSegment !== "encomendas"
    ? (SERVICOS_POR_SEGMENTO[selectedSegment] || SERVICOS_POR_SEGMENTO.barbearia)
    : SERVICOS_POR_SEGMENTO.barbearia;
  const servicoObj = servicosAtuais.find((s) => s.nome === selectedServico) || servicosAtuais[0];
  const precoEstimado = servicoObj ? servicoObj.preco : 50;

  // Horários e slots com detecção precisa de horários marcados, livres e bloqueados
  const slotsStatus = useMemo(() => {
    if (!selectedProf) return [];

    const startHour = selectedProf?.horaInicio ? parseInt(selectedProf.horaInicio.split(":")[0], 10) : 8;
    const endHour = selectedProf?.horaFim ? parseInt(selectedProf.horaFim.split(":")[0], 10) : 20;

    const baseTimes: string[] = [];
    for (let h = startHour; h <= endHour; h++) {
      const hStr = String(h).padStart(2, "0");
      baseTimes.push(`${hStr}:00`);
      if (h < endHour) {
        baseTimes.push(`${hStr}:40`);
      }
    }

    // Se o profissional estiver desativado / em pausa, não pode receber agendamentos
    if (selectedProf.ativo === false) {
      return baseTimes.map((slot) => ({
        time: slot,
        isUnavailable: true,
        statusType: "blocked" as const,
        label: "Profissional Indisponível / Em Pausa ⏸️",
        clientName: undefined
      }));
    }

    const lunchStart = selectedProf?.intervaloInicio || "";
    const lunchEnd = selectedProf?.intervaloFim || "";
    const hasLunch = Boolean(lunchStart && lunchEnd && lunchStart < lunchEnd);

    // Verificar folga do profissional no dia da semana selecionado
    let isDiaDeFolga = false;
    try {
      const [ano, mes, dia] = selectedDate.split("-").map(Number);
      const dataObj = new Date(ano, mes - 1, dia, 12, 0, 0);
      const dayOfWeek = dataObj.getDay();
      if (selectedProf?.diasSemana && selectedProf.diasSemana.length > 0) {
        isDiaDeFolga = !selectedProf.diasSemana.includes(dayOfWeek);
      }
    } catch {}

    if (isDiaDeFolga) {
      return baseTimes.map((slot) => ({
        time: slot,
        isUnavailable: true,
        statusType: "blocked" as const,
        label: "Folga do Profissional ⛔",
        clientName: undefined
      }));
    }

    return baseTimes.map((slot) => {
      // 1. Verificar se já existe agendamento ativo nessa data e horário
      const agendado = agendamentos.find(
        (a) =>
          a.data === selectedDate &&
          a.horario === slot &&
          a.status !== "cancelado" &&
          (!selectedProf?.id || selectedProf.id === "todos" || a.profissionalId === selectedProf.id)
      );

      // 2. Verificar intervalo de almoço
      const isLunch = hasLunch && slot >= lunchStart && slot < lunchEnd;

      // 3. Verificar bloqueios personalizados do profissional
      const isBlocked = selectedProf?.bloqueiosPersonalizados?.some((b) => {
        const matchDate = !b.data || b.data === selectedDate;
        if (!matchDate) return false;
        if (b.horarioInicio === b.horarioFim) return slot === b.horarioInicio;
        return slot >= b.horarioInicio && slot < b.horarioFim;
      });

      const isUnavailable = !!agendado || isLunch || !!isBlocked;

      let label = "Disponível ✅";
      let statusType: "free" | "booked" | "lunch" | "blocked" = "free";

      if (agendado) {
        label = "Marcado / Ocupado 🔴";
        statusType = "booked";
      } else if (isLunch) {
        label = "Horário de Almoço 🍽️";
        statusType = "lunch";
      } else if (isBlocked) {
        label = "Horário Reservado 🔒";
        statusType = "blocked";
      }

      return {
        time: slot,
        isUnavailable,
        statusType,
        label,
        clientName: agendado ? agendado.clienteNome : undefined
      };
    });
  }, [selectedProf, selectedDate, agendamentos]);

  // Se o horário selecionado estiver indisponível ao trocar data/profissional, ajusta para o primeiro livre
  useEffect(() => {
    const currentSlot = slotsStatus.find((s) => s.time === selectedTime);
    if (currentSlot?.isUnavailable) {
      const firstFree = slotsStatus.find((s) => !s.isUnavailable);
      if (firstFree) {
        setSelectedTime(firstFree.time);
      }
    }
  }, [slotsStatus, selectedTime]);

  const handleConfirmarAgendamento = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!clientName.trim() || !clientPhone.trim()) {
      setFormError("Por favor, preencha seu Nome e seu WhatsApp para confirmar o horário!");
      return;
    }

    const currentSlot = slotsStatus.find((s) => s.time === selectedTime);
    if (currentSlot?.isUnavailable) {
      setFormError("Este horário está indisponível! Por favor escolha um horário livre na lista abaixo.");
      return;
    }
    if (selectedProf && selectedProf.ativo === false) {
      setFormError("Este profissional está indisponível no momento para novos agendamentos!");
      return;
    }

    const novoAg: AgendamentoServico = {
      id: "ag_cli_" + Date.now(),
      data: selectedDate,
      horario: selectedTime,
      clienteNome: clientName.trim(),
      clienteTelefone: clientPhone.trim(),
      profissionalId: selectedProf?.id || "equipe",
      profissionalNome: selectedProf?.nome || "Equipe",
      servico: selectedServico,
      valor: precoEstimado,
      status: "agendado",
      criadoEm: new Date().toISOString()
    };

    onSaveAgendamento(novoAg);

    // Enviar mensagem pronta no WhatsApp do estabelecimento
    const cleanCompanyPhone = (companyPhone || "").replace(/\D/g, "");
    const dataFormatada = selectedDate.split("-").reverse().join("/");
    const rawMsg =
      `Olá! 💈✨ Acabei de agendar um horário pelo link da agenda:\n\n` +
      `📅 *Data:* ${dataFormatada} às ${selectedTime}\n` +
      `✂️ *Serviço:* ${selectedServico}\n` +
      `👤 *Profissional:* ${selectedProf?.nome || "Qualquer Disponível"}\n` +
      `💰 *Valor Estimado:* ${formatCurrency(precoEstimado)}\n\n` +
      `*Meu Nome:* ${clientName.trim()}\n` +
      `*Meu WhatsApp:* ${clientPhone.trim()}\n\n` +
      `Por favor, me confirme este horário! Obrigado(a)!`;

    const encodedMsg = encodeURIComponent(rawMsg);
    const waUrl = cleanCompanyPhone
      ? `https://wa.me/55${cleanCompanyPhone}?text=${encodedMsg}`
      : `https://wa.me/?text=${encodedMsg}`;

    setLastWhatsAppUrl(waUrl);
    setLastWhatsAppMessage(rawMsg);
    setAgendamentoSucesso(true);

    try {
      const a = document.createElement("a");
      a.href = waUrl;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      window.open(waUrl, "_blank");
    }
  };

  const handleConfirmarEncomenda = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!clientName.trim() || !clientPhone.trim() || !eventoDescricao.trim()) {
      setFormError("Por favor, preencha seu Nome, WhatsApp e a descrição dos itens da encomenda!");
      return;
    }

    const novaEnc: EncomendaFesta = {
      id: "enc_cli_" + Date.now(),
      dataEntrega: eventoData,
      horarioEntrega: eventoHora,
      clienteNome: clientName.trim(),
      clienteTelefone: clientPhone.trim(),
      tipoEvento: eventoTipo,
      itensDescricao: eventoDescricao.trim(),
      valorTotal: 0, // A combinar
      sinalPago: 0,
      saldoRestante: 0,
      metodoPagamentoSinal: "A combinar",
      status: "anotado",
      criadoEm: new Date().toISOString()
    };

    onSaveEncomenda(novaEnc);

    const cleanCompanyPhone = (companyPhone || "").replace(/\D/g, "");
    const dataFormatada = eventoData.split("-").reverse().join("/");
    const rawMsg =
      `Olá! 🍰🎉 Gostaria de solicitar um orçamento para encomenda de festa:\n\n` +
      `📅 *Data da Festa/Entrega:* ${dataFormatada} às ${eventoHora}\n` +
      `🎈 *Tipo de Evento:* ${eventoTipo}\n` +
      `📦 *Itens Desejados:* ${eventoDescricao.trim()}\n\n` +
      `*Meu Nome:* ${clientName.trim()}\n` +
      `*Meu WhatsApp:* ${clientPhone.trim()}\n\n` +
      `Aguardo seu retorno com os valores e disponibilidade! Obrigado(a)!`;

    const encodedMsg = encodeURIComponent(rawMsg);
    const waUrl = cleanCompanyPhone
      ? `https://wa.me/55${cleanCompanyPhone}?text=${encodedMsg}`
      : `https://wa.me/?text=${encodedMsg}`;

    setLastWhatsAppUrl(waUrl);
    setLastWhatsAppMessage(rawMsg);
    setEncomendaSucesso(true);

    try {
      const a = document.createElement("a");
      a.href = waUrl;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      window.open(waUrl, "_blank");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-start p-4 sm:p-6 font-sans">
      <div className="w-full max-w-xl space-y-6">
        
        {/* Top bar com fechar (se for modal ou preview do dono) */}
        {onClosePortal && (
          <div className="flex justify-between items-center bg-slate-900/80 px-4 py-2 rounded-2xl border border-white/10 text-xs">
            <span className="text-amber-400 font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Modo Visualização do Cliente (Link do WhatsApp)</span>
            </span>
            <button
              onClick={onClosePortal}
              className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px] font-bold"
            >
              <X className="w-4 h-4" />
              <span>Fechar</span>
            </button>
          </div>
        )}

        {/* CABEÇALHO DO ESTABELECIMENTO */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-indigo-950/60 border border-white/10 rounded-3xl p-6 text-center shadow-2xl relative overflow-hidden space-y-4">
          <div className="flex flex-col items-center">
            {companyLogo ? (
              <img
                src={companyLogo}
                alt={companyName}
                className="w-20 h-20 rounded-2xl object-cover border-2 border-amber-500/50 shadow-xl mb-2"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/30 mb-2">
                <Scissors className="w-8 h-8" />
              </div>
            )}
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {companyName || "Barbearia & Salão"}
            </h1>
            <p className="text-xs text-slate-300 font-medium max-w-sm mt-1">
              Agende seu horário com nossos profissionais ou solicite sua encomenda para festas com rapidez e sem filas!
            </p>
          </div>

          {/* Se o link for exclusivo do segmento (enviado pelo WhatsApp da barbearia, psicologia, etc.), exibe APENAS esse negócio */}
          {isExclusiveSegment ? (
            <div className="bg-slate-950/90 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-center gap-3 shadow-lg">
              <span className="text-3xl shrink-0">{infoSegmento.icone}</span>
              <div className="text-left min-w-0">
                <span className="text-xs sm:text-sm font-black uppercase text-amber-300 tracking-wider block truncate">
                  {infoSegmento.nomeCompleto}
                </span>
                <span className="text-[11px] text-slate-300 block line-clamp-2">
                  {infoSegmento.descricao}
                </span>
              </div>
            </div>
          ) : (
            /* Se for portal geral sem segmento na URL, permite escolher */
            <div className="space-y-1.5 text-left">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                Escolha o Atendimento Desejado:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setSelectedSegment("barbearia")}
                  className={`py-2 px-2 rounded-xl text-[10.5px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    selectedSegment === "barbearia"
                      ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <span>💈 Barbeiro</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedSegment("salao")}
                  className={`py-2 px-2 rounded-xl text-[10.5px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    selectedSegment === "salao"
                      ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <span>💇‍♀️ Salão Beleza</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedSegment("manicure")}
                  className={`py-2 px-2 rounded-xl text-[10.5px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    selectedSegment === "manicure"
                      ? "bg-pink-600 text-white shadow-lg shadow-pink-600/20"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <span>💅 Manicure</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedSegment("podologia")}
                  className={`py-2 px-2 rounded-xl text-[10.5px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    selectedSegment === "podologia"
                      ? "bg-teal-600 text-white shadow-lg shadow-teal-600/20"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <span>🦶 Podologia</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedSegment("terapia_ocupacional")}
                  className={`py-2 px-2 rounded-xl text-[10.5px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    selectedSegment === "terapia_ocupacional"
                      ? "bg-cyan-600 text-white shadow-lg shadow-cyan-600/20"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <span>🧩 T. Ocupacional</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedSegment("psicologia")}
                  className={`py-2 px-2 rounded-xl text-[10.5px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    selectedSegment === "psicologia"
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <span>🧠 Psicologia</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedSegment("nutricionista")}
                  className={`py-2 px-2 rounded-xl text-[10.5px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    selectedSegment === "nutricionista"
                      ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <span>🥗 Nutricionista</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedSegment("encomendas")}
                  className={`py-2 px-2 rounded-xl text-[10.5px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    selectedSegment === "encomendas"
                      ? "bg-rose-600 text-white shadow-lg shadow-rose-600/20"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <span>🍰 Festas</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* AVISO SE O LINK PÚBLICO ESTIVER PAUSADO PELO PROPRIETÁRIO */}
        {!isOnlineBookingActive ? (
          <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-2xl animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/40">
              <Clock className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-black text-white">
              Agendamentos Online Temporariamente Pausados ⏸️
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed font-medium max-w-md mx-auto">
              O agendamento automático pelo link está em pausa no momento. Mas você pode falar diretamente com nossa equipe pelo WhatsApp para consultar horários disponíveis!
            </p>
            <div className="pt-2">
              <a
                href={
                  companyPhone.replace(/\D/g, "")
                    ? `https://wa.me/55${companyPhone.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá! Gostaria de consultar horários disponíveis na ${companyName || "barbearia/salão"}!`)}`
                    : `https://wa.me/?text=${encodeURIComponent(`Olá! Gostaria de consultar horários disponíveis!`)}`
                }
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase px-6 py-3.5 rounded-2xl transition-all shadow-lg shadow-emerald-600/30"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Conversar no WhatsApp</span>
              </a>
            </div>
          </div>
        ) : agendamentoSucesso ? (
          <div className="bg-slate-900 border-2 border-emerald-500/50 rounded-3xl p-6 sm:p-8 text-center space-y-5 shadow-2xl animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border-2 border-emerald-500/40 shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-xl font-black text-white">
                Agendamento Reservado com Sucesso! 🎉
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                Seu horário para <strong>{selectedServico}</strong> no dia{" "}
                <strong className="text-amber-400">{selectedDate.split("-").reverse().join("/")}</strong> às{" "}
                <strong className="text-amber-400">{selectedTime}</strong> com{" "}
                <strong>{selectedProf?.nome || "Equipe"}</strong> está pronto para envio!
              </p>
            </div>

            {/* BOTÃO PRINCIPAL DE ENVIO AO WHATSAPP */}
            <div className="space-y-2 pt-2">
              <a
                href={lastWhatsAppUrl || `https://wa.me/?text=${encodeURIComponent(lastWhatsAppMessage)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-4 px-6 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white rounded-2xl font-black text-sm uppercase tracking-wide flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-600/30 transition-all active:scale-98"
              >
                <MessageCircle className="w-5 h-5" />
                <span>Abrir WhatsApp do Estabelecimento 📲</span>
              </a>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(lastWhatsAppMessage);
                  setCopiedMessage(true);
                  setTimeout(() => setCopiedMessage(false), 3000);
                }}
                className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-white/10 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Copy className="w-4 h-4 text-emerald-400" />
                <span>
                  {copiedMessage ? "Mensagem Copiada! Cole no WhatsApp ✅" : "Copiar Texto da Mensagem"}
                </span>
              </button>
            </div>

            <div className="pt-2">
              <button
                onClick={() => {
                  setAgendamentoSucesso(false);
                  setClientName("");
                }}
                className="text-slate-400 hover:text-white text-xs font-bold underline transition-all cursor-pointer"
              >
                ← Fazer Outro Agendamento
              </button>
            </div>
          </div>
        ) : encomendaSucesso ? (
          <div className="bg-slate-900 border-2 border-pink-500/50 rounded-3xl p-6 sm:p-8 text-center space-y-5 shadow-2xl animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center mx-auto border-2 border-pink-500/40 shadow-lg shadow-pink-500/20">
              <PartyPopper className="w-9 h-9" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-xl font-black text-white">
                Pedido de Encomenda Registrado! 🍰🎉
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                Sua solicitação de encomenda para a festa no dia{" "}
                <strong className="text-pink-400">{eventoData.split("-").reverse().join("/")}</strong> às{" "}
                <strong className="text-pink-400">{eventoHora}</strong> está pronta para envio ao WhatsApp!
              </p>
            </div>

            {/* BOTÃO PRINCIPAL DE ENVIO AO WHATSAPP */}
            <div className="space-y-2 pt-2">
              <a
                href={lastWhatsAppUrl || `https://wa.me/?text=${encodeURIComponent(lastWhatsAppMessage)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-4 px-6 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white rounded-2xl font-black text-sm uppercase tracking-wide flex items-center justify-center gap-2.5 shadow-xl shadow-pink-600/30 transition-all active:scale-98"
              >
                <MessageCircle className="w-5 h-5" />
                <span>Abrir WhatsApp para Enviar Encomenda 🍰📲</span>
              </a>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(lastWhatsAppMessage);
                  setCopiedMessage(true);
                  setTimeout(() => setCopiedMessage(false), 3000);
                }}
                className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-white/10 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Copy className="w-4 h-4 text-pink-400" />
                <span>
                  {copiedMessage ? "Mensagem Copiada! Cole no WhatsApp ✅" : "Copiar Texto da Encomenda"}
                </span>
              </button>
            </div>

            <div className="pt-2">
              <button
                onClick={() => {
                  setEncomendaSucesso(false);
                  setEventoDescricao("");
                }}
                className="text-slate-400 hover:text-white text-xs font-bold underline transition-all cursor-pointer"
              >
                ← Fazer Outra Solicitação
              </button>
            </div>
          </div>
        ) : selectedSegment !== "encomendas" ? (
          <div className="space-y-4">
            {/* Seletor de Modo: Ver Grade da Agenda (Foto) vs Formulário */}
            <div className="flex bg-slate-900 border border-white/10 p-1.5 rounded-2xl gap-1.5">
              <button
                type="button"
                onClick={() => setViewModeSalao("timeline")}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  viewModeSalao === "timeline"
                    ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Grade da Agenda (Ver Horários Marcados) 📅</span>
              </button>
              <button
                type="button"
                onClick={() => setViewModeSalao("form")}
                className={`py-2.5 px-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  viewModeSalao === "form"
                    ? "bg-slate-800 text-white border border-white/10"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <span>Formulário Rápido</span>
              </button>
            </div>

            {viewModeSalao === "timeline" ? (
              /* GRADE DA AGENDA IGUAL À FOTO ENVIADA PELO USUÁRIO */
              <div className="space-y-3">
                <div className="bg-slate-900/90 border border-amber-500/30 p-3.5 rounded-2xl text-xs text-amber-300 font-medium flex items-center justify-between gap-2 flex-wrap shadow-lg">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Toque em qualquer <strong>Horário Disponível (Livre)</strong> para marcar sua vaga!</span>
                  </div>
                  <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-bold">
                    [AGENDADO] = Ocupado
                  </span>
                </div>

                <BarbeariaTimelineAgenda
                  profissionais={profissionaisDoSegmento}
                  agendamentos={agendamentosDoSegmento}
                  onAddAgendamento={(novoAg) => {
                    onSaveAgendamento(novoAg);
                    setAgendamentoSucesso(true);
                  }}
                  formatCurrency={formatCurrency}
                  isClientView={true}
                  companyPhone={companyPhone}
                  companyName={companyName}
                  onSelectSlotToBook={(slot) => {
                    setSelectedDate(slot.data);
                    setSelectedTime(slot.horario);
                    setSelectedProfId(slot.profissionalId);
                    setViewModeSalao("form");
                  }}
                />
              </div>
            ) : (
              /* FORMULÁRIO 1: AGENDAR HORÁRIO SALÃO / BARBEARIA */
              <form
                onSubmit={handleConfirmarAgendamento}
                className="bg-slate-900 border border-white/10 rounded-3xl p-5 sm:p-7 space-y-5 shadow-2xl text-left"
              >
                {/* 1. Escolha do Profissional */}
                <div className="space-y-2.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-amber-400" />
                    <span>1. Escolha o Profissional ({infoSegmento.nomeCurto})</span>
                  </label>
                  {profissionaisDoSegmento.length === 0 ? (
                    <div className="p-4 bg-slate-950/80 rounded-2xl border border-white/5 text-center text-xs text-slate-400">
                      Nenhum profissional de {infoSegmento.nomeCurto} cadastrado no momento.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {profissionaisDoSegmento.map((prof) => {
                        const isSelected = selectedProfId === prof.id;
                        const isAtivo = prof.ativo !== false;
                        return (
                          <div
                            key={prof.id}
                            onClick={() => {
                              if (!isAtivo) return;
                              setSelectedProfId(prof.id);
                            }}
                            className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-2 ${
                              !isAtivo
                                ? "bg-slate-950/50 border-red-500/20 opacity-50 cursor-not-allowed"
                                : isSelected
                                ? "bg-amber-500/15 border-amber-500 shadow-md shadow-amber-500/10 scale-102 cursor-pointer"
                                : "bg-slate-950 border-white/5 hover:border-white/15 opacity-80 hover:opacity-100 cursor-pointer"
                            }`}
                          >
                            {prof.fotoUrl ? (
                              <img
                                src={prof.fotoUrl}
                                alt={prof.nome}
                                className="w-12 h-12 rounded-xl object-cover border border-amber-500/30"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-300 font-black text-sm flex items-center justify-center border border-amber-500/40">
                                {prof.nome.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0 w-full">
                              <p className="text-xs font-black text-white truncate">
                                {prof.nome}
                              </p>
                              {prof.apelido && (
                                <p className="text-[10px] text-amber-300 font-bold truncate">
                                  "{prof.apelido}"
                                </p>
                              )}
                              <p className="text-[9px] text-slate-400 truncate">
                                {prof.especialidade}
                              </p>
                              {!isAtivo && (
                                <span className="inline-block mt-1 text-[8.5px] font-black uppercase text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">
                                  Pausa
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 2. Escolha do Serviço */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Scissors className="w-3.5 h-3.5 text-amber-400" />
                    <span>2. Qual serviço você deseja fazer?</span>
                  </label>
                  <select
                    value={selectedServico}
                    onChange={(e) => setSelectedServico(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-3 text-xs text-white outline-none font-bold focus:border-amber-500"
                  >
                    {servicosAtuais.map((s, idx) => (
                      <option key={idx} value={s.nome}>
                        {s.nome} - {formatCurrency(s.preco)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Data e Horário */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                      <span>3. Escolha o Dia</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none font-bold"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-indigo-400" />
                        <span>4. Horários do Dia (Toque para Escolher)</span>
                      </label>
                      <div className="flex items-center gap-2 text-[9.5px] font-bold">
                        <span className="text-emerald-400 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                          Livre
                        </span>
                        <span className="text-red-400 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                          🔴 Marcado
                        </span>
                        <span className="text-amber-400 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                          ⛔ Almoço/Pausa
                        </span>
                      </div>
                    </div>

                    {/* Grade Visual Interativa de Horários */}
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 pt-1">
                      {slotsStatus.map((slot) => {
                        const isSelected = selectedTime === slot.time;
                        const isBooked = slot.statusType === "booked";
                        const isLunch = slot.statusType === "lunch";
                        const isBlocked = slot.statusType === "blocked";
                        const isUnavailable = slot.isUnavailable;

                        return (
                          <button
                            key={slot.time}
                            type="button"
                            disabled={isUnavailable}
                            onClick={() => setSelectedTime(slot.time)}
                            className={`p-2 rounded-xl text-center transition-all flex flex-col items-center justify-center gap-0.5 border cursor-pointer ${
                              isSelected
                                ? "bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow-lg shadow-emerald-500/30 scale-105 ring-2 ring-emerald-300"
                                : isBooked
                                ? "bg-red-950/40 border-red-500/30 text-red-400/80 cursor-not-allowed opacity-75"
                                : isLunch
                                ? "bg-amber-950/30 border-amber-500/20 text-amber-400/70 cursor-not-allowed opacity-60"
                                : isBlocked
                                ? "bg-slate-950 border-white/5 text-slate-500 cursor-not-allowed opacity-50"
                                : "bg-slate-950 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-500 active:scale-95"
                            }`}
                            title={
                              isBooked
                                ? `Horário ${slot.time} já está agendado!`
                                : isLunch
                                ? `Horário ${slot.time} é intervalo de almoço.`
                                : `Horário ${slot.time} livre para agendar!`
                            }
                          >
                            <span className="font-mono text-xs font-bold leading-none">
                              {slot.time}
                            </span>
                            <span className="text-[8px] font-black uppercase tracking-tight leading-none">
                              {isSelected
                                ? "Escolhido ✅"
                                : isBooked
                                ? "Marcado 🔴"
                                : isLunch
                                ? "Almoço 🍽️"
                                : isBlocked
                                ? "Reservado 🔒"
                                : "Livre"}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Resumo do Horário Selecionado */}
                    <div className="bg-slate-950/80 border border-white/5 rounded-xl p-2.5 flex items-center justify-between text-xs mt-2">
                      <span className="text-slate-400">Horário Escolhido:</span>
                      <span className="font-mono font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                        {selectedTime} ({slotsStatus.find((s) => s.time === selectedTime)?.label || "Disponível"})
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4. Dados do Cliente */}
                <div className="space-y-3 pt-2 border-t border-white/5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Seu Nome Completo *</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Ex: João da Silva"
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none font-bold focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Seu Celular / WhatsApp *</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="Ex: (21) 99999-8888"
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none font-bold font-mono focus:border-emerald-500"
                    />
                    <span className="text-[9px] text-slate-400 block">
                      Usaremos este número para enviar a confirmação do seu horário pelo WhatsApp.
                    </span>
                  </div>
                </div>

                {formError && (
                  <div className="p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-red-200 text-xs font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.99] text-white py-3.5 px-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xl shadow-emerald-600/20 cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Confirmar Agendamento no WhatsApp 💬</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          /* FORMULÁRIO 2: ENCOMENDA DE FESTA */
          <form
            onSubmit={handleConfirmarEncomenda}
            className="bg-slate-900 border border-white/10 rounded-3xl p-5 sm:p-7 space-y-5 shadow-2xl text-left"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-pink-400 text-xs font-black uppercase">
                <PartyPopper className="w-4 h-4" />
                <span>Solicitação de Encomenda para Festas & Eventos</span>
              </div>
              <p className="text-[11px] text-slate-300 font-medium">
                Faça sua encomenda de bolos, doces, salgados e kits para sua festa.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-300">
                  Data da Festa / Entrega *
                </label>
                <input
                  type="date"
                  required
                  value={eventoData}
                  onChange={(e) => setEventoData(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-300">
                  Horário Desejado *
                </label>
                <input
                  type="time"
                  required
                  value={eventoHora}
                  onChange={(e) => setEventoHora(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none font-bold"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-300">
                Tipo de Evento
              </label>
              <input
                type="text"
                value={eventoTipo}
                onChange={(e) => setEventoTipo(e.target.value)}
                placeholder="Ex: Aniversário Infantil, Casamento, Churrasco"
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-300">
                Itens que você deseja encomendar *
              </label>
              <textarea
                required
                rows={3}
                value={eventoDescricao}
                onChange={(e) => setEventoDescricao(e.target.value)}
                placeholder="Ex: Bolo de Chocolate 2kg + 100 Salgadinhos (coxinhas e quibes) + 50 Brigadeiros"
                className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white outline-none font-medium resize-none focus:border-pink-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-white/5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-300">
                  Seu Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ex: Maria Fernandes"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-300">
                  Seu WhatsApp *
                </label>
                <input
                  type="text"
                  required
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="Ex: (21) 99999-7777"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none font-bold font-mono"
                />
              </div>
            </div>

            {formError && (
              <div className="p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-red-200 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 active:scale-[0.99] text-white py-3.5 px-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xl shadow-pink-600/20 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Solicitar Encomenda no WhatsApp 🍰</span>
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
