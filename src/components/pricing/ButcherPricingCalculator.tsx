import React, { useState, useMemo } from "react";
import {
  Scale,
  Plus,
  Trash2,
  Share2,
  Check,
  TrendingUp,
  Percent,
  Sparkles,
  Info,
  DollarSign,
  AlertTriangle,
  RotateCcw,
  Layers,
  ChefHat
} from "lucide-react";

export interface CarcassCut {
  id: string;
  name: string;
  category: "nobre" | "segunda" | "moida" | "osso" | "gordura";
  yieldKg: number;
  sellPriceKg: number;
  color?: string;
}

export interface ButcherPreset {
  name: string;
  animalType: "bovino" | "suino" | "frango" | "ovino";
  carcassWeight: number; // kg
  costPerKg: number; // R$/kg
  overheadCost: number; // R$ câmara fria/desossa
  targetMarginPct: number; // %
  cuts: Omit<CarcassCut, "id">[];
}

export const BUTCHER_PRESETS: ButcherPreset[] = [
  {
    name: "Meio Porco / Suíno Completo (Carcaça 60 kg)",
    animalType: "suino",
    carcassWeight: 60,
    costPerKg: 13.50, // Custo total = R$ 810,00
    overheadCost: 35.00, // Custo de refrigeração + sacolas e desossa
    targetMarginPct: 35,
    cuts: [
      { name: "Pernil Suíno com Couro", category: "nobre", yieldKg: 16.5, sellPriceKg: 22.90 },
      { name: "Lombo Suíno Limpo", category: "nobre", yieldKg: 8.5, sellPriceKg: 28.90 },
      { name: "Costelinha Suína Especial", category: "nobre", yieldKg: 5.5, sellPriceKg: 32.90 },
      { name: "Panceta / Barriga para Torresmo", category: "nobre", yieldKg: 6.0, sellPriceKg: 29.90 },
      { name: "Copa Lombo / Sobrepaleta", category: "segunda", yieldKg: 4.5, sellPriceKg: 24.90 },
      { name: "Bisteca Suína Fatiada", category: "segunda", yieldKg: 6.5, sellPriceKg: 21.90 },
      { name: "Toucinho / Banha Suína", category: "gordura", yieldKg: 3.5, sellPriceKg: 10.90 },
      { name: "Carne Moída Suína / Recortes", category: "moida", yieldKg: 2.5, sellPriceKg: 17.90 },
      { name: "Ossos da Carcaça para Caldo/Feijoada", category: "osso", yieldKg: 4.5, sellPriceKg: 4.50 },
      { name: "Quebra e Aparas de Desossa", category: "gordura", yieldKg: 2.0, sellPriceKg: 0.00 }
    ]
  },
  {
    name: "Quarto Traseiro Bovino Serrote (100 kg)",
    animalType: "bovino",
    carcassWeight: 100,
    costPerKg: 23.50, // Custo = R$ 2.350,00
    overheadCost: 60.00,
    targetMarginPct: 38,
    cuts: [
      { name: "Picanha Bovina Traseiro", category: "nobre", yieldKg: 2.2, sellPriceKg: 79.90 },
      { name: "Filé Mignon Traseiro", category: "nobre", yieldKg: 2.6, sellPriceKg: 74.90 },
      { name: "Contrafilé Especial", category: "nobre", yieldKg: 11.5, sellPriceKg: 48.90 },
      { name: "Alcatra com Maminha", category: "nobre", yieldKg: 10.5, sellPriceKg: 46.90 },
      { name: "Coxão Mole Selecionado", category: "nobre", yieldKg: 13.5, sellPriceKg: 38.90 },
      { name: "Patinho Traseiro Limpo", category: "nobre", yieldKg: 9.8, sellPriceKg: 38.90 },
      { name: "Coxão Duro / Chã de Fora", category: "segunda", yieldKg: 8.5, sellPriceKg: 34.90 },
      { name: "Lagarto Traseiro Redondo", category: "segunda", yieldKg: 4.2, sellPriceKg: 36.90 },
      { name: "Músculo Traseiro", category: "segunda", yieldKg: 5.5, sellPriceKg: 29.90 },
      { name: "Carne Moída / Recortes Traseiro", category: "moida", yieldKg: 7.5, sellPriceKg: 27.90 },
      { name: "Ossos Traseiros (Tutano/Sopa)", category: "osso", yieldKg: 16.5, sellPriceKg: 4.00 },
      { name: "Sebo, Pelancas & Quebra de Desossa", category: "gordura", yieldKg: 7.7, sellPriceKg: 1.00 }
    ]
  },
  {
    name: "Quarto Dianteiro Bovino com Osso (80 kg)",
    animalType: "bovino",
    carcassWeight: 80,
    costPerKg: 17.50, // Custo = R$ 1.400,00
    overheadCost: 50.00,
    targetMarginPct: 35,
    cuts: [
      { name: "Acém Dianteiro Fatiado/Cubo", category: "segunda", yieldKg: 18.5, sellPriceKg: 29.90 },
      { name: "Paleta Bovina Fatiada", category: "segunda", yieldKg: 14.0, sellPriceKg: 31.90 },
      { name: "Peito Bovino com Gordura", category: "segunda", yieldKg: 8.5, sellPriceKg: 27.90 },
      { name: "Músculo Dianteiro para Panela", category: "segunda", yieldKg: 7.2, sellPriceKg: 28.90 },
      { name: "Costela Gaúcha Dianteira", category: "nobre", yieldKg: 12.0, sellPriceKg: 29.90 },
      { name: "Carne Moída Dianteiro Especial", category: "moida", yieldKg: 7.0, sellPriceKg: 24.90 },
      { name: "Ossos do Dianteiro para Caldo", category: "osso", yieldKg: 9.8, sellPriceKg: 3.50 },
      { name: "Sebo & Quebra de Desossa", category: "gordura", yieldKg: 3.0, sellPriceKg: 0.50 }
    ]
  },
  {
    name: "Caixa Frango Inteiro / Desossa (20 kg)",
    animalType: "frango",
    carcassWeight: 20,
    costPerKg: 8.90, // Custo = R$ 178,00
    overheadCost: 15.00,
    targetMarginPct: 40,
    cuts: [
      { name: "Filé de Peito de Frango Limpo", category: "nobre", yieldKg: 6.8, sellPriceKg: 21.90 },
      { name: "Coxa e Sobrecoxa com Pele", category: "segunda", yieldKg: 6.5, sellPriceKg: 14.90 },
      { name: "Asinha de Frango / Tulipa", category: "nobre", yieldKg: 2.4, sellPriceKg: 23.90 },
      { name: "Moela & Fígado de Frango", category: "segunda", yieldKg: 1.2, sellPriceKg: 12.90 },
      { name: "Dorso / Carcaça com Osso para Canja", category: "osso", yieldKg: 2.6, sellPriceKg: 4.00 },
      { name: "Gordura & Perda por Limpeza", category: "gordura", yieldKg: 0.5, sellPriceKg: 0.00 }
    ]
  }
];

interface ButcherPricingCalculatorProps {
  formatCurrency?: (val: number) => string;
  showNotification: (msg: string, type: "success" | "error" | "info" | "warning") => void;
  onApplyToPDVCatalog?: (product: {
    name: string;
    costPrice: number;
    salePrice: number;
    category: string;
  }) => void;
}

export function ButcherPricingCalculator({
  formatCurrency = (v) => `R$ ${v.toFixed(2).replace(".", ",")}`,
  showNotification,
  onApplyToPDVCatalog
}: ButcherPricingCalculatorProps) {
  const [selectedPresetName, setSelectedPresetName] = useState<string>(BUTCHER_PRESETS[0].name);
  const [carcassName, setCarcassName] = useState<string>(BUTCHER_PRESETS[0].name);
  const [carcassWeight, setCarcassWeight] = useState<number>(BUTCHER_PRESETS[0].carcassWeight);
  const [costPerKg, setCostPerKg] = useState<number>(BUTCHER_PRESETS[0].costPerKg);
  const [overheadCost, setOverheadCost] = useState<number>(BUTCHER_PRESETS[0].overheadCost);
  const [targetMarginPct, setTargetMarginPct] = useState<number>(BUTCHER_PRESETS[0].targetMarginPct);

  const [cuts, setCuts] = useState<CarcassCut[]>(() =>
    BUTCHER_PRESETS[0].cuts.map((c, idx) => ({ ...c, id: `cut_${idx}_${Date.now()}` }))
  );

  // Calculations
  const calculations = useMemo(() => {
    const rawPurchaseCost = carcassWeight * costPerKg;
    const totalCost = rawPurchaseCost + overheadCost;

    const sumCutWeight = cuts.reduce((acc, c) => acc + (Number(c.yieldKg) || 0), 0);
    const weightDifference = carcassWeight - sumCutWeight;
    const deboningLossPct = carcassWeight > 0 ? (weightDifference / carcassWeight) * 100 : 0;

    // Total revenue generated by all cuts
    const totalRevenue = cuts.reduce((acc, c) => acc + ((Number(c.yieldKg) || 0) * (Number(c.sellPriceKg) || 0)), 0);

    const grossProfit = totalRevenue - totalCost;
    const overallMarginPct = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    // Usable edible meat (noble + second + minced) excluding pure bones and pure waste
    const usableMeatKg = cuts
      .filter((c) => c.category !== "osso" && c.category !== "gordura")
      .reduce((acc, c) => acc + (Number(c.yieldKg) || 0), 0);

    // Revenue from secondary byproducts (bones, fat)
    const byproductRevenue = cuts
      .filter((c) => c.category === "osso" || c.category === "gordura")
      .reduce((acc, c) => acc + ((Number(c.yieldKg) || 0) * (Number(c.sellPriceKg) || 0)), 0);

    // Effective real cost per kg of usable meat
    const netCostToUsableMeat = Math.max(0, totalCost - byproductRevenue);
    const effectiveUsableCostPerKg = usableMeatKg > 0 ? netCostToUsableMeat / usableMeatKg : 0;

    // Suggested minimum revenue to reach butcher's target margin:
    // Revenue = TotalCost / (1 - targetMarginPct / 100)
    const suggestedTargetRevenue = targetMarginPct < 100 ? totalCost / (1 - (targetMarginPct / 100)) : totalCost * 1.5;

    return {
      rawPurchaseCost,
      totalCost,
      sumCutWeight,
      weightDifference,
      deboningLossPct,
      totalRevenue,
      grossProfit,
      overallMarginPct,
      usableMeatKg,
      byproductRevenue,
      effectiveUsableCostPerKg,
      suggestedTargetRevenue
    };
  }, [carcassWeight, costPerKg, overheadCost, targetMarginPct, cuts]);

  // Load Preset
  const handleLoadPreset = (preset: ButcherPreset) => {
    setSelectedPresetName(preset.name);
    setCarcassName(preset.name);
    setCarcassWeight(preset.carcassWeight);
    setCostPerKg(preset.costPerKg);
    setOverheadCost(preset.overheadCost);
    setTargetMarginPct(preset.targetMarginPct);
    setCuts(preset.cuts.map((c, idx) => ({ ...c, id: `cut_${idx}_${Date.now()}` })));
    showNotification(`Carcaça ${preset.name} carregada com sucesso! 🥩`, "info");
  };

  // Add Cut
  const handleAddCut = () => {
    const newCut: CarcassCut = {
      id: `cut_${Date.now()}`,
      name: "Novo Corte de Carne",
      category: "segunda",
      yieldKg: 2.0,
      sellPriceKg: Math.round(costPerKg * 1.5)
    };
    setCuts([...cuts, newCut]);
  };

  // Update Cut
  const handleUpdateCut = (id: string, field: keyof CarcassCut, value: any) => {
    setCuts(cuts.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  };

  // Remove Cut
  const handleRemoveCut = (id: string) => {
    if (cuts.length <= 1) {
      showNotification("A carcaça precisa de pelo menos 1 corte!", "warning");
      return;
    }
    setCuts(cuts.filter((c) => c.id !== id));
  };

  // Export Cut to PDV
  const handleExportCutToPDV = (cut: CarcassCut) => {
    if (!onApplyToPDVCatalog) return;
    // Calculate estimated cost for this cut based on weight ratio or effective cost
    const cutCostPrice = cut.category === "nobre" 
      ? calculations.effectiveUsableCostPerKg * 1.2
      : cut.category === "segunda"
      ? calculations.effectiveUsableCostPerKg * 0.95
      : cut.category === "osso"
      ? costPerKg * 0.25
      : calculations.effectiveUsableCostPerKg * 0.8;

    onApplyToPDVCatalog({
      name: `${cut.name} (Açougue kg)`,
      costPrice: parseFloat(cutCostPrice.toFixed(2)),
      salePrice: cut.sellPriceKg,
      category: "Carnes & Açougue"
    });
    showNotification(`Corte "${cut.name}" adicionado ao PDV a ${formatCurrency(cut.sellPriceKg)}/kg! 🥩`, "success");
  };

  // Export ALL Cuts to PDV
  const handleExportAllCuts = () => {
    if (!onApplyToPDVCatalog) return;
    cuts.forEach((cut) => {
      const cutCostPrice = cut.category === "nobre" 
        ? calculations.effectiveUsableCostPerKg * 1.2
        : cut.category === "segunda"
        ? calculations.effectiveUsableCostPerKg * 0.95
        : cut.category === "osso"
        ? costPerKg * 0.25
        : calculations.effectiveUsableCostPerKg * 0.8;

      onApplyToPDVCatalog({
        name: `${cut.name} (Açougue kg)`,
        costPrice: parseFloat(cutCostPrice.toFixed(2)),
        salePrice: cut.sellPriceKg,
        category: "Carnes & Açougue"
      });
    });
    showNotification(`Todos os ${cuts.length} cortes foram atualizados no catálogo do PDV! 🥩`, "success");
  };

  // Share WhatsApp
  const handleShareWhatsApp = () => {
    let msg = `🥩 *FICHA TÉCNICA DE DESOSSA & AÇOUGUE*\n`;
    msg += `📦 *Carcaça:* ${carcassName}\n`;
    msg += `⚖️ *Peso Bruto:* ${carcassWeight.toFixed(1)} kg | *Custo:* ${formatCurrency(costPerKg)}/kg\n`;
    msg += `💰 *Custo Total da Peça:* ${formatCurrency(calculations.totalCost)} (inc. ${formatCurrency(overheadCost)} refrigeração/sacolas)\n\n`;
    msg += `📋 *DISTRIBUIÇÃO DOS CORTES:*\n`;

    cuts.forEach((c) => {
      const subtotal = c.yieldKg * c.sellPriceKg;
      msg += `• *${c.name}*: ${c.yieldKg.toFixed(1)} kg x ${formatCurrency(c.sellPriceKg)}/kg = ${formatCurrency(subtotal)}\n`;
    });

    msg += `\n📊 *RESUMO DO RENDIMENTO & LUCRO:*\n`;
    msg += `• *Soma dos Cortes:* ${calculations.sumCutWeight.toFixed(1)} kg (Quebra: ${calculations.weightDifference.toFixed(1)} kg / ${calculations.deboningLossPct.toFixed(1)}%)\n`;
    msg += `• *Carne Limpa Desossada:* ${calculations.usableMeatKg.toFixed(1)} kg\n`;
    msg += `• *Custo Efetivo do kg Limpo:* ${formatCurrency(calculations.effectiveUsableCostPerKg)}/kg\n`;
    msg += `• *Faturamento Bruto da Peça:* ${formatCurrency(calculations.totalRevenue)}\n`;
    msg += `• *Lucro Líquido do Açougue:* ${formatCurrency(calculations.grossProfit)}\n`;
    msg += `• *Margem Real da Carcaça:* ${calculations.overallMarginPct.toFixed(1)}%\n\n`;
    msg += `_Gerado com precisão pelo Cérebro Inteligente PDV 🚀_`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* HEADER CARD */}
      <div className="bg-gradient-to-r from-red-950/80 via-slate-900 to-slate-950 border border-red-500/30 rounded-2xl p-4 sm:p-5 shadow-xl text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-600 text-white rounded-xl shadow-lg shadow-red-600/30 shrink-0">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[9.5px] font-black uppercase text-red-400 tracking-wider">
                  Módulo Açougue & Casa de Carnes
                </span>
                <span className="px-2 py-0.5 bg-red-500/20 text-red-300 text-[8.5px] font-black uppercase rounded-full border border-red-500/30">
                  Desossa & Rendimento de Carcaça
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2 mt-0.5">
                Calculadora Minuciosa de Desossa & Rateio dos Cortes 🥩
              </h3>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-[10px] uppercase tracking-wider rounded-xl transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/15"
              title="Compartilhar análise de desossa no WhatsApp"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Enviar no WhatsApp</span>
            </button>
            <button
              type="button"
              onClick={handleExportAllCuts}
              className="px-3 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-md shadow-red-600/25"
              title="Enviar todos os cortes calculados para o catálogo do PDV"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Salvar Todos no PDV</span>
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-300 font-medium leading-relaxed mt-2.5">
          Comprou um <strong>porco inteiro, quarto traseiro de boi ou carcaça com osso</strong>? No açougue você não pode simplesmente jogar 40% em tudo, porque ninguém paga caro por osso ou sebo. Esta calculadora divide cada corte (picanha, alcatra, costela, moída, ossos e quebra de desossa) e mostra exatamente o <strong>custo real do kg limpo</strong>, o faturamento total da peça e o lucro real do açougueiro!
        </p>

        {/* PRESET SHORTCUTS */}
        <div className="mt-3.5 pt-3 border-t border-white/5">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-2">
            ⚡ Carcaças Prontas para Testar (1 Toque):
          </span>
          <div className="flex flex-wrap gap-2">
            {BUTCHER_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleLoadPreset(preset)}
                className={`px-3 py-1.5 rounded-xl text-[10.5px] font-black transition-all flex items-center gap-1.5 cursor-pointer border ${
                  selectedPresetName === preset.name
                    ? "bg-red-600 text-white border-red-400 shadow-md shadow-red-600/30"
                    : "bg-slate-900/90 hover:bg-red-950/40 text-slate-300 hover:text-white border-white/10"
                }`}
              >
                <span>
                  {preset.animalType === "suino"
                    ? "🐖"
                    : preset.animalType === "bovino"
                    ? "🥩"
                    : preset.animalType === "frango"
                    ? "🍗"
                    : "🐑"}
                </span>
                <span>{preset.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CARCASS PURCHASE INPUTS */}
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4 text-left">
        <h4 className="text-xs font-black uppercase text-red-400 flex items-center gap-1.5 border-b border-white/5 pb-2">
          <Scale className="w-4 h-4 text-red-400" />
          1. Dados da Carcaça / Peça com Osso Comprada
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-slate-400 uppercase">
              Nome da Peça / Fornecedor
            </label>
            <input
              type="text"
              value={carcassName}
              onChange={(e) => setCarcassName(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-bold outline-none focus:border-red-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-bold text-slate-400 uppercase">
              Peso da Carcaça na Balança (kg)
            </label>
            <input
              type="number"
              step="0.5"
              min="1"
              value={carcassWeight}
              onChange={(e) => setCarcassWeight(Math.max(0.1, parseFloat(e.target.value) || 0))}
              className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold outline-none focus:border-red-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-bold text-slate-400 uppercase">
              Preço Pago por kg na Carcaça (R$)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-xs text-slate-400 font-bold">R$</span>
              <input
                type="number"
                step="0.10"
                min="0"
                value={costPerKg}
                onChange={(e) => setCostPerKg(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-white font-mono font-bold outline-none focus:border-red-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-bold text-slate-400 uppercase">
              Câmara Fria, Luz & Sacolas (R$)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-xs text-slate-400 font-bold">R$</span>
              <input
                type="number"
                step="1"
                min="0"
                value={overheadCost}
                onChange={(e) => setOverheadCost(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-white font-mono font-bold outline-none focus:border-red-500"
              />
            </div>
          </div>
        </div>

        {/* FINANCIAL SUMMARY TILES */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
          <div className="p-3 bg-slate-950/80 rounded-xl border border-white/5 space-y-1">
            <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider block">
              Custo Total da Peça
            </span>
            <span className="text-base font-black text-rose-400 font-mono">
              {formatCurrency(calculations.totalCost)}
            </span>
            <span className="text-[8px] text-slate-500 block">
              {carcassWeight.toFixed(1)} kg x {formatCurrency(costPerKg)} + R$ {overheadCost}
            </span>
          </div>

          <div className="p-3 bg-slate-950/80 rounded-xl border border-white/5 space-y-1">
            <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider block">
              Soma dos Cortes Pesados
            </span>
            <span className="text-base font-black text-white font-mono">
              {calculations.sumCutWeight.toFixed(1)} kg
            </span>
            <span className={`text-[8px] font-bold block ${
              calculations.weightDifference > 0 ? "text-amber-400" : "text-emerald-400"
            }`}>
              {calculations.weightDifference > 0 
                ? `Quebra: ${calculations.weightDifference.toFixed(1)} kg (${calculations.deboningLossPct.toFixed(1)}%)`
                : "Balança 100% batendo ✔️"}
            </span>
          </div>

          <div className="p-3 bg-slate-950/80 rounded-xl border border-white/5 space-y-1">
            <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider block">
              Custo Real do kg Limpo
            </span>
            <span className="text-base font-black text-amber-400 font-mono">
              {formatCurrency(calculations.effectiveUsableCostPerKg)} / kg
            </span>
            <span className="text-[8px] text-slate-500 block">
              Sem contar ossos e sebo
            </span>
          </div>

          <div className="p-3 bg-emerald-950/30 rounded-xl border border-emerald-500/20 space-y-1">
            <span className="text-[8.5px] font-black text-emerald-400 uppercase tracking-wider block">
              Lucro Real da Carcaça
            </span>
            <span className="text-base font-black text-emerald-400 font-mono">
              +{formatCurrency(calculations.grossProfit)}
            </span>
            <span className="text-[8px] text-emerald-300 font-extrabold block">
              Margem Geral: {calculations.overallMarginPct.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* CUTS TABLE & DESOSSA */}
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4 text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2">
          <div>
            <h4 className="text-xs font-black uppercase text-amber-400 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-amber-400" />
              2. Cortes da Desossa, Peso Obtido e Preço de Venda Praticado
            </h4>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Ajuste os quilos e os preços de cada corte para ver o lucro total fechar com perfeição.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddCut}
            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            Adicionar Corte
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-[9px] uppercase font-black text-slate-400 tracking-wider">
                <th className="py-2 pr-2">Corte / Peça</th>
                <th className="py-2 px-2">Tipo / Categoria</th>
                <th className="py-2 px-2 text-right">Peso Obtido (kg)</th>
                <th className="py-2 px-2 text-right">Venda (R$/kg)</th>
                <th className="py-2 px-2 text-right">Subtotal Venda</th>
                <th className="py-2 pl-2 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {cuts.map((cut) => {
                const subtotal = (Number(cut.yieldKg) || 0) * (Number(cut.sellPriceKg) || 0);
                const cutWeightPct = carcassWeight > 0 ? ((cut.yieldKg / carcassWeight) * 100) : 0;

                return (
                  <tr key={cut.id} className="hover:bg-white/[0.02] transition-colors">
                    {/* Cut Name */}
                    <td className="py-2 pr-2">
                      <input
                        type="text"
                        value={cut.name}
                        onChange={(e) => handleUpdateCut(cut.id, "name", e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white font-bold outline-none focus:border-red-500"
                      />
                    </td>

                    {/* Category */}
                    <td className="py-2 px-2">
                      <select
                        value={cut.category}
                        onChange={(e) => handleUpdateCut(cut.id, "category", e.target.value)}
                        className="bg-slate-950 border border-white/10 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-300 outline-none focus:border-red-500"
                      >
                        <option value="nobre">1ª / Nobre (Picanha, Filé)</option>
                        <option value="segunda">2ª / Dia a Dia (Acém, Paleta)</option>
                        <option value="moida">Moída / Recortes</option>
                        <option value="osso">Ossos / Sopa</option>
                        <option value="gordura">Gordura / Descarte / Quebra</option>
                      </select>
                    </td>

                    {/* Weight */}
                    <td className="py-2 px-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={cut.yieldKg}
                          onChange={(e) => handleUpdateCut(cut.id, "yieldKg", parseFloat(e.target.value) || 0)}
                          className="w-16 bg-slate-950 border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-mono text-right outline-none focus:border-red-500"
                        />
                        <span className="text-[9px] text-slate-500 w-8 text-left font-mono">
                          {cutWeightPct.toFixed(0)}%
                        </span>
                      </div>
                    </td>

                    {/* Sell Price per kg */}
                    <td className="py-2 px-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-[10px] text-slate-500">R$</span>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={cut.sellPriceKg}
                          onChange={(e) => handleUpdateCut(cut.id, "sellPriceKg", parseFloat(e.target.value) || 0)}
                          className="w-20 bg-slate-950 border border-emerald-500/30 rounded-lg px-2 py-1 text-xs text-emerald-400 font-mono font-bold text-right outline-none focus:border-emerald-400"
                        />
                      </div>
                    </td>

                    {/* Subtotal */}
                    <td className="py-2 px-2 text-right font-mono font-bold text-white text-xs">
                      {formatCurrency(subtotal)}
                    </td>

                    {/* Actions */}
                    <td className="py-2 pl-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleExportCutToPDV(cut)}
                          className="p-1.5 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 rounded-lg transition-colors cursor-pointer"
                          title="Enviar este corte para o PDV"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveCut(cut.id)}
                          className="p-1.5 bg-red-600/10 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors cursor-pointer"
                          title="Excluir corte"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-white/10 font-black text-xs">
                <td colSpan={2} className="py-3 text-slate-300 uppercase tracking-wider">
                  TOTALIZADOR DA PEÇA INTEIRA:
                </td>
                <td className="py-3 px-2 text-right font-mono text-amber-400">
                  {calculations.sumCutWeight.toFixed(1)} kg
                </td>
                <td className="py-3 px-2 text-right text-slate-400">
                  Média: {formatCurrency(calculations.sumCutWeight > 0 ? calculations.totalRevenue / calculations.sumCutWeight : 0)}/kg
                </td>
                <td className="py-3 px-2 text-right font-mono text-emerald-400 text-sm">
                  {formatCurrency(calculations.totalRevenue)}
                </td>
                <td className="py-3 pl-2"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* BUTCHER PROFITABILITY DIAGNOSTIC CARD */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-950 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4 text-left">
        <h4 className="text-xs font-black uppercase text-purple-400 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-purple-400" />
          3. Diagnóstico de Rentabilidade do Açougue & Ponto de Equilíbrio
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3.5 bg-slate-950 rounded-xl border border-white/5 space-y-2">
            <span className="text-[9.5px] font-black uppercase text-slate-400 tracking-wider block">
              Carne Nobre vs Ossos & Quebra
            </span>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Cortes Nobres & 2ª:</span>
                <strong className="text-white font-mono">{calculations.usableMeatKg.toFixed(1)} kg ({((calculations.usableMeatKg / (carcassWeight || 1)) * 100).toFixed(0)}%)</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Ossos e Gorduras:</span>
                <strong className="text-amber-400 font-mono">
                  {(carcassWeight - calculations.usableMeatKg).toFixed(1)} kg
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Subproduto (Ossos/Gordura):</span>
                <strong className="text-slate-300 font-mono">{formatCurrency(calculations.byproductRevenue)}</strong>
              </div>
            </div>
          </div>

          <div className="p-3.5 bg-slate-950 rounded-xl border border-white/5 space-y-2">
            <span className="text-[9.5px] font-black uppercase text-slate-400 tracking-wider block">
              Ponto de Equilíbrio (Zero a Zero)
            </span>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Receita Mínima para Pagar a Peça:</span>
                <strong className="text-rose-400 font-mono">{formatCurrency(calculations.totalCost)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Receita Real Praticada:</span>
                <strong className="text-emerald-400 font-mono">{formatCurrency(calculations.totalRevenue)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status da Desossa:</span>
                <strong className="text-emerald-400 font-black">
                  {calculations.grossProfit >= 0 ? "LUCRO GARANTIDO ✔️" : "PREJUÍZO NA PEÇA ❌"}
                </strong>
              </div>
            </div>
          </div>

          <div className="p-3.5 bg-purple-950/20 rounded-xl border border-purple-500/20 space-y-2">
            <span className="text-[9.5px] font-black uppercase text-purple-300 tracking-wider block">
              Meta de Margem do Açougue
            </span>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="15"
                max="60"
                step="5"
                value={targetMarginPct}
                onChange={(e) => setTargetMarginPct(parseInt(e.target.value, 10) || 35)}
                className="flex-1 accent-purple-500 cursor-pointer"
              />
              <span className="font-mono font-black text-purple-300 text-sm">{targetMarginPct}%</span>
            </div>
            <p className="text-[8.5px] text-slate-400 leading-tight">
              Para atingir <strong>{targetMarginPct}% de margem</strong>, a peça deveria render no total{" "}
              <strong className="text-purple-300 font-mono">{formatCurrency(calculations.suggestedTargetRevenue)}</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
