import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Building2, Plus, Trash2, User, Settings } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface Contact {
  id?: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  is_primary: boolean;
}

interface Client {
  id: string;
  user_id: string;
  company_name: string;
  company_logo_url: string | null;
  company_website: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

interface EditClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
  onSuccess: () => void;
}

export function EditClientDialog({ open, onOpenChange, client, onSuccess }: EditClientDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [companyLogoUrl, setCompanyLogoUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deletedContactIds, setDeletedContactIds] = useState<string[]>([]);

  useEffect(() => {
    if (client && open) {
      setCompanyName(client.company_name);
      setCompanyWebsite(client.company_website || '');
      setCompanyLogoUrl(client.company_logo_url || '');
      setNotes(client.notes || '');
      setIsActive(client.is_active);
      setDeletedContactIds([]);
      fetchContacts();
    }
  }, [client, open]);

  const fetchContacts = async () => {
    if (!client) return;
    
    const { data, error } = await supabase
      .from('client_contacts')
      .select('*')
      .eq('client_id', client.id)
      .order('is_primary', { ascending: false });

    if (error) {
      console.error('Error fetching contacts:', error);
    } else if (data && data.length > 0) {
      setContacts(data.map(c => ({
        id: c.id,
        name: c.name || '',
        email: c.email || '',
        phone: c.phone || '',
        role: c.role || '',
        is_primary: c.is_primary,
      })));
    } else {
      setContacts([{ name: '', email: '', phone: '', role: '', is_primary: true }]);
    }
  };

  const addContact = () => {
    if (contacts.length >= 5) {
      toast({ title: 'Maximum 5 contacts allowed', variant: 'destructive' });
      return;
    }
    setContacts([...contacts, { name: '', email: '', phone: '', role: '', is_primary: false }]);
  };

  const removeContact = (index: number) => {
    if (contacts.length === 1) return;
    const contact = contacts[index];
    if (contact.id) {
      setDeletedContactIds([...deletedContactIds, contact.id]);
    }
    const newContacts = contacts.filter((_, i) => i !== index);
    if (contacts[index].is_primary && newContacts.length > 0) {
      newContacts[0].is_primary = true;
    }
    setContacts(newContacts);
  };

  const updateContact = (index: number, field: keyof Contact, value: string | boolean) => {
    const newContacts = [...contacts];
    if (field === 'is_primary' && value === true) {
      newContacts.forEach((c, i) => {
        c.is_primary = i === index;
      });
    } else {
      (newContacts[index] as any)[field] = value;
    }
    setContacts(newContacts);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client || !companyName.trim()) return;

    setLoading(true);
    try {
      // Update client
      const { error: clientError } = await supabase
        .from('clients')
        .update({
          company_name: companyName.trim(),
          company_website: companyWebsite.trim() || null,
          company_logo_url: companyLogoUrl.trim() || null,
          notes: notes.trim() || null,
          is_active: isActive,
        })
        .eq('id', client.id);

      if (clientError) throw clientError;

      // Delete removed contacts
      if (deletedContactIds.length > 0) {
        await supabase
          .from('client_contacts')
          .delete()
          .in('id', deletedContactIds);
      }

      // Update/Insert contacts
      const validContacts = contacts.filter(c => c.name.trim() || c.email.trim());
      
      for (const contact of validContacts) {
        if (contact.id) {
          // Update existing contact
          await supabase
            .from('client_contacts')
            .update({
              name: contact.name.trim(),
              email: contact.email.trim() || null,
              phone: contact.phone.trim() || null,
              role: contact.role.trim() || null,
              is_primary: contact.is_primary,
            })
            .eq('id', contact.id);
        } else {
          // Insert new contact
          await supabase
            .from('client_contacts')
            .insert({
              client_id: client.id,
              name: contact.name.trim(),
              email: contact.email.trim() || null,
              phone: contact.phone.trim() || null,
              role: contact.role.trim() || null,
              is_primary: contact.is_primary,
            });
        }
      }

      toast({ title: 'Client updated successfully' });
      onSuccess();
      handleClose();
    } catch (error: any) {
      toast({ title: 'Error updating client', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  if (!client) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-cyan-500" />
            Edit Client
          </DialogTitle>
          <DialogDescription>
            Update client information and contact details.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6 py-4">
            {/* Company Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Company Information</h3>
              
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input
                    id="companyName"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Acme Corporation"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyWebsite">Website</Label>
                    <Input
                      id="companyWebsite"
                      type="url"
                      value={companyWebsite}
                      onChange={(e) => setCompanyWebsite(e.target.value)}
                      placeholder="https://example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyLogo">Logo URL</Label>
                    <Input
                      id="companyLogo"
                      type="url"
                      value={companyLogoUrl}
                      onChange={(e) => setCompanyLogoUrl(e.target.value)}
                      placeholder="https://example.com/logo.png"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Internal notes about this client..."
                    rows={2}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Client Status</Label>
                    <p className="text-xs text-muted-foreground">
                      Inactive clients are dimmed in the sidebar
                    </p>
                  </div>
                  <Switch
                    checked={isActive}
                    onCheckedChange={setIsActive}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Contact Persons */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Contact Persons</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addContact}
                  disabled={contacts.length >= 5}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Contact
                </Button>
              </div>

              <div className="space-y-4">
                {contacts.map((contact, index) => (
                  <div key={contact.id || index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Contact {index + 1}</span>
                        {contact.is_primary && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Primary</span>
                        )}
                      </div>
                      {contacts.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeContact(index)}
                          className="h-8 w-8 p-0 text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Name</Label>
                        <Input
                          value={contact.name}
                          onChange={(e) => updateContact(index, 'name', e.target.value)}
                          placeholder="John Doe"
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Email</Label>
                        <Input
                          type="email"
                          value={contact.email}
                          onChange={(e) => updateContact(index, 'email', e.target.value)}
                          placeholder="john@example.com"
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Phone</Label>
                        <Input
                          type="tel"
                          value={contact.phone}
                          onChange={(e) => updateContact(index, 'phone', e.target.value)}
                          placeholder="+1 234 567 8900"
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Role</Label>
                        <Input
                          value={contact.role}
                          onChange={(e) => updateContact(index, 'role', e.target.value)}
                          placeholder="IT Manager"
                          className="h-9"
                        />
                      </div>
                    </div>

                    {!contact.is_primary && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => updateContact(index, 'is_primary', true)}
                        className="text-xs"
                      >
                        Set as Primary Contact
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !companyName.trim()}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
