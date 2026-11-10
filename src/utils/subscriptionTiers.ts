/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SubscriptionTier = "free" | "pro_tools" | "estoque_gestao" | "pdv_total" | "infinite";
export type BillingCycle = "weekly" | "biweekly" | "monthly";

export interface TierPlanInfo {
  id: SubscriptionTier;
  name: string;
  tagline: string;
  price: string;
  priceNum: number;
  period: string;
  badge: string;
  badgeBg: string;
  badgeText: string;
  popular?: boolean;
  highlight?: boolean;
  description: string;
  features: string[];
  ctaLabel: string;
}

/**
 * Calcula o preço dinâmico com base no ciclo:
 * - Mensal: valor normal (100%)
 * - Quinzenal: exatamente metade (50%)
 * - Semanal: 1 semana proporcional mensal / 4 + 10% adicional
 */
export function calculatePlanPrice(baseMonthlyPrice: number, cycle: BillingCycle): { priceNum: number; formatted: string; periodLabel: string } {
  if (baseMonthlyPrice <= 0) {
    return { priceNum: 0, formatted: "R$ 0,00", periodLabel: "Sempre Grátis" };
  }

  if (cycle === "weekly") {
    // 1 semana: metade da quinzena / 4 da mensal + 10% adicional
    const weeklyBase = baseMonthlyPrice / 4;
    const weeklyPrice = Math.round((weeklyBase * 1.10) * 100) / 100;
    return {
      priceNum: weeklyPrice,
      formatted: `R$ ${weeklyPrice.toFixed(2).replace(".", ",")}`,
      periodLabel: "por semana",
    };
  }

  if (cycle === "biweekly") {
    // Quinzenal: exatamente metade (50%)
    const biweeklyPrice = Math.round((baseMonthlyPrice / 2) * 100) / 100;
    return {
      priceNum: biweeklyPrice,
      formatted: `R$ ${biweeklyPrice.toFixed(2).replace(".", ",")}`,
      periodLabel: "por 15 dias",
    };
  }

  // Mensal
  return {
    priceNum: baseMonthlyPrice,
    formatted: `R$ ${baseMonthlyPrice.toFixed(2).replace(".", ",")}`,
    periodLabel: "por mês",
  };
}

export const SUBSCRIPTION_PLANS: TierPlanInfo[] = [
  {
    id: "free",
    name: "Plano Grátis",
    tagline: "Para o dia a dia e clientes do bairro",
    price: "R$ 0,00",
    priceNum: 0,
    period: "Sempre Grátis",
    badge: "100% GRÁTIS",
    badgeBg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-600",
    badgeText: "text-emerald-500",
    description: "Tudo o que os moradores e comerciantes precisam para não baixar múltiplos apps no celular:",
    features: [
      "Calculadora comum rápida do dia a dia",
      "Lista de compras de supermercado com soma automática",
      "Mural de Encartes e Ofertas de Supermercados",
      "Notificações Push com promoções e ofertas do bairro",
      "Bloco de notas comum para recados e lembretes",
      "Agenda de compromissos e tarefas"
    ],
    ctaLabel: "Plano Grátis"
  },
  {
    id: "pro_tools",
    name: "Ferramentas Pro",
    tagline: "Para quem precifica e gera recibos",
    price: "R$ 14,90",
    priceNum: 14.90,
    period: "por mês",
    badge: "MENOR VALOR",
    badgeBg: "bg-amber-500/10 border-amber-500/30 text-amber-600",
    badgeText: "text-amber-500",
    description: "Ferramentas essenciais para pequenas vendas, precificação e documentação:",
    features: [
      "Tudo incluído no Plano Grátis",
      "Calculadora de Precificação Inteligente (lucro, custo e margem)",
      "Talões e Papelarias (Recibos impressos e digitais de bazar/balcão)",
      "Calculadora Nota de Bloco com exportação para Excel e PDF",
      "Comprovantes com assinatura e compartilhamento no WhatsApp"
    ],
    ctaLabel: "Assinar Ferramentas Pro (R$ 14,90)"
  },
  {
    id: "estoque_gestao",
    name: "Gestão, Estoque & Caixa",
    tagline: "Controle de estoque e Frente de Caixa liberados",
    price: "R$ 29,90",
    priceNum: 29.90,
    period: "por mês",
    badge: "CAIXA & ESTOQUE LIBERADOS",
    badgeBg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-600",
    badgeText: "text-emerald-500",
    description: "Para comércios que precisam vender no caixa e controlar rigorosamente suas mercadorias:",
    features: [
      "Tudo incluído no Plano Ferramentas Pro (R$ 14,90)",
      "Frente de Caixa (PDV) completa para registrar vendas e emitir cupons",
      "Controle de Estoque Completo Liberado",
      "Recebimentos em Dinheiro, Pix, Cartão e Fiado",
      "Cadastro e edição de produtos e preços no balcão",
      "Alertas de estoque mínimo e risco de falta",
      "Histórico de vendas, sangria e suprimento de caixa",
      "(Sem assistência IA Gemini, exclusiva do plano de R$ 39,90)"
    ],
    ctaLabel: "Assinar Caixa & Estoque (R$ 29,90)"
  },
  {
    id: "pdv_total",
    name: "PDV Total & IA",
    tagline: "Direito a TUDO no sistema",
    price: "R$ 39,90",
    priceNum: 39.90,
    period: "por mês",
    badge: "DIREITO A TUDO + IA 👑",
    badgeBg: "bg-purple-500/10 border-purple-500/30 text-purple-600",
    badgeText: "text-purple-500",
    popular: false,
    highlight: false,
    description: "A solução comercial completa para comércios em geral:",
    features: [
      "DIREITO A TUDO NO APLICATIVO",
      "Frente de Caixa (PDV) completa com fluxo rápido",
      "Controle de Estoque Completo Liberado",
      "Mentoria Inteligente com IA Gemini do Google",
      "Leitor de código de barras pela câmera do celular",
      "Balança digital para pesagem",
      "Painel do Proprietário com PIN e gestão de múltiplos caixas",
      "Recebimentos por Pix Dinâmico e Cartão",
      "Envio de cupom fiscal/comprovante instantâneo no WhatsApp"
    ],
    ctaLabel: "Liberar Tudo com IA (R$ 39,90/mês)"
  },
  {
    id: "infinite",
    name: "Plano Infinito Vitalício ♾️",
    tagline: "Licença Vitalícia & Ilimitada D.W VIDROS & RECICLAGEM",
    price: "Vitalício (Sem Mensalidade)",
    priceNum: 0,
    period: "Para Sempre",
    badge: "LICENÇA VITALÍCIA INFINITA ♾️👑",
    badgeBg: "bg-gradient-to-r from-amber-500/20 to-emerald-500/20 border-amber-400 text-amber-300",
    badgeText: "text-amber-400",
    popular: true,
    highlight: true,
    description: "Acesso permanente, irrestrito e vitalício vinculado ao CNPJ 67.965.725/0001-95:",
    features: [
      "TODAS AS FERRAMENTAS DO SISTEMA 100% LIBERADAS PARA SEMPRE",
      "CNPJ 67.965.725/0001-95 Ativo e Vinculado",
      "Razão Social D.W VIDROS & RECICLAGEM Registrada",
      "Frente de Caixa (PDV) Completo com Cupom e Impressora Térmica",
      "Controle de Estoque Ilimitado com Alertas e Cadastro Rápido",
      "Módulo Especial D.W Vidros & Reciclagem (Balança, Lotes, Cargas e Toneladas)",
      "Caderninho de Colaboradores da Reciclagem e Livro Caixa",
      "Mentoria Inteligente com IA Gemini do Google Ilimitada",
      "Leitor de Código de Barras por Câmera e Scanner USB Dual Mode",
      "Recebimentos por Pix Dinâmico, Cartão e Controle de Fiado",
      "Zero Mensalidades • Licença Vitalícia Permanente da D.W Vidros"
    ],
    ctaLabel: "Plano Infinito Ativo ♾️"
  }
];

export type FeatureKey =
  | "calc_comum"
  | "super"
  | "encartes"
  | "notes_comum"
  | "agenda"
  | "excel_notas"
  | "taloes"
  | "precificacao"
  | "estoque"
  | "pdv_completo";

export function getCurrentSubscriptionTier(): SubscriptionTier {
  try {
    const saved = localStorage.getItem("app_subscription_tier");
    if (saved === "infinite") return "infinite";

    const cnpj = (localStorage.getItem("pdv_store_cnpj_cpf") || "").replace(/\D/g, "");
    if (cnpj === "67965725000195" || saved === "infinite") {
      saveSubscriptionTier("infinite");
      return "infinite";
    }

    if (saved && ["free", "pro_tools", "estoque_gestao", "pdv_total", "infinite"].includes(saved)) {
      return saved as SubscriptionTier;
    }

    // Default para D.W VIDROS & RECICLAGEM com CNPJ 67.965.725/0001-95
    saveSubscriptionTier("infinite");
    return "infinite";
  } catch {
    // ignore
  }
  return "infinite";
}

export function saveSubscriptionTier(tier: SubscriptionTier): void {
  try {
    localStorage.setItem("app_subscription_tier", tier);
    if (tier === "infinite" || tier === "pdv_total" || tier === "estoque_gestao") {
      localStorage.setItem("pdv_license_active", "true");
      localStorage.setItem("is_premium", "true");
      localStorage.setItem("pdv_owner_vip_unlocked", "true");
      localStorage.setItem("pdv_owner_mode", "true");
    } else if (tier === "pro_tools") {
      localStorage.setItem("is_premium", "true");
      localStorage.setItem("pdv_license_active", "false");
    } else {
      localStorage.setItem("is_premium", "false");
      localStorage.setItem("pdv_license_active", "false");
    }
  } catch (e) {
    console.error("Erro ao salvar nível de assinatura:", e);
  }
}

export function isFeatureAllowedForTier(feature: FeatureKey, tier: SubscriptionTier, isAdmin: boolean = false): boolean {
  if (isAdmin || tier === "infinite") return true;

  // 1. Free features are ALWAYS allowed for everyone
  if (
    feature === "calc_comum" ||
    feature === "super" ||
    feature === "encartes" ||
    feature === "notes_comum" ||
    feature === "agenda"
  ) {
    return true;
  }

  // 2. Pro Tools tier features (R$ 14,90, R$ 29,90, R$ 39,90)
  if (feature === "excel_notas" || feature === "taloes" || feature === "precificacao") {
    return tier === "pro_tools" || tier === "estoque_gestao" || tier === "pdv_total";
  }

  // 3. Estoque (Controle de Estoque Completo) - Liberado para R$ 29,90 e R$ 39,90!
  if (feature === "estoque") {
    return tier === "estoque_gestao" || tier === "pdv_total";
  }

  // 4. PDV Caixa (Frente de Caixa) - Liberado para R$ 29,90 e R$ 39,90!
  if (feature === "pdv_completo") {
    return tier === "estoque_gestao" || tier === "pdv_total";
  }

  return false;
}
