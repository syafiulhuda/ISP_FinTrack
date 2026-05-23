import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { query } from '@/lib/db';
import { logger } from '@/lib/logger';
import { headers } from 'next/headers';
import { checkRateLimit } from '@/lib/rateLimit';

export async function POST(req: Request) {
  try {
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    
    const limitKey = `rate:webhook:${ip}`;
    const limitCheck = await checkRateLimit(limitKey, 30, 60);
    if (!limitCheck.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const data = await req.json();

    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      payment_type
    } = data;

    // Verify signature
    const serverKey = process.env.MIDTRANS_SERVER_KEY || '';
    const hash = crypto
      .createHash('sha512')
      .update(order_id + status_code + gross_amount + serverKey)
      .digest('hex');

    if (hash !== signature_key) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    if (transaction_status === 'capture' || transaction_status === 'settlement') {
      // check if trx already exists
      const checkRes = await query('SELECT id FROM transactions WHERE id = $1', [order_id]);
      if (checkRes.rows.length === 0) {
        
        // Extract customer ID from order_id (Format: TRX-CTxxx-timestamp)
        const parts = order_id.split('-');
        let customerId = '';
        let customerName = 'Pelanggan';
        let service = 'Unknown';
        let city = null;
        
        if (parts.length >= 3) {
          customerId = parts[1]; // CTxxx
          
          // Fetch customer details for the description
          try {
            const custRes = await query('SELECT name, service, city FROM customers WHERE id = $1', [customerId]);
            if (custRes.rows.length > 0) {
              customerName = custRes.rows[0].name;
              service = custRes.rows[0].service;
              city = custRes.rows[0].city;
            }
          } catch (e) {
            console.error("Failed to fetch customer for webhook:", e);
          }
        }

        const amount = Number(gross_amount);
        let method = 'Bank Transfer';
        if (['gopay', 'qris', 'shopeepay', 'echannel'].includes(payment_type)) {
          method = 'E-Wallet';
        } else if (payment_type === 'credit_card') {
          method = 'Credit Card';
        } else if (payment_type === 'cstore') {
          method = 'Tunai';
        }
        
        // Use user's requested text format: 
        // "Pembayaran atas nama ... dengan service ... sebesar ... via ... telah sukses"
        const formattedAmount = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
        const notificationMsg = `Pembayaran atas nama ${customerName} dengan service ${service} sebesar ${formattedAmount} via ${method} telah sukses`;

        // Insert into transactions
        await query(`
          INSERT INTO transactions (id, method, amount, status, timestamp, type, keterangan, city, inputter, inputter_tms)
          VALUES ($1, $2, $3, 'Verified', NOW() + interval '7 hours', 'Tagihan', 'pemasukan', $4, 'System', NOW() + interval '7 hours')
        `, [order_id, method, amount, city]);

        // Insert notification
        await query(`
          INSERT INTO notifications (type, category, title, message, created_at, is_unread)
          VALUES ('success', 'Billing', 'Pembayaran Otomatis Diterima', $1, NOW() + interval '7 hours', true)
        `, [notificationMsg]);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ message: "Midtrans Webhook Error", error, path: "api" });
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}
