/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  CheckCircle2,
  Sparkles,
  Zap,
  Package,
  Crown,
  CreditCard,
  QrCode,
  ShieldCheck,
  Check,
  Tag,
  AlertCircle,
  Smartphone,
  ChevronRight,
  Info
} from "lucide-react";
import {
  SUBSCRIPTION_PLANS,
  SubscriptionTier,
  TierPlanInfo,
  saveSubscriptionTier
} from "../utils/subscriptionTiers";

interface SubscriptionPlansModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier: SubscriptionTier;
  onTierChange: (tier: SubscriptionTier) => void;
  showNotification: (msg: string, type?: "success" | "error" | "info") => void;
  targetFeatureName?: string;
  initialSelectedTier?: SubscriptionTier;
}

export const SubscriptionPlansModal: React.FC<SubscriptionPlansModalProps> = ({
  isOpen,
  onClose,
  currentTier,
  onTierChange,
  showNotification,
  targetFeatureName,
  initialSelectedTier
}) => {
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>(
    initialSelectedTier || (targetFeatureName?.includes("Estoque") ? "estoque_gestao" : "pdv_total")
  );
  const [showPixStep, setShowPixStep] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const currentPlan = SUBSCRIPTION_PLANS.find((p) => p.id === selectedTier) || SUBSCRIPTION_PLANS[3];

  const handleSelectPlan = (tierId: SubscriptionTier) => {
    setSelectedTier(tierId);
    setShowPixStep(false);
  };

  const handleActivatePlan = (tierId: SubscriptionTier) => {
    setIsProcessing(true);
    setTimeout(() => {
      saveSubscriptionTier(tierId);
      onTierChange(tierId);
      setIsProcessing(false);
      setShowPixStep(false);
      const planName = SUBSCRIPTION_PLANS.find((p) => p.id === tierId)?.name || "Plano";
      showNotification(`🎉 ${planName} ativado com sucesso! Aproveite todos os recursos liberados.`, "success");
      onClose();
    }, 800);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[250] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-md"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          className="relative bg-slate-900 border border-slate-800 text-white w-full max-w-4xl rounded-3xl sm:rounded-[2.5rem] shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
        >
          {/* Header */}
          <div className="p-5 sm:p-7 border-b border-slate-800/80 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-850 flex items-start justify-between gap-4 shrink-0">
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Modelo Freemium Inteligente
                </span>
                {targetFeatureName && (
                  <span className="bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                    Desbloqueio de: <strong>{targetFeatureName}</strong>
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                Planos & Níveis de Acesso
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
                Ferramentas essenciais gratuitas para o público e comércio do bairro, com módulos profissionais para impulsionar suas vendas e estoque!
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer shrink-0"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content - Scrollable */}
          <div className="p-4 sm:p-7 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
            {/* Free Tier Callout - Clarifying that basic features are 100% free */}
            <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-emerald-300 uppercase tracking-wide">
                    O que é 100% Gratuito (Não paga nada):
                  </h4>
                  <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 leading-relaxed">
                    <strong>Calculadora Comum</strong>, <strong>Lista de Compras de Supermercado</strong>, <strong>Encartes de Supermercados Grandes & Ofertas</strong>, <strong>Bloco de Notas Comum</strong> e <strong>Agenda</strong>.
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleSelectPlan("free")}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider shrink-0 transition-all ${
                  selectedTier === "free"
                    ? "bg-emerald-500 text-slate-950"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                }`}
              >
                Ver Detalhes Grátis
              </button>
            </div>

            {/* Grid of the 4 Tiers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {SUBSCRIPTION_PLANS.map((plan) => {
                const isSelected = selectedTier === plan.id;
                const isCurrentActive = currentTier === plan.id;

                return (
                  <div
                    key={plan.id}
                    onClick={() => handleSelectPlan(plan.id)}
                    className={`relative rounded-3xl p-5 border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? plan.id === "pdv_total"
                          ? "bg-purple-950/40 border-purple-500 shadow-xl shadow-purple-500/10 scale-[1.02]"
                          : plan.id === "estoque_gestao"
                          ? "bg-emerald-950/40 border-emerald-500 shadow-xl shadow-emerald-500/10 scale-[1.02]"
                          : plan.id === "pro_tools"
                          ? "bg-amber-950/40 border-amber-500 shadow-xl shadow-amber-500/10 scale-[1.02]"
                          : "bg-emerald-950/40 border-emerald-500 shadow-xl shadow-emerald-500/10 scale-[1.02]"
                        : "bg-slate-850/60 border-slate-800 hover:border-slate-700 hover:bg-slate-850"
                    }`}
                  >
                    {/* Popular / Best value badge */}
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[9px] font-black uppercase px-3 py-0.5 rounded-full shadow-md tracking-wider">
                        Recomendado / Completo
                      </div>
                    )}

                    <div>
                      {/* Top Header of Card */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border uppercase tracking-wider ${plan.badgeBg}`}>
                          {plan.badge}
                        </span>
                        {isCurrentActive && (
                          <span className="text-[9px] bg-slate-800 text-slate-300 font-bold px-1.5 py-0.5 rounded">
                            Ativo
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-black text-white">{plan.name}</h3>
                      <p className="text-[11px] text-slate-400 mb-3">{plan.tagline}</p>

                      {/* Price */}
                      <div className="mb-4">
                        <span className="text-2xl font-black text-white font-mono">{plan.price}</span>
                        <span className="text-[10px] text-slate-400 ml-1.5">{plan.period}</span>
                      </div>

                      {/* Features preview */}
                      <ul className="space-y-2 mb-4 text-[11px] text-slate-300">
                        {plan.features.slice(0, 4).map((f, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            <span className="leading-snug">{f}</span>
                          </li>
                        ))}
                        {plan.features.length > 4 && (
                          <li className="text-[10px] text-slate-400 italic pl-5">
                            + {plan.features.length - 4} outros recursos liberados
                          </li>
                        )}
                      </ul>
                    </div>

                    <button
                      type="button"
                      className={`w-full py-2.5 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all cursor-pointer ${
                        isSelected
                          ? plan.id === "pdv_total"
                            ? "bg-purple-500 text-white shadow-lg shadow-purple-500/25"
                            : plan.id === "estoque_gestao"
                            ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25"
                            : plan.id === "pro_tools"
                            ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25"
                            : "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25"
                          : "bg-slate-800 hover:bg-slate-750 text-slate-300"
                      }`}
                    >
                      {isSelected ? "Selecionado" : "Escolher"}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Selected Plan Detail & Activation Bar */}
            <div className="bg-slate-850/80 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    Plano Selecionado
                  </span>
                  <div className="flex items-center gap-3 mt-1">
                    <h3 className="text-xl font-black text-white">{currentPlan.name}</h3>
                    <span className="text-xl font-black text-emerald-400 font-mono">
                      {currentPlan.price}{" "}
                      <span className="text-xs text-slate-400 font-normal">/{currentPlan.period}</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">{currentPlan.description}</p>
                </div>

                {currentPlan.id === "free" ? (
                  <button
                    onClick={() => handleActivatePlan("free")}
                    className="px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
                  >
                    Permanecer no Grátis
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowPixStep(!showPixStep)}
                      className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <QrCode className="w-4 h-4 text-emerald-400" />
                      Pagar com Pix
                    </button>
                    <button
                      disabled={isProcessing}
                      onClick={() => handleActivatePlan(currentPlan.id)}
                      className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-xl flex items-center gap-2 cursor-pointer ${
                        currentPlan.id === "pdv_total"
                          ? "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white shadow-purple-500/25"
                          : currentPlan.id === "estoque_gestao"
                          ? "bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/25"
                          : "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/25"
                      }`}
                    >
                      {isProcessing ? "Ativando..." : `Liberar Agora (${currentPlan.price})`}
                      <CreditCard className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Full Features Checklist of Selected Plan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {currentPlan.features.map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 text-xs text-slate-200 bg-slate-900/50 p-2.5 rounded-xl border border-slate-800/80">
                    <div className="w-5 h-5 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-medium">{feat}</span>
                  </div>
                ))}
              </div>

              {/* Pix Payment Drawer Simulation if clicked */}
              {showPixStep && currentPlan.priceNum > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 mt-4 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                        <QrCode className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-black text-white uppercase tracking-wider">
                        Pix Automático para Ativação Instantânea
                      </span>
                    </div>
                    <span className="text-xs font-mono font-black text-emerald-400">
                      {currentPlan.price}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300">
                    Escaneie o QR Code abaixo no app do seu banco ou use a chave Pix para ativar sua assinatura na hora:
                  </p>

                  <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <div className="w-32 h-32 bg-white rounded-xl p-2 flex items-center justify-center shrink-0 shadow-md">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=00020101021226870014br.gov.bcb.pix2565pix.calculadoracerebro.com.br/plan-${currentPlan.id}-${currentPlan.priceNum}`}
                        alt="QR Code Pix"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="space-y-2 text-center sm:text-left flex-1 min-w-0">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Chave Pix Copia e Cola:</span>
                      <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg font-mono text-[10px] text-slate-300 truncate">
                        00020101021226870014br.gov.bcb.pix2565pix.calculadoracerebro.com.br/plan-{currentPlan.id}
                      </div>
                      <div className="flex items-center gap-2 justify-center sm:justify-start pt-1">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`00020101021226870014br.gov.bcb.pix2565pix.calculadoracerebro.com.br/plan-${currentPlan.id}`);
                            showNotification("Chave Pix copiada para a área de transferência! 📋", "success");
                          }}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer"
                        >
                          Copiar Chave Pix 📋
                        </button>
                        <button
                          onClick={() => handleActivatePlan(currentPlan.id)}
                          className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg text-[10px] font-black uppercase transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
                        >
                          Já Paguei! Liberar Acesso ✅
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Merchant Sponsorship Promo Box (Highlighting the user's idea of gaining supermarket sponsorships) */}
            <div className="bg-gradient-to-r from-red-950/40 via-slate-900 to-amber-950/30 border border-red-500/30 rounded-3xl p-5 sm:p-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <span className="bg-red-500 text-white text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full">
                    Oportunidade Comercial
                  </span>
                  <span className="text-xs font-bold text-amber-300">
                    Patrocínio de Supermercados & Notificações Push
                  </span>
                </div>
                <h4 className="text-sm sm:text-base font-black text-white">
                  Quer patrocinar o aplicativo ou colocar o encarte do seu supermercado?
                </h4>
                <p className="text-[11px] sm:text-xs text-slate-400 max-w-xl">
                  Supermercados e atacadistas podem anunciar ofertas semanais diretamente para os clientes do bairro com disparos de notificações push no celular!
                </p>
              </div>

              <a
                href="https://wa.me/5521999999999?text=Ol%C3%A1!%20Tenho%20interesse%20em%20anunciar%20o%20encarte%20e%20ofertas%20do%20meu%20supermercado%20no%20aplicativo."
                target="_blank"
                rel="noreferrer"
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-xs uppercase tracking-wider shrink-0 shadow-lg shadow-red-500/20 transition-all cursor-pointer text-center"
              >
                Anunciar Supermercado 📢
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
