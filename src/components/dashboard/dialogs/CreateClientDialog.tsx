import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Building2, Plus, Trash2, User } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface Contact {
  name: string;
  email: string;
  phone: string;
  role: string;
  is_primary: boolean;
}

interface CreateClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateClientDialog({ open, onOpenChange, onSuccess }: CreateClientDialogProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [companyLogoUrl, setCompanyLogoUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([
    { name: '', email: '', phone: '', role: '', is_primary: true }
  ]);

  const addContact = () => {
    if (contacts.length >= 5) {
      toast({ title: t.dialogs?.maxContacts || 'Maximum 5 contacts allowed', variant: 'destructive' });
      return;
    }
    setContacts([...contacts, { name: '', email: '', phone: '', role: '', is_primary: false }]);
  };

  const removeContact = (index: number) => {
    if (contacts.length === 1) return;
    const newContacts = contacts.filter((_, i) => i !== index);
    // If we removed the primary contact, make the first one primary
    if (contacts[index].is_primary && newContacts.length > 0) {
      newContacts[0].is_primary = true;
    }
    setContacts(newContacts);
  };

  const updateContact = (index: number, field: keyof Contact, value: string | boolean) => {
    const newContacts = [...contacts];
    if (field === 'is_primary' && value === true) {
      // Only one primary contact
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
    if (!user || !companyName.trim()) return;

    setLoading(true);
    try {
      // Create client
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .insert({
          user_id: user.id,
          company_name: companyName.trim(),
          company_website: companyWebsite.trim() || null,
          company_logo_url: companyLogoUrl.trim() || null,
          notes: notes.trim() || null,
        })
        .select()
        .single();

      if (clientError) throw clientError;

      // Create contacts
      const validContacts = contacts.filter(c => c.name.trim() || c.email.trim());
      if (validContacts.length > 0 && client) {
        const { error: contactsError } = await supabase
          .from('client_contacts')
          .insert(
            validContacts.map(c => ({
              client_id: client.id,
              name: c.name.trim(),
              email: c.email.trim() || null,
              phone: c.phone.trim() || null,
              role: c.role.trim() || null,
              is_primary: c.is_primary,
            }))
          );

        if (contactsError) {
          console.error('Error creating contacts:', contactsError);
        }
      }

      toast({ title: t.dialogs?.clientCreated || 'Client created successfully' });
      onSuccess();
      handleClose();
    } catch (error: any) {
      toast({ title: t.dialogs?.errorCreatingClient || 'Error creating client', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCompanyName('');
    setCompanyWebsite('');
    setCompanyLogoUrl('');
    setNotes('');
    setContacts([{ name: '', email: '', phone: '', role: '', is_primary: true }]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-cyan-500" />
            {t.dialogs?.createClientTitle || 'Create New Client'}
          </DialogTitle>
          <DialogDescription>
            {t.dialogs?.createClientDesc || 'Add a new client to organize your penetration testing projects.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6 py-4">
            {/* Company Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">{t.dialogs?.companyInfo || 'Company Information'}</h3>
              
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">{t.dialogs?.companyName || 'Company Name'} *</Label>
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
                    <Label htmlFor="companyWebsite">{t.dialogs?.website || 'Website'}</Label>
                    <Input
                      id="companyWebsite"
                      type="url"
                      value={companyWebsite}
                      onChange={(e) => setCompanyWebsite(e.target.value)}
                      placeholder="https://example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyLogo">{t.dialogs?.logoUrl || 'Logo URL'}</Label>
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
                  <Label htmlFor="notes">{t.dialogs?.notes || 'Notes'}</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t.dialogs?.notesPlaceholder || 'Internal notes about this client...'}
                    rows={2}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Contact Persons */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">{t.dialogs?.contactPersons || 'Contact Persons'}</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addContact}
                  disabled={contacts.length >= 5}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {t.dialogs?.addContact || 'Add Contact'}
                </Button>
              </div>

              <div className="space-y-4">
                {contacts.map((contact, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{t.dialogs?.contact || 'Contact'} {index + 1}</span>
                        {contact.is_primary && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">{t.dialogs?.primary || 'Primary'}</span>
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
                        <Label className="text-xs">{t.dialogs?.name || 'Name'}</Label>
                        <Input
                          value={contact.name}
                          onChange={(e) => updateContact(index, 'name', e.target.value)}
                          placeholder="John Doe"
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">{t.dialogs?.email || 'Email'}</Label>
                        <Input
                          type="email"
                          value={contact.email}
                          onChange={(e) => updateContact(index, 'email', e.target.value)}
                          placeholder="john@example.com"
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">{t.dialogs?.phone || 'Phone'}</Label>
                        <Input
                          type="tel"
                          value={contact.phone}
                          onChange={(e) => updateContact(index, 'phone', e.target.value)}
                          placeholder="+1 234 567 8900"
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">{t.dialogs?.role || 'Role'}</Label>
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
                        {t.dialogs?.setAsPrimary || 'Set as Primary Contact'}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              {t.dashboard.cancel}
            </Button>
            <Button type="submit" disabled={loading || !companyName.trim()}>
              {loading ? (t.dialogs?.creating || 'Creating...') : (t.dialogs?.createClient || 'Create Client')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
