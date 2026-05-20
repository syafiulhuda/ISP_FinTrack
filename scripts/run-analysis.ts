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

// 1. Cek apakah folder/file outputDir sudah ada
if (fs.existsSync(outputDir)) {
  console.log(`🗑️  Menghapus data existing di: ${outputDir}`);
  // 2. Hapus folder beserta seluruh isinya
  fs.rmSync(outputDir, { recursive: true, force: true });
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