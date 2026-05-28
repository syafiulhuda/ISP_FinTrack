import { describe, it, expect, vi, beforeEach } from'vitest';
import path from'path';
import { BestPracticesAnalyzer } from'./best-practices';
import fs from'fs';
import { AnalysisContext, FileMetadata, FileType, FindingCategory, Severity } from'../types';

vi.mock('fs');

function makeContext(overrides: Partial<AnalysisContext> = {}): AnalysisContext {
 return { projectRoot:'/project', files: [], dependencyGraph: { nodes: new Map(), edges: new Map() }, packageJson: {}, tsConfig: {}, ...overrides };
}

function makeFile(path: string, overrides: Partial<FileMetadata> = {}): FileMetadata {
 return { path, size: 1024, type: FileType.SOURCE, lastModified: new Date(), isReferenced: true, referencedBy: [], ...overrides };
}

describe('BestPracticesAnalyzer', () => {
 let analyzer: BestPracticesAnalyzer;

 beforeEach(() => {
 analyzer = new BestPracticesAnalyzer();
 vi.spyOn(analyzer as any,'readFile').mockReturnValue('');
 vi.spyOn(fs,'existsSync').mockReturnValue(false); // Default: missing files
 });

 it('should have correct name and category', () => {
 expect(analyzer.name).toBe('BestPracticesAnalyzer');
 expect(analyzer.category).toBe(FindingCategory.BEST_PRACTICES);
 });

 describe('Missing loading.tsx', () => {
 it('should flag missing loading.tsx for app pages', async () => {
 const ctx = makeContext({ files: [makeFile(path.join('project','app','dashboard','page.tsx'))] });
 const findings = await analyzer.analyze(ctx);
 expect(findings.some(f => f.title.includes('Missing \`loading.tsx\`'))).toBe(true);
 });
 });

 describe('Missing error.tsx', () => {
 it('should flag missing error.tsx for app pages', async () => {
 const ctx = makeContext({ files: [makeFile(path.join('project','app','dashboard','page.tsx'))] });
 const findings = await analyzer.analyze(ctx);
 expect(findings.some(f => f.title.includes('Missing \`error.tsx\`'))).toBe(true);
 });
 });

 describe('Client-only in Server Components', () => {
 it('should flag hooks usage without use client directive', async () => {
 (analyzer as any).readFile.mockReturnValue('import { useState } from"react";\nuseState();');
 const ctx = makeContext({ files: [makeFile(path.join('project','app','components','ClientWidget.tsx'))] });
 const findings = await analyzer.analyze(ctx);
 expect(findings.some(f => f.title.includes('React Hook Used in Server Component'))).toBe(true);
 });
 });

 describe('Missing OG/Twitter metadata', () => {
 it('should flag missing OpenGraph in root layout', async () => {
 (analyzer as any).readFile.mockReturnValue('export const metadata = { title:"App"};');
 const ctx = makeContext({ files: [makeFile(path.join('project','app','layout.tsx'))] });
 const findings = await analyzer.analyze(ctx);
 expect(findings.some(f => f.title.includes('Missing OpenGraph / Twitter Card Metadata'))).toBe(true);
 });
 });

 describe('Missing dynamic export', () => {
 it('should flag missing dynamic export for real-time pages', async () => {
 (analyzer as any).readFile.mockReturnValue('export default function Dashboard() {}');
 const ctx = makeContext({ files: [makeFile(path.join('project','app','dashboard','page.tsx'))] });
 const findings = await analyzer.analyze(ctx);
 expect(findings.some(f => f.title.includes('Missing \`export const dynamic\`'))).toBe(true);
 });
 });
});
