'use server';

import { snap } from'@/lib/midtrans';
import { logger } from'@/lib/logger';
import { checkRateLimit } from'@/lib/rateLimit';

export async function createPaymentLink(data: {
 customerId: string;
 customerName: string;
 service: string;
 amount: number;
}) {
 try {
 const limitKey =`rate:payment-link:${data.customerId}`;
 const limitCheck = await checkRateLimit(limitKey, 10, 60);
 if (!limitCheck.success) {
 return { success: false, error:'Terlalu banyak permintaan pembayaran untuk pelanggan ini. Silakan coba lagi nanti.'};
 }

 const d = new Date();
 const dateStr = d.toISOString().replace(/[-:T]/g,'').slice(0, 8); // YYYYMMDD
 const randomStr = Math.random().toString(36).substring(2, 5).toUpperCase(); // 3 random chars
 // Use orderId that embeds customerId for easy parsing in webhook
 const orderId =`TRX-${data.customerId}-${dateStr}-${randomStr}`;

 // Construct dynamic notification URL based on environment
 // Users can set NEXT_PUBLIC_APP_URL to their ngrok URL in .env.local, and Vercel domain in Vercel
 const appUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ?`https://${process.env.VERCEL_URL}`:'https://vicinity-levers-condiment.ngrok-free.dev');
 const webhookUrl =`${appUrl}/api/midtrans/webhook`;

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
 name:`Langganan ${data.service}`,
 }
 ],
 // Dynamic notification URL override to prevent manual switching on Midtrans dashboard
 custom_notification_urls: [webhookUrl],
 // Dynamic redirect callback URLs override
 callbacks: {
 finish:`${appUrl}/finance`,
 unfinish:`${appUrl}/finance`,
 error:`${appUrl}/finance`
 }
 };

 const transaction = await snap.createTransaction(parameters);

 return {
 success: true,
 token: transaction.token,
 redirect_url: transaction.redirect_url,
 order_id: orderId
 };
 } catch (e) {
 logger.error({ message:"Midtrans Error: createPaymentLink", error: e, path:"action"});
 return { success: false, error: String(e) };
 }
}
