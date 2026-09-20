import { useNavigate, useLocation } from 'react-router-dom';
import React, { useState, useEffect, useMemo } from 'react';
import {
    Play, Clock, Users, Star, CheckCircle, CheckCircle2, Lock,
    ChevronDown, ChevronUp, Share2, Heart, Award, FileText,
    AlertCircle, Video
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useCourseStore } from '../store/courseStore';
import { formatDuration, currencyFormater, renderMarkdownAndHTML } from '../lib/utils';
import { Header } from '../components/Header';
import { useTheme } from '../hooks/useTheme';
import { supabase } from '../lib/supabase';
import { LiveCountdown, LiveViewerBadge } from '../components/LiveCountdown';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';

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

    const [reviews, setReviews] = useState<any[]>([]);
    const [hasReviewed, setHasReviewed] = useState(false);
    const [submittingReview, setSubmittingReview] = useState(false);
    const [userRating, setUserRating] = useState(5);
    const [userComment, setUserComment] = useState('');
    const [loadingReviews, setLoadingReviews] = useState(false);

    const fetchReviews = async () => {
        if (!course) return;
        setLoadingReviews(true);
        try {
            const { data, error } = await supabase
                .from('course_reviews')
                .select('*, user:users(name, profile_image)')
                .eq('course_id', course.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (data) {
                setReviews(data);
                if (user) {
                    const found = data.some((r: any) => r.user_id === user.id);
                    setHasReviewed(found);
                }
            }
        } catch (e) {
            console.warn('Error fetching course reviews:', e);
        } finally {
            setLoadingReviews(false);
        }
    };

    const handleSubmitReview = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            alert('You must be logged in to submit a review.');
            return;
        }
        if (!isEnrolled) {
            alert('You must be enrolled in the course to write a review.');
            return;
        }
        if (hasReviewed) {
            alert('You have already reviewed this course.');
            return;
        }

        setSubmittingReview(true);
        try {
            const { error } = await supabase
                .from('course_reviews')
                .insert({
                    course_id: course.id,
                    user_id: user.id,
                    rating: userRating,
                    comment: userComment.trim()
                });

            if (error) throw error;

            alert('Thank you for your review!');
            setUserComment('');
            setUserRating(5);
            
            await fetchReviews();
            
            // Recalculate average rating locally
            const { data: allReviews } = await supabase
                .from('course_reviews')
                .select('rating')
                .eq('course_id', course.id);
                
            if (allReviews) {
                const total = allReviews.reduce((sum, r) => sum + r.rating, 0);
                const avg = allReviews.length > 0 ? Number((total / allReviews.length).toFixed(1)) : 4.5;
                setCourse((prev: any) => ({
                    ...prev,
                    rating: avg,
                    reviewsCount: allReviews.length
                }));
            }
        } catch (e: any) {
            console.error('Error submitting review:', e);
            alert(e.message || 'Failed to submit review.');
        } finally {
            setSubmittingReview(false);
        }
    };

    const renderInteractiveStars = () => {
        return (
            <div className="flex flex-row gap-1.5 my-2">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        type="button"
                        onClick={() => setUserRating(star)}
                        className="bg-transparent border-none cursor-pointer p-0"
                    >
                        <Star
                            size={28}
                            className={star <= userRating ? 'text-amber-500 fill-amber-500' : 'text-gray-300 dark:text-gray-600'}
                            fill={star <= userRating ? '#f59e0b' : 'none'}
                        />
                    </button>
                ))}
            </div>
        );
    };

    const renderStars = (ratingVal: number) => {
        return (
            <div className="flex flex-row gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                        key={star}
                        size={14}
                        className={star <= ratingVal ? 'text-amber-500 fill-amber-500' : 'text-gray-300 dark:text-gray-600'}
                        fill={star <= ratingVal ? '#f59e0b' : 'none'}
                    />
                ))}
            </div>
        );
    };

    useEffect(() => {
        if (!course) {
            navigate(-1);
            return;
        }

        const fetchCourseDetails = async () => {
            try {
                const { data, error } = await supabase
                    .from('courses')
                    .select(`
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
                        instructor_id,
                        instructors (
                            name,
                            profile_image,
                            bio
                        ),
                        teacher:users!teacher_id (
                            name,
                            profile_image,
                            bio
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
                            is_published,
                            attachments (*),
                            lessons (*)
                        )
                    `)
                    .eq('id', course.id)
                    .single();

                if (error) throw error;
                if (data) {
                    const filteredChapters = (data.chapters || [])
                        .filter((ch: any) => ch.is_published !== false)
                        .map((ch: any) => ({
                            ...ch,
                            lessons: (ch.lessons || []).filter((l: any) => l.is_published !== false)
                        }));
                    const normalized = {
                        ...data,
                        chapters: filteredChapters,
                        teacher: Array.isArray(data.teacher) ? data.teacher[0] : data.teacher
                    };
                    setCourse((prev: any) => ({ ...prev, ...normalized }));
                }
            } catch (error) {
                console.error('Error fetching course details:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchCourseDetails();
        fetchReviews();
        if (user) {
            checkEnrollment();
        } else {
            setLoading(false);
        }
    }, [user, course?.id, myCourses]);

    const checkEnrollment = async () => {
        try {
            let enrolledCourse = myCourses.find(c => c.id === course.id);

            if (!enrolledCourse && user) {
                const { data: purchaseData, error } = await supabase
                    .from('purchases')
                    .select('*')
                    .eq('course_id', course.id)
                    .eq('user_id', user.id)
                    .eq('status', 'success')
                    .maybeSingle();

                if (purchaseData) {
                    enrolledCourse = {
                        ...course,
                        enrollment: {
                            expiry_date: purchaseData.expiry_date
                        }
                    };
                }
            }

            if (enrolledCourse) {
                setIsEnrolled(true);
                setCourse((prev: any) => ({ ...prev, ...enrolledCourse }));

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
                    url: `https://lms.br31tech.in/course/${course.id}`,
                });
            } else {
                navigator.clipboard.writeText(`https://lms.br31tech.in/course/${course.id}`);
                alert('Link copied to clipboard!');
            }
        } catch (error: any) {
            console.error(error.message);
        }
    };

    if (!course) return null;

    const publishedChapters = (course.chapters || []).filter((ch: any) => ch.is_published !== false);
    const totalLessons = publishedChapters.length;
    const totalSeconds = publishedChapters.reduce((sum: number, ch: any) => sum + (ch.duration || 0), 0);
    const duration = formatDuration(totalSeconds);
    const enrolledStudents = parseInt(course.purchases_count?.toString() || course.enrollments_count?.toString() || '0', 10);
    const rating = course.rating || 4.5;
    const reviewsCount = course.reviewsCount || 0;

    const completedCount = isEnrolled ? (progress[course.id]?.length || 0) : 0;
    const progressPercentage = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
    const isFree = !course.price || course.price === 0;

    const toggleSection = (id: string) => {
        setExpandedSection(expandedSection === id ? null : id);
    };

    const isChapterLive = (ch: any) => {
        if (!ch) return false;
        const status = (ch.live_status || '').toUpperCase();
        if (status === 'ENDED' || status === 'RECORDED' || status === 'CONCLUDED') return false;

        const startsAt = ch.live_starts_at ? new Date(ch.live_starts_at).getTime() : null;
        const endsAt = ch.live_ends_at ? new Date(ch.live_ends_at).getTime() : null;
        const now = Date.now();

        // If explicitly set to LIVE status
        if (status === 'LIVE') {
            if (endsAt && endsAt <= now) return false;
            return true;
        }

        // If scheduled or is_live flag: strictly check the time window
        if (ch.is_live || status === 'SCHEDULED' || startsAt) {
            if (endsAt && endsAt <= now) return false; // ended
            if (startsAt && startsAt > now) return false; // scheduled in the future, not live yet
            if (startsAt && startsAt <= now && (!endsAt || endsAt > now)) return true; // currently inside live window
            if (ch.is_live && !startsAt && (!endsAt || endsAt > now)) return true;
        }

        return false;
    };

    const isChapterRecordedLive = (ch: any) => {
        if (!ch) return false;
        const status = (ch.live_status || '').toUpperCase();
        if (status === 'ENDED' || status === 'RECORDED' || status === 'CONCLUDED') return true;

        const endsAt = ch.live_ends_at ? new Date(ch.live_ends_at).getTime() : null;
        const now = Date.now();

        if (endsAt && endsAt <= now && status !== 'LIVE') return true;
        if ((ch.is_live || ch.live_starts_at) && !isChapterLive(ch) && !isChapterScheduled(ch)) return true;

        return false;
    };

    const isChapterScheduled = (ch: any) => {
        if (!ch) return false;
        const status = (ch.live_status || '').toUpperCase();
        if (status === 'ENDED' || status === 'RECORDED' || status === 'CONCLUDED' || status === 'LIVE') return false;

        const startsAt = ch.live_starts_at ? new Date(ch.live_starts_at).getTime() : null;
        const now = Date.now();

        if (status === 'SCHEDULED' && (!startsAt || startsAt > now)) return true;
        if ((ch.is_live || ch.live_starts_at) && startsAt && startsAt > now) return true;

        return false;
    };

    // Compile specific tab items
    const liveChapters = publishedChapters
        .filter((ch: any) => ch.is_live || ch.live_status === 'LIVE' || ch.live_status === 'SCHEDULED' || ch.live_starts_at || ch.live_status === 'ENDED')
        .sort((a: any, b: any) => (a.position || 0) - (b.position || 0));

    const ongoingLiveChapters = liveChapters.filter((ch: any) => isChapterLive(ch));
    const hasOngoingLive = ongoingLiveChapters.length > 0;

    // Lessons tab displays regular chapters + ended/recorded live classes + active live classes
    const regularChapters = publishedChapters
        .filter((ch: any) => !isChapterScheduled(ch))
        .sort((a: any, b: any) => (a.position || 0) - (b.position || 0));

    const allAttachments = publishedChapters.reduce((acc: any[], chapter: any) => {
        if (Array.isArray(chapter.attachments)) {
            chapter.attachments.forEach((att: any) => {
                if (!acc.some(existing => existing.id === att.id)) {
                    acc.push({ ...att, chapterTitle: chapter.title });
                }
            });
        }
        return acc;
    }, []);

    const formattedDescription = useMemo(() => {
        if (!course?.description) return 'No description available for this course.';
        let desc = course.description;
        desc = desc.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        
        // Ensure section headers like "🎯 What You'll Learn", "📌 Useful For", "📚 ..." have spacing and markdown heading syntax
        desc = desc.replace(/(\n|^)(🎯|📌|📚|💡|🔍|⭐|🔥|✅|⚡)\s*([^\n]+)/g, '\n\n### $2 $3\n');
        
        // Ensure bullet points (📖, 🔄, 🧠, ✍️, 📊, 🚀, •, -) start on their own lines as list items
        desc = desc.replace(/([^\n])\s*(📖|🔄|🧠|✍️|📊|🚀|🔹|▪️|•)\s*/g, '$1\n- $2 ');
        
        return desc.trim();
    }, [course?.description]);

    return (
        <div className={`flex flex-col min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
            <Header title={course.title} showBack={true} />

            {/* Hero Banner Section */}
            <div className={`border-b ${isDarkMode ? 'bg-gray-800/20 border-gray-800' : 'bg-white border-gray-200'}`}>
                <div className="max-w-7xl mx-auto w-full px-4 md:px-8 py-8 flex flex-col md:flex-row gap-8 items-center md:items-start">
                    {/* Course Poster */}
                    <div className="w-full md:w-[360px] lg:w-[400px] xl:w-[440px] shrink-0">
                        <div className="relative overflow-hidden aspect-[16/10] w-full bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-md">
                            <img
                                src={course.thumbnail_url || 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=1200&q=80'}
                                alt={course.title}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    </div>

                    {/* Course Header Details */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch">
                        <div>
                            <div className="flex flex-row items-center gap-3 mb-3 flex-wrap">
                                <div className="px-2.5 py-1 rounded-md bg-primary/10">
                                    <span className="text-primary text-xs font-bold uppercase tracking-wider">{course.video_subject || 'General'}</span>
                                </div>
                                {hasOngoingLive && (
                                    <div className="flex items-center gap-1.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-[10px] font-bold tracking-wide px-2.5 py-0.5 rounded-full">
                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                                        Live Class Active
                                    </div>
                                )}
                                <div className="flex flex-row items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                                    <Star size={14} className="text-amber-500" fill="#f59e0b" />
                                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400">{rating}</span>
                                    <span className="text-[10px] text-amber-500 dark:text-amber-400/80">({reviewsCount})</span>
                                </div>
                            </div>

                            <h1 className={`text-2xl md:text-3xl font-extrabold leading-tight mb-4 ${isDarkMode ? 'text-gray-50' : 'text-gray-900'}`}>
                                {course.title}
                            </h1>

                            <div className="flex flex-row items-center gap-4 mb-6 flex-wrap">
                                <div className="flex flex-row items-center gap-1.5 text-textLight">
                                    <Clock size={16} className="text-primary/70" />
                                    <span className="text-sm font-medium">{duration}</span>
                                </div>
                                <div className={`w-1 h-1 rounded-full ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`} />
                                <div className="flex flex-row items-center gap-1.5 text-textLight">
                                    <FileText size={16} className="text-secondary/70" />
                                    <span className="text-sm font-medium">{totalLessons} Lessons</span>
                                </div>
                                <div className={`w-1 h-1 rounded-full ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`} />
                                <div className="flex flex-row items-center gap-1.5 text-textLight">
                                    <Users size={16} className="text-success/70" />
                                    <span className="text-sm font-medium">{enrolledStudents} Students</span>
                                </div>
                            </div>

                            {/* Course Inclusions inside Banner */}
                            <div className="flex flex-row items-center gap-6 mt-1 mb-5 flex-wrap">
                                <div className="flex flex-row items-center gap-2">
                                    <div className={`w-7 h-7 rounded-full flex justify-center items-center ${isDarkMode ? 'bg-primary/20' : 'bg-primary/10'}`}>
                                        <Award size={14} className="text-primary" />
                                    </div>
                                    <span className={`text-xs font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-650'}`}>Certificate of completion</span>
                                </div>
                                <div className="flex flex-row items-center gap-2">
                                    <div className={`w-7 h-7 rounded-full flex justify-center items-center ${isDarkMode ? 'bg-primary/20' : 'bg-primary/10'}`}>
                                        <Clock size={14} className="text-primary" />
                                    </div>
                                    <span className={`text-xs font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-650'}`}>
                                        {isEnrolled && isExpired ? 'Access Expired' : (expiryInfo || (course.expiry_days ? `${course.expiry_days} days access` : 'Lifetime access'))}
                                    </span>
                                </div>
                                <div className="flex flex-row items-center gap-2">
                                    <div className={`w-7 h-7 rounded-full flex justify-center items-center ${isDarkMode ? 'bg-primary/20' : 'bg-primary/10'}`}>
                                        <AlertCircle size={14} className="text-primary" />
                                    </div>
                                    <span className={`text-xs font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-650'}`}>Live doubt support & Resources</span>
                                </div>
                            </div>
                        </div>

                        {/* Instructor Quick Profile */}
                        <div className="flex items-center pt-4 border-t border-border mt-auto">
                            <img
                                src={course.instructors?.profile_image || course.teacher?.profile_image || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(course.instructors?.name || course.teacher?.name || course.instructor_name || 'Instructor') + '&background=random'}
                                alt={course.instructors?.name || course.teacher?.name || course.instructor_name || 'Instructor'}
                                className="w-12 h-12 rounded-full mr-4 ring-2 ring-primary/30 object-cover"
                            />
                            <div className="flex flex-col flex-1">
                                <span className={`text-base font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-950'}`}>
                                    {course.instructors?.name || course.teacher?.name || course.instructor_name || 'Instructor'}
                                </span>
                                <span className={`text-xs mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} line-clamp-2`}>
                                    {course.instructors?.bio || course.teacher?.bio || 'Course Faculty / Specialist'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-8 py-6 flex flex-col lg:flex-row gap-8">

                {/* Left Column - Main Tabs Details */}
                <div className="flex-1 min-w-0 flex flex-col">

                    {/* Ongoing Live Class Soothing Card */}
                    {hasOngoingLive && (
                        <div className="mb-6 p-4 rounded-2xl bg-rose-500/5 dark:bg-rose-950/20 border border-rose-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                                    <Play size={14} fill="currentColor" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                                            {ongoingLiveChapters[0]?.title}
                                        </span>
                                        <span className="bg-rose-600 text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.2 rounded-full">
                                            Live Now
                                        </span>
                                    </div>
                                    <p className={`text-xs mt-0.5 m-0 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                        Interactive lecture is streaming live. Click below to join.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    if (isEnrolled && !isExpired) {
                                        navigate('/chapterplayer', {
                                            state: {
                                                courseId: course.id,
                                                chapterId: ongoingLiveChapters[0]?.id,
                                                chapter: ongoingLiveChapters[0],
                                                courseTitle: course.title,
                                                hasAccess: true,
                                                autoPlay: true
                                            }
                                        });
                                    } else if (!isEnrolled) {
                                        handleEnrollOrPlay();
                                    } else {
                                        alert('Please renew your access to join this live session.');
                                    }
                                }}
                                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs border-none cursor-pointer transition-all shadow-sm flex items-center gap-2 flex-shrink-0"
                            >
                                <Play size={13} fill="currentColor" />
                                Join Class
                            </button>
                        </div>
                    )}

                    {/* Tabs Header */}
                    <div className="flex flex-row border-b mb-6" style={{ borderColor: isDarkMode ? '#374151' : '#e5e7eb' }}>
                        {['About', 'Lessons', 'Attachments', 'Live', 'Reviews'].map((tab) => {
                            const isLiveTab = tab === 'Live';
                            const isSelected = activeTab === tab;

                            return (
                                <button
                                    key={tab}
                                    className={`flex-1 py-3.5 border-b-2 cursor-pointer transition-all bg-transparent border-none flex items-center justify-center gap-2 ${isSelected ? 'border-primary' : 'border-transparent hover:border-gray-300 dark:hover:border-gray-700'}`}
                                    onClick={() => setActiveTab(tab)}
                                >
                                    <span className={`text-sm font-bold text-center ${isSelected ? 'text-primary' : (isDarkMode ? 'text-gray-400' : 'text-gray-500')}`}>
                                        {tab}
                                    </span>
                                    {isLiveTab && hasOngoingLive && (
                                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                                    )}
                                    {isLiveTab && !hasOngoingLive && liveChapters.length > 0 && (
                                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-primary/20 text-primary' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                                            {liveChapters.length}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    <div className="pb-24">
                        {activeTab === 'About' && (
                            <div className="flex flex-col">
                                <span className={`text-lg font-extrabold mb-4 ${isDarkMode ? 'text-gray-50' : 'text-gray-900'}`}>About this course</span>

                                <div className={`text-sm leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                    <ReactMarkdown
                                        rehypePlugins={[rehypeRaw]}
                                        components={{
                                            h1: ({ node, ...props }) => <h1 className="text-xl font-black mt-5 mb-2.5 text-primary flex items-center gap-2" {...props} />,
                                            h2: ({ node, ...props }) => <h2 className="text-lg font-extrabold mt-4 mb-2 text-primary flex items-center gap-2" {...props} />,
                                            h3: ({ node, ...props }) => <h3 className="text-base font-bold mt-4 mb-2 text-primary flex items-center gap-2" {...props} />,
                                            h4: ({ node, ...props }) => <h4 className="text-sm font-bold mt-3 mb-1.5 text-gray-800 dark:text-gray-200" {...props} />,
                                            p: ({ node, ...props }) => <p className="mb-3.5 leading-relaxed whitespace-pre-line text-sm" {...props} />,
                                            ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-4 space-y-1.5 text-sm" {...props} />,
                                            ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-4 space-y-1.5 text-sm" {...props} />,
                                            li: ({ node, ...props }) => <li className="leading-relaxed pl-1" {...props} />,
                                            strong: ({ node, ...props }) => <strong className="font-extrabold text-primary" {...props} />,
                                            a: ({ node, ...props }) => <a className="text-primary font-bold hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
                                            blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-primary/50 pl-4 py-1.5 my-3 bg-primary/5 rounded-r-lg italic text-gray-700 dark:text-gray-300" {...props} />,
                                            hr: ({ node, ...props }) => <hr className="my-4 border-gray-200 dark:border-gray-700" {...props} />,
                                        }}
                                    >
                                        {formattedDescription}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        )}

                        {activeTab === 'Lessons' && (
                            <div className="flex flex-col gap-3">
                                {regularChapters.length > 0 ? (
                                    regularChapters.map((chapter: any, index: number) => {
                                        const isExpanded = expandedSection === chapter.id;
                                        const isCompleted = isEnrolled && progress[course.id]?.includes(chapter.id);
                                        const isLive = isChapterLive(chapter);
                                        const isRecorded = isChapterRecordedLive(chapter);

                                        return (
                                            <div key={chapter.id} className={`rounded-2xl overflow-hidden border transition-all duration-300 ${isLive ? 'border-rose-500/40 bg-rose-500/5' : isRecorded ? (isDarkMode ? 'bg-gray-800/50 border-indigo-500/30' : 'bg-white border-indigo-100 shadow-sm') : (isDarkMode ? 'bg-gray-800/40 border-gray-700 shadow-sm' : 'bg-white border-gray-100 shadow-sm')}`}>
                                                <button
                                                    className="w-full flex flex-row items-center p-4 bg-transparent border-none cursor-pointer text-left"
                                                    onClick={() => toggleSection(chapter.id)}
                                                >
                                                    <div className={`w-8 h-8 rounded-xl flex justify-center items-center mr-3 ${isCompleted ? 'bg-green-500/10' : isLive ? 'bg-rose-500/15 text-rose-600' : isRecorded ? 'bg-indigo-500/15 text-indigo-500' : (isDarkMode ? 'bg-gray-800' : 'bg-gray-100')}`}>
                                                        {isCompleted ? (
                                                            <CheckCircle size={16} className="text-green-500" />
                                                        ) : isLive ? (
                                                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                                                        ) : (
                                                            <span className={`text-xs font-bold ${isRecorded ? 'text-indigo-600 dark:text-indigo-400' : isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{index + 1}</span>
                                                        )}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className={`text-sm font-extrabold block leading-tight ${isDarkMode ? 'text-gray-50' : 'text-gray-800'}`}>
                                                                {chapter.title}
                                                            </span>
                                                            {isLive && (
                                                                <span className="bg-rose-500/15 text-rose-600 dark:text-rose-400 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-rose-500/20">
                                                                    ● Live
                                                                </span>
                                                            )}
                                                            {isRecorded && (
                                                                <span className="bg-indigo-600/15 text-indigo-600 dark:text-indigo-400 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-indigo-500/20">
                                                                    📹 Recorded Live
                                                                </span>
                                                            )}
                                                            {chapter.is_demo && !isLive && !isRecorded && (
                                                                <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded ml-1 align-middle">
                                                                    Preview
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-row items-center mt-1 mb-1">
                                                            <span className={`text-[10px] font-bold ${isLive ? 'text-rose-500' : isRecorded ? 'text-indigo-600 dark:text-indigo-400' : isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                                                {isLive ? 'Live Class Streaming' : isRecorded ? `Recorded Live • ${formatDuration(chapter.duration || 0)}` : `Video • ${formatDuration(chapter.duration || 0)}`}
                                                            </span>
                                                        </div>
                                                        {chapter.description && (
                                                            <div className={`text-xs mt-1 line-clamp-2 pr-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                                <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                                                                    {chapter.description}
                                                                </ReactMarkdown>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {isExpanded ? (
                                                        <ChevronUp size={18} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                                                    ) : (
                                                        <ChevronDown size={18} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                                                    )}
                                                </button>

                                                {isExpanded && (
                                                    <div className={`p-4 pt-0 ${isDarkMode ? 'bg-gray-800/20' : 'bg-gray-5'}`}>
                                                        <div className={`text-xs leading-relaxed mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                            {chapter.description ? (
                                                                <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                                                                    {chapter.description}
                                                                </ReactMarkdown>
                                                            ) : 'In this lesson, we will cover the foundational concepts related to this topic.'}
                                                        </div>
                                                        {(!chapter.lessons || chapter.lessons.length === 0 || chapter.video_url) && (
                                                            <button
                                                                className={`w-full py-2.5 rounded-xl flex flex-row justify-center items-center gap-2 border-none transition-all duration-300 font-bold text-xs uppercase tracking-wider cursor-pointer ${
                                                                    isEnrolled && !isExpired 
                                                                        ? isLive 
                                                                            ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm'
                                                                            : isRecorded 
                                                                                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                                                                                : 'bg-primary/10 text-primary hover:bg-primary/15' 
                                                                        : (isDarkMode ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-500 cursor-not-allowed')
                                                                }`}
                                                                onClick={() => {
                                                                    if (isEnrolled && !isExpired) {
                                                                        navigate('/chapterplayer', { state: { courseId: course.id, chapterId: chapter.id } });
                                                                    }
                                                                }}
                                                            >
                                                                {isEnrolled && !isExpired ? (
                                                                    <>
                                                                        <Play size={14} className={isLive || isRecorded ? 'text-white' : 'text-primary'} fill="currentColor" />
                                                                        <span>{isLive ? 'Join Live Class' : isRecorded ? 'Play Recorded Live' : `Play ${chapter.lessons && chapter.lessons.length > 0 ? 'Chapter Video' : 'Lesson'}`}</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Lock size={14} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                                                                        <span>Locked</span>
                                                                    </>
                                                                )}
                                                            </button>
                                                        )}
                                                        {chapter.lessons && chapter.lessons.filter((l: any) => l.is_published !== false).length > 0 && (
                                                            <div className="mt-4 flex flex-col gap-2">
                                                                {chapter.lessons
                                                                    .filter((l: any) => l.is_published !== false)
                                                                    .sort((a: any, b: any) => (a.position || 0) - (b.position || 0))
                                                                    .map((lesson: any, lIndex: number) => (
                                                                    <div key={lesson.id} className={`flex items-center justify-between p-3 rounded-lg border ${isDarkMode ? 'bg-gray-800/60 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                                                                        <div className="flex items-center gap-3">
                                                                            <div className={`w-6 h-6 rounded-full flex justify-center items-center ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                                                                                <span className={`text-[10px] font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{lIndex + 1}</span>
                                                                            </div>
                                                                            <div>
                                                                                <span className={`text-sm font-bold block ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{lesson.title}</span>
                                                                                <span className={`text-[10px] block ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>{formatDuration(lesson.duration || 0)}</span>
                                                                            </div>
                                                                        </div>
                                                                        <button
                                                                            onClick={() => {
                                                                                if (isEnrolled && !isExpired) {
                                                                                    navigate('/chapterplayer', { state: { courseId: course.id, chapterId: chapter.id, lessonId: lesson.id } });
                                                                                }
                                                                            }}
                                                                            className={`px-3 py-1.5 border-none cursor-pointer rounded-lg text-xs font-bold transition-colors ${isEnrolled && !isExpired ? 'bg-primary/10 text-primary hover:bg-primary/20' : (isDarkMode ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-200 text-gray-400 cursor-not-allowed')}`}
                                                                        >
                                                                            Play
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="py-12 flex flex-col justify-center items-center border border-dashed rounded-2xl border-border">
                                        <Play size={36} className="text-textLight opacity-40 mb-2" />
                                        <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>No video lessons available yet.</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'Attachments' && (
                            <div className="flex flex-col gap-4">
                                <span className={`text-lg font-extrabold mb-1 ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>Course Resources</span>
                                <p className={`text-xs mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    Download or view core attachments, study resources, and cheat sheets uploaded for this course.
                                </p>

                                {allAttachments.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {allAttachments.map((att: any) => (
                                            <div
                                                key={att.id}
                                                className={`p-4 rounded-2xl border flex flex-col justify-between transition-all duration-300 hover:shadow-md ${isDarkMode ? 'bg-gray-800/40 border-gray-700' : 'bg-white border-gray-100'}`}
                                            >
                                                <div className="flex items-start gap-3 mb-4">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isDarkMode ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'}`}>
                                                        <FileText size={20} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <span className={`text-sm font-extrabold block truncate ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`} title={att.title}>
                                                            {att.title}
                                                        </span>
                                                        <span className={`text-[10px] font-medium block mt-0.5 truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                            Chapter: {att.chapterTitle}
                                                        </span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => navigate('/attachmentviewer', { state: { url: att.file_url, title: att.title, type: att.file_type } })}
                                                    className="w-full py-2.5 rounded-xl bg-primary text-white text-xs font-bold uppercase tracking-wider text-center cursor-pointer hover:bg-primary/95 transition-colors border-none"
                                                >
                                                    View Resource
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-12 flex flex-col justify-center items-center border border-dashed rounded-2xl border-border">
                                        <FileText size={36} className="text-textLight opacity-40 mb-2" />
                                        <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>No attachments available for this course.</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'Live' && (
                            <div className="flex flex-col gap-4">
                                <span className={`text-lg font-extrabold mb-1 ${isDarkMode ? 'text-gray-50' : 'text-gray-800'}`}>Live Interactive Classes</span>
                                <p className={`text-xs mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    Live classes, interactive doubt breakdowns, and past recorded live archives for this course.
                                </p>

                                {liveChapters.length > 0 ? (
                                    <div className="flex flex-col gap-4">
                                        {liveChapters.map((chapter: any) => {
                                            const isLive = isChapterLive(chapter);
                                            const isRecorded = isChapterRecordedLive(chapter);
                                            const isScheduled = isChapterScheduled(chapter);
                                            const hasVideoRecording = Boolean(chapter.video_url || chapter.stream_url);

                                            return (
                                                <div
                                                    key={chapter.id}
                                                    className={`p-5 rounded-2xl border transition-all duration-300 hover:shadow-md ${
                                                        isLive
                                                            ? 'border-red-500 bg-red-500/5 dark:bg-red-500/10 shadow-lg shadow-red-500/10'
                                                            : isRecorded
                                                                ? (isDarkMode ? 'border-indigo-500/30 bg-indigo-950/20' : 'border-indigo-200 bg-indigo-50/50')
                                                                : (isDarkMode ? 'bg-gray-800/40 border-gray-700' : 'bg-white border-gray-100')
                                                    }`}
                                                >
                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                {isLive && (
                                                                    <LiveViewerBadge size="sm" isDarkMode={isDarkMode} />
                                                                )}
                                                                {isRecorded && (
                                                                    <span className="flex items-center gap-1 bg-indigo-600 text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                                                                        <Video size={10} />
                                                                        📹 Recorded Live Class
                                                                    </span>
                                                                )}
                                                                {isScheduled && (
                                                                    <LiveCountdown targetDate={chapter.live_starts_at} variant="badge" isDarkMode={isDarkMode} />
                                                                )}
                                                            </div>
                                                            <h4 className={`text-sm font-extrabold ${isDarkMode ? 'text-gray-50' : 'text-gray-900'}`}>{chapter.title}</h4>
                                                            <p className={`text-xs mt-1.5 leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                                {chapter.description || (isRecorded ? 'Recorded archive of the live interactive lecture.' : 'Live interactive lecture for topic mastery.')}
                                                            </p>
                                                            <div className="flex flex-row items-center gap-2 mt-4 text-[10px] font-bold text-textLight">
                                                                <Clock size={14} className={isLive ? 'text-red-500' : isRecorded ? 'text-indigo-500' : 'text-primary/70'} />
                                                                <span>
                                                                    {isRecorded
                                                                        ? `Concluded: ${chapter.live_ends_at ? new Date(chapter.live_ends_at).toLocaleString() : (chapter.live_starts_at ? new Date(chapter.live_starts_at).toLocaleDateString() : 'Completed')}`
                                                                        : `Starts: ${chapter.live_starts_at ? new Date(chapter.live_starts_at).toLocaleString() : 'TBD'}`}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Action Buttons: Join when LIVE, Watch Recording when recorded, Enter Live Session when scheduled */}
                                                        {isLive ? (
                                                            <button
                                                                onClick={() => {
                                                                    if (!user) {
                                                                        alert('Please log in to join this session.');
                                                                        return;
                                                                    }
                                                                    if (!isEnrolled) {
                                                                        handleEnrollOrPlay();
                                                                        return;
                                                                    }
                                                                    if (isExpired) {
                                                                        alert('Your course access has expired. Please renew your enrollment.');
                                                                        return;
                                                                    }
                                                                    navigate('/chapterplayer', {
                                                                        state: {
                                                                            courseId: course.id,
                                                                            chapterId: chapter.id,
                                                                            chapter: chapter,
                                                                            courseTitle: course.title,
                                                                            hasAccess: true,
                                                                            autoPlay: true
                                                                        }
                                                                    });
                                                                }}
                                                                className="px-5 py-3 rounded-xl font-extrabold text-xs uppercase tracking-wider text-center border-none transition-all duration-300 bg-red-600 hover:bg-red-700 text-white cursor-pointer shadow-lg shadow-red-600/30 animate-pulse flex items-center justify-center gap-2 flex-shrink-0"
                                                            >
                                                                <Play size={14} fill="#fff" />
                                                                Join Live Class Now
                                                            </button>
                                                        ) : isRecorded && hasVideoRecording ? (
                                                            <button
                                                                onClick={() => {
                                                                    if (!user) {
                                                                        alert('Please log in to watch this recording.');
                                                                        return;
                                                                    }
                                                                    if (!isEnrolled) {
                                                                        handleEnrollOrPlay();
                                                                        return;
                                                                    }
                                                                    if (isExpired) {
                                                                        alert('Your course access has expired. Please renew your enrollment.');
                                                                        return;
                                                                    }
                                                                    navigate('/chapterplayer', {
                                                                        state: {
                                                                            courseId: course.id,
                                                                            chapterId: chapter.id,
                                                                            chapter: chapter,
                                                                            courseTitle: course.title,
                                                                            hasAccess: true,
                                                                            autoPlay: true
                                                                        }
                                                                    });
                                                                }}
                                                                className="px-5 py-3 rounded-xl font-extrabold text-xs uppercase tracking-wider text-center border-none transition-all duration-300 bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 flex-shrink-0"
                                                            >
                                                                <Play size={14} fill="#fff" />
                                                                Watch Recording
                                                            </button>
                                                        ) : isRecorded && !hasVideoRecording ? (
                                                            <div className="px-4 py-2 rounded-xl bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs font-bold flex items-center gap-1.5 flex-shrink-0">
                                                                <CheckCircle2 size={13} />
                                                                Session Concluded
                                                            </div>
                                                        ) : isScheduled ? (
                                                            <button
                                                                onClick={() => {
                                                                    if (!user) {
                                                                        alert('Please log in to enter the live session.');
                                                                        return;
                                                                    }
                                                                    if (!isEnrolled) {
                                                                        handleEnrollOrPlay();
                                                                        return;
                                                                    }
                                                                    if (isExpired) {
                                                                        alert('Your course access has expired. Please renew your enrollment.');
                                                                        return;
                                                                    }
                                                                    navigate('/chapterplayer', {
                                                                        state: {
                                                                            courseId: course.id,
                                                                            chapterId: chapter.id,
                                                                            chapter: chapter,
                                                                            courseTitle: course.title,
                                                                            hasAccess: true,
                                                                            autoPlay: true
                                                                        }
                                                                    });
                                                                }}
                                                                className="px-5 py-3 rounded-xl font-extrabold text-xs uppercase tracking-wider text-center border-none transition-all duration-300 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white cursor-pointer shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 flex-shrink-0"
                                                            >
                                                                <Play size={14} fill="#fff" />
                                                                🔥 Live Soon • Enter Live Session
                                                            </button>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="py-12 flex flex-col justify-center items-center border border-dashed rounded-2xl border-border">
                                        <Users size={36} className="text-textLight opacity-40 mb-2" />
                                        <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>No live sessions scheduled.</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'Reviews' && (
                            <div className="flex flex-col gap-6">
                                <span className={`text-lg font-extrabold mb-1 ${isDarkMode ? 'text-gray-50' : 'text-gray-800'}`}>
                                    Course Reviews
                                </span>

                                {/* Submit review form */}
                                {isEnrolled && !isExpired && !hasReviewed && (
                                    <form onSubmit={handleSubmitReview} className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-gray-800/40 border-gray-700' : 'bg-white border-gray-100 shadow-sm'} mb-4`}>
                                        <h4 className={`text-sm font-bold m-0 mb-1.5 ${isDarkMode ? 'text-gray-100' : 'text-gray-850'}`}>Write a Review</h4>
                                        <p className="text-xs text-textLight mt-0 mb-3">Share your learning experience and feedback with other students.</p>
                                        
                                        <div className="mb-3">
                                            <span className="text-xs font-semibold text-textLight block mb-1">Your Rating:</span>
                                            {renderInteractiveStars()}
                                        </div>

                                        <div className="mb-4">
                                            <span className="text-xs font-semibold text-textLight block mb-1">Comment:</span>
                                            <textarea
                                                value={userComment}
                                                onChange={(e) => setUserComment(e.target.value)}
                                                placeholder="Write your review here..."
                                                rows={3}
                                                required
                                                className={`w-full p-3 rounded-xl border outline-none text-sm transition-all focus:border-primary ${isDarkMode ? 'bg-gray-900 border-gray-800 text-white' : 'bg-slate-50 border-gray-200 text-gray-800'}`}
                                            />
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={submittingReview}
                                            className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold uppercase tracking-wider text-center cursor-pointer hover:bg-primary/95 transition-colors border-none disabled:opacity-50"
                                        >
                                            {submittingReview ? 'Submitting...' : 'Submit Review'}
                                        </button>
                                    </form>
                                )}

                                {hasReviewed && (
                                    <div className={`p-4 rounded-xl border border-dashed text-center text-xs text-textLight ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                                        You have already submitted a review for this course. Thank you!
                                    </div>
                                )}

                                {/* Reviews List */}
                                <div className="flex flex-col gap-4">
                                    {loadingReviews ? (
                                        <div className="flex justify-center items-center py-8">
                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                                        </div>
                                    ) : reviews.length > 0 ? (
                                        reviews.map((rev) => (
                                            <div
                                                key={rev.id}
                                                className={`p-4 rounded-2xl border flex flex-col gap-3 transition-all duration-300 ${isDarkMode ? 'bg-gray-800/20 border-gray-700/60' : 'bg-white border-gray-100 shadow-sm'}`}
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <img
                                                            src={rev.user?.profile_image || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(rev.user?.name || 'Student') + '&background=random'}
                                                            alt={rev.user?.name || 'Student'}
                                                            className="w-9 h-9 rounded-full object-cover"
                                                        />
                                                        <div className="flex flex-col">
                                                            <span className={`text-xs font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-855'}`}>
                                                                {rev.user?.name || 'Student'}
                                                            </span>
                                                            <span className="text-[10px] text-textLight mt-0.5">
                                                                {new Date(rev.created_at).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {renderStars(rev.rating)}
                                                </div>
                                                <p className={`text-xs leading-relaxed m-0 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                                    {rev.comment}
                                                </p>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="py-12 flex flex-col justify-center items-center border border-dashed rounded-2xl border-border">
                                            <Star size={36} className="text-textLight opacity-40 mb-2" />
                                            <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                No reviews yet. Be the first to review!
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column - Enrollment Sticky Box (includes Progress bar, & action buttons) */}
                <div className="w-full lg:w-[360px] xl:w-[380px] shrink-0">
                    <div className={`sticky top-24 p-6 rounded-3xl shadow-xl border ${isDarkMode ? 'bg-gray-800/40 border-gray-700/80 backdrop-blur-md' : 'bg-white border-gray-200 shadow-[0_8px_30px_rgba(0,0,0,0.02)]'}`}>
                        
                        {/* Progress Bar moved to right side */}
                        {isEnrolled && !isExpired && (
                            <div className="flex flex-col gap-2 mb-5">
                                <div className="flex flex-row justify-between items-center">
                                    <span className={`text-[10px] font-extrabold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Your Progress</span>
                                    <span className="text-xs font-black text-primary">{progressPercentage}%</span>
                                </div>
                                <div className={`h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                                    <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progressPercentage}%` }} />
                                </div>
                            </div>
                        )}

                        {!isEnrolled ? (
                            <div className="flex flex-col gap-5">
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] uppercase font-bold text-textLight leading-none">Course Fee</span>
                                    <span className="text-2xl font-black text-primary">
                                        {isFree ? 'Free' : `₹${currencyFormater(course.price)}`}
                                    </span>
                                </div>

                                <button
                                    className={`w-full py-3.5 rounded-2xl flex justify-center items-center shadow-[0_4px_12px_rgba(37,99,235,0.2)] border-none transition-all duration-300 hover:scale-[1.01] active:scale-[0.98] ${course.is_enrollment_closed ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-primary text-white cursor-pointer hover:opacity-95 font-bold text-xs uppercase tracking-wider'}`}
                                    onClick={handleEnrollOrPlay}
                                >
                                    <span>
                                        {course.is_enrollment_closed ? 'Enrollment Closed' : (isFree ? 'Enroll Now' : 'Buy Now')}
                                    </span>
                                </button>

                                <div className="flex flex-row gap-3">
                                    <button
                                        className={`flex-1 py-3 rounded-2xl flex justify-center items-center border border-border bg-transparent text-text font-bold text-xs uppercase tracking-wider cursor-pointer transition-all duration-300 hover:bg-gray-50 dark:hover:bg-gray-800/60 hover:scale-[1.01] active:scale-[0.98]`}
                                        onClick={handleShare}
                                    >
                                        <Share2 size={16} className="mr-2" />
                                        <span>Share</span>
                                    </button>
                                    <button
                                        className={`flex-1 py-3 rounded-2xl flex justify-center items-center border border-border bg-transparent text-text font-bold text-xs uppercase tracking-wider cursor-pointer transition-all duration-300 hover:bg-gray-50 dark:hover:bg-gray-800/60 hover:scale-[1.01] active:scale-[0.98]`}
                                    >
                                        <Heart size={16} className="mr-2" />
                                        <span>Save</span>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4">
                                <button
                                    className={`w-full py-3.5 rounded-2xl flex flex-row justify-center items-center gap-2 border-none cursor-pointer transition-transform hover:scale-[1.01] active:scale-[0.98] ${isExpired ? 'bg-red-500 hover:opacity-90 shadow-[0_4px_12px_rgba(239,68,68,0.2)] text-white' : 'bg-primary hover:opacity-90 shadow-[0_4px_12px_rgba(37,99,235,0.2)] text-white'}`}
                                    onClick={handleEnrollOrPlay}
                                >
                                    {isExpired ? (
                                        <>
                                            <Clock size={16} className="text-white" />
                                            <span className="text-xs font-bold uppercase tracking-wider text-white">Renew Access</span>
                                        </>
                                    ) : (
                                        <>
                                            <Play size={16} className="text-white animate-pulse" fill="currentColor" />
                                            <span className="text-xs font-bold uppercase tracking-wider text-white">Resume Learning</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

