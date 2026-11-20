/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SubscriptionTier = "free" | "pro_tools" | "estoque_gestao" | "pdv_total" | "infinite";
export type BillingCycle = "weekly" | "biweekly" | "monthly";

export const TRIAL_DURATION_DAYS = 30;
const TRIAL_DURATION_MS = TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000;
const TRIAL_START_KEY = "app_free_trial_started_at";
const LEGACY_PLAY_TRIAL_START_KEY = "play_store_trial_started";
const LEGACY_PLAY_TRIAL_EXPIRY_KEY = "play_store_trial_expiry";

export interface TrialStatus {
  startedAt: Date;
  expiresAt: Date;
  daysRemaining: number;
  isActive: boolean;
  hasExpired: boolean;
  expiryFormatted: string;
}

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
 * Garante que o período de teste gratuito de 30 dias esteja inicializado no aparelho
 * e retorna as datas e dias restantes com segurança.
 */
export function ensureFreeTrialInitialized(): string {
  const nowIso = new Date().toISOString();
  try {
    const existing =
      localStorage.getItem(TRIAL_START_KEY) ||
      localStorage.getItem(LEGACY_PLAY_TRIAL_START_KEY);
    if (existing && !isNaN(new Date(existing).getTime())) {
      localStorage.setItem(TRIAL_START_KEY, existing);
      return existing;
    }
    localStorage.setItem(TRIAL_START_KEY, nowIso);
    return nowIso;
  } catch {
    return nowIso;
  }
}

export function getTrialStatus(): TrialStatus {
  const startIso = ensureFreeTrialInitialized();
  const startedAt = new Date(startIso);
  let expiresAt = new Date(startedAt.getTime() + TRIAL_DURATION_MS);

  try {
    const explicitExpiry = localStorage.getItem(LEGACY_PLAY_TRIAL_EXPIRY_KEY);
    if (explicitExpiry && !isNaN(new Date(explicitExpiry).getTime())) {
      const parsedExplicit = new Date(explicitExpiry);
      if (parsedExplicit.getTime() > expiresAt.getTime()) {
        expiresAt = parsedExplicit;
      }
    }
  } catch {
    // ignore storage restriction
  }

  const now = Date.now();
  const diffMs = expiresAt.getTime() - now;
  const isActive = diffMs > 0;
  const daysRemaining = isActive ? Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24))) : 0;

  return {
    startedAt,
    expiresAt,
    daysRemaining,
    isActive,
    hasExpired: !isActive,
    expiryFormatted: expiresAt.toLocaleDateString("pt-BR"),
  };
}

/**
 * Sincroniza plano e data do teste de 30 dias vindos do Firestore (sem resetar trial expirado).
 */
export function syncTrialAndTierFromCloud(options: {
  cloudTier?: string | null;
  cloudTrialStartedAt?: string | null;
  cloudTrialEndsAt?: string | null;
}): SubscriptionTier | null {
  try {
    const localStart = ensureFreeTrialInitialized();
    if (options.cloudTrialStartedAt && !isNaN(new Date(options.cloudTrialStartedAt).getTime())) {
      const cloudTime = new Date(options.cloudTrialStartedAt).getTime();
      const localTime = new Date(localStart).getTime();
      // Preserva a data mais antiga para impedir reinício indevido do teste de 30 dias
      const earliest = cloudTime < localTime ? options.cloudTrialStartedAt : localStart;
      localStorage.setItem(TRIAL_START_KEY, earliest);
    }

    if (options.cloudTrialEndsAt && !isNaN(new Date(options.cloudTrialEndsAt).getTime())) {
      localStorage.setItem(LEGACY_PLAY_TRIAL_EXPIRY_KEY, options.cloudTrialEndsAt);
    }

    if (
      options.cloudTier &&
      ["free", "pro_tools", "estoque_gestao", "pdv_total", "infinite"].includes(options.cloudTier)
    ) {
      const validTier = options.cloudTier as SubscriptionTier;
      saveSubscriptionTier(validTier);
      return validTier;
    }
  } catch {
    // ignore
  }
  return null;
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
    const weeklyBase = baseMonthlyPrice / 4;
    const weeklyPrice = Math.round((weeklyBase * 1.10) * 100) / 100;
    return {
      priceNum: weeklyPrice,
      formatted: `R$ ${weeklyPrice.toFixed(2).replace(".", ",")}`,
      periodLabel: "por semana",
    };
  }

  if (cycle === "biweekly") {
    const biweeklyPrice = Math.round((baseMonthlyPrice / 2) * 100) / 100;
    return {
      priceNum: biweeklyPrice,
      formatted: `R$ ${biweeklyPrice.toFixed(2).replace(".", ",")}`,
      periodLabel: "por 15 dias",
    };
  }

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
    tagline: "Calculadora Nota, Excel e Ofertas do Bairro",
    price: "R$ 0,00",
    priceNum: 0,
    period: "Sempre Grátis",
    badge: "100% GRÁTIS PARA SEMPRE",
    badgeBg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
    badgeText: "text-emerald-400",
    description: "Uso diário ilimitado e gratuito sem créditos ou mensalidade:",
    features: [
      "Calculadora Nota & Excel 100% Gratuita (com Exportação Excel & Pastas Salvas)",
      "Calculadora comum rápida do dia a dia offline",
      "Lista de compras de supermercado com soma automática",
      "Anúncios & Encartes de Supermercados e Mercadinhos",
      "Notificações Push obrigatórias com promoções e ofertas do bairro",
      "Bloco de notas completo com Pastas organizadas e lembretes simples"
    ],
    ctaLabel: "Plano Grátis"
  },
  {
    id: "pro_tools",
    name: "Ferramentas Pro & Agenda",
    tagline: "Agenda dos Profissionais, Precificação e Talões",
    price: "R$ 14,90",
    priceNum: 14.90,
    period: "por mês",
    badge: "30 DIAS GRÁTIS P/ TESTE",
    badgeBg: "bg-amber-500/10 border-amber-500/30 text-amber-400",
    badgeText: "text-amber-400",
    description: "Plano pago para autônomos e profissionais (30 dias grátis para testar):",
    features: [
      "Tudo incluído no Plano Grátis",
      "Agenda dos Profissionais Completa (Salão, Barbearia, Manicure, Estética, Saúde & Festas)",
      "Portal Público de Agendamento Online para seus Clientes",
      "Calculadora de Precificação Inteligente (lucro, custo e margem)",
      "Talões, Recibos Digitais e Módulo Bazar / Brechó com WhatsApp"
    ],
    ctaLabel: "Testar 30 Dias Grátis (Depois R$ 14,90)"
  },
  {
    id: "estoque_gestao",
    name: "Gestão, Ferro Velho & Caixa",
    tagline: "Ferro Velho, Pátio de Vidros, Estoque e PDV",
    price: "R$ 29,90",
    priceNum: 29.90,
    period: "por mês",
    badge: "30 DIAS GRÁTIS • FERRO VELHO & PDV",
    badgeBg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
    badgeText: "text-emerald-400",
    description: "Plano pago para depósitos, ferro velho, reciclagem e comércios (30 dias grátis):",
    features: [
      "Tudo incluído no Plano Ferramentas Pro & Agenda (R$ 14,90)",
      "Módulo Ferro Velho, Pátio de Vidros & Centro de Reciclagem (Balança, Lotes & Colaboradores)",
      "Frente de Caixa (PDV) completa para registrar vendas e emitir cupons",
      "Controle de Estoque Completo com alertas e cadastro rápido",
      "Recebimentos em Dinheiro, Pix, Cartão e Fiado + Sangria e Suprimento"
    ],
    ctaLabel: "Testar 30 Dias Grátis (Depois R$ 29,90)"
  },
  {
    id: "pdv_total",
    name: "PDV Total & IA",
    tagline: "Direito a TUDO no sistema + IA Gemini",
    price: "R$ 39,90",
    priceNum: 39.90,
    period: "por mês",
    badge: "30 DIAS GRÁTIS • TUDO LIBERADO + IA 👑",
    badgeBg: "bg-purple-500/10 border-purple-500/30 text-purple-400",
    badgeText: "text-purple-400",
    popular: false,
    highlight: false,
    description: "A solução comercial completa com Inteligência Artificial (30 dias grátis):",
    features: [
      "DIREITO A TUDO NO APLICATIVO (Agenda Profissional + Ferro Velho + PDV)",
      "Mentoria Inteligente com IA Gemini do Google",
      "Frente de Caixa (PDV) completa com fluxo rápido e impressora 58mm",
      "Leitor de código de barras pela câmera + Balança digital",
      "Painel do Proprietário com PIN, Auditoria e gestão de múltiplos caixas",
      "Envio de cupom/comprovante instantâneo no WhatsApp"
    ],
    ctaLabel: "Testar 30 Dias Grátis (Depois R$ 39,90)"
  },
  {
    id: "infinite",
    name: "Plano Infinito Vitalício ♾️",
    tagline: "Licença Vitalícia & Ilimitada (Administrador)",
    price: "Vitalício (Sem Mensalidade)",
    priceNum: 0,
    period: "Para Sempre",
    badge: "LICENÇA ADMINISTRATIVA ♾️👑",
    badgeBg: "bg-gradient-to-r from-amber-500/20 to-emerald-500/20 border-amber-400 text-amber-300",
    badgeText: "text-amber-400",
    popular: true,
    highlight: true,
    description: "Acesso permanente exclusivo para contas administrativas autorizadas:",
    features: [
      "TODAS AS FERRAMENTAS DO SISTEMA 100% LIBERADAS PARA SEMPRE",
      "Agenda dos Profissionais + Ferro Velho & Pátio de Vidros",
      "Frente de Caixa (PDV) Completo com Cupom e Impressora Térmica",
      "Mentoria Inteligente com IA do Google Ilimitada",
      "Zero Mensalidades • Licença Vitalícia Ativa"
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
  | "agenda_profissionais"
  | "ferro_velho"
  | "taloes"
  | "precificacao"
  | "estoque"
  | "pdv_completo"
  | "ia_gemini";

export function getCurrentSubscriptionTier(): SubscriptionTier {
  try {
    const saved = localStorage.getItem("app_subscription_tier");
    if (saved && ["free", "pro_tools", "estoque_gestao", "pdv_total", "infinite"].includes(saved)) {
      return saved as SubscriptionTier;
    }
    if (localStorage.getItem("pdv_owner_vip_unlocked") === "true") {
      return "infinite";
    }
  } catch {
    // ignore
  }
  return "free";
}

export function saveSubscriptionTier(tier: SubscriptionTier): void {
  try {
    localStorage.setItem("app_subscription_tier", tier);
    if (tier === "infinite") {
      localStorage.setItem("pdv_license_active", "true");
      localStorage.setItem("is_premium", "true");
      localStorage.setItem("pdv_owner_vip_unlocked", "true");
      localStorage.setItem("pdv_owner_mode", "true");
    } else if (tier === "pdv_total" || tier === "estoque_gestao") {
      localStorage.setItem("pdv_license_active", "true");
      localStorage.setItem("is_premium", "true");
      localStorage.removeItem("pdv_owner_vip_unlocked");
    } else if (tier === "pro_tools") {
      localStorage.setItem("is_premium", "true");
      localStorage.setItem("pdv_license_active", "false");
      localStorage.removeItem("pdv_owner_vip_unlocked");
    } else {
      localStorage.setItem("is_premium", "false");
      localStorage.setItem("pdv_license_active", "false");
      localStorage.removeItem("pdv_owner_vip_unlocked");
    }
  } catch (e) {
    console.error("Erro ao salvar nível de assinatura:", e);
  }
}

export function isFeatureAllowedForTier(
  feature: FeatureKey,
  tier: SubscriptionTier,
  isAdminOrOwner: boolean = false
): boolean {
  if (isAdminOrOwner || tier === "infinite") return true;

  // 1. Recursos 100% Gratuitos (Sempre Grátis: Calc Comum, Nota & Excel, Supermercado, Encartes/Anúncios, Bloco de Notas, Lembretes simples)
  if (
    feature === "calc_comum" ||
    feature === "super" ||
    feature === "encartes" ||
    feature === "notes_comum" ||
    feature === "agenda" ||
    feature === "excel_notas"
  ) {
    return true;
  }

  // 2. Período de Teste Gratuito de 30 Dias ("Grátis por 30 dias para teste")
  // Libera os módulos pagos (Agenda dos Profissionais, Ferro Velho, Precificação, Estoque e PDV) durante os 30 dias iniciais
  if (getTrialStatus().isActive) {
    return true;
  }

  // 3. Após os 30 dias de teste: exige assinatura ativa compatível
  if (feature === "agenda_profissionais" || feature === "taloes" || feature === "precificacao") {
    return tier === "pro_tools" || tier === "estoque_gestao" || tier === "pdv_total";
  }

  if (feature === "ferro_velho" || feature === "estoque" || feature === "pdv_completo") {
    return tier === "estoque_gestao" || tier === "pdv_total";
  }

  if (feature === "ia_gemini") {
    return tier === "pdv_total";
  }

  return false;
}
