/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Seletor Completo de Modos de Cores & Temas (Claro, Escuro e Paletas de Cores)
 * para a Calculadora Cérebro PDV.
 * Oferece temas adaptados a cada nicho: Barbearia (Âmbar/Dourado), Salão de Beleza (Roxo),
 * Mercados (Verde Menta), Lanchonetes (Rubi), Escritórios (Azul Oceano),
 * Modo Claro (Clean Day) e Preto Absoluto OLED para economia de bateria!
 */

import React from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Sun,
  Moon,
  Palette,
  Check,
  Sparkles,
  Smartphone,
  Eye,
  Zap,
  Scissors,
  ShoppingBag,
  Flame,
  BatteryCharging
} from "lucide-react";

export type ThemeMode = "dark" | "light";

export type ColorPalette =
  | "slate"      // Escuro Clássico
  | "amber"      // Dourado & Âmbar (Barbearia / Gourmet)
  | "ocean"      // Azul Oceano & Tecnologia
  | "violet"     // Roxo Ametista (Salão & Beleza)
  | "emerald"    // Verde Menta & Hortifruti
  | "ruby"       // Vermelho Rubi & Lanchonete
  | "oled";      // Preto Absoluto OLED (Economia Máxima)

export interface PaletteOption {
  id: ColorPalette;
  name: string;
  category: string;
  description: string;
  icon: React.ReactNode;
  bgPreview: string;
  cardPreview: string;
  accentPreview: string;
  badgeColor: string;
}

export const PALETTES: PaletteOption[] = [
  {
    id: "slate",
    name: "Ardósia Clássica",
    category: "Padrão & Elegante",
    description: "Tons de ardósia escuro com realces verde esmeralda suaves. O visual padrão e consagrado do Cérebro PDV.",
    icon: <Sparkles className="w-4 h-4 text-emerald-400" />,
    bgPreview: "#020617",
    cardPreview: "#0f172a",
    accentPreview: "#10b981",
    badgeColor: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
  },
  {
    id: "amber",
    name: "Dourado Imperial & Âmbar",
    category: "Barbearias & Hamburguerias",
    description: "Tons nobres de âmbar, couro e ouro polido. Criado especialmente para barbearias, cafés e lojas premium.",
    icon: <Scissors className="w-4 h-4 text-amber-400" />,
    bgPreview: "#140e06",
    cardPreview: "#23180c",
    accentPreview: "#f59e0b",
    badgeColor: "bg-amber-500/10 text-amber-300 border-amber-500/30"
  },
  {
    id: "violet",
    name: "Roxo Ametista & Beleza",
    category: "Salão, Manicure & Estética",
    description: "Roxo refinado com toques de lilás e fúcsia. O preferido de salões de beleza, esmalterias e cosméticos.",
    icon: <Sparkles className="w-4 h-4 text-purple-400" />,
    bgPreview: "#13091f",
    cardPreview: "#221138",
    accentPreview: "#a855f7",
    badgeColor: "bg-purple-500/10 text-purple-300 border-purple-500/30"
  },
  {
    id: "ocean",
    name: "Azul Oceano & Cobalto",
    category: "Comércio, Escritório & TI",
    description: "Azul tecnológico moderno e equilibrado. Transmite máxima confiança e profissionalismo ao operador de caixa.",
    icon: <Zap className="w-4 h-4 text-sky-400" />,
    bgPreview: "#061325",
    cardPreview: "#0c2340",
    accentPreview: "#0284c7",
    badgeColor: "bg-sky-500/10 text-sky-300 border-sky-500/30"
  },
  {
    id: "emerald",
    name: "Verde Menta & Hortifruti",
    category: "Mercadinhos & Sacolões",
    description: "Cores vivas e naturais de frescor. Ideal para mercados de bairro, quitandas, padarias e feiras.",
    icon: <ShoppingBag className="w-4 h-4 text-emerald-400" />,
    bgPreview: "#061811",
    cardPreview: "#0d2e20",
    accentPreview: "#10b981",
    badgeColor: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
  },
  {
    id: "ruby",
    name: "Vermelho Rubi & Brasa",
    category: "Pizzarias & Lanchonetes",
    description: "Vermelho carmim energético e vibrante. Acelera os pedidos em restaurantes, açougues e entregas rápidas.",
    icon: <Flame className="w-4 h-4 text-rose-400" />,
    bgPreview: "#1c090d",
    cardPreview: "#301018",
    accentPreview: "#e11d48",
    badgeColor: "bg-rose-500/10 text-rose-300 border-rose-500/30"
  },
  {
    id: "oled",
    name: "Preto Absoluto OLED",
    category: "Economia Máxima de Bateria",
    description: "Fundo 100% preto desligando os pixels em telas AMOLED e celulares. Super nitidez e zero cansaço visual.",
    icon: <BatteryCharging className="w-4 h-4 text-lime-400" />,
    bgPreview: "#000000",
    cardPreview: "#0a0a0a",
    accentPreview: "#84cc16",
    badgeColor: "bg-lime-500/10 text-lime-300 border-lime-500/30"
  }
];

interface ThemeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  themeMode: ThemeMode;
  colorPalette: ColorPalette;
  onChangeThemeMode: (mode: ThemeMode) => void;
  onChangeColorPalette: (palette: ColorPalette) => void;
  fontScale?: "normal" | "grande" | "extragrande";
  onCycleFontScale?: () => void;
  showNotification?: (msg: string, type?: "success" | "info" | "error") => void;
}

export const ThemeSelectorModal: React.FC<ThemeSelectorModalProps> = ({
  isOpen,
  onClose,
  themeMode,
  colorPalette,
  onChangeThemeMode,
  onChangeColorPalette,
  fontScale = "normal",
  onCycleFontScale,
  showNotification = (_msg?: string, _type?: "success" | "info" | "error") => {}
}) => {
  if (!isOpen) return null;

  const handleSelectMode = (mode: ThemeMode) => {
    onChangeThemeMode(mode);
    showNotification(
      mode === "light"
        ? "Modo Claro Ativado! ☀️ Visual limpo e iluminado para o dia."
        : "Modo Escuro Ativado! 🌙 Conforto visual e economia de energia.",
      "success"
    );
  };

  const handleSelectPalette = (palette: ColorPalette) => {
    onChangeColorPalette(palette);
    const pal = PALETTES.find((p) => p.id === palette);
    showNotification(`Paleta "${pal?.name}" aplicada com sucesso! 🎨✨`, "success");
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10025] flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-md"
          onClick={onClose}
        />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative bg-slate-900 border border-white/10 text-white w-full max-w-2xl rounded-3xl sm:rounded-[2.5rem] shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
        >
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-white/10 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-indigo-500 text-slate-950 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
                <Palette className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                    Cores & Aparência do Aplicativo
                  </h3>
                  <span className="bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                    Personalizável
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">
                  Escolha entre Modo Claro, Escuro e paletas exclusivas para cada tipo de negócio!
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer shrink-0"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
            {/* SEÇÃO 1: MODO CLARO VS MODO ESCURO */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>1. Modo de Iluminação (Dia & Noite)</span>
                </span>
                <span className="text-[10px] text-slate-400 font-bold">
                  {themeMode === "light" ? "Modo Claro Ativo ☀️" : "Modo Escuro Ativo 🌙"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Botão Modo Claro */}
                <button
                  type="button"
                  onClick={() => handleSelectMode("light")}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-2.5 relative overflow-hidden ${
                    themeMode === "light"
                      ? "bg-white text-slate-900 border-amber-400 shadow-xl ring-2 ring-amber-400/50"
                      : "bg-slate-950/70 border-white/10 text-slate-300 hover:border-white/20 hover:bg-slate-950"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
                        <Sun className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-tight">
                          Modo Claro ☀️
                        </h4>
                        <span className="text-[10px] text-slate-500 font-medium block">
                          Ambientes claros e dia
                        </span>
                      </div>
                    </div>
                    {themeMode === "light" && (
                      <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <div className="h-6 rounded-lg bg-slate-100 border border-slate-200 flex items-center px-2 gap-1.5 text-[9px] font-bold text-slate-700">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span>Fundo branco com texto nítido</span>
                  </div>
                </button>

                {/* Botão Modo Escuro */}
                <button
                  type="button"
                  onClick={() => handleSelectMode("dark")}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-2.5 relative overflow-hidden ${
                    themeMode === "dark"
                      ? "bg-slate-950 text-white border-indigo-400 shadow-xl ring-2 ring-indigo-400/50"
                      : "bg-slate-950/70 border-white/10 text-slate-300 hover:border-white/20 hover:bg-slate-950"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-indigo-950 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold">
                        <Moon className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-tight">
                          Modo Escuro 🌙
                        </h4>
                        <span className="text-[10px] text-slate-400 font-medium block">
                          Conforto & descanso visual
                        </span>
                      </div>
                    </div>
                    {themeMode === "dark" && (
                      <span className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <div className="h-6 rounded-lg bg-slate-900 border border-white/10 flex items-center px-2 gap-1.5 text-[9px] font-bold text-slate-300">
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
                    <span>Fundo escuro e economia de tela</span>
                  </div>
                </button>
              </div>
            </div>

            {/* SEÇÃO 2: PALETAS DE CORES & NICHOS */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Palette className="w-3.5 h-3.5 text-indigo-400" />
                  <span>2. Várias Escolhas de Cores para o seu Negócio</span>
                </span>
                <span className="text-[10px] text-indigo-300 font-bold">
                  {PALETTES.length} Estilos Disponíveis
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PALETTES.map((pal) => {
                  const isSelected = colorPalette === pal.id;

                  return (
                    <div
                      key={pal.id}
                      onClick={() => handleSelectPalette(pal.id)}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 relative ${
                        isSelected
                          ? "bg-slate-950 border-amber-400/80 shadow-xl shadow-black/40 ring-2 ring-amber-400/40 scale-[1.01]"
                          : "bg-slate-950/60 border-white/5 hover:border-white/20 hover:bg-slate-950/90"
                      }`}
                    >
                      {/* Top: Icon + Title + Selected Check */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center shadow-md shrink-0 border border-white/10"
                            style={{ backgroundColor: pal.cardPreview }}
                          >
                            {pal.icon}
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                              <span>{pal.name}</span>
                            </h4>
                            <span className="text-[9.5px] text-amber-300/90 font-bold block">
                              {pal.category}
                            </span>
                          </div>
                        </div>

                        {isSelected ? (
                          <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </span>
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-white/20 shrink-0" />
                        )}
                      </div>

                      {/* Description */}
                      <p className="text-[10.5px] text-slate-400 leading-relaxed">
                        {pal.description}
                      </p>

                      {/* Live color swatches preview */}
                      <div className="pt-1 border-t border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] uppercase font-bold text-slate-500">
                            Amostra:
                          </span>
                          <div
                            className="w-5 h-5 rounded-lg border border-white/20 shadow-inner"
                            style={{ backgroundColor: pal.bgPreview }}
                            title="Fundo principal"
                          />
                          <div
                            className="w-5 h-5 rounded-lg border border-white/20 shadow-inner"
                            style={{ backgroundColor: pal.cardPreview }}
                            title="Cards e painéis"
                          />
                          <div
                            className="w-5 h-5 rounded-lg border border-white/30 shadow-md"
                            style={{ backgroundColor: pal.accentPreview }}
                            title="Botões e destaques"
                          />
                        </div>

                        <span
                          className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${
                            isSelected
                              ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                              : "text-slate-500 border-white/5"
                          }`}
                        >
                          {isSelected ? "Em Uso ✅" : "Escolher"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SEÇÃO 3: ACESSIBILIDADE - LETRAS GRANDES */}
            {onCycleFontScale && (
              <div className="bg-slate-950/80 p-4 rounded-2xl border border-white/10 flex items-center justify-between gap-3 flex-wrap">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-black uppercase text-white">
                      Tamanho das Letras & Visibilidade
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Ajuste instantâneo para facilitar a leitura no balcão ou celular.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onCycleFontScale}
                  className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer"
                >
                  <span className="font-mono text-xs font-black">
                    {fontScale === "extragrande" ? "A++" : fontScale === "grande" ? "A+" : "A"}
                  </span>
                  <span>
                    {fontScale === "extragrande" ? "Letras Máximas" : fontScale === "grande" ? "Letras Grandes" : "Letras Padrão"}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-5 border-t border-white/10 bg-slate-950/60 flex items-center justify-between gap-3 shrink-0">
            <span className="text-[10px] text-slate-400 font-medium">
              Sua escolha é salva automaticamente e sincronizada! 💾
            </span>
            <button
              onClick={onClose}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase px-5 py-2.5 rounded-xl transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              Concluir & Aplicar 🎨
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
