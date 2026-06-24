import { useNavigate, useLocation } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { 
  Play, Clock, Users, Star, CheckCircle, Lock,
  ChevronDown, ChevronUp, Share2, Heart, Award, FileText,
  AlertCircle
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useCourseStore } from '../store/courseStore';
import { formatDuration, currencyFormater } from '../lib/utils';
import { Header } from '../components/Header';
import { useTheme } from '../hooks/useTheme';

export default function CourseDetailsScreen() {
  const { isDarkMode } = useTheme();
  const location = useLocation();
  const route = { params: location.state };
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { myCourses, loadMyCourses, progress } = useCourseStore();

  const [activeTab, setActiveTab] = useState('About');
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [course, setCourse] = useState<any>(route.params?.course);
  
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isExpired, setIsExpired] = useState(false);
  const [expiryInfo, setExpiryInfo] = useState('');

  useEffect(() => {
    if (!course) {
      navigate(-1);
      return;
    }
    
    if (user) {
      checkEnrollment();
    } else {
      setLoading(false);
    }
  }, [user, course]);

  const checkEnrollment = async () => {
    try {
      const enrolledCourse = myCourses.find(c => c.id === course.id);
      
      if (enrolledCourse) {
        setIsEnrolled(true);
        setCourse(enrolledCourse);
        
        if (enrolledCourse.enrollment?.expiry_date) {
            const expiryDate = new Date(enrolledCourse.enrollment.expiry_date);
            const now = new Date();
            const diffTime = expiryDate.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays < 0) {
                setIsExpired(true);
                setExpiryInfo('Expired');
            } else {
                setExpiryInfo(`${diffDays} days left`);
            }
        } else if (course.expiry_days) {
            setExpiryInfo(`${course.expiry_days} days validity`);
        } else {
            setExpiryInfo('Lifetime Access');
        }
      }
    } catch (error) {
      console.error('Error checking enrollment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnrollOrPlay = () => {
    if (!user) {
      alert('Please log in to continue.');
      return;
    }

    if (isExpired) {
        if (window.confirm('Your access to this course has expired. Would you like to renew it?')) {
            const renewalMessage = `I would like to renew my subscription for the course: "${course.title}" (ID: ${course.id}). Please assist me with the renewal process.`;
            navigate('/chatdetail', { state: {
                initialMessage: renewalMessage,
                autoSend: true,
                forceNewTicket: true
            } });
        }
        return;
    }

    if (isEnrolled) {
      navigate('/chapterplayer', { state: { courseId: course.id } });
    } else {
      if (course.is_enrollment_closed) {
        alert('Enrollment is currently closed for this course.');
        return;
      }
      
      if (!course.price || course.price === 0) {
        navigate('/purchase', { state: { courseId: course.id, courseTitle: course.title, price: 0 } });
      } else {
        navigate('/purchase', { state: { courseId: course.id, courseTitle: course.title, price: course.price } });
      }
    }
  };

  const handleShare = async () => {
    try {
        if (navigator.share) {
            await navigator.share({
                title: course.title,
                text: `Check out this course: ${course.title}`,
                url: `https://lms.br31tech.live/course/${course.id}`,
            });
        } else {
            navigator.clipboard.writeText(`https://lms.br31tech.live/course/${course.id}`);
            alert('Link copied to clipboard!');
        }
    } catch (error: any) {
      console.error(error.message);
    }
  };

  if (!course) return null;

  const totalLessons = course.chapters?.length || 0;
  const totalSeconds = (course.chapters || []).reduce((sum: number, ch: any) => sum + (ch.duration || 0), 0);
  const duration = formatDuration(totalSeconds);
  const enrolledStudents = parseInt(course.purchases_count?.toString() || course.enrollments_count?.toString() || '0', 10);
  const rating = 4.8;
  const reviewsCount = 124;
  
  const completedCount = isEnrolled ? (progress[course.id]?.length || 0) : 0;
  const progressPercentage = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  const isFree = !course.price || course.price === 0;

  const toggleSection = (id: string) => {
    setExpandedSection(expandedSection === id ? null : id);
  };

  return (
    <div className={`flex flex-col min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <Header title="" showBack={true} />

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-8 py-6 flex flex-col md:flex-row gap-8">
        
        {/* Left Column - Main Content */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="relative h-[300px] md:h-[400px] w-full bg-black rounded-2xl overflow-hidden mb-6">
            <img 
          src={course.thumbnail_url || 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=1200&q=80'} 
          alt={course.title}
          className="w-full h-full object-cover opacity-60"
        />
           
          </div>

          <div className={`flex-1 rounded-3xl ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
            <div className="flex flex-row justify-between items-start mb-4">
            <div className={`px-2 py-1 rounded bg-primary/10`}>
                <span className="text-primary text-xs font-bold">{course.video_subject || 'General'}</span>
            </div>
            <div className="flex flex-row items-center gap-1">
                <Star size={16} color="#f59e0b" fill="#f59e0b" />
                <span className={`text-sm font-bold ${isDarkMode ? 'text-gray-50' : 'text-gray-900'}`}>{rating}</span>
                <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>({reviewsCount})</span>
            </div>
        </div>

        <h1 className={`text-3xl font-extrabold leading-10 mb-5 ${isDarkMode ? 'text-gray-50' : 'text-gray-900'}`}>{course.title}</h1>

        <div className="flex flex-row items-center gap-4 mb-8">
            <div className="flex flex-row items-center gap-1.5">
                <Clock size={16} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{duration}</span>
            </div>
            <div className={`w-1 h-1 rounded-full ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`} />
            <div className="flex flex-row items-center gap-1.5">
                <FileText size={16} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{totalLessons} Lessons</span>
            </div>
            <div className={`w-1 h-1 rounded-full ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`} />
            <div className="flex flex-row items-center gap-1.5">
                <Users size={16} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{enrolledStudents} Students</span>
            </div>
        </div>

        <div className="flex flex-row border-b mb-5" style={{ borderColor: isDarkMode ? '#374151' : '#e5e7eb' }}>
            {['About', 'Lessons', 'Reviews'].map((tab) => (
                <button
                    key={tab}
                    className={`flex-1 py-3 border-b-2 cursor-pointer transition-colors bg-transparent ${activeTab === tab ? 'border-primary' : 'border-transparent'}`}
                    onClick={() => setActiveTab(tab)}
                >
                    <span className={`text-base font-semibold text-center ${activeTab === tab ? 'text-primary' : (isDarkMode ? 'text-gray-400' : 'text-gray-500')}`}>
                        {tab}
                    </span>
                </button>
            ))}
        </div>

        <div className="pb-24">
            {activeTab === 'About' && (
                <div className="flex flex-col">
                    <span className={`text-lg font-bold mb-3 ${isDarkMode ? 'text-gray-50' : 'text-gray-900'}`}>About this course</span>
                    <p className={`text-base leading-6 mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {course.description || 'No description available for this course. Please contact the administrator for more details.'}
                    </p>

                    <span className={`text-lg font-bold mb-3 ${isDarkMode ? 'text-gray-50' : 'text-gray-900'}`}>Instructor</span>
                    <div className={`flex flex-row items-center p-4 rounded-xl mb-6 shadow-sm ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                        <img 
                            src={course.teacher?.avatar_url || course.teacher_avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(course.instructor_name || 'Instructor') + '&background=random'} 
                            alt={course.instructor_name || 'Instructor'}
                            className="w-14 h-14 rounded-full mr-4"
                        />
                        <div className="flex flex-col">
                            <span className={`text-base font-bold ${isDarkMode ? 'text-gray-50' : 'text-gray-900'}`}>{course.instructor_name || course.teacher?.name || 'Instructor'}</span>
                            <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Senior Developer</span>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'Lessons' && (
                <div className="flex flex-col gap-3">
                    {isEnrolled && !isExpired && (
                        <div className={`p-4 rounded-xl mb-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white shadow-sm border border-gray-100'}`}>
                            <div className="flex flex-row justify-between mb-2">
                                <span className={`text-sm font-semibold ${isDarkMode ? 'text-gray-50' : 'text-gray-900'}`}>Your Progress</span>
                                <span className={`text-sm font-bold ${isDarkMode ? 'text-primary' : 'text-primary'}`}>{progressPercentage}%</span>
                            </div>
                            <div className={`h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                                <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progressPercentage}%` }} />
                            </div>
                        </div>
                    )}
                    
                    {course.chapters?.length > 0 ? (
                        course.chapters.map((chapter: any, index: number) => {
                            const isExpanded = expandedSection === chapter.id;
                            const isCompleted = isEnrolled && progress[course.id]?.includes(chapter.id);
                            
                            return (
                                <div key={chapter.id} className={`rounded-xl overflow-hidden border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100 shadow-sm'}`}>
                                    <button 
                                        className="w-full flex flex-row items-center p-4 bg-transparent border-none cursor-pointer text-left"
                                        onClick={() => toggleSection(chapter.id)}
                                    >
                                        <div className={`w-8 h-8 rounded-full flex justify-center items-center mr-3 ${isCompleted ? 'bg-green-100' : (isDarkMode ? 'bg-gray-700' : 'bg-gray-100')}`}>
                                            {isCompleted ? (
                                                <CheckCircle size={16} color="#16a34a" />
                                            ) : (
                                                <span className={`text-sm font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{index + 1}</span>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <span className={`text-base font-semibold block ${isDarkMode ? 'text-gray-50' : 'text-gray-900'}`}>{chapter.title}</span>
                                            <div className="flex flex-row items-center mt-1">
                                                <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Video • {formatDuration(chapter.duration || 0)}</span>
                                            </div>
                                        </div>
                                        {isExpanded ? (
                                            <ChevronUp size={20} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                                        ) : (
                                            <ChevronDown size={20} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                                        )}
                                    </button>
                                    
                                    {isExpanded && (
                                        <div className={`p-4 pt-0 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                                            <p className={`text-sm leading-5 mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                {chapter.description || 'In this lesson, we will cover the foundational concepts related to this topic.'}
                                            </p>
                                            <button 
                                                className={`w-full py-3 rounded-lg flex flex-row justify-center items-center gap-2 border-none transition-opacity hover:opacity-90 ${isEnrolled && !isExpired ? 'bg-primary/10 text-primary cursor-pointer' : (isDarkMode ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-500 cursor-not-allowed')}`}
                                                onClick={() => {
                                                    if (isEnrolled && !isExpired) {
                                                        navigate('/chapterplayer', { state: { courseId: course.id, chapterId: chapter.id } });
                                                    }
                                                }}
                                            >
                                                {isEnrolled && !isExpired ? (
                                                    <>
                                                        <Play size={16} className="text-primary" fill="currentColor" />
                                                        <span className="text-sm font-bold text-primary">Play Lesson</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Lock size={16} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                                                        <span className={`text-sm font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Locked</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <div className="py-10 flex justify-center items-center">
                            <span className={`text-base ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>No lessons available yet.</span>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'Reviews' && (
                <div className="flex flex-col justify-center items-center py-10">
                    <Star size={48} color="#f59e0b" fill="#f59e0b" className="mb-4 opacity-50" />
                    <span className={`text-lg font-bold mb-2 ${isDarkMode ? 'text-gray-50' : 'text-gray-900'}`}>4.8 out of 5</span>
                    <span className={`text-sm text-center px-10 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Students love this course! Reviews will be visible soon in the next update.
                    </span>
                </div>
            )}
        </div>
      </div>
    </div>

    {/* Right Column - Enrollment Card */}
    <div className="w-full md:w-[350px] lg:w-[400px] shrink-0">
        <div className={`sticky top-24 p-6 rounded-2xl shadow-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            {!isEnrolled ? (
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <span className="text-3xl font-extrabold text-primary">
                            {isFree ? 'Free' : currencyFormater(course.price)}
                        </span>
                    </div>
                    
                    <button 
                        className={`w-full py-4 rounded-xl flex justify-center items-center shadow-[0_4px_12px_rgba(37,99,235,0.2)] border-none transition-transform hover:-translate-y-1 ${course.is_enrollment_closed ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary cursor-pointer hover:opacity-90'}`}
                        onClick={handleEnrollOrPlay}
                    >
                        <span className="text-white text-lg font-bold">
                            {course.is_enrollment_closed ? 'Enrollment Closed' : 'Enroll Now'}
                        </span>
                    </button>

                    <div className="flex flex-row gap-3">
                        <button className={`flex-1 py-3 rounded-xl flex justify-center items-center border cursor-pointer transition-colors ${isDarkMode ? 'border-gray-600 hover:bg-gray-700 text-gray-50' : 'border-gray-200 hover:bg-gray-50 text-gray-900'}`} onClick={handleShare}>
                            <Share2 size={20} className="mr-2" />
                            <span className="font-semibold">Share</span>
                        </button>
                        <button className={`flex-1 py-3 rounded-xl flex justify-center items-center border cursor-pointer transition-colors ${isDarkMode ? 'border-gray-600 hover:bg-gray-700 text-gray-50' : 'border-gray-200 hover:bg-gray-50 text-gray-900'}`}>
                            <Heart size={20} className="mr-2" />
                            <span className="font-semibold">Save</span>
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    <button 
                        className={`w-full py-4 rounded-xl flex flex-row justify-center items-center gap-2 border-none cursor-pointer transition-transform hover:-translate-y-1 ${isExpired ? 'bg-red-500 hover:opacity-90 shadow-[0_4px_12px_rgba(239,68,68,0.2)]' : 'bg-primary hover:opacity-90 shadow-[0_4px_12px_rgba(37,99,235,0.2)]'}`}
                        onClick={handleEnrollOrPlay}
                    >
                        {isExpired ? (
                            <>
                                <Clock size={20} color="#fff" />
                                <span className="text-white text-lg font-bold">Renew Access</span>
                            </>
                        ) : (
                            <>
                                <Play size={20} color="#fff" fill="#fff" />
                                <span className="text-white text-lg font-bold">Resume Learning</span>
                            </>
                        )}
                    </button>
                </div>
            )}
            
            {/* Move Key Features to the sidebar if not enrolled, or keep them here always */}
            <div className="mt-8 border-t pt-6" style={{ borderColor: isDarkMode ? '#374151' : '#e5e7eb' }}>
                <span className={`text-lg font-bold mb-4 block ${isDarkMode ? 'text-gray-50' : 'text-gray-900'}`}>This course includes</span>
                <div className="flex flex-col gap-4">
                    <FeatureItem icon={<Award size={20} className="text-primary" />} title="Certificate of completion" isDarkMode={isDarkMode} />
                    <FeatureItem icon={<Clock size={20} className="text-primary" />} title={isEnrolled && isExpired ? 'Access Expired' : (expiryInfo || (course.expiry_days ? `${course.expiry_days} days access` : 'Lifetime access'))} isDarkMode={isDarkMode} />
                    <FeatureItem icon={<AlertCircle size={20} className="text-primary" />} title="Quizzes and practice tests" isDarkMode={isDarkMode} />
                </div>
            </div>
        </div>
    </div>
  </div>
</div>
  );
}

function FeatureItem({ icon, title, isDarkMode }: any) {
  return (
    <div className="flex flex-row items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex justify-center items-center ${isDarkMode ? 'bg-primary/20' : 'bg-primary/10'}`}>
            {icon}
        </div>
        <span className={`text-base font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{title}</span>
    </div>
  );
}
