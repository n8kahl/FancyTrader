import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp,
  Copy,
  RefreshCw
} from "lucide-react";
import { BACKEND_CONFIG } from "../config/backend";
import { getMode, isDev, getBackendUrl, getBackendWsUrl } from "../utils/env";

export function DiagnosticPanel() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [diagnostics, setDiagnostics] = useState<any>(null);

  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    try {
      console.log("🔍 Running comprehensive diagnostics...");
      console.log("━".repeat(80));
      
      // Get CSS file details with error handling
      let cssDetails;
      try {
        cssDetails = await getCSSFileDetails();
      } catch (e) {
        console.error("Error fetching CSS details:", e);
        cssDetails = { size: 'Error', status: 'fetch failed', preview: '' };
      }
      
      const diag = {
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
          }
        },
        
        // CSS Loading (Enhanced)
        css: {
          stylesheets: Array.from(document.styleSheets).map((sheet, idx) => {
            try {
              const rules = sheet.cssRules ? Array.from(sheet.cssRules) : [];
              const firstRules = rules.slice(0, 5).map((rule: any) => rule.cssText?.substring(0, 80));
              
              return {
                index: idx,
                href: sheet.href || 'inline',
                rules: sheet.cssRules?.length || 0,
                disabled: sheet.disabled,
                firstRules: firstRules,
                hasTailwindUtilities: checkSheetForTailwind(sheet),
              };
            } catch (e) {
              return {
                index: idx,
                href: sheet.href || 'inline',
                error: 'CORS or access error',
                disabled: sheet.disabled
              };
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
              bodyClasses: document.body.className || '',
              htmlClasses: document.documentElement.className || '',
              rootElement: !!document.getElementById('root'),
              tailwindClasses: findTailwindClasses(),
            };
          } catch (e) {
            console.error("Error analyzing DOM:", e);
            return {
              hasCSSClasses: false,
              bodyClasses: 'error',
              htmlClasses: 'error',
              rootElement: false,
              tailwindClasses: [],
              error: String(e)
            };
          }
        })(),
      
      // Build Info
      build: {
        userAgent: navigator.userAgent,
        location: window.location.href,
        protocol: window.location.protocol,
        baseUrl: window.location.origin,
        buildTime: document.querySelector('meta[name="build-time"]')?.getAttribute('content') || 'unknown',
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
            domContentLoaded: performance.timing?.domContentLoadedEventEnd - performance.timing?.navigationStart || 'N/A',
            loadComplete: performance.timing?.loadEventEnd - performance.timing?.navigationStart || 'N/A',
          };
        } catch (e) {
          console.error("Error getting performance metrics:", e);
          return {
            cssLoadTime: 0,
            domContentLoaded: 'Error',
            loadComplete: 'Error',
            error: String(e)
          };
        }
      })()
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
      setDiagnostics({
        timestamp: new Date().toISOString(),
        error: String(error),
        message: "Failed to run diagnostics. Check console for details."
      });
    }
  };

  const getCSSFileDetails = async () => {
    const cssLink = Array.from(document.styleSheets).find(sheet => 
      sheet.href && sheet.href.includes('index-') && sheet.href.includes('.css')
    );
    
    if (!cssLink?.href) {
      return { size: 'N/A', status: 'not found', preview: '' };
    }

    try {
      const response = await fetch(cssLink.href, { method: 'HEAD' });
      const size = response.headers.get('content-length');
      const status = response.status;
      
      // Try to get first few bytes
      const previewResponse = await fetch(cssLink.href);
      const text = await previewResponse.text();
      const preview = text.substring(0, 500);
      
      console.log("📄 CSS File Analysis:");
      console.log("  URL:", cssLink.href);
      console.log("  Size:", size ? `${(parseInt(size) / 1024).toFixed(2)} KB` : 'Unknown');
      console.log("  Status:", status);
      console.log("  First 500 chars:", preview);
      
      return {
        size: size ? `${(parseInt(size) / 1024).toFixed(2)} KB` : 'Unknown',
        status: status,
        preview: preview
      };
    } catch (e) {
      console.error("❌ Error fetching CSS file:", e);
      return { size: 'Error', status: 'fetch failed', preview: '' };
    }
  };

  const checkSheetForTailwind = (sheet: CSSStyleSheet): boolean => {
    try {
      const rules = sheet.cssRules;
      if (!rules) return false;
      
      // Look for common Tailwind utility patterns
      const tailwindPatterns = ['.bg-', '.text-', '.flex', '.grid', '.rounded', '.border'];
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
    const elements = document.querySelectorAll('[class]');
    elements.forEach(el => {
      // Handle both regular elements and SVG elements
      const className = typeof el.className === 'string' 
        ? el.className 
        : el.className?.baseVal || '';
      
      if (className) {
        const classList = className.split(' ');
        classList.forEach(cls => {
          if (cls && cls.match(/^(bg-|text-|flex|grid|rounded|border|p-|m-|w-|h-)/)) {
            classes.add(cls);
          }
        });
      }
    });
    return Array.from(classes).slice(0, 20);
  };

  const getCSSLoadTime = (): number => {
    const perfEntries = performance.getEntriesByType('resource');
    const cssEntry = perfEntries.find((entry: any) => 
      entry.name.includes('.css') && entry.name.includes('index-')
    );
    return cssEntry ? Math.round((cssEntry as any).duration) : 0;
  };

  const checkTailwindLoaded = (): boolean => {
    // Check if any Tailwind utilities are defined
    const testDiv = document.createElement('div');
    testDiv.className = 'bg-background';
    document.body.appendChild(testDiv);
    const styles = window.getComputedStyle(testDiv);
    const hasBg = styles.backgroundColor !== '' && styles.backgroundColor !== 'rgba(0, 0, 0, 0)';
    document.body.removeChild(testDiv);
    return hasBg;
  };

  const checkDOMHasClasses = (): boolean => {
    const elements = document.querySelectorAll('[class]');
    return elements.length > 0;
  };

  const copyToClipboard = () => {
    const text = JSON.stringify(diagnostics, null, 2);
    navigator.clipboard.writeText(text);
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
        position: 'fixed',
        bottom: '1rem',
        right: '1rem',
        zIndex: 9999,
        maxWidth: '500px',
      }}
    >
      <Card 
        className="shadow-lg"
        style={{
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        }}
      >
        <div 
          className="p-4 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            padding: '1rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {hasIssues ? (
              <AlertTriangle style={{ width: '20px', height: '20px', color: '#ef4444' }} />
            ) : (
              <CheckCircle2 style={{ width: '20px', height: '20px', color: '#10b981' }} />
            )}
            <span style={{ fontWeight: '600', fontSize: '14px' }}>
              Diagnostics {hasIssues ? '(Issues Found)' : '(OK)'}
            </span>
          </div>
          {isExpanded ? (
            <ChevronUp style={{ width: '20px', height: '20px' }} />
          ) : (
            <ChevronDown style={{ width: '20px', height: '20px' }} />
          )}
        </div>

        {isExpanded && (
          <div 
            className="border-t p-4 space-y-3"
            style={{
              borderTop: '1px solid #e5e7eb',
              padding: '1rem',
            }}
          >
            {/* CSS Status */}
            <div>
              <div style={{ fontWeight: '600', fontSize: '12px', marginBottom: '0.5rem' }}>
                CSS Loading
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Stylesheets:</span>
                  <Badge 
                    variant={diagnostics.css.totalStylesheets > 0 ? "default" : "destructive"}
                    style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      backgroundColor: diagnostics.css.totalStylesheets > 0 ? '#10b981' : '#ef4444',
                      color: 'white',
                    }}
                  >
                    {diagnostics.css.totalStylesheets}
                  </Badge>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Tailwind:</span>
                  <Badge 
                    variant={diagnostics.css.tailwindLoaded ? "default" : "destructive"}
                    style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      backgroundColor: diagnostics.css.tailwindLoaded ? '#10b981' : '#ef4444',
                      color: 'white',
                    }}
                  >
                    {diagnostics.css.tailwindLoaded ? 'Loaded' : 'NOT LOADED'}
                  </Badge>
                </div>
                {diagnostics.css.stylesheets.map((sheet: any, idx: number) => (
                  <div key={idx} style={{ fontSize: '11px', color: '#6b7280', marginLeft: '1rem' }}>
                    {idx + 1}. {sheet.href === 'inline' ? 'Inline styles' : new URL(sheet.href || '').pathname.split('/').pop()} 
                    {sheet.rules > 0 && ` (${sheet.rules} rules)`}
                    {sheet.error && ` ⚠️ ${sheet.error}`}
                  </div>
                ))}
              </div>
            </div>

            {/* Environment */}
            <div>
              <div style={{ fontWeight: '600', fontSize: '12px', marginBottom: '0.5rem' }}>
                Environment
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Mode:</span>
                  <span style={{ color: '#6b7280' }}>{diagnostics.environment.mode}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Dev:</span>
                  <span style={{ color: '#6b7280' }}>{diagnostics.environment.isDev ? 'Yes' : 'No'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Backend:</span>
                  <span style={{ color: '#6b7280', fontSize: '10px' }}>
                    {new URL(diagnostics.environment.backendUrl).hostname}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #e5e7eb' }}>
              <Button 
                onClick={runDiagnostics} 
                size="sm"
                variant="outline"
                style={{
                  fontSize: '12px',
                  padding: '4px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <RefreshCw style={{ width: '14px', height: '14px' }} />
                Refresh
              </Button>
              <Button 
                onClick={copyToClipboard} 
                size="sm"
                variant="outline"
                style={{
                  fontSize: '12px',
                  padding: '4px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Copy style={{ width: '14px', height: '14px' }} />
                Copy
              </Button>
            </div>

            {/* Console Notice */}
            <div 
              style={{
                fontSize: '11px',
                color: '#6b7280',
                fontStyle: 'italic',
                paddingTop: '0.5rem',
                borderTop: '1px solid #e5e7eb',
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
