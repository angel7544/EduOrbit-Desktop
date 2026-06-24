import React from 'react';
import { Award, Download } from 'lucide-react';
import { Header } from '../components/Header';
import { useTheme } from '../hooks/useTheme';

const DUMMY_CERTIFICATES = [
  { id: '1', course: 'React Native Development', issuedDate: '2024-12-15', idNumber: 'CERT-12345' },
  { id: '2', course: 'Advanced JavaScript', issuedDate: '2024-11-20', idNumber: 'CERT-67890' },
];

export default function CertificatesScreen() {
  const { isDarkMode } = useTheme();

  return (
    <div className={`flex flex-col min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <Header title="My Certificates" showBack={false} />
      <div className="flex-1 overflow-y-auto p-4 max-w-4xl mx-auto w-full">
        {DUMMY_CERTIFICATES.map(item => (
          <div key={item.id} className={`flex flex-row items-center p-4 rounded-xl mb-3 shadow-sm border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            <div className={`w-12 h-12 rounded-full flex justify-center items-center mr-4 ${isDarkMode ? 'bg-gray-700' : 'bg-blue-50'}`}>
              <Award className="text-primary" size={32} />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-text mb-1 m-0">{item.course}</h3>
              <p className="text-xs text-textLight m-0">Issued: {item.issuedDate}</p>
              <p className="text-xs text-textLight mt-0.5 m-0">ID: {item.idNumber}</p>
            </div>
            <button className="p-2 bg-transparent border-none cursor-pointer">
              <Download className="text-textLight hover:text-primary transition-colors" size={20} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
