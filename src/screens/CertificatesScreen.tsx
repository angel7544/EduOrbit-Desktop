import React, { useEffect, useState, useRef } from 'react';
import { Award, Download, Loader2 } from 'lucide-react';
import { Header } from '../components/Header';
import { useTheme } from '../hooks/useTheme';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function CertificatesScreen() {
  const { isDarkMode } = useTheme();
  const { user } = useAuthStore();
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const certificateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      fetchCertificates();
    }
  }, [user]);

  const fetchCertificates = async () => {
    setLoading(true);
    try {
      const { data: analytics, error: analyticsError } = await supabase.rpc('get_student_analytics', { student_id: user?.id });
      if (analyticsError) throw analyticsError;

      const completedCourses = analytics?.course_progress?.filter((c: any) => c.has_certificate) || [];
      
      const certsData = [];
      for (const course of completedCourses) {
        const { data: cert } = await supabase
          .from('certificates')
          .select('*')
          .eq('user_id', user?.id)
          .eq('course_id', course.course_id)
          .single();

        const { data: courseData } = await supabase
          .from('courses')
          .select('instructor_id, instructors(name, signature_url)')
          .eq('id', course.course_id)
          .single();

        if (cert && courseData) {
          const instructorInfo = courseData.instructors as any;
          certsData.push({
            id: cert.id,
            course_id: course.course_id,
            course: course.course_title,
            issuedDate: new Date(cert.issued_at).toLocaleDateString(),
            idNumber: cert.certificate_number,
            instructorName: instructorInfo?.name || 'Instructor',
            signatureUrl: instructorInfo?.signature_url
          });
        }
      }
      setCertificates(certsData);
    } catch (error) {
      console.error('Error fetching certificates:', error);
    } finally {
      setLoading(false);
    }
  };

  const [activeCertForPdf, setActiveCertForPdf] = useState<any>(null);

  const handleDownload = async (cert: any) => {
    setGeneratingId(cert.id);
    setActiveCertForPdf(cert);
    
    // Give state time to render the hidden certificate
    setTimeout(async () => {
      try {
        if (certificateRef.current) {
          const canvas = await html2canvas(certificateRef.current, {
            scale: 2, // Higher resolution
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
          });
          
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'px',
            format: [canvas.width, canvas.height]
          });
          
          pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
          const formattedUserName = user?.name ? user.name.replace(/\s+/g, '_') : 'Student';
          pdf.save(`Certificate_${formattedUserName}_${cert.idNumber || 'ID'}.pdf`);
        }
      } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Failed to generate PDF certificate.');
      } finally {
        setGeneratingId(null);
        setActiveCertForPdf(null);
      }
    }, 500);
  };

  return (
    <div className={`flex flex-col min-h-screen relative ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <Header title="My Certificates" showBack={false} />
      <div className="flex-1 overflow-y-auto p-4 max-w-4xl mx-auto w-full">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : certificates.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-20 opacity-70">
            <Award size={48} className="mb-4 text-gray-400" />
            <p className="text-lg font-semibold m-0">No certificates yet</p>
            <p className="text-sm text-gray-500 mt-2">Complete a course to earn your first certificate!</p>
          </div>
        ) : (
          certificates.map(item => (
            <div key={item.id} className={`flex flex-row items-center p-4 rounded-xl mb-3 shadow-sm border transition-all ${isDarkMode ? 'bg-gray-800 border-gray-700 hover:bg-gray-700' : 'bg-white border-gray-100 hover:bg-gray-50'}`}>
              <div className={`w-12 h-12 rounded-full flex justify-center items-center mr-4 ${isDarkMode ? 'bg-gray-700' : 'bg-blue-50'}`}>
                <Award className="text-primary" size={32} />
              </div>
              <div className="flex-1">
                <h3 className={`text-base font-semibold mb-1 m-0 ${isDarkMode ? 'text-gray-50' : 'text-gray-900'}`}>{item.course}</h3>
                <p className={`text-xs m-0 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Issued: {item.issuedDate}</p>
                <p className={`text-xs mt-0.5 m-0 font-mono ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>ID: {item.idNumber}</p>
              </div>
              <button 
                onClick={() => handleDownload(item)}
                disabled={generatingId === item.id}
                className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary font-semibold rounded-lg border-none cursor-pointer transition-colors disabled:opacity-50"
              >
                {generatingId === item.id ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                <span className="text-sm">Download PDF</span>
              </button>
            </div>
          ))
        )}
      </div>

      {/* Hidden PDF Template rendered off-screen */}
      {activeCertForPdf && (
        <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
          <div ref={certificateRef} style={{ width: '1056px', height: '816px', backgroundColor: '#fff', position: 'relative', padding: '40px', boxSizing: 'border-box', backgroundImage: `url('/bgCerti.png')`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
            {/* Outer border */}
            <div style={{ border: '8px solid #1e3a8a', width: '100%', height: '100%', padding: '20px', boxSizing: 'border-box', backgroundColor: 'rgba(255,255,255,0.85)' }}>
              {/* Inner border */}
              <div style={{ border: '2px solid #3b82f6', width: '100%', height: '100%', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px', boxSizing: 'border-box' }}>
                
                {/* Logo / Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
                  <Award size={48} color="#1e3a8a" />
                  <span style={{ fontSize: '32px', fontWeight: 'bold', color: '#1e3a8a', letterSpacing: '2px' }}>EduOrbit</span>
                </div>

                <h1 style={{ fontSize: '48px', color: '#1e40af', margin: '0 0 20px 0', fontFamily: 'serif', textTransform: 'uppercase', letterSpacing: '4px' }}>
                  Certificate of Completion
                </h1>
                
                <p style={{ fontSize: '20px', color: '#475569', margin: '0 0 30px 0' }}>This is to certify that</p>
                
                <h2 style={{ fontSize: '42px', color: '#0f172a', margin: '0 0 30px 0', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', minWidth: '400px', fontStyle: 'italic' }}>
                  {user?.name || 'Student Name'}
                </h2>
                
                <p style={{ fontSize: '20px', color: '#475569', margin: '0 0 20px 0' }}>has successfully completed the course</p>
                
                <h3 style={{ fontSize: '32px', color: '#1e3a8a', margin: '0 0 60px 0', fontWeight: 'bold' }}>
                  {activeCertForPdf.course}
                </h3>
                
                {/* Signatures & Details section */}
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: 'auto', padding: '0 40px' }}>
                  
                  {/* Left side: Issue details */}
                  <div style={{ textAlign: 'left' }}>
                    <p style={{ fontSize: '16px', color: '#64748b', margin: '0 0 5px 0' }}>Issue Date: <strong style={{ color: '#0f172a' }}>{activeCertForPdf.issuedDate}</strong></p>
                    <p style={{ fontSize: '14px', color: '#94a3b8', margin: '0', fontFamily: 'monospace' }}>ID: {activeCertForPdf.idNumber}</p>
                  </div>
                  
                  {/* Right side: Signature */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    {activeCertForPdf.signatureUrl ? (
                      <img 
                        src={activeCertForPdf.signatureUrl} 
                        alt="Signature" 
                        style={{ height: '60px', objectFit: 'contain', marginBottom: '10px' }}
                        crossOrigin="anonymous"
                      />
                    ) : (
                      <div style={{ height: '60px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', marginBottom: '10px', fontFamily: 'cursive', fontSize: '24px', color: '#1e3a8a' }}>
                        {activeCertForPdf.instructorName}
                      </div>
                    )}
                    <div style={{ borderTop: '2px solid #94a3b8', width: '250px', paddingTop: '10px' }}>
                      <p style={{ fontSize: '16px', color: '#0f172a', fontWeight: 'bold', margin: '0' }}>{activeCertForPdf.instructorName}</p>
                      <p style={{ fontSize: '14px', color: '#64748b', margin: '0' }}>Course Instructor</p>
                    </div>
                  </div>
                  
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
