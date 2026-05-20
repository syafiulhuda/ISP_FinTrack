import { describe, it, expect, beforeEach } from 'vitest';
import { ReportGenerator } from './reporter';
import { AnalysisReport, FindingCategory, Severity, Finding } from './types';

describe('ReportGenerator', () => {
  let reporter: ReportGenerator;

  beforeEach(() => {
    reporter = new ReportGenerator();
  });

  it('should generate a report with correct structure', () => {
    const findings: Finding[] = [
      {
        id: 'test-1',
        category: FindingCategory.SECURITY,
        severity: Severity.CRITICAL,
        title: 'Test Finding',
        description: 'Test description',
        location: '/src/test.ts',
        impact: { score: 10, description: 'High' },
        effort: { hours: 1, complexity: 'simple' },
        recommendation: { action: 'Fix it', steps: [], testingStrategy: '', rollbackPlan: '', successCriteria: [] }
      }
    ];

    const fileCleanup = { files: [], totalSize: 0, categorization: {} };
    const metadata = { generatedAt: new Date(), scanDuration: 100, projectPath: '/project', analysisVersion: '1.0.0' };

    const report = reporter.generateReport(findings, fileCleanup, metadata);

    expect(report).toBeDefined();
    expect(report.findings).toHaveLength(1);
    expect(report.summary.totalFindings).toBe(1);
    expect(report.summary.findingsBySeverity.critical).toBe(1);
  });

  it('should format Markdown correctly', () => {
    const findings: Finding[] = [];
    const fileCleanup = { files: [], totalSize: 0, categorization: {} };
    const metadata = { generatedAt: new Date(), scanDuration: 100, projectPath: '/project', analysisVersion: '1.0.0' };

    const report = reporter.generateReport(findings, fileCleanup, metadata);
    const markdown = reporter.toMarkdown(report);

    expect(markdown).toContain('# 🔍 ISP-FinTrack Project Analysis Report');
    expect(markdown).toContain('## 📊 Executive Summary');
  });

  it('should output JSON correctly', () => {
    const findings: Finding[] = [];
    const fileCleanup = { files: [], totalSize: 0, categorization: {} };
    const metadata = { generatedAt: new Date(), scanDuration: 100, projectPath: '/project', analysisVersion: '1.0.0' };

    const report = reporter.generateReport(findings, fileCleanup, metadata);
    const json = reporter.toJSON(report);

    expect(JSON.parse(json)).toBeDefined();
    expect(JSON.parse(json).summary).toBeDefined();
  });
});
