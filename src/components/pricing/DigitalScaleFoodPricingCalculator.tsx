import React, { useState, useMemo, useEffect } from "react";
import {
  Scale,
  Utensils,
  ChefHat,
  ShoppingBag,
  DollarSign,
  Percent,
  TrendingUp,
  Sparkles,
  Save,
  Share2,
  Printer,
  Plus,
  Trash2,
  HelpCircle,
  Check,
  Package,
  Flame,
  ArrowRight,
  Info,
  Layers,
  ChevronDown,
  RefreshCw,
  Box,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { SalgadoProporcaoLivreCard } from "./SalgadoProporcaoLivreCard";
import { SmartNumericInput } from "./SmartNumericInput";

export interface FoodIngredientItem {
  id: string;
  name: string;
  category: "massa" | "recheio" | "fritura" | "tempero" | "embalagem" | "outro";
  // Compras no mercado
  packageQty: number; // ex: 2 (kg), 1 (kg), 900 (ml)
  packageUnit: "kg" | "g" | "L" | "ml" | "un" | "pct";
  packagePrice: number; // ex: R$ 11.50
  // Usado nesta receita
  usedQty: number; // ex: 800 (g), 600 (g), 180 (ml)
  usedUnit: "kg" | "g" | "L" | "ml" | "un" | "pct";
}

export interface FoodRecipePreset {
  id: string;
  name: string;
  category: "salgado" | "pastel" | "aipim" | "doce" | "refeicao" | "lanche" | "outro";
  emoji: string;
  description: string;
  // Pesagens na balança
  massTotalWeightG: number; // peso total de massa cozida/pronta em gramas
  fillingTotalWeightG: number; // peso total de recheio pronto em gramas
  unitWeightG: number; // peso individual da unidade na balança
  manualBatchYield?: number; // caso a pessoa prefira dizer "deu 85 coxinhas"
  useManualYield: boolean;
  unitWeightMassaG: number;
  unitWeightRecheioG: number;
  unitTypeLabel: string; // "coxinhas", "pastéis", "porções", "potes", "quentinhas"
  // Custos operacionais
  gasEnergyCost: number; // gás / eletricidade
  packagingCostTotal: number; // caixas, sacos, potes, marmitex
  laborCostTotal: number; // mão de obra / pró-labore rateado
  otherOperationalCost: number; // óleo absorvido, água, desgastes
  // Metas comerciais
  targetMarginPct: number; // margem de lucro líquido pretendida
  cardFeePct: number; // taxas de cartão / impostos
  currentPracticeSellPrice: number; // preço que a pessoa cobra hoje
  ingredients: FoodIngredientItem[];
}

export const FOOD_PRESETS: FoodRecipePreset[] = [
  {
    id: "coxinha_frango",
    name: "Coxinhas de Frango com Recheio (1 Cento / 100 un)",
    category: "salgado",
    emoji: "🥟",
    description: "Cálculo real para 1 cento (100 coxinhas de festa 20g ou lanchonete) pesando massa e recheio na balança.",
    massTotalWeightG: 1200,
    fillingTotalWeightG: 800,
    unitWeightG: 20,
    unitWeightMassaG: 12,
    unitWeightRecheioG: 8,
    useManualYield: false,
    unitTypeLabel: "coxinhas",
    gasEnergyCost: 3.5,
    packagingCostTotal: 2.2, // Caixa para salgados cento
    laborCostTotal: 8.0, // Tempo de preparo / mão de obra
    otherOperationalCost: 1.5,
    targetMarginPct: 55,
    cardFeePct: 2.5,
    currentPracticeSellPrice: 0.85, // R$ 85,00 o cento
    ingredients: [
      {
        id: "ing_trigo",
        name: "Farinha de Trigo",
        category: "massa",
        packageQty: 2,
        packageUnit: "kg",
        packagePrice: 11.0,
        usedQty: 800,
        usedUnit: "g"
      },
      {
        id: "ing_frango",
        name: "Peito de Frango",
        category: "recheio",
        packageQty: 1,
        packageUnit: "kg",
        packagePrice: 22.0,
        usedQty: 600,
        usedUnit: "g"
      },
      {
        id: "ing_knorr",
        name: "Caldo Knorr de Galinha",
        category: "tempero",
        packageQty: 6,
        packageUnit: "un",
        packagePrice: 4.5,
        usedQty: 2,
        usedUnit: "un"
      },
      {
        id: "ing_margarina",
        name: "Margarina Culinária",
        category: "massa",
        packageQty: 500,
        packageUnit: "g",
        packagePrice: 6.5,
        usedQty: 100,
        usedUnit: "g"
      },
      {
        id: "ing_oleo",
        name: "Óleo para Fritura (Absorção/Desgaste)",
        category: "fritura",
        packageQty: 900,
        packageUnit: "ml",
        packagePrice: 8.0,
        usedQty: 180,
        usedUnit: "ml"
      },
      {
        id: "ing_rosca",
        name: "Farinha de Rosca (Empanamento)",
        category: "massa",
        packageQty: 500,
        packageUnit: "g",
        packagePrice: 5.0,
        usedQty: 200,
        usedUnit: "g"
      },
      {
        id: "ing_cheiroverde",
        name: "Cheiro Verde & Alho/Cebola",
        category: "tempero",
        packageQty: 1,
        packageUnit: "pct",
        packagePrice: 4.0,
        usedQty: 0.5,
        usedUnit: "pct"
      },
      {
        id: "ing_molho",
        name: "Molho de Tomate / Extrato",
        category: "recheio",
        packageQty: 300,
        packageUnit: "g",
        packagePrice: 3.5,
        usedQty: 100,
        usedUnit: "g"
      }
    ]
  },
  {
    id: "coxinha_lanchonete",
    name: "Coxinha de Lanchonete (35g Recheio + 45g a 50g Massa = 80g a 85g)",
    category: "salgado",
    emoji: "🥟",
    description: "Proporção clássica de lanchonete: 35g de recheio de frango e 45g a 50g de massa (total de 80g a 85g na balança).",
    massTotalWeightG: 2250, // 50 coxinhas x 45g
    fillingTotalWeightG: 1750, // 50 coxinhas x 35g
    unitWeightG: 80,
    unitWeightMassaG: 45,
    unitWeightRecheioG: 35,
    useManualYield: false,
    unitTypeLabel: "coxinhas",
    gasEnergyCost: 6.0,
    packagingCostTotal: 4.5,
    laborCostTotal: 15.0,
    otherOperationalCost: 3.0,
    targetMarginPct: 55,
    cardFeePct: 2.5,
    currentPracticeSellPrice: 7.50,
    ingredients: [
      {
        id: "ing_trigo_lan",
        name: "Farinha de Trigo",
        category: "massa",
        packageQty: 5,
        packageUnit: "kg",
        packagePrice: 25.0,
        usedQty: 1800,
        usedUnit: "g"
      },
      {
        id: "ing_frango_lan",
        name: "Peito de Frango Desfiado",
        category: "recheio",
        packageQty: 3,
        packageUnit: "kg",
        packagePrice: 66.0,
        usedQty: 1750,
        usedUnit: "g"
      },
      {
        id: "ing_catupiry_lan",
        name: "Requeijão Cremoso / Catupiry",
        category: "recheio",
        packageQty: 1,
        packageUnit: "kg",
        packagePrice: 22.0,
        usedQty: 350,
        usedUnit: "g"
      },
      {
        id: "ing_oleo_lan",
        name: "Óleo para Fritura",
        category: "fritura",
        packageQty: 2,
        packageUnit: "L",
        packagePrice: 16.0,
        usedQty: 400,
        usedUnit: "ml"
      }
    ]
  },
  {
    id: "risoles_carne",
    name: "Risoles de Carne Moída & Queijo (35g Recheio + 45g Massa = 80g)",
    category: "salgado",
    emoji: "🥟",
    description: "Massa cozida dobrada em meia-lua com 35g de recheio de carne moída/queijo e 45g de massa (80g na balança).",
    massTotalWeightG: 2250,
    fillingTotalWeightG: 1750,
    unitWeightG: 80,
    unitWeightMassaG: 45,
    unitWeightRecheioG: 35,
    useManualYield: false,
    unitTypeLabel: "risoles",
    gasEnergyCost: 6.0,
    packagingCostTotal: 4.5,
    laborCostTotal: 15.0,
    otherOperationalCost: 3.0,
    targetMarginPct: 55,
    cardFeePct: 2.5,
    currentPracticeSellPrice: 7.50,
    ingredients: [
      {
        id: "ing_trigo_ris",
        name: "Farinha de Trigo",
        category: "massa",
        packageQty: 5,
        packageUnit: "kg",
        packagePrice: 25.0,
        usedQty: 1800,
        usedUnit: "g"
      },
      {
        id: "ing_carne_ris",
        name: "Carne Moída Refogada",
        category: "recheio",
        packageQty: 2,
        packageUnit: "kg",
        packagePrice: 56.0,
        usedQty: 1400,
        usedUnit: "g"
      },
      {
        id: "ing_queijo_ris",
        name: "Muçarela Ralada",
        category: "recheio",
        packageQty: 1,
        packageUnit: "kg",
        packagePrice: 38.0,
        usedQty: 350,
        usedUnit: "g"
      },
      {
        id: "ing_rosca_ris",
        name: "Farinha de Rosca p/ Empanar",
        category: "massa",
        packageQty: 1,
        packageUnit: "kg",
        packagePrice: 9.0,
        usedQty: 350,
        usedUnit: "g"
      }
    ]
  },
  {
    id: "kibe_recheado",
    name: "Kibe Frito Recheado (35g Recheio + 50g Massa de Quibe = 85g)",
    category: "salgado",
    emoji: "🌾",
    description: "Trigo para quibe hidratado e temperado com 50g de massa e 35g de recheio de carne moída com hortelã (85g na balança).",
    massTotalWeightG: 2500,
    fillingTotalWeightG: 1750,
    unitWeightG: 85,
    unitWeightMassaG: 50,
    unitWeightRecheioG: 35,
    useManualYield: false,
    unitTypeLabel: "kibes",
    gasEnergyCost: 6.5,
    packagingCostTotal: 4.5,
    laborCostTotal: 15.0,
    otherOperationalCost: 3.5,
    targetMarginPct: 55,
    cardFeePct: 2.5,
    currentPracticeSellPrice: 8.00,
    ingredients: [
      {
        id: "ing_trigo_kibe",
        name: "Trigo para Kibe",
        category: "massa",
        packageQty: 1,
        packageUnit: "kg",
        packagePrice: 9.0,
        usedQty: 800,
        usedUnit: "g"
      },
      {
        id: "ing_carne_massa_kibe",
        name: "Carne Moída para a Massa",
        category: "massa",
        packageQty: 2,
        packageUnit: "kg",
        packagePrice: 56.0,
        usedQty: 1200,
        usedUnit: "g"
      },
      {
        id: "ing_carne_recheio_kibe",
        name: "Carne Moída Refogada p/ Recheio",
        category: "recheio",
        packageQty: 2,
        packageUnit: "kg",
        packagePrice: 56.0,
        usedQty: 1500,
        usedUnit: "g"
      },
      {
        id: "ing_hortela_kibe",
        name: "Hortelã Fresca, Cebola e Especiarias",
        category: "tempero",
        packageQty: 1,
        packageUnit: "pct",
        packagePrice: 6.0,
        usedQty: 1,
        usedUnit: "pct"
      }
    ]
  },
  {
    id: "bolinha_queijo",
    name: "Bolinha de Queijo Crocante (35g Recheio Queijo + 45g Massa = 80g)",
    category: "salgado",
    emoji: "🧀",
    description: "Massa aveludada crocante com 35g de queijo muçarela temperado e 45g de massa (80g na balança).",
    massTotalWeightG: 2250,
    fillingTotalWeightG: 1750,
    unitWeightG: 80,
    unitWeightMassaG: 45,
    unitWeightRecheioG: 35,
    useManualYield: false,
    unitTypeLabel: "bolinhas",
    gasEnergyCost: 5.5,
    packagingCostTotal: 4.5,
    laborCostTotal: 14.0,
    otherOperationalCost: 3.0,
    targetMarginPct: 55,
    cardFeePct: 2.5,
    currentPracticeSellPrice: 7.50,
    ingredients: [
      {
        id: "ing_trigo_bq",
        name: "Farinha de Trigo",
        category: "massa",
        packageQty: 5,
        packageUnit: "kg",
        packagePrice: 25.0,
        usedQty: 1800,
        usedUnit: "g"
      },
      {
        id: "ing_queijo_bq",
        name: "Queijo Muçarela em Cubos/Ralado",
        category: "recheio",
        packageQty: 2,
        packageUnit: "kg",
        packagePrice: 76.0,
        usedQty: 1750,
        usedUnit: "g"
      },
      {
        id: "ing_oregano_bq",
        name: "Orégano e Condimentos",
        category: "tempero",
        packageQty: 100,
        packageUnit: "g",
        packagePrice: 5.0,
        usedQty: 20,
        usedUnit: "g"
      },
      {
        id: "ing_oleo_bq",
        name: "Óleo para Fritura",
        category: "fritura",
        packageQty: 2,
        packageUnit: "L",
        packagePrice: 16.0,
        usedQty: 400,
        usedUnit: "ml"
      }
    ]
  },
  {
    id: "salgado_livre",
    name: "Salgado Livre Personalizado (Monte sua Massa e Recheio na Balança)",
    category: "salgado",
    emoji: "⚖️",
    description: "Configuração livre: coloque exatamente as gramas de recheio (ex: 35g) e massa (ex: 45g a 50g) que desejar.",
    massTotalWeightG: 2250,
    fillingTotalWeightG: 1750,
    unitWeightG: 80,
    unitWeightMassaG: 45,
    unitWeightRecheioG: 35,
    useManualYield: false,
    unitTypeLabel: "salgados",
    gasEnergyCost: 6.0,
    packagingCostTotal: 4.5,
    laborCostTotal: 15.0,
    otherOperationalCost: 3.0,
    targetMarginPct: 55,
    cardFeePct: 2.5,
    currentPracticeSellPrice: 7.50,
    ingredients: [
      {
        id: "ing_trigo_sl",
        name: "Farinha de Trigo",
        category: "massa",
        packageQty: 5,
        packageUnit: "kg",
        packagePrice: 25.0,
        usedQty: 1800,
        usedUnit: "g"
      },
      {
        id: "ing_recheio_sl",
        name: "Recheio Personalizado",
        category: "recheio",
        packageQty: 3,
        packageUnit: "kg",
        packagePrice: 65.0,
        usedQty: 1750,
        usedUnit: "g"
      },
      {
        id: "ing_oleo_sl",
        name: "Óleo para Fritar",
        category: "fritura",
        packageQty: 2,
        packageUnit: "L",
        packagePrice: 16.0,
        usedQty: 400,
        usedUnit: "ml"
      }
    ]
  },
  {
    id: "pastel_feira",
    name: "Pastel de Feira & Bar (Carne Moída & Queijo)",
    category: "pastel",
    emoji: "🥟",
    description: "Rolo de massa comprada, carne moída pesada na balança digital e óleo de tacho.",
    massTotalWeightG: 1200,
    fillingTotalWeightG: 1000,
    unitWeightG: 110,
    unitWeightMassaG: 60,
    unitWeightRecheioG: 50,
    useManualYield: false,
    unitTypeLabel: "pastéis",
    gasEnergyCost: 4.0,
    packagingCostTotal: 3.0, // Sacos kraft e guardanapos
    laborCostTotal: 10.0,
    otherOperationalCost: 2.0,
    targetMarginPct: 50,
    cardFeePct: 2.8,
    currentPracticeSellPrice: 8.0,
    ingredients: [
      {
        id: "ing_pass1",
        name: "Rolo de Massa de Pastel",
        category: "massa",
        packageQty: 1,
        packageUnit: "kg",
        packagePrice: 15.0,
        usedQty: 700,
        usedUnit: "g"
      },
      {
        id: "ing_pass2",
        name: "Carne Moída (Acém/Patinho)",
        category: "recheio",
        packageQty: 1,
        packageUnit: "kg",
        packagePrice: 28.0,
        usedQty: 600,
        usedUnit: "g"
      },
      {
        id: "ing_pass3",
        name: "Óleo de Fritura de Tacho",
        category: "fritura",
        packageQty: 2,
        packageUnit: "L",
        packagePrice: 17.0,
        usedQty: 400,
        usedUnit: "ml"
      },
      {
        id: "ing_pass4",
        name: "Cebola, Alho, Caldo e Temperos",
        category: "tempero",
        packageQty: 1,
        packageUnit: "pct",
        packagePrice: 5.0,
        usedQty: 0.5,
        usedUnit: "pct"
      },
      {
        id: "ing_pass5",
        name: "Sacos de Papel Kraft & Guardanapo",
        category: "embalagem",
        packageQty: 100,
        packageUnit: "un",
        packagePrice: 14.0,
        usedQty: 20,
        usedUnit: "un"
      }
    ]
  },
  {
    id: "aipim_feira",
    name: "Aipim / Mandioca Frita (Porções Pequenas & Grandes de Feira)",
    category: "aipim",
    emoji: "🍠",
    description: "Aipim cozido e frito crocante na manteiga de garrafa ou óleo com temperos.",
    massTotalWeightG: 2000,
    fillingTotalWeightG: 0,
    unitWeightG: 250, // Porção de 250g pequena (ou 500g grande)
    unitWeightMassaG: 250,
    unitWeightRecheioG: 0,
    useManualYield: false,
    unitTypeLabel: "porções",
    gasEnergyCost: 4.5,
    packagingCostTotal: 3.5, // Embalagem térmica ou quentinha
    laborCostTotal: 8.0,
    otherOperationalCost: 2.0,
    targetMarginPct: 60,
    cardFeePct: 2.5,
    currentPracticeSellPrice: 18.0,
    ingredients: [
      {
        id: "ing_aip1",
        name: "Aipim / Mandioca Fresca da Feira",
        category: "massa",
        packageQty: 5,
        packageUnit: "kg",
        packagePrice: 20.0,
        usedQty: 2500,
        usedUnit: "g"
      },
      {
        id: "ing_aip2",
        name: "Manteiga de Garrafa ou Margarina",
        category: "fritura",
        packageQty: 500,
        packageUnit: "ml",
        packagePrice: 18.0,
        usedQty: 100,
        usedUnit: "ml"
      },
      {
        id: "ing_aip3",
        name: "Óleo para Fritar",
        category: "fritura",
        packageQty: 900,
        packageUnit: "ml",
        packagePrice: 8.0,
        usedQty: 200,
        usedUnit: "ml"
      },
      {
        id: "ing_aip4",
        name: "Sal Grosso Moído & Alecrim",
        category: "tempero",
        packageQty: 1,
        packageUnit: "kg",
        packagePrice: 3.5,
        usedQty: 50,
        usedUnit: "g"
      },
      {
        id: "ing_aip5",
        name: "Embalagem Marmitinha Térmica",
        category: "embalagem",
        packageQty: 50,
        packageUnit: "un",
        packagePrice: 30.0,
        usedQty: 8,
        usedUnit: "un"
      }
    ]
  },
  {
    id: "bolo_pote",
    name: "Bolo no Pote & Doces Gourmet (200ml)",
    category: "doce",
    emoji: "🍰",
    description: "Massa fofinha de chocolate/baunilha intercalada com recheio cremoso e cobertura.",
    massTotalWeightG: 1200,
    fillingTotalWeightG: 1200,
    unitWeightG: 200,
    unitWeightMassaG: 100,
    unitWeightRecheioG: 100,
    useManualYield: false,
    unitTypeLabel: "potes",
    gasEnergyCost: 3.0,
    packagingCostTotal: 8.0, // Potes com lacre + colherzinhas + etiquetas
    laborCostTotal: 12.0,
    otherOperationalCost: 1.0,
    targetMarginPct: 55,
    cardFeePct: 2.5,
    currentPracticeSellPrice: 10.0,
    ingredients: [
      {
        id: "ing_bp1",
        name: "Farinha de Trigo",
        category: "massa",
        packageQty: 1,
        packageUnit: "kg",
        packagePrice: 5.5,
        usedQty: 400,
        usedUnit: "g"
      },
      {
        id: "ing_bp2",
        name: "Açúcar Refinado",
        category: "massa",
        packageQty: 1,
        packageUnit: "kg",
        packagePrice: 4.8,
        usedQty: 300,
        usedUnit: "g"
      },
      {
        id: "ing_bp3",
        name: "Ovos (Dúzia)",
        category: "massa",
        packageQty: 12,
        packageUnit: "un",
        packagePrice: 12.0,
        usedQty: 4,
        usedUnit: "un"
      },
      {
        id: "ing_bp4",
        name: "Cacau 50% ou Chocolate em Pó",
        category: "massa",
        packageQty: 500,
        packageUnit: "g",
        packagePrice: 18.0,
        usedQty: 120,
        usedUnit: "g"
      },
      {
        id: "ing_bp5",
        name: "Leite Condensado (Lata/Caixa)",
        category: "recheio",
        packageQty: 3,
        packageUnit: "un",
        packagePrice: 18.0,
        usedQty: 2,
        usedUnit: "un"
      },
      {
        id: "ing_bp6",
        name: "Creme de Leite",
        category: "recheio",
        packageQty: 3,
        packageUnit: "un",
        packagePrice: 9.0,
        usedQty: 2,
        usedUnit: "un"
      },
      {
        id: "ing_bp7",
        name: "Pote Plástico 220ml com Tampa e Lacre",
        category: "embalagem",
        packageQty: 24,
        packageUnit: "un",
        packagePrice: 26.0,
        usedQty: 12,
        usedUnit: "un"
      }
    ]
  },
  {
    id: "quentinha_marmita",
    name: "Quentinha / Marmitex / PF (Arroz, Feijão, Frango/Bife)",
    category: "refeicao",
    emoji: "🍱",
    description: "Prato completo pesado na balança (Arroz, Feijão, Frango/Carne e Salada/Farofa).",
    massTotalWeightG: 3000, // Arroz + Feijão
    fillingTotalWeightG: 2000, // Proteína e acompanhamento
    unitWeightG: 500,
    unitWeightMassaG: 300, // 180g arroz + 120g feijão
    unitWeightRecheioG: 200, // 150g frango + 50g salada/farofa
    useManualYield: false,
    unitTypeLabel: "quentinhas",
    gasEnergyCost: 6.0,
    packagingCostTotal: 7.0, // Marmitex alumínio + tampa + sacola
    laborCostTotal: 15.0,
    otherOperationalCost: 3.0,
    targetMarginPct: 45,
    cardFeePct: 2.8,
    currentPracticeSellPrice: 20.0,
    ingredients: [
      {
        id: "ing_qt1",
        name: "Arroz Branco Agulhinha",
        category: "massa",
        packageQty: 5,
        packageUnit: "kg",
        packagePrice: 27.0,
        usedQty: 1000,
        usedUnit: "g" // 1kg cru rende 2.5kg cozido
      },
      {
        id: "ing_qt2",
        name: "Feijão Carioca",
        category: "massa",
        packageQty: 1,
        packageUnit: "kg",
        packagePrice: 8.5,
        usedQty: 500,
        usedUnit: "g" // 500g cru rende 1.3kg cozido
      },
      {
        id: "ing_qt3",
        name: "Peito de Frango / Alcatra em Cubos",
        category: "recheio",
        packageQty: 2,
        packageUnit: "kg",
        packagePrice: 38.0,
        usedQty: 1500,
        usedUnit: "g"
      },
      {
        id: "ing_qt4",
        name: "Óleo, Alho, Cebola e Sal",
        category: "tempero",
        packageQty: 1,
        packageUnit: "pct",
        packagePrice: 8.0,
        usedQty: 0.3,
        usedUnit: "pct"
      },
      {
        id: "ing_qt5",
        name: "Marmitas de Alumínio c/ Tampa e Talher",
        category: "embalagem",
        packageQty: 50,
        packageUnit: "un",
        packagePrice: 35.0,
        usedQty: 10,
        usedUnit: "un"
      }
    ]
  },
  {
    id: "lanche_artesanal",
    name: "Hambúrguer Artesanal & Lanches de Chapa",
    category: "lanche",
    emoji: "🍔",
    description: "Blend de carnes pesadas na balança, pão brioche, queijo e embalagem térmica.",
    massTotalWeightG: 1200, // Pães e adicionais
    fillingTotalWeightG: 1800, // 10 carnes de 150g + queijo + bacon
    unitWeightG: 300,
    unitWeightMassaG: 120,
    unitWeightRecheioG: 180,
    useManualYield: false,
    unitTypeLabel: "lanches",
    gasEnergyCost: 4.5,
    packagingCostTotal: 6.0,
    laborCostTotal: 15.0,
    otherOperationalCost: 2.5,
    targetMarginPct: 50,
    cardFeePct: 2.8,
    currentPracticeSellPrice: 28.0,
    ingredients: [
      {
        id: "ing_lan1",
        name: "Pão de Hambúrguer Brioche",
        category: "massa",
        packageQty: 10,
        packageUnit: "un",
        packagePrice: 15.0,
        usedQty: 10,
        usedUnit: "un"
      },
      {
        id: "ing_lan2",
        name: "Blend de Carnes (Fraldinha/Peito)",
        category: "recheio",
        packageQty: 2,
        packageUnit: "kg",
        packagePrice: 58.0,
        usedQty: 1500,
        usedUnit: "g"
      },
      {
        id: "ing_lan3",
        name: "Queijo Cheddar / Prato Fatiado",
        category: "recheio",
        packageQty: 500,
        packageUnit: "g",
        packagePrice: 22.0,
        usedQty: 300,
        usedUnit: "g"
      },
      {
        id: "ing_lan4",
        name: "Bacon em Tiras",
        category: "recheio",
        packageQty: 500,
        packageUnit: "g",
        packagePrice: 20.0,
        usedQty: 200,
        usedUnit: "g"
      },
      {
        id: "ing_lan5",
        name: "Embalagem Caixa Térmica Kraft",
        category: "embalagem",
        packageQty: 50,
        packageUnit: "un",
        packagePrice: 32.0,
        usedQty: 10,
        usedUnit: "un"
      }
    ]
  }
];

interface DigitalScaleFoodPricingCalculatorProps {
  onRegisterProductToPDV?: (
    name: string,
    category: string,
    sellPrice: number,
    costPrice: number,
    unitStock: number
  ) => void;
  formatCurrency?: (val: number) => string;
}

export function DigitalScaleFoodPricingCalculator({
  onRegisterProductToPDV,
  formatCurrency: customFormatCurrency
}: DigitalScaleFoodPricingCalculatorProps) {
  // Format currency helper
  const formatCurrency = customFormatCurrency || ((val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val || 0)
  );

  // Active Recipe State
  const [activeRecipe, setActiveRecipe] = useState<FoodRecipePreset>(FOOD_PRESETS[0]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>("coxinha_frango");
  const [savedRecipes, setSavedRecipes] = useState<FoodRecipePreset[]>(() => {
    try {
      const stored = localStorage.getItem("culinary_food_recipes_saved");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [activeTab, setActiveTab] = useState<"balanca" | "proporcao" | "ingredientes" | "sobras" | "precificacao" | "resumo">("balanca");
  const [notification, setNotification] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleApplySalgadoProportion = (massaG: number, recheioG: number, totalUnitG: number, name: string) => {
    setActiveRecipe((prev) => {
      const batchYield = prev.manualBatchYield || 50;
      return {
        ...prev,
        name: `${name} (${recheioG}g recheio + ${massaG}g massa = ${totalUnitG}g)`,
        unitWeightG: totalUnitG,
        unitWeightMassaG: massaG,
        unitWeightRecheioG: recheioG,
        massTotalWeightG: massaG * batchYield,
        fillingTotalWeightG: recheioG * batchYield
      };
    });
    showFeedback(`Proporção aplicada: ${recheioG}g recheio + ${massaG}g massa = ${totalUnitG}g!`);
  };

  // Switch Preset
  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const found = FOOD_PRESETS.find((p) => p.id === presetId);
    if (found) {
      // Deep clone so user modifications don't mutate const
      setActiveRecipe(JSON.parse(JSON.stringify(found)));
      showFeedback(`Carregado: ${found.name}`);
    }
  };

  // Convert quantity to standard base (grams, ml, or units) for cost math
  const getStandardQty = (qty: number, unit: "kg" | "g" | "L" | "ml" | "un" | "pct"): number => {
    if (unit === "kg" || unit === "L") return qty * 1000;
    return qty;
  };

  // Calculate costs per ingredient and sobras
  const ingredientStats = useMemo(() => {
    let totalMarketBoughtCost = 0;
    let totalUsedRecipeCost = 0;
    let totalLeftoverValue = 0;

    const detailedList = activeRecipe.ingredients.map((ing) => {
      const pkgBase = getStandardQty(ing.packageQty, ing.packageUnit);
      const usedBase = getStandardQty(ing.usedQty, ing.usedUnit);

      // Preço pago total pelo pacote no mercado
      const pkgCost = ing.packagePrice || 0;
      totalMarketBoughtCost += pkgCost;

      // Custo da fração usada na receita
      let fractionUsed = 0;
      if (pkgBase > 0) {
        fractionUsed = Math.min(usedBase / pkgBase, 1);
      }
      const itemUsedCost = pkgCost * fractionUsed;
      totalUsedRecipeCost += itemUsedCost;

      // Sobra no estoque
      const leftBase = Math.max(pkgBase - usedBase, 0);
      let leftQtyDisplay = leftBase;
      let leftUnitDisplay = ing.packageUnit;

      if ((ing.packageUnit === "kg" || ing.packageUnit === "L") && leftBase < 1000) {
        leftUnitDisplay = ing.packageUnit === "kg" ? "g" : "ml";
        leftQtyDisplay = leftBase;
      } else if (ing.packageUnit === "kg" || ing.packageUnit === "L") {
        leftQtyDisplay = leftBase / 1000;
      }

      const itemLeftoverCost = Math.max(pkgCost - itemUsedCost, 0);
      totalLeftoverValue += itemLeftoverCost;

      return {
        ...ing,
        pkgBase,
        usedBase,
        itemUsedCost,
        itemLeftoverCost,
        leftQtyDisplay,
        leftUnitDisplay,
        percentageUsed: fractionUsed * 100
      };
    });

    return {
      detailedList,
      totalMarketBoughtCost,
      totalUsedRecipeCost,
      totalLeftoverValue
    };
  }, [activeRecipe.ingredients]);

  // Balança Digital math
  const scaleStats = useMemo(() => {
    const massWeight = Number(activeRecipe.massTotalWeightG) || 0;
    const fillingWeight = Number(activeRecipe.fillingTotalWeightG) || 0;
    const totalBatchWeightG = massWeight + fillingWeight;

    const unitWeight = Number(activeRecipe.unitWeightG) || 20;

    // Rendimento: ou manual ou calculado pelo peso unitário
    let batchYield = 0;
    if (activeRecipe.useManualYield && activeRecipe.manualBatchYield && activeRecipe.manualBatchYield > 0) {
      batchYield = activeRecipe.manualBatchYield;
    } else {
      batchYield = unitWeight > 0 ? Math.floor(totalBatchWeightG / unitWeight) : 0;
    }

    if (batchYield <= 0) batchYield = 1;

    // Peso real médio se a pessoa informou rendimento manual
    const calculatedRealUnitWeight = totalBatchWeightG > 0 ? totalBatchWeightG / batchYield : unitWeight;

    // Custos operacionais totais
    const operationalCostTotal =
      (activeRecipe.gasEnergyCost || 0) +
      (activeRecipe.packagingCostTotal || 0) +
      (activeRecipe.laborCostTotal || 0) +
      (activeRecipe.otherOperationalCost || 0);

    // Custo Total Desta Receita (CMV dos ingredientes usados + custos operacionais)
    const totalBatchCost = ingredientStats.totalUsedRecipeCost + operationalCostTotal;

    // Custo por unidade / coxinha / pastel / quentinha
    const costPerUnit = batchYield > 0 ? totalBatchCost / batchYield : 0;
    const ingredientCostPerUnit = batchYield > 0 ? ingredientStats.totalUsedRecipeCost / batchYield : 0;
    const operationalCostPerUnit = batchYield > 0 ? operationalCostTotal / batchYield : 0;

    // Custo de um Cento (100 unidades)
    const costPerHundred = costPerUnit * 100;

    // Precificação Sugerida com Markup / Margem Líquida Real
    const targetMargin = Number(activeRecipe.targetMarginPct) || 50;
    const cardFee = Number(activeRecipe.cardFeePct) || 0;
    const totalDeductionsPct = targetMargin + cardFee;

    // Preço sugerido pela fórmula de Markup garantida
    const divisor = 1 - totalDeductionsPct / 100;
    const suggestedSellPriceUnit = divisor > 0 ? costPerUnit / divisor : costPerUnit * 2;
    const suggestedSellPriceHundred = suggestedSellPriceUnit * 100;

    // Lucro Líquido Real com o preço sugerido
    const cardFeeValue = suggestedSellPriceUnit * (cardFee / 100);
    const netProfitPerUnit = suggestedSellPriceUnit - costPerUnit - cardFeeValue;
    const netProfitTotalBatch = netProfitPerUnit * batchYield;

    // Comparativo com o Preço Atual que o usuário pratica hoje
    const currentPrice = Number(activeRecipe.currentPracticeSellPrice) || suggestedSellPriceUnit;
    const currentCardFee = currentPrice * (cardFee / 100);
    const currentNetProfitUnit = currentPrice - costPerUnit - currentCardFee;
    const currentNetProfitTotalBatch = currentNetProfitUnit * batchYield;
    const currentRealMarginPct = currentPrice > 0 ? (currentNetProfitUnit / currentPrice) * 100 : 0;

    return {
      massWeight,
      fillingWeight,
      totalBatchWeightG,
      unitWeight,
      batchYield,
      calculatedRealUnitWeight,
      operationalCostTotal,
      totalBatchCost,
      costPerUnit,
      ingredientCostPerUnit,
      operationalCostPerUnit,
      costPerHundred,
      suggestedSellPriceUnit,
      suggestedSellPriceHundred,
      netProfitPerUnit,
      netProfitTotalBatch,
      currentPrice,
      currentNetProfitUnit,
      currentNetProfitTotalBatch,
      currentRealMarginPct
    };
  }, [activeRecipe, ingredientStats.totalUsedRecipeCost]);

  // Handlers para atualizar campos da receita
  const handleUpdateRecipeField = (field: keyof FoodRecipePreset, val: any) => {
    setActiveRecipe((prev) => ({
      ...prev,
      [field]: val
    }));
  };

  // Atualizar ingrediente individual
  const handleUpdateIngredient = (id: string, field: keyof FoodIngredientItem, val: any) => {
    setActiveRecipe((prev) => ({
      ...prev,
      ingredients: prev.ingredients.map((ing) => (ing.id === id ? { ...ing, [field]: val } : ing))
    }));
  };

  // Adicionar novo ingrediente
  const handleAddIngredient = () => {
    const newId = `ing_${Date.now()}`;
    const newIng: FoodIngredientItem = {
      id: newId,
      name: "Novo Ingrediente",
      category: "outro",
      packageQty: 1,
      packageUnit: "kg",
      packagePrice: 10.0,
      usedQty: 300,
      usedUnit: "g"
    };
    setActiveRecipe((prev) => ({
      ...prev,
      ingredients: [...prev.ingredients, newIng]
    }));
    showFeedback("Ingrediente adicionado!");
  };

  // Remover ingrediente
  const handleRemoveIngredient = (id: string) => {
    setActiveRecipe((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((ing) => ing.id !== id)
    }));
  };

  // Salvar receita
  const handleSaveRecipe = () => {
    try {
      const existing = savedRecipes.filter((r) => r.id !== activeRecipe.id);
      const updated = [...existing, activeRecipe];
      setSavedRecipes(updated);
      localStorage.setItem("culinary_food_recipes_saved", JSON.stringify(updated));
      showFeedback(`Receita "${activeRecipe.name}" salva com sucesso!`);
    } catch {
      showFeedback("Erro ao salvar no dispositivo.");
    }
  };

  // Compartilhar WhatsApp
  const handleShareWhatsApp = () => {
    const text = `🥟 *FICHA TÉCNICA & PRECIFICAÇÃO COM BALANÇA DIGITAL*\n` +
      `📋 *Produto:* ${activeRecipe.name}\n` +
      `⚖️ *Peso Total:* ${(scaleStats.totalBatchWeightG / 1000).toFixed(2)} kg (Massa: ${activeRecipe.massTotalWeightG}g | Recheio: ${activeRecipe.fillingTotalWeightG}g)\n` +
      `⚖️ *Peso Unitário na Balança:* ${scaleStats.calculatedRealUnitWeight.toFixed(1)}g cada\n` +
      `🔢 *Rendimento Total:* ${scaleStats.batchYield} ${activeRecipe.unitTypeLabel}\n\n` +
      `🛒 *Total Gasto no Mercado:* ${formatCurrency(ingredientStats.totalMarketBoughtCost)}\n` +
      `🍲 *Custo Real Usado na Receita:* ${formatCurrency(ingredientStats.totalUsedRecipeCost)}\n` +
      `📦 *Valor das Sobras (em Estoque):* ${formatCurrency(ingredientStats.totalLeftoverValue)}\n` +
      `🔥 *Custos Operacionais (Gás/Emb):* ${formatCurrency(scaleStats.operationalCostTotal)}\n\n` +
      `💰 *Custo por ${activeRecipe.unitTypeLabel.slice(0, -1)}:* ${formatCurrency(scaleStats.costPerUnit)}\n` +
      `💵 *Custo do Cento (100 un):* ${formatCurrency(scaleStats.costPerHundred)}\n` +
      `📈 *Preço Sugerido de Venda:* ${formatCurrency(scaleStats.suggestedSellPriceUnit)} cada (${formatCurrency(scaleStats.suggestedSellPriceHundred)} o cento)\n` +
      `💎 *Lucro Líquido por Unidade:* ${formatCurrency(scaleStats.netProfitPerUnit)}\n` +
      `🚀 *Lucro Líquido Total do Lote:* ${formatCurrency(scaleStats.netProfitTotalBatch)}\n\n` +
      `_Calculado com precisão pela Calculadora de Precificação Gastronômica Inteligente._`;

    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, "_blank");
  };

  // Imprimir ficha técnica
  const handlePrintRecipe = () => {
    window.print();
  };

  // Botões rápidos de tamanhos de coxinha / salgado na balança
  const quickScaleSizes = [
    { label: "🎈 Festa (20g)", massG: 12, fillG: 8, unitG: 20 },
    { label: "🥟 Coquetel (35g)", massG: 20, fillG: 15, unitG: 35 },
    { label: "☕ Lanchonete (80g)", massG: 50, fillG: 30, unitG: 80 },
    { label: "🏆 Bar / Posto (120g)", massG: 75, fillG: 45, unitG: 120 },
    { label: "🥟 Pastel Feira (120g)", massG: 70, fillG: 50, unitG: 120 },
    { label: "🍠 Aipim Porção P (250g)", massG: 250, fillG: 0, unitG: 250 },
    { label: "🍠 Aipim Feira G (500g)", massG: 500, fillG: 0, unitG: 500 },
    { label: "🍰 Bolo no Pote (200g)", massG: 100, fillG: 100, unitG: 200 },
    { label: "🍱 Marmitex M (500g)", massG: 300, fillG: 200, unitG: 500 }
  ];

  return (
    <div className="bg-slate-950 p-4 sm:p-6 lg:p-8 rounded-3xl border border-white/10 space-y-6 text-white max-w-5xl mx-auto text-left shadow-2xl">
      {/* HEADER DA CALCULADORA GASTRONÔMICA */}
      <div className="border-b border-white/10 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black tracking-widest uppercase border border-emerald-500/30 flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 animate-pulse" />
              BALANÇA DIGITAL & COZINHA PROFISSIONAL
            </span>
            <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-black tracking-widest uppercase border border-amber-500/30">
              CONTROLE DE SOBRAS DO MERCADO
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-amber-400 flex items-center gap-2 uppercase tracking-tight">
            <ChefHat className="w-7 h-7 text-amber-400" />
            Precificação para Salgados, Lanches & Refeições
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 font-medium leading-relaxed max-w-3xl">
            Pese a <strong>massa</strong> e o <strong>recheio</strong> na sua balança digital, veja quantas coxinhas/porções deram e descubra o custo exato de cada uma. Se você foi ao mercado e sobrou ingrediente no armário, o sistema separa o custo usado e calcula o valor das sobras em estoque!
          </p>
        </div>

        {/* Botoes de Ações Topo */}
        <div className="flex items-center gap-2 self-start md:self-center">
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-emerald-900/40 cursor-pointer"
            title="Compartilhar resumo completo no WhatsApp"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">WhatsApp</span>
          </button>
          <button
            type="button"
            onClick={handleSaveRecipe}
            className="px-3 py-2 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20 cursor-pointer"
            title="Salvar receita no dispositivo"
          >
            <Save className="w-4 h-4" />
            <span>Salvar Ficha</span>
          </button>
          <button
            type="button"
            onClick={handlePrintRecipe}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all border border-white/10 cursor-pointer"
            title="Imprimir ficha técnica para a bancada"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* FEEDBACK TOAST */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-bold flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            {notification}
          </motion.div>
        )}
      </AnimatePresence>

      {/* SELETOR DE PRESETS / MODELOS PRONTOS (Coxinhas, Pastel, Aipim, Bolo no Pote, Marmitex, Lanches) */}
      <div className="space-y-2">
        <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
          <span>Escolha um modelo pronto ou personalize sua receita:</span>
          <span className="text-amber-400 font-bold">{FOOD_PRESETS.length} Modelos Testados</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {FOOD_PRESETS.map((preset) => {
            const isSelected = selectedPresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPreset(preset.id)}
                className={`p-2.5 rounded-2xl border text-left transition-all flex flex-col justify-between gap-1.5 cursor-pointer ${
                  isSelected
                    ? "bg-amber-500/15 border-amber-400 text-white shadow-lg shadow-amber-500/10 ring-1 ring-amber-400/50"
                    : "bg-slate-900/60 border-white/5 text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xl">{preset.emoji}</span>
                  {isSelected && <span className="w-2 h-2 rounded-full bg-amber-400" />}
                </div>
                <div className="text-xs font-black leading-tight line-clamp-2">{preset.name.split("(")[0]}</div>
                <div className="text-[9.5px] font-medium text-slate-400 capitalize">{preset.category}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* TABS PRINCIPAIS DA CALCULADORA */}
      <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-1.5 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setActiveTab("balanca")}
          className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === "balanca"
              ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-900/40"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Scale className="w-4 h-4" />
          1. Balança Digital ({scaleStats.batchYield} {activeRecipe.unitTypeLabel})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("proporcao")}
          className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === "proporcao"
              ? "bg-gradient-to-r from-teal-600 to-emerald-500 text-white shadow-lg shadow-teal-950/40"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Scale className="w-4 h-4 text-amber-300" />
          2. Proporção Livre (35g + 45/50g)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("ingredientes")}
          className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === "ingredientes"
              ? "bg-gradient-to-r from-amber-600 to-amber-500 text-slate-950 shadow-lg shadow-amber-500/20"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Utensils className="w-4 h-4" />
          3. Ingredientes ({activeRecipe.ingredients.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("sobras")}
          className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === "sobras"
              ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-900/40"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Box className="w-4 h-4" />
          4. Sobras no Mercado ({formatCurrency(ingredientStats.totalLeftoverValue)})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("precificacao")}
          className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === "precificacao"
              ? "bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white shadow-lg shadow-fuchsia-900/40"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          5. Lucro & Preço de Venda
        </button>
      </div>

      {/* DISPLAY DA BALANÇA DIGITAL (ILUMINAÇÃO DE LED VERDE/AZUL PROFISSIONAL) */}
      <div className="bg-gradient-to-b from-slate-950 to-slate-900 border-2 border-emerald-500/40 rounded-3xl p-4 sm:p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-32 bg-emerald-500/5 blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          {/* DISPLAY DIGITAL LCD */}
          <div className="w-full lg:w-3/5 bg-black/90 border-2 border-slate-800 rounded-2xl p-4 sm:p-5 shadow-inner">
            <div className="flex items-center justify-between text-[11px] text-emerald-400 font-mono tracking-widest border-b border-emerald-950 pb-2 mb-3">
              <span className="flex items-center gap-1.5 font-black uppercase">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                BALANÇA DE BANCADA • MODO GASTRONOMIA
              </span>
              <span className="font-bold">TARA: 0.00g • ESTÁVEL</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              {/* Peso Massa */}
              <div className="bg-slate-950/80 p-2.5 rounded-xl border border-emerald-500/20">
                <span className="text-[10px] text-slate-400 uppercase font-black block">Massa Pronta</span>
                <span className="text-xl sm:text-2xl font-black font-mono text-emerald-400">
                  {activeRecipe.massTotalWeightG >= 1000
                    ? `${(activeRecipe.massTotalWeightG / 1000).toFixed(2)} kg`
                    : `${activeRecipe.massTotalWeightG} g`}
                </span>
                <span className="text-[9px] text-emerald-500/70 font-mono block">Cozida / Pronta</span>
              </div>

              {/* Peso Recheio */}
              <div className="bg-slate-950/80 p-2.5 rounded-xl border border-emerald-500/20">
                <span className="text-[10px] text-slate-400 uppercase font-black block">Recheio</span>
                <span className="text-xl sm:text-2xl font-black font-mono text-amber-400">
                  {activeRecipe.fillingTotalWeightG >= 1000
                    ? `${(activeRecipe.fillingTotalWeightG / 1000).toFixed(2)} kg`
                    : `${activeRecipe.fillingTotalWeightG} g`}
                </span>
                <span className="text-[9px] text-amber-500/70 font-mono block">Desfiado / Pronto</span>
              </div>

              {/* Peso Total */}
              <div className="bg-slate-950/80 p-2.5 rounded-xl border border-cyan-500/20">
                <span className="text-[10px] text-slate-400 uppercase font-black block">Peso Total</span>
                <span className="text-xl sm:text-2xl font-black font-mono text-cyan-400">
                  {(scaleStats.totalBatchWeightG / 1000).toFixed(2)} kg
                </span>
                <span className="text-[9px] text-cyan-500/70 font-mono block">{scaleStats.totalBatchWeightG}g total</span>
              </div>

              {/* Rendimento */}
              <div className="bg-emerald-950/50 p-2.5 rounded-xl border border-emerald-400/40">
                <span className="text-[10px] text-emerald-300 uppercase font-black block">Rendimento</span>
                <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-300">
                  {scaleStats.batchYield}
                </span>
                <span className="text-[9px] text-emerald-400 font-black uppercase tracking-wider block">
                  {activeRecipe.unitTypeLabel}
                </span>
              </div>
            </div>

            {/* Sub-barra da Unidade Individual */}
            <div className="mt-3 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-300 font-mono gap-2">
              <div>
                Peso por {activeRecipe.unitTypeLabel.slice(0, -1)} na balança:{" "}
                <strong className="text-emerald-400 font-bold text-sm">
                  {scaleStats.calculatedRealUnitWeight.toFixed(1)}g
                </strong>{" "}
                ({activeRecipe.unitWeightMassaG || Math.round(scaleStats.calculatedRealUnitWeight * 0.6)}g massa +{" "}
                {activeRecipe.unitWeightRecheioG || Math.round(scaleStats.calculatedRealUnitWeight * 0.4)}g recheio)
              </div>
              <div className="text-amber-400 font-bold">
                Custo de cada: <span className="text-white text-sm font-black">{formatCurrency(scaleStats.costPerUnit)}</span>
              </div>
            </div>
          </div>

          {/* PAINEL DE CONTROLE RÁPIDO DO DISPLAY */}
          <div className="w-full lg:w-2/5 space-y-3">
            <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Tamanhos Padrão na Balança:
                </span>
              </div>

              {/* Botões de tamanhos rápidos */}
              <div className="flex flex-wrap gap-1.5">
                {quickScaleSizes.map((qs, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      handleUpdateRecipeField("unitWeightG", qs.unitG);
                      handleUpdateRecipeField("unitWeightMassaG", qs.massG);
                      handleUpdateRecipeField("unitWeightRecheioG", qs.fillG);
                      handleUpdateRecipeField("useManualYield", false);
                      showFeedback(`Ajustado para tamanho: ${qs.label}`);
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      activeRecipe.unitWeightG === qs.unitG && !activeRecipe.useManualYield
                        ? "bg-emerald-500 text-slate-950 font-black shadow-md"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                    }`}
                  >
                    {qs.label}
                  </button>
                ))}
              </div>

              {/* Modo de cálculo: Automático pelo peso OU Manual (Enrolei e deu X) */}
              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Contou na mão quantas deram?</span>
                <button
                  type="button"
                  onClick={() => handleUpdateRecipeField("useManualYield", !activeRecipe.useManualYield)}
                  className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    activeRecipe.useManualYield
                      ? "bg-amber-400 text-slate-950 font-black"
                      : "bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  {activeRecipe.useManualYield ? "✓ Manual Ativado" : "Usar Contagem Manual"}
                </button>
              </div>

              {activeRecipe.useManualYield && (
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1">
                  <label className="text-[10px] font-black text-amber-300 uppercase block">
                    Quantas {activeRecipe.unitTypeLabel} você enrolou/produziu hoje?
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="w-32">
                      <SmartNumericInput
                        value={activeRecipe.manualBatchYield || 0}
                        onChange={(val) => handleUpdateRecipeField("manualBatchYield", Math.round(val))}
                        suffix="un"
                        allowDecimals={false}
                        clearable
                        placeholder="85"
                        className="text-center font-black text-amber-400 py-1.5"
                      />
                    </div>
                    <span className="text-xs text-slate-300">
                      {activeRecipe.unitTypeLabel} (Cada uma pesou ~
                      <strong className="text-emerald-400 font-bold font-mono">
                        {scaleStats.calculatedRealUnitWeight.toFixed(1)}g
                      </strong>
                      )
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CONTEÚDO DA ABA SELECIONADA */}

      {/* ABA 1: BALANÇA DIGITAL & PESAGENS DETALHADAS */}
      {activeTab === "balanca" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-900/60 p-6 rounded-3xl border border-white/5">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h3 className="text-sm font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                <Scale className="w-4 h-4 text-emerald-400" />
                1. Pesagem da Massa & Recheio
              </h3>
              <span className="text-[10px] font-bold text-slate-400">Em Gramas (g)</span>
            </div>

            {/* Nome do Produto */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase block">Nome da Receita / Produto:</label>
              <input
                type="text"
                value={activeRecipe.name}
                onFocus={(e) => e.target.select()}
                onChange={(e) => handleUpdateRecipeField("name", e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white outline-none focus:border-emerald-400"
                placeholder="Ex: Coxinha de Frango Festa 20g"
              />
            </div>

            {/* Peso Total da Massa */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-300 uppercase block">
                  🥣 Peso Total da Massa Pronta (g):
                </label>
                <span className="text-xs font-mono text-emerald-400 font-bold">
                  {(activeRecipe.massTotalWeightG / 1000).toFixed(2)} kg
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Coloque a bacia da massa na balança, aperte TARA e pese o total de massa cozida.
              </p>
              <SmartNumericInput
                value={activeRecipe.massTotalWeightG}
                onChange={(val) => handleUpdateRecipeField("massTotalWeightG", val)}
                suffix="g"
                step={50}
                allowDecimals
                clearable
                placeholder="1000"
                className="text-base font-black text-emerald-400 py-2.5"
              />
            </div>

            {/* Peso Total do Recheio */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-300 uppercase block">
                  🍗 Peso Total do Recheio Pronto (g):
                </label>
                <span className="text-xs font-mono text-amber-400 font-bold">
                  {(activeRecipe.fillingTotalWeightG / 1000).toFixed(2)} kg
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Pese o frango desfiado temperado, carne moída ou queijo já prontos para rechear.
              </p>
              <SmartNumericInput
                value={activeRecipe.fillingTotalWeightG}
                onChange={(val) => handleUpdateRecipeField("fillingTotalWeightG", val)}
                suffix="g"
                step={50}
                allowDecimals
                clearable
                placeholder="700"
                className="text-base font-black text-amber-400 py-2.5"
              />
            </div>

            {/* Peso por Unidade & Proporção Livre de Massa e Recheio */}
            <div className="p-4 bg-slate-950/90 rounded-2xl border border-cyan-500/30 space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-black text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-cyan-400" />
                  ⚖️ Peso do Salgado & Proporção Livre:
                </label>
                <span className="text-xs font-mono text-cyan-300 font-black">
                  Total: {activeRecipe.unitWeightG}g
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Defina livremente quantos gramas de recheio e de massa cada salgado terá (ex: 35g recheio + 45g a 50g massa).
              </p>

              <div className="grid grid-cols-2 gap-3 pt-1">
                {/* Massa por unidade */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-emerald-400 uppercase block">
                    🥣 Massa por Salgado (g):
                  </label>
                  <SmartNumericInput
                    value={activeRecipe.unitWeightMassaG || Math.round(activeRecipe.unitWeightG * 0.6)}
                    onChange={(val) => {
                      const curRecheio = activeRecipe.unitWeightRecheioG || Math.max(0, activeRecipe.unitWeightG - (activeRecipe.unitWeightMassaG || 0));
                      handleUpdateRecipeField("unitWeightMassaG", val);
                      handleUpdateRecipeField("unitWeightG", Number((val + curRecheio).toFixed(1)));
                    }}
                    suffix="g"
                    allowDecimals
                    clearable
                    placeholder="45"
                    className="text-emerald-400 font-black text-center py-1.5"
                  />
                </div>

                {/* Recheio por unidade */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-amber-400 uppercase block">
                    🍗 Recheio por Salgado (g):
                  </label>
                  <SmartNumericInput
                    value={activeRecipe.unitWeightRecheioG || Math.round(activeRecipe.unitWeightG * 0.4)}
                    onChange={(val) => {
                      const curMassa = activeRecipe.unitWeightMassaG || Math.max(0, activeRecipe.unitWeightG - (activeRecipe.unitWeightRecheioG || 0));
                      handleUpdateRecipeField("unitWeightRecheioG", val);
                      handleUpdateRecipeField("unitWeightG", Number((curMassa + val).toFixed(1)));
                    }}
                    suffix="g"
                    allowDecimals
                    clearable
                    placeholder="35"
                    className="text-amber-400 font-black text-center py-1.5"
                  />
                </div>
              </div>

              {/* Peso Total do Salgado na Balança */}
              <div className="pt-2 border-t border-white/5 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-bold">Peso Final Unitário na Balança:</span>
                  <span className="text-cyan-300 font-mono font-black text-sm">
                    {activeRecipe.unitWeightG}g
                  </span>
                </div>
                <SmartNumericInput
                  value={activeRecipe.unitWeightG}
                  onChange={(val) => {
                    handleUpdateRecipeField("unitWeightG", val);
                    // Adjust proportion if total changes
                    const ratio = val > 0 ? (activeRecipe.unitWeightMassaG || val * 0.6) / (activeRecipe.unitWeightG || val) : 0.6;
                    const newMassa = Number((val * (ratio > 0.1 && ratio < 0.9 ? ratio : 0.6)).toFixed(1));
                    const newRecheio = Number((val - newMassa).toFixed(1));
                    handleUpdateRecipeField("unitWeightMassaG", newMassa);
                    handleUpdateRecipeField("unitWeightRecheioG", newRecheio);
                  }}
                  suffix="g total"
                  allowDecimals
                  clearable
                  placeholder="80"
                  className="text-cyan-300 font-black text-center py-2 text-base border-cyan-500/40"
                />
              </div>

              {/* Botões de Atalhos Rápidos por Tipo de Salgado */}
              <div className="space-y-1 pt-1">
                <span className="text-[10px] font-bold text-slate-400 block">Atalhos Comuns (Toque para aplicar):</span>
                <div className="flex flex-wrap gap-1">
                  {[
                    { label: "🥟 Coxinha/Risoles (45g massa + 35g recheio = 80g)", m: 45, r: 35, u: 80 },
                    { label: "🥟 Coxinha Reforçada (50g massa + 35g recheio = 85g)", m: 50, r: 35, u: 85 },
                    { label: "🧀 Bolinha Queijo (40g massa + 30g queijo = 70g)", m: 40, r: 30, u: 70 },
                    { label: "🌾 Kibe (50g massa + 35g recheio = 85g)", m: 50, r: 35, u: 85 },
                    { label: "🎈 Festa Cento (12g massa + 8g recheio = 20g)", m: 12, r: 8, u: 20 },
                    { label: "🍸 Coquetel (20g massa + 15g recheio = 35g)", m: 20, r: 15, u: 35 },
                    { label: "🏪 Grande Bar/Feira (60g massa + 50g recheio = 110g)", m: 60, r: 50, u: 110 }
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        handleUpdateRecipeField("unitWeightMassaG", preset.m);
                        handleUpdateRecipeField("unitWeightRecheioG", preset.r);
                        handleUpdateRecipeField("unitWeightG", preset.u);
                        showFeedback(`Ajustado: ${preset.label}`);
                      }}
                      className={`text-[10px] px-2 py-1 rounded-lg border font-bold transition-all cursor-pointer ${
                        activeRecipe.unitWeightG === preset.u && activeRecipe.unitWeightMassaG === preset.m
                          ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 ring-1 ring-cyan-400/50"
                          : "bg-slate-900 border-white/5 text-slate-400 hover:text-white hover:border-white/20"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Custos Operacionais e Rendimento */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h3 className="text-sm font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                2. Custos Operacionais & Gás
              </h3>
              <span className="text-[10px] font-bold text-slate-400">Despesas por Lote</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Gás / Energia */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase block">🔥 Gás / Forno / Fritura:</label>
                <SmartNumericInput
                  value={activeRecipe.gasEnergyCost}
                  onChange={(val) => handleUpdateRecipeField("gasEnergyCost", val)}
                  prefix="R$"
                  step={0.5}
                  allowDecimals
                  clearable
                  placeholder="0,00"
                  className="py-2 text-sm font-bold text-white border-white/10"
                />
              </div>

              {/* Embalagens */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase block">📦 Embalagens / Caixa:</label>
                <SmartNumericInput
                  value={activeRecipe.packagingCostTotal}
                  onChange={(val) => handleUpdateRecipeField("packagingCostTotal", val)}
                  prefix="R$"
                  step={0.5}
                  allowDecimals
                  clearable
                  placeholder="0,00"
                  className="py-2 text-sm font-bold text-white border-white/10"
                />
              </div>

              {/* Mão de Obra */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase block">👩‍🍳 Mão de Obra / Pró-labore:</label>
                <SmartNumericInput
                  value={activeRecipe.laborCostTotal}
                  onChange={(val) => handleUpdateRecipeField("laborCostTotal", val)}
                  prefix="R$"
                  step={1}
                  allowDecimals
                  clearable
                  placeholder="0,00"
                  className="py-2 text-sm font-bold text-white border-white/10"
                />
              </div>

              {/* Outros Gastos */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase block">💧 Desgaste / Água / Outros:</label>
                <SmartNumericInput
                  value={activeRecipe.otherOperationalCost}
                  onChange={(val) => handleUpdateRecipeField("otherOperationalCost", val)}
                  prefix="R$"
                  step={0.5}
                  allowDecimals
                  clearable
                  placeholder="0,00"
                  className="py-2 text-sm font-bold text-white border-white/10"
                />
              </div>
            </div>

            {/* CARD DE RESUMO DO LOTE */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-emerald-500/30 space-y-2 mt-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Total Ingredientes Usados:</span>
                <span className="font-bold text-white font-mono">{formatCurrency(ingredientStats.totalUsedRecipeCost)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Custos Operacionais do Lote:</span>
                <span className="font-bold text-amber-400 font-mono">{formatCurrency(scaleStats.operationalCostTotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm font-black border-t border-white/10 pt-2">
                <span className="text-emerald-400">Custo Total de Produção:</span>
                <span className="text-emerald-300 font-mono text-base">{formatCurrency(scaleStats.totalBatchCost)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-300 bg-slate-900/80 p-2 rounded-lg">
                <span>Rendimento Calculado:</span>
                <strong className="text-white">
                  {scaleStats.batchYield} {activeRecipe.unitTypeLabel} (~{formatCurrency(scaleStats.costPerUnit)} / un)
                </strong>
              </div>
            </div>
          </div>

          {/* SIMULADOR DE PROPORÇÃO LIVRE INTEGRADO NA BALANÇA */}
          <div className="col-span-1 md:col-span-2 pt-2">
            <SalgadoProporcaoLivreCard
              onApplyToRecipe={handleApplySalgadoProportion}
              formatCurrency={formatCurrency}
            />
          </div>
        </div>
      )}

      {/* ABA 2: CALCULADORA LIVRE DE PROPORÇÃO DE SALGADOS (RECHEIO + MASSA = PESO FINAL) */}
      {activeTab === "proporcao" && (
        <SalgadoProporcaoLivreCard
          onApplyToRecipe={handleApplySalgadoProportion}
          formatCurrency={formatCurrency}
        />
      )}

      {/* ABA 3: LISTA DE INGREDIENTES COMPRADOS NO MERCADO VS USADOS */}
      {activeTab === "ingredientes" && (
        <div className="space-y-4 bg-slate-900/60 p-4 sm:p-6 rounded-3xl border border-white/5">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-white/10 pb-3">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-amber-400" />
                Ingredientes: Comprado no Mercado vs. Usado nesta Receita
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Preencha o pacote que comprou no mercado e o quanto pesou na balança para fazer a receita. O sistema calcula a fração exata!
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddIngredient}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 transition-all self-start sm:self-center cursor-pointer shadow-md shadow-amber-500/20"
            >
              <Plus className="w-4 h-4" />
              Adicionar Ingrediente
            </button>
          </div>

          {/* TABELA DE INGREDIENTES */}
          <div className="space-y-2.5">
            {ingredientStats.detailedList.map((item) => (
              <div
                key={item.id}
                className="bg-slate-950/80 p-3.5 rounded-2xl border border-white/5 hover:border-white/10 transition-all flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 text-xs"
              >
                {/* Nome e Categoria */}
                <div className="w-full lg:w-1/4 space-y-1">
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => handleUpdateIngredient(item.id, "name", e.target.value)}
                    className="w-full bg-transparent border-b border-white/10 font-bold text-white text-sm outline-none focus:border-amber-400"
                    placeholder="Nome do Ingrediente"
                  />
                  <div className="flex items-center gap-2">
                    <select
                      value={item.category}
                      onChange={(e) => handleUpdateIngredient(item.id, "category", e.target.value)}
                      className="bg-slate-900 border border-white/10 rounded-md px-1.5 py-0.5 text-[10px] text-slate-300 font-bold outline-none"
                    >
                      <option value="massa">Massa</option>
                      <option value="recheio">Recheio</option>
                      <option value="fritura">Fritura/Óleo</option>
                      <option value="tempero">Tempero/Condimento</option>
                      <option value="embalagem">Embalagem</option>
                      <option value="outro">Outro</option>
                    </select>
                    <span className="text-[10px] text-slate-500">Usou {item.percentageUsed.toFixed(0)}% do pct</span>
                  </div>
                </div>

                {/* Compras no Mercado */}
                <div className="w-full lg:w-1/3 bg-slate-900/60 p-2.5 rounded-xl border border-white/5 space-y-1">
                  <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider block">
                    🛒 Comprado no Mercado:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-16">
                      <SmartNumericInput
                        value={item.packageQty}
                        onChange={(val) => handleUpdateIngredient(item.id, "packageQty", val)}
                        allowDecimals
                        clearable
                        className="py-1 text-xs text-center font-bold"
                        placeholder="1"
                      />
                    </div>
                    <select
                      value={item.packageUnit}
                      onChange={(e) => handleUpdateIngredient(item.id, "packageUnit", e.target.value)}
                      className="bg-slate-950 border border-white/10 rounded-lg px-1.5 py-1 text-xs font-bold text-slate-300 outline-none"
                    >
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                      <option value="L">L</option>
                      <option value="ml">ml</option>
                      <option value="un">un</option>
                      <option value="pct">pct</option>
                    </select>
                    <span className="text-slate-400 font-bold text-xs whitespace-nowrap">por</span>
                    <div className="w-24">
                      <SmartNumericInput
                        value={item.packagePrice}
                        onChange={(val) => handleUpdateIngredient(item.id, "packagePrice", val)}
                        prefix="R$"
                        step={0.5}
                        allowDecimals
                        clearable
                        className="py-1 text-xs font-bold"
                        placeholder="0,00"
                      />
                    </div>
                  </div>
                </div>

                {/* Usado na Receita */}
                <div className="w-full lg:w-1/4 bg-slate-900/60 p-2.5 rounded-xl border border-emerald-500/20 space-y-1">
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider block">
                    ⚖️ Usado na Receita (Balança):
                  </span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-20">
                      <SmartNumericInput
                        value={item.usedQty}
                        onChange={(val) => handleUpdateIngredient(item.id, "usedQty", val)}
                        allowDecimals
                        clearable
                        className="py-1 text-xs text-center font-bold text-emerald-400 border-emerald-500/30"
                        placeholder="0"
                      />
                    </div>
                    <select
                      value={item.usedUnit}
                      onChange={(e) => handleUpdateIngredient(item.id, "usedUnit", e.target.value)}
                      className="bg-slate-950 border border-white/10 rounded-lg px-1.5 py-1 text-xs font-bold text-slate-300 outline-none"
                    >
                      <option value="g">g</option>
                      <option value="kg">kg</option>
                      <option value="ml">ml</option>
                      <option value="L">L</option>
                      <option value="un">un</option>
                      <option value="pct">pct</option>
                    </select>
                    <span className="text-xs text-slate-400">=</span>
                    <strong className="text-xs text-emerald-300 font-mono">{formatCurrency(item.itemUsedCost)}</strong>
                  </div>
                </div>

                {/* Sobra e Ações */}
                <div className="flex items-center justify-between lg:justify-end gap-3 w-full lg:w-auto">
                  <div className="text-right">
                    <span className="text-[10px] text-cyan-400 block font-bold">
                      Sobra: {item.leftQtyDisplay} {item.leftUnitDisplay}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">({formatCurrency(item.itemLeftoverCost)})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveIngredient(item.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer"
                    title="Remover ingrediente"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ABA 3: CONTROLE DE SOBRAS DO MERCADO (A MÁGICA QUE O CLIENTE PEDIU!) */}
      {activeTab === "sobras" && (
        <div className="space-y-6 bg-slate-900/60 p-6 rounded-3xl border border-white/5">
          <div className="border-b border-white/10 pb-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <Box className="w-5 h-5 text-cyan-400" />
              Controle Inteligente de Sobras do Mercado & Estoque da Despensa
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 font-medium leading-relaxed">
              Você foi ao mercado e gastou <strong>{formatCurrency(ingredientStats.totalMarketBoughtCost)}</strong>. Mas você <strong>NÃO</strong> teve prejuízo nas sobras! O valor de <strong>{formatCurrency(ingredientStats.totalLeftoverValue)}</strong> continua sendo seu patrimônio, guardado no armário para o próximo lote de coxinhas, pastéis ou quentinhas!
            </p>
          </div>

          {/* CARDS COMPARATIVOS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-950 p-4 rounded-2xl border border-white/10 space-y-1">
              <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">
                🛒 Total Gasto no Supermercado
              </span>
              <div className="text-2xl font-black text-white font-mono">
                {formatCurrency(ingredientStats.totalMarketBoughtCost)}
              </div>
              <span className="text-[10px] text-slate-500 block">Total que saiu da sua conta bancária/bolso</span>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-emerald-500/30 space-y-1">
              <span className="text-[10px] text-emerald-400 font-black uppercase tracking-wider">
                🍲 Custo REAL Usado nesta Receita (CMV)
              </span>
              <div className="text-2xl font-black text-emerald-300 font-mono">
                {formatCurrency(ingredientStats.totalUsedRecipeCost)}
              </div>
              <span className="text-[10px] text-emerald-500/80 block">
                {((ingredientStats.totalUsedRecipeCost / (ingredientStats.totalMarketBoughtCost || 1)) * 100).toFixed(0)}%
                do material foi consumido hoje
              </span>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-cyan-500/40 space-y-1">
              <span className="text-[10px] text-cyan-400 font-black uppercase tracking-wider">
                💎 Sobras em Estoque / Despensa
              </span>
              <div className="text-2xl font-black text-cyan-300 font-mono">
                {formatCurrency(ingredientStats.totalLeftoverValue)}
              </div>
              <span className="text-[10px] text-cyan-500/80 block">Valor guardado para próximas receitas</span>
            </div>
          </div>

          {/* LISTA DISCRIMINADA DAS SOBRAS */}
          <div className="space-y-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-300">
              O que sobrou no seu armário/geladeira hoje:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ingredientStats.detailedList
                .filter((item) => item.itemLeftoverCost > 0.05)
                .map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-950 rounded-xl border border-white/5 flex items-center justify-between text-xs"
                  >
                    <div>
                      <strong className="text-white block font-bold">{item.name}</strong>
                      <span className="text-[11px] text-cyan-400">
                        Sobrou {item.leftQtyDisplay} {item.leftUnitDisplay}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-cyan-300 font-bold block">
                        {formatCurrency(item.itemLeftoverCost)}
                      </span>
                      <span className="text-[9px] text-slate-500 uppercase font-black">Em Estoque</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ABA 4: LUCRO & PREÇO DE VENDA */}
      {activeTab === "precificacao" && (
        <div className="space-y-6 bg-slate-900/60 p-6 rounded-3xl border border-white/5">
          <div className="border-b border-white/10 pb-4 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-fuchsia-400 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-fuchsia-400" />
                Precificação Comercial, Cento & Margem Líquida Real
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Defina quanto você quer colocar limpo no bolso por cada salgado ou cento vendido!
              </p>
            </div>
          </div>

          {/* FORMULÁRIO DE MARGEM */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-200 uppercase block">📈 Margem de Lucro Desejada (%):</label>
              <SmartNumericInput
                value={activeRecipe.targetMarginPct}
                onChange={(val) => handleUpdateRecipeField("targetMarginPct", val)}
                suffix="%"
                step={5}
                allowDecimals
                clearable
                placeholder="50"
                className="py-2.5 text-base font-bold text-white border-white/10"
              />
              <span className="text-[10px] text-slate-400">Lucro líquido garantido na sua conta</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-200 uppercase block">💳 Taxa de Cartão / Imposto (%):</label>
              <SmartNumericInput
                value={activeRecipe.cardFeePct}
                onChange={(val) => handleUpdateRecipeField("cardFeePct", val)}
                suffix="%"
                step={0.5}
                allowDecimals
                clearable
                placeholder="0"
                className="py-2.5 text-base font-bold text-white border-white/10"
              />
              <span className="text-[10px] text-slate-400">Descontado pelo banco/maquininha</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-200 uppercase block">🏷️ Preço que Você Cobra Hoje (R$):</label>
              <SmartNumericInput
                value={activeRecipe.currentPracticeSellPrice}
                onChange={(val) => handleUpdateRecipeField("currentPracticeSellPrice", val)}
                prefix="R$"
                step={0.25}
                allowDecimals
                clearable
                placeholder="0,00"
                className="py-2.5 text-base font-bold text-amber-400 border-white/10"
              />
              <span className="text-[10px] text-slate-400">Para comparar se seu preço atual dá lucro</span>
            </div>
          </div>

          {/* QUADRO DE RESULTADOS FINANCEIROS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* PREÇO SUGERIDO INTELIGENTE */}
            <div className="bg-gradient-to-br from-emerald-950/60 to-slate-950 p-5 rounded-2xl border-2 border-emerald-500/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Preço Sugerido com Margem Real:
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black">
                  RECOMENDADO
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-black text-emerald-300 font-mono">
                  {formatCurrency(scaleStats.suggestedSellPriceUnit)}
                </div>
                <span className="text-xs text-slate-300 font-bold">cada {activeRecipe.unitTypeLabel.slice(0, -1)}</span>
              </div>

              {/* Cento */}
              <div className="p-3 bg-slate-900/80 rounded-xl border border-white/5 space-y-1 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-300 font-bold">Valor do Cento (100 un):</span>
                  <strong className="text-emerald-400 text-sm font-mono font-black">
                    {formatCurrency(scaleStats.suggestedSellPriceHundred)}
                  </strong>
                </div>
                <div className="flex justify-between items-center text-slate-400 text-[11px]">
                  <span>Custo total do cento:</span>
                  <span className="font-mono">{formatCurrency(scaleStats.costPerHundred)}</span>
                </div>
                <div className="flex justify-between items-center text-emerald-300 font-bold text-[11px]">
                  <span>Lucro limpo no cento:</span>
                  <span className="font-mono">
                    {formatCurrency(scaleStats.suggestedSellPriceHundred - scaleStats.costPerHundred)}
                  </span>
                </div>
              </div>

              <div className="text-xs text-slate-300 space-y-1 pt-1">
                <div className="flex justify-between">
                  <span>Lucro líquido por unidade:</span>
                  <strong className="text-emerald-300 font-mono">{formatCurrency(scaleStats.netProfitPerUnit)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Lucro no lote de {scaleStats.batchYield} un:</span>
                  <strong className="text-emerald-400 font-mono font-black">
                    {formatCurrency(scaleStats.netProfitTotalBatch)}
                  </strong>
                </div>
              </div>
            </div>

            {/* AVALIAÇÃO DO PREÇO PRATICADO HOJE */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-300 uppercase tracking-wider">
                  Avaliação do Preço que você cobra hoje:
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                    scaleStats.currentNetProfitUnit > 0
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-rose-500/20 text-rose-300"
                  }`}
                >
                  {scaleStats.currentNetProfitUnit > 0 ? "Lucrativo" : "Prejuízo!"}
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-black text-white font-mono">
                  {formatCurrency(scaleStats.currentPrice)}
                </div>
                <span className="text-xs text-slate-400">cada</span>
              </div>

              <div className="p-3 bg-slate-900/80 rounded-xl border border-white/5 space-y-1 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Margem Líquida Real Atual:</span>
                  <strong
                    className={`font-mono text-sm font-black ${
                      scaleStats.currentRealMarginPct >= 30
                        ? "text-emerald-400"
                        : scaleStats.currentRealMarginPct > 0
                        ? "text-amber-400"
                        : "text-rose-400"
                    }`}
                  >
                    {scaleStats.currentRealMarginPct.toFixed(1)}%
                  </strong>
                </div>
                <div className="flex justify-between items-center text-slate-400 text-[11px]">
                  <span>Lucro limpo por unidade:</span>
                  <span className="font-mono text-white font-bold">
                    {formatCurrency(scaleStats.currentNetProfitUnit)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-400 text-[11px]">
                  <span>Lucro total no lote ({scaleStats.batchYield} un):</span>
                  <span className="font-mono text-white font-bold">
                    {formatCurrency(scaleStats.currentNetProfitTotalBatch)}
                  </span>
                </div>
              </div>

              {/* Botão para cadastrar no PDV */}
              {onRegisterProductToPDV && (
                <button
                  type="button"
                  onClick={() => {
                    onRegisterProductToPDV(
                      activeRecipe.name,
                      "Alimentos & Lanches",
                      scaleStats.suggestedSellPriceUnit,
                      scaleStats.costPerUnit,
                      scaleStats.batchYield
                    );
                    showFeedback(`"${activeRecipe.name}" cadastrado no PDV!`);
                  }}
                  className="w-full py-2.5 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Cadastrar este Salgado/Lanche no PDV
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FOOTER GUIA / DICA PRÁTICA */}
      <div className="bg-slate-900/40 p-4 rounded-2xl border border-white/5 flex items-start gap-3 text-xs text-slate-400 leading-relaxed">
        <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-white block font-bold mb-0.5">Dica de Ouro da Balança:</strong>
          Sempre pese a massa e o recheio separadamente antes de enrolar. Se você padronizar suas coxinhas em 20g (12g massa + 8g recheio), seu rendimento nunca vai variar e você nunca perderá dinheiro com salgados desiguais ou excesso de recheio!
        </div>
      </div>
    </div>
  );
}
