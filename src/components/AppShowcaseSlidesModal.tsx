import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Zap,
  CreditCard,
  QrCode,
  Camera,
  Layers,
  Calculator,
  FileText,
  Lock,
  Calendar,
  Percent,
  ShoppingBag,
  Tag,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  X,
  Smartphone,
  ShieldCheck,
  Building,
  Store,
  Printer,
  Archive,
  Search,
  ThumbsUp,
  Volume2,
  Video,
  BookOpen,
  ArrowRight,
  Eye,
  Sliders,
  DollarSign,
  UserCheck
} from "lucide-react";

interface AppShowcaseSlidesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToTab?: (tab: string, subtab?: string) => void;
}

export const AppShowcaseSlidesModal: React.FC<AppShowcaseSlidesModalProps> = ({
  isOpen,
  onClose,
  onNavigateToTab
}) => {
  const [activeTab, setActiveTab] = useState<"slides" | "videos">("slides");
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPlayingAuto, setIsPlayingAuto] = useState(false);
  const [activeVideoId, setActiveVideoId] = useState<string>("pix_webhook");
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(true);
  const [videoStepIndex, setVideoStepIndex] = useState<number>(0);

  // 14 Comprehensive Slides covering all killer features & how to use
  const slides = [
    {
      id: "overview",
      badge: "Super-App Comercial & Financeiro",
      title: "Visão Geral: Tudo em Um Só Aplicativo! 🌟",
      icon: <Sparkles className="w-8 h-8 text-yellow-400" />,
      color: "from-amber-500/20 via-slate-900 to-purple-950/40",
      accent: "text-amber-400",
      description:
        "O PDV Cérebro Inteligente reúne frente de caixa completa, calculadoras especializadas, inteligência artificial, controle de estoque, contas a pagar e emissão de recibos em um único lugar.",
      highlights: [
        "100% Offline-First: Funciona sem internet no computador, tablet ou celular",
        "Sem pegadinhas ou mensalidades abusivas: Dados seguros no seu dispositivo",
        "Projetado para mercearias, padarias, brechós, mercados e comércio geral",
        "Velocidade máxima com atalhos de teclado e modo touch-screen"
      ],
      quickTip: "Toque nos botões inferiores para navegar entre os slides ou use as setas do teclado."
    },
    {
      id: "duplo_carrinho",
      badge: "Diferencial de Velocidade",
      title: "2 Carrinhos Simultâneos (Fila Rápida / Cliente 1 & 2) ⚡",
      icon: <Layers className="w-8 h-8 text-sky-400" />,
      color: "from-sky-500/20 via-slate-900 to-indigo-950/40",
      accent: "text-sky-400",
      description:
        "Nunca mais tranque a fila quando um cliente esquecer a carteira ou for buscar mais um item na prateleira! O PDV mantém dois carrinhos independentes em tempo real.",
      highlights: [
        "Cliente 1 (Fila A) e Cliente 2 (Fila B) totalmente separados",
        "Itens, subtotais, descontos e formas de pagamento nunca se misturam",
        "Troca instantânea com um toque no topo do PDV",
        "Zera o estresse do operador e acelera o atendimento em horários de pico"
      ],
      quickTip: "Clique nas abas 'Cliente 1' e 'Cliente 2' no topo da tela de vendas para alternar instantaneamente."
    },
    {
      id: "mercado_pago",
      badge: "Pix Automático sem Conferir Extrato",
      title: "Mercado Pago Webhooks & Pix em 1 Segundo 📲",
      icon: <QrCode className="w-8 h-8 text-emerald-400" />,
      color: "from-emerald-500/20 via-slate-900 to-teal-950/40",
      accent: "text-emerald-400",
      description:
        "O sistema gera o QR Code Pix dinâmico com os centavos exatos da compra. O cliente aponta o celular de qualquer banco e o Webhook aprova sozinho!",
      highlights: [
        "Gera QR Code na tela do computador e imprime o cupom com Pix copia e cola",
        "O Webhook avisa o caixa em menos de 1 segundo: tela fica verde e toca campainha!",
        "O operador não precisa abrir o app do banco nem pedir comprovante ao cliente",
        "Integração com Maquininha Point (Bluetooth/Smart) para Débito e Crédito"
      ],
      quickTip: "No Passo 3 do pagamento, escolha Pix e toque em 'Gerar QR Code Mercado Pago'."
    },
    {
      id: "leitor_barras",
      badge: "Leitura Traseira HD",
      title: "Leitor de Código de Barras (Câmera Traseira HD) 📸",
      icon: <Camera className="w-8 h-8 text-purple-400" />,
      color: "from-purple-500/20 via-slate-900 to-pink-950/40",
      accent: "text-purple-400",
      description:
        "Configure o leitor para usar exclusivamente a câmera traseira do celular ou leitor USB de balcão com alta taxa de quadros e foco automático contínuo.",
      highlights: [
        "Lê EAN-13, EAN-8, UPC, Code-128 e QR Codes instantaneamente",
        "Mira horizontal otimizada para capturar códigos pequenos em embalagens curvas",
        "Botão de lanterna/flash para ler códigos em ambientes com pouca luz",
        "Lança o produto diretamente na comanda com bip sonoro de confirmação"
      ],
      quickTip: "Toque em 'F8 Câmera' ou pressione F8 no teclado físico para abrir o leitor."
    },
    {
      id: "ia_inteligente",
      badge: "Tecnologia de Ponta",
      title: "Inteligência Artificial (IA) Integrada 🤖",
      icon: <Sparkles className="w-8 h-8 text-yellow-400" />,
      color: "from-yellow-500/20 via-slate-900 to-amber-950/40",
      accent: "text-yellow-400",
      description:
        "Utilize a IA generativa para ler encartes de supermercados por foto, sugerir precificações, calcular orçamentos e otimizar a reposição de estoque.",
      highlights: [
        "Leitura OCR de fotos de folhetos e panfletos de ofertas locais",
        "Extração automática de nome e preço dos produtos direto para sua lista",
        "Dicas inteligentes de markup e margem de lucro para não ter prejuízo",
        "Sugestões de produtos com baixo estoque antes que faltem na prateleira"
      ],
      quickTip: "Na aba Encartes ou Calculadora, tire uma foto do folheto para a IA extrair os preços."
    },
    {
      id: "vendas_touch",
      badge: "Frente de Caixa",
      title: "Vendas & PDV Completo (Touch-Screen & Troco Travado) 🛒",
      icon: <Store className="w-8 h-8 text-emerald-400" />,
      color: "from-emerald-500/20 via-slate-900 to-cyan-950/40",
      accent: "text-emerald-400",
      description:
        "Cadastre novos itens com teclado touch grande na tela. Em pagamentos em dinheiro, o sistema bloqueia o fechamento até informar o valor recebido e exibir o troco!",
      highlights: [
        "Venda rápida por código numérico de 4 dígitos (ex: 0101, 0102)",
        "Teclado numérico touch com botões grandes de R$ 2, R$ 5, R$ 10, R$ 20, R$ 50",
        "Bloqueio anti-erro: caixa não finaliza dinheiro sem digitar o recebido e ver o troco",
        "Comando de pulso elétrico e simulação sonora para abertura de gaveta de dinheiro"
      ],
      quickTip: "Pressione F10 ou toque em 'Avançar para Pagamento' para ver as opções de troco."
    },
    {
      id: "calc_nota_excel",
      badge: "Gestão de Documentos",
      title: "Calculadora Nota, Bloco & Excel (Pastas Exclusivas) 📊",
      icon: <Calculator className="w-8 h-8 text-indigo-400" />,
      color: "from-indigo-500/20 via-slate-900 to-blue-950/40",
      accent: "text-indigo-400",
      description:
        "Faça contas como se estivesse no Excel, com colunas estruturadas, fórmulas automáticas e salvamento em pastas exclusivas no gaveteiro.",
      highlights: [
        "Soma automática de itens com multiplicação de quantidade x preço",
        "Filtro exclusivo no Gaveteiro: veja somente planilhas da Calculadora Nota & Excel",
        "Exportação direta para planilhas Excel (.xlsx) e relatórios PDF",
        "Edição rápida com histórico ilimitado de contas salvas"
      ],
      quickTip: "Abra a aba Pastas e clique no filtro '📊 Somente Calculadora Nota & Excel'."
    },
    {
      id: "cofre_dono",
      badge: "Segurança Máxima",
      title: "Configurações Importantíssimo & Cofre do Dono 🔐",
      icon: <ShieldCheck className="w-8 h-8 text-red-400" />,
      color: "from-red-500/20 via-slate-900 to-amber-950/40",
      accent: "text-red-400",
      description:
        "Proteção bancária definitiva: o Token do Mercado Pago e as configurações do comércio ficam 100% blindados por CPF do titular e PIN exclusivo do proprietário.",
      highlights: [
        "Funcionários do caixa nunca veem ou alteram o Token da conta bancária",
        "PIN exclusivo e independente para a movimentação do dinheiro",
        "Aviso em vermelho: PIN de segurança máxima com confirmação de CPF",
        "E-mail de recuperação seguro caso o proprietário esqueça o PIN"
      ],
      quickTip: "Acesse Configurações > Mercado Pago para configurar o seu Cofre Bancário."
    },
    {
      id: "taloes_recibos",
      badge: "Comprovantes Oficiais",
      title: "Talões, Recibos & Bloquinhos com Assinatura 📝",
      icon: <FileText className="w-8 h-8 text-purple-400" />,
      color: "from-purple-500/20 via-slate-900 to-violet-950/40",
      accent: "text-purple-400",
      description:
        "Emita notas promissórias, recibos de pagamento e talões de serviços com campo para o cliente assinar com o dedo direto na tela do celular ou tablet.",
      highlights: [
        "Assinatura digital manuscrita capturada em tela touch",
        "Impressão em impressoras térmicas de 58mm ou 80mm",
        "Compartilhamento instantâneo do comprovante em PDF pelo WhatsApp",
        "Pastas organizadas para encontrar qualquer recibo emitido em segundos"
      ],
      quickTip: "Na aba Bloco & Recibos, escolha 'Talão / Recibo' e colete a assinatura do cliente."
    },
    {
      id: "agenda_contas",
      badge: "Organização Financeira",
      title: "Agenda Inteligente & Contas a Pagar 📅",
      icon: <Calendar className="w-8 h-8 text-rose-400" />,
      color: "from-rose-500/20 via-slate-900 to-red-950/40",
      accent: "text-rose-400",
      description:
        "Tenha total controle sobre boletos, contas fixas (água, luz, aluguel), pagamentos de fornecedores e compromissos com avisos de vencimento.",
      highlights: [
        "Avisos visuais destacados para contas vencendo hoje ou em atraso",
        "Pastas dedicadas por fornecedor e categoria de despesa",
        "Baixa com um clique e integração com o fluxo de caixa do PDV",
        "Contador de saldo pendente versus faturamento do mês"
      ],
      quickTip: "Toque no ícone de Agenda para cadastrar boletos com data de vencimento."
    },
    {
      id: "calc_normal_integrada",
      badge: "Praticidade Total",
      title: "Calculadora Normal Integrada com Nota & Excel 🧮",
      icon: <Calculator className="w-8 h-8 text-teal-400" />,
      color: "from-teal-500/20 via-slate-900 to-emerald-950/40",
      accent: "text-teal-400",
      description:
        "Faça contas rápidas no teclado numérico tradicional e transfira o resultado direto para a nota fiscal, comanda ou orçamento com um único toque.",
      highlights: [
        "Operações aritméticas instantâneas com histórico de memória",
        "Botão 'Enviar para a Nota / Excel' sem ter que digitar tudo de novo",
        "Conversão automática de centavos e porcentagens de acréscimo",
        "Acesso flutuante durante qualquer etapa do atendimento"
      ],
      quickTip: "Use o botão da calculadora flutuante para somar contas avulsas do cliente."
    },
    {
      id: "precificacao",
      badge: "Lucro Garantido",
      title: "Calculadoras de Precificação (Markup & Margem Real) 🏷️",
      icon: <Percent className="w-8 h-8 text-amber-400" />,
      color: "from-amber-500/20 via-slate-900 to-yellow-950/40",
      accent: "text-amber-400",
      description:
        "Nunca venda mercadoria no prejuízo! Calcule o preço de venda ideal considerando custo do produto, taxa da maquininha de cartão, impostos e lucro limpo.",
      highlights: [
        "Método 1: Markup Multiplicador sobre o custo da compra",
        "Método 2: Margem de Lucro Líquida Real descontando todas as taxas",
        "Simulação de taxas de débito e crédito parcelado",
        "Atualização automática do preço no catálogo de produtos do PDV"
      ],
      quickTip: "Na aba Precificação, digite o custo de compra para descobrir quanto cobrar."
    },
    {
      id: "compras_encartes",
      badge: "Economia Real",
      title: "Lista de Compras, Encartes & Ofertas 🛍️",
      icon: <ShoppingBag className="w-8 h-8 text-sky-400" />,
      color: "from-sky-500/20 via-slate-900 to-blue-950/40",
      accent: "text-sky-400",
      description:
        "Monte listas de compras estruturadas por corredor de mercado, confira preços de encartes promocionais e some os gastos antes de chegar ao caixa.",
      highlights: [
        "Catálogo inteligente com mais de 20 itens essenciais pré-cadastrados",
        "Marcador de itens checados [X] com atualização do subtotal restante",
        "Espaço para encartes digitais e folhetos semanais de atacadistas",
        "Leitura em voz alta dos itens para facilitar as compras na loja"
      ],
      quickTip: "Na aba Bloco & Compras, ative o 'Modo Supermercado' para ver o somador de carrinho."
    },
    {
      id: "auditoria_caixa",
      badge: "Gestão Transparente",
      title: "Verificação, Auditoria & Fechamento de Caixa 🔍",
      icon: <CheckCircle2 className="w-8 h-8 text-emerald-400" />,
      color: "from-emerald-500/20 via-slate-900 to-teal-950/40",
      accent: "text-emerald-400",
      description:
        "Fechamento de caixa cego ou detalhado, auditoria de quebra de caixa, sangrias, suprimentos e conferência rigorosa de estoque.",
      highlights: [
        "Abertura de caixa com valor de fundo de troco registrado",
        "Fechamento com conferência por dinheiro, pix, débito, crédito e fiado",
        "Relatório X e Redução Z impressos na bobina térmica térmica de 58/80mm",
        "Registro de quem fez cada venda com PIN individual de funcionário"
      ],
      quickTip: "No final do expediente, clique em 'Fechar Caixa' para imprimir o fechamento do dia."
    }
  ];

  // Simulated Interactive Video Demonstrations
  const videoDemos = [
    {
      id: "pix_webhook",
      title: "Venda Rápida com Pix & Webhook em 1 Segundo 📲",
      duration: "0:45",
      steps: [
        "1. Operador adiciona itens ao carrinho no PDV",
        "2. Seleciona forma de pagamento 'Pix' no Passo 3",
        "3. Sistema gera QR Code dinâmico na tela",
        "4. Cliente abre o app do banco no celular e aponta a câmera",
        "5. Webhook avisa o PDV: Som 'Plim!', tela verde e cupom impresso!"
      ],
      screenSimulation: (step: number) => (
        <div className="bg-slate-950 p-4 rounded-2xl border border-white/10 space-y-3 font-mono text-left">
          <div className="flex items-center justify-between text-xs pb-2 border-b border-white/10">
            <span className="text-slate-400 font-bold uppercase">PDV CÉREBRO - CAIXA 01</span>
            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
              step >= 4 ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-sky-500/20 text-sky-400"
            }`}>
              {step >= 4 ? "PIX APROVADO! 🟢" : "AGUARDANDO PAGAMENTO ⏳"}
            </span>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-[10px] text-slate-400 font-sans">VALOR TOTAL DA VENDA</p>
              <p className="text-xl font-black text-emerald-400">R$ 48,50</p>
            </div>
            <div className="p-2 bg-white rounded-lg flex items-center justify-center">
              <QrCode className="w-12 h-12 text-slate-950" />
            </div>
          </div>

          <div className="p-2.5 bg-slate-900 rounded-xl border border-white/5 space-y-1">
            <p className="text-[9px] text-slate-300 font-sans">
              <strong>Status Webhook:</strong> {step >= 4 ? "Notificação recebida via Mercado Pago API (ID: 9847291)" : "Monitorando porta segura de webhooks..."}
            </p>
            {step >= 4 && (
              <p className="text-[9.5px] text-emerald-400 font-sans font-bold flex items-center gap-1 animate-pulse">
                <CheckCircle2 className="w-3.5 h-3.5" /> Cupom emitido com sucesso na bobina térmica!
              </p>
            )}
          </div>
        </div>
      )
    },
    {
      id: "dois_carrinhos",
      title: "Como Usar os 2 Carrinhos Simultâneos (Fila Dupla) ⚡",
      duration: "0:38",
      steps: [
        "1. Cliente 1 está passando compras no caixa",
        "2. Cliente 1 esqueceu o azeite e vai buscar na prateleira",
        "3. Caixa toca na aba 'Cliente 2 (Fila B)' com um toque",
        "4. Atende o Cliente 2 normalmente sem misturar nada",
        "5. Quando Cliente 1 voltar, toca em 'Cliente 1' e conclui a venda!"
      ],
      screenSimulation: (step: number) => (
        <div className="bg-slate-950 p-4 rounded-2xl border border-white/10 space-y-3 font-mono text-left">
          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className={`p-2 rounded-xl border transition-all ${
              step >= 2 && step <= 3 ? "bg-slate-900 border-white/10 text-slate-400" : "bg-sky-500/20 border-sky-400 text-sky-300 font-black"
            }`}>
              🛒 CLIENTE 1 (Fila A) <br />
              <span className="text-[9px]">3 itens - R$ 34,90</span>
            </div>
            <div className={`p-2 rounded-xl border transition-all ${
              step >= 2 && step <= 3 ? "bg-purple-500/20 border-purple-400 text-purple-300 font-black" : "bg-slate-900 border-white/10 text-slate-400"
            }`}>
              🛒 CLIENTE 2 (Fila B) <br />
              <span className="text-[9px]">1 item - R$ 12,00</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-300 font-sans leading-relaxed">
            {step < 2 ? "Passando as compras do Cliente 1..." : step <= 3 ? "Cliente 1 pausado! Atendendo Cliente 2 na Fila B..." : "Cliente 1 retornou! Venda finalizada com sucesso!"}
          </p>
        </div>
      )
    },
    {
      id: "scanner_traseiro",
      title: "Leitor de Código de Barras com Câmera Traseira 📸",
      duration: "0:40",
      steps: [
        "1. No balcão de vendas, aperte F8 ou toque em 'Câmera'",
        "2. A câmera traseira abre em tela cheia com mira horizontal",
        "3. Aponte para o código de barras da embalagem",
        "4. Foco automático contínuo reconhece o EAN-13",
        "5. O produto é lançado instantaneamente no carrinho com bip!"
      ],
      screenSimulation: (step: number) => (
        <div className="bg-slate-950 p-4 rounded-2xl border border-white/10 space-y-3 font-mono text-left relative overflow-hidden">
          <div className="h-28 bg-slate-900 rounded-xl border border-purple-500/30 flex flex-col items-center justify-center relative">
            <div className="w-48 h-14 border-2 border-emerald-400 rounded-lg flex items-center justify-center relative">
              <div className="absolute inset-x-0 h-0.5 bg-red-500 shadow-md shadow-red-500 animate-pulse" />
              <span className="text-[9px] text-slate-400">7891000100101</span>
            </div>
            <span className="text-[8px] text-emerald-400 mt-2 font-sans font-bold">
              {step >= 3 ? "BIP! PRODUTO RECONHECIDO (REFRIGERANTE 2L)" : "ENQUADRE O CÓDIGO NA LINHA VERMELHA"}
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-300 font-sans">
            <span>Câmera: <strong>Traseira (Environment)</strong></span>
            <span className="text-emerald-400 font-bold">30 FPS HD</span>
          </div>
        </div>
      )
    },
    {
      id: "cofre_bancario",
      title: "Como Funciona o Cofre Bancário do Dono 🔐",
      duration: "0:42",
      steps: [
        "1. O proprietário cadastra o CPF e um PIN de segurança máxima",
        "2. Informa o e-mail de recuperação em caso de esquecimento",
        "3. O cofre fica trancado por padrão: funcionários não acessam o Token",
        "4. As vendas no caixa continuam recebendo Pix normalmente",
        "5. Para ver ou alterar credenciais, digite o CPF e o PIN do dono!"
      ],
      screenSimulation: (step: number) => (
        <div className="bg-slate-950 p-4 rounded-2xl border border-red-500/30 space-y-3 font-mono text-left">
          <div className="flex items-center gap-2 text-red-400 border-b border-white/10 pb-2">
            <Lock className="w-4 h-4 text-red-500" />
            <span className="text-xs font-black uppercase text-red-200">COFRE DO TOKEN: 100% BLINDADO</span>
          </div>
          <div className="space-y-1 text-[9.5px] text-slate-300 font-sans">
            <p>• Titular: CPF ***.***.892-01</p>
            <p>• Token Mercado Pago: APP_USR-••••••••••••••••</p>
            <p className="text-emerald-400 font-bold">✓ Vendas ativas no balcão sem expor a conta bancária!</p>
          </div>
        </div>
      )
    }
  ];

  // Auto-play timer for presentation slides
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isPlayingAuto && activeTab === "slides") {
      timer = setInterval(() => {
        setCurrentSlideIndex((prev) => (prev + 1) % slides.length);
      }, 7000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlayingAuto, activeTab, slides.length]);

  // Simulated video step progression timer
  useEffect(() => {
    let videoTimer: NodeJS.Timeout | null = null;
    if (isVideoPlaying && activeTab === "videos") {
      videoTimer = setInterval(() => {
        setVideoStepIndex((prev) => (prev + 1) % 5);
      }, 2500);
    }
    return () => {
      if (videoTimer) clearInterval(videoTimer);
    };
  }, [isVideoPlaying, activeTab, activeVideoId]);

  if (!isOpen) return null;

  const currentSlide = slides[currentSlideIndex];
  const currentVideo = videoDemos.find((v) => v.id === activeVideoId) || videoDemos[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 text-white overflow-y-auto">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-slate-900 border border-white/10 rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl flex flex-col my-auto max-h-[92vh]"
      >
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3 text-left">
            <div className="p-2.5 bg-gradient-to-tr from-amber-500 to-purple-600 rounded-2xl text-slate-950 font-black text-xl shadow-lg flex items-center justify-center shrink-0">
              👆
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black uppercase text-white tracking-wide font-sans">
                  Guia Interativo & Diferenciais do Aplicativo
                </h3>
                <span className="text-[8.5px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 uppercase">
                  Tour Completo
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-sans">
                Aprenda a usar cada recurso e descubra por que este é o sistema mais completo para o seu comércio!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Fechar Guia"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* View Mode Selector Tabs */}
        <div className="px-4 sm:px-6 pt-3 bg-slate-950/50 border-b border-white/5 flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("slides")}
            className={`px-4 py-2 rounded-t-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer border-b-2 ${
              activeTab === "slides"
                ? "border-amber-400 text-amber-300 bg-white/[0.04]"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Apresentação em Slides ({slides.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("videos");
              setIsVideoPlaying(true);
            }}
            className={`px-4 py-2 rounded-t-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer border-b-2 ${
              activeTab === "videos"
                ? "border-sky-400 text-sky-300 bg-white/[0.04]"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Vídeos & Demonstrações Animadas ({videoDemos.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 text-left space-y-4">
          {activeTab === "slides" ? (
            // ================= VIEW: PRESENTATION SLIDES =================
            <div className="space-y-4">
              {/* Active Slide Card */}
              <div
                className={`bg-gradient-to-br ${currentSlide.color} border border-white/10 rounded-3xl p-5 sm:p-7 shadow-xl relative overflow-hidden`}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-slate-950/70 border border-white/10 rounded-2xl shadow-inner shrink-0">
                      {currentSlide.icon}
                    </div>
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block font-sans">
                        Slide {currentSlideIndex + 1} de {slides.length} • {currentSlide.badge}
                      </span>
                      <h4 className="text-base sm:text-lg font-black text-white uppercase tracking-tight font-sans">
                        {currentSlide.title}
                      </h4>
                    </div>
                  </div>

                  <span className={`text-xs font-black uppercase font-mono px-3 py-1 rounded-full bg-slate-950/80 border border-white/10 ${currentSlide.accent}`}>
                    Diferencial #{currentSlideIndex + 1}
                  </span>
                </div>

                <div className="py-4 space-y-3.5">
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans font-medium">
                    {currentSlide.description}
                  </p>

                  <div className="bg-slate-950/70 p-4 rounded-2xl border border-white/5 space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block font-sans">
                      Destaques & O que Tem de Bom:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-sans text-slate-300">
                      {currentSlide.highlights.map((h, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                          <span>{h}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-2 text-[10px] text-amber-300 font-sans">
                    <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                    <span><strong>Como Usar:</strong> {currentSlide.quickTip}</span>
                  </div>
                </div>
              </div>

              {/* Slide Navigation Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                {/* Dots indicator */}
                <div className="flex items-center gap-1.5 flex-wrap justify-center">
                  {slides.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCurrentSlideIndex(idx)}
                      className={`h-2 rounded-full transition-all cursor-pointer ${
                        idx === currentSlideIndex
                          ? "w-6 bg-amber-400"
                          : "w-2 bg-slate-700 hover:bg-slate-500"
                      }`}
                      title={`Ir para slide ${idx + 1}`}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setIsPlayingAuto(!isPlayingAuto)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer border ${
                      isPlayingAuto
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                        : "bg-slate-800 text-slate-300 border-white/5 hover:bg-slate-700"
                    }`}
                  >
                    {isPlayingAuto ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{isPlayingAuto ? "Pausar Apresentação" : "Auto-Play"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentSlideIndex((prev) => (prev > 0 ? prev - 1 : slides.length - 1))}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-white transition-all cursor-pointer flex items-center gap-1 border border-white/5"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Anterior</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentSlideIndex((prev) => (prev + 1) % slides.length)}
                    className="px-4 py-2 bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 rounded-xl text-xs font-black text-slate-950 uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 shadow-md"
                  >
                    <span>Próximo</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            // ================= VIEW: INTERACTIVE VIDEO DEMOS =================
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                {/* Video Playlist Sidebar */}
                <div className="md:col-span-4 space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block font-sans">
                    Escolha o Vídeo Explicativo:
                  </span>
                  <div className="space-y-1.5">
                    {videoDemos.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => {
                          setActiveVideoId(v.id);
                          setVideoStepIndex(0);
                          setIsVideoPlaying(true);
                        }}
                        className={`w-full p-3 rounded-2xl text-left transition-all cursor-pointer border flex items-center justify-between gap-2 ${
                          activeVideoId === v.id
                            ? "bg-sky-500/15 border-sky-400 text-white shadow-md shadow-sky-950/40"
                            : "bg-slate-950/60 hover:bg-slate-800 text-slate-400 border-white/5"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`p-1.5 rounded-lg ${activeVideoId === v.id ? "bg-sky-500 text-slate-950" : "bg-slate-800 text-slate-400"}`}>
                            <Play className="w-3.5 h-3.5 fill-current" />
                          </div>
                          <span className="text-[11px] font-bold leading-tight font-sans line-clamp-2">
                            {v.title}
                          </span>
                        </div>
                        <span className="text-[9px] font-mono text-slate-500 font-bold shrink-0">{v.duration}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Simulated Video Player Screen */}
                <div className="md:col-span-8 bg-slate-950 rounded-3xl border border-white/10 p-5 space-y-4 shadow-xl text-left">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-xs font-black uppercase text-white font-sans">
                        Demonstração Visual: {currentVideo.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsVideoPlaying(!isVideoPlaying)}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-white/10 rounded-lg text-[9.5px] font-bold text-slate-300 uppercase cursor-pointer"
                      >
                        {isVideoPlaying ? "Pausar" : "Tocar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setVideoStepIndex(0)}
                        className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                        title="Reiniciar Vídeo"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Simulated Screen Stage */}
                  <div className="relative">
                    {currentVideo.screenSimulation(videoStepIndex)}
                  </div>

                  {/* Step Progress & Walkthrough list */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] text-slate-400">
                      <span>Passo {videoStepIndex + 1} de {currentVideo.steps.length}</span>
                      <span className="text-sky-400 font-bold">Demonstração Interativa</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-white/5">
                      <div
                        className="h-full bg-gradient-to-r from-sky-400 to-emerald-400 transition-all duration-300"
                        style={{ width: `${((videoStepIndex + 1) / currentVideo.steps.length) * 100}%` }}
                      />
                    </div>

                    <div className="p-3 bg-slate-900/60 rounded-xl border border-white/5 text-xs text-slate-200 font-sans">
                      <p className="font-bold text-sky-400">
                        {currentVideo.steps[videoStepIndex]}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="text-amber-400">💡</span>
            <span>Você pode reabrir esta apresentação a qualquer momento pelo botão <strong>👆 Como Usar</strong> no topo do app.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl uppercase text-[10px] transition-all cursor-pointer"
          >
            Fechar & Ir ao Sistema 🚀
          </button>
        </div>
      </motion.div>
    </div>
  );
};
