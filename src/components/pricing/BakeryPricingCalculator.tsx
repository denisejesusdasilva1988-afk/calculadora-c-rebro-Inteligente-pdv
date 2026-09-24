import React, { useState, useMemo } from "react";
import {
  Wheat,
  Coffee,
  Flame,
  Plus,
  Trash2,
  Share2,
  Check,
  TrendingUp,
  Percent,
  Sparkles,
  Info,
  DollarSign,
  Scale,
  Cake,
  Package
} from "lucide-react";

export interface BakeryIngredient {
  id: string;
  name: string;
  packageQty: number; // ex: 25 ou 1000
  packageUnit: "kg" | "g" | "L" | "ml" | "un";
  packageCost: number; // ex: 90.00
  usedQty: number; // ex: 1000
  usedUnit: "g" | "kg" | "ml" | "L" | "un";
}

export interface BakeryItemPreset {
  id: string;
  name: string;
  type: "pao" | "cafe" | "confeitaria" | "salgado";
  category: string;
  batchYield: number; // ex: 800 pães ou 111 cafés
  batchYieldUnit: string; // ex: "pãezinhos (50g)" ou "xícaras de café"
  bakingLossPct: number; // Quebra no forno (evaporação da água) ex: 14%
  ovenGasEnergyCost: number; // Gás/elétrico do forno por fornada
  packagingCostTotal: number; // Sacos de papel kraft ou copos
  targetMarginPct: number;
  currentSellPrice: number;
  ingredients: BakeryIngredient[];
}

export const BAKERY_PRESETS: BakeryItemPreset[] = [
  {
    id: "pao_frances",
    name: "Fornada Pão Francês Tradicional (1 Saco Trigo 25kg)",
    type: "pao",
    category: "Padaria & Fornada",
    batchYield: 750, // 750 pães de 50g assados (~37.5 kg de pão assado)
    batchYieldUnit: "pãezinhos de 50g",
    bakingLossPct: 15, // Massa crua perde 15% de água no forno
    ovenGasEnergyCost: 35.00, // Custo do forno industrial a gás por fornada
    packagingCostTotal: 18.00, // Sacos de papel kraft para embalar
    targetMarginPct: 60,
    currentSellPrice: 0.90, // R$ 0,90 a unidade ou ~R$ 18,00/kg
    ingredients: [
      {
        id: "ing_pf1",
        name: "Farinha de Trigo Especial Panificação",
        packageQty: 25,
        packageUnit: "kg",
        packageCost: 95.00,
        usedQty: 25,
        usedUnit: "kg"
      },
      {
        id: "ing_pf2",
        name: "Água Gelada Filtrada",
        packageQty: 1000,
        packageUnit: "L",
        packageCost: 15.00,
        usedQty: 14.5,
        usedUnit: "L"
      },
      {
        id: "ing_pf3",
        name: "Fermento Biológico Fresco",
        packageQty: 500,
        packageUnit: "g",
        packageCost: 9.50,
        usedQty: 400,
        usedUnit: "g"
      },
      {
        id: "ing_pf4",
        name: "Sal Refinado Especial",
        packageQty: 1,
        packageUnit: "kg",
        packageCost: 3.50,
        usedQty: 500,
        usedUnit: "g"
      },
      {
        id: "ing_pf5",
        name: "Melhorador de Farinha / Aditivo",
        packageQty: 500,
        packageUnit: "g",
        packageCost: 14.00,
        usedQty: 250,
        usedUnit: "g"
      }
    ]
  },
  {
    id: "cafe_expresso",
    name: "Café Expresso da Casa (1 Pacote Café em Grãos 1kg)",
    type: "cafe",
    category: "Cafeteria & Bebidas",
    batchYield: 111, // 1kg / 9g = 111 doses individuais
    batchYieldUnit: "doses / xícaras de café",
    bakingLossPct: 0,
    ovenGasEnergyCost: 12.00, // Energia da máquina de expresso profissional e moinho
    packagingCostTotal: 38.85, // Copinhos descartáveis térmicos 100ml c/ tampa + mexedor + sachê de açúcar (R$ 0,35 cada)
    targetMarginPct: 80,
    currentSellPrice: 5.50, // Preço praticado no balcão
    ingredients: [
      {
        id: "ing_cfe1",
        name: "Café Especial Gourmet em Grãos (100% Arábica)",
        packageQty: 1,
        packageUnit: "kg",
        packageCost: 68.00,
        usedQty: 1,
        usedUnit: "kg"
      },
      {
        id: "ing_cfe2",
        name: "Água Filtrada / Desmineralizada",
        packageQty: 20,
        packageUnit: "L",
        packageCost: 12.00,
        usedQty: 6,
        usedUnit: "L"
      },
      {
        id: "ing_cfe3",
        name: "Sachês de Açúcar Cristal (5g) e Adoçante",
        packageQty: 200,
        packageUnit: "un",
        packageCost: 16.00,
        usedQty: 111,
        usedUnit: "un"
      }
    ]
  },
  {
    id: "pao_de_queijo",
    name: "Pão de Queijo Mineiro Artesanal (Cento / 100 Unidades)",
    type: "pao",
    category: "Padaria & Salgados",
    batchYield: 100,
    batchYieldUnit: "unidades de 40g",
    bakingLossPct: 10,
    ovenGasEnergyCost: 8.00,
    packagingCostTotal: 5.00,
    targetMarginPct: 65,
    currentSellPrice: 2.50,
    ingredients: [
      {
        id: "ing_pq1",
        name: "Polvilho Doce / Azedo",
        packageQty: 1,
        packageUnit: "kg",
        packageCost: 11.00,
        usedQty: 1,
        usedUnit: "kg"
      },
      {
        id: "ing_pq2",
        name: "Queijo Meia Cura / Canastra Ralado",
        packageQty: 1,
        packageUnit: "kg",
        packageCost: 48.00,
        usedQty: 600,
        usedUnit: "g"
      },
      {
        id: "ing_pq3",
        name: "Leite Integral Pasteurizado",
        packageQty: 1,
        packageUnit: "L",
        packageCost: 5.20,
        usedQty: 400,
        usedUnit: "ml"
      },
      {
        id: "ing_pq4",
        name: "Óleo de Soja / Manteiga",
        packageQty: 900,
        packageUnit: "ml",
        packageCost: 6.50,
        usedQty: 200,
        usedUnit: "ml"
      },
      {
        id: "ing_pq5",
        name: "Ovos Frescos Selecionados",
        packageQty: 30,
        packageUnit: "un",
        packageCost: 22.00,
        usedQty: 6,
        usedUnit: "un"
      },
      {
        id: "ing_pq6",
        name: "Sal Refinado",
        packageQty: 1,
        packageUnit: "kg",
        packageCost: 3.50,
        usedQty: 30,
        usedUnit: "g"
      }
    ]
  },
  {
    id: "bolo_cenoura_vulcao",
    name: "Bolo de Cenoura com Vulcão de Brigadeiro (Forma Inteira / 10 Fatias)",
    type: "confeitaria",
    category: "Confeitaria & Bolos",
    batchYield: 10,
    batchYieldUnit: "fatias generosas",
    bakingLossPct: 8,
    ovenGasEnergyCost: 6.00,
    packagingCostTotal: 4.50, // Embalagem triangular de fatia ou forma com tampa
    targetMarginPct: 65,
    currentSellPrice: 8.50, // Preço da fatia (ou R$ 65,00 o bolo inteiro)
    ingredients: [
      {
        id: "ing_bc1",
        name: "Cenouras Frescas",
        packageQty: 1,
        packageUnit: "kg",
        packageCost: 6.50,
        usedQty: 400,
        usedUnit: "g"
      },
      {
        id: "ing_bc2",
        name: "Farinha de Trigo Especial",
        packageQty: 1,
        packageUnit: "kg",
        packageCost: 5.50,
        usedQty: 450,
        usedUnit: "g"
      },
      {
        id: "ing_bc3",
        name: "Açúcar Cristal",
        packageQty: 1,
        packageUnit: "kg",
        packageCost: 4.80,
        usedQty: 400,
        usedUnit: "g"
      },
      {
        id: "ing_bc4",
        name: "Ovos Grandes",
        packageQty: 12,
        packageUnit: "un",
        packageCost: 10.00,
        usedQty: 4,
        usedUnit: "un"
      },
      {
        id: "ing_bc5",
        name: "Óleo de Soja",
        packageQty: 900,
        packageUnit: "ml",
        packageCost: 6.50,
        usedQty: 250,
        usedUnit: "ml"
      },
      {
        id: "ing_bc6",
        name: "Leite Condensado (Cobertura Vulcão)",
        packageQty: 395,
        packageUnit: "g",
        packageCost: 6.80,
        usedQty: 395,
        usedUnit: "g"
      },
      {
        id: "ing_bc7",
        name: "Creme de Leite UHT",
        packageQty: 200,
        packageUnit: "g",
        packageCost: 3.50,
        usedQty: 200,
        usedUnit: "g"
      },
      {
        id: "ing_bc8",
        name: "Chocolate em Pó 50% Cacau & Granulado",
        packageQty: 200,
        packageUnit: "g",
        packageCost: 8.50,
        usedQty: 100,
        usedUnit: "g"
      }
    ]
  }
];

interface BakeryPricingCalculatorProps {
  formatCurrency?: (val: number) => string;
  showNotification: (msg: string, type: "success" | "error" | "info" | "warning") => void;
  onApplyToPDVCatalog?: (product: {
    name: string;
    costPrice: number;
    salePrice: number;
    category: string;
  }) => void;
}

export function BakeryPricingCalculator({
  formatCurrency = (v) => `R$ ${v.toFixed(2).replace(".", ",")}`,
  showNotification,
  onApplyToPDVCatalog
}: BakeryPricingCalculatorProps) {
  const [selectedPresetId, setSelectedPresetId] = useState<string>(BAKERY_PRESETS[0].id);
  const [itemName, setItemName] = useState<string>(BAKERY_PRESETS[0].name);
  const [category, setCategory] = useState<string>(BAKERY_PRESETS[0].category);
  const [batchYield, setBatchYield] = useState<number>(BAKERY_PRESETS[0].batchYield);
  const [batchYieldUnit, setBatchYieldUnit] = useState<string>(BAKERY_PRESETS[0].batchYieldUnit);
  const [bakingLossPct, setBakingLossPct] = useState<number>(BAKERY_PRESETS[0].bakingLossPct);
  const [ovenGasEnergyCost, setOvenGasEnergyCost] = useState<number>(BAKERY_PRESETS[0].ovenGasEnergyCost);
  const [packagingCostTotal, setPackagingCostTotal] = useState<number>(BAKERY_PRESETS[0].packagingCostTotal);
  const [targetMarginPct, setTargetMarginPct] = useState<number>(BAKERY_PRESETS[0].targetMarginPct);
  const [currentSellPrice, setCurrentSellPrice] = useState<number>(BAKERY_PRESETS[0].currentSellPrice);

  const [ingredients, setIngredients] = useState<BakeryIngredient[]>(BAKERY_PRESETS[0].ingredients);

  // Helper unit converter
  const calculateIngredientCost = (ing: BakeryIngredient): number => {
    let factor = 1;
    if (ing.packageUnit === "kg" && ing.usedUnit === "g") factor = 0.001;
    else if (ing.packageUnit === "g" && ing.usedUnit === "kg") factor = 1000;
    else if (ing.packageUnit === "L" && ing.usedUnit === "ml") factor = 0.001;
    else if (ing.packageUnit === "ml" && ing.usedUnit === "L") factor = 1000;

    const normalizedPackageQty = ing.packageQty * (factor === 1000 ? 1000 : 1);
    const unitPrice = ing.packageCost / (ing.packageQty || 1);

    if (
      (ing.packageUnit === "kg" && ing.usedUnit === "g") ||
      (ing.packageUnit === "L" && ing.usedUnit === "ml")
    ) {
      return (ing.packageCost / ing.packageQty) * (ing.usedQty / 1000);
    }

    return unitPrice * ing.usedQty;
  };

  // Calculations
  const calculations = useMemo(() => {
    const rawIngredientsCost = ingredients.reduce((sum, ing) => sum + calculateIngredientCost(ing), 0);
    const totalBatchCost = rawIngredientsCost + ovenGasEnergyCost + packagingCostTotal;

    const unitCost = batchYield > 0 ? totalBatchCost / batchYield : 0;
    const suggestedUnitPrice = targetMarginPct < 100 ? unitCost / (1 - targetMarginPct / 100) : unitCost * 2;

    const totalRevenue = batchYield * currentSellPrice;
    const totalProfit = totalRevenue - totalBatchCost;
    const unitProfit = currentSellPrice - unitCost;
    const realMarginPct = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    return {
      rawIngredientsCost,
      totalBatchCost,
      unitCost,
      suggestedUnitPrice,
      totalRevenue,
      totalProfit,
      unitProfit,
      realMarginPct
    };
  }, [ingredients, ovenGasEnergyCost, packagingCostTotal, batchYield, targetMarginPct, currentSellPrice]);

  // Load Preset
  const handleLoadPreset = (preset: BakeryItemPreset) => {
    setSelectedPresetId(preset.id);
    setItemName(preset.name);
    setCategory(preset.category);
    setBatchYield(preset.batchYield);
    setBatchYieldUnit(preset.batchYieldUnit);
    setBakingLossPct(preset.bakingLossPct);
    setOvenGasEnergyCost(preset.ovenGasEnergyCost);
    setPackagingCostTotal(preset.packagingCostTotal);
    setTargetMarginPct(preset.targetMarginPct);
    setCurrentSellPrice(preset.currentSellPrice);
    setIngredients(preset.ingredients.map((ing) => ({ ...ing, id: `ing_${Date.now()}_${Math.random()}` })));
    showNotification(`Receita de "${preset.name}" carregada! 🥐`, "info");
  };

  // Add Ingredient
  const handleAddIngredient = () => {
    const newIng: BakeryIngredient = {
      id: `ing_${Date.now()}`,
      name: "Novo Ingrediente",
      packageQty: 1,
      packageUnit: "kg",
      packageCost: 10.0,
      usedQty: 200,
      usedUnit: "g"
    };
    setIngredients([...ingredients, newIng]);
  };

  const handleUpdateIngredient = (id: string, field: keyof BakeryIngredient, value: any) => {
    setIngredients(ingredients.map((ing) => (ing.id === id ? { ...ing, [field]: value } : ing)));
  };

  const handleRemoveIngredient = (id: string) => {
    if (ingredients.length <= 1) {
      showNotification("A receita precisa de pelo menos 1 ingrediente!", "warning");
      return;
    }
    setIngredients(ingredients.filter((ing) => ing.id !== id));
  };

  // Export to PDV Catalog
  const handleApplyToCatalog = () => {
    if (!onApplyToPDVCatalog) return;
    onApplyToPDVCatalog({
      name: itemName,
      costPrice: parseFloat(calculations.unitCost.toFixed(2)),
      salePrice: currentSellPrice,
      category: category
    });
    showNotification(`"${itemName}" adicionado ao PDV: Custo ${formatCurrency(calculations.unitCost)} / Venda ${formatCurrency(currentSellPrice)}! 🥐`, "success");
  };

  // Share WhatsApp
  const handleShareWhatsApp = () => {
    let msg = `🥐 *FICHA TÉCNICA DE PADARIA & CAFETERIA*\n`;
    msg += `🥖 *Item / Produto:* ${itemName}\n`;
    msg += `📦 *Rendimento da Fornada / Lote:* ${batchYield} ${batchYieldUnit}\n`;
    if (bakingLossPct > 0) msg += `🔥 *Quebra de Forneamento (Evaporação):* ${bakingLossPct}%\n`;
    msg += `⚡ *Custo Forno/Energia:* ${formatCurrency(ovenGasEnergyCost)} | *Embalagens:* ${formatCurrency(packagingCostTotal)}\n\n`;
    msg += `📋 *INGREDIENTES UTILIZADOS:*\n`;

    ingredients.forEach((ing) => {
      const cost = calculateIngredientCost(ing);
      msg += `• *${ing.name}*: ${ing.usedQty} ${ing.usedUnit} = ${formatCurrency(cost)}\n`;
    });

    msg += `\n📊 *ANÁLISE DE CUSTO & MARGEM:*\n`;
    msg += `• *Custo Total da Fornada:* ${formatCurrency(calculations.totalBatchCost)}\n`;
    msg += `• *Custo Unitário:* ${formatCurrency(calculations.unitCost)} por ${batchYieldUnit.replace(/s$/, "")}\n`;
    msg += `• *Preço de Venda Praticado:* ${formatCurrency(currentSellPrice)}\n`;
    msg += `• *Lucro por Unidade:* +${formatCurrency(calculations.unitProfit)}\n`;
    msg += `• *Faturamento da Fornada:* ${formatCurrency(calculations.totalRevenue)}\n`;
    msg += `• *Lucro Total da Fornada:* ${formatCurrency(calculations.totalProfit)}\n`;
    msg += `• *Margem Real no Bolso:* ${calculations.realMarginPct.toFixed(1)}%\n\n`;
    msg += `_Gerado com precisão pelo Cérebro Inteligente PDV 🚀_`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200 text-left">
      {/* HEADER CARD */}
      <div className="bg-gradient-to-r from-amber-950/70 via-slate-900 to-slate-950 border border-amber-500/30 rounded-2xl p-4 sm:p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500 text-slate-950 rounded-xl shadow-lg shadow-amber-500/30 shrink-0">
              <Wheat className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[9.5px] font-black uppercase text-amber-400 tracking-wider">
                  Módulo Padaria, Confeitaria & Cafeteria
                </span>
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-[8.5px] font-black uppercase rounded-full border border-amber-500/30">
                  Fornadas, Quebra de Forno & Café
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2 mt-0.5">
                Calculadora de Pão Francês, Cafeteria & Confeitaria 🥐
              </h3>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-[10px] uppercase tracking-wider rounded-xl transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/15"
              title="Compartilhar análise da fornada no WhatsApp"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Enviar no WhatsApp</span>
            </button>
            <button
              type="button"
              onClick={handleApplyToCatalog}
              className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-wider rounded-xl transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/20"
              title="Atualizar este item no catálogo de vendas do PDV"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Salvar no Catálogo PDV</span>
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-300 font-medium leading-relaxed mt-2.5">
          Na padaria e cafeteria, cada grama e centavo contam: o <strong>pão francês perde água no forno (quebra de 12% a 15%)</strong>, o forno a gás consome bastante, e na <strong>cafeteria 1 kg de café rende 111 doses</strong> onde o copinho e açúcar são custos reais. Esta calculadora fecha a conta exata por pãozinho, dose de café ou fatia de bolo!
        </p>

        {/* PRESET SHORTCUTS */}
        <div className="mt-3.5 pt-3 border-t border-white/5">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-2">
            ⚡ Receitas de Padaria & Cafeteria Prontas:
          </span>
          <div className="flex flex-wrap gap-2">
            {BAKERY_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleLoadPreset(preset)}
                className={`px-3 py-1.5 rounded-xl text-[10.5px] font-black transition-all flex items-center gap-1.5 cursor-pointer border ${
                  selectedPresetId === preset.id
                    ? "bg-amber-500 text-slate-950 border-amber-300 shadow-md shadow-amber-500/25 font-black"
                    : "bg-slate-900/90 hover:bg-amber-950/40 text-slate-300 hover:text-white border-white/10"
                }`}
              >
                <span>
                  {preset.type === "pao"
                    ? "🥖"
                    : preset.type === "cafe"
                    ? "☕"
                    : preset.type === "confeitaria"
                    ? "🎂"
                    : "🥐"}
                </span>
                <span>{preset.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* BATCH CONFIG & FINANCIAL OVERVIEW */}
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4">
        <h4 className="text-xs font-black uppercase text-amber-400 flex items-center gap-1.5 border-b border-white/5 pb-2">
          <Scale className="w-4 h-4 text-amber-400" />
          1. Dados da Fornada / Lote de Produção & Rendimento
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="space-y-1 lg:col-span-2">
            <label className="text-[9px] font-bold text-slate-400 uppercase">
              Nome do Produto / Receita
            </label>
            <input
              type="text"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-bold outline-none focus:border-amber-400"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-bold text-slate-400 uppercase">
              Rendimento da Fornada
            </label>
            <input
              type="number"
              step="1"
              min="1"
              value={batchYield}
              onChange={(e) => setBatchYield(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold outline-none focus:border-amber-400"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-bold text-slate-400 uppercase">
              Unidade de Rendimento
            </label>
            <input
              type="text"
              value={batchYieldUnit}
              onChange={(e) => setBatchYieldUnit(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-bold outline-none focus:border-amber-400"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-bold text-slate-400 uppercase">
              Gás / Forno / Energia (R$)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-xs text-slate-400 font-bold">R$</span>
              <input
                type="number"
                step="0.5"
                min="0"
                value={ovenGasEnergyCost}
                onChange={(e) => setOvenGasEnergyCost(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-white font-mono font-bold outline-none focus:border-amber-400"
              />
            </div>
          </div>
        </div>

        {/* FINANCIAL SUMMARY TILES */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
          <div className="p-3 bg-slate-950 rounded-xl border border-white/5 space-y-1">
            <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider block">
              Custo Total da Fornada
            </span>
            <span className="text-base font-black text-rose-400 font-mono">
              {formatCurrency(calculations.totalBatchCost)}
            </span>
            <span className="text-[8px] text-slate-500 block">
              Insumos + Forno + Embalagem
            </span>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-white/5 space-y-1">
            <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider block">
              Custo Unitário Real
            </span>
            <span className="text-base font-black text-amber-400 font-mono">
              {formatCurrency(calculations.unitCost)}
            </span>
            <span className="text-[8px] text-slate-500 block">
              Por cada {batchYieldUnit.replace(/s$/, "")}
            </span>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-white/5 space-y-1">
            <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider block">
              Preço Sugerido ({targetMarginPct}%)
            </span>
            <span className="text-base font-black text-purple-400 font-mono">
              {formatCurrency(calculations.suggestedUnitPrice)}
            </span>
            <span className="text-[8px] text-slate-500 block">
              Fórmula de Markup Divisor
            </span>
          </div>

          <div className="p-3 bg-emerald-950/30 rounded-xl border border-emerald-500/20 space-y-1">
            <span className="text-[8.5px] font-black text-emerald-400 uppercase tracking-wider block">
              Lucro Total da Fornada
            </span>
            <span className="text-base font-black text-emerald-400 font-mono">
              +{formatCurrency(calculations.totalProfit)}
            </span>
            <span className="text-[8px] text-emerald-300 font-extrabold block">
              Margem Praticada: {calculations.realMarginPct.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* INGREDIENTS TABLE */}
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2">
          <div>
            <h4 className="text-xs font-black uppercase text-amber-400 flex items-center gap-1.5">
              <Wheat className="w-4 h-4 text-amber-400" />
              2. Ingredientes da Receita (Farinhas, Leite, Fermentos, Café em Grãos)
            </h4>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Coloque o pacote que você comprou (ex: 25kg por R$ 95,00) e a quantidade usada (ex: 25kg ou 800g). A calculadora faz a conversão de unidades automaticamente!
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddIngredient}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            Adicionar Ingrediente
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-[9px] uppercase font-black text-slate-400 tracking-wider">
                <th className="py-2 pr-2">Ingrediente</th>
                <th className="py-2 px-2 text-center">Pacote Fechado</th>
                <th className="py-2 px-2 text-center">Preço Pacote (R$)</th>
                <th className="py-2 px-2 text-center">Qtd Utilizada</th>
                <th className="py-2 px-2 text-right">Custo na Fornada</th>
                <th className="py-2 pl-2 text-center">Remover</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {ingredients.map((ing) => {
                const cost = calculateIngredientCost(ing);

                return (
                  <tr key={ing.id} className="hover:bg-white/[0.02] transition-colors">
                    {/* Name */}
                    <td className="py-2 pr-2">
                      <input
                        type="text"
                        value={ing.name}
                        onChange={(e) => handleUpdateIngredient(ing.id, "name", e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white font-bold outline-none focus:border-amber-400"
                      />
                    </td>

                    {/* Package Qty & Unit */}
                    <td className="py-2 px-2">
                      <div className="flex items-center justify-center gap-1">
                        <input
                          type="number"
                          step="0.1"
                          min="0.01"
                          value={ing.packageQty}
                          onChange={(e) => handleUpdateIngredient(ing.id, "packageQty", parseFloat(e.target.value) || 1)}
                          className="w-14 bg-slate-950 border border-white/10 rounded-lg px-1.5 py-1 text-xs text-white font-mono text-center outline-none focus:border-amber-400"
                        />
                        <select
                          value={ing.packageUnit}
                          onChange={(e) => handleUpdateIngredient(ing.id, "packageUnit", e.target.value)}
                          className="bg-slate-950 border border-white/10 rounded-lg px-1.5 py-1 text-[10px] text-slate-300 font-bold outline-none focus:border-amber-400"
                        >
                          <option value="kg">kg</option>
                          <option value="g">g</option>
                          <option value="L">L</option>
                          <option value="ml">ml</option>
                          <option value="un">un</option>
                        </select>
                      </div>
                    </td>

                    {/* Package Cost */}
                    <td className="py-2 px-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-[10px] text-slate-500">R$</span>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={ing.packageCost}
                          onChange={(e) => handleUpdateIngredient(ing.id, "packageCost", parseFloat(e.target.value) || 0)}
                          className="w-16 bg-slate-950 border border-white/10 rounded-lg px-1.5 py-1 text-xs text-white font-mono text-center outline-none focus:border-amber-400"
                        />
                      </div>
                    </td>

                    {/* Used Qty & Unit */}
                    <td className="py-2 px-2">
                      <div className="flex items-center justify-center gap-1">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={ing.usedQty}
                          onChange={(e) => handleUpdateIngredient(ing.id, "usedQty", parseFloat(e.target.value) || 0)}
                          className="w-14 bg-slate-950 border border-white/10 rounded-lg px-1.5 py-1 text-xs text-white font-mono text-center outline-none focus:border-amber-400"
                        />
                        <select
                          value={ing.usedUnit}
                          onChange={(e) => handleUpdateIngredient(ing.id, "usedUnit", e.target.value)}
                          className="bg-slate-950 border border-white/10 rounded-lg px-1.5 py-1 text-[10px] text-slate-300 font-bold outline-none focus:border-amber-400"
                        >
                          <option value="g">g</option>
                          <option value="kg">kg</option>
                          <option value="ml">ml</option>
                          <option value="L">L</option>
                          <option value="un">un</option>
                        </select>
                      </div>
                    </td>

                    {/* Cost */}
                    <td className="py-2 px-2 text-right font-mono font-bold text-amber-400 text-xs">
                      {formatCurrency(cost)}
                    </td>

                    {/* Remove */}
                    <td className="py-2 pl-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveIngredient(ing.id)}
                        className="p-1.5 bg-red-600/10 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors cursor-pointer"
                        title="Remover ingrediente"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-white/10 font-black text-xs">
                <td colSpan={4} className="py-3 text-slate-300 uppercase tracking-wider">
                  SUBTOTAL DOS INGREDIENTES:
                </td>
                <td className="py-3 px-2 text-right font-mono text-amber-400 text-sm">
                  {formatCurrency(calculations.rawIngredientsCost)}
                </td>
                <td className="py-3 pl-2"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* PRICING & SELLING CONTROLS */}
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4">
        <h4 className="text-xs font-black uppercase text-purple-400 flex items-center gap-1.5 border-b border-white/5 pb-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          3. Preço de Venda Praticado no Balcão & Margem de Lucro Desejada
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300">Margem Líquida Alvo:</span>
              <strong className="text-purple-300 font-mono text-sm">{targetMarginPct}%</strong>
            </div>
            <input
              type="range"
              min="30"
              max="85"
              step="5"
              value={targetMarginPct}
              onChange={(e) => setTargetMarginPct(parseInt(e.target.value, 10) || 60)}
              className="w-full accent-purple-500 cursor-pointer"
            />
            <p className="text-[8.5px] text-slate-400">
              Padarias e confeitarias geralmente operam entre <strong>55% e 75%</strong> de margem para cobrir energia dos fornos e perdas. Cafeterias operam acima de <strong>80%</strong>.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9.5px] font-black text-emerald-400 uppercase">
              Preço de Venda no Balcão (R$):
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">R$</span>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  value={currentSellPrice}
                  onChange={(e) => setCurrentSellPrice(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-emerald-500/40 rounded-xl pl-9 pr-3 py-2 text-sm text-emerald-400 font-mono font-black outline-none focus:border-emerald-400"
                />
              </div>
              <button
                type="button"
                onClick={() => setCurrentSellPrice(parseFloat(calculations.suggestedUnitPrice.toFixed(2)))}
                className="px-2.5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-[9px] font-black uppercase shrink-0 transition-all cursor-pointer"
                title="Usar o preço de venda exato calculado pela fórmula"
              >
                Usar Sugerido 💡
              </button>
            </div>
            <div className="flex items-center justify-between text-[9px] pt-0.5">
              <span className="text-slate-400">Lucro em cada {batchYieldUnit.replace(/s$/, "")}:</span>
              <strong className="text-emerald-400 font-mono text-[10.5px]">
                +{formatCurrency(calculations.unitProfit)}
              </strong>
            </div>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-white/5 space-y-1 flex flex-col justify-center">
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
              Simulação de 100 Vendas por Dia
            </span>
            <span className="text-base font-black text-emerald-400 font-mono">
              +{formatCurrency(calculations.unitProfit * 100)} / dia
            </span>
            <span className="text-[8.5px] text-slate-500">
              Lucro mensal estimado: ~{formatCurrency(calculations.unitProfit * 100 * 30)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
