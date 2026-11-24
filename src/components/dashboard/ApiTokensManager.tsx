import { useState, useEffect } from 'react';
import { Key, Plus, Trash2, Copy, Check, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ApiToken {
  id: string;
  name: string;
  token_hash: string;
  created_at: string;
  last_used_at: string | null;
  is_active: boolean | null;
  expires_at: string | null;
}

function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = new Uint8Array(48);
  crypto.getRandomValues(values);
  let token = 'pd_';
  for (let i = 0; i < 48; i++) {
    token += chars.charAt(values[i] % chars.length);
  }
  return token;
}

async function sha256Hex(value: string): Promise<string> {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function ApiTokensManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newTokenName, setNewTokenName] = useState('');
  const [creating, setCreating] = useState(false);
  const [newlyCreatedToken, setNewlyCreatedToken] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchTokens = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('api_tokens')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Error fetching tokens', description: error.message, variant: 'destructive' });
    } else {
      setTokens(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTokens();
  }, [user]);

  const handleCreate = async () => {
    if (!user || !newTokenName.trim()) return;
    
    setCreating(true);
    const token = generateToken();

    let tokenHash = '';
    try {
      tokenHash = await sha256Hex(token);
    } catch (err) {
      toast({
        title: 'Error generating token hash',
        description: 'Unable to create a secure token. Please try again.',
        variant: 'destructive',
      });
      setCreating(false);
      return;
    }

    const { error } = await supabase
      .from('api_tokens')
      .insert({
        user_id: user.id,
        name: newTokenName.trim(),
        token_hash: tokenHash,
      });

    if (error) {
      toast({ title: 'Error creating token', description: error.message, variant: 'destructive' });
    } else {
      setNewlyCreatedToken(token);
      toast({ title: 'API token created successfully' });
      fetchTokens();
    }
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('api_tokens')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: 'Error deleting token', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Token deleted' });
      fetchTokens();
    }
  };

  const copyToken = (token: string, id: string) => {
    navigator.clipboard.writeText(token);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const tokenPreview = (tokenHash: string | null) => {
    if (!tokenHash) return 'sha256:••••••••••••••';
    if (tokenHash.startsWith('pd_')) {
      return `${tokenHash.slice(0, 6)}••••••••••••••••••••••••••••`;
    }
    return `sha256:${tokenHash.slice(0, 12)}...`;
  };

  const closeCreateDialog = () => {
    setCreateDialogOpen(false);
    setNewTokenName('');
    setNewlyCreatedToken(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            API Tokens
          </h3>
          <p className="text-sm text-muted-foreground">
            Manage your API tokens for programmatic access
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/api-docs" target="_blank">
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              API Docs
            </Button>
          </Link>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="cyber" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create Token
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create API Token</DialogTitle>
              </DialogHeader>
              
              {!newlyCreatedToken ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Token Name</Label>
                    <Input
                      placeholder="e.g., CLI Tool, CI/CD Pipeline"
                      value={newTokenName}
                      onChange={(e) => setNewTokenName(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Give your token a descriptive name to remember its purpose
                    </p>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={closeCreateDialog}>
                      Cancel
                    </Button>
                    <Button 
                      variant="cyber" 
                      onClick={handleCreate}
                      disabled={creating || !newTokenName.trim()}
                    >
                      {creating ? 'Creating...' : 'Create Token'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <p className="text-sm text-amber-400 font-medium mb-2">
                      ⚠️ Copy your token now - you won't be able to see it again!
                    </p>
                    <div className="bg-background rounded border border-border p-3 font-mono text-sm break-all relative group">
                      {newlyCreatedToken}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7"
                        onClick={() => copyToken(newlyCreatedToken, 'new')}
                      >
                        {copiedId === 'new' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>
                  <Button variant="outline" onClick={closeCreateDialog} className="w-full">
                    Done
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading tokens...</div>
      ) : tokens.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-border rounded-lg">
          <Key className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">No API tokens yet</p>
          <p className="text-sm text-muted-foreground">Create one to start using the API</p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Token Fingerprint</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tokens.map((token) => (
                <TableRow key={token.id}>
                  <TableCell className="font-medium">{token.name}</TableCell>
                    <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                        {tokenPreview(token.token_hash)}
                      </code>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(token.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {token.last_used_at 
                      ? new Date(token.last_used_at).toLocaleDateString()
                      : 'Never'
                    }
                  </TableCell>
                  <TableCell>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(token.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
