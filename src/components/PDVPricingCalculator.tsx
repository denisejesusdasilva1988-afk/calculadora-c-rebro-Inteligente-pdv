import React, { useState } from "react";
import {
  Percent,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ArrowLeft,
  Sparkles,
  ShoppingBag,
  Coins,
  DollarSign
} from "lucide-react";

interface PDVPricingCalculatorProps {
  products: Array<{ id: string; name: string; price: number }>;
  productStockData: Record<string, { costPrice?: number }>;
  formatCurrency: (val: number) => string;
  showNotification: (msg: string, type: "success" | "error" | "info" | "warning") => void;
  onApplyCalculatedPrice: (productId: string, finalPrice: number, costPrice: number) => void;
  onRegisterProductFromCalc: (
    name: string,
    category: string,
    price: number,
    costPrice: number,
    stock: number,
    minStock: number
  ) => void;
  onBackToPDV?: () => void;
}

export function PDVPricingCalculator({
  products,
  productStockData,
  formatCurrency,
  showNotification,
  onApplyCalculatedPrice,
  onRegisterProductFromCalc,
  onBackToPDV
}: PDVPricingCalculatorProps) {
  const [calcSelectedProductId, setCalcSelectedProductId] = useState<string>("");
  const [calcNewProductName, setCalcNewProductName] = useState("");
  const [calcCostPrice, setCalcCostPrice] = useState("10,00");
  const [calcExpensesPct, setCalcExpensesPct] = useState("15");
  const [calcProfitPct, setCalcProfitPct] = useState("35");
  const [calcNewProductCategory, setCalcNewProductCategory] = useState("Alimentos");
  const [calcNewProductStock, setCalcNewProductStock] = useState("50");
  const [calcNewProductMinStock, setCalcNewProductMinStock] = useState("10");

  // Simulador de centavos perdidos
  const [calcCentLossPerTx, setCalcCentLossPerTx] = useState("0,10");
  const [calcDailyTxVolume, setCalcDailyTxVolume] = useState("50");
  const [calcWorkingDays, setCalcWorkingDays] = useState("300");

  const parseNum = (valStr: string): number => {
    if (!valStr) return 0;
    const cleaned = valStr.toString().trim().replace("R$", "").trim();
    if (cleaned.includes(",") && cleaned.includes(".")) {
      return parseFloat(cleaned.replace(/\./g, "").replace(",", ".")) || 0;
    }
    return parseFloat(cleaned.replace(",", ".")) || 0;
  };

  const parsedCost = parseNum(calcCostPrice) || 0;
  const expensesPct = parseFloat(calcExpensesPct) || 0;
  const profitPct = parseFloat(calcProfitPct) || 0;
  const totalDeductions = expensesPct + profitPct;

  // Formula 1: Simple Additive (INCORRECT - margin is actually much lower)
  const simplePrice = parsedCost * (1 + profitPct / 100);
  const realMarginOfSimplePrice =
    simplePrice > 0
      ? ((simplePrice - parsedCost - simplePrice * (expensesPct / 100)) / simplePrice) * 100
      : 0;

  // Formula 2: Markup/Contribution Margin (CORRECT - guarantees desired profit margin)
  const divisor = 1 - totalDeductions / 100;
  const correctPrice = divisor > 0 ? parsedCost / divisor : 0;

  // Financial breakdown for recommended price
  const expensesCash = correctPrice * (expensesPct / 100);
  const profitCash = correctPrice * (profitPct / 100);

  return (
    <div className="bg-slate-900/90 p-4 sm:p-6 rounded-3xl border border-white/10 space-y-5 shadow-2xl text-left">
      {/* Header */}
      <div className="border-b border-white/10 pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h4 className="text-sm font-black uppercase text-pink-400 flex items-center gap-2">
            <Percent className="w-5 h-5 text-pink-400" />
            <span>Calculadora de Precificação Comercial Inteligente</span>
          </h4>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Descubra se você está perdendo dinheiro por precificar errado! Pequenos negócios costumam quebrar porque usam a soma simples. Veja a fórmula correta.
          </p>
        </div>
        {onBackToPDV && (
          <button
            type="button"
            onClick={onBackToPDV}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shrink-0 self-start sm:self-auto"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar ao Balcão</span>
          </button>
        )}
      </div>

      {/* Step 1: Optional Product Selector to pre-fill */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950 p-3.5 rounded-2xl border border-white/5 text-left">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase">
            Vincular a Produto Existente (Opcional):
          </label>
          <select
            value={calcSelectedProductId}
            onChange={(e) => {
              const val = e.target.value;
              setCalcSelectedProductId(val);
              if (val) {
                const p = products.find((item) => item.id === val);
                if (p) {
                  setCalcNewProductName(p.name);
                  const cost = productStockData[p.id]?.costPrice;
                  if (cost !== undefined) {
                    setCalcCostPrice(cost.toFixed(2).replace(".", ","));
                  } else {
                    setCalcCostPrice("0,00");
                  }
                }
              } else {
                setCalcNewProductName("");
                setCalcCostPrice("10,00");
              }
            }}
            className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 outline-none cursor-pointer"
          >
            <option value="">-- NOVO PRODUTO (NÃO CADASTRADO) --</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                🛍️ {p.name.toUpperCase()} (Atual: {formatCurrency(p.price)})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase">
            Nome do Produto:
          </label>
          <input
            type="text"
            placeholder="Ex: Coca-cola Lata 350ml"
            value={calcNewProductName}
            onChange={(e) => setCalcNewProductName(e.target.value)}
            disabled={!!calcSelectedProductId}
            className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-bold outline-none uppercase disabled:opacity-50"
          />
        </div>
      </div>

      {/* Step 2: Calculator Variables */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="space-y-1.5 bg-slate-950/80 p-3.5 rounded-2xl border border-white/5 text-left">
          <label className="text-[10px] font-black text-purple-400 uppercase">
            💰 Custo de Compra (R$):
          </label>
          <p className="text-[8.5px] text-slate-500 font-bold leading-none mb-1">
            Preço que você pagou no fornecedor
          </p>
          <input
            type="text"
            value={calcCostPrice}
            onChange={(e) => setCalcCostPrice(e.target.value)}
            className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm font-mono font-bold text-white outline-none"
          />
        </div>

        <div className="space-y-1.5 bg-slate-950/80 p-3.5 rounded-2xl border border-white/5 text-left">
          <label className="text-[10px] font-black text-purple-400 uppercase">
            💳 Despesas e Taxas (%):
          </label>
          <p className="text-[8.5px] text-slate-500 font-bold leading-none mb-1">
            Taxas de cartão, sacolas, impostos, frete
          </p>
          <input
            type="number"
            min="0"
            max="90"
            value={calcExpensesPct}
            onChange={(e) => setCalcExpensesPct(e.target.value)}
            className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm font-mono font-bold text-white outline-none"
          />
        </div>

        <div className="space-y-1.5 bg-slate-950/80 p-3.5 rounded-2xl border border-white/5 text-left">
          <label className="text-[10px] font-black text-purple-400 uppercase">
            📈 Margem Desejada (%):
          </label>
          <p className="text-[8.5px] text-slate-500 font-bold leading-none mb-1">
            O lucro líquido que deseja no seu bolso
          </p>
          <input
            type="number"
            min="1"
            max="90"
            value={calcProfitPct}
            onChange={(e) => setCalcProfitPct(e.target.value)}
            className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm font-mono font-bold text-white outline-none"
          />
        </div>
      </div>

      {/* Calculations comparison */}
      {totalDeductions >= 100 ? (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-center">
          <span className="text-xs font-black text-rose-450 uppercase">
            ⚠️ Dedução de despesa + lucro de {totalDeductions}% não permitida!
          </span>
          <p className="text-[10px] text-slate-400 mt-1">
            A soma das porcentagens de despesas e lucro não pode ser igual ou maior que 100%.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* INCORRECT METHOD */}
            <div className="bg-rose-950/15 border border-rose-500/25 p-4 rounded-2xl text-left space-y-2">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest block">
                  Método Incorreto (Soma Simples)
                </span>
                <span className="text-[8.5px] bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded uppercase font-bold">
                  Erro Comum ❌
                </span>
              </div>
              <span className="text-2xl font-black text-slate-300 font-mono block">
                {formatCurrency(simplePrice)}
              </span>
              <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                Calculado como <span className="font-bold text-slate-300">Custo + {profitPct}%</span>. Sua margem líquida real de lucro será de apenas{" "}
                <strong className="text-rose-400">{realMarginOfSimplePrice.toFixed(1)}%</strong> após pagar os {expensesPct}% de despesas variáveis. Seu lucro cai drasticamente!
              </p>
            </div>

            {/* CORRECT RECOMMENDED METHOD */}
            <div className="bg-emerald-950/15 border border-emerald-500/25 p-4 rounded-2xl text-left space-y-2 relative overflow-hidden">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block">
                  Método Correto (Preço Recomendado)
                </span>
                <span className="text-[8.5px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded uppercase font-black animate-pulse">
                  Lucro Real ✅
                </span>
              </div>
              <span className="text-2xl font-black text-emerald-400 font-mono block leading-none">
                {formatCurrency(correctPrice)}
              </span>
              <p className="text-[10px] text-slate-300 font-medium leading-relaxed">
                Calculado pela <strong className="text-emerald-400">Margem de Contribuição / Markup</strong>. Garante que, ao vender, você cobre os {expensesPct}% de custos operacionais e guarda{" "}
                <strong className="text-emerald-400">exatamente {profitPct}% líquido</strong> de lucro real sobre a venda!
              </p>
            </div>
          </div>

          {/* Financial Breakdown Table */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-white/5 space-y-2.5 text-left">
            <span className="text-[10px] font-black text-purple-400 uppercase block tracking-wider">
              📊 Detalhamento Financeiro do Preço Recomendado ({formatCurrency(correctPrice)})
            </span>

            <div className="grid grid-cols-3 gap-2.5 text-center pt-1">
              <div className="bg-slate-900 p-2.5 rounded-xl border border-white/5 text-left">
                <span className="text-[8.5px] text-slate-500 uppercase font-black block">Custo Fornecedor</span>
                <span className="text-xs font-bold text-slate-300 font-mono">{formatCurrency(parsedCost)}</span>
                <span className="text-[8.5px] text-slate-500 block">
                  ({((parsedCost / (correctPrice || 1)) * 100).toFixed(1)}% do preço)
                </span>
              </div>

              <div className="bg-slate-900 p-2.5 rounded-xl border border-white/5 text-left">
                <span className="text-[8.5px] text-slate-500 uppercase font-black block">Despesas Variáveis ({expensesPct}%)</span>
                <span className="text-xs font-bold text-amber-500 font-mono">{formatCurrency(expensesCash)}</span>
                <span className="text-[8.5px] text-slate-500 block">({expensesPct}% do preço)</span>
              </div>

              <div className="bg-slate-900 p-2.5 rounded-xl border border-white/5 text-left">
                <span className="text-[8.5px] text-slate-500 uppercase font-black block">Lucro Líquido Real ({profitPct}%)</span>
                <span className="text-xs font-bold text-emerald-400 font-mono">{formatCurrency(profitCash)}</span>
                <span className="text-[8.5px] text-slate-500 block">({profitPct}% do preço)</span>
              </div>
            </div>
          </div>

          {/* Dynamic action area depending on if editing an existing product or registering a new one */}
          <div className="bg-slate-950/70 p-4 rounded-2xl border border-white/10 space-y-3">
            {calcSelectedProductId ? (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
                <div>
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block">
                    💾 Aplicar Preço Calculado
                  </span>
                  <p className="text-[10px] text-slate-400">
                    Isso atualizará o preço de venda e o custo no estoque de{" "}
                    <strong className="text-white">
                      {(products.find((p) => p.id === calcSelectedProductId)?.name || "").toUpperCase()}
                    </strong>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onApplyCalculatedPrice(calcSelectedProductId, correctPrice, parsedCost)}
                  className="w-full sm:w-auto px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shrink-0 cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                  Atualizar Preço no Catálogo 💾
                </button>
              </div>
            ) : (
              <div className="space-y-3 text-left">
                <div>
                  <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest block">
                    🛍️ Cadastrar Novo Produto com este Preço
                  </span>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Preencha os detalhes adicionais abaixo para registrar este produto diretamente no seu catálogo de vendas.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-400 font-bold uppercase">Categoria:</label>
                    <select
                      value={calcNewProductCategory}
                      onChange={(e) => setCalcNewProductCategory(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-300 outline-none cursor-pointer"
                    >
                      <option value="Alimentos">Alimentos</option>
                      <option value="Bebidas">Bebidas</option>
                      <option value="Limpeza">Limpeza</option>
                      <option value="Serviços">Serviços</option>
                      <option value="Outros">Outros</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-400 font-bold uppercase">Estoque Inicial (unidades):</label>
                    <input
                      type="number"
                      value={calcNewProductStock}
                      onChange={(e) => setCalcNewProductStock(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs font-bold text-white outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-400 font-bold uppercase">Alerta Mínimo de Estoque:</label>
                    <input
                      type="number"
                      value={calcNewProductMinStock}
                      onChange={(e) => setCalcNewProductMinStock(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs font-bold text-white outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (!calcNewProductName.trim()) {
                        showNotification("Por favor, preencha o Nome do Produto antes de cadastrar!", "error");
                        return;
                      }
                      onRegisterProductFromCalc(
                        calcNewProductName,
                        calcNewProductCategory,
                        correctPrice,
                        parsedCost,
                        parseInt(calcNewProductStock, 10) || 0,
                        parseInt(calcNewProductMinStock, 10) || 0
                      );
                      setCalcNewProductName("");
                      setCalcCostPrice("10,00");
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg shadow-purple-600/20"
                  >
                    Cadastrar Novo Produto 🛍️✅
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CARD DE IMPACTO ECONÔMICO DOS PREÇOS ,90 OU ,99 (SIMULADOR DE CENTAVOS PERDIDOS) */}
      <div className="bg-gradient-to-br from-slate-950 to-purple-950/20 p-4 sm:p-5 rounded-2xl border border-purple-500/20 space-y-3.5 text-left mt-4">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[9px] font-black uppercase text-purple-400 tracking-wider">
              🔬 Mentoria de Economia Real
            </span>
            <h5 className="text-xs sm:text-sm font-black uppercase text-white mt-0.5">
              O Impacto Invisível dos Centavos (,90 e ,99)
            </h5>
          </div>
          <span className="text-base bg-purple-500/15 p-1.5 rounded-xl">💡</span>
        </div>

        <p className="text-[10px] text-slate-300 leading-relaxed">
          Muitos comércios usam preços como <strong className="text-purple-300">R$ 6,90</strong> ou{" "}
          <strong className="text-purple-300">R$ 6,99</strong> pelo efeito psicológico. No entanto, se o cliente pagar com dinheiro e o caixa não tiver moedas de 10 ou 1 centavo para dar de troco (ou se &quot;arredondar para baixo&quot; para evitar brigas com clientes), o comércio perde esses centavos silenciosamente em cada transação. No final do ano, isso vira um prejuízo absurdo!
        </p>

        <div className="bg-slate-900/80 p-3.5 rounded-xl border border-white/5 space-y-2.5">
          <span className="text-[9.5px] font-black text-purple-400 uppercase tracking-wide block">
            📊 Simulador de Perdas de Centavos
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[8.5px] text-slate-400 font-bold uppercase block">
                Perda Média / Troco (R$):
              </label>
              <input
                type="text"
                value={calcCentLossPerTx}
                onChange={(e) => setCalcCentLossPerTx(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-mono text-purple-300 outline-none font-bold"
                placeholder="0,10"
              />
              <span className="text-[7.5px] text-slate-500 block">(Se faltar R$ 0,10 de troco)</span>
            </div>

            <div className="space-y-1">
              <label className="text-[8.5px] text-slate-400 font-bold uppercase block">
                Vendas / Dia com Troco:
              </label>
              <input
                type="number"
                value={calcDailyTxVolume}
                onChange={(e) => setCalcDailyTxVolume(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-mono text-purple-300 outline-none font-bold"
                placeholder="50"
              />
              <span className="text-[7.5px] text-slate-500 block">(Média de clientes diários)</span>
            </div>

            <div className="space-y-1">
              <label className="text-[8.5px] text-slate-400 font-bold uppercase block">
                Dias de Trabalho / Ano:
              </label>
              <input
                type="number"
                value={calcWorkingDays}
                onChange={(e) => setCalcWorkingDays(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-mono text-purple-300 outline-none font-bold"
                placeholder="300"
              />
              <span className="text-[7.5px] text-slate-500 block">(Dias de caixa aberto no ano)</span>
            </div>
          </div>

          {(() => {
            const lossPerTx = parseNum(calcCentLossPerTx) || 0;
            const dailyVolume = parseFloat(calcDailyTxVolume) || 0;
            const workingDays = parseFloat(calcWorkingDays) || 0;

            const dailyLoss = lossPerTx * dailyVolume;
            const monthlyLoss = dailyLoss * 26;
            const annualLoss = dailyLoss * workingDays;

            const energyBillsCount = Math.floor(annualLoss / 250);
            const bagsCount = Math.floor(annualLoss / 0.1);
            const minimumWages = (annualLoss / 1412).toFixed(1);

            return (
              <div className="pt-2 border-t border-white/5 space-y-2">
                <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest block">
                  💰 Impacto das Perdas Acumuladas:
                </span>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-950 p-2 rounded-xl border border-white/[0.03]">
                    <span className="text-[8px] text-slate-500 font-bold uppercase block">Prejuízo / Dia</span>
                    <span className="text-xs font-mono font-black text-rose-400">{formatCurrency(dailyLoss)}</span>
                  </div>
                  <div className="bg-slate-950 p-2 rounded-xl border border-white/[0.03]">
                    <span className="text-[8px] text-slate-500 font-bold uppercase block">Prejuízo / Mês</span>
                    <span className="text-xs font-mono font-black text-rose-400">{formatCurrency(monthlyLoss)}</span>
                  </div>
                  <div className="bg-slate-950 p-2 rounded-xl border border-white/[0.03] ring-1 ring-rose-500/20">
                    <span className="text-[8px] text-slate-400 font-black uppercase block">Prejuízo / Ano</span>
                    <span className="text-sm font-mono font-black text-rose-400 animate-pulse">
                      {formatCurrency(annualLoss)}
                    </span>
                  </div>
                </div>

                <div className="bg-rose-950/20 p-2.5 rounded-xl border border-rose-500/10 text-[9.5px] text-slate-300 space-y-1">
                  <p className="font-bold text-rose-300 uppercase text-[8.5px] tracking-wider">
                    ⚠️ Equivalência do Prejuízo Anual:
                  </p>
                  <p>
                    • Equivale a <strong className="text-white">{energyBillsCount > 0 ? energyBillsCount : 0} contas de energia elétrica</strong> do comércio (média de R$ 250,00 cada).
                  </p>
                  <p>
                    • Equivale a perder a compra de <strong className="text-white">{bagsCount.toLocaleString("pt-BR")} sacolinhas plásticas</strong> biodegradáveis (R$ 0,10 cada).
                  </p>
                  <p>
                    • Representa <strong className="text-white">{minimumWages} salário(s) mínimo(s) comercial(ais)</strong> jogado(s) no lixo ao ano.
                  </p>
                </div>
              </div>
            );
          })()}
        </div>

        <div className="bg-slate-900/40 p-3 rounded-xl border border-white/[0.03] text-[10px] text-slate-400 leading-normal space-y-1.5">
          <span className="font-black text-slate-300 uppercase text-[8.5px] tracking-wider block">
            🎓 Caso Real & Economia Comportamental
          </span>
          <p>
            Anos atrás, no Fantástico, um passageiro carioca que pegava o ônibus 882 (Santa Cruz x Barra) mostrou que fazia questão de receber seus 5 centavos de troco todas as vezes. Ao fim do ano, ele acumulou um montante expressivo apenas guardando essas pequenas moedas.
          </p>
          <p>
            <strong>Estratégia do Dono:</strong> Para grandes redes, a gestão de centavos é automatizada. No pequeno comércio, a falta de troco corrói a margem. <span className="text-emerald-400 font-bold">Dica de Precificação:</span> Se você não tem troco em moedas, prefira precificar com valores redondos como <strong className="text-white">R$ 5,00</strong>, <strong className="text-white">R$ 7,00</strong>, ou ofereça <strong className="text-emerald-400 font-bold">descontos via PIX</strong> para incentivar pagamentos sem moedas físicas!
          </p>
        </div>
      </div>
    </div>
  );
}
