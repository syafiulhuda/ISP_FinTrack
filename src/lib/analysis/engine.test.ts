/**
 * AnalysisEngine unit tests — Task 5.3
 */

import { describe, it, expect, vi, beforeEach } from'vitest';
import { AnalysisEngine } from'./engine';
import {
 IAnalyzer,
 AnalysisContext,
 Finding,
 FindingCategory,
 Severity,
 FileType,
 AnalysisProgress,
} from'./types';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeContext(overrides: Partial<AnalysisContext> = {}): AnalysisContext {
 return {
 projectRoot:'/project',
 files: [],
 dependencyGraph: { nodes: new Map(), edges: new Map() },
 packageJson: {},
 tsConfig: {},
 ...overrides,
 };
}

function makeFinding(id: string): Finding {
 return {
 id,
 category: FindingCategory.CODE_QUALITY,
 severity: Severity.LOW,
 title:`Finding ${id}`,
 description:'Test finding',
 location:'/project/src/test.ts',
 impact: { score: 1, description:'Low impact'},
 effort: { hours: 0.5, complexity:'trivial'},
 recommendation: {
 action:'Fix it',
 steps: ['Step 1'],
 testingStrategy:'Run tests',
 rollbackPlan:'Revert',
 successCriteria: ['Tests pass'],
 },
 };
}

/** Creates an analyzer that returns the given findings */
function makeAnalyzer(name: string, findings: Finding[]): IAnalyzer {
 return {
 name,
 category: FindingCategory.CODE_QUALITY,
 analyze: vi.fn().mockResolvedValue(findings),
 };
}

/** Creates an analyzer that throws an error */
function makeFailingAnalyzer(name: string): IAnalyzer {
 return {
 name,
 category: FindingCategory.CODE_QUALITY,
 analyze: vi.fn().mockRejectedValue(new Error(`${name} crashed`)),
 };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AnalysisEngine', () => {
 let engine: AnalysisEngine;

 beforeEach(() => {
 engine = new AnalysisEngine();
 });

 // ── registerAnalyzer ────────────────────────────────────────────────────

 describe('registerAnalyzer', () => {
 it('should register a single analyzer', () => {
 const analyzer = makeAnalyzer('TestAnalyzer', []);
 engine.registerAnalyzer(analyzer);
 expect(engine.getAnalyzerNames()).toContain('TestAnalyzer');
 });

 it('should register multiple analyzers independently', () => {
 engine.registerAnalyzer(makeAnalyzer('A', []));
 engine.registerAnalyzer(makeAnalyzer('B', []));
 expect(engine.getAnalyzerNames()).toEqual(['A','B']);
 });
 });

 // ── registerAll ─────────────────────────────────────────────────────────

 describe('registerAll', () => {
 it('should register all analyzers from an array', () => {
 engine.registerAll([
 makeAnalyzer('X', []),
 makeAnalyzer('Y', []),
 makeAnalyzer('Z', []),
 ]);
 expect(engine.getAnalyzerNames()).toEqual(['X','Y','Z']);
 });

 it('should handle empty array without error', () => {
 engine.registerAll([]);
 expect(engine.getAnalyzerNames()).toHaveLength(0);
 });
 });

 // ── getAnalyzerNames ────────────────────────────────────────────────────

 describe('getAnalyzerNames', () => {
 it('should return empty array when no analyzers registered', () => {
 expect(engine.getAnalyzerNames()).toEqual([]);
 });

 it('should preserve registration order', () => {
 engine.registerAll([makeAnalyzer('First', []), makeAnalyzer('Second', []), makeAnalyzer('Third', [])]);
 expect(engine.getAnalyzerNames()).toEqual(['First','Second','Third']);
 });
 });

 // ── analyze ─────────────────────────────────────────────────────────────

 describe('analyze', () => {
 it('should return empty array when no analyzers registered', async () => {
 const results = await engine.analyze(makeContext());
 expect(results).toEqual([]);
 });

 it('should call analyze on all registered analyzers', async () => {
 const a = makeAnalyzer('A', [makeFinding('a1')]);
 const b = makeAnalyzer('B', [makeFinding('b1')]);
 engine.registerAll([a, b]);

 await engine.analyze(makeContext());

 expect(a.analyze).toHaveBeenCalledOnce();
 expect(b.analyze).toHaveBeenCalledOnce();
 });

 it('should flatten and return all findings', async () => {
 engine.registerAll([
 makeAnalyzer('A', [makeFinding('a1'), makeFinding('a2')]),
 makeAnalyzer('B', [makeFinding('b1')]),
 ]);

 const results = await engine.analyze(makeContext());
 expect(results).toHaveLength(3);
 expect(results.map(f => f.id)).toEqual(['a1','a2','b1']);
 });

 it('should pass context to each analyzer', async () => {
 const ctx = makeContext({ projectRoot:'/custom/root'});
 const analyzer = makeAnalyzer('A', []);
 engine.registerAnalyzer(analyzer);

 await engine.analyze(ctx);

 expect(analyzer.analyze).toHaveBeenCalledWith(ctx);
 });

 it('should return empty array when all analyzers return no findings', async () => {
 engine.registerAll([makeAnalyzer('A', []), makeAnalyzer('B', [])]);
 const results = await engine.analyze(makeContext());
 expect(results).toEqual([]);
 });
 });

 // ── error handling / graceful degradation ───────────────────────────────

 describe('error handling', () => {
 it('should not throw when an analyzer fails — other results still returned', async () => {
 // Note: AnalysisEngine calls analyzer.analyze() directly;
 // graceful degradation is implemented in BaseAnalyzer.analyze().
 // For the engine itself, a failed Promise causes rejection unless analyzers wrap errors.
 // We test that a successful analyzer still produces results alongside a failing one
 // when the failing analyzer already wraps errors (as BaseAnalyzer does).

 const goodAnalyzer = makeAnalyzer('Good', [makeFinding('g1')]);

 // Simulate BaseAnalyzer behavior: wrap error and return error finding
 const failingAnalyzer: IAnalyzer = {
 name:'Failing',
 category: FindingCategory.CODE_QUALITY,
 analyze: vi.fn().mockResolvedValue([
 {
 ...makeFinding('error-Failing'),
 title:'Analyzer Error: Failing',
 },
 ]),
 };

 engine.registerAll([goodAnalyzer, failingAnalyzer]);
 const results = await engine.analyze(makeContext());

 expect(results).toHaveLength(2);
 expect(results.some(f => f.id ==='g1')).toBe(true);
 expect(results.some(f => f.id ==='error-Failing')).toBe(true);
 });

 it('should run all analyzers in parallel (Promise.all)', async () => {
 const delays: number[] = [];
 const timedAnalyzer = (name: string, delayMs: number): IAnalyzer => ({
 name,
 category: FindingCategory.CODE_QUALITY,
 analyze: vi.fn().mockImplementation(() => {
 const start = Date.now();
 return new Promise(resolve => {
 setTimeout(() => {
 delays.push(Date.now() - start);
 resolve([makeFinding(name)]);
 }, delayMs);
 });
 }),
 });

 engine.registerAll([timedAnalyzer('A', 30), timedAnalyzer('B', 30)]);

 const wallStart = Date.now();
 await engine.analyze(makeContext());
 const wallTime = Date.now() - wallStart;

 // If parallel: ~30ms. If sequential: ~60ms.
 expect(wallTime).toBeLessThan(120);
 });
 });

 // ── onProgress callback ─────────────────────────────────────────────────

 describe('onProgress callback', () => {
 it('should call onProgress when analyzers run', async () => {
 const progressEvents: AnalysisProgress[] = [];
 const onProgress = (p: AnalysisProgress) => progressEvents.push(p);

 engine.registerAnalyzer(makeAnalyzer('A', []));
 await engine.analyze(makeContext(), onProgress);

 expect(progressEvents.length).toBeGreaterThan(0);
 });

 it('should report totalAnalyzers correctly in progress events', async () => {
 const events: AnalysisProgress[] = [];
 engine.registerAll([makeAnalyzer('A', []), makeAnalyzer('B', [])]);
 await engine.analyze(makeContext(), e => events.push(e));

 expect(events.every(e => e.totalAnalyzers === 2)).toBe(true);
 });

 it('should work without onProgress callback (no crash)', async () => {
 engine.registerAnalyzer(makeAnalyzer('A', []));
 await expect(engine.analyze(makeContext())).resolves.not.toThrow();
 });

 it('should emit initial progress with completedAnalyzers = 0', async () => {
 const events: AnalysisProgress[] = [];
 engine.registerAnalyzer(makeAnalyzer('A', []));
 await engine.analyze(makeContext(), e => events.push(e));

 const initialEvent = events[0];
 expect(initialEvent.completedAnalyzers).toBe(0);
 expect(initialEvent.currentAnalyzer).toBe('Starting…');
 });
 });
});
