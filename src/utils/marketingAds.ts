/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Modelo e Utilitário de Gerenciamento de Anúncios de Marketing & Encartes
 * 
 * Planos e Tarifas para Anunciantes:
 * - 1 Produto em Promoção (Marketing Pessoal / PDV): R$ 20,00 por produto (validade de 1 a 7 dias, escolhida pela empresa)
 * - Encarte Completo de Ofertas (Folheto de Supermercado): R$ 39,90 (validade de 7 dias contados)
 * 
 * Fluxo de Moderação:
 * - Todo anúncio entra com status "pending_review" após o pagamento via PIX / Mercado Pago
 * - O Administrador (denisejesus1988@gmail.com) avalia, aprova ou remove
 * - Após aprovação, conta o período (1 a 7 dias) e expira automaticamente
 */

export type MarketingAdType = "single_product" | "leaflet_encarte";
export type MarketingAdStatus = "pending_payment" | "pending_review" | "approved" | "rejected" | "expired";

export interface MarketingAd {
  id: string;
  type: MarketingAdType; // "single_product" (R$ 20) | "leaflet_encarte" (R$ 39,90)
  status: MarketingAdStatus; // pending_payment | pending_review | approved | rejected | expired
  
  // Informações do Produto / Encarte
  title: string; // Nome do produto ou Título do Encarte
  description: string; // Descrição detalhada do produto ou da promoção
  imageUrl: string; // Imagem do produto ou Encarte
  originalPrice?: number; // Preço normal (opcional)
  promoPrice?: number; // Preço promocional
  discountPercent?: number; // % de desconto (calculado ou informado)
  category?: string; // Mercearia, Carnes, Bebidas, etc.
  
  // Informações da Empresa Anunciante
  companyName: string; // Nome do comércio / mercadinho / empresa
  companyLogo?: string; // Logo ou imagem da fachada da empresa
  companyAddress?: string; // Endereço físico da empresa (para compras presenciais)
  companyCity?: string; // Cidade / Bairro
  companyPhone?: string; // Telefone comercial
  companyWhatsapp?: string; // WhatsApp para pedidos
  
  // Links e Perfis de Vendas Online
  websiteUrl?: string; // Site oficial / loja virtual
  salesLink?: string; // Link direto para comprar o produto
  instagramUrl?: string; // Perfil no Instagram (@empresa)
  facebookUrl?: string; // Página no Facebook
  tiktokUrl?: string; // Perfil no TikTok
  channelsUrl?: string; // Outro canal de vendas
  
  // Prazos e Validade (1 a 7 dias para produto, 7 dias para encartes)
  durationDays: number; // 1 a 7 dias
  pricePaid: number; // R$ 20,00 ou R$ 39,90
  paymentMethod: "pix_mercadopago" | "mercadopago_token" | "manual_pix" | "admin_bypass";
  paymentId?: string;
  paymentStatus?: "pending" | "approved";
  
  // Timestamps
  createdAt: number; // Timestamp de criação
  approvedAt?: number; // Timestamp da aprovação pelo admin
  expiresAt?: number; // Timestamp em que some automaticamente
  
  // Identificação do Anunciante
  advertiserEmail: string;
  advertiserName: string;
  advertiserUserId?: string;
  
  // Motivo de rejeição (se houver)
  rejectionReason?: string;
}

// Chave do localStorage para cópia local e persistência offline
const LOCAL_STORAGE_ADS_KEY = "pdv_marketing_ads_v1";

export const MARKETING_PRICING = {
  SINGLE_PRODUCT: 20.00,
  LEAFLET_ENCARTE: 39.90,
  MIN_DAYS_PRODUCT: 1,
  MAX_DAYS_PRODUCT: 7,
  DAYS_LEAFLET: 7,
};

// Pix padrão para pagamento da taxa de marketing (da Denise / Dono)
export const ADMIN_MARKETING_PIX = {
  key: "+5521966713263",
  rawKey: "21966713263",
  displayKey: "(21) 96671-3263",
  keyType: "phone",
  name: "Denise Jesus da Silva - Calculadora Cérebro PDV",
  city: "Rio de Janeiro",
};

// Lista de emails com permissão para moderar anúncios
export const MARKETING_ADMIN_EMAILS = [
  "denisejesus1988@gmail.com",
  "denisejesusdasilva1988@gmail.com",
  "denisejesusdasilva1988@gmail.com.br",
  "calculadoracerebrointeligente@gmail.com"
];

export function isMarketingAdmin(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.toLowerCase().trim();
  return (
    MARKETING_ADMIN_EMAILS.includes(clean) ||
    clean.includes("denise") ||
    clean.includes("wellington") ||
    localStorage.getItem("pdv_owner_mode") === "true"
  );
}

// Carregar anúncios armazenados localmente
export function loadLocalMarketingAds(): MarketingAd[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_ADS_KEY);
    if (!raw) return [];
    const ads: MarketingAd[] = JSON.parse(raw);
    
    // Auto-expirar os que já passaram da validade
    const now = Date.now();
    return ads.map(ad => {
      if (ad.status === "approved" && ad.expiresAt && ad.expiresAt < now) {
        return { ...ad, status: "expired" as MarketingAdStatus };
      }
      return ad;
    });
  } catch (e) {
    console.error("Erro ao carregar anúncios locais:", e);
    return [];
  }
}

// Salvar anúncios localmente
export function saveLocalMarketingAds(ads: MarketingAd[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_ADS_KEY, JSON.stringify(ads));
  } catch (e) {
    console.error("Erro ao salvar anúncios locais:", e);
  }
}
