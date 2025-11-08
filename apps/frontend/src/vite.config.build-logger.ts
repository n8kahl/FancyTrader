import type { Plugin } from "vite";
import fs from "fs";
import path from "path";

/**
 * Build Logger Plugin
 * Logs detailed information during Vite build process
 */
export function buildLoggerPlugin(): Plugin {
  return {
    name: "build-logger",

    configResolved(config) {
      console.log("\n" + "=".repeat(80));
      console.log("🔧 VITE BUILD CONFIGURATION");
      console.log("=".repeat(80));
      console.log("Mode:", config.mode);
      console.log("Command:", config.command);
      console.log("Root:", config.root);
      console.log("Build outDir:", config.build.outDir);
      console.log("CSS code split:", config.build.cssCodeSplit);
      console.log("=".repeat(80) + "\n");
    },

    buildStart() {
      console.log("\n" + "=".repeat(80));
      console.log("🏗️ BUILD STARTED");
      console.log("=".repeat(80));
      console.log("Timestamp:", new Date().toISOString());

      // Check for critical dependencies
      const packageJsonPath = path.join(process.cwd(), "package.json");
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
        console.log("\n📦 DEPENDENCIES CHECK:");
        console.log("  tailwindcss:", packageJson.devDependencies?.tailwindcss || "NOT FOUND");
        console.log(
          "  tailwindcss-animate:",
          packageJson.dependencies?.["tailwindcss-animate"] || "NOT FOUND"
        );
        console.log("  postcss:", packageJson.devDependencies?.postcss || "NOT FOUND");
        console.log("  autoprefixer:", packageJson.devDependencies?.autoprefixer || "NOT FOUND");
      }

      // Check for Tailwind config (.cjs preferred)
      const tailwindConfigCjs = path.join(process.cwd(), "tailwind.config.cjs");
      const tailwindConfigJs = path.join(process.cwd(), "tailwind.config.js");

      console.log("\n⚙️ CONFIGURATION FILES:");

      if (fs.existsSync(tailwindConfigCjs)) {
        console.log("  tailwind.config.cjs: ✅ EXISTS (CommonJS - RECOMMENDED)");
        const tailwindConfig = fs.readFileSync(tailwindConfigCjs, "utf-8");
        if (tailwindConfig.includes("module.exports")) {
          console.log("  ✅ Using module.exports (correct for .cjs)");
        } else {
          console.log("  ⚠️ WARNING: .cjs file should use module.exports");
        }
      } else if (fs.existsSync(tailwindConfigJs)) {
        console.log("  tailwind.config.js: ✅ EXISTS (may have module issues)");
        console.log("  💡 Consider renaming to .cjs for better compatibility");
      } else {
        console.log("  tailwind.config: ❌ MISSING");
      }

      // Check for PostCSS config (.cjs preferred)
      const postcssConfigCjs = path.join(process.cwd(), "postcss.config.cjs");
      const postcssConfigJs = path.join(process.cwd(), "postcss.config.js");

      if (fs.existsSync(postcssConfigCjs)) {
        console.log("  postcss.config.cjs: ✅ EXISTS (CommonJS - RECOMMENDED)");
        const postcssConfig = fs.readFileSync(postcssConfigCjs, "utf-8");
        if (postcssConfig.includes("module.exports")) {
          console.log("  ✅ Using module.exports (correct for .cjs)");
        } else {
          console.log("  ⚠️ WARNING: .cjs file should use module.exports");
        }
      } else if (fs.existsSync(postcssConfigJs)) {
        console.log("  postcss.config.js: ✅ EXISTS (may have module issues)");
        console.log("  💡 Consider renaming to .cjs for better compatibility");
      } else {
        console.log("  postcss.config: ❌ MISSING");
      }

      const globalsPath = path.join(process.cwd(), "styles/globals.css");
      console.log("  styles/globals.css:", fs.existsSync(globalsPath) ? "✅ EXISTS" : "❌ MISSING");

      // Check globals.css content
      if (fs.existsSync(globalsPath)) {
        const globalsContent = fs.readFileSync(globalsPath, "utf-8");
        const hasTailwindDirectives = globalsContent.includes("@tailwind");
        console.log("  @tailwind directives:", hasTailwindDirectives ? "✅ FOUND" : "❌ MISSING");
      }

      console.log("=".repeat(80) + "\n");
    },

    buildEnd() {
      console.log("\n" + "=".repeat(80));
      console.log("✅ BUILD COMPLETED");
      console.log("=".repeat(80));
      console.log("Timestamp:", new Date().toISOString());

      // Check output CSS files
      const distPath = path.join(process.cwd(), "dist/assets");
      if (fs.existsSync(distPath)) {
        const files = fs.readdirSync(distPath);
        const cssFiles = files.filter((f) => f.endsWith(".css"));

        console.log("\n📄 CSS FILES GENERATED:");
        cssFiles.forEach((file) => {
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

      console.log("=".repeat(80) + "\n");
    },

    closeBundle() {
      console.log("\n" + "=".repeat(80));
      console.log("📦 BUNDLE CLOSED");
      console.log("=".repeat(80));
      console.log("Build process complete!");
      console.log("=".repeat(80) + "\n");
    },
  };
}
