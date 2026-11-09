import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Wine,
  Sparkles,
  Scale,
  TrendingUp,
  CheckCircle2,
  DollarSign,
  Package,
  Layers,
  Plus,
  Trash2,
  Pencil,
  RotateCcw,
  Share2,
  AlertTriangle,
  Info,
  Truck,
  ShieldCheck,
  BarChart3,
  Check,
  Coins,
  Copy,
  ArrowRight,
  ShoppingBag,
  Barcode,
  Camera
} from "lucide-react";
import { motion } from "motion/react";
import { SmartNumericInput } from "./SmartNumericInput";
import { GlassBarcodeScannerCart } from "./GlassBarcodeScannerCart";

export interface GlassItemType {
  id: string;
  name: string;
  category: "longneck" | "aguardente" | "cerveja600" | "litrao" | "vinho" | "pote" | "caco";
  emoji: string;
  unitWeightKg: number; // Peso médio em kg
  weightDescription: string;
  quantity: number; // Quantidade de unidades ou baldes contados
  buyPricePerUnit: number; // Valor pago ao catador/cliente por unidade (R$)
  returnableResellPrice?: number; // Preço de revenda se for casco retornável para bar/distribuidora (R$)
  isReturnableCandidate?: boolean; // Se vale mais vender inteira do que quebrar
  suggestedLotMinUnits?: number; // Lote mínimo recomendado para pagar R$ 0,50
  lotDescription?: string; // Descrição rápida do lote no portão
}

export interface GatePurchaseLog {
  id: string;
  timestamp: string;
  itemName: string;
  units: number;
  paidAmount: number;
  estimatedWeightKg: number;
  expectedPlantRevenue: number;
  estimatedProfit: number;
}

const DEFAULT_GLASS_ITEMS: GlassItemType[] = [
  {
    id: "glass_cachaça_51",
    name: "Garrafa de 51 / Dreher / Velho Barreiro (900ml / 1L)",
    category: "aguardente",
    emoji: "🍾",
    unitWeightKg: 0.50, // 500g = 2 garrafas dão 1 kg
    weightDescription: "1 garrafa = 500g (2 garrafas = 1 kg)",
    quantity: 120,
    buyPricePerUnit: 0.05, // R$ 0,05 por unidade (ou 10 garrafas por R$ 0,50)
    returnableResellPrice: 0.30,
    isReturnableCandidate: false,
    suggestedLotMinUnits: 10,
    lotDescription: "10 garrafas (5 kg) = R$ 0,50 no portão"
  },
  {
    id: "glass_longneck",
    name: "Garrafas Longneck (330ml / 355ml - Heineken, Corona, Stella)",
    category: "longneck",
    emoji: "🍺",
    unitWeightKg: 0.185, // 3 un ≈ 550g | 6 un ≈ 1,11 kg
    weightDescription: "3 garrafas ≈ 550g | 6 garrafas ≈ 1,11 kg",
    quantity: 360,
    buyPricePerUnit: 0.016, // ~R$ 0,50 por 30 garrafas
    returnableResellPrice: 0.15,
    isReturnableCandidate: false,
    suggestedLotMinUnits: 30,
    lotDescription: "30 garrafas (5 fardinhos de 6) = R$ 0,50 no portão"
  },
  {
    id: "glass_cerveja_600",
    name: "Garrafa de Cerveja 600ml Tradicional (Ambar / Retornável)",
    category: "cerveja600",
    emoji: "🍻",
    unitWeightKg: 0.45, // 450g
    weightDescription: "1 garrafa ≈ 450g (Vale R$ 0,80 a R$ 1,20 para bares!)",
    quantity: 80,
    buyPricePerUnit: 0.50, // PAGA R$ 0,50 POR UNIDADE SE INTACTA!
    returnableResellPrice: 1.00, // Casco retornável vale R$ 1,00 para bares!
    isReturnableCandidate: true,
    suggestedLotMinUnits: 1,
    lotDescription: "1 GARRAFA INTACTA = R$ 0,50 (Super Lucro: revende por R$ 1,00 para bar!)"
  },
  {
    id: "glass_litrao",
    name: "Garrafão Litrão 1 Litro (Cerveja Retornável)",
    category: "litrao",
    emoji: "🍾",
    unitWeightKg: 0.65, // 650g
    weightDescription: "1 garrafa ≈ 650g (Vale R$ 1,20 a R$ 1,50 para bares!)",
    quantity: 40,
    buyPricePerUnit: 0.50, // Paga 50 centavos por unidade inteira
    returnableResellPrice: 1.30, // Retornável
    isReturnableCandidate: true,
    suggestedLotMinUnits: 1,
    lotDescription: "1 LITRÃO INTACTO = R$ 0,50 (Revende por R$ 1,30 para bar!)"
  },
  {
    id: "glass_vinho",
    name: "Garrafas de Vinho / Espumante (750ml vidro espesso)",
    category: "vinho",
    emoji: "🍷",
    unitWeightKg: 0.60, // 600g
    weightDescription: "1 garrafa ≈ 550g a 700g (média 600g)",
    quantity: 60,
    buyPricePerUnit: 0.05,
    returnableResellPrice: 0.40,
    isReturnableCandidate: false,
    suggestedLotMinUnits: 9,
    lotDescription: "9 a 10 garrafas (5,4 a 6 kg) = R$ 0,50 no portão"
  },
  {
    id: "glass_potes",
    name: "Potes de Conserva (Palmito, Azeitona, Maionese, Geléia)",
    category: "pote",
    emoji: "🫙",
    unitWeightKg: 0.28, // 280g
    weightDescription: "1 pote ≈ 250g a 300g",
    quantity: 90,
    buyPricePerUnit: 0.025,
    returnableResellPrice: 0.50,
    isReturnableCandidate: true,
    suggestedLotMinUnits: 18,
    lotDescription: "18 a 20 potes (5 kg) = R$ 0,50 no portão"
  },
  {
    id: "glass_cacos_sacola",
    name: "Cacos de Vidro Quebrados (Sacola de Mercado Reforçada)",
    category: "caco",
    emoji: "🛍️",
    unitWeightKg: 5.0, // 1 sacola reforçada bem cheia de cacos ≈ 5 kg
    weightDescription: "1 sacola de mercado cheia ≈ 5 kg de cacos",
    quantity: 25,
    buyPricePerUnit: 0.50, // Paga 50 centavos por sacola de 5 kg
    returnableResellPrice: 0,
    isReturnableCandidate: false,
    suggestedLotMinUnits: 1,
    lotDescription: "1 sacola de mercado cheia (5 kg) = R$ 0,50"
  },
  {
    id: "glass_cacos_balde",
    name: "Cacos de Vidro Quebrados (Balde 20 Litros de Obra Cheio)",
    category: "caco",
    emoji: "🪣",
    unitWeightKg: 16.0, // 1 balde 20L de cacos ≈ 15 a 17 kg
    weightDescription: "1 balde de 20L cheio ≈ 16 kg de cacos (Vale R$ 2,40 na usina)",
    quantity: 15,
    buyPricePerUnit: 1.50, // R$ 1,50 por balde (ou 3 moedas de 50 centavos)
    returnableResellPrice: 0,
    isReturnableCandidate: false,
    suggestedLotMinUnits: 1,
    lotDescription: "1 balde 20L cheio = Paga R$ 1,50 (3 moedas de R$ 0,50)"
  }
];

export function GlassRecyclingCalculator({
  showNotification
}: {
  showNotification?: (msg: string, type: "success" | "error" | "info" | "warning") => void;
}) {
  // Aba padrão abre direto no Carrinho & Leitor de Código de Barras
  const [activeTab, setActiveTab] = useState<"bipar_carrinho" | "lotes_50centavos" | "contagem" | "cargas" | "retornaveis" | "dicas_ferro_velho">("bipar_carrinho");

  // Valor da moeda padrão para pagamento no portão (default R$ 0,50)
  const [targetCoinPayout, setTargetCoinPayout] = useState<number>(() => {
    try {
      const stored = localStorage.getItem("pdv_glass_target_coin");
      return stored ? Number(stored) : 0.50;
    } catch {
      return 0.50;
    }
  });

  // Margem de lucro de segurança no portão (default 33%)
  const [targetMarginPct, setTargetMarginPct] = useState<number>(33);

  // Simulador de Dezenas de Longneck (10 em 10) e Pares de Dreher (2 em 2)
  const [simLongneckDezenas, setSimLongneckDezenas] = useState<number>(3); // 3 dezenas = 30 garrafas (lote de R$ 0,50)
  const [simDreherPares, setSimDreherPares] = useState<number>(5); // 5 pares = 10 garrafas (lote de R$ 0,50)

  // Cotação da tonelada de vidro negociada com a usina ou caminhão (ex: Victor)
  // R$ 150/tonelada = R$ 0,15 por kg
  const [sellPricePerTon, setSellPricePerTon] = useState<number>(() => {
    try {
      const stored = localStorage.getItem("pdv_glass_price_ton");
      return stored ? Number(stored) : 150.0;
    } catch {
      return 150.0;
    }
  });

  // Nome do comprador do ferro velho (ex: "Caminhão do Victor", "Usina Verallia", "Owens Illinois")
  const [buyerName, setBuyerName] = useState<string>(() => {
    try {
      return localStorage.getItem("pdv_glass_buyer_name") || "Caminhão do Victor (Usina / Reciclagem)";
    } catch {
      return "Caminhão do Victor (Usina / Reciclagem)";
    }
  });

  // Lista de itens contados no pátio do ferro velho
  const [items, setItems] = useState<GlassItemType[]>(() => {
    try {
      const stored = localStorage.getItem("pdv_glass_items_inventory_v1");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item: any, idx: number) => ({
            ...DEFAULT_GLASS_ITEMS[0],
            ...item,
            id: item.id || `glass_${idx}`,
            quantity: Number(item.quantity) || 0,
            unitWeightKg: Number(item.unitWeightKg) || 0.5,
            buyPricePerUnit: Number(item.buyPricePerUnit) || 0
          }));
        }
      }
    } catch {}
    return DEFAULT_GLASS_ITEMS;
  });

  // Histórico de compras registradas no portão na sessão de hoje
  const [purchaseHistory, setPurchaseHistory] = useState<GatePurchaseLog[]>(() => {
    try {
      const stored = localStorage.getItem("pdv_glass_gate_logs_today");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed.slice(0, 20);
      }
    } catch {}
    return [];
  });

  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced auto-save
  useEffect(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem("pdv_glass_items_inventory_v1", JSON.stringify(items));
        localStorage.setItem("pdv_glass_price_ton", String(sellPricePerTon));
        localStorage.setItem("pdv_glass_buyer_name", buyerName);
        localStorage.setItem("pdv_glass_target_coin", String(targetCoinPayout));
        localStorage.setItem("pdv_glass_gate_logs_today", JSON.stringify(purchaseHistory));
      } catch {}
    }, 800);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [items, sellPricePerTon, buyerName, targetCoinPayout, purchaseHistory]);

  const handleManualSave = () => {
    try {
      localStorage.setItem("pdv_glass_items_inventory_v1", JSON.stringify(items));
      localStorage.setItem("pdv_glass_price_ton", String(sellPricePerTon));
      localStorage.setItem("pdv_glass_buyer_name", buyerName);
      localStorage.setItem("pdv_glass_target_coin", String(targetCoinPayout));
      localStorage.setItem("pdv_glass_gate_logs_today", JSON.stringify(purchaseHistory));
      setSaveStatus("Contagem e lotes do ferro velho salvos com sucesso!");
      setTimeout(() => setSaveStatus(null), 3500);
      if (showNotification) {
        showNotification("Estoque de vidros e tabela de lotes salvos com sucesso! 💾🍾", "success");
      }
    } catch {
      if (showNotification) {
        showNotification("Erro ao salvar dados no navegador.", "error");
      }
    }
  };

  const handleUpdateItem = (id: string, field: keyof GlassItemType, val: any) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: val } : item))
    );
  };

  const handleAddItem = () => {
    const newItem: GlassItemType = {
      id: `glass_custom_${Date.now()}`,
      name: "Nova Garrafa / Recipiente de Vidro (Toque para Editar ✍️)",
      category: "aguardente",
      emoji: "🍾",
      unitWeightKg: 0.50,
      weightDescription: "1 unidade ≈ 500g",
      quantity: 50,
      buyPricePerUnit: 0.05,
      returnableResellPrice: 0.20,
      isReturnableCandidate: false,
      suggestedLotMinUnits: 10,
      lotDescription: "10 unidades por R$ 0,50"
    };
    setItems((prev) => [newItem, ...prev]);
    if (showNotification) {
      showNotification("Novo tipo de garrafa adicionado à contagem! ✍️", "info");
    }
  };

  const handleDeleteItem = (id: string, name: string) => {
    if (items.length <= 1) {
      if (showNotification) {
        showNotification("Mantenha ao menos 1 tipo de garrafa na lista.", "warning");
      }
      return;
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
    if (showNotification) {
      showNotification(`Item "${name}" removido da contagem. 🗑️`, "info");
    }
  };

  const handleResetToDefaults = () => {
    try {
      localStorage.removeItem("pdv_glass_items_inventory_v1");
    } catch {}
    setItems(DEFAULT_GLASS_ITEMS);
    if (showNotification) {
      showNotification("Modelos e pesos padrão de garrafas restaurados! 🔄", "info");
    }
  };

  // Callback disparado quando o carrinho de compras do portão é finalizado
  const handleAddItemsFromCartToYardStock = (
    itemsToAdd: { name: string; quantity: number; weightKg: number; costPaid: number }[]
  ) => {
    setItems((prev) => {
      let updated = [...prev];
      itemsToAdd.forEach((added) => {
        const addedLower = added.name.toLowerCase();
        const existingIdx = updated.findIndex((u) => {
          const uLower = u.name.toLowerCase();
          return (
            uLower.includes(addedLower) ||
            addedLower.includes(uLower) ||
            (addedLower.includes("longneck") && u.category === "longneck") ||
            (addedLower.includes("dreher") && uLower.includes("dreher")) ||
            (addedLower.includes("51") && uLower.includes("51"))
          );
        });

        if (existingIdx >= 0) {
          updated[existingIdx] = {
            ...updated[existingIdx],
            quantity: updated[existingIdx].quantity + added.quantity
          };
        } else {
          const isLongneck = addedLower.includes("longneck");
          const is900ml = addedLower.includes("900") || addedLower.includes("dreher") || addedLower.includes("51");
          updated.unshift({
            id: `yard_item_${Date.now()}_${Math.random()}`,
            name: added.name,
            category: isLongneck ? "longneck" : is900ml ? "aguardente" : "cerveja600",
            emoji: isLongneck ? "🍺" : "🍾",
            unitWeightKg: added.quantity > 0 ? added.weightKg / added.quantity : 0.2,
            weightDescription: `1 un ≈ ${(added.quantity > 0 ? (added.weightKg / added.quantity) * 1000 : 200).toFixed(0)}g`,
            quantity: added.quantity,
            buyPricePerUnit: added.quantity > 0 ? added.costPaid / added.quantity : 0.02,
            returnableResellPrice: 0.30,
            isReturnableCandidate: false
          });
        }
      });
      return updated;
    });
  };

  // Cálculos financeiros gerais e de peso do estoque no pátio
  const calculations = useMemo(() => {
    const sellPricePerKg = sellPricePerTon > 0 ? sellPricePerTon / 1000 : 0.15;

    let totalWeightKg = 0;
    let totalAcquisitionCost = 0;
    let totalGlassUnits = 0;
    let totalPotentialReturnableRevenue = 0;

    const detailedItems = items.map((item) => {
      const itemTotalWeightKg = item.quantity * item.unitWeightKg;
      const itemCost = item.quantity * item.buyPricePerUnit;
      const itemSellValueWeight = itemTotalWeightKg * sellPricePerKg;
      const itemProfit = itemSellValueWeight - itemCost;
      const unitSellValue = item.unitWeightKg * sellPricePerKg;
      const unitProfit = unitSellValue - item.buyPricePerUnit;

      totalWeightKg += itemTotalWeightKg;
      totalAcquisitionCost += itemCost;
      totalGlassUnits += item.category === "caco" ? 0 : item.quantity;

      // Se for vendido como casco retornável para bar/mercearia
      if (item.isReturnableCandidate && item.returnableResellPrice && item.returnableResellPrice > 0) {
        totalPotentialReturnableRevenue += item.quantity * item.returnableResellPrice;
      }

      return {
        ...item,
        itemTotalWeightKg,
        itemCost,
        itemSellValueWeight,
        itemProfit,
        unitSellValue,
        unitProfit
      };
    });

    const totalWeightTon = totalWeightKg / 1000;
    const grossRevenueWeight = totalWeightKg * sellPricePerKg;
    const netProfitWeight = grossRevenueWeight - totalAcquisitionCost;
    const profitMarginPct = grossRevenueWeight > 0 ? (netProfitWeight / grossRevenueWeight) * 100 : 0;

    // Metas de caminhão
    const TARGET_1_TON = 1000;
    const TARGET_3_TON = 3000; // Carga mínima comum para caminhão basculante ou com caçamba
    const TARGET_5_TON = 5000; // Carga cheia com melhor cotação

    const progressTo1Ton = Math.min((totalWeightKg / TARGET_1_TON) * 100, 100);
    const progressTo3Ton = Math.min((totalWeightKg / TARGET_3_TON) * 100, 100);
    const progressTo5Ton = Math.min((totalWeightKg / TARGET_5_TON) * 100, 100);

    const kgNeededFor1Ton = Math.max(0, TARGET_1_TON - totalWeightKg);
    const kgNeededFor3Ton = Math.max(0, TARGET_3_TON - totalWeightKg);
    const kgNeededFor5Ton = Math.max(0, TARGET_5_TON - totalWeightKg);

    // Média de garrafas de 500g (ex: 51/Dreher) faltantes
    const bottlesNeededFor5Ton = Math.ceil(kgNeededFor5Ton / 0.5);

    return {
      sellPricePerKg,
      totalWeightKg,
      totalWeightTon,
      totalGlassUnits,
      totalAcquisitionCost,
      grossRevenueWeight,
      netProfitWeight,
      profitMarginPct,
      detailedItems,
      totalPotentialReturnableRevenue,
      progressTo1Ton,
      progressTo3Ton,
      progressTo5Ton,
      kgNeededFor1Ton,
      kgNeededFor3Ton,
      kgNeededFor5Ton,
      bottlesNeededFor5Ton
    };
  }, [items, sellPricePerTon]);

  // CÁLCULO PRECISO DOS LOTES MÍNIMOS PARA PAGAR A MOEDA ESCOLHIDA (ex: R$ 0,50)
  const lotCalculations = useMemo(() => {
    const sellPricePerKg = calculations.sellPricePerKg; // ex: 0.15
    const coin = targetCoinPayout > 0 ? targetCoinPayout : 0.50; // ex: 0.50
    const marginRatio = Math.max(0.10, Math.min(0.70, targetMarginPct / 100)); // ex: 0.33

    // Valor mínimo bruto que o lote precisa render na usina para sobrar o lucro desejado
    // Ex: para pagar R$ 0,50 e ter 33% de margem, usina deve pagar R$ 0,50 / (1 - 0.33) = R$ 0,75
    const targetPlantRevenue = coin / (1 - marginRatio);
    // Peso mínimo necessário em kg na usina
    const targetWeightKg = targetPlantRevenue / sellPricePerKg; // ex: 0.75 / 0.15 = 5.0 kg

    const calculatedLots = items.map((item) => {
      // Caso 1: Cascos Retornáveis Intactos (600ml ou Litrão)
      // NUNCA quebre! Vale R$ 0,80 a R$ 1,50 para bares por unidade intacta!
      if (item.isReturnableCandidate && item.returnableResellPrice && item.returnableResellPrice >= 0.80) {
        // Quantas unidades inteiras comprar para a moeda escolhida
        // Se a moeda for R$ 0,50: 1 garrafa por R$ 0,50!
        const unitsForCoin = Math.max(1, Math.floor(coin / 0.50));
        const totalCost = unitsForCoin * 0.50;
        const totalWeight = unitsForCoin * item.unitWeightKg;
        const barRevenue = unitsForCoin * item.returnableResellPrice;
        const barProfit = barRevenue - totalCost;
        const barMargin = barRevenue > 0 ? (barProfit / barRevenue) * 100 : 0;

        return {
          id: item.id,
          name: item.name,
          emoji: item.emoji,
          category: item.category,
          unitWeightKg: item.unitWeightKg,
          isReturnable: true,
          unitsNeeded: unitsForCoin,
          totalWeightKg: totalWeight,
          payoutToCollector: totalCost,
          plantRevenue: barRevenue, // Valor ao revender intacta para o bar!
          netProfit: barProfit,
          marginPct: barMargin,
          badge: "⭐ SUPER LUCRO (VENDER A BAR)",
          explanation: `1 garrafa intacta vale R$ ${item.returnableResellPrice.toFixed(2)} no bar. Você paga R$ ${totalCost.toFixed(2)} e lucra limpo R$ ${barProfit.toFixed(2)} por garrafa! Não precisa de lote grande!`
        };
      }

      // Caso 2: Cacos em Balde de Obra 20L
      if (item.category === "caco" && item.unitWeightKg >= 15) {
        // 1 balde cheio tem 16 kg = R$ 2,40 na usina
        // Se a moeda for R$ 0,50, pode comprar 1/3 de balde ou 1 balde por R$ 1,50 (3 moedas)
        const unitsNeeded = 1;
        const payout = coin >= 1.50 ? coin : 1.50;
        const totalWeight = item.unitWeightKg;
        const plantRev = totalWeight * sellPricePerKg; // 16 * 0.15 = 2.40
        const profit = plantRev - payout;
        const margin = plantRev > 0 ? (profit / plantRev) * 100 : 0;

        return {
          id: item.id,
          name: item.name,
          emoji: item.emoji,
          category: item.category,
          unitWeightKg: item.unitWeightKg,
          isReturnable: false,
          unitsNeeded: unitsNeeded,
          totalWeightKg: totalWeight,
          payoutToCollector: payout,
          plantRevenue: plantRev,
          netProfit: profit,
          marginPct: margin,
          badge: "BALDE DE 20L",
          explanation: `1 balde de obra 20L cheio pesa ~16 kg (R$ ${plantRev.toFixed(2)} na usina). Pague R$ ${payout.toFixed(2)} ao catador e lucre R$ ${profit.toFixed(2)}!`
        };
      }

      // Caso 3: Garrafas Normais de Vidro para Peso (51, Dreher, Longneck, Vinho, Potes, Sacola de Cacos)
      let unitsNeeded = Math.ceil(targetWeightKg / item.unitWeightKg);

      // Ajustes amigáveis de lote no portão para contagem fácil com o catador:
      if (item.category === "aguardente") {
        // 51 / Dreher: 500g cada. 5 kg = exatamente 10 garrafas!
        // 10 garrafas = 5 kg = R$ 0,75 na usina. Paga R$ 0,50, lucra R$ 0,25.
        unitsNeeded = Math.max(10, Math.ceil(coin / 0.05));
      } else if (item.category === "longneck") {
        // Longneck: 185g cada. 5,55 kg = 30 garrafas (5 fardinhos de 6).
        // 30 garrafas = 5,55 kg = R$ 0,83 na usina. Paga R$ 0,50, lucra R$ 0,33.
        unitsNeeded = Math.max(30, Math.ceil((coin / 0.50) * 30));
      } else if (item.category === "vinho") {
        // Vinho: 600g cada. 5,4 kg = 9 garrafas.
        unitsNeeded = Math.max(9, Math.ceil((coin / 0.50) * 9));
      } else if (item.category === "pote") {
        // Potes: 280g cada. 5 kg = 18 potes.
        unitsNeeded = Math.max(18, Math.ceil((coin / 0.50) * 18));
      } else if (item.category === "caco") {
        // Sacola de cacos: 1 sacola cheia de 5 kg
        unitsNeeded = Math.max(1, Math.ceil((coin / 0.50) * 1));
      }

      const totalWeight = unitsNeeded * item.unitWeightKg;
      const plantRevenue = totalWeight * sellPricePerKg;
      const payout = coin;
      const netProfit = plantRevenue - payout;
      const margin = plantRevenue > 0 ? (netProfit / plantRevenue) * 100 : 0;

      return {
        id: item.id,
        name: item.name,
        emoji: item.emoji,
        category: item.category,
        unitWeightKg: item.unitWeightKg,
        isReturnable: false,
        unitsNeeded,
        totalWeightKg: totalWeight,
        payoutToCollector: payout,
        plantRevenue,
        netProfit,
        marginPct: margin,
        badge: item.category === "caco" ? "SACOLA REFORÇADA" : "LOTE FECHADO",
        explanation: `${unitsNeeded} ${item.category === "caco" ? "sacola(s)" : "garrafas"} pesam ~${totalWeight.toFixed(1)} kg. Na usina valem R$ ${plantRevenue.toFixed(2)}. Você paga R$ ${payout.toFixed(2)} e lucra +R$ ${netProfit.toFixed(2)} (${margin.toFixed(0)}% margem)!`
      };
    });

    return {
      coin,
      targetWeightKg,
      targetPlantRevenue,
      calculatedLots
    };
  }, [items, targetCoinPayout, targetMarginPct, calculations.sellPricePerKg]);

  // Função para comprar e dar entrada rápida de 1 lote no portão
  const handleBuyLotAtGate = (lot: typeof lotCalculations.calculatedLots[0]) => {
    // 1. Atualizar o estoque na contagem do pátio
    setItems((prev) =>
      prev.map((item) =>
        item.id === lot.id
          ? {
              ...item,
              quantity: item.quantity + lot.unitsNeeded,
              // Guarda o preço médio ponderado pago
              buyPricePerUnit: item.buyPricePerUnit > 0 ? item.buyPricePerUnit : lot.payoutToCollector / lot.unitsNeeded
            }
          : item
      )
    );

    // 2. Registrar no histórico do dia
    const newLog: GatePurchaseLog = {
      id: `gate_${Date.now()}`,
      timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      itemName: lot.name,
      units: lot.unitsNeeded,
      paidAmount: lot.payoutToCollector,
      estimatedWeightKg: lot.totalWeightKg,
      expectedPlantRevenue: lot.plantRevenue,
      estimatedProfit: lot.netProfit
    };

    setPurchaseHistory((prev) => [newLog, ...prev.slice(0, 19)]);

    if (showNotification) {
      showNotification(
        `Lote de ${lot.unitsNeeded} un de ${lot.name} comprado por R$ ${lot.payoutToCollector.toFixed(2)}! Estoque atualizado! 💰🍾`,
        "success"
      );
    }
  };

  // Copiar Cartaz/Tabela de Portão para o WhatsApp ou Impressão
  const handleCopyGatePoster = () => {
    let text = `📋 *TABELA DE COMPRA NO PORTÃO - FERRO VELHO* 🍾♻️\n`;
    text += `💰 *PAGAMENTO MÍNIMO EM MOEDA: R$ ${lotCalculations.coin.toFixed(2)}*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    lotCalculations.calculatedLots.forEach((lot) => {
      text += `• ${lot.emoji} *${lot.name}*:\n`;
      text += `  👉 LOTE: *${lot.unitsNeeded} ${lot.category === "caco" ? "sacola/balde" : "unidades"}* = Paga *R$ ${lot.payoutToCollector.toFixed(2)}*\n`;
      text += `  ⚖️ Peso do lote: ~${lot.totalWeightKg.toFixed(1)} kg\n`;
      if (lot.isReturnable) {
        text += `  ⭐ Casco Retornável Inteiro (Revenda para bares)!\n`;
      }
    });
    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    text += `⚠️ *Regras:* Garrafas sem terra, sem pedras e sem mistura com lixo orgânico.\n`;
    text += `📍 Endereço do pátio: Balcão do Ferro Velho\n`;

    navigator.clipboard?.writeText(text);
    if (showNotification) {
      showNotification("Tabela do portão copiada! Cole no WhatsApp ou imprima uma placa. 📋✅", "success");
    }
  };

  // Compartilhar contagem no WhatsApp (para o marido, parceiro ou caminhoneiro Victor)
  const handleShareWhatsApp = () => {
    let msg = `🚛 *RELATÓRIO DE VIDROS - FERRO VELHO* 🍾♻️\n`;
    msg += `📅 *Data:* ${new Date().toLocaleDateString("pt-BR")}\n`;
    msg += `🏢 *Comprador / Destino:* ${buyerName}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `⚖️ *PESO TOTAL ESTIMADO:* ${calculations.totalWeightKg.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg (${calculations.totalWeightTon.toFixed(2)} Toneladas)\n`;
    msg += `🍾 *Total de Garrafas Contadas:* ${calculations.totalGlassUnits.toLocaleString("pt-BR")} unidades\n`;
    msg += `💰 *Cotação da Tonelada:* R$ ${sellPricePerTon.toFixed(2)} (R$ ${calculations.sellPricePerKg.toFixed(2)}/kg)\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n\n`;

    msg += `📋 *DETALHAMENTO POR TIPO DE GARRAFA:*\n`;
    calculations.detailedItems.forEach((item) => {
      msg += `• ${item.emoji} *${item.name}*: ${item.quantity} un = ~${item.itemTotalWeightKg.toFixed(1)} kg | Venda: R$ ${item.itemSellValueWeight.toFixed(2)}\n`;
    });

    msg += `\n💵 *FECHAMENTO FINANCEIRO DO LOTE:*\n`;
    msg += `• *Faturamento Bruto (Peso):* R$ ${calculations.grossRevenueWeight.toFixed(2)}\n`;
    msg += `• *Custo Pago aos Catadores:* R$ ${calculations.totalAcquisitionCost.toFixed(2)}\n`;
    msg += `• *LUCRO LÍQUIDO DO FERRO VELHO:* +R$ ${calculations.netProfitWeight.toFixed(2)} (${calculations.profitMarginPct.toFixed(0)}% de margem)\n\n`;

    if (calculations.kgNeededFor5Ton > 0) {
      msg += `🎯 *Rumo à Carga Cheia (5 Toneladas):* Faltam ${calculations.kgNeededFor5Ton.toFixed(0)} kg (~${calculations.bottlesNeededFor5Ton} garrafas de 51) para completar o caminhão!\n\n`;
    } else {
      msg += `🎉 *CARGA COMPLETA ATINGIDA!* Mais de 5 Toneladas prontas para carregar no caminhão!\n\n`;
    }

    msg += `_Calculado no Cérebro Inteligente PDV • Módulo Ferro Velho de Vidro 🚀_`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto text-left">
      {/* BANNER PRINCIPAL COM VISÃO ESTRATÉGICA DE NEGÓCIO */}
      <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-teal-950/80 border border-emerald-500/30 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 border border-emerald-500/30">
                <Wine className="w-3.5 h-3.5" />
                Módulo Ferro Velho • Reciclagem de Vidros
              </span>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded border border-amber-500/30">
                Moeda Mínima: R$ 0,50 por Lote
              </span>
              <span className="text-[10px] bg-teal-500/20 text-teal-300 font-bold px-2 py-0.5 rounded border border-teal-500/30">
                Compra sem Balança
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <Coins className="w-6 h-6 text-amber-400" />
              Calculadora de Lotes & Compra Mínima (R$ 0,50)
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed font-medium">
              Sem balança ainda? Compre por <strong>lotes fechados pagando moedas redondas de R$ 0,50 ou R$ 1,00</strong>! 
              O sistema calcula quantas garrafas de 51, Longnecks, litrões ou cacos o catador precisa entregar para você pagar <strong>50 centavos</strong> com lucro e margem garantida na venda para a usina e caminhão!
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto shrink-0">
            <button
              type="button"
              onClick={handleCopyGatePoster}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/30"
              title="Copiar cartaz de lotes de R$ 0,50 para o WhatsApp"
            >
              <Copy className="w-4 h-4" />
              <span>📋 Cartaz Portão (R$ 0,50)</span>
            </button>
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-600/30"
              title="Enviar contagem para o comprador ou parceiro no WhatsApp"
            >
              <Share2 className="w-4 h-4" />
              <span>WhatsApp</span>
            </button>
            <button
              type="button"
              onClick={handleManualSave}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-black text-xs uppercase tracking-wider rounded-xl border border-white/10 transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
              title="Salvar contagem permanentemente"
            >
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Salvar</span>
            </button>
          </div>
        </div>

        {/* SUB-TABS */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mt-5">
          <button
            type="button"
            onClick={() => setActiveTab("bipar_carrinho")}
            className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-2.5 cursor-pointer ${
              activeTab === "bipar_carrinho"
                ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 border-emerald-300 shadow-lg shadow-emerald-950/50 font-black"
                : "bg-slate-950/70 text-slate-300 border-white/10 hover:bg-slate-900"
            }`}
          >
            <Barcode className={`w-4 h-4 ${activeTab === "bipar_carrinho" ? "text-slate-950" : "text-emerald-400"}`} />
            <div className="text-xs leading-tight">
              <span className="block font-black">1. Bipar & Carrinho</span>
              <span className={`text-[10px] ${activeTab === "bipar_carrinho" ? "text-slate-900 font-bold" : "text-slate-400 font-normal"}`}>
                Heineken, Dreher, 51...
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("lotes_50centavos")}
            className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-2.5 cursor-pointer ${
              activeTab === "lotes_50centavos"
                ? "bg-amber-500 text-slate-950 border-amber-300 shadow-lg shadow-amber-950/50 font-black"
                : "bg-slate-950/70 text-slate-300 border-white/10 hover:bg-slate-900"
            }`}
          >
            <Coins className={`w-4 h-4 ${activeTab === "lotes_50centavos" ? "text-slate-950" : "text-amber-400"}`} />
            <div className="text-xs leading-tight">
              <span className="block font-black">2. Lotes R$ 0,50</span>
              <span className={`text-[10px] ${activeTab === "lotes_50centavos" ? "text-slate-900 font-bold" : "text-slate-400 font-normal"}`}>
                Tabela do Portão
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("contagem")}
            className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-2.5 cursor-pointer ${
              activeTab === "contagem"
                ? "bg-emerald-600 text-white border-emerald-400 shadow-lg shadow-emerald-950/50 font-black"
                : "bg-slate-950/70 text-slate-300 border-white/10 hover:bg-slate-900"
            }`}
          >
            <Wine className="w-4 h-4 text-emerald-300" />
            <div className="text-xs leading-tight">
              <span className="block font-black">3. Estoque no Pátio</span>
              <span className="text-[10px] text-slate-400 font-normal">Contagem Geral</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("cargas")}
            className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-2.5 cursor-pointer ${
              activeTab === "cargas"
                ? "bg-emerald-600 text-white border-emerald-400 shadow-lg shadow-emerald-950/50 font-black"
                : "bg-slate-950/70 text-slate-300 border-white/10 hover:bg-slate-900"
            }`}
          >
            <Truck className="w-4 h-4 text-amber-300" />
            <div className="text-xs leading-tight">
              <span className="block font-black">4. Metas de Carga</span>
              <span className="text-[10px] text-slate-400 font-normal">1t a 5 Toneladas</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("retornaveis")}
            className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-2.5 cursor-pointer ${
              activeTab === "retornaveis"
                ? "bg-emerald-600 text-white border-emerald-400 shadow-lg shadow-emerald-950/50 font-black"
                : "bg-slate-950/70 text-slate-300 border-white/10 hover:bg-slate-900"
            }`}
          >
            <DollarSign className="w-4 h-4 text-cyan-300" />
            <div className="text-xs leading-tight">
              <span className="block font-black">5. Retornáveis</span>
              <span className="text-[10px] text-slate-400 font-normal">Venda a Bares</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("dicas_ferro_velho")}
            className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-2.5 cursor-pointer ${
              activeTab === "dicas_ferro_velho"
                ? "bg-emerald-600 text-white border-emerald-400 shadow-lg shadow-emerald-950/50 font-black"
                : "bg-slate-950/70 text-slate-300 border-white/10 hover:bg-slate-900"
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-rose-300" />
            <div className="text-xs leading-tight">
              <span className="block font-black">6. Manual</span>
              <span className="text-[10px] text-slate-400 font-normal">Cacos & Dicas</span>
            </div>
          </button>
        </div>
      </div>

      {saveStatus && (
        <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl text-emerald-300 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{saveStatus}</span>
        </div>
      )}

      {/* PAINEL DE COTAÇÃO DO COMPRADOR / TONELADA */}
      <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-4 sm:p-5 shadow-xl grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5" />
            Comprador / Caminhão de Destino:
          </label>
          <input
            type="text"
            value={buyerName}
            onChange={(e) => setBuyerName(e.target.value)}
            placeholder="Ex: Caminhão do Victor, Usina Verallia, Owens Illinois..."
            className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-bold outline-none focus:border-amber-400"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5" />
            Preço Pago por Tonelada de Vidro (R$):
          </label>
          <div className="flex items-center gap-2">
            <SmartNumericInput
              value={sellPricePerTon}
              onChange={(val) => setSellPricePerTon(Math.max(10, val))}
              prefix="R$"
              suffix="/ton"
              step={10}
              allowDecimals
              clearable
              className="py-2 text-sm font-black font-mono text-emerald-400"
              placeholder="150,00"
            />
          </div>
          <span className="text-[10px] text-slate-400 block">
            = <strong className="text-white">R$ {calculations.sellPricePerKg.toFixed(2)} por kg</strong> (15 centavos o kg a R$ 150/t)
          </span>
        </div>

        {/* Resumo Rápido da Carga Atual */}
        <div className="bg-slate-950/80 p-3.5 rounded-xl border border-emerald-500/20 flex items-center justify-between">
          <div>
            <span className="text-[9.5px] uppercase font-bold text-slate-400 block">Total no Pátio Agora:</span>
            <span className="text-xl font-black text-white font-mono">
              {calculations.totalWeightTon.toFixed(2)} <span className="text-xs text-emerald-400 font-bold">Ton</span>
            </span>
            <span className="text-[10px] text-slate-400 block">
              {calculations.totalWeightKg.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg
            </span>
          </div>

          <div className="text-right">
            <span className="text-[9.5px] uppercase font-bold text-slate-400 block">Valor Bruto:</span>
            <span className="text-lg font-black text-emerald-400 font-mono">
              R$ {calculations.grossRevenueWeight.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-emerald-300 font-bold block">
              +{calculations.profitMarginPct.toFixed(0)}% lucro
            </span>
          </div>
        </div>
      </div>

      {/* ABA 1: BIPAR CÓDIGO DE BARRAS & CARRINHO DE COMPRAS NO PORTÃO */}
      {activeTab === "bipar_carrinho" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          <GlassBarcodeScannerCart
            sellPricePerTon={sellPricePerTon}
            buyerName={buyerName}
            onAddItemsToYardStock={handleAddItemsFromCartToYardStock}
            showNotification={showNotification}
          />
        </motion.div>
      )}

      {/* ABA 2: TABELA DE LOTES DE R$ 0,50 & BALCÃO DO PORTÃO */}
      {activeTab === "lotes_50centavos" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          {/* SELETOR INTERATIVO DO VALOR DA MOEDA DE PAGAMENTO */}
          <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider block">
                  Regra Prática de Caixa sem Balança
                </span>
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2 mt-0.5">
                  <Coins className="w-5 h-5 text-amber-400" />
                  Quanto Pagar no Portão: Escolha a Moeda / Nota
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  Clique na moeda que você tem no caixa para pagar o catador. O sistema calcula automaticamente o <strong>mínimo de garrafas</strong> para você nunca ter prejuízo!
                </p>
              </div>

              {/* CHIPS RÁPIDOS DE MOEDAS */}
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { label: "R$ 0,50 (50 Centavos)", val: 0.50, highlight: true },
                  { label: "R$ 1,00 (1 Real)", val: 1.00 },
                  { label: "R$ 2,00 (2 Reais)", val: 2.00 },
                  { label: "R$ 5,00 (5 Reais)", val: 5.00 }
                ].map((chip) => (
                  <button
                    key={chip.val}
                    type="button"
                    onClick={() => setTargetCoinPayout(chip.val)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                      Math.abs(targetCoinPayout - chip.val) < 0.01
                        ? "bg-amber-400 text-slate-950 border-amber-300 shadow-md shadow-amber-400/20 scale-105"
                        : "bg-slate-950 text-slate-300 border-white/10 hover:border-amber-400/40"
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* RESUMO DA MATEMÁTICA DO LOTE SELECIONADO */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-900/80 rounded-xl border border-white/5 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Moeda Paga ao Catador:</span>
                <strong className="text-xl font-mono text-amber-400 font-black">
                  R$ {lotCalculations.coin.toFixed(2)}
                </strong>
                <span className="text-[10px] text-slate-400 block">Pagamento redondo na mão</span>
              </div>

              <div className="p-3 bg-slate-900/80 rounded-xl border border-white/5 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Peso Mínimo do Lote Necessário:</span>
                <strong className="text-xl font-mono text-white font-black">
                  ~{lotCalculations.targetWeightKg.toFixed(1)} kg de vidro
                </strong>
                <span className="text-[10px] text-slate-400 block">Para garantir ~33% de lucro</span>
              </div>

              <div className="p-3 bg-slate-900/80 rounded-xl border border-white/5 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Valor Bruto na Usina (R$ 0,15/kg):</span>
                <strong className="text-xl font-mono text-emerald-400 font-black">
                  R$ {lotCalculations.targetPlantRevenue.toFixed(2)}
                </strong>
                <span className="text-[10px] text-emerald-300 font-bold block">
                  Lucro médio: +R$ {(lotCalculations.targetPlantRevenue - lotCalculations.coin).toFixed(2)} por lote
                </span>
              </div>
            </div>

            {/* CALCULADORA ESPECÍFICA: LONGNECK POR DEZENAS & DREHER POR PARES */}
            <div className="bg-slate-950 p-4 sm:p-5 rounded-2xl border border-amber-500/30 space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400">
                    <Scale className="w-4 h-4" />
                  </span>
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">
                      Cálculos Exatos: Longneck (6 = 1.112g) & Dreher (900ml / ~500g)
                    </h4>
                    <span className="text-[10px] text-slate-400">
                      Responde direto aos comandos de dezenas e lotinhos do pátio
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. LONGNECKS POR DEZENA */}
                {(() => {
                  const unitWeight = 1.112 / 6; // 0.18533 kg
                  const totalUnits = simLongneckDezenas * 10;
                  const totalWeight = totalUnits * unitWeight;
                  const plantValue = totalWeight * calculations.sellPricePerKg;
                  // Sugestão de pagamento justo com margem:
                  let suggestedPayout = 0.20;
                  if (simLongneckDezenas === 1) suggestedPayout = 0.15;
                  else if (simLongneckDezenas === 2) suggestedPayout = 0.35;
                  else if (simLongneckDezenas === 3) suggestedPayout = 0.50; // O Lote Perfeito!
                  else if (simLongneckDezenas === 5) suggestedPayout = 0.85;
                  else if (simLongneckDezenas === 10) suggestedPayout = 1.60;
                  else suggestedPayout = Math.max(0.10, Number((plantValue * 0.60).toFixed(2)));

                  const profit = plantValue - suggestedPayout;
                  const margin = plantValue > 0 ? (profit / plantValue) * 100 : 0;

                  return (
                    <div className="p-4 rounded-xl bg-slate-900 border border-white/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">🍺</span>
                          <div>
                            <span className="text-xs font-black text-white block">Longnecks por Dezenas</span>
                            <span className="text-[10px] text-slate-400">6 garrafas = 1,112 kg (185,3g cada)</span>
                          </div>
                        </div>
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded">
                          {totalUnits} unidades
                        </span>
                      </div>

                      {/* Seletor de Dezenas */}
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-slate-400 block">
                          Quantas Dezenas o Catador Trouxe:
                        </label>
                        <div className="grid grid-cols-5 gap-1">
                          {[
                            { label: "1 (10un)", val: 1 },
                            { label: "2 (20un)", val: 2 },
                            { label: "3 (30un) ⭐", val: 3 },
                            { label: "5 (50un)", val: 5 },
                            { label: "10 (100un)", val: 10 }
                          ].map((d) => (
                            <button
                              key={d.val}
                              type="button"
                              onClick={() => setSimLongneckDezenas(d.val)}
                              className={`py-1.5 px-1 rounded-lg text-[10px] font-black border transition-all cursor-pointer ${
                                simLongneckDezenas === d.val
                                  ? "bg-amber-400 text-slate-950 border-amber-300 shadow-md font-black"
                                  : "bg-slate-950 text-slate-300 border-white/5 hover:border-white/20"
                              }`}
                            >
                              {d.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Dados Financeiros */}
                      <div className="bg-slate-950 p-3 rounded-xl border border-white/5 space-y-1.5 text-xs">
                        <div className="flex justify-between text-slate-400">
                          <span>Peso das {totalUnits} Longnecks:</span>
                          <strong className="text-white font-mono">{totalWeight.toFixed(2)} kg</strong>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Valor Bruto na Usina (R$ 0,15/kg):</span>
                          <strong className="text-emerald-400 font-mono">R$ {plantValue.toFixed(2)}</strong>
                        </div>
                        <div className="flex justify-between items-center pt-1 border-t border-white/5">
                          <span className="text-amber-400 font-black">Pagar ao Catador:</span>
                          <strong className="text-base text-amber-400 font-mono font-black">
                            R$ {suggestedPayout.toFixed(2)}
                          </strong>
                        </div>
                        <div className="flex justify-between text-[11px] text-emerald-300 font-bold">
                          <span>Seu Lucro Líquido:</span>
                          <span>+R$ {profit.toFixed(2)} ({margin.toFixed(0)}% margem)</span>
                        </div>
                      </div>

                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        {simLongneckDezenas === 3 ? (
                          <strong className="text-amber-300">
                            ⭐ Lote de Ouro: 30 longnecks pesam 5,56 kg. Pague 1 moeda de R$ 0,50 e lucre R$ 0,33!
                          </strong>
                        ) : simLongneckDezenas === 1 ? (
                          <span>10 unidades valem 28 centavos na usina. Pague R$ 0,15 a R$ 0,20.</span>
                        ) : (
                          <span>Proporção ideal para manter mais de 35% de lucro no pátio.</span>
                        )}
                      </p>
                    </div>
                  );
                })()}

                {/* 2. DREHER / 51 POR PARES E LOTINHOS */}
                {(() => {
                  const unitWeight = 0.49; // Quase 500g (490g)
                  const totalUnits = simDreherPares * 2;
                  const totalWeight = totalUnits * unitWeight;
                  const plantValue = totalWeight * calculations.sellPricePerKg;
                  // Sugestão de pagamento justo:
                  let suggestedPayout = 0.50;
                  if (simDreherPares === 1) suggestedPayout = 0.10; // 2 garrafas = 1 kg = 15 centavos na usina
                  else if (simDreherPares === 2) suggestedPayout = 0.20; // 4 garrafas = 2 kg = 30 centavos
                  else if (simDreherPares === 5) suggestedPayout = 0.50; // 10 garrafas = 5 kg = 75 centavos ⭐
                  else if (simDreherPares === 10) suggestedPayout = 1.00; // 20 garrafas = 10 kg = 1,50 ⭐
                  else if (simDreherPares === 50) suggestedPayout = 5.00; // 100 garrafas = 50 kg = 7,50
                  else suggestedPayout = Math.max(0.10, Number((plantValue * 0.65).toFixed(2)));

                  const profit = plantValue - suggestedPayout;
                  const margin = plantValue > 0 ? (profit / plantValue) * 100 : 0;

                  return (
                    <div className="p-4 rounded-xl bg-slate-900 border border-white/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">🍾</span>
                          <div>
                            <span className="text-xs font-black text-white block">Dreher & 51 por Pares / Lotinhos</span>
                            <span className="text-[10px] text-slate-400">2 garrafas = ~1 kg (quase 500g cada)</span>
                          </div>
                        </div>
                        <span className="text-[10px] bg-teal-500/20 text-teal-300 font-bold px-2 py-0.5 rounded">
                          {totalUnits} unidades ({simDreherPares} pares)
                        </span>
                      </div>

                      {/* Seletor de Pares / Lotinhos */}
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-slate-400 block">
                          Tamanho do Lotinho de Dreher:
                        </label>
                        <div className="grid grid-cols-5 gap-1">
                          {[
                            { label: "1 par (2un)", val: 1 },
                            { label: "2 pares (4un)", val: 2 },
                            { label: "5 pares (10un) ⭐", val: 5 },
                            { label: "10 pares (20un)", val: 10 },
                            { label: "50 pares (100un)", val: 50 }
                          ].map((p) => (
                            <button
                              key={p.val}
                              type="button"
                              onClick={() => setSimDreherPares(p.val)}
                              className={`py-1.5 px-1 rounded-lg text-[10px] font-black border transition-all cursor-pointer ${
                                simDreherPares === p.val
                                  ? "bg-teal-400 text-slate-950 border-teal-300 shadow-md font-black"
                                  : "bg-slate-950 text-slate-300 border-white/5 hover:border-white/20"
                              }`}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Dados Financeiros */}
                      <div className="bg-slate-950 p-3 rounded-xl border border-white/5 space-y-1.5 text-xs">
                        <div className="flex justify-between text-slate-400">
                          <span>Peso das {totalUnits} Garrafas Dreher:</span>
                          <strong className="text-white font-mono">{totalWeight.toFixed(1)} kg</strong>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Valor Bruto na Usina (R$ 0,15/kg):</span>
                          <strong className="text-emerald-400 font-mono">R$ {plantValue.toFixed(2)}</strong>
                        </div>
                        <div className="flex justify-between items-center pt-1 border-t border-white/5">
                          <span className="text-teal-400 font-black">Pagar ao Catador:</span>
                          <strong className="text-base text-teal-400 font-mono font-black">
                            R$ {suggestedPayout.toFixed(2)}
                          </strong>
                        </div>
                        <div className="flex justify-between text-[11px] text-emerald-300 font-bold">
                          <span>Seu Lucro Líquido:</span>
                          <span>+R$ {profit.toFixed(2)} ({margin.toFixed(0)}% margem)</span>
                        </div>
                      </div>

                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        {simDreherPares === 1 ? (
                          <strong className="text-rose-400">
                            ⚠️ CUIDADO: 2 garrafas (1 kg) valem apenas R$ 0,15 na usina! NÃO pague R$ 0,50 nelas!
                          </strong>
                        ) : simDreherPares === 5 ? (
                          <strong className="text-emerald-400">
                            ⭐ Lote Perfeito: 10 garrafas (5 kg). Vale R$ 0,75 na usina. Pague R$ 0,50 e lucre R$ 0,25!
                          </strong>
                        ) : (
                          <span>10 garrafas = R$ 0,50 | 20 garrafas = R$ 1,00 | 100 garrafas = R$ 5,00!</span>
                        )}
                      </p>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* TABELA VISUAL DE LOTES POR TIPO DE GARRAFA */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                  <Wine className="w-4 h-4 text-emerald-400" />
                  Mínimo de Unidades por Tipo de Garrafa para Pagar R$ {lotCalculations.coin.toFixed(2)}:
                </h4>
                <span className="text-[10px] text-slate-400">
                  Clique em <strong>"Comprar Lote"</strong> para registrar no estoque
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {lotCalculations.calculatedLots.map((lot) => (
                  <div
                    key={lot.id}
                    className={`p-4 rounded-2xl border transition-all space-y-3 text-left relative overflow-hidden ${
                      lot.isReturnable
                        ? "bg-gradient-to-br from-emerald-950/40 via-slate-950 to-teal-950/40 border-emerald-500/50 shadow-lg"
                        : "bg-slate-950/90 border-white/10 hover:border-amber-400/40"
                    }`}
                  >
                    {/* Cabeçalho do Card */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-2xl p-1 bg-slate-900 rounded-xl border border-white/5">{lot.emoji}</span>
                        <div className="min-w-0">
                          <h5 className="text-xs sm:text-sm font-black text-white truncate">{lot.name}</h5>
                          <span className="text-[10px] text-slate-400 block">
                            Peso individual: {(lot.unitWeightKg * 1000).toFixed(0)}g cada
                          </span>
                        </div>
                      </div>

                      <span
                        className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 border ${
                          lot.isReturnable
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                            : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                        }`}
                      >
                        {lot.badge}
                      </span>
                    </div>

                    {/* Destaque do Lote Recomendado */}
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-white/5 flex items-center justify-between">
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase block">Lote Mínimo:</span>
                        <div className="text-xl sm:text-2xl font-black text-amber-400 font-mono">
                          {lot.unitsNeeded}{" "}
                          <span className="text-xs text-white font-sans font-bold">
                            {lot.category === "caco" ? "sacola / balde" : "garrafas"}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[9px] font-bold text-slate-400 uppercase block">Pagar ao Catador:</span>
                        <div className="text-xl font-black text-white font-mono">
                          R$ {lot.payoutToCollector.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {/* Explicação e Margem de Lucro */}
                    <div className="text-xs space-y-1">
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-white/5">
                        <span className="text-slate-400">Peso Total do Lote:</span>
                        <strong className="text-white font-mono">~{lot.totalWeightKg.toFixed(1)} kg</strong>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Venda {lot.isReturnable ? "ao Bar" : "na Usina"}:</span>
                        <strong className="text-emerald-400 font-mono">R$ {lot.plantRevenue.toFixed(2)}</strong>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-300 font-bold">Seu Lucro Líquido:</span>
                        <strong className="text-emerald-300 font-mono font-bold">
                          +R$ {lot.netProfit.toFixed(2)} ({lot.marginPct.toFixed(0)}% margem)
                        </strong>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-snug bg-slate-900/50 p-2 rounded-lg border border-white/5">
                      💡 {lot.explanation}
                    </p>

                    {/* Botão de Compra no Balcão */}
                    <button
                      type="button"
                      onClick={() => handleBuyLotAtGate(lot)}
                      className="w-full py-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 active:scale-95 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/20"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Comprar Este Lote no Portão (+ Entrada)</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* HISTÓRICO RÁPIDO DE COMPRAS FEITAS HOJE NO PORTÃO */}
            {purchaseHistory.length > 0 && (
              <div className="bg-slate-950 p-4 rounded-2xl border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Compras Registradas no Portão Hoje ({purchaseHistory.length}):
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setPurchaseHistory([]);
                      localStorage.removeItem("pdv_glass_gate_logs_today");
                    }}
                    className="text-[10px] text-slate-500 hover:text-rose-400 cursor-pointer"
                  >
                    Limpar histórico de hoje
                  </button>
                </div>

                <div className="divide-y divide-white/5 max-h-48 overflow-y-auto pr-1 text-xs">
                  {purchaseHistory.map((log) => (
                    <div key={log.id} className="py-2 flex items-center justify-between gap-2">
                      <div>
                        <div className="text-white font-bold">
                          {log.units} un de {log.itemName}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          Horário: {log.timestamp} • ~{log.estimatedWeightKg.toFixed(1)} kg
                        </span>
                      </div>

                      <div className="text-right">
                        <div className="text-amber-400 font-mono font-bold">
                          Pago: R$ {log.paidAmount.toFixed(2)}
                        </div>
                        <span className="text-[10px] text-emerald-400 font-bold block">
                          Lucro: +R$ {log.estimatedProfit.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ABA 2: CONTAGEM DE GARRAFAS NO PÁTIO */}
      {activeTab === "contagem" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-4 sm:p-6 space-y-5 shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div>
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <Wine className="w-5 h-5 text-emerald-400" />
                  Contagem de Garrafas & Cacos sem Balança
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Digite quantas garrafas você tem acumuladas no pátio. O sistema multiplica pelo peso médio de fábrica de cada uma.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Novo Tipo</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetToDefaults}
                  className="px-3 py-2 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white font-bold text-xs uppercase rounded-xl border border-white/10 transition-all flex items-center gap-1 cursor-pointer"
                  title="Restaurar tabela padrão de pesos do Gemini"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Padrão</span>
                </button>
              </div>
            </div>

            {/* CARDS DE CADA TIPO DE GARRAFA */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {calculations.detailedItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-950/90 border border-white/10 hover:border-emerald-500/40 rounded-2xl p-4 space-y-3 transition-all shadow-sm"
                >
                  {/* Linha 1: Emoji, Nome Editável e Botão Excluir */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <span className="text-2xl p-1 bg-slate-900 rounded-xl border border-white/5">{item.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleUpdateItem(item.id, "name", e.target.value)}
                          className="w-full bg-transparent text-xs sm:text-sm font-black text-white outline-none border-b border-white/10 focus:border-emerald-400 py-0.5"
                          placeholder="Nome da garrafa..."
                        />
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {item.weightDescription}
                        </span>
                      </div>
                    </div>

                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id, item.name)}
                        className="text-slate-600 hover:text-rose-400 p-1 transition-all"
                        title="Remover este item da contagem"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Linha 2: Quantidade Contada + Peso Unitário + Preço de Compra */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5 text-left">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-amber-400 block">
                        Quantas no Pátio:
                      </label>
                      <SmartNumericInput
                        value={item.quantity}
                        onChange={(val) => handleUpdateItem(item.id, "quantity", Math.max(0, Math.round(val)))}
                        allowDecimals={false}
                        clearable
                        className="py-1 text-xs font-black font-mono text-white"
                        placeholder="0"
                      />
                      <span className="text-[9px] text-slate-500 block">
                        {item.category === "caco" ? "recipientes" : "unidades"}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-400 block">
                        Peso Unitário (kg):
                      </label>
                      <SmartNumericInput
                        value={item.unitWeightKg}
                        onChange={(val) => handleUpdateItem(item.id, "unitWeightKg", Math.max(0.01, val))}
                        step={0.05}
                        allowDecimals
                        clearable
                        className="py-1 text-xs font-mono text-slate-300"
                        placeholder="0,50"
                      />
                      <span className="text-[9px] text-slate-500 block">
                        {(item.unitWeightKg * 1000).toFixed(0)}g cada
                      </span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-rose-400 block">
                        Paga ao Catador (R$):
                      </label>
                      <SmartNumericInput
                        value={item.buyPricePerUnit}
                        onChange={(val) => handleUpdateItem(item.id, "buyPricePerUnit", Math.max(0, val))}
                        prefix="R$"
                        step={0.01}
                        allowDecimals
                        clearable
                        className="py-1 text-xs font-mono text-rose-300"
                        placeholder="0,05"
                      />
                      <span className="text-[9px] text-slate-500 block">
                        {item.buyPricePerUnit === 0 ? "Grátis / Doação" : "Custo unitário"}
                      </span>
                    </div>
                  </div>

                  {/* Linha 3: Subtotal de Peso e Lucro Deste Item */}
                  <div className="bg-slate-900/90 p-2.5 rounded-xl border border-white/5 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Peso Acumulado:</span>
                      <strong className="text-emerald-400 font-mono font-black text-sm">
                        {item.itemTotalWeightKg >= 1000
                          ? `${(item.itemTotalWeightKg / 1000).toFixed(2)} t`
                          : `${item.itemTotalWeightKg.toFixed(1)} kg`}
                      </strong>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">Venda na Usina / Lucro:</span>
                      <span className="text-white font-mono font-bold">
                        R$ {item.itemSellValueWeight.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-emerald-300 font-bold block">
                        Lucro Líquido: +R$ {item.itemProfit.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* BARRA INFERIOR DE TOTAIS */}
            <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-300 space-y-0.5">
                <div>
                  Total de Garrafas: <strong className="text-white">{calculations.totalGlassUnits.toLocaleString("pt-BR")}</strong> unidades
                </div>
                <div>
                  Peso Total Estimado: <strong className="text-emerald-400 font-black">{calculations.totalWeightKg.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg</strong> ({calculations.totalWeightTon.toFixed(2)} Toneladas)
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={handleManualSave}
                  className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-95 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xl shadow-emerald-500/25"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>💾 Salvar Contagem do Pátio</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ABA 3: METAS DE CARGA DE CAMINHÃO (1T, 3T, 5T) */}
      {activeTab === "cargas" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-5 sm:p-6 space-y-6 text-left shadow-2xl">
            <div>
              <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider block">
                Planejamento de Logística & Cotação Máxima
              </span>
              <h3 className="text-lg font-black text-white flex items-center gap-2 mt-0.5">
                <Truck className="w-5 h-5 text-amber-400" />
                Termômetro de Carga para Chamar o Caminhão do Comprador
              </h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                As usinas e transportadores pagam melhor quanto maior a carga. Veja exatamente onde você está hoje e quantas garrafas ainda precisa juntar para fechar o caminhão!
              </p>
            </div>

            {/* 3 NÍVEIS DE CARGA */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Meta 1: 1 Tonelada */}
              <div className={`p-4 rounded-2xl border transition-all ${
                calculations.totalWeightKg >= 1000
                  ? "bg-emerald-950/40 border-emerald-500/60 shadow-lg shadow-emerald-950/40"
                  : "bg-slate-950/80 border-white/10"
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-black uppercase">
                    Nível 1 • Básico
                  </span>
                  <span className="text-xs font-black text-white font-mono">1.000 kg (1 Ton)</span>
                </div>
                <div className="text-lg font-black text-white mt-1">
                  ~2.000 Garrafas de 51
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Valor Bruto a R$ 150/t: <strong className="text-emerald-400">R$ 150,00</strong>
                </div>

                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-3">
                  <div
                    className="bg-emerald-400 h-full transition-all duration-500"
                    style={{ width: `${calculations.progressTo1Ton}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-400 mt-1.5 flex justify-between">
                  <span>{calculations.progressTo1Ton.toFixed(0)}% concluído</span>
                  {calculations.kgNeededFor1Ton > 0 ? (
                    <span className="text-amber-400 font-bold">Faltam {calculations.kgNeededFor1Ton.toFixed(0)} kg</span>
                  ) : (
                    <span className="text-emerald-400 font-bold">Concluído! ✔️</span>
                  )}
                </div>
              </div>

              {/* Meta 2: Carga Mínima (3 Toneladas) */}
              <div className={`p-4 rounded-2xl border transition-all ${
                calculations.totalWeightKg >= 3000
                  ? "bg-emerald-950/40 border-emerald-500/60 shadow-lg shadow-emerald-950/40"
                  : "bg-slate-950/80 border-white/10"
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase">
                    Nível 2 • Carga Mínima
                  </span>
                  <span className="text-xs font-black text-white font-mono">3.000 kg (3 Ton)</span>
                </div>
                <div className="text-lg font-black text-white mt-1">
                  ~6.000 Garrafas de 51
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Valor Bruto a R$ 150/t: <strong className="text-emerald-400">R$ 450,00</strong>
                </div>

                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-3">
                  <div
                    className="bg-amber-400 h-full transition-all duration-500"
                    style={{ width: `${calculations.progressTo3Ton}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-400 mt-1.5 flex justify-between">
                  <span>{calculations.progressTo3Ton.toFixed(0)}% concluído</span>
                  {calculations.kgNeededFor3Ton > 0 ? (
                    <span className="text-amber-400 font-bold">Faltam {calculations.kgNeededFor3Ton.toFixed(0)} kg</span>
                  ) : (
                    <span className="text-emerald-400 font-bold">Concluído! ✔️</span>
                  )}
                </div>
              </div>

              {/* Meta 3: Melhor Carga (5 Toneladas) */}
              <div className={`p-4 rounded-2xl border transition-all ${
                calculations.totalWeightKg >= 5000
                  ? "bg-emerald-950/40 border-emerald-500/60 shadow-lg shadow-emerald-950/40"
                  : "bg-slate-950/80 border-cyan-500/30"
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-black uppercase">
                    Nível 3 • Melhor Cotação
                  </span>
                  <span className="text-xs font-black text-white font-mono">5.000 kg (5 Ton)</span>
                </div>
                <div className="text-lg font-black text-white mt-1">
                  ~10.000 Garrafas de 51
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Valor Bruto a R$ 150/t: <strong className="text-emerald-400">R$ 750,00</strong>
                </div>

                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-3">
                  <div
                    className="bg-gradient-to-r from-emerald-400 to-cyan-400 h-full transition-all duration-500"
                    style={{ width: `${calculations.progressTo5Ton}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-400 mt-1.5 flex justify-between">
                  <span>{calculations.progressTo5Ton.toFixed(0)}% concluído</span>
                  {calculations.kgNeededFor5Ton > 0 ? (
                    <span className="text-cyan-300 font-bold">Faltam {calculations.kgNeededFor5Ton.toFixed(0)} kg</span>
                  ) : (
                    <span className="text-emerald-400 font-bold">Pronto para o Victor! 🚛🎉</span>
                  )}
                </div>
              </div>
            </div>

            {/* RESUMO DE QUANTAS GARRAFAS FALTAM PARA O CAMINHÃO DO VICTOR */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-white/10 space-y-3">
              <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                Diagnóstico para Fechar a Carga Máxima (5 Toneladas)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-slate-900 rounded-xl border border-white/5">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Quilos Faltantes:</span>
                  <strong className="text-lg text-white font-mono">
                    {calculations.kgNeededFor5Ton.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kg
                  </strong>
                </div>

                <div className="p-3 bg-slate-900 rounded-xl border border-white/5">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Equivalente em Garrafas 51 (500g):</span>
                  <strong className="text-lg text-amber-400 font-mono">
                    ~{calculations.bottlesNeededFor5Ton.toLocaleString("pt-BR")} garrafas
                  </strong>
                </div>

                <div className="p-3 bg-slate-900 rounded-xl border border-white/5">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Ou em Longnecks (185g):</span>
                  <strong className="text-lg text-teal-400 font-mono">
                    ~{Math.ceil(calculations.kgNeededFor5Ton / 0.185).toLocaleString("pt-BR")} garrafas
                  </strong>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed pt-1">
                💡 <strong>Dica de Ouro da Parceria:</strong> Faça rotas semanais com donos de pizzarias, bares e tabacarias. Eles descartam entre 200 a 800 garrafas por fim de semana e ficam felizes de você retirar de graça ou pagando uma quantia simbólica.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* ABA 4: CASCOS RETORNÁVEIS (VALEM MUITO MAIS QUE VIDRO QUEBRADO!) */}
      {activeTab === "retornaveis" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-5 sm:p-6 space-y-5 text-left shadow-2xl">
            <div>
              <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider block">
                O Segredo do Ferro-Velho Esperto
              </span>
              <h3 className="text-lg font-black text-white flex items-center gap-2 mt-0.5">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                Nunca Quebre Garrafas de Cerveja 600ml e Litrões Retornáveis!
              </h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Vidro para usina paga cerca de <strong>15 centavos o quilo</strong> (uma garrafa de 450g vale menos de R$ 0,07 no peso). Mas se o <strong>casco de 600ml ou litrão estiver inteiro e limpo</strong>, bares e depósitos de bebidas compram por <strong>R$ 0,80 a R$ 1,50 cada</strong>!
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-rose-950/20 border-2 border-rose-500/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-rose-400">
                    Se você quebrar e vender no peso:
                  </span>
                  <span className="text-[10px] bg-rose-500/20 text-rose-300 font-bold px-2 py-0.5 rounded">
                    Preço de Usina
                  </span>
                </div>
                <div className="text-2xl font-black text-white font-mono">
                  R$ 0,07 <span className="text-xs text-slate-400">por garrafa</span>
                </div>
                <p className="text-xs text-rose-200 leading-relaxed">
                  100 garrafas de 600ml pesam 45 kg. Na usina a R$ 0,15/kg, você ganha míseros <strong>R$ 6,75</strong>.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-emerald-950/30 border-2 border-emerald-500/50 space-y-2.5 shadow-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                    Se você separar e vender para bares/depósitos:
                  </span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-black px-2 py-0.5 rounded">
                    Lucro 15x Maior!
                  </span>
                </div>
                <div className="text-2xl font-black text-emerald-400 font-mono">
                  R$ 0,80 a R$ 1,20 <span className="text-xs text-slate-300">por garrafa</span>
                </div>
                <p className="text-xs text-emerald-200 leading-relaxed">
                  As mesmas 100 garrafas intactas vendidas para o dono do depósito de bebidas viram <strong>R$ 80,00 a R$ 120,00</strong>!
                </p>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-white/10 space-y-2 text-xs text-slate-300">
              <h4 className="text-xs font-black text-white uppercase flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Como organizar os cascos no ferro-velho:
              </h4>
              <ul className="space-y-1.5 pl-4 list-disc text-slate-300">
                <li>
                  <strong>Engradados plásticos:</strong> Junte garrafas de cerveja 600ml (Ambev, Heineken, Spaten) direto em caixas de plástico amarelas/vermelhas de 24 garrafas. Os bares pagam na hora.
                </li>
                <li>
                  <strong>Potes de palmito e conserva grandes:</strong> Fabricantes caseiros de doces e conservas compram os potes lavados por R$ 0,50 a R$ 1,00 cada.
                </li>
                <li>
                  <strong>O que quebrar sem dó:</strong> Longnecks descartáveis, cachaça 51/Dreher comuns não-retornáveis, garrafas de vinho comuns e vidros quebrados devem ser triturados para economizar espaço e vendidos para a usina.
                </li>
              </ul>
            </div>
          </div>
        </motion.div>
      )}

      {/* ABA 5: MANUAL DO PÁTIO, ESPAÇO & DICAS DO FERRO VELHO */}
      {activeTab === "dicas_ferro_velho" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-950 p-6 rounded-3xl border border-white/10 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    Como Guardar 5 Toneladas sem Entupir o Espaço
                  </h3>
                  <span className="text-[10px] text-slate-400">
                    Triturar e quebrar os vidros não-retornáveis
                  </span>
                </div>
              </div>

              <div className="space-y-3 text-xs text-slate-300">
                <div className="p-3 rounded-2xl bg-slate-900 border border-white/5 space-y-1">
                  <span className="font-black text-amber-400 block text-xs">
                    1. Garrafa Inteira é 90% Ar
                  </span>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    10.000 garrafas inteiras empilhadas ocupam um caminhão inteiro de volume. Se você quebrar os vidros não-retornáveis com um pilão ou triturador dentro de tambores de metal ou Big Bags, o volume cai 70%!
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-900 border border-white/5 space-y-1">
                  <span className="font-black text-amber-400 block text-xs">
                    2. Big Bags Reforçadas no Pátio
                  </span>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Use sacos Big Bag de 1 tonelada com alças. Quando o caminhão com muque (guindaste) chegar, ele engata nas alças e carrega em 5 minutos sem trabalho braçal.
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-900 border border-white/5 space-y-1">
                  <span className="font-black text-amber-400 block text-xs">
                    3. Separação por Cores (Ganha Bônus)
                  </span>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Se você conseguir separar o vidro transparente (cristal) do âmbar (marrom de cerveja) e verde, muitas usinas pagam de 10% a 25% a mais por tonelada!
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-950 p-6 rounded-3xl border border-white/10 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-300">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    Segurança, EPI & Parceria com Catadores
                  </h3>
                  <span className="text-[10px] text-slate-400">
                    Trabalho seguro e clientes fiéis
                  </span>
                </div>
              </div>

              <div className="space-y-3 text-xs text-slate-300">
                <div className="p-3 rounded-2xl bg-slate-900 border border-emerald-500/20 space-y-1">
                  <span className="font-black text-emerald-400 block text-xs">
                    1. Luvas de Raspa / Anticorte e Óculos
                  </span>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Vidro quebrado espirra farpas. Nunca manipule garrafas ou cacos sem óculos de proteção e luvas de couro/anticorte grossas com cano longo.
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-900 border border-emerald-500/20 space-y-1">
                  <span className="font-black text-emerald-400 block text-xs">
                    2. Ímã para Retirar Tampinhas de Metal
                  </span>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Passe um ímã forte nos cacos: as tampinhas de metal das garrafas grudam e você junta em um balde. Tampinha de metal é sucata de ferro vendida separadamente por quilo!
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-900 border border-emerald-500/20 space-y-1">
                  <span className="font-black text-emerald-400 block text-xs">
                    3. Seja o Ponto de Referência do Bairro
                  </span>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Coloque uma placa na frente: "Compramos garrafas e vidros para reciclagem". Os catadores da região passarão a descarregar direto com você em vez de andar quilômetros até outra cidade.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
