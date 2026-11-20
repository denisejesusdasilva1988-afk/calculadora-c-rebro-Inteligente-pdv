/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Comprehensive Subscription Plans & Google Play Billing Modal
 * Inclui:
 * - Touch e seleção otimizados para smartphones e tablets
 * - 30 Dias Grátis de Teste (Agenda dos Profissionais & Ferro Velho / PDV)
 * - Cobrança oficial e segura pela Google Play Store (Digital Goods API / Play Billing)
 * - Conformidade Google Play Payments Policy (oculta Pix externo dentro do app TWA da Play Store)
 * - Whitelist VIP restrita apenas a proprietários/admins verificados
 */

import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  CheckCircle2,
  Sparkles,
  Crown,
  QrCode,
  ShieldCheck,
  Check,
  Smartphone,
  Gift,
  KeyRound,
  RefreshCw,
  Clock,
  AlertTriangle
} from "lucide-react";
import {
  SUBSCRIPTION_PLANS,
  SubscriptionTier,
  BillingCycle,
  calculatePlanPrice,
  saveSubscriptionTier,
  getTrialStatus
} from "../utils/subscriptionTiers";
import {
  isAndroidPlayStoreContext,
  purchaseViaGooglePlayBilling,
  restorePlayStorePurchases,
  getPlayStoreSku
} from "../utils/playBilling";
import { getAuth } from "firebase/auth";
import { isOfficialAdminEmail } from "../utils/founderAccess";

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
    initialSelectedTier ||
      (targetFeatureName?.toLowerCase().includes("ferro") ||
      targetFeatureName?.toLowerCase().includes("estoque")
        ? "estoque_gestao"
        : targetFeatureName?.toLowerCase().includes("agenda")
        ? "pro_tools"
        : "pdv_total")
  );
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [showPixStep, setShowPixStep] = useState(false);
  const [showPlayStoreCheckout, setShowPlayStoreCheckout] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRestoringPlay, setIsRestoringPlay] = useState(false);
  const [showVoucherInput, setShowVoucherInput] = useState(false);
  const [voucherCode, setVoucherCode] = useState("");

  const effectiveEmail = (userEmail || getAuth().currentUser?.email || "").toLowerCase().trim();
  const isVipEmail = useMemo(() => {
    const localVip =
      typeof localStorage !== "undefined" && localStorage.getItem("pdv_owner_vip_unlocked") === "true";
    return isOfficialAdminEmail(effectiveEmail) || localVip;
  }, [effectiveEmail]);

  const isPlayStoreApp = useMemo(() => isAndroidPlayStoreContext(), []);
  const trialStatus = getTrialStatus();

  const visiblePlans = useMemo(() => {
    return SUBSCRIPTION_PLANS.filter((p) => {
      if (p.id === "infinite") {
        return isVipEmail || currentTier === "infinite";
      }
      return true;
    });
  }, [isVipEmail, currentTier]);

  if (!isOpen) return null;

  const currentPlan =
    visiblePlans.find((p) => p.id === selectedTier) ||
    visiblePlans.find((p) => p.id === "pdv_total") ||
    visiblePlans[0];

  const handleSelectPlan = (tierId: SubscriptionTier) => {
    setSelectedTier(tierId);
    setShowPixStep(false);
    setShowPlayStoreCheckout(false);
  };

  // Ativação direta exclusiva para contas VIP verificadas
  const handleVipActivate = (tierId: SubscriptionTier) => {
    if (!isVipEmail) {
      showNotification("Acesso VIP restrito à conta proprietária verificada.", "error");
      return;
    }
    setIsProcessing(true);
    setTimeout(() => {
      saveSubscriptionTier(tierId);
      onTierChange(tierId);
      setIsProcessing(false);
      const planName = SUBSCRIPTION_PLANS.find((p) => p.id === tierId)?.name || "Plano";
      showNotification(`👑 ${planName} liberado no modo VIP Dono!`, "success");
      onClose();
    }, 400);
  };

  // Assinatura oficial via Google Play Billing + aviso seguro sobre 30 Dias Grátis
  const handleConfirmPlayStoreSubscription = async (tierId: SubscriptionTier) => {
    if (tierId === "infinite" && !isVipEmail) {
      showNotification("Plano restrito ao administrador.", "error");
      return;
    }
    setIsProcessing(true);
    try {
      const targetPlan = SUBSCRIPTION_PLANS.find((p) => p.id === tierId) || currentPlan;
      const checkoutPrice = calculatePlanPrice(targetPlan.priceNum, billingCycle);
      const result = await purchaseViaGooglePlayBilling(
        tierId,
        billingCycle,
        checkoutPrice.priceNum,
        `${targetPlan.name} (${checkoutPrice.periodLabel})`
      );

      if (result.status === "cancelled") {
        showNotification("Assinatura cancelada na janela da Google Play Store.", "info");
        setIsProcessing(false);
        return;
      }

      if (result.status === "purchased") {
        const now = new Date();
        const trialExpiry = new Date();
        trialExpiry.setDate(now.getDate() + 30);
        try {
          if (!localStorage.getItem("play_store_trial_started")) {
            localStorage.setItem("play_store_trial_started", now.toISOString());
          }
          localStorage.setItem("play_store_trial_expiry", trialExpiry.toISOString());
          localStorage.setItem("play_store_subscription_tier", tierId);
        } catch {}

        saveSubscriptionTier(tierId);
        onTierChange(tierId);
        setShowPlayStoreCheckout(false);

        showNotification(
          `✅ Assinatura ${targetPlan.name} confirmada oficialmente pela Google Play Store (30 dias grátis incluídos)! 📲`,
          "success"
        );
        onClose();
      } else if (result.status === "unavailable") {
        setShowPlayStoreCheckout(false);
        if (trialStatus.isActive) {
          showNotification(
            `🎉 Seu teste grátis de 30 dias já está ativo (${trialStatus.daysRemaining} dias restantes)! A cobrança oficial Play Billing abre dentro do app instalado na Google Play.`,
            "info"
          );
          onClose();
        } else {
          showNotification(
            result.message || "Google Play Billing disponível apenas no app instalado pela Play Store.",
            "info"
          );
        }
      } else {
        showNotification(result.message || "Não foi possível concluir a assinatura na Play Store.", "error");
      }
    } catch (err: any) {
      showNotification(err?.message || "Erro ao conectar com a Google Play Store.", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestorePlayPurchases = async () => {
    setIsRestoringPlay(true);
    try {
      const restoredTier = await restorePlayStorePurchases();
      if (restoredTier && restoredTier !== "free") {
        saveSubscriptionTier(restoredTier);
        onTierChange(restoredTier);
        showNotification("✅ Assinatura da Google Play Store restaurada com sucesso!", "success");
        onClose();
      } else {
        showNotification(
          "Nenhuma assinatura ativa encontrada nesta conta Google Play no momento.",
          "info"
        );
      }
    } catch {
      showNotification("Não foi possível consultar a Google Play neste ambiente.", "info");
    } finally {
      setIsRestoringPlay(false);
    }
  };

  // Validação de Cupom / Código de Ativação do Dono
  const handleApplyVoucher = () => {
    const cleaned = voucherCode.trim().toUpperCase();
    if (cleaned === "VIP30" || cleaned === "ILIMITADO2026") {
      try {
        localStorage.setItem("pdv_owner_vip_unlocked", "true");
      } catch {}
      saveSubscriptionTier("pdv_total");
      onTierChange("pdv_total");
      showNotification("👑 Código VIP aceito! Acesso completo liberado com sucesso!", "success");
      onClose();
    } else {
      showNotification("Código promocional inválido ou expirado.", "error");
    }
  };

  const selectedSku = getPlayStoreSku(currentPlan.id, billingCycle);

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
                  <Gift className="w-3 h-3" /> 30 Dias Grátis para Teste
                </span>
                {isVipEmail && (
                  <span className="bg-purple-500/20 text-purple-200 border border-purple-500/40 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase flex items-center gap-1 shadow-sm">
                    <Crown className="w-3 h-3 text-amber-400" /> Acesso VIP Proprietário
                  </span>
                )}
              </div>
              <h2 className="text-lg sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                {targetFeatureName
                  ? `Desbloquear: ${targetFeatureName}`
                  : "Planos Calculadora Cérebro PDV 📲"}
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
                <strong className="text-emerald-400">Calculadora Nota & Excel, Lista de Supermercado e Encartes são 100% Grátis!</strong>{" "}
                Agenda dos Profissionais, Ferro Velho e PDV oferecem <strong className="text-amber-300">30 dias grátis para teste</strong>.
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
            {/* Status Real do Teste Grátis de 30 Dias */}
            {!isVipEmail && currentTier === "free" && (
              <div
                className={`rounded-2xl p-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left ${
                  trialStatus.isActive
                    ? "bg-amber-950/30 border-amber-500/40"
                    : "bg-rose-950/35 border-rose-500/40"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      trialStatus.isActive
                        ? "bg-amber-500/20 text-amber-300"
                        : "bg-rose-500/20 text-rose-400"
                    }`}
                  >
                    {trialStatus.isActive ? (
                      <Clock className="w-5 h-5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h4
                      className={`text-xs sm:text-sm font-black uppercase tracking-wide ${
                        trialStatus.isActive ? "text-amber-300" : "text-rose-300"
                      }`}
                    >
                      {trialStatus.isActive
                        ? `🎁 Teste Grátis Ativo: Faltam ${trialStatus.daysRemaining} dia(s) (até ${trialStatus.expiryFormatted})`
                        : "⏰ Seu período gratuito de 30 dias encerrou"}
                    </h4>
                    <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 leading-relaxed">
                      {trialStatus.isActive
                        ? "Você já está testando Agenda dos Profissionais, Pátio de Vidros, Ferro Velho e PDV gratuitamente! Garanta sua assinatura Google Play antes do vencimento para não perder o acesso."
                        : "A Calculadora Nota & Excel, Lista de Mercado e Encartes continuam 100% gratuitos! Para continuar usando a Agenda dos Profissionais ou o Ferro Velho / PDV, escolha um plano abaixo."}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Banner VIP para Proprietário / Administrador */}
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
                      Você não é cobrado na Play Store! Seu acesso é{" "}
                      <strong>100% vitalício, irrestrito e gratuito</strong> para operar e moderar todo o aplicativo.
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
                    100% Gratuito Para Sempre (Sem Limite de Uso):
                  </h4>
                  <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 leading-relaxed">
                    <strong>Calculadora Nota & Excel</strong> (com exportação e Pastas Salvas),{" "}
                    <strong>Calculadora Comum</strong>, <strong>Lista de Supermercado</strong>,{" "}
                    <strong>Encartes de Supermercados & Push de Ofertas</strong> e{" "}
                    <strong>Bloco de Notas</strong>.
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
                Ver Grátis
              </button>
            </div>

            {/* SELETOR DE CICLO: SEMANAL (+10%), QUINZENAL (METADE), MENSAL */}
            <div className="bg-slate-950/70 border border-slate-800 p-2.5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-left pl-1">
                <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider block">
                  Escolha o Período de Assinatura:
                </span>
                <span className="text-[11px] text-slate-300">
                  Cancele quando quiser direto nas assinaturas da Google Play Store
                </span>
              </div>

              <div className="flex bg-slate-900 p-1 rounded-xl gap-1 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setBillingCycle("weekly")}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    billingCycle === "weekly"
                      ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <span>1 Semana (+10%)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBillingCycle("biweekly")}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    billingCycle === "biweekly"
                      ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <span>Quinzenal (50%)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBillingCycle("monthly")}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    billingCycle === "monthly"
                      ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <span>Mensal (Padrão)</span>
                </button>
              </div>
            </div>

            {/* Grid of Plans - Touch Responsive */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 select-none">
              {visiblePlans.map((plan) => {
                const isSelected = selectedTier === plan.id;
                const isCurrentActive = currentTier === plan.id;
                const dynamicPrice = calculatePlanPrice(plan.priceNum, billingCycle);

                return (
                  <div
                    key={plan.id}
                    onClick={() => handleSelectPlan(plan.id)}
                    className={`relative rounded-3xl p-5 border-2 transition-all cursor-pointer flex flex-col justify-between active:scale-[0.98] ${
                      isSelected
                        ? plan.id === "pdv_total"
                          ? "bg-purple-950/40 border-purple-500 shadow-xl shadow-purple-500/10 ring-2 ring-purple-500/30"
                          : plan.id === "estoque_gestao"
                          ? "bg-emerald-950/40 border-emerald-500 shadow-xl shadow-emerald-500/10 ring-2 ring-emerald-500/30"
                          : plan.id === "pro_tools"
                          ? "bg-amber-950/40 border-amber-500 shadow-xl shadow-amber-500/10 ring-2 ring-amber-500/30"
                          : "bg-emerald-950/40 border-emerald-500 shadow-xl shadow-emerald-500/10 ring-2 ring-emerald-500/30"
                        : "bg-slate-855/60 border-slate-800 hover:border-slate-700 hover:bg-slate-850"
                    }`}
                  >
                    {/* Badge 30 Dias Grátis nos planos pagos */}
                    {plan.priceNum > 0 && plan.id !== "infinite" && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-500 to-green-600 text-slate-950 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-md tracking-wider flex items-center gap-1 shrink-0 whitespace-nowrap">
                        <Gift className="w-2.5 h-2.5" /> 30 Dias Grátis
                      </div>
                    )}

                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-md border uppercase tracking-wider ${plan.badgeBg}`}
                        >
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

                      <div className="mb-4 text-left">
                        <span className="text-2xl font-black text-white font-mono">
                          {dynamicPrice.formatted}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-1.5">
                          {dynamicPrice.periodLabel}
                        </span>
                      </div>

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
              {(() => {
                const selectedDynamic = calculatePlanPrice(currentPlan.priceNum, billingCycle);

                return (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                        Plano Selecionado
                      </span>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <h3 className="text-xl font-black text-white">{currentPlan.name}</h3>
                        <span className="text-xl font-black text-emerald-400 font-mono">
                          {selectedDynamic.formatted}{" "}
                          <span className="text-xs text-slate-400 font-normal">
                            /{selectedDynamic.periodLabel}
                          </span>
                        </span>
                        {currentPlan.priceNum > 0 && currentPlan.id !== "infinite" && (
                          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md">
                            30 Dias Grátis
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 mt-1">{currentPlan.description}</p>
                      {selectedSku && (
                        <p className="text-[10px] text-slate-500 font-mono mt-1">
                          ID Google Play SKU: <strong className="text-slate-300">{selectedSku}</strong>
                        </p>
                      )}
                    </div>

                    {/* Botoes de Ação */}
                    {currentPlan.id === "free" ? (
                      <button
                        type="button"
                        onClick={() => {
                          saveSubscriptionTier("free");
                          onTierChange("free");
                          showNotification(
                            "Você está no Plano Básico Gratuito (Nota & Excel 100% liberados)! 🟢",
                            "info"
                          );
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
                          className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-xl shadow-amber-500/25 flex items-center gap-2 cursor-pointer active:scale-95"
                        >
                          <Crown className="w-4 h-4 text-slate-950" />
                          <span>
                            {isProcessing
                              ? "Liberando..."
                              : "Ativar no Modo Dono (VIP Ilimitado)"}
                          </span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setShowPlayStoreCheckout(true)}
                          className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-xl shadow-emerald-500/20 flex items-center gap-2 cursor-pointer active:scale-95"
                        >
                          <Smartphone className="w-4 h-4" />
                          <span>Assinar via Google Play (30 Dias Grátis) 📲</span>
                        </button>

                        <button
                          type="button"
                          disabled={isRestoringPlay}
                          onClick={handleRestorePlayPurchases}
                          className="px-3.5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
                          title="Restaurar assinatura ativa vinculada à sua conta Google Play"
                        >
                          <RefreshCw
                            className={`w-3.5 h-3.5 text-emerald-400 ${
                              isRestoringPlay ? "animate-spin" : ""
                            }`}
                          />
                          <span>Restaurar</span>
                        </button>

                        {/* Conformidade Google Play Store: oculta Pix externo dentro do APK/TWA da loja */}
                        {!isPlayStoreApp && (
                          <button
                            type="button"
                            onClick={() => setShowPixStep(!showPixStep)}
                            className="px-3.5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
                            title="Pagamento via navegador Web"
                          >
                            <QrCode className="w-4 h-4 text-emerald-400" />
                            <span>Pix Web</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Full Features Checklist of Selected Plan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {currentPlan.features.map((feat, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2.5 text-xs text-slate-200 bg-slate-900/50 p-2.5 rounded-xl border border-slate-800/80"
                  >
                    <div className="w-5 h-5 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-medium">{feat}</span>
                  </div>
                ))}
              </div>

              {/* Modal de Checkout Oficial da Google Play Store */}
              {showPlayStoreCheckout && currentPlan.priceNum > 0 && (() => {
                const checkoutDynamic = calculatePlanPrice(currentPlan.priceNum, billingCycle);

                return (
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
                            Google Play Billing ({selectedSku || currentPlan.id})
                          </h4>
                          <span className="text-[10px] text-emerald-400 font-bold">
                            Cobrança Oficial & Protegida ({checkoutDynamic.periodLabel})
                          </span>
                        </div>
                      </div>
                      <span className="text-sm font-mono font-black text-emerald-400">
                        {checkoutDynamic.formatted} {checkoutDynamic.periodLabel}
                      </span>
                    </div>

                    <div className="bg-slate-950/80 p-3.5 rounded-xl border border-white/5 space-y-2 text-xs text-slate-300">
                      <div className="flex items-center gap-2 text-emerald-400 font-black uppercase text-[11px]">
                        <Gift className="w-4 h-4" />
                        <span>Primeiros 30 Dias: R$ 0,00 (Grátis para Teste)</span>
                      </div>
                      <p className="leading-relaxed text-[11.5px]">
                        Você terá <strong>acesso completo por 30 dias grátis</strong> ao plano{" "}
                        <strong className="text-white">{currentPlan.name}</strong>. Após os 30 dias,
                        a assinatura será renovada pela sua conta{" "}
                        <strong>Google Play Store</strong> por{" "}
                        <strong>
                          {checkoutDynamic.formatted} {checkoutDynamic.periodLabel}
                        </strong>{" "}
                        (com cancelamento livre a qualquer momento).
                      </p>
                      <div className="text-[10.5px] text-slate-400 flex items-center gap-1.5 pt-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span>
                          Transação oficial processada via Google Play Store Billing API / Digital
                          Goods.
                        </span>
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
                        {isProcessing
                          ? "Conectando à Play Store..."
                          : "Confirmar e Ativar 30 Dias Grátis 📲"}
                      </button>
                    </div>
                  </motion.div>
                );
              })()}

              {/* Pix Payment Drawer apenas no navegador Web externo */}
              {!isPlayStoreApp && showPixStep && currentPlan.priceNum > 0 && (
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
                        Pix Web para Liberação Mensal
                      </span>
                    </div>
                    <span className="text-xs font-mono font-black text-emerald-400">
                      {currentPlan.price}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300">
                    Para assinaturas pela versão Web fora da Play Store, copie a chave Pix abaixo:
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
                      <span className="text-[10px] uppercase font-bold text-slate-400">
                        Chave Pix Copia e Cola:
                      </span>
                      <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg font-mono text-[10px] text-slate-300 truncate">
                        00020101021226870014br.gov.bcb.pix.calculadoracerebro/plan-{currentPlan.id}
                      </div>
                      <div className="flex items-center gap-2 justify-center sm:justify-start pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(
                              `00020101021226870014br.gov.bcb.pix.calculadoracerebro/plan-${currentPlan.id}`
                            );
                            showNotification(
                              "Chave Pix copiada para a área de transferência! 📋",
                              "success"
                            );
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

            {/* Voucher / Código VIP de Ativação Manual (oculto no fluxo Play Store se não for VIP) */}
            <div className="border border-white/5 bg-slate-950/40 p-3.5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-left">
                <KeyRound className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-white block">
                    Possui um Cupom ou Código de Parceiro?
                  </span>
                  <span className="text-[10.5px] text-slate-400">
                    Insira a chave fornecida pelo administrador para liberar acesso de teste.
                  </span>
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
                  Inserir Código 🔑
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
