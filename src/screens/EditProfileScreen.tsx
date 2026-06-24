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
  const [profession, setProfession] = useState(user?.profession || '');
  const [email, setEmail] = useState(user?.email || '');
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [profileImage, setProfileImage] = useState(user?.profileImage || '');

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setProfession(user.profession || '');
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
          profession: profession.trim(),
          profile_image: profileImage,
        })
        .eq('id', user.id);

      if (error) throw error;

      updateProfile({
        name: name.trim(),
        phone: phone.trim(),
        profession: profession.trim(),
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
      
      <div className="flex-1 overflow-y-auto px-5 pb-10 max-w-2xl mx-auto w-full">
        <div className="flex flex-col items-center mt-6 mb-8">
          <div className="relative">
            <Avatar uri={profileImage} name={name || user?.name} size={100} />
            <button
              className={`absolute bottom-0 right-0 w-9 h-9 rounded-full flex justify-center items-center cursor-pointer border-2 ${isDarkMode ? 'bg-primary border-gray-900 text-white' : 'bg-primary border-white text-white'}`}
              onClick={showImagePickerOptions}
              disabled={uploadingImage}
            >
              {uploadingImage ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Camera size={18} />
              )}
            </button>
          </div>
          <span className={`text-sm mt-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Tap to change photo</span>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <span className={`text-sm font-semibold mb-2 block ml-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Full Name</span>
            <div className={`flex flex-row items-center px-4 h-[52px] rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700 focus-within:border-primary' : 'bg-white border-gray-200 focus-within:border-primary focus-within:shadow-[0_0_0_4px_rgba(59,130,246,0.1)]'} transition-all`}>
              <User size={20} className={isDarkMode ? 'text-gray-500' : 'text-gray-400'} />
              <input
                className={`flex-1 ml-3 h-full bg-transparent border-none outline-none text-base ${isDarkMode ? 'text-gray-50 placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'}`}
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          <div>
            <span className={`text-sm font-semibold mb-2 block ml-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Email Address</span>
            <div className={`flex flex-row items-center px-4 h-[52px] rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700 opacity-70' : 'bg-gray-100 border-gray-200 opacity-80'}`}>
              <Mail size={20} className={isDarkMode ? 'text-gray-500' : 'text-gray-400'} />
              <input
                className={`flex-1 ml-3 h-full bg-transparent border-none outline-none text-base ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}
                value={email}
                disabled
              />
            </div>
            <span className={`text-xs mt-1 ml-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>Email cannot be changed</span>
          </div>

          <div>
            <span className={`text-sm font-semibold mb-2 block ml-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Phone Number</span>
            <div className={`flex flex-row items-center px-4 h-[52px] rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700 focus-within:border-primary' : 'bg-white border-gray-200 focus-within:border-primary focus-within:shadow-[0_0_0_4px_rgba(59,130,246,0.1)]'} transition-all`}>
              <Phone size={20} className={isDarkMode ? 'text-gray-500' : 'text-gray-400'} />
              <input
                className={`flex-1 ml-3 h-full bg-transparent border-none outline-none text-base ${isDarkMode ? 'text-gray-50 placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'}`}
                placeholder="Enter your phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div>
            <span className={`text-sm font-semibold mb-2 block ml-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Profession</span>
            <div className={`flex flex-row items-center px-4 h-[52px] rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700 focus-within:border-primary' : 'bg-white border-gray-200 focus-within:border-primary focus-within:shadow-[0_0_0_4px_rgba(59,130,246,0.1)]'} transition-all`}>
              <Briefcase size={20} className={isDarkMode ? 'text-gray-500' : 'text-gray-400'} />
              <input
                className={`flex-1 ml-3 h-full bg-transparent border-none outline-none text-base ${isDarkMode ? 'text-gray-50 placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'}`}
                placeholder="Student, Developer, etc."
                value={profession}
                onChange={(e) => setProfession(e.target.value)}
              />
            </div>
          </div>
        </div>

        <button
          className={`w-full h-14 rounded-xl flex flex-row justify-center items-center gap-2 mt-10 shadow-[0_4px_12px_rgba(59,130,246,0.3)] border-none cursor-pointer transition-opacity ${loading ? 'opacity-80' : 'hover:opacity-90'} bg-primary`}
          onClick={handleSave}
          disabled={loading}
        >
          {loading ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              <Check size={20} color="#fff" />
              <span className="text-white text-base font-bold">Save Changes</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
