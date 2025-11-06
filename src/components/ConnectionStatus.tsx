import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from './ui/popover';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CheckCircle2, 
  XCircle,
  Activity 
} from 'lucide-react';
import { wsClient } from '../services/websocketClient';
import { getConnectionInfo, runConnectionTests, logTestResults, type ConnectionTestResult } from '../utils/connectionTest';
import { BACKEND_CONFIG } from '../config/backend';

interface ConnectionStatusProps {
  isConnected: boolean;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function ConnectionStatus({ 
  isConnected, 
  isLoading = false, 
  error,
  onRetry 
}: ConnectionStatusProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [connectionInfo, setConnectionInfo] = useState<any>(null);
  const [testResults, setTestResults] = useState<ConnectionTestResult[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadConnectionInfo();
    }
  }, [isOpen]);

  const loadConnectionInfo = async () => {
    const info = await getConnectionInfo();
    setConnectionInfo(info);
  };

  const handleRunTests = async () => {
    setIsRunningTests(true);
    const results = await runConnectionTests();
    setTestResults(results);
    logTestResults(results);
    setIsRunningTests(false);
    await loadConnectionInfo();
  };

  const getStatusColor = () => {
    if (isLoading) return 'text-yellow-500';
    if (error) return 'text-red-500';
    if (isConnected) return 'text-green-500';
    return 'text-gray-500';
  };

  const getStatusIcon = () => {
    if (isLoading) return <Activity className="w-4 h-4 animate-pulse" />;
    if (error) return <WifiOff className="w-4 h-4" />;
    if (isConnected) return <Wifi className="w-4 h-4" />;
    return <WifiOff className="w-4 h-4" />;
  };

  const getStatusText = () => {
    if (isLoading) return 'Connecting...';
    if (error) return 'Disconnected';
    if (isConnected) return 'Connected';
    return 'Offline';
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`gap-2 ${getStatusColor()}`}
        >
          {getStatusIcon()}
          <span className="hidden sm:inline">{getStatusText()}</span>
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Backend Connection</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant={isConnected ? "default" : "destructive"}>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </Badge>
              </div>

              {connectionInfo && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Health:</span>
                    <span className="flex items-center gap-1">
                      {connectionInfo.isHealthy ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      {connectionInfo.isHealthy ? 'Healthy' : 'Unhealthy'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Environment:</span>
                    <Badge variant="outline">
                      {connectionInfo.environment}
                    </Badge>
                  </div>

                  <div className="pt-2 border-t">
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>
                        <span className="font-medium">HTTP:</span>{' '}
                        <span className="break-all">{connectionInfo.backendUrl}</span>
                      </div>
                      <div>
                        <span className="font-medium">WS:</span>{' '}
                        <span className="break-all">{connectionInfo.wsUrl}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {error && (
                <div className="pt-2 border-t">
                  <div className="text-xs text-red-500">
                    <span className="font-medium">Error:</span> {error}
                  </div>
                </div>
              )}
            </div>
          </div>

          {testResults.length > 0 && (
            <div className="border-t pt-3">
              <h5 className="text-sm font-medium mb-2">Test Results</h5>
              <div className="space-y-1">
                {testResults.map((result, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="flex items-center gap-1">
                      {result.passed ? (
                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                      ) : (
                        <XCircle className="w-3 h-3 text-red-500" />
                      )}
                      {result.test}
                    </span>
                    {result.duration && (
                      <span className="text-muted-foreground">
                        {result.duration}ms
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handleRunTests}
              disabled={isRunningTests}
            >
              {isRunningTests ? (
                <>
                  <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Activity className="w-3 h-3 mr-2" />
                  Run Tests
                </>
              )}
            </Button>

            {onRetry && !isConnected && (
              <Button
                variant="default"
                size="sm"
                className="flex-1"
                onClick={onRetry}
              >
                <RefreshCw className="w-3 h-3 mr-2" />
                Retry
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
