import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/contexts/LanguageContext';
import { ToolsPanel } from './ToolsPanel';
import { ServicesPanel } from './LinksPanel';
import { DataPanel } from './DataPanel';
import { SelectedItem } from '@/pages/Dashboard';
import { Wrench, Database, Link } from 'lucide-react';

interface DashboardSidebarProps {
  onSelectItem: (item: SelectedItem) => void;
  selectedItem: SelectedItem;
  refreshTrigger: number;
  onRefresh: () => void;
  selectedProjectId?: string | null;
}

export function DashboardSidebar({ onSelectItem, selectedItem, refreshTrigger, onRefresh, selectedProjectId }: DashboardSidebarProps) {
  const { t } = useLanguage();
  const [activeToolTab, setActiveToolTab] = useState<'tools' | 'services'>('tools');

  return (
    <div className="h-full min-h-0 flex flex-col bg-sidebar border-r border-sidebar-border overflow-hidden animate-fade-in">
      <div className="px-3 pt-3 pb-2">
        <div className="rounded-xl border border-sidebar-border/80 bg-sidebar-accent/40 px-3 py-3 shadow-sm">
          <div className="text-sm font-semibold text-sidebar-foreground">{t.ui?.workspace || 'Workspace'}</div>
          <p className="mt-1 text-xs leading-5 text-sidebar-foreground/70">
            {t.ui?.workspaceDescription || 'Navigate tools, services, and project data from one responsive control surface.'}
          </p>
        </div>
      </div>

      {/* Tools Section */}
      <div className="border-b border-sidebar-border">
        <Tabs value={activeToolTab} onValueChange={(value) => setActiveToolTab(value as 'tools' | 'services')} className="w-full">
          <div className="px-3 pb-3">
            <TabsList className="grid w-full grid-cols-2 h-10 bg-sidebar-accent/50 rounded-xl p-1">
              <TabsTrigger value="tools" className="text-xs gap-1.5 data-[state=active]:bg-background">
                <Wrench className="h-3.5 w-3.5" />
                {t.dashboard.tools}
              </TabsTrigger>
              <TabsTrigger value="services" className="text-xs gap-1.5 data-[state=active]:bg-background">
                <Link className="h-3.5 w-3.5" />
                {t.ui?.services || 'Services'}
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="tools" className="m-0 max-h-56 overflow-y-auto overscroll-contain animate-fade-in px-1 pb-2">
            <ToolsPanel projectId={selectedProjectId} />
          </TabsContent>
          <TabsContent value="services" className="m-0 max-h-48 overflow-y-auto overscroll-contain animate-fade-in px-1 pb-2">
            <ServicesPanel />
          </TabsContent>
        </Tabs>
      </div>

      {/* Data Section */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="px-3 pt-3 pb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
          <Database className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold text-sidebar-foreground uppercase tracking-wider">{t.dashboard.data}</span>
          </div>
          <span className="text-[10px] text-sidebar-foreground/60">{t.ui?.liveWorkspaceTree || 'Live workspace tree'}</span>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-1 pb-3">
          <DataPanel 
            onSelectItem={onSelectItem} 
            selectedItem={selectedItem}
            refreshTrigger={refreshTrigger}
            onRefresh={onRefresh}
          />
        </div>
      </div>
    </div>
  );
}
