/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Modal Completo de Cadastro de Anúncio de Marketing (Produto ou Encarte)
 * 
 * - Produto Único: R$ 20,00 (Escolhe duração de 1 a 7 dias)
 * - Encarte Completo: R$ 39,90 (7 dias contados)
 * - Coleta completa de dados:
 *   - Imagem do produto ou encarte
 *   - Descrição detalhada
 *   - Preço de promoção e desconto calculado (%)
 *   - Nome da Empresa / Mercado
 *   - Logo ou foto da fachada
 *   - Endereço para compras presenciais
 *   - Links de vendas online: Site, WhatsApp, Instagram, Facebook, TikTok, Canais
 * - Pagamento transparente de R$ 20,00 ou R$ 39,90 via PIX / Mercado Pago
 * - Envio para moderação da Administradora (denisejesus1988@gmail.com)
 */

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Sparkles,
  ShoppingBag,
  Tag,
  DollarSign,
  Calendar,
  Building2,
  MapPin,
  Globe,
  Instagram,
  Facebook,
  Phone,
  MessageCircle,
  Upload,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  QrCode,
  Copy,
  Check,
  CreditCard,
  ArrowRight,
  ExternalLink,
  Flame,
  Percent
} from "lucide-react";
import {
  MarketingAd,
  MarketingAdType,
  MARKETING_PRICING,
  ADMIN_MARKETING_PIX,
  loadLocalMarketingAds,
  saveLocalMarketingAds
} from "../utils/marketingAds";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../App";
import { loadCompanyProfile } from "../utils/companyProfile";

interface MarketingAdModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: MarketingAdType;
  userEmail?: string;
  userId?: string;
  showNotification: (msg: string, type?: "success" | "error" | "info") => void;
  onAdSubmitted?: (ad: MarketingAd) => void;
}

export const MarketingAdModal: React.FC<MarketingAdModalProps> = ({
  isOpen,
  onClose,
  initialType = "single_product",
  userEmail = "",
  userId,
  showNotification,
  onAdSubmitted,
}) => {
  // Dados pré-carregados da empresa do usuário se já preencheu antes
  const existingCompany = useMemo(() => loadCompanyProfile(userId), [userId]);

  // Passos do formulário: 1 = Informações, 2 = Pagamento & Confirmação, 3 = Sucesso
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [adType, setAdType] = useState<MarketingAdType>(initialType);

  // Campos do Produto / Promoção
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [originalPriceStr, setOriginalPriceStr] = useState("");
  const [promoPriceStr, setPromoPriceStr] = useState("");
  const [category, setCategory] = useState("mercearia");

  // Duração (1 a 7 dias para produto, fixo em 7 para encarte)
  const [durationDays, setDurationDays] = useState<number>(7);

  // Campos da Empresa Anunciante
  const [companyName, setCompanyName] = useState(existingCompany.name || "");
  const [companyLogo, setCompanyLogo] = useState(existingCompany.logoUrl || "");
  const [companyAddress, setCompanyAddress] = useState(existingCompany.address || "");
  const [companyCity, setCompanyCity] = useState(existingCompany.city || "");
  const [companyPhone, setCompanyPhone] = useState(existingCompany.phone || "");
  const [companyWhatsapp, setCompanyWhatsapp] = useState(existingCompany.whatsapp || "");

  // Links de Vendas & Redes Sociais
  const [websiteUrl, setWebsiteUrl] = useState(existingCompany.website || "");
  const [salesLink, setSalesLink] = useState("");
  const [instagramUrl, setInstagramUrl] = useState(existingCompany.instagram || "");
  const [facebookUrl, setFacebookUrl] = useState(existingCompany.facebook || "");
  const [tiktokUrl, setTiktokUrl] = useState("");

  // Dados do Anunciante
  const [advertiserName, setAdvertiserName] = useState(existingCompany.responsibleName || "");
  const [advertiserEmail, setAdvertiserEmail] = useState(userEmail || existingCompany.email || "");

  // Estado de envio e pagamento
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);
  const [createdAd, setCreatedAd] = useState<MarketingAd | null>(null);

  // Cálculo de desconto % automático
  const discountPercent = useMemo(() => {
    const orig = parseFloat(originalPriceStr.replace(",", "."));
    const promo = parseFloat(promoPriceStr.replace(",", "."));
    if (!isNaN(orig) && !isNaN(promo) && orig > promo && orig > 0) {
      return Math.round(((orig - promo) / orig) * 100);
    }
    return 0;
  }, [originalPriceStr, promoPriceStr]);

  // Preço a pagar
  const priceToPay = adType === "single_product" ? MARKETING_PRICING.SINGLE_PRODUCT : MARKETING_PRICING.LEAFLET_ENCARTE;

  if (!isOpen) return null;

  // Processar upload de imagem
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, target: "product" | "logo") => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showNotification("A imagem deve ter menos de 2MB. Tente outra imagem menor.", "error");
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target?.result as string;
        if (target === "product") setImageUrl(base64);
        else setCompanyLogo(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  // Validar Step 1 e ir para Pagamento
  const handleProceedToPayment = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      showNotification(adType === "single_product" ? "Digite o nome do produto!" : "Digite o título do encarte!", "error");
      return;
    }
    if (!imageUrl.trim()) {
      showNotification("Por favor, selecione ou informe o link da imagem do produto/encarte!", "error");
      return;
    }
    if (!companyName.trim()) {
      showNotification("Digite o nome da sua empresa/mercado!", "error");
      return;
    }
    if (adType === "single_product") {
      const p = parseFloat(promoPriceStr.replace(",", "."));
      if (isNaN(p) || p <= 0) {
        showNotification("Digite um preço promocional válido para o produto!", "error");
        return;
      }
    }
    if (!advertiserEmail.trim()) {
      showNotification("Informe o seu e-mail de contato!", "error");
      return;
    }

    setStep(2);
  };

  // Confirmar pagamento e enviar anúncio para aprovação do Admin
  const handleConfirmSubmission = async () => {
    try {
      setIsSubmitting(true);

      const promoPrice = promoPriceStr ? parseFloat(promoPriceStr.replace(",", ".")) : undefined;
      const origPrice = originalPriceStr ? parseFloat(originalPriceStr.replace(",", ".")) : undefined;

      const newAdData: MarketingAd = {
        id: "ad_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
        type: adType,
        status: "pending_review", // Vai para Denise avaliar antes de publicar
        title: title.trim(),
        description: description.trim(),
        imageUrl: imageUrl.trim(),
        originalPrice: origPrice,
        promoPrice: promoPrice,
        discountPercent: discountPercent > 0 ? discountPercent : undefined,
        category,
        companyName: companyName.trim(),
        companyLogo: companyLogo.trim() || undefined,
        companyAddress: companyAddress.trim() || undefined,
        companyCity: companyCity.trim() || undefined,
        companyPhone: companyPhone.trim() || undefined,
        companyWhatsapp: companyWhatsapp.trim() || undefined,
        websiteUrl: websiteUrl.trim() || undefined,
        salesLink: salesLink.trim() || undefined,
        instagramUrl: instagramUrl.trim() || undefined,
        facebookUrl: facebookUrl.trim() || undefined,
        tiktokUrl: tiktokUrl.trim() || undefined,
        durationDays: adType === "single_product" ? durationDays : 7,
        pricePaid: priceToPay,
        paymentMethod: "pix_mercadopago",
        paymentStatus: "approved",
        createdAt: Date.now(),
        advertiserEmail: advertiserEmail.trim(),
        advertiserName: advertiserName.trim() || companyName.trim(),
        advertiserUserId: userId || undefined,
      };

      // 1. Salvar no Firestore se online
      if (db) {
        try {
          await addDoc(collection(db, "marketing_ads"), {
            ...newAdData,
            createdAtTimestamp: serverTimestamp(),
          });
        } catch (err) {
          console.warn("Aviso Firestore ao cadastrar marketing_ad, salvando cópia local:", err);
        }
      }

      // 2. Salvar localmente
      const currentLocal = loadLocalMarketingAds();
      saveLocalMarketingAds([newAdData, ...currentLocal]);

      setCreatedAd(newAdData);
      setStep(3);
      if (onAdSubmitted) onAdSubmitted(newAdData);
      showNotification("Anúncio enviado com sucesso! Está em análise pela administração. 🚀", "success");
    } catch (e: any) {
      console.error("Erro ao cadastrar anúncio:", e);
      showNotification(`Erro ao cadastrar anúncio: ${e.message || e}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const pixCopyPasteCode = `00020126580014BR.GOV.BCB.PIX0114${ADMIN_MARKETING_PIX.key}520400005303986540${priceToPay.toFixed(2)}5802BR5925DENISE JESUS DA SILVA6014RIO DE JANEIRO62070503***6304`;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border-2 border-red-500/40 rounded-[2.5rem] max-w-2xl w-full p-5 sm:p-7 shadow-2xl text-left my-auto relative text-white space-y-6">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-wider border border-red-500/30">
              <Sparkles className="w-3 h-3" />
              Marketing & Publicidade no Aplicativo
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Anunciar no Calculadora Cérebro PDV
            </h2>
            <p className="text-xs text-slate-300">
              Milhares de clientes da sua região e da Play Store verão sua promoção!
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Indicador de passos */}
        <div className="flex items-center justify-between gap-2 bg-slate-950/60 p-2.5 rounded-2xl border border-white/5 text-[10px] font-black uppercase">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl ${step === 1 ? "bg-red-600 text-white" : "text-slate-400"}`}>
            <span>1.</span>
            <span>Preencher Dados</span>
          </div>
          <div className="h-0.5 w-6 bg-white/10" />
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl ${step === 2 ? "bg-red-600 text-white" : "text-slate-400"}`}>
            <span>2.</span>
            <span>Taxa & Pagamento</span>
          </div>
          <div className="h-0.5 w-6 bg-white/10" />
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl ${step === 3 ? "bg-emerald-600 text-white" : "text-slate-400"}`}>
            <span>3.</span>
            <span>Moderação & Publicação</span>
          </div>
        </div>

        {/* STEP 1: PREENCHIMENTO DOS DADOS */}
        {step === 1 && (
          <form onSubmit={handleProceedToPayment} className="space-y-5 max-h-[70vh] overflow-y-auto pr-1 no-scrollbar">
            {/* Escolha do formato de anúncio */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setAdType("single_product");
                }}
                className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer relative overflow-hidden ${
                  adType === "single_product"
                    ? "bg-red-500/15 border-red-500 shadow-lg shadow-red-500/20"
                    : "bg-slate-950/40 border-white/10 hover:border-white/20"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center font-black">
                    <Tag className="w-5 h-5" />
                  </div>
                  <span className="text-base font-black text-white font-mono bg-red-600/30 px-2 py-0.5 rounded-lg border border-red-500/40">
                    R$ 20,00
                  </span>
                </div>
                <h4 className="font-black text-sm text-white uppercase">1 Produto em Promoção</h4>
                <p className="text-[10px] text-slate-300 mt-1">
                  Divulgação de 1 produto com preço promocional, foto e links de compras. De 1 até 7 dias!
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAdType("leaflet_encarte");
                  setDurationDays(7);
                }}
                className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer relative overflow-hidden ${
                  adType === "leaflet_encarte"
                    ? "bg-amber-500/15 border-amber-500 shadow-lg shadow-amber-500/20"
                    : "bg-slate-950/40 border-white/10 hover:border-white/20"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <span className="text-base font-black text-white font-mono bg-amber-600/30 px-2 py-0.5 rounded-lg border border-amber-500/40">
                    R$ 39,90
                  </span>
                </div>
                <h4 className="font-black text-sm text-white uppercase">Encarte Completo de Ofertas</h4>
                <p className="text-[10px] text-slate-300 mt-1">
                  Folheto completo de supermercado com ofertas semanais. 7 dias contados no mural!
                </p>
              </button>
            </div>

            {/* SEÇÃO 1: INFORMAÇÕES DO PRODUTO / ENCARTE */}
            <div className="bg-slate-950/60 p-4 sm:p-5 rounded-3xl border border-white/5 space-y-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-red-400 block flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" /> Informações do Anúncio
              </span>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider pl-1">
                  {adType === "single_product" ? "Nome do Produto em Promoção *" : "Título do Encarte / Folheto *"}
                </label>
                <input
                  type="text"
                  required
                  placeholder={adType === "single_product" ? "Ex: Arroz Tio João 5kg Tipo 1" : "Ex: Encarte de Ofertas Guanabara - Fim de Semana"}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl bg-slate-900 border border-white/10 text-xs font-bold text-white outline-none focus:border-red-500 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider pl-1">
                  Descrição dos Detalhes / Benefícios
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Oferta imperdível válida enquanto durar o estoque. Limite de 5 unidades por cliente."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-900 border border-white/10 text-xs font-bold text-white outline-none focus:border-red-500 transition-all"
                />
              </div>

              {/* Preços e Desconto (Para produto único) */}
              {adType === "single_product" && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-300 uppercase pl-1">Preço Normal (R$)</label>
                    <input
                      type="text"
                      placeholder="Ex: 29,90"
                      value={originalPriceStr}
                      onChange={(e) => setOriginalPriceStr(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl bg-slate-900 border border-white/10 text-xs font-bold text-white outline-none focus:border-red-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-emerald-400 uppercase pl-1">Preço Promoção (R$) *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: 19,90"
                      value={promoPriceStr}
                      onChange={(e) => setPromoPriceStr(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl bg-slate-900 border border-emerald-500/40 text-xs font-bold text-emerald-300 outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-amber-400 uppercase pl-1">Desconto (%)</label>
                    <div className="w-full h-11 px-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs font-black text-amber-300 flex items-center justify-between">
                      <span>{discountPercent > 0 ? `${discountPercent}% OFF` : "Sem cálculo"}</span>
                      <Percent className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                  </div>
                </div>
              )}

              {/* Imagem do Produto / Encarte */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider pl-1">
                  Foto do Produto ou Imagem do Encarte *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="h-12 border-2 border-dashed border-red-500/40 rounded-xl px-4 flex items-center justify-center gap-2 hover:bg-white/5 cursor-pointer text-xs font-bold text-slate-200">
                    <Upload className="w-4 h-4 text-red-400" />
                    <span>Upload do Celular/PC</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, "product")}
                      className="hidden"
                    />
                  </label>
                  <input
                    type="text"
                    placeholder="Ou cole o link da imagem..."
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="h-12 px-3 rounded-xl bg-slate-900 border border-white/10 text-xs font-bold text-white outline-none focus:border-red-500"
                  />
                </div>
                {imageUrl && (
                  <div className="relative aspect-video max-h-36 rounded-xl overflow-hidden border border-white/10 bg-black/40 flex items-center justify-center">
                    <img src={imageUrl} alt="Preview" className="max-h-full max-w-full object-contain" />
                    <button
                      type="button"
                      onClick={() => setImageUrl("")}
                      className="absolute top-2 right-2 p-1 bg-black/70 hover:bg-red-600 rounded-lg text-white text-[10px] font-bold"
                    >
                      Remover
                    </button>
                  </div>
                )}
              </div>

              {/* Duração da Publicação */}
              <div className="space-y-1.5 pt-2 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider pl-1">
                    Tempo de Duração do Anúncio no Ar
                  </label>
                  <span className="text-xs font-black text-amber-400">
                    {adType === "single_product" ? `${durationDays} ${durationDays === 1 ? "dia" : "dias"} (R$ 20,00)` : "7 dias contados (R$ 39,90)"}
                  </span>
                </div>
                {adType === "single_product" ? (
                  <div className="grid grid-cols-7 gap-1.5 pt-1">
                    {[1, 2, 3, 4, 5, 6, 7].map((days) => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => setDurationDays(days)}
                        className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                          durationDays === days
                            ? "bg-red-600 text-white shadow-lg shadow-red-600/30 scale-105"
                            : "bg-slate-900 hover:bg-slate-800 text-slate-400 border border-white/5"
                        }`}
                      >
                        {days}d
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 bg-slate-900/50 p-2 rounded-xl border border-white/5">
                    Os encartes têm validade padrão de 7 dias contados a partir da aprovação da administração.
                  </p>
                )}
              </div>
            </div>

            {/* SEÇÃO 2: DADOS DA EMPRESA & CONTATOS */}
            <div className="bg-slate-950/60 p-4 sm:p-5 rounded-3xl border border-white/5 space-y-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" /> Dados da Empresa / Supermercado
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-300 uppercase pl-1">Nome do Mercado / Empresa *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Supermercado Alvorada"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-slate-900 border border-white/10 text-xs font-bold text-white outline-none focus:border-red-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-300 uppercase pl-1">Endereço Completo</label>
                  <input
                    type="text"
                    placeholder="Ex: Av. Brasil, 1200 - Centro"
                    value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-slate-900 border border-white/10 text-xs font-bold text-white outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-300 uppercase pl-1">WhatsApp de Contato / Pedidos</label>
                  <input
                    type="text"
                    placeholder="Ex: (21) 99999-9999"
                    value={companyWhatsapp}
                    onChange={(e) => setCompanyWhatsapp(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-slate-900 border border-white/10 text-xs font-bold text-white outline-none focus:border-red-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-300 uppercase pl-1">Telefone Fixo / Comercial</label>
                  <input
                    type="text"
                    placeholder="Ex: (21) 2222-3333"
                    value={companyPhone}
                    onChange={(e) => setCompanyPhone(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-slate-900 border border-white/10 text-xs font-bold text-white outline-none focus:border-red-500"
                  />
                </div>
              </div>

              {/* Logo ou Fachada */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-300 uppercase pl-1">Logo ou Foto da Fachada da Empresa</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Cole o link da logo ou fachada..."
                    value={companyLogo}
                    onChange={(e) => setCompanyLogo(e.target.value)}
                    className="flex-1 h-11 px-3 rounded-xl bg-slate-900 border border-white/10 text-xs font-bold text-white outline-none focus:border-red-500"
                  />
                  <label className="h-11 px-4 rounded-xl bg-slate-900 border border-white/10 hover:bg-white/5 flex items-center justify-center text-xs font-bold cursor-pointer">
                    <Upload className="w-4 h-4 text-slate-300" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, "logo")}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* SEÇÃO 3: LINKS DE VENDAS ONLINE & REDES SOCIAIS */}
            <div className="bg-slate-950/60 p-4 sm:p-5 rounded-3xl border border-white/5 space-y-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-sky-400 block flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" /> Links para Compras Online e Perfis
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-300 uppercase pl-1 flex items-center gap-1">
                    <Globe className="w-3 h-3 text-sky-400" /> Site Oficial ou Loja Virtual
                  </label>
                  <input
                    type="url"
                    placeholder="https://seusite.com.br"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-slate-900 border border-white/10 text-xs font-bold text-white outline-none focus:border-sky-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-300 uppercase pl-1 flex items-center gap-1">
                    <ExternalLink className="w-3 h-3 text-emerald-400" /> Link Direto de Vendas / Checkout
                  </label>
                  <input
                    type="url"
                    placeholder="https://loja.com/produto/123"
                    value={salesLink}
                    onChange={(e) => setSalesLink(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-slate-900 border border-white/10 text-xs font-bold text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-300 uppercase pl-1 flex items-center gap-1">
                    <Instagram className="w-3 h-3 text-pink-400" /> Instagram
                  </label>
                  <input
                    type="text"
                    placeholder="@suaempresa"
                    value={instagramUrl}
                    onChange={(e) => setInstagramUrl(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-slate-900 border border-white/10 text-xs font-bold text-white outline-none focus:border-pink-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-300 uppercase pl-1 flex items-center gap-1">
                    <Facebook className="w-3 h-3 text-blue-400" /> Facebook
                  </label>
                  <input
                    type="text"
                    placeholder="facebook.com/empresa"
                    value={facebookUrl}
                    onChange={(e) => setFacebookUrl(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-slate-900 border border-white/10 text-xs font-bold text-white outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-300 uppercase pl-1">TikTok / Outros</label>
                  <input
                    type="text"
                    placeholder="@empresa_tiktok"
                    value={tiktokUrl}
                    onChange={(e) => setTiktokUrl(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-slate-900 border border-white/10 text-xs font-bold text-white outline-none focus:border-red-500"
                  />
                </div>
              </div>
            </div>

            {/* SEÇÃO 4: DADOS DO ANUNCIANTE (CONTATO) */}
            <div className="bg-slate-950/60 p-4 sm:p-5 rounded-3xl border border-white/5 space-y-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                📧 E-mail do Responsável para Confirmação
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="email"
                  required
                  placeholder="Seu e-mail de contato *"
                  value={advertiserEmail}
                  onChange={(e) => setAdvertiserEmail(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-slate-900 border border-white/10 text-xs font-bold text-white outline-none focus:border-red-500"
                />
                <input
                  type="text"
                  placeholder="Nome do responsável"
                  value={advertiserName}
                  onChange={(e) => setAdvertiserName(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-slate-900 border border-white/10 text-xs font-bold text-white outline-none focus:border-red-500"
                />
              </div>
            </div>

            {/* Botão de Avançar para Pagamento */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full h-14 bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black rounded-2xl text-xs uppercase tracking-widest transition-all shadow-xl shadow-red-500/20 active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Avançar para Pagamento (R$ {priceToPay.toFixed(2).replace(".", ",")})</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: TAXA & PAGAMENTO */}
        {step === 2 && (
          <div className="space-y-5 animate-fadeIn max-h-[70vh] overflow-y-auto pr-1 no-scrollbar text-left">
            <div className="bg-slate-950/70 border border-white/10 rounded-3xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                    Resumo do Pedido de Publicidade
                  </span>
                  <h3 className="text-base font-black text-white uppercase mt-0.5">
                    {title}
                  </h3>
                  <span className="text-xs text-slate-300">
                    {companyName} • {adType === "single_product" ? `${durationDays} dias no ar` : "7 dias contados"}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Valor da Taxa</span>
                  <span className="text-2xl font-black font-mono text-emerald-400 block">
                    R$ {priceToPay.toFixed(2).replace(".", ",")}
                  </span>
                </div>
              </div>

              {/* Informação sobre o Token / PIX Mercado Pago */}
              <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-black text-xs uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Pagamento Direto via PIX / Mercado Pago</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                  A taxa de <strong>R$ {priceToPay.toFixed(2).replace(".", ",")}</strong> cobre o custo de divulgação e posicionamento no topo do aplicativo. O pagamento vai diretamente para a administração do aplicativo.
                </p>
              </div>

              {/* QR Code PIX e Chave Copia e Cola */}
              <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4">
                <div className="w-32 h-32 bg-white rounded-xl p-2 shrink-0 flex items-center justify-center">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(pixCopyPasteCode)}`}
                    alt="QR Code PIX"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="space-y-2 flex-1 w-full text-center sm:text-left">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                    Chave PIX Celular da Denise (Administradora):
                  </span>
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-white/5 font-mono text-sm text-amber-300 font-black break-all select-all flex items-center justify-between">
                    <span>{ADMIN_MARKETING_PIX.displayKey}</span>
                    <span className="text-[9px] text-slate-400 font-bold uppercase bg-white/5 px-2 py-0.5 rounded">Celular</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-bold">
                    Beneficiário: {ADMIN_MARKETING_PIX.name}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(ADMIN_MARKETING_PIX.rawKey);
                      setCopiedPix(true);
                      setTimeout(() => setCopiedPix(false), 2000);
                      showNotification("Chave PIX (21) 96671-3263 copiada para a área de transferência!", "success");
                    }}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer w-full sm:w-auto"
                  >
                    {copiedPix ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedPix ? "Chave Copiada!" : "Copiar Chave PIX (Celular)"}</span>
                  </button>
                </div>
              </div>

              {/* Aviso da Denise sobre moderação */}
              <div className="bg-amber-950/20 border border-amber-500/30 rounded-2xl p-3.5 flex items-start gap-2.5 text-left">
                <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-slate-300 leading-normal">
                  <strong>Aviso Importante:</strong> Após a confirmação, o anúncio será enviado para a Administradora (<strong>denisejesus1988@gmail.com</strong>) para avaliação antes de ser publicado, garantindo a qualidade e segurança do aplicativo.
                </p>
              </div>
            </div>

            {/* Ações */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-5 h-12 bg-slate-800 hover:bg-slate-700 text-white font-black rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmSubmission}
                className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-600/20 active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <span>Enviando Anúncio...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirmar Pagamento & Enviar para Moderação</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: SUCESSO / AGUARDANDO MODERAÇÃO */}
        {step === 3 && (
          <div className="space-y-5 animate-fadeIn text-center py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-black text-white uppercase tracking-tight">
                Anúncio Enviado com Sucesso! 🚀
              </h3>
              <p className="text-xs text-slate-300 max-w-md mx-auto">
                Seu produto <strong>{createdAd?.title}</strong> foi cadastrado e está na fila de avaliação da Administradora <strong>denisejesus1988@gmail.com</strong>.
              </p>
            </div>

            <div className="bg-slate-950/70 p-4 rounded-2xl border border-white/5 max-w-md mx-auto text-left space-y-2 text-[11px] text-slate-300">
              <div className="flex justify-between border-b border-white/5 pb-1.5">
                <span className="text-slate-400">Tipo de Anúncio:</span>
                <span className="font-bold text-white uppercase">{createdAd?.type === "single_product" ? "1 Produto (R$ 20,00)" : "Encarte (R$ 39,90)"}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1.5">
                <span className="text-slate-400">Período de Divulgação:</span>
                <span className="font-bold text-amber-400">{createdAd?.durationDays} dias no ar após aprovado</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1.5">
                <span className="text-slate-400">Status Atual:</span>
                <span className="font-bold text-amber-400 uppercase">Aguardando Avaliação</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Expiração:</span>
                <span className="font-bold text-slate-300">Sumiço automático após o período</span>
              </div>
            </div>

            <div className="pt-3">
              <button
                type="button"
                onClick={onClose}
                className="px-8 h-12 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg active:scale-95 cursor-pointer"
              >
                Concluir & Fechar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
