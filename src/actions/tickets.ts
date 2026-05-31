"use server";

import { query } from"@/lib/db";
import { revalidatePath } from"next/cache";
import { logger } from"@/lib/logger";

export async function createTicket(data: {
 customer_id: string;
 issue_category: string;
 description: string;
 priority: string;
 assigned_to?: string;
}) {
 try {
 // Generate Ticket Number: TKT-[customer_id]-YYYYMMDD-HHMM
 const now = new Date();
 const wibMs = now.getTime() + 7 * 60 * 60 * 1000;
 const wibNow = new Date(wibMs);
 const yyyy = wibNow.getUTCFullYear();
 const mm = String(wibNow.getUTCMonth() + 1).padStart(2,'0');
 const dd = String(wibNow.getUTCDate()).padStart(2,'0');
 const hh = String(wibNow.getUTCHours()).padStart(2,'0');
 const min = String(wibNow.getUTCMinutes()).padStart(2,'0');
 
 const ticket_number =`TKT-${data.customer_id}-${yyyy}${mm}${dd}-${hh}${min}`;

 await query(`
 INSERT INTO tickets (ticket_number, customer_id, issue_category, description, status, priority, assigned_to)
 VALUES ($1, $2, $3, $4,'OPEN', $5, $6)
`, [ticket_number, data.customer_id, data.issue_category, data.description, data.priority, data.assigned_to || null]);

 revalidatePath('/tickets');
 revalidatePath(`/customers/${data.customer_id}`);
 return { success: true, ticket_number };
 } catch (e) {
 logger.error({ message:"DB Error: createTicket", error: e, path:"action"});
 return { success: false, error: String(e) };
 }
}

export async function getTickets(filters?: { status?: string }) {
 try {
 let sql =`
 SELECT t.*, c.name as customer_name, c.address, c.no_telp
 FROM tickets t
 JOIN customers c ON c.id = t.customer_id
 WHERE (
 t.status IN ('OPEN','IN_PROGRESS') 
 OR DATE(t.resolved_at) = CURRENT_DATE 
 OR DATE(t.created_at) = CURRENT_DATE
 )
`;
 const params: any[] = [];
 
 if (filters?.status) {
 sql +=`AND t.status = $1`;
 params.push(filters.status);
 }
 
 sql +=`ORDER BY 
 CASE t.priority 
 WHEN'CRITICAL'THEN 1
 WHEN'HIGH'THEN 2
 WHEN'MEDIUM'THEN 3
 WHEN'LOW'THEN 4
 END,
 t.created_at DESC
`;
 
 const res = await query(sql, params);
 
 // Formatting created_at / resolved_at
 return res.rows.map(r => ({
 ...r,
 created_at_str: r.created_at ? new Date(r.created_at).toISOString() : null,
 resolved_at_str: r.resolved_at ? new Date(r.resolved_at).toISOString() : null,
 }));
 } catch (e) {
 logger.error({ message:"DB Error: getTickets", error: e, path:"action"});
 return [];
 }
}

export async function getCustomerTickets(customer_id: string) {
 try {
 const res = await query(`
 SELECT * FROM tickets 
 WHERE customer_id = $1 
 ORDER BY created_at DESC
`, [customer_id]);
 
 return res.rows.map(r => ({
 ...r,
 created_at_str: r.created_at ? new Date(r.created_at).toISOString() : null,
 resolved_at_str: r.resolved_at ? new Date(r.resolved_at).toISOString() : null,
 }));
 } catch (e) {
 logger.error({ message:"DB Error: getCustomerTickets", error: e, path:"action"});
 return [];
 }
}

export async function getResolvedHistoryTickets() {
 try {
 const res = await query(`
 SELECT t.*, c.name as customer_name, c.address, c.no_telp
 FROM tickets t
 JOIN customers c ON c.id = t.customer_id
 WHERE t.status IN ('RESOLVED','CLOSED')
 ORDER BY t.resolved_at DESC
 LIMIT 100
`);
 
 return res.rows.map(r => ({
 ...r,
 created_at_str: r.created_at ? new Date(r.created_at).toISOString() : null,
 resolved_at_str: r.resolved_at ? new Date(r.resolved_at).toISOString() : null,
 }));
 } catch (e) {
 logger.error({ message:"DB Error: getResolvedHistoryTickets", error: e, path:"action"});
 return [];
 }
}

export async function updateTicketStatus(id: string, status: string, assignTo?: string) {
 try {
 let sql =`UPDATE tickets SET status = $1`;
 const params: any[] = [status];
 
 if (status ==='RESOLVED'|| status ==='CLOSED') {
 sql +=`, resolved_at = CURRENT_TIMESTAMP`;
 if (assignTo) {
 params.push(assignTo);
 sql +=`, assigned_to = $${params.length}`;
 }
 } else {
 sql +=`, resolved_at = NULL`;
 }
 
 params.push(id);
 sql += ` WHERE id = $${params.length} RETURNING customer_id`;
 
 const res = await query(sql, params);
 
 revalidatePath('/tickets');
 if (res.rows.length > 0) {
 revalidatePath(`/customers/${res.rows[0].customer_id}`);
 }
 
 return { success: true };
 } catch (e) {
 logger.error({ message:"DB Error: updateTicketStatus", error: e, path:"action"});
 return { success: false, error: String(e) };
 }
}
