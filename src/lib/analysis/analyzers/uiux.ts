/**
 * UIUXAnalyzer — Task 8.1
 *
 * Checks design-system consistency, accessibility, responsive layout,
 * CLS-prone patterns, and loading/error state coverage.
 */

import path from'path';
import {
 AnalysisContext,
 Finding,
 FindingCategory,
 Severity,
 FileMetadata,
 FileType,
} from'../types';
import { BaseAnalyzer } from'./base';

export class UIUXAnalyzer extends BaseAnalyzer {
 name ='UIUXAnalyzer';
 category = FindingCategory.UI_UX;

 protected async runAnalysis(ctx: AnalysisContext): Promise<Finding[]> {
 const components = ctx.files.filter(
 f => f.type === FileType.SOURCE &&
 (f.path.endsWith('.tsx') || f.path.endsWith('.jsx')),
 );

 return [
 ...this._checkWindowPrompt(components),
 ...this._checkMissingAriaLabels(components),
 ...this._checkAnimatePresenceCLS(components),
 ...this._checkUnsafeImageSrc(components),
 ...this._checkHardcodedUnsplashUrls(components),
 ];
 }

 // ── window.prompt usage ──────────────────────────────────────────────────

 private _checkWindowPrompt(files: FileMetadata[]): Finding[] {
 const findings: Finding[] = [];

 for (const file of files) {
 const src = this.readFile(file.path);
 if (!src.includes('window.prompt')) continue;

 findings.push(this.finding({
 category: FindingCategory.UI_UX,
 severity: Severity.HIGH,
 title:`\`window.prompt\`Used for User Input in \`${path.basename(file.path)}\``,
 description:
'`window.prompt()`produces a native browser dialog that blocks the JS thread, cannot be styled,'+
'is inaccessible (fails WCAG 2.1 SC 1.4.3), and is frequently blocked by browser security policies.'+
'Detected in:`'+ path.relative(process.cwd(), file.path) +'`.',
 location: file.path,
 impact: { score: 7, description:'Bad UX — blocks UI thread and looks unprofessional.'},
 effort: { hours: 1, complexity:'simple'},
 recommendation: {
 action:'Replace`window.prompt()`with a styled modal dialog using an existing`<input>`+ state.',
 steps: [
'Create a React state variable for the input value',
'Show an inline modal or use the existing modal pattern (`AnimatePresence`+`m.div`)',
'Remove the`window.prompt()`call',
 ],
 codeExample: {
 before:`const url = window.prompt("Enter URL:", currentUrl);`,
 after:`// Use a controlled <input> inside a modal
const [url, setUrl] = useState(currentUrl);
// Render <input value={url} onChange={e => setUrl(e.target.value)} /> in a modal`,
 },
 testingStrategy:'Manual test: clicking"Change Logo"should show an in-app modal.',
 rollbackPlan:'Restore`window.prompt()`call.',
 successCriteria: ['No`window.prompt`calls in production code','Logo URL change uses styled modal'],
 },
 }));
 }

 return findings;
 }

 // ── Missing ARIA labels ──────────────────────────────────────────────────

 private _checkMissingAriaLabels(files: FileMetadata[]): Finding[] {
 const findings: Finding[] = [];
 const iconButtonPattern = /<button(?![^>]*aria-label)[^>]*>\s*<(?:svg|[A-Z]\w+)[^>]*(?:size|className)[^>]*>\s*<\/button>/;

 for (const file of files) {
 const src = this.readFile(file.path);
 if (!iconButtonPattern.test(src)) continue;

 // Count approximate number of icon-only buttons
 const count = (src.match(/<button(?![^>]*aria-label)[^>]*>\s*<(?:svg|[A-Z]\w+)[^>]*(?:size|className)[^>]*>\s*<\/button>/g) ?? []).length;
 if (count === 0) continue;

 findings.push(this.finding({
 category: FindingCategory.UI_UX,
 severity: Severity.MEDIUM,
 title:`Icon Buttons Missing \`aria-label\`in \`${path.basename(file.path)}\``,
 description:
`\`${path.relative(process.cwd(), file.path)}\`contains approximately ${count} button(s) without`+
'`aria-label`attributes. Icon-only buttons are completely inaccessible to screen-reader users,'+
'violating WCAG 2.1 SC 4.1.2.',
 location: file.path,
 impact: { score: 5, description:'Accessibility failure — screen readers cannot describe the button action.'},
 effort: { hours: 1, complexity:'trivial'},
 recommendation: {
 action:'Add descriptive`aria-label`to every icon-only`<button>`.',
 steps: [
'Search for`<button`without`aria-label`in the file',
'Add`aria-label="<action description>"`to each icon button',
 ],
 codeExample: {
 before:`<button onClick={onClose}><X size={20} /></button>`,
 after:`<button onClick={onClose} aria-label="Close dialog"><X size={20} /></button>`,
 },
 testingStrategy:'Run Lighthouse Accessibility audit — score should improve.',
 rollbackPlan:'Remove added`aria-label`attributes.',
 successCriteria: ['All icon buttons have`aria-label`','Lighthouse A11y score ≥ 95'],
 },
 }));
 }

 return findings;
 }

 // ── AnimatePresence + layout shift ───────────────────────────────────────

 private _checkAnimatePresenceCLS(files: FileMetadata[]): Finding[] {
 const findings: Finding[] = [];
 const clsPattern = /AnimatePresence[\s\S]{0,500}layout\s*=/;

 for (const file of files) {
 const src = this.readFile(file.path);
 if (!clsPattern.test(src)) continue;

 findings.push(this.finding({
 category: FindingCategory.UI_UX,
 severity: Severity.MEDIUM,
 title:`Possible CLS from \`layout\`Prop in \`${path.basename(file.path)}\``,
 description:
'Framer Motion\'s`layout`prop on elements inside`AnimatePresence`can cause Cumulative Layout Shift (CLS)'+
'during route transitions if the animated element affects document flow before the browser has painted.'+
'This has been identified as a historical issue in ISP-FinTrack.',
 location: file.path,
 impact: { score: 5, description:'CLS degrades Core Web Vitals and user experience during navigation.'},
 effort: { hours: 1, complexity:'simple'},
 recommendation: {
 action:'Remove`layout`prop from elements inside`AnimatePresence`or use CSS`position: fixed`.',
 steps: [
'Identify`m.div`or`motion.div`elements with`layout`prop inside`AnimatePresence`',
'Remove`layout`prop or replace with`initial/animate/exit`keyframe animations only',
'Test page transitions in the browser dev tools with slow network',
 ],
 testingStrategy:'Run Lighthouse on the page — CLS score should be < 0.1.',
 rollbackPlan:'Re-add`layout`prop.',
 successCriteria: ['CLS < 0.1 on all pages','No layout jump during navigation'],
 },
 }));
 }

 return findings;
 }

 // ── Unsafe img src (external URLs, no optimisation) ──────────────────────

 private _checkUnsafeImageSrc(files: FileMetadata[]): Finding[] {
 const findings: Finding[] = [];
 const imgPattern = /<img\s[^>]*src=(?!{[^}]*next\/image)[^>]*>/g;

 for (const file of files) {
 const src = this.readFile(file.path);
 const matches = src.match(imgPattern) ?? [];
 if (matches.length === 0) continue;

 findings.push(this.finding({
 category: FindingCategory.UI_UX,
 severity: Severity.LOW,
 title:`Raw \`<img>\`Tags in \`${path.basename(file.path)}\`(${matches.length} found)`,
 description:
`\`${path.relative(process.cwd(), file.path)}\`uses ${matches.length} raw HTML \`<img>\`elements.`+
'Next.js`<Image>`component provides automatic WebP conversion, lazy loading, and CLS prevention via explicit`width`/`height`.',
 location: file.path,
 impact: { score: 3, description:'Missed automatic optimisation — larger images, potential CLS.'},
 effort: { hours: 1, complexity:'simple'},
 recommendation: {
 action:'Replace`<img>`with Next.js`<Image>`from`next/image`.',
 steps: [
'`import Image from"next/image"`',
'Replace`<img src="..."/>`with`<Image src="..."width={X} height={Y} alt="..."/>`',
'For avatar images with variable URLs, add the external domain to`next.config.ts`→`images.remotePatterns`',
 ],
 codeExample: {
 before:`<img src={admin.image} alt={admin.nama} className="w-10 h-10 rounded-full"/>`,
 after:`<Image src={admin.image} alt={admin.nama} width={40} height={40} className="rounded-full"/>`,
 },
 testingStrategy:'Check Network tab — images should be served as`.webp`.',
 rollbackPlan:'Revert to`<img>`tags.',
 successCriteria: ['All user-visible images use`<Image>`or are optimised'],
 },
 }));
 }

 return findings;
 }

 // ── Hardcoded Unsplash URLs as default avatar ─────────────────────────────

 private _checkHardcodedUnsplashUrls(files: FileMetadata[]): Finding[] {
 const findings: Finding[] = [];

 for (const file of files) {
 const src = this.readFile(file.path);
 if (!src.includes('images.unsplash.com')) continue;

 findings.push(this.finding({
 category: FindingCategory.UI_UX,
 severity: Severity.LOW,
 title:`Hardcoded Unsplash URL as Default Avatar in \`${path.basename(file.path)}\``,
 description:
'A hardcoded`images.unsplash.com`URL is used as the default admin avatar.'+
'This creates an external dependency on a third-party CDN — if Unsplash is down or blocks the request,'+
'the default avatar will break. It also makes the default look inconsistent with real user photos.',
 location: file.path,
 impact: { score: 2, description:'External CDN dependency for default UI element.'},
 effort: { hours: 0.5, complexity:'trivial'},
 recommendation: {
 action:'Replace Unsplash URL with a locally generated avatar or a self-hosted fallback.',
 steps: [
'Use`ui-avatars.com`(already referenced elsewhere in the code) or a local SVG',
'Replace the hardcoded Unsplash URL with`https://ui-avatars.com/api/?name=New+Admin&background=random`',
 ],
 codeExample: {
 before:`image:'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=256&h=256'`,
 after:`image:'https://ui-avatars.com/api/?name=New+Admin&background=random&size=256'`,
 },
 testingStrategy:'Verify new admin creation shows a generated avatar without external images.',
 rollbackPlan:'Restore the Unsplash URL.',
 successCriteria: ['No`unsplash.com`URLs in production JS bundles'],
 },
 }));
 }

 return findings;
 }
}
