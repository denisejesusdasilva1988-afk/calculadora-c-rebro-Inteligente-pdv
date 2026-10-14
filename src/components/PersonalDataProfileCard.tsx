/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Componente Dedicado de Visualização e Cadastro de Dados Pessoais, CPF do Titular
 * e Gerenciamento Seguro de Senha de Acesso (Calculadora Cérebro PDV)
 */

import React, { useState, useEffect } from "react";
import {
  User,
  ShieldCheck,
  FileText,
  Phone,
  Building2,
  Save,
  Key,
  Mail,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  Sparkles,
  QrCode,
  ExternalLink,
  Loader2,
  Lock,
  Camera,
  Trash2,
  Image as ImageIcon
} from "lucide-react";
import {
  CompanyProfile,
  loadCompanyProfile,
  saveCompanyProfile
} from "../utils/companyProfile";
import {
  getAuth,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  sendPasswordResetEmail
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../App";

interface PersonalDataProfileCardProps {
  user: any;
  storeCnpjCpf: string;
  setStoreCnpjCpf: (val: string) => void;
  storeName: string;
  setStoreName: (val: string) => void;
  showNotification: (msg: string, type?: "success" | "error" | "info") => void;
}

export const PersonalDataProfileCard: React.FC<PersonalDataProfileCardProps> = ({
  user,
  storeCnpjCpf,
  setStoreCnpjCpf,
  storeName,
  setStoreName,
  showNotification
}) => {
  const [profile, setProfile] = useState<CompanyProfile>(() => loadCompanyProfile(user?.uid));
  const [ownerNameInput, setOwnerNameInput] = useState(profile.ownerName || "");
  const [cpfInput, setCpfInput] = useState(profile.ownerCpf || storeCnpjCpf || "");
  const [phoneInput, setPhoneInput] = useState(profile.phone || profile.whatsapp || "21966713263");
  const [pixKeyInput, setPixKeyInput] = useState(profile.pixKey || "21966713263");
  const [companyNameInput, setCompanyNameInput] = useState(profile.name || storeName || "");
  const [logoInput, setLogoInput] = useState(profile.logoUrl || "");
  const [isSavingData, setIsSavingData] = useState(false);

  // Senha States
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSendingResetEmail, setIsSendingResetEmail] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [activePasswordMethod, setActivePasswordMethod] = useState<"direct" | "email">("direct");

  const emailLower = (user?.email || "").toLowerCase().trim();
  const isDenise =
    emailLower.includes("denisejesusdasilva1988") ||
    emailLower.includes("denisejesus1988") ||
    emailLower.includes("calculadoracerebro");

  useEffect(() => {
    const loaded = loadCompanyProfile(user?.uid);
    setProfile(loaded);
    if (!ownerNameInput && loaded.ownerName) setOwnerNameInput(loaded.ownerName);
    if (!cpfInput && (loaded.ownerCpf || storeCnpjCpf)) setCpfInput(loaded.ownerCpf || storeCnpjCpf);
    if (!phoneInput && (loaded.phone || loaded.whatsapp)) setPhoneInput(loaded.phone || loaded.whatsapp);
    if (!pixKeyInput && loaded.pixKey) setPixKeyInput(loaded.pixKey);
    if (!companyNameInput && (loaded.name || storeName)) setCompanyNameInput(loaded.name || storeName);
    if (!logoInput && loaded.logoUrl) setLogoInput(loaded.logoUrl);
  }, [user?.uid, storeCnpjCpf, storeName]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showNotification("A imagem deve ter no máximo 5MB.", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setLogoInput(reader.result);
        showNotification("Foto da logo carregada com sucesso! 🖼️ Clique em 'Salvar Dados' para confirmar.", "success");
      }
    };
    reader.onerror = () => {
      showNotification("Erro ao carregar a imagem.", "error");
    };
    reader.readAsDataURL(file);
  };

  // Formatação de CPF
  const formatCPF = (val: string) => {
    const clean = val.replace(/\D/g, "").slice(0, 14); // Permite CPF (11) ou CNPJ (14)
    if (clean.length <= 11) {
      return clean
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    }
    return clean
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpfInput(formatCPF(e.target.value));
  };

  const formatPhone = (val: string) => {
    const clean = val.replace(/\D/g, "").slice(0, 11);
    if (clean.length <= 10) {
      return clean.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
    }
    return clean.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhoneInput(formatPhone(e.target.value));
  };

  // Preencher dados oficiais da Denise automaticamente
  const handleAutoFillDenise = () => {
    setOwnerNameInput("Denise Jesus da Silva");
    setPhoneInput("(21) 96671-3263");
    setPixKeyInput("21966713263");
    if (!companyNameInput) setCompanyNameInput("Calculadora Cérebro PDV");
    showNotification("Dados da Denise carregados nos campos! Preencha seu CPF e clique em Salvar. ✍️✨", "info");
  };

  // Salvar dados pessoais
  const handleSavePersonalData = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCpfDigits = cpfInput.replace(/\D/g, "");

    if (cleanCpfDigits.length > 0 && cleanCpfDigits.length < 11) {
      showNotification("Por favor, digite um CPF válido com 11 dígitos ou deixe em branco! ❌", "error");
      return;
    }

    setIsSavingData(true);
    try {
      const updatedProfile: CompanyProfile = {
        ...profile,
        ownerName: ownerNameInput.trim(),
        ownerCpf: cpfInput.trim(),
        cnpjCpf: cpfInput.trim() || profile.cnpjCpf,
        phone: phoneInput.trim(),
        whatsapp: phoneInput.trim(),
        pixKey: pixKeyInput.trim() || "21966713263",
        name: companyNameInput.trim() || profile.name || "Calculadora Cérebro PDV",
        logoUrl: logoInput.trim()
      };

      // Salva no localStorage e utilitário
      saveCompanyProfile(updatedProfile, user?.uid);
      setProfile(updatedProfile);

      // Atualiza estados do App
      if (cpfInput.trim()) setStoreCnpjCpf(cpfInput.trim());
      if (companyNameInput.trim()) setStoreName(companyNameInput.trim());
      localStorage.setItem("pdv_company_logo", logoInput.trim());

      localStorage.setItem("pdv_owner_cpf", cpfInput.trim());
      localStorage.setItem("pdv_owner_name", ownerNameInput.trim());
      localStorage.setItem("pdv_store_cnpj_cpf", cpfInput.trim());
      localStorage.setItem("pdv_pix_key", pixKeyInput.trim());

      // Salva na nuvem Firebase Firestore
      if (user?.uid && user.uid !== "guest_visitor" && db) {
        try {
          const userDocRef = doc(db, "userData", user.uid);
          await setDoc(
            userDocRef,
            {
              ownerName: ownerNameInput.trim(),
              ownerCpf: cpfInput.trim(),
              storeCnpjCpf: cpfInput.trim(),
              phone: phoneInput.trim(),
              pixKey: pixKeyInput.trim(),
              storeName: companyNameInput.trim(),
              companyProfile: updatedProfile,
              updatedAt: new Date().toISOString()
            },
            { merge: true }
          );
        } catch (cloudErr) {
          console.warn("Aviso ao salvar dados no Firestore:", cloudErr);
        }
      }

      showNotification("Meus Dados Pessoais e CPF salvos com sucesso na conta! 🛡️✅", "success");
    } catch (err: any) {
      console.error("Erro ao salvar dados pessoais:", err);
      showNotification(`Erro ao salvar dados: ${err.message || err}`, "error");
    } finally {
      setIsSavingData(false);
    }
  };

  // Alterar Senha de Acesso
  const handleUpdatePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showNotification("Você precisa estar logado para alterar sua senha.", "error");
      return;
    }

    if (!newPassword || !confirmNewPassword) {
      showNotification("Por favor, preencha todos os campos da nova senha.", "error");
      return;
    }

    if (newPassword.length < 6) {
      showNotification("A nova senha deve ter pelo menos 6 caracteres.", "error");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      showNotification("A nova senha e a confirmação não coincidem! ❌", "error");
      return;
    }

    setIsChangingPassword(true);
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (!currentUser) {
        throw new Error("Sessão não encontrada. Faça login novamente.");
      }

      // Se informou a senha atual, reautentica primeiro para evitar erro de requires-recent-login
      if (currentPassword && currentUser.email) {
        try {
          const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
          await reauthenticateWithCredential(currentUser, credential);
        } catch (reauthErr: any) {
          if (reauthErr.code === "auth/wrong-password" || reauthErr.code === "auth/invalid-credential") {
            showNotification("A senha atual informada está incorreta. Verifique e tente novamente.", "error");
            setIsChangingPassword(false);
            return;
          }
          console.warn("Aviso na reautenticação:", reauthErr);
        }
      }

      // Executa a alteração de senha
      await updatePassword(currentUser, newPassword);
      showNotification("Senha alterada com sucesso! Guarde sua nova senha em local seguro. 🔒✨", "success");

      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err: any) {
      console.error("Erro ao atualizar senha:", err);
      if (err.code === "auth/requires-recent-login") {
        showNotification(
          "O Firebase exige que você informe sua 'Senha Atual' acima para confirmar esta alteração, ou use o botão 'Enviar Link no E-mail' abaixo.",
          "error"
        );
      } else if (err.code === "auth/weak-password") {
        showNotification("A senha digitada é muito fraca. Digite pelo menos 6 números ou letras.", "error");
      } else {
        showNotification(`Falha ao alterar senha: ${err.message || err}`, "error");
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Enviar link no e-mail oficial
  const handleSendResetEmail = async () => {
    if (!user?.email) {
      showNotification("Nenhum e-mail vinculado a esta conta.", "error");
      return;
    }

    setIsSendingResetEmail(true);
    try {
      const auth = getAuth();
      await sendPasswordResetEmail(auth, user.email);
      setResetEmailSent(true);
      showNotification(`Link de redefinição de senha enviado para ${user.email}! 📧✨`, "success");
    } catch (err: any) {
      console.error("Erro ao enviar e-mail de redefinição:", err);
      showNotification(`Erro ao enviar e-mail: ${err.message || err}`, "error");
    } finally {
      setIsSendingResetEmail(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* 1. SEÇÃO DE DADOS PESSOAIS & CPF */}
      <div className="bg-slate-900 border border-white/10 rounded-3xl p-5 sm:p-7 shadow-xl space-y-5">
        <div className="flex items-center justify-between gap-3 flex-wrap border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-emerald-500/20">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-white font-black text-sm sm:text-base tracking-tight flex items-center gap-2">
                <span>Meus Dados Pessoais & Documentos</span>
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                  Seguro
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                Cadastre seu CPF, telefone e chave PIX para segurança e cobranças do aplicativo.
              </p>
            </div>
          </div>

          {isDenise && (
            <button
              type="button"
              onClick={handleAutoFillDenise}
              className="bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[10px] font-black uppercase px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Preencher Dados da Denise</span>
            </button>
          )}
        </div>

        <form onSubmit={handleSavePersonalData} className="space-y-4">
          {/* E-mail da Conta (Read-only com selo) */}
          <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-white/5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-purple-400 shrink-0" />
              <div>
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">
                  E-mail da Conta Conectada
                </span>
                <span className="text-xs text-purple-300 font-mono font-bold select-all">
                  {user?.email || "denisejesusdasilva1988@gmail.com"}
                </span>
              </div>
            </div>
            <span className="text-[9px] font-black uppercase bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2 py-0.5 rounded-lg shrink-0">
              Conta Titular
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nome Completo do Titular */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-400" />
                <span>Nome Completo do Titular</span>
              </label>
              <input
                type="text"
                value={ownerNameInput}
                onChange={(e) => setOwnerNameInput(e.target.value)}
                placeholder="Ex: Denise Jesus da Silva"
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none font-bold focus:border-emerald-500 transition-all"
              />
            </div>

            {/* CPF do Titular */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-400" />
                <span>CPF do Titular *</span>
              </label>
              <input
                type="text"
                value={cpfInput}
                onChange={handleCpfChange}
                placeholder="000.000.000-00"
                maxLength={18}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none font-bold font-mono focus:border-blue-500 transition-all placeholder:text-slate-600"
              />
              <span className="text-[9px] text-slate-500 block">
                Necessário para validar sua identidade e redefinições de segurança.
              </span>
            </div>

            {/* Telefone / WhatsApp */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span>Telefone / WhatsApp</span>
              </label>
              <input
                type="text"
                value={phoneInput}
                onChange={handlePhoneChange}
                placeholder="(21) 96671-3263"
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none font-bold font-mono focus:border-emerald-500 transition-all"
              />
            </div>

            {/* Chave PIX Oficial */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <QrCode className="w-3.5 h-3.5 text-amber-400" />
                <span>Sua Chave PIX para Receber</span>
              </label>
              <input
                type="text"
                value={pixKeyInput}
                onChange={(e) => setPixKeyInput(e.target.value)}
                placeholder="Ex: 21966713263 (Celular) ou e-mail"
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-amber-300 outline-none font-bold font-mono focus:border-amber-500 transition-all"
              />
              <span className="text-[9px] text-slate-500 block">
                Chave PIX usada para receber pagamentos de anúncios e marketing.
              </span>
            </div>
          </div>

          {/* Logomarca / Foto da Empresa */}
          <div className="bg-slate-950/70 p-4 rounded-2xl border border-white/5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                <span>Logomarca / Foto de Identidade do Negócio</span>
              </label>
              {logoInput && (
                <button
                  type="button"
                  onClick={() => setLogoInput("")}
                  className="text-[9.5px] font-bold text-red-400 hover:text-red-300 flex items-center gap-1 px-2 py-0.5 rounded bg-red-500/10 hover:bg-red-500/20 transition-all cursor-pointer"
                  title="Remover Logo"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Remover</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
              <div className="w-16 h-16 rounded-2xl bg-slate-900 border-2 border-amber-500/40 flex items-center justify-center overflow-hidden shrink-0 shadow-inner p-1">
                {logoInput ? (
                  <img
                    src={logoInput}
                    alt="Logo"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-center p-1 text-slate-500 flex flex-col items-center">
                    <ImageIcon className="w-5 h-5 mb-0.5 text-slate-600" />
                    <span className="text-[7.5px] font-bold uppercase">Sem Foto</span>
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-2 min-w-[200px]">
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-amber-500/20 active:scale-95">
                    <Camera className="w-3.5 h-3.5" />
                    <span>Carregar Foto / Logo da Galeria</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                  <span className="text-[9.5px] text-slate-400 font-medium">
                    (PNG, JPG ou WEBP)
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] font-bold uppercase text-slate-400 block">
                    Ou cole o link da imagem (URL):
                  </span>
                  <input
                    type="text"
                    value={logoInput}
                    onChange={(e) => setLogoInput(e.target.value)}
                    placeholder="https://exemplo.com/logo.png"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none font-medium focus:border-amber-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Nome da Empresa / Comércio */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-orange-400" />
              <span>Nome da Empresa / Comércio / Barbearia</span>
            </label>
            <input
              type="text"
              value={companyNameInput}
              onChange={(e) => setCompanyNameInput(e.target.value)}
              placeholder="Ex: Calculadora Cérebro PDV / Barbearia do Amigo"
              className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none font-bold focus:border-orange-500 transition-all"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSavingData}
              className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.99] text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
            >
              {isSavingData ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando Dados...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Salvar Meus Dados & CPF 🛡️</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* 2. SEÇÃO DE ALTERAÇÃO DE SENHA DESCOMPLICADA */}
      <div className="bg-slate-900 border border-white/10 rounded-3xl p-5 sm:p-7 shadow-xl space-y-5">
        <div className="flex items-center justify-between gap-3 flex-wrap border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-500 text-white flex items-center justify-center font-black shadow-lg shadow-purple-500/20">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-white font-black text-sm sm:text-base tracking-tight flex items-center gap-2">
                <span>Alterar Senha do Aplicativo</span>
                <span className="bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                  Fácil & Sem Trava
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                Altere diretamente aqui no app ou receba o link de redefinição no seu e-mail oficial.
              </p>
            </div>
          </div>

          {/* Abas de método */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-white/5 gap-1">
            <button
              type="button"
              onClick={() => setActivePasswordMethod("direct")}
              className={`px-3 py-1.5 rounded-lg text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                activePasswordMethod === "direct"
                  ? "bg-purple-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Direto no App 🔒
            </button>
            <button
              type="button"
              onClick={() => setActivePasswordMethod("email")}
              className={`px-3 py-1.5 rounded-lg text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                activePasswordMethod === "email"
                  ? "bg-purple-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Via E-mail 📧
            </button>
          </div>
        </div>

        {activePasswordMethod === "direct" ? (
          <form onSubmit={handleUpdatePasswordSubmit} className="space-y-4">
            <div className="p-3 bg-purple-950/30 border border-purple-500/20 rounded-2xl space-y-1">
              <div className="flex items-center gap-2 text-purple-300 text-xs font-black uppercase">
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                <span>Atualização Rápida de Senha</span>
              </div>
              <p className="text-[10px] text-slate-300 leading-relaxed font-medium">
                Informe a nova senha desejada. Se souber sua senha atual, preencha-a para confirmação instantânea.
              </p>
            </div>

            {/* Senha Atual (Opcional se tiver CPF) */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-300 flex items-center justify-between">
                <span>Senha Atual (Caso se recorde)</span>
                <span className="text-[9px] text-slate-500 normal-case">Para confirmação segura</span>
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Digite sua senha atual"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none font-bold pr-10 focus:border-purple-500"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-3 text-slate-500 hover:text-white"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Nova Senha */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-300">
                  Nova Senha (Mínimo 6 caracteres) *
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="Mínimo 6 dígitos"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none font-bold pr-10 focus:border-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-3 text-slate-500 hover:text-white"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirmar Nova Senha */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-300">
                  Confirmar Nova Senha *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmNewPassword ? "text" : "password"}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    required
                    placeholder="Repita a nova senha"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none font-bold pr-10 focus:border-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                    className="absolute right-3 top-3 text-slate-500 hover:text-white"
                  >
                    {showConfirmNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isChangingPassword}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-[0.99] text-white py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 cursor-pointer disabled:opacity-50"
            >
              {isChangingPassword ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Atualizando Senha...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Salvar e Alterar Nova Senha 🔒</span>
                </>
              )}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-indigo-950/30 border border-indigo-500/20 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-indigo-300 text-xs font-black uppercase">
                <Mail className="w-4 h-4 text-indigo-400" />
                <span>Link Oficial do Firebase por E-mail</span>
              </div>
              <p className="text-[10.5px] text-slate-300 leading-relaxed font-medium">
                Clique no botão abaixo para que o Google Firebase envie um link oficial e seguro de redefinição para:{" "}
                <strong className="text-white select-all">{user?.email || "denisejesusdasilva1988@gmail.com"}</strong>.
              </p>
            </div>

            <div className="p-3.5 bg-amber-950/25 border border-amber-500/20 rounded-2xl space-y-1.5">
              <span className="text-[10px] font-black uppercase text-amber-400 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                ATENÇÃO: VERIFIQUE O SPAM E LIXO ELETRÔNICO!
              </span>
              <p className="text-[10px] text-slate-300 font-medium leading-relaxed">
                Após clicar, aguarde de 1 a 3 minutos e abra o seu aplicativo do <strong>Gmail</strong>. Procure na caixa de entrada e, se não encontrar, abra a pasta <strong>SPAM / Lixo Eletrônico</strong>, pois os provedores de e-mail costumam filtrar e-mails automáticos.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <button
                type="button"
                onClick={handleSendResetEmail}
                disabled={isSendingResetEmail}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-3 px-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 cursor-pointer disabled:opacity-50"
              >
                {isSendingResetEmail ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Enviando Link...</span>
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    <span>{resetEmailSent ? "Reenviar Link no E-mail" : "Enviar E-mail de Redefinição"}</span>
                  </>
                )}
              </button>

              <a
                href="https://mail.google.com"
                target="_blank"
                rel="noreferrer"
                className="bg-slate-950 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white py-3 px-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-4 h-4 text-emerald-400" />
                <span>Abrir Meu Gmail</span>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
