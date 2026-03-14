export interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  stock: number;
}

export interface BillItem {
  id?: number;
  bill_id?: number;
  product_id: number;
  product_name: string;
  price: number;
  quantity: number;
  total: number;
}

export interface Bill {
  id: number;
  date: string;
  total_amount: number;
  customer_name?: string;
  customer_phone?: string;
  items?: BillItem[];
}

export interface DashboardStats {
  totalProducts: number;
  todaySales: number;
  totalBills: number;
  lowStock: number;
}
