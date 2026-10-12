import React, { useState, useMemo, useEffect } from "react";
import {
  Folder,
  FileText,
  Printer,
  Download,
  Send,
  Share2,
  Copy,
  Search,
  Trash2,
  Eye,
  RefreshCw,
  ArrowLeft,
  Calendar,
  DollarSign,
  CheckCircle2,
  Clock,
  User,
  ExternalLink,
  X,
  RotateCcw,
  Receipt,
  ShoppingCart,
  ChevronRight,
  Filter,
  Check,
  CreditCard,
  QrCode
} from "lucide-react";
import { PDVTransaction } from "./PDVModule";
import {
  buildThermalReceiptHtml,
  executeThermalPrint,
  PrinterConfig,
  loadPrinterConfig
} from "../utils/thermalPrinterHelper";

interface PastaCuponsModuleProps {
  transactions: PDVTransaction[];
  formatCurrency: (value: number) => string;
  showNotification: (message: string, type: "success" | "error" | "info" | "warning") => void;
  storeName?: string;
  storeCnpjCpf?: string;
  onBackToPDV?: () => void;
  onReopenInCart?: (items: { name: string; price: number; quantity: number; unit?: string }[]) => void;
}

const STORAGE_RECEIPTS_KEY = "pdv_receipts_archive";

export function PastaCuponsModule({
  transactions,
  formatCurrency,
  showNotification,
  storeName = "MEU ESTABELECIMENTO",
  storeCnpjCpf = "",
  onBackToPDV,
  onReopenInCart
}: PastaCuponsModuleProps) {
  // Loaded printer configuration
  const [printerConfig, setPrinterConfig] = useState<PrinterConfig>(() => loadPrinterConfig());

  // Archive state merged with transactions
  const [archivedReceipts, setArchivedReceipts] = useState<PDVTransaction[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_RECEIPTS_KEY);
      const parsed: PDVTransaction[] = saved ? JSON.parse(saved) : [];
      
      // Merge with valid transactions that have items or are sales
      const validTxs = transactions.filter(t => t.type === "entrada" && !t.isDeleted && t.items && t.items.length > 0);
      const combined = [...parsed];
      
      validTxs.forEach(tx => {
        if (!combined.some(c => c.id === tx.id)) {
          combined.push(tx);
        }
      });
      
      return combined.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    } catch (e) {
      console.warn("Erro ao carregar pasta de cupons:", e);
      return [];
    }
  });

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_RECEIPTS_KEY, JSON.stringify(archivedReceipts));
    } catch (e) {
      console.warn("Erro ao persistir pasta de cupons:", e);
    }
  }, [archivedReceipts]);

  // Keep synced with incoming transactions prop
  useEffect(() => {
    if (transactions.length > 0) {
      const validTxs = transactions.filter(t => t.type === "entrada" && !t.isDeleted && t.items && t.items.length > 0);
      setArchivedReceipts(prev => {
        let changed = false;
        const next = [...prev];
        validTxs.forEach(tx => {
          if (!next.some(c => c.id === tx.id)) {
            next.unshift(tx);
            changed = true;
          }
        });
        return changed ? next.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)) : prev;
      });
    }
  }, [transactions]);

  // Modal view for a specific cupom
  const [viewingReceipt, setViewingReceipt] = useState<PDVTransaction | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [periodFilter, setPeriodFilter] = useState<"hoje" | "ontem" | "7dias" | "mes" | "todos">("todos");
  const [paymentFilter, setPaymentFilter] = useState<string>("todos");

  // Most recent completed receipt
  const latestReceipt = useMemo(() => {
    return archivedReceipts[0] || null;
  }, [archivedReceipts]);

  // Filtered receipts
  const filteredReceipts = useMemo(() => {
    const now = new Date();
    const todayStr = now.toLocaleDateString("pt-BR");
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString("pt-BR");

    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

    return archivedReceipts.filter(rc => {
      // Search match
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        rc.id.toLowerCase().includes(q) ||
        (rc.clientName && rc.clientName.toLowerCase().includes(q)) ||
        (rc.description && rc.description.toLowerCase().includes(q)) ||
        rc.paymentMethod.toLowerCase().includes(q) ||
        (rc.items && rc.items.some(i => i.name.toLowerCase().includes(q)));

      if (!matchSearch) return false;

      // Payment method match
      if (paymentFilter !== "todos" && rc.paymentMethod !== paymentFilter) {
        return false;
      }

      // Period match
      if (periodFilter === "hoje") {
        return rc.date?.startsWith(todayStr);
      }
      if (periodFilter === "ontem") {
        return rc.date?.startsWith(yesterdayStr);
      }
      if (periodFilter === "7dias") {
        return (rc.timestamp || 0) >= sevenDaysAgo;
      }
      if (periodFilter === "mes") {
        return (rc.timestamp || 0) >= thirtyDaysAgo;
      }

      return true;
    });
  }, [archivedReceipts, searchTerm, periodFilter, paymentFilter]);

  // Stats
  const stats = useMemo(() => {
    const totalCount = archivedReceipts.length;
    const totalSalesAmount = archivedReceipts.reduce((acc, r) => acc + (r.amount || 0), 0);
    
    const now = new Date();
    const todayStr = now.toLocaleDateString("pt-BR");
    const todayReceipts = archivedReceipts.filter(r => r.date?.startsWith(todayStr));
    const todayCount = todayReceipts.length;
    const todayAmount = todayReceipts.reduce((acc, r) => acc + (r.amount || 0), 0);

    return { totalCount, totalSalesAmount, todayCount, todayAmount };
  }, [archivedReceipts]);

  // Helper text format for WhatsApp / Clipboard
  const generateReceiptText = (tx: PDVTransaction): string => {
    let text = `=================================\n`;
    text += `       *CUPOM DE COMPRA*       \n`;
    text += `=================================\n`;
    text += `*ESTABELECIMENTO:* ${storeName}\n`;
    if (storeCnpjCpf) {
      text += `*CNPJ/CPF:* ${storeCnpjCpf}\n`;
    }
    text += `*DATA:* ${tx.date}\n`;
    text += `*CUPOM:* #${tx.id.slice(-6).toUpperCase()}\n`;
    if (tx.clientName) {
      text += `*CLIENTE:* ${tx.clientName.toUpperCase()}\n`;
    }
    text += `=================================\n`;
    text += `*ITENS COMPRADOS:*\n`;

    if (tx.items && tx.items.length > 0) {
      tx.items.forEach((item, idx) => {
        const itemTot = item.price * item.quantity;
        text += `${idx + 1}. ${item.name} (${item.quantity} ${item.unit || "un"} x ${formatCurrency(item.price)}) = ${formatCurrency(itemTot)}\n`;
      });
    } else {
      text += `1. ${tx.description || "Venda Balcão"} = ${formatCurrency(tx.amount)}\n`;
    }

    text += `=================================\n`;
    text += `*FORMA PAGTO:* ${tx.paymentMethod.toUpperCase().replace("_", " ")}\n`;
    text += `*VALOR TOTAL:* *${formatCurrency(tx.amount)}*\n`;
    if (tx.paymentMethod === "dinheiro" && tx.amountPaid && tx.amountPaid > 0) {
      text += `*VALOR RECEBIDO:* ${formatCurrency(tx.amountPaid)}\n`;
      text += `*TROCO:* *${formatCurrency(tx.changeAmount || 0)}*\n`;
    }
    text += `=================================\n`;
    text += `Obrigado pela preferência! Volte sempre! 🛒✨\n`;
    return text;
  };

  // Safe printing helper for thermal
  const handlePrintReceipt = (tx: PDVTransaction, width: "58mm" | "80mm" = "80mm") => {
    const effectiveConfig: PrinterConfig = {
      ...printerConfig,
      printerType: width,
      storeName: storeName,
      storeCnpjCpf: storeCnpjCpf,
      receiptFooterMsg: "Obrigado pela preferência! Volte sempre! 🛒✨"
    };

    const fullHtml = buildThermalReceiptHtml({
      tx,
      config: effectiveConfig,
      isTest: false
    });

    executeThermalPrint(
      fullHtml,
      () => showNotification(`Notinha #${tx.id.slice(-6)} enviada para a impressora (${width})! 🖨️`, "success"),
      (err) => {
        console.error("Erro na impressão:", err);
        showNotification("Erro ao imprimir notinha.", "error");
      }
    );
  };

  // Print in standard A4 sheet
  const handlePrintA4 = (tx: PDVTransaction) => {
    const effectiveConfig: PrinterConfig = {
      ...printerConfig,
      printerType: "A4",
      storeName: storeName,
      storeCnpjCpf: storeCnpjCpf,
      receiptFooterMsg: "Comprovante de venda gerado pelo Sistema PDV Comercial."
    };

    const fullHtml = buildThermalReceiptHtml({
      tx,
      config: effectiveConfig,
      isTest: false
    });

    executeThermalPrint(
      fullHtml,
      () => showNotification(`Comprovante A4 #${tx.id.slice(-6)} pronto para impressão! 📄`, "success"),
      (err) => {
        console.error("Erro na impressão A4:", err);
        showNotification("Erro ao imprimir documento.", "error");
      }
    );
  };

  // Send via WhatsApp
  const handleSendWhatsApp = (tx: PDVTransaction) => {
    const txt = encodeURIComponent(generateReceiptText(tx));
    window.open(`https://api.whatsapp.com/send?text=${txt}`, "_blank");
    showNotification("Notinha pronta para envio no WhatsApp! 💬", "success");
  };

  // Copy text
  const handleCopyText = (tx: PDVTransaction) => {
    const txt = generateReceiptText(tx);
    navigator.clipboard.writeText(txt);
    showNotification("Texto da notinha copiado para a área de transferência! 📋", "success");
  };

  return (
    <div className="w-full space-y-5 animate-in fade-in duration-200 text-left select-none pb-20">
      {/* 1. TOP HEADER SECTION */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 border border-indigo-500/30 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-44 h-44 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-tr from-amber-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-500/20 border border-white/10 shrink-0">
              <Folder className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black uppercase text-white tracking-wide">
                  Pasta de Arquivos: Cupons & Notinhas 📁🧾
                </h2>
                <span className="px-2 py-0.5 text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full">
                  Histórico Gravado
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                Todas as notinhas emitidas ficam arquivadas permanentemente aqui. Você pode reimprimir quantas vezes quiser!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {latestReceipt && (
              <button
                type="button"
                onClick={() => setViewingReceipt(latestReceipt)}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-amber-500/25 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                title="Abrir e reimprimir imediatamente o último cupom emitido"
              >
                <Receipt className="w-4 h-4" />
                <span>Reimprimir Última Notinha 🧾</span>
              </button>
            )}

            {onBackToPDV && (
              <button
                type="button"
                onClick={onBackToPDV}
                className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar ao Balcão</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. REASSURANCE BANNER: O CUPOM NUNCA SOME */}
      <div className="bg-gradient-to-r from-amber-500/10 via-slate-950 to-emerald-500/10 border border-amber-500/25 rounded-2xl p-4 flex items-start gap-3.5">
        <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl shrink-0 mt-0.5">
          <Folder className="w-5 h-5" />
        </div>
        <div className="space-y-0.5 text-xs">
          <h4 className="font-black text-amber-300 uppercase tracking-wide flex items-center gap-2">
            Arquivamento Automático & Permanente
            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-[9px] font-mono">
              NUNCA SOME
            </span>
          </h4>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            Mesmo que você saia para mexer no estoque, cadastrar produtos ou atender outro cliente, <strong>as notinhas ficam sempre guardadas nesta pasta</strong>. Clique em qualquer comprovante abaixo para emitir a 2ª via na hora em <strong>80mm</strong>, <strong>58mm</strong> ou <strong>A4</strong>.
          </p>
        </div>
      </div>

      {/* 3. METRICS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/90 border border-white/5 rounded-2xl p-3.5 space-y-1">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
            <Receipt className="w-3.5 h-3.5 text-amber-400" />
            Total de Cupons Gravados
          </span>
          <div className="text-xl font-black text-white font-mono">
            {stats.totalCount}
          </div>
        </div>

        <div className="bg-slate-900/90 border border-white/5 rounded-2xl p-3.5 space-y-1">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            Total Geral das Notinhas
          </span>
          <div className="text-xl font-black text-emerald-400 font-mono">
            {formatCurrency(stats.totalSalesAmount)}
          </div>
        </div>

        <div className="bg-slate-900/90 border border-white/5 rounded-2xl p-3.5 space-y-1">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            Cupons Emitidos Hoje
          </span>
          <div className="text-xl font-black text-sky-400 font-mono">
            {stats.todayCount}
          </div>
        </div>

        <div className="bg-slate-900/90 border border-white/5 rounded-2xl p-3.5 space-y-1">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
            Faturamento de Hoje
          </span>
          <div className="text-xl font-black text-indigo-300 font-mono">
            {formatCurrency(stats.todayAmount)}
          </div>
        </div>
      </div>

      {/* 4. SEARCH & FILTER CONTROLS */}
      <div className="bg-slate-900/80 border border-white/5 rounded-2xl p-3 sm:p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por cliente, nº do cupom (#123), produto ou forma de pagamento..."
            className="w-full bg-slate-950 border border-white/10 focus:border-amber-400 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Period Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          {(["todos", "hoje", "ontem", "7dias", "mes"] as const).map((p) => {
            const labels = {
              todos: "Todos",
              hoje: "Hoje",
              ontem: "Ontem",
              "7dias": "Últimos 7 dias",
              mes: "Este Mês"
            };
            return (
              <button
                key={p}
                type="button"
                onClick={() => setPeriodFilter(p)}
                className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  periodFilter === p
                    ? "bg-amber-600 text-white shadow-md shadow-amber-600/20"
                    : "bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                {labels[p]}
              </button>
            );
          })}
        </div>

        {/* Payment Dropdown */}
        <div className="shrink-0">
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="bg-slate-950 border border-white/10 text-slate-300 rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer"
          >
            <option value="todos">Todas Formas de Pgto</option>
            <option value="dinheiro">Dinheiro</option>
            <option value="pix">PIX</option>
            <option value="cartao_debito">Cartão de Débito</option>
            <option value="cartao_credito">Cartão de Crédito</option>
            <option value="fiado">Fiado</option>
          </select>
        </div>
      </div>

      {/* 5. RECEIPTS ARCHIVE CARDS (FICHÁRIO / PASTA) */}
      <div className="space-y-3">
        {filteredReceipts.length === 0 ? (
          <div className="bg-slate-900/40 border border-dashed border-white/10 rounded-3xl p-12 text-center space-y-3">
            <Folder className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-base font-black text-slate-300 uppercase">
              Nenhuma notinha encontrada
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {searchTerm || periodFilter !== "todos" || paymentFilter !== "todos"
                ? "Nenhum cupom corresponde aos filtros selecionados. Tente limpar os filtros."
                : "Quando você realizar vendas no balcão, todas as notinhas serão gravadas automaticamente aqui nesta pasta."}
            </p>
            {(searchTerm || periodFilter !== "todos" || paymentFilter !== "todos") && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setPeriodFilter("todos");
                  setPaymentFilter("todos");
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold uppercase rounded-xl transition-all cursor-pointer"
              >
                Limpar Filtros
              </button>
            )}
          </div>
        ) : (
          filteredReceipts.map((rc, index) => {
            const shortId = rc.id.slice(-6).toUpperCase();
            const itemCount = rc.items ? rc.items.length : 1;
            const isToday = rc.date?.startsWith(new Date().toLocaleDateString("pt-BR"));

            return (
              <div
                key={rc.id}
                className="bg-slate-900 border border-white/10 hover:border-amber-400/40 rounded-2xl p-4 sm:p-5 shadow-lg transition-all duration-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group"
              >
                {/* Left: Info */}
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <div className="w-11 h-11 bg-slate-950 border border-white/10 group-hover:border-amber-400/30 rounded-xl flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                    <Receipt className="w-5 h-5" />
                  </div>

                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-black text-sm text-white">
                        CUPOM #{shortId}
                      </span>
                      {isToday && (
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-[9px] font-black uppercase">
                          Emitido Hoje
                        </span>
                      )}
                      <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[9.5px] font-mono font-bold uppercase">
                        {rc.paymentMethod.replace("_", " ")}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1 font-mono">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        {rc.date}
                      </span>
                      {rc.clientName && (
                        <span className="flex items-center gap-1 text-slate-300 font-bold">
                          <User className="w-3.5 h-3.5 text-amber-400" />
                          {rc.clientName}
                        </span>
                      )}
                      <span className="text-slate-500">
                        • {itemCount} item(ns)
                      </span>
                    </div>

                    {/* Quick Preview of Items */}
                    {rc.items && rc.items.length > 0 && (
                      <div className="text-[11px] text-slate-400 font-sans line-clamp-1 pt-0.5">
                        {rc.items.map(it => `${it.quantity}x ${it.name}`).join(", ")}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Price & Print Action Buttons */}
                <div className="flex flex-wrap sm:flex-nowrap items-center justify-between md:justify-end gap-3 w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-white/5">
                  <div className="text-left md:text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-black block">Total</span>
                    <span className="font-mono font-black text-lg text-emerald-400">
                      {formatCurrency(rc.amount)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* View Receipt */}
                    <button
                      type="button"
                      onClick={() => setViewingReceipt(rc)}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                      title="Ver o cupom térmico na tela"
                    >
                      <Eye className="w-3.5 h-3.5 text-sky-400" />
                      <span>Ver</span>
                    </button>

                    {/* Print 80mm */}
                    <button
                      type="button"
                      onClick={() => handlePrintReceipt(rc, "80mm")}
                      className="px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-amber-600/20 flex items-center gap-1.5 cursor-pointer"
                      title="Imprimir notinha na impressora térmica (80mm)"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>80mm</span>
                    </button>

                    {/* Print 58mm */}
                    <button
                      type="button"
                      onClick={() => handlePrintReceipt(rc, "58mm")}
                      className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                      title="Imprimir notinha na impressora estreita (58mm)"
                    >
                      <Printer className="w-3.5 h-3.5 text-amber-300" />
                      <span>58mm</span>
                    </button>

                    {/* WhatsApp */}
                    <button
                      type="button"
                      onClick={() => handleSendWhatsApp(rc)}
                      className="p-2 bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#25D366] rounded-xl transition-all cursor-pointer"
                      title="Enviar pelo WhatsApp"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>

                    {/* Reopen in cart */}
                    {onReopenInCart && rc.items && rc.items.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          onReopenInCart(rc.items!.map(it => ({
                            name: it.name,
                            price: it.price,
                            quantity: it.quantity,
                            unit: it.unit || "un"
                          })));
                          showNotification("Itens desta notinha carregados no carrinho!", "success");
                        }}
                        className="p-2 bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 rounded-xl transition-all cursor-pointer"
                        title="Reabrir estes itens no carrinho de vendas"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 6. MODAL VISUALIZADOR REALISTA DA NOTINHA TÉRMICA */}
      {viewingReceipt && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between gap-3 bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black uppercase text-white">
                    Notinha de Compra #{viewingReceipt.id.slice(-6).toUpperCase()}
                  </h3>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {viewingReceipt.date} • {viewingReceipt.paymentMethod.replace("_", " ").toUpperCase()}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewingReceipt(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Realistic Receipt Paper */}
            <div className="p-4 sm:p-6 overflow-y-auto no-scrollbar bg-slate-950/40 flex justify-center">
              <div className="w-full max-w-[340px] bg-white text-black p-5 rounded-2xl shadow-xl font-mono text-xs border border-slate-300 space-y-3">
                {/* Header Store */}
                <div className="text-center space-y-0.5 border-b-2 border-dashed border-black pb-3">
                  <div className="font-black text-sm uppercase tracking-wide">
                    {storeName}
                  </div>
                  {storeCnpjCpf && (
                    <div className="text-[10px] text-slate-700">
                      CNPJ/CPF: {storeCnpjCpf}
                    </div>
                  )}
                  <div className="text-[10px] text-slate-700">
                    CUPOM FISCAL / RECIBO NÃO OFICIAL
                  </div>
                </div>

                {/* Info */}
                <div className="text-[11px] space-y-0.5 border-b border-dashed border-black pb-2">
                  <div className="flex justify-between">
                    <span>CUPOM:</span>
                    <strong className="font-black">#{viewingReceipt.id.slice(-6).toUpperCase()}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>DATA:</span>
                    <span>{viewingReceipt.date}</span>
                  </div>
                  {viewingReceipt.clientName && (
                    <div className="flex justify-between">
                      <span>CLIENTE:</span>
                      <strong className="font-bold">{viewingReceipt.clientName.toUpperCase()}</strong>
                    </div>
                  )}
                </div>

                {/* Items */}
                <div className="space-y-1.5 border-b-2 border-dashed border-black pb-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-700 flex justify-between">
                    <span>ITEM / DESCRIÇÃO</span>
                    <span>VALOR</span>
                  </div>
                  {viewingReceipt.items && viewingReceipt.items.length > 0 ? (
                    viewingReceipt.items.map((it, idx) => (
                      <div key={idx} className="space-y-0.5 text-[11px]">
                        <div className="font-bold">{idx + 1}. {it.name}</div>
                        <div className="flex justify-between text-[10px] text-slate-600">
                          <span>{it.quantity} {it.unit || "un"} x {formatCurrency(it.price)}</span>
                          <span className="font-bold text-black">{formatCurrency(it.price * it.quantity)}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex justify-between text-[11px]">
                      <span>1. {viewingReceipt.description || "Venda Balcão"}</span>
                      <span className="font-bold">{formatCurrency(viewingReceipt.amount)}</span>
                    </div>
                  )}
                </div>

                {/* Totals */}
                <div className="space-y-1 text-xs pt-1 border-b-2 border-dashed border-black pb-3">
                  <div className="flex justify-between text-sm font-black">
                    <span>TOTAL A PAGAR:</span>
                    <span className="text-base font-black">{formatCurrency(viewingReceipt.amount)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-700">
                    <span>FORMA PGTO:</span>
                    <span className="font-bold uppercase">{viewingReceipt.paymentMethod.replace("_", " ")}</span>
                  </div>
                  {viewingReceipt.paymentMethod === "dinheiro" && viewingReceipt.amountPaid && viewingReceipt.amountPaid > 0 && (
                    <>
                      <div className="flex justify-between text-[11px] text-slate-700">
                        <span>VALOR RECEBIDO:</span>
                        <span>{formatCurrency(viewingReceipt.amountPaid)}</span>
                      </div>
                      <div className="flex justify-between text-[11px] font-bold">
                        <span>TROCO:</span>
                        <span>{formatCurrency(viewingReceipt.changeAmount || 0)}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Footer */}
                <div className="text-center text-[10px] text-slate-600 pt-1 space-y-1">
                  <div>Obrigado pela preferência! Volte sempre! 🛒✨</div>
                  <div className="text-[9px] text-slate-500 font-mono">
                    Emitido via Sistema PDV Comercial
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 sm:p-5 border-t border-white/10 bg-slate-950/80 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePrintReceipt(viewingReceipt, "80mm")}
                  className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-amber-600/25 flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir 80mm</span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePrintReceipt(viewingReceipt, "58mm")}
                  className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-amber-300" />
                  <span>58mm</span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePrintA4(viewingReceipt)}
                  className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                  title="Imprimir em folha A4"
                >
                  <FileText className="w-4 h-4" />
                  <span>A4</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSendWhatsApp(viewingReceipt)}
                  className="px-3.5 py-2.5 bg-[#25D366] hover:bg-[#20ba59] text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                  <Send className="w-4 h-4" />
                  <span>WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCopyText(viewingReceipt)}
                  className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all cursor-pointer"
                  title="Copiar texto da notinha"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
