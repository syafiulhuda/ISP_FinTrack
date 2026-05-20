/**
 * SecurityAnalyzer unit tests — Task 12.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SecurityAnalyzer } from './security';
import { AnalysisContext, FileMetadata, FileType, FindingCategory, Severity } from '../types';

function makeContext(overrides: Partial<AnalysisContext> = {}): AnalysisContext {
  return { projectRoot: '/project', files: [], dependencyGraph: { nodes: new Map(), edges: new Map() }, packageJson: {}, tsConfig: {}, ...overrides };
}

function makeFile(path: string, overrides: Partial<FileMetadata> = {}): FileMetadata {
  return { path, size: 1024, type: FileType.SOURCE, lastModified: new Date(), isReferenced: true, referencedBy: [], ...overrides };
}

describe('SecurityAnalyzer', () => {
  let analyzer: SecurityAnalyzer;

  beforeEach(() => {
    analyzer = new SecurityAnalyzer();
    vi.spyOn(analyzer as any, 'readFile').mockReturnValue('');
  });

  it('should have correct name and category', () => {
    expect(analyzer.name).toBe('SecurityAnalyzer');
    expect(analyzer.category).toBe(FindingCategory.SECURITY);
  });

  // ── Hardcoded secrets ──────────────────────────────────────────────────────

  describe('hardcoded secrets detection', () => {
    it('should flag hardcoded password in source file', async () => {
      (analyzer as any).readFile.mockReturnValue("const pass" + "word = 'super_secret_123';");
      const ctx = makeContext({ files: [makeFile('/project/src/lib/auth.ts')] });
      const findings = await analyzer.analyze(ctx);
      expect(findings.some(f => f.title.includes('hardcoded password'))).toBe(true);
      expect(findings.find(f => f.title.includes('hardcoded password'))?.severity).toBe(Severity.CRITICAL);
    });

    it('should flag hardcoded API key', async () => {
      (analyzer as any).readFile.mockReturnValue("const api" + "_key = 'sk-abcdefghij1234';");
      const ctx = makeContext({ files: [makeFile('/project/src/lib/stripe.ts')] });
      const findings = await analyzer.analyze(ctx);
      expect(findings.some(f => f.title.includes('hardcoded API key') || f.title.includes('Hardcoded'))).toBe(true);
    });

    it('should flag hardcoded secret value', async () => {
      (analyzer as any).readFile.mockReturnValue("const sec" + "ret = 'my-super-secret-value';");
      const ctx = makeContext({ files: [makeFile('/project/src/lib/config.ts')] });
      const findings = await analyzer.analyze(ctx);
      expect(findings.some(f => f.title.includes('Hardcoded'))).toBe(true);
    });

    it('should NOT flag process.env references', async () => {
      (analyzer as any).readFile.mockReturnValue("const pass" + "word = process.env.DB_PASSWORD;");
      const ctx = makeContext({ files: [makeFile('/project/src/lib/db.ts')] });
      const findings = await analyzer.analyze(ctx);
      expect(findings.filter(f => f.title.includes('Hardcoded'))).toHaveLength(0);
    });

    it('should NOT flag files that start with .env', async () => {
      (analyzer as any).readFile.mockReturnValue("pass" + "word='my_real_password'");
      const ctx = makeContext({ files: [makeFile('/project/.env.local')] });
      const findings = await analyzer.analyze(ctx);
      expect(findings.filter(f => f.title.includes('Hardcoded'))).toHaveLength(0);
    });

    it('should NOT flag short values (under threshold length)', async () => {
      // password pattern requires 4+ chars, api_key requires 8+
      (analyzer as any).readFile.mockReturnValue("const pass" + "word = 'abc';");
      const ctx = makeContext({ files: [makeFile('/project/src/lib/auth.ts')] });
      const findings = await analyzer.analyze(ctx);
      expect(findings.filter(f => f.title.includes('Hardcoded'))).toHaveLength(0);
    });
  });

  // ── Cron endpoint auth ─────────────────────────────────────────────────────

  describe('cron endpoint authentication', () => {
    it('should flag cron route with no auth check', async () => {
      (analyzer as any).readFile.mockReturnValue(
        "export async function GET() { await refreshAgingMV(); return NextResponse.json({ ok: true }); }"
      );
      const ctx = makeContext({ files: [makeFile('/project/src/app/api/cron/route.ts')] });
      const findings = await analyzer.analyze(ctx);
      expect(findings.some(f => f.title.includes('No Authentication'))).toBe(true);
      expect(findings.find(f => f.title.includes('No Authentication'))?.severity).toBe(Severity.CRITICAL);
    });

    it('should NOT flag cron route that checks CRON_SECRET', async () => {
      (analyzer as any).readFile.mockReturnValue(
        "if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) return 401;"
      );
      const ctx = makeContext({ files: [makeFile('/project/src/app/api/cron/route.ts')] });
      const findings = await analyzer.analyze(ctx);
      expect(findings.some(f => f.title.includes('No Authentication'))).toBe(false);
    });

    it('should NOT flag cron route that checks x-vercel-cron header', async () => {
      (analyzer as any).readFile.mockReturnValue(
        "const header = req.headers.get('x-vercel-cron');"
      );
      const ctx = makeContext({ files: [makeFile('/project/src/app/api/cron/route.ts')] });
      const findings = await analyzer.analyze(ctx);
      expect(findings.some(f => f.title.includes('No Authentication'))).toBe(false);
    });

    it('should NOT flag cron route that checks authorization header', async () => {
      (analyzer as any).readFile.mockReturnValue("const authHeader = req.headers.get('authorization');");
      const ctx = makeContext({ files: [makeFile('/project/src/app/api/cron/route.ts')] });
      const findings = await analyzer.analyze(ctx);
      expect(findings.some(f => f.title.includes('No Authentication'))).toBe(false);
    });

    it('should return no findings when cron route file is absent', async () => {
      const findings = await analyzer.analyze(makeContext({ files: [] }));
      expect(findings.some(f => f.title.includes('No Authentication'))).toBe(false);
    });
  });

  // ── Missing admin auth guards ──────────────────────────────────────────────

  describe('missing admin auth guards', () => {
    it('should flag admin server action without session check', async () => {
      (analyzer as any).readFile.mockReturnValue(
        "'use server'\nexport async function deleteAdmin(id: string) { await db.query(...); }"
      );
      const ctx = makeContext({
        files: [makeFile('/project/src/app/admin/settings/actions/delete.ts')],
      });
      const findings = await analyzer.analyze(ctx);
      expect(findings.some(f => f.title.includes('Missing Auth Guard'))).toBe(true);
      expect(findings.find(f => f.title.includes('Missing Auth Guard'))?.severity).toBe(Severity.HIGH);
    });

    it('should NOT flag when getSession is present', async () => {
      (analyzer as any).readFile.mockReturnValue(
        "'use server'\nexport async function deleteAdmin(id) { const s = await getSession(); if (!s) throw Error(); }"
      );
      const ctx = makeContext({
        files: [makeFile('/project/src/app/admin/settings/actions/delete.ts')],
      });
      const findings = await analyzer.analyze(ctx);
      expect(findings.some(f => f.title.includes('Missing Auth Guard'))).toBe(false);
    });

    it('should NOT flag when auth() is present', async () => {
      (analyzer as any).readFile.mockReturnValue(
        "'use server'\nexport async function deleteAdmin(id) { const session = await auth(); }"
      );
      const ctx = makeContext({
        files: [makeFile('/project/src/app/admin/settings/actions/delete.ts')],
      });
      const findings = await analyzer.analyze(ctx);
      expect(findings.some(f => f.title.includes('Missing Auth Guard'))).toBe(false);
    });

    it('should NOT flag when requireAuth is present', async () => {
      (analyzer as any).readFile.mockReturnValue(
        "'use server'\nexport async function deleteAdmin(id) { await requireAuth(); }"
      );
      const ctx = makeContext({
        files: [makeFile('/project/src/app/admin/settings/actions/delete.ts')],
      });
      const findings = await analyzer.analyze(ctx);
      expect(findings.some(f => f.title.includes('Missing Auth Guard'))).toBe(false);
    });

    it('should NOT flag non-actions files', async () => {
      (analyzer as any).readFile.mockReturnValue(
        "'use server'\nexport async function riskyFn() { await db.query(...); }"
      );
      const ctx = makeContext({
        files: [makeFile('/project/src/lib/helpers/admin-utils.ts')],
      });
      const findings = await analyzer.analyze(ctx);
      expect(findings.some(f => f.title.includes('Missing Auth Guard'))).toBe(false);
    });

    it('should NOT flag files without use server directive', async () => {
      (analyzer as any).readFile.mockReturnValue(
        "export async function deleteAdmin(id: string) { await db.query(...); }"
      );
      const ctx = makeContext({
        files: [makeFile('/project/src/app/admin/settings/actions/delete.ts')],
      });
      const findings = await analyzer.analyze(ctx);
      expect(findings.some(f => f.title.includes('Missing Auth Guard'))).toBe(false);
    });
  });
});
