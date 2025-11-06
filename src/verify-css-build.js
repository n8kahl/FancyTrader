#!/usr/bin/env node

/**
 * Verify that CSS is being built correctly
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Verifying CSS Build...\n');

const distDir = path.join(__dirname, 'dist');
const assetsDir = path.join(distDir, 'assets');

// Check if dist exists
if (!fs.existsSync(distDir)) {
  console.error('❌ dist/ directory not found!');
  console.error('Run: npm run build');
  process.exit(1);
}

console.log('✅ dist/ directory exists');

// Check if assets exists
if (!fs.existsSync(assetsDir)) {
  console.error('❌ dist/assets/ directory not found!');
  process.exit(1);
}

console.log('✅ dist/assets/ directory exists');

// Find CSS files
const files = fs.readdirSync(assetsDir);
const cssFiles = files.filter(f => f.endsWith('.css'));

if (cssFiles.length === 0) {
  console.error('❌ No CSS files found in dist/assets/');
  console.error('This means Tailwind CSS was NOT built!');
  console.error('\nPossible causes:');
  console.error('  1. tailwindcss-animate is missing');
  console.error('  2. PostCSS config is incorrect');
  console.error('  3. Tailwind config is broken');
  console.error('\nRun: npm install tailwindcss-animate');
  process.exit(1);
}

console.log(`✅ Found ${cssFiles.length} CSS file(s):`);

// Check each CSS file
let hasIssues = false;
cssFiles.forEach(file => {
  const filePath = path.join(assetsDir, file);
  const stats = fs.statSync(filePath);
  const sizeKB = (stats.size / 1024).toFixed(2);
  
  console.log(`   📄 ${file} (${sizeKB} KB)`);
  
  if (stats.size === 0) {
    console.error(`   ❌ File is empty!`);
    hasIssues = true;
  } else if (stats.size < 10000) {
    console.warn(`   ⚠️  File is suspiciously small (< 10KB)`);
    hasIssues = true;
  } else {
    // Read file and check for Tailwind
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check for common Tailwind classes
    const hasTailwind = content.includes('bg-background') || 
                       content.includes('text-foreground') ||
                       content.includes('.border-border');
    
    if (hasTailwind) {
      console.log(`   ✅ Contains Tailwind CSS`);
    } else {
      console.warn(`   ⚠️  Doesn't seem to contain Tailwind CSS`);
      hasIssues = true;
    }
  }
});

// Check index.html
const indexPath = path.join(distDir, 'index.html');
if (fs.existsSync(indexPath)) {
  console.log('\n✅ index.html exists');
  const html = fs.readFileSync(indexPath, 'utf8');
  
  // Check if CSS is referenced
  const cssLinks = html.match(/<link[^>]*rel="stylesheet"[^>]*>/g) || [];
  console.log(`   Found ${cssLinks.length} stylesheet link(s)`);
  
  if (cssLinks.length === 0) {
    console.error('   ❌ No CSS links found in index.html!');
    hasIssues = true;
  } else {
    cssLinks.forEach(link => {
      console.log(`   📎 ${link}`);
    });
  }
} else {
  console.error('❌ index.html not found!');
  hasIssues = true;
}

console.log('\n' + '='.repeat(50));

if (hasIssues) {
  console.error('⚠️  Some issues were detected');
  console.error('The build may not work correctly in production');
  process.exit(1);
} else {
  console.log('✅ All checks passed!');
  console.log('The build should work correctly');
  console.log('\nNext steps:');
  console.log('  1. Test locally: npm run preview');
  console.log('  2. Deploy: git push');
}
