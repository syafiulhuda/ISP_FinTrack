import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'path';
import { UIUXAnalyzer } from './uiux';
import { AnalysisContext, FileMetadata, FileType, FindingCategory, Severity } from '../types';

function makeContext(overrides: Partial<AnalysisContext> = {}): AnalysisContext {
  return { projectRoot: '/project', files: [], dependencyGraph: { nodes: new Map(), edges: new Map() }, packageJson: {}, tsConfig: {}, ...overrides };
}

function makeFile(path: string, overrides: Partial<FileMetadata> = {}): FileMetadata {
  return { path, size: 1024, type: FileType.SOURCE, lastModified: new Date(), isReferenced: true, referencedBy: [], ...overrides };
}

describe('UIUXAnalyzer', () => {
  let analyzer: UIUXAnalyzer;

  beforeEach(() => {
    analyzer = new UIUXAnalyzer();
    vi.spyOn(analyzer as any, 'readFile').mockReturnValue('');
  });

  it('should have correct name and category', () => {
    expect(analyzer.name).toBe('UIUXAnalyzer');
    expect(analyzer.category).toBe(FindingCategory.UI_UX);
  });

  describe('window.prompt check', () => {
    it('should flag window.prompt usage', async () => {
      (analyzer as any).readFile.mockReturnValue('const val = window.prompt("Enter value");');
      const ctx = makeContext({ files: [makeFile(path.join('project', 'src', 'components', 'Input.tsx'))] });
      const findings = await analyzer.analyze(ctx);
      expect(findings.some(f => f.title.includes('\`window.prompt\`'))).toBe(true);
    });
  });

  describe('Missing ARIA labels check', () => {
    it('should flag icon-only buttons missing aria-label', async () => {
      (analyzer as any).readFile.mockReturnValue('<button><Icon size={20} /></button>');
      const ctx = makeContext({ files: [makeFile(path.join('project', 'src', 'components', 'Button.tsx'))] });
      const findings = await analyzer.analyze(ctx);
      expect(findings.some(f => f.title.includes('Missing \`aria-label\`'))).toBe(true);
    });
  });

  describe('AnimatePresence CLS check', () => {
    it('should flag AnimatePresence with layout prop', async () => {
      (analyzer as any).readFile.mockReturnValue('<AnimatePresence>\n <motion.div layout={true}>\n</AnimatePresence>');
      const ctx = makeContext({ files: [makeFile(path.join('project', 'src', 'components', 'Modal.tsx'))] });
      const findings = await analyzer.analyze(ctx);
      expect(findings.some(f => f.title.includes('Possible CLS'))).toBe(true);
    });
  });

  describe('Unsafe image src check', () => {
    it('should flag raw img tags', async () => {
      (analyzer as any).readFile.mockReturnValue('<img src="/logo.png" />');
      const ctx = makeContext({ files: [makeFile(path.join('project', 'src', 'components', 'Logo.tsx'))] });
      const findings = await analyzer.analyze(ctx);
      expect(findings.some(f => f.title.includes('Raw \`<img>\` Tags'))).toBe(true);
    });
  });

  describe('Hardcoded Unsplash URLs check', () => {
    it('should flag unsplash URLs', async () => {
      (analyzer as any).readFile.mockReturnValue('const avatar = "https://images.unsplash.com/photo";');
      const ctx = makeContext({ files: [makeFile(path.join('project', 'src', 'components', 'Avatar.tsx'))] });
      const findings = await analyzer.analyze(ctx);
      expect(findings.some(f => f.title.includes('Hardcoded Unsplash URL'))).toBe(true);
    });
  });
});
