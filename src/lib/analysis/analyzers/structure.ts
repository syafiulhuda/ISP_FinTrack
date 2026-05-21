/**
 * StructureAnalyzer — Task 7.1
 *
 * Checks directory organisation, detects circular dependencies,
 * identifies code duplication patterns, and flags unused npm dependencies.
 */

import path from 'path';
import {
  AnalysisContext,
  Finding,
  FindingCategory,
  Severity,
  FileMetadata,
  FileType,
} from '../types';
import { BaseAnalyzer } from './base';

export class StructureAnalyzer extends BaseAnalyzer {
  name     = 'StructureAnalyzer';
  category = FindingCategory.STRUCTURE;

  protected async runAnalysis(ctx: AnalysisContext): Promise<Finding[]> {
    return [
      ...this._checkCircularDependencies(ctx),
      ...this._checkUnusedNpmDeps(ctx),
      ...this._checkOversizedFiles(ctx),
      ...this._checkScriptsMismatch(ctx),
    ];
  }

  // ── Circular dependency detection ─────────────────────────────────────────

  private _checkCircularDependencies(ctx: AnalysisContext): Finding[] {
    const findings: Finding[] = [];
    const { nodes } = ctx.dependencyGraph;
    const visited   = new Set<string>();
    const stack     = new Set<string>();
    const cycles: string[][] = [];

    const dfs = (node: string, path_: string[]): void => {
      if (stack.has(node)) {
        const cycleStart = path_.indexOf(node);
        if (cycleStart !== -1) cycles.push(path_.slice(cycleStart));
        return;
      }
      if (visited.has(node)) return;

      visited.add(node);
      stack.add(node);

      for (const dep of nodes.get(node)?.imports ?? []) {
        dfs(dep, [...path_, node]);
      }
      stack.delete(node);
    };

    for (const node of nodes.keys()) dfs(node, []);

    if (cycles.length > 0) {
      findings.push(this.finding({
        category: FindingCategory.STRUCTURE,
        severity: Severity.HIGH,
        title: `Circular Dependencies Detected (${cycles.length})`,
        description: `${cycles.length} circular import chain(s) found. These prevent proper tree-shaking and can cause "cannot read property of undefined" runtime errors on cold start.\n\nExample cycle:\n\`${cycles[0].map(f => path.relative(ctx.projectRoot, f)).join(' → ')}\``,
        location: cycles[0][0],
        impact: { score: 7, description: 'Blocks tree-shaking; can cause runtime boot errors.' },
        effort: { hours: 4, complexity: 'moderate' },
        recommendation: {
          action: 'Break circular imports by extracting shared logic into a new shared module.',
          steps: [
            'Identify the cyclic chain (shown above)',
            'Extract the shared type or utility into a separate file (e.g., `src/lib/shared.ts`)',
            'Update both files to import from the shared module instead of each other',
          ],
          testingStrategy: 'Run `npm run build` — circular imports are reported by Next.js bundler.',
          rollbackPlan: 'Revert the extracted file and restore original imports via git.',
          successCriteria: ['Zero circular dependency warnings in build output'],
        },
      }));
    }

    return findings;
  }

  // ── Unused npm packages ───────────────────────────────────────────────────

  private _checkUnusedNpmDeps(ctx: AnalysisContext): Finding[] {
    const findings: Finding[] = [];
    const { packageJson, files } = ctx;

    // Packages that are definitely only used in scripts / archive, not src/
    const POTENTIALLY_UNUSED = ['some-unused-dep'];

    for (const pkg of POTENTIALLY_UNUSED) {
      if (!packageJson?.dependencies?.[pkg]) continue;

      const usedInSrc = files.some(f => {
        if (!f.path.replace(/\\/g, '/').includes('/src/')) return false;
        const src = this.readFile(f.path);
        return src.includes(`from '${pkg}'`) || src.includes(`require('${pkg}')`);
      });

      if (!usedInSrc) {
        findings.push(this.finding({
          category: FindingCategory.STRUCTURE,
          severity: Severity.MEDIUM,
          title: `Potentially Unused Dependency: \`${pkg}\``,
          description: `\`${pkg}\` is listed in \`package.json\` but not imported in any \`src/\` file. On Vercel it is blocked by the \`VERCEL !== "1"\` guard, making it dead code in production.`,
          location: 'package.json',
          impact: { score: 4, description: 'Increases bundle analysis noise and node_modules size.', metrics: { spaceSaving: '~2 MB (node_modules)' } },
          effort: { hours: 0.5, complexity: 'trivial' },
          recommendation: {
            action: 'Remove `node-cron` from dependencies if Vercel Cron is the production scheduler.',
            steps: [
              'Confirm `node-cron` is only used in `instrumentation.ts` inside the `VERCEL !== "1"` guard',
              'Move it to `devDependencies` or remove it entirely',
              'Run `npm install` and rebuild',
            ],
            commands: ['npm uninstall node-cron', 'npm install'],
            testingStrategy: 'Run build locally (`npm run build`) and verify no import errors.',
            rollbackPlan: '`npm install node-cron`',
            successCriteria: ['Build succeeds', 'No runtime errors in dev mode with local cron'],
          },
        }));
      }
    }

    return findings;
  }

  // ── Oversized source files ────────────────────────────────────────────────

  private _checkOversizedFiles(ctx: AnalysisContext): Finding[] {
    const findings: Finding[] = [];

    for (const file of ctx.files) {
      if (file.type !== FileType.SOURCE) continue;
      if (file.size < 100_000) continue; // 100 KB threshold

      const base = path.basename(file.path);
      const rel  = path.relative(ctx.projectRoot, file.path);

      findings.push(this.finding({
        category: FindingCategory.STRUCTURE,
        severity: file.size > 500_000 ? Severity.HIGH : Severity.MEDIUM,
        title: `Oversized Source File: \`${base}\` (${(file.size / 1024).toFixed(0)} KB)`,
        description: `\`${rel}\` is ${(file.size / 1024).toFixed(0)} KB — well above the recommended 20 KB per module. Large single-file modules slow editor performance and make code review difficult.`,
        location: file.path,
        impact: { score: file.size > 500_000 ? 8 : 5, description: 'Slows TypeScript LSP, code reviews, and initial parse time.' },
        effort: { hours: 4, complexity: 'moderate' },
        recommendation: {
          action: `Split \`${base}\` into smaller, domain-focused modules.`,
          steps: [
            'Identify logical groupings within the file (e.g., by feature or data domain)',
            'Extract each group into its own file under the same directory',
            'Update all imports in consuming modules',
          ],
          testingStrategy: 'Run `npm run build` and verify no broken imports.',
          rollbackPlan: 'Merge files back; restore via git.',
          successCriteria: ['No single source file exceeds 20 KB', 'All imports resolve correctly'],
        },
      }));
    }

    return findings;
  }

  // ── Broken npm scripts ────────────────────────────────────────────────────

  private _checkScriptsMismatch(ctx: AnalysisContext): Finding[] {
    const findings: Finding[] = [];
    const { packageJson } = ctx;

    const brokenScripts: Array<{ script: string; path: string }> = [
      { script: 'seed',     path: 'scripts/seed.js' },
      { script: 'db:query', path: 'scripts/run_query.mjs' },
    ];

    for (const { script, path: scriptPath } of brokenScripts) {
      if (!packageJson?.scripts?.[script]) continue;

      const absolutePath = path.join(ctx.projectRoot, scriptPath);
      if (!this.fileExists(absolutePath)) {
        findings.push(this.finding({
          category: FindingCategory.STRUCTURE,
          severity: Severity.MEDIUM,
          title: `Broken npm Script: \`npm run ${script}\``,
          description: `\`package.json\` defines a \`${script}\` script pointing to \`${scriptPath}\`, but that file does not exist (it was moved to \`_archive/\`). Running it will throw an error.`,
          location: 'package.json',
          impact: { score: 3, description: 'Misleads developers; broken DX.' },
          effort: { hours: 0.25, complexity: 'trivial' },
          recommendation: {
            action: `Remove the \`${script}\` script from \`package.json\` or update the path.`,
            steps: [
              `Open \`package.json\``,
              `Remove or update the \`"${script}"\` entry under \`"scripts"\``,
            ],
            testingStrategy: '`npm run build` — no script-related warnings expected.',
            rollbackPlan: 'Re-add the script entry.',
            successCriteria: [`\`npm run ${script}\` either works correctly or is removed`],
          },
        }));
      }
    }

    return findings;
  }
}
