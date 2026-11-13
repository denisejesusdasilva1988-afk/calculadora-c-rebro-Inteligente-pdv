import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Camera,
  Barcode,
  Plus,
  Trash2,
  Edit3,
  ShoppingCart,
  Check,
  RefreshCw,
  X,
  Share2,
  DollarSign,
  Scale,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Search,
  Zap,
  Tag,
  Wine,
  Coins,
  User,
  UserPlus,
  Users,
  History,
  FileText,
  Truck,
  Eraser,
  Calendar,
  CreditCard,
  Banknote,
  Award,
  Crown,
  ChevronRight,
  CheckSquare,
  Copy,
  Printer,
  Sliders,
  Package
} from "lucide-react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { SmartNumericInput } from "./SmartNumericInput";
import {
  loadPrinterConfig,
  executeThermalPrint,
  PrinterConfig
} from "../../utils/thermalPrinterHelper";

export interface CatalogBottleItem {
  id: string;
  name: string; // Nome da garrafa (ex: "Heineken Longneck", "Dreher", "Cachaça 51")
  volumeMl: number; // Volume em ML (ex: 330ml, 210ml, 275ml, 900ml, 600ml, 1000ml)
  barcode: string; // Código de barras principal EAN (ex: "78936683")
  additionalBarcodes?: string[]; // Até 4 códigos extras (total de 1 a 5 códigos por item, ex: Stella, Império)
  unitWeightGrams: number; // Peso da garrafa vazia na balança em gramas (ex: 185g, 490g, 500g)
  unitWeightKg: number; // Peso em kg (ex: 0.185 kg)
  category: "longneck" | "900ml" | "litrao" | "cerveja600" | "vinho" | "pote" | "caco" | "outro";
  buyPricePerUnit: number; // Preço pago ao colaborador por unidade (R$)
  returnableSellPrice?: number; // Preço se for casco retornável inteiro para bar (R$)
  warningAlert?: string; // Alerta de margem de lucro / casco retornável vs caco
  emoji: string;
  stockUnits: number; // Estoque real acumulado no pátio desta garrafa
  quickPresets: number[]; // [3, 6, 10, 20, 25, 30, 60] ou [2, 4, 10, 20, 25, 100]
}

export interface OtherScrapMaterial {
  id: string;
  name: string;
  emoji: string;
  stockKg: number;
  buyPricePerKg: number;
  notes?: string;
}

export interface GlassCartItem {
  id: string;
  catalogId: string;
  name: string;
  volumeMl: number; // Volume em ML
  barcode: string;
  category: "longneck" | "900ml" | "litrao" | "cerveja600" | "vinho" | "pote" | "caco" | "outro";
  warningAlert?: string;
  emoji: string;
  quantity: number;
  unitWeightGrams: number; // Peso unitário em gramas
  unitWeightKg: number; // Peso unitário em kg
  totalWeightKg: number; // Peso total desta garrafa no carrinho
  buyPricePerUnit: number;
  totalBuyCost: number; // Valor a pagar ao colaborador por este lote
  sellPriceUnitOrWeight: number; // Valor bruto na usina ou retorno
  totalRevenue: number;
  profit: number;
}

export interface CollaboratorAccount {
  id: string;
  name: string;
  isFounder?: boolean; // Denise Jesus e Wellington Oliveira!
  phone?: string;
  notes?: string;
  createdAt: string;
  totalDeliveries: number;
  totalBottles: number;
  totalWeightKg: number;
  totalEarned: number; // Faturamento total que o colaborador acumulou a receber (R$)
  totalPaid: number;   // Já pago
  balancePending: number; // Saldo a pagar ainda
}

export interface CollaboratorPaymentReceipt {
  id: string;
  timestamp: string;
  collaboratorId: string;
  collaboratorName: string;
  amountPaid: number;
  paymentMethod: "bolsa_familia" | "caminhao_victor" | "dinheiro" | "pix";
  methodLabel: string;
  notes: string;
  previousBalance: number;
  remainingBalance: number;
}

export interface CompletedPurchaseTicket {
  id: string;
  timestamp: string;
  collectorName: string;
  isFounder: boolean; // Se foi coleta própria de Denise e Wellington
  items: {
    name: string;
    volumeMl: number;
    barcode: string;
    quantity: number;
    unitWeightGrams: number;
    totalWeightKg: number;
    costPaid: number;
  }[];
  totalBottles: number;
  totalWeightKg: number;
  totalPaid: number;
  expectedPlantRevenue: number;
  netProfit: number;
  paymentStatus: "pago_na_hora" | "pendente_caderninho" | "coleta_propria_dw";
  sellPricePerTonUsed?: number;
}

export interface DispatchedTruckShipment {
  id: string;
  timestamp: string;
  buyerName: string;
  totalBottles: number;
  totalWeightKg: number;
  totalWeightTon: number;
  grossRevenueReceived: number;
  summaryText: string;
}

// Catálogo com estoque inicial ZERADO (Denise e Wellington preenchem com a realidade do pátio!)
const DEFAULT_BOTTLE_CATALOG: CatalogBottleItem[] = [
  {
    id: "bottle_cachaca_51_900",
    name: "Cachaça 51 Garrafa (900ml)",
    volumeMl: 900,
    barcode: "", // Aberto para bipar e cadastrar código quando tiver em mãos
    unitWeightGrams: 500, // 500 gramas vazia (2 garrafas = 1 kg exato)
    unitWeightKg: 0.500,
    category: "900ml",
    buyPricePerUnit: 0.05, // 10 garrafas = R$ 0,50 | 20 = R$ 1,00 | 100 = R$ 5,00
    emoji: "🥃",
    stockUnits: 0,
    quickPresets: [2, 4, 10, 20, 25, 100]
  },
  {
    id: "bottle_dreher_900",
    name: "Dreher Garrafa (900ml)",
    volumeMl: 900,
    barcode: "7896010006360",
    unitWeightGrams: 490, // ~490g a 500g vazia na balança
    unitWeightKg: 0.490,
    category: "900ml",
    buyPricePerUnit: 0.05, // 10 garrafas = R$ 0,50 | 20 = R$ 1,00 | 100 = R$ 5,00
    emoji: "🍾",
    stockUnits: 0,
    quickPresets: [2, 4, 10, 20, 25, 100]
  },
  {
    id: "bottle_heineken_330",
    name: "Heineken Longneck (330ml)",
    volumeMl: 330,
    barcode: "78936683",
    unitWeightGrams: 182, // 182 gramas vazia na balança da Denise!
    unitWeightKg: 0.182,
    category: "longneck",
    buyPricePerUnit: 0.50 / 30, // 30 garrafas = R$ 0,50 (1,67¢ por garrafa)
    emoji: "🍺",
    stockUnits: 0,
    quickPresets: [10, 20, 30, 50, 60, 100]
  },
  {
    id: "bottle_imperio_210",
    name: "Império Longneck (210ml)",
    volumeMl: 210,
    barcode: "7898915949162",
    unitWeightGrams: 150, // 150 gramas vazia na balança
    unitWeightKg: 0.150,
    category: "longneck",
    buyPricePerUnit: 0.50 / 30, // 30 garrafas = R$ 0,50 | 60 = R$ 1,00
    emoji: "🍺",
    stockUnits: 0,
    quickPresets: [3, 6, 10, 20, 25, 30, 60]
  },
  {
    id: "bottle_ice_275",
    name: "Ice Longneck (275ml)",
    volumeMl: 275,
    barcode: "7896002111034",
    unitWeightGrams: 170, // 170 gramas vazia na balança
    unitWeightKg: 0.170,
    category: "longneck",
    buyPricePerUnit: 0.50 / 30, // 30 garrafas = R$ 0,50 | 60 = R$ 1,00
    emoji: "🧊",
    stockUnits: 0,
    quickPresets: [3, 6, 10, 20, 25, 30, 60]
  },
  {
    id: "bottle_cerveja_600",
    name: "Cerveja 600ml Tradicional (Vidro Âmbar)",
    volumeMl: 600,
    barcode: "7891991000826",
    unitWeightGrams: 450, // 450 gramas vazia na balança
    unitWeightKg: 0.450,
    category: "cerveja600",
    buyPricePerUnit: 0.50 / 12, // Preço normal por peso: 12 un (~5.4 kg) = R$ 0,50
    emoji: "🍻",
    stockUnits: 0,
    quickPresets: [2, 6, 12, 24, 50]
  },
  {
    id: "bottle_litrao_1000",
    name: "Garrafão Litrão 1 Litro (Vidro)",
    volumeMl: 1000,
    barcode: "7891991001342",
    unitWeightGrams: 700, // 700 gramas vazia na balança
    unitWeightKg: 0.700,
    category: "litrao",
    buyPricePerUnit: 0.50 / 8, // Preço normal por peso: 8 un (~5.6 kg) = R$ 0,50
    emoji: "🍾",
    stockUnits: 0,
    quickPresets: [2, 4, 8, 16, 24]
  },
  {
    id: "bottle_vinho_750",
    name: "Garrafas de Vinho / Espumante (750ml)",
    volumeMl: 750,
    barcode: "",
    unitWeightGrams: 600, // 600g (vidro espesso ~5.4 kg em 9 un)
    unitWeightKg: 0.600,
    category: "vinho",
    buyPricePerUnit: 0.50 / 9, // Lote de 9 garrafas (~5.4 kg) = R$ 0,50
    emoji: "🍷",
    stockUnits: 0,
    quickPresets: [9, 18, 27, 45, 90]
  },
  {
    id: "bottle_potes_conserva",
    name: "Potes de Conserva (Palmito, Azeitona, Maionese)",
    volumeMl: 500,
    barcode: "",
    unitWeightGrams: 280, // 280g (~5.0 kg em 18 un)
    unitWeightKg: 0.280,
    category: "pote",
    buyPricePerUnit: 0.50 / 18, // Lote de 18 potes (~5.0 kg) = R$ 0,50
    emoji: "🫙",
    stockUnits: 0,
    quickPresets: [18, 36, 54, 90]
  },
  {
    id: "bottle_cacos_sacola",
    name: "Cacos de Vidro na Sacola Reforçada (1 sacola ~5kg)",
    volumeMl: 5000,
    barcode: "",
    unitWeightGrams: 5000,
    unitWeightKg: 5.0,
    category: "caco",
    buyPricePerUnit: 0.50, // Paga R$ 0,50 por sacola de 5 kg (recebe R$ 0,75 do Victor = Lucro R$ 0,25)
    emoji: "🛍️",
    stockUnits: 0,
    quickPresets: [1, 2, 3, 5, 10]
  },
  {
    id: "bottle_cacos_balde",
    name: "Cacos de Vidro no Balde de 20L (~16kg)",
    volumeMl: 20000,
    barcode: "",
    unitWeightGrams: 16000,
    unitWeightKg: 16.0,
    category: "caco",
    buyPricePerUnit: 1.50, // Paga R$ 1,50 por balde de 16 kg (recebe R$ 2,40 do Victor = Lucro R$ 0,90)
    emoji: "🪣",
    stockUnits: 0,
    quickPresets: [1, 2, 3, 5, 10]
  }
];

// Modelos de Referência para "Cadastrar Parecido / Duplicar"
export const SIMILAR_GLASS_PRESETS = [
  {
    name: "51 / Dreher / Velho Barreiro (900ml)",
    volumeMl: 900,
    unitWeightGrams: 500,
    category: "900ml" as const,
    emoji: "🥃",
    buyPricePerUnit: 0.05,
    quickPresets: [2, 4, 10, 20, 25, 100],
    description: "500g vazia (2 garrafas = 1 kg exato)"
  },
  {
    name: "Heineken / Stella / Corona Longneck (330ml)",
    volumeMl: 330,
    unitWeightGrams: 185,
    category: "longneck" as const,
    emoji: "🍺",
    buyPricePerUnit: 0.50 / 30,
    quickPresets: [3, 6, 10, 20, 25, 30],
    description: "185g vazia (Lote de 30 un = R$ 0,50)"
  },
  {
    name: "Império Longneck (210ml)",
    volumeMl: 210,
    unitWeightGrams: 170,
    category: "longneck" as const,
    emoji: "🍺",
    buyPricePerUnit: 0.50 / 30,
    quickPresets: [3, 6, 10, 20, 25, 30],
    description: "170g vazia"
  },
  {
    name: "Ice Longneck (275ml)",
    volumeMl: 275,
    unitWeightGrams: 210,
    category: "longneck" as const,
    emoji: "🍾",
    buyPricePerUnit: 0.50 / 30,
    quickPresets: [3, 6, 10, 20, 25, 30],
    description: "210g vazia"
  },
  {
    name: "Cerveja 600ml (Vidro 450g)",
    volumeMl: 600,
    unitWeightGrams: 450,
    category: "cerveja600" as const,
    emoji: "🍻",
    buyPricePerUnit: 0.50 / 12,
    quickPresets: [2, 6, 12, 24, 50],
    description: "450g vazia (Preço por peso • Lote 12 un = R$ 0,50)"
  },
  {
    name: "Garrafão Litrão 1 Litro (Vidro 700g)",
    volumeMl: 1000,
    unitWeightGrams: 700,
    category: "litrao" as const,
    emoji: "🍾",
    buyPricePerUnit: 0.50 / 8,
    quickPresets: [2, 4, 8, 16, 24],
    description: "700g vazia (Preço por peso • Lote 8 un = R$ 0,50)"
  },
  {
    name: "Garrafa de Vinho / Espumante (750ml)",
    volumeMl: 750,
    unitWeightGrams: 600,
    category: "vinho" as const,
    emoji: "🍷",
    buyPricePerUnit: 0.50 / 9,
    quickPresets: [9, 18, 27, 45],
    description: "600g vazia (Lote de 9 garrafas = R$ 0,50)"
  },
  {
    name: "Pote de Conserva Médio (Palmito/Azeitona 500ml)",
    volumeMl: 500,
    unitWeightGrams: 280,
    category: "pote" as const,
    emoji: "🫙",
    buyPricePerUnit: 0.50 / 18,
    quickPresets: [18, 36, 54],
    description: "280g vazio (Lote de 18 potes = R$ 0,50)"
  },
  {
    name: "Pote de Maionese / Geléia (350ml)",
    volumeMl: 350,
    unitWeightGrams: 200,
    category: "pote" as const,
    emoji: "🫙",
    buyPricePerUnit: 0.50 / 25,
    quickPresets: [25, 50, 75],
    description: "200g vazio (Lote de 25 potes = R$ 0,50)"
  },
  {
    name: "Pote de Papinha / Molho Pequeno (150ml)",
    volumeMl: 150,
    unitWeightGrams: 130,
    category: "pote" as const,
    emoji: "🫙",
    buyPricePerUnit: 0.50 / 35,
    quickPresets: [35, 70],
    description: "130g vazio"
  },
  {
    name: "Cacos de Vidro na Sacola Reforçada (~5kg)",
    volumeMl: 5000,
    unitWeightGrams: 5000,
    category: "caco" as const,
    emoji: "🛍️",
    buyPricePerUnit: 0.50,
    quickPresets: [1, 2, 3, 5, 10],
    description: "5 kg de cacos = R$ 0,50"
  },
  {
    name: "Cacos de Vidro no Balde de 20L (~16kg)",
    volumeMl: 20000,
    unitWeightGrams: 16000,
    category: "caco" as const,
    emoji: "🪣",
    buyPricePerUnit: 1.50,
    quickPresets: [1, 2, 3, 5, 10],
    description: "16 kg de cacos = R$ 1,50"
  }
];

// Colaboradores da Reciclagem padrão: Denise e Wellington em primeiro lugar com honra!
const INITIAL_COLLABORATORS: CollaboratorAccount[] = [
  {
    id: "collab_dw_fundadores",
    name: "Denise Jesus & Wellington Oliveira (Coleta Própria D.W)",
    isFounder: true,
    phone: "",
    notes: "Fundadores da D.W Vidros. O que reciclamos é lucro 100% nosso e economiza custo de compra!",
    createdAt: "Novembro/2026",
    totalDeliveries: 0,
    totalBottles: 0,
    totalWeightKg: 0,
    totalEarned: 0,
    totalPaid: 0,
    balancePending: 0
  },
  {
    id: "collab_denise_solo",
    name: "Denise Jesus (Coleta Própria)",
    isFounder: true,
    phone: "",
    notes: "Coleta própria da Denise. Economia própria para a D.W Vidros.",
    createdAt: "Novembro/2026",
    totalDeliveries: 0,
    totalBottles: 0,
    totalWeightKg: 0,
    totalEarned: 0,
    totalPaid: 0,
    balancePending: 0
  },
  {
    id: "collab_wellington_solo",
    name: "Wellington Oliveira (Coleta Própria)",
    isFounder: true,
    phone: "",
    notes: "Coleta própria do Wellington. Economia própria para a D.W Vidros.",
    createdAt: "Novembro/2026",
    totalDeliveries: 0,
    totalBottles: 0,
    totalWeightKg: 0,
    totalEarned: 0,
    totalPaid: 0,
    balancePending: 0
  },
  {
    id: "collab_joao",
    name: "João da Carroça (Colaborador)",
    isFounder: false,
    phone: "",
    notes: "Entrega toda terça e quinta. Acerto mensal com Bolsa Família.",
    createdAt: "Novembro/2026",
    totalDeliveries: 0,
    totalBottles: 0,
    totalWeightKg: 0,
    totalEarned: 0,
    totalPaid: 0,
    balancePending: 0
  },
  {
    id: "collab_ze",
    name: "Zé do Vidro (Colaborador)",
    isFounder: false,
    phone: "",
    notes: "Traz garrafas de bares e restaurantes. Acerto no acerto do caminhão.",
    createdAt: "Novembro/2026",
    totalDeliveries: 0,
    totalBottles: 0,
    totalWeightKg: 0,
    totalEarned: 0,
    totalPaid: 0,
    balancePending: 0
  },
  {
    id: "collab_maria",
    name: "Maria da Reciclagem (Colaboradora)",
    isFounder: false,
    phone: "",
    notes: "Parceira fiel da região.",
    createdAt: "Novembro/2026",
    totalDeliveries: 0,
    totalBottles: 0,
    totalWeightKg: 0,
    totalEarned: 0,
    totalPaid: 0,
    balancePending: 0
  }
];

// Peso padrão de referência em gramas por categoria caso o item ainda não tenha gramatura informada
const DEFAULT_CATEGORY_WEIGHT_GRAMS: Record<string, number> = {
  longneck: 182,
  "900ml": 500,
  cerveja600: 450,
  litrao: 700,
  vinho: 600,
  pote: 280,
  caco: 5000,
  outro: 350
};

// Cálculo de unidades no lote de R$ 0,50 calibrado dinamicamente pelo PESO REAL da garrafa
// e pela cotação ativa do Victor, garantindo ~38% de lucro para a D.W Vidros sem prejuízo!
export const getVictorSafeLotUnits = (
  category: string,
  sellPricePerKg = 0.15,
  unitWeightGrams?: number
): number => {
  if (category === "caco") return 1;
  const effectiveSellKg = sellPricePerKg > 0 ? sellPricePerKg : 0.15;
  const grams =
    unitWeightGrams && unitWeightGrams > 0
      ? unitWeightGrams
      : DEFAULT_CATEGORY_WEIGHT_GRAMS[category] || 350;

  // Margem protegida de ~38%: compramos pagando 62% do valor pago pelo Victor na usina
  const buyTargetPerKg = effectiveSellKg * 0.62;
  const targetLotGrams = (0.50 / buyTargetPerKg) * 1000;
  return Math.max(1, Math.round(targetLotGrams / grams));
};

// Cálculo de custo de lote e centavos com proteção automática de margem POR PESO
export const calculateGlassBuyCost = (
  category: string,
  quantity: number,
  defaultUnitCost?: number,
  sellPricePerKg = 0.15,
  unitWeightGrams?: number
): number => {
  if (quantity <= 0) return 0;
  const effectiveSellKg = sellPricePerKg > 0 ? sellPricePerKg : 0.15;

  if (category === "caco") {
    const weightKg = (unitWeightGrams && unitWeightGrams > 0 ? unitWeightGrams : 5000) / 1000;
    const isDefault150Tier = effectiveSellKg >= 0.145 && effectiveSellKg <= 0.155;
    const unitCost =
      isDefault150Tier && defaultUnitCost && defaultUnitCost > 0
        ? defaultUnitCost
        : Math.max(0.05, Number((weightKg * effectiveSellKg * 0.62).toFixed(2)));
    return Math.round(quantity * unitCost * 100) / 100;
  }

  // Todas as garrafas e potes de vidro (incluindo 600ml e Litrão!) são pagos normalmente CONFORME O PESO
  const lotUnits = getVictorSafeLotUnits(category, effectiveSellKg, unitWeightGrams);
  const cost = quantity * (0.50 / lotUnits);
  return Math.round(cost * 100) / 100;
};

// Rótulo explicativo claro em centavos e peso real para cada garrafa
export const getBottleCentavosLabel = (
  category: string,
  defaultUnitCost?: number,
  sellPricePerKg = 0.15,
  unitWeightGrams?: number
): string => {
  const effectiveSellKg = sellPricePerKg > 0 ? sellPricePerKg : 0.15;
  if (category === "caco") {
    const kg = (unitWeightGrams && unitWeightGrams > 0 ? unitWeightGrams : 5000) / 1000;
    const unitCost = calculateGlassBuyCost("caco", 1, defaultUnitCost, effectiveSellKg, unitWeightGrams);
    return `~${kg.toFixed(0)}kg = R$ ${unitCost.toFixed(2)} por un (Lucro ~38%)`;
  }

  const grams =
    unitWeightGrams && unitWeightGrams > 0
      ? unitWeightGrams
      : DEFAULT_CATEGORY_WEIGHT_GRAMS[category] || 350;
  const lotUnits = getVictorSafeLotUnits(category, effectiveSellKg, grams);
  const centavos = ((0.50 / lotUnits) * 100).toFixed(2);
  const itemLabel = category === "pote" ? "pote" : "garrafa";

  return `${centavos}¢ por ${itemLabel} (${lotUnits} un = R$ 0,50 • ${grams}g/un)`;
};

// Som sonoro de bip do scanner
const playScannerBeep = (freq = 1900, duration = 0.08) => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([40, 20, 40]);
    }
  } catch {}
};

// Materiais iniciais de outros ferro velhos (mantidos 100% separados do pátio de vidros!)
const INITIAL_OTHER_SCRAP_MATERIALS: OtherScrapMaterial[] = [
  { id: "scrap_aluminio", name: "Alumínio & Latinhas", emoji: "🥫", stockKg: 0, buyPricePerKg: 5.5, notes: "Separado do vidro" },
  { id: "scrap_ferro", name: "Ferro & Sucata Pesada", emoji: "🔩", stockKg: 0, buyPricePerKg: 0.7, notes: "Ferro batido / chaparia" },
  { id: "scrap_papelao", name: "Papelão & Plástico Limpo", emoji: "📦", stockKg: 0, buyPricePerKg: 0.4, notes: "Fardos / caixas" },
  { id: "scrap_cobre", name: "Cobre & Metais Nobres", emoji: "🪙", stockKg: 0, buyPricePerKg: 35.0, notes: "Fio descascado / misto" }
];

// Construtor de HTML térmico (58mm / 80mm / A4) para Comprovante de Compra no Portão
function buildGlassPurchaseThermalHtml(ticket: CompletedPurchaseTicket, config: PrinterConfig, yardCurrentKg: number, yardGoalKg: number): string {
  const is58mm = config.printerType === "58mm";
  const isA4 = config.printerType === "A4";
  const printableWidth = is58mm ? "48mm" : isA4 ? "100%" : "72mm";
  const maxContainerWidth = is58mm ? "48mm" : isA4 ? "760px" : "72mm";
  const pageSize = is58mm ? "58mm auto" : isA4 ? "A4 portrait" : "80mm auto";
  const fontBasePx = config.fontSize === "pequena" ? (is58mm ? 9.5 : 10.5) : config.fontSize === "grande" ? (is58mm ? 12 : 13.5) : (is58mm ? 10.5 : 11.5);
  const fontHeaderPx = fontBasePx + 2;
  const fontSmallPx = fontBasePx - 1.5;

  const storeTitle = config.storeName?.trim() || "D.W VIDROS & RECICLAGEM";
  const storeCnpj = config.storeCnpjCpf?.trim() || "67.965.725/0001-95";
  const statusLabel =
    ticket.paymentStatus === "coleta_propria_dw"
      ? "COLETA PRÓPRIA D.W (100% EMPRESA)"
      : ticket.paymentStatus === "pago_na_hora"
      ? "PAGO NA HORA (PORTÃO / CAIXA)"
      : "LANÇADO NO CADERNINHO (A ACERTAR)";

  const rowsHtml = ticket.items
    .map(
      (it) => `
      <tr>
        <td colspan="3" style="padding-top:3px;font-weight:900;font-size:${fontBasePx}px;">
          ${it.name.toUpperCase()} (${it.volumeMl}ml)
        </td>
      </tr>
      <tr style="border-bottom:1px dotted #444;">
        <td style="padding-bottom:4px;font-size:${fontSmallPx}px;">
          ${it.quantity} un × ${it.unitWeightGrams}g = ${it.totalWeightKg.toFixed(2)} kg
        </td>
        <td></td>
        <td style="padding-bottom:4px;text-align:right;font-weight:900;font-family:monospace;">
          R$ ${it.costPaid.toFixed(2).replace(".", ",")}
        </td>
      </tr>
    `
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Comprovante Compra - ${ticket.id}</title>
        <style>
          @page { size: ${pageSize}; margin: 0mm; }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            color: #000 !important;
            font-family: 'Courier New', Courier, monospace;
            font-size: ${fontBasePx}px;
            width: ${printableWidth};
            max-width: ${maxContainerWidth};
            margin-left: auto !important;
            margin-right: auto !important;
          }
        </style>
      </head>
      <body>
        <div style="padding:4px 2px;">
          <div style="text-align:center;margin-bottom:4px;">
            <div style="font-size:${fontHeaderPx}px;font-weight:900;text-transform:uppercase;">${storeTitle}</div>
            <div style="font-size:${fontSmallPx}px;">CNPJ: ${storeCnpj}</div>
            <div style="font-size:${fontSmallPx}px;font-weight:900;margin-top:3px;border:1px solid #000;padding:2px;">
              COMPROVANTE DE COMPRA - RECICLAGEM
            </div>
          </div>
          <div style="border-top:1px dashed #000;border-bottom:1px dashed #000;padding:4px 0;margin:4px 0;font-size:${fontSmallPx}px;">
            <div>DATA: ${ticket.timestamp}</div>
            <div>TICKET: ${ticket.id.slice(-8).toUpperCase()}</div>
            <div style="font-weight:900;">PARCEIRO: ${ticket.collectorName.toUpperCase()}</div>
            <div style="font-weight:900;">STATUS: ${statusLabel}</div>
            <div>COTAÇÃO VICTOR: R$ ${ticket.sellPricePerTonUsed || 150}/ton (R$ ${(((ticket.sellPricePerTonUsed || 150) / 1000)).toFixed(2).replace(".", ",")}/kg)</div>
          </div>
          <table style="width:100%;border-collapse:collapse;margin:4px 0;">
            <thead>
              <tr style="border-bottom:1px dashed #000;font-size:${fontSmallPx}px;font-weight:900;">
                <th style="text-align:left;">MATERIAL / PESO</th>
                <th></th>
                <th style="text-align:right;">VALOR</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          <div style="border-top:1px dashed #000;padding-top:4px;margin-top:4px;font-size:${fontBasePx}px;">
            <div style="display:flex;justify-content:space-between;font-weight:900;">
              <span>QTD TOTAL GARRAFAS:</span>
              <span>${ticket.totalBottles} un</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-weight:900;">
              <span>PESO SOMADO PÁTIO:</span>
              <span>+${ticket.totalWeightKg.toFixed(2)} kg</span>
            </div>
            ${
              ticket.isFounder
                ? `<div style="display:flex;justify-content:space-between;font-size:${fontSmallPx}px;font-weight:900;margin-top:2px;">
                    <span>ECONOMIA D.W (VALOR EQUIV.):</span>
                    <span>R$ ${ticket.items.reduce((s, it) => s + it.costPaid, 0).toFixed(2).replace(".", ",")}</span>
                  </div>`
                : ""
            }
            <div style="display:flex;justify-content:space-between;font-size:${fontHeaderPx}px;font-weight:900;border-top:1px solid #000;border-bottom:1px solid #000;padding:3px 0;margin:4px 0;">
              <span>${ticket.isFounder ? "TOTAL A PAGAR (PRÓPRIA):" : "TOTAL COMPRA:"}</span>
              <span>R$ ${ticket.isFounder ? "0,00" : ticket.totalPaid.toFixed(2).replace(".", ",")}</span>
            </div>
            <div style="font-size:${fontSmallPx}px;text-align:center;">
              PÁTIO ATUAL: ${yardCurrentKg.toFixed(1)} kg / ${yardGoalKg.toLocaleString("pt-BR")} kg
            </div>
          </div>
          <div style="text-align:center;margin-top:8px;border-top:1px dashed #000;padding-top:4px;font-size:${fontSmallPx}px;">
            <div style="font-weight:900;">D.W VIDROS & RECICLAGEM</div>
            <div>Obrigado pela parceria na reciclagem!</div>
          </div>
          <div style="height:${(config.feedLines || 4) * 9}px;"></div>
        </div>
      </body>
    </html>
  `;
}

interface Props {
  sellPricePerTon?: number; // Preço pago pela usina (ex: R$ 150/ton = R$ 0,15/kg)
  onSetSellPricePerTon?: (price: number) => void;
  buyerName?: string;
  onAddItemsToYardStock?: (itemsToAdd: { name: string; quantity: number; weightKg: number; costPaid: number }[]) => void;
  showNotification?: (msg: string, type: "success" | "error" | "info" | "warning") => void;
}

export function GlassBarcodeScannerCart({
  sellPricePerTon = 150,
  onSetSellPricePerTon,
  buyerName = "Caminhão do Victor (Usina / Reciclagem)",
  onAddItemsToYardStock,
  showNotification
}: Props) {
  const [internalSellPricePerTon, setInternalSellPricePerTon] = useState<number>(() => {
    try {
      const saved = Number(localStorage.getItem("pdv_dw_sell_price_per_ton"));
      if (Number.isFinite(saved) && saved >= 50) return saved;
    } catch {}
    return sellPricePerTon || 150;
  });
  const activeSellPricePerTon = onSetSellPricePerTon ? sellPricePerTon : internalSellPricePerTon;
  const activeSetSellPricePerTon = onSetSellPricePerTon || setInternalSellPricePerTon;
  const sellPricePerKg = activeSellPricePerTon > 0 ? activeSellPricePerTon / 1000 : 0.15;

  // Catálogo com Nomes, ML, Códigos e Pesos (Fundido com os 8 itens estratégicos e Estoque Inicial Zerado)
  const [catalog, setCatalog] = useState<CatalogBottleItem[]>(() => {
    try {
      const isCleaned = localStorage.getItem("pdv_dw_glass_zero_clean_v10");
      if (!isCleaned) {
        localStorage.setItem("pdv_dw_glass_zero_clean_v10", "true");
        localStorage.removeItem("pdv_dw_glass_catalog_v10");
        localStorage.removeItem("pdv_dw_glass_catalog_v4");
        localStorage.removeItem("pdv_dw_glass_catalog_v3");
        return DEFAULT_BOTTLE_CATALOG.map((b) => ({ ...b, stockUnits: 0 }));
      }
      const stored = localStorage.getItem("pdv_dw_glass_catalog_v10") || localStorage.getItem("pdv_dw_glass_catalog_v4") || localStorage.getItem("pdv_dw_glass_catalog_v3");
      if (stored) {
        const parsed: CatalogBottleItem[] = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const existingIds = new Set(parsed.map((p) => p.id));
          const missing = DEFAULT_BOTTLE_CATALOG.filter((d) => !existingIds.has(d.id));
          const merged = parsed.map((p) => {
            let item = { ...p };
            if (item.id === "bottle_heineken_330" && (item.unitWeightGrams === 185 || !item.unitWeightGrams)) {
              item.unitWeightGrams = 182;
              item.unitWeightKg = 0.182;
            }
            // Migração: 600ml e Litrão agora usam preço normal por peso (sem revenda para bar)
            if (item.id === "bottle_cerveja_600") {
              item.name = item.name.includes("Retornável") ? "Cerveja 600ml Tradicional (Vidro Âmbar)" : item.name;
              item.buyPricePerUnit = 0.50 / 12;
              item.quickPresets = [2, 6, 12, 24, 50];
            }
            if (item.id === "bottle_litrao_1000") {
              item.name = item.name.includes("Retornável") || item.name.includes("Sucata") ? "Garrafão Litrão 1 Litro (Vidro)" : item.name;
              item.buyPricePerUnit = 0.50 / 8;
              item.quickPresets = [2, 4, 8, 16, 24];
            }
            delete item.returnableSellPrice;
            if (item.warningAlert && (item.warningAlert.includes("bar") || item.warningAlert.includes("casco"))) {
              delete item.warningAlert;
            }
            return {
              ...item,
              additionalBarcodes: Array.isArray(item.additionalBarcodes) ? item.additionalBarcodes : []
            };
          });
          return [...merged, ...missing.map((m) => ({ ...m, additionalBarcodes: m.additionalBarcodes || [] }))];
        }
      }
    } catch {}
    return DEFAULT_BOTTLE_CATALOG.map((b) => ({ ...b, stockUnits: 0, additionalBarcodes: [] }));
  });

  // Meta configurável do pátio de vidros (padrão 3.000 kg = Caminhão do Victor)
  const [yardGoalKg, setYardGoalKg] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("pdv_dw_yard_goal_kg");
      const n = Number(saved);
      return Number.isFinite(n) && n >= 100 ? n : 3000;
    } catch {
      return 3000;
    }
  });
  const [showGoalEditor, setShowGoalEditor] = useState<boolean>(false);
  const [goalInputDraft, setGoalInputDraft] = useState<string>(() => String(yardGoalKg));

  // Estoque separado de Outros Materiais do Ferro Velho (Alumínio, Ferro, Papelão, Cobre)
  const [otherScrapMaterials, setOtherScrapMaterials] = useState<OtherScrapMaterial[]>(() => {
    try {
      const saved = localStorage.getItem("pdv_dw_other_scrap_materials_v1");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_OTHER_SCRAP_MATERIALS;
  });

  // Painel ativo no controle de materiais do Pátio ("vidro" vs "outros")
  const [yardControlFilter, setYardControlFilter] = useState<"vidro" | "outros">("vidro");

  // Modal de Confirmação Rápida após Bipar (Permite digitar ex: 55 direto no teclado antes de jogar no carrinho)
  const [scannedPrompt, setScannedPrompt] = useState<{ bottle: CatalogBottleItem; matchedCode: string } | null>(null);
  const [scannedPromptQtyStr, setScannedPromptQtyStr] = useState<string>("1");

  // Comprovante térmico gerado ao finalizar compra no portão
  const [lastPurchaseReceipt, setLastPurchaseReceipt] = useState<CompletedPurchaseTicket | null>(null);

  // Destino da câmera: leitura de compra ("search") ou preenchimento dos 5 campos de código no modal Editar ("primary" ou índice 0..3)
  const [cameraTargetField, setCameraTargetField] = useState<"search" | "primary" | number>("search");

  // Ouvinte global para zerar todo o pátio e testes quando acionado no painel geral
  useEffect(() => {
    const handleYardZeroEvent = () => {
      setCatalog((prev) => prev.map((b) => ({ ...b, stockUnits: 0 })));
      setCart([]);
      setCollaborators((prev) =>
        prev.map((c) => ({
          ...c,
          totalDeliveries: 0,
          totalBottles: 0,
          totalWeightKg: 0,
          totalEarned: 0,
          totalPaid: 0,
          balancePending: 0
        }))
      );
      setPurchaseHistory([]);
      setPaymentHistory([]);
      setTruckShipments([]);
      setOtherScrapMaterials((prev) => prev.map((m) => ({ ...m, stockKg: 0 })));
      setLastPurchaseReceipt(null);
      setShowCheckoutModal(false);
    };
    window.addEventListener("dw_glass_zero_yard", handleYardZeroEvent);
    return () => window.removeEventListener("dw_glass_zero_yard", handleYardZeroEvent);
  }, []);

  // Carrinho de compras no portão (permite misturar garrafas diferentes!)
  const [cart, setCart] = useState<GlassCartItem[]>(() => {
    try {
      const stored = localStorage.getItem("pdv_dw_cart_items_v3");
      if (stored) {
        const parsed: GlassCartItem[] = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed.map((c) => {
            const cleanItem = { ...c };
            if (cleanItem.warningAlert && (cleanItem.warningAlert.includes("bar") || cleanItem.warningAlert.includes("casco"))) {
              delete cleanItem.warningAlert;
            }
            return cleanItem;
          });
        }
      }
    } catch {}
    return [];
  });

  // Caderninho de Colaboradores da Reciclagem (com Denise e Wellington)
  const [collaborators, setCollaborators] = useState<CollaboratorAccount[]>(() => {
    try {
      const stored = localStorage.getItem("pdv_dw_collaborators_accounts_v3");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_COLLABORATORS;
  });

  // Colaborador atualmente selecionado
  const [selectedCollabId, setSelectedCollabId] = useState<string>(() => {
    return INITIAL_COLLABORATORS[0].id;
  });

  // Histórico de tíquetes de compras
  const [purchaseHistory, setPurchaseHistory] = useState<CompletedPurchaseTicket[]>(() => {
    try {
      const stored = localStorage.getItem("pdv_dw_purchase_tickets_v3");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  // Histórico de pagamentos/acertos
  const [paymentHistory, setPaymentHistory] = useState<CollaboratorPaymentReceipt[]>(() => {
    try {
      const stored = localStorage.getItem("pdv_dw_collaborator_payments_v3");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  // Histórico de Cargas Despachadas para a Empresa de Vidros (Caminhão do Victor)
  const [truckShipments, setTruckShipments] = useState<DispatchedTruckShipment[]>(() => {
    try {
      const stored = localStorage.getItem("pdv_dw_truck_shipments_v3");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  // Aba ativa: "carrinho" | "caderninho" | "estoque" | "cargas"
  const [activeTab, setActiveTab] = useState<"carrinho" | "caderninho" | "estoque" | "cargas">("carrinho");

  // Entrada de código de barras
  const [barcodeInput, setBarcodeInput] = useState<string>("");
  const [showCameraModal, setShowCameraModal] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);

  // Modais
  const [showAddCollabModal, setShowAddCollabModal] = useState<boolean>(false);
  const [newCollabName, setNewCollabName] = useState<string>("");
  const [newCollabPhone, setNewCollabPhone] = useState<string>("");
  const [newCollabNotes, setNewCollabNotes] = useState<string>("");

  const [payingCollab, setPayingCollab] = useState<CollaboratorAccount | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<"bolsa_familia" | "caminhao_victor" | "dinheiro" | "pix">("bolsa_familia");
  const [payNotes, setPayNotes] = useState<string>("Acerto mensal no dia do Bolsa Família");

  const [editingBottle, setEditingBottle] = useState<CatalogBottleItem | null>(null);
  const [editingWeightGramsInput, setEditingWeightGramsInput] = useState<string>("185");
  const [isRegisteringNew, setIsRegisteringNew] = useState<boolean>(false);
  const [calibratingBottle, setCalibratingBottle] = useState<CatalogBottleItem | null>(null);
  const [calibratedGramsInput, setCalibratedGramsInput] = useState<string>("185");

  // Abertura centralizada com valor em texto limpo para permitir digitação no celular
  const openCalibrateBottleModal = (bottle: CatalogBottleItem) => {
    setCalibratingBottle(bottle);
    setCalibratedGramsInput(String(bottle.unitWeightGrams || 185));
  };

  const openEditBottleModal = (bottle: CatalogBottleItem, isNew = false) => {
    const paddedAdditional = [
      bottle.additionalBarcodes?.[0] || "",
      bottle.additionalBarcodes?.[1] || "",
      bottle.additionalBarcodes?.[2] || "",
      bottle.additionalBarcodes?.[3] || ""
    ];
    setEditingBottle({ ...bottle, additionalBarcodes: paddedAdditional });
    setEditingWeightGramsInput(String(bottle.unitWeightGrams || 185));
    setIsRegisteringNew(isNew);
  };

  const [showTruckDispatchModal, setShowTruckDispatchModal] = useState<boolean>(false);
  const [showZeroConfirmModal, setShowZeroConfirmModal] = useState<boolean>(false);
  const [showStrategicGuideModal, setShowStrategicGuideModal] = useState<boolean>(false);
  const [showVictorRules, setShowVictorRules] = useState<boolean>(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState<boolean>(false);

  // Digitação direta no teclado para quantidade de garrafas no pátio / compra (ex: 55 garrafas)
  const [bottleInputQty, setBottleInputQty] = useState<Record<string, string>>({});

  const handleAddDirectQuantity = (bottle: CatalogBottleItem, autoOpenCheckout = false) => {
    const raw = bottleInputQty[bottle.id];
    const qty = parseInt(raw || "0", 10);
    const safeLot = getVictorSafeLotUnits(bottle.category, sellPricePerKg, bottle.unitWeightGrams);
    const finalQty = isNaN(qty) || qty <= 0 ? (safeLot || 1) : qty;
    handleAddBottleToCart(bottle, finalQty);
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    if (showNotification) {
      const totalAddedKg = ((finalQty * bottle.unitWeightGrams) / 1000).toFixed(2);
      showNotification(`+${finalQty} un de ${bottle.name} (${totalAddedKg} kg) no carrinho de compra! 🍾⚖️`, "success");
    }
    setBottleInputQty((prev) => ({ ...prev, [bottle.id]: "" }));
    if (autoOpenCheckout) {
      setShowCheckoutModal(true);
    }
  };

  // Persistência da cotação selecionada e recálculo automático do carrinho quando a cotação do Victor muda
  useEffect(() => {
    try {
      localStorage.setItem("pdv_dw_sell_price_per_ton", String(activeSellPricePerTon));
    } catch {}
    setCart((prev) => {
      if (prev.length === 0) return prev;
      return prev.map((c) => {
        const totalWeightKg = (c.quantity * c.unitWeightGrams) / 1000;
        const totalBuyCost = calculateGlassBuyCost(
          c.category,
          c.quantity,
          c.buyPricePerUnit,
          sellPricePerKg,
          c.unitWeightGrams
        );
        const totalRevenue = totalWeightKg * sellPricePerKg;
        return {
          ...c,
          totalWeightKg,
          totalBuyCost,
          sellPriceUnitOrWeight: (c.unitWeightGrams / 1000) * sellPricePerKg,
          totalRevenue,
          profit: totalRevenue - totalBuyCost
        };
      });
    });
  }, [activeSellPricePerTon, sellPricePerKg]);

  // Persistência automática
  useEffect(() => {
    try {
      localStorage.setItem("pdv_dw_glass_catalog_v10", JSON.stringify(catalog));
    } catch {}
  }, [catalog]);

  useEffect(() => {
    try {
      localStorage.setItem("pdv_dw_cart_items_v3", JSON.stringify(cart));
    } catch {}
  }, [cart]);

  useEffect(() => {
    try {
      localStorage.setItem("pdv_dw_collaborators_accounts_v3", JSON.stringify(collaborators));
    } catch {}
  }, [collaborators]);

  useEffect(() => {
    try {
      localStorage.setItem("pdv_dw_purchase_tickets_v3", JSON.stringify(purchaseHistory));
    } catch {}
  }, [purchaseHistory]);

  useEffect(() => {
    try {
      localStorage.setItem("pdv_dw_collaborator_payments_v3", JSON.stringify(paymentHistory));
    } catch {}
  }, [paymentHistory]);

  useEffect(() => {
    try {
      localStorage.setItem("pdv_dw_truck_shipments_v3", JSON.stringify(truckShipments));
    } catch {}
  }, [truckShipments]);

  // Colaborador atual selecionado
  const activeCollab = useMemo(() => {
    return collaborators.find((c) => c.id === selectedCollabId) || collaborators[0];
  }, [collaborators, selectedCollabId]);

  // Persistência de meta e materiais separados
  useEffect(() => {
    try {
      localStorage.setItem("pdv_dw_yard_goal_kg", String(yardGoalKg));
    } catch {}
  }, [yardGoalKg]);

  useEffect(() => {
    try {
      localStorage.setItem("pdv_dw_other_scrap_materials_v1", JSON.stringify(otherScrapMaterials));
    } catch {}
  }, [otherScrapMaterials]);

  const otherMaterialsTotalKg = useMemo(() => {
    return otherScrapMaterials.reduce((acc, m) => acc + (Number(m.stockKg) || 0), 0);
  }, [otherScrapMaterials]);

  // Totais do Estoque no Pátio (SOMENTE VIDROS DA RECICLAGEM!)
  const yardTotals = useMemo(() => {
    let totalUnits = 0;
    let totalWeightKg = 0;
    catalog.forEach((b) => {
      const units = b.stockUnits || 0;
      totalUnits += units;
      totalWeightKg += (units * b.unitWeightGrams) / 1000;
    });

    const totalWeightTon = totalWeightKg / 1000;
    const grossRevenueTon = totalWeightKg * sellPricePerKg;

    // Meta configurável (padrão 3.000 kg para o caminhão do Victor) e Carga Cheia 5.000 kg
    const minTonTargetKg = Math.max(100, yardGoalKg || 3000);
    const idealTonTargetKg = Math.max(minTonTargetKg, 5000);
    const kgMissingForMin = Math.max(0, minTonTargetKg - totalWeightKg);
    const kgMissingForIdeal = Math.max(0, idealTonTargetKg - totalWeightKg);
    const progressMinPct = Math.min(100, (totalWeightKg / minTonTargetKg) * 100);
    const progressIdealPct = Math.min(100, (totalWeightKg / idealTonTargetKg) * 100);

    return {
      totalUnits,
      totalWeightKg,
      totalWeightTon,
      grossRevenueTon,
      minTonTargetKg,
      idealTonTargetKg,
      kgMissingForMin,
      kgMissingForIdeal,
      progressMinPct,
      progressIdealPct
    };
  }, [catalog, sellPricePerKg, yardGoalKg]);

  // Resumo Financeiro Geral dos Colaboradores da Reciclagem
  const caderninhoTotals = useMemo(() => {
    let totalPendingAll = 0;
    let totalPaidAll = 0;
    let totalEarnedAll = 0;
    let founderSelfSaved = 0; // O quanto Denise e Wellington economizaram reciclando eles mesmos

    collaborators.forEach((c) => {
      if (c.isFounder) {
        founderSelfSaved += c.totalEarned;
      } else {
        totalPendingAll += c.balancePending;
        totalPaidAll += c.totalPaid;
        totalEarnedAll += c.totalEarned;
      }
    });

    return {
      totalPendingAll,
      totalPaidAll,
      totalEarnedAll,
      founderSelfSaved
    };
  }, [collaborators]);

  // Totais do Carrinho Atual
  const cartTotals = useMemo(() => {
    let totalBottles = 0;
    let totalWeightKg = 0;
    let totalBuyCost = 0;
    let totalRevenue = 0;

    cart.forEach((c) => {
      totalBottles += c.quantity;
      totalWeightKg += c.totalWeightKg;
      totalBuyCost += c.totalBuyCost;
      totalRevenue += c.totalRevenue;
    });

    // Se for Denise e Wellington (fundadores), o custo de compra de terceiros é R$ 0,
    // e o valor que seria pago é pura ECONOMIA financeira!
    const isFounder = !!activeCollab?.isFounder;
    const actualBuyCostToThirdParties = isFounder ? 0 : totalBuyCost;
    const founderSavedAmount = isFounder ? totalBuyCost : 0;
    const netProfit = totalRevenue - actualBuyCostToThirdParties;
    const marginPct = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    return {
      totalBottles,
      totalWeightKg,
      totalBuyCost,
      actualBuyCostToThirdParties,
      founderSavedAmount,
      totalRevenue,
      netProfit,
      marginPct,
      isFounder
    };
  }, [cart, activeCollab, sellPricePerKg]);

  // Câmera Scanner
  const stopCameraSafely = () => {
    if (html5QrcodeRef.current) {
      try {
        html5QrcodeRef.current
          .stop()
          .then(() => {
            html5QrcodeRef.current?.clear();
            html5QrcodeRef.current = null;
          })
          .catch(() => {
            html5QrcodeRef.current = null;
          });
      } catch {
        html5QrcodeRef.current = null;
      }
    }
  };

  useEffect(() => {
    let isCancelled = false;

    if (showCameraModal) {
      setCameraError(null);
      const timer = setTimeout(() => {
        if (isCancelled) return;
        const viewport = document.getElementById("mobile-glass-scanner-viewport");
        if (!viewport) return;

        try {
          const scanner = new Html5Qrcode("mobile-glass-scanner-viewport", {
            formatsToSupport: [
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.UPC_E,
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.CODE_39
            ],
            verbose: false
          });

          html5QrcodeRef.current = scanner;

          scanner
            .start(
              { facingMode: "environment" },
              {
                fps: 20,
                qrbox: { width: 280, height: 180 }
              },
              (decodedText) => {
                if (isCancelled) return;
                playScannerBeep(2100, 0.09);
                handleProcessBarcodeRef.current(decodedText.trim());
                setShowCameraModal(false);
              },
              () => {}
            )
            .catch((err) => {
              if (isCancelled) return;
              console.warn("Erro ao iniciar câmera:", err);
              setCameraError("Câmera não disponível. Digite o código de barras no campo de texto.");
            });
        } catch {
          setCameraError("Erro ao inicializar câmera. Digite o código no campo de texto.");
        }
      }, 300);

      return () => {
        isCancelled = true;
        clearTimeout(timer);
        stopCameraSafely();
      };
    } else {
      stopCameraSafely();
    }
  }, [showCameraModal]);

  const handleProcessBarcodeRef = useRef<(code: string) => void>(() => {});

  // Bipagem de Código de Barras (Suporta 1 a 5 códigos por garrafa + preenchimento direto de campo no cadastro)
  const handleProcessBarcode = (code: string) => {
    if (!code) return;
    const clean = code.trim();
    if (!clean) return;

    // Caso a câmera tenha sido aberta para preencher um dos 5 campos dentro do modal Editar/Cadastrar Garrafa:
    if (cameraTargetField !== "search" && editingBottle) {
      if (cameraTargetField === "primary") {
        setEditingBottle((prev) => (prev ? { ...prev, barcode: clean } : null));
        if (showNotification) showNotification(`Código Principal lido: ${clean} ✅`, "success");
      } else if (typeof cameraTargetField === "number") {
        const slotIdx = cameraTargetField;
        setEditingBottle((prev) => {
          if (!prev) return null;
          const nextArr = [
            prev.additionalBarcodes?.[0] || "",
            prev.additionalBarcodes?.[1] || "",
            prev.additionalBarcodes?.[2] || "",
            prev.additionalBarcodes?.[3] || ""
          ];
          nextArr[slotIdx] = clean;
          return { ...prev, additionalBarcodes: nextArr };
        });
        if (showNotification) showNotification(`Código Extra ${slotIdx + 2} lido: ${clean} ✅`, "success");
      }
      setCameraTargetField("search");
      return;
    }

    setBarcodeInput("");
    const normalizedTyped = clean.replace(/^0+/, "");

    const matchesCode = (candidate?: string) => {
      if (!candidate) return false;
      const cTrim = candidate.trim();
      if (!cTrim) return false;
      if (cTrim === clean) return true;
      return normalizedTyped.length >= 3 && cTrim.replace(/^0+/, "") === normalizedTyped;
    };

    const matched = catalog.find(
      (c) =>
        matchesCode(c.barcode) ||
        (Array.isArray(c.additionalBarcodes) && c.additionalBarcodes.some((extra) => matchesCode(extra)))
    );

    if (matched) {
      const safeLot = getVictorSafeLotUnits(matched.category, sellPricePerKg, matched.unitWeightGrams);
      setScannedPrompt({ bottle: matched, matchedCode: clean });
      setScannedPromptQtyStr(String(safeLot || 1));
      if (showNotification) {
        showNotification(`Identificado: ${matched.name}! Digite ou confirme a quantidade. 🏷️🍾`, "success");
      }
    } else {
      openEditBottleModal(
        {
          id: `bottle_${Date.now()}`,
          name: "",
          volumeMl: 330,
          barcode: clean,
          additionalBarcodes: ["", "", "", ""],
          unitWeightGrams: 182,
          unitWeightKg: 0.182,
          category: "longneck",
          buyPricePerUnit: 0.50 / 30,
          emoji: "🍾",
          stockUnits: 0,
          quickPresets: [10, 20, 30, 50, 100]
        },
        true
      );
      if (showNotification) {
        showNotification(`Código ${clean} novo! Pese na balança digital e cadastre (ou adicione em uma garrafa existente)! ⚖️`, "info");
      }
    }
  };
  handleProcessBarcodeRef.current = handleProcessBarcode;

  // Adicionar garrafa ao carrinho (permite misturar tipos diferentes — tudo calculado conforme o peso!)
  const handleAddBottleToCart = (bottle: CatalogBottleItem, qty: number) => {
    if (qty <= 0) return;
    playScannerBeep(1800, 0.05);

    setCart((prev) => {
      const idx = prev.findIndex((c) => c.catalogId === bottle.id);
      if (idx >= 0) {
        const updated = [...prev];
        const existing = updated[idx];
        const newQty = existing.quantity + qty;
        const totalWeightKg = (newQty * bottle.unitWeightGrams) / 1000;
        const totalBuyCost = calculateGlassBuyCost(
          bottle.category,
          newQty,
          bottle.buyPricePerUnit,
          sellPricePerKg,
          bottle.unitWeightGrams
        );
        const totalRevenue = totalWeightKg * sellPricePerKg;
        const profit = totalRevenue - totalBuyCost;

        updated[idx] = {
          ...existing,
          quantity: newQty,
          totalWeightKg,
          totalBuyCost,
          sellPriceUnitOrWeight: (bottle.unitWeightGrams / 1000) * sellPricePerKg,
          totalRevenue,
          profit
        };
        return updated;
      } else {
        const totalWeightKg = (qty * bottle.unitWeightGrams) / 1000;
        const totalBuyCost = calculateGlassBuyCost(
          bottle.category,
          qty,
          bottle.buyPricePerUnit,
          sellPricePerKg,
          bottle.unitWeightGrams
        );
        const totalRevenue = totalWeightKg * sellPricePerKg;
        const profit = totalRevenue - totalBuyCost;

        const newItem: GlassCartItem = {
          id: `cart_${Date.now()}_${Math.random()}`,
          catalogId: bottle.id,
          name: bottle.name,
          volumeMl: bottle.volumeMl,
          barcode: bottle.barcode,
          category: bottle.category,
          emoji: bottle.emoji,
          quantity: qty,
          unitWeightGrams: bottle.unitWeightGrams,
          unitWeightKg: bottle.unitWeightGrams / 1000,
          totalWeightKg,
          buyPricePerUnit: bottle.buyPricePerUnit,
          totalBuyCost,
          sellPriceUnitOrWeight: (bottle.unitWeightGrams / 1000) * sellPricePerKg,
          totalRevenue,
          profit
        };
        return [newItem, ...prev];
      }
    });
  };

  // Alterar quantidade no carrinho
  const handleUpdateCartQuantity = (cartId: string, newQty: number) => {
    if (newQty <= 0) {
      setCart((prev) => prev.filter((c) => c.id !== cartId));
      return;
    }

    setCart((prev) =>
      prev.map((c) => {
        if (c.id === cartId) {
          const totalWeightKg = (newQty * c.unitWeightGrams) / 1000;
          const totalBuyCost = calculateGlassBuyCost(
            c.category,
            newQty,
            c.buyPricePerUnit,
            sellPricePerKg,
            c.unitWeightGrams
          );
          const totalRevenue = totalWeightKg * sellPricePerKg;
          const profit = totalRevenue - totalBuyCost;

          return {
            ...c,
            quantity: newQty,
            totalWeightKg,
            totalBuyCost,
            sellPriceUnitOrWeight: (c.unitWeightGrams / 1000) * sellPricePerKg,
            totalRevenue,
            profit
          };
        }
        return c;
      })
    );
  };

  // Remover item do carrinho
  const handleRemoveCartItem = (cartId: string) => {
    setCart((prev) => prev.filter((c) => c.id !== cartId));
  };

  // Calibrar peso de uma garrafa na balança de cozinha (com casas decimais / precisão de balança digital)
  const handleSaveCalibratedWeight = () => {
    if (!calibratingBottle) return;
    const cleanStr = String(calibratedGramsInput).replace(",", ".");
    const grams = Math.max(0.01, parseFloat(cleanStr) || calibratingBottle.unitWeightGrams || 1);
    const kg = grams / 1000;

    let nextCatalog: CatalogBottleItem[] = [];
    // Atualiza no catálogo
    setCatalog((prev) => {
      nextCatalog = prev.map((b) =>
        b.id === calibratingBottle.id
          ? { ...b, unitWeightGrams: grams, unitWeightKg: kg }
          : b
      );
      return nextCatalog;
    });

    // Atualiza também itens que estejam no carrinho recalculando valor pelo novo peso
    setCart((prev) =>
      prev.map((c) => {
        if (c.catalogId === calibratingBottle.id) {
          const totalWeightKg = (c.quantity * grams) / 1000;
          const totalBuyCost = calculateGlassBuyCost(
            c.category,
            c.quantity,
            c.buyPricePerUnit,
            sellPricePerKg,
            grams
          );
          const totalRevenue = totalWeightKg * sellPricePerKg;
          return {
            ...c,
            unitWeightGrams: grams,
            unitWeightKg: kg,
            totalWeightKg,
            totalBuyCost,
            sellPriceUnitOrWeight: kg * sellPricePerKg,
            totalRevenue,
            profit: totalRevenue - totalBuyCost
          };
        }
        return c;
      })
    );

    // Sincroniza com a calculadora geral do pátio
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("dw_glass_catalog_updated", { detail: nextCatalog }));
    }

    setCalibratingBottle(null);
    if (showNotification) {
      showNotification(`Peso de ${calibratingBottle.name} calibrado para ${grams}g (${kg.toFixed(3)}kg)! ⚖️✅`, "success");
    }
  };

  // Alterar diretamente o peso em gramas na balança (com suporte a decimais e atualização imediata)
  const handleUpdateBottleWeightDirect = (bottleId: string, gramsInput: number | string) => {
    const cleanStr = String(gramsInput).replace(",", ".");
    const grams = Math.max(0.01, parseFloat(cleanStr) || 0);
    const kg = grams / 1000;
    let nextCatalog: CatalogBottleItem[] = [];
    setCatalog((prev) => {
      nextCatalog = prev.map((b) => (b.id === bottleId ? { ...b, unitWeightGrams: grams, unitWeightKg: kg } : b));
      return nextCatalog;
    });

    // Atualizar itens no carrinho por peso real
    setCart((prev) =>
      prev.map((c) => {
        if (c.catalogId === bottleId) {
          const totalWeightKg = (c.quantity * grams) / 1000;
          const totalBuyCost = calculateGlassBuyCost(
            c.category,
            c.quantity,
            c.buyPricePerUnit,
            sellPricePerKg,
            grams
          );
          const totalRevenue = totalWeightKg * sellPricePerKg;
          return {
            ...c,
            unitWeightGrams: grams,
            unitWeightKg: kg,
            totalWeightKg,
            totalBuyCost,
            sellPriceUnitOrWeight: kg * sellPricePerKg,
            totalRevenue,
            profit: totalRevenue - totalBuyCost
          };
        }
        return c;
      })
    );

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("dw_glass_catalog_updated", { detail: nextCatalog }));
    }
  };

  // Salvar garrafa ou pote criado / editado (Nome, ML, Peso em Gramas, Código)
  const handleSaveBottle = () => {
    if (!editingBottle) return;
    const name = editingBottle.name.trim();
    if (!name) {
      if (showNotification) showNotification("Digite o nome da garrafa ou pote.", "warning");
      return;
    }
    const cleanGramsStr = String(editingWeightGramsInput).replace(",", ".");
    const grams = Math.max(0.01, parseFloat(cleanGramsStr) || Number(editingBottle.unitWeightGrams) || 100);
    const kg = grams / 1000;
    const volume = Math.max(10, Number(editingBottle.volumeMl) || 300);

    const cleanAdditional = (editingBottle.additionalBarcodes || [])
      .map((c) => (c || "").trim())
      .filter((c) => c.length > 0 && c !== editingBottle.barcode.trim())
      .slice(0, 4);

    const saved: CatalogBottleItem = {
      ...editingBottle,
      name,
      barcode: (editingBottle.barcode || "").trim(),
      additionalBarcodes: cleanAdditional,
      volumeMl: volume,
      unitWeightGrams: grams,
      unitWeightKg: kg,
      stockUnits: Math.max(0, Number(editingBottle.stockUnits) || 0)
    };

    let nextCatalog: CatalogBottleItem[] = [];
    setCatalog((prev) => {
      const exists = prev.some((b) => b.id === saved.id);
      nextCatalog = exists ? prev.map((b) => (b.id === saved.id ? saved : b)) : [saved, ...prev];
      return nextCatalog;
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("dw_glass_catalog_updated", { detail: nextCatalog }));
    }

    setEditingBottle(null);
    setIsRegisteringNew(false);

    if (showNotification) {
      const totalCodes = (saved.barcode ? 1 : 0) + cleanAdditional.length;
      showNotification(
        `Garrafa/Pote "${saved.name}" salvo! (${grams}g • ${totalCodes} cód. de barra) ⚖️✅`,
        "success"
      );
    }
  };

  // Excluir garrafa ou pote do catálogo
  const handleDeleteBottle = (bottleId: string, bottleName: string) => {
    if (catalog.length <= 1) {
      if (showNotification) showNotification("Mantenha ao menos 1 item cadastrado no catálogo.", "warning");
      return;
    }
    setCatalog((prev) => prev.filter((b) => b.id !== bottleId));
    setEditingBottle(null);
    setIsRegisteringNew(false);
    if (showNotification) {
      showNotification(`"${bottleName}" removido do catálogo. 🗑️`, "info");
    }
  };

  // Duplicar garrafa similar (para cadastrar garrafas parecidas de forma rápida)
  const handleDuplicateSimilar = (baseBottle: CatalogBottleItem) => {
    openEditBottleModal(
      {
        ...baseBottle,
        id: `bottle_${Date.now()}`,
        name: `${baseBottle.name} (Similar)`,
        barcode: "",
        additionalBarcodes: ["", "", "", ""],
        stockUnits: 0
      },
      true
    );
    if (showNotification) {
      showNotification(`Copiados peso (${baseBottle.unitWeightGrams}g) e ${baseBottle.volumeMl}ml. Digite o novo nome e confirme o peso na balança! 📑`, "info");
    }
  };

  // Alterar diretamente a quantidade real que tem no pátio hoje
  const handleUpdateYardStockDirect = (bottleId: string, newQty: number) => {
    const qty = Math.max(0, Math.round(newQty));
    setCatalog((prev) =>
      prev.map((b) => (b.id === bottleId ? { ...b, stockUnits: qty } : b))
    );
  };

  // Finalizar compra / entrega do carrinho
  const handleFinalizeTicket = (settlementMode: "pendente_caderninho" | "pago_na_hora") => {
    if (cart.length === 0) {
      if (showNotification) showNotification("O carrinho está vazio! Adicione garrafas.", "warning");
      return;
    }

    const isFounder = !!activeCollab.isFounder;
    const paymentStatus = isFounder
      ? "coleta_propria_dw"
      : settlementMode === "pago_na_hora"
      ? "pago_na_hora"
      : "pendente_caderninho";

    // 1. Atualizar estoque no pátio geral
    setCatalog((prev) =>
      prev.map((b) => {
        const inCart = cart.find((c) => c.catalogId === b.id);
        if (inCart) {
          return { ...b, stockUnits: (b.stockUnits || 0) + inCart.quantity };
        }
        return b;
      })
    );

    if (onAddItemsToYardStock) {
      const yardItems = cart.map((c) => ({
        name: `${c.name} (${c.volumeMl}ml)`,
        quantity: c.quantity,
        weightKg: c.totalWeightKg,
        costPaid: isFounder ? 0 : c.totalBuyCost
      }));
      onAddItemsToYardStock(yardItems);
    }

    // 2. Atualizar Caderninho do Colaborador
    setCollaborators((prev) =>
      prev.map((collab) => {
        if (collab.id === activeCollab.id) {
          const newDeliveries = collab.totalDeliveries + 1;
          const newBottles = collab.totalBottles + cartTotals.totalBottles;
          const newWeight = collab.totalWeightKg + cartTotals.totalWeightKg;
          const newEarned = collab.totalEarned + cartTotals.totalBuyCost;

          if (collab.isFounder) {
            // Denise e Wellington: não há dívida a pagar, é pura economia e coleta própria!
            return {
              ...collab,
              totalDeliveries: newDeliveries,
              totalBottles: newBottles,
              totalWeightKg: newWeight,
              totalEarned: newEarned,
              totalPaid: newEarned,
              balancePending: 0
            };
          } else {
            // Colaborador Parceiro: se pagou na hora, soma no pago; se pendente, soma no saldo a pagar!
            const addedPaid = settlementMode === "pago_na_hora" ? cartTotals.totalBuyCost : 0;
            const newPaid = collab.totalPaid + addedPaid;
            const newPending = newEarned - newPaid;

            return {
              ...collab,
              totalDeliveries: newDeliveries,
              totalBottles: newBottles,
              totalWeightKg: newWeight,
              totalEarned: newEarned,
              totalPaid: newPaid,
              balancePending: Math.max(0, newPending)
            };
          }
        }
        return collab;
      })
    );

    // 3. Salvar tíquete no histórico
    const ticket: CompletedPurchaseTicket = {
      id: `ticket_${Date.now()}`,
      timestamp: new Date().toLocaleString("pt-BR"),
      collectorName: activeCollab.name,
      isFounder,
      items: cart.map((c) => ({
        name: c.name,
        volumeMl: c.volumeMl,
        barcode: c.barcode,
        quantity: c.quantity,
        unitWeightGrams: c.unitWeightGrams,
        totalWeightKg: c.totalWeightKg,
        costPaid: c.totalBuyCost
      })),
      totalBottles: cartTotals.totalBottles,
      totalWeightKg: cartTotals.totalWeightKg,
      totalPaid: isFounder ? 0 : cartTotals.totalBuyCost,
      expectedPlantRevenue: cartTotals.totalRevenue,
      netProfit: cartTotals.netProfit,
      paymentStatus,
      sellPricePerTonUsed: activeSellPricePerTon
    };

    setPurchaseHistory((prev) => [ticket, ...prev.slice(0, 49)]);
    setLastPurchaseReceipt(ticket);
    setShowCheckoutModal(false);

    // 4. Limpar carrinho
    setCart([]);
    playScannerBeep(2400, 0.15);

    if (showNotification) {
      if (isFounder) {
        showNotification(
          `Coleta D.W Registrada! +${cartTotals.totalBottles} garrafas (+${cartTotals.totalWeightKg.toFixed(1)}kg) somadas para a carga do Victor! 👑🚚`,
          "success"
        );
      } else if (settlementMode === "pago_na_hora") {
        showNotification(
          `Compra paga na hora: R$ ${cartTotals.totalBuyCost.toFixed(2)} para ${activeCollab.name}! 💵✅`,
          "success"
        );
      } else {
        showNotification(
          `Lançado no Caderninho: R$ ${cartTotals.totalBuyCost.toFixed(2)} a pagar para ${activeCollab.name}! 📖✍️`,
          "info"
        );
      }
    }
  };

  // Registrar pagamento / acerto de colaborador
  const handleExecuteCollaboratorPayment = () => {
    if (!payingCollab) return;
    const amount = Number(payAmount);
    if (amount <= 0) {
      if (showNotification) showNotification("Digite um valor válido de pagamento.", "warning");
      return;
    }

    const prevPending = payingCollab.balancePending;
    const newPaid = payingCollab.totalPaid + amount;
    const remaining = Math.max(0, prevPending - amount);

    // Atualiza saldo no caderninho
    setCollaborators((prev) =>
      prev.map((c) =>
        c.id === payingCollab.id
          ? {
              ...c,
              totalPaid: newPaid,
              balancePending: remaining
            }
          : c
      )
    );

    const methodLabels: Record<string, string> = {
      bolsa_familia: "📅 Bolsa Família (Dia Fixo)",
      caminhao_victor: "🚚 Acerto Caminhão do Victor (Pesagem)",
      dinheiro: "💵 Dinheiro em Mãos",
      pix: "💳 Pix"
    };

    // Salva comprovante
    const receipt: CollaboratorPaymentReceipt = {
      id: `pay_${Date.now()}`,
      timestamp: new Date().toLocaleString("pt-BR"),
      collaboratorId: payingCollab.id,
      collaboratorName: payingCollab.name,
      amountPaid: amount,
      paymentMethod: payMethod,
      methodLabel: methodLabels[payMethod] || payMethod,
      notes: payNotes,
      previousBalance: prevPending,
      remainingBalance: remaining
    };

    setPaymentHistory((prev) => [receipt, ...prev.slice(0, 49)]);
    setPayingCollab(null);

    playScannerBeep(2200, 0.12);
    if (showNotification) {
      showNotification(
        `Pagamento de R$ ${amount.toFixed(2)} registrado para ${payingCollab.name}! 🧾🤝`,
        "success"
      );
    }
  };

  // Despachar Carga para o Caminhão do Victor (Zera estoque para começar a próxima carga!)
  const handleDispatchTruckCargo = () => {
    if (yardTotals.totalUnits === 0) {
      if (showNotification) showNotification("O pátio está vazio! Não há garrafas para despachar.", "warning");
      return;
    }

    const summaryText = catalog
      .filter((b) => b.stockUnits > 0)
      .map((b) => `${b.stockUnits} un ${b.name}`)
      .join(", ");

    const shipment: DispatchedTruckShipment = {
      id: `shipment_${Date.now()}`,
      timestamp: new Date().toLocaleString("pt-BR"),
      buyerName: buyerName || "Caminhão do Victor (Empresa de Vidros)",
      totalBottles: yardTotals.totalUnits,
      totalWeightKg: yardTotals.totalWeightKg,
      totalWeightTon: yardTotals.totalWeightTon,
      grossRevenueReceived: yardTotals.grossRevenueTon,
      summaryText
    };

    setTruckShipments((prev) => [shipment, ...prev]);

    // Zera o estoque do pátio para recomeçar o ciclo de toneladas
    setCatalog((prev) => prev.map((b) => ({ ...b, stockUnits: 0 })));
    try {
      window.dispatchEvent(new CustomEvent("dw_glass_zero_yard_from_child"));
    } catch {}

    setShowTruckDispatchModal(false);
    playScannerBeep(2600, 0.2);

    if (showNotification) {
      showNotification(
        `🚚 Carga Despachada com Sucesso! ${shipment.totalWeightTon.toFixed(2)} Toneladas (R$ ${shipment.grossRevenueReceived.toFixed(2)}). Estoque zerado para o próximo ciclo! 🎉`,
        "success"
      );
    }
  };

  // Zerar Todos os Testes e Começar do Zero com a Realidade da D.W Vidros
  const handleResetAllToZeroReal = () => {
    // 1. Zera o estoque de vidros no pátio (mantendo garrafas e códigos cadastrados)
    const zeroedCatalog = catalog.map((b) => ({ ...b, stockUnits: 0 }));
    setCatalog(zeroedCatalog);

    // 2. Zera o carrinho, modais e digitações temporárias
    setCart([]);
    setBottleInputQty({});
    setLastPurchaseReceipt(null);
    setShowCheckoutModal(false);

    // 3. Zera todos os saldos, entregas e contagens de teste do Caderninho (mantendo os nomes dos colaboradores)
    const zeroedCollaborators = collaborators.map((c) => ({
      ...c,
      totalDeliveries: 0,
      totalBottles: 0,
      totalWeightKg: 0,
      totalEarned: 0,
      totalPaid: 0,
      balancePending: 0
    }));
    setCollaborators(zeroedCollaborators);

    // 4. Zera históricos de compras de teste, acertos de teste, despachos e outros materiais
    setPurchaseHistory([]);
    setPaymentHistory([]);
    setTruckShipments([]);
    const zeroedOtherScrap = otherScrapMaterials.map((m) => ({ ...m, stockKg: 0 }));
    setOtherScrapMaterials(zeroedOtherScrap);

    setShowZeroConfirmModal(false);
    try {
      localStorage.setItem("pdv_dw_glass_catalog_v10", JSON.stringify(zeroedCatalog));
      localStorage.setItem("pdv_dw_collaborators_accounts_v3", JSON.stringify(zeroedCollaborators));
      localStorage.setItem("pdv_dw_other_scrap_materials_v1", JSON.stringify(zeroedOtherScrap));
      localStorage.removeItem("pdv_glass_items_inventory_v1");
      localStorage.removeItem("pdv_dw_cart_items_v3");
      localStorage.removeItem("pdv_dw_purchase_tickets_v3");
      localStorage.removeItem("pdv_dw_collaborator_payments_v3");
      localStorage.removeItem("pdv_dw_truck_shipments_v3");
      window.dispatchEvent(new CustomEvent("dw_glass_zero_yard_from_child"));
      window.dispatchEvent(new CustomEvent("dw_glass_zero_yard"));
      window.dispatchEvent(new CustomEvent("dw_glass_catalog_updated", { detail: zeroedCatalog }));
    } catch {}

    if (showNotification) {
      showNotification(
        "🧹 Tudo 100% zerado! Pátio (0 kg), Caderninho (R$ 0,00), Históricos e Outros Materiais limpos. Seus cadastros de garrafas e códigos foram mantidos!",
        "success"
      );
    }
  };

  // Cadastrar Novo Colaborador
  const handleSaveNewCollaborator = () => {
    const cleanName = newCollabName.trim();
    if (!cleanName) {
      if (showNotification) showNotification("Digite o nome do colaborador da reciclagem.", "warning");
      return;
    }

    const newCollab: CollaboratorAccount = {
      id: `collab_${Date.now()}`,
      name: cleanName,
      phone: newCollabPhone.trim(),
      notes: newCollabNotes.trim(),
      createdAt: new Date().toLocaleDateString("pt-BR"),
      isFounder: false,
      totalDeliveries: 0,
      totalBottles: 0,
      totalWeightKg: 0,
      totalEarned: 0,
      totalPaid: 0,
      balancePending: 0
    };

    setCollaborators((prev) => [...prev, newCollab]);
    setSelectedCollabId(newCollab.id);
    setNewCollabName("");
    setNewCollabPhone("");
    setNewCollabNotes("");
    setShowAddCollabModal(false);

    if (showNotification) {
      showNotification(`Colaborador "${cleanName}" cadastrado no Caderninho! 👤✍️`, "success");
    }
  };

  // Compartilhar Comprovante no WhatsApp
  const handleShareReceiptWhatsApp = (receipt: CollaboratorPaymentReceipt) => {
    let msg = `🧾 *D.W VIDROS & RECICLAGEM*\n`;
    msg += `_CNPJ: 67.965.725/0001-95 • Denise Jesus & Wellington Oliveira_\n`;
    msg += `_Plano Infinito Vitalício ♾️ • Licença Ativa_\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `🤝 *RECIBO DE PAGAMENTO / ACERTO*\n`;
    msg += `👤 *Colaborador:* ${receipt.collaboratorName}\n`;
    msg += `📅 *Data/Hora:* ${receipt.timestamp}\n`;
    msg += `💰 *VALOR PAGO:* R$ ${receipt.amountPaid.toFixed(2)}\n`;
    msg += `💳 *Forma de Pagamento:* ${receipt.methodLabel}\n`;
    if (receipt.notes) msg += `📝 *Obs:* ${receipt.notes}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `Saldo Restante no Caderninho: R$ ${receipt.remainingBalance.toFixed(2)}\n\n`;
    msg += `_Obrigado pela parceria na reciclagem de vidros! D.W Vidros & Reciclagem 🌱_`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  // Imprimir Notinha / Cupom Térmico de Compra no Portão (58mm / 80mm / A4)
  const handlePrintGlassTicket = (ticket: CompletedPurchaseTicket) => {
    const config = loadPrinterConfig();
    const projectedKg =
      lastPurchaseReceipt?.id === ticket.id
        ? yardTotals.totalWeightKg
        : yardTotals.totalWeightKg;
    const html = buildGlassPurchaseThermalHtml(
      ticket,
      config,
      projectedKg,
      yardTotals.minTonTargetKg
    );
    executeThermalPrint(
      html,
      () => {
        if (showNotification) {
          showNotification("Notinha de compra enviada para impressão! 🖨️🧾", "success");
        }
      },
      () => {
        if (showNotification) {
          showNotification("Não foi possível abrir a janela de impressão. Verifique permissões.", "warning");
        }
      }
    );
  };

  // Enviar Notinha de Compra no WhatsApp
  const handleShareGlassTicketWhatsApp = (ticket: CompletedPurchaseTicket) => {
    const statusLabel =
      ticket.paymentStatus === "coleta_propria_dw"
        ? "👑 Coleta Própria D.W (100% Empresa)"
        : ticket.paymentStatus === "pago_na_hora"
        ? "💵 Pago na Hora no Portão"
        : "📓 Lançado no Caderninho do Colaborador";

    let msg = `🧾 *D.W VIDROS & RECICLAGEM*\n`;
    msg += `_CNPJ: 67.965.725/0001-95 • Compra no Portão_\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `👤 *Parceiro:* ${ticket.collectorName}\n`;
    msg += `📅 *Data:* ${ticket.timestamp}\n`;
    msg += `📌 *Status:* ${statusLabel}\n`;
    msg += `📊 *Cotação Victor:* R$ ${ticket.sellPricePerTonUsed || activeSellPricePerTon}/t (R$ ${(((ticket.sellPricePerTonUsed || activeSellPricePerTon) / 1000)).toFixed(2)}/kg)\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    ticket.items.forEach((it) => {
      msg += `• *${it.quantity}×* ${it.name} (${it.totalWeightKg.toFixed(2)} kg) — R$ ${it.costPaid.toFixed(2)}\n`;
    });
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `⚖️ *Peso Somado ao Pátio:* +${ticket.totalWeightKg.toFixed(2)} kg (${ticket.totalBottles} un)\n`;
    if (ticket.isFounder) {
      const equiv = ticket.items.reduce((s, it) => s + it.costPaid, 0);
      msg += `👑 *Economia Própria D.W:* R$ ${equiv.toFixed(2)}\n`;
    }
    msg += `💰 *${ticket.isFounder ? "TOTAL A PAGAR (PRÓPRIA)" : "TOTAL COMPRA"}:* R$ ${ticket.isFounder ? "0,00" : ticket.totalPaid.toFixed(2)}\n`;
    msg += `🚛 *Pátio Atual:* ${yardTotals.totalWeightKg.toFixed(1)} kg / ${yardTotals.minTonTargetKg.toLocaleString("pt-BR")} kg\n`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    const opened = window.open(url, "_blank");
    if (!opened && navigator.clipboard) {
      navigator.clipboard.writeText(msg).catch(() => {});
      if (showNotification) {
        showNotification("Comprovante copiado para colar no WhatsApp! 📋💬", "info");
      }
    }
  };

  return (
    <div className={`space-y-5 text-left font-sans ${cart.length > 0 ? "pb-28" : ""}`}>
      {/* CABEÇALHO OFICIAL: D.W VIDROS & RECICLAGEM */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 border-2 border-emerald-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border border-emerald-500/40 shadow-sm">
                <Crown className="w-4 h-4 text-amber-400" />
                D.W VIDROS & RECICLAGEM
              </span>
              <span className="text-[11px] bg-amber-500/20 text-amber-300 font-mono font-bold px-2.5 py-1 rounded-lg border border-amber-500/40 shadow-sm">
                CNPJ: 67.965.725/0001-95
              </span>
              <span className="text-[11px] bg-purple-500/20 text-purple-200 font-bold px-2.5 py-1 rounded-lg border border-purple-500/30 flex items-center gap-1">
                <span>♾️</span>
                <span>Plano Infinito Vitalício</span>
              </span>
              <span className="text-[11px] bg-slate-800 text-slate-200 font-bold px-2.5 py-1 rounded-lg border border-white/10">
                Denise Jesus & Wellington Oliveira
              </span>
              <span className="text-[11px] bg-amber-500/20 text-amber-300 font-bold px-2.5 py-1 rounded-lg border border-amber-500/30">
                Cotação: R$ {activeSellPricePerTon.toFixed(2)}/t (R$ {sellPricePerKg.toFixed(2)}/kg)
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <Scale className="w-6 h-6 text-emerald-400" />
              Gestão Real do Pátio, Balança & Caderninho de Colaboradores
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              Pesagem exata em gramas por unidade, cálculo rigoroso de toneladas para o <strong>Caminhão do Victor</strong>, controle de compras mistas e livro-caixa para acertar cada colaborador com o <strong>Bolsa Família</strong> ou na pesagem da carga!
            </p>
          </div>

          {/* BOTÕES DE GESTÃO DO PÁTIO */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowStrategicGuideModal(true)}
              className="min-h-[48px] px-3.5 py-2.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 hover:text-white font-black text-xs uppercase rounded-xl border border-amber-500/40 transition-all flex items-center gap-1.5 cursor-pointer touch-manipulation shadow-md"
              title="Ver análise completa de margens dos 8 itens e veredito do Victor"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Análise dos 8 Itens & Veredito 📋</span>
            </button>

            <button
              type="button"
              onClick={() => setShowTruckDispatchModal(true)}
              className="min-h-[48px] px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/30 touch-manipulation"
            >
              <Truck className="w-4 h-4" />
              <span>Despachar Carga ao Victor 🚚</span>
            </button>

            <button
              type="button"
              onClick={() => setShowZeroConfirmModal(true)}
              className="min-h-[48px] px-3.5 py-2.5 bg-slate-950 hover:bg-slate-800 text-rose-300 hover:text-white font-bold text-xs uppercase rounded-xl border border-rose-500/30 hover:border-rose-400 transition-all flex items-center gap-1.5 cursor-pointer touch-manipulation"
              title="Zerar dados de teste e começar contagem real do zero"
            >
              <Eraser className="w-4 h-4 text-rose-400" />
              <span>Zerar Testes 🧹</span>
            </button>
          </div>
        </div>

        {/* 🚛 PAINEL DE CONTROLE DO PÁTIO DE RECICLAGEM (META CONFIGURÁVEL & ESTOQUE SEPARADO) */}
        <div className="mt-5 pt-4 border-t border-white/10 space-y-3">
          {/* Card Central com Destaque Máximo */}
          <div className="p-4 bg-gradient-to-r from-slate-950 via-emerald-950/50 to-slate-950 rounded-2xl border-2 border-emerald-500/50 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  ESTOQUE ACUMULADO NO PÁTIO (KG) • APENAS VIDROS
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setGoalInputDraft(String(yardGoalKg));
                    setShowGoalEditor((v) => !v);
                  }}
                  className="min-h-[36px] px-3 py-1 rounded-full bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-black text-[10.5px] flex items-center gap-1.5 cursor-pointer touch-manipulation select-none active:scale-95 transition-all"
                  title="Alterar a meta em quilos para a coleta do caminhão"
                >
                  <Sliders className="w-3.5 h-3.5 text-amber-400" />
                  <span>Meta: {yardTotals.minTonTargetKg.toLocaleString("pt-BR")} kg (Editar)</span>
                </button>
              </div>

              {showGoalEditor && (
                <div className="p-3 bg-slate-900/95 border border-amber-500/40 rounded-2xl flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-[10.5px] font-black uppercase text-amber-300">Nova Meta (kg):</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={goalInputDraft}
                    onChange={(e) => setGoalInputDraft(e.target.value.replace(/\D/g, ""))}
                    className="w-24 min-h-[44px] bg-slate-950 border border-amber-400/60 rounded-xl px-3 text-center text-white font-mono font-black text-sm outline-none"
                    placeholder="3000"
                  />
                  {[3000, 5000, 10000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setYardGoalKg(preset);
                        setGoalInputDraft(String(preset));
                        setShowGoalEditor(false);
                        if (showNotification) showNotification(`Meta do Pátio definida em ${preset.toLocaleString("pt-BR")} kg! 🎯`, "success");
                      }}
                      className="min-h-[44px] px-3 bg-slate-950 hover:bg-amber-500 hover:text-slate-950 text-amber-200 border border-white/10 rounded-xl font-mono font-black text-xs cursor-pointer touch-manipulation select-none active:scale-95"
                    >
                      {(preset / 1000).toFixed(0)}t ({preset.toLocaleString("pt-BR")} kg)
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const val = Math.max(100, parseInt(goalInputDraft || "3000", 10) || 3000);
                      setYardGoalKg(val);
                      setShowGoalEditor(false);
                      if (showNotification) showNotification(`Meta do Pátio atualizada para ${val.toLocaleString("pt-BR")} kg! 🎯`, "success");
                    }}
                    className="min-h-[44px] px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black uppercase text-xs rounded-xl cursor-pointer touch-manipulation select-none active:scale-95"
                  >
                    Salvar Meta ✅
                  </button>
                </div>
              )}

              <h3 className="text-2xl sm:text-3xl font-black font-mono text-white flex items-center gap-2 flex-wrap">
                <span>
                  [ {yardTotals.totalWeightKg.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 })} kg / {yardTotals.minTonTargetKg.toLocaleString("pt-BR")} kg ]
                </span>
                <span className={`text-base font-bold ${yardTotals.totalWeightKg >= yardTotals.minTonTargetKg ? "text-emerald-400" : "text-amber-400"}`}>
                  ({yardTotals.progressMinPct.toFixed(1)}%)
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                {yardTotals.kgMissingForMin > 0 ? (
                  <span>
                    Faltam <strong className="text-amber-300 font-mono text-sm">{yardTotals.kgMissingForMin.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg</strong> para bater a meta configurada de {yardTotals.minTonTargetKg.toLocaleString("pt-BR")} kg no caminhão do Victor!
                  </span>
                ) : (
                  <span className="text-emerald-300 font-black">
                    🎉 Meta de {yardTotals.minTonTargetKg.toLocaleString("pt-BR")} kg Atingida! O caminhão já pode carregar no seu pátio!
                  </span>
                )}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs min-w-[270px]">
              <div className="p-2.5 bg-slate-900/90 rounded-xl border border-emerald-500/25 space-y-0.5">
                <span className="text-[9px] uppercase font-bold text-emerald-400 block">Vidros no Pátio:</span>
                <strong className="text-base sm:text-lg font-mono text-white font-black">
                  {yardTotals.totalUnits.toLocaleString("pt-BR")} <span className="text-[10px] text-slate-400 font-normal">un</span>
                </strong>
                <span className="text-[9px] text-emerald-400 block font-bold">= {yardTotals.totalWeightTon.toFixed(3)} Ton</span>
              </div>
              <div className="p-2.5 bg-slate-900/90 rounded-xl border border-amber-500/25 space-y-0.5">
                <span className="text-[9px] uppercase font-bold text-amber-400 block">Faturamento Bruto:</span>
                <strong className="text-base sm:text-lg font-mono text-amber-400 font-black">
                  R$ {yardTotals.grossRevenueTon.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </strong>
                <span className="text-[9px] text-slate-400 block">A R$ {activeSellPricePerTon}/t</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setYardControlFilter("outros");
                  setActiveTab("estoque");
                }}
                className="p-2.5 bg-slate-900/90 hover:bg-slate-800 rounded-xl border border-cyan-500/30 space-y-0.5 text-left cursor-pointer touch-manipulation select-none active:scale-95 transition-all"
                title="Gerenciar Alumínio, Ferro e Papelão separadamente do vidro"
              >
                <span className="text-[9px] uppercase font-bold text-cyan-300 block">Outros Materiais:</span>
                <strong className="text-base sm:text-lg font-mono text-cyan-200 font-black">
                  {otherMaterialsTotalKg.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} <span className="text-[10px] font-normal">kg</span>
                </strong>
                <span className="text-[9px] text-cyan-400 block font-bold">Separado 🔩 ➔</span>
              </button>
            </div>
          </div>

          {/* Barra Visual de Progresso Rumo à Meta do Caminhão */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10.5px] font-mono font-bold text-slate-400">
              <span>0 kg</span>
              <span className={yardTotals.totalWeightKg >= yardTotals.minTonTargetKg / 2 ? "text-emerald-300 font-bold" : ""}>
                {(yardTotals.minTonTargetKg / 2).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kg (50%)
              </span>
              <span className={yardTotals.totalWeightKg >= yardTotals.minTonTargetKg ? "text-emerald-400 font-black" : "text-amber-400 font-black"}>
                🎯 Meta: {yardTotals.minTonTargetKg.toLocaleString("pt-BR")} kg ({(yardTotals.minTonTargetKg / 1000).toFixed(1)}t)
              </span>
              <span className={yardTotals.totalWeightKg >= yardTotals.idealTonTargetKg ? "text-teal-400 font-black" : ""}>
                ⭐ Carga Cheia: {yardTotals.idealTonTargetKg.toLocaleString("pt-BR")} kg
              </span>
            </div>
            <div className="h-4 w-full bg-slate-950 rounded-full overflow-hidden border border-emerald-500/40 p-0.5 shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 rounded-full transition-all duration-500 flex items-center justify-end pr-1.5 text-[9px] font-black text-slate-950"
                style={{ width: `${Math.min(100, Math.max(3, yardTotals.progressMinPct))}%` }}
              >
                {yardTotals.progressMinPct >= 12 ? `${yardTotals.progressMinPct.toFixed(0)}%` : ""}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ABAS DO SISTEMA D.W VIDROS */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-900 border border-white/10 rounded-2xl overflow-x-auto">
        {[
          { id: "carrinho", label: "🛒 Bipar & Comprar no Portão", badge: cart.length > 0 ? `${cart.length}` : null },
          { id: "caderninho", label: "📖 Caderninho dos Colaboradores", badge: caderninhoTotals.totalPendingAll > 0 ? `R$ ${caderninhoTotals.totalPendingAll.toFixed(0)}` : null },
          { id: "estoque", label: "📦 Estoque & Balança (Gramas e ML)", badge: `${yardTotals.totalUnits}` },
          { id: "cargas", label: "🚚 Histórico & Cargas Despachadas", badge: truckShipments.length > 0 ? `${truckShipments.length}` : null }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`min-h-[48px] px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-black whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer touch-manipulation ${
              activeTab === tab.id
                ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30 scale-[1.02]"
                : "bg-slate-950 text-slate-300 hover:text-white hover:bg-slate-800"
            }`}
          >
            <span>{tab.label}</span>
            {tab.badge && (
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                  activeTab === tab.id ? "bg-slate-950 text-emerald-300" : "bg-emerald-500/20 text-emerald-300"
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ========================================================= */}
      {/* ABA 1: CARRINHO & BIPAR GARRAFAS MISTURADAS               */}
      {/* ========================================================= */}
      {activeTab === "carrinho" && (
        <div className="space-y-5">
          {/* 🛡️ ESCUDO ANTI-PREJUÍZO & TABELA OFICIAL DO VICTOR (RJ) */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border-2 border-indigo-500/40 rounded-3xl p-4 sm:p-5 shadow-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-500/20 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 font-bold text-xl shrink-0 shadow-inner">
                  🛡️
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      Escudo Anti-Prejuízo Automático
                    </span>
                    <span className="text-[10px] font-bold text-emerald-400">
                      Lucro Protegido 38% a 45%
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-white mt-0.5 flex items-center gap-2">
                    Tabela do Victor (Caminhão RJ) & Cotação Ativa
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowVictorRules(!showVictorRules)}
                className="px-3.5 py-1.5 bg-indigo-500/15 hover:bg-indigo-500/25 active:scale-95 text-indigo-300 font-bold text-xs rounded-xl border border-indigo-500/30 transition-all flex items-center gap-1.5 cursor-pointer touch-manipulation self-start sm:self-auto"
              >
                <span>{showVictorRules ? "Ocultar Regras WhatsApp ✕" : "📋 Ver Termos do WhatsApp"}</span>
              </button>
            </div>

            {/* SELETOR DOS 4 NÍVEIS OFICIAIS DO VICTOR */}
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                <span className="text-slate-300 font-bold">
                  Clique na cotação que o Victor vai pagar pela sua carga:
                </span>
                <span className="font-mono text-emerald-400 font-black">
                  Ativo: R$ {activeSellPricePerTon}/ton (R$ {sellPricePerKg.toFixed(2)}/kg)
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  {
                    label: "R$ 150/ton",
                    sub: "> 5t (Máxima)",
                    ton: 150,
                    desc: "Carga pesada > 5t fechada"
                  },
                  {
                    label: "R$ 100/ton",
                    sub: "3t a 5t (Mínimo)",
                    ton: 100,
                    desc: "Carga entre 3t e 5t"
                  },
                  {
                    label: "R$ 80/ton",
                    sub: "< 2,5t (Impureza)",
                    ton: 80,
                    desc: "Carga < 2,5t ou desconto"
                  },
                  {
                    label: "R$ 200/ton",
                    sub: "Vidro Limpo",
                    ton: 200,
                    desc: "Vidro puro sem impurezas"
                  }
                ].map((tier) => {
                  const isSelected = activeSellPricePerTon === tier.ton;
                  return (
                    <button
                      key={tier.ton}
                      type="button"
                      onClick={() => activeSetSellPricePerTon(tier.ton)}
                      className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer touch-manipulation ${
                        isSelected
                          ? "bg-gradient-to-br from-indigo-600 to-indigo-700 text-white border-white shadow-lg shadow-indigo-900/50 scale-[1.02] ring-2 ring-indigo-400"
                          : "bg-slate-950/80 text-slate-300 border-white/10 hover:border-indigo-400/50 hover:bg-slate-900"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-black text-sm">{tier.label}</span>
                        {isSelected && <span className="text-xs">✔️</span>}
                      </div>
                      <div className="text-[10px] font-bold opacity-90 mt-0.5">{tier.sub}</div>
                      <div className="text-[9px] opacity-75 truncate mt-0.5">{tier.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* REGRAS OFICIAIS DO WHATSAPP DO VICTOR (EXPANSÍVEL) */}
            {showVictorRules && (
              <div className="p-4 bg-slate-950 rounded-2xl border border-indigo-500/30 text-xs space-y-3">
                <div className="font-black text-amber-300 flex items-center gap-2">
                  <span>📲 Termos Oficiais do WhatsApp de Victor Inácio (Victor Campo Grande RJ - VIDRO):</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-300 text-[11px] leading-relaxed">
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-white/5 space-y-1">
                    <strong className="text-white block">🚛 1. Coleta Mínima do Caminhão:</strong>
                    <span>A partir de <strong>3.000 kg (3 Toneladas)</strong>. Mediante envio prévio de fotos e vídeos de todo o material no pátio para validação.</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-white/5 space-y-1">
                    <strong className="text-white block">👷 2. Ajudante & Carregamento:</strong>
                    <span>Carregamento é por conta do cliente, <strong>mas o Victor fornece 1 ajudante</strong> para auxiliar no carregamento.</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-white/5 space-y-1">
                    <strong className="text-white block">🚫 3. Proibido Contaminantes:</strong>
                    <span><strong>NÃO aceita porcelana, louças, pedras nem cerâmica</strong>! Se tiver na carga, há corte forte de preço (R$ 80/t) ou recusa.</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-white/5 space-y-1">
                    <strong className="text-white block">📍 4. Área de Atendimento:</strong>
                    <span>Atendimento exclusivo em todo o <strong>Estado do Rio de Janeiro (RJ)</strong>. Não fornecem caçambas no momento.</span>
                  </div>
                </div>
              </div>
            )}

            {/* DEMONSTRATIVO DINÂMICO DE SEGURANÇA POR PESO */}
            <div className="p-3 bg-slate-950/90 rounded-2xl border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <span className="text-slate-400 text-[10.5px]">
                  Proteção ativa por peso na cotação de R$ {activeSellPricePerTon}/t (R$ {sellPricePerKg.toFixed(2)}/kg):
                </span>
                <div className="font-bold text-white flex items-center gap-2 flex-wrap text-[11px]">
                  <span>Longneck (182g): <strong className="text-emerald-400">{getVictorSafeLotUnits("longneck", sellPricePerKg, 182)} un = R$ 0,50</strong></span>
                  <span>•</span>
                  <span>600ml (450g): <strong className="text-emerald-400">{getVictorSafeLotUnits("cerveja600", sellPricePerKg, 450)} un = R$ 0,50</strong></span>
                  <span>•</span>
                  <span>51/Dreher (500g): <strong className="text-emerald-400">{getVictorSafeLotUnits("900ml", sellPricePerKg, 500)} un = R$ 0,50</strong></span>
                  <span>•</span>
                  <span>Litrão (700g): <strong className="text-emerald-400">{getVictorSafeLotUnits("litrao", sellPricePerKg, 700)} un = R$ 0,50</strong></span>
                </div>
              </div>
              <div className="shrink-0 px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-black text-xs font-mono text-center">
                Lucro Protegido ~38% por Peso!
              </div>
            </div>
          </div>

          {/* SELETOR DO COLABORADOR DA RECICLAGEM */}
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-4 sm:p-5 space-y-3.5 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-white/10 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider block">
                  Quem está entregando as garrafas agora:
                </span>
                <h3 className="text-base font-black text-white flex items-center gap-2 mt-0.5">
                  <User className="w-4 h-4 text-emerald-400" />
                  Colaborador da Reciclagem Selecionado
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setShowAddCollabModal(true)}
                className="min-h-[44px] px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-xs uppercase rounded-xl transition-all flex items-center gap-1.5 cursor-pointer touch-manipulation"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Cadastrar Novo Colaborador</span>
              </button>
            </div>

            {/* CHIPS DE SELEÇÃO RÁPIDA DE COLABORADOR */}
            <div className="flex flex-wrap items-center gap-2">
              {collaborators.map((collab) => {
                const isSelected = selectedCollabId === collab.id;
                return (
                  <button
                    key={collab.id}
                    type="button"
                    onClick={() => setSelectedCollabId(collab.id)}
                    className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer touch-manipulation border ${
                      isSelected
                        ? collab.isFounder
                          ? "bg-amber-400 text-slate-950 border-amber-300 font-black shadow-lg shadow-amber-400/30 scale-105"
                          : "bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow-lg shadow-emerald-500/30 scale-105"
                        : collab.isFounder
                        ? "bg-amber-950/40 text-amber-200 border-amber-500/30 hover:border-amber-400"
                        : "bg-slate-950 text-slate-300 border-white/10 hover:border-white/30"
                    }`}
                  >
                    {collab.isFounder ? <Crown className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                    <span>{collab.name}</span>
                    {collab.balancePending > 0 && !collab.isFounder && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-rose-500/20 text-rose-300 rounded font-black">
                        Devo R$ {collab.balancePending.toFixed(2)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* BANNER SE FOR COLETA PRÓPRIA DE DENISE & WELLINGTON */}
            {activeCollab.isFounder && (
              <div className="p-3.5 bg-amber-950/40 border border-amber-500/40 rounded-2xl flex items-center gap-3 text-xs text-amber-200">
                <Crown className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <strong className="text-white block font-black">
                    👑 Coleta Própria D.W (Denise Jesus & Wellington Oliveira)
                  </strong>
                  As garrafas adicionadas agora entram no estoque para somar nas <strong>toneladas do caminhão</strong>, sem gerar dívida a terceiros! O valor é pura <strong>economia e faturamento 100% da sua empresa</strong>!
                </div>
              </div>
            )}
          </div>

          {/* ÁREA DE BIPAGEM & ENTRADA RÁPIDA DE CÓDIGO DE BARRAS */}
          <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-4 sm:p-5 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider block">
                  Bipe ou Digite o Código de Barras
                </span>
                <h3 className="text-base font-black text-white flex items-center gap-2 mt-0.5">
                  <Barcode className="w-5 h-5 text-emerald-400" />
                  Leitor de Códigos de Barras EAN (Dual Mode)
                </h3>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    openEditBottleModal({
                      id: `bottle_${Date.now()}`,
                      name: "",
                      volumeMl: 330,
                      barcode: "",
                      additionalBarcodes: ["", "", "", ""],
                      unitWeightGrams: 182,
                      unitWeightKg: 0.182,
                      category: "longneck",
                      buyPricePerUnit: 0.50 / 30,
                      emoji: "🍾",
                      stockUnits: 0,
                      quickPresets: [10, 30, 50, 100]
                    }, true);
                  }}
                  className="min-h-[48px] px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-slate-950 font-black text-xs uppercase rounded-xl transition-all flex items-center gap-1.5 cursor-pointer touch-manipulation select-none shadow-md shadow-emerald-500/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Cadastrar Garrafa (até 5 códs) ⚖️</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCameraTargetField("search");
                    setShowCameraModal(true);
                  }}
                  className="min-h-[48px] px-4 py-2.5 bg-slate-950 hover:bg-slate-800 active:scale-95 text-emerald-300 font-black text-xs uppercase rounded-xl border border-emerald-500/40 transition-all flex items-center gap-2 cursor-pointer touch-manipulation select-none"
                >
                  <Camera className="w-4 h-4 text-emerald-400" />
                  <span>Bipar Câmera 📷</span>
                </button>
              </div>
            </div>

            {/* CAMPO DE TEXTO DO LEITOR USB / DIGITAÇÃO */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleProcessBarcode(barcodeInput);
              }}
              className="flex items-center gap-2"
            >
              <div className="relative flex-1">
                <input
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setBarcodeInput(val);
                    if (val.trim().length === 8 || val.trim().length === 13) {
                      setTimeout(() => handleProcessBarcode(val), 250);
                    }
                  }}
                  placeholder="Bipe com o leitor ou digite o código de barras (ex: 78936683)..."
                  className="w-full min-h-[50px] bg-slate-950 border border-emerald-500/40 focus:border-emerald-400 rounded-2xl px-4 py-2.5 text-sm sm:text-base font-mono font-bold text-white outline-none placeholder:text-slate-500"
                />
              </div>

              <button
                type="submit"
                className="min-h-[50px] px-5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl transition-all flex items-center gap-1.5 cursor-pointer touch-manipulation"
              >
                <Zap className="w-4 h-4" />
                <span>Bipar ⚡</span>
              </button>
            </form>

            {/* BOTÕES DE 1 TOQUE PARA ADICIONAR QUALQUER GARRAFA CATALOGADA */}
            <div className="space-y-2 pt-2 border-t border-white/5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-black text-amber-400 block tracking-wider">
                  Toque Rápido para Lançar no Carrinho (+10, +30, +50, +100 un):
                </span>
                <span className="text-[10px] text-slate-400 font-bold hidden sm:inline">
                  Calculado por peso e centavos exatos
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {catalog.map((bottle) => {
                  const safeLot = getVictorSafeLotUnits(bottle.category, sellPricePerKg, bottle.unitWeightGrams);
                  const rawPresets =
                    bottle.category === "caco"
                      ? [2, 3, 5, 10]
                      : bottle.category === "longneck"
                      ? [10, safeLot, safeLot * 2, 50, 100]
                      : [2, safeLot, safeLot * 2, 24, 50];
                  // Filtra > 1 pois o botão "+1" já é exibido fixo na esquerda (evita botão "+1" duplicado!)
                  const presetsToShow = Array.from(new Set(rawPresets.filter((n) => n > 1))).sort((a, b) => a - b);
                  const inCartItem = cart.find((c) => c.catalogId === bottle.id);
                  const typedQtyNum = parseInt(bottleInputQty[bottle.id] || "0", 10);
                  const activeActionQty = !isNaN(typedQtyNum) && typedQtyNum > 0 ? typedQtyNum : (safeLot || 1);

                  return (
                    <div
                      key={bottle.id}
                      className={`p-3 bg-slate-950 rounded-2xl border transition-all flex flex-col justify-between space-y-2 ${
                        inCartItem
                          ? "border-emerald-400/80 ring-1 ring-emerald-500/35 shadow-lg shadow-emerald-950/40"
                          : "border-white/10 hover:border-emerald-500/40"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-2xl p-1 bg-slate-900 rounded-lg">{bottle.emoji}</span>
                          <button
                            type="button"
                            onClick={() => openCalibrateBottleModal(bottle)}
                            className="min-h-[44px] px-3 py-1 bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-[11px] font-black font-mono flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 touch-manipulation select-none shadow-sm"
                            title="Ajustar ou pesar esta garrafa na sua balança de cozinha"
                          >
                            <Scale className="w-3.5 h-3.5 text-emerald-400" />
                            <span>{bottle.unitWeightGrams}g</span>
                            <Edit3 className="w-3 h-3 text-slate-400" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between gap-1.5 mt-1.5">
                          <div className="font-black text-white text-xs truncate flex-1" title={bottle.name}>
                            {bottle.name}
                          </div>
                          <button
                            type="button"
                            onClick={() => openEditBottleModal(bottle, false)}
                            className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-slate-900 hover:bg-slate-800 text-cyan-300 hover:text-white rounded-xl border border-cyan-500/30 transition-all cursor-pointer touch-manipulation select-none active:scale-95 shrink-0"
                            title="Editar cadastro completo (Nome, Peso e 1 a 5 Códigos de Barras)"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between gap-1 mt-0.5 flex-wrap">
                          <span>{bottle.volumeMl}ml</span>
                          <span className="text-[9.5px] text-slate-500">
                            {bottle.barcode ? `Cód: ${bottle.barcode}` : "Sem código"}
                            {bottle.additionalBarcodes && bottle.additionalBarcodes.filter(Boolean).length > 0 && (
                              <span className="ml-1 text-emerald-400 font-bold">
                                (+{bottle.additionalBarcodes.filter(Boolean).length} extras)
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="text-[10px] font-bold text-amber-300 font-mono leading-tight mt-1 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg">
                          {getBottleCentavosLabel(bottle.category, bottle.buyPricePerUnit, sellPricePerKg, bottle.unitWeightGrams)}
                        </div>
                      </div>

                      {/* Feedback instantâneo visível direto no card se já está no carrinho */}
                      {inCartItem && (
                        <div className="p-2 bg-emerald-950/60 border border-emerald-500/50 rounded-xl flex items-center justify-between gap-2 text-[10.5px]">
                          <div className="min-w-0">
                            <span className="text-emerald-300 font-black block">
                              ✓ No Carrinho: {inCartItem.quantity} un
                            </span>
                            <span className="text-slate-200 font-mono">
                              {inCartItem.totalWeightKg.toFixed(2)} kg • R$ {inCartItem.totalBuyCost.toFixed(2)}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowCheckoutModal(true)}
                            className="min-h-[38px] px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black text-[10px] uppercase rounded-lg cursor-pointer touch-manipulation select-none shrink-0"
                          >
                            Pagar / Pátio ➔
                          </button>
                        </div>
                      )}

                      {/* Digitação Direta no Teclado (ex: 55 garrafas) */}
                      <div className="pt-2 border-t border-white/10 space-y-2">
                        <div className="bg-slate-900/90 p-2 rounded-xl border border-white/10 space-y-2">
                          <div className="flex items-center justify-between text-[10px] text-slate-300 font-bold">
                            <span>Digitar quantidade:</span>
                            <span className="text-emerald-400 font-mono text-[9.5px]">
                              {(() => {
                                const rawVal = bottleInputQty[bottle.id];
                                const val = parseInt(rawVal || "0", 10);
                                if (val > 0) {
                                  const calcKg = ((val * bottle.unitWeightGrams) / 1000).toFixed(2);
                                  const cost = calculateGlassBuyCost(
                                    bottle.category,
                                    val,
                                    bottle.buyPricePerUnit,
                                    sellPricePerKg,
                                    bottle.unitWeightGrams
                                  );
                                  return `= ${calcKg} kg • R$ ${cost.toFixed(2)}`;
                                }
                                return `Balança: ${bottle.unitWeightGrams}g`;
                              })()}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              placeholder="Ex: 55"
                              value={bottleInputQty[bottle.id] ?? ""}
                              onChange={(e) => {
                                const cleaned = e.target.value.replace(/\D/g, "");
                                setBottleInputQty((prev) => ({ ...prev, [bottle.id]: cleaned }));
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleAddDirectQuantity(bottle, true);
                                }
                              }}
                              className="w-20 min-h-[46px] bg-slate-950 border-2 border-emerald-500/50 focus:border-emerald-400 rounded-xl px-2 text-center text-white font-mono font-black text-base outline-none shadow-inner"
                            />
                            <button
                              type="button"
                              onClick={() => handleAddDirectQuantity(bottle, false)}
                              className="flex-1 min-h-[46px] px-3 bg-slate-800 hover:bg-slate-700 active:scale-95 text-emerald-300 border border-emerald-500/40 font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer touch-manipulation select-none shadow-sm"
                              title="Adicionar ao carrinho para continuar lançando outras garrafas"
                            >
                              <Plus className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">+ Carrinho ({activeActionQty} un)</span>
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddDirectQuantity(bottle, true)}
                            className="w-full min-h-[46px] px-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-95 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation select-none shadow-md shadow-emerald-500/25"
                            title="Lança a quantidade e já abre a tela para Pagar, Caderninho e Somar no Pátio"
                          >
                            <Zap className="w-4 h-4 shrink-0" />
                            <span className="truncate">
                              Lançar {activeActionQty} un &amp; Pagar / Pátio ➔
                            </span>
                          </button>
                        </div>

                        {/* Botões de Presets rápidos (+1, +safeLot, +50, +100) com Touch Alargado (min-h-[44px]) */}
                        <div className="space-y-1">
                          {bottle.category !== "caco" && (
                            <div className="text-[9px] text-emerald-400 font-black flex items-center justify-between px-0.5">
                              <span>Lote R$ 0,50: {safeLot} un</span>
                              <span className="text-[8.5px] text-slate-400">({((safeLot * bottle.unitWeightGrams) / 1000).toFixed(1)}kg)</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => handleAddBottleToCart(bottle, 1)}
                              className="min-h-[44px] px-3 py-1 bg-slate-900 hover:bg-slate-800 active:scale-95 text-slate-200 font-mono font-black text-xs rounded-xl transition-all border border-white/10 cursor-pointer touch-manipulation select-none flex items-center justify-center shadow-sm"
                              title="Adicionar 1 unidade"
                            >
                              +1
                            </button>
                            {presetsToShow.map((qty) => (
                              <button
                                key={qty}
                                type="button"
                                onClick={() => handleAddBottleToCart(bottle, qty)}
                                className={`min-h-[44px] flex-1 min-w-[42px] py-1 font-mono text-xs rounded-xl transition-all border flex items-center justify-center cursor-pointer touch-manipulation select-none active:scale-95 ${
                                  qty === safeLot
                                    ? "bg-amber-400 text-slate-950 font-black border-amber-300 shadow-md shadow-amber-400/25 ring-1 ring-amber-300"
                                    : "bg-slate-900 hover:bg-emerald-600 hover:text-slate-950 active:bg-emerald-500 text-white font-black border-white/10 shadow-sm"
                                }`}
                                title={`Adicionar lote de ${qty} unidades (${((qty * bottle.unitWeightGrams) / 1000).toFixed(2)} kg)`}
                              >
                                +{qty}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ITENS DO CARRINHO MISTURADO */}
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-4 sm:p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider block">
                  Entrega Atual de Vidros
                </span>
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-amber-400" />
                  Garrafas no Carrinho ({cartTotals.totalBottles} unidades • {cartTotals.totalWeightKg.toFixed(1)} kg)
                </h3>
              </div>

              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCart([])}
                  className="min-h-[40px] px-3 py-1.5 bg-slate-950 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 text-xs font-bold rounded-xl border border-white/10 transition-all flex items-center gap-1 cursor-pointer touch-manipulation"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Limpar Carrinho</span>
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="py-8 text-center space-y-2 text-slate-400">
                <Wine className="w-10 h-10 mx-auto text-slate-600 opacity-60" />
                <p className="text-sm font-bold text-slate-300">O carrinho está vazio no momento.</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Bipe o código de barras ou clique nos botões acima para lançar as garrafas trazidas pelo colaborador!
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 bg-slate-950 rounded-2xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl p-2 bg-slate-900 rounded-xl border border-white/5">{item.emoji}</span>
                      <div>
                        <div className="font-black text-white text-sm flex items-center gap-2">
                          <span>{item.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded font-mono font-bold">
                            {item.volumeMl}ml
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-1.5 flex-wrap">
                          <span>{item.quantity} un ×</span>
                          <button
                            type="button"
                            onClick={() => {
                              const match = catalog.find((b) => b.id === item.catalogId);
                              if (match) openCalibrateBottleModal(match);
                            }}
                            className="px-1.5 py-0.5 bg-slate-900 hover:bg-slate-800 text-emerald-400 font-bold border border-emerald-500/30 rounded flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                            title="Calibrar ou alterar peso na balança"
                          >
                            <Scale className="w-3 h-3 text-emerald-400" />
                            <span>{item.unitWeightGrams}g</span>
                            <Edit3 className="w-2.5 h-2.5 text-slate-400" />
                          </button>
                          <span>=</span>
                          <strong className="text-emerald-400 font-black">{item.totalWeightKg.toFixed(2)} kg</strong>
                        </div>
                        <div className="text-[10px] font-bold text-amber-300 font-mono mt-0.5">
                          {getBottleCentavosLabel(item.category, item.buyPricePerUnit, sellPricePerKg, item.unitWeightGrams)}
                        </div>
                        {item.warningAlert && (
                          <div className="mt-1 px-2 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 text-[10px] text-rose-300 font-bold max-w-md leading-tight flex items-start gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                            <span>{item.warningAlert}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5 flex-wrap sm:flex-nowrap">
                      {/* Ajuste de Quantidade com Digitação Direta no Teclado e Botões de Lote Rápido */}
                      <div className="flex flex-col gap-1.5 items-start sm:items-end">
                        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-white/10 shadow-inner">
                          <button
                            type="button"
                            onClick={() => handleUpdateCartQuantity(item.id, item.quantity - 1)}
                            className="w-10 h-10 min-h-[40px] min-w-[40px] rounded-lg bg-slate-950 hover:bg-slate-800 active:scale-95 text-white font-bold text-base flex items-center justify-center cursor-pointer touch-manipulation border border-white/10"
                            title="Diminuir 1 garrafa"
                          >
                            -
                          </button>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={item.quantity === 0 ? "" : item.quantity}
                            onChange={(e) => {
                              const cleaned = e.target.value.replace(/\D/g, "");
                              handleUpdateCartQuantity(item.id, cleaned === "" ? 0 : parseInt(cleaned, 10));
                            }}
                            className="w-16 min-h-[40px] text-center bg-slate-950 border border-emerald-500/40 rounded-lg text-white font-mono font-black text-sm outline-none focus:border-emerald-400"
                            placeholder="0"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateCartQuantity(item.id, item.quantity + 1)}
                            className="w-10 h-10 min-h-[40px] min-w-[40px] rounded-lg bg-slate-950 hover:bg-slate-800 active:scale-95 text-white font-bold text-base flex items-center justify-center cursor-pointer touch-manipulation border border-white/10"
                            title="Aumentar 1 garrafa"
                          >
                            +
                          </button>
                        </div>
                        <div className="flex items-center gap-1">
                          {[10, 30, 50, 100].map((add) => (
                            <button
                              key={add}
                              type="button"
                              onClick={() => handleUpdateCartQuantity(item.id, item.quantity + add)}
                              className="min-h-[32px] px-2 py-0.5 bg-slate-900 hover:bg-emerald-600 hover:text-slate-950 active:scale-95 text-slate-300 font-mono font-bold text-[10px] rounded-lg border border-white/10 cursor-pointer touch-manipulation"
                              title={`Somar +${add} unidades`}
                            >
                              +{add}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Valores */}
                      <div className="text-right min-w-[110px]">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          {activeCollab.isFounder ? "Economia Própria:" : "Pagar ao Colaborador:"}
                        </span>
                        <div className="text-sm font-mono font-black text-amber-400">
                          R$ {item.totalBuyCost.toFixed(2)}
                        </div>
                        <span className="text-[10px] text-emerald-400 block font-mono">
                          Usina: R$ {item.totalRevenue.toFixed(2)}
                        </span>
                      </div>

                      {/* Remover */}
                      <button
                        type="button"
                        onClick={() => handleRemoveCartItem(item.id)}
                        className="p-2 text-slate-600 hover:text-rose-400 transition-all cursor-pointer"
                        title="Remover garrafa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* TOTAIS DO CARRINHO */}
                <div className="mt-4 p-4 bg-slate-950/90 rounded-2xl border-2 border-emerald-500/30 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Total de Garrafas:</span>
                    <strong className="text-xl font-mono text-white font-black">{cartTotals.totalBottles} un</strong>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Peso Total Somado:</span>
                    <strong className="text-xl font-mono text-emerald-400 font-black">
                      {cartTotals.totalWeightKg.toFixed(2)} kg
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-amber-400 block">
                      {activeCollab.isFounder ? "Economia D.W:" : "Valor a Pagar:"}
                    </span>
                    <strong className="text-xl font-mono text-amber-400 font-black">
                      R$ {cartTotals.totalBuyCost.toFixed(2)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-teal-400 block">Venda Victor (R$ 0,15/kg):</span>
                    <strong className="text-xl font-mono text-teal-300 font-black">
                      R$ {cartTotals.totalRevenue.toFixed(2)}
                    </strong>
                  </div>
                </div>

                {/* BOTÕES PARA FINALIZAR TÍQUETE */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2.5">
                  {activeCollab.isFounder ? (
                    <button
                      type="button"
                      onClick={() => handleFinalizeTicket("coleta_propria_dw" as any)}
                      className="w-full sm:w-auto min-h-[50px] px-6 py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-sm uppercase tracking-wider rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-400/30 touch-manipulation"
                    >
                      <Crown className="w-5 h-5" />
                      <span>Lançar Coleta Própria D.W (Economia de R$ {cartTotals.totalBuyCost.toFixed(2)}) 👑</span>
                    </button>
                  ) : (
                    <div className="w-full space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-400 font-bold px-1 gap-1">
                        <span className="flex items-center gap-1.5 text-emerald-400">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>
                            Converte automaticamente para <strong className="text-white font-mono">{cartTotals.totalWeightKg.toFixed(2)} kg</strong> no Pátio rumo à meta do Victor!
                          </span>
                        </span>
                        <span className="text-amber-300 font-mono">
                          Colaborador: <strong className="text-white">{activeCollab.name}</strong> (R$ {cartTotals.totalBuyCost.toFixed(2)})
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => handleFinalizeTicket("pendente_caderninho")}
                          className="w-full sm:flex-1 min-h-[52px] px-4 py-2.5 bg-slate-950 hover:bg-slate-800 active:scale-95 text-amber-300 font-black text-xs uppercase rounded-2xl border-2 border-amber-500/50 transition-all flex items-center justify-center gap-2.5 cursor-pointer touch-manipulation shadow-lg shadow-amber-950/40"
                          title="Acumular para acertar no Bolsa Família ou no Caminhão do Victor (Caderninho do Colaborador)"
                        >
                          <Calendar className="w-5 h-5 text-amber-400 shrink-0" />
                          <div className="text-left leading-tight">
                            <span className="block font-black text-xs">📓 Lançar no Caderninho</span>
                            <span className="block text-[10px] text-amber-200/80 font-normal">Pagar depois (Bolsa Família / Caminhão)</span>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleFinalizeTicket("pago_na_hora")}
                          className="w-full sm:flex-1 min-h-[52px] px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-95 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-lg shadow-emerald-500/30 touch-manipulation"
                          title="Pagar agora em dinheiro ou PIX na hora da entrega"
                        >
                          <Check className="w-5 h-5 shrink-0" />
                          <div className="text-left leading-tight">
                            <span className="block font-black text-xs">💵 Pagar Agora no Portão</span>
                            <span className="block text-[10px] text-slate-900 font-bold">R$ {cartTotals.totalBuyCost.toFixed(2)} pago ao colaborador</span>
                          </div>
                        </button>
                      </div>

                      <div className="p-2 bg-slate-950/80 border border-white/5 rounded-xl text-[10px] text-slate-400 flex items-center gap-2">
                        <span className="text-emerald-400 text-xs">ℹ️</span>
                        <span>
                          <strong>Caderninho dos Colaboradores:</strong> Este registro fica exclusivo para os recicladores parceiros da D.W Vidros. O fiado de clientes da loja continua 100% separado no módulo Fiado!
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ABA 2: CADERNINHO FINANCEIRO DOS COLABORADORES DA RECICLAGEM */}
      {/* ========================================================= */}
      {activeTab === "caderninho" && (
        <div className="space-y-5">
          {/* BANNER DO CADERNINHO */}
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider block">
                  Livro Caixa & Contas dos Colaboradores
                </span>
                <h3 className="text-lg font-black text-white flex items-center gap-2 mt-0.5">
                  <Users className="w-5 h-5 text-emerald-400" />
                  Caderninho de Cada Colaborador da Reciclagem
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  Acompanhe quanto cada parceiro trouxe em garrafas e peso, quanto acumulou, quanto você já pagou e quanto ainda deve acertar com o <strong>Bolsa Família</strong> ou quando o <strong>Caminhão do Victor</strong> vier!
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddCollabModal(true)}
                className="min-h-[48px] px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-xs uppercase rounded-xl transition-all flex items-center gap-1.5 cursor-pointer touch-manipulation shadow-md"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Novo Colaborador</span>
              </button>
            </div>

            {/* RESUMO GERAL DAS DÍVIDAS E ECONOMIAS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-4 bg-slate-950 rounded-2xl border border-rose-500/30 space-y-1">
                <span className="text-[10px] uppercase font-bold text-rose-400 block">Total Pendente a Pagar:</span>
                <strong className="text-2xl font-mono text-rose-300 font-black">
                  R$ {caderninhoTotals.totalPendingAll.toFixed(2)}
                </strong>
                <span className="text-[10px] text-slate-400 block">
                  Para acertar no Bolsa Família ou na carga
                </span>
              </div>

              <div className="p-4 bg-slate-950 rounded-2xl border border-emerald-500/30 space-y-1">
                <span className="text-[10px] uppercase font-bold text-emerald-400 block">Total Já Pago aos Parceiros:</span>
                <strong className="text-2xl font-mono text-emerald-400 font-black">
                  R$ {caderninhoTotals.totalPaidAll.toFixed(2)}
                </strong>
                <span className="text-[10px] text-slate-400 block">
                  Histórico de acertos cumpridos
                </span>
              </div>

              <div className="p-4 bg-slate-950 rounded-2xl border border-amber-500/30 space-y-1">
                <span className="text-[10px] uppercase font-bold text-amber-400 block">
                  👑 Economia Denise & Wellington:
                </span>
                <strong className="text-2xl font-mono text-amber-300 font-black">
                  R$ {caderninhoTotals.founderSelfSaved.toFixed(2)}
                </strong>
                <span className="text-[10px] text-slate-400 block">
                  Coleta própria: lucro 100% da sua empresa!
                </span>
              </div>
            </div>

            {/* LISTA DE FICHAS DOS COLABORADORES */}
            <div className="space-y-3 pt-2">
              {collaborators.map((collab) => (
                <div
                  key={collab.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    collab.isFounder
                      ? "bg-amber-950/20 border-amber-500/40"
                      : collab.balancePending > 0
                      ? "bg-slate-950 border-rose-500/30 hover:border-rose-400"
                      : "bg-slate-950 border-white/10"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {collab.isFounder ? (
                        <Crown className="w-5 h-5 text-amber-400" />
                      ) : (
                        <User className="w-5 h-5 text-emerald-400" />
                      )}
                      <strong className="text-white text-base font-black">{collab.name}</strong>
                      {collab.isFounder && (
                        <span className="px-2 py-0.5 bg-amber-400 text-slate-950 text-[10px] font-black rounded uppercase">
                          Fundadores D.W
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-3 flex-wrap">
                      <span>📦 {collab.totalDeliveries} entregas</span>
                      <span>🍾 {collab.totalBottles} garrafas</span>
                      <span>⚖️ {collab.totalWeightKg.toFixed(1)} kg</span>
                      {collab.notes && <span className="text-slate-500">• {collab.notes}</span>}
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-4 pt-3 md:pt-0 border-t md:border-t-0 border-white/5">
                    {collab.isFounder ? (
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-amber-400 block">
                          Economia Própria Gerada:
                        </span>
                        <div className="text-lg font-mono font-black text-amber-300">
                          R$ {collab.totalEarned.toFixed(2)}
                        </div>
                        <span className="text-[10px] text-emerald-400 block font-bold">100% de margem no caminhão</span>
                      </div>
                    ) : (
                      <>
                        <div className="text-left md:text-right">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Faturado:</span>
                          <span className="text-xs font-mono font-bold text-slate-300">
                            R$ {collab.totalEarned.toFixed(2)}
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            Já Pago: R$ {collab.totalPaid.toFixed(2)}
                          </span>
                        </div>

                        <div className="text-right min-w-[120px]">
                          <span className="text-[10px] uppercase font-bold text-rose-400 block">Saldo a Pagar:</span>
                          <strong
                            className={`text-lg font-mono font-black block ${
                              collab.balancePending > 0 ? "text-rose-300" : "text-emerald-400"
                            }`}
                          >
                            R$ {collab.balancePending.toFixed(2)}
                          </strong>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setPayingCollab(collab);
                            setPayAmount(collab.balancePending > 0 ? collab.balancePending : 10);
                          }}
                          className="min-h-[44px] px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-xs uppercase rounded-xl transition-all flex items-center gap-1.5 cursor-pointer touch-manipulation"
                        >
                          <Coins className="w-4 h-4" />
                          <span>Fazer Acerto 💸</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ABA 3: ESTOQUE SEPARADO (VIDROS DA RECICLAGEM VS OUTROS) */}
      {/* ========================================================= */}
      {activeTab === "estoque" && (
        <div className="space-y-5">
          {/* SELETOR DE SEPARAÇÃO ESTRITA: VIDROS VS OUTROS MATERIAIS */}
          <div className="flex items-center gap-2 p-1.5 bg-slate-900 border border-white/10 rounded-2xl">
            <button
              type="button"
              onClick={() => setYardControlFilter("vidro")}
              className={`flex-1 min-h-[48px] px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation select-none active:scale-95 ${
                yardControlFilter === "vidro"
                  ? "bg-emerald-500 text-slate-950 shadow-md"
                  : "bg-slate-950 text-slate-300 hover:text-white"
              }`}
            >
              <Wine className="w-4 h-4" />
              <span>🍾 Vidros do Pátio ({yardTotals.totalWeightKg.toFixed(1)} kg)</span>
            </button>
            <button
              type="button"
              onClick={() => setYardControlFilter("outros")}
              className={`flex-1 min-h-[48px] px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation select-none active:scale-95 ${
                yardControlFilter === "outros"
                  ? "bg-cyan-500 text-slate-950 shadow-md"
                  : "bg-slate-950 text-slate-300 hover:text-white"
              }`}
            >
              <Package className="w-4 h-4" />
              <span>🔩 Outros Materiais Separados ({otherMaterialsTotalKg.toFixed(1)} kg)</span>
            </button>
          </div>

          {yardControlFilter === "outros" ? (
            <div className="bg-slate-900 border border-cyan-500/30 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
              <div className="border-b border-white/10 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-black uppercase text-cyan-400 tracking-wider block">
                    Estoque Isolado de Ferro Velho (Não mistura com a Meta do Caminhão de Vidros)
                  </span>
                  <h3 className="text-lg font-black text-white flex items-center gap-2 mt-0.5">
                    <Package className="w-5 h-5 text-cyan-400" />
                    Outros Materiais (Alumínio, Ferro, Papelão, Cobre)
                  </h3>
                  <p className="text-xs text-slate-300 mt-1">
                    Tudo lançado aqui fica 100% separado da tonelagem de vidros do Victor e das mercadorias da loja.
                  </p>
                </div>
                <div className="px-4 py-2 bg-slate-950 rounded-2xl border border-cyan-500/30 text-right shrink-0">
                  <span className="text-[10px] uppercase font-bold text-cyan-400 block">Total Outros Materiais:</span>
                  <strong className="text-xl font-mono font-black text-white">
                    {otherMaterialsTotalKg.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 })} kg
                  </strong>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {otherScrapMaterials.map((mat) => (
                  <div
                    key={mat.id}
                    className="p-4 bg-slate-950 rounded-2xl border border-cyan-500/25 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-3xl p-2 bg-slate-900 rounded-xl">{mat.emoji}</span>
                        <div>
                          <div className="text-white font-black text-sm">{mat.name}</div>
                          <div className="text-[10.5px] text-cyan-300 font-mono font-bold">
                            Base R$ {mat.buyPricePerKg.toFixed(2)}/kg {mat.notes ? `• ${mat.notes}` : ""}
                          </div>
                        </div>
                      </div>
                      <strong className="text-lg font-mono font-black text-cyan-300">
                        {mat.stockKg.toFixed(1)} kg
                      </strong>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={mat.stockKg === 0 ? "" : String(mat.stockKg)}
                        placeholder="0 kg"
                        onChange={(e) => {
                          const v = parseFloat(e.target.value.replace(",", ".")) || 0;
                          setOtherScrapMaterials((prev) =>
                            prev.map((m) => (m.id === mat.id ? { ...m, stockKg: Math.max(0, v) } : m))
                          );
                        }}
                        className="w-24 min-h-[44px] bg-slate-900 border border-cyan-500/40 rounded-xl px-3 text-center text-white font-mono font-black text-sm outline-none"
                      />
                      {[1, 5, 10, 50].map((addKg) => (
                        <button
                          key={addKg}
                          type="button"
                          onClick={() =>
                            setOtherScrapMaterials((prev) =>
                              prev.map((m) => (m.id === mat.id ? { ...m, stockKg: m.stockKg + addKg } : m))
                            )
                          }
                          className="min-h-[44px] px-3 bg-slate-900 hover:bg-cyan-500 hover:text-slate-950 text-cyan-200 font-mono font-black text-xs rounded-xl border border-white/10 cursor-pointer touch-manipulation select-none active:scale-95"
                        >
                          +{addKg}kg
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          setOtherScrapMaterials((prev) =>
                            prev.map((m) => (m.id === mat.id ? { ...m, stockKg: 0 } : m))
                          )
                        }
                        className="min-h-[44px] px-3 bg-slate-900 hover:bg-rose-950/60 text-rose-300 font-bold text-xs rounded-xl border border-rose-500/20 cursor-pointer touch-manipulation select-none active:scale-95 ml-auto"
                      >
                        Zerar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-white/10 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider block">
                    Balança de Precisão & Catálogo de Garrafas (1 a 5 Códigos)
                  </span>
                  <h3 className="text-lg font-black text-white flex items-center gap-2 mt-0.5">
                    <Scale className="w-5 h-5 text-emerald-400" />
                    Estoque Real no Pátio — Vidros (ML separado de Gramas)
                  </h3>
                  <p className="text-xs text-slate-300 mt-1">
                    Pese 1 garrafa de amostra na sua balança, cadastre até 5 códigos de barras iguais (ex: Heineken, Stella, Império) e edite a quantidade real do pátio.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setShowZeroConfirmModal(true)}
                    className="min-h-[48px] px-3.5 py-2 bg-slate-950 hover:bg-rose-950/60 text-rose-300 font-black text-xs uppercase rounded-xl border border-rose-500/30 transition-all flex items-center gap-1.5 cursor-pointer touch-manipulation select-none active:scale-95"
                  >
                    <Eraser className="w-4 h-4 text-rose-400" />
                    <span>Zerar Tudo 🧹</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      openEditBottleModal({
                        id: `bottle_${Date.now()}`,
                        name: "",
                        volumeMl: 330,
                        barcode: "",
                        additionalBarcodes: ["", "", "", ""],
                        unitWeightGrams: 182,
                        unitWeightKg: 0.182,
                        category: "longneck",
                        buyPricePerUnit: 0.50 / 30,
                        emoji: "🍾",
                        stockUnits: 0,
                        quickPresets: [10, 30, 50, 100]
                      }, true);
                    }}
                    className="min-h-[48px] px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-xs uppercase rounded-xl transition-all flex items-center gap-1.5 cursor-pointer touch-manipulation select-none active:scale-95 shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Cadastrar Garrafa (1-5 Códs)</span>
                  </button>
                </div>
              </div>

              {/* TABELA DE GARRAFAS CADASTRADAS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {catalog.map((bottle) => {
                  const totalBottleWeightKg = ((bottle.stockUnits || 0) * bottle.unitWeightGrams) / 1000;
                  const totalValueVictor = totalBottleWeightKg * sellPricePerKg;

                  return (
                    <div
                      key={bottle.id}
                      className="p-4 bg-slate-950 rounded-2xl border border-white/10 hover:border-emerald-500/40 transition-all space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="text-3xl p-2 bg-slate-900 rounded-xl border border-white/5">
                            {bottle.emoji}
                          </span>
                          <div>
                            <div className="text-white font-black text-sm">{bottle.name}</div>
                            <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="font-bold text-emerald-400">Volume: {bottle.volumeMl} ml</span>
                              <span>•</span>
                              <span className="font-mono text-slate-300">
                                Cód: {bottle.barcode || "Não cadastrado"}
                                {bottle.additionalBarcodes && bottle.additionalBarcodes.filter(Boolean).length > 0 && (
                                  <span className="ml-1 text-emerald-400 font-bold">
                                    (+{bottle.additionalBarcodes.filter(Boolean).length} extras)
                                  </span>
                                )}
                              </span>
                            </div>
                            <div className="text-[10px] text-amber-300 font-mono font-bold mt-0.5">
                              {getBottleCentavosLabel(bottle.category, bottle.buyPricePerUnit, sellPricePerKg, bottle.unitWeightGrams)}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => openCalibrateBottleModal(bottle)}
                            className="min-h-[44px] px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 active:scale-95 text-emerald-300 font-bold text-xs rounded-xl border border-emerald-500/40 flex items-center gap-1.5 cursor-pointer touch-manipulation select-none shadow-sm"
                            title="Calibrar peso em gramas na balança digital de cozinha"
                          >
                            <Scale className="w-4 h-4 text-emerald-400" />
                            <span className="font-mono font-black">{bottle.unitWeightGrams}g</span>
                          </button>
                        </div>
                      </div>

                      {/* EDIÇÃO DIRETA DA QUANTIDADE NO PÁTIO */}
                      <div className="p-3 bg-slate-900 rounded-xl border border-white/5 grid grid-cols-2 sm:grid-cols-3 gap-2 items-center text-xs">
                        <div className="space-y-1 col-span-2 sm:col-span-1">
                          <label className="text-[10px] font-black uppercase text-amber-400 block">
                            Unidades no Pátio:
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={bottle.stockUnits === 0 ? "" : String(bottle.stockUnits)}
                            placeholder="0"
                            onChange={(e) => {
                              const cleaned = e.target.value.replace(/\D/g, "");
                              handleUpdateYardStockDirect(bottle.id, cleaned === "" ? 0 : parseInt(cleaned, 10));
                            }}
                            className="w-full min-h-[44px] bg-slate-950 border border-amber-500/40 focus:border-amber-400 rounded-xl px-2.5 py-1 text-sm font-mono font-black text-white outline-none"
                          />
                        </div>

                        <div className="space-y-0.5">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Peso Acumulado:</span>
                          <strong className="text-sm font-mono text-emerald-400 font-black block">
                            {totalBottleWeightKg.toFixed(1)} kg
                          </strong>
                          <span className="text-[9px] text-slate-500 block">
                            ({(totalBottleWeightKg / 1000).toFixed(3)} ton)
                          </span>
                        </div>

                        <div className="space-y-0.5 text-right sm:text-left">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Valor no Victor:</span>
                          <strong className="text-sm font-mono text-white font-bold block">
                            R$ {totalValueVictor.toFixed(2)}
                          </strong>
                          <span className="text-[9px] text-emerald-300 block">a R$ {sellPricePerKg.toFixed(2)}/kg</span>
                        </div>
                      </div>

                      {/* BOTÕES RÁPIDOS DE AJUSTE NO PÁTIO */}
                      <div className="flex items-center justify-between text-[11px] pt-1 gap-1.5 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {[
                            { label: "+10", add: 10 },
                            { label: "+30", add: 30 },
                            { label: "+50", add: 50 },
                            { label: "+100", add: 100 }
                          ].map((btn) => (
                            <button
                              key={btn.add}
                              type="button"
                              onClick={() => handleUpdateYardStockDirect(bottle.id, (bottle.stockUnits || 0) + btn.add)}
                              className="min-h-[44px] px-3 py-1 bg-slate-900 hover:bg-slate-800 active:scale-95 text-slate-300 hover:text-white rounded-xl font-mono font-bold border border-white/10 cursor-pointer touch-manipulation select-none"
                            >
                              {btn.label}
                            </button>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleUpdateYardStockDirect(bottle.id, 0)}
                          className="min-h-[44px] px-3 text-xs text-slate-400 hover:text-rose-400 font-bold transition-all rounded-xl border border-white/5 cursor-pointer touch-manipulation select-none active:scale-95"
                          title="Zerar unidades desta garrafa no pátio"
                        >
                          Zerar
                        </button>
                      </div>

                      {/* LINHA DE AÇÕES: EDITAR DADOS (1-5 CÓDIGOS), CADASTRAR PARECIDA E CALIBRAR BALANÇA */}
                      <div className="flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-white/5 text-xs">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => openEditBottleModal(bottle, false)}
                            className="min-h-[44px] px-3 py-1.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-cyan-300 font-bold rounded-xl border border-cyan-500/30 flex items-center gap-1.5 cursor-pointer touch-manipulation select-none"
                            title="Editar nome, ml, peso em gramas ou 1 a 5 códigos"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Editar / Códigos ✍️</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDuplicateSimilar(bottle)}
                            className="min-h-[44px] px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-95 text-emerald-300 font-bold rounded-xl border border-emerald-500/30 flex items-center gap-1.5 cursor-pointer touch-manipulation select-none"
                            title="Cadastrar outra garrafa ou pote parecido copiando este peso e ml"
                          >
                            <Copy className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Parecida 📑</span>
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => openCalibrateBottleModal(bottle)}
                          className="min-h-[44px] px-3 py-1.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-amber-300 font-bold rounded-xl border border-amber-500/30 flex items-center gap-1.5 cursor-pointer touch-manipulation select-none"
                          title="Pesar amostra na balança digital de cozinha"
                        >
                          <Scale className="w-3.5 h-3.5 text-amber-400" />
                          <span>Balança ({bottle.unitWeightGrams}g)</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* ABA 4: HISTÓRICO DE CARGAS DO VICTOR & TÍQUETES/NOTINHAS  */}
      {/* ========================================================= */}
      {activeTab === "cargas" && (
        <div className="space-y-5">
          {/* HISTÓRICO DE NOTINHAS / TÍQUETES DE COMPRA NO PORTÃO */}
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="border-b border-white/10 pb-3">
              <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider block">
                Comprovantes & Cupons de Compra na Reciclagem
              </span>
              <h3 className="text-lg font-black text-white flex items-center gap-2 mt-0.5">
                <Printer className="w-5 h-5 text-emerald-400" />
                Histórico de Notinhas de Compra no Portão
              </h3>
            </div>

            {purchaseHistory.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs">
                Nenhuma compra de vidro finalizada ainda. Ao finalizar um carrinho na aba "Bipar & Comprar", a notinha térmica aparecerá aqui!
              </div>
            ) : (
              <div className="space-y-2.5">
                {purchaseHistory.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="p-4 bg-slate-950 rounded-2xl border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="font-black text-white text-sm flex items-center gap-2 flex-wrap">
                        <span>🧾 {ticket.collectorName}</span>
                        <span className="text-[10px] text-slate-400 font-normal">{ticket.timestamp}</span>
                      </div>
                      <div className="text-slate-300">
                        <strong className="text-emerald-400 font-mono">{ticket.totalBottles} un</strong> ({ticket.totalWeightKg.toFixed(2)} kg) •{" "}
                        {ticket.items.map((it) => `${it.quantity}× ${it.name}`).join(", ")}
                      </div>
                      <div className="text-[10.5px] font-bold text-amber-300">
                        {ticket.paymentStatus === "coleta_propria_dw"
                          ? "👑 Coleta Própria D.W"
                          : ticket.paymentStatus === "pago_na_hora"
                          ? `💵 Pago na Hora: R$ ${ticket.totalPaid.toFixed(2)}`
                          : `📓 Lançado no Caderninho: R$ ${ticket.totalPaid.toFixed(2)}`}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handlePrintGlassTicket(ticket)}
                        className="min-h-[44px] px-3.5 py-2 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-black text-xs rounded-xl border border-emerald-500/40 flex items-center gap-1.5 cursor-pointer touch-manipulation select-none"
                      >
                        <Printer className="w-4 h-4 text-emerald-400" />
                        <span>Imprimir Cupom</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleShareGlassTicketWhatsApp(ticket)}
                        className="min-h-[44px] px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 cursor-pointer touch-manipulation select-none"
                      >
                        <Share2 className="w-4 h-4" />
                        <span>WhatsApp</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CARGAS DESPACHADAS PARA O CAMINHÃO DO VICTOR */}
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="border-b border-white/10 pb-3">
              <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider block">
                Grandes Entregas para a Empresa de Vidros
              </span>
              <h3 className="text-lg font-black text-white flex items-center gap-2 mt-0.5">
                <Truck className="w-5 h-5 text-emerald-400" />
                Histórico de Cargas Despachadas ao Caminhão do Victor
              </h3>
            </div>

            {truckShipments.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs">
                Nenhuma grande carga despachada ainda. Ao juntar as toneladas, clique em "Despachar Carga ao Victor" para arquivar o lote e zerar o pátio para o próximo ciclo!
              </div>
            ) : (
              <div className="space-y-2.5">
                {truckShipments.map((ship) => (
                  <div
                    key={ship.id}
                    className="p-4 bg-slate-950 rounded-2xl border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-black text-white text-sm flex items-center gap-2">
                        <span>🚚 {ship.buyerName}</span>
                        <span className="text-[10px] text-slate-400 font-normal">{ship.timestamp}</span>
                      </div>
                      <div className="text-slate-400 mt-1">
                        Garrafas: <strong>{ship.totalBottles} unidades</strong> • Detalhes: {ship.summaryText}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-emerald-400 font-mono font-black text-base">
                        {ship.totalWeightTon.toFixed(2)} Toneladas ({ship.totalWeightKg.toFixed(0)} kg)
                      </div>
                      <div className="text-amber-400 font-mono font-bold">
                        Recebido: R$ {ship.grossRevenueReceived.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* HISTÓRICO DE RECIBOS DE PAGAMENTO AOS COLABORADORES */}
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="border-b border-white/10 pb-3">
              <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider block">
                Pagamentos Realizados
              </span>
              <h3 className="text-lg font-black text-white flex items-center gap-2 mt-0.5">
                <FileText className="w-5 h-5 text-amber-400" />
                Recibos de Acertos com Colaboradores (Bolsa Família / Caminhão)
              </h3>
            </div>

            {paymentHistory.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs">
                Nenhum pagamento registrado ainda. Quando fizer o acerto de um colaborador, o recibo aparecerá aqui com opção de mandar direto no WhatsApp!
              </div>
            ) : (
              <div className="space-y-2.5">
                {paymentHistory.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-4 bg-slate-950 rounded-2xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-black text-white text-sm flex items-center gap-2">
                        <span>🤝 {rec.collaboratorName}</span>
                        <span className="text-[10px] text-slate-400 font-normal">{rec.timestamp}</span>
                      </div>
                      <div className="text-slate-400 mt-0.5">
                        Forma: <strong className="text-amber-400">{rec.methodLabel}</strong>
                        {rec.notes && ` • Obs: ${rec.notes}`}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 justify-between sm:justify-end">
                      <div className="text-right">
                        <div className="text-emerald-400 font-mono font-black text-sm">
                          Pago: R$ {rec.amountPaid.toFixed(2)}
                        </div>
                        <span className="text-[10px] text-slate-500 block">
                          Resta: R$ {rec.remainingBalance.toFixed(2)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleShareReceiptWhatsApp(rec)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl transition-all flex items-center gap-1 cursor-pointer touch-manipulation"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CADASTRO E BALANÇA DE GARRAFAS, POTES & SIMILARES  */}
      {/* ========================================================= */}
      {editingBottle && (
        <div className="fixed inset-0 z-[70] bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-5 sm:p-6 max-w-xl w-full space-y-4 shadow-2xl text-left my-auto max-h-[92vh] overflow-y-auto">
            {/* Cabeçalho do Modal */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold">
                  <Scale className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    {isRegisteringNew ? "Cadastrar Garrafa ou Pote de Vidro" : "Editar Garrafa / Pote de Vidro"}
                  </h3>
                  <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
                    Balança Digital • 1 a 5 Códigos de Barras Aceitos
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingBottle(null);
                  setIsRegisteringNew(false);
                }}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-all cursor-pointer touch-manipulation select-none active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* SEÇÃO RÁPIDA: COPIAR DE GARRAFA OU POTE PARECIDO */}
            <div className="p-3 bg-slate-950 rounded-2xl border border-amber-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Cadastrar Parecido (Copiar Medidas e Pesos Prontos):
                </span>
                <span className="text-[9px] text-slate-400">1 toque preenche tudo!</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto pr-1">
                {SIMILAR_GLASS_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      setEditingBottle((prev) =>
                        prev
                          ? {
                              ...prev,
                              volumeMl: preset.volumeMl,
                              unitWeightGrams: preset.unitWeightGrams,
                              unitWeightKg: preset.unitWeightGrams / 1000,
                              category: preset.category as any,
                              emoji: preset.emoji,
                              buyPricePerUnit: preset.buyPricePerUnit,
                              quickPresets: preset.quickPresets,
                              name: prev.name ? prev.name : preset.name
                            }
                          : null
                      );
                      setEditingWeightGramsInput(String(preset.unitWeightGrams));
                      if (showNotification) {
                        showNotification(
                          `Medidas copiadas de "${preset.name}": ${preset.unitWeightGrams}g / ${preset.volumeMl}ml ⚖️`,
                          "info"
                        );
                      }
                    }}
                    className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/5 hover:border-amber-400/40 text-left transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-1.5 text-xs">
                      <span>{preset.emoji}</span>
                      <strong className="text-white text-[11px] truncate group-hover:text-amber-300">
                        {preset.name}
                      </strong>
                    </div>
                    <div className="text-[10px] text-emerald-400 font-mono mt-0.5">
                      {preset.unitWeightGrams}g • {preset.volumeMl}ml
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* FORMULÁRIO DE CADASTRO */}
            <div className="space-y-3.5 text-xs">
              {/* NOME DO ITEM E EMOJI */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-300 block">
                  Nome da Garrafa ou Pote: *
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editingBottle.name}
                    onChange={(e) => setEditingBottle((prev) => (prev ? { ...prev, name: e.target.value } : null))}
                    placeholder="Ex: Cachaça 51 900ml, Pote de Palmito 500g, Longneck Corona..."
                    className="flex-1 bg-slate-950 border border-white/10 focus:border-emerald-400 rounded-xl px-3 py-2 text-sm font-bold text-white outline-none"
                  />
                  {/* SELETOR DE EMOJI */}
                  <select
                    value={editingBottle.emoji}
                    onChange={(e) => setEditingBottle((prev) => (prev ? { ...prev, emoji: e.target.value } : null))}
                    className="bg-slate-950 border border-white/10 rounded-xl px-2.5 py-2 text-lg outline-none cursor-pointer text-white"
                  >
                    <option value="🍾">🍾 Garrafa 900ml/Vinho</option>
                    <option value="🍺">🍺 Longneck</option>
                    <option value="🍻">🍻 Cerveja 600ml</option>
                    <option value="🫙">🫙 Pote de Vidro</option>
                    <option value="🥃">🥃 Cachaça</option>
                    <option value="🍷">🍷 Vinho</option>
                    <option value="🍶">🍶 Aguardente</option>
                    <option value="🛍️">🛍️ Sacola de Cacos</option>
                    <option value="🪣">🪣 Balde de Cacos</option>
                  </select>
                </div>
              </div>

              {/* VOLUME EM ML E CATEGORIA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-300 block">
                    Volume em Mililitros (ML):
                  </label>
                  <input
                    type="number"
                    min="10"
                    step="5"
                    value={editingBottle.volumeMl}
                    onChange={(e) =>
                      setEditingBottle((prev) => (prev ? { ...prev, volumeMl: Number(e.target.value) || 0 } : null))
                    }
                    placeholder="Ex: 900, 330, 500..."
                    className="w-full bg-slate-950 border border-white/10 focus:border-emerald-400 rounded-xl px-3 py-2 text-sm font-mono font-bold text-white outline-none"
                  />
                  {/* ATALHOS RÁPIDOS DE ML */}
                  <div className="flex items-center gap-1 flex-wrap pt-1">
                    {[210, 275, 330, 355, 500, 600, 750, 900, 1000].map((ml) => (
                      <button
                        key={ml}
                        type="button"
                        onClick={() => setEditingBottle((prev) => (prev ? { ...prev, volumeMl: ml } : null))}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border cursor-pointer ${
                          editingBottle.volumeMl === ml
                            ? "bg-emerald-500 text-slate-950 border-emerald-400"
                            : "bg-slate-950 text-slate-400 border-white/5 hover:text-white"
                        }`}
                      >
                        {ml}ml
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-300 block">
                    Categoria do Vidro:
                  </label>
                  <select
                    value={editingBottle.category}
                    onChange={(e) =>
                      setEditingBottle((prev) => (prev ? { ...prev, category: e.target.value as any } : null))
                    }
                    className="w-full bg-slate-950 border border-white/10 focus:border-emerald-400 rounded-xl px-3 py-2 text-sm font-bold text-white outline-none"
                  >
                    <option value="900ml">🥃 Garrafa 900ml / 1L (Cachaças, Conhaques)</option>
                    <option value="longneck">🍺 Longneck (210ml a 355ml)</option>
                    <option value="cerveja600">🍻 Garrafa 600ml Tradicional (Vidro)</option>
                    <option value="litrao">🍾 Garrafão Litrão 1 Litro (Vidro)</option>
                    <option value="vinho">🍷 Garrafa de Vinho / Espumante (750ml)</option>
                    <option value="pote">🫙 Pote de Conserva (Palmito, Maionese, Azeitona)</option>
                    <option value="caco">🛍️ Cacos de Vidro Quebrados</option>
                    <option value="outro">📦 Outro Tipo de Vidro</option>
                  </select>
                </div>
              </div>

              {/* CAMPO DE PESO NA BALANÇA DIGITAL DE COZINHA (O CORAÇÃO DO CÁLCULO) */}
              <div className="p-4 bg-slate-950 rounded-2xl border-2 border-emerald-500/50 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase text-emerald-400 flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-emerald-400" />
                    Peso Vazio na Balança Digital (em GRAMAS): *
                  </label>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                    Visor da Balança
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={editingWeightGramsInput}
                      onChange={(e) => {
                        const clean = e.target.value.replace(/[^0-9.,]/g, "");
                        setEditingWeightGramsInput(clean);
                        const parsed = parseFloat(clean.replace(",", ".")) || 0;
                        setEditingBottle((prev) =>
                          prev
                            ? {
                                ...prev,
                                unitWeightGrams: parsed,
                                unitWeightKg: parsed / 1000
                              }
                            : null
                        );
                      }}
                      className="w-full bg-slate-900 border-2 border-emerald-500/60 focus:border-emerald-400 rounded-xl px-4 py-2 text-2xl font-mono font-black text-white outline-none"
                      placeholder="Ex: 182"
                    />
                    {editingWeightGramsInput && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingWeightGramsInput("");
                          setEditingBottle((prev) => (prev ? { ...prev, unitWeightGrams: 0, unitWeightKg: 0 } : null));
                        }}
                        className="absolute right-3 top-3 p-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg text-xs cursor-pointer"
                        title="Limpar campo para digitar"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-400 block uppercase">Equivalente em Kg:</span>
                    <strong className="text-lg font-mono text-emerald-400 font-black block">
                      {((parseFloat(String(editingWeightGramsInput).replace(",", ".")) || 0) / 1000).toFixed(3)} kg
                    </strong>
                  </div>
                </div>

                {/* Chips rápidos de referência da balança de cozinha */}
                <div className="pt-2 border-t border-white/5 space-y-1">
                  <span className="text-[9.5px] uppercase font-bold text-slate-400 block">
                    Ou clique no peso de referência na balança:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {[
                      { label: "182g (Heineken)", val: 182 },
                      { label: "150g (Império)", val: 150 },
                      { label: "170g (Ice)", val: 170 },
                      { label: "450g (600ml)", val: 450 },
                      { label: "490g (Dreher)", val: 490 },
                      { label: "500g (51)", val: 500 },
                      { label: "600g (Vinho)", val: 600 },
                      { label: "700g (Litrão)", val: 700 },
                      { label: "280g (Pote)", val: 280 }
                    ].map((chip) => (
                      <button
                        key={chip.val}
                        type="button"
                        onClick={() => {
                          setEditingWeightGramsInput(String(chip.val));
                          setEditingBottle((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  unitWeightGrams: chip.val,
                                  unitWeightKg: chip.val / 1000
                                }
                              : null
                          );
                        }}
                        className="px-2 py-0.5 bg-slate-900 hover:bg-emerald-600 hover:text-slate-950 text-slate-300 font-mono font-bold text-[10px] rounded-md border border-white/5 cursor-pointer touch-manipulation"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Régua de equivalência de peso */}
                {(() => {
                  const g = parseFloat(String(editingWeightGramsInput).replace(",", ".")) || 0;
                  return (
                    <div className="pt-2 border-t border-white/5 grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px] text-slate-400">
                      <div>
                        <span className="block text-slate-500">Para dar 1 kg:</span>
                        <strong className="text-white font-mono">
                          {g > 0 ? (1000 / g).toFixed(1) : 0} garrafas
                        </strong>
                      </div>
                      <div>
                        <span className="block text-slate-500">Para dar 1 Ton (1.000 kg):</span>
                        <strong className="text-white font-mono">
                          {g > 0 ? Math.ceil(1000000 / g).toLocaleString("pt-BR") : 0} garrafas
                        </strong>
                      </div>
                      <div className="col-span-2 sm:col-span-1 text-emerald-400 font-bold">
                        Valor no Victor: R$ {((g / 1000) * sellPricePerKg).toFixed(3)}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* 1 A 5 CÓDIGOS DE BARRAS ACEITOS PARA ESTE MESMO PESO/PREÇO */}
              <div className="p-3.5 bg-slate-950 rounded-2xl border border-emerald-500/35 space-y-2.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <label className="text-[10.5px] font-black uppercase text-emerald-400 flex items-center gap-1.5">
                    <Barcode className="w-4 h-4 text-emerald-400" />
                    <span>Códigos de Barras Aceitos (de 1 a 5 códigos neste item):</span>
                  </label>
                  <span className="text-[9.5px] text-slate-400 font-bold">
                    Ex: Heineken + Império + Stella juntas!
                  </span>
                </div>

                {/* Código 1 (Principal) */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-emerald-300 w-16 shrink-0">Cód. 1:</span>
                  <input
                    type="text"
                    value={editingBottle.barcode}
                    onChange={(e) =>
                      setEditingBottle((prev) => (prev ? { ...prev, barcode: e.target.value.trim() } : null))
                    }
                    placeholder="Principal (ex: 78936683)"
                    className="flex-1 min-h-[44px] bg-slate-900 border border-white/15 focus:border-emerald-400 rounded-xl px-3 py-2 text-sm font-mono font-bold text-white outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setCameraTargetField("primary");
                      setShowCameraModal(true);
                    }}
                    className="min-h-[44px] px-3 py-2 bg-slate-900 hover:bg-slate-800 active:scale-95 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer touch-manipulation select-none shrink-0"
                    title="Bipar com a câmera para este campo"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Bipar</span>
                  </button>
                </div>

                {/* Códigos Extras 2 a 5 */}
                {[0, 1, 2, 3].map((slotIdx) => (
                  <div key={slotIdx} className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-400 w-16 shrink-0">Cód. {slotIdx + 2}:</span>
                    <input
                      type="text"
                      value={editingBottle.additionalBarcodes?.[slotIdx] || ""}
                      onChange={(e) => {
                        const val = e.target.value.trim();
                        setEditingBottle((prev) => {
                          if (!prev) return null;
                          const nextArr = [
                            prev.additionalBarcodes?.[0] || "",
                            prev.additionalBarcodes?.[1] || "",
                            prev.additionalBarcodes?.[2] || "",
                            prev.additionalBarcodes?.[3] || ""
                          ];
                          nextArr[slotIdx] = val;
                          return { ...prev, additionalBarcodes: nextArr };
                        });
                      }}
                      placeholder={`Opcional ${slotIdx + 2} (ex: outra marca mesmo peso)`}
                      className="flex-1 min-h-[44px] bg-slate-900 border border-white/10 focus:border-emerald-400 rounded-xl px-3 py-2 text-xs sm:text-sm font-mono font-bold text-white outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setCameraTargetField(slotIdx);
                        setShowCameraModal(true);
                      }}
                      className="min-h-[44px] px-3 py-2 bg-slate-900 hover:bg-slate-800 active:scale-95 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer touch-manipulation select-none shrink-0"
                      title={`Bipar código ${slotIdx + 2} pela câmera`}
                    >
                      <Camera className="w-4 h-4" />
                      <span>Bipar</span>
                    </button>
                  </div>
                ))}
              </div>

              {/* CÁLCULO AUTOMÁTICO POR PESO NA BALANÇA */}
              <div className="p-3 bg-slate-950 rounded-2xl border border-white/10 space-y-2">
                {(() => {
                  const grams = parseFloat(String(editingWeightGramsInput).replace(",", ".")) || editingBottle.unitWeightGrams || 182;
                  const safeLot = getVictorSafeLotUnits(editingBottle.category, sellPricePerKg, grams);
                  const costUnit = calculateGlassBuyCost(editingBottle.category, 1, editingBottle.buyPricePerUnit, sellPricePerKg, grams);
                  const victorValue = (grams / 1000) * sellPricePerKg;
                  return (
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-black uppercase text-amber-400 block">
                          Compra no Portão (por peso):
                        </span>
                        <strong className="text-sm font-mono font-black text-white block">
                          R$ {costUnit.toFixed(4)} / un
                        </strong>
                        <span className="text-[10px] text-amber-300 font-mono block">
                          Lote R$ 0,50: {safeLot} garrafas
                        </span>
                      </div>
                      <div className="space-y-0.5 text-right">
                        <span className="text-[10px] font-black uppercase text-emerald-400 block">
                          Valor na Usina do Victor:
                        </span>
                        <strong className="text-sm font-mono font-black text-emerald-400 block">
                          R$ {victorValue.toFixed(4)} / un
                        </strong>
                        <span className="text-[10px] text-slate-400 block">
                          Cotação R$ {activeSellPricePerTon}/t (~38% lucro)
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* BOTÕES DE AÇÃO DO MODAL */}
            <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/10">
              <div>
                {!isRegisteringNew && (
                  <button
                    type="button"
                    onClick={() => handleDeleteBottle(editingBottle.id, editingBottle.name)}
                    className="min-h-[44px] px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 active:scale-95 text-rose-300 text-xs font-bold rounded-xl border border-rose-500/30 flex items-center gap-1.5 cursor-pointer transition-all touch-manipulation select-none"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Excluir</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingBottle(null);
                    setIsRegisteringNew(false);
                  }}
                  className="min-h-[44px] px-4 py-2 bg-slate-950 hover:bg-slate-800 active:scale-95 text-slate-300 text-xs font-bold rounded-xl border border-white/10 cursor-pointer touch-manipulation select-none"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveBottle}
                  className="min-h-[48px] px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer touch-manipulation select-none"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Salvar Garrafa / Pote ⚖️✅</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CALIBRAR PESO EM GRAMAS NA BALANÇA                 */}
      {/* ========================================================= */}
      {calibratingBottle && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl text-left">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-black text-white">
                  Pesar Garrafa na Balança de Cozinha
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCalibratingBottle(null)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 cursor-pointer touch-manipulation select-none active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-300">
              <p className="text-slate-200">
                Coloque <strong>1 garrafa vazia de amostra</strong> de{" "}
                <strong className="text-white">{calibratingBottle.name} ({calibratingBottle.volumeMl}ml)</strong>{" "}
                em cima da balança digital de cozinha e digite os gramas exatos que marcar no visor (ex: 182, 182.5, 490):
              </p>

              <div className="p-4 bg-slate-950 rounded-2xl border-2 border-emerald-500/50 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase text-emerald-400 flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-emerald-400" />
                    Visor da Balança Digital (Gramas):
                  </label>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                    Aceita vírgula ou ponto
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={calibratedGramsInput}
                      onChange={(e) => {
                        const clean = e.target.value.replace(/[^0-9.,]/g, "");
                        setCalibratedGramsInput(clean);
                      }}
                      className="w-full bg-slate-900 border-2 border-emerald-500/60 focus:border-emerald-400 rounded-2xl px-4 py-3 text-2xl font-mono font-black text-white outline-none"
                      placeholder="Ex: 182"
                      autoFocus
                    />
                    {calibratedGramsInput && (
                      <button
                        type="button"
                        onClick={() => setCalibratedGramsInput("")}
                        className="absolute right-3 top-3.5 p-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg text-xs cursor-pointer"
                        title="Limpar campo para digitar"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <span className="text-base font-black text-emerald-400 font-mono shrink-0">
                    gramas (g)
                  </span>
                </div>

                {/* Ajustes rápidos (+1g, -1g, +10g, -10g, +0.1g, -0.1g) */}
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <span className="text-[10px] text-slate-400 font-bold">Ajuste fino:</span>
                  {[
                    { label: "-10g", delta: -10 },
                    { label: "-1g", delta: -1 },
                    { label: "-0.1g", delta: -0.1 },
                    { label: "+0.1g", delta: 0.1 },
                    { label: "+1g", delta: 1 },
                    { label: "+10g", delta: 10 }
                  ].map((adj) => (
                    <button
                      key={adj.label}
                      type="button"
                      onClick={() => {
                        const cur = parseFloat(String(calibratedGramsInput).replace(",", ".")) || 0;
                        const next = Math.max(0.1, Number((cur + adj.delta).toFixed(1)));
                        setCalibratedGramsInput(String(next));
                      }}
                      className="min-h-[44px] min-w-[48px] px-2.5 py-1 bg-slate-900 hover:bg-slate-800 active:scale-95 text-slate-200 font-mono text-xs font-bold rounded-xl border border-white/10 cursor-pointer touch-manipulation select-none"
                    >
                      {adj.label}
                    </button>
                  ))}
                </div>

                {/* Resumo da conversão exata */}
                {(() => {
                  const g = Math.max(0, parseFloat(String(calibratedGramsInput).replace(",", ".")) || 0);
                  const kg = g / 1000;
                  return (
                    <div className="p-3 bg-slate-900 rounded-xl border border-white/5 space-y-1.5 text-xs font-mono">
                      <div className="flex items-center justify-between text-emerald-400 font-black">
                        <span>Equivalente em Kg:</span>
                        <span className="text-base font-bold">{kg.toFixed(4)} kg</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-300 text-[11px]">
                        <span>100 garrafas pesam:</span>
                        <span className="font-bold text-white">{(kg * 100).toFixed(2)} kg</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400 text-[11px]">
                        <span>Para fechar 1 kg na balança:</span>
                        <span className="text-amber-400 font-bold">{g > 0 ? (1000 / g).toFixed(1) : 0} garrafas</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400 text-[11px]">
                        <span>Para fechar 1 Tonelada (1.000 kg):</span>
                        <span className="text-cyan-300 font-bold">{g > 0 ? Math.ceil(1000000 / g).toLocaleString("pt-BR") : 0} garrafas</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400 text-[11px] pt-1 border-t border-white/5">
                        <span>Valor que o Victor paga por unidade (a R$ {sellPricePerKg.toFixed(2)}/kg):</span>
                        <strong className="text-emerald-400 font-bold">R$ {(kg * sellPricePerKg).toFixed(4)}</strong>
                      </div>
                    </div>
                  );
                })()}

                {/* Chips rápidos de balança */}
                <div className="pt-2 border-t border-white/5 space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Ou selecione um peso comum pré-medido:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: "182g (Heineken)", val: 182 },
                      { label: "150g (Império)", val: 150 },
                      { label: "170g (Ice)", val: 170 },
                      { label: "450g (600ml)", val: 450 },
                      { label: "490g (Dreher)", val: 490 },
                      { label: "500g (51)", val: 500 },
                      { label: "600g (Vinho)", val: 600 },
                      { label: "700g (Litrão)", val: 700 },
                      { label: "280g (Pote)", val: 280 }
                    ].map((chip) => (
                      <button
                        key={chip.val}
                        type="button"
                        onClick={() => setCalibratedGramsInput(String(chip.val))}
                        className={`px-2.5 py-1 text-slate-300 font-mono font-bold text-[11px] rounded-lg border border-white/5 cursor-pointer touch-manipulation transition-all ${
                          String(calibratedGramsInput).replace(",", ".") === String(chip.val)
                            ? "bg-emerald-500 text-slate-950 font-black shadow-sm"
                            : "bg-slate-900 hover:bg-emerald-600 hover:text-slate-950"
                        }`}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setCalibratingBottle(null)}
                className="min-h-[44px] px-4 py-2 bg-slate-950 hover:bg-slate-800 active:scale-95 text-slate-300 text-xs font-bold rounded-xl border border-white/10 cursor-pointer touch-manipulation select-none"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveCalibratedWeight}
                className="min-h-[48px] px-5 py-2 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black text-xs uppercase rounded-xl transition-all cursor-pointer touch-manipulation select-none"
              >
                Salvar Peso Exato ⚖️✅
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: FAZER ACERTO / PAGAR COLABORADOR                   */}
      {/* ========================================================= */}
      {payingCollab && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl text-left">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-black text-white">
                  Acerto de Pagamento: {payingCollab.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPayingCollab(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-950 rounded-2xl border border-white/10 flex justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Saldo Pendente:</span>
                  <strong className="text-lg font-mono text-rose-300 font-black">
                    R$ {payingCollab.balancePending.toFixed(2)}
                  </strong>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block uppercase">Total Acumulado:</span>
                  <span className="text-xs font-mono text-slate-300">
                    R$ {payingCollab.totalEarned.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-amber-400 block">
                  Valor a Pagar Agora (R$):
                </label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={payAmount}
                  onChange={(e) => setPayAmount(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full bg-slate-950 border border-white/10 focus:border-amber-400 rounded-xl px-3 py-2 text-xl font-mono font-black text-white outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 block">
                  Forma do Pagamento:
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: "bolsa_familia", label: "📅 Bolsa Família (Dia Único)" },
                    { id: "caminhao_victor", label: "🚚 Acerto Caminhão Victor" },
                    { id: "dinheiro", label: "💵 Dinheiro em Mãos" },
                    { id: "pix", label: "💳 Pix" }
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPayMethod(m.id as any)}
                      className={`p-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer text-left ${
                        payMethod === m.id
                          ? "bg-amber-400 text-slate-950 border-amber-300 font-black"
                          : "bg-slate-950 text-slate-300 border-white/5 hover:border-white/20"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 block">
                  Observações do Recibo:
                </label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="Ex: Acerto mensal do Bolsa Família, Adiantamento, etc."
                  className="w-full bg-slate-950 border border-white/10 focus:border-emerald-400 rounded-xl px-3 py-2 text-xs text-white outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setPayingCollab(null)}
                className="min-h-[44px] px-4 py-2 bg-slate-950 hover:bg-slate-800 active:scale-95 text-slate-300 text-xs font-bold rounded-xl border border-white/10 cursor-pointer touch-manipulation select-none"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteCollaboratorPayment}
                className="min-h-[48px] px-5 py-2 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black text-xs uppercase rounded-xl transition-all cursor-pointer touch-manipulation select-none"
              >
                Confirmar Pagamento 🤝💸
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CADASTRAR NOVO COLABORADOR                         */}
      {/* ========================================================= */}
      {showAddCollabModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl text-left">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-black text-white">Cadastrar Colaborador da Reciclagem</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCollabModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-emerald-400 block">
                  Nome do Colaborador:
                </label>
                <input
                  type="text"
                  value={newCollabName}
                  onChange={(e) => setNewCollabName(e.target.value)}
                  placeholder="Ex: João da Carroça, Seu Jorge, Maria..."
                  className="w-full bg-slate-950 border border-white/10 focus:border-emerald-400 rounded-xl px-3 py-2 text-sm text-white outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 block">
                  Telefone / WhatsApp (Opcional):
                </label>
                <input
                  type="text"
                  value={newCollabPhone}
                  onChange={(e) => setNewCollabPhone(e.target.value)}
                  placeholder="(DDD) 99999-9999"
                  className="w-full bg-slate-950 border border-white/10 focus:border-emerald-400 rounded-xl px-3 py-2 text-sm text-white outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 block">
                  Observações (Ex: Acerto no Bolsa Família ou semanal):
                </label>
                <input
                  type="text"
                  value={newCollabNotes}
                  onChange={(e) => setNewCollabNotes(e.target.value)}
                  placeholder="Ex: Paga todo dia 20 com o Bolsa Família"
                  className="w-full bg-slate-950 border border-white/10 focus:border-emerald-400 rounded-xl px-3 py-2 text-xs text-white outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowAddCollabModal(false)}
                className="min-h-[44px] px-4 py-2 bg-slate-950 hover:bg-slate-800 active:scale-95 text-slate-300 text-xs font-bold rounded-xl border border-white/10 cursor-pointer touch-manipulation select-none"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveNewCollaborator}
                className="min-h-[48px] px-5 py-2 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black text-xs uppercase rounded-xl transition-all cursor-pointer touch-manipulation select-none"
              >
                Salvar no Caderninho 👤✍️
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CONFIRMAR DESPACHO DE CARGA AO CAMINHÃO DO VICTOR  */}
      {/* ========================================================= */}
      {showTruckDispatchModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl text-left">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-black text-white">
                  Despachar Carga ao Caminhão do Victor
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTruckDispatchModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <p>
                Confira o resumo das garrafas que estão saindo do pátio para o caminhão da empresa de vidros:
              </p>

              <div className="p-4 bg-slate-950 rounded-2xl border border-white/10 space-y-2">
                <div className="flex justify-between">
                  <span>Total de Garrafas:</span>
                  <strong className="text-white font-mono">{yardTotals.totalUnits} un</strong>
                </div>
                <div className="flex justify-between">
                  <span>Peso Total da Carga:</span>
                  <strong className="text-emerald-400 font-mono text-base font-black">
                    {yardTotals.totalWeightTon.toFixed(2)} Toneladas ({yardTotals.totalWeightKg.toFixed(0)} kg)
                  </strong>
                </div>
                <div className="flex justify-between pt-1 border-t border-white/5">
                  <span className="text-amber-400 font-bold">Valor Total a Receber (R$ {sellPricePerKg.toFixed(2)}/kg):</span>
                  <strong className="text-amber-400 font-mono text-base font-black">
                    R$ {yardTotals.grossRevenueTon.toFixed(2)}
                  </strong>
                </div>
              </div>

              <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl text-amber-200 text-[11px]">
                ⚠️ <strong>Atenção:</strong> Ao confirmar o despacho, este lote será salvo no histórico e o estoque do pátio será <strong>zerado para recomeçar o próximo ciclo de toneladas</strong>!
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowTruckDispatchModal(false)}
                className="min-h-[44px] px-4 py-2 bg-slate-950 hover:bg-slate-800 active:scale-95 text-slate-300 text-xs font-bold rounded-xl border border-white/10 cursor-pointer touch-manipulation select-none"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDispatchTruckCargo}
                className="min-h-[48px] px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 active:scale-95 text-slate-950 font-black text-xs uppercase rounded-xl transition-all shadow-lg shadow-emerald-500/30 cursor-pointer touch-manipulation select-none"
              >
                Confirmar Despacho & Zerar Pátio 🚚🎉
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CONFIRMAR ZERAR TESTES                             */}
      {/* ========================================================= */}
      {showZeroConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/40 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl text-left">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Eraser className="w-5 h-5 text-rose-400" />
                <h3 className="text-base font-black text-white">Zerar Dados de Teste</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowZeroConfirmModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Deseja zerar TODOS os dados de testes (estoque no pátio, carrinho, saldos do caderninho, notinhas de teste e histórico de cargas)? Seus cadastros de garrafas, códigos de barras e nomes dos colaboradores serão preservados!
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowZeroConfirmModal(false)}
                className="min-h-[44px] px-4 py-2 bg-slate-950 hover:bg-slate-800 active:scale-95 text-slate-300 text-xs font-bold rounded-xl border border-white/10 cursor-pointer touch-manipulation select-none"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleResetAllToZeroReal}
                className="min-h-[48px] px-5 py-2 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-black text-xs uppercase rounded-xl transition-all shadow-md cursor-pointer touch-manipulation select-none"
              >
                Sim, Zerar Testes Agora 🧹
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CÂMERA DO LEITOR DE CÓDIGO DE BARRAS (z-[80])       */}
      {/* ========================================================= */}
      {showCameraModal && (
        <div className="fixed inset-0 z-[80] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-5 max-w-sm w-full space-y-3.5 shadow-2xl text-center">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <span className="text-xs font-black uppercase text-emerald-400 flex items-center gap-1.5">
                <Camera className="w-4 h-4" />
                {cameraTargetField === "search"
                  ? "Aponte para o Código de Barras"
                  : cameraTargetField === "primary"
                  ? "Bipar Código Principal (1)"
                  : `Bipar Código Extra (${Number(cameraTargetField) + 2})`}
              </span>
              <button
                type="button"
                onClick={() => {
                  setCameraTargetField("search");
                  setShowCameraModal(false);
                }}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 cursor-pointer touch-manipulation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div
              id="mobile-glass-scanner-viewport"
              className="w-full aspect-[4/3] bg-black rounded-2xl overflow-hidden relative border-2 border-emerald-500/40"
            />

            {cameraError && (
              <p className="text-[11px] text-amber-300 font-bold bg-amber-950/40 p-2 rounded-xl">
                {cameraError}
              </p>
            )}

            <button
              type="button"
              onClick={() => {
                setCameraTargetField("search");
                setShowCameraModal(false);
              }}
              className="w-full min-h-[48px] py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-black uppercase rounded-xl transition-all cursor-pointer touch-manipulation select-none"
            >
              Fechar Câmera
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CONFIRMAÇÃO RÁPIDA APÓS BIPAR CÓDIGO (PDV INVERTIDO) */}
      {/* ========================================================= */}
      {scannedPrompt && (
        <div className="fixed inset-0 z-[75] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border-2 border-emerald-500/60 rounded-3xl p-5 sm:p-6 max-w-md w-full space-y-4 shadow-2xl text-left">
            <div className="flex items-start justify-between border-b border-white/10 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider block">
                  IDENTIFICAÇÃO COMPLETA • MODO COMPRA
                </span>
                <h3 className="text-lg font-black text-white mt-0.5 flex items-center gap-2">
                  <span>{scannedPrompt.bottle.emoji}</span>
                  <span>{scannedPrompt.bottle.name}</span>
                </h3>
                <div className="text-xs text-slate-400 font-mono mt-1">
                  Cód. Lido: <strong className="text-emerald-300">{scannedPrompt.matchedCode}</strong> •{" "}
                  <span>{scannedPrompt.bottle.unitWeightGrams}g/un</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setScannedPrompt(null)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 cursor-pointer touch-manipulation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {(() => {
              const qty = Math.max(0, parseInt(scannedPromptQtyStr || "0", 10) || 0);
              const totalKg = (qty * scannedPrompt.bottle.unitWeightGrams) / 1000;
              const cost = calculateGlassBuyCost(
                scannedPrompt.bottle.category,
                qty,
                scannedPrompt.bottle.buyPricePerUnit,
                sellPricePerKg,
                scannedPrompt.bottle.unitWeightGrams
              );
              return (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-950 rounded-2xl border border-white/10 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-black uppercase text-amber-300">Quantidade a Lançar (un):</span>
                      <span className="font-mono text-emerald-400 font-black">
                        = {totalKg.toFixed(2)} kg • R$ {cost.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setScannedPromptQtyStr(String(Math.max(1, qty - 1)))}
                        className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-black text-xl border border-white/15 cursor-pointer touch-manipulation select-none"
                      >
                        -
                      </button>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoFocus
                        value={scannedPromptQtyStr}
                        onChange={(e) => setScannedPromptQtyStr(e.target.value.replace(/\D/g, ""))}
                        className="flex-1 min-h-[48px] bg-slate-900 border-2 border-emerald-500/60 focus:border-emerald-400 rounded-xl text-center text-2xl font-mono font-black text-white outline-none"
                        placeholder="Ex: 55"
                      />
                      <button
                        type="button"
                        onClick={() => setScannedPromptQtyStr(String(qty + 1))}
                        className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-black text-xl border border-white/15 cursor-pointer touch-manipulation select-none"
                      >
                        +
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {[1, 10, 30, 50, 55, 100].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setScannedPromptQtyStr(String(preset))}
                          className={`min-h-[44px] flex-1 min-w-[48px] rounded-xl font-mono font-black text-xs border cursor-pointer touch-manipulation select-none active:scale-95 ${
                            qty === preset
                              ? "bg-amber-400 text-slate-950 border-amber-300"
                              : "bg-slate-900 text-slate-200 border-white/10 hover:bg-slate-800"
                          }`}
                        >
                          {preset} un
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const finalQty = Math.max(1, qty);
                      handleAddBottleToCart(scannedPrompt.bottle, finalQty);
                      if (showNotification) {
                        const addKg = ((finalQty * scannedPrompt.bottle.unitWeightGrams) / 1000).toFixed(2);
                        showNotification(
                          `Adicionado: ${finalQty} un de ${scannedPrompt.bottle.name} (+${addKg} kg)! 🍾⚖️`,
                          "success"
                        );
                      }
                      setScannedPrompt(null);
                    }}
                    className="w-full min-h-[52px] px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-95 text-slate-950 font-black text-sm uppercase tracking-wider rounded-2xl shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 cursor-pointer touch-manipulation select-none"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    <span>ADICIONAR AO CARRINHO ({Math.max(1, qty)} UN) • R$ {cost.toFixed(2)}</span>
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: NOTINHA / COMPROVANTE TÉRMICO DE COMPRA NO PORTÃO  */}
      {/* ========================================================= */}
      {lastPurchaseReceipt && (
        <div className="fixed inset-0 z-[75] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border-2 border-emerald-500/50 rounded-3xl p-5 sm:p-6 max-w-md w-full space-y-4 shadow-2xl text-left my-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                <div>
                  <span className="text-[10px] font-black uppercase text-emerald-400 block">
                    Compra Registrada & Somada ao Pátio!
                  </span>
                  <h3 className="text-base font-black text-white">Notinha de Compra — D.W Vidros</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLastPurchaseReceipt(null)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 cursor-pointer touch-manipulation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-white text-slate-950 rounded-2xl font-mono text-xs space-y-2 shadow-inner">
              <div className="text-center border-b border-dashed border-slate-400 pb-2">
                <div className="font-black text-sm">D.W VIDROS & RECICLAGEM</div>
                <div className="text-[10px]">CNPJ: 67.965.725/0001-95</div>
                <div className="text-[10px] font-black mt-1">COMPROVANTE DE COMPRA (PORTÃO)</div>
              </div>
              <div className="text-[11px] space-y-0.5 border-b border-dashed border-slate-400 pb-2">
                <div><strong>DATA:</strong> {lastPurchaseReceipt.timestamp}</div>
                <div><strong>PARCEIRO:</strong> {lastPurchaseReceipt.collectorName}</div>
                <div>
                  <strong>STATUS:</strong>{" "}
                  {lastPurchaseReceipt.paymentStatus === "coleta_propria_dw"
                    ? "Coleta Própria D.W"
                    : lastPurchaseReceipt.paymentStatus === "pago_na_hora"
                    ? "Pago Agora no Portão"
                    : "Lançado no Caderninho do Colaborador"}
                </div>
                <div>
                  <strong>COTAÇÃO VICTOR:</strong>{" "}
                  R$ {lastPurchaseReceipt.sellPricePerTonUsed || activeSellPricePerTon}/t (R${" "}
                  {(((lastPurchaseReceipt.sellPricePerTonUsed || activeSellPricePerTon) / 1000)).toFixed(2).replace(".", ",")}/kg)
                </div>
              </div>
              <div className="space-y-1 border-b border-dashed border-slate-400 pb-2">
                {lastPurchaseReceipt.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between gap-2 text-[11px]">
                    <span>
                      <strong>{it.quantity}×</strong> {it.name} ({it.totalWeightKg.toFixed(2)} kg)
                    </span>
                    <span className="font-black shrink-0">R$ {it.costPaid.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between font-black">
                  <span>PESO SOMADO NO PÁTIO:</span>
                  <span className="text-emerald-700">+{lastPurchaseReceipt.totalWeightKg.toFixed(2)} kg</span>
                </div>
                {lastPurchaseReceipt.isFounder && (
                  <div className="flex justify-between text-[11px] font-bold text-slate-700">
                    <span>ECONOMIA D.W (VALOR EQUIV.):</span>
                    <span>R$ {lastPurchaseReceipt.items.reduce((s, it) => s + it.costPaid, 0).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-sm border-t border-slate-300 pt-1">
                  <span>{lastPurchaseReceipt.isFounder ? "TOTAL A PAGAR (PRÓPRIA):" : "TOTAL COMPRA:"}</span>
                  <span>
                    R$ {lastPurchaseReceipt.isFounder ? "0,00" : lastPurchaseReceipt.totalPaid.toFixed(2)}
                  </span>
                </div>
                <div className="text-center text-[10px] text-slate-600 pt-1">
                  Pátio Atual: {yardTotals.totalWeightKg.toFixed(1)} kg / {yardTotals.minTonTargetKg.toLocaleString("pt-BR")} kg
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handlePrintGlassTicket(lastPurchaseReceipt)}
                className="min-h-[48px] px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black text-xs uppercase rounded-xl flex items-center justify-center gap-2 cursor-pointer touch-manipulation select-none"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Bobina 58/80mm</span>
              </button>
              <button
                type="button"
                onClick={() => handleShareGlassTicketWhatsApp(lastPurchaseReceipt)}
                className="min-h-[48px] px-4 py-2.5 bg-slate-950 hover:bg-slate-800 active:scale-95 text-emerald-300 font-black text-xs uppercase rounded-xl border border-emerald-500/40 flex items-center justify-center gap-2 cursor-pointer touch-manipulation select-none"
              >
                <Share2 className="w-4 h-4" />
                <span>Enviar WhatsApp 💬</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setLastPurchaseReceipt(null)}
              className="w-full min-h-[48px] py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-black text-xs uppercase rounded-xl cursor-pointer touch-manipulation select-none"
            >
              ✔️ Fechar & Fazer Nova Compra
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ANÁLISE ESTRATÉGICA DOS 8 ITENS & VEREDITO DO VICTOR */}
      {/* ========================================================= */}
      {showStrategicGuideModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-slate-900 border border-amber-500/40 text-white w-full max-w-4xl rounded-3xl shadow-2xl p-4 sm:p-6 my-auto max-h-[92vh] overflow-y-auto space-y-5 text-left">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/20 shrink-0">
                  <Scale className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base sm:text-lg font-black text-white">
                      Análise Estratégica dos 8 Itens & Veredito do Victor
                    </h3>
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                      D.W VIDROS & RECICLAGEM
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Compra no Portão conforme o Peso (R$ 0,50 a R$ 1,50) vs Venda na Usina do Victor (R$ {sellPricePerKg.toFixed(2)}/kg)
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowStrategicGuideModal(false)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Grid dos 8 Itens com Cálculos Exatos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
              {/* 1. Garrafa 51 / Dreher */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🍾</span>
                    <div>
                      <h4 className="font-black text-white text-sm">1. Garrafa de 51 / Dreher</h4>
                      <span className="text-[10px] text-slate-400">Lote de 10 unidades ~ 5 kg</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    CORRETO ✅
                  </span>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-xl border border-white/5 space-y-1 text-[11px]">
                  <div className="flex justify-between text-slate-300">
                    <span>Você paga ao colaborador:</span>
                    <strong className="text-amber-400 font-mono">R$ 0,50</strong>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Você recebe do Victor (5 kg × R$ 0,15):</span>
                    <strong className="text-emerald-400 font-mono">R$ 0,75</strong>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-white/5 font-black text-emerald-300">
                    <span>Seu Lucro Líquido:</span>
                    <span>+R$ 0,25 por lote (33% margem)</span>
                  </div>
                </div>
                <p className="text-[10.5px] text-slate-400">
                  💡 <strong>Veredito:</strong> Bom lucro e ótimo peso para bater toneladas rápidas.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const b = catalog.find((c) => c.category === "900ml") || catalog[0];
                    if (b) handleAddBottleToCart(b, 10);
                    setShowStrategicGuideModal(false);
                  }}
                  className="w-full py-1.5 bg-slate-900 hover:bg-emerald-600 hover:text-slate-950 text-white font-bold text-[10px] rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Lançar 1 Lote (10 un / R$ 0,50) no Carrinho</span>
                </button>
              </div>

              {/* 2. Longneck */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🍺</span>
                    <div>
                      <h4 className="font-black text-white text-sm">2. Longneck (Heineken / Corona)</h4>
                      <span className="text-[10px] text-slate-400">Lote de 30 unidades ~ 5.5 kg</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    CORRETO ✅
                  </span>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-xl border border-white/5 space-y-1 text-[11px]">
                  <div className="flex justify-between text-slate-300">
                    <span>Você paga ao colaborador:</span>
                    <strong className="text-amber-400 font-mono">R$ 0,50</strong>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Você recebe do Victor (5.5 kg × R$ 0,15):</span>
                    <strong className="text-emerald-400 font-mono">R$ 0,82</strong>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-white/5 font-black text-emerald-300">
                    <span>Seu Lucro Líquido:</span>
                    <span>+R$ 0,32 por lote (39% margem)</span>
                  </div>
                </div>
                <p className="text-[10.5px] text-slate-400">
                  💡 <strong>Veredito:</strong> Dá um bom retorno proporcional. 60 garrafas = R$ 1,00.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const b = catalog.find((c) => c.category === "longneck") || catalog[0];
                    if (b) handleAddBottleToCart(b, 30);
                    setShowStrategicGuideModal(false);
                  }}
                  className="w-full py-1.5 bg-slate-900 hover:bg-emerald-600 hover:text-slate-950 text-white font-bold text-[10px] rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Lançar 1 Lote (30 un / R$ 0,50) no Carrinho</span>
                </button>
              </div>

              {/* 3. Cerveja 600ml Tradicional (Preço Normal por Peso) */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🍻</span>
                    <div>
                      <h4 className="font-black text-white text-sm">3. Cerveja 600ml Tradicional (450g)</h4>
                      <span className="text-[10px] text-slate-400">
                        Lote de {getVictorSafeLotUnits("cerveja600", sellPricePerKg, 450)} un ~ {((getVictorSafeLotUnits("cerveja600", sellPricePerKg, 450) * 450) / 1000).toFixed(1)} kg
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    POR PESO ✅
                  </span>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-xl border border-white/5 space-y-1 text-[11px]">
                  <div className="flex justify-between text-slate-300">
                    <span>Você paga ao colaborador:</span>
                    <strong className="text-amber-400 font-mono">R$ 0,50 (lote)</strong>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Você recebe do Victor (por kg):</span>
                    <strong className="text-emerald-400 font-mono">
                      R$ {(((getVictorSafeLotUnits("cerveja600", sellPricePerKg, 450) * 450) / 1000) * sellPricePerKg).toFixed(2)}
                    </strong>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-white/5 font-black text-emerald-300">
                    <span>Seu Lucro Líquido:</span>
                    <span>~38% protegido conforme o peso</span>
                  </div>
                </div>
                <p className="text-[10.5px] text-slate-400">
                  💡 <strong>Veredito:</strong> Calculada normalmente pelo peso (450g) igual qualquer garrafa de vidro.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const b = catalog.find((c) => c.category === "cerveja600") || catalog[0];
                    const lot = getVictorSafeLotUnits("cerveja600", sellPricePerKg, b?.unitWeightGrams || 450);
                    if (b) handleAddBottleToCart(b, lot);
                    setShowStrategicGuideModal(false);
                  }}
                  className="w-full py-1.5 bg-slate-900 hover:bg-emerald-600 hover:text-slate-950 text-white font-bold text-[10px] rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Lançar 1 Lote ({getVictorSafeLotUnits("cerveja600", sellPricePerKg, 450)} un / R$ 0,50) no Carrinho</span>
                </button>
              </div>

              {/* 4. Garrafão Litrão 1 Litro (Preço Normal por Peso) */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🍾</span>
                    <div>
                      <h4 className="font-black text-white text-sm">4. Garrafão Litrão 1 Litro (700g)</h4>
                      <span className="text-[10px] text-slate-400">
                        Lote de {getVictorSafeLotUnits("litrao", sellPricePerKg, 700)} un ~ {((getVictorSafeLotUnits("litrao", sellPricePerKg, 700) * 700) / 1000).toFixed(1)} kg
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    POR PESO ✅
                  </span>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-xl border border-white/5 space-y-1 text-[11px]">
                  <div className="flex justify-between text-slate-300">
                    <span>Você paga ao colaborador:</span>
                    <strong className="text-amber-400 font-mono">R$ 0,50 (lote)</strong>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Você recebe do Victor (por kg):</span>
                    <strong className="text-emerald-400 font-mono">
                      R$ {(((getVictorSafeLotUnits("litrao", sellPricePerKg, 700) * 700) / 1000) * sellPricePerKg).toFixed(2)}
                    </strong>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-white/5 font-black text-emerald-300">
                    <span>Seu Lucro Líquido:</span>
                    <span>~38% protegido conforme o peso</span>
                  </div>
                </div>
                <p className="text-[10.5px] text-slate-400">
                  💡 <strong>Veredito:</strong> Garrafa pesada (700g), paga proporcionalmente mais por unidade e bate a meta rápido!
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const b = catalog.find((c) => c.category === "litrao") || catalog[0];
                    const lot = getVictorSafeLotUnits("litrao", sellPricePerKg, b?.unitWeightGrams || 700);
                    if (b) handleAddBottleToCart(b, lot);
                    setShowStrategicGuideModal(false);
                  }}
                  className="w-full py-1.5 bg-slate-900 hover:bg-emerald-600 hover:text-slate-950 text-white font-bold text-[10px] rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Lançar 1 Lote ({getVictorSafeLotUnits("litrao", sellPricePerKg, 700)} un / R$ 0,50) no Carrinho</span>
                </button>
              </div>

              {/* 5. Vinhos / Espumantes */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🍷</span>
                    <div>
                      <h4 className="font-black text-white text-sm">5. Garrafas de Vinho / Espumante</h4>
                      <span className="text-[10px] text-slate-400">Lote de 9 unidades ~ 5.4 kg</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    CORRETO ✅
                  </span>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-xl border border-white/5 space-y-1 text-[11px]">
                  <div className="flex justify-between text-slate-300">
                    <span>Você paga ao colaborador:</span>
                    <strong className="text-amber-400 font-mono">R$ 0,50</strong>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Você recebe do Victor (5.4 kg × R$ 0,15):</span>
                    <strong className="text-emerald-400 font-mono">R$ 0,81</strong>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-white/5 font-black text-emerald-300">
                    <span>Seu Lucro Líquido:</span>
                    <span>+R$ 0,31 por lote (38% margem)</span>
                  </div>
                </div>
                <p className="text-[10.5px] text-slate-400">
                  💡 <strong>Veredito:</strong> Vidro pesado, boa margem e agrega bastante peso à carga.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const b = catalog.find((c) => c.category === "vinho") || catalog[0];
                    if (b) handleAddBottleToCart(b, 9);
                    setShowStrategicGuideModal(false);
                  }}
                  className="w-full py-1.5 bg-slate-900 hover:bg-emerald-600 hover:text-slate-950 text-white font-bold text-[10px] rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Lançar 1 Lote (9 un / R$ 0,50) no Carrinho</span>
                </button>
              </div>

              {/* 6. Potes de Conserva */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🫙</span>
                    <div>
                      <h4 className="font-black text-white text-sm">6. Potes de Conserva</h4>
                      <span className="text-[10px] text-slate-400">Lote de 18 unidades ~ 5.0 kg</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    CORRETO ✅
                  </span>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-xl border border-white/5 space-y-1 text-[11px]">
                  <div className="flex justify-between text-slate-300">
                    <span>Você paga ao colaborador:</span>
                    <strong className="text-amber-400 font-mono">R$ 0,50</strong>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Você recebe do Victor (5.0 kg × R$ 0,15):</span>
                    <strong className="text-emerald-400 font-mono">R$ 0,75</strong>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-white/5 font-black text-emerald-300">
                    <span>Seu Lucro Líquido:</span>
                    <span>+R$ 0,25 por lote (33% margem)</span>
                  </div>
                </div>
                <p className="text-[10.5px] text-slate-400">
                  💡 <strong>Veredito:</strong> Margem segura. Potes de palmito e azeitona têm ótimo giro.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const b = catalog.find((c) => c.category === "pote") || catalog[0];
                    if (b) handleAddBottleToCart(b, 18);
                    setShowStrategicGuideModal(false);
                  }}
                  className="w-full py-1.5 bg-slate-900 hover:bg-emerald-600 hover:text-slate-950 text-white font-bold text-[10px] rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Lançar 1 Lote (18 un / R$ 0,50) no Carrinho</span>
                </button>
              </div>

              {/* 7. Cacos na Sacola Reforçada */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🛍️</span>
                    <div>
                      <h4 className="font-black text-white text-sm">7. Cacos de Vidro na Sacola Reforçada</h4>
                      <span className="text-[10px] text-slate-400">1 sacola cheia ~ 5.0 kg</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    CORRETO ✅
                  </span>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-xl border border-white/5 space-y-1 text-[11px]">
                  <div className="flex justify-between text-slate-300">
                    <span>Você paga ao colaborador:</span>
                    <strong className="text-amber-400 font-mono">R$ 0,50</strong>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Você recebe do Victor (5.0 kg × R$ 0,15):</span>
                    <strong className="text-emerald-400 font-mono">R$ 0,75</strong>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-white/5 font-black text-emerald-300">
                    <span>Seu Lucro Líquido:</span>
                    <span>+R$ 0,25 por sacola (33% margem)</span>
                  </div>
                </div>
                <p className="text-[10.5px] text-slate-400">
                  💡 <strong>Veredito:</strong> Rápido e prático, não perde tempo contando garrafa a garrafa.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const b = catalog.find((c) => c.category === "caco" && c.unitWeightKg <= 6) || catalog[0];
                    if (b) handleAddBottleToCart(b, 1);
                    setShowStrategicGuideModal(false);
                  }}
                  className="w-full py-1.5 bg-slate-900 hover:bg-emerald-600 hover:text-slate-950 text-white font-bold text-[10px] rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Lançar 1 Sacola (5 kg / R$ 0,50) no Carrinho</span>
                </button>
              </div>

              {/* 8. Cacos no Balde de 20L */}
              <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🪣</span>
                    <div>
                      <h4 className="font-black text-white text-sm">8. Cacos no Balde de 20L de Obra</h4>
                      <span className="text-[10px] text-slate-400">1 balde cheio ~ 16.0 kg</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    EXCELENTE 🏆
                  </span>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-xl border border-white/5 space-y-1 text-[11px]">
                  <div className="flex justify-between text-slate-300">
                    <span>Você paga ao colaborador:</span>
                    <strong className="text-amber-400 font-mono">R$ 1,50 (3 moedas de R$ 0,50)</strong>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Você recebe do Victor (16.0 kg × R$ 0,15):</span>
                    <strong className="text-emerald-400 font-mono">R$ 2,40</strong>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-white/5 font-black text-emerald-300">
                    <span>Seu Lucro Líquido:</span>
                    <span>+R$ 0,90 por balde (38% margem)</span>
                  </div>
                </div>
                <p className="text-[10.5px] text-emerald-400 font-bold">
                  🏆 <strong>Veredito:</strong> EXCELENTE. É a melhor opção de margem e acúmulo de peso de toda a tabela!
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const b = catalog.find((c) => c.category === "caco" && c.unitWeightKg > 10) || catalog[0];
                    if (b) handleAddBottleToCart(b, 1);
                    setShowStrategicGuideModal(false);
                  }}
                  className="w-full py-1.5 bg-slate-900 hover:bg-emerald-600 hover:text-slate-950 text-white font-bold text-[10px] rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Lançar 1 Balde (16 kg / R$ 1,50) no Carrinho</span>
                </button>
              </div>
            </div>

            {/* Resumo Estratégico do Veredito no Rodapé */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-950 to-emerald-950/40 border border-amber-500/40 space-y-2">
              <span className="text-[11px] font-black uppercase text-amber-300 tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                💡 Resumo do Veredito da D.W VIDROS:
              </span>
              <ul className="text-xs text-slate-200 space-y-1.5 list-disc list-inside">
                <li>
                  <strong className="text-emerald-300">Todas as Garrafas (600ml, Litrão, Longnecks, Potes, Vinhos, 51 / Dreher e Cacos):</strong> Os cálculos são feitos automaticamente conforme o peso real da garrafa na balança e a cotação ativa do Victor, garantindo ~38% de lucro com zero risco!
                </li>
              </ul>
            </div>

            {/* Footer */}
            <div className="pt-2 flex items-center justify-between border-t border-white/10 flex-wrap gap-2">
              <span className="text-[10px] text-slate-400">
                Base Victor: R$ 150,00/tonelada (R$ 0,15 por kg de caco de vidro)
              </span>
              <button
                type="button"
                onClick={() => setShowStrategicGuideModal(false)}
                className="min-h-[44px] px-5 py-2.5 bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 font-black text-xs uppercase rounded-xl transition-all cursor-pointer touch-manipulation select-none shadow-md"
              >
                Entendido, Fechar Guia 👍
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL INSTANTÂNEO: CARRINHO DE PAGAMENTO & SOMAR PÁTIO   */}
      {/* ========================================================= */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-[72] bg-slate-950/90 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border-t-2 sm:border-2 border-emerald-500/60 rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 max-w-xl w-full space-y-4 shadow-2xl text-left max-h-[92vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider block">
                  Conferência, Pagamento &amp; Contagem no Pátio
                </span>
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-emerald-400" />
                  <span>Fechar Compra ({cartTotals.totalBottles} un • {cartTotals.totalWeightKg.toFixed(2)} kg)</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCheckoutModal(false)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 cursor-pointer touch-manipulation select-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Seleção Rápida de Quem Trouxe (D.W Própria vs Colaborador) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-black uppercase text-amber-400">
                  Quem trouxe as garrafas?
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddCollabModal(true)}
                  className="text-[10px] font-black text-emerald-400 hover:text-emerald-300 underline cursor-pointer touch-manipulation py-1 px-2"
                >
                  + Novo Colaborador
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {collaborators.map((collab) => {
                  const isSel = selectedCollabId === collab.id;
                  return (
                    <button
                      key={collab.id}
                      type="button"
                      onClick={() => setSelectedCollabId(collab.id)}
                      className={`min-h-[42px] px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer touch-manipulation select-none active:scale-95 flex items-center gap-1.5 ${
                        isSel
                          ? collab.isFounder
                            ? "bg-amber-400 text-slate-950 border-amber-300 font-black"
                            : "bg-emerald-500 text-slate-950 border-emerald-400 font-black"
                          : "bg-slate-950 text-slate-300 border-white/10 hover:border-white/25"
                      }`}
                    >
                      {collab.isFounder ? <Crown className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                      <span className="truncate max-w-[180px]">{collab.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Itens no Carrinho com Ajuste Rápido */}
            {cart.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs bg-slate-950 rounded-2xl border border-white/10">
                O carrinho está vazio. Adicione garrafas para fechar a compra.
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-950 rounded-2xl border border-white/10 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-black text-white truncate">
                        {item.emoji} {item.name}
                      </div>
                      <div className="text-[11px] text-emerald-400 font-mono font-bold mt-0.5">
                        {item.totalWeightKg.toFixed(2)} kg • R$ {item.totalBuyCost.toFixed(2)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleUpdateCartQuantity(item.id, item.quantity - 1)}
                        className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl bg-slate-900 text-white font-black text-base border border-white/10 cursor-pointer touch-manipulation active:scale-95"
                      >
                        -
                      </button>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={item.quantity === 0 ? "" : item.quantity}
                        onChange={(e) => {
                          const cleaned = e.target.value.replace(/\D/g, "");
                          handleUpdateCartQuantity(item.id, cleaned === "" ? 0 : parseInt(cleaned, 10));
                        }}
                        className="w-14 min-h-[40px] bg-slate-900 border border-emerald-500/40 rounded-xl text-center text-white font-mono font-black text-sm outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdateCartQuantity(item.id, item.quantity + 1)}
                        className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl bg-slate-900 text-white font-black text-base border border-white/10 cursor-pointer touch-manipulation active:scale-95"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveCartItem(item.id)}
                        className="min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-500 hover:text-rose-400 cursor-pointer touch-manipulation"
                        title="Remover item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Prévia do Pátio + Totais */}
            <div className="p-3.5 bg-slate-950 rounded-2xl border-2 border-emerald-500/35 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Pátio Atual ➔ Após Lançar:</span>
                <span className="font-mono font-black text-emerald-300">
                  {yardTotals.totalWeightKg.toFixed(1)} kg + {cartTotals.totalWeightKg.toFixed(2)} kg ={" "}
                  <strong className="text-white text-sm">
                    {(yardTotals.totalWeightKg + cartTotals.totalWeightKg).toFixed(1)} kg
                  </strong>
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-white/10 pt-2">
                <span className="text-amber-300 font-black uppercase text-[11px]">
                  {activeCollab.isFounder ? "Economia D.W (Coleta Própria):" : `Total a Pagar (${activeCollab.name}):`}
                </span>
                <strong className="text-xl font-mono font-black text-amber-400">
                  R$ {cartTotals.totalBuyCost.toFixed(2)}
                </strong>
              </div>
            </div>

            {/* Botões Grandes de Finalizar (Contabiliza no Pátio + Gera Notinha) */}
            {cart.length > 0 && (
              <div className="space-y-2.5 pt-1">
                {activeCollab.isFounder ? (
                  <button
                    type="button"
                    onClick={() => handleFinalizeTicket("coleta_propria_dw" as any)}
                    className="w-full min-h-[54px] px-5 py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 active:scale-95 text-slate-950 font-black text-sm uppercase tracking-wider rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-400/30 touch-manipulation select-none"
                  >
                    <Crown className="w-5 h-5 shrink-0" />
                    <span>CONFIRMAR &amp; SOMAR +{cartTotals.totalWeightKg.toFixed(2)} KG NO PÁTIO 👑</span>
                  </button>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleFinalizeTicket("pago_na_hora")}
                      className="min-h-[54px] px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-95 text-slate-950 font-black text-xs uppercase rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/30 touch-manipulation select-none"
                    >
                      <Check className="w-5 h-5 shrink-0" />
                      <div className="text-left leading-tight">
                        <span className="block font-black">💵 Pagar Agora (R$ {cartTotals.totalBuyCost.toFixed(2)})</span>
                        <span className="block text-[10px] font-bold text-slate-900">Pago no portão + Soma no Pátio</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleFinalizeTicket("pendente_caderninho")}
                      className="min-h-[54px] px-4 py-3 bg-slate-950 hover:bg-slate-800 active:scale-95 text-amber-300 font-black text-xs uppercase rounded-2xl border-2 border-amber-500/50 transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation select-none"
                    >
                      <Calendar className="w-5 h-5 text-amber-400 shrink-0" />
                      <div className="text-left leading-tight">
                        <span className="block font-black">📓 Lançar no Caderninho</span>
                        <span className="block text-[10px] font-normal text-amber-200/80">Pagar depois + Soma no Pátio</span>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowCheckoutModal(false)}
              className="w-full min-h-[44px] py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-bold text-xs uppercase rounded-xl cursor-pointer touch-manipulation select-none"
            >
              Continuar Adicionando Outras Garrafas
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* BARRA FIXA INFERIOR DO CARRINHO DE COMPRA (IGUAL AO PDV)   */}
      {/* ========================================================= */}
      {cart.length > 0 &&
        !showCheckoutModal &&
        !lastPurchaseReceipt &&
        !scannedPrompt &&
        !editingBottle &&
        !calibratingBottle &&
        !showCameraModal &&
        !showTruckDispatchModal &&
        !showZeroConfirmModal &&
        !showAddCollabModal &&
        !payingCollab && (
          <div className="fixed bottom-0 left-0 right-0 z-[65] bg-slate-900/95 backdrop-blur-md border-t-2 border-emerald-500/60 shadow-[0_-10px_35px_rgba(0,0,0,0.75)] py-3 px-3 sm:px-6 text-left">
            <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
              <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2.5 bg-emerald-500/15 text-emerald-400 rounded-xl relative shrink-0 border border-emerald-500/30">
                    <ShoppingCart className="w-5 h-5" />
                    <span className="absolute -top-2 -right-2 min-w-[22px] h-[22px] px-1 bg-emerald-500 text-slate-950 text-[10px] font-black rounded-full flex items-center justify-center border-2 border-slate-900 shadow">
                      {cartTotals.totalBottles}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-black uppercase text-white flex items-center gap-1.5 flex-wrap">
                      <span>Carrinho de Vidros</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                        +{cartTotals.totalWeightKg.toFixed(2)} kg pro Pátio
                      </span>
                    </div>
                    <p className="text-[10.5px] text-slate-300 truncate max-w-[240px] sm:max-w-[340px]">
                      {activeCollab.isFounder ? "👑 Coleta Própria D.W" : `👤 ${activeCollab.name}`} •{" "}
                      {cart.map((c) => `${c.quantity}× ${c.name}`).join(", ")}
                    </p>
                  </div>
                </div>

                <div className="text-right sm:hidden shrink-0">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Total</span>
                  <strong className="text-base font-mono font-black text-amber-400">
                    R$ {cartTotals.totalBuyCost.toFixed(2)}
                  </strong>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
                <div className="hidden sm:block text-right mr-2">
                  <span className="text-[9px] uppercase font-black text-slate-400 block">
                    {activeCollab.isFounder ? "Economia" : "Total Pagar"}
                  </span>
                  <strong className="text-lg font-mono font-black text-amber-400 leading-none">
                    R$ {cartTotals.totalBuyCost.toFixed(2)}
                  </strong>
                </div>

                <button
                  type="button"
                  onClick={() => setCart([])}
                  className="min-h-[46px] px-3 py-2 bg-slate-950 hover:bg-rose-950/60 active:scale-95 text-rose-300 text-xs font-black uppercase rounded-xl border border-rose-500/30 cursor-pointer touch-manipulation select-none"
                >
                  Limpar
                </button>

                <button
                  type="button"
                  onClick={() => setShowCheckoutModal(true)}
                  className="flex-1 sm:flex-initial min-h-[48px] px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-95 text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 cursor-pointer touch-manipulation select-none"
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Pagar &amp; Somar no Pátio ➔</span>
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
