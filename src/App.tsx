import React, { useEffect } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';

import { useTheme } from './hooks/useTheme';
import { useAuthStore } from './store/authStore';

import LoginScreen from './screens/LoginScreen';
import SignUpScreen from './screens/SignUpScreen';
import ResetPasswordScreen from './screens/ResetPasswordScreen';
import MainScreen from './screens/MainScreen';
import DashboardScreen from './screens/DashboardScreen';
import CoursesScreen from './screens/CoursesScreen';
import MyCoursesScreen from './screens/MyCoursesScreen';
import ProfileScreen from './screens/ProfileScreen';
import CourseDetailsScreen from './screens/CourseDetailsScreen';
import ChapterPlayerScreen from './screens/ChapterPlayerScreen';
import EditProfileScreen from './screens/EditProfileScreen';
import FAQScreen from './screens/FAQScreen';
import HelpScreen from './screens/HelpScreen';
import PrivacyPolicyScreen from './screens/PrivacyPolicyScreen';
import TermsOfServiceScreen from './screens/TermsOfServiceScreen';

import AboutUsScreen from './screens/AboutUsScreen';
import AttachmentViewerScreen from './screens/AttachmentViewerScreen';
import CertificatesScreen from './screens/CertificatesScreen';
import ChatScreen from './screens/ChatScreen';
import ChatSupportScreen from './screens/ChatSupportScreen';
import CouponsScreen from './screens/CouponsScreen';
import MyAnalyticsScreen from './screens/MyAnalyticsScreen';
import MyPaymentsScreen from './screens/MyPaymentsScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import PurchaseScreen from './screens/PurchaseScreen';
import SupportTicketListScreen from './screens/SupportTicketListScreen';
import { NotificationManager } from './components/NotificationManager';

export default function App() {
  const { isDarkMode, colors } = useTheme();
  const { user, initialize } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Apply dark/light mode class to html element immediately and on every change
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
      document.body.style.backgroundColor = '#111827';
      document.body.style.color = '#f9fafb';
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
      document.body.style.backgroundColor = '#f9fafb';
      document.body.style.color = '#1f2937';
    }
  }, [isDarkMode]);

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        backgroundColor: isDarkMode ? '#111827' : '#f9fafb',
        color: isDarkMode ? '#f9fafb' : '#1f2937',
        display: 'flex',
        flexDirection: 'column',
        transition: 'background-color 0.2s ease, color 0.2s ease',
      }}
    >
      {user && <NotificationManager />}
      <Routes>
        {!user ? (
          <>
            <Route path="/login" element={<LoginScreen />} />
            <Route path="/signup" element={<SignUpScreen />} />
            <Route path="/resetpassword" element={<ResetPasswordScreen />} />
            <Route path="/onboarding" element={<OnboardingScreen />} />
            <Route path="*" element={<LoginScreen />} />
          </>
        ) : (
          <>
            <Route element={<MainScreen />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardScreen />} />
              <Route path="/courses" element={<CoursesScreen />} />
              <Route path="/mycourses" element={<MyCoursesScreen />} />
              <Route path="/profile" element={<ProfileScreen />} />
              <Route path="/coursedetails" element={<CourseDetailsScreen />} />
              <Route path="/editprofile" element={<EditProfileScreen />} />
              <Route path="/faq" element={<FAQScreen />} />
              <Route path="/help" element={<HelpScreen />} />
              <Route path="/privacypolicy" element={<PrivacyPolicyScreen />} />
              <Route path="/termsofservice" element={<TermsOfServiceScreen />} />
              <Route path="/aboutus" element={<AboutUsScreen />} />
              <Route path="/certificates" element={<CertificatesScreen />} />
              <Route path="/chatdetail" element={<ChatScreen />} />
              <Route path="/chatsupport" element={<ChatSupportScreen />} />
              <Route path="/coupons" element={<CouponsScreen />} />
              <Route path="/myanalytics" element={<MyAnalyticsScreen />} />
              <Route path="/mypayments" element={<MyPaymentsScreen />} />
              <Route path="/notifications" element={<NotificationsScreen />} />
              <Route path="/supporttickets" element={<SupportTicketListScreen />} />
              <Route path="/resetpassword" element={<ResetPasswordScreen />} />
            </Route>

            <Route path="/chapterplayer" element={<ChapterPlayerScreen />} />
            <Route path="/attachmentviewer" element={<AttachmentViewerScreen />} />
            <Route path="/purchase" element={<PurchaseScreen />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </>
        )}
      </Routes>
    </div>
  );
}
