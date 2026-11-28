import React, { useEffect, useMemo, useState } from "react";
import { Crown, Plus, Trash2, Truck, X } from "lucide-react";
import {
  formatBrl,
  formatWeightKgDetailed,
  resolveScrapMaterialUnit,
  roundCurrencyBrl,
  roundWeightKg,
  ScrapUnitType
} from "../../utils/scrapHardwareHelper";

export interface CarrocinhaMaterialSource {
  id: string;
  name: string;
  emoji: string;
  unitType?: ScrapUnitType;
  stockKg: number;
  stockUnits?: number;
  buyPricePerKg: number;
  sellPricePerKg?: number;
}

export interface CarrocinhaSaleDraftLine {
  materialId: string;
  weightKgStr: string;
  unitsStr: string;
  revenueStr: string;
  manualRevenue: boolean;
}

export interface CarrocinhaConfirmedLine {
  material: CarrocinhaMaterialSource;
  weightKg: number;
  units: number;
  revenueReceived: number;
}

interface CarrocinhaDailySaleModalProps {
  isOpen: boolean;
  materials: CarrocinhaMaterialSource[];
  onClose: () => void;
  onConfirmBatchSale: (payload: {
    lines: CarrocinhaConfirmedLine[];
    buyerName: string;
    paymentMethod: "dinheiro" | "pix" | "cartao_debito" | "cartao_credito";
    originType: "compra" | "coleta_propria";
  }) => void;
}

export const CarrocinhaDailySaleModal: React.FC<CarrocinhaDailySaleModalProps> = ({
  isOpen,
  materials,
  onClose,
  onConfirmBatchSale
}) => {
  const [lines, setLines] = useState<CarrocinhaSaleDraftLine[]>([]);
  const [buyerName, setBuyerName] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<
    "dinheiro" | "pix" | "cartao_debito" | "cartao_credito"
  >("dinheiro");
  const [originType, setOriginType] = useState<"compra" | "coleta_propria">("compra");
  const [extraMatId, setExtraMatId] = useState<string>("");

  const buildAllInStockLines = (): CarrocinhaSaleDraftLine[] => {
    return materials
      .filter((m) => (Number(m.stockKg) || 0) > 0 || (Number(m.stockUnits) || 0) > 0)
      .map((m) => {
        const kg = roundWeightKg(Number(m.stockKg) || 0);
        const units = Math.max(0, Math.round(Number(m.stockUnits) || 0));
        const sellP = Math.max(0, Number(m.sellPricePerKg) || 0);
        const estRev = kg > 0 && sellP > 0 ? roundCurrencyBrl(kg * sellP).toFixed(2) : "";
        return {
          materialId: m.id,
          weightKgStr: kg > 0 ? String(kg) : "",
          unitsStr: units > 0 ? String(units) : "",
          revenueStr: estRev,
          manualRevenue: false
        };
      });
  };

  useEffect(() => {
    if (isOpen) {
      const initial = buildAllInStockLines();
      if (initial.length === 0 && materials.length > 0) {
        const firstMat = materials[0];
        setLines([
          {
            materialId: firstMat.id,
            weightKgStr: "",
            unitsStr: "",
            revenueStr: "",
            manualRevenue: false
          }
        ]);
      } else {
        setLines(initial);
      }
      setBuyerName("");
      setOriginType("compra");
      setExtraMatId(materials[0]?.id || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const materialById = useMemo(
    () => new Map(materials.map((m) => [m.id, m])),
    [materials]
  );

  const summary = useMemo(() => {
    let totalKg = 0;
    let totalLiters = 0;
    let totalUnits = 0;
    let totalRevenue = 0;
    let totalEstimatedCost = 0;
    const validLines: CarrocinhaConfirmedLine[] = [];

    lines.forEach((ln) => {
      const mat = materialById.get(ln.materialId);
      if (!mat) return;
      const w = roundWeightKg(parseFloat(ln.weightKgStr.replace(",", ".")) || 0);
      const u = Math.max(0, parseInt(ln.unitsStr || "0", 10) || 0);
      const rev = roundCurrencyBrl(parseFloat(ln.revenueStr.replace(",", ".")) || 0);
      if (w <= 0 && u <= 0 && rev <= 0) return;

      const buyP = Math.max(0, Number(mat.buyPricePerKg) || 0);
      const cost = originType === "coleta_propria" ? 0 : roundCurrencyBrl(w * buyP);
      if (resolveScrapMaterialUnit(mat) === "L") {
        totalLiters = roundWeightKg(totalLiters + w);
      } else {
        totalKg = roundWeightKg(totalKg + w);
      }
      totalUnits += u;
      totalRevenue = roundCurrencyBrl(totalRevenue + rev);
      totalEstimatedCost = roundCurrencyBrl(totalEstimatedCost + cost);
      validLines.push({
        material: mat,
        weightKg: w,
        units: u,
        revenueReceived: rev
      });
    });

    const profit =
      originType === "coleta_propria"
        ? totalRevenue
        : Number((totalRevenue - totalEstimatedCost).toFixed(2));

    return {
      totalKg,
      totalLiters,
      totalUnits,
      totalRevenue,
      totalEstimatedCost,
      profit,
      validLines
    };
  }, [lines, materialById, originType]);

  if (!isOpen) return null;

  const availableToAdd = materials.filter(
    (m) => !lines.some((l) => l.materialId === m.id)
  );

  return (
    <div className="fixed inset-0 z-[80] bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border-2 border-cyan-500/45 rounded-3xl p-4 sm:p-6 max-w-2xl w-full space-y-4 shadow-2xl text-left my-auto max-h-[92vh] overflow-y-auto">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5 text-cyan-300" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white">
                Baixa / Venda do Dia — Carrocinha Ambulante
              </h3>
              <span className="text-xs text-slate-300 block">
                Dê baixa de vários materiais de uma vez e lance quanto entrou em R$ no dia.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-slate-950 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Origem (Compras vs Coleta Própria 100%) e Atalhos */}
        <div className="space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setOriginType("compra")}
              className={`min-h-[46px] px-3.5 py-2 rounded-xl border font-black text-xs text-left cursor-pointer transition-colors ${
                originType === "compra"
                  ? "bg-emerald-500 text-slate-950 border-emerald-400"
                  : "bg-slate-950 text-slate-300 border-white/15 hover:border-white/30"
              }`}
            >
              <span className="block">Material Comprado de Colaboradores</span>
              <span className={`block text-[10.5px] font-semibold ${originType === "compra" ? "text-slate-900" : "text-slate-400"}`}>
                Desconta preço de compra p/ calcular lucro
              </span>
            </button>
            <button
              type="button"
              onClick={() => setOriginType("coleta_propria")}
              className={`min-h-[46px] px-3.5 py-2 rounded-xl border font-black text-xs text-left cursor-pointer transition-colors flex items-center gap-2 ${
                originType === "coleta_propria"
                  ? "bg-amber-400 text-slate-950 border-amber-300"
                  : "bg-slate-950 text-amber-200 border-amber-500/35 hover:border-amber-400"
              }`}
            >
              <Crown className="w-4 h-4 shrink-0" />
              <div>
                <span className="block">Minha Coleta Própria (100% Lucro)</span>
                <span className={`block text-[10.5px] font-semibold ${originType === "coleta_propria" ? "text-slate-900" : "text-amber-200/75"}`}>
                  Custo R$ 0,00 · Tudo que entrar é 100% lucro
                </span>
              </div>
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setLines(buildAllInStockLines())}
                className="min-h-[38px] px-3 py-1.5 bg-cyan-500/15 hover:bg-cyan-500 hover:text-slate-950 text-cyan-300 font-black text-xs rounded-xl border border-cyan-500/35 cursor-pointer"
              >
                Carregar Todo Estoque Hoje
              </button>
              <button
                type="button"
                onClick={() =>
                  setLines((prev) =>
                    prev.map((l) => ({
                      ...l,
                      weightKgStr: "",
                      unitsStr: "",
                      revenueStr: "",
                      manualRevenue: false
                    }))
                  )
                }
                className="min-h-[38px] px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 font-bold text-xs rounded-xl border border-white/10 cursor-pointer"
              >
                Zerar Campos
              </button>
            </div>

            {availableToAdd.length > 0 && (
              <div className="flex items-center gap-1.5">
                <select
                  value={extraMatId || availableToAdd[0].id}
                  onChange={(e) => setExtraMatId(e.target.value)}
                  className="min-h-[38px] bg-slate-950 border border-white/15 rounded-xl px-2.5 text-xs text-white font-bold outline-none max-w-[180px]"
                >
                  {availableToAdd.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.emoji} {m.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    const targetId =
                      extraMatId && availableToAdd.some((m) => m.id === extraMatId)
                        ? extraMatId
                        : availableToAdd[0].id;
                    const mat = materialById.get(targetId);
                    if (!mat) return;
                    const kg = roundWeightKg(Number(mat.stockKg) || 0);
                    const sellP = Math.max(0, Number(mat.sellPricePerKg) || 0);
                    setLines((prev) => [
                      ...prev,
                      {
                        materialId: mat.id,
                        weightKgStr: kg > 0 ? String(kg) : "",
                        unitsStr: (mat.stockUnits || 0) > 0 ? String(mat.stockUnits) : "",
                        revenueStr: kg > 0 && sellP > 0 ? roundCurrencyBrl(kg * sellP).toFixed(2) : "",
                        manualRevenue: false
                      }
                    ]);
                  }}
                  className="min-h-[38px] px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Incluir</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Lista de Materiais na Baixa do Dia */}
        {lines.length === 0 ? (
          <div className="p-5 bg-slate-950 rounded-2xl border border-white/10 text-center text-xs text-slate-400">
            Seu estoque do Ferro Velho está zerado no momento. Use <strong>Incluir</strong> acima para lançar uma venda avulsa ou adicione material na balança primeiro.
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
            {lines.map((ln) => {
              const mat = materialById.get(ln.materialId);
              if (!mat) return null;
              const sellP = Math.max(0, Number(mat.sellPricePerKg) || 0);
              const buyP = Math.max(0, Number(mat.buyPricePerKg) || 0);
              const unit = resolveScrapMaterialUnit(mat);

              return (
                <div
                  key={ln.materialId}
                  className="p-3 bg-slate-950 rounded-2xl border border-white/10 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-black text-white text-sm truncate">
                        {mat.emoji} {mat.name}
                      </div>
                      <div className="text-[11px] text-slate-400 tabular-nums">
                        Tem hoje: <strong className="text-emerald-300">{formatWeightKgDetailed(mat.stockKg || 0)} {unit}</strong>
                        {buyP > 0 ? ` · Compra R$ ${formatBrl(buyP)}/${unit}` : ""}
                        {sellP > 0 ? ` · Revenda R$ ${formatBrl(sellP)}/${unit}` : ""}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setLines((prev) => prev.filter((item) => item.materialId !== ln.materialId))
                      }
                      className="min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-400 hover:text-rose-400 rounded-lg cursor-pointer"
                      title="Remover da lista"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="flex items-center gap-1.5">
                      <div className="flex-1">
                        <label className="text-[10px] font-bold text-slate-400 block mb-0.5">
                          {unit === "L" ? "Litros (L) Baixado / Vendido" : "Kg Baixado / Vendido"}
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={ln.weightKgStr}
                          onChange={(e) => {
                            const val = e.target.value;
                            const parsedKg = Math.max(0, parseFloat(val.replace(",", ".")) || 0);
                            setLines((prev) =>
                              prev.map((item) => {
                                if (item.materialId !== ln.materialId) return item;
                                const nextRev =
                                  !item.manualRevenue && sellP > 0
                                    ? parsedKg > 0
                                      ? roundCurrencyBrl(parsedKg * sellP).toFixed(2)
                                      : ""
                                    : item.revenueStr;
                                return { ...item, weightKgStr: val, revenueStr: nextRev };
                              })
                            );
                          }}
                          placeholder="0.00"
                          className="w-full min-h-[42px] bg-slate-900 border border-cyan-500/35 rounded-xl px-3 font-mono font-black text-white text-sm outline-none"
                        />
                      </div>
                      {(mat.stockKg || 0) > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            const fullKg = roundWeightKg(mat.stockKg || 0);
                            setLines((prev) =>
                              prev.map((item) =>
                                item.materialId === ln.materialId
                                  ? {
                                      ...item,
                                      weightKgStr: String(fullKg),
                                      revenueStr:
                                        sellP > 0 ? roundCurrencyBrl(fullKg * sellP).toFixed(2) : item.revenueStr,
                                      manualRevenue: false
                                    }
                                  : item
                              )
                            );
                          }}
                          className="min-h-[42px] mt-4 px-2.5 bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-cyan-300 font-black text-[11px] rounded-xl cursor-pointer"
                        >
                          Tudo
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-emerald-300 block mb-0.5">
                        Valor Recebido (R$)
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={ln.revenueStr}
                        onChange={(e) => {
                          const val = e.target.value;
                          setLines((prev) =>
                            prev.map((item) =>
                              item.materialId === ln.materialId
                                ? { ...item, revenueStr: val, manualRevenue: true }
                                : item
                            )
                          );
                        }}
                        placeholder="0.00"
                        className="w-full min-h-[42px] bg-slate-900 border border-emerald-500/40 rounded-xl px-3 font-mono font-black text-emerald-300 text-sm outline-none"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Comprador + Forma de Recebimento */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <input
            type="text"
            value={buyerName}
            onChange={(e) => setBuyerName(e.target.value)}
            placeholder="Destino / Comprador (ex: Carrocinha / Depósito)"
            className="min-h-[44px] bg-slate-950 border border-white/15 rounded-xl px-3 text-xs text-white outline-none"
          />
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as any)}
            className="min-h-[44px] bg-slate-950 border border-white/15 rounded-xl px-3 text-xs text-white font-bold outline-none"
          >
            <option value="dinheiro">💵 Dinheiro</option>
            <option value="pix">💳 Pix</option>
            <option value="cartao_debito">💳 Cartão Débito</option>
            <option value="cartao_credito">💳 Cartão Crédito</option>
          </select>
        </div>

        {/* Resumo do Fechamento da Baixa */}
        <div className="p-3.5 bg-slate-950 rounded-2xl border border-emerald-500/35 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs tabular-nums">
          <div>
            <span className="text-slate-400 block text-[10.5px]">Peso / Litros Baixado</span>
            <strong className="font-mono font-black text-white text-sm">
              {formatWeightKgDetailed(summary.totalKg)} kg
              {summary.totalLiters > 0 ? ` + ${formatWeightKgDetailed(summary.totalLiters)} L` : ""}
            </strong>
          </div>
          <div>
            <span className="text-slate-400 block text-[10.5px]">Entrou em Vendas</span>
            <strong className="font-mono font-black text-cyan-300 text-sm">
              R$ {formatBrl(summary.totalRevenue)}
            </strong>
          </div>
          <div>
            <span className="text-slate-400 block text-[10.5px]">
              {originType === "coleta_propria" ? "Custo (100% Própria)" : "Custo Compra Est."}
            </span>
            <strong className="font-mono font-black text-amber-300 text-sm">
              R$ {formatBrl(summary.totalEstimatedCost)}
            </strong>
          </div>
          <div>
            <span className="text-slate-400 block text-[10.5px]">Lucro da Baixa</span>
            <strong
              className={`font-mono font-black text-sm ${
                summary.profit >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {summary.profit >= 0 ? "+" : ""}R$ {formatBrl(summary.profit)}
            </strong>
          </div>
        </div>

        {/* Botões finais */}
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[46px] px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={summary.validLines.length === 0}
            onClick={() => {
              onConfirmBatchSale({
                lines: summary.validLines,
                buyerName: buyerName.trim() || "Carrocinha / Revenda do Dia",
                paymentMethod,
                originType
              });
            }}
            className="min-h-[48px] px-5 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 disabled:opacity-40 text-slate-950 font-black text-xs sm:text-sm uppercase rounded-xl cursor-pointer touch-manipulation"
          >
            Confirmar Baixa do Dia ({summary.validLines.length})
          </button>
        </div>
      </div>
    </div>
  );
};
