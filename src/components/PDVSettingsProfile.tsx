import React, { useState } from "react";
import { 
  User, 
  Mail, 
  Lock, 
  ShieldCheck, 
  Users, 
  LogOut, 
  Check, 
  KeyRound,
  AlertCircle,
  Eye,
  EyeOff,
  Sliders,
  ShieldAlert
} from "lucide-react";
import { getAuth, updatePassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

interface PDVSettingsProfileProps {
  storeName: string;
  setStoreName: (val: string) => void;
  storeCnpjCpf: string;
  setStoreCnpjCpf: (val: string) => void;
  storeOwnerRg?: string;
  setStoreOwnerRg?: (val: string) => void;
  showNotification: (msg: string, type: "success" | "error" | "info") => void;
  logRiskAction: (action: string, description: string, details?: any) => Promise<void>;
  userId: string;
  isLoggedIn: boolean;
  db: any;
  refreshSecuritySettings?: () => void;
}

export const PDVSettingsProfile: React.FC<PDVSettingsProfileProps> = ({
  storeName,
  setStoreName,
  storeCnpjCpf,
  setStoreCnpjCpf,
  storeOwnerRg = "",
  setStoreOwnerRg,
  showNotification,
  logRiskAction,
  userId,
  isLoggedIn,
  db,
  refreshSecuritySettings
}) => {
  // Passwords Form with safety validation (CPF + RG)
  const [cpfPasswordInput, setCpfPasswordInput] = useState("");
  const [rgPasswordInput, setRgPasswordInput] = useState("");
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [confirmPasswordInput, setConfirmPasswordInput] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // PIN Form with safety validation (CPF + RG)
  const [cpfPinInput, setCpfPinInput] = useState("");
  const [rgPinInput, setRgPinInput] = useState("");
  const [newPinInput, setNewPinInput] = useState("");
  const [confirmPinInput, setConfirmPinInput] = useState("");
  const [isUpdatingPin, setIsUpdatingPin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);

  // Tools security lock form states
  const [lockCalcNotes, setLockCalcNotes] = useState<boolean>(() => {
    return localStorage.getItem("pdv_lock_calc_notes") === "true";
  });
  const [lockCalcNotesPin, setLockCalcNotesPin] = useState<string>(() => {
    return localStorage.getItem("pdv_lock_calc_notes_pin") || "";
  });
  const [lockReceiptsDiary, setLockReceiptsDiary] = useState<boolean>(() => {
    return localStorage.getItem("pdv_lock_receipts_diary") === "true";
  });
  const [lockReceiptsDiaryPin, setLockReceiptsDiaryPin] = useState<string>(() => {
    return localStorage.getItem("pdv_lock_receipts_diary_pin") || "";
  });
  const [showToolPin1, setShowToolPin1] = useState(false);
  const [showToolPin2, setShowToolPin2] = useState(false);

  // Active collaborators eye visibility
  const [revealedStaffPins, setRevealedStaffPins] = useState<Record<string, boolean>>({});

  const currentStaffName = localStorage.getItem("pdv_gestao_user_staff_name") || "";
  const currentStaffRole = localStorage.getItem("pdv_gestao_user_role") || "";
  const isOwnerMode = localStorage.getItem("pdv_owner_mode") === "true";

  const staffList = (() => {
    try {
      const saved = localStorage.getItem("pdv_staff_pins");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  })();

  const cleanCpf = (val: string) => val.replace(/\D/g, "");

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanStoredCpf = cleanCpf(storeCnpjCpf || "");
    const cleanStoredRg = cleanCpf(storeOwnerRg || "");

    if (!cleanStoredCpf) {
      showNotification("Por favor, preencha o CNPJ/CPF do proprietário na Identificação do Comércio! 📝", "error");
      return;
    }
    if (!cleanStoredRg) {
      showNotification("Por favor, cadastre seu RG do Proprietário antes de tentar alterar sua senha de segurança! 🛡️", "error");
      return;
    }

    if (cleanCpf(cpfPasswordInput) !== cleanStoredCpf) {
      showNotification("CPF informado inválido ou incorreto para esta alteração! ❌", "error");
      return;
    }
    if (cleanCpf(rgPasswordInput) !== cleanStoredRg) {
      showNotification("RG informado inválido ou incorreto para esta alteração! ❌", "error");
      return;
    }

    if (!newPasswordInput) {
      showNotification("Por favor, informe a nova senha! 🔒", "error");
      return;
    }
    if (newPasswordInput !== confirmPasswordInput) {
      showNotification("A nova senha e a confirmação de senha não coincidem! ❌", "error");
      return;
    }
    if (newPasswordInput.length < 6) {
      showNotification("A nova senha de acesso deve ter pelo menos 6 caracteres! 🔒", "error");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const auth = getAuth();
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPasswordInput);
        showNotification("Senha de acesso do Proprietário atualizada com sucesso na nuvem! 🔒✨", "success");
        await logRiskAction("Alteração de Senha", "Senha da conta do proprietário atualizada com sucesso usando dupla verificação de CPF + RG.");
      } else {
        localStorage.setItem("pdv_local_fallback_password", newPasswordInput);
        showNotification("Senha local do Proprietário atualizada com sucesso offline! 🔒✔️", "info");
        await logRiskAction("Alteração de Senha Local", "Senha local do proprietário atualizada de forma offline com CPF + RG.");
      }
      setCpfPasswordInput("");
      setRgPasswordInput("");
      setNewPasswordInput("");
      setConfirmPasswordInput("");
    } catch (err: any) {
      console.error("Erro ao alterar senha:", err);
      showNotification(`Falha ao alterar senha: ${err.message || err}`, "error");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanStoredCpf = cleanCpf(storeCnpjCpf || "");
    const cleanStoredRg = cleanCpf(storeOwnerRg || "");

    if (!cleanStoredCpf) {
      showNotification("Por favor, preencha o CNPJ/CPF do proprietário na Identificação do Comércio! 📝", "error");
      return;
    }
    if (!cleanStoredRg) {
      showNotification("Por favor, cadastre seu RG do Proprietário antes de tentar alterar o seu PIN mestre! 🛡️", "error");
      return;
    }

    if (cleanCpf(cpfPinInput) !== cleanStoredCpf) {
      showNotification("CPF informado inválido ou incorreto para esta alteração! ❌", "error");
      return;
    }
    if (cleanCpf(rgPinInput) !== cleanStoredRg) {
      showNotification("RG informado inválido ou incorreto para esta alteração! ❌", "error");
      return;
    }

    if (!newPinInput) {
      showNotification("Por favor, informe o novo PIN! 🔑", "error");
      return;
    }
    if (newPinInput !== confirmPinInput) {
      showNotification("O novo PIN e a confirmação de PIN não coincidem! ❌", "error");
      return;
    }
    if (!/^\d{4,6}$/.test(newPinInput)) {
      showNotification("O PIN de segurança deve possuir de 4 a 6 dígitos estritamente numéricos! ❌", "error");
      return;
    }

    setIsUpdatingPin(true);
    try {
      localStorage.setItem("pdv_owner_pin", newPinInput);
      
      const auth = getAuth();
      if (auth.currentUser && db && userId && userId !== "guest_visitor") {
        const systemConfigDoc = doc(db, `configuracoes_sistema/${auth.currentUser.uid}`);
        await setDoc(systemConfigDoc, {
          ownerPin: newPinInput,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        showNotification("PIN de Segurança do Proprietário atualizado na nuvem e salvo localmente! 🔑✨", "success");
      } else {
        showNotification("PIN de Segurança do Proprietário atualizado localmente com sucesso! 🔑", "success");
      }
      
      await logRiskAction("Alteração de PIN", "PIN principal de segurança do proprietário atualizado com dupla validação de CPF + RG.");
      
      setCpfPinInput("");
      setRgPinInput("");
      setNewPinInput("");
      setConfirmPinInput("");
    } catch (err: any) {
      console.error("Erro ao alterar PIN:", err);
      showNotification(`Falha ao alterar PIN: ${err.message || err}`, "error");
    } finally {
      setIsUpdatingPin(false);
    }
  };

  const handleSaveToolPins = (e: React.FormEvent) => {
    e.preventDefault();
    if (lockCalcNotes) {
      if (!/^\d{4,6}$/.test(lockCalcNotesPin)) {
        showNotification("O PIN da Calculadora/Notas deve ter de 4 a 6 dígitos numéricos! ❌", "error");
        return;
      }
    }
    if (lockReceiptsDiary) {
      if (!/^\d{4,6}$/.test(lockReceiptsDiaryPin)) {
        showNotification("O PIN do Diário/Recibos deve ter de 4 a 6 dígitos numéricos! ❌", "error");
        return;
      }
    }

    localStorage.setItem("pdv_lock_calc_notes", lockCalcNotes ? "true" : "false");
    localStorage.setItem("pdv_lock_calc_notes_pin", lockCalcNotesPin);
    localStorage.setItem("pdv_lock_receipts_diary", lockReceiptsDiary ? "true" : "false");
    localStorage.setItem("pdv_lock_receipts_diary_pin", lockReceiptsDiaryPin);

    showNotification("Opções de PIN e bloqueio das ferramentas salvas com sucesso! 🛡️✨", "success");
    logRiskAction("Alteração de Opções de PIN das Ferramentas", "Alterou as chaves de segurança e PIN do diário ou calculadoras.");
    
    if (refreshSecuritySettings) {
      refreshSecuritySettings();
    }
  };

  const handleSwitchOperator = () => {
    localStorage.removeItem("pdv_gestao_user_role");
    localStorage.removeItem("pdv_gestao_user_staff_name");
    localStorage.setItem("pdv_owner_mode", "false");
    showNotification("Sessão finalizada! Por favor, utilize o painel de PIN para logar novamente. 👤🔓", "info");
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const toggleStaffPinVisibility = (staffId: string) => {
    setRevealedStaffPins(prev => ({
      ...prev,
      [staffId]: !prev[staffId]
    }));
  };

  const currentUserEmail = getAuth().currentUser?.email || "modo_visitante_local@cerebro.com";

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* 1. Dados do Usuário */}
      <div className="bg-slate-950 p-4 rounded-xl border border-white/5 space-y-4">
        <div className="flex items-center gap-2 border-b border-white/5 pb-2">
          <User className="w-4 h-4 text-purple-400" />
          <span className="text-[11.5px] font-black uppercase text-slate-300 font-sans">👤 Identificação do Proprietário & Negócio</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-1.5 text-left">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block font-sans">
              Nome do Comércio:
            </label>
            <input
              type="text"
              value={storeName}
              onChange={(e) => {
                setStoreName(e.target.value);
                localStorage.setItem("pdv_store_name", e.target.value);
              }}
              placeholder="Ex: Mercadinho Cérebro Inteligente"
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none font-bold"
            />
          </div>

          <div className="space-y-1.5 text-left">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block font-sans">
              CNPJ ou CPF do Proprietário:
            </label>
            <input
              type="text"
              value={storeCnpjCpf}
              onChange={(e) => {
                setStoreCnpjCpf(e.target.value);
                localStorage.setItem("pdv_store_cnpj_cpf", e.target.value);
              }}
              placeholder="Ex: 123.456.789-00"
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none font-bold font-mono"
            />
          </div>

          <div className="space-y-1.5 text-left">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block font-sans text-purple-300">
              RG do Proprietário (Segurança):
            </label>
            <input
              type="text"
              value={storeOwnerRg}
              onChange={(e) => {
                if (setStoreOwnerRg) {
                  setStoreOwnerRg(e.target.value);
                }
                localStorage.setItem("pdv_store_owner_rg", e.target.value);
              }}
              placeholder="Ex: 12.345.678-9"
              className="w-full bg-slate-900 border-2 border-purple-500/20 focus:border-purple-500 rounded-xl px-3 py-2 text-xs text-white outline-none font-bold font-mono"
            />
          </div>

          <div className="space-y-1.5 text-left">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block font-sans">
              E-mail Registrado (Login):
            </label>
            <div className="relative flex items-center">
              <input
                type="text"
                value={currentUserEmail}
                readOnly
                className="w-full bg-slate-900/40 border border-white/5 rounded-xl px-3 py-2 text-xs text-slate-400 outline-none font-bold pr-10 cursor-not-allowed"
              />
              <Mail className="absolute right-3 w-4 h-4 text-slate-500" />
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center bg-slate-900/40 p-3 rounded-lg border border-white/[0.03]">
          <p className="text-[9.5px] text-slate-400 font-medium leading-relaxed font-sans max-w-lg">
            Estes dados são síncronos e atualizados instantaneamente em todos os cupons fiscais e recibos de vendas, além de servirem de chave de autorização para as ações de alteração de senha e PIN de segurança!
          </p>
          <button
            type="button"
            onClick={() => {
              showNotification("Informações do comércio gravadas com sucesso! 🛡️✨", "success");
            }}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-black text-[9.5px] rounded-lg uppercase tracking-wider transition-all cursor-pointer"
          >
            Sincronizar Dados
          </button>
        </div>
      </div>

      {/* 2. Alterações de Acesso do Proprietário (CPF + RG Protegidos) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Alterar Senha de Acesso */}
        <form onSubmit={handleUpdatePassword} className="bg-slate-950 p-4 rounded-xl border border-white/5 space-y-4 text-left">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2">
            <Lock className="w-4 h-4 text-purple-400" />
            <span className="text-[11.5px] font-black uppercase text-slate-350 font-sans">🔐 Alterar Senha de Login (Dono)</span>
          </div>

          <div className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                  Confirmar seu CPF:
                </label>
                <input
                  type="text"
                  value={cpfPasswordInput}
                  onChange={(e) => setCpfPasswordInput(e.target.value)}
                  placeholder="Seu CPF cadastrado"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none font-bold font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block text-purple-300">
                  Confirmar seu RG:
                </label>
                <input
                  type="text"
                  value={rgPasswordInput}
                  onChange={(e) => setRgPasswordInput(e.target.value)}
                  placeholder="Seu RG cadastrado"
                  className="w-full bg-slate-900 border border-purple-500/20 rounded-xl px-3 py-2 text-xs text-white outline-none font-bold font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 relative">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                  Nova Senha:
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    placeholder="Mínimo 6 dígitos"
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none font-bold pr-8"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-500 hover:text-white cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                  Confirmar Senha:
                </label>
                <input
                  type="password"
                  value={confirmPasswordInput}
                  onChange={(e) => setConfirmPasswordInput(e.target.value)}
                  placeholder="Repita a nova senha"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none font-bold"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isUpdatingPassword}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-550 disabled:opacity-50 text-white font-black text-[9.5px] rounded-xl uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-purple-500/10"
            >
              {isUpdatingPassword ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Autenticando e Atualizando...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Alterar Senha do Usuário</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Alterar PIN do Proprietário */}
        <form onSubmit={handleUpdatePin} className="bg-slate-950 p-4 rounded-xl border border-white/5 space-y-4 text-left">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2">
            <ShieldCheck className="w-4 h-4 text-purple-400" />
            <span className="text-[11.5px] font-black uppercase text-slate-350 font-sans">🔑 Alterar PIN do Proprietário</span>
          </div>

          <div className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                  Confirmar seu CPF:
                </label>
                <input
                  type="text"
                  value={cpfPinInput}
                  onChange={(e) => setCpfPinInput(e.target.value)}
                  placeholder="Seu CPF cadastrado"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none font-bold font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block text-purple-300">
                  Confirmar seu RG:
                </label>
                <input
                  type="text"
                  value={rgPinInput}
                  onChange={(e) => setRgPinInput(e.target.value)}
                  placeholder="Seu RG cadastrado"
                  className="w-full bg-slate-900 border border-purple-500/20 rounded-xl px-3 py-2 text-xs text-white outline-none font-bold font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 relative">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                  Novo PIN Numérico:
                </label>
                <div className="relative">
                  <input
                    type={showNewPin ? "text" : "password"}
                    value={newPinInput}
                    onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="4 a 6 dígitos"
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none font-bold font-mono text-center pr-8"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPin(!showNewPin)}
                    className="absolute right-2.5 top-2.5 text-slate-500 hover:text-white cursor-pointer"
                  >
                    {showNewPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                  Confirmar PIN:
                </label>
                <input
                  type="password"
                  value={confirmPinInput}
                  onChange={(e) => setConfirmPinInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="Repita o novo PIN"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none font-bold font-mono text-center"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isUpdatingPin}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-550 disabled:opacity-50 text-white font-black text-[9.5px] rounded-xl uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-purple-500/10"
            >
              {isUpdatingPin ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Autenticando e Atualizando...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Alterar PIN do Proprietário</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>

      {/* 3. Bloqueio Opcional de Ferramentas Auxiliares & Diários (Novo Requisito!) */}
      <form onSubmit={handleSaveToolPins} className="bg-slate-950 p-4 rounded-xl border border-white/5 space-y-4 text-left">
        <div className="flex items-center gap-2 border-b border-white/5 pb-2">
          <Sliders className="w-4 h-4 text-purple-400" />
          <span className="text-[11.5px] font-black uppercase text-slate-300 font-sans">🛡️ Segurança do Bloquinho de Papelaria (Opções de PIN)</span>
        </div>

        <p className="text-[10px] text-slate-400 font-medium leading-relaxed font-sans pb-1">
          Ative opcionalmente um bloqueio por PIN independente nas ferramentas auxiliares da barra superior para esconder o conteúdo e proteger informações sensíveis de funcionários e visitantes do caixa.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Lock Calculators, Notes & Excel */}
          <div className={`p-4 rounded-xl border transition-all ${lockCalcNotes ? "bg-amber-500/5 border-amber-500/25" : "bg-slate-900/40 border-white/5"}`}>
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={lockCalcNotes}
                onChange={(e) => setLockCalcNotes(e.target.checked)}
                className="mt-1 rounded border-white/20 text-purple-600 focus:ring-purple-500 bg-slate-950 w-4 h-4 cursor-pointer"
              />
              <div>
                <span className="text-xs font-black text-white uppercase tracking-wide block">Calculadoras, Notas & Excel 📊</span>
                <span className="text-[9.5px] text-slate-400 font-medium block leading-normal mt-0.5">
                  Exige PIN para abrir a calculadora inteligente, tabela excel, calculadora de precificação e anotações rápidas.
                </span>
              </div>
            </label>

            {lockCalcNotes && (
              <div className="mt-4 pt-3 border-t border-white/5 space-y-2 animate-fadeIn">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                  Definir PIN de Acesso (4 a 6 dígitos):
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showToolPin1 ? "text" : "password"}
                    value={lockCalcNotesPin}
                    onChange={(e) => setLockCalcNotesPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="PIN numérico"
                    className="w-full bg-slate-900 border border-white/10 focus:border-amber-500 rounded-xl px-3 py-1.5 text-xs text-white outline-none font-bold font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToolPin1(!showToolPin1)}
                    className="absolute right-3 text-slate-500 hover:text-white cursor-pointer"
                  >
                    {showToolPin1 ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Lock Receipts, Payments & Diary */}
          <div className={`p-4 rounded-xl border transition-all ${lockReceiptsDiary ? "bg-amber-500/5 border-amber-500/25" : "bg-slate-900/40 border-white/5"}`}>
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={lockReceiptsDiary}
                onChange={(e) => setLockReceiptsDiary(e.target.checked)}
                className="mt-1 rounded border-white/20 text-purple-600 focus:ring-purple-500 bg-slate-950 w-4 h-4 cursor-pointer"
              />
              <div>
                <span className="text-xs font-black text-white uppercase tracking-wide block">Recibos, Pagamentos & Diário 📂</span>
                <span className="text-[9.5px] text-slate-400 font-medium block leading-normal mt-0.5">
                  Esconde o conteúdo do diário e exige o PIN cadastrado para acessar o gerenciador de recibos e folhas de pagamentos.
                </span>
              </div>
            </label>

            {lockReceiptsDiary && (
              <div className="mt-4 pt-3 border-t border-white/5 space-y-2 animate-fadeIn">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                  Definir PIN de Acesso (4 a 6 dígitos):
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showToolPin2 ? "text" : "password"}
                    value={lockReceiptsDiaryPin}
                    onChange={(e) => setLockReceiptsDiaryPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="PIN numérico"
                    className="w-full bg-slate-900 border border-white/10 focus:border-amber-500 rounded-xl px-3 py-1.5 text-xs text-white outline-none font-bold font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToolPin2(!showToolPin2)}
                    className="absolute right-3 text-slate-500 hover:text-white cursor-pointer"
                  >
                    {showToolPin2 ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-black text-[9.5px] rounded-lg uppercase tracking-wider transition-all cursor-pointer"
          >
            Salvar Configurações de Bloqueio 💾
          </button>
        </div>
      </form>

      {/* 4. Cargos do PDV e PINs dos Colaboradores (Com Olhinho para o Proprietário ver os PINs!) */}
      <div className="bg-slate-950 p-4 rounded-xl border border-white/5 space-y-4 text-left">
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-400" />
            <span className="text-[11.5px] font-black uppercase text-slate-300 font-sans">👥 Equipe Cadastrada & Controle de PINs (Proprietário)</span>
          </div>
          <span className="text-[9px] bg-purple-500/15 text-purple-400 px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider flex items-center gap-1 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            Painel do Proprietário
          </span>
        </div>

        <p className="text-[10px] text-slate-400 font-medium font-sans">
          Veja abaixo a equipe e cargos registrados no sistema PDV. Como proprietário, você pode visualizar os PINs individuais de cada um para auditar ou ajudar seu funcionário a recuperar o acesso.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Active current user Card */}
          <div className="bg-purple-900/10 border border-purple-500/30 p-3.5 rounded-xl space-y-2 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-xl"></div>
            <div className="flex items-center justify-between">
              <span className="text-[8px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-black uppercase tracking-widest">
                Seu Operador Atual
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            </div>
            <div>
              <p className="text-xs font-black text-white">{currentStaffName || "Proprietário"}</p>
              <p className="text-[9px] text-purple-300 uppercase tracking-wider font-extrabold font-sans">
                {currentStaffRole === "proprietario" || isOwnerMode ? "👑 Proprietário (Dono)" : `👤 ${currentStaffRole}`}
              </p>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <span className="text-[9px] text-emerald-400 font-bold">Logado no Aparelho</span>
              <button
                type="button"
                onClick={handleSwitchOperator}
                className="text-[9px] text-rose-400 hover:text-rose-300 font-black uppercase tracking-wider flex items-center gap-1 bg-rose-500/10 hover:bg-rose-500/20 px-2 py-1 rounded transition-all cursor-pointer"
              >
                <LogOut className="w-2.5 h-2.5" />
                Deslogar
              </button>
            </div>
          </div>

          {/* Render other registered staff configured PINs */}
          {staffList.map((staff: any) => {
            const isMe = currentStaffName === staff.name && currentStaffRole === staff.role;
            const isPinVisible = !!revealedStaffPins[staff.id || staff.pin];
            return (
              <div 
                key={staff.id || staff.pin} 
                className={`p-3.5 rounded-xl space-y-2 border relative overflow-hidden ${
                  isMe 
                    ? "bg-purple-900/10 border-purple-500/30" 
                    : "bg-slate-900/40 border-white/5 hover:border-purple-500/25 transition-colors"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[8.5px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest ${
                    staff.role === "gerente" 
                      ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" 
                      : staff.role === "caixa"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  }`}>
                    {staff.role === "gerente" ? "👤 Gerente" : staff.role === "caixa" ? "👤 Caixa" : `👤 ${staff.role?.toUpperCase() || "Operador"}`}
                  </span>
                  {isMe ? (
                    <span className="text-[8px] bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full font-black uppercase border border-emerald-500/10">
                      Ativo
                    </span>
                  ) : (
                    <span className="text-[8px] bg-slate-900 text-slate-500 px-2 py-0.5 rounded-full font-bold uppercase border border-white/5">
                      Offline
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-xs font-black text-white">{staff.name}</p>
                  
                  {/* Ícone de olhinho integrado com revelação segura de PIN */}
                  <div className="flex items-center gap-1.5 mt-1 text-[10px] font-mono text-slate-400 font-semibold">
                    <span>PIN:</span>
                    <span className="font-black text-purple-300 tracking-wider">
                      {isPinVisible ? staff.pin : "••••"}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleStaffPinVisibility(staff.id || staff.pin)}
                      className="p-0.5 text-slate-500 hover:text-white transition-colors cursor-pointer"
                      title={isPinVisible ? "Ocultar PIN" : "Visualizar PIN de Equipe"}
                    >
                      {isPinVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="pt-2 border-t border-white/5 flex justify-between items-center text-[9px] text-slate-500">
                  <span>Terminal Local</span>
                  <span>{isMe ? "🟢 Em Uso" : "💤 Conectado"}</span>
                </div>
              </div>
            );
          })}

          {/* Default Owner Slot if not rendered */}
          {(!isOwnerMode && currentStaffRole !== "proprietario") && (
            <div className="bg-slate-900/40 border border-white/5 p-3.5 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[8px] bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full font-black uppercase tracking-widest">
                  👑 Proprietário
                </span>
                <span className="text-[8px] bg-slate-900 text-slate-500 px-2 py-0.5 rounded-full font-bold uppercase">
                  Offline
                </span>
              </div>
              <div>
                <p className="text-xs font-black text-white">Proprietário Principal</p>
                <p className="text-[9px] text-slate-400 font-medium">PIN mestre configurado</p>
              </div>
              <div className="pt-2 border-t border-white/5 flex justify-between items-center text-[9px] text-slate-500">
                <span>Painel Principal</span>
                <span>💤 Aguardando PIN</span>
              </div>
            </div>
          )}
        </div>

        <div className="bg-slate-900/30 border border-white/[0.03] p-3 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-[10px] text-slate-400 leading-normal font-sans">
            <strong>Dica de Auditoria de Equipe:</strong> Os PINs de gerentes, caixas e funcionários são configurados para que você possa controlar os acessos sem precisar expor a senha master do seu e-mail. Utilize os botões de visualização acima para gerenciar os PINs esquecidos pelos funcionários.
          </p>
        </div>
      </div>

    </div>
  );
};
