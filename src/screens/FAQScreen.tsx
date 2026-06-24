import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { Header } from '../components/Header';

const FAQS = [
  { question: 'How do I reset my password?', answer: 'You can reset your password by going to the login screen and clicking on "Forgot Password". Follow the instructions sent to your email.' },
  { question: 'How do I access my courses?', answer: 'Once logged in, your purchased courses will appear in the "My Learning" tab on the dashboard or under "My Purchases" in your profile.' },
  { question: 'Can I download videos for offline viewing?', answer: 'Currently, offline viewing is supported for specific EduOrbit LMS courses. Look for the download icon next to the video player.' },
  { question: 'How do I contact support?', answer: 'You can contact support via the "Chat Support" option in your profile or email us at support@br31tech.live.' },
  { question: 'What payment methods do you accept?', answer: 'We accept credit/debit cards, UPI, and net banking. All payments are processed securely.' },
  { question: 'Can I get a refund?', answer: 'Refunds are available within 7 days of purchase if you have not watched more than 20% of the course content. Please contact support for assistance.' }
];

export default function FAQScreen() {
  const { isDarkMode } = useTheme();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <div className={`flex flex-col min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
      <Header title="FAQ" showBack={true} />
      <div className="p-5 flex-1 overflow-y-auto max-w-4xl mx-auto w-full">
        <div className="flex flex-col items-center mb-8">
            <HelpCircle size={48} className="text-primary mb-4" />
            <h2 className="text-2xl font-bold mb-2 text-center text-text m-0">Frequently Asked Questions</h2>
            <p className="text-base text-center px-5 text-textLight m-0">Find answers to common questions about our platform.</p>
        </div>

        <div className="flex flex-col gap-3">
          {FAQS.map((item, index) => {
            const isExpanded = expandedIndex === index;
            return (
              <button
                key={index}
                onClick={() => toggleExpand(index)}
                className={`text-left rounded-xl border p-4 overflow-hidden transition-colors cursor-pointer ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
              >
                <div className="flex flex-row justify-between items-center">
                  <span className="text-base font-semibold flex-1 mr-2 text-text">{item.question}</span>
                  {isExpanded ? <ChevronUp size={20} className="text-textLight" /> : <ChevronDown size={20} className="text-textLight" />}
                </div>
                <div className={`grid transition-[grid-template-rows] duration-300 ${isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                  <div className="overflow-hidden">
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-sm leading-relaxed text-textLight m-0">{item.answer}</p>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
