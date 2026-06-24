import { useNavigate, useLocation } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import { ChevronLeft, Ticket, Copy } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTheme } from '../hooks/useTheme';

interface Offer {
  id: string;
  title: string;
  code: string | null;
  description: string | null;
  discount_percentage: number | null;
  expiry_date: string;
  image_url: string | null;
  is_active: boolean;
}

export default function CouponsScreen() {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { selectMode, previousScreen } = (location.state as any) || {};

  const [loading, setLoading] = useState(true);
  const [coupons, setCoupons] = useState<Offer[]>([]);

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .eq('is_active', true)
        .gte('expiry_date', new Date().toISOString())
        .order('expiry_date', { ascending: true });

      if (error) throw error;
      setCoupons(data || []);
    } catch (error) {
      console.error('Error fetching coupons:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCouponPress = async (item: Offer) => {
    if (selectMode && previousScreen && item.code) {
      await navigator.clipboard.writeText(item.code);
      navigate(-1);
    }
  };

  const copyToClipboard = async (code: string) => {
    await navigator.clipboard.writeText(code);
    alert(`Copied! Coupon code ${code} copied to clipboard.`);
  };

  const renderCoupon = (item: Offer) => {
    const formattedDate = new Date(item.expiry_date).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'long', year: 'numeric'
    });
    
    return (
      <div key={item.id} className={`flex flex-row rounded-xl mb-4 h-[120px] shadow-sm overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="w-5 h-full relative flex flex-col justify-between items-center">
          <div className={`w-5 h-5 rounded-full -mt-2.5 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`} />
          <div className={`absolute top-2.5 bottom-2.5 w-px border-l border-dashed -left-px ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`} />
          <div className={`w-5 h-5 rounded-full -mb-2.5 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`} />
        </div>

        <div className={`flex-1 flex flex-col justify-center py-3 px-4 border-l border-dashed ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <span className="text-xl font-bold text-indigo-600 mb-1 m-0">{item.discount_percentage}% off</span>
          <span className="text-sm font-medium text-text mb-2 m-0">{item.title}</span>
          
          {item.code && (
            <button 
              className="flex flex-row items-center py-1 bg-transparent border-none cursor-pointer text-left m-0 p-0"
              onClick={() => selectMode ? handleCouponPress(item) : copyToClipboard(item.code!)}
            >
              <span className="text-xs text-textLight m-0">
                Code: <span className="font-bold text-indigo-600">{item.code}</span>
              </span>
              {!selectMode && (
                <div className="ml-2 bg-indigo-600/10 px-2 py-1 rounded flex flex-row items-center">
                  <Copy size={12} className="text-indigo-600 mr-1" />
                  <span className="text-indigo-600 text-[10px] font-semibold">COPY</span>
                </div>
              )}
            </button>
          )}

          {selectMode && item.code && (
            <button
              className="mt-2 self-start bg-primary text-white text-xs font-semibold px-3 py-1.5 rounded cursor-pointer border-none"
              onClick={() => handleCouponPress(item)}
            >
              Apply
            </button>
          )}

          <span className="text-[10px] text-textLight mt-1 m-0">Valid until {formattedDate}</span>
        </div>

        <div className="w-5 h-full relative flex flex-col justify-between items-center">
          <div className={`w-5 h-5 rounded-full -mt-2.5 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`} />
          <div className={`w-5 h-5 rounded-full -mb-2.5 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`} />
        </div>
      </div>
    );
  };

  return (
    <div className={`flex flex-col min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
      <div className={`flex flex-row items-center justify-between px-5 py-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <button onClick={() => navigate(-1)} className="p-1 bg-transparent border-none cursor-pointer">
          <ChevronLeft size={24} className="text-text" />
        </button>
        <span className="text-lg font-bold text-text m-0">Coupons</span>
        <div className="w-6" />
      </div>

      {loading ? (
        <div className="flex-1 flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="p-5 overflow-y-auto pb-10 flex-1 max-w-4xl mx-auto w-full">
          {coupons.length > 0 ? (
            coupons.map(renderCoupon)
          ) : (
            <div className="flex flex-col items-center justify-center mt-16">
              <Ticket size={48} className="text-textLight" />
              <p className="mt-3 text-base text-textLight m-0">No active coupons available</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
