/**
 * AnalysisEngine — Task 5.1
 *
 * Orchestrates all registered analyzers. Each analyzer runs in parallel;
 * if one fails its BaseAnalyzer wrapper returns an error Finding instead
 * of crashing the pipeline.
 */

import {
 IAnalyzer,
 AnalysisContext,
 Finding,
 AnalysisProgress,
} from'./types';

type ProgressCallback = (progress: AnalysisProgress) => void;

export class AnalysisEngine {
 private analyzers: IAnalyzer[] = [];

 /** Register a concrete analyzer */
 registerAnalyzer(analyzer: IAnalyzer): void {
 this.analyzers.push(analyzer);
 }

 /** Register multiple analyzers at once */
 registerAll(analyzers: IAnalyzer[]): void {
 analyzers.forEach(a => this.registerAnalyzer(a));
 }

 /**
 * Runs all registered analyzers against`context`in parallel.
 * Progress updates are emitted via the optional`onProgress`callback.
 */
 async analyze(
 context: AnalysisContext,
 onProgress?: ProgressCallback,
 ): Promise<Finding[]> {
 const total = this.analyzers.length;
 let completed = 0;
 const startTime = new Date();

 // Emit initial progress
 onProgress?.({
 totalAnalyzers: total,
 completedAnalyzers: 0,
 currentAnalyzer:'Starting…',
 startTime,
 });

 // Run all analyzers in parallel — each wraps errors internally
 const resultsPerAnalyzer = await Promise.all(
 this.analyzers.map(async (analyzer): Promise<Finding[]> => {
 onProgress?.({
 totalAnalyzers: total,
 completedAnalyzers: completed,
 currentAnalyzer: analyzer.name,
 startTime,
 });

 const findings = await analyzer.analyze(context);

 completed++;
 onProgress?.({
 totalAnalyzers: total,
 completedAnalyzers: completed,
 currentAnalyzer: analyzer.name,
 startTime,
 });

 return findings;
 }),
 );

 // Flatten & return
 return resultsPerAnalyzer.flat();
 }

 /** Returns the names of all registered analyzers */
 getAnalyzerNames(): string[] {
 return this.analyzers.map(a => a.name);
 }
}
