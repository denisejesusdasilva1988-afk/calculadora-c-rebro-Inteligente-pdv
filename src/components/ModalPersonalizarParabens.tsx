/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Modal de Personalização de Mensagens de Parabéns aos Aniversariantes
 * Permite ao proprietário ou profissional:
 * 1. Gerenciar até 10 mensagens personalizadas gravadas na memória do app (localStorage + Firestore)
 * 2. Modelos prontos separados para Barbearia, Salão de Beleza, Manicure, Festas/Encomendas e Cupons
 * 3. Criar novas mensagens, editar livremente e apagar modelos que não deseja mais
 * 4. Inserir tags automáticas: {cliente}, {empresa}, {desconto}, {presente}, {telefone}, {link_agenda}
 * 5. Prévia em tempo real no WhatsApp e envio com 1 clique
 */

import React, { useState, useEffect } from "react";
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
  Copy,
  Plus,
  Trash2,
  Edit3,
  Send,
  Building2,
  AlertCircle
} from "lucide-react";

export interface ModeloParabens {
  id: string;
  nome: string;
  categoria:
    | "barbearia"
    | "salao"
    | "manicure"
    | "podologia"
    | "terapia_ocupacional"
    | "psicologia"
    | "nutricionista"
    | "festas"
    | "desconto"
    | "presente"
    | "carinhoso";
  icone: string;
  texto: string;
  isCustom?: boolean;
}

export const MODELOS_PARABENS_PRONTOS: ModeloParabens[] = [
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
    nome: "Manicure & Pedicure — Unhas de Princesa",
    categoria: "manicure",
    icone: "💅",
    texto:
      "Feliz Aniversário, {cliente}! 💅💖🎉\n\nA equipe da *{empresa}* deseja que seu novo ciclo seja radiante e cheio de motivos para sorrir!\n\nComo nosso presente carinhoso, você ganhou *{presente}* no seu atendimento de manicure/pedicure desta semana!\n\nVenha deixar suas unhas perfeitas para a comemoração! Marque seu horário: {telefone} 🥂✨"
  },
  {
    id: "mod_podologia",
    nome: "Podologia — Saúde, Conforto & Pés Leves",
    categoria: "podologia",
    icone: "🦶",
    texto:
      "Feliz Aniversário, {cliente}! 🦶✨🎂\n\nA equipe da *{empresa}* deseja a você um novo ano repleto de passos firmes, saúde e muitas realizações!\n\nPara celebrar o seu dia especial, você ganhou *{desconto}* em procedimento de podologia preventiva ou spa dos pés!\n\nVenha cuidar de quem te leva a todos os lugares. Agende sua sessão: {telefone} 👣❤️"
  },
  {
    id: "mod_terapia_ocupacional",
    nome: "Terapia Ocupacional — Celebração da Autonomia & Vida",
    categoria: "terapia_ocupacional",
    icone: "🧩",
    texto:
      "Parabéns pelo seu dia, querido(a) {cliente}! 🧩🎉🎂\n\nNós da *{empresa}* celebramos com muito carinho a sua história, sua autonomia e cada conquista do seu caminhar!\n\nQue este novo ciclo traga saúde, novas vitórias, bem-estar e momentos inesquecíveis!\n\nEstamos sempre juntos nessa jornada. Um grande e afetuoso abraço de toda a nossa equipe! Conte sempre conosco: {telefone} 💛✨"
  },
  {
    id: "mod_psicologia",
    nome: "Psicologia — Paz Interior, Saúde Emocional & Vida Plena",
    categoria: "psicologia",
    icone: "🧠",
    texto:
      "Feliz Aniversário, {cliente}! 🧠🌱🎂\n\nA equipe da *{empresa}* deseja que o seu novo ciclo seja marcado por paz de espírito, clareza, harmonia interior e dias leves!\n\nCuidar de si é o maior ato de amor próprio. Que você continue florescendo e celebrando a sua melhor versão!\n\nUm abraço acolhedor e cheio de luz em seu dia: {telefone} ✨🤍"
  },
  {
    id: "mod_nutricionista",
    nome: "Nutricionista — Vitalidade, Equilíbrio & Vida Saudável",
    categoria: "nutricionista",
    icone: "🥗",
    texto:
      "Parabéns pelo seu aniversário, {cliente}! 🥗🍎🎂\n\nA equipe da *{empresa}* deseja a você um novo ano repleto de energia vibrante, saúde plena, longevidade e sabor de viver bem!\n\nComo presente pelo seu dia, você ganhou *{presente}* no seu próximo acompanhamento nutricional!\n\nContinue firme nos seus objetivos e celebre com muito equilíbrio e alegria! WhatsApp: {telefone} 🥳🥦"
  },
  {
    id: "mod_festas",
    nome: "Festas & Encomendas — Bolo & Doces com Desconto",
    categoria: "festas",
    icone: "🍰",
    texto:
      "Viva, {cliente}! Parabéns pelo seu aniversário! 🍰🎈🎉\n\nA equipe da *{empresa}* deseja que seu dia seja repleto de doces surpresas e boas memórias!\n\nPara a sua festa ficar ainda mais saborosa, você ganhou *{desconto}* na encomenda do seu bolo de aniversário ou kit de salgados e docinhos!\n\nFaça seu pedido conosco e celebre com muito sabor: {telefone} 🎂✨"
  },
  {
    id: "mod_desconto",
    nome: "Cupom de Desconto Especial de Aniversário",
    categoria: "desconto",
    icone: "🎁",
    texto:
      "Olá, {cliente}! 🎂🎈\n\nA equipe da *{empresa}* deseja a você um FELIZ ANIVERSÁRIO repleto de saúde, paz e muitas alegrias! 🎉✨\n\nComo presente especial pelo seu dia, você ganhou *{desconto}* em qualquer serviço ou atendimento!\n\nVenha comemorar conosco e garantir seu desconto! Agende seu horário: {telefone} 🥳"
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

const STORAGE_KEY_LIST = "pdv_msg_parabens_lista_v2";

export function loadModelosParabens(): ModeloParabens[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_LIST);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.slice(0, 10);
      }
    }
  } catch {}
  return [...MODELOS_PARABENS_PRONTOS];
}

export function saveModelosParabens(lista: ModeloParabens[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_LIST, JSON.stringify(lista.slice(0, 10)));
  } catch (e) {
    console.warn("Erro ao salvar modelos de parabéns:", e);
  }
}

interface ModalPersonalizarParabensProps {
  isOpen: boolean;
  onClose: () => void;
  companyName: string;
  companyPhone: string;
  clientAgendaUrl?: string;
  destinatarioNome?: string;
  destinatarioTelefone?: string;
  initialCategoria?: string;
  onSaveMensagemPadrao?: (novaMensagem: string) => void;
  showNotification?: (msg: string, type: "success" | "error" | "info") => void;
}

export const ModalPersonalizarParabens: React.FC<ModalPersonalizarParabensProps> = ({
  isOpen,
  onClose,
  companyName,
  companyPhone,
  clientAgendaUrl,
  destinatarioNome = "Ana Clara",
  destinatarioTelefone = "",
  initialCategoria = "todos",
  onSaveMensagemPadrao,
  showNotification = (_msg?: string, _type?: "success" | "error" | "info") => {}
}) => {
  const [modelos, setModelos] = useState<ModeloParabens[]>(() => loadModelosParabens());
  const [selectedModeloId, setSelectedModeloId] = useState<string>(() => {
    const list = loadModelosParabens();
    return list[0]?.id || "mod_barbearia";
  });
  const [segmentFilter, setSegmentFilter] = useState<string>(initialCategoria || "todos");

  // Mensagem sendo editada
  const modeloAtual = modelos.find((m) => m.id === selectedModeloId) || modelos[0];
  const [nomeEdit, setNomeEdit] = useState<string>(modeloAtual?.nome || "Modelo de Parabéns");
  const [categoriaEdit, setCategoriaEdit] = useState<ModeloParabens["categoria"]>(modeloAtual?.categoria || "barbearia");
  const [iconeEdit, setIconeEdit] = useState<string>(modeloAtual?.icone || "🎂");
  const [textoEdit, setTextoEdit] = useState<string>(modeloAtual?.texto || "");

  // Atualizar inputs quando mudar o modelo selecionado
  useEffect(() => {
    if (modeloAtual) {
      setNomeEdit(modeloAtual.nome);
      setCategoriaEdit(modeloAtual.categoria);
      setIconeEdit(modeloAtual.icone);
      setTextoEdit(modeloAtual.texto);
    }
  }, [selectedModeloId]);

  const [descontoExemplo, setDescontoExemplo] = useState("15% de desconto");
  const [presenteExemplo, setPresenteExemplo] = useState("Hidratação Capilar Grátis");
  const [clienteExemplo, setClienteExemplo] = useState(destinatarioNome || "Cliente");

  if (!isOpen) return null;

  // Substituição de tags para prévia
  const previewFormatado = textoEdit
    .replace(/{cliente}/g, destinatarioNome || clienteExemplo)
    .replace(/{empresa}/g, companyName || "Nossa Empresa")
    .replace(/{telefone}/g, companyPhone || "WhatsApp da Empresa")
    .replace(/{link_agenda}/g, clientAgendaUrl || "Link da Agenda")
    .replace(/{desconto}/g, descontoExemplo)
    .replace(/{presente}/g, presenteExemplo);

  // 1. Salvar alterações no modelo atual
  const handleSalvarModeloAtual = () => {
    if (!textoEdit.trim()) {
      showNotification("O texto da mensagem não pode ficar vazio!", "error");
      return;
    }
    const updated = modelos.map((m) =>
      m.id === selectedModeloId
        ? {
            ...m,
            nome: nomeEdit.trim() || "Modelo Personalizado",
            categoria: categoriaEdit,
            icone: iconeEdit || "🎂",
            texto: textoEdit.trim()
          }
        : m
    );
    setModelos(updated);
    saveModelosParabens(updated);
    localStorage.setItem("pdv_msg_parabens_custom", textoEdit.trim());
    if (onSaveMensagemPadrao) onSaveMensagemPadrao(textoEdit.trim());
    showNotification("Mensagem gravada com sucesso na memória do app! 💾✅", "success");
  };

  // 2. Criar Nova Mensagem (Máximo 10)
  const handleCriarNovaMensagem = () => {
    if (modelos.length >= 10) {
      showNotification("Limite máximo de 10 mensagens atingido! Apague uma para cadastrar outra.", "error");
      return;
    }
    const novoId = `custom_parabens_${Date.now()}`;
    const novoModelo: ModeloParabens = {
      id: novoId,
      nome: `Minha Mensagem #${modelos.length + 1}`,
      categoria: "barbearia",
      icone: "🎂",
      texto:
        "Parabéns pelo seu dia, {cliente}! 🎂🎉\n\nA equipe da *{empresa}* te deseja muitas felicidades e saúde!\n\nVocê ganhou *{desconto}* de presente de aniversário! Venha comemorar conosco: {telefone} ❤️",
      isCustom: true
    };
    const updated = [...modelos, novoModelo];
    setModelos(updated);
    saveModelosParabens(updated);
    setSelectedModeloId(novoId);
    showNotification("Novo modelo de parabéns criado! Agora você pode personalizar o texto.", "success");
  };

  // 3. Apagar Modelo Selecionado
  const handleApagarModelo = (idParaApagar: string) => {
    if (modelos.length <= 1) {
      showNotification("Você precisa manter pelo menos 1 mensagem de parabéns cadastrada!", "error");
      return;
    }
    const mod = modelos.find((m) => m.id === idParaApagar);
    const updated = modelos.filter((m) => m.id !== idParaApagar);
    setModelos(updated);
    saveModelosParabens(updated);
    setSelectedModeloId(updated[0].id);
    showNotification(`Mensagem "${mod?.nome || "Modelo"}" apagada da memória! 🗑️`, "info");
  };

  // 4. Restaurar modelos originais de fábrica
  const handleRestaurarPadrao = () => {
    setModelos([...MODELOS_PARABENS_PRONTOS]);
    saveModelosParabens(MODELOS_PARABENS_PRONTOS);
    setSelectedModeloId(MODELOS_PARABENS_PRONTOS[0].id);
    showNotification("Modelos originais de parabéns restaurados com sucesso! 🔄", "success");
  };

  // 5. Inserir Tag
  const handleInserirTag = (tag: string) => {
    setTextoEdit((prev) => prev + ` ${tag} `);
  };

  // 6. Enviar no WhatsApp
  const handleEnviarWhatsApp = () => {
    const tel = destinatarioTelefone.replace(/\D/g, "");
    const msg = encodeURIComponent(previewFormatado);
    const waUrl = tel ? `https://wa.me/55${tel}?text=${msg}` : `https://wa.me/?text=${msg}`;
    window.open(waUrl, "_blank");
  };

  // 7. Copiar Texto
  const handleCopiarTexto = () => {
    navigator.clipboard.writeText(previewFormatado);
    showNotification("Mensagem copiada para a área de transferência! 📋 Cole no WhatsApp ou Instagram.", "success");
  };

  return (
    <div className="fixed inset-0 z-[10060] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto text-left">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 bg-slate-950/90 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-pink-500/20 border border-pink-500/40 text-pink-300 flex items-center justify-center shrink-0">
              <Cake className="w-5 h-5 text-pink-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-white font-black text-sm sm:text-base tracking-tight">
                  Parabéns Personalizados (Até 10 Mensagens)
                </h3>
                <span className="bg-pink-500/20 text-pink-300 border border-pink-500/40 text-[9.5px] font-black uppercase px-2 py-0.5 rounded-full">
                  {modelos.length} de 10 Cadastrados
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Personalize para Barbearia, Salão, Manicure e Festas. Grave na memória e apague quando quiser.
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
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          {/* 1. SELETOR E GERENCIADOR DE MENSAGENS (ATÉ 10) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-black uppercase tracking-wider text-pink-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-pink-400" /> Selecione a Mensagem para Editar ou Enviar:
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCriarNovaMensagem}
                  disabled={modelos.length >= 10}
                  className={`text-[11px] font-black px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                    modelos.length >= 10
                      ? "bg-slate-800 text-slate-500 cursor-not-allowed opacity-60"
                      : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/40"
                  }`}
                  title={modelos.length >= 10 ? "Limite máximo de 10 mensagens" : "Criar nova mensagem"}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Nova Mensagem ({modelos.length}/10)</span>
                </button>

                <button
                  type="button"
                  onClick={handleRestaurarPadrao}
                  className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 hover:underline cursor-pointer"
                  title="Restaurar mensagens de fábrica"
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
                { id: "manicure", label: "💅 Manicure" },
                { id: "podologia", label: "🦶 Podologia" },
                { id: "terapia_ocupacional", label: "🧩 T. Ocupacional" },
                { id: "psicologia", label: "🧠 Psicologia" },
                { id: "nutricionista", label: "🥗 Nutricionista" },
                { id: "festas", label: "🎂 Festas" }
              ].map((seg) => (
                <button
                  key={seg.id}
                  type="button"
                  onClick={() => setSegmentFilter(seg.id)}
                  className={`px-2.5 py-1 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                    segmentFilter === seg.id
                      ? "bg-pink-600 text-white shadow-md shadow-pink-900/40"
                      : "bg-slate-900 text-slate-400 hover:text-white border border-white/5"
                  }`}
                >
                  {seg.label}
                </button>
              ))}
            </div>

            {/* Grid dos Modelos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {modelos
                .filter((mod) => segmentFilter === "todos" || mod.categoria === segmentFilter)
                .map((mod) => (
                <div
                  key={mod.id}
                  onClick={() => setSelectedModeloId(mod.id)}
                  className={`p-3 rounded-2xl border text-left flex items-start justify-between gap-2 transition-all cursor-pointer relative ${
                    selectedModeloId === mod.id
                      ? "bg-pink-600/20 border-pink-500 shadow-lg shadow-pink-950/40 ring-1 ring-pink-500/50"
                      : "bg-slate-950/70 border-white/5 hover:bg-slate-800/80 hover:border-white/15"
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <span className="text-xl shrink-0 mt-0.5">{mod.icone || "🎂"}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-xs font-black truncate block ${
                          selectedModeloId === mod.id ? "text-pink-300" : "text-white"
                        }`}>
                          {mod.nome}
                        </span>
                      </div>
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
                      title="Apagar esta mensagem da memória"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 2. CAMPOS DE EDIÇÃO DO MODELO SELECIONADO */}
          <div className="bg-slate-950/70 p-4 rounded-2xl border border-white/10 space-y-3">
            <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2">
              <span className="text-xs font-black uppercase text-pink-300 flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5 text-pink-400" />
                <span>Editando: {nomeEdit}</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {textoEdit.length} caracteres
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-[10px] font-black uppercase text-slate-300">
                  Nome do Modelo / Título
                </label>
                <input
                  type="text"
                  value={nomeEdit}
                  onChange={(e) => setNomeEdit(e.target.value)}
                  placeholder="Ex: Barbearia - Aniversário VIP"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-pink-500 font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-300">
                  Segmento / Categoria
                </label>
                <select
                  value={categoriaEdit}
                  onChange={(e) => setCategoriaEdit(e.target.value as any)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-pink-500 font-bold"
                >
                  <option value="barbearia">💈 Barbearia</option>
                  <option value="salao">💇‍♀️ Salão de Beleza</option>
                  <option value="manicure">💅 Manicure & Pedicure</option>
                  <option value="podologia">🦶 Podologia</option>
                  <option value="terapia_ocupacional">🧩 Terapia Ocupacional</option>
                  <option value="psicologia">🧠 Psicologia</option>
                  <option value="nutricionista">🥗 Nutricionista</option>
                  <option value="festas">🎂 Festas & Encomendas</option>
                  <option value="desconto">🎁 Desconto / Cupom</option>
                  <option value="presente">⭐ Presente / Brinde</option>
                  <option value="carinhoso">❤️ Carinhoso</option>
                </select>
              </div>
            </div>

            {/* 3. TAGS DINÂMICAS */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">
                🏷️ Clique para inserir tags automáticas no texto:
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
                  title="Nome da sua empresa"
                >
                  + &#123;empresa&#125;
                </button>
                <button
                  type="button"
                  onClick={() => handleInserirTag("{desconto}")}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all cursor-pointer"
                  title="Cupom ou desconto oferecido"
                >
                  + &#123;desconto&#125;
                </button>
                <button
                  type="button"
                  onClick={() => handleInserirTag("{presente}")}
                  className="px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold transition-all cursor-pointer"
                  title="Brinde especial"
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
                <button
                  type="button"
                  onClick={() => handleInserirTag("{link_agenda}")}
                  className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer"
                  title="Link direto da agenda do cliente"
                >
                  + &#123;link_agenda&#125;
                </button>
              </div>
            </div>

            {/* Textarea Espaçoso */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase text-pink-300 tracking-wider">
                  Texto da Mensagem (Espaçoso para Escrever à Vontade ✍️):
                </label>
                <span className="text-slate-400 font-mono text-[9.5px] bg-slate-800 px-2 py-0.5 rounded-md">
                  {textoEdit.length} caracteres
                </span>
              </div>
              <textarea
                rows={9}
                value={textoEdit}
                onChange={(e) => setTextoEdit(e.target.value)}
                className="w-full bg-slate-900 border-2 border-white/10 focus:border-pink-500 rounded-2xl p-4 text-sm text-white leading-relaxed outline-none font-sans min-h-[190px] shadow-inner transition-all"
                placeholder="Escreva a mensagem personalizada de aniversário com todo o carinho e detalhes..."
              />
            </div>

            <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
              <button
                type="button"
                onClick={handleSalvarModeloAtual}
                className="px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md shadow-pink-900/30 cursor-pointer active:scale-95"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Salvar Esta Mensagem na Memória 💾</span>
              </button>

              {modelos.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleApagarModelo(selectedModeloId)}
                  className="px-3 py-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Apagar Mensagem</span>
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
                  <span>10:30</span>
                  <Check className="w-3 h-3 text-sky-400" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
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
              <span>Copiar Mensagem</span>
            </button>

            <button
              type="button"
              onClick={handleEnviarWhatsApp}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-950/40 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Enviar no WhatsApp 🎉</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
