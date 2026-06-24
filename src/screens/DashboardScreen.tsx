import { useNavigate } from 'react-router-dom';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Search, BookOpen, Star, Calculator, FlaskConical, Layers,
  Bell, Flame, Award, Clock, TrendingUp, Play, CheckCircle2,
  GraduationCap, X, ChevronLeft, ChevronRight, Users, Zap, Video
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useCourseStore } from '../store/courseStore';
import { currencyFormater, stripMarkdown } from '../lib/utils';
import { useTheme } from '../hooks/useTheme';
import { useNotificationStore } from '../store/notificationStore';
import { supabase } from '../lib/supabase';
import { AppLoader } from '../components/AppLoader';
import { Avatar } from '../components/Avatar';
import { formatWatchTime } from '../lib/format';

export default function DashboardScreen() {
  const { user } = useAuthStore();
  const { isDarkMode } = useTheme();
  const { courses, loadPublishedCourses, myCourses, loadMyCourses, progress, loadProgress } = useCourseStore();
  const { unreadCount, fetchUnreadCount, subscribeToUnreadCount } = useNotificationStore();

  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [liveChapters, setLiveChapters] = useState<any[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [streakCount, setStreakCount] = useState(1);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Filter featured courses that the user hasn't purchased yet
  const unpurchasedFeaturedCourses = useMemo(() => {
    return courses.filter(c => c.is_featured && !myCourses.some(mc => mc.id === c.id));
  }, [courses, myCourses]);

  // Auto slide the carousel
  useEffect(() => {
    if (unpurchasedFeaturedCourses.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % unpurchasedFeaturedCourses.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [unpurchasedFeaturedCourses.length]);

  // Handle slide index bounds validation
  useEffect(() => {
    if (currentSlide >= unpurchasedFeaturedCourses.length && unpurchasedFeaturedCourses.length > 0) {
      setCurrentSlide(0);
    }
  }, [unpurchasedFeaturedCourses.length, currentSlide]);

  useEffect(() => {
    if (user && myCourses.length > 0) {
      myCourses.forEach(course => { if (loadProgress) loadProgress(course.id, user.id); });
    }
  }, [myCourses, user, loadProgress]);

  useEffect(() => {
    if (user) {
      const enrolledIds = new Set(myCourses.map(c => c.id));
      fetchUnreadCount(user.id, enrolledIds);
    }
  }, [user, myCourses, fetchUnreadCount]);

  useEffect(() => {
    if (user) {
      const enrolledIds = new Set(myCourses.map(c => c.id));
      const unsubscribe = subscribeToUnreadCount(user.id, enrolledIds);
      return () => { unsubscribe(); };
    }
  }, [user, myCourses, subscribeToUnreadCount]);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(4);
      if (data) setNotifications(data);
    } catch (e) { console.error('Notifications fetch error:', e); }
  };

  const fetchLiveChapters = async () => {
    try {
      const { data } = await supabase
        .from('chapters')
        .select('*, courses(id, title, thumbnail_url)')
        .eq('is_live', true)
        .eq('is_published', true)
        .order('live_starts_at', { ascending: true });
      const now = new Date();
      setLiveChapters((data || []).filter((ch: any) => ch.live_ends_at ? new Date(ch.live_ends_at) > now : true));
    } catch (e) { console.error('Error fetching live chapters:', e); }
  };

  const checkAndUpdateStreak = async () => {
    if (!user) return;
    try {
      const streakKey = `user_streak_${user.id}`;
      const storedStreak = localStorage.getItem(streakKey);
      const today = new Date().toISOString().split('T')[0];
      const yesterdayDate = new Date(); yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterday = yesterdayDate.toISOString().split('T')[0];
      if (storedStreak) {
        const { count, lastDate } = JSON.parse(storedStreak);
        if (lastDate === today) { setStreakCount(count); return; }
        if (lastDate === yesterday) {
          const newCount = count + 1;
          setStreakCount(newCount);
          localStorage.setItem(streakKey, JSON.stringify({ count: newCount, lastDate: today }));
        } else {
          setStreakCount(1);
          localStorage.setItem(streakKey, JSON.stringify({ count: 1, lastDate: today }));
        }
      } else {
        setStreakCount(1);
        localStorage.setItem(streakKey, JSON.stringify({ count: 1, lastDate: today }));
      }
    } catch (e) { console.error('Error updating streak:', e); }
  };

  const fetchDashboardStats = async () => {
    if (!user) return;
    try {
      const { data: stats } = await supabase.rpc('get_student_analytics', { student_id: user.id });
      const { data: recentData } = await supabase
        .from('chapter_progress')
        .select('updated_at, is_completed, courses(title), chapters(title)')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(3);
      setAnalyticsData({
        ...stats,
        recent_activity: recentData?.map((item: any) => ({
          updated_at: item.updated_at,
          is_completed: item.is_completed,
          course_title: item.courses?.title || 'Unknown Course',
          chapter_title: item.chapters?.title || 'Unknown Chapter'
        }))
      });
    } catch (e) { console.error('Error fetching dashboard stats:', e); }
  };

  const loadData = useCallback(async () => {
    if (user) {
      await Promise.all([
        loadMyCourses(user), loadPublishedCourses(), fetchLiveChapters(),
        fetchDashboardStats(), checkAndUpdateStreak(), fetchNotifications()
      ]);
    } else {
      await Promise.all([loadPublishedCourses(), fetchLiveChapters()]);
    }
  }, [user, loadMyCourses, loadPublishedCourses]);

  const initDashboard = useCallback(async () => {
    setLoadingError(null);
    setIsInitialLoading(true);
    try {
      const minTimePromise = new Promise(resolve => setTimeout(resolve, 1000));
      await Promise.all([loadData(), minTimePromise]);
      const currentError = useCourseStore.getState().error;
      if (currentError) setLoadingError(currentError);
      else setIsInitialLoading(false);
    } catch (e) {
      setLoadingError('Failed to load dashboard data. Please check your internet connection.');
    }
  }, [loadData]);

  useEffect(() => { initDashboard(); }, [initDashboard]);

  useEffect(() => {
    const channel = supabase.channel('public:chapters')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chapters', filter: 'is_live=eq.true' }, fetchLiveChapters)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  if (isInitialLoading || loadingError) {
    return <AppLoader isLoading={isInitialLoading} error={loadingError} onRetry={initDashboard} />;
  }

  // Search mode — simple full-width results
  if (searchQuery.length > 0) {
    const results = courses.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()));
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        {/* Search Header */}
        <div className={`sticky top-0 z-50 px-6 py-3 flex items-center gap-3 shadow-sm ${isDarkMode ? 'bg-gray-900 border-b border-gray-800' : 'bg-white border-b border-gray-200'}`}>
          <div className={`flex flex-1 items-center px-4 h-11 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <Search size={18} className="text-gray-400 mr-2" />
            <input
              autoFocus
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search courses..."
              className="flex-1 bg-transparent border-none outline-none text-text text-sm"
            />
          </div>
          <button onClick={() => setSearchQuery('')} className="text-sm font-semibold text-primary bg-transparent border-none cursor-pointer">Cancel</button>
        </div>
        <div className="px-8 py-6">
          <h3 className="text-base font-bold text-text mb-4">Search Results ({results.length})</h3>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-5">
            {results.map(course => (
              <CourseCard key={course.id} course={course} myCourses={myCourses} navigate={navigate} currencyFormater={currencyFormater} />
            ))}
          </div>
          {results.length === 0 && (
            <div className="text-center py-16">
              <BookOpen size={40} className="text-gray-300 mx-auto mb-3" />
              <p className="text-textLight">No courses found for "{searchQuery}"</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Theme tokens ────────────────────────────────────────────
  const bg = isDarkMode ? '#0f172a' : '#f1f5f9';
  const cardBg = isDarkMode ? '#1e293b' : '#ffffff';
  const border = isDarkMode ? '#334155' : '#e2e8f0';
  const textPrimary = isDarkMode ? '#f1f5f9' : '#0f172a';
  const textMuted = isDarkMode ? '#94a3b8' : '#64748b';

  // Stats
  const watchTimeDisplay = analyticsData ? formatWatchTime(analyticsData.total_watch_time) : '0h';
  const certCount = analyticsData?.course_progress?.filter((c: any) => c.has_certificate).length || 0;
  const enrolledCount = myCourses.length;
  const completedCourses = analyticsData?.course_progress?.filter((c: any) => c.completion_percentage === 100).length || 0;

  const stats = [
    { label: 'Enrolled Courses', value: enrolledCount, icon: BookOpen, color: '#6366f1', bg: 'rgba(99,102,241,0.1)', sub: `+${Math.min(enrolledCount, 2)} this month` },
    { label: 'Completed', value: completedCourses, icon: CheckCircle2, color: '#10b981', bg: 'rgba(16,185,129,0.1)', sub: '+1 this month' },
    { label: 'Certificates', value: certCount, icon: Award, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', sub: 'View all' },
    { label: 'Learning Hours', value: watchTimeDisplay, icon: Clock, color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', sub: '+6h this week' },
  ];

  const categories = [
    { id: '1', name: 'Urdu', icon: BookOpen, color: '#3b82f6', count: courses.filter(c => c.video_subject?.toLowerCase() === 'urdu').length || 0 },
    { id: '2', name: 'Math', icon: Calculator, color: '#14b8a6', count: courses.filter(c => c.video_subject?.toLowerCase() === 'math').length || 0 },
    { id: '3', name: 'Science', icon: FlaskConical, color: '#ef4444', count: courses.filter(c => c.video_subject?.toLowerCase() === 'science').length || 0 },
    { id: '4', name: 'Premium', icon: Star, color: '#f97316', count: courses.filter(c => c.price && c.price > 0).length || 0 },
    { id: '5', name: 'Design', icon: Layers, color: '#a855f7', count: courses.filter(c => c.video_subject?.toLowerCase() === 'design').length || 0 },
    { id: '6', name: 'Video', icon: Video, color: '#06b6d4', count: 0 },
  ];

  // Continue learning — most recent enrolled courses
  const continueLearning = myCourses.slice(0, 4);
  const activeCourse = continueLearning[0];
  const activeProgress = activeCourse
    ? (activeCourse.chapters?.length ? Math.round(((progress?.[activeCourse.id]?.length || 0) / activeCourse.chapters.length) * 100) : 0)
    : 0;

  // Calculate combined course progress
  const totalChapters = myCourses.reduce((sum, c) => sum + (c.chapters?.length || 0), 0);
  const completedChapters = myCourses.reduce((sum, c) => sum + (progress[c.id]?.length || 0), 0);
  const combinedProgress = totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;

  return (
    <div style={{ minHeight: '100vh', background: bg }}>

      {/* ── Top Search/Header Bar ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: isDarkMode ? '#0f172a' : '#ffffff',
        borderBottom: `1px solid ${border}`,
        padding: '12px 24px',
        display: 'flex', alignItems: 'center', gap: 12,
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      }}>
        {/* Logo */}
        <img src="/logo.png" alt="EduOrbit" style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 8, flexShrink: 0 }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        <span style={{ fontSize: 16, fontWeight: 800, color: textPrimary, letterSpacing: '-0.3px', flexShrink: 0 }}>EduOrbit</span>

        {/* Search bar */}
        <button
          onClick={() => setIsSearchExpanded(true)}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: 10,
            background: isDarkMode ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
            border: `1px solid ${border}`, borderRadius: 10,
            padding: '9px 14px', cursor: 'pointer',
            maxWidth: 500,
          }}
        >
          <Search size={15} color={textMuted} />
          <span style={{ fontSize: 13, color: textMuted }}>Search courses, resources, students...</span>
          <span style={{
            marginLeft: 'auto', fontSize: 11, color: textMuted,
            background: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            padding: '2px 6px', borderRadius: 4, fontFamily: 'monospace',
          }}>⌘ K</span>
        </button>

        {/* Right icons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: 'rgba(249,115,22,0.1)', padding: '5px 10px', borderRadius: 20,
            border: '1px solid rgba(249,115,22,0.2)',
          }}>
            <Flame size={14} color="#f97316" />
            <span style={{ fontSize: 12, fontWeight: 800, color: '#f97316' }}>{streakCount}</span>
          </div>
          <button
            onClick={() => navigate('/notifications')}
            style={{ position: 'relative', width: 36, height: 36, borderRadius: 10, border: 'none', cursor: 'pointer', background: isDarkMode ? 'rgba(255,255,255,0.06)' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Bell size={18} color={textMuted} />
            {unreadCount > 0 && (
              <div style={{
                position: 'absolute',
                top: -4,
                right: -4,
                minWidth: 16,
                height: 16,
                borderRadius: 8,
                backgroundColor: '#ef4444',
                border: `2px solid ${isDarkMode ? '#0f172a' : '#ffffff'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 3px',
                zIndex: 10
              }}>
                <span style={{
                  color: 'white',
                  fontSize: 9,
                  fontWeight: 'bold',
                  lineHeight: 1
                }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              </div>
            )}
          </button>
          <button onClick={() => navigate('/profile')} style={{ border: 'none', cursor: 'pointer', background: 'transparent', padding: 0 }}>
            <Avatar uri={user?.profileImage} name={user?.name} size={36} />
          </button>
        </div>
      </div>

      {/* ── Full-screen Search Overlay ── */}
      {isSearchExpanded && (
        <div style={{ position: 'fixed', inset: 0, background: isDarkMode ? 'rgba(15,23,42,0.98)' : 'rgba(255,255,255,0.98)', zIndex: 100, padding: 24, backdropFilter: 'blur(8px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, maxWidth: 600, margin: '0 auto' }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, background: isDarkMode ? '#1e293b' : '#f1f5f9', border: `1px solid ${border}`, borderRadius: 12, padding: '10px 16px' }}>
              <Search size={18} color={textMuted} />
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search courses..."
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 15, color: textPrimary }}
              />
            </div>
            <button onClick={() => { setIsSearchExpanded(false); setSearchQuery(''); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#6366f1' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── Main Two-Column Layout ── */}
      <div style={{ display: 'flex', gap: 0, maxWidth: 1440, margin: '0 auto' }}>

        {/* ═══ LEFT COLUMN ═══ */}
        <div style={{ flex: 1, minWidth: 0, padding: '28px 28px 40px' }}>

          {/* Welcome */}
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: textPrimary, margin: 0, letterSpacing: '-0.4px' }}>
              {getGreeting()}, {user?.name?.split(' ')[0] || 'Learner'} 👋
            </h2>
            <p style={{ fontSize: 14, color: textMuted, margin: '4px 0 0' }}>
              Let's continue your learning journey today.
            </p>
          </div>

          {/* ── Stats Cards ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
            {stats.map((stat, i) => (
              <div key={i} style={{
                background: cardBg, border: `1px solid ${border}`,
                borderRadius: 16, padding: '16px 18px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 20px rgba(0,0,0,0.08)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <stat.icon size={18} color={stat.color} />
                  </div>
                  <span style={{ fontSize: 11, color: textMuted, fontWeight: 500 }}>{stat.label}</span>
                </div>
                <p style={{ fontSize: 24, fontWeight: 800, color: textPrimary, margin: '0 0 4px' }}>{stat.value}</p>
                <p style={{ fontSize: 11, color: stat.color, fontWeight: 600, margin: 0 }}>{stat.sub}</p>
              </div>
            ))}
          </div>

          {/* ── Continue Learning ── */}
          {continueLearning.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: textPrimary, margin: 0 }}>Continue Learning</h3>
                <button onClick={() => navigate('/mycourses')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#6366f1', display: 'flex', alignItems: 'center', gap: 4 }}>
                  View All <ChevronRight size={14} />
                </button>
              </div>

              <div style={{ display: 'flex', gap: 16 }}>
                {/* Big active course card */}
                {activeCourse && (
                  <div
                    onClick={() => navigate('/coursedetails', { state: { course: activeCourse } })}
                    style={{
                      width: 260, flexShrink: 0, borderRadius: 20, overflow: 'hidden',
                      background: cardBg, border: `1px solid ${border}`,
                      cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                      transition: 'transform 0.2s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.02)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)'; }}
                  >
                    <div style={{ position: 'relative', height: 160 }}>
                      <img src={activeCourse.thumbnail_url || 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=600&q=80'} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)' }} />
                      <div style={{
                        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
                        width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.9)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                      }}>
                        <Play size={18} color="#6366f1" fill="#6366f1" />
                      </div>
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '8px 12px' }}>
                        <div style={{ height: 3, background: 'rgba(255,255,255,0.3)', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${activeProgress}%`, background: '#6366f1', borderRadius: 99 }} />
                        </div>
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)', marginTop: 3, display: 'block' }}>{activeProgress}% complete</span>
                      </div>
                    </div>
                    <div style={{ padding: '14px 14px 16px' }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: textPrimary, margin: '0 0 4px', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {activeCourse.title}
                      </p>
                      <p style={{ fontSize: 11, color: textMuted, margin: '0 0 12px' }}>
                        {activeCourse.teacher?.name || activeCourse.instructor_name || 'Instructor'}
                      </p>
                      <button
                        onClick={e => { e.stopPropagation(); navigate('/coursedetails', { state: { course: activeCourse } }); }}
                        style={{
                          width: '100%', padding: '9px', borderRadius: 10, border: 'none', cursor: 'pointer',
                          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                          color: '#fff', fontSize: 12, fontWeight: 700,
                        }}>
                        Continue
                      </button>
                    </div>
                  </div>
                )}

                {/* Remaining courses list */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {continueLearning.slice(1, 4).map(course => {
                    const pct = course.chapters?.length
                      ? Math.round(((progress?.[course.id]?.length || 0) / course.chapters.length) * 100)
                      : 0;
                    return (
                      <div
                        key={course.id}
                        onClick={() => navigate('/coursedetails', { state: { course } })}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          background: cardBg, border: `1px solid ${border}`,
                          borderRadius: 14, padding: '10px 14px',
                          cursor: 'pointer', transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = isDarkMode ? '#273549' : '#f8f9fc'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = cardBg; }}
                      >
                        <img src={course.thumbnail_url || 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=200&q=80'} alt="" style={{ width: 52, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: textPrimary, margin: '0 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{course.title}</p>
                          <p style={{ fontSize: 11, color: textMuted, margin: '0 0 6px' }}>{pct === 0 ? 'Not started' : `${pct}% complete`}</p>
                          <div style={{ height: 4, background: isDarkMode ? '#334155' : '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', borderRadius: 99 }} />
                          </div>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#6366f1', flexShrink: 0 }}>{pct}%</span>
                      </div>
                    );
                  })}

                  {continueLearning.length === 0 && (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8, background: cardBg, borderRadius: 14, border: `1px solid ${border}`, padding: 24 }}>
                      <GraduationCap size={32} color={textMuted} />
                      <p style={{ fontSize: 13, color: textMuted, margin: 0, textAlign: 'center' }}>No enrolled courses yet.<br />Explore and enroll below!</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Combined Progress ── */}
          {myCourses.length > 0 && (
            <div style={{
              background: `linear-gradient(135deg, ${isDarkMode ? '#1e1b4b' : '#e0e7ff'}, ${isDarkMode ? '#0f172a' : '#ffffff'})`,
              border: `1px solid ${isDarkMode ? '#312e81' : '#c7d2fe'}`,
              borderRadius: 20,
              padding: '20px 24px',
              marginBottom: 28,
              boxShadow: '0 4px 20px rgba(99, 102, 241, 0.08)',
              display: 'flex',
              alignItems: 'center',
              gap: 20
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14,
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
                flexShrink: 0
              }}>
                <TrendingUp size={22} color="#fff" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <h4 style={{ fontSize: 15, fontWeight: 800, color: textPrimary, margin: 0 }}>Overall Learning Progress</h4>
                  <span style={{ fontSize: 16, fontWeight: 900, color: '#6366f1' }}>{combinedProgress}%</span>
                </div>
                <p style={{ fontSize: 12, color: textMuted, margin: '0 0 12px' }}>
                  You have completed <strong>{completedChapters}</strong> out of <strong>{totalChapters}</strong> chapters across all your <strong>{myCourses.length}</strong> enrolled courses.
                </p>
                <div style={{ height: 8, background: isDarkMode ? '#1e293b' : '#e2e8f0', borderRadius: 99, overflow: 'hidden', position: 'relative' }}>
                  <div style={{
                    height: '100%',
                    width: `${combinedProgress}%`,
                    background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                    borderRadius: 99,
                    transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                  }} />
                </div>
              </div>
            </div>
          )}

          {/* ── Course Categories ── */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: textPrimary, margin: 0 }}>Course Categories</h3>
              <button onClick={() => navigate('/courses')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#6366f1', display: 'flex', alignItems: 'center', gap: 4 }}>
                View All <ChevronRight size={14} />
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => navigate('/courses', { state: { subjectFilter: cat.name } })}
                  style={{
                    background: cardBg, border: `1px solid ${border}`,
                    borderRadius: 14, padding: '14px 16px',
                    display: 'flex', alignItems: 'center', gap: 10,
                    cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = cat.color; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = border; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; }}
                >
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: `${cat.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <cat.icon size={18} color={cat.color} />
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: textPrimary, margin: 0 }}>{cat.name}</p>
                    <p style={{ fontSize: 11, color: textMuted, margin: 0 }}>{cat.count} Courses</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* ── Featured Courses (full width in left panel) ── */}
          {courses.filter(c => c.is_featured).length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: textPrimary, margin: 0 }}>Featured Courses</h3>
                <button onClick={() => navigate('/courses')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#6366f1', display: 'flex', alignItems: 'center', gap: 4 }}>
                  See All <ChevronRight size={14} />
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                {courses.filter(c => c.is_featured).slice(0, 3).map(course => (
                  <CourseCard key={course.id} course={course} myCourses={myCourses} navigate={navigate} currencyFormater={currencyFormater} isDarkMode={isDarkMode} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ═══ RIGHT SIDEBAR ═══ */}
        <div style={{
          width: 340, flexShrink: 0,
          borderLeft: `1px solid ${border}`,
          padding: '28px 20px 40px',
          position: 'sticky', top: 57, height: 'calc(100vh - 57px)', overflowY: 'auto',
          background: isDarkMode ? '#0f172a' : '#fafafa',
        }}>

          {/* ── Upcoming Live Sessions ── */}
          {liveChapters.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: textPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Video size={16} color="#ef4444" />
                  Upcoming Live
                </h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {liveChapters.map((ch: any) => {
                  const isCurrentlyLive = ch.live_status === 'LIVE';
                  const formattedTime = ch.live_starts_at
                    ? new Date(ch.live_starts_at).toLocaleString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })
                    : 'Scheduled';

                  return (
                    <div
                      key={ch.id}
                      onClick={() => navigate('/coursedetails', { state: { course: ch.courses } })}
                      style={{
                        background: cardBg,
                        border: `1px solid ${isCurrentlyLive ? '#ef4444' : border}`,
                        borderRadius: 14,
                        padding: '12px 14px',
                        cursor: 'pointer',
                        transition: 'transform 0.2s',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; }}
                    >
                      <style>{`
                        @keyframes pulse-live {
                          0% { opacity: 0.5; }
                          50% { opacity: 1; }
                          100% { opacity: 0.5; }
                        }
                      `}</style>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        {isCurrentlyLive ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{
                              width: 8, height: 8, borderRadius: '50%',
                              backgroundColor: '#ef4444',
                              display: 'inline-block',
                              animation: 'pulse-live 1.5s infinite'
                            }} />
                            <span style={{ fontSize: 10, fontWeight: 800, color: '#ef4444', letterSpacing: '0.5px' }}>LIVE NOW</span>
                          </div>
                        ) : (
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#f59e0b', letterSpacing: '0.5px' }}>UPCOMING</span>
                        )}
                        <span style={{ fontSize: 10, color: textMuted }}>{formattedTime}</span>
                      </div>
                      
                      <p style={{ fontSize: 12, fontWeight: 700, color: textPrimary, margin: '0 0 2px', lineHeight: 1.4 }}>
                        {ch.title}
                      </p>
                      <p style={{ fontSize: 11, color: textMuted, margin: '0 0 8px' }}>
                        Course: {ch.courses?.title || 'Course'}
                      </p>

                      <button
                        onClick={e => { e.stopPropagation(); navigate('/coursedetails', { state: { course: ch.courses } }); }}
                        style={{
                          width: '100%', padding: '6px', borderRadius: 8, border: 'none', cursor: 'pointer',
                          background: isCurrentlyLive ? '#ef4444' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                          color: '#fff', fontSize: 11, fontWeight: 700,
                        }}>
                        {isCurrentlyLive ? 'Join Live Class' : 'View Course'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Featured Picks Carousel ── */}
          {unpurchasedFeaturedCourses.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: textPrimary, margin: 0 }}>
                  ✨ Featured Picks
                </h3>
                <button onClick={() => navigate('/courses')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#6366f1' }}>See All</button>
              </div>

              <div style={{ position: 'relative', height: 260, borderRadius: 16, overflow: 'hidden' }}>
                {unpurchasedFeaturedCourses.map((course, idx) => {
                  const isCurrent = idx === currentSlide;
                  return (
                    <div
                      key={course.id}
                      onClick={() => navigate('/coursedetails', { state: { course } })}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        opacity: isCurrent ? 1 : 0,
                        transform: isCurrent ? 'scale(1)' : 'scale(0.96)',
                        transition: 'opacity 0.5s ease-in-out, transform 0.5s ease-in-out',
                        pointerEvents: isCurrent ? 'auto' : 'none',
                        background: cardBg,
                        border: `1px solid ${border}`,
                        borderRadius: 16,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        cursor: 'pointer'
                      }}
                    >
                      {/* Image header */}
                      <div style={{ position: 'relative', height: 120 }}>
                        <img
                          src={course.thumbnail_url || 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=600&q=80'}
                          alt=""
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.4), transparent)' }} />
                        <div style={{
                          position: 'absolute', top: 8, left: 8,
                          background: 'rgba(0,0,0,0.65)', borderRadius: 6,
                          padding: '3px 8px', backdropFilter: 'blur(4px)',
                        }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>
                            {course.price ? `₹${currencyFormater(Number(course.price))}` : 'Free'}
                          </span>
                        </div>
                        {course.is_featured && (
                          <div style={{ position: 'absolute', top: 8, right: 8, background: '#f59e0b', borderRadius: 6, padding: '2px 6px' }}>
                            <span style={{ fontSize: 9, fontWeight: 800, color: '#fff' }}>★ FEATURED</span>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 700, color: textPrimary, margin: '0 0 4px', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {course.title}
                          </p>
                          <p style={{ fontSize: 11, color: textMuted, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {course.instructor_name || course.teacher?.name || 'Instructor'}
                          </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Users size={11} color={textMuted} />
                            <span style={{ fontSize: 11, color: textMuted }}>{course.purchases_count || 0} enrolled</span>
                          </div>
                          <button
                            onClick={e => { e.stopPropagation(); navigate('/coursedetails', { state: { course } }); }}
                            style={{
                              padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                              color: '#fff',
                            }}
                          >
                            {course.price ? 'Buy Now' : 'Enroll'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Left/Right manual slide buttons */}
                {unpurchasedFeaturedCourses.length > 1 && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentSlide(prev => (prev - 1 + unpurchasedFeaturedCourses.length) % unpurchasedFeaturedCourses.length);
                      }}
                      style={{
                        position: 'absolute',
                        left: 8,
                        top: '25%',
                        transform: 'translateY(-50%)',
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#fff',
                        zIndex: 10
                      }}
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentSlide(prev => (prev + 1) % unpurchasedFeaturedCourses.length);
                      }}
                      style={{
                        position: 'absolute',
                        right: 8,
                        top: '25%',
                        transform: 'translateY(-50%)',
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#fff',
                        zIndex: 10
                      }}
                    >
                      <ChevronRight size={14} />
                    </button>
                  </>
                )}
              </div>

              {/* Dots Indicator */}
              {unpurchasedFeaturedCourses.length > 1 && (
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 12 }}>
                  {unpurchasedFeaturedCourses.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentSlide(idx)}
                      style={{
                        width: idx === currentSlide ? 16 : 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: idx === currentSlide ? '#6366f1' : textMuted,
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Notifications ── */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: textPrimary, margin: 0 }}>Notifications</h3>
              <button onClick={() => navigate('/notifications')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#6366f1' }}>View All</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {notifications.length > 0 ? notifications.map((notif: any, i: number) => (
                <div key={i} style={{
                  display: 'flex', gap: 10, alignItems: 'flex-start',
                  background: cardBg, border: `1px solid ${border}`,
                  borderRadius: 12, padding: '10px 12px',
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                    background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Bell size={14} color="#6366f1" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: textPrimary, margin: '0 0 2px', lineHeight: 1.4 }}>
                      {notif.title || notif.message || 'New notification'}
                    </p>
                    <p style={{ fontSize: 10, color: textMuted, margin: 0 }}>{getTimeAgo(notif.created_at)}</p>
                  </div>
                </div>
              )) : (
                // Placeholder notifications when empty
                [
                  { title: 'Welcome to EduOrbit!', sub: 'Start your learning journey' },
                  { title: 'New courses available', sub: 'Check out the latest courses' },
                ].map((n, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: '10px 12px' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Bell size={14} color="#6366f1" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: textPrimary, margin: '0 0 2px' }}>{n.title}</p>
                      <p style={{ fontSize: 10, color: textMuted, margin: 0 }}>{n.sub}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Reusable Course Card ────────────────────────────────────────────
function CourseCard({ course, myCourses, navigate, currencyFormater, isDarkMode }: any) {
  const enrolledCourse = myCourses.find((c: any) => c.id === course.id);
  const isEnrolled = !!enrolledCourse;
  const isExpired = enrolledCourse?.enrollment?.expiry_date
    ? new Date(enrolledCourse.enrollment.expiry_date) < new Date()
    : false;

  return (
    <div
      onClick={() => navigate('/coursedetails', { state: { course } })}
      className={`flex flex-col rounded-[20px] overflow-hidden shadow-sm border cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
    >
      <div className="h-40 relative">
        <img src={course.thumbnail_url || 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=600&q=80'} className="w-full h-full object-cover" alt="" />
        <div className="absolute top-3 left-3 bg-black/70 px-2 py-0.5 rounded-md">
          <span className="text-white text-xs font-bold">{course.price ? `₹${currencyFormater(Number(course.price))}` : 'Free'}</span>
        </div>
        {isEnrolled && (
          <div className={`absolute bottom-2 left-2 px-2 py-0.5 rounded-md ${isExpired ? 'bg-red-500' : 'bg-green-500'}`}>
            <span className="text-white text-[9px] font-bold">{isExpired ? 'EXPIRED' : 'ENROLLED'}</span>
          </div>
        )}
      </div>
      <div className="flex flex-col flex-1 p-4 gap-2">
        <h4 className={`text-sm font-bold leading-5 line-clamp-2 m-0 ${isDarkMode ? 'text-gray-50' : 'text-gray-900'}`}>{course.title}</h4>
        <p className={`text-xs line-clamp-2 m-0 flex-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          {course.description ? stripMarkdown(course.description).slice(0, 100) : ''}
        </p>
        <button
          onClick={e => { e.stopPropagation(); navigate('/coursedetails', { state: { course } }); }}
          className={`w-full py-2.5 rounded-xl border-none font-bold text-xs text-white cursor-pointer transition-opacity hover:opacity-90 ${isEnrolled ? (isExpired ? 'bg-red-500' : 'bg-green-500') : 'bg-primary'}`}
        >
          {isEnrolled ? (isExpired ? 'Renew Access' : 'Continue Learning') : (course.price ? 'Buy Now' : 'Enroll Now')}
        </button>
      </div>
    </div>
  );
}
