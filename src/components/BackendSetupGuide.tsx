import { AlertDescription, AlertTitle } from './ui/alert';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { 
  Terminal, 
  CheckCircle2, 
  ExternalLink,
  Server,
  Wifi,
  Copy,
  Check
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface BackendSetupGuideProps {
  onDismiss?: () => void;
  onSwitchToMock?: () => void;
}

export function BackendSetupGuide({ onDismiss, onSwitchToMock }: BackendSetupGuideProps) {
  const [copiedStep, setCopiedStep] = useState<number | null>(null);

  const copyCommand = (command: string, step: number) => {
    navigator.clipboard.writeText(command);
    setCopiedStep(step);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedStep(null), 2000);
  };

  return (
    <Card className="p-6 border-blue-500/20 bg-blue-500/5">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <Server className="w-5 h-5 text-blue-500 mt-0.5" />
          <div className="flex-1">
            <AlertTitle className="text-base mb-2">Backend Server Not Running</AlertTitle>
            <AlertDescription className="text-sm text-muted-foreground mb-4">
              The app is currently in <strong>mock data mode</strong>. To connect to live market data, start the backend server.
            </AlertDescription>
          </div>
        </div>

        <div className="space-y-3 ml-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-xs">Step 1</Badge>
              <span className="text-sm font-medium">Open Terminal</span>
            </div>
            <div className="bg-muted/50 p-3 rounded-md font-mono text-xs flex items-center justify-between group">
              <div className="flex items-center gap-2">
                <Terminal className="w-3 h-3" />
                <code>cd backend</code>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => copyCommand('cd backend', 1)}
              >
                {copiedStep === 1 ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              </Button>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-xs">Step 2</Badge>
              <span className="text-sm font-medium">Install Dependencies (first time only)</span>
            </div>
            <div className="bg-muted/50 p-3 rounded-md font-mono text-xs flex items-center gap-2">
              <Terminal className="w-3 h-3" />
              <code>npm install</code>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-xs">Step 3</Badge>
              <span className="text-sm font-medium">Configure Environment (first time only)</span>
            </div>
            <div className="bg-muted/50 p-3 rounded-md font-mono text-xs space-y-1">
              <div className="flex items-center gap-2">
                <Terminal className="w-3 h-3" />
                <code>cp .env.example .env</code>
              </div>
              <div className="text-muted-foreground ml-5">
                Add your Polygon.io API key to .env file
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-xs">Step 4</Badge>
              <span className="text-sm font-medium">Start Backend Server</span>
            </div>
            <div className="bg-muted/50 p-3 rounded-md font-mono text-xs flex items-center justify-between group">
              <div className="flex items-center gap-2">
                <Terminal className="w-3 h-3" />
                <code>npm run dev</code>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => copyCommand('npm run dev', 4)}
              >
                {copiedStep === 4 ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              </Button>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-xs">Step 5</Badge>
              <span className="text-sm font-medium">Connect Frontend</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Wifi className="w-3 h-3" />
              Click the <strong className="text-foreground mx-1">"Go Live"</strong> button in the header
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-4 border-t">
          <Button
            variant="default"
            size="sm"
            onClick={onSwitchToMock}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Continue with Mock Data
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            asChild
          >
            <a 
              href="https://github.com/yourusername/fancy-trader#readme" 
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              View Documentation
            </a>
          </Button>

          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="ml-auto"
            >
              Dismiss
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
