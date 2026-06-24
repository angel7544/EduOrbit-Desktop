import React, { useEffect, useState } from 'react';
import { 
  Code, Cpu, Globe, Wifi, Database, Cloud, Zap, Terminal, Activity, 
  Layers, Smartphone, Radio, Box, Server, Monitor, Shield
} from 'lucide-react';

const NEON_COLORS = [
  '#FF0055', '#FF9900', '#FFFF00', '#33FF00', '#00FFFF', '#0099FF', '#9900FF',
];

const ICONS = [
  Code, Cpu, Globe, Wifi, Database, Cloud, Zap, Terminal, 
  Activity, Layers, Smartphone, Radio, Box, Server, Monitor, Shield
];

export const AnimatedBackground = ({ children }: { children: React.ReactNode }) => {
  const [windowSize, setWindowSize] = useState({ width: 1000, height: 800 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    setMounted(true);
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const blobs = Array.from({ length: 8 }).map((_, i) => ({
    color: NEON_COLORS[i % NEON_COLORS.length],
    x: Math.random() * windowSize.width * 0.8,
    y: Math.random() * windowSize.height * 0.8,
    size: 250 + Math.random() * 200,
    delay: Math.random() * 5,
    duration: 10 + Math.random() * 10,
  }));

  const icons = Array.from({ length: 12 }).map((_, i) => ({
    Icon: ICONS[i % ICONS.length],
    x: Math.random() * (windowSize.width - 40),
    y: Math.random() * (windowSize.height - 40),
    size: 24 + Math.random() * 24,
    color: NEON_COLORS[i % NEON_COLORS.length],
    delay: Math.random() * 5,
    duration: 15 + Math.random() * 10,
    rotate: i * 45,
  }));

  return (
    <div className="relative w-full h-full min-h-screen bg-[#050505] overflow-hidden bg-gradient-to-br from-[#050505] via-[#1a1a2e] to-[#16213e]">
      
      {mounted && blobs.map((blob, i) => (
        <div
          key={`blob-${i}`}
          className="absolute rounded-full opacity-40 mix-blend-screen"
          style={{
            left: blob.x,
            top: blob.y,
            width: blob.size,
            height: blob.size,
            background: `radial-gradient(circle, ${blob.color}80 0%, ${blob.color}20 50%, transparent 100%)`,
            animation: `float ${blob.duration}s ease-in-out infinite alternate ${blob.delay}s`,
          }}
        />
      ))}

      {mounted && icons.map((icon, i) => {
        const { Icon } = icon;
        return (
          <div
            key={`icon-${i}`}
            className="absolute opacity-15"
            style={{
              left: icon.x,
              top: icon.y,
              color: icon.color,
              transform: `rotate(${icon.rotate}deg)`,
              animation: `float-slow ${icon.duration}s ease-in-out infinite alternate ${icon.delay}s`,
            }}
          >
            <Icon size={icon.size} />
          </div>
        );
      })}

      <div className="relative z-10 w-full h-full flex flex-col">
        {children}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes float {
          0% { transform: translate(0px, 0px) scale(1); }
          100% { transform: translate(30px, 30px) scale(1.1); }
        }
        @keyframes float-slow {
          0% { transform: translate(0px, 0px) rotate(0deg); }
          100% { transform: translate(-40px, 40px) rotate(15deg); }
        }
      `}} />
    </div>
  );
};
