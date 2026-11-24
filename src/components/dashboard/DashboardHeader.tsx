import { BarChart3, Bot, BookOpen, ChevronDown, ListChecks, LogOut, Settings, Shield, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { LanguageToggle } from '@/components/common/LanguageToggle';
import { NotificationBell } from '@/components/dashboard/NotificationBell';
import { WorkspaceAssistantDialog } from '@/components/dashboard/dialogs/WorkspaceAssistantDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface DashboardHeaderProps {
  mobileMenuButton?: React.ReactNode;
  contextLabel?: string;
  onSelectWorkspaceView?: (view: 'vulnerabilities' | 'reports') => void;
}

export function DashboardHeader({ mobileMenuButton, contextLabel, onSelectWorkspaceView }: DashboardHeaderProps) {
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const initials = user?.email?.slice(0, 2).toUpperCase() || 'U';

  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-xl px-3 py-2 sm:px-4 sm:py-2.5">
      <div className="flex items-start justify-between gap-3 sm:items-center">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5 min-w-0">
            {mobileMenuButton}
            <div className="p-1 rounded-lg bg-primary/10 shadow-sm shadow-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-base tracking-tight truncate hidden sm:block">{t.landing.title}</div>
              <div className="font-bold text-base tracking-tight truncate sm:hidden">PenDoc</div>
              <div className="hidden sm:block text-[11px] text-muted-foreground">
                {t.ui?.workspace || 'Workspace'} command center
              </div>
            </div>
            {contextLabel && (
              <div className="hidden md:flex items-center gap-2 ml-1 px-2.5 py-1 rounded-lg border border-border bg-background/60 text-xs text-muted-foreground font-medium max-w-[280px] truncate">
                <span className="h-1.5 w-1.5 rounded-full bg-primary inline-block shrink-0" />
                <span className="truncate">{contextLabel}</span>
              </div>
            )}
          </div>
          {contextLabel && (
            <div className="mt-2 md:hidden inline-flex max-w-full items-center gap-2 rounded-lg border border-border bg-background/70 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="truncate">{contextLabel}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-center">
        {onSelectWorkspaceView && (
          <div className="hidden lg:flex items-center gap-0.5 mr-1">
            <WorkspaceAssistantDialog
              trigger={
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  <Bot className="h-4 w-4 mr-1.5" />
                  Assistant
                </Button>
              }
            />
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" onClick={() => navigate('/api-docs')}>
              <BookOpen className="h-4 w-4 mr-1.5" />
              API
            </Button>
            <div className="h-5 w-px bg-border mx-0.5" />
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" onClick={() => onSelectWorkspaceView('vulnerabilities')}>
              <ListChecks className="h-4 w-4 mr-1.5" />
              {t.ui?.allVulnerabilities || 'Vulnerabilities'}
            </Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" onClick={() => onSelectWorkspaceView('reports')}>
              <BarChart3 className="h-4 w-4 mr-1.5" />
              {t.ui?.reports || 'Reports'}
            </Button>
          </div>
        )}
        {onSelectWorkspaceView && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="inline-flex lg:hidden text-muted-foreground hover:text-foreground">
                Workspace
                <ChevronDown className="h-4 w-4 ml-1.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem asChild>
                <div>
                  <WorkspaceAssistantDialog
                    trigger={
                      <button className="w-full flex items-center text-sm">
                        <Bot className="h-4 w-4 mr-2" />
                        Assistant
                      </button>
                    }
                  />
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/api-docs')}>
                <BookOpen className="mr-2 h-4 w-4" />
                API
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onSelectWorkspaceView('vulnerabilities')}>
                <ListChecks className="mr-2 h-4 w-4" />
                {t.ui?.allVulnerabilities || 'Vulnerabilities'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSelectWorkspaceView('reports')}>
                <BarChart3 className="mr-2 h-4 w-4" />
                {t.ui?.reports || 'Reports'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <div className="hidden sm:block">
          <LanguageToggle />
        </div>
        <ThemeToggle />
        <NotificationBell />
        
        <div className="h-5 w-px bg-border mx-0.5" />
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5 text-sm text-muted-foreground truncate">
              {user?.email}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              {t.settings.title}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              {t.settings.logout}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      </div>
    </header>
  );
}
