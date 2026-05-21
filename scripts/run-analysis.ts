#!/usr/bin/env ts-node
/**
 * scripts/run-analysis.ts
 *
 * CLI entry point to run the ISP-FinTrack project analysis.
 *
 * Usage:
 * npx ts-node --project tsconfig.scripts.json scripts/run-analysis.ts
 * # or
 * npm run analyze
 */

import path from 'path';
import fs from 'fs'; // Tambahkan import fs
import { runAnalysis } from '../src/lib/analysis/index';

const projectRoot = path.resolve(__dirname, '..');
const outputDir = path.join(projectRoot, 'testcase');

// 1. Bersihkan report lama tapi JANGAN hapus folder keseluruhan agar scenario.md aman
if (fs.existsSync(outputDir)) {
  console.log(`🗑️  Menghapus report lama di: ${outputDir}`);
  const files = fs.readdirSync(outputDir);
  for (const file of files) {
    if (file.startsWith('analysis-report-')) {
      fs.rmSync(path.join(outputDir, file), { force: true });
    }
  }
} else {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log('🚀 Memulai proses analisis baru...');

// 3. Jalankan analisis untuk membuat file baru
runAnalysis({
  projectRoot,
  outputDir,
}).catch((err: Error) => {
  console.error('❌ Analysis failed:', err.message);
  process.exit(1);
});