import { useNavigate, useLocation } from 'react-router-dom';
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Search, Star, Heart, Lock, Users, Clock } from 'lucide-react';
import { currencyFormater, formatDuration } from '../lib/utils';
import { useCourseStore } from '../store/courseStore';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../hooks/useTheme';
import { Dropdown } from '../components/Dropdown';

interface CourseListItem {
  id: string;
  title: string;
  instructor: string;
  instructorAvatar?: string;
  duration: string;
  rating: number;
  image: string;
  lessons: number;
  price: string;
  enrolled: number;
  isEnrolled: boolean;
  expiryInfo?: string;
  isExpired: boolean;
  isEnrollmentClosed?: boolean;
  raw: any;
}

export default function CoursesScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const route = { params: location.state };
  const { courses, myCourses, loading, error, loadPublishedCourses, loadMyCourses } = useCourseStore();
  const { user } = useAuthStore();
  const { isDarkMode } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [sortBy, setSortBy] = useState('Default');
  const [mappedCourses, setMappedCourses] = useState<CourseListItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const SORT_OPTIONS = ['Default', 'Popularity', 'Price: Low to High', 'Price: High to Low'];

  const subjectFilters = useMemo(
    () =>
      Array.from(
        new Set(
          courses
            .map((c: any) => c.video_subject)
            .filter(Boolean)
        )
      ),
    [courses]
  );

  const filters = useMemo(
    () => ['All', ...subjectFilters, 'Free', 'Premium'],
    [subjectFilters]
  );

  useEffect(() => {
    loadPublishedCourses();
    if (user) {
      loadMyCourses(user);
    }
  }, [loadPublishedCourses, loadMyCourses, user]);

  useEffect(() => {
    const subject = route.params?.subjectFilter;
    if (subject && subjectFilters.includes(subject)) {
      setSelectedFilter(subject);
    }
  }, [route.params, subjectFilters]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const promises = [loadPublishedCourses()];
    if (user) {
      promises.push(loadMyCourses(user));
    }
    await Promise.all(promises);
    setRefreshing(false);
  }, [loadPublishedCourses, loadMyCourses, user]);

  useEffect(() => {
    const list: CourseListItem[] = Array.isArray(courses)
      ? courses.map((course: any) => {
        const lessons = Array.isArray(course.chapters)
          ? course.chapters.length
          : 0;
        const isFree = !course.price || course.price === 0;
        const priceLabel = isFree
          ? 'Free'
          : `₹${currencyFormater(Number(course.price || 0))} `;

        const totalSeconds = (course.chapters || []).reduce((sum: number, ch: any) => sum + (ch.duration || 0), 0);
        const duration = formatDuration(totalSeconds);

        const enrolledCourse = myCourses.find((c: any) => c.id === course.id);
        const isEnrolled = !!enrolledCourse;

        let expiryInfo = '';
        let isExpired = false;

        if (isEnrolled && enrolledCourse?.enrollment?.expiry_date) {
          const expiryDate = new Date(enrolledCourse.enrollment.expiry_date);
          const now = new Date();
          const diffTime = expiryDate.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays < 0) {
            expiryInfo = 'Expired';
            isExpired = true;
          } else {
            expiryInfo = `${diffDays} days left`;
          }
        } else if (course.expiry_days) {
          expiryInfo = `${course.expiry_days} days validity`;
        } else {
          expiryInfo = 'Lifetime Access';
        }

        return {
          id: course.id,
          title: course.title,
          instructor: course.instructor_name || course.teacher?.name || 'Instructor',
          instructorAvatar: course.teacher?.avatar_url || course.teacher_avatar || null,
          duration,
          rating: 4.5,
          image:
            course.thumbnail_url ||
            'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=1200&q=80',
          lessons,
          price: priceLabel,
          enrolled: parseInt(course.purchases_count?.toString() || course.enrollments_count?.toString() || '0', 10),
          isEnrolled,
          expiryInfo,
          isExpired,
          isEnrollmentClosed: course.is_enrollment_closed,
          raw: course,
        };
      })
      : [];
    setMappedCourses(list);
  }, [courses, myCourses]);

  const filteredCourses = useMemo(
    () => {
      let result = mappedCourses.filter((course) => {
        const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = selectedFilter === 'All'
          ? true
          : selectedFilter === 'Free'
            ? course.price === 'Free'
            : selectedFilter === 'Premium'
              ? course.price !== 'Free'
              : course.raw.video_subject?.includes(selectedFilter);
        return matchesSearch && matchesFilter;
      });

      if (sortBy === 'Popularity') {
        result.sort((a, b) => b.enrolled - a.enrolled);
      } else if (sortBy === 'Price: Low to High') {
        result.sort((a, b) => {
          const priceA = a.price === 'Free' ? 0 : parseFloat(a.price.replace(/[^0-9.]/g, ''));
          const priceB = b.price === 'Free' ? 0 : parseFloat(b.price.replace(/[^0-9.]/g, ''));
          return priceA - priceB;
        });
      } else if (sortBy === 'Price: High to Low') {
        result.sort((a, b) => {
          const priceA = a.price === 'Free' ? 0 : parseFloat(a.price.replace(/[^0-9.]/g, ''));
          const priceB = b.price === 'Free' ? 0 : parseFloat(b.price.replace(/[^0-9.]/g, ''));
          return priceB - priceA;
        });
      }

      return result;
    },
    [mappedCourses, searchQuery, selectedFilter, sortBy]
  );

  return (
    <div className={`flex flex-col min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className={`flex flex-row justify-between items-center px-8 py-6 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
        <span className={`text-3xl font-bold ${isDarkMode ? 'text-gray-50' : 'text-gray-900'}`}>Courses</span>
        <div onClick={() => navigate('/profile')} className="cursor-pointer">
          <img
            src={user?.profileImage || 'https://api.dicebear.com/7.x/initials/png?seed=ED'}
            alt="Profile"
            className={`w-10 h-10 rounded-full border ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-100'}`}
          />
        </div>
      </div>

      <div className="flex flex-col md:flex-row max-w-[1600px] mx-auto w-full flex-1">
        
        {/* Left Sidebar Filters */}
        <div className={`w-full md:w-72 p-6 md:p-8 flex flex-col gap-8 md:border-r ${isDarkMode ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-white/50'}`}>
            <div>
                <span className={`text-sm font-bold uppercase tracking-wider mb-4 block ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Search</span>
                <div className={`flex flex-row items-center w-full px-4 py-3 rounded-xl gap-3 ${isDarkMode ? 'bg-gray-800 text-gray-50 border border-gray-700' : 'bg-white text-gray-900 shadow-sm border border-gray-200'}`}>
                    <Search className="text-gray-400" size={18} />
                    <input
                        className={`flex-1 text-sm bg-transparent border-none outline-none ${isDarkMode ? 'text-gray-50' : 'text-gray-900'}`}
                        placeholder="Search courses..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div>
                <span className={`text-sm font-bold uppercase tracking-wider mb-4 block ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Categories</span>
                <div className="flex flex-col gap-2">
                    {filters.map(filter => (
                        <button 
                            key={filter}
                            className={`text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors border-none cursor-pointer ${selectedFilter === filter ? 'bg-primary text-white shadow-md shadow-primary/20' : (isDarkMode ? 'bg-transparent text-gray-300 hover:bg-gray-800' : 'bg-transparent text-gray-600 hover:bg-gray-100')}`}
                            onClick={() => setSelectedFilter(filter)}
                        >
                            {filter}
                        </button>
                    ))}
                </div>
            </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-6 md:p-8">
            <div className="flex flex-row justify-between items-center mb-8">
                <span className={`text-xl font-bold ${isDarkMode ? 'text-gray-50' : 'text-gray-900'}`}>
                    {selectedFilter === 'All' ? 'All Courses' : `${selectedFilter} Courses`}
                </span>
                <div className="w-48 z-20">
                    <Dropdown
                    label="Sort By"
                    options={SORT_OPTIONS}
                    selected={sortBy}
                    onSelect={setSortBy}
                    />
                </div>
            </div>

            {loading && !refreshing ? (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {error && (
            <div className="col-span-full px-5 py-2">
              <span className="text-red-500 text-sm">{error}</span>
            </div>
          )}
          {filteredCourses.map((item) => (
            <div
              key={item.id}
              className={`rounded-2xl overflow-hidden cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1 flex flex-col ${isDarkMode ? 'bg-gray-800 shadow-[0_4px_16px_rgba(0,0,0,0.2)]' : 'bg-white shadow-[0_4px_12px_rgba(0,0,0,0.05)]'}`}
              onClick={() => {
                if (item.isExpired) {
                  if (window.confirm('Your access to this course has expired. Would you like to renew it?')) {
                    const renewalMessage = `I would like to renew my subscription for the course: "${item.title}"(ID: ${item.id}).Please assist me with the renewal process.`;
                    navigate('/chatdetail', { state: {
                      initialMessage: renewalMessage,
                      autoSend: true,
                      forceNewTicket: true
                    } });
                  }
                  return;
                }
                navigate('/coursedetails', { state: { course: item.raw } });
              }}
            >
              <div className="relative h-[200px] w-full">
                <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                
                {item.expiryInfo && (
                  <div className={`absolute top-3 left-3 flex flex-row items-center px-2 py-1 rounded-md gap-1 z-10 ${item.isExpired ? 'bg-red-500' : (item.expiryInfo === 'Lifetime Access' ? 'bg-green-500' : 'bg-amber-500')}`}>
                    <Clock size={12} color="#fff" />
                    <span className="text-white text-[10px] font-bold">{item.expiryInfo}</span>
                  </div>
                )}

                {item.isExpired && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col justify-center items-center z-20">
                    <Lock size={32} color="#ef4444" />
                    <span className="text-white font-bold mt-2">EXPIRED</span>
                  </div>
                )}
                <button className={`absolute top-3 right-3 w-9 h-9 rounded-full flex justify-center items-center border-none cursor-pointer ${isDarkMode ? 'bg-black/50' : 'bg-white/90'}`}>
                  <Heart size={16} className="text-red-500" fill="#ef4444" />
                </button>

                <div className="absolute bottom-2 right-2 flex flex-row items-center bg-black/60 px-2 py-1 rounded-full gap-1.5 z-10">
                  <img
                    src={item.instructorAvatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(item.instructor) + '&background=random'}
                    alt={item.instructor}
                    className="w-4 h-4 rounded-full"
                  />
                  <span className="text-white text-[10px] font-semibold">{item.instructor}</span>
                </div>
              </div>

              <div className="p-3.5 flex-1 flex flex-col">
                <div className="flex-1">
                  <span className={`text-base font-extrabold line-clamp-2 mb-1 ${isDarkMode ? 'text-gray-50' : 'text-gray-900'}`}>
                    {item.title}
                  </span>

                  {item.raw.description && (
                    <div className={`text-[10px] mt-1 mb-1 line-clamp-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {item.raw.description.slice(0, 200)}...
                    </div>
                  )}

                  <div className="flex flex-row items-center flex-wrap gap-3 mt-3 mb-3">
                    <div className={`flex flex-row items-center gap-1.5 px-2 py-1 rounded-md ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{item.lessons} Lessons</span>
                    </div>
                    <div className={`flex flex-row items-center gap-1.5 px-2 py-1 rounded-md ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
                      <div className="w-1.5 h-1.5 rounded-full bg-secondary" />
                      <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{item.duration}</span>
                    </div>
                    <div className={`flex flex-row items-center gap-1.5 px-2 py-1 rounded-md ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
                      <Users size={12} className={isDarkMode ? 'text-gray-300' : 'text-gray-600'} />
                      <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{item.enrolled} Students</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-row items-center justify-between mt-auto">
                  {item.isEnrolled ? (
                    <div className={`flex-1 rounded-xl py-3 flex items-center justify-center ${item.isExpired ? 'bg-red-500' : 'bg-green-500'}`}>
                      <span className="text-white text-sm font-bold">
                        {item.isExpired ? 'Renew Access' : 'Continue Learning'}
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-row items-center justify-between flex-1">
                      <div className="flex flex-row items-center gap-3">
                        <span className="text-xl font-extrabold text-primary">
                          {item.price}
                        </span>
                        <div className="flex flex-row items-center gap-1 bg-amber-500/10 px-2 py-1 rounded-xl">
                          <Star size={14} className="text-amber-500" fill="#f59e0b" />
                          <span className={`text-xs font-bold ${isDarkMode ? 'text-gray-50' : 'text-gray-900'}`}>{item.rating}</span>
                        </div>
                      </div>
                      <button
                        className={`px-5 py-3 rounded-xl flex flex-row items-center gap-1.5 border-none cursor-pointer ${item.isEnrollmentClosed ? 'bg-gray-400' : 'bg-primary hover:opacity-90 transition-opacity'}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/coursedetails', { state: { course: item.raw } });
                        }}
                      >
                        {item.isEnrollmentClosed ? (
                          <>
                            <Lock size={14} className="text-gray-100" />
                            <span className="text-gray-100 text-sm font-bold">Full</span>
                          </>
                        ) : (
                          <span className="text-white text-sm font-bold">
                            {item.price === 'Free' ? 'Enroll Now' : 'Buy Now'}
                          </span>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
          )}
        </div>
      </div>
    </div>
  );
}
