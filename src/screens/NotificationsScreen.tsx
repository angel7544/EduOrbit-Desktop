import { useNavigate } from 'react-router-dom';
import React, { useEffect, useState, useCallback } from 'react';
import { ChevronLeft, Info, CheckCircle2, Bell, ChevronRight, MessageCircle, Video, Gift, RefreshCcw } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useCourseStore } from '../store/courseStore';
import { useNotificationStore } from '../store/notificationStore';
import { supabase } from '../lib/supabase';
import { useTheme } from '../hooks/useTheme';

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
};

const getIconConfig = (type: string = 'general') => {
  switch (type) {
    case 'offer':
      return {
        accentBg: 'bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400',
        barColor: 'bg-orange-500',
        Icon: Gift
      };
    case 'course_update':
      return {
        accentBg: 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400',
        barColor: 'bg-indigo-600',
        Icon: RefreshCcw
      };
    case 'live_class':
      return {
        accentBg: 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400',
        barColor: 'bg-rose-500',
        Icon: Video
      };
    case 'chat_reply':
      return {
        accentBg: 'bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400',
        barColor: 'bg-purple-500',
        Icon: MessageCircle
      };
    case 'success':
      return {
        accentBg: 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400',
        barColor: 'bg-emerald-500',
        Icon: CheckCircle2
      };
    default:
      return {
        accentBg: 'bg-sky-50 dark:bg-sky-950/20 text-sky-600 dark:text-sky-400',
        barColor: 'bg-sky-500',
        Icon: Info
      };
  }
};

export default function NotificationsScreen() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { myCourses } = useCourseStore();
  const { fetchUnreadCount } = useNotificationStore();
  const { isDarkMode } = useTheme();

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const channel = supabase
      .channel('public:notifications:screen')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const newNotif = payload.new as any;
          const enrolledIds = new Set(myCourses.map(c => c.id));
          if (newNotif.user_id && newNotif.user_id !== user?.id) return;

          if (!newNotif.course_id || newNotif.type === 'offer' || newNotif.type === 'general' || enrolledIds.has(newNotif.course_id)) {
            setItems(prev => [{ ...newNotif, read: false }, ...prev]);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [myCourses, user?.id]);

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: notificationsData } = await supabase
        .from('notifications')
        .select(`*, offers(code, discount_percentage)`)
        .order('created_at', { ascending: false });

      const { data: readsData } = await supabase
        .from('notification_reads')
        .select('notification_id')
        .eq('user_id', user.id);

      const readSet = new Set(readsData?.map((r: any) => r.notification_id));
      const enrolledIds = new Set(myCourses.map(c => c.id));

      const filteredItems = (notificationsData || [])
        .filter((n: any) =>
          (!n.user_id || n.user_id === user.id) &&
          (!n.course_id || n.type === 'offer' || n.type === 'general' || n.type === 'system' || n.type === 'user' || enrolledIds.has(n.course_id))
        )
        .map((n: any) => ({ ...n, read: readSet.has(n.id) }));

      setItems(filteredItems);
      fetchUnreadCount(user.id, enrolledIds);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user, myCourses, fetchUnreadCount]);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  const markAsRead = async (item: any) => {
    if (item.read) return;
    try {
      const { error } = await supabase
        .from('notification_reads')
        .insert({ user_id: user?.id, notification_id: item.id });

      if (!error) {
        setItems(prev => prev.map(n => n.id === item.id ? { ...n, read: true } : n));
        const enrolledIds = new Set(myCourses.map(c => c.id));
        fetchUnreadCount(user!.id, enrolledIds);
      }
    } catch (err) {}
  };

  const handlePress = async (item: any) => {
    await markAsRead(item);
    if (item.type === 'offer' && item.offer_id) {
      if (item.course_id) {
        const course = myCourses.find(c => c.id === item.course_id) || { id: item.course_id };
        navigate('/coursedetails', { state: { course } });
      }
    } else if (item.type === 'chat_reply' && item.chat_id) {
      navigate('/chatsupport');
    } else if (item.course_id) {
      const course = myCourses.find(c => c.id === item.course_id) || { id: item.course_id, title: 'Course' };
      if ((item.type === 'course_update' || item.type === 'live_class') && item.chapter_id) {
        navigate('/chapterplayer', { state: {
          chapterId: item.chapter_id, courseId: item.course_id,
          courseTitle: (course as any).title || 'Course', hasAccess: true
        } });
      } else {
        navigate('/coursedetails', { state: { course } });
      }
    }
  };

  const markAllRead = async () => {
    const unreadItems = items.filter(i => !i.read);
    if (unreadItems.length === 0) return;
    setItems(prev => prev.map(i => ({ ...i, read: true })));
    const updates = unreadItems.map(i => ({ user_id: user?.id, notification_id: i.id }));
    if (updates.length > 0) {
      await supabase.from('notification_reads').insert(updates);
    }
  };

  const clearAll = () => {
    setItems([]);
  };

  return (
    <div className={`flex flex-col min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-slate-50'}`}>
      <div className={`flex flex-row items-center justify-between px-6 py-4 border-b ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
        <button onClick={() => navigate(-1)} className="p-2 bg-transparent border-none cursor-pointer -ml-2 text-text hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors flex items-center justify-center">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-text m-0 flex-1 ml-3">Notifications</h1>
        <div className="flex gap-3">
          <button onClick={clearAll} className="px-4 py-2 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 text-sm font-semibold rounded-lg border-none cursor-pointer transition-colors">
            Clear all
          </button>
          <button onClick={markAllRead} className="px-4 py-2 bg-primary/10 hover:bg-primary/15 text-primary text-sm font-semibold rounded-lg border-none cursor-pointer transition-colors">
            Mark all read
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="flex-1 p-6 pb-12 overflow-y-auto max-w-7xl mx-auto w-full">
          {items.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map(item => {
                const { accentBg, barColor, Icon } = getIconConfig(item.type);
              return (
                <div 
                  key={item.id}
                  onClick={() => handlePress(item)}
                  className={`rounded-2xl border transition-all duration-300 overflow-hidden cursor-pointer flex flex-col h-full relative
                    ${item.read 
                      ? 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-800/80 opacity-75 hover:opacity-100 shadow-sm' 
                      : 'bg-white dark:bg-gray-800 border-primary/20 dark:border-primary/30 shadow-[0_4px_16px_rgba(99,102,241,0.06)] hover:shadow-[0_6px_20px_rgba(99,102,241,0.1)]'
                    }`}
                >
                  <div className={`h-1.5 w-full ${item.read ? 'bg-gray-200 dark:bg-gray-700' : barColor}`} />
                  
                  <div className="flex-1 flex flex-col p-5 gap-4">
                    <div className="flex flex-row items-start gap-4">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${accentBg}`}>
                        <Icon size={20} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-row items-center justify-between gap-2 mb-1.5">
                          <span className={`text-base font-bold truncate ${item.read ? 'text-gray-700 dark:text-gray-300' : 'text-gray-900 dark:text-gray-50'}`}>
                            {item.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 dark:text-gray-500 font-medium whitespace-nowrap">
                            {formatTimeAgo(item.created_at)}
                          </span>
                          {!item.read && (
                            <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 animate-pulse" />
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex-1">
                      <p className={`text-sm leading-relaxed m-0 ${item.read ? 'text-gray-500 dark:text-gray-400' : 'text-gray-600 dark:text-gray-300'}`}>
                        {item.message}
                      </p>

                      {!!item.image_url && (
                        <div className="mt-4 rounded-xl overflow-hidden border border-gray-150 dark:border-gray-700/60 shadow-sm relative group max-w-full">
                          <img 
                            src={item.image_url} 
                            className="w-full h-32 object-cover transform hover:scale-[1.02] transition-transform duration-300 ease-out" 
                            alt={item.title} 
                          />
                        </div>
                      )}

                      {item.offers && (
                        <div className="flex flex-row mt-3" onClick={(e) => { 
                          e.stopPropagation(); 
                          navigator.clipboard.writeText(item.offers.code);
                          alert('Coupon code copied to clipboard!');
                        }}>
                          <div className="bg-orange-50 dark:bg-orange-950/30 px-3 py-1.5 rounded-lg border border-orange-100 dark:border-orange-900/40 flex items-center gap-1.5 hover:bg-orange-100 dark:hover:bg-orange-900/60 transition-colors">
                            <Gift size={14} className="text-orange-500" />
                            <span className="text-orange-600 dark:text-orange-400 text-xs font-bold uppercase tracking-wider">
                              Code: {item.offers.code} • {item.offers.discount_percentage}% OFF (Click to copy)
                            </span>
                          </div>
                        </div>
                      )}
                      {!item.read && (
                        <div className="mt-auto pt-3 flex flex-row">
                          <button 
                            onClick={(e) => { e.stopPropagation(); markAsRead(item); }} 
                            className="py-1.5 px-3.5 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800/80 dark:hover:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer transition-colors"
                          >
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 m-0">Mark as read</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center pt-20 px-8">
              <div className={`w-[100px] h-[100px] rounded-full flex justify-center items-center mb-6 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                <Bell size={48} className={isDarkMode ? 'text-slate-600' : 'text-slate-300'} />
              </div>
              <h2 className="text-xl font-bold mb-2 text-center text-text m-0">No Notifications</h2>
              <p className="text-sm text-center leading-[22px] text-textLight m-0">You're all caught up! Check back later for updates.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
