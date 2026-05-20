/**
 * CleanupEngine unit tests — Task 4.2
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CleanupEngine } from './cleanup';
import { FileMetadata, FileType, DependencyGraph, FileNode } from './types';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeFile(overrides: Partial<FileMetadata> & { path: string }): FileMetadata {
  return {
    size: 1024,
    type: FileType.SOURCE,
    lastModified: new Date(),
    isReferenced: false,
    referencedBy: [],
    ...overrides,
  };
}

function emptyGraph(): DependencyGraph {
  return { nodes: new Map(), edges: new Map() };
}

function graphWithImporter(filePath: string, importedByPath: string): DependencyGraph {
  const nodes = new Map<string, FileNode>();
  nodes.set(filePath, {
    path: filePath,
    imports: [],
    importedBy: [importedByPath],
  });
  return { nodes, edges: new Map([[importedByPath, [filePath]]]) };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CleanupEngine', () => {
  let engine: CleanupEngine;

  beforeEach(() => {
    engine = new CleanupEngine();
  });

  // ── categorizeFile ──────────────────────────────────────────────────────

  describe('categorizeFile', () => {
    it('should categorize .log files as LOG', () => {
      const file = makeFile({ path: '/project/dev_output.log' });
      expect(engine.categorizeFile(file)).toBe(FileType.LOG);
    });

    it('should categorize .dump files as BACKUP', () => {
      const file = makeFile({ path: '/project/local_db.dump' });
      expect(engine.categorizeFile(file)).toBe(FileType.BACKUP);
    });

    it('should categorize .sql files as BACKUP', () => {
      const file = makeFile({ path: '/project/schema.sql' });
      expect(engine.categorizeFile(file)).toBe(FileType.BACKUP);
    });

    it('should categorize .pgsql files as BACKUP', () => {
      const file = makeFile({ path: '/project/migrate.pgsql' });
      expect(engine.categorizeFile(file)).toBe(FileType.BACKUP);
    });

    it('should categorize files in debug/ directory as DEBUG', () => {
      const file = makeFile({ path: '/project/debug/output.json' });
      expect(engine.categorizeFile(file)).toBe(FileType.DEBUG);
    });

    it('should categorize files in scratch/ directory as DEBUG', () => {
      const file = makeFile({ path: '/project/scratch/test.ts' });
      expect(engine.categorizeFile(file)).toBe(FileType.DEBUG);
    });

    it('should categorize files in _archive/ directory as DEBUG', () => {
      const file = makeFile({ path: '/project/_archive/seed.js' });
      expect(engine.categorizeFile(file)).toBe(FileType.DEBUG);
    });

    it('should categorize mockData_old.ts as ARTIFACT', () => {
      const file = makeFile({ path: '/project/src/lib/mockData_old.ts' });
      expect(engine.categorizeFile(file)).toBe(FileType.ARTIFACT);
    });

    it('should categorize .tsbuildinfo files as ARTIFACT', () => {
      const file = makeFile({ path: '/project/tsconfig.tsbuildinfo' });
      expect(engine.categorizeFile(file)).toBe(FileType.ARTIFACT);
    });

    it('should categorize root .js files as SCRIPT', () => {
      const file = makeFile({ path: '/project/scripts/check_db.js' });
      expect(engine.categorizeFile(file)).toBe(FileType.SCRIPT);
    });

    it('should keep SOURCE type for normal .ts files in src/', () => {
      const file = makeFile({ path: '/project/src/app/page.tsx', type: FileType.SOURCE });
      expect(engine.categorizeFile(file)).toBe(FileType.SOURCE);
    });
  });

  // ── isSafeToDelete ──────────────────────────────────────────────────────

  describe('isSafeToDelete', () => {
    it('should NOT delete files imported by other files (rule 1)', () => {
      const filePath = '/project/src/lib/utils.ts';
      const file = makeFile({ path: filePath, type: FileType.SOURCE });
      const graph = graphWithImporter(filePath, '/project/src/app/page.tsx');
      expect(engine.isSafeToDelete(file, graph)).toBe(false);
    });

    it('should delete files in debug/ directory (rule 2)', () => {
      const file = makeFile({ path: '/project/debug/dump.json', type: FileType.DEBUG });
      expect(engine.isSafeToDelete(file, emptyGraph())).toBe(true);
    });

    it('should delete files in scratch/ directory (rule 2)', () => {
      const file = makeFile({ path: '/project/scratch/temp.ts', type: FileType.DEBUG });
      expect(engine.isSafeToDelete(file, emptyGraph())).toBe(true);
    });

    it('should delete files in _archive/ directory (rule 2)', () => {
      const file = makeFile({ path: '/project/_archive/old.js', type: FileType.DEBUG });
      expect(engine.isSafeToDelete(file, emptyGraph())).toBe(true);
    });

    it('should delete known safe filenames (rule 3)', () => {
      const file = makeFile({ path: '/project/dev_output.log' });
      expect(engine.isSafeToDelete(file, emptyGraph())).toBe(true);
    });

    it('should delete .log extension files (rule 3)', () => {
      const file = makeFile({ path: '/project/app.log' });
      expect(engine.isSafeToDelete(file, emptyGraph())).toBe(true);
    });

    it('should delete .dump extension files (rule 3)', () => {
      const file = makeFile({ path: '/project/backup.dump' });
      expect(engine.isSafeToDelete(file, emptyGraph())).toBe(true);
    });

    it('should delete obsolete mockData_old.ts (rule 4)', () => {
      const file = makeFile({ path: '/project/src/lib/mockData_old.ts', type: FileType.ARTIFACT });
      expect(engine.isSafeToDelete(file, emptyGraph())).toBe(true);
    });

    it('should delete SQL files in known list (rule 5)', () => {
      const file = makeFile({ path: '/project/seed_database.sql', type: FileType.BACKUP });
      expect(engine.isSafeToDelete(file, emptyGraph())).toBe(true);
    });

    it('should delete unreferenced SCRIPT files (rule 6)', () => {
      const file = makeFile({ path: '/project/scripts/util.js', type: FileType.SCRIPT, isReferenced: false });
      expect(engine.isSafeToDelete(file, emptyGraph())).toBe(true);
    });

    it('should NOT delete unreferenced SOURCE files', () => {
      const file = makeFile({ path: '/project/src/utils.ts', type: FileType.SOURCE, isReferenced: false });
      expect(engine.isSafeToDelete(file, emptyGraph())).toBe(false);
    });

    it('should NOT delete referenced SCRIPT files', () => {
      const filePath = '/project/scripts/setup.js';
      const file = makeFile({ path: filePath, type: FileType.SCRIPT, isReferenced: true });
      const graph = graphWithImporter(filePath, '/project/package.json');
      expect(engine.isSafeToDelete(file, graph)).toBe(false);
    });
  });

  // ── generateRationale ───────────────────────────────────────────────────

  describe('generateRationale', () => {
    it('should return debug rationale for files in debug/ dir', () => {
      const file = makeFile({ path: '/project/debug/output.json', type: FileType.DEBUG });
      const rationale = engine.generateRationale(file);
      expect(rationale).toContain('debug/');
    });

    it('should return scratch rationale for files in scratch/ dir', () => {
      const file = makeFile({ path: '/project/scratch/temp.ts', type: FileType.DEBUG });
      expect(engine.generateRationale(file)).toContain('scratch/');
    });

    it('should return archive rationale for files in _archive/ dir', () => {
      const file = makeFile({ path: '/project/_archive/seed.js', type: FileType.DEBUG });
      expect(engine.generateRationale(file)).toContain('_archive/');
    });

    it('should return LOG rationale for log files', () => {
      const file = makeFile({ path: '/project/app.log', type: FileType.LOG });
      expect(engine.generateRationale(file)).toContain('Log file');
    });

    it('should return BACKUP rationale for SQL/dump files', () => {
      const file = makeFile({ path: '/project/schema.sql', type: FileType.BACKUP });
      expect(engine.generateRationale(file)).toContain('/database/setup/');
    });

    it('should return ARTIFACT rationale for build artifacts', () => {
      const file = makeFile({ path: '/project/tsconfig.tsbuildinfo', type: FileType.ARTIFACT });
      expect(engine.generateRationale(file)).toContain('build artefact');
    });

    it('should return SCRIPT rationale for one-off scripts', () => {
      const file = makeFile({ path: '/project/scripts/check.js', type: FileType.SCRIPT });
      expect(engine.generateRationale(file)).toContain('One-off utility script');
    });

    it('should return generic rationale for other types', () => {
      const file = makeFile({ path: '/project/src/unused.ts', type: FileType.SOURCE });
      expect(engine.generateRationale(file)).toContain('not referenced');
    });
  });

  // ── formatSize ──────────────────────────────────────────────────────────

  describe('formatSize', () => {
    it('should format bytes under 1 KB', () => {
      expect(engine.formatSize(512)).toBe('512 B');
    });

    it('should format bytes in KB range', () => {
      expect(engine.formatSize(2048)).toBe('2.0 KB');
    });

    it('should format bytes in MB range', () => {
      expect(engine.formatSize(2 * 1024 * 1024)).toBe('2.00 MB');
    });

    it('should format 0 bytes', () => {
      expect(engine.formatSize(0)).toBe('0 B');
    });
  });

  // ── analyzeFiles ────────────────────────────────────────────────────────

  describe('analyzeFiles', () => {
    it('should return empty section when no files are safe to delete', () => async () => {
      const files = [makeFile({ path: '/project/src/app/page.tsx', type: FileType.SOURCE, isReferenced: true })];
      const result = await engine.analyzeFiles(files, emptyGraph());
      expect(result.files).toHaveLength(0);
      expect(result.totalSize).toBe(0);
    });

    it('should include log files in deletion candidates', async () => {
      const logFile = makeFile({ path: '/project/dev_output.log', size: 2048 });
      const result = await engine.analyzeFiles([logFile], emptyGraph());
      expect(result.files.length).toBeGreaterThan(0);
      expect(result.totalSize).toBe(2048);
    });

    it('should calculate totalSize correctly across multiple candidates', async () => {
      const files = [
        makeFile({ path: '/project/debug/a.json', size: 1000, type: FileType.DEBUG }),
        makeFile({ path: '/project/scratch/b.ts', size: 2000, type: FileType.DEBUG }),
      ];
      const result = await engine.analyzeFiles(files, emptyGraph());
      expect(result.totalSize).toBe(3000);
    });

    it('should group files by type in categorization', async () => {
      const files = [
        makeFile({ path: '/project/debug/a.json', type: FileType.DEBUG }),
        makeFile({ path: '/project/app.log', type: FileType.LOG }),
      ];
      const result = await engine.analyzeFiles(files, emptyGraph());
      expect(result.categorization[FileType.DEBUG]).toBeDefined();
      expect(result.categorization[FileType.LOG]).toBeDefined();
    });

    it('should NOT include files imported by others', async () => {
      const filePath = '/project/src/lib/utils.ts';
      const file = makeFile({ path: filePath, type: FileType.SOURCE });
      const graph = graphWithImporter(filePath, '/project/src/app/page.tsx');
      const result = await engine.analyzeFiles([file], graph);
      expect(result.files).toHaveLength(0);
    });
  });

  // ── toFindings ──────────────────────────────────────────────────────────

  describe('toFindings', () => {
    it('should produce one Finding per candidate file', () => {
      const section = {
        files: [makeFile({ path: '/project/app.log', type: FileType.LOG, size: 500 })],
        totalSize: 500,
        categorization: {},
      };
      const findings = engine.toFindings(section, emptyGraph());
      expect(findings).toHaveLength(1);
    });

    it('should assign unique IDs with cleanup- prefix', () => {
      const section = {
        files: [
          makeFile({ path: '/project/app.log', type: FileType.LOG }),
          makeFile({ path: '/project/debug/out.json', type: FileType.DEBUG }),
        ],
        totalSize: 0,
        categorization: {},
      };
      const findings = engine.toFindings(section, emptyGraph());
      expect(findings[0].id).toBe('cleanup-000');
      expect(findings[1].id).toBe('cleanup-001');
    });

    it('should set HIGH severity for large BACKUP files (> 1 MB)', () => {
      const section = {
        files: [makeFile({ path: '/project/seed_database.sql', type: FileType.BACKUP, size: 2_000_000 })],
        totalSize: 2_000_000,
        categorization: {},
      };
      const findings = engine.toFindings(section, emptyGraph());
      expect(findings[0].severity).toBe('high');
      // severity is HIGH for large backup files
      expect(['high', 'critical']).toContain(findings[0].severity);
    });

    it('should set MEDIUM severity for LOG files', () => {
      const section = {
        files: [makeFile({ path: '/project/app.log', type: FileType.LOG, size: 100 })],
        totalSize: 100,
        categorization: {},
      };
      const findings = engine.toFindings(section, emptyGraph());
      expect(findings[0].severity).toBe('medium');
    });

    it('should set LOW severity for debug/artifact files', () => {
      const section = {
        files: [makeFile({ path: '/project/debug/out.json', type: FileType.DEBUG })],
        totalSize: 0,
        categorization: {},
      };
      const findings = engine.toFindings(section, emptyGraph());
      expect(findings[0].severity).toBe('low');
    });

    it('should include space saving in impact metrics', () => {
      const section = {
        files: [makeFile({ path: '/project/app.log', type: FileType.LOG, size: 2048 })],
        totalSize: 2048,
        categorization: {},
      };
      const findings = engine.toFindings(section, emptyGraph());
      expect(findings[0].impact.metrics?.spaceSaving).toBe('2.0 KB');
    });
  });
});
