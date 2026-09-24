import React, { useState, useMemo } from "react";
import {
  ShoppingBag,
  Printer,
  Fuel,
  CreditCard,
  Building2,
  TrendingUp,
  Percent,
  DollarSign,
  Share2,
  Check,
  Sparkles,
  Info,
  Scale,
  Package,
  Layers,
  FileText
} from "lucide-react";

export interface RetailItemPreset {
  name: string;
  category: string;
  purchasePrice: number; // ex: R$ 3.00 (arroz)
  freightGasCost: number; // ex: R$ 0.20
  bagCost: number; // ex: R$ 0.12 (sacola)
  paperRollCost: number; // ex: R$ 0.04 (bobina impressora)
  cardFeePct: number; // ex: 3.2%
  storeFixedCostPct: number; // ex: 10%
  taxPct: number; // ex: 4%
  wasteSpoilagePct: number; // ex: 2%
  targetNetMarginPct: number; // ex: 25%
  practicePrice: number; // ex: R$ 5.49
}

export const RETAIL_PRESETS: RetailItemPreset[] = [
  {
    name: "Arroz Branco Tipo 1 (Pacote 1 kg)",
    category: "Mercearia & Alimentos",
    purchasePrice: 3.00, // O exemplo exato pedido pelo usuário!
    freightGasCost: 0.20, // Gasolina e frete rateado
    bagCost: 0.12, // Sacola plástica reforçada
    paperRollCost: 0.04, // Papel da impressora térmica / cupom fiscal
    cardFeePct: 2.8, // Média débito / crédito
    storeFixedCostPct: 9.0, // Aluguel, luz, funcionários
    taxPct: 4.0, // Simples Nacional / MEI
    wasteSpoilagePct: 1.5, // Perdas, quebras, validade
    targetNetMarginPct: 25.0, // Lucro líquido limpo no bolso
    practicePrice: 5.49
  },
  {
    name: "Arroz Branco Fardo 5 kg",
    category: "Mercearia & Alimentos",
    purchasePrice: 19.50,
    freightGasCost: 0.80,
    bagCost: 0.20,
    paperRollCost: 0.04,
    cardFeePct: 2.8,
    storeFixedCostPct: 9.0,
    taxPct: 4.0,
    wasteSpoilagePct: 1.5,
    targetNetMarginPct: 22.0,
    practicePrice: 32.90
  },
  {
    name: "Feijão Preto Nobre (Pacote 1 kg)",
    category: "Mercearia & Alimentos",
    purchasePrice: 5.80,
    freightGasCost: 0.25,
    bagCost: 0.12,
    paperRollCost: 0.04,
    cardFeePct: 2.8,
    storeFixedCostPct: 9.0,
    taxPct: 4.0,
    wasteSpoilagePct: 2.0,
    targetNetMarginPct: 28.0,
    practicePrice: 9.90
  },
  {
    name: "Óleo de Soja Refinado (Garrafa 900 ml)",
    category: "Mercearia & Alimentos",
    purchasePrice: 4.90,
    freightGasCost: 0.20,
    bagCost: 0.12,
    paperRollCost: 0.04,
    cardFeePct: 2.8,
    storeFixedCostPct: 8.0,
    taxPct: 4.0,
    wasteSpoilagePct: 1.0,
    targetNetMarginPct: 20.0,
    practicePrice: 7.90
  },
  {
    name: "Leite Integral Longa Vida (Caixa 1 L)",
    category: "Laticínios & Bebidas",
    purchasePrice: 3.90,
    freightGasCost: 0.20,
    bagCost: 0.12,
    paperRollCost: 0.04,
    cardFeePct: 2.8,
    storeFixedCostPct: 8.0,
    taxPct: 4.0,
    wasteSpoilagePct: 2.5,
    targetNetMarginPct: 22.0,
    practicePrice: 6.29
  },
  {
    name: "Sabão em Pó Lavagem Perfeita (Caixa 1 kg)",
    category: "Limpeza & Higiene",
    purchasePrice: 9.20,
    freightGasCost: 0.40,
    bagCost: 0.15,
    paperRollCost: 0.04,
    cardFeePct: 2.8,
    storeFixedCostPct: 10.0,
    taxPct: 4.0,
    wasteSpoilagePct: 1.0,
    targetNetMarginPct: 30.0,
    practicePrice: 16.90
  }
];

interface RetailOverheadCalculatorProps {
  formatCurrency?: (val: number) => string;
  showNotification: (msg: string, type: "success" | "error" | "info" | "warning") => void;
  onApplyToPDVCatalog?: (product: {
    name: string;
    costPrice: number;
    salePrice: number;
    category: string;
  }) => void;
}

export function RetailOverheadCalculator({
  formatCurrency = (v) => `R$ ${v.toFixed(2).replace(".", ",")}`,
  showNotification,
  onApplyToPDVCatalog
}: RetailOverheadCalculatorProps) {
  const [productName, setProductName] = useState<string>(RETAIL_PRESETS[0].name);
  const [category, setCategory] = useState<string>(RETAIL_PRESETS[0].category);
  const [purchasePrice, setPurchasePrice] = useState<number>(RETAIL_PRESETS[0].purchasePrice);
  const [freightGasCost, setFreightGasCost] = useState<number>(RETAIL_PRESETS[0].freightGasCost);
  const [bagCost, setBagCost] = useState<number>(RETAIL_PRESETS[0].bagCost);
  const [paperRollCost, setPaperRollCost] = useState<number>(RETAIL_PRESETS[0].paperRollCost);
  const [cardFeePct, setCardFeePct] = useState<number>(RETAIL_PRESETS[0].cardFeePct);
  const [storeFixedCostPct, setStoreFixedCostPct] = useState<number>(RETAIL_PRESETS[0].storeFixedCostPct);
  const [taxPct, setTaxPct] = useState<number>(RETAIL_PRESETS[0].taxPct);
  const [wasteSpoilagePct, setWasteSpoilagePct] = useState<number>(RETAIL_PRESETS[0].wasteSpoilagePct);
  const [targetNetMarginPct, setTargetNetMarginPct] = useState<number>(RETAIL_PRESETS[0].targetNetMarginPct);
  const [practicePrice, setPracticePrice] = useState<number>(RETAIL_PRESETS[0].practicePrice);

  const [simulatedDailyVolume, setSimulatedDailyVolume] = useState<number>(30);

  // Calculations
  const calculations = useMemo(() => {
    // 1. Direct unit costs (Purchase + Freight/Gas + Bag + Paper)
    const directUnitCost = purchasePrice + freightGasCost + bagCost + paperRollCost;

    // 2. Sum of variable rates and margins based on selling price
    const totalDeductionsPct = cardFeePct + storeFixedCostPct + taxPct + wasteSpoilagePct + targetNetMarginPct;
    
    // Formula Markup Divisor: Price = DirectCost / (1 - TotalPct / 100)
    const divisor = Math.max(0.1, 1 - (totalDeductionsPct / 100));
    const suggestedPrice = directUnitCost / divisor;

    // 3. Breakdown of where each cent goes based on PRACTICE PRICE (what customer pays)
    const price = practicePrice > 0 ? practicePrice : suggestedPrice;

    const cardFeeAmount = price * (cardFeePct / 100);
    const storeFixedCostAmount = price * (storeFixedCostPct / 100);
    const taxAmount = price * (taxPct / 100);
    const wasteSpoilageAmount = price * (wasteSpoilagePct / 100);

    const totalDeductionsAmount = 
      purchasePrice + 
      freightGasCost + 
      bagCost + 
      paperRollCost + 
      cardFeeAmount + 
      storeFixedCostAmount + 
      taxAmount + 
      wasteSpoilageAmount;

    // Real clean net profit remaining in the merchant's pocket!
    const cleanNetProfit = price - totalDeductionsAmount;
    const realNetMarginPct = price > 0 ? (cleanNetProfit / price) * 100 : 0;

    // Volume projections
    const dailyProfit = cleanNetProfit * simulatedDailyVolume;
    const monthlyProfit = dailyProfit * 30;
    const monthlyRevenue = price * simulatedDailyVolume * 30;

    return {
      directUnitCost,
      totalDeductionsPct,
      suggestedPrice,
      cardFeeAmount,
      storeFixedCostAmount,
      taxAmount,
      wasteSpoilageAmount,
      totalDeductionsAmount,
      cleanNetProfit,
      realNetMarginPct,
      dailyProfit,
      monthlyProfit,
      monthlyRevenue
    };
  }, [
    purchasePrice,
    freightGasCost,
    bagCost,
    paperRollCost,
    cardFeePct,
    storeFixedCostPct,
    taxPct,
    wasteSpoilagePct,
    targetNetMarginPct,
    practicePrice,
    simulatedDailyVolume
  ]);

  // Load Preset
  const handleLoadPreset = (preset: RetailItemPreset) => {
    setProductName(preset.name);
    setCategory(preset.category);
    setPurchasePrice(preset.purchasePrice);
    setFreightGasCost(preset.freightGasCost);
    setBagCost(preset.bagCost);
    setPaperRollCost(preset.paperRollCost);
    setCardFeePct(preset.cardFeePct);
    setStoreFixedCostPct(preset.storeFixedCostPct);
    setTaxPct(preset.taxPct);
    setWasteSpoilagePct(preset.wasteSpoilagePct);
    setTargetNetMarginPct(preset.targetNetMarginPct);
    setPracticePrice(preset.practicePrice);
    showNotification(`Produto "${preset.name}" carregado! 🏷️`, "info");
  };

  // Export to PDV Catalog
  const handleApplyToCatalog = () => {
    if (!onApplyToPDVCatalog) return;
    onApplyToPDVCatalog({
      name: productName,
      costPrice: parseFloat(calculations.directUnitCost.toFixed(2)),
      salePrice: practicePrice,
      category: category
    });
    showNotification(`"${productName}" salvo no PDV: Custo Direto ${formatCurrency(calculations.directUnitCost)} / Venda ${formatCurrency(practicePrice)}! 🛒`, "success");
  };

  // Share WhatsApp
  const handleShareWhatsApp = () => {
    let msg = `🏷️ *PRECIFICAÇÃO MINUCIOSA COM CUSTOS INVISÍVEIS*\n`;
    msg += `📦 *Produto:* ${productName}\n`;
    msg += `💵 *Preço Pago na Compra:* ${formatCurrency(purchasePrice)}\n\n`;
    msg += `🚚 *CUSTOS INVISÍVEIS RATEADOS (POR UNIDADE):*\n`;
    msg += `• *Gasolina / Frete de Transporte:* ${formatCurrency(freightGasCost)}\n`;
    msg += `• *Sacola Plástica / Embalagem:* ${formatCurrency(bagCost)}\n`;
    msg += `• *Papel da Impressora / Bobina Térmica:* ${formatCurrency(paperRollCost)}\n`;
    msg += `• *Taxa da Maquininha (${cardFeePct}%):* ${formatCurrency(calculations.cardFeeAmount)}\n`;
    msg += `• *Custo Fixo Loja / Aluguel / Luz (${storeFixedCostPct}%):* ${formatCurrency(calculations.storeFixedCostAmount)}\n`;
    msg += `• *Impostos (${taxPct}%):* ${formatCurrency(calculations.taxAmount)}\n`;
    msg += `• *Perdas / Validade (${wasteSpoilagePct}%):* ${formatCurrency(calculations.wasteSpoilageAmount)}\n\n`;
    msg += `📊 *RESULTADO FINAL & LUCRO LIMPO:*\n`;
    msg += `• *Preço de Venda Praticado:* ${formatCurrency(practicePrice)}\n`;
    msg += `• *Preço Matemático Sugerido:* ${formatCurrency(calculations.suggestedPrice)}\n`;
    msg += `• *LUCRO LÍQUIDO NO BOLSO:* +${formatCurrency(calculations.cleanNetProfit)} por unidade (${calculations.realNetMarginPct.toFixed(1)}%)\n`;
    msg += `• *Simulação com ${simulatedDailyVolume} unid/dia:* +${formatCurrency(calculations.monthlyProfit)} de lucro limpo no mês!\n\n`;
    msg += `_Calculado pelo Cérebro Inteligente PDV 🚀_`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200 text-left">
      {/* HEADER CARD */}
      <div className="bg-gradient-to-r from-blue-950/70 via-slate-900 to-slate-950 border border-blue-500/30 rounded-2xl p-4 sm:p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-600/30 shrink-0">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[9.5px] font-black uppercase text-blue-400 tracking-wider">
                  Módulo Comércio, Mercado & Mercearia
                </span>
                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-[8.5px] font-black uppercase rounded-full border border-blue-500/30">
                  Rateio de Custos Invisíveis
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2 mt-0.5">
                Calculadora Minuciosa com Sacola, Bobina, Frete & Maquininha 🏷️
              </h3>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-[10px] uppercase tracking-wider rounded-xl transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/15"
              title="Compartilhar análise dos custos invisíveis no WhatsApp"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Enviar no WhatsApp</span>
            </button>
            <button
              type="button"
              onClick={handleApplyToCatalog}
              className="px-3 py-2 bg-blue-500 hover:bg-blue-400 text-slate-950 font-black text-[10px] uppercase tracking-wider rounded-xl transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-500/20"
              title="Salvar produto com os custos calculados no PDV"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Salvar no Catálogo PDV</span>
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-300 font-medium leading-relaxed mt-2.5">
          Comprou <strong>1 kg de arroz por R$ 3,00</strong>? Se você vender por R$ 4,00 achando que lucrou R$ 1,00, você está perdendo dinheiro! A <strong>sacolinha plástica (R$ 0,12)</strong>, o <strong>papel da impressora do cupom (R$ 0,04)</strong>, a <strong>gasolina do transporte (R$ 0,20)</strong> e a <strong>maquininha de cartão</strong> comem metade da sua margem. Esta calculadora desvenda todos os custos invisíveis!
        </p>

        {/* PRESET SHORTCUTS */}
        <div className="mt-3.5 pt-3 border-t border-white/5">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-2">
            ⚡ Produtos Prontos para Simular:
          </span>
          <div className="flex flex-wrap gap-2">
            {RETAIL_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleLoadPreset(preset)}
                className={`px-3 py-1.5 rounded-xl text-[10.5px] font-black transition-all flex items-center gap-1.5 cursor-pointer border ${
                  productName === preset.name
                    ? "bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-600/25"
                    : "bg-slate-900/90 hover:bg-blue-950/40 text-slate-300 hover:text-white border-white/10"
                }`}
              >
                <span>
                  {preset.name.includes("Arroz")
                    ? "🍚"
                    : preset.name.includes("Feijão")
                    ? "🫘"
                    : preset.name.includes("Óleo")
                    ? "🌻"
                    : preset.name.includes("Leite")
                    ? "🥛"
                    : "🧼"}
                </span>
                <span>{preset.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* INPUTS GRID */}
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4">
        <h4 className="text-xs font-black uppercase text-blue-400 flex items-center gap-1.5 border-b border-white/5 pb-2">
          <Layers className="w-4 h-4 text-blue-400" />
          1. Custos de Compra & Custos Invisíveis Diretos (Por Unidade)
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Product Name */}
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-slate-400 uppercase">
              Nome do Produto
            </label>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-bold outline-none focus:border-blue-400"
            />
          </div>

          {/* Purchase Price */}
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1">
              <DollarSign className="w-3 h-3 text-rose-400" />
              Preço de Compra Atacado (R$)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-xs text-slate-400 font-bold">R$</span>
              <input
                type="number"
                step="0.05"
                min="0"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-rose-500/30 rounded-xl pl-8 pr-3 py-2 text-xs text-rose-300 font-mono font-bold outline-none focus:border-rose-400"
              />
            </div>
          </div>

          {/* Freight / Gas */}
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1">
              <Fuel className="w-3 h-3 text-amber-400" />
              Gasolina & Frete Rateado (R$)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-xs text-slate-400 font-bold">R$</span>
              <input
                type="number"
                step="0.02"
                min="0"
                value={freightGasCost}
                onChange={(e) => setFreightGasCost(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-amber-300 font-mono font-bold outline-none focus:border-blue-400"
              />
            </div>
          </div>

          {/* Bag Cost */}
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1">
              <ShoppingBag className="w-3 h-3 text-cyan-400" />
              Sacola Plástica / Embalagem (R$)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-xs text-slate-400 font-bold">R$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={bagCost}
                onChange={(e) => setBagCost(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-cyan-300 font-mono font-bold outline-none focus:border-blue-400"
              />
            </div>
          </div>
        </div>

        {/* INVISIBLE RATES (Paper, Card, Rent, Tax, Spoilage) */}
        <h4 className="text-xs font-black uppercase text-amber-400 flex items-center gap-1.5 border-b border-white/5 pb-2 pt-2">
          <Percent className="w-4 h-4 text-amber-400" />
          2. Taxas Operacionais & Custos da Loja (%)
        </h4>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Printer Paper Roll */}
          <div className="space-y-1">
            <label className="text-[8.5px] font-bold text-slate-400 uppercase flex items-center gap-1">
              <Printer className="w-3 h-3 text-slate-400" />
              Bobina / Cupom (R$)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-xs text-slate-400 font-bold">R$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={paperRollCost}
                onChange={(e) => setPaperRollCost(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-white font-mono font-bold outline-none focus:border-blue-400"
              />
            </div>
          </div>

          {/* Card Fee */}
          <div className="space-y-1">
            <label className="text-[8.5px] font-bold text-slate-400 uppercase flex items-center gap-1">
              <CreditCard className="w-3 h-3 text-purple-400" />
              Taxa Maquininha (%)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="0"
                value={cardFeePct}
                onChange={(e) => setCardFeePct(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-purple-300 font-mono font-bold outline-none focus:border-blue-400"
              />
              <span className="absolute right-3 top-2 text-xs text-slate-500 font-bold">%</span>
            </div>
          </div>

          {/* Fixed Store Overhead */}
          <div className="space-y-1">
            <label className="text-[8.5px] font-bold text-slate-400 uppercase flex items-center gap-1">
              <Building2 className="w-3 h-3 text-indigo-400" />
              Aluguel/Luz Loja (%)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.5"
                min="0"
                value={storeFixedCostPct}
                onChange={(e) => setStoreFixedCostPct(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-indigo-300 font-mono font-bold outline-none focus:border-blue-400"
              />
              <span className="absolute right-3 top-2 text-xs text-slate-500 font-bold">%</span>
            </div>
          </div>

          {/* Taxes */}
          <div className="space-y-1">
            <label className="text-[8.5px] font-bold text-slate-400 uppercase">
              Impostos / MEI (%)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.5"
                min="0"
                value={taxPct}
                onChange={(e) => setTaxPct(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold outline-none focus:border-blue-400"
              />
              <span className="absolute right-3 top-2 text-xs text-slate-500 font-bold">%</span>
            </div>
          </div>

          {/* Spoilage / Waste */}
          <div className="space-y-1">
            <label className="text-[8.5px] font-bold text-slate-400 uppercase">
              Perdas & Furtos (%)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.5"
                min="0"
                value={wasteSpoilagePct}
                onChange={(e) => setWasteSpoilagePct(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold outline-none focus:border-blue-400"
              />
              <span className="absolute right-3 top-2 text-xs text-slate-500 font-bold">%</span>
            </div>
          </div>
        </div>
      </div>

      {/* PRICE COMPARISON & BREAKDOWN CARD */}
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4">
        <h4 className="text-xs font-black uppercase text-emerald-400 flex items-center gap-1.5 border-b border-white/5 pb-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          3. Preço Praticado no Balcão & Raio-X de Onde Vai Cada Centavo
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Target Margin Slider */}
          <div className="space-y-1.5 p-3.5 bg-slate-950 rounded-xl border border-white/5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300">Margem Líquida Alvo:</span>
              <strong className="text-purple-300 font-mono text-sm">{targetNetMarginPct}%</strong>
            </div>
            <input
              type="range"
              min="10"
              max="50"
              step="1"
              value={targetNetMarginPct}
              onChange={(e) => setTargetNetMarginPct(parseInt(e.target.value, 10) || 25)}
              className="w-full accent-purple-500 cursor-pointer"
            />
            <div className="flex justify-between items-center text-[9px] text-slate-400 pt-1">
              <span>Preço Sugerido Matemático:</span>
              <strong className="text-purple-300 font-mono text-xs">
                {formatCurrency(calculations.suggestedPrice)}
              </strong>
            </div>
          </div>

          {/* Practice Price Input */}
          <div className="space-y-1.5 p-3.5 bg-slate-950 rounded-xl border border-emerald-500/30">
            <label className="text-[9.5px] font-black text-emerald-400 uppercase block">
              Preço de Venda Real Praticado no Balcão:
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-2 text-xs text-slate-400 font-bold">R$</span>
                <input
                  type="number"
                  step="0.10"
                  min="0"
                  value={practicePrice}
                  onChange={(e) => setPracticePrice(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-emerald-500/40 rounded-xl pl-8 pr-3 py-1.5 text-base text-emerald-400 font-mono font-black outline-none focus:border-emerald-400"
                />
              </div>
              <button
                type="button"
                onClick={() => setPracticePrice(parseFloat(calculations.suggestedPrice.toFixed(2)))}
                className="px-2 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-[9px] font-black uppercase shrink-0 transition-all cursor-pointer"
                title="Copiar preço sugerido"
              >
                Usar Sugerido 💡
              </button>
            </div>
            <div className="flex justify-between items-center text-[9px] pt-1">
              <span className="text-slate-400">Lucro Líquido Limpo na Mão:</span>
              <strong className="text-emerald-400 font-mono text-xs">
                +{formatCurrency(calculations.cleanNetProfit)}
              </strong>
            </div>
          </div>

          {/* Volume Simulation */}
          <div className="space-y-1.5 p-3.5 bg-slate-950 rounded-xl border border-white/5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300">Vendas Diárias Estimadas:</span>
              <strong className="text-blue-300 font-mono text-sm">{simulatedDailyVolume} un/dia</strong>
            </div>
            <input
              type="range"
              min="5"
              max="200"
              step="5"
              value={simulatedDailyVolume}
              onChange={(e) => setSimulatedDailyVolume(parseInt(e.target.value, 10) || 30)}
              className="w-full accent-blue-500 cursor-pointer"
            />
            <div className="flex justify-between items-center text-[9px] text-slate-400 pt-1">
              <span>Lucro Mensal neste produto:</span>
              <strong className="text-emerald-400 font-mono text-xs">
                +{formatCurrency(calculations.monthlyProfit)}
              </strong>
            </div>
          </div>
        </div>

        {/* DECOMPOSITION BREAKDOWN: WHERE EVERY PENNY GOES */}
        <div className="p-4 bg-slate-950 rounded-xl border border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-amber-400" />
              Raio-X de Onde Vai Cada R$ Pago pelo Cliente ({formatCurrency(practicePrice)}):
            </span>
            <span className="text-[9.5px] font-mono font-bold text-slate-400">
              Custo Total Rateado: {formatCurrency(calculations.totalDeductionsAmount)}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2 bg-slate-900 rounded-lg border border-white/5">
              <span className="text-[8px] text-slate-400 uppercase block">1. Custo Produto</span>
              <strong className="text-rose-400 font-mono">{formatCurrency(purchasePrice)}</strong>
              <span className="text-[7.5px] text-slate-500 block">
                {practicePrice > 0 ? ((purchasePrice / practicePrice) * 100).toFixed(1) : 0}%
              </span>
            </div>

            <div className="p-2 bg-slate-900 rounded-lg border border-white/5">
              <span className="text-[8px] text-slate-400 uppercase block">2. Gasolina & Frete</span>
              <strong className="text-amber-400 font-mono">{formatCurrency(freightGasCost)}</strong>
              <span className="text-[7.5px] text-slate-500 block">
                {practicePrice > 0 ? ((freightGasCost / practicePrice) * 100).toFixed(1) : 0}%
              </span>
            </div>

            <div className="p-2 bg-slate-900 rounded-lg border border-white/5">
              <span className="text-[8px] text-slate-400 uppercase block">3. Sacola Plástica</span>
              <strong className="text-cyan-400 font-mono">{formatCurrency(bagCost)}</strong>
              <span className="text-[7.5px] text-slate-500 block">
                {practicePrice > 0 ? ((bagCost / practicePrice) * 100).toFixed(1) : 0}%
              </span>
            </div>

            <div className="p-2 bg-slate-900 rounded-lg border border-white/5">
              <span className="text-[8px] text-slate-400 uppercase block">4. Bobina Térmica</span>
              <strong className="text-slate-300 font-mono">{formatCurrency(paperRollCost)}</strong>
              <span className="text-[7.5px] text-slate-500 block">
                {practicePrice > 0 ? ((paperRollCost / practicePrice) * 100).toFixed(1) : 0}%
              </span>
            </div>

            <div className="p-2 bg-slate-900 rounded-lg border border-white/5">
              <span className="text-[8px] text-slate-400 uppercase block">5. Maquininha Cartão</span>
              <strong className="text-purple-400 font-mono">{formatCurrency(calculations.cardFeeAmount)}</strong>
              <span className="text-[7.5px] text-slate-500 block">{cardFeePct}%</span>
            </div>

            <div className="p-2 bg-slate-900 rounded-lg border border-white/5">
              <span className="text-[8px] text-slate-400 uppercase block">6. Aluguel/Luz Loja</span>
              <strong className="text-indigo-400 font-mono">{formatCurrency(calculations.storeFixedCostAmount)}</strong>
              <span className="text-[7.5px] text-slate-500 block">{storeFixedCostPct}%</span>
            </div>

            <div className="p-2 bg-slate-900 rounded-lg border border-white/5">
              <span className="text-[8px] text-slate-400 uppercase block">7. Impostos + Perdas</span>
              <strong className="text-orange-400 font-mono">
                {formatCurrency(calculations.taxAmount + calculations.wasteSpoilageAmount)}
              </strong>
              <span className="text-[7.5px] text-slate-500 block">{(taxPct + wasteSpoilagePct)}%</span>
            </div>

            <div className="p-2 bg-emerald-950/40 rounded-lg border border-emerald-500/30">
              <span className="text-[8px] text-emerald-300 font-black uppercase block">8. LUCRO LIMPO</span>
              <strong className="text-emerald-400 font-mono font-black text-sm">
                +{formatCurrency(calculations.cleanNetProfit)}
              </strong>
              <span className="text-[8px] text-emerald-300 font-extrabold block">
                {calculations.realNetMarginPct.toFixed(1)}% líquido
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
