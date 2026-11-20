import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Bell,
  BellRing,
  ShoppingCart,
  Store,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import {
  PushPermissionState,
  getPushPermissionState,
  requestAndSubscribeToPush,
} from "../utils/pushNotifications";

interface PushNotificationGateModalProps {
  isOpen: boolean;
  permissionState: PushPermissionState;
  onPermissionUpdated: (next: PushPermissionState) => void;
  onDismissTemporarily: () => void;
  showNotification: (msg: string, type?: "success" | "error" | "info") => void;
}

export const PushNotificationGateModal: React.FC<PushNotificationGateModalProps> = ({
  isOpen,
  permissionState,
  onPermissionUpdated,
  onDismissTemporarily,
  showNotification,
}) => {
  const [isRequesting, setIsRequesting] = useState(false);

  if (!isOpen) return null;

  const isDenied = permissionState === "denied";
  const isUnsupported = permissionState === "unsupported";

  const handleEnablePush = async () => {
    setIsRequesting(true);
    try {
      const result = await requestAndSubscribeToPush();
      onPermissionUpdated(result.permission);
      if (result.permission === "granted") {
        showNotification(
          "🔔 Notificações Push ativadas! Você receberá anúncios e ofertas de supermercados e mercadinhos em tempo real.",
          "success"
        );
      } else if (result.permission === "denied") {
        showNotification(
          "⚠️ Permissão bloqueada no navegador. Veja o passo a passo na tela para liberar nas configurações.",
          "error"
        );
      } else {
        showNotification("Toque em 'Permitir' no aviso do navegador para liberar as ofertas!", "info");
      }
    } finally {
      setIsRequesting(false);
    }
  };

  const handleRecheck = () => {
    const current = getPushPermissionState();
    onPermissionUpdated(current);
    if (current === "granted") {
      requestAndSubscribeToPush().catch(() => {});
      showNotification("🔔 Notificações Push confirmadas e ativas!", "success");
    } else {
      showNotification("As notificações ainda estão bloqueadas nas configurações deste aparelho.", "info");
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10050] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          className="relative w-full max-w-md bg-slate-900 border-2 border-emerald-500/40 rounded-[2rem] p-6 sm:p-7 shadow-2xl text-white space-y-5 my-auto text-left"
        >
          {/* Top badge */}
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-black uppercase tracking-wider">
              <BellRing className="w-3.5 h-3.5 animate-pulse" />
              Aviso Obrigatório do App
            </span>
            <span className="text-[10px] font-black uppercase text-amber-300 bg-amber-500/10 border border-amber-500/25 px-2.5 py-0.5 rounded-full">
              Supermercados & Ofertas
            </span>
          </div>

          {/* Icon + Headline */}
          <div className="flex items-start gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-slate-950 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/25">
              <Bell className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black leading-tight text-white">
                Ative as Notificações Push do Calculadora Cérebro PDV
              </h2>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Para aproveitar ao máximo o aplicativo, ative as notificações para receber em primeira mão:
              </p>
            </div>
          </div>

          {/* Highlights */}
          <div className="bg-slate-950/80 border border-white/10 rounded-2xl p-4 space-y-2.5 text-xs">
            <div className="flex items-start gap-2.5">
              <ShoppingCart className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-slate-200 leading-snug">
                <strong className="text-emerald-300">Anúncios de Supermercados & Mercadinhos:</strong> promoções relâmpago, ofertas da semana e encartes do bairro direto no celular.
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <Store className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-slate-200 leading-snug">
                <strong className="text-amber-300">Alertas do Seu Negócio & Agenda:</strong> lembretes de horários, metas e avisos importantes do sistema.
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <p className="text-slate-200 leading-snug">
                <strong className="text-sky-300">100% Gratuito:</strong> sem spam, apenas ofertas úteis e comunicados oficiais.
              </p>
            </div>
          </div>

          {isDenied ? (
            <div className="bg-amber-950/40 border border-amber-500/30 rounded-2xl p-4 space-y-2.5 text-xs">
              <div className="flex items-center gap-2 text-amber-300 font-black uppercase text-[11px]">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Notificações Bloqueadas neste Aparelho</span>
              </div>
              <p className="text-slate-300 leading-relaxed text-[11.5px]">
                Você bloqueou as notificações anteriormente. Para liberar:
              </p>
              <ol className="list-decimal pl-4 space-y-1 text-[11px] text-slate-300">
                <li>Toque no ícone de <strong>Cadeado / Ajustes</strong> na barra do navegador ou em <strong>Configurações do Android &gt; Apps &gt; Calculadora Cérebro PDV</strong>.</li>
                <li>Entre em <strong>Notificações / Permissões</strong> e selecione <strong>Permitir</strong>.</li>
                <li>Depois volte aqui e toque em <strong>Já Liberei, Verificar Agora</strong>.</li>
              </ol>
            </div>
          ) : isUnsupported ? (
            <div className="bg-slate-950/70 border border-white/10 rounded-2xl p-3.5 text-[11px] text-slate-300">
              Este navegador ou modo de visualização não suporta Notificações Push nativas. Instale o app pela Google Play Store ou use o Chrome atualizado para receber anúncios de supermercados.
            </div>
          ) : null}

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-1">
            {!isDenied && !isUnsupported && (
              <button
                type="button"
                disabled={isRequesting}
                onClick={handleEnablePush}
                className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-[0.98] text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wider shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-60"
              >
                <BellRing className="w-4 h-4" />
                <span>{isRequesting ? "Solicitando Permissão..." : "Permitir Notificações Push Agora 🔔"}</span>
              </button>
            )}

            {isDenied && (
              <button
                type="button"
                onClick={handleRecheck}
                className="w-full py-3.5 px-5 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Já Liberei, Verificar Agora 🔄</span>
              </button>
            )}

            {(isDenied || isUnsupported) && (
              <button
                type="button"
                onClick={onDismissTemporarily}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[11px] uppercase tracking-wider cursor-pointer transition-all"
              >
                Continuar no App (Avisos Limitados)
              </button>
            )}
          </div>

          <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Obrigatório para receber promoções de supermercados e mercadinhos</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
