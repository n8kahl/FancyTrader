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

  const runDiagnostics = () => {
    console.log("🔍 Running diagnostics...");
    
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
      
      // CSS Loading
      css: {
        stylesheets: Array.from(document.styleSheets).map((sheet, idx) => {
          try {
            return {
              index: idx,
              href: sheet.href || 'inline',
              rules: sheet.cssRules?.length || 0,
              disabled: sheet.disabled
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
      },
      
      // DOM
      dom: {
        hasCSSClasses: checkDOMHasClasses(),
        bodyClasses: document.body.className,
        htmlClasses: document.documentElement.className,
        rootElement: !!document.getElementById('root'),
      },
      
      // Build Info
      build: {
        userAgent: navigator.userAgent,
        location: window.location.href,
        protocol: window.location.protocol,
        baseUrl: window.location.origin,
      },
      
      // Browser
      browser: {
        online: navigator.onLine,
        cookiesEnabled: navigator.cookieEnabled,
        language: navigator.language,
      }
    };
    
    console.log("📊 Diagnostics Results:", diag);
    setDiagnostics(diag);
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
