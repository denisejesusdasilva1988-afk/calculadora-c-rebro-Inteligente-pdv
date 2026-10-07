import React, { useState } from "react";
import {
  Calculator,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  DollarSign,
  Info,
  XCircle,
  Percent,
  Coins,
  Scale,
  ChefHat,
  Wheat,
  Beef,
  ShoppingBag
} from "lucide-react";
import { motion } from "motion/react";
import { DigitalScaleFoodPricingCalculator } from "./pricing/DigitalScaleFoodPricingCalculator";
import { BakeryPricingCalculator } from "./pricing/BakeryPricingCalculator";
import { ButcherPricingCalculator } from "./pricing/ButcherPricingCalculator";
import { RetailOverheadCalculator } from "./pricing/RetailOverheadCalculator";
import { parseFlexibleNumber } from "./pricing/SmartNumericInput";

export function PricingCalculator() {
  const [calculatorType, setCalculatorType] = useState<"culinary" | "commercial" | "bakery" | "butcher" | "retail">("culinary");
  const [mode, setMode] = useState<"recommended" | "validate">("recommended");
  const [productName, setProductName] = useState("");
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const showNotification = (msg: string, type: "success" | "error" | "info" | "warning") => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3500);
  };
  
  // Tab 1 state (Recommended markup)
  const [costPrice, setCostPrice] = useState("10,00");
  const [expensesPct, setExpensesPct] = useState("15");
  const [profitPct, setProfitPct] = useState("30");

  // Tab 2 state (Validate desired selling price)
  const [validateSellingPrice, setValidateSellingPrice] = useState("20,00");
  const [validateFixedExpenses, setValidateFixedExpenses] = useState("2,00");
  const [validateExpensesPct, setValidateExpensesPct] = useState("5");
  const [validateDesiredProfitPct, setValidateDesiredProfitPct] = useState("20");

  const parsedCost = parseFlexibleNumber(costPrice);

  // Math for Tab 1 (Recommended Price)
  const parsedExpenses = parseFlexibleNumber(expensesPct);
  const parsedProfit = parseFlexibleNumber(profitPct);
  const totalDeductions = parsedExpenses + parsedProfit;

  // Formula 1: Simple Additive (INCORRECT - margin is actually much lower)
  const simplePrice = parsedCost * (1 + parsedProfit / 100);
  const realMarginOfSimplePrice =
    simplePrice > 0
      ? ((simplePrice - parsedCost - simplePrice * (parsedExpenses / 100)) / simplePrice) * 100
      : 0;

  // Formula 2: Markup/Contribution Margin (CORRECT - guarantees desired profit margin)
  const divisor = 1 - totalDeductions / 100;
  const correctPrice = divisor > 0 ? parsedCost / divisor : 0;

  // Financial breakdown for recommended price
  const expensesCash = correctPrice * (parsedExpenses / 100);
  const profitCash = correctPrice * (parsedProfit / 100);

  // Math for Tab 2 (Validation of desired selling price)
  const parsedTargetSellingPrice = parseFlexibleNumber(validateSellingPrice);
  const parsedValidateFixedExpenses = parseFlexibleNumber(validateFixedExpenses);
  const parsedValidateExpensesPct = parseFlexibleNumber(validateExpensesPct);
  const parsedValidateDesiredProfitPct = parseFlexibleNumber(validateDesiredProfitPct);

  const validateExpensesCash = parsedTargetSellingPrice * (parsedValidateExpensesPct / 100);
  const totalOutflow = parsedCost + validateExpensesCash + parsedValidateFixedExpenses;
  const netProfit = parsedTargetSellingPrice - totalOutflow;
  const realMarginPct = parsedTargetSellingPrice > 0 ? (netProfit / parsedTargetSellingPrice) * 100 : 0;

  // Operational costs
  const operationalCostsValue = parsedCost + parsedValidateFixedExpenses + validateExpensesCash;

  // Recommended price in validation mode (for a healthy customized profit margin)
  const validateDivisor = 1 - (parsedValidateExpensesPct + parsedValidateDesiredProfitPct) / 100;
  const suggestedPrice = validateDivisor > 0 ? (parsedCost + parsedValidateFixedExpenses) / validateDivisor : 0;

  // Determine status of desired price in Tab 2
  let validationStatus: "error" | "warning" | "success" = "success";
  if (netProfit <= 0) {
    validationStatus = "error";
  } else if (realMarginPct < 15) {
    validationStatus = "warning";
  }

  return (
    <div className="space-y-6">
      {/* SELETOR MASTER DE TIPO DE PRECIFICAÇÃO */}
      <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-3 sm:p-4 max-w-5xl mx-auto shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3 px-1">
          <div>
            <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider block">
              Central de Inteligência de Preços & Balança
            </span>
            <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <Calculator className="w-5 h-5 text-amber-400" />
              Calculadoras de Precificação Disponíveis:
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            Escolha o ramo do seu negócio
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {/* 1. Gastronomia & Balança Digital (Default) */}
          <button
            type="button"
            onClick={() => setCalculatorType("culinary")}
            className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between gap-1.5 cursor-pointer col-span-2 sm:col-span-1 ${
              calculatorType === "culinary"
                ? "bg-gradient-to-br from-emerald-600/30 to-teal-700/20 border-emerald-400 text-white ring-1 ring-emerald-400/50 shadow-lg shadow-emerald-950/40"
                : "bg-slate-950/80 border-white/5 text-slate-400 hover:bg-slate-900 hover:text-white"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xl">🥟</span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[8.5px] font-black">
                BALANÇA
              </span>
            </div>
            <div className="text-xs font-black leading-tight">
              Balança & Gastronomia
            </div>
            <div className="text-[9.5px] text-slate-400">
              Coxinhas, Pastel, Aipim, Bolos & Sobras
            </div>
          </button>

          {/* 2. Markup Comercial */}
          <button
            type="button"
            onClick={() => setCalculatorType("commercial")}
            className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between gap-1.5 cursor-pointer ${
              calculatorType === "commercial"
                ? "bg-gradient-to-br from-amber-600/30 to-amber-700/20 border-amber-400 text-white ring-1 ring-amber-400/50 shadow-lg shadow-amber-950/40"
                : "bg-slate-950/80 border-white/5 text-slate-400 hover:bg-slate-900 hover:text-white"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xl">📊</span>
              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[8.5px] font-black">
                MARKUP
              </span>
            </div>
            <div className="text-xs font-black leading-tight">
              Markup Comercial
            </div>
            <div className="text-[9.5px] text-slate-400">
              Validador de Margem Bruta e Líquida
            </div>
          </button>

          {/* 3. Padaria & Fornada */}
          <button
            type="button"
            onClick={() => setCalculatorType("bakery")}
            className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between gap-1.5 cursor-pointer ${
              calculatorType === "bakery"
                ? "bg-gradient-to-br from-orange-600/30 to-amber-700/20 border-orange-400 text-white ring-1 ring-orange-400/50 shadow-lg shadow-orange-950/40"
                : "bg-slate-950/80 border-white/5 text-slate-400 hover:bg-slate-900 hover:text-white"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xl">🥖</span>
              <span className="px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 text-[8.5px] font-black">
                PADARIA
              </span>
            </div>
            <div className="text-xs font-black leading-tight">
              Padaria & Fornada
            </div>
            <div className="text-[9.5px] text-slate-400">
              Pães, Quebra de Forno & Café
            </div>
          </button>

          {/* 4. Açougue & Desossa */}
          <button
            type="button"
            onClick={() => setCalculatorType("butcher")}
            className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between gap-1.5 cursor-pointer ${
              calculatorType === "butcher"
                ? "bg-gradient-to-br from-rose-600/30 to-red-700/20 border-rose-400 text-white ring-1 ring-rose-400/50 shadow-lg shadow-rose-950/40"
                : "bg-slate-950/80 border-white/5 text-slate-400 hover:bg-slate-900 hover:text-white"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xl">🥩</span>
              <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[8.5px] font-black">
                AÇOUGUE
              </span>
            </div>
            <div className="text-xs font-black leading-tight">
              Açougue & Desossa
            </div>
            <div className="text-[9.5px] text-slate-400">
              Traseiro, Dianteiro & Cortes
            </div>
          </button>

          {/* 5. Mercearia & Revenda */}
          <button
            type="button"
            onClick={() => setCalculatorType("retail")}
            className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between gap-1.5 cursor-pointer ${
              calculatorType === "retail"
                ? "bg-gradient-to-br from-sky-600/30 to-blue-700/20 border-sky-400 text-white ring-1 ring-sky-400/50 shadow-lg shadow-sky-950/40"
                : "bg-slate-950/80 border-white/5 text-slate-400 hover:bg-slate-900 hover:text-white"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xl">🛒</span>
              <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 text-[8.5px] font-black">
                REVENDA
              </span>
            </div>
            <div className="text-xs font-black leading-tight">
              Mercearia & Revenda
            </div>
            <div className="text-[9.5px] text-slate-400">
              Sacolas, Frete & Custos Ocultos
            </div>
          </button>
        </div>
      </div>

      {/* RENDERIZAÇÃO DO MODO SELECIONADO */}
      {calculatorType === "culinary" && (
        <DigitalScaleFoodPricingCalculator />
      )}

      {calculatorType === "bakery" && (
        <BakeryPricingCalculator showNotification={showNotification} />
      )}

      {calculatorType === "butcher" && (
        <ButcherPricingCalculator showNotification={showNotification} />
      )}

      {calculatorType === "retail" && (
        <RetailOverheadCalculator showNotification={showNotification} />
      )}

      {calculatorType === "commercial" && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          className="bg-slate-950 p-6 sm:p-8 rounded-3xl border border-white/10 space-y-8 text-white max-w-4xl mx-auto text-left"
        >
          {/* HEADER SECTION */}
          <div className="border-b border-white/10 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-amber-400 flex items-center gap-2 font-sans uppercase tracking-tight">
                <Calculator className="w-6 h-6 text-amber-400" />
                Precificação Comercial Inteligente
              </h2>
              <p className="text-sm text-slate-300 mt-2 font-medium leading-relaxed max-w-2xl">
                Sabe se está ganhando ou perdendo dinheiro ao precificar? Calcule o markup ideal ou valide se o seu preço de venda atual é lucrativo ou perigoso.
              </p>
            </div>
            <div className="bg-amber-400/10 border border-amber-400/20 px-4 py-2.5 rounded-2xl flex items-center gap-2 shrink-0">
              <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
              <span className="text-xs font-black uppercase text-amber-300 tracking-wider">
                {mode === "recommended" ? "Modo Planejar Ideal" : "Modo Validar Preço"}
              </span>
            </div>
          </div>

          {/* TABS SELECTOR */}
          <div className="bg-slate-900 border border-white/5 rounded-2xl p-1.5 flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => setMode("recommended")}
              className={`flex-1 py-3 px-4 rounded-xl font-black font-sans text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                mode === "recommended"
                  ? "bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/10"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              1. Descobrir Preço Ideal (Markup)
            </button>
            <button
              onClick={() => setMode("validate")}
              className={`flex-1 py-3 px-4 rounded-xl font-black font-sans text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                mode === "validate"
                  ? "bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/10"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              2. Validar meu Preço de Venda
            </button>
          </div>

          {/* GUIA / EXPLANATORY BOX */}
          <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-5 space-y-3.5">
            <h3 className="text-sm font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-400" />
              {mode === "recommended"
                ? "Por que o Markup protege sua margem de lucro?"
                : "Por que validar o preço de venda desejado?"}
            </h3>
            <p className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed">
              {mode === "recommended" ? (
                <>
                  Muitos comerciantes calculam o preço somando apenas a porcentagem de lucro em cima do custo. 
                  <strong> Isto é um erro grave!</strong> Despesas variáveis (como impostos, taxas de maquininhas de cartão, embalagens) incidem sobre o <strong>preço de venda final</strong>, não sobre o custo. 
                  A fórmula Markup garante que todas as taxas sejam pagas e o seu lucro líquido fique integralmente no seu bolso.
                </>
              ) : (
                <>
                  Você já tem em mente por quanto quer vender um produto, mas quer ter certeza de que o valor é seguro?
                  Insira o custo do produto, as despesas fixas (embalagem, frete) e variáveis (taxas de cartão, impostos) e o seu preço pretendido.
                  Nossa inteligência financeira calculará se o seu preço está <strong>Correto (Lucrativo)</strong> ou <strong>Incorreto (Dando Prejuízo)</strong>.
                </>
              )}
            </p>
          </div>

          {/* FORM INPUTS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-900/40 p-6 rounded-2xl border border-white/5">
            {/* COMMON BLOCK: DADOS DO PRODUTO */}
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-300">1. Dados do Produto</h3>
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-200 uppercase block">Nome do Produto (Opcional):</label>
                <input
                  type="text"
                  placeholder="Ex: Coca-cola Lata, Camiseta Algodão"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-bold outline-none uppercase placeholder:text-slate-600 focus:border-amber-400 transition-all"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200 uppercase block">💰 Custo de Compra (R$):</label>
                  {costPrice && (
                    <button
                      type="button"
                      onClick={() => setCostPrice("")}
                      className="text-[10px] text-slate-500 hover:text-amber-400 font-bold px-1"
                    >
                      ✕ Limpar
                    </button>
                  )}
                </div>
                <span className="text-[11px] text-slate-400 block leading-tight">Valor bruto pago ao fornecedor ou matéria-prima</span>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">R$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={costPrice}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setCostPrice(e.target.value)}
                    placeholder="0,00"
                    className="w-full bg-slate-900 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-base font-mono font-bold text-white outline-none focus:border-amber-400 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* MODE SPECIFIC INPUTS */}
            {mode === "recommended" ? (
              <div className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-300">2. Taxas & Lucro Desejado</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-200 uppercase block">💳 Taxas e Despesas (%):</label>
                      {expensesPct && (
                        <button
                          type="button"
                          onClick={() => setExpensesPct("")}
                          className="text-[10px] text-slate-500 hover:text-amber-400 font-bold px-1"
                        >
                          ✕ Limpar
                        </button>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 block leading-tight">Cartão, imposto, frete</span>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={expensesPct}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => setExpensesPct(e.target.value)}
                        placeholder="0"
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-base font-mono font-bold text-white outline-none focus:border-amber-400 transition-all"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">%</span>
                    </div>
                    {/* Quick chips */}
                    <div className="flex gap-1 pt-0.5">
                      {["0", "5", "10", "15"].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setExpensesPct(p)}
                          className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                            expensesPct === p ? "bg-amber-400 text-slate-950" : "bg-slate-800 text-slate-400 hover:text-white"
                          }`}
                        >
                          {p}%
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-200 uppercase block">📈 Margem Líquida (%):</label>
                      {profitPct && (
                        <button
                          type="button"
                          onClick={() => setProfitPct("")}
                          className="text-[10px] text-slate-500 hover:text-amber-400 font-bold px-1"
                        >
                          ✕ Limpar
                        </button>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 block leading-tight">Lucro real que sobra no bolso</span>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={profitPct}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => setProfitPct(e.target.value)}
                        placeholder="0"
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-base font-mono font-bold text-white outline-none focus:border-amber-400 transition-all"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">%</span>
                    </div>
                    {/* Quick chips */}
                    <div className="flex gap-1 pt-0.5">
                      {["20", "30", "50", "100"].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setProfitPct(p)}
                          className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                            profitPct === p ? "bg-amber-400 text-slate-950" : "bg-slate-800 text-slate-400 hover:text-white"
                          }`}
                        >
                          {p}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-white/5">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    * A soma das despesas variáveis ({parsedExpenses}%) com a margem líquida ({parsedProfit}%) totaliza <strong className="text-white">{totalDeductions}%</strong> de deduções do preço final de venda.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-300">2. Estrutura Pretendida</h3>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200 uppercase block">🏷️ Preço de Venda Desejado (R$):</label>
                    {validateSellingPrice && (
                      <button
                        type="button"
                        onClick={() => setValidateSellingPrice("")}
                        className="text-[10px] text-slate-500 hover:text-amber-400 font-bold px-1"
                      >
                        ✕ Limpar
                      </button>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 block leading-tight">O valor que você pretende colocar na etiqueta</span>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">R$</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={validateSellingPrice}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setValidateSellingPrice(e.target.value)}
                      placeholder="0,00"
                      className="w-full bg-slate-900 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-base font-mono font-bold text-white outline-none focus:border-amber-400 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-200 uppercase block">📦 Custos Fixos (R$):</label>
                      {validateFixedExpenses && (
                        <button
                          type="button"
                          onClick={() => setValidateFixedExpenses("")}
                          className="text-[10px] text-slate-500 hover:text-amber-400 font-bold px-1"
                        >
                          ✕ Limpar
                        </button>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 block leading-tight">Embalagem, frete fixo</span>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={validateFixedExpenses}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => setValidateFixedExpenses(e.target.value)}
                        placeholder="0,00"
                        className="w-full bg-slate-900 border border-white/10 rounded-xl pl-8 pr-3 py-3 text-base font-mono font-bold text-white outline-none focus:border-amber-400 transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-200 uppercase block">💳 Taxas Cartão (%):</label>
                      {validateExpensesPct && (
                        <button
                          type="button"
                          onClick={() => setValidateExpensesPct("")}
                          className="text-[10px] text-slate-500 hover:text-amber-400 font-bold px-1"
                        >
                          ✕ Limpar
                        </button>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 block leading-tight">Taxa maquininha/impostos</span>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={validateExpensesPct}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => setValidateExpensesPct(e.target.value)}
                        placeholder="0"
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-base font-mono font-bold text-white outline-none focus:border-amber-400 transition-all"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">%</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200 uppercase block">🎯 Margem Desejada Mínima (%):</label>
                    {validateDesiredProfitPct && (
                      <button
                        type="button"
                        onClick={() => setValidateDesiredProfitPct("")}
                        className="text-[10px] text-slate-500 hover:text-amber-400 font-bold px-1"
                      >
                        ✕ Limpar
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={validateDesiredProfitPct}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setValidateDesiredProfitPct(e.target.value)}
                      placeholder="0"
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-base font-mono font-bold text-white outline-none focus:border-amber-400 transition-all"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">%</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RESULTS DISPLAY */}
          {mode === "recommended" ? (
            <div className="space-y-6">
              {/* COMPARAÇÃO LADO A LADO */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. SOMA SIMPLES (ERRADO) */}
                <div className="bg-rose-950/20 border-2 border-rose-500/30 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-rose-400 uppercase tracking-widest flex items-center gap-1.5">
                        <XCircle className="w-4 h-4 text-rose-400" />
                        Soma Simples (Ilusão)
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-black uppercase">
                        Perigo de Prejuízo
                      </span>
                    </div>

                    <div>
                      <div className="text-3xl font-black text-white mono-display">
                        R$ {simplePrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </div>
                      <span className="text-xs text-slate-400 mt-1 block">
                        Custo (R$ {parsedCost.toFixed(2)}) + {parsedProfit}% sobre o custo
                      </span>
                    </div>

                    <div className="bg-slate-950/80 p-3 rounded-xl border border-rose-500/20 space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Você achava que lucrava:</span>
                        <strong className="text-slate-300">{parsedProfit}%</strong>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-rose-400 font-bold">Margem Líquida Real:</span>
                        <strong className="text-rose-400 text-sm font-mono font-black">
                          {realMarginOfSimplePrice.toFixed(1)}%
                        </strong>
                      </div>
                    </div>

                    <p className="text-xs text-rose-200/80 leading-relaxed">
                      Ao calcular assim, as taxas de cartão ({parsedExpenses}%) comem quase todo o seu lucro. Você perde dinheiro sem perceber.
                    </p>
                  </div>
                </div>

                {/* 2. MARKUP REAL (CORRETO) */}
                <div className="bg-emerald-950/30 border-2 border-emerald-500/50 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between shadow-2xl shadow-emerald-950/40">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        Fórmula Markup (Correto)
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase">
                        Margem Garantida
                      </span>
                    </div>

                    <div>
                      <div className="text-3xl font-black text-emerald-400 mono-display">
                        R$ {correctPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </div>
                      <span className="text-xs text-emerald-300/80 mt-1 block font-medium">
                        Preço sugerido para garantir {parsedProfit}% limpo no bolso
                      </span>
                    </div>

                    <div className="bg-slate-950/80 p-3 rounded-xl border border-emerald-500/20 space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Custo do Produto:</span>
                        <strong className="text-slate-300">R$ {parsedCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Taxas ({parsedExpenses}%):</span>
                        <strong className="text-rose-400">R$ {expensesCash.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>
                      </div>
                      <div className="flex justify-between items-center text-xs border-t border-white/5 pt-1.5">
                        <span className="text-emerald-400 font-bold">Lucro Líquido ({parsedProfit}%):</span>
                        <strong className="text-emerald-400 text-sm font-mono font-black">
                          R$ {profitCash.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </strong>
                      </div>
                    </div>

                    <p className="text-xs text-emerald-200/80 leading-relaxed font-medium">
                      Esta fórmula garante que o valor cobrado cubra o custo original, pague todas as despesas e taxas de cartão, e ainda entregue os {parsedProfit}% líquidos para a sua conta.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* TAB 2: VALIDAR PREÇO DE VENDA */
            <div className="space-y-6">
              <div className={`p-6 rounded-2xl border-2 transition-all ${
                validationStatus === "error"
                  ? "bg-rose-950/30 border-rose-500/50 text-rose-200"
                  : validationStatus === "warning"
                  ? "bg-amber-950/30 border-amber-500/50 text-amber-200"
                  : "bg-emerald-950/30 border-emerald-500/50 text-emerald-200"
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4 mb-4">
                  <div className="flex items-center gap-3">
                    {validationStatus === "error" ? (
                      <XCircle className="w-8 h-8 text-rose-400 shrink-0" />
                    ) : validationStatus === "warning" ? (
                      <AlertTriangle className="w-8 h-8 text-amber-400 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />
                    )}
                    <div>
                      <span className="text-xs font-black uppercase tracking-widest block">Resultado da Análise</span>
                      <h4 className="text-lg font-black text-white">
                        {validationStatus === "error"
                          ? "Preço Incorreto (Dando Prejuízo Real!)"
                          : validationStatus === "warning"
                          ? "Preço Perigoso (Margem Muito Baixa)"
                          : "Preço Correto e Lucrativo!"}
                      </h4>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-400 uppercase font-bold block">Preço Analisado:</span>
                    <strong className="text-2xl font-black text-white mono-display">
                      R$ {parsedTargetSellingPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                </div>

                <div className="space-y-2 text-xs sm:text-sm">
                  {validationStatus === "error" && (
                    <>
                      <p>
                        Atenção! Ao vender por <strong>R$ {parsedTargetSellingPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>, 
                        o valor recebido não é suficiente para pagar o custo de compra (R$ {parsedCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}), 
                        as despesas fixas (R$ {parsedValidateFixedExpenses.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}) 
                        e as taxas variáveis de cartão (R$ {validateExpensesCash.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}).
                      </p>
                      <p className="font-bold text-rose-300">
                        Você está tendo um PREJUÍZO de R$ {Math.abs(netProfit).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} em cada unidade vendida!
                      </p>
                    </>
                  )}

                  {validationStatus === "warning" && (
                    <>
                      <p>
                        Cuidado! O preço é suficiente para cobrir custos, mas o lucro líquido que sobra é de apenas <strong>{realMarginPct.toFixed(1)}% (R$ {netProfit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })})</strong>.
                      </p>
                      <p>
                        Uma margem menor que 15% deixa seu negócio vulnerável a pequenas variações de preços ou perdas.
                      </p>
                    </>
                  )}

                  {validationStatus === "success" && (
                    <>
                      <p>
                        Parabéns! O preço de <strong>R$ {parsedTargetSellingPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong> é saudável e cobre todos os custos, despesas fixas e taxas de cartão, 
                        entregando uma margem líquida real de <strong>{realMarginPct.toFixed(1)}% (R$ {netProfit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} de lucro limpo por unidade)</strong>.
                      </p>
                    </>
                  )}
                </div>

                {validateDivisor > 0 && (
                  <div className={`p-3 rounded-xl border text-xs mt-4 ${
                    parsedTargetSellingPrice < suggestedPrice 
                      ? "bg-rose-500/10 border-rose-500/20 text-rose-300"
                      : "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                  }`}>
                    {parsedTargetSellingPrice < suggestedPrice ? (
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <div>
                          <strong>Aviso:</strong> Seu preço atual (R$ {parsedTargetSellingPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}) está <strong>abaixo</strong> da sugestão ideal para lucrar {parsedValidateDesiredProfitPct}% por uma diferença de <strong className="text-rose-350">R$ {(suggestedPrice - parsedTargetSellingPrice).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>.
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <strong>Excelente!</strong> Seu preço pretendido (R$ {parsedTargetSellingPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}) é <strong>{parsedTargetSellingPrice === suggestedPrice ? "exatamente igual" : "superior"}</strong> à sugestão ideal para lucrar {parsedValidateDesiredProfitPct}%.
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* DETALHAMENTO FINANCEIRO DO PREÇO PLANEJADO */}
          <div className="bg-slate-900 p-5 sm:p-6 rounded-2xl border border-white/10 space-y-4 text-left">
            <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              Raio-X de Custos para o Preço de R$ {parsedTargetSellingPrice.toFixed(2).replace(".", ",")}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-white/5 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Custo de Compra (Fixo)</span>
                <strong className="text-slate-200 text-lg mono-display block">R$ {parsedCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>
                <p className="text-[10px] text-slate-500 leading-tight">{(parsedTargetSellingPrice > 0 ? (parsedCost / parsedTargetSellingPrice) * 100 : 0).toFixed(1)}% do preço final</p>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-white/5 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Taxas Variáveis ({parsedValidateExpensesPct}%)</span>
                <strong className="text-rose-400 text-lg mono-display block">R$ {validateExpensesCash.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>
                <p className="text-[10px] text-slate-500 leading-tight">Taxas de maquininha, impostos</p>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-white/5 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Custo Fixo (Embalagem/Frete)</span>
                <strong className="text-rose-400 text-lg mono-display block">R$ {parsedValidateFixedExpenses.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>
                <p className="text-[10px] text-slate-500 leading-tight">{(parsedTargetSellingPrice > 0 ? (parsedValidateFixedExpenses / parsedTargetSellingPrice) * 100 : 0).toFixed(1)}% do preço final</p>
              </div>

              <div className={`bg-slate-950 p-4 rounded-xl border space-y-1 ${netProfit > 0 ? "border-emerald-500/20" : "border-rose-500/20"}`}>
                <span className={`text-[10px] uppercase font-bold block ${netProfit > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {netProfit > 0 ? "Lucro Líquido Real" : "Prejuízo Real"}
                </span>
                <strong className={`text-lg mono-display block ${netProfit > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  R$ {netProfit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </strong>
                <p className="text-[10px] text-slate-500 leading-tight">{realMarginPct.toFixed(1)}% de margem final</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
