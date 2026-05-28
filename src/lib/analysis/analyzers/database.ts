/**
 * DatabaseAnalyzer — Task 13.1
 *
 * Detects N+1 query patterns, missing transaction wrappers,
 * unparameterized SQL, and missing Materialized View error handling.
 */

import path from'path';
import {
 AnalysisContext,
 Finding,
 FindingCategory,
 Severity,
 FileMetadata,
 FileType,
} from'../types';
import { BaseAnalyzer } from'./base';

export class DatabaseAnalyzer extends BaseAnalyzer {
 name ='DatabaseAnalyzer';
 category = FindingCategory.DATABASE;

 protected async runAnalysis(ctx: AnalysisContext): Promise<Finding[]> {
 const srcFiles = ctx.files.filter(f => f.type === FileType.SOURCE);

 return [
 ...this._checkStringInterpolationSQL(srcFiles, ctx),
 ...this._checkMissingTransactions(srcFiles, ctx),
 ...this._checkUnhandledMVRefresh(srcFiles, ctx),
 ...this._checkNplusOnePatterns(srcFiles, ctx),
 ];
 }

 // ── String interpolation in SQL ───────────────────────────────────────────

 private _checkStringInterpolationSQL(files: FileMetadata[], ctx: AnalysisContext): Finding[] {
 const findings: Finding[] = [];
 // SQL strings using template literals with variables (potential injection)
 const dangerousPattern = /pool\.query\s*\(\s*`[^`]*\$\{[^}]+\}/g;

 for (const file of files) {
 const src = this.readFile(file.path);
 dangerousPattern.lastIndex = 0;
 if (!dangerousPattern.test(src)) continue;

 findings.push(this.finding({
 category: FindingCategory.DATABASE,
 severity: Severity.CRITICAL,
 title:`Potential SQL Injection via Template Literal in \`${path.basename(file.path)}\``,
 description:
`\`${path.relative(ctx.projectRoot, file.path)}\`passes JavaScript template literals directly into`+
'`pool.query()`. If any interpolated variable originates from user input, this is a SQL injection vulnerability.',
 location: file.path,
 impact: { score: 10, description:'SQL injection — full database compromise possible.'},
 effort: { hours: 2, complexity:'simple'},
 recommendation: {
 action:'Use parameterized queries (`$1`,`$2`) for all user-controlled values.',
 steps: [
'Replace template literal SQL with a parameterised string',
'Pass values as the second argument array to`pool.query()`',
 ],
 codeExample: {
 before:`await pool.query(\`SELECT * FROM admin WHERE email ='\${email}'\`);`,
 after:`await pool.query('SELECT * FROM admin WHERE email = $1', [email]);`,
 },
 testingStrategy:'Run OWASP ZAP scan — SQL injection tests should return no vulnerabilities.',
 rollbackPlan:'N/A — do not roll back security fixes.',
 successCriteria: ['Zero template-literal SQL queries with interpolated user input'],
 },
 }));
 }

 return findings;
 }

 // ── Missing transaction wrappers on multi-step DB operations ──────────────

 private _checkMissingTransactions(files: FileMetadata[], ctx: AnalysisContext): Finding[] {
 const findings: Finding[] = [];
 // Look for files that make multiple pool.query calls without BEGIN/COMMIT
 const multiQueryPattern = /pool\.query[\s\S]{1,500}pool\.query/;
 const transactionPattern = /BEGIN|pool\.connect\(\)|client\.query/;

 const actionFiles = files.filter(f => f.path.includes(path.sep +'actions'+ path.sep));

 for (const file of actionFiles) {
 const src = this.readFile(file.path);
 if (!multiQueryPattern.test(src)) continue;
 if (transactionPattern.test(src)) continue;

 findings.push(this.finding({
 category: FindingCategory.DATABASE,
 severity: Severity.HIGH,
 title:`Multi-Step DB Operation Without Transaction in \`${path.basename(file.path)}\``,
 description:
`\`${path.relative(ctx.projectRoot, file.path)}\`executes multiple`+
'`pool.query()`calls sequentially but without wrapping them in a transaction.'+
'If one query fails, earlier queries in the sequence will leave the database in an inconsistent state.',
 location: file.path,
 impact: { score: 8, description:'Data inconsistency on partial failures.'},
 effort: { hours: 1, complexity:'simple'},
 recommendation: {
 action:'Wrap multi-step operations in a`client.query("BEGIN")`/`COMMIT`/`ROLLBACK`block.',
 steps: [
'`const client = await pool.connect()`',
'`try { await client.query("BEGIN"); ... all queries ... await client.query("COMMIT"); }`',
'`catch { await client.query("ROLLBACK"); throw; }`',
'`finally { client.release(); }`',
 ],
 codeExample: {
 before:`await pool.query('UPDATE admin SET ...');
await pool.query('INSERT INTO audit_log ...');`,
 after:`const client = await pool.connect();
try {
 await client.query('BEGIN');
 await client.query('UPDATE admin SET ...');
 await client.query('INSERT INTO audit_log ...');
 await client.query('COMMIT');
} catch (e) {
 await client.query('ROLLBACK');
 throw e;
} finally {
 client.release();
}`,
 },
 testingStrategy:'Simulate a DB error mid-operation and verify no partial updates are committed.',
 rollbackPlan:'Remove transaction wrapping (not recommended).',
 successCriteria: ['All multi-step DB operations use transactions'],
 },
 }));
 }

 return findings;
 }

 // ── Unhandled MV refresh errors ───────────────────────────────────────────

 private _checkUnhandledMVRefresh(files: FileMetadata[], ctx: AnalysisContext): Finding[] {
 const mvFiles = files.filter(
 f => f.path.includes('materialized') || f.path.includes('mv') || f.path.includes('cron'),
 );

 const findings: Finding[] = [];

 for (const file of mvFiles) {
 const src = this.readFile(file.path);
 // Detect`REFRESH MATERIALIZED VIEW`without a surrounding try/catch
 const hasRefresh = src.includes('REFRESH MATERIALIZED VIEW');
 const hasErrorHandling = src.includes('catch') || src.includes('.catch(');

 if (hasRefresh && !hasErrorHandling) {
 findings.push(this.finding({
 category: FindingCategory.DATABASE,
 severity: Severity.HIGH,
 title:`Unhandled Error in MV Refresh: \`${path.basename(file.path)}\``,
 description:
`\`${path.relative(ctx.projectRoot, file.path)}\`calls \`REFRESH MATERIALIZED VIEW\``+
'without a`try/catch`block. If Neon is temporarily unavailable, the entire cron run will fail'+
'with an unhandled exception, and subsequent MVs in the`Promise.all`will not be refreshed.',
 location: file.path,
 impact: { score: 6, description:'Cascading failure — all MVs stale if one refresh throws.'},
 effort: { hours: 1, complexity:'simple'},
 recommendation: {
 action:'Wrap each MV refresh in a`try/catch`and log the error without re-throwing.',
 steps: [
'Wrap`await pool.query("REFRESH MATERIALIZED VIEW ...")`in`try { ... } catch (e) { console.error(e); }`',
'Return a partial success response from the cron endpoint',
 ],
 codeExample: {
 before:`await pool.query('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_aging_analysis');`,
 after:`try {
 await pool.query('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_aging_analysis');
} catch (error) {
 console.error('[Cron] Failed to refresh mv_aging_analysis:', error);
 // Continue refreshing remaining MVs
}`,
 },
 testingStrategy:'Mock a DB failure and verify the cron endpoint still returns 200 and logs the error.',
 rollbackPlan:'Remove try/catch (not recommended).',
 successCriteria: ['Cron endpoint returns 200 even when individual MV refresh fails'],
 },
 }));
 }
 }

 return findings;
 }

 // ── N+1 query patterns ────────────────────────────────────────────────────

 private _checkNplusOnePatterns(files: FileMetadata[], ctx: AnalysisContext): Finding[] {
 const findings: Finding[] = [];
 // Look for pool.query inside for/forEach/map loops
 const nplusOnePattern = /(?:for\s*\(|forEach\s*\(|\.map\s*\()\s*(?:async\s*)?\([^)]*\)\s*(?:=>\s*)?\{[\s\S]{0,400}pool\.query/;

 for (const file of files) {
 const src = this.readFile(file.path);
 if (!nplusOnePattern.test(src)) continue;

 findings.push(this.finding({
 category: FindingCategory.DATABASE,
 severity: Severity.HIGH,
 title:`Potential N+1 Query Pattern in \`${path.basename(file.path)}\``,
 description:
`\`${path.relative(ctx.projectRoot, file.path)}\`runs \`pool.query()\`inside a loop.`+
'This is a classic N+1 pattern — if the loop iterates over N items, N database round-trips are made.'+
'On Neon (serverless PG), each round-trip includes TCP overhead, significantly impacting response times.',
 location: file.path,
 impact: { score: 7, description:'N×SQL round-trips instead of 1 — linear scaling cost on DB.'},
 effort: { hours: 2, complexity:'moderate'},
 recommendation: {
 action:'Batch the queries using SQL`IN (...)`or`JOIN`instead of per-item queries.',
 steps: [
'Collect all IDs before the loop',
'Execute a single`WHERE id = ANY($1)`query with the full ID array',
'Map results back to the loop items using a`Map<id, row>`',
 ],
 codeExample: {
 before:`const results = await Promise.all(
 ids.map(id => pool.query('SELECT * FROM pelanggan WHERE id = $1', [id]))
);`,
 after:`const result = await pool.query(
'SELECT * FROM pelanggan WHERE id = ANY($1)',
 [ids]
);
const byId = new Map(result.rows.map(r => [r.id, r]));`,
 },
 testingStrategy:'Check Neon query logs — should show 1 query per endpoint call, not N.',
 rollbackPlan:'Restore per-item queries.',
 successCriteria: ['DB query count per request reduced from N to 1 for list operations'],
 },
 }));
 }

 return findings;
 }
}
