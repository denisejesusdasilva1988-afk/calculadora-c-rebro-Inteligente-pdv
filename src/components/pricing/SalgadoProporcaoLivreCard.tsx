import React, { useState } from "react";
import {
  Scale,
  Sparkles,
  CheckCircle2,
  PieChart,
  ArrowRight,
  Flame,
  ShoppingBag,
  Info,
  ChevronRight,
  RotateCcw
} from "lucide-react";
import { SmartNumericInput } from "./SmartNumericInput";

export interface SalgadoTypeConfig {
  id: string;
  name: string;
  emoji: string;
  defaultMassaG: number;
  defaultRecheioG: number;
  massaDescription: string;
  recheioDescription: string;
}

export const SALGADOS_TYPES: SalgadoTypeConfig[] = [
  {
    id: "coxinha",
    name: "Coxinha",
    emoji: "🥟",
    defaultMassaG: 45,
    defaultRecheioG: 35,
    massaDescription: "Massa de farinha cozida com caldo de frango e margarina",
    recheioDescription: "Peito de frango desfiado temperado com cheiro verde ou catupiry"
  },
  {
    id: "risoles",
    name: "Risoles",
    emoji: "🥟",
    defaultMassaG: 45,
    defaultRecheioG: 35,
    massaDescription: "Massa cozida macia dobrada em meia-lua com empanamento fino",
    recheioDescription: "Carne moída refogada, presunto & queijo ou palmito cremoso"
  },
  {
    id: "kibe",
    name: "Kibe Frito",
    emoji: "🌾",
    defaultMassaG: 50,
    defaultRecheioG: 35,
    massaDescription: "Massa de trigo para quibe com carne moída, hortelã e cebola",
    recheioDescription: "Carne moída refogada bem sequinha com especiarias ou catupiry"
  },
  {
    id: "bolinha_queijo",
    name: "Bolinha de Queijo",
    emoji: "🧀",
    defaultMassaG: 45,
    defaultRecheioG: 35,
    massaDescription: "Massa aveludada crocante com empanamento na farinha de rosca",
    recheioDescription: "Cubo ou pasta de queijo muçarela com orégano"
  },
  {
    id: "enroladinho",
    name: "Enroladinho",
    emoji: "🌭",
    defaultMassaG: 45,
    defaultRecheioG: 35,
    massaDescription: "Massa tradicional enrolada",
    recheioDescription: "Salsicha aferventada ou presunto e queijo"
  },
  {
    id: "outro",
    name: "Salgado Livre / Outro",
    emoji: "⚖️",
    defaultMassaG: 45,
    defaultRecheioG: 35,
    massaDescription: "Massa personalizada pesada na balança",
    recheioDescription: "Recheio a sua escolha"
  }
];

interface SalgadoProporcaoLivreCardProps {
  onApplyToRecipe?: (massaG: number, recheioG: number, totalUnitG: number, name: string) => void;
  formatCurrency?: (val: number) => string;
}

export function SalgadoProporcaoLivreCard({
  onApplyToRecipe,
  formatCurrency = (v) => `R$ ${v.toFixed(2).replace(".", ",")}`
}: SalgadoProporcaoLivreCardProps) {
  const [selectedType, setSelectedType] = useState<string>("coxinha");
  const [recheioG, setRecheioG] = useState<number>(35);
  const [massaG, setMassaG] = useState<number>(45);

  // Planejador de lote (Meta em unidades)
  const [batchTargetUnits, setBatchTargetUnits] = useState<number>(100);

  // Verificador de bancada (O que já tem pronto na cozinha)
  const [kitchenMassaKg, setKitchenMassaKg] = useState<number>(2.0);
  const [kitchenRecheioKg, setKitchenRecheioKg] = useState<number>(1.5);

  const currentConfig = SALGADOS_TYPES.find((s) => s.id === selectedType) || SALGADOS_TYPES[0];

  // Peso final do salgado na balança digital
  const totalUnitWeightG = (Number(massaG) || 0) + (Number(recheioG) || 0);

  // Percentuais
  const massaPct = totalUnitWeightG > 0 ? ((Number(massaG) || 0) / totalUnitWeightG) * 100 : 0;
  const recheioPct = totalUnitWeightG > 0 ? ((Number(recheioG) || 0) / totalUnitWeightG) * 100 : 0;

  // Classificação comercial do tamanho
  let sizeLabel = "Lanchonete / Padaria (80g a 85g)";
  let sizeBadgeColor = "bg-amber-500/20 text-amber-300 border-amber-500/30";
  if (totalUnitWeightG < 25) {
    sizeLabel = "Festa / Cento Tradicional (15g a 22g)";
    sizeBadgeColor = "bg-pink-500/20 text-pink-300 border-pink-500/30";
  } else if (totalUnitWeightG < 55) {
    sizeLabel = "Coquetel / Buffet Médio (30g a 50g)";
    sizeBadgeColor = "bg-cyan-500/20 text-cyan-300 border-cyan-500/30";
  } else if (totalUnitWeightG > 105) {
    sizeLabel = "Gigante de Bar / Posto / Estufa (110g a 150g)";
    sizeBadgeColor = "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
  }

  // Cálculos de Produção do Lote (Meta de Unidades)
  const totalMassaNeededKg = ((Number(massaG) || 0) * batchTargetUnits) / 1000;
  const totalRecheioNeededKg = ((Number(recheioG) || 0) * batchTargetUnits) / 1000;
  const totalBatchProductionKg = (totalUnitWeightG * batchTargetUnits) / 1000;

  // Cálculos de Bancada (O que já tem pronto na cozinha)
  const kitchenMassaG = (Number(kitchenMassaKg) || 0) * 1000;
  const kitchenRecheioG = (Number(kitchenRecheioKg) || 0) * 1000;

  const yieldByMassa = (Number(massaG) || 0) > 0 ? Math.floor(kitchenMassaG / massaG) : 0;
  const yieldByRecheio = (Number(recheioG) || 0) > 0 ? Math.floor(kitchenRecheioG / recheioG) : 0;

  const maxCompleteSalgados = Math.min(yieldByMassa, yieldByRecheio);
  const leftoverMassaG = Math.max(0, kitchenMassaG - maxCompleteSalgados * (Number(massaG) || 0));
  const leftoverRecheioG = Math.max(0, kitchenRecheioG - maxCompleteSalgados * (Number(recheioG) || 0));

  const handleSelectPresetType = (typeId: string) => {
    setSelectedType(typeId);
    const found = SALGADOS_TYPES.find((s) => s.id === typeId);
    if (found) {
      setMassaG(found.defaultMassaG);
      setRecheioG(found.defaultRecheioG);
    }
  };

  return (
    <div className="bg-slate-950 p-4 sm:p-6 rounded-3xl border-2 border-emerald-500/40 shadow-2xl space-y-6 text-left">
      {/* HEADER */}
      <div className="border-b border-white/10 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider border border-emerald-500/30 flex items-center gap-1">
              <Scale className="w-3 h-3" />
              BALANÇA DIGITAL DE MONTAGEM
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase tracking-wider border border-amber-500/30">
              PROPORÇÃO LIVRE
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
            <span>{currentConfig.emoji}</span>
            <span>Calculadora de Peso Livre: Recheio + Massa = Salgado Final</span>
          </h3>
          <p className="text-xs text-slate-300 mt-0.5">
            Defina livremente a quantidade exata de gramas de recheio (ex: <strong>35g</strong>) e massa (ex: <strong>45g a 50g</strong>). O peso do salgado é calculado na hora!
          </p>
        </div>

        {onApplyToRecipe && (
          <button
            type="button"
            onClick={() => onApplyToRecipe(massaG, recheioG, totalUnitWeightG, currentConfig.name)}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-950/40 cursor-pointer shrink-0 flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Aplicar na Ficha Técnica</span>
          </button>
        )}
      </div>

      {/* SELETOR RÁPIDO DO TIPO DE SALGADO (Coxinha, Risoles, Kibe, Bolinha de Queijo, Outro) */}
      <div className="space-y-1.5">
        <label className="text-xs font-black uppercase tracking-wider text-slate-400 block">
          Escolha o tipo de salgado:
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {SALGADOS_TYPES.map((st) => {
            const isSelected = selectedType === st.id;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => handleSelectPresetType(st.id)}
                className={`p-2.5 rounded-2xl border text-left transition-all flex flex-col justify-between gap-1 cursor-pointer ${
                  isSelected
                    ? "bg-emerald-500/20 border-emerald-400 text-white shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-400/50"
                    : "bg-slate-900/60 border-white/5 text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xl">{st.emoji}</span>
                  {isSelected && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
                </div>
                <strong className="text-xs font-black block leading-tight">{st.name}</strong>
              </button>
            );
          })}
        </div>
      </div>

      {/* PAINEL CENTRAL DA BALANÇA DIGITAL: RECHEIO + MASSA = PESO FINAL */}
      <div className="bg-gradient-to-br from-slate-950 to-slate-900 p-5 sm:p-6 rounded-3xl border-2 border-emerald-500/30 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          {/* CAMPO 1: RECHEIO (g) */}
          <div className="bg-slate-900/80 p-4 rounded-2xl border border-amber-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                🍗 Recheio por Salgado
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Balança (g)</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRecheioG((prev) => Math.max(0, prev - 5))}
                className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-black text-base flex items-center justify-center cursor-pointer transition-colors"
                title="Diminuir 5g"
              >
                -
              </button>
              <div className="relative flex-1">
                <SmartNumericInput
                  value={recheioG}
                  onChange={(val) => setRecheioG(val)}
                  suffix="g"
                  allowDecimals
                  clearable
                  className="border-amber-400/50 text-amber-400 text-xl font-black text-center py-2.5 focus:border-amber-300"
                  placeholder="35"
                />
              </div>
              <button
                type="button"
                onClick={() => setRecheioG((prev) => prev + 5)}
                className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-black text-base flex items-center justify-center cursor-pointer transition-colors"
                title="Aumentar 5g"
              >
                +
              </button>
            </div>

            {/* Atalhos rápidos de recheio */}
            <div className="flex flex-wrap gap-1 pt-1">
              {[15, 20, 30, 35, 40, 50].map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setRecheioG(g)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                    recheioG === g
                      ? "bg-amber-400 text-slate-950 font-black"
                      : "bg-slate-800 text-slate-300 hover:text-white"
                  }`}
                >
                  {g}g {g === 35 ? "⭐" : ""}
                </button>
              ))}
            </div>
          </div>

          {/* SINAL DE MAIS + CAMPO 2: MASSA (g) */}
          <div className="bg-slate-900/80 p-4 rounded-2xl border border-emerald-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                🥣 Massa por Salgado
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Balança (g)</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMassaG((prev) => Math.max(0, prev - 5))}
                className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-black text-base flex items-center justify-center cursor-pointer transition-colors"
                title="Diminuir 5g"
              >
                -
              </button>
              <div className="relative flex-1">
                <SmartNumericInput
                  value={massaG}
                  onChange={(val) => setMassaG(val)}
                  suffix="g"
                  allowDecimals
                  clearable
                  className="border-emerald-400/50 text-emerald-400 text-xl font-black text-center py-2.5 focus:border-emerald-300"
                  placeholder="45"
                />
              </div>
              <button
                type="button"
                onClick={() => setMassaG((prev) => prev + 5)}
                className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-black text-base flex items-center justify-center cursor-pointer transition-colors"
                title="Aumentar 5g"
              >
                +
              </button>
            </div>

            {/* Atalhos rápidos de massa (com 45g e 50g em destaque) */}
            <div className="flex flex-wrap gap-1 pt-1">
              {[20, 30, 45, 50, 60, 70].map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setMassaG(g)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                    massaG === g
                      ? "bg-emerald-400 text-slate-950 font-black"
                      : "bg-slate-800 text-slate-300 hover:text-white"
                  }`}
                >
                  {g}g {g === 45 || g === 50 ? "⭐" : ""}
                </button>
              ))}
            </div>
          </div>

          {/* SINAL DE IGUAL = CAMPO 3: DISPLAY PESO FINAL NA BALANÇA */}
          <div className="bg-black/90 p-4 rounded-2xl border-2 border-cyan-400/50 shadow-inner space-y-2 text-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400 block font-mono">
              ⚖️ PESO FINAL DO SALGADO NA BALANÇA
            </span>

            <div className="flex items-baseline justify-center gap-1.5 py-1">
              <span className="text-3xl sm:text-4xl font-black font-mono text-cyan-300">
                {totalUnitWeightG}
              </span>
              <span className="text-sm font-bold font-mono text-cyan-500">gramas</span>
            </div>

            <div className="text-[10px] text-slate-300 font-mono">
              <span className="text-amber-400 font-bold">{recheioG}g recheio</span> +{" "}
              <span className="text-emerald-400 font-bold">{massaG}g massa</span>
            </div>

            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9.5px] font-black border ${sizeBadgeColor}`}>
              {sizeLabel}
            </span>
          </div>
        </div>

        {/* BARRA VISUAL DA CORTE TRANSVERSAL DO SALGADO */}
        <div className="space-y-1.5 bg-slate-900/40 p-3.5 rounded-2xl border border-white/5">
          <div className="flex justify-between text-xs font-bold text-slate-300">
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
              Massa: {massaG}g ({massaPct.toFixed(1)}%)
            </span>
            <span className="flex items-center gap-1 text-amber-400">
              <span className="w-2.5 h-2.5 rounded bg-amber-500" />
              Recheio: {recheioG}g ({recheioPct.toFixed(1)}%)
            </span>
          </div>

          {/* Barra dividida */}
          <div className="w-full h-4 bg-slate-950 rounded-full overflow-hidden flex border border-white/10">
            <div
              style={{ width: `${massaPct}%` }}
              className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 transition-all duration-300"
              title={`Massa: ${massaG}g (${massaPct.toFixed(1)}%)`}
            />
            <div
              style={{ width: `${recheioPct}%` }}
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300"
              title={`Recheio: ${recheioG}g (${recheioPct.toFixed(1)}%)`}
            />
          </div>
        </div>
      </div>

      {/* CALCULADORA DUPLA DE PRODUÇÃO: META DE CENTO VS BANCO DA COZINHA */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* MODO A: QUERO FAZER X SALGADOS (META DE CENTOS / ENCOMENDA) */}
        <div className="bg-slate-900/70 p-4 sm:p-5 rounded-2xl border border-white/10 space-y-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4 text-emerald-400" />
              1. Quanto devo preparar na panela?
            </h4>
            <span className="text-[10px] text-slate-400">Para Encomendas</span>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300 uppercase block">
              Quantos salgados você quer fazer hoje?
            </label>
            <div className="flex items-center gap-2">
              <div className="w-32">
                <SmartNumericInput
                  value={batchTargetUnits}
                  onChange={(val) => setBatchTargetUnits(val)}
                  suffix="un"
                  allowDecimals={false}
                  clearable
                  className="text-center font-black"
                  placeholder="100"
                />
              </div>
              <span className="text-xs text-slate-300 font-bold">
                salgados ({(batchTargetUnits / 100).toFixed(1)} centos)
              </span>
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-white/5 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">🥣 Massa total a cozinhar:</span>
              <strong className="text-emerald-400 font-mono text-sm">
                {totalMassaNeededKg.toFixed(2)} kg ({totalMassaNeededKg * 1000}g)
              </strong>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">🍗 Recheio total a preparar:</span>
              <strong className="text-amber-400 font-mono text-sm">
                {totalRecheioNeededKg.toFixed(2)} kg ({totalRecheioNeededKg * 1000}g)
              </strong>
            </div>
            <div className="flex justify-between items-center border-t border-white/10 pt-1.5 text-slate-300 font-black">
              <span>Peso total da produção pronta:</span>
              <span className="text-cyan-300 font-mono text-sm">{totalBatchProductionKg.toFixed(2)} kg</span>
            </div>
          </div>
        </div>

        {/* MODO B: O QUE JÁ TENHO PRONTO NA COZINHA (EQUILÍBRIO MASSA VS RECHEIO) */}
        <div className="bg-slate-900/70 p-4 sm:p-5 rounded-2xl border border-white/10 space-y-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-amber-400" />
              2. Quanto rende o que já tenho pronto?
            </h4>
            <span className="text-[10px] text-slate-400">Balança da Bancada</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-300 uppercase block">Massa Pronta (kg):</label>
              <SmartNumericInput
                value={kitchenMassaKg}
                onChange={(val) => setKitchenMassaKg(val)}
                suffix="kg"
                allowDecimals
                step={0.1}
                clearable
                className="text-center font-black text-emerald-400 py-1.5 text-xs"
                placeholder="2.0"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-300 uppercase block">Recheio Pronto (kg):</label>
              <SmartNumericInput
                value={kitchenRecheioKg}
                onChange={(val) => setKitchenRecheioKg(val)}
                suffix="kg"
                allowDecimals
                step={0.1}
                clearable
                className="text-center font-black text-amber-400 py-1.5 text-xs"
                placeholder="1.5"
              />
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-white/5 space-y-1.5 text-xs">
            <div className="flex justify-between items-center text-sm font-black">
              <span className="text-white">Rendimento Completo:</span>
              <strong className="text-emerald-400 font-mono text-base">
                {maxCompleteSalgados} {currentConfig.name}s de {totalUnitWeightG}g
              </strong>
            </div>
            <div className="text-[11px] text-slate-400 leading-tight">
              {leftoverMassaG > 5 ? (
                <span className="text-cyan-400 font-bold block">
                  • Sobram {leftoverMassaG}g de massa na tigela (o recheio acabou primeiro).
                </span>
              ) : leftoverRecheioG > 5 ? (
                <span className="text-amber-400 font-bold block">
                  • Sobram {leftoverRecheioG}g de recheio na tigela (a massa acabou primeiro).
                </span>
              ) : (
                <span className="text-emerald-400 font-bold block">
                  • Equilíbrio perfeito! Praticamente zero sobras de bancada.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
