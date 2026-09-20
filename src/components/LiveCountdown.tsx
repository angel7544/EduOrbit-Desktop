import React, { useEffect, useState } from 'react';
import { Clock, Radio, Users, Play, ArrowRight } from 'lucide-react';

interface LiveCountdownProps {
  targetDate: string | Date | null | undefined;
  onTimeReached?: () => void;
  variant?: 'full' | 'compact' | 'mini' | 'badge';
  isDarkMode?: boolean;
}

export const LiveCountdown: React.FC<LiveCountdownProps> = ({
  targetDate,
  onTimeReached,
  variant = 'full',
  isDarkMode = true
}) => {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    total: number;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 });

  const hasFiredRef = React.useRef(false);

  useEffect(() => {
    hasFiredRef.current = false;
    if (!targetDate) return;

    const calculate = () => {
      const parsed = new Date(targetDate);
      if (isNaN(parsed.getTime())) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
      }
      const now = Date.now();
      const diff = parsed.getTime() - now;
      const totalSecs = Math.max(0, Math.floor(diff / 1000));

      const days = Math.floor(totalSecs / 86400);
      const hours = Math.floor((totalSecs % 86400) / 3600);
      const minutes = Math.floor((totalSecs % 3600) / 60);
      const seconds = totalSecs % 60;

      return { days, hours, minutes, seconds, total: totalSecs };
    };

    const initial = calculate();
    setTimeLeft(initial);

    // If already zero or negative on initial mount, do NOT trigger loop callback!
    if (initial.total <= 0) {
      return;
    }

    const interval = setInterval(() => {
      const remaining = calculate();
      setTimeLeft(remaining);
      if (remaining.total <= 0) {
        clearInterval(interval);
        if (!hasFiredRef.current) {
          hasFiredRef.current = true;
          onTimeReached?.();
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  const pad = (n: number) => String(n).padStart(2, '0');
  const isStartingSoon = timeLeft.total > 0 && timeLeft.total <= 600;

  if (timeLeft.total <= 0) {
    return (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: variant === 'full' ? '10px 24px' : '4px 12px',
        borderRadius: 99,
        background: 'linear-gradient(135deg, #dc2626, #ef4444)',
        color: '#fff',
        fontWeight: 900,
        fontSize: variant === 'full' ? 14 : 11,
        letterSpacing: '0.8px',
        boxShadow: '0 4px 18px rgba(239,68,68,0.4)',
        animation: 'pulse 1.5s infinite',
        margin: variant === 'full' ? '8px 0' : '0'
      }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', animation: 'ping 1s infinite' }} />
        <span>STARTING BROADCAST NOW...</span>
      </div>
    );
  }

  if (variant === 'mini') {
    return (
      <span style={{
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontWeight: 700,
        fontSize: 11,
        color: isStartingSoon ? '#ef4444' : '#d97706'
      }}>
        {timeLeft.days > 0 && `${timeLeft.days}d `}
        {pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
      </span>
    );
  }

  if (variant === 'badge' || variant === 'compact') {
    return (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 12px',
        borderRadius: 99,
        background: isStartingSoon 
          ? (isDarkMode ? 'rgba(239,68,68,0.16)' : '#fef2f2')
          : (isDarkMode ? 'rgba(245,158,11,0.14)' : 'rgba(245,158,11,0.12)'),
        border: isStartingSoon ? '1px solid rgba(239,68,68,0.35)' : '1px solid rgba(245,158,11,0.3)',
        color: isStartingSoon ? '#ef4444' : (isDarkMode ? '#fbbf24' : '#d97706'),
        fontSize: 11,
        fontWeight: 700
      }}>
        <Clock size={12} color={isStartingSoon ? '#ef4444' : (isDarkMode ? '#fbbf24' : '#d97706')} />
        <span>{isStartingSoon ? 'Live Soon:' : 'Starts in:'}</span>
        <span style={{
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          fontWeight: 800,
          letterSpacing: '0.5px'
        }}>
          {timeLeft.days > 0 ? `${timeLeft.days}d ` : ''}
          {pad(timeLeft.hours)}h {pad(timeLeft.minutes)}m {pad(timeLeft.seconds)}s
        </span>
      </div>
    );
  }

  // Full Large Countdown (for Waiting Room / Standby View)
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 12,
      margin: '6px 0',
      width: '100%',
      maxWidth: 480
    }}>
      {/* 4-Box Digital Clock Display */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        background: isDarkMode 
          ? 'linear-gradient(180deg, rgba(30, 27, 75, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)'
          : 'linear-gradient(180deg, #ffffff 0%, #fffbeb 100%)',
        padding: '16px 28px',
        borderRadius: 24,
        border: isStartingSoon 
          ? (isDarkMode ? '1.5px solid rgba(239,68,68,0.45)' : '1.5px solid rgba(239,68,68,0.35)')
          : (isDarkMode ? '1.5px solid rgba(245,158,11,0.35)' : '1.5px solid rgba(245,158,11,0.4)'),
        boxShadow: isDarkMode 
          ? '0 12px 36px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)' 
          : '0 10px 30px rgba(245,158,11,0.15)',
        backdropFilter: 'blur(16px)'
      }}>
        {/* Days Box (if > 0) */}
        {timeLeft.days > 0 && (
          <>
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              background: isDarkMode ? 'rgba(0,0,0,0.35)' : 'rgba(245,158,11,0.08)',
              padding: '10px 14px', borderRadius: 14, minWidth: 60,
              border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(245,158,11,0.2)'}`
            }}>
              <span style={{
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                fontSize: 30,
                fontWeight: 900,
                color: isDarkMode ? '#fef3c7' : '#92400e',
                lineHeight: 1
              }}>
                {pad(timeLeft.days)}
              </span>
              <span style={{ fontSize: 10, fontWeight: 800, color: '#f59e0b', letterSpacing: '1px', marginTop: 4 }}>
                DAYS
              </span>
            </div>
            <span style={{ fontSize: 24, fontWeight: 900, color: isDarkMode ? 'rgba(245,158,11,0.5)' : '#d97706', paddingBottom: 10 }}>:</span>
          </>
        )}

        {/* Hours Box */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          background: isDarkMode ? 'rgba(0,0,0,0.35)' : 'rgba(245,158,11,0.08)',
          padding: '10px 14px', borderRadius: 14, minWidth: 60,
          border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(245,158,11,0.2)'}`
        }}>
          <span style={{
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontSize: 30,
            fontWeight: 900,
            color: isDarkMode ? '#fef3c7' : '#92400e',
            lineHeight: 1
          }}>
            {pad(timeLeft.hours)}
          </span>
          <span style={{ fontSize: 10, fontWeight: 800, color: '#f59e0b', letterSpacing: '1px', marginTop: 4 }}>
            HOURS
          </span>
        </div>

        <span style={{ fontSize: 24, fontWeight: 900, color: isDarkMode ? 'rgba(245,158,11,0.5)' : '#d97706', paddingBottom: 10 }}>:</span>

        {/* Minutes Box */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          background: isDarkMode ? 'rgba(0,0,0,0.35)' : 'rgba(245,158,11,0.08)',
          padding: '10px 14px', borderRadius: 14, minWidth: 60,
          border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(245,158,11,0.2)'}`
        }}>
          <span style={{
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontSize: 30,
            fontWeight: 900,
            color: isDarkMode ? '#fef3c7' : '#92400e',
            lineHeight: 1
          }}>
            {pad(timeLeft.minutes)}
          </span>
          <span style={{ fontSize: 10, fontWeight: 800, color: '#f59e0b', letterSpacing: '1px', marginTop: 4 }}>
            MINS
          </span>
        </div>

        <span style={{ fontSize: 24, fontWeight: 900, color: isDarkMode ? 'rgba(245,158,11,0.5)' : '#d97706', paddingBottom: 10 }}>:</span>

        {/* Seconds Box */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          background: isDarkMode ? 'rgba(0,0,0,0.35)' : 'rgba(245,158,11,0.08)',
          padding: '10px 14px', borderRadius: 14, minWidth: 60,
          border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(245,158,11,0.2)'}`
        }}>
          <span style={{
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontSize: 30,
            fontWeight: 900,
            color: isStartingSoon ? '#ef4444' : (isDarkMode ? '#f59e0b' : '#b45309'),
            lineHeight: 1
          }}>
            {pad(timeLeft.seconds)}
          </span>
          <span style={{ fontSize: 10, fontWeight: 800, color: isStartingSoon ? '#ef4444' : '#f59e0b', letterSpacing: '1px', marginTop: 4 }}>
            SECS
          </span>
        </div>
      </div>
    </div>
  );
};

interface LiveViewerBadgeProps {
  initialCount?: number;
  isDarkMode?: boolean;
  pulse?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const LiveViewerBadge: React.FC<LiveViewerBadgeProps> = ({
  initialCount = 28,
  isDarkMode = true,
  pulse = true,
  size = 'md'
}) => {
  const [viewerCount, setViewerCount] = useState<number>(() => {
    return initialCount > 0 ? initialCount : Math.floor(Math.random() * 15) + 18;
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setViewerCount(prev => {
        const delta = Math.floor(Math.random() * 5) - 2;
        const next = prev + delta;
        return Math.max(12, next);
      });
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const isSmall = size === 'sm';
  const isLarge = size === 'lg';

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: isSmall ? 5 : 7,
      background: 'linear-gradient(135deg, #dc2626, #ef4444)',
      color: '#ffffff',
      padding: isSmall ? '2px 8px' : isLarge ? '6px 14px' : '4px 10px',
      borderRadius: 99,
      boxShadow: '0 2px 10px rgba(239,68,68,0.4)',
      fontWeight: 800,
      fontSize: isSmall ? 10 : isLarge ? 13 : 11,
      letterSpacing: '0.4px',
      userSelect: 'none'
    }}>
      <span style={{
        width: isSmall ? 6 : 7,
        height: isSmall ? 6 : 7,
        borderRadius: '50%',
        backgroundColor: '#fff',
        display: 'inline-block',
        animation: pulse ? 'pulse 1.2s infinite' : 'none'
      }} />
      <span>LIVE</span>
      <span style={{ opacity: 0.6, fontSize: 10 }}>•</span>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3.5 }}>
        <Users size={isSmall ? 10 : isLarge ? 14 : 12} />
        <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontWeight: 800 }}>
          {viewerCount}
        </span>
        <span style={{ fontSize: isSmall ? 9 : 10, fontWeight: 600, opacity: 0.9 }}>watching</span>
      </div>
    </div>
  );
};
