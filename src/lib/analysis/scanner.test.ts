/**
 * Unit tests for FileScanner
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FileScanner } from './scanner';
import { FileType } from './types';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('FileScanner', () => {
  let scanner: FileScanner;
  let tempDir: string;

  beforeEach(async () => {
    scanner = new FileScanner();
    // Create a temporary directory for testing
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'scanner-test-'));
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Error cleaning up temp directory:', error);
    }
  });

  describe('scan', () => {
    it('should scan directory and return file metadata', async () => {
      // Create test files
      await fs.promises.writeFile(path.join(tempDir, 'test.ts'), 'export const x = 1;');
      await fs.promises.writeFile(path.join(tempDir, 'test.js'), 'const y = 2;');
      
      const files = await scanner.scan(tempDir);
      
      expect(files).toHaveLength(2);
      expect(files[0].path).toMatch(/test\.(ts|js)/);
      expect(files[0].size).toBeGreaterThan(0);
      expect(files[0].type).toBe(FileType.SOURCE);
    });

    it('should exclude node_modules directory', async () => {
      // Create node_modules directory with files
      const nodeModulesDir = path.join(tempDir, 'node_modules');
      await fs.promises.mkdir(nodeModulesDir);
      await fs.promises.writeFile(path.join(nodeModulesDir, 'package.js'), 'module.exports = {};');
      
      // Create regular file
      await fs.promises.writeFile(path.join(tempDir, 'app.ts'), 'export const app = 1;');
      
      const files = await scanner.scan(tempDir);
      
      expect(files).toHaveLength(1);
      expect(files[0].path).toBe('app.ts');
    });

    it('should exclude .next directory', async () => {
      // Create .next directory with files
      const nextDir = path.join(tempDir, '.next');
      await fs.promises.mkdir(nextDir);
      await fs.promises.writeFile(path.join(nextDir, 'build.js'), 'build artifact');
      
      // Create regular file
      await fs.promises.writeFile(path.join(tempDir, 'page.tsx'), 'export default function Page() {}');
      
      const files = await scanner.scan(tempDir);
      
      expect(files).toHaveLength(1);
      expect(files[0].path).toBe('page.tsx');
    });

    it('should exclude custom exclusions', async () => {
      // Create custom scanner with exclusions
      const customScanner = new FileScanner(['custom-exclude']);
      
      // Create custom directory
      const customDir = path.join(tempDir, 'custom-exclude');
      await fs.promises.mkdir(customDir);
      await fs.promises.writeFile(path.join(customDir, 'file.ts'), 'excluded');
      
      // Create regular file
      await fs.promises.writeFile(path.join(tempDir, 'included.ts'), 'included');
      
      const files = await customScanner.scan(tempDir);
      
      expect(files).toHaveLength(1);
      expect(files[0].path).toBe('included.ts');
    });

    it('should recursively scan subdirectories', async () => {
      // Create nested structure
      const srcDir = path.join(tempDir, 'src');
      const libDir = path.join(srcDir, 'lib');
      await fs.promises.mkdir(srcDir);
      await fs.promises.mkdir(libDir);
      
      await fs.promises.writeFile(path.join(srcDir, 'app.ts'), 'app');
      await fs.promises.writeFile(path.join(libDir, 'utils.ts'), 'utils');
      
      const files = await scanner.scan(tempDir);
      
      expect(files).toHaveLength(2);
      expect(files.map(f => f.path).sort()).toEqual(['src/app.ts', 'src/lib/utils.ts']);
    });

    it('should categorize files correctly', async () => {
      // Create files of different types
      await fs.promises.writeFile(path.join(tempDir, 'app.ts'), 'source');
      await fs.promises.writeFile(path.join(tempDir, 'backup.dump'), 'backup');
      await fs.promises.writeFile(path.join(tempDir, 'output.log'), 'log');
      await fs.promises.writeFile(path.join(tempDir, 'README.md'), 'docs');
      await fs.promises.writeFile(path.join(tempDir, 'config.json'), 'config');
      
      const debugDir = path.join(tempDir, 'debug');
      await fs.promises.mkdir(debugDir);
      await fs.promises.writeFile(path.join(debugDir, 'debug_test.txt'), 'debug');
      
      const files = await scanner.scan(tempDir);
      
      const filesByType = new Map(files.map(f => [path.basename(f.path), f.type]));
      
      expect(filesByType.get('app.ts')).toBe(FileType.SOURCE);
      expect(filesByType.get('backup.dump')).toBe(FileType.BACKUP);
      expect(filesByType.get('output.log')).toBe(FileType.LOG);
      expect(filesByType.get('README.md')).toBe(FileType.DOCUMENTATION);
      expect(filesByType.get('config.json')).toBe(FileType.CONFIG);
      expect(filesByType.get('debug_test.txt')).toBe(FileType.DEBUG);
    });
  });

  describe('buildDependencyGraph', () => {
    it('should parse ES6 import statements', async () => {
      // Create files with imports
      const file1Path = path.join(tempDir, 'file1.ts');
      const file2Path = path.join(tempDir, 'file2.ts');
      
      await fs.promises.writeFile(file1Path, `
        import { something } from './file2';
        export const x = 1;
      `);
      await fs.promises.writeFile(file2Path, 'export const something = 2;');
      
      const files = await scanner.scan(tempDir);
      const graph = await scanner.buildDependencyGraph(files, tempDir);
      
      expect(graph.nodes.size).toBe(2);
      
      const file1Node = graph.nodes.get('file1.ts');
      expect(file1Node?.imports).toContain('file2.ts');
      
      const file2Node = graph.nodes.get('file2.ts');
      expect(file2Node?.importedBy).toContain('file1.ts');
    });

    it('should parse dynamic import statements', async () => {
      const file1Path = path.join(tempDir, 'file1.ts');
      const file2Path = path.join(tempDir, 'file2.ts');
      
      await fs.promises.writeFile(file1Path, `
        const module = await import('./file2');
      `);
      await fs.promises.writeFile(file2Path, 'export const data = 1;');
      
      const files = await scanner.scan(tempDir);
      const graph = await scanner.buildDependencyGraph(files, tempDir);
      
      const file1Node = graph.nodes.get('file1.ts');
      expect(file1Node?.imports).toContain('file2.ts');
    });

    it('should parse require statements', async () => {
      const file1Path = path.join(tempDir, 'file1.js');
      const file2Path = path.join(tempDir, 'file2.js');
      
      await fs.promises.writeFile(file1Path, `
        const module = require('./file2');
      `);
      await fs.promises.writeFile(file2Path, 'module.exports = {};');
      
      const files = await scanner.scan(tempDir);
      const graph = await scanner.buildDependencyGraph(files, tempDir);
      
      const file1Node = graph.nodes.get('file1.js');
      expect(file1Node?.imports).toContain('file2.js');
    });

    it('should parse export from statements', async () => {
      const file1Path = path.join(tempDir, 'file1.ts');
      const file2Path = path.join(tempDir, 'file2.ts');
      
      await fs.promises.writeFile(file1Path, `
        export { something } from './file2';
      `);
      await fs.promises.writeFile(file2Path, 'export const something = 1;');
      
      const files = await scanner.scan(tempDir);
      const graph = await scanner.buildDependencyGraph(files, tempDir);
      
      const file1Node = graph.nodes.get('file1.ts');
      expect(file1Node?.imports).toContain('file2.ts');
    });

    it('should skip external package imports', async () => {
      const filePath = path.join(tempDir, 'file.ts');
      
      await fs.promises.writeFile(filePath, `
        import React from 'react';
        import { useState } from 'react';
        import * as fs from 'fs';
      `);
      
      const files = await scanner.scan(tempDir);
      const graph = await scanner.buildDependencyGraph(files, tempDir);
      
      const fileNode = graph.nodes.get('file.ts');
      expect(fileNode?.imports).toHaveLength(0);
    });

    it('should resolve imports with different extensions', async () => {
      const file1Path = path.join(tempDir, 'file1.ts');
      const file2Path = path.join(tempDir, 'file2.tsx');
      
      await fs.promises.writeFile(file1Path, `
        import { Component } from './file2';
      `);
      await fs.promises.writeFile(file2Path, 'export const Component = () => {};');
      
      const files = await scanner.scan(tempDir);
      const graph = await scanner.buildDependencyGraph(files, tempDir);
      
      const file1Node = graph.nodes.get('file1.ts');
      expect(file1Node?.imports).toContain('file2.tsx');
    });

    it('should resolve index file imports', async () => {
      const file1Path = path.join(tempDir, 'file1.ts');
      const libDir = path.join(tempDir, 'lib');
      const indexPath = path.join(libDir, 'index.ts');
      
      await fs.promises.mkdir(libDir);
      await fs.promises.writeFile(file1Path, `
        import { utils } from './lib';
      `);
      await fs.promises.writeFile(indexPath, 'export const utils = {};');
      
      const files = await scanner.scan(tempDir);
      const graph = await scanner.buildDependencyGraph(files, tempDir);
      
      const file1Node = graph.nodes.get('file1.ts');
      expect(file1Node?.imports).toContain('lib/index.ts');
    });

    it('should update isReferenced flag for files', async () => {
      const file1Path = path.join(tempDir, 'file1.ts');
      const file2Path = path.join(tempDir, 'file2.ts');
      const file3Path = path.join(tempDir, 'file3.ts');
      
      await fs.promises.writeFile(file1Path, `
        import { x } from './file2';
      `);
      await fs.promises.writeFile(file2Path, 'export const x = 1;');
      await fs.promises.writeFile(file3Path, 'export const y = 2;'); // Unreferenced
      
      const files = await scanner.scan(tempDir);
      await scanner.buildDependencyGraph(files, tempDir);
      
      const file1 = files.find(f => f.path === 'file1.ts');
      const file2 = files.find(f => f.path === 'file2.ts');
      const file3 = files.find(f => f.path === 'file3.ts');
      
      expect(file2?.isReferenced).toBe(true);
      expect(file2?.referencedBy).toContain('file1.ts');
      expect(file3?.isReferenced).toBe(false);
    });

    it('should handle circular dependencies', async () => {
      const file1Path = path.join(tempDir, 'file1.ts');
      const file2Path = path.join(tempDir, 'file2.ts');
      
      await fs.promises.writeFile(file1Path, `
        import { b } from './file2';
        export const a = 1;
      `);
      await fs.promises.writeFile(file2Path, `
        import { a } from './file1';
        export const b = 2;
      `);
      
      const files = await scanner.scan(tempDir);
      const graph = await scanner.buildDependencyGraph(files, tempDir);
      
      const file1Node = graph.nodes.get('file1.ts');
      const file2Node = graph.nodes.get('file2.ts');
      
      expect(file1Node?.imports).toContain('file2.ts');
      expect(file2Node?.imports).toContain('file1.ts');
      expect(file1Node?.importedBy).toContain('file2.ts');
      expect(file2Node?.importedBy).toContain('file1.ts');
    });
  });

  describe('findUnreferencedFiles', () => {
    it('should identify unreferenced files', async () => {
      const file1Path = path.join(tempDir, 'file1.ts');
      const file2Path = path.join(tempDir, 'file2.ts');
      const file3Path = path.join(tempDir, 'file3.ts');
      
      await fs.promises.writeFile(file1Path, `
        import { x } from './file2';
      `);
      await fs.promises.writeFile(file2Path, 'export const x = 1;');
      await fs.promises.writeFile(file3Path, 'export const y = 2;'); // Unreferenced
      
      const files = await scanner.scan(tempDir);
      const graph = await scanner.buildDependencyGraph(files, tempDir);
      const unreferenced = scanner.findUnreferencedFiles(files, graph);
      
      expect(unreferenced).toHaveLength(1);
      expect(unreferenced[0].path).toBe('file3.ts');
    });

    it('should not mark Next.js pages as unreferenced', async () => {
      const srcDir = path.join(tempDir, 'src');
      const appDir = path.join(srcDir, 'app');
      await fs.promises.mkdir(srcDir);
      await fs.promises.mkdir(appDir);
      
      const pagePath = path.join(appDir, 'page.tsx');
      await fs.promises.writeFile(pagePath, 'export default function Page() {}');
      
      const files = await scanner.scan(tempDir);
      const graph = await scanner.buildDependencyGraph(files, tempDir);
      const unreferenced = scanner.findUnreferencedFiles(files, graph);
      
      expect(unreferenced).toHaveLength(0);
    });

    it('should not mark Next.js layouts as unreferenced', async () => {
      const srcDir = path.join(tempDir, 'src');
      const appDir = path.join(srcDir, 'app');
      await fs.promises.mkdir(srcDir);
      await fs.promises.mkdir(appDir);
      
      const layoutPath = path.join(appDir, 'layout.tsx');
      await fs.promises.writeFile(layoutPath, 'export default function Layout() {}');
      
      const files = await scanner.scan(tempDir);
      const graph = await scanner.buildDependencyGraph(files, tempDir);
      const unreferenced = scanner.findUnreferencedFiles(files, graph);
      
      expect(unreferenced).toHaveLength(0);
    });

    it('should not mark Next.js API routes as unreferenced', async () => {
      const srcDir = path.join(tempDir, 'src');
      const appDir = path.join(srcDir, 'app');
      const apiDir = path.join(appDir, 'api');
      const usersDir = path.join(apiDir, 'users');
      
      await fs.promises.mkdir(srcDir);
      await fs.promises.mkdir(appDir);
      await fs.promises.mkdir(apiDir);
      await fs.promises.mkdir(usersDir);
      
      const routePath = path.join(usersDir, 'route.ts');
      await fs.promises.writeFile(routePath, 'export async function GET() {}');
      
      const files = await scanner.scan(tempDir);
      const graph = await scanner.buildDependencyGraph(files, tempDir);
      const unreferenced = scanner.findUnreferencedFiles(files, graph);
      
      expect(unreferenced).toHaveLength(0);
    });

    it('should not mark config files as unreferenced', async () => {
      const nextConfigPath = path.join(tempDir, 'next.config.ts');
      await fs.promises.writeFile(nextConfigPath, 'export default {};');
      
      const files = await scanner.scan(tempDir);
      const graph = await scanner.buildDependencyGraph(files, tempDir);
      const unreferenced = scanner.findUnreferencedFiles(files, graph);
      
      expect(unreferenced).toHaveLength(0);
    });

    it('should not mark scripts as unreferenced', async () => {
      const scriptsDir = path.join(tempDir, 'scripts');
      await fs.promises.mkdir(scriptsDir);
      
      const scriptPath = path.join(scriptsDir, 'seed.js');
      await fs.promises.writeFile(scriptPath, 'console.log("seeding");');
      
      const files = await scanner.scan(tempDir);
      const graph = await scanner.buildDependencyGraph(files, tempDir);
      const unreferenced = scanner.findUnreferencedFiles(files, graph);
      
      expect(unreferenced).toHaveLength(0);
    });

    it('should handle multiple unreferenced files', async () => {
      const file1Path = path.join(tempDir, 'file1.ts');
      const file2Path = path.join(tempDir, 'file2.ts');
      const file3Path = path.join(tempDir, 'file3.ts');
      const file4Path = path.join(tempDir, 'file4.ts');
      
      await fs.promises.writeFile(file1Path, `
        import { x } from './file2';
      `);
      await fs.promises.writeFile(file2Path, 'export const x = 1;');
      await fs.promises.writeFile(file3Path, 'export const y = 2;'); // Unreferenced
      await fs.promises.writeFile(file4Path, 'export const z = 3;'); // Unreferenced
      
      const files = await scanner.scan(tempDir);
      const graph = await scanner.buildDependencyGraph(files, tempDir);
      const unreferenced = scanner.findUnreferencedFiles(files, graph);
      
      expect(unreferenced).toHaveLength(2);
      expect(unreferenced.map(f => f.path).sort()).toEqual(['file3.ts', 'file4.ts']);
    });
  });

  describe('error handling', () => {
    it('should handle permission errors gracefully', async () => {
      // This test is platform-dependent and may not work on all systems
      // Skip on Windows where permission handling is different
      if (process.platform === 'win32') {
        return;
      }
      
      const restrictedDir = path.join(tempDir, 'restricted');
      await fs.promises.mkdir(restrictedDir);
      await fs.promises.chmod(restrictedDir, 0o000);
      
      await fs.promises.writeFile(path.join(tempDir, 'file.ts'), 'export const x = 1;');
      
      const files = await scanner.scan(tempDir);
      
      // Should still scan the accessible file
      expect(files.length).toBeGreaterThanOrEqual(1);
      
      // Clean up
      await fs.promises.chmod(restrictedDir, 0o755);
    });

    it('should handle malformed import statements', async () => {
      const filePath = path.join(tempDir, 'file.ts');
      
      await fs.promises.writeFile(filePath, `
        import { something from './nonexistent';
        export const x = 1;
      `);
      
      const files = await scanner.scan(tempDir);
      const graph = await scanner.buildDependencyGraph(files, tempDir);
      
      // Should not crash, just skip invalid imports
      expect(graph.nodes.size).toBe(1);
    });

    it('should handle non-existent import paths', async () => {
      const filePath = path.join(tempDir, 'file.ts');
      
      await fs.promises.writeFile(filePath, `
        import { something } from './does-not-exist';
        export const x = 1;
      `);
      
      const files = await scanner.scan(tempDir);
      const graph = await scanner.buildDependencyGraph(files, tempDir);
      
      const fileNode = graph.nodes.get('file.ts');
      // Should not include non-existent imports
      expect(fileNode?.imports).toHaveLength(0);
    });
  });
});
