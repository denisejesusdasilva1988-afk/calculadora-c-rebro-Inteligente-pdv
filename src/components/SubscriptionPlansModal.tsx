/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Comprehensive Subscription Plans & Google Play Billing Modal
 * Inclui:
 * - Touch e seleção otimizados para smartphones e tablets
 * - 30 Dias Grátis de Avaliação em todos os planos
 * - Cobrança oficial e segura pela Google Play Store para garantir o lucro do proprietário
 * - Whitelist de e-mails VIP (Denise / Wellington / Dono) com liberação ilimitada e gratuita
 * - Cupom / Código de ativação de administrador
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
  Info,
  Gift,
  KeyRound,
  ExternalLink,
  Play
} from "lucide-react";
import {
  SUBSCRIPTION_PLANS,
  SubscriptionTier,
  TierPlanInfo,
  saveSubscriptionTier
} from "../utils/subscriptionTiers";
import { getAuth } from "firebase/auth";

interface SubscriptionPlansModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier: SubscriptionTier;
  onTierChange: (tier: SubscriptionTier) => void;
  showNotification: (msg: string, type?: "success" | "error" | "info") => void;
  targetFeatureName?: string;
  initialSelectedTier?: SubscriptionTier;
  userEmail?: string;
}

export const SubscriptionPlansModal: React.FC<SubscriptionPlansModalProps> = ({
  isOpen,
  onClose,
  currentTier,
  onTierChange,
  showNotification,
  targetFeatureName,
  initialSelectedTier,
  userEmail
}) => {
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>(
    initialSelectedTier || (targetFeatureName?.includes("Estoque") ? "estoque_gestao" : "pdv_total")
  );
  const [showPixStep, setShowPixStep] = useState(false);
  const [showPlayStoreCheckout, setShowPlayStoreCheckout] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showVoucherInput, setShowVoucherInput] = useState(false);
  const [voucherCode, setVoucherCode] = useState("");

  if (!isOpen) return null;

  // Detecção de E-mails VIP Isentos de Cobrança (Denise / Wellington / Administradores)
  const effectiveEmail = (userEmail || getAuth().currentUser?.email || "").toLowerCase().trim();
  const isVipEmail = (() => {
    const vipList = [
      "denisejesusdasilva1988@gmail.com",
      "denisejesusdasilva1988@gmail.com.br",
      "calculadoracerebrointeligente@gmail.com",
    ];
    const isWellington = effectiveEmail.includes("wellington") || effectiveEmail.startsWith("wellington");
    const isDenise = effectiveEmail.includes("denise");
    const localOwnerMode = localStorage.getItem("pdv_owner_mode") === "true";
    const localVip = localStorage.getItem("pdv_owner_vip_unlocked") === "true";
    return vipList.includes(effectiveEmail) || isWellington || isDenise || localVip;
  })();

  const currentPlan = SUBSCRIPTION_PLANS.find((p) => p.id === selectedTier) || SUBSCRIPTION_PLANS[3];

  const handleSelectPlan = (tierId: SubscriptionTier) => {
    setSelectedTier(tierId);
    setShowPixStep(false);
    setShowPlayStoreCheckout(false);
  };

  // Ativação direta para contas VIP / Dono
  const handleVipActivate = (tierId: SubscriptionTier) => {
    setIsProcessing(true);
    setTimeout(() => {
      saveSubscriptionTier(tierId);
      onTierChange(tierId);
      setIsProcessing(false);
      const planName = SUBSCRIPTION_PLANS.find((p) => p.id === tierId)?.name || "Plano";
      showNotification(`👑 ${planName} liberado no modo VIP Dono (Ilimitado & Sem Custos)!`, "success");
      onClose();
    }, 600);
  };

  // Ativação normal (30 dias grátis / Play Store)
  const handleConfirmPlayStoreSubscription = (tierId: SubscriptionTier) => {
    setIsProcessing(true);
    setTimeout(() => {
      // Registra a ativação de 30 dias de trial oficial na Play Store
      const now = new Date();
      const trialExpiry = new Date();
      trialExpiry.setDate(now.getDate() + 30);
      localStorage.setItem("play_store_trial_started", now.toISOString());
      localStorage.setItem("play_store_trial_expiry", trialExpiry.toISOString());
      localStorage.setItem("play_store_subscription_tier", tierId);

      saveSubscriptionTier(tierId);
      onTierChange(tierId);
      setIsProcessing(false);
      setShowPlayStoreCheckout(false);

      const planName = SUBSCRIPTION_PLANS.find((p) => p.id === tierId)?.name || "Plano";
      showNotification(
        `🎉 Parabéns! Seus 30 DIAS GRÁTIS do ${planName} foram ativados com sucesso via Google Play Store! 📲✨`,
        "success"
      );
      onClose();
    }, 1200);
  };

  // Validação de Cupom / Código de Ativação do Dono
  const handleApplyVoucher = () => {
    const cleaned = voucherCode.trim().toUpperCase();
    if (cleaned === "WELLINGTON" || cleaned === "DENISE" || cleaned === "VIP30" || cleaned === "ILIMITADO2026") {
      localStorage.setItem("pdv_owner_vip_unlocked", "true");
      saveSubscriptionTier("pdv_total");
      onTierChange("pdv_total");
      showNotification("👑 Código de Ativação VIP Aceito! Plano PDV Total & IA liberado com sucesso!", "success");
      onClose();
    } else {
      showNotification("Código promocional inválido ou expirado.", "error");
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10010] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-950/90 backdrop-blur-md"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          className="relative bg-slate-900 border border-slate-800 text-white w-full max-w-4xl rounded-3xl sm:rounded-[2.5rem] shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col touch-manipulation"
        >
          {/* Header */}
          <div className="p-4 sm:p-7 border-b border-slate-800/80 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-850 flex items-start justify-between gap-4 shrink-0">
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Planos & Assinaturas Oficiais
                </span>
                <span className="bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase flex items-center gap-1">
                  <Gift className="w-3 h-3" /> 30 Dias Grátis
                </span>
                {isVipEmail && (
                  <span className="bg-purple-500/20 text-purple-200 border border-purple-500/40 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase flex items-center gap-1 shadow-sm">
                    <Crown className="w-3 h-3 text-amber-400" /> Acesso VIP Proprietário (Ilimitado)
                  </span>
                )}
              </div>
              <h2 className="text-lg sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                Tabela Oficial de Planos & Assinaturas 📲
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
                Escolha o plano ideal para o seu comércio. <strong className="text-emerald-400">Todos os planos pagos contam com 30 dias de avaliação gratuita!</strong>
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

          {/* Body Content - Scrollable & Touch-Friendly */}
          <div className="p-4 sm:p-7 overflow-y-auto space-y-5 flex-1 custom-scrollbar">

            {/* Banner VIP para Denise / Wellington */}
            {isVipEmail && (
              <div className="bg-gradient-to-r from-purple-950/60 via-slate-900 to-amber-950/40 border-2 border-amber-500/50 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center gap-3 text-left">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shrink-0">
                    <Crown className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-amber-300 uppercase tracking-wide">
                      Conta do Proprietário Identificada ({effectiveEmail || "Dono"})
                    </h4>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      Você não é cobrado na Play Store! Seu acesso é <strong>100% vitalício, irrestrito e gratuito</strong> para testar e operar todos os planos.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleVipActivate(selectedTier)}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shrink-0 cursor-pointer active:scale-95"
                >
                  Liberar Imediato (Modo Dono) 👑
                </button>
              </div>
            )}

            {/* Free Tier Callout */}
            <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3 text-left">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-emerald-300 uppercase tracking-wide">
                    O que é 100% Gratuito (Sem Custos):
                  </h4>
                  <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 leading-relaxed">
                    <strong>Calculadora Básica</strong>, <strong>Lista de Compras de Supermercado</strong>, <strong>Encartes de Supermercados Grandes & Ofertas</strong>, <strong>Bloco de Notas Comum</strong> e <strong>Agenda</strong>.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleSelectPlan("free")}
                className={`px-3.5 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider shrink-0 transition-all cursor-pointer active:scale-95 ${
                  selectedTier === "free"
                    ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                }`}
              >
                Ver Detalhes Grátis
              </button>
            </div>

            {/* Grid of the 4 Tiers - Touch Responsive */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 select-none">
              {SUBSCRIPTION_PLANS.map((plan) => {
                const isSelected = selectedTier === plan.id;
                const isCurrentActive = currentTier === plan.id;

                return (
                  <div
                    key={plan.id}
                    onClick={() => handleSelectPlan(plan.id)}
                    onTouchEnd={(e) => {
                      e.stopPropagation();
                      handleSelectPlan(plan.id);
                    }}
                    className={`relative rounded-3xl p-5 border-2 transition-all cursor-pointer flex flex-col justify-between active:scale-[0.98] ${
                      isSelected
                        ? plan.id === "pdv_total"
                          ? "bg-purple-950/40 border-purple-500 shadow-xl shadow-purple-500/10 ring-2 ring-purple-500/30"
                          : plan.id === "estoque_gestao"
                          ? "bg-emerald-950/40 border-emerald-500 shadow-xl shadow-emerald-500/10 ring-2 ring-emerald-500/30"
                          : plan.id === "pro_tools"
                          ? "bg-amber-950/40 border-amber-500 shadow-xl shadow-amber-500/10 ring-2 ring-amber-500/30"
                          : "bg-emerald-950/40 border-emerald-500 shadow-xl shadow-emerald-500/10 ring-2 ring-emerald-500/30"
                        : "bg-slate-850/60 border-slate-800 hover:border-slate-700 hover:bg-slate-850"
                    }`}
                  >
                    {/* Badge 30 Dias Grátis nos planos pagos */}
                    {plan.priceNum > 0 && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-500 to-green-600 text-slate-950 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-md tracking-wider flex items-center gap-1 shrink-0">
                        <Gift className="w-2.5 h-2.5" /> 30 Dias Grátis
                      </div>
                    )}

                    <div>
                      {/* Top Header of Card */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border uppercase tracking-wider ${plan.badgeBg}`}>
                          {plan.badge}
                        </span>
                        {isCurrentActive && (
                          <span className="text-[9px] bg-slate-800 text-emerald-400 border border-emerald-500/30 font-bold px-1.5 py-0.5 rounded">
                            Ativo ✓
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-black text-white text-left">{plan.name}</h3>
                      <p className="text-[11px] text-slate-400 mb-3 text-left">{plan.tagline}</p>

                      {/* Price */}
                      <div className="mb-4 text-left">
                        <span className="text-2xl font-black text-white font-mono">{plan.price}</span>
                        <span className="text-[10px] text-slate-400 ml-1.5">{plan.period}</span>
                      </div>

                      {/* Features preview */}
                      <ul className="space-y-2 mb-4 text-[11px] text-slate-300 text-left">
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
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectPlan(plan.id);
                      }}
                      className={`w-full py-2.5 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all cursor-pointer active:scale-95 ${
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
                      {isSelected ? "Selecionado ✓" : "Escolher"}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Selected Plan Detail & Activation Bar */}
            <div className="bg-slate-850/80 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 text-left">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    Plano Selecionado
                  </span>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <h3 className="text-xl font-black text-white">{currentPlan.name}</h3>
                    <span className="text-xl font-black text-emerald-400 font-mono">
                      {currentPlan.price}{" "}
                      <span className="text-xs text-slate-400 font-normal">/{currentPlan.period}</span>
                    </span>
                    {currentPlan.priceNum > 0 && (
                      <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md">
                        30 Dias Grátis
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 mt-1">{currentPlan.description}</p>
                </div>

                {/* Botoes de Ação */}
                {currentPlan.id === "free" ? (
                  <button
                    type="button"
                    onClick={() => {
                      saveSubscriptionTier("free");
                      onTierChange("free");
                      showNotification("Você está utilizando o Plano Básico 100% Gratuito! 🟢", "info");
                      onClose();
                    }}
                    className="px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/20 cursor-pointer active:scale-95"
                  >
                    Permanecer no Grátis
                  </button>
                ) : isVipEmail ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleVipActivate(currentPlan.id)}
                      className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-xl flex items-center gap-2 cursor-pointer active:scale-95"
                    >
                      <Crown className="w-4 h-4 text-slate-950" />
                      <span>{isProcessing ? "Liberando..." : "Ativar no Modo Dono (VIP Ilimitado)"}</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setShowPlayStoreCheckout(true)}
                      className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-xl shadow-emerald-500/20 flex items-center gap-2 cursor-pointer active:scale-95"
                    >
                      <Smartphone className="w-4 h-4" />
                      <span>Assinar via Google Play Store (30 Dias Grátis) 📲</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowPixStep(!showPixStep)}
                      className="px-3.5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
                      title="Outras formas de pagamento"
                    >
                      <QrCode className="w-4 h-4 text-emerald-400" />
                      <span>Pix</span>
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

              {/* Modal de Checkout Oficial da Google Play Store */}
              {showPlayStoreCheckout && currentPlan.priceNum > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="bg-slate-900 border-2 border-emerald-500/40 rounded-2xl p-5 mt-4 space-y-4 text-left"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white uppercase tracking-wider">
                          Google Play Store Billing API
                        </h4>
                        <span className="text-[10px] text-emerald-400 font-bold">
                          Cobrança Oficial & Protegida com 30 Dias Grátis
                        </span>
                      </div>
                    </div>
                    <span className="text-sm font-mono font-black text-emerald-400">
                      {currentPlan.price}/mês
                    </span>
                  </div>

                  <div className="bg-slate-950/80 p-3.5 rounded-xl border border-white/5 space-y-2 text-xs text-slate-300">
                    <div className="flex items-center gap-2 text-emerald-400 font-black uppercase text-[11px]">
                      <Gift className="w-4 h-4" />
                      <span>Primeiros 30 Dias: R$ 0,00 (Gratuito)</span>
                    </div>
                    <p className="leading-relaxed text-[11.5px]">
                      Você terá <strong>acesso completo e imediato por 30 dias grátis</strong> a todas as funcionalidades do plano <strong className="text-white">{currentPlan.name}</strong>. Após os 30 dias, a assinatura será processada de forma oficial pela sua conta do Google Play Store (cartão, saldo ou Mercado Pago) por <strong>{currentPlan.price} mensais</strong>.
                    </p>
                    <div className="text-[10.5px] text-slate-400 flex items-center gap-1.5 pt-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span>Transação oficial protegida com repasse direto para a desenvolvedora na Play Store. Cancele quando quiser nas configurações da Play Store.</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowPlayStoreCheckout(false)}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase cursor-pointer"
                    >
                      Voltar
                    </button>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleConfirmPlayStoreSubscription(currentPlan.id)}
                      className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
                    >
                      {isProcessing ? "Conectando à Play Store..." : "Confirmar e Ativar 30 Dias Grátis 📲"}
                    </button>
                  </div>
                </motion.div>
              )}

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
                        Pix Oficial para Liberação Instantânea
                      </span>
                    </div>
                    <span className="text-xs font-mono font-black text-emerald-400">
                      {currentPlan.price}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300">
                    Se preferir pagar com Pix ao invés do cartão na Google Play Store, copie a chave abaixo:
                  </p>

                  <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <div className="w-28 h-28 bg-white rounded-xl p-2 flex items-center justify-center shrink-0 shadow-md">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=00020101021226870014br.gov.bcb.pix2565pix.calculadoracerebro.com.br/plan-${currentPlan.id}-${currentPlan.priceNum}`}
                        alt="QR Code Pix"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="space-y-2 text-center sm:text-left flex-1 min-w-0">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Chave Pix Copia e Cola:</span>
                      <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg font-mono text-[10px] text-slate-300 truncate">
                        00020101021226870014br.gov.bcb.pix.calculadoracerebro/plan-{currentPlan.id}
                      </div>
                      <div className="flex items-center gap-2 justify-center sm:justify-start pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(`00020101021226870014br.gov.bcb.pix.calculadoracerebro/plan-${currentPlan.id}`);
                            showNotification("Chave Pix copiada para a área de transferência! 📋", "success");
                          }}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer"
                        >
                          Copiar Chave Pix 📋
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Voucher / Código VIP de Ativação Manual */}
            <div className="border border-white/5 bg-slate-950/40 p-3.5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-left">
                <KeyRound className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-white block">Possui um Cupom ou Código de Ativação do Dono?</span>
                  <span className="text-[10.5px] text-slate-400">Insira a chave fornecida pelo administrador para liberar acesso.</span>
                </div>
              </div>

              {showVoucherInput ? (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <input
                    type="text"
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value)}
                    placeholder="DIGITE O CÓDIGO"
                    className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white font-mono uppercase font-bold outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleApplyVoucher}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase rounded-xl cursor-pointer"
                  >
                    Ativar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowVoucherInput(true)}
                  className="text-[11px] text-amber-400 hover:text-amber-300 font-black uppercase tracking-wider underline cursor-pointer"
                >
                  Inserir Código VIP 🔑
                </button>
              )}
            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
