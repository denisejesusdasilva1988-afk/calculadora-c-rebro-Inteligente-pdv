import {
  formatBrl,
  formatWeightKgDetailed,
  getTicketEffectiveMonetaryValue,
  resolveScrapMaterialUnit,
  roundCurrencyBrl,
  roundWeightKg,
  ScrapUnitType,
  splitTicketKgAndLiters
} from "./scrapHardwareHelper";
import { ThermalCanvasReceiptPayload } from "./thermalPrinterHelper";

export type ReportPeriodFilter = "hoje" | "ontem" | "7dias" | "mes" | "tudo" | "data_especifica";
export type ReportSectorFilter = "todos" | "ferro_velho" | "vidros";

export interface ReportBottleCatalogItem {
  id: string;
  name: string;
  emoji: string;
  unitWeightGrams: number;
  stockUnits: number;
  buyPricePerUnit: number;
}

export interface ReportScrapMaterialItem {
  id: string;
  name: string;
  emoji: string;
  unitType?: ScrapUnitType;
  stockKg: number;
  stockUnits?: number;
  buyPricePerKg: number;
  sellPricePerKg?: number;
}

export interface ReportPurchaseTicket {
  id: string;
  timestamp: string;
  collectorName: string;
  collaboratorId?: string;
  isFounder: boolean;
  isScrapPurchase?: boolean;
  isCancelled?: boolean;
  items: {
    name: string;
    quantity: number;
    totalWeightKg: number;
    costPaid: number;
    materialId?: string;
    unitLabel?: ScrapUnitType;
  }[];
  totalBottles: number;
  totalWeightKg: number;
  totalLiters?: number;
  bonusAmount?: number;
  discountAmount?: number;
  totalPaid: number;
  expectedPlantRevenue: number;
  netProfit: number;
  paymentStatus: string;
}

export interface ReportScrapSaleRecord {
  id: string;
  timestamp: string;
  materialId: string;
  materialName: string;
  emoji: string;
  unitType?: ScrapUnitType;
  weightKg: number;
  units: number;
  buyPricePerKgAtSale: number;
  estimatedBuyCost: number;
  sellPricePerKgActual: number;
  revenueReceived: number;
  profitAmount: number;
  buyerName: string;
  paymentMethod: string;
  originType?: "misto" | "compra" | "coleta_propria";
  batchId?: string;
  isCancelled?: boolean;
}

export interface ReportPaymentReceipt {
  id: string;
  timestamp: string;
  collaboratorId: string;
  collaboratorName: string;
  amountPaid: number;
  methodLabel: string;
  notes: string;
  sector?: "vidros" | "ferro_velho" | "geral";
  isCancelled?: boolean;
}

export interface ReportTruckShipment {
  id: string;
  timestamp: string;
  buyerName: string;
  totalBottles: number;
  totalWeightKg: number;
  totalWeightTon: number;
  grossRevenueReceived: number;
  summaryText: string;
}

export function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getOffsetDateKey(daysAgo: number, baseDate: Date = new Date()): string {
  const d = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  d.setDate(d.getDate() - daysAgo);
  return toLocalDateKey(d);
}

export function formatDateKeyToPtBr(dateKey: string): string {
  const match = String(dateKey || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return dateKey;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

export function parsePtBrDateKey(timestamp?: string, fallbackId?: string): string {
  const raw = String(timestamp || "").trim();
  // Tenta extrair DD/MM/YYYY de timestamps pt-BR ("22/11/2026, 15:02:10" ou "22/11/2026")
  const brMatch = raw.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (brMatch) {
    const day = brMatch[1].padStart(2, "0");
    const month = brMatch[2].padStart(2, "0");
    const year = brMatch[3];
    return `${year}-${month}-${day}`;
  }
  // Tenta formato ISO (YYYY-MM-DD)
  const isoMatch = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }
  // Fallback via epoch embutido no ID (ex: ticket_scrap_1763..., scrap_sale_1763..., pay_1763...)
  if (fallbackId) {
    const epochMatch = String(fallbackId).match(/(\d{13})/);
    if (epochMatch) {
      const ms = Number(epochMatch[1]);
      if (Number.isFinite(ms) && ms > 1577836800000) {
        return toLocalDateKey(new Date(ms));
      }
    }
  }
  return toLocalDateKey(new Date());
}

export function matchesReportPeriod(
  dateKey: string,
  period: ReportPeriodFilter,
  customDateKey: string,
  now: Date = new Date()
): boolean {
  if (period === "tudo") return true;
  const todayKey = toLocalDateKey(now);
  if (period === "hoje") return dateKey === todayKey;
  if (period === "ontem") return dateKey === getOffsetDateKey(1, now);
  if (period === "data_especifica") {
    return customDateKey ? dateKey === customDateKey : dateKey === todayKey;
  }
  if (period === "7dias") {
    const minKey = getOffsetDateKey(6, now);
    return dateKey >= minKey && dateKey <= todayKey;
  }
  if (period === "mes") {
    return dateKey.slice(0, 7) === todayKey.slice(0, 7);
  }
  return true;
}

export interface MaterialReportRow {
  id: string;
  name: string;
  emoji: string;
  unitType: ScrapUnitType;
  sector: "ferro_velho" | "vidros";
  enteredKg: number;
  enteredUnits: number;
  ownKg: number;
  own100Value: number;
  collabKg: number;
  spentBuying: number;
  soldKg: number;
  soldUnits: number;
  soldRevenue: number;
  soldCost: number;
  soldProfit: number;
  remainingStockKg: number;
  remainingStockUnits: number;
  remainingResaleValue: number;
}

export interface ReportTimelineItem {
  id: string;
  dateKey: string;
  timestamp: string;
  kind: "entrada_compra" | "entrada_propria" | "venda_baixa" | "acerto_caderninho";
  sector: "ferro_velho" | "vidros" | "geral";
  title: string;
  subtitle: string;
  weightKg: number;
  liters?: number;
  units: number;
  amount: number;
  profitAmount?: number;
  isOwn100?: boolean;
}

export interface ComputedRecyclingReport {
  period: ReportPeriodFilter;
  periodLabel: string;
  sectorFilter: ReportSectorFilter;
  todayKey: string;
  activeDateKeys: string[];
  // Entradas Acumuladas
  totalEnteredKg: number;
  enteredLiters: number;
  enteredGlassKg: number;
  enteredGlassUnits: number;
  enteredScrapKg: number;
  enteredScrapUnits: number;
  entriesCount: number;
  // Compras de Colaboradores (Gastos)
  collabEntriesCount: number;
  collabEnteredKg: number;
  collabEnteredLiters: number;
  collabGlassUnits: number;
  collabScrapUnits: number;
  collabSpentTotal: number;
  collabPaidImmediate: number;
  collabAddedCaderninho: number;
  caderninhoSettlementsCount: number;
  caderninhoSettlementsPaid: number;
  totalCashPaidOut: number; // Pago na hora + acertos pagos do caderninho
  // Coletas Próprias (100% Lucro)
  ownEntriesCount: number;
  ownEnteredKg: number;
  ownEnteredLiters: number;
  ownGlassUnits: number;
  ownScrapUnits: number;
  own100PercentValue: number;
  // Vendas / Baixas / Revendas
  salesCount: number;
  soldScrapKg: number;
  soldLiters: number;
  soldScrapUnits: number;
  soldScrapRevenue: number;
  soldScrapCost: number;
  soldScrapProfit: number;
  soldGlassKg: number;
  soldGlassUnits: number;
  soldGlassRevenue: number;
  soldTotalKg: number;
  soldTotalUnits: number;
  soldTotalRevenue: number;
  soldTotalProfit: number;
  // Estoque Atual Hoje (O que tem no dia agora)
  currentScrapStockKg: number;
  currentStockLiters: number;
  currentScrapStockUnits: number;
  currentScrapBuyCost: number;
  currentScrapResaleValue: number;
  currentScrapExpectedProfit: number;
  currentGlassStockKg: number;
  currentGlassStockUnits: number;
  currentGlassUsinaValue: number;
  currentTotalStockKg: number;
  currentTotalStockResaleValue: number;
  // Balanço Líquido Consolidado
  netPeriodBalance: number; // Entrou em Vendas - Total Gasto Comprando (ou Pago Out)
  cashFlowBalance: number; // Entrou em Vendas - Dinheiro que saiu pagando (na hora + acertos)
  totalCombinedProfit: number; // Lucro nas vendas + Coletas Próprias 100% não vendidas/ou já somadas claramente
  materialRows: MaterialReportRow[];
  timeline: ReportTimelineItem[];
}

export function computeRecyclingPeriodReport({
  purchaseHistory,
  scrapSalesHistory,
  paymentHistory,
  truckShipments,
  catalog,
  otherScrapMaterials,
  period,
  customDateKey,
  sectorFilter,
  sellPricePerKg,
  now = new Date()
}: {
  purchaseHistory: ReportPurchaseTicket[];
  scrapSalesHistory: ReportScrapSaleRecord[];
  paymentHistory: ReportPaymentReceipt[];
  truckShipments: ReportTruckShipment[];
  catalog: ReportBottleCatalogItem[];
  otherScrapMaterials: ReportScrapMaterialItem[];
  period: ReportPeriodFilter;
  customDateKey: string;
  sectorFilter: ReportSectorFilter;
  sellPricePerKg: number;
  now?: Date;
}): ComputedRecyclingReport {
  const todayKey = toLocalDateKey(now);
  const yesterdayKey = getOffsetDateKey(1, now);

  let periodLabel = "Hoje";
  if (period === "hoje") periodLabel = `Hoje (${formatDateKeyToPtBr(todayKey)})`;
  else if (period === "ontem") periodLabel = `Ontem (${formatDateKeyToPtBr(yesterdayKey)})`;
  else if (period === "7dias") periodLabel = "Últimos 7 Dias";
  else if (period === "mes") periodLabel = `Mês Atual (${todayKey.slice(5, 7)}/${todayKey.slice(0, 4)})`;
  else if (period === "tudo") periodLabel = "Acumulado Geral (Todo o Período)";
  else if (period === "data_especifica") {
    periodLabel = `Dia ${formatDateKeyToPtBr(customDateKey || todayKey)}`;
  }

  const activeDateSet = new Set<string>();
  const activePurchasesAll = purchaseHistory.filter((t) => !t.isCancelled);
  const activeSalesAll = scrapSalesHistory.filter((s) => !s.isCancelled);
  const activePaymentsAll = paymentHistory.filter((p) => !p.isCancelled);

  activePurchasesAll.forEach((t) => activeDateSet.add(parsePtBrDateKey(t.timestamp, t.id)));
  activeSalesAll.forEach((s) => activeDateSet.add(parsePtBrDateKey(s.timestamp, s.id)));
  activePaymentsAll.forEach((p) => activeDateSet.add(parsePtBrDateKey(p.timestamp, p.id)));
  truckShipments.forEach((sh) => activeDateSet.add(parsePtBrDateKey(sh.timestamp, sh.id)));

  const activeDateKeys = Array.from(activeDateSet).sort((a, b) => (a < b ? 1 : -1));

  const matchesSectorTicket = (isScrap?: boolean) => {
    if (sectorFilter === "todos") return true;
    return sectorFilter === "ferro_velho" ? Boolean(isScrap) : !isScrap;
  };

  const filteredPurchases = activePurchasesAll.filter((t) => {
    if (!matchesSectorTicket(t.isScrapPurchase)) return false;
    const dk = parsePtBrDateKey(t.timestamp, t.id);
    return matchesReportPeriod(dk, period, customDateKey, now);
  });

  const filteredScrapSales =
    sectorFilter === "vidros"
      ? []
      : activeSalesAll.filter((s) => {
          const dk = parsePtBrDateKey(s.timestamp, s.id);
          return matchesReportPeriod(dk, period, customDateKey, now);
        });

  const filteredShipments =
    sectorFilter === "ferro_velho"
      ? []
      : truckShipments.filter((sh) => {
          const dk = parsePtBrDateKey(sh.timestamp, sh.id);
          return matchesReportPeriod(dk, period, customDateKey, now);
        });

  const filteredPayments = activePaymentsAll.filter((p) => {
    if (sectorFilter !== "todos" && p.sector && p.sector !== "geral" && p.sector !== sectorFilter) {
      return false;
    }
    const dk = parsePtBrDateKey(p.timestamp, p.id);
    return matchesReportPeriod(dk, period, customDateKey, now);
  });

  // Inicializa mapa de materiais para consolidar entradas, baixas e estoque atual
  const rowMap = new Map<string, MaterialReportRow>();

  const ensureScrapRow = (matId: string, name: string, emoji: string, unitHint?: ScrapUnitType): MaterialReportRow => {
    const key = `fv:${matId}`;
    const existing = rowMap.get(key);
    if (existing) return existing;
    const matObj = otherScrapMaterials.find((m) => m.id === matId);
    const resolvedUnit = resolveScrapMaterialUnit({
      unitType: matObj?.unitType || unitHint,
      id: matObj?.id || matId,
      name: matObj?.name || name
    });
    const remKg = roundWeightKg(Number(matObj?.stockKg) || 0);
    const remUn = Math.max(0, Math.round(Number(matObj?.stockUnits) || 0));
    const sellP = Math.max(0, Number(matObj?.sellPricePerKg) || 0);
    const row: MaterialReportRow = {
      id: key,
      name: matObj?.name || name,
      emoji: matObj?.emoji || emoji || "♻️",
      unitType: resolvedUnit,
      sector: "ferro_velho",
      enteredKg: 0,
      enteredUnits: 0,
      ownKg: 0,
      own100Value: 0,
      collabKg: 0,
      spentBuying: 0,
      soldKg: 0,
      soldUnits: 0,
      soldRevenue: 0,
      soldCost: 0,
      soldProfit: 0,
      remainingStockKg: remKg,
      remainingStockUnits: remUn,
      remainingResaleValue: roundCurrencyBrl(remKg * sellP)
    };
    rowMap.set(key, row);
    return row;
  };

  if (sectorFilter !== "vidros") {
    otherScrapMaterials.forEach((m) => {
      ensureScrapRow(m.id, m.name, m.emoji, m.unitType);
    });
  }

  let totalEnteredKg = 0;
  let enteredLiters = 0;
  let enteredGlassKg = 0;
  let enteredGlassUnits = 0;
  let enteredScrapKg = 0;
  let enteredScrapUnits = 0;

  let collabEntriesCount = 0;
  let collabEnteredKg = 0;
  let collabEnteredLiters = 0;
  let collabGlassUnits = 0;
  let collabScrapUnits = 0;
  let collabSpentTotal = 0;
  let collabPaidImmediate = 0;
  let collabAddedCaderninho = 0;

  let ownEntriesCount = 0;
  let ownEnteredKg = 0;
  let ownEnteredLiters = 0;
  let ownGlassUnits = 0;
  let ownScrapUnits = 0;
  let own100PercentValue = 0;

  const timeline: ReportTimelineItem[] = [];

  // Processar Entradas (Compras + Coletas Próprias)
  filteredPurchases.forEach((tk) => {
    const dk = parsePtBrDateKey(tk.timestamp, tk.id);
    const isScrap = Boolean(tk.isScrapPurchase);
    const split = isScrap
      ? splitTicketKgAndLiters(tk.items || [], Number(tk.totalWeightKg) || 0)
      : { kgTotal: roundWeightKg(Number(tk.totalWeightKg) || 0), litersTotal: 0 };
    const tkKg = split.kgTotal;
    const tkLiters = split.litersTotal;
    const tkUnits = Math.max(0, Math.round(Number(tk.totalBottles) || 0));
    const effectiveVal = getTicketEffectiveMonetaryValue(tk);

    totalEnteredKg = roundWeightKg(totalEnteredKg + tkKg);
    enteredLiters = roundWeightKg(enteredLiters + tkLiters);
    if (isScrap) {
      enteredScrapKg = roundWeightKg(enteredScrapKg + tkKg);
      enteredScrapUnits += tkUnits;
    } else {
      enteredGlassKg = roundWeightKg(enteredGlassKg + tkKg);
      enteredGlassUnits += tkUnits;
    }

    if (tk.isFounder) {
      ownEntriesCount += 1;
      ownEnteredKg = roundWeightKg(ownEnteredKg + tkKg);
      ownEnteredLiters = roundWeightKg(ownEnteredLiters + tkLiters);
      if (isScrap) ownScrapUnits += tkUnits;
      else ownGlassUnits += tkUnits;
      own100PercentValue = roundCurrencyBrl(own100PercentValue + effectiveVal);

      timeline.push({
        id: tk.id,
        dateKey: dk,
        timestamp: tk.timestamp,
        kind: "entrada_propria",
        sector: isScrap ? "ferro_velho" : "vidros",
        title: `👑 Coleta Própria (100%): ${tk.collectorName}`,
        subtitle: tk.items.map((i) => i.name.replace(/\s*\(R\$\s*[\d.,]+\/(?:kg|L)\)/gi, "").trim()).join(" + "),
        weightKg: tkKg,
        liters: tkLiters,
        units: tkUnits,
        amount: effectiveVal,
        profitAmount: effectiveVal,
        isOwn100: true
      });
    } else {
      collabEntriesCount += 1;
      collabEnteredKg = roundWeightKg(collabEnteredKg + tkKg);
      collabEnteredLiters = roundWeightKg(collabEnteredLiters + tkLiters);
      if (isScrap) collabScrapUnits += tkUnits;
      else collabGlassUnits += tkUnits;
      const paidVal = roundCurrencyBrl(Number(tk.totalPaid) || 0);
      collabSpentTotal = roundCurrencyBrl(collabSpentTotal + paidVal);
      if (tk.paymentStatus === "pago_na_hora") {
        collabPaidImmediate = roundCurrencyBrl(collabPaidImmediate + paidVal);
      } else {
        collabAddedCaderninho = roundCurrencyBrl(collabAddedCaderninho + paidVal);
      }

      timeline.push({
        id: tk.id,
        dateKey: dk,
        timestamp: tk.timestamp,
        kind: "entrada_compra",
        sector: isScrap ? "ferro_velho" : "vidros",
        title: `👤 Compra: ${tk.collectorName}`,
        subtitle: `${
          tk.paymentStatus === "pago_na_hora" ? "Pago na hora" : "Caderninho"
        } · ${tk.items.map((i) => i.name.replace(/\s*\(R\$\s*[\d.,]+\/(?:kg|L)\)/gi, "").trim()).join(" + ")}`,
        weightKg: tkKg,
        liters: tkLiters,
        units: tkUnits,
        amount: paidVal
      });
    }

    // Atualizar breakdown por material
    if (isScrap) {
      tk.items.forEach((it) => {
        const matchedMat =
          (it.materialId && otherScrapMaterials.find((m) => m.id === it.materialId)) ||
          otherScrapMaterials.find((m) => it.name.toLowerCase().includes(m.name.toLowerCase()));
        const matId = matchedMat?.id || it.materialId || `outro_${it.name.slice(0, 20)}`;
        const cleanName =
          matchedMat?.name || it.name.replace(/\s*\(R\$\s*[\d.,]+\/(?:kg|L)\)/gi, "").trim();
        const itemUnit = resolveScrapMaterialUnit({
          unitType: matchedMat?.unitType || it.unitLabel,
          id: matId,
          name: cleanName
        });
        const row = ensureScrapRow(matId, cleanName, matchedMat?.emoji || "♻️", itemUnit);
        const itemKg = roundWeightKg(Number(it.totalWeightKg) || 0);
        const itemUnits = Math.max(0, Math.round(Number(it.quantity) || 0));
        const itemCost = roundCurrencyBrl(Number(it.costPaid) || 0);

        row.enteredKg = roundWeightKg(row.enteredKg + itemKg);
        row.enteredUnits += itemUnits;
        if (tk.isFounder) {
          row.ownKg = roundWeightKg(row.ownKg + itemKg);
          row.own100Value = roundCurrencyBrl(row.own100Value + itemCost);
        } else {
          row.collabKg = roundWeightKg(row.collabKg + itemKg);
          row.spentBuying = roundCurrencyBrl(row.spentBuying + itemCost);
        }
      });
    } else if (sectorFilter !== "ferro_velho") {
      const glassRowId = "vidros:geral";
      let gRow = rowMap.get(glassRowId);
      if (!gRow) {
        const stockGlassUnits = catalog.reduce((s, b) => s + Math.max(0, Math.round(b.stockUnits || 0)), 0);
        const stockGlassKg = roundWeightKg(
          catalog.reduce((s, b) => s + ((Math.max(0, b.stockUnits || 0) * (b.unitWeightGrams || 0)) / 1000), 0)
        );
        gRow = {
          id: glassRowId,
          name: "Vidros / Garrafas (Pátio Usina)",
          emoji: "🍾",
          unitType: "kg",
          sector: "vidros",
          enteredKg: 0,
          enteredUnits: 0,
          ownKg: 0,
          own100Value: 0,
          collabKg: 0,
          spentBuying: 0,
          soldKg: 0,
          soldUnits: 0,
          soldRevenue: 0,
          soldCost: 0,
          soldProfit: 0,
          remainingStockKg: stockGlassKg,
          remainingStockUnits: stockGlassUnits,
          remainingResaleValue: roundCurrencyBrl(stockGlassKg * sellPricePerKg)
        };
        rowMap.set(glassRowId, gRow);
      }
      gRow.enteredKg = roundWeightKg(gRow.enteredKg + tkKg);
      gRow.enteredUnits += tkUnits;
      if (tk.isFounder) {
        gRow.ownKg = roundWeightKg(gRow.ownKg + tkKg);
        gRow.own100Value = roundCurrencyBrl(gRow.own100Value + effectiveVal);
      } else {
        gRow.collabKg = roundWeightKg(gRow.collabKg + tkKg);
        gRow.spentBuying = roundCurrencyBrl(gRow.spentBuying + roundCurrencyBrl(Number(tk.totalPaid) || 0));
      }
    }
  });

  // Garante que a linha de Vidros apareça se houver estoque ou carga despachada no período
  if (sectorFilter !== "ferro_velho") {
    const stockGlassUnits = catalog.reduce((s, b) => s + Math.max(0, Math.round(b.stockUnits || 0)), 0);
    const stockGlassKg = roundWeightKg(
      catalog.reduce((s, b) => s + ((Math.max(0, b.stockUnits || 0) * (b.unitWeightGrams || 0)) / 1000), 0)
    );
    if ((stockGlassUnits > 0 || filteredShipments.length > 0) && !rowMap.has("vidros:geral")) {
      rowMap.set("vidros:geral", {
        id: "vidros:geral",
        name: "Vidros / Garrafas (Pátio Usina)",
        emoji: "🍾",
        unitType: "kg",
        sector: "vidros",
        enteredKg: 0,
        enteredUnits: 0,
        ownKg: 0,
        own100Value: 0,
        collabKg: 0,
        spentBuying: 0,
        soldKg: 0,
        soldUnits: 0,
        soldRevenue: 0,
        soldCost: 0,
        soldProfit: 0,
        remainingStockKg: stockGlassKg,
        remainingStockUnits: stockGlassUnits,
        remainingResaleValue: roundCurrencyBrl(stockGlassKg * sellPricePerKg)
      });
    }
  }

  // Processar Vendas / Baixas Ferro Velho & Carrocinha
  let soldScrapKg = 0;
  let soldLiters = 0;
  let soldScrapUnits = 0;
  let soldScrapRevenue = 0;
  let soldScrapCost = 0;
  let soldScrapProfit = 0;

  filteredScrapSales.forEach((sale) => {
    const dk = parsePtBrDateKey(sale.timestamp, sale.id);
    const w = roundWeightKg(Number(sale.weightKg) || 0);
    const u = Math.max(0, Math.round(Number(sale.units) || 0));
    const rev = roundCurrencyBrl(Number(sale.revenueReceived) || 0);
    const isOwn = sale.originType === "coleta_propria";
    const cost = isOwn ? 0 : roundCurrencyBrl(Number(sale.estimatedBuyCost) || 0);
    const profit = isOwn ? rev : Number((rev - cost).toFixed(2));
    const saleUnit = resolveScrapMaterialUnit({
      unitType: sale.unitType,
      id: sale.materialId,
      name: sale.materialName
    });

    if (saleUnit === "L") {
      soldLiters = roundWeightKg(soldLiters + w);
    } else {
      soldScrapKg = roundWeightKg(soldScrapKg + w);
    }
    soldScrapUnits += u;
    soldScrapRevenue = roundCurrencyBrl(soldScrapRevenue + rev);
    soldScrapCost = roundCurrencyBrl(soldScrapCost + cost);
    soldScrapProfit = Number((soldScrapProfit + profit).toFixed(2));

    const row = ensureScrapRow(sale.materialId, sale.materialName, sale.emoji, saleUnit);
    row.soldKg = roundWeightKg(row.soldKg + w);
    row.soldUnits += u;
    row.soldRevenue = roundCurrencyBrl(row.soldRevenue + rev);
    row.soldCost = roundCurrencyBrl(row.soldCost + cost);
    row.soldProfit = Number((row.soldProfit + profit).toFixed(2));

    timeline.push({
      id: sale.id,
      dateKey: dk,
      timestamp: sale.timestamp,
      kind: "venda_baixa",
      sector: "ferro_velho",
      title: `🚚 Venda/Baixa: ${sale.emoji} ${sale.materialName}`,
      subtitle: `${isOwn ? "👑 100% Coleta Própria" : "Comprador"}: ${sale.buyerName || "Revenda"}`,
      weightKg: saleUnit === "L" ? 0 : w,
      liters: saleUnit === "L" ? w : 0,
      units: u,
      amount: rev,
      profitAmount: profit,
      isOwn100: isOwn
    });
  });

  // Processar Cargas Despachadas de Vidros
  let soldGlassKg = 0;
  let soldGlassUnits = 0;
  let soldGlassRevenue = 0;

  filteredShipments.forEach((sh) => {
    const dk = parsePtBrDateKey(sh.timestamp, sh.id);
    const w = roundWeightKg(Number(sh.totalWeightKg) || 0);
    const u = Math.max(0, Math.round(Number(sh.totalBottles) || 0));
    const rev = roundCurrencyBrl(Number(sh.grossRevenueReceived) || 0);

    soldGlassKg = roundWeightKg(soldGlassKg + w);
    soldGlassUnits += u;
    soldGlassRevenue = roundCurrencyBrl(soldGlassRevenue + rev);

    const gRow = rowMap.get("vidros:geral");
    if (gRow) {
      gRow.soldKg = roundWeightKg(gRow.soldKg + w);
      gRow.soldUnits += u;
      gRow.soldRevenue = roundCurrencyBrl(gRow.soldRevenue + rev);
      gRow.soldProfit = Number((gRow.soldRevenue - gRow.spentBuying).toFixed(2));
    }

    timeline.push({
      id: sh.id,
      dateKey: dk,
      timestamp: sh.timestamp,
      kind: "venda_baixa",
      sector: "vidros",
      title: `🚛 Carga Usina Vidros (${sh.totalWeightTon.toFixed(2)}t)`,
      subtitle: `${sh.buyerName} · ${u} garrafas`,
      weightKg: w,
      units: u,
      amount: rev
    });
  });

  // Processar Acertos Pagos no Caderninho
  let caderninhoSettlementsCount = 0;
  let caderninhoSettlementsPaid = 0;
  filteredPayments.forEach((pay) => {
    const dk = parsePtBrDateKey(pay.timestamp, pay.id);
    const amt = roundCurrencyBrl(Number(pay.amountPaid) || 0);
    caderninhoSettlementsCount += 1;
    caderninhoSettlementsPaid = roundCurrencyBrl(caderninhoSettlementsPaid + amt);
    timeline.push({
      id: pay.id,
      dateKey: dk,
      timestamp: pay.timestamp,
      kind: "acerto_caderninho",
      sector: pay.sector || "geral",
      title: `🤝 Acerto Caderninho: ${pay.collaboratorName}`,
      subtitle: pay.methodLabel || "Acerto realizado",
      weightKg: 0,
      units: 0,
      amount: amt
    });
  });

  // Estoque Atual Vivo Hoje (O que sobrou / tem disponível no dia)
  let currentScrapStockKg = 0;
  let currentStockLiters = 0;
  let currentScrapStockUnits = 0;
  let currentScrapBuyCost = 0;
  let currentScrapResaleValue = 0;

  if (sectorFilter !== "vidros") {
    otherScrapMaterials.forEach((m) => {
      const qty = roundWeightKg(Number(m.stockKg) || 0);
      const un = Math.max(0, Math.round(Number(m.stockUnits) || 0));
      const buyP = Math.max(0, Number(m.buyPricePerKg) || 0);
      const sellP = Math.max(0, Number(m.sellPricePerKg) || 0);
      if (resolveScrapMaterialUnit(m) === "L") {
        currentStockLiters = roundWeightKg(currentStockLiters + qty);
      } else {
        currentScrapStockKg = roundWeightKg(currentScrapStockKg + qty);
      }
      currentScrapStockUnits += un;
      currentScrapBuyCost = roundCurrencyBrl(currentScrapBuyCost + qty * buyP);
      currentScrapResaleValue = roundCurrencyBrl(currentScrapResaleValue + qty * sellP);
    });
  }

  const currentScrapExpectedProfit = Number((currentScrapResaleValue - currentScrapBuyCost).toFixed(2));

  let currentGlassStockKg = 0;
  let currentGlassStockUnits = 0;
  let currentGlassUsinaValue = 0;

  if (sectorFilter !== "ferro_velho") {
    catalog.forEach((b) => {
      const un = Math.max(0, Math.round(Number(b.stockUnits) || 0));
      const kg = (un * Math.max(0, Number(b.unitWeightGrams) || 0)) / 1000;
      currentGlassStockUnits += un;
      currentGlassStockKg = roundWeightKg(currentGlassStockKg + kg);
    });
    currentGlassUsinaValue = roundCurrencyBrl(currentGlassStockKg * sellPricePerKg);
  }

  const currentTotalStockKg = roundWeightKg(currentScrapStockKg + currentGlassStockKg);
  const currentTotalStockResaleValue = roundCurrencyBrl(currentScrapResaleValue + currentGlassUsinaValue);

  const soldTotalKg = roundWeightKg(soldScrapKg + soldGlassKg);
  const soldTotalUnits = soldScrapUnits + soldGlassUnits;
  const soldTotalRevenue = roundCurrencyBrl(soldScrapRevenue + soldGlassRevenue);

  // Lucro nas vendas de vidros dentro do período = receita das cargas - compras de vidro do período (se aplicável)
  const glassCostInPeriod =
    sectorFilter === "ferro_velho"
      ? 0
      : roundCurrencyBrl(
          filteredPurchases
            .filter((t) => !t.isScrapPurchase && !t.isFounder)
            .reduce((s, t) => s + roundCurrencyBrl(Number(t.totalPaid) || 0), 0)
        );
  const soldGlassProfit = soldGlassRevenue > 0 ? Number((soldGlassRevenue - glassCostInPeriod).toFixed(2)) : 0;
  const soldTotalProfit = Number((soldScrapProfit + soldGlassProfit).toFixed(2));

  const totalCashPaidOut = roundCurrencyBrl(collabPaidImmediate + caderninhoSettlementsPaid);
  const netPeriodBalance = Number((soldTotalRevenue - collabSpentTotal).toFixed(2));
  const cashFlowBalance = Number((soldTotalRevenue - totalCashPaidOut).toFixed(2));

  // Lucro total combinado: Lucro realizado nas baixas + valor 100% das coletas próprias ainda sem baixa separada (ou total do período)
  const totalCombinedProfit = Number((soldScrapProfit + soldGlassProfit + own100PercentValue).toFixed(2));

  // Filtra linhas de material que têm alguma atividade ou estoque atual
  const materialRows = Array.from(rowMap.values())
    .filter(
      (r) =>
        r.enteredKg > 0 ||
        r.enteredUnits > 0 ||
        r.soldKg > 0 ||
        r.soldUnits > 0 ||
        r.remainingStockKg > 0 ||
        r.remainingStockUnits > 0
    )
    .sort((a, b) => {
      const scoreA = a.soldRevenue + a.spentBuying + a.own100Value + a.remainingResaleValue + a.remainingStockKg;
      const scoreB = b.soldRevenue + b.spentBuying + b.own100Value + b.remainingResaleValue + b.remainingStockKg;
      return scoreB - scoreA;
    });

  // Ordenar timeline mais recente primeiro
  timeline.sort((a, b) => {
    if (a.dateKey !== b.dateKey) return a.dateKey < b.dateKey ? 1 : -1;
    return b.timestamp.localeCompare(a.timestamp);
  });

  return {
    period,
    periodLabel,
    sectorFilter,
    todayKey,
    activeDateKeys,
    totalEnteredKg,
    enteredLiters,
    enteredGlassKg,
    enteredGlassUnits,
    enteredScrapKg,
    enteredScrapUnits,
    entriesCount: collabEntriesCount + ownEntriesCount,
    collabEntriesCount,
    collabEnteredKg,
    collabEnteredLiters,
    collabGlassUnits,
    collabScrapUnits,
    collabSpentTotal,
    collabPaidImmediate,
    collabAddedCaderninho,
    caderninhoSettlementsCount,
    caderninhoSettlementsPaid,
    totalCashPaidOut,
    ownEntriesCount,
    ownEnteredKg,
    ownEnteredLiters,
    ownGlassUnits,
    ownScrapUnits,
    own100PercentValue,
    salesCount: filteredScrapSales.length + filteredShipments.length,
    soldScrapKg,
    soldLiters,
    soldScrapUnits,
    soldScrapRevenue,
    soldScrapCost,
    soldScrapProfit,
    soldGlassKg,
    soldGlassUnits,
    soldGlassRevenue,
    soldTotalKg,
    soldTotalUnits,
    soldTotalRevenue,
    soldTotalProfit,
    currentScrapStockKg,
    currentStockLiters,
    currentScrapStockUnits,
    currentScrapBuyCost,
    currentScrapResaleValue,
    currentScrapExpectedProfit,
    currentGlassStockKg,
    currentGlassStockUnits,
    currentGlassUsinaValue,
    currentTotalStockKg,
    currentTotalStockResaleValue,
    netPeriodBalance,
    cashFlowBalance,
    totalCombinedProfit,
    materialRows,
    timeline
  };
}

export function buildDailyReportWhatsAppText(report: ComputedRecyclingReport): string {
  const sectorTitle =
    report.sectorFilter === "ferro_velho"
      ? "Ferro Velho & Carrocinha"
      : report.sectorFilter === "vidros"
      ? "Pátio de Vidros"
      : "Geral (Vidros + Ferro Velho)";

  const lines: string[] = [
    `📊 *RELATÓRIO DE RECICLAGEM — ${report.periodLabel.toUpperCase()}*`,
    `Setor: *${sectorTitle}*`,
    ``,
    `📥 *ENTRADAS NO PERÍODO:*`,
    `• Peso Acumulado Entrada: *${formatWeightKgDetailed(report.totalEnteredKg)} kg* (${report.entriesCount} lançamentos)`,
    ...(report.enteredLiters > 0 ? [`• Óleo Acumulado Entrada: *${formatWeightKgDetailed(report.enteredLiters)} L*`] : []),
    ...(report.enteredGlassUnits > 0 ? [`• Garrafas Vidro: *${report.enteredGlassUnits} un* (${formatWeightKgDetailed(report.enteredGlassKg)} kg)`] : []),
    ...(report.enteredScrapUnits > 0 ? [`• Unidades Ferro Velho: *${report.enteredScrapUnits} un*`] : []),
    ``,
    `💸 *GASTOS PAGANDO COLABORADORES:*`,
    `• Total Comprado: *R$ ${formatBrl(report.collabSpentTotal)}* (${formatWeightKgDetailed(report.collabEnteredKg)} kg${report.collabEnteredLiters > 0 ? ` + ${formatWeightKgDetailed(report.collabEnteredLiters)} L` : ""})`,
    `• Pago na Hora: R$ ${formatBrl(report.collabPaidImmediate)} | Caderninho: R$ ${formatBrl(report.collabAddedCaderninho)}`,
    ...(report.caderninhoSettlementsPaid > 0
      ? [`• Acertos Pagos do Caderninho: *R$ ${formatBrl(report.caderninhoSettlementsPaid)}* (${report.caderninhoSettlementsCount}x)`]
      : []),
    ``,
    `👑 *COLETAS PRÓPRIAS (100% LUCRO):*`,
    `• Peso Próprio: *${formatWeightKgDetailed(report.ownEnteredKg)} kg*${report.ownEnteredLiters > 0 ? ` + *${formatWeightKgDetailed(report.ownEnteredLiters)} L*` : ""} (${report.ownEntriesCount} coletas)`,
    `• Valor 100% Lucro: *R$ ${formatBrl(report.own100PercentValue)}*`,
    ``,
    `🚚 *VENDAS / BAIXAS DO DIA (CARROCINHA & CARGAS):*`,
    `• Total Baixado/Vendido: *${formatWeightKgDetailed(report.soldTotalKg)} kg*${report.soldLiters > 0 ? ` + *${formatWeightKgDetailed(report.soldLiters)} L*` : ""} (${report.salesCount} vendas)`,
    `• Entrou em Dinheiro/Pix: *R$ ${formatBrl(report.soldTotalRevenue)}*`,
    `• Lucro das Vendas/Baixas: *R$ ${formatBrl(report.soldTotalProfit)}*`,
    ``,
    `📦 *SOBRA HOJE NO ESTOQUE (TEM NO DIA):*`,
    `• Estoque Atual: *${formatWeightKgDetailed(report.currentTotalStockKg)} kg*${report.currentStockLiters > 0 ? ` + *${formatWeightKgDetailed(report.currentStockLiters)} L óleo*` : ""}${report.currentGlassStockUnits > 0 ? ` (${report.currentGlassStockUnits} garrafas)` : ""}`,
    `• Valor Estimado de Revenda: *R$ ${formatBrl(report.currentTotalStockResaleValue)}*`
  ];

  if (report.materialRows.length > 0) {
    lines.push(``, `📋 *POR MATERIAL:*`);
    report.materialRows.slice(0, 12).forEach((r) => {
      const u = r.unitType || "kg";
      lines.push(
        `• ${r.emoji} ${r.name}: Entrou ${formatWeightKgDetailed(r.enteredKg)} ${u} | Baixa ${formatWeightKgDetailed(r.soldKg)} ${u} | Tem ${formatWeightKgDetailed(r.remainingStockKg)} ${u} | Venda R$ ${formatBrl(r.soldRevenue)}`
      );
    });
  }

  return lines.join("\n");
}

export function buildDailyReportReceiptPayload({
  report,
  storeName,
  storeCnpj
}: {
  report: ComputedRecyclingReport;
  storeName: string;
  storeCnpj?: string;
}): ThermalCanvasReceiptPayload {
  const lines: ThermalCanvasReceiptPayload["lines"] = [
    {
      left: `ENTRADAS (${report.entriesCount}x)`,
      right: `${formatWeightKgDetailed(report.totalEnteredKg)} KG`,
      detail: `Colab: ${formatWeightKgDetailed(report.collabEnteredKg)} kg | Própria: ${formatWeightKgDetailed(report.ownEnteredKg)} kg${report.enteredLiters > 0 ? ` | Óleo: ${formatWeightKgDetailed(report.enteredLiters)} L` : ""}`,
      bold: true
    },
    {
      left: `GASTO COMPRAS`,
      right: `R$ ${formatBrl(report.collabSpentTotal)}`,
      detail: `Na hora: R$ ${formatBrl(report.collabPaidImmediate)} | Cadern: R$ ${formatBrl(report.collabAddedCaderninho)}`,
      bold: true
    },
    ...(report.caderninhoSettlementsPaid > 0
      ? [
          {
            left: `ACERTOS CADERNINHO`,
            right: `R$ ${formatBrl(report.caderninhoSettlementsPaid)}`,
            detail: `${report.caderninhoSettlementsCount} pagamento(s) no período`,
            bold: true
          }
        ]
      : []),
    {
      left: `COLETA PROPRIA 100%`,
      right: `R$ ${formatBrl(report.own100PercentValue)}`,
      detail: `${formatWeightKgDetailed(report.ownEnteredKg)} kg${report.ownEnteredLiters > 0 ? ` + ${formatWeightKgDetailed(report.ownEnteredLiters)} L` : ""} (100% seu)`,
      bold: true
    },
    {
      left: `VENDAS / BAIXAS (${report.salesCount}x)`,
      right: `R$ ${formatBrl(report.soldTotalRevenue)}`,
      detail: `Baixado: ${formatWeightKgDetailed(report.soldTotalKg)} kg${report.soldLiters > 0 ? ` + ${formatWeightKgDetailed(report.soldLiters)} L` : ""}`,
      bold: true
    },
    {
      left: `ESTOQUE HOJE`,
      right: `${formatWeightKgDetailed(report.currentTotalStockKg)} KG`,
      detail: `${report.currentStockLiters > 0 ? `Óleo: ${formatWeightKgDetailed(report.currentStockLiters)} L | ` : ""}Prev. Revenda: R$ ${formatBrl(report.currentTotalStockResaleValue)}`,
      bold: true
    }
  ];

  report.materialRows.slice(0, 10).forEach((r) => {
    const u = r.unitType || "kg";
    lines.push({
      left: `${r.name.toUpperCase().slice(0, 22)}`,
      right: `V: R$ ${formatBrl(r.soldRevenue)}`,
      detail: `Ent ${formatWeightKgDetailed(r.enteredKg)}${u} | Sobra ${formatWeightKgDetailed(r.remainingStockKg)}${u}`,
      bold: false
    });
  });

  const sectorLabel =
    report.sectorFilter === "ferro_velho"
      ? "FERRO VELHO / CARROCINHA"
      : report.sectorFilter === "vidros"
      ? "PATIO DE VIDROS"
      : "GERAL (VIDROS + FERRO VELHO)";

  return {
    title: "FECHAMENTO & RELATORIO",
    subtitle: report.periodLabel.toUpperCase(),
    storeName: storeName || "FERRO VELHO & RECICLAGEM DW",
    storeCnpj,
    dateStr: new Date().toLocaleString("pt-BR"),
    ticketId: `REL-${report.todayKey.replace(/-/g, "")}`,
    collaboratorName: sectorLabel,
    statusLabel: `FECHAMENTO ${report.periodLabel.toUpperCase()}`,
    extraMeta: [
      `ENTRADAS: ${report.entriesCount}x (${formatWeightKgDetailed(report.totalEnteredKg)} kg${report.enteredLiters > 0 ? ` + ${formatWeightKgDetailed(report.enteredLiters)} L` : ""})`,
      `VENDAS/BAIXAS: ${report.salesCount}x (${formatWeightKgDetailed(report.soldTotalKg)} kg${report.soldLiters > 0 ? ` + ${formatWeightKgDetailed(report.soldLiters)} L` : ""})`
    ],
    lines,
    summaryLines: [
      { label: "ENTROU VENDAS:", value: `R$ ${formatBrl(report.soldTotalRevenue)}`, bold: true },
      { label: "GASTO PAGANDO:", value: `R$ ${formatBrl(report.totalCashPaidOut)}`, bold: true },
      { label: "COLETA PROPRIA 100%:", value: `R$ ${formatBrl(report.own100PercentValue)}`, bold: true },
      { label: "LUCRO NAS BAIXAS:", value: `R$ ${formatBrl(report.soldTotalProfit)}`, big: true, bold: true }
    ],
    footerNote: "Fechamento diario / acumulado — Carrocinha & Patio",
    copies: 1
  };
}
