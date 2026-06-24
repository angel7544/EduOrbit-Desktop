import { useNavigate, useLocation } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { Tag, Check, X, ShieldCheck, Zap, Lock, ChevronRight, Ticket } from 'lucide-react';
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
    if (selectedCouponCode) setCouponCode(selectedCouponCode);
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
  const savings = roundTo2(price - discountedPrice);

  const handleCreateOrder = async () => {
    if (!user) return;
    setIsCreatingOrder(true);
    try {
      const response = await fetch(`${API_URL}razorpay/order`, {
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
      alert('Razorpay SDK failed to load. Are you online?');
      setIsCreatingOrder(false);
      return;
    }

    const options = {
      key: orderData.keyId,
      amount: orderData.amount,
      currency: orderData.currency || 'INR',
      name: 'EduOrbit LMS',
      description: courseTitle,
      image: 'https://br31tech.live/logo.png',
      order_id: orderData.orderId,
      handler: async function (response: any) {
        await verifyPurchase(response);
      },
      prefill: {
        name: user?.user_metadata?.name || 'User',
        email: user?.email || 'test@example.com',
      },
      theme: { color: '#6366f1' },
      modal: {
        ondismiss: function () {
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
      const response = await fetch(`${API_URL}razorpay/verify`, {
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

      if (data.warning) alert(`Notice: ${data.warning}`);

      await loadMyCourses(user);

      if (window.confirm('🎉 Course purchased successfully! Start Learning?')) {
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

  // ─── Loading State ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: isDarkMode ? '#0f0f1a' : '#f5f5ff',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <Header title="Checkout" showBack={true} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              border: '3px solid transparent',
              borderTopColor: '#6366f1',
              borderRightColor: '#6366f1',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 12px',
            }} />
            <p style={{ color: isDarkMode ? '#a5b4fc' : '#6366f1', fontSize: 14 }}>Loading checkout...</p>
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ─── Main Checkout UI ─────────────────────────────────────────────────────────
  const bg = isDarkMode ? '#0f0f1a' : '#f5f5ff';
  const cardBg = isDarkMode ? 'rgba(255,255,255,0.04)' : '#ffffff';
  const cardBorder = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(99,102,241,0.12)';
  const textPrimary = isDarkMode ? '#f1f0ff' : '#1e1b4b';
  const textMuted = isDarkMode ? '#9ca3af' : '#6b7280';

  return (
    <div style={{ minHeight: '100vh', background: bg, display: 'flex', flexDirection: 'column' }}>
      <Header title="Checkout" showBack={true} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px 120px', maxWidth: 640, margin: '0 auto', width: '100%' }}>

        {/* ── Course Card ── */}
        <div style={{
          background: isDarkMode
            ? 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.1) 100%)'
            : 'linear-gradient(135deg, #eef2ff 0%, #ede9fe 100%)',
          border: `1px solid ${isDarkMode ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.2)'}`,
          borderRadius: 16,
          padding: '20px 20px',
          marginBottom: 16,
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: -30, right: -30,
            width: 120, height: 120, borderRadius: '50%',
            background: isDarkMode ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.06)',
          }} />
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Zap size={22} color="#fff" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 11, color: '#6366f1', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 4px' }}>
                Enrolling in
              </p>
              <p style={{ fontSize: 16, fontWeight: 700, color: textPrimary, margin: '0 0 6px', lineHeight: 1.4 }}>
                {courseTitle}
              </p>
              <p style={{ fontSize: 13, color: textMuted, margin: 0 }}>
                Lifetime access · Certificate included
              </p>
            </div>
          </div>
        </div>

        {/* ── Coupon Section ── */}
        <div style={{
          background: cardBg,
          border: `1px solid ${cardBorder}`,
          borderRadius: 16,
          padding: 16,
          marginBottom: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Ticket size={16} color="#6366f1" />
            <span style={{ fontSize: 13, fontWeight: 600, color: textPrimary }}>Coupon Code</span>
          </div>

          {!appliedCoupon ? (
            <div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f8f7ff',
                border: `1.5px solid ${couponError ? '#ef4444' : isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(99,102,241,0.2)'}`,
                borderRadius: 12, padding: '4px 4px 4px 14px',
                transition: 'border-color 0.2s',
              }}>
                <Tag size={16} color={textMuted} />
                <input
                  style={{
                    flex: 1, height: 40, background: 'transparent',
                    border: 'none', outline: 'none',
                    fontSize: 14, fontWeight: 600, letterSpacing: 1.5,
                    color: textPrimary, textTransform: 'uppercase',
                  }}
                  placeholder="ENTER CODE"
                  value={couponCode}
                  onChange={(e) => { setCouponCode(e.target.value); setCouponError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                />
                <button
                  style={{
                    padding: '10px 18px', borderRadius: 10,
                    background: !couponCode.trim() || verifyingCoupon
                      ? (isDarkMode ? 'rgba(99,102,241,0.3)' : '#c7d2fe')
                      : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    border: 'none', cursor: !couponCode.trim() || verifyingCoupon ? 'not-allowed' : 'pointer',
                    color: '#fff', fontSize: 13, fontWeight: 700,
                    display: 'flex', alignItems: 'center', gap: 6,
                    transition: 'opacity 0.2s',
                  }}
                  onClick={handleApplyCoupon}
                  disabled={!couponCode.trim() || verifyingCoupon}
                >
                  {verifyingCoupon ? (
                    <div style={{
                      width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)',
                      borderTopColor: '#fff', borderRadius: '50%',
                      animation: 'spin 0.7s linear infinite',
                    }} />
                  ) : 'Apply'}
                </button>
              </div>
              {couponError && (
                <p style={{ fontSize: 12, color: '#ef4444', margin: '8px 0 0 4px' }}>{couponError}</p>
              )}
            </div>
          ) : (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: isDarkMode ? 'rgba(16,185,129,0.1)' : '#ecfdf5',
              border: `1.5px solid ${isDarkMode ? 'rgba(16,185,129,0.3)' : '#a7f3d0'}`,
              borderRadius: 12, padding: '12px 12px 12px 16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: isDarkMode ? 'rgba(16,185,129,0.2)' : '#d1fae5',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Check size={16} color={isDarkMode ? '#34d399' : '#059669'} />
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: isDarkMode ? '#34d399' : '#065f46', margin: 0 }}>
                    {appliedCoupon.code}
                  </p>
                  <p style={{ fontSize: 11, color: isDarkMode ? '#6ee7b7' : '#047857', margin: 0 }}>
                    {appliedCoupon.discount_percentage}% discount applied
                  </p>
                </div>
              </div>
              <button
                onClick={removeCoupon}
                style={{
                  width: 32, height: 32, borderRadius: 8, border: 'none',
                  background: isDarkMode ? 'rgba(239,68,68,0.15)' : '#fee2e2',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <X size={15} color="#ef4444" />
              </button>
            </div>
          )}
        </div>

        {/* ── Order Summary ── */}
        <div style={{
          background: cardBg,
          border: `1px solid ${cardBorder}`,
          borderRadius: 16,
          padding: 20,
          marginBottom: 16,
        }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: textPrimary, margin: '0 0 16px' }}>
            Order Summary
          </p>

          {/* Original Price */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: textMuted }}>Original Price</span>
            <span style={{
              fontSize: 13, fontWeight: 600, color: textPrimary,
              textDecoration: appliedCoupon ? 'line-through' : 'none',
              opacity: appliedCoupon ? 0.5 : 1,
            }}>
              {currencyFormater(price)}
            </span>
          </div>

          {/* Discount Row */}
          {appliedCoupon && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: isDarkMode ? '#34d399' : '#059669' }}>
                Coupon Discount ({appliedCoupon.discount_percentage}%)
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: isDarkMode ? '#34d399' : '#059669' }}>
                − {currencyFormater(savings)}
              </span>
            </div>
          )}

          {/* Platform Fee */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 13, color: textMuted }}>Platform Fee <span style={{ fontSize: 11 }}>(2%)</span></span>
            <span style={{ fontSize: 13, color: textMuted }}>+ {currencyFormater(platformFee)}</span>
          </div>

          {/* Divider */}
          <div style={{
            height: 1,
            background: isDarkMode
              ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)'
              : 'linear-gradient(90deg, transparent, rgba(99,102,241,0.15), transparent)',
            marginBottom: 16,
          }} />

          {/* Total */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: textPrimary }}>Total Amount</span>
            <span style={{
              fontSize: 22, fontWeight: 800,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              {currencyFormater(finalPrice)}
            </span>
          </div>

          {/* Savings badge */}
          {appliedCoupon && savings > 0 && (
            <div style={{
              marginTop: 12, padding: '8px 12px', borderRadius: 10,
              background: isDarkMode ? 'rgba(16,185,129,0.1)' : '#ecfdf5',
              border: `1px dashed ${isDarkMode ? 'rgba(52,211,153,0.3)' : '#6ee7b7'}`,
              textAlign: 'center',
            }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: isDarkMode ? '#34d399' : '#059669' }}>
                🎉 You're saving {currencyFormater(savings)} on this course!
              </span>
            </div>
          )}
        </div>

        {/* ── Trust Badges ── */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
          {[
            { icon: <ShieldCheck size={14} />, text: '100% Secure Payment' },
            { icon: <Lock size={14} />, text: 'SSL Encrypted' },
          ].map((badge, i) => (
            <div key={i} style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '8px 12px', borderRadius: 10,
              background: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(99,102,241,0.05)',
              border: `1px solid ${cardBorder}`,
            }}>
              <span style={{ color: '#6366f1' }}>{badge.icon}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: textMuted }}>{badge.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Sticky Pay Button ── */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        padding: '16px 20px',
        background: isDarkMode
          ? 'rgba(15,15,26,0.95)'
          : 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(12px)',
        borderTop: `1px solid ${cardBorder}`,
        maxWidth: 640, margin: '0 auto',
        left: '50%', transform: 'translateX(-50%)',
        width: '100%',
        boxSizing: 'border-box',
      }}>
        <button
          id="pay-now-btn"
          style={{
            width: '100%', padding: '16px 24px',
            borderRadius: 14, border: 'none', cursor: isCreatingOrder ? 'not-allowed' : 'pointer',
            background: isCreatingOrder
              ? (isDarkMode ? 'rgba(99,102,241,0.4)' : '#c7d2fe')
              : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            boxShadow: isCreatingOrder ? 'none' : '0 4px 24px rgba(99,102,241,0.4)',
            transition: 'all 0.2s',
          }}
          onClick={handleCreateOrder}
          disabled={isCreatingOrder}
        >
          {isCreatingOrder ? (
            <>
              <div style={{
                width: 20, height: 20, border: '2.5px solid rgba(255,255,255,0.3)',
                borderTopColor: '#fff', borderRadius: '50%',
                animation: 'spin 0.7s linear infinite',
              }} />
              <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 16, fontWeight: 700 }}>
                Processing...
              </span>
            </>
          ) : (
            <>
              <span style={{ color: '#fff', fontSize: 17, fontWeight: 800 }}>
                Pay {currencyFormater(finalPrice)}
              </span>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <ChevronRight size={18} color="#fff" />
              </div>
            </>
          )}
        </button>
        <p style={{ textAlign: 'center', fontSize: 11, color: textMuted, margin: '8px 0 0' }}>
          Powered by Razorpay · UPI · Cards · Net Banking
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        #pay-now-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 28px rgba(99,102,241,0.5) !important; }
      `}</style>
    </div>
  );
}
