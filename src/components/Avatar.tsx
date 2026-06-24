import React, { useState, useEffect } from 'react';

interface AvatarProps {
  uri?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const Avatar: React.FC<AvatarProps> = ({ uri, name, size = 40, className = '', style }) => {
  const [source, setSource] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const fallbackUri = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || 'User')}`;
  const targetUri = uri || fallbackUri;

  useEffect(() => {
    setSource(targetUri);
    setError(false);
  }, [targetUri]);

  if (!source) {
    return (
      <div 
        className={`flex justify-center items-center overflow-hidden bg-gray-200 rounded-full animate-pulse ${className}`}
        style={{ width: size, height: size, ...style }}
      />
    );
  }

  return (
    <img
      src={error ? fallbackUri : source}
      alt={name || 'Avatar'}
      onError={() => setError(true)}
      className={`object-cover rounded-full ${className}`}
      style={{ width: size, height: size, ...style }}
    />
  );
};
