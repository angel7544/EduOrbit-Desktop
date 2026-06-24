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
    case 'offer': return { colors: 'bg-gradient-to-br from-orange-500 to-orange-300', Icon: Gift };
    case 'course_update': return { colors: 'bg-gradient-to-br from-indigo-600 to-blue-500', Icon: RefreshCcw };
    case 'live_class': return { colors: 'bg-gradient-to-br from-rose-500 to-rose-400', Icon: Video };
    case 'chat_reply': return { colors: 'bg-gradient-to-br from-purple-500 to-purple-400', Icon: MessageCircle };
    case 'success': return { colors: 'bg-gradient-to-br from-lime-600 to-lime-500', Icon: CheckCircle2 };
    default: return { colors: 'bg-gradient-to-br from-teal-600 to-teal-400', Icon: Info };
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

  return (
    <div className={`flex flex-col min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-slate-50'}`}>
      <div className={`flex flex-row items-center justify-between px-4 py-3 border-b ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-black/5'}`}>
        <button onClick={() => navigate(-1)} className="p-2 bg-transparent border-none cursor-pointer -ml-2">
          <ChevronLeft size={24} className="text-text" />
        </button>
        <h1 className="text-lg font-bold text-text m-0">Notifications</h1>
        <button onClick={markAllRead} className="p-2 bg-transparent border-none cursor-pointer text-primary text-xs font-semibold">
          Mark all read
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="flex-1 p-4 pb-8 overflow-y-auto max-w-4xl mx-auto w-full">
          {items.length > 0 ? (
            items.map(item => {
              const { colors: cardColors, Icon } = getIconConfig(item.type);
              return (
                <div 
                  key={item.id}
                  onClick={() => handlePress(item)}
                  className={`mb-3 rounded-2xl shadow-md overflow-hidden cursor-pointer transition-opacity ${item.read ? 'opacity-80' : 'opacity-100'}`}
                >
                  <div className={`flex flex-row items-center p-4 rounded-2xl ${cardColors}`}>
                    <div className="w-12 h-12 rounded-xl bg-white/20 flex justify-center items-center mr-4">
                      <Icon size={24} color="#FFFFFF" />
                    </div>

                    <div className="flex-1">
                      <div className="flex flex-row justify-between items-center mb-1">
                        <span className="text-base font-bold flex-1 mr-2 text-white truncate">{item.title}</span>
                        <span className="text-xs font-medium text-white/80 whitespace-nowrap">{formatTimeAgo(item.created_at)}</span>
                      </div>

                      <p className="text-[13px] leading-[18px] text-white/90 line-clamp-2 m-0">{item.message}</p>

                      {!!item.image_url && (
                        <div className="mt-2.5">
                          <img src={item.image_url} className="w-full h-[140px] rounded-xl bg-white/15 border border-white/25 object-cover" alt="" />
                        </div>
                      )}

                      {item.offers && (
                        <div className="flex flex-row mt-2">
                          <div className="bg-white/20 px-2.5 py-1 rounded-lg">
                            <span className="text-white text-xs font-bold">{item.offers.code} • {item.offers.discount_percentage}% OFF</span>
                          </div>
                        </div>
                      )}

                      {!item.read && (
                        <div className="mt-2 flex flex-row">
                          <button onClick={(e) => { e.stopPropagation(); markAsRead(item); }} className="py-1 px-3 bg-white/20 rounded-xl border-none cursor-pointer hover:bg-white/30 transition-colors">
                            <span className="text-xs font-semibold text-white m-0">Mark as read</span>
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end justify-between h-full ml-2">
                      {!item.read ? <div className="w-2.5 h-2.5 rounded-full bg-white mb-2" /> : <div className="h-2.5 mb-2" />}
                      <ChevronRight size={20} className="text-white/70 my-auto" />
                    </div>
                  </div>
                </div>
              )
            })
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
