import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface NotificationState {
  unreadCount: number;
  fetchUnreadCount: (userId: string, enrolledIds: Set<string>) => Promise<void>;
  setUnreadCount: (count: number) => void;
  incrementUnread: () => void;
  decrementUnread: () => void;
  reset: () => void;
  subscribeToUnreadCount: (userId: string, enrolledIds: Set<string>) => () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  unreadCount: 0,
  setUnreadCount: (count: number) => set({ unreadCount: count }),
  incrementUnread: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),
  fetchUnreadCount: async (userId: string, enrolledIds: Set<string>) => {
    try {
      const { data: allNotifs, error: notifError } = await supabase
        .from('notifications')
        .select('id, course_id, user_id, type');

      if (notifError) throw notifError;

      const { data: reads, error: readError } = await supabase
        .from('notification_reads')
        .select('notification_id')
        .eq('user_id', userId);

      if (readError) throw readError;

      const readSet = new Set(reads?.map((r: any) => r.notification_id));

      const unread = allNotifs?.filter((n: any) =>
        !readSet.has(n.id) &&
        (!n.user_id || n.user_id === userId) &&
        (!n.course_id || n.type === 'general' || n.type === 'offer' || n.type === 'system' || n.type === 'user' || enrolledIds.has(n.course_id))
      ).length || 0;

      set({ unreadCount: unread });
    } catch (e) {
      console.error('Failed to fetch unread count', e);
    }
  },
  decrementUnread: () => set((state) => ({ unreadCount: Math.max(0, state.unreadCount - 1) })),
  reset: () => set({ unreadCount: 0 }),
  subscribeToUnreadCount: (userId: string, enrolledIds: Set<string>) => {
    // Create a unique channel for this subscription session to prevent name collisions in supabase cache
    const channelId = `unread_count_${userId}_${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => {
          const store = useNotificationStore.getState();
          store.fetchUnreadCount(userId, enrolledIds);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notification_reads', filter: `user_id=eq.${userId}` },
        () => {
          const store = useNotificationStore.getState();
          store.fetchUnreadCount(userId, enrolledIds);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
}));