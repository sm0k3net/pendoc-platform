import { useState } from 'react';
import { ArrowLeftRight, Copy, Check, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

type EncodingType = 'base64' | 'url' | 'html' | 'hex' | 'unicode' | 'rot13' | 'binary' | 'jwt' | 'charcode';

const ENCODING_LABELS: Record<EncodingType, string> = {
  base64: 'Base64',
  url: 'URL',
  html: 'HTML Entity',
  hex: 'HEX',
  unicode: 'Unicode (\\uXXXX)',
  rot13: 'ROT13',
  binary: 'Binary',
  jwt: 'JWT Decode',
  charcode: 'Char Codes',
};

// Only-decode types (no encode equivalent)
const DECODE_ONLY: EncodingType[] = ['jwt'];

function rot13(str: string): string {
  return str.replace(/[a-zA-Z]/g, c => {
    const base = c <= 'Z' ? 65 : 97;
    return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
  });
}

function jwtDecode(token: string): string {
  const parts = token.trim().split('.');
  if (parts.length < 2) throw new Error('Not a valid JWT (need at least header.payload)');
  const decode = (part: string) => {
    const padded = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=');
    return JSON.parse(decodeURIComponent(escape(atob(padded))));
  };
  const header = decode(parts[0]);
  const payload = decode(parts[1]);
  return `// Header\n${JSON.stringify(header, null, 2)}\n\n// Payload\n${JSON.stringify(payload, null, 2)}`;
}

export function EncoderDecoder() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [encoding, setEncoding] = useState<EncodingType>('base64');
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const isDecodeOnly = DECODE_ONLY.includes(encoding);

  const processInput = () => {
    setError('');
    try {
      let result = '';
      const effectiveMode = isDecodeOnly ? 'decode' : mode;

      if (effectiveMode === 'encode') {
        switch (encoding) {
          case 'base64':
            result = btoa(unescape(encodeURIComponent(input)));
            break;
          case 'url':
            result = encodeURIComponent(input);
            break;
          case 'html':
            result = input
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;');
            break;
          case 'hex':
            result = Array.from(input)
              .map(c => c.charCodeAt(0).toString(16).padStart(2, '0'))
              .join(' ');
            break;
          case 'unicode':
            result = Array.from(input)
              .map(c => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`)
              .join('');
            break;
          case 'rot13':
            result = rot13(input);
            break;
          case 'binary':
            result = Array.from(input)
              .map(c => c.charCodeAt(0).toString(2).padStart(8, '0'))
              .join(' ');
            break;
          case 'charcode':
            result = Array.from(input).map(c => c.charCodeAt(0)).join(' ');
            break;
        }
      } else {
        switch (encoding) {
          case 'base64':
            result = decodeURIComponent(escape(atob(input.trim())));
            break;
          case 'url':
            result = decodeURIComponent(input);
            break;
          case 'html': {
            const div = document.createElement('div');
            div.innerHTML = input;
            result = div.textContent || '';
            break;
          }
          case 'hex':
            result = input.replace(/\s+/g, '').match(/.{1,2}/g)
              ?.map(byte => String.fromCharCode(parseInt(byte, 16)))
              .join('') || '';
            break;
          case 'unicode':
            result = input.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
              String.fromCharCode(parseInt(hex, 16))
            );
            break;
          case 'rot13':
            result = rot13(input);
            break;
          case 'binary':
            result = input.trim().split(/\s+/)
              .map(b => String.fromCharCode(parseInt(b, 2)))
              .join('');
            break;
          case 'jwt':
            result = jwtDecode(input);
            break;
          case 'charcode':
            result = input.trim().split(/\s+/)
              .map(n => String.fromCharCode(parseInt(n)))
              .join('');
            break;
        }
      }
      setOutput(result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : `Invalid input for ${isDecodeOnly ? 'decode' : mode}ing`;
      setError(msg);
      setOutput('');
    }
  };

  const copyOutput = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const swapInputOutput = () => {
    if (isDecodeOnly) return;
    setInput(output);
    setOutput('');
    setError('');
    setMode(mode === 'encode' ? 'decode' : 'encode');
  };

  const handleEncodingChange = (v: EncodingType) => {
    setEncoding(v);
    setOutput('');
    setError('');
    if (DECODE_ONLY.includes(v)) {
      setMode('decode');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <Select value={encoding} onValueChange={(v: any) => handleEncodingChange(v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(ENCODING_LABELS) as [EncodingType, string][]).map(([val, label]) => (
              <SelectItem key={val} value={val}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isDecodeOnly ? (
          <Badge variant="outline" className="h-9 px-3 flex items-center text-xs text-muted-foreground">
            Decode only
          </Badge>
        ) : (
          <Tabs value={mode} onValueChange={(v: any) => setMode(v)} className="flex-1 min-w-[160px]">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="encode">Encode</TabsTrigger>
              <TabsTrigger value="decode">Decode</TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </div>

      <div className="space-y-2">
        <Label>Input</Label>
        <Textarea
          placeholder={isDecodeOnly ? `Paste ${ENCODING_LABELS[encoding]} to decode...` : `Enter text to ${mode}...`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="min-h-[100px] font-mono text-sm"
        />
      </div>

      <div className="flex gap-2">
        <Button variant="cyber" onClick={processInput} className="flex-1">
          {isDecodeOnly ? 'Decode' : mode === 'encode' ? 'Encode' : 'Decode'}
        </Button>
        {!isDecodeOnly && (
          <Button variant="outline" size="icon" onClick={swapInputOutput} title="Swap & flip mode">
            <ArrowLeftRight className="h-4 w-4" />
          </Button>
        )}
        <Button variant="outline" size="icon" onClick={() => { setInput(''); setOutput(''); setError(''); }}>
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {error && (
        <p className="text-xs text-destructive bg-destructive/10 rounded px-3 py-2">{error}</p>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Output</Label>
          {output && (
            <Button variant="ghost" size="sm" onClick={copyOutput}>
              {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          )}
        </div>
        <Textarea
          value={output}
          readOnly
          className="min-h-[100px] font-mono text-sm bg-muted/30"
        />
      </div>
    </div>
  );
}
