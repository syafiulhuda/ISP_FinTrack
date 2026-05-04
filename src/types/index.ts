export interface Customer {
  id: string;
  nama?: string;
  name?: string;
  paket?: string;
  service?: string;
  status: string;
  alamat?: string;
  tanggal_daftar?: string;
  createdAt?: string;
  province?: string;
  city?: string;
  district?: string;
  village?: string;
}

export interface Asset {
  id: number;
  type: string;
  sn: string;
  status: string;
  location: string;
  kepemilikan?: string;
  tanggal_perubahan?: string;
  mac?: string;
  condition: string;
  color?: string;
  latitude: string | number;
  longitude: string | number;
}

export interface Transaction {
  id: string;
  amount: string;
  date?: string;
  timestamp?: string | Date;
  status: string;
  method: string;
  keterangan?: string;
  type?: string;
  isWarning?: boolean;
  linked_id?: string;
  city?: string;
  numericAmount?: number;
}

export interface ServiceTier {
  id: number;
  name: string;
  price: string;
  fup: string;
  speed: string;
  features?: string[];
  unit?: string;
  type?: string;
  icon?: string;
  popular?: boolean;
}

export interface OcrData {
  id: string | number;
  vendor?: string;
  date?: string;
  amount?: string;
  reference?: string;
  confidence: string;
  image: string;
  status?: string;
  method?: string;
}

export interface Notification {
  id: number;
  category: string;
  title: string;
  message: string;
  type: string;
  is_unread: boolean;
  action_label?: string;
  created_at?: string;
  is_hidden?: boolean;
}

export interface Admin {
  id: number;
  nama: string;
  email: string;
  role: string;
  department: string;
  image: string;
  password?: string;
}


export interface Invoice {
  id: number;
  customer_id: string;
  amount: number;
  due_date: string;
  status: 'Unpaid' | 'Paid' | 'Overdue';
}

export interface Expense {
  id: string | number;
  amount: number | string;
  date: string | Date;
  category?: string;
  city?: string;
  description?: string;
}
