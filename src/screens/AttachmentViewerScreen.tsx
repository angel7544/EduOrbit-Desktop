import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { useTheme } from '../hooks/useTheme';

export default function AttachmentViewerScreen() {
  const location = useLocation();
  const route = { params: location.state };
  const navigate = useNavigate();
  const { url, title, type } = (route.params as any) || {};
  const [loading, setLoading] = useState(true);
  const { isDarkMode } = useTheme();

  const isPdf = type?.toLowerCase().includes('pdf') || url?.toLowerCase().endsWith('.pdf');
  const isOtherDoc = !isPdf && type?.match(/doc|docx|ppt|pptx|xls|xlsx/i);
  
  let sourceUrl = url;
  if (isOtherDoc) {
    sourceUrl = `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(url)}`;
  }

  return (
    <div className={`flex flex-col min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <Header 
        title={title || 'Attachment'} 
        showBack={true}
      />
      
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 flex justify-center items-center bg-white/80 dark:bg-black/80 z-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}
        
        {sourceUrl ? (
          <iframe 
            src={sourceUrl}
            className="w-full h-full border-none"
            onLoad={() => setLoading(false)}
            title={title || 'Attachment Viewer'}
          />
        ) : (
          <div className="flex-1 flex justify-center items-center p-5">
            <p className="text-base text-textLight text-center">Invalid or unsupported attachment URL.</p>
          </div>
        )}
      </div>
    </div>
  );
}
