/**
 * PerformanceAnalyzer unit tests — Task 9.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PerformanceAnalyzer } from './performance';
import { AnalysisContext, FileMetadata, FileType, FindingCategory, Severity } from '../types';

function makeContext(overrides: Partial<AnalysisContext> = {}): AnalysisContext {
  return { projectRoot: '/project', files: [], dependencyGraph: { nodes: new Map(), edges: new Map() }, packageJson: {}, tsConfig: {}, ...overrides };
}

function makeFile(path: string, overrides: Partial<FileMetadata> = {}): FileMetadata {
  return { path, size: 1024, type: FileType.SOURCE, lastModified: new Date(), isReferenced: true, referencedBy: [], ...overrides };
}

describe('PerformanceAnalyzer', () => {
  let analyzer: PerformanceAnalyzer;

  beforeEach(() => {
    analyzer = new PerformanceAnalyzer();
    vi.spyOn(analyzer as any, 'readFile').mockReturnValue('');
  });

  it('should have correct name and category', () => {
    expect(analyzer.name).toBe('PerformanceAnalyzer');
    expect(analyzer.category).toBe(FindingCategory.PERFORMANCE);
  });

  describe('instrumentation cold-start check', () => {
    it('should flag MV refresh placed before the Vercel guard', async () => {
      (analyzer as any).readFile.mockReturnValue(
        'refreshAgingMV().catch(console.error);\nif (process.env.VERCEL !== "1") { cron.schedule(); }'
      );
      const ctx = makeContext({ files: [makeFile('/project/src/instrumentation.ts')] });
      const findings = await analyzer.analyze(ctx);
      expect(findings.some(f => f.title.includes('Cold Start'))).toBe(true);
      expect(findings.find(f => f.title.includes('Cold Start'))?.severity).toBe(Severity.CRITICAL);
    });

    it('should NOT flag when MV refresh is inside the Vercel guard', async () => {
      (analyzer as any).readFile.mockReturnValue(
        'pool.query("SELECT 1").catch();\nif (process.env.VERCEL !== "1") { refreshAgingMV().catch(); }'
      );
      const ctx = makeContext({ files: [makeFile('/project/src/instrumentation.ts')] });
      const findings = await analyzer.analyze(ctx);
      expect(findings.some(f => f.title.includes('Cold Start'))).toBe(false);
    });

    it('should return no findings when instrumentation.ts is absent', async () => {
      const findings = await analyzer.analyze(makeContext({ files: [] }));
      expect(findings.some(f => f.title.includes('Cold Start'))).toBe(false);
    });
  });

  describe('cron endpoint completeness', () => {
    it('should flag when cron route is missing MVs', async () => {
      (analyzer as any).readFile.mockReturnValue('await Promise.all([refreshAgingMV(), refreshPredictions()]);');
      const ctx = makeContext({ files: [makeFile('/project/src/app/api/cron/route.ts')] });
      const findings = await analyzer.analyze(ctx);
      expect(findings.some(f => f.title.includes('Materialized Views'))).toBe(true);
      expect(findings.find(f => f.title.includes('Materialized Views'))?.severity).toBe(Severity.HIGH);
    });

    it('should NOT flag when all 5 MVs are present', async () => {
      (analyzer as any).readFile.mockReturnValue(
        'refreshAgingMV(); refreshPredictions(); refreshDashboardMV(); refreshProfitabilityMV(); refreshExecutiveMV();'
      );
      const ctx = makeContext({ files: [makeFile('/project/src/app/api/cron/route.ts')] });
      const findings = await analyzer.analyze(ctx);
      expect(findings.some(f => f.title.includes('Materialized Views'))).toBe(false);
    });

    it('should list missing MV names in description', async () => {
      (analyzer as any).readFile.mockReturnValue('await refreshAgingMV();');
      const ctx = makeContext({ files: [makeFile('/project/src/app/api/cron/route.ts')] });
      const findings = await analyzer.analyze(ctx);
      const f = findings.find(f => f.title.includes('Materialized Views'));
      expect(f?.description).toContain('refreshDashboardMV');
      expect(f?.description).toContain('refreshProfitabilityMV');
      expect(f?.description).toContain('refreshExecutiveMV');
    });

    it('should return no findings when cron route is absent', async () => {
      const findings = await analyzer.analyze(makeContext({ files: [] }));
      expect(findings.some(f => f.title.includes('Materialized Views'))).toBe(false);
    });
  });

  describe('DB pool size check', () => {
    it('should flag unconditional max:10 pool config', async () => {
      (analyzer as any).readFile.mockReturnValue('const poolConfig: any = { max: 10 };');
      const ctx = makeContext({ files: [makeFile('/project/src/lib/db.ts')] });
      const findings = await analyzer.analyze(ctx);
      expect(findings.some(f => f.title.includes('Pool Size'))).toBe(true);
      expect(findings.find(f => f.title.includes('Pool Size'))?.severity).toBe(Severity.HIGH);
    });

    it('should NOT flag when adaptive pool is configured', async () => {
      (analyzer as any).readFile.mockReturnValue(
        "const isServerless = process.env.VERCEL === '1'; const cfg = { max: isServerless ? 2 : 10 };"
      );
      const ctx = makeContext({ files: [makeFile('/project/src/lib/db.ts')] });
      const findings = await analyzer.analyze(ctx);
      expect(findings.some(f => f.title.includes('Pool Size'))).toBe(false);
    });

    it('should return no findings when db.ts is absent', async () => {
      const findings = await analyzer.analyze(makeContext({ files: [] }));
      expect(findings.some(f => f.title.includes('Pool Size'))).toBe(false);
    });
  });

  describe('heavy dependency detection', () => {
    it('should flag tesseract.js', async () => {
      const ctx = makeContext({ packageJson: { dependencies: { 'tesseract.js': '^4.0.0' } } });
      const findings = await analyzer.analyze(ctx);
      expect(findings.some(f => f.title.includes('tesseract.js'))).toBe(true);
    });

    it('should flag html2canvas', async () => {
      const ctx = makeContext({ packageJson: { dependencies: { html2canvas: '^1.4.0' } } });
      expect((await analyzer.analyze(ctx)).some(f => f.title.includes('html2canvas'))).toBe(true);
    });

    it('should flag xlsx', async () => {
      const ctx = makeContext({ packageJson: { dependencies: { xlsx: '^0.18.0' } } });
      expect((await analyzer.analyze(ctx)).some(f => f.title.includes('xlsx'))).toBe(true);
    });

    it('should flag all three heavy deps independently', async () => {
      const ctx = makeContext({ packageJson: { dependencies: { 'tesseract.js': '^4', html2canvas: '^1', xlsx: '^0' } } });
      const findings = await analyzer.analyze(ctx);
      expect(findings.filter(f => f.title.includes('Heavy Dependency'))).toHaveLength(3);
    });

    it('should also check devDependencies', async () => {
      const ctx = makeContext({ packageJson: { devDependencies: { xlsx: '^0.18.0' } } });
      expect((await analyzer.analyze(ctx)).some(f => f.title.includes('xlsx'))).toBe(true);
    });

    it('should NOT flag absent packages', async () => {
      const ctx = makeContext({ packageJson: { dependencies: {} } });
      expect((await analyzer.analyze(ctx)).filter(f => f.title.includes('Heavy Dependency'))).toHaveLength(0);
    });
  });

  describe('TypeScript ignoreBuildErrors check', () => {
    it('should flag ignoreBuildErrors: true in next.config.ts', async () => {
      (analyzer as any).readFile.mockReturnValue('typescript: { ignoreBuildErrors: true }');
      const ctx = makeContext({ files: [makeFile('/project/next.config.ts')] });
      const findings = await analyzer.analyze(ctx);
      expect(findings.some(f => f.title.includes('ignoreBuildErrors'))).toBe(true);
      expect(findings.find(f => f.title.includes('ignoreBuildErrors'))?.severity).toBe(Severity.HIGH);
    });

    it('should NOT flag when ignoreBuildErrors is absent', async () => {
      (analyzer as any).readFile.mockReturnValue('const nextConfig = {};');
      const ctx = makeContext({ files: [makeFile('/project/next.config.ts')] });
      expect((await analyzer.analyze(ctx)).some(f => f.title.includes('ignoreBuildErrors'))).toBe(false);
    });

    it('should detect the issue in next.config.js too', async () => {
      (analyzer as any).readFile.mockReturnValue('typescript: { ignoreBuildErrors: true }');
      const ctx = makeContext({ files: [makeFile('/project/next.config.js')] });
      expect((await analyzer.analyze(ctx)).some(f => f.title.includes('ignoreBuildErrors'))).toBe(true);
    });
  });
});
