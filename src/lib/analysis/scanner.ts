/**
 * FileScanner — Task 2.1 + 2.2
 *
 * Traverses the ISP-FinTrack project directory, collects file metadata,
 * and builds a dependency graph by parsing TypeScript/JavaScript imports.
 *
 * File paths stored in FileMetadata are **relative to rootPath** so that
 * tests and reports are portable across machines.
 *
 * Exclusions (never scanned):
 * node_modules, .next, .git, .kiro, coverage, dist, build
 */

import fs from'fs';
import path from'path';
import {
 FileMetadata,
 FileType,
 DependencyGraph,
 FileNode,
} from'./types';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_EXCLUSIONS: string[] = [
'node_modules','.next','.git','.kiro',
'coverage','dist','build','.turbo','.vercel',
];

/** Extensions that may contain import statements */
const PARSEABLE_EXTENSIONS = new Set([
'.ts','.tsx','.js','.jsx','.mjs','.cjs',
]);

/**
 * Safe import-path extraction patterns.
 * These ONLY match the path string — no nested quantifiers that could
 * cause catastrophic backtracking on minified or machine-generated files.
 */
const IMPORT_PATTERNS: RegExp[] = [
 // from'...'(covers: import … from, export … from)
 /from\s+['"]([^'"\r\n]+)['"]/g,
 // require('...')
 /require\s*\(\s*['"]([^'"\r\n]+)['"]\s*\)/g,
 // dynamic import('...')
 /\bimport\s*\(\s*['"]([^'"\r\n]+)['"]\s*\)/g,
];

// ─────────────────────────────────────────────────────────────────────────────
// FileScanner class
// ─────────────────────────────────────────────────────────────────────────────

export class FileScanner {
 private readonly exclusions: Set<string>;

 constructor(exclusions: string[] = DEFAULT_EXCLUSIONS) {
 this.exclusions = new Set(exclusions);
 }

 // ── Public API ─────────────────────────────────────────────────────────────

 /**
 * Recursively scans`rootPath`and returns a flat list of FileMetadata.
 *`FileMetadata.path`is **relative** to`rootPath`(e.g.`src/app/page.tsx`).
 */
 async scan(rootPath: string): Promise<FileMetadata[]> {
 const results: FileMetadata[] = [];
 this._walk(rootPath, rootPath, results);
 return results;
 }

 /**
 * Parses import statements in all parseable files and builds a directed
 * dependency graph. Node keys and edge values use the same **relative**
 * paths stored in`FileMetadata.path`.
 *
 * Also mutates`files[*].isReferenced`and`files[*].referencedBy`
 * as a convenience so callers don't need to re-query the graph.
 */
 async buildDependencyGraph(
 files: FileMetadata[],
 projectRoot: string,
 ): Promise<DependencyGraph> {
 const graph: DependencyGraph = {
 nodes: new Map(),
 edges: new Map(),
 };

 // Initialise every file as a node with empty import lists
 for (const f of files) {
 const node: FileNode = { path: f.path, imports: [], importedBy: [] };
 graph.nodes.set(f.path, node);
 graph.edges.set(f.path, []);
 }

 // Build a set of all known relative paths for fast look-ups
 const knownPaths = new Set(files.map(f => f.path));

 // Parse imports for each parseable file
 for (const f of files) {
 if (!PARSEABLE_EXTENSIONS.has(path.extname(f.path))) continue;

 // Resolve the absolute path so we can read the file
 const absolutePath = path.join(projectRoot, f.path);
 let source ='';
 try {
 const stat = fs.statSync(absolutePath);
 // Skip files larger than 100 KB to avoid stalling on generated/minified code
 if (stat.size > 100_000) continue;
 source = fs.readFileSync(absolutePath,'utf-8');
 } catch {
 continue;
 }

 const imports = this._extractImports(source);
 const resolvedDeps: string[] = [];

 for (const rawImport of imports) {
 const resolved = this._resolveImport(rawImport, f.path, projectRoot, knownPaths);
 if (resolved) {
 resolvedDeps.push(resolved);

 // Record the reverse edge (importedBy)
 const depNode = graph.nodes.get(resolved);
 if (depNode && !depNode.importedBy.includes(f.path)) {
 depNode.importedBy.push(f.path);
 }

 // Mutate the FileMetadata for the dependency
 const depFile = files.find(x => x.path === resolved);
 if (depFile) {
 depFile.isReferenced = true;
 if (!depFile.referencedBy.includes(f.path)) {
 depFile.referencedBy.push(f.path);
 }
 }
 }
 }

 // Update the node
 const currentNode = graph.nodes.get(f.path)!;
 currentNode.imports = resolvedDeps;
 graph.edges.set(f.path, resolvedDeps);
 }

 return graph;
 }

 /**
 * Returns files that are never imported by any other file, AND are not
 * entry points (page.tsx, layout.tsx, route.ts, instrumentation.ts, etc.).
 */
 findUnreferencedFiles(
 files: FileMetadata[],
 graph: DependencyGraph,
 ): FileMetadata[] {
 return files.filter(f => {
 const node = graph.nodes.get(f.path);
 if (!node) return false;
 // Referenced by another file → not unreferenced
 if (node.importedBy.length > 0) return false;
 // Has outgoing imports → it's a root consumer / entry-point
 if (node.imports.length > 0) return false;
 // Known Next.js / config entry points
 if (this._isEntryPoint(f.path)) return false;
 return true;
 });
 }

 // ── Private helpers ────────────────────────────────────────────────────────

 private _walk(
 rootPath: string,
 currentPath: string,
 results: FileMetadata[],
 ): void {
 let entries: fs.Dirent[];
 try {
 entries = fs.readdirSync(currentPath, { withFileTypes: true });
 } catch {
 return;
 }

 for (const entry of entries) {
 if (this.exclusions.has(entry.name)) continue;

 const fullPath = path.join(currentPath, entry.name);
 // Store relative path (using forward-slash on all platforms for consistency)
 const relativePath = path.relative(rootPath, fullPath).replace(/\\/g,'/');

 if (entry.isDirectory()) {
 this._walk(rootPath, fullPath, results);
 } else if (entry.isFile()) {
 try {
 const stat = fs.statSync(fullPath);
 results.push({
 path: relativePath,
 size: stat.size,
 type: this._classifyFile(relativePath),
 lastModified: stat.mtime,
 isReferenced: false,
 referencedBy: [],
 });
 } catch {
 // Skip files we cannot stat
 }
 }
 }
 }

 /** Classifies a file by its name / extension / parent directory */
 private _classifyFile(relativePath: string): FileType {
 const base = path.basename(relativePath).toLowerCase();
 const ext = path.extname(relativePath).toLowerCase();
 const parts = relativePath.split('/');
 const parent = parts.length > 1 ? parts[parts.length - 2].toLowerCase() :'';

 // Log files
 if (ext ==='.log'|| base.endsWith('.log')) return FileType.LOG;

 // SQL dumps / backups
 if (ext ==='.sql'|| ext ==='.dump'|| ext ==='.pgsql') return FileType.BACKUP;

 // Debug / scratch directories
 if (parent ==='debug'|| parent ==='scratch'|| parent ==='_archive') return FileType.DEBUG;

 // Scripts directory — classified as SCRIPT not DEBUG
 if (parent ==='scripts') return FileType.SCRIPT;

 // Source code
 if (['.ts','.tsx','.js','.jsx','.mjs','.cjs'].includes(ext)) return FileType.SOURCE;

 // Config files
 if (['.json','.yaml','.yml','.env'].includes(ext) ||
 base.startsWith('.') || base.includes('config') || base.endsWith('.rc')) {
 return FileType.CONFIG;
 }

 // Documentation
 if (['.md','.mdx','.txt'].includes(ext)) return FileType.DOCUMENTATION;

 // Assets
 if (['.png','.jpg','.jpeg','.svg','.ico','.webp','.gif','.woff','.woff2','.ttf'].includes(ext)) {
 return FileType.ASSET;
 }

 // Compiled / generated artifacts
 if (['.tsbuildinfo','.map'].includes(ext) || base.includes('.d.ts')) return FileType.ARTIFACT;

 return FileType.SOURCE;
 }

 /** Extracts all import specifiers from a source string */
 private _extractImports(source: string): string[] {
 const imports: string[] = [];
 for (const pattern of IMPORT_PATTERNS) {
 pattern.lastIndex = 0;
 let match: RegExpExecArray | null;
 while ((match = pattern.exec(source)) !== null) {
 if (match[1]) imports.push(match[1]);
 }
 }
 return [...new Set(imports)];
 }

 /**
 * Resolves a raw import specifier to a **relative** path.
 * Returns`null`for external (node_modules) imports.
 *
 * @param rawImport The raw import string (e.g.'./utils','@/lib/db')
 * @param importerRelPath Relative path of the importing file
 * @param projectRoot Absolute path to the project root
 * @param knownPaths Set of all known **relative** paths
 */
 private _resolveImport(
 rawImport: string,
 importerRelPath: string,
 projectRoot: string,
 knownPaths: Set<string>,
 ): string | null {
 // Skip external packages (no leading'.','@/', or'~/')
 if (!rawImport.startsWith('.') && !rawImport.startsWith('@/') && !rawImport.startsWith('~/')) {
 return null;
 }

 // Compute absolute base path for resolution
 const importerAbsolute = path.join(projectRoot, importerRelPath);
 let baseAbsolute: string;

 if (rawImport.startsWith('@/') || rawImport.startsWith('~/')) {
 const aliasRelative = rawImport.replace(/^[@~]\//,'');
 baseAbsolute = path.join(projectRoot,'src', aliasRelative);
 } else {
 baseAbsolute = path.resolve(path.dirname(importerAbsolute), rawImport);
 }

 // Candidate absolute paths to probe
 const candidates = [
 baseAbsolute,
`${baseAbsolute}.ts`,
`${baseAbsolute}.tsx`,
`${baseAbsolute}.js`,
`${baseAbsolute}.jsx`,
`${baseAbsolute}/index.ts`,
`${baseAbsolute}/index.tsx`,
`${baseAbsolute}/index.js`,
 ];

 for (const candidate of candidates) {
 // Convert back to relative path (with forward slashes)
 const rel = path.relative(projectRoot, candidate).replace(/\\/g,'/');
 if (knownPaths.has(rel)) return rel;
 }

 return null;
 }

 /** Files that are application entry points (not imported, but used by Next.js / config) */
 private _isEntryPoint(relativePath: string): boolean {
 const base = path.basename(relativePath);
 const ENTRY_NAMES = new Set([
'page.tsx','page.ts','page.jsx','page.js',
'layout.tsx','layout.ts',
'route.ts','route.js',
'loading.tsx','loading.ts',
'error.tsx','error.ts',
'not-found.tsx','not-found.ts',
'instrumentation.ts',
'middleware.ts','middleware.js',
'next.config.ts','next.config.js',
'tailwind.config.ts','tailwind.config.js',
'postcss.config.mjs',
'eslint.config.mjs',
'vitest.config.ts','vitest.config.js',
 ]);
 if (ENTRY_NAMES.has(base)) return true;

 // Files inside a'scripts/'directory are entry points (CLI runners)
 const parts = relativePath.split('/');
 if (parts[0] ==='scripts') return true;

 return false;
 }
}
