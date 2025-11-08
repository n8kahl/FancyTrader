import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Copy,
  RefreshCw,
} from "lucide-react";
import { BACKEND_CONFIG } from "../config/backend";
import { getMode, isDev, getBackendUrl, getBackendWsUrl } from "../utils/env";

type TimelineValue = number | string;

interface StylesheetDiagnostics {
  index: number;
  href: string;
  ruleCount?: number;
  disabled: boolean;
  firstRules?: string[];
  hasTailwindUtilities?: boolean;
  error?: string;
}

interface CssDiagnostics {
  stylesheets: StylesheetDiagnostics[];
  totalStylesheets: number;
  tailwindLoaded: boolean;
  cssFileSize: string;
  cssFileStatus: string;
  cssFirstBytes: string;
}

interface DomDiagnostics {
  hasCSSClasses: boolean;
  bodyClasses: string;
  htmlClasses: string;
  rootElement: boolean;
  tailwindClasses: string[];
  error?: string;
}

interface EnvironmentDiagnostics {
  isDev: boolean;
  mode: string;
  backendUrl: string;
  backendWsUrl: string;
  envVars: {
    VITE_BACKEND_URL: string;
    VITE_BACKEND_WS_URL: string;
  };
}

interface BuildDiagnostics {
  userAgent: string;
  location: string;
  protocol: string;
  baseUrl: string;
  buildTime: string;
}

interface BrowserDiagnostics {
  online: boolean;
  cookiesEnabled: boolean;
  language: string;
}

interface PerformanceDiagnostics {
  cssLoadTime: number;
  domContentLoaded: TimelineValue;
  loadComplete: TimelineValue;
  error?: string;
}

interface DiagnosticsReport {
  timestamp: string;
  environment: EnvironmentDiagnostics;
  css: CssDiagnostics;
  dom: DomDiagnostics;
  build: BuildDiagnostics;
  browser: BrowserDiagnostics;
  performance: PerformanceDiagnostics;
  error?: string;
  message?: string;
}

interface CssFileDetails {
  size: string;
  status: string;
  preview: string;
}

export function DiagnosticPanel() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsReport | null>(null);

  useEffect(() => {
    void runDiagnostics();
  }, []);

  const createEmptyDiagnostics = (message: string): DiagnosticsReport => ({
    timestamp: new Date().toISOString(),
    environment: {
      isDev: isDev(),
      mode: getMode(),
      backendUrl: BACKEND_CONFIG.httpUrl,
      backendWsUrl: BACKEND_CONFIG.wsUrl,
      envVars: {
        VITE_BACKEND_URL: getBackendUrl(),
        VITE_BACKEND_WS_URL: getBackendWsUrl(),
      },
    },
    css: {
      stylesheets: [],
      totalStylesheets: 0,
      tailwindLoaded: false,
      cssFileSize: "N/A",
      cssFileStatus: "unknown",
      cssFirstBytes: "",
    },
    dom: {
      hasCSSClasses: false,
      bodyClasses: "",
      htmlClasses: "",
      rootElement: false,
      tailwindClasses: [],
      error: message,
    },
    build: {
      userAgent: navigator.userAgent,
      location: window.location.href,
      protocol: window.location.protocol,
      baseUrl: window.location.origin,
      buildTime:
        document.querySelector('meta[name="build-time"]')?.getAttribute("content") ||
        "unknown",
    },
    browser: {
      online: navigator.onLine,
      cookiesEnabled: navigator.cookieEnabled,
      language: navigator.language,
    },
    performance: {
      cssLoadTime: 0,
      domContentLoaded: "Error",
      loadComplete: "Error",
      error: message,
    },
    error: message,
    message,
  });

  const runDiagnostics = async (): Promise<void> => {
    try {
      console.log("🔍 Running comprehensive diagnostics...");
      console.log("━".repeat(80));

      // Get CSS file details with error handling
      let cssDetails;
      try {
        cssDetails = await getCSSFileDetails();
      } catch (error) {
        console.error("Error fetching CSS details:", error);
        cssDetails = { size: "Error", status: "fetch failed", preview: "" };
      }

      const diag: DiagnosticsReport = {
        timestamp: new Date().toISOString(),

        // Environment
        environment: {
          isDev: isDev(),
          mode: getMode(),
          backendUrl: BACKEND_CONFIG.httpUrl,
          backendWsUrl: BACKEND_CONFIG.wsUrl,
          envVars: {
            VITE_BACKEND_URL: getBackendUrl(),
            VITE_BACKEND_WS_URL: getBackendWsUrl(),
          },
        },

        // CSS Loading (Enhanced)
        css: {
          stylesheets: Array.from(document.styleSheets).map((sheet, idx) => {
            try {
              const rules = sheet.cssRules ? Array.from(sheet.cssRules) : [];
              const firstRules = rules
                .slice(0, 5)
                .map((rule) => rule.cssText?.substring(0, 80) ?? "")
                .filter((rule) => rule.length > 0);

              const info: StylesheetDiagnostics = {
                index: idx,
                href: sheet.href || "inline",
                ruleCount: rules.length,
                disabled: sheet.disabled,
                firstRules,
                hasTailwindUtilities: checkSheetForTailwind(sheet),
              };
              return info;
            } catch (_error) {
              return {
                index: idx,
                href: sheet.href || "inline",
                disabled: sheet.disabled,
                error: "CORS or access error",
              } as StylesheetDiagnostics;
            }
          }),
          totalStylesheets: document.styleSheets.length,
          tailwindLoaded: checkTailwindLoaded(),
          cssFileSize: cssDetails.size,
          cssFileStatus: cssDetails.status,
          cssFirstBytes: cssDetails.preview,
        },

        // DOM
        dom: (() => {
          try {
            return {
              hasCSSClasses: checkDOMHasClasses(),
              bodyClasses: document.body.className || "",
              htmlClasses: document.documentElement.className || "",
              rootElement: !!document.getElementById("root"),
              tailwindClasses: findTailwindClasses(),
            };
          } catch (_error) {
            console.error("Error analyzing DOM:", _error);
            return {
              hasCSSClasses: false,
              bodyClasses: "error",
              htmlClasses: "error",
              rootElement: false,
              tailwindClasses: [],
              error: String(_error),
            };
          }
        })(),

        // Build Info
        build: {
          userAgent: navigator.userAgent,
          location: window.location.href,
          protocol: window.location.protocol,
          baseUrl: window.location.origin,
          buildTime:
            document.querySelector('meta[name="build-time"]')?.getAttribute("content") || "unknown",
        },

        // Browser
        browser: {
          online: navigator.onLine,
          cookiesEnabled: navigator.cookieEnabled,
          language: navigator.language,
        },

        // Performance
        performance: (() => {
          try {
            return {
              cssLoadTime: getCSSLoadTime(),
              domContentLoaded:
                performance.timing?.domContentLoadedEventEnd -
                  performance.timing?.navigationStart || "N/A",
              loadComplete:
                performance.timing?.loadEventEnd - performance.timing?.navigationStart || "N/A",
            };
          } catch (_error) {
            console.error("Error getting performance metrics:", _error);
            return {
              cssLoadTime: 0,
              domContentLoaded: "Error",
              loadComplete: "Error",
              error: String(_error),
            };
          }
        })(),
      };

      console.log("📊 DIAGNOSTICS RESULTS:");
      console.log("━".repeat(80));
      console.log("🌐 Environment:", diag.environment);
      console.log("🎨 CSS Status:", diag.css);
      console.log("📄 DOM Status:", diag.dom);
      console.log("🏗️ Build Info:", diag.build);
      console.log("🌍 Browser:", diag.browser);
      console.log("⚡ Performance:", diag.performance);
      console.log("━".repeat(80));
      console.log("📋 Copy this JSON to share:", JSON.stringify(diag, null, 2));
      console.log("━".repeat(80));

      setDiagnostics(diag);
    } catch (error) {
      console.error("❌ Fatal error in diagnostics:", error);
      setDiagnostics(createEmptyDiagnostics(String(error)));
    }
  };

  const getCSSFileDetails = async (): Promise<CssFileDetails> => {
    const cssLink = Array.from(document.styleSheets).find(
      (sheet) => sheet.href && sheet.href.includes("index-") && sheet.href.includes(".css")
    );

    if (!cssLink?.href) {
      return { size: "N/A", status: "not found", preview: "" };
    }

    try {
      const response = await fetch(cssLink.href, { method: "HEAD" });
      const size = response.headers.get("content-length");
      const status = response.status;

      // Try to get first few bytes
      const previewResponse = await fetch(cssLink.href);
      const text = await previewResponse.text();
      const preview = text.substring(0, 500);

      console.log("📄 CSS File Analysis:");
      console.log("  URL:", cssLink.href);
      console.log("  Size:", size ? `${(parseInt(size) / 1024).toFixed(2)} KB` : "Unknown");
      console.log("  Status:", status);
      console.log("  First 500 chars:", preview);

      return {
        size: size ? `${(parseInt(size) / 1024).toFixed(2)} KB` : "Unknown",
        status: status.toString(),
        preview: preview,
      };
    } catch (_error) {
      console.error("❌ Error fetching CSS file:", _error);
      return { size: "Error", status: "fetch failed", preview: "" };
    }
  };

  const checkSheetForTailwind = (sheet: CSSStyleSheet): boolean => {
    try {
      const rules = sheet.cssRules;
      if (!rules) return false;

      // Look for common Tailwind utility patterns
      const tailwindPatterns = [".bg-", ".text-", ".flex", ".grid", ".rounded", ".border"];
      for (let i = 0; i < Math.min(rules.length, 100); i++) {
        const rule = rules[i] as CSSStyleRule;
        if (rule.selectorText) {
          for (const pattern of tailwindPatterns) {
            if (rule.selectorText.includes(pattern)) {
              return true;
            }
          }
        }
      }
      return false;
    } catch {
      return false;
    }
  };

  const findTailwindClasses = (): string[] => {
    const classes = new Set<string>();
    const elements = document.querySelectorAll("[class]");
    elements.forEach((el) => {
      const normalizedClassName = el.getAttribute("class") ?? "";

      if (normalizedClassName) {
        const classList = normalizedClassName.split(" ");
        classList.forEach((cls: string) => {
          if (cls && (/^(bg-|text-|flex|grid|rounded|border|p-|m-|w-|h-)/.exec(cls))) {
            classes.add(cls);
          }
        });
      }
    });
    return Array.from(classes).slice(0, 20);
  };

  const getCSSLoadTime = (): number => {
    const perfEntries = performance.getEntriesByType("resource");
    const cssEntry = perfEntries.find(
      (entry) => entry.name.includes(".css") && entry.name.includes("index-")
    );

    if (cssEntry && "duration" in cssEntry) {
      const duration = (cssEntry as PerformanceResourceTiming).duration;
      return typeof duration === "number" ? Math.round(duration) : 0;
    }

    return 0;
  };

  const checkTailwindLoaded = (): boolean => {
    // Check if any Tailwind utilities are defined
    const testDiv = document.createElement("div");
    testDiv.className = "bg-background";
    document.body.appendChild(testDiv);
    const styles = window.getComputedStyle(testDiv);
    const hasBg = styles.backgroundColor !== "" && styles.backgroundColor !== "rgba(0, 0, 0, 0)";
    document.body.removeChild(testDiv);
    return hasBg;
  };

  const checkDOMHasClasses = (): boolean => {
    const elements = document.querySelectorAll("[class]");
    return elements.length > 0;
  };

  const copyToClipboard = async (): Promise<void> => {
    if (!diagnostics) return;
    const payload = JSON.stringify(diagnostics, null, 2);
    await navigator.clipboard.writeText(payload);
    console.log("📋 Diagnostics copied to clipboard");
  };

  if (!diagnostics) {
    return (
      <div className="fixed bottom-4 right-4 bg-yellow-100 border border-yellow-400 text-yellow-900 px-4 py-2 rounded">
        Loading diagnostics...
      </div>
    );
  }

  const hasIssues = !diagnostics.css.tailwindLoaded || diagnostics.css.totalStylesheets === 0;

  return (
    <div
      className="fixed bottom-4 right-4 z-50"
      style={{
        position: "fixed",
        bottom: "1rem",
        right: "1rem",
        zIndex: 9999,
        maxWidth: "500px",
      }}
    >
      <Card
        className="shadow-lg"
        style={{
          backgroundColor: "white",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
        }}
      >
        <div
          className="p-4 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            padding: "1rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {hasIssues ? (
              <AlertTriangle style={{ width: "20px", height: "20px", color: "#ef4444" }} />
            ) : (
              <CheckCircle2 style={{ width: "20px", height: "20px", color: "#10b981" }} />
            )}
            <span style={{ fontWeight: "600", fontSize: "14px" }}>
              Diagnostics {hasIssues ? "(Issues Found)" : "(OK)"}
            </span>
          </div>
          {isExpanded ? (
            <ChevronUp style={{ width: "20px", height: "20px" }} />
          ) : (
            <ChevronDown style={{ width: "20px", height: "20px" }} />
          )}
        </div>

        {isExpanded && (
          <div
            className="border-t p-4 space-y-3"
            style={{
              borderTop: "1px solid #e5e7eb",
              padding: "1rem",
            }}
          >
            {/* CSS Status */}
            <div>
              <div style={{ fontWeight: "600", fontSize: "12px", marginBottom: "0.5rem" }}>
                CSS Loading
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.25rem",
                  fontSize: "12px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Stylesheets:</span>
                  <Badge
                    variant={diagnostics.css.totalStylesheets > 0 ? "default" : "destructive"}
                    style={{
                      fontSize: "11px",
                      padding: "2px 8px",
                      backgroundColor: diagnostics.css.totalStylesheets > 0 ? "#10b981" : "#ef4444",
                      color: "white",
                    }}
                  >
                    {diagnostics.css.totalStylesheets}
                  </Badge>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Tailwind:</span>
                  <Badge
                    variant={diagnostics.css.tailwindLoaded ? "default" : "destructive"}
                    style={{
                      fontSize: "11px",
                      padding: "2px 8px",
                      backgroundColor: diagnostics.css.tailwindLoaded ? "#10b981" : "#ef4444",
                      color: "white",
                    }}
                  >
                    {diagnostics.css.tailwindLoaded ? "Loaded" : "NOT LOADED"}
                  </Badge>
                </div>
                {diagnostics.css.stylesheets.map((sheet, idx) => {
                  const label =
                    sheet.href === "inline"
                      ? "Inline styles"
                      : (() => {
                          try {
                            return new URL(sheet.href).pathname.split("/").pop();
                          } catch {
                            return sheet.href;
                          }
                        })();
                  return (
                    <div
                      key={`${sheet.href}-${sheet.index ?? idx}`}
                      style={{ fontSize: "11px", color: "#6b7280", marginLeft: "1rem" }}
                    >
                      {idx + 1}. {label}
                      {sheet.ruleCount && sheet.ruleCount > 0 && ` (${sheet.ruleCount} rules)`}
                      {sheet.error && ` ⚠️ ${sheet.error}`}
                    </div>
                  );
                })}

              </div>
            </div>

            {/* Environment */}
            <div>
              <div style={{ fontWeight: "600", fontSize: "12px", marginBottom: "0.5rem" }}>
                Environment
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.25rem",
                  fontSize: "12px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Mode:</span>
                  <span style={{ color: "#6b7280" }}>{diagnostics.environment.mode}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Dev:</span>
                  <span style={{ color: "#6b7280" }}>
                    {diagnostics.environment.isDev ? "Yes" : "No"}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Backend:</span>
                  <span style={{ color: "#6b7280", fontSize: "10px" }}>
                    {new URL(diagnostics.environment.backendUrl).hostname}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                paddingTop: "0.5rem",
                borderTop: "1px solid #e5e7eb",
              }}
            >
              <Button
                onClick={runDiagnostics}
                size="sm"
                variant="outline"
                style={{
                  fontSize: "12px",
                  padding: "4px 12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <RefreshCw style={{ width: "14px", height: "14px" }} />
                Refresh
              </Button>
              <Button
                onClick={() => void copyToClipboard()}
                size="sm"
                variant="outline"
                style={{
                  fontSize: "12px",
                  padding: "4px 12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Copy style={{ width: "14px", height: "14px" }} />
                Copy
              </Button>
            </div>

            {/* Console Notice */}
            <div
              style={{
                fontSize: "11px",
                color: "#6b7280",
                fontStyle: "italic",
                paddingTop: "0.5rem",
                borderTop: "1px solid #e5e7eb",
              }}
            >
              📝 Full details logged to console (F12)
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
