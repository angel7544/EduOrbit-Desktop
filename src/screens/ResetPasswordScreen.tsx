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
      <div className="flex-1 overflow-y-auto p-5">
        <div className="mt-5 mb-10">
          <h1 className="text-2xl font-bold mb-2 text-text m-0">Change Your Password</h1>
          <p className="text-base text-textLight m-0">Enter your current password and your new password below.</p>
        </div>

        <form onSubmit={handleUpdatePassword} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-base font-semibold text-text m-0">Old Password</label>
            <div className={`flex flex-row items-center rounded-xl border px-4 h-12 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <Lock className="text-textLight mr-2" size={20} />
              <input
                type={showOldPassword ? 'text' : 'password'}
                className="flex-1 bg-transparent border-none outline-none text-base text-text"
                placeholder="Enter current password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
              />
              <button type="button" onClick={() => setShowOldPassword(!showOldPassword)} className="bg-transparent border-none cursor-pointer p-0">
                {showOldPassword ? <EyeOff className="text-textLight" size={20} /> : <Eye className="text-textLight" size={20} />}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-base font-semibold text-text m-0">New Password</label>
            <div className={`flex flex-row items-center rounded-xl border px-4 h-12 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <Lock className="text-textLight mr-2" size={20} />
              <input
                type={showPassword ? 'text' : 'password'}
                className="flex-1 bg-transparent border-none outline-none text-base text-text"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="bg-transparent border-none cursor-pointer p-0">
                {showPassword ? <EyeOff className="text-textLight" size={20} /> : <Eye className="text-textLight" size={20} />}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-base font-semibold text-text m-0">Confirm Password</label>
            <div className={`flex flex-row items-center rounded-xl border px-4 h-12 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <Lock className="text-textLight mr-2" size={20} />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                className="flex-1 bg-transparent border-none outline-none text-base text-text"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="bg-transparent border-none cursor-pointer p-0">
                {showConfirmPassword ? <EyeOff className="text-textLight" size={20} /> : <Eye className="text-textLight" size={20} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="h-12 rounded-full bg-primary text-white text-lg font-bold shadow-sm border-none cursor-pointer mt-5 hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
