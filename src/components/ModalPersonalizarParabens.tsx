/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Modal de Personalização da Mensagem de Parabéns aos Aniversariantes
 * Permite ao proprietário ou profissional:
 * 1. Escolher entre vários modelos prontos (Desconto, Presente, Barbearia, Salão, Manicure, Festas)
 * 2. Personalizar o texto livremente com tags dinâmicas ({cliente}, {empresa}, {presente}, {desconto}, {telefone})
 * 3. Pré-visualizar em tempo real como a mensagem chegará no WhatsApp
 * 4. Salvar permanentemente para uso em 1 clique
 */

import React, { useState } from "react";
import {
  X,
  Cake,
  Sparkles,
  Save,
  RotateCcw,
  Check,
  MessageCircle,
  Scissors,
  Heart,
  Gift,
  Percent,
  Copy
} from "lucide-react";

export interface ModeloParabens {
  id: string;
  nome: string;
  categoria: "desconto" | "presente" | "barbearia" | "salao" | "manicure" | "festas" | "carinhoso";
  icone: string;
  texto: string;
}

export const MODELOS_PARABENS_PRONTOS: ModeloParabens[] = [
  {
    id: "mod_desconto",
    nome: "Desconto Especial de Aniversário",
    categoria: "desconto",
    icone: "🎁",
    texto:
      "Olá, {cliente}! 🎂🎈\n\nA equipe da *{empresa}* deseja a você um FELIZ ANIVERSÁRIO repleto de saúde, paz e muitas alegrias! 🎉✨\n\nComo presente especial pelo seu dia, você ganhou *{desconto}* em qualquer serviço ou atendimento!\n\nVenha comemorar conosco e garantir seu desconto! Agende seu horário: {telefone} 🥳"
  },
  {
    id: "mod_presente",
    nome: "Presente / Brinde VIP Exclusivo",
    categoria: "presente",
    icone: "⭐",
    texto:
      "Parabéns pelo seu aniversário, {cliente}! 🥳🎂\n\nNós da *{empresa}* preparamos um mimo muito especial para comemorar essa data tão marcante com você: você ganhou *{presente}*!\n\nVenha nos visitar e retirar seu presente da semana! Agende ou fale conosco no WhatsApp: {telefone} ❤️"
  },
  {
    id: "mod_barbearia",
    nome: "Barbearia — Trato no Visual de Respeito",
    categoria: "barbearia",
    icone: "💈",
    texto:
      "Fala, {cliente}! Parabéns pelo seu dia, meu nobre! 🎂💈✂️\n\nA equipe da *{empresa}* te deseja muito sucesso, saúde e prosperidade!\n\nPara comemorar em grande estilo, seu visual do aniversário tem *{desconto}* de presente aqui na barbearia. Venha dar aquele talento no corte e na barba!\n\nAgende sua vaga direto pelo WhatsApp: {telefone} 👊🔥"
  },
  {
    id: "mod_salao",
    nome: "Salão de Beleza — Dia de Rainha & Cuidado",
    categoria: "salao",
    icone: "💇‍♀️",
    texto:
      "Parabéns, {cliente} linda! 🌸✨🎂\n\nNeste dia tão abençoado, a equipe do *{empresa}* deseja a você muitas felicidades, luz e realizações!\n\nVocê merece um momento especial de autocuidado hoje: ganhou *{desconto}* em escova, hidratação ou qualquer serviço do nosso salão!\n\nVenha realçar ainda mais a sua beleza. Reserve seu momento: {telefone} 💖"
  },
  {
    id: "mod_manicure",
    nome: "Manicure & Esmalteria — Unhas de Princesa",
    categoria: "manicure",
    icone: "💅",
    texto:
      "Feliz Aniversário, {cliente}! 💅💖🎉\n\nA equipe da *{empresa}* deseja que seu novo ciclo seja radiante e cheio de motivos para sorrir!\n\nComo nosso presente carinhoso, você ganhou *{presente}* no seu atendimento de manicure/pedicure desta semana!\n\nVenha deixar suas unhas perfeitas para a comemoração! Marque seu horário: {telefone} 🥂✨"
  },
  {
    id: "mod_festas",
    nome: "Festas & Confeitaria — Dia Doce & Comemoração",
    categoria: "festas",
    icone: "🍰",
    texto:
      "Viva, {cliente}! Parabéns pelo seu aniversário! 🍰🎈🎉\n\nA equipe da *{empresa}* deseja que seu dia seja repleto de doces surpresas e boas memórias!\n\nPara a sua festa ficar ainda mais saborosa, você ganhou *{desconto}* na encomenda do seu bolo de aniversário ou kit de salgados e docinhos!\n\nFaça seu pedido conosco e celebre com muito sabor: {telefone} 🎂✨"
  },
  {
    id: "mod_carinhoso",
    nome: "Mensagem Carinhosa & Acolhedora",
    categoria: "carinhoso",
    icone: "❤️",
    texto:
      "Querido(a) {cliente}, um FELIZ ANIVERSÁRIO muito carinhoso de toda a equipe da *{empresa}*! 🎂✨\n\nÉ um imenso privilégio ter você como nosso(a) cliente e amigo(a). Que o seu novo ano traga saúde de ferro, momentos inesquecíveis e grandes vitórias!\n\nEstamos de braços abertos para te receber e celebrar juntos: {telefone}! Um grande abraço! 🤗🎉"
  }
];

interface ModalPersonalizarParabensProps {
  isOpen: boolean;
  onClose: () => void;
  companyName: string;
  companyPhone: string;
  onSaveMensagemPadrao: (novaMensagem: string) => void;
  mensagemAtual?: string;
  showNotification?: (msg: string, type: "success" | "error" | "info") => void;
}

export const ModalPersonalizarParabens: React.FC<ModalPersonalizarParabensProps> = ({
  isOpen,
  onClose,
  companyName,
  companyPhone,
  onSaveMensagemPadrao,
  mensagemAtual,
  showNotification = () => {}
}) => {
  const [mensagemTexto, setMensagemTexto] = useState<string>(() => {
    return (
      mensagemAtual ||
      localStorage.getItem("pdv_msg_parabens_custom") ||
      MODELOS_PARABENS_PRONTOS[0].texto
    );
  });

  const [descontoExemplo, setDescontoExemplo] = useState("15% de desconto");
  const [presenteExemplo, setPresenteExemplo] = useState("Hidratação Capilar Grátis");
  const [clienteExemplo, setClienteExemplo] = useState("Ana Clara");

  if (!isOpen) return null;

  // Substituição de tags para prévia
  const previewFormatado = mensagemTexto
    .replace(/{cliente}/g, clienteExemplo)
    .replace(/{empresa}/g, companyName || "Nossa Empresa")
    .replace(/{telefone}/g, companyPhone || "(21) 96671-3263")
    .replace(/{desconto}/g, descontoExemplo)
    .replace(/{presente}/g, presenteExemplo);

  const handleAplicarModelo = (modelo: ModeloParabens) => {
    setMensagemTexto(modelo.texto);
    showNotification(`Modelo "${modelo.nome}" carregado no editor! 🎂✨`, "info");
  };

  const handleSalvar = () => {
    if (!mensagemTexto.trim()) {
      showNotification("A mensagem não pode ficar vazia!", "error");
      return;
    }
    localStorage.setItem("pdv_msg_parabens_custom", mensagemTexto.trim());
    onSaveMensagemPadrao(mensagemTexto.trim());
    showNotification("Mensagem de aniversário personalizada salva com sucesso! 🎂✅", "success");
    onClose();
  };

  const handleRestaurarPadrao = () => {
    const padrao = MODELOS_PARABENS_PRONTOS[0].texto;
    setMensagemTexto(padrao);
    localStorage.removeItem("pdv_msg_parabens_custom");
    showNotification("Restaurado para o modelo padrão! 🔄", "info");
  };

  const handleInserirTag = (tag: string) => {
    setMensagemTexto((prev) => prev + ` ${tag} `);
  };

  return (
    <div className="fixed inset-0 z-[10060] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto text-left">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 bg-slate-950/90 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-pink-500/20 border border-pink-500/40 text-pink-300 flex items-center justify-center shrink-0">
              <Cake className="w-5 h-5 text-pink-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-white font-black text-sm sm:text-base tracking-tight">
                  Personalizar Mensagem de Parabéns (WhatsApp)
                </h3>
                <span className="bg-pink-500/20 text-pink-300 border border-pink-500/40 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                  Fidelização
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Escolha um modelo pronto ou escreva sua própria mensagem com tags automáticas.
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

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {/* 1. SELEÇÃO DE MODELOS PRONTOS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-pink-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-pink-400" /> Modelos Prontos por Nicho (Toque para Carregar):
              </span>
              <button
                type="button"
                onClick={handleRestaurarPadrao}
                className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 hover:underline cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Restaurar Padrão</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {MODELOS_PARABENS_PRONTOS.map((mod) => (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => handleAplicarModelo(mod)}
                  className="p-3 rounded-2xl bg-slate-950/70 hover:bg-slate-800/80 border border-white/5 hover:border-pink-500/40 transition-all text-left flex items-start gap-2.5 cursor-pointer group"
                >
                  <span className="text-xl shrink-0 group-hover:scale-110 transition-transform">
                    {mod.icone}
                  </span>
                  <div className="min-w-0">
                    <span className="text-xs font-black text-white group-hover:text-pink-300 transition-colors block truncate">
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

          {/* 2. TAGS DINÂMICAS PARA INSERIR */}
          <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-white/5 space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              🏷️ Clique nas etiquetas para inserir na sua mensagem:
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => handleInserirTag("{cliente}")}
                className="px-2.5 py-1 rounded-lg bg-pink-500/10 hover:bg-pink-500/20 text-pink-300 border border-pink-500/30 text-xs font-bold transition-all cursor-pointer"
                title="Nome do aniversariante"
              >
                + &#123;cliente&#125;
              </button>
              <button
                type="button"
                onClick={() => handleInserirTag("{empresa}")}
                className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all cursor-pointer"
                title="Nome da empresa"
              >
                + &#123;empresa&#125;
              </button>
              <button
                type="button"
                onClick={() => handleInserirTag("{desconto}")}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all cursor-pointer"
                title="Desconto oferecido"
              >
                + &#123;desconto&#125;
              </button>
              <button
                type="button"
                onClick={() => handleInserirTag("{presente}")}
                className="px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold transition-all cursor-pointer"
                title="Brinde ou presente"
              >
                + &#123;presente&#125;
              </button>
              <button
                type="button"
                onClick={() => handleInserirTag("{telefone}")}
                className="px-2.5 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 text-xs font-bold transition-all cursor-pointer"
                title="WhatsApp da sua empresa"
              >
                + &#123;telefone&#125;
              </button>
            </div>
          </div>

          {/* 3. EDITOR DE TEXTO DA MENSAGEM */}
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase text-slate-200 tracking-wider flex items-center justify-between">
              <span>Mensagem de Aniversário (Texto do WhatsApp)</span>
              <span className="text-[10px] text-slate-400 font-mono">
                {mensagemTexto.length} caracteres
              </span>
            </label>
            <textarea
              rows={6}
              value={mensagemTexto}
              onChange={(e) => setMensagemTexto(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-2xl p-3.5 text-xs text-white leading-relaxed outline-none focus:border-pink-500 font-sans"
              placeholder="Escreva a mensagem que será enviada aos aniversariantes..."
            />
          </div>

          {/* 4. PRÉVIA EM TEMPO REAL NO WHATSAPP */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
                <MessageCircle className="w-4 h-4 text-emerald-400" /> Prévia da Mensagem no WhatsApp:
              </span>
              <span className="text-[10px] text-slate-400">
                Simulação com cliente <strong>{clienteExemplo}</strong>
              </span>
            </div>

            <div className="bg-[#0b141a] p-4 rounded-2xl border border-white/10 relative overflow-hidden shadow-inner">
              <div className="bg-[#005c4b] text-[#e9edef] rounded-2xl rounded-tr-none p-3.5 max-w-lg ml-auto text-xs whitespace-pre-wrap leading-relaxed shadow font-sans border border-emerald-500/20">
                {previewFormatado}
                <div className="text-[9px] text-emerald-200/60 text-right mt-1.5 flex items-center justify-end gap-1 font-mono">
                  <span>10:30</span>
                  <Check className="w-3 h-3 text-sky-400" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-slate-950/90 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 text-xs font-bold transition-all cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSalvar}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-pink-900/30 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Salvar Mensagem Padrão 🎂</span>
          </button>
        </div>
      </div>
    </div>
  );
};
