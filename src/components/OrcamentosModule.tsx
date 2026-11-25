import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  getScopedItem,
  setScopedItem
} from "../utils/userScopedStorage";
import {
  FileText,
  Printer,
  Download,
  Send,
  Share2,
  Copy,
  Plus,
  Minus,
  Folder,
  Package,
  Search,
  Trash2,
  Edit3,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  ShoppingCart,
  User,
  Phone,
  Calendar,
  DollarSign,
  Percent,
  ShieldCheck,
  Check,
  ExternalLink,
  Eye,
  RefreshCw,
  FileCheck,
  HelpCircle,
  ChevronRight,
  ArrowLeft,
  Tag,
  Building,
  MapPin,
  Mail,
  Award
} from "lucide-react";
import { CustomProduct, Orcamento, OrcamentoItem } from "../types";
import {
  loadPrinterConfig,
  executeThermalPrint,
  generateMiniPrint57mmPngBlob,
  shareOrDownloadReceiptPng,
  ThermalCanvasReceiptPayload
} from "../utils/thermalPrinterHelper";

interface OrcamentosModuleProps {
  customProducts: CustomProduct[];
  formatCurrency: (value: number) => string;
  showNotification: (message: string, type: "success" | "error" | "info" | "warning") => void;
  onLoadIntoCart?: (items: { name: string; price: number; quantity: number; unit?: string }[], customerName?: string) => void;
  storeInfo?: {
    name?: string;
    phone?: string;
    address?: string;
    cnpj?: string;
  };
  onBackToPDV?: () => void;
  initialItems?: { name: string; price: number; quantity: number; unit?: string }[];
  initialClientName?: string;
  userId?: string;
}

const STORAGE_KEY = "pdv_orcamentos_data";

export function OrcamentosModule({
  customProducts,
  formatCurrency,
  showNotification,
  onLoadIntoCart,
  storeInfo = {},
  onBackToPDV,
  initialItems,
  initialClientName,
  userId
}: OrcamentosModuleProps) {
  // Store details synced with saved printer/company config
  const savedPrinterCfg = loadPrinterConfig();
  const storeName = storeInfo.name || getScopedItem("pdv_store_custom_name", userId) || savedPrinterCfg.storeName || "MEU ESTABELECIMENTO";
  const storePhone = storeInfo.phone || getScopedItem("pdv_store_custom_phone", userId) || savedPrinterCfg.storePhone || "";
  const storeAddress = storeInfo.address || getScopedItem("pdv_store_custom_address", userId) || savedPrinterCfg.storeAddress || "";
  const storeCnpj = storeInfo.cnpj || getScopedItem("pdv_store_custom_cnpj", userId) || getScopedItem("pdv_store_cnpj_cpf", userId) || savedPrinterCfg.storeCnpjCpf || "";

  // List of quotes
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>(() => {
    try {
      const saved = getScopedItem(STORAGE_KEY, userId);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Erro ao carregar orçamentos:", e);
    }
    return [];
  });

  // Reload orcamentos when userId changes
  useEffect(() => {
    try {
      const saved = getScopedItem(STORAGE_KEY, userId);
      if (saved) {
        setOrcamentos(JSON.parse(saved));
      } else {
        setOrcamentos([]);
      }
    } catch {}
  }, [userId]);

  // Save to scoped storage on change
  useEffect(() => {
    try {
      setScopedItem(STORAGE_KEY, JSON.stringify(orcamentos), userId);
    } catch (e) {
      console.warn("Erro ao salvar orçamentos:", e);
    }
  }, [orcamentos, userId]);

  // Tab state within OrcamentosModule
  const [activeTab, setActiveTab] = useState<"lista" | "novo">("lista");
  const [editingOrcamentoId, setEditingOrcamentoId] = useState<string | null>(null);

  // Modal viewing & printing quote
  const [viewingOrcamento, setViewingOrcamento] = useState<Orcamento | null>(null);
  const [printPaperWidth, setPrintPaperWidth] = useState<"58mm" | "80mm" | "a4">("80mm");

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pendente" | "aprovado" | "recusado" | "convertido">("all");

  // FORM STATES FOR CREATING / EDITING ORÇAMENTO
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientDoc, setClientDoc] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [sellerName, setSellerName] = useState(() => {
    return localStorage.getItem("pdv_gestao_user_staff_name") || "Atendente";
  });
  const [validityDays, setValidityDays] = useState<number>(7);
  const [formItems, setFormItems] = useState<OrcamentoItem[]>([]);
  const [discountTotalStr, setDiscountTotalStr] = useState("");
  const [shippingFeesStr, setShippingFeesStr] = useState("");
  const [paymentConditions, setPaymentConditions] = useState("À vista (Dinheiro / PIX) ou Cartão de Crédito");
  const [deliveryTerms, setDeliveryTerms] = useState("Pronta entrega / Retirada no balcão");
  const [warrantyTerms, setWarrantyTerms] = useState("Garantia legal de 90 dias conforme CDC");
  const [generalNotes, setGeneralNotes] = useState("Este orçamento não constitui reserva de estoque nem documento fiscal. Valores sujeitos à alteração após o vencimento da proposta.");

  // ITEM INPUT STATES (To add items into formItems)
  const [searchCatalogQuery, setSearchCatalogQuery] = useState("");
  const [itemInputName, setItemInputName] = useState("");
  const [itemInputPrice, setItemInputPrice] = useState("");
  const [itemInputQty, setItemInputQty] = useState("1");
  const [itemInputUnit, setItemInputUnit] = useState("un");
  const [itemInputDiscount, setItemInputDiscount] = useState("");
  const [itemInputDetails, setItemInputDetails] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<string | undefined>(undefined);
  const [showCatalogDropdown, setShowCatalogDropdown] = useState(false);

  // Auto-load items if passed from PDV cart
  useEffect(() => {
    if (initialItems && initialItems.length > 0) {
      const converted: OrcamentoItem[] = initialItems.map((it, idx) => ({
        id: "item_init_" + idx + "_" + Date.now(),
        name: it.name,
        quantity: it.quantity,
        unitPrice: it.price,
        discount: 0,
        total: it.price * it.quantity,
        unit: it.unit || "un"
      }));
      setFormItems(converted);
      if (initialClientName) {
        setClientName(initialClientName);
      }
      setActiveTab("novo");
      showNotification(`Carrinho importado para novo orçamento com ${initialItems.length} itens! 📄`, "info");
    }
  }, [initialItems, initialClientName]);

  // Filter catalog products for autocomplete
  const catalogSuggestions = useMemo(() => {
    if (!searchCatalogQuery.trim()) return [];
    const q = searchCatalogQuery.toLowerCase().trim();
    return customProducts
      .filter(p => p.name.toLowerCase().includes(q) || p.barcode?.includes(q) || p.quickCode?.includes(q) || p.category?.toLowerCase().includes(q))
      .slice(0, 10);
  }, [searchCatalogQuery, customProducts]);

  // Handle selecting a catalog item
  const handleSelectCatalogItem = (prod: CustomProduct) => {
    setSelectedProductId(prod.id);
    setItemInputName(prod.name);
    setItemInputPrice(prod.price.toFixed(2).replace(".", ","));
    setItemInputUnit(prod.unit || "un");
    setSearchCatalogQuery("");
    setShowCatalogDropdown(false);
  };

  // Catalog Modal States
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [catalogModalCategory, setCatalogModalCategory] = useState<string>("all");
  const [catalogModalSearch, setCatalogModalSearch] = useState<string>("");

  // Categories list for catalog modal
  const distinctCategories = useMemo(() => {
    const set = new Set<string>();
    customProducts.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).sort();
  }, [customProducts]);

  // Direct Add Product to Quote Form without touching stock
  const handleDirectAddProductToForm = (prod: CustomProduct) => {
    setFormItems(prev => {
      const existsIndex = prev.findIndex(it => it.name.toUpperCase() === prod.name.toUpperCase() || (it.productId && it.productId === prod.id));
      if (existsIndex >= 0) {
        return prev.map((it, idx) => {
          if (idx === existsIndex) {
            const nextQty = it.quantity + 1;
            return {
              ...it,
              quantity: nextQty,
              total: Math.max(0, (it.unitPrice * nextQty) - it.discount)
            };
          }
          return it;
        });
      }
      const newItem: OrcamentoItem = {
        id: "item_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
        productId: prod.id,
        name: prod.name.trim(),
        quantity: 1,
        unit: prod.unit || "un",
        unitPrice: prod.price,
        discount: 0,
        total: prod.price,
        details: prod.description || undefined
      };
      return [...prev, newItem];
    });
    showNotification(`+1 "${prod.name}" lançado no orçamento! (Estoque e caixa 100% protegidos) 📋✨`, "success");
  };

  // Filter products for the catalog modal
  const filteredCatalogModalProducts = useMemo(() => {
    return customProducts.filter(p => {
      const q = catalogModalSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.includes(q)) ||
        (p.quickCode && p.quickCode.includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q));

      const matchCat = catalogModalCategory === "all" || p.category === catalogModalCategory;
      return matchSearch && matchCat;
    });
  }, [customProducts, catalogModalSearch, catalogModalCategory]);

  // Parse Portuguese formatted number (ex: "1.250,50" -> 1250.50)
  const parseNum = (val: string): number => {
    if (!val) return 0;
    const clean = val.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
    const n = parseFloat(clean);
    return isNaN(n) ? 0 : n;
  };

  // Add Item to current Quote Form
  const handleAddItemToForm = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanName = itemInputName.trim();
    if (!cleanName) {
      showNotification("Digite o nome do produto ou serviço!", "warning");
      return;
    }
    const price = parseNum(itemInputPrice);
    if (price <= 0) {
      showNotification("Digite um valor unitário válido maior que zero!", "warning");
      return;
    }
    const qty = parseFloat(itemInputQty.replace(",", ".")) || 1;
    const disc = parseNum(itemInputDiscount);
    const itemTotal = Math.max(0, (price * qty) - disc);

    const newItem: OrcamentoItem = {
      id: "item_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      productId: selectedProductId,
      name: cleanName,
      quantity: qty,
      unit: itemInputUnit || "un",
      unitPrice: price,
      discount: disc,
      total: itemTotal,
      details: itemInputDetails.trim() || undefined
    };

    setFormItems(prev => [...prev, newItem]);
    
    // Clear item inputs
    setItemInputName("");
    setItemInputPrice("");
    setItemInputQty("1");
    setItemInputUnit("un");
    setItemInputDiscount("");
    setItemInputDetails("");
    setSelectedProductId(undefined);
    setSearchCatalogQuery("");

    showNotification(`"${cleanName}" adicionado ao orçamento! 🛒`, "success");
  };

  // Remove Item from Quote Form
  const handleRemoveItem = (itemId: string) => {
    setFormItems(prev => prev.filter(it => it.id !== itemId));
  };

  // Update Item Quantity in Quote Form (+ or - or direct value)
  const handleUpdateItemQty = (itemId: string, deltaOrExact: number, isExact: boolean = false) => {
    setFormItems(prev => {
      return prev.map(it => {
        if (it.id === itemId) {
          const newQty = isExact ? Math.max(0, deltaOrExact) : Math.max(0, it.quantity + deltaOrExact);
          if (newQty <= 0) return null;
          const cleanQty = Math.round(newQty * 1000) / 1000;
          const newTotal = Math.max(0, (it.unitPrice * cleanQty) - it.discount);
          return {
            ...it,
            quantity: cleanQty,
            total: newTotal
          };
        }
        return it;
      }).filter((it): it is OrcamentoItem => it !== null);
    });
  };

  // Calculate live totals for the Form
  const formCalculations = useMemo(() => {
    const subtotal = formItems.reduce((acc, it) => acc + (it.unitPrice * it.quantity), 0);
    const itemsDiscounts = formItems.reduce((acc, it) => acc + it.discount, 0);
    const generalDiscount = parseNum(discountTotalStr);
    const shipping = parseNum(shippingFeesStr);
    const totalDiscounts = itemsDiscounts + generalDiscount;
    const total = Math.max(0, subtotal - totalDiscounts + shipping);

    return {
      subtotal,
      itemsDiscounts,
      generalDiscount,
      totalDiscounts,
      shipping,
      total
    };
  }, [formItems, discountTotalStr, shippingFeesStr]);

  // Reset form
  const handleResetForm = () => {
    setClientName("");
    setClientPhone("");
    setClientDoc("");
    setClientAddress("");
    setClientEmail("");
    setValidityDays(7);
    setFormItems([]);
    setDiscountTotalStr("");
    setShippingFeesStr("");
    setPaymentConditions("À vista (Dinheiro / PIX) ou Cartão de Crédito");
    setDeliveryTerms("Pronta entrega / Retirada no balcão");
    setWarrantyTerms("Garantia legal de 90 dias conforme CDC");
    setGeneralNotes("Este orçamento não constitui reserva de estoque nem documento fiscal. Valores sujeitos à alteração após o vencimento da proposta.");
    setEditingOrcamentoId(null);
  };

  // Save Quote
  const handleSaveOrcamento = (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientName.trim()) {
      showNotification("Por favor, digite o nome do cliente ou consumidor!", "warning");
      return;
    }
    if (formItems.length === 0) {
      showNotification("Adicione pelo menos 1 item ou serviço ao orçamento!", "warning");
      return;
    }

    const now = new Date();
    const formattedDate = now.toLocaleDateString("pt-BR") + ", " + now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    
    // Calculate validity expiration date
    const expDate = new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000);
    const formattedValidUntil = expDate.toLocaleDateString("pt-BR");

    let finalCode = "";
    if (editingOrcamentoId) {
      const existing = orcamentos.find(o => o.id === editingOrcamentoId);
      finalCode = existing?.code || ("#ORC-" + String(orcamentos.length + 1).padStart(4, "0"));
    } else {
      const nextNum = orcamentos.length + 1;
      finalCode = "#ORC-" + String(nextNum).padStart(4, "0");
    }

    const newOrcamento: Orcamento = {
      id: editingOrcamentoId || ("orc_" + Date.now() + "_" + Math.floor(Math.random() * 1000)),
      code: finalCode,
      date: formattedDate,
      validUntil: formattedValidUntil,
      validityDays,
      status: editingOrcamentoId ? (orcamentos.find(o => o.id === editingOrcamentoId)?.status || "pendente") : "pendente",
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim() || undefined,
      clientDoc: clientDoc.trim() || undefined,
      clientAddress: clientAddress.trim() || undefined,
      clientEmail: clientEmail.trim() || undefined,
      sellerName: sellerName.trim() || "Atendente",
      items: formItems,
      subtotal: formCalculations.subtotal,
      discountTotal: formCalculations.totalDiscounts,
      shippingOrFees: formCalculations.shipping,
      total: formCalculations.total,
      paymentConditions: paymentConditions.trim() || undefined,
      deliveryTerms: deliveryTerms.trim() || undefined,
      warrantyTerms: warrantyTerms.trim() || undefined,
      notes: generalNotes.trim() || undefined,
      createdAt: editingOrcamentoId ? (orcamentos.find(o => o.id === editingOrcamentoId)?.createdAt || Date.now()) : Date.now(),
      updatedAt: Date.now()
    };

    let updatedList: Orcamento[];
    if (editingOrcamentoId) {
      updatedList = orcamentos.map(o => o.id === editingOrcamentoId ? newOrcamento : o);
      showNotification(`Orçamento ${newOrcamento.code} atualizado com sucesso! 📄✨`, "success");
    } else {
      updatedList = [newOrcamento, ...orcamentos];
      showNotification(`Orçamento ${newOrcamento.code} criado com sucesso! 📄✨`, "success");
    }

    setOrcamentos(updatedList);
    handleResetForm();
    setActiveTab("lista");
    // Open preview of newly created quote
    setViewingOrcamento(newOrcamento);
  };

  // Start edit quote
  const handleStartEdit = (orc: Orcamento) => {
    setEditingOrcamentoId(orc.id);
    setClientName(orc.clientName);
    setClientPhone(orc.clientPhone || "");
    setClientDoc(orc.clientDoc || "");
    setClientAddress(orc.clientAddress || "");
    setClientEmail(orc.clientEmail || "");
    setSellerName(orc.sellerName || "Atendente");
    setValidityDays(orc.validityDays || 7);
    setFormItems(orc.items || []);
    setDiscountTotalStr(orc.discountTotal ? orc.discountTotal.toFixed(2).replace(".", ",") : "");
    setShippingFeesStr(orc.shippingOrFees ? orc.shippingOrFees.toFixed(2).replace(".", ",") : "");
    setPaymentConditions(orc.paymentConditions || "À vista (Dinheiro / PIX) ou Cartão de Crédito");
    setDeliveryTerms(orc.deliveryTerms || "Pronta entrega / Retirada no balcão");
    setWarrantyTerms(orc.warrantyTerms || "Garantia legal de 90 dias conforme CDC");
    setGeneralNotes(orc.notes || "");
    setActiveTab("novo");
  };

  // Duplicate quote
  const handleDuplicate = (orc: Orcamento) => {
    setEditingOrcamentoId(null);
    setClientName(orc.clientName + " (Cópia)");
    setClientPhone(orc.clientPhone || "");
    setClientDoc(orc.clientDoc || "");
    setClientAddress(orc.clientAddress || "");
    setClientEmail(orc.clientEmail || "");
    setSellerName(orc.sellerName || "Atendente");
    setValidityDays(orc.validityDays || 7);
    setFormItems(orc.items.map(it => ({ ...it, id: "item_" + Date.now() + "_" + Math.floor(Math.random() * 1000) })));
    setDiscountTotalStr(orc.discountTotal ? orc.discountTotal.toFixed(2).replace(".", ",") : "");
    setShippingFeesStr(orc.shippingOrFees ? orc.shippingOrFees.toFixed(2).replace(".", ",") : "");
    setPaymentConditions(orc.paymentConditions || "");
    setDeliveryTerms(orc.deliveryTerms || "");
    setWarrantyTerms(orc.warrantyTerms || "");
    setGeneralNotes(orc.notes || "");
    setActiveTab("novo");
    showNotification("Orçamento duplicado no formulário! Edite e salve quando quiser. 📋✨", "info");
  };

  // Delete quote
  const handleDeleteOrcamento = (id: string, code: string) => {
    if (confirm(`Tem certeza que deseja excluir o orçamento ${code}?`)) {
      setOrcamentos(prev => prev.filter(o => o.id !== id));
      if (viewingOrcamento?.id === id) {
        setViewingOrcamento(null);
      }
      showNotification(`Orçamento ${code} removido.`, "info");
    }
  };

  // Update Status
  const handleUpdateStatus = (id: string, newStatus: Orcamento["status"]) => {
    setOrcamentos(prev => prev.map(o => o.id === id ? { ...o, status: newStatus, updatedAt: Date.now() } : o));
    if (viewingOrcamento && viewingOrcamento.id === id) {
      setViewingOrcamento({ ...viewingOrcamento, status: newStatus });
    }
    const statusLabels: Record<string, string> = {
      pendente: "Em Aberto / Pendente ⏳",
      aprovado: "Aprovado pelo Cliente ✅",
      recusado: "Recusado / Vencido ❌",
      convertido: "Convertido em Venda 🛒"
    };
    showNotification(`Status alterado para: ${statusLabels[newStatus]}`, "info");
  };

  // Load into PDV Cart (Convert to sale)
  const handleLoadIntoPDVCart = (orc: Orcamento) => {
    if (!onLoadIntoCart) {
      showNotification("Função de carregamento no caixa indisponível.", "warning");
      return;
    }
    if (confirm(`Deseja carregar os itens do orçamento ${orc.code} no carrinho do PDV para concretizar a venda no caixa? (Isso NÃO baixa o estoque agora; a baixa ocorrerá apenas quando você finalizar a venda no caixa).`)) {
      const itemsToLoad = orc.items.map(it => ({
        name: it.name,
        price: it.unitPrice,
        quantity: it.quantity,
        unit: it.unit
      }));
      onLoadIntoCart(itemsToLoad, orc.clientName);
      handleUpdateStatus(orc.id, "convertido");
      showNotification(`Itens do orçamento ${orc.code} carregados no caixa do PDV! 🛒`, "success");
      if (onBackToPDV) onBackToPDV();
    }
  };

  // Generate WhatsApp Message text for Quote
  const generateWhatsAppQuoteText = (orc: Orcamento): string => {
    let msg = `*📋 ORÇAMENTO / PROPOSTA COMERCIAL - ${orc.code}*\n`;
    msg += `*${storeName.toUpperCase()}*\n`;
    if (storePhone) msg += `📞 Contato: ${storePhone}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `👤 *Cliente:* ${orc.clientName}\n`;
    msg += `📅 *Emissão:* ${orc.date}\n`;
    msg += `⏳ *Validade:* Válido até ${orc.validUntil}\n`;
    if (orc.sellerName) msg += `👨‍💼 *Atendente:* ${orc.sellerName}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `*ITENS COTADOS:*\n`;

    orc.items.forEach((it, idx) => {
      msg += `${idx + 1}. *${it.name}*\n`;
      msg += `   ${it.quantity} ${it.unit} x ${formatCurrency(it.unitPrice)}`;
      if (it.discount > 0) msg += ` (-${formatCurrency(it.discount)})`;
      msg += ` = *${formatCurrency(it.total)}*\n`;
      if (it.details) msg += `   _Obs: ${it.details}_\n`;
    });

    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `*Subtotal:* ${formatCurrency(orc.subtotal)}\n`;
    if (orc.discountTotal > 0) msg += `*Desconto:* -${formatCurrency(orc.discountTotal)}\n`;
    if (orc.shippingOrFees > 0) msg += `*Frete/Taxas:* +${formatCurrency(orc.shippingOrFees)}\n`;
    msg += `💰 *TOTAL DO ORÇAMENTO:* *${formatCurrency(orc.total)}*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;

    if (orc.paymentConditions) msg += `💳 *Formas de Pagamento:* ${orc.paymentConditions}\n`;
    if (orc.deliveryTerms) msg += `🚚 *Prazo de Entrega:* ${orc.deliveryTerms}\n`;
    if (orc.warrantyTerms) msg += `🛡️ *Garantia:* ${orc.warrantyTerms}\n`;
    if (orc.notes) msg += `📝 *Observações:* ${orc.notes}\n`;

    msg += `\n_Agradecemos pela consulta! Para aprovar este orçamento, responda a esta mensagem._ ✨`;
    return msg;
  };

  // Send WhatsApp
  const handleSendWhatsApp = (orc: Orcamento) => {
    const text = encodeURIComponent(generateWhatsAppQuoteText(orc));
    let cleanPhone = (orc.clientPhone || "").replace(/\D/g, "");
    if (cleanPhone && cleanPhone.length <= 11 && !cleanPhone.startsWith("55")) {
      cleanPhone = "55" + cleanPhone;
    }
    const url = cleanPhone ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${text}` : `https://api.whatsapp.com/send?text=${text}`;
    window.open(url, "_blank");
    showNotification("Proposta comercial pronta para envio no WhatsApp! 💬", "success");
  };

  // Copy Quote Text
  const handleCopyQuoteText = (orc: Orcamento) => {
    const text = generateWhatsAppQuoteText(orc);
    navigator.clipboard.writeText(text);
    showNotification("Texto da proposta copiado para a área de transferência! 📋", "success");
  };

  const escapeHtml = (str: string) =>
    String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  // Safe Printing Helper via centralized hidden iframe (no popup blockers, waits for images)
  const printHtmlDocument = (htmlContent: string, label = "Documento") => {
    executeThermalPrint(
      htmlContent,
      () => showNotification(`${label} enviado para a impressora! 🖨️`, "success"),
      (err) => showNotification(typeof err === "string" ? err : "Erro ao imprimir documento.", "error")
    );
  };

  // Thermal Printing (58mm / 80mm honoring global printer config + bold contrast)
  const handlePrintThermalReceipt = (orc: Orcamento, widthOverride?: "58mm" | "80mm") => {
    const cfg = loadPrinterConfig();
    const width: "58mm" | "80mm" =
      widthOverride ||
      (cfg.printerType === "58mm" || cfg.miniPrintPocketMode ? "58mm" : "80mm");
    const is58mm = width === "58mm";
    const printableWidth = is58mm ? "48mm" : "72mm";
    const fontBasePx =
      cfg.fontSize === "pequena"
        ? is58mm ? 9.5 : 10.5
        : cfg.fontSize === "grande"
        ? is58mm ? 12 : 13.5
        : is58mm ? 10.5 : 11.5;
    const fontSmallPx = Math.max(8.5, fontBasePx - 1.5);
    const fontHeaderPx = fontBasePx + 2.5;
    const bodyWeight = cfg.highContrast !== false ? "900" : "700";
    const resolvedStoreName = (storeName || cfg.storeName || "MEU ESTABELECIMENTO").trim();
    const resolvedCnpj = (storeCnpj || cfg.storeCnpjCpf || "").trim();
    const resolvedPhone = (storePhone || cfg.storePhone || "").trim();
    const resolvedAddress = (storeAddress || cfg.storeAddress || "").trim();

    const itemsHtml = orc.items.map((it, idx) => `
      <div style="display:flex; justify-content:space-between; margin-bottom: 2px; font-size: ${fontBasePx}px; font-weight: 900;">
        <span style="flex:1; padding-right:4px;">${idx + 1}. ${escapeHtml(it.name)}</span>
      </div>
      <div style="display:flex; justify-content:space-between; margin-bottom: 5px; font-size: ${fontSmallPx}px; font-weight: ${bodyWeight}; color:#000;">
        <span>${it.quantity} ${escapeHtml(it.unit)} x R$ ${it.unitPrice.toFixed(2).replace(".", ",")}</span>
        <span style="font-weight:900; font-family:monospace;">R$ ${it.total.toFixed(2).replace(".", ",")}</span>
      </div>
      ${it.details ? `<div style="font-size:${Math.max(8, fontSmallPx - 1)}px; font-weight:${bodyWeight}; color:#000; margin-bottom:4px;">• ${escapeHtml(it.details)}</div>` : ""}
    `).join("");

    const renderSingleVia = (viaLabel?: string) => `
      <div style="margin-bottom: 8px;">
        <div class="center">
          ${viaLabel ? `<div class="quote-tag" style="border:1.5px solid #000; background:#fff;">${escapeHtml(viaLabel)}</div>` : ""}
          ${cfg.showNameOnReceipt !== false ? `<div class="title">${escapeHtml(resolvedStoreName.toUpperCase())}</div>` : ""}
          ${cfg.showCnpjOnReceipt !== false && resolvedCnpj ? `<div class="small">CNPJ/CPF: ${escapeHtml(resolvedCnpj)}</div>` : ""}
          ${cfg.showPhoneOnReceipt !== false && resolvedPhone ? `<div class="small">FONE: ${escapeHtml(resolvedPhone)}</div>` : ""}
          ${cfg.showAddressOnReceipt !== false && resolvedAddress ? `<div class="small">${escapeHtml(resolvedAddress)}</div>` : ""}
        </div>

        <div class="double-b"></div>

        <div class="center">
          <div class="quote-tag">*** ORÇAMENTO / COTAÇÃO ***</div>
          <div class="small bold">(NÃO É DOCUMENTO FISCAL)</div>
          <div class="small">(NÃO CONSTITUI RESERVA DE ESTOQUE)</div>
        </div>

        <div class="border-b"></div>

        <div class="text-xs">
          <div class="flex"><span>ORÇAMENTO:</span> <span class="bold">${escapeHtml(orc.code)}</span></div>
          <div class="flex"><span>DATA:</span> <span>${escapeHtml(orc.date)}</span></div>
          <div class="flex"><span>VALIDADE:</span> <span class="bold">${escapeHtml(orc.validUntil)}</span></div>
          ${orc.sellerName ? `<div class="flex"><span>ATENDENTE:</span> <span>${escapeHtml(orc.sellerName)}</span></div>` : ""}
        </div>

        <div class="border-b"></div>

        <div class="text-xs">
          <div><span class="bold">CLIENTE:</span> ${escapeHtml(orc.clientName.toUpperCase())}</div>
          ${orc.clientPhone ? `<div><span class="bold">FONE:</span> ${escapeHtml(orc.clientPhone)}</div>` : ""}
          ${orc.clientDoc ? `<div><span class="bold">DOC:</span> ${escapeHtml(orc.clientDoc)}</div>` : ""}
        </div>

        <div class="border-b"></div>

        <div class="text-xs bold" style="margin-bottom: 4px;">ITENS DO ORÇAMENTO:</div>
        ${itemsHtml}

        <div class="double-b"></div>

        <div class="text-xs">
          <div class="flex"><span>SUBTOTAL:</span> <span style="font-family:monospace;">R$ ${orc.subtotal.toFixed(2).replace(".", ",")}</span></div>
          ${orc.discountTotal > 0 ? `<div class="flex"><span>DESCONTO:</span> <span style="font-family:monospace;">- R$ ${orc.discountTotal.toFixed(2).replace(".", ",")}</span></div>` : ""}
          ${orc.shippingOrFees > 0 ? `<div class="flex"><span>FRETE/TAXAS:</span> <span style="font-family:monospace;">+ R$ ${orc.shippingOrFees.toFixed(2).replace(".", ",")}</span></div>` : ""}
          <div class="flex bold" style="font-size: ${fontHeaderPx}px; margin-top: 4px; border-top: 1.5px solid #000; border-bottom: 1.5px solid #000; padding: 3px 0;">
            <span>TOTAL:</span>
            <span style="font-family:monospace;">R$ ${orc.total.toFixed(2).replace(".", ",")}</span>
          </div>
        </div>

        <div class="border-b"></div>

        ${orc.paymentConditions ? `
          <div class="small">
            <span class="bold">PAGAMENTO PROPOSTO:</span><br/>
            ${escapeHtml(orc.paymentConditions)}
          </div>
          <div class="border-b"></div>
        ` : ""}

        ${orc.deliveryTerms ? `
          <div class="small">
            <span class="bold">PRAZO DE ENTREGA:</span> ${escapeHtml(orc.deliveryTerms)}
          </div>
        ` : ""}

        ${orc.warrantyTerms ? `
          <div class="small">
            <span class="bold">GARANTIA:</span> ${escapeHtml(orc.warrantyTerms)}
          </div>
        ` : ""}

        ${orc.notes ? `
          <div class="border-b"></div>
          <div class="small">
            <span class="bold">OBSERVAÇÕES:</span><br/>
            ${escapeHtml(orc.notes)}
          </div>
        ` : ""}

        <div class="double-b"></div>

        <div class="center small" style="margin-top: 14px;">
          <div style="border-top: 1.5px solid #000; width: 85%; margin: 22px auto 4px auto;"></div>
          <div class="bold">Assinatura do Cliente / De Acordo</div>
          <div style="margin-top: 6px; font-size: ${Math.max(8, fontSmallPx - 1)}px; color: #000;">
            ${escapeHtml(cfg.receiptFooterMsg || "Orçamento gerado pelo Sistema PDV Comercial")}
          </div>
        </div>
      </div>
    `;

    const copiesHtml = cfg.printTwoCopies
      ? `${renderSingleVia("1ª VIA - CLIENTE")}
         <div style="text-align:center; border-top:2px dashed #000; margin:12px 0; padding-top:4px; font-size:9px; font-weight:900;">--- CORTE AQUI ---</div>
         ${renderSingleVia("2ª VIA - LOJA")}`
      : renderSingleVia();

    const feedHeightPx = (cfg.feedLines || 4) * 9;

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <title>Notinha de Orçamento - ${escapeHtml(orc.code)}</title>
        <style>
          @page {
            size: ${is58mm ? "58mm auto" : "80mm auto"};
            margin: 0mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            font-family: Arial, Helvetica, 'Liberation Sans', sans-serif;
            width: ${printableWidth};
            max-width: ${printableWidth};
            margin: 0 auto !important;
            padding: 6px 3px !important;
            color: #000 !important;
            background: #fff !important;
            font-size: ${fontBasePx}px;
            font-weight: ${bodyWeight};
            line-height: 1.25;
          }
          .center { text-align: center; }
          .bold { font-weight: 900; }
          .border-b { border-bottom: 1.5px dashed #000; margin: 5px 0; }
          .double-b { border-bottom: 2px solid #000; margin: 6px 0; }
          .flex { display: flex; justify-content: space-between; gap: 4px; }
          .small { font-size: ${fontSmallPx}px; font-weight: ${bodyWeight}; }
          .text-xs { font-size: ${fontBasePx}px; font-weight: ${bodyWeight}; }
          .title { font-size: ${fontHeaderPx}px; font-weight: 900; margin-bottom: 2px; }
          .quote-tag { font-size: ${fontSmallPx}px; font-weight: 900; border: 1.5px solid #000; padding: 2px 6px; display: inline-block; margin: 3px 0; }
        </style>
      </head>
      <body>
        ${copiesHtml}
        <div style="height: ${feedHeightPx}px;"></div>
        ${cfg.autoCut ? `<span style="font-size: 0px; color: transparent; user-select: none;">&#29;&#86;&#0;</span>` : ""}
      </body>
      </html>
    `;

    printHtmlDocument(htmlContent, `Notinha ${orc.code}`);
  };

  // Export PNG 57mm (iBleem / Fun Print) for Orçamento
  const handleDownloadQuotePng57mm = async (orc: Orcamento) => {
    try {
      const cfg = loadPrinterConfig();
      const extraMeta: string[] = [
        `ORÇAMENTO: ${orc.code}`,
        `VALIDADE: ${orc.validUntil}`
      ];
      if (orc.clientPhone) extraMeta.push(`FONE: ${orc.clientPhone}`);
      if (orc.paymentConditions) extraMeta.push(`PGTO: ${orc.paymentConditions}`);
      if (orc.deliveryTerms) extraMeta.push(`ENTREGA: ${orc.deliveryTerms}`);

      const summaryLines: ThermalCanvasReceiptPayload["summaryLines"] = [
        { label: "SUBTOTAL:", value: `R$ ${orc.subtotal.toFixed(2).replace(".", ",")}`, bold: true }
      ];
      if (orc.discountTotal > 0) {
        summaryLines.push({ label: "DESCONTO:", value: `- R$ ${orc.discountTotal.toFixed(2).replace(".", ",")}`, bold: true });
      }
      if (orc.shippingOrFees > 0) {
        summaryLines.push({ label: "FRETE/TAXAS:", value: `+ R$ ${orc.shippingOrFees.toFixed(2).replace(".", ",")}`, bold: true });
      }
      summaryLines.push({ label: "TOTAL ORÇAMENTO:", value: `R$ ${orc.total.toFixed(2).replace(".", ",")}`, big: true, bold: true });

      const payload: ThermalCanvasReceiptPayload = {
        title: "ORÇAMENTO / COTAÇÃO",
        subtitle: "DOCUMENTO SEM VALOR FISCAL",
        storeName: storeName || cfg.storeName || "MEU ESTABELECIMENTO",
        storeCnpj: storeCnpj || cfg.storeCnpjCpf,
        dateStr: orc.date,
        ticketId: orc.code,
        collaboratorName: orc.clientName,
        statusLabel: `STATUS: ${orc.status.toUpperCase()}`,
        extraMeta,
        lines: orc.items.map((it) => ({
          left: `${it.quantity}${it.unit} x ${it.name.toUpperCase()}`,
          right: `R$ ${it.total.toFixed(2).replace(".", ",")}`,
          detail: `Unit: R$ ${it.unitPrice.toFixed(2).replace(".", ",")}${it.details ? ` | ${it.details}` : ""}`,
          bold: true
        })),
        summaryLines,
        footerNote: cfg.receiptFooterMsg || "Orçamento válido até " + orc.validUntil,
        singleViaBanner: "VIA ÚNICA - ORÇAMENTO",
        copies: cfg.printTwoCopies ? 2 : 1
      };

      const blob = await generateMiniPrint57mmPngBlob(payload);
      await shareOrDownloadReceiptPng(blob, `orcamento_${orc.code}_57mm.png`, `Orçamento ${orc.code}`, true);
      showNotification(`Imagem 57mm do orçamento ${orc.code} baixada para iBleem / Fun Print! 🖼️✅`, "success");
    } catch (err: any) {
      showNotification(err?.message || "Erro ao gerar imagem 57mm do orçamento.", "error");
    }
  };

  // A4 Proposal Printing (Full standard page via executeThermalPrint)
  const handlePrintA4Proposal = (orc: Orcamento) => {
    const cfg = loadPrinterConfig();
    const resolvedStoreName = (storeName || cfg.storeName || "MEU ESTABELECIMENTO").trim();
    const resolvedCnpj = (storeCnpj || cfg.storeCnpjCpf || "").trim();
    const resolvedPhone = (storePhone || cfg.storePhone || "").trim();
    const resolvedAddress = (storeAddress || cfg.storeAddress || "").trim();

    const itemsRows = orc.items.map((it, idx) => `
      <tr style="border-bottom: 1px solid #cbd5e1;">
        <td style="padding: 8px; text-align: center; font-weight: 700;">${idx + 1}</td>
        <td style="padding: 8px;">
          <strong style="color: #000;">${escapeHtml(it.name)}</strong>
          ${it.details ? `<br/><span style="font-size: 11px; color: #334155;">${escapeHtml(it.details)}</span>` : ""}
        </td>
        <td style="padding: 8px; text-align: center; font-weight: 700;">${it.quantity} ${escapeHtml(it.unit)}</td>
        <td style="padding: 8px; text-align: right;">R$ ${it.unitPrice.toFixed(2).replace(".", ",")}</td>
        <td style="padding: 8px; text-align: right;">${it.discount > 0 ? `- R$ ${it.discount.toFixed(2).replace(".", ",")}` : "-"}</td>
        <td style="padding: 8px; text-align: right; font-weight: 900;">R$ ${it.total.toFixed(2).replace(".", ",")}</td>
      </tr>
    `).join("");

    const a4Html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <title>Proposta Comercial - ${escapeHtml(orc.code)}</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body {
            font-family: Arial, Helvetica, sans-serif;
            margin: 0;
            padding: 10px;
            color: #000;
            background: #fff;
            line-height: 1.4;
            font-size: 13px;
            font-weight: 600;
          }
          .header { display: flex; justify-content: space-between; border-bottom: 2.5px solid #0284c7; padding-bottom: 12px; margin-bottom: 16px; }
          .company-name { font-size: 20px; font-weight: 900; color: #000; }
          .quote-badge { background: #f0fdf4; border: 1.5px solid #166534; color: #166534; padding: 4px 10px; font-weight: 900; border-radius: 6px; font-size: 12px; }
          .card { background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 12px; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background: #e2e8f0; padding: 8px; font-size: 11px; font-weight: 900; text-transform: uppercase; color: #000; border-bottom: 2px solid #94a3b8; }
          .totals-table { width: 320px; margin-left: auto; margin-top: 15px; border-collapse: collapse; }
          .totals-table td { padding: 6px 8px; }
          .signature-box { margin-top: 40px; display: flex; justify-content: space-around; text-align: center; font-size: 12px; font-weight: 700; }
          .signature-line { border-top: 1.5px solid #000; width: 220px; margin-bottom: 6px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="company-name">${escapeHtml(resolvedStoreName.toUpperCase())}</div>
            ${resolvedCnpj ? `<div>CNPJ/CPF: ${escapeHtml(resolvedCnpj)}</div>` : ""}
            ${resolvedPhone ? `<div>Telefone / WhatsApp: ${escapeHtml(resolvedPhone)}</div>` : ""}
            ${resolvedAddress ? `<div>Endereço: ${escapeHtml(resolvedAddress)}</div>` : ""}
          </div>
          <div style="text-align: right;">
            <div style="font-size: 18px; font-weight: 900; color: #0284c7;">PROPOSTA COMERCIAL</div>
            <div style="font-size: 14px; font-weight: 900; margin-top: 2px;">${escapeHtml(orc.code)}</div>
            <div style="font-size: 12px; color: #334155; margin-top: 4px;">Data: ${escapeHtml(orc.date)}</div>
            <div class="quote-badge" style="margin-top: 6px; display: inline-block;">Válido até: ${escapeHtml(orc.validUntil)}</div>
          </div>
        </div>

        <div class="card">
          <div style="font-weight: 900; text-transform: uppercase; font-size: 11px; color: #0284c7; margin-bottom: 6px;">DADOS DO CLIENTE</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
            <div><strong>Nome:</strong> ${escapeHtml(orc.clientName)}</div>
            ${orc.clientPhone ? `<div><strong>Telefone:</strong> ${escapeHtml(orc.clientPhone)}</div>` : ""}
            ${orc.clientDoc ? `<div><strong>CPF/CNPJ:</strong> ${escapeHtml(orc.clientDoc)}</div>` : ""}
            ${orc.clientEmail ? `<div><strong>E-mail:</strong> ${escapeHtml(orc.clientEmail)}</div>` : ""}
            ${orc.clientAddress ? `<div style="grid-column: span 2;"><strong>Endereço:</strong> ${escapeHtml(orc.clientAddress)}</div>` : ""}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 35px; text-align: center;">Item</th>
              <th style="text-align: left;">Descrição do Produto / Serviço</th>
              <th style="width: 80px; text-align: center;">Qtd</th>
              <th style="width: 110px; text-align: right;">Unitário</th>
              <th style="width: 90px; text-align: right;">Desconto</th>
              <th style="width: 110px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <table class="totals-table">
          <tr>
            <td>Subtotal:</td>
            <td style="text-align: right; font-weight: 900;">R$ ${orc.subtotal.toFixed(2).replace(".", ",")}</td>
          </tr>
          ${orc.discountTotal > 0 ? `
            <tr>
              <td style="color: #b91c1c; font-weight: 700;">Descontos:</td>
              <td style="text-align: right; color: #b91c1c; font-weight: 900;">- R$ ${orc.discountTotal.toFixed(2).replace(".", ",")}</td>
            </tr>
          ` : ""}
          ${orc.shippingOrFees > 0 ? `
            <tr>
              <td>Frete / Taxas:</td>
              <td style="text-align: right; font-weight: 900;">+ R$ ${orc.shippingOrFees.toFixed(2).replace(".", ",")}</td>
            </tr>
          ` : ""}
          <tr style="border-top: 2px solid #000; font-size: 16px;">
            <td style="font-weight: 900;">TOTAL GERAL:</td>
            <td style="text-align: right; font-weight: 900; color: #0284c7;">R$ ${orc.total.toFixed(2).replace(".", ",")}</td>
          </tr>
        </table>

        <div class="card" style="margin-top: 25px;">
          <div style="font-weight: 900; text-transform: uppercase; font-size: 11px; color: #0284c7; margin-bottom: 6px;">CONDIÇÕES COMERCIAIS</div>
          ${orc.paymentConditions ? `<div style="margin-bottom: 4px;"><strong>Formas de Pagamento:</strong> ${escapeHtml(orc.paymentConditions)}</div>` : ""}
          ${orc.deliveryTerms ? `<div style="margin-bottom: 4px;"><strong>Prazo de Entrega:</strong> ${escapeHtml(orc.deliveryTerms)}</div>` : ""}
          ${orc.warrantyTerms ? `<div style="margin-bottom: 4px;"><strong>Garantia:</strong> ${escapeHtml(orc.warrantyTerms)}</div>` : ""}
          ${orc.notes ? `<div style="margin-top: 6px; font-size: 11.5px;"><strong>Observações:</strong> ${escapeHtml(orc.notes)}</div>` : ""}
        </div>

        <div class="signature-box">
          <div>
            <div class="signature-line"></div>
            <div>${escapeHtml(resolvedStoreName.toUpperCase())}</div>
            <div style="font-size: 10px; color: #334155;">Representante Comercial</div>
          </div>
          <div>
            <div class="signature-line"></div>
            <div>${escapeHtml(orc.clientName.toUpperCase())}</div>
            <div style="font-size: 10px; color: #334155;">Assinatura do Cliente / Aceite</div>
          </div>
        </div>

        <div style="text-align: center; margin-top: 30px; font-size: 10px; color: #334155;">
          Este documento é uma proposta comercial de prestação de serviços/venda de mercadorias. Não possui valor fiscal até a emissão do comprovante de pagamento/NFC-e.
        </div>
      </body>
      </html>
    `;

    printHtmlDocument(a4Html, `Proposta A4 ${orc.code}`);
  };

  // Filtered quotes list
  const filteredOrcamentos = useMemo(() => {
    return orcamentos.filter(orc => {
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        orc.code.toLowerCase().includes(q) ||
        orc.clientName.toLowerCase().includes(q) ||
        (orc.clientPhone && orc.clientPhone.includes(q)) ||
        orc.items.some(it => it.name.toLowerCase().includes(q));

      const matchStatus = statusFilter === "all" || orc.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [orcamentos, searchTerm, statusFilter]);

  // General Statistics
  const stats = useMemo(() => {
    const totalCount = orcamentos.length;
    const pendentes = orcamentos.filter(o => o.status === "pendente");
    const aprovados = orcamentos.filter(o => o.status === "aprovado");
    const convertidos = orcamentos.filter(o => o.status === "convertido");
    const recusados = orcamentos.filter(o => o.status === "recusado");

    const totalValorAberto = pendentes.reduce((acc, o) => acc + o.total, 0);
    const totalValorAprovado = aprovados.reduce((acc, o) => acc + o.total, 0);

    return {
      totalCount,
      pendentesCount: pendentes.length,
      aprovadosCount: aprovados.length,
      convertidosCount: convertidos.length,
      recusadosCount: recusados.length,
      totalValorAberto,
      totalValorAprovado
    };
  }, [orcamentos]);

  return (
    <div className="bg-slate-900 border border-white/5 rounded-3xl p-5 sm:p-6 space-y-6 text-left">
      
      {/* 1. HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-amber-400 animate-pulse" />
            Emissão de Propostas & Cotações Comerciais
          </span>
          <h3 className="text-lg font-black text-white uppercase mt-1 tracking-tight flex items-center gap-2">
            Orçamentos & Notinhas 📋📄
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl font-sans">
            Elabore propostas completas para seus clientes, imprima notinhas térmicas de 58/80mm ou envie direto pelo WhatsApp.
          </p>
        </div>

        {/* TAB CONTROLLERS */}
        <div className="flex gap-1.5 bg-slate-950 p-1 rounded-xl border border-white/5 shrink-0 self-start">
          <button
            type="button"
            onClick={() => {
              setActiveTab("lista");
              handleResetForm();
            }}
            className={`px-4 py-2 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "lista"
                ? "bg-amber-600 text-white shadow-lg shadow-amber-500/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
            title="Pasta de Arquivos com todos os orçamentos gravados: reimprima quantas vezes quiser"
          >
            <Folder className="w-3.5 h-3.5" />
            <span>Pasta de Arquivos ({orcamentos.length})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              handleResetForm();
              setActiveTab("novo");
            }}
            className={`px-4 py-2 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "novo" && !editingOrcamentoId
                ? "bg-amber-600 text-white shadow-lg shadow-amber-500/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            ➕ Novo Orçamento
          </button>
        </div>
      </div>

      {/* 2. REASSURING SAFETY BANNER: SEM MEXER NO ESTOQUE E DINHEIRO */}
      <div className="bg-gradient-to-r from-amber-500/10 via-slate-950 to-emerald-500/10 border border-amber-500/25 rounded-2xl p-3.5 flex items-start gap-3">
        <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl shrink-0 mt-0.5">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="space-y-0.5 text-xs">
          <h4 className="font-black text-amber-300 uppercase tracking-wide flex items-center gap-2">
            Módulo de Orçamentos 100% Seguro & Isolado
            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-200 rounded text-[9px] font-mono">
              SEM MOVIMENTAÇÃO DE CAIXA E SEM BAIXA DE ESTOQUE
            </span>
          </h4>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            Aqui você cria cotações, imprime notinhas para o cliente levar e envia propostas no WhatsApp <strong>sem alterar o saldo do caixa</strong> e <strong>sem diminuir as quantidades do estoque</strong>. O lançamento no caixa só acontece se você optar explicitamente por converter em venda.
          </p>
        </div>
      </div>

      {/* 3. VIEW A: LIST OF ORÇAMENTOS */}
      {activeTab === "lista" && (
        <div className="space-y-5">
          {/* STATS BENTO */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-950 border border-white/5 p-3.5 rounded-2xl">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Total de Cotações</span>
              <p className="text-xl sm:text-2xl font-black text-white mt-1">{stats.totalCount}</p>
              <span className="text-[9px] text-slate-400 mt-0.5 block">Histórico de orçamentos</span>
            </div>
            <div className="bg-slate-950 border border-amber-500/20 p-3.5 rounded-2xl">
              <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider block">Em Aberto / Pendentes</span>
              <p className="text-xl sm:text-2xl font-black text-amber-300 mt-1">{stats.pendentesCount}</p>
              <span className="text-[9px] text-amber-500/90 font-mono mt-0.5 block">Total: {formatCurrency(stats.totalValorAberto)}</span>
            </div>
            <div className="bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl">
              <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider block">Aprovados / Ganhos</span>
              <p className="text-xl sm:text-2xl font-black text-emerald-300 mt-1">{stats.aprovadosCount}</p>
              <span className="text-[9px] text-emerald-500/90 font-mono mt-0.5 block">Total: {formatCurrency(stats.totalValorAprovado)}</span>
            </div>
            <div className="bg-slate-950 border border-sky-500/20 p-3.5 rounded-2xl">
              <span className="text-[9px] font-bold text-sky-400 uppercase tracking-wider block">Convertidos em Venda</span>
              <p className="text-xl sm:text-2xl font-black text-sky-300 mt-1">{stats.convertidosCount}</p>
              <span className="text-[9px] text-sky-500/90 mt-0.5 block">Faturados no caixa</span>
            </div>
          </div>

          {/* SEARCH & FILTERS BAR */}
          <div className="bg-slate-950 border border-white/5 p-4 rounded-2xl flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar por código (#ORC-0001), nome do cliente, telefone ou produto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 hover:border-white/20 focus:border-amber-500/50 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 transition-all outline-none"
              />
            </div>

            <div className="flex gap-1.5 overflow-x-auto text-xs shrink-0">
              {[
                { id: "all", label: "Todos" },
                { id: "pendente", label: "⏳ Em Aberto" },
                { id: "aprovado", label: "✅ Aprovados" },
                { id: "convertido", label: "🛒 Convertidos" },
                { id: "recusado", label: "❌ Recusados" }
              ].map(st => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStatusFilter(st.id as any)}
                  className={`px-3 py-1.5 rounded-xl font-bold text-[10px] uppercase transition-all cursor-pointer whitespace-nowrap border ${
                    statusFilter === st.id
                      ? "bg-amber-600 text-white border-amber-400 shadow-sm"
                      : "bg-slate-900 text-slate-400 border-white/5 hover:text-white"
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* ORÇAMENTOS TABLE / LIST */}
          <div className="bg-slate-950 border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
            {filteredOrcamentos.length === 0 ? (
              <div className="p-12 text-center space-y-4">
                <div className="w-12 h-12 bg-amber-500/10 text-amber-400 rounded-2xl flex items-center justify-center mx-auto">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-black uppercase text-white">Nenhum orçamento encontrado</h4>
                  <p className="text-slate-500 text-xs mt-1">
                    {searchTerm || statusFilter !== "all"
                      ? "Nenhum orçamento coincide com os filtros aplicados."
                      : "Crie a primeira proposta comercial para seu cliente e imprima a notinha!"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleResetForm();
                    setActiveTab("novo");
                  }}
                  className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  ➕ Criar Novo Orçamento Agora
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-slate-900/60 text-[9.5px] font-black uppercase text-slate-400 tracking-wider">
                      <th className="py-3.5 px-4 w-28">Código / Data</th>
                      <th className="py-3.5 px-4">Cliente / Contato</th>
                      <th className="py-3.5 px-4">Itens Cotados</th>
                      <th className="py-3.5 px-4 text-right">Total Geral</th>
                      <th className="py-3.5 px-4 text-center">Validade</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                      <th className="py-3.5 px-4 text-right w-44">Ações / Notinhas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs">
                    {filteredOrcamentos.map((orc) => {
                      const isExpired = (() => {
                        try {
                          const parts = orc.validUntil.split("/");
                          if (parts.length === 3) {
                            const exp = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]), 23, 59, 59);
                            return exp.getTime() < Date.now();
                          }
                        } catch (_) {}
                        return false;
                      })();

                      return (
                        <tr key={orc.id} className="hover:bg-white/[0.02] transition-colors group">
                          {/* Code & Date */}
                          <td className="py-3.5 px-4">
                            <span className="font-black text-amber-300 font-mono text-xs block group-hover:text-amber-200">
                              {orc.code}
                            </span>
                            <span className="text-[10px] text-slate-500 font-sans block mt-0.5">
                              {orc.date}
                            </span>
                          </td>

                          {/* Client */}
                          <td className="py-3.5 px-4">
                            <div className="font-extrabold text-white uppercase flex items-center gap-1.5">
                              <span>{orc.clientName}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] text-slate-400">
                              {orc.clientPhone && (
                                <span className="flex items-center gap-1 text-emerald-400 font-mono">
                                  <Phone className="w-2.5 h-2.5" /> {orc.clientPhone}
                                </span>
                              )}
                              {orc.clientDoc && (
                                <span className="text-slate-500 font-mono">
                                  Doc: {orc.clientDoc}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Items Summary */}
                          <td className="py-3.5 px-4">
                            <span className="text-slate-300 font-medium text-[11px] block">
                              {orc.items.length} {orc.items.length === 1 ? "item cotado" : "itens cotados"}
                            </span>
                            <span className="text-[9.5px] text-slate-500 truncate max-w-xs block mt-0.5">
                              {orc.items.map(it => `${it.quantity}${it.unit} ${it.name}`).join(", ")}
                            </span>
                          </td>

                          {/* Total */}
                          <td className="py-3.5 px-4 text-right">
                            <span className="font-black font-mono text-white text-sm block">
                              {formatCurrency(orc.total)}
                            </span>
                            {orc.discountTotal > 0 && (
                              <span className="text-[9px] text-rose-400 font-mono block">
                                Desconto: -{formatCurrency(orc.discountTotal)}
                              </span>
                            )}
                          </td>

                          {/* Validity */}
                          <td className="py-3.5 px-4 text-center">
                            <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold block ${
                              isExpired 
                                ? "bg-rose-500/10 text-rose-300 border border-rose-500/20" 
                                : "bg-slate-900 text-slate-300 border border-white/5"
                            }`}>
                              {orc.validUntil}
                            </span>
                            <span className="text-[8.5px] text-slate-500 block mt-0.5">
                              {isExpired ? "⚠️ Vencido" : `${orc.validityDays} dias`}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 text-center">
                            <select
                              value={orc.status}
                              onChange={(e) => handleUpdateStatus(orc.id, e.target.value as any)}
                              className={`text-[9.5px] font-black uppercase px-2.5 py-1 rounded-lg border outline-none cursor-pointer transition-all ${
                                orc.status === "pendente"
                                  ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                                  : orc.status === "aprovado"
                                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                                  : orc.status === "convertido"
                                  ? "bg-sky-500/15 text-sky-300 border-sky-500/30"
                                  : "bg-rose-500/15 text-rose-300 border-rose-500/30"
                              }`}
                            >
                              <option value="pendente" className="bg-slate-900 text-white">⏳ Em Aberto</option>
                              <option value="aprovado" className="bg-slate-900 text-white">✅ Aprovado</option>
                              <option value="convertido" className="bg-slate-900 text-white">🛒 Convertido</option>
                              <option value="recusado" className="bg-slate-900 text-white">❌ Recusado</option>
                            </select>
                          </td>

                          {/* Action Buttons */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex gap-1 justify-end">
                              {/* Thermal Print (uses saved 58mm / 80mm config) */}
                              <button
                                type="button"
                                onClick={() => handlePrintThermalReceipt(orc)}
                                className="p-1.5 bg-slate-900 hover:bg-amber-500 hover:text-slate-950 text-amber-300 rounded-lg cursor-pointer transition-all"
                                title="Imprimir Notinha Térmica (usa sua impressora configurada 58/80mm)"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>

                              {/* PNG 57mm Fun Print */}
                              <button
                                type="button"
                                onClick={() => handleDownloadQuotePng57mm(orc)}
                                className="p-1.5 bg-slate-900 hover:bg-cyan-500 hover:text-slate-950 text-cyan-300 rounded-lg cursor-pointer transition-all"
                                title="Baixar Imagem PNG 57mm (iBleem / Fun Print)"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>

                              {/* A4 Print */}
                              <button
                                type="button"
                                onClick={() => handlePrintA4Proposal(orc)}
                                className="p-1.5 bg-slate-900 hover:bg-sky-500 hover:text-slate-950 text-sky-400 rounded-lg cursor-pointer transition-all"
                                title="Imprimir Proposta A4 / PDF"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>

                              {/* WhatsApp */}
                              <button
                                type="button"
                                onClick={() => handleSendWhatsApp(orc)}
                                className="p-1.5 bg-slate-900 hover:bg-emerald-500 hover:text-slate-950 text-emerald-400 rounded-lg cursor-pointer transition-all"
                                title="Enviar Orçamento via WhatsApp"
                              >
                                <Send className="w-3.5 h-3.5" />
                              </button>

                              {/* View / Modal */}
                              <button
                                type="button"
                                onClick={() => setViewingOrcamento(orc)}
                                className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg cursor-pointer transition-all"
                                title="Visualizar Notinha Completa"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              {/* Duplicate */}
                              <button
                                type="button"
                                onClick={() => handleDuplicate(orc)}
                                className="p-1.5 bg-slate-900 hover:bg-slate-800 text-purple-300 rounded-lg cursor-pointer transition-all"
                                title="Duplicar Orçamento"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>

                              {/* Edit */}
                              <button
                                type="button"
                                onClick={() => handleStartEdit(orc)}
                                className="p-1.5 bg-slate-900 hover:bg-slate-800 text-sky-400 rounded-lg cursor-pointer transition-all"
                                title="Editar Orçamento"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete */}
                              <button
                                type="button"
                                onClick={() => handleDeleteOrcamento(orc.id, orc.code)}
                                className="p-1.5 bg-slate-900 hover:bg-rose-500/20 text-rose-400 rounded-lg cursor-pointer transition-all"
                                title="Excluir Orçamento"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. VIEW B: CREATE OR EDIT ORÇAMENTO FORM */}
      {activeTab === "novo" && (
        <form onSubmit={handleSaveOrcamento} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* COLUMN LEFT: CLIENT & ITEMS (8/12) */}
            <div className="lg:col-span-8 bg-slate-950 border border-white/5 rounded-2xl p-5 space-y-4">
              
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <h4 className="text-xs font-black uppercase text-white flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-amber-400" />
                  {editingOrcamentoId ? "Editar Orçamento Existente" : "Cadastrar Nova Proposta Comercial / Orçamento"}
                </h4>

                <span className="text-[10px] font-black uppercase bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2.5 py-1 rounded-full">
                  🛡️ Não movimenta estoque nem caixa
                </span>
              </div>

              {/* SECTION 1: CLIENT DETAILS */}
              <div className="grid grid-cols-12 gap-3 text-xs">
                <div className="col-span-12 sm:col-span-6">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                    Nome do Cliente *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: João da Silva, Maria Oliveira..."
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 focus:border-amber-500/50 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 transition-all outline-none"
                  />
                </div>

                <div className="col-span-12 sm:col-span-3">
                  <label className="block text-[10px] font-black text-emerald-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-emerald-400" /> WhatsApp / Telefone
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: (11) 99999-8888"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 focus:border-emerald-500/50 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 transition-all outline-none font-mono"
                  />
                </div>

                <div className="col-span-12 sm:col-span-3">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                    CPF ou CNPJ
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 000.000.000-00"
                    value={clientDoc}
                    onChange={(e) => setClientDoc(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 focus:border-amber-500/50 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 transition-all outline-none font-mono"
                  />
                </div>

                <div className="col-span-12 sm:col-span-8">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                    Endereço de Entrega / Local
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Rua das Flores, 123 - Centro"
                    value={clientAddress}
                    onChange={(e) => setClientAddress(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 focus:border-amber-500/50 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 transition-all outline-none"
                  />
                </div>

                <div className="col-span-12 sm:col-span-4">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                    Atendente / Vendedor
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Carlos, Ana..."
                    value={sellerName}
                    onChange={(e) => setSellerName(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 focus:border-amber-500/50 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 transition-all outline-none"
                  />
                </div>
              </div>

              {/* SECTION 2: ADD ITEMS TO QUOTE */}
              <div className="border-t border-white/5 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-black uppercase text-amber-300 flex items-center gap-1.5">
                    <ShoppingCart className="w-3.5 h-3.5 text-amber-400" />
                    Adicionar Produtos ou Serviços ao Orçamento
                  </h5>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {formItems.length} {formItems.length === 1 ? "item inserido" : "itens inseridos"}
                  </span>
                </div>

                {/* Quick Catalog Search / Autocomplete Box + Ver Estoque Button */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="🔍 Digite nome, código ou barras do produto cadastrado para puxar..."
                      value={searchCatalogQuery}
                      onChange={(e) => {
                        setSearchCatalogQuery(e.target.value);
                        setShowCatalogDropdown(true);
                      }}
                      onFocus={() => setShowCatalogDropdown(true)}
                      className="w-full bg-slate-900 border border-amber-500/30 hover:border-amber-400 focus:border-amber-400 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 transition-all outline-none"
                    />

                    {/* Autocomplete Dropdown list */}
                    {showCatalogDropdown && catalogSuggestions.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900 border border-amber-500/40 rounded-xl shadow-2xl z-50 max-h-64 overflow-y-auto divide-y divide-white/5">
                        <div className="p-2 bg-slate-950 flex items-center justify-between text-[9px] font-black uppercase text-slate-400">
                          <span>Produtos Cadastrados Encontrados:</span>
                          <span className="text-amber-400">Sem baixa de estoque</span>
                        </div>
                        {catalogSuggestions.map(p => (
                          <div
                            key={p.id}
                            className="w-full px-3 py-2 hover:bg-slate-800 transition-colors flex items-center justify-between gap-3 group"
                          >
                            <div 
                              className="min-w-0 flex-1 cursor-pointer"
                              onClick={() => handleSelectCatalogItem(p)}
                              title="Clique para preencher os campos abaixo"
                            >
                              <span className="font-bold text-xs text-white group-hover:text-amber-300 block truncate">{p.name}</span>
                              <span className="text-[9px] text-slate-400 block">{p.category || "Produto"} • {p.unit || "un"}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-xs text-emerald-400">
                                {formatCurrency(p.price)}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDirectAddProductToForm(p)}
                                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px] uppercase rounded-lg cursor-pointer flex items-center gap-1 active:scale-95 shadow-sm"
                                title="Lançar direto no orçamento (+1)"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Lançar</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsCatalogModalOpen(true)}
                    className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 shrink-0 cursor-pointer active:scale-95"
                    title="Abrir catálogo completo com fotos, categorias e preços de todos os produtos do estoque para lançar no orçamento"
                  >
                    <Package className="w-4 h-4 text-slate-950" />
                    <span>Ver Catálogo do Estoque ({customProducts.length})</span>
                  </button>
                </div>

                {/* Manual Item Fields (Can be edited or typed freely) */}
                <div className="bg-slate-900/50 border border-white/5 p-3.5 rounded-2xl space-y-2.5">
                  <div className="grid grid-cols-12 gap-2 text-xs">
                    <div className="col-span-12 sm:col-span-5">
                      <label className="block text-[9.5px] font-black text-slate-400 uppercase tracking-wider mb-1">
                        Descrição do Item / Serviço
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Pintura de Parede, Camiseta Algodão M, Peça de Reposição..."
                        value={itemInputName}
                        onChange={(e) => setItemInputName(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 outline-none focus:border-amber-500"
                      />
                    </div>

                    <div className="col-span-4 sm:col-span-2">
                      <label className="block text-[9.5px] font-black text-slate-400 uppercase tracking-wider mb-1">
                        Preço Unit. (R$)
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: 50,00"
                        value={itemInputPrice}
                        onChange={(e) => setItemInputPrice(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 outline-none focus:border-amber-500 font-mono"
                      />
                    </div>

                    <div className="col-span-4 sm:col-span-2">
                      <label className="block text-[9.5px] font-black text-slate-400 uppercase tracking-wider mb-1">
                        Quantidade
                      </label>
                      <div className="flex items-center bg-slate-950 border border-white/10 rounded-xl overflow-hidden focus-within:border-amber-500 shadow-inner">
                        <button
                          type="button"
                          onClick={() => {
                            const cur = parseFloat(itemInputQty.replace(",", ".")) || 1;
                            const next = Math.max(1, cur - 1);
                            setItemInputQty(String(next));
                          }}
                          className="px-2.5 py-2 text-slate-400 hover:text-white hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
                          title="Diminuir quantidade em 1"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="text"
                          placeholder="Ex: 1"
                          value={itemInputQty}
                          onChange={(e) => setItemInputQty(e.target.value)}
                          className="w-full bg-transparent px-1 py-2 text-xs text-white placeholder-slate-600 outline-none font-mono text-center font-bold"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const cur = parseFloat(itemInputQty.replace(",", ".")) || 0;
                            const next = cur + 1;
                            setItemInputQty(String(next));
                          }}
                          className="px-2.5 py-2 text-slate-400 hover:text-white hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
                          title="Aumentar quantidade em 1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="col-span-4 sm:col-span-1">
                      <label className="block text-[9.5px] font-black text-slate-400 uppercase tracking-wider mb-1">
                        Unidade
                      </label>
                      <select
                        value={itemInputUnit}
                        onChange={(e) => setItemInputUnit(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-2 py-2 text-xs text-white outline-none cursor-pointer"
                      >
                        <option value="un">un</option>
                        <option value="kg">kg</option>
                        <option value="g">g</option>
                        <option value="m">m</option>
                        <option value="m²">m²</option>
                        <option value="h">h</option>
                        <option value="L">L</option>
                        <option value="cx">cx</option>
                        <option value="pct">pct</option>
                      </select>
                    </div>

                    <div className="col-span-6 sm:col-span-2">
                      <label className="block text-[9.5px] font-black text-slate-400 uppercase tracking-wider mb-1">
                        Desc. Item (R$)
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: 5,00"
                        value={itemInputDiscount}
                        onChange={(e) => setItemInputDiscount(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 outline-none focus:border-amber-500 font-mono"
                      />
                    </div>
                  </div>

                  {/* Details and add button */}
                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <input
                      type="text"
                      placeholder="Detalhes adicionais do item (opcional: marca, cor, observações do serviço...)"
                      value={itemInputDetails}
                      onChange={(e) => setItemInputDetails(e.target.value)}
                      className="flex-1 w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-600 outline-none focus:border-amber-500"
                    />

                    <button
                      type="button"
                      onClick={() => handleAddItemToForm()}
                      className="w-full sm:w-auto px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1.5 shrink-0 shadow-md shadow-amber-500/20 active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Inserir no Orçamento
                    </button>
                  </div>
                </div>

                {/* TABLE OF ITEMS ADDED */}
                {formItems.length > 0 && (
                  <div className="bg-slate-950 border border-white/5 rounded-xl overflow-hidden mt-3">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-900/60 border-b border-white/5 text-[9px] font-black text-slate-400 uppercase">
                          <th className="py-2.5 px-3">Item</th>
                          <th className="py-2.5 px-2 text-center">Qtd</th>
                          <th className="py-2.5 px-2 text-right">Unitário</th>
                          <th className="py-2.5 px-2 text-right">Desconto</th>
                          <th className="py-2.5 px-3 text-right">Total</th>
                          <th className="py-2.5 px-2 text-center w-10">Remover</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {formItems.map((it, idx) => (
                          <tr key={it.id} className="hover:bg-white/[0.02]">
                            <td className="py-2 px-3">
                              <span className="font-bold text-white block">{it.name}</span>
                              {it.details && (
                                <span className="text-[9px] text-slate-500 italic block">{it.details}</span>
                              )}
                            </td>
                            <td className="py-2 px-2 text-center">
                              <div className="inline-flex items-center bg-slate-900 border border-white/10 rounded-lg overflow-hidden shadow-inner">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateItemQty(it.id, -1)}
                                  className="p-1 text-slate-400 hover:text-white hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
                                  title="Diminuir quantidade em 1"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const val = prompt(`Digite a nova quantidade para "${it.name}":`, String(it.quantity).replace(".", ","));
                                    if (val !== null && val.trim() !== "") {
                                      const parsed = parseFloat(val.replace(",", "."));
                                      if (!isNaN(parsed) && parsed > 0) {
                                        handleUpdateItemQty(it.id, parsed, true);
                                      }
                                    }
                                  }}
                                  className="px-2 font-mono text-xs font-black text-slate-100 hover:text-amber-400 underline decoration-dotted cursor-pointer select-none"
                                  title="Clique para digitar a quantidade exata (ex: 20 un ou 0,800 kg)"
                                >
                                  {it.quantity} {it.unit}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateItemQty(it.id, 1)}
                                  className="p-1 text-slate-400 hover:text-white hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
                                  title="Aumentar quantidade em 1"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                            <td className="py-2 px-2 text-right font-mono text-slate-400">
                              {formatCurrency(it.unitPrice)}
                            </td>
                            <td className="py-2 px-2 text-right font-mono text-rose-400">
                              {it.discount > 0 ? `-${formatCurrency(it.discount)}` : "-"}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-black text-emerald-400">
                              {formatCurrency(it.total)}
                            </td>
                            <td className="py-2 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(it.id)}
                                className="p-1 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 rounded-lg cursor-pointer transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>

            {/* COLUMN RIGHT: TOTALS, COMMERCIAL CONDITIONS & ACTIONS (4/12) */}
            <div className="lg:col-span-4 space-y-4">
              
              {/* TOTALS CARD */}
              <div className="bg-slate-950 border border-white/5 rounded-2xl p-4 space-y-3">
                <h5 className="text-xs font-black uppercase text-white border-b border-white/5 pb-2 flex items-center justify-between">
                  <span>Resumo do Orçamento</span>
                  <span className="font-mono text-amber-400">{formItems.length} itens</span>
                </h5>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Subtotal dos itens:</span>
                    <span className="font-mono text-white font-bold">{formatCurrency(formCalculations.subtotal)}</span>
                  </div>

                  {/* General Discount Input */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <label className="text-[10px] font-bold text-rose-400 uppercase">Desconto Geral (R$):</label>
                    <input
                      type="text"
                      placeholder="0,00"
                      value={discountTotalStr}
                      onChange={(e) => setDiscountTotalStr(e.target.value)}
                      className="w-24 bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-right text-xs text-rose-300 font-mono outline-none focus:border-rose-400"
                    />
                  </div>

                  {/* Shipping / Extra fees Input */}
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Frete / Taxas (R$):</label>
                    <input
                      type="text"
                      placeholder="0,00"
                      value={shippingFeesStr}
                      onChange={(e) => setShippingFeesStr(e.target.value)}
                      className="w-24 bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-right text-xs text-white font-mono outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="border-t border-white/5 pt-2 flex justify-between items-baseline">
                    <span className="font-black text-sm text-white uppercase">Total da Proposta:</span>
                    <span className="font-black text-xl text-amber-400 font-mono">
                      {formatCurrency(formCalculations.total)}
                    </span>
                  </div>
                </div>
              </div>

              {/* COMMERCIAL CONDITIONS CARD */}
              <div className="bg-slate-950 border border-white/5 rounded-2xl p-4 space-y-3 text-xs">
                <h5 className="text-xs font-black uppercase text-white border-b border-white/5 pb-2 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  Termos & Condições Comerciais
                </h5>

                {/* Validity days picker */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    Validade da Proposta
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {[3, 7, 15, 30, 60].map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setValidityDays(d)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer border ${
                          validityDays === d
                            ? "bg-amber-500 text-slate-950 border-amber-400 font-black shadow-sm"
                            : "bg-slate-900 text-slate-400 border-white/5 hover:text-white"
                        }`}
                      >
                        {d} dias
                      </button>
                    ))}
                  </div>
                </div>

                {/* Payment Conditions */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    Formas de Pagamento Propostas
                  </label>
                  <input
                    type="text"
                    value={paymentConditions}
                    onChange={(e) => setPaymentConditions(e.target.value)}
                    placeholder="Ex: À vista no PIX com 5% de desconto ou até 6x no cartão"
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 outline-none focus:border-amber-500"
                  />
                  <div className="flex flex-wrap gap-1 pt-1">
                    {[
                      "À vista no PIX com 5% de desc.",
                      "Cartão de Crédito até 3x sem juros",
                      "Cartão até 12x",
                      "50% entrada + 50% na entrega"
                    ].map(cond => (
                      <button
                        key={cond}
                        type="button"
                        onClick={() => setPaymentConditions(cond)}
                        className="px-1.5 py-0.5 bg-slate-900 hover:bg-slate-850 text-[8.5px] font-bold text-slate-400 hover:text-white rounded border border-white/5 cursor-pointer"
                      >
                        {cond}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Delivery Terms */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    Prazo de Entrega / Execução
                  </label>
                  <input
                    type="text"
                    value={deliveryTerms}
                    onChange={(e) => setDeliveryTerms(e.target.value)}
                    placeholder="Ex: Pronta entrega, 3 a 5 dias úteis..."
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 outline-none focus:border-amber-500"
                  />
                </div>

                {/* Warranty Terms */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    Garantia
                  </label>
                  <input
                    type="text"
                    value={warrantyTerms}
                    onChange={(e) => setWarrantyTerms(e.target.value)}
                    placeholder="Ex: 90 dias conforme CDC, 1 ano pelo fabricante..."
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 outline-none focus:border-amber-500"
                  />
                </div>

                {/* Notes */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    Observações Gerais
                  </label>
                  <textarea
                    rows={2}
                    value={generalNotes}
                    onChange={(e) => setGeneralNotes(e.target.value)}
                    placeholder="Informações adicionais..."
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 outline-none focus:border-amber-500 resize-none"
                  />
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="space-y-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all shadow-lg shadow-amber-500/20 active:scale-95 flex items-center justify-center gap-2"
                >
                  <FileCheck className="w-4 h-4" />
                  Salvar Orçamento e Gerar Notinha 📋
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleResetForm();
                    setActiveTab("lista");
                  }}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all border border-white/5"
                >
                  Cancelar e Voltar à Lista
                </button>
              </div>

            </div>

          </div>
        </form>
      )}

      {/* 5. MODAL: VIEW & PRINT NOTINHA MODAL */}
      {viewingOrcamento && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn text-left">
          <div className="bg-slate-900 border-2 border-amber-500/40 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* Modal Header */}
            <div className="p-4 bg-slate-950 border-b border-white/10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    Notinha de Orçamento {viewingOrcamento.code}
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    Cliente: {viewingOrcamento.clientName} • Validade: {viewingOrcamento.validUntil}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewingOrcamento(null)}
                className="p-1.5 bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-xl cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Thermal Paper Receipt Preview */}
            <div className="p-4 overflow-y-auto flex-1 space-y-4">
              
              {/* Thermal Receipt Visual Preview Box */}
              <div className="bg-white text-slate-950 font-mono p-4 sm:p-5 rounded-2xl shadow-inner max-w-sm mx-auto text-xs space-y-2 border border-slate-300">
                <div className="text-center space-y-0.5 border-b-2 border-dashed border-slate-300 pb-2">
                  <h3 className="font-black text-sm uppercase tracking-tight">{storeName.toUpperCase()}</h3>
                  {storeCnpj && <p className="text-[10px] text-slate-600">CNPJ/CPF: {storeCnpj}</p>}
                  {storePhone && <p className="text-[10px] text-slate-600">FONE: {storePhone}</p>}
                  <div className="mt-1.5 py-0.5 px-2 bg-slate-100 rounded text-[9.5px] font-black inline-block uppercase">
                    *** ORÇAMENTO COMERCIAL ***
                  </div>
                  <p className="text-[8.5px] text-slate-500">(NÃO É DOCUMENTO FISCAL)</p>
                </div>

                <div className="text-[10.5px] space-y-0.5 border-b border-dashed border-slate-300 py-1.5">
                  <div className="flex justify-between">
                    <span>ORÇAMENTO:</span>
                    <strong className="font-bold">{viewingOrcamento.code}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>DATA:</span>
                    <span>{viewingOrcamento.date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>VÁLIDO ATÉ:</span>
                    <strong>{viewingOrcamento.validUntil}</strong>
                  </div>
                  {viewingOrcamento.sellerName && (
                    <div className="flex justify-between">
                      <span>ATENDENTE:</span>
                      <span>{viewingOrcamento.sellerName}</span>
                    </div>
                  )}
                  <div className="pt-1">
                    <span>CLIENTE: <strong>{viewingOrcamento.clientName.toUpperCase()}</strong></span>
                    {viewingOrcamento.clientPhone && <span className="block">FONE: {viewingOrcamento.clientPhone}</span>}
                  </div>
                </div>

                {/* Items */}
                <div className="py-1 space-y-1.5 border-b-2 border-dashed border-slate-300">
                  <p className="font-black text-[9.5px] uppercase text-slate-600">ITENS COTADOS:</p>
                  {viewingOrcamento.items.map((it, idx) => (
                    <div key={it.id || idx} className="text-[10px] space-y-0.5">
                      <div className="flex justify-between font-bold">
                        <span>{idx + 1}. {it.name}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>{it.quantity} {it.unit} x {formatCurrency(it.unitPrice)}</span>
                        <span className="font-bold text-slate-950">{formatCurrency(it.total)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="space-y-0.5 text-[11px] py-1">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(viewingOrcamento.subtotal)}</span>
                  </div>
                  {viewingOrcamento.discountTotal > 0 && (
                    <div className="flex justify-between text-rose-600 font-bold">
                      <span>Desconto:</span>
                      <span>-{formatCurrency(viewingOrcamento.discountTotal)}</span>
                    </div>
                  )}
                  {viewingOrcamento.shippingOrFees > 0 && (
                    <div className="flex justify-between">
                      <span>Frete/Taxas:</span>
                      <span>+{formatCurrency(viewingOrcamento.shippingOrFees)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-black text-sm border-t border-slate-400 pt-1 mt-1">
                    <span>TOTAL:</span>
                    <span className="text-emerald-700">{formatCurrency(viewingOrcamento.total)}</span>
                  </div>
                </div>

                {/* Conditions */}
                {viewingOrcamento.paymentConditions && (
                  <div className="text-[9.5px] border-t border-dashed border-slate-300 pt-1 text-slate-700">
                    <strong>PAGAMENTO:</strong> {viewingOrcamento.paymentConditions}
                  </div>
                )}
                {viewingOrcamento.deliveryTerms && (
                  <div className="text-[9.5px] text-slate-700">
                    <strong>ENTREGA:</strong> {viewingOrcamento.deliveryTerms}
                  </div>
                )}

                <div className="text-center pt-3 border-t-2 border-dashed border-slate-300">
                  <div className="border-t border-slate-400 w-3/4 mx-auto my-3"></div>
                  <p className="text-[8.5px] text-slate-600">Assinatura do Cliente / Aceite</p>
                  <p className="text-[7.5px] text-slate-400 mt-1">Orçamento Comercial • Sem validade fiscal</p>
                </div>
              </div>

            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 bg-slate-950 border-t border-white/10 space-y-2.5">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {/* Print Thermal */}
                <button
                  type="button"
                  onClick={() => handlePrintThermalReceipt(viewingOrcamento)}
                  className="py-2.5 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  Notinha Bobina
                </button>

                {/* PNG 57mm Fun Print */}
                <button
                  type="button"
                  onClick={() => handleDownloadQuotePng57mm(viewingOrcamento)}
                  className="py-2.5 px-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-md shadow-cyan-500/20 active:scale-95"
                >
                  <FileText className="w-4 h-4" />
                  PNG 57mm
                </button>

                {/* Print A4 */}
                <button
                  type="button"
                  onClick={() => handlePrintA4Proposal(viewingOrcamento)}
                  className="py-2.5 px-3 bg-sky-600 hover:bg-sky-500 text-white font-black text-xs uppercase rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-md shadow-sky-500/20 active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  Proposta A4 / PDF
                </button>

                {/* WhatsApp */}
                <button
                  type="button"
                  onClick={() => handleSendWhatsApp(viewingOrcamento)}
                  className="py-2.5 px-3 bg-[#25D366] hover:bg-[#20ba5a] text-slate-950 font-black text-xs uppercase rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95"
                >
                  <Send className="w-4 h-4" />
                  WhatsApp
                </button>

                {/* Copy Text */}
                <button
                  type="button"
                  onClick={() => handleCopyQuoteText(viewingOrcamento)}
                  className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <Copy className="w-4 h-4" />
                  Copiar Texto
                </button>
              </div>

              {/* Optional: Convert into Sale on Cash Register */}
              {onLoadIntoCart && (
                <div className="pt-1 flex items-center justify-between border-t border-white/5">
                  <span className="text-[10px] text-slate-400">
                    O cliente aprovou a cotação e vai levar agora?
                  </span>
                  <button
                    type="button"
                    onClick={() => handleLoadIntoPDVCart(viewingOrcamento)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] uppercase rounded-lg cursor-pointer transition-all flex items-center gap-1 shadow-md shadow-emerald-600/20 active:scale-95"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    Carregar no Caixa do PDV
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* 5. MODAL VITRINE: ADICIONAR PRODUTOS DO ESTOQUE AO ORÇAMENTO */}
      {isCatalogModalOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border-2 border-amber-500/40 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl text-left overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-white/10 bg-slate-950/70 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30">
                  <Package className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black uppercase text-white tracking-wide">
                      Catálogo de Produtos do Estoque 📦
                    </h3>
                    <span className="px-2 py-0.5 text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full">
                      Sem Baixa de Estoque
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Clique em <strong>+ Adicionar</strong> nos itens desejados para lançar no orçamento. Os produtos continuam intactos no estoque!
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCatalogModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
                title="Fechar catálogo"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter and Search Bar */}
            <div className="p-4 bg-slate-950/40 border-b border-white/5 space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar por nome, categoria, código rápido ou código de barras..."
                    value={catalogModalSearch}
                    onChange={(e) => setCatalogModalSearch(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 focus:border-amber-400 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none"
                    autoFocus
                  />
                  {catalogModalSearch && (
                    <button
                      type="button"
                      onClick={() => setCatalogModalSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                  <button
                    type="button"
                    onClick={() => setCatalogModalCategory("all")}
                    className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase whitespace-nowrap cursor-pointer transition-all ${
                      catalogModalCategory === "all"
                        ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    Todos ({customProducts.length})
                  </button>
                  {distinctCategories.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCatalogModalCategory(cat)}
                      className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase whitespace-nowrap cursor-pointer transition-all ${
                        catalogModalCategory === cat
                          ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25"
                          : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Products Grid */}
            <div className="p-4 sm:p-5 flex-1 overflow-y-auto max-h-[55vh]">
              {filteredCatalogModalProducts.length === 0 ? (
                <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                  <Package className="w-10 h-10 text-slate-600" />
                  <p className="text-sm font-bold uppercase">Nenhum produto encontrado</p>
                  <span className="text-xs text-slate-500">Tente buscar por outro termo ou cadastre mais produtos no Estoque.</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {filteredCatalogModalProducts.map(prod => {
                    const existingInQuote = formItems.find(it => it.name.toUpperCase() === prod.name.toUpperCase() || (it.productId && it.productId === prod.id));
                    return (
                      <div
                        key={prod.id}
                        className={`p-3 rounded-2xl border transition-all flex flex-col justify-between gap-2.5 ${
                          existingInQuote
                            ? "bg-amber-950/20 border-amber-500/40 shadow-sm"
                            : "bg-slate-950/70 border-white/10 hover:border-white/20"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <span className="font-black text-white text-xs uppercase block truncate" title={prod.name}>
                              {prod.name}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span className="text-[9px] font-bold text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-white/5 uppercase">
                                {prod.category || "Geral"}
                              </span>
                              {prod.unit && (
                                <span className="text-[9px] font-mono text-slate-400">
                                  /{prod.unit}
                                </span>
                              )}
                              {prod.quickCode && (
                                <span className="text-[8.5px] font-mono font-bold text-amber-400 bg-amber-400/10 px-1 py-0.2 rounded">
                                  ⚡{prod.quickCode}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <span className="font-mono font-black text-sm text-emerald-400 shrink-0">
                            {formatCurrency(prod.price)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5">
                          {existingInQuote ? (
                            <span className="text-[10px] font-black font-mono text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-lg border border-amber-500/30">
                              No orçamento: {existingInQuote.quantity} {existingInQuote.unit}
                            </span>
                          ) : (
                            <span className="text-[9.5px] text-slate-500">
                              Não adicionado
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDirectAddProductToForm(prod)}
                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all flex items-center gap-1 shadow-md shadow-amber-500/20 active:scale-95"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>{existingInQuote ? "+1 Mais" : "Adicionar"}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 sm:p-4 bg-slate-950 border-t border-white/10 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-400 font-medium">
                Total no orçamento agora: <strong className="text-white font-mono">{formItems.length} itens</strong> ({formatCurrency(formCalculations.total)})
              </span>
              <button
                type="button"
                onClick={() => setIsCatalogModalOpen(false)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all"
              >
                Concluir e Voltar ao Orçamento
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
