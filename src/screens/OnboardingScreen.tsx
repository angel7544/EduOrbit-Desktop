import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

const SLIDES = [
  { id: '1', title: 'Learn Anytime, Anywhere', description: 'Access high-quality courses from expert instructors on your mobile device. Learn at your own pace.', image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=800&auto=format&fit=crop' },
  { id: '2', title: 'Interactive Video Lessons', description: 'Watch HD videos, download resources, and track your progress as you master new skills.', image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=800&auto=format&fit=crop' },
  { id: '3', title: 'Expert Instructors', description: 'Learn from industry experts who are passionate about teaching and helping you succeed.', image: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=800&auto=format&fit=crop' },
  { id: '4', title: 'Lifetime Access', description: 'Get lifetime access to your purchased courses and learn at your own pace, anytime.', image: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=800&auto=format&fit=crop' },
];

export default function OnboardingScreen() {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      localStorage.setItem('hasOnboarded', 'true');
      navigate('/login', { replace: true });
    }
  };

  const handleSkip = () => {
    localStorage.setItem('hasOnboarded', 'true');
    navigate('/login', { replace: true });
  };

  const slide = SLIDES[currentIndex];

  return (
    <div className={`flex flex-col min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
      <div className="max-w-md mx-auto w-full flex flex-col flex-1">
      <div className="p-5 flex justify-end">
        <button onClick={handleSkip} className="bg-transparent border-none cursor-pointer">
          <span className="text-base font-medium text-gray-500 hover:text-gray-700">Skip</span>
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center px-5 relative w-full overflow-hidden">
        <div 
          className="flex transition-transform duration-500 ease-in-out w-full"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {SLIDES.map((s) => (
            <div key={s.id} className="min-w-full flex flex-col items-center flex-shrink-0">
              <img src={s.image} alt={s.title} className="w-[80%] max-w-[300px] aspect-square rounded-[20px] mb-10 mt-5 object-cover" />
              <div className="flex flex-col items-center w-full px-5">
                <h2 className="text-[28px] font-bold text-center mb-4 text-text m-0">{s.title}</h2>
                <p className="text-base text-gray-500 text-center leading-6 m-0">{s.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-5 pb-10">
        <div className="flex flex-row justify-center mb-[30px] gap-2">
          {SLIDES.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all duration-300 ${currentIndex === index ? 'w-6 bg-primary' : 'w-2 bg-gray-200'}`}
            />
          ))}
        </div>

        <button 
          onClick={handleNext}
          className="w-full bg-primary flex flex-row items-center justify-center p-[18px] rounded-2xl gap-2 border-none cursor-pointer hover:opacity-90 transition-opacity"
        >
          <span className="text-white text-lg font-semibold m-0">
            {currentIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
          </span>
          {currentIndex !== SLIDES.length - 1 && (
            <ChevronRight color="white" size={20} />
          )}
        </button>
      </div>
      </div>
    </div>
  );
}
