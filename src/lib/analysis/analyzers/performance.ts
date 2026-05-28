/**
 * PerformanceAnalyzer — Task 9.1
 *
 * Inspects bundle size, lazy loading, DB cold-start behaviour, caching,
 * and known ISP-FinTrack–specific performance patterns.
 */

import path from'path';
import {
 AnalysisContext,
 Finding,
 FindingCategory,
 Severity,
} from'../types';
import { BaseAnalyzer } from'./base';

export class PerformanceAnalyzer extends BaseAnalyzer {
 name ='PerformanceAnalyzer';
 category = FindingCategory.PERFORMANCE;

 protected async runAnalysis(ctx: AnalysisContext): Promise<Finding[]> {
 return [
 ...this._checkInstrumentationColdStart(ctx),
 ...this._checkCronEndpointCompleteness(ctx),
 ...this._checkDbPoolConfig(ctx),
 ...this._checkMockDataInProduction(ctx),
 ...this._checkHeavyDependencies(ctx),
 ...this._checkTypescriptIgnoreBuildErrors(ctx),
 ];
 }

 // ── Cold-start DB spam ────────────────────────────────────────────────────

 private _checkInstrumentationColdStart(ctx: AnalysisContext): Finding[] {
 const file = ctx.files.find(f => f.path.endsWith('instrumentation.ts'));
 if (!file) return [];

 const src = this.readFile(file.path);

 // Check if MV refresh runs unconditionally (outside the Vercel guard)
 const hasUnguardedRefresh =
 src.includes('refreshAgingMV') &&
 !src.match(/if\s*\(\s*process\.env\.VERCEL\s*!==\s*["']1["']\s*\)\s*\{[\s\S]*refreshAgingMV/m);

 // Current code puts refresh BEFORE the vercel guard — that's the bug
 const refreshBeforeGuard = /refreshAgingMV[\s\S]{0,300}VERCEL\s*!==/.test(src);

 if (refreshBeforeGuard) {
 return [this.finding({
 category: FindingCategory.PERFORMANCE,
 severity: Severity.CRITICAL,
 title:'MV Refresh Fires on Every Serverless Cold Start',
 description:
'In`instrumentation.ts`, all 5`refreshXxxMV()`calls execute **before** the`VERCEL !=="1"`guard.'+
'On Vercel, every new serverless instance spins up`instrumentation.ts`, triggering 5 heavy Materialized View refreshes against the Neon database simultaneously.'+
'Under traffic spikes this floods the DB connection pool, spikes CPU to 100%, and degrades response times.',
 location: file.path,
 impact: { score: 10, description:'Can cause Neon DB overload and site-wide 500 errors under load.', metrics: { performanceGain:'Eliminates cold-start DB spike'} },
 effort: { hours: 0.5, complexity:'trivial'},
 recommendation: {
 action:'Move all MV refresh calls inside the`VERCEL !=="1"`guard.',
 steps: [
'Open`src/instrumentation.ts`',
'Move lines 18–22 (the 5`refreshXxxMV()`calls) to inside the`if (process.env.VERCEL !=="1")`block',
'Keep the`pool.query("SELECT 1")`warmup outside the guard (it is cheap)',
 ],
 codeExample: {
 before:`// ❌ Runs on EVERY cold start including Vercel
refreshAgingMV().catch(...)
refreshPredictions().catch(...)
if (process.env.VERCEL !=="1") {
 cron.schedule(...)
}`,
 after:`// ✅ Only runs on local dev server
pool.query("SELECT 1").catch(...) // warm up pool (cheap)
if (process.env.VERCEL !=="1") {
 refreshAgingMV().catch(...)
 refreshPredictions().catch(...)
 cron.schedule(...)
}`,
 },
 testingStrategy:'Deploy to Vercel preview and check Neon DB metrics — no connection spike on cold start.',
 rollbackPlan:'Move the refresh calls back outside the guard.',
 successCriteria: ['Zero MV refresh triggered on Vercel cold start','DB connection count stays flat'],
 },
 })];
 }

 return [];
 }

 // ── Incomplete cron endpoint ──────────────────────────────────────────────

 private _checkCronEndpointCompleteness(ctx: AnalysisContext): Finding[] {
 const cronFile = ctx.files.find(f => f.path.replace(/\\/g,'/').includes('api/cron/route.ts'));
 if (!cronFile) return [];

 const src = this.readFile(cronFile.path);
 const missingMVs: string[] = [];

 if (!src.includes('refreshDashboardMV')) missingMVs.push('refreshDashboardMV');
 if (!src.includes('refreshProfitabilityMV')) missingMVs.push('refreshProfitabilityMV');
 if (!src.includes('refreshExecutiveMV')) missingMVs.push('refreshExecutiveMV');

 if (missingMVs.length === 0) return [];

 return [this.finding({
 category: FindingCategory.PERFORMANCE,
 severity: Severity.HIGH,
 title:'Vercel Cron Only Refreshes 2 of 5 Materialized Views',
 description:
`\`/api/cron/route.ts\`refreshes only \`refreshAgingMV\`and \`refreshPredictions\`.`+
`The following MVs are **never refreshed in production**: ${missingMVs.map(m =>`\`${m}\``).join(',')}.`+
`Dashboard, Profitability, and Executive pages therefore show stale data after nightly cron runs.`,
 location: cronFile.path,
 impact: { score: 8, description:'Dashboard, Profitability, Executive show stale data after each cron cycle.'},
 effort: { hours: 0.5, complexity:'trivial'},
 recommendation: {
 action:'Add the 3 missing refreshes to the cron endpoint`Promise.all`.',
 steps: [
'Open`src/app/api/cron/route.ts`',
'Import`refreshDashboardMV`,`refreshProfitabilityMV`,`refreshExecutiveMV`',
'Add them to the existing`Promise.all([...])`call',
 ],
 codeExample: {
 before:`await Promise.all([
 refreshAgingMV(),
 refreshPredictions()
]);`,
 after:`await Promise.all([
 refreshAgingMV(),
 refreshPredictions(),
 refreshDashboardMV(),
 refreshProfitabilityMV(),
 refreshExecutiveMV(),
]);`,
 },
 testingStrategy:'Trigger the cron endpoint manually with the correct`CRON_SECRET`and verify all 5 MVs are updated in Neon.',
 rollbackPlan:'Remove the 3 new entries from`Promise.all`.',
 successCriteria: ['All 5 MVs are refreshed after each cron run','Dashboard shows fresh data'],
 },
 })];
 }

 // ── DB pool size for serverless ───────────────────────────────────────────

 private _checkDbPoolConfig(ctx: AnalysisContext): Finding[] {
 const dbFile = ctx.files.find(f => f.path.replace(/\\/g,'/').endsWith('lib/db.ts'));
 if (!dbFile) return [];

 const src = this.readFile(dbFile.path);
 const hasAdaptivePool = src.includes('isServerless') || src.includes("VERCEL ==='1'") || src.includes('VERCEL !=="1"');

 if (!hasAdaptivePool && src.includes('max: 10')) {
 return [this.finding({
 category: FindingCategory.PERFORMANCE,
 severity: Severity.HIGH,
 title:'DB Pool Size Not Adapted for Serverless (max: 10)',
 description:
'`src/lib/db.ts`uses`max: 10`unconditionally. On Vercel, each serverless function instance'+
'creates its own pool. Under traffic spikes (e.g., 30 concurrent Lambda invocations × 10 connections)'+
'you can exhaust Neon\'s 100–250 connection limit, causing`connection refused`errors for all users.',
 location: dbFile.path,
 impact: { score: 9, description:'Can exhaust database connection pool under production load.', metrics: { performanceGain:'Prevents connection pool exhaustion'} },
 effort: { hours: 1, complexity:'simple'},
 recommendation: {
 action:'Use`max: 2`on Vercel (serverless) and`max: 10`for local dev.',
 steps: ['Open`src/lib/db.ts`','Add an`isServerless`flag and set`max`conditionally'],
 codeExample: {
 before:`const poolConfig: any = {
 max: 10,
 idleTimeoutMillis: 30000,
 connectionTimeoutMillis: 5000,
};`,
 after:`const isServerless = process.env.VERCEL ==='1';
const poolConfig: any = {
 max: isServerless ? 2 : 10,
 idleTimeoutMillis: isServerless ? 15000 : 30000,
 connectionTimeoutMillis: 5000,
};`,
 },
 testingStrategy:'Deploy to Vercel and run a load test — verify Neon connection count stays under limit.',
 rollbackPlan:'Revert`poolConfig`to`max: 10`unconditionally.',
 successCriteria: ['Neon connection count stays < 50 under 20 concurrent requests'],
 },
 })];
 }

 return [];
 }

 // ── mockData.ts in production bundle ─────────────────────────────────────

 private _checkMockDataInProduction(ctx: AnalysisContext): Finding[] {
 const mockFile = ctx.files.find(f => f.path.endsWith('mockData.ts') && !f.path.endsWith('mockData_old.ts'));
 if (!mockFile) return [];

 // Check if any src/ page actually imports it
 const importedBySrcPage = ctx.dependencyGraph.nodes.get(mockFile.path)?.importedBy
 .some(p => p.replace(/\\/g,'/').includes('/app/')) ?? false;

 if (importedBySrcPage && mockFile.size > 500_000) {
 return [this.finding({
 category: FindingCategory.PERFORMANCE,
 severity: Severity.HIGH,
 title:`mockData.ts (${(mockFile.size / 1024 / 1024).toFixed(1)} MB) Imported by App Pages`,
 description:
`\`src/lib/mockData.ts\`is ${(mockFile.size / 1024 / 1024).toFixed(1)} MB and is imported by production pages.`+
'This bloats the JavaScript bundle served to end users. Since the app uses a real Neon PostgreSQL database, mock data should only be used in test environments.',
 location: mockFile.path,
 impact: { score: 9, description:'Severely inflates JS bundle; degrades LCP and FCP.', metrics: { spaceSaving:`~${(mockFile.size / 1024 / 1024).toFixed(1)} MB bundle reduction`} },
 effort: { hours: 3, complexity:'moderate'},
 recommendation: {
 action:'Guard all`mockData`imports behind`process.env.NODE_ENV ==="test"`or remove entirely.',
 steps: [
'Search for all files importing`mockData`in`src/app/`',
'Replace mock data usage with real Server Action calls',
'Delete or move`mockData.ts`to`__tests__/fixtures/`',
 ],
 testingStrategy:'Run`npm run build`and check bundle analyser for mockData references.',
 rollbackPlan:'Restore mock data imports.',
 successCriteria: ['mockData.ts is not included in any production bundle chunk'],
 },
 })];
 }

 return [];
 }

 // ── Heavy dependencies ────────────────────────────────────────────────────

 private _checkHeavyDependencies(ctx: AnalysisContext): Finding[] {
 const findings: Finding[] = [];
 const deps = { ...ctx.packageJson?.dependencies, ...ctx.packageJson?.devDependencies };

 const heavyDeps: Array<{ name: string; reason: string; alternative?: string }> = [
 { name:'moment', reason:'Very large date library (60+ KB).', alternative:'date-fns or dayjs'},
 { name:'tesseract.js', reason:'OCR library (extremely large).'},
 { name:'html2canvas', reason:'HTML to image library (large size).'},
 { name:'xlsx', reason:'Excel spreadsheet parser/writer (very large).'},
 ];

 for (const dep of heavyDeps) {
 if (!deps[dep.name]) continue;
 findings.push(this.finding({
 category: FindingCategory.PERFORMANCE,
 severity: Severity.MEDIUM,
 title:`Heavy Dependency Not Lazy-Loaded: \`${dep.name}\``,
 description:`\`${dep.name}\`is included in \`package.json\`dependencies. ${dep.reason}`,
 location:'package.json',
 impact: { score: 6, description:'Increases initial JS bundle, degrading FCP/LCP.', metrics: { performanceGain:'200–500ms FCP improvement'} },
 effort: { hours: 1, complexity:'simple'},
 recommendation: {
 action:`Lazy-load \`${dep.name}\`on demand.`,
 steps: [
`Find all imports of \`${dep.name}\`in \`src/\``,
 dep.alternative ?`Replace static import with: ${dep.alternative}`:'Wrap usage in a dynamic import',
 ],
 testingStrategy:'Run bundle analyser (`npx @next/bundle-analyzer`) and confirm chunk split.',
 rollbackPlan:'Restore static import.',
 successCriteria: [`\`${dep.name}\`does not appear in the main JS bundle chunk`],
 },
 }));
 }

 return findings;
 }

 // ── TypeScript ignoreBuildErrors ──────────────────────────────────────────

 private _checkTypescriptIgnoreBuildErrors(ctx: AnalysisContext): Finding[] {
 const configFile = ctx.files.find(f => f.path.endsWith('next.config.ts') || f.path.endsWith('next.config.js'));
 if (!configFile) return [];

 const src = this.readFile(configFile.path);
 if (!src.includes('ignoreBuildErrors: true')) return [];

 return [this.finding({
 category: FindingCategory.PERFORMANCE,
 severity: Severity.HIGH,
 title:'`ignoreBuildErrors: true`in next.config.ts',
 description:
'`next.config.ts`sets`typescript.ignoreBuildErrors: true`, which silences all TypeScript type errors during production builds.'+
'This masks bugs that can cause runtime crashes, broken pages, and incorrect data rendering in production.',
 location: configFile.path,
 impact: { score: 8, description:'Allows broken TypeScript code to reach production.'},
 effort: { hours: 4, complexity:'moderate'},
 recommendation: {
 action:'Remove`ignoreBuildErrors: true`and fix all TypeScript errors.',
 steps: [
'Remove or set`ignoreBuildErrors: false`in`next.config.ts`',
'Run`npx tsc --noEmit`to list all type errors',
'Fix type errors module by module, starting with`any`casts and missing return types',
 ],
 codeExample: {
 before:`typescript: { ignoreBuildErrors: true }`,
 after:`// Remove this block entirely — let TS errors fail the build`,
 },
 testingStrategy:'Run`npm run build`— it should now fail on TypeScript errors.',
 rollbackPlan:'Re-add`ignoreBuildErrors: true`temporarily if blockers are too many.',
 successCriteria: ['`npm run build`completes with zero TypeScript errors'],
 },
 })];
 }
}
