import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

/**
 * Build Logger Plugin
 * Logs detailed information during Vite build process
 */
export function buildLoggerPlugin(): Plugin {
  return {
    name: 'build-logger',
    
    configResolved(config) {
      console.log('\n' + '='.repeat(80));
      console.log('🔧 VITE BUILD CONFIGURATION');
      console.log('='.repeat(80));
      console.log('Mode:', config.mode);
      console.log('Command:', config.command);
      console.log('Root:', config.root);
      console.log('Build outDir:', config.build.outDir);
      console.log('CSS code split:', config.build.cssCodeSplit);
      console.log('='.repeat(80) + '\n');
    },

    buildStart() {
      console.log('\n' + '='.repeat(80));
      console.log('🏗️ BUILD STARTED');
      console.log('='.repeat(80));
      console.log('Timestamp:', new Date().toISOString());
      
      // Check for critical dependencies
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        console.log('\n📦 DEPENDENCIES CHECK:');
        console.log('  tailwindcss:', packageJson.devDependencies?.tailwindcss || 'NOT FOUND');
        console.log('  tailwindcss-animate:', packageJson.dependencies?.['tailwindcss-animate'] || 'NOT FOUND');
        console.log('  postcss:', packageJson.devDependencies?.postcss || 'NOT FOUND');
        console.log('  autoprefixer:', packageJson.devDependencies?.autoprefixer || 'NOT FOUND');
      }
      
      // Check for Tailwind config
      const tailwindConfigPath = path.join(process.cwd(), 'tailwind.config.js');
      console.log('\n⚙️ CONFIGURATION FILES:');
      console.log('  tailwind.config.js:', fs.existsSync(tailwindConfigPath) ? '✅ EXISTS' : '❌ MISSING');
      
      // Validate Tailwind config for module system issues
      if (fs.existsSync(tailwindConfigPath)) {
        const tailwindConfig = fs.readFileSync(tailwindConfigPath, 'utf-8');
        const hasRequire = tailwindConfig.includes('require(');
        const hasImport = tailwindConfig.includes('import ');
        const hasExportDefault = tailwindConfig.includes('export default');
        
        if (hasRequire && (hasImport || hasExportDefault)) {
          console.log('  ⚠️ WARNING: Mixed module systems detected in tailwind.config.js');
          console.log('     (Has both require() and import/export)');
        } else {
          console.log('  ✅ Module system consistent');
        }
      }
      
      const postcssConfigPath = path.join(process.cwd(), 'postcss.config.js');
      console.log('  postcss.config.js:', fs.existsSync(postcssConfigPath) ? '✅ EXISTS' : '❌ MISSING');
      
      // Validate PostCSS config
      if (fs.existsSync(postcssConfigPath)) {
        const postcssConfig = fs.readFileSync(postcssConfigPath, 'utf-8');
        const hasDirectImports = postcssConfig.includes('import tailwindcss') && postcssConfig.includes('import autoprefixer');
        
        if (hasDirectImports) {
          console.log('  ✅ PostCSS using direct imports (recommended)');
        } else {
          console.log('  ⚠️ PostCSS using string references (may cause issues)');
        }
      }
      
      const globalsPath = path.join(process.cwd(), 'styles/globals.css');
      console.log('  styles/globals.css:', fs.existsSync(globalsPath) ? '✅ EXISTS' : '❌ MISSING');
      
      // Check globals.css content
      if (fs.existsSync(globalsPath)) {
        const globalsContent = fs.readFileSync(globalsPath, 'utf-8');
        const hasTailwindDirectives = globalsContent.includes('@tailwind');
        console.log('  @tailwind directives:', hasTailwindDirectives ? '✅ FOUND' : '❌ MISSING');
      }
      
      console.log('='.repeat(80) + '\n');
    },

    buildEnd() {
      console.log('\n' + '='.repeat(80));
      console.log('✅ BUILD COMPLETED');
      console.log('='.repeat(80));
      console.log('Timestamp:', new Date().toISOString());
      
      // Check output CSS files
      const distPath = path.join(process.cwd(), 'dist/assets');
      if (fs.existsSync(distPath)) {
        const files = fs.readdirSync(distPath);
        const cssFiles = files.filter(f => f.endsWith('.css'));
        
        console.log('\n📄 CSS FILES GENERATED:');
        cssFiles.forEach(file => {
          const filePath = path.join(distPath, file);
          const stats = fs.statSync(filePath);
          const sizeKB = (stats.size / 1024).toFixed(2);
          console.log(`  ${file}: ${sizeKB} KB`);
          
          if (stats.size < 10000) {
            console.log(`    ⚠️ WARNING: File is very small (${sizeKB} KB)`);
            console.log(`    Expected: ~100-200 KB for full Tailwind build`);
          } else {
            console.log(`    ✅ Size looks good`);
          }
        });
      }
      
      console.log('='.repeat(80) + '\n');
    },

    closeBundle() {
      console.log('\n' + '='.repeat(80));
      console.log('📦 BUNDLE CLOSED');
      console.log('='.repeat(80));
      console.log('Build process complete!');
      console.log('='.repeat(80) + '\n');
    }
  };
}
