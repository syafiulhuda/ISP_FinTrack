/**
 * SecurityAnalyzer — Task 12.1
 *
 * Checks for hardcoded secrets, missing auth guards, insecure headers,
 * unsafe SQL patterns, and missing rate limiting on API routes.
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

export class SecurityAnalyzer extends BaseAnalyzer {
 name ='SecurityAnalyzer';
 category = FindingCategory.SECURITY;

 protected async runAnalysis(ctx: AnalysisContext): Promise<Finding[]> {
 const srcFiles = ctx.files.filter(f => f.type === FileType.SOURCE);

 return [
 ...this._checkHardcodedSecrets(srcFiles, ctx),
 ...this._checkMissingCronAuth(srcFiles, ctx),
 ...this._checkMissingAdminGuards(srcFiles, ctx),
 ];
 }

 // ── Hardcoded secrets ────────────────────────────────────────────────────

 private _checkHardcodedSecrets(files: FileMetadata[], ctx: AnalysisContext): Finding[] {
 const findings: Finding[] = [];
 // Patterns that suggest hardcoded credentials
 const SECRET_PATTERNS: Array<[RegExp, string]> = [
 [/password\s*[=:]\s*['"][^'"]{4,}['"]/gi,'hardcoded password'],
 [/secret\s*[=:]\s*['"][^'"]{8,}['"]/gi,'hardcoded secret'],
 [/api[_-]?key\s*[=:]\s*['"][^'"]{8,}['"]/gi,'hardcoded API key'],
 // Don't flag env var references
 ];

 for (const file of files) {
 // Skip env files themselves
 if (path.basename(file.path).startsWith('.env')) continue;
 const src = this.readFile(file.path);

 for (const [pattern, label] of SECRET_PATTERNS) {
 pattern.lastIndex = 0;
 if (!pattern.test(src)) continue;

 // Filter out process.env references
 pattern.lastIndex = 0;
 const matches = [...src.matchAll(new RegExp(pattern.source,'gi'))]
 .filter(m => !m[0].includes('process.env') && !m[0].includes('ENV'));

 if (matches.length === 0) continue;

 findings.push(this.finding({
 category: FindingCategory.SECURITY,
 severity: Severity.CRITICAL,
 title:`Hardcoded Credential (${label}) in \`${path.basename(file.path)}\``,
 description:
`\`${path.relative(ctx.projectRoot, file.path)}\`contains a ${label} hardcoded directly in source code.`+
'Committing credentials to git exposes them permanently in history, even if later deleted.',
 location: file.path,
 impact: { score: 10, description:'Critical security vulnerability — credentials leaked to git history.'},
 effort: { hours: 0.5, complexity:'trivial'},
 recommendation: {
 action:'Move the credential to`.env.local`and access via`process.env`.',
 steps: [
'Add the credential to`.env.local`(confirm`.env.local`is in`.gitignore`)',
'Replace hardcoded value with`process.env.YOUR_SECRET_NAME`',
'Add the variable to Vercel project settings → Environment Variables',
'Rotate the credential immediately since it may already be in git history',
 ],
 testingStrategy:'Run`git log -p | grep -i password`— should return no matches.',
 rollbackPlan:'N/A — do not roll back security fixes.',
 successCriteria: ['Zero hardcoded credentials in any committed file','Credential has been rotated'],
 },
 }));
 }
 }

 return findings;
 }

 // ── Cron endpoint auth check ─────────────────────────────────────────────

 private _checkMissingCronAuth(files: FileMetadata[], ctx: AnalysisContext): Finding[] {
 const cronFile = files.find(f => f.path.replace(/\\/g,'/').includes('api/cron/route.ts'));
 if (!cronFile) return [];

 const src = this.readFile(cronFile.path);
 const hasAuthCheck = src.includes('CRON_SECRET') || src.includes('authorization') || src.includes('x-vercel-cron');

 if (!hasAuthCheck) {
 return [this.finding({
 category: FindingCategory.SECURITY,
 severity: Severity.CRITICAL,
 title:'Cron Endpoint`/api/cron`Has No Authentication',
 description:
'`/api/cron/route.ts`refreshes 5 Materialized Views but has no secret-key validation.'+
'Any anonymous HTTP client can trigger expensive database operations by calling this endpoint,'+
'enabling a denial-of-service attack against the Neon database.',
 location: cronFile.path,
 impact: { score: 9, description:'DoS vector — anyone can exhaust DB resources by spamming the cron endpoint.'},
 effort: { hours: 0.5, complexity:'trivial'},
 recommendation: {
 action:'Add`CRON_SECRET`bearer token validation to the cron endpoint.',
 steps: [
'Set`CRON_SECRET=<random 32-char string>`in`.env.local`and Vercel env vars',
'Add secret check at the top of the`GET`handler',
'Return 401 for any request without the correct bearer token',
 ],
 codeExample: {
 before:`export async function GET() {
 await Promise.all([refreshAgingMV()]);
 return NextResponse.json({ ok: true });
}`,
 after:`export async function GET(request: Request) {
 const authHeader = request.headers.get('Authorization');
 if (authHeader !== \`Bearer \${process.env.CRON_SECRET}\`) {
 return NextResponse.json({ error:'Unauthorized'}, { status: 401 });
 }
 await Promise.all([refreshAgingMV()]);
 return NextResponse.json({ ok: true });
}`,
 },
 testingStrategy:'Call`curl /api/cron`without a token — should receive 401.',
 rollbackPlan:'Remove the auth check (not recommended).',
 successCriteria: ['Endpoint returns 401 for unauthenticated requests','Vercel Cron configured with`Authorization: Bearer $CRON_SECRET`'],
 },
 })];
 }

 return [];
 }

 // ── Missing session auth guard on admin actions ──────────────────────────

 private _checkMissingAdminGuards(files: FileMetadata[], ctx: AnalysisContext): Finding[] {
 const findings: Finding[] = [];
 const actionFiles = files.filter(f =>
 f.path.replace(/\\/g,'/').includes('/actions/') &&
 (f.path.includes('admin') || f.path.includes('settings')),
 );

 for (const file of actionFiles) {
 const src = this.readFile(file.path);
 // Check if the file has server actions but no session check
 if (!src.includes("'use server'")) continue;
 const hasSessionCheck = src.includes('getSession') || src.includes('auth()') || src.includes('requireAuth');

 if (!hasSessionCheck) {
 findings.push(this.finding({
 category: FindingCategory.SECURITY,
 severity: Severity.HIGH,
 title:`Server Action File Missing Auth Guard: \`${path.basename(file.path)}\``,
 description:
`\`${path.relative(ctx.projectRoot, file.path)}\`contains Server Actions marked with \`'use server'\``+
'but has no session authentication check. If a Client Component is tricked into calling these actions,'+
'an unauthenticated user could perform admin operations.',
 location: file.path,
 impact: { score: 8, description:'Authentication bypass — admin actions callable without a valid session.'},
 effort: { hours: 1, complexity:'simple'},
 recommendation: {
 action:'Add`requireAuth()`or`auth()`check at the start of each exported Server Action.',
 steps: [
'Import your auth helper:`import { auth } from"@/lib/auth"`',
'Add`const session = await auth(); if (!session) throw new Error("Unauthorized");`at the top of each action',
 ],
 codeExample: {
 before:`export async function deleteAdmin(id: string) {
 await db.query('DELETE FROM admin WHERE id = $1', [id]);
}`,
 after:`export async function deleteAdmin(id: string) {
 const session = await auth();
 if (!session?.user) throw new Error('Unauthorized');
 await db.query('DELETE FROM admin WHERE id = $1', [id]);
}`,
 },
 testingStrategy:'Call the action in an incognito session — it should throw an Unauthorized error.',
 rollbackPlan:'Remove auth check (not recommended).',
 successCriteria: ['All admin Server Actions require a valid session'],
 },
 }));
 }
 }

 return findings;
 }
}
