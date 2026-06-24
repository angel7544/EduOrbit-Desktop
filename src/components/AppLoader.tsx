import React from 'react';
import { RefreshCw, WifiOff } from 'lucide-react';

interface AppLoaderProps {
  isLoading: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export const AppLoader: React.FC<AppLoaderProps> = ({ isLoading, error, onRetry }) => {
  if (!isLoading && !error) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-white flex justify-center items-center">
      <div className="w-full p-5 flex flex-col items-center">
        {error ? (
          <div className="w-full px-5 flex flex-col items-center animate-fade-in">
            <WifiOff size={48} className="text-red-500" />
            <h2 className="text-xl font-bold text-gray-800 mt-4 mb-2">Connection Error</h2>
            <p className="text-sm text-gray-600 text-center mb-6 leading-relaxed">
              {error || 'Unable to load data. Please check your internet connection.'}
            </p>
            {onRetry && (
              <button 
                onClick={onRetry}
                className="flex items-center bg-primary text-white py-3 px-6 rounded-lg shadow-md hover:bg-primary/90 transition-colors cursor-pointer border-none"
              >
                <RefreshCw size={20} className="mr-2" />
                <span className="font-semibold text-base">Retry</span>
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center animate-pulse">
            <img 
              src="/icon.png" 
              alt="Logo"
              className="w-24 h-24 mb-8 rounded-2xl object-contain"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-5"></div>
            <p className="text-base text-gray-600 font-medium">Loading your content...</p>
          </div>
        )}
      </div>
    </div>
  );
};
