import React, { useState, useEffect } from "react";
import { ai } from "../App";
import { motion, AnimatePresence } from "motion/react";
import {
  BookOpen,
  Sparkles,
  Lightbulb,
  Plus,
  Check,
  CheckCircle2,
  Trash2,
  HelpCircle,
  Send,
  Terminal,
  ArrowRight,
  RotateCcw,
  FileText,
  Star,
  ThumbsUp,
  ChevronDown,
  ShoppingBag,
  DollarSign,
  Calculator,
  AlertCircle,
  Store,
  MessageSquare
} from "lucide-react";
import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  doc, 
  increment, 
  query, 
  orderBy, 
  limit,
  onSnapshot
} from "firebase/firestore";

interface AjudaManualProps {
  db: any;
  user: any;
  ai: any;
  showNotification: (msg: string, type: "success" | "error" | "info") => void;
}

interface UserSuggestion {
  id: string;
  title: string;
  description: string;
  author: string;
  votes: number;
  timestamp: number;
  isCustom?: boolean;
}

export const AjudaManual: React.FC<AjudaManualProps> = ({
  db,
  user,
  ai,
  showNotification
}) => {
  const [activeTab, setActiveTab] = useState<"tutorial" | "retro" | "sugestoes" | "cerebro">("tutorial");

  // --- TAB 1: Retro Supermarket Simulator State ---
  const [retroPLU, setRetroPLU] = useState("");
  const [retroQty, setRetroQty] = useState("1");
  const [terminalLog, setTerminalLog] = useState<string[]>([
    "SISTEMA REGISTRADOR ITAUTEC S3000 v1.82",
    "SELECIONADO: MODO OPERADOR DE CAIXA EM TREINAMENTO",
    "PRONTO PARA OPERAR. DIGITE O CÓDIGO PLU E APERTE ENTER."
  ]);
  const [simulatedReceipt, setSimulatedReceipt] = useState<{ name: string; qty: number; price: number; total: number }[]>([]);
  const [currentTask, setCurrentTask] = useState<{ description: string; targetItems: { plu: string; qty: number }[]; isCompleted: boolean }>({
    description: "REGISTRE: 2 un. de Pão Francês (PLU 101) e 1 un. de Coca-Cola Lata (PLU 201).",
    targetItems: [
      { plu: "101", qty: 2 },
      { plu: "201", qty: 1 }
    ],
    isCompleted: false
  });
  const [retroFeedback, setRetroFeedback] = useState<string | null>(null);

  // Retro PLU Directory
  const retroProducts: { [key: string]: { name: string; price: number } } = {
    "101": { name: "PAO FRANCES KG", price: 14.90 },
    "102": { name: "BANANA PRATA KG", price: 6.50 },
    "103": { name: "TOMATE ITALIANO KG", price: 8.90 },
    "104": { name: "ARROZ TIO JOAO 1KG", price: 5.80 },
    "201": { name: "COCA COLA LATA 350ML", price: 4.50 },
    "202": { name: "LEITE INTEGRAL 1L", price: 5.20 },
    "301": { name: "SABAO EM PO OMO 1KG", price: 16.90 },
    "401": { name: "SACOLA PLASTICA UN", price: 0.25 }
  };

  // Sound effects simulator text
  const triggerBip = () => {
    setRetroFeedback("🔊 *BIIIP!* (Item registrado com sucesso)");
    setTimeout(() => setRetroFeedback(null), 1500);
  };
  const triggerChin = () => {
    setRetroFeedback("🔊 *CRAC-CHINNN!* (Gaveta de dinheiro aberta)");
    setTimeout(() => setRetroFeedback(null), 2500);
  };

  // --- TAB 2: Custom / Cloud suggestions ---
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [votedIds, setVotedIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("ajuda_voted_ids") || "[]");
    } catch {
      return [];
    }
  });

  // Default suggested improvements that users can vote on
  const defaultSuggestions: UserSuggestion[] = [
    {
      id: "def_barcode",
      title: "Leitor de Código de Barras via Câmera 📸",
      description: "Permite usar a câmera do celular como leitor de códigos de barras (EAN-13) para bipar e adicionar mercadorias automaticamente ao estoque ou ao carrinho de compras.",
      author: "Cérebro Inteligente",
      votes: 38,
      timestamp: 1718000000000
    },
    {
      id: "def_thermal",
      title: "Impressão de Cupom Não Fiscal via Bluetooth 🖨️",
      description: "Integração direta com mini impressoras térmicas portáteis de 58mm (comunicação bluetooth) para emitir a via impressa do cliente na hora da venda no PDV.",
      author: "Cérebro Inteligente",
      votes: 27,
      timestamp: 1718000001000
    },
    {
      id: "def_graphs",
      title: "Painel com Gráficos Financeiros & DRE 📊",
      description: "Criação de um painel de inteligência comercial com gráficos de barras para faturamento, despesas e lucro líquido mensal, auxiliando no fechamento de caixa.",
      author: "Cérebro Inteligente",
      votes: 31,
      timestamp: 1718000002000
    },
    {
      id: "def_cashier_restrict",
      title: "Contas de Funcionários com Permissão Limitada 🔐",
      description: "Permitir que o proprietário crie senhas para 'Operadores de Caixa' que só podem realizar vendas no PDV, mas não conseguem mexer no estoque ou visualizar a margem de lucro real.",
      author: "Cérebro Inteligente",
      votes: 19,
      timestamp: 1718000003000
    },
    {
      id: "def_whatsapp_bulk",
      title: "Disparador de Encarte de Ofertas no WhatsApp 📱",
      description: "Ferramenta para gerar automaticamente um panfleto digital elegante com as ofertas cadastradas e compartilhar de uma vez só com a lista de transmissão de clientes no WhatsApp.",
      author: "Cérebro Inteligente",
      votes: 24,
      timestamp: 1718000004000
    }
  ];

  // --- TAB 3: Brain AI Suggestion Generator State ---
  const [aiIdea, setAiIdea] = useState<string | null>(null);
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  // Sync / Listen to Suggestions from Firebase
  useEffect(() => {
    if (!db || !user || user.uid === "guest_visitor") {
      // Local fallback if Firebase not available or guest visitor
      const localSugs = JSON.parse(localStorage.getItem("ajuda_custom_sugestoes") || "[]");
      setSuggestions([...defaultSuggestions, ...localSugs]);
      return;
    }

    try {
      const q = query(collection(db, "sugestoes_melhorias"), orderBy("votes", "desc"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fbSuggestions: UserSuggestion[] = [];
        snapshot.forEach((doc) => {
          fbSuggestions.push({ id: doc.id, ...doc.data() } as UserSuggestion);
        });

        // Merge defaults (stored locally or handled uniquely) and firestore suggestions
        // To prevent duplication, we check IDs
        const customIds = fbSuggestions.map(s => s.id);
        const nonDuplicatedDefaults = defaultSuggestions.filter(d => !customIds.includes(d.id));
        
        // Combine them
        const combined = [...fbSuggestions, ...nonDuplicatedDefaults].sort((a, b) => b.votes - a.votes);
        setSuggestions(combined);
      }, (error) => {
        console.error("Erro ao sincronizar sugestões do Firebase:", error);
        // Fallback to local
        const localSugs = JSON.parse(localStorage.getItem("ajuda_custom_sugestoes") || "[]");
        setSuggestions([...defaultSuggestions, ...localSugs].sort((a, b) => b.votes - a.votes));
      });

      return () => unsubscribe();
    } catch (e) {
      console.error("Erro no Listener do Firestore:", e);
    }
  }, [db]);

  // Handle submit new suggestion
  const handleSubmitSuggestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDesc.trim()) {
      showNotification("Por favor, preencha todos os campos da sugestão!", "error");
      return;
    }

    setIsSubmitting(true);
    const finalAuthor = authorName.trim() || "Comerciante Anônimo";
    const suggestionData = {
      title: newTitle.trim(),
      description: newDesc.trim(),
      author: finalAuthor,
      votes: 1, // Start with 1 vote from author
      timestamp: Date.now(),
      isCustom: true
    };

    try {
      if (db && user && user.uid !== "guest_visitor") {
        // Save to Firebase
        await addDoc(collection(db, "sugestoes_melhorias"), suggestionData);
        showNotification("Sua sugestão foi enviada com sucesso para a nuvem! ☁️✨", "success");
      } else {
        // Local fallback
        const localSugs = JSON.parse(localStorage.getItem("ajuda_custom_sugestoes") || "[]");
        const newSug = { ...suggestionData, id: "local_" + Date.now() };
        const updated = [...localSugs, newSug];
        localStorage.setItem("ajuda_custom_sugestoes", JSON.stringify(updated));
        setSuggestions([...updated, ...defaultSuggestions].sort((a, b) => b.votes - a.votes));
        showNotification("Sugestão salva localmente no navegador! 👍", "success");
      }

      setNewTitle("");
      setNewDesc("");
      setAuthorName("");
    } catch (error) {
      console.error("Erro ao salvar sugestão:", error);
      showNotification("Ocorreu um erro ao enviar sua sugestão. Salvando em modo offline...", "info");
      
      // Fallback
      const localSugs = JSON.parse(localStorage.getItem("ajuda_custom_sugestoes") || "[]");
      const newSug = { ...suggestionData, id: "local_err_" + Date.now() };
      const updated = [...localSugs, newSug];
      localStorage.setItem("ajuda_custom_sugestoes", JSON.stringify(updated));
      setSuggestions([...updated, ...defaultSuggestions].sort((a, b) => b.votes - a.votes));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Upvote suggestion
  const handleVote = async (id: string, isCustom?: boolean) => {
    if (votedIds.includes(id)) {
      showNotification("Você já votou nesta sugestão de melhoria!", "info");
      return;
    }

    const nextVoted = [...votedIds, id];
    setVotedIds(nextVoted);
    localStorage.setItem("ajuda_voted_ids", JSON.stringify(nextVoted));

    try {
      if (db && user && user.uid !== "guest_visitor" && !id.startsWith("def_") && !id.startsWith("local_")) {
        // Update on Firestore
        const docRef = doc(db, "sugestoes_melhorias", id);
        await updateDoc(docRef, {
          votes: increment(1)
        });
        showNotification("Voto computado na nuvem! Obrigado pela participação. 🗳️", "success");
      } else {
        // Update local state or local storage
        if (id.startsWith("local_") || id.startsWith("def_") || id.startsWith("local_err_")) {
          // If default
          const updated = suggestions.map(s => {
            if (s.id === id) {
              return { ...s, votes: s.votes + 1 };
            }
            return s;
          });
          setSuggestions(updated.sort((a, b) => b.votes - a.votes));
          
          // Save back if it was local custom
          if (id.startsWith("local_")) {
            const localSugs = JSON.parse(localStorage.getItem("ajuda_custom_sugestoes") || "[]");
            const localUpdated = localSugs.map((s: any) => {
              if (s.id === id) return { ...s, votes: s.votes + 1 };
              return s;
            });
            localStorage.setItem("ajuda_custom_sugestoes", JSON.stringify(localUpdated));
          }
          showNotification("Voto computado! 👍", "success");
        }
      }
    } catch (err) {
      console.error("Erro ao registrar voto:", err);
      showNotification("Voto registrado localmente devido a um atraso de conexão.", "info");
    }
  };

  // Simulate retro cashier item input
  const handleRegisterRetroItem = () => {
    const code = retroPLU.trim();
    const qty = parseInt(retroQty) || 1;

    if (!code) return;

    if (!retroProducts[code]) {
      setTerminalLog(prev => [
        ...prev,
        `> ERRO: CODIGO PLU [${code}] NAO CADASTRADO NO SISTEMA!`,
        `> CONSULTE A LISTA DE CODIGOS ABAIXO.`
      ]);
      setRetroPLU("");
      return;
    }

    const item = retroProducts[code];
    const totalItem = item.price * qty;

    triggerBip();

    setSimulatedReceipt(prev => [
      ...prev,
      { name: item.name, qty, price: item.price, total: totalItem }
    ]);

    setTerminalLog(prev => [
      ...prev,
      `> REG: ${qty} x ${item.name} a R$ ${item.price.toFixed(2)} = R$ ${totalItem.toFixed(2)}`
    ]);

    // Check task progress
    const updatedReceipt = [...simulatedReceipt, { name: item.name, qty, price: item.price, total: totalItem }];
    verifyTaskProgress(updatedReceipt);

    setRetroPLU("");
    setRetroQty("1");
  };

  const verifyTaskProgress = (receipt: any[]) => {
    // Check if the registered items match the task requirements
    let matchedBread = 0;
    let matchedCoca = 0;

    receipt.forEach(item => {
      if (item.name.includes("PAO FRANCES")) {
        matchedBread += item.qty;
      }
      if (item.name.includes("COCA COLA LATA")) {
        matchedCoca += item.qty;
      }
    });

    if (matchedBread >= 2 && matchedCoca >= 1) {
      setCurrentTask(prev => ({ ...prev, isCompleted: true }));
      setTerminalLog(prev => [
        ...prev,
        `===================================`,
        `🌟 TAREFA DE TREINAMENTO CONCLUIDA! 🌟`,
        `VOCE COMPLETOU O REGISTRO DO CLIENTE COM SUCESSO!`,
        `AP Aperte o botao de FECHAR CAIXA abaixo para emitir o som retro.`,
        `===================================`
      ]);
    }
  };

  const handleClearTerminal = () => {
    setSimulatedReceipt([]);
    setTerminalLog([
      "CONSOLe LIMPA.",
      "AGUARDANDO NOVO CLIENTE. OPERADOR PRONTO."
    ]);
    setCurrentTask({
      description: "REGISTRE: 2 un. de Pão Francês (PLU 101) e 1 un. de Coca-Cola Lata (PLU 201).",
      targetItems: [
        { plu: "101", qty: 2 },
        { plu: "201", qty: 1 }
      ],
      isCompleted: false
    });
  };

  const handleCloseCashier = () => {
    if (simulatedReceipt.length === 0) {
      showNotification("Nenhum item registrado no cupom para fechar!", "error");
      return;
    }
    triggerChin();
    const grandTotal = simulatedReceipt.reduce((acc, curr) => acc + curr.total, 0);
    setTerminalLog(prev => [
      ...prev,
      `-----------------------------------`,
      `TOTAL DA COMPRA: R$ ${grandTotal.toFixed(2)}`,
      `PAGO EM: DINHEIRO`,
      `TROCO: R$ 0,00`,
      `GAVETA DE DINHEIRO LIBERADA!`,
      `OBRIGADO PELA PREFERENCIA. VOLTE SEMPRE!`,
      `-----------------------------------`
    ]);
  };

  // Brain AI Ideas generator
  const handleGenerateAiIdea = async () => {
    if (!ai) {
      showNotification("A IA está offline. Conecte sua chave de API.", "error");
      return;
    }

    setIsAiGenerating(true);
    setAiIdea(null);

    const prompt = `Você é o "Cérebro Inteligente", mentor especialista em desenvolvimento de software e inovação para comércios de bairro.
Estamos em um aplicativo de controle de mercado que possui os seguintes módulos:
1. Calculadora Especial de Compras (Calcula peso, quantidade, compara marcas e avisa limite de orçamento)
2. Bloco de Notas Integrado (Para anotações gerais)
3. Calculadora Normal (Para contas rápidas com histórico)
4. Catálogo de Itens do Mercado (Lista de produtos predefinidos por nicho de negócio, ex: Padaria, Hortifruti, Mercearia, com controle inteligente de estoque, margens de lucro, alertas de estoque crítico, etc.)
5. Mural de Ofertas (Para criar cartazes de ofertas e folhetos de promoção)
6. Pastas de Verificação (Para auditar listas inteiras comparando com planilhas Excel)
7. Agenda & Compromissos de Fornecedores
8. Bloquinho de Notinha e Recibo de Brechó
9. Frente de Caixa (PDV) com balanço de vendas diárias, fluxo de caixa e relatórios.

O usuário quer uma sugestão de melhoria técnica de alto nível que seja EXTREMAMENTE criativa, útil e inovadora especificamente inspirada no funcionamento antigo de supermercados de bairro (como os operadores de caixa, cadernetas de fiado, etiquetas manuais, etc.), mas adaptada para a era da inteligência artificial.

Forneça uma única ideia inovadora contendo:
1. **Nome da Nova Funcionalidade** (chamativo, ex: "Caderneta Digital de Fiado com Lembrete de Cobrança IA" ou "Leitor de Código de Barras por Inteligência Artificial").
2. **Qual é o problema que ela resolve**.
3. **Como funciona na prática** (curto e didático).
4. **Benefício para o comerciante pequeno**.

Responda em português do Brasil com cabeçalhos bonitos e curtos em markdown. Não use introduções formais. Vá direto ao ponto.`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          { parts: [{ text: prompt }] }
        ]
      });

      const text = response.text;
      if (text) {
        setAiIdea(text);
        showNotification("A IA do Cérebro gerou uma sugestão genial! 🧠💡", "success");
      } else {
        throw new Error("Resposta da IA vazia");
      }
    } catch (err) {
      console.error("Erro ao gerar ideia com IA:", err);
      showNotification("Não foi possível consultar o Cérebro Inteligente agora. Tente novamente.", "error");
    } finally {
      setIsAiGenerating(false);
    }
  };

  const renderMarkdownText = (text: string) => {
    return text.split("\n").map((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={idx} className="h-2" />;
      
      if (trimmed.startsWith("###")) {
        return <h5 key={idx} className="text-xs font-black text-amber-500 mt-3 mb-1 uppercase tracking-wider">{trimmed.replace("###", "").replace(/\*/g, "").trim()}</h5>;
      }
      if (trimmed.startsWith("##")) {
        return <h4 key={idx} className="text-sm font-black text-white mt-4 mb-2 border-b border-white/10 pb-1.5 uppercase tracking-wider">{trimmed.replace("##", "").replace(/\*/g, "").trim()}</h4>;
      }
      if (trimmed.startsWith("#")) {
        return <h3 key={idx} className="text-base font-black text-cyan-400 mt-5 mb-2.5 uppercase tracking-widest">{trimmed.replace("#", "").replace(/\*/g, "").trim()}</h3>;
      }
      if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
        const content = trimmed.substring(1).trim();
        return (
          <div key={idx} className="flex items-start gap-2 text-xs text-slate-300 leading-relaxed mt-1">
            <span className="text-cyan-400 mt-1 shrink-0">•</span>
            <span>{content}</span>
          </div>
        );
      }
      return (
        <p key={idx} className="text-xs text-slate-300 leading-relaxed mt-1">
          {trimmed}
        </p>
      );
    });
  };

  return (
    <motion.div
      key="manual_ajuda"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="p-4 sm:p-8 space-y-6 bg-slate-950 border border-white/5 rounded-3xl min-h-[70vh] text-left pb-32"
    >
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center text-slate-950 shadow-lg shadow-cyan-500/20">
            <BookOpen className="w-6 h-6 font-bold" />
          </div>
          <div>
            <span className="px-2 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-full text-[8.5px] font-black uppercase tracking-widest">
              Manual de Instruções & Co-Criação
            </span>
            <h3 className="text-base font-black text-white mt-1 uppercase tracking-tight">Manual Operante & Central de Sugestões</h3>
          </div>
        </div>

        {/* TABS SELECTOR */}
        <div className="flex flex-wrap gap-1 bg-slate-900/80 border border-white/5 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("tutorial")}
            className={`px-3 py-1.5 text-[9.5px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
              activeTab === "tutorial" ? "bg-cyan-500 text-slate-950 shadow font-black" : "text-slate-400 hover:text-white"
            }`}
          >
            📖 Manual do App
          </button>
          <button
            onClick={() => setActiveTab("retro")}
            className={`px-3 py-1.5 text-[9.5px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
              activeTab === "retro" ? "bg-amber-500 text-slate-950 shadow font-black" : "text-slate-400 hover:text-white"
            }`}
          >
            🏪 Caixa Antigo (Treino)
          </button>
          <button
            onClick={() => setActiveTab("sugestoes")}
            className={`px-3 py-1.5 text-[9.5px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
              activeTab === "sugestoes" ? "bg-emerald-500 text-slate-950 shadow font-black" : "text-slate-400 hover:text-white"
            }`}
          >
            💡 Sugerir Melhorias ({suggestions.length})
          </button>
          <button
            onClick={() => setActiveTab("cerebro")}
            className={`px-3 py-1.5 text-[9.5px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
              activeTab === "cerebro" ? "bg-purple-500 text-white shadow font-black" : "text-slate-400 hover:text-white"
            }`}
          >
            🧠 Ideias IA
          </button>
        </div>
      </div>

      {/* RENDER ACTIVE TAB */}
      <AnimatePresence mode="wait">
        
        {/* TAB 1: MANUAL DO APP */}
        {activeTab === "tutorial" && (
          <motion.div
            key="tab_manual"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 space-y-4">
              <h4 className="text-sm font-black text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
                <Store className="w-4 h-4 text-cyan-400" />
                Como Operar Este Sistema Inteligente de Bairro
              </h4>
              <p className="text-xs text-slate-350 leading-relaxed">
                Este aplicativo é uma central integrada de produtividade e vendas focada em comércios, bazares, brechós e estabelecimentos de bairro. Abaixo está o manual prático de como tirar o maior proveito de cada módulo no seu dia a dia de trabalho.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                
                <div className="p-4 bg-slate-950 rounded-xl border border-white/5 space-y-2">
                  <div className="flex items-center gap-2 text-white font-bold text-xs uppercase tracking-wide">
                    <span className="w-5 h-5 bg-cyan-500/15 border border-cyan-500/35 text-cyan-400 text-[10px] font-black rounded-lg flex items-center justify-center">1</span>
                    Calculadora Especial de Compras
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Localizada na aba <strong className="text-cyan-400">Calculadora</strong>. Ela permite lançar itens pelo peso (Kg) ou quantidade. Compara marcas para te mostrar o melhor custo-benefício e possui uma trava de orçamento para você não gastar mais do que o limite definido.
                  </p>
                </div>

                <div className="p-4 bg-slate-950 rounded-xl border border-white/5 space-y-2">
                  <div className="flex items-center gap-2 text-white font-bold text-xs uppercase tracking-wide">
                    <span className="w-5 h-5 bg-cyan-500/15 border border-cyan-500/35 text-cyan-400 text-[10px] font-black rounded-lg flex items-center justify-center">2</span>
                    Estoque & Giro de Produtos
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Na aba <strong className="text-cyan-400">Mercado</strong>, controle o catálogo por nicho comercial. O sistema oferece <strong className="text-emerald-400">Controle Inteligente de Estoque</strong>, registro de Preço de Custo, Margens de Lucro real e Alerta de Estoque Mínimo para evitar perdas de vendas (rupturas de prateleiras).
                  </p>
                </div>

                <div className="p-4 bg-slate-950 rounded-xl border border-white/5 space-y-2">
                  <div className="flex items-center gap-2 text-white font-bold text-xs uppercase tracking-wide">
                    <span className="w-5 h-5 bg-cyan-500/15 border border-cyan-500/35 text-cyan-400 text-[10px] font-black rounded-lg flex items-center justify-center">3</span>
                    Bloquinho de Notinha (Brechó/Bazar)
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    A aba <strong className="text-cyan-400">Notinha & Recibo</strong> é ideal para pequenos brechós, bazares ou venda direta. Você pode lançar as peças do cliente, aplicar descontos, cadastrar o nome do cliente e gerar um lindo recibo impresso ou compartilhável diretamente no WhatsApp!
                  </p>
                </div>

                <div className="p-4 bg-slate-950 rounded-xl border border-white/5 space-y-2">
                  <div className="flex items-center gap-2 text-white font-bold text-xs uppercase tracking-wide">
                    <span className="w-5 h-5 bg-cyan-500/15 border border-cyan-500/35 text-cyan-400 text-[10px] font-black rounded-lg flex items-center justify-center">4</span>
                    Frente de Caixa (PDV)
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    O <strong className="text-cyan-400">PDV</strong> é o terminal de vendas em tempo real. Adicione produtos com um clique, defina descontos e selecione o meio de pagamento (dinheiro, PIX, cartão). O sistema desconta automaticamente do estoque e abastece o saldo diário no caixa físico.
                  </p>
                </div>

              </div>

              <div className="p-4 bg-amber-500/5 border border-amber-500/25 rounded-xl flex gap-3 text-xs text-amber-200 mt-4">
                <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
                <div>
                  <p className="font-extrabold uppercase text-[9.5px] tracking-wider text-amber-450">💡 Super Dica: Inteligência por IA</p>
                  <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                    Nosso aplicativo possui integração nativa com o <strong className="text-cyan-300">Cérebro Inteligente (Gemini AI)</strong>. Nas abas de Estoque e PDV, você pode acionar a "Mentoria Inteligente" para que a IA analise suas vendas reais, diga quais produtos têm maior giro, quais estão em falta crítica e sugira novas estratégias de custos e preços para alavancar seu lucro!
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 2: TREINAMENTO DE CAIXA RETRO */}
        {activeTab === "retro" && (
          <motion.div
            key="tab_retro"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* CONTEXT EXPLANATION */}
            <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 space-y-3">
              <h4 className="text-sm font-black text-amber-400 uppercase tracking-widest">
                Nostalgia: O Modo Operante dos Supermercados Antigos
              </h4>
              <p className="text-xs text-slate-350 leading-relaxed">
                Antigamente, antes de os leitores ópticos a laser se tornarem populares e baratos na década de 1980 e 1990, os operadores de caixa de supermercado operavam em computadores de terminal de fósforo verde ou caixas registradoras mecânicas. Eles precisavam memorizar centenas de códigos numéricos de 3 a 4 dígitos chamados <strong className="text-amber-400">PLU (Price Look-Up)</strong>.
              </p>
              <p className="text-xs text-slate-350 leading-relaxed">
                Os operadores digitavam em velocidade absurda: digitavam o código PLU, a quantidade, e batiam a tecla ENTER. Se esquecessem um código, precisavam consultar uma planilha impressa colada do lado do monitor. Que tal testar suas habilidades de digitação e velocidade no nosso simulador de caixa antigo?
              </p>
            </div>

            {/* INTERACTIVE RETRO CONSOLE SIMULATOR */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              
              {/* VIRTUAL TERMINAL (MONOCHROME CRT STYLED) */}
              <div className="lg:col-span-8 bg-slate-950 border-2 border-slate-700 rounded-2xl p-4 font-mono text-emerald-400 relative overflow-hidden shadow-2xl shadow-emerald-900/10">
                
                {/* CRT screen glare/line styling overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.01] to-transparent pointer-events-none bg-[length:100%_4px] opacity-40" />
                
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                  <span className="text-[10px] font-black tracking-widest flex items-center gap-1.5 uppercase text-emerald-500">
                    <Terminal className="w-4 h-4 animate-pulse" />
                    MONITOR CRT ITAUTEC - CAIXA 04
                  </span>
                  <span className="text-[8.5px] bg-emerald-950 text-emerald-500 border border-emerald-800 px-2 py-0.5 rounded uppercase font-bold">
                    ONLINE
                  </span>
                </div>

                {/* Simulated Terminal logs */}
                <div className="space-y-1 text-[11px] h-[190px] overflow-y-auto mb-4 pr-1 scrollbar-thin scrollbar-thumb-emerald-900/50">
                  {terminalLog.map((log, idx) => (
                    <div key={idx} className="leading-relaxed">
                      {log}
                    </div>
                  ))}
                </div>

                {/* Interactive Feedback banner */}
                {retroFeedback && (
                  <div className="bg-slate-900 border border-emerald-500/30 p-2 rounded text-center text-xs font-bold text-white mb-3">
                    {retroFeedback}
                  </div>
                )}

                {/* Active Receipt preview list */}
                {simulatedReceipt.length > 0 && (
                  <div className="bg-emerald-950/20 border border-emerald-800/40 p-3 rounded-lg mb-4 text-[10px]">
                    <div className="border-b border-emerald-800/60 pb-1 mb-2 font-black uppercase text-center tracking-widest">
                      CUPOM FISCAL EMITIDO (SIMULACAO)
                    </div>
                    <div className="space-y-1 max-h-[100px] overflow-y-auto">
                      {simulatedReceipt.map((item, idx) => (
                        <div key={idx} className="flex justify-between font-mono">
                          <span>{item.qty} x {item.name}</span>
                          <span>R$ {item.total.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-emerald-800/40 mt-2 pt-2 flex justify-between font-bold text-emerald-300">
                      <span>TOTAL GERAL:</span>
                      <span>R$ {simulatedReceipt.reduce((acc, curr) => acc + curr.total, 0).toFixed(2)}</span>
                    </div>
                  </div>
                )}

                {/* Form Controls */}
                <div className="grid grid-cols-12 gap-3 text-emerald-400 mt-2">
                  <div className="col-span-4">
                    <label className="text-[8px] font-black uppercase text-emerald-600 block mb-1">Quantidade</label>
                    <input
                      type="number"
                      value={retroQty}
                      onChange={(e) => setRetroQty(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 text-emerald-400 text-xs px-2 py-1.5 font-mono font-bold rounded-lg outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="col-span-5">
                    <label className="text-[8px] font-black uppercase text-emerald-600 block mb-1">Código PLU (3 ou 4 dígitos)</label>
                    <input
                      type="text"
                      value={retroPLU}
                      onChange={(e) => setRetroPLU(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleRegisterRetroItem();
                        }
                      }}
                      className="w-full bg-slate-900 border border-slate-800 text-emerald-400 text-xs px-2 py-1.5 font-mono font-bold rounded-lg outline-none focus:border-emerald-500 placeholder-emerald-900"
                      placeholder="Ex: 101"
                    />
                  </div>

                  <div className="col-span-3 flex items-end">
                    <button
                      type="button"
                      onClick={handleRegisterRetroItem}
                      className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-black rounded-lg cursor-pointer transition-all uppercase tracking-wide"
                    >
                      Registrar
                    </button>
                  </div>
                </div>

                {/* Simulation Control actions */}
                <div className="flex gap-2 mt-4 border-t border-slate-800 pt-3">
                  <button
                    type="button"
                    onClick={handleCloseCashier}
                    className="flex-1 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black text-[9.5px] uppercase tracking-wider rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1"
                  >
                    💰 Fechar Compra (Abrir Gaveta)
                  </button>
                  <button
                    type="button"
                    onClick={handleClearTerminal}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 font-bold text-[9px] uppercase tracking-wider rounded-lg cursor-pointer transition-all flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Resetar
                  </button>
                </div>

              </div>

              {/* MISSION & PLU DIRECTORY BOARD */}
              <div className="lg:col-span-4 space-y-4">
                
                {/* GAME TASK CARD */}
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl relative overflow-hidden text-left">
                  <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 opacity-10">
                    <Star className="w-16 h-16 text-amber-400 animate-pulse" />
                  </div>
                  <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-[8px] font-black uppercase tracking-wider inline-block">
                    Missão de Prática
                  </span>
                  <h5 className="text-xs font-black text-white mt-1 uppercase">Treinamento de Caixa</h5>
                  <p className="text-[11px] text-slate-350 mt-2 leading-relaxed font-semibold">
                    {currentTask.description}
                  </p>
                  
                  <div className="mt-3 flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider ${
                      currentTask.isCompleted 
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" 
                        : "bg-amber-500/15 text-amber-400 border border-amber-500/20 animate-pulse"
                    }`}>
                      {currentTask.isCompleted ? "✔ TAREFA CONCLUÍDA" : "⏳ AGUARDANDO DIGITAÇÃO..."}
                    </span>
                  </div>
                </div>

                {/* PLU TABLE BOARD */}
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-left">
                  <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2 border-b border-white/5 pb-1.5 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-cyan-400" />
                    Tabela de PLU da Filial
                  </h5>
                  <div className="space-y-1.5 max-h-[180px] overflow-y-auto text-[10.5px] pr-1">
                    {Object.entries(retroProducts).map(([plu, prod]) => (
                      <div key={plu} className="flex items-center justify-between font-mono bg-slate-950 px-2 py-1 rounded border border-white/[0.03]">
                        <span className="text-amber-400 font-bold tracking-wider">PLU {plu}</span>
                        <span className="text-white font-medium text-[10px] truncate max-w-[120px] uppercase">{prod.name}</span>
                        <span className="text-slate-450 text-[9.5px]">R$ {prod.price.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          </motion.div>
        )}

        {/* TAB 3: SUGERIR MELHORIAS */}
        {activeTab === "sugestoes" && (
          <motion.div
            key="tab_sugestoes"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* INTRO TITLE CARD */}
            <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 relative overflow-hidden">
              <div className="absolute right-0 top-0 translate-x-8 -translate-y-4 opacity-5 pointer-events-none">
                <Lightbulb className="w-40 h-40 text-emerald-400" />
              </div>
              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[8.5px] font-black uppercase tracking-wider inline-flex items-center gap-1">
                <CheckCircle2 className="w-2.5 h-2.5" />
                Co-Criação Comunitária
              </span>
              <h4 className="text-sm font-black text-white mt-1 uppercase tracking-tight">Deixe suas sugestões de melhorias!</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed mt-1 max-w-xl">
                Queremos que este aplicativo seja perfeito para o seu comércio. Diga qual funcionalidade você gostaria que adicionássemos! Todas as sugestões são sincronizadas em nuvem em tempo real e você pode votar nas ideias mais interessantes!
              </p>
            </div>

            {/* TWO COLUMNS LAYOUT: FORM & FEEDBACK LIST */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* LEFT COLUMN: SUGGESTION SUBMIT FORM */}
              <div className="lg:col-span-5 bg-slate-900 border border-white/5 rounded-2xl p-5 space-y-4 text-left">
                <h5 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-emerald-400" />
                  Enviar Nova Ideia
                </h5>

                <form onSubmit={handleSubmitSuggestion} className="space-y-3.5 text-xs">
                  <div>
                    <label className="text-[8px] font-black uppercase text-slate-500 block mb-1">Título da Funcionalidade</label>
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
                      placeholder="Ex: Emissão de Nota Fiscal em PDF"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[8px] font-black uppercase text-slate-500 block mb-1">Como você imagina isso funcionando?</label>
                    <textarea
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      className="w-full h-24 bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500 placeholder:text-slate-600 leading-relaxed"
                      placeholder="Descreva detalhadamente a ideia, o problema que ela resolve e o quanto ela facilitaria a sua vida..."
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[8px] font-black uppercase text-slate-500 block mb-1">Seu Nome / Comércio (Opcional)</label>
                    <input
                      type="text"
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
                      placeholder="Ex: Denise - Brechó da Vila"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[9.5px] uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span>Enviando sugestão...</span>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        Gravar Ideia na Nuvem 🚀
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* RIGHT COLUMN: VOTING / SUGGESTION STREAM */}
              <div className="lg:col-span-7 space-y-3.5 text-left">
                <h5 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-cyan-400 animate-pulse" />
                  Mural de Ideias & Votação ({suggestions.length})
                </h5>

                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
                  {suggestions.length === 0 ? (
                    <div className="py-14 text-center text-slate-650 font-mono text-[10px] uppercase">
                      Carregando sugestões da nuvem...
                    </div>
                  ) : (
                    suggestions.map((sug) => {
                      const hasVoted = votedIds.includes(sug.id);
                      return (
                        <div
                          key={sug.id}
                          className="bg-slate-900 border border-white/5 hover:border-white/10 p-4 rounded-2xl flex items-start gap-4 transition-all duration-200"
                        >
                          <div className="flex-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h6 className="text-[12px] font-black text-white uppercase tracking-tight">{sug.title}</h6>
                              {sug.author === "Cérebro Inteligente" && (
                                <span className="px-1.5 py-0.2 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded text-[7px] font-black uppercase tracking-wider">
                                  Oficial
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 leading-relaxed font-medium">{sug.description}</p>
                            
                            <div className="flex items-center gap-2 text-[9px] font-bold text-slate-500 uppercase mt-2">
                              <span>Enviado por: <strong className="text-slate-350">{sug.author}</strong></span>
                              <span>•</span>
                              <span>{new Date(sug.timestamp).toLocaleDateString("pt-BR")}</span>
                            </div>
                          </div>

                          {/* Voting Button */}
                          <button
                            type="button"
                            onClick={() => handleVote(sug.id, sug.isCustom)}
                            className={`p-2.5 rounded-xl border flex flex-col items-center justify-center min-w-[50px] transition-all cursor-pointer ${
                              hasVoted
                                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 font-black"
                                : "bg-slate-950 border-white/5 text-slate-400 hover:text-white hover:border-white/10"
                            }`}
                          >
                            <ThumbsUp className={`w-4 h-4 ${hasVoted ? "text-emerald-400 animate-bounce" : "text-slate-400"}`} />
                            <span className="text-[10px] font-black font-mono mt-1">{sug.votes}</span>
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>
          </motion.div>
        )}

        {/* TAB 4: SUGGESTIONS GENERATED BY IA */}
        {activeTab === "cerebro" && (
          <motion.div
            key="tab_cerebro"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* IA PROMPT BANNER */}
            <div className="bg-slate-900 border border-purple-500/15 rounded-2xl p-5 relative overflow-hidden">
              <div className="absolute right-0 top-0 translate-x-10 -translate-y-4 opacity-5 pointer-events-none">
                <Sparkles className="w-40 h-40 text-purple-400" />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="px-2 py-0.5 bg-purple-500/15 text-purple-400 border border-purple-500/25 rounded-full text-[8px] font-black uppercase tracking-wider inline-flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" />
                    Inteligência Artificial do Cérebro
                  </span>
                  <h4 className="text-sm font-black text-white mt-1 uppercase tracking-tight">Brainstorming de Melhorias Inovadoras</h4>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5 max-w-xl">
                    Deixe que a IA do Cérebro Inteligente analise os comércios de bairro e elabore sugestões de melhorias altamente úteis e brilhantes!
                  </p>
                </div>

                <button
                  onClick={handleGenerateAiIdea}
                  disabled={isAiGenerating}
                  className="px-4 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white font-black text-[9.5px] uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-purple-500/10 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-55 shrink-0"
                >
                  {isAiGenerating ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                      Elaborando Ideia...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      Gerar Ideia com IA 🧠💡
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* AI IDEA RESPONSE OUTPUT */}
            {aiIdea ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-slate-900 border border-purple-500/15 rounded-2xl p-6 relative overflow-hidden text-left"
              >
                <div className="absolute right-3 top-3">
                  <span className="text-[7.5px] font-black text-purple-400 bg-purple-950 border border-purple-500/25 px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                    Cérebro Inteligente Ativo 🧠
                  </span>
                </div>
                <div className="flex gap-4">
                  <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-400 shrink-0 h-12 w-12 flex items-center justify-center">
                    <Lightbulb className="w-6 h-6 font-black" />
                  </div>
                  <div className="space-y-1.5 flex-1 max-h-[450px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-800">
                    {renderMarkdownText(aiIdea)}
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="py-20 text-center bg-slate-900/20 border border-dashed border-white/5 rounded-2xl text-slate-500 uppercase text-[9px] font-black flex flex-col items-center justify-center gap-2.5">
                <Sparkles className="w-8 h-8 text-slate-700" />
                Nenhuma ideia de melhoria gerada ainda.
                <span className="text-[7.5px] text-slate-600 font-normal normal-case">Clique no botão acima para brainstormar novas ideias de negócios com a IA do Cérebro Inteligente!</span>
              </div>
            )}
          </motion.div>
        )}

      </AnimatePresence>

    </motion.div>
  );
};
