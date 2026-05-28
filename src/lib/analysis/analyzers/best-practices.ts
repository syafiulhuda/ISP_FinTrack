/**
 * BestPracticesAnalyzer — Task 14.1
 *
 * Enforces Next.js App Router best practices: missing metadata, missing
 * loading.tsx/error.tsx, client-only code in Server Components, and
 * missing`export const dynamic`for frequently-changing pages.
 */

import path from'path';
import fs from'fs';
import {
 AnalysisContext,
 Finding,
 FindingCategory,
 Severity,
 FileMetadata,
 FileType,
} from'../types';
import { BaseAnalyzer } from'./base';

export class BestPracticesAnalyzer extends BaseAnalyzer {
 name ='BestPracticesAnalyzer';
 category = FindingCategory.BEST_PRACTICES;

 protected async runAnalysis(ctx: AnalysisContext): Promise<Finding[]> {
 return [
 ...this._checkMissingLoadingFiles(ctx),
 ...this._checkMissingErrorFiles(ctx),
 ...this._checkClientOnlyInServer(ctx),
 ...this._checkMissingOpengraphMetadata(ctx),
 ...this._checkMissingDynamicExport(ctx),
 ];
 }

 // ── Missing loading.tsx in route segments ─────────────────────────────────

 private _checkMissingLoadingFiles(ctx: AnalysisContext): Finding[] {
 const findings: Finding[] = [];
 const pageFiles = ctx.files.filter(
 f => path.basename(f.path) ==='page.tsx'&& f.path.includes(path.sep +'app'+ path.sep),
 );

 const EXEMPT_ROUTES = ['(auth)','api']; // Don't need loading.tsx

 for (const page of pageFiles) {
 const dir = path.dirname(page.path);
 const routeName = path.basename(dir);

 if (EXEMPT_ROUTES.some(e => page.path.includes(e))) continue;

 const loadingPath = path.join(dir,'loading.tsx');
 if (fs.existsSync(loadingPath)) continue;

 findings.push(this.finding({
 category: FindingCategory.BEST_PRACTICES,
 severity: Severity.LOW,
 title:`Missing \`loading.tsx\`in Route: \`${routeName}/\``,
 description:
`The route \`${path.relative(ctx.projectRoot, dir)}\`has a \`page.tsx\`but no \`loading.tsx\`.`+
'Without a loading boundary, Next.js shows a blank screen while the Server Component fetches data,'+
'giving users no visual feedback of pending activity.',
 location: dir,
 impact: { score: 4, description:'Poor loading UX — blank screen while data fetches.'},
 effort: { hours: 0.5, complexity:'trivial'},
 recommendation: {
 action:`Create \`loading.tsx\`in \`${path.relative(ctx.projectRoot, dir)}\`.`,
 steps: [
`Create \`${path.relative(ctx.projectRoot, loadingPath)}\``,
'Return a skeleton component that matches the layout of the page',
 ],
 codeExample: {
 before:`// No loading.tsx — blank screen shown`,
 after:`// loading.tsx
export default function Loading() {
 return (
 <div className="flex items-center justify-center h-64">
 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"/>
 </div>
 );
}`,
 },
 testingStrategy:'Throttle network to"Slow 3G"in DevTools — loading skeleton should appear immediately.',
 rollbackPlan:'Delete`loading.tsx`.',
 successCriteria: ['All data-fetching pages show a loading skeleton'],
 },
 }));
 }

 return findings;
 }

 // ── Missing error.tsx in route segments ──────────────────────────────────

 private _checkMissingErrorFiles(ctx: AnalysisContext): Finding[] {
 const findings: Finding[] = [];
 const pageFiles = ctx.files.filter(
 f => path.basename(f.path) ==='page.tsx'&& f.path.includes(path.sep +'app'+ path.sep),
 );

 const EXEMPT_ROUTES = ['(auth)','api'];

 for (const page of pageFiles) {
 const dir = path.dirname(page.path);
 const routeName = path.basename(dir);

 if (EXEMPT_ROUTES.some(e => page.path.includes(e))) continue;

 const errorPath = path.join(dir,'error.tsx');
 if (fs.existsSync(errorPath)) continue;

 findings.push(this.finding({
 category: FindingCategory.BEST_PRACTICES,
 severity: Severity.MEDIUM,
 title:`Missing \`error.tsx\`in Route: \`${routeName}/\``,
 description:
`\`${path.relative(ctx.projectRoot, dir)}\`has no \`error.tsx\`.`+
'Unhandled Server Component errors bubble up to the nearest error boundary.'+
'Without a local boundary, a single failed data fetch crashes the entire page with a generic 500 error.',
 location: dir,
 impact: { score: 6, description:'Full-page crash on DB errors — very poor user experience.'},
 effort: { hours: 0.5, complexity:'trivial'},
 recommendation: {
 action:`Create \`error.tsx\`in \`${path.relative(ctx.projectRoot, dir)}\`.`,
 steps: [
`Create \`${path.relative(ctx.projectRoot, errorPath)}\``,
'Mark it`"use client"`(required for error boundaries)',
'Display a friendly error message with a retry button',
 ],
 codeExample: {
 before:`// No error.tsx — full page crash on DB error`,
 after:`"use client";
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
 return (
 <div className="flex flex-col items-center gap-4 p-8">
 <p className="text-red-500">{error.message}</p>
 <button onClick={reset} className="btn-primary">Try Again</button>
 </div>
 );
}`,
 },
 testingStrategy:'Simulate a DB error and verify the error boundary UI is shown instead of a 500 page.',
 rollbackPlan:'Delete`error.tsx`.',
 successCriteria: ['All pages have error boundaries','DB errors show a friendly retry UI'],
 },
 }));
 }

 return findings;
 }

 // ── Client-only patterns in potential Server Components ───────────────────

 private _checkClientOnlyInServer(ctx: AnalysisContext): Finding[] {
 const findings: Finding[] = [];

 const serverComponents = ctx.files.filter(f => {
 if (!f.path.endsWith('.tsx') && !f.path.endsWith('.ts')) return false;
 if (!f.path.includes(path.sep +'app'+ path.sep)) return false;
 const src = this.readFile(f.path);
 return !src.startsWith('"use client"') && !src.startsWith("'use client'");
 });

 for (const file of serverComponents) {
 const src = this.readFile(file.path);
 const usesHooks = /\buse(?:State|Effect|Ref|Callback|Memo|Context)\s*\(/.test(src);
 const hasUseClient = src.includes('"use client"') || src.includes("'use client'");

 if (usesHooks && !hasUseClient) {
 findings.push(this.finding({
 category: FindingCategory.BEST_PRACTICES,
 severity: Severity.HIGH,
 title:`React Hook Used in Server Component: \`${path.basename(file.path)}\``,
 description:
`\`${path.relative(ctx.projectRoot, file.path)}\`uses React hooks (useState/useEffect/etc.)`+
'but is missing the`"use client"`directive. This will cause a build error or runtime crash in Next.js App Router.',
 location: file.path,
 impact: { score: 8, description:'Build error or runtime crash.'},
 effort: { hours: 0.25, complexity:'trivial'},
 recommendation: {
 action:'Add`"use client"`directive as the first line of the file.',
 steps: [
'Add`"use client";`as the very first line (before any imports)',
 ],
 codeExample: {
 before:`import { useState } from'react';
export function MyComponent() { ... }`,
 after:`"use client";
import { useState } from'react';
export function MyComponent() { ... }`,
 },
 testingStrategy:'`npm run build`— should compile without errors.',
 rollbackPlan:'Remove`"use client"`directive.',
 successCriteria: ['Build completes successfully'],
 },
 }));
 }
 }

 return findings;
 }

 // ── Missing OG / Twitter metadata ─────────────────────────────────────────

 private _checkMissingOpengraphMetadata(ctx: AnalysisContext): Finding[] {
 const rootLayout = ctx.files.find(
 f => f.path.endsWith(path.join('app','layout.tsx')),
 );
 if (!rootLayout) return [];

 const src = this.readFile(rootLayout.path);
 const hasOG = src.includes('openGraph') || src.includes('twitter');

 if (!hasOG) {
 return [this.finding({
 category: FindingCategory.BEST_PRACTICES,
 severity: Severity.LOW,
 title:'Missing OpenGraph / Twitter Card Metadata in Root Layout',
 description:
'`app/layout.tsx`exports`metadata`but does not include`openGraph`or`twitter`fields.'+
'When the app URL is shared on LinkedIn, WhatsApp, or Twitter, no preview card will appear,'+
'reducing perceived professionalism.',
 location: rootLayout.path,
 impact: { score: 3, description:'No rich link preview when sharing the app URL on social media.'},
 effort: { hours: 0.5, complexity:'trivial'},
 recommendation: {
 action:'Add`openGraph`and`twitter`to the`metadata`export in`app/layout.tsx`.',
 steps: [
'Open`src/app/layout.tsx`',
'Extend the`metadata`object with`openGraph`and`twitter`fields',
 ],
 codeExample: {
 before:`export const metadata: Metadata = {
 title:'ISP-FinTrack',
 description:'...',
};`,
 after:`export const metadata: Metadata = {
 title:'ISP-FinTrack',
 description:'...',
 openGraph: {
 title:'ISP-FinTrack',
 description:'Financial management system for ISP businesses',
 type:'website',
 },
 twitter: { card:'summary'},
};`,
 },
 testingStrategy:'Use the Facebook Sharing Debugger or`npx open-graph-scraper`to verify.',
 rollbackPlan:'Remove`openGraph`/`twitter`fields.',
 successCriteria: ['Link preview shows correct title and description when URL is shared'],
 },
 })];
 }

 return [];
 }

 // ── Missing`export const dynamic ='force-dynamic'`─────────────────────

 private _checkMissingDynamicExport(ctx: AnalysisContext): Finding[] {
 const findings: Finding[] = [];

 // Pages that serve real-time data and MUST never be statically cached
 const REAL_TIME_ROUTES = ['dashboard','billing','customers','reports'];

 const pageFiles = ctx.files.filter(
 f => path.basename(f.path) ==='page.tsx'&& f.path.includes(path.sep +'app'+ path.sep),
 );

 for (const page of pageFiles) {
 const routeName = path.basename(path.dirname(page.path));
 if (!REAL_TIME_ROUTES.includes(routeName)) continue;

 const src = this.readFile(page.path);
 if (src.includes("export const dynamic")) continue;

 findings.push(this.finding({
 category: FindingCategory.BEST_PRACTICES,
 severity: Severity.MEDIUM,
 title:`Missing \`export const dynamic\`in Real-Time Page: \`${routeName}/page.tsx\``,
 description:
`\`${routeName}/page.tsx\`serves live financial data but does not declare \`export const dynamic\`.`+
'Without this, Next.js may statically cache the page at build time, serving stale data to users until the next deployment.',
 location: page.path,
 impact: { score: 6, description:'Stale financial data served from static cache.'},
 effort: { hours: 0.25, complexity:'trivial'},
 recommendation: {
 action:`Add \`export const dynamic ='force-dynamic';\`to \`${routeName}/page.tsx\`.`,
 steps: [
`Open \`src/app/${routeName}/page.tsx\``,
"Add`export const dynamic ='force-dynamic';`at the top (after imports)",
 ],
 codeExample: {
 before:`import { getDashboardData } from'@/lib/actions';
export default async function DashboardPage() { ... }`,
 after:`import { getDashboardData } from'@/lib/actions';
export const dynamic ='force-dynamic';
export default async function DashboardPage() { ... }`,
 },
 testingStrategy:'Verify the page is not cached in`next build`output (should show ƒ symbol, not ○).',
 rollbackPlan:"Remove`export const dynamic ='force-dynamic'`.",
 successCriteria: ['All real-time data pages are server-rendered on every request'],
 },
 }));
 }

 return findings;
 }
}
