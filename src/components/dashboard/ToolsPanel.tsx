import { Calculator, ArrowLeftRight, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EncoderDecoder } from './tools/EncoderDecoder';
import { CVSSCalculator } from './tools/CVSSCalculator';
import { HeadersAnalyzer } from './tools/HeadersAnalyzer';

type ToolType = 'encoder' | 'cvss' | 'headers';

interface ToolConfig {
  name: string;
  icon: React.ElementType;
  type: ToolType;
}

const tools: ToolConfig[] = [
  { name: 'Encoder/Decoder', icon: ArrowLeftRight, type: 'encoder' },
  { name: 'CVSS Calculator', icon: Calculator, type: 'cvss' },
  { name: 'Headers Analyzer', icon: Shield, type: 'headers' },
];

interface ToolsPanelProps {
  projectId?: string | null;
}

// Tool Dialog Component
function ToolDialog({ tool }: { tool: ToolConfig }) {
  const isLargeDialog = tool.type === 'headers';
  const dialogClass = isLargeDialog
    ? 'max-w-3xl h-[80vh] flex flex-col p-0'
    : tool.type === 'cvss'
    ? 'sm:max-w-[560px]'
    : 'sm:max-w-[500px]';

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-xs h-8"
        >
          <tool.icon className="h-3.5 w-3.5 mr-2 text-terminal" />
          {tool.name}
        </Button>
      </DialogTrigger>
      <DialogContent className={dialogClass}>
        {isLargeDialog ? (
          <>
            <DialogHeader className="px-6 pt-6 pb-2">
              <DialogTitle className="flex items-center gap-2">
                <tool.icon className="h-5 w-5 text-primary" />
                {tool.name}
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="flex-1 px-6 pb-6">
              {tool.type === 'headers' && <HeadersAnalyzer />}
            </ScrollArea>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <tool.icon className="h-5 w-5 text-primary" />
                {tool.name}
              </DialogTitle>
            </DialogHeader>
            {tool.type === 'encoder' && <EncoderDecoder />}
            {tool.type === 'cvss' && <CVSSCalculator />}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function ToolsPanel(_props: ToolsPanelProps) {
  return (
    <div className="p-2 space-y-1">
      {tools.map((tool) => (
        <ToolDialog key={tool.type} tool={tool} />
      ))}
    </div>
  );
}
