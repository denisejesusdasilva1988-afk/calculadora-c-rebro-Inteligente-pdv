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
  Package,
  Cloud,
  Link2,
  RotateCcw,
  Usb,
  BookOpen,
  Folder,
  FolderOpen,
  Scissors,
  TrendingUp
} from "lucide-react";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { SmartNumericInput } from "./SmartNumericInput";
import { PlasticRecyclingGuidePanel } from "./PlasticRecyclingGuidePanel";
import {
  getIsFirestoreQuotaPaused,
  isQuotaExhaustedError,
  markFirestoreQuotaPaused
} from "../../utils/firestoreQuotaManager";
import {
  loadPrinterConfig,
  savePrinterConfig,
  buildMiniPrintPocketConfig,
  executeThermalPrint,
  PrinterConfig,
  ThermalCanvasReceiptPayload,
  buildThermalDocumentHtmlFromPayload,
  generateMiniPrint57mmPngBlob,
  shareOrDownloadReceiptPng
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

export type ScrapCategoryGroup = "plasticos" | "metais" | "eletronicos" | "papeis" | "outros";

export interface OtherScrapMaterial {
  id: string;
  name: string;
  emoji: string;
  categoryGroup?: ScrapCategoryGroup;
  stockKg: number;
  stockUnits?: number;
  trackUnits?: boolean;
  buyPricePerKg: number; // 0 = Sem preço de compra definido ainda
  sellPricePerKg?: number; // 0 = Sem preço de revenda definido ainda
  notes?: string;
  isCustom?: boolean;
}

export interface ScrapSaleRecord {
  id: string;
  timestamp: string;
  materialId: string;
  materialName: string;
  emoji: string;
  weightKg: number;
  units: number;
  buyPricePerKgAtSale: number;
  estimatedBuyCost: number;
  sellPricePerKgActual: number;
  revenueReceived: number;
  profitAmount: number;
  buyerName: string;
  paymentMethod: "dinheiro" | "pix" | "cartao_debito" | "cartao_credito";
  syncedPdvEventId?: string;
  isCancelled?: boolean;
  cancelledAt?: string;
  cancelReason?: string;
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
  syncedPdvEventId?: string;
  isCancelled?: boolean;
  cancelledAt?: string;
  cancelReason?: string;
}

export interface CompletedPurchaseTicket {
  id: string;
  timestamp: string;
  collectorName: string;
  collaboratorId?: string;
  isFounder: boolean; // Se foi coleta própria de Denise e Wellington
  isScrapPurchase?: boolean; // Compra de Ferro Velho / Balança Digital (PET, Plástico Duro, Latinha, etc.)
  syncedPdvEventId?: string;
  isCancelled?: boolean;
  cancelledAt?: string;
  cancelReason?: string;
  items: {
    name: string;
    volumeMl: number;
    barcode: string;
    quantity: number;
    unitWeightGrams: number;
    totalWeightKg: number;
    costPaid: number;
    materialId?: string;
    addedToStock?: boolean;
    stockUnitsAdded?: number;
  }[];
  totalBottles: number;
  totalWeightKg: number;
  subtotalAmount?: number;
  bonusAmount?: number;
  bonusReason?: string;
  discountAmount?: number;
  discountReason?: string;
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
    barcode: "7896002100014",
    additionalBarcodes: ["7891154010001"],
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
    additionalBarcodes: ["7896010000108"],
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
    additionalBarcodes: ["7891991010856", "8712000025649", "7896045506101"],
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
    additionalBarcodes: [],
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
    additionalBarcodes: [],
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
    additionalBarcodes: ["7891149100101"],
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
    additionalBarcodes: [],
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
    barcode: "7891050000107",
    additionalBarcodes: [],
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
    barcode: "7891000053508",
    additionalBarcodes: [],
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

// Materiais iniciais de outros ferro velhos (100% separados do pátio de vidros e sem preços definidos inicialmente!)
const INITIAL_OTHER_SCRAP_MATERIALS: OtherScrapMaterial[] = [
  { id: "scrap_pet", name: "PET (Garrafas PET)", emoji: "🧴", categoryGroup: "plasticos", stockKg: 0, stockUnits: 0, buyPricePerKg: 0, notes: "PET cristal, verde, óleo ou bandeja limpa" },
  { id: "scrap_plastico_duro", name: "Plásticos Duros (PEAD / PP)", emoji: "🪣", categoryGroup: "plasticos", stockKg: 0, stockUnits: 0, buyPricePerKg: 0, notes: "Baldes, bacias, potes de doce/margarina, galões e tampas" },
  { id: "scrap_alto_impacto", name: "Plásticos Alto Impacto (PS / PSAI)", emoji: "🥛", categoryGroup: "plasticos", stockKg: 0, stockUnits: 0, buyPricePerKg: 0, notes: "Potinho de iogurte/Danone, copo descartável, forro de geladeira (racha ao dobrar)" },
  { id: "scrap_latinhas", name: "Latinhas de Alumínio", emoji: "🥤", categoryGroup: "metais", stockKg: 0, stockUnits: 0, buyPricePerKg: 0, notes: "Latinhas de cerveja e refrigerante" },
  { id: "scrap_aluminio", name: "Alumínio Grosso / Panelas / Perfil", emoji: "🍳", categoryGroup: "metais", stockKg: 0, stockUnits: 0, buyPricePerKg: 0, notes: "Panelas, chapas, perfis e peças de alumínio" },
  { id: "scrap_ferro", name: "Ferro & Sucata Pesada", emoji: "🔩", categoryGroup: "metais", stockKg: 0, stockUnits: 0, buyPricePerKg: 0, notes: "Ferro batido, chaparia e ferragens" },
  { id: "scrap_cobre", name: "Cobre (Mel / Misto / Fios)", emoji: "🪙", categoryGroup: "metais", stockKg: 0, stockUnits: 0, buyPricePerKg: 0, notes: "Fio descascado, encapado ou tubulação" },
  { id: "scrap_eletronicos", name: "Eletrônicos (Celulares, Notebooks, PC)", emoji: "💻", categoryGroup: "eletronicos", stockKg: 0, stockUnits: 0, trackUnits: true, buyPricePerKg: 0, notes: "Celulares, notebooks, placas, fontes e gabinetes" },
  { id: "scrap_tvs", name: "TVs (Tubo, LED, LCD, Smart)", emoji: "📺", categoryGroup: "eletronicos", stockKg: 0, stockUnits: 0, trackUnits: true, buyPricePerKg: 0, notes: "Televisores inteiros ou desmontados" },
  { id: "scrap_eletrodomesticos", name: "Eletrodomésticos", emoji: "🧺", categoryGroup: "eletronicos", stockKg: 0, stockUnits: 0, trackUnits: true, buyPricePerKg: 0, notes: "Geladeira, fogão, máquina de lavar, micro-ondas" },
  { id: "scrap_papeis_midias", name: "Papéis, CDs, DVDs e Livros", emoji: "📚", categoryGroup: "papeis", stockKg: 0, stockUnits: 0, buyPricePerKg: 0, notes: "Papel branco/misto, livros, cadernos, CDs e DVDs" },
  { id: "scrap_papelao", name: "Papelão (Caixas & Fardos)", emoji: "📦", categoryGroup: "papeis", stockKg: 0, stockUnits: 0, buyPricePerKg: 0, notes: "Caixas onduladas e fardos de papelão" }
];

const SCRAP_GROUP_META: Record<ScrapCategoryGroup, { label: string; badge: string }> = {
  plasticos: { label: "🧴 Plásticos", badge: "Plásticos" },
  metais: { label: "🔩 Metais", badge: "Metais" },
  eletronicos: { label: "📺 Eletrônicos & Eletro", badge: "Eletrônicos & Eletro" },
  papeis: { label: "📦 Papéis & Papelão", badge: "Papéis & Papelão" },
  outros: { label: "🧩 Outros", badge: "Outros" }
};

function mergeScrapMaterialsWithDefaults(
  rawList: any,
  resetLegacyDummyPrices = false
): OtherScrapMaterial[] {
  const savedArr: any[] = Array.isArray(rawList) ? rawList : [];
  const savedById = new Map<string, any>();
  savedArr.forEach((item) => {
    if (item && typeof item.id === "string") {
      savedById.set(item.id, item);
    }
  });

  const legacyPricesById: Record<string, number> = {
    scrap_aluminio: 5.5,
    scrap_ferro: 0.7,
    scrap_papelao: 0.4,
    scrap_cobre: 35.0
  };

  const mergedDefaults: OtherScrapMaterial[] = INITIAL_OTHER_SCRAP_MATERIALS.map((def) => {
    const existing = savedById.get(def.id);
    if (!existing) return { ...def };

    const stockKg = Math.max(0, Number(existing.stockKg) || 0);
    const stockUnits = Math.max(0, Math.round(Number(existing.stockUnits) || 0));
    let buyPricePerKg = Math.max(0, Number(existing.buyPricePerKg) || 0);
    if (
      resetLegacyDummyPrices &&
      stockKg === 0 &&
      stockUnits === 0 &&
      legacyPricesById[def.id] !== undefined &&
      Math.abs(buyPricePerKg - legacyPricesById[def.id]) < 0.001
    ) {
      buyPricePerKg = 0;
    }

    let resolvedName = typeof existing.name === "string" && existing.name.trim() ? existing.name : def.name;
    let resolvedNotes = typeof existing.notes === "string" && existing.notes.trim() ? existing.notes : def.notes;
    if (def.id === "scrap_papelao" && resolvedName === "Papelão & Plástico Limpo") {
      resolvedName = def.name;
      resolvedNotes = def.notes;
    }
    if (def.id === "scrap_aluminio" && resolvedName === "Alumínio & Latinhas") {
      resolvedName = def.name;
      resolvedNotes = def.notes;
    }

    return {
      ...def,
      name: resolvedName,
      emoji: typeof existing.emoji === "string" && existing.emoji.trim() ? existing.emoji : def.emoji,
      categoryGroup: existing.categoryGroup || def.categoryGroup,
      stockKg,
      stockUnits,
      trackUnits: existing.trackUnits ?? def.trackUnits,
      buyPricePerKg,
      sellPricePerKg: Math.max(0, Number(existing.sellPricePerKg) || 0),
      notes: resolvedNotes
    };
  });

  const defaultIds = new Set(INITIAL_OTHER_SCRAP_MATERIALS.map((d) => d.id));
  const customSaved: OtherScrapMaterial[] = savedArr
    .filter((item) => item && typeof item.id === "string" && !defaultIds.has(item.id))
    .map((item) => ({
      id: item.id,
      name: String(item.name || "Material Personalizado"),
      emoji: String(item.emoji || "♻️"),
      categoryGroup: (item.categoryGroup as ScrapCategoryGroup) || "outros",
      stockKg: Math.max(0, Number(item.stockKg) || 0),
      stockUnits: Math.max(0, Math.round(Number(item.stockUnits) || 0)),
      trackUnits: Boolean(item.trackUnits),
      buyPricePerKg: Math.max(0, Number(item.buyPricePerKg) || 0),
      sellPricePerKg: Math.max(0, Number(item.sellPricePerKg) || 0),
      notes: typeof item.notes === "string" ? item.notes : "",
      isCustom: true
    }));

  return [...mergedDefaults, ...customSaved];
}

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
          ${it.name.toUpperCase()}${it.volumeMl > 0 ? ` (${it.volumeMl}ml)` : ""}
        </td>
      </tr>
      <tr style="border-bottom:1px dotted #444;">
        <td style="padding-bottom:4px;font-size:${fontSmallPx}px;">
          ${it.volumeMl > 0 ? `${it.quantity} un × ${it.unitWeightGrams}g = ` : "Peso Líquido: "}${it.totalWeightKg.toFixed(2)} kg
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
          ${
            ticket.isCancelled
              ? `<div style="border:2px solid #000;background:#000;color:#fff;text-align:center;font-weight:900;font-size:${fontHeaderPx}px;padding:4px;margin-bottom:6px;">
                  *** COMPRA CANCELADA / ESTORNADA ***
                  ${ticket.cancelledAt ? `<div style="font-size:${fontSmallPx}px;font-weight:700;margin-top:2px;">EM: ${ticket.cancelledAt}</div>` : ""}
                  ${ticket.cancelReason ? `<div style="font-size:${fontSmallPx}px;font-weight:700;">MOTIVO: ${ticket.cancelReason.toUpperCase()}</div>` : ""}
                </div>`
              : ""
          }
          <div style="text-align:center;margin-bottom:4px;">
            <div style="font-size:${fontHeaderPx}px;font-weight:900;text-transform:uppercase;">${storeTitle}</div>
            <div style="font-size:${fontSmallPx}px;">CNPJ: ${storeCnpj}</div>
            <div style="font-size:${fontSmallPx}px;font-weight:900;margin-top:3px;border:1px solid #000;padding:2px;">
              ${ticket.isScrapPurchase ? "RECIBO - FERRO VELHO & RECICLAGEM" : "COMPROVANTE DE COMPRA - GARRAFAS / VIDROS"}
            </div>
          </div>
          <div style="border-top:1px dashed #000;border-bottom:1px dashed #000;padding:4px 0;margin:4px 0;font-size:${fontSmallPx}px;">
            <div>DATA: ${ticket.timestamp}</div>
            <div>TICKET: ${ticket.id.slice(-8).toUpperCase()}</div>
            <div style="font-weight:900;">PARCEIRO: ${ticket.collectorName.toUpperCase()}</div>
            <div style="font-weight:900;">STATUS: ${ticket.isCancelled ? "CANCELADA / ESTORNADA" : statusLabel}</div>
            ${
              ticket.isScrapPurchase
                ? `<div>MODALIDADE: FERRO VELHO &amp; RECICLAGEM</div>`
                : `<div>COTAÇÃO VICTOR: R$ ${ticket.sellPricePerTonUsed || 150}/ton (R$ ${(((ticket.sellPricePerTonUsed || 150) / 1000)).toFixed(2).replace(".", ",")}/kg)</div>`
            }
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
            ${
              !ticket.isScrapPurchase && ticket.totalBottles > 0
                ? `<div style="display:flex;justify-content:space-between;font-weight:900;">
                    <span>QTD TOTAL GARRAFAS:</span>
                    <span>${ticket.totalBottles} un</span>
                  </div>`
                : ""
            }
            <div style="display:flex;justify-content:space-between;font-weight:900;">
              <span>${ticket.isScrapPurchase ? "PESO TOTAL COMPRADO:" : "PESO SOMADO PÁTIO:"}</span>
              <span>+${ticket.totalWeightKg.toFixed(2)} kg</span>
            </div>
            ${
              typeof ticket.subtotalAmount === "number" && ((ticket.bonusAmount || 0) > 0 || (ticket.discountAmount || 0) > 0)
                ? `<div style="display:flex;justify-content:space-between;font-size:${fontSmallPx}px;margin-top:2px;">
                    <span>SUBTOTAL MATERIAIS:</span>
                    <span>R$ ${ticket.subtotalAmount.toFixed(2).replace(".", ",")}</span>
                  </div>`
                : ""
            }
            ${
              (ticket.bonusAmount || 0) > 0
                ? `<div style="display:flex;justify-content:space-between;font-size:${fontSmallPx}px;font-weight:900;">
                    <span>(+) ACRÉSCIMO${ticket.bonusReason ? ` (${ticket.bonusReason.toUpperCase()})` : ""}:</span>
                    <span>+R$ ${(ticket.bonusAmount || 0).toFixed(2).replace(".", ",")}</span>
                  </div>`
                : ""
            }
            ${
              (ticket.discountAmount || 0) > 0
                ? `<div style="display:flex;justify-content:space-between;font-size:${fontSmallPx}px;font-weight:900;">
                    <span>(-) DESCONTO / VALE${ticket.discountReason ? ` (${ticket.discountReason.toUpperCase()})` : ""}:</span>
                    <span>-R$ ${(ticket.discountAmount || 0).toFixed(2).replace(".", ",")}</span>
                  </div>`
                : ""
            }
            ${
              ticket.isFounder
                ? `<div style="display:flex;justify-content:space-between;font-size:${fontSmallPx}px;font-weight:900;margin-top:2px;">
                    <span>ECONOMIA D.W (VALOR EQUIV.):</span>
                    <span>R$ ${ticket.items.reduce((s, it) => s + it.costPaid, 0).toFixed(2).replace(".", ",")}</span>
                  </div>`
                : ""
            }
            <div style="display:flex;justify-content:space-between;font-size:${fontHeaderPx}px;font-weight:900;border-top:1px solid #000;border-bottom:1px solid #000;padding:3px 0;margin:4px 0;${ticket.isCancelled ? "text-decoration:line-through;" : ""}">
              <span>${ticket.isFounder ? "TOTAL A PAGAR (PRÓPRIA):" : "TOTAL LÍQUIDO:"}</span>
              <span>R$ ${ticket.isFounder ? "0,00" : ticket.totalPaid.toFixed(2).replace(".", ",")}</span>
            </div>
            ${
              ticket.isScrapPurchase
                ? ""
                : `<div style="font-size:${fontSmallPx}px;text-align:center;">
                    PÁTIO ATUAL: ${yardCurrentKg.toFixed(1)} kg / ${yardGoalKg.toLocaleString("pt-BR")} kg
                  </div>`
            }
          </div>
          <div style="text-align:center;margin-top:8px;border-top:1px dashed #000;padding-top:4px;font-size:${fontSmallPx}px;">
            <div style="font-weight:900;">D.W VIDROS & RECICLAGEM</div>
            <div>${ticket.isCancelled ? "DOCUMENTO SEM VALOR FISCAL - ESTORNADO" : "Obrigado pela parceria na reciclagem!"}</div>
          </div>
          <div style="height:${(config.feedLines || 4) * 9}px;"></div>
        </div>
      </body>
    </html>
  `;
}

export interface PdvSyncedFinancialEvent {
  id: string;
  type: "entrada" | "saida";
  amount: number;
  description: string;
  paymentMethod: "dinheiro" | "pix" | "cartao_debito" | "cartao_credito";
  category: "venda" | "despesa" | "outros";
  clientName?: string;
  items?: { name: string; price: number; quantity: number; unit?: string }[];
}

interface Props {
  db?: any;
  userId?: string;
  sellPricePerTon?: number; // Preço pago pela usina (ex: R$ 150/ton = R$ 0,15/kg)
  onSetSellPricePerTon?: (price: number) => void;
  buyerName?: string;
  initialActiveTab?: "carrinho" | "caderninho" | "estoque" | "cargas" | "guia_plasticos";
  initialYardControlFilter?: "vidro" | "outros";
  onAddItemsToYardStock?: (itemsToAdd: { name: string; quantity: number; weightKg: number; costPaid: number }[]) => void;
  onSyncFinancialEventToPDV?: (event: PdvSyncedFinancialEvent) => void;
  onCancelSyncedFinancialEventFromPDV?: (eventId: string, reason?: string) => void;
  showNotification?: (msg: string, type: "success" | "error" | "info" | "warning") => void;
}

export function GlassBarcodeScannerCart({
  db,
  userId,
  sellPricePerTon = 150,
  onSetSellPricePerTon,
  buyerName = "Caminhão do Victor (Usina / Reciclagem)",
  initialActiveTab,
  initialYardControlFilter,
  onAddItemsToYardStock,
  onSyncFinancialEventToPDV,
  onCancelSyncedFinancialEventFromPDV,
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

  // Catálogo com Nomes, ML, Códigos (1 a 5) e Pesos
  const [catalog, setCatalog] = useState<CatalogBottleItem[]>(() => {
    try {
      const isCleaned = localStorage.getItem("pdv_dw_glass_zero_clean_v10");
      if (!isCleaned) {
        localStorage.setItem("pdv_dw_glass_zero_clean_v10", "true");
        localStorage.removeItem("pdv_dw_glass_catalog_v10");
        localStorage.removeItem("pdv_dw_glass_catalog_v4");
        localStorage.removeItem("pdv_dw_glass_catalog_v3");
        return DEFAULT_BOTTLE_CATALOG.map((b) => ({
          ...b,
          stockUnits: 0,
          additionalBarcodes: Array.isArray(b.additionalBarcodes) ? b.additionalBarcodes : []
        }));
      }
      const stored = localStorage.getItem("pdv_dw_glass_catalog_v10") || localStorage.getItem("pdv_dw_glass_catalog_v4") || localStorage.getItem("pdv_dw_glass_catalog_v3");
      if (stored) {
        const parsed: CatalogBottleItem[] = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const existingIds = new Set(parsed.map((p) => p.id));
          const usedCodes = new Set<string>();
          parsed.forEach((p) => {
            if (p.barcode) usedCodes.add(p.barcode.trim());
            (p.additionalBarcodes || []).forEach((c) => {
              if (c) usedCodes.add(c.trim());
            });
          });
          const missing = DEFAULT_BOTTLE_CATALOG.filter((d) => !existingIds.has(d.id));
          const merged = parsed.map((p) => {
            let item = { ...p };
            const defMatch = DEFAULT_BOTTLE_CATALOG.find((d) => d.id === item.id);
            if (item.id === "bottle_heineken_330" && (item.unitWeightGrams === 185 || !item.unitWeightGrams)) {
              item.unitWeightGrams = 182;
              item.unitWeightKg = 0.182;
            }
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
            // Preenche código padrão caso garrafa do catálogo padrão estivesse "Sem código"
            if ((!item.barcode || !item.barcode.trim()) && defMatch?.barcode && !usedCodes.has(defMatch.barcode)) {
              item.barcode = defMatch.barcode;
              usedCodes.add(defMatch.barcode);
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
    return DEFAULT_BOTTLE_CATALOG.map((b) => ({
      ...b,
      stockUnits: 0,
      additionalBarcodes: Array.isArray(b.additionalBarcodes) ? b.additionalBarcodes : []
    }));
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

  // Estoque separado de Outros Materiais do Ferro Velho (PET, Latinhas, Plásticos Duros, Ferro, Alumínio, Cobre, Eletrônicos, TVs, Eletrodomésticos, Papéis, Papelão)
  const [otherScrapMaterials, setOtherScrapMaterials] = useState<OtherScrapMaterial[]>(() => {
    try {
      const hasZeroPriceMigrated = localStorage.getItem("pdv_dw_other_scrap_v2_noprice_init") === "1";
      const saved = localStorage.getItem("pdv_dw_other_scrap_materials_v1");
      if (!hasZeroPriceMigrated) {
        localStorage.setItem("pdv_dw_other_scrap_v2_noprice_init", "1");
      }
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return mergeScrapMaterialsWithDefaults(parsed, !hasZeroPriceMigrated);
        }
      }
    } catch {}
    return INITIAL_OTHER_SCRAP_MATERIALS;
  });

  // Setor separado: "vidros" (Pátio de Vidros 3.000 kg / Victor) vs "reciclagem" (Centro de Reciclagem / Ferro Velho)
  const [activeSector, setActiveSector] = useState<"vidros" | "reciclagem">(
    initialYardControlFilter === "outros" || initialActiveTab === "guia_plasticos" ? "reciclagem" : "vidros"
  );

  // Painel ativo no controle de materiais do Pátio ("vidro" vs "outros")
  const [yardControlFilter, setYardControlFilter] = useState<"vidro" | "outros">(
    initialYardControlFilter || (initialActiveTab === "guia_plasticos" ? "outros" : "vidro")
  );

  // Histórico de vendas/baixas realizadas do Centro de Reciclagem (Ferro Velho) para cálculo real de lucros
  const [scrapSalesHistory, setScrapSalesHistory] = useState<ScrapSaleRecord[]>(() => {
    try {
      const stored = localStorage.getItem("pdv_dw_scrap_sales_v1");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  // Integração automática com Caixa, Relatórios & BI do PDV
  const [syncToPdvCash, setSyncToPdvCash] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("pdv_dw_sync_to_pdv_cash_v1");
      return saved === null ? true : saved === "true";
    } catch {
      return true;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("pdv_dw_sync_to_pdv_cash_v1", syncToPdvCash ? "true" : "false");
    } catch {}
  }, [syncToPdvCash]);

  // Modal de venda / baixa de lote de Outros Materiais do Ferro Velho integrado ao PDV
  const [sellingScrapMaterial, setSellingScrapMaterial] = useState<OtherScrapMaterial | null>(null);
  const [scrapSaleKgDraft, setScrapSaleKgDraft] = useState<string>("");
  const [scrapSaleUnitsDraft, setScrapSaleUnitsDraft] = useState<string>("");
  const [scrapSaleTotalValueDraft, setScrapSaleTotalValueDraft] = useState<string>("");
  const [scrapSaleBuyerDraft, setScrapSaleBuyerDraft] = useState<string>("");
  const [scrapSaleMethod, setScrapSaleMethod] = useState<"dinheiro" | "pix" | "cartao_debito" | "cartao_credito">("pix");

  // Estados da Balança Digital & Filtro de Outros Materiais do Ferro Velho
  const [scrapCategoryFilter, setScrapCategoryFilter] = useState<"todos" | ScrapCategoryGroup>("todos");
  const [scrapSearchQuery, setScrapSearchQuery] = useState<string>("");
  const [scaleSelectedMaterialId, setScaleSelectedMaterialId] = useState<string>("scrap_pet");
  const [scaleUnitMode, setScaleUnitMode] = useState<"kg" | "g">("kg");
  const [scaleGrossInput, setScaleGrossInput] = useState<string>("");
  const [savedFixedTareKg, setSavedFixedTareKg] = useState<number>(() => {
    try {
      const v = Number(localStorage.getItem("pdv_dw_saved_scale_tare_kg_v1"));
      return Number.isFinite(v) && v > 0 ? v : 0;
    } catch {
      return 0;
    }
  });
  const [scaleTareInput, setScaleTareInput] = useState<string>(() => {
    try {
      const v = Number(localStorage.getItem("pdv_dw_saved_scale_tare_kg_v1"));
      return Number.isFinite(v) && v > 0 ? String(v) : "";
    } catch {
      return "";
    }
  });
  const [scaleSubtractTare, setScaleSubtractTare] = useState<boolean>(() => {
    try {
      return localStorage.getItem("pdv_dw_scale_subtract_tare_v1") === "true";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("pdv_dw_scale_subtract_tare_v1", scaleSubtractTare ? "true" : "false");
    } catch {}
  }, [scaleSubtractTare]);
  const [scaleUnitsInput, setScaleUnitsInput] = useState<string>("");
  const [scalePricePerKgInput, setScalePricePerKgInput] = useState<string>("");
  const [scaleSellPricePerKgInput, setScaleSellPricePerKgInput] = useState<string>("");
  const [scaleSettlementMode, setScaleSettlementMode] = useState<"pago_dinheiro" | "pago_pix" | "caderninho" | "so_estoque">("pago_dinheiro");
  const [scrapWeightDrafts, setScrapWeightDrafts] = useState<Record<string, string>>({});
  const [cardPayMatId, setCardPayMatId] = useState<string | null>(null);
  const [cardPayKgDraft, setCardPayKgDraft] = useState<string>("");
  const [cardPayPriceDraft, setCardPayPriceDraft] = useState<string>("");
  const [cardPayCollabId, setCardPayCollabId] = useState<string>("");
  const [cardPayMethod, setCardPayMethod] = useState<"pago_dinheiro" | "pago_pix" | "caderninho">("pago_dinheiro");
  const [cardPayAddToStock, setCardPayAddToStock] = useState<boolean>(true);

  // Opção de nome no recibo (cadastrado | sem_nome | nome_avulso) + ajustes (acréscimo / desconto) + Cesta Multi-Materiais do Dia
  const [scrapCollabMode, setScrapCollabMode] = useState<"cadastrado" | "sem_nome" | "nome_avulso">("cadastrado");
  const [scrapCustomCollabName, setScrapCustomCollabName] = useState<string>("");
  const [scrapBasket, setScrapBasket] = useState<
    {
      id: string;
      materialId: string;
      materialName: string;
      emoji: string;
      weightKg: number;
      units: number;
      pricePerKg: number;
      addToStock: boolean;
    }[]
  >([]);
  const [scrapBasketWeightDrafts, setScrapBasketWeightDrafts] = useState<Record<string, string>>({});
  const [scrapBasketPriceDrafts, setScrapBasketPriceDrafts] = useState<Record<string, string>>({});
  const [scrapBasketBonusInput, setScrapBasketBonusInput] = useState<string>("");
  const [scrapBasketBonusReason, setScrapBasketBonusReason] = useState<string>("");
  const [scrapBasketDiscountInput, setScrapBasketDiscountInput] = useState<string>("");
  const [scrapBasketDiscountReason, setScrapBasketDiscountReason] = useState<string>("");
  const [scrapBasketQuickMatId, setScrapBasketQuickMatId] = useState<string>("scrap_pet");
  const [scrapBasketQuickKg, setScrapBasketQuickKg] = useState<string>("");
  const [scrapBasketQuickPrice, setScrapBasketQuickPrice] = useState<string>("");
  const scrapBasketPanelRef = useRef<HTMLDivElement | null>(null);

  const [scaleQueueReadings, setScaleQueueReadings] = useState<
    { id: string; grossKg: number; tareKg: number; netKg: number; label: string }[]
  >([]);
  const [serialConnected, setSerialConnected] = useState<boolean>(false);
  const [serialStatusMsg, setSerialStatusMsg] = useState<string | null>(null);
  const serialPortRef = useRef<any>(null);
  const serialReaderCancelRef = useRef<boolean>(false);
  const digitalScalePanelRef = useRef<HTMLDivElement | null>(null);

  // Estados de criação de novo material, edição opcional de preço compra/revenda e confirmações inline
  const [editingScrapPriceId, setEditingScrapPriceId] = useState<string | null>(null);
  const [editingScrapPriceDraft, setEditingScrapPriceDraft] = useState<string>("");
  const [editingScrapSellPriceDraft, setEditingScrapSellPriceDraft] = useState<string>("");
  const [showProfitAccountingPanel, setShowProfitAccountingPanel] = useState<boolean>(true);
  const [showAddCustomScrapForm, setShowAddCustomScrapForm] = useState<boolean>(false);
  const [newScrapName, setNewScrapName] = useState<string>("");
  const [newScrapEmoji, setNewScrapEmoji] = useState<string>("♻️");
  const [newScrapGroup, setNewScrapGroup] = useState<ScrapCategoryGroup>("outros");
  const [newScrapTrackUnits, setNewScrapTrackUnits] = useState<boolean>(false);
  const [newScrapNotes, setNewScrapNotes] = useState<string>("");
  const [confirmDeleteCustomScrapId, setConfirmDeleteCustomScrapId] = useState<string | null>(null);
  const [confirmClearAllScrapPrices, setConfirmClearAllScrapPrices] = useState<boolean>(false);

  // Modal de Confirmação Rápida após Bipar (Permite digitar ex: 55 direto no teclado antes de jogar no carrinho)
  const [scannedPrompt, setScannedPrompt] = useState<{ bottle: CatalogBottleItem; matchedCode: string } | null>(null);
  const [scannedPromptQtyStr, setScannedPromptQtyStr] = useState<string>("1");

  // Modal inteligente para código ainda não vinculado -> "Vincular a uma garrafa já cadastrada (1-5 códs)" ou "Cadastrar nova"
  const [unmatchedBarcodePrompt, setUnmatchedBarcodePrompt] = useState<{ code: string } | null>(null);

  // Modo "Só Quero Bipar!" Contínuo (adiciona +1/+N direto ao bipar sem fechar câmera) + HUD de feedback
  const [continuousBeepMode, setContinuousBeepMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem("pdv_dw_continuous_beep_mode") === "true";
    } catch {
      return false;
    }
  });
  const [continuousBatchQty, setContinuousBatchQty] = useState<number>(1);
  const [lastBeepHud, setLastBeepHud] = useState<{
    bottleId: string;
    bottleName: string;
    emoji: string;
    code: string;
    addedQty: number;
    unitGrams: number;
    timestamp: number;
  } | null>(null);
  const [lastMatchedBottleId, setLastMatchedBottleId] = useState<string | null>(null);
  const [catalogSearchQuery, setCatalogSearchQuery] = useState<string>("");

  // Sincronização em Nuvem (Firestore) para espelhar Pátio e Códigos entre navegador e PWA instalado no Chrome
  const [cloudSyncStatus, setCloudSyncStatus] = useState<"synced" | "syncing" | "local_only">("local_only");
  const [activeAuthUid, setActiveAuthUid] = useState<string | null>(() => {
    if (userId && userId !== "guest_visitor") return userId;
    return null;
  });
  const isApplyingCloudRef = useRef<boolean>(false);
  const hasHydratedCloudOnceRef = useRef<boolean>(false);
  const localMutationTsRef = useRef<number>((() => {
    try {
      return Number(localStorage.getItem("pdv_dw_last_updated_at")) || 0;
    } catch {
      return 0;
    }
  })());

  // Comprovante térmico gerado ao finalizar compra no portão + estados de cancelamento/estorno + MiniPrint 57mm + Pastas
  const [lastPurchaseReceipt, setLastPurchaseReceipt] = useState<CompletedPurchaseTicket | null>(null);
  const [latestSettledReceipt, setLatestSettledReceipt] = useState<CollaboratorPaymentReceipt | null>(null);
  const [cancellingTicketId, setCancellingTicketId] = useState<string | null>(null);
  const [cancelTicketReasonDraft, setCancelTicketReasonDraft] = useState<string>("");
  const [cancellingPaymentId, setCancellingPaymentId] = useState<string | null>(null);
  const [cancellingScrapSaleId, setCancellingScrapSaleId] = useState<string | null>(null);
  const [showZeroOnlyScrapConfirm, setShowZeroOnlyScrapConfirm] = useState<boolean>(false);
  const [printerConfigState, setPrinterConfigState] = useState<PrinterConfig>(() => loadPrinterConfig());
  const [receiptCopiesMode, setReceiptCopiesMode] = useState<1 | 2>(() => {
    try {
      const saved = localStorage.getItem("pdv_dw_receipt_copies_mode");
      if (saved === "2") return 2;
      if (saved === "1") return 1;
      return loadPrinterConfig().printTwoCopies ? 2 : 1;
    } catch {
      return 1;
    }
  });
  const [selectedFolderKey, setSelectedFolderKey] = useState<string | null>(null);
  const [folderSearchQuery, setFolderSearchQuery] = useState<string>("");
  const [isGeneratingFunPrint, setIsGeneratingFunPrint] = useState<boolean>(false);

  // Destino da câmera: leitura de compra ("search") ou preenchimento dos 5 campos de código no modal Editar ("primary" ou índice 0..3)
  const [cameraTargetField, setCameraTargetField] = useState<"search" | "primary" | number>("search");
  const continuousBeepModeRef = useRef<boolean>(continuousBeepMode);
  continuousBeepModeRef.current = continuousBeepMode;
  const continuousBatchQtyRef = useRef<number>(continuousBatchQty);
  continuousBatchQtyRef.current = continuousBatchQty;
  const cameraTargetFieldRef = useRef<"search" | "primary" | number>(cameraTargetField);
  cameraTargetFieldRef.current = cameraTargetField;
  const lastScannedCooldownRef = useRef<{ code: string; at: number } | null>(null);

  const markLocalYardMutation = () => {
    if (isApplyingCloudRef.current) return;
    const now = Date.now();
    localMutationTsRef.current = now;
    try {
      localStorage.setItem("pdv_dw_last_updated_at", String(now));
    } catch {}
  };

  useEffect(() => {
    try {
      localStorage.setItem("pdv_dw_continuous_beep_mode", continuousBeepMode ? "true" : "false");
    } catch {}
  }, [continuousBeepMode]);

  // Ouvinte global para zerar todo o pátio e testes quando acionado no painel geral
  useEffect(() => {
    const handleYardZeroEvent = () => {
      markLocalYardMutation();
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
      setScrapSalesHistory([]);
      setOtherScrapMaterials((prev) => prev.map((m) => ({ ...m, stockKg: 0, stockUnits: 0 })));
      setLastPurchaseReceipt(null);
      setShowCheckoutModal(false);
    };
    window.addEventListener("dw_glass_zero_yard", handleYardZeroEvent);
    return () => window.removeEventListener("dw_glass_zero_yard", handleYardZeroEvent);
  }, []);

  // Fecha porta serial da balança USB caso usuário saia da tela
  useEffect(() => {
    return () => {
      serialReaderCancelRef.current = true;
      try {
        if (serialPortRef.current && typeof serialPortRef.current.close === "function") {
          serialPortRef.current.close().catch(() => {});
        }
      } catch {}
    };
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
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((c: CollaboratorAccount) =>
            c?.isFounder ? { ...c, totalPaid: 0, balancePending: 0 } : c
          );
        }
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

  // Aba ativa: "carrinho" | "caderninho" | "estoque" | "cargas" | "guia_plasticos"
  const [activeTab, setActiveTab] = useState<"carrinho" | "caderninho" | "estoque" | "cargas" | "guia_plasticos">(
    initialActiveTab || "carrinho"
  );

  useEffect(() => {
    if (initialActiveTab) {
      setActiveTab(initialActiveTab);
      if (initialActiveTab === "guia_plasticos") {
        setActiveSector("reciclagem");
        setYardControlFilter("outros");
      } else if (initialActiveTab === "carrinho") {
        setActiveSector("vidros");
      }
    }
  }, [initialActiveTab]);

  useEffect(() => {
    if (initialYardControlFilter) {
      setYardControlFilter(initialYardControlFilter);
      setActiveSector(initialYardControlFilter === "outros" ? "reciclagem" : "vidros");
    }
  }, [initialYardControlFilter]);

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

  // Persistência automática + marcação para sincronização em nuvem
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

  useEffect(() => {
    try {
      localStorage.setItem("pdv_dw_scrap_sales_v1", JSON.stringify(scrapSalesHistory));
    } catch {}
  }, [scrapSalesHistory]);

  // Notifica os demais painéis do PDV (Estoque, Relatórios & BI) sempre que o Pátio/Ferro Velho mudar
  useEffect(() => {
    try {
      window.dispatchEvent(new CustomEvent("dw_glass_yard_updated"));
    } catch {}
  }, [catalog, otherScrapMaterials, scrapSalesHistory, collaborators, truckShipments, yardGoalKg, activeSellPricePerTon]);

  // Helper para enviar snapshot do Pátio & Códigos para Firestore userData/{uid}
  const latestCloudPayloadRef = useRef<any>(null);
  latestCloudPayloadRef.current = {
    updatedAt: localMutationTsRef.current || Date.now(),
    catalog,
    collaborators,
    purchaseHistory: purchaseHistory.slice(0, 150),
    paymentHistory: paymentHistory.slice(0, 150),
    truckShipments: truckShipments.slice(0, 50),
    scrapSalesHistory: scrapSalesHistory.slice(0, 150),
    yardGoalKg,
    sellPricePerTon: activeSellPricePerTon,
    otherScrapMaterials
  };

  const pushYardDataToCloud = async (explicitTs?: number, forceNotify = false) => {
    try {
      const authInstance = getAuth();
      const uid = authInstance?.currentUser?.uid || (userId && userId !== "guest_visitor" ? userId : null);
      if (!db || !uid || !authInstance?.currentUser || authInstance.currentUser.uid !== uid || getIsFirestoreQuotaPaused()) {
        return;
      }
      setCloudSyncStatus("syncing");
      const ts = explicitTs || localMutationTsRef.current || Date.now();
      localMutationTsRef.current = ts;
      try {
        localStorage.setItem("pdv_dw_last_updated_at", String(ts));
      } catch {}
      const payload = {
        ...latestCloudPayloadRef.current,
        updatedAt: ts
      };
      await setDoc(
        doc(db, "userData", uid),
        {
          userId: uid,
          dwGlassYardData: payload
        },
        { merge: true }
      );
      setCloudSyncStatus("synced");
      if (forceNotify && showNotification) {
        showNotification("Pátio e códigos sincronizados na nuvem! ☁️✅", "success");
      }
    } catch (err: any) {
      if (isQuotaExhaustedError(err)) {
        markFirestoreQuotaPaused();
      }
      setCloudSyncStatus("local_only");
    }
  };

  // Escuta conta logada e sincroniza Pátio/Códigos em tempo real com userData/{uid}
  useEffect(() => {
    if (!db) {
      setCloudSyncStatus("local_only");
      return;
    }
    let unsubSnap: (() => void) | null = null;
    let unsubAuth: (() => void) | null = null;
    try {
      const authInstance = getAuth();
      const attachUserListener = (uid: string | null) => {
        if (unsubSnap) {
          unsubSnap();
          unsubSnap = null;
        }
        if (!uid || uid === "guest_visitor" || getIsFirestoreQuotaPaused()) {
          setActiveAuthUid(null);
          setCloudSyncStatus("local_only");
          return;
        }
        setActiveAuthUid(uid);
        setCloudSyncStatus("syncing");
        const userDocRef = doc(db, "userData", uid);
        unsubSnap = onSnapshot(
          userDocRef,
          (snap) => {
            if (!snap.exists()) {
              setCloudSyncStatus("synced");
              return;
            }
            const cloudYard = snap.data()?.dwGlassYardData;
            if (cloudYard && typeof cloudYard === "object") {
              const cloudTs = Number(cloudYard.updatedAt) || 0;
              const localTs = localMutationTsRef.current || 0;
              if (cloudTs > localTs && !snap.metadata.hasPendingWrites) {
                isApplyingCloudRef.current = true;
                try {
                  if (Array.isArray(cloudYard.catalog) && cloudYard.catalog.length > 0) {
                    setCatalog(cloudYard.catalog);
                  }
                  if (Array.isArray(cloudYard.collaborators) && cloudYard.collaborators.length > 0) {
                    setCollaborators(
                      cloudYard.collaborators.map((c: CollaboratorAccount) =>
                        c?.isFounder ? { ...c, totalPaid: 0, balancePending: 0 } : c
                      )
                    );
                  }
                  if (Array.isArray(cloudYard.purchaseHistory)) {
                    setPurchaseHistory(cloudYard.purchaseHistory);
                  }
                  if (Array.isArray(cloudYard.paymentHistory)) {
                    setPaymentHistory(cloudYard.paymentHistory);
                  }
                  if (Array.isArray(cloudYard.truckShipments)) {
                    setTruckShipments(cloudYard.truckShipments);
                  }
                  if (Array.isArray(cloudYard.scrapSalesHistory)) {
                    setScrapSalesHistory(cloudYard.scrapSalesHistory);
                  }
                  if (typeof cloudYard.yardGoalKg === "number" && cloudYard.yardGoalKg >= 100) {
                    setYardGoalKg(cloudYard.yardGoalKg);
                  }
                  if (typeof cloudYard.sellPricePerTon === "number" && cloudYard.sellPricePerTon >= 50 && !onSetSellPricePerTon) {
                    setInternalSellPricePerTon(cloudYard.sellPricePerTon);
                  }
                  if (Array.isArray(cloudYard.otherScrapMaterials) && cloudYard.otherScrapMaterials.length > 0) {
                    setOtherScrapMaterials(mergeScrapMaterialsWithDefaults(cloudYard.otherScrapMaterials, false));
                  }
                  localMutationTsRef.current = cloudTs;
                  try {
                    localStorage.setItem("pdv_dw_last_updated_at", String(cloudTs));
                  } catch {}
                } finally {
                  setTimeout(() => {
                    isApplyingCloudRef.current = false;
                  }, 150);
                }
              } else if (!hasHydratedCloudOnceRef.current && localTs > cloudTs) {
                pushYardDataToCloud(localTs);
              }
            } else if (!hasHydratedCloudOnceRef.current && localMutationTsRef.current > 0) {
              pushYardDataToCloud(localMutationTsRef.current);
            }
            hasHydratedCloudOnceRef.current = true;
            setCloudSyncStatus("synced");
          },
          () => {
            setCloudSyncStatus("local_only");
          }
        );
      };

      unsubAuth = onAuthStateChanged(authInstance, (currentUser) => {
        attachUserListener(currentUser?.uid || null);
      });
    } catch {
      setCloudSyncStatus("local_only");
    }

    return () => {
      if (unsubAuth) unsubAuth();
      if (unsubSnap) unsubSnap();
    };
  }, [db, userId]);

  // Debounce sync para nuvem quando dados do Pátio ou Códigos mudarem localmente
  useEffect(() => {
    if (isApplyingCloudRef.current || !activeAuthUid || !db || getIsFirestoreQuotaPaused()) return;
    const timer = setTimeout(() => {
      if (localMutationTsRef.current > 0) {
        pushYardDataToCloud(localMutationTsRef.current);
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [
    catalog,
    collaborators,
    purchaseHistory,
    paymentHistory,
    truckShipments,
    yardGoalKg,
    activeSellPricePerTon,
    otherScrapMaterials,
    scrapSalesHistory,
    activeAuthUid
  ]);

  const otherMaterialsTotalKg = useMemo(() => {
    return otherScrapMaterials.reduce((acc, m) => acc + (Number(m.stockKg) || 0), 0);
  }, [otherScrapMaterials]);

  const otherMaterialsTotalUnits = useMemo(() => {
    return otherScrapMaterials.reduce((acc, m) => acc + (Number(m.stockUnits) || 0), 0);
  }, [otherScrapMaterials]);

  // Contabilidade completa por material no Centro de Reciclagem: Quanto Paguei × Quanto Vão Me Pagar × Meu Lucro
  const recyclingProfitAccounting = useMemo(() => {
    const activeScrapPurchases = purchaseHistory.filter((t) => !t.isCancelled && t.isScrapPurchase);
    const byMaterial = otherScrapMaterials.map((mat) => {
      const stockKg = Math.max(0, Number(mat.stockKg) || 0);
      const buyPricePerKg = Math.max(0, Number(mat.buyPricePerKg) || 0);
      const sellPricePerKg = Math.max(0, Number(mat.sellPricePerKg) || 0);
      const hasBothPrices = buyPricePerKg > 0 && sellPricePerKg > 0;
      const profitPerKg = sellPricePerKg > 0 ? sellPricePerKg - buyPricePerKg : 0;
      const marginPct = hasBothPrices ? ((sellPricePerKg - buyPricePerKg) / buyPricePerKg) * 100 : 0;

      const stockInvestedAmount = Number((stockKg * buyPricePerKg).toFixed(2));
      const stockResaleValue = sellPricePerKg > 0 ? Number((stockKg * sellPricePerKg).toFixed(2)) : 0;
      const stockExpectedProfit = sellPricePerKg > 0 ? Number((stockKg * (sellPricePerKg - buyPricePerKg)).toFixed(2)) : 0;

      let realizedBoughtKg = 0;
      let realizedPaidTotal = 0;
      activeScrapPurchases.forEach((ticket) => {
        ticket.items.forEach((it) => {
          const matchesId = it.materialId === mat.id;
          const matchesName = !it.materialId && it.name.toLowerCase().includes(mat.name.toLowerCase());
          if (matchesId || matchesName) {
            realizedBoughtKg += Math.max(0, Number(it.totalWeightKg) || 0);
            realizedPaidTotal += Math.max(0, Number(it.costPaid) || 0);
          }
        });
      });

      const matSales = scrapSalesHistory.filter((s) => !s.isCancelled && s.materialId === mat.id);
      const realizedSoldKg = matSales.reduce((acc, s) => acc + Math.max(0, Number(s.weightKg) || 0), 0);
      const realizedRevenueTotal = matSales.reduce((acc, s) => acc + Math.max(0, Number(s.revenueReceived) || 0), 0);
      const realizedSaleCostTotal = matSales.reduce((acc, s) => acc + Math.max(0, Number(s.estimatedBuyCost) || 0), 0);
      const realizedProfitTotal = matSales.reduce((acc, s) => acc + (Number(s.profitAmount) || 0), 0);

      return {
        material: mat,
        stockKg,
        buyPricePerKg,
        sellPricePerKg,
        hasBothPrices,
        profitPerKg,
        marginPct,
        stockInvestedAmount,
        stockResaleValue,
        stockExpectedProfit,
        realizedBoughtKg: Number(realizedBoughtKg.toFixed(2)),
        realizedPaidTotal: Number(realizedPaidTotal.toFixed(2)),
        realizedSoldKg: Number(realizedSoldKg.toFixed(2)),
        realizedRevenueTotal: Number(realizedRevenueTotal.toFixed(2)),
        realizedSaleCostTotal: Number(realizedSaleCostTotal.toFixed(2)),
        realizedProfitTotal: Number(realizedProfitTotal.toFixed(2))
      };
    });

    const totals = byMaterial.reduce(
      (acc, row) => ({
        stockKg: acc.stockKg + row.stockKg,
        stockInvestedAmount: acc.stockInvestedAmount + row.stockInvestedAmount,
        stockResaleValue: acc.stockResaleValue + row.stockResaleValue,
        stockExpectedProfit: acc.stockExpectedProfit + row.stockExpectedProfit,
        realizedBoughtKg: acc.realizedBoughtKg + row.realizedBoughtKg,
        realizedPaidTotal: acc.realizedPaidTotal + row.realizedPaidTotal,
        realizedSoldKg: acc.realizedSoldKg + row.realizedSoldKg,
        realizedRevenueTotal: acc.realizedRevenueTotal + row.realizedRevenueTotal,
        realizedProfitTotal: acc.realizedProfitTotal + row.realizedProfitTotal
      }),
      {
        stockKg: 0,
        stockInvestedAmount: 0,
        stockResaleValue: 0,
        stockExpectedProfit: 0,
        realizedBoughtKg: 0,
        realizedPaidTotal: 0,
        realizedSoldKg: 0,
        realizedRevenueTotal: 0,
        realizedProfitTotal: 0
      }
    );

    const byMaterialMap = new Map(byMaterial.map((r) => [r.material.id, r]));
    return { byMaterial, byMaterialMap, totals };
  }, [otherScrapMaterials, purchaseHistory, scrapSalesHistory]);

  const selectedScaleMaterial = useMemo(() => {
    return otherScrapMaterials.find((m) => m.id === scaleSelectedMaterialId) || otherScrapMaterials[0];
  }, [otherScrapMaterials, scaleSelectedMaterialId]);

  useEffect(() => {
    const p = selectedScaleMaterial?.buyPricePerKg || 0;
    const sp = selectedScaleMaterial?.sellPricePerKg || 0;
    setScalePricePerKgInput(p > 0 ? String(p).replace(".", ",") : "");
    setScaleSellPricePerKgInput(sp > 0 ? String(sp).replace(".", ",") : "");
  }, [selectedScaleMaterial?.id]);

  const handleUpdateScrapPricePerKg = (materialId: string, newPrice: number) => {
    const cleanPrice = Math.max(0, Number.isFinite(newPrice) ? newPrice : 0);
    markLocalYardMutation();
    setOtherScrapMaterials((prev) =>
      prev.map((m) => (m.id === materialId ? { ...m, buyPricePerKg: cleanPrice } : m))
    );
    if (selectedScaleMaterial?.id === materialId) {
      setScalePricePerKgInput(cleanPrice > 0 ? String(cleanPrice).replace(".", ",") : "");
    }
  };

  const handleUpdateScrapPrices = (materialId: string, newBuyPrice: number, newSellPrice: number) => {
    const cleanBuy = Math.max(0, Number.isFinite(newBuyPrice) ? newBuyPrice : 0);
    const cleanSell = Math.max(0, Number.isFinite(newSellPrice) ? newSellPrice : 0);
    markLocalYardMutation();
    setOtherScrapMaterials((prev) =>
      prev.map((m) =>
        m.id === materialId ? { ...m, buyPricePerKg: cleanBuy, sellPricePerKg: cleanSell } : m
      )
    );
    if (selectedScaleMaterial?.id === materialId) {
      setScalePricePerKgInput(cleanBuy > 0 ? String(cleanBuy).replace(".", ",") : "");
      setScaleSellPricePerKgInput(cleanSell > 0 ? String(cleanSell).replace(".", ",") : "");
    }
  };

  const scaleGrossKg = useMemo(() => {
    const raw = parseFloat(scaleGrossInput.replace(",", ".")) || 0;
    return Math.max(0, scaleUnitMode === "g" ? raw / 1000 : raw);
  }, [scaleGrossInput, scaleUnitMode]);

  const scaleTareKg = useMemo(() => {
    const raw = parseFloat(scaleTareInput.replace(",", ".")) || 0;
    return Math.max(0, scaleUnitMode === "g" ? raw / 1000 : raw);
  }, [scaleTareInput, scaleUnitMode]);

  const scaleAppliedTareKg = useMemo(() => {
    return scaleSubtractTare ? scaleTareKg : 0;
  }, [scaleSubtractTare, scaleTareKg]);

  const scaleCurrentNetKg = useMemo(() => {
    return Math.max(0, scaleGrossKg - scaleAppliedTareKg);
  }, [scaleGrossKg, scaleAppliedTareKg]);

  const scaleQueueTotalNetKg = useMemo(() => {
    return scaleQueueReadings.reduce((sum, r) => sum + r.netKg, 0);
  }, [scaleQueueReadings]);

  const scaleEffectivePricePerKg = useMemo(() => {
    const parsed = parseFloat(scalePricePerKgInput.replace(",", "."));
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
    return selectedScaleMaterial?.buyPricePerKg || 0;
  }, [scalePricePerKgInput, selectedScaleMaterial?.buyPricePerKg]);

  const scaleCombinedWeightKg = scaleQueueTotalNetKg + scaleCurrentNetKg;
  const scaleCurrentPayable = Number((scaleCurrentNetKg * scaleEffectivePricePerKg).toFixed(2));
  const scaleTotalPayable = Number((scaleCombinedWeightKg * scaleEffectivePricePerKg).toFixed(2));

  const filteredScrapMaterials = useMemo(() => {
    const q = scrapSearchQuery.trim().toLowerCase();
    return otherScrapMaterials.filter((mat) => {
      if (scrapCategoryFilter !== "todos" && (mat.categoryGroup || "outros") !== scrapCategoryFilter) {
        return false;
      }
      if (!q) return true;
      const haystack = `${mat.name} ${mat.notes || ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [otherScrapMaterials, scrapCategoryFilter, scrapSearchQuery]);

  const handleDisconnectUsbScale = async () => {
    serialReaderCancelRef.current = true;
    setSerialConnected(false);
    try {
      if (serialPortRef.current && typeof serialPortRef.current.close === "function") {
        await serialPortRef.current.close();
      }
    } catch {}
    serialPortRef.current = null;
    setSerialStatusMsg("Balança USB desconectada. Você pode digitar o peso do visor normalmente.");
  };

  const handleConnectUsbScale = async () => {
    const navAny = navigator as any;
    if (!navAny || !navAny.serial) {
      setSerialStatusMsg(
        "Este celular/navegador não usa cabo USB direto (Web Serial). Sem problemas: olhe o visor da sua balança digital e digite o peso abaixo!"
      );
      if (showNotification) {
        showNotification("Use a balança digital normalmente e digite o peso do visor no campo abaixo! ⚖️", "info");
      }
      return;
    }

    try {
      const port = await navAny.serial.requestPort();
      await port.open({ baudRate: 9600 });
      serialPortRef.current = port;
      serialReaderCancelRef.current = false;
      setSerialConnected(true);
      setSerialStatusMsg("Balança USB conectada! Lendo peso em tempo real...");
      if (showNotification) {
        showNotification("Balança digital USB conectada ao app! ⚖️🔌", "success");
      }

      const decoder = new TextDecoderStream();
      port.readable.pipeTo(decoder.writable).catch(() => {});
      const reader = decoder.readable.getReader();
      let buffer = "";

      while (!serialReaderCancelRef.current) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          buffer += value;
          const lines = buffer.split(/[\r\n]+/);
          buffer = lines.pop() || "";
          for (const line of lines) {
            const match = line.match(/(\d+[.,]\d+|\d+)/);
            if (match) {
              const numericWeight = parseFloat(match[1].replace(",", "."));
              if (!isNaN(numericWeight) && numericWeight >= 0) {
                setScaleUnitMode("kg");
                setScaleGrossInput(numericWeight.toFixed(3).replace(/\.?0+$/, "") || "0");
              }
            }
          }
        }
      }
      reader.releaseLock();
    } catch (err: any) {
      setSerialConnected(false);
      if (err?.name !== "NotFoundError") {
        setSerialStatusMsg("Não foi possível ler a porta USB. Digite o peso direto do visor da sua balança.");
      }
    }
  };

  const handleAddReadingToScaleQueue = () => {
    if (scaleCurrentNetKg <= 0) {
      if (showNotification) showNotification("Digite o peso da balança maior que a tara antes de somar na lista.", "warning");
      return;
    }
    setScaleQueueReadings((prev) => [
      ...prev,
      {
        id: `pesada_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        grossKg: scaleGrossKg,
        tareKg: scaleAppliedTareKg,
        netKg: scaleCurrentNetKg,
        label: `Pesada #${prev.length + 1}`
      }
    ]);
    setScaleGrossInput("");
    playScannerBeep(980, 0.06);
  };

  const scrapBasketStats = useMemo(() => {
    const totalWeightKg = scrapBasket.reduce((s, item) => s + Math.max(0, item.weightKg), 0);
    const totalUnits = scrapBasket.reduce((s, item) => s + Math.max(0, item.units), 0);
    const subtotal = Number(
      scrapBasket.reduce((s, item) => s + Math.max(0, item.weightKg) * Math.max(0, item.pricePerKg), 0).toFixed(2)
    );
    const bonus = Math.max(0, Number((parseFloat(scrapBasketBonusInput.replace(",", ".")) || 0).toFixed(2)));
    const discount = Math.max(0, Number((parseFloat(scrapBasketDiscountInput.replace(",", ".")) || 0).toFixed(2)));
    const rawNet = Number((subtotal + bonus - discount).toFixed(2));
    const netPayable = Math.max(0, rawNet);
    const remainingDebt = rawNet < 0 ? Math.abs(rawNet) : 0;
    return { totalWeightKg, totalUnits, subtotal, bonus, discount, netPayable, remainingDebt };
  }, [scrapBasket, scrapBasketBonusInput, scrapBasketDiscountInput]);

  useEffect(() => {
    const mat = otherScrapMaterials.find((m) => m.id === scrapBasketQuickMatId);
    if (mat) {
      setScrapBasketQuickPrice(mat.buyPricePerKg > 0 ? String(mat.buyPricePerKg).replace(".", ",") : "");
    }
  }, [scrapBasketQuickMatId]);

  const handleAddItemToScrapBasket = ({
    material,
    weightKg,
    units,
    pricePerKg,
    addToStock
  }: {
    material: OtherScrapMaterial;
    weightKg: number;
    units?: number;
    pricePerKg: number;
    addToStock: boolean;
  }) => {
    const cleanW = Math.max(0, Number(weightKg.toFixed(3)));
    const cleanP = Math.max(0, Number.isFinite(pricePerKg) ? pricePerKg : 0);
    const cleanU = Math.max(0, Math.round(units || 0));
    if (cleanW <= 0 && cleanU <= 0) {
      if (showNotification) showNotification("Informe o peso (kg) antes de somar no recibo.", "warning");
      return;
    }

    if (cleanP > 0 && cleanP !== material.buyPricePerKg) {
      handleUpdateScrapPricePerKg(material.id, cleanP);
    }

    setScrapBasket((prev) => [
      ...prev,
      {
        id: `basket_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        materialId: material.id,
        materialName: material.name,
        emoji: material.emoji,
        weightKg: cleanW,
        units: cleanU,
        pricePerKg: cleanP,
        addToStock
      }
    ]);
    playScannerBeep(1040, 0.07);
    if (showNotification) {
      showNotification(
        `${material.emoji} ${material.name} (${cleanW.toFixed(2)} kg • R$ ${(cleanW * cleanP).toFixed(2).replace(".", ",")}) somado no Recibo do Dia! 🧺`,
        "success"
      );
    }
  };

  const resolveScrapCollaboratorTarget = ({
    collabChoiceId,
    collabMode,
    customName,
    wantCaderninho
  }: {
    collabChoiceId: string;
    collabMode: "cadastrado" | "sem_nome" | "nome_avulso";
    customName: string;
    wantCaderninho: boolean;
  }): {
    displayName: string;
    matchedCollab: CollaboratorAccount | null;
    isFounder: boolean;
    createdNewCollab: CollaboratorAccount | null;
  } => {
    if (collabMode === "sem_nome") {
      return {
        displayName: "Reciclador Avulso (Sem Nome)",
        matchedCollab: null,
        isFounder: false,
        createdNewCollab: null
      };
    }
    if (collabMode === "nome_avulso") {
      const trimmed = customName.trim();
      if (!trimmed) {
        return {
          displayName: "Reciclador Avulso (Sem Nome)",
          matchedCollab: null,
          isFounder: false,
          createdNewCollab: null
        };
      }
      const existing = collaborators.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
      if (existing) {
        return {
          displayName: existing.name,
          matchedCollab: existing,
          isFounder: !!existing.isFounder,
          createdNewCollab: null
        };
      }
      if (wantCaderninho) {
        const newCollab: CollaboratorAccount = {
          id: `collab_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
          name: trimmed,
          notes: "Cadastrado direto na pesagem/recibo",
          createdAt: new Date().toLocaleDateString("pt-BR"),
          totalDeliveries: 0,
          totalBottles: 0,
          totalWeightKg: 0,
          totalEarned: 0,
          totalPaid: 0,
          balancePending: 0
        };
        return {
          displayName: newCollab.name,
          matchedCollab: newCollab,
          isFounder: false,
          createdNewCollab: newCollab
        };
      }
      return {
        displayName: trimmed,
        matchedCollab: null,
        isFounder: false,
        createdNewCollab: null
      };
    }

    const found = collaborators.find((c) => c.id === collabChoiceId) || collaborators[0];
    return {
      displayName: found?.name || "Reciclador Avulso (Sem Nome)",
      matchedCollab: found || null,
      isFounder: !!found?.isFounder,
      createdNewCollab: null
    };
  };

  const commitScrapItemsWithAdjustments = ({
    entries,
    collabChoiceId,
    collabMode = scrapCollabMode,
    customName = scrapCustomCollabName,
    mode,
    bonusAmount = 0,
    bonusReason = "",
    discountAmount = 0,
    discountReason = ""
  }: {
    entries: {
      material: OtherScrapMaterial;
      weightKg: number;
      units: number;
      pricePerKg: number;
      addWeightToStock: boolean;
    }[];
    collabChoiceId: string;
    collabMode?: "cadastrado" | "sem_nome" | "nome_avulso";
    customName?: string;
    mode: "pago_dinheiro" | "pago_pix" | "caderninho" | "so_estoque";
    bonusAmount?: number;
    bonusReason?: string;
    discountAmount?: number;
    discountReason?: string;
  }) => {
    const validEntries = entries.filter((e) => e.weightKg > 0 || e.units > 0);
    if (validEntries.length === 0) return false;

    const totalWeightKg = Number(validEntries.reduce((s, e) => s + Math.max(0, e.weightKg), 0).toFixed(3));
    const totalUnits = validEntries.reduce((s, e) => s + Math.max(0, Math.round(e.units)), 0);
    const subtotalAmount = Number(
      validEntries
        .reduce((s, e) => s + Math.max(0, e.weightKg) * Math.max(0, e.pricePerKg), 0)
        .toFixed(2)
    );
    const cleanBonus = Math.max(0, Number((bonusAmount || 0).toFixed(2)));
    const cleanDiscount = Math.max(0, Number((discountAmount || 0).toFixed(2)));
    const netTotalAmount = Math.max(0, Number((subtotalAmount + cleanBonus - cleanDiscount).toFixed(2)));

    const isCaderninhoRequested = mode === "caderninho";
    const resolved = resolveScrapCollaboratorTarget({
      collabChoiceId,
      collabMode,
      customName,
      wantCaderninho: isCaderninhoRequested
    });

    if (isCaderninhoRequested && !resolved.matchedCollab) {
      if (showNotification) {
        showNotification("Para anotar no Caderninho, escolha um colaborador ou digite o nome dele!", "warning");
      }
      return false;
    }

    markLocalYardMutation();

    // 1. Atualiza estoque & preços dos materiais lançados
    setOtherScrapMaterials((prev) =>
      prev.map((m) => {
        const matchingEntries = validEntries.filter((e) => e.material.id === m.id);
        if (matchingEntries.length === 0) return m;
        const addKg = matchingEntries.reduce((s, e) => s + (e.addWeightToStock ? Math.max(0, e.weightKg) : 0), 0);
        const addUn = matchingEntries.reduce((s, e) => s + (e.addWeightToStock ? Math.max(0, Math.round(e.units)) : 0), 0);
        const lastPrice = matchingEntries[matchingEntries.length - 1].pricePerKg;
        return {
          ...m,
          buyPricePerKg: Math.max(0, Number.isFinite(lastPrice) ? lastPrice : m.buyPricePerKg),
          stockKg: Number((m.stockKg + addKg).toFixed(3)),
          stockUnits: (m.stockUnits || 0) + addUn
        };
      })
    );

    const isFounder = resolved.isFounder;
    const paidNow = !isFounder && (mode === "pago_dinheiro" || mode === "pago_pix");
    const shouldGenerateReceipt =
      isFounder || (mode !== "so_estoque" && (netTotalAmount > 0 || subtotalAmount > 0 || cleanDiscount > 0 || cleanBonus > 0));

    // 2. Atualiza Caderninho (se colaborador identificado ou recém-criado)
    if (shouldGenerateReceipt && resolved.matchedCollab) {
      const targetCollab = resolved.matchedCollab;
      if (resolved.createdNewCollab) {
        setSelectedCollabId(targetCollab.id);
        setScrapCollabMode("cadastrado");
        setScrapCustomCollabName("");
      }
      setCollaborators((prev) => {
        const listWithNew = resolved.createdNewCollab ? [...prev, resolved.createdNewCollab] : prev;
        return listWithNew.map((c) => {
          if (c.id !== targetCollab.id) return c;
          const newDeliveries = c.totalDeliveries + 1;
          const newWeight = Number((c.totalWeightKg + totalWeightKg).toFixed(3));
          const newEarned = Number((c.totalEarned + netTotalAmount).toFixed(2));
          if (c.isFounder) {
            return {
              ...c,
              totalDeliveries: newDeliveries,
              totalBottles: c.totalBottles + totalUnits,
              totalWeightKg: newWeight,
              totalEarned: newEarned,
              totalPaid: 0,
              balancePending: 0
            };
          }
          const addedPaid = paidNow ? netTotalAmount : 0;
          const newPaid = Number((c.totalPaid + addedPaid).toFixed(2));
          const newPending = Math.max(0, Number((newEarned - newPaid).toFixed(2)));
          return {
            ...c,
            totalDeliveries: newDeliveries,
            totalBottles: c.totalBottles + totalUnits,
            totalWeightKg: newWeight,
            totalEarned: newEarned,
            totalPaid: newPaid,
            balancePending: newPending
          };
        });
      });
    }

    // 3. Gera Recibo Único (com ou sem nome, 1 ou vários materiais, com acréscimo/desconto)
    if (shouldGenerateReceipt) {
      const paymentStatus: CompletedPurchaseTicket["paymentStatus"] = isFounder
        ? "coleta_propria_dw"
        : paidNow
        ? "pago_na_hora"
        : "pendente_caderninho";

      const ticketId = `ticket_scrap_${Date.now()}`;
      const pdvEventId = paidNow && netTotalAmount > 0 ? `pdv_fv_scrap_${ticketId}` : undefined;

      const ticket: CompletedPurchaseTicket = {
        id: ticketId,
        timestamp: new Date().toLocaleString("pt-BR"),
        collectorName: resolved.displayName,
        collaboratorId: resolved.matchedCollab?.id,
        isFounder,
        isScrapPurchase: true,
        syncedPdvEventId: pdvEventId,
        items: validEntries.map((e) => {
          const itemCost = Number((Math.max(0, e.weightKg) * Math.max(0, e.pricePerKg)).toFixed(2));
          return {
            name: `${e.material.emoji} ${e.material.name} (R$ ${e.pricePerKg.toFixed(2).replace(".", ",")}/kg)`,
            volumeMl: 0,
            barcode: "BALANCA",
            quantity: e.units > 0 ? e.units : 1,
            unitWeightGrams: Math.round(e.weightKg * 1000),
            totalWeightKg: Number(e.weightKg.toFixed(3)),
            costPaid: itemCost,
            materialId: e.material.id,
            addedToStock: e.addWeightToStock,
            stockUnitsAdded: e.addWeightToStock ? Math.max(0, Math.round(e.units)) : 0
          };
        }),
        totalBottles: totalUnits,
        totalWeightKg,
        subtotalAmount,
        bonusAmount: cleanBonus > 0 ? cleanBonus : undefined,
        bonusReason: bonusReason.trim() || undefined,
        discountAmount: cleanDiscount > 0 ? cleanDiscount : undefined,
        discountReason: discountReason.trim() || undefined,
        totalPaid: isFounder ? 0 : netTotalAmount,
        expectedPlantRevenue: 0,
        netProfit: 0,
        paymentStatus,
        sellPricePerTonUsed: activeSellPricePerTon
      };

      setPurchaseHistory((prev) => [ticket, ...prev.slice(0, 149)]);
      setLastPurchaseReceipt(ticket);

      if (syncToPdvCash && onSyncFinancialEventToPDV && pdvEventId && netTotalAmount > 0) {
        const itemsSummary = validEntries.map((e) => `${e.material.name} (${e.weightKg.toFixed(2)}kg)`).join(" + ");
        onSyncFinancialEventToPDV({
          id: pdvEventId,
          type: "saida",
          amount: netTotalAmount,
          description: `COMPRA RECICLAGEM: ${resolved.displayName.toUpperCase()} — ${itemsSummary}`,
          paymentMethod: mode === "pago_pix" ? "pix" : "dinheiro",
          category: "despesa",
          clientName: resolved.displayName
        });
      }
    }

    playScannerBeep(1180, 0.09);

    if (showNotification) {
      const countLabel = validEntries.length > 1 ? `${validEntries.length} materiais (${totalWeightKg.toFixed(2)} kg)` : `${validEntries[0].material.emoji} ${validEntries[0].material.name} (${totalWeightKg.toFixed(2)} kg)`;
      if (shouldGenerateReceipt && !isFounder) {
        if (paidNow) {
          showNotification(
            `Recibo fechado! ${countLabel} • Pago R$ ${netTotalAmount.toFixed(2).replace(".", ",")} (${resolved.displayName})! 💵✅`,
            "success"
          );
        } else {
          showNotification(
            `Anotado no Caderninho! ${countLabel} • R$ ${netTotalAmount.toFixed(2).replace(".", ",")} para ${resolved.displayName}! 📓✅`,
            "info"
          );
        }
      } else {
        showNotification(`${countLabel} lançado no estoque! ⚖️✅`, "success");
      }
    }
    return true;
  };

  const registerScrapPurchaseForCollaborator = ({
    material,
    weightKg,
    units,
    pricePerKg,
    collabId,
    collabMode,
    customName,
    mode,
    addWeightToStock
  }: {
    material: OtherScrapMaterial;
    weightKg: number;
    units: number;
    pricePerKg: number;
    collabId: string;
    collabMode?: "cadastrado" | "sem_nome" | "nome_avulso";
    customName?: string;
    mode: "pago_dinheiro" | "pago_pix" | "caderninho" | "so_estoque";
    addWeightToStock: boolean;
  }) => {
    return commitScrapItemsWithAdjustments({
      entries: [
        {
          material,
          weightKg,
          units,
          pricePerKg,
          addWeightToStock
        }
      ],
      collabChoiceId: collabId,
      collabMode,
      customName,
      mode
    });
  };

  const handleCommitDigitalScaleToStock = () => {
    if (!selectedScaleMaterial) return;
    const totalWeightToAddKg = scaleQueueTotalNetKg + scaleCurrentNetKg;
    const unitsToAdd = Math.max(0, parseInt(scaleUnitsInput || "0", 10) || 0);

    if (totalWeightToAddKg <= 0 && unitsToAdd <= 0) {
      if (showNotification) {
        showNotification("Informe o peso da balança digital (ou a quantidade em unidades) para lançar.", "warning");
      }
      return;
    }

    registerScrapPurchaseForCollaborator({
      material: selectedScaleMaterial,
      weightKg: totalWeightToAddKg,
      units: unitsToAdd,
      pricePerKg: scaleEffectivePricePerKg,
      collabId: activeCollab?.id || selectedCollabId,
      mode: scaleSettlementMode,
      addWeightToStock: true
    });

    setScaleGrossInput("");
    setScaleUnitsInput("");
    setScaleQueueReadings([]);
  };

  const handleSelectMaterialForScale = (materialId: string) => {
    setScaleSelectedMaterialId(materialId);
    setActiveSector("reciclagem");
    setYardControlFilter("outros");
    setActiveTab("estoque");
    setTimeout(() => {
      digitalScalePanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  };

  const handleConfirmScrapSale = () => {
    if (!sellingScrapMaterial) return;
    const kgToDeduct = Math.max(0, parseFloat(scrapSaleKgDraft.replace(",", ".")) || 0);
    const unitsToDeduct = Math.max(0, parseInt(scrapSaleUnitsDraft || "0", 10) || 0);
    const saleAmount = Math.max(0, parseFloat(scrapSaleTotalValueDraft.replace(",", ".")) || 0);

    if (kgToDeduct <= 0 && unitsToDeduct <= 0) {
      if (showNotification) showNotification("Informe o peso (kg) ou unidades para dar baixa no lote.", "warning");
      return;
    }

    const buyPerKg = Math.max(0, Number(sellingScrapMaterial.buyPricePerKg) || 0);
    const estimatedCost = Number((kgToDeduct * buyPerKg).toFixed(2));
    const sellPerKgActual = kgToDeduct > 0 && saleAmount > 0 ? Number((saleAmount / kgToDeduct).toFixed(2)) : Number(sellingScrapMaterial.sellPricePerKg || 0);
    const profitAmount = saleAmount > 0 ? Number((saleAmount - estimatedCost).toFixed(2)) : 0;

    markLocalYardMutation();
    setOtherScrapMaterials((prev) =>
      prev.map((m) =>
        m.id === sellingScrapMaterial.id
          ? {
              ...m,
              stockKg: Math.max(0, Number((m.stockKg - kgToDeduct).toFixed(3))),
              stockUnits: Math.max(0, (m.stockUnits || 0) - unitsToDeduct)
            }
          : m
      )
    );

    const buyerLabel = scrapSaleBuyerDraft.trim() || "Comprador Reciclagem";
    const saleId = `scrap_sale_${Date.now()}`;
    const pdvSaleEventId = saleAmount > 0 ? `pdv_fv_sale_${saleId}` : undefined;
    if (saleAmount > 0 || kgToDeduct > 0) {
      const saleRecord: ScrapSaleRecord = {
        id: saleId,
        timestamp: new Date().toLocaleString("pt-BR"),
        materialId: sellingScrapMaterial.id,
        materialName: sellingScrapMaterial.name,
        emoji: sellingScrapMaterial.emoji,
        weightKg: Number(kgToDeduct.toFixed(3)),
        units: unitsToDeduct,
        buyPricePerKgAtSale: buyPerKg,
        estimatedBuyCost: estimatedCost,
        sellPricePerKgActual: sellPerKgActual,
        revenueReceived: Number(saleAmount.toFixed(2)),
        profitAmount,
        buyerName: buyerLabel,
        paymentMethod: scrapSaleMethod,
        syncedPdvEventId: pdvSaleEventId
      };
      setScrapSalesHistory((prev) => [saleRecord, ...prev.slice(0, 149)]);
    }

    if (syncToPdvCash && onSyncFinancialEventToPDV && pdvSaleEventId && saleAmount > 0) {
      onSyncFinancialEventToPDV({
        id: pdvSaleEventId,
        type: "entrada",
        amount: saleAmount,
        description: `VENDA RECICLAGEM: ${sellingScrapMaterial.name.toUpperCase()} (${kgToDeduct.toFixed(1)} kg${unitsToDeduct > 0 ? ` / ${unitsToDeduct} un` : ""})`,
        paymentMethod: scrapSaleMethod,
        category: "venda",
        clientName: buyerLabel,
        items: [
          {
            name: `${sellingScrapMaterial.emoji} ${sellingScrapMaterial.name} (${kgToDeduct.toFixed(1)} kg)`,
            price: saleAmount,
            quantity: 1,
            unit: "lote"
          }
        ]
      });
    }

    const soldName = sellingScrapMaterial.name;
    setSellingScrapMaterial(null);
    setScrapSaleKgDraft("");
    setScrapSaleUnitsDraft("");
    setScrapSaleTotalValueDraft("");
    setScrapSaleBuyerDraft("");
    playScannerBeep(2100, 0.12);

    if (showNotification) {
      const profitText =
        saleAmount > 0 && buyPerKg > 0
          ? ` • Lucro: ${profitAmount >= 0 ? "+" : ""}R$ ${profitAmount.toFixed(2).replace(".", ",")}`
          : "";
      showNotification(
        `Venda/Baixa em ${soldName} (-${kgToDeduct.toFixed(1)} kg)${saleAmount > 0 ? ` • Recebido R$ ${saleAmount.toFixed(2).replace(".", ",")}` : ""}${profitText} 🚚✅`,
        "success"
      );
    }
  };

  const handleCreateCustomScrapMaterial = () => {
    const cleanName = newScrapName.trim();
    if (!cleanName) {
      if (showNotification) showNotification("Digite o nome do novo material do ferro velho.", "warning");
      return;
    }
    const created: OtherScrapMaterial = {
      id: `scrap_custom_${Date.now()}`,
      name: cleanName,
      emoji: newScrapEmoji || "♻️",
      categoryGroup: newScrapGroup,
      stockKg: 0,
      stockUnits: 0,
      trackUnits: newScrapTrackUnits,
      buyPricePerKg: 0,
      sellPricePerKg: 0,
      notes: newScrapNotes.trim() || "Sem preço definido ainda",
      isCustom: true
    };
    markLocalYardMutation();
    setOtherScrapMaterials((prev) => [...prev, created]);
    setScaleSelectedMaterialId(created.id);
    setScrapCategoryFilter("todos");
    setNewScrapName("");
    setNewScrapNotes("");
    setNewScrapTrackUnits(false);
    setShowAddCustomScrapForm(false);
    if (showNotification) {
      showNotification(`${created.emoji} ${created.name} configurado (sem preço definido ainda)! ✅`, "success");
    }
  };

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

  // Pastas organizadas automaticamente por Colaborador da Reciclagem (Compras + Pagamentos + Saldo)
  const collaboratorFolders = useMemo(() => {
    interface FolderEntry {
      key: string;
      name: string;
      collaborator?: CollaboratorAccount;
      isFounder: boolean;
      tickets: CompletedPurchaseTicket[];
      payments: CollaboratorPaymentReceipt[];
      totalBoughtAmount: number;
      totalWeightKg: number;
      totalPaidDirectAmount: number;
      totalPaidSettlementAmount: number;
      totalPendingDebtAmount: number;
      activeCount: number;
      cancelledCount: number;
    }

    const folderMap = new Map<string, FolderEntry>();
    const normalizeNameKey = (raw: string) =>
      String(raw || "Sem Nome / Balcão")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");

    collaborators.forEach((c) => {
      const key = `collab:${c.id}`;
      folderMap.set(key, {
        key,
        name: c.name,
        collaborator: c,
        isFounder: Boolean(c.isFounder),
        tickets: [],
        payments: [],
        totalBoughtAmount: 0,
        totalWeightKg: 0,
        totalPaidDirectAmount: 0,
        totalPaidSettlementAmount: 0,
        totalPendingDebtAmount: 0,
        activeCount: 0,
        cancelledCount: 0
      });
    });

    const resolveFolderForNameAndId = (collabId?: string, rawName?: string): FolderEntry => {
      if (collabId) {
        const direct = folderMap.get(`collab:${collabId}`);
        if (direct) return direct;
      }
      const norm = normalizeNameKey(rawName || "Sem Nome / Balcão");
      for (const entry of folderMap.values()) {
        if (normalizeNameKey(entry.name) === norm) {
          return entry;
        }
      }
      const customKey = `name:${norm}`;
      let existing = folderMap.get(customKey);
      if (!existing) {
        existing = {
          key: customKey,
          name: rawName?.trim() || "Sem Nome / Balcão",
          isFounder: false,
          tickets: [],
          payments: [],
          totalBoughtAmount: 0,
          totalWeightKg: 0,
          totalPaidDirectAmount: 0,
          totalPaidSettlementAmount: 0,
          totalPendingDebtAmount: 0,
          activeCount: 0,
          cancelledCount: 0
        };
        folderMap.set(customKey, existing);
      }
      return existing;
    };

    purchaseHistory.forEach((tk) => {
      const folder = resolveFolderForNameAndId(tk.collaboratorId, tk.collectorName);
      folder.tickets.push(tk);
      if (tk.isCancelled) {
        folder.cancelledCount += 1;
      } else {
        folder.activeCount += 1;
        folder.totalWeightKg += tk.totalWeightKg || 0;
        if (!tk.isFounder) {
          folder.totalBoughtAmount += tk.totalPaid || 0;
          if (tk.paymentStatus === "pago_na_hora") {
            folder.totalPaidDirectAmount += tk.totalPaid || 0;
          }
        }
      }
    });

    paymentHistory.forEach((pay) => {
      const folder = resolveFolderForNameAndId(pay.collaboratorId, pay.collaboratorName);
      folder.payments.push(pay);
      if (pay.isCancelled) {
        folder.cancelledCount += 1;
      } else {
        folder.activeCount += 1;
        folder.totalPaidSettlementAmount += pay.amountPaid || 0;
      }
    });

    // Sincroniza saldo oficial do Caderninho (separando fundadores de parceiros pagos e evitando saldo fantasma sem recibos ativos)
    folderMap.forEach((entry) => {
      if (entry.isFounder) {
        entry.totalBoughtAmount = 0;
        entry.totalPaidDirectAmount = 0;
        entry.totalPaidSettlementAmount = 0;
        entry.totalPendingDebtAmount = 0;
      } else if (entry.collaborator) {
        const activeTicketsCount = entry.tickets.filter((t) => !t.isCancelled).length;
        const activePaymentsCount = entry.payments.filter((p) => !p.isCancelled).length;
        if (activeTicketsCount === 0 && activePaymentsCount === 0) {
          entry.totalBoughtAmount = 0;
          entry.totalWeightKg = 0;
          entry.totalPendingDebtAmount = 0;
        } else {
          entry.totalBoughtAmount = Math.max(entry.totalBoughtAmount, entry.collaborator.totalEarned || 0);
          entry.totalWeightKg = Math.max(entry.totalWeightKg, entry.collaborator.totalWeightKg || 0);
          entry.totalPendingDebtAmount = entry.collaborator.balancePending || 0;
        }
      } else {
        entry.totalPendingDebtAmount = 0;
      }
    });

    return Array.from(folderMap.values()).sort((a, b) => {
      const aScore = (a.totalPendingDebtAmount > 0 ? 100000 : 0) + a.activeCount * 100 + a.tickets.length + a.payments.length;
      const bScore = (b.totalPendingDebtAmount > 0 ? 100000 : 0) + b.activeCount * 100 + b.tickets.length + b.payments.length;
      if (bScore !== aScore) return bScore - aScore;
      return a.name.localeCompare(b.name, "pt-BR");
    });
  }, [collaborators, purchaseHistory, paymentHistory]);

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
                const trimmed = decodedText.trim();
                if (!trimmed) return;
                const now = Date.now();
                const isTargetSearch = cameraTargetFieldRef.current === "search";
                if (isTargetSearch && continuousBeepModeRef.current) {
                  if (
                    lastScannedCooldownRef.current &&
                    lastScannedCooldownRef.current.code === trimmed &&
                    now - lastScannedCooldownRef.current.at < 1400
                  ) {
                    return;
                  }
                  lastScannedCooldownRef.current = { code: trimmed, at: now };
                  playScannerBeep(2150, 0.08);
                  handleProcessBarcodeRef.current(trimmed, true);
                  return;
                }
                playScannerBeep(2100, 0.09);
                handleProcessBarcodeRef.current(trimmed, false);
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

  const handleProcessBarcodeRef = useRef<(code: string, fromContinuousCamera?: boolean) => void>(() => {});

  // Vincular código bipado a um grupo/garrafa já cadastrado (preenchendo slot 1..5 automaticamente)
  const handleLinkBarcodeToBottle = (bottleId: string, rawCode: string) => {
    const clean = rawCode.replace(/[\r\n\t\s]+/g, "").trim();
    if (!clean) return;
    let updatedBottle: CatalogBottleItem | null = null;
    markLocalYardMutation();
    setCatalog((prev) =>
      prev.map((b) => {
        if (b.id !== bottleId) return b;
        const primary = (b.barcode || "").trim();
        const extras = Array.isArray(b.additionalBarcodes) ? [...b.additionalBarcodes.filter(Boolean)] : [];
        if (primary === clean || extras.includes(clean)) {
          updatedBottle = b;
          return b;
        }
        if (!primary) {
          updatedBottle = { ...b, barcode: clean, additionalBarcodes: extras };
        } else if (extras.length < 4) {
          updatedBottle = { ...b, additionalBarcodes: [...extras, clean] };
        } else {
          // Substitui o 5º código caso já tenha 4 extras
          updatedBottle = { ...b, additionalBarcodes: [...extras.slice(0, 3), clean] };
        }
        return updatedBottle;
      })
    );
    setUnmatchedBarcodePrompt(null);
    playScannerBeep(2300, 0.12);
    if (updatedBottle) {
      const matchedItem = updatedBottle as CatalogBottleItem;
      setLastMatchedBottleId(matchedItem.id);
      if (continuousBeepModeRef.current) {
        const qtyToAdd = Math.max(1, continuousBatchQtyRef.current || 1);
        handleAddBottleToCart(matchedItem, qtyToAdd);
        setLastBeepHud({
          bottleId: matchedItem.id,
          bottleName: matchedItem.name,
          emoji: matchedItem.emoji,
          code: clean,
          addedQty: qtyToAdd,
          unitGrams: matchedItem.unitWeightGrams,
          timestamp: Date.now()
        });
      } else {
        const safeLot = getVictorSafeLotUnits(matchedItem.category, sellPricePerKg, matchedItem.unitWeightGrams);
        setScannedPrompt({ bottle: matchedItem, matchedCode: clean });
        setScannedPromptQtyStr(String(safeLot || 1));
      }
      if (showNotification) {
        showNotification(`Código ${clean} vinculado em "${matchedItem.name}"! 🔗✅`, "success");
      }
    }
  };

  // Bipagem de Código de Barras (Suporta 1 a 5 códigos por garrafa + Modo Só Bipar Contínuo + Vinculador Inteligente)
  const handleProcessBarcode = (code: string, fromContinuousCamera = false) => {
    if (!code) return;
    const clean = code.replace(/[\r\n\t\s]+/g, "").trim();
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
      setLastMatchedBottleId(matched.id);
      if (continuousBeepModeRef.current) {
        const qtyToAdd = Math.max(1, continuousBatchQtyRef.current || 1);
        handleAddBottleToCart(matched, qtyToAdd);
        setLastBeepHud({
          bottleId: matched.id,
          bottleName: matched.name,
          emoji: matched.emoji,
          code: clean,
          addedQty: qtyToAdd,
          unitGrams: matched.unitWeightGrams,
          timestamp: Date.now()
        });
        if (showNotification) {
          showNotification(`⚡ +${qtyToAdd} un ${matched.name} (${matched.unitWeightGrams}g) no carrinho!`, "success");
        }
      } else {
        const safeLot = getVictorSafeLotUnits(matched.category, sellPricePerKg, matched.unitWeightGrams);
        setScannedPrompt({ bottle: matched, matchedCode: clean });
        setScannedPromptQtyStr(String(safeLot || 1));
        if (showNotification) {
          showNotification(`Identificado: ${matched.name}! Digite ou confirme a quantidade. 🏷️🍾`, "success");
        }
      }
    } else {
      if (fromContinuousCamera) {
        setShowCameraModal(false);
      }
      setUnmatchedBarcodePrompt({ code: clean });
      if (showNotification) {
        showNotification(`Código ${clean} novo! Vincule a uma garrafa já cadastrada ou crie uma nova. 🔗`, "info");
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
    markLocalYardMutation();
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
    markLocalYardMutation();
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
    markLocalYardMutation();
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
    setLastMatchedBottleId(saved.id);

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
    markLocalYardMutation();
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
    markLocalYardMutation();
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

    markLocalYardMutation();

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
            // Denise e Wellington: não há pagamento a terceiros nem dívida, é pura economia e coleta própria!
            return {
              ...collab,
              totalDeliveries: newDeliveries,
              totalBottles: newBottles,
              totalWeightKg: newWeight,
              totalEarned: newEarned,
              totalPaid: 0,
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
    const glassTicketId = `ticket_${Date.now()}`;
    const glassPdvEventId = !isFounder && settlementMode === "pago_na_hora" && cartTotals.totalBuyCost > 0
      ? `pdv_fv_buy_${glassTicketId}`
      : undefined;

    const ticket: CompletedPurchaseTicket = {
      id: glassTicketId,
      timestamp: new Date().toLocaleString("pt-BR"),
      collectorName: activeCollab.name,
      collaboratorId: activeCollab.id,
      isFounder,
      syncedPdvEventId: glassPdvEventId,
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

    setPurchaseHistory((prev) => [ticket, ...prev.slice(0, 149)]);
    setLastPurchaseReceipt(ticket);
    setShowCheckoutModal(false);

    // 3.5 Integra pagamento feito na hora no portão com Caixa & Relatórios do PDV
    if (syncToPdvCash && onSyncFinancialEventToPDV && glassPdvEventId && ticket.totalPaid > 0) {
      onSyncFinancialEventToPDV({
        id: glassPdvEventId,
        type: "saida",
        amount: ticket.totalPaid,
        description: `COMPRA VIDROS PORTÃO: ${activeCollab.name.toUpperCase()} (${ticket.totalBottles} un / ${ticket.totalWeightKg.toFixed(1)} kg)`,
        paymentMethod: "dinheiro",
        category: "despesa",
        clientName: activeCollab.name
      });
    }

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
    markLocalYardMutation();
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

    const payId = `pay_${Date.now()}`;
    const payPdvEventId = `pdv_fv_pay_${payId}`;

    // Salva comprovante
    const receipt: CollaboratorPaymentReceipt = {
      id: payId,
      timestamp: new Date().toLocaleString("pt-BR"),
      collaboratorId: payingCollab.id,
      collaboratorName: payingCollab.name,
      amountPaid: amount,
      paymentMethod: payMethod,
      methodLabel: methodLabels[payMethod] || payMethod,
      notes: payNotes,
      previousBalance: prevPending,
      remainingBalance: remaining,
      syncedPdvEventId: payPdvEventId
    };

    setPaymentHistory((prev) => [receipt, ...prev.slice(0, 149)]);
    setLatestSettledReceipt(receipt);
    setPayingCollab(null);

    if (syncToPdvCash && onSyncFinancialEventToPDV && amount > 0) {
      onSyncFinancialEventToPDV({
        id: payPdvEventId,
        type: "saida",
        amount,
        description: `ACERTO CADERNINHO RECICLAGEM: ${payingCollab.name.toUpperCase()}`,
        paymentMethod: payMethod === "pix" ? "pix" : "dinheiro",
        category: "despesa",
        clientName: payingCollab.name
      });
    }

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

    markLocalYardMutation();
    setTruckShipments((prev) => [shipment, ...prev]);

    if (syncToPdvCash && onSyncFinancialEventToPDV && shipment.grossRevenueReceived > 0) {
      onSyncFinancialEventToPDV({
        id: `pdv_fv_ship_${shipment.id}`,
        type: "entrada",
        amount: shipment.grossRevenueReceived,
        description: `CARGA DESPACHADA VIDROS: ${shipment.buyerName.toUpperCase()} (${shipment.totalWeightTon.toFixed(2)}t)`,
        paymentMethod: "pix",
        category: "venda",
        clientName: shipment.buyerName,
        items: [
          {
            name: `🚚 Carga de Vidros (${shipment.totalWeightTon.toFixed(2)} Toneladas)`,
            price: shipment.grossRevenueReceived,
            quantity: 1,
            unit: "carga"
          }
        ]
      });
    }

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
    markLocalYardMutation();
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

    // 4. Zera históricos de compras de teste, acertos de teste, despachos, vendas sucata e outros materiais
    setPurchaseHistory([]);
    setPaymentHistory([]);
    setTruckShipments([]);
    setScrapSalesHistory([]);
    const zeroedOtherScrap = otherScrapMaterials.map((m) => ({ ...m, stockKg: 0, stockUnits: 0 }));
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
      localStorage.removeItem("pdv_dw_scrap_sales_v1");
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

  // Zerar APENAS o estoque do Ferro Velho (Outros Materiais), mantendo Vidros, Preços e Caderninho intactos
  const handleZeroOnlyScrapStock = () => {
    markLocalYardMutation();
    const zeroedOtherScrap = otherScrapMaterials.map((m) => ({
      ...m,
      stockKg: 0,
      stockUnits: 0
    }));
    setOtherScrapMaterials(zeroedOtherScrap);
    setScrapSalesHistory([]);
    setShowZeroOnlyScrapConfirm(false);
    setShowZeroConfirmModal(false);

    try {
      localStorage.setItem("pdv_dw_other_scrap_materials_v1", JSON.stringify(zeroedOtherScrap));
      localStorage.removeItem("pdv_dw_scrap_sales_v1");
      window.dispatchEvent(new CustomEvent("dw_glass_yard_updated"));
    } catch {}

    if (showNotification) {
      showNotification(
        "♻️ Estoque do Ferro Velho zerado para 0,0 kg! Seus vidros, preços de compra/revenda e caderninho foram mantidos.",
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

    markLocalYardMutation();
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

  const handleSetReceiptCopiesMode = (copies: 1 | 2) => {
    setReceiptCopiesMode(copies);
    try {
      localStorage.setItem("pdv_dw_receipt_copies_mode", String(copies));
    } catch {}
    const nextCfg: PrinterConfig = {
      ...loadPrinterConfig(),
      ...printerConfigState,
      printTwoCopies: copies === 2
    };
    setPrinterConfigState(nextCfg);
    savePrinterConfig(nextCfg);
  };

  const handleActivateMiniPrintPocket = () => {
    const nextCfg = buildMiniPrintPocketConfig(loadPrinterConfig(), receiptCopiesMode === 2);
    setPrinterConfigState(nextCfg);
    savePrinterConfig(nextCfg);
    if (showNotification) {
      showNotification(
        `MiniPrint PocketTM (57×30mm / Fun Print) ativada para ${receiptCopiesMode === 2 ? "2 Vias (D.W + Reciclador)" : "1 Via"}! 🐱🖨️`,
        "success"
      );
    }
  };

  const getTicketCollabSnapshot = (ticket: CompletedPurchaseTicket) => {
    const matched = collaborators.find(
      (c) =>
        (ticket.collaboratorId && c.id === ticket.collaboratorId) ||
        c.name.trim().toLowerCase() === ticket.collectorName.trim().toLowerCase()
    );
    if (!matched || matched.isFounder) return undefined;
    return {
      totalEarned: matched.totalEarned,
      totalPaid: matched.totalPaid,
      balancePending: matched.balancePending,
      totalWeightKg: matched.totalWeightKg,
      totalDeliveries: matched.totalDeliveries
    };
  };

  const buildTicketReceiptPayload = (
    ticket: CompletedPurchaseTicket,
    copies: 1 | 2
  ): ThermalCanvasReceiptPayload => {
    const cfg = loadPrinterConfig();
    const statusLabel =
      ticket.paymentStatus === "coleta_propria_dw"
        ? "COLETA PRÓPRIA D.W (100% EMPRESA)"
        : ticket.paymentStatus === "pago_na_hora"
        ? "PAGO NA HORA (PORTÃO / CAIXA)"
        : "LANÇADO NO CADERNINHO (A ACERTAR)";

    const lines = ticket.items.map((it) => ({
      left: `${it.name.toUpperCase()}${it.volumeMl > 0 ? ` (${it.volumeMl}ml)` : ""}`,
      right: `R$ ${it.costPaid.toFixed(2).replace(".", ",")}`,
      detail:
        it.volumeMl > 0
          ? `${it.quantity} un x ${it.unitWeightGrams}g = ${it.totalWeightKg.toFixed(2)} kg`
          : `Peso Líquido: ${it.totalWeightKg.toFixed(2)} kg`,
      bold: true
    }));

    const summaryLines: ThermalCanvasReceiptPayload["summaryLines"] = [];
    if (!ticket.isScrapPurchase && ticket.totalBottles > 0) {
      summaryLines.push({ label: "QTD GARRAFAS:", value: `${ticket.totalBottles} un`, bold: true });
    }
    summaryLines.push({
      label: ticket.isScrapPurchase ? "PESO COMPRADO:" : "PESO SOMADO:",
      value: `+${ticket.totalWeightKg.toFixed(2)} kg`,
      bold: true
    });
    if (
      typeof ticket.subtotalAmount === "number" &&
      ((ticket.bonusAmount || 0) > 0 || (ticket.discountAmount || 0) > 0)
    ) {
      summaryLines.push({
        label: "SUBTOTAL MATERIAIS:",
        value: `R$ ${ticket.subtotalAmount.toFixed(2).replace(".", ",")}`
      });
    }
    if ((ticket.bonusAmount || 0) > 0) {
      summaryLines.push({
        label: `(+) ACRÉSCIMO${ticket.bonusReason ? ` (${ticket.bonusReason})` : ""}:`,
        value: `+R$ ${(ticket.bonusAmount || 0).toFixed(2).replace(".", ",")}`,
        bold: true
      });
    }
    if ((ticket.discountAmount || 0) > 0) {
      summaryLines.push({
        label: `(-) DESCONTO/VALE${ticket.discountReason ? ` (${ticket.discountReason})` : ""}:`,
        value: `-R$ ${(ticket.discountAmount || 0).toFixed(2).replace(".", ",")}`,
        bold: true
      });
    }
    if (ticket.isFounder) {
      summaryLines.push({
        label: "ECONOMIA D.W:",
        value: `R$ ${ticket.items.reduce((s, it) => s + it.costPaid, 0).toFixed(2).replace(".", ",")}`,
        bold: true
      });
    }
    summaryLines.push({
      label: ticket.isFounder ? "TOTAL A PAGAR:" : "TOTAL LÍQUIDO:",
      value: `R$ ${ticket.isFounder ? "0,00" : ticket.totalPaid.toFixed(2).replace(".", ",")}`,
      big: true,
      bold: true,
      strike: Boolean(ticket.isCancelled)
    });

    return {
      title: ticket.isScrapPurchase
        ? "RECIBO DE COMPRA - RECICLAGEM"
        : "COMPROVANTE DE COMPRA - VIDROS",
      storeName: cfg.storeName || "D.W VIDROS & RECICLAGEM",
      storeCnpj: cfg.storeCnpjCpf || "67.965.725/0001-95",
      dateStr: ticket.timestamp,
      ticketId: ticket.id,
      collaboratorName: ticket.collectorName,
      statusLabel,
      extraMeta: ticket.isScrapPurchase
        ? ["MODALIDADE: FERRO VELHO & RECICLAGEM"]
        : [
            `COTAÇÃO VICTOR: R$ ${ticket.sellPricePerTonUsed || 150}/t (R$ ${((ticket.sellPricePerTonUsed || 150) / 1000)
              .toFixed(2)
              .replace(".", ",")}/kg)`
          ],
      isCancelled: ticket.isCancelled,
      cancelReason: ticket.cancelReason,
      cancelledAt: ticket.cancelledAt,
      lines,
      summaryLines,
      caderninhoBox: getTicketCollabSnapshot(ticket),
      footerNote: "Pasta do colaborador atualizada! Confira os cálculos.",
      copies
    };
  };

  // Imprimir Notinha / Cupom Térmico de Compra no Portão (MiniPrint 57mm / 58mm / 80mm / A4 - 1 ou 2 vias)
  const handlePrintGlassTicket = (ticket: CompletedPurchaseTicket, copiesOverride?: 1 | 2) => {
    const config = { ...loadPrinterConfig(), ...printerConfigState };
    const copies: 1 | 2 = copiesOverride || receiptCopiesMode || (config.printTwoCopies ? 2 : 1);
    const payload = buildTicketReceiptPayload(ticket, copies);
    const html = buildThermalDocumentHtmlFromPayload(payload, config);
    executeThermalPrint(
      html,
      () => {
        if (showNotification) {
          showNotification(
            `Notinha enviada para impressão em ${copies === 2 ? "2 Vias (D.W + Reciclador)" : "1 Via"}! 🖨️🧾`,
            "success"
          );
        }
      },
      () => {
        if (showNotification) {
          showNotification("Não foi possível abrir a janela de impressão. Use o botão Fun Print (PNG 57mm).", "warning");
        }
      }
    );
  };

  const handleShareTicketFunPrint = async (ticket: CompletedPurchaseTicket, copiesOverride?: 1 | 2) => {
    const copies: 1 | 2 = copiesOverride || receiptCopiesMode || 1;
    setIsGeneratingFunPrint(true);
    try {
      const payload = buildTicketReceiptPayload(ticket, copies);
      const blob = await generateMiniPrint57mmPngBlob(payload);
      const safeCollab = ticket.collectorName.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 18);
      const result = await shareOrDownloadReceiptPng(
        blob,
        `recibo_${safeCollab}_${copies}vias_57mm.png`,
        `Recibo 57mm - ${ticket.collectorName}`
      );
      if (showNotification) {
        showNotification(
          result === "shared"
            ? `Imagem 57mm (${copies} ${copies === 1 ? "Via" : "Vias"}) pronta! Selecione o app Fun Print para imprimir na MiniPrint PocketTM. 🐱🖨️`
            : `Imagem 57mm salva (${copies} ${copies === 1 ? "Via" : "Vias"})! Abra no app Fun Print -> Imprimir Imagem. 🐱📥`,
          "success"
        );
      }
    } catch (err: any) {
      if (showNotification) {
        showNotification(err?.message || "Erro ao gerar imagem 57mm para Fun Print.", "error");
      }
    } finally {
      setIsGeneratingFunPrint(false);
    }
  };

  const buildPaymentReceiptPayload = (
    receipt: CollaboratorPaymentReceipt,
    copies: 1 | 2
  ): ThermalCanvasReceiptPayload => {
    const cfg = loadPrinterConfig();
    const matched = collaborators.find((c) => c.id === receipt.collaboratorId);
    return {
      title: "RECIBO DE PAGAMENTO / ACERTO",
      subtitle: "CADERNINHO DA RECICLAGEM",
      storeName: cfg.storeName || "D.W VIDROS & RECICLAGEM",
      storeCnpj: cfg.storeCnpjCpf || "67.965.725/0001-95",
      dateStr: receipt.timestamp,
      ticketId: receipt.id,
      collaboratorName: receipt.collaboratorName,
      statusLabel: `PAGO (${receipt.methodLabel.toUpperCase()})`,
      extraMeta: receipt.notes ? [`OBS: ${receipt.notes}`] : undefined,
      lines: [
        {
          left: `ACERTO RECEBIDO (${receipt.methodLabel})`,
          right: `R$ ${receipt.amountPaid.toFixed(2).replace(".", ",")}`,
          detail: `Saldo Anterior no Caderninho: R$ ${receipt.previousBalance.toFixed(2).replace(".", ",")}`,
          bold: true
        }
      ],
      summaryLines: [
        {
          label: "SALDO ANTERIOR:",
          value: `R$ ${receipt.previousBalance.toFixed(2).replace(".", ",")}`
        },
        {
          label: "VALOR PAGO AGORA:",
          value: `R$ ${receipt.amountPaid.toFixed(2).replace(".", ",")}`,
          big: true,
          bold: true
        },
        {
          label: "RESTANTE A ACERTAR:",
          value: `R$ ${receipt.remainingBalance.toFixed(2).replace(".", ",")}`,
          bold: true
        }
      ],
      caderninhoBox: matched
        ? {
            totalEarned: matched.totalEarned,
            totalPaid: matched.totalPaid,
            balancePending: matched.balancePending,
            totalWeightKg: matched.totalWeightKg,
            totalDeliveries: matched.totalDeliveries
          }
        : undefined,
      footerNote: "Recibo de pagamento conferido (Empresa + Reciclador).",
      copies
    };
  };

  const handlePrintPaymentReceipt = (receipt: CollaboratorPaymentReceipt, copiesOverride?: 1 | 2) => {
    const config = { ...loadPrinterConfig(), ...printerConfigState };
    const copies: 1 | 2 = copiesOverride || receiptCopiesMode || (config.printTwoCopies ? 2 : 1);
    const payload = buildPaymentReceiptPayload(receipt, copies);
    const html = buildThermalDocumentHtmlFromPayload(payload, config);
    executeThermalPrint(
      html,
      () => {
        if (showNotification) {
          showNotification(`Recibo de acerto enviado em ${copies === 2 ? "2 Vias" : "1 Via"}! 🖨️🧾`, "success");
        }
      },
      () => {
        if (showNotification) {
          showNotification("Use o botão Fun Print (PNG 57mm) para enviar direto à impressora.", "warning");
        }
      }
    );
  };

  const handleSharePaymentFunPrint = async (receipt: CollaboratorPaymentReceipt, copiesOverride?: 1 | 2) => {
    const copies: 1 | 2 = copiesOverride || receiptCopiesMode || 1;
    setIsGeneratingFunPrint(true);
    try {
      const payload = buildPaymentReceiptPayload(receipt, copies);
      const blob = await generateMiniPrint57mmPngBlob(payload);
      const safeCollab = receipt.collaboratorName.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 18);
      const res = await shareOrDownloadReceiptPng(
        blob,
        `acerto_${safeCollab}_${copies}vias_57mm.png`,
        `Recibo Pagamento - ${receipt.collaboratorName}`
      );
      if (showNotification) {
        showNotification(
          res === "shared"
            ? `Recibo de acerto 57mm (${copies} ${copies === 1 ? "Via" : "Vias"}) pronto para o app Fun Print! 🐱🖨️`
            : `Recibo de acerto 57mm salvo (${copies} ${copies === 1 ? "Via" : "Vias"}) para abrir no Fun Print! 🐱📥`,
          "success"
        );
      }
    } catch (err: any) {
      if (showNotification) showNotification(err?.message || "Erro ao gerar imagem 57mm.", "error");
    } finally {
      setIsGeneratingFunPrint(false);
    }
  };

  const buildFolderSummaryPayload = (
    folder: (typeof collaboratorFolders)[number],
    copies: 1 | 2
  ): ThermalCanvasReceiptPayload => {
    const cfg = loadPrinterConfig();
    const activeTickets = folder.tickets.filter((t) => !t.isCancelled);
    const lines: ThermalCanvasReceiptPayload["lines"] = [
      ...activeTickets.slice(0, 18).map((tk) => ({
        left: `${tk.timestamp.split(",")[0] || tk.timestamp} • ${tk.items.map((i) => i.name).join(" + ")}`,
        right: tk.isFounder ? "D.W" : `R$ ${tk.totalPaid.toFixed(2).replace(".", ",")}`,
        detail: `${tk.totalWeightKg.toFixed(2)} kg • ${
          tk.paymentStatus === "pago_na_hora" ? "Pago na hora" : tk.paymentStatus === "coleta_propria_dw" ? "Própria" : "Caderninho"
        }`,
        bold: true
      })),
      ...folder.payments.slice(0, 10).map((pay) => ({
        left: `ACERTO (${pay.timestamp.split(",")[0] || pay.timestamp})`,
        right: `-R$ ${pay.amountPaid.toFixed(2).replace(".", ",")}`,
        detail: `Pago via ${pay.methodLabel}`,
        bold: true
      }))
    ];
    if (lines.length === 0) {
      lines.push({ left: "Sem lançamentos registrados nesta pasta ainda", right: "R$ 0,00" });
    }
    const totalPaid = folder.collaborator ? folder.collaborator.totalPaid : folder.totalPaidDirectAmount;
    const pending = folder.collaborator ? folder.collaborator.balancePending : 0;
    return {
      title: "EXTRATO DA PASTA DO COLABORADOR",
      subtitle: "CONFERÊNCIA DE CADERNINHO & RECIBOS",
      storeName: cfg.storeName || "D.W VIDROS & RECICLAGEM",
      storeCnpj: cfg.storeCnpjCpf || "67.965.725/0001-95",
      dateStr: new Date().toLocaleString("pt-BR"),
      ticketId: folder.key,
      collaboratorName: folder.name,
      statusLabel: pending > 0 ? `DEVENDO R$ ${pending.toFixed(2).replace(".", ",")}` : "CONTAS EM DIA",
      extraMeta: [
        `COMPRAS ATIVAS: ${activeTickets.length} | ACERTOS: ${folder.payments.length}`,
        `PESO TOTAL TRAZIDO: ${folder.totalWeightKg.toFixed(2)} kg`
      ],
      lines,
      summaryLines: [
        { label: "TOTAL JÁ COMPRADO:", value: `R$ ${folder.totalBoughtAmount.toFixed(2).replace(".", ",")}`, bold: true },
        { label: "TOTAL JÁ PAGO:", value: `R$ ${totalPaid.toFixed(2).replace(".", ",")}`, bold: true },
        { label: "SALDO A ACERTAR:", value: `R$ ${pending.toFixed(2).replace(".", ",")}`, big: true, bold: true }
      ],
      caderninhoBox: folder.collaborator && !folder.isFounder
        ? {
            totalEarned: folder.collaborator.totalEarned,
            totalPaid: folder.collaborator.totalPaid,
            balancePending: folder.collaborator.balancePending,
            totalWeightKg: folder.collaborator.totalWeightKg,
            totalDeliveries: folder.collaborator.totalDeliveries
          }
        : undefined,
      footerNote: "Grampear este extrato junto aos recibinhos da pasta!",
      copies
    };
  };

  const handlePrintFolderSummary = (folder: (typeof collaboratorFolders)[number], copiesOverride?: 1 | 2) => {
    const config = { ...loadPrinterConfig(), ...printerConfigState };
    const copies: 1 | 2 = copiesOverride || receiptCopiesMode || (config.printTwoCopies ? 2 : 1);
    const payload = buildFolderSummaryPayload(folder, copies);
    const html = buildThermalDocumentHtmlFromPayload(payload, config);
    executeThermalPrint(
      html,
      () => {
        if (showNotification) {
          showNotification(`Extrato da pasta "${folder.name}" enviado em ${copies === 2 ? "2 Vias" : "1 Via"}! 🖨️📁`, "success");
        }
      },
      () => {
        if (showNotification) {
          showNotification("Use o botão Fun Print (PNG 57mm) para imprimir no celular.", "warning");
        }
      }
    );
  };

  const handleShareFolderFunPrint = async (folder: (typeof collaboratorFolders)[number], copiesOverride?: 1 | 2) => {
    const copies: 1 | 2 = copiesOverride || receiptCopiesMode || 1;
    setIsGeneratingFunPrint(true);
    try {
      const payload = buildFolderSummaryPayload(folder, copies);
      const blob = await generateMiniPrint57mmPngBlob(payload);
      const safeName = folder.name.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 18);
      const res = await shareOrDownloadReceiptPng(
        blob,
        `pasta_${safeName}_${copies}vias_57mm.png`,
        `Extrato Pasta - ${folder.name}`
      );
      if (showNotification) {
        showNotification(
          res === "shared"
            ? `Extrato da pasta 57mm (${copies} ${copies === 1 ? "Via" : "Vias"}) enviado ao compartilhamento para o Fun Print! 🐱🖨️`
            : `Extrato da pasta 57mm salvo! Abra no app Fun Print para imprimir. 🐱📥`,
          "success"
        );
      }
    } catch (err: any) {
      if (showNotification) showNotification(err?.message || "Erro ao gerar extrato 57mm.", "error");
    } finally {
      setIsGeneratingFunPrint(false);
    }
  };

  const handleShareFolderWhatsApp = (folder: (typeof collaboratorFolders)[number]) => {
    const activeTickets = folder.tickets.filter((t) => !t.isCancelled);
    const totalPaid = folder.collaborator ? folder.collaborator.totalPaid : folder.totalPaidDirectAmount;
    const pending = folder.collaborator ? folder.collaborator.balancePending : 0;
    let msg = `📁 *PASTA DE RECIBOS — D.W VIDROS & RECICLAGEM*\n`;
    msg += `👤 *Colaborador:* ${folder.name}\n`;
    msg += `⚖️ *Peso Total Trazido:* ${folder.totalWeightKg.toFixed(2)} kg\n`;
    msg += `🛒 *Compras Registradas:* ${activeTickets.length}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    activeTickets.slice(0, 12).forEach((tk) => {
      msg += `• ${tk.timestamp.split(",")[0]} — ${tk.items.map((i) => `${i.name} (${i.totalWeightKg.toFixed(2)}kg)`).join(", ")} = R$ ${tk.totalPaid.toFixed(2)}\n`;
    });
    if (folder.payments.length > 0) {
      msg += `\n🤝 *ACERTOS / PAGAMENTOS FEITOS:*\n`;
      folder.payments.slice(0, 8).forEach((p) => {
        msg += `• ${p.timestamp.split(",")[0]} — R$ ${p.amountPaid.toFixed(2)} (${p.methodLabel})\n`;
      });
    }
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `💰 *Total Já Comprado:* R$ ${folder.totalBoughtAmount.toFixed(2)}\n`;
    msg += `✅ *Total Já Pago:* R$ ${totalPaid.toFixed(2)}\n`;
    msg += `📓 *SALDO A ACERTAR:* *R$ ${pending.toFixed(2)}*\n`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, "_blank");
  };

  // Cancelar / Estornar compra de reciclagem após lançamento (Ferro Velho + Estoque + Caderninho + PDV)
  const handleCancelPurchaseTicket = (ticket: CompletedPurchaseTicket, reason?: string, skipPdvCallback?: boolean) => {
    if (!ticket || ticket.isCancelled) return;
    const cleanReason = reason?.trim() || "Cancelamento / imprevisto";
    const cancelledAt = new Date().toLocaleString("pt-BR");

    markLocalYardMutation();

    // 1. Estornar estoque (Ferro Velho materiais ou Vidros do Pátio)
    if (ticket.isScrapPurchase) {
      setOtherScrapMaterials((prev) =>
        prev.map((m) => {
          const matchedItems = ticket.items.filter((it) => {
            if (it.addedToStock === false) return false;
            if (it.materialId) return it.materialId === m.id;
            return it.name.toLowerCase().includes(m.name.toLowerCase());
          });
          if (matchedItems.length === 0) return m;
          const deductKg = matchedItems.reduce((s, it) => s + Math.max(0, it.totalWeightKg || 0), 0);
          const deductUn = matchedItems.reduce((s, it) => s + Math.max(0, it.stockUnitsAdded || 0), 0);
          return {
            ...m,
            stockKg: Math.max(0, Number((m.stockKg - deductKg).toFixed(3))),
            stockUnits: Math.max(0, (m.stockUnits || 0) - deductUn)
          };
        })
      );
    } else {
      setCatalog((prev) =>
        prev.map((b) => {
          const matchedItems = ticket.items.filter(
            (it) =>
              (it.barcode && it.barcode !== "BALANCA" && (b.barcode === it.barcode || b.additionalBarcodes?.includes(it.barcode))) ||
              (b.name === it.name && b.volumeMl === it.volumeMl)
          );
          if (matchedItems.length === 0) return b;
          const deductUnits = matchedItems.reduce((s, it) => s + Math.max(0, it.quantity || 0), 0);
          return {
            ...b,
            stockUnits: Math.max(0, b.stockUnits - deductUnits)
          };
        })
      );
    }

    // 2. Estornar saldo/histórico no Caderninho do Colaborador
    const hasOtherActivePaymentsForTicketCollab = paymentHistory.some(
      (p) => !p.isCancelled && ((ticket.collaboratorId && p.collaboratorId === ticket.collaboratorId) || (!ticket.collaboratorId && p.collaboratorName.toLowerCase() === ticket.collectorName.toLowerCase()))
    );
    const hasOtherActiveTicketsForTicketCollab = purchaseHistory.some(
      (t) =>
        t.id !== ticket.id &&
        !t.isCancelled &&
        ((ticket.collaboratorId && t.collaboratorId === ticket.collaboratorId) ||
          (!ticket.collaboratorId && t.collectorName.toLowerCase() === ticket.collectorName.toLowerCase()))
    );

    setCollaborators((prev) =>
      prev.map((c) => {
        const matches =
          (ticket.collaboratorId && c.id === ticket.collaboratorId) ||
          (!ticket.collaboratorId && c.name.toLowerCase() === ticket.collectorName.toLowerCase());
        if (!matches) return c;

        const founderBase = ticket.items.reduce((s, it) => s + (it.costPaid || 0), 0);
        const founderEquiv = Math.max(0, founderBase + (ticket.bonusAmount || 0) - (ticket.discountAmount || 0));
        const revertEarnedAmt = c.isFounder ? founderEquiv : ticket.totalPaid;
        const newDeliveries = Math.max(0, c.totalDeliveries - 1);
        const newBottles = Math.max(0, c.totalBottles - (ticket.totalBottles || 0));
        const newWeight = Math.max(0, Number((c.totalWeightKg - (ticket.totalWeightKg || 0)).toFixed(3)));
        const newEarned = Math.max(0, Number((c.totalEarned - revertEarnedAmt).toFixed(2)));

        if (c.isFounder) {
          return {
            ...c,
            totalDeliveries: newDeliveries,
            totalBottles: newBottles,
            totalWeightKg: newWeight,
            totalEarned: newEarned,
            totalPaid: 0,
            balancePending: 0
          };
        }

        const revertPaidAmt = ticket.paymentStatus === "pago_na_hora" ? ticket.totalPaid : 0;
        let newPaid = Math.max(0, Number((c.totalPaid - revertPaidAmt).toFixed(2)));
        if (!hasOtherActiveTicketsForTicketCollab && !hasOtherActivePaymentsForTicketCollab && newEarned === 0) {
          newPaid = 0;
        }
        const newPending = Math.max(0, Number((newEarned - newPaid).toFixed(2)));
        return {
          ...c,
          totalDeliveries: newDeliveries,
          totalBottles: newBottles,
          totalWeightKg: newWeight,
          totalEarned: newEarned,
          totalPaid: newPaid,
          balancePending: newPending
        };
      })
    );

    // 3. Marcar o recibo como CANCELADO / ESTORNADO no histórico
    setPurchaseHistory((prev) =>
      prev.map((t) =>
        t.id === ticket.id
          ? { ...t, isCancelled: true, cancelledAt, cancelReason: cleanReason }
          : t
      )
    );
    if (lastPurchaseReceipt?.id === ticket.id) {
      setLastPurchaseReceipt((prev) =>
        prev ? { ...prev, isCancelled: true, cancelledAt, cancelReason: cleanReason } : null
      );
    }

    // 4. Estornar o lançamento correspondente no Caixa / Relatórios do PDV
    const targetPdvEventId =
      ticket.syncedPdvEventId ||
      (ticket.isScrapPurchase ? `pdv_fv_scrap_${ticket.id}` : `pdv_fv_buy_${ticket.id}`);
    if (!skipPdvCallback && onCancelSyncedFinancialEventFromPDV) {
      onCancelSyncedFinancialEventFromPDV(targetPdvEventId, cleanReason);
    }

    setCancellingTicketId(null);
    setCancelTicketReasonDraft("");
    playScannerBeep(520, 0.12);

    if (showNotification) {
      showNotification(
        `Compra cancelada e estornada! Estoque (-${ticket.totalWeightKg.toFixed(2)} kg), Caderninho e Caixa do PDV revertidos. 🚫✅`,
        "info"
      );
    }
  };

  // Estornar / Cancelar um Acerto/Pagamento do Caderninho
  const handleCancelPaymentReceipt = (
    receipt: CollaboratorPaymentReceipt,
    reason?: string,
    skipPdvCallback?: boolean
  ) => {
    if (!receipt || receipt.isCancelled) return;
    const cleanReason = reason?.trim() || "Estorno de pagamento de teste/imprevisto";
    const cancelledAt = new Date().toLocaleString("pt-BR");

    markLocalYardMutation();

    setCollaborators((prev) =>
      prev.map((c) => {
        if (c.id !== receipt.collaboratorId) return c;
        const newPaid = Math.max(0, Number((c.totalPaid - (receipt.amountPaid || 0)).toFixed(2)));
        const newPending = c.isFounder ? 0 : Math.max(0, Number((c.totalEarned - newPaid).toFixed(2)));
        return {
          ...c,
          totalPaid: c.isFounder ? 0 : newPaid,
          balancePending: newPending
        };
      })
    );

    setPaymentHistory((prev) =>
      prev.map((p) =>
        p.id === receipt.id ? { ...p, isCancelled: true, cancelledAt, cancelReason: cleanReason } : p
      )
    );
    if (latestSettledReceipt?.id === receipt.id) {
      setLatestSettledReceipt(null);
    }

    const targetPdvEventId = receipt.syncedPdvEventId || `pdv_fv_pay_${receipt.id}`;
    if (!skipPdvCallback && onCancelSyncedFinancialEventFromPDV) {
      onCancelSyncedFinancialEventFromPDV(targetPdvEventId, cleanReason);
    }

    setCancellingPaymentId(null);
    playScannerBeep(520, 0.12);
    if (showNotification) {
      showNotification(
        `Acerto de R$ ${receipt.amountPaid.toFixed(2)} estornado do Caderninho e do Caixa do PDV! 🚫✅`,
        "info"
      );
    }
  };

  // Estornar / Cancelar uma Venda/Baixa do Centro de Reciclagem (Ferro Velho) devolvendo o kg para o estoque
  const handleCancelScrapSale = (
    sale: ScrapSaleRecord,
    reason?: string,
    skipPdvCallback?: boolean
  ) => {
    if (!sale || sale.isCancelled) return;
    const cleanReason = reason?.trim() || "Estorno de venda/devolução";
    const cancelledAt = new Date().toLocaleString("pt-BR");

    markLocalYardMutation();

    setOtherScrapMaterials((prev) =>
      prev.map((m) =>
        m.id === sale.materialId
          ? {
              ...m,
              stockKg: Number((m.stockKg + Math.max(0, sale.weightKg || 0)).toFixed(3)),
              stockUnits: (m.stockUnits || 0) + Math.max(0, sale.units || 0)
            }
          : m
      )
    );

    setScrapSalesHistory((prev) =>
      prev.map((s) =>
        s.id === sale.id ? { ...s, isCancelled: true, cancelledAt, cancelReason: cleanReason } : s
      )
    );

    const targetPdvEventId = sale.syncedPdvEventId || `pdv_fv_sale_${sale.id}`;
    if (!skipPdvCallback && onCancelSyncedFinancialEventFromPDV) {
      onCancelSyncedFinancialEventFromPDV(targetPdvEventId, cleanReason);
    }

    setCancellingScrapSaleId(null);
    playScannerBeep(520, 0.12);
    if (showNotification) {
      showNotification(
        `Venda de ${sale.materialName} estornada! +${sale.weightKg.toFixed(2)} kg devolvido ao estoque do Ferro Velho. 🚫✅`,
        "info"
      );
    }
  };

  // Limpar recibos já cancelados da lista / pasta
  const handleClearCancelledReceipts = (folderCollabId?: string, folderName?: string) => {
    markLocalYardMutation();
    const matchesTarget = (collabId?: string, name?: string) => {
      if (!folderCollabId && !folderName) return true;
      if (folderCollabId && collabId === folderCollabId) return true;
      if (folderName && String(name || "").trim().toLowerCase() === folderName.trim().toLowerCase()) return true;
      return false;
    };
    setPurchaseHistory((prev) => prev.filter((t) => !(t.isCancelled && matchesTarget(t.collaboratorId, t.collectorName))));
    setPaymentHistory((prev) => prev.filter((p) => !(p.isCancelled && matchesTarget(p.collaboratorId, p.collaboratorName))));
    if (showNotification) {
      showNotification("Recibos cancelados/de teste removidos da visualização da pasta! 🧹✅", "info");
    }
  };

  // Se o lançamento for cancelado direto no Caixa/Devolução do PDV, espelha o estorno aqui também
  const purchaseHistoryRef = useRef<CompletedPurchaseTicket[]>(purchaseHistory);
  purchaseHistoryRef.current = purchaseHistory;
  const paymentHistoryRef = useRef<CollaboratorPaymentReceipt[]>(paymentHistory);
  paymentHistoryRef.current = paymentHistory;
  const scrapSalesHistoryRef = useRef<ScrapSaleRecord[]>(scrapSalesHistory);
  scrapSalesHistoryRef.current = scrapSalesHistory;
  const pdvVoidHandlersRef = useRef({
    handleCancelPurchaseTicket,
    handleCancelPaymentReceipt,
    handleCancelScrapSale
  });
  pdvVoidHandlersRef.current = {
    handleCancelPurchaseTicket,
    handleCancelPaymentReceipt,
    handleCancelScrapSale
  };

  useEffect(() => {
    const onPdvVoidEvent = (ev: Event) => {
      const customEv = ev as CustomEvent<{ eventId?: string; reason?: string; handled?: boolean }>;
      const eventId = customEv?.detail?.eventId;
      if (!eventId) return;
      const reason = customEv?.detail?.reason || "Estornado pelo Caixa do PDV";

      const foundPurchase = purchaseHistoryRef.current.find(
        (t) =>
          !t.isCancelled &&
          (t.syncedPdvEventId === eventId ||
            `pdv_fv_scrap_${t.id}` === eventId ||
            `pdv_fv_buy_${t.id}` === eventId)
      );
      if (foundPurchase) {
        pdvVoidHandlersRef.current.handleCancelPurchaseTicket(foundPurchase, reason, true);
        if (customEv.detail) customEv.detail.handled = true;
        return;
      }

      const foundPayment = paymentHistoryRef.current.find(
        (p) => !p.isCancelled && (p.syncedPdvEventId === eventId || `pdv_fv_pay_${p.id}` === eventId)
      );
      if (foundPayment) {
        pdvVoidHandlersRef.current.handleCancelPaymentReceipt(foundPayment, reason, true);
        if (customEv.detail) customEv.detail.handled = true;
        return;
      }

      const foundSale = scrapSalesHistoryRef.current.find(
        (s) => !s.isCancelled && (s.syncedPdvEventId === eventId || `pdv_fv_sale_${s.id}` === eventId)
      );
      if (foundSale) {
        pdvVoidHandlersRef.current.handleCancelScrapSale(foundSale, reason, true);
        if (customEv.detail) customEv.detail.handled = true;
      }
    };
    window.addEventListener("dw_fv_cancel_ticket_from_pdv", onPdvVoidEvent as EventListener);
    return () => window.removeEventListener("dw_fv_cancel_ticket_from_pdv", onPdvVoidEvent as EventListener);
  }, []);

  // Enviar Notinha de Compra no WhatsApp
  const handleShareGlassTicketWhatsApp = (ticket: CompletedPurchaseTicket) => {
    const statusLabel = ticket.isCancelled
      ? "🚫 COMPRA CANCELADA / ESTORNADA"
      : ticket.paymentStatus === "coleta_propria_dw"
      ? "👑 Coleta Própria D.W (100% Empresa)"
      : ticket.paymentStatus === "pago_na_hora"
      ? "💵 Pago na Hora no Portão"
      : "📓 Lançado no Caderninho do Colaborador";

    let msg = `🧾 *D.W VIDROS & RECICLAGEM*\n`;
    msg += `_CNPJ: 67.965.725/0001-95 • Compra no Portão_\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    if (ticket.isCancelled) {
      msg += `🚫 *COMPRA CANCELADA / ESTORNADA*\n`;
      if (ticket.cancelledAt) msg += `🕒 *Cancelado em:* ${ticket.cancelledAt}\n`;
      if (ticket.cancelReason) msg += `📝 *Motivo:* ${ticket.cancelReason}\n`;
      msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    }
    msg += `👤 *Parceiro:* ${ticket.collectorName}\n`;
    msg += `📅 *Data:* ${ticket.timestamp}\n`;
    msg += `📌 *Status:* ${statusLabel}\n`;
    if (!ticket.isScrapPurchase) {
      msg += `📊 *Cotação Victor:* R$ ${ticket.sellPricePerTonUsed || activeSellPricePerTon}/t (R$ ${(((ticket.sellPricePerTonUsed || activeSellPricePerTon) / 1000)).toFixed(2)}/kg)\n`;
    }
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    ticket.items.forEach((it) => {
      msg += `• *${it.quantity}×* ${it.name} (${it.totalWeightKg.toFixed(2)} kg) — R$ ${it.costPaid.toFixed(2)}\n`;
    });
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `⚖️ *Peso Total:* +${ticket.totalWeightKg.toFixed(2)} kg${!ticket.isScrapPurchase ? ` (${ticket.totalBottles} un)` : ""}\n`;
    if (((ticket.bonusAmount || 0) > 0 || (ticket.discountAmount || 0) > 0) && typeof ticket.subtotalAmount === "number") {
      msg += `🧮 *Subtotal Materiais:* R$ ${ticket.subtotalAmount.toFixed(2)}\n`;
    }
    if ((ticket.bonusAmount || 0) > 0) {
      msg += `➕ *Acréscimo${ticket.bonusReason ? ` (${ticket.bonusReason})` : ""}:* +R$ ${(ticket.bonusAmount || 0).toFixed(2)}\n`;
    }
    if ((ticket.discountAmount || 0) > 0) {
      msg += `➖ *Desconto/Dívida${ticket.discountReason ? ` (${ticket.discountReason})` : ""}:* -R$ ${(ticket.discountAmount || 0).toFixed(2)}\n`;
    }
    if (ticket.isFounder) {
      const equiv = ticket.items.reduce((s, it) => s + it.costPaid, 0);
      msg += `👑 *Economia Própria D.W:* R$ ${equiv.toFixed(2)}\n`;
    }
    msg += `💰 *${ticket.isFounder ? "TOTAL A PAGAR (PRÓPRIA)" : "TOTAL LÍQUIDO"}:* R$ ${ticket.isFounder ? "0,00" : ticket.totalPaid.toFixed(2)}\n`;
    if (!ticket.isScrapPurchase) {
      msg += `🚛 *Pátio Atual:* ${yardTotals.totalWeightKg.toFixed(1)} kg / ${yardTotals.minTonTargetKg.toLocaleString("pt-BR")} kg\n`;
    }

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
              {onSyncFinancialEventToPDV && (
                <button
                  type="button"
                  onClick={() => {
                    const next = !syncToPdvCash;
                    setSyncToPdvCash(next);
                    if (showNotification) {
                      showNotification(
                        next
                          ? "Integração com Caixa, Estoque e Relatórios/BI do PDV ATIVADA! 🔗✅"
                          : "Modo isolado ativado: lançamentos não entram no Caixa do PDV.",
                        "info"
                      );
                    }
                  }}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1 cursor-pointer touch-manipulation select-none active:scale-95 ${
                    syncToPdvCash
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/40"
                      : "bg-slate-800 text-slate-300 border-white/10"
                  }`}
                  title="Sincronizar automaticamente pagamentos no portão, acertos e cargas despachadas com o Caixa e Relatórios do PDV"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>{syncToPdvCash ? "🔗 Integrado ao PDV / Gestões" : "PDV Isolado (Clique p/ Integrar)"}</span>
                </button>
              )}
              {activeAuthUid ? (
                <button
                  type="button"
                  onClick={() => pushYardDataToCloud(Date.now(), true)}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1 cursor-pointer touch-manipulation ${
                    cloudSyncStatus === "synced"
                      ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/25"
                      : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                  }`}
                  title="Sincronizar pátio e códigos com a sua conta na nuvem para o app instalado no celular"
                >
                  <Cloud className="w-3.5 h-3.5" />
                  <span>{cloudSyncStatus === "syncing" ? "Sincronizando..." : "☁️ Nuvem Ativa (Sincronizar)"}</span>
                </button>
              ) : (
                <span className="text-[10.5px] bg-slate-800/80 text-slate-300 font-bold px-2.5 py-1 rounded-lg border border-white/10">
                  📱 Salvo neste aparelho (Entre na sua conta para sincronizar o Pátio no app instalado)
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <Scale className="w-6 h-6 text-emerald-400" />
              {activeSector === "vidros"
                ? "🍾 Pátio de Vidros — Garrafas, Balança & Caminhão do Victor"
                : "♻️ Centro de Reciclagem (Ferro Velho) — Compras, Revenda & Lucros"}
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              {activeSector === "vidros" ? (
                <>
                  Setor exclusivo de <strong>Vidros (Caminhão do Victor • Meta {yardTotals.minTonTargetKg.toLocaleString("pt-BR")} kg)</strong>. Bipe garrafas misturadas, confira gramas e controle o pátio sem misturar com o Ferro Velho!
                </>
              ) : (
                <>
                  Setor exclusivo de <strong>Centro de Reciclagem / Ferro Velho</strong> (PET, Latinhas, Plásticos, Metais, Eletrônicos e Papelão), com <strong>contabilidade completa de quanto você pagou × quanto vão te pagar × seu lucro em cada material!</strong>
                </>
              )}
            </p>
          </div>

          {/* BOTÕES DE GESTÃO DO SETOR ATIVO */}
          <div className="flex flex-wrap items-center gap-2">
            {activeSector === "vidros" ? (
              <>
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
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setYardControlFilter("outros");
                  setActiveTab("estoque");
                  setTimeout(() => {
                    digitalScalePanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }, 60);
                }}
                className="min-h-[48px] px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/25 touch-manipulation"
              >
                <Scale className="w-4 h-4" />
                <span>Pesar na Balança & Lucros ⚖️</span>
              </button>
            )}

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

        {/* ========================================================= */}
        {/* SELETOR PRINCIPAL: PÁTIO DE VIDROS VS CENTRO DE RECICLAGEM */}
        {/* ========================================================= */}
        <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => {
              setActiveSector("vidros");
              setYardControlFilter("vidro");
              if (activeTab === "guia_plasticos" || (activeTab === "estoque" && yardControlFilter === "outros")) {
                setActiveTab("carrinho");
              }
            }}
            className={`min-h-[58px] px-4 py-3 rounded-2xl border-2 text-left transition-all flex items-center justify-between gap-3 cursor-pointer touch-manipulation select-none active:scale-[0.99] ${
              activeSector === "vidros"
                ? "bg-gradient-to-r from-emerald-500/25 to-teal-500/20 border-emerald-400 shadow-lg shadow-emerald-500/20"
                : "bg-slate-950/80 border-white/10 hover:border-emerald-500/40"
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-2xl p-2 rounded-xl bg-slate-900 border border-emerald-500/30 shrink-0">🍾</span>
              <div className="min-w-0">
                <span className={`text-[10px] font-black uppercase tracking-wider block ${activeSector === "vidros" ? "text-emerald-300" : "text-slate-400"}`}>
                  Setor 1 • Caminhão do Victor
                </span>
                <strong className="text-sm sm:text-base font-black text-white block truncate">
                  Pátio de Vidros
                </strong>
                <span className="text-[11px] text-slate-300 block">
                  {yardTotals.totalUnits.toLocaleString("pt-BR")} garrafas • Meta {yardTotals.minTonTargetKg.toLocaleString("pt-BR")} kg
                </span>
              </div>
            </div>
            <div className="text-right shrink-0 font-mono">
              <strong className="text-base sm:text-lg font-black text-emerald-300 block">
                {yardTotals.totalWeightKg.toFixed(1)} kg
              </strong>
              <span className="text-[10px] text-amber-300 font-bold block">
                R$ {yardTotals.grossRevenueTon.toFixed(2).replace(".", ",")}
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSector("reciclagem");
              setYardControlFilter("outros");
              if (activeTab === "carrinho") {
                setActiveTab("estoque");
              }
            }}
            className={`min-h-[58px] px-4 py-3 rounded-2xl border-2 text-left transition-all flex items-center justify-between gap-3 cursor-pointer touch-manipulation select-none active:scale-[0.99] ${
              activeSector === "reciclagem"
                ? "bg-gradient-to-r from-cyan-500/25 to-sky-500/20 border-cyan-400 shadow-lg shadow-cyan-500/20"
                : "bg-slate-950/80 border-white/10 hover:border-cyan-500/40"
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-2xl p-2 rounded-xl bg-slate-900 border border-cyan-500/30 shrink-0">♻️</span>
              <div className="min-w-0">
                <span className={`text-[10px] font-black uppercase tracking-wider block ${activeSector === "reciclagem" ? "text-cyan-300" : "text-slate-400"}`}>
                  Setor 2 • Ferro Velho Separado
                </span>
                <strong className="text-sm sm:text-base font-black text-white block truncate">
                  Centro de Reciclagem
                </strong>
                <span className="text-[11px] text-slate-300 block">
                  PET, Latinhas, Plásticos, Metais & Lucros
                </span>
              </div>
            </div>
            <div className="text-right shrink-0 font-mono">
              <strong className="text-base sm:text-lg font-black text-cyan-300 block">
                {otherMaterialsTotalKg.toFixed(1)} kg
              </strong>
              <span className="text-[10px] text-emerald-300 font-bold block">
                Lucro Est: {recyclingProfitAccounting.totals.stockExpectedProfit >= 0 ? "+" : ""}R$ {recyclingProfitAccounting.totals.stockExpectedProfit.toFixed(2).replace(".", ",")}
              </span>
            </div>
          </button>
        </div>

        {/* PAINEL EXCLUSIVO DO SETOR ATIVO */}
        {activeSector === "vidros" ? (
        <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
          {/* Card Central com Destaque Máximo — SOMENTE VIDROS */}
          <div className="p-4 bg-gradient-to-r from-slate-950 via-emerald-950/50 to-slate-950 rounded-2xl border-2 border-emerald-500/50 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  🍾 PÁTIO DE VIDROS (KG) • CAMINHÃO DO VICTOR
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
                        markLocalYardMutation();
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
                      markLocalYardMutation();
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

            <div className="grid grid-cols-2 gap-2 text-xs min-w-[230px]">
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
        ) : (
        <div className="mt-4 pt-4 border-t border-white/10">
          {/* Card Exclusivo do Centro de Reciclagem / Ferro Velho */}
          <div className="p-4 bg-gradient-to-r from-slate-950 via-cyan-950/45 to-slate-950 rounded-2xl border-2 border-cyan-500/50 shadow-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 inline-block">
                  ♻️ CENTRO DE RECICLAGEM (FERRO VELHO) • CONTABILIDADE DE LUCROS
                </span>
                <p className="text-xs text-slate-300 mt-1.5">
                  Aqui fica separado do Pátio de Vidros: controle quanto você <strong>pagou</strong> em cada reciclagem, quanto <strong>vão te pagar na revenda</strong> e qual foi o <strong>seu lucro</strong>!
                </p>
              </div>
              <div className="text-right shrink-0 space-y-1">
                <span className="text-[10px] uppercase font-bold text-cyan-300 block">Peso no Ferro Velho:</span>
                <strong className="text-xl sm:text-2xl font-mono font-black text-white block">
                  {recyclingProfitAccounting.totals.stockKg.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 })} kg
                </strong>
                {otherMaterialsTotalUnits > 0 && (
                  <span className="text-[11px] font-bold text-amber-300 block">
                    + {otherMaterialsTotalUnits} aparelhos / un
                  </span>
                )}
                {(recyclingProfitAccounting.totals.stockKg > 0 || otherMaterialsTotalUnits > 0) && (
                  <div className="pt-1">
                    {showZeroOnlyScrapConfirm ? (
                      <div className="inline-flex items-center gap-1.5 bg-slate-950 border border-rose-500/50 rounded-xl px-2.5 py-1.5">
                        <span className="text-[10px] font-black text-rose-200">Zerar Ferro Velho?</span>
                        <button
                          type="button"
                          onClick={handleZeroOnlyScrapStock}
                          className="min-h-[32px] px-2.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-[10.5px] rounded-lg cursor-pointer"
                        >
                          Sim, Zerar
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowZeroOnlyScrapConfirm(false)}
                          className="min-h-[32px] px-2 bg-slate-800 text-slate-200 font-bold text-[10.5px] rounded-lg cursor-pointer"
                        >
                          Não
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowZeroOnlyScrapConfirm(true)}
                        className="min-h-[34px] px-3 py-1 bg-rose-950/70 hover:bg-rose-600 text-rose-200 hover:text-white font-black text-[10.5px] uppercase rounded-xl border border-rose-500/40 inline-flex items-center gap-1 cursor-pointer touch-manipulation"
                      >
                        <Eraser className="w-3.5 h-3.5" />
                        <span>Zerar Estoque Ferro Velho (0 kg)</span>
                      </button>
                    )}
                  </div>
                )}
                {recyclingProfitAccounting.totals.stockKg > 0 && recyclingProfitAccounting.totals.realizedPaidTotal === 0 && (
                  <span className="text-[10px] text-amber-300/90 block max-w-[230px] ml-auto">
                    Sem recibos ativos (peso lançado direto nos cartões / Só Estoque)
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
              <div className="p-3 bg-slate-900/90 rounded-xl border border-amber-500/30 space-y-0.5">
                <span className="text-[9.5px] uppercase font-black text-amber-300 block">💸 Quanto Paguei (Estoque):</span>
                <strong className="text-base sm:text-lg font-mono font-black text-white">
                  R$ {recyclingProfitAccounting.totals.stockInvestedAmount.toFixed(2).replace(".", ",")}
                </strong>
                <span className="text-[10px] text-slate-400 block">
                  Compras já lançadas: R$ {recyclingProfitAccounting.totals.realizedPaidTotal.toFixed(2).replace(".", ",")}
                </span>
              </div>

              <div className="p-3 bg-slate-900/90 rounded-xl border border-cyan-500/30 space-y-0.5">
                <span className="text-[9.5px] uppercase font-black text-cyan-300 block">🏦 Vão Me Pagar (Revenda):</span>
                <strong className="text-base sm:text-lg font-mono font-black text-cyan-200">
                  R$ {recyclingProfitAccounting.totals.stockResaleValue.toFixed(2).replace(".", ",")}
                </strong>
                <span className="text-[10px] text-slate-400 block">
                  Com base nos preços de revenda
                </span>
              </div>

              <div className="p-3 bg-slate-900/90 rounded-xl border border-emerald-500/35 space-y-0.5">
                <span className="text-[9.5px] uppercase font-black text-emerald-300 block">📈 Meu Lucro Previsto (Estoque):</span>
                <strong
                  className={`text-base sm:text-lg font-mono font-black ${
                    recyclingProfitAccounting.totals.stockExpectedProfit >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {recyclingProfitAccounting.totals.stockExpectedProfit >= 0 ? "+" : ""}R${" "}
                  {recyclingProfitAccounting.totals.stockExpectedProfit.toFixed(2).replace(".", ",")}
                </strong>
                <span className="text-[10px] text-slate-400 block">
                  {recyclingProfitAccounting.totals.stockInvestedAmount > 0 && recyclingProfitAccounting.totals.stockResaleValue > 0
                    ? `Margem: ${(((recyclingProfitAccounting.totals.stockResaleValue - recyclingProfitAccounting.totals.stockInvestedAmount) / recyclingProfitAccounting.totals.stockInvestedAmount) * 100).toFixed(1)}%`
                    : "Defina preço pago e revenda"}
                </span>
              </div>

              <div className="p-3 bg-slate-900/90 rounded-xl border border-purple-500/30 space-y-0.5">
                <span className="text-[9.5px] uppercase font-black text-purple-300 block">✅ Lucro Realizado (Vendas):</span>
                <strong
                  className={`text-base sm:text-lg font-mono font-black ${
                    recyclingProfitAccounting.totals.realizedProfitTotal >= 0 ? "text-purple-200" : "text-rose-400"
                  }`}
                >
                  {recyclingProfitAccounting.totals.realizedProfitTotal >= 0 ? "+" : ""}R${" "}
                  {recyclingProfitAccounting.totals.realizedProfitTotal.toFixed(2).replace(".", ",")}
                </strong>
                <span className="text-[10px] text-slate-400 block">
                  Vendido: {recyclingProfitAccounting.totals.realizedSoldKg.toFixed(1)} kg (R$ {recyclingProfitAccounting.totals.realizedRevenueTotal.toFixed(2).replace(".", ",")})
                </span>
              </div>
            </div>
          </div>
        </div>
        )}
      </div>

      {/* ABAS DO SISTEMA D.W VIDROS & FERRO VELHO */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-900 border border-white/10 rounded-2xl overflow-x-auto">
        {(activeSector === "vidros"
          ? [
              { id: "carrinho", label: "🛒 Bipar & Comprar Vidros", badge: cart.length > 0 ? `${cart.length}` : null },
              { id: "estoque", label: "🍾 Estoque de Vidros (Pátio)", badge: `${yardTotals.totalUnits}` },
              { id: "caderninho", label: "📖 Caderninho dos Colaboradores", badge: caderninhoTotals.totalPendingAll > 0 ? `R$ ${caderninhoTotals.totalPendingAll.toFixed(0)}` : null },
              { id: "cargas", label: "📁 Pastas, Recibos & Cargas Victor", badge: purchaseHistory.filter((t) => !t.isCancelled).length > 0 ? `${purchaseHistory.filter((t) => !t.isCancelled).length}` : null }
            ]
          : [
              { id: "estoque", label: "⚖️ Balança, Compras & Lucros (Ferro Velho)", badge: `${otherMaterialsTotalKg.toFixed(0)} kg` },
              { id: "caderninho", label: "📖 Caderninho dos Colaboradores", badge: caderninhoTotals.totalPendingAll > 0 ? `R$ ${caderninhoTotals.totalPendingAll.toFixed(0)}` : null },
              { id: "cargas", label: "📁 Pastas & Recibos Salvos", badge: purchaseHistory.filter((t) => !t.isCancelled).length > 0 ? `${purchaseHistory.filter((t) => !t.isCancelled).length}` : null },
              { id: "guia_plasticos", label: "📘 Guia Plásticos (PET / Duro / PS)", badge: "Tabela" }
            ]
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              const targetTab = tab.id as "carrinho" | "caderninho" | "estoque" | "cargas" | "guia_plasticos";
              setActiveTab(targetTab);
              if (targetTab === "estoque") {
                setYardControlFilter(activeSector === "reciclagem" ? "outros" : "vidro");
              } else if (targetTab === "carrinho") {
                setActiveSector("vidros");
                setYardControlFilter("vidro");
              } else if (targetTab === "guia_plasticos") {
                setActiveSector("reciclagem");
                setYardControlFilter("outros");
              }
            }}
            className={`min-h-[48px] px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-black whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer touch-manipulation ${
              activeTab === tab.id
                ? activeSector === "reciclagem"
                  ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30 scale-[1.02]"
                  : "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30 scale-[1.02]"
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
                      onClick={() => {
                        markLocalYardMutation();
                        activeSetSellPricePerTon(tier.ton);
                      }}
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
                  Modo Tecnológico • Bipar Garrafas (1 a 5 Códigos por Grupo)
                </span>
                <h3 className="text-base font-black text-white flex items-center gap-2 mt-0.5">
                  <Barcode className="w-5 h-5 text-emerald-400" />
                  Leitor Inteligente de Códigos de Barras (Só Bipar!)
                </h3>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setContinuousBeepMode((v) => !v)}
                  className={`min-h-[48px] px-3.5 py-2 font-black text-xs uppercase rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer touch-manipulation select-none active:scale-95 ${
                    continuousBeepMode
                      ? "bg-amber-400 text-slate-950 border-amber-300 shadow-lg shadow-amber-400/25"
                      : "bg-slate-950 text-amber-300 border-amber-500/40 hover:bg-slate-800"
                  }`}
                  title="Ativar Modo Só Bipar Contínuo: cada bip soma direto no carrinho sem fechar a câmera!"
                >
                  <Zap className="w-4 h-4" />
                  <span>{continuousBeepMode ? "⚡ Só Bipar Direto (ON)" : "🔢 Bipar & Digitar Lote"}</span>
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
                  className="min-h-[48px] px-3.5 py-2 bg-slate-950 hover:bg-slate-800 active:scale-95 text-emerald-300 font-black text-xs uppercase rounded-xl border border-emerald-500/40 transition-all flex items-center gap-1.5 cursor-pointer touch-manipulation select-none"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nova Garrafa (1-5 códs) ⚖️</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCameraTargetField("search");
                    setShowCameraModal(true);
                  }}
                  className="min-h-[48px] px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-95 text-slate-950 font-black text-xs uppercase rounded-xl transition-all flex items-center gap-2 cursor-pointer touch-manipulation select-none shadow-lg shadow-emerald-500/25"
                >
                  <Camera className="w-4 h-4" />
                  <span>Bipar Câmera 📷</span>
                </button>
              </div>
            </div>

            {/* BARRA DO MODO SÓ BIPAR CONTÍNUO + LOTE POR BIP */}
            {continuousBeepMode && (
              <div className="p-3 bg-amber-950/35 border border-amber-400/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-amber-200 font-bold">
                    Modo Só Bipar Contínuo ativo: bipa na câmera ou no leitor e já contabiliza na hora!
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] font-black uppercase text-amber-300">Cada bip soma:</span>
                  {[1, 6, 10, 30].map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setContinuousBatchQty(q)}
                      className={`min-h-[36px] px-2.5 rounded-lg font-mono font-black text-xs border cursor-pointer touch-manipulation ${
                        continuousBatchQty === q
                          ? "bg-amber-400 text-slate-950 border-amber-300"
                          : "bg-slate-950 text-amber-200 border-amber-500/30 hover:bg-slate-800"
                      }`}
                    >
                      +{q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* FEEDBACK AO VIVO DO ÚLTIMO ITEM BIPADO */}
            {lastBeepHud && (
              <div className="p-3 bg-emerald-950/60 border-2 border-emerald-400/60 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{lastBeepHud.emoji}</span>
                  <div>
                    <div className="text-emerald-300 font-black uppercase text-[10px]">
                      ⚡ Bipado &amp; Contabilizado ({lastBeepHud.code})
                    </div>
                    <div className="text-white font-black text-sm">
                      +{lastBeepHud.addedQty}× {lastBeepHud.bottleName} ({((lastBeepHud.addedQty * lastBeepHud.unitGrams) / 1000).toFixed(2)} kg)
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const inCart = cart.find((c) => c.catalogId === lastBeepHud.bottleId);
                      if (inCart) {
                        handleUpdateCartQuantity(inCart.id, Math.max(0, inCart.quantity - lastBeepHud.addedQty));
                      }
                      setLastBeepHud(null);
                    }}
                    className="min-h-[38px] px-3 py-1 bg-slate-950 hover:bg-rose-950/60 text-rose-300 font-bold rounded-xl border border-rose-500/30 cursor-pointer touch-manipulation"
                  >
                    Desfazer
                  </button>
                  {cart.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowCheckoutModal(true)}
                      className="min-h-[38px] px-3.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black uppercase rounded-xl cursor-pointer touch-manipulation"
                    >
                      Pagar &amp; Pátio ➔
                    </button>
                  )}
                </div>
              </div>
            )}

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
                  placeholder="Bipe qualquer código (Heineken, Império, Stella, 51, Dreher) ou digite..."
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

            {/* BUSCA RÁPIDA OPCIONAL + BOTÕES DE 1 TOQUE PARA QUALQUER GARRAFA CATALOGADA */}
            <div className="space-y-2.5 pt-2 border-t border-white/5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-[10px] uppercase font-black text-amber-400 block tracking-wider">
                  Ou toque no item abaixo (Todos aceitam de 1 a 5 Códigos de Barras):
                </span>
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={catalogSearchQuery}
                    onChange={(e) => setCatalogSearchQuery(e.target.value)}
                    placeholder="Filtrar nome ou código..."
                    className="w-full min-h-[38px] bg-slate-950 border border-white/10 focus:border-emerald-400 rounded-xl pl-8 pr-7 text-xs text-white outline-none placeholder:text-slate-500"
                  />
                  {catalogSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setCatalogSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {catalog
                  .filter((bottle) => {
                    const q = catalogSearchQuery.trim().toLowerCase();
                    if (!q) return true;
                    const codes = [bottle.barcode, ...(bottle.additionalBarcodes || [])].filter(Boolean).join(" ").toLowerCase();
                    return bottle.name.toLowerCase().includes(q) || codes.includes(q) || String(bottle.volumeMl).includes(q);
                  })
                  .map((bottle) => {
                  const safeLot = getVictorSafeLotUnits(bottle.category, sellPricePerKg, bottle.unitWeightGrams);
                  const rawPresets =
                    bottle.category === "caco"
                      ? [2, 3, 5, 10]
                      : bottle.category === "longneck"
                      ? [10, safeLot, safeLot * 2, 50, 100]
                      : [2, safeLot, safeLot * 2, 24, 50];
                  const presetsToShow = Array.from(new Set(rawPresets.filter((n) => n > 1))).sort((a, b) => a - b);
                  const inCartItem = cart.find((c) => c.catalogId === bottle.id);
                  const typedQtyNum = parseInt(bottleInputQty[bottle.id] || "0", 10);
                  const activeActionQty = !isNaN(typedQtyNum) && typedQtyNum > 0 ? typedQtyNum : (safeLot || 1);
                  const allBottleCodes = [bottle.barcode, ...(bottle.additionalBarcodes || [])].map((c) => (c || "").trim()).filter(Boolean);
                  const isJustScanned = lastMatchedBottleId === bottle.id;

                  return (
                    <div
                      key={bottle.id}
                      className={`p-3 bg-slate-950 rounded-2xl border transition-all flex flex-col justify-between space-y-2 ${
                        isJustScanned
                          ? "border-cyan-400 ring-2 ring-cyan-400/50 shadow-xl shadow-cyan-950/50"
                          : inCartItem
                          ? "border-emerald-400/80 ring-1 ring-emerald-500/35 shadow-lg shadow-emerald-950/40"
                          : "border-white/10 hover:border-emerald-500/40"
                      }`}
                    >
                      <div>
                        {isJustScanned && (
                          <div className="mb-1.5 px-2 py-0.5 rounded-lg bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 text-[9.5px] font-black uppercase tracking-wider flex items-center gap-1">
                            <Zap className="w-3 h-3 text-cyan-300" />
                            <span>Identificado pelo Leitor!</span>
                          </div>
                        )}
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
                        <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between gap-1 mt-1 flex-wrap">
                          <span>{bottle.volumeMl}ml</span>
                          {allBottleCodes.length > 0 ? (
                            <button
                              type="button"
                              onClick={() => openEditBottleModal(bottle, false)}
                              className="px-2 py-0.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-bold text-[9.5px] flex items-center gap-1 cursor-pointer touch-manipulation"
                              title={`Códigos vinculados: ${allBottleCodes.join(", ")}`}
                            >
                              <Barcode className="w-3 h-3" />
                              <span>{allBottleCodes.length}/5 códs ({allBottleCodes[0]})</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                openEditBottleModal(bottle, false);
                                setCameraTargetField("primary");
                                setShowCameraModal(true);
                              }}
                              className="px-2 py-0.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-300 font-black text-[9.5px] flex items-center gap-1 cursor-pointer touch-manipulation animate-pulse"
                              title="Clique para bipar o código desta garrafa com a câmera"
                            >
                              <Camera className="w-3 h-3" />
                              <span>Bipar Cód. 📷</span>
                            </button>
                          )}
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
                              <span className="truncate">Carrinho ({activeActionQty} un)</span>
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

            {/* RECIBO DO ACERTO RECÉM-PAGO (IMPRIMIR 1x/2x OU FUN PRINT) */}
            {latestSettledReceipt && (
              <div className="p-4 bg-emerald-950/40 border-2 border-emerald-500/50 rounded-2xl space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-black uppercase text-emerald-300 block">
                      ✅ Acerto Registrado — Imprima para Grampear ou Entregar!
                    </span>
                    <div className="text-sm font-black text-white mt-0.5">
                      🤝 {latestSettledReceipt.collaboratorName} — Pago R$ {latestSettledReceipt.amountPaid.toFixed(2)} ({latestSettledReceipt.methodLabel})
                    </div>
                    <span className="text-[11px] text-slate-300 block">
                      Resta no Caderninho: R$ {latestSettledReceipt.remainingBalance.toFixed(2)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLatestSettledReceipt(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handlePrintPaymentReceipt(latestSettledReceipt, 1)}
                    className="min-h-[42px] px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-white font-black text-xs rounded-xl border border-white/15 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Imprimir 1 Via</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePrintPaymentReceipt(latestSettledReceipt, 2)}
                    className="min-h-[42px] px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
                  >
                    <Scissors className="w-3.5 h-3.5" />
                    <span>Imprimir 2 Vias (D.W + Reciclador)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSharePaymentFunPrint(latestSettledReceipt, receiptCopiesMode)}
                    disabled={isGeneratingFunPrint}
                    className="min-h-[42px] px-3 py-1.5 bg-pink-500 hover:bg-pink-400 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>🐱 Fun Print 57mm ({receiptCopiesMode}×)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShareReceiptWhatsApp(latestSettledReceipt)}
                    className="min-h-[42px] px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-emerald-300 font-black text-xs rounded-xl border border-emerald-500/40 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>
                </div>
              </div>
            )}

            {/* LISTA DE FICHAS DOS COLABORADORES */}
            <div className="space-y-3 pt-2">
              {collaborators.map((collab) => {
                const matchedFolder = collaboratorFolders.find((f) => f.collaborator?.id === collab.id);
                const folderReceiptsCount = matchedFolder
                  ? matchedFolder.tickets.filter((t) => !t.isCancelled).length + matchedFolder.payments.filter((p) => !p.isCancelled).length
                  : 0;
                return (
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

                  <div className="flex items-center justify-between md:justify-end gap-3 flex-wrap pt-3 md:pt-0 border-t md:border-t-0 border-white/5">
                    {collab.isFounder ? (
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-amber-400 block">
                            Economia Própria Gerada:
                          </span>
                          <div className="text-lg font-mono font-black text-amber-300">
                            R$ {collab.totalEarned.toFixed(2)}
                          </div>
                          <span className="text-[10px] text-emerald-400 block font-bold">100% de margem no caminhão</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (matchedFolder) setSelectedFolderKey(matchedFolder.key);
                            setActiveTab("cargas");
                          }}
                          className="min-h-[44px] px-3 py-2 bg-slate-900 hover:bg-slate-800 text-amber-300 font-black text-xs rounded-xl border border-amber-500/35 flex items-center gap-1.5 cursor-pointer touch-manipulation"
                        >
                          <FolderOpen className="w-4 h-4" />
                          <span>Pasta ({folderReceiptsCount})</span>
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="text-left md:text-right">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Comprado:</span>
                          <span className="text-xs font-mono font-bold text-slate-300">
                            R$ {collab.totalEarned.toFixed(2)}
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            Já Pago: R$ {collab.totalPaid.toFixed(2)}
                          </span>
                        </div>

                        <div className="text-right min-w-[110px]">
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
                            if (matchedFolder) setSelectedFolderKey(matchedFolder.key);
                            setActiveTab("cargas");
                          }}
                          className="min-h-[44px] px-3 py-2 bg-slate-900 hover:bg-slate-800 text-cyan-300 font-black text-xs rounded-xl border border-cyan-500/35 flex items-center gap-1.5 cursor-pointer touch-manipulation"
                        >
                          <FolderOpen className="w-4 h-4" />
                          <span>Pasta ({folderReceiptsCount})</span>
                        </button>

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
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ABA 3: ESTOQUE SEPARADO (VIDROS DA RECICLAGEM VS OUTROS) */}
      {/* ========================================================= */}
      {activeTab === "estoque" && (
        <div className="space-y-5">
          {/* SELETOR DE SEPARAÇÃO ESTRITA: PÁTIO DE VIDROS VS CENTRO DE RECICLAGEM */}
          <div className="flex items-center gap-2 p-1.5 bg-slate-900 border border-white/10 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setActiveSector("vidros");
                setYardControlFilter("vidro");
              }}
              className={`flex-1 min-h-[48px] px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation select-none active:scale-95 ${
                yardControlFilter === "vidro"
                  ? "bg-emerald-500 text-slate-950 shadow-md"
                  : "bg-slate-950 text-slate-300 hover:text-white"
              }`}
            >
              <Wine className="w-4 h-4" />
              <span>🍾 Pátio de Vidros ({yardTotals.totalWeightKg.toFixed(1)} kg)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveSector("reciclagem");
                setYardControlFilter("outros");
              }}
              className={`flex-1 min-h-[48px] px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation select-none active:scale-95 ${
                yardControlFilter === "outros"
                  ? "bg-cyan-500 text-slate-950 shadow-md"
                  : "bg-slate-950 text-slate-300 hover:text-white"
              }`}
            >
              <Package className="w-4 h-4" />
              <span>♻️ Centro de Reciclagem ({otherMaterialsTotalKg.toFixed(1)} kg)</span>
            </button>
          </div>

          {yardControlFilter === "outros" ? (
            <div className="bg-slate-900 border border-cyan-500/30 rounded-3xl p-4 sm:p-6 shadow-xl space-y-5">
              {/* CABEÇALHO DO CENTRO DE RECICLAGEM (FERRO VELHO) */}
              <div className="border-b border-white/10 pb-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black uppercase text-cyan-400 tracking-wider">
                      Centro de Reciclagem Isolado • Não Mistura com o Pátio de Vidros
                    </span>
                    <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      Pago × Revenda × Lucro em Cada Material
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2 mt-1">
                    <Package className="w-5 h-5 text-cyan-400" />
                    Centro de Reciclagem / Ferro Velho & Contabilidade ({otherScrapMaterials.length} Categorias)
                  </h3>
                  <p className="text-xs text-slate-300 mt-1">
                    Defina em cada material quanto você <strong>paga ao reciclador</strong> (ex: PET R$ 3,00/kg, Latinha R$ 9,00/kg) e por quanto você vai <strong>revender</strong> para ver na hora o lucro de cada reciclagem.
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-2.5">
                    <button
                      type="button"
                      onClick={() => setShowProfitAccountingPanel((v) => !v)}
                      className={`min-h-[40px] px-3.5 py-1.5 font-black text-xs rounded-xl border inline-flex items-center gap-1.5 cursor-pointer touch-manipulation select-none active:scale-95 transition-all ${
                        showProfitAccountingPanel
                          ? "bg-emerald-500 text-slate-950 border-emerald-400"
                          : "bg-emerald-500/15 text-emerald-300 border-emerald-500/35"
                      }`}
                    >
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>{showProfitAccountingPanel ? "📊 Ocultar Contabilidade & Lucros" : "📊 Ver Contabilidade & Lucros"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("guia_plasticos")}
                      className="min-h-[40px] px-3.5 py-1.5 bg-sky-500/15 hover:bg-sky-500 hover:text-slate-950 text-sky-300 font-black text-xs rounded-xl border border-sky-500/35 inline-flex items-center gap-1.5 cursor-pointer touch-manipulation select-none active:scale-95 transition-all"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>📘 Guia PET / Plástico Duro / Alto Impacto</span>
                    </button>
                    {purchaseHistory.some((t) => !t.isCancelled) && (
                      <button
                        type="button"
                        onClick={() => setActiveTab("cargas")}
                        className="min-h-[40px] px-3.5 py-1.5 bg-rose-500/15 hover:bg-rose-500 hover:text-white text-rose-200 font-black text-xs rounded-xl border border-rose-500/35 inline-flex items-center gap-1.5 cursor-pointer touch-manipulation select-none active:scale-95 transition-all"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>🚫 Ver / Cancelar Compras ({purchaseHistory.filter((t) => !t.isCancelled).length})</span>
                      </button>
                    )}
                  </div>
                </div>
                <div className="px-4 py-2.5 bg-slate-950 rounded-2xl border border-cyan-500/30 text-right shrink-0">
                  <span className="text-[10px] uppercase font-bold text-cyan-400 block">Acumulado Reciclagem:</span>
                  <strong className="text-xl font-mono font-black text-white">
                    {otherMaterialsTotalKg.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg
                  </strong>
                  {otherMaterialsTotalUnits > 0 && (
                    <span className="text-[11px] font-bold text-amber-300 block">
                      + {otherMaterialsTotalUnits} aparelhos / unidades
                    </span>
                  )}
                </div>
              </div>

              {/* ========================================================= */}
              {/* PAINEL DE CONTABILIDADE & LUCROS EM CADA RECICLAGEM       */}
              {/* ========================================================= */}
              {showProfitAccountingPanel && (
                <div className="p-4 sm:p-5 bg-gradient-to-br from-slate-950 via-emerald-950/20 to-slate-950 border-2 border-emerald-500/40 rounded-2xl shadow-lg space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                    <div>
                      <span className="text-[10px] font-black uppercase text-emerald-300 tracking-wider block">
                        📊 Contabilidade Real do Centro de Reciclagem (Ferro Velho)
                      </span>
                      <h4 className="text-base sm:text-lg font-black text-white flex items-center gap-2 mt-0.5">
                        <TrendingUp className="w-5 h-5 text-emerald-400" />
                        Quanto Eu Paguei × Quanto Vão Me Pagar × Meu Lucro em Cada Material
                      </h4>
                    </div>
                  </div>

                  {(() => {
                    const activeRows = recyclingProfitAccounting.byMaterial.filter(
                      (r) =>
                        r.stockKg > 0 ||
                        r.buyPricePerKg > 0 ||
                        r.sellPricePerKg > 0 ||
                        r.realizedBoughtKg > 0 ||
                        r.realizedSoldKg > 0
                    );

                    if (activeRows.length === 0) {
                      return (
                        <div className="p-4 bg-slate-900/90 border border-white/10 rounded-xl text-xs text-slate-300">
                          Ainda não há preços ou compras lançadas no Centro de Reciclagem. Clique em{" "}
                          <strong className="text-amber-300">Editar Compra / Revenda</strong> em qualquer material abaixo (ex: PET Pago R$ 3,00/kg • Revendo R$ 4,50/kg ou Latinhas Pago R$ 9,00/kg) para calcular seus lucros automaticamente!
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          {activeRows.map((row) => (
                            <div
                              key={row.material.id}
                              className="p-3 bg-slate-900/95 border border-white/10 rounded-xl space-y-2 text-xs"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-xl shrink-0">{row.material.emoji}</span>
                                  <strong className="text-white font-black truncate">{row.material.name}</strong>
                                </div>
                                {row.hasBothPrices && (
                                  <span
                                    className={`px-2 py-0.5 rounded-md font-mono font-black text-[10.5px] shrink-0 border ${
                                      row.profitPerKg >= 0
                                        ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/35"
                                        : "bg-rose-500/15 text-rose-300 border-rose-500/35"
                                    }`}
                                  >
                                    {row.profitPerKg >= 0 ? "+" : ""}R$ {row.profitPerKg.toFixed(2).replace(".", ",")}/kg ({row.marginPct >= 0 ? "+" : ""}
                                    {row.marginPct.toFixed(0)}%)
                                  </span>
                                )}
                              </div>

                              <div className="grid grid-cols-3 gap-1.5 text-[11px] font-mono">
                                <div className="p-2 bg-slate-950 rounded-lg border border-amber-500/20">
                                  <span className="text-[9.5px] font-sans uppercase text-amber-300 block">Eu Pago/kg</span>
                                  <strong className="text-white font-black">
                                    {row.buyPricePerKg > 0 ? `R$ ${row.buyPricePerKg.toFixed(2).replace(".", ",")}` : "—"}
                                  </strong>
                                </div>
                                <div className="p-2 bg-slate-950 rounded-lg border border-cyan-500/20">
                                  <span className="text-[9.5px] font-sans uppercase text-cyan-300 block">Revendo/kg</span>
                                  <strong className="text-cyan-200 font-black">
                                    {row.sellPricePerKg > 0 ? `R$ ${row.sellPricePerKg.toFixed(2).replace(".", ",")}` : "—"}
                                  </strong>
                                </div>
                                <div className="p-2 bg-slate-950 rounded-lg border border-emerald-500/25">
                                  <span className="text-[9.5px] font-sans uppercase text-emerald-300 block">Estoque</span>
                                  <strong className="text-emerald-300 font-black">{row.stockKg.toFixed(1)} kg</strong>
                                </div>
                              </div>

                              <div className="p-2 bg-slate-950/90 rounded-lg border border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                                <span>
                                  Paguei: <strong className="text-amber-300 font-mono">R$ {row.stockInvestedAmount.toFixed(2).replace(".", ",")}</strong>
                                </span>
                                <span>
                                  Vão pagar: <strong className="text-cyan-300 font-mono">R$ {row.stockResaleValue.toFixed(2).replace(".", ",")}</strong>
                                </span>
                                <span>
                                  Meu Lucro:{" "}
                                  <strong className={`font-mono font-black ${row.stockExpectedProfit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                    {row.stockExpectedProfit >= 0 ? "+" : ""}R$ {row.stockExpectedProfit.toFixed(2).replace(".", ",")}
                                  </strong>
                                </span>
                              </div>

                              {(row.realizedPaidTotal > 0 || row.realizedSoldKg > 0) && (
                                <div className="text-[10.5px] text-slate-300 flex flex-wrap items-center justify-between gap-2 pt-0.5">
                                  <span>
                                    Compras hist: {row.realizedBoughtKg.toFixed(1)} kg (R$ {row.realizedPaidTotal.toFixed(2).replace(".", ",")})
                                  </span>
                                  {row.realizedSoldKg > 0 && (
                                    <span className="text-purple-200 font-bold">
                                      Vendido: {row.realizedSoldKg.toFixed(1)} kg • Lucro Real:{" "}
                                      <strong className={row.realizedProfitTotal >= 0 ? "text-emerald-300" : "text-rose-300"}>
                                        {row.realizedProfitTotal >= 0 ? "+" : ""}R$ {row.realizedProfitTotal.toFixed(2).replace(".", ",")}
                                      </strong>
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {scrapSalesHistory.length > 0 && (
                          <details className="pt-2 border-t border-white/10">
                            <summary className="cursor-pointer text-xs font-black text-purple-300 hover:text-purple-200 select-none">
                              📜 Ver Vendas / Revendas Realizadas ({scrapSalesHistory.length}) • Total Recebido: R${" "}
                              {recyclingProfitAccounting.totals.realizedRevenueTotal.toFixed(2).replace(".", ",")} • Lucro: +R${" "}
                              {recyclingProfitAccounting.totals.realizedProfitTotal.toFixed(2).replace(".", ",")}
                            </summary>
                            <div className="mt-2 space-y-1.5 max-h-52 overflow-y-auto">
                              {scrapSalesHistory.slice(0, 15).map((sale) => (
                                <div
                                  key={sale.id}
                                  className="p-2.5 bg-slate-950 rounded-xl border border-purple-500/25 flex flex-wrap items-center justify-between gap-2 text-[11px]"
                                >
                                  <div>
                                    <strong className="text-white">
                                      {sale.emoji} {sale.materialName} ({sale.weightKg.toFixed(1)} kg)
                                    </strong>
                                    <span className="text-slate-400 ml-2">{sale.timestamp} • {sale.buyerName}</span>
                                  </div>
                                  <div className="flex items-center gap-3 font-mono">
                                    <span className="text-amber-300">Custo: R$ {sale.estimatedBuyCost.toFixed(2).replace(".", ",")}</span>
                                    <span className="text-cyan-300">Recebido: R$ {sale.revenueReceived.toFixed(2).replace(".", ",")}</span>
                                    <strong className={sale.profitAmount >= 0 ? "text-emerald-400" : "text-rose-400"}>
                                      Lucro: {sale.profitAmount >= 0 ? "+" : ""}R$ {sale.profitAmount.toFixed(2).replace(".", ",")}
                                    </strong>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </details>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* ========================================================= */}
              {/* BALANÇA DIGITAL DO FERRO VELHO INTEGRADA AO APP            */}
              {/* ========================================================= */}
              <div
                ref={digitalScalePanelRef}
                className="p-4 sm:p-5 bg-gradient-to-br from-slate-950 via-cyan-950/25 to-slate-950 border-2 border-cyan-500/45 rounded-2xl shadow-lg space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-black uppercase text-cyan-300 tracking-wider block">
                      ⚖️ Pesagem no Portão com Balança Digital + App
                    </span>
                    <h4 className="text-base sm:text-lg font-black text-white flex items-center gap-2 mt-0.5">
                      <Scale className="w-5 h-5 text-cyan-400" />
                      Balança Digital (Peso + Tara + Múltiplas Sacolas)
                    </h4>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {serialConnected ? (
                      <button
                        type="button"
                        onClick={handleDisconnectUsbScale}
                        className="min-h-[44px] px-3.5 py-2 bg-emerald-500/20 hover:bg-rose-950/60 text-emerald-300 hover:text-rose-200 font-black text-xs rounded-xl border border-emerald-400/40 flex items-center gap-1.5 cursor-pointer touch-manipulation select-none active:scale-95"
                      >
                        <Usb className="w-4 h-4" />
                        <span>Balança USB Ativa (Desconectar)</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleConnectUsbScale}
                        className="min-h-[44px] px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-cyan-200 font-bold text-xs rounded-xl border border-cyan-500/35 flex items-center gap-1.5 cursor-pointer touch-manipulation select-none active:scale-95"
                        title="Conectar balança digital compatível via cabo USB/Serial no Chrome"
                      >
                        <Usb className="w-4 h-4 text-cyan-400" />
                        <span>Conectar Balança USB/Serial</span>
                      </button>
                    )}
                  </div>
                </div>

                {serialStatusMsg && (
                  <div className="p-2.5 bg-slate-900/90 border border-cyan-500/30 rounded-xl text-[11.5px] text-cyan-100">
                    {serialStatusMsg}
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                  {/* Seletor de Material + Unidade (kg ou g) */}
                  <div className="lg:col-span-5 space-y-2">
                    <label className="text-[11px] font-black uppercase text-slate-300 block">
                      1. Escolha o material para pesar na balança:
                    </label>
                    <select
                      value={selectedScaleMaterial?.id || "scrap_pet"}
                      onChange={(e) => setScaleSelectedMaterialId(e.target.value)}
                      className="w-full min-h-[48px] bg-slate-900 border border-cyan-500/40 rounded-xl px-3 text-white font-bold text-sm outline-none"
                    >
                      {otherScrapMaterials.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.emoji} {m.name} ({m.stockKg.toFixed(1)} kg
                          {m.trackUnits || (m.stockUnits || 0) > 0 ? ` • ${m.stockUnits || 0} un` : ""})
                        </option>
                      ))}
                    </select>

                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[11px] font-bold text-slate-400">Visor da Balança em:</span>
                      <button
                        type="button"
                        onClick={() => setScaleUnitMode("kg")}
                        className={`min-h-[40px] px-3.5 rounded-xl text-xs font-black border cursor-pointer touch-manipulation select-none active:scale-95 ${
                          scaleUnitMode === "kg"
                            ? "bg-cyan-500 text-slate-950 border-cyan-400"
                            : "bg-slate-900 text-slate-300 border-white/10"
                        }`}
                      >
                        Quilos (kg)
                      </button>
                      <button
                        type="button"
                        onClick={() => setScaleUnitMode("g")}
                        className={`min-h-[40px] px-3.5 rounded-xl text-xs font-black border cursor-pointer touch-manipulation select-none active:scale-95 ${
                          scaleUnitMode === "g"
                            ? "bg-cyan-500 text-slate-950 border-cyan-400"
                            : "bg-slate-900 text-slate-300 border-white/10"
                        }`}
                      >
                        Gramas (g)
                      </button>
                    </div>

                    {/* Preço por kg direto na Balança Digital */}
                    <div className="p-2.5 bg-slate-900/90 border border-emerald-500/35 rounded-xl space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-[11px] font-black uppercase text-emerald-300">
                          💲 Preço Pago por kg (R$/kg):
                        </label>
                        {scaleEffectivePricePerKg > 0 ? (
                          <span className="text-[10.5px] font-mono font-black text-emerald-300">
                            R$ {scaleEffectivePricePerKg.toFixed(2).replace(".", ",")}/kg
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-300">
                            Opcional (para pagar)
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-400">R$</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={scalePricePerKgInput}
                          onChange={(e) => {
                            const raw = e.target.value;
                            setScalePricePerKgInput(raw);
                            if (selectedScaleMaterial) {
                              const parsed = parseFloat(raw.replace(",", "."));
                              const cleanPrice = raw.trim() === "" ? 0 : Number.isFinite(parsed) && parsed >= 0 ? parsed : selectedScaleMaterial.buyPricePerKg;
                              markLocalYardMutation();
                              setOtherScrapMaterials((prev) =>
                                prev.map((m) => (m.id === selectedScaleMaterial.id ? { ...m, buyPricePerKg: cleanPrice } : m))
                              );
                            }
                          }}
                          placeholder="Ex: 3,00"
                          className="flex-1 min-h-[44px] bg-slate-950 border border-emerald-500/40 rounded-xl px-3 text-center text-emerald-300 font-mono font-black text-base outline-none focus:border-emerald-400"
                        />
                        {scalePricePerKgInput !== "" && (
                          <button
                            type="button"
                            onClick={() => {
                              setScalePricePerKgInput("");
                              if (selectedScaleMaterial) {
                                handleUpdateScrapPricePerKg(selectedScaleMaterial.id, 0);
                              }
                            }}
                            className="min-h-[44px] px-2.5 bg-slate-950 hover:bg-slate-800 border border-white/10 rounded-xl text-[10px] font-bold text-slate-300 cursor-pointer"
                          >
                            Zerar
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Preço de Revenda por kg direto na Balança Digital */}
                    <div className="p-2.5 bg-slate-900/90 border border-cyan-500/35 rounded-xl space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-[11px] font-black uppercase text-cyan-300">
                          📈 Preço de Revenda (R$/kg):
                        </label>
                        {(() => {
                          const sellParsed = parseFloat(scaleSellPricePerKgInput.replace(",", ".")) || 0;
                          const diff = sellParsed > 0 && scaleEffectivePricePerKg > 0 ? sellParsed - scaleEffectivePricePerKg : 0;
                          if (sellParsed > 0 && scaleEffectivePricePerKg > 0) {
                            return (
                              <span className={`text-[10.5px] font-mono font-black ${diff >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                                Lucro: {diff >= 0 ? "+" : ""}R$ {diff.toFixed(2).replace(".", ",")}/kg
                              </span>
                            );
                          }
                          return (
                            <span className="text-[10px] font-bold text-slate-400">
                              Por quanto vou revender
                            </span>
                          );
                        })()}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-400">R$</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={scaleSellPricePerKgInput}
                          onChange={(e) => {
                            const raw = e.target.value;
                            setScaleSellPricePerKgInput(raw);
                            if (selectedScaleMaterial) {
                              const parsed = parseFloat(raw.replace(",", "."));
                              const cleanSell = raw.trim() === "" ? 0 : Number.isFinite(parsed) && parsed >= 0 ? parsed : selectedScaleMaterial.sellPricePerKg || 0;
                              markLocalYardMutation();
                              setOtherScrapMaterials((prev) =>
                                prev.map((m) => (m.id === selectedScaleMaterial.id ? { ...m, sellPricePerKg: cleanSell } : m))
                              );
                            }
                          }}
                          placeholder="Ex: 4,50 (opcional)"
                          className="flex-1 min-h-[44px] bg-slate-950 border border-cyan-500/40 rounded-xl px-3 text-center text-cyan-200 font-mono font-black text-base outline-none focus:border-cyan-400"
                        />
                        {scaleSellPricePerKgInput !== "" && (
                          <button
                            type="button"
                            onClick={() => {
                              setScaleSellPricePerKgInput("");
                              if (selectedScaleMaterial) {
                                handleUpdateScrapPrices(selectedScaleMaterial.id, selectedScaleMaterial.buyPricePerKg, 0);
                              }
                            }}
                            className="min-h-[44px] px-2.5 bg-slate-950 hover:bg-slate-800 border border-white/10 rounded-xl text-[10px] font-bold text-slate-300 cursor-pointer"
                          >
                            Zerar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Peso + Tara + Unidades */}
                  <div className="lg:col-span-7 space-y-2.5">
                    {/* Seletor de Modo da Tara: Manter Peso Editado vs Descontar Tara do Bruto */}
                    <div className="p-2.5 bg-slate-900/90 border border-white/10 rounded-xl space-y-1.5">
                      <span className="text-[10.5px] font-black uppercase text-slate-300 block">
                        Como a balança está mostrando o peso?
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setScaleSubtractTare(false)}
                          className={`min-h-[40px] px-3 py-1.5 rounded-xl text-[11px] font-black border text-left transition-all cursor-pointer touch-manipulation select-none active:scale-95 ${
                            !scaleSubtractTare
                              ? "bg-emerald-500/20 text-emerald-200 border-emerald-400"
                              : "bg-slate-950 text-slate-400 border-white/10 hover:text-white"
                          }`}
                        >
                          ✅ Peso Direto (manter o peso digitado)
                        </button>
                        <button
                          type="button"
                          onClick={() => setScaleSubtractTare(true)}
                          className={`min-h-[40px] px-3 py-1.5 rounded-xl text-[11px] font-black border text-left transition-all cursor-pointer touch-manipulation select-none active:scale-95 ${
                            scaleSubtractTare
                              ? "bg-amber-500/20 text-amber-200 border-amber-400"
                              : "bg-slate-950 text-slate-400 border-white/10 hover:text-white"
                          }`}
                        >
                          ➖ Descontar Tara (Visor − Tábua/Caixa)
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[11px] font-black uppercase text-cyan-300 block">
                        {scaleSubtractTare
                          ? `2. Peso no Visor c/ Tábua (${scaleUnitMode})`
                          : `2. Peso da Reciclagem (${scaleUnitMode})`}
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={scaleGrossInput}
                        onChange={(e) => setScaleGrossInput(e.target.value)}
                        placeholder={scaleUnitMode === "kg" ? "Ex: 3.100" : "Ex: 850"}
                        className="w-full min-h-[48px] bg-slate-900 border-2 border-cyan-400/50 rounded-xl px-3 text-center text-white font-mono font-black text-lg outline-none focus:border-cyan-300"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-black uppercase text-slate-300 block">
                        Tara: Tábua/Caixa ({scaleUnitMode})
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={scaleTareInput}
                        onChange={(e) => setScaleTareInput(e.target.value)}
                        placeholder="0 (opcional)"
                        className="w-full min-h-[48px] bg-slate-900 border border-white/15 rounded-xl px-3 text-center text-amber-200 font-mono font-black text-base outline-none focus:border-amber-400"
                      />
                      <div className="flex items-center gap-1 pt-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            const tareKg = scaleTareKg;
                            try {
                              if (tareKg > 0) {
                                localStorage.setItem("pdv_dw_saved_scale_tare_kg_v1", String(Number(tareKg.toFixed(3))));
                              } else {
                                localStorage.removeItem("pdv_dw_saved_scale_tare_kg_v1");
                              }
                            } catch {}
                            setSavedFixedTareKg(tareKg);
                            if (showNotification) {
                              showNotification(
                                tareKg > 0
                                  ? `Tara da tábua/caixa (${tareKg.toFixed(2)} kg) salva como padrão! 📌⚖️`
                                  : "Tara padrão limpa (0 kg). ⚖️",
                                "info"
                              );
                            }
                          }}
                          className="flex-1 min-h-[34px] px-2 py-1 bg-amber-500/15 hover:bg-amber-500/30 border border-amber-500/35 rounded-lg text-[10px] font-black text-amber-200 cursor-pointer touch-manipulation select-none active:scale-95"
                          title="Salvar esse peso da tábua/caixa para já abrir preenchido"
                        >
                          📌 Fixar Tábua/Caixa
                        </button>
                        {(scaleTareInput !== "" || savedFixedTareKg > 0) && (
                          <button
                            type="button"
                            onClick={() => {
                              setScaleTareInput("");
                              setSavedFixedTareKg(0);
                              try {
                                localStorage.removeItem("pdv_dw_saved_scale_tare_kg_v1");
                              } catch {}
                            }}
                            className="min-h-[34px] px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-white/10 rounded-lg text-[10px] font-bold text-slate-300 cursor-pointer touch-manipulation select-none"
                          >
                            Zerar
                          </button>
                        )}
                      </div>
                    </div>

                    {selectedScaleMaterial?.trackUnits && (
                      <div className="space-y-1">
                        <label className="text-[11px] font-black uppercase text-amber-300 block">
                          Qtd Aparelhos (un)
                        </label>
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={scaleUnitsInput}
                            onChange={(e) => setScaleUnitsInput(e.target.value.replace(/\D/g, ""))}
                            placeholder="Ex: 1"
                            className="w-full min-h-[48px] bg-slate-900 border border-amber-500/40 rounded-xl px-2 text-center text-white font-mono font-black text-base outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setScaleUnitsInput((prev) => String((parseInt(prev || "0", 10) || 0) + 1))}
                            className="min-h-[48px] px-3 bg-amber-500/20 hover:bg-amber-500 hover:text-slate-950 text-amber-300 font-black text-xs rounded-xl border border-amber-500/40 cursor-pointer touch-manipulation select-none active:scale-95"
                          >
                            +1
                          </button>
                        </div>
                      </div>
                    )}

                    <div
                      className={`p-2.5 bg-slate-900/90 border rounded-xl flex flex-col justify-center text-center ${
                        selectedScaleMaterial?.trackUnits ? "sm:col-span-3" : ""
                      } ${
                        scaleSubtractTare && scaleGrossKg > 0 && scaleTareKg > 0 && scaleGrossKg <= scaleTareKg
                          ? "border-amber-500/60 bg-amber-950/30"
                          : "border-emerald-500/30"
                      }`}
                    >
                      <span className="text-[10px] font-bold uppercase text-emerald-300">Peso Líquido Agora:</span>
                      <strong className="text-lg font-mono font-black text-emerald-400">
                        {scaleCurrentNetKg % 1 !== 0 && Math.round((scaleCurrentNetKg * 1000) % 10) !== 0
                          ? scaleCurrentNetKg.toFixed(3)
                          : scaleCurrentNetKg.toFixed(2)}{" "}
                        kg
                      </strong>
                      {scaleCurrentNetKg > 0 && (
                        <span className="text-[10px] text-slate-300 font-mono">
                          {Math.floor(scaleCurrentNetKg)} kg e {Math.round((scaleCurrentNetKg - Math.floor(scaleCurrentNetKg)) * 1000)} g
                        </span>
                      )}
                      {scaleEffectivePricePerKg > 0 && (
                        <div className="mt-1.5 pt-1.5 border-t border-emerald-500/20">
                          <span className="text-[10px] font-black uppercase text-amber-300 block">
                            💰 Total a Pagar ({scaleCombinedWeightKg.toFixed(2)} kg × R$ {scaleEffectivePricePerKg.toFixed(2).replace(".", ",")}):
                          </span>
                          <strong className="text-base font-mono font-black text-amber-300">
                            R$ {scaleTotalPayable.toFixed(2).replace(".", ",")}
                          </strong>
                        </div>
                      )}
                      {!scaleSubtractTare && scaleTareKg > 0 && (
                        <span className="text-[10px] text-amber-200 font-mono mt-0.5">
                          Tábua {scaleTareKg.toFixed(2)} kg (referência • não descontada)
                          {scaleCurrentNetKg > 0 ? ` • c/ tábua: ${(scaleTareKg + scaleCurrentNetKg).toFixed(2)} kg` : ""}
                        </span>
                      )}
                      {scaleSubtractTare && scaleTareKg > 0 && scaleGrossKg > scaleTareKg && (
                        <span className="text-[10px] text-cyan-300 font-mono mt-0.5">
                          {scaleGrossKg.toFixed(2)} − {scaleTareKg.toFixed(2)} = {scaleCurrentNetKg.toFixed(2)} kg
                        </span>
                      )}
                      {scaleSubtractTare && scaleGrossKg > 0 && scaleTareKg > 0 && scaleGrossKg <= scaleTareKg && (
                        <div className="mt-1.5 space-y-1 text-[10.5px] text-amber-200 leading-snug">
                          <span>
                            ⚠️ Visor ({scaleGrossKg.toFixed(2)} kg) menor que a Tara ({scaleTareKg.toFixed(2)} kg).
                          </span>
                          <button
                            type="button"
                            onClick={() => setScaleSubtractTare(false)}
                            className="w-full min-h-[32px] px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-400/40 rounded-lg text-[10px] font-black text-emerald-100 cursor-pointer touch-manipulation"
                          >
                            Manter {scaleGrossKg.toFixed(2)} kg (Peso Direto)
                          </button>
                        </div>
                      )}
                    </div>
                    </div>
                  </div>
                </div>

                {/* Explicação prática da Tara + Dica para Balança de Vidro Temperado + Tábua */}
                <div className="p-3 bg-amber-950/25 border border-amber-500/30 rounded-xl text-[11.5px] text-slate-200 space-y-1.5 leading-relaxed">
                  <div className="font-black text-amber-300 flex items-center gap-1.5">
                    <span>💡</span>
                    <span>O que é Tara & Dica para Balança de Vidro Temperado com Tábua:</span>
                  </div>
                  <p>
                    <strong className="text-white">Sim, a tábua/caixa/balde vazio em cima da balança se chama TARA!</strong> O app faz{" "}
                    <span className="font-mono text-emerald-300">Peso Bruto - Tara = Peso Líquido</span>. Se a sua balança já zerou (<span className="font-mono">0.0</span>) com a tábua em cima antes de pesar o material, deixe a Tara em <strong className="text-white">0</strong>.
                  </p>
                  <p className="text-amber-100/90">
                    ⚠️ <strong className="text-white">Cuidado no vidro temperado:</strong> não apoie pés de fogão ou ferro duro direto no vidro (pode trincar o vidro ou dar erro nos 4 sensores dos cantos). Use uma borrachinha/EVA entre a tábua e o vidro e deixe a balança em chão reto.
                  </p>
                  <details className="pt-1.5 border-t border-amber-500/20">
                    <summary className="cursor-pointer font-black text-cyan-300 hover:text-cyan-200 select-none">
                      📊 Ver Peso Médio no Ferro Velho (Fogão, Geladeira, Armário de Ferro)
                    </summary>
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                      <div className="p-2 rounded-lg bg-slate-950/75 border border-white/10">
                        <strong className="text-white block">🔥 Fogão</strong>
                        <span className="text-slate-300 block">• 4 bocas: <strong>22 a 32 kg</strong></span>
                        <span className="text-slate-300 block">• 5/6 bocas: <strong>35 a 50 kg</strong></span>
                        <span className="text-slate-400 block">• Industrial: 45 a 90 kg</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-950/75 border border-white/10">
                        <strong className="text-white block">❄️ Geladeira</strong>
                        <span className="text-slate-300 block">• Frigobar: <strong>20 a 32 kg</strong></span>
                        <span className="text-slate-300 block">• 1 porta peq.: <strong>35 a 50 kg</strong></span>
                        <span className="text-slate-400 block">• Duplex média: 55 a 80 kg</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-950/75 border border-white/10">
                        <strong className="text-white block">🗄️ Armário de Ferro</strong>
                        <span className="text-slate-300 block">• Estante aço: <strong>12 a 20 kg</strong></span>
                        <span className="text-slate-300 block">• Médio 2 pts: <strong>22 a 35 kg</strong></span>
                        <span className="text-slate-400 block">• Alto / Arquivo: 35 a 65 kg</span>
                      </div>
                    </div>
                  </details>
                </div>

                {/* Lista Acumulada de Múltiplas Sacolas/Caixas + Botão Lançar */}
                {scaleQueueReadings.length > 0 && (
                  <div className="p-3 bg-slate-900/90 border border-cyan-500/30 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-black text-cyan-300">
                        🧺 Pesagens Acumuladas ({scaleQueueReadings.length}): Total {scaleQueueTotalNetKg.toFixed(2)} kg líquido
                      </span>
                      <button
                        type="button"
                        onClick={() => setScaleQueueReadings([])}
                        className="text-rose-300 hover:text-rose-200 font-bold text-xs cursor-pointer"
                      >
                        Limpar Lista
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {scaleQueueReadings.map((r) => (
                        <span
                          key={r.id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-950 border border-cyan-500/30 rounded-lg text-[11px] font-mono text-white"
                        >
                          <span>
                            {r.label}: <strong className="text-emerald-300">{r.netKg.toFixed(2)} kg</strong>
                            {r.tareKg > 0 ? ` (tara -${r.tareKg.toFixed(2)})` : ""}
                          </span>
                          <button
                            type="button"
                            onClick={() => setScaleQueueReadings((prev) => prev.filter((item) => item.id !== r.id))}
                            className="text-rose-400 hover:text-rose-200 cursor-pointer"
                            title="Remover esta pesada"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Seletor de Colaborador (Com Nome, Sem Nome ou Digitar na Hora) + Forma de Pagamento */}
                <div className="p-3 bg-slate-900/90 border border-emerald-500/30 rounded-xl space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <label className="text-[10.5px] font-black uppercase text-emerald-300">
                          👤 Nome no Recibo / Receber Pagamento:
                        </label>
                        <div className="flex items-center gap-1 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setScrapCollabMode("cadastrado")}
                            className={`min-h-[30px] px-2 rounded-lg text-[10px] font-black border cursor-pointer touch-manipulation ${
                              scrapCollabMode === "cadastrado"
                                ? "bg-emerald-500 text-slate-950 border-emerald-400"
                                : "bg-slate-950 text-slate-300 border-white/10"
                            }`}
                          >
                            👤 Cadastrado
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setScrapCollabMode("sem_nome");
                              if (scaleSettlementMode === "caderninho") setScaleSettlementMode("pago_dinheiro");
                            }}
                            className={`min-h-[30px] px-2 rounded-lg text-[10px] font-black border cursor-pointer touch-manipulation ${
                              scrapCollabMode === "sem_nome"
                                ? "bg-cyan-500 text-slate-950 border-cyan-400"
                                : "bg-slate-950 text-slate-300 border-white/10"
                            }`}
                          >
                            🪪 Sem Nome
                          </button>
                          <button
                            type="button"
                            onClick={() => setScrapCollabMode("nome_avulso")}
                            className={`min-h-[30px] px-2 rounded-lg text-[10px] font-black border cursor-pointer touch-manipulation ${
                              scrapCollabMode === "nome_avulso"
                                ? "bg-amber-400 text-slate-950 border-amber-300"
                                : "bg-slate-950 text-slate-300 border-white/10"
                            }`}
                          >
                            ✍️ Digitar Nome
                          </button>
                        </div>
                      </div>

                      {scrapCollabMode === "cadastrado" && (
                        <div className="flex items-center gap-2">
                          <select
                            value={activeCollab?.id || selectedCollabId}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (v === "__sem_nome__") {
                                setScrapCollabMode("sem_nome");
                                if (scaleSettlementMode === "caderninho") setScaleSettlementMode("pago_dinheiro");
                              } else if (v === "__digitar_nome__") {
                                setScrapCollabMode("nome_avulso");
                              } else {
                                setSelectedCollabId(v);
                              }
                            }}
                            className="flex-1 min-h-[44px] bg-slate-950 border border-emerald-500/35 rounded-xl px-3 text-white font-bold text-xs sm:text-sm outline-none"
                          >
                            <option value="__sem_nome__">🪪 Sem Nome no Recibo (Avulso / Direto)</option>
                            <option value="__digitar_nome__">✍️ Digitar Outro Nome na Hora...</option>
                            {collaborators.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.isFounder ? "👑 " : "👤 "}
                                {c.name}
                                {!c.isFounder && c.balancePending > 0 ? ` (Devo R$ ${c.balancePending.toFixed(2)})` : ""}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => setShowAddCollabModal(true)}
                            className="min-h-[44px] px-3 bg-emerald-600/20 hover:bg-emerald-600 hover:text-slate-950 text-emerald-300 font-black text-xs rounded-xl border border-emerald-500/40 flex items-center gap-1 cursor-pointer touch-manipulation select-none shrink-0"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>+ Novo</span>
                          </button>
                        </div>
                      )}

                      {scrapCollabMode === "sem_nome" && (
                        <div className="p-2.5 bg-slate-950 border border-cyan-500/35 rounded-xl flex items-center justify-between gap-2 text-xs">
                          <span className="text-cyan-200 font-bold">
                            🪪 Recibo sairá como <strong className="text-white">Reciclador Avulso (Sem Nome)</strong> — Pagamento Direto.
                          </span>
                          <button
                            type="button"
                            onClick={() => setScrapCollabMode("cadastrado")}
                            className="text-[10.5px] font-black text-emerald-300 underline shrink-0 cursor-pointer"
                          >
                            Trocar
                          </button>
                        </div>
                      )}

                      {scrapCollabMode === "nome_avulso" && (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={scrapCustomCollabName}
                            onChange={(e) => setScrapCustomCollabName(e.target.value)}
                            placeholder="Digite o nome no recibo (ou deixe vazio p/ Sem Nome)"
                            className="flex-1 min-h-[44px] bg-slate-950 border border-amber-400/50 rounded-xl px-3 text-white font-bold text-xs sm:text-sm outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setScrapCollabMode("cadastrado")}
                            className="min-h-[44px] px-3 bg-slate-950 border border-white/15 text-slate-300 font-bold text-xs rounded-xl cursor-pointer shrink-0"
                          >
                            Lista
                          </button>
                        </div>
                      )}
                    </div>

                    {scaleCombinedWeightKg > 0 && scaleEffectivePricePerKg > 0 && (
                      <div className="px-3.5 py-2 bg-slate-950 border border-amber-500/35 rounded-xl text-right shrink-0">
                        <span className="text-[10px] font-bold uppercase text-amber-300 block">
                          {scrapCollabMode === "cadastrado" && activeCollab?.isFounder ? "Economia D.W:" : "Total Só Este Item:"}
                        </span>
                        <strong className="text-lg font-mono font-black text-amber-300">
                          R$ {scaleTotalPayable.toFixed(2).replace(".", ",")}
                        </strong>
                      </div>
                    )}
                  </div>

                  {!(scrapCollabMode === "cadastrado" && activeCollab?.isFounder) && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {(
                        [
                          { id: "pago_dinheiro", label: "💵 Direto Dinheiro" },
                          { id: "pago_pix", label: "📱 Direto Pix" },
                          { id: "caderninho", label: "📓 Caderninho" },
                          { id: "so_estoque", label: "📦 Só Estoque" }
                        ] as const
                      ).map((opt) => {
                        const disabledCaderninho = opt.id === "caderninho" && scrapCollabMode === "sem_nome";
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            disabled={disabledCaderninho}
                            onClick={() => setScaleSettlementMode(opt.id)}
                            className={`min-h-[40px] px-2.5 py-1.5 rounded-xl text-[11px] font-black border transition-all touch-manipulation select-none active:scale-95 ${
                              disabledCaderninho
                                ? "bg-slate-950/50 text-slate-600 border-white/5 cursor-not-allowed"
                                : scaleSettlementMode === opt.id
                                ? opt.id === "caderninho"
                                  ? "bg-amber-500 text-slate-950 border-amber-400 cursor-pointer"
                                  : opt.id === "so_estoque"
                                  ? "bg-cyan-500 text-slate-950 border-cyan-400 cursor-pointer"
                                  : "bg-emerald-500 text-slate-950 border-emerald-400 cursor-pointer"
                                : "bg-slate-950 text-slate-300 border-white/10 hover:text-white cursor-pointer"
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Botões da Balança: (1) Mesma sacola, (2) Somar na Lista de Vários Materiais do Dia, (3) Fechar só este item */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleAddReadingToScaleQueue}
                    className="min-h-[48px] px-3 py-2.5 bg-slate-900 hover:bg-slate-800 text-cyan-200 font-black text-xs uppercase rounded-xl border border-cyan-500/40 flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation select-none active:scale-95"
                  >
                    <Plus className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>+ Sacola Mesmo Material</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedScaleMaterial) return;
                      if (scaleCombinedWeightKg <= 0) {
                        if (showNotification) showNotification("Digite o peso da balança antes de somar na lista do recibo.", "warning");
                        return;
                      }
                      handleAddItemToScrapBasket({
                        material: selectedScaleMaterial,
                        weightKg: scaleCombinedWeightKg,
                        units: Math.max(0, parseInt(scaleUnitsInput || "0", 10) || 0),
                        pricePerKg: scaleEffectivePricePerKg,
                        addToStock: true
                      });
                      setScaleGrossInput("");
                      setScaleUnitsInput("");
                      setScaleQueueReadings([]);
                    }}
                    className="min-h-[48px] px-3 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase rounded-xl shadow-md shadow-amber-400/20 flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation select-none active:scale-95"
                  >
                    <ShoppingCart className="w-4 h-4 shrink-0" />
                    <span>🧺 + Somar no Recibo (PET + Lata...)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCommitDigitalScaleToStock}
                    className="min-h-[50px] px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-xs uppercase rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation select-none active:scale-95"
                  >
                    <Check className="w-4 h-4 shrink-0" />
                    <span>
                      {!(scrapCollabMode === "cadastrado" && activeCollab?.isFounder) && scaleTotalPayable > 0 && scaleSettlementMode !== "so_estoque"
                        ? scaleSettlementMode === "caderninho"
                          ? `Anotar Só Este (R$ ${scaleTotalPayable.toFixed(2).replace(".", ",")})`
                          : `Pagar Só Este (R$ ${scaleTotalPayable.toFixed(2).replace(".", ",")})`
                        : `Lançar Só Este (${scaleCombinedWeightKg.toFixed(2)} kg)`}
                    </span>
                  </button>
                </div>
              </div>

              {/* ========================================================= */}
              {/* RECIBO ÚNICO MULTI-MATERIAIS DO DIA (SOMAR PET + PLÁSTICO + LATINHA + DESCONTO/ACRÉSCIMO) */}
              {/* ========================================================= */}
              <div
                ref={scrapBasketPanelRef}
                className={`p-4 sm:p-5 rounded-2xl border-2 space-y-4 transition-all ${
                  scrapBasket.length > 0
                    ? "bg-gradient-to-br from-emerald-950/50 via-slate-950 to-amber-950/30 border-amber-400/60 shadow-xl"
                    : "bg-slate-950/80 border-white/10"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div>
                    <span className="text-[10px] font-black uppercase text-amber-300 tracking-wider block">
                      🧾 Somar Todas as Reciclagens do Dia em 1 Recibo Só
                    </span>
                    <h4 className="text-base font-black text-white flex items-center gap-2 mt-0.5">
                      <span>🧺 Recibo Único Multi-Materiais ({scrapBasket.length} {scrapBasket.length === 1 ? "item" : "itens"})</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Junte PET + Plástico Duro + Latinha + Ferro tudo na mesma soma, aplique Acréscimo (+) ou Desconto/Dívida (−) e pague com 1 recibo só!
                    </p>
                  </div>

                  {scrapBasket.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setScrapBasket([])}
                      className="min-h-[38px] px-3 bg-rose-950/60 hover:bg-rose-900 text-rose-200 font-bold text-xs rounded-xl border border-rose-500/30 cursor-pointer self-start sm:self-center shrink-0"
                    >
                      Limpar Lista
                    </button>
                  )}
                </div>

                {/* Adicionar material direto aqui dentro do Recibo Único */}
                <div className="p-3 bg-slate-900/90 border border-white/10 rounded-xl space-y-2">
                  <span className="text-[10.5px] font-black uppercase text-cyan-300 block">
                    + Adicionar Material na Soma do Recibo:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                    <select
                      value={scrapBasketQuickMatId}
                      onChange={(e) => setScrapBasketQuickMatId(e.target.value)}
                      className="sm:col-span-5 min-h-[44px] bg-slate-950 border border-white/15 rounded-xl px-2.5 text-white font-bold text-xs outline-none"
                    >
                      {otherScrapMaterials.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.emoji} {m.name} {m.buyPricePerKg > 0 ? `(R$ ${m.buyPricePerKg.toFixed(2).replace(".", ",")}/kg)` : ""}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={scrapBasketQuickKg}
                      onChange={(e) => setScrapBasketQuickKg(e.target.value)}
                      placeholder="Peso kg (ex: 4.80)"
                      className="sm:col-span-3 min-h-[44px] bg-slate-950 border border-cyan-500/40 rounded-xl px-2 text-center text-white font-mono font-black text-sm outline-none"
                    />
                    <input
                      type="text"
                      inputMode="decimal"
                      value={scrapBasketQuickPrice}
                      onChange={(e) => setScrapBasketQuickPrice(e.target.value)}
                      placeholder="R$/kg (ex: 3,00)"
                      className="sm:col-span-2 min-h-[44px] bg-slate-950 border border-amber-500/40 rounded-xl px-2 text-center text-amber-200 font-mono font-black text-sm outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const m = otherScrapMaterials.find((x) => x.id === scrapBasketQuickMatId);
                        if (!m) return;
                        const w = Math.max(0, parseFloat(scrapBasketQuickKg.replace(",", ".")) || 0);
                        const p = Math.max(0, parseFloat(scrapBasketQuickPrice.replace(",", ".")) || 0);
                        if (w <= 0) {
                          if (showNotification) showNotification("Digite o peso (kg) para adicionar na lista.", "warning");
                          return;
                        }
                        handleAddItemToScrapBasket({
                          material: m,
                          weightKg: w,
                          units: 0,
                          pricePerKg: p,
                          addToStock: true
                        });
                        setScrapBasketQuickKg("");
                      }}
                      className="sm:col-span-2 min-h-[44px] px-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase rounded-xl cursor-pointer touch-manipulation select-none active:scale-95"
                    >
                      + Somar
                    </button>
                  </div>
                </div>

                {/* Lista de materiais somados com edição inline de Peso e Preço */}
                {scrapBasket.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="space-y-2">
                      {scrapBasket.map((item, idx) => {
                        const rowTotal = Number((Math.max(0, item.weightKg) * Math.max(0, item.pricePerKg)).toFixed(2));
                        return (
                          <div
                            key={item.id}
                            className="p-3 bg-slate-900 border border-amber-500/25 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-xl">{item.emoji}</span>
                              <div className="min-w-0">
                                <div className="text-xs font-black text-white truncate">
                                  {idx + 1}. {item.materialName}
                                </div>
                                <div className="text-[10.5px] text-slate-400 font-mono">
                                  {item.weightKg.toFixed(2)} kg × R$ {item.pricePerKg.toFixed(2).replace(".", ",")} ={" "}
                                  <strong className="text-emerald-300">R$ {rowTotal.toFixed(2).replace(".", ",")}</strong>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 flex-wrap">
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-slate-400 font-bold">kg:</span>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={
                                    scrapBasketWeightDrafts[item.id] !== undefined
                                      ? scrapBasketWeightDrafts[item.id]
                                      : String(item.weightKg)
                                  }
                                  onChange={(e) => {
                                    const raw = e.target.value;
                                    setScrapBasketWeightDrafts((prev) => ({ ...prev, [item.id]: raw }));
                                    const parsed = parseFloat(raw.replace(",", "."));
                                    if (Number.isFinite(parsed) && parsed >= 0) {
                                      setScrapBasket((prev) =>
                                        prev.map((x) => (x.id === item.id ? { ...x, weightKg: parsed } : x))
                                      );
                                    }
                                  }}
                                  onBlur={() => {
                                    setScrapBasketWeightDrafts((prev) => {
                                      const next = { ...prev };
                                      delete next[item.id];
                                      return next;
                                    });
                                  }}
                                  className="w-20 min-h-[38px] bg-slate-950 border border-cyan-500/40 rounded-lg px-1.5 text-center text-white font-mono font-black text-xs outline-none"
                                />
                              </div>

                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-slate-400 font-bold">R$/kg:</span>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={
                                    scrapBasketPriceDrafts[item.id] !== undefined
                                      ? scrapBasketPriceDrafts[item.id]
                                      : String(item.pricePerKg)
                                  }
                                  onChange={(e) => {
                                    const raw = e.target.value;
                                    setScrapBasketPriceDrafts((prev) => ({ ...prev, [item.id]: raw }));
                                    const parsed = parseFloat(raw.replace(",", "."));
                                    if (Number.isFinite(parsed) && parsed >= 0) {
                                      setScrapBasket((prev) =>
                                        prev.map((x) => (x.id === item.id ? { ...x, pricePerKg: parsed } : x))
                                      );
                                    }
                                  }}
                                  onBlur={() => {
                                    setScrapBasketPriceDrafts((prev) => {
                                      const next = { ...prev };
                                      delete next[item.id];
                                      return next;
                                    });
                                  }}
                                  className="w-20 min-h-[38px] bg-slate-950 border border-amber-500/40 rounded-lg px-1.5 text-center text-amber-200 font-mono font-black text-xs outline-none"
                                />
                              </div>

                              <span className="px-2 py-1 bg-emerald-500/15 border border-emerald-500/30 rounded-lg text-emerald-300 font-mono font-black text-xs">
                                R$ {rowTotal.toFixed(2).replace(".", ",")}
                              </span>

                              <button
                                type="button"
                                onClick={() => setScrapBasket((prev) => prev.filter((x) => x.id !== item.id))}
                                className="min-h-[38px] min-w-[38px] flex items-center justify-center bg-slate-950 hover:bg-rose-950 text-rose-300 rounded-lg border border-rose-500/25 cursor-pointer"
                                title="Remover item"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Descontos (Dívida / Vale) e Acréscimos (+ Bônus / Extra) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      <div className="p-2.5 bg-slate-900 border border-emerald-500/30 rounded-xl space-y-1.5">
                        <label className="text-[10.5px] font-black uppercase text-emerald-300 block">
                          ➕ Acréscimo / Crédito (+ R$):
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={scrapBasketBonusInput}
                            onChange={(e) => setScrapBasketBonusInput(e.target.value)}
                            placeholder="0,00"
                            className="w-24 min-h-[40px] bg-slate-950 border border-emerald-500/40 rounded-lg px-2 text-center text-emerald-300 font-mono font-black text-sm outline-none"
                          />
                          <input
                            type="text"
                            value={scrapBasketBonusReason}
                            onChange={(e) => setScrapBasketBonusReason(e.target.value)}
                            placeholder="Motivo (ex: Bônus / Extra)"
                            className="flex-1 min-h-[40px] bg-slate-950 border border-white/10 rounded-lg px-2.5 text-xs text-white outline-none"
                          />
                        </div>
                      </div>

                      <div className="p-2.5 bg-slate-900 border border-rose-500/30 rounded-xl space-y-1.5">
                        <label className="text-[10.5px] font-black uppercase text-rose-300 block">
                          ➖ Desconto / Dívida do Reciclador (− R$):
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={scrapBasketDiscountInput}
                            onChange={(e) => setScrapBasketDiscountInput(e.target.value)}
                            placeholder="0,00"
                            className="w-24 min-h-[40px] bg-slate-950 border border-rose-500/40 rounded-lg px-2 text-center text-rose-300 font-mono font-black text-sm outline-none"
                          />
                          <input
                            type="text"
                            value={scrapBasketDiscountReason}
                            onChange={(e) => setScrapBasketDiscountReason(e.target.value)}
                            placeholder="Motivo (ex: Estava devendo / Vale)"
                            className="flex-1 min-h-[40px] bg-slate-950 border border-white/10 rounded-lg px-2.5 text-xs text-white outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Resumo Matemático Completo + Fechar Recibo Único */}
                    <div className="p-3.5 bg-slate-900 border border-amber-400/40 rounded-xl space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
                        <span>
                          Peso Total: <strong className="text-cyan-300 font-mono">{scrapBasketStats.totalWeightKg.toFixed(2)} kg</strong>
                        </span>
                        <span>
                          Subtotal Materiais: <strong className="text-white font-mono">R$ {scrapBasketStats.subtotal.toFixed(2).replace(".", ",")}</strong>
                        </span>
                        {scrapBasketStats.bonus > 0 && (
                          <span className="text-emerald-300 font-mono font-bold">
                            + Acréscimo: R$ {scrapBasketStats.bonus.toFixed(2).replace(".", ",")}
                          </span>
                        )}
                        {scrapBasketStats.discount > 0 && (
                          <span className="text-rose-300 font-mono font-bold">
                            − Desconto: R$ {scrapBasketStats.discount.toFixed(2).replace(".", ",")}
                          </span>
                        )}
                      </div>

                      {scrapBasketStats.remainingDebt > 0 && (
                        <div className="text-[11px] font-bold text-rose-300 bg-rose-950/40 border border-rose-500/30 rounded-lg px-2.5 py-1.5">
                          ⚠️ O desconto foi maior que o valor das reciclagens: fica R$ 0,00 a pagar agora e ainda restaria R$ {scrapBasketStats.remainingDebt.toFixed(2).replace(".", ",")} de dívida.
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1 border-t border-white/10">
                        <div>
                          <span className="text-[10.5px] font-black uppercase text-amber-300 block">
                            Total Líquido do Recibo Único ({scrapCollabMode === "sem_nome" ? "Sem Nome" : scrapCollabMode === "nome_avulso" ? scrapCustomCollabName.trim() || "Avulso" : activeCollab?.name}):
                          </span>
                          <strong className="text-2xl font-mono font-black text-emerald-400">
                            R$ {scrapBasketStats.netPayable.toFixed(2).replace(".", ",")}
                          </strong>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const entries = scrapBasket
                              .map((b) => {
                                const m = otherScrapMaterials.find((x) => x.id === b.materialId);
                                if (!m) return null;
                                return {
                                  material: m,
                                  weightKg: b.weightKg,
                                  units: b.units,
                                  pricePerKg: b.pricePerKg,
                                  addWeightToStock: b.addToStock
                                };
                              })
                              .filter(Boolean) as {
                              material: OtherScrapMaterial;
                              weightKg: number;
                              units: number;
                              pricePerKg: number;
                              addWeightToStock: boolean;
                            }[];

                            const ok = commitScrapItemsWithAdjustments({
                              entries,
                              collabChoiceId: activeCollab?.id || selectedCollabId,
                              collabMode: scrapCollabMode,
                              customName: scrapCustomCollabName,
                              mode: scaleSettlementMode,
                              bonusAmount: scrapBasketStats.bonus,
                              bonusReason: scrapBasketBonusReason,
                              discountAmount: scrapBasketStats.discount,
                              discountReason: scrapBasketDiscountReason
                            });

                            if (ok) {
                              setScrapBasket([]);
                              setScrapBasketBonusInput("");
                              setScrapBasketBonusReason("");
                              setScrapBasketDiscountInput("");
                              setScrapBasketDiscountReason("");
                            }
                          }}
                          className="min-h-[50px] px-5 py-2.5 bg-gradient-to-r from-amber-400 to-emerald-400 hover:from-amber-300 hover:to-emerald-300 text-slate-950 font-black text-xs sm:text-sm uppercase rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer touch-manipulation select-none active:scale-95"
                        >
                          <CheckCircle2 className="w-5 h-5" />
                          <span>
                            {!(scrapCollabMode === "cadastrado" && activeCollab?.isFounder) && scaleSettlementMode === "caderninho"
                              ? `Fechar Recibo + Caderninho (R$ ${scrapBasketStats.netPayable.toFixed(2).replace(".", ",")})`
                              : `Fechar Recibo Único (R$ ${scrapBasketStats.netPayable.toFixed(2).replace(".", ",")})`}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* BARRA DE FILTROS POR GRUPO + BUSCA + NOVO MATERIAL */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  {(
                    [
                      { id: "todos", label: `Todos (${otherScrapMaterials.length})` },
                      { id: "plasticos", label: "🧴 Plásticos" },
                      { id: "metais", label: "🔩 Metais" },
                      { id: "eletronicos", label: "📺 Eletrônicos & TVs" },
                      { id: "papeis", label: "📦 Papéis & Papelão" },
                      { id: "outros", label: "🧩 Outros" }
                    ] as const
                  ).map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setScrapCategoryFilter(cat.id)}
                      className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer touch-manipulation select-none active:scale-95 ${
                        scrapCategoryFilter === cat.id
                          ? "bg-cyan-500 text-slate-950 border-cyan-400 shadow"
                          : "bg-slate-950 text-slate-300 border-white/10 hover:text-white"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => setShowAddCustomScrapForm((v) => !v)}
                    className="min-h-[44px] px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-xs uppercase rounded-xl flex items-center gap-1.5 cursor-pointer touch-manipulation select-none active:scale-95 ml-auto"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Novo Material</span>
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={scrapSearchQuery}
                      onChange={(e) => setScrapSearchQuery(e.target.value)}
                      placeholder="Buscar PET, Latinha, Plástico Duro, Ferro, Cobre, Celular, TV, Papelão..."
                      className="w-full min-h-[46px] bg-slate-950 border border-white/15 rounded-xl pl-10 pr-9 text-sm text-white placeholder:text-slate-500 outline-none focus:border-cyan-400"
                    />
                    {scrapSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setScrapSearchQuery("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {otherScrapMaterials.some((m) => m.buyPricePerKg > 0) && (
                    confirmClearAllScrapPrices ? (
                      <div className="flex items-center gap-1.5 bg-slate-950 border border-amber-500/40 rounded-xl px-3 py-1.5">
                        <span className="text-[11px] font-bold text-amber-200">Zerar todos os preços?</span>
                        <button
                          type="button"
                          onClick={() => {
                            markLocalYardMutation();
                            setOtherScrapMaterials((prev) => prev.map((m) => ({ ...m, buyPricePerKg: 0 })));
                            setConfirmClearAllScrapPrices(false);
                            if (showNotification) showNotification("Todos os materiais voltaram para 'Sem preço definido'.", "info");
                          }}
                          className="min-h-[36px] px-2.5 bg-amber-500 text-slate-950 font-black text-xs rounded-lg cursor-pointer"
                        >
                          Sim
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmClearAllScrapPrices(false)}
                          className="min-h-[36px] px-2.5 bg-slate-800 text-slate-200 font-bold text-xs rounded-lg cursor-pointer"
                        >
                          Não
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmClearAllScrapPrices(true)}
                        className="min-h-[46px] px-3.5 py-2 bg-slate-950 hover:bg-slate-800 text-amber-300 font-bold text-xs rounded-xl border border-amber-500/30 flex items-center gap-1.5 cursor-pointer touch-manipulation select-none active:scale-95"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Deixar Tudo Sem Preço</span>
                      </button>
                    )
                  )}

                  <button
                    type="button"
                    onClick={() => setShowZeroConfirmModal(true)}
                    className="min-h-[46px] px-3.5 py-2 bg-slate-950 hover:bg-rose-950/60 text-rose-300 font-black text-xs uppercase rounded-xl border border-rose-500/35 flex items-center gap-1.5 cursor-pointer touch-manipulation select-none active:scale-95"
                  >
                    <Eraser className="w-4 h-4 text-rose-400" />
                    <span>Zerar Testes 🧹</span>
                  </button>
                </div>

                {/* FORMULÁRIO INLINE PARA CADASTRAR NOVO MATERIAL */}
                {showAddCustomScrapForm && (
                  <div className="p-4 bg-slate-950 border-2 border-emerald-500/40 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-emerald-400">
                        + Cadastrar Novo Material no Ferro Velho (Sem preço inicial)
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowAddCustomScrapForm(false)}
                        className="text-slate-400 hover:text-white cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <input
                        type="text"
                        value={newScrapName}
                        onChange={(e) => setNewScrapName(e.target.value)}
                        placeholder="Nome (ex: Inox, Bateria, Motor...)"
                        className="sm:col-span-2 min-h-[46px] bg-slate-900 border border-white/15 rounded-xl px-3 text-sm text-white outline-none focus:border-emerald-400"
                      />
                      <select
                        value={newScrapGroup}
                        onChange={(e) => setNewScrapGroup(e.target.value as ScrapCategoryGroup)}
                        className="min-h-[46px] bg-slate-900 border border-white/15 rounded-xl px-3 text-sm text-white font-bold outline-none"
                      >
                        <option value="plasticos">🧴 Plásticos</option>
                        <option value="metais">🔩 Metais</option>
                        <option value="eletronicos">📺 Eletrônicos & Eletro</option>
                        <option value="papeis">📦 Papéis & Papelão</option>
                        <option value="outros">🧩 Outros</option>
                      </select>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-slate-400 font-bold">Ícone:</span>
                      {["♻️", "🔋", "🔌", "🖥️", "⚙️", "🪣", "🧴", "📦", "🪙", "📚"].map((em) => (
                        <button
                          key={em}
                          type="button"
                          onClick={() => setNewScrapEmoji(em)}
                          className={`min-h-[40px] min-w-[40px] rounded-xl text-lg border cursor-pointer touch-manipulation select-none active:scale-95 ${
                            newScrapEmoji === em
                              ? "bg-emerald-500/25 border-emerald-400"
                              : "bg-slate-900 border-white/10"
                          }`}
                        >
                          {em}
                        </button>
                      ))}
                      <label className="flex items-center gap-2 text-xs text-slate-200 font-bold ml-auto cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newScrapTrackUnits}
                          onChange={(e) => setNewScrapTrackUnits(e.target.checked)}
                          className="w-4 h-4 accent-emerald-500"
                        />
                        <span>Contar também por unidade (un)</span>
                      </label>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={newScrapNotes}
                        onChange={(e) => setNewScrapNotes(e.target.value)}
                        placeholder="Observação opcional (ex: baterias de carro/moto)"
                        className="flex-1 min-h-[44px] bg-slate-900 border border-white/15 rounded-xl px-3 text-xs text-white outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleCreateCustomScrapMaterial}
                        className="min-h-[44px] px-5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase rounded-xl cursor-pointer touch-manipulation select-none active:scale-95"
                      >
                        Salvar Material ✓
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* GRADE DOS MATERIAIS CONFIGURADOS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredScrapMaterials.map((mat) => {
                  const groupInfo = SCRAP_GROUP_META[mat.categoryGroup || "outros"];
                  const isEditingThisPrice = editingScrapPriceId === mat.id;
                  const isSelectedOnScale = selectedScaleMaterial?.id === mat.id;
                  const acct = recyclingProfitAccounting.byMaterialMap.get(mat.id);
                  const sellPrice = Math.max(0, Number(mat.sellPricePerKg) || 0);
                  const profitPerKg = sellPrice > 0 ? sellPrice - mat.buyPricePerKg : 0;
                  const marginPct = mat.buyPricePerKg > 0 && sellPrice > 0 ? (profitPerKg / mat.buyPricePerKg) * 100 : 0;

                  return (
                    <div
                      key={mat.id}
                      className={`p-4 bg-slate-950 rounded-2xl border transition-all space-y-3 ${
                        isSelectedOnScale ? "border-cyan-400 shadow-md shadow-cyan-500/10" : "border-cyan-500/25"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <span className="text-3xl p-2 bg-slate-900 rounded-xl shrink-0">{mat.emoji}</span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-slate-900 text-cyan-300 border border-cyan-500/25">
                                {groupInfo.badge}
                              </span>
                              {mat.buyPricePerKg > 0 ? (
                                <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                  Pago: R$ {mat.buyPricePerKg.toFixed(2).replace(".", ",")}/kg
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-white/10">
                                  Sem preço pago
                                </span>
                              )}
                              {sellPrice > 0 ? (
                                <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                                  Revendo: R$ {sellPrice.toFixed(2).replace(".", ",")}/kg
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-900 text-slate-400 border border-white/10">
                                  Sem revenda
                                </span>
                              )}
                              {mat.buyPricePerKg > 0 && sellPrice > 0 && (
                                <span
                                  className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-md border ${
                                    profitPerKg >= 0
                                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                      : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                                  }`}
                                >
                                  Lucro: {profitPerKg >= 0 ? "+" : ""}R$ {profitPerKg.toFixed(2).replace(".", ",")}/kg ({marginPct >= 0 ? "+" : ""}
                                  {marginPct.toFixed(0)}%)
                                </span>
                              )}
                            </div>
                            <div className="text-white font-black text-sm mt-1">{mat.name}</div>
                            {mat.notes && (
                              <div className="text-[11px] text-slate-400 mt-0.5">{mat.notes}</div>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <strong className="text-lg font-mono font-black text-cyan-300 block">
                            {mat.stockKg.toFixed(1)} kg
                          </strong>
                          {(mat.trackUnits || (mat.stockUnits || 0) > 0) && (
                            <span className="text-xs font-mono font-black text-amber-300 block">
                              {mat.stockUnits || 0} un
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Edição dupla de preço: Quanto Eu Pago (R$/kg) e Por Quanto Vou Revender (R$/kg) */}
                      {isEditingThisPrice && (
                        <div className="p-3 bg-slate-900 border border-amber-500/35 rounded-xl space-y-2.5">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[10px] font-black uppercase text-amber-300 block">
                                💸 Quanto Eu Pago (R$/kg):
                              </label>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={editingScrapPriceDraft}
                                onChange={(e) => setEditingScrapPriceDraft(e.target.value)}
                                placeholder="Ex: 3,00"
                                className="w-full min-h-[42px] bg-slate-950 border border-amber-400/50 rounded-lg px-2 text-center text-white font-mono font-black text-sm outline-none"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-black uppercase text-cyan-300 block">
                                📈 Por Quanto Revendo (R$/kg):
                              </label>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={editingScrapSellPriceDraft}
                                onChange={(e) => setEditingScrapSellPriceDraft(e.target.value)}
                                placeholder="Ex: 4,50"
                                className="w-full min-h-[42px] bg-slate-950 border border-cyan-400/50 rounded-lg px-2 text-center text-cyan-200 font-mono font-black text-sm outline-none"
                              />
                            </div>
                          </div>
                          {(() => {
                            const pBuy = Math.max(0, parseFloat(editingScrapPriceDraft.replace(",", ".")) || 0);
                            const pSell = Math.max(0, parseFloat(editingScrapSellPriceDraft.replace(",", ".")) || 0);
                            if (pBuy > 0 && pSell > 0) {
                              const diff = pSell - pBuy;
                              return (
                                <div className={`text-[11px] font-mono font-black ${diff >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                                  Lucro por kg: {diff >= 0 ? "+" : ""}R$ {diff.toFixed(2).replace(".", ",")}/kg ({((diff / pBuy) * 100).toFixed(0)}%)
                                </div>
                              );
                            }
                            return null;
                          })()}
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const parsedBuy = Math.max(0, parseFloat(editingScrapPriceDraft.replace(",", ".")) || 0);
                                const parsedSell = Math.max(0, parseFloat(editingScrapSellPriceDraft.replace(",", ".")) || 0);
                                handleUpdateScrapPrices(mat.id, parsedBuy, parsedSell);
                                setEditingScrapPriceId(null);
                              }}
                              className="min-h-[40px] px-4 bg-emerald-500 text-slate-950 font-black text-xs rounded-lg cursor-pointer"
                            >
                              Salvar Preços ✓
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingScrapPriceId(null)}
                              className="min-h-[40px] px-3 bg-slate-800 text-slate-300 font-bold text-xs rounded-lg cursor-pointer"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Controles rápidos de Estoque & Balança */}
                      <div className="space-y-1.5">
                        <span className="text-[10.5px] font-black uppercase text-slate-400 block">
                          ⚖️ Editar Peso no Estoque (kg — aceita vírgula/ponto ex: 3.100):
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={
                              scrapWeightDrafts[mat.id] !== undefined
                                ? scrapWeightDrafts[mat.id]
                                : mat.stockKg === 0
                                ? ""
                                : String(mat.stockKg)
                            }
                            placeholder="Ex: 3.100"
                            onChange={(e) => {
                              const raw = e.target.value;
                              setScrapWeightDrafts((prev) => ({ ...prev, [mat.id]: raw }));
                              const parsed = parseFloat(raw.replace(",", "."));
                              if (raw.trim() === "") {
                                markLocalYardMutation();
                                setOtherScrapMaterials((prev) =>
                                  prev.map((m) => (m.id === mat.id ? { ...m, stockKg: 0 } : m))
                                );
                              } else if (Number.isFinite(parsed) && parsed >= 0) {
                                markLocalYardMutation();
                                setOtherScrapMaterials((prev) =>
                                  prev.map((m) => (m.id === mat.id ? { ...m, stockKg: parsed } : m))
                                );
                              }
                            }}
                            onBlur={() => {
                              setScrapWeightDrafts((prev) => {
                                const next = { ...prev };
                                delete next[mat.id];
                                return next;
                              });
                            }}
                            className="w-24 min-h-[44px] bg-slate-900 border border-cyan-500/45 rounded-xl px-2 text-center text-white font-mono font-black text-sm outline-none focus:border-cyan-300"
                          />
                          {[1, 5, 10, 50].map((addKg) => (
                            <button
                              key={addKg}
                              type="button"
                              onClick={() => {
                                markLocalYardMutation();
                                setScrapWeightDrafts((prev) => {
                                  const next = { ...prev };
                                  delete next[mat.id];
                                  return next;
                                });
                                setOtherScrapMaterials((prev) =>
                                  prev.map((m) => (m.id === mat.id ? { ...m, stockKg: Number((m.stockKg + addKg).toFixed(3)) } : m))
                                );
                              }}
                              className="min-h-[44px] px-2.5 bg-slate-900 hover:bg-cyan-500 hover:text-slate-950 text-cyan-200 font-mono font-black text-xs rounded-xl border border-white/10 cursor-pointer touch-manipulation select-none active:scale-95"
                            >
                              +{addKg}kg
                            </button>
                          ))}
                          {mat.trackUnits && (
                            <button
                              type="button"
                              onClick={() => {
                                markLocalYardMutation();
                                setOtherScrapMaterials((prev) =>
                                  prev.map((m) =>
                                    m.id === mat.id ? { ...m, stockUnits: (m.stockUnits || 0) + 1 } : m
                                  )
                                );
                              }}
                              className="min-h-[44px] px-2.5 bg-amber-500/15 hover:bg-amber-500 hover:text-slate-950 text-amber-300 font-mono font-black text-xs rounded-xl border border-amber-500/35 cursor-pointer touch-manipulation select-none active:scale-95"
                            >
                              +1 un
                            </button>
                          )}
                        </div>

                        {mat.stockKg > 0 && (mat.buyPricePerKg > 0 || sellPrice > 0) && (
                          <div className="p-2.5 bg-slate-900/90 border border-emerald-500/30 rounded-xl space-y-1 text-xs">
                            {mat.buyPricePerKg > 0 && (
                              <div className="flex items-center justify-between">
                                <span className="text-amber-200 font-bold">
                                  💸 Paguei ({mat.stockKg.toFixed(2)} kg × R$ {mat.buyPricePerKg.toFixed(2).replace(".", ",")}):
                                </span>
                                <strong className="text-amber-300 font-mono font-black">
                                  R$ {(mat.stockKg * mat.buyPricePerKg).toFixed(2).replace(".", ",")}
                                </strong>
                              </div>
                            )}
                            {sellPrice > 0 && (
                              <div className="flex items-center justify-between">
                                <span className="text-cyan-200 font-bold">
                                  🏦 Vão me pagar ({mat.stockKg.toFixed(2)} kg × R$ {sellPrice.toFixed(2).replace(".", ",")}):
                                </span>
                                <strong className="text-cyan-300 font-mono font-black">
                                  R$ {(mat.stockKg * sellPrice).toFixed(2).replace(".", ",")}
                                </strong>
                              </div>
                            )}
                            {mat.buyPricePerKg > 0 && sellPrice > 0 && (
                              <div className="flex items-center justify-between pt-1 border-t border-white/10">
                                <span className="text-emerald-200 font-black uppercase text-[10.5px]">
                                  📈 Meu Lucro neste Material:
                                </span>
                                <strong className={`font-mono font-black ${profitPerKg >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                  {profitPerKg >= 0 ? "+" : ""}R$ {(mat.stockKg * profitPerKg).toFixed(2).replace(".", ",")}
                                </strong>
                              </div>
                            )}
                          </div>
                        )}
                        {acct && acct.realizedSoldKg > 0 && (
                          <div className="px-2.5 py-1.5 bg-purple-500/10 border border-purple-500/25 rounded-xl flex items-center justify-between text-[11px]">
                            <span className="text-purple-200 font-bold">
                              ✅ Já vendido: {acct.realizedSoldKg.toFixed(1)} kg (R$ {acct.realizedRevenueTotal.toFixed(2).replace(".", ",")})
                            </span>
                            <strong className={`font-mono font-black ${acct.realizedProfitTotal >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                              Lucro: {acct.realizedProfitTotal >= 0 ? "+" : ""}R$ {acct.realizedProfitTotal.toFixed(2).replace(".", ",")}
                            </strong>
                          </div>
                        )}
                      </div>

                      {/* Painel Inline para Editar Peso + Preço + Pagar Colaborador direto no card */}
                      {cardPayMatId === mat.id && (
                        <div className="p-3 bg-slate-900 border-2 border-emerald-500/45 rounded-2xl space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black uppercase text-emerald-300">
                              💸 Pagar / Anotar para Colaborador
                            </span>
                            <button
                              type="button"
                              onClick={() => setCardPayMatId(null)}
                              className="text-slate-400 hover:text-white cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[10px] font-black uppercase text-cyan-300 block">
                                Peso (kg):
                              </label>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={cardPayKgDraft}
                                onChange={(e) => setCardPayKgDraft(e.target.value)}
                                placeholder="Ex: 3.100"
                                className="w-full min-h-[42px] bg-slate-950 border border-cyan-500/40 rounded-xl px-2 text-center text-white font-mono font-black text-sm outline-none"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-black uppercase text-amber-300 block">
                                Preço (R$/kg):
                              </label>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={cardPayPriceDraft}
                                onChange={(e) => setCardPayPriceDraft(e.target.value)}
                                placeholder="Ex: 3,00"
                                className="w-full min-h-[42px] bg-slate-950 border border-amber-500/40 rounded-xl px-2 text-center text-amber-200 font-mono font-black text-sm outline-none"
                              />
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-1 flex-wrap">
                              <label className="text-[10px] font-black uppercase text-slate-300">
                                Nome no Recibo:
                              </label>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setScrapCollabMode("cadastrado")}
                                  className={`px-2 py-0.5 rounded text-[9.5px] font-black border cursor-pointer ${
                                    scrapCollabMode === "cadastrado"
                                      ? "bg-emerald-500 text-slate-950 border-emerald-400"
                                      : "bg-slate-950 text-slate-300 border-white/10"
                                  }`}
                                >
                                  Lista
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setScrapCollabMode("sem_nome");
                                    if (cardPayMethod === "caderninho") setCardPayMethod("pago_dinheiro");
                                  }}
                                  className={`px-2 py-0.5 rounded text-[9.5px] font-black border cursor-pointer ${
                                    scrapCollabMode === "sem_nome"
                                      ? "bg-cyan-500 text-slate-950 border-cyan-400"
                                      : "bg-slate-950 text-slate-300 border-white/10"
                                  }`}
                                >
                                  Sem Nome
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setScrapCollabMode("nome_avulso")}
                                  className={`px-2 py-0.5 rounded text-[9.5px] font-black border cursor-pointer ${
                                    scrapCollabMode === "nome_avulso"
                                      ? "bg-amber-400 text-slate-950 border-amber-300"
                                      : "bg-slate-950 text-slate-300 border-white/10"
                                  }`}
                                >
                                  Digitar
                                </button>
                              </div>
                            </div>

                            {scrapCollabMode === "cadastrado" && (
                              <select
                                value={cardPayCollabId || activeCollab?.id || selectedCollabId}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  if (v === "__sem_nome__") {
                                    setScrapCollabMode("sem_nome");
                                    if (cardPayMethod === "caderninho") setCardPayMethod("pago_dinheiro");
                                  } else if (v === "__digitar_nome__") {
                                    setScrapCollabMode("nome_avulso");
                                  } else {
                                    setCardPayCollabId(v);
                                  }
                                }}
                                className="w-full min-h-[42px] bg-slate-950 border border-white/15 rounded-xl px-2.5 text-white font-bold text-xs outline-none"
                              >
                                <option value="__sem_nome__">🪪 Sem Nome no Recibo (Avulso / Direto)</option>
                                <option value="__digitar_nome__">✍️ Digitar Outro Nome na Hora...</option>
                                {collaborators.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.isFounder ? "👑 " : "👤 "}
                                    {c.name}
                                  </option>
                                ))}
                              </select>
                            )}

                            {scrapCollabMode === "sem_nome" && (
                              <div className="px-2.5 py-2 bg-slate-950 border border-cyan-500/30 rounded-xl text-[10.5px] text-cyan-200 font-bold">
                                🪪 Recibo sem nome (Avulso / Direto)
                              </div>
                            )}

                            {scrapCollabMode === "nome_avulso" && (
                              <input
                                type="text"
                                value={scrapCustomCollabName}
                                onChange={(e) => setScrapCustomCollabName(e.target.value)}
                                placeholder="Digite o nome para o recibo..."
                                className="w-full min-h-[42px] bg-slate-950 border border-amber-400/50 rounded-xl px-2.5 text-white font-bold text-xs outline-none"
                              />
                            )}
                          </div>

                          <div className="grid grid-cols-3 gap-1.5">
                            {(
                              [
                                { id: "pago_dinheiro", label: "💵 Dinheiro" },
                                { id: "pago_pix", label: "📱 Pix" },
                                { id: "caderninho", label: "📓 Caderninho" }
                              ] as const
                            ).map((mOpt) => {
                              const dis = mOpt.id === "caderninho" && scrapCollabMode === "sem_nome";
                              return (
                                <button
                                  key={mOpt.id}
                                  type="button"
                                  disabled={dis}
                                  onClick={() => setCardPayMethod(mOpt.id)}
                                  className={`min-h-[38px] px-2 rounded-xl text-[10.5px] font-black border touch-manipulation ${
                                    dis
                                      ? "bg-slate-950/50 text-slate-600 border-white/5 cursor-not-allowed"
                                      : cardPayMethod === mOpt.id
                                      ? mOpt.id === "caderninho"
                                        ? "bg-amber-500 text-slate-950 border-amber-400 cursor-pointer"
                                        : "bg-emerald-500 text-slate-950 border-emerald-400 cursor-pointer"
                                      : "bg-slate-950 text-slate-300 border-white/10 cursor-pointer"
                                  }`}
                                >
                                  {mOpt.label}
                                </button>
                              );
                            })}
                          </div>

                          <label className="flex items-center gap-2 text-[11px] text-slate-300 font-bold cursor-pointer">
                            <input
                              type="checkbox"
                              checked={cardPayAddToStock}
                              onChange={(e) => setCardPayAddToStock(e.target.checked)}
                              className="w-4 h-4 accent-emerald-500"
                            />
                            <span>Somar esse peso no estoque do material ao confirmar</span>
                          </label>

                          {(() => {
                            const w = Math.max(0, parseFloat(cardPayKgDraft.replace(",", ".")) || 0);
                            const p = Math.max(0, parseFloat(cardPayPriceDraft.replace(",", ".")) || 0);
                            const total = Number((w * p).toFixed(2));
                            const targetCollab =
                              scrapCollabMode === "cadastrado"
                                ? collaborators.find((c) => c.id === (cardPayCollabId || activeCollab?.id || selectedCollabId))
                                : null;
                            const targetDisplayName =
                              scrapCollabMode === "sem_nome"
                                ? "Sem Nome"
                                : scrapCollabMode === "nome_avulso"
                                ? scrapCustomCollabName.trim() || "Avulso"
                                : targetCollab?.name || "Colaborador";
                            return (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (w <= 0) {
                                      if (showNotification) showNotification("Digite o peso (kg) antes de somar no recibo.", "warning");
                                      return;
                                    }
                                    handleAddItemToScrapBasket({
                                      material: mat,
                                      weightKg: w,
                                      units: 0,
                                      pricePerKg: p,
                                      addToStock: cardPayAddToStock
                                    });
                                    setCardPayMatId(null);
                                  }}
                                  className="min-h-[44px] px-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase rounded-xl cursor-pointer touch-manipulation select-none active:scale-95"
                                >
                                  🧺 + Somar no Recibo
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (w <= 0) {
                                      if (showNotification) showNotification("Digite o peso (kg) para calcular e pagar.", "warning");
                                      return;
                                    }
                                    if (!targetCollab?.isFounder && p <= 0) {
                                      if (showNotification) showNotification("Digite o preço (R$/kg) para calcular o valor.", "warning");
                                      return;
                                    }
                                    registerScrapPurchaseForCollaborator({
                                      material: mat,
                                      weightKg: w,
                                      units: 0,
                                      pricePerKg: p,
                                      collabId: targetCollab?.id || selectedCollabId,
                                      collabMode: scrapCollabMode,
                                      customName: scrapCustomCollabName,
                                      mode: cardPayMethod,
                                      addWeightToStock: cardPayAddToStock
                                    });
                                    setCardPayMatId(null);
                                  }}
                                  className="min-h-[44px] px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase rounded-xl cursor-pointer touch-manipulation select-none active:scale-95"
                                >
                                  {targetCollab?.isFounder
                                    ? `✓ Registrar ${w.toFixed(2)} kg (D.W)`
                                    : cardPayMethod === "caderninho"
                                    ? `✓ Caderninho (R$ ${total.toFixed(2).replace(".", ",")})`
                                    : `✓ Pagar R$ ${total.toFixed(2).replace(".", ",")} (${targetDisplayName})`}
                                </button>
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-white/5">
                        <button
                          type="button"
                          onClick={() => handleSelectMaterialForScale(mat.id)}
                          className="min-h-[42px] px-3 bg-cyan-500/15 hover:bg-cyan-500 hover:text-slate-950 text-cyan-300 font-black text-xs rounded-xl border border-cyan-500/35 flex items-center gap-1.5 cursor-pointer touch-manipulation select-none active:scale-95"
                        >
                          <Scale className="w-3.5 h-3.5" />
                          <span>Pesar na Balança</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setEditingScrapPriceId(isEditingThisPrice ? null : mat.id);
                            setEditingScrapPriceDraft(mat.buyPricePerKg > 0 ? String(mat.buyPricePerKg) : "");
                            setEditingScrapSellPriceDraft((mat.sellPricePerKg || 0) > 0 ? String(mat.sellPricePerKg) : "");
                          }}
                          className="min-h-[42px] px-3 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs rounded-xl border border-white/10 flex items-center gap-1 cursor-pointer touch-manipulation select-none active:scale-95"
                        >
                          <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                          <span>{mat.buyPricePerKg > 0 || sellPrice > 0 ? "Editar Pago / Revenda" : "Definir Pago & Revenda"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (cardPayMatId === mat.id) {
                              setCardPayMatId(null);
                            } else {
                              setCardPayMatId(mat.id);
                              setCardPayKgDraft(mat.stockKg > 0 ? String(mat.stockKg) : "");
                              setCardPayPriceDraft(mat.buyPricePerKg > 0 ? String(mat.buyPricePerKg) : "");
                              setCardPayCollabId(activeCollab?.id || selectedCollabId);
                              setCardPayAddToStock(mat.stockKg <= 0);
                            }
                          }}
                          className={`min-h-[42px] px-3 font-black text-xs rounded-xl border flex items-center gap-1 cursor-pointer touch-manipulation select-none active:scale-95 ${
                            cardPayMatId === mat.id
                              ? "bg-emerald-500 text-slate-950 border-emerald-400"
                              : "bg-emerald-500/15 hover:bg-emerald-500 hover:text-slate-950 text-emerald-300 border-emerald-500/35"
                          }`}
                        >
                          <Coins className="w-3.5 h-3.5" />
                          <span>Pagar Colaborador</span>
                        </button>

                        {mat.stockKg > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              handleAddItemToScrapBasket({
                                material: mat,
                                weightKg: mat.stockKg,
                                units: mat.stockUnits || 0,
                                pricePerKg: mat.buyPricePerKg || 0,
                                addToStock: false
                              });
                              setTimeout(() => {
                                scrapBasketPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                              }, 60);
                            }}
                            className="min-h-[42px] px-3 bg-amber-400/15 hover:bg-amber-400 hover:text-slate-950 text-amber-300 font-black text-xs rounded-xl border border-amber-400/40 flex items-center gap-1 cursor-pointer touch-manipulation select-none active:scale-95"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                            <span>+ Somar no Recibo</span>
                          </button>
                        )}

                        {(mat.stockKg > 0 || (mat.stockUnits || 0) > 0) && (
                          <button
                            type="button"
                            onClick={() => {
                              setSellingScrapMaterial(mat);
                              setScrapSaleKgDraft(mat.stockKg > 0 ? String(mat.stockKg) : "");
                              setScrapSaleUnitsDraft((mat.stockUnits || 0) > 0 ? String(mat.stockUnits) : "");
                              const estSale = mat.stockKg > 0 && sellPrice > 0 ? (mat.stockKg * sellPrice).toFixed(2) : "";
                              setScrapSaleTotalValueDraft(estSale);
                              setScrapSaleBuyerDraft("");
                            }}
                            className="min-h-[42px] px-3 bg-emerald-500/15 hover:bg-emerald-500 hover:text-slate-950 text-emerald-300 font-black text-xs rounded-xl border border-emerald-500/35 flex items-center gap-1 cursor-pointer touch-manipulation select-none active:scale-95"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span>Vender / Baixar</span>
                          </button>
                        )}

                        {mat.isCustom && (
                          confirmDeleteCustomScrapId === mat.id ? (
                            <div className="flex items-center gap-1 ml-auto">
                              <button
                                type="button"
                                onClick={() => {
                                  markLocalYardMutation();
                                  setOtherScrapMaterials((prev) => prev.filter((m) => m.id !== mat.id));
                                  setConfirmDeleteCustomScrapId(null);
                                }}
                                className="min-h-[40px] px-2.5 bg-rose-600 text-white font-black text-xs rounded-lg cursor-pointer"
                              >
                                Excluir
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteCustomScrapId(null)}
                                className="min-h-[40px] px-2 bg-slate-800 text-slate-300 font-bold text-xs rounded-lg cursor-pointer"
                              >
                                Não
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteCustomScrapId(mat.id)}
                              className="min-h-[42px] px-2.5 bg-slate-900 hover:bg-rose-950/60 text-rose-300 rounded-xl border border-rose-500/20 cursor-pointer ml-auto"
                              title="Excluir material personalizado"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            markLocalYardMutation();
                            setScrapWeightDrafts((prev) => {
                              const next = { ...prev };
                              delete next[mat.id];
                              return next;
                            });
                            setOtherScrapMaterials((prev) =>
                              prev.map((m) => (m.id === mat.id ? { ...m, stockKg: 0, stockUnits: 0 } : m))
                            );
                          }}
                          className={`min-h-[42px] px-3 bg-slate-900 hover:bg-rose-950/60 text-rose-300 font-bold text-xs rounded-xl border border-rose-500/20 cursor-pointer touch-manipulation select-none active:scale-95 ${
                            mat.isCustom ? "" : "ml-auto"
                          }`}
                        >
                          Zerar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredScrapMaterials.length === 0 && (
                <div className="p-6 text-center bg-slate-950 border border-white/10 rounded-2xl text-slate-400 text-sm">
                  Nenhum material encontrado para "{scrapSearchQuery}". Limpe a busca ou clique em{" "}
                  <strong className="text-emerald-400">+ Novo Material</strong> para cadastrar!
                </div>
              )}

              {scrapSalesHistory.length > 0 && (
                <div className="p-4 bg-slate-950/90 border border-purple-500/30 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-black uppercase text-purple-300 tracking-wider">
                      🚚 Histórico de Vendas / Baixas do Ferro Velho ({scrapSalesHistory.filter((s) => !s.isCancelled).length} ativas)
                    </span>
                    {scrapSalesHistory.some((s) => s.isCancelled) && (
                      <button
                        type="button"
                        onClick={() => {
                          markLocalYardMutation();
                          setScrapSalesHistory((prev) => prev.filter((s) => !s.isCancelled));
                        }}
                        className="text-[10.5px] font-bold text-slate-400 hover:text-white cursor-pointer"
                      >
                        🧹 Limpar Estornadas
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {scrapSalesHistory.slice(0, 10).map((sale) => (
                      <div
                        key={sale.id}
                        className={`p-3 bg-slate-900 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
                          sale.isCancelled ? "border-rose-500/35 opacity-75" : "border-purple-500/20"
                        }`}
                      >
                        <div>
                          <div className="font-black text-white flex items-center gap-2 flex-wrap">
                            <span className={sale.isCancelled ? "line-through text-slate-400" : ""}>
                              {sale.emoji} {sale.materialName} — {sale.weightKg.toFixed(2)} kg • R$ {sale.revenueReceived.toFixed(2)}
                            </span>
                            {sale.isCancelled && (
                              <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded text-[10px] font-black uppercase">
                                🚫 Estornada
                              </span>
                            )}
                          </div>
                          <div className="text-[10.5px] text-slate-400">
                            {sale.timestamp} • Comprador: {sale.buyerName} • Lucro:{" "}
                            <strong className={sale.profitAmount >= 0 ? "text-emerald-400" : "text-rose-400"}>
                              {sale.profitAmount >= 0 ? "+" : ""}R$ {sale.profitAmount.toFixed(2)}
                            </strong>
                          </div>
                        </div>

                        {!sale.isCancelled && (
                          cancellingScrapSaleId === sale.id ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleCancelScrapSale(sale)}
                                className="min-h-[36px] px-3 bg-rose-600 text-white font-black text-[11px] rounded-lg cursor-pointer"
                              >
                                ✓ Confirmar Estorno
                              </button>
                              <button
                                type="button"
                                onClick={() => setCancellingScrapSaleId(null)}
                                className="min-h-[36px] px-2.5 bg-slate-800 text-slate-200 font-bold text-[11px] rounded-lg cursor-pointer"
                              >
                                Voltar
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setCancellingScrapSaleId(sale.id)}
                              className="min-h-[38px] px-3 bg-rose-950/70 hover:bg-rose-600 text-rose-200 hover:text-white font-black text-[11px] rounded-xl border border-rose-500/40 cursor-pointer shrink-0"
                            >
                              🚫 Estornar Venda
                            </button>
                          )
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
      {/* ABA 4: PASTAS POR COLABORADOR, MINIPRINT 57MM & CARGAS    */}
      {/* ========================================================= */}
      {activeTab === "cargas" && (
        <div className="space-y-5">
          {/* BARRA DA IMPRESSORA MINIPRINT POCKETTM (57x30MM / FUN PRINT) & CONTROLE DE VIAS */}
          <div className="bg-gradient-to-br from-pink-950/35 via-slate-900 to-slate-900 border-2 border-pink-500/40 rounded-3xl p-4 sm:p-5 shadow-xl space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-black uppercase text-pink-300 tracking-wider block">
                  🐱 Configurador MiniPrint PocketTM (App Fun Print — Bobina 57×30mm)
                </span>
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2 mt-0.5">
                  <Printer className="w-5 h-5 text-pink-400" />
                  Impressão 1× ou 2× Vias (Controle Caderninho D.W + Via do Reciclador)
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Escolha <strong>1 Via</strong> (só seu controle para grampear) ou <strong>2 Vias</strong> (1ª Via D.W + linha de corte ✂️ + 2ª Via Reciclador). Use <strong>Fun Print 57mm</strong> para gerar a imagem nítida do rolinho 57×30mm!
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSetReceiptCopiesMode(1)}
                  className={`min-h-[44px] px-3.5 py-2 rounded-xl font-black text-xs border transition-all cursor-pointer touch-manipulation ${
                    receiptCopiesMode === 1
                      ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow"
                      : "bg-slate-950 text-slate-300 border-white/15 hover:border-white/30"
                  }`}
                >
                  📄 1 Via (Só Meu Controle)
                </button>
                <button
                  type="button"
                  onClick={() => handleSetReceiptCopiesMode(2)}
                  className={`min-h-[44px] px-3.5 py-2 rounded-xl font-black text-xs border transition-all cursor-pointer touch-manipulation ${
                    receiptCopiesMode === 2
                      ? "bg-amber-400 text-slate-950 border-amber-300 shadow"
                      : "bg-slate-950 text-slate-300 border-white/15 hover:border-white/30"
                  }`}
                >
                  📄📄 2 Vias (1ª Grampear + 2ª Reciclador)
                </button>
                <button
                  type="button"
                  onClick={handleActivateMiniPrintPocket}
                  className={`min-h-[44px] px-3.5 py-2 rounded-xl font-black text-xs border transition-all cursor-pointer touch-manipulation ${
                    printerConfigState.miniPrintPocketMode
                      ? "bg-pink-400 text-slate-950 border-pink-300 shadow"
                      : "bg-pink-950/50 text-pink-200 border-pink-500/40 hover:bg-pink-500 hover:text-slate-950"
                  }`}
                >
                  {printerConfigState.miniPrintPocketMode ? "✓ MiniPrint 57×30mm Ativa" : "🐱 Ativar MiniPrint 57×30mm"}
                </button>
              </div>
            </div>
          </div>

          {/* PASTAS PARA SALVAR RECIBOS POR COLABORADOR */}
          <div className="bg-slate-900 border border-cyan-500/35 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-cyan-300 tracking-wider block">
                  Arquivo Organizado do Caderninho — Grampear &amp; Conferir
                </span>
                <h3 className="text-lg font-black text-white flex items-center gap-2 mt-0.5">
                  <Folder className="w-5 h-5 text-cyan-400" />
                  Pastas de Recibos por Colaborador ({collaboratorFolders.length} pastas)
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Cada compra ou acerto é salvo automaticamente na pasta do reciclador com total comprado, pago e quanto falta acertar.
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={folderSearchQuery}
                  onChange={(e) => setFolderSearchQuery(e.target.value)}
                  placeholder="Buscar pasta/colaborador..."
                  className="w-full min-h-[42px] bg-slate-950 border border-white/15 rounded-xl pl-9 pr-3 text-xs text-white outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            {(() => {
              const q = folderSearchQuery.trim().toLowerCase();
              const visibleFolders = q
                ? collaboratorFolders.filter((f) => f.name.toLowerCase().includes(q))
                : collaboratorFolders;
              const openFolder = selectedFolderKey
                ? collaboratorFolders.find((f) => f.key === selectedFolderKey) || null
                : null;

              if (openFolder) {
                const activeFolderTickets = openFolder.tickets.filter((t) => !t.isCancelled);
                const activeFolderPayments = openFolder.payments.filter((p) => !p.isCancelled);
                const folderPaidTotal = openFolder.isFounder
                  ? 0
                  : activeFolderTickets.length === 0 && activeFolderPayments.length === 0
                  ? 0
                  : openFolder.collaborator
                  ? openFolder.collaborator.totalPaid
                  : openFolder.totalPaidDirectAmount;
                const folderPending = openFolder.isFounder
                  ? 0
                  : activeFolderTickets.length === 0 && activeFolderPayments.length === 0
                  ? 0
                  : openFolder.collaborator
                  ? openFolder.collaborator.balancePending
                  : 0;
                const founderActiveSavings = openFolder.isFounder
                  ? activeFolderTickets.reduce(
                      (sum, tk) =>
                        sum +
                        Math.max(
                          0,
                          tk.items.reduce((s, it) => s + (it.costPaid || 0), 0) +
                            (tk.bonusAmount || 0) -
                            (tk.discountAmount || 0)
                        ),
                      0
                    )
                  : 0;

                return (
                  <div className="space-y-4">
                    {/* Cabeçalho da Pasta Aberta */}
                    <div className="p-4 bg-slate-950 border-2 border-cyan-500/45 rounded-2xl space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setSelectedFolderKey(null)}
                            className="min-h-[42px] px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 font-black text-xs rounded-xl border border-white/15 cursor-pointer"
                          >
                            ← Todas as Pastas
                          </button>
                          <div>
                            <div className="text-base font-black text-white flex items-center gap-2">
                              <FolderOpen className="w-5 h-5 text-cyan-400" />
                              <span>Pasta: {openFolder.name}</span>
                            </div>
                            <span className="text-[11px] text-slate-400 block">
                              {activeFolderTickets.length} compra(s) • {activeFolderPayments.length} acerto(s) •{" "}
                              {openFolder.cancelledCount > 0 ? `${openFolder.cancelledCount} estornado(s) • ` : ""}
                              {openFolder.totalWeightKg.toFixed(2)} kg trazidos
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {openFolder.cancelledCount > 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                handleClearCancelledReceipts(openFolder.collaborator?.id, openFolder.name)
                              }
                              className="min-h-[42px] px-3 py-2 bg-rose-950/60 hover:bg-rose-600 text-rose-200 hover:text-white font-black text-xs rounded-xl border border-rose-500/40 flex items-center gap-1.5 cursor-pointer"
                            >
                              <Eraser className="w-3.5 h-3.5" />
                              <span>Limpar Estornados ({openFolder.cancelledCount})</span>
                            </button>
                          )}
                          {openFolder.collaborator && !openFolder.isFounder && (
                            <button
                              type="button"
                              onClick={() => {
                                setPayingCollab(openFolder.collaborator!);
                                setPayAmount(folderPending > 0 ? folderPending : 10);
                              }}
                              className="min-h-[44px] px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Coins className="w-4 h-4" />
                              <span>
                                {folderPending > 0
                                  ? `Acertar Saldo (R$ ${folderPending.toFixed(2)})`
                                  : "Registrar Pagamento"}
                              </span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Resumo Financeiro da Pasta */}
                      {openFolder.isFounder ? (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                          <div className="p-3 bg-slate-900 rounded-xl border border-white/10">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Pago a Terceiros:</span>
                            <strong className="text-lg font-mono font-black text-white">R$ 0.00</strong>
                          </div>
                          <div className="p-3 bg-slate-900 rounded-xl border border-amber-500/35">
                            <span className="text-[10px] uppercase font-bold text-amber-300 block">👑 Economia Coleta Própria:</span>
                            <strong className="text-lg font-mono font-black text-amber-300">
                              R$ {founderActiveSavings.toFixed(2)}
                            </strong>
                          </div>
                          <div className="p-3 bg-slate-900 rounded-xl border border-emerald-500/25">
                            <span className="text-[10px] uppercase font-bold text-emerald-400 block">Devo no Caderninho:</span>
                            <strong className="text-lg font-mono font-black text-emerald-300">R$ 0.00</strong>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                          <div className="p-3 bg-slate-900 rounded-xl border border-white/10">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Quanto Já Comprei Dele:</span>
                            <strong className="text-lg font-mono font-black text-white">
                              R$ {openFolder.totalBoughtAmount.toFixed(2)}
                            </strong>
                          </div>
                          <div className="p-3 bg-slate-900 rounded-xl border border-emerald-500/25">
                            <span className="text-[10px] uppercase font-bold text-emerald-400 block">Total Já Pago / Acertado:</span>
                            <strong className="text-lg font-mono font-black text-emerald-300">
                              R$ {folderPaidTotal.toFixed(2)}
                            </strong>
                          </div>
                          <div className="p-3 bg-slate-900 rounded-xl border border-rose-500/35">
                            <span className="text-[10px] uppercase font-bold text-rose-400 block">Quanto Devo no Caderninho:</span>
                            <strong className="text-lg font-mono font-black text-rose-300">
                              R$ {folderPending.toFixed(2)}
                            </strong>
                          </div>
                        </div>
                      )}

                      {/* Ações de Extrato Consolidado da Pasta (Para Grampear) */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handlePrintFolderSummary(openFolder, 1)}
                          className="min-h-[42px] px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl border border-cyan-500/40 flex items-center gap-1.5 cursor-pointer"
                        >
                          <Printer className="w-4 h-4 text-cyan-400" />
                          <span>Imprimir Extrato da Pasta (1 Via)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePrintFolderSummary(openFolder, 2)}
                          className="min-h-[42px] px-3 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
                        >
                          <Scissors className="w-4 h-4" />
                          <span>Extrato 2 Vias (D.W + Reciclador)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleShareFolderFunPrint(openFolder, receiptCopiesMode)}
                          disabled={isGeneratingFunPrint}
                          className="min-h-[42px] px-3 py-2 bg-pink-500 hover:bg-pink-400 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>🐱 Fun Print 57mm ({receiptCopiesMode}×)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleShareFolderWhatsApp(openFolder)}
                          className="min-h-[42px] px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
                        >
                          <Share2 className="w-4 h-4" />
                          <span>Resumo WhatsApp</span>
                        </button>
                      </div>
                    </div>

                    {/* Lista de Recibos de Pagamento / Acertos dentro desta Pasta */}
                    {openFolder.payments.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-black uppercase text-amber-300 tracking-wider">
                          🤝 Recibos de Pagamento / Acerto ({activeFolderPayments.length} ativos)
                        </h4>
                        {openFolder.payments.map((rec) => {
                          const isConfirmingCancelPay = cancellingPaymentId === rec.id;
                          return (
                          <div
                            key={rec.id}
                            className={`p-3.5 bg-slate-950 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs ${
                              rec.isCancelled ? "border-rose-500/40 opacity-80" : "border-amber-500/30"
                            }`}
                          >
                            <div>
                              <div className="font-black text-white text-sm flex items-center gap-2 flex-wrap">
                                <span className={rec.isCancelled ? "line-through text-slate-400" : ""}>
                                  💸 Acerto Pago: <span className="text-emerald-400 font-mono">R$ {rec.amountPaid.toFixed(2)}</span>{" "}
                                </span>
                                {rec.isCancelled && (
                                  <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded text-[10px] font-black uppercase">
                                    🚫 Estornado
                                  </span>
                                )}
                                <span className="text-[10px] text-slate-400 font-normal">({rec.timestamp})</span>
                              </div>
                              <div className="text-slate-300 mt-0.5">
                                {rec.isCancelled
                                  ? `Estornado em ${rec.cancelledAt || "—"}`
                                  : `Forma: ${rec.methodLabel} • Restou: R$ ${rec.remainingBalance.toFixed(2)}${rec.notes ? ` • Obs: ${rec.notes}` : ""}`}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              <button
                                type="button"
                                onClick={() => handlePrintPaymentReceipt(rec, 1)}
                                className="min-h-[40px] px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-[11px] rounded-xl border border-white/15 cursor-pointer"
                              >
                                🖨️ 1 Via
                              </button>
                              <button
                                type="button"
                                onClick={() => handlePrintPaymentReceipt(rec, 2)}
                                className="min-h-[40px] px-2.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[11px] rounded-xl cursor-pointer"
                              >
                                ✂️ 2 Vias
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSharePaymentFunPrint(rec, receiptCopiesMode)}
                                disabled={isGeneratingFunPrint}
                                className="min-h-[40px] px-2.5 py-1.5 bg-pink-500 hover:bg-pink-400 text-slate-950 font-black text-[11px] rounded-xl cursor-pointer"
                              >
                                🐱 Fun Print
                              </button>
                              <button
                                type="button"
                                onClick={() => handleShareReceiptWhatsApp(rec)}
                                className="min-h-[40px] px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-[11px] rounded-xl cursor-pointer"
                              >
                                WhatsApp
                              </button>
                              {!rec.isCancelled ? (
                                isConfirmingCancelPay ? (
                                  <button
                                    type="button"
                                    onClick={() => handleCancelPaymentReceipt(rec)}
                                    className="min-h-[40px] px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-[11px] rounded-xl cursor-pointer"
                                  >
                                    ✓ Confirmar Estorno
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setCancellingPaymentId(rec.id)}
                                    className="min-h-[40px] px-2.5 py-1.5 bg-rose-950/70 hover:bg-rose-600 text-rose-200 hover:text-white font-black text-[11px] rounded-xl border border-rose-500/40 cursor-pointer"
                                  >
                                    🚫 Estornar
                                  </button>
                                )
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    markLocalYardMutation();
                                    setPaymentHistory((prev) => prev.filter((p) => p.id !== rec.id));
                                  }}
                                  className="min-h-[40px] px-2.5 bg-slate-900 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 rounded-xl border border-white/10 cursor-pointer"
                                  title="Remover estorno da lista"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Lista de Compras / Notinhas dentro desta Pasta */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-black uppercase text-emerald-300 tracking-wider">
                        🧾 Notinhas de Compra Salvas na Pasta ({openFolder.tickets.length})
                      </h4>
                      {openFolder.tickets.length === 0 ? (
                        <div className="p-4 bg-slate-950 rounded-2xl border border-white/10 text-xs text-slate-400 text-center">
                          Nenhuma notinha de compra salva nesta pasta ainda.
                        </div>
                      ) : (
                        openFolder.tickets.map((ticket) => {
                          const isConfirmingCancel = cancellingTicketId === ticket.id;
                          return (
                            <div
                              key={ticket.id}
                              className={`p-3.5 bg-slate-950 rounded-2xl border space-y-2 text-xs ${
                                ticket.isCancelled ? "border-rose-500/40 opacity-85" : "border-emerald-500/25"
                              }`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                <div className="space-y-0.5">
                                  <div className="font-black text-white text-sm flex items-center gap-2 flex-wrap">
                                    <span className={ticket.isCancelled ? "line-through text-slate-400" : ""}>
                                      {ticket.isFounder ? "D.W Própria" : `R$ ${ticket.totalPaid.toFixed(2)}`} • {ticket.totalWeightKg.toFixed(2)} kg
                                    </span>
                                    {ticket.isCancelled && (
                                      <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded text-[10px] font-black uppercase">
                                        🚫 Cancelada / Estornada
                                      </span>
                                    )}
                                    <span className="text-[10px] text-slate-400 font-normal">{ticket.timestamp}</span>
                                  </div>
                                  <div className="text-slate-300">
                                    {ticket.items.map((it) => `${it.quantity}× ${it.name} (${it.totalWeightKg.toFixed(2)}kg)`).join(", ")}
                                  </div>
                                  <div className="text-[10.5px] font-bold text-amber-300">
                                    {ticket.isCancelled
                                      ? `Estornado em ${ticket.cancelledAt || "—"}${ticket.cancelReason ? ` • ${ticket.cancelReason}` : ""}`
                                      : ticket.paymentStatus === "coleta_propria_dw"
                                      ? "👑 Coleta Própria D.W"
                                      : ticket.paymentStatus === "pago_na_hora"
                                      ? "💵 Pago na Hora no Portão"
                                      : "📓 Lançado no Caderninho (Acertar depois)"}
                                  </div>
                                </div>

                                <div className="flex flex-wrap gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handlePrintGlassTicket(ticket, 1)}
                                    className="min-h-[40px] px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-[11px] rounded-xl border border-white/15 cursor-pointer"
                                  >
                                    🖨️ 1 Via
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handlePrintGlassTicket(ticket, 2)}
                                    className="min-h-[40px] px-2.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[11px] rounded-xl cursor-pointer"
                                  >
                                    ✂️ 2 Vias
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleShareTicketFunPrint(ticket, receiptCopiesMode)}
                                    disabled={isGeneratingFunPrint}
                                    className="min-h-[40px] px-2.5 py-1.5 bg-pink-500 hover:bg-pink-400 text-slate-950 font-black text-[11px] rounded-xl cursor-pointer"
                                  >
                                    🐱 Fun Print
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleShareGlassTicketWhatsApp(ticket)}
                                    className="min-h-[40px] px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-[11px] rounded-xl cursor-pointer"
                                  >
                                    WhatsApp
                                  </button>
                                  {!ticket.isCancelled && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setCancellingTicketId(isConfirmingCancel ? null : ticket.id);
                                        setCancelTicketReasonDraft("");
                                      }}
                                      className="min-h-[40px] px-2.5 py-1.5 bg-rose-950/70 hover:bg-rose-600 text-rose-200 hover:text-white font-black text-[11px] rounded-xl border border-rose-500/40 cursor-pointer"
                                    >
                                      🚫 Cancelar
                                    </button>
                                  )}
                                </div>
                              </div>

                              {isConfirmingCancel && !ticket.isCancelled && (
                                <div className="p-3 bg-rose-950/35 border border-rose-500/40 rounded-xl space-y-2">
                                  <div className="text-[11px] font-black text-rose-200">
                                    ⚠️ Estornar esta compra? Reverte Estoque, Caderninho e PDV.
                                  </div>
                                  <div className="flex flex-col sm:flex-row gap-2">
                                    <input
                                      type="text"
                                      value={cancelTicketReasonDraft}
                                      onChange={(e) => setCancelTicketReasonDraft(e.target.value)}
                                      placeholder="Motivo opcional"
                                      className="flex-1 min-h-[40px] bg-slate-900 border border-rose-500/35 rounded-xl px-3 text-xs text-white outline-none"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleCancelPurchaseTicket(ticket, cancelTicketReasonDraft)}
                                      className="min-h-[40px] px-3.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl cursor-pointer"
                                    >
                                      ✓ Confirmar
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {visibleFolders.map((folder) => {
                    const activeFolderTickets = folder.tickets.filter((t) => !t.isCancelled);
                    const activeFolderPayments = folder.payments.filter((p) => !p.isCancelled);
                    const activeDocs = activeFolderTickets.length + activeFolderPayments.length;
                    const folderPaid = folder.isFounder
                      ? 0
                      : activeDocs === 0
                      ? 0
                      : folder.collaborator
                      ? folder.collaborator.totalPaid
                      : folder.totalPaidDirectAmount;
                    const folderPending = folder.isFounder
                      ? 0
                      : activeDocs === 0
                      ? 0
                      : folder.collaborator
                      ? folder.collaborator.balancePending
                      : 0;
                    const founderSavedAmt = folder.isFounder
                      ? activeFolderTickets.reduce(
                          (sum, tk) =>
                            sum +
                            Math.max(
                              0,
                              tk.items.reduce((s, it) => s + (it.costPaid || 0), 0) +
                                (tk.bonusAmount || 0) -
                                (tk.discountAmount || 0)
                            ),
                          0
                        )
                      : 0;
                    return (
                      <button
                        key={folder.key}
                        type="button"
                        onClick={() => setSelectedFolderKey(folder.key)}
                        className={`text-left p-4 rounded-2xl border-2 transition-all cursor-pointer touch-manipulation active:scale-[0.99] space-y-2.5 ${
                          folderPending > 0
                            ? "bg-slate-950 border-rose-500/45 hover:border-rose-400"
                            : folder.isFounder
                            ? "bg-amber-950/15 border-amber-500/35 hover:border-amber-400"
                            : "bg-slate-950 border-cyan-500/25 hover:border-cyan-400"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Folder className={`w-6 h-6 shrink-0 ${folder.isFounder ? "text-amber-400" : folderPending > 0 ? "text-rose-400" : "text-cyan-400"}`} />
                            <div className="min-w-0">
                              <strong className="text-sm font-black text-white truncate block">{folder.name}</strong>
                              <span className="text-[10.5px] text-slate-400 block">
                                {activeDocs} {activeDocs === 1 ? "recibo ativo" : "recibos ativos"} • {folder.totalWeightKg.toFixed(1)} kg
                                {folder.cancelledCount > 0 ? ` (${folder.cancelledCount} estornado${folder.cancelledCount > 1 ? "s" : ""})` : ""}
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
                        </div>

                        {folder.isFounder ? (
                          <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-white/10 text-[10.5px]">
                            <div>
                              <span className="text-slate-400 block">Coleta Própria</span>
                              <strong className="font-mono text-amber-300">R$ {founderSavedAmt.toFixed(2)}</strong>
                            </div>
                            <div>
                              <span className="text-emerald-400 block">Pago</span>
                              <strong className="font-mono text-emerald-300">R$ 0.00</strong>
                            </div>
                            <div className="text-right">
                              <span className="text-slate-400 block">Devo</span>
                              <strong className="font-mono text-emerald-400">R$ 0.00</strong>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-white/10 text-[10.5px]">
                            <div>
                              <span className="text-slate-400 block">Comprei</span>
                              <strong className="font-mono text-white">R$ {folder.totalBoughtAmount.toFixed(2)}</strong>
                            </div>
                            <div>
                              <span className="text-emerald-400 block">Pago</span>
                              <strong className="font-mono text-emerald-300">R$ {folderPaid.toFixed(2)}</strong>
                            </div>
                            <div className="text-right">
                              <span className="text-rose-400 block">Devo</span>
                              <strong className={`font-mono ${folderPending > 0 ? "text-rose-300" : "text-emerald-400"}`}>
                                R$ {folderPending.toFixed(2)}
                              </strong>
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* HISTÓRICO DE NOTINHAS / TÍQUETES DE COMPRA NO PORTÃO */}
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="border-b border-white/10 pb-3">
              <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider block">
                Comprovantes & Cupons de Compra na Reciclagem
              </span>
              <h3 className="text-lg font-black text-white flex items-center gap-2 mt-0.5">
                <Printer className="w-5 h-5 text-emerald-400" />
                Histórico Geral de Notinhas ({purchaseHistory.length})
              </h3>
            </div>

            {purchaseHistory.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs">
                Nenhuma compra finalizada ainda. Ao finalizar na aba "Bipar & Comprar" ou na Balança Digital, o recibo aparecerá aqui e na Pasta do Colaborador!
              </div>
            ) : (
              <div className="space-y-2.5">
                {purchaseHistory.map((ticket) => {
                  const isConfirmingCancel = cancellingTicketId === ticket.id;
                  return (
                    <div
                      key={ticket.id}
                      className={`p-4 bg-slate-950 rounded-2xl border space-y-2.5 text-xs ${
                        ticket.isCancelled ? "border-rose-500/40 opacity-85" : "border-emerald-500/20"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="font-black text-white text-sm flex items-center gap-2 flex-wrap">
                            <span className={ticket.isCancelled ? "line-through text-slate-400" : ""}>
                              🧾 {ticket.collectorName}
                            </span>
                            {ticket.isCancelled && (
                              <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-md text-[10px] font-black uppercase">
                                🚫 Cancelada / Estornada
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400 font-normal">{ticket.timestamp}</span>
                          </div>
                          <div className="text-slate-300">
                            {!ticket.isScrapPurchase && (
                              <strong className="text-emerald-400 font-mono">{ticket.totalBottles} un </strong>
                            )}
                            ({ticket.totalWeightKg.toFixed(2)} kg) •{" "}
                            {ticket.items.map((it) => `${it.quantity}× ${it.name}`).join(", ")}
                          </div>
                          <div className="text-[10.5px] font-bold text-amber-300">
                            {ticket.isCancelled ? (
                              <span className="text-rose-300">
                                Estornado em {ticket.cancelledAt || "—"}
                                {ticket.cancelReason ? ` • Motivo: ${ticket.cancelReason}` : ""} (Estoque, Caderninho & PDV revertidos)
                              </span>
                            ) : ticket.paymentStatus === "coleta_propria_dw" ? (
                              "👑 Coleta Própria D.W"
                            ) : ticket.paymentStatus === "pago_na_hora" ? (
                              `💵 Pago na Hora: R$ ${ticket.totalPaid.toFixed(2)}`
                            ) : (
                              `📓 Lançado no Caderninho: R$ ${ticket.totalPaid.toFixed(2)}`
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handlePrintGlassTicket(ticket, 1)}
                            className="min-h-[42px] px-3 py-2 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-black text-xs rounded-xl border border-emerald-500/40 flex items-center gap-1.5 cursor-pointer touch-manipulation select-none"
                          >
                            <Printer className="w-4 h-4 text-emerald-400" />
                            <span>1 Via</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePrintGlassTicket(ticket, 2)}
                            className="min-h-[42px] px-3 py-2 bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 cursor-pointer touch-manipulation select-none"
                          >
                            <Scissors className="w-4 h-4" />
                            <span>2 Vias</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleShareTicketFunPrint(ticket, receiptCopiesMode)}
                            disabled={isGeneratingFunPrint}
                            className="min-h-[42px] px-3 py-2 bg-pink-500 hover:bg-pink-400 active:scale-95 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 cursor-pointer touch-manipulation select-none"
                          >
                            <span>🐱 Fun Print</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleShareGlassTicketWhatsApp(ticket)}
                            className="min-h-[42px] px-3 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 cursor-pointer touch-manipulation select-none"
                          >
                            <Share2 className="w-4 h-4" />
                            <span>WhatsApp</span>
                          </button>
                          {!ticket.isCancelled ? (
                            <button
                              type="button"
                              onClick={() => {
                                setCancellingTicketId(isConfirmingCancel ? null : ticket.id);
                                setCancelTicketReasonDraft("");
                              }}
                              className="min-h-[42px] px-3 py-2 bg-rose-950/70 hover:bg-rose-600 text-rose-200 hover:text-white font-black text-xs rounded-xl border border-rose-500/40 flex items-center gap-1.5 cursor-pointer touch-manipulation select-none active:scale-95"
                            >
                              <RotateCcw className="w-4 h-4" />
                              <span>Cancelar Compra</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                markLocalYardMutation();
                                setPurchaseHistory((prev) => prev.filter((t) => t.id !== ticket.id));
                              }}
                              className="min-h-[42px] px-3 bg-slate-900 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 font-bold text-xs rounded-xl border border-white/10 flex items-center gap-1 cursor-pointer"
                              title="Remover registro cancelado da lista"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {isConfirmingCancel && !ticket.isCancelled && (
                        <div className="p-3 bg-rose-950/35 border border-rose-500/40 rounded-xl space-y-2">
                          <div className="text-[11px] font-black text-rose-200">
                            ⚠️ Estornar esta compra? Vai retirar {ticket.totalWeightKg.toFixed(2)} kg do estoque, reverter o Caderninho e cancelar a saída de R$ {ticket.totalPaid.toFixed(2)} no PDV.
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <input
                              type="text"
                              value={cancelTicketReasonDraft}
                              onChange={(e) => setCancelTicketReasonDraft(e.target.value)}
                              placeholder="Motivo opcional (ex: Desistência, erro de peso, troca de material)"
                              className="flex-1 min-h-[42px] bg-slate-900 border border-rose-500/35 rounded-xl px-3 text-xs text-white outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleCancelPurchaseTicket(ticket, cancelTicketReasonDraft)}
                              className="min-h-[42px] px-4 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase rounded-xl cursor-pointer touch-manipulation select-none"
                            >
                              ✓ Confirmar Cancelamento
                            </button>
                            <button
                              type="button"
                              onClick={() => setCancellingTicketId(null)}
                              className="min-h-[42px] px-3 bg-slate-800 text-slate-200 font-bold text-xs rounded-xl cursor-pointer"
                            >
                              Voltar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
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
                Nenhum pagamento registrado ainda. Quando fizer o acerto de um colaborador, o recibo aparecerá aqui e na Pasta dele!
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

                    <div className="flex items-center gap-2 flex-wrap justify-between sm:justify-end">
                      <div className="text-right mr-1">
                        <div className="text-emerald-400 font-mono font-black text-sm">
                          Pago: R$ {rec.amountPaid.toFixed(2)}
                        </div>
                        <span className="text-[10px] text-slate-500 block">
                          Resta: R$ {rec.remainingBalance.toFixed(2)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handlePrintPaymentReceipt(rec, 1)}
                        className="min-h-[38px] px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-[11px] rounded-xl border border-white/15 cursor-pointer"
                      >
                        🖨️ 1 Via
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePrintPaymentReceipt(rec, 2)}
                        className="min-h-[38px] px-2.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[11px] rounded-xl cursor-pointer"
                      >
                        ✂️ 2 Vias
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSharePaymentFunPrint(rec, receiptCopiesMode)}
                        disabled={isGeneratingFunPrint}
                        className="min-h-[38px] px-2.5 py-1.5 bg-pink-500 hover:bg-pink-400 text-slate-950 font-black text-[11px] rounded-xl cursor-pointer"
                      >
                        🐱 Fun Print
                      </button>
                      <button
                        type="button"
                        onClick={() => handleShareReceiptWhatsApp(rec)}
                        className="min-h-[38px] px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl transition-all flex items-center gap-1 cursor-pointer touch-manipulation"
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
      {/* ABA 5: GUIA DE PLÁSTICOS & PRODUTOS DO MERCADO            */}
      {/* ========================================================= */}
      {activeTab === "guia_plasticos" && (
        <PlasticRecyclingGuidePanel
          onJumpToScaleCategory={(matId) => handleSelectMaterialForScale(matId)}
        />
      )}

      {/* MODAL: VENDER / DAR BAIXA DE LOTE DE OUTROS MATERIAIS (INTEGRADO AO PDV) */}
      {sellingScrapMaterial && (
        <div className="fixed inset-0 z-[75] bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-5 sm:p-6 max-w-md w-full space-y-4 shadow-2xl text-left my-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl p-2 bg-slate-950 rounded-xl">{sellingScrapMaterial.emoji}</span>
                <div>
                  <h3 className="text-base font-black text-white">Vender / Dar Baixa no Lote</h3>
                  <span className="text-xs text-cyan-300 font-bold block">{sellingScrapMaterial.name}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSellingScrapMaterial(null)}
                className="p-2 rounded-xl bg-slate-950 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[11px] font-black uppercase text-slate-300 block">
                  Peso vendido (kg)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={scrapSaleKgDraft}
                  onChange={(e) => setScrapSaleKgDraft(e.target.value)}
                  placeholder="0.0"
                  className="w-full min-h-[44px] bg-slate-950 border border-cyan-500/40 rounded-xl px-3 text-center text-white font-mono font-black text-base outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-black uppercase text-slate-300 block">
                  Unidades (opcional)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={scrapSaleUnitsDraft}
                  onChange={(e) => setScrapSaleUnitsDraft(e.target.value.replace(/\D/g, ""))}
                  placeholder="0"
                  className="w-full min-h-[44px] bg-slate-950 border border-white/15 rounded-xl px-3 text-center text-white font-mono font-black text-base outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase text-emerald-300 block">
                Valor recebido pela venda R$ (entra no Caixa & Lucros do PDV)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={scrapSaleTotalValueDraft}
                onChange={(e) => setScrapSaleTotalValueDraft(e.target.value)}
                placeholder="Ex: 180.00 (ou deixe vazio para só baixar estoque)"
                className="w-full min-h-[46px] bg-slate-950 border border-emerald-500/40 rounded-xl px-3 text-white font-mono font-black text-base outline-none"
              />
            </div>

            {(() => {
              const kgSale = Math.max(0, parseFloat(scrapSaleKgDraft.replace(",", ".")) || 0);
              const valSale = Math.max(0, parseFloat(scrapSaleTotalValueDraft.replace(",", ".")) || 0);
              const buyPrice = Math.max(0, Number(sellingScrapMaterial.buyPricePerKg) || 0);
              const estCost = Number((kgSale * buyPrice).toFixed(2));
              const profit = Number((valSale - estCost).toFixed(2));
              if (kgSale <= 0 && valSale <= 0) return null;
              return (
                <div className="p-3 bg-slate-950 border border-white/10 rounded-xl space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Quanto paguei (aprox.):</span>
                    <strong className="font-mono text-amber-300">R$ {estCost.toFixed(2).replace(".", ",")}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Valor que vou receber:</span>
                    <strong className="font-mono text-cyan-300">R$ {valSale.toFixed(2).replace(".", ",")}</strong>
                  </div>
                  {valSale > 0 && (
                    <div className="flex items-center justify-between pt-1 border-t border-white/10">
                      <span className="font-black text-emerald-300">Meu Lucro nesta Venda:</span>
                      <strong className={`font-mono font-black ${profit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {profit >= 0 ? "+" : ""}R$ {profit.toFixed(2).replace(".", ",")}
                      </strong>
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={scrapSaleBuyerDraft}
                onChange={(e) => setScrapSaleBuyerDraft(e.target.value)}
                placeholder="Comprador (opcional)"
                className="min-h-[44px] bg-slate-950 border border-white/15 rounded-xl px-3 text-xs text-white outline-none"
              />
              <select
                value={scrapSaleMethod}
                onChange={(e) => setScrapSaleMethod(e.target.value as any)}
                className="min-h-[44px] bg-slate-950 border border-white/15 rounded-xl px-3 text-xs text-white font-bold outline-none"
              >
                <option value="pix">Pix</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="cartao_debito">Cartão Débito</option>
                <option value="cartao_credito">Cartão Crédito</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSellingScrapMaterial(null)}
                className="min-h-[44px] px-4 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmScrapSale}
                className="min-h-[44px] px-5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase rounded-xl cursor-pointer touch-manipulation select-none active:scale-95"
              >
                Confirmar Baixa ✓
              </button>
            </div>
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
              Escolha o que deseja zerar abaixo: você pode zerar <strong>apenas o estoque do Ferro Velho (0 kg)</strong> mantendo os vidros, ou zerar <strong>todos os dados de teste</strong> (vidros, ferro velho, pastas e caderninho). Seus cadastros de garrafas, preços e colaboradores serão mantidos!
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowZeroConfirmModal(false)}
                className="min-h-[44px] px-4 py-2 bg-slate-950 hover:bg-slate-800 active:scale-95 text-slate-300 text-xs font-bold rounded-xl border border-white/10 cursor-pointer touch-manipulation select-none"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleZeroOnlyScrapStock}
                className="min-h-[44px] px-4 py-2 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs uppercase rounded-xl transition-all cursor-pointer touch-manipulation select-none"
              >
                Só Ferro Velho (0 kg) ♻️
              </button>
              <button
                type="button"
                onClick={handleResetAllToZeroReal}
                className="min-h-[48px] px-5 py-2 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-black text-xs uppercase rounded-xl transition-all shadow-md cursor-pointer touch-manipulation select-none"
              >
                Zerar Tudo 🧹
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CÂMERA DO LEITOR DE CÓDIGO DE BARRAS (z-[80])       */}
      {/* ========================================================= */}
      {showCameraModal && (
        <div className="fixed inset-0 z-[80] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-4 sm:p-5 max-w-sm w-full space-y-3 shadow-2xl text-center my-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5 gap-2">
              <span className="text-xs font-black uppercase text-emerald-400 flex items-center gap-1.5 text-left">
                <Camera className="w-4 h-4 shrink-0" />
                <span>
                  {cameraTargetField === "search"
                    ? continuousBeepMode
                      ? "⚡ Só Bipar Contínuo (ON)"
                      : "Aponte para o Código de Barras"
                    : cameraTargetField === "primary"
                    ? "Bipar Código Principal (1)"
                    : `Bipar Código Extra (${Number(cameraTargetField) + 2})`}
                </span>
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

            {cameraTargetField === "search" && (
              <div className="flex items-center justify-between gap-2 bg-slate-950 p-2 rounded-2xl border border-white/10 text-[10.5px]">
                <button
                  type="button"
                  onClick={() => setContinuousBeepMode((v) => !v)}
                  className={`flex-1 min-h-[38px] px-2.5 py-1 rounded-xl font-black uppercase flex items-center justify-center gap-1 cursor-pointer touch-manipulation ${
                    continuousBeepMode
                      ? "bg-amber-400 text-slate-950"
                      : "bg-slate-900 text-slate-300 border border-white/10"
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{continuousBeepMode ? "Só Bipar Direto (ON)" : "Ativar Só Bipar Contínuo"}</span>
                </button>
                {continuousBeepMode && (
                  <div className="flex items-center gap-1">
                    {[1, 6, 10, 30].map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setContinuousBatchQty(q)}
                        className={`min-h-[36px] px-2 rounded-lg font-mono font-black border cursor-pointer touch-manipulation ${
                          continuousBatchQty === q
                            ? "bg-emerald-500 text-slate-950 border-emerald-400"
                            : "bg-slate-900 text-slate-300 border-white/10"
                        }`}
                      >
                        +{q}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div
              id="mobile-glass-scanner-viewport"
              className="w-full aspect-[4/3] bg-black rounded-2xl overflow-hidden relative border-2 border-emerald-500/40"
            />

            {cameraTargetField === "search" && continuousBeepMode && (
              <div className="p-2.5 bg-slate-950 rounded-2xl border border-emerald-500/40 text-left space-y-1.5 text-xs">
                {lastBeepHud ? (
                  <div className="text-emerald-300 font-black flex items-center justify-between gap-2">
                    <span className="truncate">
                      {lastBeepHud.emoji} +{lastBeepHud.addedQty} {lastBeepHud.bottleName}
                    </span>
                    <span className="font-mono text-amber-300 shrink-0">{lastBeepHud.unitGrams}g</span>
                  </div>
                ) : (
                  <div className="text-slate-400 text-[11px] font-bold">
                    Aponte para cada garrafa: cada bip soma +{continuousBatchQty} un direto no carrinho!
                  </div>
                )}
                <div className="flex items-center justify-between text-[11px] font-mono border-t border-white/10 pt-1.5">
                  <span className="text-slate-300">Carrinho: <strong className="text-white">{cartTotals.totalBottles} un</strong></span>
                  <span className="text-emerald-400 font-black">{cartTotals.totalWeightKg.toFixed(2)} kg • R$ {cartTotals.totalBuyCost.toFixed(2)}</span>
                </div>
              </div>
            )}

            {cameraError && (
              <p className="text-[11px] text-amber-300 font-bold bg-amber-950/40 p-2 rounded-xl">
                {cameraError}
              </p>
            )}

            {cameraTargetField === "search" && continuousBeepMode && cart.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCameraTargetField("search");
                    setShowCameraModal(false);
                  }}
                  className="min-h-[48px] py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-black uppercase rounded-xl cursor-pointer touch-manipulation"
                >
                  Fechar Câmera
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCameraTargetField("search");
                    setShowCameraModal(false);
                    setShowCheckoutModal(true);
                  }}
                  className="min-h-[48px] py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black uppercase rounded-xl cursor-pointer touch-manipulation"
                >
                  Concluir ({cartTotals.totalBottles} un) ➔
                </button>
              </div>
            ) : (
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
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL INTELIGENTE: CÓDIGO NOVO -> VINCULAR OU CRIAR NOVO  */}
      {/* ========================================================= */}
      {unmatchedBarcodePrompt && (
        <div className="fixed inset-0 z-[78] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border-2 border-amber-400/60 rounded-3xl p-5 sm:p-6 max-w-lg w-full space-y-4 shadow-2xl text-left my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-white/10 pb-3 gap-2">
              <div>
                <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider block">
                  Código Novo Detectado pelo Leitor
                </span>
                <h3 className="text-lg font-black text-white font-mono mt-0.5 flex items-center gap-2">
                  <Barcode className="w-5 h-5 text-amber-400" />
                  <span>{unmatchedBarcodePrompt.code}</span>
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  Este código já é de algum grupo que você separou (ex: Longneck Verde Heineken / Stella / Império de 200g)? Vincule em 1 toque (até 5 códigos por grupo)!
                </p>
              </div>
              <button
                type="button"
                onClick={() => setUnmatchedBarcodePrompt(null)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 cursor-pointer touch-manipulation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <span className="text-[10.5px] font-black uppercase text-emerald-400 flex items-center gap-1.5">
                <Link2 className="w-4 h-4" />
                <span>Opção 1 (Rápida): Vincular este código a uma garrafa já cadastrada:</span>
              </span>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {catalog.map((b) => {
                  const usedCount = (b.barcode ? 1 : 0) + (b.additionalBarcodes?.filter(Boolean).length || 0);
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => handleLinkBarcodeToBottle(b.id, unmatchedBarcodePrompt.code)}
                      className="w-full min-h-[54px] p-3 bg-slate-950 hover:bg-emerald-950/50 border border-white/10 hover:border-emerald-400 rounded-2xl flex items-center justify-between gap-2 text-left transition-all cursor-pointer touch-manipulation active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-2xl shrink-0">{b.emoji}</span>
                        <div className="min-w-0">
                          <div className="text-white font-black text-xs sm:text-sm truncate">{b.name}</div>
                          <div className="text-[10.5px] text-slate-400 font-mono">
                            {b.unitWeightGrams}g • {b.volumeMl}ml •{" "}
                            <span className={usedCount === 0 ? "text-amber-300 font-bold" : "text-emerald-400 font-bold"}>
                              {usedCount}/5 códs
                            </span>
                          </div>
                        </div>
                      </div>
                      <span className="px-3 py-1.5 bg-emerald-500 text-slate-950 font-black text-[10.5px] uppercase rounded-xl shrink-0">
                        Vincular ✅
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => {
                  const codeToKeep = unmatchedBarcodePrompt.code;
                  setUnmatchedBarcodePrompt(null);
                  openEditBottleModal(
                    {
                      id: `bottle_${Date.now()}`,
                      name: "",
                      volumeMl: 330,
                      barcode: codeToKeep,
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
                }}
                className="flex-1 min-h-[48px] px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 font-black text-xs uppercase rounded-xl border border-amber-500/30 flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation"
              >
                <Plus className="w-4 h-4" />
                <span>Opção 2: Cadastrar Nova Garrafa na Balança</span>
              </button>
              <button
                type="button"
                onClick={() => setUnmatchedBarcodePrompt(null)}
                className="min-h-[48px] px-4 py-2.5 bg-slate-950 hover:bg-slate-800 text-slate-300 font-bold text-xs uppercase rounded-xl border border-white/10 cursor-pointer touch-manipulation"
              >
                Cancelar
              </button>
            </div>
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

                  <div className="space-y-2">
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

                    <button
                      type="button"
                      onClick={() => {
                        const finalQty = Math.max(1, qty);
                        handleAddBottleToCart(scannedPrompt.bottle, finalQty);
                        setScannedPrompt(null);
                        setShowCheckoutModal(true);
                      }}
                      className="w-full min-h-[46px] px-4 py-2 bg-slate-950 hover:bg-slate-800 active:scale-95 text-emerald-300 font-black text-xs uppercase rounded-xl border border-emerald-500/40 flex items-center justify-center gap-2 cursor-pointer touch-manipulation select-none"
                    >
                      <Zap className="w-4 h-4" />
                      <span>Lançar &amp; Pagar / Somar no Pátio Agora ➔</span>
                    </button>
                  </div>
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
                {!lastPurchaseReceipt.isScrapPurchase ? (
                  <div>
                    <strong>COTAÇÃO VICTOR:</strong>{" "}
                    R$ {lastPurchaseReceipt.sellPricePerTonUsed || activeSellPricePerTon}/t (R${" "}
                    {(((lastPurchaseReceipt.sellPricePerTonUsed || activeSellPricePerTon) / 1000)).toFixed(2).replace(".", ",")}/kg)
                  </div>
                ) : (
                  <div>
                    <strong>MODALIDADE:</strong> Ferro Velho &amp; Reciclagem ({lastPurchaseReceipt.items.length}{" "}
                    {lastPurchaseReceipt.items.length === 1 ? "material" : "materiais"})
                  </div>
                )}
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
                  <span>{lastPurchaseReceipt.isScrapPurchase ? "PESO TOTAL:" : "PESO SOMADO NO PÁTIO:"}</span>
                  <span className="text-emerald-700">+{lastPurchaseReceipt.totalWeightKg.toFixed(2)} kg</span>
                </div>
                {((lastPurchaseReceipt.bonusAmount || 0) > 0 || (lastPurchaseReceipt.discountAmount || 0) > 0) &&
                  typeof lastPurchaseReceipt.subtotalAmount === "number" && (
                    <div className="flex justify-between text-[11px] font-bold text-slate-700">
                      <span>SUBTOTAL MATERIAIS:</span>
                      <span>R$ {lastPurchaseReceipt.subtotalAmount.toFixed(2)}</span>
                    </div>
                  )}
                {(lastPurchaseReceipt.bonusAmount || 0) > 0 && (
                  <div className="flex justify-between text-[11px] font-bold text-emerald-700">
                    <span>
                      + ACRÉSCIMO{lastPurchaseReceipt.bonusReason ? ` (${lastPurchaseReceipt.bonusReason})` : ""}:
                    </span>
                    <span>+R$ {(lastPurchaseReceipt.bonusAmount || 0).toFixed(2)}</span>
                  </div>
                )}
                {(lastPurchaseReceipt.discountAmount || 0) > 0 && (
                  <div className="flex justify-between text-[11px] font-bold text-rose-700">
                    <span>
                      - DESCONTO{lastPurchaseReceipt.discountReason ? ` (${lastPurchaseReceipt.discountReason})` : ""}:
                    </span>
                    <span>-R$ {(lastPurchaseReceipt.discountAmount || 0).toFixed(2)}</span>
                  </div>
                )}
                {lastPurchaseReceipt.isFounder && (
                  <div className="flex justify-between text-[11px] font-bold text-slate-700">
                    <span>ECONOMIA D.W (VALOR EQUIV.):</span>
                    <span>R$ {lastPurchaseReceipt.items.reduce((s, it) => s + it.costPaid, 0).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-sm border-t border-slate-300 pt-1">
                  <span>{lastPurchaseReceipt.isFounder ? "TOTAL A PAGAR (PRÓPRIA):" : "TOTAL LÍQUIDO:"}</span>
                  <span>
                    R$ {lastPurchaseReceipt.isFounder ? "0,00" : lastPurchaseReceipt.totalPaid.toFixed(2)}
                  </span>
                </div>
                {!lastPurchaseReceipt.isScrapPurchase && (
                  <div className="text-center text-[10px] text-slate-600 pt-1">
                    Pátio Atual: {yardTotals.totalWeightKg.toFixed(1)} kg / {yardTotals.minTonTargetKg.toLocaleString("pt-BR")} kg
                  </div>
                )}
              </div>
            </div>

            {lastPurchaseReceipt.isCancelled && (
              <div className="p-3 bg-rose-950/60 border border-rose-500/50 rounded-2xl text-xs font-black text-rose-200 text-center">
                🚫 COMPRA CANCELADA / ESTORNADA
                {lastPurchaseReceipt.cancelReason ? ` (${lastPurchaseReceipt.cancelReason})` : ""} — Estoque, Caderninho &amp; PDV revertidos!
              </div>
            )}

            {/* Pasta automática + Resumo Caderninho + Seletor 1 ou 2 Vias (MiniPrint 57mm) */}
            <div className="p-3 bg-slate-950 border border-cyan-500/30 rounded-2xl space-y-2.5 text-xs">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[11px] font-black text-cyan-300 flex items-center gap-1.5">
                  <Folder className="w-4 h-4" />
                  Salvo na Pasta: {lastPurchaseReceipt.collectorName}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const matched = collaboratorFolders.find(
                      (f) =>
                        (lastPurchaseReceipt.collaboratorId && f.collaborator?.id === lastPurchaseReceipt.collaboratorId) ||
                        f.name.trim().toLowerCase() === lastPurchaseReceipt.collectorName.trim().toLowerCase()
                    );
                    if (matched) setSelectedFolderKey(matched.key);
                    setLastPurchaseReceipt(null);
                    setActiveTab("cargas");
                  }}
                  className="text-[11px] font-black text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
                >
                  Abrir Pasta 📁
                </button>
              </div>

              {(() => {
                const snap = getTicketCollabSnapshot(lastPurchaseReceipt);
                if (!snap) return null;
                return (
                  <div className="grid grid-cols-3 gap-1.5 pt-1.5 border-t border-white/10 text-[10.5px]">
                    <div>
                      <span className="text-slate-400 block">Comprei (Total)</span>
                      <strong className="font-mono text-white">R$ {snap.totalEarned.toFixed(2)}</strong>
                    </div>
                    <div>
                      <span className="text-emerald-400 block">Já Pago</span>
                      <strong className="font-mono text-emerald-300">R$ {snap.totalPaid.toFixed(2)}</strong>
                    </div>
                    <div className="text-right">
                      <span className="text-rose-400 block">Devo Caderninho</span>
                      <strong className="font-mono text-rose-300">R$ {snap.balancePending.toFixed(2)}</strong>
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => handleSetReceiptCopiesMode(1)}
                  className={`min-h-[38px] px-2.5 py-1.5 rounded-xl font-black text-[11px] border cursor-pointer ${
                    receiptCopiesMode === 1
                      ? "bg-emerald-500 text-slate-950 border-emerald-400"
                      : "bg-slate-900 text-slate-300 border-white/15"
                  }`}
                >
                  📄 1 Via (Só D.W)
                </button>
                <button
                  type="button"
                  onClick={() => handleSetReceiptCopiesMode(2)}
                  className={`min-h-[38px] px-2.5 py-1.5 rounded-xl font-black text-[11px] border cursor-pointer ${
                    receiptCopiesMode === 2
                      ? "bg-amber-400 text-slate-950 border-amber-300"
                      : "bg-slate-900 text-slate-300 border-white/15"
                  }`}
                >
                  ✂️ 2 Vias (D.W + Reciclador)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handlePrintGlassTicket(lastPurchaseReceipt, receiptCopiesMode)}
                className="min-h-[48px] px-3 py-2.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black text-xs uppercase rounded-xl flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation select-none"
              >
                <Printer className="w-4 h-4 shrink-0" />
                <span>Imprimir ({receiptCopiesMode} {receiptCopiesMode === 1 ? "Via" : "Vias"})</span>
              </button>
              <button
                type="button"
                onClick={() => handleShareTicketFunPrint(lastPurchaseReceipt, receiptCopiesMode)}
                disabled={isGeneratingFunPrint}
                className="min-h-[48px] px-3 py-2.5 bg-pink-500 hover:bg-pink-400 active:scale-95 text-slate-950 font-black text-xs uppercase rounded-xl flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation select-none"
              >
                <span>🐱 Fun Print 57mm</span>
              </button>
              <button
                type="button"
                onClick={() => handleShareGlassTicketWhatsApp(lastPurchaseReceipt)}
                className="min-h-[48px] px-3 py-2.5 bg-slate-950 hover:bg-slate-800 active:scale-95 text-emerald-300 font-black text-xs uppercase rounded-xl border border-emerald-500/40 flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation select-none"
              >
                <Share2 className="w-4 h-4 shrink-0" />
                <span>WhatsApp 💬</span>
              </button>
            </div>

            {!lastPurchaseReceipt.isCancelled && (
              cancellingTicketId === lastPurchaseReceipt.id ? (
                <div className="p-3 bg-rose-950/45 border border-rose-500/40 rounded-2xl space-y-2">
                  <span className="text-[11px] font-black text-rose-200 block">
                    Confirmar cancelamento desta compra (reverte Estoque, Caderninho &amp; Caixa do PDV)?
                  </span>
                  <input
                    type="text"
                    value={cancelTicketReasonDraft}
                    onChange={(e) => setCancelTicketReasonDraft(e.target.value)}
                    placeholder="Motivo opcional (ex: Imprevisto / erro de pesagem)"
                    className="w-full min-h-[40px] bg-slate-950 border border-rose-500/35 rounded-xl px-3 text-xs text-white outline-none"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleCancelPurchaseTicket(lastPurchaseReceipt, cancelTicketReasonDraft)}
                      className="min-h-[42px] bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase rounded-xl cursor-pointer"
                    >
                      ✓ Sim, Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => setCancellingTicketId(null)}
                      className="min-h-[42px] bg-slate-800 text-slate-200 font-bold text-xs rounded-xl cursor-pointer"
                    >
                      Voltar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setCancellingTicketId(lastPurchaseReceipt.id);
                    setCancelTicketReasonDraft("");
                  }}
                  className="w-full min-h-[44px] py-2 bg-rose-950/50 hover:bg-rose-600 text-rose-200 hover:text-white font-black text-xs uppercase rounded-xl border border-rose-500/35 flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation select-none"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>🚫 Cancelar / Estornar esta Compra (Imprevisto)</span>
                </button>
              )
            )}

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
        !unmatchedBarcodePrompt &&
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
