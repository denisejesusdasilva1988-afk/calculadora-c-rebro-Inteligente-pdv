import { PDVTransaction } from "../components/PDVModule";
import { loadCompanyProfile } from "./companyProfile";

export interface PrinterConfig {
  printerType: "58mm" | "80mm" | "A4";
  miniPrintPocketMode?: boolean;
  feedLines: number; // 2, 4, 6, 8
  fontSize: "pequena" | "media" | "grande";
  highContrast: boolean;
  autoCut: boolean;
  openDrawer: boolean;
  printTwoCopies: boolean;
  showQrCode: boolean;
  autoPrintOnSale: boolean;
  storeName: string;
  storeCnpjCpf: string;
  storePhone?: string;
  storeAddress?: string;
  storeWhatsapp?: string;
  storeInstagram?: string;
  storeFacebook?: string;
  storeWebsite?: string;
  storeEmail?: string;
  receiptFooterMsg: string;

  // Opções de exibição de dados da empresa na notinha (Sim / Não)
  showNameOnReceipt?: boolean;
  showCnpjOnReceipt?: boolean;
  showPhoneOnReceipt?: boolean;
  showWhatsappOnReceipt?: boolean;
  showInstagramOnReceipt?: boolean;
  showFacebookOnReceipt?: boolean;
  showWebsiteOnReceipt?: boolean;
  showEmailOnReceipt?: boolean;
  showAddressOnReceipt?: boolean;
}

export const DEFAULT_PRINTER_CONFIG: PrinterConfig = {
  printerType: "80mm",
  miniPrintPocketMode: false,
  feedLines: 4,
  fontSize: "media",
  highContrast: true,
  autoCut: true,
  openDrawer: true,
  printTwoCopies: false,
  showQrCode: true,
  autoPrintOnSale: false,
  storeName: "",
  storeCnpjCpf: "",
  storePhone: "",
  storeAddress: "",
  storeWhatsapp: "",
  storeInstagram: "",
  storeFacebook: "",
  storeWebsite: "",
  storeEmail: "",
  receiptFooterMsg: "Obrigado pela preferência! Volte sempre! 🛒✨",
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

export function loadPrinterConfig(): PrinterConfig {
  const company = loadCompanyProfile();

  try {
    const saved = localStorage.getItem("pdv_printer_full_config");
    if (saved) {
      const parsed = JSON.parse(saved);
      const resolvedType: "58mm" | "80mm" | "A4" = parsed.printerType === "58mm" || parsed.printerType === "80mm" || parsed.printerType === "A4"
        ? parsed.printerType
        : ((localStorage.getItem("pdv_printer_type") as any) || "80mm");
      return {
        ...DEFAULT_PRINTER_CONFIG,
        ...parsed,
        printerType: resolvedType,
        miniPrintPocketMode: resolvedType === "58mm" ? Boolean(parsed.miniPrintPocketMode) : false,
        storeName:
          parsed.storeName ||
          localStorage.getItem("pdv_store_custom_name") ||
          company.name ||
          localStorage.getItem("pdv_store_name") ||
          "",
        storeCnpjCpf:
          parsed.storeCnpjCpf ||
          company.cnpjCpf ||
          localStorage.getItem("pdv_store_cnpj_cpf") ||
          "",
        storePhone: parsed.storePhone || company.phone || localStorage.getItem("pdv_store_phone") || "",
        storeAddress: parsed.storeAddress || company.address || localStorage.getItem("pdv_store_address") || "",
        storeWhatsapp: parsed.storeWhatsapp || company.whatsapp || localStorage.getItem("pdv_store_whatsapp") || "",
        storeInstagram: parsed.storeInstagram || company.instagram || localStorage.getItem("pdv_store_instagram") || "",
        storeFacebook: parsed.storeFacebook || company.facebook || localStorage.getItem("pdv_store_facebook") || "",
        storeWebsite: parsed.storeWebsite || company.website || localStorage.getItem("pdv_store_website") || "",
        storeEmail: parsed.storeEmail || company.email || localStorage.getItem("pdv_store_email") || "",
        receiptFooterMsg:
          parsed.receiptFooterMsg ||
          localStorage.getItem("pdv_receipt_footer_msg") ||
          DEFAULT_PRINTER_CONFIG.receiptFooterMsg,
        showNameOnReceipt: parsed.showNameOnReceipt !== undefined ? parsed.showNameOnReceipt : company.showNameOnReceipt,
        showCnpjOnReceipt: parsed.showCnpjOnReceipt !== undefined ? parsed.showCnpjOnReceipt : company.showCnpjOnReceipt,
        showPhoneOnReceipt: parsed.showPhoneOnReceipt !== undefined ? parsed.showPhoneOnReceipt : company.showPhoneOnReceipt,
        showWhatsappOnReceipt: parsed.showWhatsappOnReceipt !== undefined ? parsed.showWhatsappOnReceipt : company.showWhatsappOnReceipt,
        showInstagramOnReceipt: parsed.showInstagramOnReceipt !== undefined ? parsed.showInstagramOnReceipt : company.showInstagramOnReceipt,
        showFacebookOnReceipt: parsed.showFacebookOnReceipt !== undefined ? parsed.showFacebookOnReceipt : company.showFacebookOnReceipt,
        showWebsiteOnReceipt: parsed.showWebsiteOnReceipt !== undefined ? parsed.showWebsiteOnReceipt : company.showWebsiteOnReceipt,
        showEmailOnReceipt: parsed.showEmailOnReceipt !== undefined ? parsed.showEmailOnReceipt : company.showEmailOnReceipt,
        showAddressOnReceipt: parsed.showAddressOnReceipt !== undefined ? parsed.showAddressOnReceipt : company.showAddressOnReceipt,
      };
    }
  } catch (e) {
    console.warn("Erro ao carregar pdv_printer_full_config:", e);
  }

  // Fallback to legacy single keys
  const fallbackType: "58mm" | "80mm" | "A4" = (localStorage.getItem("pdv_printer_type") as any) || "80mm";
  return {
    ...DEFAULT_PRINTER_CONFIG,
    printerType: fallbackType,
    miniPrintPocketMode: fallbackType === "58mm" && localStorage.getItem("pdv_printer_mini_pocket") === "true",
    feedLines: parseInt(localStorage.getItem("pdv_printer_feed_lines") || "4", 10),
    fontSize: (localStorage.getItem("pdv_printer_font_size") as any) || "media",
    highContrast: localStorage.getItem("pdv_printer_high_contrast") === "true",
    autoCut: localStorage.getItem("pdv_printer_auto_cut") !== "false",
    openDrawer: localStorage.getItem("pdv_printer_open_drawer") !== "false",
    printTwoCopies: localStorage.getItem("pdv_printer_two_copies") === "true",
    showQrCode: localStorage.getItem("pdv_printer_show_qrcode") !== "false",
    autoPrintOnSale: localStorage.getItem("pdv_printer_auto_print_on_sale") === "true",
    storeName:
      localStorage.getItem("pdv_store_custom_name") ||
      company.name ||
      localStorage.getItem("pdv_store_name") ||
      "",
    storeCnpjCpf: company.cnpjCpf || localStorage.getItem("pdv_store_cnpj_cpf") || "",
    storePhone: company.phone || localStorage.getItem("pdv_store_phone") || "",
    storeAddress: company.address || localStorage.getItem("pdv_store_address") || "",
    storeWhatsapp: company.whatsapp || localStorage.getItem("pdv_store_whatsapp") || "",
    storeInstagram: company.instagram || localStorage.getItem("pdv_store_instagram") || "",
    storeFacebook: company.facebook || localStorage.getItem("pdv_store_facebook") || "",
    storeWebsite: company.website || localStorage.getItem("pdv_store_website") || "",
    storeEmail: company.email || localStorage.getItem("pdv_store_email") || "",
    receiptFooterMsg: localStorage.getItem("pdv_receipt_footer_msg") || DEFAULT_PRINTER_CONFIG.receiptFooterMsg,
    showNameOnReceipt: company.showNameOnReceipt,
    showCnpjOnReceipt: company.showCnpjOnReceipt,
    showPhoneOnReceipt: company.showPhoneOnReceipt,
    showWhatsappOnReceipt: company.showWhatsappOnReceipt,
    showInstagramOnReceipt: company.showInstagramOnReceipt,
    showFacebookOnReceipt: company.showFacebookOnReceipt,
    showWebsiteOnReceipt: company.showWebsiteOnReceipt,
    showEmailOnReceipt: company.showEmailOnReceipt,
    showAddressOnReceipt: company.showAddressOnReceipt,
  };
}

export function savePrinterConfig(config: PrinterConfig) {
  const normalizedConfig: PrinterConfig = {
    ...config,
    miniPrintPocketMode: config.printerType === "58mm" ? Boolean(config.miniPrintPocketMode) : false,
  };
  try {
    localStorage.setItem("pdv_printer_full_config", JSON.stringify(normalizedConfig));
    localStorage.setItem("pdv_printer_type", normalizedConfig.printerType);
    localStorage.setItem("pdv_printer_mini_pocket", normalizedConfig.miniPrintPocketMode ? "true" : "false");
    localStorage.setItem("pdv_printer_feed_lines", normalizedConfig.feedLines.toString());
    localStorage.setItem("pdv_printer_font_size", normalizedConfig.fontSize);
    localStorage.setItem("pdv_printer_high_contrast", normalizedConfig.highContrast ? "true" : "false");
    localStorage.setItem("pdv_printer_auto_cut", normalizedConfig.autoCut ? "true" : "false");
    localStorage.setItem("pdv_printer_open_drawer", normalizedConfig.openDrawer ? "true" : "false");
    localStorage.setItem("pdv_printer_two_copies", normalizedConfig.printTwoCopies ? "true" : "false");
    localStorage.setItem("pdv_printer_show_qrcode", normalizedConfig.showQrCode ? "true" : "false");
    localStorage.setItem("pdv_printer_auto_print_on_sale", normalizedConfig.autoPrintOnSale ? "true" : "false");
    localStorage.setItem("pdv_store_custom_name", normalizedConfig.storeName);
    if (normalizedConfig.storeName) {
      localStorage.setItem("pdv_store_name", normalizedConfig.storeName);
    }
    localStorage.setItem("pdv_store_cnpj_cpf", normalizedConfig.storeCnpjCpf);
    if (normalizedConfig.storePhone) localStorage.setItem("pdv_store_phone", normalizedConfig.storePhone);
    if (normalizedConfig.storeAddress) localStorage.setItem("pdv_store_address", normalizedConfig.storeAddress);
    localStorage.setItem("pdv_receipt_footer_msg", normalizedConfig.receiptFooterMsg);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("pdv_printer_config_changed", { detail: normalizedConfig }));
    }
  } catch (e) {
    console.warn("Erro ao salvar pdv_printer_full_config:", e);
  }
}

export function buildMiniPrintPocketConfig(
  base?: PrinterConfig,
  printTwoCopies?: boolean
): PrinterConfig {
  const current = base || loadPrinterConfig();
  return {
    ...current,
    printerType: "58mm",
    miniPrintPocketMode: true,
    highContrast: true,
    fontSize: "media",
    feedLines: 2,
    autoCut: false,
    openDrawer: false,
    showQrCode: false,
    printTwoCopies: printTwoCopies !== undefined ? printTwoCopies : current.printTwoCopies
  };
}

/**
 * Builds the complete thermal receipt HTML optimized for 58mm / 80mm thermal roll printers
 */
export function buildThermalReceiptHtml(params: {
  tx?: PDVTransaction;
  config: PrinterConfig;
  isTest?: boolean;
}): string {
  const { tx, config, isTest = false } = params;

  // Exact printable physical widths without cutting off right margins
  // 58mm roll: printable width is ~48mm (384 dots)
  // 80mm roll: printable width is ~72mm (576 dots)
  const is58mm = config.printerType === "58mm" || Boolean(config.miniPrintPocketMode);
  const isA4 = config.printerType === "A4" && !config.miniPrintPocketMode;

  const printableWidth = is58mm ? "48mm" : isA4 ? "100%" : "72mm";
  const maxContainerWidth = is58mm ? "48mm" : isA4 ? "800px" : "72mm";
  const pageSize = is58mm ? "58mm auto" : isA4 ? "A4 portrait" : "80mm auto";

  // Font sizing based on configuration
  const fontBasePx = config.fontSize === "pequena" ? (is58mm ? 9.5 : 10.5) : config.fontSize === "grande" ? (is58mm ? 12 : 13.5) : (is58mm ? 10.5 : 11.5);
  const fontHeaderPx = fontBasePx + 2.5;
  const fontSmallPx = fontBasePx - 2;

  const contrastWeight = config.highContrast !== false ? "900" : "700";
  const boldWeight = "900";

  const storeTitle = config.storeName.trim() || "ESTABELECIMENTO COMERCIAL";
  const storeCnpj = config.storeCnpjCpf.trim();
  const storePhone = config.storePhone?.trim();
  const storeAddr = config.storeAddress?.trim();

  // Test receipt mock transaction
  const effectiveTx: PDVTransaction = tx || {
    id: "TESTE_" + Math.floor(100000 + Math.random() * 900000),
    type: "entrada",
    amount: 38.50,
    description: "TESTE DE IMPRESSÃO BOBINA TÉRMICA",
    paymentMethod: "dinheiro",
    category: "venda",
    date: new Date().toLocaleDateString("pt-BR") + " " + new Date().toLocaleTimeString("pt-BR"),
    timestamp: Date.now(),
    clientName: "CLIENTE TESTE",
    amountPaid: 50.00,
    changeAmount: 11.50,
    items: [
      { name: "PÃO FRANCÊS TRADICIONAL", price: 1.20, quantity: 5, unit: "un", quickCode: "0101" },
      { name: "REFRIGERANTE LATA 350ML", price: 5.50, quantity: 2, unit: "un", size: "350ml" },
      { name: "QUEIJO MUSSARELA FATIADO", price: 21.50, quantity: 1, unit: "pct", size: "500g" }
    ]
  };

  const renderSingleReceiptBody = (copyLabel?: string) => {
    const itemsRows = (effectiveTx.items && effectiveTx.items.length > 0)
      ? effectiveTx.items.map(it => {
          const spec = [it.size, it.color, it.description].filter(Boolean).join(" ");
          const unit = it.unit || "un";
          const qk = it.quickCode ? `#${it.quickCode} ` : "";
          const durStr = ((it as any).durationMinutes && (it as any).durationMinutes > 0)
            ? ` [⏱️ ${(it as any).durationMinutes >= 60 ? `${Math.floor((it as any).durationMinutes / 60)}h${(it as any).durationMinutes % 60 ? `${(it as any).durationMinutes % 60}min` : ''}` : `${(it as any).durationMinutes} min`}]`
            : ((it as any).isService ? ' [SERVIÇO]' : '');
          const singlePieceStr = (it as any).isSinglePiece ? ' [PEÇA ÚNICA]' : '';
          const consignadoStr = (it as any).isConsignado ? ` [CONSIGNAÇÃO${(it as any).consignorName ? `: ${(it as any).consignorName}` : ''}]` : '';
          const itemTotal = (it.price * it.quantity).toFixed(2).replace(".", ",");
          const unitPrice = it.price.toFixed(2).replace(".", ",");

          return `
            <tr>
              <td colspan="3" style="padding-top: 3px; font-weight: ${boldWeight}; font-size: ${fontBasePx}px; word-break: break-word;">
                ${qk}${it.name.toUpperCase()}${durStr}${singlePieceStr}${consignadoStr}
              </td>
            </tr>
            <tr style="border-bottom: 1px dotted #444;">
              <td style="padding-bottom: 4px; font-size: ${fontSmallPx}px; font-weight: ${contrastWeight}; color: #000;">
                ${it.quantity} ${unit} x R$ ${unitPrice} ${spec ? `(${spec})` : ''}
              </td>
              <td></td>
              <td style="padding-bottom: 4px; text-align: right; font-weight: ${boldWeight}; font-size: ${fontBasePx}px; font-family: monospace;">
                R$ ${itemTotal}
              </td>
            </tr>
          `;
        }).join("")
      : `
        <tr>
          <td colspan="3" style="padding: 6px 0; font-size: ${fontBasePx}px;">
            ${effectiveTx.description}
          </td>
        </tr>
      `;

    const subtotalFormatted = effectiveTx.amount.toFixed(2).replace(".", ",");
    const amountPaidFormatted = effectiveTx.amountPaid ? effectiveTx.amountPaid.toFixed(2).replace(".", ",") : "";
    const changeFormatted = effectiveTx.changeAmount ? effectiveTx.changeAmount.toFixed(2).replace(".", ",") : "0,00";

    const qrData = encodeURIComponent(`CUPOM:${effectiveTx.id}|TOTAL:${effectiveTx.amount}|DATA:${effectiveTx.date}|LOJA:${storeTitle}`);

    return `
      <div class="receipt-wrapper" style="margin-bottom: 10px;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 4px;">
          ${copyLabel ? `<div style="display: inline-block; padding: 1px 6px; border: 1px solid #000; font-weight: ${boldWeight}; font-size: ${fontSmallPx}px; text-transform: uppercase; margin-bottom: 3px;">${copyLabel}</div>` : ''}
          ${config.showNameOnReceipt !== false && storeTitle ? `
            <div style="font-size: ${fontHeaderPx}px; font-weight: ${boldWeight}; line-height: 1.2; text-transform: uppercase;">
              ${storeTitle}
            </div>
          ` : ''}
          ${config.showCnpjOnReceipt !== false && storeCnpj ? `<div style="font-size: ${fontSmallPx}px; font-weight: ${contrastWeight}; margin-top: 2px;">CNPJ/CPF: ${storeCnpj}</div>` : ''}
          ${config.showAddressOnReceipt !== false && storeAddr ? `<div style="font-size: ${fontSmallPx}px; margin-top: 1px;">END: ${storeAddr}</div>` : ''}
          ${config.showPhoneOnReceipt !== false && storePhone ? `<div style="font-size: ${fontSmallPx}px; margin-top: 1px;">TEL: ${storePhone}</div>` : ''}
          ${config.showWhatsappOnReceipt !== false && config.storeWhatsapp ? `<div style="font-size: ${fontSmallPx}px; margin-top: 1px;">WHATSAPP: ${config.storeWhatsapp}</div>` : ''}
          ${config.showInstagramOnReceipt !== false && config.storeInstagram ? `<div style="font-size: ${fontSmallPx}px; margin-top: 1px;">INSTAGRAM: ${config.storeInstagram}</div>` : ''}
          ${config.showFacebookOnReceipt && config.storeFacebook ? `<div style="font-size: ${fontSmallPx}px; margin-top: 1px;">FACEBOOK: ${config.storeFacebook}</div>` : ''}
          ${config.showWebsiteOnReceipt !== false && config.storeWebsite ? `<div style="font-size: ${fontSmallPx}px; margin-top: 1px;">SITE: ${config.storeWebsite}</div>` : ''}
          ${config.showEmailOnReceipt && config.storeEmail ? `<div style="font-size: ${fontSmallPx}px; margin-top: 1px;">E-MAIL: ${config.storeEmail}</div>` : ''}
          <div style="font-size: ${fontSmallPx}px; font-weight: ${boldWeight}; margin-top: 3px; text-transform: uppercase;">
            ${isTest ? '*** COMPROVANTE DE TESTE DA BOBINA ***' : 'CUPOM DE VENDA / REGISTRO COMERCIAL'}
          </div>
        </div>

        <!-- Meta info -->
        <div style="border-top: 1.5px dashed #000; border-bottom: 1.5px dashed #000; padding: 4px 0; margin: 4px 0; font-size: ${fontSmallPx}px; font-weight: ${contrastWeight}; line-height: 1.3;">
          <div style="display: flex; justify-content: space-between;">
            <span>DATA: ${effectiveTx.date}</span>
            <span>ID: ${effectiveTx.id.slice(-8).toUpperCase()}</span>
          </div>
          <div style="font-weight: ${boldWeight}; margin-top: 1px;">
            CLIENTE: ${effectiveTx.clientName ? effectiveTx.clientName.toUpperCase() : 'CONSUMIDOR FINAL NÃO IDENTIFICADO'}
          </div>
        </div>

        <!-- Items Table -->
        <table style="width: 100%; border-collapse: collapse; margin: 4px 0;">
          <thead>
            <tr style="border-bottom: 1px dashed #000; font-size: ${fontSmallPx}px; font-weight: ${boldWeight}; text-transform: uppercase;">
              <th style="text-align: left; padding-bottom: 2px;">DESCRIÇÃO / QTD</th>
              <th></th>
              <th style="text-align: right; padding-bottom: 2px;">VALOR</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <!-- Totals & Payment -->
        <div style="border-top: 1px dashed #000; padding-top: 4px; margin-top: 4px; line-height: 1.35;">
          <div style="display: flex; justify-content: space-between; font-size: ${fontBasePx}px;">
            <span>PAGAMENTO:</span>
            <span style="font-weight: ${boldWeight}; text-transform: uppercase;">${effectiveTx.paymentMethod === 'misto' ? '2 FORMAS (MISTO)' : effectiveTx.paymentMethod.replace("_", " ")}</span>
          </div>

          ${(effectiveTx as any).splitDetails ? `
            <div style="font-size: ${fontSmallPx}px; margin-top: 3px; padding: 2px 4px; border-left: 2px solid #000;">
              <div style="display: flex; justify-content: space-between;">
                <span>• 1ª FORMA (${String((effectiveTx as any).splitDetails.method1 || 'DINHEIRO').toUpperCase()}):</span>
                <span style="font-family: monospace; font-weight: ${boldWeight};">R$ ${Number((effectiveTx as any).splitDetails.amount1 || 0).toFixed(2).replace('.', ',')}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-top: 1px;">
                <span>• 2ª FORMA (${String((effectiveTx as any).splitDetails.method2 || 'PIX').toUpperCase().replace('_', ' ')}):</span>
                <span style="font-family: monospace; font-weight: ${boldWeight};">R$ ${Number((effectiveTx as any).splitDetails.amount2 || 0).toFixed(2).replace('.', ',')}</span>
              </div>
            </div>
          ` : ''}

          <div style="display: flex; justify-content: space-between; font-size: ${fontHeaderPx}px; font-weight: ${boldWeight}; margin: 3px 0; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 3px 0;">
            <span>TOTAL R$:</span>
            <span style="font-family: monospace;">R$ ${subtotalFormatted}</span>
          </div>

          ${(effectiveTx.paymentMethod === 'dinheiro' || effectiveTx.paymentMethod === 'misto') && effectiveTx.amountPaid && effectiveTx.amountPaid > 0 ? `
            <div style="display: flex; justify-content: space-between; font-size: ${fontSmallPx}px; margin-top: 2px;">
              <span>VALOR RECEBIDO:</span>
              <span style="font-family: monospace;">R$ ${amountPaidFormatted}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: ${fontBasePx}px; font-weight: ${boldWeight}; margin-top: 1px;">
              <span>TROCO:</span>
              <span style="font-family: monospace;">R$ ${changeFormatted}</span>
            </div>
          ` : ''}
        </div>

        ${config.showQrCode ? `
          <!-- QR Code de Autenticação -->
          <div style="text-align: center; margin: 8px 0 4px 0;">
            <img 
              src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${qrData}" 
              style="width: 80px; height: 80px; display: block; margin: 0 auto;" 
              alt="QR Code Cupom"
            />
            <div style="font-size: 7.5px; font-weight: ${boldWeight}; margin-top: 2px; text-transform: uppercase;">
              CONSULTA E AUTENTICAÇÃO DO CUPOM
            </div>
          </div>
        ` : ''}

        <!-- Footer greeting -->
        <div style="text-align: center; margin-top: 6px; border-top: 1px dashed #000; padding-top: 5px; font-size: ${fontSmallPx}px;">
          <div style="font-weight: ${boldWeight};">${config.receiptFooterMsg || 'Obrigado pela preferência! Volte sempre!'}</div>
          <div style="font-size: 7.5px; color: #444; margin-top: 2px;">SISTEMA DE GESTÃO COMERCIAL PROTEGIDA 🛡️</div>
        </div>

        ${isTest ? `
          <!-- Régua de calibração milimétrica da bobina -->
          <div style="border-top: 1px solid #000; margin-top: 6px; padding-top: 4px; text-align: center; font-size: 8px; font-family: monospace;">
            <div>|--- ALINHAMENTO DA BOBINA ---|</div>
            <div>${is58mm ? '[=== LARGURA 58MM / 48MM ===]' : '[====== LARGURA 80MM / 72MM ======]'}</div>
            <div style="font-weight: bold; margin-top: 2px;">TESTE OK: NENHUMA BORDA CORTADA!</div>
          </div>
        ` : ''}
      </div>
    `;
  };

  const receiptContent = config.printTwoCopies
    ? `
      ${renderSingleReceiptBody("1ª VIA - CLIENTE")}
      <div style="text-align: center; border-top: 2px dashed #000; margin: 15px 0 10px 0; padding-top: 4px; font-size: 9px; font-weight: bold;">
        --- CORTE AQUI (2ª VIA ABAIXO) ---
      </div>
      ${renderSingleReceiptBody("2ª VIA - CONTROLE LOJA")}
    `
    : renderSingleReceiptBody();

  // Feed lines (avanço de papel para destacar na serrilha/guilhotina sem cortar o rodapé)
  const feedHeightPx = (config.feedLines || 4) * 9;

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Cupom - ${effectiveTx.id}</title>
        <style>
          @page {
            size: ${pageSize};
            margin: 0mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            font-family: Arial, Helvetica, 'Liberation Sans', sans-serif;
            font-size: ${fontBasePx}px;
            font-weight: ${contrastWeight};
            line-height: 1.25;
            width: ${printableWidth};
            max-width: ${maxContainerWidth};
            margin-left: auto !important;
            margin-right: auto !important;
          }
          table {
            font-family: inherit;
            color: inherit;
          }
          @media print {
            body {
              width: ${printableWidth} !important;
              max-width: ${maxContainerWidth} !important;
              margin: 0 auto !important;
              padding: 0 !important;
            }
          }
        </style>
      </head>
      <body>
        <div style="padding: 4px 2px;">
          ${receiptContent}

          <!-- Espaço de avanço para destacar na serrilha sem rasgar o rodapé -->
          <div style="height: ${feedHeightPx}px; min-height: ${feedHeightPx}px; width: 100%;"></div>

          ${config.autoCut ? `<!-- Pulso ESC/POS para corte automático de guilhotina -->
          <span style="font-size: 0px; color: transparent; user-select: none;">&#29;&#86;&#0;</span>` : ''}

          ${config.openDrawer ? `<!-- Pulso ESC/POS para abertura de gaveta de dinheiro elétrica -->
          <span style="font-size: 0px; color: transparent; user-select: none;">&#27;&#112;&#0;&#25;&#250;</span>` : ''}
        </div>
      </body>
    </html>
  `;
}

/**
 * Executes direct thermal printing via an invisible iframe without triggering popup blockers
 */
export function executeThermalPrint(
  fullHtml: string, 
  onSuccess?: () => void, 
  onError?: (err: any) => void
) {
  try {
    let printFrame = document.getElementById("thermal-print-iframe") as HTMLIFrameElement;
    if (!printFrame) {
      printFrame = document.createElement("iframe");
      printFrame.id = "thermal-print-iframe";
      printFrame.style.position = "fixed";
      printFrame.style.right = "0";
      printFrame.style.bottom = "0";
      printFrame.style.width = "0";
      printFrame.style.height = "0";
      printFrame.style.border = "0";
      document.body.appendChild(printFrame);
    }

    const frameDoc = printFrame.contentWindow?.document;
    if (frameDoc) {
      frameDoc.open();
      frameDoc.write(fullHtml);
      frameDoc.close();

      const triggerFramePrint = () => {
        try {
          printFrame.contentWindow?.focus();
          printFrame.contentWindow?.print();
          if (onSuccess) onSuccess();
        } catch (e) {
          console.warn("Falha no printFrame, usando fallback:", e);
          fallbackWindowPrint(fullHtml, onSuccess, onError);
        }
      };

      // Aguarda carregamento de imagens (ex: QR Code) com timeout máximo de 1200ms
      const imgs = Array.from(frameDoc.images || []);
      if (imgs.length > 0) {
        let printed = false;
        const doOnce = () => {
          if (printed) return;
          printed = true;
          triggerFramePrint();
        };
        const imgPromises = imgs.map((img) =>
          img.complete
            ? Promise.resolve()
            : new Promise<void>((res) => {
                img.addEventListener("load", () => res(), { once: true });
                img.addEventListener("error", () => res(), { once: true });
              })
        );
        Promise.all(imgPromises).then(() => setTimeout(doOnce, 120));
        setTimeout(doOnce, 1200);
      } else {
        setTimeout(triggerFramePrint, 350);
      }
      return;
    }
  } catch (err) {
    console.warn("Erro ao usar iframe de impressão:", err);
  }

  // Fallback to window.open if iframe fails
  fallbackWindowPrint(fullHtml, onSuccess, onError);
}

function fallbackWindowPrint(
  fullHtml: string, 
  onSuccess?: () => void, 
  onError?: (err: any) => void
) {
  try {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(fullHtml);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        if (onSuccess) onSuccess();
      }, 350);
    } else {
      if (onError) onError("Pop-up bloqueado pelo navegador.");
    }
  } catch (err) {
    if (onError) onError(err);
  }
}

/**
 * Checks if Web Bluetooth is available on this browser/device
 */
export function isBluetoothPrintSupported(): boolean {
  return typeof navigator !== "undefined" && "bluetooth" in navigator;
}

/**
 * Sends raw ESC/POS commands directly to a Bluetooth thermal printer
 */
export async function printViaBluetoothEscPos(
  tx: PDVTransaction | undefined,
  config: PrinterConfig,
  onStatus?: (msg: string) => void
): Promise<boolean> {
  if (!isBluetoothPrintSupported()) {
    throw new Error("Seu navegador não suporta conexão Bluetooth direta (Web Bluetooth). Use o botão de Impressão Padrão.");
  }

  try {
    if (onStatus) onStatus("Buscando impressoras térmicas Bluetooth...");

    const nav = navigator as any;
    // Standard ESC/POS printer Bluetooth GATT services: 0xFFE0, 0x18F0, 0x49535343-...
    const device = await nav.bluetooth.requestDevice({
      filters: [
        { services: ["0000ffe0-0000-1000-8000-00805f9b34fb"] },
        { services: ["e7810a71-73ae-499d-8c15-faa9aef0c3f2"] }
      ],
      optionalServices: [
        "0000ffe0-0000-1000-8000-00805f9b34fb",
        "000018f0-0000-1000-8000-00805f9b34fb",
        "e7810a71-73ae-499d-8c15-faa9aef0c3f2"
      ],
      acceptAllDevices: false
    }).catch(async () => {
      // Fallback: accept all devices if filtered request fails
      return await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          "0000ffe0-0000-1000-8000-00805f9b34fb",
          "000018f0-0000-1000-8000-00805f9b34fb",
          "e7810a71-73ae-499d-8c15-faa9aef0c3f2"
        ]
      });
    });

    if (!device || !device.gatt) {
      throw new Error("Nenhum dispositivo Bluetooth selecionado.");
    }

    if (onStatus) onStatus(`Conectando a ${device.name || "Impressora"}...`);
    const server = await device.gatt.connect();

    // Find printable characteristic
    let printChar: any = null;
    const services = await server.getPrimaryServices().catch(() => []);
    for (const service of services) {
      const chars = await service.getCharacteristics().catch(() => []);
      for (const ch of chars) {
        if (ch.properties.write || ch.properties.writeWithoutResponse) {
          printChar = ch;
          break;
        }
      }
      if (printChar) break;
    }

    if (!printChar) {
      throw new Error("Não foi possível encontrar o canal de escrita ESC/POS na impressora Bluetooth.");
    }

    if (onStatus) onStatus("Formatando cupom ESC/POS...");

    // Build raw ESC/POS commands (normalize diacritics to clean ASCII so ESC/POS thermal rolls never print garbled symbols)
    const cleanEscPos = (txt: string) =>
      String(txt || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\x20-\x7E\n]/g, " ");
    const encoder = new TextEncoder();
    const encodeAscii = (txt: string) => encoder.encode(cleanEscPos(txt));
    const chunks: Uint8Array[] = [];

    // Init ESC @
    chunks.push(new Uint8Array([0x1B, 0x40]));

    // Drawer kick if configured: ESC p 0 25 250
    if (config.openDrawer) {
      chunks.push(new Uint8Array([0x1B, 0x70, 0x00, 0x19, 0xFA]));
    }

    const divider = config.printerType === "58mm" || config.miniPrintPocketMode
      ? "--------------------------------\n"
      : "------------------------------------------------\n";

    const targetTx = tx || {
      id: "TESTE_" + Math.floor(100000 + Math.random() * 900000),
      amount: 38.50,
      paymentMethod: "dinheiro",
      date: new Date().toLocaleDateString("pt-BR") + " " + new Date().toLocaleTimeString("pt-BR"),
      clientName: "CLIENTE TESTE",
      amountPaid: 50.00,
      changeAmount: 11.50,
      items: [
        { name: "PAO FRANCES", price: 1.20, quantity: 5, unit: "un" },
        { name: "REFRIGERANTE LATA", price: 5.50, quantity: 2, unit: "un" }
      ]
    };

    const appendEscPosCopy = (copyLabel?: string) => {
      // Align Center: ESC a 1
      chunks.push(new Uint8Array([0x1B, 0x61, 0x01]));
      if (copyLabel) {
        chunks.push(new Uint8Array([0x1B, 0x45, 0x01]));
        chunks.push(encodeAscii(`[ ${copyLabel} ]\n`));
        chunks.push(new Uint8Array([0x1B, 0x45, 0x00]));
      }
      if (config.showNameOnReceipt !== false) {
        // Double height/width header: ESC ! 0x30
        chunks.push(new Uint8Array([0x1B, 0x21, 0x30]));
        chunks.push(encodeAscii((config.storeName || "ESTABELECIMENTO").toUpperCase() + "\n"));
      }

      // Reset font size (normal) and enforce ESC/POS Bold ON for crisp dark thermal printing
      chunks.push(new Uint8Array([0x1B, 0x21, 0x00]));
      if (config.highContrast !== false) {
        chunks.push(new Uint8Array([0x1B, 0x45, 0x01]));
      }
      if (config.showCnpjOnReceipt !== false && config.storeCnpjCpf) {
        chunks.push(encodeAscii(`CNPJ/CPF: ${config.storeCnpjCpf}\n`));
      }
      if (config.showAddressOnReceipt !== false && config.storeAddress) {
        chunks.push(encodeAscii(`END: ${config.storeAddress}\n`));
      }
      if (config.showPhoneOnReceipt !== false && config.storePhone) {
        chunks.push(encodeAscii(`TEL: ${config.storePhone}\n`));
      }
      if (config.showWhatsappOnReceipt !== false && config.storeWhatsapp) {
        chunks.push(encodeAscii(`WHATSAPP: ${config.storeWhatsapp}\n`));
      }
      if (config.showInstagramOnReceipt !== false && config.storeInstagram) {
        chunks.push(encodeAscii(`INSTA: ${config.storeInstagram}\n`));
      }
      if (config.showFacebookOnReceipt && config.storeFacebook) {
        chunks.push(encodeAscii(`FACE: ${config.storeFacebook}\n`));
      }
      if (config.showWebsiteOnReceipt !== false && config.storeWebsite) {
        chunks.push(encodeAscii(`SITE: ${config.storeWebsite}\n`));
      }
      if (config.showEmailOnReceipt && config.storeEmail) {
        chunks.push(encodeAscii(`EMAIL: ${config.storeEmail}\n`));
      }
      chunks.push(encodeAscii("CUPOM DE VENDA / REGISTRO COMERCIAL\n"));
      chunks.push(encodeAscii(divider));

      // Align Left: ESC a 0
      chunks.push(new Uint8Array([0x1B, 0x61, 0x00]));
      chunks.push(encodeAscii(`DATA: ${targetTx.date}\n`));
      chunks.push(encodeAscii(`ID: ${targetTx.id.slice(-8).toUpperCase()}\n`));
      if (targetTx.clientName) {
        chunks.push(encodeAscii(`CLIENTE: ${targetTx.clientName.toUpperCase()}\n`));
      }
      chunks.push(encodeAscii(divider));

      // Items
      if (targetTx.items && targetTx.items.length > 0) {
        for (const item of targetTx.items) {
          const line = `${item.quantity} ${item.unit || "un"} x R$ ${item.price.toFixed(2)} - ${item.name}\n`;
          const totalLine = `   TOTAL: R$ ${(item.price * item.quantity).toFixed(2)}\n`;
          chunks.push(encodeAscii(line));
          chunks.push(encodeAscii(totalLine));
        }
      } else if ((targetTx as any).description) {
        chunks.push(encodeAscii(`${(targetTx as any).description}\n`));
      }

      chunks.push(encodeAscii(divider));

      // Total: Bold and Big
      chunks.push(new Uint8Array([0x1B, 0x45, 0x01])); // Bold on
      chunks.push(encodeAscii(`FORMA PGTO: ${targetTx.paymentMethod === "misto" ? "MISTO (2 FORMAS)" : String(targetTx.paymentMethod).toUpperCase()}\n`));
      if ((targetTx as any).splitDetails) {
        const sd = (targetTx as any).splitDetails;
        chunks.push(encodeAscii(` - 1a (${String(sd.method1 || "DINHEIRO").toUpperCase()}): R$ ${Number(sd.amount1 || 0).toFixed(2)}\n`));
        chunks.push(encodeAscii(` - 2a (${String(sd.method2 || "PIX").toUpperCase()}): R$ ${Number(sd.amount2 || 0).toFixed(2)}\n`));
      }
      chunks.push(encodeAscii(`TOTAL R$: ${targetTx.amount.toFixed(2)}\n`));
      if ((targetTx.paymentMethod === "dinheiro" || targetTx.paymentMethod === "misto") && targetTx.amountPaid && targetTx.amountPaid > 0) {
        chunks.push(encodeAscii(`RECEBIDO: R$ ${targetTx.amountPaid.toFixed(2)}\n`));
        chunks.push(encodeAscii(`TROCO:    R$ ${(targetTx.changeAmount || 0).toFixed(2)}\n`));
      }
      if (config.highContrast === false) {
        chunks.push(new Uint8Array([0x1B, 0x45, 0x00])); // Bold off only if explicitly disabled
      }

      chunks.push(encodeAscii(divider));

      // Align Center
      chunks.push(new Uint8Array([0x1B, 0x61, 0x01]));
      chunks.push(encodeAscii(`${config.receiptFooterMsg || "Obrigado pela preferencia!"}\n`));
      chunks.push(encodeAscii("SISTEMA GESTAO COMERCIAL PROTEGIDA\n"));

      // Feed lines: ESC d n
      const feed = Math.min(Math.max(config.feedLines || 4, 2), 8);
      chunks.push(new Uint8Array([0x1B, 0x64, feed]));

      // Auto Cut if configured: GS V 0
      if (config.autoCut) {
        chunks.push(new Uint8Array([0x1D, 0x56, 0x00]));
      }
    };

    if (config.printTwoCopies) {
      appendEscPosCopy("1A VIA - CLIENTE");
      chunks.push(encodeAscii("\n"));
      appendEscPosCopy("2A VIA - CONTROLE LOJA");
    } else {
      appendEscPosCopy();
    }

    if (onStatus) onStatus("Transmitindo dados para a bobina...");

    // Send chunks in 20-byte packets to prevent BLE buffer overflow
    const fullBuffer = new Uint8Array(chunks.reduce((acc, c) => acc + c.length, 0));
    let offset = 0;
    for (const c of chunks) {
      fullBuffer.set(c, offset);
      offset += c.length;
    }

    const CHUNK_SIZE = 20;
    for (let i = 0; i < fullBuffer.length; i += CHUNK_SIZE) {
      const slice = fullBuffer.slice(i, i + CHUNK_SIZE);
      if (printChar.properties.writeWithoutResponse) {
        await printChar.writeValueWithoutResponse(slice);
      } else {
        await printChar.writeValue(slice);
      }
      await new Promise(r => setTimeout(r, 20));
    }

    if (onStatus) onStatus("Impressão Bluetooth concluída! ✅");
    setTimeout(() => {
      try {
        device.gatt.disconnect();
      } catch (_) {}
    }, 1000);

    return true;
  } catch (err: any) {
    console.error("Erro Bluetooth:", err);
    throw err;
  }
}

export interface ThermalCanvasReceiptPayload {
  title: string;
  subtitle?: string;
  storeName?: string;
  storeCnpj?: string;
  dateStr: string;
  ticketId: string;
  collaboratorName: string;
  statusLabel: string;
  extraMeta?: string[];
  isCancelled?: boolean;
  cancelReason?: string;
  cancelledAt?: string;
  lines: { left: string; right: string; detail?: string; bold?: boolean }[];
  summaryLines: { label: string; value: string; bold?: boolean; big?: boolean; strike?: boolean }[];
  caderninhoBox?: {
    totalEarned: number;
    totalPaid: number;
    balancePending: number;
    totalWeightKg?: number;
    totalBottles?: number;
    totalDeliveries?: number;
    isFounder?: boolean;
  };
  footerNote?: string;
  singleViaBanner?: string;
  compactCleanMode?: boolean;
  hideItemHeader?: boolean;
  copies: 1 | 2;
}

const escapeHtml = (str: string) =>
  String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export function buildThermalDocumentHtmlFromPayload(
  payload: ThermalCanvasReceiptPayload,
  config: PrinterConfig
): string {
  const is58mm = config.printerType === "58mm" || Boolean(config.miniPrintPocketMode);
  const isA4 = config.printerType === "A4" && !config.miniPrintPocketMode;
  const printableWidth = is58mm ? "48mm" : isA4 ? "100%" : "72mm";
  const maxContainerWidth = is58mm ? "48mm" : isA4 ? "760px" : "72mm";
  const pageSize = is58mm ? "58mm auto" : isA4 ? "A4 portrait" : "80mm auto";
  const fontBasePx =
    config.fontSize === "pequena"
      ? is58mm
        ? 9.5
        : 10.5
      : config.fontSize === "grande"
      ? is58mm
        ? 11.5
        : 13
      : is58mm
      ? 10.5
      : 11.5;
  const fontHeaderPx = fontBasePx + 2;
  const fontSmallPx = Math.max(8, fontBasePx - 1.5);
  const boldWeight = "900";
  const bodyWeight = config.highContrast !== false || config.miniPrintPocketMode ? "900" : "700";
  const storeTitle = payload.storeName?.trim() || config.storeName?.trim() || "MINHA EMPRESA";
  const storeCnpj = payload.storeCnpj?.trim() || config.storeCnpjCpf?.trim() || "";

  const isCompact = Boolean(payload.compactCleanMode);
  const effectiveBasePx = isCompact ? (is58mm ? 12 : isA4 ? 13 : 13) : fontBasePx;
  const effectiveHeaderPx = isCompact ? effectiveBasePx + 2.5 : fontHeaderPx;
  const effectiveSmallPx = isCompact ? effectiveBasePx - 1 : fontSmallPx;

  const renderCopy = (viaLabel?: string) => {
    const itemRows = payload.lines
      .map((ln) =>
        isCompact
          ? `
      <tr>
        <td colspan="3" style="padding-top:5px;font-weight:900;font-size:${effectiveBasePx}px;word-break:break-word;">
          ${escapeHtml(ln.left)}
        </td>
      </tr>
      <tr style="border-bottom:1px dashed #666;">
        <td colspan="3" style="padding-bottom:5px;font-weight:900;font-size:${effectiveHeaderPx}px;font-family:monospace;">
          = ${escapeHtml(ln.right)}
        </td>
      </tr>
    `
          : `
      <tr>
        <td colspan="2" style="padding-top:3px;font-weight:${ln.bold !== false ? boldWeight : bodyWeight};font-size:${fontBasePx}px;word-break:break-word;">
          ${escapeHtml(ln.left)}
        </td>
        <td style="padding-top:3px;text-align:right;font-weight:${boldWeight};font-family:monospace;white-space:nowrap;vertical-align:top;">
          ${escapeHtml(ln.right)}
        </td>
      </tr>
      ${
        ln.detail
          ? `<tr style="border-bottom:1px dotted #444;">
              <td colspan="3" style="padding-bottom:3px;font-size:${fontSmallPx}px;">${escapeHtml(ln.detail)}</td>
            </tr>`
          : `<tr style="border-bottom:1px dotted #444;"><td colspan="3" style="padding-bottom:2px;"></td></tr>`
      }`
      )
      .join("");

    const summaryRows = payload.summaryLines
      .map((s) => {
        if (s.big) {
          return `<div style="display:flex;justify-content:space-between;font-size:${effectiveHeaderPx}px;font-weight:900;border-top:1.5px solid #000;border-bottom:1.5px solid #000;padding:4px 0;margin:4px 0;${
            s.strike ? "text-decoration:line-through;" : ""
          }">
            <span>${escapeHtml(s.label)}</span>
            <span>${escapeHtml(s.value)}</span>
          </div>`;
        }
        return `<div style="display:flex;justify-content:space-between;font-size:${
          isCompact ? effectiveBasePx : fontSmallPx
        }px;font-weight:${s.bold ? "900" : bodyWeight};margin-top:3px;">
          <span>${escapeHtml(s.label)}</span>
          <span>${escapeHtml(s.value)}</span>
        </div>`;
      })
      .join("");

    const caderninhoHtml =
      !isCompact && payload.caderninhoBox
        ? payload.caderninhoBox.isFounder
          ? `<div style="border:1.5px solid #000;padding:4px;margin-top:6px;font-size:${fontSmallPx}px;">
          <div style="text-align:center;font-weight:900;border-bottom:1px dashed #000;padding-bottom:2px;margin-bottom:3px;">
            ACUMULADO - COLETA PRÓPRIA
          </div>
          ${
            typeof payload.caderninhoBox.totalBottles === "number" && payload.caderninhoBox.totalBottles > 0
              ? `<div style="display:flex;justify-content:space-between;font-weight:900;">
                  <span>GARRAFAS ACUMULADAS:</span>
                  <span>${payload.caderninhoBox.totalBottles} un</span>
                </div>`
              : ""
          }
          ${
            typeof payload.caderninhoBox.totalWeightKg === "number"
              ? `<div style="display:flex;justify-content:space-between;font-weight:900;">
                  <span>PESO ACUMULADO (${payload.caderninhoBox.totalDeliveries || 0} ent.):</span>
                  <span>${payload.caderninhoBox.totalWeightKg.toFixed(2).replace(".", ",")} kg</span>
                </div>`
              : ""
          }
          <div style="display:flex;justify-content:space-between;border-top:1px dashed #000;margin-top:2px;padding-top:2px;font-weight:900;">
            <span>ECONOMIA ACUMULADA:</span>
            <span>R$ ${payload.caderninhoBox.totalEarned.toFixed(2).replace(".", ",")}</span>
          </div>
        </div>`
          : `<div style="border:1.5px solid #000;padding:4px;margin-top:6px;font-size:${fontSmallPx}px;">
          <div style="text-align:center;font-weight:900;border-bottom:1px dashed #000;padding-bottom:2px;margin-bottom:3px;">
            CADERNINHO - CONFERÊNCIA
          </div>
          <div style="display:flex;justify-content:space-between;">
            <span>TOTAL COMPRADO:</span>
            <span style="font-weight:900;">R$ ${payload.caderninhoBox.totalEarned.toFixed(2).replace(".", ",")}</span>
          </div>
          <div style="display:flex;justify-content:space-between;">
            <span>TOTAL JÁ PAGO:</span>
            <span style="font-weight:900;">R$ ${payload.caderninhoBox.totalPaid.toFixed(2).replace(".", ",")}</span>
          </div>
          <div style="display:flex;justify-content:space-between;border-top:1px dashed #000;margin-top:2px;padding-top:2px;font-size:${fontBasePx}px;font-weight:900;">
            <span>SALDO A ACERTAR:</span>
            <span>R$ ${payload.caderninhoBox.balancePending.toFixed(2).replace(".", ",")}</span>
          </div>
          ${
            typeof payload.caderninhoBox.totalBottles === "number" && payload.caderninhoBox.totalBottles > 0
              ? `<div style="font-size:${fontSmallPx}px;margin-top:2px;font-weight:900;">GARRAFAS ACUM.: ${payload.caderninhoBox.totalBottles} un</div>`
              : ""
          }
          ${
            typeof payload.caderninhoBox.totalWeightKg === "number"
              ? `<div style="font-size:${fontSmallPx}px;margin-top:2px;">PESO ACUM.: ${payload.caderninhoBox.totalWeightKg.toFixed(2).replace(".", ",")} kg (${payload.caderninhoBox.totalDeliveries || 0} entregas)</div>`
              : ""
          }
          <div style="margin-top:4px;border-top:1px dotted #000;padding-top:3px;font-size:${Math.max(7.5, fontSmallPx - 0.5)}px;">
            [ ] Grampeado Empresa &nbsp; [ ] Conferido Reciclador
          </div>
        </div>`
        : "";

    const headerHtml = isCompact
      ? `
        <div style="border-top:2.5px solid #000;border-bottom:2.5px solid #000;border-left:2px solid #000;border-right:2px solid #000;text-align:center;padding:5px 4px;margin-bottom:5px;">
          ${viaLabel ? `<div style="font-size:${effectiveBasePx}px;font-weight:900;text-transform:uppercase;">${escapeHtml(viaLabel)}</div>` : ""}
          <div style="font-size:${effectiveHeaderPx}px;font-weight:900;text-transform:uppercase;">${escapeHtml(storeTitle)}</div>
          <div style="font-size:${effectiveBasePx}px;font-weight:900;text-transform:uppercase;">${escapeHtml(payload.title)}</div>
        </div>
        <div style="border-bottom:1.5px dashed #000;padding-bottom:4px;margin-bottom:4px;font-size:${effectiveBasePx}px;font-weight:900;">
          <div>DATA: ${escapeHtml(payload.dateStr)}</div>
          <div>NOME: ${escapeHtml(payload.collaboratorName.toUpperCase())}</div>
          ${(payload.extraMeta || []).map((m) => `<div>${escapeHtml(m)}</div>`).join("")}
        </div>
      `
      : `
        ${
          viaLabel
            ? `<div style="border:1.5px solid #000;text-align:center;font-weight:900;font-size:${fontSmallPx}px;padding:2px 4px;margin-bottom:4px;text-transform:uppercase;">
                ${escapeHtml(viaLabel)}
              </div>`
            : ""
        }
        <div style="text-align:center;margin-bottom:4px;">
          <div style="font-size:${fontHeaderPx}px;font-weight:900;text-transform:uppercase;">${escapeHtml(storeTitle)}</div>
          ${storeCnpj ? `<div style="font-size:${fontSmallPx}px;">CNPJ: ${escapeHtml(storeCnpj)}</div>` : ""}
          <div style="font-size:${fontSmallPx}px;font-weight:900;margin-top:3px;border:1px solid #000;padding:2px;">
            ${escapeHtml(payload.title)}
          </div>
          ${payload.subtitle ? `<div style="font-size:${fontSmallPx}px;margin-top:2px;">${escapeHtml(payload.subtitle)}</div>` : ""}
        </div>
        <div style="border-top:1px dashed #000;border-bottom:1px dashed #000;padding:4px 0;margin:4px 0;font-size:${fontSmallPx}px;">
          <div>DATA: ${escapeHtml(payload.dateStr)}</div>
          <div>DOC: ${escapeHtml(payload.ticketId.slice(-8).toUpperCase())}</div>
          <div style="font-weight:900;">PARCEIRO: ${escapeHtml(payload.collaboratorName.toUpperCase())}</div>
          <div style="font-weight:900;">STATUS: ${escapeHtml(payload.isCancelled ? "CANCELADA / ESTORNADA" : payload.statusLabel)}</div>
          ${(payload.extraMeta || []).map((m) => `<div>${escapeHtml(m)}</div>`).join("")}
        </div>
      `;

    return `
      <div style="padding:3px 1px;">
        ${
          payload.isCancelled
            ? `<div style="border:2px solid #000;background:#000;color:#fff;text-align:center;font-weight:900;font-size:${effectiveHeaderPx}px;padding:4px;margin-bottom:5px;">
                *** CANCELADA / ESTORNADA ***
                ${payload.cancelledAt ? `<div style="font-size:${effectiveSmallPx}px;font-weight:700;">EM: ${escapeHtml(payload.cancelledAt)}</div>` : ""}
                ${payload.cancelReason ? `<div style="font-size:${effectiveSmallPx}px;font-weight:700;">MOTIVO: ${escapeHtml(payload.cancelReason.toUpperCase())}</div>` : ""}
              </div>`
            : ""
        }
        ${headerHtml}
        ${
          payload.lines.length > 0
            ? `<table style="width:100%;border-collapse:collapse;margin:4px 0;">
                ${
                  !payload.hideItemHeader
                    ? `<thead>
                        <tr style="border-bottom:1.5px dashed #000;font-size:${isCompact ? effectiveBasePx : fontSmallPx}px;font-weight:900;">
                          ${
                            isCompact
                              ? `<th colspan="3" style="text-align:center;padding-bottom:3px;">MATERIAL | PESO | VALOR</th>`
                              : `<th colspan="2" style="text-align:left;">DESCRIÇÃO / PESO</th><th style="text-align:right;">VALOR</th>`
                          }
                        </tr>
                      </thead>`
                    : ""
                }
                <tbody>${itemRows}</tbody>
              </table>`
            : ""
        }
        <div style="${payload.lines.length > 0 ? "border-top:1.5px dashed #000;" : ""}padding-top:4px;margin-top:4px;">
          ${summaryRows}
          ${caderninhoHtml}
        </div>
        <div style="text-align:center;margin-top:6px;border-top:1.5px dashed #000;padding-top:5px;font-size:${
          isCompact ? effectiveBasePx : fontSmallPx
        }px;font-weight:900;">
          ${!isCompact ? `<div>${escapeHtml(storeTitle)}</div>` : "<div>OBRIGADO PELA PREFERÊNCIA!</div>"}
          <div style="font-weight:700;font-size:${effectiveSmallPx}px;">${escapeHtml(
      payload.isCancelled
        ? "DOCUMENTO ESTORNADO - SEM VALOR"
        : payload.footerNote || "Pasta do colaborador atualizada!"
    )}</div>
        </div>
      </div>
    `;
  };

  const bodyContent =
    payload.copies === 2
      ? `
      ${renderCopy("1ª VIA - CONTROLE EMPRESA / CADERNINHO (GRAMPEAR)")}
      <div style="text-align:center;border-top:2px dashed #000;border-bottom:2px dashed #000;margin:14px 0;padding:5px 0;font-size:${fontSmallPx}px;font-weight:900;">
        ✂ - - CORTAR / GRAMPEAR AQUI - - ✂
      </div>
      ${renderCopy("2ª VIA - RECICLADOR (CONFERÊNCIA)")}
    `
      : renderCopy("VIA ÚNICA - CONTROLE RECICLAGEM");

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(payload.title)} - ${escapeHtml(payload.collaboratorName)}</title>
        <style>
          @page { size: ${pageSize}; margin: 0mm; }
          * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            color: #000 !important;
            font-family: Arial, Helvetica, 'Liberation Sans', sans-serif;
            font-size: ${fontBasePx}px;
            font-weight: ${bodyWeight};
            line-height: 1.25;
            width: ${printableWidth};
            max-width: ${maxContainerWidth};
            margin-left: auto !important;
            margin-right: auto !important;
          }
        </style>
      </head>
      <body>
        ${bodyContent}
        <div style="height:${(config.feedLines || 2) * 8}px;"></div>
      </body>
    </html>
  `;
}

export async function generateMiniPrint57mmPngBlob(
  payload: ThermalCanvasReceiptPayload
): Promise<Blob> {
  // 576px width matches high-contrast 57mm thermal roll (~2x 288 or 1.5x 384 dots for razor sharp Fun Print rasterizing)
  const W = 576;
  const PAD = 22;
  const INNER_W = W - PAD * 2;

  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = W;
  tempCanvas.height = 4000;
  const ctx = tempCanvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D indisponível neste dispositivo.");
  }

  const wrapText = (text: string, font: string, maxWidth: number): string[] => {
    ctx.font = font;
    const rawTokens = String(text || "").split(/\s+/);
    const words: string[] = [];
    for (const token of rawTokens) {
      if (!token || ctx.measureText(token).width <= maxWidth) {
        words.push(token);
      } else {
        // Quebra palavras/códigos longos sem espaço para nunca cortar na borda de 57mm
        let slice = "";
        for (const ch of token) {
          const nextSlice = slice + ch;
          if (ctx.measureText(nextSlice).width > maxWidth && slice) {
            words.push(slice);
            slice = ch;
          } else {
            slice = nextSlice;
          }
        }
        if (slice) words.push(slice);
      }
    }
    const out: string[] = [];
    let current = "";
    for (const w of words) {
      const candidate = current ? `${current} ${w}` : w;
      if (ctx.measureText(candidate).width <= maxWidth) {
        current = candidate;
      } else {
        if (current) out.push(current);
        current = w;
      }
    }
    if (current) out.push(current);
    return out.length > 0 ? out : [""];
  };

  type DrawCmd = (c: CanvasRenderingContext2D) => void;
  const cmds: DrawCmd[] = [];
  let y = 18;

  const addCenteredText = (text: string, font: string, lineH: number, inverted = false) => {
    const wrapped = wrapText(text, font, INNER_W - (inverted ? 16 : 0));
    const blockH = wrapped.length * lineH + (inverted ? 14 : 0);
    const startY = y;
    cmds.push((c) => {
      if (inverted) {
        c.fillStyle = "#000000";
        c.fillRect(PAD, startY, INNER_W, blockH);
        c.fillStyle = "#FFFFFF";
      } else {
        c.fillStyle = "#000000";
      }
      c.font = font;
      c.textAlign = "center";
      c.textBaseline = "top";
      wrapped.forEach((line, idx) => {
        c.fillText(line, W / 2, startY + (inverted ? 7 : 0) + idx * lineH);
      });
      c.fillStyle = "#000000";
    });
    y += blockH + 4;
  };

  const addBoxedBanner = (text: string, font: string) => {
    const wrapped = wrapText(text, font, INNER_W - 20);
    const lineH = 26;
    const boxH = wrapped.length * lineH + 14;
    const startY = y;
    cmds.push((c) => {
      c.strokeStyle = "#000000";
      c.lineWidth = 3;
      c.strokeRect(PAD, startY, INNER_W, boxH);
      c.fillStyle = "#000000";
      c.font = font;
      c.textAlign = "center";
      c.textBaseline = "top";
      wrapped.forEach((line, idx) => {
        c.fillText(line, W / 2, startY + 7 + idx * lineH);
      });
    });
    y += boxH + 8;
  };

  const addDashedRule = () => {
    const lineY = y + 4;
    cmds.push((c) => {
      c.save();
      c.strokeStyle = "#000000";
      c.lineWidth = 2;
      c.setLineDash([8, 6]);
      c.beginPath();
      c.moveTo(PAD, lineY);
      c.lineTo(W - PAD, lineY);
      c.stroke();
      c.restore();
    });
    y += 14;
  };

  const addSolidRule = () => {
    const lineY = y + 4;
    cmds.push((c) => {
      c.strokeStyle = "#000000";
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(PAD, lineY);
      c.lineTo(W - PAD, lineY);
      c.stroke();
    });
    y += 12;
  };

  const addLeftText = (text: string, font: string, lineH = 25) => {
    const wrapped = wrapText(text, font, INNER_W);
    const startY = y;
    cmds.push((c) => {
      c.fillStyle = "#000000";
      c.font = font;
      c.textAlign = "left";
      c.textBaseline = "top";
      wrapped.forEach((line, idx) => {
        c.fillText(line, PAD, startY + idx * lineH);
      });
    });
    y += wrapped.length * lineH + 3;
  };

  const addKeyValueRow = (left: string, right: string, font: string, lineH = 28, strike = false) => {
    ctx.font = font;
    const rightW = right ? ctx.measureText(right).width + 14 : 0;
    const wrappedLeft = wrapText(left, font, Math.max(140, INNER_W - rightW));
    const startY = y;
    cmds.push((c) => {
      c.fillStyle = "#000000";
      c.font = font;
      c.textBaseline = "top";
      c.textAlign = "left";
      wrappedLeft.forEach((line, idx) => {
        c.fillText(line, PAD, startY + idx * lineH);
      });
      if (right) {
        c.textAlign = "right";
        c.fillText(right, W - PAD, startY);
      }
      if (strike) {
        c.strokeStyle = "#000000";
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(PAD, startY + lineH * 0.48);
        c.lineTo(W - PAD, startY + lineH * 0.48);
        c.stroke();
      }
    });
    y += wrappedLeft.length * lineH + 4;
  };

  const stripThermalEmojis = (raw: string) =>
    String(raw || "")
      .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\uFE0F]/gu, "")
      .replace(/\s{2,}/g, " ")
      .trim();

  const isCompact = Boolean(payload.compactCleanMode);
  const FONT_TITLE = isCompact
    ? "900 31px Arial, Helvetica, sans-serif"
    : "900 28px Arial, Helvetica, sans-serif";
  const FONT_BIG = isCompact
    ? "900 29px Arial, Helvetica, sans-serif"
    : "900 26px Arial, Helvetica, sans-serif";
  const FONT_BOLD = isCompact
    ? "900 26px Arial, Helvetica, sans-serif"
    : "900 23px Arial, Helvetica, sans-serif";
  const FONT_BODY = isCompact
    ? "900 24px Arial, Helvetica, sans-serif"
    : "900 21px Arial, Helvetica, sans-serif";
  const FONT_SMALL = isCompact
    ? "900 22px Arial, Helvetica, sans-serif"
    : "900 19px Arial, Helvetica, sans-serif";

  const addDoubleBoxBanner = (headerLines: string[], font: string, lineH = 34) => {
    const cleanLines: string[] = [];
    headerLines.forEach((raw) => {
      const cleaned = stripThermalEmojis(raw);
      if (cleaned) {
        cleanLines.push(...wrapText(cleaned, font, INNER_W - 28));
      }
    });
    const boxH = cleanLines.length * lineH + 20;
    const startY = y;
    cmds.push((c) => {
      c.strokeStyle = "#000000";
      c.lineWidth = 4;
      c.strokeRect(PAD, startY, INNER_W, boxH);
      c.lineWidth = 2;
      c.strokeRect(PAD + 6, startY + 6, INNER_W - 12, boxH - 12);
      c.fillStyle = "#000000";
      c.font = font;
      c.textAlign = "center";
      c.textBaseline = "top";
      cleanLines.forEach((line, idx) => {
        c.fillText(line, W / 2, startY + 12 + idx * lineH);
      });
    });
    y += boxH + 12;
  };

  const drawSingleVia = (viaLabel: string) => {
    const storeTitle = stripThermalEmojis(payload.storeName?.trim() || "FERRO VELHO DW");
    const storeCnpj = stripThermalEmojis(payload.storeCnpj?.trim() || "");
    const cleanTitle = stripThermalEmojis(payload.title);

    if (isCompact) {
      addDoubleBoxBanner([viaLabel, storeTitle.toUpperCase(), cleanTitle.toUpperCase()], FONT_BOLD, 34);
      if (payload.isCancelled) {
        addCenteredText("*** COMPRA CANCELADA / ESTORNADA ***", FONT_BIG, 34, true);
        if (payload.cancelledAt) addCenteredText(`EM: ${payload.cancelledAt}`, FONT_SMALL, 28);
        if (payload.cancelReason) addCenteredText(`MOTIVO: ${stripThermalEmojis(payload.cancelReason.toUpperCase())}`, FONT_SMALL, 28);
      }

      addLeftText(`DATA: ${stripThermalEmojis(payload.dateStr)}`, FONT_BODY, 31);
      addLeftText(`NOME: ${stripThermalEmojis(payload.collaboratorName.toUpperCase())}`, FONT_BOLD, 33);
      (payload.extraMeta || []).forEach((m) => addLeftText(stripThermalEmojis(m), FONT_BODY, 30));

      if (payload.lines.length > 0) {
        addDashedRule();
        if (!payload.hideItemHeader) {
          addCenteredText("MATERIAL | PESO | VALOR", FONT_BOLD, 32);
          addDashedRule();
        }
        payload.lines.forEach((ln) => {
          addLeftText(stripThermalEmojis(ln.left), FONT_BOLD, 32);
          addLeftText(`= ${stripThermalEmojis(ln.right)}`, FONT_BIG, 34);
          y += 2;
        });
      }

      addDashedRule();
      payload.summaryLines.forEach((s) => {
        const cleanLabel = stripThermalEmojis(s.label);
        const cleanVal = stripThermalEmojis(s.value);
        if (s.big) {
          addSolidRule();
          addKeyValueRow(cleanLabel, cleanVal, FONT_TITLE, 38, Boolean(s.strike));
          addSolidRule();
        } else {
          addKeyValueRow(cleanLabel, cleanVal, s.bold ? FONT_BOLD : FONT_BODY, 32);
        }
      });

      addDashedRule();
      addCenteredText("OBRIGADO PELA PREFERÊNCIA!", FONT_BOLD, 32);
      addCenteredText(
        payload.isCancelled
          ? "DOCUMENTO ESTORNADO - SEM VALOR"
          : stripThermalEmojis(payload.footerNote || "Pasta do colaborador atualizada!"),
        FONT_BODY,
        29
      );
      y += 14;
      return;
    }

    addBoxedBanner(viaLabel, FONT_BOLD);
    if (payload.isCancelled) {
      addCenteredText("*** COMPRA CANCELADA / ESTORNADA ***", FONT_BIG, 30, true);
      if (payload.cancelledAt) addCenteredText(`EM: ${payload.cancelledAt}`, FONT_SMALL, 22);
      if (payload.cancelReason) addCenteredText(`MOTIVO: ${payload.cancelReason.toUpperCase()}`, FONT_SMALL, 22);
    }

    addCenteredText(storeTitle.toUpperCase(), FONT_TITLE, 32);
    if (storeCnpj) addCenteredText(`CNPJ/CPF: ${storeCnpj}`, FONT_SMALL, 22);
    addBoxedBanner(payload.title, FONT_BOLD);
    if (payload.subtitle) addCenteredText(payload.subtitle, FONT_SMALL, 22);

    addDashedRule();
    addLeftText(`DATA: ${payload.dateStr}`, FONT_SMALL, 23);
    addLeftText(`DOC: ${payload.ticketId.slice(-8).toUpperCase()}`, FONT_SMALL, 23);
    addLeftText(`PARCEIRO: ${payload.collaboratorName.toUpperCase()}`, FONT_BOLD, 25);
    addLeftText(
      `STATUS: ${payload.isCancelled ? "CANCELADA / ESTORNADA" : payload.statusLabel.toUpperCase()}`,
      FONT_BOLD,
      25
    );
    (payload.extraMeta || []).forEach((m) => addLeftText(m, FONT_SMALL, 23));

    addDashedRule();
    if (!payload.hideItemHeader) {
      addKeyValueRow("MATERIAL / PESO", "VALOR", FONT_BOLD, 26);
      addDashedRule();
    }

    payload.lines.forEach((ln) => {
      addKeyValueRow(ln.left, ln.right, ln.bold !== false ? FONT_BOLD : FONT_BODY, 25);
      if (ln.detail) {
        addLeftText(ln.detail, FONT_SMALL, 22);
      }
    });

    addDashedRule();
    payload.summaryLines.forEach((s) => {
      if (s.big) {
        addSolidRule();
        addKeyValueRow(s.label, s.value, FONT_BIG, 32, Boolean(s.strike));
        addSolidRule();
      } else {
        addKeyValueRow(s.label, s.value, s.bold ? FONT_BOLD : FONT_SMALL, 25);
      }
    });

    if (payload.caderninhoBox) {
      y += 4;
      const boxStartY = y;
      if (payload.caderninhoBox.isFounder) {
        addCenteredText("ACUMULADO - COLETA PRÓPRIA", FONT_BOLD, 26);
        if (typeof payload.caderninhoBox.totalBottles === "number" && payload.caderninhoBox.totalBottles > 0) {
          addKeyValueRow("GARRAFAS ACUM.:", `${payload.caderninhoBox.totalBottles} un`, FONT_BOLD, 26);
        }
        if (typeof payload.caderninhoBox.totalWeightKg === "number") {
          addKeyValueRow(
            `PESO (${payload.caderninhoBox.totalDeliveries || 0} ENT.):`,
            `${payload.caderninhoBox.totalWeightKg.toFixed(2).replace(".", ",")} kg`,
            FONT_BOLD,
            26
          );
        }
        addKeyValueRow(
          "ECONOMIA ACUM.:",
          `R$ ${payload.caderninhoBox.totalEarned.toFixed(2).replace(".", ",")}`,
          FONT_BOLD,
          26
        );
      } else {
        addCenteredText("CONFERÊNCIA DO CADERNINHO", FONT_BOLD, 26);
        addKeyValueRow(
          "TOTAL COMPRADO:",
          `R$ ${payload.caderninhoBox.totalEarned.toFixed(2).replace(".", ",")}`,
          FONT_BODY,
          25
        );
        addKeyValueRow(
          "TOTAL JÁ PAGO:",
          `R$ ${payload.caderninhoBox.totalPaid.toFixed(2).replace(".", ",")}`,
          FONT_BODY,
          25
        );
        addKeyValueRow(
          "SALDO A ACERTAR:",
          `R$ ${payload.caderninhoBox.balancePending.toFixed(2).replace(".", ",")}`,
          FONT_BIG,
          30
        );
        if (typeof payload.caderninhoBox.totalBottles === "number" && payload.caderninhoBox.totalBottles > 0) {
          addKeyValueRow("GARRAFAS ACUM.:", `${payload.caderninhoBox.totalBottles} un`, FONT_BOLD, 25);
        }
        if (typeof payload.caderninhoBox.totalWeightKg === "number") {
          addLeftText(
            `PESO ACUMULADO: ${payload.caderninhoBox.totalWeightKg.toFixed(2).replace(".", ",")} kg (${payload.caderninhoBox.totalDeliveries || 0} entregas)`,
            FONT_SMALL,
            22
          );
        }
        addLeftText("[ ] Grampeado Empresa   [ ] Conferido", FONT_SMALL, 22);
      }
      const boxEndY = y + 4;
      cmds.push((c) => {
        c.strokeStyle = "#000000";
        c.lineWidth = 3;
        c.strokeRect(PAD, boxStartY - 4, INNER_W, boxEndY - boxStartY + 6);
      });
      y += 10;
    }

    addDashedRule();
    addCenteredText(storeTitle.toUpperCase(), FONT_BOLD, 25);
    addCenteredText(
      payload.isCancelled
        ? "DOCUMENTO ESTORNADO - SEM VALOR"
        : payload.footerNote || "Conferido e salvo na pasta do colaborador!",
      FONT_SMALL,
      22
    );
    y += 12;
  };

  if (payload.copies === 2) {
    drawSingleVia(isCompact ? "1ª VIA - EMPRESA" : "1ª VIA - CONTROLE EMPRESA / CADERNINHO (GRAMPEAR)");
    y += 6;
    addDashedRule();
    addCenteredText(isCompact ? "CORTAR AQUI" : "✂  CORTAR / DESTACAR / GRAMPEAR AQUI  ✂", FONT_BOLD, 28);
    addDashedRule();
    y += 10;
    drawSingleVia(isCompact ? "2ª VIA - COLABORADOR" : "2ª VIA - VIA DO RECICLADOR (CONFERÊNCIA)");
  } else {
    drawSingleVia(payload.singleViaBanner || (isCompact ? "VIA ÚNICA" : "VIA ÚNICA - CONTROLE RECICLAGEM"));
  }

  y += 28;

  const finalCanvas = document.createElement("canvas");
  finalCanvas.width = W;
  finalCanvas.height = Math.max(240, y);
  const fCtx = finalCanvas.getContext("2d");
  if (!fCtx) {
    throw new Error("Não foi possível inicializar imagem para Fun Print.");
  }
  fCtx.fillStyle = "#FFFFFF";
  fCtx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
  fCtx.fillStyle = "#000000";
  for (const cmd of cmds) {
    cmd(fCtx);
  }

  return await new Promise<Blob>((resolve, reject) => {
    finalCanvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Falha ao gerar PNG 57mm."));
    }, "image/png");
  });
}

export function downloadReceiptPngDirect(blob: Blob, filename: string): string {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = safeName;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 8000);
  return safeName;
}

export function buildPdvTransactionThermalPayload(
  tx: PDVTransaction,
  storeName?: string,
  storeCnpjCpf?: string,
  copies?: 1 | 2
): ThermalCanvasReceiptPayload {
  const cfg = loadPrinterConfig();
  const prof = loadCompanyProfile();
  const resolvedStore =
    cfg.showNameOnReceipt === false
      ? ""
      : (storeName || cfg.storeName || prof.name || "MEU ESTABELECIMENTO").trim();
  const resolvedCnpj =
    cfg.showCnpjOnReceipt === false
      ? ""
      : (storeCnpjCpf || cfg.storeCnpjCpf || prof.cnpjCpf || "").trim();
  const resolvedCopies: 1 | 2 = copies !== undefined ? copies : cfg.printTwoCopies ? 2 : 1;

  const extraMeta: string[] = [];
  if (cfg.showPhoneOnReceipt !== false && cfg.storePhone) {
    extraMeta.push(`TEL: ${cfg.storePhone}`);
  }
  if (cfg.showAddressOnReceipt !== false && cfg.storeAddress) {
    extraMeta.push(`END: ${cfg.storeAddress}`);
  }

  const lines: ThermalCanvasReceiptPayload["lines"] =
    tx.items && tx.items.length > 0
      ? tx.items.map((it) => ({
          left: `${it.quantity}${it.unit || "un"} × ${String(it.name || "").toUpperCase()}`,
          right: `R$ ${(Number(it.price || 0) * Number(it.quantity || 1)).toFixed(2).replace(".", ",")}`,
          detail: `Unitário: R$ ${Number(it.price || 0).toFixed(2).replace(".", ",")}`,
          bold: true
        }))
      : [
          {
            left: String(tx.description || "VENDA BALCÃO").toUpperCase(),
            right: `R$ ${Number(tx.amount || 0).toFixed(2).replace(".", ",")}`,
            bold: true
          }
        ];

  const summaryLines: ThermalCanvasReceiptPayload["summaryLines"] = [
    {
      label: "TOTAL DA VENDA:",
      value: `R$ ${Number(tx.amount || 0).toFixed(2).replace(".", ",")}`,
      big: true,
      bold: true
    }
  ];

  if ((tx as any).splitDetails) {
    const sd = (tx as any).splitDetails;
    summaryLines.push({
      label: `1ª (${String(sd.method1 || "DINHEIRO").toUpperCase()}):`,
      value: `R$ ${Number(sd.amount1 || 0).toFixed(2).replace(".", ",")}`
    });
    summaryLines.push({
      label: `2ª (${String(sd.method2 || "PIX").toUpperCase().replace("_", " ")}):`,
      value: `R$ ${Number(sd.amount2 || 0).toFixed(2).replace(".", ",")}`
    });
  }

  if ((tx.paymentMethod === "dinheiro" || tx.paymentMethod === "misto") && tx.amountPaid && tx.amountPaid > 0) {
    summaryLines.push({
      label: "VALOR RECEBIDO:",
      value: `R$ ${Number(tx.amountPaid).toFixed(2).replace(".", ",")}`
    });
    summaryLines.push({
      label: "TROCO:",
      value: `R$ ${Number(tx.changeAmount || 0).toFixed(2).replace(".", ",")}`,
      bold: true
    });
  }

  return {
    title: "COMPROVANTE DE VENDA - PDV",
    subtitle: "DOCUMENTO SEM VALOR FISCAL",
    storeName: resolvedStore,
    storeCnpj: resolvedCnpj,
    dateStr: tx.date || new Date().toLocaleString("pt-BR"),
    ticketId: tx.id,
    collaboratorName: tx.clientName?.trim() || "Consumidor Balcão",
    statusLabel: `PAGAMENTO: ${tx.paymentMethod === "misto" ? "2 FORMAS (MISTO)" : String(tx.paymentMethod || "dinheiro").toUpperCase().replace("_", " ")}`,
    extraMeta: extraMeta.length > 0 ? extraMeta : undefined,
    lines,
    summaryLines,
    footerNote: cfg.receiptFooterMsg || "Obrigado pela preferência! Volte sempre!",
    singleViaBanner: "VIA ÚNICA - COMPROVANTE PDV",
    copies: resolvedCopies
  };
}

export async function shareOrDownloadReceiptPng(
  blob: Blob,
  filename: string,
  title: string,
  forceDownload = false
): Promise<"shared" | "downloaded"> {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  if (!forceDownload) {
    try {
      const nav: any = typeof navigator !== "undefined" ? navigator : null;
      if (nav && typeof nav.share === "function") {
        const file = new File([blob], safeName, { type: "image/png" });
        if (!nav.canShare || nav.canShare({ files: [file] })) {
          await nav.share({
            files: [file],
            title
          });
          return "shared";
        }
      }
    } catch (err: any) {
      if (err?.name === "AbortError") {
        return "shared";
      }
    }
  }

  downloadReceiptPngDirect(blob, safeName);
  return "downloaded";
}
