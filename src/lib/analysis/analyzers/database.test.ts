import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'path';
import { DatabaseAnalyzer } from './database';
import { AnalysisContext, FileMetadata, FileType, FindingCategory, Severity } from '../types';

function makeContext(overrides: Partial<AnalysisContext> = {}): AnalysisContext {
  return { projectRoot: '/project', files: [], dependencyGraph: { nodes: new Map(), edges: new Map() }, packageJson: {}, tsConfig: {}, ...overrides };
}

function makeFile(path: string, overrides: Partial<FileMetadata> = {}): FileMetadata {
  return { path, size: 1024, type: FileType.SOURCE, lastModified: new Date(), isReferenced: true, referencedBy: [], ...overrides };
}

describe('DatabaseAnalyzer', () => {
  let analyzer: DatabaseAnalyzer;

  beforeEach(() => {
    analyzer = new DatabaseAnalyzer();
    vi.spyOn(analyzer as any, 'readFile').mockReturnValue('');
  });

  it('should have correct name and category', () => {
    expect(analyzer.name).toBe('DatabaseAnalyzer');
    expect(analyzer.category).toBe(FindingCategory.DATABASE);
  });

  describe('String interpolation in SQL', () => {
    it('should flag template literals in pool.query', async () => {
      (analyzer as any).readFile.mockReturnValue('pool.' + 'query(`SELECT * FROM users WHERE id = ${id}`);');
      const ctx = makeContext({ files: [makeFile(path.join('project', 'src', 'app', 'actions', 'user.ts'))] });
      const findings = await analyzer.analyze(ctx);
      expect(findings.some(f => f.title.includes('Potential SQL Injection'))).toBe(true);
    });
  });

  describe('Missing transactions', () => {
    it('should flag multi-step DB operations without transactions', async () => {
      (analyzer as any).readFile.mockReturnValue('await pool.query("INSERT..."); await pool.query("UPDATE...");');
      const ctx = makeContext({ files: [makeFile(path.join('project', 'src', 'app', 'actions', 'user.ts'))] });
      const findings = await analyzer.analyze(ctx);
      expect(findings.some(f => f.title.includes('Without Transaction'))).toBe(true);
    });
  });

  describe('Unhandled MV refresh', () => {
    it('should flag MV refresh without error handling', async () => {
      (analyzer as any).readFile.mockReturnValue('await pool.query("REFRESH MATERIALIZED VIEW CONCURRENTLY mv_test");');
      const ctx = makeContext({ files: [makeFile(path.join('project', 'src', 'app', 'api', 'cron', 'route.ts'))] });
      const findings = await analyzer.analyze(ctx);
      expect(findings.some(f => f.title.includes('Unhandled Error in MV Refresh'))).toBe(true);
    });
  });

  describe('N+1 query patterns', () => {
    it('should flag pool.query inside loops', async () => {
      (analyzer as any).readFile.mockReturnValue('ids.forEach(async (id) => { await pool.query("SELECT * FROM users WHERE id=$1", [id]); });');
      const ctx = makeContext({ files: [makeFile(path.join('project', 'src', 'app', 'actions', 'user.ts'))] });
      const findings = await analyzer.analyze(ctx);
      expect(findings.some(f => f.title.includes('Potential N+1 Query Pattern'))).toBe(true);
    });
  });
});
