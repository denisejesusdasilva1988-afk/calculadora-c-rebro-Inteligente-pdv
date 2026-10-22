/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Modal de Comunicados & Lembretes da Agenda (WhatsApp)
 * Permite ao proprietário ou profissional:
 * 1. Gerenciar até 10 comunicados personalizados gravados na memória do app (localStorage + Firestore)
 * 2. Modelos prontos separados para Barbearia, Salão de Beleza, Manicure, Festas/Encomendas, Lembretes e Vagas
 * 3. Criar novos comunicados, editar e apagar os que não deseja mais
 * 4. Inserir tags automáticas: {cliente}, {empresa}, {data}, {horario}, {profissional}, {servico}, {valor}, {telefone}, {link_agenda}
 * 5. Prévia em tempo real no WhatsApp, envio em 1 clique e cópia de texto pronto para colar em redes sociais
 */

import React, { useState, useEffect } from "react";
import {
  X,
  Megaphone,
  Sparkles,
  Calendar,
  Clock,
  Send,
  Copy,
  Save,
  RotateCcw,
  Check,
  MessageCircle,
  Plus,
  Trash2,
  Edit3,
  Scissors,
  PartyPopper,
  Zap,
  Building2
} from "lucide-react";
import { AgendamentoServico } from "./BarbeariaSalaoEventosModule";

export interface ModeloComunicado {
  id: string;
  nome: string;
  icone: string;
  categoria:
    | "barbearia"
    | "salao"
    | "esteticista"
    | "manicure"
    | "podologia"
    | "terapia_ocupacional"
    | "psicologia"
    | "nutricionista"
    | "festas"
    | "lembrete"
    | "geral";
  texto: string;
  isCustom?: boolean;
}

export const MODELOS_COMUNICADOS_PRONTOS: ModeloComunicado[] = [
  {
    id: "com_lembrete",
    nome: "Lembrete de Horário Marcado",
    icone: "⏰",
    categoria: "lembrete",
    texto:
      "Olá, {cliente}! ⏰💈\n\nPassando para lembrar do seu horário marcado na *{empresa}*:\n\n📅 *Data:* {data}\n🕒 *Horário:* {horario}\n✂️ *Serviço:* {servico}\n👤 *Profissional:* {profissional}\n💰 *Valor:* {valor}\n\nEstamos te esperando! Caso precise reagendar ou cancelar, avise-nos com antecedência por aqui: {telefone}. 👍"
  },
  {
    id: "com_confirmacao",
    nome: "Confirmação Imediata de Agendamento",
    icone: "✅",
    categoria: "lembrete",
    texto:
      "Tudo certo, {cliente}! 🎉\n\nSeu agendamento na *{empresa}* foi confirmado com sucesso!\n\n📅 *Dia:* {data} às {horario}\n👤 *Com:* {profissional}\n✂️ *Serviço:* {servico}\n\nMuito obrigado pela confiança! Qualquer dúvida, estamos à disposição: {telefone}. Até breve! ✨"
  },
  {
    id: "com_barbearia_fds",
    nome: "Barbearia — Trato no Visual de Fim de Semana",
    icone: "💈",
    categoria: "barbearia",
    texto:
      "💈👊 *AGENDA DA BARBEARIA LIBERADA NA {empresa}!* ✂️🔥\n\nSextou ou sábado chegando? Não deixe para cortar o cabelo e fazer a barba de última hora! Garanta já o seu degradê, barba terapia ou corte na régua:\n\n👉 *Reserve seu horário online:* {link_agenda}\n📲 Ou mande seu nome no WhatsApp: {telefone}\n\nTrato no visual de respeito te esperando aqui! 🚀"
  },
  {
    id: "com_salao_beleza",
    nome: "Salão de Beleza — Cuidado, Escova & Mechas",
    icone: "💇‍♀️",
    categoria: "salao",
    texto:
      "🌸✨ *COMUNICADO DE ATENDIMENTO — {empresa}* 💇‍♀️💖\n\nQuer renovar o visual, fazer aquela escova perfeita, hidratação profunda ou realçar a cor dos seus cabelos?\n\nNossa equipe está com horários abertos para esta semana! Agende seu momento especial de autocuidado:\n\n👉 *Agende online:* {link_agenda}\n📲 WhatsApp de atendimento: {telefone}\n\nVocê merece se sentir radiante todos os dias! Venha nos visitar! ✨"
  },
  {
    id: "com_esteticista",
    nome: "Estética Facial & Corporal — Cuidados & Limpeza de Pele",
    icone: "✨",
    categoria: "esteticista",
    texto:
      "✨💆‍♀️ *MOMENTO DE AUTOCUIDADO NA {empresa}!* 🌸\n\nSua pele e seu corpo merecem um tratamento especial! Estamos com vagas abertas para Limpeza de Pele Profunda, Drenagem Linfática, Peeling e Massagens nesta semana!\n\n👉 *Reserve seu horário com facilidade pelo link:* {link_agenda}\n📲 Dúvidas e agendamentos no WhatsApp: {telefone}\n\nVenha renovar sua autoestima e relaxar conosco! ✨"
  },
  {
    id: "com_manicure_unhas",
    nome: "Manicure & Pedicure — Vagas da Semana",
    icone: "💅",
    categoria: "manicure",
    texto:
      "💅✨ *HORÁRIOS DE MANICURE & PEDICURE NA {empresa}!* 💖\n\nSexta e sábado chegando e você não vai ficar sem fazer as unhas, né? As vagas para esmaltação, manicure, pedicure e alongamento em gel estão disputadas!\n\n👉 *Escolha seu melhor horário no link:* {link_agenda}\n📲 Ou responda esta mensagem para agendar: {telefone}\n\nVenha brilhar com unhas impecáveis para o fim de semana! 🥂🌸"
  },
  {
    id: "com_podologia",
    nome: "Podologia — Saúde & Cuidado dos Pés",
    icone: "🦶",
    categoria: "podologia",
    texto:
      "🦶✨ *CUIDE DA SAÚDE DOS SEUS PÉS NA {empresa}!* 👣\n\nSentindo dores, desconforto, unhas encravadas ou calosidades? A podologia preventiva devolve o alívio, a leveza e a saúde que seus pés merecem!\n\nNossa agenda de atendimento especializado está com vagas abertas nesta semana:\n\n👉 *Agende online:* {link_agenda}\n📲 Dúvidas ou agendamentos: {telefone}\n\nCaminhe com leveza e sem dor! Esperamos você! ❤️"
  },
  {
    id: "com_terapia_ocupacional",
    nome: "Terapia Ocupacional — Autonomia & Desenvolvimento",
    icone: "🧩",
    categoria: "terapia_ocupacional",
    texto:
      "🧩✨ *ATENDIMENTO EM TERAPIA OCUPACIONAL — {empresa}* 💛\n\nA Terapia Ocupacional promove autonomia, desenvolvimento motor, estimulação cognitiva, integração sensorial e qualidade de vida em todas as fases da vida!\n\nNossos horários para novas avaliações e sessões de acompanhamento estão disponíveis:\n\n👉 *Consulte horários e faça seu agendamento:* {link_agenda}\n📲 Fale diretamente com nossa equipe no WhatsApp: {telefone}\n\nAcolhimento e dedicação ao seu desenvolvimento! 🌱"
  },
  {
    id: "com_psicologia",
    nome: "Psicologia — Espaço de Escuta & Bem-Estar Emocional",
    icone: "🧠",
    categoria: "psicologia",
    texto:
      "🧠🌱 *CUIDADO COM A SUA SAÚDE MENTAL — {empresa}* 🤍\n\nCuidar das suas emoções é fundamental para viver com mais equilíbrio, clareza e paz de espírito. Oferecemos um espaço seguro, ético e acolhedor de psicoterapia para você.\n\nHorários disponíveis para atendimentos presenciais e online nesta semana:\n\n👉 *Reserve seu horário com total sigilo:* {link_agenda}\n📲 Contato direto no WhatsApp: {telefone}\n\nPriorize o seu bem-estar emocional. Você não precisa carregar tudo sozinho(a)! ✨"
  },
  {
    id: "com_nutricionista",
    nome: "Nutricionista — Consulta, Bioimpedância & Metas",
    icone: "🥗",
    categoria: "nutricionista",
    texto:
      "🥗🍎 *CONSULTA NUTRICIONAL & BIOIMPEDÂNCIA NA {empresa}!* 🥦✨\n\nQuer conquistar mais energia, disposição, emagrecimento saudável, ganho de massa ou reeducação alimentar sem dietas malucas?\n\nVenha fazer sua avaliação corporal completa e receber um plano alimentar 100% individualizado para a sua rotina:\n\n👉 *Escolha o seu horário na agenda:* {link_agenda}\n📲 Agende pelo WhatsApp: {telefone}\n\nSua saúde e vitalidade em primeiro lugar! Vamos juntos alcançar suas metas! 💪💚"
  },
  {
    id: "com_festas_encomendas",
    nome: "Festas & Encomendas — Antecipe seu Pedido",
    icone: "🎂",
    categoria: "festas",
    texto:
      "🎂🎉 *COMUNICADO DE ENCOMENDAS DE FESTAS — {empresa}* 🍰🎈\n\nVai comemorar aniversário, casamento ou evento nos próximos dias? Nossa agenda de encomendas está a todo vapor!\n\n✨ *Opções Disponíveis:*\n• Bolos confeitados e decorados artesanais 🎂\n• Centos de salgadinhos fritos e assados crocantes 🥟\n• Docinhos tradicionais e gourmets 🍫\n• Kits Festa Completos com refrigerante e descartáveis 🥳\n\n👉 *Antecipe seu pedido pelo link da nossa agenda:* {link_agenda}\n📲 Ou faça seu orçamento direto aqui no WhatsApp: {telefone}!\n\nGaranta sua data e garanta os melhores sabores para a sua comemoração! ❤️"
  },
  {
    id: "com_agenda_aberta",
    nome: "Aviso de Agenda da Semana Aberta",
    icone: "📅",
    categoria: "geral",
    texto:
      "📢 *AGENDA DA SEMANA ABERTA NA {empresa}!* 📅✨\n\nNossos horários de atendimento para esta semana já estão disponíveis! Garanta sua vaga com seu profissional favorito antes que esgote:\n\n👉 *Agende online pelo link:* {link_agenda}\n📲 Ou mande uma mensagem aqui no WhatsApp: {telefone}!\n\nEsperamos por você! 🔥"
  },
  {
    id: "com_vagas_hoje",
    nome: "Vagas de Hoje / Horários Livres de Última Hora",
    icone: "⚡",
    categoria: "geral",
    texto:
      "⚡ *VAGAS DE ÚLTIMA HORA DISPONÍVEIS HOJE NA {empresa}!* 💈✂️\n\nAbriram horários livres para atendimento no dia de hoje! Quem quiser aproveitar para dar aquele trato no visual ou cuidar da beleza:\n\n👉 *Veja os horários livres e reserve:* {link_agenda}\n💬 Ou mande seu nome aqui no WhatsApp: {telefone}!\n\nCorra que as vagas são limitadas! 🚀"
  }
];

const STORAGE_KEY_LIST_COMUNICADOS = "pdv_msg_comunicados_lista_v2";

export function loadModelosComunicados(): ModeloComunicado[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_LIST_COMUNICADOS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.slice(0, 10);
      }
    }
  } catch {}
  return [...MODELOS_COMUNICADOS_PRONTOS];
}

export function saveModelosComunicados(lista: ModeloComunicado[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_LIST_COMUNICADOS, JSON.stringify(lista.slice(0, 10)));
  } catch (e) {
    console.warn("Erro ao salvar comunicados:", e);
  }
}

interface ModalComunicadosAgendaProps {
  isOpen: boolean;
  onClose: () => void;
  companyName: string;
  companyPhone: string;
  clientAgendaUrl: string;
  agendamentos?: AgendamentoServico[];
  initialCategoria?: string;
  formatCurrency?: (val: number) => string;
  showNotification?: (msg: string, type: "success" | "error" | "info") => void;
}

export const ModalComunicadosAgenda: React.FC<ModalComunicadosAgendaProps> = ({
  isOpen,
  onClose,
  companyName,
  companyPhone,
  clientAgendaUrl,
  agendamentos = [],
  initialCategoria = "todos",
  formatCurrency = (v) => `R$ ${Number(v || 0).toFixed(2).replace(".", ",")}`,
  showNotification = (_msg?: string, _type?: "success" | "error" | "info") => {}
}) => {
  const [modelos, setModelos] = useState<ModeloComunicado[]>(() => loadModelosComunicados());
  const [selectedModeloId, setSelectedModeloId] = useState<string>(() => {
    const list = loadModelosComunicados();
    return list[0]?.id || "com_lembrete";
  });
  const [segmentFilter, setSegmentFilter] = useState<string>(initialCategoria || "todos");

  const modeloAtual = modelos.find((m) => m.id === selectedModeloId) || modelos[0];
  const [nomeEdit, setNomeEdit] = useState<string>(modeloAtual?.nome || "Comunicado");
  const [categoriaEdit, setCategoriaEdit] = useState<ModeloComunicado["categoria"]>(modeloAtual?.categoria || "geral");
  const [iconeEdit, setIconeEdit] = useState<string>(modeloAtual?.icone || "📢");
  const [textoEdit, setTextoEdit] = useState<string>(modeloAtual?.texto || "");

  // Telefone e dados do destinatário teste/específico
  const [destinatarioNome, setDestinatarioNome] = useState("Cliente");
  const [destinatarioTelefone, setDestinatarioTelefone] = useState("");
  const [selectedAgendamentoId, setSelectedAgendamentoId] = useState<string>("");

  useEffect(() => {
    if (modeloAtual) {
      setNomeEdit(modeloAtual.nome);
      setCategoriaEdit(modeloAtual.categoria);
      setIconeEdit(modeloAtual.icone);
      setTextoEdit(modeloAtual.texto);
    }
  }, [selectedModeloId]);

  if (!isOpen) return null;

  // Se selecionou um agendamento da lista, preenche os dados automaticamente
  const agendamentoAlvo = agendamentos.find((a) => a.id === selectedAgendamentoId);

  const previewFormatado = textoEdit
    .replace(/{cliente}/g, agendamentoAlvo ? agendamentoAlvo.clienteNome : destinatarioNome)
    .replace(/{empresa}/g, companyName || "Nossa Empresa")
    .replace(/{telefone}/g, companyPhone || "WhatsApp da Empresa")
    .replace(/{link_agenda}/g, clientAgendaUrl || "Link da Agenda")
    .replace(/{data}/g, agendamentoAlvo ? agendamentoAlvo.data.split("-").reverse().join("/") : "Hoje")
    .replace(/{horario}/g, agendamentoAlvo ? agendamentoAlvo.horario : "14:00")
    .replace(/{profissional}/g, agendamentoAlvo ? agendamentoAlvo.profissionalNome : "Equipe")
    .replace(/{servico}/g, agendamentoAlvo ? agendamentoAlvo.servico : "Atendimento")
    .replace(/{valor}/g, agendamentoAlvo ? formatCurrency(agendamentoAlvo.valor) : "R$ 45,00");

  // 1. Salvar Comunicado Atual
  const handleSalvarModeloAtual = () => {
    if (!textoEdit.trim()) {
      showNotification("O texto do comunicado não pode ficar vazio!", "error");
      return;
    }
    const updated = modelos.map((m) =>
      m.id === selectedModeloId
        ? {
            ...m,
            nome: nomeEdit.trim() || "Comunicado Personalizado",
            categoria: categoriaEdit,
            icone: iconeEdit || "📢",
            texto: textoEdit.trim()
          }
        : m
    );
    setModelos(updated);
    saveModelosComunicados(updated);
    localStorage.setItem("pdv_msg_comunicado_custom", textoEdit.trim());
    showNotification("Comunicado gravado com sucesso na memória do app! 💾✅", "success");
  };

  // 2. Criar Novo Comunicado (Máximo 10)
  const handleCriarNovoComunicado = () => {
    if (modelos.length >= 10) {
      showNotification("Limite máximo de 10 comunicados atingido! Apague um para cadastrar outro.", "error");
      return;
    }
    const novoId = `custom_comunicado_${Date.now()}`;
    const novoModelo: ModeloComunicado = {
      id: novoId,
      nome: `Novo Comunicado #${modelos.length + 1}`,
      categoria: "geral",
      icone: "📢",
      texto:
        "📢 *COMUNICADO — {empresa}* ✨\n\nOlá, {cliente}! Temos novidades e horários disponíveis para você!\n\n👉 *Acesse nossa agenda online:* {link_agenda}\n📲 Fale conosco no WhatsApp: {telefone}!",
      isCustom: true
    };
    const updated = [...modelos, novoModelo];
    setModelos(updated);
    saveModelosComunicados(updated);
    setSelectedModeloId(novoId);
    showNotification("Novo comunicado criado! Agora você pode personalizar o texto.", "success");
  };

  // 3. Apagar Comunicado
  const handleApagarModelo = (idParaApagar: string) => {
    if (modelos.length <= 1) {
      showNotification("Você precisa manter pelo menos 1 comunicado cadastrado!", "error");
      return;
    }
    const mod = modelos.find((m) => m.id === idParaApagar);
    const updated = modelos.filter((m) => m.id !== idParaApagar);
    setModelos(updated);
    saveModelosComunicados(updated);
    setSelectedModeloId(updated[0].id);
    showNotification(`Comunicado "${mod?.nome || "Modelo"}" apagado da memória! 🗑️`, "info");
  };

  // 4. Restaurar modelos de fábrica
  const handleRestaurarPadrao = () => {
    setModelos([...MODELOS_COMUNICADOS_PRONTOS]);
    saveModelosComunicados(MODELOS_COMUNICADOS_PRONTOS);
    setSelectedModeloId(MODELOS_COMUNICADOS_PRONTOS[0].id);
    showNotification("Comunicados originais restaurados com sucesso! 🔄", "success");
  };

  // 5. Inserir Tag
  const handleInserirTag = (tag: string) => {
    setTextoEdit((prev) => prev + ` ${tag} `);
  };

  // 6. Copiar Texto
  const handleCopiarTexto = () => {
    navigator.clipboard.writeText(previewFormatado);
    showNotification("Comunicado copiado com sucesso! 📋 Cole no Status, WhatsApp ou Instagram.", "success");
  };

  // 7. Enviar no WhatsApp
  const handleEnviarWhatsApp = () => {
    const telAlvo = agendamentoAlvo
      ? agendamentoAlvo.clienteTelefone.replace(/\D/g, "")
      : destinatarioTelefone.replace(/\D/g, "");

    const msgEncoded = encodeURIComponent(previewFormatado);
    const waUrl = telAlvo
      ? `https://wa.me/55${telAlvo}?text=${msgEncoded}`
      : `https://wa.me/?text=${msgEncoded}`;

    window.open(waUrl, "_blank");
  };

  return (
    <div className="fixed inset-0 z-[10060] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto text-left">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 bg-slate-950/90 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center shrink-0">
              <Megaphone className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-white font-black text-sm sm:text-base tracking-tight">
                  Comunicados & Lembretes da Agenda (Até 10 Mensagens)
                </h3>
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9.5px] font-black uppercase px-2 py-0.5 rounded-full">
                  {modelos.length} de 10 Cadastrados
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Lembretes, agenda aberta, feriados e encomendas. Grave na memória e apague quando desejar.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          {/* 1. SELETOR DE MODELOS (ATÉ 10) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" /> Selecione o Comunicado para Usar ou Editar:
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCriarNovoComunicado}
                  disabled={modelos.length >= 10}
                  className={`text-[11px] font-black px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                    modelos.length >= 10
                      ? "bg-slate-800 text-slate-500 cursor-not-allowed opacity-60"
                      : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/40"
                  }`}
                  title={modelos.length >= 10 ? "Limite máximo de 10 comunicados" : "Criar novo comunicado"}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Novo Comunicado ({modelos.length}/10)</span>
                </button>

                <button
                  type="button"
                  onClick={handleRestaurarPadrao}
                  className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 hover:underline cursor-pointer"
                  title="Restaurar comunicados de fábrica"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Padrões</span>
                </button>
              </div>
            </div>

            {/* Filtro por Segmento */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 custom-scrollbar text-[11px]">
              <span className="text-[10px] font-black uppercase text-slate-400 shrink-0">Filtrar:</span>
              {[
                { id: "todos", label: "✨ Todos" },
                { id: "barbearia", label: "💈 Barbeiro" },
                { id: "salao", label: "💇‍♀️ Salão" },
                { id: "esteticista", label: "✨ Esteticista" },
                { id: "manicure", label: "💅 Manicure" },
                { id: "podologia", label: "🦶 Podologia" },
                { id: "terapia_ocupacional", label: "🧩 T. Ocupacional" },
                { id: "psicologia", label: "🧠 Psicologia" },
                { id: "nutricionista", label: "🥗 Nutricionista" },
                { id: "festas", label: "🎂 Festas" },
                { id: "lembrete", label: "⏰ Lembretes" }
              ].map((seg) => (
                <button
                  key={seg.id}
                  type="button"
                  onClick={() => setSegmentFilter(seg.id)}
                  className={`px-2.5 py-1 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                    segmentFilter === seg.id
                      ? "bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-950/40"
                      : "bg-slate-900 text-slate-400 hover:text-white border border-white/5"
                  }`}
                >
                  {seg.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {modelos
                .filter((mod) => segmentFilter === "todos" || mod.categoria === segmentFilter)
                .map((mod) => (
                <div
                  key={mod.id}
                  onClick={() => setSelectedModeloId(mod.id)}
                  className={`p-3 rounded-2xl border text-left flex items-start justify-between gap-2 transition-all cursor-pointer relative ${
                    selectedModeloId === mod.id
                      ? "bg-amber-500/20 border-amber-500 shadow-lg shadow-amber-950/40 ring-1 ring-amber-500/50"
                      : "bg-slate-950/70 border-white/5 hover:bg-slate-800/80 hover:border-white/15"
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <span className="text-xl shrink-0 mt-0.5">{mod.icone || "📢"}</span>
                    <div className="min-w-0 flex-1">
                      <span className={`text-xs font-black truncate block ${
                        selectedModeloId === mod.id ? "text-amber-300" : "text-white"
                      }`}>
                        {mod.nome}
                      </span>
                      <span className="text-[10px] text-slate-400 line-clamp-1 mt-0.5 block">
                        {mod.texto.split("\n")[0]}
                      </span>
                    </div>
                  </div>

                  {modelos.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApagarModelo(mod.id);
                      }}
                      className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer shrink-0"
                      title="Apagar este comunicado da memória"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 2. ESCOLHER AGENDAMENTO ALVO (OPCIONAL) */}
          {agendamentos.length > 0 && (
            <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-white/10 space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                Preencher com dados de um agendamento existente:
              </span>
              <select
                value={selectedAgendamentoId}
                onChange={(e) => {
                  setSelectedAgendamentoId(e.target.value);
                  const ag = agendamentos.find((a) => a.id === e.target.value);
                  if (ag) {
                    setDestinatarioNome(ag.clienteNome);
                    setDestinatarioTelefone(ag.clienteTelefone);
                  }
                }}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-bold outline-none focus:border-amber-500"
              >
                <option value="">Mensagem Geral / Transmissão Aberta</option>
                {agendamentos.map((ag) => (
                  <option key={ag.id} value={ag.id}>
                    {ag.data.split("-").reverse().join("/")} às {ag.horario} — {ag.clienteNome} ({ag.servico} com {ag.profissionalNome})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 3. CAMPOS DE EDIÇÃO DO COMUNICADO */}
          <div className="bg-slate-950/70 p-4 rounded-2xl border border-white/10 space-y-3">
            <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2">
              <span className="text-xs font-black uppercase text-amber-300 flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                <span>Editando: {nomeEdit}</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {textoEdit.length} caracteres
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-[10px] font-black uppercase text-slate-300">
                  Título do Comunicado
                </label>
                <input
                  type="text"
                  value={nomeEdit}
                  onChange={(e) => setNomeEdit(e.target.value)}
                  placeholder="Ex: Lembrete de Horário"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-amber-500 font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-300">
                  Categoria / Segmento
                </label>
                <select
                  value={categoriaEdit}
                  onChange={(e) => setCategoriaEdit(e.target.value as any)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-amber-500 font-bold"
                >
                  <option value="barbearia">💈 Barbearia</option>
                  <option value="salao">💇‍♀️ Salão de Beleza</option>
                  <option value="manicure">💅 Manicure & Pedicure</option>
                  <option value="podologia">🦶 Podologia</option>
                  <option value="terapia_ocupacional">🧩 Terapia Ocupacional</option>
                  <option value="psicologia">🧠 Psicologia</option>
                  <option value="nutricionista">🥗 Nutricionista</option>
                  <option value="festas">🎂 Festas & Encomendas</option>
                  <option value="lembrete">⏰ Lembretes</option>
                  <option value="geral">📢 Geral</option>
                </select>
              </div>
            </div>

            {/* TAGS DINÂMICAS & IDEIAS DE MENSAGENS COM TOUCH 100% RESPONSIVO */}
            <div className="space-y-3 pt-1">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block mb-1.5">
                  🏷️ Toque nas tags para inserir no comunicado:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { tag: "{cliente}", label: "+ {cliente}", desc: "Nome do cliente", cor: "blue" },
                    { tag: "{empresa}", label: "+ {empresa}", desc: "Nome da empresa", cor: "amber" },
                    { tag: "{data}", label: "+ {data}", desc: "Data do horário", cor: "emerald" },
                    { tag: "{horario}", label: "+ {horario}", desc: "Hora marcada", cor: "purple" },
                    { tag: "{profissional}", label: "+ {profissional}", desc: "Nome do profissional", cor: "orange" },
                    { tag: "{servico}", label: "+ {servico}", desc: "Serviço marcado", cor: "rose" },
                    { tag: "{valor}", label: "+ {valor}", desc: "Valor em R$", cor: "emerald" },
                    { tag: "{link_agenda}", label: "+ {link_agenda} 🔗", desc: "Link da agenda", cor: "emerald" },
                    { tag: "{telefone}", label: "+ {telefone}", desc: "WhatsApp da empresa", cor: "sky" }
                  ].map((t) => (
                    <button
                      key={t.tag}
                      type="button"
                      onClick={() => handleInserirTag(t.tag)}
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        handleInserirTag(t.tag);
                      }}
                      className={`px-3 py-1.5 rounded-xl bg-${t.cor}-500/10 hover:bg-${t.cor}-500/20 active:scale-95 text-${t.cor}-300 border border-${t.cor}-500/30 text-xs font-bold transition-all cursor-pointer touch-manipulation select-none`}
                      title={t.desc}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* IDEIAS RÁPIDAS DE COMUNICADOS (TOQUE PARA INSERIR NO TEXTO) */}
              <div className="bg-slate-950/70 p-3 rounded-2xl border border-white/5 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>💡 Ideias Rápidas de Textos (Toque para Inserir):</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    {
                      label: "⏰ Tolerância 10 min",
                      texto: "\n\n⏰ *Pontualidade:* Solicitamos comparecer com 5 a 10 min de tolerância para garantirmos o início sem atrasos da sua vaga!"
                    },
                    {
                      label: "✅ Confirmação Anti-Falta",
                      texto: "\n\n✅ *Atenção:* Por favor, responda esta mensagem com um *SIM* confirmando sua presença, pois sua vaga fica bloqueada para você!"
                    },
                    {
                      label: "🔄 Reagendar com Delicadeza",
                      texto: "\n\n🔄 *Remarcação:* Caso tenha qualquer imprevisto, avise-nos com antecedência para reagendarmos seu horário com todo carinho!"
                    },
                    {
                      label: "🤍 Cancelamento Respeitoso",
                      texto: "\n\n🤍 Seu horário foi desmarcado. Quando quiser retornar, nossa agenda estará aberta para você no link!"
                    },
                    {
                      label: "🚨 Aviso ao Profissional",
                      texto: "\n\n🚨 *Atenção Profissional:* Cliente com horário marcado! Favor organizar a bancada e produtos para evitar atrasos."
                    }
                  ].map((ideia, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setTextoEdit((prev) => prev + ideia.texto);
                      }}
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        setTextoEdit((prev) => prev + ideia.texto);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 active:scale-95 text-cyan-300 border border-cyan-500/30 text-[11px] font-bold transition-all cursor-pointer touch-manipulation select-none"
                    >
                      {ideia.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Textarea Espaçoso */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase text-amber-300 tracking-wider">
                  Texto do Comunicado (Espaçoso para Escrever à Vontade ✍️):
                </label>
                <span className="text-slate-400 font-mono text-[9.5px] bg-slate-800 px-2 py-0.5 rounded-md">
                  {textoEdit.length} caracteres
                </span>
              </div>
              <textarea
                rows={12}
                value={textoEdit}
                onChange={(e) => setTextoEdit(e.target.value)}
                className="w-full bg-slate-900 border-2 border-white/10 focus:border-amber-500 rounded-2xl p-4 text-sm sm:text-base text-white leading-relaxed outline-none font-sans min-h-[240px] shadow-inner transition-all resize-y"
                placeholder="Escreva ou ajuste seu comunicado da agenda com todos os detalhes..."
              />
            </div>

            <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
              <button
                type="button"
                onClick={handleSalvarModeloAtual}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer active:scale-95"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Salvar Este Comunicado na Memória 💾</span>
              </button>

              {modelos.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleApagarModelo(selectedModeloId)}
                  className="px-3 py-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Apagar Comunicado</span>
                </button>
              )}
            </div>
          </div>

          {/* 4. PRÉVIA EM TEMPO REAL NO WHATSAPP */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
                <MessageCircle className="w-4 h-4 text-emerald-400" /> Prévia da Mensagem Pronta:
              </span>
              <button
                type="button"
                onClick={handleCopiarTexto}
                className="text-[10px] text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg flex items-center gap-1 font-bold cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                <span>Copiar Texto</span>
              </button>
            </div>

            <div className="bg-[#0b141a] p-4 rounded-2xl border border-white/10 relative overflow-hidden shadow-inner">
              <div className="bg-[#005c4b] text-[#e9edef] rounded-2xl rounded-tr-none p-3.5 max-w-lg ml-auto text-xs whitespace-pre-wrap leading-relaxed shadow font-sans border border-emerald-500/20">
                {previewFormatado}
                <div className="text-[9px] text-emerald-200/60 text-right mt-1.5 flex items-center justify-end gap-1 font-mono">
                  <span>14:35</span>
                  <Check className="w-3 h-3 text-sky-400" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer com Ações */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-slate-950/90 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 text-xs font-bold transition-all cursor-pointer"
          >
            Fechar
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopiarTexto}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Copy className="w-4 h-4" />
              <span>Copiar Texto</span>
            </button>
            <button
              type="button"
              onClick={handleEnviarWhatsApp}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-950/40 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Enviar no WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
