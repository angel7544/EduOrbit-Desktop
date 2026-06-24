import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Tag, Copy, Check, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTheme } from '../hooks/useTheme';
import { Sidebar } from '../components/Sidebar';
import { useUIStore } from '../store/uiStore';

// Session-based storage for seen offers
const seenOffersSession = new Set<string>();

export default function MainScreen() {
  const { isDarkMode } = useTheme();
  const [offerModalVisible, setOfferModalVisible] = useState(false);
  const [currentOffer, setCurrentOffer] = useState<any>(null);
  const [isCopied, setIsCopied] = useState(false);
  const { sidebarWidth } = useUIStore();

  useEffect(() => {
    checkOffers();
  }, []);

  const handleCopy = async () => {
    if (currentOffer?.code) {
      await navigator.clipboard.writeText(currentOffer.code);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const checkOffers = async () => {
    try {
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .eq('is_active', true)
        .gt('expiry_date', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        if (!seenOffersSession.has(data.id)) {
          setCurrentOffer(data);
          setOfferModalVisible(true);
          seenOffersSession.add(data.id);
        }
      }
    } catch (error) {
      console.error('Error checking offers:', error);
    }
  };

  return (
    <div className="flex h-screen w-full relative bg-background overflow-hidden">
      <Sidebar />
      <div 
        style={{ marginLeft: `${sidebarWidth}px` }} 
        className="flex-1 overflow-y-auto h-screen bg-background"
      >
        <div className="max-w-7xl mx-auto w-full min-h-screen">
          <Outlet />
        </div>
      </div>

      {offerModalVisible && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center p-5 z-[9999]">
          <div className={`relative w-full max-w-[340px] rounded-[20px] p-6 flex flex-col items-center shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <button
              className="absolute top-4 right-4 bg-transparent border-none cursor-pointer p-0"
              onClick={() => setOfferModalVisible(false)}
            >
              <X size={24} className="text-textLight hover:text-text transition-colors" />
            </button>

            <div className={`w-16 h-16 rounded-full flex justify-center items-center mb-4 overflow-hidden ${isDarkMode ? 'bg-gray-700' : 'bg-blue-50'}`}>
              {currentOffer?.image_url ? (
                <img
                  src={currentOffer.image_url}
                  className="w-full h-full object-cover"
                  alt="Offer"
                />
              ) : (
                <Tag size={32} className="text-primary" />
              )}
            </div>

            <h2 className="text-xl font-bold mb-2 text-center text-text m-0">
              {currentOffer?.title || 'Special Offer!'}
            </h2>
            <p className="text-sm text-center mb-5 leading-5 text-textLight m-0">
              {currentOffer?.description || `Get ${currentOffer?.discount_percentage}% OFF on your next purchase!`}
            </p>

            <div className={`w-full py-3 px-6 rounded-lg flex flex-col items-center mb-4 border border-dashed ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-100 border-gray-300'}`}>
              <span className="text-xs text-textLight mb-1 uppercase tracking-widest m-0">Use Code:</span>
              <div className="flex flex-row items-center justify-center gap-3">
                <span className="text-2xl font-bold tracking-widest text-primary m-0">
                  {currentOffer?.code || 'CODE'}
                </span>
                <button 
                  onClick={handleCopy} 
                  className={`p-2 rounded-lg cursor-pointer border-none flex justify-center items-center ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-blue-50 hover:bg-blue-100'} transition-colors`}
                >
                  {isCopied ? <Check size={20} className="text-green-600" /> : <Copy size={20} className="text-primary" />}
                </button>
              </div>
            </div>

            <span className="text-base font-semibold mb-6 text-green-600 m-0">
              {currentOffer?.discount_percentage}% Discount
            </span>

            <button
              className="w-full py-3 px-8 rounded-[10px] bg-primary text-white text-base font-semibold text-center border-none cursor-pointer hover:opacity-90 transition-opacity shadow-md"
              onClick={() => setOfferModalVisible(false)}
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
