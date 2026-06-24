import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Video, Shield, MessageCircle, Camera, Info, FileText, ChevronRight, Ticket, Moon, CreditCard, HardDrive, AlarmClock, TrendingUp, HelpCircle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../hooks/useTheme';
import { supabase } from '../lib/supabase';
import { uploadToCloudinary } from '../lib/cloudinary';
import { Header } from '../components/Header';
import { useSettingsStore } from '../store/settingsStore';
import { Avatar } from '../components/Avatar';

export default function ProfileScreen() {
  const navigate = useNavigate();
  const { user, signOut, updateProfile, initialize } = useAuthStore();
  const { isDarkMode, toggleTheme } = useTheme();
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showQualityModal, setShowQualityModal] = useState(false);
  const [storageUsage, setStorageUsage] = useState<string | null>(null);
  const { downloadQuality, setDownloadQuality } = useSettingsStore();

  useEffect(() => {
    // Storage usage mocking for web version
    setStorageUsage('0.00 MB');
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
      // ignore
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await initialize();
    } catch (error) {
      console.error(error);
    } finally {
      setRefreshing(false);
    }
  }, [initialize]);

  const showImagePickerOptions = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        // use URL.createObjectURL or process the file
        uploadImage(file);
      }
    };
    input.click();
  };

  const uploadImage = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      // Read file as data URL to pass to uploadToCloudinary
      const reader = new FileReader();
      reader.onloadend = async () => {
        const uri = reader.result as string;
        const publicUrl = await uploadToCloudinary(uri, 'lms_avatars', file.type);

        const { error } = await supabase
          .from('users')
          .update({ profile_image: publicUrl })
          .eq('id', user.id);

        if (error) throw error;

        updateProfile({ profileImage: publicUrl });
        alert('Profile picture updated!');
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      console.error(error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={`flex flex-col min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <Header title="Profile" subtitle="Manage your account" />
      
      <div className="flex-1 overflow-y-auto px-8 pb-8 max-w-4xl mx-auto w-full">
        <div className={`rounded-3xl p-8 mb-8 flex flex-row items-center gap-8 shadow-sm ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="relative">
            <Avatar
              uri={user?.profileImage}
              name={user?.name}
              size={90}
            />
            <button
              className={`absolute bottom-0 right-0 w-8 h-8 rounded-full flex justify-center items-center cursor-pointer border-2 ${isDarkMode ? 'bg-gray-800 border-gray-900 text-gray-50' : 'bg-white border-white text-gray-900 shadow-sm'}`}
              onClick={showImagePickerOptions}
              disabled={uploading}
            >
              {uploading ? (
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Camera size={16} />
              )}
            </button>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <span className={`text-2xl font-bold mb-1 ${isDarkMode ? 'text-gray-50' : 'text-gray-900'}`}>{user?.name || 'User Name'}</span>
            <span className={`text-base mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{user?.email || 'email@example.com'}</span>

            <button
              className="bg-green-500 text-white px-6 py-2.5 rounded-lg self-start shadow-[0_4px_8px_rgba(34,197,94,0.2)] font-semibold border-none cursor-pointer hover:opacity-90 hover:-translate-y-0.5 transition-all"
              onClick={() => navigate('/editprofile')}
            >
              Edit Profile
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-8">
            <div>
              <span className={`text-[13px] font-bold uppercase tracking-wider mb-4 ml-3 block ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Account</span>
              <div className={`rounded-2xl px-4 shadow-sm ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <Row icon={<User size={20} color="#3280ff" />} bg="#3280ff15" text="Personal Information" onClick={() => navigate('/editprofile')} isDarkMode={isDarkMode} />
                <Row icon={<TrendingUp size={20} color="#8b5cf6" />} bg="#8b5cf615" text="My Progress & Certificates" onClick={() => navigate('/myanalytics')} isDarkMode={isDarkMode} />
                <Row icon={<MessageCircle size={20} color="#06b6d4" />} bg="#06b6d415" text="Chat support" onClick={() => navigate('/chatsupport')} isDarkMode={isDarkMode} />
                <Row icon={<Ticket size={20} color="#eab308" />} bg="#eab30815" text="My Coupons" onClick={() => navigate('/coupons')} isDarkMode={isDarkMode} />
                <Row icon={<CreditCard size={20} color="#10b981" />} bg="#10b98115" text="My Purchases" onClick={() => navigate('/mypayments')} isDarkMode={isDarkMode} />
                <Row icon={<HardDrive size={20} color="#6366f1" />} bg="#6366f115" text="Storage Used" subtext={storageUsage || 'Checking...'} onClick={() => navigate('/downloads')} isDarkMode={isDarkMode} />
                <Row icon={<Video size={20} color="#ec4899" />} bg="#ec489915" text="Download Quality" subtext={downloadQuality} onClick={() => setShowQualityModal(true)} isDarkMode={isDarkMode} />
                <Row icon={<AlarmClock size={20} color="#64748b" />} bg="#64748b15" text="Reminders" onClick={() => navigate('/reminders')} isDarkMode={isDarkMode} />
                <Row icon={<Shield size={20} color="#3b82f6" />} bg="#3b82f615" text="Permissions" onClick={() => navigate('/permission')} isDarkMode={isDarkMode} />
                <Row icon={<HelpCircle size={20} color="#f43f5e" />} bg="#f43f5e15" text="Help & Support" onClick={() => navigate('/help')} isDarkMode={isDarkMode} />
                <Row icon={<MessageCircle size={20} color="#8b5cf6" />} bg="#8b5cf615" text="FAQ" onClick={() => navigate('/faq')} isDarkMode={isDarkMode} isLast={true} />
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div>
              <span className={`text-[13px] font-bold uppercase tracking-wider mb-4 ml-3 block ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>App Info</span>
              <div className={`rounded-2xl px-4 shadow-sm ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <Row icon={<Info size={20} color="#94a3b8" />} bg="#94a3b815" text="Version" subtext="7.5.0" hideChevron isDarkMode={isDarkMode} />
                <Row icon={<FileText size={20} color="#10b981" />} bg="#10b98115" text="Terms of Service" onClick={() => navigate('/termsofservice')} isDarkMode={isDarkMode} />
                <Row icon={<Shield size={20} color="#f59e0b" />} bg="#f59e0b15" text="Privacy Policy" onClick={() => navigate('/privacypolicy')} isDarkMode={isDarkMode} />
                <Row icon={<Info size={20} color="#3b82f6" />} bg="#3b82f615" text="About Us" onClick={() => navigate('/aboutus')} isDarkMode={isDarkMode} isLast={true} />
              </div>
            </div>

            <div>
              <span className={`text-[13px] font-bold uppercase tracking-wider mb-4 ml-3 block ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>General Settings</span>
              <div className={`rounded-2xl px-4 shadow-sm ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <div className="flex flex-row items-center justify-between py-4">
                    <div className="flex flex-row items-center gap-4">
                      <div className="w-10 h-10 rounded-xl flex justify-center items-center" style={{ backgroundColor: '#6366f115' }}>
                        <Moon size={20} color="#6366f1" />
                      </div>
                      <span className={`text-base font-medium ${isDarkMode ? 'text-gray-50' : 'text-gray-700'}`}>Dark Mode</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={isDarkMode} onChange={toggleTheme} />
                      <div className={`w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${isDarkMode ? 'bg-primary' : 'bg-gray-200'}`}></div>
                    </label>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <button
                className="flex w-full flex-row items-center justify-center bg-red-500 py-4 rounded-2xl gap-2 shadow-[0_4px_8px_rgba(239,68,68,0.2)] border-none cursor-pointer hover:opacity-90 transition-opacity"
                onClick={handleSignOut}
              >
                <LogOut size={20} color="#ffffff" />
                <span className="text-white text-base font-semibold">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {showQualityModal && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-5">
          <div className={`w-full max-w-[340px] rounded-3xl p-6 flex flex-col shadow-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <span className={`text-xl font-bold mb-3 text-center ${isDarkMode ? 'text-gray-50' : 'text-gray-900'}`}>Download Quality</span>
            {[
              { label: 'Medium (720p)', value: 'Medium' },
              { label: 'Standard (480p)', value: 'Standard' },
              { label: 'Low (360p)', value: 'Low' }
            ].map((option, index) => (
              <button
                key={index}
                className={`py-3 border-b border-solid cursor-pointer bg-transparent text-center ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}
                onClick={() => {
                  setDownloadQuality(option.value as 'High' | 'Medium' | 'Low');
                  setShowQualityModal(false);
                }}
              >
                <span className={`text-base font-medium ${downloadQuality === option.value ? 'text-primary' : (isDarkMode ? 'text-gray-50' : 'text-gray-900')}`}>
                  {option.label} {downloadQuality === option.value && '✓'}
                </span>
              </button>
            ))}
            <button
              className="py-3 mt-1 bg-transparent border-none cursor-pointer text-center"
              onClick={() => setShowQualityModal(false)}
            >
              <span className="text-red-500 text-base font-medium">Cancel</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ icon, bg, text, subtext, onClick, hideChevron, isDarkMode, isLast }: any) {
  return (
    <div
      className={`flex flex-row items-center justify-between py-3 border-solid ${!isLast ? (isDarkMode ? 'border-b border-gray-700' : 'border-b border-gray-100') : 'border-b-0'} ${onClick ? 'cursor-pointer hover:opacity-80' : ''}`}
      onClick={onClick}
    >
      <div className="flex flex-row items-center gap-4">
        <div className="w-9 h-9 rounded-xl flex justify-center items-center" style={{ backgroundColor: bg }}>
          {icon}
        </div>
        <div className="flex flex-col">
          <span className={`text-base font-medium ${isDarkMode ? 'text-gray-50' : 'text-gray-700'}`}>{text}</span>
          {subtext && <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{subtext}</span>}
        </div>
      </div>
      {!hideChevron && !subtext && <ChevronRight size={20} className={isDarkMode ? 'text-gray-500' : 'text-gray-400'} />}
      {hideChevron && subtext && <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{subtext}</span>}
    </div>
  );
}
