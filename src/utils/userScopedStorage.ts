/**
 * Isolamento Multi-Tenant e Armazenamento Seguro por Conta e Usuário
 * Garante que dados de uma empresa/e-mail NUNCA se misturem com outra empresa.
 * Cumpre as diretrizes da LGPD e regras de privacidade empresarial.
 */

export function getScopedStorageKey(rawKey: string, userId?: string | null): string {
  if (!rawKey) return "";
  // Se a chave já possui sufixo de usuário ou visitante, não duplica
  if (rawKey.includes("_user_") || rawKey.endsWith("_guest")) {
    return rawKey;
  }
  const cleanUid = userId && userId !== "guest_visitor" ? userId.trim() : "guest";
  return `${rawKey}_user_${cleanUid}`;
}

export function getScopedItem(rawKey: string, userId?: string | null): string | null {
  try {
    const scopedKey = getScopedStorageKey(rawKey, userId);
    return localStorage.getItem(scopedKey);
  } catch (e) {
    console.warn(`[Storage] Erro ao ler chave escopada ${rawKey}:`, e);
    return null;
  }
}

export function setScopedItem(rawKey: string, value: string, userId?: string | null): void {
  try {
    const scopedKey = getScopedStorageKey(rawKey, userId);
    localStorage.setItem(scopedKey, value);
  } catch (e) {
    console.warn(`[Storage] Erro ao gravar chave escopada ${rawKey}:`, e);
  }
}

export function removeScopedItem(rawKey: string, userId?: string | null): void {
  try {
    const scopedKey = getScopedStorageKey(rawKey, userId);
    localStorage.removeItem(scopedKey);
  } catch (e) {
    console.warn(`[Storage] Erro ao remover chave escopada ${rawKey}:`, e);
  }
}

/**
 * Remove chaves globais legadas desprovidas de escopo de usuário
 * para evitar que o próximo usuário/empresa no mesmo navegador
 * carregue dados da sessão anterior.
 */
export function clearLegacyUnscopedData(): void {
  const legacyKeys = [
    "pdv_custom_products",
    "pdv_product_stock_data",
    "pdv_transactions",
    "pdv_initial_cash",
    "pdv_is_cash_register_open",
    "pdv_selected_segment",
    "pdv_custom_niches",
    "pdv_product_overrides",
    "pdv_owner_pin",
    "pdv_security_active",
    "pdv_staff_pins",
    "pdv_permissions",
    "pdv_raw_materials",
    "pdv_product_recipes",
    "pdv_delivery_orders",
    "pdv_client_profiles",
    "pdv_orcamentos_list",
    "pdv_reconciliation_logs",
    "pdv_active_cart_slot",
    "pdv_cart_slot_1",
    "pdv_cart_slot_2",
    "pdv_current_cart",
    "pdv_store_name",
    "pdv_store_cnpj_cpf",
    "pdv_store_owner_rg",
    "pdv_store_custom_name",
    "pdv_store_custom_phone",
    "pdv_store_custom_address",
    "pdv_store_custom_cnpj",
    "custom_catalog_products",
    "pdv_niche_locked",
    "pdv_surcharge_client_for_fees",
    "pdv_allow_retroactive_sales",
    "pdv_receipt_footer_msg",
    "pdv_fundo_troco",
    "pdv_today_cash_sales",
    "pdv_clientes_fieis",
    "pdv_ficha_tecnica_recipes",
    "pdv_owner_mode",
    "pdv_gestao_user_role",
    "pdv_gestao_user_staff_name"
  ];

  legacyKeys.forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch {}
  });
}
