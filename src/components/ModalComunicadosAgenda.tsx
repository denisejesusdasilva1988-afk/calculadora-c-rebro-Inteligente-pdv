/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Modal de Comunicados & Lembretes da Agenda (WhatsApp)
 * Permite ao proprietário ou profissional:
 * 1. Escolher comunicados prontos (Lembrete, Confirmação, Agenda Aberta, Vagas de Hoje, Feriado, Agradecimento)
 * 2. Personalizar o texto livremente com tags dinâmicas ({cliente}, {empresa}, {data}, {horario}, {profissional}, {servico}, {telefone}, {link_agenda})
 * 3. Enviar direto no WhatsApp com 1 clique ou Copiar texto pronto para colar em grupos e status
 * 4. Salvar modelos personalizados permanentemente
 */

import React, { useState } from "react";
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
  Zap,
  Star,
  Users
} from "lucide-react";
import { AgendamentoServico } from "./BarbeariaSalaoEventosModule";

export interface ModeloComunicado {
  id: string;
  nome: string;
  icone: string;
  tipo:
    | "lembrete"
    | "confirmacao"
    | "agenda_aberta"
    | "vagas_hoje"
    | "feriado"
    | "pos_atendimento"
    | "festas_encomendas"
    | "manicure_unhas"
    | "barbearia_fds"
    | "salao_beleza";
  texto: string;
}

export const MODELOS_COMUNICADOS_PRONTOS: ModeloComunicado[] = [
  {
    id: "com_lembrete",
    nome: "Lembrete de Horário Marcado",
    icone: "⏰",
    tipo: "lembrete",
    texto:
      "Olá, {cliente}! ⏰💈\n\nPassando para lembrar do seu horário marcado na *{empresa}*:\n\n📅 *Data:* {data}\n🕒 *Horário:* {horario}\n✂️ *Serviço:* {servico}\n👤 *Profissional:* {profissional}\n💰 *Valor:* {valor}\n\nEstamos te esperando! Caso precise reagendar ou cancelar, avise-nos com antecedência por aqui: {telefone}. 👍"
  },
  {
    id: "com_confirmacao",
    nome: "Confirmação Imediata de Agendamento",
    icone: "✅",
    tipo: "confirmacao",
    texto:
      "Tudo certo, {cliente}! 🎉\n\nSeu agendamento na *{empresa}* foi confirmado com sucesso!\n\n📅 *Dia:* {data} às {horario}\n👤 *Com:* {profissional}\n✂️ *Serviço:* {servico}\n\nMuito obrigado pela confiança! Qualquer dúvida, estamos à disposição: {telefone}. Até breve! ✨"
  },
  {
    id: "com_festas_encomendas",
    nome: "Festas & Encomendas — Antecipe seu Pedido",
    icone: "🎂",
    tipo: "festas_encomendas",
    texto:
      "🎂🎉 *COMUNICADO DE ENCOMENDAS DE FESTAS — {empresa}* 🍰🎈\n\nVai comemorar aniversário, casamento ou evento nos próximos dias? Nossa agenda de encomendas está a todo vapor!\n\n✨ *Opções Disponíveis:*\n• Bolos confeitados e decorados artesanais 🎂\n• Centos de salgadinhos fritos e assados crocantes 🥟\n• Docinhos tradicionais e gourmets 🍫\n• Kits Festa Completos com refrigerante e descartáveis 🥳\n\n👉 *Antecipe seu pedido pelo link:* {link_agenda}\n📲 Ou faça seu orçamento direto aqui no WhatsApp: {telefone}!\n\nGaranta sua data e garanta os melhores sabores para a sua comemoração! ❤️"
  },
  {
    id: "com_manicure_unhas",
    nome: "Manicure & Esmalteria — Vagas da Semana",
    icone: "💅",
    tipo: "manicure_unhas",
    texto:
      "💅✨ *HORÁRIOS DE MANICURE & NAILS NA {empresa}!* 💖\n\nSexta e sábado chegando e você não vai ficar sem fazer as unhas, né? As vagas para esmaltação, manicure, pedicure e alongamento em gel estão disputadas!\n\n👉 *Escolha seu melhor horário no link:* {link_agenda}\n📲 Ou responda esta mensagem para agendar: {telefone}\n\nVenha brilhar com unhas impecáveis para o fim de semana! 🥂🌸"
  },
  {
    id: "com_barbearia_fds",
    nome: "Barbearia — Trato no Visual de Fim de Semana",
    icone: "💈",
    tipo: "barbearia_fds",
    texto:
      "💈👊 *AGENDA DA BARBEARIA LIBERADA NA {empresa}!* ✂️🔥\n\nSextou ou sábado chegando? Não deixe para cortar o cabelo e fazer a barba de última hora! Garanta já o seu degradê, barba terapia ou corte na régua:\n\n👉 *Reserve seu horário online:* {link_agenda}\n📲 Ou mande seu nome no WhatsApp: {telefone}\n\nTrato no visual de respeito te esperando aqui! 🚀"
  },
  {
    id: "com_salao_beleza",
    nome: "Salão de Beleza — Cuidado, Escova & Mechas",
    icone: "💇‍♀️",
    tipo: "salao_beleza",
    texto:
      "🌸✨ *COMUNICADO DE ATENDIMENTO — {empresa}* 💇‍♀️💖\n\nQuer renovar o visual, fazer aquela escova perfeita, hidratação profunda ou realçar a cor dos seus cabelos?\n\nNossa equipe está com horários abertos para esta semana! Agende seu momento especial de autocuidado:\n\n👉 *Agende online:* {link_agenda}\n📲 WhatsApp de atendimento: {telefone}\n\nVocê merece se sentir radiante todos os dias! Venha nos visitar! ✨"
  },
  {
    id: "com_agenda_aberta",
    nome: "Aviso de Agenda da Semana Aberta",
    icone: "📅",
    tipo: "agenda_aberta",
    texto:
      "📢 *AGENDA DA SEMANA ABERTA NA {empresa}!* 📅✨\n\nNossos horários de atendimento para esta semana já estão disponíveis! Garanta sua vaga com seu profissional favorito antes que esgote:\n\n👉 *Agende online pelo link:* {link_agenda}\n📲 Ou mande uma mensagem aqui no WhatsApp: {telefone}!\n\nEsperamos por você! 🔥"
  },
  {
    id: "com_vagas_hoje",
    nome: "Vagas de Hoje / Horários Livres de Última Hora",
    icone: "⚡",
    tipo: "vagas_hoje",
    texto:
      "⚡ *VAGAS DE ÚLTIMA HORA DISPONÍVEIS HOJE NA {empresa}!* 💈✂️\n\nAbriram horários livres para atendimento no dia de hoje! Quem quiser aproveitar para dar aquele trato no visual ou cuidar da beleza:\n\n👉 *Veja os horários livres e reserve:* {link_agenda}\n💬 Ou mande seu nome aqui no WhatsApp: {telefone}!\n\nCorra que as vagas são limitadas! 🚀"
  },
  {
    id: "com_feriado",
    nome: "Comunicado de Feriado / Horário Especial",
    icone: "🏖️",
    tipo: "feriado",
    texto:
      "📢 *COMUNICADO IMPORTANTE — {empresa}* 🗓️\n\nInformamos a todos os nossos clientes e amigos que neste feriado/fim de semana atenderemos em *horário especial*!\n\nAntecipe seu agendamento para garantir seu horário com tranquilidade:\n👉 *Link de agendamento:* {link_agenda}\n📲 Dúvidas: {telefone}!\n\nAgradecemos a todos pela preferência! ❤️"
  },
  {
    id: "com_pos_atendimento",
    nome: "Agradecimento Pós-Atendimento & Avaliação",
    icone: "⭐",
    tipo: "pos_atendimento",
    texto:
      "Olá, {cliente}! Muito obrigado pela visita hoje na *{empresa}*! ❤️\n\nEsperamos que tenha gostado do seu atendimento com {profissional} ({servico})!\n\nSua satisfação é a nossa maior prioridade. Se puder nos avaliar ou indicar para os amigos, ficaremos muito felizes! Até o próximo corte/cuidado! 🌟✂️"
  }
];

interface ModalComunicadosAgendaProps {
  isOpen: boolean;
  onClose: () => void;
  companyName: string;
  companyPhone: string;
  clientAgendaUrl: string;
  agendamentos?: AgendamentoServico[];
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
  formatCurrency = (v) => `R$ ${Number(v || 0).toFixed(2).replace(".", ",")}`,
  showNotification = () => {}
}) => {
  const [selectedModeloId, setSelectedModeloId] = useState<string>("com_lembrete");
  const [comunicadoTexto, setComunicadoTexto] = useState<string>(() => {
    return (
      localStorage.getItem("pdv_msg_comunicado_custom") ||
      MODELOS_COMUNICADOS_PRONTOS[0].texto
    );
  });

  // Telefone e dados do destinatário teste/específico
  const [destinatarioNome, setDestinatarioNome] = useState("Cliente");
  const [destinatarioTelefone, setDestinatarioTelefone] = useState("");
  const [selectedAgendamentoId, setSelectedAgendamentoId] = useState<string>("");

  if (!isOpen) return null;

  // Se selecionou um agendamento da lista, preenche os dados automaticamente
  const agendamentoAlvo = agendamentos.find((a) => a.id === selectedAgendamentoId);

  const previewFormatado = comunicadoTexto
    .replace(/{cliente}/g, agendamentoAlvo ? agendamentoAlvo.clienteNome : destinatarioNome)
    .replace(/{empresa}/g, companyName || "Nossa Empresa")
    .replace(/{telefone}/g, companyPhone || "(21) 96671-3263")
    .replace(/{link_agenda}/g, clientAgendaUrl || "https://wa.me/5521966713263")
    .replace(/{data}/g, agendamentoAlvo ? agendamentoAlvo.data.split("-").reverse().join("/") : "Hoje")
    .replace(/{horario}/g, agendamentoAlvo ? agendamentoAlvo.horario : "14:00")
    .replace(/{profissional}/g, agendamentoAlvo ? agendamentoAlvo.profissionalNome : "Equipe")
    .replace(/{servico}/g, agendamentoAlvo ? agendamentoAlvo.servico : "Atendimento")
    .replace(/{valor}/g, agendamentoAlvo ? formatCurrency(agendamentoAlvo.valor) : "R$ 45,00");

  const handleCarregarModelo = (mod: ModeloComunicado) => {
    setSelectedModeloId(mod.id);
    setComunicadoTexto(mod.texto);
    showNotification(`Comunicado "${mod.nome}" carregado! 📢`, "info");
  };

  const handleCopiarTexto = () => {
    navigator.clipboard.writeText(previewFormatado);
    showNotification("Comunicado copiado com sucesso! 📋 Cole no Status ou no grupo do WhatsApp.", "success");
  };

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

  const handleSalvarComoPadrao = () => {
    localStorage.setItem("pdv_msg_comunicado_custom", comunicadoTexto.trim());
    showNotification("Texto do comunicado salvo como modelo padrão! 💾✅", "success");
  };

  const handleInserirTag = (tag: string) => {
    setComunicadoTexto((prev) => prev + ` ${tag} `);
  };

  return (
    <div className="fixed inset-0 z-[10060] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto text-left">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 bg-slate-950/90 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center shrink-0">
              <Megaphone className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-white font-black text-sm sm:text-base tracking-tight">
                  Comunicados & Lembretes da Agenda
                </h3>
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                  Prontos & Personalizáveis
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Envie lembretes de horários, avise sobre vagas abertas na semana ou envie mensagens personalizadas no WhatsApp.
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
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {/* 1. SELETOR DE MODELOS PRONTOS */}
          <div className="space-y-3">
            <span className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" /> Modelos Prontos de Comunicado:
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {MODELOS_COMUNICADOS_PRONTOS.map((mod) => (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => handleCarregarModelo(mod)}
                  className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition-all cursor-pointer group ${
                    selectedModeloId === mod.id
                      ? "bg-amber-500/20 border-amber-500/60 shadow-md shadow-amber-950/50"
                      : "bg-slate-950/70 border-white/5 hover:bg-slate-800/80 hover:border-white/15"
                  }`}
                >
                  <span className="text-xl shrink-0 group-hover:scale-110 transition-transform">
                    {mod.icone}
                  </span>
                  <div className="min-w-0">
                    <span className={`text-xs font-black block truncate ${
                      selectedModeloId === mod.id ? "text-amber-300" : "text-white"
                    }`}>
                      {mod.nome}
                    </span>
                    <span className="text-[10px] text-slate-400 line-clamp-2 mt-0.5">
                      {mod.texto.split("\n")[0]}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 2. ESCOLHER AGENDAMENTO ALVO (OPCIONAL) */}
          {agendamentos.length > 0 && (
            <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-white/5 space-y-2">
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

          {/* 3. TAGS DINÂMICAS PARA INSERÇÃO */}
          <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-white/5 space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              🏷️ Inserir dados dinâmicos no texto:
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => handleInserirTag("{cliente}")}
                className="px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-bold transition-all cursor-pointer"
              >
                + &#123;cliente&#125;
              </button>
              <button
                type="button"
                onClick={() => handleInserirTag("{empresa}")}
                className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all cursor-pointer"
              >
                + &#123;empresa&#125;
              </button>
              <button
                type="button"
                onClick={() => handleInserirTag("{data}")}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all cursor-pointer"
              >
                + &#123;data&#125;
              </button>
              <button
                type="button"
                onClick={() => handleInserirTag("{horario}")}
                className="px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold transition-all cursor-pointer"
              >
                + &#123;horario&#125;
              </button>
              <button
                type="button"
                onClick={() => handleInserirTag("{profissional}")}
                className="px-2.5 py-1 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 border border-orange-500/30 text-xs font-bold transition-all cursor-pointer"
              >
                + &#123;profissional&#125;
              </button>
              <button
                type="button"
                onClick={() => handleInserirTag("{servico}")}
                className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer"
              >
                + &#123;servico&#125;
              </button>
              <button
                type="button"
                onClick={() => handleInserirTag("{link_agenda}")}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black transition-all cursor-pointer"
              >
                + &#123;link_agenda&#125; 🔗
              </button>
              <button
                type="button"
                onClick={() => handleInserirTag("{telefone}")}
                className="px-2.5 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 text-xs font-bold transition-all cursor-pointer"
              >
                + &#123;telefone&#125;
              </button>
            </div>
          </div>

          {/* 4. EDITOR DE TEXTO DO COMUNICADO */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase text-slate-200 tracking-wider">
                Texto do Comunicado / Mensagem
              </label>
              <button
                type="button"
                onClick={handleSalvarComoPadrao}
                className="text-[10px] text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Save className="w-3 h-3" />
                <span>Salvar como meu modelo favorito</span>
              </button>
            </div>
            <textarea
              rows={7}
              value={comunicadoTexto}
              onChange={(e) => setComunicadoTexto(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-2xl p-3.5 text-xs text-white leading-relaxed outline-none focus:border-amber-500 font-sans"
              placeholder="Escreva ou ajuste seu comunicado da agenda..."
            />
          </div>

          {/* 5. PRÉVIA EM TEMPO REAL NO WHATSAPP */}
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
