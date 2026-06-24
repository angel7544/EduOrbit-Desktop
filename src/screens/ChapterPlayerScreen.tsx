import React, { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FileText, ArrowLeft, ChevronLeft, ChevronRight, CheckCircle, Lock, Download, Play, Share2 } from 'lucide-react';
import { ChapterItem, useCourseStore } from '../store/courseStore';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../hooks/useTheme';
import { supabase } from '../lib/supabase';

export default function ChapterPlayerScreen() {
  const location = useLocation();
  const route = { params: location.state };
  const navigate = useNavigate();
  const { chapter: initialChapter, chapterId: paramChapterId, courseId, courseTitle: initialCourseTitle, hasAccess: initialHasAccess } = route.params || {};
  const { courses, markChapterCompleted, progress, loadProgress } = useCourseStore();
  const { user } = useAuthStore();
  const { isDarkMode } = useTheme();

  const [currentChapter, setCurrentChapter] = useState<ChapterItem | null>(initialChapter || null);
  const [currentCourse, setCurrentCourse] = useState<any>(null);
  const [courseTitle, setCourseTitle] = useState<string>(initialCourseTitle || '');
  const [hasAccess, setHasAccess] = useState<boolean>(initialHasAccess || false);
  const [loading, setLoading] = useState(!initialChapter);

  useEffect(() => {
    if (user && courseId) {
      loadProgress(courseId, user.id);
    }
  }, [courseId, user, loadProgress]);

  const isCompleted = useMemo(() => {
    if (!currentChapter) return false;
    return progress[courseId]?.includes(currentChapter.id) || false;
  }, [progress, courseId, currentChapter]);

  useEffect(() => {
    const loadData = async () => {
      if (!initialChapter) setLoading(true);
      try {
        const chapterId = paramChapterId || initialChapter?.id;
        if (!chapterId) return;

        const { data: chapter, error } = await supabase
          .from('chapters')
          .select('*, attachments(*)')
          .eq('id', chapterId)
          .single();

        if (error) throw error;
        if (chapter) setCurrentChapter(chapter);

        const { data: courseData } = await supabase
          .from('courses')
          .select('*, chapters(*)')
          .eq('id', courseId)
          .single();
        
        if (courseData) {
          setCurrentCourse(courseData);
          setCourseTitle(courseData.title);
        }

        if (initialHasAccess === undefined && user) {
          const { data: purchases } = await supabase
            .from('purchases')
            .select('id')
            .eq('user_id', user.id)
            .eq('course_id', courseId)
            .eq('status', 'success')
            .limit(1);
          setHasAccess(!!(purchases && purchases.length > 0));
        } else if (initialHasAccess !== undefined) {
          setHasAccess(initialHasAccess);
        }

      } catch (e) {
        console.error('Error loading chapter data:', e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [initialChapter, paramChapterId, courseId, user, initialHasAccess]);

  const course = useMemo(() => courses.find(c => c.id === courseId), [courses, courseId]);
  const sortedChapters = useMemo(() => {
    const source = currentCourse || course;
    return source?.chapters ? [...source.chapters].sort((a: any, b: any) => (a.position || 0) - (b.position || 0)) : [];
  }, [course, currentCourse]);

  const currentIndex = useMemo(() => {
    if (!currentChapter) return -1;
    return sortedChapters.findIndex(c => c.id === currentChapter.id);
  }, [sortedChapters, currentChapter]);

  const prevChapter = currentIndex > 0 ? sortedChapters[currentIndex - 1] : null;
  const nextChapter = currentIndex < sortedChapters.length - 1 ? sortedChapters[currentIndex + 1] : null;

  const navigateToChapter = (chapter: any) => {
    if (!chapter.is_demo && !hasAccess) {
      alert('This chapter is locked. Please purchase the course to access it.');
      return;
    }
    setCurrentChapter(chapter);
  };

  const getYoutubeId = (url: string) => {
    if (!url) return null;
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts|live)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const renderVideoPlayer = () => {
    if (!currentChapter?.video_url) {
      return (
        <div className={`w-full aspect-video flex justify-center items-center ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
          <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>No video available</span>
        </div>
      );
    }

    const ytId = getYoutubeId(currentChapter.video_url);
    if (ytId) {
      return (
        <div className="w-full aspect-video bg-black">
          <iframe 
            src={`https://www.youtube.com/embed/${ytId}?autoplay=1`} 
            className="w-full h-full border-none"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowFullScreen 
          />
        </div>
      );
    }

    // Default HTML5 video player for mp4, WebM, etc.
    return (
      <div className="w-full aspect-video bg-black">
        <video 
          src={currentChapter.video_url} 
          controls 
          autoPlay 
          className="w-full h-full"
          onEnded={() => {
            if (user && hasAccess) {
              markChapterCompleted(courseId, currentChapter.id, user.id);
            }
          }}
        />
      </div>
    );
  };

  return (
    <div className={`flex flex-col min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="w-full max-w-[1600px] mx-auto flex flex-col lg:flex-row min-h-screen shadow-xl bg-inherit">
        
        {/* Left Side: Video Player */}
        <div className="flex-[2.5] flex flex-col lg:border-r border-gray-200 dark:border-gray-800">
          <div className="relative w-full aspect-video bg-black">
            {renderVideoPlayer()}
            <button 
              className="absolute top-4 left-4 w-10 h-10 rounded-full bg-black/40 flex justify-center items-center border-none cursor-pointer hover:bg-black/60 transition-colors z-10"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft size={20} className="text-white" />
            </button>
          </div>

          <div className={`flex-1 p-5 lg:p-8 overflow-y-auto ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
            <div className="flex flex-row justify-between items-start mb-4 border-b pb-4" style={{ borderColor: isDarkMode ? '#374151' : '#e5e7eb' }}>
              <div>
                <span className={`text-2xl font-bold mb-1 block ${isDarkMode ? 'text-gray-50' : 'text-gray-900'}`}>{currentChapter?.title}</span>
                <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{courseTitle}</span>
              </div>
              <div className="flex gap-3">
                  <button className={`w-10 h-10 rounded-full flex justify-center items-center border-none cursor-pointer ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'} transition-colors`}>
                      <Share2 size={18} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
                  </button>
                  <button className={`w-10 h-10 rounded-full flex justify-center items-center border-none cursor-pointer ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'} transition-colors`}>
                      <Download size={18} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
                  </button>
              </div>
            </div>

            <div className="flex flex-row gap-4 mb-8">
                <button 
                    className={`flex-1 flex flex-row items-center justify-center py-4 rounded-xl border-none gap-2 ${prevChapter ? (isDarkMode ? 'bg-gray-800 cursor-pointer hover:bg-gray-700' : 'bg-white shadow-sm border border-gray-200 cursor-pointer hover:bg-gray-50') : 'opacity-50 cursor-not-allowed bg-gray-200 text-gray-500'} transition-colors`}
                    onClick={() => prevChapter && navigateToChapter(prevChapter)}
                    disabled={!prevChapter}
                >
                    <ChevronLeft size={20} className={isDarkMode ? 'text-gray-300' : 'text-gray-600'} />
                    <span className={`text-base font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Previous Lesson</span>
                </button>
                <button 
                    className={`flex-1 flex flex-row items-center justify-center py-4 rounded-xl border-none gap-2 ${nextChapter ? (isDarkMode ? 'bg-gray-800 cursor-pointer hover:bg-gray-700' : 'bg-white shadow-sm border border-gray-200 cursor-pointer hover:bg-gray-50') : 'opacity-50 cursor-not-allowed bg-gray-200 text-gray-500'} transition-colors`}
                    onClick={() => nextChapter && navigateToChapter(nextChapter)}
                    disabled={!nextChapter}
                >
                    <span className={`text-base font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Next Lesson</span>
                    <ChevronRight size={20} className={isDarkMode ? 'text-gray-300' : 'text-gray-600'} />
                </button>
            </div>

            {currentChapter?.description && (
                <div className="mb-6">
                    <span className={`text-lg font-bold mb-4 block ${isDarkMode ? 'text-gray-50' : 'text-gray-900'}`}>Description</span>
                    <p className={`text-base leading-7 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{currentChapter.description}</p>
                </div>
            )}
          </div>
        </div>

        {/* Right Side: Playlist Sidebar */}
        <div className={`flex-[1] flex flex-col h-auto lg:max-h-screen overflow-y-auto ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
          <div className="p-6">
              <span className={`text-xl font-bold mb-6 block ${isDarkMode ? 'text-gray-50' : 'text-gray-900'}`}>Course Playlist ({sortedChapters.length} lessons)</span>
                  <div className={`rounded-xl overflow-hidden border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-sm'}`}>
                      {sortedChapters.map((ch: any, idx: number) => {
                          const isActive = ch.id === currentChapter?.id;
                          const isDone = progress[courseId]?.includes(ch.id);
                          const isLocked = !ch.is_demo && !hasAccess;
                          
                          return (
                              <button
                                  key={ch.id}
                                  className={`w-full flex flex-row items-center p-4 border-b border-solid text-left cursor-pointer transition-colors border-none ${isActive ? (isDarkMode ? 'bg-primary/20' : 'bg-primary/5') : 'bg-transparent'} ${isDarkMode ? 'border-gray-700' : 'border-gray-100'} ${isLocked ? 'opacity-60' : 'hover:opacity-80'}`}
                                  onClick={() => navigateToChapter(ch)}
                                  disabled={isLocked}
                              >
                                  <div className={`w-8 h-8 rounded-full flex justify-center items-center mr-3 shrink-0 ${isActive ? 'bg-primary text-white' : (isDone ? 'bg-green-100 text-green-600' : (isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'))}`}>
                                      {isDone && !isActive ? (
                                          <CheckCircle size={16} className="currentColor" />
                                      ) : isActive ? (
                                          <Play size={14} className="currentColor" fill="currentColor" />
                                      ) : (
                                          <span className="text-xs font-bold currentColor">{idx + 1}</span>
                                      )}
                                  </div>
                                  
                                  <div className="flex-1 min-w-0 pr-3">
                                      <span className={`text-sm font-semibold truncate block ${isActive ? 'text-primary' : (isDarkMode ? 'text-gray-200' : 'text-gray-800')}`}>{ch.title}</span>
                                      <span className={`text-xs mt-0.5 block truncate ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                                          Video
                                      </span>
                                  </div>
                                  
                                  {isLocked ? (
                                      <Lock size={16} className={isDarkMode ? 'text-gray-500' : 'text-gray-400'} />
                                  ) : (
                                      <Play size={16} className={isActive ? 'text-primary' : (isDarkMode ? 'text-gray-500' : 'text-gray-400')} />
                                  )}
                              </button>
                          );
                      })}
                  </div>
          </div>
        </div>
      </div>
    </div>
  );
}
