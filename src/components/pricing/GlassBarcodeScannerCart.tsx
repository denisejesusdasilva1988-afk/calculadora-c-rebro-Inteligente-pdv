import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Camera,
  Barcode,
  Plus,
  Trash2,
  Edit3,
  ShoppingCart,
  Check,
  RefreshCw,
  X,
  Share2,
  DollarSign,
  Scale,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Search,
  Zap,
  Tag,
  Wine,
  Coins
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { SmartNumericInput } from "./SmartNumericInput";

export interface CatalogBottleItem {
  id: string;
  name: string;
  barcode: string; // Ex: "78936683"
  category: "longneck" | "900ml" | "litrao" | "cerveja600" | "vinho" | "outro";
  volumeMl: number;
  unitWeightKg: number; // Peso médio em kg
  buyPricePerUnit: number; // Preço pago ao colaborador por unidade (R$)
  returnableSellPrice?: number; // Preço de revenda se for casco retornável inteiro
  emoji: string;
  quickPresets: number[]; // [3, 6, 10, 20, 25, 30, 60] ou [2, 4, 10, 20, 25, 100]
}

export interface GlassCartItem {
  id: string;
  catalogId: string;
  name: string;
  barcode: string;
  category: "longneck" | "900ml" | "litrao" | "cerveja600" | "vinho" | "outro";
  emoji: string;
  quantity: number;
  unitWeightKg: number;
  totalWeightKg: number;
  buyPricePerUnit: number;
  totalBuyCost: number;
  sellPriceUnitOrWeight: number; // Valor bruto de venda (peso usina ou retornável)
  totalRevenue: number;
  profit: number;
}

// Helper para calcular o custo exato de compra conforme o acordo do portão:
// • 30 Longnecks = R$ 0,50 | 60 Longnecks = R$ 1,00
// • 10 Dreher/51 = R$ 0,50 | 20 = R$ 1,00 | 100 = R$ 5,00
export const calculateGlassBuyCost = (category: string, quantity: number, defaultUnitCost?: number) => {
  if (category === "longneck") {
    // 30 un = R$ 0,50 | 60 un = R$ 1,00
    const lotsOf30 = Math.floor(quantity / 30);
    const remainder = quantity % 30;
    const cost = lotsOf30 * 0.50 + remainder * (0.50 / 30);
    return Math.round(cost * 100) / 100;
  }
  if (category === "900ml") {
    // 10 un = R$ 0,50 | 20 un = R$ 1,00 | 100 un = R$ 5,00 (exatamente R$ 0,05 por garrafa)
    const cost = quantity * 0.05;
    return Math.round(cost * 100) / 100;
  }
  return Math.round(quantity * (defaultUnitCost || 0.02) * 100) / 100;
};

// Catálogo inicial com os códigos de barras e regras de compra solicitadas pelo usuário
const DEFAULT_BOTTLE_CATALOG: CatalogBottleItem[] = [
  {
    id: "bottle_heineken_330",
    name: "Heineken Longneck 330ml",
    barcode: "78936683",
    category: "longneck",
    volumeMl: 330,
    unitWeightKg: 0.185, // 185g (6 un = 1,112 kg)
    buyPricePerUnit: 0.50 / 30, // 30 garrafas = R$ 0,50 | 60 = R$ 1,00
    emoji: "🍺",
    quickPresets: [3, 6, 10, 20, 25, 30, 60]
  },
  {
    id: "bottle_imperio_210",
    name: "Império Longneck 210ml",
    barcode: "7898915949162",
    category: "longneck",
    volumeMl: 210,
    unitWeightKg: 0.150, // 150g
    buyPricePerUnit: 0.50 / 30, // 30 garrafas = R$ 0,50 | 60 = R$ 1,00
    emoji: "🍺",
    quickPresets: [3, 6, 10, 20, 25, 30, 60]
  },
  {
    id: "bottle_ice_275",
    name: "Ice Longneck 275ml (51 Ice / Smirnoff)",
    barcode: "7896002111034",
    category: "longneck",
    volumeMl: 275,
    unitWeightKg: 0.170, // 170g
    buyPricePerUnit: 0.50 / 30, // 30 garrafas = R$ 0,50 | 60 = R$ 1,00
    emoji: "🧊",
    quickPresets: [3, 6, 10, 20, 25, 30, 60]
  },
  {
    id: "bottle_dreher_900",
    name: "Dreher Garrafa 900ml",
    barcode: "7896010006360",
    category: "900ml",
    volumeMl: 900,
    unitWeightKg: 0.490, // ~490g a 500g (2 un = ~1 kg)
    buyPricePerUnit: 0.05, // 10 garrafas = R$ 0,50 | 20 = R$ 1,00 | 100 = R$ 5,00
    emoji: "🍾",
    quickPresets: [2, 4, 10, 20, 25, 100]
  },
  {
    id: "bottle_cachaca_51_900",
    name: "Cachaça 51 Garrafa 900ml",
    barcode: "", // Aberto para cadastrar / bipar quando tiver em mãos
    category: "900ml",
    volumeMl: 900,
    unitWeightKg: 0.500, // 500g (2 un = 1 kg)
    buyPricePerUnit: 0.05, // 10 garrafas = R$ 0,50 | 20 = R$ 1,00 | 100 = R$ 5,00
    emoji: "🥃",
    quickPresets: [2, 4, 10, 20, 25, 100]
  },
  {
    id: "bottle_cerveja_600",
    name: "Cerveja 600ml Retornável (Ambev / Brahma / Skol)",
    barcode: "7891991000826",
    category: "cerveja600",
    volumeMl: 600,
    unitWeightKg: 0.450,
    buyPricePerUnit: 0.50, // Paga 50 centavos por unidade intacta!
    returnableSellPrice: 1.00, // Revende por R$ 1,00 para bares!
    emoji: "🍻",
    quickPresets: [1, 6, 12, 24]
  }
];

// Helper para emitir bipe sonoro de leitor
const playScannerBeep = (freq = 1900, duration = 0.08) => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {}
};

interface Props {
  sellPricePerTon: number; // Preço pago pela usina (ex: R$ 150/ton = R$ 0,15/kg)
  buyerName: string;
  onAddItemsToYardStock?: (itemsToAdd: { name: string; quantity: number; weightKg: number; costPaid: number }[]) => void;
  showNotification?: (msg: string, type: "success" | "error" | "info" | "warning") => void;
}

export function GlassBarcodeScannerCart({
  sellPricePerTon,
  buyerName,
  onAddItemsToYardStock,
  showNotification
}: Props) {
  const sellPricePerKg = sellPricePerTon > 0 ? sellPricePerTon / 1000 : 0.15;

  // Catálogo salvo em localStorage
  const [catalog, setCatalog] = useState<CatalogBottleItem[]>(() => {
    try {
      const stored = localStorage.getItem("pdv_glass_barcode_catalog_v1");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_BOTTLE_CATALOG;
  });

  // Carrinho de compras atual no balcão/portão
  const [cart, setCart] = useState<GlassCartItem[]>(() => {
    try {
      const stored = localStorage.getItem("pdv_glass_cart_items_v1");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  // Nome do colaborador/catador que está descarregando
  const [collectorName, setCollectorName] = useState<string>("Colaborador do Portão");

  // Visualização ativa: "carrinho" | "catalogo"
  const [activeSubView, setActiveSubView] = useState<"carrinho" | "catalogo">("carrinho");

  // Campo de busca / digitação de código de barras
  const [barcodeInput, setBarcodeInput] = useState<string>("");
  const [searchFilter, setSearchFilter] = useState<string>("");

  // Estado do leitor de câmera (HTML5-QRCode)
  const [showScannerModal, setShowScannerModal] = useState<boolean>(false);
  const [scannerCameraError, setScannerCameraError] = useState<string | null>(null);
  const [scannerTorchOn, setScannerTorchOn] = useState<boolean>(false);
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);

  // Modal para cadastro rápido quando bipar um código desconhecido
  const [unknownBarcodePrompt, setUnknownBarcodePrompt] = useState<{
    barcode: string;
    isOpen: boolean;
  } | null>(null);

  // Modal para edição ou novo cadastro manual no catálogo
  const [editingItem, setEditingItem] = useState<CatalogBottleItem | null>(null);

  // Salvar catálogo automaticamente
  useEffect(() => {
    try {
      localStorage.setItem("pdv_glass_barcode_catalog_v1", JSON.stringify(catalog));
    } catch {}
  }, [catalog]);

  // Salvar carrinho automaticamente
  useEffect(() => {
    try {
      localStorage.setItem("pdv_glass_cart_items_v1", JSON.stringify(cart));
    } catch {}
  }, [cart]);

  // Limpeza segura da câmera
  const stopScannerSafely = () => {
    if (html5QrcodeRef.current) {
      try {
        html5QrcodeRef.current
          .stop()
          .then(() => {
            html5QrcodeRef.current?.clear();
            html5QrcodeRef.current = null;
          })
          .catch(() => {
            html5QrcodeRef.current = null;
          });
      } catch {
        html5QrcodeRef.current = null;
      }
    }
  };

  // Iniciar leitor de câmera HTML5-QRCode
  useEffect(() => {
    let isCancelled = false;

    if (showScannerModal) {
      setScannerCameraError(null);
      const timer = setTimeout(() => {
        if (isCancelled) return;
        const viewport = document.getElementById("glass-barcode-scanner-viewport");
        if (!viewport) return;

        try {
          const scanner = new Html5Qrcode("glass-barcode-scanner-viewport", {
            formatsToSupport: [
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.UPC_E,
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.CODE_39,
              Html5QrcodeSupportedFormats.QR_CODE
            ],
            experimentalFeatures: {
              useBarCodeDetectorIfSupported: true
            },
            verbose: false
          });

          html5QrcodeRef.current = scanner;

          scanner
            .start(
              { facingMode: "environment" },
              {
                fps: 25,
                qrbox: { width: 280, height: 180 },
                aspectRatio: 1.333333
              },
              (decodedText) => {
                if (isCancelled) return;
                playScannerBeep(2100, 0.09);
                handleProcessScannedBarcode(decodedText.trim());
                setShowScannerModal(false);
              },
              () => {}
            )
            .catch((err) => {
              if (isCancelled) return;
              console.warn("Erro ao iniciar leitor de câmera:", err);
              setScannerCameraError(
                "Não foi possível abrir a câmera traseira. Verifique se deu permissão de câmera no navegador ou digite o código de barras no campo."
              );
            });
        } catch {
          setScannerCameraError("Falha ao inicializar leitor. Use a digitação manual de código de barras.");
        }
      }, 350);

      return () => {
        isCancelled = true;
        clearTimeout(timer);
        stopScannerSafely();
      };
    } else {
      stopScannerSafely();
    }
  }, [showScannerModal]);

  // Processar código de barras escaneado ou digitado
  const handleProcessScannedBarcode = (code: string) => {
    if (!code) return;
    const cleanCode = code.trim();
    setBarcodeInput("");

    // Procurar no catálogo
    const matched = catalog.find(
      (item) => item.barcode && item.barcode.trim() === cleanCode
    );

    if (matched) {
      // Produto encontrado! Adiciona ao carrinho com o preset padrão (ex: 6 garrafas ou 3)
      handleAddCatalogItemToCart(matched, 6);
      if (showNotification) {
        showNotification(`Bipado: ${matched.name} (+6 garrafas no carrinho)! 🏷️🍺`, "success");
      }
    } else {
      // Produto não encontrado -> abre modal de cadastro rápido
      setUnknownBarcodePrompt({
        barcode: cleanCode,
        isOpen: true
      });
      if (showNotification) {
        showNotification(`Código ${cleanCode} não cadastrado! Deseja cadastrar agora? ✍️`, "info");
      }
    }
  };

  // Adicionar garrafa do catálogo ao carrinho com quantidade X
  const handleAddCatalogItemToCart = (item: CatalogBottleItem, qty: number) => {
    if (qty <= 0) return;

    playScannerBeep(1750, 0.05);

    setCart((prev) => {
      const existingIdx = prev.findIndex((c) => c.catalogId === item.id);
      if (existingIdx >= 0) {
        // Já existe no carrinho -> soma a quantidade
        const updated = [...prev];
        const existing = updated[existingIdx];
        const newQty = existing.quantity + qty;
        const totalWeightKg = newQty * item.unitWeightKg;
        const totalBuyCost = calculateGlassBuyCost(item.category, newQty, item.buyPricePerUnit);
        const totalRevenue = item.returnableSellPrice
          ? newQty * item.returnableSellPrice
          : totalWeightKg * sellPricePerKg;
        const profit = totalRevenue - totalBuyCost;

        updated[existingIdx] = {
          ...existing,
          quantity: newQty,
          totalWeightKg,
          totalBuyCost,
          totalRevenue,
          profit
        };
        return updated;
      } else {
        // Novo item no carrinho
        const totalWeightKg = qty * item.unitWeightKg;
        const totalBuyCost = calculateGlassBuyCost(item.category, qty, item.buyPricePerUnit);
        const totalRevenue = item.returnableSellPrice
          ? qty * item.returnableSellPrice
          : totalWeightKg * sellPricePerKg;
        const profit = totalRevenue - totalBuyCost;

        const newItem: GlassCartItem = {
          id: `cart_${Date.now()}_${Math.random()}`,
          catalogId: item.id,
          name: item.name,
          barcode: item.barcode,
          category: item.category,
          emoji: item.emoji,
          quantity: qty,
          unitWeightKg: item.unitWeightKg,
          totalWeightKg,
          buyPricePerUnit: item.buyPricePerUnit,
          totalBuyCost,
          sellPriceUnitOrWeight: item.returnableSellPrice || item.unitWeightKg * sellPricePerKg,
          totalRevenue,
          profit
        };
        return [newItem, ...prev];
      }
    });
  };

  // Atualizar quantidade de um item no carrinho
  const handleUpdateCartItemQty = (cartId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveCartItem(cartId);
      return;
    }

    setCart((prev) =>
      prev.map((c) => {
        if (c.id === cartId) {
          const totalWeightKg = newQty * c.unitWeightKg;
          const catalogItem = catalog.find((cat) => cat.id === c.catalogId);
          const totalBuyCost = calculateGlassBuyCost(c.category, newQty, c.buyPricePerUnit);
          const totalRevenue = catalogItem?.returnableSellPrice
            ? newQty * catalogItem.returnableSellPrice
            : totalWeightKg * sellPricePerKg;
          const profit = totalRevenue - totalBuyCost;

          return {
            ...c,
            quantity: newQty,
            totalWeightKg,
            totalBuyCost,
            totalRevenue,
            profit
          };
        }
        return c;
      })
    );
  };

  // Remover item do carrinho
  const handleRemoveCartItem = (cartId: string) => {
    setCart((prev) => prev.filter((c) => c.id !== cartId));
  };

  // Limpar carrinho
  const handleClearCart = () => {
    setCart([]);
    if (showNotification) {
      showNotification("Carrinho do portão limpo! 🗑️", "info");
    }
  };

  // Salvar novo cadastro no catálogo (ou atualizar Cachaça 51 com novo código de barras)
  const handleSaveCatalogBottle = (bottleData: Partial<CatalogBottleItem>) => {
    if (!bottleData.name || !bottleData.name.trim()) {
      if (showNotification) showNotification("Dê um nome para a garrafa.", "warning");
      return;
    }

    const cleanBarcode = (bottleData.barcode || "").trim();

    // Se já estiver editando um existente
    if (editingItem && editingItem.id) {
      setCatalog((prev) =>
        prev.map((item) =>
          item.id === editingItem.id
            ? {
                ...item,
                ...bottleData,
                barcode: cleanBarcode
              } as CatalogBottleItem
            : item
        )
      );
      if (showNotification) {
        showNotification(`Garrafa "${bottleData.name}" atualizada no catálogo! 🏷️💾`, "success");
      }
    } else {
      // Novo cadastro
      const newItem: CatalogBottleItem = {
        id: `bottle_${Date.now()}`,
        name: bottleData.name.trim(),
        barcode: cleanBarcode,
        category: bottleData.category || "longneck",
        volumeMl: bottleData.volumeMl || 330,
        unitWeightKg: bottleData.unitWeightKg || 0.185,
        buyPricePerUnit: bottleData.buyPricePerUnit || 0.02,
        returnableSellPrice: bottleData.returnableSellPrice || 0,
        emoji: bottleData.emoji || (bottleData.category === "900ml" ? "🍾" : "🍺"),
        quickPresets: [3, 6, 10, 20, 25]
      };
      setCatalog((prev) => [newItem, ...prev]);

      // Se veio de um código desconhecido bipado, já adiciona no carrinho!
      if (unknownBarcodePrompt?.isOpen) {
        handleAddCatalogItemToCart(newItem, 6);
      }

      if (showNotification) {
        showNotification(`Garrafa "${newItem.name}" cadastrada com código ${cleanBarcode || "sem código"}! 🏷️✅`, "success");
      }
    }

    setEditingItem(null);
    setUnknownBarcodePrompt(null);
  };

  // Excluir item do catálogo
  const handleDeleteCatalogBottle = (id: string, name: string) => {
    if (catalog.length <= 1) {
      if (showNotification) showNotification("Mantenha ao menos 1 garrafa no catálogo.", "warning");
      return;
    }
    setCatalog((prev) => prev.filter((item) => item.id !== id));
    if (showNotification) showNotification(`Item "${name}" removido do catálogo.`, "info");
  };

  // Restaurar catálogo padrão
  const handleResetCatalog = () => {
    setCatalog(DEFAULT_BOTTLE_CATALOG);
    localStorage.removeItem("pdv_glass_barcode_catalog_v1");
    if (showNotification) showNotification("Catálogo restaurado para o padrão de fábrica! 🔄", "info");
  };

  // Totais e Cálculos do Carrinho
  const cartCalculations = useMemo(() => {
    let totalLongneckCount = 0;
    let total900mlCount = 0;
    let totalOtherCount = 0;
    let totalQuantity = 0;
    let totalWeightKg = 0;
    let totalBuyCost = 0;
    let totalRevenue = 0;

    cart.forEach((item) => {
      totalQuantity += item.quantity;
      totalWeightKg += item.totalWeightKg;
      totalBuyCost += item.totalBuyCost;
      totalRevenue += item.totalRevenue;

      if (item.category === "longneck") {
        totalLongneckCount += item.quantity;
      } else if (item.category === "900ml") {
        total900mlCount += item.quantity;
      } else {
        totalOtherCount += item.quantity;
      }
    });

    const netProfit = totalRevenue - totalBuyCost;
    const marginPct = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    return {
      totalLongneckCount,
      total900mlCount,
      totalOtherCount,
      totalQuantity,
      totalWeightKg,
      totalBuyCost,
      totalRevenue,
      netProfit,
      marginPct
    };
  }, [cart]);

  // Finalizar Compra e Pagar ao Colaborador
  const handleFinalizePurchase = () => {
    if (cart.length === 0) {
      if (showNotification) showNotification("O carrinho está vazio! Bipe ou adicione garrafas.", "warning");
      return;
    }

    // Se houver callback para o pátio geral
    if (onAddItemsToYardStock) {
      const itemsToAdd = cart.map((c) => ({
        name: c.name,
        quantity: c.quantity,
        weightKg: c.totalWeightKg,
        costPaid: c.totalBuyCost
      }));
      onAddItemsToYardStock(itemsToAdd);
    }

    // Salvar histórico de compras no localStorage
    try {
      const historyLog = {
        id: `purchase_${Date.now()}`,
        timestamp: new Date().toLocaleString("pt-BR"),
        collector: collectorName,
        totalBottles: cartCalculations.totalQuantity,
        longnecks: cartCalculations.totalLongneckCount,
        garrafas900ml: cartCalculations.total900mlCount,
        totalWeightKg: cartCalculations.totalWeightKg,
        totalPaid: cartCalculations.totalBuyCost,
        expectedRevenue: cartCalculations.totalRevenue,
        profit: cartCalculations.netProfit,
        items: cart.map((c) => `${c.quantity}x ${c.name}`)
      };

      const existingHistory = JSON.parse(localStorage.getItem("pdv_glass_completed_purchases_v1") || "[]");
      existingHistory.unshift(historyLog);
      localStorage.setItem("pdv_glass_completed_purchases_v1", JSON.stringify(existingHistory.slice(0, 30)));
    } catch {}

    playScannerBeep(2400, 0.15);

    if (showNotification) {
      showNotification(
        `Compra finalizada com sucesso! R$ ${cartCalculations.totalBuyCost.toFixed(2)} pago a ${collectorName}! Estoque abastecido! 💰🎉`,
        "success"
      );
    }

    setCart([]);
  };

  // Gerar Comprovante do WhatsApp para o Colaborador
  const handleShareWhatsAppReceipt = () => {
    if (cart.length === 0) return;

    let msg = `🧾 *COMPROVANTE DE RECICLAGEM - FERRO VELHO* 🍾♻️\n`;
    msg += `📅 *Data:* ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}\n`;
    msg += `👤 *Colaborador / Entregador:* ${collectorName}\n`;
    msg += `🏢 *Destino do Vidro:* ${buyerName}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n\n`;

    msg += `📦 *ITENS CONFERIDOS NO BALCÃO:*\n`;
    cart.forEach((item) => {
      msg += `• ${item.emoji} *${item.name}*: ${item.quantity} garrafas | Peso: ~${item.totalWeightKg.toFixed(1)} kg | Pago: R$ ${item.totalBuyCost.toFixed(2)}\n`;
      if (item.barcode) {
        msg += `  🔖 Cód: ${item.barcode}\n`;
      }
    });

    msg += `\n━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `🍾 *Total de Garrafas:* ${cartCalculations.totalQuantity} unidades\n`;
    if (cartCalculations.totalLongneckCount > 0) {
      msg += `  🍺 Longnecks: ${cartCalculations.totalLongneckCount} un\n`;
    }
    if (cartCalculations.total900mlCount > 0) {
      msg += `  🍾 Garrafas 900ml: ${cartCalculations.total900mlCount} un\n`;
    }
    msg += `⚖️ *Peso Total Estimado:* ${cartCalculations.totalWeightKg.toFixed(1)} kg\n`;
    msg += `💰 *VALOR TOTAL PAGO AO COLABORADOR:* R$ ${cartCalculations.totalBuyCost.toFixed(2)}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `_Obrigado pela entrega e parceria na reciclagem!_ 🌿`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-6 text-left">
      {/* BARRA SUPERIOR DE AÇÕES & BIPAR CÓDIGO DE BARRAS */}
      <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-4 sm:p-5 shadow-2xl space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300">
                <Barcode className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <span>Catálogo de Garrafas & Carrinho do Portão</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                    Bipe Rápido
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Bipe o código de barras da Heineken, Império, Ice ou Dreher para adicionar lotes de 3, 6, 10, 20 ou 25 garrafas direto no carrinho!
                </p>
              </div>
            </div>
          </div>

          {/* Abas Sub-Visão: Carrinho vs Catálogo */}
          <div className="flex items-center gap-2 self-stretch md:self-auto">
            <button
              type="button"
              onClick={() => setActiveSubView("carrinho")}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 border ${
                activeSubView === "carrinho"
                  ? "bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-950/50"
                  : "bg-slate-950 text-slate-300 border-white/10 hover:bg-slate-800"
              }`}
            >
              <ShoppingCart className="w-4 h-4 text-emerald-300" />
              <span>Carrinho ({cart.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubView("catalogo")}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 border ${
                activeSubView === "catalogo"
                  ? "bg-amber-500 text-slate-950 border-amber-300 shadow-md shadow-amber-950/50"
                  : "bg-slate-950 text-slate-300 border-white/10 hover:bg-slate-800"
              }`}
            >
              <Tag className="w-4 h-4 text-amber-400" />
              <span>Catálogo ({catalog.length})</span>
            </button>
          </div>
        </div>

        {/* ÁREA DE BIPAR / DIGITAR CÓDIGO DE BARRAS */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-2 border-t border-white/10">
          {/* Botão de Abrir Câmera para Bipar */}
          <div className="sm:col-span-4">
            <button
              type="button"
              onClick={() => setShowScannerModal(true)}
              className="w-full py-2.5 px-3 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 active:scale-95 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/25"
            >
              <Camera className="w-4 h-4" />
              <span>📷 Bipar com Câmera</span>
            </button>
          </div>

          {/* Campo de Entrada de Código de Barras (ou Leitor Físico USB) */}
          <div className="sm:col-span-8 flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && barcodeInput.trim()) {
                    handleProcessScannedBarcode(barcodeInput.trim());
                  }
                }}
                placeholder="Bipe ou digite o código de barras (Ex: 78936683)..."
                className="w-full bg-slate-950 border border-white/15 focus:border-emerald-400 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-slate-500 outline-none"
              />
              {barcodeInput && (
                <button
                  type="button"
                  onClick={() => setBarcodeInput("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => handleProcessScannedBarcode(barcodeInput.trim())}
              disabled={!barcodeInput.trim()}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-bold text-xs uppercase rounded-xl border border-white/10 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Bipar</span>
            </button>
          </div>
        </div>
      </div>

      {/* MODAL DO LEITOR DE CÓDIGO DE BARRAS POR CÂMERA */}
      <AnimatePresence>
        {showScannerModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-emerald-500/40 rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl relative"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-emerald-400" />
                  <h4 className="text-sm font-black text-white uppercase tracking-wider">
                    Leitor de Código de Barras
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setShowScannerModal(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Viewport da Câmera */}
              <div className="relative rounded-2xl overflow-hidden bg-black border border-white/10 aspect-video flex items-center justify-center">
                <div id="glass-barcode-scanner-viewport" className="w-full h-full" />
                {scannerCameraError && (
                  <div className="absolute inset-0 p-4 bg-slate-950/90 flex flex-col items-center justify-center text-center space-y-2">
                    <AlertTriangle className="w-8 h-8 text-amber-400" />
                    <p className="text-xs text-rose-300 font-bold">{scannerCameraError}</p>
                    <button
                      type="button"
                      onClick={() => setShowScannerModal(false)}
                      className="px-4 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-lg border border-white/10"
                    >
                      Fechar e Digitar Código
                    </button>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                Aponte a câmera para o código de barras da garrafa (Heineken, Dreher, etc.). O sistema emitirá um som e adicionará ao carrinho na hora!
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL PARA CADASTRAR CÓDIGO DESCONHECIDO OU EDITAR GARRAFA */}
      <AnimatePresence>
        {(unknownBarcodePrompt?.isOpen || editingItem) && (
          <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-lg w-full p-5 space-y-4 shadow-2xl relative text-left"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Tag className="w-5 h-5 text-amber-400" />
                  <h4 className="text-sm font-black text-white uppercase tracking-wider">
                    {editingItem?.id ? "Editar Garrafa no Catálogo" : "Cadastrar Nova Garrafa no Catálogo"}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingItem(null);
                    setUnknownBarcodePrompt(null);
                  }}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const name = (form.elements.namedItem("bottleName") as HTMLInputElement).value;
                  const barcode = (form.elements.namedItem("bottleBarcode") as HTMLInputElement).value;
                  const category = (form.elements.namedItem("bottleCategory") as HTMLSelectElement).value as any;
                  const volumeMl = Number((form.elements.namedItem("bottleVolume") as HTMLInputElement).value) || 330;
                  const unitWeightGrams = Number((form.elements.namedItem("bottleWeightGrams") as HTMLInputElement).value) || 185;
                  const buyPrice = Number((form.elements.namedItem("bottleBuyPrice") as HTMLInputElement).value) || 0.02;
                  const resellPrice = Number((form.elements.namedItem("bottleResellPrice") as HTMLInputElement).value) || 0;

                  handleSaveCatalogBottle({
                    name,
                    barcode,
                    category,
                    volumeMl,
                    unitWeightKg: unitWeightGrams / 1000,
                    buyPricePerUnit: buyPrice,
                    returnableSellPrice: resellPrice
                  });
                }}
                className="space-y-3.5 text-xs"
              >
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-amber-400 block">
                    Nome da Garrafa / Bebida:
                  </label>
                  <input
                    type="text"
                    name="bottleName"
                    defaultValue={editingItem?.name || ""}
                    placeholder="Ex: Cachaça 51 900ml, Skol 600ml, etc."
                    required
                    className="w-full bg-slate-950 border border-white/15 focus:border-amber-400 rounded-xl px-3 py-2 text-white font-bold outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 block">
                      Código de Barras (EAN):
                    </label>
                    <input
                      type="text"
                      name="bottleBarcode"
                      defaultValue={editingItem?.barcode || unknownBarcodePrompt?.barcode || ""}
                      placeholder="Ex: 78936683"
                      className="w-full bg-slate-950 border border-white/15 focus:border-amber-400 rounded-xl px-3 py-2 text-white font-mono outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 block">
                      Categoria do Recipiente:
                    </label>
                    <select
                      name="bottleCategory"
                      defaultValue={editingItem?.category || "longneck"}
                      className="w-full bg-slate-950 border border-white/15 focus:border-amber-400 rounded-xl px-2.5 py-2 text-white font-bold outline-none"
                    >
                      <option value="longneck">Longneck (210ml a 355ml)</option>
                      <option value="900ml">Garrafa 900ml / 1L (Dreher, 51)</option>
                      <option value="cerveja600">Cerveja 600ml (Retornável)</option>
                      <option value="litrao">Litrão 1 Litro</option>
                      <option value="vinho">Vinho / Espumante</option>
                      <option value="outro">Outro Vidro</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 block">
                      Peso de 1 Garrafa Vazia (Gramas):
                    </label>
                    <input
                      type="number"
                      name="bottleWeightGrams"
                      step={5}
                      defaultValue={editingItem ? editingItem.unitWeightKg * 1000 : 185}
                      placeholder="185g"
                      className="w-full bg-slate-950 border border-white/15 focus:border-amber-400 rounded-xl px-3 py-2 text-white font-mono outline-none"
                    />
                    <span className="text-[9px] text-slate-500 block">
                      Longneck ≈ 185g | Dreher/51 ≈ 500g
                    </span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 block">
                      Volume (ml):
                    </label>
                    <input
                      type="number"
                      name="bottleVolume"
                      defaultValue={editingItem?.volumeMl || 330}
                      placeholder="330"
                      className="w-full bg-slate-950 border border-white/15 focus:border-amber-400 rounded-xl px-3 py-2 text-white font-mono outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-rose-400 block">
                      Paga ao Colaborador por Garrafa (R$):
                    </label>
                    <input
                      type="number"
                      name="bottleBuyPrice"
                      step={0.005}
                      defaultValue={editingItem?.buyPricePerUnit ?? 0.02}
                      placeholder="0.02"
                      className="w-full bg-slate-950 border border-white/15 focus:border-rose-400 rounded-xl px-3 py-2 text-rose-300 font-mono font-bold outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-cyan-400 block">
                      Venda Retornável a Bares (R$ opcional):
                    </label>
                    <input
                      type="number"
                      name="bottleResellPrice"
                      step={0.10}
                      defaultValue={editingItem?.returnableSellPrice || 0}
                      placeholder="0.00"
                      className="w-full bg-slate-950 border border-white/15 focus:border-cyan-400 rounded-xl px-3 py-2 text-cyan-300 font-mono outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingItem(null);
                      setUnknownBarcodePrompt(null);
                    }}
                    className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer"
                  >
                    Salvar no Catálogo
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ABA 1: CARRINHO DE COMPRAS NO PORTÃO (VENDAS / PAGAMENTOS) */}
      {activeSubView === "carrinho" && (
        <div className="space-y-5">
          {/* BANNER DOS LOTES COMBINADOS DO PORTÃO */}
          <div className="bg-gradient-to-r from-amber-950/60 via-slate-900 to-emerald-950/40 border-2 border-amber-500/40 rounded-3xl p-4 sm:p-5 shadow-2xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400">
                  <Coins className="w-5 h-5" />
                </span>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <span>Lotes Combinados do Portão</span>
                    <span className="text-[9px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/40">
                      1 Toque no Carrinho
                    </span>
                  </h4>
                  <p className="text-[10px] text-slate-300 mt-0.5">
                    <strong>30 Longnecks = R$ 0,50</strong> • <strong>60 Longnecks = R$ 1,00</strong> • <strong>10 Dreher/51 = R$ 0,50</strong> • <strong>20 = R$ 1,00</strong> • <strong>100 = R$ 5,00</strong>
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <button
                type="button"
                onClick={() => {
                  const heineken = catalog.find((c) => c.category === "longneck") || catalog[0];
                  handleAddCatalogItemToCart(heineken, 30);
                  if (showNotification) showNotification("+30 Longnecks adicionadas por R$ 0,50! 🍺💰", "success");
                }}
                className="p-3 bg-slate-950 hover:bg-amber-500 hover:text-slate-950 text-white rounded-2xl border border-amber-500/40 transition-all cursor-pointer text-left space-y-1 group shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="text-lg">🍺</span>
                  <span className="text-[9px] font-bold uppercase text-amber-400 group-hover:text-slate-950">Longneck</span>
                </div>
                <div className="text-sm font-black font-mono text-amber-300 group-hover:text-slate-950">
                  30 un = R$ 0,50
                </div>
                <span className="text-[9px] text-slate-400 group-hover:text-slate-900 block">
                  5 fardos de 6 (~5,5 kg)
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const heineken = catalog.find((c) => c.category === "longneck") || catalog[0];
                  handleAddCatalogItemToCart(heineken, 60);
                  if (showNotification) showNotification("+60 Longnecks adicionadas por R$ 1,00! 🍺💰", "success");
                }}
                className="p-3 bg-slate-950 hover:bg-amber-500 hover:text-slate-950 text-white rounded-2xl border border-amber-500/40 transition-all cursor-pointer text-left space-y-1 group shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="text-lg">🍺</span>
                  <span className="text-[9px] font-bold uppercase text-amber-400 group-hover:text-slate-950">Longneck</span>
                </div>
                <div className="text-sm font-black font-mono text-amber-300 group-hover:text-slate-950">
                  60 un = R$ 1,00
                </div>
                <span className="text-[9px] text-slate-400 group-hover:text-slate-900 block">
                  10 fardos de 6 (~11,1 kg)
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const dreher = catalog.find((c) => c.category === "900ml") || catalog[3];
                  handleAddCatalogItemToCart(dreher, 10);
                  if (showNotification) showNotification("+10 Dreher/51 adicionadas por R$ 0,50! 🍾💰", "success");
                }}
                className="p-3 bg-slate-950 hover:bg-teal-500 hover:text-slate-950 text-white rounded-2xl border border-teal-500/40 transition-all cursor-pointer text-left space-y-1 group shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="text-lg">🍾</span>
                  <span className="text-[9px] font-bold uppercase text-teal-400 group-hover:text-slate-950">Dreher / 51</span>
                </div>
                <div className="text-sm font-black font-mono text-teal-300 group-hover:text-slate-950">
                  10 un = R$ 0,50
                </div>
                <span className="text-[9px] text-slate-400 group-hover:text-slate-900 block">
                  5 pares (5,0 kg certinho)
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const dreher = catalog.find((c) => c.category === "900ml") || catalog[3];
                  handleAddCatalogItemToCart(dreher, 20);
                  if (showNotification) showNotification("+20 Dreher/51 adicionadas por R$ 1,00! 🍾💰", "success");
                }}
                className="p-3 bg-slate-950 hover:bg-teal-500 hover:text-slate-950 text-white rounded-2xl border border-teal-500/40 transition-all cursor-pointer text-left space-y-1 group shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="text-lg">🍾</span>
                  <span className="text-[9px] font-bold uppercase text-teal-400 group-hover:text-slate-950">Dreher / 51</span>
                </div>
                <div className="text-sm font-black font-mono text-teal-300 group-hover:text-slate-950">
                  20 un = R$ 1,00
                </div>
                <span className="text-[9px] text-slate-400 group-hover:text-slate-900 block">
                  10 pares (10,0 kg)
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const dreher = catalog.find((c) => c.category === "900ml") || catalog[3];
                  handleAddCatalogItemToCart(dreher, 100);
                  if (showNotification) showNotification("+100 Dreher/51 adicionadas por R$ 5,00! 🍾💰", "success");
                }}
                className="p-3 bg-slate-950 hover:bg-emerald-500 hover:text-slate-950 text-white rounded-2xl border border-emerald-500/40 transition-all cursor-pointer text-left space-y-1 group shadow-md col-span-2 sm:col-span-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-lg">🍾</span>
                  <span className="text-[9px] font-bold uppercase text-emerald-400 group-hover:text-slate-950">Dreher / 51</span>
                </div>
                <div className="text-sm font-black font-mono text-emerald-300 group-hover:text-slate-950">
                  100 un = R$ 5,00
                </div>
                <span className="text-[9px] text-slate-400 group-hover:text-slate-900 block">
                  50 pares (50,0 kg)
                </span>
              </button>
            </div>
          </div>

          {/* CARDS INDIVIDUAIS DO CATÁLOGO DE GARRAFAS */}
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-4 sm:p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                Garrafas Catalogadas: Toque para Adicionar Quantidades
              </span>
              <span className="text-[10px] text-slate-400">
                Toque nos botões de quantidade abaixo
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {catalog.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-950/90 border border-white/10 hover:border-emerald-500/40 rounded-2xl p-3.5 space-y-2.5 transition-all text-left"
                >
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xl p-1 bg-slate-900 rounded-lg">{item.emoji}</span>
                      <div className="min-w-0">
                        <strong className="text-xs font-black text-white block truncate">{item.name}</strong>
                        <span className="text-[10px] text-slate-400 font-mono block">
                          {item.barcode ? `Cód: ${item.barcode}` : "Sem cód. (Toque para cadastrar)"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Botões Rápidos de Quantidade com os Lotes Combinados */}
                  <div className="space-y-1">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">
                      Adicionar ao Carrinho:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {item.quickPresets.map((qty) => {
                        let label = `+${qty}`;
                        let isSpecial = false;
                        if (item.category === "longneck" && qty === 30) {
                          label = "+30 (50¢) ⭐";
                          isSpecial = true;
                        } else if (item.category === "longneck" && qty === 60) {
                          label = "+60 (R$1) ⭐";
                          isSpecial = true;
                        } else if (item.category === "900ml" && qty === 10) {
                          label = "+10 (50¢) ⭐";
                          isSpecial = true;
                        } else if (item.category === "900ml" && qty === 20) {
                          label = "+20 (R$1) ⭐";
                          isSpecial = true;
                        } else if (item.category === "900ml" && qty === 100) {
                          label = "+100 (R$5) ⭐";
                          isSpecial = true;
                        }

                        return (
                          <button
                            key={qty}
                            type="button"
                            onClick={() => {
                              handleAddCatalogItemToCart(item, qty);
                              if (showNotification) {
                                showNotification(`+${qty} un de ${item.name} adicionadas ao carrinho! 🛒`, "success");
                              }
                            }}
                            className={`py-1.5 px-2 rounded-lg font-mono font-bold text-[10px] border transition-all cursor-pointer text-center ${
                              isSpecial
                                ? "bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500 hover:text-slate-950"
                                : "bg-slate-900 hover:bg-emerald-600 hover:text-white text-slate-300 border-white/5"
                            }`}
                            title={`Adicionar ${qty} garrafas`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* O CARRINHO CONFERIDO */}
          <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider block">
                  Conferência do Portão
                </span>
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2 mt-0.5">
                  <ShoppingCart className="w-5 h-5 text-emerald-400" />
                  Carrinho de Compras do Ferro Velho ({cart.length} itens)
                </h3>
              </div>

              {/* Nome do Colaborador que está recebendo o pagamento */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-bold whitespace-nowrap">Colaborador:</span>
                <input
                  type="text"
                  value={collectorName}
                  onChange={(e) => setCollectorName(e.target.value)}
                  placeholder="Nome do colaborador..."
                  className="bg-slate-950 border border-white/10 rounded-xl px-2.5 py-1 text-xs text-white font-bold outline-none focus:border-emerald-400"
                />
              </div>
            </div>

            {cart.length === 0 ? (
              <div className="py-12 text-center space-y-3 bg-slate-950/60 rounded-2xl border border-dashed border-white/10 p-6">
                <div className="w-12 h-12 rounded-full bg-slate-900 mx-auto flex items-center justify-center text-slate-500">
                  <ShoppingCart className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-black text-white">O Carrinho Está Vazio</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Toque nos botões <strong>+3, +6, +10, +20, +25</strong> acima ou <strong>bipe o código de barras</strong> da garrafa para iniciar a contagem e cálculo automático!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* LISTA DE ITENS NO CARRINHO */}
                <div className="divide-y divide-white/5 space-y-2">
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span className="text-2xl p-1 bg-slate-950 rounded-xl border border-white/5">
                          {item.emoji}
                        </span>
                        <div className="min-w-0">
                          <strong className="text-xs sm:text-sm font-black text-white block truncate">
                            {item.name}
                          </strong>
                          <span className="text-[10px] text-slate-400 block">
                            {item.barcode && `Cód: ${item.barcode} • `}
                            Peso: ~{item.totalWeightKg.toFixed(2)} kg ({(item.unitWeightKg * 1000).toFixed(0)}g cada)
                          </span>
                          {item.category === "longneck" && (
                            <span className="text-[9.5px] text-amber-300 font-bold block">
                              ⭐ Regra Combinada: 30 un = R$ 0,50 | 60 un = R$ 1,00
                            </span>
                          )}
                          {item.category === "900ml" && (
                            <span className="text-[9.5px] text-teal-300 font-bold block">
                              ⭐ Regra Combinada: 10 un = R$ 0,50 | 20 un = R$ 1,00 | 100 un = R$ 5,00
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Controle de Quantidade e Subtotais */}
                      <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                        {/* Stepper de Quantidade */}
                        <div className="flex items-center bg-slate-950 rounded-xl border border-white/10 p-0.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateCartItemQty(item.id, item.quantity - 1)}
                            className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-white font-black text-sm"
                          >
                            -
                          </button>
                          <span className="w-10 text-center font-mono font-black text-xs text-white">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateCartItemQty(item.id, item.quantity + 1)}
                            className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-white font-black text-sm"
                          >
                            +
                          </button>
                        </div>

                        {/* Valores Financeiros */}
                        <div className="text-right min-w-[110px]">
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">Pagar:</span>
                          <strong className="text-sm font-mono font-black text-amber-400">
                            R$ {item.totalBuyCost.toFixed(2)}
                          </strong>
                          <span className="text-[10px] text-emerald-400 font-bold block">
                            Usina: R$ {item.totalRevenue.toFixed(2)}
                          </span>
                        </div>

                        {/* Excluir do Carrinho */}
                        <button
                          type="button"
                          onClick={() => handleRemoveCartItem(item.id)}
                          className="text-slate-600 hover:text-rose-400 p-1.5 transition-all"
                          title="Remover este item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* RESUMO DOS TOTAIS DO CARRINHO */}
                <div className="bg-slate-950 p-4 sm:p-5 rounded-2xl border border-white/10 space-y-4">
                  {/* Divisão por categorias (Longnecks vs 900ml) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                    <div className="p-3 bg-slate-900 rounded-xl border border-white/5 space-y-0.5">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">🍺 Total Longnecks:</span>
                      <strong className="text-lg font-mono font-black text-white">
                        {cartCalculations.totalLongneckCount} un
                      </strong>
                    </div>

                    <div className="p-3 bg-slate-900 rounded-xl border border-white/5 space-y-0.5">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">🍾 Total 900ml / 1L:</span>
                      <strong className="text-lg font-mono font-black text-white">
                        {cartCalculations.total900mlCount} un
                      </strong>
                    </div>

                    <div className="p-3 bg-slate-900 rounded-xl border border-white/5 space-y-0.5">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">⚖️ Peso Total:</span>
                      <strong className="text-lg font-mono font-black text-emerald-400">
                        {cartCalculations.totalWeightKg.toFixed(1)} kg
                      </strong>
                    </div>

                    <div className="p-3 bg-slate-900 rounded-xl border border-white/5 space-y-0.5">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">📦 Total Garrafas:</span>
                      <strong className="text-lg font-mono font-black text-white">
                        {cartCalculations.totalQuantity} un
                      </strong>
                    </div>
                  </div>

                  {/* Resumo Financeiro da Compra */}
                  <div className="pt-2 border-t border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400">Venda Estimada na Usina ({buyerName}):</span>
                        <strong className="text-white font-mono font-bold">
                          R$ {cartCalculations.totalRevenue.toFixed(2)}
                        </strong>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400">Seu Lucro Líquido nesta Compra:</span>
                        <strong className="text-emerald-400 font-mono font-black">
                          +R$ {cartCalculations.netProfit.toFixed(2)} ({cartCalculations.marginPct.toFixed(0)}% margem)
                        </strong>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-amber-400 block">
                        TOTAL A PAGAR AO COLABORADOR:
                      </span>
                      <strong className="text-2xl sm:text-3xl font-mono font-black text-amber-400">
                        R$ {cartCalculations.totalBuyCost.toFixed(2)}
                      </strong>
                    </div>
                  </div>

                  {/* BOTÕES DE AÇÃO: FINALIZAR PAGAMENTO OU WHATSAPP */}
                  <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleClearCart}
                        className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-bold rounded-xl border border-white/10"
                      >
                        Limpar Carrinho
                      </button>
                      <button
                        type="button"
                        onClick={handleShareWhatsAppReceipt}
                        className="px-3.5 py-2 bg-slate-900 hover:bg-emerald-950 text-emerald-400 text-xs font-bold rounded-xl border border-emerald-500/30 flex items-center gap-1.5"
                        title="Enviar comprovante pelo WhatsApp"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Comprovante WhatsApp</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleFinalizePurchase}
                      className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-95 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-xl shadow-emerald-500/25"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Pagar ao Colaborador & Salvar no Estoque</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA 2: GERENCIADOR DO CATÁLOGO DE CÓDIGOS DE BARRAS */}
      {activeSubView === "catalogo" && (
        <div className="bg-slate-900 border border-white/10 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider block">
                Cadastro de Garrafas & Códigos EAN
              </span>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2 mt-0.5">
                <Tag className="w-5 h-5 text-amber-400" />
                Catálogo de Garrafas para Leitor de Código de Barras
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Aqui você pode cadastrar o código de barras da Cachaça 51 ou qualquer nova garrafa que receber no ferro velho!
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setEditingItem({
                    id: "",
                    name: "",
                    barcode: "",
                    category: "longneck",
                    volumeMl: 330,
                    unitWeightKg: 0.185,
                    buyPricePerUnit: 0.02,
                    returnableSellPrice: 0,
                    emoji: "🍾",
                    quickPresets: [3, 6, 10, 20, 25]
                  })
                }
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>+ Cadastrar Nova Garrafa</span>
              </button>

              <button
                type="button"
                onClick={handleResetCatalog}
                className="px-3 py-2 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white font-bold text-xs uppercase rounded-xl border border-white/10"
                title="Restaurar catálogo padrão"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* LISTA DE GARRAFAS CADASTRADAS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {catalog.map((item) => (
              <div
                key={item.id}
                className="bg-slate-950 p-4 rounded-2xl border border-white/10 space-y-3 text-left relative"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-2xl p-1 bg-slate-900 rounded-xl border border-white/5">
                      {item.emoji}
                    </span>
                    <div className="min-w-0">
                      <strong className="text-xs sm:text-sm font-black text-white block truncate">
                        {item.name}
                      </strong>
                      <span className="text-[10px] text-amber-400 font-mono font-bold block mt-0.5">
                        {item.barcode ? `🏷️ Cód: ${item.barcode}` : "⚠️ Sem código cadastrado"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditingItem(item)}
                      className="text-slate-400 hover:text-amber-400 p-1.5 transition-all"
                      title="Editar garrafa e código de barras"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    {catalog.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteCatalogBottle(item.id, item.name)}
                        className="text-slate-600 hover:text-rose-400 p-1.5 transition-all"
                        title="Excluir do catálogo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5 text-[11px] text-slate-300">
                  <div>
                    <span className="text-[9px] uppercase text-slate-500 block">Peso Vazia:</span>
                    <strong className="text-white font-mono font-bold">
                      {(item.unitWeightKg * 1000).toFixed(0)}g
                    </strong>
                  </div>

                  <div>
                    <span className="text-[9px] uppercase text-slate-500 block">Paga ao Catador:</span>
                    <strong className="text-amber-400 font-mono font-bold">
                      R$ {item.buyPricePerUnit.toFixed(3)}
                    </strong>
                  </div>

                  <div>
                    <span className="text-[9px] uppercase text-slate-500 block">Volume:</span>
                    <strong className="text-slate-300 font-mono">
                      {item.volumeMl}ml
                    </strong>
                  </div>
                </div>

                {/* Se não tiver código de barras (Ex: Cachaça 51), dá o atalho rápido */}
                {!item.barcode && (
                  <div className="pt-2 border-t border-white/5">
                    <button
                      type="button"
                      onClick={() => setEditingItem(item)}
                      className="w-full py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Barcode className="w-3.5 h-3.5" />
                      <span>Cadastrar Código de Barras Desta Garrafa</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
