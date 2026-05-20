/**
 * Base analyzer abstract class — Task 5.2
 *
 * Every concrete analyzer (Structure, UI/UX, Performance, etc.) extends
 * this class.  It wraps `analyze()` with error handling so that one
 * failing analyzer never stops the pipeline.
 */

import {
  IAnalyzer,
  AnalysisContext,
  Finding,
  FindingCategory,
  Severity,
} from '../types';

export abstract class BaseAnalyzer implements IAnalyzer {
  abstract name: string;
  abstract category: FindingCategory;

  /** Concrete analyzers implement this */
  protected abstract runAnalysis(context: AnalysisContext): Promise<Finding[]>;

  /** Safe wrapper — graceful degradation on failure */
  async analyze(context: AnalysisContext): Promise<Finding[]> {
    try {
      return await this.runAnalysis(context);
    } catch (error: any) {
      console.error(`[Analyzer:${this.name}] Failed:`, error?.message ?? error);
      return [this._errorFinding(error)];
    }
  }

  /** Utility: read a source file safely */
  protected readFile(filePath: string): string {
    try {
      const fs = require('fs') as typeof import('fs');
      return fs.readFileSync(filePath, 'utf-8');
    } catch {
      return '';
    }
  }

  /** Utility: check if file exists safely */
  protected fileExists(filePath: string): boolean {
    try {
      const fs = require('fs') as typeof import('fs');
      return fs.existsSync(filePath);
    } catch {
      return false;
    }
  }

  /** Utility: does source match a pattern? */
  protected matches(source: string, pattern: RegExp): boolean {
    pattern.lastIndex = 0;
    return pattern.test(source);
  }

  /** Utility: count pattern occurrences in source */
  protected countMatches(source: string, pattern: RegExp): number {
    const global = new RegExp(pattern.source, 'g' + (pattern.flags.replace('g', '')));
    return (source.match(global) ?? []).length;
  }

  // ── Helpers for consistent Finding construction ──────────────────────────

  protected finding(partial: Omit<Finding, 'id'>): Finding {
    const id = `${this.category}-${partial.title.toLowerCase().replace(/\s+/g, '-').slice(0, 40)}`;
    return { id, ...partial };
  }

  private _errorFinding(error: any): Finding {
    return {
      id: `error-${this.name}`,
      category: FindingCategory.CODE_QUALITY,
      severity: Severity.LOW,
      title: `Analyzer Error: ${this.name}`,
      description: `The ${this.name} analyzer failed: ${error?.message ?? String(error)}`,
      location: 'N/A',
      impact: { score: 0, description: 'Analysis incomplete for this category' },
      effort: { hours: 0, complexity: 'trivial' },
      recommendation: {
        action: 'Investigate the analyzer failure',
        steps: ['Check console logs', 'Review analyzer implementation'],
        testingStrategy: 'N/A',
        rollbackPlan: 'N/A',
        successCriteria: ['Analyzer runs successfully'],
      },
    };
  }
}
