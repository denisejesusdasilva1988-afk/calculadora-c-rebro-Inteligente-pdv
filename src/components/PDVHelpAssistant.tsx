import React, { useState, useMemo, useRef, useEffect } from "react";
import { 
  HelpCircle, 
  Search, 
  Sparkles, 
  Send, 
  RotateCcw, 
  X, 
  ChevronDown, 
  ChevronUp, 
  BookOpen, 
  CheckCircle2, 
  ShieldAlert, 
  Barcode, 
  ShoppingCart, 
  PackagePlus, 
  DollarSign, 
  KeyRound, 
  Bot,
  User,
  Loader2,
  ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ai } from "../App";

export interface PDVHelpItem {
  id: string;
  category: "comecar" | "produtos" | "vendas" | "caixa" | "seguranca" | "reset";
  title: string;
  shortDesc: string;
  detailedSteps: string[];
  tips?: string;
  keywords: string[];
}

export const PDV_KNOWLEDGE_BASE: PDVHelpItem[] = [
  {
    id: "zerar-dados-teste",
    category: "reset",
    title: "Como zerar o PDV e apagar dados de teste?",
    shortDesc: "Limpe todas as vendas e fundo de caixa de teste para começar do zero com o sistema limpo.",
    detailedSteps: [
      "1. Na barra superior do PDV, clique no botão roxo 'Proprietário & Permissões 👑' (ou na aba Gestão em 'Permissões & Equipe 🔑👑').",
      "2. Se solicitado, digite seu PIN de Proprietário para desbloquear o painel.",
      "3. Role a tela até a 'ZONA DE PERIGO: ZERAR TODO O SISTEMA ⚠️🧼' no final da página.",
      "4. Clique em 'Zerar Tudo (PIN do Proprietário)'.",
      "5. Confirme o aviso na tela. O sistema apagará vendas de teste e zerará o caixa, tanto no celular/PC quanto na nuvem!",
      "🔒 Seus outros dados (Bloco de Notas, Recibos, etc.) NÃO são apagados, ficam 100% preservados!"
    ],
    tips: "Use sempre que terminar de treinar funcionários ou fazer simulações de vendas antes de inaugurar a loja.",
    keywords: ["zerar", "limpar", "apagar", "reset", "reiniciar", "teste", "dados", "memoria", "comecar do zero", "fundo"]
  },
  {
    id: "zona-de-perigo",
    category: "seguranca",
    title: "O que é a Zona de Perigo e por que ela existe?",
    shortDesc: "Entenda o que faz a Zona de Perigo e por que ela é protegida por senha.",
    detailedSteps: [
      "A 'Zona de Perigo' é uma área exclusiva do dono do comércio para ações que não têm volta (irreversíveis).",
      "Ela foi colocada em destaque vermelho e com cadeado para que nenhum funcionário ou caixa aperte sem querer durante o trabalho.",
      "A principal função dela é o botão 'Zerar Tudo', que limpa todo o histórico de teste do caixa.",
      "Apenas quem souber o PIN mestre do Proprietário consegue acionar os botões dessa área."
    ],
    tips: "Não precisa ter medo: ela só é ativada se você digitar seu PIN e confirmar a mensagem de segurança.",
    keywords: ["zona de perigo", "perigo", "danger", "vermelho", "medo", "seguranca", "irreversivel", "senha dono"]
  },
  {
    id: "abrir-caixa",
    category: "caixa",
    title: "Como abrir o caixa no início do dia (Fundo de Troco)?",
    shortDesc: "Defina o valor inicial em moedas e notas para troco antes de começar a vender.",
    detailedSteps: [
      "1. Ao entrar no PDV com o caixa fechado, você verá a tela 'Abertura de Caixa Diária'.",
      "2. Digite o valor que você colocou na gaveta (exemplo: R$ 50,00 ou R$ 100,00 para troco).",
      "3. Clique no botão verde 'Abrir Novo Caixa 🌅'.",
      "4. Pronto! O caixa fica com o status '🟢 Caixa Aberto' e libera o registro de vendas."
    ],
    tips: "Mesmo que você comece com R$ 0,00, abra o caixa informando 0 para que os relatórios do dia fiquem organizados.",
    keywords: ["abrir caixa", "fundo de caixa", "troco", "abertura", "comecar dia", "iniciar", "turno", "gaveta"]
  },
  {
    id: "cadastrar-produto",
    category: "produtos",
    title: "Como cadastrar novos produtos no catálogo?",
    shortDesc: "Adicione itens com nome, preço de venda, custo, código de barras e foto.",
    detailedSteps: [
      "1. No PDV, vá na aba 'Catálogo & Carrinho' ou 'Estoque Inteligente'.",
      "2. Clique no botão '+ Novo Produto' ou 'Cadastrar Item'.",
      "3. Preencha o Nome do produto, Preço de Venda e Custo (para o sistema calcular seu lucro real).",
      "4. Opcional: Digite o Código de Barras (EAN) ou use a câmera para bipar a embalagem.",
      "5. Escolha a categoria/segmento e informe a quantidade inicial em estoque.",
      "6. Clique em 'Salvar Produto'. Ele aparecerá imediatamente na vitrine para vender!"
    ],
    tips: "Colocar o Preço de Custo ajuda o sistema a te mostrar o seu Lucro Líquido exato no final do dia.",
    keywords: ["cadastrar", "novo produto", "adicionar produto", "criar produto", "preco", "custo", "estoque", "item"]
  },
  {
    id: "excluir-retirar-produto",
    category: "produtos",
    title: "Como excluir ou desativar um produto do catálogo?",
    shortDesc: "Remova produtos que saíram de linha ou que foram cadastrados por engano.",
    detailedSteps: [
      "1. Vá na aba 'Estoque Inteligente' ou procure o produto na vitrine.",
      "2. Passe o mouse ou clique no produto para ver os detalhes.",
      "3. Clique no ícone da lixeira vermelha 🗑️ ('Excluir' ou 'Remover').",
      "4. Se a segurança de cargos estiver ativa, o sistema pedirá o PIN do Gerente ou Proprietário.",
      "5. Confirme a remoção. O item sairá da vitrine imediatamente."
    ],
    tips: "Se o produto apenas acabou momentaneamente, em vez de excluir, você pode zerar o estoque dele para manter o histórico.",
    keywords: ["excluir produto", "remover produto", "apagar produto", "tirar produto", "deletar", "desativar"]
  },
  {
    id: "leitor-codigo-barras",
    category: "vendas",
    title: "Como usar o leitor de código de barras (Bipador e Câmera)?",
    shortDesc: "Passe produtos rapidamente pelo código de barras usando pistola USB/Bluetooth ou câmera do celular.",
    detailedSteps: [
      "• Com Pistola / Leitor USB: Basta plugar no computador ou celular (com adaptador OTG). Ao bipar qualquer código de barras com a tela do PDV aberta, o item entra no carrinho na mesma hora!",
      "• Com a Câmera do Celular: Clique no botão com ícone de Câmera/Scanner (ou aperte a tecla F8 no teclado). Aponte para o código de barras da embalagem para bipar.",
      "• Pelo Teclado: No campo de busca, você também pode digitar os números do código de barras e apertar Enter."
    ],
    tips: "No computador ou notebook, use o atalho F8 para abrir o leitor instantaneamente sem usar o mouse.",
    keywords: ["codigo de barras", "leitor", "bipador", "scanner", "camera", "bipar", "pistola", "ean"]
  },
  {
    id: "fazer-venda-e-descontos",
    category: "vendas",
    title: "Como fazer uma venda, aplicar descontos e finalizar?",
    shortDesc: "Selecione os produtos, escolha o meio de pagamento e emita o comprovante.",
    detailedSteps: [
      "1. Clique nos produtos para colocar no carrinho (ou busque por nome/código).",
      "2. Ajuste a quantidade com os botões (+) e (-) se o cliente levar mais de um.",
      "3. Desconto: Você pode clicar no campo de desconto e digitar em Reais (R$) ou em Porcentagem (%) com total liberdade.",
      "4. Escolha a Forma de Pagamento: Dinheiro, Pix, Cartão de Débito, Cartão de Crédito ou Fiado.",
      "5. Se for Dinheiro, digite quanto o cliente entregou para a tela calcular o troco exato.",
      "6. Clique em 'Concluir Venda ✔️'. O estoque dará baixa automática e você poderá imprimir ou enviar o recibo pelo WhatsApp."
    ],
    tips: "No computador, você pode apertar F10 para concluir a venda direto pelo teclado.",
    keywords: ["vender", "concluir venda", "desconto", "porcentagem", "pagamento", "pix", "cartao", "dinheiro", "troco", "recibo"]
  },
  {
    id: "sangria-e-suprimento",
    category: "caixa",
    title: "O que é Sangria e Suprimento e como registrar?",
    shortDesc: "Lance retiradas de dinheiro ou adições de troco sem bagunçar o caixa.",
    detailedSteps: [
      "• Sangria (Retirada de Dinheiro): É quando você tira dinheiro da gaveta por segurança (para guardar no cofre) ou para pagar uma conta rápida (ex: pão, frete, entregador).",
      "• Suprimento (Entrada de Troco): É quando falta troco e você coloca mais notas ou moedas na gaveta durante o dia.",
      "Como fazer:",
      "1. Vá na aba 'Fluxo do Caixa' ou 'Lançamento Direto'.",
      "2. Escolha 'Sangria (Saída)' ou 'Suprimento (Entrada)'.",
      "3. Digite o valor e o motivo (ex: 'Pagamento entrega' ou 'Troco').",
      "4. Clique em Confirmar. O saldo da gaveta é atualizado na mesma hora."
    ],
    tips: "Nunca tire dinheiro do caixa sem lançar a Sangria, senão no final do dia o caixa vai dar 'Quebra de Caixa' (falta de dinheiro).",
    keywords: ["sangria", "suprimento", "retirada", "saida", "entrada", "dinheiro gaveta", "pagar conta", "troco extra"]
  },
  {
    id: "fechar-caixa-relatorio",
    category: "caixa",
    title: "Como fechar o turno e tirar o relatório do dia?",
    shortDesc: "Faça o balanço cego da gaveta, confira quebras ou sobras e envie o fechamento por WhatsApp.",
    detailedSteps: [
      "1. Ao final do expediente, vá na aba 'Fluxo do Caixa' e clique em 'Fechar Turno & Expediente 🌅'.",
      "2. O sistema abrirá a conferência física: conte o dinheiro que está na gaveta e digite o valor contado.",
      "3. O sistema compara o valor físico com o saldo do sistema e avisa se o caixa bateu 100%, ou se houve Quebra (falta) ou Sobra (excesso).",
      "4. Digite quanto vai deixar de troco para o dia seguinte.",
      "5. Clique em 'Confirmar Fechamento'.",
      "6. Clique em 'Compartilhar Fechamento WhatsApp 📲' para enviar o relatório detalhado para o dono."
    ],
    tips: "O balanço de caixa evita furtos, desvios e erros de troco que passam despercebidos durante a correria.",
    keywords: ["fechar caixa", "fechamento", "fim do dia", "expediente", "relatorio", "whatsapp", "conferencia", "quebra de caixa", "sobra"]
  },
  {
    id: "gerenciar-pin-e-equipe",
    category: "seguranca",
    title: "Como cadastrar, alterar e zerar PIN de funcionários e gerente?",
    shortDesc: "Controle quem pode dar descontos, estornar vendas ou mexer no dinheiro da loja.",
    detailedSteps: [
      "1. Abra a aba 'Proprietário & Permissões 👑'.",
      "2. Digite o seu PIN de Proprietário para ter acesso total.",
      "3. Em 'Cadastrar Novo Membro da Equipe', digite o Nome, escolha o Cargo (Caixa, Vendedor, Gerente) e defina um PIN de 4 a 6 dígitos para a pessoa.",
      "4. Nas chaves de permissão, marque o que cada cargo pode fazer (ex: permitir desconto até 10%, permitir sangria, etc.).",
      "• Se um funcionário esquecer o PIN: Basta clicar no botão de editar ao lado do nome dele e digitar uma nova senha.",
      "• Para alterar o PIN do Proprietário: Na barra de segurança no topo, clique em 'Alterar PIN' e informe a nova senha mestra."
    ],
    tips: "Nunca compartilhe o seu PIN de Proprietário com funcionários comuns. Cada pessoa deve ter o seu próprio PIN.",
    keywords: ["pin", "senha", "gerente", "caixa", "funcionario", "equipe", "permissoes", "alterar pin", "esqueci senha", "zerar pin"]
  },
  {
    id: "apagar-ex-funcionario-e-pin",
    category: "seguranca",
    title: "Como apagar nome e PIN de ex-funcionários que não trabalham mais?",
    shortDesc: "Remova funcionários antigos para não acumular nomes e senhas no sistema da sua empresa.",
    detailedSteps: [
      "1. Clique na aba 'Proprietário & Permissões 👑' no topo do PDV.",
      "2. Digite o seu PIN de Proprietário para ter acesso seguro.",
      "3. Role a tela até a seção 'Equipe & Usuários Cadastrados'.",
      "4. Localize o nome do ex-funcionário na listagem.",
      "5. Clique no botão vermelho de Lixeira 🗑️ ao lado do nome e PIN dele.",
      "6. Confirme a exclusão no alerta de segurança. O cadastro e o PIN do ex-colaborador são excluídos definitivamente, liberando o sistema para novos funcionários e garantindo que o ex-funcionário não acesse mais o caixa!"
    ],
    tips: "Sempre remova o cadastro de um funcionário no mesmo dia da sua saída para manter a listagem limpa e o caixa seguro contra acessos indevidos.",
    keywords: ["apagar funcionario", "excluir funcionario", "apagar pin", "excluir senha", "ex-funcionario", "demitir", "tirar funcionario", "limpar equipe", "apagar nome"]
  },
  {
    id: "troco-e-gaveta-dinheiro",
    category: "caixa",
    title: "Como funciona o Troco e a Abertura de Gaveta Automática (Gaveta Elétrica)?",
    shortDesc: "Cálculo exato de troco, botões de cédulas rápidas e compatibilidade com gavetas elétricas sem mensalidades.",
    detailedSteps: [
      "1. Ao fechar uma venda em Dinheiro, o sistema exibe os botões rápidos de cédulas (R$ 10, R$ 20, R$ 50, R$ 100) ou você pode digitar o valor pago.",
      "2. O troco exato a devolver aparece em destaque verde grande, evitando qualquer erro de cálculo.",
      "3. Gaveta Elétrica Automática (sem custos extras): O sistema envia o comando padrão ESC/POS pela impressora térmica (cabo RJ11/RJ12), abrindo a gaveta automaticamente no momento exato em que a venda em dinheiro é concluída.",
      "4. Para comércios que usam gaveta manual com chave ou caixa simples: O sistema exibe um aviso visual e sonoro de destravamento com o troco na tela, funcionando com 100% de precisão para qualquer porte de comércio sem precisar pagar nada a mais!"
    ],
    tips: "O valor recebido e o troco também saem impressos no comprovante/cupom do cliente e no histórico do caixa.",
    keywords: ["troco", "gaveta", "gaveta automatica", "gaveta eletrica", "abrir gaveta", "cedulas", "dinheiro troco", "calcular troco", "guanabara"]
  }
];

interface PDVHelpAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToTab?: (tab: string) => void;
}

interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: string;
  suggestedAction?: {
    label: string;
    action: () => void;
  };
}

export const PDVHelpAssistant: React.FC<PDVHelpAssistantProps> = ({
  isOpen,
  onClose,
  onNavigateToTab
}) => {
  const [activeView, setActiveView] = useState<"guias" | "chat">("guias");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("todos");
  const [expandedGuideId, setExpandedGuideId] = useState<string | null>("zerar-dados-teste");
  
  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "msg-welcome",
      sender: "bot",
      text: "Olá! Sou seu Assistente Inteligente do PDV 🤖🏪. Posso te explicar passo a passo como cadastrar produtos, usar leitor de código de barras, zerar dados de teste, fazer sangria ou fechar o caixa. Como posso te ajudar hoje?",
      timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    }
  ]);
  const [userInput, setUserInput] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeView === "chat") {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, activeView]);

  // Filtered guides based on query and category
  const filteredGuides = useMemo(() => {
    return PDV_KNOWLEDGE_BASE.filter(item => {
      const matchesCategory = selectedCategory === "todos" || item.category === selectedCategory;
      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      const inTitle = item.title.toLowerCase().includes(q);
      const inDesc = item.shortDesc.toLowerCase().includes(q);
      const inKeywords = item.keywords.some(k => k.toLowerCase().includes(q));
      const inSteps = item.detailedSteps.some(s => s.toLowerCase().includes(q));

      return inTitle || inDesc || inKeywords || inSteps;
    });
  }, [searchQuery, selectedCategory]);

  // Intelligent local search first, fallback to Gemini AI for unique questions
  const handleSendMessage = async () => {
    if (!userInput.trim() || isAiLoading) return;

    const userText = userInput.trim();
    setUserInput("");

    const newMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: "user",
      text: userText,
      timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    };

    setChatMessages(prev => [...prev, newMsg]);

    // Check if there is an exact match in knowledge base (Instant & 100% Free)
    const lower = userText.toLowerCase();
    const matchedGuide = PDV_KNOWLEDGE_BASE.find(g => 
      g.keywords.some(k => lower.includes(k.toLowerCase())) ||
      g.title.toLowerCase().includes(lower)
    );

    if (matchedGuide) {
      setTimeout(() => {
        const botReply: ChatMessage = {
          id: `bot-${Date.now()}`,
          sender: "bot",
          text: `📌 **${matchedGuide.title}**\n\n${matchedGuide.shortDesc}\n\n**Passo a passo:**\n${matchedGuide.detailedSteps.join("\n")}${matchedGuide.tips ? `\n\n💡 *Dica:* ${matchedGuide.tips}` : ""}`,
          timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
        };
        setChatMessages(prev => [...prev, botReply]);
      }, 350);
      return;
    }

    // Otherwise, call server-side Gemini AI
    setIsAiLoading(true);
    try {
      const knowledgeContext = PDV_KNOWLEDGE_BASE.map(g => 
        `TÓPICO: ${g.title}\nRESUMO: ${g.shortDesc}\nPASSOS:\n${g.detailedSteps.join("\n")}`
      ).join("\n\n---\n\n");

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [{ text: userText }]
          }
        ],
        config: {
          systemInstruction: `Você é o Assistente Virtual Oficial e Especialista no PDV (Frente de Caixa) do aplicativo.
Seu objetivo é ajudar comerciantes, lojistas, caixas e proprietários de pequenos e médios negócios a tirarem todas as dúvidas sobre o sistema.
Fale em português do Brasil com tom simples, claro, empático, acolhedor e direto ao ponto (sem termos técnicos complicados de programação).

BASE DE CONHECIMENTO DO PDV:
${knowledgeContext}

REGRAS IMPORTANTES:
1. Sempre oriente exatamente onde a pessoa deve clicar no aplicativo (ex: 'Proprietário & Permissões', 'Zona de Perigo', 'Estoque', 'Catálogo & Carrinho').
2. Se a dúvida for sobre zerar o caixa ou dados de teste, reforce que isso é feito no Painel do Proprietário > Zona de Perigo com PIN mestre, e que o Bloco de Notas e outras notas estão seguras.
3. Se a dúvida for sobre leitor de código de barras, explique que aceita pistola USB, câmera do celular (F8) ou digitação manual.
4. Mantenha as respostas objetivas, divididas em tópicos ou passos numerados para facilitar a leitura no balcão de vendas.`,
          temperature: 0.3
        }
      });

      const replyText = response.text || "Desculpe, não consegui obter essa resposta agora. Mas você pode consultar os guias rápidos acima!";
      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: "bot",
        text: replyText,
        timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      };
      setChatMessages(prev => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `bot-err-${Date.now()}`,
        sender: "bot",
        text: "Houve uma oscilação na conexão com a IA, mas não se preocupe: você pode ver as instruções completas clicando na aba 'Manuais & Dúvidas Rápidas' aqui em cima!",
        timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      };
      setChatMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsAiLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-slate-900 border border-purple-500/30 w-full max-w-4xl max-h-[92vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* TOP HEADER */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-purple-950/70 via-slate-900 to-indigo-950/70 border-b border-white/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-2xl shadow-lg shadow-purple-500/25">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black uppercase text-white tracking-wide">
                  Central de Ajuda & Assistente IA do PDV
                </h2>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Respostas Instantâneas
                </span>
              </div>
              <p className="text-xs text-purple-200/80 font-medium">
                Tudo explicado passo a passo: como cadastrar, zerar testes, sangrias, leitor de código e fechar caixa.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-xl transition-all cursor-pointer shrink-0"
            title="Fechar ajuda"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODE SWITCHER: MANUAIS RÁPIDOS VS CHAT COM IA */}
        <div className="flex border-b border-white/10 bg-slate-950/80 px-4 pt-3 gap-2">
          <button
            type="button"
            onClick={() => setActiveView("guias")}
            className={`pb-3 px-4 text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 border-b-2 cursor-pointer ${
              activeView === "guias"
                ? "text-purple-400 border-purple-500"
                : "text-slate-400 border-transparent hover:text-slate-200"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Manuais & Dúvidas Rápidas ({filteredGuides.length})</span>
          </button>
          
          <button
            type="button"
            onClick={() => setActiveView("chat")}
            className={`pb-3 px-4 text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 border-b-2 cursor-pointer ${
              activeView === "chat"
                ? "text-purple-400 border-purple-500"
                : "text-slate-400 border-transparent hover:text-slate-200"
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>Pergunte à IA do PDV 🤖</span>
          </button>
        </div>

        {/* VIEW 1: MANUAIS E DÚVIDAS RÁPIDAS */}
        {activeView === "guias" ? (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {/* Search Bar & Quick Categories */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ex: Como zerar teste, como cadastrar produto, leitor de código, sangria..."
                  className="w-full pl-10 pr-10 py-3 bg-slate-950 border border-white/10 focus:border-purple-500 rounded-2xl text-xs sm:text-sm text-white placeholder-slate-500 outline-none transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3.5 top-3.5 text-slate-500 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Category Pills */}
              <div className="flex flex-wrap gap-1.5 text-[10px] font-black uppercase tracking-wider">
                {[
                  { id: "todos", label: "Todos os Tópicos" },
                  { id: "reset", label: "Zerar Testes & Caixa ⚠️" },
                  { id: "produtos", label: "Cadastrar & Retirar Itens 📦" },
                  { id: "vendas", label: "Vendas & Leitor 🛒" },
                  { id: "caixa", label: "Fluxo & Sangria 💵" },
                  { id: "seguranca", label: "PIN & Permissões 🔑" }
                ].map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                      selectedCategory === cat.id
                        ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
                        : "bg-slate-950 text-slate-400 hover:text-white border border-white/5 hover:border-white/10"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Guides Accordion List */}
            <div className="space-y-3">
              {filteredGuides.length === 0 ? (
                <div className="p-8 text-center bg-slate-950/50 rounded-2xl border border-white/5 space-y-3">
                  <p className="text-sm text-slate-400">Nenhum manual direto encontrado com essa busca.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveView("chat");
                      setUserInput(searchQuery);
                    }}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-black uppercase rounded-xl transition-all inline-flex items-center gap-2"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Perguntar para a IA do PDV</span>
                  </button>
                </div>
              ) : (
                filteredGuides.map(item => {
                  const isExpanded = expandedGuideId === item.id;
                  const isReset = item.category === "reset";

                  return (
                    <div
                      key={item.id}
                      className={`border rounded-2xl transition-all overflow-hidden ${
                        isReset 
                          ? "bg-rose-950/20 border-rose-500/30 shadow-lg shadow-rose-950/20" 
                          : isExpanded
                            ? "bg-slate-950/80 border-purple-500/30 shadow-lg"
                            : "bg-slate-950/40 border-white/5 hover:border-white/15"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedGuideId(isExpanded ? null : item.id)}
                        className="w-full p-4 flex items-center justify-between gap-3 text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl shrink-0 ${
                            isReset ? "bg-rose-500/20 text-rose-400" : "bg-purple-500/10 text-purple-400"
                          }`}>
                            {isReset ? <RotateCcw className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
                          </div>
                          <div>
                            <h3 className={`text-xs sm:text-sm font-black uppercase tracking-wide ${
                              isReset ? "text-rose-300" : "text-white"
                            }`}>
                              {item.title}
                            </h3>
                            <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                              {item.shortDesc}
                            </p>
                          </div>
                        </div>

                        <div className="text-slate-400 shrink-0">
                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </div>
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="px-4 pb-4 sm:px-6 sm:pb-6 border-t border-white/5 space-y-3.5 pt-3.5"
                          >
                            <p className="text-xs text-slate-300 font-medium leading-relaxed">
                              {item.shortDesc}
                            </p>

                            <div className="space-y-2 bg-slate-900/90 p-3.5 rounded-xl border border-white/5">
                              <span className="text-[10px] font-black uppercase tracking-wider text-purple-300 block">
                                Passo a Passo Prático:
                              </span>
                              <div className="space-y-2">
                                {item.detailedSteps.map((step, idx) => (
                                  <div key={idx} className="flex items-start gap-2 text-xs text-slate-200">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                    <span className="leading-relaxed">{step}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {item.tips && (
                              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-200/90 flex items-start gap-2">
                                <span className="font-black text-amber-400 shrink-0">💡 Dica de Ouro:</span>
                                <span>{item.tips}</span>
                              </div>
                            )}

                            {isReset && (
                              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 bg-rose-950/40 p-3 rounded-xl border border-rose-500/20">
                                <span className="text-[11px] text-rose-300 font-semibold">
                                  Quer ir direto para a tela de zerar os dados de teste?
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    onClose();
                                    if (onNavigateToTab) onNavigateToTab("proprietario");
                                  }}
                                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-[10px] uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow"
                                >
                                  <span>Ir para Proprietário & Zerar</span>
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          /* VIEW 2: CHAT LIVRE COM A IA DO PDV */
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {chatMessages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex gap-3 max-w-[85%] ${
                    msg.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white shadow ${
                    msg.sender === "user" ? "bg-purple-600" : "bg-gradient-to-br from-indigo-500 to-purple-600"
                  }`}>
                    {msg.sender === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>

                  <div className={`p-3.5 sm:p-4 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-line ${
                    msg.sender === "user"
                      ? "bg-purple-600 text-white rounded-tr-none font-medium shadow-md shadow-purple-600/10"
                      : "bg-slate-950 border border-white/10 text-slate-100 rounded-tl-none font-sans shadow"
                  }`}>
                    {msg.text}
                    <span className="block text-[9px] text-slate-400/80 mt-2 text-right">
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              ))}

              {isAiLoading && (
                <div className="flex gap-3 max-w-[85%] mr-auto items-center">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="bg-slate-950 border border-white/10 text-slate-300 p-3 rounded-2xl rounded-tl-none text-xs flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                    <span>O Assistente está digitando a resposta...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Quick suggested chips */}
            <div className="px-4 py-2 border-t border-white/5 bg-slate-950/60 overflow-x-auto flex gap-2 no-scrollbar">
              {[
                "Como zerar os testes e o caixa?",
                "Como funciona o leitor de código de barras?",
                "Como cadastrar um produto novo?",
                "O que fazer na Zona de Perigo?"
              ].map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setUserInput(chip);
                  }}
                  className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-white/10 hover:border-purple-500/30 text-slate-300 hover:text-white rounded-lg text-[10px] font-bold whitespace-nowrap cursor-pointer transition-all"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Chat input form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="p-3 sm:p-4 bg-slate-950 border-t border-white/10 flex items-center gap-2"
            >
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Tire qualquer dúvida sobre o PDV (ex: como dar desconto, como tirar produto)..."
                className="flex-1 bg-slate-900 border border-white/10 focus:border-purple-500 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 outline-none transition-all"
              />
              <button
                type="submit"
                disabled={!userInput.trim() || isAiLoading}
                className="p-2.5 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl transition-all cursor-pointer disabled:cursor-not-allowed shadow-md shadow-purple-600/20"
                title="Enviar pergunta"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* FOOTER ADVICE */}
        <div className="p-3 bg-slate-950/90 border-t border-white/5 text-center text-[10px] text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2 px-6">
          <span>💡 Dúvidas frequentes são respondidas instantaneamente sem gastar internet.</span>
          <button
            type="button"
            onClick={onClose}
            className="text-purple-400 hover:text-purple-300 font-black uppercase tracking-wider"
          >
            Entendido, Voltar ao PDV ✔️
          </button>
        </div>
      </div>
    </div>
  );
};
