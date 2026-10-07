import React, { useState, useEffect } from "react";
import { 
  Search, 
  Camera, 
  Zap, 
  Plus, 
  Minus, 
  Trash2, 
  ShoppingBag, 
  ShoppingCart, 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle2, 
  Printer, 
  Share2, 
  FileText, 
  Copy, 
  User, 
  Users,
  CreditCard, 
  Coins, 
  Percent, 
  Sparkles, 
  X, 
  Barcode, 
  QrCode, 
  ChevronRight,
  Store,
  DollarSign,
  Sliders,
  RotateCcw,
  Repeat,
  AlertTriangle,
  Lock,
  Unlock,
  Layers,
  Wallet,
  Save
} from "lucide-react";
import { PDVTransaction, CartItem } from "./PDVModule";

interface PDVSalesTransitionStepperProps {
  saleTransactionStep: 1 | 2 | 3 | 4;
  setSaleTransactionStep: (step: 1 | 2 | 3 | 4) => void;
  salesLayoutMode: "stepper" | "split";
  setSalesLayoutMode: (mode: "stepper" | "split") => void;
  cart: CartItem[];
  cartTotal: number;
  cartSubtotal: number;
  finalDiscount: number;
  handleAddToCart: (name: string, price: number, id?: string, extra?: any, customQty?: number) => void;
  handleUpdateCartQty: (id: string, delta: number) => void;
  handleRemoveFromCart: (id: string, name: string) => void;
  handleClearCart: () => void;
  handleOpenEditCartItem: (item: CartItem) => void;
  activeProductsList: any[];
  catalogSearch: string;
  setCatalogSearch: (val: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  categoryCounters: Record<string, number>;
  setIsScannerOpen: (open: boolean) => void;
  setIsCreatingProduct: (fn: (prev: boolean) => boolean) => void;
  setIsQuickRegisterModalOpen: (open: boolean) => void;
  setQuickRegCode: (code: string) => void;
  clientName: string;
  setClientName: (name: string) => void;
  cartPaymentMethod: PDVTransaction["paymentMethod"];
  setCartPaymentMethod: (m: PDVTransaction["paymentMethod"]) => void;
  amountPaidByClient: string;
  setAmountPaidByClient: (val: string) => void;
  changeToGive: number | null;
  discountPercent: number;
  setDiscountPercent: (val: number) => void;
  discountValue: string;
  setDiscountValue: (val: string) => void;
  handleCheckout: (e?: React.FormEvent) => void;
  receiptToShow: PDVTransaction | null;
  setReceiptToShow: (tx: PDVTransaction | null) => void;
  printerType: "58mm" | "80mm" | "A4";
  setPrinterType: (type: "58mm" | "80mm" | "A4") => void;
  storeCustomName: string;
  setStoreCustomName: (name: string) => void;
  storeCustomCnpjCpf: string;
  setStoreCustomCnpjCpf: (cnpj: string) => void;
  receiptFooterMsg: string;
  setReceiptFooterMsg: (msg: string) => void;
  handlePrintReceiptWindow: (tx: PDVTransaction) => void;
  generateReceiptText: (tx: PDVTransaction) => string;
  formatCurrency: (val: number) => string;
  showNotification: (msg: string, type: "success" | "error" | "info" | "warning") => void;
  parsePortugueseNumber: (val: string) => number;
  onOpenPrinterConfig?: () => void;
  lastCompletedTransaction?: PDVTransaction | null;
  onCorrectSale?: (tx?: PDVTransaction | null) => void;
  onCancelSale?: (tx?: PDVTransaction | null) => void;
  onReturnItems?: (tx?: PDVTransaction | null) => void;
  activeCartSlot?: 1 | 2;
  onSwitchCartSlot?: (slot: 1 | 2) => void;
  cartSlot1Count?: number;
  cartSlot1Total?: number;
  cartSlot2Count?: number;
  cartSlot2Total?: number;
  splitPaymentEnabled?: boolean;
  setSplitPaymentEnabled?: (enabled: boolean) => void;
  splitCashAmount?: string;
  setSplitCashAmount?: (val: string) => void;
  splitSecondaryMethod?: PDVTransaction["paymentMethod"];
  setSplitSecondaryMethod?: (method: PDVTransaction["paymentMethod"]) => void;
  splitSecondaryAmount?: string;
  setSplitSecondaryAmount?: (val: string) => void;
  onTriggerCashDrawer?: (change: number, paid?: number) => void;
  onStartMpPixCheckout?: (customAmount?: number) => void;
}

export function PDVSalesTransitionStepper({
  saleTransactionStep,
  setSaleTransactionStep,
  salesLayoutMode,
  setSalesLayoutMode,
  cart,
  cartTotal,
  cartSubtotal,
  finalDiscount,
  handleAddToCart,
  handleUpdateCartQty,
  handleRemoveFromCart,
  handleClearCart,
  handleOpenEditCartItem,
  activeProductsList,
  catalogSearch,
  setCatalogSearch,
  selectedCategory,
  setSelectedCategory,
  categoryCounters,
  setIsScannerOpen,
  setIsCreatingProduct,
  setIsQuickRegisterModalOpen,
  setQuickRegCode,
  clientName,
  setClientName,
  cartPaymentMethod,
  setCartPaymentMethod,
  amountPaidByClient,
  setAmountPaidByClient,
  changeToGive,
  discountPercent,
  setDiscountPercent,
  discountValue,
  setDiscountValue,
  handleCheckout,
  receiptToShow,
  setReceiptToShow,
  lastCompletedTransaction,
  printerType,
  setPrinterType,
  storeCustomName,
  setStoreCustomName,
  storeCustomCnpjCpf,
  setStoreCustomCnpjCpf,
  receiptFooterMsg,
  setReceiptFooterMsg,
  handlePrintReceiptWindow,
  generateReceiptText,
  formatCurrency,
  showNotification,
  parsePortugueseNumber,
  onOpenPrinterConfig,
  onCorrectSale,
  onCancelSale,
  onReturnItems,
  activeCartSlot = 1,
  onSwitchCartSlot,
  cartSlot1Count = 0,
  cartSlot1Total = 0,
  cartSlot2Count = 0,
  cartSlot2Total = 0,
  splitPaymentEnabled = false,
  setSplitPaymentEnabled,
  splitCashAmount = "",
  setSplitCashAmount,
  splitSecondaryMethod = "pix",
  setSplitSecondaryMethod,
  splitSecondaryAmount = "",
  setSplitSecondaryAmount,
  onTriggerCashDrawer,
  onStartMpPixCheckout
}: PDVSalesTransitionStepperProps) {
  const activeReceipt = receiptToShow || lastCompletedTransaction || null;
  const [creditInstallments, setCreditInstallments] = useState<number>(1);
  const [cpfNota, setCpfNota] = useState<string>("");
  const [displayLimit, setDisplayLimit] = useState<number>(60);

  // --- Touch-Screen Product Register States ---
  const [isTouchRegisterOpen, setIsTouchRegisterOpen] = useState(false);
  const [touchProdName, setTouchProdName] = useState("");
  const [touchProdPrice, setTouchProdPrice] = useState("");
  const [touchProdCategory, setTouchProdCategory] = useState("Alimentos");
  const [touchProdUnit, setTouchProdUnit] = useState("UN");
  const [touchProdQuickCode, setTouchProdQuickCode] = useState("");
  const [touchProdBarcode, setTouchProdBarcode] = useState("");
  const [showTouchNumpad, setShowTouchNumpad] = useState(true);
  const [touchNumpadTarget, setTouchNumpadTarget] = useState<"price" | "quickCode">("price");

  const handleTouchNumpadPress = (key: string) => {
    if (touchNumpadTarget === "price") {
      if (key === "CLEAR") {
        setTouchProdPrice("");
      } else if (key === "BACKSPACE") {
        setTouchProdPrice(prev => prev.slice(0, -1));
      } else if (key === "," || key === ".") {
        if (!touchProdPrice.includes(",") && !touchProdPrice.includes(".")) {
          setTouchProdPrice(prev => prev ? `${prev},` : "0,");
        }
      } else {
        setTouchProdPrice(prev => `${prev}${key}`);
      }
    } else {
      if (key === "CLEAR") {
        setTouchProdQuickCode("");
      } else if (key === "BACKSPACE") {
        setTouchProdQuickCode(prev => prev.slice(0, -1));
      } else if (key !== "," && key !== ".") {
        if (touchProdQuickCode.length < 4) {
          setTouchProdQuickCode(prev => `${prev}${key}`);
        }
      }
    }
  };

  const handleSaveTouchProduct = (andAddToCart: boolean) => {
    const trimmedName = touchProdName.trim();
    if (!trimmedName) {
      showNotification("Digite o nome do produto!", "warning");
      return;
    }
    const cleanPriceStr = touchProdPrice.replace("R$", "").replace(/\s/g, "").replace(".", "").replace(",", ".");
    const priceVal = parseFloat(cleanPriceStr) || 0;
    if (priceVal <= 0) {
      showNotification("Digite um preço válido maior que zero!", "warning");
      return;
    }

    const newProdId = `cp_touch_${Date.now()}`;
    const newProduct = {
      id: newProdId,
      name: trimmedName,
      price: priceVal,
      category: touchProdCategory,
      unit: touchProdUnit,
      quickCode: touchProdQuickCode.trim() || undefined,
      barcode: touchProdBarcode.trim() || undefined
    };

    try {
      const existingStr = localStorage.getItem("pdv_custom_products") || "[]";
      const existing = JSON.parse(existingStr);
      const updated = [newProduct, ...existing];
      localStorage.setItem("pdv_custom_products", JSON.stringify(updated));
      window.dispatchEvent(new Event("storage"));
    } catch (e) {
      console.warn("Storage sync:", e);
    }

    if (andAddToCart) {
      handleAddToCart(trimmedName, priceVal, newProdId, {
        unit: touchProdUnit,
        quickCode: touchProdQuickCode.trim(),
        barcode: touchProdBarcode.trim()
      });
      showNotification(`"${trimmedName}" cadastrado e adicionado ao carrinho! 🛒⚡`, "success");
    } else {
      showNotification(`"${trimmedName}" salvo no catálogo com sucesso! 🛍️✅`, "success");
    }

    // Reset & close
    setTouchProdName("");
    setTouchProdPrice("");
    setTouchProdQuickCode("");
    setTouchProdBarcode("");
    setIsTouchRegisterOpen(false);
  };

  useEffect(() => {
    setDisplayLimit(60);
  }, [catalogSearch, selectedCategory]);

  const totalCartItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Quick cash amounts for Dinheiro payment
  const quickCashOptions = [
    { label: "Valor Exato", value: cartTotal },
    { label: "R$ 10", value: 10 },
    { label: "R$ 20", value: 20 },
    { label: "R$ 50", value: 50 },
    { label: "R$ 100", value: 100 },
    { label: "R$ 200", value: 200 }
  ];

  return (
    <div className="w-full space-y-4">
      {/* ========================================================
          BARRA DE 2 CARRINHOS SIMULTÂNEOS (FILA DUPLA: CLIENTE 1 / CLIENTE 2)
         ======================================================== */}
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-3 sm:p-4 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase text-white tracking-wider">
                2 Carrinhos de Compras Simultâneos
              </span>
              <span className="text-[9px] font-black uppercase bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30">
                Fila Rápida ⚡
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              Alterne entre o Cliente 1 e o Cliente 2 sem perder nenhum produto nem misturar a forma de pagamento!
            </p>
          </div>
        </div>

        {/* Dual Cart Slots Switcher */}
        <div className="flex items-center gap-2 shrink-0 bg-slate-950 p-1.5 rounded-xl border border-white/10">
          <button
            type="button"
            onClick={() => onSwitchCartSlot && onSwitchCartSlot(1)}
            className={`px-3 py-2 rounded-lg text-xs font-black uppercase transition-all flex items-center gap-2 cursor-pointer ${
              activeCartSlot === 1
                ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 ring-2 ring-emerald-400"
                : "bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800"
            }`}
            title="Carrinho do Cliente 1 (Fila A)"
          >
            <User className="w-3.5 h-3.5" />
            <span>Cliente 1 (Fila A)</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold ${
              activeCartSlot === 1 ? "bg-slate-950 text-emerald-400" : "bg-emerald-500/20 text-emerald-400"
            }`}>
              {cartSlot1Count} un • {formatCurrency(cartSlot1Total)}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSwitchCartSlot && onSwitchCartSlot(2)}
            className={`px-3 py-2 rounded-lg text-xs font-black uppercase transition-all flex items-center gap-2 cursor-pointer ${
              activeCartSlot === 2
                ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 ring-2 ring-cyan-400"
                : "bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800"
            }`}
            title="Carrinho do Cliente 2 (Fila B)"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Cliente 2 (Fila B)</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold ${
              activeCartSlot === 2 ? "bg-slate-950 text-cyan-400" : "bg-cyan-500/20 text-cyan-400"
            }`}>
              {cartSlot2Count} un • {formatCurrency(cartSlot2Total)}
            </span>
          </button>
        </div>
      </div>
      {/* ========================================================
          TOP STEPPER PROGRESS BAR (4 TRANSACTIONS TRANSITION STEPS)
         ======================================================== */}
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-3 sm:p-4 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Transition Step Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-1">
            {/* Passo 1: Escolher Produtos */}
            <button
              type="button"
              onClick={() => setSaleTransactionStep(1)}
              className={`px-3 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
                saleTransactionStep === 1
                  ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                  : "bg-slate-950 text-slate-300 hover:text-white border border-white/5"
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                saleTransactionStep === 1 ? "bg-slate-950 text-emerald-400" : "bg-white/10 text-slate-300"
              }`}>1</span>
              <span>1. Escolher Produtos</span>
            </button>

            <span className="text-slate-600 font-bold shrink-0">➔</span>

            {/* Passo 2: Quantidades e Nome */}
            <button
              type="button"
              onClick={() => {
                if (cart.length === 0) {
                  showNotification("Adicione ao menos 1 produto no carrinho para ajustar quantidades!", "warning");
                  return;
                }
                setSaleTransactionStep(2);
              }}
              className={`px-3 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
                saleTransactionStep === 2
                  ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                  : "bg-slate-950 text-slate-300 hover:text-white border border-white/5"
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                saleTransactionStep === 2 ? "bg-slate-950 text-emerald-400" : "bg-white/10 text-slate-300"
              }`}>2</span>
              <span>2. Quantidades {totalCartItemsCount > 0 ? `(${totalCartItemsCount})` : ""}</span>
            </button>

            <span className="text-slate-600 font-bold shrink-0">➔</span>

            {/* Passo 3: Cliente & Pagamento */}
            <button
              type="button"
              onClick={() => {
                if (cart.length === 0) {
                  showNotification("Adicione ao menos 1 produto no carrinho para ir ao pagamento!", "warning");
                  return;
                }
                setSaleTransactionStep(3);
              }}
              className={`px-3 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
                saleTransactionStep === 3
                  ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                  : "bg-slate-950 text-slate-300 hover:text-white border border-white/5"
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                saleTransactionStep === 3 ? "bg-slate-950 text-emerald-400" : "bg-white/10 text-slate-300"
              }`}>3</span>
              <span>3. Cliente & Pagamento</span>
            </button>

            <span className="text-slate-600 font-bold shrink-0">➔</span>

            {/* Passo 4: Finalizar & Cupom Fiscal */}
            <button
              type="button"
              onClick={() => {
                if (!receiptToShow && cart.length > 0) {
                  setSaleTransactionStep(3);
                  showNotification("Conclua o pagamento para visualizar e emitir o cupom fiscal!", "info");
                  return;
                }
                setSaleTransactionStep(4);
              }}
              className={`px-3 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
                saleTransactionStep === 4
                  ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                  : "bg-slate-950 text-slate-300 hover:text-white border border-white/5"
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                saleTransactionStep === 4 ? "bg-slate-950 text-emerald-400" : "bg-white/10 text-slate-300"
              }`}>4</span>
              <span>4. Finalizar & Cupom Fiscal</span>
            </button>
          </div>

          {/* Quick Cart Pill & View mode toggle */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2 shadow-inner">
              <ShoppingCart className="w-4 h-4 text-emerald-400" />
              <span className="text-[11px] font-bold text-slate-300">{totalCartItemsCount} un</span>
              <span className="text-xs font-black font-mono text-emerald-400">{formatCurrency(cartTotal)}</span>
            </div>

            <button
              type="button"
              onClick={() => setSalesLayoutMode(salesLayoutMode === "stepper" ? "split" : "stepper")}
              className="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-800 border border-white/10 text-[9px] font-extrabold uppercase text-slate-300 hover:text-white rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-sm"
              title="Alternar entre modo Passo a Passo (Transições) e Balcão Dividido"
            >
              ⚡ Balcão Dividido
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================
          PASSO 1: ESCOLHER PRODUTOS A SEREM VENDIDOS
         ======================================================== */}
      {saleTransactionStep === 1 && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-white/5 rounded-2xl p-5 space-y-4">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
              <div>
                <span className="text-[9px] font-black uppercase text-emerald-400 tracking-wider">Passo 1 de 4</span>
                <h3 className="text-sm font-black uppercase text-white mt-0.5 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-emerald-400" />
                  Escolha os Produtos a Serem Vendidos
                </h3>
                <p className="text-[10px] text-slate-400">
                  Use o leitor de código de barras, pesquise pelo nome, digite o código de 4 dígitos ou use a Venda Rápida.
                </p>
              </div>

              {/* Action Buttons: Scanner, Venda Rápida 4 dígitos, Cadastrar Item */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsScannerOpen(true)}
                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-xl text-[10px] uppercase transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                  title="Ler Código de Barras via Câmera"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Leitor Câmera</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setQuickRegCode("");
                    setIsQuickRegisterModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-[10px] uppercase transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                  title="Venda Rápida por 4 dígitos sem precisar de autorização"
                >
                  <Zap className="w-3.5 h-3.5 text-slate-950" />
                  <span>Venda Rápida 4 Dígitos ⚡</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsTouchRegisterOpen(true)}
                  className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/20"
                  title="Cadastrar novo produto rapidamente com botões touch e teclado numérico na tela"
                >
                  <Plus className="w-4 h-4 text-emerald-200" />
                  <span>+ Cadastrar Item Touch 🛍️</span>
                </button>
              </div>
            </div>

            {/* Catalog search bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                id="catalog-search-input"
                type="text"
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const typed = catalogSearch.trim();
                    if (activeProductsList && activeProductsList.length > 0) {
                      const firstProd = activeProductsList[0];
                      handleAddToCart(firstProd.name, firstProd.price, firstProd.id);
                      setCatalogSearch("");
                      e.preventDefault();
                    } else if (typed) {
                      showNotification(`"${typed}" não encontrado no catálogo. Abrindo Venda Rápida... ⚡`, "info");
                      setQuickRegCode(typed);
                      setIsQuickRegisterModalOpen(true);
                      setCatalogSearch("");
                      e.preventDefault();
                    } else {
                      showNotification("Digite um nome, código de barras ou 4 dígitos!", "warning");
                    }
                  }
                }}
                className="w-full bg-slate-950 border border-white/10 hover:border-white/20 focus:border-emerald-500/50 rounded-xl pl-10 pr-9 py-2.5 text-xs text-white uppercase font-bold outline-none font-sans shadow-inner"
                placeholder="Pesquisar por nome, código de barras ou 4 dígitos... (Enter adiciona, F2 foca)"
                autoFocus
              />
              {catalogSearch && (
                <button
                  type="button"
                  onClick={() => setCatalogSearch("")}
                  className="absolute right-3 top-2.5 text-[10px] bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white px-2 py-0.5 rounded cursor-pointer font-bold transition-all"
                >
                  Limpar
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 border-b border-white/5">
              {["Todos", "Alimentos", "Bebidas", "Limpeza", "Serviços", "Outros"].map((cat) => {
                const isActive = selectedCategory === cat;
                const count = categoryCounters[cat] || 0;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0 cursor-pointer select-none ${
                      isActive
                        ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10"
                        : "bg-slate-950 border border-white/5 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <span>{cat}</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-black leading-none ${
                      isActive ? "bg-slate-950 text-emerald-400" : "bg-white/5 text-slate-500"
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Products Visual Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 max-h-[500px] overflow-y-auto no-scrollbar pr-0.5 pb-2">
              {activeProductsList.length === 0 ? (
                <div className="col-span-full py-14 text-center text-slate-400 text-xs uppercase font-bold border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-2.5">
                  <ShoppingBag className="w-8 h-8 text-slate-500" />
                  <span>Nenhum produto encontrado nesta visualização.</span>
                  <div className="flex items-center gap-2 mt-2">
                    {selectedCategory !== "Todos" && (
                      <button
                        type="button"
                        onClick={() => setSelectedCategory("Todos")}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        Ver Todos
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsQuickRegisterModalOpen(true)}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      Cadastrar via Venda Rápida (4 Dígitos)
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {activeProductsList.slice(0, displayLimit).map((product) => {
                    const hasQuick = Boolean(product.quickCode);
                    const hasBarcode = Boolean(product.barcode);

                    return (
                      <div
                        key={product.id}
                        onClick={() => handleAddToCart(product.name, product.price, product.id, {
                          size: product.size,
                          color: product.color,
                          unit: product.unit,
                          quickCode: product.quickCode,
                          description: product.description,
                          brand: product.brand
                        })}
                        className="bg-slate-950/70 hover:bg-slate-950 border border-white/10 hover:border-emerald-500/40 p-3 rounded-2xl flex flex-col justify-between text-left transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer shadow-sm group min-h-[140px]"
                      >
                        <div>
                          {/* Badges top */}
                          <div className="flex items-center justify-between gap-1 mb-2">
                            {hasQuick ? (
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 text-amber-400 font-mono text-[9px] font-black">
                                #{product.quickCode}
                              </span>
                            ) : (
                              <span className="text-[8px] font-bold uppercase text-slate-500 truncate max-w-[80px]">
                                {product.category || "Item"}
                              </span>
                            )}

                            {hasBarcode && (
                              <span className="flex items-center gap-0.5 text-[8.5px] font-mono text-slate-400">
                                <Barcode className="w-3 h-3 text-slate-500" />
                                <span className="truncate max-w-[65px]">{product.barcode.slice(-4)}</span>
                              </span>
                            )}
                          </div>

                          {/* Product Image / Emoji */}
                          <div className="flex items-center gap-2 mb-2">
                            {product.imageUrl && product.imageUrl.startsWith("data:") ? (
                              <img 
                                src={product.imageUrl} 
                                alt={product.name} 
                                className="w-9 h-9 rounded-xl object-cover shrink-0 border border-white/10" 
                              />
                            ) : (
                              <span className="w-9 h-9 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center text-lg shrink-0">
                                {product.imageUrl || "🛍️"}
                              </span>
                            )}

                            <h4 className="text-xs font-black text-white uppercase group-hover:text-emerald-400 transition-colors line-clamp-2 leading-tight">
                              {product.name}
                            </h4>
                          </div>
                        </div>

                        {/* Price & Add */}
                        <div className="flex items-center justify-between pt-2 border-t border-white/5">
                          <span className="font-mono font-black text-emerald-400 text-xs">
                            {formatCurrency(product.price)}
                          </span>
                          <span className="text-[9px] font-black uppercase text-slate-400 group-hover:text-emerald-400 flex items-center gap-0.5">
                            <Plus className="w-3 h-3" /> Adicionar
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {activeProductsList.length > displayLimit && (
                    <div className="col-span-full py-2 text-center">
                      <button
                        type="button"
                        onClick={() => setDisplayLimit((prev) => prev + 60)}
                        className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 border border-white/10 text-emerald-400 hover:text-emerald-300 font-black text-[10px] uppercase rounded-xl transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5 mx-auto"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Carregar mais {Math.min(60, activeProductsList.length - displayLimit)} produtos... ({displayLimit} de {activeProductsList.length} exibidos)
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Bottom Transition Action Bar */}
            <div className="p-3.5 bg-slate-950 border border-white/10 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <ShoppingCart className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Produtos Selecionados</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-black text-white">{totalCartItemsCount} item(ns)</span>
                    <span className="text-xs font-mono font-bold text-emerald-400">• Total: {formatCurrency(cartTotal)}</span>
                  </div>
                </div>
              </div>

              {cart.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setSaleTransactionStep(2)}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <span>Avançar para Passo 2: Escolher Quantidades</span>
                  <ArrowRight className="w-4 h-4 text-slate-950" />
                </button>
              ) : (
                <span className="text-[10px] text-slate-400 italic">
                  💡 Clique nos produtos acima ou use o leitor de código para avançar.
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          PASSO 2: ESCOLHER QUANTIDADES E NOME DOS PRODUTOS
         ======================================================== */}
      {saleTransactionStep === 2 && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-white/5 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
              <div>
                <span className="text-[9px] font-black uppercase text-emerald-400 tracking-wider">Passo 2 de 4</span>
                <h3 className="text-sm font-black uppercase text-white mt-0.5 flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-emerald-400" />
                  Escolher Quantidades e Conferir Produtos
                </h3>
                <p className="text-[10px] text-slate-400">
                  Ajuste as quantidades vendidas, confirme os nomes/especificações e retire itens antes do pagamento.
                </p>
              </div>

              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearCart}
                  className="text-[9px] font-black uppercase text-rose-400 hover:text-rose-300 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-center"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Limpar Todo o Carrinho
                </button>
              )}
            </div>

            {/* List of Cart Items with large quantity adjusters */}
            {cart.length === 0 ? (
              <div className="py-16 text-center text-slate-400 uppercase text-xs font-bold border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-3">
                <ShoppingCart className="w-10 h-10 text-slate-600" />
                <span>Nenhum produto foi adicionado ainda.</span>
                <button
                  type="button"
                  onClick={() => setSaleTransactionStep(1)}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs uppercase transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar ao Passo 1 e Escolher Produtos
                </button>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[480px] overflow-y-auto no-scrollbar pr-0.5">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 bg-slate-950 border border-white/10 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-sm hover:border-white/20 transition-all"
                  >
                    {/* Item info & Name */}
                    <div 
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => handleOpenEditCartItem(item)}
                      title="Clique para editar detalhes ou preço"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-white uppercase truncate hover:text-amber-400 transition-colors">
                          {item.name}
                        </span>
                        {item.quickCode && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-500/20 border border-amber-500/30 text-amber-400 font-mono text-[9px] font-black">
                            #{item.quickCode}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                        <span className="font-mono font-bold text-slate-300">
                          Preço Unitário: {formatCurrency(item.price)} /{item.unit || "un"}
                        </span>
                        {item.size && <span className="text-slate-500">• Tam: {item.size}</span>}
                        {item.color && <span className="text-slate-500">• Cor: {item.color}</span>}
                        <span className="text-[9px] text-amber-400 underline decoration-dotted">
                          ✏️ Ajustar Detalhes
                        </span>
                      </div>
                    </div>

                    {/* Quantity controls & Subtotal */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                      {/* Big - / + adjusters */}
                      <div className="flex items-center bg-slate-900 border border-white/15 rounded-xl overflow-hidden shadow-inner">
                        <button
                          type="button"
                          onClick={() => handleUpdateCartQty(item.id, -1)}
                          className="px-2.5 py-2 text-slate-300 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
                          title="Diminuir quantidade"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>

                        <span 
                          onClick={() => handleOpenEditCartItem(item)}
                          className="px-3 font-mono font-black text-sm text-white hover:text-amber-400 cursor-pointer select-none"
                          title="Clique para digitar quantidade direta"
                        >
                          {item.quantity} {item.unit || "un"}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleUpdateCartQty(item.id, 1)}
                          className="px-2.5 py-2 text-slate-300 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
                          title="Aumentar quantidade"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Item subtotal */}
                      <div className="w-24 text-right">
                        <span className="font-mono font-black text-base text-emerald-400 block">
                          {formatCurrency(item.price * item.quantity)}
                        </span>
                      </div>

                      {/* Remove item button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveFromCart(item.id, item.name)}
                        className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl transition-all cursor-pointer"
                        title="Remover produto da venda"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Total card & Navigation */}
            {cart.length > 0 && (
              <div className="p-4 bg-slate-950 border border-white/10 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Subtotal da Comanda</span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="font-mono font-black text-2xl text-emerald-400">{formatCurrency(cartTotal)}</span>
                    <span className="text-xs text-slate-400">({totalCartItemsCount} unidades no total)</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSaleTransactionStep(1)}
                    className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs uppercase rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Voltar ao Passo 1</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSaleTransactionStep(3)}
                    className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <span>Avançar para Passo 3: Pagamento</span>
                    <ArrowRight className="w-4 h-4 text-slate-950" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          PASSO 3: NOME DO CLIENTE E MODO DE PAGAMENTOS
         ======================================================== */}
      {saleTransactionStep === 3 && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-white/5 rounded-2xl p-5 space-y-4">
            <div className="border-b border-white/5 pb-3">
              <span className="text-[9px] font-black uppercase text-emerald-400 tracking-wider">Passo 3 de 4</span>
              <h3 className="text-sm font-black uppercase text-white mt-0.5 flex items-center gap-2">
                <Coins className="w-4 h-4 text-emerald-400" />
                Identificação do Cliente e Modo de Pagamento
              </h3>
              <p className="text-[10px] text-slate-400">
                O nome do cliente é opcional (deixe em branco para consumidor final). Escolha a forma de pagamento desejada.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Column: Client Identification & Discount */}
              <div className="lg:col-span-5 space-y-3.5">
                <div className="bg-slate-950 border border-white/10 rounded-2xl p-4 space-y-3 shadow-inner">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-emerald-400" />
                    <span className="text-[11px] font-black uppercase text-white">Dados do Cliente (Opcional)</span>
                  </div>

                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Nome do Cliente</label>
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Deixe em branco para Consumidor Final"
                      className="w-full mt-1 bg-slate-900 border border-white/10 focus:border-emerald-400 px-3 py-2 rounded-xl text-xs font-bold text-white uppercase outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">CPF / CNPJ na Nota (Opcional)</label>
                    <input
                      type="text"
                      value={cpfNota}
                      onChange={(e) => setCpfNota(e.target.value)}
                      placeholder="000.000.000-00"
                      className="w-full mt-1 bg-slate-900 border border-white/10 focus:border-emerald-400 px-3 py-2 rounded-xl text-xs font-mono font-bold text-white outline-none"
                    />
                  </div>

                  {/* Discount */}
                  <div className="pt-2 border-t border-white/5 space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider flex items-center justify-between">
                      <span>Desconto na Venda</span>
                      {finalDiscount > 0 && (
                        <span className="text-rose-400 font-mono font-black">-{formatCurrency(finalDiscount)}</span>
                      )}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative">
                        <input
                          type="text"
                          value={discountValue}
                          onChange={(e) => {
                            setDiscountValue(e.target.value);
                            setDiscountPercent(0);
                          }}
                          placeholder="Valor R$"
                          className="w-full bg-slate-900 border border-white/10 focus:border-emerald-400 px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold text-white outline-none"
                        />
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          value={discountPercent || ""}
                          onChange={(e) => {
                            setDiscountPercent(parseFloat(e.target.value) || 0);
                            setDiscountValue("");
                          }}
                          placeholder="Percentual %"
                          className="w-full bg-slate-900 border border-white/10 focus:border-emerald-400 px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold text-white outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Values Summary Card */}
                <div className="bg-slate-950 border border-white/10 rounded-2xl p-4 space-y-2">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Subtotal:</span>
                    <span className="font-mono">{formatCurrency(cartSubtotal)}</span>
                  </div>
                  {finalDiscount > 0 && (
                    <div className="flex justify-between text-xs text-rose-400 font-bold">
                      <span>Desconto Aplicado:</span>
                      <span className="font-mono">-{formatCurrency(finalDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-baseline pt-2 border-t border-white/10">
                    <span className="text-xs font-black uppercase text-white">TOTAL A PAGAR:</span>
                    <span className="font-mono font-black text-2xl text-emerald-400">{formatCurrency(cartTotal)}</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Payment Methods Selection */}
              <div className="lg:col-span-7 space-y-4">
                <div className="bg-slate-950 border border-white/10 rounded-2xl p-4 space-y-3.5 shadow-inner">
                  {/* Payment Header and 2 Formas de Pagamento Toggle */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                    <span className="text-[11px] font-black uppercase text-white block">
                      {splitPaymentEnabled ? "⚡ 2 Formas de Pagamento (Misto)" : "Selecione a Forma de Pagamento"}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (setSplitPaymentEnabled) {
                          const nextState = !splitPaymentEnabled;
                          setSplitPaymentEnabled(nextState);
                          if (nextState) {
                            if (setSplitCashAmount && (!splitCashAmount || splitCashAmount === "0")) {
                              setSplitCashAmount((cartTotal / 2).toFixed(2).replace(".", ","));
                            }
                            if (setSplitSecondaryAmount && (!splitSecondaryAmount || splitSecondaryAmount === "0")) {
                              setSplitSecondaryAmount((cartTotal / 2).toFixed(2).replace(".", ","));
                            }
                            showNotification("Modo 2 Formas de Pagamento ativado! Ex: Dinheiro + Pix ou Cartão 💳💵", "info");
                          } else {
                            showNotification("Retornado para 1 Forma de Pagamento.", "info");
                          }
                        }
                      }}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                        splitPaymentEnabled
                          ? "bg-purple-500 text-slate-950 shadow-md shadow-purple-500/20"
                          : "bg-slate-900 border border-purple-500/30 text-purple-300 hover:text-white hover:bg-purple-950/40"
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>{splitPaymentEnabled ? "Usando 2 Formas (Dividido) ⚡" : "Dividir em 2 Formas (Dinheiro + Pix/Cartão) ⚡"}</span>
                    </button>
                  </div>

                  {/* MODE A: 1 FORMA DE PAGAMENTO */}
                  {!splitPaymentEnabled ? (
                    <>
                      {/* Payment Buttons Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {[
                          { id: "dinheiro", label: "Dinheiro 💵" },
                          { id: "pix", label: "Pix 🏧" },
                          { id: "cartao_debito", label: "Débito 💳" },
                          { id: "cartao_credito", label: "Crédito 💳" },
                          { id: "fiado", label: "Fiado / Caderneta 📕" }
                        ].map((method) => {
                          const isSelected = cartPaymentMethod === method.id;
                          return (
                            <button
                              key={method.id}
                              type="button"
                              onClick={() => setCartPaymentMethod(method.id as any)}
                              className={`p-3 rounded-xl text-xs font-black uppercase transition-all cursor-pointer text-center select-none ${
                                isSelected
                                  ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 scale-[1.02]"
                                  : "bg-slate-900 border border-white/10 text-slate-300 hover:text-white hover:border-white/20"
                              }`}
                            >
                              {method.label}
                            </button>
                          );
                        })}
                      </div>

                      {/* Dinheiro Controls (Valor Recebido & Bloqueio Obrigatório com Troco e Abrir Gaveta) */}
                      {cartPaymentMethod === "dinheiro" && (() => {
                        const paidNum = parsePortugueseNumber(amountPaidByClient || "0");
                        const isCashComplete = amountPaidByClient.trim() !== "" && !isNaN(paidNum) && paidNum >= cartTotal;
                        const changeCashVal = isCashComplete ? Math.max(0, paidNum - cartTotal) : 0;

                        return (
                          <div className={`p-4 rounded-2xl space-y-3.5 transition-all border animate-in fade-in duration-150 ${
                            isCashComplete 
                              ? "bg-emerald-950/20 border-emerald-500/40" 
                              : "bg-amber-950/20 border-amber-500/30"
                          }`}>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-2">
                              <div className="flex items-center gap-2">
                                <Coins className={`w-4 h-4 ${isCashComplete ? "text-emerald-400" : "text-amber-400"}`} />
                                <h4 className="text-xs font-black uppercase text-white tracking-wider">
                                  Conferência de Dinheiro & Troco Obrigatória
                                </h4>
                              </div>
                              <span className={`text-[9.5px] font-black uppercase px-2 py-0.5 rounded-full border ${
                                isCashComplete 
                                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" 
                                  : "bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse"
                              }`}>
                                {isCashComplete ? "Troco Calculado ✔️" : "Bloqueado até informar valor ⚠️"}
                              </span>
                            </div>

                            <div>
                              <div className="flex justify-between items-baseline mb-1">
                                <label className="text-[10px] font-black uppercase text-slate-300 tracking-wider">
                                  Quanto o cliente entregou em dinheiro? (R$)
                                </label>
                                <span className="text-[10px] text-slate-400">
                                  Total da venda: <strong className="text-white font-mono">{formatCurrency(cartTotal)}</strong>
                                </span>
                              </div>
                              <input
                                type="text"
                                value={amountPaidByClient}
                                onChange={(e) => setAmountPaidByClient(e.target.value)}
                                placeholder="0,00"
                                className="w-full bg-slate-950 border border-white/15 focus:border-emerald-400 px-4 py-3 rounded-xl text-2xl font-mono font-black text-emerald-400 outline-none shadow-inner"
                              />
                            </div>

                            {/* Quick Cash Buttons */}
                            <div className="space-y-1.5">
                              <span className="text-[9px] font-bold uppercase text-slate-400 block">Atalhos de Cédulas:</span>
                              <div className="flex flex-wrap items-center gap-1.5">
                                {quickCashOptions.map((opt) => (
                                  <button
                                    key={opt.label}
                                    type="button"
                                    onClick={() => setAmountPaidByClient(opt.value.toFixed(2).replace(".", ","))}
                                    className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 border border-white/10 text-xs font-mono font-bold text-slate-300 hover:text-white rounded-lg transition-all cursor-pointer shadow-sm active:scale-95"
                                  >
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Troco Result & Abrir Gaveta */}
                            {isCashComplete ? (
                              <div className="p-3.5 rounded-xl bg-emerald-500/20 border-2 border-emerald-500 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg shadow-emerald-500/15 animate-in zoom-in-95 duration-150">
                                <div>
                                  <span className="text-[9.5px] font-black uppercase text-emerald-400 tracking-wider block">
                                    💰 Troco a Devolver ao Cliente:
                                  </span>
                                  <span className="font-mono text-2xl sm:text-3xl font-black text-emerald-300 drop-shadow">
                                    {formatCurrency(changeCashVal)}
                                  </span>
                                  <span className="text-[9.5px] text-slate-300 block mt-0.5">
                                    (Entregue: {formatCurrency(paidNum)} • Total: {formatCurrency(cartTotal)})
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (onTriggerCashDrawer) {
                                      onTriggerCashDrawer(changeCashVal, paidNum);
                                    }
                                    showNotification("Gaveta de dinheiro aberta para conferir o troco! 🗄️", "success");
                                  }}
                                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer shrink-0 active:scale-95"
                                  title="Abrir gaveta do caixa para guardar as notas e retirar o troco"
                                >
                                  <span>Abrir Gaveta 🗄️</span>
                                </button>
                              </div>
                            ) : (
                              <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl text-[10px] text-amber-300 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                                <span>
                                  {amountPaidByClient.trim() && paidNum < cartTotal
                                    ? `Valor abaixo do total! Faltam ${formatCurrency(cartTotal - paidNum)}.`
                                    : "Digite o valor entregue pelo cliente acima ou clique nos atalhos de cédulas para calcular o troco e liberar a conclusão."}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Pix Controls (Mercado Pago com Webhook Automático ou Chave Direta) */}
                      {cartPaymentMethod === "pix" && (
                        <div className="p-4 bg-gradient-to-br from-sky-950/40 via-slate-900 to-emerald-950/30 border border-sky-500/30 rounded-2xl space-y-3.5 animate-in fade-in duration-150">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center">
                                <QrCode className="w-4 h-4 text-sky-400" />
                              </div>
                              <div>
                                <h4 className="text-xs font-black uppercase text-white tracking-wider">
                                  Pagamento Pix pelo Celular (Mercado Pago)
                                </h4>
                                <span className="text-[9px] text-slate-400">
                                  Aprovação em tempo real via Webhook Oficial
                                </span>
                              </div>
                            </div>
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full border bg-sky-500/20 text-sky-300 border-sky-500/30 flex items-center gap-1 self-start sm:self-auto">
                              <Zap className="w-3 h-3 text-sky-400 animate-pulse" />
                              Webhook Ativo ⚡
                            </span>
                          </div>

                          <div className="p-3 bg-slate-950/70 border border-white/5 rounded-xl space-y-2 text-left">
                            <p className="text-[10.5px] text-slate-300 leading-relaxed font-sans">
                              📱 <strong>Como funciona o pagamento pelo celular:</strong>
                            </p>
                            <ul className="text-[10px] text-slate-400 space-y-1 font-sans pl-1">
                              <li>• O cliente abre o app do banco no celular (Nubank, Itaú, Bradesco, Mercado Pago, etc.).</li>
                              <li>• Aponta a câmera para o <strong>QR Code Pix</strong> na tela do seu PDV.</li>
                              <li>• Ao pagar, o <strong>Webhook do Mercado Pago</strong> envia a notificação imediata.</li>
                              <li>• O caixa toca o som de confirmação e conclui a venda <strong>automaticamente</strong>!</li>
                            </ul>
                          </div>

                          <div className="flex flex-col sm:flex-row gap-2 pt-1">
                            {onStartMpPixCheckout ? (
                              <button
                                type="button"
                                onClick={() => onStartMpPixCheckout()}
                                className="flex-1 py-3 bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-400 hover:to-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                              >
                                <QrCode className="w-4 h-4 text-slate-950" />
                                <span>Gerar QR Code Pix para Celular do Cliente 📱⚡</span>
                              </button>
                            ) : null}

                            <button
                              type="button"
                              onClick={() => handleCheckout()}
                              className="px-4 py-3 bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                              title="Confirmar Pix recebido manualmente na chave da sua conta bancária"
                            >
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              <span>Confirmar Manualmente</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Cartão de Crédito Controls (Parcelamento) */}
                      {cartPaymentMethod === "cartao_credito" && (
                        <div className="p-3.5 bg-slate-900/80 border border-white/10 rounded-2xl space-y-2 animate-in fade-in duration-150">
                          <label className="text-[9.5px] font-black uppercase text-slate-300 tracking-wider">Número de Parcelas</label>
                          <select
                            value={creditInstallments}
                            onChange={(e) => setCreditInstallments(parseInt(e.target.value, 10))}
                            className="w-full bg-slate-950 border border-white/15 px-3 py-2 rounded-xl text-xs font-bold text-white outline-none cursor-pointer"
                          >
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                              <option key={num} value={num}>
                                {num}x de {formatCurrency(cartTotal / num)} {num === 1 ? "(À Vista)" : "(Sem Juros)"}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Fiado Controls */}
                      {cartPaymentMethod === "fiado" && (
                        <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-[10.5px] text-amber-300 space-y-1">
                          <p className="font-bold">📕 Venda no Fiado / Caderneta:</p>
                          <p>Certifique-se de que o nome do cliente está informado ao lado para lançamento correto do saldo devedor na conta dele.</p>
                        </div>
                      )}
                    </>
                  ) : (
                    /* MODE B: 2 FORMAS DE PAGAMENTO (DIVIDIDO: DINHEIRO + PIX OU CARTÃO) */
                    (() => {
                      const splitCashNum = parsePortugueseNumber(splitCashAmount || "0") || 0;
                      const splitSecNum = parsePortugueseNumber(splitSecondaryAmount || "0") || 0;
                      const splitSum = splitCashNum + splitSecNum;
                      const splitDiff = splitSum - cartTotal;
                      const isSplitValid = Math.abs(splitDiff) <= 0.05 && splitCashNum >= 0 && splitSecNum >= 0 && (splitCashNum + splitSecNum) > 0;

                      // Cash change calculation for the cash portion
                      const cashGivenNum = parsePortugueseNumber(amountPaidByClient || "0") || 0;
                      const hasCashChange = cashGivenNum > splitCashNum;
                      const splitCashChange = hasCashChange ? (cashGivenNum - splitCashNum) : 0;

                      return (
                        <div className="space-y-4 animate-in fade-in duration-150">
                          {/* Split Explanatory Banner */}
                          <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl text-[10.5px] text-purple-300 flex items-center justify-between gap-2">
                            <span>
                              Divida a compra entre <strong>Dinheiro 💵</strong> e <strong>{splitSecondaryMethod === "pix" ? "Pix 🏧" : splitSecondaryMethod === "cartao_debito" ? "Cartão Débito 💳" : "Cartão Crédito 💳"}</strong>. A soma deve totalizar {formatCurrency(cartTotal)}.
                            </span>
                            <span className="font-mono font-bold text-white shrink-0">
                              Total: {formatCurrency(cartTotal)}
                            </span>
                          </div>

                          {/* Forma 1: Dinheiro */}
                          <div className="p-3.5 bg-slate-900/90 border border-emerald-500/30 rounded-2xl space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black uppercase text-emerald-400 flex items-center gap-1.5">
                                <Coins className="w-4 h-4" />
                                1ª Forma: Dinheiro 💵
                              </span>
                              <span className="text-[10px] text-slate-400">Valor em dinheiro</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <label className="text-[9px] font-bold uppercase text-slate-300 block mb-1">
                                  Valor a Pagar em Dinheiro R$
                                </label>
                                <input
                                  type="text"
                                  value={splitCashAmount}
                                  onChange={(e) => {
                                    if (setSplitCashAmount) {
                                      setSplitCashAmount(e.target.value);
                                      const num = parsePortugueseNumber(e.target.value) || 0;
                                      if (setSplitSecondaryAmount && num <= cartTotal) {
                                        setSplitSecondaryAmount((cartTotal - num).toFixed(2).replace(".", ","));
                                      }
                                    }
                                  }}
                                  placeholder="0,00"
                                  className="w-full bg-slate-950 border border-white/15 focus:border-emerald-400 px-3 py-2 rounded-xl text-lg font-mono font-black text-emerald-400 outline-none"
                                />
                              </div>

                              <div>
                                <label className="text-[9px] font-bold uppercase text-slate-300 block mb-1">
                                  Cédula Entregue (para Troco) R$
                                </label>
                                <input
                                  type="text"
                                  value={amountPaidByClient}
                                  onChange={(e) => setAmountPaidByClient(e.target.value)}
                                  placeholder="Se der nota maior"
                                  className="w-full bg-slate-950 border border-white/15 focus:border-emerald-400 px-3 py-2 rounded-xl text-lg font-mono font-bold text-white outline-none"
                                />
                              </div>
                            </div>

                            {/* Dinheiro portion Troco box & open drawer */}
                            {hasCashChange && (
                              <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/40 rounded-xl flex items-center justify-between">
                                <div className="text-[10px]">
                                  <span className="text-emerald-400 font-bold block">Troco da parte em dinheiro:</span>
                                  <span className="font-mono text-base font-black text-emerald-300">
                                    {formatCurrency(splitCashChange)}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (onTriggerCashDrawer) onTriggerCashDrawer(splitCashChange, cashGivenNum);
                                    showNotification("Gaveta de dinheiro aberta! 🗄️", "success");
                                  }}
                                  className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[10px] uppercase rounded-lg transition-all cursor-pointer"
                                >
                                  Abrir Gaveta 🗄️
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Forma 2: Pix ou Cartão */}
                          <div className="p-3.5 bg-slate-900/90 border border-cyan-500/30 rounded-2xl space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black uppercase text-cyan-400 flex items-center gap-1.5">
                                <CreditCard className="w-4 h-4" />
                                2ª Forma: Cartão ou Pix
                              </span>
                              {/* Submethod selector */}
                              <div className="flex items-center gap-1">
                                {[
                                  { id: "pix", label: "Pix 🏧" },
                                  { id: "cartao_debito", label: "Débito 💳" },
                                  { id: "cartao_credito", label: "Crédito 💳" }
                                ].map((subM) => (
                                  <button
                                    key={subM.id}
                                    type="button"
                                    onClick={() => setSplitSecondaryMethod && setSplitSecondaryMethod(subM.id as any)}
                                    className={`px-2 py-1 rounded-lg text-[9.5px] font-black uppercase transition-all cursor-pointer ${
                                      splitSecondaryMethod === subM.id
                                        ? "bg-cyan-500 text-slate-950"
                                        : "bg-slate-950 text-slate-400 hover:text-white"
                                    }`}
                                  >
                                    {subM.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="flex-1">
                                <label className="text-[9px] font-bold uppercase text-slate-300 block mb-1">
                                  Valor a Cobrar no {splitSecondaryMethod === "pix" ? "Pix" : splitSecondaryMethod === "cartao_debito" ? "Débito" : "Crédito"} R$
                                </label>
                                <input
                                  type="text"
                                  value={splitSecondaryAmount}
                                  onChange={(e) => {
                                    if (setSplitSecondaryAmount) {
                                      setSplitSecondaryAmount(e.target.value);
                                    }
                                  }}
                                  placeholder="0,00"
                                  className="w-full bg-slate-950 border border-white/15 focus:border-cyan-400 px-3 py-2 rounded-xl text-lg font-mono font-black text-cyan-400 outline-none"
                                />
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  const cashVal = parsePortugueseNumber(splitCashAmount || "0") || 0;
                                  const remainder = Math.max(0, cartTotal - cashVal);
                                  if (setSplitSecondaryAmount) {
                                    setSplitSecondaryAmount(remainder.toFixed(2).replace(".", ","));
                                  }
                                }}
                                className="mt-5 px-3 py-2 bg-slate-950 hover:bg-slate-800 border border-white/15 text-slate-300 hover:text-white rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer whitespace-nowrap"
                                title="Preencher o restante automaticamente"
                              >
                                Preencher Restante
                              </button>
                            </div>

                            {splitSecondaryMethod === "pix" && onStartMpPixCheckout && (
                              <button
                                type="button"
                                onClick={() => {
                                  const secVal = parsePortugueseNumber(splitSecondaryAmount || "0") || 0;
                                  onStartMpPixCheckout(secVal > 0 ? secVal : undefined);
                                }}
                                className="w-full py-2 bg-gradient-to-r from-sky-500/20 to-emerald-500/20 hover:from-sky-500/30 hover:to-emerald-500/30 border border-sky-500/30 text-sky-300 font-bold text-[10.5px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <QrCode className="w-3.5 h-3.5 text-sky-400" />
                                <span>Gerar QR Code Pix de {formatCurrency(parsePortugueseNumber(splitSecondaryAmount || "0") || 0)} no Celular 📱⚡</span>
                              </button>
                            )}
                          </div>

                          {/* Split Balance Summary */}
                          <div className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
                            isSplitValid 
                              ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300" 
                              : "bg-rose-500/15 border-rose-500/40 text-rose-300"
                          }`}>
                            <div>
                              <span className="font-bold block">
                                Soma Informada: <strong className="font-mono">{formatCurrency(splitSum)}</strong> de <strong className="font-mono">{formatCurrency(cartTotal)}</strong>
                              </span>
                              <span className="text-[10px] opacity-80">
                                {isSplitValid 
                                  ? "✅ Perfeito! As duas formas somam exatamente o total da venda." 
                                  : splitDiff < 0 
                                  ? `⚠️ Faltam ${formatCurrency(Math.abs(splitDiff))} para fechar a conta.` 
                                  : `⚠️ Passou ${formatCurrency(splitDiff)} do total da venda.`}
                              </span>
                            </div>

                            {splitCashNum > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (onTriggerCashDrawer) onTriggerCashDrawer(splitCashChange, cashGivenNum);
                                  showNotification("Gaveta de dinheiro aberta! 🗄️", "success");
                                }}
                                className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 border border-white/10 text-white rounded-lg font-bold text-[10px] uppercase transition-all cursor-pointer self-start sm:self-center"
                              >
                                Abrir Gaveta 🗄️
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })()
                  )}
                </div>

                {/* Final Navigation Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSaleTransactionStep(2)}
                    className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs uppercase rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Voltar ao Passo 2</span>
                  </button>

                  {/* Dynamic Conclusion Button (Blocked until conditions are met) */}
                  {(() => {
                    if (splitPaymentEnabled) {
                      const splitCashNum = parsePortugueseNumber(splitCashAmount || "0") || 0;
                      const splitSecNum = parsePortugueseNumber(splitSecondaryAmount || "0") || 0;
                      const splitSum = splitCashNum + splitSecNum;
                      const isSplitValid = Math.abs(splitSum - cartTotal) <= 0.05 && splitCashNum >= 0 && splitSecNum >= 0 && (splitCashNum + splitSecNum) > 0;

                      if (!isSplitValid) {
                        return (
                          <button
                            type="button"
                            disabled
                            className="px-6 py-3 bg-slate-800 border border-white/10 text-slate-400 font-black text-xs uppercase tracking-wider rounded-xl cursor-not-allowed flex items-center gap-2 opacity-60"
                            title={`Ajuste os valores para somar ${formatCurrency(cartTotal)}`}
                          >
                            <Lock className="w-4 h-4 text-amber-400" />
                            <span>Bloqueado: Ajuste as 2 formas para somar {formatCurrency(cartTotal)}</span>
                          </button>
                        );
                      }

                      return (
                        <button
                          type="button"
                          onClick={() => handleCheckout()}
                          className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm uppercase tracking-wider rounded-xl transition-all shadow-xl shadow-emerald-500/25 flex items-center gap-2 cursor-pointer active:scale-95 animate-pulse"
                        >
                          <CheckCircle2 className="w-5 h-5 text-slate-950" />
                          <span>Concluir Venda Dividida & Emitir Cupom Fiscal (Passo 4) ➔</span>
                        </button>
                      );
                    }

                    if (cartPaymentMethod === "dinheiro") {
                      const paidNum = parsePortugueseNumber(amountPaidByClient || "0");
                      const isCashComplete = amountPaidByClient.trim() !== "" && !isNaN(paidNum) && paidNum >= cartTotal;
                      const changeCashVal = isCashComplete ? Math.max(0, paidNum - cartTotal) : 0;

                      if (!isCashComplete) {
                        return (
                          <button
                            type="button"
                            disabled
                            className="px-6 py-3 bg-slate-800 border border-white/10 text-slate-400 font-black text-xs uppercase tracking-wider rounded-xl cursor-not-allowed flex items-center gap-2 opacity-60"
                            title="Informe quanto o cliente entregou em dinheiro para calcular o troco"
                          >
                            <Lock className="w-4 h-4 text-amber-400" />
                            <span>Bloqueado: Digite o valor recebido em dinheiro para liberar o troco</span>
                          </button>
                        );
                      }

                      return (
                        <button
                          type="button"
                          onClick={() => handleCheckout()}
                          className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm uppercase tracking-wider rounded-xl transition-all shadow-xl shadow-emerald-500/25 flex items-center gap-2 cursor-pointer active:scale-95 animate-pulse"
                        >
                          <CheckCircle2 className="w-5 h-5 text-slate-950" />
                          <span>Confirmar Troco ({formatCurrency(changeCashVal)}) & Concluir Venda (Passo 4) ➔</span>
                        </button>
                      );
                    }

                    return (
                      <button
                        type="button"
                        onClick={() => handleCheckout()}
                        className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm uppercase tracking-wider rounded-xl transition-all shadow-xl shadow-emerald-500/25 flex items-center gap-2 cursor-pointer active:scale-95"
                      >
                        <CheckCircle2 className="w-5 h-5 text-slate-950" />
                        <span>Concluir Venda & Emitir Cupom Fiscal (Passo 4) ➔</span>
                      </button>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          PASSO 4: FINALIZAR VENDAS E CUPOM FISCAL (CONFIGURAÇÕES E IMPRESSÃO)
         ======================================================== */}
      {saleTransactionStep === 4 && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-white/5 rounded-2xl p-5 space-y-4">
            {/* Success Celebration Banner & Action Buttons */}
            <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0 shadow-lg">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-black uppercase text-emerald-400">Venda Concluída com Sucesso! 🎉</h4>
                  <p className="text-[10px] text-slate-300">
                    Lançamento registrado no caixa e estoque atualizado. Se precisar corrigir erros ou cancelar, utilize os botões rápidos.
                  </p>
                </div>
              </div>

              {/* Action buttons: Next Sale, Correct, Cancel, Return */}
              <div className="flex flex-wrap items-center gap-2">
                {onCorrectSale && activeReceipt && (
                  <button
                    type="button"
                    onClick={() => onCorrectSale(activeReceipt)}
                    className="px-3.5 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                    title="Reabrir itens no carrinho para corrigir quantidade, preço ou forma de pagamento"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                    <span>Voltar & Corrigir Erros ✏️</span>
                  </button>
                )}

                {onCancelSale && activeReceipt && (
                  <button
                    type="button"
                    onClick={() => onCancelSale(activeReceipt)}
                    className="px-3.5 py-2.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                    title="Cancelar e estornar esta venda do caixa"
                  >
                    <X className="w-3.5 h-3.5 text-rose-400" />
                    <span>Cancelar Venda ❌</span>
                  </button>
                )}

                {onReturnItems && activeReceipt && (
                  <button
                    type="button"
                    onClick={() => onReturnItems(activeReceipt)}
                    className="px-3.5 py-2.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                    title="Devolver itens específicos ou efetuar troca"
                  >
                    <Repeat className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Devolução / Troca 🔄</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setReceiptToShow(null);
                    handleClearCart();
                    setSaleTransactionStep(1);
                    showNotification("Pronto para o próximo cliente! 🛍️", "info");
                  }}
                  className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5 cursor-pointer shrink-0 active:scale-95"
                >
                  <Plus className="w-4 h-4 text-slate-950" />
                  <span>Nova Venda 🚀</span>
                </button>
              </div>
            </div>

            {/* Split layout: Cupom Settings on Left, Realistic Fiscal Receipt on Right */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Column: Fiscal Cupom Configurations & Print actions */}
              <div className="lg:col-span-6 space-y-4">
                <div className="bg-slate-950 border border-white/10 rounded-2xl p-5 space-y-4 shadow-inner">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2">
                      <Printer className="w-4 h-4 text-emerald-400" />
                      <h4 className="text-xs font-black uppercase text-white">Configurações para Imprimir o Cupom Fiscal</h4>
                    </div>
                    {onOpenPrinterConfig && (
                      <button
                        type="button"
                        onClick={onOpenPrinterConfig}
                        className="px-2.5 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-bold text-[10px] uppercase rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-sm active:scale-95"
                        title="Abrir painel completo de configuração da bobina (58mm/80mm, corte, margens, avanço)"
                      >
                        <Sliders className="w-3 h-3 text-emerald-400" />
                        <span>Configurar Bobina ⚙️</span>
                      </button>
                    )}
                  </div>

                  {/* Printer Type Selection */}
                  <div>
                    <label className="text-[9.5px] font-black uppercase text-slate-300 tracking-wider block mb-1.5">
                      Tipo de Impressora Fiscal / Bobina
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "58mm", label: "58mm (Mini Térmica)" },
                        { id: "80mm", label: "80mm (Bobina Padrão)" },
                        { id: "A4", label: "A4 (Folha Padrão)" }
                      ].map((p) => {
                        const isSelected = printerType === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setPrinterType(p.id as any)}
                            className={`p-2.5 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer text-center ${
                              isSelected
                                ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                                : "bg-slate-900 border border-white/10 text-slate-400 hover:text-white"
                            }`}
                          >
                            {p.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Store Name config */}
                  <div>
                    <label className="text-[9.5px] font-black uppercase text-slate-300 tracking-wider">Nome do Estabelecimento no Cupom</label>
                    <input
                      type="text"
                      value={storeCustomName}
                      onChange={(e) => {
                        setStoreCustomName(e.target.value);
                        localStorage.setItem("pdv_store_custom_name", e.target.value);
                      }}
                      placeholder="Ex: Supermercado Central"
                      className="w-full mt-1 bg-slate-900 border border-white/10 focus:border-emerald-400 px-3 py-2 rounded-xl text-xs font-bold text-white uppercase outline-none"
                    />
                  </div>

                  {/* CNPJ / CPF config */}
                  <div>
                    <label className="text-[9.5px] font-black uppercase text-slate-300 tracking-wider">CNPJ / CPF do Estabelecimento</label>
                    <input
                      type="text"
                      value={storeCustomCnpjCpf}
                      onChange={(e) => {
                        setStoreCustomCnpjCpf(e.target.value);
                        localStorage.setItem("pdv_store_cnpj_cpf", e.target.value);
                      }}
                      placeholder="00.000.000/0001-00"
                      className="w-full mt-1 bg-slate-900 border border-white/10 focus:border-emerald-400 px-3 py-2 rounded-xl text-xs font-mono font-bold text-white outline-none"
                    />
                  </div>

                  {/* Footer message config */}
                  <div>
                    <label className="text-[9.5px] font-black uppercase text-slate-300 tracking-wider">Mensagem de Rodapé do Cupom</label>
                    <input
                      type="text"
                      value={receiptFooterMsg}
                      onChange={(e) => {
                        setReceiptFooterMsg(e.target.value);
                        localStorage.setItem("pdv_receipt_footer_msg", e.target.value);
                      }}
                      placeholder="Obrigado pela preferência! Volte sempre!"
                      className="w-full mt-1 bg-slate-900 border border-white/10 focus:border-emerald-400 px-3 py-2 rounded-xl text-xs font-bold text-white outline-none"
                    />
                  </div>

                  {/* Primary Print Buttons */}
                  <div className="pt-2 border-t border-white/10 space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (activeReceipt) {
                          handlePrintReceiptWindow(activeReceipt);
                        } else {
                          showNotification("Nenhum cupom ativo para imprimir.", "warning");
                        }
                      }}
                      className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                    >
                      <Printer className="w-4 h-4 text-slate-950" />
                      <span>Imprimir Cupom Fiscal Agora 🖨️</span>
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (!activeReceipt) return;
                          const txt = encodeURIComponent(generateReceiptText(activeReceipt));
                          window.open(`https://api.whatsapp.com/send?text=${txt}`, "_blank");
                        }}
                        className="py-2.5 bg-slate-900 hover:bg-slate-800 border border-white/10 text-emerald-400 font-bold text-[11px] uppercase rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>WhatsApp 📲</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (!activeReceipt) return;
                          navigator.clipboard.writeText(generateReceiptText(activeReceipt));
                          showNotification("Texto do cupom copiado para a área de transferência! 📋", "success");
                        }}
                        className="py-2.5 bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white font-bold text-[11px] uppercase rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Cupom 📋</span>
                      </button>
                    </div>

                    {/* Ações Especiais: Corrigir / Cancelar / Devolver */}
                    <div className="pt-2 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                      {onCorrectSale && activeReceipt && (
                        <button
                          type="button"
                          onClick={() => onCorrectSale(activeReceipt)}
                          className="p-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold text-[10px] uppercase rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                          title="Reabre o carrinho com os itens desta venda para corrigir erros"
                        >
                          <RotateCcw className="w-3 h-3 text-amber-400" />
                          <span>Corrigir Venda</span>
                        </button>
                      )}

                      {onCancelSale && activeReceipt && (
                        <button
                          type="button"
                          onClick={() => onCancelSale(activeReceipt)}
                          className="p-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 font-bold text-[10px] uppercase rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                          title="Cancela esta venda e devolve os itens ao estoque"
                        >
                          <X className="w-3 h-3 text-rose-400" />
                          <span>Cancelar Venda</span>
                        </button>
                      )}

                      {onReturnItems && activeReceipt && (
                        <button
                          type="button"
                          onClick={() => onReturnItems(activeReceipt)}
                          className="p-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-bold text-[10px] uppercase rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                          title="Devolver itens específicos da venda"
                        >
                          <Repeat className="w-3 h-3 text-cyan-400" />
                          <span>Devolução</span>
                        </button>
                      )}
                    </div>

                    {onOpenPrinterConfig && (
                      <button
                        type="button"
                        onClick={onOpenPrinterConfig}
                        className="w-full py-2.5 bg-slate-900 hover:bg-slate-850 border border-emerald-500/25 text-emerald-400 font-bold text-[10.5px] uppercase rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95"
                      >
                        <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                        <span>⚙️ Painel Completo da Bobina (Margens, Corte, Guilhotina, Guia)</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Realistic Fiscal Thermal Receipt Display */}
              <div className="lg:col-span-6 flex justify-center">
                <div 
                  className={`bg-white text-slate-950 p-6 rounded-2xl shadow-2xl font-mono text-[11px] leading-relaxed border-t-8 border-b-8 border-slate-300 w-full ${
                    printerType === "58mm" ? "max-w-[320px]" : printerType === "80mm" ? "max-w-[400px]" : "max-w-full"
                  }`}
                  style={{ backgroundImage: "repeating-linear-gradient(0deg, #fafafa, #fafafa 1px, #fff 1px, #fff 24px)" }}
                >
                  {/* Store Header */}
                  <div className="text-center space-y-1 pb-3 border-b-2 border-dashed border-slate-400">
                    <h3 className="font-black text-sm uppercase text-slate-950">
                      {storeCustomName || "ESTABELECIMENTO COMERCIAL"}
                    </h3>
                    <p className="text-[9px] font-bold text-slate-600">CUPOM FISCAL / REGISTRO DE VENDA</p>
                    {storeCustomCnpjCpf && (
                      <p className="text-[9px] font-bold text-slate-700">CNPJ/CPF: {storeCustomCnpjCpf}</p>
                    )}
                    <p className="text-[8.5px] text-slate-500">
                      Data: {activeReceipt?.date || new Date().toLocaleString("pt-BR")}
                    </p>
                    <p className="text-[8px] text-slate-500">
                      ID: {activeReceipt?.id || "VENDA-0001"}
                    </p>
                    <p className="text-[9px] font-bold text-slate-700">
                      CLIENTE: {activeReceipt?.clientName ? activeReceipt.clientName.toUpperCase() : "CONSUMIDOR FINAL"}
                    </p>
                  </div>

                  {/* Items Table */}
                  <div className="py-3 border-b-2 border-dashed border-slate-400">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-300 text-[9px] font-black uppercase">
                          <th className="pb-1">Item</th>
                          <th className="text-right pb-1">V.Un</th>
                          <th className="text-right pb-1">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-dotted divide-slate-300">
                        {activeReceipt?.items && activeReceipt.items.length > 0 ? (
                          activeReceipt.items.map((it, idx) => (
                            <tr key={idx} className="py-1">
                              <td className="py-1 pr-1">
                                <span className="font-bold block">{it.name.toUpperCase()}</span>
                                <span className="text-[9px] text-slate-600">
                                  {it.quickCode && `#${it.quickCode} • `}{it.quantity} {it.unit || "un"}
                                </span>
                              </td>
                              <td className="text-right py-1 align-top font-mono">{formatCurrency(it.price)}</td>
                              <td className="text-right py-1 align-top font-mono font-bold">
                                {formatCurrency(it.price * it.quantity)}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={3} className="py-5 text-center text-slate-500">
                              <p className="font-black text-slate-700 text-xs uppercase">Nenhuma Venda Ativa no Momento</p>
                              <p className="text-[9px] text-slate-500 mt-1">Conclua uma venda para emitir e visualizar o cupom impresso aqui.</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Payment & Totals */}
                  <div className="py-3 border-b-2 border-dashed border-slate-400 space-y-1.5">
                    <div className="flex justify-between font-bold text-xs">
                      <span>FORMA PAGTO:</span>
                      <span>{(activeReceipt?.paymentMethod || cartPaymentMethod).toUpperCase().replace("_", " ")}</span>
                    </div>

                    <div className="flex justify-between items-baseline font-black text-sm text-slate-950 pt-1 border-t border-slate-200">
                      <span>VALOR TOTAL:</span>
                      <span className="font-mono text-base">{formatCurrency(activeReceipt ? activeReceipt.amount : cartTotal)}</span>
                    </div>

                    {activeReceipt?.paymentMethod === "dinheiro" && activeReceipt.amountPaid && activeReceipt.amountPaid > 0 && (
                      <div className="pt-1 text-[10px] space-y-0.5 text-slate-700">
                        <div className="flex justify-between">
                          <span>Valor Recebido:</span>
                          <span className="font-mono">{formatCurrency(activeReceipt.amountPaid)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-slate-950">
                          <span>Troco Entregue:</span>
                          <span className="font-mono font-black">{formatCurrency(activeReceipt.changeAmount || 0)}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* QR Code and Footer */}
                  <div className="pt-3 text-center space-y-2">
                    <div className="flex justify-center">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(
                          `CUPOM:${activeReceipt?.id || 'TESTE'}|VALOR:${(activeReceipt ? activeReceipt.amount : cartTotal).toFixed(2)}`
                        )}`}
                        alt="QR Code Cupom Fiscal"
                        className="w-20 h-20 border border-slate-300 p-1 rounded"
                      />
                    </div>
                    <p className="text-[8px] text-slate-500 uppercase">QR CODE DE AUTENTICAÇÃO DO CUPOM</p>
                    <p className="text-[9.5px] font-bold text-slate-800 pt-1">
                      {receiptFooterMsg || "Obrigado pela preferência! Volte sempre!"}
                    </p>
                    <p className="text-[8px] text-slate-400">SISTEMA COMERCIAL PROTEGIDO 🛡️</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🛍️ Touch-Screen Product Register Modal */}
      {isTouchRegisterOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-slate-900 border-2 border-emerald-500/40 rounded-3xl p-4 sm:p-6 w-full max-w-lg shadow-2xl text-left space-y-4 my-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-tight">
                    Cadastrar Item Touch-Screen 🛍️
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold">
                    Ideal para tablets, celulares e telas touch com botões grandes
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTouchRegisterOpen(false)}
                className="w-11 h-11 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Field: Product Name */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">
                Nome do Produto ou Serviço *
              </label>
              <input
                type="text"
                value={touchProdName}
                onChange={(e) => setTouchProdName(e.target.value)}
                placeholder="Ex: Coca-Cola 2L, Pão de Queijo, Marmita..."
                className="w-full bg-slate-950 border-2 border-white/10 focus:border-emerald-400 rounded-2xl px-4 py-3 text-sm font-bold text-white uppercase outline-none placeholder:text-slate-600 transition-all shadow-inner"
                autoFocus
              />
            </div>

            {/* Field: Price with Touch Quick Pills */}
            <div className="space-y-2 bg-slate-950/70 p-3 rounded-2xl border border-white/5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase text-amber-400 tracking-wider">
                  Preço de Venda (R$) *
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setTouchNumpadTarget("price");
                      setShowTouchNumpad(prev => !prev);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${
                      showTouchNumpad && touchNumpadTarget === "price"
                        ? "bg-amber-500 text-slate-950"
                        : "bg-white/5 text-slate-400 hover:text-white"
                    }`}
                  >
                    ⌨️ {showTouchNumpad ? "Ocultar Teclado" : "Abrir Teclado Touch"}
                  </button>
                </div>
              </div>

              {/* Price display input */}
              <div 
                onClick={() => {
                  setTouchNumpadTarget("price");
                  setShowTouchNumpad(true);
                }}
                className={`flex items-center justify-between px-4 py-2.5 rounded-xl border-2 transition-all cursor-pointer ${
                  touchNumpadTarget === "price" && showTouchNumpad 
                    ? "bg-slate-900 border-amber-400 shadow-md shadow-amber-500/10" 
                    : "bg-slate-900/60 border-white/10"
                }`}
              >
                <span className="text-sm font-black text-amber-400">R$</span>
                <span className="text-2xl font-black text-white font-mono tracking-wide">
                  {touchProdPrice ? touchProdPrice : "0,00"}
                </span>
                {touchProdPrice && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTouchProdPrice("");
                    }}
                    className="p-1 text-slate-400 hover:text-rose-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Quick Price Pills */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest self-center mr-1">Rápido:</span>
                {[
                  { label: "R$ 2", val: "2,00" },
                  { label: "R$ 5", val: "5,00" },
                  { label: "R$ 10", val: "10,00" },
                  { label: "R$ 15", val: "15,00" },
                  { label: "R$ 20", val: "20,00" },
                  { label: "R$ 50", val: "50,00" }
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setTouchProdPrice(item.val)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm"
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* On-Screen Touch Numpad */}
              {showTouchNumpad && (
                <div className="pt-2 border-t border-white/5 space-y-1.5">
                  <div className="grid grid-cols-3 gap-1.5">
                    {["1", "2", "3", "4", "5", "6", "7", "8", "9", ",", "0", "BACKSPACE"].map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => handleTouchNumpadPress(k)}
                        className={`min-h-[44px] rounded-xl font-black text-base transition-all active:scale-95 cursor-pointer shadow-sm flex items-center justify-center ${
                          k === "BACKSPACE"
                            ? "bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/20"
                            : "bg-slate-800 hover:bg-slate-700 text-white border border-white/5 hover:border-white/20"
                        }`}
                      >
                        {k === "BACKSPACE" ? "⌫ Apagar" : k}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTouchNumpadPress("CLEAR")}
                    className="w-full py-1 text-[9px] font-black uppercase text-slate-400 hover:text-rose-400 tracking-wider"
                  >
                    Limpar Valor Digitado
                  </button>
                </div>
              )}
            </div>

            {/* Field: Category Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                Categoria do Produto
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {[
                  { name: "Alimentos", icon: "🍞" },
                  { name: "Bebidas", icon: "🥤" },
                  { name: "Limpeza", icon: "🧼" },
                  { name: "Serviços", icon: "🛠️" },
                  { name: "Roupas", icon: "👕" },
                  { name: "Outros", icon: "📦" }
                ].map((cat) => (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => setTouchProdCategory(cat.name)}
                    className={`min-h-[42px] px-2 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer border ${
                      touchProdCategory === cat.name
                        ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20 scale-102"
                        : "bg-slate-950 text-slate-400 border-white/5 hover:border-white/20 hover:text-white"
                    }`}
                  >
                    <span className="text-base leading-none">{cat.icon}</span>
                    <span className="truncate w-full text-center">{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Field: Unit Selector & Codes */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">
                  Unidade
                </label>
                <div className="grid grid-cols-4 gap-1">
                  {["UN", "KG", "L", "PCT"].map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setTouchProdUnit(u)}
                      className={`min-h-[36px] rounded-lg font-black text-xs uppercase transition-all cursor-pointer ${
                        touchProdUnit === u
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "bg-slate-950 text-slate-400 border border-white/5 hover:text-white"
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                    Código 4 Dígitos (Opcional)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const rnd = Math.floor(1000 + Math.random() * 9000).toString();
                      setTouchProdQuickCode(rnd);
                    }}
                    className="text-[8px] font-bold text-amber-400 hover:underline"
                  >
                    Gerar Auto
                  </button>
                </div>
                <input
                  type="text"
                  maxLength={4}
                  value={touchProdQuickCode}
                  onChange={(e) => setTouchProdQuickCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="Ex: 0105"
                  className="w-full bg-slate-950 border border-white/10 focus:border-amber-400 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-white text-center outline-none"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 border-t border-white/10 space-y-2">
              <button
                type="button"
                onClick={() => handleSaveTouchProduct(true)}
                className="w-full min-h-[52px] bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 active:scale-98 text-white rounded-2xl font-black text-sm uppercase tracking-wide transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Zap className="w-5 h-5" />
                <span>Cadastrar & Já Lançar no Carrinho 🛒⚡</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveTouchProduct(false)}
                  className="min-h-[44px] bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 rounded-xl font-black text-xs uppercase tracking-wide transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-white/10"
                >
                  <Save className="w-4 h-4 text-emerald-400" />
                  <span>Apenas Salvar no Catálogo 💾</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsTouchRegisterOpen(false)}
                  className="min-h-[44px] bg-white/5 hover:bg-white/10 active:scale-95 text-slate-400 hover:text-white rounded-xl font-bold text-xs uppercase transition-all cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
