/**
 * Core type definitions for the ISP-FinTrack Project Analysis System.
 * This module defines all interfaces, enums, and type aliases used
 * across the analysis pipeline.
 *
 * Pipeline: FileScanner → CleanupEngine → AnalysisEngine → ReportGenerator
 */

// ─────────────────────────────────────────────────────────────────────────────
// FILE CLASSIFICATION
// ─────────────────────────────────────────────────────────────────────────────

export enum FileType {
 SOURCE ='source',
 DEBUG ='debug',
 BACKUP ='backup',
 LOG ='log',
 SCRIPT ='script',
 ARTIFACT ='artifact',
 CONFIG ='config',
 DOCUMENTATION ='documentation',
 ASSET ='asset',
}

export interface FileMetadata {
 path: string;
 size: number; // bytes
 type: FileType;
 lastModified: Date;
 isReferenced: boolean;
 referencedBy: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// DEPENDENCY GRAPH
// ─────────────────────────────────────────────────────────────────────────────

export interface FileNode {
 path: string;
 imports: string[];
 importedBy: string[];
}

export interface DependencyGraph {
 nodes: Map<string, FileNode>;
 edges: Map<string, string[]>; // file → dependencies
}

// ─────────────────────────────────────────────────────────────────────────────
// FINDINGS
// ─────────────────────────────────────────────────────────────────────────────

export enum FindingCategory {
 FILE_CLEANUP ='file_cleanup',
 STRUCTURE ='structure',
 UI_UX ='ui_ux',
 PERFORMANCE ='performance',
 CODE_QUALITY ='code_quality',
 SECURITY ='security',
 DATABASE ='database',
 BEST_PRACTICES ='best_practices',
}

export enum Severity {
 CRITICAL ='critical',
 HIGH ='high',
 MEDIUM ='medium',
 LOW ='low',
}

export interface ImpactEstimate {
 /** Score from 1 (negligible) to 10 (transformational) */
 score: number;
 description: string;
 metrics?: {
 performanceGain?: string; // e.g."50ms reduction"
 spaceSaving?: string; // e.g."2.5 MB"
 maintainabilityImprovement?: string;
 };
}

export interface EffortEstimate {
 hours: number;
 complexity:'trivial'|'simple'|'moderate'|'complex';
}

export interface Recommendation {
 action: string;
 steps: string[];
 codeExample?: {
 before: string;
 after: string;
 };
 commands?: string[];
 testingStrategy: string;
 rollbackPlan: string;
 successCriteria: string[];
 /** IDs of prerequisite findings that must be resolved first */
 dependencies?: string[];
}

export interface Finding {
 id: string;
 category: FindingCategory;
 severity: Severity;
 title: string;
 description: string;
 location: string;
 impact: ImpactEstimate;
 effort: EffortEstimate;
 recommendation: Recommendation;
}

// ─────────────────────────────────────────────────────────────────────────────
// REPORT STRUCTURE
// ─────────────────────────────────────────────────────────────────────────────

export interface ReportMetadata {
 generatedAt: Date;
 projectPath: string;
 analysisVersion: string;
 scanDuration: number; // milliseconds
}

export interface ReportSummary {
 totalFilesScanned: number;
 totalFilesToDelete: number;
 totalSpaceSavings: string;
 totalFindings: number;
 findingsBySeverity: Record<Severity, number>;
 findingsByCategory: Record<FindingCategory, number>;
 estimatedTotalImpact: number;
 estimatedTotalEffort: number;
}

export interface FileCleanupSection {
 files: FileMetadata[];
 totalSize: number;
 categorization: Partial<Record<FileType, FileMetadata[]>>;
}

export interface Phase {
 name: string;
 description: string;
 findings: string[]; // Finding IDs
 estimatedDuration: string;
 prerequisites: string[];
}

export interface ImplementationPlan {
 quickWins: Finding[]; // < 2 hours, high impact
 shortTerm: Finding[]; // 2–8 hours
 longTerm: Finding[]; // > 8 hours
 phases: Phase[];
}

export interface AnalysisReport {
 metadata: ReportMetadata;
 summary: ReportSummary;
 filesToDelete: FileCleanupSection;
 findings: Finding[];
 implementationPlan: ImplementationPlan;
}

// ─────────────────────────────────────────────────────────────────────────────
// ANALYSIS CONTEXT (shared across all analyzers)
// ─────────────────────────────────────────────────────────────────────────────

export interface AnalysisContext {
 files: FileMetadata[];
 dependencyGraph: DependencyGraph;
 projectRoot: string;
 packageJson: Record<string, any>;
 tsConfig: Record<string, any>;
}

// ─────────────────────────────────────────────────────────────────────────────
// ANALYZER INTERFACE
// ─────────────────────────────────────────────────────────────────────────────

export interface IAnalyzer {
 name: string;
 category: FindingCategory;
 analyze(context: AnalysisContext): Promise<Finding[]>;
}

// ─────────────────────────────────────────────────────────────────────────────
// ERROR HANDLING
// ─────────────────────────────────────────────────────────────────────────────

export enum ErrorCategory {
 FILE_SYSTEM ='file_system',
 PARSE ='parse',
 ANALYSIS ='analysis',
 REPORT ='report',
}

export enum ErrorSeverity {
 FATAL ='fatal', // Stop analysis
 ERROR ='error', // Skip item, continue
 WARNING ='warning', // Log, continue
}

export class AnalysisError extends Error {
 constructor(
 message: string,
 public readonly category: ErrorCategory,
 public readonly severity: ErrorSeverity,
 public readonly context?: unknown,
 ) {
 super(message);
 this.name ='AnalysisError';
 }
}

// ─────────────────────────────────────────────────────────────────────────────
// PROGRESS TRACKING
// ─────────────────────────────────────────────────────────────────────────────

export interface AnalysisProgress {
 totalAnalyzers: number;
 completedAnalyzers: number;
 currentAnalyzer: string;
 startTime: Date;
 estimatedCompletion?: Date;
}
