import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, CheckCircle2, Lock,
  Play, Share2, BookOpen, Clock, CheckCheck, FileText, PanelLeftClose, PanelLeftOpen,
  Info, Layers, Download, GraduationCap, Eye, Award, Sparkles
} from 'lucide-react';
import { ChapterItem, useCourseStore } from '../store/courseStore';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../hooks/useTheme';
import { supabase } from '../lib/supabase';
import { VideoPlayer } from '../components/VideoPlayer';
import {Header} from '../components/Header';
import { LiveCountdown, LiveViewerBadge } from '../components/LiveCountdown';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';

export default function ChapterPlayerScreen() {
  const location = useLocation();
  const route = { params: location.state };
  const navigate = useNavigate();
  const { chapter: initialChapter, chapterId: paramChapterId, lessonId: paramLessonId, courseId, courseTitle: initialCourseTitle, hasAccess: initialHasAccess } = route.params || {};
  const { courses, markChapterCompleted, unmarkChapterCompleted, progress, loadProgress } = useCourseStore();
  const { user } = useAuthStore();
  const { isDarkMode } = useTheme();

  const [currentChapter, setCurrentChapter] = useState<ChapterItem | null>(initialChapter || null);
  const [currentLessonId, setCurrentLessonId] = useState<string | null>(paramLessonId || null);
  const [currentCourse, setCurrentCourse] = useState<any>(null);
  const [courseTitle, setCourseTitle] = useState<string>(initialCourseTitle || '');
  const [hasAccess, setHasAccess] = useState<boolean>(initialHasAccess || false);
  const [loading, setLoading] = useState(true);
  const [markingComplete, setMarkingComplete] = useState(false);
  const [forceEnterLive, setForceEnterLive] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [infoTab, setInfoTab] = useState<'lesson' | 'course' | 'resources'>('lesson');
  const [infoCollapsed, setInfoCollapsed] = useState(true);
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>(() => {
    return initialChapter ? { [initialChapter.id]: true } : {};
  });

  const toggleChapter = (chapterId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedChapters(prev => ({ ...prev, [chapterId]: !prev[chapterId] }));
  };

  useEffect(() => {
    if (user?.id && courseId) loadProgress(courseId, user.id);
  }, [courseId, user?.id, loadProgress]);

  useEffect(() => {
    if (currentChapter?.id) {
      setForceEnterLive(false);
      setExpandedChapters(prev => ({
        ...prev,
        [currentChapter.id]: true
      }));
    }
  }, [currentChapter?.id]);

  const parseSafeDate = (d: any): Date | null => {
    if (!d) return null;
    const parsed = new Date(d);
    return isNaN(parsed.getTime()) ? null : parsed;
  };

  const formatLiveTime = (dateStr: any) => {
    const d = parseSafeDate(dateStr);
    if (!d) return 'Scheduled';
    try {
      return d.toLocaleString('en-IN', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return 'Scheduled';
    }
  };

  const isChapterLive = (ch: any) => {
    if (!ch) return false;
    const status = String(ch.live_status || '').toUpperCase();
    if (status === 'LIVE') return true;
    if (status === 'ENDED' || status === 'RECORDED' || status === 'CONCLUDED') return false;
    const endsAt = parseSafeDate(ch.live_ends_at);
    const startsAt = parseSafeDate(ch.live_starts_at);
    const now = new Date();
    if (endsAt && endsAt <= now) return false;
    if (startsAt && startsAt > now) return false;
    if (startsAt && startsAt <= now) return true;
    if (ch.is_live && !startsAt) return true;
    return false;
  };

  const isChapterUpcoming = (ch: any) => {
    if (!ch) return false;
    const status = String(ch.live_status || '').toUpperCase();
    if (status === 'ENDED' || status === 'RECORDED' || status === 'CONCLUDED' || status === 'LIVE') return false;
    const startsAt = parseSafeDate(ch.live_starts_at);
    const now = new Date();
    if (startsAt && startsAt > now) return true;
    if (!startsAt && status === 'SCHEDULED') return true;
    return false;
  };

  const isChapterRecorded = (ch: any) => {
    if (!ch) return false;
    const status = String(ch.live_status || '').toUpperCase();
    if (status === 'ENDED' || status === 'RECORDED' || status === 'CONCLUDED') return true;
    const endsAt = parseSafeDate(ch.live_ends_at);
    if (endsAt && endsAt <= new Date() && (ch.is_live || ch.live_status || ch.live_starts_at)) return true;
    return false;
  };

  const isCompleted = useMemo(() => {
    if (!currentChapter) return false;
    return progress[courseId]?.includes(currentChapter.id) || false;
  }, [progress, courseId, currentChapter]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        if (!courseId && !paramChapterId && !initialChapter?.id) {
          setLoading(false);
          return;
        }

        let fetchedChapters: any[] = [];

        if (courseId) {
          const { data: courseData, error: courseErr } = await supabase
            .from('courses')
            .select('*, chapters(*, attachments(*), lessons(*))')
            .eq('id', courseId)
            .single();

          if (courseData) {
            fetchedChapters = (courseData.chapters || [])
              .filter((ch: any) => ch.is_published !== false)
              .map((ch: any) => ({
                ...ch,
                lessons: (ch.lessons || [])
                  .filter((l: any) => l.is_published !== false)
                  .sort((a: any, b: any) => (a.position || 0) - (b.position || 0))
              }))
              .sort((a: any, b: any) => (a.position || 0) - (b.position || 0));

            setCurrentCourse({ ...courseData, chapters: fetchedChapters });
            setCourseTitle(courseData.title);
          }
        }

        const chapterId = paramChapterId || initialChapter?.id;
        let activeCh: any = null;

        if (chapterId) {
          if (fetchedChapters.length > 0) {
            activeCh = fetchedChapters.find((ch: any) => ch.id === chapterId);
          }
          if (!activeCh) {
            const { data: chapter, error } = await supabase
              .from('chapters')
              .select('*, attachments(*), lessons(*)')
              .eq('id', chapterId)
              .single();

            if (chapter) {
              const filteredLessons = (chapter.lessons || [])
                .filter((l: any) => l.is_published !== false)
                .sort((a: any, b: any) => (a.position || 0) - (b.position || 0));
              activeCh = { ...chapter, lessons: filteredLessons };
            }
          }
        } else if (fetchedChapters.length > 0) {
          const completedChapterIds = (courseId && progress[courseId]) || [];
          const uncompletedChapter = fetchedChapters.find((ch: any) => !completedChapterIds.includes(ch.id));
          activeCh = uncompletedChapter || fetchedChapters[0];
        }

        if (activeCh) {
          setCurrentChapter(activeCh);
          setExpandedChapters(prev => ({ ...prev, [activeCh.id]: true }));

          let selectedLessonId = paramLessonId || null;
          if (!selectedLessonId && activeCh.lessons && activeCh.lessons.length > 0 && !activeCh.video_url) {
            const sortedLessons = [...activeCh.lessons].sort((a: any, b: any) => (a.position || 0) - (b.position || 0));
            if (sortedLessons.length > 0) {
              selectedLessonId = sortedLessons[0].id;
            }
          }
          if (selectedLessonId) {
            setCurrentLessonId(selectedLessonId);
          }
        }

        if (initialHasAccess === undefined && user && courseId) {
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
  }, [initialChapter, paramChapterId, paramLessonId, courseId, user?.id, initialHasAccess]);

  const refreshCourseChapters = useCallback(async () => {
    const targetCourseId = courseId || currentCourse?.id;
    if (!targetCourseId) return;
    try {
      const { data } = await supabase
        .from('courses')
        .select('*, chapters(*, attachments(*), lessons(*))')
        .eq('id', targetCourseId)
        .single();

      if (data?.chapters) {
        const updated = (data.chapters || [])
          .filter((ch: any) => ch.is_published !== false)
          .map((ch: any) => ({
            ...ch,
            video_url: ch.video_url || ch.stream_url || ch.youtube_url || ch.live_stream_url,
            lessons: (ch.lessons || [])
              .filter((l: any) => l.is_published !== false)
              .sort((a: any, b: any) => (a.position || 0) - (b.position || 0))
          }))
          .sort((a: any, b: any) => (a.position || 0) - (b.position || 0));

        setCurrentCourse((prev: any) => prev ? { ...prev, chapters: updated } : prev);
        setCurrentChapter((prev: any) => {
          if (!prev) return prev;
          const match = updated.find((c: any) => c.id === prev.id);
          if (!match) return prev;
          const newUrl = match.video_url || match.stream_url || match.youtube_url || match.live_stream_url;
          if (
            prev.video_url === newUrl &&
            prev.title === match.title &&
            prev.live_status === match.live_status &&
            prev.is_live === match.is_live &&
            prev.live_starts_at === match.live_starts_at &&
            prev.live_ends_at === match.live_ends_at
          ) {
            return prev;
          }
          return {
            ...prev,
            ...match,
            video_url: newUrl
          };
        });
      }
    } catch (err) {
      console.error('Error refreshing chapters in player:', err);
    }
  }, [courseId, currentCourse?.id]);

  // Realtime subscriptions to chapters and lessons to detect live status changes, new streams, or lessons
  useEffect(() => {
    const targetCourseId = courseId || currentCourse?.id;
    if (!targetCourseId) return;

    const channel = supabase
      .channel(`player_realtime_${targetCourseId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chapters' }, (payload: any) => {
        // If event is for this course or if course_id is unspecified, refresh data
        if (!payload.new?.course_id || payload.new.course_id === targetCourseId || payload.old?.course_id === targetCourseId) {
          refreshCourseChapters();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lessons' }, () => {
        refreshCourseChapters();
      })
      .subscribe();

    // Refresh when user focuses the window
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshCourseChapters();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [courseId, currentCourse?.id, refreshCourseChapters]);

  // Persist last watched / accessed course and chapter/lesson
  useEffect(() => {
    const targetCourseId = courseId || currentCourse?.id;
    if (targetCourseId && currentChapter?.id) {
      const sessionData = {
        courseId: targetCourseId,
        chapterId: currentChapter.id,
        lessonId: currentLessonId || null,
        courseTitle: courseTitle || currentCourse?.title || 'Course',
        chapterTitle: currentChapter.title || 'Lesson',
        timestamp: Date.now(),
        updated_at: new Date().toISOString()
      };
      localStorage.setItem('eduorbit_last_accessed_session', JSON.stringify(sessionData));

      if (user?.id) {
        supabase.from('chapter_progress').upsert({
          user_id: user.id,
          course_id: targetCourseId,
          chapter_id: currentChapter.id,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,chapter_id' }).then(() => {});
      }
    }
  }, [courseId, currentCourse?.id, currentChapter?.id, currentLessonId, courseTitle, currentCourse?.title, user?.id]);

  const course = useMemo(() => courses.find(c => c.id === courseId), [courses, courseId]);
  const sortedChapters = useMemo(() => {
    const source = currentCourse || course;
    if (!source?.chapters) return [];
    return [...source.chapters]
      .filter((ch: any) => ch.is_published !== false)
      .sort((a: any, b: any) => (a.position || 0) - (b.position || 0));
  }, [course, currentCourse]);

  const playableItems = useMemo(() => {
    const items: any[] = [];
    sortedChapters.forEach((ch: any) => {
      if (!ch.lessons || ch.lessons.length === 0 || ch.video_url) {
        items.push({ type: 'chapter', chapter: ch });
      }
      if (ch.lessons && ch.lessons.length > 0) {
        const sortedLessons = [...ch.lessons]
          .filter((l: any) => l.is_published !== false)
          .sort((a:any, b:any) => (a.position||0) - (b.position||0));
        sortedLessons.forEach(l => {
          items.push({ type: 'lesson', chapter: ch, lesson: l });
        });
      }
    });
    return items;
  }, [sortedChapters]);

  const currentIndex = useMemo(() => {
    if (!currentChapter) return -1;
    if (currentLessonId) {
      return playableItems.findIndex(i => i.type === 'lesson' && i.lesson.id === currentLessonId);
    }
    return playableItems.findIndex(i => i.type === 'chapter' && i.chapter.id === currentChapter.id);
  }, [playableItems, currentChapter, currentLessonId]);

  const prevItem = currentIndex > 0 ? playableItems[currentIndex - 1] : null;
  const nextItem = currentIndex < playableItems.length - 1 ? playableItems[currentIndex + 1] : null;
  const totalCount = sortedChapters.length;
  const completedCount = progress[courseId]?.length || 0;
  const overallProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const currentDescription = useMemo(() => {
    return (currentLessonId 
      ? playableItems.find(i => i.type === 'lesson' && i.lesson.id === currentLessonId)?.lesson?.description 
      : currentChapter?.description) || currentChapter?.description || '';
  }, [currentLessonId, playableItems, currentChapter]);

  const hasAttachments = useMemo(() => {
    return !!(currentChapter?.attachments && currentChapter.attachments.length > 0);
  }, [currentChapter]);

  const hasDetails = useMemo(() => {
    return !!(currentDescription.trim() || currentCourse?.description?.trim() || hasAttachments);
  }, [currentDescription, currentCourse?.description, hasAttachments]);

  const activeVideoUrl = useMemo(() => {
    return (currentLessonId ? playableItems.find(i => i.type === 'lesson' && i.lesson.id === currentLessonId)?.lesson?.video_url : currentChapter?.video_url) || (currentChapter as any)?.stream_url || (currentChapter as any)?.youtube_url || (currentChapter as any)?.live_stream_url || '';
  }, [currentLessonId, playableItems, currentChapter]);

  const isCurrentUpcoming = useMemo(() => {
    return isChapterUpcoming(currentChapter) && !forceEnterLive;
  }, [currentChapter, forceEnterLive]);

  const navigateToItem = (item: any) => {
    const ch = item.chapter || item.parentChapter;
    if (!ch) return;
    const isFree = item.type === 'lesson' ? item.lesson?.is_free : ch.is_demo;
    if (!isFree && !hasAccess) {
      alert('This content is locked. Please purchase the course to access it.');
      return;
    }
    setForceEnterLive(false);
    setCurrentChapter(ch);
    setCurrentLessonId(item.type === 'lesson' ? item.lesson.id : null);
    setExpandedChapters(prev => ({ ...prev, [ch.id]: true }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleMarkComplete = async () => {
    if (!user || !currentChapter || !hasAccess || isCompleted) return;
    setMarkingComplete(true);
    await markChapterCompleted(courseId, currentChapter.id, user.id);
    setMarkingComplete(false);
  };

  const handleUnmarkComplete = async () => {
    if (!user || !currentChapter || !hasAccess || !isCompleted) return;
    setMarkingComplete(true);
    await unmarkChapterCompleted(courseId, currentChapter.id, user.id);
    setMarkingComplete(false);
  };

  const renderVideoPlayer = () => {
    if (!currentChapter?.video_url) {
      return (
        <div className={`w-full aspect-video flex flex-col justify-center items-center gap-3 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
          <BookOpen size={40} className="text-gray-400" />
          <span className="text-gray-400 text-sm">No video available for this chapter</span>
        </div>
      );
    }
    return null;
  };

  const bg = isDarkMode ? '#0f172a' : '#f8fafc';
  const cardBg = isDarkMode ? '#1e293b' : '#ffffff';
  const border = isDarkMode ? '#334155' : '#e2e8f0';
  const textPrimary = isDarkMode ? '#f1f5f9' : '#0f172a';
  const textMuted = isDarkMode ? '#94a3b8' : '#64748b';

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            border: '3px solid transparent', borderTopColor: '#6366f1', borderRightColor: '#6366f1',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
          }} />
          <p style={{ color: textMuted, fontSize: 14 }}>Loading lesson...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: bg, display: 'flex', flexDirection: 'column' }} onContextMenu={(e) => e.preventDefault()}>
      <Header 
        showBack={true} 
        title={currentChapter?.title} 
        subtitle={courseTitle} 
        showLogo={true} 
      />

      {/* ── Main Content ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', height: 'calc(100vh - 64px)' }}>

        {/* Left: Playlist Sidebar */}
        <div style={{
          width: sidebarCollapsed ? 0 : 380,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          background: isDarkMode ? '#1e293b' : '#f8fafc',
          overflowY: 'auto',
          overflowX: 'hidden',
          borderRight: sidebarCollapsed ? 'none' : `1px solid ${border}`,
          transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative'
        }}>
          {/* Playlist header */}
          <div style={{
            padding: '16px 20px', borderBottom: `1px solid ${border}`,
            background: isDarkMode ? '#0f172a' : '#fff', position: 'sticky', top: 0, zIndex: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: textPrimary, whiteSpace: 'nowrap' }}>Course Playlist</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: textMuted, whiteSpace: 'nowrap' }}>{totalCount} lessons</span>
                <button
                  onClick={() => setSidebarCollapsed(true)}
                  style={{
                    padding: '4px 6px', borderRadius: 6, border: 'none', cursor: 'pointer',
                    background: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                    color: textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.15s'
                  }}
                  title="Collapse playlist (Theater Mode)"
                >
                  <PanelLeftClose size={16} />
                </button>
              </div>
            </div>
            {/* mini progress */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, height: 4, background: isDarkMode ? '#334155' : '#e2e8f0', borderRadius: 99 }}>
                <div style={{ height: '100%', width: `${overallProgress}%`, background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', borderRadius: 99 }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#6366f1' }}>{overallProgress}%</span>
            </div>
          </div>

          {/* Chapter list */}
          <div>
            {sortedChapters.map((ch: any, idx: number) => {
              const isDone = progress[courseId]?.includes(ch.id);
              const isLocked = !ch.is_demo && !hasAccess;
              
              const hasChapterVideo = !ch.lessons || ch.lessons.length === 0 || ch.video_url;
              const hasLessons = ch.lessons && ch.lessons.length > 0;
              const isChapterActive = currentChapter?.id === ch.id;
              const isExpanded = expandedChapters[ch.id] ?? isChapterActive;

              const isLive = isChapterLive(ch);
              const isUpcoming = isChapterUpcoming(ch);
              const isRecorded = isChapterRecorded(ch);

              return (
                <div key={ch.id} style={{ borderBottom: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}` }}>
                  {hasChapterVideo && (
                    <button
                      onClick={() => navigateToItem({ type: 'chapter', chapter: ch })}
                      disabled={isLocked}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                        padding: '12px 16px',
                        background: isChapterActive
                          ? (isDarkMode ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.1)')
                          : 'transparent',
                        borderLeft: isChapterActive ? '4px solid #6366f1' : '4px solid transparent',
                        border: 'none', cursor: isLocked ? 'not-allowed' : 'pointer',
                        opacity: isLocked ? 0.5 : 1,
                        textAlign: 'left',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: isLive ? '#ef4444' : isChapterActive ? '#6366f1' : isDone ? 'rgba(16,185,129,0.15)' : (isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
                        boxShadow: isLive ? '0 0 10px rgba(239,68,68,0.4)' : isChapterActive ? '0 0 10px rgba(99, 102, 241, 0.4)' : 'none',
                      }}>
                        {isLocked
                          ? <Lock size={13} color={textMuted} />
                          : isLive
                            ? <Play size={12} color="#fff" fill="#fff" />
                            : isChapterActive
                              ? <Play size={12} color="#fff" fill="#fff" />
                              : isDone
                                ? <CheckCircle2 size={14} color="#10b981" />
                                : <span style={{ fontSize: 11, fontWeight: 700, color: textMuted }}>{idx + 1}</span>
                        }
                      </div>

                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <p style={{
                          fontSize: 13, fontWeight: isChapterActive ? 700 : 500,
                          color: isChapterActive ? '#6366f1' : textPrimary,
                          margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          display: 'flex', alignItems: 'center', gap: 6
                        }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{ch.title}</span>
                          {isLive && (
                            <span style={{
                              fontSize: 9, fontWeight: 900, color: '#fff', background: '#dc2626',
                              padding: '2px 6px', borderRadius: 5, letterSpacing: 0.5, flexShrink: 0,
                              display: 'inline-flex', alignItems: 'center', gap: 3,
                              boxShadow: '0 2px 6px rgba(220,38,38,0.35)'
                            }}>
                              <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: '#fff', animation: 'pulse-live 1.2s infinite' }} />
                              LIVE
                            </span>
                          )}
                          {isUpcoming && (
                            <span style={{
                              fontSize: 9, fontWeight: 800, color: '#d97706', background: 'rgba(245,158,11,0.15)',
                              padding: '2px 6px', borderRadius: 5, letterSpacing: 0.5, flexShrink: 0,
                              display: 'inline-flex', alignItems: 'center', gap: 3,
                              border: '1px solid rgba(245,158,11,0.3)'
                            }}>
                              <Clock size={9} /> UPCOMING
                            </span>
                          )}
                          {isRecorded && !isLive && !isUpcoming && (
                            <span style={{
                              fontSize: 8, fontWeight: 800, color: '#6366f1', background: 'rgba(99,102,241,0.15)',
                              padding: '1px 5px', borderRadius: 4, letterSpacing: 0.5, flexShrink: 0
                            }}>RECORDED</span>
                          )}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                          <Clock size={10} color={isChapterActive ? '#6366f1' : textMuted} />
                          <span style={{ fontSize: 11, color: isChapterActive ? '#6366f1' : textMuted, fontWeight: isChapterActive ? 600 : 400 }}>
                            {isUpcoming && ch.live_starts_at
                              ? `Starts ${formatLiveTime(ch.live_starts_at)}`
                              : ch.duration ? `${Math.floor(ch.duration / 60)}m ${ch.duration % 60}s` : 'Video'}
                          </span>
                          {ch.is_demo && (
                            <span style={{
                              fontSize: 9, fontWeight: 700, color: '#10b981',
                              background: 'rgba(16,185,129,0.12)', padding: '1px 5px', borderRadius: 4, marginLeft: 4,
                            }}>FREE</span>
                          )}
                        </div>
                      </div>
                      {hasLessons && (
                        <div
                          onClick={(e) => toggleChapter(ch.id, e)}
                          style={{
                            padding: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            borderRadius: '50%', background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
                          }}
                        >
                          {isExpanded ? <ChevronUp size={16} color={isChapterActive ? '#6366f1' : textMuted} /> : <ChevronDown size={16} color={isChapterActive ? '#6366f1' : textMuted} />}
                        </div>
                      )}
                    </button>
                  )}

                  {!hasChapterVideo && (
                    <div
                      onClick={(e) => hasLessons && toggleChapter(ch.id, e)}
                      style={{
                        padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
                        cursor: hasLessons ? 'pointer' : 'default',
                        background: isChapterActive
                          ? (isDarkMode ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.1)')
                          : isExpanded ? (isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)') : 'transparent',
                        borderLeft: isChapterActive ? '4px solid #6366f1' : '4px solid transparent',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: isLive ? '#ef4444' : isChapterActive ? '#6366f1' : isDone ? 'rgba(16,185,129,0.15)' : (isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
                        boxShadow: isLive ? '0 0 10px rgba(239,68,68,0.4)' : isChapterActive ? '0 0 10px rgba(99, 102, 241, 0.4)' : 'none',
                      }}>
                        {isChapterActive
                          ? <Play size={12} color="#fff" fill="#fff" />
                          : isDone
                            ? <CheckCircle2 size={14} color="#10b981" />
                            : <span style={{ fontSize: 11, fontWeight: 700, color: textMuted }}>{idx + 1}</span>
                        }
                      </div>
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <p style={{
                          fontSize: 13, fontWeight: isChapterActive ? 700 : 500,
                          color: isChapterActive ? '#6366f1' : textPrimary,
                          margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          display: 'flex', alignItems: 'center', gap: 6
                        }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{ch.title}</span>
                          {isLive && (
                            <span style={{
                              fontSize: 9, fontWeight: 900, color: '#fff', background: '#dc2626',
                              padding: '2px 6px', borderRadius: 5, letterSpacing: 0.5, flexShrink: 0,
                              display: 'inline-flex', alignItems: 'center', gap: 3
                            }}>
                              <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: '#fff', animation: 'pulse-live 1.2s infinite' }} />
                              LIVE
                            </span>
                          )}
                          {isUpcoming && (
                            <span style={{
                              fontSize: 9, fontWeight: 800, color: '#d97706', background: 'rgba(245,158,11,0.15)',
                              padding: '2px 6px', borderRadius: 5, letterSpacing: 0.5, flexShrink: 0,
                              display: 'inline-flex', alignItems: 'center', gap: 3,
                              border: '1px solid rgba(245,158,11,0.3)'
                            }}>
                              <Clock size={9} /> UPCOMING
                            </span>
                          )}
                          {isRecorded && !isLive && !isUpcoming && (
                            <span style={{
                              fontSize: 8, fontWeight: 800, color: '#6366f1', background: 'rgba(99,102,241,0.15)',
                              padding: '1px 5px', borderRadius: 4, letterSpacing: 0.5, flexShrink: 0
                            }}>RECORDED</span>
                          )}
                        </p>
                        <p style={{ fontSize: 11, color: textMuted, margin: '2px 0 0' }}>
                          {isUpcoming && ch.live_starts_at
                            ? `Starts ${formatLiveTime(ch.live_starts_at)}`
                            : `${(ch.lessons || []).length} lessons`}
                        </p>
                      </div>
                      <div
                        onClick={(e) => toggleChapter(ch.id, e)}
                        style={{
                          padding: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          borderRadius: '50%', background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
                        }}
                      >
                        {isExpanded ? <ChevronUp size={16} color={isChapterActive ? '#6366f1' : textMuted} /> : <ChevronDown size={16} color={isChapterActive ? '#6366f1' : textMuted} />}
                      </div>
                    </div>
                  )}

                  {/* Lessons */}
                  {isExpanded && ch.lessons && ch.lessons.length > 0 && (
                    <div style={{ background: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)' }}>
                      {[...ch.lessons]
                        .sort((a: any, b: any) => (a.position || 0) - (b.position || 0))
                        .map((lesson: any) => {
                        const isLessonActive = currentLessonId === lesson.id;
                        const isLessonLocked = !lesson.is_free && !hasAccess;

                        return (
                          <button
                            key={lesson.id}
                            onClick={() => navigateToItem({ type: 'lesson', lesson, parentChapter: ch })}
                            disabled={isLessonLocked}
                            style={{
                              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                              padding: '10px 16px 10px 48px',
                              background: isLessonActive
                                ? (isDarkMode ? 'rgba(99,102,241,0.25)' : 'rgba(99,102,241,0.15)')
                                : 'transparent',
                              borderLeft: isLessonActive ? '4px solid #6366f1' : '4px solid transparent',
                              border: 'none', cursor: isLessonLocked ? 'not-allowed' : 'pointer',
                              opacity: isLessonLocked ? 0.5 : 1,
                              textAlign: 'left',
                              transition: 'all 0.15s',
                            }}
                          >
                            <div style={{
                              width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: isLessonActive ? '#6366f1' : (isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
                            }}>
                              {isLessonLocked
                                ? <Lock size={10} color={textMuted} />
                                : isLessonActive
                                  ? <Play size={8} color="#fff" fill="#fff" />
                                  : <Play size={8} color={textMuted} fill={textMuted} />
                              }
                            </div>
                            <div style={{ flex: 1, overflow: 'hidden' }}>
                              <p style={{
                                fontSize: 12, fontWeight: isLessonActive ? 700 : 500,
                                color: isLessonActive ? '#6366f1' : textPrimary,
                                margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                              }}>
                                {lesson.title}
                              </p>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                <Clock size={9} color={isLessonActive ? '#6366f1' : textMuted} />
                                <span style={{ fontSize: 10, color: isLessonActive ? '#6366f1' : textMuted }}>
                                  {lesson.duration ? `${Math.floor(lesson.duration / 60)}m ${lesson.duration % 60}s` : 'Video'}
                                </span>
                                {lesson.is_free && (
                                  <span style={{
                                    fontSize: 8, fontWeight: 700, color: '#10b981',
                                    background: 'rgba(16,185,129,0.12)', padding: '1px 4px', borderRadius: 4, marginLeft: 4,
                                  }}>FREE</span>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Video + Info / Dedicated Assessment Hub */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', position: 'relative' }}>
          {!activeVideoUrl && !isCurrentUpcoming ? (
            /* ══════════════════════════════════════════════════════════════════
               DEDICATED LMS ASSESSMENT & RESOURCE WORKSPACE
               ══════════════════════════════════════════════════════════════════ */
            (() => {
              const activeTitle = (currentLessonId ? playableItems.find(i => i.type === 'lesson' && i.lesson.id === currentLessonId)?.lesson?.title : currentChapter?.title) || 'Assessment & Study Module';
              const activeDesc = (currentLessonId ? playableItems.find(i => i.type === 'lesson' && i.lesson.id === currentLessonId)?.lesson?.description : currentChapter?.description) || currentChapter?.description || '';
              const attachments = currentChapter?.attachments || [];
              const lowerTitle = activeTitle.toLowerCase();
              const isQuizOrTest = lowerTitle.includes('quiz') || lowerTitle.includes('test') || lowerTitle.includes('exam') || lowerTitle.includes('mock') || lowerTitle.includes('assessment') || lowerTitle.includes('mcq') || lowerTitle.includes('practice');
              const hasPdfsOrAttachments = attachments.length > 0 || lowerTitle.includes('pdf') || lowerTitle.includes('notes') || lowerTitle.includes('resource') || lowerTitle.includes('document') || lowerTitle.includes('material');
              const currentChapterIdx = sortedChapters.findIndex((c: any) => c.id === currentChapter?.id);

              return (
                <div style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  background: isDarkMode ? '#0b0f19' : '#f8fafc',
                  minHeight: '100%',
                  overflowY: 'auto'
                }}>
                  {/* Top Bar: Navigation, Breadcrumb & Completion */}
                  <div style={{
                    padding: '14px 28px',
                    background: isDarkMode ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(12px)',
                    borderBottom: `1px solid ${border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    flexWrap: 'wrap',
                    position: 'sticky',
                    top: 0,
                    zIndex: 20
                  }}>
                    {/* Left: Playlist Toggle & Breadcrumb */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flexWrap: 'wrap' }}>
                      {sidebarCollapsed && (
                        <button
                          onClick={() => setSidebarCollapsed(false)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 8,
                            border: `1.5px solid ${isDarkMode ? 'rgba(99,102,241,0.5)' : '#6366f1'}`,
                            background: isDarkMode ? 'rgba(99,102,241,0.22)' : 'rgba(99,102,241,0.12)',
                            color: isDarkMode ? '#f1f5f9' : '#4338ca',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            fontSize: 12,
                            fontWeight: 800,
                            transition: 'all 0.15s'
                          }}
                          title="Open Playlist"
                        >
                          <PanelLeftOpen size={14} color="#6366f1" />
                          <span>Playlist</span>
                        </button>
                      )}

                      {/* Module Badge */}
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        background: isQuizOrTest 
                          ? (isDarkMode ? 'rgba(245,158,11,0.18)' : 'rgba(245,158,11,0.2)')
                          : hasPdfsOrAttachments
                            ? (isDarkMode ? 'rgba(16,185,129,0.18)' : 'rgba(16,185,129,0.2)')
                            : (isDarkMode ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.2)'),
                        border: `1px solid ${isQuizOrTest ? 'rgba(245,158,11,0.45)' : hasPdfsOrAttachments ? 'rgba(16,185,129,0.45)' : 'rgba(99,102,241,0.45)'}`,
                        padding: '4px 12px', borderRadius: 99,
                        color: isQuizOrTest ? (isDarkMode ? '#fbbf24' : '#d97706') : hasPdfsOrAttachments ? '#10b981' : '#6366f1',
                        fontSize: 11, fontWeight: 900, letterSpacing: '0.6px'
                      }}>
                        {isQuizOrTest ? <GraduationCap size={13} /> : hasPdfsOrAttachments ? <FileText size={13} /> : <BookOpen size={13} />}
                        <span>{isQuizOrTest ? 'ASSESSMENT & QUIZ MODULE' : hasPdfsOrAttachments ? 'RESOURCE & STUDY MATERIAL' : 'CONCEPT MODULE'}</span>
                      </div>

                      {/* Chapter Breadcrumb */}
                      <span style={{ fontSize: 13, color: textMuted, fontWeight: 600 }}>
                        {currentChapterIdx >= 0 ? `Chapter ${currentChapterIdx + 1} of ${sortedChapters.length}` : ''}
                      </span>
                    </div>

                    {/* Right: Progress & Action Controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      {/* Course Progress Pill */}
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '6px 12px', borderRadius: 8,
                        background: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                        border: `1px solid ${border}`
                      }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#6366f1' }}>{overallProgress}%</span>
                        <span style={{ fontSize: 11, color: textMuted }}>({completedCount}/{totalCount} done)</span>
                      </div>

                      {/* Prev Button */}
                      {prevItem && (
                        <button
                          onClick={() => navigateToItem(prevItem)}
                          style={{
                            padding: '7px 14px', borderRadius: 9,
                            border: `1px solid ${border}`,
                            background: isDarkMode ? 'rgba(255,255,255,0.06)' : '#ffffff',
                            color: textPrimary, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 5,
                            transition: 'background 0.15s'
                          }}
                        >
                          <ChevronLeft size={14} /> Prev
                        </button>
                      )}

                      {/* Mark Completed Button */}
                      {hasAccess && (
                        <button
                          onClick={isCompleted ? handleUnmarkComplete : handleMarkComplete}
                          disabled={markingComplete}
                          style={{
                            padding: '7px 16px', borderRadius: 9, cursor: 'pointer',
                            background: isCompleted ? 'rgba(16,185,129,0.16)' : 'linear-gradient(135deg, #10b981, #059669)',
                            border: isCompleted ? '1.5px solid rgba(16,185,129,0.5)' : 'none',
                            color: isCompleted ? '#10b981' : '#ffffff',
                            fontSize: 12, fontWeight: 800,
                            display: 'flex', alignItems: 'center', gap: 6,
                            boxShadow: isCompleted ? 'none' : '0 3px 12px rgba(16,185,129,0.3)',
                            transition: 'all 0.15s'
                          }}
                        >
                          <CheckCircle2 size={14} />
                          <span>{isCompleted ? 'Completed ✓' : 'Mark as Completed'}</span>
                        </button>
                      )}

                      {/* Next Button */}
                      {nextItem && (
                        <button
                          onClick={() => navigateToItem(nextItem)}
                          style={{
                            padding: '7px 16px', borderRadius: 9, border: 'none',
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            color: '#ffffff', fontSize: 12, fontWeight: 800, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 5,
                            boxShadow: '0 3px 12px rgba(99,102,241,0.3)',
                            transition: 'all 0.15s'
                          }}
                        >
                          <span>Next</span> <ChevronRight size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Hero Container */}
                  <div style={{ maxWidth: 1180, width: '100%', margin: '0 auto', padding: '28px 28px 60px', boxSizing: 'border-box' }}>
                    {/* Header Banner */}
                    <div style={{
                      borderRadius: 20,
                      padding: '28px 32px',
                      background: isDarkMode
                        ? 'linear-gradient(135deg, rgba(30,27,75,0.65) 0%, rgba(15,23,42,0.85) 100%)'
                        : 'linear-gradient(135deg, rgba(238,242,255,0.85) 0%, rgba(248,250,252,0.95) 100%)',
                      border: `1.5px solid ${isDarkMode ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.2)'}`,
                      boxShadow: isDarkMode ? '0 12px 36px rgba(0,0,0,0.35)' : '0 12px 36px rgba(99,102,241,0.07)',
                      marginBottom: 28,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 16
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
                        <div style={{ maxWidth: 680 }}>
                          <h1 style={{
                            fontSize: 28, fontWeight: 900, color: textPrimary,
                            margin: '0 0 8px', lineHeight: 1.2, letterSpacing: '-0.4px'
                          }}>
                            {activeTitle}
                          </h1>
                          <p style={{ fontSize: 13.5, color: textMuted, margin: 0, lineHeight: 1.6 }}>
                            {isQuizOrTest
                              ? 'Practice questions, mock tests, and assignments designed to test your knowledge. Open each assessment directly in the interactive viewer or download for offline study.'
                              : hasPdfsOrAttachments
                                ? 'Download and review the attached PDF documents, reference sheets, and study materials for this chapter.'
                                : 'Review the comprehensive lesson theory, notes, and syllabus concepts below.'}
                          </p>
                        </div>

                        {/* Quick Stats Badges */}
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                          <div style={{
                            padding: '10px 18px', borderRadius: 14,
                            background: isDarkMode ? 'rgba(255,255,255,0.05)' : '#ffffff',
                            border: `1px solid ${border}`,
                            textAlign: 'center', minWidth: 100
                          }}>
                            <div style={{ fontSize: 20, fontWeight: 900, color: '#6366f1' }}>
                              {attachments.length}
                            </div>
                            <div style={{ fontSize: 10, fontWeight: 800, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              {isQuizOrTest ? 'Quizzes' : 'Documents'}
                            </div>
                          </div>

                          <div style={{
                            padding: '10px 18px', borderRadius: 14,
                            background: isDarkMode ? 'rgba(255,255,255,0.05)' : '#ffffff',
                            border: `1px solid ${border}`,
                            textAlign: 'center', minWidth: 100
                          }}>
                            <div style={{ fontSize: 14, fontWeight: 800, color: isCompleted ? '#10b981' : '#f59e0b', marginTop: 4 }}>
                              {isCompleted ? 'Completed' : 'In Progress'}
                            </div>
                            <div style={{ fontSize: 10, fontWeight: 800, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              Status
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Section Header: Quizzes / Resources */}
                    {attachments.length > 0 && (
                      <div style={{ marginBottom: 28 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 4, height: 20, borderRadius: 2, background: 'linear-gradient(to bottom, #6366f1, #8b5cf6)' }} />
                            <h2 style={{ fontSize: 17, fontWeight: 800, color: textPrimary, margin: 0 }}>
                              {isQuizOrTest ? 'Available Practice Tests & Quizzes' : 'Attached Study Materials & Documents'}
                            </h2>
                            <span style={{
                              fontSize: 11, fontWeight: 800,
                              background: isDarkMode ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)',
                              color: '#6366f1', padding: '2px 9px', borderRadius: 99
                            }}>
                              {attachments.length} {attachments.length === 1 ? 'item' : 'items'}
                            </span>
                          </div>
                          <span style={{ fontSize: 12, color: textMuted }}>
                            Click View to solve online or Download to save
                          </span>
                        </div>

                        {/* 2-Column Responsive Card Grid */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                          gap: 16
                        }}>
                          {attachments.map((att: any, idx: number) => {
                            const isQuizItem = isQuizOrTest || att.title?.toLowerCase().includes('quiz') || att.title?.toLowerCase().includes('test');
                            return (
                              <div
                                key={att.id || idx}
                                className="edu-quiz-card"
                                style={{
                                  position: 'relative',
                                  borderRadius: 16,
                                  padding: '20px',
                                  background: isDarkMode ? 'rgba(30, 41, 59, 0.65)' : '#ffffff',
                                  border: `1.5px solid ${isDarkMode ? 'rgba(99, 102, 241, 0.25)' : 'rgba(226, 232, 240, 0.9)'}`,
                                  boxShadow: isDarkMode ? '0 6px 20px rgba(0,0,0,0.2)' : '0 6px 20px rgba(99,102,241,0.05)',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  justifyContent: 'space-between',
                                  gap: 16
                                }}
                              >
                                <div>
                                  {/* Top Row: Index Badge + Format Pill */}
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                    <span style={{
                                      fontSize: 10, fontWeight: 900, letterSpacing: '0.8px',
                                      color: isQuizItem ? '#f59e0b' : '#6366f1',
                                      background: isQuizItem ? 'rgba(245,158,11,0.14)' : 'rgba(99,102,241,0.12)',
                                      padding: '3px 10px', borderRadius: 6
                                    }}>
                                      {isQuizItem ? `QUIZ 0${idx + 1}` : `SET #${idx + 1}`}
                                    </span>
                                    <span style={{
                                      fontSize: 10, fontWeight: 700, color: textMuted,
                                      background: isDarkMode ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
                                      padding: '3px 8px', borderRadius: 6, textTransform: 'uppercase', letterSpacing: '0.5px'
                                    }}>
                                      {att.file_type || 'PDF Document'}
                                    </span>
                                  </div>

                                  {/* Item Details */}
                                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                    <div style={{
                                      width: 42, height: 42, borderRadius: 12,
                                      background: isQuizItem ? 'rgba(245,158,11,0.15)' : 'rgba(99,102,241,0.15)',
                                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                    }}>
                                      {isQuizItem ? (
                                        <Award size={20} color="#f59e0b" />
                                      ) : (
                                        <FileText size={20} color="#6366f1" />
                                      )}
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                      <h3 style={{
                                        fontSize: 15, fontWeight: 800, color: textPrimary,
                                        margin: '0 0 4px', lineHeight: 1.3
                                      }}>
                                        {att.title}
                                      </h3>
                                      <p style={{ fontSize: 12, color: textMuted, margin: 0, lineHeight: 1.4 }}>
                                        {isQuizItem
                                          ? 'Practice assessment sheet with question sets & self-check keys.'
                                          : 'Study resource document and curriculum reference notes.'}
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                {/* Action Buttons */}
                                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                                  <button
                                    onClick={() => navigate('/attachmentviewer', { state: { url: att.file_url, title: att.title, type: att.file_type } })}
                                    className="edu-btn-glow"
                                    style={{
                                      flex: 1,
                                      padding: '9px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
                                      background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                                      color: '#ffffff', fontSize: 12.5, fontWeight: 800,
                                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                      boxShadow: '0 3px 12px rgba(99,102,241,0.3)'
                                    }}
                                  >
                                    <Eye size={14} />
                                    <span>View & Solve</span>
                                  </button>

                                  <button
                                    onClick={() => window.open(att.file_url, '_blank')}
                                    style={{
                                      padding: '9px 14px', borderRadius: 10,
                                      border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.12)' : border}`,
                                      background: isDarkMode ? 'rgba(255,255,255,0.06)' : '#f8fafc',
                                      color: textPrimary, fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                                      transition: 'background 0.15s'
                                    }}
                                    title="Download PDF"
                                  >
                                    <Download size={14} />
                                    <span>Download</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Lesson Description & Theory Notes (if present) */}
                    {activeDesc.trim() && (
                      <div style={{
                        marginTop: 32,
                        borderRadius: 18,
                        padding: '24px 28px',
                        background: isDarkMode ? 'rgba(30, 41, 59, 0.5)' : '#ffffff',
                        border: `1px solid ${border}`,
                        boxShadow: isDarkMode ? '0 8px 24px rgba(0,0,0,0.2)' : '0 8px 24px rgba(0,0,0,0.04)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                          <BookOpen size={17} color="#6366f1" />
                          <h3 style={{ fontSize: 16, fontWeight: 800, color: textPrimary, margin: 0 }}>
                            Instructions & Lesson Notes
                          </h3>
                        </div>
                        <div style={{ fontSize: 13.5, color: textPrimary, lineHeight: 1.8 }}>
                          <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                            {activeDesc}
                          </ReactMarkdown>
                        </div>
                      </div>
                    )}

                    {/* Empty state if neither attachments nor description */}
                    {attachments.length === 0 && !activeDesc.trim() && (
                      <div style={{
                        padding: '60px 24px', textAlign: 'center',
                        background: isDarkMode ? 'rgba(30,41,59,0.4)' : '#ffffff',
                        borderRadius: 18, border: `1px solid ${border}`
                      }}>
                        <div style={{
                          width: 50, height: 50, borderRadius: 14, background: 'rgba(99,102,241,0.12)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
                        }}>
                          <BookOpen size={26} color="#6366f1" />
                        </div>
                        <h3 style={{ fontSize: 17, fontWeight: 800, color: textPrimary, margin: '0 0 8px' }}>
                          No Documents or Media
                        </h3>
                        <p style={{ fontSize: 13.5, color: textMuted, margin: '0 0 20px', maxWidth: 400, marginInline: 'auto' }}>
                          This lesson does not have attached files or notes. You can mark it completed and continue to the next lesson.
                        </p>
                        {nextItem && (
                          <button
                            onClick={() => navigateToItem(nextItem)}
                            style={{
                              padding: '10px 20px', borderRadius: 10, border: 'none',
                              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                              color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer',
                              display: 'inline-flex', alignItems: 'center', gap: 6
                            }}
                          >
                            <span>Go to Next Lesson</span> <ChevronRight size={15} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()
          ) : (
            /* ══════════════════════════════════════════════════════════════════
               VIDEO PLAYER & LIVE STREAM BROADCAST MODE
               ══════════════════════════════════════════════════════════════════ */
            <>
              {/* Video Player or Scheduled Live Waiting Screen */}
              {isCurrentUpcoming ? (
                <div style={{
                  position: 'relative', minHeight: 400,
                  background: isDarkMode ? 'radial-gradient(ellipse at top, #1e1b4b, #0f172a)' : 'radial-gradient(ellipse at top, #fffbeb, #fef3c7)',
                  borderBottom: `1px solid ${border}`,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  padding: '36px 24px', textAlign: 'center', gap: 16
                }}>
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7,
                    background: isDarkMode ? 'rgba(245,158,11,0.18)' : 'rgba(245,158,11,0.22)',
                    border: '1.5px solid rgba(245,158,11,0.4)',
                    padding: '5px 16px', borderRadius: 99,
                    color: isDarkMode ? '#fbbf24' : '#d97706',
                    fontSize: 11, fontWeight: 900, letterSpacing: '0.8px',
                    boxShadow: '0 2px 10px rgba(245,158,11,0.15)'
                  }}>
                    <Clock size={13} color={isDarkMode ? '#fbbf24' : '#d97706'} />
                    <span>SCHEDULED LIVE CLASS</span>
                  </div>

                  <h3 style={{ fontSize: 22, fontWeight: 900, color: textPrimary, margin: 0, maxWidth: 580, lineHeight: 1.3 }}>
                    {currentChapter?.title}
                  </h3>

                  {/* Live Real-time Countdown Counter */}
                  <LiveCountdown
                    targetDate={currentChapter?.live_starts_at}
                    onTimeReached={() => {
                      setForceEnterLive(true);
                      refreshCourseChapters();
                    }}
                    variant="full"
                    isDarkMode={isDarkMode}
                  />

                  <p style={{ fontSize: 13, color: textMuted, margin: 0, maxWidth: 480, lineHeight: 1.5 }}>
                    Scheduled for <strong style={{ color: isDarkMode ? '#fbbf24' : '#d97706' }}>{formatLiveTime(currentChapter?.live_starts_at)}</strong>.
                    The broadcast stream and interactive player will start automatically once time is reached.
                  </p>

                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    fontSize: 12, color: textMuted,
                    background: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                    padding: '8px 18px', borderRadius: 10,
                    border: `1px solid ${border}`
                  }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
                    <span>Live standby active • Auto-refreshing in realtime</span>
                  </div>
                </div>
              ) : (
                <div style={{
                  position: 'relative',
                  background: '#000',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  height: sidebarCollapsed
                    ? (infoCollapsed || !hasDetails ? 'calc(100vh - 64px - 62px)' : 'calc(100vh - 64px - 140px)')
                    : (infoCollapsed || !hasDetails ? 'calc(100vh - 64px - 62px)' : 'calc(100vh - 64px - 180px)'),
                  minHeight: 280,
                  maxHeight: sidebarCollapsed && (infoCollapsed || !hasDetails) ? 'calc(100vh - 64px - 62px)' : '75vh',
                  transition: 'height 0.2s ease',
                  overflow: 'hidden'
                }}>
                  <VideoPlayer
                    key={`${currentChapter?.id || 'ch'}_${currentLessonId || 'main'}`}
                    url={activeVideoUrl}
                    title={currentLessonId ? playableItems.find(i => i.type === 'lesson' && i.lesson.id === currentLessonId)?.lesson?.title : currentChapter?.title}
                    videoKey={`${user?.id || 'guest'}_${courseId}_${currentChapter?.id || ''}${currentLessonId ? `_${currentLessonId}` : ''}`}
                    isDarkMode={isDarkMode}
                    onEnded={() => {
                      if (user && hasAccess && !isCompleted) {
                        handleMarkComplete();
                      }
                    }}
                    hasPrev={!!prevItem}
                    hasNext={!!nextItem}
                    onPrev={() => prevItem && navigateToItem(prevItem)}
                    onNext={() => nextItem && navigateToItem(nextItem)}
                    isCompleted={isCompleted}
                    onMarkComplete={hasAccess ? handleMarkComplete : undefined}
                    onUnmarkComplete={hasAccess ? handleUnmarkComplete : undefined}
                  />
                </div>
              )}

              {/* Chapter info panel */}
              {infoCollapsed ? (
                <div style={{
                  minHeight: 62,
                  height: 62,
                  padding: '0 24px',
                  background: cardBg,
                  borderBottom: `1px solid ${border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                  flexShrink: 0,
                  boxSizing: 'border-box'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, overflow: 'hidden' }}>
                    {sidebarCollapsed && (
                      <button
                        onClick={() => setSidebarCollapsed(false)}
                        style={{
                          padding: '5px 12px',
                          borderRadius: 8,
                          border: `1.5px solid ${isDarkMode ? 'rgba(99,102,241,0.5)' : '#6366f1'}`,
                          background: isDarkMode ? 'rgba(99,102,241,0.22)' : 'rgba(99,102,241,0.12)',
                          color: isDarkMode ? '#f1f5f9' : '#4338ca',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: 12,
                          fontWeight: 800,
                          flexShrink: 0,
                          transition: 'all 0.15s'
                        }}
                        title="Open Playlist"
                      >
                        <PanelLeftOpen size={14} color="#6366f1" />
                        <span>Playlist</span>
                      </button>
                    )}
                    <span style={{
                      fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8,
                      color: '#6366f1', background: 'rgba(99,102,241,0.1)', padding: '2px 8px', borderRadius: 6, flexShrink: 0
                    }}>
                      {currentLessonId ? 'LESSON' : 'CHAPTER'}
                    </span>
                    {isChapterLive(currentChapter) && (
                      <LiveViewerBadge isDarkMode={isDarkMode} size="sm" />
                    )}
                    {isChapterUpcoming(currentChapter) && (
                      <LiveCountdown
                        targetDate={currentChapter?.live_starts_at}
                        variant="badge"
                        isDarkMode={isDarkMode}
                        onTimeReached={refreshCourseChapters}
                      />
                    )}
                    {isCompleted && (
                      <span style={{
                        fontSize: 10, fontWeight: 700,
                        color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: 6,
                        display: 'inline-flex', alignItems: 'center', gap: 3, flexShrink: 0
                      }}>
                        <CheckCircle2 size={10} /> Completed
                      </span>
                    )}
                    <h2 style={{
                      fontSize: 15, fontWeight: 700, color: textPrimary, margin: 0,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                    }}>
                      {currentLessonId 
                        ? playableItems.find(i => i.type === 'lesson' && i.lesson.id === currentLessonId)?.lesson?.title || 'Lesson'
                        : currentChapter?.title}
                    </h2>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
                    <span style={{ fontSize: 12, color: textMuted, fontWeight: 600 }}>
                      {completedCount}/{totalCount} ({overallProgress}%)
                    </span>
                    {hasDetails && (
                      <button
                        onClick={() => setInfoCollapsed(false)}
                        style={{
                          padding: '6px 12px', borderRadius: 8,
                          border: `1px solid ${border}`,
                          background: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                          color: textPrimary, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700,
                          transition: 'all 0.15s'
                        }}
                        title="Show Details & Resources"
                      >
                        <span>Show Details</span>
                        <ChevronDown size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ padding: '20px 28px', background: cardBg, borderBottom: `1px solid ${border}`, flexShrink: 0 }}>
                  {/* Chapter title + badge + section collapse toggle */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 14 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                        {sidebarCollapsed && (
                          <button
                            onClick={() => setSidebarCollapsed(false)}
                            style={{
                              padding: '4px 10px',
                              borderRadius: 8,
                              border: `1.5px solid ${isDarkMode ? 'rgba(99,102,241,0.5)' : '#6366f1'}`,
                              background: isDarkMode ? 'rgba(99,102,241,0.22)' : 'rgba(99,102,241,0.12)',
                              color: isDarkMode ? '#f1f5f9' : '#4338ca',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              fontSize: 11,
                              fontWeight: 800,
                              flexShrink: 0,
                              transition: 'all 0.15s'
                            }}
                            title="Open Playlist"
                          >
                            <PanelLeftOpen size={13} color="#6366f1" />
                            <span>Playlist</span>
                          </button>
                        )}
                        <span style={{
                          fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1,
                          color: '#6366f1', background: 'rgba(99,102,241,0.1)', padding: '2px 8px', borderRadius: 6,
                        }}>
                          {currentLessonId ? 'LESSON' : 'CHAPTER'}
                        </span>
                        {isChapterLive(currentChapter) && (
                          <LiveViewerBadge isDarkMode={isDarkMode} size="md" />
                        )}
                        {isChapterUpcoming(currentChapter) && (
                          <LiveCountdown
                            targetDate={currentChapter?.live_starts_at}
                            variant="badge"
                            isDarkMode={isDarkMode}
                            onTimeReached={refreshCourseChapters}
                          />
                        )}
                        {isChapterRecorded(currentChapter) && !isChapterLive(currentChapter) && !isChapterUpcoming(currentChapter) && (
                          <span style={{
                            fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5,
                            color: '#6366f1', background: 'rgba(99,102,241,0.12)', padding: '2px 8px', borderRadius: 6
                          }}>
                            RECORDED SESSION
                          </span>
                        )}
                        {isCompleted && (
                          <span style={{
                            fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5,
                            color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: 6,
                            display: 'flex', alignItems: 'center', gap: 3,
                          }}>
                            <CheckCircle2 size={10} /> Chapter Completed
                          </span>
                        )}
                      </div>
                      <h2 style={{ fontSize: 20, fontWeight: 800, color: textPrimary, margin: 0, lineHeight: 1.3 }}>
                        {currentLessonId 
                          ? playableItems.find(i => i.type === 'lesson' && i.lesson.id === currentLessonId)?.lesson?.title || 'Lesson'
                          : currentChapter?.title}
                      </h2>
                      {currentLessonId && (
                        <div style={{ marginTop: 6, fontSize: 13, color: textMuted }}>
                          From chapter: <strong style={{ color: textPrimary }}>{currentChapter?.title}</strong>
                        </div>
                      )}
                    </div>

                    {/* Toggle Collapse Details */}
                    <button
                      onClick={() => setInfoCollapsed(true)}
                      style={{
                        padding: '6px 12px', borderRadius: 8,
                        border: `1px solid ${border}`,
                        background: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                        color: textMuted, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700,
                        flexShrink: 0
                      }}
                      title="Hide Details"
                    >
                      <span>Hide Details</span>
                      <ChevronUp size={14} />
                    </button>
                  </div>

                  {/* Progress bar */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: textMuted }}>{completedCount}/{totalCount} lessons completed</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#6366f1' }}>{overallProgress}%</span>
                    </div>
                    <div style={{ height: 5, background: isDarkMode ? '#334155' : '#e2e8f0', borderRadius: 99 }}>
                      <div style={{
                        height: '100%', width: `${overallProgress}%`,
                        background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                        borderRadius: 99, transition: 'width 0.4s ease',
                      }} />
                    </div>
                  </div>
                </div>
              )}

              {/* Collapsible Tabbed Details Section: About Lesson | About Course | Resources */}
              {!infoCollapsed && (
                <div style={{ background: bg, flex: 1 }}>
                  {/* Tab Navigation */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '12px 32px',
                    borderBottom: `1px solid ${border}`,
                    background: isDarkMode ? 'rgba(15,23,42,0.4)' : 'rgba(255,255,255,0.4)',
                    overflowX: 'auto'
                  }}>
                    <button
                      onClick={() => setInfoTab('lesson')}
                      style={{
                        padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
                        fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6,
                        background: infoTab === 'lesson' ? '#6366f1' : 'transparent',
                        color: infoTab === 'lesson' ? '#ffffff' : textMuted,
                        transition: 'all 0.15s'
                      }}
                    >
                      <BookOpen size={14} />
                      <span>About Lesson</span>
                    </button>

                    <button
                      onClick={() => setInfoTab('course')}
                      style={{
                        padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
                        fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6,
                        background: infoTab === 'course' ? '#6366f1' : 'transparent',
                        color: infoTab === 'course' ? '#ffffff' : textMuted,
                        transition: 'all 0.15s'
                      }}
                    >
                      <Layers size={14} />
                      <span>About Course</span>
                    </button>

                    {currentChapter?.attachments && currentChapter.attachments.length > 0 && (
                      <button
                        onClick={() => setInfoTab('resources')}
                        style={{
                          padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
                          fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6,
                          background: infoTab === 'resources' ? '#6366f1' : 'transparent',
                          color: infoTab === 'resources' ? '#ffffff' : textMuted,
                          transition: 'all 0.15s'
                        }}
                      >
                        <FileText size={14} />
                        <span>Resources ({currentChapter.attachments.length})</span>
                      </button>
                    )}
                  </div>

                  {/* Tab Content */}
                  <div style={{ padding: '24px 32px' }}>
                    {infoTab === 'lesson' && (
                      <div>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: textPrimary, margin: '0 0 12px' }}>
                          {currentLessonId ? 'Lesson Overview' : 'Chapter Overview'}
                        </h3>
                        <div style={{ fontSize: 14, color: textMuted, lineHeight: 1.8, margin: 0, background: cardBg, padding: '20px', borderRadius: '14px', border: `1px solid ${border}` }}>
                          <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                            {(currentLessonId ? playableItems.find(i => i.type === 'lesson' && i.lesson.id === currentLessonId)?.lesson?.description || currentChapter?.description : currentChapter?.description) || 'No specific description provided for this lesson.'}
                          </ReactMarkdown>
                        </div>
                      </div>
                    )}

                    {infoTab === 'course' && (
                      <div>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: textPrimary, margin: '0 0 12px' }}>
                          {courseTitle || 'Course Overview'}
                        </h3>
                        <div style={{ fontSize: 14, color: textMuted, lineHeight: 1.8, margin: 0, background: cardBg, padding: '20px', borderRadius: '14px', border: `1px solid ${border}` }}>
                          <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                            {currentCourse?.description || 'Comprehensive course content and learning materials provided by the instructor.'}
                          </ReactMarkdown>
                        </div>
                      </div>
                    )}

                    {infoTab === 'resources' && currentChapter?.attachments && (
                      <div>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: textPrimary, margin: '0 0 14px' }}>
                          Lesson Resources & Downloads
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {currentChapter.attachments.map((att: any) => {
                            const isAssignment = att.title?.toLowerCase().includes('assignment') || att.name?.toLowerCase().includes('assignment');
                            return (
                              <div
                                key={att.id}
                                style={{
                                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                  padding: '14px 18px', borderRadius: 14, border: `1px solid ${border}`,
                                  background: cardBg
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <FileText size={18} color="#6366f1" />
                                  </div>
                                  <span style={{ fontSize: 13, fontWeight: 700, color: textPrimary }}>{att.title}</span>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                  <button
                                    onClick={() => navigate('/attachmentviewer', { state: { url: att.file_url, title: att.title, type: att.file_type } })}
                                    style={{
                                      padding: '7px 16px', borderRadius: 9, border: 'none', cursor: 'pointer',
                                      background: '#6366f1', color: '#fff', fontSize: 12, fontWeight: 700
                                    }}
                                  >
                                    View
                                  </button>
                                  {isAssignment && (
                                    <button
                                      onClick={() => window.open(att.file_url, '_blank')}
                                      style={{
                                        padding: '7px 16px', borderRadius: 9, border: `1px solid #6366f1`, cursor: 'pointer',
                                        background: 'transparent', color: '#6366f1', fontSize: 12, fontWeight: 700,
                                        display: 'flex', alignItems: 'center', gap: 4
                                      }}
                                    >
                                      <Download size={13} />
                                      Download
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        .edu-quiz-card {
          transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.2s ease;
        }
        .edu-quiz-card:hover {
          transform: translateY(-3px);
          border-color: rgba(99, 102, 241, 0.5) !important;
          box-shadow: 0 12px 28px rgba(99, 102, 241, 0.16) !important;
        }
        .edu-btn-glow {
          transition: transform 0.15s ease, filter 0.15s ease, box-shadow 0.15s ease;
        }
        .edu-btn-glow:hover {
          transform: translateY(-1px);
          filter: brightness(1.08);
          box-shadow: 0 6px 16px rgba(99, 102, 241, 0.35) !important;
        }
      `}</style>
    </div>
  );
}
