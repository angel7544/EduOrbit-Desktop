import { useNavigate, useLocation } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { Tag, Check, X, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useCourseStore } from '../store/courseStore';
import { supabase } from '../lib/supabase';
import { currencyFormater, API_URL } from '../lib/utils';
import { Header } from '../components/Header';
import { useTheme } from '../hooks/useTheme';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function PurchaseScreen() {
  const { isDarkMode } = useTheme();
  const location = useLocation();
  const route = { params: location.state };
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { loadMyCourses } = useCourseStore();
  
  const [loading, setLoading] = useState(true);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

  const { courseId, courseTitle, price, selectedCouponCode } = route.params || {};

  const [couponCode, setCouponCode] = useState(selectedCouponCode || '');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [verifyingCoupon, setVerifyingCoupon] = useState(false);
  const [couponError, setCouponError] = useState('');

  useEffect(() => {
    if (selectedCouponCode) {
      setCouponCode(selectedCouponCode);
    }
  }, [selectedCouponCode]);

  useEffect(() => {
    checkPurchase();
    loadRazorpayScript();
  }, []);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const checkPurchase = async () => {
    if (!user) return;
    try {
      const { data: courseData } = await supabase
        .from('courses')
        .select('is_enrollment_closed')
        .eq('id', courseId)
        .single();
      
      if (courseData?.is_enrollment_closed) {
        alert('Sorry, enrollment for this course is currently closed.');
        navigate(-1);
        return;
      }

      const { data } = await supabase
        .from('purchases')
        .select('id')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .eq('status', 'success')
        .limit(1);
      
      if (data && data.length > 0) {
         if (window.confirm('You have already purchased this course. Go to course?')) {
             navigate('/coursedetails', { state: { course: { id: courseId, title: courseTitle } }, replace: true });
         } else {
             navigate(-1);
         }
         return;
       }
       setLoading(false);
    } catch (error) {
      console.error('Error checking purchase:', error);
      setLoading(false);
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    
    setVerifyingCoupon(true);
    setCouponError('');
    
    try {
      const { data, error } = await supabase
        .from('offers')
        .select('*, courses:course_id(title)')
        .eq('code', couponCode.toUpperCase().trim())
        .eq('is_active', true)
        .gt('expiry_date', new Date().toISOString())
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setCouponError('Invalid or expired coupon code');
        setAppliedCoupon(null);
      } else {
        if (data.course_id && data.course_id !== courseId) {
            const courseName = data.courses?.title || 'another course';
            setCouponError(`This coupon is only valid for ${courseName}`);
            setAppliedCoupon(null);
            setVerifyingCoupon(false);
            return;
        }

        setAppliedCoupon(data);
        setCouponError('');
      }
    } catch (error) {
      console.error('Error verifying coupon:', error);
      setCouponError('Failed to verify coupon');
    } finally {
      setVerifyingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
  };

  const roundTo2 = (val: number) => Number((Math.round((val + Number.EPSILON) * 100) / 100).toFixed(2));

  const calculateDiscountedPrice = () => {
    if (!appliedCoupon) return price;
    const discount = (price * appliedCoupon.discount_percentage) / 100;
    return Math.max(0, price - discount);
  };

  const discountedPrice = roundTo2(calculateDiscountedPrice());
  const platformFee = roundTo2(discountedPrice * 0.02);
  const finalPrice = roundTo2(discountedPrice + platformFee);

  const handleCreateOrder = async () => {
    if (!user) return;
    setIsCreatingOrder(true);
    try {
        const response = await fetch('/api/razorpay/order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                courseId,
                userId: user.id,
                couponCode: appliedCoupon ? appliedCoupon.code : undefined
            })
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to create order');
        
        openRazorpay(data);
    } catch (error: any) {
        alert(error.message || 'Failed to create order');
        setIsCreatingOrder(false);
    }
  };

  const openRazorpay = (orderData: any) => {
    if (!window.Razorpay) {
        alert("Razorpay SDK failed to load. Are you online?");
        setIsCreatingOrder(false);
        return;
    }

    const options = {
      key: orderData.keyId,
      amount: orderData.amount,
      currency: orderData.currency || 'INR',
      name: "EduOrbit LMS",
      description: courseTitle,
      image: "https://br31tech.live/logo.png",
      order_id: orderData.orderId,
      handler: async function (response: any) {
         await verifyPurchase(response);
      },
      prefill: {
        name: user?.user_metadata?.name || 'User',
        email: user?.email || 'test@example.com',
      },
      theme: {
        color: "#2563eb",
      },
      modal: {
        ondismiss: function() {
            setIsCreatingOrder(false);
        }
      }
    };

    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', function (response: any) {
        alert(`Payment Failed: ${response.error.description}`);
        setIsCreatingOrder(false);
    });
    rzp.open();
  };

  const verifyPurchase = async (paymentData: any) => {
    try {
      if (!user) return;

      const response = await fetch('/api/razorpay/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              razorpay_payment_id: paymentData.razorpay_payment_id,
              razorpay_order_id: paymentData.razorpay_order_id,
              razorpay_signature: paymentData.razorpay_signature,
              userId: user.id,
              userEmail: user.email,
              userName: user.user_metadata?.name,
              courseId,
              amount: finalPrice, 
              couponCode: appliedCoupon ? appliedCoupon.code : undefined
          })
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.details 
          ? `${data.error}\nDetails: ${typeof data.details === 'object' ? JSON.stringify(data.details) : data.details}`
          : (data.error || 'Payment verification failed');
        throw new Error(errorMessage);
      }
      
      if (data.warning) {
          alert(`Notice: ${data.warning}`);
      }

      await loadMyCourses(user);

      if (window.confirm('Course purchased successfully! Start Learning?')) {
          navigate('/coursedetails', { state: { course: { id: courseId, title: courseTitle } }, replace: true });
      } else {
          navigate(-1);
      }
    } catch (error: any) {
      console.error('Error verifying purchase:', error);
      alert(`Payment was successful, but server verification failed.\n\nError: ${error.message}\n\nPlease contact support with Payment ID: ${paymentData.razorpay_payment_id}`);
    } finally {
        setIsCreatingOrder(false);
    }
  };

  if (loading) {
    return (
      <div className={`flex flex-col min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <Header title="Checkout" showBack={true} />
        <div className="flex-1 flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <Header title="Checkout Summary" showBack={true} />
      
      <div className="flex-1 overflow-y-auto p-5 pb-24">
        <div className={`p-5 rounded-xl mb-5 shadow-sm ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <span className={`block text-lg font-bold mb-2 ${isDarkMode ? 'text-gray-50' : 'text-gray-900'}`}>{courseTitle}</span>
            <span className="text-base text-gray-500">Price: {currencyFormater(price)}</span>
        </div>

        <div className="mb-6">
            {!appliedCoupon ? (
                <div className={`flex flex-row items-center px-3 py-1 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'}`}>
                    <Tag size={20} className="text-gray-400 mr-2" />
                    <input
                        className={`flex-1 h-12 text-base bg-transparent border-none outline-none uppercase ${isDarkMode ? 'text-gray-50' : 'text-gray-900'}`}
                        placeholder="Enter Code"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                    />
                    <button 
                        className={`ml-2 px-4 py-2 rounded-md border-none font-semibold text-sm text-white ${!couponCode.trim() || verifyingCoupon ? 'bg-blue-300 cursor-not-allowed' : 'bg-primary cursor-pointer'}`}
                        onClick={handleApplyCoupon}
                        disabled={!couponCode.trim() || verifyingCoupon}
                    >
                        {verifyingCoupon ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            'Apply'
                        )}
                    </button>
                </div>
            ) : (
                <div className={`flex flex-row items-center justify-between p-3 rounded-lg border ${isDarkMode ? 'bg-green-900/30 border-green-800' : 'bg-green-100 border-green-300'}`}>
                    <div className="flex flex-row items-center gap-2">
                        <Check size={20} className={isDarkMode ? 'text-green-400' : 'text-green-600'} />
                        <span className={`text-sm ${isDarkMode ? 'text-green-400' : 'text-green-800'}`}>
                            Code <span className="font-bold">{appliedCoupon.code}</span> applied
                        </span>
                    </div>
                    <button onClick={removeCoupon} className="p-1 bg-transparent border-none cursor-pointer">
                        <X size={20} className="text-red-500" />
                    </button>
                </div>
            )}
            
            {couponError ? (
                <span className="text-red-500 text-xs mt-1 ml-1 block">{couponError}</span>
            ) : null}
        </div>

        <div className={`p-5 rounded-xl shadow-sm ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <span className={`block text-base font-semibold mb-3 ${isDarkMode ? 'text-gray-50' : 'text-gray-900'}`}>Order Summary</span>
            <div className="flex flex-row justify-between mb-3">
                <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Original Price</span>
                <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-50' : 'text-gray-900'}`}>{currencyFormater(price)}</span>
            </div>
            
            {appliedCoupon && (
                <div className={`flex flex-row justify-between mb-3 p-1 rounded transition-all`}>
                    <span className={`text-sm font-bold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>Discount ({appliedCoupon.discount_percentage}%)</span>
                    <span className={`text-sm font-bold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                        - {currencyFormater(price - discountedPrice)}
                    </span>
                </div>
            )}

            <div className="flex flex-row justify-between mb-3">
                <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Platform Fee (2%)</span>
                <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-50' : 'text-gray-900'}`}>{currencyFormater(platformFee)}</span>
            </div>

            <div className={`h-px w-full my-3 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />
            
            <div className="flex flex-row justify-between">
                <span className={`text-base font-bold ${isDarkMode ? 'text-gray-50' : 'text-gray-900'}`}>Total Amount</span>
                <span className="text-xl font-bold text-primary">{currencyFormater(finalPrice)}</span>
            </div>
        </div>
      </div>

      <div className={`absolute bottom-0 left-0 right-0 p-5 border-t ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <button 
              className={`w-full flex flex-row items-center justify-center py-4 rounded-xl gap-2 border-none cursor-pointer transition-opacity ${isCreatingOrder ? 'bg-blue-400 cursor-not-allowed' : 'bg-primary hover:opacity-90'}`}
              onClick={handleCreateOrder}
              disabled={isCreatingOrder}
          >
              {isCreatingOrder ? (
                   <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                  <>
                      <span className="text-white text-lg font-bold">Pay {currencyFormater(finalPrice)}</span>
                      <ArrowRight color="#fff" size={20} />
                  </>
              )}
          </button>
      </div>
    </div>
  );
}
