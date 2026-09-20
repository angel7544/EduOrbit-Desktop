import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, ChevronLeft, ChevronRight, Clock, User, BookOpen,
  Lock, Play, CheckCircle2, Flame, Award, Sparkles, TrendingUp
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useCourseStore } from '../store/courseStore';
import { formatDuration } from '../lib/utils';
import { useTheme } from '../hooks/useTheme';
import { LiveViewerBadge } from '../components/LiveCountdown';

interface CourseListItem {
  id: string;
  title: string;
  image: string;
  category: string;
  rating: number;
  duration: string;
  isCompleted: boolean;
  raw: any;
  percentage: number;
  completedCount: number;
  totalCount: number;
  expiryInfo: string;
  isExpired: boolean;
  subscriptionStatus?: string | null;
}

export default function MyCoursesScreen() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { myCourses, loadMyCourses, loading, progress, loadProgress } = useCourseStore();
  const { isDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState<'Ongoing' | 'Completed'>('Ongoing');
  const [searchQuery, setSearchQuery] = useState('');
  const [mappedCourses, setMappedCourses] = useState<CourseListItem[]>([]);

  useEffect(() => {
    if (user) {
      loadMyCourses(user);
    }
  }, [user, loadMyCourses]);

  useEffect(() => {
    if (user && myCourses.length > 0) {
      myCourses.forEach((course) => {
        loadProgress(course.id, user.id);
      });
    }
  }, [myCourses, user, loadProgress]);

  const parseSafeDate = (d: any): Date | null => {
    if (!d) return null;
    const parsed = new Date(d);
    return isNaN(parsed.getTime()) ? null : parsed;
  };

  const isChapterLive = (ch: any) => {
    if (!ch) return false;
    const status = String(ch.live_status || '').toUpperCase();
    if (status === 'LIVE') return true;
    if (status === 'ENDED' || status === 'RECORDED' || status === 'CONCLUDED' || status === 'SCHEDULED') return false;
    if (ch.is_live) {
      const endsAt = parseSafeDate(ch.live_ends_at);
      const startsAt = parseSafeDate(ch.live_starts_at);
      const now = new Date();
      if (endsAt && endsAt <= now) return false;
      if (startsAt && startsAt > now) return false;
      if (startsAt && startsAt <= now) return true;
      if (!startsAt) return true;
    }
    return false;
  };

  const handleDirectJoinLive = (ch: any, courseObj?: any) => {
    const rawCourse = courseObj || ch.courses || ch.course;
    const resolvedCourse = Array.isArray(rawCourse) ? rawCourse[0] : rawCourse;
    const courseData = resolvedCourse || { id: ch.course_id, title: 'Live Class Course' };
    navigate('/chapterplayer', {
      state: {
        courseId: ch.course_id || courseData.id,
        chapterId: ch.id,
        chapter: {
          ...ch,
          video_url: ch.video_url || ch.stream_url || ch.youtube_url || ch.live_stream_url
        },
        courseTitle: courseData.title || 'Live Class',
        hasAccess: true,
        autoPlay: true
      }
    });
  };

  const handlePlayCourse = (courseItem: CourseListItem | any) => {
    const rawCourse = courseItem?.raw || courseItem;
    if (!rawCourse) return;

    if (courseItem?.isExpired) {
      if (window.confirm('Your access to this course has expired. Would you like to renew it?')) {
        const renewalMessage = `I would like to renew my subscription for the course: "${courseItem.title}" (ID: ${courseItem.id}). Please assist me with the renewal process.`;
        navigate('/chatdetail', {
          state: {
            initialMessage: renewalMessage,
            autoSend: true,
            forceNewTicket: true
          }
        });
      }
      return;
    }

    const publishedChapters = (rawCourse.chapters || []).filter((ch: any) => ch.is_published !== false);
    const ongoingLive = publishedChapters.find((ch: any) => isChapterLive(ch));

    if (ongoingLive) {
      handleDirectJoinLive(ongoingLive, rawCourse);
      return;
    }

    const completedIds = (user?.id && progress[rawCourse.id]) || [];
    let targetChapter = publishedChapters[0];
    let targetLessonId: string | undefined = undefined;

    if (lastSession?.courseId === rawCourse.id && lastSession?.chapterId) {
      const found = publishedChapters.find((ch: any) => ch.id === lastSession.chapterId);
      if (found) {
        targetChapter = found;
        targetLessonId = lastSession.lessonId;
      }
    } else if (completedIds.length > 0) {
      const uncompleted = publishedChapters.find((ch: any) => !completedIds.includes(ch.id));
      if (uncompleted) targetChapter = uncompleted;
    }

    if (targetChapter) {
      navigate('/chapterplayer', {
        state: {
          courseId: rawCourse.id,
          chapterId: targetChapter.id,
          lessonId: targetLessonId,
          chapter: {
            ...targetChapter,
            video_url: targetChapter.video_url || (targetChapter as any).stream_url || (targetChapter as any).youtube_url || (targetChapter as any).live_stream_url
          },
          courseTitle: rawCourse.title,
          hasAccess: true,
          autoPlay: true
        }
      });
    } else {
      navigate('/coursedetails', { state: { course: rawCourse } });
    }
  };

  useEffect(() => {
    const list: CourseListItem[] = Array.isArray(myCourses)
      ? myCourses.map((course: any) => {
        const completedCount = progress[course.id]?.length || 0;
        const publishedChapters = (course.chapters || []).filter((ch: any) => ch.is_published !== false);
        const totalCount = publishedChapters.length;
        const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
        const isCompleted = percentage === 100;

        const totalSeconds = publishedChapters.reduce((sum: number, ch: any) => sum + (ch.duration || 0), 0);
        const duration = formatDuration(totalSeconds);

        let expiryInfo = '';
        let isExpired = false;

        const purchaseDate = course.enrollment?.created_at ? new Date(course.enrollment.created_at) : null;
        const validityDays = course.expiry_days;
        let expiryDate: Date | null = null;

        if (course.enrollment?.expiry_date) {
          expiryDate = new Date(course.enrollment.expiry_date);
        } else if (purchaseDate && validityDays) {
          expiryDate = new Date(purchaseDate);
          expiryDate.setDate(expiryDate.getDate() + validityDays);
        }

        if (expiryDate) {
          const now = new Date();
          const diffTime = expiryDate.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays < 0) {
            expiryInfo = 'Expired';
            isExpired = true;
          } else {
            expiryInfo = `${diffDays} days left`;
          }
        } else {
          expiryInfo = 'Lifetime Access';
        }

        return {
          id: course.id,
          title: course.title,
          image: course.thumbnail_url || 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=1200&q=80',
          category: course.video_subject || 'General',
          rating: 4.9,
          duration,
          isCompleted,
          percentage,
          completedCount,
          totalCount,
          raw: course,
          expiryInfo,
          isExpired,
          subscriptionStatus: course.enrollment?.subscription_status
        };
      })
      : [];

    const rawSession = localStorage.getItem('eduorbit_last_accessed_session');
    let lastSessionData: any = null;
    try {
      lastSessionData = rawSession ? JSON.parse(rawSession) : null;
    } catch {
      lastSessionData = null;
    }

    if (lastSessionData?.courseId) {
      const idx = list.findIndex(c => c.id === lastSessionData.courseId);
      if (idx > 0) {
        const [matched] = list.splice(idx, 1);
        list.unshift(matched);
      }
    }

    setMappedCourses(list);
  }, [myCourses, progress]);

  const lastSession = useMemo(() => {
    try {
      const raw = localStorage.getItem('eduorbit_last_accessed_session');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const ongoingCourses = mappedCourses.filter(c => !c.isCompleted);
  const completedCourses = mappedCourses.filter(c => c.isCompleted);

  const filteredCourses = mappedCourses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeTab === 'Completed') return course.isCompleted && matchesSearch;
    return !course.isCompleted && matchesSearch;
  });

  // Recent/Active course for prominent highlight (similar to Dashboard)
  const recentOngoingCourse = ongoingCourses[0] || mappedCourses[0];
  const recentChapters = recentOngoingCourse?.raw?.chapters?.filter((ch: any) => ch.is_published !== false) || [];
  const recentLiveChapter = recentChapters.find((ch: any) => isChapterLive(ch));
  const lastWatchedChapter = recentOngoingCourse
    ? (recentChapters.find((ch: any) => ch.id === lastSession?.chapterId) || recentChapters[0])
    : null;

  if (!user) {
    return (
      <div className={`flex flex-col min-h-screen ${isDarkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
        <div className="flex-1 flex justify-center items-center pt-24">
          <span className="text-base font-medium text-gray-500">Sign in to see your courses.</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col min-h-screen ${isDarkMode ? 'bg-[#0f172a] text-gray-100' : 'bg-[#f8fafc] text-gray-900'}`}>
      
      {/* ── Top Header Section ── */}
      <div className={`px-8 pt-6 pb-5 border-b ${isDarkMode ? 'bg-[#0f172a] border-gray-800' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-transparent border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors"
            >
              <ChevronLeft size={20} className={isDarkMode ? 'text-gray-200' : 'text-gray-700'} />
            </button>
            <div>
              <h1 className={`text-2xl font-black tracking-tight m-0 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                My Learning
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 m-0 mt-0.5">
                Pick up where you left off and keep track of your learning achievements
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/50">
              <BookOpen size={15} className="text-indigo-600 dark:text-indigo-400" />
              <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                {mappedCourses.length} Enrolled
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50">
              <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                {completedCourses.length} Completed
              </span>
            </div>
          </div>
        </div>

        {/* Search & Tabs Controls */}
        <div className="flex flex-col md:flex-row items-center gap-4 mt-4">
          <div className={`flex-1 w-full flex items-center px-3.5 py-2.5 rounded-xl border transition-all ${isDarkMode ? 'bg-gray-800/80 border-gray-700' : 'bg-gray-100/90 border-gray-200'}`}>
            <Search size={17} className="text-gray-400" />
            <input
              className={`flex-1 ml-2 text-sm bg-transparent border-none outline-none ${isDarkMode ? 'text-gray-100 placeholder:text-gray-500' : 'text-gray-900 placeholder:text-gray-400'}`}
              placeholder="Search your courses by title or topic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <button
              className={`px-5 py-2.5 rounded-xl text-xs font-bold border-none cursor-pointer transition-all ${activeTab === 'Ongoing' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : (isDarkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300')}`}
              onClick={() => setActiveTab('Ongoing')}
            >
              Ongoing ({ongoingCourses.length})
            </button>
            <button
              className={`px-5 py-2.5 rounded-xl text-xs font-bold border-none cursor-pointer transition-all ${activeTab === 'Completed' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : (isDarkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300')}`}
              onClick={() => setActiveTab('Completed')}
            >
              Completed ({completedCourses.length})
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Content Area ── */}
      <div className="p-8 max-w-7xl w-full mx-auto">
        {loading ? (
          <div className="flex justify-center items-center py-32">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent"></div>
          </div>
        ) : (
          <>
            {/* ── Featured Highlight: Recently Accessed Course (Similar to Dashboard) ── */}
            {!searchQuery && recentOngoingCourse && activeTab === 'Ongoing' && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                      <Sparkles size={14} className="text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <h2 className="text-base font-extrabold m-0 text-gray-900 dark:text-gray-100">
                      Recently Accessed
                    </h2>
                  </div>
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    Jump back into your progress
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  {/* Primary Hero Highlight Card */}
                  <div
                    onClick={() => navigate('/coursedetails', { state: { course: recentOngoingCourse.raw } })}
                    className={`lg:col-span-2 rounded-2xl overflow-hidden border cursor-pointer transition-all hover:scale-[1.01] hover:shadow-xl flex flex-col md:flex-row ${
                      isDarkMode ? 'bg-gray-800/90 border-gray-700' : 'bg-white border-gray-200 shadow-md'
                    }`}
                  >
                    {/* Thumbnail Section */}
                    <div className="md:w-5/12 relative aspect-[16/10] md:aspect-auto overflow-hidden group">
                      <img
                        src={recentOngoingCourse.image}
                        alt={recentOngoingCourse.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />

                      {/* Live Badge */}
                      {recentLiveChapter ? (
                        <div className="absolute top-3 left-3 z-10">
                          <LiveViewerBadge size="sm" isDarkMode={isDarkMode} />
                        </div>
                      ) : (
                        <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-sm text-white px-2.5 py-1 rounded-md text-[10px] font-bold">
                          {recentOngoingCourse.category.toUpperCase()}
                        </div>
                      )}

                      {/* Play Action Badge */}
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayCourse(recentOngoingCourse);
                        }}
                        className="absolute inset-0 flex items-center justify-center cursor-pointer"
                      >
                        <div className="w-12 h-12 rounded-full bg-white/90 dark:bg-gray-900/90 flex items-center justify-center shadow-lg transition-transform group-hover:scale-110">
                          <Play size={20} className={recentLiveChapter ? 'text-red-600 fill-red-600 ml-0.5' : 'text-indigo-600 fill-indigo-600 ml-0.5'} />
                        </div>
                      </div>

                      {/* Expiry Pill */}
                      <div className="absolute bottom-3 left-3 bg-black/75 backdrop-blur-sm text-white px-2 py-0.5 rounded-md text-[9px] font-semibold flex items-center gap-1">
                        <Clock size={10} />
                        {recentOngoingCourse.expiryInfo}
                      </div>
                    </div>

                    {/* Content Section */}
                    <div className="md:w-7/12 p-6 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                            Current Course
                          </span>
                          <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
                            {recentOngoingCourse.percentage}% Complete
                          </span>
                        </div>

                        <h3 className="text-lg font-black leading-snug line-clamp-1 m-0 mb-1.5 text-gray-900 dark:text-white">
                          {recentOngoingCourse.title}
                        </h3>

                        {lastWatchedChapter && (
                          <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 m-0 mb-3 flex items-center gap-1.5 truncate">
                            <Play size={11} fill="currentColor" />
                            Resuming: {lastWatchedChapter.title}
                          </p>
                        )}

                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-4">
                          <span className="flex items-center gap-1.5">
                            <BookOpen size={14} />
                            {recentOngoingCourse.completedCount} of {recentOngoingCourse.totalCount} lessons
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1.5">
                            <Clock size={14} />
                            {recentOngoingCourse.duration}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-5">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-700"
                            style={{ width: `${recentOngoingCourse.percentage}%` }}
                          />
                        </div>
                      </div>

                      {/* Action Button */}
                      {recentLiveChapter ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDirectJoinLive(recentLiveChapter, recentOngoingCourse.raw);
                          }}
                          className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs tracking-wider uppercase border-none cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 transition-all"
                        >
                          <Play size={14} fill="#fff" /> Join Live Class Now
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlayCourse(recentOngoingCourse);
                          }}
                          className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold text-xs border-none cursor-pointer flex items-center justify-center gap-2 shadow-md transition-all"
                        >
                          Resume Learning <Play size={13} fill="#fff" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Side Next Recent Courses Mini Stack */}
                  <div className="flex flex-col gap-3">
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                      Next in Queue
                    </span>
                    {ongoingCourses.slice(1, 4).map(course => (
                      <div
                        key={course.id}
                        onClick={() => navigate('/coursedetails', { state: { course: course.raw } })}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all hover:scale-[1.01] hover:shadow-md flex items-center gap-3 ${
                          isDarkMode ? 'bg-gray-800/80 border-gray-700' : 'bg-white border-gray-200'
                        }`}
                      >
                        <img
                          src={course.image}
                          alt={course.title}
                          className="w-14 h-11 object-cover rounded-lg flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold line-clamp-1 m-0 mb-1 text-gray-900 dark:text-gray-100">
                            {course.title}
                          </h4>
                          <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400 mb-1.5">
                            <span>{course.completedCount}/{course.totalCount} Lessons</span>
                            <span className="font-bold text-indigo-600 dark:text-indigo-400">{course.percentage}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-600 rounded-full"
                              style={{ width: `${course.percentage}%` }}
                            />
                          </div>
                        </div>

                        {/* Direct Play Button on Mini Card */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlayCourse(course);
                          }}
                          title="Watch in Video Player"
                          className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border-none cursor-pointer flex-shrink-0 transition-colors"
                        >
                          <Play size={12} fill="currentColor" />
                        </button>
                      </div>
                    ))}

                    {ongoingCourses.length <= 1 && (
                      <div className={`p-6 rounded-xl border flex flex-col items-center justify-center text-center gap-2 ${
                        isDarkMode ? 'bg-gray-800/40 border-gray-800' : 'bg-white border-gray-200'
                      }`}>
                        <TrendingUp size={24} className="text-indigo-500 opacity-60" />
                        <p className="text-xs text-gray-500 dark:text-gray-400 m-0">
                          Great progress! Ready for more?
                        </p>
                        <button
                          onClick={() => navigate('/courses')}
                          className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-transparent border-none cursor-pointer mt-1"
                        >
                          Explore New Courses →
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── All Courses Grid ── */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-extrabold m-0 text-gray-900 dark:text-gray-100">
                  {searchQuery ? `Search Results (${filteredCourses.length})` : `${activeTab} Courses (${filteredCourses.length})`}
                </h2>
              </div>

              {filteredCourses.length === 0 ? (
                <div className={`rounded-2xl border p-12 text-center flex flex-col items-center justify-center ${
                  isDarkMode ? 'bg-gray-800/40 border-gray-800 text-gray-400' : 'bg-white border-gray-200 text-gray-500'
                }`}>
                  <BookOpen size={36} className="mb-3 opacity-40" />
                  <p className="text-sm font-semibold m-0">
                    {activeTab === 'Completed' ? 'No completed courses found.' : 'No ongoing courses found.'}
                  </p>
                  <button
                    onClick={() => navigate('/courses')}
                    className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl border-none cursor-pointer transition-colors"
                  >
                    Browse Course Catalog
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6">
                  {filteredCourses.map((item) => {
                    const allChapters = item.raw?.chapters || [];
                    const ongoingLiveChapter = allChapters.find((ch: any) => isChapterLive(ch));

                    return (
                      <div
                        key={item.id}
                        className={`group flex flex-col rounded-2xl overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300 border ${
                          isDarkMode
                            ? 'bg-gray-800/90 border-gray-700/80 hover:border-gray-600'
                            : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm'
                        } ${item.isExpired ? 'opacity-70 hover:opacity-100' : ''}`}
                        onClick={() => {
                          if (item.isExpired) {
                            if (window.confirm('Your access to this course has expired. Would you like to renew it?')) {
                              const renewalMessage = `I would like to renew my subscription for the course: "${item.title}" (ID: ${item.id}). Please assist me with the renewal process.`;
                              navigate('/chatdetail', {
                                state: {
                                  initialMessage: renewalMessage,
                                  autoSend: true,
                                  forceNewTicket: true
                                }
                              });
                            }
                            return;
                          }
                          navigate('/coursedetails', {
                            state: {
                              course: item.raw
                            }
                          });
                        }}
                      >
                        {/* Thumbnail */}
                        <div className="relative overflow-hidden aspect-[16/9] w-full group">
                          <img
                            src={item.image}
                            alt={item.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

                          {/* Category / Expired tag */}
                          <div className={`absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md text-[10px] font-bold text-white ${item.isExpired ? 'bg-red-500' : 'bg-black/75 backdrop-blur-sm'}`}>
                            {item.isExpired ? 'EXPIRED' : item.category.toUpperCase()}
                          </div>

                          {/* Live / Expiry Info */}
                          {ongoingLiveChapter ? (
                            <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[9px] font-black tracking-wider uppercase shadow animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                              LIVE
                            </div>
                          ) : (
                            <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-sm text-white text-[9px] font-semibold flex items-center gap-1">
                              <Clock size={10} />
                              {item.expiryInfo}
                            </div>
                          )}

                          {item.isExpired && (
                            <div className="absolute inset-0 bg-black/60 flex flex-col justify-center items-center z-20">
                              <Lock size={28} color="#fff" />
                              <span className="text-white text-sm font-bold mt-1 tracking-wider">EXPIRED</span>
                            </div>
                          )}

                          {/* Action Button over thumbnail */}
                          <div className="absolute bottom-2.5 right-2.5 z-10">
                            {ongoingLiveChapter && !item.isExpired ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDirectJoinLive(ongoingLiveChapter, item.raw);
                                }}
                                className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-md border border-white/20 transition-all cursor-pointer"
                              >
                                <Play size={10} fill="#fff" /> Join Live
                              </button>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePlayCourse(item);
                                }}
                                className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-md border border-white/20 text-white transition-all cursor-pointer hover:opacity-95 ${
                                  item.isExpired ? 'bg-red-600' : (item.isCompleted ? 'bg-emerald-600' : 'bg-indigo-600')
                                }`}
                              >
                                <Play size={9} fill="#fff" />
                                {item.isExpired ? 'Renew' : (item.isCompleted ? 'Rewatch' : 'Resume')}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Card Info */}
                        <div className="p-4 flex-1 flex flex-col justify-between">
                          <div>
                            <h4 className={`text-xs font-bold leading-snug line-clamp-2 m-0 mb-2.5 transition-colors ${isDarkMode ? 'text-gray-100 group-hover:text-indigo-400' : 'text-gray-900 group-hover:text-indigo-600'}`}>
                              {item.title}
                            </h4>

                            <div className="flex items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400 mb-3">
                              <span className="flex items-center gap-1">
                                <BookOpen size={12} />
                                {item.duration} • {item.totalCount} Lessons
                              </span>
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div>
                            <div className="flex items-center justify-between text-[11px] font-bold mb-1.5">
                              <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                                {item.percentage}% Complete
                              </span>
                              <span className="text-gray-400">
                                {item.completedCount}/{item.totalCount}
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  item.isExpired ? 'bg-gray-500' : (item.isCompleted ? 'bg-emerald-500' : 'bg-indigo-600')
                                }`}
                                style={{ width: `${item.percentage}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
