/**
 * Main Analysis Orchestrator — Task 17
 *
 * Ties together FileScanner, CleanupEngine, AnalysisEngine (all analyzers),
 * and ReportGenerator into a single `runAnalysis()` function.
 *
 * Usage:
 *   npx ts-node --project tsconfig.scripts.json scripts/run-analysis.ts
 */

import path from 'path';
import fs from 'fs';

import { FileScanner } from './scanner';
import { CleanupEngine } from './cleanup';
import { AnalysisEngine } from './engine';
import { ReportGenerator } from './reporter';

import { StructureAnalyzer }      from './analyzers/structure';
import { UIUXAnalyzer }           from './analyzers/uiux';
import { PerformanceAnalyzer }    from './analyzers/performance';
import { CodeQualityAnalyzer }    from './analyzers/code-quality';
import { SecurityAnalyzer }       from './analyzers/security';
import { DatabaseAnalyzer }       from './analyzers/database';
import { BestPracticesAnalyzer }  from './analyzers/best-practices';

import {
  AnalysisContext,
  AnalysisReport,
  ReportMetadata,
  AnalysisProgress,
  ErrorCategory,
  ErrorSeverity,
  AnalysisError,
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export interface RunAnalysisOptions {
  projectRoot?: string;
  onProgress?: (progress: AnalysisProgress) => void;
  /** Write report files to this directory (default: project root) */
  outputDir?: string;
}

/**
 * Runs the full analysis pipeline and returns the complete AnalysisReport.
 *
 * Pipeline:
 *   1. FileScanner  — traverse directory, collect FileMetadata
 *   2. CleanupEngine — identify files to delete
 *   3. Build dependency graph
 *   4. AnalysisEngine — run all analyzers in parallel
 *   5. ReportGenerator — assemble & serialise report
 */
export async function runAnalysis(options: RunAnalysisOptions = {}): Promise<AnalysisReport> {
  const startTime   = Date.now();
  const projectRoot = options.projectRoot ?? process.cwd();
  const outputDir   = options.outputDir   ?? projectRoot;

  console.log(`\n🚀 ISP-FinTrack Project Analysis`);
  console.log(`   Project: ${projectRoot}`);
  console.log(`   Started: ${new Date().toLocaleTimeString()}\n`);

  // ── Step 1: Read package.json and tsconfig.json ──────────────────────────
  const packageJson = _readJSON(path.join(projectRoot, 'package.json'));
  const tsConfig    = _readJSON(path.join(projectRoot, 'tsconfig.json'));

  // ── Step 2: Scan files ───────────────────────────────────────────────────
  console.log('📁 Scanning files…');
  const scanner = new FileScanner();
  const files   = await scanner.scan(projectRoot);
  console.log(`   → ${files.length} files found`);

  // ── Step 3: Build dependency graph ───────────────────────────────────────
  console.log('🔗 Building dependency graph…');
  const dependencyGraph = await scanner.buildDependencyGraph(files, projectRoot);

  // Mark each file as referenced/not referenced
  for (const file of files) {
    const node = dependencyGraph.nodes.get(file.path);
    if (node && node.importedBy.length > 0) {
      file.isReferenced = true;
      file.referencedBy = node.importedBy;
    }
  }

  // ── Step 4: Cleanup analysis ─────────────────────────────────────────────
  console.log('🗑️  Identifying files to delete…');
  const cleanup       = new CleanupEngine();
  const fileCleanup   = await cleanup.analyzeFiles(files, dependencyGraph);
  const cleanupFindings = cleanup.toFindings(fileCleanup, dependencyGraph);
  console.log(`   → ${fileCleanup.files.length} files flagged for deletion (${_formatBytes(fileCleanup.totalSize)})`);

  // ── Step 5: Build analysis context ───────────────────────────────────────
  const context: AnalysisContext = {
    files,
    dependencyGraph,
    projectRoot,
    packageJson,
    tsConfig,
  };

  // ── Step 6: Run all analyzers ─────────────────────────────────────────────
  console.log('🔎 Running analyzers…');
  const engine = new AnalysisEngine();
  engine.registerAll([
    new StructureAnalyzer(),
    new UIUXAnalyzer(),
    new PerformanceAnalyzer(),
    new CodeQualityAnalyzer(),
    new SecurityAnalyzer(),
    new DatabaseAnalyzer(),
    new BestPracticesAnalyzer(),
  ]);

  const analyzerFindings = await engine.analyze(context, (progress) => {
    process.stdout.write(`   ⏳ [${progress.completedAnalyzers}/${progress.totalAnalyzers}] ${progress.currentAnalyzer}\r`);
    options.onProgress?.(progress);
  });

  console.log(`\n   → ${analyzerFindings.length} findings from ${engine.getAnalyzerNames().length} analyzers`);

  // ── Step 7: Assemble report ───────────────────────────────────────────────
  const scanDuration = Date.now() - startTime;

  const metadata: ReportMetadata = {
    generatedAt:      new Date(),
    projectPath:      projectRoot,
    analysisVersion:  '1.0.0',
    scanDuration,
  };

  const allFindings = [...cleanupFindings, ...analyzerFindings];

  const generator = new ReportGenerator();
  const report    = generator.generateReport(allFindings, fileCleanup, metadata);
  report.summary.totalFilesScanned = files.length;

  // ── Step 8: Write output files ────────────────────────────────────────────
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

  const mdPath   = path.join(outputDir, `analysis-report-${timestamp}.md`);
  const jsonPath = path.join(outputDir, `analysis-report-${timestamp}.json`);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(mdPath,   generator.toMarkdown(report), 'utf-8');
  fs.writeFileSync(jsonPath, generator.toJSON(report),     'utf-8');

  console.log('\n✅ Analysis complete!');
  console.log(`   📄 Markdown: ${path.relative(process.cwd(), mdPath)}`);
  console.log(`   📊 JSON:     ${path.relative(process.cwd(), jsonPath)}`);
  console.log(`   ⏱️  Duration: ${(scanDuration / 1000).toFixed(2)}s`);
  console.log('');
  _printSummary(report);

  return report;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function _readJSON(filePath: string): Record<string, any> {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return {};
  }
}

function _formatBytes(bytes: number): string {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(2)} MB`;
  if (bytes >= 1_024)     return `${(bytes / 1_024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function _printSummary(report: AnalysisReport): void {
  const { summary } = report;
  console.log('═══════════════════════════════════════');
  console.log('  ANALYSIS SUMMARY');
  console.log('═══════════════════════════════════════');
  console.log(`  Files scanned:    ${summary.totalFilesScanned}`);
  console.log(`  Files to delete:  ${summary.totalFilesToDelete} (${summary.totalSpaceSavings})`);
  console.log(`  Total findings:   ${summary.totalFindings}`);
  console.log(`  🔴 Critical:      ${summary.findingsBySeverity.critical}`);
  console.log(`  🟠 High:          ${summary.findingsBySeverity.high}`);
  console.log(`  🟡 Medium:        ${summary.findingsBySeverity.medium}`);
  console.log(`  🟢 Low:           ${summary.findingsBySeverity.low}`);
  console.log(`  Est. effort:      ${summary.estimatedTotalEffort}h`);
  console.log('═══════════════════════════════════════\n');
}
