/**
 * Verify that the correct Vite version is installed
 * This script MUST pass before building
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const REQUIRED_VITE_VERSION = '5.4.11';

try {
  // Read the installed Vite version
  const vitePkgPath = join(process.cwd(), 'node_modules', 'vite', 'package.json');
  const vitePkg = JSON.parse(readFileSync(vitePkgPath, 'utf-8'));
  const installedVersion = vitePkg.version;

  console.log('\n' + '='.repeat(60));
  console.log('🔍 VITE VERSION CHECK');
  console.log('='.repeat(60));
  console.log('Required version:', REQUIRED_VITE_VERSION);
  console.log('Installed version:', installedVersion);
  
  if (installedVersion === REQUIRED_VITE_VERSION) {
    console.log('✅ CORRECT VERSION INSTALLED');
    console.log('='.repeat(60) + '\n');
    process.exit(0);
  } else {
    console.log('❌ WRONG VERSION INSTALLED!');
    console.log('='.repeat(60));
    console.error('\n🚨 ERROR: Vite version mismatch!');
    console.error(`Expected: ${REQUIRED_VITE_VERSION}`);
    console.error(`Got: ${installedVersion}`);
    console.error('\nVite 6.x has breaking changes that prevent Tailwind from compiling.');
    console.error('You MUST use Vite 5.4.11 for this project to build correctly.');
    console.error('\n📝 SOLUTION: Create a package-lock.json file locally:');
    console.error('  1. rm -rf node_modules package-lock.json');
    console.error('  2. npm install');
    console.error('  3. git add package-lock.json');
    console.error('  4. git commit -m "Lock Vite to 5.4.11"');
    console.error('  5. git push\n');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Error reading Vite version:', error.message);
  console.error('Make sure node_modules/vite is installed');
  process.exit(1);
}
