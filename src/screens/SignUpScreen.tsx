import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, User, Phone, Atom, BookOpen, GraduationCap } from 'lucide-react';
import { useAuthStore, UserRole } from '../store/authStore';
import { useTheme } from '../hooks/useTheme';
import { CustomToast } from '../components/CustomToast';

const APP_VERSION = '6.5.1';

export default function SignUpScreen() {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const { signUpWithEmail, loading } = useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' | 'info' }>({
    visible: false, message: '', type: 'error',
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'error') => {
    setToast({ visible: true, message, type });
  };
  const hideToast = () => setToast(prev => ({ ...prev, visible: false }));

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isValidPhone = (phone: string) => /^\d{10}$/.test(phone);

  const handleSignUp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!name || !email || !password || !confirmPassword || !phone) {
      showToast('Please fill in all fields'); return;
    }
    if (!isValidEmail(email.trim())) {
      showToast('Please enter a valid email address'); return;
    }
    if (!isValidPhone(phone.trim())) {
      showToast('Please enter a valid 10-digit phone number'); return;
    }
    if (password !== confirmPassword) {
      showToast('Passwords do not match'); return;
    }
    try {
      await signUpWithEmail(name.trim(), email.trim(), password, phone.trim(), role);
      alert('Your account has been created successfully');
    } catch (e: any) {
      showToast(e.message || 'Unable to create account');
    }
  };

  const textMuted = isDarkMode ? '#9ca3af' : '#6b7280';

  return (
    <div className={`h-screen w-screen flex overflow-hidden ${isDarkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
      
      {/* ── Left Branding Section (Desktop Web only) ── */}
      <div style={{
        width: '45%',
        background: 'linear-gradient(135deg, #1e3a8a, #2563eb)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '48px',
        overflow: 'hidden',
        userSelect: 'none'
      }} className="hidden lg:flex">
        {/* Animated background floating shapes */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.12, pointerEvents: 'none' }}>
          <Atom size={120} style={{ position: 'absolute', top: '10%', left: '10%', color: '#fff', animation: 'float 6s ease-in-out infinite' }} />
          <BookOpen size={100} style={{ position: 'absolute', top: '25%', right: '15%', color: '#fff', animation: 'float 7s ease-in-out infinite 0.5s' }} />
          <GraduationCap size={150} style={{ position: 'absolute', bottom: '15%', left: '15%', color: '#fff', animation: 'float 8s ease-in-out infinite 1s' }} />
        </div>
        <style>{`
          @keyframes float {
            0% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(8deg); }
            100% { transform: translateY(0px) rotate(0deg); }
          }
        `}</style>

        {/* Brand header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, zIndex: 10 }}>
          <img src="/logo.png" alt="EduOrbit" style={{ width: 40, height: 40, objectFit: 'contain' }} onError={(e) => { e.currentTarget.src = '/logo3.png'; }} />
          <span style={{ fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>EduOrbit</span>
        </div>

        {/* Branding content */}
        <div style={{ zIndex: 10, paddingRight: 32, margin: 'auto 0' }}>
          <h1 style={{ fontSize: 36, fontWeight: 800, color: '#fff', lineHeight: 1.25, marginBottom: 16 }}>
            Bihar’s Digital Learning Revolution.
          </h1>
          <p style={{ fontSize: 16, color: '#bfdbfe', lineHeight: 1.6, margin: 0, fontWeight: 500 }}>
            Empowering students across Bihar with state-of-the-art interactive digital courses, live sessions, and overall metrics tracking. Join Bihar's premier educational portal today.
          </p>
        </div>

        {/* Footer info */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#93c5fd', fontSize: 12, zIndex: 10 }}>
          <span>© {new Date().getFullYear()} EduOrbit</span>
          <span>v{APP_VERSION}</span>
        </div>
      </div>

      {/* ── Right Form Section ── */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-12 relative overflow-y-auto">
        <CustomToast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />

        <div style={{ width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column' }}>
          
          {/* Mobile logo and title */}
          <div className="lg:hidden flex flex-col items-center justify-center mb-6">
            <img src="/logo.png" alt="EduOrbit" style={{ width: 60, height: 60, objectFit: 'contain' }} onError={(e) => { e.currentTarget.src = '/logo3.png'; }} />
            <h2 style={{ fontSize: 22, fontWeight: 900, color: isDarkMode ? '#3b82f6' : '#2563eb', margin: '4px 0 2px' }}>EduOrbit</h2>
            <p style={{ fontSize: 12, color: textMuted, margin: 0 }}>Bihar’s Digital Learning Revolution.</p>
          </div>

          {/* Form Card */}
          <div style={{
            background: isDarkMode ? '#1f2937' : '#ffffff',
            border: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
            borderRadius: 24,
            padding: '32px 28px 24px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 24, fontWeight: 800, color: isDarkMode ? '#f9fafb' : '#111827', margin: '0 0 2px' }}>Create Account</h3>
              <p style={{ fontSize: 12, color: textMuted, margin: 0 }}>Join EduOrbit learning portal today</p>
            </div>

            <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              {/* Full Name field */}
              <div style={{
                display: 'flex', alignItems: 'center', height: 44, borderRadius: 99,
                border: `1px solid ${isDarkMode ? '#4b5563' : '#d1d5db'}`,
                background: isDarkMode ? '#374151' : '#f9fafb',
                padding: '0 16px'
              }}>
                <User size={16} color={isDarkMode ? '#9ca3af' : '#6b7280'} style={{ marginRight: 10, flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    flex: 1, height: '100%', background: 'transparent', border: 'none', outline: 'none',
                    fontSize: 13, color: isDarkMode ? '#f9fafb' : '#111827'
                  }}
                />
              </div>

              {/* Email field */}
              <div style={{
                display: 'flex', alignItems: 'center', height: 44, borderRadius: 99,
                border: `1px solid ${isDarkMode ? '#4b5563' : '#d1d5db'}`,
                background: isDarkMode ? '#374151' : '#f9fafb',
                padding: '0 16px'
              }}>
                <Mail size={16} color={isDarkMode ? '#9ca3af' : '#6b7280'} style={{ marginRight: 10, flexShrink: 0 }} />
                <input
                  type="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    flex: 1, height: '100%', background: 'transparent', border: 'none', outline: 'none',
                    fontSize: 13, color: isDarkMode ? '#f9fafb' : '#111827'
                  }}
                />
              </div>

              {/* Phone field */}
              <div style={{
                display: 'flex', alignItems: 'center', height: 44, borderRadius: 99,
                border: `1px solid ${isDarkMode ? '#4b5563' : '#d1d5db'}`,
                background: isDarkMode ? '#374151' : '#f9fafb',
                padding: '0 16px'
              }}>
                <Phone size={16} color={isDarkMode ? '#9ca3af' : '#6b7280'} style={{ marginRight: 10, flexShrink: 0 }} />
                <input
                  type="tel"
                  placeholder="Phone Number (10 digits)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={10}
                  style={{
                    flex: 1, height: '100%', background: 'transparent', border: 'none', outline: 'none',
                    fontSize: 13, color: isDarkMode ? '#f9fafb' : '#111827'
                  }}
                />
              </div>

              {/* Password field */}
              <div style={{
                display: 'flex', alignItems: 'center', height: 44, borderRadius: 99,
                border: `1px solid ${isDarkMode ? '#4b5563' : '#d1d5db'}`,
                background: isDarkMode ? '#374151' : '#f9fafb',
                padding: '0 16px'
              }}>
                <Lock size={16} color={isDarkMode ? '#9ca3af' : '#6b7280'} style={{ marginRight: 10, flexShrink: 0 }} />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    flex: 1, height: '100%', background: 'transparent', border: 'none', outline: 'none',
                    fontSize: 13, color: isDarkMode ? '#f9fafb' : '#111827'
                  }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, marginLeft: 8, display: 'flex', alignItems: 'center' }}>
                  {showPassword ? <EyeOff size={16} color={isDarkMode ? '#9ca3af' : '#6b7280'} /> : <Eye size={16} color={isDarkMode ? '#9ca3af' : '#6b7280'} />}
                </button>
              </div>

              {/* Confirm Password field */}
              <div style={{
                display: 'flex', alignItems: 'center', height: 44, borderRadius: 99,
                border: `1px solid ${isDarkMode ? '#4b5563' : '#d1d5db'}`,
                background: isDarkMode ? '#374151' : '#f9fafb',
                padding: '0 16px'
              }}>
                <Lock size={16} color={isDarkMode ? '#9ca3af' : '#6b7280'} style={{ marginRight: 10, flexShrink: 0 }} />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{
                    flex: 1, height: '100%', background: 'transparent', border: 'none', outline: 'none',
                    fontSize: 13, color: isDarkMode ? '#f9fafb' : '#111827'
                  }}
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, marginLeft: 8, display: 'flex', alignItems: 'center' }}>
                  {showConfirmPassword ? <EyeOff size={16} color={isDarkMode ? '#9ca3af' : '#6b7280'} /> : <Eye size={16} color={isDarkMode ? '#9ca3af' : '#6b7280'} />}
                </button>
              </div>

              {/* Role selection */}
              <div style={{ marginTop: 2, marginBottom: 2 }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: textMuted, margin: '0 0 6px 4px' }}>I am a:</p>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    type="button"
                    onClick={() => setRole('student')}
                    style={{
                      flex: 1, height: 38, borderRadius: 99, border: 'none', cursor: 'pointer',
                      background: role === 'student' ? '#2563eb' : (isDarkMode ? '#374151' : '#f3f4f6'),
                      color: role === 'student' ? '#ffffff' : (isDarkMode ? '#d1d5db' : '#4b5563'),
                      fontSize: 13, fontWeight: 700, transition: 'all 0.2s'
                    }}
                  >
                    Student
                  </button>
                </div>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  height: 44, borderRadius: 99, background: '#2563eb', color: '#ffffff',
                  fontWeight: 700, fontSize: 14, letterSpacing: '0.5px', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
                  border: 'none', cursor: 'pointer', marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: loading ? 0.7 : 1, transition: 'opacity 0.2s'
                }}
              >
                {loading ? 'CREATING...' : 'CREATE ACCOUNT'}
              </button>
            </form>

            {/* Back to sign in */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13, color: isDarkMode ? '#d1d5db' : '#4b5563' }}>Already have an account?</span>
              <button type="button" onClick={() => navigate('/login')} style={{ fontSize: 13, fontWeight: 700, color: '#2563eb', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
                Sign In
              </button>
            </div>
          </div>

          {/* Links for Web layout */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 24 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginBottom: 4 }}>
              <button onClick={() => navigate('/aboutus')} style={{ fontSize: 11, color: textMuted, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>About Us</button>
              <span style={{ fontSize: 11, color: textMuted }}>•</span>
              <button onClick={() => navigate('/termsofservice')} style={{ fontSize: 11, color: textMuted, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>Terms of Service</button>
              <span style={{ fontSize: 11, color: textMuted }}>•</span>
              <button onClick={() => navigate('/privacypolicy')} style={{ fontSize: 11, color: textMuted, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>Privacy Policy</button>
            </div>
            <p style={{ fontSize: 10, color: textMuted, margin: 0 }}>v{APP_VERSION}</p>
          </div>

        </div>
      </div>
    </div>
  );
  
}
