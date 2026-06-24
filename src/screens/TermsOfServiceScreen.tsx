import React from 'react';
import { Header } from '../components/Header';
import { useTheme } from '../hooks/useTheme';

export default function TermsOfServiceScreen() {
  const { isDarkMode } = useTheme();

  return (
    <div className={`flex flex-col min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
      <Header title="Terms of Service" showBack={true} />
      <div className="p-5 flex-1 overflow-y-auto max-w-4xl mx-auto w-full">
        <h2 className="text-2xl font-bold mb-5 text-text m-0">EduOrbit LMS Terms of Service</h2>
        <p className="text-base leading-6 text-textLight whitespace-pre-line m-0">
          Last updated: 20-02-2026
          {'\n\n'}
          1. Acceptance of Terms{'\n'}
          By accessing or using our service, you agree to be bound by these Terms of Service.
          {'\n\n'}
          2. Use of Service{'\n'}
          You agree to use the service only for lawful purposes and in accordance with these Terms.
          {'\n\n'}
          3. User Accounts{'\n'}
          You are responsible for maintaining the confidentiality of your account and password.
          {'\n\n'}
          4. Intellectual Property{'\n'}
          The content, features, and functionality of the service are owned by us and are protected by copyright, trademark, and other intellectual property laws.
          {'\n\n'}
          5. Termination{'\n'}
          We may terminate or suspend your account immediately, without prior notice or liability, for any reason.
          {'\n\n'}
          6. Changes to Terms{'\n'}
          We reserve the right to modify or replace these Terms at any time.
        </p>
      </div>
    </div>
  );
}
