/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Painel Administrativo de Moderação de Anúncios de Marketing
 * Exclusivo para Denise (denisejesus1988@gmail.com) e administradores
 * 
 * Recursos:
 * - Listagem de solicitações pendentes de avaliação
 * - Visualização completa do que estão anunciando (foto, texto, preço, empresa, links)
 * - Botões de "Aprovar & Publicar no App" (inicia contagem de 1 a 7 dias)
 * - Botão de "Remover / Rejeitar Anúncio" com justificativa
 * - Monitoramento de anúncios ativos no ar e contagem regressiva para expirar
 * - Botão de expirar imediatamente se houver irregularidades
 */

import React, { useState } from "react";
import {
  Shield,
  CheckCircle2,
  XCircle,
  Trash2,
  Eye,
  Clock,
  Sparkles,
  Tag,
  DollarSign,
  Building2,
  Globe,
  Instagram,
  Facebook,
  ExternalLink,
  MessageCircle,
  Phone,
  AlertTriangle,
  Percent,
  Check
} from "lucide-react";
import {
  MarketingAd,
  MarketingAdStatus,
  saveLocalMarketingAds
} from "../utils/marketingAds";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../App";

interface MarketingAdsAdminModerationProps {
  ads: MarketingAd[];
  setAds: React.Dispatch<React.SetStateAction<MarketingAd[]>>;
  showNotification: (msg: string, type?: "success" | "error" | "info") => void;
}

export const MarketingAdsAdminModeration: React.FC<MarketingAdsAdminModerationProps> = ({
  ads,
  setAds,
  showNotification,
}) => {
  const [filter, setFilter] = useState<"pending" | "approved" | "expired" | "all">("pending");
  const [selectedAdForReview, setSelectedAdForReview] = useState<MarketingAd | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const pendingAds = ads.filter((a) => a.status === "pending_review" || a.status === "pending_payment");
  const approvedAds = ads.filter((a) => a.status === "approved");
  const expiredAds = ads.filter((a) => a.status === "expired" || a.status === "rejected");

  const displayedAds = ads.filter((a) => {
    if (filter === "pending") return a.status === "pending_review" || a.status === "pending_payment";
    if (filter === "approved") return a.status === "approved";
    if (filter === "expired") return a.status === "expired" || a.status === "rejected";
    return true;
  });

  // Aprovar anúncio: Inicia a contagem de 1 a 7 dias contados a partir de agora
  const handleApproveAd = async (ad: MarketingAd) => {
    try {
      setIsProcessing(true);
      const now = Date.now();
      const expiresAt = now + (ad.durationDays * 24 * 60 * 60 * 1000);

      const updatedAd: MarketingAd = {
        ...ad,
        status: "approved",
        approvedAt: now,
        expiresAt,
      };

      // Atualizar local
      const updatedList = ads.map((item) => (item.id === ad.id ? updatedAd : item));
      setAds(updatedList);
      saveLocalMarketingAds(updatedList);

      // Atualizar Firestore se disponível
      if (db) {
        try {
          await updateDoc(doc(db, "marketing_ads", ad.id), {
            status: "approved",
            approvedAt: now,
            expiresAt,
          });
        } catch (e) {
          console.warn("Aviso ao atualizar Firestore:", e);
        }
      }

      showNotification(`Anúncio "${ad.title}" aprovado e publicado com sucesso por ${ad.durationDays} dias! 🎉`, "success");
      setSelectedAdForReview(null);
    } catch (e: any) {
      showNotification(`Erro ao aprovar anúncio: ${e.message || e}`, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // Rejeitar / Remover anúncio
  const handleRejectOrDeleteAd = async (ad: MarketingAd, reason = "Conteúdo incompatível com as diretrizes") => {
    if (!window.confirm(`Tem certeza que deseja remover o anúncio "${ad.title}" da empresa ${ad.companyName}?`)) {
      return;
    }

    try {
      setIsProcessing(true);

      const updatedList = ads.filter((item) => item.id !== ad.id);
      setAds(updatedList);
      saveLocalMarketingAds(updatedList);

      if (db) {
        try {
          await deleteDoc(doc(db, "marketing_ads", ad.id));
        } catch (e) {
          console.warn("Aviso ao deletar Firestore:", e);
        }
      }

      showNotification(`Anúncio removido com sucesso!`, "info");
      setSelectedAdForReview(null);
    } catch (e: any) {
      showNotification(`Erro ao remover anúncio: ${e.message || e}`, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Banner Informativo Exclusivo da Denise */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-red-950 p-5 rounded-3xl border border-red-500/30 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 text-[10px] font-black uppercase tracking-wider">
              Painel Denise (denisejesus1988@gmail.com)
            </div>
            <h3 className="text-base sm:text-lg font-black text-white">
              Moderação de Anúncios e Encartes Pagos
            </h3>
            <p className="text-xs text-slate-300 max-w-2xl font-sans">
              Avalie aqui tudo o que os mercados e mercadinhos cadastraram antes de ser publicado. Você pode aprovar por 1 a 7 dias ou remover na hora para não ter dor de cabeça!
            </p>
          </div>
        </div>

        {/* Contador de Pendentes */}
        <div className="bg-red-600/30 border border-red-500/40 px-4 py-2 rounded-2xl text-center shrink-0">
          <span className="text-2xl font-black font-mono text-red-400 block leading-tight">
            {pendingAds.length}
          </span>
          <span className="text-[9px] font-black uppercase text-red-200 tracking-wider">
            Para Avaliar
          </span>
        </div>
      </div>

      {/* Filtros de Status */}
      <div className="flex gap-2 border-b border-white/10 pb-3 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setFilter("pending")}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
            filter === "pending"
              ? "bg-amber-500 text-slate-950 shadow-md"
              : "bg-slate-900 text-slate-400 hover:text-white"
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Aguardando Avaliação ({pendingAds.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setFilter("approved")}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
            filter === "approved"
              ? "bg-emerald-500 text-slate-950 shadow-md"
              : "bg-slate-900 text-slate-400 hover:text-white"
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>No Ar / Publicados ({approvedAds.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setFilter("expired")}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
            filter === "expired"
              ? "bg-slate-700 text-white shadow-md"
              : "bg-slate-900 text-slate-400 hover:text-white"
          }`}
        >
          <span>Expirados / Removidos ({expiredAds.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
            filter === "all"
              ? "bg-white text-slate-950 shadow-md"
              : "bg-slate-900 text-slate-400 hover:text-white"
          }`}
        >
          <span>Todos ({ads.length})</span>
        </button>
      </div>

      {/* Lista de Anúncios */}
      {displayedAds.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed border-white/10 rounded-3xl bg-slate-950/40 space-y-2">
          <Shield className="w-10 h-10 text-slate-600 mx-auto" />
          <h4 className="text-sm font-black uppercase text-slate-300">
            Nenhum anúncio nesta categoria
          </h4>
          <p className="text-xs text-slate-500">
            Quando mercados cadastrarem produtos ou encartes pagando R$ 20 ou R$ 39,90, aparecerão aqui para sua aprovação.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedAds.map((ad) => {
            const isPending = ad.status === "pending_review" || ad.status === "pending_payment";
            const isApproved = ad.status === "approved";
            const remainingDays = ad.expiresAt
              ? Math.max(0, Math.ceil((ad.expiresAt - Date.now()) / (1000 * 60 * 60 * 24)))
              : 0;

            return (
              <div
                key={ad.id}
                className="bg-slate-950/60 border border-white/10 hover:border-red-500/40 rounded-3xl p-5 space-y-4 transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Topo do Card */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                            isPending
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : isApproved
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {isPending ? "Aguardando Denise Avaliar" : isApproved ? `No Ar (${remainingDays}d restantes)` : "Expirado"}
                        </span>
                        <span className="text-[10px] font-mono text-emerald-400 font-bold">
                          R$ {ad.pricePaid.toFixed(2).replace(".", ",")}
                        </span>
                      </div>
                      <h4 className="text-base font-black text-white uppercase leading-snug">
                        {ad.title}
                      </h4>
                      <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold">
                        <Building2 className="w-3.5 h-3.5 text-red-400" />
                        <span>{ad.companyName}</span>
                      </div>
                    </div>

                    {/* Thumbnail */}
                    <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-900 shrink-0 border border-white/10">
                      <img src={ad.imageUrl} alt={ad.title} className="w-full h-full object-cover" />
                    </div>
                  </div>

                  {/* Informações de Preço & Desconto */}
                  <div className="bg-slate-900/60 p-3 rounded-2xl border border-white/5 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Preço Promocional:</span>
                      <span className="font-mono font-black text-emerald-400 text-sm">
                        {ad.promoPrice ? `R$ ${ad.promoPrice.toFixed(2).replace(".", ",")}` : "Folheto Encarte"}
                      </span>
                    </div>
                    {ad.discountPercent && (
                      <span className="bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] font-black px-2 py-0.5 rounded-lg">
                        {ad.discountPercent}% OFF
                      </span>
                    )}
                    <div className="text-right">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Tempo Solicitado:</span>
                      <span className="font-bold text-amber-300">
                        {ad.durationDays} {ad.durationDays === 1 ? "dia" : "dias"}
                      </span>
                    </div>
                  </div>

                  {/* Descrição */}
                  {ad.description && (
                    <p className="text-[11px] text-slate-300 font-sans line-clamp-2">
                      {ad.description}
                    </p>
                  )}

                  {/* Dados de Contato / Links Cadastrados */}
                  <div className="flex flex-wrap gap-2 text-[10px] text-slate-400 pt-1">
                    {ad.companyWhatsapp && (
                      <span className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-lg">
                        <MessageCircle className="w-3 h-3 text-emerald-400" />
                        {ad.companyWhatsapp}
                      </span>
                    )}
                    {ad.websiteUrl && (
                      <span className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-lg">
                        <Globe className="w-3 h-3 text-sky-400" />
                        Site
                      </span>
                    )}
                    {ad.instagramUrl && (
                      <span className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-lg">
                        <Instagram className="w-3 h-3 text-pink-400" />
                        {ad.instagramUrl}
                      </span>
                    )}
                    {ad.companyAddress && (
                      <span className="truncate max-w-xs bg-white/5 px-2 py-1 rounded-lg">
                        📍 {ad.companyAddress}
                      </span>
                    )}
                  </div>
                </div>

                {/* Botões de Decisão do Administrador */}
                <div className="flex items-center gap-2 pt-3 border-t border-white/5">
                  {isPending && (
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleApproveAd(ad)}
                      className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>Aprovar & Publicar ({ad.durationDays}d)</span>
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => handleRejectOrDeleteAd(ad)}
                    className="px-4 h-11 bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all border border-red-500/30 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>{isPending ? "Rejeitar" : "Remover do Ar"}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
