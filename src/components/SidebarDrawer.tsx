import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Store,
  Tag,
  Calendar,
  Layers,
  ShoppingBag,
  RotateCcw,
  TrendingUp,
  PieChart,
  CreditCard,
  Users,
  DollarSign,
  Settings,
  HelpCircle,
  LogOut,
  X,
  MessageSquare,
  Sparkles,
  ChevronRight,
  User,
  Pencil,
  ChevronDown,
  ChevronUp,
  Plus,
  Scissors,
  ShoppingCart,
  Fish,
  Beer,
  Hammer,
  Armchair,
  Cake,
  Pizza,
  Utensils,
  Cookie,
  Dumbbell,
  Car,
  Wrench,
  ShoppingBasket,
  Sliders,
  Lock,
  Eye,
  EyeOff,
  Building2,
  IdCard,
  ShieldCheck,
  Check,
  Briefcase,
  KeyRound,
  Crown,
  ShieldAlert,
  Unlock,
  AlertCircle,
  Shield,
  Apple,
  Dog,
  Bird,
  Landmark,
  Percent,
  Bot,
  ChefHat,
  BookOpen
} from "lucide-react";

interface SidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  notepadMode: string;
  setNotepadMode: (mode: any) => void;
  pdvCheckoutOnly?: boolean;
  setPdvCheckoutOnly?: (val: boolean) => void;
  pdvActiveSubTab: string | null;
  setPdvActiveSubTab: (tab: string | null) => void;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  onForceRestore?: () => void;
  showNotification: (msg: string, type?: any) => void;
  selectedNiche?: string;
  setSelectedNiche?: (niche: string) => void;
  customNiches?: { id: string; name: string; label: string }[];
  storeName?: string;
  storeCnpjCpf?: string;
  setStoreName?: (name: string) => void;
  setStoreCnpjCpf?: (cnpjCpf: string) => void;
  pdvLicenseActive?: boolean;
  onOpenPaywall?: () => void;
}

export const SidebarDrawer: React.FC<SidebarDrawerProps> = ({
  isOpen,
  onClose,
  user,
  notepadMode,
  setNotepadMode,
  pdvCheckoutOnly = false,
  setPdvCheckoutOnly,
  pdvActiveSubTab,
  setPdvActiveSubTab,
  setActiveTab,
  onLogout,
  onForceRestore,
  showNotification,
  selectedNiche = "comercio_geral",
  setSelectedNiche,
  customNiches = [],
  storeName = "",
  storeCnpjCpf = "",
  setStoreName,
  setStoreCnpjCpf,
  pdvLicenseActive = false,
  onOpenPaywall
}) => {
  const [isNicheDropdownOpen, setIsNicheDropdownOpen] = useState(false);
  const [isAba7Open, setIsAba7Open] = useState(true);

  let gestaoRole: string | null = null;
  let gestaoName = "";
  let isOwnerMode = false;
  try {
    gestaoRole = localStorage.getItem("pdv_gestao_user_role");
    gestaoName = localStorage.getItem("pdv_gestao_user_staff_name") || "";
    isOwnerMode = localStorage.getItem("pdv_owner_mode") === "true";
  } catch {}

  const isAdmin = useMemo(() => {
    if (!user?.email) return false;
    const emailLower = user.email.toLowerCase().trim();
    const adminEmails = [
      "denisejesusdasilva1988@gmail.com",
      "denisejesusdasilva1988@gmail.com.br",
      "calculadoracerebrointeligente@gmail.com"
    ];
    return adminEmails.includes(emailLower) || emailLower.includes("wellington");
  }, [user]);

  // Login PIN & Company states
  const [pinInput, setPinInput] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [pinEmail, setPinEmail] = useState(() => { try { return localStorage.getItem("pdv_session_email") || ""; } catch { return ""; } });
  const [pinRole, setPinRole] = useState<"proprietario" | "gerente" | "caixa" | "funcionario">("proprietario");
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [companyName, setCompanyName] = useState(storeName);
  const [companyCnpjCpf, setCompanyCnpjCpf] = useState(storeCnpjCpf);

  // Owner PIN Modal States & Functions
  const [isOwnerPinModalOpen, setIsOwnerPinModalOpen] = useState(false);
  const [ownerPinInput, setOwnerPinInput] = useState("");
  const [showOwnerPin, setShowOwnerPin] = useState(false);
  const [confirmNewOwnerPin, setConfirmNewOwnerPin] = useState("");
  const [isCreatingPin, setIsCreatingPin] = useState(false);
  const [ownerPinError, setOwnerPinError] = useState("");
  const [showDataPrivacyNotice, setShowDataPrivacyNotice] = useState(false);

  const currentUserId = user?.uid && user.uid !== "guest_visitor" ? user.uid : null;

  const getOwnerPin = () => {
    try {
      if (currentUserId) {
        const scopedPin = localStorage.getItem(`pdv_owner_pin_${currentUserId}`);
        if (scopedPin) return scopedPin;
      }
      return localStorage.getItem("pdv_owner_pin") || "";
    } catch {
      return "";
    }
  };

  const saveOwnerPin = (newPin: string) => {
    try {
      if (currentUserId) {
        localStorage.setItem(`pdv_owner_pin_${currentUserId}`, newPin);
      }
      localStorage.setItem("pdv_owner_pin", newPin);
    } catch (e) {
      console.error("Erro ao salvar PIN do proprietário:", e);
    }
  };

  const handleProprietarioClick = () => {
    // 1. License / Paywall check ("Apenas para quem pagar o aplicativo")
    const emailLower = user?.email?.toLowerCase() || "";
    const isMasterAdmin = isAdmin || emailLower.includes("denise") || emailLower.includes("wellington");

    if (!pdvLicenseActive && !isMasterAdmin) {
      showNotification("🔒 O Painel do Proprietário e o controle de permissões dos funcionários é exclusivo para assinantes do aplicativo!", "error");
      if (onOpenPaywall) {
        onOpenPaywall();
      }
      return;
    }

    proceedToOwnerPin();
  };

  const proceedToOwnerPin = () => {
    const savedPin = getOwnerPin();
    const isAlreadyOwnerSession = isOwnerMode && gestaoRole === "proprietario";

    if (isAlreadyOwnerSession) {
      handleNavigate("pdv", "proprietario");
      showNotification("Painel do Proprietário liberado! 👑", "success");
      return;
    }

    // Abrir modal de PIN
    setOwnerPinInput("");
    setConfirmNewOwnerPin("");
    setOwnerPinError("");
    setIsCreatingPin(!savedPin);
    setIsOwnerPinModalOpen(true);
  };

  const handleVerifyOrSaveOwnerPin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setOwnerPinError("");

    const savedPin = getOwnerPin();

    if (isCreatingPin) {
      if (!ownerPinInput || ownerPinInput.length < 4 || ownerPinInput.length > 6) {
        setOwnerPinError("O PIN de Proprietário deve ter entre 4 e 6 dígitos numéricos! 🔑");
        return;
      }
      if (ownerPinInput !== confirmNewOwnerPin) {
        setOwnerPinError("Os dois PINs digitados não são idênticos!");
        return;
      }

      saveOwnerPin(ownerPinInput);
      localStorage.setItem("pdv_owner_mode", "true");
      localStorage.setItem("pdv_gestao_user_role", "proprietario");
      localStorage.setItem("pdv_gestao_user_staff_name", "Proprietário");

      setIsOwnerPinModalOpen(false);
      handleNavigate("pdv", "proprietario");
      showNotification("PIN cadastrado! Bem-vindo ao Painel do Proprietário. 👑🔓", "success");
      return;
    }

    // Verificação de PIN existente
    if (!ownerPinInput) {
      setOwnerPinError("Digite o PIN do Proprietário.");
      return;
    }

    if (ownerPinInput === savedPin) {
      localStorage.setItem("pdv_owner_mode", "true");
      localStorage.setItem("pdv_gestao_user_role", "proprietario");
      localStorage.setItem("pdv_gestao_user_staff_name", "Proprietário");

      setIsOwnerPinModalOpen(false);
      handleNavigate("pdv", "proprietario");
      showNotification("Acesso de Proprietário Desbloqueado! 👑🔓", "success");
    } else {
      setOwnerPinError("PIN incorreto! Verifique o número digitado.");
      showNotification("PIN de Proprietário incorreto! ❌", "error");
    }
  };

  const handleKeypadPress = (val: string) => {
    setOwnerPinError("");
    if (val === "clear") {
      if (isCreatingPin && confirmNewOwnerPin.length > 0) {
        setConfirmNewOwnerPin("");
      } else {
        setOwnerPinInput("");
      }
    } else if (val === "backspace") {
      if (isCreatingPin && ownerPinInput.length >= 4 && confirmNewOwnerPin.length > 0) {
        setConfirmNewOwnerPin(prev => prev.slice(0, -1));
      } else {
        setOwnerPinInput(prev => prev.slice(0, -1));
      }
    } else {
      if (isCreatingPin && ownerPinInput.length >= 4) {
        if (confirmNewOwnerPin.length < 6) {
          setConfirmNewOwnerPin(prev => prev + val);
        }
      } else {
        if (ownerPinInput.length < 6) {
          setOwnerPinInput(prev => prev + val);
        }
      }
    }
  };

  const handleCompanySave = () => {
    if (!companyName.trim()) {
      showNotification("O nome da empresa não pode ser vazio!", "error");
      return;
    }
    if (setStoreName) {
      setStoreName(companyName);
      localStorage.setItem("pdv_store_name", companyName);
    }
    if (setStoreCnpjCpf) {
      setStoreCnpjCpf(companyCnpjCpf);
      localStorage.setItem("pdv_store_cnpj_cpf", companyCnpjCpf);
    }
    setIsEditingCompany(false);
    showNotification("Dados da empresa salvos com sucesso! 🏢✅", "success");
  };

  const handlePinLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput.trim()) {
      showNotification("Por favor, digite o PIN! 🔑", "error");
      return;
    }

    // Save company details if typed during login
    if (companyName.trim() && setStoreName) {
      setStoreName(companyName.trim());
      localStorage.setItem("pdv_store_name", companyName.trim());
    }
    if (companyCnpjCpf.trim() && setStoreCnpjCpf) {
      setStoreCnpjCpf(companyCnpjCpf.trim());
      localStorage.setItem("pdv_store_cnpj_cpf", companyCnpjCpf.trim());
    }
    if (pinEmail.trim()) {
      localStorage.setItem("pdv_session_email", pinEmail.trim());
    }

    const savedOwnerPin = localStorage.getItem("pdv_owner_pin") || "";
    
    // Parse staff pins from local storage
    let parsedStaff: any[] = [];
    try {
      const savedStaff = localStorage.getItem("pdv_staff_pins");
      if (savedStaff) {
        parsedStaff = JSON.parse(savedStaff);
      }
    } catch (err) {
      console.error("Error parsing staff pins", err);
    }

    // 1. If role is Owner ("proprietario")
    if (pinRole === "proprietario") {
      if (!savedOwnerPin) {
        if (pinInput.length < 4 || pinInput.length > 6) {
          showNotification("O PIN deve ter entre 4 e 6 dígitos! 🔑", "error");
          return;
        }
        localStorage.setItem("pdv_owner_pin", pinInput);
        localStorage.setItem("pdv_owner_mode", "true");
        localStorage.setItem("pdv_gestao_user_role", "proprietario");
        localStorage.setItem("pdv_gestao_user_staff_name", "Proprietário");
        showNotification("Primeiro acesso! PIN cadastrado e logado como Proprietário! 👑🔓", "success");
        setPinInput("");
        window.location.reload();
        return;
      }

      if (pinInput === savedOwnerPin) {
        localStorage.setItem("pdv_owner_mode", "true");
        localStorage.setItem("pdv_gestao_user_role", "proprietario");
        localStorage.setItem("pdv_gestao_user_staff_name", "Proprietário");
        showNotification("Logado com sucesso como Proprietário! 👑🔓", "success");
        setPinInput("");
        window.location.reload();
        return;
      } else {
        showNotification("PIN de Proprietário inválido ou incorreto! ❌", "error");
        return;
      }
    }

    // 2. Checking in for other roles
    const matchedStaff = parsedStaff.find((s: any) => s.pin === pinInput && s.role === pinRole);
    if (matchedStaff) {
      localStorage.setItem("pdv_owner_mode", "false");
      localStorage.setItem("pdv_gestao_user_role", matchedStaff.role);
      localStorage.setItem("pdv_gestao_user_staff_name", matchedStaff.name);
      
      const roleLabel = 
        matchedStaff.role === "gerente" ? "Gerente" :
        matchedStaff.role === "caixa" ? "Caixa" :
        matchedStaff.role === "funcionario" ? "Funcionário" : "Funcionário";
        
      showNotification(`Logado com sucesso como ${matchedStaff.name} (${roleLabel})! 👤🔓`, "success");
      setPinInput("");
      window.location.reload();
      return;
    } else {
      // Dynamic onboarding: register new collaborator automatically so that the login works instantly!
      const nameFromEmail = pinEmail ? pinEmail.split("@")[0] : "";
      const defaultName = pinRole === "gerente" ? "Gerente" : pinRole === "caixa" ? "Caixa" : "Funcionário";
      const finalName = nameFromEmail ? nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1) : `${defaultName} (${pinInput})`;
      
      const newStaff = {
        id: "staff_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
        name: finalName,
        pin: pinInput,
        role: pinRole,
        permissions: undefined
      };
      
      parsedStaff.push(newStaff);
      localStorage.setItem("pdv_staff_pins", JSON.stringify(parsedStaff));
      
      localStorage.setItem("pdv_owner_mode", "false");
      localStorage.setItem("pdv_gestao_user_role", pinRole);
      localStorage.setItem("pdv_gestao_user_staff_name", finalName);
      
      showNotification(`Sessão iniciada e novo colaborador cadastrado: ${finalName}! 👤🔓`, "success");
      setPinInput("");
      window.location.reload();
      return;
    }
  };

  const handlePinLogout = () => {
    localStorage.removeItem("pdv_gestao_user_role");
    localStorage.removeItem("pdv_gestao_user_staff_name");
    localStorage.setItem("pdv_owner_mode", "false");
    showNotification("Sessão por PIN encerrada! Sistema bloqueado. 🔒", "success");
    window.location.reload();
  };
  
  let systemConfig: any = null;
  try {
    const saved = localStorage.getItem("pdv_system_config");
    if (saved) {
      systemConfig = JSON.parse(saved);
    }
  } catch (e) {
    console.error("Error parsing systemConfig in SidebarDrawer", e);
  }

  const DEFAULT_ROLE_PERMS = (role: "caixa" | "vendedor" | "gerente") => ({
    allowDiscount: true,
    maxDiscount: role === "gerente" ? 100 : 50,
    allowEditPrice: role === "gerente",
    allowVoidSale: role === "gerente",
    allowSuprimento: role === "gerente" || role === "caixa",
    allowSangria: role === "gerente" || role === "caixa",
    allowCloseShift: true,
    allowViewReports: role === "gerente",
    allowOpenBalance: role === "gerente" || role === "caixa",
    allowRemoveProduct: role === "gerente",
    allowResetEntirePDV: role === "gerente",
    allowNotes: true,
    allowReceipts: true,
    allowAgenda: true,
    allowBrecho: true,
    allowSuper: true,
    allowEncartes: true,
    allowFinanceiro: role === "gerente",
    allowPDV: true,
    allowInventory: true,
    allowPermissions: role === "gerente"
  });

  if (!systemConfig) {
    systemConfig = {
      caixa: DEFAULT_ROLE_PERMS("caixa"),
      vendedor: DEFAULT_ROLE_PERMS("vendedor"),
      gerente: DEFAULT_ROLE_PERMS("gerente")
    };
  }

  const ownerPin = localStorage.getItem("pdv_owner_pin") || "";
  const isUnlocked = isOwnerMode || gestaoRole !== null || !ownerPin;
  const isOwner = isOwnerMode || gestaoRole === "proprietario" || !ownerPin;
  const isGerente = gestaoRole === "gerente";
  const isVendedor = gestaoRole === "vendedor";

  // Determine current active role config
  const activeRoleKey = (isGerente ? "gerente" : isVendedor ? "vendedor" : "caixa") as "caixa" | "vendedor" | "gerente";
  const currentRoleConfig = systemConfig[activeRoleKey] || DEFAULT_ROLE_PERMS(activeRoleKey);

  const isReportsLocked = !isOwner && !currentRoleConfig.allowViewReports;
  const isCaixaLocked = !isOwner && !(currentRoleConfig.allowSuprimento || currentRoleConfig.allowSangria || currentRoleConfig.allowCloseShift || currentRoleConfig.allowOpenBalance);
  const isEquipeLocked = !isOwner && currentRoleConfig.allowPermissions === false;

  const isNotesLocked = false;
  const isReceiptsLocked = false;
  const isAgendaLocked = false;
  const isBrechoLocked = false;
  const isSuperLocked = false;
  const isEncartesLocked = false;
  const isFinanceiroLocked = false;
  const isPdvLocked = !isOwner && currentRoleConfig.allowPDV === false;
  const isInventoryLocked = !isOwner && currentRoleConfig.allowInventory === false;

  const getNicheMeta = (nicheId: string) => {
    const custom = customNiches?.find(c => c.id === nicheId);
    if (custom) {
      return {
        id: custom.id,
        name: custom.name,
        label: custom.label,
        icon: Store,
        color: "text-indigo-400 bg-indigo-500/10",
      };
    }

    const predefined: Record<string, { name: string; label: string; icon: any; color: string }> = {
      salao_beleza: { name: "Salão de Beleza", label: "Salão", icon: Scissors, color: "text-pink-400 bg-pink-500/10" },
      barbearia: { name: "Barbearia", label: "Barbearia", icon: Scissors, color: "text-blue-400 bg-blue-500/10" },
      manicure: { name: "Manicure & Unhas", label: "Manicure", icon: Sparkles, color: "text-purple-400 bg-purple-500/10" },
      mercadinho: { name: "Mercadinho & Mercearia", label: "Mercadinho", icon: ShoppingCart, color: "text-emerald-400 bg-emerald-500/10" },
      sushi: { name: "Sushi & Culinária Japonesa", label: "Sushi", icon: Fish, color: "text-red-400 bg-red-500/10" },
      lojas: { name: "Lojas & Varejo", label: "Lojas", icon: ShoppingBag, color: "text-amber-400 bg-amber-500/10" },
      bar: { name: "Bar & Adega", label: "Bar", icon: Beer, color: "text-orange-400 bg-orange-500/10" },
      serralheiro: { name: "Serralheria & Soldas", label: "Serralheiro", icon: Hammer, color: "text-slate-400 bg-slate-500/10" },
      estofador: { name: "Estofador & Reformas", label: "Estofador", icon: Armchair, color: "text-teal-400 bg-teal-500/10" },
      marceneiro: { name: "Marcenaria & Móveis", label: "Marceneiro", icon: Hammer, color: "text-yellow-400 bg-yellow-500/10" },
      doces: { name: "Doceria & Bolos", label: "Doces", icon: Cake, color: "text-pink-300 bg-pink-400/10" },
      salgados: { name: "Salgados & Salgadinhos", label: "Salgados", icon: Pizza, color: "text-amber-500 bg-amber-500/10" },
      pensao: { name: "Pensão / Marmitas", label: "Pensão", icon: Utensils, color: "text-rose-400 bg-rose-500/10" },
      restaurante: { name: "Restaurante", label: "Restaurante", icon: Utensils, color: "text-red-400 bg-red-500/10" },
      padaria: { name: "Padaria & Mercadinho", label: "Padaria", icon: Cookie, color: "text-amber-550 bg-amber-600/10" },
      academia: { name: "Academia & Fitness", label: "Academia", icon: Dumbbell, color: "text-indigo-400 bg-indigo-500/10" },
      lava_jato: { name: "Lava Jato", label: "Lava Jato", icon: Car, color: "text-cyan-400 bg-cyan-500/10" },
      auto_pecas: { name: "Autopeças & Peças", label: "Autopeças", icon: Wrench, color: "text-blue-400 bg-blue-500/10" },
      mecanico: { name: "Oficina Mecânica", label: "Mecânico", icon: Wrench, color: "text-sky-400 bg-sky-500/10" },
      comercio_geral: { name: "Loja / Comércio Geral", label: "Comércio", icon: Store, color: "text-emerald-400 bg-emerald-500/10" },
      loja_racao: { name: "Loja de Ração & Pet", label: "Loja de Ração", icon: Dog, color: "text-amber-400 bg-amber-500/10" },
      aviario: { name: "Aviário & Rações", label: "Aviário", icon: Bird, color: "text-lime-400 bg-lime-500/10" },
      acougue: { name: "Açougue & Carnes", label: "Açougue", icon: ShoppingBasket, color: "text-red-400 bg-red-550/10" },
      sacolao: { name: "Sacolão & Hortifrúti", label: "Sacolão", icon: Apple, color: "text-lime-400 bg-lime-500/10" },
      outros_comercios: { name: "Outros Segmentos", label: "Outros", icon: Layers, color: "text-slate-400 bg-slate-500/10" }
    };

    return predefined[nicheId] || { name: nicheId, label: nicheId, icon: Store, color: "text-indigo-400 bg-indigo-500/10" };
  };

  const predefinedNiches = [
    { id: "salao_beleza", name: "Salão de Beleza", label: "Salão" },
    { id: "barbearia", name: "Barbearia", label: "Barbearia" },
    { id: "manicure", name: "Manicure & Unhas", label: "Manicure" },
    { id: "mercadinho", name: "Mercadinho & Mercearia", label: "Mercadinho" },
    { id: "sushi", name: "Sushi & Culinária Japonesa", label: "Sushi" },
    { id: "lojas", name: "Lojas & Varejo", label: "Lojas" },
    { id: "bar", name: "Bar & Adega", label: "Bar" },
    { id: "serralheiro", name: "Serralheria & Soldas", label: "Serralheiro" },
    { id: "estofador", name: "Estofador & Reformas", label: "Estofador" },
    { id: "marceneiro", name: "Marcenaria & Móveis", label: "Marceneiro" },
    { id: "doces", name: "Doceria & Bolos", label: "Doces" },
    { id: "salgados", name: "Salgados & Salgadinhos", label: "Salgados" },
    { id: "pensao", name: "Pensão / Marmitas", label: "Pensão" },
    { id: "restaurante", name: "Restaurante", label: "Restaurante" },
    { id: "padaria", name: "Padaria & Mercadinho", label: "Padaria & Mercadinho" },
    { id: "academia", name: "Academia & Fitness", label: "Academia" },
    { id: "lava_jato", name: "Lava Jato", label: "Lava Jato" },
    { id: "auto_pecas", name: "Autopeças & Peças", label: "Autopeças" },
    { id: "mecanico", name: "Oficina Mecânica", label: "Mecânico" },
    { id: "comercio_geral", name: "Loja / Comércio Geral", label: "Comércio" },
    { id: "loja_racao", name: "Loja de Ração & Pet", label: "Loja de Ração" },
    { id: "aviario", name: "Aviário & Rações", label: "Aviário" },
    { id: "acougue", name: "Açougue & Carnes", label: "Açougue" },
    { id: "sacolao", name: "Sacolão & Hortifrúti", label: "Sacolão" },
    { id: "outros_comercios", name: "Outros Segmentos", label: "Outros" }
  ];

  const fullNicheList = [
    ...predefinedNiches,
    ...customNiches.map(c => ({ id: c.id, name: c.name, label: c.label }))
  ];

  const activeNicheMeta = getNicheMeta(selectedNiche);
  const ActiveNicheIcon = activeNicheMeta.icon;
  // Navigation trigger that closes drawer afterwards
  const handleNavigate = (mode: any, subTab: string | null = null, mainTab: string = "calc", checkoutOnly: boolean = false) => {
    // Permission checks
    if (!isOwner) {
      if (mode === "notes" && isNotesLocked) {
        showNotification("Seu cargo não possui permissão para acessar o Bloco de Notas! ❌", "error");
        return;
      }
      if (mode === "receipts" && isReceiptsLocked) {
        showNotification("Seu cargo não possui permissão para acessar o Bloco Livre / Diário! ❌", "error");
        return;
      }
      if (mode === "agenda" && isAgendaLocked) {
        showNotification("Seu cargo não possui permissão para acessar Pedidos / Agenda! ❌", "error");
        return;
      }
      if (mode === "brecho" && isBrechoLocked) {
        showNotification("Seu cargo não possui permissão para acessar o Bazar / Brechó! ❌", "error");
        return;
      }
      if (mode === "super" && isSuperLocked) {
        showNotification("Seu cargo não possui permissão para acessar a Lista de Compras! ❌", "error");
        return;
      }
      if (mode === "encartes" && isEncartesLocked) {
        showNotification("Seu cargo não possui permissão para acessar o Gerador de Encartes! ❌", "error");
        return;
      }
      if (mode === "edit" && isFinanceiroLocked) {
        showNotification("Seu cargo não possui permissão para acessar o Painel Financeiro! ❌", "error");
        return;
      }
      if (mode === "pdv") {
        if (isPdvLocked) {
          showNotification("Seu cargo não possui permissão para acessar a Frente de Caixa (PDV)! ❌", "error");
          return;
        }
        if (subTab === "inventory" && isInventoryLocked) {
          showNotification("Seu cargo não possui permissão para Consultar o Estoque! ❌", "error");
          return;
        }
        if (subTab === "devolucao" && !isOwner && !currentRoleConfig.allowVoidSale) {
          showNotification("Seu cargo não possui permissão para Consultar Devoluções! ❌", "error");
          return;
        }
        if (subTab === "caixa" && isCaixaLocked) {
          showNotification("Seu cargo não possui permissão para acessar o Controle de Caixa! ❌", "error");
          return;
        }
        if ((subTab === "segment" || subTab === "pricing") && isReportsLocked) {
          showNotification("Seu cargo não possui permissão para acessar os Relatórios! ❌", "error");
          return;
        }
      }
    }

    setActiveTab(mainTab);
    setNotepadMode(mode);
    if (mode === "pdv") {
      if (setPdvCheckoutOnly) {
        setPdvCheckoutOnly(checkoutOnly);
      }
    }
    if (subTab !== null) {
      setPdvActiveSubTab(subTab);
    }
    onClose();
    
    // Smooth scroll to main paper container
    setTimeout(() => {
      const el = document.getElementById("notepad-paper-anchor") || document.querySelector(".relative");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 150);
  };

  const handleWhatsApp = () => {
    const text = `Olá! Sou usuário do Cérebro Inteligente e gostaria de tirar uma dúvida ou enviar uma sugestão! 🚀`;
    const url = `https://api.whatsapp.com/send?phone=5521999999999&text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  return (
    <>
      {/* BACKDROP OVERLAY */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[1000] cursor-pointer"
        id="sidebar-backdrop"
      />

      {/* SIDEBAR CONTAINER */}
      <motion.aside
        initial={{ x: "-100%" }}
        animate={{ x: 0 }}
        exit={{ x: "-100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 220 }}
        className="fixed top-0 left-0 h-full w-[310px] sm:w-[355px] bg-slate-950 border-r border-white/10 z-[1001] flex flex-col justify-between overflow-hidden text-white shadow-2xl"
        id="sidebar-drawer"
      >
            {/* MAIN SCROLLABLE CONTENT */}
            <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col">
              {/* BEAUTIFUL HEADER CARD MATCHING THE SCREENSHOT */}
              <div className="relative bg-[#024e82] p-5 pb-6 overflow-visible flex flex-col justify-between select-none">
                {/* Visual Accent/Gradients like in the screenshot */}
                <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-orange-500 to-transparent opacity-20 skew-x-12 transform origin-top-right pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none" />
                
                {/* Top Bar with Close button and branding logo */}
                <div className="flex justify-between items-start mb-4">
                  <div className="w-11 h-11 bg-slate-900 rounded-2xl flex items-center justify-center overflow-hidden shadow-lg shadow-black/35 border border-white/10 shrink-0">
                    <img src="/icon.svg" className="w-full h-full object-cover" alt="Logo Cérebro" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  </div>
                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white/80 hover:text-white transition-all cursor-pointer"
                    title="Fechar Menu"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Profile & Enterprise Identification */}
                <div className="space-y-3.5 text-left relative z-10 w-full">
                  
                  {/* Company/Enterprise Setup area */}
                  <div className="bg-slate-950/40 p-3 rounded-xl border border-white/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9.5px] font-black uppercase tracking-wider text-blue-200 flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-orange-400" />
                        Identificação da Empresa
                      </span>
                      {!isEditingCompany && (
                        <button
                          onClick={() => {
                            setCompanyName(storeName || "");
                            setCompanyCnpjCpf(storeCnpjCpf || "");
                            setIsEditingCompany(true);
                          }}
                          className="text-[9.5px] font-black uppercase text-amber-400 hover:text-amber-350 flex items-center gap-1 cursor-pointer transition-colors"
                          title="Editar Nome/CNPJ"
                        >
                          <Pencil className="w-3 h-3" />
                          <span>Editar</span>
                        </button>
                      )}
                    </div>

                    {isEditingCompany ? (
                      <div className="space-y-2.5 mt-1">
                        <div className="space-y-1">
                          <label className="text-[8.5px] font-bold text-slate-300 uppercase tracking-wider">Nome da Empresa / Comércio</label>
                          <input
                            type="text"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            placeholder="Ex: Mercadinho da Denise"
                            className="w-full bg-slate-900 border border-white/15 rounded-lg px-2 py-1.5 text-xs text-white outline-none font-bold"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8.5px] font-bold text-slate-300 uppercase tracking-wider">CNPJ ou CPF</label>
                          <input
                            type="text"
                            value={companyCnpjCpf}
                            onChange={(e) => setCompanyCnpjCpf(e.target.value)}
                            placeholder="Ex: 12.345.678/0001-90"
                            className="w-full bg-slate-900 border border-white/15 rounded-lg px-2 py-1.5 text-xs text-white outline-none font-bold font-mono"
                          />
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            onClick={handleCompanySave}
                            className="flex-1 bg-green-600 hover:bg-green-500 text-white text-[10px] font-black uppercase py-1.5 rounded-lg shadow transition-all cursor-pointer"
                          >
                            Salvar 💾
                          </button>
                          <button
                            onClick={() => setIsEditingCompany(false)}
                            className="bg-white/10 hover:bg-white/15 text-white text-[10px] font-black uppercase px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1 select-text">
                        <h3 className="text-sm font-black text-white leading-tight uppercase tracking-wide">
                          {storeName || "Nome da sua empresa"}
                        </h3>
                        {storeCnpjCpf ? (
                          <p className="text-[10px] font-extrabold text-amber-400/90 truncate max-w-full font-mono uppercase tracking-wider">
                            📄 CNPJ/CPF: {storeCnpjCpf}
                          </p>
                        ) : (
                          <p className="text-[9px] font-medium text-slate-400 italic">
                            (Sem CNPJ/CPF cadastrado)
                          </p>
                        )}
                        <p className="text-[10.5px] font-bold text-blue-200/90 truncate max-w-full font-mono mt-0.5">
                          ✉️ {user?.email || "visitante@cerebro.com"}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* PIN Login / Session Status block */}
                  <div className="bg-slate-950/40 p-3 rounded-xl border border-white/10 space-y-2">
                    {gestaoRole ? (
                      // Session is ACTIVE
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-black uppercase tracking-wider text-green-400 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            Sessão por PIN Ativa
                          </span>
                          <span className="inline-flex items-center gap-0.5 bg-amber-500 text-slate-950 text-[8.5px] font-black uppercase px-1.5 py-0.5 rounded-md">
                            <Sparkles className="w-2 h-2" />
                            <span>
                              {gestaoRole === "proprietario" ? "Proprietário" : 
                               gestaoRole === "gerente" ? "Gerente" : 
                               gestaoRole === "caixa" ? "Caixa" : "Funcionário"}
                            </span>
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 bg-white/5 p-2 rounded-lg border border-white/5">
                          <div className="w-8 h-8 rounded-full bg-orange-500/10 border border-orange-500/30 flex items-center justify-center shrink-0">
                            {gestaoRole === "proprietario" ? (
                              <KeyRound className="w-4 h-4 text-orange-400" />
                            ) : (
                              <User className="w-4 h-4 text-orange-400" />
                            )}
                          </div>
                          <div className="truncate text-left">
                            <p className="text-[11px] font-extrabold text-white truncate leading-snug">
                              {gestaoName || "Operador"}
                            </p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                              PIN Autenticado ✓
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={handlePinLogout}
                          type="button"
                          className="w-full bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/20 hover:border-red-500/40 text-[10px] font-black uppercase py-1.5 rounded-lg shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Bloquear / Sair da Sessão</span>
                        </button>
                      </div>
                    ) : (
                      // Session is LOCKED / BLOCKED - enter PIN
                      <form onSubmit={handlePinLogin} className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-black uppercase tracking-wider text-amber-500 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                            Acesso Operador - Logar com PIN
                          </span>
                        </div>

                        {/* Company Identification Fields inside Login */}
                        <div className="bg-slate-900/60 p-2.5 rounded-lg border border-white/5 space-y-2 text-left">
                          <span className="text-[8px] font-black uppercase text-blue-400 tracking-wider block">Identificação da Empresa</span>
                          
                          <div className="space-y-1">
                            <label className="text-[8px] font-bold text-slate-400 uppercase">Nome da Empresa</label>
                            <input
                              type="text"
                              value={companyName}
                              onChange={(e) => setCompanyName(e.target.value)}
                              placeholder="Nome da Empresa"
                              className="w-full bg-slate-950 border border-white/10 rounded-md px-2 py-1 text-xs text-white outline-none font-bold"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[8px] font-bold text-slate-400 uppercase">CNPJ ou CPF</label>
                            <input
                              type="text"
                              value={companyCnpjCpf}
                              onChange={(e) => setCompanyCnpjCpf(e.target.value)}
                              placeholder="CNPJ ou CPF"
                              className="w-full bg-slate-950 border border-white/10 rounded-md px-2 py-1 text-xs text-white outline-none font-bold font-mono"
                            />
                          </div>
                        </div>

                        {/* Email Field */}
                        <div className="space-y-1 text-left">
                          <label className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider">E-mail do Operador</label>
                          <input
                            type="email"
                            value={pinEmail}
                            onChange={(e) => setPinEmail(e.target.value)}
                            placeholder="seuemail@comercio.com"
                            className="w-full bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none font-bold"
                          />
                        </div>

                        {/* Role Select Field */}
                        <div className="space-y-1 text-left">
                          <label className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider">Cargo de Acesso</label>
                          <select
                            value={pinRole}
                            onChange={(e) => setPinRole(e.target.value as any)}
                            className="w-full bg-slate-900 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white outline-none font-bold cursor-pointer"
                          >
                            <option value="proprietario">👑 Proprietário</option>
                            <option value="gerente">⭐ Gerente</option>
                            <option value="caixa">💵 Caixa</option>
                            <option value="funcionario">👤 Funcionário / Vendedor</option>
                          </select>
                        </div>
                        
                        {/* PIN Password Field */}
                        <div className="space-y-1 text-left">
                          <label className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider">PIN de Acesso</label>
                          <div className="relative">
                            <input
                              type={showPin ? "text" : "password"}
                              value={pinInput}
                              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                              placeholder="Digite o PIN (4-6 números)"
                              className="w-full bg-slate-900 border border-white/15 rounded-lg pl-8 pr-8 py-1.5 text-xs text-white outline-none font-bold font-mono tracking-widest text-center placeholder:tracking-normal placeholder:font-sans"
                              maxLength={6}
                            />
                            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                              <KeyRound className="w-3.5 h-3.5" />
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowPin(!showPin)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer p-0.5"
                            >
                              {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="w-full bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase py-2 rounded-lg shadow-md transition-all cursor-pointer flex items-center justify-center gap-1"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Entrar / Logar com PIN</span>
                        </button>
                      </form>
                    )}
                  </div>

                </div>

                {/* Active Niche Selector Dropdown */}
                <div className="mt-4 relative z-50">
                  <span className="text-[9px] font-black uppercase text-blue-200 block mb-1">
                    Estabelecimento Operacional Ativo 🏢
                  </span>
                  <button
                    onClick={() => setIsNicheDropdownOpen(!isNicheDropdownOpen)}
                    className="w-full flex items-center justify-between gap-2.5 px-3 py-2.5 bg-slate-950/60 hover:bg-slate-950/80 border border-white/10 rounded-xl transition-all cursor-pointer text-left shadow-inner"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className={`p-1.5 rounded-lg ${activeNicheMeta.color}`}>
                        <ActiveNicheIcon className="w-4 h-4 shrink-0" />
                      </span>
                      <span className="text-xs font-black uppercase text-white truncate">
                        {activeNicheMeta.name}
                      </span>
                    </div>
                    {isNicheDropdownOpen ? (
                      <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                  </button>

                  <AnimatePresence>
                    {isNicheDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900/95 backdrop-blur-md border border-white/15 rounded-xl shadow-2xl z-50 max-h-[220px] overflow-y-auto p-1.5 space-y-1 no-scrollbar"
                      >
                        {fullNicheList.map((n) => {
                          const nMeta = getNicheMeta(n.id);
                          const NIcon = nMeta.icon;
                          const isSelected = selectedNiche === n.id;
                          return (
                            <button
                              key={n.id}
                              onClick={() => {
                                if (setSelectedNiche) {
                                  setSelectedNiche(n.id);
                                  localStorage.setItem("pdv_selected_segment", n.id);
                                }
                                setIsNicheDropdownOpen(false);
                                showNotification(`Estabelecimento ativo: ${n.label} 🏢`, "success");
                              }}
                              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs uppercase font-extrabold text-left transition-all flex justify-between ${
                                isSelected
                                  ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20 font-black"
                                  : "hover:bg-white/5 text-slate-300 hover:text-white"
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <span className={`p-1 rounded-md ${nMeta.color}`}>
                                  <NIcon className="w-3.5 h-3.5 shrink-0" />
                                </span>
                                <span className="truncate">{n.name}</span>
                              </div>
                            </button>
                          );
                        })}
                        <button
                          onClick={() => {
                            setIsNicheDropdownOpen(false);
                            handleNavigate("pdv", "taxas");
                            showNotification("Cadastre novos comércios personalizados na aba de Configurações! 🏢", "info");
                          }}
                          className="w-full flex items-center justify-center gap-1 px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[10px] uppercase tracking-wider rounded-lg transition-all sticky bottom-0 shadow-lg"
                        >
                          <Plus className="w-3.5 h-3.5 shrink-0" />
                          <span>Adicionar Comércio</span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* NAVIGATION LIST */}
              <div className="p-4 space-y-6 flex-1 text-left">
                {/* 🌟 ACESSO DIRETO: PERMISSÕES DOS FUNCIONÁRIOS (PRINT DA TELA) */}
                <div className="p-3 bg-gradient-to-r from-purple-950/90 via-slate-900 to-indigo-950/90 border-2 border-purple-500/50 rounded-2xl shadow-xl shadow-purple-950/40 relative overflow-hidden">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-gradient-to-br from-amber-400/20 to-purple-500/30 rounded-xl border border-amber-400/30 text-amber-400">
                        <Crown className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[12px] font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                          Permissões dos Funcionários 🛡️
                        </span>
                        <p className="text-[9.5px] text-purple-300 font-medium">
                          Tela do print: Caixa, Vendedor & Gerente
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    id="sidebar-btn-permissoes-destaque"
                    onClick={handleProprietarioClick}
                    className="w-full py-2.5 px-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-98 text-white font-black text-[11px] uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer border border-purple-400/30"
                  >
                    <Sliders className="w-3.5 h-3.5 text-amber-300" />
                    <span>Abrir Tela de Permissões (Print) 👑</span>
                  </button>
                </div>

                {/* SECTION 1: OPERACIONAL */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2.5 block mb-2">
                    Operacional
                  </span>

                  {/* 0. Frente de Caixa (Balcão) */}
                  <button
                    onClick={() => handleNavigate("pdv", null, "calc", true)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer text-left ${
                      notepadMode === "pdv" && pdvCheckoutOnly
                        ? "bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 font-extrabold shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                        : "hover:bg-white/5 border border-transparent text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <ShoppingCart className="w-5 h-5 text-emerald-400 shrink-0" />
                      <span className="text-[12px] uppercase font-bold tracking-wide flex items-center gap-1.5">
                        Frente de Caixa (Balcão) 🛒
                        <span className="text-[8px] bg-emerald-500 text-slate-950 font-black px-1.5 py-0.5 rounded">RÁPIDO</span>
                      </span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                  </button>

                  {/* 0.5. PDV Geral & Administrativo */}
                  <button
                    onClick={() => handleNavigate("pdv", null, "calc", false)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer text-left ${
                      notepadMode === "pdv" && !pdvCheckoutOnly && pdvActiveSubTab === null
                        ? "bg-orange-600/20 border border-orange-500/30 text-orange-300 font-extrabold shadow-[0_0_15px_rgba(249,115,22,0.15)]"
                        : "hover:bg-white/5 border border-transparent text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Store className="w-5 h-5 text-orange-400 shrink-0" />
                      <span className="text-[12px] uppercase font-bold tracking-wide">
                        PDV Geral & Administrativo 🏪
                      </span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                  </button>

                  {/* 1. Segmentos */}
                  <button
                    onClick={() => handleNavigate("segmentos")}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer text-left ${
                      notepadMode === "segmentos"
                        ? "bg-blue-600/20 border border-blue-500/30 text-blue-300 font-extrabold shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                        : "hover:bg-white/5 border border-transparent text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Store className="w-5 h-5 text-blue-400 shrink-0" />
                      <span className="text-[12px] uppercase font-bold tracking-wide">Segmentos</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                  </button>

                  {/* 2. Cadastro de produto */}
                  <button
                    onClick={() => handleNavigate("pdv", "cadastro_produtos")}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer text-left ${
                      notepadMode === "pdv" && pdvActiveSubTab === "cadastro_produtos"
                        ? "bg-sky-600/20 border border-sky-500/30 text-sky-300 font-extrabold shadow-[0_0_15px_rgba(14,165,233,0.15)]"
                        : "hover:bg-white/5 border border-transparent text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <ShoppingBag className="w-5 h-5 text-sky-400 shrink-0" />
                      <span className="text-[12px] uppercase font-bold tracking-wide">Cadastro de produto</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                  </button>

                  {/* 3. Pedidos em aberto */}
                  <button
                    onClick={() => handleNavigate("agenda")}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer text-left ${
                      notepadMode === "agenda"
                        ? "bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 font-extrabold shadow-[0_0_15px_rgba(99,102,241,0.15)]"
                        : "hover:bg-white/5 border border-transparent text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-indigo-400 shrink-0" />
                      <span className="text-[12px] uppercase font-bold tracking-wide">Pedidos em aberto</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                  </button>

                  {/* 4. Consultar vendas */}
                  <button
                    onClick={() => handleNavigate("pdv", "health")}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer text-left ${
                      notepadMode === "pdv" && (pdvActiveSubTab === "health" || pdvActiveSubTab === null)
                        ? "bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 font-extrabold shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                        : "hover:bg-white/5 border border-transparent text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Layers className="w-5 h-5 text-emerald-400 shrink-0" />
                      <span className="text-[12px] uppercase font-bold tracking-wide">Consultar vendas</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                  </button>

                  {/* 5. Consultar devolução */}
                  <button
                    onClick={() => handleNavigate("pdv", "devolucao")}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer text-left ${
                      notepadMode === "pdv" && pdvActiveSubTab === "devolucao"
                        ? "bg-rose-600/20 border border-rose-500/30 text-rose-300 font-extrabold shadow-[0_0_15px_rgba(244,63,94,0.15)]"
                        : "hover:bg-white/5 border border-transparent text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <RotateCcw className="w-5 h-5 text-rose-400 shrink-0" />
                      <span className="text-[12px] uppercase font-bold tracking-wide">Consultar devolução</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                  </button>

                  {/* 6. Consultar estoque */}
                  <button
                    onClick={() => handleNavigate("pdv", "inventory")}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer text-left ${
                      notepadMode === "pdv" && pdvActiveSubTab === "inventory"
                        ? "bg-teal-600/20 border border-teal-500/30 text-teal-300 font-extrabold shadow-[0_0_15px_rgba(20,184,166,0.15)]"
                        : "hover:bg-white/5 border border-transparent text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Layers className="w-5 h-5 text-teal-400 shrink-0" />
                      <span className="text-[12px] uppercase font-bold tracking-wide">Consultar estoque</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                  </button>
                </div>

                {/* SECTION 2: GESTÃO */}
                <div className="space-y-1.5 pt-4 border-t border-white/5">
                  <div className="flex items-center justify-between px-2.5 mb-2">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                      Gestão
                    </span>
                    {isUnlocked ? (
                      <span className={`px-2 py-0.5 rounded text-[7.5px] font-black uppercase tracking-wider flex items-center gap-1 ${
                        isOwner 
                          ? "bg-purple-600/20 text-purple-300 border border-purple-500/20" 
                          : isGerente 
                            ? "bg-amber-600/20 text-amber-300 border border-amber-500/20" 
                            : "bg-blue-600/20 text-blue-300 border border-blue-500/20"
                      }`}>
                        {isOwner ? "👑 Dono" : isGerente ? `⭐ ${gestaoName}` : `👤 ${gestaoName}`}
                      </span>
                    ) : (
                      <span className="bg-slate-950 px-2 py-0.5 rounded text-[7px] font-black uppercase text-slate-500 border border-white/5 tracking-wider flex items-center gap-1">
                        🔒 Bloqueado
                      </span>
                    )}
                  </div>

                  {/* 👑 PROPRIETÁRIO COM PIN - EXCLUSIVO PARA O DONO */}
                  <button
                    id="sidebar-btn-proprietario-pin"
                    onClick={handleProprietarioClick}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all cursor-pointer text-left border mb-2 ${
                      notepadMode === "pdv" && (pdvActiveSubTab === "proprietario" || pdvActiveSubTab === "equipe")
                        ? "bg-purple-600/30 border-purple-400 text-white font-black shadow-[0_0_20px_rgba(168,85,247,0.35)] scale-[1.01]"
                        : "bg-gradient-to-r from-purple-950/70 via-purple-900/30 to-slate-900 hover:from-purple-900/80 hover:to-purple-950/60 border-purple-500/40 text-purple-100 shadow-md"
                    }`}
                    title="Acesso exclusivo com PIN para o Proprietário dar permissão a cada funcionário"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-gradient-to-br from-amber-500/20 to-purple-500/30 text-amber-400 rounded-xl border border-amber-400/40 shrink-0 shadow-sm">
                        <Crown className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[12.5px] uppercase font-black tracking-wide text-white flex items-center gap-1">
                            Proprietário com PIN 👑
                          </span>
                          {!pdvLicenseActive ? (
                            <span className="text-[7.5px] bg-amber-500 text-slate-950 font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                              PRO
                            </span>
                          ) : isOwnerMode && gestaoRole === "proprietario" ? (
                            <span className="text-[7.5px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                              ONLINE
                            </span>
                          ) : null}
                        </div>
                        <p className="text-[9.5px] text-purple-300/80 font-semibold tracking-tight">
                          Permissões dos funcionários & Equipe
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {isOwnerMode && gestaoRole === "proprietario" ? (
                        <Unlock className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Lock className="w-4 h-4 text-amber-400 opacity-80" />
                      )}
                      <ChevronRight className="w-3.5 h-3.5 text-purple-300 opacity-60" />
                    </div>
                  </button>

                  {/* 7. Relatórios */}
                  <button
                    onClick={() => handleNavigate("pdv", "segment")}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer text-left ${
                      notepadMode === "pdv" && pdvActiveSubTab === "segment"
                        ? "bg-green-600/20 border border-green-500/30 text-green-300 font-extrabold shadow-[0_0_15px_rgba(34,197,94,0.15)]"
                        : "hover:bg-white/5 border border-transparent text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <TrendingUp className="w-5 h-5 text-green-400 shrink-0" />
                      <span className="text-[12px] uppercase font-bold tracking-wide flex items-center gap-1.5">
                        Relatórios
                        {isReportsLocked && <Lock className="w-3 h-3 text-amber-500 shrink-0" />}
                      </span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                  </button>

                  {/* 9. Controle de caixa */}
                  <button
                    onClick={() => handleNavigate("pdv", "caixa")}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer text-left ${
                      notepadMode === "pdv" && pdvActiveSubTab === "caixa"
                        ? "bg-purple-600/20 border border-purple-500/30 text-purple-300 font-extrabold shadow-[0_0_15px_rgba(168,85,247,0.15)]"
                        : "hover:bg-white/5 border border-transparent text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-purple-400 shrink-0" />
                      <span className="text-[12px] uppercase font-bold tracking-wide flex items-center gap-1.5">
                        Controle de caixa
                        {isCaixaLocked && <Lock className="w-3 h-3 text-amber-500 shrink-0" />}
                      </span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                  </button>

                  {/* 10. Fiado */}
                  <button
                    onClick={() => handleNavigate("pdv", "fiado")}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer text-left ${
                      notepadMode === "pdv" && pdvActiveSubTab === "fiado"
                        ? "bg-orange-600/20 border border-orange-500/30 text-orange-300 font-extrabold shadow-[0_0_15px_rgba(249,115,22,0.15)]"
                        : "hover:bg-white/5 border border-transparent text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-orange-400 shrink-0" />
                      <span className="text-[12px] uppercase font-bold tracking-wide">Fiado</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                  </button>

                  {/* 11. Painel do Proprietário */}
                  <button
                    onClick={handleProprietarioClick}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer text-left ${
                      notepadMode === "pdv" && (pdvActiveSubTab === "equipe" || pdvActiveSubTab === "proprietario")
                        ? "bg-purple-600/20 border border-purple-500/30 text-purple-300 font-extrabold shadow-[0_0_15px_rgba(168,85,247,0.15)]"
                        : "hover:bg-white/5 border border-transparent text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Sliders className="w-5 h-5 text-fuchsia-400 shrink-0" />
                      <span className="text-[12px] uppercase font-bold tracking-wide flex items-center gap-1.5">
                        Auditoria, PIN & Equipe 👑
                        {isEquipeLocked && <Lock className="w-3 h-3 text-amber-500 shrink-0" />}
                      </span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                  </button>

                  {/* 11. Financeiro */}
                  <button
                    onClick={() => handleNavigate("edit")}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer text-left ${
                      notepadMode === "edit"
                        ? "bg-pink-600/20 border border-pink-500/30 text-pink-300 font-extrabold shadow-[0_0_15px_rgba(236,72,153,0.15)]"
                        : "hover:bg-white/5 border border-transparent text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <DollarSign className="w-5 h-5 text-pink-400 shrink-0" />
                      <span className="text-[12px] uppercase font-bold tracking-wide">Financeiro</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                  </button>

                  {/* 🌟 12. Contabilidade & O Leão (Aba 5) */}
                  <button
                    id="sidebar-btn-contabilidade-drawer"
                    onClick={() => handleNavigate("contabilidade")}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer text-left ${
                      notepadMode === "contabilidade"
                        ? "bg-indigo-600/25 border border-indigo-500/40 text-indigo-200 font-extrabold shadow-[0_0_15px_rgba(99,102,241,0.25)]"
                        : "hover:bg-white/5 border border-transparent text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Landmark className="w-5 h-5 text-indigo-400 shrink-0" />
                      <span className="text-[12px] uppercase font-bold tracking-wide flex items-center gap-1.5">
                        Contabilidade & O Leão 🏛️
                        <span className="text-[8px] bg-indigo-500 text-white font-black px-1.5 py-0.5 rounded">ABA 5</span>
                      </span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                  </button>

                  {/* 🌟 13. Comandos do Balcão & Gaveta (Aba 6) */}
                  <button
                    id="sidebar-btn-balcao-drawer"
                    onClick={() => handleNavigate("balcao")}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer text-left ${
                      notepadMode === "balcao"
                        ? "bg-emerald-600/25 border border-emerald-500/40 text-emerald-200 font-extrabold shadow-[0_0_15px_rgba(16,185,129,0.25)]"
                        : "hover:bg-white/5 border border-transparent text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <ShoppingCart className="w-5 h-5 text-emerald-400 shrink-0" />
                      <span className="text-[12px] uppercase font-bold tracking-wide flex items-center gap-1.5">
                        Comandos do Balcão 🏪
                        <span className="text-[8px] bg-emerald-500 text-white font-black px-1.5 py-0.5 rounded">ABA 6</span>
                      </span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                  </button>

                  {/* 🌟 14. Gestão, Clientes & IA (Aba 7) */}
                  <div className="bg-purple-950/30 border border-purple-500/25 rounded-2xl p-1.5 space-y-1">
                    <button
                      id="sidebar-btn-gestao-ia-drawer"
                      onClick={() => setIsAba7Open(!isAba7Open)}
                      className={`w-full flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer text-left ${
                        notepadMode === "pdv" && (pdvActiveSubTab === "ficha_tecnica" || pdvActiveSubTab === "pricing" || pdvActiveSubTab === "clientes" || pdvActiveSubTab === "fiado" || pdvActiveSubTab === "taxas" || pdvActiveSubTab === "relatorios")
                          ? "bg-purple-600/30 text-purple-200 font-extrabold shadow-[0_0_12px_rgba(168,85,247,0.2)]"
                          : "hover:bg-white/5 text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Sparkles className="w-5 h-5 text-amber-400 shrink-0 animate-pulse" />
                        <div>
                          <span className="text-[12px] uppercase font-bold tracking-wide flex items-center gap-1.5 text-white">
                            Gestão, Clientes & IA 🌟
                            <span className="text-[8px] bg-purple-500 text-white font-black px-1.5 py-0.5 rounded">ABA 7</span>
                          </span>
                          <span className="text-[9.5px] text-slate-400 block font-normal">Precificação, Fiados, Clientes & IA</span>
                        </div>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-purple-300 transition-transform duration-200 ${isAba7Open ? "rotate-180" : ""}`} />
                    </button>

                    {isAba7Open && (
                      <div className="pl-2 pr-1 py-1 space-y-1 border-t border-white/5 animate-fadeIn">
                        {/* 1. Precificação */}
                        <button
                          onClick={() => handleNavigate("pdv", "pricing")}
                          className={`w-full flex items-center justify-between p-2 rounded-lg text-xs font-bold transition-all cursor-pointer text-left ${
                            notepadMode === "pdv" && (pdvActiveSubTab === "ficha_tecnica" || pdvActiveSubTab === "pricing")
                              ? "bg-pink-600/30 text-pink-200 font-extrabold border border-pink-500/30 shadow-sm"
                              : "text-slate-300 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <Percent className="w-4 h-4 text-pink-400 shrink-0" />
                            <span>Calculadora de Precificação 💰</span>
                          </span>
                          <ChevronRight className="w-3 h-3 opacity-40" />
                        </button>

                        {/* 2. Clientes Fiéis */}
                        <button
                          onClick={() => handleNavigate("pdv", "clientes")}
                          className={`w-full flex items-center justify-between p-2 rounded-lg text-xs font-bold transition-all cursor-pointer text-left ${
                            notepadMode === "pdv" && pdvActiveSubTab === "clientes"
                              ? "bg-emerald-600/30 text-emerald-200 font-extrabold border border-emerald-500/30 shadow-sm"
                              : "text-slate-300 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span>Clientes Fiéis & Fidelidade 👥</span>
                          </span>
                          <ChevronRight className="w-3 h-3 opacity-40" />
                        </button>

                        {/* 3. Fiados */}
                        <button
                          onClick={() => handleNavigate("pdv", "fiado")}
                          className={`w-full flex items-center justify-between p-2 rounded-lg text-xs font-bold transition-all cursor-pointer text-left ${
                            notepadMode === "pdv" && pdvActiveSubTab === "fiado"
                              ? "bg-purple-600/30 text-purple-200 font-extrabold border border-purple-500/30 shadow-sm"
                              : "text-slate-300 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-purple-400 shrink-0" />
                            <span>Caderneta de Fiado Digital 📕</span>
                          </span>
                          <ChevronRight className="w-3 h-3 opacity-40" />
                        </button>

                        {/* 4. Taxas de Cartões & Tributos */}
                        <button
                          onClick={() => handleNavigate("pdv", "taxas")}
                          className={`w-full flex items-center justify-between p-2 rounded-lg text-xs font-bold transition-all cursor-pointer text-left ${
                            notepadMode === "pdv" && pdvActiveSubTab === "taxas"
                              ? "bg-indigo-600/30 text-indigo-200 font-extrabold border border-indigo-500/30 shadow-sm"
                              : "text-slate-300 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-indigo-400 shrink-0" />
                            <span>Taxas de Cartões & Tributos 💳</span>
                          </span>
                          <ChevronRight className="w-3 h-3 opacity-40" />
                        </button>

                        {/* 5. Conselheiro & Mentoria */}
                        <button
                          onClick={() => handleNavigate("pdv", "relatorios")}
                          className={`w-full flex items-center justify-between p-2 rounded-lg text-xs font-bold transition-all cursor-pointer text-left ${
                            notepadMode === "pdv" && pdvActiveSubTab === "relatorios"
                              ? "bg-amber-600/30 text-amber-200 font-extrabold border border-amber-500/30 shadow-sm"
                              : "text-slate-300 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                            <span>Conselheiro & Mentoria do Dono 👑</span>
                          </span>
                          <ChevronRight className="w-3 h-3 opacity-40" />
                        </button>

                        {/* 6. Ajuda IA */}
                        <button
                          onClick={() => handleNavigate("pdv", "ajuda")}
                          className={`w-full flex items-center justify-between p-2 rounded-lg text-xs font-bold transition-all cursor-pointer text-left ${
                            notepadMode === "pdv" && pdvActiveSubTab === "ajuda"
                              ? "bg-cyan-600/30 text-cyan-200 font-extrabold border border-cyan-500/30 shadow-sm"
                              : "text-slate-300 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <Bot className="w-4 h-4 text-cyan-400 shrink-0" />
                            <span>Ajuda Inteligente & Assistente 🤖</span>
                          </span>
                          <ChevronRight className="w-3 h-3 opacity-40" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* SECTION 3: PREFERÊNCIAS */}
                <div className="space-y-1.5 pt-4 border-t border-white/5">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2.5 block mb-2">
                    Preferências
                  </span>

                  {/* 12. Configurações */}
                  <button
                    onClick={() => handleNavigate("pdv", "taxas")}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer text-left ${
                      notepadMode === "pdv" && pdvActiveSubTab === "taxas"
                        ? "bg-slate-600/20 border border-slate-500/30 text-slate-300 font-extrabold shadow-[0_0_15px_rgba(100,116,139,0.15)]"
                        : "hover:bg-white/5 border border-transparent text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Settings className="w-5 h-5 text-slate-400 shrink-0" />
                      <span className="text-[12px] uppercase font-bold tracking-wide">Configurações</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                  </button>

                  {/* 13. Ajuda */}
                  {onForceRestore && (
                    <button
                      onClick={() => {
                        onForceRestore();
                        onClose();
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 transition-all cursor-pointer text-left my-1"
                    >
                      <div className="flex items-center gap-3">
                        <RotateCcw className="w-5 h-5 text-cyan-400 shrink-0" />
                        <span className="text-[12px] uppercase font-black tracking-wide">Recuperar Configurações Antigas</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                    </button>
                  )}

                  <button
                    onClick={() => handleNavigate("ajuda")}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer text-left ${
                      notepadMode === "ajuda"
                        ? "bg-cyan-600/20 border border-cyan-500/30 text-cyan-300 font-extrabold shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                        : "hover:bg-white/5 border border-transparent text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <HelpCircle className="w-5 h-5 text-cyan-400 shrink-0" />
                      <span className="text-[12px] uppercase font-bold tracking-wide">Ajuda</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                  </button>

                  {user && (
                    <button
                      onClick={() => {
                        onLogout();
                        onClose();
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-red-500/10 hover:text-red-300 text-slate-400 border border-transparent transition-all cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-3">
                        <LogOut className="w-5 h-5 text-red-400 shrink-0" />
                        <span className="text-[12px] uppercase font-bold tracking-wide">Logout</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* BOTTOM CONTACT BUTTON */}
            <div className="p-4 border-t border-white/10 bg-slate-900/40 shrink-0">
              <button
                onClick={handleWhatsApp}
                className="w-full py-3 bg-[#11246d] hover:bg-[#182e85] text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md active:scale-95 border border-white/5"
              >
                <MessageSquare className="w-4 h-4 shrink-0" />
                <span>Entre em contato</span>
              </button>
            </div>
          </motion.aside>

          {/* OWNER PIN AUTHENTICATION / REGISTRATION MODAL */}
          {isOwnerPinModalOpen && (
            <div 
              className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
              onClick={() => setIsOwnerPinModalOpen(false)}
            >
              <div 
                className="bg-slate-900 border-2 border-purple-500/50 rounded-3xl p-6 w-full max-w-sm text-center shadow-[0_0_50px_rgba(168,85,247,0.35)] space-y-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <div className="flex items-center gap-2 text-amber-400 font-black text-sm uppercase tracking-wider">
                    <Crown className="w-5 h-5 text-amber-400" />
                    <span>Acesso do Proprietário</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsOwnerPinModalOpen(false)}
                    className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-center space-y-1">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-500/30 mb-1">
                    <KeyRound className="w-6 h-6 text-amber-400" />
                  </div>
                  <h4 className="text-white font-black text-base">
                    {isCreatingPin ? "Cadastrar PIN do Proprietário" : "Digite o PIN do Proprietário"}
                  </h4>
                  <p className="text-slate-400 text-xs">
                    {isCreatingPin 
                      ? "Cadastre um PIN mestre (4 a 6 dígitos) para gerenciar o que cada funcionário pode fazer." 
                      : "Área restrita: controle total das permissões de cada funcionário."}
                  </p>
                </div>

                {ownerPinError && (
                  <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs font-bold flex items-center gap-2 justify-center">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                    <span>{ownerPinError}</span>
                  </div>
                )}

                {/* Input Fields */}
                <div className="space-y-2.5">
                  <div className="relative">
                    <input
                      type={showOwnerPin ? "text" : "password"}
                      maxLength={6}
                      value={ownerPinInput}
                      onChange={(e) => {
                        setOwnerPinError("");
                        setOwnerPinInput(e.target.value.replace(/\D/g, ""));
                      }}
                      placeholder={isCreatingPin ? "Novo PIN (4-6 dígitos)" : "PIN do Proprietário"}
                      className="w-full bg-slate-950 border border-purple-500/40 rounded-xl py-3 px-4 text-center font-mono font-black text-xl tracking-[0.3em] text-white focus:outline-none focus:border-purple-400 placeholder:text-slate-600 placeholder:text-xs placeholder:font-sans placeholder:tracking-normal"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowOwnerPin(!showOwnerPin)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1 cursor-pointer"
                    >
                      {showOwnerPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {isCreatingPin && (
                    <input
                      type={showOwnerPin ? "text" : "password"}
                      maxLength={6}
                      value={confirmNewOwnerPin}
                      onChange={(e) => {
                        setOwnerPinError("");
                        setConfirmNewOwnerPin(e.target.value.replace(/\D/g, ""));
                      }}
                      placeholder="Confirme o Novo PIN"
                      className="w-full bg-slate-950 border border-purple-500/40 rounded-xl py-2.5 px-4 text-center font-mono font-black text-lg tracking-[0.3em] text-white focus:outline-none focus:border-purple-400 placeholder:text-slate-600 placeholder:text-xs placeholder:font-sans placeholder:tracking-normal"
                    />
                  )}
                </div>

                {/* Numeric Touch Keypad */}
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleKeypadPress(String(num))}
                      className="py-2.5 bg-slate-800/80 hover:bg-purple-600/40 active:scale-95 text-white font-black text-base rounded-xl transition-all border border-white/5 cursor-pointer"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleKeypadPress("clear")}
                    className="py-2.5 bg-slate-800/50 hover:bg-slate-700/80 active:scale-95 text-slate-400 font-bold text-xs rounded-xl transition-all border border-white/5 cursor-pointer"
                  >
                    Limpar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleKeypadPress("0")}
                    className="py-2.5 bg-slate-800/80 hover:bg-purple-600/40 active:scale-95 text-white font-black text-base rounded-xl transition-all border border-white/5 cursor-pointer"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={() => handleKeypadPress("backspace")}
                    className="py-2.5 bg-slate-800/50 hover:bg-slate-700/80 active:scale-95 text-slate-400 font-bold text-xs rounded-xl transition-all border border-white/5 cursor-pointer flex items-center justify-center"
                  >
                    ⌫
                  </button>
                </div>

                {/* Actions */}
                <div className="pt-2 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => handleVerifyOrSaveOwnerPin()}
                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-purple-600/25 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                  >
                    <Crown className="w-4 h-4 text-amber-400" />
                    <span>{isCreatingPin ? "Salvar PIN & Entrar 👑" : "Acessar como Proprietário 👑"}</span>
                  </button>

                  {(isAdmin || user?.email?.toLowerCase().includes("denise") || user?.email?.toLowerCase().includes("wellington")) && (
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          localStorage.setItem("pdv_owner_mode", "true");
                          localStorage.setItem("pdv_gestao_user_role", "proprietario");
                          localStorage.setItem("pdv_gestao_user_staff_name", "Proprietário (Admin)");
                        } catch (_) {}
                        setIsOwnerPinModalOpen(false);
                        handleNavigate("pdv", "proprietario");
                        showNotification("Acesso Master Liberado! 👑🔓", "success");
                      }}
                      className="w-full py-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-all border border-amber-500/30 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Shield className="w-3.5 h-3.5 text-amber-400" />
                      <span>Desbloquear Imediatamente (Denise / Wellington)</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsOwnerPinModalOpen(false)}
                    className="w-full py-2 bg-slate-800/60 hover:bg-slate-800 text-slate-400 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* DATA PRIVACY & ANTI-LEAKAGE NOTICE MODAL */}
          {showDataPrivacyNotice && (
            <div 
              className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
              onClick={() => setShowDataPrivacyNotice(false)}
            >
              <div 
                className="bg-slate-900 border-2 border-emerald-500/50 rounded-3xl p-6 w-full max-w-sm text-center shadow-[0_0_50px_rgba(16,185,129,0.25)] space-y-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mb-1">
                  <ShieldCheck className="w-8 h-8 text-emerald-400" />
                </div>

                <div className="space-y-1.5">
                  <h4 className="text-white font-black text-lg">
                    Dados Pessoais Protegidos 🛡️
                  </h4>
                  <p className="text-slate-300 text-xs leading-relaxed">
                    Para garantir que <strong>as permissões dos funcionários e dados da sua empresa fiquem 100% isolados</strong> e nunca vazem entre contas, conecte-se com sua conta de usuário.
                  </p>
                </div>

                <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-left space-y-1">
                  <div className="text-[11px] font-bold text-emerald-300 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Isolamento Total por Conta</span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Suas regras de funcionários são salvas na nuvem com chave de segurança vinculada exclusivamente ao seu UID.
                  </p>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDataPrivacyNotice(false);
                      onClose();
                      setActiveTab("profile");
                    }}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <User className="w-4 h-4" />
                    <span>Fazer Login Seguro na Conta</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDataPrivacyNotice(false);
                      proceedToOwnerPin();
                    }}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                  >
                    Continuar neste Navegador
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
  );
};
