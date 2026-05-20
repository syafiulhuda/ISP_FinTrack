/**
 * CodeQualityAnalyzer unit tests — Task 11.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CodeQualityAnalyzer } from './code-quality';
import { AnalysisContext, FileMetadata, FileType, FindingCategory, Severity } from '../types';
import path from 'path';

function makeContext(overrides: Partial<AnalysisContext> = {}): AnalysisContext {
  return { projectRoot: '/project', files: [], dependencyGraph: { nodes: new Map(), edges: new Map() }, packageJson: {}, tsConfig: {}, ...overrides };
}

function makeFile(filePath: string, overrides: Partial<FileMetadata> = {}): FileMetadata {
  return { path: filePath, size: 1024, type: FileType.SOURCE, lastModified: new Date(), isReferenced: true, referencedBy: [], ...overrides };
}

describe('CodeQualityAnalyzer', () => {
  let analyzer: CodeQualityAnalyzer;

  beforeEach(() => {
    analyzer = new CodeQualityAnalyzer();
    vi.spyOn(analyzer as any, 'readFile').mockReturnValue('');
  });

  it('should have correct name and category', () => {
    expect(analyzer.name).toBe('CodeQualityAnalyzer');
    expect(analyzer.category).toBe(FindingCategory.CODE_QUALITY);
  });

  // ── Excessive `any` usage ──────────────────────────────────────────────────

  describe('excessive any detection', () => {
    it('should flag files with 5+ any annotations', async () => {
      const src = ': any\n'.repeat(5);
      (analyzer as any).readFile.mockReturnValue(src);
      const ctx = makeContext({ files: [makeFile('/project/src/lib/data.ts')] });
      const findings = await analyzer.analyze(ctx);
      expect(findings.some(f => f.title.includes('`any`'))).toBe(true);
    });

    it('should NOT flag files with fewer than 5 any usages', async () => {
      const src = ': any\n'.repeat(4);
      (analyzer as any).readFile.mockReturnValue(src);
      const ctx = makeContext({ files: [makeFile('/project/src/lib/data.ts')] });
      const findings = await analyzer.analyze(ctx);
      expect(findings.some(f => f.title.includes('`any`'))).toBe(false);
    });

    it('should assign HIGH severity when count > 15', async () => {
      const src = ': any\n'.repeat(16);
      (analyzer as any).readFile.mockReturnValue(src);
      const ctx = makeContext({ files: [makeFile('/project/src/lib/data.ts')] });
      const findings = await analyzer.analyze(ctx);
      const f = findings.find(f => f.title.includes('`any`'));
      expect(f?.severity).toBe(Severity.HIGH);
    });

    it('should assign MEDIUM severity when count is 5–15', async () => {
      const src = ': any\n'.repeat(8);
      (analyzer as any).readFile.mockReturnValue(src);
      const ctx = makeContext({ files: [makeFile('/project/src/lib/data.ts')] });
      const findings = await analyzer.analyze(ctx);
      const f = findings.find(f => f.title.includes('`any`'));
      expect(f?.severity).toBe(Severity.MEDIUM);
    });

    it('should report occurrence count in finding title', async () => {
      const src = ': any\n'.repeat(7);
      (analyzer as any).readFile.mockReturnValue(src);
      const ctx = makeContext({ files: [makeFile('/project/src/lib/data.ts')] });
      const findings = await analyzer.analyze(ctx);
      const f = findings.find(f => f.title.includes('`any`'));
      expect(f?.title).toContain('7');
    });

    it('should only analyze .ts and .tsx files', async () => {
      (analyzer as any).readFile.mockReturnValue(': any\n'.repeat(10));
      const ctx = makeContext({
        files: [makeFile('/project/src/lib/data.js')],
      });
      const findings = await analyzer.analyze(ctx);
      expect(findings.some(f => f.title.includes('`any`'))).toBe(false);
    });
  });

  // ── console.log in production code ─────────────────────────────────────────

  describe('console.log detection', () => {
    it('should flag files containing console.log', async () => {
      (analyzer as any).readFile.mockReturnValue('console.log("hello world");');
      const ctx = makeContext({ files: [makeFile('/project/src/app/page.tsx')] });
      const findings = await analyzer.analyze(ctx);
      expect(findings.some(f => f.title.includes('console.log'))).toBe(true);
      expect(findings.find(f => f.title.includes('console.log'))?.severity).toBe(Severity.MEDIUM);
    });

    it('should flag console.debug', async () => {
      (analyzer as any).readFile.mockReturnValue('console.debug("state:", state);');
      const ctx = makeContext({ files: [makeFile('/project/src/app/dashboard/page.tsx')] });
      const findings = await analyzer.analyze(ctx);
      expect(findings.some(f => f.title.includes('console.log'))).toBe(true);
    });

    it('should NOT flag instrumentation.ts (startup logs are intentional)', async () => {
      (analyzer as any).readFile.mockReturnValue('console.log("Server started");');
      const ctx = makeContext({ files: [makeFile('/project/src/instrumentation.ts')] });
      const findings = await analyzer.analyze(ctx);
      expect(findings.some(f => f.title.includes('console.log'))).toBe(false);
    });

    it('should NOT flag files without console calls', async () => {
      (analyzer as any).readFile.mockReturnValue('export const x = 42;');
      const ctx = makeContext({ files: [makeFile('/project/src/app/page.tsx')] });
      const findings = await analyzer.analyze(ctx);
      expect(findings.some(f => f.title.includes('console.log'))).toBe(false);
    });

    it('should group all offending files into one finding', async () => {
      (analyzer as any).readFile.mockReturnValue('console.log("x");');
      const ctx = makeContext({
        files: [
          makeFile('/project/src/app/a.tsx'),
          makeFile('/project/src/app/b.tsx'),
          makeFile('/project/src/app/c.tsx'),
        ],
      });
      const findings = await analyzer.analyze(ctx);
      const consoleLogs = findings.filter(f => f.title.includes('console.log'));
      expect(consoleLogs).toHaveLength(1);
      expect(consoleLogs[0].title).toContain('3');
    });
  });

  // ── Fake setTimeout UX delays ──────────────────────────────────────────────

  describe('fake setTimeout detection', () => {
    it('should flag setTimeout used to fake a Saving state', async () => {
      const src = `
        const handleSave = () => {
          setIsSaving(true);
          setTimeout(() => {
            updateSettings(formData);
            setIsSaving(false);
          }, 1200);
        };
      `;
      (analyzer as any).readFile.mockReturnValue(src);
      const ctx = makeContext({ files: [makeFile('/project/src/app/settings/page.tsx')] });
      const findings = await analyzer.analyze(ctx);
      expect(findings.some(f => f.title.includes('Fake'))).toBe(true);
      expect(findings.find(f => f.title.includes('Fake'))?.severity).toBe(Severity.MEDIUM);
    });

    it('should flag setTimeout with setIsLoading pattern', async () => {
      const src = `setTimeout(() => { setIsLoading(false); }, 800);`;
      (analyzer as any).readFile.mockReturnValue(src);
      const ctx = makeContext({ files: [makeFile('/project/src/app/page.tsx')] });
      const findings = await analyzer.analyze(ctx);
      expect(findings.some(f => f.title.includes('Fake'))).toBe(true);
    });

    it('should NOT flag legitimate async operations with setTimeout', async () => {
      (analyzer as any).readFile.mockReturnValue(
        'setTimeout(() => { checkHealth(); }, 5000);'
      );
      const ctx = makeContext({ files: [makeFile('/project/src/app/page.tsx')] });
      const findings = await analyzer.analyze(ctx);
      expect(findings.some(f => f.title.includes('Fake'))).toBe(false);
    });

    it('should NOT flag files without setTimeout', async () => {
      (analyzer as any).readFile.mockReturnValue('export const x = 42;');
      const ctx = makeContext({ files: [makeFile('/project/src/app/page.tsx')] });
      const findings = await analyzer.analyze(ctx);
      expect(findings.some(f => f.title.includes('Fake'))).toBe(false);
    });
  });

  // ── Untyped Server Action parameters ──────────────────────────────────────

  describe('untyped server action parameters', () => {
    it('should flag server actions with any-typed parameters', async () => {
      (analyzer as any).readFile.mockReturnValue(
        "'use server'\nexport async function createAdmin(data: any) { }"
      );
      const filePath = path.join('/project', 'src', 'app', 'admin', 'actions', 'create.ts');
      const ctx = makeContext({ files: [makeFile(filePath)] });
      const findings = await analyzer.analyze(ctx);
      expect(findings.some(f => f.title.includes('Untyped Parameters'))).toBe(true);
      expect(findings.find(f => f.title.includes('Untyped Parameters'))?.severity).toBe(Severity.MEDIUM);
    });

    it('should NOT flag actions with typed parameters', async () => {
      (analyzer as any).readFile.mockReturnValue(
        "'use server'\nexport async function createAdmin(data: CreateAdminInput) { }"
      );
      const filePath = path.join('/project', 'src', 'app', 'admin', 'actions', 'create.ts');
      const ctx = makeContext({ files: [makeFile(filePath)] });
      const findings = await analyzer.analyze(ctx);
      expect(findings.some(f => f.title.includes('Untyped Parameters'))).toBe(false);
    });

    it('should NOT flag non-actions files', async () => {
      (analyzer as any).readFile.mockReturnValue(
        "export function doSomething(x: any) { }"
      );
      const ctx = makeContext({ files: [makeFile('/project/src/lib/helpers.ts')] });
      const findings = await analyzer.analyze(ctx);
      expect(findings.some(f => f.title.includes('Untyped Parameters'))).toBe(false);
    });

    it('should NOT flag when no any in function signature', async () => {
      (analyzer as any).readFile.mockReturnValue(
        "'use server'\nconst x: any = {};\nexport async function createAdmin(data: CreateAdminInput) { }"
      );
      const filePath = path.join('/project', 'src', 'app', 'admin', 'actions', 'create.ts');
      const ctx = makeContext({ files: [makeFile(filePath)] });
      const findings = await analyzer.analyze(ctx);
      expect(findings.some(f => f.title.includes('Untyped Parameters'))).toBe(false);
    });
  });
});
