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

  return (
    <div className="min-h-screen flex flex-col bg-primary relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <Atom size={120} className="absolute top-[10%] left-[10%] text-white animate-[float_6s_ease-in-out_infinite]" />
        <BookOpen size={100} className="absolute top-[20%] right-[15%] text-white animate-[float_7s_ease-in-out_infinite_500ms]" />
        <GraduationCap size={150} className="absolute top-[40%] left-[20%] text-white animate-[float_8s_ease-in-out_infinite_1000ms]" />
      </div>

      <CustomToast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />

      <div className="flex-1 flex flex-col pt-16 overflow-y-auto max-w-md mx-auto w-full">
        <div className="flex flex-col items-center justify-center py-8 z-10">
          <img src="/logo3.png" alt="EduOrbit" className="w-32 h-32 object-contain" onError={(e) => { e.currentTarget.src = '/vite.svg'; }} />
          <p className="text-blue-100 text-base mt-2 m-0">Bihar’s Digital Learning Revolution.</p>
        </div>

        <div className={`flex-1 rounded-t-[35px] p-8 pb-12 shadow-2xl z-10 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
          <h2 className="text-3xl font-bold mb-8 text-text m-0">Create Account</h2>

          <form onSubmit={handleSignUp} className="flex flex-col gap-4 mb-8">
            <div className="flex items-center px-4 h-[50px] rounded-full border border-border bg-inputBackground">
              <User size={20} className="text-textLight mr-3 flex-shrink-0" />
              <input type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} className="flex-1 h-full bg-transparent border-none outline-none text-text text-base" />
            </div>

            <div className="flex items-center px-4 h-[50px] rounded-full border border-border bg-inputBackground">
              <Mail size={20} className="text-textLight mr-3 flex-shrink-0" />
              <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="flex-1 h-full bg-transparent border-none outline-none text-text text-base" />
            </div>

            <div className="flex items-center px-4 h-[50px] rounded-full border border-border bg-inputBackground">
              <Phone size={20} className="text-textLight mr-3 flex-shrink-0" />
              <input type="tel" placeholder="Phone Number (10 digits)" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={10} className="flex-1 h-full bg-transparent border-none outline-none text-text text-base" />
            </div>

            <div className="flex items-center px-4 h-[50px] rounded-full border border-border bg-inputBackground">
              <Lock size={20} className="text-textLight mr-3 flex-shrink-0" />
              <input type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="flex-1 h-full bg-transparent border-none outline-none text-text text-base" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="bg-transparent border-none cursor-pointer p-0 ml-2">
                {showPassword ? <EyeOff size={20} className="text-textLight" /> : <Eye size={20} className="text-textLight" />}
              </button>
            </div>

            <div className="flex items-center px-4 h-[50px] rounded-full border border-border bg-inputBackground">
              <Lock size={20} className="text-textLight mr-3 flex-shrink-0" />
              <input type={showConfirmPassword ? "text" : "password"} placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="flex-1 h-full bg-transparent border-none outline-none text-text text-base" />
              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="bg-transparent border-none cursor-pointer p-0 ml-2">
                {showConfirmPassword ? <EyeOff size={20} className="text-textLight" /> : <Eye size={20} className="text-textLight" />}
              </button>
            </div>

            <div className="mt-2 mb-2">
              <p className="text-sm font-semibold mb-2 ml-1 text-text m-0">I am a:</p>
              <div className="flex flex-row gap-4">
                <button type="button" onClick={() => setRole('student')} className={`flex-1 py-3 rounded-full border font-bold text-sm cursor-pointer transition-colors ${role === 'student' ? 'bg-primary border-primary text-white' : 'bg-transparent border-border text-text'}`}>
                  Student
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="h-[50px] rounded-full bg-primary text-white font-bold text-lg tracking-wider shadow-md hover:bg-primary/90 transition-colors cursor-pointer border-none mt-4 disabled:opacity-70 disabled:cursor-not-allowed">
              {loading ? 'CREATING...' : 'CREATE ACCOUNT'}
            </button>
          </form>

          <div className="flex flex-row justify-center items-center gap-1 mb-8">
            <span className="text-base text-text">Already have an account?</span>
            <button type="button" onClick={() => navigate('/login')} className="text-base font-bold text-primary bg-transparent border-none cursor-pointer p-0">
              Sign In
            </button>
          </div>

          <div className="flex flex-col items-center mt-auto">
            <div className="flex flex-row items-center flex-wrap justify-center gap-2 mb-1">
              <button onClick={() => navigate('/aboutus')} className="text-xs text-textLight bg-transparent border-none cursor-pointer hover:underline p-0">About Us</button>
              <span className="text-xs text-textLight">|</span>
              <button onClick={() => navigate('/termsofservice')} className="text-xs text-textLight bg-transparent border-none cursor-pointer hover:underline p-0">Terms of Service</button>
              <span className="text-xs text-textLight">|</span>
              <button onClick={() => navigate('/privacypolicy')} className="text-xs text-textLight bg-transparent border-none cursor-pointer hover:underline p-0">Privacy Policy</button>
            </div>
            <p className="text-xs text-textLight m-0">v{APP_VERSION}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
