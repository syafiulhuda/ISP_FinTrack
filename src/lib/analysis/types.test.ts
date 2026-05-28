/**
 * Unit tests for type validation
 * **Validates: Requirements 1.7**
 * 
 * Tests that enum values are correctly defined and type structures match design specifications
 */

import { describe, it, expect } from'vitest';
import {
 FileType,
 FindingCategory,
 Severity,
 ErrorCategory,
 ErrorSeverity,
 AnalysisError,
 type FileMetadata,
 type Finding,
 type ImpactEstimate,
 type EffortEstimate,
 type Recommendation,
 type AnalysisReport,
 type ReportMetadata,
 type ReportSummary,
 type FileCleanupSection,
 type ImplementationPlan,
 type Phase,
 type DependencyGraph,
 type FileNode,
 type AnalysisContext,
 type IAnalyzer,
 type AnalysisProgress,
} from'./types';

describe('Enum Definitions', () => {
 describe('FileType enum', () => {
 it('should have all required file type values', () => {
 expect(FileType.SOURCE).toBe('source');
 expect(FileType.DEBUG).toBe('debug');
 expect(FileType.BACKUP).toBe('backup');
 expect(FileType.LOG).toBe('log');
 expect(FileType.SCRIPT).toBe('script');
 expect(FileType.ARTIFACT).toBe('artifact');
 expect(FileType.CONFIG).toBe('config');
 expect(FileType.DOCUMENTATION).toBe('documentation');
 expect(FileType.ASSET).toBe('asset');
 });

 it('should have exactly 9 file types', () => {
 const fileTypes = Object.values(FileType);
 expect(fileTypes).toHaveLength(9);
 });
 });

 describe('FindingCategory enum', () => {
 it('should have all required category values', () => {
 expect(FindingCategory.FILE_CLEANUP).toBe('file_cleanup');
 expect(FindingCategory.STRUCTURE).toBe('structure');
 expect(FindingCategory.UI_UX).toBe('ui_ux');
 expect(FindingCategory.PERFORMANCE).toBe('performance');
 expect(FindingCategory.CODE_QUALITY).toBe('code_quality');
 expect(FindingCategory.SECURITY).toBe('security');
 expect(FindingCategory.DATABASE).toBe('database');
 expect(FindingCategory.BEST_PRACTICES).toBe('best_practices');
 });

 it('should have exactly 8 finding categories', () => {
 const categories = Object.values(FindingCategory);
 expect(categories).toHaveLength(8);
 });
 });

 describe('Severity enum', () => {
 it('should have all required severity levels', () => {
 expect(Severity.CRITICAL).toBe('critical');
 expect(Severity.HIGH).toBe('high');
 expect(Severity.MEDIUM).toBe('medium');
 expect(Severity.LOW).toBe('low');
 });

 it('should have exactly 4 severity levels', () => {
 const severities = Object.values(Severity);
 expect(severities).toHaveLength(4);
 });
 });

 describe('ErrorCategory enum', () => {
 it('should have all required error category values', () => {
 expect(ErrorCategory.FILE_SYSTEM).toBe('file_system');
 expect(ErrorCategory.PARSE).toBe('parse');
 expect(ErrorCategory.ANALYSIS).toBe('analysis');
 expect(ErrorCategory.REPORT).toBe('report');
 });

 it('should have exactly 4 error categories', () => {
 const categories = Object.values(ErrorCategory);
 expect(categories).toHaveLength(4);
 });
 });

 describe('ErrorSeverity enum', () => {
 it('should have all required error severity levels', () => {
 expect(ErrorSeverity.FATAL).toBe('fatal');
 expect(ErrorSeverity.ERROR).toBe('error');
 expect(ErrorSeverity.WARNING).toBe('warning');
 });

 it('should have exactly 3 error severity levels', () => {
 const severities = Object.values(ErrorSeverity);
 expect(severities).toHaveLength(3);
 });
 });
});

describe('Type Structure Validation', () => {
 describe('FileMetadata interface', () => {
 it('should accept valid FileMetadata object', () => {
 const fileMetadata: FileMetadata = {
 path:'/src/test.ts',
 size: 1024,
 type: FileType.SOURCE,
 lastModified: new Date(),
 isReferenced: true,
 referencedBy: ['/src/app.ts'],
 };

 expect(fileMetadata.path).toBe('/src/test.ts');
 expect(fileMetadata.size).toBe(1024);
 expect(fileMetadata.type).toBe(FileType.SOURCE);
 expect(fileMetadata.isReferenced).toBe(true);
 expect(fileMetadata.referencedBy).toHaveLength(1);
 });
 });

 describe('ImpactEstimate interface', () => {
 it('should accept valid ImpactEstimate with metrics', () => {
 const impact: ImpactEstimate = {
 score: 8,
 description:'Significant performance improvement',
 metrics: {
 performanceGain:'50ms reduction',
 spaceSaving:'2.5MB',
 maintainabilityImprovement:'High',
 },
 };

 expect(impact.score).toBe(8);
 expect(impact.metrics?.performanceGain).toBe('50ms reduction');
 expect(impact.metrics?.spaceSaving).toBe('2.5MB');
 });

 it('should accept valid ImpactEstimate without metrics', () => {
 const impact: ImpactEstimate = {
 score: 5,
 description:'Moderate improvement',
 };

 expect(impact.score).toBe(5);
 expect(impact.metrics).toBeUndefined();
 });
 });

 describe('EffortEstimate interface', () => {
 it('should accept valid EffortEstimate with all complexity levels', () => {
 const trivial: EffortEstimate = { hours: 0.5, complexity:'trivial'};
 const simple: EffortEstimate = { hours: 2, complexity:'simple'};
 const moderate: EffortEstimate = { hours: 5, complexity:'moderate'};
 const complex: EffortEstimate = { hours: 10, complexity:'complex'};

 expect(trivial.complexity).toBe('trivial');
 expect(simple.complexity).toBe('simple');
 expect(moderate.complexity).toBe('moderate');
 expect(complex.complexity).toBe('complex');
 });
 });

 describe('Recommendation interface', () => {
 it('should accept valid Recommendation with all fields', () => {
 const recommendation: Recommendation = {
 action:'Refactor component',
 steps: ['Step 1','Step 2'],
 codeExample: {
 before:'const x = any;',
 after:'const x: string ="value";',
 },
 commands: ['npm run test'],
 testingStrategy:'Run unit tests',
 rollbackPlan:'Revert commit',
 successCriteria: ['Tests pass','No errors'],
 dependencies: ['finding-1'],
 };

 expect(recommendation.action).toBe('Refactor component');
 expect(recommendation.steps).toHaveLength(2);
 expect(recommendation.codeExample?.before).toContain('any');
 expect(recommendation.commands).toHaveLength(1);
 expect(recommendation.successCriteria).toHaveLength(2);
 });

 it('should accept valid Recommendation with minimal fields', () => {
 const recommendation: Recommendation = {
 action:'Fix issue',
 steps: ['Fix it'],
 testingStrategy:'Manual test',
 rollbackPlan:'Revert',
 successCriteria: ['Works'],
 };

 expect(recommendation.codeExample).toBeUndefined();
 expect(recommendation.commands).toBeUndefined();
 expect(recommendation.dependencies).toBeUndefined();
 });
 });

 describe('Finding interface', () => {
 it('should accept valid Finding object', () => {
 const finding: Finding = {
 id:'finding-1',
 category: FindingCategory.CODE_QUALITY,
 severity: Severity.HIGH,
 title:'Type safety issue',
 description:'Using any type',
 location:'/src/test.ts:10',
 impact: {
 score: 7,
 description:'Improves type safety',
 },
 effort: {
 hours: 2,
 complexity:'simple',
 },
 recommendation: {
 action:'Add proper types',
 steps: ['Define interface','Apply type'],
 testingStrategy:'Run type checker',
 rollbackPlan:'Revert changes',
 successCriteria: ['No type errors'],
 },
 };

 expect(finding.id).toBe('finding-1');
 expect(finding.category).toBe(FindingCategory.CODE_QUALITY);
 expect(finding.severity).toBe(Severity.HIGH);
 expect(finding.impact.score).toBe(7);
 expect(finding.effort.hours).toBe(2);
 });
 });

 describe('ReportMetadata interface', () => {
 it('should accept valid ReportMetadata', () => {
 const metadata: ReportMetadata = {
 generatedAt: new Date(),
 projectPath:'/project',
 analysisVersion:'1.0.0',
 scanDuration: 5000,
 };

 expect(metadata.projectPath).toBe('/project');
 expect(metadata.analysisVersion).toBe('1.0.0');
 expect(metadata.scanDuration).toBe(5000);
 });
 });

 describe('ReportSummary interface', () => {
 it('should accept valid ReportSummary with all metrics', () => {
 const summary: ReportSummary = {
 totalFilesScanned: 100,
 totalFilesToDelete: 10,
 totalSpaceSavings:'5MB',
 totalFindings: 25,
 findingsBySeverity: {
 [Severity.CRITICAL]: 2,
 [Severity.HIGH]: 5,
 [Severity.MEDIUM]: 10,
 [Severity.LOW]: 8,
 },
 findingsByCategory: {
 [FindingCategory.FILE_CLEANUP]: 5,
 [FindingCategory.STRUCTURE]: 3,
 [FindingCategory.UI_UX]: 2,
 [FindingCategory.PERFORMANCE]: 4,
 [FindingCategory.CODE_QUALITY]: 6,
 [FindingCategory.SECURITY]: 2,
 [FindingCategory.DATABASE]: 2,
 [FindingCategory.BEST_PRACTICES]: 1,
 },
 estimatedTotalImpact: 150,
 estimatedTotalEffort: 40,
 };

 expect(summary.totalFilesScanned).toBe(100);
 expect(summary.findingsBySeverity[Severity.CRITICAL]).toBe(2);
 expect(summary.findingsByCategory[FindingCategory.CODE_QUALITY]).toBe(6);
 });
 });

 describe('FileCleanupSection interface', () => {
 it('should accept valid FileCleanupSection', () => {
 const cleanup: FileCleanupSection = {
 files: [
 {
 path:'/debug/test.log',
 size: 1024,
 type: FileType.LOG,
 lastModified: new Date(),
 isReferenced: false,
 referencedBy: [],
 },
 ],
 totalSize: 1024,
 categorization: {
 [FileType.SOURCE]: [],
 [FileType.DEBUG]: [],
 [FileType.BACKUP]: [],
 [FileType.LOG]: [
 {
 path:'/debug/test.log',
 size: 1024,
 type: FileType.LOG,
 lastModified: new Date(),
 isReferenced: false,
 referencedBy: [],
 },
 ],
 [FileType.SCRIPT]: [],
 [FileType.ARTIFACT]: [],
 [FileType.CONFIG]: [],
 [FileType.DOCUMENTATION]: [],
 [FileType.ASSET]: [],
 },
 };

 expect(cleanup.files).toHaveLength(1);
 expect(cleanup.totalSize).toBe(1024);
 expect(cleanup.categorization[FileType.LOG]).toHaveLength(1);
 });
 });

 describe('Phase interface', () => {
 it('should accept valid Phase object', () => {
 const phase: Phase = {
 name:'Quick Wins',
 description:'Easy improvements',
 findings: ['finding-1','finding-2'],
 estimatedDuration:'2 hours',
 prerequisites: [],
 };

 expect(phase.name).toBe('Quick Wins');
 expect(phase.findings).toHaveLength(2);
 expect(phase.prerequisites).toHaveLength(0);
 });
 });

 describe('ImplementationPlan interface', () => {
 it('should accept valid ImplementationPlan', () => {
 const mockFinding: Finding = {
 id:'test-1',
 category: FindingCategory.CODE_QUALITY,
 severity: Severity.LOW,
 title:'Test',
 description:'Test finding',
 location:'/test',
 impact: { score: 1, description:'Low'},
 effort: { hours: 1, complexity:'trivial'},
 recommendation: {
 action:'Fix',
 steps: [],
 testingStrategy:'Test',
 rollbackPlan:'Revert',
 successCriteria: [],
 },
 };

 const plan: ImplementationPlan = {
 quickWins: [mockFinding],
 shortTerm: [],
 longTerm: [],
 phases: [
 {
 name:'Phase 1',
 description:'First phase',
 findings: ['test-1'],
 estimatedDuration:'1 hour',
 prerequisites: [],
 },
 ],
 };

 expect(plan.quickWins).toHaveLength(1);
 expect(plan.phases).toHaveLength(1);
 });
 });

 describe('DependencyGraph interface', () => {
 it('should accept valid DependencyGraph', () => {
 const graph: DependencyGraph = {
 nodes: new Map([
 [
'/src/app.ts',
 {
 path:'/src/app.ts',
 imports: ['/src/lib.ts'],
 importedBy: [],
 },
 ],
 ]),
 edges: new Map([['/src/app.ts', ['/src/lib.ts']]]),
 };

 expect(graph.nodes.size).toBe(1);
 expect(graph.edges.size).toBe(1);
 expect(graph.nodes.get('/src/app.ts')?.imports).toHaveLength(1);
 });
 });

 describe('FileNode interface', () => {
 it('should accept valid FileNode', () => {
 const node: FileNode = {
 path:'/src/test.ts',
 imports: ['/src/lib.ts'],
 importedBy: ['/src/app.ts'],
 };

 expect(node.path).toBe('/src/test.ts');
 expect(node.imports).toHaveLength(1);
 expect(node.importedBy).toHaveLength(1);
 });
 });

 describe('AnalysisContext interface', () => {
 it('should accept valid AnalysisContext', () => {
 const context: AnalysisContext = {
 files: [],
 dependencyGraph: {
 nodes: new Map(),
 edges: new Map(),
 },
 projectRoot:'/project',
 packageJson: { name:'test'},
 tsConfig: { compilerOptions: {} },
 };

 expect(context.projectRoot).toBe('/project');
 expect(context.files).toHaveLength(0);
 expect(context.packageJson.name).toBe('test');
 });
 });

 describe('IAnalyzer interface', () => {
 it('should accept valid IAnalyzer implementation', () => {
 const analyzer: IAnalyzer = {
 name:'TestAnalyzer',
 category: FindingCategory.CODE_QUALITY,
 analyze: async (context: AnalysisContext) => {
 return [];
 },
 };

 expect(analyzer.name).toBe('TestAnalyzer');
 expect(analyzer.category).toBe(FindingCategory.CODE_QUALITY);
 expect(typeof analyzer.analyze).toBe('function');
 });
 });

 describe('AnalysisProgress interface', () => {
 it('should accept valid AnalysisProgress', () => {
 const progress: AnalysisProgress = {
 totalAnalyzers: 10,
 completedAnalyzers: 5,
 currentAnalyzer:'CodeQualityAnalyzer',
 startTime: new Date(),
 estimatedCompletion: new Date(),
 };

 expect(progress.totalAnalyzers).toBe(10);
 expect(progress.completedAnalyzers).toBe(5);
 expect(progress.currentAnalyzer).toBe('CodeQualityAnalyzer');
 });
 });

 describe('AnalysisReport interface', () => {
 it('should accept valid complete AnalysisReport', () => {
 const report: AnalysisReport = {
 metadata: {
 generatedAt: new Date(),
 projectPath:'/project',
 analysisVersion:'1.0.0',
 scanDuration: 5000,
 },
 summary: {
 totalFilesScanned: 100,
 totalFilesToDelete: 10,
 totalSpaceSavings:'5MB',
 totalFindings: 25,
 findingsBySeverity: {
 [Severity.CRITICAL]: 2,
 [Severity.HIGH]: 5,
 [Severity.MEDIUM]: 10,
 [Severity.LOW]: 8,
 },
 findingsByCategory: {
 [FindingCategory.FILE_CLEANUP]: 5,
 [FindingCategory.STRUCTURE]: 3,
 [FindingCategory.UI_UX]: 2,
 [FindingCategory.PERFORMANCE]: 4,
 [FindingCategory.CODE_QUALITY]: 6,
 [FindingCategory.SECURITY]: 2,
 [FindingCategory.DATABASE]: 2,
 [FindingCategory.BEST_PRACTICES]: 1,
 },
 estimatedTotalImpact: 150,
 estimatedTotalEffort: 40,
 },
 filesToDelete: {
 files: [],
 totalSize: 0,
 categorization: {
 [FileType.SOURCE]: [],
 [FileType.DEBUG]: [],
 [FileType.BACKUP]: [],
 [FileType.LOG]: [],
 [FileType.SCRIPT]: [],
 [FileType.ARTIFACT]: [],
 [FileType.CONFIG]: [],
 [FileType.DOCUMENTATION]: [],
 [FileType.ASSET]: [],
 },
 },
 findings: [],
 implementationPlan: {
 quickWins: [],
 shortTerm: [],
 longTerm: [],
 phases: [],
 },
 };

 expect(report.metadata.projectPath).toBe('/project');
 expect(report.summary.totalFilesScanned).toBe(100);
 expect(report.filesToDelete.files).toHaveLength(0);
 expect(report.findings).toHaveLength(0);
 });
 });
});

describe('AnalysisError class', () => {
 it('should create AnalysisError with all properties', () => {
 const error = new AnalysisError(
'Test error',
 ErrorCategory.PARSE,
 ErrorSeverity.ERROR,
 { file:'test.ts'}
 );

 expect(error.message).toBe('Test error');
 expect(error.category).toBe(ErrorCategory.PARSE);
 expect(error.severity).toBe(ErrorSeverity.ERROR);
 expect(error.context).toEqual({ file:'test.ts'});
 expect(error.name).toBe('AnalysisError');
 });

 it('should create AnalysisError without context', () => {
 const error = new AnalysisError(
'Test error',
 ErrorCategory.FILE_SYSTEM,
 ErrorSeverity.FATAL
 );

 expect(error.message).toBe('Test error');
 expect(error.context).toBeUndefined();
 });

 it('should be instanceof Error', () => {
 const error = new AnalysisError(
'Test error',
 ErrorCategory.ANALYSIS,
 ErrorSeverity.WARNING
 );

 expect(error instanceof Error).toBe(true);
 expect(error instanceof AnalysisError).toBe(true);
 });
});
