'use server';

import { snap } from '@/lib/midtrans';
import { logger } from '@/lib/logger';

export async function createPaymentLink(data: {
  customerId: string;
  customerName: string;
  service: string;
  amount: number;
}) {
  try {
    const d = new Date();
    const dateStr = d.toISOString().replace(/[-:T]/g, '').slice(0, 8); // YYYYMMDD
    const randomStr = Math.random().toString(36).substring(2, 5).toUpperCase(); // 3 random chars
    // Use orderId that embeds customerId for easy parsing in webhook
    const orderId = `TRX-${data.customerId}-${dateStr}-${randomStr}`;

    const parameters = {
      transaction_details: {
        order_id: orderId,
        gross_amount: data.amount,
      },
      customer_details: {
        first_name: data.customerName,
        // Since we don't always have email/phone, we can omit them or put dummies
      },
      item_details: [
        {
          id: data.service,
          price: data.amount,
          quantity: 1,
          name: `Langganan ${data.service}`,
        }
      ]
    };

    const transaction = await snap.createTransaction(parameters);
    
    return {
      success: true,
      token: transaction.token,
      redirect_url: transaction.redirect_url,
      order_id: orderId
    };
  } catch (e) {
    logger.error({ message: "Midtrans Error: createPaymentLink", error: e, path: "action" });
    return { success: false, error: String(e) };
  }
}
