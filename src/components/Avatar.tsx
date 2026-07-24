import React, { useState, useEffect } from 'react';

interface AvatarProps {
  uri?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const Avatar: React.FC<AvatarProps> = ({ uri, name, size = 40, className = '', style }) => {
  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
  }, [uri]);

  const cleanName = name || 'User';
  const fallbackUri = `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName)}&background=6366f1&color=fff&bold=true`;
  const imageSource = (uri && !error) ? uri : fallbackUri;

  const getInitials = (n: string) => {
    const parts = n.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return n.slice(0, 2).toUpperCase();
  };

  return (
    <div
      className={`relative overflow-hidden rounded-full flex justify-center items-center bg-indigo-600 text-white font-bold select-none ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(12, Math.floor(size * 0.38)), ...style }}
    >
      <img
        src={imageSource}
        alt={cleanName}
        onError={() => setError(true)}
        className="w-full h-full object-cover rounded-full"
      />
      {error && !fallbackUri && (
        <span className="absolute inset-0 flex items-center justify-center bg-indigo-600 text-white font-bold">
          {getInitials(cleanName)}
        </span>
      )}
    </div>
  );
};
