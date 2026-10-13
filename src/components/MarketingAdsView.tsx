/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Componentes de Visualização de Anúncios de Marketing
 * - MarketingAdsCarousel: Carrossel / Banner de Destaque no topo do Mural de Ofertas
 * - MarketingAdCard: Card com foto do produto, selo de desconto %, preço, empresa, contatos e links
 * - MarketingAdDetailModal: Modal detalhado ao tocar no produto ou encarte
 */

import React, { useState } from "react";
import {
  Tag,
  ShoppingBag,
  Percent,
  MapPin,
  Phone,
  MessageCircle,
  Globe,
  Instagram,
  Facebook,
  ExternalLink,
  Clock,
  Sparkles,
  Flame,
  Building2,
  ChevronRight,
  X,
  Share2
} from "lucide-react";
import { MarketingAd } from "../utils/marketingAds";

interface MarketingAdsCarouselProps {
  ads: MarketingAd[];
  onOpenAd: (ad: MarketingAd) => void;
  onOpenNewAdModal: () => void;
}

export const MarketingAdsCarousel: React.FC<MarketingAdsCarouselProps> = ({
  ads,
  onOpenAd,
  onOpenNewAdModal,
}) => {
  const activeAds = ads.filter((a) => a.status === "approved");

  return (
    <div className="space-y-4">
      {/* Banner Principal Promocional de Chamada para Novos Anunciantes */}
      <div className="bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white rounded-3xl p-5 shadow-xl shadow-red-500/20 flex flex-col md:flex-row items-center justify-between gap-4 border border-white/20">
        <div className="space-y-1.5 text-center md:text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-[10px] font-black uppercase tracking-wider backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Anuncie Aqui por Apenas R$ 20,00!
          </div>
          <h3 className="text-base sm:text-lg font-black tracking-tight">
            Quer Anunciar 1 Produto em Promoção no Aplicativo Calculadora Cérebro PDV?
          </h3>
          <p className="text-xs text-white/90 max-w-xl leading-relaxed">
            Por apenas <strong>R$ 20,00</strong> você mesmo cadastra seu produto de marketing pessoal ou por <strong>R$ 39,90</strong> o encarte semanal completo do seu mercado! Milhares de clientes verão para compras presenciais ou online.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-center">
          <button
            type="button"
            onClick={onOpenNewAdModal}
            className="px-5 py-3 rounded-2xl bg-white text-slate-950 hover:bg-slate-100 font-black text-xs uppercase tracking-wider shadow-lg transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-red-600" />
            <span>Anunciar Produto (R$ 20,00)</span>
          </button>
        </div>
      </div>

      {/* Grid de Produtos e Promoções de Marketing Aprovadas */}
      {activeAds.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-red-500/20 text-red-500">
                <Flame className="w-4 h-4" />
              </span>
              <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider">
                🔥 Promoções Patrocinadas em Destaque no Bairro
              </h4>
            </div>
            <span className="text-[10px] font-bold text-slate-400">
              {activeAds.length} {activeAds.length === 1 ? "anúncio ativo" : "anúncios ativos"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {activeAds.map((ad) => (
              <MarketingAdCard key={ad.id} ad={ad} onClick={() => onOpenAd(ad)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const MarketingAdCard: React.FC<{ ad: MarketingAd; onClick: () => void }> = ({ ad, onClick }) => {
  const remainingDays = ad.expiresAt
    ? Math.max(0, Math.ceil((ad.expiresAt - Date.now()) / (1000 * 60 * 60 * 24)))
    : ad.durationDays;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-3xl overflow-hidden border-2 border-slate-200 hover:border-red-500 shadow-md hover:shadow-xl transition-all cursor-pointer flex flex-col group active:scale-[0.99] text-left relative"
    >
      {/* Badge de Desconto / Tipo */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
        {ad.discountPercent ? (
          <span className="bg-red-600 text-white font-black text-[10px] px-2.5 py-1 rounded-full uppercase shadow-md flex items-center gap-1">
            <Percent className="w-3 h-3" />
            {ad.discountPercent}% OFF
          </span>
        ) : (
          <span className="bg-amber-500 text-slate-950 font-black text-[10px] px-2.5 py-1 rounded-full uppercase shadow-md">
            Promoção
          </span>
        )}
      </div>

      {/* Duração Restante */}
      <div className="absolute top-3 right-3 z-10">
        <span className="bg-slate-950/80 backdrop-blur-md text-white font-bold text-[9px] px-2.5 py-1 rounded-full flex items-center gap-1">
          <Clock className="w-3 h-3 text-amber-400" />
          {remainingDays > 0 ? `${remainingDays}d restantes` : "Hoje"}
        </span>
      </div>

      {/* Imagem do Produto / Encarte */}
      <div className="aspect-[4/3] w-full bg-slate-100 relative overflow-hidden flex items-center justify-center">
        <img
          src={ad.imageUrl}
          alt={ad.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="bg-white text-slate-900 px-4 py-1.5 rounded-full font-black text-[10px] uppercase shadow-lg">
            Ver Detalhes & Contato 🔍
          </span>
        </div>
      </div>

      {/* Informações */}
      <div className="p-4 flex flex-col justify-between flex-1 space-y-3">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-bold uppercase tracking-wider truncate">
            <Building2 className="w-3 h-3 text-red-500 shrink-0" />
            <span className="truncate">{ad.companyName}</span>
          </div>

          <h5 className="font-black text-slate-900 text-sm sm:text-base uppercase tracking-tight leading-snug line-clamp-2">
            {ad.title}
          </h5>

          {ad.description && (
            <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
              {ad.description}
            </p>
          )}
        </div>

        {/* Preço e Botão de Ação */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
          <div>
            {ad.originalPrice && ad.originalPrice > (ad.promoPrice || 0) && (
              <span className="text-[10px] text-slate-400 line-through font-mono block">
                R$ {ad.originalPrice.toFixed(2).replace(".", ",")}
              </span>
            )}
            {ad.promoPrice !== undefined ? (
              <span className="text-lg sm:text-xl font-black font-mono text-emerald-600 block leading-tight">
                R$ {ad.promoPrice.toFixed(2).replace(".", ",")}
              </span>
            ) : (
              <span className="text-xs font-black text-amber-600 uppercase">
                Consulte Preço
              </span>
            )}
          </div>

          <div className="p-2 rounded-xl bg-red-50 text-red-600 group-hover:bg-red-600 group-hover:text-white transition-all">
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
};

export const MarketingAdDetailModal: React.FC<{
  ad: MarketingAd | null;
  onClose: () => void;
}> = ({ ad, onClose }) => {
  if (!ad) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-[2.5rem] max-w-lg w-full p-5 sm:p-6 shadow-2xl text-left my-auto relative space-y-5 max-h-[90vh] overflow-y-auto no-scrollbar">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-red-600 font-black text-[10px] uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Promoção Patrocinada</span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 uppercase">
              {ad.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Imagem do Produto / Encarte */}
        <div className="aspect-[4/3] w-full rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
          <img src={ad.imageUrl} alt={ad.title} className="w-full h-full object-cover" />
        </div>

        {/* Preço e Desconto */}
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-emerald-700 uppercase block">
              Preço Promocional
            </span>
            <div className="flex items-baseline gap-2">
              {ad.promoPrice !== undefined ? (
                <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-800">
                  R$ {ad.promoPrice.toFixed(2).replace(".", ",")}
                </span>
              ) : (
                <span className="text-base font-black text-emerald-800">Oferta Especial</span>
              )}
              {ad.originalPrice && (
                <span className="text-xs text-slate-400 line-through font-mono">
                  R$ {ad.originalPrice.toFixed(2).replace(".", ",")}
                </span>
              )}
            </div>
          </div>
          {ad.discountPercent && (
            <span className="bg-red-600 text-white font-black text-xs px-3 py-1.5 rounded-xl uppercase">
              {ad.discountPercent}% OFF
            </span>
          )}
        </div>

        {/* Descrição */}
        {ad.description && (
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
              Sobre a Oferta:
            </span>
            <p className="text-xs text-slate-700 leading-relaxed font-sans bg-slate-50 p-3 rounded-xl border border-slate-200">
              {ad.description}
            </p>
          </div>
        )}

        {/* Dados da Empresa / Onde Comprar */}
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3">
          <div className="flex items-center gap-3">
            {ad.companyLogo ? (
              <img src={ad.companyLogo} alt={ad.companyName} className="w-10 h-10 rounded-xl object-cover border border-slate-300" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-600 flex items-center justify-center font-black">
                <Building2 className="w-5 h-5" />
              </div>
            )}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Empresa Anunciante</span>
              <h5 className="font-black text-slate-900 text-sm uppercase">{ad.companyName}</h5>
            </div>
          </div>

          {ad.companyAddress && (
            <div className="flex items-start gap-2 text-xs text-slate-600 pt-2 border-t border-slate-200">
              <MapPin className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{ad.companyAddress}</span>
            </div>
          )}
        </div>

        {/* Botões de Ação: WhatsApp, Site, Redes Sociais */}
        <div className="space-y-2 pt-1">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
            Comprar Pessoalmente ou Online:
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ad.companyWhatsapp && (
              <a
                href={`https://wa.me/55${ad.companyWhatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá! Vi o produto "${ad.title}" anunciado no aplicativo Calculadora Cérebro PDV e gostaria de saber mais informações/comprar!`)}`}
                target="_blank"
                rel="noreferrer"
                className="p-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase flex items-center justify-center gap-2 shadow-md transition-all"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Pedir no WhatsApp</span>
              </a>
            )}

            {ad.salesLink && (
              <a
                href={ad.salesLink}
                target="_blank"
                rel="noreferrer"
                className="p-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase flex items-center justify-center gap-2 shadow-md transition-all"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Comprar no Site</span>
              </a>
            )}

            {ad.websiteUrl && !ad.salesLink && (
              <a
                href={ad.websiteUrl}
                target="_blank"
                rel="noreferrer"
                className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase flex items-center justify-center gap-2 shadow-md transition-all"
              >
                <Globe className="w-4 h-4" />
                <span>Visitar Site Oficial</span>
              </a>
            )}

            {ad.instagramUrl && (
              <a
                href={`https://instagram.com/${ad.instagramUrl.replace("@", "")}`}
                target="_blank"
                rel="noreferrer"
                className="p-3 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 text-white font-black text-xs uppercase flex items-center justify-center gap-2 shadow-md transition-all"
              >
                <Instagram className="w-4 h-4" />
                <span>Instagram</span>
              </a>
            )}

            {ad.companyPhone && (
              <a
                href={`tel:${ad.companyPhone.replace(/\D/g, "")}`}
                className="p-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-xs uppercase flex items-center justify-center gap-2 transition-all"
              >
                <Phone className="w-4 h-4" />
                <span>Ligar para Empresa</span>
              </a>
            )}
          </div>
        </div>

        {/* Fechar */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase rounded-xl transition-all cursor-pointer"
        >
          Fechar Detalhes
        </button>
      </div>
    </div>
  );
};
