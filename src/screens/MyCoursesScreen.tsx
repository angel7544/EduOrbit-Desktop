import { useNavigate } from 'react-router-dom';
import React, { useState, useEffect, useCallback } from 'react';
import { Search, ChevronLeft, Clock, User, BookOpen, Lock } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useCourseStore } from '../store/courseStore';
import { formatDuration } from '../lib/utils';
import { useTheme } from '../hooks/useTheme';

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
  const [activeTab, setActiveTab] = useState<'Completed' | 'Ongoing'>('Ongoing');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
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

  useEffect(() => {
    const list: CourseListItem[] = Array.isArray(myCourses)
      ? myCourses.map((course: any) => {
        const completedCount = progress[course.id]?.length || 0;
        const totalCount = course.chapters?.length || 0;
        const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
        const isCompleted = percentage === 100;

        const totalSeconds = (course.chapters || []).reduce((sum: number, ch: any) => sum + (ch.duration || 0), 0);
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
    setMappedCourses(list);
  }, [myCourses, progress]);

  const filteredCourses = mappedCourses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeTab === 'Completed') return course.isCompleted && matchesSearch;
    return !course.isCompleted && matchesSearch;
  });

  if (!user) {
    return (
      <div className={`flex flex-col min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className={`px-5 py-3 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
          <span className={`text-lg font-bold ${isDarkMode ? 'text-gray-50' : 'text-gray-900'}`}>My Courses</span>
        </div>
        <div className="flex-1 flex justify-center items-center pt-24">
          <span className={`text-base font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Sign in to see your courses.</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className={`px-8 pt-6 pb-4 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <div className="flex flex-row items-center justify-between mb-6">
          <button onClick={() => navigate(-1)} className="p-1 bg-transparent border-none cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
            <ChevronLeft size={24} className={isDarkMode ? 'text-gray-50' : 'text-gray-900'} />
          </button>
          <span className={`text-3xl font-bold ${isDarkMode ? 'text-gray-50' : 'text-gray-900'}`}>My Courses</span>
          <div className="w-8" />
        </div>

        <div className="flex flex-col md:flex-row items-center gap-6 mb-2">
          <div className={`flex-1 w-full flex flex-row items-center px-4 py-3 h-12 rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'}`}>
            <Search size={20} className="text-gray-400" />
            <input
              className={`flex-1 ml-2 text-base bg-transparent border-none outline-none ${isDarkMode ? 'text-gray-50' : 'text-gray-900'}`}
              placeholder="Search my courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex flex-row gap-4 w-full md:w-auto md:min-w-[300px]">
            <button
              className={`flex-1 py-3 rounded-xl border-none cursor-pointer transition-colors ${activeTab === 'Completed' ? 'bg-primary' : (isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-200 hover:bg-gray-300')}`}
              onClick={() => setActiveTab('Completed')}
            >
              <span className={`text-sm font-bold ${activeTab === 'Completed' ? 'text-white' : (isDarkMode ? 'text-gray-300' : 'text-gray-600')}`}>Completed</span>
            </button>
            <button
              className={`flex-1 py-3 rounded-xl border-none cursor-pointer transition-colors ${activeTab === 'Ongoing' ? 'bg-primary' : (isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-200 hover:bg-gray-300')}`}
              onClick={() => setActiveTab('Ongoing')}
            >
              <span className={`text-sm font-bold ${activeTab === 'Ongoing' ? 'text-white' : (isDarkMode ? 'text-gray-300' : 'text-gray-600')}`}>Ongoing</span>
            </button>
          </div>
        </div>
      </div>

      {loading && !refreshing ? (
        <div className="flex-1 flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="p-8 grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6">
          {filteredCourses.length === 0 ? (
            <div className="col-span-full flex justify-center items-center py-24">
              <span className={`text-xl font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {activeTab === 'Completed' ? 'No completed courses yet.' : 'No ongoing courses found.'}
              </span>
            </div>
          ) : (
            filteredCourses.map((item) => (
              <div
                key={item.id}
                className={`group flex flex-col rounded-[20px] overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300 ${isDarkMode ? 'bg-gray-800/80 border border-gray-800 shadow-[0_4px_16px_rgba(0,0,0,0.2)] hover:border-gray-700 hover:-translate-y-1' : 'bg-white border border-gray-100 shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:-translate-y-1 hover:border-gray-200'} ${item.isExpired ? 'opacity-70 hover:opacity-100' : ''}`}
                onClick={() => {
                  if (item.isExpired) {
                    if (window.confirm('Your access to this course has expired. Would you like to renew it?')) {
                      const renewalMessage = `I would like to renew my subscription for the course: "${item.title}" (ID: ${item.id}). Please assist me with the renewal process.`;
                      navigate('/chatdetail', { state: {
                        initialMessage: renewalMessage,
                        autoSend: true,
                        forceNewTicket: true
                      } });
                    }
                    return;
                  }
                  navigate('/coursedetails', { state: {
                    course: {
                      id: item.id,
                      title: item.title,
                      raw: item.raw,
                    },
                  } });
                }}
              >
                <div className={`relative overflow-hidden aspect-[16/9] w-full border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                  <img src={item.image} alt={item.title} className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110" />
                  <div className="absolute inset-0 bg-black/5" />
                  
                  <div className={`absolute top-3 left-3 px-2 py-1 rounded-md z-10 ${item.isExpired ? 'bg-red-500' : 'bg-primary'}`}>
                    <span className="text-white text-[10px] font-bold">{item.isExpired ? 'EXPIRED' : item.category.toUpperCase()}</span>
                  </div>

                  <div className={`absolute top-3 right-3 flex flex-row items-center px-2 py-1 rounded-md gap-1 z-10 ${item.isExpired ? 'bg-red-500' : (item.expiryInfo === 'Lifetime Access' ? 'bg-green-500' : 'bg-amber-500')}`}>
                    <Clock size={12} color="#fff" />
                    <span className="text-white text-[10px] font-bold">{item.expiryInfo}</span>
                  </div>

                  {item.isExpired && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col justify-center items-center z-20">
                      <Lock size={32} color="#fff" />
                      <span className="text-white text-lg font-bold mt-2 tracking-[2px]">EXPIRED</span>
                    </div>
                  )}
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary mb-2 block">
                      {item.category || 'Course'}
                    </span>
                    <span className={`block text-base font-extrabold leading-snug mb-4 line-clamp-2 transition-colors duration-300 group-hover:text-primary ${isDarkMode ? 'text-gray-50' : 'text-gray-900'}`}>
                      {item.title}
                    </span>
                  </div>

                  <div className="flex flex-row items-center mb-4 gap-3">
                    <div className="flex flex-row items-center gap-1.5">
                      <BookOpen size={12} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                      <span className={`text-[13px] font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{item.duration} • {item.totalCount} Lessons</span>
                    </div>
                    <div className={`w-px h-3.5 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />
                    <div className="flex flex-row items-center gap-1.5">
                      <User size={12} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                      <span className={`text-[13px] font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Enrolled</span>
                    </div>
                  </div>

                  <div className="mb-5">
                    <div className="flex flex-row justify-between mb-2.5">
                      <span className={`text-sm font-semibold ${isDarkMode ? 'text-gray-50' : 'text-gray-900'}`}>{item.percentage}% Complete</span>
                    </div>
                    <div className={`h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                      <div className={`h-full rounded-full transition-all duration-300 ${item.isExpired ? 'bg-gray-500' : 'bg-primary'}`} style={{ width: `${item.percentage}%` }} />
                    </div>
                  </div>

                  <button
                    className={`w-full py-3.5 rounded-lg flex items-center justify-center border-none cursor-pointer transition-opacity hover:opacity-90 ${item.isExpired ? (isDarkMode ? 'bg-gray-700' : 'bg-gray-200') : 'bg-primary'}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (item.isExpired) {
                        if (window.confirm('Your access to this course has expired. Would you like to renew it?')) {
                          const renewalMessage = `I would like to renew my subscription for the course: "${item.title}" (ID: ${item.id}). Please assist me with the renewal process.`;
                          navigate('/chatdetail', { state: {
                            initialMessage: renewalMessage,
                            autoSend: true,
                            forceNewTicket: true
                          } });
                        }
                        return;
                      }
                      navigate('/coursedetails', { state: {
                        course: {
                          id: item.id,
                          title: item.title,
                          raw: item.raw,
                        },
                      } });
                    }}
                  >
                    <span className={`text-base font-semibold ${item.isExpired ? (isDarkMode ? 'text-gray-400' : 'text-gray-500') : 'text-white'}`}>
                      {item.isExpired ? 'Renew Access' : 'Resume Learning'}
                    </span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
