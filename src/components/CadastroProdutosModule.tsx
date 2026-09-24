import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  PackagePlus,
  Plus,
  Search,
  Trash2,
  Edit3,
  Barcode,
  Coins,
  TrendingUp,
  Box,
  AlertCircle,
  CheckCircle2,
  Calendar,
  X,
  Layers,
  HelpCircle,
  Tag,
  Info,
  ChevronDown,
  RefreshCw,
  Sparkles,
  DollarSign,
  Camera
} from "lucide-react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

export interface CustomProduct {
  id: string;
  name: string;
  price: number;
  niche: string;
  category?: string;
  barcode?: string;
  size?: string;
  color?: string;
  additionalBarcodes?: string[];
  validity?: string;
  imageUrl?: string;
  isService?: boolean;
  brand?: string;
}

interface CadastroProdutosModuleProps {
  customProducts: CustomProduct[];
  productStockData: Record<string, { costPrice?: number; stockQty: number; minStockAlert?: number; salesCount?: number }>;
  onSaveCatalog: (
    nextProds: CustomProduct[],
    nextStock: Record<string, any>
  ) => void;
  selectedNiche: string;
  customNiches: { id: string; name: string; label: string }[];
  formatCurrency: (value: number) => string;
  showNotification: (message: string, type: "success" | "error" | "info" | "warning") => void;
}

const DEFAULT_EMOJIS = [
  "🛍️", "🏷️", "📦", "🍔", "🍕", "🥤", "☕", "🍺", "🍦", "🍎",
  "💅", "✂️", "💄", "🧴", "🧼", "👕", "👗", "👟", "🧢", "🕶️",
  "🔧", "🔨", "🚗", "🚲", "📱", "💻", "📚", "🎨", "🎸", "🔋",
  "🧹", "🪵", "🧱", "🥩", "🍞", "🥚", "💊", "🧸", "🎟️", "💎"
];

const PREDEFINED_CATEGORIES_BY_NICHE: Record<string, string[]> = {
  salao_beleza: ["Serviços de Cabelo", "Manicure & Unhas", "Maquiagem", "Tratamentos", "Produtos de Venda"],
  barbearia: ["Corte & Barba", "Combo e Pacotes", "Cervejas & Bebidas", "Pomadas & Ceras", "Tratamentos"],
  manicure: ["Alongamento", "Manicure Simples", "Pedicure", "Esmaltes", "Acessórios"],
  mercadinho: ["Alimentos", "Bebidas", "Limpeza", "Higiene Pessoal", "Frios & Laticínios", "Padaria"],
  sushi: ["Entradas", "Temakis", "Combinados", "Bebidas", "Sobremesas"],
  lojas: ["Vestuário", "Calçados", "Acessórios", "Moda Íntima", "Infantil"],
  bar: ["Cervejas", "Destilados", "Porções", "Refrigerantes & Águas", "Cigarros"],
  serralheiro: ["Portões", "Grades", "Estruturas", "Ferragens", "Reparos / Mão de Obra"],
  estofador: ["Reforma Sofá", "Poltronas", "Almofadas", "Tecidos", "Higienização"],
  marceneiro: ["Armários", "Mesas & Cadeiras", "Puxadores & Ferragens", "Sob Medida", "Mão de Obra"],
  doces: ["Bolos Inteiros", "Docinhos", "Tortas", "Sobremesas", "Bebidas"],
  salgados: ["Salgados Fritos", "Salgados Assados", "Mini Salgados", "Bebidas", "Congelados"],
  pensao: ["Marmita P", "Marmita M", "Marmita G", "Bebidas", "Adicionais"],
  restaurante: ["Pratos Executivos", "Bebidas", "Porções", "Sobremesas", "Entradas"],
  padaria: ["Pães", "Salgados", "Doces & Bolos", "Laticínios", "Bebidas", "Mercearia"],
  academia: ["Mensalidades", "Diárias", "Suplementos", "Acessórios Fitness", "Bebidas energéticas"],
  lava_jato: ["Lavagem Simples", "Lavagem Completa", "Higienização", "Polimento", "Acessórios"],
  auto_pecas: ["Motor", "Suspensão", "Elétrica", "Óleos & Lubrificantes", "Acessórios"],
  mecanico: ["Mão de Obra", "Peças Reposição", "Revisão Geral", "Suspensão", "Freios"],
  acougue: ["Bovinos", "Suínos", "Aves", "Embutidos", "Carvão & Acessórios"],
  sacolao: ["Frutas Frescas", "Legumes & Raízes", "Verduras & Folhagens", "Temperos & Ervas", "Ovos & Granja", "Bebidas & Polpas", "Outros"],
  loja_racao: ["Rações a Granel (kg)", "Rações Pacote Fechado", "Petiscos & Sachês", "Medicamentos & Higiene", "Acessórios & Coleiras"],
  aviario: ["Rações para Aves & Postura", "Grãos & Sementes a Granel", "Gaiolas & Bebedouros", "Medicamentos & Vitaminas", "Rações Cães & Gatos"],
  comercio_geral: ["Produtos Gerais", "Serviços", "Outros"]
};

export function CadastroProdutosModule({
  customProducts,
  productStockData,
  onSaveCatalog,
  selectedNiche,
  customNiches,
  formatCurrency,
  showNotification
}: CadastroProdutosModuleProps) {
  // Navigation tabs within Cadastro
  const [activeTab, setActiveTab] = useState<"lista" | "novo" | "categorias">("lista");

  // Custom categories list state
  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    const local = localStorage.getItem(`pdv_custom_categories_${selectedNiche}`);
    if (local) {
      try {
        return JSON.parse(local);
      } catch (e) {
        // ignore
      }
    }
    return PREDEFINED_CATEGORIES_BY_NICHE[selectedNiche] || PREDEFINED_CATEGORIES_BY_NICHE["comercio_geral"];
  });

  // Save custom categories to local storage
  useEffect(() => {
    localStorage.setItem(`pdv_custom_categories_${selectedNiche}`, JSON.stringify(customCategories));
  }, [customCategories, selectedNiche]);

  // Category management states
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [editingCategoryName, setEditingCategoryName] = useState<string | null>(null);
  const [editingCategoryNewVal, setEditingCategoryNewVal] = useState("");

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newCategoryInput.trim();
    if (!cleanName) {
      showNotification("Por favor, digite o nome da categoria!", "error");
      return;
    }
    if (customCategories.some(cat => cat.toLowerCase() === cleanName.toLowerCase())) {
      showNotification("Essa categoria já existe!", "warning");
      return;
    }

    setCustomCategories([...customCategories, cleanName]);
    setNewCategoryInput("");
    showNotification(`Categoria "${cleanName}" adicionada com sucesso! 🏷️`, "success");
  };

  const handleStartEditCategory = (cat: string) => {
    setEditingCategoryName(cat);
    setEditingCategoryNewVal(cat);
  };

  const handleSaveCategoryEdit = (oldName: string) => {
    const cleanNewName = editingCategoryNewVal.trim();
    if (!cleanNewName) {
      showNotification("O nome da categoria não pode ser vazio!", "error");
      return;
    }
    if (cleanNewName.toLowerCase() === oldName.toLowerCase()) {
      setEditingCategoryName(null);
      return;
    }
    if (customCategories.some(cat => cat.toLowerCase() === cleanNewName.toLowerCase() && cat !== oldName)) {
      showNotification("Já existe uma categoria com esse nome!", "error");
      return;
    }

    // 1. Update custom categories list
    const updatedCategories = customCategories.map(cat => cat === oldName ? cleanNewName : cat);
    setCustomCategories(updatedCategories);

    // 2. Update products belonging to this category
    const updatedProds = customProducts.map(p => {
      if (p.category === oldName) {
        return { ...p, category: cleanNewName };
      }
      return p;
    });

    onSaveCatalog(updatedProds, productStockData);
    setEditingCategoryName(null);
    showNotification(`Categoria "${oldName}" renomeada para "${cleanNewName}" e atualizada em todos os itens vinculados! 🏷️`, "success");
  };

  const handleDeleteCategory = (catToDelete: string) => {
    const count = customProducts.filter(p => p.category === catToDelete).length;
    const confirmMsg = count > 0 
      ? `A categoria "${catToDelete}" possui ${count} produtos cadastrados. Eles serão movidos para "Outros". Tem certeza que deseja excluir?`
      : `Deseja realmente excluir a categoria "${catToDelete}"?`;

    if (!window.confirm(confirmMsg)) {
      return;
    }

    // 1. Update custom categories list
    const updatedCategories = customCategories.filter(cat => cat !== catToDelete);
    setCustomCategories(updatedCategories);

    // 2. Set products under this category to "Outros"
    const updatedProds = customProducts.map(p => {
      if (p.category === catToDelete) {
        return { ...p, category: "Outros" };
      }
      return p;
    });

    onSaveCatalog(updatedProds, productStockData);
    showNotification(`Categoria "${catToDelete}" excluída. ${count} itens movidos para "Outros". 🏷️`, "info");
  };

  // Form States
  const [isService, setIsService] = useState<boolean>(false);
  const [prodName, setProdName] = useState("");
  const [prodCategory, setProdCategory] = useState("");
  const [prodBarcode, setProdBarcode] = useState("");
  const [prodPrice, setProdPrice] = useState("");
  const [prodCostPrice, setProdCostPrice] = useState("");
  const [prodInitialStock, setProdInitialStock] = useState("");
  const [prodMinStock, setProdMinStock] = useState("");
  const [prodSize, setProdSize] = useState("");
  const [prodColor, setProdColor] = useState("");
  const [prodBrand, setProdBrand] = useState("");
  const [prodValidity, setProdValidity] = useState("");
  const [prodImageUrl, setProdImageUrl] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState("🛍️");
  
  // Search & Filters for List Tab
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "product" | "service">("all");
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "out">("all");

  // Edit States
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  // Barcode scanner states for product registration
  const [showScanner, setShowScanner] = useState(false);
  const [scannerDevices, setScannerDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedScannerDeviceId, setSelectedScannerDeviceId] = useState<string>("");
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);

  // Initialize and list cameras for barcode scanner
  useEffect(() => {
    if (showScanner) {
      Html5Qrcode.getCameras()
        .then(devices => {
          setScannerDevices(devices);
          if (devices.length > 0) {
            // Find back camera if possible, otherwise first device
            const backCam = devices.find(device => 
              device.label.toLowerCase().includes("back") || 
              device.label.toLowerCase().includes("traseira") || 
              device.label.toLowerCase().includes("environment")
            );
            setSelectedScannerDeviceId(backCam ? backCam.id : devices[0].id);
          }
        })
        .catch(err => {
          console.error("Erro ao listar câmeras:", err);
          showNotification("Não foi possível acessar a câmera do dispositivo.", "error");
          setShowScanner(false);
        });
    } else {
      // Stop and clean up any existing scanner instance when showScanner is false
      if (html5QrcodeRef.current) {
        try {
          if (html5QrcodeRef.current.isScanning) {
            html5QrcodeRef.current.stop().then(() => {
              html5QrcodeRef.current = null;
            }).catch(e => {
              console.error("Erro ao parar scanner:", e);
              html5QrcodeRef.current = null;
            });
          } else {
            html5QrcodeRef.current = null;
          }
        } catch (e) {
          html5QrcodeRef.current = null;
        }
      }
    }

    return () => {
      if (html5QrcodeRef.current) {
        try {
          if (html5QrcodeRef.current.isScanning) {
            html5QrcodeRef.current.stop().catch(console.error);
          }
        } catch (e) {
          // ignore
        }
      }
    };
  }, [showScanner]);

  // Handle active scanner instance start
  useEffect(() => {
    if (showScanner && selectedScannerDeviceId) {
      // Small timeout to ensure element with ID exists in DOM
      const timer = setTimeout(() => {
        const viewportElement = document.getElementById("reg-barcode-scanner-viewport");
        if (!viewportElement) return;

        try {
          const scanner = new Html5Qrcode("reg-barcode-scanner-viewport", {
            formatsToSupport: [
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.UPC_E,
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.CODE_39,
              Html5QrcodeSupportedFormats.CODE_93,
              Html5QrcodeSupportedFormats.ITF,
              Html5QrcodeSupportedFormats.CODABAR,
              Html5QrcodeSupportedFormats.QR_CODE
            ],
            verbose: false
          });
          html5QrcodeRef.current = scanner;

          scanner.start(
            selectedScannerDeviceId,
            {
              fps: 15,
              qrbox: (width, height) => {
                const size = Math.min(width, height) * 0.7;
                return { width: size, height: size * 0.5 }; // wide box for barcode
              },
              aspectRatio: 1.0
            },
            (decodedText) => {
              // On Success
              setProdBarcode(decodedText);
              showNotification(`Código escaneado: ${decodedText} 🏷️`, "success");
              setShowScanner(false); // will trigger cleanup
            },
            (errorMessage) => {
              // verbose log ignored
            }
          ).catch(err => {
            console.error("Erro ao iniciar câmera html5Qrcode:", err);
            showNotification("Falha ao iniciar transmissão da câmera.", "error");
            setShowScanner(false);
          });
        } catch (e) {
          console.error("Exceção ao criar scanner:", e);
        }
      }, 150);

      return () => clearTimeout(timer);
    }
  }, [showScanner, selectedScannerDeviceId]);

  // Categories suggestions for the selected niche (including custom ones)
  const suggestedCategories = useMemo(() => {
    return customCategories;
  }, [customCategories]);

  // Set default category when loading suggested list
  React.useEffect(() => {
    if (suggestedCategories && suggestedCategories.length > 0 && !prodCategory) {
      setProdCategory(suggestedCategories[0]);
    }
  }, [suggestedCategories]);

  // Parse Portuguese format input numbers
  const parsePortugueseNumber = (valStr: string): number => {
    let clean = valStr.trim();
    if (clean.includes(".") && clean.includes(",")) {
      clean = clean.replace(/\./g, "").replace(",", ".");
    } else if (clean.includes(",")) {
      clean = clean.replace(",", ".");
    }
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Helper: Profit Margin and Markup Calculations
  const pricingCalculations = useMemo(() => {
    const sale = parsePortugueseNumber(prodPrice);
    const cost = parsePortugueseNumber(prodCostPrice);
    
    if (sale <= 0) return { profit: 0, margin: 0, markup: 0, health: "invalid" as const };
    
    const profit = sale - cost;
    const margin = (profit / sale) * 100;
    const markup = cost > 0 ? (profit / cost) * 100 : 100;
    
    let health: "low" | "good" | "excellent" | "warning" = "good";
    if (margin < 15) {
      health = "warning";
    } else if (margin >= 15 && margin < 35) {
      health = "low";
    } else if (margin >= 35 && margin < 60) {
      health = "good";
    } else {
      health = "excellent";
    }

    return { profit, margin, markup, health };
  }, [prodPrice, prodCostPrice]);

  // Pricing Advisor Message based on current Niche and calculations
  const pricingAdvisor = useMemo(() => {
    const { margin, health } = pricingCalculations;
    if (margin === 0 && parsePortugueseNumber(prodPrice) === 0) {
      return {
        badge: "Aguardando Valores",
        color: "bg-slate-800 text-slate-400 border-slate-700",
        message: "Digite o preço de custo e de venda para receber conselhos inteligentes de precificação."
      };
    }

    const isBeauty = ["salao_beleza", "barbearia", "manicure"].includes(selectedNiche);
    const isFood = ["sushi", "doces", "salgados", "pensao", "restaurante", "padaria"].includes(selectedNiche);
    
    if (isService) {
      if (margin >= 70) {
        return {
          badge: "Margem Fantástica 💎",
          color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
          message: "Excelente precificação! Serviços costumam carregar baixíssimo custo de matéria-prima direta, garantindo ótima rentabilidade."
        };
      } else {
        return {
          badge: "Margem Melhorável ⚠️",
          color: "bg-amber-500/10 text-amber-400 border-amber-500/30",
          message: "Considere elevar um pouco o valor do serviço ou otimizar seu tempo. O ideal para serviços é manter margens acima de 65%."
        };
      }
    }

    if (health === "warning") {
      return {
        badge: "Alerta Vermelho: Prejuízo ou Margem Extrema 🚨",
        color: "bg-red-500/10 text-red-400 border-red-500/30",
        message: "Cuidado! Sua margem está abaixo de 15%. Você corre risco de pagar para trabalhar após custos invisíveis (taxas de cartão, frete, luz)."
      };
    } else if (health === "low") {
      return {
        badge: "Margem Apertada ⚠️",
        color: "bg-amber-500/10 text-amber-400 border-amber-500/30",
        message: `Sua margem (${margin.toFixed(0)}%) está um pouco abaixo da média para o nicho de ${selectedNiche.replace("_", " ")}. Tente negociar com fornecedores.`
      };
    } else if (health === "good") {
      return {
        badge: "Preço Saudável e Justo! ✅",
        color: "bg-blue-500/10 text-blue-400 border-blue-500/30",
        message: `Parabéns! Sua margem está na faixa ideal (${margin.toFixed(0)}%) para comércio varejista, protegendo seu lucro e mantendo você competitivo.`
      };
    } else {
      return {
        badge: "Excelente Lucratividade 🚀",
        color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
        message: `Excelente margem de ${margin.toFixed(0)}%! Muito acima do padrão mínimo do mercado. Ideal para reinvestir no crescimento do seu negócio.`
      };
    }
  }, [pricingCalculations, selectedNiche, isService, prodPrice]);

  // Generate random unique barcode
  const handleGenerateBarcode = () => {
    const randomCode = "789" + Math.floor(1000000000 + Math.random() * 9000000000).toString();
    setProdBarcode(randomCode);
    showNotification("Código de barras EAN gerado com sucesso! 🏷️", "success");
  };

  // Submit Product/Service registration
  const handleRegisterProduct = (e: React.FormEvent) => {
    e.preventDefault();

    if (!prodName.trim()) {
      showNotification("Por favor, digite o nome do produto ou serviço!", "error");
      return;
    }

    const priceParsed = parsePortugueseNumber(prodPrice);
    if (priceParsed < 0) {
      showNotification("O preço de venda não pode ser negativo!", "error");
      return;
    }

    const costParsed = prodCostPrice ? parsePortugueseNumber(prodCostPrice) : 0;
    const stockParsed = isService ? 999999 : (prodInitialStock ? parseInt(prodInitialStock, 10) : 0);
    const minParsed = prodMinStock ? parseInt(prodMinStock, 10) : undefined;

    // Create the product
    const newProdId = editingProductId || "cp_" + Date.now() + "_" + Math.floor(Math.random() * 100);
    
    const newProd: CustomProduct = {
      id: newProdId,
      name: prodName.trim(),
      price: priceParsed,
      niche: selectedNiche,
      category: prodCategory || "Outros",
      barcode: prodBarcode.trim() || undefined,
      size: prodSize.trim() || undefined,
      color: prodColor.trim() || undefined,
      validity: prodValidity.trim() || undefined,
      imageUrl: prodImageUrl.trim() || selectedEmoji,
      isService: isService,
      brand: prodBrand.trim() || undefined
    };

    let nextProds: CustomProduct[];
    if (editingProductId) {
      nextProds = customProducts.map(p => p.id === editingProductId ? newProd : p);
    } else {
      nextProds = [...customProducts, newProd];
    }

    const nextStock = {
      ...productStockData,
      [newProdId]: {
        costPrice: costParsed,
        stockQty: isNaN(stockParsed) ? 0 : stockParsed,
        minStockAlert: minParsed,
        salesCount: productStockData[newProdId]?.salesCount || 0
      }
    };

    onSaveCatalog(nextProds, nextStock);
    
    showNotification(
      `"${newProd.name.toUpperCase()}" ${editingProductId ? "atualizado" : "cadastrado"} com sucesso! 🛍️`,
      "success"
    );

    // Reset Form
    handleResetForm();
    setActiveTab("lista");
  };

  const handleResetForm = () => {
    setProdName("");
    setProdPrice("");
    setProdCostPrice("");
    setProdInitialStock("");
    setProdMinStock("");
    setProdBarcode("");
    setProdSize("");
    setProdColor("");
    setProdBrand("");
    setProdValidity("");
    setProdImageUrl("");
    setSelectedEmoji("🛍️");
    setIsService(false);
    setEditingProductId(null);
    if (suggestedCategories.length > 0) {
      setProdCategory(suggestedCategories[0]);
    }
  };

  // Delete product
  const handleDelete = (id: string, name: string) => {
    if (confirm(`Tem certeza que deseja excluir o item "${name}" do catálogo do PDV?`)) {
      const nextProds = customProducts.filter(p => p.id !== id);
      const nextStock = { ...productStockData };
      delete nextStock[id];

      onSaveCatalog(nextProds, nextStock);
      showNotification(`"${name}" foi removido do catálogo.`, "info");
    }
  };

  // Click on Edit item
  const handleStartEdit = (product: CustomProduct) => {
    setEditingProductId(product.id);
    setProdName(product.name);
    setProdCategory(product.category || "");
    setProdPrice(product.price.toString().replace(".", ","));
    setProdBarcode(product.barcode || "");
    setProdSize(product.size || "");
    setProdColor(product.color || "");
    setProdBrand(product.brand || "");
    setProdValidity(product.validity || "");
    setProdImageUrl(product.imageUrl || "");
    setIsService(!!product.isService);
    
    if (DEFAULT_EMOJIS.includes(product.imageUrl || "")) {
      setSelectedEmoji(product.imageUrl || "🛍️");
    }

    const stock = productStockData[product.id];
    if (stock) {
      setProdCostPrice(stock.costPrice !== undefined ? stock.costPrice.toString().replace(".", ",") : "");
      setProdInitialStock(stock.stockQty.toString());
      setProdMinStock(stock.minStockAlert !== undefined ? stock.minStockAlert.toString() : "");
    } else {
      setProdCostPrice("");
      setProdInitialStock("");
      setProdMinStock("");
    }

    setActiveTab("novo");
  };

  // Quick Stock adjustments
  const handleQuickStockAdjustment = (productId: string, amount: number) => {
    const currentStock = productStockData[productId]?.stockQty || 0;
    const nextQty = Math.max(0, currentStock + amount);
    
    const nextStock = {
      ...productStockData,
      [productId]: {
        ...productStockData[productId],
        stockQty: nextQty
      }
    };
    
    onSaveCatalog(customProducts, nextStock);
    showNotification("Estoque atualizado com sucesso! 📦", "success");
  };

  // Distinct categories from existing customProducts
  const existingCategories = useMemo(() => {
    const cats = new Set<string>();
    customProducts.forEach(p => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats);
  }, [customProducts]);

  // Filtered list of products
  const filteredProducts = useMemo(() => {
    return customProducts.filter(product => {
      // 1. Search term match
      const query = searchTerm.toLowerCase().trim();
      const nameMatch = product.name.toLowerCase().includes(query);
      const barcodeMatch = product.barcode?.toLowerCase().includes(query);
      const categoryMatch = product.category?.toLowerCase().includes(query);
      const searchOk = !query || nameMatch || barcodeMatch || categoryMatch;

      // 2. Niche match
      const nicheOk = product.niche === selectedNiche;

      // 3. Category Filter
      const categoryOk = categoryFilter === "all" || product.category === categoryFilter;

      // 4. Product / Service Filter
      const typeOk =
        typeFilter === "all" ||
        (typeFilter === "service" && product.isService) ||
        (typeFilter === "product" && !product.isService);

      // 5. Stock warning filter
      const stockInfo = productStockData[product.id];
      let stockOk = true;
      if (stockFilter === "low") {
        stockOk = !product.isService && stockInfo && stockInfo.minStockAlert !== undefined && stockInfo.stockQty <= stockInfo.minStockAlert && stockInfo.stockQty > 0;
      } else if (stockFilter === "out") {
        stockOk = !product.isService && stockInfo && stockInfo.stockQty <= 0;
      }

      return searchOk && nicheOk && categoryOk && typeOk && stockOk;
    });
  }, [customProducts, searchTerm, selectedNiche, categoryFilter, typeFilter, stockFilter, productStockData]);

  // Dynamic statistics
  const stats = useMemo(() => {
    const nicheProds = customProducts.filter(p => p.niche === selectedNiche);
    const totalItems = nicheProds.length;
    const productsCount = nicheProds.filter(p => !p.isService).length;
    const servicesCount = nicheProds.filter(p => p.isService).length;
    
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let totalStockValue = 0;

    nicheProds.forEach(p => {
      const stock = productStockData[p.id];
      if (stock && !p.isService) {
        if (stock.stockQty <= 0) {
          outOfStockCount++;
        } else if (stock.minStockAlert !== undefined && stock.stockQty <= stock.minStockAlert) {
          lowStockCount++;
        }
        totalStockValue += (stock.stockQty * p.price);
      }
    });

    return { totalItems, productsCount, servicesCount, lowStockCount, outOfStockCount, totalStockValue };
  }, [customProducts, selectedNiche, productStockData]);

  return (
    <div className="bg-slate-900 border border-white/5 rounded-3xl p-5 sm:p-6 space-y-6">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <span className="text-[10px] font-black text-sky-400 uppercase tracking-widest flex items-center gap-1.5">
            <PackagePlus className="w-4 h-4 text-sky-400 animate-pulse" />
            Catálogo Comercial do Estabelecimento
          </span>
          <h3 className="text-lg font-black text-white uppercase mt-1 tracking-tight">
            Cadastro de Produtos e Serviços 🛍️
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Gerencie o cardápio, produtos físicos ou serviços oferecidos na sua Frente de Caixa (PDV). Defina preços de custo, de venda e controle de estoque inteligente.
          </p>
        </div>

        {/* TAB CONTROLLERS */}
        <div className="flex gap-1.5 bg-slate-950 p-1 rounded-xl border border-white/5 shrink-0 self-start">
          <button
            onClick={() => {
              setActiveTab("lista");
              handleResetForm();
            }}
            className={`px-4 py-2 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "lista"
                ? "bg-sky-600 text-white shadow-lg shadow-sky-500/15"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            📋 Todos os Cadastros ({stats.totalItems})
          </button>
          <button
            onClick={() => setActiveTab("novo")}
            className={`px-4 py-2 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "novo"
                ? "bg-sky-600 text-white shadow-lg shadow-sky-500/15"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            ➕ {editingProductId ? "📝 Editar Item" : "✨ Novo Cadastro"}
          </button>
          <button
            onClick={() => {
              setActiveTab("categorias");
              setEditingCategoryName(null);
            }}
            className={`px-4 py-2 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "categorias"
                ? "bg-sky-600 text-white shadow-lg shadow-sky-500/15"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            🏷️ Categorias ({customCategories.length})
          </button>
        </div>
      </div>

      {/* QUICK BENTO STATS */}
      {activeTab === "lista" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-slate-950 border border-white/5 p-4 rounded-2xl flex flex-col justify-between">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Total Cadastrados</span>
            <p className="text-2xl font-black text-white mt-1.5">{stats.totalItems}</p>
            <span className="text-[9px] text-slate-400 mt-1">📦 {stats.productsCount} Produtos | ⚡ {stats.servicesCount} Serviços</span>
          </div>

          <div className="bg-slate-950 border border-white/5 p-4 rounded-2xl flex flex-col justify-between">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Estoque Crítico / Baixo</span>
            <p className="text-2xl font-black text-amber-400 mt-1.5">{stats.lowStockCount}</p>
            <span className="text-[9px] text-amber-500/80 mt-1">⚠️ Abaixo do limite de segurança</span>
          </div>

          <div className="bg-slate-950 border border-white/5 p-4 rounded-2xl flex flex-col justify-between">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Estoque Esgotado</span>
            <p className="text-2xl font-black text-red-400 mt-1.5">{stats.outOfStockCount}</p>
            <span className="text-[9px] text-red-500/80 mt-1">🚨 Necessita reposição imediata</span>
          </div>

          <div className="bg-slate-950 border border-white/5 p-4 rounded-2xl flex flex-col justify-between">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Valor Total Estocado</span>
            <p className="text-2xl font-black text-emerald-400 mt-1.5">{formatCurrency(stats.totalStockValue)}</p>
            <span className="text-[9px] text-emerald-500/80 mt-1">💰 Preço de venda acumulado</span>
          </div>
        </div>
      )}

      {/* VIEW A: LIST & FILTER TAB */}
      {activeTab === "lista" && (
        <div className="space-y-4">
          
          {/* SEARCH & FILTERS CONTROLLERS BAR */}
          <div className="bg-slate-950 border border-white/5 p-4 rounded-2xl flex flex-col lg:flex-row gap-3.5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar por nome do item, código de barras ou categoria..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 hover:border-white/20 focus:border-sky-500/50 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 transition-all outline-none"
              />
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              {/* Type selector */}
              <div className="flex bg-slate-900 border border-white/10 rounded-xl p-0.5">
                <button
                  type="button"
                  onClick={() => setTypeFilter("all")}
                  className={`px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase transition-all cursor-pointer ${
                    typeFilter === "all" ? "bg-sky-600 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter("product")}
                  className={`px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase transition-all cursor-pointer ${
                    typeFilter === "product" ? "bg-sky-600 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Produtos
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter("service")}
                  className={`px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase transition-all cursor-pointer ${
                    typeFilter === "service" ? "bg-sky-600 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Serviços
                </button>
              </div>

              {/* Category Dropdown Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-slate-900 border border-white/10 hover:border-white/20 text-xs text-white rounded-xl px-3 py-2 cursor-pointer outline-none focus:border-sky-500/50"
              >
                <option value="all">📁 Todas Categorias</option>
                {suggestedCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
                {existingCategories.filter(cat => !suggestedCategories.includes(cat)).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              {/* Stock dropdown warning selector */}
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
                className="bg-slate-900 border border-white/10 hover:border-white/20 text-xs text-white rounded-xl px-3 py-2 cursor-pointer outline-none focus:border-sky-500/50"
              >
                <option value="all">📦 Todos os Estoques</option>
                <option value="low">⚠️ Estoque Baixo / Crítico</option>
                <option value="out">🚨 Esgotado / Sem Estoque</option>
              </select>
            </div>
          </div>

          {/* DATATABLE OF CADASTROS */}
          <div className="bg-slate-950 border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
            {filteredProducts.length === 0 ? (
              <div className="p-12 text-center space-y-4">
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">
                  Nenhum produto ou serviço localizado com os filtros selecionados.
                </p>
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setCategoryFilter("all");
                    setTypeFilter("all");
                    setStockFilter("all");
                  }}
                  className="px-4 py-2 bg-slate-900 border border-white/10 hover:border-white/20 text-sky-400 hover:text-sky-300 font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  Zerar Filtros e Mostrar Tudo
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-slate-900/60 text-[9.5px] font-black uppercase text-slate-400 tracking-wider">
                      <th className="py-3.5 px-4 w-12">Ícone</th>
                      <th className="py-3.5 px-4">Nome do Cadastro</th>
                      <th className="py-3.5 px-4">Categoria / Tipo</th>
                      <th className="py-3.5 px-4 text-right">Preço de Custo</th>
                      <th className="py-3.5 px-4 text-right">Preço de Venda</th>
                      <th className="py-3.5 px-4 text-right">Margem %</th>
                      <th className="py-3.5 px-4 text-center">Controle de Estoque</th>
                      <th className="py-3.5 px-4 text-right w-24">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs">
                    {filteredProducts.map((product) => {
                      const stockInfo = productStockData[product.id];
                      const cost = stockInfo?.costPrice || 0;
                      const sale = product.price;
                      const profit = sale - cost;
                      const margin = sale > 0 ? (profit / sale) * 100 : 0;
                      
                      // Stock alert state
                      const isLowStock = !product.isService && stockInfo && stockInfo.minStockAlert !== undefined && stockInfo.stockQty <= stockInfo.minStockAlert && stockInfo.stockQty > 0;
                      const isOutOfStock = !product.isService && stockInfo && stockInfo.stockQty <= 0;

                      return (
                        <tr key={product.id} className="hover:bg-white/[0.02] transition-colors group">
                          <td className="py-3 px-4 text-center text-lg">
                            {DEFAULT_EMOJIS.includes(product.imageUrl || "") ? (
                              <span>{product.imageUrl}</span>
                            ) : (
                              <span>🛍️</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-extrabold text-white group-hover:text-sky-400 transition-colors uppercase">
                              {product.name}
                            </p>
                            {product.barcode && (
                              <p className="text-[10px] font-mono text-slate-500 mt-0.5 flex items-center gap-1">
                                <Barcode className="w-3 h-3" />
                                {product.barcode}
                              </p>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2.5 py-1 bg-slate-900 border border-white/5 rounded-lg text-[9.5px] font-bold text-slate-300 uppercase">
                              {product.category || "Outros"}
                            </span>
                            <span className={`ml-1.5 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                              product.isService 
                                ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" 
                                : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                            }`}>
                              {product.isService ? "Serviço" : "Produto"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-400">
                            {cost > 0 ? formatCurrency(cost) : "-"}
                          </td>
                          <td className="py-3 px-4 text-right font-black font-mono text-white text-sm">
                            {formatCurrency(sale)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className={`font-mono font-bold text-xs ${
                              margin < 15 ? "text-red-400" : margin >= 50 ? "text-emerald-400" : "text-blue-400"
                            }`}>
                              {margin > 0 ? `${margin.toFixed(0)}%` : "0%"}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {product.isService ? (
                              <div className="text-center">
                                <span className="px-2.5 py-1 bg-purple-500/10 text-purple-400 rounded-lg text-[10px] font-bold uppercase">
                                  ⚡ Execuções Ilimitadas
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleQuickStockAdjustment(product.id, -1)}
                                  className="w-6 h-6 bg-slate-900 hover:bg-slate-800 text-white rounded flex items-center justify-center font-black cursor-pointer transition-all active:scale-90"
                                >
                                  -
                                </button>
                                
                                <span className={`font-mono font-extrabold px-3 py-1 rounded-lg text-xs min-w-[3rem] text-center ${
                                  isOutOfStock 
                                    ? "bg-red-500/20 text-red-400 border border-red-500/30" 
                                    : isLowStock 
                                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse" 
                                      : "bg-slate-900 text-slate-200"
                                }`}>
                                  {stockInfo?.stockQty ?? 0} un
                                </span>

                                <button
                                  type="button"
                                  onClick={() => handleQuickStockAdjustment(product.id, 1)}
                                  className="w-6 h-6 bg-slate-900 hover:bg-slate-800 text-white rounded flex items-center justify-center font-black cursor-pointer transition-all active:scale-90"
                                >
                                  +
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex gap-1.5 justify-end">
                              <button
                                type="button"
                                onClick={() => handleStartEdit(product)}
                                className="p-1.5 bg-slate-900 hover:bg-slate-800 text-sky-400 rounded-lg cursor-pointer transition-all"
                                title="Editar Cadastro"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(product.id, product.name)}
                                className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg cursor-pointer transition-all"
                                title="Remover Cadastro"
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

      {/* VIEW B: NEW / EDIT FORM TAB */}
      {activeTab === "novo" && (
        <form onSubmit={handleRegisterProduct} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* COLUMN LEFT: FORM INPUTS (8/12) */}
            <div className="lg:col-span-8 bg-slate-950 border border-white/5 rounded-2xl p-5 space-y-4">
              
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <h4 className="text-xs font-black uppercase text-white flex items-center gap-1.5">
                  <PackagePlus className="w-4 h-4 text-sky-400" />
                  {editingProductId ? "Editar Item Existente" : "Cadastrar Novo Item no PDV"}
                </h4>
                
                {/* Product / Service Switch */}
                <div className="flex bg-slate-900 border border-white/10 rounded-xl p-0.5">
                  <button
                    type="button"
                    onClick={() => setIsService(false)}
                    className={`px-4 py-1.5 rounded-lg font-bold text-[9.5px] uppercase tracking-wide transition-all cursor-pointer ${
                      !isService ? "bg-sky-600 text-white" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    📦 Produto Físico
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsService(true)}
                    className={`px-4 py-1.5 rounded-lg font-bold text-[9.5px] uppercase tracking-wide transition-all cursor-pointer ${
                      isService ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    ⚡ Serviço / Hora
                  </button>
                </div>
              </div>

              {/* Grid Fields */}
              <div className="grid grid-cols-12 gap-3 text-xs">
                {/* 1. Name */}
                <div className="col-span-12 md:col-span-8">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                    Nome do {isService ? "Serviço" : "Produto"} *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={isService ? "Ex: Corte de Cabelo Fade, Consultoria Financeira" : "Ex: Coca-cola Lata 350ml, Camiseta Slim G"}
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 focus:border-sky-500/50 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 transition-all outline-none"
                  />
                </div>

                {/* 2. Category selection */}
                <div className="col-span-12 md:col-span-4">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                    Categoria
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Ex: Bebidas, Serviços"
                      value={prodCategory}
                      onChange={(e) => setProdCategory(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 focus:border-sky-500/50 rounded-xl px-3.5 py-2.5 pr-8 text-xs text-white placeholder-slate-600 transition-all outline-none"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 group">
                      <ChevronDown className="w-4 h-4 text-slate-500 cursor-pointer" />
                      {/* Floating suggestions dropdown */}
                      <div className="hidden group-hover:block hover:block absolute right-0 top-4 bg-slate-900 border border-white/10 rounded-xl p-1.5 shadow-2xl z-50 min-w-[12rem] max-h-48 overflow-y-auto">
                        <p className="text-[8px] font-black uppercase text-slate-500 px-2 py-1 border-b border-white/5 mb-1">Sugestões do Nicho</p>
                        {suggestedCategories.map(cat => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setProdCategory(cat)}
                            className="w-full text-left px-2 py-1 rounded text-[10px] text-slate-300 hover:bg-sky-600 hover:text-white transition-colors"
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Preço de Custo */}
                <div className="col-span-6 md:col-span-4">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                    Preço de Custo (R$)
                    <Info className="w-3 h-3 text-slate-500" title="Quanto você pagou por esse item ao fornecedor, ou custo direto de execução" />
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 2,50"
                    value={prodCostPrice}
                    onChange={(e) => setProdCostPrice(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 focus:border-sky-500/50 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 transition-all outline-none font-mono"
                  />
                </div>

                {/* 4. Preço de Venda */}
                <div className="col-span-6 md:col-span-4">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 text-sky-400 flex items-center gap-1">
                    Preço de Venda (R$) *
                    <Info className="w-3 h-3 text-sky-500" title="Preço final cobrado do cliente no balcão de vendas" />
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 5,90"
                    value={prodPrice}
                    onChange={(e) => setProdPrice(e.target.value)}
                    className="w-full bg-slate-900 border border-sky-500/40 focus:border-sky-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 transition-all outline-none font-mono font-bold text-sky-350"
                  />
                </div>

                {/* 5. Barcode (Only for products) */}
                <div className="col-span-12 md:col-span-4 space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                    <span>Código de Barras / EAN</span>
                    {!isService && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setShowScanner(!showScanner)}
                          className={`text-[8.5px] font-black uppercase hover:underline cursor-pointer flex items-center gap-1 ${
                            showScanner ? "text-rose-400" : "text-sky-400"
                          }`}
                        >
                          <Camera className="w-3.5 h-3.5" />
                          {showScanner ? "Fechar Câmera" : "📷 Escanear"}
                        </button>
                        <button
                          type="button"
                          onClick={handleGenerateBarcode}
                          className="text-[8.5px] font-black uppercase text-sky-400 hover:underline cursor-pointer flex items-center gap-0.5"
                        >
                          ⚡ Gerar
                        </button>
                      </div>
                    )}
                  </label>
                  
                  {/* Camera view if active */}
                  {showScanner && !isService && (
                    <div className="bg-slate-900 border border-sky-500/30 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold text-sky-400 uppercase tracking-wider">Aponte para o código de barras</span>
                        <button
                          type="button"
                          onClick={() => setShowScanner(false)}
                          className="text-slate-400 hover:text-white"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      
                      {/* Active viewport */}
                      <div
                        id="reg-barcode-scanner-viewport"
                        className="w-full bg-black rounded-lg overflow-hidden border border-white/10 aspect-video flex items-center justify-center relative"
                      >
                        <div className="absolute inset-0 border-2 border-sky-500/30 pointer-events-none rounded-lg animate-pulse" />
                      </div>

                      {/* Select input devices if multiple */}
                      {scannerDevices.length > 1 && (
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-slate-500 uppercase tracking-wider">Selecione a Câmera</label>
                          <select
                            value={selectedScannerDeviceId}
                            onChange={(e) => setSelectedScannerDeviceId(e.target.value)}
                            className="w-full bg-slate-950 border border-white/10 text-[10px] text-white rounded px-2 py-1 outline-none"
                          >
                            {scannerDevices.map(device => (
                              <option key={device.id} value={device.id}>
                                {device.label || `Câmera ${device.id.substring(0, 5)}`}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )}

                  <input
                    id="prodBarcodeField"
                    type="text"
                    disabled={isService}
                    placeholder={isService ? "Não aplicável a Serviços" : "Ex: 789100034455"}
                    value={isService ? "" : prodBarcode}
                    onChange={(e) => setProdBarcode(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault(); // Impede o envio precoce do formulário ao bipar
                        if (prodBarcode.trim()) {
                          showNotification(`Código lido: ${prodBarcode.trim()} 🏷️`, "success");
                        }
                        // Avança automaticamente para o estoque inicial
                        const nextField = document.getElementById("prodInitialStockField");
                        if (nextField) {
                          nextField.focus();
                        }
                      }
                    }}
                    className={`w-full bg-slate-900 border border-white/10 focus:border-sky-500/50 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 transition-all outline-none font-mono ${
                      isService ? "opacity-40 cursor-not-allowed" : ""
                    }`}
                  />
                </div>

                {/* 6. Stock quantities (Only for products) */}
                {!isService && (
                  <>
                    <div className="col-span-6 md:col-span-4">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                        Estoque Inicial (unidades)
                      </label>
                      <input
                        id="prodInitialStockField"
                        type="number"
                        placeholder="Ex: 50"
                        value={prodInitialStock}
                        onChange={(e) => setProdInitialStock(e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 focus:border-sky-500/50 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 transition-all outline-none font-mono"
                      />
                    </div>

                    <div className="col-span-6 md:col-span-4">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 text-amber-400">
                        Alerta Estoque Mínimo
                      </label>
                      <input
                        id="prodMinStockField"
                        type="number"
                        placeholder="Ex: 5"
                        value={prodMinStock}
                        onChange={(e) => setProdMinStock(e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 focus:border-amber-500/40 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 transition-all outline-none font-mono"
                      />
                    </div>
                  </>
                )}

                {/* 7. Specs: Size, Color, Brand */}
                <div className="col-span-6 md:col-span-4">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                    Marca / Fabricante
                  </label>
                  <input
                    type="text"
                    disabled={isService}
                    placeholder="Ex: Coca-cola, Nike"
                    value={isService ? "" : prodBrand}
                    onChange={(e) => setProdBrand(e.target.value)}
                    className={`w-full bg-slate-900 border border-white/10 focus:border-sky-500/50 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 transition-all outline-none ${
                      isService ? "opacity-45 cursor-not-allowed" : ""
                    }`}
                  />
                </div>

                <div className="col-span-6 md:col-span-4">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                    Tamanho / Volume
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: M, G, 350ml, 1kg"
                    value={prodSize}
                    onChange={(e) => setProdSize(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 focus:border-sky-500/50 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 transition-all outline-none"
                  />
                </div>

                <div className="col-span-6 md:col-span-4">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                    Cor / Especificação
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Vermelho, Alumínio"
                    value={prodColor}
                    onChange={(e) => setProdColor(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 focus:border-sky-500/50 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 transition-all outline-none"
                  />
                </div>

                {/* 8. Expiration Date */}
                <div className="col-span-6 md:col-span-4">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1 text-rose-350">
                    <Calendar className="w-3.5 h-3.5 text-rose-450" />
                    Data de Validade
                  </label>
                  <input
                    type="text"
                    disabled={isService}
                    placeholder="Ex: DD/MM/AAAA"
                    value={isService ? "" : prodValidity}
                    onChange={(e) => setProdValidity(e.target.value)}
                    className={`w-full bg-slate-900 border border-white/10 focus:border-sky-500/50 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 transition-all outline-none ${
                      isService ? "opacity-45 cursor-not-allowed" : ""
                    }`}
                  />
                </div>
              </div>

              {/* Emoji avatar selector */}
              <div className="pt-2 border-t border-white/5 space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  Selecione um Ícone / Emoji Representativo
                </label>
                <div className="flex flex-wrap gap-2 p-3 bg-slate-900 border border-white/10 rounded-xl max-h-24 overflow-y-auto">
                  {DEFAULT_EMOJIS.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        setSelectedEmoji(emoji);
                        setProdImageUrl(emoji);
                      }}
                      className={`w-8 h-8 text-lg rounded-lg flex items-center justify-center cursor-pointer transition-all ${
                        selectedEmoji === emoji ? "bg-sky-600 scale-110 shadow-md shadow-sky-500/20" : "hover:bg-white/5"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-white/5 flex gap-3.5 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    handleResetForm();
                    setActiveTab("lista");
                  }}
                  className="px-5 py-3 bg-slate-900 border border-white/10 hover:bg-slate-800 text-slate-300 font-extrabold text-[10px] uppercase tracking-wider rounded-xl cursor-pointer transition-all"
                >
                  Cancelar / Voltar
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-sky-500 to-indigo-600 hover:opacity-95 text-white font-black text-[10px] uppercase tracking-wider rounded-xl shadow-lg shadow-sky-500/10 cursor-pointer transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {editingProductId ? "Confirmar Edição" : "Cadastrar Item no PDV"}
                </button>
              </div>
            </div>

            {/* COLUMN RIGHT: INTELLIGENT PRICING ASSISTANT (4/12) */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              
              {/* Dynamic Advisor Card */}
              <div className="bg-slate-950 border border-white/5 p-5 rounded-2xl space-y-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-sky-500/10 rounded-xl text-sky-400">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[8px] font-black uppercase text-sky-400 tracking-wider">Assistente Inteligente</span>
                    <h5 className="text-xs font-black uppercase text-white mt-0.5">Simulador de Lucro & Markup</h5>
                  </div>
                </div>

                <div className="p-3 bg-slate-900/60 rounded-xl border border-white/5 space-y-3 font-mono">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-500">Custo Unitário:</span>
                    <span className="text-slate-300">{formatCurrency(parsePortugueseNumber(prodCostPrice))}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold border-b border-dashed border-white/5 pb-2">
                    <span className="text-slate-500">Venda Unitária:</span>
                    <span className="text-sky-350 font-extrabold">{formatCurrency(parsePortugueseNumber(prodPrice))}</span>
                  </div>

                  <div className="flex justify-between text-xs font-bold pt-1">
                    <span className="text-slate-500 flex items-center gap-0.5">
                      Lucro Líquido:
                      <Info className="w-3 h-3 text-slate-600" title="Preço de venda menos o preço de custo" />
                    </span>
                    <span className="text-white font-extrabold">{formatCurrency(pricingCalculations.profit)}</span>
                  </div>
                  
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-500 flex items-center gap-0.5">
                      Margem de Lucro:
                      <Info className="w-3 h-3 text-slate-600" title="Porcentagem de cada venda que se torna lucro direto (Lucro / Venda)" />
                    </span>
                    <span className={`font-black ${pricingCalculations.margin < 15 ? "text-red-400" : pricingCalculations.margin >= 50 ? "text-emerald-400" : "text-blue-400"}`}>
                      {pricingCalculations.margin.toFixed(1)}%
                    </span>
                  </div>

                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-500 flex items-center gap-0.5">
                      Markup Aplicado:
                      <Info className="w-3 h-3 text-slate-600" title="Porcentagem adicionada sobre o custo para formar o preço de venda (Lucro / Custo)" />
                    </span>
                    <span className="text-slate-300 font-extrabold">{pricingCalculations.markup.toFixed(1)}%</span>
                  </div>
                </div>

                {/* PRICING ADVICE BADGE & REASONING */}
                <div className="p-3 bg-slate-900 border border-white/5 rounded-xl space-y-2 text-xs">
                  <span className={`px-2 py-0.5 rounded border text-[8px] font-black uppercase tracking-wider block w-fit ${pricingAdvisor.color}`}>
                    {pricingAdvisor.badge}
                  </span>
                  <p className="text-[10.5px] text-slate-350 leading-relaxed font-semibold">
                    {pricingAdvisor.message}
                  </p>
                </div>
              </div>

              {/* Informative advice on niches */}
              <div className="bg-slate-950 border border-white/5 p-4 rounded-2xl space-y-3 text-xs leading-relaxed">
                <span className="text-[8.5px] font-black text-slate-500 uppercase tracking-wider block">📐 Dicas Gerais de Precificação</span>
                <p className="text-[10px] text-slate-400">
                  ⚡ <strong>Serviços:</strong> Não possuem estoque. Como a maior parte do custo é sua mão de obra e energia, as margens ideais giram em torno de <strong>70% a 90%</strong>.
                </p>
                <p className="text-[10px] text-slate-400">
                  📦 <strong>Mercadorias / Comércio:</strong> O recomendado pelo SEBRAE é girar em torno de <strong>30% a 50%</strong> de margem bruta para sustentar custos operacionais da loja e impostos.
                </p>
              </div>

            </div>

          </div>
        </form>
      )}

      {activeTab === "categorias" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* COLUMN LEFT: ADD NEW CATEGORY (4/12) */}
          <div className="lg:col-span-4 bg-slate-950 border border-white/5 rounded-2xl p-5 space-y-4 h-fit">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-sky-500/10 rounded-xl text-sky-400">
                <Tag className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[8px] font-black uppercase text-sky-400 tracking-wider">Categorias</span>
                <h5 className="text-xs font-black uppercase text-white mt-0.5">Criar Nova Categoria</h5>
              </div>
            </div>

            <p className="text-[10.5px] text-slate-400 leading-relaxed">
              Crie categorias personalizadas para organizar melhor os seus produtos e serviços no catálogo e na frente de caixa.
            </p>

            <form onSubmit={handleAddCategory} className="space-y-3.5 pt-2">
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  Nome da Categoria
                </label>
                <input
                  type="text"
                  placeholder="Ex: Bebidas Quentes, Eletrônicos"
                  value={newCategoryInput}
                  onChange={(e) => setNewCategoryInput(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 focus:border-sky-500/50 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 transition-all outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl shadow-lg shadow-sky-500/10 cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Criar Categoria
              </button>
            </form>
          </div>

          {/* COLUMN RIGHT: MANAGE LIST OF CATEGORIES (8/12) */}
          <div className="lg:col-span-8 bg-slate-950 border border-white/5 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div>
                <h5 className="text-xs font-black uppercase text-white">Categorias Ativas ({customCategories.length})</h5>
                <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">Clique no ícone de lápis para renomear, ou no ícone de lixeira para excluir.</p>
              </div>
              <span className="text-[8.5px] font-black bg-slate-900 text-slate-400 border border-white/5 px-2.5 py-1 rounded-full uppercase tracking-wider">
                {selectedNiche.toUpperCase().replace("_", " ")}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
              {customCategories.length === 0 ? (
                <div className="col-span-2 text-center py-12 text-slate-500 font-medium">
                  Nenhuma categoria cadastrada. Crie uma ao lado!
                </div>
              ) : (
                customCategories.map((cat, idx) => {
                  const productCount = customProducts.filter(p => p.category === cat).length;
                  const isEditing = editingCategoryName === cat;

                  return (
                    <div 
                      key={cat + "_" + idx}
                      className="bg-slate-900/40 border border-white/5 rounded-xl p-3 flex flex-col justify-between hover:border-white/10 transition-colors"
                    >
                      {isEditing ? (
                        <div className="space-y-2.5 w-full">
                          <input
                            type="text"
                            value={editingCategoryNewVal}
                            onChange={(e) => setEditingCategoryNewVal(e.target.value)}
                            className="w-full bg-slate-950 border border-sky-500/50 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveCategoryEdit(cat);
                              if (e.key === "Escape") setEditingCategoryName(null);
                            }}
                          />
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingCategoryName(null)}
                              className="px-2 py-1 bg-slate-800 text-slate-300 rounded text-[9px] font-black uppercase hover:bg-slate-700"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveCategoryEdit(cat)}
                              className="px-2 py-1 bg-sky-600 text-white rounded text-[9px] font-black uppercase hover:bg-sky-500"
                            >
                              Salvar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-2 w-full">
                          <div className="space-y-0.5">
                            <span className="text-xs font-black text-white block">{cat}</span>
                            <span className="text-[9px] font-bold text-slate-500 block">
                              🏷️ {productCount} {productCount === 1 ? "produto vinculado" : "produtos vinculados"}
                            </span>
                          </div>
                          
                          <div className="flex gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleStartEditCategory(cat)}
                              title="Editar Categoria"
                              className="p-1.5 bg-slate-800/60 hover:bg-slate-700/60 text-sky-400 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCategory(cat)}
                              title="Excluir Categoria"
                              className="p-1.5 bg-slate-800/60 hover:bg-red-950/60 text-red-400 hover:text-red-300 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Informative footer tip */}
            <div className="p-3 bg-slate-900/60 border border-white/5 rounded-xl text-[10px] text-slate-450 flex items-start gap-2 leading-relaxed font-semibold">
              <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <span>
                💡 <strong>Dica de Integração:</strong> Ao renomear uma categoria, o sistema varre automaticamente todos os produtos e serviços cadastrados que usavam o nome antigo e atualiza para o novo nome de forma instantânea e segura, sem perder o histórico do item!
              </span>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
