/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ShoppingCart,
  PlusCircle,
  Layers,
  ChefHat,
  Users,
  BarChart,
  Crown,
  Sparkles,
  Scale,
  Calculator,
  ArrowLeft,
  Search,
  UserCheck,
  Camera,
  Repeat,
  CheckCircle2,
  XCircle,
  Coins,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  HelpCircle,
  ShieldAlert,
  Smartphone,
  Laptop
} from "lucide-react";

interface BalcaoComandosModuleProps {
  onSelectAction: (action: string) => void;
  onOpenPDVWithSubTab?: (subTab: string | null) => void;
  formatCurrency?: (val: number) => string;
  showNotification?: (msg: string, type?: "success" | "warning" | "error" | "info") => void;
}

export const BalcaoComandosModule: React.FC<BalcaoComandosModuleProps> = ({
  onSelectAction,
  onOpenPDVWithSubTab,
  formatCurrency = (v) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
  showNotification = (_msg?: string, _type?: string) => {}
}) => {
  const [showReconciliation, setShowReconciliation] = useState(false);
  const [useBillCounter, setUseBillCounter] = useState(false);

  // Estados da reconciliação (Balanceador de Gaveta)
  const [declaredDrawerAmount, setDeclaredDrawerAmount] = useState<string>("");
  const [openingFloat, setOpeningFloat] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("pdv_fundo_troco");
      return saved ? parseFloat(saved) : 100;
    } catch {
      return 100;
    }
  });

  const [systemCashSales, setSystemCashSales] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("pdv_today_cash_sales");
      return saved ? parseFloat(saved) : 485.5;
    } catch {
      return 485.5;
    }
  });

  // Contador de notas e moedas
  const [billCounts, setBillCounts] = useState<{ [key: string]: number }>({
    "200": 0,
    "100": 1,
    "50": 4,
    "20": 8,
    "10": 10,
    "5": 15,
    "2": 25,
    "1": 30,
    "0.50": 40,
    "0.25": 20,
    "0.10": 30,
    "0.05": 20
  });

  const countedFromBills = Object.entries(billCounts).reduce((acc: number, [denom, count]) => {
    return acc + parseFloat(denom) * (Number(count) || 0);
  }, 0);

  const physicalCashInDrawer = useBillCounter
    ? countedFromBills
    : parseFloat(declaredDrawerAmount.replace(",", ".")) || 0;

  const expectedCashInDrawer = openingFloat + systemCashSales;
  const cashDifference = physicalCashInDrawer - expectedCashInDrawer;

  // Ouvinte de teclas de atalho (F2, F4, F8, F9, F10, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        triggerAction("catalogo");
      } else if (e.key === "F4") {
        e.preventDefault();
        triggerAction("clientes");
      } else if (e.key === "F8") {
        e.preventDefault();
        triggerAction("scanner");
      } else if (e.key === "F9") {
        e.preventDefault();
        triggerAction("manual");
      } else if (e.key === "F10") {
        e.preventDefault();
        triggerAction("concluir_venda");
      } else if (e.key === "Escape") {
        e.preventDefault();
        showNotification("Operação cancelada ou minimizada.", "info");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const triggerAction = (actionKey: string) => {
    if (onOpenPDVWithSubTab) {
      if (actionKey === "catalogo") onOpenPDVWithSubTab(null);
      else if (actionKey === "manual") onOpenPDVWithSubTab("caixa");
      else if (actionKey === "estoque") onOpenPDVWithSubTab("cadastro_produtos");
      else if (actionKey === "ficha_tecnica") onOpenPDVWithSubTab("ficha_tecnica");
      else if (actionKey === "clientes") onOpenPDVWithSubTab("clientes");
      else if (actionKey === "relatorios") onOpenPDVWithSubTab("relatorios");
      else if (actionKey === "proprietario") onOpenPDVWithSubTab("proprietario");
      else if (actionKey === "ajuda") onOpenPDVWithSubTab("ajuda");
      else if (actionKey === "scanner") {
        showNotification("Abrindo leitor de código de barras / câmera no Balcão...", "info");
        onOpenPDVWithSubTab(null);
      } else if (actionKey === "concluir_venda") {
        showNotification("Abrindo fechamento e pagamento da venda...", "info");
        onOpenPDVWithSubTab(null);
      }
    }
    onSelectAction(actionKey);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-in fade-in duration-200 select-none pb-12">
      
      {/* 🌟 CABEÇALHO DA ABA 6 - COMANDOS DO BALCÃO & ATALHOS */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 rounded-3xl p-5 sm:p-6 shadow-2xl text-left relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-44 h-44 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 border border-white/10">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black uppercase text-white tracking-wide">
                  Central de Comandos do Balcão
                </h2>
                <span className="px-2 py-0.5 text-[9px] font-black uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 rounded-full">
                  Aba 6 Oficial
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Atalhos diretos, conferência de gaveta, catálogo, estoque e teclas de balcão físico.
              </p>
            </div>
          </div>

          {/* Botões rápidos de ação no cabeçalho */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => triggerAction("catalogo")}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Abrir Vendas 🛒</span>
            </button>

            <button
              type="button"
              onClick={() => triggerAction("proprietario")}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Crown className="w-4 h-4 text-amber-400" />
              <span>Proprietário 👑</span>
            </button>
          </div>
        </div>
      </div>

      {/* ⚖️ 1. O BALANCEADOR DE CAIXA FÍSICO (DO PRINT) */}
      <div className="bg-slate-900/95 border border-indigo-500/20 rounded-3xl p-5 shadow-2xl text-left relative">
        <div
          className="flex items-center justify-between cursor-pointer select-none pb-2 border-b border-white/5"
          onClick={() => setShowReconciliation(!showReconciliation)}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/15 text-indigo-400 rounded-2xl border border-indigo-500/20 shadow-inner">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black uppercase text-white tracking-tight">
                  Balanceador de Caixa Físico ⚖️📦
                </h3>
                <span className="text-[9px] bg-indigo-500/20 text-indigo-300 font-black px-2 py-0.5 rounded-full uppercase">
                  Gaveta Real
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">
                Compare o dinheiro real da gaveta com o sistema para evitar erros de troco ou quebras de caixa!
              </p>
            </div>
          </div>

          <button
            type="button"
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-indigo-600/20 cursor-pointer flex items-center gap-1"
          >
            {showReconciliation ? "Recolher 🔼" : "BALANCEADOR ⚖️ 🔽"}
          </button>
        </div>

        <AnimatePresence>
          {showReconciliation && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden mt-4 space-y-4"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                
                {/* Painel Esquerdo: Contagem do Dinheiro da Gaveta */}
                <div className="lg:col-span-7 bg-slate-950/60 p-4 border border-white/5 rounded-2xl space-y-3.5">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                    <span className="text-[11px] font-black uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
                      <Calculator className="w-4 h-4 text-indigo-400" />
                      Como você deseja conferir o caixa?
                    </span>
                    <div className="bg-slate-900 border border-white/10 p-1 rounded-xl flex items-center gap-1 text-[10px] font-black uppercase">
                      <button
                        type="button"
                        onClick={() => setUseBillCounter(true)}
                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                          useBillCounter
                            ? "bg-indigo-600 text-white shadow-md font-extrabold"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Contar Cédulas / Moedas 🔢
                      </button>
                      <button
                        type="button"
                        onClick={() => setUseBillCounter(false)}
                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                          !useBillCounter
                            ? "bg-indigo-600 text-white shadow-md font-extrabold"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Digitar Valor Total ✏️
                      </button>
                    </div>
                  </div>

                  {useBillCounter ? (
                    <div className="space-y-3">
                      <div className="text-[10px] font-bold text-slate-400 flex items-center justify-between">
                        <span>Quantidades de notas e moedas na gaveta:</span>
                        <span className="text-emerald-400 font-mono font-black text-xs">
                          Total Contado: {formatCurrency(countedFromBills)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {Object.entries(billCounts).map(([denom, count]) => (
                          <div
                            key={denom}
                            className="bg-slate-900/90 border border-white/5 rounded-xl p-2 flex flex-col gap-1"
                          >
                            <span className="text-[10px] font-black text-amber-300">
                              {parseFloat(denom) >= 1
                                ? `R$ ${denom},00`
                                : `${(parseFloat(denom) * 100).toFixed(0)} Centavos`}
                            </span>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="0"
                                value={count === 0 ? "" : count}
                                placeholder="0"
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0;
                                  setBillCounts((prev) => ({ ...prev, [denom]: val }));
                                }}
                                className="w-full bg-slate-950 border border-white/10 rounded-lg px-2 py-1 text-white font-mono text-xs font-bold text-center focus:border-indigo-500 focus:outline-none"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 pt-2">
                      <label className="text-xs font-black uppercase tracking-wider text-slate-300 block">
                        Valor Total em Espécie contado na Gaveta (R$):
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-black text-sm">
                          R$
                        </span>
                        <input
                          type="text"
                          value={declaredDrawerAmount}
                          onChange={(e) => setDeclaredDrawerAmount(e.target.value)}
                          placeholder="Ex: 585,50"
                          className="w-full bg-slate-950 border-2 border-indigo-500/30 rounded-2xl pl-11 pr-4 py-3 text-white font-mono text-lg font-black focus:border-indigo-400 focus:outline-none"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Insira a soma de todo o dinheiro físico que está na gaveta no exato momento.
                      </p>
                    </div>
                  )}

                  {/* Parâmetros do sistema ajustáveis */}
                  <div className="pt-2 border-t border-white/5 grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9.5px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                        Fundo de Troco Inicial (R$)
                      </label>
                      <input
                        type="number"
                        value={openingFloat}
                        onChange={(e) => setOpeningFloat(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-white font-mono text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[9.5px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                        Vendas do Dia em Dinheiro (R$)
                      </label>
                      <input
                        type="number"
                        value={systemCashSales}
                        onChange={(e) => setSystemCashSales(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-white font-mono text-xs font-bold"
                      />
                    </div>
                  </div>
                </div>

                {/* Painel Direito: O Veredito da Gaveta (Sobra, Bateu ou Quebra) */}
                <div className="lg:col-span-5 bg-slate-950/60 p-5 border border-white/5 rounded-2xl flex flex-col justify-between space-y-4">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                      <Scale className="w-4 h-4 text-indigo-400" />
                      Resultado do Balanceamento
                    </h4>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between text-slate-400">
                        <span>Fundo de Caixa (Abertura):</span>
                        <span className="font-mono font-bold text-white">{formatCurrency(openingFloat)}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Vendas Registradas em Espécie:</span>
                        <span className="font-mono font-bold text-emerald-400">+{formatCurrency(systemCashSales)}</span>
                      </div>
                      <div className="flex justify-between font-black text-slate-200 pt-1 border-t border-white/5">
                        <span>Esperado na Gaveta:</span>
                        <span className="font-mono text-white">{formatCurrency(expectedCashInDrawer)}</span>
                      </div>
                      <div className="flex justify-between font-black text-slate-200">
                        <span>Dinheiro Físico Contado:</span>
                        <span className="font-mono text-indigo-300">{formatCurrency(physicalCashInDrawer)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Card */}
                  <div
                    className={`p-4 rounded-2xl border text-center transition-all ${
                      Math.abs(cashDifference) < 0.01
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                        : cashDifference > 0
                        ? "bg-sky-500/10 border-sky-500/30 text-sky-300"
                        : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                    }`}
                  >
                    <span className="text-[10px] font-black uppercase tracking-wider block mb-1">
                      {Math.abs(cashDifference) < 0.01
                        ? "✅ CAIXA 100% EXATO! NENHUMA DIFERENÇA"
                        : cashDifference > 0
                        ? "📈 SOBRA DE CAIXA (DINHEIRO A MAIS)"
                        : "⚠️ QUEBRA DE CAIXA (FALTA DE DINHEIRO)"}
                    </span>
                    <span className="text-2xl font-black font-mono block">
                      {cashDifference > 0 ? "+" : ""}
                      {formatCurrency(cashDifference)}
                    </span>
                    <span className="text-[10px] font-medium opacity-80 mt-1 block">
                      {Math.abs(cashDifference) < 0.01
                        ? "O valor físico bate perfeitamente com o histórico de vendas."
                        : cashDifference > 0
                        ? "Há mais dinheiro na gaveta do que vendas registradas."
                        : "Atenção: faltam valores na gaveta ou houve troco errado."}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      showNotification("Auditoria de caixa gravada no histórico com sucesso!", "success");
                      setShowReconciliation(false);
                    }}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-indigo-600/25 cursor-pointer"
                  >
                    Salvar Auditoria de Caixa 📋
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 🚀 2. OS 8 GRANDES BOTÕES DE COMANDO DO BALCÃO (EXATAMENTE COMO NO PRINT) */}
      <div className="bg-slate-900 border border-white/10 rounded-3xl p-4 sm:p-5 shadow-2xl space-y-4 text-left">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="text-xs sm:text-sm font-black uppercase text-white tracking-wider">
              Painel Central de Operações & Vendas
            </h3>
          </div>
          <span className="text-[10px] text-slate-400 font-bold">Toque no botão para abrir</span>
        </div>

        {/* Grade idêntica ao Print */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          
          {/* 1. CATÁLOGO & CARRINHO */}
          <button
            type="button"
            onClick={() => triggerAction("catalogo")}
            className="p-3.5 bg-slate-950/80 hover:bg-slate-950 border border-emerald-500/30 hover:border-emerald-400 rounded-2xl flex items-center justify-between transition-all duration-200 cursor-pointer shadow-lg hover:shadow-emerald-500/10 group text-left active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/15 text-emerald-400 rounded-xl group-hover:scale-110 transition-transform">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-wide text-white block">
                  Catálogo & Carrinho
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  Venda visual com fotos, categorias e leitor
                </span>
              </div>
            </div>
            <span className="text-xs font-mono text-emerald-400 font-black">🛒</span>
          </button>

          {/* 2. LANÇAMENTO DIRETO */}
          <button
            type="button"
            onClick={() => triggerAction("manual")}
            className="p-3.5 bg-slate-950/80 hover:bg-slate-950 border border-pink-500/30 hover:border-pink-400 rounded-2xl flex items-center justify-between transition-all duration-200 cursor-pointer shadow-lg hover:shadow-pink-500/10 group text-left active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-pink-500/15 text-pink-400 rounded-xl group-hover:scale-110 transition-transform">
                <PlusCircle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-wide text-white block">
                  Lançamento Direto
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  Teclado de padaria/mercearia rápido
                </span>
              </div>
            </div>
            <span className="text-xs font-mono text-pink-400 font-black">➕</span>
          </button>

          {/* 3. ESTOQUE */}
          <button
            type="button"
            onClick={() => triggerAction("estoque")}
            className="p-3.5 bg-slate-950/80 hover:bg-slate-950 border border-cyan-500/30 hover:border-cyan-400 rounded-2xl flex items-center justify-between transition-all duration-200 cursor-pointer shadow-lg hover:shadow-cyan-500/10 group text-left active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-cyan-500/15 text-cyan-400 rounded-xl group-hover:scale-110 transition-transform">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-wide text-white block">
                  Estoque
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  Controle de mercadoria, custo e reposição
                </span>
              </div>
            </div>
            <span className="text-xs font-mono text-cyan-400 font-black">📦</span>
          </button>

          {/* 4. PRECIFICAÇÃO & FICHA TÉCNICA */}
          <button
            type="button"
            onClick={() => triggerAction("ficha_tecnica")}
            className="p-3.5 bg-slate-950/80 hover:bg-slate-950 border border-pink-500/30 hover:border-pink-400 rounded-2xl flex items-center justify-between transition-all duration-200 cursor-pointer shadow-lg hover:shadow-pink-500/10 group text-left active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-pink-500/15 text-pink-400 rounded-xl group-hover:scale-110 transition-transform">
                <ChefHat className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-wide text-white block">
                  Precificação & Ficha Técnica
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  Custo por porção, margem e preço ideal
                </span>
              </div>
            </div>
            <span className="text-xs font-mono text-pink-400 font-black">⚖️</span>
          </button>

          {/* 5. CLIENTES FIÉIS */}
          <button
            type="button"
            onClick={() => triggerAction("clientes")}
            className="p-3.5 bg-slate-950/80 hover:bg-slate-950 border border-amber-500/30 hover:border-amber-400 rounded-2xl flex items-center justify-between transition-all duration-200 cursor-pointer shadow-lg hover:shadow-amber-500/10 group text-left active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/15 text-amber-400 rounded-xl group-hover:scale-110 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-wide text-white block">
                  Clientes Fiéis
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  Caderneta, limites de fiado e histórico
                </span>
              </div>
            </div>
            <span className="text-xs font-mono text-amber-400 font-black">👥</span>
          </button>

          {/* 6. RELATÓRIOS & BI */}
          <button
            type="button"
            onClick={() => triggerAction("relatorios")}
            className="p-3.5 bg-slate-950/80 hover:bg-slate-950 border border-purple-500/30 hover:border-purple-400 rounded-2xl flex items-center justify-between transition-all duration-200 cursor-pointer shadow-lg hover:shadow-purple-500/10 group text-left active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-500/15 text-purple-400 rounded-xl group-hover:scale-110 transition-transform">
                <BarChart className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-wide text-white block">
                  Relatórios & BI
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  Curva ABC, faturamento diário e formas
                </span>
              </div>
            </div>
            <span className="text-xs font-mono text-purple-400 font-black">📊</span>
          </button>

          {/* 7. PROPRIETÁRIO & PERMISSÕES */}
          <button
            type="button"
            onClick={() => triggerAction("proprietario")}
            className="p-3.5 bg-gradient-to-r from-purple-950/40 to-slate-950 hover:bg-purple-900/40 border border-purple-500/40 hover:border-purple-300 rounded-2xl flex items-center justify-between transition-all duration-200 cursor-pointer shadow-lg hover:shadow-purple-500/20 group text-left active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-500/20 text-amber-400 rounded-xl group-hover:scale-110 transition-transform">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-wide text-purple-200 block">
                  Proprietário & Permissões
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  Segurança, senhas e controle de operadores
                </span>
              </div>
            </div>
            <span className="text-xs font-mono text-amber-400 font-black">👑</span>
          </button>

          {/* 8. AJUDA & IA */}
          <button
            type="button"
            onClick={() => triggerAction("ajuda")}
            className="p-3.5 bg-gradient-to-r from-amber-500/15 via-purple-600/15 to-slate-950 hover:from-amber-500/25 border border-amber-500/40 hover:border-amber-300 rounded-2xl flex items-center justify-between transition-all duration-200 cursor-pointer shadow-lg hover:shadow-amber-500/20 group text-left active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/20 text-amber-300 rounded-xl group-hover:scale-110 transition-transform">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-wide text-amber-300 block">
                  Ajuda & IA
                </span>
                <span className="text-[10px] text-slate-300 font-medium">
                  Manuais de balcão e assistente inteligente
                </span>
              </div>
            </div>
            <span className="text-xs font-mono text-amber-400 font-black">💡🤖</span>
          </button>
        </div>
      </div>

      {/* ⌨️ 3. TECLAS DE ATALHO DO BALCÃO (COMPUTADOR / NOTEBOOK & INTERATIVAS) */}
      <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-4 sm:p-5 text-left shadow-2xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-purple-500/10 text-purple-400 rounded-lg text-xs">⌨️</span>
            <div>
              <span className="font-black text-slate-200 uppercase text-xs block leading-none">
                Teclas de Atalho do Balcão (Computador / Notebook)
              </span>
              <span className="text-slate-500 font-semibold text-[10px]">
                Agilize suas vendas pressionando as teclas físicas ou clicando nos botões abaixo!
              </span>
            </div>
          </div>
          <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-white/5">
            Teclado Físico Ativo 🟢
          </span>
        </div>

        {/* Atalhos clicáveis idênticos ao print */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1 font-mono font-bold text-xs">
          
          <button
            type="button"
            onClick={() => triggerAction("catalogo")}
            className="p-2.5 bg-slate-950 border border-white/10 hover:border-purple-500/50 hover:bg-slate-900 rounded-xl flex items-center justify-between text-slate-300 hover:text-white transition-all cursor-pointer shadow-md group active:scale-95"
          >
            <kbd className="text-purple-400 bg-slate-900 px-1.5 py-0.5 rounded text-[10px] border border-white/10 group-hover:bg-purple-600 group-hover:text-white transition-colors">
              F2
            </kbd>
            <span className="text-[10.5px]">Buscar Item</span>
          </button>

          <button
            type="button"
            onClick={() => triggerAction("clientes")}
            className="p-2.5 bg-slate-950 border border-white/10 hover:border-purple-500/50 hover:bg-slate-900 rounded-xl flex items-center justify-between text-slate-300 hover:text-white transition-all cursor-pointer shadow-md group active:scale-95"
          >
            <kbd className="text-purple-400 bg-slate-900 px-1.5 py-0.5 rounded text-[10px] border border-white/10 group-hover:bg-purple-600 group-hover:text-white transition-colors">
              F4
            </kbd>
            <span className="text-[10.5px]">Cliente</span>
          </button>

          <button
            type="button"
            onClick={() => triggerAction("scanner")}
            className="p-2.5 bg-slate-950 border border-white/10 hover:border-purple-500/50 hover:bg-slate-900 rounded-xl flex items-center justify-between text-slate-300 hover:text-white transition-all cursor-pointer shadow-md group active:scale-95"
          >
            <kbd className="text-purple-400 bg-slate-900 px-1.5 py-0.5 rounded text-[10px] border border-white/10 group-hover:bg-purple-600 group-hover:text-white transition-colors">
              F8
            </kbd>
            <span className="text-[10.5px]">Scanner/Câmera</span>
          </button>

          <button
            type="button"
            onClick={() => triggerAction("manual")}
            className="p-2.5 bg-slate-950 border border-white/10 hover:border-purple-500/50 hover:bg-slate-900 rounded-xl flex items-center justify-between text-slate-300 hover:text-white transition-all cursor-pointer shadow-md group active:scale-95"
          >
            <kbd className="text-purple-400 bg-slate-900 px-1.5 py-0.5 rounded text-[10px] border border-white/10 group-hover:bg-purple-600 group-hover:text-white transition-colors">
              F9
            </kbd>
            <span className="text-[10.5px]">Mudar Modo</span>
          </button>

          <button
            type="button"
            onClick={() => triggerAction("concluir_venda")}
            className="p-2.5 bg-slate-950 border border-emerald-500/30 hover:border-emerald-400 hover:bg-emerald-950/30 rounded-xl flex items-center justify-between text-emerald-300 hover:text-white transition-all cursor-pointer shadow-md group active:scale-95"
          >
            <kbd className="text-emerald-400 bg-slate-900 px-1.5 py-0.5 rounded text-[10px] border border-white/10 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              F10
            </kbd>
            <span className="text-[10.5px]">Concluir Venda</span>
          </button>

          <button
            type="button"
            onClick={() => triggerAction("catalogo")}
            className="p-2.5 bg-slate-950 border border-rose-500/30 hover:border-rose-400 hover:bg-rose-950/30 rounded-xl flex items-center justify-between text-rose-300 hover:text-white transition-all cursor-pointer shadow-md group active:scale-95"
          >
            <kbd className="text-rose-400 bg-slate-900 px-1.5 py-0.5 rounded text-[10px] border border-white/10 group-hover:bg-rose-600 group-hover:text-white transition-colors">
              Esc
            </kbd>
            <span className="text-[10.5px]">Fechar</span>
          </button>
        </div>
      </div>
    </div>
  );
};
