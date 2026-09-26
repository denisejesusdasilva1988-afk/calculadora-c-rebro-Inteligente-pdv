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
}

export interface ProductStockInfo {
  stockQty: number;
  minStock?: number;
  costPrice?: number;
  unit?: string;
  lastUpdated?: any;
}

