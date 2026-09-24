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
  Coins
} from "lucide-react";
import { motion } from "motion/react";

// Helper to parse localized PT-BR currency input to numeric floats
function parsePortugueseNumber(valStr: string): number {
  if (!valStr) return 0;
  const clean = valStr
    .replace(/[^\d,.-]/g, "") // remove symbols like R$
    .replace(/\./g, "")      // remove thousands separators
    .replace(",", ".");      // change decimals from comma to dot
  return parseFloat(clean) || 0;
}

export function PricingCalculator() {
  const [mode, setMode] = useState<"recommended" | "validate">("recommended");
  const [productName, setProductName] = useState("");
  
  // Tab 1 state (Recommended markup)
  const [costPrice, setCostPrice] = useState("10,00");
  const [expensesPct, setExpensesPct] = useState("15");
  const [profitPct, setProfitPct] = useState("30");

  // Tab 2 state (Validate desired selling price)
  const [validateSellingPrice, setValidateSellingPrice] = useState("20,00");
  const [validateFixedExpenses, setValidateFixedExpenses] = useState("2,00");
  const [validateExpensesPct, setValidateExpensesPct] = useState("5");
  const [validateDesiredProfitPct, setValidateDesiredProfitPct] = useState("20");

  const parsedCost = parsePortugueseNumber(costPrice);

  // Math for Tab 1 (Recommended Price)
  const parsedExpenses = parseFloat(expensesPct) || 0;
  const parsedProfit = parseFloat(profitPct) || 0;
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
  const parsedTargetSellingPrice = parsePortugueseNumber(validateSellingPrice);
  const parsedValidateFixedExpenses = parsePortugueseNumber(validateFixedExpenses);
  const parsedValidateExpensesPct = parseFloat(validateExpensesPct) || 0;
  const parsedValidateDesiredProfitPct = parseFloat(validateDesiredProfitPct) || 0;

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
            <label className="text-xs font-bold text-slate-200 uppercase block">💰 Custo de Compra (R$):</label>
            <span className="text-[11px] text-slate-400 block leading-tight">Valor bruto pago ao fornecedor ou matéria-prima</span>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">R$</span>
              <input
                type="text"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
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
                <label className="text-xs font-bold text-slate-200 uppercase block">💳 Taxas e Despesas (%):</label>
                <span className="text-[10px] text-slate-400 block leading-tight">Cartão, imposto, comissão, frete</span>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="90"
                    value={expensesPct}
                    onChange={(e) => setExpensesPct(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-base font-mono font-bold text-white outline-none focus:border-amber-400 transition-all"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">%</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-200 uppercase block">📈 Margem Líquida (%):</label>
                <span className="text-[10px] text-slate-400 block leading-tight">Lucro real que sobra limpo no bolso</span>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={profitPct}
                    onChange={(e) => setProfitPct(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-base font-mono font-bold text-white outline-none focus:border-amber-400 transition-all"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">%</span>
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
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-300">2. Taxas & Preço de Venda Pretendido</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-200 uppercase block">💳 Taxas Variáveis (%):</label>
                <span className="text-[10px] text-slate-400 block leading-tight">Imposto, taxa de cartão ou comissão</span>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="90"
                    value={validateExpensesPct}
                    onChange={(e) => setValidateExpensesPct(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-base font-mono font-bold text-white outline-none focus:border-amber-400 transition-all"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">%</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-200 uppercase block">📦 Despesa Fixa p/ Unidade (R$):</label>
                <span className="text-[10px] text-slate-400 block leading-tight">Embalagem, frete fixo, sacola</span>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">R$</span>
                  <input
                    type="text"
                    value={validateFixedExpenses}
                    onChange={(e) => setValidateFixedExpenses(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-base font-mono font-bold text-white outline-none focus:border-amber-400 transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="space-y-2">
                <label className="text-xs font-bold text-amber-400 uppercase block">🎯 PREÇO QUE QUER VENDER (R$):</label>
                <span className="text-[11px] text-slate-300 block leading-tight">O valor que você planeja cobrar do cliente final</span>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-400 font-extrabold text-base">R$</span>
                  <input
                    type="text"
                    value={validateSellingPrice}
                    onChange={(e) => setValidateSellingPrice(e.target.value)}
                    className="w-full bg-slate-900 border-2 border-amber-400/50 rounded-xl pl-10 pr-4 py-3 text-base font-mono font-extrabold text-amber-300 outline-none focus:border-amber-400 transition-all shadow-[0_0_15px_rgba(245,158,11,0.05)]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-emerald-400 uppercase block">📈 Margem de Lucro Desejada (%):</label>
                <span className="text-[11px] text-slate-300 block leading-tight">Para calcular a sugestão de venda ideal</span>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={validateDesiredProfitPct}
                    onChange={(e) => setValidateDesiredProfitPct(e.target.value)}
                    className="w-full bg-slate-900 border-2 border-emerald-550/30 rounded-xl px-4 py-3 text-base font-mono font-bold text-emerald-300 outline-none focus:border-emerald-500 transition-all"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-400 font-bold text-sm">%</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CALCULATOR OUTPUTS */}
      {mode === "recommended" ? (
        totalDeductions >= 100 ? (
          <div className="p-5 bg-rose-500/10 border-2 border-rose-500/30 rounded-2xl text-center space-y-2">
            <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto animate-bounce" />
            <h4 className="text-sm font-black text-rose-400 uppercase tracking-wider">Erro: Deduções de {totalDeductions}% Inviáveis!</h4>
            <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
              A soma das taxas variáveis com o lucro desejado não pode igualar ou ultrapassar 100%. Por favor, reduza as porcentagens de margem ou custos.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* INCORRECT METHOD CONTAINER */}
              <div className="bg-slate-900/60 border border-rose-500/30 p-5 sm:p-6 rounded-2xl space-y-3.5 text-left">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-rose-400 uppercase tracking-widest">Método Incorreto (Soma Simples)</span>
                  <span className="text-[10px] bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded-full uppercase font-black">Prejuízo Oculto ❌</span>
                </div>
                <span className="text-3xl font-black text-slate-300 mono-display block">
                  R$ {simplePrice.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <p className="text-xs text-slate-400 font-medium leading-relaxed">
                  Calculado de forma simplista como <span className="font-bold text-slate-200">Custo + {parsedProfit}%</span>. Sua margem real de lucro líquido será de apenas <strong className="text-rose-400 font-bold">{realMarginOfSimplePrice.toFixed(1)}%</strong> após você pagar os {parsedExpenses}% das despesas variáveis. Seu lucro cai drasticamente e o negócio quebra!
                </p>
              </div>

              {/* CORRECT METHOD CONTAINER */}
              <div className="bg-slate-900 border-2 border-emerald-500/40 p-5 sm:p-6 rounded-2xl space-y-3.5 text-left shadow-[0_0_20px_rgba(16,185,129,0.05)]">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-emerald-400 uppercase tracking-widest">Preço Recomendado (Markup Correto)</span>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full uppercase font-black">Seguro & Lucrativo ✔️</span>
                </div>
                <span className="text-3xl sm:text-4xl font-black text-emerald-400 mono-display block">
                  R$ {correctPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <p className="text-xs text-slate-100 font-medium leading-relaxed">
                  Este é o preço que você DEVE cobrar do cliente. Ele garante que, mesmo após deduzir {parsedExpenses}% de despesas variáveis, você terá exatamente os <strong>{parsedProfit}% de lucro líquido integral</strong> ({profitCash.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}) garantidos no seu bolso!
                </p>
              </div>
            </div>

            {/* FINANCIAL BREAKDOWN */}
            <div className="bg-slate-900 p-5 sm:p-6 rounded-2xl border border-white/10 space-y-4 text-left">
              <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Detalhamento Financeiro do Preço Correto (R$ {correctPrice.toFixed(2).replace(".", ",")})
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-950 p-4 rounded-xl border border-white/5 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">1. Custo de Compra (Fixo)</span>
                  <strong className="text-slate-200 text-lg mono-display block">R$ {parsedCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>
                  <p className="text-[10px] text-slate-500 leading-tight">Valor original que retorna para repor seu estoque.</p>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-white/5 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">2. Despesas & Taxas ({parsedExpenses}%)</span>
                  <strong className="text-rose-450 text-lg mono-display block">R$ {expensesCash.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>
                  <p className="text-[10px] text-slate-500 leading-tight">Comissão de cartão, impostos e frete pagos por unidade vendida.</p>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/20 space-y-1">
                  <span className="text-[10px] text-emerald-400 uppercase font-bold block">3. Lucro Líquido Limpo ({parsedProfit}%)</span>
                  <strong className="text-emerald-400 text-lg mono-display block">R$ {profitCash.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>
                  <p className="text-[10px] text-slate-500 leading-tight">Dinheiro real livre que sobra integralmente para você usar.</p>
                </div>
              </div>
            </div>
          </div>
        )
      ) : (
        /* VALIDATION MODE OUTPUTS */
        parsedTargetSellingPrice <= 0 ? (
          <div className="p-6 bg-slate-900 rounded-2xl border border-white/10 text-center">
            <Coins className="w-8 h-8 text-amber-400 mx-auto mb-2 animate-bounce" />
            <p className="text-sm font-bold text-slate-300">
              Digite um Preço de Venda planejado acima de zero para receber o diagnóstico financeiro completo!
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* OPERATIONAL COST ALERT */}
            {parsedTargetSellingPrice < (parsedCost + parsedValidateFixedExpenses + (parsedTargetSellingPrice * (parsedValidateExpensesPct / 100))) && (
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="p-5 bg-rose-600/25 border-2 border-rose-500 rounded-2xl flex items-start gap-4 text-rose-100 shadow-[0_0_25px_rgba(239,68,68,0.25)]"
              >
                <XCircle className="w-7 h-7 text-rose-400 shrink-0 mt-0.5 animate-pulse" />
                <div className="space-y-1">
                  <h4 className="font-black text-sm uppercase tracking-wide text-rose-200">
                    🚨 ALERTA CRÍTICO: Preço de Venda Abaixo dos Custos Operacionais!
                  </h4>
                  <p className="text-xs sm:text-sm font-medium leading-relaxed text-rose-200/90">
                    Seu preço pretendido de <strong>R$ {parsedTargetSellingPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong> é menor do que os custos operacionais mínimos de venda (<strong>R$ {operationalCostsValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>). Você está perdendo <strong>R$ {Math.abs(netProfit).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong> em cada produto vendido. Ajuste o preço imediatamente ou diminua seus custos!
                  </p>
                </div>
              </motion.div>
            )}

            {/* GRID FOR DIAGNOSTIC & SUGGESTION */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* DIAGNOSTIC CARD */}
              {validationStatus === "error" && (
                <div className="bg-rose-500/10 border-2 border-rose-500/40 p-5 sm:p-6 rounded-2xl space-y-4 shadow-[0_0_20px_rgba(239,68,68,0.1)] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="p-1.5 bg-rose-500/20 rounded-lg">
                        <XCircle className="w-5 h-5 text-rose-500" />
                      </div>
                      <div>
                        <h4 className="text-sm sm:text-base font-black text-rose-400 uppercase tracking-wide">
                          ❌ PRECIFICAÇÃO INCORRETA (Prejuízo!)
                        </h4>
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
                      Seu preço de venda de <strong className="text-white">R$ {parsedTargetSellingPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong> NÃO cobre o custo de compra (<strong className="text-white">R$ {parsedCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>) somado às taxas de <strong className="text-white">R$ {(validateExpensesCash + parsedValidateFixedExpenses).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>. Você terá um prejuízo real de <strong className="text-rose-400 font-black">R$ {Math.abs(netProfit).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong> por unidade vendida (<strong className="text-rose-400 font-black">{realMarginPct.toFixed(1)}%</strong> de margem).
                    </p>
                  </div>
                  <div className="bg-rose-950/30 p-3.5 rounded-xl border border-rose-500/20 space-y-1 mt-4">
                    <p className="text-[10px] font-bold text-rose-300 uppercase tracking-wider">💡 Sugestão para Corrigir:</p>
                    <p className="text-xs text-slate-300">
                      Aumente o preço de venda para no mínimo <strong className="text-emerald-400">R$ {suggestedPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong> para pagar as contas e garantir a margem desejada de {parsedValidateDesiredProfitPct}%, ou negocie um custo menor com seu fornecedor.
                    </p>
                  </div>
                </div>
              )}

              {validationStatus === "warning" && (
                <div className="bg-amber-500/10 border-2 border-amber-500/40 p-5 sm:p-6 rounded-2xl space-y-4 shadow-[0_0_20px_rgba(245,158,11,0.1)] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="p-1.5 bg-amber-500/20 rounded-lg">
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                      </div>
                      <div>
                        <h4 className="text-sm sm:text-base font-black text-amber-400 uppercase tracking-wide">
                          ⚠️ ATENÇÃO (Margem Apertada)
                        </h4>
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
                      Você terá um lucro líquido de apenas <strong className="text-amber-400 font-black">R$ {netProfit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong> por unidade (<strong className="text-amber-400 font-black">{realMarginPct.toFixed(1)}%</strong> de margem real). Essa margem está abaixo do mínimo recomendado de 15%. Qualquer aumento repentino em taxas, perdas de estoque ou frete farão você operar no vermelho.
                    </p>
                  </div>
                  <div className="bg-amber-950/30 p-3.5 rounded-xl border border-amber-500/20 space-y-1 mt-4">
                    <p className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">💡 Sugestão para Corrigir:</p>
                    <p className="text-xs text-slate-300">
                      Para ter um negócio seguro, recomendamos ajustar o preço de venda para pelo menos <strong className="text-emerald-400">R$ {suggestedPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong> (onde você garante {parsedValidateDesiredProfitPct}% de margem livre no bolso).
                    </p>
                  </div>
                </div>
              )}

              {validationStatus === "success" && (
                <div className="bg-emerald-500/10 border-2 border-emerald-500/40 p-5 sm:p-6 rounded-2xl space-y-4 shadow-[0_0_20px_rgba(16,185,129,0.1)] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="p-1.5 bg-emerald-500/20 rounded-lg">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <h4 className="text-sm sm:text-base font-black text-emerald-400 uppercase tracking-wide">
                          ✅ PRECIFICAÇÃO CORRETA (Lucro Saudável!)
                        </h4>
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
                      Excelente precificação! Seu preço de <strong className="text-white">R$ {parsedTargetSellingPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong> é totalmente viável. Ele cobre o custo de compra de <strong className="text-white">R$ {parsedCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>, as taxas e fretes de <strong className="text-white">R$ {(validateExpensesCash + parsedValidateFixedExpenses).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong> e ainda te devolve limpo e livre <strong className="text-emerald-400 font-black">R$ {netProfit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong> no bolso por unidade (<strong className="text-emerald-400 font-black">{realMarginPct.toFixed(1)}%</strong> de margem líquida real!).
                    </p>
                  </div>
                  <div className="bg-emerald-950/30 p-3.5 rounded-xl border border-emerald-500/20 space-y-1 mt-4">
                    <p className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">💡 Dica de Sucesso:</p>
                    <p className="text-xs text-slate-300">
                      Você está com uma margem sólida e acima dos padrões de segurança. Continue com essa estratégia! Esse produto gera excelente fluxo de caixa para seu comércio.
                    </p>
                  </div>
                </div>
              )}

              {/* SUGGESTION CARD */}
              <div className="bg-slate-900 border-2 border-emerald-550/40 p-5 sm:p-6 rounded-2xl space-y-4 text-left shadow-[0_0_20px_rgba(16,185,129,0.05)] flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-black text-emerald-400 uppercase tracking-widest">Preço Sugerido (Sugestão de Venda)</span>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full uppercase font-black">Fórmula Markup</span>
                  </div>
                  {validateDivisor <= 0 ? (
                    <div className="text-rose-400 text-sm font-bold">
                      Erro: Margem + Taxas de {parsedValidateExpensesPct + parsedValidateDesiredProfitPct}% atingem ou superam 100%!
                    </div>
                  ) : (
                    <>
                      <span className="text-3xl sm:text-4xl font-black text-emerald-400 mono-display block">
                        R$ {suggestedPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <p className="text-xs text-slate-200 font-medium leading-relaxed mt-2">
                        Este é o valor de venda ideal. Ao cobrar este preço, você cobre todos os custos operacionais (impostos, fretes, custo de reposição) e garante exatamente <strong className="text-emerald-400">{parsedValidateDesiredProfitPct}%</strong> de margem líquida livre no bolso!
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
          </div>
        )
      )}
    </motion.div>
  );
}
