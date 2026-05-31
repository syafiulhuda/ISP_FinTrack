import { z } from 'zod';

// ─── Customer Schemas ───────────────────────────────────────────────
export const CreateCustomerSchema = z.object({
  name: z.string().min(1, "Nama tidak boleh kosong").max(255),
  no_telp: z.string().min(1, "Nomor telepon tidak boleh kosong").max(30),
  service: z.string().min(1, "Paket layanan tidak boleh kosong").max(100),
  province: z.string().min(1, "Provinsi tidak boleh kosong").max(100),
  city: z.string().min(1, "Kota tidak boleh kosong").max(100),
  district: z.string().min(1, "Kecamatan tidak boleh kosong").max(100),
  village: z.string().min(1, "Kelurahan tidak boleh kosong").max(100),
  address: z.string().min(1, "Alamat tidak boleh kosong").max(500),
});

// ─── Transaction / OCR Schemas ───────────────────────────────────────
export const UpdateOcrDataSchema = z.object({
  vendor: z.string().min(1, "Vendor tidak boleh kosong").max(255),
  date: z.string().min(1, "Tanggal tidak boleh kosong"),
  amount: z.string().min(1, "Jumlah tidak boleh kosong"),
  reference: z.string().min(1, "Referensi tidak boleh kosong").max(100),
  image: z.string().url().optional().or(z.literal('')),
  confidence: z.string().optional(),
});

export const PostOcrEntrySchema = z.object({
  vendor: z.string().min(1, "Vendor tidak boleh kosong").max(255),
  amount: z.string().min(1, "Jumlah tidak boleh kosong"),
  date: z.string().min(1, "Tanggal tidak boleh kosong"),
  reference: z.string().min(1, "Referensi tidak boleh kosong").max(100),
  method: z.string().min(1, "Metode pembayaran tidak boleh kosong").max(50),
  keterangan: z.enum(['pemasukan', 'pengeluaran']).optional(),
  purchaseType: z.string().max(100).optional(),
  serialNumber: z.string().max(100).optional(),
  macNumber: z.string().max(100).optional(),
  location: z.string().max(255).optional(),
});

// ─── Asset Schemas ────────────────────────────────────────────────────
export const CreateAssetSchema = z.object({
  sn: z.string().min(1, "Serial number tidak boleh kosong").max(100),
  mac: z.string().min(1, "MAC address tidak boleh kosong").max(50),
  type: z.string().min(1, "Tipe aset tidak boleh kosong").max(100),
  location: z.string().min(1, "Lokasi tidak boleh kosong").max(255),
  condition: z.string().min(1, "Kondisi tidak boleh kosong").max(50),
  kepemilikan: z.string().max(50).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>;
export type UpdateOcrDataInput = z.infer<typeof UpdateOcrDataSchema>;
export type PostOcrEntryInput = z.infer<typeof PostOcrEntrySchema>;
export type CreateAssetInput = z.infer<typeof CreateAssetSchema>;
