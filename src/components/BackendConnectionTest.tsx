import { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { RefreshCw, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { getBackendUrl, getBackendWsUrl } from '../utils/env';

interface TestResult {
  test: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  details?: any;
}

export function BackendConnectionTest() {
  const [isTestingRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const backendUrl = getBackendUrl();
  const backendWsUrl = getBackendWsUrl();

  const runTests = async () => {
    setIsRunning(true);
    const testResults: TestResult[] = [];

    // Test 1: Health check
    testResults.push({
      test: 'Health Check',
      status: 'pending',
      message: `Testing ${backendUrl}/health...`,
    });
    setResults([...testResults]);

    try {
      const healthResponse = await fetch(`${backendUrl}/health`);
      const healthData = await healthResponse.json();
      
      testResults[0] = {
        test: 'Health Check',
        status: 'success',
        message: '✅ Backend is alive!',
        details: healthData,
      };
    } catch (error: any) {
      testResults[0] = {
        test: 'Health Check',
        status: 'error',
        message: `❌ ${error.message}`,
        details: {
          error: error.toString(),
          isCorsError: error.message?.includes('CORS'),
          isNetworkError: error.message?.includes('Failed to fetch'),
        },
      };
    }
    setResults([...testResults]);

    // Test 2: Setups endpoint
    testResults.push({
      test: 'Setups API',
      status: 'pending',
      message: `Testing ${backendUrl}/api/setups...`,
    });
    setResults([...testResults]);

    try {
      const setupsResponse = await fetch(`${backendUrl}/api/setups`);
      const setupsData = await setupsResponse.json();
      
      testResults[1] = {
        test: 'Setups API',
        status: 'success',
        message: `✅ Got ${setupsData.setups?.length || 0} setups`,
        details: setupsData,
      };
    } catch (error: any) {
      testResults[1] = {
        test: 'Setups API',
        status: 'error',
        message: `❌ ${error.message}`,
        details: error.toString(),
      };
    }
    setResults([...testResults]);

    // Test 3: CORS headers check
    testResults.push({
      test: 'CORS Headers',
      status: 'pending',
      message: 'Checking CORS configuration...',
    });
    setResults([...testResults]);

    try {
      const corsResponse = await fetch(`${backendUrl}/health`, {
        method: 'OPTIONS',
      });
      
      const corsHeaders = {
        'Access-Control-Allow-Origin': corsResponse.headers.get('Access-Control-Allow-Origin'),
        'Access-Control-Allow-Methods': corsResponse.headers.get('Access-Control-Allow-Methods'),
        'Access-Control-Allow-Headers': corsResponse.headers.get('Access-Control-Allow-Headers'),
      };
      
      testResults[2] = {
        test: 'CORS Headers',
        status: corsHeaders['Access-Control-Allow-Origin'] ? 'success' : 'error',
        message: corsHeaders['Access-Control-Allow-Origin'] 
          ? '✅ CORS is configured' 
          : '❌ CORS headers missing!',
        details: corsHeaders,
      };
    } catch (error: any) {
      testResults[2] = {
        test: 'CORS Headers',
        status: 'error',
        message: `❌ ${error.message}`,
        details: error.toString(),
      };
    }
    setResults([...testResults]);

    // Test 4: WebSocket
    testResults.push({
      test: 'WebSocket',
      status: 'pending',
      message: `Testing ${backendWsUrl}...`,
    });
    setResults([...testResults]);

    try {
      const ws = new WebSocket(backendWsUrl);
      
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          ws.close();
          reject(new Error('Connection timeout'));
        }, 5000);

        ws.onopen = () => {
          clearTimeout(timeout);
          testResults[3] = {
            test: 'WebSocket',
            status: 'success',
            message: '✅ WebSocket connected!',
          };
          ws.close();
          resolve();
        };

        ws.onerror = (error) => {
          clearTimeout(timeout);
          reject(new Error('WebSocket connection failed'));
        };
      });
    } catch (error: any) {
      testResults[3] = {
        test: 'WebSocket',
        status: 'error',
        message: `❌ ${error.message}`,
        details: error.toString(),
      };
    }
    setResults([...testResults]);

    setIsRunning(false);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'pending':
        return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-500">Success</Badge>;
      case 'error':
        return <Badge variant="destructive">Failed</Badge>;
      case 'pending':
        return <Badge variant="secondary">Testing...</Badge>;
    }
  };

  return (
    <Card className="p-6 space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Backend Connection Test</h2>
        <p className="text-muted-foreground">
          Test your Railway backend connection and diagnose issues
        </p>
      </div>

      <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
        <div className="text-sm">
          <span className="font-semibold">Backend URL:</span>{' '}
          <code className="text-xs bg-muted px-2 py-1 rounded">{backendUrl}</code>
        </div>
        <div className="text-sm">
          <span className="font-semibold">WebSocket URL:</span>{' '}
          <code className="text-xs bg-muted px-2 py-1 rounded">{backendWsUrl}</code>
        </div>
      </div>

      <Button 
        onClick={runTests} 
        disabled={isTestingRunning}
        className="w-full"
      >
        {isTestingRunning ? (
          <>
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            Running Tests...
          </>
        ) : (
          <>
            <RefreshCw className="w-4 h-4 mr-2" />
            Run Connection Tests
          </>
        )}
      </Button>

      {results.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold">Test Results:</h3>
          {results.map((result, index) => (
            <div
              key={index}
              className="flex items-start gap-3 p-3 rounded-lg border"
            >
              <div className="mt-0.5">{getStatusIcon(result.status)}</div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{result.test}</span>
                  {getStatusBadge(result.status)}
                </div>
                <p className="text-sm text-muted-foreground">{result.message}</p>
                {result.details && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                      View details
                    </summary>
                    <pre className="mt-2 p-2 bg-muted rounded overflow-auto max-h-40">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {results.length > 0 && results.some(r => r.status === 'error') && (
        <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg space-y-2">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-semibold text-orange-500">Troubleshooting Tips:</h4>
              <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
                <li>Check if your Railway backend is deployed and running</li>
                <li>Verify CORS is enabled in your backend (app.use(cors()))</li>
                <li>Check Railway logs for errors</li>
                <li>Ensure environment variables are set correctly</li>
                <li>Test the /health endpoint directly in your browser</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {results.every(r => r.status === 'success') && results.length > 0 && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
            <div>
              <h4 className="font-semibold text-green-500">All Tests Passed!</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Your backend is properly configured and reachable. You can now use live data!
              </p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
