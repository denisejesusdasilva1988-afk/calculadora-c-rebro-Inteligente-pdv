import { Timestamp } from "firebase/firestore";

export interface SavedList {
  id: string;
  saldo_total: string;
  texto_digitado: string;
  total_gasto: number;
  saldo_restante: number;
  data: Timestamp;
  pasta?: string;
  excelRows?: any[];
  superListData?: any;
  checkedIndices?: number[];
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export interface ParsedItem {
  lineText: string;
  price: number;
  qty: number;
  total: number;
  unit: string;
  calculation?: string;
  description?: string;
  weightText?: string;
}

export interface AgendaEvent {
  id: string;
  userId: string;
  title: string;
  description?: string;
  amount?: number;
  date: any; // Timestamp or Date string
  type: 'shopping' | 'payment_received' | 'payment_made' | 'general' | 'supplier_visit' | 'supplier_debt';
  status: 'pending' | 'completed';
  createdAt: any;
  supplierName?: string;
  barcodePix?: string;
  folder?: string;
  phone?: string;
  priority?: 'normal' | 'urgent';
}

export interface CartItem {
  id?: string;
  productId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice?: number;
  unit?: string;
  category?: string;
}

export interface Transaction {
  id: string;
  type: 'entrada' | 'saida';
  category?: string;
  amount: number;
  description?: string;
  paymentMethod: string;
  timestamp: string | number | Date;
  date?: string;
  cartItems?: CartItem[];
  feeRate?: number;
  feeAmount?: number;
  isDeleted?: boolean;
  customerName?: string;
  customerPhone?: string;
  changeAmount?: number;
}

export interface CustomProduct {
  id: string;
  name: string;
  price: number;
  costPrice?: number;
  category?: string;
  barcode?: string;
  unit?: string;
  validity?: string;
  stock?: number;
  image?: string;
  niche?: string;
  quickCode?: string;
  size?: string;
  color?: string;
  description?: string;
  additionalBarcodes?: string[];
  imageUrl?: string;
  isService?: boolean;
  brand?: string;
  gender?: string;
  material?: string;
  location?: string;
  section?: string; // Sessão / Departamento do Mercado (ex: "Grãos & Cereais", "Laticínios", "Açougue", "Limpeza", etc.)
}

export interface ProductStockInfo {
  stockQty: number;
  minStock?: number;
  costPrice?: number;
  unit?: string;
  lastUpdated?: any;
}

export interface OrcamentoItem {
  id: string;
  productId?: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount: number; // em R$
  total: number;
  details?: string;
}

export interface Orcamento {
  id: string;
  code: string; // Ex: "#ORC-001"
  date: string; // Ex: "10/10/2026, 09:30"
  validUntil: string; // Ex: "17/10/2026"
  validityDays: number; // 3, 7, 15, 30...
  status: "pendente" | "aprovado" | "recusado" | "convertido";
  clientName: string;
  clientPhone?: string;
  clientDoc?: string;
  clientAddress?: string;
  clientEmail?: string;
  sellerName?: string;
  items: OrcamentoItem[];
  subtotal: number;
  discountTotal: number;
  shippingOrFees: number;
  total: number;
  paymentConditions?: string;
  deliveryTerms?: string;
  warrantyTerms?: string;
  notes?: string;
  createdAt: number;
  updatedAt?: number;
}

