/**
 * Order System Types
 * Types for orders, payments, and group cart
 */

// ============== Enums ==============

export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'cancelled';

export type OrderType = 'individual' | 'group_split' | 'group_host';

export type PaymentMethod = 'cash' | 'card' | 'e_wallet' | 'qr' | 'bank_transfer';

export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';

// ============== Order Item Types ==============

export interface OrderAddon {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

export interface OrderItemCreate {
  menu_item_id: number;
  quantity: number;
  size_key?: string;
  size_label?: string;
  size_price?: number;
  temperature?: string;
  addons?: OrderAddon[];
  special_instructions?: string;
}

export interface OrderItem {
  id: number;
  order_id: number;
  menu_item_id: number;
  added_by_participant_id?: number;
  added_by_name?: string;
  item_name: string;
  base_price: number;
  base_price_in_pesos: number;
  quantity: number;
  size_key?: string;
  size_label?: string;
  size_price: number;
  size_price_in_pesos: number;
  temperature?: string;
  addons?: OrderAddon[];
  item_total: number;
  item_total_in_pesos: number;
  special_instructions?: string;
  created_at?: string;
}

// ============== Payment Types ==============

export interface Payment {
  id: number;
  payment_reference: string;
  order_id: number;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  amount_in_pesos: number;
  simulated: boolean;
  simulation_result?: string;
  transaction_id?: string;
  receipt_data?: ReceiptData;
  created_at?: string;
  processed_at?: string;
}

export interface ReceiptItem {
  name: string;
  quantity: number;
  unit_price: number;
  unit_price_in_pesos: number;
  total: number;
  total_in_pesos: number;
  customizations?: string[];
}

export interface ReceiptData {
  receipt_id: string;
  payment_reference: string;
  transaction_id?: string;
  order_number: string;
  order_type?: OrderType;
  order_date?: string;
  table_number?: string;
  customer_name?: string;
  items: ReceiptItem[];
  subtotal: number;
  subtotal_in_pesos: number;
  tax: number;
  tax_in_pesos: number;
  total: number;
  total_in_pesos: number;
  payment_method?: PaymentMethod;
  payment_status?: PaymentStatus;
  generated_at: string;
}

// ============== Order Types ==============

export interface Order {
  id: number;
  order_number: string;
  table_id?: number;
  table_number?: number;
  table_session_id?: number;
  order_type: OrderType;
  group_session_id?: number;
  participant_id?: number;
  customer_name?: string;
  status: OrderStatus;
  subtotal: number;
  tax: number;
  total: number;
  subtotal_in_pesos: number;
  total_in_pesos: number;
  notes?: string;
  items?: OrderItem[];
  payment?: Payment;
  created_at?: string;
  updated_at?: string;
  confirmed_at?: string;
  ready_at?: string;
  served_at?: string;
  cancelled_at?: string;
  is_active: boolean;
}

export interface CreateOrderRequest {
  table_id?: number;
  table_session_id?: number;
  order_type?: OrderType;
  group_session_id?: number;
  participant_id?: number;
  customer_name?: string;
  items: OrderItemCreate[];
  notes?: string;
  payment_method: PaymentMethod;
}

export interface OrderStatusUpdateRequest {
  status: OrderStatus;
}

export interface OrderListResponse {
  items: Order[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface CalculateTotalRequest {
  items: OrderItemCreate[];
}

export interface CalculateTotalResponse {
  subtotal: number;
  tax: number;
  total: number;
  subtotal_in_pesos: number;
  tax_in_pesos: number;
  total_in_pesos: number;
  item_count: number;
}

// ============== Group Cart Types ==============

export interface GroupCartAddon {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

export interface GroupCartItemCreate {
  session_id: string;
  menu_item_id: number;
  participant_id?: number;
  participant_name?: string;
  quantity: number;
  size_key?: string;
  size_label?: string;
  size_price?: number;
  temperature?: string;
  addons?: GroupCartAddon[];
  special_instructions?: string;
}

export interface GroupCartItemUpdate {
  session_id: string;
  participant_id?: number;  // For proper permission verification (preferred over session_id)
  quantity?: number;
  size_key?: string;
  size_label?: string;
  size_price?: number;
  temperature?: string;
  addons?: GroupCartAddon[];
  special_instructions?: string;
}

export interface GroupCartItem {
  id: number;
  group_session_id: number;
  participant_id?: number;
  participant_name?: string;
  menu_item_id: number;
  item_name: string;
  item_image?: string;
  base_price: number;
  base_price_in_pesos: number;
  quantity: number;
  size_key?: string;
  size_label?: string;
  size_price: number;
  size_price_in_pesos: number;
  temperature?: string;
  addons?: GroupCartAddon[];
  item_total: number;
  item_total_in_pesos: number;
  special_instructions?: string;
  created_at?: string;
  updated_at?: string;
}

export interface GroupCart {
  group_session_id: number;
  items: GroupCartItem[];
  subtotal: number;
  subtotal_in_pesos: number;
  tax: number;
  tax_in_pesos: number;
  total: number;
  total_in_pesos: number;
  item_count: number;
  participant_count: number;
}

export interface GroupCheckoutRequest {
  session_id: string;
  participant_id?: number;  // For proper permission verification (preferred over session_id)
  customer_name?: string;
  payment_method: PaymentMethod;
  notes?: string;
}

// ============== Kitchen Queue Types ==============

export interface KitchenQueueResponse {
  orders: Order[];
  count: number;
}

export interface GroupOrdersResponse {
  group_session_id: number;
  orders: Order[];
  count: number;
  total: number;
  total_in_pesos: number;
}

// ============== WebSocket Event Types ==============

export interface NewOrderEvent {
  type: 'new_order';
  table_id: number;
  order: Order;
  timestamp: string;
}

export interface OrderStatusChangedEvent {
  type: 'order_status_changed';
  table_id: number;
  order_id: number;
  order_number?: string;
  old_status?: OrderStatus;
  new_status: OrderStatus;
  order?: Order;
  timestamp: string;
}

export interface OrderReadyEvent {
  type: 'order_ready';
  table_id: number;
  order_id: number;
  order?: Order;
  timestamp: string;
}

export type OrderWebSocketEvent = NewOrderEvent | OrderStatusChangedEvent | OrderReadyEvent;

// ============== Individual Cart Types ==============

export interface IndividualCartAddon {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

export interface IndividualCartItemCreate {
  menu_item_id: number;
  quantity: number;
  size_key?: string;
  size_label?: string;
  size_price?: number;
  temperature?: string;
  addons?: IndividualCartAddon[];
  special_instructions?: string;
}

export interface IndividualCartItemUpdate {
  quantity?: number;
  size_key?: string;
  size_label?: string;
  size_price?: number;
  temperature?: string;
  addons?: IndividualCartAddon[];
  special_instructions?: string;
}

export interface IndividualCartItem {
  id: string;
  cart_id: string;
  menu_item_id: number;
  item_name: string;
  item_image?: string;
  base_price: number;
  base_price_in_pesos: number;
  quantity: number;
  size_key?: string;
  size_label?: string;
  size_price: number;
  size_price_in_pesos: number;
  temperature?: string;
  addons?: IndividualCartAddon[];
  item_total: number;
  item_total_in_pesos: number;
  special_instructions?: string;
  created_at?: string;
  updated_at?: string;
}

export interface IndividualCart {
  cart_id: string;
  session_token?: string;
  table_id?: number;
  items: IndividualCartItem[];
  subtotal: number;
  subtotal_in_pesos: number;
  tax: number;
  tax_in_pesos: number;
  total: number;
  total_in_pesos: number;
  item_count: number;
  created_at?: string;
  updated_at?: string;
}

export interface CartSyncRequest {
  session_token?: string;
  items: IndividualCartItemCreate[];
}
