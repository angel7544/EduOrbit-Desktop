import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { CustomToast } from '../components/CustomToast';
import { Header } from '../components/Header';
import { supabase } from '../lib/supabase';

export default function ResetPasswordScreen() {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' | 'info' }>({
    visible: false,
    message: '',
    type: 'error',
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'error') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, visible: false }));
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirmPassword) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    if (newPassword.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) throw error;

      alert('Success: Your password has been updated successfully.');
      navigate(-1);
    } catch (e: any) {
      showToast(e.message || 'Failed to update password', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`flex flex-col min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <Header title="Reset Password" showBack={true} />
      <CustomToast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
      <div className="flex-1 overflow-y-auto px-6 pb-12 max-w-2xl mx-auto w-full">
        <div className="mt-8 mb-8">
          <h1 className="text-2xl font-extrabold mb-2 text-text tracking-tight m-0">Change Your Password</h1>
          <p className="text-sm text-textLight m-0">Enter your current password and your new password below.</p>
        </div>

        <form onSubmit={handleUpdatePassword} className="flex flex-col gap-6">
          <div>
            <label className={`text-xs font-bold uppercase tracking-wider mb-2 block ml-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Old Password</label>
            <div className={`flex flex-row items-center px-4 h-13 rounded-2xl border transition-all ${isDarkMode ? 'bg-gray-800 border-gray-700/60 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10' : 'bg-white border-gray-200 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/5'}`}>
              <Lock className={isDarkMode ? 'text-gray-500' : 'text-gray-400'} size={18} />
              <input
                type={showOldPassword ? 'text' : 'password'}
                className={`flex-1 ml-3 h-full bg-transparent border-none outline-none text-base ${isDarkMode ? 'text-gray-100 placeholder-gray-600' : 'text-gray-900 placeholder-gray-400'}`}
                placeholder="Enter current password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
              />
              <button type="button" onClick={() => setShowOldPassword(!showOldPassword)} className="bg-transparent border-none cursor-pointer p-0 flex items-center justify-center ml-2">
                {showOldPassword ? <EyeOff className="text-textLight hover:text-text transition-colors" size={18} /> : <Eye className="text-textLight hover:text-text transition-colors" size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label className={`text-xs font-bold uppercase tracking-wider mb-2 block ml-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>New Password</label>
            <div className={`flex flex-row items-center px-4 h-13 rounded-2xl border transition-all ${isDarkMode ? 'bg-gray-800 border-gray-700/60 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10' : 'bg-white border-gray-200 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/5'}`}>
              <Lock className={isDarkMode ? 'text-gray-500' : 'text-gray-400'} size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                className={`flex-1 ml-3 h-full bg-transparent border-none outline-none text-base ${isDarkMode ? 'text-gray-100 placeholder-gray-600' : 'text-gray-900 placeholder-gray-400'}`}
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="bg-transparent border-none cursor-pointer p-0 flex items-center justify-center ml-2">
                {showPassword ? <EyeOff className="text-textLight hover:text-text transition-colors" size={18} /> : <Eye className="text-textLight hover:text-text transition-colors" size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label className={`text-xs font-bold uppercase tracking-wider mb-2 block ml-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Confirm Password</label>
            <div className={`flex flex-row items-center px-4 h-13 rounded-2xl border transition-all ${isDarkMode ? 'bg-gray-800 border-gray-700/60 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10' : 'bg-white border-gray-200 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/5'}`}>
              <Lock className={isDarkMode ? 'text-gray-500' : 'text-gray-400'} size={18} />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                className={`flex-1 ml-3 h-full bg-transparent border-none outline-none text-base ${isDarkMode ? 'text-gray-100 placeholder-gray-600' : 'text-gray-900 placeholder-gray-400'}`}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="bg-transparent border-none cursor-pointer p-0 flex items-center justify-center ml-2">
                {showConfirmPassword ? <EyeOff className="text-textLight hover:text-text transition-colors" size={18} /> : <Eye className="text-textLight hover:text-text transition-colors" size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-13 rounded-2xl flex flex-row justify-center items-center gap-2 mt-10 shadow-lg shadow-primary/25 hover:shadow-primary/35 border-none cursor-pointer transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] bg-primary disabled:opacity-50 text-white font-bold text-base"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              'Update Password'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
