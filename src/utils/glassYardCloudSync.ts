import { doc, getDoc, getDocFromServer, setDoc } from "firebase/firestore";
import { computeGlassCatalogSummary, roundWeightKg } from "./scrapHardwareHelper";

export interface SyncGlassYardResult {
  status: "pulled" | "pushed" | "up_to_date" | "no_cloud_data" | "offline_or_unauth" | "error";
  updatedAt?: number;
  totalUnits?: number;
  totalWeightKg?: number;
  message?: string;
}

export function normalizeGlassCatalogItem<
  T extends {
    id: string;
    name: string;
    unitWeightGrams?: number;
    unitWeightKg?: number;
    stockUnits?: number;
    additionalBarcodes?: string[];
  }
>(item: T): T & { unitWeightGrams: number; unitWeightKg: number; stockUnits: number; additionalBarcodes: string[] } {
  const rawGrams = Number(item.unitWeightGrams);
  const rawKg = Number(item.unitWeightKg);

  // Prioriza gramas cadastrados na balança digital; se ausente, converte de unitWeightKg
  let grams =
    Number.isFinite(rawGrams) && rawGrams > 0
      ? rawGrams
      : Number.isFinite(rawKg) && rawKg > 0
      ? rawKg * 1000
      : 200;

  grams = Math.max(0.01, Math.round(grams * 100) / 100);
  const kg = Math.max(0.00001, Number((grams / 1000).toFixed(5)));
  const stockUnits = Math.max(0, Math.round(Number(item.stockUnits) || 0));

  return {
    ...item,
    unitWeightGrams: grams,
    unitWeightKg: kg,
    stockUnits,
    additionalBarcodes: Array.isArray(item.additionalBarcodes) ? item.additionalBarcodes : []
  };
}

export function normalizeGlassCatalogList<
  T extends {
    id: string;
    name: string;
    unitWeightGrams?: number;
    unitWeightKg?: number;
    stockUnits?: number;
    additionalBarcodes?: string[];
  }
>(list: T[]): (T & { unitWeightGrams: number; unitWeightKg: number; stockUnits: number; additionalBarcodes: string[] })[] {
  if (!Array.isArray(list)) return [];
  return list.filter((b) => b && typeof b === "object" && b.id).map((b) => normalizeGlassCatalogItem(b));
}

function safeParseJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function readLocalGlassCatalog(): any[] {
  const raw =
    safeParseJson<any[]>("pdv_dw_glass_catalog_v10", []) ||
    safeParseJson<any[]>("pdv_dw_glass_catalog_v4", []);
  return Array.isArray(raw) ? normalizeGlassCatalogList(raw) : [];
}

export function getLocalGlassYardUpdatedAt(): number {
  try {
    const n = Number(localStorage.getItem("pdv_dw_last_updated_at"));
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function buildLocalGlassYardPayload(explicitTs?: number) {
  const catalog = readLocalGlassCatalog();
  const collaborators = safeParseJson<any[]>("pdv_dw_collaborators_accounts_v3", []);
  const purchaseHistory = safeParseJson<any[]>("pdv_dw_purchase_tickets_v3", []);
  const paymentHistory = safeParseJson<any[]>("pdv_dw_collaborator_payments_v3", []);
  const truckShipments = safeParseJson<any[]>("pdv_dw_truck_shipments_v3", []);
  const scrapSalesHistory = safeParseJson<any[]>("pdv_dw_scrap_sales_v1", []);
  const otherScrapMaterials = safeParseJson<any[]>("pdv_dw_other_scrap_materials_v1", []);

  let yardGoalKg = 3000;
  try {
    const g = Number(localStorage.getItem("pdv_dw_yard_goal_kg"));
    if (Number.isFinite(g) && g >= 100) yardGoalKg = g;
  } catch {}

  let sellPricePerTon = 150;
  try {
    const p1 = Number(localStorage.getItem("pdv_dw_sell_price_per_ton"));
    const p2 = Number(localStorage.getItem("pdv_glass_price_ton"));
    if (Number.isFinite(p1) && p1 >= 50) sellPricePerTon = p1;
    else if (Number.isFinite(p2) && p2 >= 50) sellPricePerTon = p2;
  } catch {}

  let caderninhoDefaultPayDate = "Dia 30 ou Bolsa Família (NIS 9) / Meta Usina";
  try {
    const d = localStorage.getItem("pdv_dw_caderninho_default_pay_date_v1");
    if (d && d.trim()) caderninhoDefaultPayDate = d;
  } catch {}

  const updatedAt = explicitTs || getLocalGlassYardUpdatedAt() || Date.now();

  return {
    updatedAt,
    catalog,
    collaborators: Array.isArray(collaborators) ? collaborators : [],
    purchaseHistory: Array.isArray(purchaseHistory) ? purchaseHistory.slice(0, 150) : [],
    paymentHistory: Array.isArray(paymentHistory) ? paymentHistory.slice(0, 150) : [],
    truckShipments: Array.isArray(truckShipments) ? truckShipments.slice(0, 50) : [],
    scrapSalesHistory: Array.isArray(scrapSalesHistory) ? scrapSalesHistory.slice(0, 150) : [],
    yardGoalKg,
    sellPricePerTon,
    otherScrapMaterials: Array.isArray(otherScrapMaterials) ? otherScrapMaterials : [],
    caderninhoDefaultPayDate
  };
}

export function hasMeaningfulGlassYardData(payload: any): boolean {
  if (!payload || typeof payload !== "object") return false;
  const catalog: any[] = Array.isArray(payload.catalog) ? payload.catalog : [];
  const hasBottleStock = catalog.some((b) => (Number(b?.stockUnits) || 0) > 0);
  if (hasBottleStock) return true;

  const tickets: any[] = Array.isArray(payload.purchaseHistory) ? payload.purchaseHistory : [];
  if (tickets.length > 0) return true;

  const payments: any[] = Array.isArray(payload.paymentHistory) ? payload.paymentHistory : [];
  if (payments.length > 0) return true;

  const shipments: any[] = Array.isArray(payload.truckShipments) ? payload.truckShipments : [];
  if (shipments.length > 0) return true;

  const scrapSales: any[] = Array.isArray(payload.scrapSalesHistory) ? payload.scrapSalesHistory : [];
  if (scrapSales.length > 0) return true;

  const otherScrap: any[] = Array.isArray(payload.otherScrapMaterials) ? payload.otherScrapMaterials : [];
  if (otherScrap.some((m) => (Number(m?.stockKg) || 0) > 0 || (Number(m?.stockUnits) || 0) > 0)) {
    return true;
  }

  return false;
}

export function applyCloudGlassYardToLocal(cloudYard: any): {
  updatedAt: number;
  normalizedCatalog: any[];
  totalUnits: number;
  totalWeightKg: number;
} {
  const cloudTs = Number(cloudYard?.updatedAt) || Date.now();
  let normalizedCatalog: any[] = [];

  try {
    localStorage.setItem("pdv_dw_glass_zero_clean_v10", "true");
    if (Array.isArray(cloudYard?.catalog) && cloudYard.catalog.length > 0) {
      normalizedCatalog = normalizeGlassCatalogList(cloudYard.catalog);
      localStorage.setItem("pdv_dw_glass_catalog_v10", JSON.stringify(normalizedCatalog));
    } else {
      normalizedCatalog = readLocalGlassCatalog();
    }

    if (Array.isArray(cloudYard?.collaborators) && cloudYard.collaborators.length > 0) {
      const sanitizedCollabs = cloudYard.collaborators.map((c: any) =>
        c?.isFounder ? { ...c, totalPaid: 0, balancePending: 0 } : c
      );
      localStorage.setItem("pdv_dw_collaborators_accounts_v3", JSON.stringify(sanitizedCollabs));
    }
    if (Array.isArray(cloudYard?.purchaseHistory)) {
      localStorage.setItem("pdv_dw_purchase_tickets_v3", JSON.stringify(cloudYard.purchaseHistory));
    }
    if (Array.isArray(cloudYard?.paymentHistory)) {
      localStorage.setItem("pdv_dw_collaborator_payments_v3", JSON.stringify(cloudYard.paymentHistory));
    }
    if (Array.isArray(cloudYard?.truckShipments)) {
      localStorage.setItem("pdv_dw_truck_shipments_v3", JSON.stringify(cloudYard.truckShipments));
    }
    if (Array.isArray(cloudYard?.scrapSalesHistory)) {
      localStorage.setItem("pdv_dw_scrap_sales_v1", JSON.stringify(cloudYard.scrapSalesHistory));
    }
    if (typeof cloudYard?.yardGoalKg === "number" && cloudYard.yardGoalKg >= 100) {
      localStorage.setItem("pdv_dw_yard_goal_kg", String(cloudYard.yardGoalKg));
    }
    if (typeof cloudYard?.sellPricePerTon === "number" && cloudYard.sellPricePerTon >= 50) {
      localStorage.setItem("pdv_dw_sell_price_per_ton", String(cloudYard.sellPricePerTon));
      localStorage.setItem("pdv_glass_price_ton", String(cloudYard.sellPricePerTon));
    }
    if (typeof cloudYard?.caderninhoDefaultPayDate === "string" && cloudYard.caderninhoDefaultPayDate.trim()) {
      localStorage.setItem("pdv_dw_caderninho_default_pay_date_v1", cloudYard.caderninhoDefaultPayDate);
    }
    if (Array.isArray(cloudYard?.otherScrapMaterials) && cloudYard.otherScrapMaterials.length > 0) {
      localStorage.setItem("pdv_dw_other_scrap_materials_v1", JSON.stringify(cloudYard.otherScrapMaterials));
    }
    localStorage.setItem("pdv_dw_last_updated_at", String(cloudTs));
  } catch {}

  const sellPerTon = Number(cloudYard?.sellPricePerTon) || Number(localStorage.getItem("pdv_dw_sell_price_per_ton")) || 150;
  const summary = computeGlassCatalogSummary(normalizedCatalog, sellPerTon / 1000);

  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new CustomEvent("dw_glass_catalog_updated", { detail: normalizedCatalog }));
      window.dispatchEvent(
        new CustomEvent("dw_glass_yard_updated", {
          detail: {
            fromCloud: true,
            updatedAt: cloudTs,
            payload: {
              ...cloudYard,
              catalog: normalizedCatalog,
              updatedAt: cloudTs
            }
          }
        })
      );
    } catch {}
  }

  return {
    updatedAt: cloudTs,
    normalizedCatalog,
    totalUnits: summary.totalUnits,
    totalWeightKg: roundWeightKg(summary.totalWeightKg)
  };
}

export async function syncGlassYardWithCloud({
  db,
  uid,
  mode = "auto"
}: {
  db: any;
  uid?: string | null;
  mode?: "auto" | "pull" | "push";
}): Promise<SyncGlassYardResult> {
  if (!db || !uid || uid === "guest_visitor") {
    return {
      status: "offline_or_unauth",
      message: "Entre na sua conta Google para sincronizar os pátios na nuvem."
    };
  }

  const userDocRef = doc(db, "userData", uid);

  try {
    if (mode === "push") {
      const now = Date.now();
      const payload = buildLocalGlassYardPayload(now);
      try {
        localStorage.setItem("pdv_dw_last_updated_at", String(now));
      } catch {}
      await setDoc(
        userDocRef,
        {
          userId: uid,
          dwGlassYardData: payload
        },
        { merge: true }
      );
      const summary = computeGlassCatalogSummary(payload.catalog, payload.sellPricePerTon / 1000);
      return {
        status: "pushed",
        updatedAt: now,
        totalUnits: summary.totalUnits,
        totalWeightKg: summary.totalWeightKg,
        message: `Pátio enviado para a nuvem (${summary.totalUnits} un • ${summary.totalWeightKg.toFixed(1)} kg).`
      };
    }

    let snap;
    try {
      snap = await getDocFromServer(userDocRef);
    } catch {
      snap = await getDoc(userDocRef);
    }

    const cloudYard = snap.exists() ? snap.data()?.dwGlassYardData : null;
    const localTs = getLocalGlassYardUpdatedAt();
    const localPayload = buildLocalGlassYardPayload(localTs || undefined);
    const localHasData = hasMeaningfulGlassYardData(localPayload);

    if (mode === "pull") {
      if (!cloudYard || typeof cloudYard !== "object") {
        return {
          status: "no_cloud_data",
          message: "Ainda não há dados do Pátio salvos na nuvem para esta conta."
        };
      }
      const applied = applyCloudGlassYardToLocal(cloudYard);
      return {
        status: "pulled",
        updatedAt: applied.updatedAt,
        totalUnits: applied.totalUnits,
        totalWeightKg: applied.totalWeightKg,
        message: `Pátio carregado da nuvem: ${applied.totalUnits} garrafas (${applied.totalWeightKg.toFixed(1)} kg)!`
      };
    }

    // mode === "auto"
    if (!cloudYard || typeof cloudYard !== "object") {
      if (localHasData || localTs > 0) {
        const tsToUse = localTs || Date.now();
        const payload = buildLocalGlassYardPayload(tsToUse);
        try {
          localStorage.setItem("pdv_dw_last_updated_at", String(tsToUse));
        } catch {}
        await setDoc(
          userDocRef,
          {
            userId: uid,
            dwGlassYardData: payload
          },
          { merge: true }
        );
        const summary = computeGlassCatalogSummary(payload.catalog, payload.sellPricePerTon / 1000);
        return {
          status: "pushed",
          updatedAt: tsToUse,
          totalUnits: summary.totalUnits,
          totalWeightKg: summary.totalWeightKg
        };
      }
      return { status: "no_cloud_data" };
    }

    const cloudTs = Number(cloudYard.updatedAt) || 0;
    const cloudHasData = hasMeaningfulGlassYardData(cloudYard);

    // Se a nuvem é mais recente, OU se o aparelho atual está zerado enquanto a nuvem tem dados reais -> puxa da nuvem!
    if (cloudTs > localTs || (!localHasData && cloudHasData)) {
      const applied = applyCloudGlassYardToLocal(cloudYard);
      return {
        status: "pulled",
        updatedAt: applied.updatedAt,
        totalUnits: applied.totalUnits,
        totalWeightKg: applied.totalWeightKg,
        message: `Pátio sincronizado da nuvem: ${applied.totalUnits} garrafas (${applied.totalWeightKg.toFixed(1)} kg)!`
      };
    }

    if (localTs > cloudTs || (localHasData && !cloudHasData)) {
      const tsToUse = localTs || Date.now();
      const payload = buildLocalGlassYardPayload(tsToUse);
      try {
        localStorage.setItem("pdv_dw_last_updated_at", String(tsToUse));
      } catch {}
      await setDoc(
        userDocRef,
        {
          userId: uid,
          dwGlassYardData: payload
        },
        { merge: true }
      );
      const summary = computeGlassCatalogSummary(payload.catalog, payload.sellPricePerTon / 1000);
      return {
        status: "pushed",
        updatedAt: tsToUse,
        totalUnits: summary.totalUnits,
        totalWeightKg: summary.totalWeightKg
      };
    }

    const summary = computeGlassCatalogSummary(localPayload.catalog, localPayload.sellPricePerTon / 1000);
    return {
      status: "up_to_date",
      updatedAt: cloudTs,
      totalUnits: summary.totalUnits,
      totalWeightKg: summary.totalWeightKg,
      message: `Pátio já está sincronizado (${summary.totalUnits} garrafas • ${summary.totalWeightKg.toFixed(1)} kg).`
    };
  } catch (err: any) {
    console.warn("Erro ao sincronizar Pátio na nuvem:", err);
    return {
      status: "error",
      message: "Não foi possível conectar à nuvem agora. Verifique sua internet."
    };
  }
}
