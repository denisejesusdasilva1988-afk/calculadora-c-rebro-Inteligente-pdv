/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Gerenciamento Centralizado dos Dados da Empresa & Contatos da Notinha
 * Garante que os dados nunca sumam e permite selecionar exatamente o que sai impresso.
 */

export interface CompanyProfile {
  name: string;
  cnpjCpf: string;
  ownerName?: string;
  ownerCpf?: string;
  pixKey?: string;
  logoUrl?: string;
  phone: string;
  whatsapp: string;
  instagram: string;
  facebook: string;
  website: string;
  email: string;
  address: string;
  
  // Opções de impressão na notinha / cupom (Sim ou Não)
  showNameOnReceipt: boolean;
  showCnpjOnReceipt: boolean;
  showPhoneOnReceipt: boolean;
  showWhatsappOnReceipt: boolean;
  showInstagramOnReceipt: boolean;
  showFacebookOnReceipt: boolean;
  showWebsiteOnReceipt: boolean;
  showEmailOnReceipt: boolean;
  showAddressOnReceipt: boolean;
}

export const DEFAULT_COMPANY_PROFILE: CompanyProfile = {
  name: "",
  cnpjCpf: "",
  ownerName: "",
  ownerCpf: "",
  pixKey: "",
  logoUrl: "",
  phone: "",
  whatsapp: "",
  instagram: "",
  facebook: "",
  website: "",
  email: "",
  address: "",
  
  showNameOnReceipt: true,
  showCnpjOnReceipt: true,
  showPhoneOnReceipt: true,
  showWhatsappOnReceipt: true,
  showInstagramOnReceipt: true,
  showFacebookOnReceipt: false,
  showWebsiteOnReceipt: true,
  showEmailOnReceipt: false,
  showAddressOnReceipt: true,
};

export function getCompanyStorageKey(userId?: string | null): string {
  if (userId && userId !== "guest_visitor") {
    return `pdv_company_profile_user_${userId}`;
  }
  return "pdv_company_profile";
}

export function loadCompanyProfile(userId?: string | null): CompanyProfile {
  try {
    const key = getCompanyStorageKey(userId);
    const saved = localStorage.getItem(key) || localStorage.getItem("pdv_company_profile");
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...DEFAULT_COMPANY_PROFILE,
        ...parsed,
        // Fallbacks para campos clássicos caso tenham sido salvos separadamente
        name: parsed.name || localStorage.getItem("pdv_store_name") || "",
        cnpjCpf: parsed.cnpjCpf || localStorage.getItem("pdv_store_cnpj_cpf") || "",
        ownerName: parsed.ownerName || localStorage.getItem("pdv_owner_name") || "",
        ownerCpf: parsed.ownerCpf || parsed.cnpjCpf || localStorage.getItem("pdv_owner_cpf") || localStorage.getItem("pdv_store_cnpj_cpf") || "",
        pixKey: parsed.pixKey || localStorage.getItem("pdv_pix_key") || "21966713263",
        logoUrl: parsed.logoUrl || localStorage.getItem("pdv_company_logo") || "",
        phone: parsed.phone || localStorage.getItem("pdv_store_phone") || "",
        whatsapp: parsed.whatsapp || localStorage.getItem("pdv_store_whatsapp") || "",
        address: parsed.address || localStorage.getItem("pdv_store_address") || "",
      };
    }
  } catch (e) {
    console.warn("Erro ao ler company profile:", e);
  }

  // Fallbacks de chaves legadas se não houver JSON completo
  return {
    ...DEFAULT_COMPANY_PROFILE,
    name: localStorage.getItem("pdv_store_name") || "",
    cnpjCpf: localStorage.getItem("pdv_store_cnpj_cpf") || "",
    ownerName: localStorage.getItem("pdv_owner_name") || "",
    ownerCpf: localStorage.getItem("pdv_owner_cpf") || localStorage.getItem("pdv_store_cnpj_cpf") || "",
    pixKey: localStorage.getItem("pdv_pix_key") || "21966713263",
    logoUrl: localStorage.getItem("pdv_company_logo") || "",
    phone: localStorage.getItem("pdv_store_phone") || "",
    whatsapp: localStorage.getItem("pdv_store_whatsapp") || "",
    address: localStorage.getItem("pdv_store_address") || "",
  };
}

export function saveCompanyProfile(profile: CompanyProfile, userId?: string | null): void {
  try {
    const key = getCompanyStorageKey(userId);
    const jsonStr = JSON.stringify(profile);
    localStorage.setItem(key, jsonStr);
    // Salvar também na chave global padrão para compatibilidade
    localStorage.setItem("pdv_company_profile", jsonStr);
    
    // Atualizar chaves individuais para retrocompatibilidade
    if (profile.name) localStorage.setItem("pdv_store_name", profile.name);
    if (profile.cnpjCpf) localStorage.setItem("pdv_store_cnpj_cpf", profile.cnpjCpf);
    if (profile.ownerName) localStorage.setItem("pdv_owner_name", profile.ownerName);
    if (profile.ownerCpf) localStorage.setItem("pdv_owner_cpf", profile.ownerCpf);
    if (profile.pixKey) localStorage.setItem("pdv_pix_key", profile.pixKey);
    if (profile.logoUrl !== undefined) localStorage.setItem("pdv_company_logo", profile.logoUrl || "");
    if (profile.phone) localStorage.setItem("pdv_store_phone", profile.phone);
    if (profile.whatsapp) localStorage.setItem("pdv_store_whatsapp", profile.whatsapp);
    if (profile.address) localStorage.setItem("pdv_store_address", profile.address);
    if (profile.email) localStorage.setItem("pdv_store_email", profile.email);
    if (profile.instagram) localStorage.setItem("pdv_store_instagram", profile.instagram);
    if (profile.facebook) localStorage.setItem("pdv_store_facebook", profile.facebook);
    if (profile.website) localStorage.setItem("pdv_store_website", profile.website);

    // Disparar evento para atualizar toda a interface instantaneamente
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("pdv_company_profile_changed", { detail: profile }));
    }
  } catch (e) {
    console.warn("Erro ao salvar company profile:", e);
  }
}
