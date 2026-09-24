import React, { useState, useEffect, useMemo } from "react";
import {
  Utensils,
  Plus,
  Trash2,
  Share2,
  Save,
  Sparkles,
  TrendingUp,
  Percent,
  ChefHat,
  Scale,
  Flame,
  Dog,
  Bird,
  Check,
  Package,
  Layers,
  ShoppingBag,
  ArrowRight,
  Info,
  DollarSign,
  Wheat,
  PieChart
} from "lucide-react";

export interface RecipeIngredient {
  id: string;
  name: string;
  packageQty: number; // ex: 1 ou 1000
  packageUnit: "kg" | "g" | "L" | "ml" | "un";
  packageCost: number; // ex: 5.50
  usedQty: number; // ex: 800
  usedUnit: "g" | "kg" | "ml" | "L" | "un";
}

export interface SavedRecipe {
  id: string;
  name: string;
  yieldQty: number;
  yieldUnit: string;
  category: string;
  ingredients: RecipeIngredient[];
  extraCostsPct: number; // ex: 15% para gas/energia
  packagingCostPerUnit: number; // ex: 0.15
  targetMarginPct: number; // ex: 60%
  sellingPrice: number; // ex: 3.50
  createdAt: string;
}

interface FichaTecnicaModuleProps {
  onBack?: () => void;
  onApplyToPDVCatalog?: (product: {
    name: string;
    costPrice: number;
    salePrice: number;
    category: string;
  }) => void;
  formatCurrency?: (val: number) => string;
  showNotification: (msg: string, type: "success" | "error" | "info" | "warning") => void;
}

export const PRESET_RECIPES: Omit<SavedRecipe, "id" | "createdAt">[] = [
  {
    name: "Mini Coxinhas de Festa (Cento 100 Unidades - 20g cada)",
    yieldQty: 100,
    yieldUnit: "salgados",
    category: "Salgados",
    extraCostsPct: 15,
    packagingCostPerUnit: 0.05,
    targetMarginPct: 70,
    sellingPrice: 1.20,
    ingredients: [
      {
        id: "ing_mc1",
        name: "Farinha de Trigo Tradicional (Massa ~15g/un)",
        packageQty: 1,
        packageUnit: "kg",
        packageCost: 5.50,
        usedQty: 1500,
        usedUnit: "g"
      },
      {
        id: "ing_mc2",
        name: "Peito de Frango Desfiado (Recheio ~5g/un)",
        packageQty: 1,
        packageUnit: "kg",
        packageCost: 19.00,
        usedQty: 500,
        usedUnit: "g"
      },
      {
        id: "ing_mc3",
        name: "Requeijão Cremoso / Catupiry",
        packageQty: 400,
        packageUnit: "g",
        packageCost: 12.00,
        usedQty: 150,
        usedUnit: "g"
      },
      {
        id: "ing_mc4",
        name: "Farinha de Rosca Especial (Empanar)",
        packageQty: 500,
        packageUnit: "g",
        packageCost: 6.00,
        usedQty: 300,
        usedUnit: "g"
      },
      {
        id: "ing_mc5",
        name: "Óleo para Fritura (Rateio)",
        packageQty: 900,
        packageUnit: "ml",
        packageCost: 6.50,
        usedQty: 250,
        usedUnit: "ml"
      }
    ]
  },
  {
    name: "Coxinhas de Frango com Catupiry (Fornada 80 Unidades - 70g)",
    yieldQty: 80,
    yieldUnit: "coxinhas",
    category: "Salgados",
    extraCostsPct: 15, // Gás de cozinha e óleo
    packagingCostPerUnit: 0.15,
    targetMarginPct: 65,
    sellingPrice: 3.50,
    ingredients: [
      {
        id: "ing_c1",
        name: "Farinha de Trigo Tradicional (Massa)",
        packageQty: 1,
        packageUnit: "kg",
        packageCost: 5.50,
        usedQty: 800,
        usedUnit: "g"
      },
      {
        id: "ing_c2",
        name: "Peito de Frango Desfiado (Recheio)",
        packageQty: 2,
        packageUnit: "kg",
        packageCost: 38.00,
        usedQty: 1600,
        usedUnit: "g"
      },
      {
        id: "ing_c3",
        name: "Requeijão Cremoso / Catupiry / Cheddar",
        packageQty: 400,
        packageUnit: "g",
        packageCost: 12.00,
        usedQty: 320,
        usedUnit: "g"
      },
      {
        id: "ing_c4",
        name: "Óleo de Soja (Massa e Fritura)",
        packageQty: 900,
        packageUnit: "ml",
        packageCost: 6.50,
        usedQty: 300,
        usedUnit: "ml"
      },
      {
        id: "ing_c5",
        name: "Farinha de Rosca Especial (Empanar)",
        packageQty: 500,
        packageUnit: "g",
        packageCost: 6.00,
        usedQty: 400,
        usedUnit: "g"
      },
      {
        id: "ing_c6",
        name: "Caldo de Galinha, Alho, Cebola & Temperos",
        packageQty: 1,
        packageUnit: "un",
        packageCost: 4.50,
        usedQty: 1,
        usedUnit: "un"
      }
    ]
  },
  {
    name: "Coxinha Grande Tradicional Lanchonete (25 Unidades - 150g)",
    yieldQty: 25,
    yieldUnit: "coxinhas",
    category: "Salgados",
    extraCostsPct: 15,
    packagingCostPerUnit: 0.20,
    targetMarginPct: 65,
    sellingPrice: 8.50,
    ingredients: [
      {
        id: "ing_cg1",
        name: "Farinha de Trigo Especial (Massa ~110g/un)",
        packageQty: 5,
        packageUnit: "kg",
        packageCost: 24.00,
        usedQty: 2750,
        usedUnit: "g"
      },
      {
        id: "ing_cg2",
        name: "Frango Desfiado Temperado (Recheio ~40g/un)",
        packageQty: 2,
        packageUnit: "kg",
        packageCost: 38.00,
        usedQty: 1000,
        usedUnit: "g"
      },
      {
        id: "ing_cg3",
        name: "Requeijão Catupiry Original",
        packageQty: 400,
        packageUnit: "g",
        packageCost: 14.00,
        usedQty: 250,
        usedUnit: "g"
      },
      {
        id: "ing_cg4",
        name: "Farinha de Rosca Grossa Panko/Especial",
        packageQty: 1,
        packageUnit: "kg",
        packageCost: 11.00,
        usedQty: 450,
        usedUnit: "g"
      },
      {
        id: "ing_cg5",
        name: "Óleo de Fritura & Temperos",
        packageQty: 900,
        packageUnit: "ml",
        packageCost: 6.50,
        usedQty: 350,
        usedUnit: "ml"
      }
    ]
  },
  {
    name: "Marmitex Executivo (Pesagem na Balança: Arroz, Feijão, Frango)",
    yieldQty: 1,
    yieldUnit: "marmitas",
    category: "Refeições",
    extraCostsPct: 12,
    packagingCostPerUnit: 1.20, // Embalagem de isopor com divisória
    targetMarginPct: 55,
    sellingPrice: 22.00,
    ingredients: [
      {
        id: "ing_m1",
        name: "Arroz Branco Cozido (Pesado na Balança ~220g)",
        packageQty: 5,
        packageUnit: "kg",
        packageCost: 28.50,
        usedQty: 220,
        usedUnit: "g"
      },
      {
        id: "ing_m2",
        name: "Feijão Carioca Cozido (Pesado na Balança ~150g)",
        packageQty: 1,
        packageUnit: "kg",
        packageCost: 7.90,
        usedQty: 150,
        usedUnit: "g"
      },
      {
        id: "ing_m3",
        name: "Filé de Frango Grelhado (Pesado na Balança ~180g)",
        packageQty: 1,
        packageUnit: "kg",
        packageCost: 21.00,
        usedQty: 180,
        usedUnit: "g"
      },
      {
        id: "ing_m4",
        name: "Farofa Temperada & Salada de Acompanhamento",
        packageQty: 500,
        packageUnit: "g",
        packageCost: 8.00,
        usedQty: 80,
        usedUnit: "g"
      }
    ]
  },
  {
    name: "Hambúrguer de Forno Assado (Fornada 20 Unidades)",
    yieldQty: 20,
    yieldUnit: "salgados",
    category: "Salgados",
    extraCostsPct: 15,
    packagingCostPerUnit: 0.20,
    targetMarginPct: 60,
    sellingPrice: 7.50,
    ingredients: [
      {
        id: "ing_hf1",
        name: "Farinha de Trigo Especial",
        packageQty: 1,
        packageUnit: "kg",
        packageCost: 5.50,
        usedQty: 600,
        usedUnit: "g"
      },
      {
        id: "ing_hf2",
        name: "Carne Bovina Moída (Blend Hambúrguer)",
        packageQty: 2,
        packageUnit: "kg",
        packageCost: 54.00,
        usedQty: 1800,
        usedUnit: "g"
      },
      {
        id: "ing_hf3",
        name: "Queijo Cheddar / Prato Fatiado",
        packageQty: 1,
        packageUnit: "kg",
        packageCost: 38.00,
        usedQty: 400,
        usedUnit: "g"
      },
      {
        id: "ing_hf4",
        name: "Presunto Cozido Fatiado",
        packageQty: 1,
        packageUnit: "kg",
        packageCost: 26.00,
        usedQty: 300,
        usedUnit: "g"
      },
      {
        id: "ing_hf5",
        name: "Fermento Biológico, Leite & Manteiga",
        packageQty: 1,
        packageUnit: "un",
        packageCost: 6.50,
        usedQty: 1,
        usedUnit: "un"
      }
    ]
  },
  {
    name: "X-Tudo Tradicional da Lanchonete (1 Lanche Completo)",
    yieldQty: 1,
    yieldUnit: "lanches",
    category: "Lanches",
    extraCostsPct: 12,
    packagingCostPerUnit: 0.80,
    targetMarginPct: 60,
    sellingPrice: 22.00,
    ingredients: [
      {
        id: "ing_xt1",
        name: "Pão de Hambúrguer c/ Gergelim",
        packageQty: 6,
        packageUnit: "un",
        packageCost: 9.00,
        usedQty: 1,
        usedUnit: "un"
      },
      {
        id: "ing_xt2",
        name: "Hambúrguer Bovino 120g",
        packageQty: 12,
        packageUnit: "un",
        packageCost: 36.00,
        usedQty: 1,
        usedUnit: "un"
      },
      {
        id: "ing_xt3",
        name: "Queijo Prato Fatiado (2 Fatias)",
        packageQty: 500,
        packageUnit: "g",
        packageCost: 20.00,
        usedQty: 40,
        usedUnit: "g"
      },
      {
        id: "ing_xt4",
        name: "Presunto Fatiado (2 Fatias)",
        packageQty: 500,
        packageUnit: "g",
        packageCost: 14.00,
        usedQty: 30,
        usedUnit: "g"
      },
      {
        id: "ing_xt5",
        name: "Bacon em Tiras Crocante",
        packageQty: 500,
        packageUnit: "g",
        packageCost: 22.00,
        usedQty: 40,
        usedUnit: "g"
      },
      {
        id: "ing_xt6",
        name: "Ovo Frito na Chapa",
        packageQty: 12,
        packageUnit: "un",
        packageCost: 12.00,
        usedQty: 1,
        usedUnit: "un"
      },
      {
        id: "ing_xt7",
        name: "Alface Americana, Tomate & Milho",
        packageQty: 1,
        packageUnit: "un",
        packageCost: 3.00,
        usedQty: 1,
        usedUnit: "un"
      },
      {
        id: "ing_xt8",
        name: "Maionese Especial da Casa / Molho",
        packageQty: 400,
        packageUnit: "g",
        packageCost: 8.00,
        usedQty: 35,
        usedUnit: "g"
      }
    ]
  },
  {
    name: "Pizza Grande Calabresa & Queijo (8 Fatias)",
    yieldQty: 8,
    yieldUnit: "fatias",
    category: "Pizzas",
    extraCostsPct: 15,
    packagingCostPerUnit: 0.35,
    targetMarginPct: 65,
    sellingPrice: 7.00,
    ingredients: [
      {
        id: "ing_pz1",
        name: "Farinha de Trigo Especial Pizza",
        packageQty: 1,
        packageUnit: "kg",
        packageCost: 6.00,
        usedQty: 350,
        usedUnit: "g"
      },
      {
        id: "ing_pz2",
        name: "Queijo Mussarela Ralado",
        packageQty: 1,
        packageUnit: "kg",
        packageCost: 36.00,
        usedQty: 350,
        usedUnit: "g"
      },
      {
        id: "ing_pz3",
        name: "Linguiça Calabresa Defumada",
        packageQty: 1,
        packageUnit: "kg",
        packageCost: 26.00,
        usedQty: 250,
        usedUnit: "g"
      },
      {
        id: "ing_pz4",
        name: "Molho de Tomate Artesanal",
        packageQty: 340,
        packageUnit: "g",
        packageCost: 3.50,
        usedQty: 150,
        usedUnit: "g"
      },
      {
        id: "ing_pz5",
        name: "Cebola, Azeitonas Pretas & Orégano",
        packageQty: 1,
        packageUnit: "un",
        packageCost: 4.00,
        usedQty: 1,
        usedUnit: "un"
      },
      {
        id: "ing_pz6",
        name: "Caixa Oitavada Térmica Pizza",
        packageQty: 1,
        packageUnit: "un",
        packageCost: 2.80,
        usedQty: 1,
        usedUnit: "un"
      }
    ]
  },
  {
    name: "Batata Maluca Turbinada Cheddar & Bacon (1 Barca)",
    yieldQty: 1,
    yieldUnit: "porções",
    category: "Porções",
    extraCostsPct: 15,
    packagingCostPerUnit: 1.80,
    targetMarginPct: 60,
    sellingPrice: 32.00,
    ingredients: [
      {
        id: "ing_bm1",
        name: "Batata Palito Congelada Pré-Frita",
        packageQty: 2,
        packageUnit: "kg",
        packageCost: 26.00,
        usedQty: 500,
        usedUnit: "g"
      },
      {
        id: "ing_bm2",
        name: "Cheddar Cremoso Bisnaga Profissional",
        packageQty: 1,
        packageUnit: "kg",
        packageCost: 24.00,
        usedQty: 120,
        usedUnit: "g"
      },
      {
        id: "ing_bm3",
        name: "Bacon Crocante em Cubos",
        packageQty: 500,
        packageUnit: "g",
        packageCost: 22.00,
        usedQty: 80,
        usedUnit: "g"
      },
      {
        id: "ing_bm4",
        name: "Calabresa Fatiada Frita",
        packageQty: 500,
        packageUnit: "g",
        packageCost: 14.00,
        usedQty: 80,
        usedUnit: "g"
      },
      {
        id: "ing_bm5",
        name: "Óleo de Algodão / Soja para Fritura",
        packageQty: 900,
        packageUnit: "ml",
        packageCost: 6.50,
        usedQty: 150,
        usedUnit: "ml"
      },
      {
        id: "ing_bm6",
        name: "Embalagem Barca Plástica c/ Tampa",
        packageQty: 1,
        packageUnit: "un",
        packageCost: 1.80,
        usedQty: 1,
        usedUnit: "un"
      }
    ]
  },
  {
    name: "Prato Comercial / Pensão & Marmitex (10 Marmitas)",
    yieldQty: 10,
    yieldUnit: "marmitas",
    category: "Alimentos",
    extraCostsPct: 15,
    packagingCostPerUnit: 1.00,
    targetMarginPct: 55,
    sellingPrice: 18.00,
    ingredients: [
      {
        id: "ing_m1",
        name: "Peito de Frango / Bife Bovino",
        packageQty: 2,
        packageUnit: "kg",
        packageCost: 40.00,
        usedQty: 1800,
        usedUnit: "g"
      },
      {
        id: "ing_m2",
        name: "Arroz Agulhinha Tipo 1",
        packageQty: 5,
        packageUnit: "kg",
        packageCost: 28.00,
        usedQty: 1400,
        usedUnit: "g"
      },
      {
        id: "ing_m3",
        name: "Feijão Carioca Selecionado",
        packageQty: 1,
        packageUnit: "kg",
        packageCost: 8.90,
        usedQty: 600,
        usedUnit: "g"
      },
      {
        id: "ing_m4",
        name: "Farofa Temperada Crocante",
        packageQty: 500,
        packageUnit: "g",
        packageCost: 6.00,
        usedQty: 250,
        usedUnit: "g"
      },
      {
        id: "ing_m5",
        name: "Salada de Alface, Tomate & Vinagrete",
        packageQty: 1,
        packageUnit: "un",
        packageCost: 12.00,
        usedQty: 1,
        usedUnit: "un"
      },
      {
        id: "ing_m6",
        name: "Marmitex de Isopor / Alumínio n° 8",
        packageQty: 10,
        packageUnit: "un",
        packageCost: 9.00,
        usedQty: 10,
        usedUnit: "un"
      }
    ]
  },
  {
    name: "Cento de Brigadeiros Gourmet (100 Unidades)",
    yieldQty: 100,
    yieldUnit: "brigadeiros",
    category: "Doces",
    extraCostsPct: 10,
    packagingCostPerUnit: 0.08,
    targetMarginPct: 60,
    sellingPrice: 1.20,
    ingredients: [
      {
        id: "ing_b1",
        name: "Leite Condensado 395g",
        packageQty: 1,
        packageUnit: "un",
        packageCost: 6.20,
        usedQty: 3,
        usedUnit: "un"
      },
      {
        id: "ing_b2",
        name: "Creme de Leite 200g",
        packageQty: 1,
        packageUnit: "un",
        packageCost: 3.50,
        usedQty: 2,
        usedUnit: "un"
      },
      {
        id: "ing_b3",
        name: "Cacau em Pó 50%",
        packageQty: 200,
        packageUnit: "g",
        packageCost: 12.00,
        usedQty: 80,
        usedUnit: "g"
      },
      {
        id: "ing_b4",
        name: "Chocolate Granulado Nobre",
        packageQty: 500,
        packageUnit: "g",
        packageCost: 16.50,
        usedQty: 300,
        usedUnit: "g"
      },
      {
        id: "ing_b5",
        name: "Manteiga com Sal",
        packageQty: 200,
        packageUnit: "g",
        packageCost: 11.00,
        usedQty: 30,
        usedUnit: "g"
      },
      {
        id: "ing_b6",
        name: "Forminhas para Doces n° 5",
        packageQty: 100,
        packageUnit: "un",
        packageCost: 6.00,
        usedQty: 100,
        usedUnit: "un"
      }
    ]
  }
];

export interface BulkSimulation {
  name: string;
  packageWeight: number; // ex: 15 (kg)
  packageCost: number; // ex: 200.00
  sellPricePerKg: number; // ex: 13.90
  desiredMarginPct: number; // ex: 35%
  bagCostPerKg: number; // ex: 0.15
  wastePct: number; // ex: 1.5%
  category: string;
}

export const PRESET_BULK_ITEMS: BulkSimulation[] = [
  {
    name: "Saco Ração Cães Adultos Premium 15kg",
    packageWeight: 15,
    packageCost: 190.00,
    sellPricePerKg: 18.90,
    desiredMarginPct: 35,
    bagCostPerKg: 0.15,
    wastePct: 1.0,
    category: "Rações a Granel (kg)"
  },
  {
    name: "Saco Ração Cães Econômica 20kg",
    packageWeight: 20,
    packageCost: 200.00,
    sellPricePerKg: 14.90,
    desiredMarginPct: 35,
    bagCostPerKg: 0.15,
    wastePct: 1.2,
    category: "Rações a Granel (kg)"
  },
  {
    name: "Saco Ração Gatos Castrados Salmão 10.1kg",
    packageWeight: 10.1,
    packageCost: 140.00,
    sellPricePerKg: 21.90,
    desiredMarginPct: 38,
    bagCostPerKg: 0.15,
    wastePct: 1.0,
    category: "Rações a Granel (kg)"
  },
  {
    name: "Saco Milho Moído / Quirera Fina 50kg (Aviário)",
    packageWeight: 50,
    packageCost: 75.00,
    sellPricePerKg: 3.50,
    desiredMarginPct: 40,
    bagCostPerKg: 0.10,
    wastePct: 2.0,
    category: "Grãos & Sementes a Granel"
  },
  {
    name: "Saco Ração Postura Galinhas Poedeiras 20kg",
    packageWeight: 20,
    packageCost: 52.00,
    sellPricePerKg: 4.50,
    desiredMarginPct: 42,
    bagCostPerKg: 0.10,
    wastePct: 1.5,
    category: "Rações para Aves & Postura"
  },
  {
    name: "Saco Mistura Especial Calopsitas / Canários 10kg",
    packageWeight: 10,
    packageCost: 95.00,
    sellPricePerKg: 16.90,
    desiredMarginPct: 45,
    bagCostPerKg: 0.15,
    wastePct: 1.0,
    category: "Grãos & Sementes a Granel"
  },
  {
    name: "Peça Queijo Mussarela 4kg (Fatiado a Granel)",
    packageWeight: 4,
    packageCost: 115.00,
    sellPricePerKg: 39.90,
    desiredMarginPct: 30,
    bagCostPerKg: 0.20,
    wastePct: 1.5,
    category: "Frios & Fatiados"
  }
];

export function FichaTecnicaModule({
  onBack,
  onApplyToPDVCatalog,
  formatCurrency = (v) => `R$ ${v.toFixed(2).replace(".", ",")}`,
  showNotification
}: FichaTecnicaModuleProps) {
  // Global Mode Toggle: "receitas" (Salgados, Coxinhas, Lanches) vs "granel" (Rações, Aviário, Milho, Sementes)
  const [calculatorMode, setCalculatorMode] = useState<"receitas" | "granel">("receitas");

  // ==========================================
  // MODE 1: RECIPES STATE (Coxinhas, Lanches, etc.)
  // ==========================================
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>(() => {
    try {
      const stored = localStorage.getItem("pdv_ficha_tecnica_recipes");
      if (stored) return JSON.parse(stored);
    } catch (_) {}
    return PRESET_RECIPES.map((r, i) => ({
      ...r,
      id: `recipe_preset_${i}`,
      createdAt: new Date().toISOString()
    }));
  });

  const [recipeName, setRecipeName] = useState<string>("Coxinhas de Frango com Catupiry (Fornada 80 Unidades)");
  const [yieldQty, setYieldQty] = useState<number>(80);
  const [yieldUnit, setYieldUnit] = useState<string>("coxinhas");
  const [category, setCategory] = useState<string>("Salgados");
  const [extraCostsPct, setExtraCostsPct] = useState<number>(15);
  const [packagingCostPerUnit, setPackagingCostPerUnit] = useState<number>(0.15);
  const [targetMarginPct, setTargetMarginPct] = useState<number>(65);
  const [sellingPrice, setSellingPrice] = useState<number>(3.50);
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(PRESET_RECIPES[0].ingredients);

  // Unit conversion helper
  const toBaseValue = (qty: number, unit: "kg" | "g" | "L" | "ml" | "un"): { val: number; base: "g" | "ml" | "un" } => {
    switch (unit) {
      case "kg":
        return { val: qty * 1000, base: "g" };
      case "g":
        return { val: qty, base: "g" };
      case "L":
        return { val: qty * 1000, base: "ml" };
      case "ml":
        return { val: qty, base: "ml" };
      case "un":
      default:
        return { val: qty, base: "un" };
    }
  };

  // Calculate single ingredient cost
  const calcIngredientCost = (ing: RecipeIngredient): number => {
    if (!ing.packageCost || ing.packageCost <= 0) return 0;
    const pkg = toBaseValue(ing.packageQty || 1, ing.packageUnit);
    const used = toBaseValue(ing.usedQty || 0, ing.usedUnit);
    if (pkg.val <= 0) return 0;
    const costPerBaseUnit = ing.packageCost / pkg.val;
    return costPerBaseUnit * used.val;
  };

  // Recipe totals
  const totals = useMemo(() => {
    const validYield = Math.max(1, yieldQty || 1);
    const ingredientsCost = ingredients.reduce((acc, ing) => acc + calcIngredientCost(ing), 0);
    const extraCostsAmount = ingredientsCost * ((extraCostsPct || 0) / 100);
    const packagingTotal = (packagingCostPerUnit || 0) * validYield;
    const totalRecipeCost = ingredientsCost + extraCostsAmount + packagingTotal;
    const unitCost = totalRecipeCost / validYield;
    const centoCost = unitCost * 100;

    let totalWeightGrams = 0;
    ingredients.forEach((ing) => {
      const base = toBaseValue(ing.usedQty, ing.usedUnit);
      if (base.base === "g" || base.base === "ml") {
        totalWeightGrams += base.val;
      }
    });
    const gramsPerUnit = totalWeightGrams > 0 ? totalWeightGrams / validYield : 0;

    const marginDec = Math.min(0.95, Math.max(0.01, (targetMarginPct || 50) / 100));
    const suggestedPrice = unitCost / (1 - marginDec);

    const currentPrice = sellingPrice || 0;
    const profitPerUnit = currentPrice - unitCost;
    const currentMarginPct = currentPrice > 0 ? (profitPerUnit / currentPrice) * 100 : 0;
    const currentMarkupPct = unitCost > 0 ? (profitPerUnit / unitCost) * 100 : 0;

    const batchRevenue = currentPrice * validYield;
    const batchProfit = batchRevenue - totalRecipeCost;
    const centoRevenue = currentPrice * 100;
    const centoProfit = centoRevenue - centoCost;

    return {
      validYield,
      ingredientsCost,
      extraCostsAmount,
      packagingTotal,
      totalRecipeCost,
      unitCost,
      centoCost,
      totalWeightGrams,
      gramsPerUnit,
      suggestedPrice,
      currentPrice,
      profitPerUnit,
      currentMarginPct,
      currentMarkupPct,
      batchRevenue,
      batchProfit,
      centoRevenue,
      centoProfit
    };
  }, [ingredients, yieldQty, extraCostsPct, packagingCostPerUnit, targetMarginPct, sellingPrice]);

  // Persist recipes
  useEffect(() => {
    try {
      localStorage.setItem("pdv_ficha_tecnica_recipes", JSON.stringify(savedRecipes));
    } catch (_) {}
  }, [savedRecipes]);

  const handleAddIngredient = () => {
    const newIng: RecipeIngredient = {
      id: `ing_${Date.now()}`,
      name: "",
      packageQty: 1,
      packageUnit: "kg",
      packageCost: 0,
      usedQty: 100,
      usedUnit: "g"
    };
    setIngredients([...ingredients, newIng]);
  };

  const handleUpdateIngredient = (id: string, field: keyof RecipeIngredient, value: any) => {
    setIngredients(
      ingredients.map((item) => {
        if (item.id !== id) return item;
        return { ...item, [field]: value };
      })
    );
  };

  const handleRemoveIngredient = (id: string) => {
    if (ingredients.length <= 1) {
      showNotification("A receita precisa de pelo menos 1 ingrediente! ⚠️", "warning");
      return;
    }
    setIngredients(ingredients.filter((item) => item.id !== id));
  };

  const handleLoadRecipePreset = (preset: Omit<SavedRecipe, "id" | "createdAt">) => {
    setRecipeName(preset.name);
    setYieldQty(preset.yieldQty);
    setYieldUnit(preset.yieldUnit);
    setCategory(preset.category);
    setExtraCostsPct(preset.extraCostsPct);
    setPackagingCostPerUnit(preset.packagingCostPerUnit);
    setTargetMarginPct(preset.targetMarginPct);
    setSellingPrice(preset.sellingPrice);
    setIngredients(preset.ingredients.map((ing, i) => ({ ...ing, id: `preset_${Date.now()}_${i}` })));
    showNotification(`Receita "${preset.name}" carregada com sucesso! 🥟✨`, "success");
  };

  const handleSaveRecipe = () => {
    if (!recipeName.trim()) {
      showNotification("Informe um nome para a receita antes de salvar! 📝", "warning");
      return;
    }
    const newRecipe: SavedRecipe = {
      id: `recipe_${Date.now()}`,
      name: recipeName.trim(),
      yieldQty,
      yieldUnit,
      category,
      ingredients,
      extraCostsPct,
      packagingCostPerUnit,
      targetMarginPct,
      sellingPrice,
      createdAt: new Date().toISOString()
    };
    setSavedRecipes([newRecipe, ...savedRecipes.filter((r) => r.name.toLowerCase() !== recipeName.trim().toLowerCase())]);
    showNotification(`Ficha Técnica de "${recipeName}" salva com sucesso! 💾✅`, "success");
  };

  const handleShareRecipeWhatsApp = () => {
    let msg = `*📋 FICHA TÉCNICA & CUSTO DE PRODUÇÃO*\n`;
    msg += `-----------------------------------------------\n`;
    msg += `🍲 *Produto/Receita:* ${recipeName.toUpperCase()}\n`;
    msg += `📦 *Rendimento da Fornada:* ${yieldQty} ${yieldUnit}\n`;
    if (totals.gramsPerUnit > 0) {
      msg += `⚖️ *Gramatura média por ${yieldUnit.replace(/s$/, "")}:* ~${totals.gramsPerUnit.toFixed(1)}g\n`;
    }
    msg += `-----------------------------------------------\n`;
    msg += `*🛒 INGREDIENTES & PROPORÇÕES:*\n`;

    ingredients.forEach((ing, i) => {
      const cost = calcIngredientCost(ing);
      const usedBase = toBaseValue(ing.usedQty, ing.usedUnit);
      const pkgBase = toBaseValue(ing.packageQty, ing.packageUnit);
      const perUnitBase = usedBase.val / Math.max(1, yieldQty);
      const costPerUnit = cost / Math.max(1, yieldQty);
      const leftover = Math.max(0, pkgBase.val - usedBase.val);

      msg += `${i + 1}. *${ing.name || "Ingrediente"}*\n`;
      msg += `   • Comprou no pacote: ${ing.packageQty}${ing.packageUnit} por ${formatCurrency(ing.packageCost)}\n`;
      msg += `   • Usou na receita: ${ing.usedQty}${ing.usedUnit} = *${formatCurrency(cost)}*\n`;
      msg += `   • Em cada ${yieldUnit.replace(/s$/, "")}: *${perUnitBase.toFixed(1)}${usedBase.base}* (${formatCurrency(costPerUnit)})\n`;
      if (leftover > 0 && pkgBase.base === usedBase.base) {
        msg += `   • Sobra no armário: ${leftover >= 1000 ? (leftover / 1000).toFixed(2) + "kg" : leftover.toFixed(0) + "g"}\n`;
      }
    });

    msg += `-----------------------------------------------\n`;
    msg += `*📊 RESUMO FINANCEIRO DA FORNADA:*\n`;
    msg += `• Total dos Ingredientes: ${formatCurrency(totals.ingredientsCost)}\n`;
    msg += `• Gás/Energia rateada (${extraCostsPct}%): ${formatCurrency(totals.extraCostsAmount)}\n`;
    msg += `• Embalagens (${yieldQty}x ${formatCurrency(packagingCostPerUnit)}): ${formatCurrency(totals.packagingTotal)}\n`;
    msg += `• *Custo Total da Fornada:* ${formatCurrency(totals.totalRecipeCost)}\n`;
    msg += `\n`;
    msg += `🎯 *CUSTO POR UNIDADE:* ${formatCurrency(totals.unitCost)}\n`;
    msg += `🏷️ *Preço de Venda Praticado:* ${formatCurrency(totals.currentPrice)}\n`;
    msg += `💵 *Lucro Líquido por Unidade:* ${formatCurrency(totals.profitPerUnit)} (${totals.currentMarginPct.toFixed(1)}% margem)\n`;
    msg += `💰 *Lucro Líquido Fornada:* ${formatCurrency(totals.batchProfit)}\n`;
    msg += `📦 *Custo do Cento (100 un):* ${formatCurrency(totals.centoCost)} | *Lucro Cento:* ${formatCurrency(totals.centoProfit)}\n`;
    msg += `-----------------------------------------------\n`;
    msg += `📱 _Calculado pelo Frente de Caixa Inteligente!_`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
    showNotification("Ficha técnica copiada para o WhatsApp! 📲✨", "success");
  };

  const handleApplyRecipeToCatalog = () => {
    if (onApplyToPDVCatalog) {
      onApplyToPDVCatalog({
        name: recipeName,
        costPrice: totals.unitCost,
        salePrice: totals.currentPrice,
        category: category || "Alimentos"
      });
    }
  };

  // ==========================================
  // MODE 2: BULK & ANIMAL FEED RESALE STATE (Rações, Aviário, etc.)
  // ==========================================
  const [bulkItem, setBulkItem] = useState<BulkSimulation>({
    name: "Saco de Ração Cães Adultos 20kg",
    packageWeight: 20,
    packageCost: 200.00,
    sellPricePerKg: 14.90,
    desiredMarginPct: 35,
    bagCostPerKg: 0.15,
    wastePct: 1.0,
    category: "Rações a Granel (kg)"
  });

  const bulkTotals = useMemo(() => {
    const weight = Math.max(0.1, bulkItem.packageWeight || 1);
    const wasteRatio = Math.max(0, Math.min(20, bulkItem.wastePct || 0)) / 100;
    const usableWeight = weight * (1 - wasteRatio);

    const costPerKg = (bulkItem.packageCost || 0) / weight;
    const totalBagCosts = usableWeight * (bulkItem.bagCostPerKg || 0);
    const totalCostWithBags = (bulkItem.packageCost || 0) + totalBagCosts;
    const costPerKgTotal = usableWeight > 0 ? totalCostWithBags / usableWeight : costPerKg;

    // Suggested price based on desired margin: Price = Cost / (1 - Margin%)
    const marginDec = Math.min(0.95, Math.max(0.01, (bulkItem.desiredMarginPct || 35) / 100));
    const suggestedPricePerKg = costPerKgTotal / (1 - marginDec);

    // Actual revenue and profit with current price
    const currentPriceKg = bulkItem.sellPricePerKg || 0;
    const totalRevenue = usableWeight * currentPriceKg;
    const netProfit = totalRevenue - totalCostWithBags;
    const profitPerKg = currentPriceKg - costPerKgTotal;
    const marginPct = currentPriceKg > 0 ? (profitPerKg / currentPriceKg) * 100 : 0;
    const markupPct = costPerKgTotal > 0 ? (profitPerKg / costPerKgTotal) * 100 : 0;

    // Yield counts in various packaging sizes
    const salesOf1Kg = usableWeight;
    const salesOf500g = usableWeight / 0.5;
    const salesOf2Kg = usableWeight / 2;
    const salesOf5Kg = usableWeight / 5;

    // Dynamic price simulation table (-20%, -10%, current, +10%, +20%)
    const priceTableSteps = [
      Math.max(1, currentPriceKg * 0.85),
      Math.max(1, currentPriceKg * 0.95),
      currentPriceKg,
      currentPriceKg * 1.10,
      currentPriceKg * 1.25
    ];

    const priceSimulation = priceTableSteps.map((p) => {
      const rev = usableWeight * p;
      const prof = rev - totalCostWithBags;
      const marg = rev > 0 ? (prof / rev) * 100 : 0;
      return { price: p, revenue: rev, profit: prof, margin: marg };
    });

    return {
      weight,
      usableWeight,
      costPerKg,
      costPerKgTotal,
      suggestedPricePerKg,
      totalRevenue,
      netProfit,
      profitPerKg,
      marginPct,
      markupPct,
      salesOf1Kg,
      salesOf500g,
      salesOf2Kg,
      salesOf5Kg,
      priceSimulation
    };
  }, [bulkItem]);

  const handleLoadBulkPreset = (preset: BulkSimulation) => {
    setBulkItem({ ...preset });
    showNotification(`Simulação de "${preset.name}" carregada! 🌾🐾`, "success");
  };

  const handleShareBulkWhatsApp = () => {
    let msg = `*🐾 SIMULAÇÃO DE VENDA A GRANEL / RAÇÃO*\n`;
    msg += `-----------------------------------------------\n`;
    msg += `📦 *Produto Comprado:* ${bulkItem.name.toUpperCase()}\n`;
    msg += `⚖️ *Peso do Saco/Fardo:* ${bulkItem.packageWeight} kg\n`;
    msg += `💰 *Custo do Saco Fechado:* ${formatCurrency(bulkItem.packageCost)}\n`;
    msg += `💵 *Custo Real por Kg:* ${formatCurrency(bulkTotals.costPerKg)} / kg\n`;
    if (bulkItem.wastePct > 0) {
      msg += `📉 *Quebra/Farelo estimado:* ${bulkItem.wastePct}% (~${(bulkTotals.weight - bulkTotals.usableWeight).toFixed(2)} kg)\n`;
    }
    msg += `-----------------------------------------------\n`;
    msg += `*🏷️ RESULTADO DE PRECIFICAÇÃO NO BALCÃO:*\n`;
    msg += `• *Preço de Venda Praticado:* ${formatCurrency(bulkItem.sellPricePerKg)} / kg\n`;
    msg += `• *Preço Sugerido (${bulkItem.desiredMarginPct}% margem):* ${formatCurrency(bulkTotals.suggestedPricePerKg)} / kg\n`;
    msg += `• *Lucro Líquido por Kg Vendido:* ${formatCurrency(bulkTotals.profitPerKg)} (${bulkTotals.marginPct.toFixed(1)}% margem)\n`;
    msg += `\n`;
    msg += `*🎯 RENDIMENTO & LUCRO DO SACO INTEIRO:*\n`;
    msg += `• Rende *${bulkTotals.salesOf1Kg.toFixed(0)} vendas* de 1 kg\n`;
    msg += `• Rende *${bulkTotals.salesOf500g.toFixed(0)} saquinhos* de 500g\n`;
    msg += `• Rende *${bulkTotals.salesOf2Kg.toFixed(1)} porções* de 2 kg\n`;
    msg += `\n`;
    msg += `💰 *Faturamento Total do Saco:* ${formatCurrency(bulkTotals.totalRevenue)}\n`;
    msg += `💵 *LUCRO LÍQUIDO NO SEU BOLSO:* *+${formatCurrency(bulkTotals.netProfit)}* por saco!\n`;
    msg += `-----------------------------------------------\n`;
    msg += `📱 _Calculado pelo Frente de Caixa Inteligente!_`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
    showNotification("Análise de fracionamento copiada para o WhatsApp! 📲✨", "success");
  };

  const handleApplyBulkToCatalog = () => {
    if (onApplyToPDVCatalog) {
      onApplyToPDVCatalog({
        name: `${bulkItem.name.replace(/(\d+kg)/i, "").trim()} a Granel (kg)`,
        costPrice: bulkTotals.costPerKgTotal,
        salePrice: bulkItem.sellPricePerKg,
        category: bulkItem.category || "Rações a Granel (kg)"
      });
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-250 text-left">
      {/* TOP TABS: RECEITAS VS GRANEL */}
      <div className="bg-slate-950/80 border border-white/10 rounded-2xl p-2 sm:p-2.5 flex items-center justify-between gap-2 shadow-xl">
        <div className="flex items-center gap-2 flex-1">
          <button
            type="button"
            id="btn-tab-mode-receitas"
            onClick={() => setCalculatorMode("receitas")}
            className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
              calculatorMode === "receitas"
                ? "bg-purple-600 text-white shadow-lg shadow-purple-500/25 border border-purple-400/40"
                : "text-slate-400 hover:text-white hover:bg-white/[0.03]"
            }`}
          >
            <ChefHat className="w-4 h-4" />
            <span>Ficha Técnica & Receitas (Coxinhas, Lanches, Doces)</span>
          </button>

          <button
            type="button"
            id="btn-tab-mode-granel"
            onClick={() => setCalculatorMode("granel")}
            className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
              calculatorMode === "granel"
                ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25 border border-amber-300 font-black"
                : "text-slate-400 hover:text-white hover:bg-white/[0.03]"
            }`}
          >
            <Dog className="w-4 h-4" />
            <span>Venda a Granel / Rações & Aviário 🌾🐾</span>
          </button>
        </div>

        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition-all border border-white/10 cursor-pointer hidden md:flex items-center gap-1.5"
          >
            <span>Voltar ao Caixa</span>
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: RECIPES / PRODUCTION COSTING (Coxinhas, Salgados, X-Tudo, etc.) */}
      {/* ========================================================================= */}
      {calculatorMode === "receitas" && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* HEADER CARD */}
          <div className="bg-gradient-to-r from-purple-950/70 via-slate-900 to-slate-950 border border-purple-500/20 rounded-2xl p-4 sm:p-5 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-600 text-white rounded-xl shadow-lg shadow-purple-500/20 shrink-0">
                  <ChefHat className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9.5px] font-black uppercase text-purple-400 tracking-wider">
                      Diferencial Exclusivo
                    </span>
                    <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-[8.5px] font-black uppercase rounded-full border border-purple-500/30">
                      Gramas, Quilos & Rendimento
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2 mt-0.5">
                    Ficha Técnica de Receitas, Salgados & Produção
                  </h3>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleShareRecipeWhatsApp}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-[10px] uppercase tracking-wider rounded-xl transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/15"
                  title="Compartilhar Ficha Técnica detalhada no WhatsApp"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Enviar no WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveRecipe}
                  className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-md shadow-purple-500/20"
                  title="Salvar esta receita na memória do aplicativo"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar Receita</span>
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-300 font-medium leading-relaxed mt-2.5">
              Descubra o <strong>custo exato de cada ingrediente</strong> usado na sua produção! Informe quanto pagou no pacote fechado no atacado (ex: comprou 1 kg de farinha por R$ 5,50) e quanto gastou na massa (ex: gastou 800g para fazer 80 coxinhas). O sistema calcula os gramas por coxinha, a sobra no pacote, o gás rateado e o preço de venda ideal com margem líquida real.
            </p>

            {/* PRESET SHORTCUTS */}
            <div className="mt-3.5 pt-3 border-t border-white/5">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-2">
                ⚡ Carregar Exemplos Prontos com 1 Toque:
              </span>
              <div className="flex flex-wrap gap-2">
                {PRESET_RECIPES.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleLoadRecipePreset(preset)}
                    className="px-2.5 py-1.5 bg-slate-900/90 hover:bg-purple-900/40 border border-white/10 hover:border-purple-500/40 text-slate-300 hover:text-white rounded-xl text-[10px] font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>
                      {preset.category === "Salgados"
                        ? "🥟"
                        : preset.category === "Doces"
                        ? "🍰"
                        : preset.category === "Pizzas"
                        ? "🍕"
                        : preset.category === "Lanches"
                        ? "🍔"
                        : preset.category === "Porções"
                        ? "🍟"
                        : "🍱"}
                    </span>
                    <span>{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* RECIPE GENERAL METRICS FORM */}
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4">
            <h4 className="text-xs font-black uppercase text-purple-400 flex items-center gap-1.5 border-b border-white/5 pb-2">
              <ChefHat className="w-4 h-4" />
              1. Dados da Receita & Rendimento da Fornada
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
              <div className="sm:col-span-6 space-y-1">
                <label className="text-[9.5px] font-black text-slate-300 uppercase">
                  Nome do Produto / Salgado / Lanche / Prato:
                </label>
                <input
                  type="text"
                  value={recipeName}
                  onChange={(e) => setRecipeName(e.target.value)}
                  placeholder="Ex: Coxinha de Frango Catupiry"
                  className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-white font-bold outline-none focus:border-purple-500 transition-all uppercase"
                />
              </div>

              <div className="sm:col-span-3 space-y-1">
                <label className="text-[9.5px] font-black text-purple-400 uppercase">
                  Rendimento da Fornada:
                </label>
                <input
                  type="number"
                  min="1"
                  value={yieldQty}
                  onChange={(e) => setYieldQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full bg-slate-950 border border-purple-500/30 rounded-xl px-3 py-2 text-white font-mono font-black text-center outline-none focus:border-purple-500"
                />
              </div>

              <div className="sm:col-span-3 space-y-1">
                <label className="text-[9.5px] font-black text-slate-400 uppercase">
                  Tipo de Unidade:
                </label>
                <select
                  value={yieldUnit}
                  onChange={(e) => setYieldUnit(e.target.value)}
                  className="w-full bg-slate-950 border border-white/15 rounded-xl px-2.5 py-2 text-slate-200 font-bold outline-none cursor-pointer"
                >
                  <option value="coxinhas">coxinhas</option>
                  <option value="salgados">salgadinhos de festa</option>
                  <option value="lanches">lanches / hambúrgueres</option>
                  <option value="fatias">fatias de pizza/bolo</option>
                  <option value="porções">porções / barcas</option>
                  <option value="marmitas">marmitas / pensão</option>
                  <option value="brigadeiros">brigadeiros / doces</option>
                  <option value="unidades">unidades</option>
                </select>
              </div>
            </div>
          </div>

          {/* BALANÇA DIGITAL: AJUSTE DE PESAGEM (MASSA VS RECHEIO) */}
          <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-purple-950/40 border-2 border-emerald-500/30 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                  <Scale className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black uppercase text-white flex items-center gap-1.5">
                    <span>Balança Digital: Pesar Massa & Recheio com Precisão ⚖️</span>
                  </h4>
                  <p className="text-[10px] text-slate-300">
                    Coloque a massa ou o recheio na balança e digite os gramas exatos para mini, média ou grande coxinha.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    // Mini coxinha: ~15g massa, ~5g recheio
                    setIngredients(prev => prev.map(ing => {
                      const lower = ing.name.toLowerCase();
                      if (lower.includes("massa") || lower.includes("farinha") || lower.includes("trigo")) {
                        return { ...ing, usedQty: Math.round(yieldQty * 15), usedUnit: "g" };
                      }
                      if (lower.includes("recheio") || lower.includes("frango") || lower.includes("carne") || lower.includes("queijo")) {
                        return { ...ing, usedQty: Math.round(yieldQty * 5), usedUnit: "g" };
                      }
                      return ing;
                    }));
                    showNotification("Proporções calibradas para Mini Coxinhas de Festa (20g total: 15g massa + 5g recheio)! ⚖️🥟", "success");
                  }}
                  className="px-2.5 py-1.5 bg-slate-900 hover:bg-emerald-900/40 border border-emerald-500/30 text-emerald-300 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                >
                  🥟 Mini Festa (20g)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    // Média: ~50g massa, ~20g recheio
                    setIngredients(prev => prev.map(ing => {
                      const lower = ing.name.toLowerCase();
                      if (lower.includes("massa") || lower.includes("farinha") || lower.includes("trigo")) {
                        return { ...ing, usedQty: Math.round(yieldQty * 50), usedUnit: "g" };
                      }
                      if (lower.includes("recheio") || lower.includes("frango") || lower.includes("carne") || lower.includes("queijo")) {
                        return { ...ing, usedQty: Math.round(yieldQty * 20), usedUnit: "g" };
                      }
                      return ing;
                    }));
                    showNotification("Proporções calibradas para Coxinha Média / Bar (70g total: 50g massa + 20g recheio)! ⚖️🥟", "success");
                  }}
                  className="px-2.5 py-1.5 bg-slate-900 hover:bg-emerald-900/40 border border-emerald-500/30 text-emerald-300 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                >
                  🥟 Média Bar (70g)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    // Grande: ~110g massa, ~40g recheio
                    setIngredients(prev => prev.map(ing => {
                      const lower = ing.name.toLowerCase();
                      if (lower.includes("massa") || lower.includes("farinha") || lower.includes("trigo")) {
                        return { ...ing, usedQty: Math.round(yieldQty * 110), usedUnit: "g" };
                      }
                      if (lower.includes("recheio") || lower.includes("frango") || lower.includes("carne") || lower.includes("queijo")) {
                        return { ...ing, usedQty: Math.round(yieldQty * 40), usedUnit: "g" };
                      }
                      return ing;
                    }));
                    showNotification("Proporções calibradas para Coxinha Grande de Lanchonete (150g total: 110g massa + 40g recheio)! ⚖️🥟", "success");
                  }}
                  className="px-2.5 py-1.5 bg-slate-900 hover:bg-emerald-900/40 border border-emerald-500/30 text-emerald-300 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                >
                  🥟 Grande Lanche (150g)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
              <div className="bg-slate-950/70 p-3 rounded-xl border border-white/5">
                <span className="text-[9px] font-black uppercase text-slate-400 block">Peso Total Médio do Salgado/Porção</span>
                <span className="text-sm sm:text-base font-black text-emerald-400 font-mono">
                  {totals.gramsPerUnit.toFixed(1)} gramas (g)
                </span>
                <span className="text-[8px] text-slate-500 block mt-0.5">Calculado a partir de todos os insumos</span>
              </div>

              <div className="bg-slate-950/70 p-3 rounded-xl border border-white/5">
                <span className="text-[9px] font-black uppercase text-slate-400 block">Custo de Produção por Grama</span>
                <span className="text-sm sm:text-base font-black text-white font-mono">
                  {totals.totalWeightGrams > 0 ? formatCurrency(totals.totalRecipeCost / totals.totalWeightGrams) : "R$ 0,00"}/g
                </span>
                <span className="text-[8px] text-slate-500 block mt-0.5">
                  ({totals.totalWeightGrams > 0 ? formatCurrency((totals.totalRecipeCost / totals.totalWeightGrams) * 1000) : "R$ 0,00"}/kg)
                </span>
              </div>

              <div className="bg-slate-950/70 p-3 rounded-xl border border-white/5">
                <span className="text-[9px] font-black uppercase text-slate-400 block">Custo Unitário Final da Coxinha</span>
                <span className="text-sm sm:text-base font-black text-amber-400 font-mono">
                  {formatCurrency(totals.unitCost)}
                </span>
                <span className="text-[8px] text-slate-500 block mt-0.5">Insumos + Gás/Óleo + Embalagem</span>
              </div>
            </div>
          </div>

          {/* INGREDIENTS DYNAMIC TABLE */}
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2.5">
              <div>
                <span className="text-[9.5px] font-black uppercase text-purple-400 tracking-wider">
                  Tabela de Proporções & Custos
                </span>
                <h4 className="text-xs sm:text-sm font-black uppercase text-white mt-0.5 flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-purple-400" />
                  2. Ingredientes Comprados vs. Quantidade Usada na Receita
                </h4>
              </div>
              <button
                type="button"
                onClick={handleAddIngredient}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer shadow-md"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar Ingrediente
              </button>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
              Preencha abaixo quanto você pagou na embalagem no mercado (ex: comprou 1 kg de farinha por R$ 5,50) e quanto você realmente pesou na receita (ex: 800g para 80 coxinhas). O sistema divide automaticamente e calcula o custo por coxinha, mostrando também a sobra no pacote!
            </p>

            {/* INGREDIENT ROWS */}
            <div className="space-y-2.5 pt-1">
              {ingredients.map((ing, idx) => {
                const cost = calcIngredientCost(ing);
                const baseUsed = toBaseValue(ing.usedQty, ing.usedUnit);
                const basePkg = toBaseValue(ing.packageQty, ing.packageUnit);
                const perUnitGrams = baseUsed.val / Math.max(1, yieldQty);
                const perUnitCost = cost / Math.max(1, yieldQty);
                const leftover = Math.max(0, basePkg.val - baseUsed.val);

                return (
                  <div
                    key={ing.id}
                    className="bg-slate-950/80 border border-white/10 hover:border-purple-500/30 rounded-xl p-3 sm:p-3.5 transition-all space-y-2"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                      {/* Ingredient Name */}
                      <div className="sm:col-span-4 space-y-0.5">
                        <label className="text-[8px] font-black text-slate-400 uppercase">
                          #{idx + 1} Nome do Ingrediente
                        </label>
                        <input
                          type="text"
                          value={ing.name}
                          onChange={(e) => handleUpdateIngredient(ing.id, "name", e.target.value)}
                          placeholder="Ex: Peito de Frango, Farinha de Trigo..."
                          className="w-full bg-slate-900 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold outline-none focus:border-purple-500"
                        />
                      </div>

                      {/* Package Qty & Unit */}
                      <div className="sm:col-span-3 space-y-0.5">
                        <label className="text-[8px] font-black text-slate-400 uppercase">
                          Comprou no Pacote (Mercado)
                        </label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={ing.packageQty}
                            onChange={(e) =>
                              handleUpdateIngredient(ing.id, "packageQty", parseFloat(e.target.value) || 0)
                            }
                            className="w-20 bg-slate-900 border border-white/15 rounded-lg px-2 py-1.5 text-xs font-mono font-bold text-white text-center outline-none"
                          />
                          <select
                            value={ing.packageUnit}
                            onChange={(e) => handleUpdateIngredient(ing.id, "packageUnit", e.target.value as any)}
                            className="bg-slate-900 border border-white/15 rounded-lg px-1.5 py-1.5 text-[11px] font-bold text-slate-300 outline-none cursor-pointer"
                          >
                            <option value="kg">kg</option>
                            <option value="g">g</option>
                            <option value="L">Litro</option>
                            <option value="ml">ml</option>
                            <option value="un">unid</option>
                          </select>
                          <div className="relative flex-1">
                            <span className="absolute left-1.5 top-1.5 text-[9px] text-slate-400 font-bold">R$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={ing.packageCost}
                              onChange={(e) =>
                                handleUpdateIngredient(ing.id, "packageCost", parseFloat(e.target.value) || 0)
                              }
                              className="w-full bg-slate-900 border border-white/15 rounded-lg pl-6 pr-1.5 py-1.5 text-xs font-mono font-bold text-emerald-400 text-right outline-none"
                              placeholder="0,00"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Quantity Used in Recipe */}
                      <div className="sm:col-span-3 space-y-0.5">
                        <label className="text-[8px] font-black text-purple-400 uppercase flex items-center justify-between">
                          <span>Gastou na Receita (Balança)</span>
                          <span className="text-[7.5px] text-slate-400">⚖️ {perUnitGrams.toFixed(1)}g/{yieldUnit}</span>
                        </label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={ing.usedQty}
                            onChange={(e) =>
                              handleUpdateIngredient(ing.id, "usedQty", parseFloat(e.target.value) || 0)
                            }
                            className="w-24 bg-slate-900 border border-purple-500/40 rounded-lg px-2 py-1.5 text-xs font-mono font-bold text-white text-center outline-none focus:border-purple-500"
                          />
                          <select
                            value={ing.usedUnit}
                            onChange={(e) => handleUpdateIngredient(ing.id, "usedUnit", e.target.value as any)}
                            className="bg-slate-900 border border-white/15 rounded-lg px-2 py-1.5 text-[11px] font-bold text-purple-300 outline-none cursor-pointer"
                          >
                            <option value="g">gramas (g)</option>
                            <option value="kg">quilos (kg)</option>
                            <option value="ml">ml</option>
                            <option value="L">litros (L)</option>
                            <option value="un">unidades</option>
                          </select>
                        </div>
                        {/* Quick Scale Weigh Buttons */}
                        <div className="flex items-center gap-1 pt-1">
                          <button
                            type="button"
                            onClick={() => handleUpdateIngredient(ing.id, "usedQty", Math.max(0, Number((ing.usedQty - 10).toFixed(1))))}
                            className="px-1.5 py-0.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded text-[8.5px] font-mono border border-white/5 cursor-pointer"
                            title="Diminuir 10g na balança"
                          >
                            -10
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateIngredient(ing.id, "usedQty", Number((ing.usedQty + 10).toFixed(1)))}
                            className="px-1.5 py-0.5 bg-slate-900 hover:bg-purple-950/60 text-purple-300 hover:text-white rounded text-[8.5px] font-mono border border-purple-500/20 cursor-pointer"
                            title="Aumentar 10g na balança"
                          >
                            +10
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateIngredient(ing.id, "usedQty", Number((ing.usedQty + 50).toFixed(1)))}
                            className="px-1.5 py-0.5 bg-slate-900 hover:bg-purple-950/60 text-purple-300 hover:text-white rounded text-[8.5px] font-mono border border-purple-500/20 cursor-pointer"
                            title="Aumentar 50g na balança"
                          >
                            +50
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateIngredient(ing.id, "usedQty", Number((ing.usedQty + 100).toFixed(1)))}
                            className="px-1.5 py-0.5 bg-slate-900 hover:bg-purple-950/60 text-purple-300 hover:text-white rounded text-[8.5px] font-mono border border-purple-500/20 cursor-pointer"
                            title="Aumentar 100g na balança"
                          >
                            +100
                          </button>
                        </div>
                      </div>

                      {/* Cost Output & Remove */}
                      <div className="sm:col-span-2 flex items-center justify-between sm:justify-end gap-2 pt-1 sm:pt-0">
                        <div className="text-right">
                          <span className="text-[7.5px] font-black text-slate-500 uppercase block">
                            Custo Usado
                          </span>
                          <span className="text-xs sm:text-sm font-black text-emerald-400 font-mono">
                            {formatCurrency(cost)}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveIngredient(ing.id)}
                          className="p-1.5 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                          title="Excluir ingrediente"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Micro metrics per individual item & leftover */}
                    <div className="bg-slate-900/60 rounded-lg px-2.5 py-1.5 flex flex-wrap items-center justify-between gap-2 text-[9px] text-slate-400 border border-white/5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500">Cada 1 {yieldUnit.replace(/s$/, "")} leva:</span>
                        <strong className="text-purple-300 font-mono">
                          {perUnitGrams >= 1000
                            ? `${(perUnitGrams / 1000).toFixed(2)} kg`
                            : `${perUnitGrams.toFixed(1)} ${baseUsed.base}`}
                        </strong>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500">Custo deste item em cada {yieldUnit.replace(/s$/, "")}:</span>
                        <strong className="text-emerald-400 font-mono">{formatCurrency(perUnitCost)}</strong>
                      </div>

                      {basePkg.base === baseUsed.base && leftover > 0 && (
                        <div className="flex items-center gap-1 text-[8.5px] text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                          <span>Sobra no pacote:</span>
                          <strong>
                            {leftover >= 1000
                              ? `${(leftover / 1000).toFixed(2)} kg`
                              : `${leftover.toFixed(0)} g`}
                          </strong>
                          <span>para a próxima fornada</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* OPERATIONAL COSTS & PACKAGING */}
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-3">
            <h4 className="text-xs font-black uppercase text-purple-400 flex items-center gap-1.5 border-b border-white/5 pb-2">
              <Flame className="w-4 h-4 text-amber-400" />
              3. Custos Invisíveis & Embalagens (Gás, Luz, Caixas)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-950 p-3.5 rounded-xl border border-white/5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[9.5px] font-black text-amber-400 uppercase">
                    🔥 Gás, Energia & Água (% sobre ingredientes):
                  </label>
                  <span className="text-xs font-mono font-bold text-amber-400">{extraCostsPct}%</span>
                </div>
                <p className="text-[9px] text-slate-400 leading-normal">
                  A chama do fogão e a eletricidade da batedeira não são de graça! Taxa padrão de 10% a 20% para cobrir o botijão de gás.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="range"
                    min="0"
                    max="40"
                    step="1"
                    value={extraCostsPct}
                    onChange={(e) => setExtraCostsPct(parseInt(e.target.value, 10) || 0)}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <span className="text-xs font-black font-mono text-white shrink-0">
                    +{formatCurrency(totals.extraCostsAmount)}
                  </span>
                </div>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-white/5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[9.5px] font-black text-sky-400 uppercase">
                    📦 Embalagem / Saquinho / Forminha (R$ por unidade):
                  </label>
                  <span className="text-xs font-mono font-bold text-sky-400">
                    {formatCurrency(packagingCostPerUnit)} / un
                  </span>
                </div>
                <p className="text-[9px] text-slate-400 leading-normal">
                  Papel acoplado, guardanapo, saquinho de entrega ou caixinha térmica.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <div className="relative w-full">
                    <span className="absolute left-2.5 top-2 text-xs text-slate-400 font-bold">R$</span>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      value={packagingCostPerUnit}
                      onChange={(e) => setPackagingCostPerUnit(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-white/15 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white font-mono font-bold outline-none"
                    />
                  </div>
                  <span className="text-xs font-black font-mono text-white shrink-0">
                    Total: {formatCurrency(totals.packagingTotal)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* FINAL RESULT & PROFIT SIMULATOR */}
          <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-purple-950/40 border-2 border-purple-500/30 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div>
                <span className="text-[9.5px] font-black uppercase text-purple-400 tracking-wider">
                  Diagnóstico de Lucratividade
                </span>
                <h4 className="text-sm sm:text-base font-black uppercase text-white mt-0.5 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  4. Custo Real da Receita & Preço de Venda Sugerido
                </h4>
              </div>

              <div className="bg-purple-900/40 border border-purple-500/30 px-3 py-1.5 rounded-xl text-center">
                <span className="text-[8px] font-black text-purple-300 uppercase block">Custo Unitário da Coxinha/Lanche</span>
                <span className="text-base sm:text-lg font-black text-white font-mono">
                  {formatCurrency(totals.unitCost)}
                </span>
              </div>
            </div>

            {/* 4 CARDS OF FINANCIAL STATS */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-900 p-3 rounded-xl border border-white/10 text-center">
                <span className="text-[8.5px] font-black text-slate-400 uppercase block">Custo Total Fornada</span>
                <p className="text-sm sm:text-base font-black text-white font-mono mt-1">
                  {formatCurrency(totals.totalRecipeCost)}
                </p>
                <span className="text-[8px] text-slate-500 block mt-0.5">({yieldQty} {yieldUnit})</span>
              </div>

              <div className="bg-slate-900 p-3 rounded-xl border border-white/10 text-center">
                <span className="text-[8.5px] font-black text-slate-400 uppercase block">Custo do Cento (100 un)</span>
                <p className="text-sm sm:text-base font-black text-amber-400 font-mono mt-1">
                  {formatCurrency(totals.centoCost)}
                </p>
                <span className="text-[8px] text-slate-500 block mt-0.5">Para encomendas de festas</span>
              </div>

              <div className="bg-slate-900 p-3 rounded-xl border border-white/10 text-center">
                <span className="text-[8.5px] font-black text-slate-400 uppercase block">Preço Sugerido ({targetMarginPct}%)</span>
                <p className="text-sm sm:text-base font-black text-purple-300 font-mono mt-1">
                  {formatCurrency(totals.suggestedPrice)}
                </p>
                <span className="text-[8px] text-slate-500 block mt-0.5">Fórmula Markup</span>
              </div>

              <div className="bg-slate-900 p-3 rounded-xl border border-white/10 text-center">
                <span className="text-[8.5px] font-black text-emerald-400 uppercase block">Lucro Líquido Fornada</span>
                <p className="text-sm sm:text-base font-black text-emerald-400 font-mono mt-1">
                  +{formatCurrency(totals.batchProfit)}
                </p>
                <span className="text-[8px] text-emerald-500/80 block mt-0.5">
                  {totals.currentMarginPct.toFixed(1)}% margem líquida
                </span>
              </div>
            </div>

            {/* PRICING SIMULATION SLIDERS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950 p-4 rounded-xl border border-white/10">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[9.5px] font-black text-purple-400 uppercase">
                    Margem Desejada no Bolso (%):
                  </label>
                  <span className="text-xs font-mono font-bold text-white">{targetMarginPct}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="85"
                  step="5"
                  value={targetMarginPct}
                  onChange={(e) => setTargetMarginPct(parseInt(e.target.value, 10) || 50)}
                  className="w-full accent-purple-500 cursor-pointer"
                />
                <p className="text-[8.5px] text-slate-400">
                  Sugerido para salgados, pizzas e lanches: entre <strong>55% e 70%</strong> de margem para cobrir mão de obra e modelagem.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9.5px] font-black text-emerald-400 uppercase">
                  Preço de Venda Praticado no Balcão (R$):
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">R$</span>
                    <input
                      type="number"
                      step="0.10"
                      min="0"
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-emerald-500/40 rounded-xl pl-9 pr-3 py-2 text-sm text-emerald-400 font-mono font-black outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setSellingPrice(parseFloat(totals.suggestedPrice.toFixed(2)))}
                    className="px-2.5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-[9px] font-black uppercase shrink-0 transition-all cursor-pointer"
                    title="Usar o preço de venda exato calculado pela fórmula"
                  >
                    Usar Sugerido 💡
                  </button>
                </div>
                <div className="flex items-center justify-between text-[9px] pt-0.5">
                  <span className="text-slate-400">Lucro em cada {yieldUnit.replace(/s$/, "")}:</span>
                  <strong className="text-emerald-400 font-mono text-[10.5px]">
                    +{formatCurrency(totals.profitPerUnit)}
                  </strong>
                </div>
              </div>
            </div>

            {/* ACTIONS BAR */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="text-[10px] text-slate-400 flex items-center gap-1.5 text-left">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>
                  Ao clicar em <strong>"Atualizar no PDV"</strong>, o custo de compra de{" "}
                  <strong className="text-white">{formatCurrency(totals.unitCost)}</strong> é salvo no catálogo de vendas!
                </span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleApplyRecipeToCatalog}
                  className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-[10.5px] uppercase tracking-wider rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                  <Check className="w-4 h-4" />
                  <span>Salvar & Atualizar Catálogo do PDV</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: BULK & ANIMAL FEED RESALE (Rações, Aviário, Milho, Sementes, Queijos) */}
      {/* ========================================================================= */}
      {calculatorMode === "granel" && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* HEADER CARD */}
          <div className="bg-gradient-to-r from-amber-950/70 via-slate-900 to-slate-950 border border-amber-500/20 rounded-2xl p-4 sm:p-5 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500 text-slate-950 rounded-xl shadow-lg shadow-amber-500/20 shrink-0">
                  <Dog className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9.5px] font-black uppercase text-amber-400 tracking-wider">
                      Loja de Ração & Aviário
                    </span>
                    <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-[8.5px] font-black uppercase rounded-full border border-amber-500/30">
                      Fracionamento de Sacos Fechados
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2 mt-0.5">
                    Calculadora de Venda a Granel & Rendimento do Saco de Ração
                  </h3>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleShareBulkWhatsApp}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-[10px] uppercase tracking-wider rounded-xl transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/15"
                  title="Compartilhar análise de fracionamento no WhatsApp"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Enviar no WhatsApp</span>
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-300 font-medium leading-relaxed mt-2.5">
              Comprou um <strong>saco de ração fechado de 15kg ou 20kg por R$ 200,00</strong> e quer vender a <strong>R$ 13,90 ou R$ 18,90 o quilo</strong>? Veja exatamente quantas vendas o saco vai render, quanto de lucro vai gerar no seu bolso, qual a margem real e a sugestão de preço ideal descontando sacolinhas plásticas e farelos!
            </p>

            {/* PRESET SHORTCUTS */}
            <div className="mt-3.5 pt-3 border-t border-white/5">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-2">
                ⚡ Exemplos Reais de Rações & Aviário para Testar:
              </span>
              <div className="flex flex-wrap gap-2">
                {PRESET_BULK_ITEMS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleLoadBulkPreset(preset)}
                    className="px-2.5 py-1.5 bg-slate-900/90 hover:bg-amber-900/40 border border-white/10 hover:border-amber-500/40 text-slate-300 hover:text-white rounded-xl text-[10px] font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>
                      {preset.name.includes("Cães")
                        ? "🐶"
                        : preset.name.includes("Gatos")
                        ? "🐱"
                        : preset.name.includes("Milho") || preset.name.includes("Quirera")
                        ? "🌽"
                        : preset.name.includes("Aves") || preset.name.includes("Galinha") || preset.name.includes("Calopsita")
                        ? "🦜"
                        : "🧀"}
                    </span>
                    <span>{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* BULK INPUT CONTROLS */}
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4">
            <h4 className="text-xs font-black uppercase text-amber-400 flex items-center gap-1.5 border-b border-white/5 pb-2">
              <Scale className="w-4 h-4 text-amber-400" />
              1. Dados do Saco / Fardo Fechado & Preço por Quilo
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
              <div className="sm:col-span-5 space-y-1">
                <label className="text-[9.5px] font-black text-slate-300 uppercase">
                  Nome do Produto / Ração / Grão:
                </label>
                <input
                  type="text"
                  value={bulkItem.name}
                  onChange={(e) => setBulkItem({ ...bulkItem, name: e.target.value })}
                  placeholder="Ex: Saco Ração Cães Adultos 20kg"
                  className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-white font-bold outline-none focus:border-amber-500 transition-all uppercase"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="text-[9.5px] font-black text-amber-400 uppercase">
                  Peso do Saco (kg):
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.5"
                  value={bulkItem.packageWeight}
                  onChange={(e) =>
                    setBulkItem({
                      ...bulkItem,
                      packageWeight: Math.max(0.1, parseFloat(e.target.value) || 0)
                    })
                  }
                  className="w-full bg-slate-950 border border-amber-500/30 rounded-xl px-3 py-2 text-white font-mono font-black text-center outline-none focus:border-amber-500"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="text-[9.5px] font-black text-slate-300 uppercase">
                  Custo Pago no Saco (R$):
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-xs text-slate-400 font-bold">R$</span>
                  <input
                    type="number"
                    step="1.00"
                    min="0"
                    value={bulkItem.packageCost}
                    onChange={(e) =>
                      setBulkItem({
                        ...bulkItem,
                        packageCost: Math.max(0, parseFloat(e.target.value) || 0)
                      })
                    }
                    className="w-full bg-slate-950 border border-white/15 rounded-xl pl-8 pr-2.5 py-2 text-xs text-emerald-400 font-mono font-black outline-none focus:border-amber-500 text-right"
                  />
                </div>
              </div>

              <div className="sm:col-span-3 space-y-1">
                <label className="text-[9.5px] font-black text-emerald-400 uppercase">
                  Venda do Kg no Balcão (R$):
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-xs text-slate-400 font-bold">R$</span>
                  <input
                    type="number"
                    step="0.10"
                    min="0"
                    value={bulkItem.sellPricePerKg}
                    onChange={(e) =>
                      setBulkItem({
                        ...bulkItem,
                        sellPricePerKg: Math.max(0, parseFloat(e.target.value) || 0)
                      })
                    }
                    className="w-full bg-slate-950 border border-emerald-500/40 rounded-xl pl-8 pr-2.5 py-2 text-sm text-emerald-400 font-mono font-black outline-none focus:border-emerald-400 text-right"
                  />
                </div>
              </div>
            </div>

            {/* SECONDARY PARAMETERS (BAGS & WASTE) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs border-t border-white/5">
              <div className="bg-slate-950 p-3 rounded-xl border border-white/5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black text-slate-400 uppercase">
                    Custo Real do Kg Comprado
                  </span>
                  <strong className="text-xs font-mono font-bold text-white">
                    {formatCurrency(bulkTotals.costPerKg)} / kg
                  </strong>
                </div>
                <p className="text-[8.5px] text-slate-400 leading-tight">
                  Dividindo o valor do saco ({formatCurrency(bulkItem.packageCost)}) pelos {bulkItem.packageWeight}kg.
                </p>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-white/5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black text-slate-400 uppercase">
                    Custo Saquinho Plástico por Kg
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-slate-500">R$</span>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      value={bulkItem.bagCostPerKg}
                      onChange={(e) =>
                        setBulkItem({
                          ...bulkItem,
                          bagCostPerKg: parseFloat(e.target.value) || 0
                        })
                      }
                      className="w-16 bg-slate-900 border border-white/15 rounded px-1.5 py-0.5 text-xs font-mono font-bold text-white text-center outline-none"
                    />
                  </div>
                </div>
                <p className="text-[8.5px] text-slate-400 leading-tight">
                  Sacola de plástico ou saquinho transparente de bobina picotada.
                </p>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-white/5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black text-amber-400 uppercase">
                    Quebra / Farelo / Fundo (%)
                  </span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="15"
                      value={bulkItem.wastePct}
                      onChange={(e) =>
                        setBulkItem({
                          ...bulkItem,
                          wastePct: parseFloat(e.target.value) || 0
                        })
                      }
                      className="w-14 bg-slate-900 border border-amber-500/30 rounded px-1.5 py-0.5 text-xs font-mono font-bold text-amber-300 text-center outline-none"
                    />
                    <span className="text-xs text-amber-400 font-bold">%</span>
                  </div>
                </div>
                <p className="text-[8.5px] text-slate-400 leading-tight">
                  Poeira e farelinho inevitável que fica no fundo do saco de ração.
                </p>
              </div>
            </div>
          </div>

          {/* BULK RESULTS & SIMULATION DASHBOARD */}
          <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/40 border-2 border-amber-500/30 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div>
                <span className="text-[9.5px] font-black uppercase text-amber-400 tracking-wider">
                  Rendimento & Diagnóstico Financeiro
                </span>
                <h4 className="text-sm sm:text-base font-black uppercase text-white mt-0.5 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  2. Lucro do Saco Inteiro & Quantidade de Vendas
                </h4>
              </div>

              <div className="bg-emerald-950/60 border border-emerald-500/40 px-3.5 py-2 rounded-xl text-center shadow-lg">
                <span className="text-[8px] font-black text-emerald-300 uppercase block">
                  Lucro Líquido por Saco Vendido
                </span>
                <span className="text-lg sm:text-xl font-black text-emerald-400 font-mono">
                  +{formatCurrency(bulkTotals.netProfit)}
                </span>
              </div>
            </div>

            {/* 4 SUMMARY STAT CARDS */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-900 p-3 rounded-xl border border-white/10 text-center">
                <span className="text-[8.5px] font-black text-slate-400 uppercase block">
                  Faturamento Total do Saco
                </span>
                <p className="text-sm sm:text-base font-black text-white font-mono mt-1">
                  {formatCurrency(bulkTotals.totalRevenue)}
                </p>
                <span className="text-[8px] text-slate-500 block mt-0.5">
                  ({bulkTotals.usableWeight.toFixed(1)}kg aproveitáveis)
                </span>
              </div>

              <div className="bg-slate-900 p-3 rounded-xl border border-white/10 text-center">
                <span className="text-[8.5px] font-black text-slate-400 uppercase block">
                  Lucro Líquido por Kg
                </span>
                <p className="text-sm sm:text-base font-black text-emerald-400 font-mono mt-1">
                  +{formatCurrency(bulkTotals.profitPerKg)}
                </p>
                <span className="text-[8px] text-emerald-500/80 block mt-0.5">
                  {bulkTotals.marginPct.toFixed(1)}% margem líquida
                </span>
              </div>

              <div className="bg-slate-900 p-3 rounded-xl border border-white/10 text-center">
                <span className="text-[8.5px] font-black text-amber-400 uppercase block">
                  Preço Sugerido ({bulkItem.desiredMarginPct}%)
                </span>
                <p className="text-sm sm:text-base font-black text-amber-400 font-mono mt-1">
                  {formatCurrency(bulkTotals.suggestedPricePerKg)} / kg
                </p>
                <span className="text-[8px] text-slate-500 block mt-0.5">
                  Para {bulkItem.desiredMarginPct}% no bolso
                </span>
              </div>

              <div className="bg-slate-900 p-3 rounded-xl border border-white/10 text-center">
                <span className="text-[8.5px] font-black text-purple-400 uppercase block">
                  Markup Total (% s/ Custo)
                </span>
                <p className="text-sm sm:text-base font-black text-purple-300 font-mono mt-1">
                  {bulkTotals.markupPct.toFixed(1)}%
                </p>
                <span className="text-[8px] text-slate-500 block mt-0.5">
                  Multiplicador {(bulkTotals.markupPct / 100 + 1).toFixed(2)}x
                </span>
              </div>
            </div>

            {/* YIELD VISUAL BREAKDOWN (QUANTAS VENDAS DÁ O SACO) */}
            <div className="bg-slate-950 p-4 rounded-xl border border-white/10 space-y-2.5">
              <span className="text-[9.5px] font-black text-amber-400 uppercase tracking-wider block">
                📦 Quantas Vendas Rende este Saco de {bulkItem.packageWeight}kg:
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center text-xs">
                <div className="bg-slate-900 p-2.5 rounded-lg border border-white/5">
                  <span className="text-[8px] font-bold text-slate-400 uppercase block">Em vendas de 1 kg:</span>
                  <strong className="text-base font-black text-white font-mono block mt-0.5">
                    {bulkTotals.salesOf1Kg.toFixed(0)} vendas
                  </strong>
                  <span className="text-[7.5px] text-slate-500 block">de 1 kg</span>
                </div>

                <div className="bg-slate-900 p-2.5 rounded-lg border border-white/5">
                  <span className="text-[8px] font-bold text-slate-400 uppercase block">Em saquinhos de 500g:</span>
                  <strong className="text-base font-black text-amber-300 font-mono block mt-0.5">
                    {bulkTotals.salesOf500g.toFixed(0)} saquinhos
                  </strong>
                  <span className="text-[7.5px] text-slate-500 block">de 500 gramas</span>
                </div>

                <div className="bg-slate-900 p-2.5 rounded-lg border border-white/5">
                  <span className="text-[8px] font-bold text-slate-400 uppercase block">Em porções de 2 kg:</span>
                  <strong className="text-base font-black text-white font-mono block mt-0.5">
                    {bulkTotals.salesOf2Kg.toFixed(1)} porções
                  </strong>
                  <span className="text-[7.5px] text-slate-500 block">de 2 kg cada</span>
                </div>

                <div className="bg-slate-900 p-2.5 rounded-lg border border-white/5">
                  <span className="text-[8px] font-bold text-slate-400 uppercase block">Em sacos médios de 5 kg:</span>
                  <strong className="text-base font-black text-purple-300 font-mono block mt-0.5">
                    {bulkTotals.salesOf5Kg.toFixed(1)} sacos
                  </strong>
                  <span className="text-[7.5px] text-slate-500 block">de 5 kg</span>
                </div>
              </div>
            </div>

            {/* DYNAMIC PROFIT COMPARISON TABLE */}
            <div className="bg-slate-950 p-4 rounded-xl border border-white/10 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[9.5px] font-black text-emerald-400 uppercase tracking-wider">
                  📊 Tabela Comparativa: Quanto você lucra por preço do quilo:
                </span>
                <span className="text-[9px] text-slate-400">
                  Clique no valor para aplicar
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-white/10 text-[9px] font-black uppercase text-slate-400">
                      <th className="pb-1.5">Preço por Quilo</th>
                      <th className="pb-1.5">Faturamento do Saco</th>
                      <th className="pb-1.5">Lucro no Bolso</th>
                      <th className="pb-1.5 text-right">Margem Líquida</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {bulkTotals.priceSimulation.map((sim, i) => {
                      const isCurrent = Math.abs(sim.price - bulkItem.sellPricePerKg) < 0.05;
                      return (
                        <tr
                          key={i}
                          onClick={() => setBulkItem({ ...bulkItem, sellPricePerKg: parseFloat(sim.price.toFixed(2)) })}
                          className={`transition-colors cursor-pointer ${
                            isCurrent
                              ? "bg-amber-500/15 font-black text-amber-300"
                              : "hover:bg-white/[0.03] text-slate-300"
                          }`}
                        >
                          <td className="py-2 font-mono font-bold flex items-center gap-1.5">
                            {formatCurrency(sim.price)} / kg
                            {isCurrent && (
                              <span className="px-1.5 py-0.2 bg-amber-500 text-slate-950 text-[7.5px] font-black rounded uppercase">
                                Atual
                              </span>
                            )}
                          </td>
                          <td className="py-2 font-mono">{formatCurrency(sim.revenue)}</td>
                          <td className="py-2 font-mono font-bold text-emerald-400">
                            +{formatCurrency(sim.profit)}
                          </td>
                          <td className="py-2 font-mono text-right text-slate-400">
                            {sim.margin.toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ACTIONS BAR */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="text-[10px] text-slate-400 flex items-center gap-1.5 text-left">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>
                  Cadastra automaticamente como produto fracionado no PDV com custo de{" "}
                  <strong className="text-white">{formatCurrency(bulkTotals.costPerKgTotal)}/kg</strong> e venda de{" "}
                  <strong className="text-white">{formatCurrency(bulkItem.sellPricePerKg)}/kg</strong>.
                </span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleApplyBulkToCatalog}
                  className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-[10.5px] uppercase tracking-wider rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  <Check className="w-4 h-4" />
                  <span>Cadastrar Ração no PDV por Quilo</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
