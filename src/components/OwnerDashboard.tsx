import React, { useEffect, useState } from "react";
import { 
  Shield, 
  Save, 
  RefreshCw, 
  Check, 
  Settings, 
  Users, 
  ToggleLeft, 
  ToggleRight, 
  Lock, 
  Percent, 
  DollarSign, 
  Undo2, 
  Briefcase, 
  FileText, 
  CheckCircle2,
  AlertCircle,
  Trash2,
  UserPlus,
  UserCheck,
  Eye,
  EyeOff,
  Edit2,
  KeyRound
} from "lucide-react";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { OperationType, FirestoreErrorInfo } from "../types";
import { PermissionManagement } from "./PermissionManagement";

export interface RolePermissions {
  allowDiscount: boolean;
  maxDiscount: number;
  allowEditPrice: boolean;
  allowVoidSale: boolean;
  allowSuprimento: boolean;
  allowSangria: boolean;
  allowCloseShift: boolean;
  allowViewReports: boolean;
  allowOpenBalance: boolean;
  allowRemoveProduct: boolean;
  allowResetEntirePDV: boolean;
  allowNotes?: boolean;
  allowReceipts?: boolean;
  allowAgenda?: boolean;
  allowBrecho?: boolean;
  allowSuper?: boolean;
  allowEncartes?: boolean;
  allowFinanceiro?: boolean;
  allowPDV?: boolean;
  allowInventory?: boolean;
  allowPermissions?: boolean;
  allowReturn?: boolean;
  allowFiados?: boolean;
  allowGetCustomerContact?: boolean;
  allowAddProduct?: boolean;
}

export interface SystemConfig {
  userId: string;
  caixa: RolePermissions;
  vendedor: RolePermissions;
  gerente: RolePermissions;
  updatedAt?: any;
}

const DEFAULT_ROLE_PERMS = (role: string): RolePermissions => ({
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
  allowPermissions: role === "gerente",
  allowReturn: role === "gerente" || role === "caixa",
  allowFiados: role === "gerente" || role === "caixa",
  allowGetCustomerContact: true,
  allowAddProduct: role === "gerente"
});

interface DashboardToggleSwitchProps {
  checked: boolean;
  onChange: () => void;
  isDanger?: boolean;
}

const DashboardToggleSwitch: React.FC<DashboardToggleSwitchProps> = ({
  checked,
  onChange,
  isDanger = false
}) => {
  return (
    <div className="flex items-center gap-1.5 select-none shrink-0">
      <button
        type="button"
        onClick={onChange}
        className={`w-11 h-6 rounded-full p-0.5 transition-all duration-200 focus:outline-none flex items-center relative cursor-pointer border ${
          checked 
            ? (isDanger ? 'bg-rose-500/90 border-rose-500 shadow-md shadow-rose-500/20' : 'bg-purple-600 border-purple-500 shadow-md shadow-purple-500/20') 
            : 'bg-slate-950 border-white/10 hover:border-white/20'
        }`}
      >
        <span 
          className={`w-4.5 h-4.5 rounded-full shadow-sm transform transition-transform duration-200 ease-out ${
            checked ? 'translate-x-5 bg-white' : 'translate-x-0 bg-slate-400'
          }`} 
        />
      </button>
      <span className={`text-[10px] font-black w-6 text-left transition-colors ${
        checked 
          ? (isDanger ? 'text-rose-450' : 'text-emerald-400') 
          : 'text-slate-500'
      }`}>
        {checked ? "Sim" : "Não"}
      </span>
    </div>
  );
};

export interface StaffPin {
  id: string;
  name: string;
  pin: string;
  role: "gerente" | "funcionario" | "caixa" | "vendedor";
  permissions?: string[];
}

interface OwnerDashboardProps {
  db: any;
  userId: string;
  isLoggedIn: boolean;
  showNotification: (msg: string, type: "success" | "error" | "info") => void;
  onPermissionsUpdated?: (config: SystemConfig) => void;
  
  // Team management props
  staffPins?: StaffPin[];
  onToggleStaffPermission?: (staffId: string, permissionId: string) => void;
  onDeleteStaff?: (id: string, name: string) => void;
  editingStaffId?: string | null;
  setEditingStaffId?: (id: string | null) => void;
  newStaffName?: string;
  setNewStaffName?: (val: string) => void;
  newStaffPin?: string;
  setNewStaffPin?: (val: string) => void;
  newStaffRole?: "gerente" | "funcionario" | "caixa" | "vendedor";
  setNewStaffRole?: (val: "gerente" | "funcionario" | "caixa" | "vendedor") => void;
  newStaffPermissions?: string[];
  setNewStaffPermissions?: (val: string[]) => void;
  handleAddOrUpdateStaff?: (e: React.FormEvent) => void;
}

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({
  db,
  userId,
  isLoggedIn,
  showNotification,
  onPermissionsUpdated,
  staffPins = [],
  onToggleStaffPermission,
  onDeleteStaff,
  editingStaffId = null,
  setEditingStaffId,
  newStaffName = "",
  setNewStaffName,
  newStaffPin = "",
  setNewStaffPin,
  newStaffRole = "caixa",
  setNewStaffRole,
  newStaffPermissions = [],
  setNewStaffPermissions,
  handleAddOrUpdateStaff
}) => {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showStaffPinForm, setShowStaffPinForm] = useState<boolean>(false);
  const [showStaffPins, setShowStaffPins] = useState<Record<string, boolean>>({});

  const localHandleFirestoreError = (error: any, operationType: OperationType, path: string | null) => {
    const auth = getAuth();
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCode = error?.code;

    const errInfo: FirestoreErrorInfo = {
      error: errorMessage,
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified,
        isAnonymous: auth.currentUser?.isAnonymous,
        tenantId: auth.currentUser?.tenantId,
        providerInfo:
          auth.currentUser?.providerData?.map((provider) => ({
            providerId: provider.providerId,
            email: provider.email,
          })) || [],
      },
      operationType,
      path,
    };

    console.error(
      `Firestore Error [${errorCode || "unknown"}]: `,
      JSON.stringify(errInfo),
    );
  };

  // Load from Firestore or local fallback
  useEffect(() => {
    if (!isLoggedIn || !userId || userId === "guest_visitor" || !db) {
      try {
        const saved = localStorage.getItem("pdv_system_config");
        if (saved) {
          const parsed = JSON.parse(saved);
          setConfig(parsed);
          if (onPermissionsUpdated) {
            setTimeout(() => {
              onPermissionsUpdated(parsed);
            }, 0);
          }
        } else {
          const initialConfig: SystemConfig = {
            userId: "local_guest",
            caixa: DEFAULT_ROLE_PERMS("caixa"),
            vendedor: DEFAULT_ROLE_PERMS("vendedor"),
            gerente: DEFAULT_ROLE_PERMS("gerente")
          };
          setConfig(initialConfig);
          if (onPermissionsUpdated) {
            setTimeout(() => {
              onPermissionsUpdated(initialConfig);
            }, 0);
          }
        }
      } catch (err) {
        console.error("Error loading local config", err);
      }
      setIsLoading(false);
      return;
    }

    const auth = getAuth();
    let unsubscribeSnapshot: (() => void) | null = null;

    const unsubscribeAuth = auth.onAuthStateChanged((currentUser) => {
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }

      if (currentUser && currentUser.uid === userId) {
        setIsLoading(true);
        const docRef = doc(db, "configuracoes_sistema", userId);
        unsubscribeSnapshot = onSnapshot(
          docRef,
          (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data() as SystemConfig;
              setConfig(data);
              if (onPermissionsUpdated) {
                setTimeout(() => {
                  onPermissionsUpdated(data);
                }, 0);
              }
            } else {
              // Document does not exist, initialize with default values
              const initialConfig: SystemConfig = {
                userId: userId,
                caixa: DEFAULT_ROLE_PERMS("caixa"),
                vendedor: DEFAULT_ROLE_PERMS("vendedor"),
                gerente: DEFAULT_ROLE_PERMS("gerente")
              };
              setConfig(initialConfig);
              try {
                setDoc(docRef, {
                  ...initialConfig,
                  createdAt: new Date().toISOString()
                });
              } catch (err) {
                console.error("Erro ao inicializar permissões no dashboard:", err);
              }
              if (onPermissionsUpdated) {
                setTimeout(() => {
                  onPermissionsUpdated(initialConfig);
                }, 0);
              }
            }
            setIsLoading(false);
          },
          (err) => {
            localHandleFirestoreError(err, OperationType.GET, `configuracoes_sistema/${userId}`);
            showNotification("Erro ao carregar permissões do Firestore", "error");
            setIsLoading(false);
          }
        );
      } else {
        setIsLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
    };
  }, [db, userId, isLoggedIn]);

  return (
    <div id="owner-dashboard-container" className="space-y-6">
      {/* 👑 CONFIGURAR PERMISSÕES DE EQUIPE POR CARGO */}
      <PermissionManagement
        db={db}
        userId={userId}
        showNotification={showNotification}
        onPermissionsUpdated={onPermissionsUpdated}
      />

      {/* Divider */}
      <div className="border-t border-white/10 pt-6 my-6"></div>

      {/* 👥 SEÇÃO: PERMISSÕES POR INTEGRANTE DA EQUIPE */}
      <div id="staff-permissions-dashboard" className="space-y-4 text-left">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-white/5 pb-3">
          <div className="space-y-1">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 font-sans">
              <Users className="w-4 h-4 text-purple-400" />
              Controle por Integrante: Permissões de Equipe Individuais 👥
            </h3>
            <p className="text-[10.5px] text-slate-400 leading-normal max-w-3xl font-sans">
              Gerencie individualmente o PIN de acesso e as permissões exclusivas de cada funcionário cadastrado. Você pode ligar ou desligar as permissões de cada integrante abaixo e as alterações terão efeito imediato.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form Column */}
          {handleAddOrUpdateStaff && (
            <div className="lg:col-span-4 bg-slate-900 border border-white/5 p-5 rounded-2xl space-y-4 self-start">
              <h4 className="text-xs font-black text-purple-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2 font-sans">
                <UserPlus className="w-4 h-4" />
                {editingStaffId ? "Editar Integrante Cadastrado" : "Cadastrar Novo Integrante"}
              </h4>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddOrUpdateStaff(e);
                }}
                className="space-y-4 text-xs"
              >
                <div className="space-y-1.5 text-left">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                    Nome Completo / Apelido
                  </label>
                  <input
                    type="text"
                    value={newStaffName}
                    onChange={(e) => setNewStaffName && setNewStaffName(e.target.value)}
                    placeholder="Ex: Maria Souza, João Vendedor"
                    className="w-full bg-slate-950 border border-white/10 hover:border-white/20 focus:border-purple-500 rounded-xl py-2 px-3 text-white outline-none font-medium text-xs font-sans transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 text-left">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                      PIN (4 dígitos)
                    </label>
                    <div className="relative">
                      <input
                        type={showStaffPinForm ? "text" : "password"}
                        maxLength={4}
                        value={newStaffPin}
                        onChange={(e) => setNewStaffPin && setNewStaffPin(e.target.value.replace(/\D/g, ""))}
                        placeholder="1234"
                        className="w-full bg-slate-950 border border-white/10 hover:border-white/20 focus:border-purple-500 rounded-xl py-2 pl-3 pr-8 text-center text-white outline-none font-mono font-black text-xs tracking-widest transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowStaffPinForm(!showStaffPinForm)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      >
                        {showStaffPinForm ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                      Cargo / Nível
                    </label>
                    <select
                      value={newStaffRole}
                      onChange={(e) => {
                        const role = e.target.value as any;
                        if (setNewStaffRole) setNewStaffRole(role);
                        if (setNewStaffPermissions) {
                          if (role === "gerente") {
                            setNewStaffPermissions(["allowDiscount", "allowEditPrice", "allowVoidSale", "allowSuprimento", "allowSangria", "allowCloseShift", "allowViewReports", "allowOpenBalance", "allowRemoveProduct"]);
                          } else if (role === "caixa" || role === "funcionario") {
                            setNewStaffPermissions(["allowDiscount", "allowSuprimento", "allowSangria", "allowCloseShift", "allowOpenBalance"]);
                          } else {
                            setNewStaffPermissions(["allowDiscount"]);
                          }
                        }
                      }}
                      className="w-full bg-slate-950 border border-white/10 hover:border-white/20 focus:border-purple-500 rounded-xl py-2 px-2.5 text-white outline-none font-bold text-xs font-sans transition-all"
                    >
                      <option value="caixa">Caixa</option>
                      <option value="vendedor">Vendedor</option>
                      <option value="gerente">Gerente</option>
                      <option value="funcionario">Funcionário</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition-all active:scale-95 cursor-pointer text-center font-sans shadow-md shadow-purple-600/10"
                  >
                    {editingStaffId ? "Salvar Alterações 💾" : "Cadastrar PIN 🔒"}
                  </button>
                  {editingStaffId && setEditingStaffId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingStaffId(null);
                        if (setNewStaffName) setNewStaffName("");
                        if (setNewStaffPin) setNewStaffPin("");
                        if (setNewStaffRole) setNewStaffRole("caixa");
                        if (setNewStaffPermissions) setNewStaffPermissions(["allowDiscount", "allowSuprimento", "allowSangria", "allowCloseShift", "allowOpenBalance"]);
                      }}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all active:scale-95 cursor-pointer text-center font-sans"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* List Column */}
          <div className={`${handleAddOrUpdateStaff ? "lg:col-span-8" : "lg:col-span-12"} space-y-4`}>
            {staffPins.length === 0 ? (
              <div className="bg-slate-900 border border-white/5 rounded-2xl p-8 text-center text-slate-500 text-xs font-medium space-y-2">
                <Users className="w-8 h-8 text-slate-600 mx-auto" />
                <p>Nenhum integrante cadastrado nesta loja ainda.</p>
                <p className="text-[10px] text-slate-600">Use o formulário ao lado para cadastrar PINs de funcionários, vendedores ou gerentes.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {staffPins.map((staff) => {
                  const showPin = showStaffPins[staff.id] || false;
                  
                  return (
                    <div
                      key={staff.id}
                      className="bg-slate-900 border border-white/5 hover:border-white/10 rounded-2xl p-4 flex flex-col justify-between space-y-3 transition-colors text-left"
                    >
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-3 border-b border-white/5 pb-2.5">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-extrabold text-white text-[12px] font-sans">
                              {staff.name}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider ${
                              staff.role === "gerente" 
                                ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                                : staff.role === "caixa"
                                  ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                  : staff.role === "vendedor"
                                    ? "bg-teal-500/10 text-teal-400 border border-teal-500/20"
                                    : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                            }`}>
                              {staff.role}
                            </span>
                          </div>
                          
                          {/* PIN toggle */}
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold font-mono">
                            <KeyRound className="w-3 h-3 text-slate-500" />
                            <span>PIN:</span>
                            <span className="bg-slate-950 px-1.5 py-0.5 rounded border border-white/5 text-slate-200 tracking-wider font-extrabold">
                              {showPin ? staff.pin : "••••"}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setShowStaffPins({
                                  ...showStaffPins,
                                  [staff.id]: !showPin
                                });
                              }}
                              className="text-slate-500 hover:text-white cursor-pointer transition-colors"
                            >
                              {showPin ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          {setEditingStaffId && (
                            <button
                              type="button"
                              onClick={() => {
                                if (setEditingStaffId) setEditingStaffId(staff.id);
                                if (setNewStaffName) setNewStaffName(staff.name);
                                if (setNewStaffPin) setNewStaffPin(staff.pin);
                                if (setNewStaffRole) setNewStaffRole(staff.role);
                                if (setNewStaffPermissions) {
                                  const defaultManagerPerms = ["allowDiscount", "allowEditPrice", "allowVoidSale", "allowSuprimento", "allowSangria", "allowCloseShift", "allowViewReports", "allowOpenBalance", "allowRemoveProduct"];
                                  const defaultStaffPerms = (staff.role === "caixa" || staff.role === "funcionario") ? ["allowDiscount", "allowSuprimento", "allowSangria", "allowCloseShift", "allowOpenBalance"] : ["allowDiscount"];
                                  setNewStaffPermissions(staff.permissions || (staff.role === "gerente" ? defaultManagerPerms : defaultStaffPerms));
                                }
                                showNotification(`Editando cadastro de ${staff.name}...`, "info");
                              }}
                              className="p-1.5 text-slate-400 hover:text-purple-400 transition-colors rounded-lg hover:bg-white/5 cursor-pointer"
                              title="Editar funcionário"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {onDeleteStaff && (
                            <button
                              type="button"
                              onClick={() => onDeleteStaff(staff.id, staff.name)}
                              className="p-1.5 text-slate-500 hover:text-rose-500 transition-colors rounded-lg hover:bg-white/5 cursor-pointer"
                              title="Excluir funcionário"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Direct Permissions Toggle switches */}
                      <div className="space-y-2 pt-1">
                        <span className="text-[8.5px] font-black text-slate-500 uppercase tracking-widest block">
                          Permissões de Acesso (Ligar/Desligar)
                        </span>

                        <div className="space-y-1.5">
                          {[
                            { id: "allowDiscount", label: "Aplicar desconto" },
                            { id: "allowEditPrice", label: "Alterar preço unitário" },
                            { id: "allowVoidSale", label: "Estorno de vendas" },
                            { id: "allowSuprimento", label: "Suprimento" },
                            { id: "allowSangria", label: "Sangria" },
                            { id: "allowCloseShift", label: "Fechamento de caixa" },
                            { id: "allowViewReports", label: "Relatório" },
                            { id: "allowOpenBalance", label: "Abertura de balancete" },
                            { id: "allowRemoveProduct", label: "Remover catálogo" },
                            { id: "allowResetEntirePDV", label: "Zerar sistema" }
                          ].map((perm) => {
                            const defaultManagerPerms = ["allowDiscount", "allowEditPrice", "allowVoidSale", "allowSuprimento", "allowSangria", "allowCloseShift", "allowViewReports", "allowOpenBalance", "allowRemoveProduct"];
                            const defaultStaffPerms = (staff.role === "caixa" || staff.role === "funcionario") ? ["allowDiscount", "allowSuprimento", "allowSangria", "allowCloseShift", "allowOpenBalance"] : ["allowDiscount"];
                            
                            const getResolvedStaffPerms = () => {
                              if (staff.permissions && Array.isArray(staff.permissions)) {
                                return staff.permissions;
                              }
                              if (config) {
                                const rKey = (staff.role === "funcionario" ? "caixa" : staff.role) as "caixa" | "vendedor" | "gerente";
                                const rConfig = config[rKey];
                                if (rConfig) {
                                  const list: string[] = [];
                                  if (rConfig.allowDiscount) list.push("allowDiscount");
                                  if (rConfig.allowEditPrice) list.push("allowEditPrice");
                                  if (rConfig.allowVoidSale) list.push("allowVoidSale");
                                  if (rConfig.allowSuprimento) list.push("allowSuprimento");
                                  if (rConfig.allowSangria) list.push("allowSangria");
                                  if (rConfig.allowCloseShift) list.push("allowCloseShift");
                                  if (rConfig.allowViewReports) list.push("allowViewReports");
                                  if (rConfig.allowOpenBalance) list.push("allowOpenBalance");
                                  if (rConfig.allowRemoveProduct) list.push("allowRemoveProduct");
                                  if (rConfig.allowResetEntirePDV) list.push("allowResetEntirePDV");
                                  return list;
                                }
                              }
                              return staff.role === "gerente" ? defaultManagerPerms : defaultStaffPerms;
                            };
                            
                            const staffPerms = getResolvedStaffPerms();
                            const isChecked = staffPerms.includes(perm.id);

                            return (
                              <div
                                key={perm.id}
                                className="flex items-center justify-between p-1.5 bg-slate-950/40 border border-white/5 rounded-xl text-[10px]"
                              >
                                <span className="font-semibold text-slate-300">{perm.label}</span>
                                <DashboardToggleSwitch
                                  checked={isChecked}
                                  onChange={() => onToggleStaffPermission && onToggleStaffPermission(staff.id, perm.id)}
                                  isDanger={perm.id === "allowResetEntirePDV"}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
