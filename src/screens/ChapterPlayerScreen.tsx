import React, { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ChevronLeft, ChevronRight, CheckCircle2, Lock,
  Play, Share2, BookOpen, Clock, CheckCheck, FileText
} from 'lucide-react';
import { ChapterItem, useCourseStore } from '../store/courseStore';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../hooks/useTheme';
import { supabase } from '../lib/supabase';
import { VideoPlayer } from '../components/VideoPlayer';

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
  const [markingComplete, setMarkingComplete] = useState(false);

  useEffect(() => {
    if (user && courseId) loadProgress(courseId, user.id);
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
  const completedCount = progress[courseId]?.length || 0;
  const totalCount = sortedChapters.length;
  const overallProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const navigateToChapter = (chapter: any) => {
    if (!chapter.is_demo && !hasAccess) {
      alert('This chapter is locked. Please purchase the course to access it.');
      return;
    }
    setCurrentChapter(chapter);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleMarkComplete = async () => {
    if (!user || !currentChapter || !hasAccess || isCompleted) return;
    setMarkingComplete(true);
    await markChapterCompleted(courseId, currentChapter.id, user.id);
    setMarkingComplete(false);
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
        <div className={`w-full aspect-video flex flex-col justify-center items-center gap-3 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
          <BookOpen size={40} className="text-gray-400" />
          <span className="text-gray-400 text-sm">No video available for this chapter</span>
        </div>
      );
    }
    return (
      <VideoPlayer
        url={currentChapter.video_url}
        isDarkMode={isDarkMode}
        onEnded={() => {
          if (user && hasAccess && !isCompleted) {
            markChapterCompleted(courseId, currentChapter.id, user.id);
          }
        }}
      />
    );
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
    <div style={{ minHeight: '100vh', background: bg, display: 'flex', flexDirection: 'column' }}>

      {/* ── Top Header Bar ── */}
      <div style={{
        background: isDarkMode ? '#0f172a' : '#ffffff',
        borderBottom: `1px solid ${border}`,
        padding: '0 20px',
        display: 'flex', alignItems: 'center', gap: 12,
        height: 56, flexShrink: 0, position: 'sticky', top: 0, zIndex: 40,
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            width: 36, height: 36, borderRadius: 10, border: 'none', cursor: 'pointer',
            background: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
        >
          <ArrowLeft size={18} color={textPrimary} />
        </button>

        <img src="/logo.png" alt="EduOrbit" style={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 6, flexShrink: 0 }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />

        <div style={{ flex: 1, overflow: 'hidden' }}>
          <p style={{ fontSize: 11, color: '#6366f1', fontWeight: 600, margin: 0, textTransform: 'uppercase', letterSpacing: 0.5 }}>{courseTitle}</p>
          <p style={{ fontSize: 14, fontWeight: 700, color: textPrimary, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {currentChapter?.title}
          </p>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Left: Video + Info */}
        <div style={{ flex: '2.5', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

          {/* Video Player */}
          <div style={{ position: 'relative', background: '#000' }}>
            {renderVideoPlayer()}
          </div>

          {/* Chapter info panel */}
          <div style={{ padding: '24px 28px', background: cardBg, borderBottom: `1px solid ${border}` }}>

            {/* Chapter title + badge */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1,
                    color: '#6366f1', background: 'rgba(99,102,241,0.1)', padding: '2px 8px', borderRadius: 6,
                  }}>
                    Lesson {currentIndex + 1} of {totalCount}
                  </span>
                  {isCompleted && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5,
                      color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: 6,
                      display: 'flex', alignItems: 'center', gap: 3,
                    }}>
                      <CheckCircle2 size={10} /> Completed
                    </span>
                  )}
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: textPrimary, margin: 0, lineHeight: 1.3 }}>
                  {currentChapter?.title}
                </h2>
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
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

            {/* Mark Complete + Nav buttons */}
            <div style={{ display: 'flex', gap: 10 }}>
              {hasAccess && (
                <button
                  onClick={handleMarkComplete}
                  disabled={isCompleted || markingComplete}
                  style={{
                    flex: 1, padding: '12px 16px', borderRadius: 12, border: 'none', cursor: isCompleted ? 'default' : 'pointer',
                    background: isCompleted
                      ? (isDarkMode ? 'rgba(16,185,129,0.15)' : '#d1fae5')
                      : 'linear-gradient(135deg, #10b981, #059669)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    transition: 'all 0.2s',
                  }}
                >
                  {markingComplete
                    ? <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                    : <CheckCheck size={16} color={isCompleted ? '#10b981' : '#fff'} />
                  }
                  <span style={{
                    fontSize: 14, fontWeight: 700,
                    color: isCompleted ? '#10b981' : '#fff',
                  }}>
                    {markingComplete ? 'Marking...' : isCompleted ? 'Completed ✓' : 'Mark Complete'}
                  </span>
                </button>
              )}

              <button
                onClick={() => prevChapter && navigateToChapter(prevChapter)}
                disabled={!prevChapter}
                style={{
                  padding: '12px 16px', borderRadius: 12,
                  border: `1px solid ${border}`,
                  background: prevChapter ? cardBg : (isDarkMode ? '#1e293b' : '#f1f5f9'),
                  cursor: prevChapter ? 'pointer' : 'not-allowed',
                  opacity: prevChapter ? 1 : 0.5,
                  display: 'flex', alignItems: 'center', gap: 6,
                  transition: 'all 0.2s',
                }}
              >
                <ChevronLeft size={18} color={textMuted} />
                <span style={{ fontSize: 13, fontWeight: 600, color: textMuted, whiteSpace: 'nowrap' }}>Prev</span>
              </button>

              <button
                onClick={() => nextChapter && navigateToChapter(nextChapter)}
                disabled={!nextChapter}
                style={{
                  padding: '12px 16px', borderRadius: 12,
                  border: `1px solid ${border}`,
                  background: nextChapter
                    ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                    : (isDarkMode ? '#1e293b' : '#f1f5f9'),
                  cursor: nextChapter ? 'pointer' : 'not-allowed',
                  opacity: nextChapter ? 1 : 0.5,
                  display: 'flex', alignItems: 'center', gap: 6,
                  transition: 'all 0.2s',
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: nextChapter ? '#fff' : textMuted, whiteSpace: 'nowrap' }}>Next</span>
                <ChevronRight size={18} color={nextChapter ? '#fff' : textMuted} />
              </button>
            </div>
          </div>

          {/* Description */}
          {currentChapter?.description && (
            <div style={{ padding: '24px 28px', background: bg }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: textPrimary, margin: '0 0 12px' }}>About this lesson</h3>
              <p style={{ fontSize: 15, color: textMuted, lineHeight: 1.8, margin: 0 }}>{currentChapter.description}</p>
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

        {/* Right: Playlist Sidebar */}
        <div style={{
          width: 340, flexShrink: 0, display: 'flex', flexDirection: 'column',
          borderLeft: `1px solid ${border}`,
          background: isDarkMode ? '#1e293b' : '#f8fafc',
          height: 'calc(100vh - 56px)', overflowY: 'auto', position: 'sticky', top: 56,
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
              const isActive = ch.id === currentChapter?.id;
              const isDone = progress[courseId]?.includes(ch.id);
              const isLocked = !ch.is_demo && !hasAccess;

              return (
                <button
                  key={ch.id}
                  onClick={() => navigateToChapter(ch)}
                  disabled={isLocked}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 16px',
                    background: isActive
                      ? (isDarkMode ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.08)')
                      : 'transparent',
                    borderLeft: isActive ? '3px solid #6366f1' : '3px solid transparent',
                    border: 'none', cursor: isLocked ? 'not-allowed' : 'pointer',
                    opacity: isLocked ? 0.5 : 1,
                    textAlign: 'left',
                    transition: 'all 0.15s',
                    borderBottom: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}`,
                  }}
                >
                  {/* Status icon */}
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isActive ? '#6366f1' : isDone ? 'rgba(16,185,129,0.15)' : (isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
                  }}>
                    {isLocked
                      ? <Lock size={13} color={textMuted} />
                      : isActive
                        ? <Play size={12} color="#fff" fill="#fff" />
                        : isDone
                          ? <CheckCircle2 size={14} color="#10b981" />
                          : <span style={{ fontSize: 11, fontWeight: 700, color: textMuted }}>{idx + 1}</span>
                    }
                  </div>

                  {/* Chapter info */}
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <p style={{
                      fontSize: 13, fontWeight: isActive ? 700 : 500,
                      color: isActive ? '#6366f1' : textPrimary,
                      margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {ch.title}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <Clock size={10} color={textMuted} />
                      <span style={{ fontSize: 11, color: textMuted }}>
                        {ch.duration ? `${Math.floor(ch.duration / 60)}m ${ch.duration % 60}s` : 'Video'}
                      </span>
                      {ch.is_demo && (
                        <span style={{
                          fontSize: 9, fontWeight: 700, color: '#10b981',
                          background: 'rgba(16,185,129,0.12)', padding: '1px 5px', borderRadius: 4, marginLeft: 4,
                        }}>FREE</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
