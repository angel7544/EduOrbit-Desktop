import React from 'react';
import { Header } from '../components/Header';
import { useTheme } from '../hooks/useTheme';

export default function PrivacyPolicyScreen() {
  const { isDarkMode } = useTheme();
  
  return (
    <div className={`flex flex-col min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
      <Header title="Privacy Policy" showBack={true} />
      <div className="p-5 flex-1 overflow-y-auto max-w-4xl mx-auto w-full">
        <h2 className="text-2xl font-bold mb-5 text-text m-0">EduOrbit LMS Privacy Policy</h2>
        <p className="text-base leading-6 text-textLight whitespace-pre-line m-0">
          Last updated: 20-02-2026
          {'\n\n'}
          1. Introduction{'\n'}
          Welcome to EduOrbit LMS. We respect your privacy and are committed to protecting your personal data.
          {'\n\n'}
          2. Data We Collect{'\n'}
          We collect information you provide directly to us, such as when you create an account, update your profile, or contact us. This includes your name, email address, and profile picture.
          {'\n\n'}
          3. How We Use Your Data{'\n'}
          We use your data to provide and improve our services, communicate with you, and ensure the security of our platform.
          {'\n\n'}
          4. Data Sharing{'\n'}
          We do not share your personal data with third parties except as described in this policy or with your consent.
          {'\n\n'}
          5. Contact Us{'\n'}
          If you have any questions about this Privacy Policy, please contact us.
        </p>
      </div>
    </div>
  );
}
