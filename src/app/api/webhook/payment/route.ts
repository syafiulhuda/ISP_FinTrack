import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * 🚀 PAYMENT GATEWAY WEBHOOK BLUEPRINT (Draft)
 * 
 * Endpoint ini disiapkan untuk menerima notifikasi pembayaran otomatis 
 * dari pihak ketiga (contoh: Midtrans, Xendit, atau Stripe).
 * URL: /api/webhook/payment
 */
export async function POST(req: Request) {
  try {
    // 1. Verifikasi Keamanan Webhook (Contoh: X-Callback-Token)
    // const signature = req.headers.get('x-callback-token');
    // if (signature !== process.env.WEBHOOK_SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    // 2. Parsing payload dari Payment Gateway
    const body = await req.json();
    
    /* Contoh format payload yang diekspektasikan:
    {
      "order_id": "TRX-CT001-12345",
      "transaction_status": "settlement",
      "gross_amount": "250000.00",
      "payment_type": "bank_transfer"
    }
    */
    const { order_id, transaction_status, gross_amount, payment_type } = body;

    // 3. Proses jika pembayaran berhasil (Settled/Captured)
    if (transaction_status === 'settlement' || transaction_status === 'capture') {
      
      // Cegah pemrosesan ganda (Idempotency Check)
      const existing = await query('SELECT id FROM transactions WHERE id = $1', [order_id]);
      
      if (existing.rows.length === 0) {
        
        // 4. Masukkan ke Buku Besar (Transactions) otomatis!
        await query(`
          INSERT INTO transactions (id, method, amount, status, timestamp, type, keterangan, inputter)
          VALUES ($1, $2, $3, 'Verified', NOW(), 'Tagihan', 'pemasukan', 'System/Webhook')
        `, [order_id, payment_type, Number(gross_amount)]);

        // 5. Ekstrak ID Pelanggan
        const customerId = order_id.includes('-') ? order_id.split('-')[1] : null;
        
        if (customerId) {
          // Tandai invoice lunas
          await query(`
            INSERT INTO invoices (customer_id, amount, due_date, status)
            VALUES ($1, $2, NOW(), 'Paid')
          `, [customerId, Number(gross_amount)]);
          
          // Fitur Cerdas: Jika pelanggan terlanjur di-"Suspend", otomatis aktifkan kembali!
          await query(`
            UPDATE customers 
            SET status = 'Active', inputter = 'System/Webhook', inputter_tms = NOW()
            WHERE id = $1 AND status = 'Inactive'
          `, [customerId]);
          
          // Kirim Peringatan ke Aplikasi (Lonceng Notifikasi)
          await query(`
            INSERT INTO notifications (category, title, message, type, action_label)
            VALUES ('Finance', 'Auto-Payment Received', 'Pembayaran sebesar Rp ' || $2 || ' diterima dari ' || $1 || ' via otomatisasi.', 'transaction', 'View Ledger')
          `, [customerId, gross_amount]);
        }
      }
    }

    return NextResponse.json({ message: 'Webhook processed successfully' });

  } catch (error) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
