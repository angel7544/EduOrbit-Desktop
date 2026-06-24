import React from 'react';
import { Header } from '../components/Header';
import { useTheme } from '../hooks/useTheme';

export default function AboutUsScreen() {
  const { isDarkMode } = useTheme();

  return (
    <div className={`flex flex-col min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
      <Header title="About EduOrbit LMS" showBack={true} />
      <div className="p-5 flex-1 overflow-y-auto max-w-4xl mx-auto w-full">
        <div className="flex justify-center my-8">
            <img 
                src="https://br31tech.live/logo.png" 
                alt="Logo"
                className="w-24 h-24 rounded-2xl object-contain"
            />
        </div>
        <h2 className="text-2xl font-bold mb-5 text-center text-text m-0">About EduOrbit LMS</h2>
        <p className="text-base leading-6 text-center text-textLight whitespace-pre-line m-0">
          EduOrbit is a modern Learning Management System (LMS) built to make learning simple, accessible, and impactful.
          {'\n\n'}
          Our platform connects passionate educators with motivated learners through structured courses, interactive lessons, and seamless mobile access.
          {'\n\n'}
          Instructors can create and manage high-quality courses, while students can learn anytime, anywhere — directly from their Android device.
          {'\n\n'}
          We focus on delivering a smooth, distraction-free learning experience powered by reliable technology and continuous innovation.
          {'\n\n'}
          Welcome to EduOrbit — where knowledge turns into opportunity.
        </p>
        <p className="mt-10 text-center text-sm text-textLight m-0">v7.5.0</p>
        
        <div className="mt-10 flex flex-col items-center gap-2">
          <span className="text-sm text-textLight">Developed by</span>
          <a href="https://br31tech.live" target="_blank" rel="noreferrer" className="text-base font-semibold text-primary no-underline">
            BR31 Technologies
          </a>
          
          <span className="text-sm text-textLight mt-1">Angel Mehul Singh</span>
          
          <a href="tel:+919135893002" className="text-sm font-medium text-primary no-underline">
            +91 9135893002
          </a>
        </div>
      </div>
    </div>
  );
}
