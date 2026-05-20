/**
 * ReportGenerator — Task 16.1
 *
 * Transforms raw findings + file cleanup section into a fully formatted
 * AnalysisReport, then serialises it to:
 *   - Structured JSON
 *   - Human-readable Markdown
 */

import path from 'path';
import {
  AnalysisReport,
  Finding,
  FileCleanupSection,
  ReportMetadata,
  ReportSummary,
  ImplementationPlan,
  Severity,
  FindingCategory,
  Phase,
} from './types';

export class ReportGenerator {
  /**
   * Assembles the complete AnalysisReport from analysis outputs.
   */
  generateReport(
    findings: Finding[],
    fileCleanup: FileCleanupSection,
    metadata: ReportMetadata,
  ): AnalysisReport {
    const summary       = this._buildSummary(findings, fileCleanup, metadata);
    const implementation = this._buildImplementationPlan(findings);

    return {
      metadata,
      summary,
      filesToDelete: fileCleanup,
      findings,
      implementationPlan: implementation,
    };
  }

  // ── Markdown serialisation ───────────────────────────────────────────────

  toMarkdown(report: AnalysisReport): string {
    const lines: string[] = [];

    // ── Header ──────────────────────────────────────────────────────────────
    lines.push('# 🔍 ISP-FinTrack Project Analysis Report');
    lines.push('');
    lines.push(`> **Generated:** ${report.metadata.generatedAt.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`);
    lines.push(`> **Project:** \`${report.metadata.projectPath}\``);
    lines.push(`> **Scan Duration:** ${(report.metadata.scanDuration / 1000).toFixed(2)}s`);
    lines.push(`> **Analyzer Version:** ${report.metadata.analysisVersion}`);
    lines.push('');

    // ── Executive Summary ────────────────────────────────────────────────────
    lines.push('## 📊 Executive Summary');
    lines.push('');
    lines.push('| Metric | Value |');
    lines.push('|--------|-------|');
    lines.push(`| Files Scanned | ${report.summary.totalFilesScanned} |`);
    lines.push(`| Files to Delete | ${report.summary.totalFilesToDelete} |`);
    lines.push(`| Space Savings | ${report.summary.totalSpaceSavings} |`);
    lines.push(`| Total Findings | ${report.summary.totalFindings} |`);
    lines.push(`| 🔴 Critical | ${report.summary.findingsBySeverity.critical} |`);
    lines.push(`| 🟠 High | ${report.summary.findingsBySeverity.high} |`);
    lines.push(`| 🟡 Medium | ${report.summary.findingsBySeverity.medium} |`);
    lines.push(`| 🟢 Low | ${report.summary.findingsBySeverity.low} |`);
    lines.push(`| Estimated Total Effort | ${report.summary.estimatedTotalEffort}h |`);
    lines.push('');

    // ── Files to Delete ──────────────────────────────────────────────────────
    lines.push('## 🗑️ Files to Delete');
    lines.push('');
    lines.push(`**Total: ${report.summary.totalFilesToDelete} files | Space savings: ${report.summary.totalSpaceSavings}**`);
    lines.push('');

    if (report.filesToDelete.files.length === 0) {
      lines.push('> ✅ No redundant files detected.');
    } else {
      lines.push('| File | Type | Size | Reason |');
      lines.push('|------|------|------|--------|');
      for (const f of report.filesToDelete.files) {
        const rel    = path.relative(report.metadata.projectPath, f.path);
        const sizeKB = `${(f.size / 1024).toFixed(1)} KB`;
        lines.push(`| \`${rel}\` | ${f.type} | ${sizeKB} | ${this._cleanupReason(f.type)} |`);
      }
    }
    lines.push('');

    // ── Findings by category ─────────────────────────────────────────────────
    lines.push('---');
    lines.push('');
    lines.push('## 🔎 Findings');
    lines.push('');

    const categories = Object.values(FindingCategory);
    for (const category of categories) {
      const catFindings = report.findings.filter(f => f.category === category);
      if (catFindings.length === 0) continue;

      lines.push(`### ${this._categoryIcon(category)} ${this._categoryName(category)}`);
      lines.push('');

      for (const finding of catFindings) {
        lines.push(`#### ${this._severityBadge(finding.severity)} ${finding.title}`);
        lines.push('');
        lines.push(`**Location:** \`${path.relative(report.metadata.projectPath, finding.location)}\``);
        lines.push('');
        lines.push(finding.description);
        lines.push('');
        lines.push(`**Impact Score:** ${finding.impact.score}/10 | **Effort:** ${finding.effort.hours}h (${finding.effort.complexity})`);
        lines.push('');

        if (finding.recommendation.codeExample) {
          lines.push('**Before:**');
          lines.push('```typescript');
          lines.push(finding.recommendation.codeExample.before);
          lines.push('```');
          lines.push('');
          lines.push('**After:**');
          lines.push('```typescript');
          lines.push(finding.recommendation.codeExample.after);
          lines.push('```');
          lines.push('');
        }

        lines.push(`**Action:** ${finding.recommendation.action}`);
        lines.push('');
        lines.push(`**Testing:** ${finding.recommendation.testingStrategy}`);
        lines.push('');
        lines.push('---');
        lines.push('');
      }
    }

    // ── Implementation Plan ──────────────────────────────────────────────────
    lines.push('## 🚀 Implementation Plan');
    lines.push('');

    lines.push('### ⚡ Quick Wins (< 2 hours)');
    lines.push('');
    if (report.implementationPlan.quickWins.length === 0) {
      lines.push('> None identified.');
    } else {
      for (const f of report.implementationPlan.quickWins) {
        lines.push(`- **[${f.severity.toUpperCase()}]** ${f.title} — ${f.effort.hours}h`);
      }
    }
    lines.push('');

    lines.push('### 📅 Short-Term (2–8 hours)');
    lines.push('');
    if (report.implementationPlan.shortTerm.length === 0) {
      lines.push('> None identified.');
    } else {
      for (const f of report.implementationPlan.shortTerm) {
        lines.push(`- **[${f.severity.toUpperCase()}]** ${f.title} — ${f.effort.hours}h`);
      }
    }
    lines.push('');

    lines.push('### 🏗️ Long-Term (> 8 hours)');
    lines.push('');
    if (report.implementationPlan.longTerm.length === 0) {
      lines.push('> None identified.');
    } else {
      for (const f of report.implementationPlan.longTerm) {
        lines.push(`- **[${f.severity.toUpperCase()}]** ${f.title} — ${f.effort.hours}h`);
      }
    }
    lines.push('');

    // ── Phases ──────────────────────────────────────────────────────────────
    if (report.implementationPlan.phases.length > 0) {
      lines.push('### 📋 Execution Phases');
      lines.push('');
      for (const phase of report.implementationPlan.phases) {
        lines.push(`#### Phase: ${phase.name} (${phase.estimatedDuration})`);
        lines.push(phase.description);
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  // ── JSON serialisation ───────────────────────────────────────────────────

  toJSON(report: AnalysisReport): string {
    return JSON.stringify(report, (key, value) => {
      if (value instanceof Map) return Object.fromEntries(value);
      return value;
    }, 2);
  }

  // ── Private: summary builder ─────────────────────────────────────────────

  private _buildSummary(
    findings: Finding[],
    fileCleanup: FileCleanupSection,
    metadata: ReportMetadata,
  ): ReportSummary {
    const severityCounts = {
      [Severity.CRITICAL]: 0,
      [Severity.HIGH]:     0,
      [Severity.MEDIUM]:   0,
      [Severity.LOW]:      0,
    };

    const categoryCounts: Record<string, number> = {};
    let totalEffort = 0;
    let totalImpact = 0;

    for (const f of findings) {
      severityCounts[f.severity]++;
      categoryCounts[f.category] = (categoryCounts[f.category] ?? 0) + 1;
      totalEffort += f.effort.hours;
      totalImpact += f.impact.score;
    }

    return {
      totalFilesScanned:   0,  // Set by orchestrator after scanning
      totalFilesToDelete:  fileCleanup.files.length,
      totalSpaceSavings:   this._formatBytes(fileCleanup.totalSize),
      totalFindings:       findings.length,
      findingsBySeverity:  severityCounts,
      findingsByCategory:  categoryCounts as any,
      estimatedTotalImpact: Math.round(totalImpact / (findings.length || 1)),
      estimatedTotalEffort: Math.round(totalEffort * 10) / 10,
    };
  }

  private _buildImplementationPlan(findings: Finding[]): ImplementationPlan {
    const sortedByPriority = [...findings].sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return (severityOrder[a.severity] - severityOrder[b.severity]) ||
             (b.impact.score - a.impact.score);
    });

    const quickWins  = sortedByPriority.filter(f => f.effort.hours < 2 && f.impact.score >= 5);
    const shortTerm  = sortedByPriority.filter(f => f.effort.hours >= 2 && f.effort.hours <= 8);
    const longTerm   = sortedByPriority.filter(f => f.effort.hours > 8);

    const phases: Phase[] = [
      {
        name: '1 — Critical Security & Stability',
        description: 'Address CRITICAL and HIGH severity findings that pose immediate security or data integrity risks.',
        findings: findings.filter(f => f.severity === Severity.CRITICAL || f.severity === Severity.HIGH).map(f => f.id),
        estimatedDuration: '1–2 days',
        prerequisites: [],
      },
      {
        name: '2 — File Cleanup & Quick Wins',
        description: 'Delete redundant files and apply low-effort, high-impact improvements.',
        findings: quickWins.map(f => f.id),
        estimatedDuration: '2–4 hours',
        prerequisites: ['Phase 1'],
      },
      {
        name: '3 — Performance & Architecture',
        description: 'Fix DB pool config, cron completeness, lazy loading, and remove ignoreBuildErrors.',
        findings: shortTerm.map(f => f.id),
        estimatedDuration: '3–5 days',
        prerequisites: ['Phase 2'],
      },
      {
        name: '4 — UI/UX & Best Practices',
        description: 'Improve accessibility, add loading/error boundaries, and standardise component patterns.',
        findings: findings.filter(f => f.category === FindingCategory.UI_UX || f.category === FindingCategory.BEST_PRACTICES).map(f => f.id),
        estimatedDuration: '3–5 days',
        prerequisites: ['Phase 3'],
      },
    ];

    return { quickWins, shortTerm, longTerm, phases };
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private _formatBytes(bytes: number): string {
    if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(2)} MB`;
    if (bytes >= 1_024)     return `${(bytes / 1_024).toFixed(1)} KB`;
    return `${bytes} B`;
  }

  private _severityBadge(severity: Severity): string {
    const badges = {
      critical: '🔴 CRITICAL',
      high:     '🟠 HIGH',
      medium:   '🟡 MEDIUM',
      low:      '🟢 LOW',
    };
    return badges[severity] ?? severity.toUpperCase();
  }

  private _categoryIcon(category: FindingCategory): string {
    const icons: Record<string, string> = {
      file_cleanup:   '🗑️',
      structure:      '🏗️',
      ui_ux:          '🎨',
      performance:    '⚡',
      code_quality:   '🧹',
      security:       '🔒',
      database:       '🗄️',
      best_practices: '✅',
    };
    return icons[category] ?? '📋';
  }

  private _categoryName(category: FindingCategory): string {
    const names: Record<string, string> = {
      file_cleanup:   'File Cleanup',
      structure:      'Project Structure',
      ui_ux:          'UI / UX',
      performance:    'Performance',
      code_quality:   'Code Quality',
      security:       'Security',
      database:       'Database',
      best_practices: 'Best Practices',
    };
    return names[category] ?? category;
  }

  private _cleanupReason(type: string): string {
    const reasons: Record<string, string> = {
      debug:        'Debug output — not needed in production',
      log:          'Local dev log file',
      backup:       'SQL dump / backup file',
      script:       'One-off utility script, superseded',
      artifact:     'Build artifact or obsolete copy',
      documentation: 'Outdated documentation',
    };
    return reasons[type] ?? 'Unreferenced file';
  }
}
