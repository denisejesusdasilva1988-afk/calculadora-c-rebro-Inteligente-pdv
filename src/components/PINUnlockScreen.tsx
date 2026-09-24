import React, { useState } from "react";
import { 
  Lock, 
  Unlock, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  ShieldAlert, 
  CheckCircle2, 
  RefreshCw,
  FileText,
  UserCheck
} from "lucide-react";

interface PINUnlockScreenProps {
  title: string;
  type: "calc_notes" | "receipts_diary";
  pinToValidate: string;
  onUnlock: () => void;
  storeCnpjCpf: string;
  storeOwnerRg: string;
  showNotification: (msg: string, type: "success" | "error" | "info") => void;
  onResetPinSuccess: (newPin: string) => void;
}

export const PINUnlockScreen: React.FC<PINUnlockScreenProps> = ({
  title,
  type,
  pinToValidate,
  onUnlock,
  storeCnpjCpf,
  storeOwnerRg,
  showNotification,
  onResetPinSuccess
}) => {
  const [pinInput, setPinInput] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [isForgotPasswordMode, setIsForgotPasswordMode] = useState(false);
  
  // Forgot Password Validation Fields
  const [cpfValidation, setCpfValidation] = useState("");
  const [rgValidation, setRgValidation] = useState("");
  const [newPinFromReset, setNewPinFromReset] = useState("");
  const [confirmNewPinFromReset, setConfirmNewPinFromReset] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  const cleanCpf = (val: string) => val.replace(/\D/g, "");

  const handleUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput) {
      showNotification("Por favor, digite o PIN de acesso! 🔑", "error");
      return;
    }
    if (pinInput === pinToValidate) {
      showNotification("Acesso liberado com sucesso! 🔓✨", "success");
      onUnlock();
    } else {
      showNotification("PIN incorreto! Verifique e tente novamente. ❌", "error");
      setPinInput("");
    }
  };

  const handleResetPinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanStoredCpf = cleanCpf(storeCnpjCpf || "");
    const cleanStoredRg = cleanCpf(storeOwnerRg || "");

    if (!cleanStoredCpf || !cleanStoredRg) {
      showNotification("Não há CPF ou RG cadastrados nos seus dados do proprietário! Vá nas configurações de perfil do PDV para cadastrar seu CPF/RG primeiro. 🛡️", "error");
      return;
    }

    if (cleanCpf(cpfValidation) !== cleanStoredCpf) {
      showNotification("O CPF digitado não confere com o CPF do Proprietário! ❌", "error");
      return;
    }

    if (cleanCpf(rgValidation) !== cleanStoredRg) {
      showNotification("O RG digitado não confere com o RG do Proprietário! ❌", "error");
      return;
    }

    if (!newPinFromReset) {
      showNotification("Por favor, informe o novo PIN de redefinição! 🔑", "error");
      return;
    }

    if (newPinFromReset !== confirmNewPinFromReset) {
      showNotification("Os PINs de redefinição digitados não coincidem! ❌", "error");
      return;
    }

    if (!/^\d{4,6}$/.test(newPinFromReset)) {
      showNotification("O novo PIN deve ter de 4 a 6 dígitos estritamente numéricos! ❌", "error");
      return;
    }

    setIsResetting(true);
    setTimeout(() => {
      onResetPinSuccess(newPinFromReset);
      showNotification("PIN redefinido e reconfigurado com sucesso pelo CPF/RG do Proprietário! 🎉🛡️", "success");
      setIsResetting(false);
      setIsForgotPasswordMode(false);
      setPinInput("");
      setCpfValidation("");
      setRgValidation("");
      setNewPinFromReset("");
      setConfirmNewPinFromReset("");
      onUnlock(); // Auto-unlocks the view
    }, 800);
  };

  return (
    <div className="w-full max-w-md mx-auto my-12 p-8 bg-slate-950 border-2 border-white/10 rounded-[2.5rem] shadow-2xl text-center space-y-6 animate-fadeIn">
      
      {!isForgotPasswordMode ? (
        <form onSubmit={handleUnlockSubmit} className="space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center text-amber-400 animate-pulse">
            <Lock className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-black uppercase text-white tracking-wider">
              Área Protegida 🛡️
            </h3>
            <p className="text-xs text-slate-300 font-medium font-sans">
              O conteúdo do módulo de <strong className="text-amber-400">{title}</strong> está atualmente oculto. Insira o PIN de segurança cadastrado para acessar.
            </p>
          </div>

          <div className="space-y-4 text-left">
            <div className="space-y-1.5 relative">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                PIN de Segurança da Ferramenta:
              </label>
              <div className="relative flex items-center">
                <input
                  type={showPin ? "text" : "password"}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="Digite o PIN numérico"
                  className="w-full bg-slate-900 border border-white/10 focus:border-amber-400 rounded-xl px-4 py-3 text-sm text-center text-white outline-none font-bold font-mono tracking-[0.4em] pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 text-slate-500 hover:text-white transition-colors cursor-pointer"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black text-xs uppercase tracking-widest rounded-xl transition-all cursor-pointer shadow-lg shadow-amber-500/15 hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
            >
              <Unlock className="w-4 h-4" />
              <span>Desbloquear Conteúdo</span>
            </button>
          </div>

          <div className="pt-2 border-t border-white/5">
            <button
              type="button"
              onClick={() => setIsForgotPasswordMode(true)}
              className="text-[10px] text-slate-400 hover:text-amber-400 transition-colors font-bold uppercase tracking-wider cursor-pointer"
            >
              Esqueceu o PIN? Redefinir com CPF/RG 🔑
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleResetPinSubmit} className="space-y-5 text-left">
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-black uppercase text-purple-450 tracking-wider text-purple-400">
              Recuperação do Proprietário
            </h3>
            <p className="text-[10px] text-slate-400 font-medium font-sans px-4">
              Informe seu CPF e RG cadastrados nos dados do comércio para validar sua identidade e redefinir o PIN de bloqueio imediatamente.
            </p>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                Confirmar CPF do Proprietário:
              </label>
              <input
                type="text"
                value={cpfValidation}
                onChange={(e) => setCpfValidation(e.target.value)}
                placeholder="Apenas números ou formato do CPF"
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none font-bold font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                Confirmar RG do Proprietário:
              </label>
              <input
                type="text"
                value={rgValidation}
                onChange={(e) => setRgValidation(e.target.value)}
                placeholder="Informe seu RG cadastrado"
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none font-bold font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-white/5">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                  Novo PIN:
                </label>
                <input
                  type="password"
                  value={newPinFromReset}
                  onChange={(e) => setNewPinFromReset(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="4 a 6 dígitos"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-center text-white outline-none font-bold font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                  Confirmar PIN:
                </label>
                <input
                  type="password"
                  value={confirmNewPinFromReset}
                  onChange={(e) => setConfirmNewPinFromReset(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="Repita o novo PIN"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-center text-white outline-none font-bold font-mono"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsForgotPasswordMode(false)}
                className="flex-1 py-2 bg-slate-850 hover:bg-slate-800 text-slate-300 font-black text-[10px] uppercase tracking-wider rounded-xl cursor-pointer text-center"
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={isResetting}
                className="flex-1 py-2 bg-purple-600 hover:bg-purple-550 disabled:opacity-50 text-white font-black text-[10px] uppercase tracking-wider rounded-xl cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isResetting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <UserCheck className="w-3.5 h-3.5" />
                )}
                <span>{isResetting ? "Redefinindo..." : "Redefinir PIN"}</span>
              </button>
            </div>
          </div>
        </form>
      )}

    </div>
  );
};

PINUnlockScreen.displayName = "PINUnlockScreen";
