import React from 'react';
import { Mail, Phone, MessageCircle, MapPin, Globe } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { Header } from '../components/Header';
import { useNavigate } from 'react-router-dom';

export default function HelpScreen() {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();

  return (
    <div className={`flex flex-col min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
      <Header title="EduOrbit LMS Help & Support" showBack={true} />
      <div className="p-5 flex-1 overflow-y-auto flex flex-col gap-5 max-w-4xl mx-auto w-full">
        
        <div className={`rounded-2xl p-5 shadow-sm border border-border/50 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h2 className="text-lg font-bold mb-2 text-text m-0">Contact EduOrbit LMS</h2>
          <p className="text-sm mb-5 leading-5 text-textLight m-0">
            We're here to help! Reach out to us via any of the channels below.
          </p>

          <div className="flex flex-col gap-1">
            <button 
                onClick={() => navigate('/chatsupport')}
                className="flex flex-row items-center py-3 border-b border-border bg-transparent cursor-pointer text-left last:border-b-0" 
            >
              <div className="w-12 h-12 rounded-full flex justify-center items-center mr-4 bg-blue-50">
                <MessageCircle size={24} className="text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold mb-0.5 text-text m-0">Live Chat</h3>
                <p className="text-sm text-textLight m-0">Chat with our support team</p>
              </div>
            </button>

            <a 
                href="mailto:support@br31tech.live"
                className="flex flex-row items-center py-3 border-b border-border bg-transparent cursor-pointer no-underline last:border-b-0" 
            >
              <div className="w-12 h-12 rounded-full flex justify-center items-center mr-4 bg-green-50">
                <Mail size={24} className="text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold mb-0.5 text-text m-0">Email Support</h3>
                <p className="text-sm text-textLight m-0">support@br31tech.live</p>
              </div>
            </a>

            <a 
                href="tel:+919135893002"
                className="flex flex-row items-center py-3 border-b border-border bg-transparent cursor-pointer no-underline last:border-b-0" 
            >
              <div className="w-12 h-12 rounded-full flex justify-center items-center mr-4 bg-red-50">
                <Phone size={24} className="text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold mb-0.5 text-text m-0">Phone Support</h3>
                <p className="text-sm text-textLight m-0">+91 91358 93002</p>
              </div>
            </a>

            <a 
                href="https://br31tech.live/products/"
                target="_blank" rel="noreferrer"
                className="flex flex-row items-center py-3 bg-transparent cursor-pointer no-underline" 
            >
              <div className="w-12 h-12 rounded-full flex justify-center items-center mr-4 bg-fuchsia-50">
                <Globe size={24} className="text-fuchsia-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold mb-0.5 text-text m-0">Website</h3>
                <p className="text-sm text-textLight m-0">www.br31tech.live</p>
              </div>
            </a>
          </div>
        </div>

        <div className={`rounded-2xl p-5 shadow-sm border border-border/50 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h2 className="text-lg font-bold mb-2 text-text m-0">Office Address</h2>
          <div className="flex flex-row gap-3 mt-2">
            <MapPin size={24} className="text-primary mt-0.5 flex-shrink-0" />
            <p className="text-[15px] leading-6 flex-1 text-textLight m-0">
            S.N Kutir, Vivekanand Colony <br/>
            Bagmali, Sanchipatti, Hajipur <br/>
            Vaishali, Bihar 844101, India
            </p>
          </div>
        </div>
        
        <div className={`rounded-2xl p-5 shadow-sm border border-border/50 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h2 className="text-lg font-bold mb-2 text-text m-0">Office Hours</h2>
          <p className="text-sm leading-5 text-textLight m-0">
            Monday - Friday: 10:00 AM - 6:00 PM<br/>
            Saturday & Sunday: Closed
          </p>
        </div>

      </div>
    </div>
  );
}
