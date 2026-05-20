/**
 * StructureAnalyzer unit tests — Task 7.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StructureAnalyzer } from './structure';
import {
  AnalysisContext,
  FileMetadata,
  FileType,
  DependencyGraph,
  FileNode,
  FindingCategory,
  Severity,
} from '../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeContext(overrides: Partial<AnalysisContext> = {}): AnalysisContext {
  return {
    projectRoot: '/project',
    files: [],
    dependencyGraph: { nodes: new Map(), edges: new Map() },
    packageJson: {},
    tsConfig: {},
    ...overrides,
  };
}

function makeFile(path: string, overrides: Partial<FileMetadata> = {}): FileMetadata {
  return {
    path,
    size: 1024,
    type: FileType.SOURCE,
    lastModified: new Date(),
    isReferenced: true,
    referencedBy: [],
    ...overrides,
  };
}

function makeGraph(edgesArr: Array<{ from: string; to: string }>): DependencyGraph {
  const nodes = new Map<string, FileNode>();
  const edges = new Map<string, string[]>();
  for (const { from, to } of edgesArr) {
    if (!nodes.has(from)) nodes.set(from, { path: from, imports: [], importedBy: [] });
    if (!nodes.has(to))   nodes.set(to,   { path: to,   imports: [], importedBy: [] });
    nodes.get(from)!.imports.push(to);
    nodes.get(to)!.importedBy.push(from);
    if (!edges.has(from)) edges.set(from, []);
    edges.get(from)!.push(to);
  }
  return { nodes, edges };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('StructureAnalyzer', () => {
  let analyzer: StructureAnalyzer;

  beforeEach(() => {
    analyzer = new StructureAnalyzer();
    // Mock readFile so tests don't touch the real filesystem
    vi.spyOn(analyzer as any, 'readFile').mockReturnValue('');
  });

  it('should have correct name and category', () => {
    expect(analyzer.name).toBe('StructureAnalyzer');
    expect(analyzer.category).toBe(FindingCategory.STRUCTURE);
  });

  // ── Circular dependency detection ────────────────────────────────────────

  describe('circular dependency detection', () => {
    it('should return no findings for a linear dependency chain', async () => {
      const ctx = makeContext({
        dependencyGraph: makeGraph([
          { from: '/project/src/a.ts', to: '/project/src/b.ts' },
          { from: '/project/src/b.ts', to: '/project/src/c.ts' },
        ]),
      });
      const findings = await analyzer.analyze(ctx);
      const circular = findings.filter(f => f.title.includes('Circular'));
      expect(circular).toHaveLength(0);
    });

    it('should detect a direct circular dependency (A → B → A)', async () => {
      const a = '/project/src/a.ts';
      const b = '/project/src/b.ts';
      const nodes = new Map<string, FileNode>([
        [a, { path: a, imports: [b], importedBy: [b] }],
        [b, { path: b, imports: [a], importedBy: [a] }],
      ]);
      const ctx = makeContext({ dependencyGraph: { nodes, edges: new Map() } });
      const findings = await analyzer.analyze(ctx);
      const circular = findings.filter(f => f.title.includes('Circular'));
      expect(circular.length).toBeGreaterThan(0);
    });

    it('should detect a 3-node cycle (A → B → C → A)', async () => {
      const a = '/project/src/a.ts';
      const b = '/project/src/b.ts';
      const c = '/project/src/c.ts';
      const nodes = new Map<string, FileNode>([
        [a, { path: a, imports: [b], importedBy: [c] }],
        [b, { path: b, imports: [c], importedBy: [a] }],
        [c, { path: c, imports: [a], importedBy: [b] }],
      ]);
      const ctx = makeContext({ dependencyGraph: { nodes, edges: new Map() } });
      const findings = await analyzer.analyze(ctx);
      const circular = findings.filter(f => f.title.includes('Circular'));
      expect(circular.length).toBeGreaterThan(0);
      expect(circular[0].severity).toBe(Severity.HIGH);
    });

    it('should assign HIGH severity to circular dependency findings', async () => {
      const a = '/project/src/a.ts';
      const b = '/project/src/b.ts';
      const nodes = new Map<string, FileNode>([
        [a, { path: a, imports: [b], importedBy: [b] }],
        [b, { path: b, imports: [a], importedBy: [a] }],
      ]);
      const ctx = makeContext({ dependencyGraph: { nodes, edges: new Map() } });
      const findings = await analyzer.analyze(ctx);
      const circular = findings.find(f => f.title.includes('Circular'));
      expect(circular?.severity).toBe(Severity.HIGH);
    });
  });

  // ── Unused npm packages ───────────────────────────────────────────────────

  describe('unused npm dependencies', () => {
    it('should flag node-cron when not used in src/', async () => {
      (analyzer as any).readFile.mockReturnValue('// no cron usage here');
      const ctx = makeContext({
        files: [makeFile('/project/src/app/page.tsx')],
        packageJson: { dependencies: { 'node-cron': '^3.0.0' } },
      });
      const findings = await analyzer.analyze(ctx);
      const unused = findings.filter(f => f.title.includes('node-cron'));
      expect(unused.length).toBeGreaterThan(0);
    });

    it('should NOT flag node-cron when used in src/', async () => {
      (analyzer as any).readFile.mockReturnValue("import cron from 'node-cron';");
      const ctx = makeContext({
        files: [makeFile('/project/src/instrumentation.ts')],
        packageJson: { dependencies: { 'node-cron': '^3.0.0' } },
      });
      const findings = await analyzer.analyze(ctx);
      const unused = findings.filter(f => f.title.includes('node-cron'));
      expect(unused).toHaveLength(0);
    });

    it('should NOT flag packages not listed in package.json', async () => {
      const ctx = makeContext({
        packageJson: { dependencies: {} },
      });
      const findings = await analyzer.analyze(ctx);
      const unused = findings.filter(f => f.title.includes('node-cron'));
      expect(unused).toHaveLength(0);
    });

    it('should assign MEDIUM severity to unused dependency findings', async () => {
      (analyzer as any).readFile.mockReturnValue('// nothing');
      const ctx = makeContext({
        files: [makeFile('/project/src/app/page.tsx')],
        packageJson: { dependencies: { 'node-cron': '^3.0.0' } },
      });
      const findings = await analyzer.analyze(ctx);
      const unused = findings.find(f => f.title.includes('node-cron'));
      expect(unused?.severity).toBe(Severity.MEDIUM);
    });
  });

  // ── Oversized source files ────────────────────────────────────────────────

  describe('oversized source files', () => {
    it('should flag source files over 50 KB', async () => {
      const ctx = makeContext({
        files: [makeFile('/project/src/lib/bigFile.ts', { size: 60_000, type: FileType.SOURCE })],
      });
      const findings = await analyzer.analyze(ctx);
      const oversized = findings.filter(f => f.title.includes('Oversized'));
      expect(oversized.length).toBeGreaterThan(0);
    });

    it('should NOT flag source files under 50 KB', async () => {
      const ctx = makeContext({
        files: [makeFile('/project/src/lib/small.ts', { size: 10_000, type: FileType.SOURCE })],
      });
      const findings = await analyzer.analyze(ctx);
      const oversized = findings.filter(f => f.title.includes('Oversized'));
      expect(oversized).toHaveLength(0);
    });

    it('should assign HIGH severity to files over 500 KB', async () => {
      const ctx = makeContext({
        files: [makeFile('/project/src/lib/huge.ts', { size: 600_000, type: FileType.SOURCE })],
      });
      const findings = await analyzer.analyze(ctx);
      const oversized = findings.find(f => f.title.includes('Oversized'));
      expect(oversized?.severity).toBe(Severity.HIGH);
    });

    it('should assign MEDIUM severity to files between 50–500 KB', async () => {
      const ctx = makeContext({
        files: [makeFile('/project/src/lib/medium.ts', { size: 100_000, type: FileType.SOURCE })],
      });
      const findings = await analyzer.analyze(ctx);
      const oversized = findings.find(f => f.title.includes('Oversized'));
      expect(oversized?.severity).toBe(Severity.MEDIUM);
    });

    it('should NOT flag non-SOURCE file types', async () => {
      const ctx = makeContext({
        files: [makeFile('/project/scripts/big.js', { size: 60_000, type: FileType.SCRIPT })],
      });
      const findings = await analyzer.analyze(ctx);
      const oversized = findings.filter(f => f.title.includes('Oversized'));
      expect(oversized).toHaveLength(0);
    });
  });

  // ── Broken npm scripts ────────────────────────────────────────────────────

  describe('broken npm scripts', () => {
    it('should flag missing script file for "seed" script', async () => {
      vi.spyOn(analyzer as any, 'fileExists').mockReturnValue(false);

      const ctx = makeContext({
        packageJson: {
          scripts: { seed: 'node scripts/seed.js' },
        },
      });
      const findings = await analyzer.analyze(ctx);
      const broken = findings.filter(f => f.title.includes('Broken npm Script'));
      expect(broken.length).toBeGreaterThan(0);
    });

    it('should NOT flag scripts whose files exist', async () => {
      vi.spyOn(analyzer as any, 'fileExists').mockReturnValue(true);

      const ctx = makeContext({
        packageJson: {
          scripts: { seed: 'node scripts/seed.js' },
        },
      });
      const findings = await analyzer.analyze(ctx);
      const broken = findings.filter(f => f.title.includes('Broken npm Script'));
      expect(broken).toHaveLength(0);
    });

    it('should NOT flag scripts not present in package.json', async () => {
      const ctx = makeContext({ packageJson: { scripts: {} } });
      const findings = await analyzer.analyze(ctx);
      const broken = findings.filter(f => f.title.includes('Broken npm Script'));
      expect(broken).toHaveLength(0);
    });
  });
});
