import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Copy, CheckCircle, XCircle, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../hooks/useTheme';
import { currencyFormater } from '../lib/utils';
import { Header } from '../components/Header';

export default function MyPaymentsScreen() {
  const { user } = useAuthStore();
  const { isDarkMode } = useTheme();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<any[]>([]);

  useEffect(() => {
    fetchPayments();
  }, [user]);

  const fetchPayments = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('purchases')
        .select(`*, courses:course_id (title, thumbnail_url)`)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    alert('Copied: Payment ID copied to clipboard');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-500 bg-green-500/10';
      case 'failed': return 'text-red-500 bg-red-500/10';
      case 'pending': return 'text-amber-500 bg-amber-500/10';
      default: return 'text-gray-500 bg-gray-500/10';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle size={16} className="text-green-500" />;
      case 'failed': return <XCircle size={16} className="text-red-500" />;
      case 'pending': return <Clock size={16} className="text-amber-500" />;
      default: return <Clock size={16} className="text-gray-500" />;
    }
  };

  return (
    <div className={`flex flex-col min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <Header title="Payment History" showBack={true} />
      
      {loading ? (
        <div className="flex-1 flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="flex-1 p-4 overflow-y-auto pb-10 max-w-4xl mx-auto w-full">
          {payments.length > 0 ? (
            payments.map(item => (
              <div key={item.id} className={`rounded-xl border mb-4 overflow-hidden shadow-sm ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className="flex flex-row justify-between items-center p-4">
                  <div className="flex-1 mr-3">
                    <h3 className="text-base font-semibold mb-1 text-text truncate m-0">{item.courses?.title || 'Unknown Course'}</h3>
                    <p className="text-xs text-textLight m-0">
                      {new Date(item.created_at).toLocaleDateString()} • {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className={`px-2.5 py-1.5 rounded-lg ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
                    <span className="font-bold text-sm text-primary">₹{currencyFormater(item.amount)}</span>
                  </div>
                </div>

                <div className="h-px w-full bg-border" />

                <div className="p-4 flex flex-col gap-3">
                  <div className="flex flex-row justify-between items-center">
                    <span className="text-sm text-textLight m-0">Status</span>
                    <div className={`flex flex-row items-center px-2 py-1 rounded-full gap-1 ${getStatusColor(item.status).split(' ')[1]}`}>
                      {getStatusIcon(item.status)}
                      <span className={`text-xs font-bold uppercase ${getStatusColor(item.status).split(' ')[0]}`}>{item.status}</span>
                    </div>
                  </div>

                  <div className="flex flex-row justify-between items-center">
                    <span className="text-sm text-textLight m-0">Payment ID</span>
                    <button 
                      onClick={() => copyToClipboard(item.provider_payment_id || item.id)}
                      disabled={!item.provider_payment_id && !item.id}
                      className="flex flex-row items-center max-w-[60%] bg-transparent border-none cursor-pointer p-0"
                    >
                      <span className="text-sm font-medium truncate mr-1.5 text-text m-0">{item.provider_payment_id || item.id}</span>
                      <Copy size={14} className="text-primary" />
                    </button>
                  </div>

                  <div className="flex flex-row justify-between items-center">
                    <span className="text-sm text-textLight m-0">Method</span>
                    <span className="text-sm font-medium text-text m-0">
                      {item.provider === 'razorpay' ? 'Razorpay' : item.provider === 'manual_assignment' ? 'Admin Assigned' : item.provider || 'Free'}
                    </span>
                  </div>
                  
                  {item.coupon_code && (
                     <div className="flex flex-row justify-between items-center">
                      <span className="text-sm text-textLight m-0">Coupon Applied</span>
                      <span className="text-sm font-medium text-textLight m-0">{item.coupon_code}</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center pt-16 gap-3">
              <CreditCard size={48} className="text-border" />
              <span className="text-base text-textLight">No payment history found</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
