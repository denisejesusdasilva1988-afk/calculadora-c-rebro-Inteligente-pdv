import React, { useMemo, useState } from "react";
import {
  BarChart3,
  Calendar,
  Crown,
  Download,
  Package,
  Printer,
  Share2,
  TrendingUp,
  Truck,
  Wallet
} from "lucide-react";
import { formatBrl, formatWeightKgDetailed } from "../../utils/scrapHardwareHelper";
import {
  buildDailyReportReceiptPayload,
  buildDailyReportWhatsAppText,
  computeRecyclingPeriodReport,
  formatDateKeyToPtBr,
  ReportBottleCatalogItem,
  ReportPaymentReceipt,
  ReportPeriodFilter,
  ReportPurchaseTicket,
  ReportScrapMaterialItem,
  ReportScrapSaleRecord,
  ReportSectorFilter,
  ReportTruckShipment,
  toLocalDateKey
} from "../../utils/scrapReportsHelper";
import { ThermalCanvasReceiptPayload } from "../../utils/thermalPrinterHelper";

interface RecyclingReportsPanelProps {
  purchaseHistory: ReportPurchaseTicket[];
  scrapSalesHistory: ReportScrapSaleRecord[];
  paymentHistory: ReportPaymentReceipt[];
  truckShipments: ReportTruckShipment[];
  catalog: ReportBottleCatalogItem[];
  otherScrapMaterials: ReportScrapMaterialItem[];
  sellPricePerKg: number;
  storeName: string;
  storeCnpj?: string;
  isGeneratingFunPrint: boolean;
  onOpenCarrocinhaBatchSaleModal: () => void;
  onOpenSingleScrapSaleModal: (materialId: string) => void;
  onOpenGlassDispatchModal: () => void;
  onPrintReport57mm: (payload: ThermalCanvasReceiptPayload) => void;
  onDownloadReportPng: (payload: ThermalCanvasReceiptPayload, dateTag: string) => void;
  onShareReportWhatsApp: (text: string) => void;
}

export const RecyclingReportsPanel: React.FC<RecyclingReportsPanelProps> = ({
  purchaseHistory,
  scrapSalesHistory,
  paymentHistory,
  truckShipments,
  catalog,
  otherScrapMaterials,
  sellPricePerKg,
  storeName,
  storeCnpj,
  isGeneratingFunPrint,
  onOpenCarrocinhaBatchSaleModal,
  onOpenSingleScrapSaleModal,
  onOpenGlassDispatchModal,
  onPrintReport57mm,
  onDownloadReportPng,
  onShareReportWhatsApp
}) => {
  const [period, setPeriod] = useState<ReportPeriodFilter>("hoje");
  const [customDateKey, setCustomDateKey] = useState<string>(() => toLocalDateKey(new Date()));
  const [sectorFilter, setSectorFilter] = useState<ReportSectorFilter>("todos");
  const [timelineKindFilter, setTimelineKindFilter] = useState<
    "todos" | "entradas" | "vendas" | "acertos"
  >("todos");

  const report = useMemo(
    () =>
      computeRecyclingPeriodReport({
        purchaseHistory,
        scrapSalesHistory,
        paymentHistory,
        truckShipments,
        catalog,
        otherScrapMaterials,
        period,
        customDateKey,
        sectorFilter,
        sellPricePerKg
      }),
    [
      purchaseHistory,
      scrapSalesHistory,
      paymentHistory,
      truckShipments,
      catalog,
      otherScrapMaterials,
      period,
      customDateKey,
      sectorFilter,
      sellPricePerKg
    ]
  );

  const filteredTimeline = useMemo(() => {
    if (timelineKindFilter === "todos") return report.timeline;
    if (timelineKindFilter === "entradas") {
      return report.timeline.filter(
        (ev) => ev.kind === "entrada_compra" || ev.kind === "entrada_propria"
      );
    }
    if (timelineKindFilter === "vendas") {
      return report.timeline.filter((ev) => ev.kind === "venda_baixa");
    }
    return report.timeline.filter((ev) => ev.kind === "acerto_caderninho");
  }, [report.timeline, timelineKindFilter]);

  const handleBuildPayload = (): ThermalCanvasReceiptPayload =>
    buildDailyReportReceiptPayload({
      report,
      storeName,
      storeCnpj
    });

  const dateTagForFile =
    period === "data_especifica"
      ? customDateKey
      : period === "hoje"
      ? report.todayKey
      : period;

  return (
    <div className="space-y-5 text-left">
      {/* CABEÇALHO DO PAINEL DE RELATÓRIOS & BAIXA DIÁRIA DA CARROCINHA */}
      <div className="bg-slate-900 border border-emerald-500/35 rounded-3xl p-4 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[11px] font-bold text-emerald-300 flex-wrap">
              <span>Relatórios &amp; Fechamento Diário</span>
              <span aria-hidden="true">·</span>
              <span className="text-cyan-300">{report.periodLabel}</span>
              <span aria-hidden="true">·</span>
              <span className="text-slate-400">Carrocinha Ambulante &amp; Pátio</span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>Entradas, Gastos, Baixas do Dia &amp; Lucros</span>
            </h3>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Acompanhe quanto entrou em kg e quantidades, o que você gastou pagando colaboradores, suas{" "}
              <strong className="text-amber-300">Coletas Próprias (100% lucro)</strong>, quanto tem hoje no estoque e dê{" "}
              <strong className="text-cyan-300">baixa das vendas diárias da carrocinha</strong> em um clique.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenCarrocinhaBatchSaleModal}
              className="min-h-[48px] px-4 py-2.5 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 active:scale-[0.98] text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-cyan-500/20 flex items-center gap-2 cursor-pointer touch-manipulation whitespace-nowrap shrink-0"
            >
              <Truck className="w-4 h-4 shrink-0" />
              <span>Baixa / Venda do Dia (Carrocinha)</span>
            </button>

            <button
              type="button"
              onClick={() => onPrintReport57mm(handleBuildPayload())}
              className="min-h-[44px] px-3.5 py-2 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs rounded-xl border border-white/15 flex items-center gap-1.5 cursor-pointer touch-manipulation whitespace-nowrap shrink-0"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>Imprimir 57mm</span>
            </button>

            <button
              type="button"
              onClick={() => onDownloadReportPng(handleBuildPayload(), dateTagForFile)}
              disabled={isGeneratingFunPrint}
              className="min-h-[44px] px-3.5 py-2 bg-slate-950 hover:bg-slate-800 text-cyan-300 font-bold text-xs rounded-xl border border-cyan-500/35 flex items-center gap-1.5 cursor-pointer touch-manipulation whitespace-nowrap shrink-0 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>PNG Inteira</span>
            </button>

            <button
              type="button"
              onClick={() => onShareReportWhatsApp(buildDailyReportWhatsAppText(report))}
              className="min-h-[44px] px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 cursor-pointer touch-manipulation whitespace-nowrap shrink-0"
            >
              <Share2 className="w-4 h-4" />
              <span>WhatsApp</span>
            </button>
          </div>
        </div>

        {/* CONTROLES DE PERÍODO E SETOR */}
        <div className="space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
            <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-white/10 overflow-x-auto">
              {(
                [
                  { id: "hoje", label: "Hoje" },
                  { id: "ontem", label: "Ontem" },
                  { id: "7dias", label: "7 Dias" },
                  { id: "mes", label: "Este Mês" },
                  { id: "tudo", label: "Tudo (Acumulado)" }
                ] as { id: ReportPeriodFilter; label: string }[]
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPeriod(item.id)}
                  className={`min-h-[42px] px-3.5 py-2 rounded-lg text-xs font-black whitespace-nowrap shrink-0 transition-colors cursor-pointer touch-manipulation ${
                    period === item.id
                      ? "bg-emerald-500 text-slate-950 shadow-sm"
                      : "text-slate-300 hover:text-white hover:bg-slate-900"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <label className="flex items-center gap-2 bg-slate-950 border border-white/15 rounded-xl px-3 min-h-[44px] text-xs text-slate-300">
                <Calendar className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="font-bold whitespace-nowrap">Dia:</span>
                <input
                  type="date"
                  value={customDateKey}
                  onChange={(e) => {
                    if (e.target.value) {
                      setCustomDateKey(e.target.value);
                      setPeriod("data_especifica");
                    }
                  }}
                  className="bg-transparent text-white font-mono font-bold outline-none cursor-pointer"
                />
              </label>

              <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-white/10">
                {(
                  [
                    { id: "todos", label: "Geral" },
                    { id: "ferro_velho", label: "♻️ Ferro Velho" },
                    { id: "vidros", label: "🍾 Vidros" }
                  ] as { id: ReportSectorFilter; label: string }[]
                ).map((sec) => (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => setSectorFilter(sec.id)}
                    className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-black whitespace-nowrap shrink-0 transition-colors cursor-pointer touch-manipulation ${
                      sectorFilter === sec.id
                        ? "bg-cyan-400 text-slate-950"
                        : "text-slate-300 hover:text-white"
                    }`}
                  >
                    {sec.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {report.activeDateKeys.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap text-xs">
              <span className="text-[11px] font-bold text-slate-400 mr-1">Dias com movimento:</span>
              {report.activeDateKeys.slice(0, 6).map((dk) => {
                const isSelected =
                  (period === "data_especifica" && customDateKey === dk) ||
                  (period === "hoje" && dk === report.todayKey);
                return (
                  <button
                    key={dk}
                    type="button"
                    onClick={() => {
                      setCustomDateKey(dk);
                      setPeriod("data_especifica");
                    }}
                    className={`min-h-[34px] px-2.5 py-1 rounded-lg font-mono font-bold text-[11px] border cursor-pointer touch-manipulation transition-colors ${
                      isSelected
                        ? "bg-amber-400 text-slate-950 border-amber-300"
                        : "bg-slate-950 text-slate-300 border-white/10 hover:border-amber-400/50"
                    }`}
                  >
                    {dk === report.todayKey ? `Hoje (${formatDateKeyToPtBr(dk)})` : formatDateKeyToPtBr(dk)}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 6 CARDS PRINCIPAIS (ENTRADAS, GASTOS, REVENDAS, ESTOQUE DO DIA, COLETAS 100%, LUCROS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {/* 1. ENTRADAS ACUMULADAS NO PERÍODO */}
        <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
            <span>Entradas Acumuladas</span>
            <Package className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-mono font-black text-white tabular-nums">
            {formatWeightKgDetailed(report.totalEnteredKg)} kg
            {report.enteredLiters > 0 && (
              <span className="text-base text-amber-300 ml-2">+{formatWeightKgDetailed(report.enteredLiters)} L óleo</span>
            )}
          </div>
          <div className="text-[11.5px] text-slate-300 tabular-nums">
            {report.entriesCount} lançamentos · {report.enteredGlassUnits.toLocaleString("pt-BR")} garrafas
            {report.enteredScrapUnits > 0 ? ` · ${report.enteredScrapUnits} un ferro velho` : ""}
          </div>
          <div className="text-[11px] text-slate-400 tabular-nums pt-1 border-t border-white/10">
            Colaboradores: {formatWeightKgDetailed(report.collabEnteredKg)} kg · Própria: {formatWeightKgDetailed(report.ownEnteredKg)} kg
          </div>
        </div>

        {/* 2. TOTAL DE GASTOS PAGANDO */}
        <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-amber-300 font-bold">
            <span>Total de Gastos Pagando</span>
            <Wallet className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-mono font-black text-amber-300 tabular-nums">
            R$ {formatBrl(report.collabSpentTotal)}
          </div>
          <div className="text-[11.5px] text-slate-300 tabular-nums">
            Pago na hora: R$ {formatBrl(report.collabPaidImmediate)} · Caderninho: R$ {formatBrl(report.collabAddedCaderninho)}
          </div>
          <div className="text-[11px] text-slate-400 tabular-nums pt-1 border-t border-white/10">
            Saída real em dinheiro/Pix (c/ acertos): <strong className="text-white">R$ {formatBrl(report.totalCashPaidOut)}</strong>
          </div>
        </div>

        {/* 3. QUANTO ENTROU NO DIA E REVENDI */}
        <div className="bg-slate-900 border border-cyan-500/35 rounded-2xl p-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-cyan-300 font-bold">
            <span>Entrou em Vendas / Revendas</span>
            <Truck className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-mono font-black text-cyan-300 tabular-nums">
            R$ {formatBrl(report.soldTotalRevenue)}
          </div>
          <div className="text-[11.5px] text-slate-300 tabular-nums">
            Baixado/Vendido: <strong>{formatWeightKgDetailed(report.soldTotalKg)} kg</strong>
            {report.soldLiters > 0 ? ` + ${formatWeightKgDetailed(report.soldLiters)} L óleo` : ""} · {report.salesCount} vendas/cargas
          </div>
          <div className="text-[11px] text-slate-400 tabular-nums pt-1 border-t border-white/10">
            Carrocinha/Ferro: R$ {formatBrl(report.soldScrapRevenue)} · Vidros: R$ {formatBrl(report.soldGlassRevenue)}
          </div>
        </div>

        {/* 4. QUANTO TEM NO DIA (ESTOQUE ATUAL / SOBRA HOJE) */}
        <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-300 font-bold">
            <span>Tem Hoje no Estoque (Sobra)</span>
            <Package className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-mono font-black text-white tabular-nums">
            {formatWeightKgDetailed(report.currentTotalStockKg)} kg
            {report.currentStockLiters > 0 && (
              <span className="text-base text-amber-300 ml-2">+{formatWeightKgDetailed(report.currentStockLiters)} L óleo</span>
            )}
          </div>
          <div className="text-[11.5px] text-slate-300 tabular-nums">
            Ferro Velho: {formatWeightKgDetailed(report.currentScrapStockKg)} kg · Vidros: {report.currentGlassStockUnits.toLocaleString("pt-BR")} un ({formatWeightKgDetailed(report.currentGlassStockKg)} kg)
          </div>
          <div className="text-[11px] text-emerald-300 tabular-nums pt-1 border-t border-white/10">
            Previsto se vender tudo hoje: <strong>R$ {formatBrl(report.currentTotalStockResaleValue)}</strong>
          </div>
        </div>

        {/* 5. COLETAS PRÓPRIAS (100% LUCRO) */}
        <div className="bg-slate-900 border border-amber-400/40 rounded-2xl p-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-amber-300 font-bold">
            <span>Coletas Próprias (100% Lucro)</span>
            <Crown className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-mono font-black text-amber-300 tabular-nums">
            R$ {formatBrl(report.own100PercentValue)}
          </div>
          <div className="text-[11.5px] text-slate-300 tabular-nums">
            {formatWeightKgDetailed(report.ownEnteredKg)} kg
            {report.ownEnteredLiters > 0 ? ` + ${formatWeightKgDetailed(report.ownEnteredLiters)} L óleo` : ""} · {report.ownEntriesCount} coletas · R$ 0,00 pago a terceiros
          </div>
          <div className="text-[11px] text-slate-400 tabular-nums pt-1 border-t border-white/10">
            {report.ownGlassUnits > 0 ? `${report.ownGlassUnits} garrafas próprias · ` : ""}100% de revenda para você
          </div>
        </div>

        {/* 6. TOTAL DE LUCROS */}
        <div className="bg-slate-900 border border-emerald-500/45 rounded-2xl p-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-emerald-300 font-bold">
            <span>Total de Lucros</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div
            className={`text-2xl font-mono font-black tabular-nums ${
              report.soldTotalProfit >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {report.soldTotalProfit >= 0 ? "+" : ""}R$ {formatBrl(report.soldTotalProfit)}
          </div>
          <div className="text-[11.5px] text-slate-300 tabular-nums">
            Lucro real já vendido/baixado · Estoque restante previsto:{" "}
            <strong className="text-emerald-300">R$ {formatBrl(report.currentScrapExpectedProfit)}</strong>
          </div>
          <div className="text-[11px] text-slate-400 tabular-nums pt-1 border-t border-white/10">
            Vendas − Compras no período:{" "}
            <strong className={report.netPeriodBalance >= 0 ? "text-emerald-300" : "text-amber-300"}>
              {report.netPeriodBalance >= 0 ? "+" : ""}R$ {formatBrl(report.netPeriodBalance)}
            </strong>
          </div>
        </div>
      </div>

      {/* COMPARATIVO: COMPRAS DE COLABORADORES VS COLETAS PRÓPRIAS (100% LUCRO) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black text-white">Compras de Colaboradores</h4>
            <span className="text-xs font-mono font-bold text-amber-300 tabular-nums">
              {report.collabEntriesCount} recibos
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs tabular-nums">
            <div className="p-2.5 bg-slate-950 rounded-xl border border-white/5">
              <span className="text-slate-400 block text-[11px]">Peso Comprado</span>
              <strong className="text-sm font-mono text-white">
                {formatWeightKgDetailed(report.collabEnteredKg)} kg
                {report.collabEnteredLiters > 0 ? ` · ${formatWeightKgDetailed(report.collabEnteredLiters)} L` : ""}
              </strong>
            </div>
            <div className="p-2.5 bg-slate-950 rounded-xl border border-white/5">
              <span className="text-slate-400 block text-[11px]">Quantidades</span>
              <strong className="text-sm font-mono text-white">
                {report.collabGlassUnits} garrafas · {report.collabScrapUnits} un
              </strong>
            </div>
            <div className="p-2.5 bg-slate-950 rounded-xl border border-white/5">
              <span className="text-slate-400 block text-[11px]">Pago na Hora</span>
              <strong className="text-sm font-mono text-amber-300">R$ {formatBrl(report.collabPaidImmediate)}</strong>
            </div>
            <div className="p-2.5 bg-slate-950 rounded-xl border border-white/5">
              <span className="text-slate-400 block text-[11px]">Acertos Caderninho</span>
              <strong className="text-sm font-mono text-cyan-300">
                R$ {formatBrl(report.caderninhoSettlementsPaid)} ({report.caderninhoSettlementsCount}x)
              </strong>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-amber-400/35 rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black text-amber-300">Coletas Próprias (100% Seu)</h4>
            <span className="text-xs font-mono font-bold text-amber-200 tabular-nums">
              {report.ownEntriesCount} coletas
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs tabular-nums">
            <div className="p-2.5 bg-slate-950 rounded-xl border border-white/5">
              <span className="text-slate-400 block text-[11px]">Peso Coletado Próprio</span>
              <strong className="text-sm font-mono text-white">
                {formatWeightKgDetailed(report.ownEnteredKg)} kg
                {report.ownEnteredLiters > 0 ? ` · ${formatWeightKgDetailed(report.ownEnteredLiters)} L` : ""}
              </strong>
            </div>
            <div className="p-2.5 bg-slate-950 rounded-xl border border-white/5">
              <span className="text-slate-400 block text-[11px]">Quantidades Próprias</span>
              <strong className="text-sm font-mono text-white">
                {report.ownGlassUnits} garrafas · {report.ownScrapUnits} un
              </strong>
            </div>
            <div className="p-2.5 bg-slate-950 rounded-xl border border-white/5">
              <span className="text-slate-400 block text-[11px]">Gasto com Terceiros</span>
              <strong className="text-sm font-mono text-emerald-300">R$ 0,00</strong>
            </div>
            <div className="p-2.5 bg-slate-950 rounded-xl border border-white/5">
              <span className="text-slate-400 block text-[11px]">Lucro 100% Revenda</span>
              <strong className="text-sm font-mono text-amber-300">R$ {formatBrl(report.own100PercentValue)}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* TABELA POR MATERIAL: ENTROU × DEU BAIXA × TEM HOJE × GASTO × VENDA × LUCRO */}
      <div className="bg-slate-900 border border-white/10 rounded-3xl p-4 sm:p-5 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div>
            <h4 className="text-base font-black text-white">
              Resumo por Material — Entradas, Baixas do Dia &amp; Estoque Atual
            </h4>
            <p className="text-xs text-slate-400">
              Veja exatamente o que entrou no período, quanto já deu baixa vendendo e o que ainda tem hoje na carrocinha/pátio.
            </p>
          </div>
          {report.currentTotalStockKg > 0 && (
            <button
              type="button"
              onClick={onOpenCarrocinhaBatchSaleModal}
              className="min-h-[42px] px-3.5 py-2 bg-cyan-500/15 hover:bg-cyan-500 hover:text-slate-950 text-cyan-300 font-black text-xs rounded-xl border border-cyan-500/35 cursor-pointer touch-manipulation whitespace-nowrap shrink-0"
            >
              Dar Baixa do Estoque Hoje
            </button>
          )}
        </div>

        {report.materialRows.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            Nenhuma movimentação ou estoque encontrado para <strong>{report.periodLabel}</strong>. Quando você lançar compras, coletas próprias ou baixas da carrocinha, o relatório aparece aqui na hora.
          </div>
        ) : (
          <>
            {/* Versão Mobile (Cards compactos com toque fácil) */}
            <div className="space-y-2.5 md:hidden">
              {report.materialRows.map((row) => (
                <div
                  key={row.id}
                  className="p-3.5 bg-slate-950 rounded-2xl border border-white/10 space-y-2 text-xs tabular-nums"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-black text-white text-sm flex items-center gap-1.5 min-w-0">
                      <span>{row.emoji}</span>
                      <span className="truncate">{row.name}</span>
                    </div>
                    {row.remainingStockKg > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          row.sector === "vidros"
                            ? onOpenGlassDispatchModal()
                            : onOpenSingleScrapSaleModal(row.id.replace(/^fv:/, ""))
                        }
                        className="min-h-[36px] px-2.5 bg-emerald-500/15 hover:bg-emerald-500 hover:text-slate-950 text-emerald-300 font-black text-[11px] rounded-lg border border-emerald-500/35 cursor-pointer shrink-0"
                      >
                        Baixar
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-400 block">Entrou</span>
                      <strong className="font-mono text-white">
                        {formatWeightKgDetailed(row.enteredKg)} {row.unitType || "kg"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Vendeu/Baixa</span>
                      <strong className="font-mono text-cyan-300">
                        {formatWeightKgDetailed(row.soldKg)} {row.unitType || "kg"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Tem Hoje</span>
                      <strong className="font-mono text-emerald-300">
                        {formatWeightKgDetailed(row.remainingStockKg)} {row.unitType || "kg"}
                      </strong>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1.5 border-t border-white/5 text-[11px]">
                    <span className="text-amber-300">Gasto: R$ {formatBrl(row.spentBuying)}</span>
                    <span className="text-cyan-300">Venda: R$ {formatBrl(row.soldRevenue)}</span>
                    <span className={row.soldProfit >= 0 ? "text-emerald-400 font-black" : "text-rose-400 font-black"}>
                      Lucro: R$ {formatBrl(row.soldProfit)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Versão Tablet / Desktop (Tabela limpa com números alinhados) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse tabular-nums">
                <thead>
                  <tr className="border-b border-white/10 text-[11px] text-slate-400 font-bold">
                    <th className="py-2.5 pr-3">Material</th>
                    <th className="py-2.5 px-2 text-right">Entrou (kg / L / un)</th>
                    <th className="py-2.5 px-2 text-right">Baixa / Vendeu</th>
                    <th className="py-2.5 px-2 text-right">Tem Hoje</th>
                    <th className="py-2.5 px-2 text-right">Gasto Pagando</th>
                    <th className="py-2.5 px-2 text-right">Entrou Revenda</th>
                    <th className="py-2.5 px-2 text-right">Lucro Vendas</th>
                    <th className="py-2.5 pl-2 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {report.materialRows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-950/60">
                      <td className="py-2.5 pr-3 font-bold text-white">
                        <span className="mr-1.5">{row.emoji}</span>
                        <span>{row.name}</span>
                        {row.ownKg > 0 && (
                          <span className="block text-[10px] font-normal text-amber-300">
                            Inclui {formatWeightKgDetailed(row.ownKg)} {row.unitType || "kg"} coleta própria (R$ {formatBrl(row.own100Value)})
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-white">
                        {formatWeightKgDetailed(row.enteredKg)} {row.unitType || "kg"}
                        {row.enteredUnits > 0 && (
                          <span className="block text-[10px] text-slate-400">{row.enteredUnits} un</span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-cyan-300">
                        {formatWeightKgDetailed(row.soldKg)} {row.unitType || "kg"}
                        {row.soldUnits > 0 && (
                          <span className="block text-[10px] text-slate-400">{row.soldUnits} un</span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono font-bold text-emerald-300">
                        {formatWeightKgDetailed(row.remainingStockKg)} {row.unitType || "kg"}
                        {row.remainingStockUnits > 0 && (
                          <span className="block text-[10px] text-slate-400">{row.remainingStockUnits} un</span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-amber-300">
                        R$ {formatBrl(row.spentBuying)}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-cyan-300 font-bold">
                        R$ {formatBrl(row.soldRevenue)}
                      </td>
                      <td
                        className={`py-2.5 px-2 text-right font-mono font-black ${
                          row.soldProfit >= 0 ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {row.soldProfit >= 0 ? "+" : ""}R$ {formatBrl(row.soldProfit)}
                      </td>
                      <td className="py-2.5 pl-2 text-right">
                        {row.remainingStockKg > 0 ? (
                          <button
                            type="button"
                            onClick={() =>
                              row.sector === "vidros"
                                ? onOpenGlassDispatchModal()
                                : onOpenSingleScrapSaleModal(row.id.replace(/^fv:/, ""))
                            }
                            className="min-h-[34px] px-2.5 py-1 bg-emerald-500/15 hover:bg-emerald-500 hover:text-slate-950 text-emerald-300 font-black text-[11px] rounded-lg border border-emerald-500/35 cursor-pointer"
                          >
                            Vender / Baixar
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-500">Zerado</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* HISTÓRICO DETALHADO DAS MOVIMENTAÇÕES DO PERÍODO */}
      <div className="bg-slate-900 border border-white/10 rounded-3xl p-4 sm:p-5 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-white/10 pb-3">
          <div>
            <h4 className="text-base font-black text-white">
              Movimentações ({filteredTimeline.length}) — {report.periodLabel}
            </h4>
            <p className="text-xs text-slate-400">
              Confira cada entrada, coleta própria, baixa da carrocinha e pagamento no caderninho.
            </p>
          </div>
          <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-white/10 overflow-x-auto">
            {(
              [
                { id: "todos", label: "Tudo" },
                { id: "entradas", label: "Entradas" },
                { id: "vendas", label: "Vendas / Baixas" },
                { id: "acertos", label: "Acertos" }
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setTimelineKindFilter(f.id)}
                className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-black whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                  timelineKindFilter === f.id
                    ? "bg-emerald-500 text-slate-950"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {filteredTimeline.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            Nenhum registro deste tipo em <strong>{report.periodLabel}</strong>.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredTimeline.slice(0, 60).map((ev) => (
              <div
                key={ev.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="font-bold text-white truncate">{ev.title}</div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {ev.timestamp} · {ev.subtitle}
                  </div>
                </div>
                <div className="flex items-center gap-3 sm:text-right shrink-0 tabular-nums font-mono">
                  {(ev.weightKg > 0 || (ev.liters || 0) > 0) && (
                    <span className="text-slate-300 font-bold">
                      {ev.weightKg > 0 ? `${formatWeightKgDetailed(ev.weightKg)} kg` : ""}
                      {ev.weightKg > 0 && (ev.liters || 0) > 0 ? " + " : ""}
                      {(ev.liters || 0) > 0 ? `${formatWeightKgDetailed(ev.liters || 0)} L` : ""}
                      {ev.units > 0 ? ` (${ev.units} un)` : ""}
                    </span>
                  )}
                  <span
                    className={`font-black text-sm ${
                      ev.kind === "venda_baixa"
                        ? "text-cyan-300"
                        : ev.kind === "entrada_propria"
                        ? "text-amber-300"
                        : "text-amber-200"
                    }`}
                  >
                    {ev.kind === "venda_baixa" ? "+" : ev.kind === "entrada_propria" ? "100% " : "-"}R${" "}
                    {formatBrl(ev.amount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
