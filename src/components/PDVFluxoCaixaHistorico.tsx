import React, { useState, useMemo } from "react";
import {
  Calendar,
  Clock,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  ArrowLeft,
  RotateCcw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Package,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Printer,
  MessageCircle,
  ShieldAlert,
  Flame,
  Snowflake,
  ShoppingBag,
  CreditCard,
  Banknote,
  QrCode,
  Tag
} from "lucide-react";
import { Transaction, CustomProduct, ProductStockInfo } from "../types";

interface PDVFluxoCaixaHistoricoProps {
  transactions: Transaction[];
  customProducts: CustomProduct[];
  productStockData: Record<string, ProductStockInfo>;
  formatCurrency: (value: number) => string;
  showNotification: (message: string, type: "success" | "error" | "info") => void;
  onBackToPDV: () => void;
  onOpenReturnModal?: (tx: Transaction) => void;
  onPrintReceipt?: (tx: Transaction) => void;
  onShareWhatsApp?: (tx: Transaction) => void;
  paymentRates?: Record<string, number>;
}

export const PDVFluxoCaixaHistorico: React.FC<PDVFluxoCaixaHistoricoProps> = ({
  transactions,
  customProducts,
  productStockData,
  formatCurrency,
  showNotification,
  onBackToPDV,
  onOpenReturnModal,
  onPrintReceipt,
  onShareWhatsApp,
  paymentRates = {}
}) => {
  // Period filter: "hoje" | "ontem" | "7dias" | "mes" | "custom"
  const [periodFilter, setPeriodFilter] = useState<"hoje" | "ontem" | "7dias" | "mes" | "custom">("hoje");
  
  // Custom date selection (YYYY-MM-DD)
  const todayStr = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Sub-view: "vendas" | "produtos" | "validade"
  const [activeView, setActiveView] = useState<"vendas" | "produtos" | "validade">("vendas");

  // Filter type: "todas" | "entrada" | "saida"
  const [filterType, setFilterType] = useState<"todas" | "entrada" | "saida">("todas");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("todos");

  // Helper date calculations
  const dateRange = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (periodFilter === "hoje") {
      const end = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000 - 1);
      return { start: startOfToday, end, label: "Hoje (" + startOfToday.toLocaleDateString("pt-BR") + ")" };
    }
    
    if (periodFilter === "ontem") {
      const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
      const endOfYesterday = new Date(startOfToday.getTime() - 1);
      return { start: startOfYesterday, end: endOfYesterday, label: "Ontem (" + startOfYesterday.toLocaleDateString("pt-BR") + ")" };
    }
    
    if (periodFilter === "7dias") {
      const start7Days = new Date(startOfToday.getTime() - 6 * 24 * 60 * 60 * 1000);
      const end = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000 - 1);
      return { start: start7Days, end, label: "Últimos 7 Dias" };
    }
    
    if (periodFilter === "mes") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      return { start: startOfMonth, end: endOfMonth, label: "Mês Atual (" + now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }) + ")" };
    }
    
    // Custom date
    const [y, m, d] = selectedDate.split("-").map(Number);
    const startCustom = new Date(y, m - 1, d, 0, 0, 0);
    const endCustom = new Date(y, m - 1, d, 23, 59, 59);
    return { start: startCustom, end: endCustom, label: "Dia " + startCustom.toLocaleDateString("pt-BR") };
  }, [periodFilter, selectedDate]);

  // Filtered transactions for the chosen period
  const periodTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const txDate = new Date(tx.timestamp);
      return txDate >= dateRange.start && txDate <= dateRange.end;
    });
  }, [transactions, dateRange]);

  // Financial summary of the period
  const stats = useMemo(() => {
    let totalEntradas = 0;
    let totalSaidas = 0;
    let totalVendasCount = 0;
    let totalTaxas = 0;
    const paymentBreakdown: Record<string, number> = {
      dinheiro: 0,
      pix: 0,
      debito: 0,
      credito: 0,
      fiado: 0
    };

    periodTransactions.forEach(tx => {
      if (tx.isDeleted) return;

      if (tx.type === "entrada") {
        totalEntradas += tx.amount;
        if (tx.category === "venda") {
          totalVendasCount += 1;
        }

        const method = (tx.paymentMethod || "dinheiro").toLowerCase();
        if (paymentBreakdown[method] !== undefined) {
          paymentBreakdown[method] += tx.amount;
        } else {
          paymentBreakdown[method] = (paymentBreakdown[method] || 0) + tx.amount;
        }

        // Card fees calculation
        const rate = tx.feeRate !== undefined ? tx.feeRate : (paymentRates[tx.paymentMethod] || 0);
        if (rate > 0) {
          const fee = tx.feeAmount !== undefined ? tx.feeAmount : (tx.amount * rate) / 100;
          totalTaxas += fee;
        }
      } else if (tx.type === "saida") {
        totalSaidas += tx.amount;
      }
    });

    const saldoLiquido = totalEntradas - totalSaidas;
    const ticketMedio = totalVendasCount > 0 ? totalEntradas / totalVendasCount : 0;

    return {
      totalEntradas,
      totalSaidas,
      saldoLiquido,
      totalVendasCount,
      ticketMedio,
      totalTaxas,
      paymentBreakdown
    };
  }, [periodTransactions, paymentRates]);

  // Product sales analysis (Most sold vs Stalled/Least sold)
  const productPerformance = useMemo(() => {
    const countsMap: Record<string, { name: string; qty: number; revenue: number; category: string }> = {};

    periodTransactions.forEach(tx => {
      if (tx.isDeleted || tx.type !== "entrada") return;

      if (tx.cartItems && tx.cartItems.length > 0) {
        tx.cartItems.forEach(item => {
          const key = item.productId || item.name.toLowerCase().trim();
          if (!countsMap[key]) {
            countsMap[key] = {
              name: item.name,
              qty: 0,
              revenue: 0,
              category: (item as any).category || "Geral"
            };
          }
          countsMap[key].qty += item.quantity;
          countsMap[key].revenue += item.totalPrice || (item.unitPrice * item.quantity);
        });
      } else if (tx.description) {
        // Fallback parse if cartItems not present
        const desc = tx.description.replace(/^Venda:\s*/i, "");
        const parts = desc.split(/,\s*/);
        parts.forEach(part => {
          const match = part.match(/(.+?)\s*\(x(\d+)\)/);
          if (match) {
            const name = match[1].trim();
            const qty = parseInt(match[2], 10) || 1;
            const key = name.toLowerCase();
            if (!countsMap[key]) {
              countsMap[key] = { name, qty: 0, revenue: 0, category: "Geral" };
            }
            countsMap[key].qty += qty;
            countsMap[key].revenue += tx.amount / Math.max(1, parts.length);
          }
        });
      }
    });

    const mostSold = Object.values(countsMap).sort((a, b) => b.qty - a.qty);

    // Stalled / No-sales products in catalog
    const soldNames = new Set(Object.values(countsMap).map(p => p.name.toLowerCase().trim()));
    const stalled = customProducts
      .filter(p => !soldNames.has(p.name.toLowerCase().trim()))
      .map(p => {
        const stock = productStockData[p.id]?.stockQty ?? 0;
        return {
          id: p.id,
          name: p.name,
          category: p.category || "Geral",
          price: p.price,
          stock
        };
      });

    return { mostSold, stalled };
  }, [periodTransactions, customProducts, productStockData]);

  // Product Expiry Alerts (Validade dos Produtos)
  const validityAlerts = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const items = customProducts
      .filter(p => (p as any).validity)
      .map(p => {
        const validityStr = (p as any).validity as string;
        const vDate = new Date(validityStr + "T00:00:00");
        const diffTime = vDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const stock = productStockData[p.id]?.stockQty ?? 0;

        let status: "vencido" | "urgente" | "atencao" | "seguro" = "seguro";
        if (diffDays < 0) {
          status = "vencido";
        } else if (diffDays <= 7) {
          status = "urgente";
        } else if (diffDays <= 30) {
          status = "atencao";
        }

        return {
          id: p.id,
          name: p.name,
          category: p.category || "Alimentos",
          price: p.price,
          costPrice: (p as any).costPrice || 0,
          stock,
          validityDate: vDate,
          validityFormatted: vDate.toLocaleDateString("pt-BR"),
          diffDays,
          status
        };
      })
      .sort((a, b) => a.diffDays - b.diffDays);

    const expiredCount = items.filter(i => i.status === "vencido").length;
    const urgentCount = items.filter(i => i.status === "urgente").length;
    const attentionCount = items.filter(i => i.status === "atencao").length;

    return { items, expiredCount, urgentCount, attentionCount };
  }, [customProducts, productStockData]);

  // Filtered detailed sales list
  const filteredSalesList = useMemo(() => {
    return periodTransactions.filter(tx => {
      if (filterType !== "todas" && tx.type !== filterType) return false;
      if (selectedPaymentMethod !== "todos" && tx.paymentMethod?.toLowerCase() !== selectedPaymentMethod) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchDesc = tx.description?.toLowerCase().includes(q);
        const matchClient = tx.customerName?.toLowerCase().includes(q);
        const matchId = tx.id?.toLowerCase().includes(q);
        if (!matchDesc && !matchClient && !matchId) return false;
      }
      return true;
    });
  }, [periodTransactions, filterType, selectedPaymentMethod, searchQuery]);

  return (
    <div className="w-full space-y-6 text-left animate-fadeIn">
      {/* Top Header with Back to PDV button */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 border border-emerald-500/30 rounded-3xl p-5 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-emerald-600/20 text-emerald-400 rounded-2xl border border-emerald-500/30 shadow-inner">
            <Calendar className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Aba Exclusiva de Caixa
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {dateRange.label}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black uppercase text-white tracking-wide mt-1 flex items-center gap-2">
              Fluxo & Histórico de Caixa Diário 📅
            </h1>
            <p className="text-xs text-slate-300 font-medium">
              Acompanhe exatamente o que vendeu em cada dia, semana e mês, produtos mais vendidos, encalhados e alertas de validade.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onBackToPDV}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao Balcão de Vendas</span>
        </button>
      </div>

      {/* Period Selection Navigation (Hoje, Ontem, 7 Dias, Mês, Calendário) */}
      <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-emerald-400" />
            Período:
          </span>

          <button
            type="button"
            onClick={() => setPeriodFilter("hoje")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              periodFilter === "hoje"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30 border border-emerald-400"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
            }`}
          >
            Hoje
          </button>

          <button
            type="button"
            onClick={() => setPeriodFilter("ontem")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              periodFilter === "ontem"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30 border border-emerald-400"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
            }`}
          >
            Ontem
          </button>

          <button
            type="button"
            onClick={() => setPeriodFilter("7dias")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              periodFilter === "7dias"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30 border border-emerald-400"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
            }`}
          >
            Últimos 7 Dias
          </button>

          <button
            type="button"
            onClick={() => setPeriodFilter("mes")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              periodFilter === "mes"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30 border border-emerald-400"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
            }`}
          >
            Mês Atual
          </button>
        </div>

        {/* Datepicker for custom day */}
        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-white/10">
          <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Escolher Dia:</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setPeriodFilter("custom");
            }}
            className="bg-transparent text-xs text-white font-bold outline-none cursor-pointer"
          />
        </div>
      </div>

      {/* KPI Financial Cards (Azul Marinho e Branco de Alto Destaque) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Entradas / Faturamento */}
        <div className="bg-gradient-to-b from-emerald-900/40 to-slate-900 border border-emerald-500/30 p-4 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase text-emerald-300 tracking-wider">Total Entradas (Vendas)</span>
            <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-white mt-2 font-mono">
            {formatCurrency(stats.totalEntradas)}
          </div>
          <span className="text-[9.5px] text-emerald-400 font-bold block mt-1">
            {stats.totalVendasCount} venda(s) realizada(s)
          </span>
        </div>

        {/* Saídas / Sangrias */}
        <div className="bg-gradient-to-b from-rose-950/30 to-slate-900 border border-rose-500/20 p-4 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase text-rose-300 tracking-wider">Total Saídas / Sangrias</span>
            <div className="p-1.5 bg-rose-500/20 text-rose-400 rounded-lg">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-400 mt-2 font-mono">
            -{formatCurrency(stats.totalSaidas)}
          </div>
          <span className="text-[9.5px] text-slate-400 font-medium block mt-1">
            Retiradas manuais / pagamentos
          </span>
        </div>

        {/* Saldo Líquido */}
        <div className="bg-gradient-to-b from-emerald-950 to-slate-900 border-2 border-emerald-500/50 p-4 rounded-2xl shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase text-emerald-200 tracking-wider">Saldo Líquido em Caixa</span>
            <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-white mt-2 font-mono">
            {formatCurrency(stats.saldoLiquido)}
          </div>
          <span className="text-[9.5px] text-emerald-300 font-bold block mt-1">
            Entradas (-) Saídas
          </span>
        </div>

        {/* Ticket Médio */}
        <div className="bg-slate-900 border border-white/10 p-4 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Ticket Médio / Venda</span>
            <div className="p-1.5 bg-purple-500/20 text-purple-400 rounded-lg">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-white mt-2 font-mono">
            {formatCurrency(stats.ticketMedio)}
          </div>
          <span className="text-[9.5px] text-slate-400 font-medium block mt-1">
            Média por cliente
          </span>
        </div>

        {/* Alerta de Validades */}
        <div 
          onClick={() => setActiveView("validade")}
          className="bg-amber-950/30 border border-amber-500/30 p-4 rounded-2xl shadow-lg cursor-pointer hover:bg-amber-900/30 transition-all col-span-2 lg:col-span-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase text-amber-300 tracking-wider">Alertas de Validade</span>
            <div className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-400 mt-2 font-mono flex items-center gap-2">
            <span>{validityAlerts.expiredCount + validityAlerts.urgentCount}</span>
            <span className="text-xs font-normal text-amber-300/80">críticos</span>
          </div>
          <span className="text-[9.5px] text-amber-300 font-bold block mt-1 underline">
            Clique para ver vencimentos ➡️
          </span>
        </div>
      </div>

      {/* Sub-Tabs: [1. Extrato de Vendas do Dia] [2. Ranking & O que mais vendeu / encalhou] [3. Monitor de Validade & Vencimento] */}
      <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-white/10 gap-2">
        <button
          type="button"
          onClick={() => setActiveView("vendas")}
          className={`flex-1 py-3 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeView === "vendas"
              ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Extrato de Vendas do Dia ({periodTransactions.length}) 📋</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveView("produtos")}
          className={`flex-1 py-3 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeView === "produtos"
              ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Mais Vendidos vs Encalhados 🏆</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveView("validade")}
          className={`flex-1 py-3 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeView === "validade"
              ? "bg-amber-600 text-white shadow-lg shadow-amber-600/30"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-amber-300" />
          <span>Monitor de Validades & Vencimentos ⏳</span>
        </button>
      </div>

      {/* VIEW 1: DETAILED TRANSACTIONS LIST */}
      {activeView === "vendas" && (
        <div className="bg-slate-900 border border-emerald-500/20 rounded-3xl p-5 shadow-2xl space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Filtrar:</span>
              <button
                type="button"
                onClick={() => setFilterType("todas")}
                className={`px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                  filterType === "todas" ? "bg-white text-slate-950 font-black" : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => setFilterType("entrada")}
                className={`px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                  filterType === "entrada" ? "bg-emerald-500 text-slate-950 font-black" : "bg-slate-800 text-slate-400 hover:text-emerald-400"
                }`}
              >
                Vendas & Entradas
              </button>
              <button
                type="button"
                onClick={() => setFilterType("saida")}
                className={`px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                  filterType === "saida" ? "bg-rose-500 text-white font-black" : "bg-slate-800 text-slate-400 hover:text-rose-400"
                }`}
              >
                Saídas / Sangrias
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar item, cliente ou valor..."
                className="w-full bg-slate-950 border border-white/10 pl-9 pr-3 py-1.5 text-xs text-white rounded-xl outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Transactions List */}
          {filteredSalesList.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Nenhum registro encontrado para este período
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Selecione outro dia no calendário ou registre uma nova venda no Balcão de Vendas.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredSalesList.map((tx) => {
                const txDate = new Date(tx.timestamp);
                const isEntrada = tx.type === "entrada";

                return (
                  <div
                    key={tx.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      tx.isDeleted
                        ? "bg-rose-950/10 border-rose-500/10 opacity-50"
                        : isEntrada
                          ? "bg-slate-950/80 border-emerald-500/20 hover:border-emerald-500/40"
                          : "bg-rose-950/20 border-rose-500/20"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono font-bold text-emerald-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {txDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {txDate.toLocaleDateString("pt-BR")}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider ${
                          isEntrada ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                        }`}>
                          {tx.category || (isEntrada ? "Venda" : "Saída")}
                        </span>
                        {tx.paymentMethod && (
                          <span className="px-2 py-0.5 rounded-full text-[8.5px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300">
                            {tx.paymentMethod}
                          </span>
                        )}
                        {tx.customerName && (
                          <span className="text-[10px] text-purple-300 font-bold">
                            Cliente: {tx.customerName}
                          </span>
                        )}
                      </div>

                      {/* Items sold in this transaction */}
                      <p className="text-xs font-bold text-white tracking-wide">
                        {tx.description}
                      </p>

                      {tx.operator && (
                        <span className="text-[9.5px] text-slate-400 font-mono block">
                          Operador: {tx.operator}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      <div className="text-right">
                        <span className={`text-base font-black font-mono tracking-tight ${
                          tx.isDeleted ? "line-through text-slate-500" : isEntrada ? "text-emerald-400" : "text-rose-400"
                        }`}>
                          {isEntrada ? "+" : "-"}{formatCurrency(tx.amount)}
                        </span>
                        {tx.changeAmount && tx.changeAmount > 0 && (
                          <span className="text-[9px] text-slate-400 block">
                            Troco: {formatCurrency(tx.changeAmount)}
                          </span>
                        )}
                      </div>

                      {/* Action buttons (Reimprimir / WhatsApp / Estorno) */}
                      <div className="flex items-center gap-1.5">
                        {onPrintReceipt && (
                          <button
                            type="button"
                            onClick={() => onPrintReceipt(tx)}
                            title="Reimprimir Comprovante de Venda"
                            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-all cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onShareWhatsApp && (
                          <button
                            type="button"
                            onClick={() => onShareWhatsApp(tx)}
                            title="Enviar Comprovante no WhatsApp"
                            className="p-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded-xl transition-all cursor-pointer"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onOpenReturnModal && !tx.isDeleted && tx.category === "venda" && isEntrada && (
                          <button
                            type="button"
                            onClick={() => onOpenReturnModal(tx)}
                            title="Realizar Troca ou Estorno"
                            className="p-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 rounded-xl transition-all cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: PRODUCTS SALES RANKING (MAIS VENDIDOS VS ENCALHADOS) */}
      {activeView === "produtos" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Top Selling Products (7/12) */}
          <div className="lg:col-span-7 bg-slate-900 border border-emerald-500/20 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase text-white tracking-wider">
                    Campeões de Venda do Período 🏆
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Itens que mais giraram e geraram faturamento no caixa.
                  </p>
                </div>
              </div>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full">
                {productPerformance.mostSold.length} produtos
              </span>
            </div>

            {productPerformance.mostSold.length === 0 ? (
              <p className="text-center py-8 text-xs text-slate-500">
                Nenhuma venda registrada com itens detalhados neste período.
              </p>
            ) : (
              <div className="space-y-2">
                {productPerformance.mostSold.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-950/80 rounded-2xl border border-white/5 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs ${
                        idx === 0
                          ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30"
                          : idx === 1
                            ? "bg-slate-300 text-slate-950"
                            : idx === 2
                              ? "bg-amber-700 text-white"
                              : "bg-slate-800 text-slate-400"
                      }`}>
                        #{idx + 1}
                      </div>
                      <div>
                        <h4 className="text-xs font-black uppercase text-white">
                          {item.name}
                        </h4>
                        <span className="text-[9.5px] text-slate-400 font-medium">
                          Categoria: {item.category}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-black text-emerald-400 font-mono block">
                        {item.qty} un vendida(s)
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {formatCurrency(item.revenue)} total
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Stalled / No-sales products (5/12) */}
          <div className="lg:col-span-5 bg-slate-900 border border-white/10 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                  <Snowflake className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase text-white tracking-wider">
                    Produtos Encalhados / Sem Saída 🧊
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Itens em catálogo sem nenhuma venda neste período.
                  </p>
                </div>
              </div>
              <span className="text-[10px] bg-slate-800 text-slate-300 font-bold px-2 py-0.5 rounded-full">
                {productPerformance.stalled.length} itens
              </span>
            </div>

            {productPerformance.stalled.length === 0 ? (
              <p className="text-center py-8 text-xs text-emerald-400 font-bold">
                🎉 Parabéns! Todos os produtos do seu catálogo tiveram vendas neste período!
              </p>
            ) : (
              <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                {productPerformance.stalled.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-950/60 rounded-2xl border border-white/5 flex items-center justify-between gap-3"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">
                        {item.name}
                      </h4>
                      <span className="text-[9px] text-slate-400">
                        Estoque: {item.stock} un | {formatCurrency(item.price)}
                      </span>
                    </div>
                    <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-bold uppercase">
                      Promover 💡
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 3: VALIDITY MONITOR (CONTROLE DE VALIDADES & VENCIMENTO) */}
      {activeView === "validade" && (
        <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-5 shadow-2xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black uppercase text-white tracking-wider flex items-center gap-2">
                  Monitor de Validades & Prevenção de Perdas ⏳
                </h3>
                <p className="text-xs text-slate-300 font-medium">
                  Controle carnes de hambúrguer, frios, laticínios, pães e doces antes que vençam para não jogar dinheiro fora!
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-xl text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                {validityAlerts.expiredCount} Vencidos
              </span>
              <span className="px-3 py-1 rounded-xl text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {validityAlerts.urgentCount} Vence em até 7 dias
              </span>
              <span className="px-3 py-1 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {validityAlerts.attentionCount} Vence em até 30 dias
              </span>
            </div>
          </div>

          {validityAlerts.items.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <p className="text-sm font-bold text-white">
                Nenhum produto cadastrado com data de validade ainda.
              </p>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                No cadastro de produtos, preencha o campo "Data de Validade" (ex: carnes de hambúrguer, refrigerantes, frios) para que o sistema monitore e te avise automaticamente!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {validityAlerts.items.map((prod) => {
                const isExpired = prod.status === "vencido";
                const isUrgent = prod.status === "urgente";
                const isAttention = prod.status === "atencao";

                return (
                  <div
                    key={prod.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      isExpired
                        ? "bg-rose-950/30 border-rose-500/40"
                        : isUrgent
                          ? "bg-amber-950/30 border-amber-500/40 shadow-lg shadow-amber-950/20"
                          : isAttention
                            ? "bg-emerald-950/20 border-emerald-500/20"
                            : "bg-slate-950/60 border-white/5"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          isExpired
                            ? "bg-rose-500 text-white animate-pulse"
                            : isUrgent
                              ? "bg-amber-500 text-slate-950 font-black"
                              : isAttention
                                ? "bg-emerald-500/20 text-emerald-300"
                                : "bg-emerald-500/20 text-emerald-300"
                        }`}>
                          {isExpired
                            ? `VENCIDO HÁ ${Math.abs(prod.diffDays)} DIAS ⚠️`
                            : isUrgent
                              ? `VENCE EM ${prod.diffDays} DIAS (URGENTE!) ⏳`
                              : isAttention
                                ? `Vence em ${prod.diffDays} dias`
                                : "Validade Segura ✅"}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Vencimento: {prod.validityFormatted}
                        </span>
                      </div>

                      <h4 className="text-sm font-black text-white uppercase tracking-wide">
                        {prod.name}
                      </h4>
                      <div className="flex items-center gap-3 text-xs text-slate-300">
                        <span>Estoque Restante: <strong className="text-white font-mono">{prod.stock} un</strong></span>
                        <span>•</span>
                        <span>Preço de Venda: <strong className="text-emerald-400 font-mono">{formatCurrency(prod.price)}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {isUrgent && (
                        <div className="bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-xl text-left">
                          <span className="text-[9px] font-black uppercase text-amber-300 block">Dica Estratégica:</span>
                          <span className="text-[10px] text-slate-200">
                            Fazer promoção relâmpago para vender antes de perder!
                          </span>
                        </div>
                      )}
                      {isExpired && (
                        <div className="bg-rose-500/10 border border-rose-500/30 p-2.5 rounded-xl text-left">
                          <span className="text-[9px] font-black uppercase text-rose-300 block">Ação Obrigatória:</span>
                          <span className="text-[10px] text-slate-200">
                            Descartar ou acionar fornecedor para troca!
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
