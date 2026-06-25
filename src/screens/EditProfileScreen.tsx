import { useNavigate } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { Camera, User, Phone, Briefcase, Mail, Check, X } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../hooks/useTheme';
import { supabase } from '../lib/supabase';
import { uploadToCloudinary } from '../lib/cloudinary';
import { Header } from '../components/Header';
import { Avatar } from '../components/Avatar';

export default function EditProfileScreen() {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuthStore();
  const { isDarkMode } = useTheme();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [email, setEmail] = useState(user?.email || '');
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [profileImage, setProfileImage] = useState(user?.profileImage || '');

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setBio(user.bio || '');
      setEmail(user.email || '');
      setProfileImage(user.profileImage || '');
    }
  }, [user]);

  const showImagePickerOptions = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        uploadImage(file);
      }
    };
    input.click();
  };

  const uploadImage = async (file: File) => {
    if (!user) return;
    setUploadingImage(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const uri = reader.result as string;
        const publicUrl = await uploadToCloudinary(uri, 'lms_avatars', file.type);
        setProfileImage(publicUrl);
        updateProfile({ profileImage: publicUrl });
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      console.error(error);
      alert('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    if (!name.trim()) {
      alert('Name is required');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: name.trim(),
          phone: phone.trim(),
          bio: bio.trim(),
          profile_image: profileImage,
        })
        .eq('id', user.id);

      if (error) throw error;

      updateProfile({
        name: name.trim(),
        phone: phone.trim(),
        bio: bio.trim(),
        profileImage,
      });

      alert('Profile updated successfully');
      navigate(-1);
    } catch (error: any) {
      console.error(error);
      alert(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`flex flex-col min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <Header title="Edit Profile" showBack={true} />
      
      <div className="flex-1 overflow-y-auto px-6 pb-12 max-w-2xl mx-auto w-full">
        <div className="flex flex-col items-center mt-8 mb-10">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-tr from-primary to-indigo-500 rounded-full blur opacity-20 group-hover:opacity-45 transition duration-300" />
            <div className="relative">
              <Avatar uri={profileImage} name={name || user?.name} size={104} />
              <button
                className={`absolute bottom-0 right-0 w-9 h-9 rounded-full flex justify-center items-center cursor-pointer border-2 transition-all hover:scale-105 active:scale-95 ${isDarkMode ? 'bg-primary border-gray-900 text-white' : 'bg-primary border-white text-white shadow-md'}`}
                onClick={showImagePickerOptions}
                disabled={uploadingImage}
              >
                {uploadingImage ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Camera size={16} />
                )}
              </button>
            </div>
          </div>
          <span className={`text-xs font-semibold mt-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Tap photo to change</span>
        </div>

        <div className="flex flex-col gap-6">
          <div>
            <span className={`text-xs font-bold uppercase tracking-wider mb-2 block ml-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Full Name</span>
            <div className={`flex flex-row items-center px-4 h-13 rounded-2xl border transition-all ${isDarkMode ? 'bg-gray-800 border-gray-700/60 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10' : 'bg-white border-gray-200 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/5'}`}>
              <User size={18} className={isDarkMode ? 'text-gray-500' : 'text-gray-400'} />
              <input
                className={`flex-1 ml-3 h-full bg-transparent border-none outline-none text-base ${isDarkMode ? 'text-gray-100 placeholder-gray-600' : 'text-gray-900 placeholder-gray-400'}`}
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          <div>
            <span className={`text-xs font-bold uppercase tracking-wider mb-2 block ml-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Email Address</span>
            <div className={`flex flex-row items-center px-4 h-13 rounded-2xl border ${isDarkMode ? 'bg-gray-800/50 border-gray-850 opacity-60' : 'bg-gray-100/80 border-gray-200 opacity-70'}`}>
              <Mail size={18} className={isDarkMode ? 'text-gray-600' : 'text-gray-400'} />
              <input
                className={`flex-1 ml-3 h-full bg-transparent border-none outline-none text-base text-gray-500 dark:text-gray-500`}
                value={email}
                disabled
              />
            </div>
            <span className={`text-[11px] font-medium mt-1.5 block ml-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Email address cannot be modified.</span>
          </div>

          <div>
            <span className={`text-xs font-bold uppercase tracking-wider mb-2 block ml-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Phone Number</span>
            <div className={`flex flex-row items-center px-4 h-13 rounded-2xl border transition-all ${isDarkMode ? 'bg-gray-800 border-gray-700/60 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10' : 'bg-white border-gray-200 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/5'}`}>
              <Phone size={18} className={isDarkMode ? 'text-gray-500' : 'text-gray-400'} />
              <input
                className={`flex-1 ml-3 h-full bg-transparent border-none outline-none text-base ${isDarkMode ? 'text-gray-100 placeholder-gray-600' : 'text-gray-900 placeholder-gray-400'}`}
                placeholder="Enter your phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div>
            <span className={`text-xs font-bold uppercase tracking-wider mb-2 block ml-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Bio</span>
            <div className={`flex flex-row items-center px-4 h-13 rounded-2xl border transition-all ${isDarkMode ? 'bg-gray-800 border-gray-700/60 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10' : 'bg-white border-gray-200 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/5'}`}>
              <Briefcase size={18} className={isDarkMode ? 'text-gray-500' : 'text-gray-400'} />
              <input
                className={`flex-1 ml-3 h-full bg-transparent border-none outline-none text-base ${isDarkMode ? 'text-gray-100 placeholder-gray-600' : 'text-gray-900 placeholder-gray-400'}`}
                placeholder="Student, Developer, etc."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>
          </div>
        </div>

        <button
          className={`w-full h-13 rounded-2xl flex flex-row justify-center items-center gap-2 mt-10 shadow-lg shadow-primary/25 hover:shadow-primary/35 border-none cursor-pointer transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] bg-primary disabled:opacity-50 text-white`}
          onClick={handleSave}
          disabled={loading}
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              <Check size={18} />
              <span className="text-base font-bold">Save Changes</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
