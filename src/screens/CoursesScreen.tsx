import { useNavigate, useLocation } from 'react-router-dom';
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Search, Star, Heart, Lock, Users, Clock, X, ChevronDown, Book } from 'lucide-react';
import { currencyFormater, formatDuration, stripMarkdown } from '../lib/utils';
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

interface CustomCategoriesDropdownProps {
  filters: string[];
  selectedFilter: string;
  onSelect: (val: string) => void;
  mappedCourses: CourseListItem[];
  isDarkMode: boolean;
}

const CustomCategoriesDropdown: React.FC<CustomCategoriesDropdownProps> = ({ 
  filters, 
  selectedFilter, 
  onSelect, 
  mappedCourses, 
  isDarkMode 
}) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative w-full">
      <p className="text-xs font-semibold mb-1 text-textLight">Category</p>
      <button
        onClick={() => setOpen(!open)}
        className={`flex flex-row items-center justify-between px-3 py-2.5 border rounded-xl w-full text-left cursor-pointer transition-all duration-300 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-50' : 'bg-white border-gray-200 text-gray-900 shadow-sm'}`}
      >
        <span className="text-sm font-medium flex-1 mr-2 truncate">
          {selectedFilter}
        </span>
        <ChevronDown size={16} className="text-textLight flex-shrink-0" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
          <div className={`absolute top-full left-0 right-0 mt-1.5 z-[9999] border rounded-2xl shadow-xl max-h-[300px] overflow-y-auto ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex flex-col p-1">
              {filters.map((filter: string) => {
                const count = mappedCourses.filter((c: any) => {
                  if (filter === 'All') return true;
                  if (filter === 'Free') return c.price === 'Free';
                  if (filter === 'Premium') return c.price !== 'Free';
                  return c.raw.video_subject?.includes(filter);
                }).length;

                return (
                  <button
                    key={filter}
                    className={`flex flex-row items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 text-left cursor-pointer border-none ${selectedFilter === filter ? 'bg-primary/10 text-primary font-bold' : (isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-705 hover:bg-gray-50')}`}
                    onClick={() => {
                      onSelect(filter);
                      setOpen(false);
                    }}
                  >
                    <span className="text-sm truncate mr-2">{filter}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${selectedFilter === filter ? 'bg-primary text-white' : (isDarkMode ? 'bg-gray-900 text-gray-500' : 'bg-gray-100 text-gray-500')}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

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
  );  return (
    <div className={`flex flex-col min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      
      {/* Header Area with Integrated Responsive Search & Dropdowns */}
      <div className={`flex flex-col xl:flex-row justify-between items-stretch xl:items-center px-8 py-6 gap-4 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
        <div className="flex flex-row justify-between items-center flex-1 xl:flex-initial">
          <span className={`text-3xl font-bold tracking-tight ${isDarkMode ? 'text-gray-50' : 'text-gray-900'}`}>Courses</span>
          <div onClick={() => navigate('/profile')} className="xl:hidden cursor-pointer">
            <img
              src={user?.profileImage || 'https://api.dicebear.com/7.x/initials/png?seed=ED'}
              alt="Profile"
              className={`w-10 h-10 rounded-full border ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-100'}`}
            />
          </div>
        </div>

        {/* Search, Categories, and Sort Dropdowns in header row */}
        <div className="flex flex-col md:flex-row flex-1 items-stretch md:items-center justify-end gap-4">
          {/* Dynamic Search Bar */}
          <div className="flex-1 max-w-md">
            <div className={`flex flex-row items-center w-full px-4 py-2.5 rounded-2xl gap-3 transition-all duration-300 border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 ${isDarkMode ? 'bg-gray-800/80 text-gray-50 border-gray-700' : 'bg-white text-gray-900 shadow-sm border-gray-200'}`}>
              <Search className="text-gray-400 flex-shrink-0" size={18} />
              <input
                className={`flex-1 text-sm bg-transparent border-none outline-none ${isDarkMode ? 'text-gray-50' : 'text-gray-900'}`}
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-text transition-colors flex-shrink-0">
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Categories Dropdown */}
          <div className="w-full md:w-56 z-30">
            <CustomCategoriesDropdown
              filters={filters}
              selectedFilter={selectedFilter}
              onSelect={setSelectedFilter}
              mappedCourses={mappedCourses}
              isDarkMode={isDarkMode}
            />
          </div>

          {/* Sort By Dropdown */}
          <div className="w-full md:w-48 z-20">
            <Dropdown
              label="Sort By"
              options={SORT_OPTIONS}
              selected={sortBy}
              onSelect={setSortBy}
            />
          </div>
        </div>

        <div onClick={() => navigate('/profile')} className="hidden xl:block cursor-pointer flex-shrink-0">
          <img
            src={user?.profileImage || 'https://api.dicebear.com/7.x/initials/png?seed=ED'}
            alt="Profile"
            className={`w-10 h-10 rounded-full border ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-100'}`}
          />
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto w-full flex-1 p-6 md:p-8">
        
        {/* Main Content Area (Full width, 3 rectangular cards per row) */}
        <div className="flex flex-row justify-between items-center mb-8">
            <span className={`text-xl font-bold ${isDarkMode ? 'text-gray-50' : 'text-gray-900'}`}>
                {selectedFilter === 'All' ? 'All Courses' : `${selectedFilter} Courses`}
            </span>
        </div>

        {loading && !refreshing ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {error && (
              <div className="col-span-full px-5 py-2">
                <span className="text-red-500 text-sm">{error}</span>
              </div>
            )}
            {filteredCourses.map((item) => {
              const subject = item.raw.video_subject || 'Development';
              
              return (
                <div
                  key={item.id}
                  className={`group relative flex flex-col rounded-3xl overflow-hidden cursor-pointer transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_45px_-12px_rgba(37,99,235,0.18)] dark:hover:shadow-[0_20px_45px_-12px_rgba(59,130,246,0.3)] border ${isDarkMode ? 'bg-gray-800/40 border-gray-700/50 backdrop-blur-md' : 'bg-white border-gray-200 shadow-[0_8px_30px_rgba(0,0,0,0.02)]'}`}
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
                    navigate('/coursedetails', { state: { course: item.raw } });
                  }}
                >
                  {/* Image Container with inner shadow & zoom (Landscape 16:9) */}
                  <div className="relative overflow-hidden aspect-[16/9] w-full bg-gray-100 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
                    <img 
                      src={item.image} 
                      alt={item.title} 
                      className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-108" 
                    />
                    
                    {/* Glassmorphic Expiry Badges */}
                    {item.expiryInfo && (
                      <div className={`absolute top-3.5 left-3.5 flex flex-row items-center px-3 py-1 rounded-full gap-1.5 z-10 backdrop-blur-md border border-white/10 ${item.isExpired ? 'bg-red-500/90 text-white' : (item.expiryInfo === 'Lifetime Access' ? 'bg-emerald-500/90 text-white' : 'bg-amber-500/90 text-white')}`}>
                        <Clock size={12} className="text-white animate-pulse" />
                        <span className="text-white text-[10px] font-extrabold uppercase tracking-wide">{item.expiryInfo}</span>
                      </div>
                    )}

                    {item.isExpired && (
                      <div className="absolute inset-0 bg-black/70 flex flex-col justify-center items-center z-20 backdrop-blur-xs">
                        <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center mb-2 animate-bounce">
                          <Lock size={22} className="text-red-500" />
                        </div>
                        <span className="text-white font-black text-sm tracking-wider uppercase">Expired</span>
                      </div>
                    )}

                    {/* Pulse Animated Favorite/Heart Button */}
                    <button 
                      className={`absolute top-3.5 right-3.5 w-9 h-9 rounded-full flex justify-center items-center backdrop-blur-md bg-black/35 hover:bg-red-500 border border-white/15 cursor-pointer text-white transition-all duration-300 group/heart hover:scale-110 active:scale-95`}
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      <Heart 
                        size={16} 
                        className="text-white transition-transform duration-300 group-hover/heart:scale-110" 
                        fill={item.isEnrolled ? "#ef4444" : "none"} 
                      />
                    </button>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div className="flex-1">
                      {/* Subject tag */}
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary mb-2 block">
                        {subject}
                      </span>
                      
                      {/* Title with hover color change */}
                      <h3 className={`text-base font-extrabold line-clamp-2 leading-snug mb-2 group-hover:text-primary transition-colors duration-300 ${isDarkMode ? 'text-gray-50' : 'text-gray-900'}`}>
                        {item.title}
                      </h3>

                      {/* Description snippet */}
                      {item.raw.description && (
                        <p className={`text-xs mt-1 mb-4 line-clamp-2 leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {stripMarkdown(item.raw.description)}
                        </p>
                      )}

                      {/* Dynamic Stats Row */}
                      <div className="flex flex-row items-center gap-3 text-xs mb-5 flex-wrap">
                        <div className="flex items-center gap-1.5 text-textLight">
                          <Book size={14} className="text-primary/70" />
                          <span className="font-medium">{item.lessons} lessons</span>
                        </div>
                        <div className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700" />
                        <div className="flex items-center gap-1.5 text-textLight">
                          <Clock size={14} className="text-secondary/70" />
                          <span className="font-medium">{item.duration}</span>
                        </div>
                        <div className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700" />
                        <div className="flex items-center gap-1.5 text-textLight">
                          <Users size={14} className="text-success/70" />
                          <span className="font-medium">{item.enrolled} Students</span>
                        </div>
                      </div>
                    </div>

                    {/* Purchase / Enrolled Actions */}
                    <div className={`flex flex-col gap-4 pt-4 border-t ${isDarkMode ? 'border-gray-800/80' : 'border-gray-100'}`}>
                      
                      {/* Instructor and Rating in horizontal bar */}
                      <div className="flex flex-row items-center justify-between">
                        <div className="flex flex-row items-center gap-2">
                          <img
                            src={item.instructorAvatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(item.instructor) + '&background=random'}
                            alt={item.instructor}
                            className="w-6 h-6 rounded-full ring-2 ring-background shadow-sm"
                          />
                          <span className={`text-xs font-bold truncate max-w-[120px] ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            {item.instructor}
                          </span>
                        </div>
                        <div className="flex flex-row items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                          <Star size={12} className="text-amber-500" fill="#f59e0b" />
                          <span className={`text-[11px] font-bold text-amber-600 dark:text-amber-400`}>{item.rating}</span>
                        </div>
                      </div>

                      <div className="flex flex-row items-center justify-between mt-1 gap-2">
                        {item.isEnrolled ? (
                          <div 
                            className={`flex-1 rounded-2xl py-3 flex items-center justify-center cursor-pointer transition-all duration-300 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] ${item.isExpired ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-red-500/10' : 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-green-500/10'}`}
                          >
                            <span className="text-white text-xs font-extrabold uppercase tracking-wider">
                              {item.isExpired ? 'Renew Access' : 'Continue Learning'}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-row items-center justify-between flex-1 gap-2">
                            <div className="flex flex-col">
                              <span className="text-[10px] uppercase font-bold text-textLight leading-none mb-0.5">Price</span>
                              <span className="text-lg font-black text-primary leading-tight tracking-tight">
                                {item.price}
                              </span>
                            </div>
                            <button
                              className={`px-5 py-2.5 rounded-2xl flex flex-row items-center gap-1.5 border-none cursor-pointer font-extrabold text-xs uppercase tracking-wider transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] ${item.isEnrollmentClosed ? 'bg-gray-400 text-white' : 'bg-primary text-white hover:bg-primary/95 shadow-md shadow-primary/20'}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate('/coursedetails', { state: { course: item.raw } });
                              }}
                            >
                              {item.isEnrollmentClosed ? (
                                <>
                                  <Lock size={12} className="text-gray-100" />
                                  <span>Full</span>
                                </>
                              ) : (
                                <span>
                                  {item.price === 'Free' ? 'Enroll' : 'Buy'}
                                </span>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

