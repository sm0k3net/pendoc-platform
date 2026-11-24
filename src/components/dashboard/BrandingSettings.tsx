import { useState, useEffect } from 'react';
import { Palette, Building2, FileImage, Type, Save, Loader2, Globe, Mail, Phone, Image as ImageIcon, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

interface BrandingSettingsProps {
  clientId: string;
  onRefresh: () => void;
}

export interface ReportBranding {
  company_name?: string;
  company_logo_url?: string;
  target_display_name?: string;
  target_logo_url?: string;
  company_website?: string;
  contact_email?: string;
  contact_phone?: string;
  assessor_company_name?: string;
  assessor_company_logo_url?: string;
  assessor_company_website?: string;
  assessor_contact_email?: string;
  assessor_contact_phone?: string;
  assessor_tagline?: string;
  cover_badge_text?: string;
  footer_company_text?: string;
  report_title?: string;
  report_subtitle?: string;
  cover_image_url?: string;
  watermark_text?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  font_family?: string;
  footer_text?: string;
  confidentiality_text?: string;
  show_confidential?: boolean;
  show_footer_branding?: boolean;
}

export function BrandingSettings({ clientId, onRefresh }: BrandingSettingsProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [branding, setBranding] = useState<ReportBranding>({
    company_name: '',
    company_logo_url: '',
    target_display_name: '',
    target_logo_url: '',
    company_website: '',
    contact_email: '',
    contact_phone: '',
    assessor_company_name: '',
    assessor_company_logo_url: '',
    assessor_company_website: '',
    assessor_contact_email: '',
    assessor_contact_phone: '',
    assessor_tagline: '',
    cover_badge_text: 'Security Assessment Findings',
    footer_company_text: '',
    report_title: 'PENETRATION TEST REPORT',
    report_subtitle: 'Security Assessment Findings',
    cover_image_url: '',
    watermark_text: '',
    primary_color: '#10b981',
    secondary_color: '#0f172a',
    accent_color: '#3b82f6',
    font_family: 'Inter',
    footer_text: '',
    confidentiality_text: 'CONFIDENTIAL - FOR AUTHORIZED PERSONNEL ONLY',
    show_confidential: true,
    show_footer_branding: true,
  });

  useEffect(() => {
    fetchBranding();
  }, [clientId]);

  const fetchBranding = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('branding, company_name, company_logo_url')
        .eq('id', clientId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const savedBranding = (data.branding as unknown as ReportBranding) || {};
        setBranding({
          company_name: savedBranding.company_name || data.company_name || '',
          company_logo_url: savedBranding.company_logo_url || data.company_logo_url || '',
          target_display_name: savedBranding.target_display_name || savedBranding.company_name || data.company_name || '',
          target_logo_url: savedBranding.target_logo_url || savedBranding.company_logo_url || data.company_logo_url || '',
          company_website: savedBranding.company_website || '',
          contact_email: savedBranding.contact_email || '',
          contact_phone: savedBranding.contact_phone || '',
          assessor_company_name: savedBranding.assessor_company_name || '',
          assessor_company_logo_url: savedBranding.assessor_company_logo_url || '',
          assessor_company_website: savedBranding.assessor_company_website || '',
          assessor_contact_email: savedBranding.assessor_contact_email || '',
          assessor_contact_phone: savedBranding.assessor_contact_phone || '',
          assessor_tagline: savedBranding.assessor_tagline || '',
          cover_badge_text: savedBranding.cover_badge_text || 'Security Assessment Findings',
          footer_company_text: savedBranding.footer_company_text || '',
          report_title: savedBranding.report_title || 'PENETRATION TEST REPORT',
          report_subtitle: savedBranding.report_subtitle || 'Security Assessment Findings',
          cover_image_url: savedBranding.cover_image_url || '',
          watermark_text: savedBranding.watermark_text || '',
          primary_color: savedBranding.primary_color || '#10b981',
          secondary_color: savedBranding.secondary_color || '#0f172a',
          accent_color: savedBranding.accent_color || '#3b82f6',
          font_family: savedBranding.font_family || 'Inter',
          footer_text: savedBranding.footer_text || '',
          confidentiality_text: savedBranding.confidentiality_text || 'CONFIDENTIAL - FOR AUTHORIZED PERSONNEL ONLY',
          show_confidential: savedBranding.show_confidential !== false,
          show_footer_branding: savedBranding.show_footer_branding !== false,
        });
      }
    } catch (error) {
      console.error('Error fetching branding:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('clients')
        .update({ branding: branding as unknown as Json })
        .eq('id', clientId);

      if (error) throw error;

      toast({ title: 'Branding settings saved' });
      onRefresh();
    } catch (error) {
      console.error('Error saving branding:', error);
      toast({ title: 'Error saving branding', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Assessed Organization Display
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Display Name</Label>
            <Input
              value={branding.target_display_name || ''}
              onChange={(e) => setBranding({ ...branding, target_display_name: e.target.value })}
              placeholder="Target organization name shown in the report"
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <FileImage className="h-4 w-4" />
              Target Logo URL
            </Label>
            <Input
              value={branding.target_logo_url || ''}
              onChange={(e) => setBranding({ ...branding, target_logo_url: e.target.value })}
              placeholder="https://example.com/logo.png"
            />
            <p className="text-xs text-muted-foreground">
              Optional target organization logo used in report context panels.
            </p>
          </div>

          {branding.target_logo_url && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-2">Target Logo Preview:</p>
              <img 
                src={branding.target_logo_url} 
                alt="Target logo preview" 
                className="max-h-16 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Target Website
              </Label>
              <Input
                value={branding.company_website || ''}
                onChange={(e) => setBranding({ ...branding, company_website: e.target.value })}
                placeholder="https://company.com"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Target Contact Email
              </Label>
              <Input
                value={branding.contact_email || ''}
                onChange={(e) => setBranding({ ...branding, contact_email: e.target.value })}
                placeholder="security@company.com"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
                Target Contact Phone (optional)
            </Label>
            <Input
              value={branding.contact_phone || ''}
              onChange={(e) => setBranding({ ...branding, contact_phone: e.target.value })}
              placeholder="+1 (555) 123-4567"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Assessment Provider Branding
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Pentest Company Name</Label>
            <Input
              value={branding.assessor_company_name || ''}
              onChange={(e) => setBranding({ ...branding, assessor_company_name: e.target.value })}
              placeholder="Company that executed the penetration test"
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <FileImage className="h-4 w-4" />
              Pentest Company Logo URL
            </Label>
            <Input
              value={branding.assessor_company_logo_url || ''}
              onChange={(e) => setBranding({ ...branding, assessor_company_logo_url: e.target.value })}
              placeholder="https://example.com/pentest-logo.svg"
            />
          </div>

          {branding.assessor_company_logo_url && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-2">Provider Logo Preview:</p>
              <img
                src={branding.assessor_company_logo_url}
                alt="Assessment provider logo preview"
                className="max-h-16 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Provider Website
              </Label>
              <Input
                value={branding.assessor_company_website || ''}
                onChange={(e) => setBranding({ ...branding, assessor_company_website: e.target.value })}
                placeholder="https://security-company.com"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Provider Contact Email
              </Label>
              <Input
                value={branding.assessor_contact_email || ''}
                onChange={(e) => setBranding({ ...branding, assessor_contact_email: e.target.value })}
                placeholder="contact@security-company.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Provider Contact Phone
              </Label>
              <Input
                value={branding.assessor_contact_phone || ''}
                onChange={(e) => setBranding({ ...branding, assessor_contact_phone: e.target.value })}
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div className="space-y-2">
              <Label>Provider Tagline</Label>
              <Input
                value={branding.assessor_tagline || ''}
                onChange={(e) => setBranding({ ...branding, assessor_tagline: e.target.value })}
                placeholder="Offensive security assessments and advisory"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Type className="h-5 w-5 text-primary" />
            Report Identity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Report Title</Label>
            <Input
              value={branding.report_title || ''}
              onChange={(e) => setBranding({ ...branding, report_title: e.target.value })}
              placeholder="PENETRATION TEST REPORT"
            />
          </div>
          <div className="space-y-2">
            <Label>Report Subtitle</Label>
            <Input
              value={branding.report_subtitle || ''}
              onChange={(e) => setBranding({ ...branding, report_subtitle: e.target.value })}
              placeholder="Security Assessment Findings"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cover Badge Text</Label>
              <Input
                value={branding.cover_badge_text || ''}
                onChange={(e) => setBranding({ ...branding, cover_badge_text: e.target.value })}
                placeholder="Security Assessment Findings"
              />
            </div>
            <div className="space-y-2">
              <Label>Footer Company Text</Label>
              <Input
                value={branding.footer_company_text || ''}
                onChange={(e) => setBranding({ ...branding, footer_company_text: e.target.value })}
                placeholder="Provider name shown in footer branding"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Cover Background Image URL (optional)
            </Label>
            <Input
              value={branding.cover_image_url || ''}
              onChange={(e) => setBranding({ ...branding, cover_image_url: e.target.value })}
              placeholder="https://example.com/cover.jpg"
            />
            <p className="text-xs text-muted-foreground">
              If provided, this image will be blended into the cover background.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Watermark Text (optional)</Label>
            <Input
              value={branding.watermark_text || ''}
              onChange={(e) => setBranding({ ...branding, watermark_text: e.target.value })}
              placeholder="Client Confidential"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Report Colors
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Primary Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={branding.primary_color || '#10b981'}
                  onChange={(e) => setBranding({ ...branding, primary_color: e.target.value })}
                  className="w-10 h-10 rounded cursor-pointer border border-border"
                />
                <Input
                  value={branding.primary_color || '#10b981'}
                  onChange={(e) => setBranding({ ...branding, primary_color: e.target.value })}
                  placeholder="#10b981"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">Used for headings, titles, and accents</p>
            </div>

            <div className="space-y-2">
              <Label>Secondary Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={branding.secondary_color || '#0f172a'}
                  onChange={(e) => setBranding({ ...branding, secondary_color: e.target.value })}
                  className="w-10 h-10 rounded cursor-pointer border border-border"
                />
                <Input
                  value={branding.secondary_color || '#0f172a'}
                  onChange={(e) => setBranding({ ...branding, secondary_color: e.target.value })}
                  placeholder="#0f172a"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">Used for cover page background</p>
            </div>

            <div className="space-y-2">
              <Label>Accent Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={branding.accent_color || '#3b82f6'}
                  onChange={(e) => setBranding({ ...branding, accent_color: e.target.value })}
                  className="w-10 h-10 rounded cursor-pointer border border-border"
                />
                <Input
                  value={branding.accent_color || '#3b82f6'}
                  onChange={(e) => setBranding({ ...branding, accent_color: e.target.value })}
                  placeholder="#3b82f6"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">Used for highlights and timeline accents</p>
            </div>
          </div>

          <div className="p-4 rounded-lg" style={{ 
            background: `linear-gradient(135deg, ${branding.secondary_color || '#0f172a'} 0%, ${branding.secondary_color || '#0f172a'}ee 100%)` 
          }}>
            <p className="text-xs text-white/60 mb-1">Preview:</p>
            <p className="text-xl font-bold" style={{ color: branding.primary_color || '#10b981' }}>
              {branding.report_title || 'PENETRATION TEST REPORT'}
            </p>
            <p className="text-sm text-white/80">{branding.report_subtitle || 'Security Assessment Findings'}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Type className="h-5 w-5 text-primary" />
            Typography & Footer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Font Family</Label>
            <Select
              value={branding.font_family || 'Inter'}
              onValueChange={(value) => setBranding({ ...branding, font_family: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select font" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Inter">Inter (Modern)</SelectItem>
                <SelectItem value="Source Sans 3">Source Sans 3</SelectItem>
                <SelectItem value="Roboto">Roboto</SelectItem>
                <SelectItem value="Merriweather">Merriweather (Classic)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Custom Footer Text</Label>
            <Textarea
              value={branding.footer_text || ''}
              onChange={(e) => setBranding({ ...branding, footer_text: e.target.value })}
              placeholder="Enter custom footer text for your reports..."
              className="min-h-[80px]"
            />
            <p className="text-xs text-muted-foreground">
              This text will appear at the bottom of each report page
            </p>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Confidentiality Text
            </Label>
            <Input
              value={branding.confidentiality_text || ''}
              onChange={(e) => setBranding({ ...branding, confidentiality_text: e.target.value })}
              placeholder="CONFIDENTIAL - FOR AUTHORIZED PERSONNEL ONLY"
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div>
              <Label className="cursor-pointer">Show "Confidential" Banner</Label>
              <p className="text-xs text-muted-foreground">
                Display confidentiality notice on cover page
              </p>
            </div>
            <Switch
              checked={branding.show_confidential !== false}
              onCheckedChange={(checked) => setBranding({ ...branding, show_confidential: checked })}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div>
              <Label className="cursor-pointer">Show Footer Branding</Label>
              <p className="text-xs text-muted-foreground">
                Display pentest company name and logo in the report footer
              </p>
            </div>
            <Switch
              checked={branding.show_footer_branding !== false}
              onCheckedChange={(checked) => setBranding({ ...branding, show_footer_branding: checked })}
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
        Save Branding Settings
      </Button>
    </div>
  );
}