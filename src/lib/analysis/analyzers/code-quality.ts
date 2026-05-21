/**
 * CodeQualityAnalyzer — Task 11.1
 *
 * Detects TypeScript `any` overuse, unguarded console.log statements,
 * inconsistent error handling, and similar code quality issues.
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

export class CodeQualityAnalyzer extends BaseAnalyzer {
  name     = 'CodeQualityAnalyzer';
  category = FindingCategory.CODE_QUALITY;

  protected async runAnalysis(ctx: AnalysisContext): Promise<Finding[]> {
    const srcFiles = ctx.files.filter(
      f => f.type === FileType.SOURCE &&
           (f.path.endsWith('.ts') || f.path.endsWith('.tsx')) &&
           !f.path.includes('.test.')
    );

    return [
      ...this._checkExcessiveAny(srcFiles, ctx),
      ...this._checkConsoleLogs(srcFiles, ctx),
      ...this._checkFakeTimeouts(srcFiles, ctx),
      ...this._checkUntypedServerActions(srcFiles, ctx),
    ];
  }

  // ── Excessive `any` usage ────────────────────────────────────────────────

  private _checkExcessiveAny(files: FileMetadata[], ctx: AnalysisContext): Finding[] {
    const findings: Finding[] = [];
    const anyPattern = /:\s*any\b/g;
    const THRESHOLD = 5;

    for (const file of files) {
      const src   = this.readFile(file.path);
      const count = this.countMatches(src, anyPattern);
      if (count < THRESHOLD) continue;

      const rel = path.relative(ctx.projectRoot, file.path);
      findings.push(this.finding({
        category: FindingCategory.CODE_QUALITY,
        severity: count > 15 ? Severity.HIGH : Severity.MEDIUM,
        title: `Excessive \`any\` Usage in \`${path.basename(file.path)}\` (${count} occurrences)`,
        description:
          `\`${rel}\` uses the TypeScript \`any\` type ${count} times. Excessive \`any\` disables type checking, ` +
          'masks bugs (e.g., the `.toFixed is not a function` crash history), and degrades IntelliSense quality.',
        location: file.path,
        impact: { score: 6, description: 'Allows runtime type errors to bypass compile-time checks.' },
        effort: { hours: 2, complexity: 'moderate' },
        recommendation: {
          action: `Replace \`any\` with specific types or \`unknown\` in \`${path.basename(file.path)}\`.`,
          steps: [
            'Run `npx tsc --noEmit` to get all type error locations',
            'For API responses, create typed interfaces in `src/types/index.ts`',
            'For catch blocks, use `catch (error: unknown)` and narrow with `instanceof Error`',
            'For poolConfig, use `pg.PoolConfig` instead of `any`',
          ],
          codeExample: {
            before: `const poolConfig: any = { max: 10 };`,
            after: `import { PoolConfig } from 'pg';
const poolConfig: PoolConfig = { max: 10 };`,
          },
          testingStrategy: '`npx tsc --noEmit` should show zero errors after migration.',
          rollbackPlan: 'Revert type annotations.',
          successCriteria: [`\`${path.basename(file.path)}\` has zero \`any\` usages`],
        },
      }));
    }

    return findings;
  }

  // ── console.log in production code ───────────────────────────────────────

  private _checkConsoleLogs(files: FileMetadata[], ctx: AnalysisContext): Finding[] {
    const logFiles: string[] = [];
    const logPattern = /console\.(log|debug|info)\s*\(/g;

    for (const file of files) {
      // Allow console in specific files where it is intentional
      if (
        file.path.endsWith('instrumentation.ts') || 
        file.path.endsWith('logger.ts') ||
        file.path.includes('analysis')
      ) continue;
      const lines = this.readFile(file.path).split('\n');
      let count = 0;
      for (const line of lines) {
        if (line.includes('process.env.NODE_ENV')) continue;
        const matches = line.match(logPattern);
        if (matches) count += matches.length;
      }
      if (count > 0) logFiles.push(`${path.relative(ctx.projectRoot, file.path)} (${count}×)`);
    }

    if (logFiles.length === 0) return [];

    return [this.finding({
      category: FindingCategory.CODE_QUALITY,
      severity: Severity.MEDIUM,
      title: `\`console.log\` / \`console.debug\` in ${logFiles.length} Production Source Files`,
      description:
        `The following files contain development logging statements that will appear in production: ` +
        `\n${logFiles.slice(0, 10).map(f => `- \`${f}\``).join('\n')}` +
        (logFiles.length > 10 ? `\n…and ${logFiles.length - 10} more` : ''),
      location: 'src/',
      impact: { score: 4, description: 'Leaks internal logic to browser console; degrades performance slightly.' },
      effort: { hours: 2, complexity: 'simple' },
      recommendation: {
        action: 'Remove or guard all `console.log` statements behind `process.env.NODE_ENV === "development"`.',
        steps: [
          'Run: `grep -rn "console.log" src/ --include="*.ts" --include="*.tsx"`',
          'Remove debug logs or replace with a proper logger that respects `NODE_ENV`',
        ],
        commands: ['npx eslint --rule \'{"no-console": "error"}\' src/'],
        testingStrategy: 'Check browser console after production build — should be empty.',
        rollbackPlan: 'Restore removed console statements.',
        successCriteria: ['Zero `console.log` calls in production JS bundles'],
      },
    })];
  }

  // ── Fake setTimeout for "saving" UX ─────────────────────────────────────

  private _checkFakeTimeouts(files: FileMetadata[], ctx: AnalysisContext): Finding[] {
    const findings: Finding[] = [];
    const fakeTimeoutPattern = /setTimeout\s*\(\s*\(\s*\)\s*=>\s*\{[\s\S]{0,300}setIs(?:Saving|Loading|Discarding)/g;

    for (const file of files) {
      const src = this.readFile(file.path);
      if (file.path.includes('reset-password') || file.path.includes('analysis')) continue;
      if (!fakeTimeoutPattern.test(src)) continue;

      findings.push(this.finding({
        category: FindingCategory.CODE_QUALITY,
        severity: Severity.MEDIUM,
        title: `Fake \`setTimeout\` Delay for Save UX in \`${path.basename(file.path)}\``,
        description:
          `\`${path.relative(ctx.projectRoot, file.path)}\` uses \`setTimeout\` to simulate a "Saving…" loading state ` +
          'without actually performing any async operation. This wastes 800–1200ms of user time on every save, ' +
          'making the app feel slower than it actually is.',
        location: file.path,
        impact: { score: 5, description: 'Artificially delays every settings save by 1–1.2 seconds.' },
        effort: { hours: 0.5, complexity: 'simple' },
        recommendation: {
          action: 'Remove `setTimeout` and await the actual `updateSettings()` call directly.',
          steps: [
            'Convert `handleSave` to `async`',
            'Call `await updateSettings(formData)` directly',
            'Use a `try/catch` block and `toast.success` / `toast.error` for feedback',
            'Remove the `setTimeout` wrapper entirely',
          ],
          codeExample: {
            before: `const handleSave = () => {
  setIsSaving(true);
  setTimeout(() => {
    updateSettings(formData);
    setIsSaving(false);
  }, 1200);
};`,
            after: `const handleSave = async () => {
  setIsSaving(true);
  try {
    await updateSettings(formData);
    toast.success('Settings saved!');
  } catch {
    toast.error('Failed to save settings.');
  } finally {
    setIsSaving(false);
  }
};`,
          },
          testingStrategy: 'Verify save responds immediately without artificial delay.',
          rollbackPlan: 'Restore `setTimeout` wrapper.',
          successCriteria: ['Settings save completes in < 200ms (real network time only)'],
        },
      }));
    }

    return findings;
  }

  // ── Untyped Server Action parameters ─────────────────────────────────────

  private _checkUntypedServerActions(files: FileMetadata[], ctx: AnalysisContext): Finding[] {
    const findings: Finding[] = [];
    // Actions files that use `any` in function signatures
    const actionFiles = files.filter(f => f.path.includes(path.sep + 'actions' + path.sep));

    for (const file of actionFiles) {
      const src = this.readFile(file.path);
      // Look for function parameters typed as `any`
      const hasAnyParam = /\(\s*\w+\s*:\s*any/.test(src);
      if (!hasAnyParam) continue;

      findings.push(this.finding({
        category: FindingCategory.CODE_QUALITY,
        severity: Severity.MEDIUM,
        title: `Untyped Parameters in Server Action: \`${path.basename(file.path)}\``,
        description:
          `\`${path.relative(ctx.projectRoot, file.path)}\` contains Server Action functions with \`any\`-typed parameters. ` +
          'This prevents TypeScript from catching invalid data shapes passed from Client Components.',
        location: file.path,
        impact: { score: 5, description: 'Runtime data validation gap in Server Actions.' },
        effort: { hours: 2, complexity: 'simple' },
        recommendation: {
          action: 'Add Zod schema validation or explicit TypeScript interfaces to all Server Action parameters.',
          steps: [
            'Define a Zod schema for the input shape',
            'Call `schema.parse(input)` at the top of the action',
            'Return typed error responses instead of throwing',
          ],
          codeExample: {
            before: `export async function createAdmin(data: any) {
  const { nama, email } = data;`,
            after: `const CreateAdminSchema = z.object({
  nama: z.string().min(1),
  email: z.string().email(),
});

export async function createAdmin(data: z.infer<typeof CreateAdminSchema>) {
  const { nama, email } = CreateAdminSchema.parse(data);`,
          },
          testingStrategy: 'Pass invalid data from the client and verify it is rejected with a typed error.',
          rollbackPlan: 'Remove Zod validation and restore `any` types.',
          successCriteria: ['All Server Action inputs are validated at runtime', 'Zero `any` in action function signatures'],
        },
      }));
    }

    return findings;
  }
}
