import { useNavigate, useLocation } from 'react-router-dom';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Search, Heart, BookOpen, Star, Calculator, FlaskConical, Layers, Video, Bell,
  AlarmClock, Flame, Award, Clock, History, TrendingUp, Play, CheckCircle2,
  GraduationCap, Activity, Receipt, Headset, X
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useCourseStore } from '../store/courseStore';
import { currencyFormater } from '../lib/utils';
import { useTheme } from '../hooks/useTheme';
import { useNotificationStore } from '../store/notificationStore';
import { supabase } from '../lib/supabase';
import { AppLoader } from '../components/AppLoader';
import { Avatar } from '../components/Avatar';
import { formatWatchTime } from '../lib/format';

export default function DashboardScreen() {
  const { user } = useAuthStore();
  const { isDarkMode, colors } = useTheme();
  const { courses, loadPublishedCourses, myCourses, loadMyCourses, progress, loadProgress, error: courseError } = useCourseStore();
  const { unreadCount, fetchUnreadCount, subscribeToUnreadCount } = useNotificationStore();

  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [liveChapters, setLiveChapters] = useState<any[]>([]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [streakCount, setStreakCount] = useState(1);

  const bannerData = courses;

  useEffect(() => {
    if (bannerData.length === 0) return;
    const interval = setInterval(() => {
      setActiveSlide(prev => (prev + 1) >= bannerData.length ? 0 : prev + 1);
    }, 3000);
    return () => clearInterval(interval);
  }, [bannerData.length]);

  useEffect(() => {
    if (user && myCourses.length > 0) {
      myCourses.forEach((course) => {
        if (loadProgress) loadProgress(course.id, user.id);
      });
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
      return () => {
        unsubscribe();
      };
    }
  }, [user, myCourses, subscribeToUnreadCount]);

  const fetchLiveChapters = async () => {
    try {
      const { data, error } = await supabase
        .from('chapters')
        .select('*, courses(id, title, thumbnail_url)')
        .eq('is_live', true)
        .eq('is_published', true)
        .order('live_starts_at', { ascending: true });

      if (error) throw error;
      const now = new Date();
      const activeLive = data?.filter(ch => {
        if (ch.live_ends_at) {
          return new Date(ch.live_ends_at) > now;
        }
        return true;
      }) || [];
      setLiveChapters(activeLive);
    } catch (error) {
      console.error('Error fetching live chapters:', error);
    }
  };

  const checkAndUpdateStreak = async () => {
    if (!user) return;
    try {
      const streakKey = `user_streak_${user.id}`;
      const storedStreak = localStorage.getItem(streakKey);
      const today = new Date().toISOString().split('T')[0];
      const yesterdayDate = new Date();
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterday = yesterdayDate.toISOString().split('T')[0];

      if (storedStreak) {
        const { count, lastDate } = JSON.parse(storedStreak);
        if (lastDate === today) {
          setStreakCount(count); return;
        }
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
    } catch (e) {
      console.error('Error updating streak:', e);
    }
  };

  const fetchDashboardStats = async () => {
    if (!user) return;
    try {
      const { data: stats, error } = await supabase.rpc('get_student_analytics', { student_id: user.id });
      if (error) throw error;
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
    } catch (e) {
      console.error('Error fetching dashboard stats:', e);
    }
  };

  const loadData = useCallback(async () => {
    if (user) {
      await Promise.all([
        loadMyCourses(user), loadPublishedCourses(), fetchLiveChapters(), fetchDashboardStats(), checkAndUpdateStreak()
      ]);
    } else {
      await Promise.all([
        loadPublishedCourses(), fetchLiveChapters()
      ]);
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
    const channel = supabase
      .channel('public:chapters')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chapters', filter: 'is_live=eq.true' }, (payload) => {
        fetchLiveChapters();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning,';
    if (hour < 18) return 'Good Afternoon,';
    return 'Good Evening,';
  };

  const renderHeader = () => (
    <div className={`sticky top-0 z-50 rounded-b-3xl shadow-md transition-colors duration-300 mb-5 pb-5 ${isDarkMode ? 'bg-slate-800/80' : 'bg-white/90'} backdrop-blur-md`}>
      <div className="px-5 pt-4">
        {isSearchExpanded ? (
          <div className="flex flex-row items-center gap-3">
            <div className={`flex flex-1 items-center px-3 h-12 rounded-xl ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <Search size={20} className="text-gray-400" />
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search courses..."
                className="flex-1 bg-transparent border-none outline-none ml-2 text-base text-text"
              />
              {searchQuery.length > 0 && (
                <button onClick={() => setSearchQuery('')} className="bg-transparent border-none cursor-pointer">
                  <X size={16} className="text-gray-400" />
                </button>
              )}
            </div>
            <button onClick={() => { setIsSearchExpanded(false); setSearchQuery(''); }} className="bg-transparent border-none cursor-pointer font-semibold text-text">
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex flex-row items-center justify-between">
            <div>
              <p className="text-sm opacity-80 text-textLight m-0">{getGreeting()}</p>
              <h2 className="text-xl font-bold text-text m-0">{user?.name || 'Guest'}</h2>
            </div>
            <div className="flex flex-row items-center gap-4">
              <div className="flex flex-row items-center bg-black/5 dark:bg-white/10 px-2 py-1 rounded-xl">
                <Flame size={16} className="text-orange-500" />
                <span className="font-bold ml-1 text-xs text-text">{streakCount}</span>
              </div>
              <button onClick={() => setIsSearchExpanded(true)} className="p-1 bg-transparent border-none cursor-pointer text-text">
                <Search size={24} />
              </button>
              <button onClick={() => navigate('/notifications')} className="relative p-1 bg-transparent border-none cursor-pointer text-text">
                <Bell size={24} />
                {unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 bg-red-500 rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 border-2 border-white dark:border-slate-800">
                    <span className="text-[10px] text-white font-bold">{unreadCount > 99 ? '99+' : unreadCount}</span>
                  </div>
                )}
              </button>
              <button onClick={() => navigate('/profile')} className="bg-transparent border-none cursor-pointer">
                <Avatar uri={user?.profileImage} name={user?.name} size={40} className="border-2 border-white shadow-sm" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderHeroCarousel = () => {
    if (courses.length === 0) return null;
    return (
      <div className="mb-8 px-8">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-6">
          {bannerData.slice(0, 3).map((course, index) => (
            <button 
              key={course.id}
              onClick={() => navigate('/coursedetails', { state: { course } })}
              className="w-full h-[220px] rounded-2xl overflow-hidden relative border-none cursor-pointer shadow-md transition-transform hover:scale-[1.02] active:scale-95 p-0"
            >
              <img src={course.thumbnail_url || 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=1200&q=80'} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/10 p-4 flex flex-col justify-between">
                {course.is_featured && (
                  <div className="self-start bg-red-500 px-2 py-1 rounded-md">
                    <span className="text-[10px] text-white font-bold">FEATURED</span>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderQuickActions = () => {
    const actions = [
      { id: '1', title: 'Reminders', icon: AlarmClock, route: 'Reminders', color: 'bg-purple-500 shadow-purple-500/20' },
      { id: '2', title: 'My Learning', icon: GraduationCap, route: 'MyCourses', color: 'bg-emerald-500 shadow-emerald-500/20' },
      { id: '6', title: 'Progress', icon: Activity, route: 'MyAnalytics', color: 'bg-amber-500 shadow-amber-500/20' },
      { id: '3', title: 'Purchases', icon: Receipt, route: 'MyPayments', color: 'bg-blue-500 shadow-blue-500/20' },
      { id: '5', title: 'Support', icon: Headset, route: 'ChatSupport', color: 'bg-cyan-500 shadow-cyan-500/20' },
    ];
    return (
      <div className="mb-8 px-8">
        <div className="flex flex-wrap gap-6">
          {actions.map((action) => (
            <button key={action.id} onClick={() => navigate(`/${action.route.toLowerCase()}`)} className="flex flex-col items-center gap-2 bg-transparent border-none cursor-pointer transition-transform active:scale-95">
              <div className={`w-14 h-14 rounded-[20px] flex justify-center items-center shadow-lg ${action.color}`}>
                <action.icon size={24} color="#FFF" />
              </div>
              <span className="text-xs font-semibold text-text">{action.title}</span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderLearningOverview = () => {
    if (!user || !analyticsData) return null;
    const watchTimeDisplay = formatWatchTime(analyticsData.total_watch_time);
    const certCount = analyticsData.course_progress?.filter((c: any) => c.has_certificate).length || 0;

    return (
      <div className="px-8 mb-8">
        <div className="flex flex-row items-center justify-between p-6 rounded-2xl bg-card shadow-sm border border-border/50">
          <div className="flex flex-1 items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex justify-center items-center">
              <Clock size={20} className="text-blue-500" />
            </div>
            <div>
              <p className="text-base font-bold text-text m-0">{watchTimeDisplay}</p>
              <p className="text-[10px] font-medium text-textLight m-0">Watch Time</p>
            </div>
          </div>
          <div className="w-px h-8 bg-border mx-2" />
          <div className="flex flex-1 items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex justify-center items-center">
              <Award size={20} className="text-emerald-500" />
            </div>
            <div>
              <p className="text-base font-bold text-text m-0">{certCount}</p>
              <p className="text-[10px] font-medium text-textLight m-0">Certificates</p>
            </div>
          </div>
          <div className="w-px h-8 bg-border mx-2" />
          <div className="flex flex-1 items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex justify-center items-center">
              <TrendingUp size={20} className="text-amber-500" />
            </div>
            <div>
              <p className="text-base font-bold text-text m-0">{analyticsData.courses_enrolled || 0}</p>
              <p className="text-[10px] font-medium text-textLight m-0">Courses</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderQuickAccess = () => {
    const data = myCourses.length > 0 ? myCourses : courses.slice(0, 5);
    if (data.length === 0) return null;
    return (
      <div className="mb-8 px-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-text m-0">{myCourses.length > 0 ? 'Continue Learning' : 'Start Learning'}</h3>
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
          {data.map((course) => {
            const completedCount = progress?.[course.id]?.length || 0;
            const totalCount = course.chapters?.length || 0;
            const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
            return (
              <button key={course.id} onClick={() => navigate('/coursedetails', { state: { course } })} className="w-full h-[120px] rounded-xl overflow-hidden relative shadow-sm cursor-pointer border-none p-0 transition-transform hover:scale-[1.02]">
                <img src={course.thumbnail_url || 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=1200&q=80'} className="w-full h-full object-cover" alt="" />
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2 text-left">
                  <p className="text-xs font-bold text-white truncate m-0">{course.title}</p>
                  {myCourses.some(c => c.id === course.id) && (
                    <div className="h-[3px] bg-white/30 rounded-full mt-1">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${percentage}%` }} />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderCategories = () => {
    const displaySubjects = [
      { id: '1', name: 'Urdu', icon: BookOpen, bg: 'bg-blue-600' },
      { id: '2', name: 'Math', icon: Calculator, bg: 'bg-teal-500' },
      { id: '3', name: 'Science', icon: FlaskConical, bg: 'bg-rose-500' },
      { id: '4', name: 'Premium', icon: Star, bg: 'bg-orange-500' },
      { id: '5', name: 'Design', icon: Layers, bg: 'bg-purple-600' },
    ];
    return (
      <div className="mb-8 px-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-text m-0">Subjects</h3>
          <button onClick={() => navigate('/courses')} className="text-sm font-semibold text-primary bg-transparent border-none cursor-pointer hover:underline">View All</button>
        </div>
        <div className="flex flex-wrap gap-6">
          {displaySubjects.map((cat) => (
            <button key={cat.id} onClick={() => navigate('/courses', { state: { subjectFilter: cat.name } })} className="flex flex-col items-center gap-2 w-20 bg-transparent border-none cursor-pointer transition-transform active:scale-95">
              <div className={`w-14 h-14 rounded-2xl flex justify-center items-center shadow-md ${cat.bg}`}>
                <cat.icon size={24} color="#FFF" />
              </div>
              <span className="text-xs font-medium text-text text-center">{cat.name}</span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderLiveClasses = () => {
    if (liveChapters.length === 0) return null;
    const now = new Date();
    const ongoing = liveChapters.filter((chapter) => {
      const startDate = chapter.live_starts_at ? new Date(chapter.live_starts_at) : null;
      const endDate = chapter.live_ends_at ? new Date(chapter.live_ends_at) : null;
      if (!startDate) return false;
      return endDate ? (startDate <= now && endDate > now) : startDate <= now;
    });
    const upcoming = liveChapters.filter((chapter) => {
      const startDate = chapter.live_starts_at ? new Date(chapter.live_starts_at) : null;
      return startDate ? startDate > now : false;
    });

    if (ongoing.length === 0 && upcoming.length === 0) return null;

    const renderLiveCard = (chapter: any, isOngoing: boolean) => {
      const isEnrolled = myCourses.some(c => c.id === chapter.course_id);
      const startDate = chapter.live_starts_at ? new Date(chapter.live_starts_at) : null;

      const handleJoinPress = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isEnrolled) {
          navigate('/chapterplayer', { state: { courseId: chapter.course_id, courseTitle: chapter.courses?.title || chapter.title, chapter, hasAccess: true } });
        } else {
          navigate('/coursedetails', { state: { course: chapter.courses || { id: chapter.course_id, title: chapter.title } } });
        }
      };

      return (
        <div key={chapter.id} onClick={() => navigate('/coursedetails', { state: { course: chapter.courses || { id: chapter.course_id, title: chapter.title } } })} className="w-full rounded-2xl p-4 bg-card shadow-sm border border-border/50 mb-3 cursor-pointer">
          <div className="flex justify-between mb-3">
            <div className={`flex items-center px-2 py-1 rounded-lg gap-1 ${isOngoing ? 'bg-red-500 animate-pulse' : 'bg-red-500'}`}>
              <Video size={12} color="#fff" />
              <span className="text-white text-[10px] font-bold">{isOngoing ? 'LIVE NOW' : 'LIVE'}</span>
            </div>
          </div>
          <div className="flex flex-col gap-1 mb-4">
            <h4 className="text-base font-bold text-text m-0 line-clamp-2">{chapter.title}</h4>
            <p className="text-xs text-textLight m-0 truncate">{chapter.courses?.title}</p>
            {startDate && (
              <p className="text-xs font-semibold text-primary mt-1 m-0">
                {startDate.toLocaleDateString()} {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
          <button onClick={handleJoinPress} className={`flex items-center justify-center py-2 rounded-lg gap-1.5 w-full border-none cursor-pointer text-white font-semibold text-xs transition-opacity hover:opacity-90 ${isOngoing ? 'bg-green-500' : (isEnrolled ? 'bg-primary' : 'bg-gray-400')}`}>
            {isOngoing ? <Video size={14} color="#fff" /> : <Bell size={14} color="#fff" />}
            <span>{isOngoing ? 'Join Now' : 'Set Reminder'}</span>
          </button>
        </div>
      );
    };

    return (
      <div className="mb-8 px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {ongoing.length > 0 && (
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-text mb-2 m-0">Ongoing Live Classes</h3>
              {ongoing.map(ch => renderLiveCard(ch, true))}
            </div>
          )}
          {upcoming.length > 0 && (
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-text mb-2 m-0">Upcoming Live Classes</h3>
              {upcoming.map(ch => renderLiveCard(ch, false))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderFeaturedCourses = () => {
    const isSearching = searchQuery.length > 0;
    const displayedCourses = courses.filter(c =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) && (isSearching ? true : c.is_featured)
    );
    if (displayedCourses.length === 0) return null;

    return (
      <div className="mb-8 px-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-text m-0">{isSearching ? 'Search Results' : 'Featured Courses'}</h3>
          {!isSearching && <button onClick={() => navigate('/courses')} className="text-sm font-semibold text-primary bg-transparent border-none cursor-pointer hover:underline">See All</button>}
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6">
          {displayedCourses.map(course => {
            const enrolledCourse = myCourses.find(c => c.id === course.id);
            const isEnrolled = !!enrolledCourse;
            let isExpired = false;
            if (isEnrolled && enrolledCourse?.enrollment?.expiry_date) {
              isExpired = new Date(enrolledCourse.enrollment.expiry_date) < new Date();
            }
            const snippet = course.description ? `${course.description.slice(0, 80)}${course.description.length > 80 ? '...' : ''}` : '';

            return (
              <div key={course.id} onClick={() => navigate('/coursedetails', { state: { course } })} className="w-full flex flex-col rounded-[20px] bg-card overflow-hidden shadow-sm border border-border/50 cursor-pointer transition-transform hover:scale-[1.02] active:scale-95">
                <div className="h-40 relative">
                  <img src={course.thumbnail_url || 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=1200&q=80'} className="w-full h-full object-cover" alt="" />
                  <div className="absolute top-3 left-3 bg-black/70 px-2.5 py-1 rounded-md">
                    <span className="text-white text-xs font-bold">{course.price ? `₹${currencyFormater(Number(course.price))}` : 'Free'}</span>
                  </div>
                  {isEnrolled && (
                    <div className={`absolute bottom-2 left-2 px-2 py-1 rounded-md ${isExpired ? 'bg-red-500' : 'bg-green-500'}`}>
                      <span className="text-white text-[10px] font-bold">{isExpired ? 'EXPIRED' : 'ENROLLED'}</span>
                    </div>
                  )}
                  <button className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-white/80 dark:bg-black/50 border-none cursor-pointer">
                    <Heart size={16} className="text-red-500 fill-red-500" />
                  </button>
                </div>
                <div className="flex flex-col flex-1 p-4 gap-2">
                  <div className="flex-1">
                    <h4 className="text-base font-bold text-text leading-5 line-clamp-2 m-0">{course.title}</h4>
                    <p className="text-xs text-textLight mt-1 line-clamp-2 m-0">{snippet}</p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); navigate('/coursedetails', { state: { course } }); }} className={`w-full py-3 rounded-xl border-none font-bold text-sm text-white cursor-pointer transition-opacity hover:opacity-90 ${isEnrolled ? (isExpired ? 'bg-red-500' : 'bg-green-500') : 'bg-primary'}`}>
                    {isEnrolled ? (isExpired ? 'Renew Access' : 'Continue Learning') : (course.price ? 'Buy Now' : 'Enroll Now')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderRecentActivity = () => {
    if (!user || !analyticsData?.recent_activity?.length) return null;
    return (
      <div className="mb-8 px-8">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <History size={18} className="text-text" />
            <h3 className="text-xl font-bold text-text m-0">Recent Activity</h3>
          </div>
        </div>
        <div className="flex flex-col gap-2.5">
          {analyticsData.recent_activity.map((activity: any, index: number) => (
            <div key={index} onClick={() => navigate('/myanalytics')} className="flex items-center p-3 rounded-2xl bg-card shadow-sm border border-border/50 gap-3 cursor-pointer transition-transform active:scale-[0.98]">
              <div className={`w-7 h-7 rounded-full flex justify-center items-center ${activity.is_completed ? 'bg-emerald-500/10' : 'bg-blue-500/10'}`}>
                {activity.is_completed ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Play size={14} className="text-blue-500" />}
              </div>
              <div className="flex-1 overflow-hidden">
                <h4 className="text-sm font-semibold text-text truncate m-0">{activity.chapter_title}</h4>
                <p className="text-[11px] text-textLight mt-0.5 truncate m-0">{activity.course_title} • {new Date(activity.updated_at).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (isInitialLoading || loadingError) {
    return <AppLoader isLoading={isInitialLoading} error={loadingError} onRetry={initDashboard} />;
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="flex flex-col">
        {renderHeader()}
        {searchQuery.length === 0 && renderHeroCarousel()}
        {searchQuery.length === 0 && renderLearningOverview()}
        {searchQuery.length === 0 && renderQuickActions()}
        {searchQuery.length === 0 && renderQuickAccess()}
        {searchQuery.length === 0 && renderCategories()}
        {searchQuery.length === 0 && renderLiveClasses()}
        {renderFeaturedCourses()}
        {searchQuery.length === 0 && renderRecentActivity()}
      </div>
    </div>
  );
}
