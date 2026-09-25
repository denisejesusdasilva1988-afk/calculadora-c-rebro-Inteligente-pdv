import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { 
  Plus, 
  Trash2, 
  User, 
  UserPlus, 
  Search, 
  DollarSign, 
  ShoppingBag, 
  Check, 
  Square, 
  CheckSquare, 
  FileText, 
  Calculator, 
  Share2, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft, 
  Info, 
  Pencil, 
  X, 
  RefreshCw, 
  ArrowRight,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Calendar,
  Download,
  Copy,
  Settings,
  Target,
  Layers,
  ArrowDown,
  ArrowUp,
  Shirt,
  Store,
  Cookie,
  Carrot,
  Beef,
  Scale,
  ShoppingBasket,
  Scissors,
  Sparkles,
  Utensils,
  Coffee,
  Home,
  Beer,
  Wrench
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { jsPDF } from "jspdf";

// Types
export type CommercialSegment = "brecho" | "mercadinho" | "padaria" | "sacolao" | "acougue" | "salao_beleza" | "barbearia" | "manicure" | "bar" | "pensao" | "restaurante" | "comercio_geral" | "mecanico" | "loja_racao" | "aviario";

export interface GarimpoItem {
  id: string;
  name: string;
  buyCost: number;
  appraisedPrice: number;
  size: string;
  condition: string;
  status: "available" | "sold";
  createdAt: string;
}

export interface PerishableItem {
  id: string;
  name: string;
  code: string;
  expiresAt: string;
  qty: number;
  alertDays: number;
}

export interface BakingBatch {
  id: string;
  name: string;
  qty: number;
  readyTime: string;
  status: "preparando" | "quente" | "esgotado";
}

export interface ProduceLoss {
  id: string;
  name: string;
  weightKg: number;
  costLoss: number;
  status: "lost" | "recycled";
  createdAt: string;
}

export interface DeboningLog {
  id: string;
  date: string;
  rawWeight: number;
  leanWeight: number;
  boneWeight: number;
  rawCost: number;
  adjustedUsableCost: number;
}

export interface BrechoItem {
  id: string;
  name: string;       // O que comprou (descrição)
  quantity: number;   // Quantidade de peças
  price: number;      // Valor das roupas (unitário)
  delivered: boolean; // Quadrado para marcar OK / Entregue
}

export interface RestockItem {
  id: string;
  name: string;
  desiredQty: number;
  priority: "high" | "medium" | "low";
  estimatedPrice: number;
  status: "pending" | "ordered" | "completed";
  notes?: string;
  createdAt: string;
}

export interface CustomExpenseItem {
  id: string;
  name: string;
  amount: number;
  createdAt: string; // "DD/MM/YYYY" format
  category?: string;
}

export interface CashTransaction {
  id: string;
  type: "in" | "out"; // "in" = Entrada/Suprimento, "out" = Saída/Sangria
  amount: number;
  reason: string;
  createdAt: string; // "DD/MM/YYYY HH:MM" format
  timestamp: number;
}

export interface BrechoClient {
  id: string;
  name: string;       // Nome do cliente
  notes: string;      // Espaço para anotações/descrição geral
  items: BrechoItem[];
  amountPaid: number; // Valor pago
  createdAt: string;  // Data de cadastro
  clientType?: "buyer" | "supplier"; // Tipo de registro
}

interface BrechoSalesProps {
  formatCurrency: (amount: number) => string;
  showNotification: (msg: string, type: "success" | "error" | "info") => void;
  onAddAgendaEvent?: (event: {
    title: string;
    amount: number;
    type: 'shopping' | 'payment_received' | 'payment_made' | 'general';
    date: Date;
    status: 'pending' | 'completed';
    description?: string;
  }) => Promise<void>;
  isLoggedIn: boolean;
  userId?: string;
  db?: any;
  handleFirestoreError?: (error: any, op: any, path: string | null) => void;
  setNotepadMode?: (mode: any) => void;
}

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

const sanitizeClient = (c: any): BrechoClient => {
  return {
    id: String(c.id || ""),
    name: String(c.name || ""),
    notes: String(c.notes || ""),
    amountPaid: typeof c.amountPaid === "number" ? c.amountPaid : parsePortugueseNumber(String(c.amountPaid || "0")),
    createdAt: String(c.createdAt || ""),
    clientType: c.clientType === "supplier" ? "supplier" : "buyer",
    items: Array.isArray(c.items) ? c.items.map((item: any) => ({
      id: String(item.id || ""),
      name: String(item.name || ""),
      quantity: typeof item.quantity === "number" ? item.quantity : parseInt(String(item.quantity || "0")) || 0,
      price: typeof item.price === "number" ? item.price : parsePortugueseNumber(String(item.price || "0")),
      delivered: !!item.delivered
    })) : []
  };
};

const parseCreatedDate = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  
  // Try pattern DD/MM/YYYY or D/M/YYYY
  const parts = dateStr.trim().split("/");
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d;
    }
  }
  
  // Try fallback direct Date parser
  const fallback = new Date(dateStr);
  if (!isNaN(fallback.getTime())) return fallback;
  
  return new Date();
};

export const BrechoSalesModule = React.memo(({ 
  formatCurrency, 
  showNotification,
  onAddAgendaEvent,
  isLoggedIn,
  userId,
  db,
  handleFirestoreError,
  setNotepadMode,
}: BrechoSalesProps) => {
  // --- States ---
  const [hasFetchedFromCloud, setHasFetchedFromCloud] = useState(false);
  const [fetchedUserId, setFetchedUserId] = useState<string | undefined>(undefined);

  // Store all clients in localstorage for persistence, scoped by user
  const [clients, setClients] = useState<BrechoClient[]>(() => {
    try {
      const key = userId ? `brecho_clients_user_${userId}` : `brecho_clients_guest`;
      const saved = localStorage.getItem(key);
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed.map(sanitizeClient) : [];
    } catch {
      return [];
    }
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    clientId: string;
    clientName: string;
  }>({
    isOpen: false,
    clientId: "",
    clientName: "",
  });
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(() => {
    try {
      const key = userId ? `brecho_selected_client_id_user_${userId}` : `brecho_selected_client_id_guest`;
      return localStorage.getItem(key) || null;
    } catch {
      return null;
    }
  });

  // --- Brand New Commercial Dashboard Control States ---
  const [activeTab, setActiveTab] = useState<"ledgers" | "dashboard">("ledgers");
  const [dashboardPeriod, setDashboardPeriod] = useState<"today" | "quinzenal" | "month">("month");
  
  const [monthlyGoal, setMonthlyGoal] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("brecho_monthly_goal");
      return saved ? parseFloat(saved) || 5000 : 5000;
    } catch {
      return 5000;
    }
  });
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [goalEditingInput, setGoalEditingInput] = useState("");

  const [restockItems, setRestockItems] = useState<RestockItem[]>(() => {
    try {
      const key = userId ? `brecho_restock_user_${userId}` : `brecho_restock_guest`;
      const saved = localStorage.getItem(key);
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  // Restock list form inputs
  const [newRestockName, setNewRestockName] = useState("");
  const [newRestockQty, setNewRestockQty] = useState(1);
  const [newRestockPriority, setNewRestockPriority] = useState<"high" | "medium" | "low">("medium");
  const [newRestockPrice, setNewRestockPrice] = useState("");
  const [newRestockNotes, setNewRestockNotes] = useState("");
  const [isAddingRestock, setIsAddingRestock] = useState(false);

  // --- Segment Customizer States (Niches) ---
  const [commercialSegment, setCommercialSegment] = useState<CommercialSegment>(() => {
    try {
      return (localStorage.getItem("brecho_commercial_segment") as CommercialSegment) || "brecho";
    } catch {
      return "brecho";
    }
  });

  const [garimpoItems, setGarimpoItems] = useState<GarimpoItem[]>(() => {
    try {
      const key = userId ? `brecho_garimpo_user_${userId}` : `brecho_garimpo_guest`;
      const saved = localStorage.getItem(key);
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [perishables, setPerishables] = useState<PerishableItem[]>(() => {
    try {
      const key = userId ? `brecho_perishables_user_${userId}` : `brecho_perishables_guest`;
      const saved = localStorage.getItem(key);
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [bakingBatches, setBakingBatches] = useState<BakingBatch[]>(() => {
    try {
      const key = userId ? `brecho_baking_user_${userId}` : `brecho_baking_guest`;
      const saved = localStorage.getItem(key);
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [produceLosses, setProduceLosses] = useState<ProduceLoss[]>(() => {
    try {
      const key = userId ? `brecho_losses_user_${userId}` : `brecho_losses_guest`;
      const saved = localStorage.getItem(key);
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [deboningLogs, setDeboningLogs] = useState<DeboningLog[]>(() => {
    try {
      const key = userId ? `brecho_deboning_user_${userId}` : `brecho_deboning_guest`;
      const saved = localStorage.getItem(key);
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [customExpenses, setCustomExpenses] = useState<CustomExpenseItem[]>(() => {
    try {
      const key = userId ? `brecho_expenses_user_${userId}` : `brecho_expenses_guest`;
      const saved = localStorage.getItem(key);
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [expenseInputName, setExpenseInputName] = useState("");
  const [expenseInputAmount, setExpenseInputAmount] = useState("");
  const [expenseInputCategory, setExpenseInputCategory] = useState("Geral");
  const [isAddingExpense, setIsAddingExpense] = useState(false);

  // --- Cash Drawer (Entrada & Saída de Caixa / Suprimento / Sangria) States ---
  const [cashTransactions, setCashTransactions] = useState<CashTransaction[]>(() => {
    try {
      const key = userId ? `brecho_cash_transactions_user_${userId}` : `brecho_cash_transactions_guest`;
      const saved = localStorage.getItem(key);
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [cashInputAmount, setCashInputAmount] = useState("");
  const [cashInputReason, setCashInputReason] = useState("");
  const [cashInputType, setCashInputType] = useState<"in" | "out">("in");
  const [isCashDrawerOpen, setIsCashDrawerOpen] = useState(false);

  // Editing state for cash transactions
  const [editingCashTxId, setEditingCashTxId] = useState<string | null>(null);
  const [editingCashReason, setEditingCashReason] = useState("");
  const [editingCashAmount, setEditingCashAmount] = useState("");
  const [editingCashType, setEditingCashType] = useState<"in" | "out">("in");

  // Niche inputs state
  const [garimpoName, setGarimpoName] = useState("");
  const [garimpoBuyCost, setGarimpoBuyCost] = useState("");
  const [garimpoSellPrice, setGarimpoSellPrice] = useState("");
  const [garimpoSize, setGarimpoSize] = useState("M");
  const [garimpoCondition, setGarimpoCondition] = useState("Excelente");
  const [isAddingGarimpo, setIsAddingGarimpo] = useState(false);

  const [perishableName, setPerishableName] = useState("");
  const [perishableCode, setPerishableCode] = useState("");
  const [perishableExpiry, setPerishableExpiry] = useState("");
  const [perishableQty, setPerishableQty] = useState(1);
  const [perishableAlertDays, setPerishableAlertDays] = useState(7);
  const [isAddingPerishable, setIsAddingPerishable] = useState(false);

  const [bakingName, setBakingName] = useState("");
  const [bakingQty, setBakingQty] = useState(10);
  const [bakingReadyTime, setBakingReadyTime] = useState("");
  const [isAddingBaking, setIsAddingBaking] = useState(false);

  const [lossName, setLossName] = useState("");
  const [lossWeight, setLossWeight] = useState("");
  const [lossCost, setLossCost] = useState("");
  const [isAddingLoss, setIsAddingLoss] = useState(false);

  // --- States for the 7 new commercial niches ---
  const [salonCommission, setSalonCommission] = useState(40);
  const [salonColaborador, setSalonColaborador] = useState("Ana (Esteticista)");
  const [barbeariaCustomerName, setBarbeariaCustomerName] = useState("");
  const [barbeariaQueue, setBarbeariaQueue] = useState<{ id: string; name: string; service: string }[]>([
    { id: "bq1", name: "Rafael Silva", service: "Corte Degradê" },
    { id: "bq2", name: "Marcio Lira", service: "Barba Exclusiva" }
  ]);
  const [manicureNailType, setManicureNailType] = useState("Gel");
  const [barIncludeTips, setBarIncludeTips] = useState(true);
  const [barTableNum, setBarTableNum] = useState("03");
  const [pensaoContainerSize, setPensaoContainerSize] = useState<"P" | "M" | "G">("M");
  const [pensaoPlateDay, setPensaoPlateDay] = useState("Feijoada Completa");
  const [restaurantScaleWeight, setRestaurantScaleWeight] = useState("0,550");
  const [comercioGeralBarcode, setComercioGeralBarcode] = useState("");

  const [deboningRawWeight, setDeboningRawWeight] = useState("");
  const [deboningLeanWeight, setDeboningLeanWeight] = useState("");
  const [deboningBoneWeight, setDeboningBoneWeight] = useState("");
  const [deboningRawCost, setDeboningRawCost] = useState("");
  const [isAddingDeboning, setIsAddingDeboning] = useState(false);

  // Weighing Scale simulator states (for Sacolão)
  const [scaleProduct, setScaleProduct] = useState("");
  const [scalePricePerKg, setScalePricePerKg] = useState("");
  const [scaleWeightGrams, setScaleWeightGrams] = useState("");
  const [isScaleOpen, setIsScaleOpen] = useState(false);

  // Synchronizers of niches state on changes
  useEffect(() => {
    try {
      localStorage.setItem("brecho_commercial_segment", commercialSegment);
    } catch {}
  }, [commercialSegment]);

  useEffect(() => {
    try {
      const key = userId ? `brecho_garimpo_user_${userId}` : `brecho_garimpo_guest`;
      localStorage.setItem(key, JSON.stringify(garimpoItems));
    } catch {}
  }, [garimpoItems, userId]);

  useEffect(() => {
    try {
      const key = userId ? `brecho_perishables_user_${userId}` : `brecho_perishables_guest`;
      localStorage.setItem(key, JSON.stringify(perishables));
    } catch {}
  }, [perishables, userId]);

  useEffect(() => {
    try {
      const key = userId ? `brecho_baking_user_${userId}` : `brecho_baking_guest`;
      localStorage.setItem(key, JSON.stringify(bakingBatches));
    } catch {}
  }, [bakingBatches, userId]);

  useEffect(() => {
    try {
      const key = userId ? `brecho_losses_user_${userId}` : `brecho_losses_guest`;
      localStorage.setItem(key, JSON.stringify(produceLosses));
    } catch {}
  }, [produceLosses, userId]);

  useEffect(() => {
    try {
      const key = userId ? `brecho_deboning_user_${userId}` : `brecho_deboning_guest`;
      localStorage.setItem(key, JSON.stringify(deboningLogs));
    } catch {}
  }, [deboningLogs, userId]);

  // Keep goal synced in localStorage
  useEffect(() => {
    try {
      localStorage.setItem("brecho_monthly_goal", monthlyGoal.toString());
    } catch (err) {
      console.error(err);
    }
  }, [monthlyGoal]);

  // Keep active client ID selected in localStorage to never lose selection on refresh/navigation
  useEffect(() => {
    try {
      const key = userId ? `brecho_selected_client_id_user_${userId}` : `brecho_selected_client_id_guest`;
      if (selectedClientId) {
        localStorage.setItem(key, selectedClientId);
      } else {
        localStorage.removeItem(key);
      }
    } catch (err) {
      console.error(err);
    }
  }, [selectedClientId, userId]);

  // Sync clients to localstorage
  useEffect(() => {
    try {
      const key = userId ? `brecho_clients_user_${userId}` : `brecho_clients_guest`;
      localStorage.setItem(key, JSON.stringify(clients));
    } catch (err) {
      console.error(err);
    }
  }, [clients, userId]);

  // Sync restockItems to localstorage
  useEffect(() => {
    try {
      const key = userId ? `brecho_restock_user_${userId}` : `brecho_restock_guest`;
      localStorage.setItem(key, JSON.stringify(restockItems));
    } catch (err) {
      console.error(err);
    }
  }, [restockItems, userId]);

  // Sync customExpenses to localstorage
  useEffect(() => {
    try {
      const key = userId ? `brecho_expenses_user_${userId}` : `brecho_expenses_guest`;
      localStorage.setItem(key, JSON.stringify(customExpenses));
    } catch (err) {
      console.error(err);
    }
  }, [customExpenses, userId]);

  // Sync cashTransactions to localstorage
  useEffect(() => {
    try {
      const key = userId ? `brecho_cash_transactions_user_${userId}` : `brecho_cash_transactions_guest`;
      localStorage.setItem(key, JSON.stringify(cashTransactions));
    } catch (err) {
      console.error(err);
    }
  }, [cashTransactions, userId]);

  // Handle userId props change to reload states from correct key
  useEffect(() => {
    setHasFetchedFromCloud(false);
    setFetchedUserId(undefined);
    try {
      const key = userId ? `brecho_clients_user_${userId}` : `brecho_clients_guest`;
      const saved = localStorage.getItem(key);
      const parsed = saved ? JSON.parse(saved) : [];
      setClients(Array.isArray(parsed) ? parsed.map(sanitizeClient) : []);
    } catch {
      setClients([]);
    }

    try {
      const key = userId ? `brecho_restock_user_${userId}` : `brecho_restock_guest`;
      const saved = localStorage.getItem(key);
      const parsed = saved ? JSON.parse(saved) : [];
      setRestockItems(Array.isArray(parsed) ? parsed : []);
    } catch {
      setRestockItems([]);
    }

    try {
      const key = userId ? `brecho_selected_client_id_user_${userId}` : `brecho_selected_client_id_guest`;
      setSelectedClientId(localStorage.getItem(key) || null);
    } catch {
      setSelectedClientId(null);
    }

    try {
      const seg = localStorage.getItem("brecho_commercial_segment");
      setCommercialSegment((seg as CommercialSegment) || "brecho");
    } catch {}

    try {
      const key = userId ? `brecho_garimpo_user_${userId}` : `brecho_garimpo_guest`;
      const saved = localStorage.getItem(key);
      setGarimpoItems(saved ? JSON.parse(saved) : []);
    } catch {}

    try {
      const key = userId ? `brecho_perishables_user_${userId}` : `brecho_perishables_guest`;
      const saved = localStorage.getItem(key);
      setPerishables(saved ? JSON.parse(saved) : []);
    } catch {}

    try {
      const key = userId ? `brecho_baking_user_${userId}` : `brecho_baking_guest`;
      const saved = localStorage.getItem(key);
      setBakingBatches(saved ? JSON.parse(saved) : []);
    } catch {}

    try {
      const key = userId ? `brecho_losses_user_${userId}` : `brecho_losses_guest`;
      const saved = localStorage.getItem(key);
      setProduceLosses(saved ? JSON.parse(saved) : []);
    } catch {}

    try {
      const key = userId ? `brecho_deboning_user_${userId}` : `brecho_deboning_guest`;
      const saved = localStorage.getItem(key);
      setDeboningLogs(saved ? JSON.parse(saved) : []);
    } catch {}

    try {
      const key = userId ? `brecho_expenses_user_${userId}` : `brecho_expenses_guest`;
      const saved = localStorage.getItem(key);
      setCustomExpenses(saved ? JSON.parse(saved) : []);
    } catch {}

    try {
      const key = userId ? `brecho_cash_transactions_user_${userId}` : `brecho_cash_transactions_guest`;
      const saved = localStorage.getItem(key);
      setCashTransactions(saved ? JSON.parse(saved) : []);
    } catch {}
  }, [userId]);

  // Sync from Cloud Firestore when user logs in/is loaded
  useEffect(() => {
    if (!userId || userId === "guest_visitor" || !db) {
      setHasFetchedFromCloud(true);
      setFetchedUserId(userId);
      return;
    }
    const fetchBrechoClients = async () => {
      const path = `userData/${userId}`;
      try {
        const docRef = doc(db, "userData", userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.brechoClients && Array.isArray(data.brechoClients)) {
            setClients(data.brechoClients.map(sanitizeClient));
          } else {
            setClients([]);
          }

          if (data.brechoRestockItems && Array.isArray(data.brechoRestockItems)) {
            setRestockItems(data.brechoRestockItems);
          } else {
            setRestockItems([]);
          }

          if (data.commercialSegment) {
            setCommercialSegment(data.commercialSegment);
          }
          if (data.garimpoItems && Array.isArray(data.garimpoItems)) {
            setGarimpoItems(data.garimpoItems);
          }
          if (data.perishables && Array.isArray(data.perishables)) {
            setPerishables(data.perishables);
          }
          if (data.bakingBatches && Array.isArray(data.bakingBatches)) {
            setBakingBatches(data.bakingBatches);
          }
          if (data.produceLosses && Array.isArray(data.produceLosses)) {
            setProduceLosses(data.produceLosses);
          }
          if (data.deboningLogs && Array.isArray(data.deboningLogs)) {
            setDeboningLogs(data.deboningLogs);
          }
          if (data.brechoCustomExpenses && Array.isArray(data.brechoCustomExpenses)) {
            setCustomExpenses(data.brechoCustomExpenses);
          } else {
            setCustomExpenses([]);
          }

          if (data.brechoCashTransactions && Array.isArray(data.brechoCashTransactions)) {
            setCashTransactions(data.brechoCashTransactions);
          } else {
            setCashTransactions([]);
          }

          if (data.brechoClients && data.brechoClients.length > 0) {
            showNotification("Cálculos, clientes e reposições recuperados! ✨", "success");
          }
        } else {
          setClients([]);
          setRestockItems([]);
        }
      } catch (err: any) {
        console.error("Erro ao carregar dados do brechó do Firestore:", err);
        if (handleFirestoreError) {
          handleFirestoreError(err, "get", path);
        }
      } finally {
        setHasFetchedFromCloud(true);
        setFetchedUserId(userId);
      }
    };
    fetchBrechoClients();
  }, [userId, db, handleFirestoreError]);

  // Ref to always hold the latest clients and fetch status for autosave without stale closures
  const latestBrechoRef = useRef({ 
    clients, 
    restockItems, 
    userId, 
    hasFetchedFromCloud, 
    fetchedUserId,
    commercialSegment,
    garimpoItems,
    perishables,
    bakingBatches,
    produceLosses,
    deboningLogs,
    customExpenses,
    cashTransactions
  });
  useEffect(() => {
    latestBrechoRef.current = { 
      clients, 
      restockItems, 
      userId, 
      hasFetchedFromCloud, 
      fetchedUserId,
      commercialSegment,
      garimpoItems,
      perishables,
      bakingBatches,
      produceLosses,
      deboningLogs,
      customExpenses,
      cashTransactions
    };
  }, [clients, restockItems, userId, hasFetchedFromCloud, fetchedUserId, commercialSegment, garimpoItems, perishables, bakingBatches, produceLosses, deboningLogs, customExpenses, cashTransactions]);

  const saveBrechoImmediately = useCallback(() => {
    const { 
      clients, 
      restockItems, 
      userId, 
      hasFetchedFromCloud, 
      fetchedUserId,
      commercialSegment,
      garimpoItems,
      perishables,
      bakingBatches,
      produceLosses,
      deboningLogs,
      customExpenses,
      cashTransactions
    } = latestBrechoRef.current;
    if (!userId || !db || !hasFetchedFromCloud || fetchedUserId !== userId) return;
    
    // Save locally
    try {
      const key = `brecho_clients_user_${userId}`;
      localStorage.setItem(key, JSON.stringify(clients));

      const keyRestock = `brecho_restock_user_${userId}`;
      localStorage.setItem(keyRestock, JSON.stringify(restockItems));

      localStorage.setItem("brecho_commercial_segment", commercialSegment);
      localStorage.setItem(`brecho_garimpo_user_${userId}`, JSON.stringify(garimpoItems));
      localStorage.setItem(`brecho_perishables_user_${userId}`, JSON.stringify(perishables));
      localStorage.setItem(`brecho_baking_user_${userId}`, JSON.stringify(bakingBatches));
      localStorage.setItem(`brecho_losses_user_${userId}`, JSON.stringify(produceLosses));
      localStorage.setItem(`brecho_deboning_user_${userId}`, JSON.stringify(deboningLogs));
      localStorage.setItem(`brecho_expenses_user_${userId}`, JSON.stringify(customExpenses));
      localStorage.setItem(`brecho_cash_transactions_user_${userId}`, JSON.stringify(cashTransactions));
    } catch (err) {
      console.error("Erro no autosave local brechó:", err);
    }

    // Helper to deep clean undefined values for Firestore serialization safety
    const cleanUndefined = (obj: any): any => {
      if (obj === undefined) {
        return null;
      }
      if (Array.isArray(obj)) {
        return obj.map(item => cleanUndefined(item));
      }
      if (typeof obj === "object" && obj !== null) {
        // Check if it is a Firestore FieldValue or similar non-plain object
        const prototype = Object.getPrototypeOf(obj);
        const isPlain = prototype === null || prototype === Object.prototype || Object.getPrototypeOf(prototype) === null;
        if (isPlain) {
          const cleaned: any = {};
          for (const key of Object.keys(obj)) {
            const val = obj[key];
            if (val !== undefined) {
              cleaned[key] = cleanUndefined(val);
            }
          }
          return cleaned;
        }
      }
      return obj;
    };

    // Save to Firestore
    if (!userId || userId === "guest_visitor" || !db) return;
    try {
      const docRef = doc(db, "userData", userId);
      const rawPayload = {
        userId: userId,
        brechoClients: clients,
        brechoRestockItems: restockItems,
        commercialSegment,
        garimpoItems,
        perishables,
        bakingBatches,
        produceLosses,
        deboningLogs,
        brechoCustomExpenses: customExpenses,
        brechoCashTransactions: cashTransactions,
        updatedAt: serverTimestamp()
      };
      const cleanedPayload = cleanUndefined(rawPayload);
      setDoc(docRef, cleanedPayload, { merge: true }).catch(err => console.error("Erro no autosave brecho cloud background:", err));
    } catch (err) {
      console.error("Erro no autosave brecho cloud setup:", err);
    }
  }, [db]);

  // Sync back to Cloud Firestore automatically with debounce
  useEffect(() => {
    if (!userId || userId === "guest_visitor" || !db || !hasFetchedFromCloud || fetchedUserId !== userId) return;
    const timeout = setTimeout(() => {
      saveBrechoImmediately();
    }, 1500);
    return () => clearTimeout(timeout);
  }, [clients, restockItems, userId, db, hasFetchedFromCloud, fetchedUserId, commercialSegment, garimpoItems, perishables, bakingBatches, produceLosses, deboningLogs, customExpenses, cashTransactions, saveBrechoImmediately]);

  // Run immediate save on unmount, or when leaving the app/switching tabs
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveBrechoImmediately();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        saveBrechoImmediately();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      saveBrechoImmediately(); // Save immediately when component unmounts (leaving "Orçamento de cálculos" / Brechó tab)
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [saveBrechoImmediately]);
  
  const [mobileView, setMobileView] = useState<"list" | "details">("list");

  // --- Brand New Calculations useMemo ---
  const commercialStats = useMemo(() => {
    const now = new Date();
    
    // Day ranges
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(now.getDate() - 15);
    fifteenDaysAgo.setHours(0, 0, 0, 0);
    
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let salesToday = 0;
    let salesQuinzenal = 0;
    let salesMonth = 0;

    let costsToday = 0;
    let costsQuinzenal = 0;
    let costsMonth = 0;

    const productSalesMap: Record<string, { qty: number; value: number }> = {};
    const expenseMap: Record<string, { qty: number; value: number }> = {};
    
    const debtors: { name: string; amount: number; id: string }[] = [];
    const topBuyers: { name: string; totalBought: number; id: string }[] = [];

    // Detailed lists for the selected period
    const activePeriodSalesList: { clientName: string; name: string; qty: number; price: number; total: number; date: string; payStatus: string }[] = [];
    const activePeriodInflowList: { source: string; name: string; qty: number; cost: number; total: number; date: string }[] = [];
    const activePeriodExpenseList: { source: string; name: string; qty: number; cost: number; total: number; date: string }[] = [];

    clients.forEach(c => {
      const isSupplier = c.clientType === "supplier";
      const clientDate = parseCreatedDate(c.createdAt);
      
      const clientTotal = c.items.reduce((acc, item) => acc + ((Number(item.price) || 0) * (Number(item.quantity) || 0)), 0);
      const paid = Number(c.amountPaid) || 0;
      const remaining = clientTotal - paid;

      const isToday = clientDate >= startOfToday;
      const isQuinzenal = clientDate >= fifteenDaysAgo;
      const isMonth = clientDate >= startOfThisMonth;

      const matchesActivePeriod = 
        dashboardPeriod === "today" ? isToday :
        dashboardPeriod === "quinzenal" ? isQuinzenal :
        isMonth;

      if (isSupplier) {
        if (isToday) costsToday += clientTotal;
        if (isQuinzenal) costsQuinzenal += clientTotal;
        if (isMonth) costsMonth += clientTotal;

        c.items.forEach(item => {
          const nameNormalized = item.name.trim().toUpperCase();
          if (nameNormalized) {
            if (!expenseMap[nameNormalized]) {
              expenseMap[nameNormalized] = { qty: 0, value: 0 };
            }
            expenseMap[nameNormalized].qty += item.quantity;
            expenseMap[nameNormalized].value += item.price * item.quantity;
          }

          if (matchesActivePeriod) {
            activePeriodInflowList.push({
              source: `Fornecedor: ${c.name}`,
              name: item.name,
              qty: item.quantity,
              cost: item.price,
              total: item.price * item.quantity,
              date: c.createdAt
            });

            activePeriodExpenseList.push({
              source: `Fornecedor: ${c.name}`,
              name: item.name,
              qty: item.quantity,
              cost: item.price,
              total: item.price * item.quantity,
              date: c.createdAt
            });
          }
        });
      } else {
        if (isToday) salesToday += clientTotal;
        if (isQuinzenal) salesQuinzenal += clientTotal;
        if (isMonth) salesMonth += clientTotal;

        if (clientTotal > 0) {
          topBuyers.push({ name: c.name, totalBought: clientTotal, id: c.id });
        }

        c.items.forEach(item => {
          const nameNormalized = item.name.trim().toUpperCase();
          if (nameNormalized) {
            if (!productSalesMap[nameNormalized]) {
              productSalesMap[nameNormalized] = { qty: 0, value: 0 };
            }
            productSalesMap[nameNormalized].qty += item.quantity;
            productSalesMap[nameNormalized].value += item.price * item.quantity;
          }

          if (matchesActivePeriod) {
            activePeriodSalesList.push({
              clientName: c.name,
              name: item.name,
              qty: item.quantity,
              price: item.price,
              total: item.price * item.quantity,
              date: c.createdAt,
              payStatus: remaining <= 0 ? "PAGO ✅" : (paid > 0 ? "PARCIAL ⏳" : "PENDENTE ❌")
            });
          }
        });

        if (remaining > 0) {
          debtors.push({ name: c.name, amount: remaining, id: c.id });
        }
      }
    });

    // Also include garimpo items created in active period as inflow!
    garimpoItems.forEach(item => {
      const gDate = parseCreatedDate(item.createdAt);
      const isGToday = gDate >= startOfToday;
      const isGQuinzenal = gDate >= fifteenDaysAgo;
      const isGMonth = gDate >= startOfThisMonth;
      
      const isGActive = 
        dashboardPeriod === "today" ? isGToday :
        dashboardPeriod === "quinzenal" ? isGQuinzenal :
        isGMonth;

      if (isGActive) {
        activePeriodInflowList.push({
          source: "Garimpo Autoral",
          name: `${item.name} (${item.size || "Único"}) - ${item.condition || "Excelente"}`,
          qty: 1,
          cost: item.buyCost,
          total: item.buyCost,
          date: item.createdAt
        });

        // Curated pieces costs can also be an expense
        activePeriodExpenseList.push({
          source: "Custos Curadoria (Garimpo)",
          name: `Ajuste Custo: ${item.name}`,
          qty: 1,
          cost: item.buyCost,
          total: item.buyCost,
          date: item.createdAt
        });
      }
    });

    // Incorporate custom expenses into total costs
    customExpenses.forEach(exp => {
      const expDate = parseCreatedDate(exp.createdAt);
      const isToday = expDate >= startOfToday;
      const isQuinzenal = expDate >= fifteenDaysAgo;
      const isMonth = expDate >= startOfThisMonth;

      if (isToday) costsToday += exp.amount;
      if (isQuinzenal) costsQuinzenal += exp.amount;
      if (isMonth) costsMonth += exp.amount;

      const matchesActivePeriod = 
        dashboardPeriod === "today" ? isToday :
        dashboardPeriod === "quinzenal" ? isQuinzenal :
        isMonth;

      if (matchesActivePeriod) {
        activePeriodExpenseList.push({
          source: exp.category || "Geral",
          name: exp.name,
          qty: 1,
          cost: exp.amount,
          total: exp.amount,
          date: exp.createdAt
        });
      }
    });

    const bestSellers = Object.entries(productSalesMap).map(([name, stats]) => ({
      name,
      qty: stats.qty,
      value: stats.value
    })).sort((a, b) => b.qty - a.qty);

    const topExpenses = Object.entries(expenseMap).map(([name, stats]) => ({
      name,
      qty: stats.qty,
      value: stats.value
    })).sort((a, b) => b.value - a.value);

    // Group buyers by name to handle repeat customer sales aggregation
    const groupedBuyersMap: Record<string, { totalBought: number; id: string }> = {};
    topBuyers.forEach(item => {
      const nameNorm = item.name.trim().toUpperCase();
      if (!groupedBuyersMap[nameNorm]) {
        groupedBuyersMap[nameNorm] = { totalBought: 0, id: item.id };
      }
      groupedBuyersMap[nameNorm].totalBought += item.totalBought;
    });

    const sortedBuyers = Object.entries(groupedBuyersMap).map(([name, stats]) => ({
      name,
      totalBought: stats.totalBought,
      id: stats.id
    })).sort((a, b) => b.totalBought - a.totalBought).slice(0, 5);

    // Group debtors similarly
    const groupedDebtorsMap: Record<string, { amount: number; id: string }> = {};
    debtors.forEach(item => {
      const nameNorm = item.name.trim().toUpperCase();
      if (!groupedDebtorsMap[nameNorm]) {
        groupedDebtorsMap[nameNorm] = { amount: 0, id: item.id };
      }
      groupedDebtorsMap[nameNorm].amount += item.amount;
    });

    const sortedDebtors = Object.entries(groupedDebtorsMap).map(([name, stats]) => ({
      name,
      amount: stats.amount,
      id: stats.id
    })).sort((a, b) => b.amount - a.amount);

    // --- Dynamic Cash Drawer (Fluxo de Caixa) Calculations ---
    let totalCashInflowManual = 0;
    let totalCashOutflowManual = 0;

    cashTransactions.forEach(tx => {
      const txDateStr = tx.createdAt.split(" ")[0]; // "DD/MM/YYYY" format
      const txDate = parseCreatedDate(txDateStr);
      const isToday = txDate >= startOfToday;
      const isQuinzenal = txDate >= fifteenDaysAgo;
      const isMonth = txDate >= startOfThisMonth;

      const matchesActivePeriod = 
        dashboardPeriod === "today" ? isToday :
        dashboardPeriod === "quinzenal" ? isQuinzenal :
        isMonth;

      if (matchesActivePeriod) {
        if (tx.type === "in") {
          totalCashInflowManual += tx.amount;
          activePeriodInflowList.push({
            source: "Suprimento de Caixa",
            name: tx.reason,
            qty: 1,
            cost: tx.amount,
            total: tx.amount,
            date: tx.createdAt.split(" ")[0]
          });
        } else {
          totalCashOutflowManual += tx.amount;
          activePeriodExpenseList.push({
            source: "Sangria de Caixa",
            name: tx.reason,
            qty: 1,
            cost: tx.amount,
            total: tx.amount,
            date: tx.createdAt.split(" ")[0]
          });
        }
      }
    });

    // Total actual payments received or paid in active period
    let totalReceivedFromClients = 0;
    let totalPaidToSuppliers = 0;

    clients.forEach(c => {
      const clientDate = parseCreatedDate(c.createdAt);
      const isToday = clientDate >= startOfToday;
      const isQuinzenal = clientDate >= fifteenDaysAgo;
      const isMonth = clientDate >= startOfThisMonth;

      const matchesActivePeriod = 
        dashboardPeriod === "today" ? isToday :
        dashboardPeriod === "quinzenal" ? isQuinzenal :
        isMonth;

      if (matchesActivePeriod) {
        const isSupplier = c.clientType === "supplier";
        const paid = Number(c.amountPaid) || 0;
        if (isSupplier) {
          totalPaidToSuppliers += paid;
        } else {
          totalReceivedFromClients += paid;
        }
      }
    });

    let totalCustomExpensesActivePeriod = 0;
    customExpenses.forEach(exp => {
      const expDate = parseCreatedDate(exp.createdAt);
      const isToday = expDate >= startOfToday;
      const isQuinzenal = expDate >= fifteenDaysAgo;
      const isMonth = expDate >= startOfThisMonth;

      const matchesActivePeriod = 
        dashboardPeriod === "today" ? isToday :
        dashboardPeriod === "quinzenal" ? isQuinzenal :
        isMonth;

      if (matchesActivePeriod) {
        totalCustomExpensesActivePeriod += exp.amount;
      }
    });

    const totalInflowActivePeriod = totalReceivedFromClients + totalCashInflowManual;
    const totalOutflowActivePeriod = totalPaidToSuppliers + totalCashOutflowManual + totalCustomExpensesActivePeriod;
    const cashBalanceActivePeriod = totalInflowActivePeriod - totalOutflowActivePeriod;

    // Overall historical balances (cross-period visual total for drawer safety)
    let overallCashInflowManual = 0;
    let overallCashOutflowManual = 0;
    cashTransactions.forEach(tx => {
      if (tx.type === "in") overallCashInflowManual += tx.amount;
      else overallCashOutflowManual += tx.amount;
    });

    let overallReceivedFromClients = 0;
    let overallPaidToSuppliers = 0;
    clients.forEach(c => {
      const isSupplier = c.clientType === "supplier";
      const paid = Number(c.amountPaid) || 0;
      if (isSupplier) overallPaidToSuppliers += paid;
      else overallReceivedFromClients += paid;
    });

    let overallCustomExpenses = 0;
    customExpenses.forEach(exp => {
      overallCustomExpenses += exp.amount;
    });

    const overallCashBalance = (overallReceivedFromClients + overallCashInflowManual) - (overallPaidToSuppliers + overallCashOutflowManual + overallCustomExpenses);

    return {
      salesToday,
      salesQuinzenal,
      salesMonth,
      costsToday,
      costsQuinzenal,
      costsMonth,
      profitToday: salesToday - costsToday,
      profitQuinzenal: salesQuinzenal - costsQuinzenal,
      profitMonth: salesMonth - costsMonth,
      bestSellers,
      topExpenses,
      topBuyers: sortedBuyers,
      debtors: sortedDebtors,
      activePeriodSalesList,
      activePeriodInflowList,
      activePeriodExpenseList,
      // Cash Drawer exports:
      totalCashInflowManual,
      totalCashOutflowManual,
      totalReceivedFromClients,
      totalPaidToSuppliers,
      totalInflowActivePeriod,
      totalOutflowActivePeriod,
      cashBalanceActivePeriod,
      overallCashBalance
    };
  }, [clients, dashboardPeriod, garimpoItems, customExpenses, cashTransactions]);

  // --- Handlers for Custom Direct Expenses ---
  const handleAddCustomExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseInputName.trim()) {
      showNotification("Por favor, digite o nome da despesa!", "error");
      return;
    }
    const amountVal = parsePortugueseNumber(expenseInputAmount);
    if (amountVal <= 0) {
      showNotification("O valor da despesa deve ser maior que zero!", "error");
      return;
    }

    const newExpense: CustomExpenseItem = {
      id: "exp_" + Date.now(),
      name: expenseInputName.trim().toUpperCase(),
      amount: amountVal,
      category: expenseInputCategory,
      createdAt: new Date().toLocaleDateString("pt-BR")
    };

    setCustomExpenses(prev => [newExpense, ...prev]);
    setExpenseInputName("");
    setExpenseInputAmount("");
    setExpenseInputCategory("Geral");
    setIsAddingExpense(false);
    showNotification(`Despesa lançada com sucesso: "${newExpense.name}" (R$ ${amountVal.toFixed(2)}) 💸`, "success");
  };

  const handleDeleteCustomExpense = (id: string, name: string) => {
    setCustomExpenses(prev => prev.filter(item => item.id !== id));
    showNotification(`Despesa de "${name}" removida.`, "info");
  };

  // --- Handlers for Cash Drawer (Entrada/Saída de Caixa) ---
  const handleAddCashTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cashInputReason.trim()) {
      showNotification("Por favor, digite a justificativa ou origem da movimentação!", "error");
      return;
    }
    const amountVal = parsePortugueseNumber(cashInputAmount);
    if (amountVal <= 0) {
      showNotification("O valor da movimentação deve ser maior que zero!", "error");
      return;
    }

    const newTx: CashTransaction = {
      id: "cash_tx_" + Date.now(),
      type: cashInputType,
      amount: amountVal,
      reason: cashInputReason.trim().toUpperCase(),
      createdAt: new Date().toLocaleDateString("pt-BR") + " " + new Date().toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now()
    };

    setCashTransactions(prev => [newTx, ...prev]);
    setCashInputAmount("");
    setCashInputReason("");
    showNotification(
      newTx.type === "in" 
        ? `Suprimento de +${formatCurrency(amountVal)} ("${newTx.reason}") cadastrado com sucesso! 📥`
        : `Sangria de -${formatCurrency(amountVal)} ("${newTx.reason}") cadastrado com sucesso! 📤`,
      "success"
    );
  };

  const handleDeleteCashTransaction = (id: string, reason: string) => {
    setCashTransactions(prev => prev.filter(item => item.id !== id));
    showNotification(`Movimentação de caixa "${reason}" excluída.`, "info");
  };

  const handleStartEditingCashTransaction = (tx: CashTransaction) => {
    setEditingCashTxId(tx.id);
    setEditingCashReason(tx.reason);
    setEditingCashAmount(tx.amount.toString().replace(".", ","));
    setEditingCashType(tx.type);
  };

  const handleSaveEditedCashTransaction = (id: string) => {
    if (!editingCashReason.trim()) {
      showNotification("Por favor, digite a justificativa!", "error");
      return;
    }
    const val = parsePortugueseNumber(editingCashAmount);
    if (val <= 0) {
      showNotification("O valor deve ser maior que zero!", "error");
      return;
    }

    setCashTransactions(prev => prev.map(tx => {
      if (tx.id === id) {
        return {
          ...tx,
          reason: editingCashReason.trim().toUpperCase(),
          amount: val,
          type: editingCashType
        };
      }
      return tx;
    }));

    setEditingCashTxId(null);
    showNotification("Lançamento de caixa atualizado com sucesso! 📝", "success");
  };

  // --- Handlers for Restocking List (Reposição de Estoque) ---
  const handleAddRestockItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRestockName.trim()) {
      showNotification("Por favor, digite o nome do item a repor! 👗", "error");
      return;
    }
    
    const priceNum = parsePortugueseNumber(newRestockPrice);

    const newItem: RestockItem = {
      id: "restock_" + Date.now(),
      name: newRestockName.trim().toUpperCase(),
      desiredQty: Math.max(1, newRestockQty),
      priority: newRestockPriority,
      estimatedPrice: priceNum,
      notes: newRestockNotes.trim(),
      status: "pending",
      createdAt: new Date().toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      })
    };

    setRestockItems(prev => [newItem, ...prev]);

    // Reset inputs
    setNewRestockName("");
    setNewRestockQty(1);
    setNewRestockPriority("medium");
    setNewRestockPrice("");
    setNewRestockNotes("");
    setIsAddingRestock(false);

    showNotification("Novo item adicionado à lista de reposição! 📝🛍️", "success");
  };

  const handleToggleRestockStatus = (id: string) => {
    setRestockItems(prev => prev.map(item => {
      if (item.id === id) {
        const nextStatus: Record<string, "pending" | "ordered" | "completed"> = {
          "pending": "ordered",
          "ordered": "completed",
          "completed": "pending"
        };
        const newStatus = nextStatus[item.status] || "pending";
        return { ...item, status: newStatus };
      }
      return item;
    }));
  };

  const handleDeleteRestockItem = (id: string, name: string) => {
    setRestockItems(prev => prev.filter(item => item.id !== id));
    showNotification(`Item "${name}" removido da reposição.`, "success");
  };

  const handleConvertRestockToExpense = (item: RestockItem) => {
    const supplierName = `REPOSIÇÃO ESTOQUE - ${item.name.toUpperCase()}`;
    const newSupplier: BrechoClient = {
      id: "client_" + Date.now(),
      name: supplierName,
      notes: item.notes || "Convertido automaticamente da lista de reposição de estoque.",
      amountPaid: item.estimatedPrice * item.desiredQty, // Assume fully paid
      clientType: "supplier",
      createdAt: new Date().toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      }),
      items: [
        {
          id: "item_" + Date.now(),
          name: `${item.name} (${item.desiredQty} un)`.toUpperCase(),
          quantity: item.desiredQty,
          price: item.estimatedPrice,
          delivered: true
        }
      ]
    };

    setClients(prev => [newSupplier, ...prev]);
    
    // Update restock item status to completed
    setRestockItems(prev => prev.map(r => {
      if (r.id === item.id) {
        return { ...r, status: "completed" };
      }
      return r;
    }));

    showNotification(`Sucesso! "${item.name}" foi lançado como despesa/saída! 💳💰`, "success");
  };

  const handleUpdateMonthlyGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parsePortugueseNumber(goalEditingInput);
    if (val <= 0) {
      showNotification("Por favor, digite um valor de meta maior que zero!", "error");
      return;
    }
    setMonthlyGoal(val);
    setIsEditingGoal(false);
    showNotification(`Meta de faturamento mensal atualizada para R$ ${val.toFixed(2)} 🎯`, "success");
  };

  // Sync mobileView when selectedClientId changes
  useEffect(() => {
    if (selectedClientId) {
      setMobileView("details");
    } else {
      setMobileView("list");
    }
  }, [selectedClientId]);

  // Form states for adding a client
  const [newClientName, setNewClientName] = useState("");
  const [newClientType, setNewClientType] = useState<"buyer" | "supplier">("buyer");
  const [isAddingClient, setIsAddingClient] = useState(false);

  // Emitente details states for Receipt commercialization value
  const [emitenteNome, setEmitenteNome] = useState(() => { try { return localStorage.getItem("notepad_emitente_nome") || ""; } catch { return ""; } });
  const [emitenteCnpjCpf, setEmitenteCnpjCpf] = useState(() => { try { return localStorage.getItem("notepad_emitente_id") || ""; } catch { return ""; } });
  const [emitenteTelefone, setEmitenteTelefone] = useState(() => { try { return localStorage.getItem("notepad_emitente_tel") || ""; } catch { return ""; } });
  const [emitenteEndereco, setEmitenteEndereco] = useState(() => { try { return localStorage.getItem("notepad_emitente_end") || ""; } catch { return ""; } });
  const [showEmitenteConfig, setShowEmitenteConfig] = useState(false);

  const handleSaveEmitente = () => {
    localStorage.setItem("notepad_emitente_nome", emitenteNome);
    localStorage.setItem("notepad_emitente_id", emitenteCnpjCpf);
    localStorage.setItem("notepad_emitente_tel", emitenteTelefone);
    localStorage.setItem("notepad_emitente_end", emitenteEndereco);
    setShowEmitenteConfig(false);
    showNotification("Dados comerciais do emissor salvos! 🧾", "success");
  };

  // Form states for adding a sale item
  const [itemName, setItemName] = useState("");
  const [itemQty, setItemQty] = useState(1);
  const [itemPrice, setItemPrice] = useState("");
  
  // Client note editor local state
  const [clientNotes, setClientNotes] = useState("");

  // Edit client name modal state
  const [isEditingClientName, setIsEditingClientName] = useState(false);
  const [editedClientName, setEditedClientName] = useState("");
  const [inlineEditingClientId, setInlineEditingClientId] = useState<string | null>(null);
  const [inlineEditedName, setInlineEditedName] = useState("");

  // Summary and Detail modal state
  const [summaryClientId, setSummaryClientId] = useState<string | null>(null);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);

  // Load client-specific note when active client changes
  const activeClient = useMemo(() => {
    return clients.find(c => c.id === selectedClientId);
  }, [selectedClientId, clients]);

  // Load summary-specific client
  const summaryClient = useMemo(() => {
    return clients.find(c => c.id === summaryClientId);
  }, [summaryClientId, clients]);

  // Sync clientNotes state when active client changes without side effects in useMemo
  useEffect(() => {
    if (activeClient) {
      setClientNotes(activeClient.notes || "");
    } else {
      setClientNotes("");
    }
  }, [selectedClientId, activeClient?.notes]);

  // Self-contained Calculator States
  const [calcDisplay, setCalcDisplay] = useState("0");
  const [calcExpression, setCalcExpression] = useState("");
  const [isCalcResult, setIsCalcResult] = useState(false);

  // States for payment reminder / agenda events
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderDate, setReminderDate] = useState(() => {
    const today = new Date();
    today.setDate(today.getDate() + 1); // Default to tomorrow
    return today.toISOString().split("T")[0];
  });
  const [reminderTime, setReminderTime] = useState("10:00");
  const [reminderAmount, setReminderAmount] = useState("");

  // Dynamically prefill reminder title and outstanding amount on client selection changes
  useEffect(() => {
    if (activeClient) {
      setReminderTitle(`Cobrar ${activeClient.name} (Recibo)`);
      const totalDue = activeClient.items.reduce((acc, item) => acc + ((Number(item.price) || 0) * (Number(item.quantity) || 0)), 0);
      const outstanding = totalDue - (Number(activeClient.amountPaid) || 0);
      setReminderAmount(outstanding > 0 ? outstanding.toString() : "");
    }
  }, [selectedClientId, activeClient]);

  // --- Estados de Edição Direta dos Painéis (Total, Pago, Pendente) ---
  const [isEditingCardTotal, setIsEditingCardTotal] = useState(false);
  const [cardTotalInput, setCardTotalInput] = useState("");
  
  const [isEditingCardPaid, setIsEditingCardPaid] = useState(false);
  const [cardPaidInput, setCardPaidInput] = useState("");
  
  const [isEditingCardPending, setIsEditingCardPending] = useState(false);
  const [cardPendingInput, setCardPendingInput] = useState("");

  const startEditingTotal = () => {
    if (!activeClient) return;
    setCardTotalInput(activeCustomerSums.total.toFixed(2).replace(".", ","));
    setIsEditingCardTotal(true);
  };

  const startEditingPaid = () => {
    if (!activeClient) return;
    setCardPaidInput(activeCustomerSums.paid.toFixed(2).replace(".", ","));
    setIsEditingCardPaid(true);
  };

  const startEditingPending = () => {
    if (!activeClient) return;
    setCardPendingInput(activeCustomerSums.pending.toFixed(2).replace(".", ","));
    setIsEditingCardPending(true);
  };

  const handleUpdateTotalDirectly = (valueStr: string) => {
    if (!selectedClientId) return;
    const cleanNum = parsePortugueseNumber(valueStr);
    if (cleanNum < 0) return;
    
    setClients(prev => {
      return prev.map(c => {
        if (c.id === selectedClientId) {
          if (c.items.length <= 1) {
            const firstItem = c.items[0];
            return {
              ...c,
              items: [{
                id: firstItem?.id || "item_manual_" + Date.now(),
                name: firstItem?.name || "Produto / Serviço",
                quantity: 1,
                price: cleanNum,
                delivered: firstItem?.delivered || false
              }]
            };
          } else {
            return {
              ...c,
              items: [{
                id: "item_manual_" + Date.now(),
                name: "Itens (Total Unificado)",
                quantity: 1,
                price: cleanNum,
                delivered: false
              }]
            };
          }
        }
        return c;
      });
    });
    showNotification("Total dos itens atualizado com sucesso! 🧾", "success");
  };

  const handleSaveCardPending = (valueStr: string) => {
    if (!selectedClientId) return;
    const cleanResta = parsePortugueseNumber(valueStr);
    const currentTotal = activeCustomerSums.total;
    const newPaid = Math.max(0, currentTotal - cleanResta);
    
    setClients(prev => prev.map(c => {
      if (c.id === selectedClientId) {
        return {
          ...c,
          amountPaid: newPaid
        };
      }
      return c;
    }));
    showNotification("Valor restante e já pago ajustados com sucesso!", "success");
  };

  // Handler to push reminder to Agenda
  const handleScheduleReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddAgendaEvent) {
      showNotification("Sincronizador da agenda indisponível.", "error");
      return;
    }
    if (!isLoggedIn) {
      showNotification("Por favor, faça login no topo do aplicativo para poder agendar lembretes!", "error");
      return;
    }
    if (!reminderTitle.trim()) {
      showNotification("Por favor, insira um título para o lembrete.", "error");
      return;
    }

    try {
      const [year, month, day] = reminderDate.split("-").map(Number);
      const [hours, minutes] = reminderTime.split(":").map(Number);
      const targetDate = new Date(year, month - 1, day, hours, minutes, 0, 0);

      if (isNaN(targetDate.getTime())) {
        showNotification("Data ou hora inválida.", "error");
        return;
      }

      const parsedAmt = parseFloat(reminderAmount) || 0;

      await onAddAgendaEvent({
        title: reminderTitle.trim(),
        amount: parsedAmt,
        type: "payment_received",
        date: targetDate,
        status: "pending",
        description: `Lembrete de cobrança para ${activeClient?.name} referente ao Recibo/Orçamento comercial.`
      });

      showNotification(`Lembrete de pagamento agendado para "${activeClient?.name}"!`, "success");
    } catch (err) {
      showNotification("Ocorreu um erro ao inserir o agendamento.", "error");
    }
  };

  // Handle client notes save
  const handleSaveNotes = () => {
    if (!selectedClientId) return;
    setClients(prev => prev.map(c => {
      if (c.id === selectedClientId) {
        return { ...c, notes: clientNotes };
      }
      return c;
    }));
    showNotification("Informações salvas com sucesso!", "success");
    setSelectedClientId(null);
    setMobileView("list");
  };

  // Create new client
  const handleCreateClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) {
      showNotification("Por favor, digite o nome do registro.", "error");
      return;
    }

    const newClient: BrechoClient = {
      id: "client_" + Date.now(),
      name: newClientName.trim(),
      notes: "",
      items: [],
      amountPaid: 0,
      clientType: newClientType,
      createdAt: new Date().toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      })
    };

    setClients(prev => [newClient, ...prev]);
    setSelectedClientId(newClient.id);
    setSearchQuery(""); // Clear search query to prevent filtering out the new client
    setNewClientName("");
    setNewClientType("buyer");
    setIsAddingClient(false);
    showNotification(`Registro "${newClient.name}" criado com sucesso!`, "success");
  };

  // Delete client
  const handleDeleteClient = (id: string, name: string) => {
    setDeleteDialog({
      isOpen: true,
      clientId: id,
      clientName: name,
    });
  };

  const executeDeleteClient = () => {
    const { clientId, clientName } = deleteDialog;
    if (!clientId) return;
    setClients(prev => prev.filter(c => c.id !== clientId));
    if (selectedClientId === clientId) {
      setSelectedClientId(null);
    }
    showNotification(`Cliente "${clientName}" excluído.`, "success");
    setDeleteDialog({ isOpen: false, clientId: "", clientName: "" });
  };

  // Edit client name
  const handleRenameClient = () => {
    if (!selectedClientId || !editedClientName.trim()) return;
    setClients(prev => prev.map(c => {
      if (c.id === selectedClientId) {
        return { ...c, name: editedClientName.trim() };
      }
      return c;
    }));
    setIsEditingClientName(false);
    showNotification("Nome alterado com sucesso!", "success");
  };

  // Edit client name inline from card list
  const handleInlineRenameClient = (id: string, nameToSave: string) => {
    if (!nameToSave.trim()) return;
    setClients(prev => prev.map(c => {
      if (c.id === id) {
        return { ...c, name: nameToSave.trim() };
      }
      return c;
    }));
    setInlineEditingClientId(null);
    showNotification("Nome alterado com sucesso!", "success");
  };

  // Add Item to Client Purchases
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) return;
    if (!itemName.trim()) {
      showNotification("Por favor, informe a descrição ou nome do produto ou serviço.", "error");
      return;
    }

    const priceNum = parsePortugueseNumber(itemPrice);
    if (priceNum <= 0) {
      showNotification("Por favor, informe o valor unitário do item.", "error");
      return;
    }

    const newItem: BrechoItem = {
      id: "item_" + Date.now(),
      name: itemName.trim(),
      quantity: Math.max(1, Number(itemQty) || 1),
      price: priceNum,
      delivered: false // Por padrão, não entregue
    };

    setClients(prev => prev.map(c => {
      if (c.id === selectedClientId) {
        return {
          ...c,
          items: [...c.items, newItem]
        };
      }
      return c;
    }));

    // Reset inputs
    setItemName("");
    setItemQty(1);
    setItemPrice("");
    showNotification("Item adicionado com sucesso!", "success");
  };

  // Toggle Delivery item ("marcar quadrado OK")
  const handleToggleDelivery = (itemId: string) => {
    if (!selectedClientId) return;
    setClients(prev => prev.map(c => {
      if (c.id === selectedClientId) {
        return {
          ...c,
          items: c.items.map(item => {
            if (item.id === itemId) {
              const nextVal = !item.delivered;
              showNotification(
                nextVal ? `"${item.name}" marcado como ENTREGUE ✓` : `"${item.name}" marcado como NÃO ENTREGUE`, 
                "info"
              );
              return { ...item, delivered: nextVal };
            }
            return item;
          })
        };
      }
      return c;
    }));
  };

  // Delete purchased item
  const handleDeleteItem = (itemId: string, name: string) => {
    if (!selectedClientId) return;
    setClients(prev => prev.map(c => {
      if (c.id === selectedClientId) {
        return {
          ...c,
          items: c.items.filter(item => item.id !== itemId)
        };
      }
      return c;
    }));
    showNotification(`Item "${name}" removido do caderno.`, "success");
  };

  // Update item quantity directly from the spreadsheet (allowing zero)
  const handleUpdateItemQty = (itemId: string, newQty: number) => {
    if (!selectedClientId) return;
    const sanitizedQty = Math.max(0, newQty);
    setClients(prev => prev.map(c => {
      if (c.id === selectedClientId) {
        return {
          ...c,
          items: c.items.map(item => {
            if (item.id === itemId) {
              return { ...item, quantity: sanitizedQty };
            }
            return item;
          })
        };
      }
      return c;
    }));
  };

  // Update item name directly from the spreadsheet
  const handleUpdateItemName = (itemId: string, newName: string) => {
    if (!selectedClientId) return;
    setClients(prev => prev.map(c => {
      if (c.id === selectedClientId) {
        return {
          ...c,
          items: c.items.map(item => {
            if (item.id === itemId) {
              return { ...item, name: newName };
            }
            return item;
          })
        };
      }
      return c;
    }));
  };

  // Update item price directly from the spreadsheet
  const handleUpdateItemPrice = (itemId: string, newPriceStr: string) => {
    if (!selectedClientId) return;
    const cleanNum = parsePortugueseNumber(newPriceStr);
    setClients(prev => prev.map(c => {
      if (c.id === selectedClientId) {
        return {
          ...c,
          items: c.items.map(item => {
            if (item.id === itemId) {
              return { ...item, price: cleanNum };
            }
            return item;
          })
        };
      }
      return c;
    }));
  };

  // Update client's payment amount ("valor que pagou")
  const handleUpdatePayment = (amountStr: string) => {
    if (!selectedClientId) return;
    const cleanNum = parsePortugueseNumber(amountStr);
    
    setClients(prev => prev.map(c => {
      if (c.id === selectedClientId) {
        return { ...c, amountPaid: cleanNum };
      }
      return c;
    }));
  };

  // Quick action to set client paid fully
  const handleSetPaidFully = (totalAmount: number) => {
    if (!selectedClientId) return;
    setClients(prev => prev.map(c => {
      if (c.id === selectedClientId) {
        return { ...c, amountPaid: totalAmount };
      }
      return c;
    }));
    showNotification("Marcado como Pago Total! Excelente!", "success");
  };

  // Filter clients based on search query
  const filteredClients = useMemo(() => {
    return clients.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [clients, searchQuery]);

  // --- Excel dashboard summary metrics (across all clients) ---
  const globalSummary = useMemo(() => {
    let buyerSales = 0;
    let buyerPaid = 0;
    let buyerPendingSum = 0;

    let supplierCost = 0;
    let supplierPaid = 0;
    let supplierPendingSum = 0;
    
    clients.forEach(c => {
      const clientTotal = c.items.reduce((acc, item) => acc + ((Number(item.price) || 0) * (Number(item.quantity) || 0)), 0);
      const paid = Number(c.amountPaid) || 0;
      const remains = clientTotal - paid;

      if (c.clientType === "supplier") {
        supplierCost += clientTotal;
        supplierPaid += paid;
        if (remains > 0) {
          supplierPendingSum += remains;
        }
      } else {
        buyerSales += clientTotal;
        buyerPaid += paid;
        if (remains > 0) {
          buyerPendingSum += remains;
        }
      }
    });

    return {
      buyerSales,
      buyerPaid,
      buyerPending: buyerPendingSum,
      supplierCost,
      supplierPaid,
      supplierPending: supplierPendingSum,
      activeClientsCount: clients.length
    };
  }, [clients]);

  // Sums for active customer
  const activeCustomerSums = useMemo(() => {
    const currentActive = clients.find(c => c.id === selectedClientId);
    if (!currentActive) return { total: 0, paid: 0, pending: 0, piecesCount: 0 };
    const total = currentActive.items.reduce((acc, item) => acc + ((Number(item.price) || 0) * (Number(item.quantity) || 0)), 0);
    const paid = Number(currentActive.amountPaid) || 0;
    const pending = total - paid;
    const piecesCount = currentActive.items.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);

    return {
      total,
      paid,
      pending,
      piecesCount
    };
  }, [selectedClientId, clients]);

  // --- Digital Calculator Panel Logic ---
  const handleCalcPress = (btn: string) => {
    if (btn === "C") {
      setCalcDisplay("0");
      setCalcExpression("");
      setIsCalcResult(false);
    } else if (btn === "DEL") {
      if (isCalcResult) {
        setCalcDisplay("0");
        setCalcExpression("");
        setIsCalcResult(false);
      } else {
        if (calcDisplay.length > 1) {
          setCalcDisplay(calcDisplay.slice(0, -1));
        } else {
          setCalcDisplay("0");
        }
      }
    } else if (["+", "-", "*", "/"].includes(btn)) {
      setCalcExpression(calcDisplay + " " + btn + " ");
      setCalcDisplay("0");
      setIsCalcResult(false);
    } else if (btn === "=") {
      if (!calcExpression) return;
      try {
        const fullExpr = calcExpression + calcDisplay;
        // Simple secure parsing wrapper replacing 'x' with '*' if exists
        const sanitized = fullExpr.replace(/x/g, "*").replace(/,/g, ".");
        // Basic calculation parsing or Function wrapper
        // Since we are running isolated simple calculator digits, simple Function constructor is safe and standard
        const evaluated = new Function(`return (${sanitized})`)();
        
        const floatRes = parseFloat(evaluated);
        if (!isNaN(floatRes)) {
          const formatted = parseFloat(floatRes.toFixed(2)).toString().replace(".", ",");
          setCalcDisplay(formatted);
          setCalcExpression(fullExpr + " =");
          setIsCalcResult(true);
        } else {
          setCalcDisplay("Erro");
        }
      } catch {
        setCalcDisplay("Erro");
      }
    } else {
      // Numbers, commas or '00' double zeros
      const digitInput = btn;
      if (isCalcResult) {
        if (digitInput === ",") {
          setCalcDisplay("0,");
        } else if (digitInput === "00") {
          setCalcDisplay("0");
        } else {
          setCalcDisplay(digitInput);
        }
        setCalcExpression("");
        setIsCalcResult(false);
      } else {
        if (calcDisplay === "0" && digitInput !== ",") {
          if (digitInput === "00" || digitInput === "0") {
            // keep as static "0"
          } else {
            setCalcDisplay(digitInput);
          }
        } else {
          // Prevent multiple commas
          if (digitInput === "," && calcDisplay.includes(",")) return;
          setCalcDisplay(prev => prev + digitInput);
        }
      }
    }
  };

  // Transfer values from calculator
  const useCalcValueForPrice = () => {
    const rawVal = calcDisplay.replace(",", ".");
    const valFloat = parseFloat(rawVal);
    if (!isNaN(valFloat) && valFloat > 0) {
      setItemPrice(valFloat.toString());
      showNotification(`R$ ${calcDisplay} inserido no preço da roupa!`, "success");
    } else {
      showNotification("Calculadora não possui um valor válido maior que 0.", "error");
    }
  };

  const useCalcValueForPayment = () => {
    const rawVal = calcDisplay.replace(",", ".");
    const valFloat = parseFloat(rawVal);
    if (!isNaN(valFloat) && activeClient) {
      handleUpdatePayment(valFloat.toString());
      showNotification(`R$ ${calcDisplay} inserido no valor pago!`, "success");
    } else {
      showNotification("Selecione um cliente e garanta que o resultado seja numérico.", "error");
    }
  };

  // --- Copy Summary Builder ---
  const handleCopySummary = (client: BrechoClient) => {
    try {
      const totalDue = client.items.reduce((acc, item) => acc + ((Number(item.price) || 0) * (Number(item.quantity) || 0)), 0);
      const outstanding = totalDue - (Number(client.amountPaid) || 0);
      const totalPieces = client.items.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);
      
      let itemsText = "";
      if (client.items.length === 0) {
        itemsText = "• Nenhuma peça registrada ainda.\n";
      } else {
        client.items.forEach(item => {
          const status = item.delivered ? "✓ OK / Entregue" : "⏳ Pendente entregar";
          itemsText += `• ${item.quantity}x ${item.name} - ${formatCurrency(item.price * item.quantity)} (${status})\n`;
        });
      }

      const notesText = client.notes && client.notes.trim() !== "" 
        ? client.notes.trim() 
        : "Nenhuma anotação geral ainda.";

      const isSupplier = client.clientType === "supplier";

      const shareText = `📝 *RESUMO DA NOTINHA COMERCIAL*\n` +
        `👤 *${isSupplier ? "Área de Pagamentos (Eu Devo)" : "Área de Recebimentos (A Receber)"}:* ${client.name.toUpperCase()}\n` +
        `📅 *Registrado em:* ${client.createdAt}\n` +
        `-----------------------------------------\n\n` +
        `📦 *${isSupplier ? "ITENS A PAGAR / GASTOS" : "ITENS DO ORÇAMENTO / VENDAS"} (${totalPieces} ${totalPieces === 1 ? 'item' : 'itens'}):*\n` +
        `${itemsText}\n` +
        `💰 *SITUAÇÃO FINANCEIRA:*\n` +
        `• Valor Total: ${formatCurrency(totalDue)}\n` +
        `• ${isSupplier ? "Total Pago por Mim" : "Valor Recebido (Sinal)"}: ${formatCurrency(Number(client.amountPaid) || 0)}\n` +
        `• ${isSupplier ? "EU DEVO PAGAR" : "RESTANTE A RECEBER"}: ${outstanding <= 0 ? "QUITADO ✓" : formatCurrency(outstanding)}\n\n` +
        `✍️ *ANOTAÇÕES & OBSERVAÇÕES SALVAS:*\n` +
        `"${notesText}"\n\n` +
        `_Organização com Bloquinho Digital 📱_`;

      navigator.clipboard.writeText(shareText);
      showNotification("Resumo geral copiado para a área de transferência! Prontinho para colar.", "success");
    } catch (err) {
      console.error(err);
      showNotification("Não foi possível copiar o texto automaticamente.", "error");
    }
  };

  // --- Whatsapp Complete Summary Share ---
  const handleShareCompleteWhatsApp = (client: BrechoClient) => {
    try {
      const totalDue = client.items.reduce((acc, item) => acc + ((Number(item.price) || 0) * (Number(item.quantity) || 0)), 0);
      const outstanding = totalDue - (Number(client.amountPaid) || 0);
      const totalPieces = client.items.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);
      
      let itemsText = "";
      if (client.items.length === 0) {
        itemsText = "• Nenhuma peça registrada ainda.\n";
      } else {
        client.items.forEach(item => {
          const status = item.delivered ? "✓ OK / Entregue" : "⏳ Pendente entregar";
          itemsText += `• ${item.quantity}x ${item.name} - ${formatCurrency(item.price * item.quantity)} (${status})\n`;
        });
      }

      const notesText = client.notes && client.notes.trim() !== "" 
        ? client.notes.trim() 
        : "Nenhuma anotação geral ainda.";

      const isSupplier = client.clientType === "supplier";

      const textMsg = `📝 *RESUMO DA NOTINHA COMERCIAL*\n` +
        `👤 *${isSupplier ? "Área de Pagamentos (Eu Devo)" : "Área de Recebimentos (A Receber)"}:* ${client.name.toUpperCase()}\n` +
        `📅 *Registrado em:* ${client.createdAt}\n` +
        `-----------------------------------------\n\n` +
        `📦 *${isSupplier ? "ITENS A PAGAR / GASTOS" : "ITENS DO ORÇAMENTO / VENDAS"} (${totalPieces} ${totalPieces === 1 ? 'item' : 'itens'}):*\n` +
        `${itemsText}\n` +
        `💰 *SITUAÇÃO FINANCEIRA:*\n` +
        `• Valor Total: ${formatCurrency(totalDue)}\n` +
        `• ${isSupplier ? "Total Pago por Mim" : "Valor Recebido (Sinal)"}: ${formatCurrency(Number(client.amountPaid) || 0)}\n` +
        `• ${isSupplier ? "EU DEVO PAGAR" : "RESTANTE A RECEBER"}: ${outstanding <= 0 ? "QUITADO ✓" : formatCurrency(outstanding)}\n\n` +
        `✍️ *ANOTAÇÕES & OBSERVAÇÕES SALVAS:*\n` +
        `"${notesText}"\n\n` +
        `_Organização com Bloquinho Digital 📱_`;

      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(textMsg)}`, "_blank");
      showNotification("Compartilhamento do resumo completo enviado para o WhatsApp!", "success");
    } catch (err) {
      console.error(err);
      showNotification("Não foi possível enviar para o WhatsApp.", "error");
    }
  };

  // --- Whatsapp Share Builder ---
  const handleShareWhatsApp = () => {
    if (!activeClient) return;

    let itemsText = "";
    activeClient.items.forEach(item => {
      const deliveryStatus = item.delivered ? "✓ OK / Entregue" : "⏳ Não Entregue";
      itemsText += `• ${item.quantity}x ${item.name} - ${formatCurrency(item.price * item.quantity)} (${deliveryStatus})\n`;
    });

    if (activeClient.items.length === 0) {
      itemsText = "Nenhum item cadastrado no momento.\n";
    }

    const { total, paid, pending } = activeCustomerSums;
    
    const isSupplier = activeClient.clientType === "supplier";

    const paymentStatus = pending <= 0 
      ? `✅ *${isSupplier ? "TOTALMENTE PAGO POR MIM" : "RECEBIDO TOTALMENTE"}*` 
      : `⚠️ *${isSupplier ? "RESTANTE QUE DEVO PAGAR" : "RESTANTE A RECEBER"}:* Resta ${formatCurrency(pending)}`;

    const emitenteHeader = emitenteNome.trim() 
      ? `*EMISSOR:* ${emitenteNome.trim()}
${emitenteCnpjCpf.trim() ? `*CPF/CNPJ:* ${emitenteCnpjCpf.trim()}\n` : ""}${emitenteTelefone.trim() ? `*CONTATO:* ${emitenteTelefone.trim()}\n` : ""}${emitenteEndereco.trim() ? `*ENDEREÇO:* ${emitenteEndereco.trim()}\n` : ""}--------------------------------------\n`
      : "";

    const textMsg = 
`🧾 *ORÇAMENTO & RECIBO COMERCIAL*
--------------------------------------
${emitenteHeader}*${isSupplier ? "Área de Pagamentos (Eu Devo)" : "Área de Recebimentos (A Receber)"}:* ${activeClient.name}
*Data da Transação:* ${activeClient.createdAt}

*RELAÇÃO DOS ITENS:*
${itemsText}
--------------------------------------
*RESUMO FINANCEIRO:*
💵 *Valor Total:* ${formatCurrency(total)}
💳 *${isSupplier ? "Pago por mim" : "Valor Recebido (Sinal)"}:* ${formatCurrency(paid)}
💰 ${paymentStatus}

*Observações:* ${activeClient.notes ? activeClient.notes : "Nenhuma."}
--------------------------------------
${emitenteNome.trim() ? `Obrigado por sua preferência e confiança! ❤️` : `Emitido via Bloquinho Digital Cérebro Inteligente`} `;

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(textMsg)}`, "_blank");
    showNotification("Compartilhamento do extrato enviado para o WhatsApp!", "success");
  };

  // --- PDF Extrato Generator ---
  const handleDownloadPDF = (shareOnly: boolean = false) => {
    if (!activeClient) return;

    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      // Background accent
      doc.setFillColor(15, 23, 42); // slate 900
      doc.rect(0, 0, 210, 42, "F");

      // Title
      doc.setTextColor(244, 63, 94); // rose-500
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      
      const titleText = emitenteNome.trim() ? emitenteNome.toUpperCase() : "RECIBO & ORÇAMENTO COMERCIAL";
      doc.text(titleText, 15, 18);

      doc.setTextColor(226, 232, 240); // slate-200
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      
      const subTitleText = emitenteNome.trim() 
        ? `${emitenteCnpjCpf.trim() ? `CNPJ/CPF: ${emitenteCnpjCpf} | ` : ""}${emitenteTelefone.trim() ? `Tel: ${emitenteTelefone}` : ""}`
        : "BLOQUINHO DIGITAL DE ORÇAMENTOS E RECIBOS PARA PEQUENOS NEGÓCIOS";
      doc.text(subTitleText, 15, 26);

      if (emitenteNome.trim() && emitenteEndereco.trim()) {
        doc.text(`Endereço: ${emitenteEndereco}`, 15, 32);
      } else {
        doc.text("Controle de Vendas, Aluguel, Serviços, Orçamentos e Recibos de Pagamento", 15, 32);
      }

      // Date of report (including precise date & hour)
      const reportDate = new Date().toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
      doc.setTextColor(148, 163, 184); // slate-400
      doc.setFontSize(8);
      doc.text(`Emissão: ${reportDate}`, 150, 15);

      let y = 56;
      
      const isSupplier = activeClient.clientType === "supplier";

      // Client Header Section
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(isSupplier ? "DADOS DO FORNECEDOR / BENEFICIÁRIO" : "DADOS DO CLIENTE / PAGADOR", 15, y);

      doc.setDrawColor(244, 63, 94); // rose border
      doc.setLineWidth(0.5);
      doc.line(15, y + 2, 195, y + 2);

      y += 10;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(isSupplier ? "Fornecedor / Sócio:" : "Cliente / Pagador:", 15, y);
      doc.setFont("helvetica", "bold");
      doc.text(activeClient.name.toUpperCase(), 48, y);

      doc.setFont("helvetica", "normal");
      doc.text("Data do Registro:", 125, y);
      doc.setFont("helvetica", "bold");
      doc.text(activeClient.createdAt, 158, y);

      // Table Relation
      y += 16;
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(isSupplier ? "RELAÇÃO DOS ITENS FORNECIDOS / SAÍDAS" : "RELAÇÃO DOS PRODUTOS / SERVIÇOS / ORÇAMENTOS", 15, y);

      y += 4;
      // Header Table BG
      doc.setFillColor(241, 245, 249);
      doc.rect(15, y, 180, 8, "F");

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.rect(15, y, 180, 8, "S");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text("PRODUTO / SERVIÇO / DESCRIÇÃO", 18, y + 5.5);
      doc.text("QTD", 112, y + 5.5);
      doc.text("VALOR UNIT.", 128, y + 5.5);
      doc.text("VALOR TOTAL", 154, y + 5.5);
      doc.text("STATUS", 178, y + 5.5);

      y += 8;

      // Reset style for body
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);

      if (activeClient.items.length === 0) {
        doc.text("Nenhum item lançado no momento para este recibo comercial.", 18, y + 6);
        y += 12;
      } else {
        activeClient.items.forEach((item) => {
          doc.setDrawColor(241, 245, 249);
          doc.line(15, y + 8, 195, y + 8);

          doc.text(item.name.toUpperCase(), 18, y + 5);
          doc.text(`${item.quantity} un`, 112, y + 5);
          doc.text(formatCurrency(item.price), 128, y + 5);
          doc.text(formatCurrency(item.price * item.quantity), 154, y + 5);
          
          doc.setFont("helvetica", "bold");
          if (item.delivered) {
            doc.setTextColor(16, 185, 129); // green
            doc.text("✓ CONCLUÍDO", 178, y + 5);
          } else {
            doc.setTextColor(245, 158, 11); // orange/amber
            doc.text("⏳ PENDENTE", 178, y + 5);
          }
          doc.setFont("helvetica", "normal");
          doc.setTextColor(15, 23, 42);

          y += 8;

          // Page break check
          if (y > 250) {
            doc.addPage();
            y = 20;
          }
        });
      }

      // Financial breakdown
      const { total, paid, pending } = activeCustomerSums;

      y += 10;
      if (y > 220) {
        doc.addPage();
        y = 20;
      }

      // Summary sidebar right block
      doc.setFillColor(248, 250, 252);
      doc.rect(110, y, 85, 30, "F");
      doc.setDrawColor(226, 232, 240);
      doc.rect(110, y, 85, 30, "S");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text("Valor dos Itens:", 114, y + 7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(formatCurrency(total), 160, y + 7);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      doc.text("Valor Total Pago:", 114, y + 15);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(16, 185, 129);
      doc.text(formatCurrency(paid), 160, y + 15);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text("VALOR RESTANTE:", 114, y + 23);
      
      if (pending > 0) {
        doc.setTextColor(244, 63, 94); // rose-500 pending
        doc.text(formatCurrency(pending), 160, y + 23);
      } else if (pending < 0) {
        doc.setTextColor(16, 185, 129); // blue credit
        doc.text(formatCurrency(Math.abs(pending)) + " (Crédito)", 160, y + 23);
      } else {
        doc.setTextColor(16, 185, 129); // green paid
        doc.text("QUITADO ✓", 160, y + 23);
      }

      // Active Notes on Left
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text("OBSERVAÇÕES ADICIONAIS DO RECIBO:", 15, y + 7);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      const notesWrapped = doc.splitTextToSize(
        activeClient.notes ? activeClient.notes : "Nenhuma observação ou termo de recibo adicionado.",
        85
      );
      doc.text(notesWrapped, 15, y + 14);

      // Signature Area (mimicking old carbon paper booklets)
      y += 42;
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.5);
      doc.line(35, y, 175, y);
      
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      const signLabel = emitenteNome.trim() 
        ? `${emitenteNome.toUpperCase()} - EMISSOR RESPONSÁVEL`
        : "ASSINATURA DO EMISSOR / EMITENTE RESPONSÁVEL";
      doc.text(signLabel, 105, y + 5, { align: "center" });

      // Footer
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(15, 275, 195, 275);

      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text("Documento emitido digitalmente via Sistema de Notinha de Recibo & Orçamento Comercial! ❤️", 15, 281);

      const computedFilename = `recibo_comercial_${activeClient.name.toLowerCase().replace(/\s+/g, "_")}.pdf`;
      
      if (shareOnly) {
        if (navigator.share && navigator.canShare) {
          const pdfBlob = doc.output("blob");
          const file = new File([pdfBlob], computedFilename, { type: "application/pdf" });

          if (navigator.canShare({ files: [file] })) {
            navigator.share({
              files: [file],
              title: `Recibo de ${activeClient.name}`,
              text: `Recibo / Notinha comercial em PDF de ${activeClient.name}.`,
            })
            .then(() => showNotification("Notinha comercial compartilhada com sucesso! 📄✅", "success"))
            .catch((err) => {
              console.error(err);
              showNotification("Compartilhamento cancelado.", "info");
            });
          } else {
            showNotification("Este navegador não suporta compartilhamento direto de PDFs. Use o botão de download normal.", "error");
          }
        } else {
          showNotification("Seu navegador ou dispositivo não oferece suporte a compartilhamento (Share API). Use o botão de download normal.", "error");
        }
      } else {
        doc.save(computedFilename);
        showNotification("Notinha comercial baixada em PDF com sucesso!", "success");
      }
    } catch (err) {
      console.error(err);
      showNotification("Erro ao gerar ou compartilhar o documento PDF.", "error");
    }
  };

  const handleResetAllBrechoData = () => {
    setIsResetConfirmOpen(true);
  };

  const executeResetAllBrechoData = async () => {
    setIsResetConfirmOpen(false);
    try {
      // 1. Clear React clients state
      setClients([]);
      setSelectedClientId(null);
      
      // 2. Clear local storage keys
      const keyClients = userId ? `brecho_clients_user_${userId}` : `brecho_clients_guest`;
      const keySelected = userId ? `brecho_selected_client_id_user_${userId}` : `brecho_selected_client_id_guest`;
      localStorage.removeItem(keyClients);
      localStorage.removeItem(keySelected);

      // 3. Clear cloud document fields immediately
      if (userId && userId !== "guest_visitor" && db) {
        const docRef = doc(db, "userData", userId);
        await setDoc(docRef, {
          userId: userId,
          brechoClients: [],
          updatedAt: serverTimestamp()
        }, { merge: true });
      }

      showNotification("Orçamento de cálculos foi completamente zerado com sucesso!", "success");
    } catch (err) {
      console.error(err);
      showNotification("Ocorreu um erro ao zerar os dados.", "error");
    }
  };

  // --- INTERACTIVE INJECT HELPER FOR POINT OF SALE ---
  const injectItemToActiveLedger = (name: string, quantity: number, price: number) => {
    if (!selectedClientId) {
      showNotification("Por favor, selecione ou cadastre um contato na barra lateral esquerda primeiro!", "error");
      return false;
    }
    const newItem: BrechoItem = {
      id: "item_" + Date.now(),
      name: name,
      quantity: quantity,
      price: price,
      delivered: false
    };
    setClients(prev => prev.map(c => {
      if (c.id === selectedClientId) {
        return {
          ...c,
          items: [...c.items, newItem]
        };
      }
      return c;
    }));
    showNotification(`Lançado: "${name}" (${quantity} de ${formatCurrency(price)}) adicionado na Notinha! 🧾`, "success");
    return true;
  };

  // --- GARIMPO PIECES ACTIONS (BRECHÓ) ---
  const handleAddGarimpo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!garimpoName.trim()) {
      showNotification("Informe a descrição do garimpo.", "error");
      return;
    }
    const buy = parsePortugueseNumber(garimpoBuyCost);
    const sell = parsePortugueseNumber(garimpoSellPrice);
    if (buy <= 0 || sell <= 0) {
      showNotification("Insira valores maiores que R$ 0,00.", "error");
      return;
    }
    const newItem: GarimpoItem = {
      id: "gar_" + Date.now(),
      name: garimpoName.trim(),
      buyCost: buy,
      appraisedPrice: sell,
      size: garimpoSize,
      condition: garimpoCondition,
      status: "available",
      createdAt: new Date().toLocaleDateString("pt-BR")
    };
    setGarimpoItems(prev => [newItem, ...prev]);
    setGarimpoName("");
    setGarimpoBuyCost("");
    setGarimpoSellPrice("");
    showNotification("Peça de Garimpo curada com sucesso! ✨", "success");
  };

  const handleSellGarimpo = (item: GarimpoItem) => {
    const success = injectItemToActiveLedger(`${item.name} [Tam: ${item.size}] (${item.condition})`, 1, item.appraisedPrice);
    if (success) {
      setGarimpoItems(prev => prev.map(g => {
        if (g.id === item.id) {
          return { ...g, status: "sold" };
        }
        return g;
      }));
    }
  };

  const handleDeleteGarimpo = (id: string) => {
    setGarimpoItems(prev => prev.filter(g => g.id !== id));
    showNotification("Garimpo removido.", "info");
  };

  // --- PERISHABLE DATES (MERCADINHO) ---
  const handleAddPerishable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!perishableName.trim()) {
      showNotification("Insira o nome do perecível.", "error");
      return;
    }
    if (!perishableExpiry) {
      showNotification("Selecione a data de validade.", "error");
      return;
    }
    const newItem: PerishableItem = {
      id: "per_" + Date.now(),
      name: perishableName.trim(),
      code: perishableCode.trim() || String(Math.floor(100000 + Math.random() * 900000)),
      expiresAt: perishableExpiry,
      qty: perishableQty,
      alertDays: perishableAlertDays
    };
    setPerishables(prev => [newItem, ...prev]);
    setPerishableName("");
    setPerishableCode("");
    setPerishableExpiry("");
    setPerishableQty(1);
    showNotification("Lote de produto cadastrado no controle de vencimento. 📅", "success");
  };

  const handleDeletePerishable = (id: string) => {
    setPerishables(prev => prev.filter(p => p.id !== id));
    showNotification("Registro removido.", "info");
  };

  // --- FRESH BAKEY BATCHES (PADARIA) ---
  const handleAddBaking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bakingName.trim()) {
      showNotification("Informe o nome do item a assar.", "error");
      return;
    }
    const timeValue = bakingReadyTime || new Date(Date.now() + 30 * 60 * 1000).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const newItem: BakingBatch = {
      id: "bak_" + Date.now(),
      name: bakingName.trim(),
      qty: bakingQty,
      readyTime: timeValue,
      status: "preparando"
    };
    setBakingBatches(prev => [newItem, ...prev]);
    setBakingName("");
    setBakingReadyTime("");
    showNotification("Controle de fornada agendado! 👨‍🍳", "success");
  };

  const handleUpdateBakingStatus = (id: string, status: "preparando" | "quente" | "esgotado") => {
    setBakingBatches(prev => prev.map(b => {
      if (b.id === id) {
        return { ...b, status };
      }
      return b;
    }));
    const statusLabel = status === "quente" ? "QUENTINHO SAÍDO DO FORNO! 🔥" : status === "esgotado" ? "Esgotado!" : "Preparando...";
    showNotification(`Fornada atualizada para: ${statusLabel}`, "success");
  };

  const handleDeleteBaking = (id: string) => {
    setBakingBatches(prev => prev.filter(b => b.id !== id));
    showNotification("Fornada removida.", "info");
  };

  // --- PRODUCE LOSSES (SACOLÃO) ---
  const handleAddLoss = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lossName.trim()) {
      showNotification("Informe o vegetal/fruta perecido.", "error");
      return;
    }
    const weight = parsePortugueseNumber(lossWeight);
    const price = parsePortugueseNumber(lossCost);
    if (weight <= 0 || price <= 0) {
      showNotification("Insira valores válidos acima de zero.", "error");
      return;
    }
    const newItem: ProduceLoss = {
      id: "loss_" + Date.now(),
      name: lossName.trim(),
      weightKg: weight,
      costLoss: price * weight,
      status: "lost",
      createdAt: new Date().toLocaleDateString("pt-BR")
    };
    setProduceLosses(prev => [newItem, ...prev]);
    setLossName("");
    setLossWeight("");
    setLossCost("");
    showNotification("Anotação de desperdício registrada na perda. 🥕", "success");
  };

  const handleDeleteLoss = (id: string) => {
    setProduceLosses(prev => prev.filter(l => l.id !== id));
    showNotification("Descarte removido.", "info");
  };

  // --- MEAT DEBONING REDIS (AÇOUGUE) ---
  const handleAddDeboning = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = parsePortugueseNumber(deboningRawWeight);
    const lean = parsePortugueseNumber(deboningLeanWeight);
    const bone = parsePortugueseNumber(deboningBoneWeight);
    const cost = parsePortugueseNumber(deboningRawCost);
    if (raw <= 0 || lean <= 0 || cost <= 0) {
      showNotification("Insira pesos e custos reais de desossa.", "error");
      return;
    }
    const totalSpent = raw * cost;
    const usableCost = totalSpent / lean;
    const newItem: DeboningLog = {
      id: "deb_" + Date.now(),
      date: new Date().toLocaleDateString("pt-BR"),
      rawWeight: raw,
      leanWeight: lean,
      boneWeight: bone || (raw - lean),
      rawCost: cost,
      adjustedUsableCost: usableCost
    };
    setDeboningLogs(prev => [newItem, ...prev]);
    setDeboningRawWeight("");
    setDeboningLeanWeight("");
    setDeboningBoneWeight("");
    setDeboningRawCost("");
    showNotification("Processo de desossa arquivado! Custo corrigido calculado. 🥩", "success");
  };

  const handleDeleteDeboning = (id: string) => {
    setDeboningLogs(prev => prev.filter(d => d.id !== id));
    showNotification("Relatório de rendimento removido.", "info");
  };

  return (
    <motion.div
      key="brecho-sales"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="p-6 md:p-8 space-y-6 bg-slate-950 text-slate-100 min-h-[75vh]"
    >
      {/* 🚀 Tab Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/5 pb-6 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-pink-600 rounded-xl inline-flex text-white shadow-lg shadow-pink-500/20">
              <ShoppingBag className="w-6 h-6" />
            </span>
            <div>
              <h2 className="text-xl font-black uppercase tracking-wider text-pink-500">Notinhas de Orçamentos & Recibos</h2>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                Gerenciador de Vendas, Serviços, Logística & Comercial
              </p>
            </div>
          </div>
        </div>

        {/* Excel style high level counts separated for Accounts Receivable and Accounts Payable */}
        <div className="flex flex-col xl:flex-row gap-4 w-full shrink-0 xl:max-w-4xl">
          {/* Receber: Clientes */}
          <div className="flex-1 bg-slate-900/50 border border-pink-500/10 rounded-2xl p-3 space-y-2">
            <span className="text-[9px] font-black uppercase tracking-wider text-pink-400 block border-b border-white/5 pb-1">
              💵 DINHEIRO DOS CLIENTES (EU VOU RECEBER)
            </span>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-950/80 border border-pink-500/5 rounded-xl p-2 flex flex-col items-center justify-center text-center">
                <span className="text-[8px] font-black uppercase text-pink-400/80 tracking-wider">Valor Vendido</span>
                <span className="text-xs font-black text-pink-300 mt-1 font-mono">{formatCurrency(globalSummary.buyerSales)}</span>
              </div>
              <div className="bg-slate-950/80 border border-pink-500/5 rounded-xl p-2 flex flex-col items-center justify-center text-center">
                <span className="text-[8px] font-black uppercase text-emerald-400/80 tracking-wider">Já me Pagaram</span>
                <span className="text-xs font-black text-emerald-300 mt-1 font-mono">{formatCurrency(globalSummary.buyerPaid)}</span>
              </div>
              <div className="bg-slate-950/80 border border-pink-500/5 rounded-xl p-2 flex flex-col items-center justify-center text-center">
                <span className="text-[8px] font-black uppercase text-rose-400/80 tracking-wider">Falta me Pagar</span>
                <span className="text-xs font-black text-rose-300 mt-1 font-mono">{formatCurrency(globalSummary.buyerPending)}</span>
              </div>
            </div>
          </div>

          {/* Pagar: Fornecedores / Desapegos */}
          <div className="flex-1 bg-slate-900/50 border border-emerald-500/10 rounded-2xl p-3 space-y-2">
            <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400 block border-b border-white/5 pb-1">
              💳 MINHAS DESPESAS / DÍVIDAS (EU DEVO PAGAR)
            </span>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-950/80 border border-emerald-500/5 rounded-xl p-2 flex flex-col items-center justify-center text-center">
                <span className="text-[8px] font-black uppercase text-emerald-400/80 tracking-wider">Total de Gastos</span>
                <span className="text-xs font-black text-emerald-300 mt-1 font-mono">{formatCurrency(globalSummary.supplierCost)}</span>
              </div>
              <div className="bg-slate-950/80 border border-emerald-500/5 rounded-xl p-2 flex flex-col items-center justify-center text-center">
                <span className="text-[8px] font-black uppercase text-teal-400/80 tracking-wider">Já Paguei</span>
                <span className="text-xs font-black text-teal-300 mt-1 font-mono">{formatCurrency(globalSummary.supplierPaid)}</span>
              </div>
              <div className="bg-slate-950/80 border border-emerald-500/5 rounded-xl p-2 flex flex-col items-center justify-center text-center">
                <span className="text-[8px] font-black uppercase text-amber-400/80 tracking-wider">Eu Devo Pagar</span>
                <span className="text-xs font-black text-amber-300 mt-1 font-mono">{formatCurrency(globalSummary.supplierPending)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 📊 TABS DE NAVEGAÇÃO SUB-TAB: Lançamentos vs Painel Geral Comercial */}
      <div className="flex bg-slate-900 border border-white/5 p-1 rounded-2xl max-w-sm">
        <button
          type="button"
          onClick={() => setActiveTab("ledgers")}
          className={`flex-1 py-1.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "ledgers"
              ? "bg-pink-600 text-white shadow-lg shadow-pink-500/20"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Lançamentos
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab("dashboard");
            if (goalEditingInput === "") {
              setGoalEditingInput(monthlyGoal.toString());
            }
          }}
          className={`flex-1 py-1.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "dashboard"
              ? "bg-pink-600 text-white shadow-lg shadow-pink-500/20"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          Painel de Vendas
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "ledgers" ? (
          <motion.div
            key="ledgers-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            {/* 🏬 SELETOR DE NICHO EXCLUSIVO COMERCIAL DO SISTEMA */}
            <div className="lg:col-span-12 bg-slate-900 border border-white/5 rounded-3xl p-4 md:p-5 space-y-4 shadow-xl">
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/5 pb-3">
                <div>
                  <h3 className="text-xs font-black uppercase text-pink-400 tracking-wider flex items-center gap-1.5">
                    <Store className="w-4 h-4 text-pink-500" />
                    PDV de Vendas por Segmento
                  </h3>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    Gerencie com facilidade as vendas do seu Brechó, Mercadinho, Padaria, Hortifruti, Açougue, Salão, Barbearia, Manicure e muito mais!
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[8px] font-black uppercase bg-emerald-600/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 tracking-wider">
                    PDV MULTI-NICHO ATIVO
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-2.5">
               {[
                  { id: "brecho", name: "Brechó", desc: "Roupas Únicas", icon: Shirt, bg: "text-pink-400 border-pink-500/25 bg-pink-500/5", activeBg: "bg-pink-600 border-pink-500 text-white shadow-lg shadow-pink-500/20" },
                  { id: "mercadinho", name: "Mercadinho", desc: "Vendas Gerais", icon: Store, bg: "text-emerald-400 border-emerald-500/25 bg-emerald-500/5", activeBg: "bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-500/20" },
                  { id: "padaria", name: "Padaria & Mercadinho", desc: "Pães e Mercearia", icon: Cookie, bg: "text-amber-400 border-amber-500/25 bg-amber-500/5", activeBg: "bg-amber-600 border-amber-500 text-white shadow-lg shadow-amber-500/20" },
                  { id: "sacolao", name: "Hortifruti", desc: "Pesagem/Frutas", icon: Carrot, bg: "text-orange-400 border-orange-500/25 bg-orange-500/5", activeBg: "bg-orange-600 border-orange-500 text-white shadow-lg shadow-orange-500/20" },
                  { id: "acougue", name: "Açougue", desc: "Carnes/Cortes", icon: Beef, bg: "text-red-400 border-red-500/25 bg-red-500/5", activeBg: "bg-red-600 border-red-500 text-white shadow-lg shadow-red-500/20" },
                  { id: "salao_beleza", name: "Salão", desc: "Cabelo/Cortes", icon: Sparkles, bg: "text-purple-400 border-purple-500/25 bg-purple-500/5", activeBg: "bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-500/20" },
                  { id: "barbearia", name: "Barbearia", desc: "Estilo & Barba", icon: Scissors, bg: "text-emerald-400 border-emerald-500/25 bg-emerald-500/5", activeBg: "bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-500/20" },
                  { id: "manicure", name: "Manicure", desc: "Unhas/Estética", icon: Sparkles, bg: "text-fuchsia-400 border-fuchsia-500/25 bg-fuchsia-500/5", activeBg: "bg-fuchsia-600 border-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/20" },
                  { id: "bar", name: "Bar", desc: "Bebidas/Chopp", icon: Beer, bg: "text-amber-400 border-amber-500/25 bg-amber-500/5", activeBg: "bg-amber-500 border-amber-450 text-slate-950 shadow-lg shadow-amber-500/20" },
                  { id: "pensao", name: "Pensão", desc: "Marmitas/Almoço", icon: Home, bg: "text-yellow-400 border-yellow-500/25 bg-yellow-500/5", activeBg: "bg-yellow-500 border-yellow-455 text-slate-950 shadow-lg shadow-yellow-500/20" },
                  { id: "restaurante", name: "Restaurante", desc: "Buffet/Geral", icon: Utensils, bg: "text-teal-400 border-teal-500/25 bg-teal-500/5", activeBg: "bg-teal-600 border-teal-500 text-white shadow-lg shadow-teal-500/20" },
                  { id: "comercio_geral", name: "Comércio", desc: "Artigos Extras", icon: ShoppingBasket, bg: "text-indigo-400 border-indigo-500/25 bg-indigo-500/5", activeBg: "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20" },
                  { id: "mecanico", name: "Mecânico", desc: "Oficina & Peças", icon: Wrench, bg: "text-cyan-400 border-cyan-500/25 bg-cyan-500/5", activeBg: "bg-cyan-600 border-cyan-500 text-white shadow-lg shadow-cyan-500/20" }
                ].map(seg => {
// @ts-ignore
                  const IconComp = seg.icon;
                  const isActive = commercialSegment === seg.id;
                  return (
                    <button
                      key={seg.id}
                      type="button"
                      onClick={() => {
                        setCommercialSegment(seg.id as CommercialSegment);
                      }}
                      className={`p-3 text-left transition-all duration-200 active:scale-95 flex flex-col justify-between gap-3 group relative cursor-pointer border rounded-2xl min-h-[85px] md:min-h-[90px] ${
                        isActive 
                          ? seg.activeBg 
                          : `${seg.bg} bg-slate-950/40 hover:bg-white/[0.02] hover:border-white/10`
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <IconComp className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
                        {isActive && (
                          <span className="w-1.5 h-1.5 bg-current rounded-full" />
                        )}
                      </div>
                      <div>
                        <div className="text-[10px] sm:text-xs font-black tracking-normal leading-tight block line-clamp-1">{seg.name}</div>
                        <div className="text-[7.5px] sm:text-[8px] opacity-70 font-mono tracking-wider block uppercase mt-0.5 line-clamp-1">{seg.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* --- CONTROLE DE FLUXO DE CAIXA NO PDV (SUPRIMENTOS E SANGRIAS) --- */}
              <div id="cash-drawer-section" className="border-t border-white/5 pt-4 mt-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
                  <div>
                    <h4 className="text-xs font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-emerald-500" />
                      Controle de Fluxo de Caixa (Frente de Caixa / PDV)
                    </h4>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                      Gerencie as Entradas (Suprimento) e Saídas (Sangria) manuais do caixa da sua loja
                    </p>
                  </div>
                  <button
                    id="toggle-cash-drawer-btn"
                    type="button"
                    onClick={() => setIsCashDrawerOpen(!isCashDrawerOpen)}
                    className="text-[9px] font-black uppercase tracking-widest bg-slate-950/80 border border-emerald-500/35 text-emerald-300 hover:bg-emerald-950/20 px-3 py-1.5 rounded-lg transition-all active:scale-95 flex items-center gap-1"
                  >
                    {isCashDrawerOpen ? "Ocultar Controle de Caixa" : "Exibir Controle de Caixa"}
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  </button>
                </div>

                <AnimatePresence>
                  {isCashDrawerOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden space-y-4"
                    >
                      {/* Grid de Balanço e Lançamentos */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                        
                        {/* Indicadores rápidos de saldo e formulário de inserção (Col 7) */}
                        <div className="lg:col-span-7 bg-slate-950/50 p-4 rounded-2xl border border-white/5 space-y-4">
                          
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {/* Saldo de Caixa */}
                            <div className="bg-slate-900/90 border border-emerald-500/20 p-3 rounded-xl flex flex-col justify-between">
                              <span className="text-[8px] text-emerald-400 font-black uppercase tracking-widest flex items-center gap-1">
                                <TrendingUp className="w-3 h-3 text-emerald-400" /> Saldo em Caixa
                              </span>
                              <div className="text-lg font-black text-white font-mono mt-1">
                                {formatCurrency(commercialStats.overallCashBalance)}
                              </div>
                              <span className="text-[7px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">acumulado histórico</span>
                            </div>

                            {/* Total Entradas do Período */}
                            <div className="bg-slate-900/40 border border-white/5 p-3 rounded-xl flex flex-col justify-between">
                              <span className="text-[8px] text-emerald-400 font-black uppercase tracking-widest flex items-center gap-1 flex-row">
                                <ArrowDown className="w-3 h-3 text-emerald-400 shrink-0" /> Entradas Ativas
                              </span>
                              <div className="text-md font-black text-slate-200 font-mono mt-1">
                                {formatCurrency(commercialStats.totalInflowActivePeriod)}
                              </div>
                              <span className="text-[7px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">no filtro do período</span>
                            </div>

                            {/* Total Saídas do Período */}
                            <div className="bg-slate-900/40 border border-white/5 p-3 rounded-xl flex flex-col justify-between">
                              <span className="text-[8px] text-rose-400 font-black uppercase tracking-widest flex items-center gap-1 flex-row">
                                <ArrowUp className="w-3 h-3 text-rose-400 shrink-0" /> Saídas Ativas
                              </span>
                              <div className="text-md font-black text-slate-200 font-mono mt-1">
                                {formatCurrency(commercialStats.totalOutflowActivePeriod)}
                              </div>
                              <span className="text-[7px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">no filtro do período</span>
                            </div>
                          </div>

                          {/* Formulário de Registro de Entrada/Saída manual */}
                          <form onSubmit={handleAddCashTransaction} className="space-y-3 pt-2 border-t border-white/5">
                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Registrar Suprimento (Entrada) ou Sangria (Saída)</span>
                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                              
                              {/* Tipo de Operação Selection */}
                              <div className="sm:col-span-4">
                                <label className="text-[8px] font-black uppercase text-slate-500 tracking-wider">Operação</label>
                                <div className="grid grid-cols-2 gap-1 mt-1">
                                  <button
                                    id="btn-switch-cash-in"
                                    type="button"
                                    onClick={() => setCashInputType("in")}
                                    className={`py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-wider transition-all ${cashInputType === "in" ? "bg-emerald-600/20 text-emerald-400 border-emerald-500" : "bg-slate-900 border-white/5 text-slate-400 hover:text-white"}`}
                                  >
                                    Entrada
                                  </button>
                                  <button
                                    id="btn-switch-cash-out"
                                    type="button"
                                    onClick={() => setCashInputType("out")}
                                    className={`py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-wider transition-all ${cashInputType === "out" ? "bg-rose-600/20 text-rose-400 border-rose-500" : "bg-slate-900 border-white/5 text-slate-400 hover:text-white"}`}
                                  >
                                    Saída
                                  </button>
                                </div>
                              </div>

                              {/* Valor */}
                              <div className="sm:col-span-3">
                                <label className="text-[8px] font-black uppercase text-slate-500 tracking-wider">Valor (R$)</label>
                                <input
                                  id="cash-input-amount"
                                  type="text"
                                  placeholder="0,00"
                                  value={cashInputAmount}
                                  onChange={e => setCashInputAmount(e.target.value)}
                                  className="w-full bg-slate-900 border border-white/5 px-2.5 py-1.5 text-xs font-bold rounded-lg outline-none text-white focus:border-zinc-500 mt-1 uppercase"
                                />
                              </div>

                              {/* Justificativa / Origem */}
                              <div className="sm:col-span-5">
                                <label className="text-[8px] font-black uppercase text-slate-500 tracking-wider">Justificativa / Origem</label>
                                <div className="flex gap-1.5 mt-1">
                                  <input
                                    id="cash-input-reason"
                                    type="text"
                                    placeholder="Ex: Troco inicial / Compra papelaria"
                                    value={cashInputReason}
                                    onChange={e => setCashInputReason(e.target.value)}
                                    className="w-full bg-slate-900 border border-white/5 px-2.5 py-1.5 text-xs font-bold rounded-lg outline-none text-white focus:border-zinc-500 uppercase"
                                  />
                                  <button
                                    id="cash-tx-submit-btn"
                                    type="submit"
                                    className="px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-lg uppercase tracking-wider active:scale-95 shrink-0 transition-all flex items-center justify-center"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>

                            </div>
                          </form>
                        </div>

                        {/* Histórico Recente de Lançamentos do Caixa (Col 5) */}
                        <div className="lg:col-span-5 bg-slate-950/50 p-4 rounded-2xl border border-white/5 flex flex-col justify-between">
                          <div className="space-y-3">
                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider flex items-center justify-between">
                              <span>Histórico de Lançamentos</span>
                              <span className="text-[8px] bg-slate-900 text-slate-500 px-1.5 py-0.5 rounded border border-white/5 font-mono">{cashTransactions.length} REGISTROS</span>
                            </span>

                            <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
                              {cashTransactions.length === 0 ? (
                                <div className="py-8 text-center text-[10px] text-slate-500 uppercase font-black tracking-widest">
                                  Nenhum lançamento manual efetuado no caixa.
                                </div>
                              ) : (
                                cashTransactions.map(tx => {
                                  const isIn = tx.type === "in";
                                  const isEditing = editingCashTxId === tx.id;
                                  if (isEditing) {
                                    return (
                                      <div
                                        key={tx.id}
                                        className="bg-slate-900 border border-amber-500/30 rounded-xl px-3 py-2 space-y-2 text-left"
                                      >
                                        <div className="flex items-center justify-between gap-1 border-b border-white/5 pb-1.5">
                                          <span className="text-[8px] font-black uppercase text-amber-400 tracking-wider">✏️ Editar Registro</span>
                                          <div className="flex gap-1">
                                            <button
                                              type="button"
                                              onClick={() => setEditingCashType("in")}
                                              className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-wider transition-all ${editingCashType === "in" ? "bg-emerald-600/25 text-emerald-400 border border-emerald-500/40" : "bg-slate-950 text-slate-500 border border-white/5"}`}
                                            >
                                              Entrada
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => setEditingCashType("out")}
                                              className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-wider transition-all ${editingCashType === "out" ? "bg-rose-600/25 text-rose-400 border border-rose-500/40" : "bg-slate-950 text-slate-500 border border-white/5"}`}
                                            >
                                              Saída
                                            </button>
                                          </div>
                                        </div>

                                        <div className="grid grid-cols-12 gap-2 text-left">
                                          <div className="col-span-8">
                                            <label className="text-[7.5px] font-black uppercase text-slate-500 block">Justificativa</label>
                                            <input
                                              type="text"
                                              value={editingCashReason}
                                              onChange={e => setEditingCashReason(e.target.value)}
                                              className="w-full bg-slate-950 border border-white/5 px-2 py-1 text-[10px] font-bold rounded text-white outline-none focus:border-amber-500/50 uppercase mt-0.5"
                                            />
                                          </div>
                                          <div className="col-span-4">
                                            <label className="text-[7.5px] font-black uppercase text-slate-500 font-mono block">Valor R$</label>
                                            <input
                                              type="text"
                                              value={editingCashAmount}
                                              onChange={e => setEditingCashAmount(e.target.value)}
                                              className="w-full bg-slate-950 border border-white/5 px-2 py-1 text-[10px] font-bold rounded text-white outline-none mt-0.5"
                                            />
                                          </div>
                                        </div>

                                        <div className="flex justify-end gap-1.5 pt-0.5">
                                          <button
                                            type="button"
                                            onClick={() => setEditingCashTxId(null)}
                                            className="px-2 py-1 bg-slate-950 border border-white/5 hover:bg-slate-900 text-slate-400 font-bold text-[8px] rounded uppercase tracking-wider transition-all active:scale-95"
                                          >
                                            Cancelar
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleSaveEditedCashTransaction(tx.id)}
                                            className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white font-black text-[8px] rounded uppercase tracking-wider transition-all active:scale-95 flex items-center gap-1"
                                          >
                                            <Check className="w-3 h-3 text-white" /> Salvar
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  }

                                  return (
                                    <div
                                      key={tx.id}
                                      className="bg-slate-900/60 border border-white/5 rounded-xl px-3 py-2 flex items-center justify-between gap-2.5 hover:border-white/10 transition-all font-sans text-left"
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <div className={`p-1.5 rounded-lg shrink-0 ${isIn ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                                          {isIn ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />}
                                        </div>
                                        <div className="min-w-0 text-left">
                                          <div className="text-[10px] font-black text-slate-200 uppercase truncate font-sans">
                                            {tx.reason}
                                          </div>
                                          <div className="text-[7px] text-slate-500 font-bold uppercase tracking-wider mt-0.5 font-mono flex items-center gap-1">
                                            <Calendar className="w-2.5 h-2.5" />
                                            {tx.createdAt}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">
                                        <span className={`text-[10px] font-black font-mono shrink-0 ${isIn ? "text-emerald-400" : "text-rose-400"}`}>
                                          {isIn ? "+" : "-"}{formatCurrency(tx.amount)}
                                        </span>
                                        <button
                                          id={`edit-cash-tx-${tx.id}`}
                                          type="button"
                                          onClick={() => handleStartEditingCashTransaction(tx)}
                                          className="text-slate-500 hover:text-amber-400 p-1 rounded-lg transition-all active:scale-95 shrink-0"
                                          title="Editar lançamento"
                                        >
                                          <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          id={`delete-cash-tx-${tx.id}`}
                                          type="button"
                                          onClick={() => handleDeleteCashTransaction(tx.id, tx.reason)}
                                          className="text-slate-500 hover:text-rose-400 p-1 rounded-lg transition-all active:scale-95 shrink-0"
                                          title="Deletar lançamento"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>

                          <div className="text-[7.5px] text-center text-slate-500 font-bold uppercase tracking-widest pt-2 border-t border-white/5 flex justify-center items-center gap-1">
                            <Info className="w-3 h-3 text-slate-600" />
                            O saldo do caixa atualiza em tempo real com vendas e compras pagas!
                          </div>
                        </div>

                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* 🛠️ PAINEL DE FERRAMENTAS ESPECÍFICAS DO NICHO SELECIONADO */}
            <div className="lg:col-span-12">
              <AnimatePresence mode="wait">
                {commercialSegment === "brecho" && (
                  <motion.div
                    key="segment-brecho"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-slate-900 border border-pink-500/20 rounded-3xl p-5 md:p-6 space-y-5 shadow-xl"
                  >
                    <div className="flex flex-col md:flex-row gap-5 justify-between md:items-center border-b border-white/5 pb-4">
                      <div>
                        <h4 className="text-xs font-black uppercase text-pink-400 tracking-widest flex items-center gap-1.5">
                          <Shirt className="w-4 h-4 text-pink-500" />
                          Curadoria de Garimpos & Brechó Rígido (Peças Exclusivas)
                        </h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                          Cadastre suas peças garimpadas, estime o lucro e lance-as diretamente nas compras dos seus clientes!
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsAddingGarimpo(!isAddingGarimpo)}
                        className="text-[10px] font-black uppercase tracking-widest bg-pink-600 text-white hover:bg-pink-700 px-3 py-1.5 rounded-lg transition-all self-start active:scale-95"
                      >
                        {isAddingGarimpo ? "Fechar Formulário ✕" : "+ Garimpar Nova Peça"}
                      </button>
                    </div>

                    <AnimatePresence>
                      {isAddingGarimpo && (
                        <motion.form
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          onSubmit={handleAddGarimpo}
                          className="bg-slate-950/80 border border-pink-500/10 p-4 rounded-2xl space-y-4"
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                            <div className="col-span-1 sm:col-span-2">
                              <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Descrição/Nome da Peça</label>
                              <input
                                type="text"
                                placeholder="Ex: Jaqueta Jeans Levi's 1989 Vintage"
                                value={garimpoName}
                                onChange={e => setGarimpoName(e.target.value)}
                                className="w-full bg-slate-900 border border-white/5 px-3 py-2 text-xs font-bold uppercase rounded-xl outline-none text-white focus:border-pink-500/50"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Preço de Custo (R$)</label>
                              <input
                                type="text"
                                placeholder="Ex: 30,00"
                                value={garimpoBuyCost}
                                onChange={e => setGarimpoBuyCost(e.target.value)}
                                className="w-full bg-slate-900 border border-white/5 px-3 py-2 text-xs font-bold rounded-xl outline-none text-white focus:border-pink-500/50"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Valor de Venda (R$)</label>
                              <input
                                type="text"
                                placeholder="Ex: 120,00"
                                value={garimpoSellPrice}
                                onChange={e => setGarimpoSellPrice(e.target.value)}
                                className="w-full bg-slate-900 border border-white/5 px-3 py-2 text-xs font-bold rounded-xl outline-none text-white focus:border-pink-500/50"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Tamanho</label>
                              <select
                                value={garimpoSize}
                                onChange={e => setGarimpoSize(e.target.value)}
                                className="w-full bg-slate-900 border border-white/5 px-3 py-2 text-xs font-bold rounded-xl outline-none text-white focus:border-pink-500/50"
                              >
                                {["P", "M", "G", "GG", "EG", "36", "38", "40", "42", "44", "Único"].map(size => (
                                  <option key={size} value={size}>{size}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Estado de Conservação:</span>
                              <div className="flex gap-1.5">
                                {["Excelente", "Novo c/ Etiqueta", "Bom Estado", "Vintage"].map(cond => (
                                  <button
                                    key={cond}
                                    type="button"
                                    onClick={() => setGarimpoCondition(cond)}
                                    className={`px-2 py-1 text-[8px] font-black uppercase tracking-wider rounded ${garimpoCondition === cond ? "bg-pink-600 text-white" : "bg-slate-900 text-slate-400 border border-white/5"}`}
                                  >
                                    {cond}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <button
                              type="submit"
                              className="px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 self-stretch sm:self-auto"
                            >
                              Arrecadar Peça ✓
                            </button>
                          </div>
                        </motion.form>
                      )}
                    </AnimatePresence>

                    {/* Stats metrics for Brecho curation */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-slate-950/60 p-3 rounded-2xl border border-white/5">
                        <span className="text-[8px] font-black uppercase text-slate-400 tracking-wide">Investimento nos Garimpos</span>
                        <div className="text-sm font-black text-white mt-1 font-mono">
                          {formatCurrency(garimpoItems.reduce((acc, item) => acc + item.buyCost, 0))}
                        </div>
                      </div>
                      <div className="bg-slate-950/60 p-3 rounded-2xl border border-white/5">
                        <span className="text-[8px] font-black uppercase text-slate-400 tracking-wide">Previsão Retorno Bruto</span>
                        <div className="text-sm font-black text-pink-400 mt-1 font-mono">
                          {formatCurrency(garimpoItems.reduce((acc, item) => acc + item.appraisedPrice, 0))}
                        </div>
                      </div>
                      <div className="bg-slate-950/60 p-3 rounded-2xl border border-white/5">
                        <span className="text-[8px] font-black uppercase text-slate-400 tracking-wide">Estima de Lucro Líquido</span>
                        <div className="text-sm font-black text-emerald-400 mt-1 font-mono">
                          {formatCurrency(garimpoItems.reduce((acc, item) => acc + (item.appraisedPrice - item.buyCost), 0))}
                        </div>
                      </div>
                    </div>

                    {/* Table list of garimpos */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[10px] font-bold">
                        <thead>
                          <tr className="border-b border-white/5 text-slate-400 uppercase tracking-wider text-[8px]">
                            <th className="py-2 pb-1.5">Peça Garimpada</th>
                            <th className="py-2 pb-1.5">Tamanho</th>
                            <th className="py-2 pb-1.5">Custo</th>
                            <th className="py-2 pb-1.5">Revenda</th>
                            <th className="py-2 pb-1.5">Estado</th>
                            <th className="py-2 pb-1.5 text-center">Status</th>
                            <th className="py-2 pb-1.5 text-right">Ação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-slate-300">
                          {garimpoItems.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="py-6 text-center text-slate-500 uppercase tracking-widest text-[9px]">
                                Nenhuma peça de garimpo registrada nesta sessão.
                              </td>
                            </tr>
                          ) : (
                            garimpoItems.map(item => (
                              <tr key={item.id} className="hover:bg-white/5">
                                <td className="py-2.5 uppercase font-black text-white">{item.name}</td>
                                <td className="py-2.5"><span className="bg-slate-950 px-1.5 py-0.5 rounded text-[8px] font-black text-pink-400">{item.size}</span></td>
                                <td className="py-2.5 font-mono">{formatCurrency(item.buyCost)}</td>
                                <td className="py-2.5 font-mono text-pink-300">{formatCurrency(item.appraisedPrice)}</td>
                                <td className="py-2.5 uppercase text-[8px] tracking-wider">{item.condition}</td>
                                <td className="py-2.5 text-center">
                                  {item.status === "available" ? (
                                    <span className="bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full text-[8px] uppercase tracking-wider border border-amber-500/20">
                                      Disponível
                                    </span>
                                  ) : (
                                    <span className="bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full text-[8px] uppercase tracking-wider border border-emerald-500/20">
                                      Vendido ✓
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    {item.status === "available" && (
                                      <button
                                        type="button"
                                        onClick={() => handleSellGarimpo(item)}
                                        className="bg-pink-600 hover:bg-pink-500 text-white px-2 py-1 rounded text-[8px] font-black uppercase tracking-wider flex items-center gap-0.5 transition-all"
                                      >
                                        <Plus className="w-2.5 h-2.5" /> Lançar na Compra
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteGarimpo(item.id)}
                                      className="text-slate-500 hover:text-red-500 p-1"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                )}

                {commercialSegment === "mercadinho" && (
                  <motion.div
                    key="segment-mercadinho"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-slate-900 border border-emerald-500/20 rounded-3xl p-5 md:p-6 space-y-5 shadow-xl"
                  >
                    <div className="flex flex-col md:flex-row gap-5 justify-between md:items-center border-b border-white/5 pb-4">
                      <div>
                        <h4 className="text-xs font-black uppercase text-emerald-400 tracking-widest flex items-center gap-1.5">
                          <Store className="w-4 h-4 text-emerald-500" />
                          PDV Mercadinho (Automação de Checkout Rápido & Validades)
                        </h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                          Simule vendas instantâneas através dos códigos de barras PLU ou registre datas de validade para reduzir perdas!
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setIsAddingPerishable(!isAddingPerishable)}
                          className="text-[10px] font-black uppercase tracking-widest bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-600 hover:text-white px-3 py-1.5 rounded-lg transition-all active:scale-95"
                        >
                          {isAddingPerishable ? "Ver Vendas Rápidas" : "+ Cadastro de Validade"}
                        </button>
                      </div>
                    </div>

                    {!isAddingPerishable ? (
                      /* Checkout Simulator Mode */
                      <div className="space-y-4">
                        <div className="bg-slate-950 p-4 rounded-2xl border border-white/5 space-y-3">
                          <span className="text-[8px] font-black text-slate-400 tracking-wider uppercase block">
                            📟 Frente de Caixa: Leitor de Códigos PLU Rápido (Selecione para Lançar no Cliente Ativo)
                          </span>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                            {[
                              { code: "101", name: "Arroz agulha 5Kg", price: 24.90 },
                              { code: "102", name: "Feijão Carioquinha 1Kg", price: 7.90 },
                              { code: "103", name: "Óleo de Soja Liza", price: 6.80 },
                              { code: "104", name: "Macarrão Espaguete Galo", price: 3.90 },
                              { code: "105", name: "Leite UHT integral", price: 4.80 },
                              { code: "106", name: "Detergente de Coco Liquido", price: 2.10 },
                              { code: "107", name: "Café Moído Caboclo 500g", price: 17.50 },
                              { code: "108", name: "Sabão em Pó Omo 800g", price: 16.95 },
                              { code: "109", name: "Açúcar Refinado União 1Kg", price: 4.55 },
                              { code: "110", name: "Biscoito Recheado Passatempo", price: 2.70 }
                            ].map(p => (
                              <button
                                key={p.code}
                                type="button"
                                onClick={() => injectItemToActiveLedger(`${p.name} [#${p.code}]`, 1, p.price)}
                                className="bg-slate-900 border border-white/5 hover:border-emerald-500 hover:bg-emerald-950/20 p-2.5 rounded-xl text-left transition-all cursor-pointer group flex flex-col justify-between h-20 active:scale-95 animate-none"
                              >
                                <span className="text-[8px] text-emerald-400 font-bold uppercase tracking-widest font-mono">CÓD. PLU #{p.code}</span>
                                <div className="text-[10px] font-black text-slate-200 uppercase truncate mt-1 group-hover:text-white">{p.name}</div>
                                <div className="text-[11px] font-black text-emerald-300 font-mono mt-1">{formatCurrency(p.price)}</div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Perishability Control register Mode */
                      <div className="space-y-4">
                        <form onSubmit={handleAddPerishable} className="bg-slate-950/80 border border-emerald-500/10 p-4 rounded-2xl space-y-3">
                          <span className="text-[9px] font-black uppercase text-emerald-400 tracking-wider">Lançar Novo Lote da Prateleira</span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                            <div className="col-span-1 sm:col-span-2">
                              <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Descrição do Produto</label>
                              <input
                                type="text"
                                placeholder="Ex: Iogurte Danone Morango Garrafa"
                                value={perishableName}
                                onChange={e => setPerishableName(e.target.value)}
                                className="w-full bg-slate-900 border border-white/5 px-3 py-2 text-xs font-bold uppercase rounded-xl outline-none text-white focus:border-emerald-500/50"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Código de Lote ou Produto</label>
                              <input
                                type="text"
                                placeholder="E.g. #7890"
                                value={perishableCode}
                                onChange={e => setPerishableCode(e.target.value)}
                                className="w-full bg-slate-900 border border-white/5 px-3 py-2 text-xs font-bold rounded-xl outline-none text-white focus:border-emerald-500/50"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Data de Vencimento</label>
                              <input
                                type="date"
                                value={perishableExpiry}
                                onChange={e => setPerishableExpiry(e.target.value)}
                                className="w-full bg-slate-900 border border-white/5 px-3 py-2 text-xs rounded-xl outline-none text-white focus:border-emerald-500/50"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Qtd do Lote</label>
                              <input
                                type="number"
                                min={1}
                                value={perishableQty}
                                onChange={e => setPerishableQty(parseInt(e.target.value) || 1)}
                                className="w-full bg-slate-900 border border-white/5 px-3 py-2 text-xs font-bold rounded-xl outline-none text-white focus:border-emerald-500/50"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end">
                            <button
                              type="submit"
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95"
                            >
                              Agendar Vencimento ✓
                            </button>
                          </div>
                        </form>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-[10px] font-bold">
                            <thead>
                              <tr className="border-b border-white/5 text-slate-400 uppercase tracking-wider text-[8px]">
                                <th className="py-2">Código</th>
                                <th className="py-2">Produto</th>
                                <th className="py-2">Qtd de Lote</th>
                                <th className="py-2">Data Vencimento</th>
                                <th className="py-2">Dias Restantes</th>
                                <th className="py-2 text-center">Status de Prateleira</th>
                                <th className="py-2 text-right">Ação</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-slate-300">
                              {perishables.length === 0 ? (
                                <tr>
                                  <td colSpan={7} className="py-6 text-center text-slate-500 uppercase tracking-widest text-[9px]">
                                    Nenhuma validade cadastrada neste lote.
                                  </td>
                                </tr>
                              ) : (
                                perishables.map(p => {
                                  const exp = new Date(p.expiresAt);
                                  const today = new Date();
                                  today.setHours(0,0,0,0);
                                  const diffTime = exp.getTime() - today.getTime();
                                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                  const isExpired = diffDays <= 0;
                                  const isAlert = diffDays <= p.alertDays && !isExpired;

                                  return (
                                    <tr key={p.id} className="hover:bg-white/5">
                                      <td className="py-2.5 font-mono text-emerald-400">#{p.code}</td>
                                      <td className="py-2.5 uppercase font-black text-white">{p.name}</td>
                                      <td className="py-2.5 font-mono">{p.qty} unidades</td>
                                      <td className="py-2.5">{new Date(p.expiresAt).toLocaleDateString("pt-BR")}</td>
                                      <td className="py-2.5 font-mono">
                                        {isExpired ? (
                                          <span className="text-red-500 font-extrabold">Vencido!</span>
                                        ) : (
                                          `${diffDays} dias`
                                        )}
                                      </td>
                                      <td className="py-2.5 text-center">
                                        {isExpired ? (
                                          <span className="bg-red-600/20 text-red-500 border border-red-500/30 px-2 py-0.5 rounded-full text-[8px] uppercase tracking-wider font-extrabold animate-pulse">
                                            ⚠️ RETIRAR IMEDIATAMENTE (SPOILAGE)
                                          </span>
                                        ) : isAlert ? (
                                          <span className="bg-amber-600/20 text-amber-500 border border-amber-500/30 px-2 py-0.5 rounded-full text-[8px] uppercase tracking-wider font-extrabold">
                                            ⚠️ VENDA RÁPIDA / DESCONTO
                                          </span>
                                        ) : (
                                          <span className="bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[8px] uppercase tracking-wider font-extrabold font-mono">
                                            ✓ Prateleira Saudável
                                          </span>
                                        )}
                                      </td>
                                      <td className="py-2 text-right">
                                        <button
                                          type="button"
                                          onClick={() => handleDeletePerishable(p.id)}
                                          className="text-slate-500 hover:text-red-500 p-1"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {commercialSegment === "padaria" && (
                  <motion.div
                    key="segment-padaria"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-slate-900 border border-amber-500/20 rounded-3xl p-5 md:p-6 space-y-5 shadow-xl"
                  >
                    <div className="flex flex-col md:flex-row gap-5 justify-between md:items-center border-b border-white/5 pb-4">
                      <div>
                        <h4 className="text-xs font-black uppercase text-amber-400 tracking-widest flex items-center gap-1.5">
                          <Cookie className="w-4 h-4 text-amber-500" />
                          Linha de Fornalhas de Padaria (Giro e Status de Assados)
                        </h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                          Organize o cronograma produtivo do pão fresquinho, salgados e doces do balcão da sua padaria!
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsAddingBaking(!isAddingBaking)}
                        className="text-[10px] font-black uppercase tracking-widest bg-amber-600 text-white hover:bg-amber-700 px-3 py-1.5 rounded-lg transition-all active:scale-95"
                      >
                        {isAddingBaking ? "Fechar" : "+ Agendar Nova Fornada"}
                      </button>
                    </div>

                    <AnimatePresence>
                      {isAddingBaking && (
                        <motion.form
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          onSubmit={handleAddBaking}
                          className="bg-slate-950/80 border border-amber-500/10 p-4 rounded-2xl space-y-4"
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Item de Panificação (Receita)</label>
                              <input
                                type="text"
                                placeholder="Ex: Pão Francês Tradicional"
                                value={bakingName}
                                onChange={e => setBakingName(e.target.value)}
                                className="w-full bg-slate-900 border border-white/5 px-3 py-2 text-xs font-bold uppercase rounded-xl outline-none text-white focus:border-amber-500/50"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Rendimento (Unidades/Qtd)</label>
                              <input
                                type="number"
                                min={1}
                                value={bakingQty}
                                onChange={e => setBakingQty(parseInt(e.target.value) || 1)}
                                className="w-full bg-slate-900 border border-white/5 px-3 py-2 text-xs font-bold rounded-xl outline-none text-white focus:border-amber-500/50"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Horário Previsto para Sair (Clock)</label>
                              <input
                                type="text"
                                placeholder="Ex: 17:00 ou Deixar vazio para +30m"
                                value={bakingReadyTime}
                                onChange={e => setBakingReadyTime(e.target.value)}
                                className="w-full bg-slate-900 border border-white/5 px-3 py-2 text-xs font-bold rounded-xl outline-none text-white focus:border-amber-500/50"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end">
                            <button
                              type="submit"
                              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95"
                            >
                              Lançar Fornada na Produção 👨‍🍳
                            </button>
                          </div>
                        </motion.form>
                      )}
                    </AnimatePresence>

                    {/* Quick bakery launch simulator for counter */}
                    <div className="bg-slate-950 p-4 rounded-xl border border-white/5 space-y-2">
                      <span className="text-[8px] font-black text-slate-400 tracking-wider uppercase block">
                        🥯 Lançador Rápido de Balcão (Inserir item de padaria ou mercadinho no contato ativo)
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { name: "Pão Francês Unitário", price: 0.90 },
                          { name: "Pão de Queijo Cascão", price: 3.50 },
                          { name: "Leite Integral (1L)", price: 5.20 },
                          { name: "Manteiga com Sal 200g", price: 10.90 },
                          { name: "Queijo Mussarela (100g)", price: 6.50 },
                          { name: "Presunto Fatiado (100g)", price: 4.50 },
                          { name: "Refrigerante Coca-Cola 2L", price: 9.90 },
                          { name: "Biscoito Recheado Choc.", price: 3.20 },
                          { name: "Pedaço Bolo Formigueiro", price: 4.50 },
                          { name: "Rosca Doce com Creme", price: 6.90 },
                          { name: "Sonho Tradicional", price: 4.00 }
                        ].map(bak => (
                          <button
                            key={bak.name}
                            type="button"
                            onClick={() => injectItemToActiveLedger(bak.name, 1, bak.price)}
                            className="bg-slate-900 border border-white/5 hover:border-amber-500 hover:bg-amber-950/10 px-3 py-2 rounded-xl text-left transition-all text-slate-300 font-bold uppercase tracking-wider text-[9px] active:scale-95 cursor-pointer"
                          >
                            {bak.name} - <span className="text-amber-400 font-mono">{formatCurrency(bak.price)}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Table list of bakings */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[10px] font-bold">
                        <thead>
                          <tr className="border-b border-white/5 text-slate-400 uppercase tracking-wider text-[8px]">
                            <th className="py-2">Item Assado</th>
                            <th className="py-2">Rendimento Esperado</th>
                            <th className="py-2">Horário Forno</th>
                            <th className="py-2 text-center">Estado da Fornada</th>
                            <th className="py-2 text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-slate-300">
                          {bakingBatches.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-6 text-center text-slate-500 uppercase tracking-widest text-[9px]">
                                Sem preparos agendados no forno.
                              </td>
                            </tr>
                          ) : (
                            bakingBatches.map(b => (
                              <tr key={b.id} className="hover:bg-white/5">
                                <td className="py-2.5 uppercase font-black text-white">{b.name}</td>
                                <td className="py-2.5 font-mono">{b.qty} fatias / unidades</td>
                                <td className="py-2.5 font-mono">{b.readyTime}</td>
                                <td className="py-2.5 text-center">
                                  {b.status === "preparando" ? (
                                    <span className="bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-[8px] uppercase tracking-wider font-black">
                                      Prep / No Forno ⏳
                                    </span>
                                  ) : b.status === "quente" ? (
                                    <span className="bg-red-600/20 text-red-500 border border-red-500/30 px-2.5 py-0.5 rounded-full text-[8px] uppercase tracking-wider font-extrabold animate-pulse shadow-md shadow-red-500/5">
                                      🔥 QUENTINHO AGORA!
                                    </span>
                                  ) : (
                                    <span className="bg-slate-800 text-slate-500 px-2.5 py-0.5 rounded-full text-[8px] uppercase tracking-wider font-black">
                                      Esgotado 🚫
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    {b.status === "preparando" && (
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateBakingStatus(b.id, "quente")}
                                        className="bg-amber-600 hover:bg-amber-500 text-white px-2 py-1 rounded text-[8px] font-black uppercase tracking-wider transition-all"
                                      >
                                        Pronto! 🔥
                                      </button>
                                    )}
                                    {b.status === "quente" && (
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateBakingStatus(b.id, "esgotado")}
                                        className="bg-slate-850 hover:bg-red-600/15 text-red-500 px-2 py-1 rounded text-[8px] font-black uppercase tracking-wider transition-all border border-red-500/10"
                                      >
                                        Esgotou 🚫
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteBaking(b.id)}
                                      className="text-slate-500 p-1"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                )}

                {commercialSegment === "sacolao" && (
                  <motion.div
                    key="segment-sacolao"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-slate-900 border border-orange-500/20 rounded-3xl p-5 md:p-6 space-y-5 shadow-xl"
                  >
                    <div className="flex flex-col md:flex-row gap-5 justify-between md:items-center border-b border-white/5 pb-4">
                      <div>
                        <h4 className="text-xs font-black uppercase text-orange-400 tracking-widest flex items-center gap-1.5">
                          <Carrot className="w-4 h-4 text-orange-500" />
                          Simulador de Balança de Hortifruti (Weighing Scale checkout)
                        </h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                          Pesagem interativa por gramas integrada à notinha comercial do cliente + Registro de Perdas!
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setIsAddingLoss(!isAddingLoss)}
                          className="text-[10px] font-black uppercase tracking-widest bg-orange-600/10 text-orange-400 border border-orange-500/20 hover:bg-orange-600 hover:text-white px-3 py-1.5 rounded-lg transition-all active:scale-95"
                        >
                          {isAddingLoss ? "Balança Digital" : "+ Controle de Descarte/Perdas"}
                        </button>
                      </div>
                    </div>

                    {!isAddingLoss ? (
                      /* Digital Weighing Scale Simulator */
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Control panel of scale */}
                        <div className="bg-slate-950 p-5 rounded-2xl border border-orange-500/20 space-y-4">
                          <span className="text-[9px] font-black text-orange-500 tracking-wider uppercase block border-b border-white/5 pb-2">
                            🛒 Teclado Operador da Balança Comercial
                          </span>
                          <div className="grid grid-cols-3 gap-1.5 pb-2">
                            {[
                              { name: "Tomate Italiano", price: 6.90 },
                              { name: "Banana Nanica", price: 4.50 },
                              { name: "Batata Lavada", price: 5.90 },
                              { name: "Cebola Roxa", price: 7.20 },
                              { name: "Maçã Gala Importada", price: 9.80 },
                              { name: "Cenoura Selecionada", price: 4.90 }
                            ].map(veg => (
                              <button
                                key={veg.name}
                                type="button"
                                onClick={() => {
                                  setScaleProduct(veg.name);
                                  setScalePricePerKg(veg.price.toString());
                                  setScaleWeightGrams("1000"); // default 1kg
                                }}
                                className="bg-slate-900 border border-white/5 hover:border-orange-500 hover:bg-orange-950/20 p-2 text-slate-300 rounded-xl text-center text-[9px] font-black uppercase transition-all cursor-pointer inline-block"
                              >
                                {veg.name}
                              </button>
                            ))}
                          </div>

                          <div className="space-y-3">
                            <div>
                              <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Legume/Fruta Selecionado</label>
                              <input
                                type="text"
                                value={scaleProduct}
                                onChange={e => setScaleProduct(e.target.value)}
                                placeholder="E.g. Tomate Orgânico"
                                className="w-full bg-slate-900 border border-white/5 px-3 py-2 text-xs font-bold uppercase rounded-xl outline-none text-white focus:border-orange-500/50"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3.5">
                              <div>
                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Custo do Kg (R$)</label>
                                <input
                                  type="text"
                                  placeholder="Preço/Kg"
                                  value={scalePricePerKg}
                                  onChange={e => setScalePricePerKg(e.target.value)}
                                  className="w-full bg-slate-900 border border-white/5 px-3 py-2 text-xs font-bold rounded-xl outline-none text-white focus:border-orange-500/50 font-mono"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Simular Peso no Prato (Grams)</label>
                                <input
                                  type="text"
                                  placeholder="E.g. 1250"
                                  value={scaleWeightGrams}
                                  onChange={e => setScaleWeightGrams(e.target.value)}
                                  className="w-full bg-slate-900 border border-white/5 px-3 py-2 text-xs font-bold rounded-xl outline-none text-white focus:border-orange-500/50 font-mono"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Visual digital scale display output screen */}
                        <div className="bg-slate-950 p-5 rounded-2xl border border-orange-500/20 flex flex-col justify-between items-stretch">
                          <div className="border-[3px] border-orange-500/30 rounded-2xl bg-orange-950/20 p-4 space-y-3 relative overflow-hidden flex flex-col items-stretch justify-center h-44">
                            <div className="absolute top-2 right-2 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-ping"></span>
                              <span className="text-[7px] font-black uppercase tracking-wider text-orange-400 font-mono">Balança Filizola Inc</span>
                            </div>

                            <div className="text-center">
                              <span className="text-[8px] font-black uppercase tracking-wider text-orange-400/80">PESAGEM DUAL DE CHECKOUT</span>
                              <div className="text-3xl font-black text-orange-400 tracking-wider font-mono mt-0.5">
                                {((parseFloat(scaleWeightGrams) || 0) / 1000).toFixed(3)} <span className="text-xs uppercase">Kg</span>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 border-t border-orange-500/20 pt-2 text-center">
                              <div>
                                <label className="text-[7px] font-black text-orange-400/80 block uppercase">Preço / Kg</label>
                                <span className="text-xs font-black text-orange-300 font-mono">
                                  {formatCurrency(parseFloat(scalePricePerKg.replace(",", ".")) || 0)}
                                </span>
                              </div>
                              <div>
                                <label className="text-[7px] font-black text-orange-400/80 block uppercase">Total a Pagar</label>
                                <span className="text-sm font-black text-orange-300 font-mono">
                                  {formatCurrency(((parseFloat(scaleWeightGrams) || 0) / 1000) * (parseFloat(scalePricePerKg.replace(",", ".")) || 0))}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="pt-4 flex flex-col gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const prod = scaleProduct.trim() || "Vegetal/Fruta s/ nome";
                                const price = parseFloat(scalePricePerKg.replace(",", ".")) || 0;
                                const grams = parseFloat(scaleWeightGrams) || 0;
                                if (price <= 0 || grams <= 0) {
                                  showNotification("Configure o preço e peso na balança.", "error");
                                  return;
                                }
                                const success = injectItemToActiveLedger(`${prod} (${(grams/1000).toFixed(3)} Kg)`, grams/1000, price);
                                if (success) {
                                  setScaleProduct("");
                                  setScalePricePerKg("");
                                  setScaleWeightGrams("");
                                }
                              }}
                              className="px-4 py-3 bg-orange-600 hover:bg-orange-500 text-white font-black text-[11px] uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-orange-600/20 cursor-pointer"
                            >
                              <Scale className="w-4 h-4" />
                              📥 Lançar Peso na Notinha do Cliente
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Losses lists and statistics */
                      <div className="space-y-4">
                        <form onSubmit={handleAddLoss} className="bg-slate-950/80 border border-orange-500/10 p-4 rounded-2xl space-y-4">
                          <span className="text-[9px] font-black uppercase text-orange-400 tracking-wider">Anotar Desperdício de Hortifruti (Spoiled Waste)</span>
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                            <div className="col-span-1 sm:col-span-2">
                              <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Alimento Desperdiçado (Nome)</label>
                              <input
                                type="text"
                                placeholder="Ex: Alface Crespa Hidropônica"
                                value={lossName}
                                onChange={e => setLossName(e.target.value)}
                                className="w-full bg-slate-900 border border-white/5 px-3 py-2 text-xs font-bold uppercase rounded-xl outline-none text-white focus:border-orange-500/50"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Peso Descartado (Kg)</label>
                              <input
                                type="text"
                                placeholder="Ex: 2.5"
                                value={lossWeight}
                                onChange={e => setLossWeight(e.target.value)}
                                className="w-full bg-slate-900 border border-white/5 px-3 py-2 text-xs font-bold rounded-xl outline-none text-white focus:border-orange-500/50"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Preço Pago no Kg (R$)</label>
                              <input
                                type="text"
                                placeholder="Custo Pago / Kg"
                                value={lossCost}
                                onChange={e => setLossCost(e.target.value)}
                                className="w-full bg-slate-900 border border-white/5 px-3 py-2 text-xs font-bold rounded-xl outline-none text-white focus:border-orange-500/50 font-mono"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end">
                            <button
                              type="submit"
                              className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95"
                            >
                              Arrecadar Perda de Hortifruti ✓
                            </button>
                          </div>
                        </form>

                        <div className="overflow-x-auto">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[9px] font-black uppercase text-orange-400/70">Perda de Hortifruti Total no Mês:</span>
                            <span className="text-[11px] font-black text-red-500 font-mono">
                              {formatCurrency(produceLosses.reduce((acc, l) => acc + l.costLoss, 0))}
                            </span>
                          </div>
                          <table className="w-full text-left text-[10px] font-bold">
                            <thead>
                              <tr className="border-b border-white/5 text-slate-400 uppercase tracking-wider text-[8px]">
                                <th className="py-2">Data Cadastro</th>
                                <th className="py-2">Produce/Alimento</th>
                                <th className="py-2">Peso Composto</th>
                                <th className="py-2">Valor Dinheiro Real Perdido</th>
                                <th className="py-2 text-right">Ação</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-slate-300">
                              {produceLosses.length === 0 ? (
                                <tr>
                                  <td colSpan={5} className="py-6 text-center text-slate-500 uppercase tracking-widest text-[9px]">
                                    Parabéns! Sem alimentos descartados registrados nas valas de lixo.
                                  </td>
                                </tr>
                              ) : (
                                produceLosses.map(l => (
                                  <tr key={l.id} className="hover:bg-white/5">
                                    <td className="py-2.5 text-slate-300">{l.createdAt}</td>
                                    <td className="py-2.5 font-black text-white uppercase">{l.name}</td>
                                    <td className="py-2.5 font-mono">{l.weightKg} Kg</td>
                                    <td className="py-2.5 font-mono text-red-400">{formatCurrency(l.costLoss)}</td>
                                    <td className="py-2.5 text-right">
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteLoss(l.id)}
                                        className="text-slate-500 hover:text-red-500 p-1"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {commercialSegment === "acougue" && (
                  <motion.div
                    key="segment-acougue"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-slate-900 border border-red-500/20 rounded-3xl p-5 md:p-6 space-y-5 shadow-xl"
                  >
                    <div className="flex flex-col md:flex-row gap-5 justify-between md:items-center border-b border-white/5 pb-4">
                      <div>
                        <h4 className="text-xs font-black uppercase text-red-400 tracking-widest flex items-center gap-1.5">
                          <Beef className="w-4 h-4 text-red-500" />
                          Estudo de Desossa de Carcaça de Carne & Fornecimento
                        </h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                          Monitore o rendimento bruto da carne de primeira versus gorduras/ossos para achar o verdadeiro preço de custo corrigido!
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsAddingDeboning(!isAddingDeboning)}
                        className="text-[10px] font-black uppercase tracking-widest bg-red-600 text-white hover:bg-red-700 px-3 py-1.5 rounded-lg transition-all active:scale-95"
                      >
                        {isAddingDeboning ? "Visualizar Histórico" : "+ Cadastrar Desossa de Carcaça"}
                      </button>
                    </div>

                    {!isAddingDeboning ? (
                      /* Display history & meat cuts reference */
                      <div className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Cuts and reference Pricing */}
                          <div className="bg-slate-950 p-4 rounded-xl border border-white/5 space-y-3">
                            <span className="text-[8px] font-black text-slate-400 tracking-wider uppercase block border-b border-white/5 pb-1">
                              🥩 CATEGORIAS DE CORTES E DIRETRIZES DO AÇOUGUE
                            </span>
                            <div className="space-y-2 text-[10px]">
                              <div>
                                <span className="bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded text-[8px] font-black uppercase mr-1.5">Cortes de Primeira / Nobres</span>
                                <span className="text-slate-300 font-bold">Picanha, Contra-Filé, Alcatra, Filé Mignon. Margem recomendada: 45%+</span>
                              </div>
                              <div>
                                <span className="bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded text-[8px] font-black uppercase mr-1.5">Cortes de Segunda / Diários</span>
                                <span className="text-slate-300 font-bold">Acém, Paleta, Fraldinha, Ponta de Agulha. Margem recomendada: 30%+</span>
                              </div>
                            </div>
                            <div className="pt-2">
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Ponto de Venda Rápido de Balcão (Lançar na Notinha Ativa)</span>
                              <div className="flex flex-wrap gap-1.5">
                                {[
                                  { name: "Picanha Argentina Kg", price: 79.90 },
                                  { name: "Alcatra Premium Kg", price: 44.90 },
                                  { name: "Acém Moído Kg", price: 29.90 },
                                  { name: "Filé de Peito Frango Kg", price: 18.50 },
                                  { name: "Cebola para Grelhados", price: 4.00 }
                                ].map(meat => (
                                  <button
                                    key={meat.name}
                                    type="button"
                                    onClick={() => injectItemToActiveLedger(meat.name, 1, meat.price)}
                                    className="bg-slate-900 border border-white/5 text-slate-300 px-2.5 py-1.5 rounded-lg font-black uppercase tracking-wider text-[8px] cursor-pointer hover:border-red-500 hover:bg-red-950/10 transition-all active:scale-95"
                                  >
                                    {meat.name} ({formatCurrency(meat.price)})
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Stat summary */}
                          <div className="bg-slate-950 p-4 rounded-xl border border-white/5 flex flex-col justify-between">
                            <div>
                              <span className="text-[8px] font-black text-slate-400 tracking-wider uppercase block">Rendimento Médio de Desossa Geral registrado</span>
                              <div className="text-2xl font-black text-white mt-1">
                                {deboningLogs.length === 0 ? "Nenhum" : `${(deboningLogs.reduce((acc, d) => acc + (d.leanWeight / d.rawWeight), 0) / deboningLogs.length * 100).toFixed(1)}%`}
                              </div>
                              <p className="text-[9px] text-slate-400 mt-1 uppercase font-bold tracking-widest">
                                Quanto maior o rendimento de carne limpa, menor o seu custo corrigido após o descarte dos ossos e sebos!
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Yield history listing */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-[10px] font-bold">
                            <thead>
                              <tr className="border-b border-white/5 text-slate-400 uppercase tracking-wider text-[8px]">
                                <th className="py-2">Data Lote</th>
                                <th className="py-2">Peso Bruto</th>
                                <th className="py-2">Aproveitamento Limpo</th>
                                <th className="py-2">Custo Bruto (Kg)</th>
                                <th className="py-2">Custo Corrigido (Kg)</th>
                                <th className="py-2 text-right">Ação</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-slate-300">
                              {deboningLogs.length === 0 ? (
                                <tr>
                                  <td colSpan={6} className="py-6 text-center text-slate-500 uppercase tracking-widest text-[9px]">
                                    Sem dados de desossa históricos arquivados.
                                  </td>
                                </tr>
                              ) : (
                                deboningLogs.map(d => (
                                  <tr key={d.id} className="hover:bg-white/5">
                                    <td className="py-2.5 text-slate-300">{d.date}</td>
                                    <td className="py-2.5 font-mono">{d.rawWeight} Kg</td>
                                    <td className="py-2.5 font-mono text-emerald-400">
                                      {d.leanWeight} Kg ({((d.leanWeight / d.rawWeight) * 100).toFixed(1)}%)
                                    </td>
                                    <td className="py-2.5 font-mono">{formatCurrency(d.rawCost)}</td>
                                    <td className="py-2.5 font-mono text-red-400">{formatCurrency(d.adjustedUsableCost)}</td>
                                    <td className="py-2 text-right">
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteDeboning(d.id)}
                                        className="text-slate-500 hover:text-red-500 p-1"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      /* Adding Deboning Computation */
                      <form onSubmit={handleAddDeboning} className="bg-slate-950/80 border border-red-500/10 p-5 rounded-2xl space-y-4">
                        <span className="text-[9px] font-black uppercase text-red-400 tracking-wider">Lançar Novo Lote de Carnes para Estudo de Rendimento de Desossa</span>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                          <div>
                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Peso Bruto da Carcaça (Kg)</label>
                            <input
                              type="text"
                              placeholder="Ex: 240"
                              value={deboningRawWeight}
                              onChange={e => setDeboningRawWeight(e.target.value)}
                              className="w-full bg-slate-900 border border-white/5 px-3 py-2 text-xs font-bold rounded-xl outline-none text-white focus:border-red-500/50"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Preço do Kg Bruto de Custo (R$)</label>
                            <input
                              type="text"
                              placeholder="Ex: 16.50"
                              value={deboningRawCost}
                              onChange={e => setDeboningRawCost(e.target.value)}
                              className="w-full bg-slate-900 border border-white/5 px-3 py-2 text-xs font-bold rounded-xl outline-none text-white focus:border-red-500/50"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Carne Limpa Convertida (Kg)</label>
                            <input
                              type="text"
                              placeholder="Ex: 172"
                              value={deboningLeanWeight}
                              onChange={e => setDeboningLeanWeight(e.target.value)}
                              className="w-full bg-slate-900 border border-white/5 px-3 py-2 text-xs font-bold rounded-xl outline-none text-white focus:border-red-500/50"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Ossos e Sebo Residuais (Kg)</label>
                            <input
                              type="text"
                              placeholder="Deixar em branco para autofill"
                              value={deboningBoneWeight}
                              onChange={e => setDeboningBoneWeight(e.target.value)}
                              className="w-full bg-slate-900 border border-white/5 px-3 py-2 text-xs font-bold rounded-xl outline-none text-white focus:border-red-500/50"
                            />
                          </div>
                        </div>

                        {/* Live calculation displays */}
                        {parseFloat(deboningRawWeight) > 0 && parseFloat(deboningRawCost) > 0 && parseFloat(deboningLeanWeight) > 0 && (
                          <div className="bg-slate-900 p-4 rounded-xl border border-red-500/10 space-y-2 text-xs text-slate-300">
                            <div>
                              Investimento no Lote: <span className="font-mono text-white font-black">{formatCurrency((parseFloat(deboningRawWeight) || 0) * (parseFloat(deboningRawCost) || 0))}</span>
                            </div>
                            <div>
                              Rendimento de Carne Nobre: <span className="text-emerald-400 font-extrabold">{(((parseFloat(deboningLeanWeight) || 0) / (parseFloat(deboningRawWeight) || 1)) * 100).toFixed(1)}%</span>
                            </div>
                            <div>
                              Perda de Massa (Descarte): <span className="text-red-400 font-extrabold">{(100 - ((parseFloat(deboningLeanWeight) || 0) / (parseFloat(deboningRawWeight) || 1)) * 100).toFixed(1)}%</span>
                            </div>
                            <div className="text-red-400 font-black uppercase text-[10px] tracking-wider pt-1">
                              👉 Seu custo real corrigido é de: <span className="font-mono text-white text-sm font-black border-b border-rose-500/40 pb-0.5">{formatCurrency( ((parseFloat(deboningRawWeight) || 0) * (parseFloat(deboningRawCost) || 0)) / (parseFloat(deboningLeanWeight) || 1) )}</span> / Usável Kg de Carne Limpa!
                            </div>
                          </div>
                        )}

                        <div className="flex justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => setIsAddingDeboning(false)}
                            className="px-4 py-2 text-slate-400 font-black uppercase text-[10px] tracking-wider"
                          >
                            Voltar
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95"
                          >
                            Arquivar Relatório de Desossa ✓
                          </button>
                        </div>
                      </form>
                    )}
                  </motion.div>
                )}

                {/* 1) SALÃO DE BELEZA TERMINAL */}
                {commercialSegment === "salao_beleza" && (
                  <motion.div
                    key="segment-salao_beleza"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-slate-900 border border-purple-500/20 rounded-3xl p-5 md:p-6 space-y-5 shadow-xl"
                  >
                    <div className="flex flex-col md:flex-row gap-4 justify-between md:items-center border-b border-white/5 pb-4">
                      <div>
                        <h4 className="text-xs font-black uppercase text-purple-400 tracking-widest flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-purple-500" />
                          Terminal do Salão de Beleza & Rateio de Comissões
                        </h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                          Lance serviços profissionais na notinha e calcule a comissão do colaborador em tempo real!
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* Left: Quick Actions Grid */}
                      <div className="bg-slate-950 p-4 rounded-xl border border-white/5 space-y-3">
                        <span className="text-[8.5px] font-black text-slate-400 tracking-wider uppercase block border-b border-white/5 pb-1">
                          💇‍♀️ LANÇAR SERVIÇOS DO SALÃO DE BELEZA
                        </span>
                        
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { name: "Corte de Cabelo Feminino", price: 65.00 },
                            { name: "Escova Hidratante Profissional", price: 45.00 },
                            { name: "Coloração / Tinta Premium", price: 120.00 },
                            { name: "Manicure + Pedicure Combo", price: 55.00 },
                            { name: "Maquiagem Social Eventos", price: 150.00 },
                            { name: "Cauterização Capilar Reconstrutora", price: 90.00 }
                          ].map(serv => (
                            <button
                              key={serv.name}
                              type="button"
                              onClick={() => injectItemToActiveLedger(`${serv.name} [Colaborador: ${salonColaborador}]`, 1, serv.price)}
                              className="bg-slate-900 hover:bg-purple-950/20 border border-white/5 hover:border-purple-500/40 text-slate-350 hover:text-white px-2.5 py-2.5 rounded-xl font-bold uppercase tracking-wider text-[8.5px] transition-all text-left flex flex-col justify-between h-14"
                            >
                              <span className="line-clamp-1">{serv.name}</span>
                              <span className="text-purple-400 font-mono font-black mt-1 text-[9px]">{formatCurrency(serv.price)}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Right: Commission & Simulator Panel */}
                      <div className="bg-slate-950 p-4 rounded-xl border border-white/5 flex flex-col justify-between space-y-3">
                        <div>
                          <span className="text-[8.5px] font-black text-slate-400 tracking-wider uppercase block border-b border-white/5 pb-1.5">
                            ⚙️ CALCULADORA DE COMISSÃO & DIVISÃO DE REPPASTES
                          </span>

                          <div className="mt-3 space-y-3">
                            <div>
                              <label className="text-[8px] font-black uppercase text-slate-500 block mb-1">Escolher Profissional Ativo</label>
                              <select
                                value={salonColaborador}
                                onChange={e => setSalonColaborador(e.target.value)}
                                className="w-full bg-slate-900 border border-white/5 px-2.5 py-1.5 rounded-xl text-[10px] text-white font-bold outline-none"
                              >
                                <option value="Ana (Esteticista)">Ana (Esteticista & Cortes)</option>
                                <option value="Bia (Coloração)">Bia (Especialista Coloração)</option>
                                <option value="Carla (Manicure)">Carla (Alongamento & Esmaltes)</option>
                                <option value="Daniel (Penteados)">Daniel (Escovista & Makeup)</option>
                              </select>
                            </div>

                            <div>
                              <div className="flex justify-between text-[8.5px] font-black uppercase mb-1">
                                <span className="text-slate-400">Taxa de Comissão:</span>
                                <span className="text-purple-400 font-black">{salonCommission}%</span>
                              </div>
                              <input
                                type="range"
                                min="10"
                                max="90"
                                step="5"
                                value={salonCommission}
                                onChange={e => setSalonCommission(parseInt(e.target.value))}
                                className="w-full accent-purple-500 bg-slate-900 h-1.5 rounded-lg cursor-pointer"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Interactive math based on the active client's sum */}
                        <div className="bg-purple-950/10 border border-purple-500/10 p-3 rounded-xl space-y-1.5">
                          <span className="text-[8.5px] font-black uppercase text-purple-400 block">Simulador Base do Lançamento do Turno</span>
                          <p className="text-[8px] text-slate-400 uppercase font-black leading-tight">
                            Exemplo de Rateio para um serviço de R$ 100,00:
                          </p>
                          <div className="grid grid-cols-2 gap-2 text-[9px] font-mono font-bold uppercase mt-1">
                            <div className="text-slate-400">
                              Colaborador ({salonCommission}%): <span className="text-purple-400 block text-[11px] font-black">{formatCurrency(100 * salonCommission / 100)}</span>
                            </div>
                            <div className="text-slate-400">
                              Faturamento Salão ({100 - salonCommission}%): <span className="text-slate-200 block text-[11px] font-black">{formatCurrency(100 * (100 - salonCommission) / 100)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 2) BARBEARIA TERMINAL */}
                {commercialSegment === "barbearia" && (
                  <motion.div
                    key="segment-barbearia"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-slate-900 border border-emerald-500/20 rounded-3xl p-5 md:p-6 space-y-5 shadow-xl"
                  >
                    <div className="flex flex-col md:flex-row gap-4 justify-between md:items-center border-b border-white/5 pb-4">
                      <div>
                        <h4 className="text-xs font-black uppercase text-emerald-400 tracking-widest flex items-center gap-1.5">
                          <Scissors className="w-4 h-4 text-emerald-500" />
                          Terminal da Barbearia & Fila de Espera Digital
                        </h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                          Adicione clientes na fila visual rápida e fature combos cabelo e barba instantaneamente!
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* Left: Quick Actions Grid */}
                      <div className="bg-slate-950 p-4 rounded-xl border border-white/5 space-y-3">
                        <span className="text-[8.5px] font-black text-slate-400 tracking-wider uppercase block border-b border-white/5 pb-1">
                          💈 LANÇAR SERVIÇOS DO BALCÃO
                        </span>
                        
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { name: "Corte Degradê Moderno", price: 35.00 },
                            { name: "Corte Clássico Tesoura", price: 30.00 },
                            { name: "Alinhamento Barba Desenhada", price: 20.00 },
                            { name: "Barboterapia c/ Toalha Quente", price: 40.00 },
                            { name: "Combo Cabelo + Barba Premium", price: 50.00 },
                            { name: "Pigmentação Capilar Estilo", price: 25.00 }
                          ].map(serv => (
                            <button
                              key={serv.name}
                              type="button"
                              onClick={() => injectItemToActiveLedger(serv.name, 1, serv.price)}
                              className="bg-slate-900 hover:bg-emerald-950/20 border border-white/5 hover:border-emerald-500/40 text-slate-350 hover:text-white px-2.5 py-2.5 rounded-xl font-bold uppercase tracking-wider text-[8.5px] transition-all text-left flex flex-col justify-between h-14"
                            >
                              <span className="line-clamp-1">{serv.name}</span>
                              <span className="text-emerald-400 font-mono font-black mt-1 text-[9px]">{formatCurrency(serv.price)}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Right: Waiting Queue Simulator */}
                      <div className="bg-slate-950 p-4 rounded-xl border border-white/5 space-y-3">
                        <span className="text-[8.5px] font-black text-slate-400 tracking-wider uppercase block border-b border-white/5 pb-2">
                          📋 FILA DE ESPERA / DISPARO RÁPIDO DO DIA
                        </span>

                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={barbeariaCustomerName}
                            onChange={e => setBarbeariaCustomerName(e.target.value)}
                            className="bg-slate-900 border border-white/5 text-[10px] font-bold text-white uppercase px-2.5 py-1.5 rounded-xl outline-none flex-1 focus:border-emerald-500/50"
                            placeholder="Nome do cliente para a espera..."
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (!barbeariaCustomerName.trim()) {
                                showNotification("Escreva o nome do cliente!", "error");
                                return;
                              }
                              setBarbeariaQueue(p => [
                                ...p, 
                                { id: "bq_" + Date.now(), name: barbeariaCustomerName.trim(), service: "Corte na Vez" }
                              ]);
                              setBarbeariaCustomerName("");
                              showNotification("Cliente inserido na fila de espera! 💈", "success");
                            }}
                            className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-slate-950 font-black px-3.5 py-1.5 text-[9px] uppercase tracking-wider rounded-xl transition-all"
                          >
                            + Fila
                          </button>
                        </div>

                        {/* List display */}
                        <div className="space-y-1.5 max-h-36 overflow-y-auto no-scrollbar">
                          {barbeariaQueue.length === 0 ? (
                            <div className="text-center py-4 text-[8.5px] text-slate-600 uppercase font-bold">
                              Nenhum cliente aguardando na fila.
                            </div>
                          ) : (
                            barbeariaQueue.map((customer, idx) => (
                              <div 
                                key={customer.id} 
                                className="bg-slate-900 px-3 py-2 border border-white/5 rounded-xl flex items-center justify-between text-[9px]"
                              >
                                <div className="font-bold flex items-center gap-1.5">
                                  <span className="w-4 h-4 bg-emerald-500/20 text-emerald-400 font-black rounded-full flex items-center justify-center text-[8px]">
                                    {idx + 1}
                                  </span>
                                  <span className="uppercase text-slate-100 font-extrabold">{customer.name}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const success = injectItemToActiveLedger(`Corte (${customer.name})`, 1, 35.00);
                                      if (success) {
                                        setBarbeariaQueue(p => p.filter(x => x.id !== customer.id));
                                      }
                                    }}
                                    className="bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 px-2 py-0.5 rounded text-[8px] font-black uppercase transition-all"
                                  >
                                    Atender 🧾
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setBarbeariaQueue(p => p.filter(x => x.id !== customer.id));
                                    }}
                                    className="text-slate-500 hover:text-red-500 transition-all font-bold p-1 uppercase text-[8px]"
                                  >
                                    ×
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 3) MANICURE TERMINAL */}
                {commercialSegment === "manicure" && (
                  <motion.div
                    key="segment-manicure"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-slate-900 border border-fuchsia-500/20 rounded-3xl p-5 md:p-6 space-y-5 shadow-xl"
                  >
                    <div className="flex flex-col md:flex-row gap-4 justify-between md:items-center border-b border-white/5 pb-4">
                      <div>
                        <h4 className="text-xs font-black uppercase text-fuchsia-400 tracking-widest flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-fuchsia-500" />
                          Terminal de Manicure, Alongamentos & Nail Art
                        </h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                          Acompanhe os diferentes tipos de unhas e alongamentos, e lance diretamente na lista comercial!
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* Left: Quick Actions Grid */}
                      <div className="bg-slate-950 p-4 rounded-xl border border-white/5 space-y-3">
                        <span className="text-[8.5px] font-black text-slate-400 tracking-wider uppercase block border-b border-white/5 pb-1">
                          💅 LANÇAR PROCEDIMENTOS COMERCIAIS
                        </span>
                        
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { name: "Pé + Mão Tradicional", price: 40.00 },
                            { name: "Alongamento Gel Moldado", price: 120.00 },
                            { name: "Manutenção Gel/Acrigel", price: 70.00 },
                            { name: "Fibra de Vidro Luxo", price: 140.00 },
                            { name: "Blindagem de Unha Natural", price: 60.00 },
                            { name: "Decoração Customizada Art", price: 15.00 }
                          ].map(serv => (
                            <button
                              key={serv.name}
                              type="button"
                              onClick={() => injectItemToActiveLedger(`${serv.name} (${manicureNailType})`, 1, serv.price)}
                              className="bg-slate-900 hover:bg-fuchsia-950/20 border border-white/5 hover:border-fuchsia-500/40 text-slate-350 hover:text-white px-2.5 py-2.5 rounded-xl font-bold uppercase tracking-wider text-[8.5px] transition-all text-left flex flex-col justify-between h-14"
                            >
                              <span className="line-clamp-1">{serv.name}</span>
                              <span className="text-fuchsia-400 font-mono font-black mt-1 text-[9px]">{formatCurrency(serv.price)}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Right: Specific Nails custom options selector */}
                      <div className="bg-slate-950 p-4 rounded-xl border border-white/5 flex flex-col justify-between space-y-3">
                        <div>
                          <span className="text-[8.5px] font-black text-slate-400 tracking-wider uppercase block border-b border-white/5 pb-2">
                            💅 FILTRO DE INSUMOS & OPÇÕES SELECIONADAS
                          </span>
                          <p className="text-[9px] text-slate-400 uppercase font-black leading-tight mt-1.5">
                            Selecione o material desejado para especificar o trabalho no recibo inteligente:
                          </p>
                          
                          <div className="grid grid-cols-2 gap-1.5 mt-3 text-[9px] font-black uppercase text-center">
                            {["Gel", "Fibra Vidro", "Acrigel", "Porcelana", "Fique Natural"].map(nail => (
                              <button
                                key={nail}
                                type="button"
                                onClick={() => {
                                  setManicureNailType(nail);
                                  showNotification(`Estilo de material fixado: "${nail}"!`, "info");
                                }}
                                className={`px-2.5 py-1.5 border rounded-xl transition-all ${manicureNailType === nail ? "bg-fuchsia-600 border-fuchsia-500 text-white shadow-md shadow-fuchsia-500/10" : "bg-slate-900 border-white/5 text-slate-400"}`}
                              >
                                {nail}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="p-3 bg-fuchsia-500/5 rounded-xl border border-fuchsia-500/10">
                          <span className="text-[8.5px] font-black uppercase text-fuchsia-400 block mb-1">💡 DICA DE MARGEM</span>
                          <p className="text-[8.5px] text-slate-400 leading-snug">
                            Manutenção constante de alongamentos gera fidelidade! A margem média deste nicho trabalhando em casa é superior a <strong className="text-white">80% de lucro líquido</strong> descontados lixas e géis.
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 4) BAR / CHOPERIA TERMINAL */}
                {commercialSegment === "bar" && (
                  <motion.div
                    key="segment-bar"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-slate-900 border border-amber-500/20 rounded-3xl p-5 md:p-6 space-y-5 shadow-xl"
                  >
                    <div className="flex flex-col md:flex-row gap-4 justify-between md:items-center border-b border-white/5 pb-4">
                      <div>
                        <h4 className="text-xs font-black uppercase text-amber-500 tracking-widest flex items-center gap-1.5">
                          <Beer className="w-4 h-4 text-amber-500" />
                          Terminal Comercial de Bar & Controle de Comandas
                        </h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                          Adicione Chopp e petiscos nas comandas das mesas e simule cobrança opcional de 10% de serviço!
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* Left: Quick Actions Grid */}
                      <div className="bg-slate-950 p-4 rounded-xl border border-white/5 space-y-3">
                        <span className="text-[8.5px] font-black text-slate-400 tracking-wider uppercase block border-b border-white/5 pb-1">
                          🍻 LANÇAMENTO DE COZINHA E BEBIDAS
                        </span>
                        
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { name: "Chopp Puro Malte Tulipa", price: 9.50 },
                            { name: "Porção Batata Frita Supreme", price: 38.00 },
                            { name: "Caipirinha Limão Tradicional", price: 16.00 },
                            { name: "Hambúrguer de Costela Artesanal", price: 29.00 },
                            { name: "Suco Natural de Morango", price: 11.50 },
                            { name: "Porção de Pastel de Carne", price: 24.00 }
                          ].map(it => {
                            const finalPrice = barIncludeTips ? (it.price * 1.1) : it.price;
                            return (
                              <button
                                key={it.name}
                                type="button"
                                onClick={() => injectItemToActiveLedger(`${it.name} [Mesa ${barTableNum}]`, 1, finalPrice)}
                                className="bg-slate-900 hover:bg-amber-950/20 border border-white/5 hover:border-amber-500/40 text-slate-350 hover:text-white px-2.5 py-2.5 rounded-xl font-bold uppercase tracking-wider text-[8.5px] transition-all text-left flex flex-col justify-between h-14"
                              >
                                <span className="line-clamp-1">{it.name}</span>
                                <span className="text-amber-500 font-mono font-black mt-1 text-[9px]">
                                  {formatCurrency(finalPrice)} {barIncludeTips && <span className="text-[7px] text-slate-500 font-semibold">(+10%)</span>}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Right: Table selection & Tips */}
                      <div className="bg-slate-950 p-4 rounded-xl border border-white/5 flex flex-col justify-between space-y-4">
                        <div>
                          <span className="text-[8.5px] font-black text-slate-400 tracking-wider uppercase block border-b border-white/5 pb-2">
                            🎛️ CONFIGURAR NUMERAÇÃO DA COMANDA
                          </span>

                          <div className="grid grid-cols-2 gap-3 mt-3">
                            <div>
                              <label className="text-[8px] font-black uppercase text-slate-500 block mb-1">Mesa / Cartão nº</label>
                              <input
                                type="text"
                                value={barTableNum}
                                onChange={e => setBarTableNum(e.target.value)}
                                className="w-full bg-slate-900 border border-white/5 text-[10.5px] font-black text-white px-2.5 py-1.5 rounded-xl text-center outline-none"
                              />
                            </div>

                            <div className="flex flex-col justify-end">
                              <button
                                type="button"
                                onClick={() => {
                                  setBarIncludeTips(!barIncludeTips);
                                  showNotification(barIncludeTips ? "Opcional de 10% desativado." : "Opcional de 10% de serviço ativado!", "info");
                                }}
                                className={`w-full py-2.5 border rounded-xl text-[8px] font-black uppercase tracking-wider transition-all ${barIncludeTips ? "bg-amber-500 border-amber-500 text-slate-950" : "bg-slate-900 border-white/5 text-slate-400"}`}
                              >
                                {barIncludeTips ? "✓ Com Serviço 10%" : "Sem Taxa de 10%"}
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="p-3 bg-amber-500/5 rounded-xl border border-amber-500/10">
                          <span className="text-[8.5px] font-black uppercase text-amber-500 block mb-1">💡 SEU CAIXA DO BAR</span>
                          <p className="text-[8.5px] text-slate-400 leading-snug">
                            Dica: Lançando os 10% separados na Notinha ajuda a pagar as comissões dos garçons ao fechar a contabilidade no fim do dia!
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 5) PENSÃO / MARMITAS TERMINAL */}
                {commercialSegment === "pensao" && (
                  <motion.div
                    key="segment-pensao"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-slate-900 border border-yellow-500/20 rounded-3xl p-5 md:p-6 space-y-5 shadow-xl"
                  >
                    <div className="flex flex-col md:flex-row gap-4 justify-between md:items-center border-b border-white/5 pb-4">
                      <div>
                        <h4 className="text-xs font-black uppercase text-yellow-500 tracking-widest flex items-center gap-1.5">
                          <Home className="w-4 h-4 text-yellow-500" />
                          Terminal de Marmitas, Pensão & Refeições Diárias
                        </h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                          Organize as retiradas por tamanho de embalagem e consulte o prato do dia!
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* Left: Quick Actions Grid */}
                      <div className="bg-slate-950 p-4 rounded-xl border border-white/5 space-y-3">
                        <span className="text-[8.5px] font-black text-slate-400 tracking-wider uppercase block border-b border-white/5 pb-1">
                          🍲 DISPARO INTEGRADO DE PEDIDOS DE REFEIÇÃO
                        </span>
                        
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { name: "Marmita Econômica Pequena", price: 16.00, size: "P" },
                            { name: "Marmitex Executiva Média", price: 20.00, size: "M" },
                            { name: "Super Marmitex Família G", price: 26.00, size: "G" },
                            { name: "Prato Feito Tradicional Comercial", price: 18.00, size: "M" },
                            { name: "Suco Copo Caseiro 300ml", price: 5.00, size: "P" },
                            { name: "Bata frita Porção Prato", price: 12.00, size: "P" }
                          ].map(dish => (
                            <button
                              key={dish.name}
                              type="button"
                              onClick={() => injectItemToActiveLedger(`${dish.name} [Prato do Dia: ${pensaoPlateDay}]`, 1, dish.price)}
                              className="bg-slate-900 hover:bg-yellow-950/20 border border-white/5 hover:border-yellow-500/40 text-slate-350 hover:text-white px-2.5 py-2.5 rounded-xl font-bold uppercase tracking-wider text-[8.5px] transition-all text-left flex flex-col justify-between h-14"
                            >
                              <span className="line-clamp-1">{dish.name}</span>
                              <span className="text-yellow-400 font-mono font-black mt-1 text-[9px]">{formatCurrency(dish.price)}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Right: Plate Day Configuration */}
                      <div className="bg-slate-950 p-4 rounded-xl border border-white/5 flex flex-col justify-between space-y-3">
                        <div>
                          <span className="text-[8.5px] font-black text-slate-400 tracking-wider uppercase block border-b border-white/5 pb-2">
                            🍱 REFEIÇÃO DO DIA & CONTROLE DE PANELAS
                          </span>

                          <div className="mt-2.5 space-y-3">
                            <div>
                              <label className="text-[8px] font-black uppercase text-slate-550 block mb-1">Definir Cardápio Atual</label>
                              <select
                                value={pensaoPlateDay}
                                onChange={e => setPensaoPlateDay(e.target.value)}
                                className="w-full bg-slate-900 border border-white/5 text-[10px] text-white font-bold px-2 py-1.5 rounded-xl outline-none"
                              >
                                <option value="Feijoada Completa">Quarta/Sexta: Feijoada Completa Brasileira</option>
                                <option value="Frango Assado c/ Macarronada">Domingo: Frango com Macarronada</option>
                                <option value="Virado Paulista Executivo">Segunda: Virado à Paulista Especial</option>
                                <option value="Bife acebolado com Fritas">Terça: Bife Acebolado com Batata Frita</option>
                                <option value="Panqueca de Carne Moída">Quinta: Panqueca com Molho Rosé</option>
                              </select>
                            </div>

                            <div className="flex gap-1.5 items-center justify-between text-[10px] uppercase font-bold text-slate-400 pt-1">
                              <span>Prato Ativo hoje:</span>
                              <span className="text-yellow-400 font-black">{pensaoPlateDay}</span>
                            </div>
                          </div>
                        </div>

                        <div className="p-3 bg-yellow-500/5 rounded-xl border border-yellow-500/10">
                          <span className="text-[8.5px] font-black uppercase text-yellow-500 block mb-1 font-sans">📌 NOTA FISCAL RÁPIDA</span>
                          <p className="text-[8.5px] text-slate-400 leading-snug">
                            Lembre-se: Para frentistas mensaleiros, selecione o contato na lista à esquerda e insira as refeições diariamente. Você poderá emitir o recibo ao fim do mês!
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 6) RESTAURANTE TERMINAL */}
                {commercialSegment === "restaurante" && (
                  <motion.div
                    key="segment-restaurante"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-slate-900 border border-teal-500/20 rounded-3xl p-5 md:p-6 space-y-5 shadow-xl"
                  >
                    <div className="flex flex-col md:flex-row gap-4 justify-between md:items-center border-b border-white/5 pb-4">
                      <div>
                        <h4 className="text-xs font-black uppercase text-teal-400 tracking-widest flex items-center gap-1.5">
                          <Utensils className="w-4 h-4 text-teal-500" />
                          Simulador de Balanças de Comida a Quilo & Restaurante Self-Service
                        </h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                          Simule a balança de pesagem do buffet a quilo e converta pesos diretamente em valores para a comanda!
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* Left: Quick Actions Grid */}
                      <div className="bg-slate-950 p-4 rounded-xl border border-white/5 space-y-3">
                        <span className="text-[8.5px] font-black text-slate-400 tracking-wider uppercase block border-b border-white/5 pb-1">
                          🥤 EXTRAS DO RESTAURANTE (LÍQUIDOS & SOBREMESAS)
                        </span>
                        
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { name: "Suco Natural Laranja 500ml", price: 9.00 },
                            { name: "Refrigerante Lata Zero Almoço", price: 5.50 },
                            { name: "Sobremesa Caseira Pudim", price: 7.00 },
                            { name: "Água Mineral s/ Gás Copo", price: 4.00 },
                            { name: "Café Espresso Italiano Balcão", price: 5.00 },
                            { name: "Taxa de Prato Descartável Embalar", price: 2.00 }
                          ].map(serv => (
                            <button
                              key={serv.name}
                              type="button"
                              onClick={() => injectItemToActiveLedger(serv.name, 1, serv.price)}
                              className="bg-slate-900 hover:bg-teal-950/20 border border-white/5 hover:border-teal-500/40 text-slate-350 hover:text-white px-2.5 py-2.5 rounded-xl font-bold uppercase tracking-wider text-[8.5px] transition-all text-left flex flex-col justify-between h-14"
                            >
                              <span className="line-clamp-1">{serv.name}</span>
                              <span className="text-teal-400 font-mono font-black mt-1 text-[9px]">{formatCurrency(serv.price)}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Right: Buffet Scale Weight Slider */}
                      <div className="bg-slate-950 p-4 rounded-xl border border-white/5 space-y-4">
                        <span className="text-[8.5px] font-black text-slate-400 tracking-wider uppercase block border-b border-white/5 pb-2">
                          ⚖️ BALANÇA INTEGRADA SELF-SERVICE (QUILO R$ 59,90)
                        </span>

                        <div className="space-y-3.5">
                          <div>
                            <label className="text-[8.5px] font-black uppercase text-slate-500 block mb-1">Digitar ou Ajustar Peso Bruto (Kg)</label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={restaurantScaleWeight}
                                onChange={e => setRestaurantScaleWeight(e.target.value)}
                                className="bg-slate-900 border border-white/5 text-[11px] font-bold text-white text-center px-3 py-1.5 rounded-xl outline-none w-24 font-mono"
                                placeholder="0,500"
                              />
                              <span className="text-[9px] text-slate-400 uppercase font-bold flex items-center">
                                * Multiplica por R$ 59,90 / Kg
                              </span>
                            </div>
                          </div>

                          {/* Calculated result box */}
                          {(() => {
                            let cleanStr = restaurantScaleWeight.trim().replace(",", ".");
                            let weight = parseFloat(cleanStr) || 0;
                            let pricePerKg = 59.90;
                            let platePrice = weight * pricePerKg;

                            return (
                              <div className="bg-slate-900 p-3 rounded-xl border border-white/5 flex flex-col sm:flex-row justify-between items-center gap-2">
                                <div className="text-left">
                                  <span className="text-[8px] font-black uppercase text-slate-500 block">Preço Calculado do Prato</span>
                                  <span className="font-mono text-xs font-black text-teal-400 block mt-0.5">
                                    {formatCurrency(platePrice)} <span className="text-[9px] text-slate-500 font-bold font-sans">({weight.toFixed(3)} Kg)</span>
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (platePrice <= 0) {
                                      showNotification("Ajuste o peso da balança primeiro!", "error");
                                      return;
                                    }
                                    injectItemToActiveLedger(`Almoço Buffet (${weight.toFixed(3)} Kg)`, 1, platePrice);
                                  }}
                                  className="bg-teal-650 hover:bg-teal-555 active:scale-95 text-slate-950 font-black text-[8.5px] px-3.5 py-2 uppercase tracking-wider rounded-lg transition-all cursor-pointer"
                                >
                                  Adicionar Prato Pesado 🧾
                                </button>
                                
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 7) COMÉRCIO GERAL TERMINAL */}
                {commercialSegment === "comercio_geral" && (
                  <motion.div
                    key="segment-comercio_geral"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-slate-900 border border-indigo-500/20 rounded-3xl p-5 md:p-6 space-y-5 shadow-xl"
                  >
                    <div className="flex flex-col md:flex-row gap-4 justify-between md:items-center border-b border-white/5 pb-4">
                      <div>
                        <h4 className="text-xs font-black uppercase text-indigo-400 tracking-widest flex items-center gap-1.5">
                          <ShoppingBasket className="w-4 h-4 text-indigo-500" />
                          Terminal de Caixa para Comércio Geral & Vendas Variadas
                        </h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                          Adicione artigos e utilidades gerais na notinha e simule digitação de código de barras acelerada!
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* Left: Quick Actions Grid */}
                      <div className="bg-slate-950 p-4 rounded-xl border border-white/5 space-y-3">
                        <span className="text-[8.5px] font-black text-slate-400 tracking-wider uppercase block border-b border-white/5 pb-1">
                          📦 ARTIGOS E UTILIDADES COMUNS
                        </span>
                        
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { name: "Cabo HDMI Reforçado 2m", price: 25.00 },
                            { name: "Garrafa Térmica Água 800ml", price: 45.00 },
                            { name: "Carregador Rápido Celular USB-C", price: 35.00 },
                            { name: "Conjunto Copos de Vidro", price: 18.00 },
                            { name: "Caneta Gel Preta Escrever", price: 4.50 },
                            { name: "Suporte Veicular Celular Magnet", price: 22.00 }
                          ].map(serv => (
                            <button
                              key={serv.name}
                              type="button"
                              onClick={() => injectItemToActiveLedger(serv.name, 1, serv.price)}
                              className="bg-slate-900 hover:bg-indigo-950/20 border border-white/5 hover:border-indigo-500/40 text-slate-350 hover:text-white px-2.5 py-2.5 rounded-xl font-bold uppercase tracking-wider text-[8.5px] transition-all text-left flex flex-col justify-between h-14"
                            >
                              <span className="line-clamp-1">{serv.name}</span>
                              <span className="text-indigo-400 font-mono font-black mt-1 text-[9px]">{formatCurrency(serv.price)}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Right: Quick simulated code block */}
                      <div className="bg-slate-950 p-4 rounded-xl border border-white/5 flex flex-col justify-between space-y-3">
                        <div>
                          <span className="text-[8.5px] font-black text-slate-400 tracking-wider uppercase block border-b border-white/5 pb-2">
                            🏷️ SIMULADOR DE SCANNER DE PRODUTOS
                          </span>
                          <p className="text-[9px] text-slate-405 uppercase font-bold tracking-wider leading-relaxed mt-1.5">
                            Selecione um artigo pré-cadastrado abaixo para capturar seu código e injetar no balanço:
                          </p>

                          <div className="space-y-1.5 mt-3 text-[9px] font-mono leading-tight">
                            {[
                              { label: "📱 Película Protetora Vidro", code: "7891000213", price: 15.00 },
                              { label: "🎧 Fone Ouvido Intrauricular", code: "7891000455", price: 49.90 },
                              { label: "🔋 Pilhas Alcalinas AA (4un)", code: "7891000677", price: 19.90 }
                            ].map(item => (
                              <button
                                key={item.code}
                                type="button"
                                onClick={() => {
                                  injectItemToActiveLedger(`${item.label} [Cód: ${item.code}]`, 1, item.price);
                                }}
                                className="w-full bg-slate-905 hover:bg-indigo-950/15 text-slate-300 hover:text-white border border-white/5 hover:border-indigo-500/20 p-2 rounded-xl flex items-center justify-between text-left text-[8.5px] font-bold uppercase transition-all"
                              >
                                <span>{item.label}</span>
                                <span className="text-indigo-400 font-bold">{formatCurrency(item.price)}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="p-3 bg-indigo-500/5 rounded-xl border border-indigo-500/10">
                          <span className="text-[8.5px] font-black uppercase text-indigo-400 block mb-1">💡 COMÉRCIO CENTRAL DE CONTROLE</span>
                          <p className="text-[8.5px] text-slate-405 leading-snug">
                            O Comércio Geral atende quaisquer necessidades rápidas de bazares, lojas de presentes e cosméticos com margem segura!
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 8) OFICINA MECÂNICA TERMINAL */}
                {commercialSegment === "mecanico" && (
                  <motion.div
                    key="segment-mecanico"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-slate-900 border border-cyan-500/20 rounded-3xl p-5 md:p-6 space-y-5 shadow-xl"
                  >
                    <div className="flex flex-col md:flex-row gap-4 justify-between md:items-center border-b border-white/5 pb-4">
                      <div>
                        <h4 className="text-xs font-black uppercase text-cyan-400 tracking-widest flex items-center gap-1.5">
                          <Wrench className="w-4 h-4 text-cyan-500" />
                          Terminal de Caixa para Oficina Mecânica & Peças
                        </h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                          Adicione serviços de reparação, manutenção preventiva e componentes mecânicos diretamente na notinha de serviços!
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* Left: Quick Actions Grid */}
                      <div className="bg-slate-950 p-4 rounded-xl border border-white/5 space-y-3">
                        <span className="text-[8.5px] font-black text-slate-400 tracking-wider uppercase block border-b border-white/5 pb-1">
                          🔧 SERVIÇOS E MÃO DE OBRA
                        </span>
                        
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { name: "Troca de Óleo & Filtro", price: 180.00 },
                            { name: "Alinhamento & Balanceamento 3D", price: 120.00 },
                            { name: "Revisão Geral de Freios", price: 150.00 },
                            { name: "Higienização Ar-Condicionado", price: 190.00 },
                            { name: "Injeção Eletrônica (Diagnóstico)", price: 90.00 },
                            { name: "Mão de Obra Geral (Hora)", price: 80.00 }
                          ].map(serv => (
                            <button
                              key={serv.name}
                              type="button"
                              onClick={() => injectItemToActiveLedger(serv.name, 1, serv.price)}
                              className="bg-slate-900 hover:bg-cyan-950/20 border border-white/5 hover:border-cyan-500/40 text-slate-350 hover:text-white px-2.5 py-2.5 rounded-xl font-bold uppercase tracking-wider text-[8.5px] transition-all text-left flex flex-col justify-between h-14"
                            >
                              <span className="line-clamp-1">{serv.name}</span>
                              <span className="text-cyan-400 font-mono font-black mt-1 text-[9px]">{formatCurrency(serv.price)}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Right: Quick simulated code block */}
                      <div className="bg-slate-950 p-4 rounded-xl border border-white/5 flex flex-col justify-between space-y-3">
                        <div>
                          <span className="text-[8.5px] font-black text-slate-400 tracking-wider uppercase block border-b border-white/5 pb-2">
                            ⚙️ COMPONENTES & PEÇAS DE REPOSIÇÃO
                          </span>
                          <p className="text-[9px] text-slate-405 uppercase font-bold tracking-wider leading-relaxed mt-1.5">
                            Selecione uma peça pré-cadastrada abaixo para injetar no balanço:
                          </p>

                          <div className="space-y-1.5 mt-3 text-[9px] font-mono leading-tight">
                            {[
                              { label: "🛑 Pastilha de Freio Dianteira", price: 145.00 },
                              { label: "🔋 Bateria Automotiva 60Ah", price: 380.00 },
                              { label: "🚘 Palheta Limpador de Para-brisa", price: 65.00 }
                            ].map(item => (
                              <button
                                key={item.label}
                                type="button"
                                onClick={() => {
                                  injectItemToActiveLedger(item.label, 1, item.price);
                                }}
                                className="w-full bg-slate-905 hover:bg-cyan-950/15 text-slate-300 hover:text-white border border-white/5 hover:border-cyan-500/20 p-2 rounded-xl flex items-center justify-between text-left text-[8.5px] font-bold uppercase transition-all"
                              >
                                <span>{item.label}</span>
                                <span className="text-cyan-400 font-bold">{formatCurrency(item.price)}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="p-3 bg-cyan-500/5 rounded-xl border border-cyan-500/10">
                          <span className="text-[8.5px] font-black uppercase text-cyan-400 block mb-1">💡 GESTÃO DE OFICINA INTEGRADA</span>
                          <p className="text-[8.5px] text-slate-405 leading-snug">
                            Registre peças e serviços de forma separada ou combinada para emitir orçamentos detalhados com total clareza e transparência para o cliente!
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ================= LEFT COLUMN: CLIENT LIST ================= */}
            <div className={`lg:col-span-4 bg-slate-900/60 border border-white/5 rounded-3xl p-4 flex flex-col gap-4 max-h-[80vh] overflow-y-auto ${
              mobileView === "list" ? "block" : "hidden lg:flex"
            }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <User className="w-4 h-4 text-pink-500" />
              Contatos / Cadastros ({filteredClients.length})
            </span>
            <div className="flex gap-1.5">
              <button
                onClick={() => setIsAddingClient(!isAddingClient)}
                className="text-[10px] font-black uppercase tracking-widest bg-pink-600/10 text-pink-400 hover:bg-pink-600 hover:text-white border border-pink-500/20 px-2 md:px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 active:scale-95"
              >
                <UserPlus className="w-3 h-3" />
                Cadastrar
              </button>
              <button
                onClick={handleResetAllBrechoData}
                type="button"
                className="text-[10px] font-black uppercase tracking-widest bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white border border-red-500/20 px-2 md:px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 active:scale-95"
                title="Apagar e zerar todo o orçamento de cálculos de forma definitiva"
              >
                <Trash2 className="w-3 h-3" />
                Zerar Tudo
              </button>
            </div>
          </div>

          {/* Quick Client Add Drawer */}
          <AnimatePresence>
            {isAddingClient && (
              <motion.form 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onSubmit={handleCreateClient}
                className="bg-slate-950 p-4 rounded-2xl border border-pink-500/20 space-y-3"
              >
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Nome do Registro</label>
                  <input
                    type="text"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    placeholder="Ex: Maria Cunha, Luciana Fornecedora..."
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none text-white focus:border-pink-500 placeholder:text-slate-600 mt-1 transition-all"
                    autoFocus
                  />
                </div>
                
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider block mb-1">Tipo de Registro / Fluxo Financeiro</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1 bg-slate-900 p-1 rounded-xl border border-white/5">
                    <button
                      type="button"
                      onClick={() => setNewClientType("buyer")}
                      className={`py-2 px-2 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all flex flex-col items-center justify-center text-center ${
                        newClientType === "buyer"
                          ? "bg-rose-600 text-white shadow-md shadow-rose-500/10"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <span>💵 ÁREA DE RECEBIMENTOS</span>
                      <span className="text-[7px] text-white/75 font-bold normal-case mt-0.5">(Pessoas devem me pagar / Eu vou receber)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewClientType("supplier")}
                      className={`py-2 px-2 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all flex flex-col items-center justify-center text-center ${
                        newClientType === "supplier"
                          ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/10"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <span>💳 ÁREA DE PAGAMENTOS</span>
                      <span className="text-[7px] text-white/75 font-bold normal-case mt-0.5">(Eu devo pagar a fornecedores/parceiros)</span>
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-1.5 bg-pink-600 text-white font-black text-[10px] uppercase tracking-widest rounded-lg hover:bg-pink-500"
                  >
                    Salvar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingClient(false);
                      setNewClientName("");
                      setNewClientType("buyer");
                    }}
                    className="px-3 py-1.5 bg-slate-800 text-slate-300 font-bold text-[10px] uppercase rounded-lg hover:bg-slate-700"
                  >
                    Cancelar
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Search bar */}
          <div className="relative group">
            <Search className="w-4 h-4 text-slate-500 group-focus-within:text-pink-500 absolute left-3 top-1/2 -translate-y-1/2 transition-colors duration-200" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar cliente por nome..."
              className="w-full bg-slate-950 border border-white/5 rounded-xl pl-9 pr-8 py-2.5 text-xs outline-none text-white focus:border-pink-500 focus:ring-1 focus:ring-pink-500/20 placeholder:text-slate-600 transition-all shadow-inner uppercase font-medium tracking-tight"
            />
            {searchQuery && (
              <button 
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-slate-500 hover:text-white absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-slate-800 transition-colors"
                title="Limpar busca"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* List of Clients Cards */}
          <div className="space-y-2 overflow-y-auto pr-1">
            {filteredClients.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-white/5 rounded-3xl space-y-2">
                <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">Nenhum registro encontrado</p>
                <p className="text-[10px] text-slate-600">Cadastre clientes ou fornecedores clicando em Cadastrar!</p>
              </div>
            ) : (
              filteredClients.map(client => {
                const totalDue = client.items.reduce((acc, item) => acc + ((Number(item.price) || 0) * (Number(item.quantity) || 0)), 0);
                const outstanding = totalDue - (Number(client.amountPaid) || 0);
                const totalPieces = client.items.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);
                const isSelected = client.id === selectedClientId;
                const isInlineEditing = inlineEditingClientId === client.id;

                if (isInlineEditing) {
                  return (
                    <div
                      key={client.id}
                      className="p-3 bg-slate-900 border border-pink-500 rounded-2xl shadow-lg space-y-2.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="space-y-1">
                        <span className="text-[9px] font-black uppercase text-pink-500 tracking-wider">Editar Nome do Registro</span>
                        <input
                          type="text"
                          value={inlineEditedName}
                          onChange={(e) => setInlineEditedName(e.target.value)}
                          className="w-full bg-slate-950 text-white font-bold text-xs rounded-xl px-2.5 py-2 border border-pink-500/40 outline-none uppercase"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleInlineRenameClient(client.id, inlineEditedName);
                            } else if (e.key === "Escape") {
                              setInlineEditingClientId(null);
                            }
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-end gap-2 text-[10px]">
                        <button
                          type="button"
                          onClick={() => setInlineEditingClientId(null)}
                          className="px-2 py-1 text-slate-400 hover:text-white font-black uppercase transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInlineRenameClient(client.id, inlineEditedName)}
                          className="px-3 py-1.5 bg-pink-600 hover:bg-pink-500 text-white font-black uppercase rounded-lg tracking-wider transition-all"
                        >
                          Salvar ✓
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={client.id}
                    onClick={() => {
                      setSelectedClientId(client.id);
                      setIsEditingClientName(false);
                    }}
                    className={`p-3 rounded-2xl cursor-pointer border transition-all flex items-center justify-between gap-3 group/card ${
                      isSelected 
                        ? "bg-slate-800 border-pink-500/40 shadow-lg" 
                        : "bg-slate-950/40 border-white/5 hover:border-white/10 hover:bg-slate-950/60"
                    }`}
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${outstanding <= 0 && totalDue > 0 ? "bg-emerald-500" : outstanding > 0 ? "bg-amber-500" : "bg-slate-600"}`} />
                        <h4 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedClientId(client.id);
                            setSummaryClientId(client.id);
                            setIsSummaryOpen(true);
                          }}
                          className="text-sm font-black text-white hover:text-pink-400 hover:underline cursor-pointer truncate uppercase tracking-tight group-hover/card:text-pink-400 transition-colors"
                          title="Clique para ver o Resumo Completo de tudo salvo"
                        >
                          {client.name}
                        </h4>
                      </div>
                      
                      {/* Customer stats */}
                      <div className="space-y-1 mt-2.5 text-[10px] bg-slate-950/30 p-2 rounded-xl border border-white/5">
                        <div className="flex items-center justify-between border-b border-white/5 pb-1 mb-1">
                          <span className="text-[7.5px] font-black uppercase text-slate-500">Fluxo:</span>
                          <span className={`text-[7.5px] font-black uppercase ${client.clientType === "supplier" ? "text-cyan-400" : "text-rose-400"}`}>
                            {client.clientType === "supplier" ? "💳 Área de Pagamentos" : "💵 Área de Recebimentos"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-slate-400 font-bold uppercase tracking-widest text-[8px]">
                          <span>Total de Itens:</span>
                          <span className="font-sans text-slate-300 font-bold">{totalPieces} {totalPieces === 1 ? "item" : "itens"}</span>
                        </div>

                        <div className="flex items-center justify-between text-slate-400 font-bold uppercase tracking-widest text-[8px]">
                          <span>{client.clientType === "supplier" ? "Custo Total do Recibo:" : "Valor Total do Orçamento:"}</span>
                          <span className="font-mono text-slate-200 font-black">{formatCurrency(totalDue)}</span>
                        </div>

                        <div className="flex items-center justify-between text-emerald-400 font-bold uppercase tracking-widest text-[8px]">
                          <span>{client.clientType === "supplier" ? "Pago do meu Bolso:" : "Já Recebido (Sinal):"}</span>
                          <span className="font-mono text-emerald-400 font-black">{formatCurrency(Number(client.amountPaid || 0))}</span>
                        </div>

                        <div className="flex items-center justify-between font-bold uppercase tracking-widest text-[8px] border-t border-white/5 pt-1 mt-1">
                          {client.clientType === "supplier" ? (
                            <>
                              <span className={outstanding > 0 ? "text-amber-400" : "text-emerald-500 font-black"}>
                                EU DEVO PAGAR (Saldo):
                              </span>
                              <span className={`font-mono font-black ${outstanding > 0 ? "text-amber-400 text-[10px]" : "text-emerald-500"}`}>
                                {outstanding <= 0 ? "Totalmente Pago ✓" : formatCurrency(outstanding)}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className={outstanding > 0 ? "text-rose-400" : "text-emerald-500 font-black"}>
                                EU VOU RECEBER (Saldo):
                              </span>
                              <span className={`font-mono font-black ${outstanding > 0 ? "text-rose-400 text-[10px]" : "text-emerald-500"}`}>
                                {outstanding <= 0 ? "Recebido Total ✓" : formatCurrency(outstanding)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedClientId(client.id);
                          setSummaryClientId(client.id);
                          setIsSummaryOpen(true);
                        }}
                        className="mt-2 inline-flex items-center gap-1 text-[9px] font-black text-pink-400 hover:text-pink-300 uppercase tracking-widest bg-pink-500/10 hover:bg-pink-500/20 px-2 py-0.5 rounded-lg transition-all"
                      >
                        <FileText className="w-3 h-3" />
                        Ver Resumo Salvo 📋
                      </button>
                    </div>

                    <div className="text-right flex flex-col items-end gap-1.5 self-stretch justify-between">
                      {outstanding > 0 ? (
                        <span className="text-[8px] font-black uppercase bg-rose-500/10 text-rose-400 px-1.5 py-0.5 rounded border border-rose-500/20 tracking-widest">
                          Pendente
                        </span>
                      ) : totalDue > 0 ? (
                        <span className="text-[8px] font-black uppercase bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20 tracking-widest">
                          Quitada ✓
                        </span>
                      ) : (
                        <span className="text-[8px] font-bold uppercase bg-slate-800/50 text-slate-500 px-1.5 py-0.5 rounded border border-white/5 tracking-widest">
                          Sem itens
                        </span>
                      )}

                      <div className="flex items-center gap-1 opacity-60 group-hover/card:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedClientId(client.id);
                            setInlineEditingClientId(client.id);
                            setInlineEditedName(client.name);
                          }}
                          className="text-slate-500 hover:text-pink-500 p-1 rounded hover:bg-pink-500/10 transition-colors"
                          title="Editar nome"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClient(client.id, client.name);
                          }}
                          className="text-slate-500 hover:text-red-500 p-1 rounded hover:bg-red-500/10 transition-colors"
                          title="Remover cliente"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ================= RIGHT COLUMN: INTERACTIVE WORKBOOK AND CALCULATOR ================= */}
        <div className={`lg:col-span-8 space-y-6 ${
          mobileView === "details" ? "block" : "hidden lg:block"
        }`}>
          <AnimatePresence mode="wait">
            {!activeClient ? (
              /* State: No selected client */
              <motion.div
                key="no-client"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="bg-slate-900/40 border border-dashed border-white/5 rounded-3xl p-12 text-center flex flex-col items-center justify-center min-h-[50vh]"
              >
                <div className="w-16 h-16 bg-pink-500/10 rounded-full flex items-center justify-center text-pink-500 mb-4 animate-bounce">
                  <User className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-black uppercase text-white tracking-wider">Abra a sua Notinha Comercial!</h3>
                <p className="text-sm text-slate-400 mt-2 max-w-sm mx-auto">
                  Por favor, escolha ou cadastre uma pessoa na barra lateral para começar a registrar produtos, serviços, valores e emitir os seus recibos profissionais!
                </p>
                <button
                  onClick={() => setIsAddingClient(true)}
                  className="mt-6 px-6 py-3 bg-pink-600 text-white font-black text-[11px] uppercase tracking-widest rounded-xl hover:bg-pink-500 transition-all flex items-center gap-2 active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  Cadastrar Novo Orçamento / Recibo
                </button>
              </motion.div>
            ) : (
              /* State: Active Notebook view of Client */
              <motion.div
                key={activeClient.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="space-y-6"
              >
                {/* Mobile Back Button */}
                <div className="lg:hidden flex items-center justify-between pb-1">
                  <button
                    type="button"
                    onClick={() => setMobileView("list")}
                    className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-pink-400 bg-pink-500/10 border border-pink-500/25 rounded-2xl hover:bg-pink-500/20 hover:text-pink-300 transition-all active:scale-95 shadow-md shadow-pink-600/5 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4 shrink-0 text-pink-500" />
                    Ver Lista de Clientes
                  </button>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-950 px-3 py-1.5 rounded-xl border border-white/5">
                    Modo Edição
                  </span>
                </div>

                {/* 📋 Section Title: Active Client info */}
                <div className="bg-slate-900 border border-white/5 rounded-3xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
                  <div className="space-y-1">
                    {isEditingClientName ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editedClientName}
                          onChange={(e) => setEditedClientName(e.target.value)}
                          className="bg-slate-950 text-white font-black text-lg border border-pink-500 rounded-lg px-2.5 py-1 outline-none uppercase"
                          autoFocus
                        />
                        <button
                          onClick={handleRenameClient}
                          className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-black uppercase"
                        >
                          Salvar
                        </button>
                        <button
                          onClick={() => setIsEditingClientName(false)}
                          className="bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-bold uppercase"
                        >
                          X
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <h3 
                          onClick={() => {
                            setSummaryClientId(activeClient.id);
                            setIsSummaryOpen(true);
                          }}
                          className="text-lg font-black uppercase tracking-tight text-white cursor-pointer hover:text-pink-400 transition-colors flex items-center gap-1.5 group hover:underline"
                          title="Clique para ver o Resumo Geral de tudo salvo"
                        >
                          {activeClient.name}
                        </h3>
                        <button
                          type="button"
                          onClick={() => {
                            setEditedClientName(activeClient.name);
                            setIsEditingClientName(true);
                          }}
                          className="text-slate-500 hover:text-pink-500 p-1.5 rounded-lg hover:bg-white/5 transition-all"
                          title="Editar nome do cadastro"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      Cadastrado em {activeClient.createdAt}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
                        activeClient.clientType === "supplier" 
                          ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" 
                          : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                      }`}>
                        {activeClient.clientType === "supplier" ? "💳 Área de Pagamentos (Eu Devo pagar)" : "💵 Área de Recebimentos (Clientes me devem / Eu que vou receber)"}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const nextType = activeClient.clientType === "supplier" ? "buyer" : "supplier";
                          setClients(prev => prev.map(c => {
                            if (c.id === activeClient.id) {
                              return { ...c, clientType: nextType };
                            }
                            return c;
                          }));
                          showNotification(`Alterado para ${nextType === "supplier" ? "Área de Pagamentos (Eu Devo)" : "Área de Recebimentos (Eu vou Receber)"}`, "info");
                        }}
                        className="text-[8px] font-black uppercase tracking-widest text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-1.5 py-0.5 rounded border border-white/5 cursor-pointer active:scale-95 transition-all"
                        title="Alternar entre Área de Recebimento e Área de Pagamento"
                      >
                        Mudar Fluxo 🔄
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setShowEmitenteConfig(!showEmitenteConfig)}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 active:scale-95 border ${
                        showEmitenteConfig 
                          ? "bg-rose-600 text-white border-rose-500" 
                          : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border-white/5"
                      }`}
                      title="Clique para configurar o nome do seu negócio, CNPJ, telefone e endereço comercial"
                    >
                      <Settings className="w-4 h-4" />
                      Dados do Recibo ⚙️
                    </button>

                    <button
                      onClick={() => {
                        setSummaryClientId(activeClient.id);
                        setIsSummaryOpen(true);
                      }}
                      className="px-4 py-2 bg-pink-600 text-white hover:bg-pink-500 shadow-lg shadow-pink-600/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 active:scale-95"
                    >
                      <FileText className="w-4 h-4" />
                      Resumo Completo 📋
                    </button>

                    <button
                      onClick={handleShareWhatsApp}
                      className="px-4 py-2 bg-green-600/10 text-green-400 hover:bg-green-600 hover:text-white border border-green-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 active:scale-95"
                    >
                      <Share2 className="w-4 h-4" />
                      Enviar via WhatsApp
                    </button>

                    <button
                      onClick={() => handleDownloadPDF(false)}
                      className="px-4 py-2 bg-pink-600/10 text-pink-400 hover:bg-pink-600 hover:text-white border border-pink-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      Baixar PDF
                    </button>

                    <button
                      onClick={() => handleDownloadPDF(true)}
                      className="px-4 py-2 bg-pink-600/10 text-pink-400 hover:bg-pink-600 hover:text-white border border-pink-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                    >
                      <Share2 className="w-4 h-4" />
                      Compartilhar PDF (PWA)
                    </button>
                  </div>
                </div>

                {/* ⚙️ Emitente Configuration Collapsible Panel */}
                <AnimatePresence>
                  {showEmitenteConfig && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl overflow-hidden font-sans"
                    >
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <div className="flex items-center gap-2">
                          <Settings className="w-4 h-4 text-pink-500" />
                          <h4 className="text-xs font-black uppercase text-slate-200 tracking-wider">Configurar Dados Comerciais do Emitente (Sua Loja/Serviço)</h4>
                        </div>
                        <span className="text-[8px] font-black bg-pink-500/10 text-pink-400 px-2 py-0.5 rounded-lg uppercase">
                          Suporte a Valor Comercial de Papelaria
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Preencha as informações abaixo para que seus orçamentos e recibos em PDF / WhatsApp venham com cabeçalho oficial de emissor, assinaturas de validade, telefone de contato e endereço comercial, exatamente como nos bloquinhos vendidos em papelarias!
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">
                            Nome Emitente / Nome da Loja / Seu Nome
                          </label>
                          <input
                            type="text"
                            value={emitenteNome}
                            onChange={(e) => setEmitenteNome(e.target.value)}
                            placeholder="Ex: Confecções Estrela, Brechó da Maria, Serviços Gerais..."
                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-700 focus:border-pink-500 transition-colors duration-150 outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">
                            CNPJ ou CPF do Emitente
                          </label>
                          <input
                            type="text"
                            value={emitenteCnpjCpf}
                            onChange={(e) => setEmitenteCnpjCpf(e.target.value)}
                            placeholder="Ex: 12.345.678/0001-99 ou 123.456.789-00"
                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-700 focus:border-pink-500 transition-colors duration-150 outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">
                            Telefone / WhatsApp Comercial
                          </label>
                          <input
                            type="text"
                            value={emitenteTelefone}
                            onChange={(e) => setEmitenteTelefone(e.target.value)}
                            placeholder="Ex: (11) 99999-9999"
                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-700 focus:border-pink-500 transition-colors duration-150 outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">
                            Endereço / Localidade
                          </label>
                          <input
                            type="text"
                            value={emitenteEndereco}
                            onChange={(e) => setEmitenteEndereco(e.target.value)}
                            placeholder="Ex: Av. Central, 123 - Centro, São Paulo - SP"
                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-700 focus:border-pink-500 transition-colors duration-150 outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2 justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setEmitenteNome("");
                            setEmitenteCnpjCpf("");
                            setEmitenteTelefone("");
                            setEmitenteEndereco("");
                          }}
                          className="px-4 py-2 bg-slate-950 text-slate-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/5"
                        >
                          Limpar Tudo
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveEmitente}
                          className="px-5 py-2 bg-pink-600 text-white hover:bg-pink-500 shadow-lg shadow-pink-600/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                          Salvar Dados de Emissor ✓
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>


                {/* 📊 PAINEL DE ACERTOS RÁPIDOS: Comprou / Pago / Resta (TUDO SEPARADOS E EDITÁVEIS PARA A CLIENTE ATIVA) */}
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Card 1: Quanto Comprou (Faturamento) */}
                  <div className="bg-slate-900 border border-pink-500/10 rounded-2xl p-4 flex flex-col justify-between shadow-lg relative group transition-all hover:border-pink-500/30">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-pink-500 tracking-wider flex items-center gap-1">
                        {activeClient.clientType === "supplier" ? "💵 VALOR DO GASTO / DESPESA ✏️" : "💵 VALOR DO ORÇAMENTO / CONTRATO ✏️"}
                      </span>
                      {!isEditingCardTotal && (
                        <button
                          type="button"
                          onClick={startEditingTotal}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/5 rounded transition-all text-pink-400"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    
                    <div className="flex items-baseline justify-between mt-1.5 min-h-8">
                       {isEditingCardTotal ? (
                        <div className="flex items-center gap-1 w-full">
                          <span className="text-xs font-black text-white font-mono">R$</span>
                          <input
                            type="text"
                            autoFocus
                            value={cardTotalInput}
                            onChange={(e) => setCardTotalInput(e.target.value)}
                            onBlur={() => {
                              handleUpdateTotalDirectly(cardTotalInput);
                              setIsEditingCardTotal(false);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleUpdateTotalDirectly(cardTotalInput);
                                setIsEditingCardTotal(false);
                              } else if (e.key === "Escape") {
                                setIsEditingCardTotal(false);
                              }
                            }}
                            className="w-full bg-slate-950 border border-pink-500/50 rounded px-2 py-0.5 text-xs outline-none text-white font-mono font-black placeholder:text-slate-700"
                          />
                        </div>
                      ) : (
                        <span 
                          onClick={startEditingTotal}
                          className="text-xl font-black text-white font-mono cursor-pointer hover:text-pink-400 select-none pb-0.5 border-b border-dashed border-white/20 hover:border-pink-400 transition-all"
                          title="Clique para editar o valor total"
                        >
                          {formatCurrency(activeCustomerSums.total)}
                        </span>
                      )}
                      
                      {!isEditingCardTotal && (
                        <span className="text-[9px] font-bold text-slate-500 uppercase">
                          {activeCustomerSums.piecesCount} {activeCustomerSums.piecesCount === 1 ? 'item' : 'itens'}
                        </span>
                      )}
                    </div>
                    <span className="text-[8px] text-slate-500 font-bold uppercase mt-1">
                      {activeClient.clientType === "supplier" ? "Soma total de gastos, compras ou serviços prestados para você" : "Valor total que o cliente deve te pagar por esses produtos ou serviços"}
                    </span>
                  </div>

                  {/* Card 2: Pago / Dinheiro Recebido */}
                  <div className="bg-slate-900 border border-emerald-500/10 rounded-2xl p-4 flex flex-col justify-between shadow-lg relative group transition-all hover:border-emerald-500/30">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1">
                        {activeClient.clientType === "supplier" ? "💳 QUANTO JÁ PAGUEI (DO BOLSO) ✏️" : "💳 QUANTO JÁ RECEBI DO CLIENTE ✏️"}
                      </span>
                      {!isEditingCardPaid && (
                        <button
                          type="button"
                          onClick={startEditingPaid}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/5 rounded transition-all text-emerald-400"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    
                    <div className="flex items-baseline justify-between mt-1.5 min-h-8">
                      {isEditingCardPaid ? (
                        <div className="flex items-center gap-1 w-full">
                          <span className="text-xs font-black text-emerald-400 font-mono">R$</span>
                          <input
                            type="text"
                            autoFocus
                            value={cardPaidInput}
                            onChange={(e) => setCardPaidInput(e.target.value)}
                            onBlur={() => {
                              handleUpdatePayment(cardPaidInput);
                              setIsEditingCardPaid(false);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleUpdatePayment(cardPaidInput);
                                setIsEditingCardPaid(false);
                              } else if (e.key === "Escape") {
                                setIsEditingCardPaid(false);
                              }
                            }}
                            className="w-full bg-slate-950 border border-emerald-500/50 rounded px-2 py-0.5 text-xs outline-none text-emerald-400 font-mono font-black placeholder:text-slate-700"
                          />
                        </div>
                      ) : (
                        <span 
                          onClick={startEditingPaid}
                          className="text-xl font-black text-emerald-400 font-mono cursor-pointer hover:text-emerald-300 select-none pb-0.5 border-b border-dashed border-emerald-500/20 hover:border-emerald-400 transition-all font-bold"
                          title={activeClient.clientType === "supplier" ? "Clique para editar o valor pago por você" : "Clique para editar o quanto o cliente já te pagou"}
                        >
                          {formatCurrency(activeCustomerSums.paid)}
                        </span>
                      )}
                      
                      {!isEditingCardPaid && (
                        <span className="text-[9px] font-bold text-emerald-500/70 uppercase font-mono">Lançado</span>
                      )}
                    </div>
                    <span className="text-[8px] text-slate-500 font-bold uppercase mt-1">
                      {activeClient.clientType === "supplier" ? "Valor parcial ou integral que você já tirou do bolso para pagar essa despesa" : "Valor recebido em mãos, sinal ou PIX que você já deu baixa"}
                    </span>
                  </div>

                  {/* Card 3: Resta Pagar (Falta Cobrar / Devendo) */}
                  <div className={`bg-slate-900 border rounded-2xl p-4 flex flex-col justify-between shadow-lg transition-all relative group hover:border-rose-500/40 ${
                    activeCustomerSums.pending === 0 && activeCustomerSums.total > 0
                      ? "border-emerald-500/30 ring-1 ring-emerald-500/20"
                      : activeCustomerSums.pending < 0
                      ? "border-emerald-500/30 ring-1 ring-emerald-500/20"
                      : "border-rose-500/20 ring-1 ring-rose-500/10"
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-rose-400 tracking-wider flex items-center gap-1">
                        {activeClient.clientType === "supplier" ? "⚠️ SALDO RESTANTE: EU DEVO pagar ✏️" : "⚠️ SALDO RESTANTE: EU VOU RECEBER ✏️"}
                      </span>
                      {!isEditingCardPending && (
                        <button
                          type="button"
                          onClick={startEditingPending}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/5 rounded transition-all text-rose-400"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    
                    <div className="flex items-baseline justify-between mt-1.5 min-h-8">
                      {isEditingCardPending ? (
                        <div className="flex items-center gap-1 w-full">
                          <span className={`text-xs font-black font-mono ${activeCustomerSums.pending < 0 ? "text-emerald-400" : "text-rose-400"}`}>R$</span>
                          <input
                            type="text"
                            autoFocus
                            value={cardPendingInput}
                            onChange={(e) => setCardPendingInput(e.target.value)}
                            onBlur={() => {
                              handleSaveCardPending(cardPendingInput);
                              setIsEditingCardPending(false);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleSaveCardPending(cardPendingInput);
                                setIsEditingCardPending(false);
                              } else if (e.key === "Escape") {
                                setIsEditingCardPending(false);
                              }
                            }}
                            className={`w-full bg-slate-950 border rounded px-2 py-0.5 text-xs outline-none font-mono font-black placeholder:text-slate-700 ${
                              activeCustomerSums.pending < 0 ? "border-emerald-500/50 text-emerald-400" : "border-rose-500/50 text-rose-400"
                            }`}
                          />
                        </div>
                      ) : (
                        activeCustomerSums.pending === 0 && activeCustomerSums.total > 0 ? (
                          <span 
                            onClick={startEditingPending}
                            className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1 cursor-pointer select-none border-b border-dashed border-emerald-500/20 hover:border-emerald-400 transition-all font-mono"
                            title="Clique para ajustar o valor restante"
                          >
                            ✓ TUDO QUITADO!
                          </span>
                        ) : activeCustomerSums.pending < 0 ? (
                          <span 
                            onClick={startEditingPending}
                            className="text-xl font-black text-emerald-400 font-mono cursor-pointer hover:text-emerald-300 select-none pb-0.5 border-b border-dashed border-emerald-500/20 hover:border-emerald-400 transition-all"
                            title="Clique para ajustar o crédito"
                          >
                            {formatCurrency(Math.abs(activeCustomerSums.pending))}
                          </span>
                        ) : (
                          <span 
                            onClick={startEditingPending}
                            className="text-xl font-black text-rose-400 font-mono cursor-pointer hover:text-rose-400 select-none pb-0.5 border-b border-dashed border-rose-500/20 hover:border-rose-400 transition-all"
                            title="Clique para ajustar o valor restante"
                          >
                            {formatCurrency(activeCustomerSums.pending)}
                          </span>
                        )
                      )}
                      
                      {!isEditingCardPending && (
                        <span className="text-[9px] font-bold text-slate-400 uppercase font-sans tracking-wide">
                          {activeCustomerSums.pending === 0 && activeCustomerSums.total > 0
                            ? "Quem se deve pagou ✓"
                            : activeCustomerSums.pending < 0
                            ? (activeClient.clientType === "supplier" ? "Temos Crédito" : "Crédito do Cliente")
                            : (activeClient.clientType === "supplier" ? "Saldo devedor" : "Saldo devedor")
                          }
                        </span>
                      )}
                    </div>
                    <span className="text-[8px] text-slate-500 font-semibold uppercase mt-1">
                      {activeClient.clientType === "supplier" ? "O que você ainda deve desbancar para quitar essa conta de pagamento" : "O que resta para o cliente te pagar para fechar essa conta de recebimento"}
                    </span>
                  </div>
                </div>

                {/* Grid Layout inside Customer Panel - Input forms & Calculadora */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  
                  {/* LEFT: Quick Addition form */}
                  <div className="md:col-span-7 bg-slate-900/60 border border-white/5 rounded-3xl p-5 space-y-4">
                    <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                      <ShoppingBag className="w-4 h-4 text-pink-500" />
                      <span className="text-xs font-black uppercase text-slate-300">
                        {activeClient.clientType === "supplier" ? "📊 Lançar Saída / Item a Pagar" : "📊 Lançar Entrada / Serviço / Venda"}
                      </span>
                    </div>

                    <form onSubmit={handleAddItem} className="space-y-4">
                      {/* Clothing Description Input */}
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                          {activeClient.clientType === "supplier" ? "Descrição da Despesa / Produto ou Pagamento" : "Descrição do Produto, Serviço, Parcela ou Item de Venda"}
                        </label>
                        <input
                          type="text"
                          value={itemName}
                          onChange={(e) => setItemName(e.target.value)}
                          placeholder={activeClient.clientType === "supplier" ? "Ex: Compra de matéria-prima, comissão, frete..." : "Ex: Prestação de serviço, produto, diária de aluguel..."}
                          className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none text-white focus:border-pink-500 placeholder:text-slate-700 mt-1 transition-all"
                        />
                      </div>

                      {/* Quantity & Price side-by-side */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                            Quantidade
                          </label>
                          <div className="flex items-center gap-1 mt-1">
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={itemQty}
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, "");
                                setItemQty(val === "" ? 0 : parseInt(val));
                              }}
                              onBlur={() => {
                                if (!itemQty || itemQty < 1) {
                                  setItemQty(1);
                                }
                              }}
                              className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none text-white focus:border-pink-500 font-mono"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                            Valor Unitário (R$)
                          </label>
                          <div className="relative mt-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-600">R$</span>
                            <input
                              type="text"
                              value={itemPrice}
                              onChange={(e) => setItemPrice(e.target.value)}
                              placeholder="0,00"
                              className="w-full bg-slate-950 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none text-white focus:border-pink-500 placeholder:text-slate-700 transition-all"
                            />
                          </div>
                          <span className="text-[8px] text-slate-500 mt-1 block">
                            💡 Use a calculadora ao lado e clique em Lançar Preço!
                          </span>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-3 bg-pink-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-pink-500 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-pink-600/10"
                      >
                        <Plus className="w-4 h-4" />
                        Adicionar ao Registro
                      </button>
                    </form>
                  </div>

                  {/* RIGHT: Embedded Tactile Calculator */}
                  <div className="md:col-span-5 bg-slate-900 border border-white/5 rounded-3xl p-4 flex flex-col justify-between shadow-xl">
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <span className="text-xs font-black uppercase text-slate-300 flex items-center gap-1.5">
                          <Calculator className="w-4 h-4 text-emerald-500" />
                          Soma Brechó
                        </span>
                        <span className="text-[8px] font-black bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded uppercase">
                          Prática
                        </span>
                      </div>

                      {/* Display */}
                      <div className="bg-slate-950 rounded-2xl p-3 border border-white/5 shadow-inner">
                        <div className="text-right h-4.5 text-slate-500 text-[10px] font-bold uppercase tracking-widest truncate">
                          {calcExpression || "0"}
                        </div>
                        <div className="text-right h-8 text-white text-xl font-black truncate font-mono mt-1">
                          {calcDisplay}
                        </div>
                      </div>

                      {/* Calculator grid (Compact with operators + - * /) */}
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          "C", "DEL", "/", "*",
                          "7", "8", "9", "-",
                          "4", "5", "6", "+",
                          "1", "2", "3", ",",
                          "0", "00", "="
                        ].map(char => {
                          const isEquals = char === "=";
                          const isClearOrDel = char === "C" || char === "DEL";
                          const isOperator = ["/", "*", "-", "+"].includes(char);
                          
                          return (
                            <button
                              key={char}
                              type="button"
                              onClick={() => handleCalcPress(char)}
                              className={`h-9 text-xs font-black rounded-lg flex items-center justify-center transition-all active:scale-90 ${
                                isEquals 
                                  ? "bg-emerald-600 text-white col-span-2 hover:bg-emerald-500" 
                                  : isClearOrDel
                                  ? "bg-slate-800 text-red-400 hover:bg-slate-700"
                                  : isOperator
                                  ? "bg-slate-800 text-emerald-400 hover:bg-slate-700 font-black"
                                  : "bg-slate-950 text-white hover:bg-slate-800 border border-white/5 font-mono"
                              }`}
                            >
                              {char === "*" ? "x" : char}
                            </button>
                          );
                        })}
                      </div>

                      {/* Insertion actions */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                        <button
                          type="button"
                          onClick={useCalcValueForPrice}
                          className="py-2 bg-emerald-600/10 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border border-emerald-500/20"
                        >
                          Lançar no Preço
                        </button>
                        <button
                          type="button"
                          onClick={useCalcValueForPayment}
                          className="py-2 bg-emerald-600/10 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border border-emerald-500/20"
                        >
                          Lançar em Pago
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ================= INTERACTIVE EXCEL TABLE ("Visualização Tipo Excel") ================= */}
                <div className="bg-slate-900 border border-white/5 rounded-3xl p-5 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-xs font-black uppercase text-slate-300 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-pink-500" />
                      {activeClient.clientType === "supplier" ? "Planilha de Itens a Pagar (Despesas)" : "Planilha de Itens do Orçamento (Recebimentos)"}
                    </span>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                      Marque OK para indicar item Concluído / Entregue
                    </span>
                  </div>

                  {activeClient.items.length === 0 ? (
                    <div className="text-center py-10 border border-dashed border-white/5 rounded-2xl">
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                        Planilha Vazia!
                      </p>
                      <p className="text-[10px] text-slate-600 mt-1">
                        Utilize o formulário acima para registrar produtos, serviços ou despesas neste orçamento.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-white/5">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-950 border-b border-white/10 text-[9px] text-slate-400 font-black uppercase tracking-widest">
                            <th className="p-3 text-center w-12">OK?</th>
                            <th className="p-3">Produto / Serviço / Descrição</th>
                            <th className="p-3 text-center w-16">Qtd</th>
                            <th className="p-3 text-right">Valor Unitário</th>
                            <th className="p-3 text-right">Valor Total</th>
                            <th className="p-3 text-center w-12">Remover</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 bg-slate-950/30">
                          {activeClient.items.map(item => (
                            <tr key={item.id} className="hover:bg-slate-900/60 transition-colors">
                              {/* Quadrado para marcar OK / Entregue */}
                              <td className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleToggleDelivery(item.id)}
                                  className="p-1 rounded text-slate-400 hover:text-white transition-colors"
                                >
                                  {item.delivered ? (
                                    <div className="p-1 bg-green-500 rounded text-slate-950 inline-flex shadow-lg shadow-green-500/20">
                                      <Check className="w-3.5 h-3.5 stroke-[4px]" />
                                    </div>
                                  ) : (
                                    <div className="p-1 bg-slate-900 border border-white/20 rounded inline-flex">
                                      <div className="w-3.5 h-3.5" />
                                    </div>
                                  )}
                                </button>
                              </td>

                              {/* Descrição da roupa */}
                              <td className="p-3 font-semibold text-white uppercase tracking-tight">
                                <div className="flex flex-col">
                                  <input
                                    type="text"
                                    key={item.id + "_name_" + item.name}
                                    defaultValue={item.name}
                                    onBlur={(e) => handleUpdateItemName(item.id, e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        (e.target as any).blur();
                                      }
                                    }}
                                    className="w-full bg-slate-950/40 border border-transparent hover:border-white/10 focus:border-pink-500/50 focus:bg-slate-900 rounded-xl px-2 py-1 text-white font-bold uppercase tracking-tight text-xs focus:outline-none transition-all placeholder-slate-600"
                                    placeholder="Descrição do item"
                                  />
                                  <span className={`text-[9px] font-black tracking-wider uppercase px-2 mt-0.5 ${item.delivered ? "text-emerald-400" : "text-amber-500"}`}>
                                    {item.delivered ? "✓ Concluído / Entregue" : "⏳ Pendente"}
                                  </span>
                                </div>
                              </td>

                              {/* Quantidade */}
                              <td className="p-2 text-center">
                                <div className="inline-flex items-center gap-1.5 bg-slate-950/80 border border-white/5 rounded-xl p-1 justify-center">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateItemQty(item.id, (Number(item.quantity) || 0) - 1)}
                                    className="w-5 h-5 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-xs font-black"
                                    title="Diminuir"
                                  >
                                    -
                                  </button>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    key={item.id + "_qty_" + item.quantity}
                                    defaultValue={item.quantity}
                                    onBlur={(e) => {
                                      const val = e.target.value.replace(/\D/g, "");
                                      handleUpdateItemQty(item.id, val === "" ? 1 : parseInt(val));
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        (e.target as any).blur();
                                      }
                                    }}
                                    className="w-8 bg-transparent text-center text-white font-mono text-xs font-black focus:outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateItemQty(item.id, (Number(item.quantity) || 0) + 1)}
                                    className="w-5 h-5 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-xs font-black"
                                    title="Aumentar"
                                  >
                                    +
                                  </button>
                                </div>
                              </td>

                              {/* Valor unitário */}
                              <td className="p-3 text-right">
                                <div className="inline-flex items-center justify-end gap-0.5 text-slate-300 font-mono bg-slate-950/40 border border-transparent hover:border-white/10 focus-within:border-pink-500/50 focus-within:bg-slate-900 rounded-xl px-2 py-1 transition-all">
                                  <span className="text-slate-500 font-black text-[10px] select-none">R$</span>
                                  <input
                                    type="text"
                                    key={item.id + "_price_" + item.price}
                                    defaultValue={(Number(item.price) || 0).toFixed(2).replace(".", ",")}
                                    onBlur={(e) => handleUpdateItemPrice(item.id, e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        (e.target as any).blur();
                                      }
                                    }}
                                    className="w-16 bg-transparent text-right text-white font-mono font-bold text-xs focus:outline-none"
                                  />
                                </div>
                              </td>

                              {/* Valor total do lote desse item */}
                              <td className="p-3 text-right font-black text-white font-mono">
                                {formatCurrency(item.price * item.quantity)}
                              </td>

                              {/* Remover item */}
                              <td className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteItem(item.id, item.name)}
                                  className="text-slate-600 hover:text-red-500 p-1 rounded hover:bg-red-500/10 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>

                        {/* Summary Grid in Footer inside Table */}
                        <tfoot className="bg-slate-950 border-t border-white/10 font-bold divide-y divide-white/5">
                          {/* Subtotal */}
                          <tr>
                            <td colSpan={4} className="p-3 text-right text-slate-400 uppercase font-black text-[9px] tracking-widest">
                              {activeClient.clientType === "supplier" ? "Custo Total (A Pagar)" : "Subtotal do Orçamento"}
                            </td>
                            <td className="p-3 text-right font-black text-white font-mono text-sm">
                              {formatCurrency(activeCustomerSums.total)}
                            </td>
                            <td></td>
                          </tr>

                          {/* Quanto ela pagou (Editable Input inside spreadsheet) */}
                          <tr>
                            <td colSpan={4} className="p-3 text-right text-slate-400 uppercase font-black text-[9px] tracking-widest align-middle">
                              {activeClient.clientType === "supplier" ? "TOTAL JÁ PAGO POR MIM (R$)" : "VALOR RECEBIDO / SINAL (R$)"}
                            </td>
                            <td className="p-3 text-right align-middle">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleSetPaidFully(activeCustomerSums.total)}
                                  className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[7px] font-black uppercase rounded hover:bg-emerald-500 hover:text-slate-950 transition-all"
                                  title="Marcar como Pago integral"
                                >
                                  Quitar
                                </button>
                                <div className="relative inline-block w-24">
                                  <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-black">R$</span>
                                  <input
                                    type="text"
                                    key={activeClient.id + "_paid_" + activeClient.amountPaid}
                                    defaultValue={(Number(activeClient.amountPaid) || 0).toFixed(2).replace(".", ",")}
                                    onBlur={(e) => handleUpdatePayment(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        (e.target as any).blur();
                                      }
                                    }}
                                    placeholder="0,00"
                                    className="w-full bg-slate-900 border border-white/10 rounded-lg pl-5 pr-1 py-1 text-right text-xs text-white font-black font-mono outline-none focus:border-pink-500"
                                  />
                                </div>
                              </div>
                            </td>
                            <td></td>
                          </tr>

                          {/* Valor Pendente */}
                          <tr>
                            <td colSpan={4} className="p-3 text-right text-slate-400 uppercase font-black text-[9px] tracking-widest">
                              {activeCustomerSums.pending < 0 
                                ? (activeClient.clientType === "supplier" ? "Nosso Crédito com Fornecedor" : "Crédito do Cliente")
                                : (activeClient.clientType === "supplier" ? "SALDO QUE EU DEVO PAGAR" : "SALDO QUE EU VOU RECEBER")
                              }
                            </td>
                            <td className="p-3 text-right val-total">
                              <span className={`font-black font-mono text-sm px-2 py-1 rounded-lg ${
                                activeCustomerSums.pending === 0 
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                                  : activeCustomerSums.pending < 0
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                              }`}>
                                {formatCurrency(Math.abs(activeCustomerSums.pending))}
                              </span>
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>

                {/* ================= SCHEDULE REMINDER IN AGENDA ================= */}
                <div className="bg-slate-900 border border-white/5 rounded-3xl p-5 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-xs font-black uppercase text-slate-300 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-pink-500" />
                      Agendar Lembrete de Pagamento na Agenda
                    </span>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                      Integrar com agenda de compromissos
                    </span>
                  </div>

                  {!isLoggedIn && (
                    <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-4 rounded-2xl flex items-start gap-2.5 text-xs">
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-bold uppercase tracking-wider text-[10px]">Atenção: Faça login para salvar!</p>
                        <p className="mt-1 text-slate-300 leading-relaxed text-[11px]">
                          Para registrar este lembrete de cobrança na sua agenda integrada e sincronizada, por favor faça login na barra superior do sistema utilizando sua conta do Google.
                        </p>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleScheduleReminder} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      {/* Event Title */}
                      <div className="md:col-span-6 space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                          Título do Lembrete / Compromisso
                        </label>
                        <input
                          type="text"
                          value={reminderTitle}
                          onChange={(e) => setReminderTitle(e.target.value)}
                          placeholder="Ex: Cobrar Maria Cunha (Brechó)..."
                          className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-xs outline-none text-white focus:border-pink-500"
                          disabled={!isLoggedIn}
                        />
                      </div>

                      {/* Date */}
                      <div className="md:col-span-3 space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                          Data
                        </label>
                        <input
                          type="date"
                          value={reminderDate}
                          onChange={(e) => setReminderDate(e.target.value)}
                          className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-xs outline-none text-white focus:border-pink-500 text-slate-200"
                          disabled={!isLoggedIn}
                        />
                      </div>

                      {/* Time */}
                      <div className="md:col-span-3 space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                          Hora
                        </label>
                        <input
                          type="time"
                          value={reminderTime}
                          onChange={(e) => setReminderTime(e.target.value)}
                          className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-xs outline-none text-white focus:border-pink-500 text-slate-200"
                          disabled={!isLoggedIn}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                      {/* Amount to remind */}
                      <div className="md:col-span-4 space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                          Cobrar e receber
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-600">R$</span>
                          <input
                            type="text"
                            value={reminderAmount}
                            onChange={(e) => setReminderAmount(e.target.value)}
                            placeholder="0,00"
                            className="w-full bg-slate-950 border border-white/10 rounded-xl pl-8 pr-3 py-2.5 text-xs font-bold font-mono outline-none text-white focus:border-pink-500"
                            disabled={!isLoggedIn}
                          />
                        </div>
                      </div>

                      {/* Button */}
                      <div className="md:col-span-8">
                        <button
                          type="submit"
                          disabled={!isLoggedIn}
                          className={`w-full py-3 rounded-xl font-black text-xs uppercase tracking-widest text-center flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                            isLoggedIn
                              ? "bg-pink-600 hover:bg-pink-500 text-white shadow-lg shadow-pink-600/20 cursor-pointer"
                              : "bg-slate-800 text-slate-500 border border-white/5 cursor-not-allowed"
                          }`}
                        >
                          <Calendar className="w-4 h-4" />
                          Agendar Cobrança na Agenda ✓
                        </button>
                      </div>
                    </div>
                  </form>
                </div>

                {/* ================= GENERAL DESCRIPTIONS / NOTES BOX ================= */}
                <div className="bg-slate-900 border border-white/5 rounded-3xl p-5 space-y-4 shadow-xl">
                  <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                    <FileText className="w-4 h-4 text-pink-500" />
                    <span className="text-xs font-black uppercase text-slate-300">Espaço para Descrições Gerais & Encomendas</span>
                  </div>

                  <textarea
                    value={clientNotes}
                    onChange={(e) => setClientNotes(e.target.value)}
                    placeholder="Use este espaço para anotar detalhes do orçamento, prazos de entrega combinados, especificações de produtos/serviços, preferências ou pendências extras de pagamento comercial..."
                    className="w-full min-h-[100px] bg-slate-950 border border-white/10 rounded-2xl p-4 text-sm text-slate-200 outline-none focus:border-pink-500 placeholder:text-slate-700 leading-relaxed transition-all resize-y"
                  />

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleSaveNotes}
                      className="px-5 py-2 bg-pink-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-pink-500 transition-all flex items-center gap-1 active:scale-95 shadow-md shadow-pink-600/10"
                    >
                      <Check className="w-4 h-4" />
                      Salvar Descrição
                    </button>
                  </div>
                </div>

              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </motion.div>
    ) : (
      <motion.div
        key="dashboard-view"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="space-y-6"
      >
        {/* ================= BRAND NEW COMMERCIAL DASHBOARD LAYOUT ================= */}
        {/* Period filter control & Sales Goal Banner */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Card left: Period buttons & Quick metrics */}
          <div className="lg:col-span-8 bg-slate-900 border border-white/5 rounded-3xl p-6 flex flex-col justify-between gap-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/5 rounded-full blur-3xl" />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4 z-10">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-pink-500">Gestão Comercial & Faturamento</h3>
                <p className="text-[10px] uppercase text-slate-400 font-bold tracking-widest mt-0.5">Filtre por período para acompanhar o desempenho da sua loja</p>
              </div>
              
              <div className="flex bg-slate-950 border border-white/10 p-1 rounded-xl">
                {(["today", "quinzenal", "month"] as const).map((period) => (
                  <button
                    key={period}
                    type="button"
                    onClick={() => setDashboardPeriod(period)}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                      dashboardPeriod === period
                        ? "bg-pink-600 text-white shadow-md shadow-pink-500/10"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {period === "today" ? "Diário (Hoje)" : period === "quinzenal" ? "Quinzenal" : "Mensal"}
                  </button>
                ))}
              </div>
            </div>

            {/* Aggregated totals based on selected period */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 z-10">
              <div className="bg-slate-950 border border-white/5 p-4 rounded-2xl flex flex-col justify-between hover:border-pink-500/30 transition-all group">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest">💰 Total Comercializado</span>
                  <span className="p-1.5 bg-rose-500/10 rounded-lg text-rose-400 group-hover:scale-110 transition-transform">
                    <ArrowUp className="w-3.5 h-3.5" />
                  </span>
                </div>
                <div className="mt-4">
                  <span className="text-2xl font-black text-white font-mono">
                    {formatCurrency(
                      dashboardPeriod === "today"
                        ? commercialStats.salesToday
                        : dashboardPeriod === "quinzenal"
                        ? commercialStats.salesQuinzenal
                        : commercialStats.salesMonth
                    )}
                  </span>
                  <p className="text-[8px] text-slate-500 font-bold uppercase mt-1 tracking-widest">Giro Bruto de Vendas</p>
                </div>
              </div>

              <div className="bg-slate-950 border border-white/5 p-4 rounded-2xl flex flex-col justify-between hover:border-emerald-500/30 transition-all group">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">💸 Gastos & Reposições</span>
                  <span className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-400 group-hover:scale-110 transition-transform">
                    <ArrowDown className="w-3.5 h-3.5" />
                  </span>
                </div>
                <div className="mt-4">
                  <span className="text-2xl font-black text-white font-mono">
                    {formatCurrency(
                      dashboardPeriod === "today"
                        ? commercialStats.costsToday
                        : dashboardPeriod === "quinzenal"
                        ? commercialStats.costsQuinzenal
                        : commercialStats.costsMonth
                    )}
                  </span>
                  <p className="text-[8px] text-slate-500 font-bold uppercase mt-1 tracking-widest">Saídas / Pagamentos de Custo</p>
                </div>
              </div>

              <div className="bg-slate-950 border border-white/5 p-4 rounded-2xl flex flex-col justify-between hover:border-emerald-500/30 transition-all group">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">📈 Resultado Líquido</span>
                  <span className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-400 group-hover:scale-110 transition-transform">
                    <TrendingUp className="w-3.5 h-3.5" />
                  </span>
                </div>
                <div className="mt-4">
                  <span className={`text-2xl font-black font-mono ${
                    (dashboardPeriod === "today" ? commercialStats.profitToday : dashboardPeriod === "quinzenal" ? commercialStats.profitQuinzenal : commercialStats.profitMonth) >= 0
                      ? "text-emerald-300"
                      : "text-rose-400"
                  }`}>
                    {formatCurrency(
                      dashboardPeriod === "today"
                        ? commercialStats.profitToday
                        : dashboardPeriod === "quinzenal"
                        ? commercialStats.profitQuinzenal
                        : commercialStats.profitMonth
                    )}
                  </span>
                  <p className="text-[8px] text-slate-500 font-bold uppercase mt-1 tracking-widest">Lucratividade de Caixa</p>
                </div>
              </div>
            </div>
          </div>

          {/* Card right: Sales Goal settings */}
          <div className="lg:col-span-4 bg-slate-900 border border-white/5 rounded-3xl p-6 flex flex-col justify-between gap-4 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl" />
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <span className="text-xs font-black uppercase text-slate-300 flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-emerald-500" />
                  Meta de Faturamento (Alvo)
                </span>
                
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingGoal(true);
                    setGoalEditingInput(monthlyGoal.toString());
                  }}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>

              {isEditingGoal ? (
                <form onSubmit={handleUpdateMonthlyGoal} className="mt-4 space-y-3">
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-500 font-black text-xs">R$</span>
                    <input
                      type="text"
                      required
                      value={goalEditingInput}
                      onChange={(e) => setGoalEditingInput(e.target.value)}
                      placeholder="Meta Mensal (Ex: 5000)"
                      className="w-full bg-slate-950 border border-white/10 rounded-xl py-2.5 pl-9 pr-4 text-xs font-bold outline-none focus:border-pink-500 text-slate-200"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setIsEditingGoal(false)}
                      className="py-1 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="py-1 px-3 bg-pink-600 hover:bg-pink-500 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all shadow-md shadow-pink-600/10"
                    >
                      Salvar Meta
                    </button>
                  </div>
                </form>
              ) : (
                <div className="mt-4 space-y-3">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-white font-mono">{formatCurrency(monthlyGoal)}</span>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Alvo Mensal</span>
                  </div>

                  {/* Goal Progress bar math */}
                  {(() => {
                    const currentMonthSales = commercialStats.salesMonth;
                    const pct = Math.min(100, Math.max(0, Math.round((currentMonthSales / (monthlyGoal || 1)) * 105) / 1.05));
                    const percentageValue = Math.min(100, Math.max(0, Math.round((currentMonthSales / (monthlyGoal || 1)) * 100)));
                    return (
                      <div className="space-y-1.5 pt-2">
                        <div className="flex items-center justify-between text-[9px] font-black uppercase text-slate-400">
                          <span>Progresso Atual: {percentageValue}%</span>
                          <span>Falta: {formatCurrency(Math.max(0, monthlyGoal - currentMonthSales))}</span>
                        </div>
                        <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-white/5">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              percentageValue >= 100 ? "bg-emerald-500 shadow-md shadow-emerald-500/20" : "bg-pink-500"
                            }`} 
                            style={{ width: `${pct}%` }} 
                          />
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            <div className="bg-slate-950/60 rounded-xl p-3 border border-white/5 flex gap-2 items-start mt-2">
              <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-[10px] text-slate-400 leading-relaxed font-bold uppercase tracking-wide">
                DICA EXTRA: Multiplique gastos de fornecedores com base no giro de vendas para obter balanço financeiro positivo! 📈
              </p>
            </div>
          </div>
        </div>

        {/* Dashboard Sections: Tab list left (Top Sellers, Debtors, Best customer clients) vs Stock replenishments right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: Financial list records (Top Products, Customers with debts) */}
          <div className="lg:col-span-6 space-y-6">
            
            {/* Best selling clothing / objects */}
            <div className="bg-slate-900 border border-white/5 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <span className="text-xs font-black uppercase text-pink-400 flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4" />
                  Relação de Mais Vendidos (Giro de Peças)
                </span>
                <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest font-mono">Ordenado por Quantidade</span>
              </div>

              <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                {commercialStats.bestSellers.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-[10px] font-bold uppercase tracking-widest">Nenhuma venda de itens registrada ainda.</div>
                ) : (
                  commercialStats.bestSellers.map((item, index) => (
                    <div key={item.name + index} className="flex items-center justify-between bg-slate-950/60 border border-white/5 hover:border-white/10 p-3 rounded-xl transition-all">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-pink-500 font-black font-mono w-5">#{index + 1}</span>
                        <span className="text-xs text-white font-bold uppercase truncate max-w-[170px] md:max-w-xs">{item.name}</span>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-900 border border-white/5 px-2 py-0.5 rounded-md">
                          {item.qty} {item.qty === 1 ? "peça" : "peças"}
                        </span>
                        <span className="text-xs font-black text-pink-400 font-mono">{formatCurrency(item.value)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Debitos Ativos: Clientes Pendentes (A Receber) */}
            <div className="bg-slate-900 border border-white/5 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <span className="text-xs font-black uppercase text-rose-400 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  Relação de Contas a Receber (Clientes Devedores)
                </span>
                <span className="text-[8px] text-rose-400 font-black uppercase tracking-widest bg-rose-500/10 px-2 py-0.5 rounded-md">Importante</span>
              </div>

              <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                {commercialStats.debtors.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-[10px] font-bold uppercase tracking-widest">Nenhum cliente está com pagamento pendente! 🎉</div>
                ) : (
                  commercialStats.debtors.map((debtor) => (
                    <div key={debtor.id} className="flex items-center justify-between bg-slate-950/60 border border-white/5 hover:border-rose-500/10 p-3 rounded-xl transition-all">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-rose-400" />
                        <span className="text-xs text-slate-200 font-black uppercase truncate max-w-[150px] md:max-w-xs">{debtor.name}</span>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <span className="text-[8px] font-black uppercase tracking-widest text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md">
                          Falta Receber
                        </span>
                        <span className="text-xs font-black text-rose-400 font-mono">{formatCurrency(debtor.amount)}</span>
                        
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedClientId(debtor.id);
                            setActiveTab("ledgers");
                          }}
                          className="p-1 bg-slate-900 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all"
                          title="Ir para a notinha do cliente"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Maiores Compradores: Melhores Clientes */}
            <div className="bg-slate-900 border border-white/5 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <span className="text-xs font-black uppercase text-emerald-400 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4" />
                  Top 5 Clientes Parceiros (Maiores Compradores)
                </span>
                <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest font-mono">Ranking acumulado</span>
              </div>

              <div className="space-y-2">
                {commercialStats.topBuyers.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-[10px] font-bold uppercase tracking-widest">Nenhum ranking disponível neste momento.</div>
                ) : (
                  commercialStats.topBuyers.map((buyer, idx) => (
                    <div key={buyer.id} className="flex items-center justify-between bg-slate-950/60 border border-white/5 p-3 rounded-xl">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black font-mono text-emerald-400 w-5">★ {idx + 1}</span>
                        <span className="text-xs text-slate-200 font-black uppercase truncate max-w-[200px]">{buyer.name}</span>
                      </div>
                      <span className="text-xs font-black text-emerald-400 font-mono">{formatCurrency(buyer.totalBought)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* RIGHT: Product restocking lists (Apoio ideal para reposição solicitado) */}
          <div className="lg:col-span-6 space-y-6">
            
            {/* Stock replenishment and suppliers manager */}
            <div className="bg-slate-900 border border-white/5 rounded-3xl p-6 shadow-xl space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl" />
              
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-pink-500 flex items-center gap-1.5">
                    <Layers className="w-4 h-4" />
                    Lista de Reposições (Estoque)
                  </h3>
                  <p className="text-[9px] uppercase tracking-wider text-slate-500 font-bold mt-0.5">Defina novas peças de reposição e gerencie seus gastos de reposição</p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddingRestock(!isAddingRestock)}
                  className="px-3 py-1.5 bg-pink-600 hover:bg-pink-500 text-white font-black text-[9px] uppercase tracking-wider rounded-xl transition-all flex items-center gap-1 active:scale-95 border border-pink-500/20"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {isAddingRestock ? "Fechar Form." : "Novo Item"}
                </button>
              </div>

              {/* Collapsible replenishment form block */}
              <AnimatePresence>
                {isAddingRestock && (
                  <motion.form
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onSubmit={handleAddRestockItem}
                    className="bg-slate-950 border border-white/10 rounded-2xl p-4 space-y-3 overflow-hidden"
                  >
                    <span className="text-[12px] font-black uppercase tracking-wider text-pink-400 block border-b border-white/10 pb-1 mb-2">
                      ✏️ CADASTRAR NOVA NECESSIDADE DE ESTOQUE
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-black text-slate-300 block mb-1 uppercase tracking-wider">Item a Repor *</label>
                        <input
                          type="text"
                          required
                          value={newRestockName}
                          onChange={(e) => setNewRestockName(e.target.value)}
                          placeholder="Ex: Vestido Floral Midi"
                          className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:border-pink-500 text-slate-200 placeholder-slate-500"
                        />
                      </div>
                      
                      <div>
                        <label className="text-[11px] font-black text-slate-300 block mb-1 uppercase tracking-wider">Quantidade Desejada</label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={newRestockQty}
                          onChange={(e) => setNewRestockQty(parseInt(e.target.value, 10) || 1)}
                          className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:border-pink-500 text-slate-200"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-black text-slate-300 block mb-1 uppercase tracking-wider">Preço Unitário Estimativo (R$)</label>
                        <input
                          type="text"
                          required
                          value={newRestockPrice}
                          onChange={(e) => setNewRestockPrice(e.target.value)}
                          placeholder="Ex: 25,00"
                          className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:border-pink-500 text-slate-200 placeholder-slate-500"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-black text-slate-300 block mb-1 uppercase tracking-wider">Prioridade de Compras</label>
                        <select
                          value={newRestockPriority}
                          onChange={(e: any) => setNewRestockPriority(e.target.value)}
                          className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:border-pink-500 text-slate-200"
                        >
                          <option value="high">ALTA CRÍTICA (Falta Estoque)</option>
                          <option value="medium">MÉDIA (Otimização)</option>
                          <option value="low">BAIXA (Sob Demanda)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-black text-slate-300 block mb-1 uppercase tracking-wider">Notas Explicativas</label>
                      <input
                        type="text"
                        value={newRestockNotes}
                        onChange={(e) => setNewRestockNotes(e.target.value)}
                        placeholder="Ex: Fornecedor do Brás, ligar na terça"
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:border-pink-500 text-slate-200 placeholder-slate-500"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                      <button
                        type="submit"
                        className="px-4 py-2.5 bg-pink-600 hover:bg-pink-500 font-black text-[11px] uppercase tracking-widest text-white rounded-xl transition-all shadow-md shadow-pink-600/10 active:scale-95 cursor-pointer"
                      >
                        ✓ Inserir na Lista
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>

              {/* Replenishment Interactive list */}
              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                {restockItems.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-white/5 rounded-2xl">
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider font-mono">Lista de Reposições Vazia!</p>
                    <p className="text-[9px] text-slate-600 mt-1 max-w-[280px] mx-auto leading-relaxed uppercase">
                      Adicione itens que estão em falta ou abaixo do recomendado para manter o estoque do seu comércio sempre em dia.
                    </p>
                  </div>
                ) : (
                  restockItems.map((item) => {
                    const statusColors = {
                      pending: "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
                      ordered: "border-indigo-500/30 bg-indigo-500/10 text-indigo-400",
                      completed: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                    };

                    const statusLabels = {
                      pending: "Pendente",
                      ordered: "Pedida",
                      completed: "Comprada"
                    };

                    const priorityColors = {
                      high: "bg-rose-500/10 text-rose-400 border-rose-500/20",
                      medium: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
                      low: "bg-slate-500/10 text-slate-400 border-slate-500/20"
                    };

                    const priorityLabels = {
                      high: "Crítica",
                      medium: "Moderada",
                      low: "Baixa"
                    };

                    return (
                      <div 
                        key={item.id} 
                        className={`border p-4 bg-slate-950/40 rounded-2xl space-y-3 hover:border-white/10 transition-all ${
                          item.status === "completed" ? "opacity-60 border-emerald-500/20" : "border-white/5"
                        }`}
                      >
                        <div className="flex items-start justify-between border-b border-white/5 pb-2 gap-2">
                          <div>
                            <span className="text-xs font-black text-slate-100 uppercase tracking-wide block">
                              {item.name}
                            </span>
                            <span className="text-[8px] font-bold text-slate-500 block mt-0.5">Adicionado em: {item.createdAt}</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className={`text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 border rounded-lg ${statusColors[item.status]}`}>
                              {statusLabels[item.status]}
                            </span>
                            <span className={`text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 border rounded-lg ${priorityColors[item.priority]}`}>
                              {priorityLabels[item.priority]}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 py-1 text-center">
                          <div className="bg-slate-950 border border-white/5 p-2 rounded-xl flex flex-col justify-center">
                            <span className="text-[7.5px] font-black uppercase text-slate-500 tracking-widest">Qtd Solicitada</span>
                            <span className="text-[11px] font-black text-white mt-1">{item.desiredQty} un</span>
                          </div>
                          
                          <div className="bg-slate-950 border border-white/5 p-2 rounded-xl flex flex-col justify-center">
                            <span className="text-[7.5px] font-black uppercase text-slate-500 tracking-widest">Preço Un. Est.</span>
                            <span className="text-[11px] font-black text-pink-400 font-mono mt-1">{formatCurrency(item.estimatedPrice)}</span>
                          </div>

                          <div className="bg-slate-950 border border-white/5 p-2 rounded-xl flex flex-col justify-center">
                            <span className="text-[7.5px] font-black uppercase text-slate-500 tracking-widest font-mono">Subtotal Est.</span>
                            <span className="text-[11px] font-black text-emerald-400 font-mono mt-1">{formatCurrency(item.estimatedPrice * item.desiredQty)}</span>
                          </div>
                        </div>

                        {item.notes && (
                          <div className="bg-slate-950 p-2 border border-white/5 rounded-xl text-[9px] text-indigo-300 font-medium tracking-wide uppercase">
                            💡 {item.notes}
                          </div>
                        )}

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() => handleToggleRestockStatus(item.id)}
                            className="text-[9px] font-black uppercase tracking-wider text-slate-400 hover:text-white transition-all flex items-center gap-1"
                          >
                            <RefreshCw className="w-3 h-3 text-pink-500 inline-block" />
                            Mudar Status: {statusLabels[item.status]}
                          </button>

                          <div className="flex gap-2 justify-end self-stretch sm:self-auto">
                            <button
                              type="button"
                              onClick={() => handleDeleteRestockItem(item.id, item.name)}
                              className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
                              title="Remover"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            
                            {item.status !== "completed" && (
                              <button
                                type="button"
                                onClick={() => handleConvertRestockToExpense(item)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[9px] uppercase tracking-wider rounded-xl transition-all shadow-md shadow-emerald-600/10 flex items-center gap-1 active:scale-95"
                              >
                                <DollarSign className="w-3 h-3" />
                                Lançar Compra (Gastos)
                              </button>
                            )}
                          </div>
                        </div>

                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>

        </div>
      </motion.div>
    )}
  </AnimatePresence>

      {/* ================= MODAL: RESUMO GERAL COMPLETO E DETALHADO ================= */}
      <AnimatePresence>
        {isSummaryOpen && summaryClient && (() => {
          const totalDue = summaryClient.items.reduce((acc, item) => acc + ((Number(item.price) || 0) * (Number(item.quantity) || 0)), 0);
          const outstanding = totalDue - (Number(summaryClient.amountPaid) || 0);
          const totalPieces = summaryClient.items.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);
          const totalDelivered = summaryClient.items.filter(item => item.delivered).reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);

          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/95 z-[9999] flex items-center justify-center p-4 overflow-y-auto"
              onClick={() => setIsSummaryOpen(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ type: "spring", duration: 0.5 }}
                className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="bg-slate-950 px-5 py-4 border-b border-white/10 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="p-2 bg-pink-600/10 rounded-xl inline-flex text-pink-500 border border-pink-500/20">
                        <FileText className="w-5 h-5" />
                      </span>
                      <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-wider">
                          Resumo Geral do Caderno
                        </h3>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                          Tudo que foi escrito e salvo no Brechó
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsSummaryOpen(false)}
                      className="p-1.5 rounded-xl bg-slate-900 border border-white/5 text-slate-400 hover:text-white transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* BOTÕES DE COMPARTILHAMENTO EM DESTAQUE TOTAL (NUNCA TAMPADOS) */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleShareCompleteWhatsApp(summaryClient)}
                      className="px-3 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-lg shadow-emerald-500/20 w-full"
                    >
                      <Share2 className="w-3.5 h-3.5 animate-pulse" />
                      Enviar no WhatsApp 💬
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopySummary(summaryClient)}
                      className="px-3 py-2.5 bg-pink-600 hover:bg-pink-500 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-lg shadow-pink-600/20 w-full"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copiar e Colar 📋
                    </button>
                  </div>
                </div>

                {/* Modal Content (Scrollable) */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1 min-h-0 text-sm leading-relaxed text-slate-300">
                  
                  {/* Client Identification Card */}
                  <div className="bg-slate-950/50 border border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[9px] font-black uppercase text-pink-500 tracking-wider block">
                      {summaryClient.clientType === "supplier" ? "Fluxo: Área de Pagamentos (Eu Devo pagar)" : "Fluxo: Área de Recebimentos (Eu que vou receber)"}
                    </span>
                    <span className="text-lg font-black uppercase text-white tracking-tight">{summaryClient.name}</span>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider block">Registrado em</span>
                    <span className="text-xs font-black text-slate-300 uppercase">{summaryClient.createdAt}</span>
                  </div>
                </div>

                {/* Financial Counters Panels */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-4 text-center">
                    <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider">
                      {summaryClient.clientType === "supplier" ? "Total a Pagar (Despesas)" : "Total a Receber (Orçamento)"}
                    </span>
                    <div className="text-lg font-black text-white font-mono mt-1">{formatCurrency(totalDue)}</div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase block mt-1">
                      {totalPieces} {totalPieces === 1 ? "item" : "itens"} registrados
                    </span>
                  </div>

                  <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-4 text-center">
                    <span className="text-[9px] font-black uppercase text-emerald-400 block tracking-wider">
                      {summaryClient.clientType === "supplier" ? "Já Pago por Mim" : "Já Recebido (Sinal)"}
                    </span>
                    <div className="text-lg font-black text-emerald-400 font-mono mt-1">{formatCurrency(Number(summaryClient.amountPaid) || 0)}</div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase block mt-1">Confirmado</span>
                  </div>

                  <div className={`bg-slate-950/40 border rounded-2xl p-4 text-center ${outstanding <= 0 ? "border-emerald-500/30 font-bold" : "border-amber-500/30"}`}>
                    <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider">
                      {outstanding < 0 
                        ? "Crédito Restante" 
                        : summaryClient.clientType === "supplier" 
                          ? "SALDO QUE EU DEVO" 
                          : "SALDO A RECEBER"
                      }
                    </span>
                    <div className={`text-lg font-black font-mono mt-1 ${outstanding <= 0 ? "text-emerald-400" : "text-amber-500"}`}>
                      {outstanding === 0 && totalDue > 0 ? "QUITADO ✓" : formatCurrency(Math.abs(outstanding))}
                    </div>
                    <span className={`text-[9px] font-bold uppercase block mt-1 ${outstanding <= 0 ? "text-emerald-500" : "text-amber-500/80"}`}>
                      {outstanding <= 0 ? "Tudo Pago! ✓" : "Pendente"}
                    </span>
                  </div>
                </div>

                {/* Table block of items */}
                <div className="space-y-2.5">
                  <span className="text-[10px] font-black uppercase text-pink-500 tracking-wider block">
                    {summaryClient.clientType === "supplier" ? "Relação de Itens de Pagamento / Despesas" : "Descrição dos Itens do Orçamento & Entrega"}
                  </span>
                  {summaryClient.items.length === 0 ? (
                    <div className="p-5 bg-slate-950/20 border border-dashed border-white/5 rounded-2xl text-center">
                      <span className="text-xs text-slate-500 font-bold uppercase">Nenhum item ou serviço registrado ainda.</span>
                    </div>
                  ) : (
                    <div className="bg-slate-950/40 border border-white/5 rounded-2xl overflow-hidden text-xs">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-950 border-b border-white/10 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            <th className="p-2.5 w-10 text-center">Qtd</th>
                            <th className="p-2.5">Descrição do Item / Serviço</th>
                            <th className="p-2.5 text-right">Valor Unitário</th>
                            <th className="p-2.5 text-right">Subtotal</th>
                            <th className="p-2.5 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {summaryClient.items.map(item => (
                            <tr key={item.id} className="hover:bg-slate-950/20">
                              <td className="p-2.5 font-bold text-center font-mono">{item.quantity}</td>
                              <td className="p-2.5 font-bold uppercase text-white truncate max-w-[150px]">{item.name}</td>
                              <td className="p-2.5 text-right font-mono">{formatCurrency(item.price)}</td>
                              <td className="p-2.5 text-right font-bold text-white font-mono">{formatCurrency(item.price * item.quantity)}</td>
                              <td className="p-2.5 text-center p-1">
                                {item.delivered ? (
                                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-[9px] font-black uppercase">
                                    Concluído ✓
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg text-[9px] font-black uppercase">
                                    Pendente
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="bg-slate-950 p-2.5 text-[10px] font-bold text-slate-500 text-right uppercase border-t border-white/5 flex items-center justify-between">
                        <span>ITENS CONCLUÍDOS / TRANSACIONADOS: {totalDelivered} DE {totalPieces}</span>
                        <span className="text-white font-mono font-black">{totalPieces} {totalPieces === 1 ? 'item' : 'itens'}</span>
                      </div>
                    </div>
                    )}
                  </div>

                  {/* Notes / Descriptions segment */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase text-pink-500 tracking-wider block">
                      Observações, Devoluções & Encomendas Salvas:
                    </span>
                    <div className="bg-slate-950/60 border border-white/10 p-4 rounded-2xl min-h-[80px] leading-relaxed relative overflow-hidden">
                      {summaryClient.notes && summaryClient.notes.trim() !== "" ? (
                        <p className="text-slate-200 font-bold whitespace-pre-wrap text-xs">
                          {summaryClient.notes}
                        </p>
                      ) : (
                        <p className="text-slate-500 italic text-xs">
                          Nenhuma anotação ou observação adicional foi salva.
                        </p>
                      )}
                      <span className="absolute bottom-2 right-3 text-[8px] font-bold text-slate-600 uppercase tracking-widest">
                        Caderno Salvo ✓
                      </span>
                    </div>
                  </div>

                </div>

                {/* Modal Footer actions */}
                <div className="bg-slate-950 border-t border-white/5 p-4 flex flex-col xl:flex-row gap-3 justify-between items-center">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center xl:text-left">
                    Dica: Envie direto para o WhatsApp ou copie para colar!
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto justify-center">
                    <button
                      type="button"
                      onClick={() => handleShareCompleteWhatsApp(summaryClient)}
                      className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-md shadow-emerald-500/15"
                      title="Enviar resumo completo diretamente pelo WhatsApp"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      Enviar no WhatsApp 💬
                    </button>
                     <button
                      type="button"
                      onClick={() => handleCopySummary(summaryClient)}
                      className="flex-1 sm:flex-none px-4 py-2.5 bg-pink-600 hover:bg-pink-500 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-md shadow-pink-500/15"
                      title="Copiar resumo para área de transferência para colar em qualquer lugar"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copiar e Colar 📋
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsSummaryOpen(false)}
                      className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      Fechar
                    </button>
                  </div>
                </div>

              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Custom Confirmation Dialog for deleting clients */}
      <AnimatePresence>
        {deleteDialog.isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-slate-900 border border-white/10 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative overflow-hidden"
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-red-500/15 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h3 className="text-white font-black uppercase text-sm tracking-widest">
                    Excluir Cadastro?
                  </h3>
                  <p className="text-slate-400 font-medium text-xs mt-2 leading-relaxed">
                    Deseja mesmo apagar o cadastro de <strong className="text-pink-500 font-bold">"{deleteDialog.clientName}"</strong>? 
                    Todos os dados e movimentações salvos deste cadastro serão perdidos para sempre.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setDeleteDialog({ isOpen: false, clientId: "", clientName: "" })}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={executeDeleteClient}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-red-600/15 active:scale-95"
                >
                  Apagar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Confirmation Dialog for resetting all brecho data */}
      <AnimatePresence>
        {isResetConfirmOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-slate-900 border border-white/10 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative overflow-hidden"
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-red-500/15 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h3 className="text-white font-black uppercase text-sm tracking-widest">
                    Zerar Orçamentos?
                  </h3>
                  <p className="text-slate-400 font-medium text-xs mt-2 leading-relaxed">
                    Você tem certeza que deseja <strong className="text-red-500 font-bold">APAGAR COMPLETAMENTE</strong> todos os seus clientes e anotações? Esse processo apagará suas informações de forma irreversível e definitiva.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsResetConfirmOpen(false)}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={executeResetAllBrechoData}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-red-600/15 active:scale-95"
                >
                  Confirmar Zerar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer support text */}
      <div className="pt-6 border-t border-white/5 flex items-center justify-between text-slate-500 text-[10px] font-bold uppercase tracking-widest">
        <span>👗 Orçamento de cálculos - Organização é a alma do negócio!</span>
        <span>Modo Local Ativado ✓</span>
      </div>
    </motion.div>
  );
});

BrechoSalesModule.displayName = "BrechoSalesModule";
