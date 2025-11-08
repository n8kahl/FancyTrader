import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/globals.css";
import { getMode, isDev, getBackendUrl, getBackendWsUrl } from "./utils/env";
import { getBackendConnectionDeps } from "./hooks/backendConnectionDeps";
import { backendConnectionDefaults } from "./hooks/backendConnectionDefaults";

const backendDeps = getBackendConnectionDeps(backendConnectionDefaults);

// Comprehensive startup logging
console.log("━".repeat(80));
console.log("🚀 FANCY TRADER - APPLICATION STARTUP");
console.log("━".repeat(80));
console.log("⏰ Timestamp:", new Date().toISOString());
console.log("📍 Location:", window.location.href);
console.log("");

console.log("📦 ENVIRONMENT:");
console.log("  Mode:", getMode());
console.log("  Dev Mode:", isDev());
console.log("  Protocol:", window.location.protocol);
console.log("  Host:", window.location.host);
console.log("");

console.log("🌐 BACKEND CONFIGURATION:");
console.log("  HTTP URL:", getBackendUrl());
console.log("  WebSocket URL:", getBackendWsUrl());
console.log("");

console.log("📄 CSS LOADING:");
console.log("  Import: globals.css loaded");
console.log("  Stylesheets before render:", document.styleSheets.length);
console.log("");

console.log("🔍 DEPENDENCIES CHECK:");
console.log("  React version:", React.version);
console.log("  React DOM available:", !!ReactDOM);
console.log("  Root element:", !!document.getElementById("root"));
console.log("");

// Check if Tailwind is working
setTimeout(() => {
  const stylesheets = document.styleSheets.length;
  let totalRules = 0;
  const cssFileNames: string[] = [];

  try {
    Array.from(document.styleSheets).forEach((sheet) => {
      try {
        totalRules += sheet.cssRules?.length || 0;
        if (sheet.href) {
          const fileName = new URL(sheet.href).pathname.split("/").pop() || "unknown";
          cssFileNames.push(fileName);
        } else {
          cssFileNames.push("inline");
        }
      } catch {
        // CORS error, skip
      }
    });
  } catch (_error) {
    console.error("❌ Error analyzing stylesheets:", _error);
  }

  console.log("━".repeat(80));
  console.log("🎨 CSS POST-RENDER ANALYSIS:");
  console.log("  Total stylesheets:", stylesheets);
  console.log("  Total CSS rules:", totalRules);
  console.log("  CSS files:", cssFileNames.join(", "));
  console.log(
    "  Status:",
    totalRules > 100 ? "✅ CSS LOADED" : "❌ CSS NOT LOADED (only " + totalRules + " rules)"
  );
  console.log("━".repeat(80));

  if (totalRules < 100) {
    console.error("");
    console.error("🚨 CRITICAL: CSS NOT LOADED PROPERLY!");
    console.error("Expected: 1000+ CSS rules");
    console.error("Actual: " + totalRules + " rules");
    console.error("");
    console.error("This means:");
    console.error("1. Tailwind CSS did not build correctly");
    console.error("2. Vercel may be using cached broken build");
    console.error("3. tailwindcss-animate may not be installed");
    console.error("");
    console.error("Solution:");
    console.error("1. Clear Vercel build cache");
    console.error('2. Redeploy with "Use existing build cache" UNCHECKED');
    console.error("3. Wait for fresh build");
    console.error("");
  }
}, 1000);

console.log("🎯 RENDERING APP...");
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App backendDeps={backendDeps} />
  </React.StrictMode>
);

console.log("✅ React app rendered - check CSS status above in 1 second");
console.log("━".repeat(80));
