/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Modal & Painel Completo de Cadastro da Empresa e Configuração da Notinha
 * Permite cadastrar todos os contatos e selecionar com switches Sim/Não o que sai na notinha.
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Building2,
  Phone,
  MessageCircle,
  Instagram,
  Facebook,
  Globe,
  Mail,
  MapPin,
  FileText,
  X,
  Check,
  Receipt,
  Save,
  Eye,
  Sparkles,
  ShieldCheck,
  Smartphone,
  Camera,
  Upload,
  Trash2,
  Image as ImageIcon
} from "lucide-react";
import {
  CompanyProfile,
  loadCompanyProfile,
  saveCompanyProfile
} from "../utils/companyProfile";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../App";
import { compressImageFile } from "../utils/imageCompressor";

interface CompanyProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string | null;
  onSaved?: (profile: CompanyProfile) => void;
  showNotification: (msg: string, type?: "success" | "error" | "info") => void;
}

export const CompanyProfileModal: React.FC<CompanyProfileModalProps> = ({
  isOpen,
  onClose,
  userId,
  onSaved,
  showNotification,
}) => {
  const [profile, setProfile] = useState<CompanyProfile>(() => loadCompanyProfile(userId));
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"form" | "preview">("form");

  useEffect(() => {
    if (isOpen) {
      setProfile(loadCompanyProfile(userId));
    }
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const handleChange = (field: keyof CompanyProfile, value: any) => {
    setProfile((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleToggle = (field: keyof CompanyProfile) => {
    setProfile((prev) => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleLogoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      showNotification("Otimizando imagem da logomarca... ⏳", "info");
      const compressed = await compressImageFile(file, 400, 400, 0.82);
      handleChange("logoUrl", compressed);
      showNotification("Logo carregada e salva com sucesso! 🖼️ Lembre-se de clicar em 'Salvar Dados' ao final.", "success");
    } catch (err) {
      console.warn("Erro ao comprimir logo, usando fallback:", err);
      try {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === "string") {
            handleChange("logoUrl", reader.result);
            showNotification("Logo carregada com sucesso! 🖼️", "success");
          }
        };
        reader.readAsDataURL(file);
      } catch {
        showNotification("Não foi possível carregar a imagem. Tente outra foto!", "error");
      }
    }
  };

  const handleSave = async () => {
    if (!profile.name.trim()) {
      showNotification("Por favor, informe o Nome da Empresa ou Comércio! 🏢", "error");
      return;
    }

    setIsSaving(true);
    try {
      saveCompanyProfile(profile, userId);

      // Salva no Firestore se houver usuário conectado
      if (userId && userId !== "guest_visitor" && db) {
        try {
          const userDocRef = doc(db, "userData", userId);
          await setDoc(userDocRef, {
            companyProfile: profile,
            storeName: profile.name,
            storeCnpjCpf: profile.cnpjCpf,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch (cloudErr) {
          console.warn("Aviso ao salvar perfil na nuvem:", cloudErr);
        }
      }

      if (onSaved) {
        onSaved(profile);
      }

      showNotification("Dados da empresa e preferências da notinha salvos com sucesso! 🏢🧾✅", "success");
      onClose();
    } catch (err) {
      console.error("Erro ao salvar perfil da empresa:", err);
      showNotification("Erro ao salvar dados da empresa.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10010] flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-md"
          onClick={onClose}
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative bg-slate-900 border border-white/10 text-white w-full max-w-3xl rounded-3xl sm:rounded-[2.5rem] shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
        >
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-white/10 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-slate-950 flex items-center justify-center shadow-lg shadow-orange-500/20 shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                    Cadastro da Empresa & Notinha
                  </h3>
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                    Sincronizado
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">
                  Cadastre seus contatos e escolha com 1 clique o que vai sair impresso na notinha!
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

          {/* Quick tab switcher on mobile */}
          <div className="flex border-b border-white/10 bg-slate-950/40 p-1.5 gap-1.5 shrink-0 sm:hidden">
            <button
              onClick={() => setActiveTab("form")}
              className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "form"
                  ? "bg-emerald-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Dados & Contatos</span>
            </button>
            <button
              onClick={() => setActiveTab("preview")}
              className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "preview"
                  ? "bg-purple-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Ver Notinha 🧾</span>
            </button>
          </div>

          {/* Main Content Area */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Form & Toggles (7 cols on lg) */}
              <div className={`space-y-4 lg:col-span-7 ${activeTab === "preview" ? "hidden sm:block" : "block"}`}>
                <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-white/5 text-left space-y-1">
                  <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3" /> Escolha o que sai na notinha:
                  </span>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Preencha os campos abaixo e use o botão <strong className="text-emerald-400">"Sim / Não"</strong> ao lado de cada um para decidir se ele deve sair impresso no cupom do cliente.
                  </p>
                </div>

                {/* 0. Logomarca / Foto da Empresa */}
                <div className="bg-slate-850/70 p-3.5 rounded-2xl border border-white/5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-[10.5px] font-extrabold uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-pink-400" />
                      <span>Logomarca / Foto do Negócio</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleToggle("showLogoOnReceipt")}
                      className={`px-2.5 py-1 rounded-lg text-[9.5px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer ${
                        profile.showLogoOnReceipt !== false
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          : "bg-slate-800 text-slate-400 border border-white/5"
                      }`}
                      title="Exibir logo no topo da notinha?"
                    >
                      {profile.showLogoOnReceipt !== false ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Notinha: Sim ✅</span>
                        </>
                      ) : (
                        <>
                          <X className="w-3 h-3 text-slate-500" />
                          <span>Notinha: Não ❌</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    {/* Preview box */}
                    <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-white/15 bg-slate-950 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-inner group relative">
                      {profile.logoUrl ? (
                        <>
                          <img
                            src={profile.logoUrl}
                            alt="Logomarca"
                            className="w-full h-full object-contain p-1"
                          />
                          <button
                            type="button"
                            onClick={() => handleChange("logoUrl", "")}
                            className="absolute inset-0 bg-red-950/80 text-red-200 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-black"
                            title="Remover logotipo"
                          >
                            <Trash2 className="w-4 h-4 text-red-400 mb-0.5" />
                            Remover
                          </button>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-600 text-center p-2">
                          <ImageIcon className="w-6 h-6 stroke-1 mb-1 text-slate-500" />
                          <span className="text-[8px] font-bold">Sem Logo</span>
                        </div>
                      )}
                    </div>

                    {/* Upload button & URL input */}
                    <div className="flex-1 w-full space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white rounded-xl text-xs font-black shadow-lg shadow-pink-900/30 transition-all active:scale-95">
                          <Camera className="w-4 h-4" />
                          <span>Carregar Foto / Imagem</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoFileUpload}
                            className="hidden"
                          />
                        </label>
                        {profile.logoUrl && (
                          <button
                            type="button"
                            onClick={() => handleChange("logoUrl", "")}
                            className="px-2.5 py-2 bg-red-900/30 hover:bg-red-800/50 text-red-300 border border-red-500/30 rounded-xl text-xs font-bold transition-all"
                          >
                            Remover
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={profile.logoUrl || ""}
                        onChange={(e) => handleChange("logoUrl", e.target.value)}
                        placeholder="Ou cole o link da foto (https://...)"
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-[11px] text-white outline-none focus:border-pink-500/50"
                      />
                      <p className="text-[10px] text-slate-400">
                        PNG, JPG ou WebP de até 5MB. Aparece nos cupons, agenda e portal de agendamentos.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 1. Nome da Empresa */}
                <div className="bg-slate-850/70 p-3.5 rounded-2xl border border-white/5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-[10.5px] font-extrabold uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-orange-400" />
                      <span>Nome da Empresa / Comércio *</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleToggle("showNameOnReceipt")}
                      className={`px-2.5 py-1 rounded-lg text-[9.5px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer ${
                        profile.showNameOnReceipt
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          : "bg-slate-800 text-slate-400 border border-white/5"
                      }`}
                      title="Exibir na notinha?"
                    >
                      {profile.showNameOnReceipt ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Notinha: Sim ✅</span>
                        </>
                      ) : (
                        <>
                          <X className="w-3 h-3 text-slate-500" />
                          <span>Notinha: Não ❌</span>
                        </>
                      )}
                    </button>
                  </div>
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="Ex: Mercadinho Cérebro Inteligente"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none font-bold focus:border-orange-500/50"
                  />
                </div>

                {/* 2. CNPJ ou CPF */}
                <div className="bg-slate-850/70 p-3.5 rounded-2xl border border-white/5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-[10.5px] font-extrabold uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-400" />
                      <span>CNPJ ou CPF</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleToggle("showCnpjOnReceipt")}
                      className={`px-2.5 py-1 rounded-lg text-[9.5px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer ${
                        profile.showCnpjOnReceipt
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          : "bg-slate-800 text-slate-400 border border-white/5"
                      }`}
                    >
                      {profile.showCnpjOnReceipt ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Notinha: Sim ✅</span>
                        </>
                      ) : (
                        <>
                          <X className="w-3 h-3 text-slate-500" />
                          <span>Notinha: Não ❌</span>
                        </>
                      )}
                    </button>
                  </div>
                  <input
                    type="text"
                    value={profile.cnpjCpf}
                    onChange={(e) => handleChange("cnpjCpf", e.target.value)}
                    placeholder="Ex: 12.345.678/0001-90 ou CPF"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none font-bold font-mono focus:border-blue-500/50"
                  />
                </div>

                {/* 3. Telefone e WhatsApp (Grid 2 cols) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Telefone */}
                  <div className="bg-slate-850/70 p-3.5 rounded-2xl border border-white/5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-[10.5px] font-extrabold uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Telefone de Contato</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => handleToggle("showPhoneOnReceipt")}
                        className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                          profile.showPhoneOnReceipt
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                            : "bg-slate-800 text-slate-400 border border-white/5"
                        }`}
                      >
                        {profile.showPhoneOnReceipt ? "Sim ✅" : "Não ❌"}
                      </button>
                    </div>
                    <input
                      type="text"
                      value={profile.phone}
                      onChange={(e) => handleChange("phone", e.target.value)}
                      placeholder="Ex: (21) 3333-4444"
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none font-bold font-mono"
                    />
                  </div>

                  {/* WhatsApp */}
                  <div className="bg-slate-850/70 p-3.5 rounded-2xl border border-white/5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-[10.5px] font-extrabold uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
                        <MessageCircle className="w-3.5 h-3.5 text-green-400" />
                        <span>WhatsApp da Loja</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => handleToggle("showWhatsappOnReceipt")}
                        className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                          profile.showWhatsappOnReceipt
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                            : "bg-slate-800 text-slate-400 border border-white/5"
                        }`}
                      >
                        {profile.showWhatsappOnReceipt ? "Sim ✅" : "Não ❌"}
                      </button>
                    </div>
                    <input
                      type="text"
                      value={profile.whatsapp}
                      onChange={(e) => handleChange("whatsapp", e.target.value)}
                      placeholder="Ex: (21) 99999-8888"
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none font-bold font-mono"
                    />
                  </div>
                </div>

                {/* 4. Redes Sociais: Instagram & Facebook (Grid 2 cols) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Instagram */}
                  <div className="bg-slate-850/70 p-3.5 rounded-2xl border border-white/5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-[10.5px] font-extrabold uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
                        <Instagram className="w-3.5 h-3.5 text-pink-400" />
                        <span>Instagram</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => handleToggle("showInstagramOnReceipt")}
                        className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                          profile.showInstagramOnReceipt
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                            : "bg-slate-800 text-slate-400 border border-white/5"
                        }`}
                      >
                        {profile.showInstagramOnReceipt ? "Sim ✅" : "Não ❌"}
                      </button>
                    </div>
                    <input
                      type="text"
                      value={profile.instagram}
                      onChange={(e) => handleChange("instagram", e.target.value)}
                      placeholder="Ex: @seunegocio"
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none font-bold"
                    />
                  </div>

                  {/* Facebook */}
                  <div className="bg-slate-850/70 p-3.5 rounded-2xl border border-white/5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-[10.5px] font-extrabold uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
                        <Facebook className="w-3.5 h-3.5 text-blue-400" />
                        <span>Facebook</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => handleToggle("showFacebookOnReceipt")}
                        className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                          profile.showFacebookOnReceipt
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                            : "bg-slate-800 text-slate-400 border border-white/5"
                        }`}
                      >
                        {profile.showFacebookOnReceipt ? "Sim ✅" : "Não ❌"}
                      </button>
                    </div>
                    <input
                      type="text"
                      value={profile.facebook}
                      onChange={(e) => handleChange("facebook", e.target.value)}
                      placeholder="Ex: facebook.com/loja"
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none font-bold"
                    />
                  </div>
                </div>

                {/* 5. Página / Site da Empresa */}
                <div className="bg-slate-850/70 p-3.5 rounded-2xl border border-white/5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-[10.5px] font-extrabold uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Página / Site Oficial da Empresa</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleToggle("showWebsiteOnReceipt")}
                      className={`px-2.5 py-1 rounded-lg text-[9.5px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer ${
                        profile.showWebsiteOnReceipt
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          : "bg-slate-800 text-slate-400 border border-white/5"
                      }`}
                    >
                      {profile.showWebsiteOnReceipt ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Notinha: Sim ✅</span>
                        </>
                      ) : (
                        <>
                          <X className="w-3 h-3 text-slate-500" />
                          <span>Notinha: Não ❌</span>
                        </>
                      )}
                    </button>
                  </div>
                  <input
                    type="text"
                    value={profile.website}
                    onChange={(e) => handleChange("website", e.target.value)}
                    placeholder="Ex: www.suaempresa.com.br"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none font-bold"
                  />
                </div>

                {/* 6. E-mail de Contato */}
                <div className="bg-slate-850/70 p-3.5 rounded-2xl border border-white/5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-[10.5px] font-extrabold uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-amber-400" />
                      <span>E-mail de Contato</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleToggle("showEmailOnReceipt")}
                      className={`px-2.5 py-1 rounded-lg text-[9.5px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer ${
                        profile.showEmailOnReceipt
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          : "bg-slate-800 text-slate-400 border border-white/5"
                      }`}
                    >
                      {profile.showEmailOnReceipt ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Notinha: Sim ✅</span>
                        </>
                      ) : (
                        <>
                          <X className="w-3 h-3 text-slate-500" />
                          <span>Notinha: Não ❌</span>
                        </>
                      )}
                    </button>
                  </div>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="Ex: contato@suaempresa.com.br"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none font-bold"
                  />
                </div>

                {/* 7. Endereço Completo */}
                <div className="bg-slate-850/70 p-3.5 rounded-2xl border border-white/5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-[10.5px] font-extrabold uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-red-400" />
                      <span>Endereço Físico do Comércio</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleToggle("showAddressOnReceipt")}
                      className={`px-2.5 py-1 rounded-lg text-[9.5px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer ${
                        profile.showAddressOnReceipt
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          : "bg-slate-800 text-slate-400 border border-white/5"
                      }`}
                    >
                      {profile.showAddressOnReceipt ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Notinha: Sim ✅</span>
                        </>
                      ) : (
                        <>
                          <X className="w-3 h-3 text-slate-500" />
                          <span>Notinha: Não ❌</span>
                        </>
                      )}
                    </button>
                  </div>
                  <input
                    type="text"
                    value={profile.address}
                    onChange={(e) => handleChange("address", e.target.value)}
                    placeholder="Ex: Rua do Comércio, 120 - Centro"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none font-bold"
                  />
                </div>
              </div>

              {/* Right Column: Live Receipt Preview (5 cols on lg) */}
              <div className={`space-y-4 lg:col-span-5 ${activeTab === "form" ? "hidden sm:block" : "block"}`}>
                <div className="sticky top-0 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase text-purple-300 tracking-wider flex items-center gap-1.5">
                      <Receipt className="w-4 h-4 text-purple-400" />
                      Prévia da Sua Notinha
                    </span>
                    <span className="text-[9px] bg-purple-500/20 text-purple-200 border border-purple-500/30 px-2 py-0.5 rounded-full font-bold">
                      Tempo Real
                    </span>
                  </div>

                  {/* Thermal paper simulation */}
                  <div className="bg-amber-50 text-slate-900 rounded-2xl p-5 shadow-2xl border-4 border-slate-300 font-mono text-[11px] leading-tight select-none relative overflow-hidden">
                    {/* Serrilha topo */}
                    <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-slate-400/20 to-transparent" />

                    <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-400">
                      {profile.showLogoOnReceipt !== false && profile.logoUrl && (
                        <div className="flex justify-center mb-1.5">
                          <img
                            src={profile.logoUrl}
                            alt="Logo Notinha"
                            className="max-h-12 max-w-[140px] object-contain filter grayscale contrast-125"
                          />
                        </div>
                      )}
                      {profile.showNameOnReceipt && profile.name ? (
                        <div className="font-black text-sm uppercase tracking-wide">
                          {profile.name}
                        </div>
                      ) : (
                        <div className="font-bold text-xs uppercase text-slate-500 italic">
                          [Nome oculto ou não cadastrado]
                        </div>
                      )}

                      {profile.showCnpjOnReceipt && profile.cnpjCpf && (
                        <div className="text-[10px] font-bold text-slate-700">
                          CNPJ/CPF: {profile.cnpjCpf}
                        </div>
                      )}

                      {profile.showAddressOnReceipt && profile.address && (
                        <div className="text-[9.5px] text-slate-700">
                          END: {profile.address}
                        </div>
                      )}

                      {profile.showPhoneOnReceipt && profile.phone && (
                        <div className="text-[9.5px] font-bold text-slate-800">
                          TEL: {profile.phone}
                        </div>
                      )}

                      {profile.showWhatsappOnReceipt && profile.whatsapp && (
                        <div className="text-[9.5px] font-bold text-green-800">
                          WHATSAPP: {profile.whatsapp}
                        </div>
                      )}

                      {profile.showInstagramOnReceipt && profile.instagram && (
                        <div className="text-[9.5px] font-bold text-pink-800">
                          INSTAGRAM: {profile.instagram}
                        </div>
                      )}

                      {profile.showFacebookOnReceipt && profile.facebook && (
                        <div className="text-[9.5px] text-blue-800">
                          FACEBOOK: {profile.facebook}
                        </div>
                      )}

                      {profile.showWebsiteOnReceipt && profile.website && (
                        <div className="text-[9.5px] text-slate-800">
                          SITE: {profile.website}
                        </div>
                      )}

                      {profile.showEmailOnReceipt && profile.email && (
                        <div className="text-[9.5px] text-slate-700">
                          EMAIL: {profile.email}
                        </div>
                      )}

                      <div className="text-[9px] font-extrabold uppercase tracking-widest pt-1 text-slate-800">
                        *** COMPROVANTE DE VENDA ***
                      </div>
                    </div>

                    {/* Metadata & sample items */}
                    <div className="py-2.5 border-b border-dashed border-slate-400 space-y-1 text-[9.5px]">
                      <div className="flex justify-between text-slate-600">
                        <span>DATA: {new Date().toLocaleDateString("pt-BR")}</span>
                        <span>HORA: {new Date().toLocaleTimeString("pt-BR").slice(0, 5)}</span>
                      </div>
                      <div className="font-bold text-slate-800">
                        CLIENTE: CONSUMIDOR FINAL
                      </div>
                    </div>

                    <div className="py-2.5 border-b border-dashed border-slate-400 space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span>1x ITEM DE EXEMPLO</span>
                        <span className="font-bold">R$ 15,00</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span>2x PRODUTO DO COMÉRCIO</span>
                        <span className="font-bold">R$ 24,90</span>
                      </div>
                    </div>

                    <div className="pt-2.5 space-y-1">
                      <div className="flex justify-between text-xs font-black border-t border-b border-slate-900 py-1">
                        <span>TOTAL R$:</span>
                        <span>R$ 39,90</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span>PAGAMENTO:</span>
                        <span className="font-bold uppercase">PIX / DINHEIRO</span>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="text-center pt-3 mt-3 border-t border-dashed border-slate-400 text-[9px] text-slate-600 space-y-0.5">
                      <p className="font-bold">Obrigado pela preferência! Volte sempre!</p>
                      <p className="text-[8px] text-slate-500">SISTEMA CÉREBRO INTELIGENTE</p>
                    </div>

                    {/* Serrilha fundo */}
                    <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-t from-slate-400/20 to-transparent" />
                  </div>

                  <p className="text-[10px] text-slate-400 text-center italic">
                    💡 Dica: Ligue ou desligue os contatos à esquerda para ver a notinha mudar na hora!
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 sm:p-5 border-t border-white/10 bg-slate-950 flex items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-xl shadow-emerald-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Salvando Dados...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Salvar Dados da Empresa 💾</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
