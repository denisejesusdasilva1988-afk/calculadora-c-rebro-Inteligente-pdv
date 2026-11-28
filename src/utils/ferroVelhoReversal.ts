export interface FerroVelhoReversalResult {
  reversed: boolean;
  kind?: "purchase" | "payment" | "sale";
  summary?: string;
}

const STORAGE_KEYS = {
  catalog: "pdv_dw_glass_catalog_v10",
  collaborators: "pdv_dw_collaborators_accounts_v3",
  purchases: "pdv_dw_purchase_tickets_v3",
  payments: "pdv_dw_collaborator_payments_v3",
  otherScrap: "pdv_dw_other_scrap_materials_v1",
  scrapSales: "pdv_dw_scrap_sales_v1",
  lastUpdated: "pdv_dw_last_updated_at"
};

/**
 * Reverte diretamente no localStorage um lançamento originado no Pátio de Vidros ou Ferro Velho
 * quando o lançamento correspondente é estornado no Caixa/Devolução do PDV mesmo com a tela
 * do Ferro Velho fechada (desmontada).
 */
export function reverseFerroVelhoEventInStorage(
  eventId: string,
  reason?: string
): FerroVelhoReversalResult {
  if (!eventId || typeof window === "undefined") {
    return { reversed: false };
  }

  const cleanReason = reason?.trim() || "Estornado pelo Caixa/Devolução do PDV";
  const cancelledAt = new Date().toLocaleString("pt-BR");

  try {
    // 1. Tenta localizar compra de Vidros ou Ferro Velho (pdv_fv_scrap_* ou pdv_fv_buy_*)
    const purchasesRaw = localStorage.getItem(STORAGE_KEYS.purchases);
    const purchases: any[] = purchasesRaw ? JSON.parse(purchasesRaw) : [];
    if (Array.isArray(purchases)) {
      const targetIdx = purchases.findIndex(
        (t) =>
          t &&
          !t.isCancelled &&
          (t.syncedPdvEventId === eventId ||
            `pdv_fv_scrap_${t.id}` === eventId ||
            `pdv_fv_buy_${t.id}` === eventId)
      );

      if (targetIdx >= 0) {
        const ticket = purchases[targetIdx];
        const items: any[] = Array.isArray(ticket.items) ? ticket.items : [];

        // 1a. Reverter estoque (Ferro Velho ou Vidros)
        if (ticket.isScrapPurchase) {
          const scrapRaw = localStorage.getItem(STORAGE_KEYS.otherScrap);
          const scraps: any[] = scrapRaw ? JSON.parse(scrapRaw) : [];
          if (Array.isArray(scraps) && scraps.length > 0) {
            const nextScraps = scraps.map((m) => {
              const matched = items.filter((it) => {
                if (it.addedToStock === false) return false;
                if (it.materialId) return it.materialId === m.id;
                return String(it.name || "").toLowerCase().includes(String(m.name || "").toLowerCase());
              });
              if (matched.length === 0) return m;
              const deductKg = matched.reduce((s, it) => s + Math.max(0, Number(it.totalWeightKg) || 0), 0);
              const deductUn = matched.reduce((s, it) => s + Math.max(0, Number(it.stockUnitsAdded) || 0), 0);
              return {
                ...m,
                stockKg: Math.max(0, Number(((Number(m.stockKg) || 0) - deductKg).toFixed(3))),
                stockUnits: Math.max(0, (Number(m.stockUnits) || 0) - deductUn)
              };
            });
            localStorage.setItem(STORAGE_KEYS.otherScrap, JSON.stringify(nextScraps));
          }
        } else {
          const catRaw = localStorage.getItem(STORAGE_KEYS.catalog);
          const catalog: any[] = catRaw ? JSON.parse(catRaw) : [];
          if (Array.isArray(catalog) && catalog.length > 0) {
            const nextCatalog = catalog.map((b) => {
              const matched = items.filter(
                (it) =>
                  (it.barcode &&
                    it.barcode !== "BALANCA" &&
                    (b.barcode === it.barcode ||
                      (Array.isArray(b.additionalBarcodes) && b.additionalBarcodes.includes(it.barcode)))) ||
                  (b.name === it.name && b.volumeMl === it.volumeMl)
              );
              if (matched.length === 0) return b;
              const deductUnits = matched.reduce((s, it) => s + Math.max(0, Number(it.quantity) || 0), 0);
              return {
                ...b,
                stockUnits: Math.max(0, (Number(b.stockUnits) || 0) - deductUnits)
              };
            });
            localStorage.setItem(STORAGE_KEYS.catalog, JSON.stringify(nextCatalog));
          }
        }

        // 1b. Reverter Caderninho do Colaborador
        const collabRaw = localStorage.getItem(STORAGE_KEYS.collaborators);
        const collabs: any[] = collabRaw ? JSON.parse(collabRaw) : [];
        if (Array.isArray(collabs) && collabs.length > 0) {
          const nextCollabs = collabs.map((c) => {
            const matches =
              (ticket.collaboratorId && c.id === ticket.collaboratorId) ||
              (!ticket.collaboratorId &&
                String(c.name || "").toLowerCase() === String(ticket.collectorName || "").toLowerCase());
            if (!matches) return c;

            const founderBase = items.reduce((s, it) => s + (Number(it.costPaid) || 0), 0);
            const founderEquiv = Math.max(
              0,
              founderBase + (Number(ticket.bonusAmount) || 0) - (Number(ticket.discountAmount) || 0)
            );
            const revertEarnedAmt = c.isFounder ? founderEquiv : Number(ticket.totalPaid) || 0;
            const newDeliveries = Math.max(0, (Number(c.totalDeliveries) || 0) - 1);
            const newBottles = Math.max(0, (Number(c.totalBottles) || 0) - (Number(ticket.totalBottles) || 0));
            const newWeight = Math.max(
              0,
              Number(((Number(c.totalWeightKg) || 0) - (Number(ticket.totalWeightKg) || 0)).toFixed(3))
            );
            const newEarned = Math.max(0, Number(((Number(c.totalEarned) || 0) - revertEarnedAmt).toFixed(2)));

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

            const revertPaidAmt = ticket.paymentStatus === "pago_na_hora" ? Number(ticket.totalPaid) || 0 : 0;
            const newPaid = Math.max(0, Number(((Number(c.totalPaid) || 0) - revertPaidAmt).toFixed(2)));
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
          });
          localStorage.setItem(STORAGE_KEYS.collaborators, JSON.stringify(nextCollabs));
        }

        // 1c. Marcar recibo como cancelado
        const nextPurchases = purchases.map((t, idx) =>
          idx === targetIdx ? { ...t, isCancelled: true, cancelledAt, cancelReason: cleanReason } : t
        );
        localStorage.setItem(STORAGE_KEYS.purchases, JSON.stringify(nextPurchases));
        localStorage.setItem(STORAGE_KEYS.lastUpdated, String(Date.now()));
        window.dispatchEvent(new CustomEvent("dw_glass_yard_updated"));

        const itemsArr = Array.isArray(ticket.items) ? ticket.items : [];
        let kgSum = 0;
        let litersSum = 0;
        for (const it of itemsArr) {
          const q = Math.max(0, Number(it?.totalWeightKg) || 0);
          const isOil =
            it?.unitLabel === "L" ||
            it?.materialId === "scrap_oleo" ||
            /(\bóleo\b|\boleo\b|\(litro\)|litros?\b|\b\/l\b)/i.test(String(it?.name || ""));
          if (isOil) litersSum += q;
          else kgSum += q;
        }
        if (itemsArr.length === 0) {
          kgSum = Number(ticket.totalWeightKg) || 0;
        }
        const qtyParts: string[] = [];
        if (kgSum > 0 || litersSum === 0) qtyParts.push(`-${kgSum.toFixed(3).replace(".", ",")} kg`);
        if (litersSum > 0) qtyParts.push(`-${litersSum.toFixed(3).replace(".", ",")} L óleo`);

        return {
          reversed: true,
          kind: "purchase",
          summary: `${ticket.collectorName || "Compra"} (${qtyParts.join(" + ")})`
        };
      }
    }

    // 2. Tenta localizar Acerto de Caderninho (pdv_fv_pay_*)
    const paymentsRaw = localStorage.getItem(STORAGE_KEYS.payments);
    const payments: any[] = paymentsRaw ? JSON.parse(paymentsRaw) : [];
    if (Array.isArray(payments)) {
      const payIdx = payments.findIndex(
        (p) => p && !p.isCancelled && (p.syncedPdvEventId === eventId || `pdv_fv_pay_${p.id}` === eventId)
      );
      if (payIdx >= 0) {
        const pay = payments[payIdx];
        const collabRaw = localStorage.getItem(STORAGE_KEYS.collaborators);
        const collabs: any[] = collabRaw ? JSON.parse(collabRaw) : [];
        if (Array.isArray(collabs) && collabs.length > 0) {
          const nextCollabs = collabs.map((c) => {
            if (c.id !== pay.collaboratorId) return c;
            const newPaid = Math.max(0, Number(((Number(c.totalPaid) || 0) - (Number(pay.amountPaid) || 0)).toFixed(2)));
            const newPending = Math.max(0, Number(((Number(c.totalEarned) || 0) - newPaid).toFixed(2)));
            return {
              ...c,
              totalPaid: newPaid,
              balancePending: newPending
            };
          });
          localStorage.setItem(STORAGE_KEYS.collaborators, JSON.stringify(nextCollabs));
        }
        const nextPayments = payments.map((p, idx) =>
          idx === payIdx ? { ...p, isCancelled: true, cancelledAt, cancelReason: cleanReason } : p
        );
        localStorage.setItem(STORAGE_KEYS.payments, JSON.stringify(nextPayments));
        localStorage.setItem(STORAGE_KEYS.lastUpdated, String(Date.now()));
        window.dispatchEvent(new CustomEvent("dw_glass_yard_updated"));
        return { reversed: true, kind: "payment", summary: pay.collaboratorName || "Acerto" };
      }
    }

    // 3. Tenta localizar Venda de Sucata (pdv_fv_sale_*)
    const salesRaw = localStorage.getItem(STORAGE_KEYS.scrapSales);
    const sales: any[] = salesRaw ? JSON.parse(salesRaw) : [];
    if (Array.isArray(sales)) {
      const saleIdx = sales.findIndex(
        (s) => s && !s.isCancelled && (s.syncedPdvEventId === eventId || `pdv_fv_sale_${s.id}` === eventId)
      );
      if (saleIdx >= 0) {
        const sale = sales[saleIdx];
        const scrapRaw = localStorage.getItem(STORAGE_KEYS.otherScrap);
        const scraps: any[] = scrapRaw ? JSON.parse(scrapRaw) : [];
        if (Array.isArray(scraps) && scraps.length > 0) {
          const nextScraps = scraps.map((m) =>
            m.id === sale.materialId
              ? {
                  ...m,
                  stockKg: Number(((Number(m.stockKg) || 0) + (Number(sale.weightKg) || 0)).toFixed(3)),
                  stockUnits: (Number(m.stockUnits) || 0) + (Number(sale.units) || 0)
                }
              : m
          );
          localStorage.setItem(STORAGE_KEYS.otherScrap, JSON.stringify(nextScraps));
        }
        const nextSales = sales.map((s, idx) =>
          idx === saleIdx ? { ...s, isCancelled: true, cancelledAt, cancelReason: cleanReason } : s
        );
        localStorage.setItem(STORAGE_KEYS.scrapSales, JSON.stringify(nextSales));
        localStorage.setItem(STORAGE_KEYS.lastUpdated, String(Date.now()));
        window.dispatchEvent(new CustomEvent("dw_glass_yard_updated"));
        return { reversed: true, kind: "sale", summary: sale.materialName || "Venda Sucata" };
      }
    }
  } catch {}

  return { reversed: false };
}
