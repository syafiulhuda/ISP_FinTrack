/**
 * CleanupEngine — Task 4.1
 *
 * Analyses the file inventory produced by FileScanner and identifies files
 * that are safe to delete.  For each candidate it produces:
 *   - A human-readable deletion rationale
 *   - A safe-to-delete verdict (never marks source entry points)
 *   - Space saving estimates grouped by FileType
 */

import path from 'path';
import {
  FileMetadata,
  FileType,
  FileCleanupSection,
  DependencyGraph,
  Finding,
  FindingCategory,
  Severity,
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Patterns that categorise files as "safe to delete" candidates
// ─────────────────────────────────────────────────────────────────────────────

/** Parent directories whose entire content is considered debug / scratch */
const SAFE_PARENT_DIRS = new Set(['debug', 'scratch', '_archive']);

/** File names that are safe to delete regardless of extension */
const SAFE_FILENAMES = new Set([
  'dev_output.log',
  'append_mock.js',
  'check_db_data.js',
  'tsconfig.tsbuildinfo',
]);

/** Extensions of files that are always safe to delete when unreferenced */
const SAFE_EXTENSIONS = new Set(['.log', '.dump']);

/** SQL file names that are documentation / seed files (not production) */
const SQL_FILES_TO_ARCHIVE = new Set([
  'backup_before_migration.sql',
  'optimize_performance.sql',
  'predictive_metrics_mv.sql',
  'profitability_metrics.sql',
  'schema.sql',
  'seed_database.sql',
  'local_db.dump',
]);

/** The old mock data file is superseded by the new one */
const OBSOLETE_FILES = new Set(['mockdata_old.ts']);

// ─────────────────────────────────────────────────────────────────────────────
// CleanupEngine
// ─────────────────────────────────────────────────────────────────────────────

export class CleanupEngine {
  /**
   * Examines every file and returns a FileCleanupSection describing
   * all deletion candidates with categorisation and space estimates.
   */
  async analyzeFiles(
    files: FileMetadata[],
    graph: DependencyGraph,
  ): Promise<FileCleanupSection> {
    const candidates: FileMetadata[] = [];
    const categorization: Partial<Record<FileType, FileMetadata[]>> = {};

    for (const file of files) {
      // Tag the file with its proper type before evaluating
      const classified = { ...file, type: this.categorizeFile(file) };

      if (this.isSafeToDelete(classified, graph)) {
        candidates.push(classified);
        const bucket = categorization[classified.type] ?? [];
        bucket.push(classified);
        categorization[classified.type] = bucket;
      }
    }

    const totalSize = candidates.reduce((sum, f) => sum + f.size, 0);

    return { files: candidates, totalSize, categorization };
  }

  /**
   * Re-classifies a file from `FileType.SOURCE` into a more specific type
   * when it matches known debug / backup / script patterns.
   */
  categorizeFile(file: FileMetadata): FileType {
    const base   = path.basename(file.path).toLowerCase();
    const ext    = path.extname(file.path).toLowerCase();
    const parent = path.basename(path.dirname(file.path)).toLowerCase();

    if (ext === '.log' || base === 'dev_output.log')              return FileType.LOG;
    if (ext === '.dump' || SQL_FILES_TO_ARCHIVE.has(base))        return FileType.BACKUP;
    if (ext === '.sql' || ext === '.pgsql')                       return FileType.BACKUP;
    if (SAFE_PARENT_DIRS.has(parent))                             return FileType.DEBUG;
    if (OBSOLETE_FILES.has(base))                                 return FileType.ARTIFACT;
    if (['.js', '.mjs'].includes(ext) && parent !== 'src')        return FileType.SCRIPT;
    if (ext === '.tsbuildinfo')                                    return FileType.ARTIFACT;

    return file.type;
  }

  /**
   * Returns `true` when a file can be deleted without breaking the application.
   *
   * Safety rules (in order):
   * 1. Never delete files that are imported by other files.
   * 2. Always delete files in known "safe" parent directories.
   * 3. Always delete files with known safe names / extensions.
   * 4. Always delete obsolete files (mockData_old.ts).
   * 5. Delete SQL / dump files (they belong in `/database/setup/`, not root).
   * 6. Delete unreferenced SCRIPT / DEBUG / LOG / ARTIFACT types.
   */
  isSafeToDelete(file: FileMetadata, graph: DependencyGraph): boolean {
    // Rule 1: Never touch imported files
    const node = graph.nodes.get(file.path);
    if (node && node.importedBy.length > 0) return false;

    const base   = path.basename(file.path).toLowerCase();
    const ext    = path.extname(file.path).toLowerCase();
    const parent = path.basename(path.dirname(file.path)).toLowerCase();

    // Rule 2: Safe parent directories
    if (SAFE_PARENT_DIRS.has(parent)) return true;

    // Rule 3: Known safe filenames / extensions
    if (SAFE_FILENAMES.has(base))   return true;
    if (SAFE_EXTENSIONS.has(ext))   return true;

    // Rule 4: Obsolete files
    if (OBSOLETE_FILES.has(base))   return true;

    // Rule 5: SQL / dump files at root or scripts level
    if (SQL_FILES_TO_ARCHIVE.has(base)) return true;

    // Rule 6: Unreferenced scripts, debug artefacts
    const deletableTypes = new Set([FileType.SCRIPT, FileType.DEBUG, FileType.LOG, FileType.ARTIFACT]);
    if (deletableTypes.has(file.type) && !file.isReferenced) return true;

    return false;
  }

  /**
   * Produces a single-sentence rationale for why a file should be deleted.
   */
  generateRationale(file: FileMetadata): string {
    const base   = path.basename(file.path);
    const parent = path.basename(path.dirname(file.path));

    if (parent === 'debug')    return `Debug output dump in \`debug/\` directory — no longer needed.`;
    if (parent === 'scratch')  return `Temporary scratch script in \`scratch/\` — used during initial development only.`;
    if (parent === '_archive') return `Archived initialisation script in \`_archive/\` — superseded by Server Actions.`;

    switch (file.type) {
      case FileType.LOG:      return `Log file \`${base}\` is a local dev artefact and must not ship to production.`;
      case FileType.BACKUP:   return `SQL dump/backup \`${base}\` should be moved to \`/database/setup/\` or excluded from the repo.`;
      case FileType.ARTIFACT: return `\`${base}\` is a build artefact or obsolete copy — safe to remove.`;
      case FileType.SCRIPT:   return `One-off utility script \`${base}\` at project root — no longer wired to any npm command.`;
      default:                return `\`${base}\` is not referenced by any module and can be safely deleted.`;
    }
  }

  /**
   * Formats bytes into a human-readable size string (KB / MB).
   */
  formatSize(bytes: number): string {
    if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(2)} MB`;
    if (bytes >= 1_024)     return `${(bytes / 1_024).toFixed(1)} KB`;
    return `${bytes} B`;
  }

  /**
   * Converts a FileCleanupSection into a list of structured Findings
   * suitable for inclusion in the analysis report.
   */
  toFindings(section: FileCleanupSection, graph: DependencyGraph): Finding[] {
    return section.files.map((file, i): Finding => ({
      id: `cleanup-${i.toString().padStart(3, '0')}`,
      category: FindingCategory.FILE_CLEANUP,
      severity: this._cleanupSeverity(file),
      title: `Remove \`${path.basename(file.path)}\``,
      description: this.generateRationale(file),
      location: file.path,
      impact: {
        score: 3,
        description: 'Reduces repository clutter and deployment size.',
        metrics: { spaceSaving: this.formatSize(file.size) },
      },
      effort: { hours: 0.1, complexity: 'trivial' },
      recommendation: {
        action: `Delete the file \`${path.relative(process.cwd(), file.path)}\``,
        steps: [
          `Run: \`rm "${path.relative(process.cwd(), file.path)}"\``,
          'Confirm the project still builds: `npm run build`',
        ],
        testingStrategy: 'Run `npm run build` and verify zero compilation errors.',
        rollbackPlan:    'Restore from git history: `git checkout HEAD -- <file>`',
        successCriteria: [
          'File is deleted from the repository',
          'Build completes without errors',
          'No runtime errors after deployment',
        ],
      },
    }));
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private _cleanupSeverity(file: FileMetadata): Severity {
    // Large SQL seed files or dumps that accidentally ship to production are HIGH
    if (file.size > 1_000_000 && file.type === FileType.BACKUP) return Severity.HIGH;
    // Log files in root are MEDIUM
    if (file.type === FileType.LOG)    return Severity.MEDIUM;
    // Everything else is LOW
    return Severity.LOW;
  }
}
