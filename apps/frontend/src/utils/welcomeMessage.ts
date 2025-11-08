/**
 * Display welcome message in console
 */

export function displayWelcomeMessage() {
  const styles = {
    title: "color: #3b82f6; font-size: 20px; font-weight: bold;",
    subtitle: "color: #64748b; font-size: 12px;",
    section: "color: #10b981; font-weight: bold;",
    text: "color: #64748b;",
    code: "background: #1e293b; color: #f1f5f9; padding: 2px 6px; border-radius: 3px;",
  };

  console.log("%c🚀 Fancy Trader", styles.title);
  console.log("%cKCU Real-time LTP Setup Monitor & Discord Alerts", styles.subtitle);
  console.log("");

  console.log("%c📊 Current Mode:", styles.section);
  console.log("%c   Using mock data (backend not connected)", styles.text);
  console.log("");

  console.log("%c🔧 To enable live data:", styles.section);
  console.log(
    "%c   1. Open terminal and run: %ccd backend && npm run dev",
    styles.text,
    styles.code
  );
  console.log('%c   2. Click the "Go Live" button in the app header', styles.text);
  console.log("");

  console.log("%c📚 Documentation:", styles.section);
  console.log("%c   • Quick Start: /QUICKSTART.md", styles.text);
  console.log("%c   • Deployment: /DEPLOYMENT.md", styles.text);
  console.log("%c   • Integration: /docs/Backend-Integration.md", styles.text);
  console.log("");

  console.log("%c💡 Pro Tip:", styles.section);
  console.log(
    '%c   Toggle between mock and live data anytime with the "Mock"/"Go Live" button',
    styles.text
  );
  console.log("");
}
