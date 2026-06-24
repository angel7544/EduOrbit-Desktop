import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Atom, BookOpen, GraduationCap } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../hooks/useTheme';
import { CustomToast } from '../components/CustomToast';

const APP_VERSION = '6.5.1';

export default function LoginScreen() {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const { signInWithEmail, signInWithOtp, resetPasswordForEmail } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isMagicLink, setIsMagicLink] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' | 'info' }>({
    visible: false, message: '', type: 'error',
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'error') => {
    setToast({ visible: true, message, type });
  };
  const hideToast = () => setToast(prev => ({ ...prev, visible: false }));
  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email || (!isMagicLink && !password)) {
      showToast('Please enter both email and password'); return;
    }
    if (!isValidEmail(email.trim())) {
      showToast('Please enter a valid email address'); return;
    }
    setLoading(true);
    try {
      if (isMagicLink) {
        await signInWithOtp(email.trim());
        alert('We have sent a magic link to your email. Click the link in the email to sign in instantly.');
      } else {
        await signInWithEmail(email.trim(), password);
      }
    } catch (e: any) {
      const message = e.message || 'Unable to sign in';
      if (message.toLowerCase().includes('invalid login credentials') || message.toLowerCase().includes('user not found')) {
        alert('The email or password you entered is incorrect. Please try again.');
      } else {
        showToast(message);
      }
    } finally {
      setLoading(false);
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
          <img src="/logo.png" alt="EduOrbit" className="w-32 h-32 object-contain" onError={(e) => { e.currentTarget.src = '/logo3.png'; }} />
          <p className="text-blue-100 text-base mt-2 m-0">Bihar’s Digital Learning Revolution.</p>
        </div>

        <div className={`flex-1 rounded-t-[35px] p-8 pb-12 shadow-2xl z-10 flex flex-col ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
          <div className="flex flex-row justify-between items-center mb-8">
            <div>
              <h2 className="text-3xl font-bold text-text m-0 mb-1">Login</h2>
              <p className="text-sm text-textLight m-0">Welcome back to EduOrbit</p>
            </div>
            
            <button 
              type="button"
              onClick={() => setIsMagicLink(!isMagicLink)}
              className="relative flex flex-row items-center w-[150px] h-9 rounded-full bg-border/40 overflow-hidden cursor-pointer border-none p-0"
            >
              <div 
                className={`absolute top-0 bottom-0 w-1/2 bg-primary rounded-full transition-all duration-300 ease-in-out ${isMagicLink ? 'left-1/2' : 'left-0'}`}
              />
              <div className="flex-1 flex justify-center items-center z-10">
                <span className={`text-[11px] font-bold ${!isMagicLink ? 'text-white' : 'text-gray-500'}`}>Password</span>
              </div>
              <div className="flex-1 flex justify-center items-center z-10">
                <span className={`text-[11px] font-bold ${isMagicLink ? 'text-white' : 'text-gray-500'}`}>Magic</span>
              </div>
            </button>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4 mb-8">
            <div className="flex items-center px-4 h-[50px] rounded-full border border-border bg-inputBackground">
              <Mail size={20} className="text-textLight mr-3 flex-shrink-0" />
              <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} className="flex-1 h-full bg-transparent border-none outline-none text-text text-base" />
            </div>

            {!isMagicLink && (
              <div className="flex items-center px-4 h-[50px] rounded-full border border-border bg-inputBackground">
                <Lock size={20} className="text-textLight mr-3 flex-shrink-0" />
                <input type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="flex-1 h-full bg-transparent border-none outline-none text-text text-base" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="bg-transparent border-none cursor-pointer p-0 ml-2">
                  {showPassword ? <EyeOff size={20} className="text-textLight" /> : <Eye size={20} className="text-textLight" />}
                </button>
              </div>
            )}

            <button type="submit" disabled={loading} className="h-[50px] rounded-full bg-primary text-white font-bold text-lg tracking-wider shadow-md hover:bg-primary/90 transition-colors cursor-pointer border-none mt-2 disabled:opacity-70 disabled:cursor-not-allowed">
              {loading ? 'SENDING...' : (isMagicLink ? 'SEND MAGIC LINK' : 'LOG IN')}
            </button>
          </form>

          <div className="flex flex-row justify-center items-center gap-1 mb-8">
            <span className="text-base text-text">New here?</span>
            <button type="button" onClick={() => navigate('/signup')} className="text-base font-bold text-primary bg-transparent border-none cursor-pointer p-0">
              Create Account
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
