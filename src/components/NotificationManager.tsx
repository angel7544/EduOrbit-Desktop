import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useCourseStore } from '../store/courseStore';
import { useNotificationStore } from '../store/notificationStore';
import { useNavigate } from 'react-router-dom';
import { NotificationModal } from './NotificationModal';
import { NotificationToast, NotificationType } from './NotificationToast';

export const NotificationManager = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { myCourses, loadMyCourses, courses } = useCourseStore();
  const { fetchUnreadCount, reset, subscribeToUnreadCount } = useNotificationStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [modalData, setModalData] = useState<any>(null);
  const [lastShownId, setLastShownId] = useState<string | null>(null);
  const lastShownIdRef = useRef<string | null>(null);
  const [toast, setToast] = useState<{ visible: boolean; title: string; message: string; type?: NotificationType }>({
    visible: false,
    title: '',
    message: '',
    type: 'general'
  });

  const enrolledIds = useMemo(() => new Set(myCourses.map(c => c.id)), [myCourses]);
  const enrolledIdsRef = useRef<Set<string>>(enrolledIds);

  useEffect(() => {
    enrolledIdsRef.current = enrolledIds;
  }, [enrolledIds]);

  useEffect(() => {
    lastShownIdRef.current = lastShownId;
  }, [lastShownId]);

  useEffect(() => {
    if (!user) {
      reset();
      setModalVisible(false);
      setModalData(null);
      setLastShownId(null);
      lastShownIdRef.current = null;
    }
  }, [user, reset]);

  useEffect(() => {
    if (user && myCourses.length === 0) {
      loadMyCourses(user);
    }
  }, [user, myCourses.length, loadMyCourses]);

  useEffect(() => {
    if (user) {
      fetchUnreadCount(user.id, enrolledIds);

      // Add periodic refresh for the notification bell count
      const countInterval = setInterval(() => {
        fetchUnreadCount(user.id, enrolledIds);
      }, 500); // 500ms

      return () => clearInterval(countInterval);
    }
  }, [user, enrolledIds, fetchUnreadCount]);

  useEffect(() => {
    if (!user) return;
    return subscribeToUnreadCount(user.id, enrolledIds);
  }, [user, enrolledIds, subscribeToUnreadCount]);

  useEffect(() => {
    if (!user) {
      reset();
      setModalVisible(false);
      setModalData(null);
      setLastShownId(null);
      lastShownIdRef.current = null;
      return;
    }

    // REMOVED: Automatic modal for old unread notifications on mount.
    // We only want to show modals for NEW notifications that arrive while the app is open.
    // Old unread notifications should be accessed via the Notification Screen (bell icon).

    // If you really want to show missed urgent notifications, check for 'high' priority or specific types here.
    // For now, we disable the "on-load" modal to prevent annoyance and "redirect" feeling.

  }, [user]); // Removed enrolledIds dependency as we removed the logic

  useEffect(() => {
    if (!user) return;

    // Real-time subscription
    const channel = supabase
      .channel('public:notifications:modal')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const newNotif = payload.new as any;
          const currentEnrolledIds = enrolledIdsRef.current;

          // Relevance checks
          if (newNotif.user_id && newNotif.user_id !== user.id) return;
          if (newNotif.course_id &&
            newNotif.type !== 'offer' &&
            newNotif.type !== 'general' &&
            !currentEnrolledIds.has(newNotif.course_id)) return;

          // Deduplication check
          if (lastShownIdRef.current === newNotif.id) return;

          console.log('Showing modal for realtime notification:', newNotif.id);
          setModalData(newNotif);
          setModalVisible(true);
          lastShownIdRef.current = newNotif.id;
          setLastShownId(newNotif.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]); // Only recreate subscription if user changes

  const handlePress = () => {
    setModalVisible(false);

    if (modalData?.course_id) {
      const course = myCourses.find(c => c.id === modalData.course_id) || courses.find(c => c.id === modalData.course_id);

      if (course) {
        if ((modalData.type === 'course_update' || modalData.type === 'live_class') && modalData.chapter_id) {
          navigate('/chapterplayer', { state: {
            chapterId: modalData.chapter_id,
            courseId: modalData.course_id,
            courseTitle: course.title,
            hasAccess: true
          } });
        } else {
          navigate('/coursedetails', { state: { course } });
        }
      } else {
        // Fallback if course not found in store (maybe not loaded yet?)
        // Try to navigate with minimal info or fetch
        navigate('/coursedetails', { state: {
          course: { id: modalData.course_id, title: 'Course', raw: { id: modalData.course_id } }
        } });
      }
    } else if (modalData?.type === 'chat_reply') {
      if (modalData.chat_id) {
        navigate('/supporttickets', { state: { chatId: modalData.chat_id } });
      } else {
        navigate('/supporttickets');
      }
    } else if (modalData?.offer_id) {
      navigate('/coupons', { state: { offerId: modalData.offer_id } });
    } else {
      navigate('/notifications');
    }
  };

  return (
    <>
      <NotificationModal
        visible={modalVisible}
        onClose={async () => {
          setModalVisible(false);
          // Mark as read when closed (dismissed) as well
          if (modalData && user) {
            try {
              await supabase.from('notification_reads').insert({
                user_id: user.id,
                notification_id: modalData.id
              });
              fetchUnreadCount(user.id, enrolledIds);
            } catch (e) {
              console.error('Error marking modal notification as read on close', e);
            }
          }
        }}
        onPress={handlePress}
        data={modalData}
      />
      <NotificationToast
        visible={toast.visible}
        title={toast.title}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast(prev => ({ ...prev, visible: false }))}
        onPress={() => {
          setToast(prev => ({ ...prev, visible: false }));
          navigate('/notifications');
        }}
      />
    </>
  );
};
