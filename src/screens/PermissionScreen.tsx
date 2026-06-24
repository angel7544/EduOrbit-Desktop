import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Mic, Bell } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

export default function PermissionScreen() {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();

  const [permissions, setPermissions] = useState({
    camera: false,
    microphone: false,
    notifications: false,
  });

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      let notifStatus = false;
      if ('Notification' in window) {
        notifStatus = Notification.permission === 'granted';
      }
      
      let camStatus = false;
      let micStatus = false;
      if (navigator.permissions) {
        try {
          const camPerm = await navigator.permissions.query({ name: 'camera' as any });
          camStatus = camPerm.state === 'granted';
          const micPerm = await navigator.permissions.query({ name: 'microphone' as any });
          micStatus = micPerm.state === 'granted';
        } catch(e) {}
      }

      setPermissions({
        camera: camStatus,
        microphone: micStatus,
        notifications: notifStatus,
      });
    } catch (error) {
      console.error('Error checking permissions:', error);
    }
  };

  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      setPermissions(prev => ({ ...prev, camera: true }));
    } catch (e) {
      setPermissions(prev => ({ ...prev, camera: false }));
    }
  };

  const requestMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setPermissions(prev => ({ ...prev, microphone: true }));
    } catch (e) {
      setPermissions(prev => ({ ...prev, microphone: false }));
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      setPermissions(prev => ({ ...prev, notifications: perm === 'granted' }));
    }
  };

  const handleAllowAll = async () => {
    if (!permissions.camera) await requestCameraPermission();
    if (!permissions.microphone) await requestMicrophonePermission();
    if (!permissions.notifications) await requestNotificationPermission();
    
    await checkPermissions();
    navigate('/login', { replace: true });
  };

  const handleSkip = () => {
    navigate('/login', { replace: true });
  };

  const PermissionItem = ({ icon: Icon, title, description, granted, onToggle }: any) => (
    <div className={`flex flex-row items-center p-4 rounded-xl border shadow-sm ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      <div className="mr-4">
        <Icon size={24} className="text-text" />
      </div>
      <div className="flex-1 mr-2">
        <h3 className="text-base font-bold mb-1 text-text m-0">{title}</h3>
        <p className="text-xs text-textLight m-0">{description}</p>
      </div>
      <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
        <input 
          type="checkbox" 
          checked={granted}
          onChange={onToggle}
          className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer transition-transform duration-200 ease-in-out"
          style={{ transform: granted ? 'translateX(100%)' : 'translateX(0)', borderColor: granted ? '#2563eb' : '#e5e7eb' }}
        />
        <label className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${granted ? 'bg-primary' : 'bg-gray-200'}`}></label>
      </div>
    </div>
  );

  return (
    <div className={`flex flex-col min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
      <div className="flex-1 overflow-y-auto p-5 max-w-md mx-auto w-full">
        <div className="flex flex-col items-center mb-8 mt-4">
          <h1 className="text-xl font-bold text-text m-0">Permission Required</h1>
        </div>

        <div className="flex justify-center mb-8">
           <div className={`w-[200px] h-[200px] rounded-full flex justify-center items-center overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
              <Bell size={100} className="text-primary opacity-20" />
           </div>
        </div>

        <p className="text-base font-medium mb-4 text-text m-0">
          We would require the below permissions:
        </p>

        <div className="flex flex-col gap-4 mb-8">
          <PermissionItem
            icon={Camera}
            title="Camera Permission"
            description="To capture photos and videos for profile and assignments."
            granted={permissions.camera}
            onToggle={requestCameraPermission}
          />
          <PermissionItem
            icon={Mic}
            title="Microphone Permission"
            description="To record audio for voice assignments."
            granted={permissions.microphone}
            onToggle={requestMicrophonePermission}
          />
          <PermissionItem
            icon={Bell}
            title="Notification Permission"
            description="To send you important alerts and updates."
            granted={permissions.notifications}
            onToggle={requestNotificationPermission}
          />
        </div>

        <div className="flex flex-col gap-4 mt-4">
          <button
            className="w-full py-4 rounded-full bg-primary text-white text-base font-bold shadow-md border-none cursor-pointer"
            onClick={handleAllowAll}
          >
            Allow
          </button>
          <button
            className="w-full py-4 rounded-full bg-transparent border border-red-500 text-red-500 text-base font-bold cursor-pointer"
            onClick={handleSkip}
          >
            Deny
          </button>
        </div>
      </div>
    </div>
  );
}
