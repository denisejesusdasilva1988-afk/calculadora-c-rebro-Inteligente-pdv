import { PDVTransaction } from "../components/PDVModule";

export interface PrinterConfig {
  printerType: "58mm" | "80mm" | "A4";
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
  receiptFooterMsg: string;
}

export const DEFAULT_PRINTER_CONFIG: PrinterConfig = {
  printerType: "80mm",
  feedLines: 4,
  fontSize: "media",
  highContrast: false,
  autoCut: true,
  openDrawer: true,
  printTwoCopies: false,
  showQrCode: true,
  autoPrintOnSale: false,
  storeName: "",
  storeCnpjCpf: "",
  storePhone: "",
  storeAddress: "",
  receiptFooterMsg: "Obrigado pela preferência! Volte sempre! 🛒✨"
};

export function loadPrinterConfig(): PrinterConfig {
  try {
    const saved = localStorage.getItem("pdv_printer_full_config");
    if (saved) {
      return { ...DEFAULT_PRINTER_CONFIG, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.warn("Erro ao carregar pdv_printer_full_config:", e);
  }

  // Fallback to legacy single keys
  return {
    ...DEFAULT_PRINTER_CONFIG,
    printerType: (localStorage.getItem("pdv_printer_type") as any) || "80mm",
    feedLines: parseInt(localStorage.getItem("pdv_printer_feed_lines") || "4", 10),
    fontSize: (localStorage.getItem("pdv_printer_font_size") as any) || "media",
    highContrast: localStorage.getItem("pdv_printer_high_contrast") === "true",
    autoCut: localStorage.getItem("pdv_printer_auto_cut") !== "false",
    openDrawer: localStorage.getItem("pdv_printer_open_drawer") !== "false",
    printTwoCopies: localStorage.getItem("pdv_printer_two_copies") === "true",
    showQrCode: localStorage.getItem("pdv_printer_show_qrcode") !== "false",
    autoPrintOnSale: localStorage.getItem("pdv_printer_auto_print_on_sale") === "true",
    storeName: localStorage.getItem("pdv_store_custom_name") || "",
    storeCnpjCpf: localStorage.getItem("pdv_store_cnpj_cpf") || "",
    storePhone: localStorage.getItem("pdv_store_phone") || "",
    storeAddress: localStorage.getItem("pdv_store_address") || "",
    receiptFooterMsg: localStorage.getItem("pdv_receipt_footer_msg") || DEFAULT_PRINTER_CONFIG.receiptFooterMsg
  };
}

export function savePrinterConfig(config: PrinterConfig) {
  try {
    localStorage.setItem("pdv_printer_full_config", JSON.stringify(config));
    localStorage.setItem("pdv_printer_type", config.printerType);
    localStorage.setItem("pdv_printer_feed_lines", config.feedLines.toString());
    localStorage.setItem("pdv_printer_font_size", config.fontSize);
    localStorage.setItem("pdv_printer_high_contrast", config.highContrast ? "true" : "false");
    localStorage.setItem("pdv_printer_auto_cut", config.autoCut ? "true" : "false");
    localStorage.setItem("pdv_printer_open_drawer", config.openDrawer ? "true" : "false");
    localStorage.setItem("pdv_printer_two_copies", config.printTwoCopies ? "true" : "false");
    localStorage.setItem("pdv_printer_show_qrcode", config.showQrCode ? "true" : "false");
    localStorage.setItem("pdv_printer_auto_print_on_sale", config.autoPrintOnSale ? "true" : "false");
    localStorage.setItem("pdv_store_custom_name", config.storeName);
    localStorage.setItem("pdv_store_cnpj_cpf", config.storeCnpjCpf);
    if (config.storePhone) localStorage.setItem("pdv_store_phone", config.storePhone);
    if (config.storeAddress) localStorage.setItem("pdv_store_address", config.storeAddress);
    localStorage.setItem("pdv_receipt_footer_msg", config.receiptFooterMsg);
  } catch (e) {
    console.warn("Erro ao salvar pdv_printer_full_config:", e);
  }
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
  const is58mm = config.printerType === "58mm";
  const isA4 = config.printerType === "A4";

  const printableWidth = is58mm ? "48mm" : isA4 ? "100%" : "72mm";
  const maxContainerWidth = is58mm ? "48mm" : isA4 ? "800px" : "72mm";
  const pageSize = is58mm ? "58mm auto" : isA4 ? "A4 portrait" : "80mm auto";

  // Font sizing based on configuration
  const fontBasePx = config.fontSize === "pequena" ? (is58mm ? 9.5 : 10.5) : config.fontSize === "grande" ? (is58mm ? 12 : 13.5) : (is58mm ? 10.5 : 11.5);
  const fontHeaderPx = fontBasePx + 2.5;
  const fontSmallPx = fontBasePx - 2;

  const contrastWeight = config.highContrast ? "700" : "500";
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
          const itemTotal = (it.price * it.quantity).toFixed(2).replace(".", ",");
          const unitPrice = it.price.toFixed(2).replace(".", ",");

          return `
            <tr>
              <td colspan="3" style="padding-top: 3px; font-weight: ${boldWeight}; font-size: ${fontBasePx}px; word-break: break-word;">
                ${qk}${it.name.toUpperCase()}
              </td>
            </tr>
            <tr style="border-bottom: 1px dotted #444;">
              <td style="padding-bottom: 4px; font-size: ${fontSmallPx}px; color: #000;">
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
          <div style="font-size: ${fontHeaderPx}px; font-weight: ${boldWeight}; line-height: 1.2; text-transform: uppercase;">
            ${storeTitle}
          </div>
          ${storeCnpj ? `<div style="font-size: ${fontSmallPx}px; font-weight: ${contrastWeight}; margin-top: 2px;">CNPJ/CPF: ${storeCnpj}</div>` : ''}
          ${storeAddr ? `<div style="font-size: ${fontSmallPx}px; margin-top: 1px;">${storeAddr}</div>` : ''}
          ${storePhone ? `<div style="font-size: ${fontSmallPx}px; margin-top: 1px;">TEL: ${storePhone}</div>` : ''}
          <div style="font-size: ${fontSmallPx}px; font-weight: ${boldWeight}; margin-top: 3px; text-transform: uppercase;">
            ${isTest ? '*** COMPROVANTE DE TESTE DA BOBINA ***' : 'CUPOM DE VENDA / REGISTRO COMERCIAL'}
          </div>
        </div>

        <!-- Meta info -->
        <div style="border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 4px 0; margin: 4px 0; font-size: ${fontSmallPx}px; line-height: 1.3;">
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
            <span style="font-weight: ${boldWeight}; text-transform: uppercase;">${effectiveTx.paymentMethod.replace("_", " ")}</span>
          </div>

          <div style="display: flex; justify-content: space-between; font-size: ${fontHeaderPx}px; font-weight: ${boldWeight}; margin: 3px 0; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 3px 0;">
            <span>TOTAL R$:</span>
            <span style="font-family: monospace;">R$ ${subtotalFormatted}</span>
          </div>

          ${effectiveTx.paymentMethod === 'dinheiro' && effectiveTx.amountPaid && effectiveTx.amountPaid > 0 ? `
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
            font-family: 'Courier New', Courier, 'Lucida Console', Monaco, monospace;
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

      setTimeout(() => {
        try {
          printFrame.contentWindow?.focus();
          printFrame.contentWindow?.print();
          if (onSuccess) onSuccess();
        } catch (e) {
          console.warn("Falha no printFrame, usando fallback:", e);
          fallbackWindowPrint(fullHtml, onSuccess, onError);
        }
      }, 350);
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

    // Build raw ESC/POS commands
    const encoder = new TextEncoder();
    const chunks: Uint8Array[] = [];

    // Init ESC @
    chunks.push(new Uint8Array([0x1B, 0x40]));

    // Drawer kick if configured: ESC p 0 25 250
    if (config.openDrawer) {
      chunks.push(new Uint8Array([0x1B, 0x70, 0x00, 0x19, 0xFA]));
    }

    // Align Center: ESC a 1
    chunks.push(new Uint8Array([0x1B, 0x61, 0x01]));
    // Double height/width header: ESC ! 0x30
    chunks.push(new Uint8Array([0x1B, 0x21, 0x30]));
    chunks.push(encoder.encode((config.storeName || "ESTABELECIMENTO").toUpperCase() + "\n"));

    // Reset font: ESC ! 0x00
    chunks.push(new Uint8Array([0x1B, 0x21, 0x00]));
    if (config.storeCnpjCpf) {
      chunks.push(encoder.encode(`CNPJ/CPF: ${config.storeCnpjCpf}\n`));
    }
    if (config.storePhone) {
      chunks.push(encoder.encode(`TEL: ${config.storePhone}\n`));
    }
    chunks.push(encoder.encode("CUPOM DE VENDA / REGISTRO FISCAL\n"));

    const divider = config.printerType === "58mm" ? "--------------------------------\n" : "------------------------------------------------\n";
    chunks.push(encoder.encode(divider));

    // Align Left: ESC a 0
    chunks.push(new Uint8Array([0x1B, 0x61, 0x00]));

    const targetTx = tx || {
      id: "TESTE_" + Math.floor(100000 + Math.random() * 900000),
      amount: 38.50,
      paymentMethod: "dinheiro",
      date: new Date().toLocaleDateString("pt-BR") + " " + new Date().toLocaleTimeString("pt-BR"),
      clientName: "CLIENTE TESTE",
      items: [
        { name: "PAO FRANCES", price: 1.20, quantity: 5, unit: "un" },
        { name: "REFRIGERANTE LATA", price: 5.50, quantity: 2, unit: "un" }
      ]
    };

    chunks.push(encoder.encode(`DATA: ${targetTx.date}\n`));
    chunks.push(encoder.encode(`ID: ${targetTx.id.slice(-8).toUpperCase()}\n`));
    if (targetTx.clientName) {
      chunks.push(encoder.encode(`CLIENTE: ${targetTx.clientName.toUpperCase()}\n`));
    }
    chunks.push(encoder.encode(divider));

    // Items
    if (targetTx.items && targetTx.items.length > 0) {
      for (const item of targetTx.items) {
        const line = `${item.quantity} ${item.unit || "un"} x R$ ${item.price.toFixed(2)} - ${item.name}\n`;
        const totalLine = `   TOTAL: R$ ${(item.price * item.quantity).toFixed(2)}\n`;
        chunks.push(encoder.encode(line));
        chunks.push(encoder.encode(totalLine));
      }
    }

    chunks.push(encoder.encode(divider));

    // Total: Bold and Big
    chunks.push(new Uint8Array([0x1B, 0x45, 0x01])); // Bold on
    chunks.push(encoder.encode(`FORMA PGTO: ${targetTx.paymentMethod.toUpperCase()}\n`));
    chunks.push(encoder.encode(`TOTAL R$: ${targetTx.amount.toFixed(2)}\n`));
    chunks.push(new Uint8Array([0x1B, 0x45, 0x00])); // Bold off

    chunks.push(encoder.encode(divider));

    // Align Center
    chunks.push(new Uint8Array([0x1B, 0x61, 0x01]));
    chunks.push(encoder.encode(`${config.receiptFooterMsg || "Obrigado pela preferência!"}\n`));
    chunks.push(encoder.encode("SISTEMA GESTAO PROTEGIDA\n"));

    // Feed lines: ESC d n
    const feed = Math.min(Math.max(config.feedLines || 4, 2), 8);
    chunks.push(new Uint8Array([0x1B, 0x64, feed]));

    // Auto Cut if configured: GS V 0
    if (config.autoCut) {
      chunks.push(new Uint8Array([0x1D, 0x56, 0x00]));
    }

    if (onStatus) onStatus("Transmitindo dados para a bobina...");

    // Send chunks in 20-byte packets to prevent BLE buffer overflow
    const fullBuffer = new Uint8Array(chunks.reduce((acc, c) => acc + c.length, 0));
    let offset = 0;
    for (const c of chunks) {
      fullBuffer.set(c, offset);
      offset += c.length;
    }

    const CHUNK_SIZE = 50;
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
