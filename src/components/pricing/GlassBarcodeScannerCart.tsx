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
  Copy
} from "lucide-react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { SmartNumericInput } from "./SmartNumericInput";

export interface CatalogBottleItem {
  id: string;
  name: string; // Nome da garrafa (ex: "Heineken Longneck", "Dreher", "Cachaça 51")
  volumeMl: number; // Volume em ML (ex: 330ml, 210ml, 275ml, 900ml, 600ml, 1000ml)
  barcode: string; // Código de barras EAN (ex: "78936683")
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
    unitWeightGrams: 185, // 185 gramas vazia na balança (6 un ≈ 1.112g)
    unitWeightKg: 0.185,
    category: "longneck",
    buyPricePerUnit: 0.50 / 30, // 30 garrafas = R$ 0,50 | 60 = R$ 1,00
    emoji: "🍺",
    stockUnits: 0,
    quickPresets: [3, 6, 10, 20, 25, 30, 60]
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
    name: "Cerveja 600ml Tradicional (Ambar / Retornável)",
    volumeMl: 600,
    barcode: "7891991000826",
    unitWeightGrams: 450, // 450 gramas (~0.5 kg)
    unitWeightKg: 0.450,
    category: "cerveja600",
    buyPricePerUnit: 0.50, // R$ 0,50 por garrafa intacta
    returnableSellPrice: 1.00, // Revende por R$ 0,80 a R$ 1,00 para bares
    warningAlert: "🚨 ATENÇÃO: Pagar R$ 0,50 cada SOMENTE se o casco estiver inteiro para revender a bares (R$ 0,80 a R$ 1,00). Se for quebrar para caco do Victor, dá prejuízo de R$ 0,43 por garrafa (peça 10 un por R$ 0,50)!",
    emoji: "🍻",
    stockUnits: 0,
    quickPresets: [1, 6, 12, 24]
  },
  {
    id: "bottle_litrao_1000",
    name: "Garrafão Litrão 1 Litro (Retornável / Sucata)",
    volumeMl: 1000,
    barcode: "7891991001342",
    unitWeightGrams: 700, // 700 gramas (~0.7 kg)
    unitWeightKg: 0.700,
    category: "litrao",
    buyPricePerUnit: 0.50, // R$ 0,50 por unidade inteira
    returnableSellPrice: 1.30, // Revende por R$ 1,00 a R$ 1,50 para bares
    warningAlert: "🚨 ATENÇÃO: Pagar R$ 0,50 cada SOMENTE se estiver intacta para revender a bares (R$ 1,00 a R$ 1,50). Se for caco para o Victor, dá prejuízo de R$ 0,40 (peça 7 un por R$ 0,50)!",
    emoji: "🍾",
    stockUnits: 0,
    quickPresets: [1, 2, 6, 12]
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
    returnableSellPrice: 0.40,
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
    returnableSellPrice: 0.50,
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
    name: "Cerveja 600ml Retornável (Brahma/Skol)",
    volumeMl: 600,
    unitWeightGrams: 450,
    category: "cerveja600" as const,
    emoji: "🍻",
    buyPricePerUnit: 0.50,
    returnableSellPrice: 1.00,
    quickPresets: [1, 2, 4, 6, 12, 24],
    description: "450g vazia (Revenda inteiro para bar por R$ 1,00)"
  },
  {
    name: "Garrafão Litrão 1 Litro (1000ml)",
    volumeMl: 1000,
    unitWeightGrams: 650,
    category: "litrao" as const,
    emoji: "🍾",
    buyPricePerUnit: 0.50,
    returnableSellPrice: 1.30,
    quickPresets: [1, 2, 4, 6, 12],
    description: "650g vazia (Revenda inteiro para bar por R$ 1,30)"
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
    returnableSellPrice: 0.50,
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

// Cálculo de custo de lote negociado com a usuária
export const calculateGlassBuyCost = (category: string, quantity: number, defaultUnitCost?: number) => {
  if (category === "longneck") {
    // 30 un = R$ 0,50 | 60 un = R$ 1,00
    const lotsOf30 = Math.floor(quantity / 30);
    const remainder = quantity % 30;
    const cost = lotsOf30 * 0.50 + remainder * (0.50 / 30);
    return Math.round(cost * 100) / 100;
  }
  if (category === "900ml") {
    // 10 un = R$ 0,50 | 20 un = R$ 1,00 | 100 un = R$ 5,00 (R$ 0,05 por garrafa)
    const cost = quantity * 0.05;
    return Math.round(cost * 100) / 100;
  }
  if (category === "vinho") {
    // Lote de 9 unidades = R$ 0,50 (~5.4 kg)
    const lotsOf9 = Math.floor(quantity / 9);
    const remainder = quantity % 9;
    const cost = lotsOf9 * 0.50 + remainder * (0.50 / 9);
    return Math.round(cost * 100) / 100;
  }
  if (category === "pote") {
    // Lote de 18 unidades = R$ 0,50 (~5.0 kg)
    const lotsOf18 = Math.floor(quantity / 18);
    const remainder = quantity % 18;
    const cost = lotsOf18 * 0.50 + remainder * (0.50 / 18);
    return Math.round(cost * 100) / 100;
  }
  if (category === "caco") {
    // Sacola de 5kg = R$ 0,50 | Balde 20L = R$ 1,50
    return Math.round(quantity * (defaultUnitCost || 0.50) * 100) / 100;
  }
  return Math.round(quantity * (defaultUnitCost || 0.02) * 100) / 100;
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

interface Props {
  sellPricePerTon: number; // Preço pago pela usina (ex: R$ 150/ton = R$ 0,15/kg)
  buyerName: string;
  onAddItemsToYardStock?: (itemsToAdd: { name: string; quantity: number; weightKg: number; costPaid: number }[]) => void;
  showNotification?: (msg: string, type: "success" | "error" | "info" | "warning") => void;
}

export function GlassBarcodeScannerCart({
  sellPricePerTon,
  buyerName,
  onAddItemsToYardStock,
  showNotification
}: Props) {
  const sellPricePerKg = sellPricePerTon > 0 ? sellPricePerTon / 1000 : 0.15;

  // Catálogo com Nomes, ML, Códigos e Pesos (Fundido com os 8 itens estratégicos e Estoque Inicial Zerado)
  const [catalog, setCatalog] = useState<CatalogBottleItem[]>(() => {
    try {
      const isCleaned = localStorage.getItem("pdv_dw_glass_zero_clean_v6");
      if (!isCleaned) {
        localStorage.setItem("pdv_dw_glass_zero_clean_v6", "true");
        localStorage.removeItem("pdv_dw_glass_catalog_v4");
        localStorage.removeItem("pdv_dw_glass_catalog_v3");
        return DEFAULT_BOTTLE_CATALOG.map((b) => ({ ...b, stockUnits: 0 }));
      }
      const stored = localStorage.getItem("pdv_dw_glass_catalog_v4") || localStorage.getItem("pdv_dw_glass_catalog_v3");
      if (stored) {
        const parsed: CatalogBottleItem[] = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const existingIds = new Set(parsed.map((p) => p.id));
          const missing = DEFAULT_BOTTLE_CATALOG.filter((d) => !existingIds.has(d.id));
          const merged = parsed.map((p) => {
            const def = DEFAULT_BOTTLE_CATALOG.find((d) => d.id === p.id);
            if (def && def.warningAlert && !p.warningAlert) {
              return { ...p, warningAlert: def.warningAlert, category: def.category, returnableSellPrice: def.returnableSellPrice };
            }
            return p;
          });
          return [...merged, ...missing];
        }
      }
    } catch {}
    return DEFAULT_BOTTLE_CATALOG.map((b) => ({ ...b, stockUnits: 0 }));
  });

  // Ouvinte global para zerar o estoque do pátio quando acionado no painel geral
  useEffect(() => {
    const handleYardZeroEvent = () => {
      setCatalog((prev) => prev.map((b) => ({ ...b, stockUnits: 0 })));
    };
    window.addEventListener("dw_glass_zero_yard", handleYardZeroEvent);
    return () => window.removeEventListener("dw_glass_zero_yard", handleYardZeroEvent);
  }, []);

  // Carrinho de compras no portão (permite misturar garrafas diferentes!)
  const [cart, setCart] = useState<GlassCartItem[]>(() => {
    try {
      const stored = localStorage.getItem("pdv_dw_cart_items_v3");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
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
  const [isRegisteringNew, setIsRegisteringNew] = useState<boolean>(false);
  const [calibratingBottle, setCalibratingBottle] = useState<CatalogBottleItem | null>(null);
  const [calibratedGramsInput, setCalibratedGramsInput] = useState<number>(185);

  const [showTruckDispatchModal, setShowTruckDispatchModal] = useState<boolean>(false);
  const [showZeroConfirmModal, setShowZeroConfirmModal] = useState<boolean>(false);
  const [showStrategicGuideModal, setShowStrategicGuideModal] = useState<boolean>(false);

  // Persistência automática
  useEffect(() => {
    try {
      localStorage.setItem("pdv_dw_glass_catalog_v3", JSON.stringify(catalog));
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

  // Totais do Estoque no Pátio
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

    // Metas do Victor:
    // Carga mínima: 3.000 kg (3 toneladas)
    // Carga ideal (melhor preço): 5.000 kg (5 toneladas)
    const minTonTargetKg = 3000;
    const idealTonTargetKg = 5000;
    const kgMissingForMin = Math.max(0, minTonTargetKg - totalWeightKg);
    const kgMissingForIdeal = Math.max(0, idealTonTargetKg - totalWeightKg);
    const progressMinPct = Math.min(100, (totalWeightKg / minTonTargetKg) * 100);
    const progressIdealPct = Math.min(100, (totalWeightKg / idealTonTargetKg) * 100);

    return {
      totalUnits,
      totalWeightKg,
      totalWeightTon,
      grossRevenueTon,
      kgMissingForMin,
      kgMissingForIdeal,
      progressMinPct,
      progressIdealPct
    };
  }, [catalog, sellPricePerKg]);

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
                handleProcessBarcode(decodedText.trim());
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

  // Bipagem de Código de Barras
  const handleProcessBarcode = (code: string) => {
    if (!code) return;
    const clean = code.trim();
    setBarcodeInput("");

    const matched = catalog.find((c) => c.barcode && c.barcode.trim() === clean);

    if (matched) {
      handleAddBottleToCart(matched, 6);
      if (showNotification) {
        showNotification(`Bipado: ${matched.name} (${matched.volumeMl}ml) +6 unidades! 🏷️🍾`, "success");
      }
    } else {
      setEditingBottle({
        id: `bottle_${Date.now()}`,
        name: "",
        volumeMl: 330,
        barcode: clean,
        unitWeightGrams: 185,
        unitWeightKg: 0.185,
        category: "longneck",
        buyPricePerUnit: 0.02,
        emoji: "🍾",
        stockUnits: 0,
        quickPresets: [3, 6, 10, 20, 25]
      });
      setIsRegisteringNew(true);
      if (showNotification) {
        showNotification(`Código ${clean} novo! Cadastre os gramas na balança agora! ⚖️`, "info");
      }
    }
  };

  // Adicionar garrafa ao carrinho (permite misturar tipos diferentes!)
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
        const totalBuyCost = calculateGlassBuyCost(bottle.category, newQty, bottle.buyPricePerUnit);
        const totalRevenue = bottle.returnableSellPrice
          ? newQty * bottle.returnableSellPrice
          : totalWeightKg * sellPricePerKg;
        const profit = totalRevenue - totalBuyCost;

        updated[idx] = {
          ...existing,
          quantity: newQty,
          totalWeightKg,
          totalBuyCost,
          totalRevenue,
          profit
        };
        return updated;
      } else {
        const totalWeightKg = (qty * bottle.unitWeightGrams) / 1000;
        const totalBuyCost = calculateGlassBuyCost(bottle.category, qty, bottle.buyPricePerUnit);
        const totalRevenue = bottle.returnableSellPrice
          ? qty * bottle.returnableSellPrice
          : totalWeightKg * sellPricePerKg;
        const profit = totalRevenue - totalBuyCost;

        const newItem: GlassCartItem = {
          id: `cart_${Date.now()}_${Math.random()}`,
          catalogId: bottle.id,
          name: bottle.name,
          volumeMl: bottle.volumeMl,
          barcode: bottle.barcode,
          category: bottle.category,
          warningAlert: bottle.warningAlert,
          emoji: bottle.emoji,
          quantity: qty,
          unitWeightGrams: bottle.unitWeightGrams,
          unitWeightKg: bottle.unitWeightGrams / 1000,
          totalWeightKg,
          buyPricePerUnit: bottle.buyPricePerUnit,
          totalBuyCost,
          sellPriceUnitOrWeight: bottle.returnableSellPrice || (bottle.unitWeightGrams / 1000) * sellPricePerKg,
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
          const totalBuyCost = calculateGlassBuyCost(c.category, newQty, c.buyPricePerUnit);
          const catalogItem = catalog.find((cat) => cat.id === c.catalogId);
          const totalRevenue = catalogItem?.returnableSellPrice
            ? newQty * catalogItem.returnableSellPrice
            : totalWeightKg * sellPricePerKg;
          const profit = totalRevenue - totalBuyCost;

          return {
            ...c,
            quantity: newQty,
            totalWeightKg,
            totalBuyCost,
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

  // Calibrar peso de uma garrafa na balança de cozinha
  const handleSaveCalibratedWeight = () => {
    if (!calibratingBottle) return;
    const grams = Math.max(10, Math.round(calibratedGramsInput));
    const kg = grams / 1000;

    // Atualiza no catálogo
    setCatalog((prev) =>
      prev.map((b) =>
        b.id === calibratingBottle.id
          ? { ...b, unitWeightGrams: grams, unitWeightKg: kg }
          : b
      )
    );

    // Atualiza também itens que estejam no carrinho
    setCart((prev) =>
      prev.map((c) => {
        if (c.catalogId === calibratingBottle.id) {
          const totalWeightKg = (c.quantity * grams) / 1000;
          const totalRevenue = totalWeightKg * sellPricePerKg;
          return {
            ...c,
            unitWeightGrams: grams,
            unitWeightKg: kg,
            totalWeightKg,
            totalRevenue,
            profit: totalRevenue - c.totalBuyCost
          };
        }
        return c;
      })
    );

    setCalibratingBottle(null);
    if (showNotification) {
      showNotification(`Peso de ${calibratingBottle.name} calibrado para ${grams}g! ⚖️✅`, "success");
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
    const grams = Math.max(1, Number(editingBottle.unitWeightGrams) || 100);
    const kg = grams / 1000;
    const volume = Math.max(10, Number(editingBottle.volumeMl) || 300);

    const saved: CatalogBottleItem = {
      ...editingBottle,
      name,
      volumeMl: volume,
      unitWeightGrams: grams,
      unitWeightKg: kg,
      stockUnits: Math.max(0, Number(editingBottle.stockUnits) || 0)
    };

    setCatalog((prev) => {
      const exists = prev.some((b) => b.id === saved.id);
      if (exists) {
        return prev.map((b) => (b.id === saved.id ? saved : b));
      }
      return [saved, ...prev];
    });

    setEditingBottle(null);
    setIsRegisteringNew(false);

    if (showNotification) {
      showNotification(`Garrafa/Pote "${saved.name}" salvo com sucesso! (${grams}g na balança • ${volume}ml) ⚖️✅`, "success");
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
    setEditingBottle({
      ...baseBottle,
      id: `bottle_${Date.now()}`,
      name: `${baseBottle.name} (Similar)`,
      barcode: "",
      stockUnits: 0
    });
    setIsRegisteringNew(true);
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
      paymentStatus
    };

    setPurchaseHistory((prev) => [ticket, ...prev.slice(0, 49)]);

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
    // Zera o catálogo de estoque
    setCatalog((prev) => prev.map((b) => ({ ...b, stockUnits: 0 })));
    setCart([]);
    setShowZeroConfirmModal(false);
    try {
      window.dispatchEvent(new CustomEvent("dw_glass_zero_yard_from_child"));
    } catch {}

    if (showNotification) {
      showNotification(
        "🧹 Todos os testes anteriores foram zerados! Agora digite a quantidade real que você e Wellington já têm no pátio! 🏢✨",
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

  return (
    <div className="space-y-5 text-left font-sans">
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
                Cotação: R$ {sellPricePerTon.toFixed(2)}/t (R$ {sellPricePerKg.toFixed(2)}/kg)
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

        {/* BARRA DE METAS DE TONELADAS RUMO AO CAMINHÃO DO VICTOR */}
        <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-slate-950/80 rounded-2xl border border-white/5 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Garrafas no Pátio:</span>
            <strong className="text-xl sm:text-2xl font-mono text-white font-black">
              {yardTotals.totalUnits.toLocaleString("pt-BR")} <span className="text-xs text-slate-400">un</span>
            </strong>
            <span className="text-[10px] text-emerald-400 block font-bold">Total contado real</span>
          </div>

          <div className="p-3 bg-slate-950/80 rounded-2xl border border-white/5 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Peso Real no Pátio:</span>
            <strong className="text-xl sm:text-2xl font-mono text-emerald-400 font-black">
              {yardTotals.totalWeightKg.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} <span className="text-xs">kg</span>
            </strong>
            <span className="text-[10px] text-slate-300 block">
              = <strong>{yardTotals.totalWeightTon.toFixed(3)} Toneladas</strong>
            </span>
          </div>

          <div className="p-3 bg-slate-950/80 rounded-2xl border border-white/5 space-y-1">
            <span className="text-[10px] uppercase font-bold text-amber-400 block">Faturamento Bruto na Usina:</span>
            <strong className="text-xl sm:text-2xl font-mono text-amber-400 font-black">
              R$ {yardTotals.grossRevenueTon.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </strong>
            <span className="text-[10px] text-slate-400 block">Ao entregar pro Victor</span>
          </div>

          <div className="p-3 bg-slate-950/80 rounded-2xl border border-white/5 space-y-1">
            <span className="text-[10px] uppercase font-bold text-teal-400 block">Meta Carga Cheia (5t):</span>
            <strong className="text-xl sm:text-2xl font-mono text-teal-300 font-black">
              {yardTotals.progressIdealPct.toFixed(0)}%
            </strong>
            <span className="text-[10px] text-slate-400 block">
              {yardTotals.kgMissingForIdeal > 0
                ? `Faltam ${yardTotals.kgMissingForIdeal.toFixed(0)} kg (~${Math.ceil(yardTotals.kgMissingForIdeal / 0.5)} garrafas)`
                : "🎉 Pronto para carregar!"}
            </span>
          </div>
        </div>

        {/* Barra Visual de Progresso de Carga */}
        <div className="mt-3 space-y-1">
          <div className="flex justify-between text-[10px] font-bold text-slate-400">
            <span>0 kg</span>
            <span className={yardTotals.totalWeightKg >= 3000 ? "text-emerald-400 font-black" : ""}>
              Carga Mínima (3.000 kg)
            </span>
            <span className={yardTotals.totalWeightKg >= 5000 ? "text-teal-400 font-black" : ""}>
              Carga Ideal Victor (5.000 kg) ⭐
            </span>
          </div>
          <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden border border-white/10 p-0.5">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(2, yardTotals.progressIdealPct))}%` }}
            />
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
                    setEditingBottle({
                      id: `bottle_${Date.now()}`,
                      name: "",
                      volumeMl: 330,
                      barcode: "",
                      unitWeightGrams: 185,
                      unitWeightKg: 0.185,
                      category: "longneck",
                      buyPricePerUnit: 0.02,
                      emoji: "🍾",
                      stockUnits: 0,
                      quickPresets: [3, 6, 10, 20, 25]
                    });
                    setIsRegisteringNew(true);
                  }}
                  className="min-h-[48px] px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-xs uppercase rounded-xl transition-all flex items-center gap-1.5 cursor-pointer touch-manipulation shadow-md shadow-emerald-500/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Cadastrar Garrafa Nova ⚖️</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowCameraModal(true)}
                  className="min-h-[48px] px-4 py-2.5 bg-slate-950 hover:bg-slate-800 text-emerald-300 font-black text-xs uppercase rounded-xl border border-emerald-500/40 transition-all flex items-center gap-2 cursor-pointer touch-manipulation"
                >
                  <Camera className="w-4 h-4 text-emerald-400" />
                  <span>Câmera 📷</span>
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
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Toque Rápido para Lançar no Carrinho (+3, +6, +10, +30 garrafas):
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {catalog.map((bottle) => (
                  <div
                    key={bottle.id}
                    className="p-2.5 bg-slate-950 rounded-2xl border border-white/10 hover:border-emerald-500/40 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-xl">{bottle.emoji}</span>
                        <span className="text-[10px] font-bold text-slate-400 font-mono">
                          {bottle.volumeMl}ml
                        </span>
                      </div>
                      <div className="font-bold text-white text-xs truncate mt-1" title={bottle.name}>
                        {bottle.name}
                      </div>
                      <div className="text-[10px] text-emerald-400 font-mono">
                        {bottle.unitWeightGrams}g vazia
                      </div>
                    </div>

                    {/* Botões de Presets rápidos */}
                    <div className="grid grid-cols-3 gap-1 mt-2 pt-2 border-t border-white/5">
                      {bottle.quickPresets.slice(0, 3).map((qty) => (
                        <button
                          key={qty}
                          type="button"
                          onClick={() => handleAddBottleToCart(bottle, qty)}
                          className="min-h-[38px] py-1 bg-slate-900 hover:bg-emerald-600 hover:text-slate-950 text-white font-mono font-bold text-[11px] rounded-lg transition-all border border-white/5 flex items-center justify-center cursor-pointer touch-manipulation"
                          title={`Adicionar ${qty} garrafas`}
                        >
                          +{qty}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
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
                        <div className="text-xs text-slate-400 font-mono mt-0.5">
                          {item.quantity} un × {item.unitWeightGrams}g ={" "}
                          <strong className="text-emerald-400 font-black">{item.totalWeightKg.toFixed(2)} kg</strong>
                        </div>
                        {item.warningAlert && (
                          <div className="mt-1 px-2 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 text-[10px] text-rose-300 font-bold max-w-md leading-tight flex items-start gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                            <span>{item.warningAlert}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                      {/* Ajuste de Quantidade */}
                      <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-white/5">
                        <button
                          type="button"
                          onClick={() => handleUpdateCartQuantity(item.id, item.quantity - 1)}
                          className="w-8 h-8 rounded-lg bg-slate-950 hover:bg-slate-800 text-white font-bold text-sm flex items-center justify-center cursor-pointer touch-manipulation"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleUpdateCartQuantity(item.id, Math.max(0, Number(e.target.value) || 0))}
                          className="w-14 text-center bg-transparent text-white font-mono font-black text-xs outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdateCartQuantity(item.id, item.quantity + 1)}
                          className="w-8 h-8 rounded-lg bg-slate-950 hover:bg-slate-800 text-white font-bold text-sm flex items-center justify-center cursor-pointer touch-manipulation"
                        >
                          +
                        </button>
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
                    <>
                      <button
                        type="button"
                        onClick={() => handleFinalizeTicket("pendente_caderninho")}
                        className="w-full sm:w-auto min-h-[50px] px-5 py-2.5 bg-slate-950 hover:bg-slate-800 text-amber-300 font-black text-xs uppercase rounded-2xl border border-amber-500/40 transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
                        title="Acumular para acertar no Bolsa Família ou no Caminhão do Victor"
                      >
                        <Calendar className="w-4 h-4 text-amber-400" />
                        <span>Lançar no Caderninho (Pagar no Bolsa Família / Caminhão) 📖</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleFinalizeTicket("pago_na_hora")}
                        className="w-full sm:w-auto min-h-[50px] px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm uppercase tracking-wider rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/30 touch-manipulation"
                      >
                        <Check className="w-5 h-5" />
                        <span>Pagar Agora na Mão (R$ {cartTotals.totalBuyCost.toFixed(2)}) 💵</span>
                      </button>
                    </>
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
      {/* ABA 3: ESTOQUE REAL & CALIBRAÇÃO NA BALANÇA (GRAMAS E ML)  */}
      {/* ========================================================= */}
      {activeTab === "estoque" && (
        <div className="space-y-5">
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider block">
                  Balança de Precisão & Catálogo de Garrafas
                </span>
                <h3 className="text-lg font-black text-white flex items-center gap-2 mt-0.5">
                  <Scale className="w-5 h-5 text-emerald-400" />
                  Estoque Real no Pátio (ML separado de Gramas)
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  Pese 1 garrafa de amostra na sua balança, registre os gramas exatos e edite a quantidade real que você tem hoje no pátio. O app multiplica automaticamente e calcula as toneladas exatas!
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowZeroConfirmModal(true)}
                  className="min-h-[44px] px-3.5 py-2 bg-slate-950 hover:bg-rose-950/60 text-rose-300 font-black text-xs uppercase rounded-xl border border-rose-500/30 transition-all flex items-center gap-1.5 cursor-pointer touch-manipulation"
                >
                  <Eraser className="w-4 h-4 text-rose-400" />
                  <span>Zerar Tudo 🧹</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingBottle({
                      id: `bottle_${Date.now()}`,
                      name: "",
                      volumeMl: 330,
                      barcode: "",
                      unitWeightGrams: 185,
                      unitWeightKg: 0.185,
                      category: "longneck",
                      buyPricePerUnit: 0.02,
                      emoji: "🍾",
                      stockUnits: 0,
                      quickPresets: [3, 6, 10, 20, 25]
                    });
                    setIsRegisteringNew(true);
                  }}
                  className="min-h-[44px] px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-xs uppercase rounded-xl transition-all flex items-center gap-1.5 cursor-pointer touch-manipulation shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Cadastrar Nova Garrafa</span>
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
                          <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                            <span className="font-bold text-emerald-400">Volume: {bottle.volumeMl} ml</span>
                            <span>•</span>
                            <span className="font-mono text-slate-300">
                              Código: {bottle.barcode || "Não cadastrado"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setCalibratingBottle(bottle);
                          setCalibratedGramsInput(bottle.unitWeightGrams);
                        }}
                        className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-emerald-300 font-bold text-xs rounded-lg border border-emerald-500/30 flex items-center gap-1 cursor-pointer touch-manipulation"
                        title="Calibrar peso em gramas na balança"
                      >
                        <Scale className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{bottle.unitWeightGrams}g</span>
                      </button>
                    </div>

                    {/* EDIÇÃO DIRETA DA QUANTIDADE NO PÁTIO */}
                    <div className="p-3 bg-slate-900 rounded-xl border border-white/5 grid grid-cols-2 sm:grid-cols-3 gap-2 items-center text-xs">
                      <div className="space-y-1 col-span-2 sm:col-span-1">
                        <label className="text-[10px] font-black uppercase text-amber-400 block">
                          Unidades no Pátio:
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={bottle.stockUnits || 0}
                          onChange={(e) => handleUpdateYardStockDirect(bottle.id, Number(e.target.value) || 0)}
                          className="w-full bg-slate-950 border border-amber-500/40 focus:border-amber-400 rounded-lg px-2.5 py-1 text-sm font-mono font-black text-white outline-none"
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
                        <span className="text-[9px] text-emerald-300 block">a R$ 0,15/kg</span>
                      </div>
                    </div>

                    {/* BOTÕES RÁPIDOS DE AJUSTE NO PÁTIO */}
                    {/* AJUSTES RÁPIDOS DE ESTOQUE (+10, +30, +50, +100) */}
                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <div className="flex items-center gap-1">
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
                            className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded font-mono font-bold border border-white/5 cursor-pointer touch-manipulation"
                          >
                            {btn.label}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleUpdateYardStockDirect(bottle.id, 0)}
                        className="text-[10px] text-slate-500 hover:text-rose-400 font-bold transition-all px-1.5 py-1"
                        title="Zerar unidades desta garrafa no pátio"
                      >
                        Zerar
                      </button>
                    </div>

                    {/* LINHA DE AÇÕES: EDITAR DADOS, CADASTRAR PARECIDA E CALIBRAR BALANÇA */}
                    <div className="flex items-center justify-between gap-1.5 flex-wrap pt-2 border-t border-white/5 text-[11px]">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingBottle({ ...bottle });
                            setIsRegisteringNew(false);
                          }}
                          className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-cyan-300 font-bold rounded-lg border border-cyan-500/30 flex items-center gap-1 cursor-pointer touch-manipulation"
                          title="Editar nome, ml, peso em gramas ou código"
                        >
                          <Edit3 className="w-3 h-3 text-cyan-400" />
                          <span>Editar ✍️</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDuplicateSimilar(bottle)}
                          className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-bold rounded-lg border border-emerald-500/30 flex items-center gap-1 cursor-pointer touch-manipulation"
                          title="Cadastrar outra garrafa ou pote parecido copiando este peso e ml"
                        >
                          <Copy className="w-3 h-3 text-emerald-400" />
                          <span>Cadastrar Parecida 📑</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setCalibratingBottle(bottle);
                          setCalibratedGramsInput(bottle.unitWeightGrams);
                        }}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold rounded-lg border border-amber-500/30 flex items-center gap-1 cursor-pointer touch-manipulation"
                        title="Pesar amostra na balança digital de cozinha"
                      >
                        <Scale className="w-3 h-3 text-amber-400" />
                        <span>Balança ({bottle.unitWeightGrams}g)</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ABA 4: HISTÓRICO DE CARGAS DO VICTOR & TÍQUETES            */}
      {/* ========================================================= */}
      {activeTab === "cargas" && (
        <div className="space-y-5">
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
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
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
                    Balança Digital de Cozinha • Gramas & ML Exatos
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingBottle(null);
                  setIsRegisteringNew(false);
                }}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-all cursor-pointer"
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
                              returnableSellPrice: preset.returnableSellPrice,
                              quickPresets: preset.quickPresets,
                              name: prev.name ? prev.name : preset.name
                            }
                          : null
                      );
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
                    <option value="cerveja600">🍻 Garrafa 600ml Tradicional (Retornável)</option>
                    <option value="litrao">🍾 Garrafão Litrão 1 Litro</option>
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
                      type="number"
                      min="1"
                      step="1"
                      value={editingBottle.unitWeightGrams}
                      onChange={(e) => {
                        const grams = Math.max(1, Number(e.target.value) || 0);
                        setEditingBottle((prev) =>
                          prev
                            ? {
                                ...prev,
                                unitWeightGrams: grams,
                                unitWeightKg: grams / 1000
                              }
                            : null
                        );
                      }}
                      className="w-full bg-slate-900 border border-white/10 focus:border-emerald-400 rounded-xl px-4 py-2 text-2xl font-mono font-black text-white outline-none"
                    />
                    <span className="absolute right-3 top-3 text-sm text-slate-400 font-bold font-mono">
                      gramas (g)
                    </span>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-400 block uppercase">Equivalente em Kg:</span>
                    <strong className="text-lg font-mono text-emerald-400 font-black block">
                      {(editingBottle.unitWeightGrams / 1000).toFixed(3)} kg
                    </strong>
                  </div>
                </div>

                {/* Régua de equivalência de peso */}
                <div className="pt-2 border-t border-white/5 grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px] text-slate-400">
                  <div>
                    <span className="block text-slate-500">Para dar 1 kg:</span>
                    <strong className="text-white font-mono">
                      {(1000 / Math.max(1, editingBottle.unitWeightGrams)).toFixed(1)} garrafas
                    </strong>
                  </div>
                  <div>
                    <span className="block text-slate-500">Para dar 1 Ton (1.000 kg):</span>
                    <strong className="text-white font-mono">
                      {Math.ceil(1000000 / Math.max(1, editingBottle.unitWeightGrams)).toLocaleString("pt-BR")} garrafas
                    </strong>
                  </div>
                  <div className="col-span-2 sm:col-span-1 text-emerald-400 font-bold">
                    Valor no Victor: R$ {((editingBottle.unitWeightGrams / 1000) * sellPricePerKg).toFixed(3)}
                  </div>
                </div>
              </div>

              {/* CÓDIGO DE BARRAS E LEITURA */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-300 block">
                  Código de Barras EAN (Opcional - deixe vazio se não tiver rótulo):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editingBottle.barcode}
                    onChange={(e) =>
                      setEditingBottle((prev) => (prev ? { ...prev, barcode: e.target.value.trim() } : null))
                    }
                    placeholder="Ex: 78936683, 7898915949162..."
                    className="flex-1 bg-slate-950 border border-white/10 focus:border-emerald-400 rounded-xl px-3 py-2 text-sm font-mono font-bold text-white outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCameraModal(true)}
                    className="px-3 py-2 bg-slate-950 hover:bg-slate-800 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Câmera</span>
                  </button>
                </div>
              </div>

              {/* PREÇO PAGO NO PORTÃO & REVENDA RETORNÁVEL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-950 rounded-2xl border border-white/5">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-amber-400 block">
                    Preço de Compra por Unidade (R$):
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.005"
                    value={editingBottle.buyPricePerUnit}
                    onChange={(e) =>
                      setEditingBottle((prev) =>
                        prev ? { ...prev, buyPricePerUnit: Number(e.target.value) || 0 } : null
                      )
                    }
                    className="w-full bg-slate-900 border border-white/10 focus:border-amber-400 rounded-xl px-3 py-2 text-sm font-mono font-bold text-white outline-none"
                  />
                  <span className="text-[9px] text-slate-400 block">
                    Ex: R$ 0,05 (ou R$ 0,50 a cada 10 unidades)
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-cyan-400 block">
                    Se for Casco Inteiro (Revenda a Bares R$):
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.10"
                    value={editingBottle.returnableSellPrice || 0}
                    onChange={(e) =>
                      setEditingBottle((prev) =>
                        prev ? { ...prev, returnableSellPrice: Number(e.target.value) || 0 } : null
                      )
                    }
                    placeholder="0,00 se for apenas caco"
                    className="w-full bg-slate-900 border border-white/10 focus:border-cyan-400 rounded-xl px-3 py-2 text-sm font-mono font-bold text-white outline-none"
                  />
                  <span className="text-[9px] text-slate-400 block">
                    Deixe 0 se for moer ou mandar quebrado pro Victor
                  </span>
                </div>
              </div>
            </div>

            {/* BOTÕES DE AÇÃO DO MODAL */}
            <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/10">
              <div>
                {!isRegisteringNew && (
                  <button
                    type="button"
                    onClick={() => handleDeleteBottle(editingBottle.id, editingBottle.name)}
                    className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-bold rounded-xl border border-rose-500/30 flex items-center gap-1 cursor-pointer transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
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
                  className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-slate-400 text-xs font-bold rounded-xl border border-white/10 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveBottle}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer touch-manipulation"
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
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <p>
                Coloque <strong>1 garrafa vazia de amostra</strong> de <strong>{calibratingBottle.name} ({calibratingBottle.volumeMl}ml)</strong> em cima da balança de cozinha e digite os gramas exatos que marcar no visor:
              </p>

              <div className="p-3 bg-slate-950 rounded-2xl border border-emerald-500/40 space-y-1">
                <label className="text-[10px] font-black uppercase text-emerald-400 block">
                  Peso Unitário Vazio (em Gramas):
                </label>
                <input
                  type="number"
                  min="10"
                  step="1"
                  value={calibratedGramsInput}
                  onChange={(e) => setCalibratedGramsInput(Math.max(1, Number(e.target.value) || 0))}
                  className="w-full bg-slate-900 border border-white/10 focus:border-emerald-400 rounded-xl px-3 py-2 text-xl font-mono font-black text-white outline-none"
                />
                <span className="text-[10px] text-slate-400 block">
                  = {(calibratedGramsInput / 1000).toFixed(3)} kg por garrafa
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setCalibratingBottle(null)}
                className="px-4 py-2 bg-slate-950 text-slate-400 text-xs font-bold rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveCalibratedWeight}
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase rounded-xl transition-all"
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
                className="px-4 py-2 bg-slate-950 text-slate-400 text-xs font-bold rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteCollaboratorPayment}
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase rounded-xl transition-all"
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
                className="px-4 py-2 bg-slate-950 text-slate-400 text-xs font-bold rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveNewCollaborator}
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase rounded-xl transition-all"
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
                  <span className="text-amber-400 font-bold">Valor Total a Receber (R$ 0,15/kg):</span>
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
                className="px-4 py-2 bg-slate-950 text-slate-400 text-xs font-bold rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDispatchTruckCargo}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs uppercase rounded-xl transition-all shadow-lg shadow-emerald-500/30"
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
              Deseja zerar as quantidades fictícias de teste do estoque? Assim o pátio começará <strong>100% limpo em 0 garrafas</strong>, permitindo que você e o Wellington digitem a quantidade real que vocês têm hoje!
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowZeroConfirmModal(false)}
                className="px-4 py-2 bg-slate-950 text-slate-400 text-xs font-bold rounded-xl"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleResetAllToZeroReal}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase rounded-xl transition-all shadow-md"
              >
                Sim, Zerar Testes Agora 🧹
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CÂMERA DO LEITOR DE CÓDIGO DE BARRAS               */}
      {/* ========================================================= */}
      {showCameraModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-5 max-w-sm w-full space-y-3.5 shadow-2xl text-center">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <span className="text-xs font-black uppercase text-emerald-400 flex items-center gap-1.5">
                <Camera className="w-4 h-4" />
                Aponte para o Código de Barras
              </span>
              <button
                type="button"
                onClick={() => setShowCameraModal(false)}
                className="text-slate-400 hover:text-white"
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
              onClick={() => setShowCameraModal(false)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-all"
            >
              Fechar Câmera
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
                    Compra no Portão (R$ 0,50 a R$ 1,50) vs Venda na Usina do Victor (R$ 0,15/kg) vs Revenda de Casco para Bares
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

              {/* 3. Cerveja 600ml Tradicional */}
              <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🍻</span>
                    <div>
                      <h4 className="font-black text-white text-sm">3. Cerveja 600ml Tradicional</h4>
                      <span className="text-[10px] text-slate-400">1 unidade ~ 0.5 kg (Retornável)</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40">
                    🚨 ATENÇÃO!
                  </span>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-xl border border-white/5 space-y-1 text-[11px]">
                  <div className="flex justify-between text-slate-300">
                    <span>Você paga por 1 garrafa:</span>
                    <strong className="text-amber-400 font-mono">R$ 0,50</strong>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Se vender como caco pro Victor (0.5kg):</span>
                    <strong className="text-rose-400 font-mono">R$ 0,07 (Prejuízo de R$ 0,43!)</strong>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-white/5 font-black text-emerald-300">
                    <span>Revenda Casco Inteiro para Bar:</span>
                    <span>R$ 0,80 a R$ 1,00 (Lucro R$ 0,30 a R$ 0,50)</span>
                  </div>
                </div>
                <p className="text-[10.5px] text-amber-300 font-medium leading-tight">
                  ⚠️ <strong>Veredito:</strong> SÓ ESTÁ CERTO SE FOR PARA REVENDA INTEIRA (CASCO). Se estiver quebrada/para caco, peça 10 garrafas por R$ 0,50.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const b = catalog.find((c) => c.category === "cerveja600") || catalog[0];
                    if (b) handleAddBottleToCart(b, 1);
                    setShowStrategicGuideModal(false);
                  }}
                  className="w-full py-1.5 bg-slate-900 hover:bg-amber-600 hover:text-slate-950 text-white font-bold text-[10px] rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Lançar 1 Casco Intacto (R$ 0,50) no Carrinho</span>
                </button>
              </div>

              {/* 4. Garrafão Litrão 1 Litro */}
              <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🍾</span>
                    <div>
                      <h4 className="font-black text-white text-sm">4. Garrafão Litrão 1 Litro</h4>
                      <span className="text-[10px] text-slate-400">1 unidade ~ 0.7 kg (Retornável)</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40">
                    🚨 ATENÇÃO!
                  </span>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-xl border border-white/5 space-y-1 text-[11px]">
                  <div className="flex justify-between text-slate-300">
                    <span>Você paga por 1 garrafa:</span>
                    <strong className="text-amber-400 font-mono">R$ 0,50</strong>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Se vender como caco pro Victor (0.7kg):</span>
                    <strong className="text-rose-400 font-mono">R$ 0,10 (Prejuízo de R$ 0,40!)</strong>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-white/5 font-black text-emerald-300">
                    <span>Revenda Casco Inteiro para Bar:</span>
                    <span>R$ 1,00 a R$ 1,50 (Lucro R$ 0,50 a R$ 1,00)</span>
                  </div>
                </div>
                <p className="text-[10.5px] text-amber-300 font-medium leading-tight">
                  ⚠️ <strong>Veredito:</strong> SÓ ESTÁ CERTO SE FOR PARA REVENDA INTEIRA (CASCO). Se for quebrar para o Victor, peça pelo menos 7 unidades por R$ 0,50.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const b = catalog.find((c) => c.category === "litrao") || catalog[0];
                    if (b) handleAddBottleToCart(b, 1);
                    setShowStrategicGuideModal(false);
                  }}
                  className="w-full py-1.5 bg-slate-900 hover:bg-amber-600 hover:text-slate-950 text-white font-bold text-[10px] rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Lançar 1 Litrão Intacto (R$ 0,50) no Carrinho</span>
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
                  <strong className="text-emerald-300">Cacos, Longnecks, Potes, Vinhos e 51 / Dreher:</strong> Os cálculos estão perfeitos e super seguros para comprar nos lotinhos de R$ 0,50 a R$ 1,50.
                </li>
                <li>
                  <strong className="text-rose-300">Garrafas de Cerveja Retornáveis (600ml e Litrão):</strong> Pagar R$ 0,50 por unidade <strong>SOMENTE se o casco estiver inteiro</strong> para revender para bares/mercados por R$ 0,80 a R$ 1,50. Se for para quebrar e mandar no caminhão de caco do Victor, <strong>coloque no seu cartaz que precisam ser lotes</strong> (ex: 8 a 10 garrafas de 600ml ou 7 de Litrão por R$ 0,50) para você não tomar prejuízo na sucata!
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
                className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase rounded-xl transition-all cursor-pointer shadow-md"
              >
                Entendido, Fechar Guia 👍
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
