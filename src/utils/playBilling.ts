/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Integração oficial com Google Play Billing via Digital Goods API (TWA / PWA na Play Store).
 */

import { BillingCycle, SubscriptionTier } from "./subscriptionTiers";

export const PLAY_BILLING_SKU_MAP: Record<
  Exclude<SubscriptionTier, "free" | "infinite">,
  Record<BillingCycle, string>
> = {
  pro_tools: {
    weekly: "plano_pro_semanal",
    biweekly: "plano_pro_quinzenal",
    monthly: "plano_pro_mensal",
  },
  estoque_gestao: {
    weekly: "plano_gestao_semanal",
    biweekly: "plano_gestao_quinzenal",
    monthly: "plano_gestao_mensal",
  },
  pdv_total: {
    weekly: "plano_pdv_total_semanal",
    biweekly: "plano_pdv_total_quinzenal",
    monthly: "plano_pdv_total_mensal",
  },
};

export function getPlayStoreSku(tier: SubscriptionTier, cycle: BillingCycle): string | null {
  if (tier === "free" || tier === "infinite") return null;
  return PLAY_BILLING_SKU_MAP[tier]?.[cycle] || null;
}

export function isAndroidPlayStoreContext(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const referrer = document.referrer || "";
    const hasDigitalGoods = "getDigitalGoodsService" in window;
    return referrer.startsWith("android-app://") || hasDigitalGoods;
  } catch {
    return false;
  }
}

export interface PlayBillingPurchaseResult {
  status: "purchased" | "cancelled" | "unavailable" | "error";
  sku?: string;
  purchaseToken?: string;
  message?: string;
}

export async function purchaseViaGooglePlayBilling(
  tier: SubscriptionTier,
  cycle: BillingCycle,
  fallbackPriceNum: number,
  planLabel: string
): Promise<PlayBillingPurchaseResult> {
  const sku = getPlayStoreSku(tier, cycle);
  if (!sku) {
    return { status: "error", message: "Plano inválido para cobrança na Play Store." };
  }

  const getDgs = (window as any).getDigitalGoodsService;
  if (typeof getDgs !== "function" || typeof window.PaymentRequest !== "function") {
    return {
      status: "unavailable",
      sku,
      message: "Digital Goods API disponível apenas no app instalado pela Google Play Store.",
    };
  }

  try {
    const service = await getDgs("https://play.google.com/billing");
    if (!service) {
      return { status: "unavailable", sku };
    }

    let formattedPrice = fallbackPriceNum.toFixed(2);
    let currency = "BRL";

    try {
      const details = await service.getDetails([sku]);
      if (Array.isArray(details) && details.length > 0 && details[0]?.price) {
        formattedPrice = details[0].price.value || formattedPrice;
        currency = details[0].price.currency || currency;
      }
    } catch (detailErr) {
      console.warn("[Play Billing] Produto ainda não publicado ou sem detalhes:", detailErr);
    }

    const paymentMethods = [
      {
        supportedMethods: "https://play.google.com/billing",
        data: { sku },
      },
    ];

    const paymentDetails = {
      total: {
        label: planLabel,
        amount: {
          currency,
          value: formattedPrice,
        },
      },
    };

    const request = new PaymentRequest(paymentMethods as any, paymentDetails);
    const paymentResponse = await request.show();
    const token =
      (paymentResponse as any)?.details?.purchaseToken ||
      (paymentResponse as any)?.details?.token ||
      "";

    try {
      await paymentResponse.complete("success");
    } catch {
      // ignore completion errors if already closed
    }

    if (token && typeof service.acknowledge === "function") {
      try {
        await service.acknowledge(token, "onetime");
      } catch {
        // Subscription acknowledgments may be handled server-side or automatically
      }
    }

    return {
      status: "purchased",
      sku,
      purchaseToken: token,
    };
  } catch (err: any) {
    const msg = String(err?.message || err || "");
    if (err?.name === "AbortError" || msg.toLowerCase().includes("cancel")) {
      return { status: "cancelled", sku, message: "Assinatura cancelada pelo usuário." };
    }
    return {
      status: "unavailable",
      sku,
      message: msg,
    };
  }
}

export async function restorePlayStorePurchases(): Promise<SubscriptionTier | null> {
  try {
    const getDgs = (window as any).getDigitalGoodsService;
    if (typeof getDgs !== "function") return null;
    const service = await getDgs("https://play.google.com/billing");
    if (!service || typeof service.listPurchases !== "function") return null;

    const purchases = await service.listPurchases();
    if (!Array.isArray(purchases) || purchases.length === 0) return null;

    const ownedSkus = new Set(purchases.map((p: any) => String(p.itemId || "")));
    if (
      ownedSkus.has("plano_pdv_total_mensal") ||
      ownedSkus.has("plano_pdv_total_quinzenal") ||
      ownedSkus.has("plano_pdv_total_semanal")
    ) {
      return "pdv_total";
    }
    if (
      ownedSkus.has("plano_gestao_mensal") ||
      ownedSkus.has("plano_gestao_quinzenal") ||
      ownedSkus.has("plano_gestao_semanal")
    ) {
      return "estoque_gestao";
    }
    if (
      ownedSkus.has("plano_pro_mensal") ||
      ownedSkus.has("plano_pro_quinzenal") ||
      ownedSkus.has("plano_pro_semanal")
    ) {
      return "pro_tools";
    }
    return null;
  } catch {
    return null;
  }
}
