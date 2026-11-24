import { useState, useEffect, useCallback } from 'react';
import { Bell, MessageSquare, RefreshCw, Bug, CheckCircle, FileText, FolderPlus, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface Notification {
  id: string;
  notification_type: string;
  message: string | null;
  vulnerability_id: string | null;
  project_id: string | null;
  is_read: boolean;
  created_at: string;
  from_user_id: string | null;
  vulnerability_title: string | null;
  project_name: string | null;
  target_url: string | null;
  from_user?: {
    display_name: string | null;
    email: string | null;
  };
}

export function NotificationBell() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('pentester_notifications')
        .select('*, vulnerability_title, project_name, target_url')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Fetch from_user profiles
      if (data && data.length > 0) {
        const fromUserIds = [...new Set(data.filter(n => n.from_user_id).map(n => n.from_user_id))];
        if (fromUserIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, display_name, email')
            .in('id', fromUserIds);

          const profileMap = new Map(profiles?.map(p => [p.id, { display_name: p.display_name, email: p.email }]) || []);

          const enriched = data.map(n => ({
            ...n,
            from_user: n.from_user_id ? profileMap.get(n.from_user_id) : undefined,
          }));

          setNotifications(enriched);
          setUnreadCount(enriched.filter(n => !n.is_read).length);
          return;
        }
      }

      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.is_read).length || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
    // Subscribe to realtime updates
    if (user) {
      const channel = supabase
        .channel('pentester-notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'pentester_notifications',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchNotifications();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, fetchNotifications]);

  const markAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('pentester_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await supabase
        .from('pentester_notifications')
        .update({ is_read: true })
        .eq('user_id', user?.id)
        .eq('is_read', false);

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    setOpen(false);

    if (notification.target_url) {
      navigate(notification.target_url);
      return;
    }

    if (notification.vulnerability_id) {
      navigate(`/dashboard?vuln=${notification.vulnerability_id}`);
      return;
    }

    if (notification.project_id) {
      navigate(`/dashboard?project=${notification.project_id}`);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'comment':
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'retest_request':
        return <RefreshCw className="h-4 w-4 text-orange-500" />;
      case 'vulnerability':
        return <Bug className="h-4 w-4 text-red-500" />;
      case 'project':
        return <FolderPlus className="h-4 w-4 text-green-500" />;
      case 'report':
        return <FileText className="h-4 w-4 text-purple-500" />;
      default:
        return <Bell className="h-4 w-4 text-primary" />;
    }
  };

  const getNotificationText = (notification: Notification) => {
    // If we have a message, use it
    if (notification.message) return notification.message;
    
    const fromName = notification.from_user?.display_name || notification.from_user?.email || 'Someone';
    switch (notification.notification_type) {
      case 'comment':
        return `${fromName} left a comment${notification.vulnerability_title ? ` on ${notification.vulnerability_title}` : ''}`;
      case 'retest_request':
        return `${fromName} requested a re-test${notification.vulnerability_title ? ` for ${notification.vulnerability_title}` : ''}`;
      case 'vulnerability':
        return `New vulnerability${notification.vulnerability_title ? `: ${notification.vulnerability_title}` : ' submitted'}`;
      case 'project':
        return `New project created${notification.project_name ? `: ${notification.project_name}` : ''}`;
      case 'report':
        return `Report generated${notification.project_name ? ` for ${notification.project_name}` : ''}`;
      default:
        return 'New notification';
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[calc(100vw-1rem)] max-w-sm p-0">
        <div className="p-3 border-b flex items-center justify-between">
          <h4 className="font-semibold text-sm">{t.clientAccess?.notifications || 'Notifications'}</h4>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={markAllAsRead}>
              <CheckCircle className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-72">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              {t.clientAccess?.noNotifications || 'No notifications'}
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map(notification => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full p-3 text-left hover:bg-muted/50 transition-colors flex gap-3 ${
                    !notification.is_read ? 'bg-primary/5' : ''
                  }`}
                >
                  <div className="mt-0.5">{getNotificationIcon(notification.notification_type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-1">
                      {getNotificationText(notification)}
                    </p>
                    {notification.message && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {notification.message}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  {!notification.is_read && (
                    <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                  )}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
