import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, CheckCircle2, Lock,
  Play, Share2, BookOpen, Clock, CheckCheck, FileText
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
                lessons: (ch.lessons || []).filter((l: any) => l.is_published !== false)
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
              const filteredLessons = (chapter.lessons || []).filter((l: any) => l.is_published !== false);
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
            lessons: (ch.lessons || []).filter((l: any) => l.is_published !== false)
          }))
          .sort((a: any, b: any) => (a.position || 0) - (b.position || 0));

        setCurrentCourse((prev: any) => prev ? { ...prev, chapters: updated } : prev);
        setCurrentChapter((prev: any) => {
          if (!prev) return prev;
          const match = updated.find((c: any) => c.id === prev.id);
          if (!match) return prev;
          return {
            ...prev,
            ...match,
            video_url: match.video_url || match.stream_url || match.youtube_url || match.live_stream_url
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

    // Heartbeat: 15-second timer to ensure live countdowns and live stream transitions update automatically
    const heartbeat = setInterval(() => {
      refreshCourseChapters();
    }, 15000);

    // Refresh when user focuses the window
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshCourseChapters();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(heartbeat);
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

  const navigateToItem = (item: any) => {
    const ch = item.chapter;
    const isFree = item.type === 'lesson' ? item.lesson.is_free : ch.is_demo;
    if (!isFree && !hasAccess) {
      alert('This content is locked. Please purchase the course to access it.');
      return;
    }
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
          width: 380, flexShrink: 0, display: 'flex', flexDirection: 'column',
          background: isDarkMode ? '#1e293b' : '#f8fafc',
          overflowY: 'auto',
          borderRight: `1px solid ${border}`
        }}>
          {/* Playlist header */}
          <div style={{
            padding: '16px 20px', borderBottom: `1px solid ${border}`,
            background: isDarkMode ? '#0f172a' : '#fff', position: 'sticky', top: 0, zIndex: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: textPrimary }}>Course Playlist</span>
              <span style={{ fontSize: 12, color: textMuted }}>{totalCount} lessons</span>
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
                        </p>
                      </div>
                      {hasLessons && (
                        <div style={{ padding: 4, display: 'flex', alignItems: 'center' }}>
                          {isExpanded ? <ChevronUp size={16} color={isChapterActive ? '#6366f1' : textMuted} /> : <ChevronDown size={16} color={isChapterActive ? '#6366f1' : textMuted} />}
                        </div>
                      )}
                    </div>
                  )}

                  {hasLessons && isExpanded && (
                    <div style={{ display: 'flex', flexDirection: 'column', background: isDarkMode ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.02)' }}>
                      {[...ch.lessons]
                        .filter((l: any) => l.is_published !== false)
                        .sort((a:any, b:any) => (a.position||0) - (b.position||0))
                        .map((lesson: any) => {
                          const isLessonActive = currentLessonId === lesson.id;
                          const isLessonLocked = !lesson.is_free && !hasAccess;

                          return (
                          <button
                            key={lesson.id}
                            onClick={() => navigateToItem({ type: 'lesson', chapter: ch, lesson })}
                            disabled={isLessonLocked}
                            style={{
                              width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                              padding: '10px 16px 10px 48px',
                              background: isLessonActive
                                ? (isDarkMode ? 'rgba(99,102,241,0.25)' : 'rgba(99,102,241,0.14)')
                                : 'transparent',
                              borderLeft: isLessonActive ? '4px solid #6366f1' : '4px solid transparent',
                              border: 'none', cursor: isLessonLocked ? 'not-allowed' : 'pointer',
                              opacity: isLessonLocked ? 0.5 : 1,
                              textAlign: 'left',
                              transition: 'all 0.15s',
                            }}
                          >
                            <div style={{ flex: 1, overflow: 'hidden' }}>
                              <p style={{
                                fontSize: 12, fontWeight: isLessonActive ? 700 : 500,
                                color: isLessonActive ? '#6366f1' : textPrimary,
                                margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                display: 'flex', alignItems: 'center', gap: 6
                              }}>
                                {isLessonLocked
                                  ? <Lock size={10} color={textMuted} />
                                  : <Play size={10} color={isLessonActive ? '#6366f1' : textMuted} fill={isLessonActive ? '#6366f1' : 'none'} />}
                                {lesson.title}
                              </p>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2, paddingLeft: 16 }}>
                                <Clock size={9} color={isLessonActive ? '#6366f1' : textMuted} />
                                <span style={{ fontSize: 10, color: isLessonActive ? '#6366f1' : textMuted, fontWeight: isLessonActive ? 600 : 400 }}>
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

        {/* Right: Video + Info */}
        <div style={{ flex: '2.5', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

          {/* Video Player or Scheduled Live Waiting Screen */}
          {(() => {
            const activeVideoUrl = (currentLessonId ? playableItems.find(i => i.type === 'lesson' && i.lesson.id === currentLessonId)?.lesson?.video_url : currentChapter?.video_url) || (currentChapter as any)?.stream_url || (currentChapter as any)?.youtube_url || (currentChapter as any)?.live_stream_url || '';
            const isCurrentUpcoming = isChapterUpcoming(currentChapter) && !forceEnterLive;
            const startsAt = parseSafeDate(currentChapter?.live_starts_at);

            // CRITICAL: Even if a video link exists, if the class is scheduled for the future, DO NOT start live prematurely unless user requests early entry!
            if (isCurrentUpcoming) {
              return (
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
              );
            }

            return (
              <div style={{ position: 'relative', background: '#000', flexShrink: 0, maxHeight: '65vh' }}>
                <VideoPlayer
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
            );
          })()}

          {/* ── Active Live Alert Banner (if another chapter in this course is currently LIVE) ── */}
          {(() => {
            const otherLiveChapter = sortedChapters.find((ch: any) => ch.id !== currentChapter?.id && isChapterLive(ch));
            const otherUpcomingChapter = sortedChapters.find((ch: any) => ch.id !== currentChapter?.id && isChapterUpcoming(ch));

            if (otherLiveChapter) {
              return (
                <div style={{
                  margin: '16px 28px 0', padding: '14px 20px', borderRadius: 16,
                  background: isDarkMode ? 'linear-gradient(135deg, rgba(239,68,68,0.18), rgba(30,41,59,0.9))' : '#fef2f2',
                  border: '1.5px solid rgba(239,68,68,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14,
                  boxShadow: '0 4px 18px rgba(239,68,68,0.15)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                    <LiveViewerBadge size="sm" isDarkMode={isDarkMode} />
                    <div style={{ minWidth: 0 }}>
                      <span style={{ fontSize: 10, fontWeight: 900, color: '#ef4444', letterSpacing: '0.6px', display: 'block' }}>
                        STREAMING LIVE NOW IN THIS COURSE
                      </span>
                      <p style={{ fontSize: 13, fontWeight: 700, color: textPrimary, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {otherLiveChapter.title}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigateToItem({ type: 'chapter', chapter: otherLiveChapter })}
                    style={{
                      padding: '8px 18px', borderRadius: 10, border: 'none', cursor: 'pointer',
                      background: '#ef4444', color: '#fff', fontSize: 12, fontWeight: 800,
                      display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
                      boxShadow: '0 4px 14px rgba(239,68,68,0.4)'
                    }}
                  >
                    <Play size={12} fill="#fff" /> Join Live
                  </button>
                </div>
              );
            }

            if (otherUpcomingChapter) {
              return (
                <div style={{
                  margin: '16px 28px 0', padding: '12px 18px', borderRadius: 14,
                  background: isDarkMode ? 'rgba(245,158,11,0.12)' : '#fffbeb',
                  border: '1px solid rgba(245,158,11,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Clock size={15} color="#f59e0b" />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 10, fontWeight: 800, color: '#d97706', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                          Upcoming Live Class
                        </span>
                        <LiveCountdown targetDate={otherUpcomingChapter.live_starts_at} variant="mini" isDarkMode={isDarkMode} onTimeReached={refreshCourseChapters} />
                      </div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: textPrimary, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {otherUpcomingChapter.title}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigateToItem({ type: 'chapter', chapter: otherUpcomingChapter })}
                    style={{
                      padding: '6px 14px', borderRadius: 9, border: '1px solid rgba(245,158,11,0.4)', cursor: 'pointer',
                      background: 'transparent', color: '#d97706', fontSize: 11, fontWeight: 800,
                      display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0
                    }}
                  >
                    View Session
                  </button>
                </div>
              );
            }

            return null;
          })()}

          {/* Chapter info panel */}
          <div style={{ padding: '24px 32px', background: cardBg, borderBottom: `1px solid ${border}` }}>

            {/* Chapter title + badge */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
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
                <h2 style={{ fontSize: 22, fontWeight: 800, color: textPrimary, margin: 0, lineHeight: 1.3 }}>
                  {currentLessonId 
                    ? playableItems.find(i => i.type === 'lesson' && i.lesson.id === currentLessonId)?.lesson?.title || 'Lesson'
                    : currentChapter?.title}
                </h2>
                {currentLessonId && (
                  <div style={{ marginTop: 8, fontSize: 13, color: textMuted }}>
                    From chapter: <strong style={{ color: textPrimary }}>{currentChapter?.title}</strong>
                  </div>
                )}
              </div>
            </div>

            {/* Progress bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: textMuted }}>{completedCount}/{totalCount} lessons completed</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#6366f1' }}>{overallProgress}%</span>
              </div>
              <div style={{ height: 6, background: isDarkMode ? '#334155' : '#e2e8f0', borderRadius: 99 }}>
                <div style={{
                  height: '100%', width: `${overallProgress}%`,
                  background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                  borderRadius: 99, transition: 'width 0.4s ease',
                }} />
              </div>
            </div>

          </div>

          {/* Description */}
          {(currentLessonId ? playableItems.find(i => i.type === 'lesson' && i.lesson.id === currentLessonId)?.lesson?.description || currentChapter?.description : currentChapter?.description) && (
            <div style={{ padding: '28px 32px', background: bg }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: textPrimary, margin: '0 0 12px' }}>About this lesson</h3>
              <div style={{ fontSize: 15, color: textMuted, lineHeight: 1.8, margin: 0, background: isDarkMode ? '#1e293b' : '#f1f5f9', padding: '16px', borderRadius: '8px' }}>
                <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                  {currentLessonId ? playableItems.find(i => i.type === 'lesson' && i.lesson.id === currentLessonId)?.lesson?.description || currentChapter?.description : currentChapter?.description}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {/* Lesson Resources / Attachments */}
          {currentChapter?.attachments && currentChapter.attachments.length > 0 && (
            <div style={{ padding: '24px 28px', background: bg, borderTop: `1px solid ${border}` }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: textPrimary, margin: '0 0 12px' }}>Lesson Resources</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {currentChapter.attachments.map((att: any) => {
                  const isAssignment = att.title?.toLowerCase().includes('assignment') || att.name?.toLowerCase().includes('assignment');
                  
                  return (
                    <div
                      key={att.id}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: 12, borderRadius: 12, border: `1px solid ${border}`,
                        background: cardBg
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <FileText size={18} color="#6366f1" />
                        <span style={{ fontSize: 13, fontWeight: 600, color: textPrimary }}>{att.title}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => navigate('/attachmentviewer', { state: { url: att.file_url, title: att.title, type: att.file_type } })}
                          style={{
                            padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                            background: '#6366f1', color: '#fff', fontSize: 12, fontWeight: 600
                          }}
                        >
                          View
                        </button>
                        {isAssignment && (
                          <button
                            onClick={() => window.open(att.file_url, '_blank')}
                            style={{
                              padding: '6px 12px', borderRadius: 8, border: `1px solid #6366f1`, cursor: 'pointer',
                              background: 'transparent', color: '#6366f1', fontSize: 12, fontWeight: 600
                            }}
                          >
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

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
