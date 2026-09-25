/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SubscriptionTier = "free" | "pro_tools" | "estoque_gestao" | "pdv_total";

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
    ctaLabel: "Plano Atual (Grátis)"
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
    name: "Gestão & Estoque",
    tagline: "Controle de estoque completo",
    price: "R$ 29,90",
    priceNum: 29.90,
    period: "por mês",
    badge: "ESTOQUE LIBERADO",
    badgeBg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-600",
    badgeText: "text-emerald-500",
    description: "Para comércios que precisam de controle rigoroso de produtos e mercadorias:",
    features: [
      "Tudo incluído no Plano Ferramentas Pro (R$ 14,90)",
      "Controle de Estoque Completo Liberado",
      "Cadastro e edição de produtos no estoque",
      "Alertas de estoque mínimo e risco de falta",
      "Histórico de entradas, saídas e reposições",
      "Exportação de balanço e inventário físico"
    ],
    ctaLabel: "Assinar Gestão & Estoque (R$ 29,90)"
  },
  {
    id: "pdv_total",
    name: "PDV Total & IA",
    tagline: "Direito a TUDO no sistema",
    price: "R$ 39,90",
    priceNum: 39.90,
    period: "por mês",
    badge: "DIREITO A TUDO 👑",
    badgeBg: "bg-purple-500/10 border-purple-500/30 text-purple-600",
    badgeText: "text-purple-500",
    popular: true,
    highlight: true,
    description: "A solução comercial definitiva para mercearias, padarias, mercados e lanchonetes:",
    features: [
      "DIREITO A TUDO NO APLICATIVO",
      "Frente de Caixa (PDV) completa com fluxo rápido",
      "Controle de Estoque Completo Liberado",
      "Mentoria Inteligente com IA Gemini do Google",
      "Leitor de código de barras pela câmera do celular",
      "Balança digital para pesagem de frios, salgados e marmitas",
      "Painel do Proprietário com PIN e gestão de múltiplos caixas",
      "Balcão de Comandos e Pedidos em tempo real",
      "Controle de Fiado e Clientes devedores",
      "Recebimentos por Pix Dinâmico e Cartão com Mercado Pago",
      "Envio de cupom fiscal/comprovante instantâneo no WhatsApp"
    ],
    ctaLabel: "Liberar Tudo (R$ 39,90/mês)"
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
    if (saved && ["free", "pro_tools", "estoque_gestao", "pdv_total"].includes(saved)) {
      return saved as SubscriptionTier;
    }
    // Backward compatibility: check pdv_license_active
    const pdvActive = localStorage.getItem("pdv_license_active") === "true";
    if (pdvActive) {
      return "pdv_total";
    }
    const isPremium = localStorage.getItem("is_premium") === "true";
    if (isPremium) {
      return "pro_tools";
    }
  } catch {
    // ignore
  }
  return "free";
}

export function saveSubscriptionTier(tier: SubscriptionTier): void {
  try {
    localStorage.setItem("app_subscription_tier", tier);
    if (tier === "pdv_total") {
      localStorage.setItem("pdv_license_active", "true");
      localStorage.setItem("is_premium", "true");
    } else if (tier === "estoque_gestao") {
      localStorage.setItem("pdv_license_active", "false"); // estoque is unlocked separately
      localStorage.setItem("is_premium", "true");
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
  if (isAdmin) return true;

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

  // 4. PDV Total & IA Gemini (R$ 39,90)
  if (feature === "pdv_completo") {
    return tier === "pdv_total";
  }

  return false;
}
