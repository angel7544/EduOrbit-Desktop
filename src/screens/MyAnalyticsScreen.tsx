import { useNavigate } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import {
  ChevronLeft, Award, FileText, Download, Clock,
  BookOpen, CheckCircle2, TrendingUp, History, Lightbulb, Play, X
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../hooks/useTheme';
import { supabase } from '../lib/supabase';
import { formatWatchTime } from '../lib/format';

interface AnalyticsData {
  total_watch_time: number;
  courses_enrolled: number;
  last_active: string;
  course_progress: {
    course_id: string;
    course_title: string;
    total_chapters: number;
    completed_chapters: number;
    enrolled_at: string;
    has_certificate: boolean;
  }[];
  recent_activity?: {
    updated_at: string;
    is_completed: boolean;
    course_title: string;
    chapter_title: string;
  }[];
}

export default function MyAnalyticsScreen() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { isDarkMode } = useTheme();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [weeklyStats, setWeeklyStats] = useState<{ day: string; count: number }[]>([]);

  const [showCertModal, setShowCertModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [certData, setCertData] = useState<any>(null);

  useEffect(() => {
    if (user) {
      fetchMyAnalytics();
    }
  }, [user]);

  const fetchMyAnalytics = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_student_analytics', { student_id: user.id });

      if (error) throw error;

      const { data: recentData } = await supabase
        .from('chapter_progress')
        .select('updated_at, is_completed, courses(title), chapters(title)')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(5);

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data: weeklyData } = await supabase
        .from('chapter_progress')
        .select('updated_at')
        .eq('user_id', user.id)
        .gte('updated_at', sevenDaysAgo.toISOString());

      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const stats = Array(7).fill(0).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return { day: days[d.getDay()], count: 0, dateStr: d.toDateString() };
      });

      weeklyData?.forEach(item => {
        const itemDate = new Date(item.updated_at).toDateString();
        const statObj = stats.find(s => s.dateStr === itemDate);
        if (statObj) statObj.count += 1;
      });

      setWeeklyStats(stats);

      const processedRecent = recentData?.map((item: any) => ({
        updated_at: item.updated_at,
        is_completed: item.is_completed,
        course_title: item.courses?.title || 'Unknown Course',
        chapter_title: item.chapters?.title || 'Unknown Chapter'
      }));

      setData({
        ...data,
        recent_activity: processedRecent
      });
    } catch (e: any) {
      console.error('Error fetching analytics:', e);
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCertificate = async (courseId: string) => {
    if (!user) return;
    try {
      const { data: cert, error: certError } = await supabase
        .from('certificates')
        .select('*')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .single();

      if (certError) throw certError;

      const { data: courseData } = await supabase
        .from('courses')
        .select('instructor_id, instructors(name, signature_url)')
        .eq('id', courseId)
        .single();

      if (cert) {
        const instructorInfo = courseData?.instructors as any;
        setCertData({
          ...cert,
          instructor_name: instructorInfo?.name || 'Instructor',
          signature_url: instructorInfo?.signature_url
        });
        setShowCertModal(true);
      }
    } catch (e: any) {
      alert('Could not load certificate details');
    }
  };

  const generateHints = () => {
    if (!data) return [];
    const hints = [];
    
    if (weeklyStats.length > 0) {
      const activeDays = weeklyStats.filter(s => s.count > 0);
      if (activeDays.length > 0) {
        const mostActive = [...weeklyStats].sort((a,b) => b.count - a.count)[0];
        hints.push(`You were most active on ${mostActive.day} this week with ${mostActive.count} interactions!`);
      } else {
        hints.push("You haven't had much activity this week. Time to jump back in!");
      }
    }

    if (data.course_progress && data.course_progress.length > 0) {
      const closeCourse = data.course_progress.find(c => (c.completed_chapters / c.total_chapters) > 0.8 && c.completed_chapters < c.total_chapters);
      if (closeCourse) {
        hints.push(`You're so close to finishing "${closeCourse.course_title}"! Just a few more chapters.`);
      } else {
        hints.push("Consistency is key. Try to complete one chapter today to keep your streak alive!");
      }
    }

    if (data.total_watch_time > 3600 * 5) {
      hints.push(`Great dedication! You've logged over ${formatWatchTime(data.total_watch_time)} of learning.`);
    } else if (data.total_watch_time > 0) {
      hints.push(`You've spent ${formatWatchTime(data.total_watch_time)} learning. Keep it up!`);
    }

    return hints;
  };

  if (loading) {
    return (
      <div className={`flex flex-col min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className={`flex flex-row items-center justify-between p-4 border-b ${isDarkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'}`}>
          <button onClick={() => navigate(-1)} className="p-2 bg-transparent border-none cursor-pointer">
            <ChevronLeft className={isDarkMode ? 'text-gray-50' : 'text-gray-900'} size={24} />
          </button>
          <div className="flex flex-row items-center gap-2">
            <TrendingUp className="text-primary" size={20} />
            <span className={`text-lg font-semibold ${isDarkMode ? 'text-gray-50' : 'text-gray-900'}`}>My Analytics</span>
          </div>
          <div className="w-10" />
        </div>
        <div className="flex-1 flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className={`flex flex-row items-center justify-between p-4 border-b ${isDarkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'}`}>
        <button onClick={() => navigate(-1)} className="p-2 bg-transparent border-none cursor-pointer">
          <ChevronLeft className={isDarkMode ? 'text-gray-50' : 'text-gray-900'} size={24} />
        </button>
        <div className="flex flex-row items-center gap-2">
          <TrendingUp className="text-primary" size={20} />
          <span className={`text-lg font-semibold ${isDarkMode ? 'text-gray-50' : 'text-gray-900'}`}>My Analytics</span>
        </div>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto p-5 pb-10 max-w-4xl mx-auto w-full">
        <div className={`rounded-[20px] overflow-hidden mb-6 shadow-lg bg-gradient-to-br ${isDarkMode ? 'from-blue-600 via-blue-700 to-blue-900' : 'from-blue-400 via-blue-500 to-blue-700'}`}>
          <div className="p-6">
            <div className="flex flex-row justify-between items-start mb-6">
              <div>
                <span className="text-white/80 text-sm font-medium">Welcome back,</span>
                <span className="text-white text-2xl font-bold block">{user?.name || 'Student'}</span>
              </div>
              <Award className="text-white/90" size={48} />
            </div>

            <div className="flex flex-row justify-between items-center bg-white/10 rounded-2xl p-4">
              <div className="flex-1 flex flex-col items-center">
                <BookOpen className="text-white mb-1" size={20} />
                <span className="text-white text-xl font-bold">{data?.courses_enrolled || 0}</span>
                <span className="text-white/80 text-xs">Courses</span>
              </div>
              <div className="w-px h-8 bg-white/20 mx-2" />
              <div className="flex-1 flex flex-col items-center">
                <Clock className="text-white mb-1" size={20} />
                <span className="text-white text-xl font-bold">{formatWatchTime(data?.total_watch_time || 0)}</span>
                <span className="text-white/80 text-xs">Hours</span>
              </div>
              <div className="w-px h-8 bg-white/20 mx-2" />
              <div className="flex-1 flex flex-col items-center">
                <CheckCircle2 className="text-white mb-1" size={20} />
                <span className="text-white text-xl font-bold">
                  {data?.course_progress.filter(c => c.completed_chapters === c.total_chapters && c.total_chapters > 0).length || 0}
                </span>
                <span className="text-white/80 text-xs">Done</span>
              </div>
              <div className="w-px h-8 bg-white/20 mx-2" />
              <div className="flex-1 flex flex-col items-center">
                <Award className="text-white mb-1" size={20} />
                <span className="text-white text-xl font-bold">
                  {data?.course_progress.filter(c => c.has_certificate).length || 0}
                </span>
                <span className="text-white/80 text-xs">Certs</span>
              </div>
            </div>
          </div>
        </div>

        {weeklyStats.length > 0 && (
          <div className={`rounded-2xl p-5 mb-6 border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex flex-row items-center mb-5 gap-2">
              <TrendingUp size={20} className="text-primary" />
              <span className={`text-base font-bold ${isDarkMode ? 'text-gray-50' : 'text-gray-900'}`}>Weekly Activity</span>
            </div>
            <div className="flex flex-row justify-between items-end h-36">
              {weeklyStats.map((stat, i) => {
                const maxCount = Math.max(...weeklyStats.map(s => s.count), 1);
                const heightPercentage = (stat.count / maxCount) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center px-1">
                    <span className={`text-xs mb-1 font-semibold ${isDarkMode ? 'text-gray-50' : 'text-gray-900'}`}>
                      {stat.count > 0 ? stat.count : ''}
                    </span>
                    <div className={`w-full max-w-[24px] h-24 rounded-t-md relative overflow-hidden flex flex-col justify-end ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      <div 
                        className="w-full bg-primary transition-all duration-500 rounded-t-md" 
                        style={{ height: `${heightPercentage}%` }} 
                      />
                    </div>
                    <span className={`text-[10px] mt-2 font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{stat.day}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {data && (
          <div className={`rounded-2xl p-5 mb-6 border ${isDarkMode ? 'bg-primary/10 border-primary/20' : 'bg-blue-50 border-blue-100'}`}>
            <div className="flex flex-row items-center gap-2 mb-4">
              <div className={`w-8 h-8 rounded-full flex justify-center items-center ${isDarkMode ? 'bg-primary/20' : 'bg-blue-100'}`}>
                <Lightbulb size={20} className="text-primary" />
              </div>
              <span className={`text-base font-bold ${isDarkMode ? 'text-gray-50' : 'text-gray-900'}`}>Smart Hints</span>
            </div>
            <div className="flex flex-col gap-3">
              {generateHints().map((hint, i) => (
                <div key={i} className="flex flex-row items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                  <span className={`flex-1 text-sm leading-5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{hint}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {data?.recent_activity && data.recent_activity.length > 0 && (
          <div className="mb-6">
            <div className="flex flex-row items-center gap-2 mb-4">
              <History size={20} className={isDarkMode ? 'text-gray-50' : 'text-gray-900'} />
              <span className={`text-base font-bold ${isDarkMode ? 'text-gray-50' : 'text-gray-900'}`}>Recent Activity</span>
            </div>
            <div className="flex flex-row overflow-x-auto pb-4 gap-4 no-scrollbar">
              {data.recent_activity.map((activity, index) => (
                <div key={index} className={`min-w-[240px] p-4 rounded-xl border flex flex-row items-center gap-3 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                  <div className={`w-10 h-10 rounded-full flex justify-center items-center shrink-0 ${activity.is_completed ? (isDarkMode ? 'bg-green-900/30' : 'bg-green-100') : (isDarkMode ? 'bg-blue-900/30' : 'bg-blue-100')}`}>
                    {activity.is_completed ? <CheckCircle2 size={16} className="text-green-500" /> : <Play size={16} className="text-primary" />}
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className={`text-sm font-semibold truncate ${isDarkMode ? 'text-gray-50' : 'text-gray-900'}`}>{activity.chapter_title}</span>
                    <span className={`text-xs truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{activity.course_title}</span>
                    <span className={`text-[10px] mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{new Date(activity.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <span className={`text-base font-bold mb-4 block ${isDarkMode ? 'text-gray-50' : 'text-gray-900'}`}>Course Progress</span>

        <div className="flex flex-col gap-4">
          {data?.course_progress.map((course, index) => {
            const progress = course.total_chapters > 0 ? (course.completed_chapters / course.total_chapters) * 100 : 0;
            return (
              <div key={course.course_id} className={`rounded-xl p-4 border flex flex-col ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className="flex flex-row justify-between items-start mb-3">
                  <div className="flex-1 pr-4">
                    <span className={`text-base font-semibold truncate block ${isDarkMode ? 'text-gray-50' : 'text-gray-900'}`}>{course.course_title}</span>
                    <span className={`text-xs mt-1 block ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {course.completed_chapters} of {course.total_chapters} Chapters
                    </span>
                  </div>
                  <span className="text-primary font-bold text-lg">{Math.round(progress)}%</span>
                </div>

                <div className={`w-full h-2 rounded-full overflow-hidden mb-4 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                </div>

                <div className="flex flex-row justify-end mt-auto">
                  {course.has_certificate ? (
                    <button
                      className={`flex flex-row items-center gap-1.5 px-3 py-1.5 rounded-lg border-none cursor-pointer ${isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-600'}`}
                      onClick={() => {
                        setSelectedCourse(course);
                        fetchCertificate(course.course_id);
                      }}
                    >
                      <Award size={14} className="currentColor" />
                      <span className="text-xs font-bold currentColor">View Certificate</span>
                    </button>
                  ) : (
                    <div className="flex flex-row items-center gap-1.5 px-3 py-1.5 rounded-lg">
                      <Clock size={14} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                      <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>In Progress</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {(!data?.course_progress || data.course_progress.length === 0) && (
            <div className="flex flex-col items-center justify-center py-10 opacity-80">
              <BookOpen className={`mb-3 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`} size={48} />
              <span className={`text-base font-semibold ${isDarkMode ? 'text-gray-50' : 'text-gray-900'}`}>No course progress yet.</span>
              <span className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Jump into a course to see your stats!</span>
            </div>
          )}
        </div>
      </div>

      {showCertModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4">
          <div className={`w-full max-w-sm rounded-2xl flex flex-col overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className={`flex flex-row justify-between items-center p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
              <span className={`text-lg font-bold ${isDarkMode ? 'text-gray-50' : 'text-gray-900'}`}>Certificate</span>
              <button onClick={() => setShowCertModal(false)} className="bg-transparent border-none cursor-pointer">
                <X size={24} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
              </button>
            </div>
            
            <div className="p-6 flex flex-col items-center">
              <Award size={64} className="text-primary mb-4" />
              <span className={`text-sm text-center mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>You have successfully completed</span>
              <span className={`text-xl font-bold text-center mb-6 ${isDarkMode ? 'text-gray-50' : 'text-gray-900'}`}>{selectedCourse?.course_title}</span>
              
              <div className={`w-full px-4 py-3 rounded-xl flex justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
                <span className={`text-xs font-mono ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>ID: {certData?.certificate_number}</span>
              </div>
            </div>

            <div className={`p-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
              <button className="w-full flex flex-row items-center justify-center gap-2 h-12 rounded-xl bg-primary border-none cursor-pointer hover:opacity-90">
                <Download size={20} className="text-white" />
                <span className="text-white font-bold text-base">Download PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
