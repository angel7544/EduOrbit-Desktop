import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { AppUser } from './authStore';

export interface AttachmentItem {
  id: string;
  title: string;
  file_url: string;
  file_type: string;
}

export interface LessonItem {
  id: string;
  chapter_id: string;
  title: string;
  description?: string;
  video_url?: string;
  duration?: number;
  position?: number;
  is_published?: boolean;
  is_free?: boolean;
  attachments?: any[];
  created_at?: string;
}

export interface ChapterItem {
  description: string;
  id: string;
  course_id: string;
  title: string;
  is_demo: boolean | null;
  position: number | null;
  video_url: string | null;
  duration: number | null;
  is_live?: boolean;
  live_starts_at?: string;
  live_ends_at?: string;
  live_status?: 'SCHEDULED' | 'LIVE' | 'ENDED';
  attachments?: AttachmentItem[];
  allow_download?: boolean;
  is_published?: boolean;
  lessons?: LessonItem[];
}

export interface CourseItem {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  thumbnail_url: string | null;
  teacher_id: string | null;
  is_published: boolean | null;
  is_enrollment_closed?: boolean;
  created_at: string | null;
  expiry_days?: number;
  chapters?: ChapterItem[];
  purchases_count?: number;
  is_featured?: boolean;
  allow_download?: boolean;
  video_subject?: string;
  instructor_name?: string;
  teacher?: {
    name: string | null;
    profile_image: string | null;
  };
  enrollment?: {
    expiry_date: string | null;
    subscription_status: 'active' | 'expired' | null;
    created_at?: string | null;
  };
  rating?: number;
  reviewsCount?: number;
}

interface ChapterProgress {
  chapter_id: string;
  is_completed: boolean;
  watch_time_seconds: number;
  last_position_seconds: number;
}

interface CourseState {
  courses: CourseItem[];
  myCourses: CourseItem[];
  loading: boolean;
  error: string | null;
  hasAccessMap: Record<string, boolean>;
  progress: Record<string, string[]>; // courseId -> completed chapter IDs
  chapterProgress: Record<string, Record<string, ChapterProgress>>; // courseId -> chapterId -> progress
  loadPublishedCourses: () => Promise<void>;
  loadMyCourses: (user: AppUser | null) => Promise<void>;
  enrollFreeCourse: (courseId: string, user: AppUser) => Promise<boolean>;
  ensureCourseAccess: (courseId: string, user: AppUser | null) => Promise<boolean>;
  revokeCourseAccess: (courseId: string, user: AppUser) => Promise<boolean>;
  loadProgress: (courseId: string, userId: string) => Promise<void>;
  markChapterCompleted: (courseId: string, chapterId: string, userId: string) => Promise<void>;
  unmarkChapterCompleted: (courseId: string, chapterId: string, userId: string) => Promise<void>;
  saveChapterProgress: (courseId: string, chapterId: string, userId: string, progress: Partial<ChapterProgress>) => Promise<void>;
  getCourseProgress: (courseId: string) => number;
}

export const useCourseStore = create<CourseState>((set, get) => ({
  courses: [],
  myCourses: [],
  loading: false,
  error: null,
  hasAccessMap: {},
  progress: {},
  chapterProgress: {},
  enrollFreeCourse: async (courseId, user) => {
    try {
      // Calculate expiry date (180 days from now)
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 180);

      const { error } = await supabase.from('purchases').insert({
        user_id: user.id,
        course_id: courseId,
        amount: 0,
        status: 'success',
        provider: 'free',
        expiry_date: expiryDate.toISOString(),
        subscription_status: 'active'
      });

      if (error) throw error;

      // Refresh access map
      set({
        hasAccessMap: {
          ...get().hasAccessMap,
          [courseId]: true,
        }
      });

      // Refresh my courses
      get().loadMyCourses(user);

      return true;
    } catch (e) {
      console.error('Enrollment failed', e);
      return false;
    }
  },
  loadPublishedCourses: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('courses')
        .select(
          `
          id,
          title,
          description,
          price,
          thumbnail_url,
          teacher_id,
          is_published,
          created_at,
          expiry_days,
          purchases_count,
          is_featured,
          video_subject,
          instructor_name,
          teacher:users!teacher_id (
            name,
            profile_image
          ),
          chapters (
            id,
            course_id,
            title,
            description,
            is_demo,
            position,
            video_url,
            duration,
            is_live,
            live_starts_at,
            live_ends_at,
            live_status,
            attachments (*),
            lessons (*)
          )
        `
        )
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      // Fetch reviews if table exists
      let reviewStats: Record<string, { total: number; count: number }> = {};
      try {
        const { data: reviewsData } = await supabase
          .from('course_reviews')
          .select('course_id, rating');
        if (reviewsData) {
          reviewsData.forEach((r: any) => {
            if (!reviewStats[r.course_id]) {
              reviewStats[r.course_id] = { total: 0, count: 0 };
            }
            reviewStats[r.course_id].total += r.rating;
            reviewStats[r.course_id].count += 1;
          });
        }
      } catch (err) {
        console.warn('Could not load course reviews:', err);
      }

      const list: CourseItem[] = Array.isArray(data)
        ? data.map((item: any) => {
          const stats = reviewStats[item.id] || { total: 0, count: 0 };
          return {
            ...item,
            teacher: Array.isArray(item.teacher) ? item.teacher[0] : item.teacher,
            rating: stats.count > 0 ? Number((stats.total / stats.count).toFixed(1)) : 4.5,
            reviewsCount: stats.count
          };
        })
        : [];
      set({ courses: list, loading: false, error: null });
    } catch (e: any) {
      const message =
        typeof e?.message === 'string' ? e.message : 'Failed to load courses';
      set({ loading: false, error: message });
    }
  },
  loadMyCourses: async (user) => {
    if (!user) {
      set({ myCourses: [] });
      return;
    }

    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('purchases')
        .select(
          `
          expiry_date,
          subscription_status,
          created_at,
          course:courses (
            id,
            title,
            description,
            price,
            thumbnail_url,
            teacher_id,
            is_published,
            created_at,
            expiry_days,
            is_featured,
            video_subject,
            instructor_name,
            teacher:users!teacher_id (
              name,
              profile_image
            ),
            chapters (id, duration)
          )
        `
        )
        .eq('user_id', user.id)
        .eq('status', 'success');

      if (error) {
        throw new Error(error.message);
      }

      // Fetch reviews if table exists
      let reviewStats: Record<string, { total: number; count: number }> = {};
      try {
        const { data: reviewsData } = await supabase
          .from('course_reviews')
          .select('course_id, rating');
        if (reviewsData) {
          reviewsData.forEach((r: any) => {
            if (!reviewStats[r.course_id]) {
              reviewStats[r.course_id] = { total: 0, count: 0 };
            }
            reviewStats[r.course_id].total += r.rating;
            reviewStats[r.course_id].count += 1;
          });
        }
      } catch (err) {
        console.warn('Could not load course reviews:', err);
      }

      const courses: CourseItem[] = [];
      if (Array.isArray(data)) {
        for (const row of data as any[]) {
          if (row.course) {
            // Check if expired
            const isExpired = row.expiry_date && new Date(row.expiry_date) < new Date();
            const status = isExpired ? 'expired' : (row.subscription_status || 'active');
            const stats = reviewStats[row.course.id] || { total: 0, count: 0 };

            courses.push({
              ...row.course,
              enrollment: {
                expiry_date: row.expiry_date,
                subscription_status: status,
                created_at: row.created_at
              },
              rating: stats.count > 0 ? Number((stats.total / stats.count).toFixed(1)) : 4.5,
              reviewsCount: stats.count
            } as CourseItem);
          }
        }
      }

      // Remove duplicates based on course id
      const uniqueCourses = Array.from(new Map(courses.map(item => [item.id, item])).values());

      set({ myCourses: uniqueCourses, loading: false, error: null });
    } catch (e: any) {
      const message =
        typeof e?.message === 'string' ? e.message : 'Failed to load courses';
      set({ loading: false, error: message });
    }
  },
  ensureCourseAccess: async (courseId, user) => {
    const current = get().hasAccessMap[courseId];
    if (current === true) {
      return true;
    }
    if (!user) {
      set({
        hasAccessMap: {
          ...get().hasAccessMap,
          [courseId]: false,
        },
      });
      return false;
    }
    try {
      const { data, error } = await supabase
        .from('purchases')
        .select('id, status, expiry_date, subscription_status')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .eq('status', 'success')
        .limit(1);

      if (error) {
        throw new Error(error.message);
      }

      let hasAccess = false;
      if (data && data.length > 0) {
        const purchase = data[0];
        // Check expiry
        const isExpired = purchase.expiry_date && new Date(purchase.expiry_date) < new Date();
        const status = purchase.subscription_status;

        hasAccess = !isExpired && status !== 'expired';
      }

      set({
        hasAccessMap: {
          ...get().hasAccessMap,
          [courseId]: hasAccess,
        },
      });
      return hasAccess;
    } catch (e) {
      set({
        hasAccessMap: {
          ...get().hasAccessMap,
          [courseId]: false,
        },
      });
      return false;
    }
  },
  revokeCourseAccess: async (courseId, user) => {
    try {
      const { error } = await supabase
        .from('purchases')
        .delete()
        .eq('user_id', user.id)
        .eq('course_id', courseId);

      if (error) throw error;

      set({
        hasAccessMap: {
          ...get().hasAccessMap,
          [courseId]: false,
        },
        myCourses: get().myCourses.filter(c => c.id !== courseId)
      });

      return true;
    } catch (e) {
      console.error('Revoke failed', e);
      return false;
    }
  },
  loadProgress: async (courseId, userId) => {
    try {
      const { data, error } = await supabase
        .from('chapter_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('course_id', courseId);

      if (error) throw error;

      const completed: string[] = [];
      const chapterMap: Record<string, ChapterProgress> = {};

      data.forEach((item: any) => {
        if (item.is_completed) completed.push(item.chapter_id);
        chapterMap[item.chapter_id] = item;
      });

      set(state => ({
        progress: { ...state.progress, [courseId]: completed },
        chapterProgress: { ...state.chapterProgress, [courseId]: chapterMap }
      }));
    } catch (e) {
      console.error('Failed to load progress', e);
    }
  },
  markChapterCompleted: async (courseId, chapterId, userId) => {
    try {
      const { error } = await supabase
        .from('chapter_progress')
        .upsert({
          user_id: userId,
          course_id: courseId,
          chapter_id: chapterId,
          is_completed: true,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,chapter_id' });

      if (error) throw error;

      set(state => {
        const currentProgress = state.progress[courseId] || [];
        const updated = currentProgress.includes(chapterId) ? currentProgress : [...currentProgress, chapterId];

        const currentChapterProgress = state.chapterProgress[courseId] || {};
        const updatedChapterProgress = {
          ...currentChapterProgress,
          [chapterId]: {
            ...(currentChapterProgress[chapterId] || {
              chapter_id: chapterId,
              watch_time_seconds: 0,
              last_position_seconds: 0
            }),
            is_completed: true
          }
        };

        return {
          progress: { ...state.progress, [courseId]: updated },
          chapterProgress: { ...state.chapterProgress, [courseId]: updatedChapterProgress }
        };
      });
    } catch (e) {
      console.error('Failed to save progress', e);
    }
  },
  unmarkChapterCompleted: async (courseId, chapterId, userId) => {
    try {
      const { error } = await supabase
        .from('chapter_progress')
        .upsert({
          user_id: userId,
          course_id: courseId,
          chapter_id: chapterId,
          is_completed: false,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,chapter_id' });

      if (error) throw error;

      set(state => {
        const currentProgress = state.progress[courseId] || [];
        const updated = currentProgress.filter(id => id !== chapterId);

        const currentChapterProgress = state.chapterProgress[courseId] || {};
        const updatedChapterProgress = {
          ...currentChapterProgress,
          [chapterId]: {
            ...currentChapterProgress[chapterId],
            is_completed: false
          }
        };

        return {
          progress: { ...state.progress, [courseId]: updated },
          chapterProgress: { ...state.chapterProgress, [courseId]: updatedChapterProgress }
        };
      });
    } catch (e) {
      console.error('Failed to unmark progress', e);
    }
  },
  saveChapterProgress: async (courseId, chapterId, userId, progress) => {
    try {
      const { error } = await supabase
        .from('chapter_progress')
        .upsert({
          user_id: userId,
          course_id: courseId,
          chapter_id: chapterId,
          ...progress,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,chapter_id' });

      if (error) throw error;

      set(state => {
        const currentChapterProgress = state.chapterProgress[courseId] || {};
        const updatedChapterProgress = {
          ...currentChapterProgress,
          [chapterId]: {
            ...(currentChapterProgress[chapterId] || {
              chapter_id: chapterId,
              is_completed: false,
              watch_time_seconds: 0,
              last_position_seconds: 0
            }),
            ...progress
          }
        };

        return {
          chapterProgress: { ...state.chapterProgress, [courseId]: updatedChapterProgress }
        };
      });
    } catch (e) {
      // Silent fail for frequent updates
    }
  },
  getCourseProgress: (courseId) => {
    const state = get();
    // Find course in either list to get total chapters
    const course = state.courses.find(c => c.id === courseId) ||
      state.myCourses.find(c => c.id === courseId);

    if (!course || !course.chapters || course.chapters.length === 0) return 0;

    const completedCount = state.progress[courseId]?.length || 0;
    const total = course.chapters.length;

    return Math.round((completedCount / total) * 100);
  }
}));
