import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, MessageCircle, Search, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../hooks/useTheme';

export default function SupportTicketListScreen() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { isDarkMode } = useTheme();
  const [loading, setLoading] = useState(false);
  const [chats, setChats] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed'>('all');

  useEffect(() => {
    if (user) {
      fetchChats();

      const channel = supabase
        .channel(`support_chats_changes_${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'chats',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            fetchChats();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchChats = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setChats(data || []);
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const createNewTicket = async () => {
    try {
      setLoading(true);
      const { data: newChat, error } = await supabase
        .from('chats')
        .insert({ user_id: user?.id, status: 'open' })
        .select()
        .single();

      if (error) throw error;

      navigate('/chatdetail', { state: { chatId: newChat.id } });
    } catch (error) {
      console.error('Error creating new ticket:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredChats = chats.filter(chat => {
    const matchesSearch = chat.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || chat.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className={`flex flex-col min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className={`flex flex-row items-center justify-between p-4 border-b ${isDarkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'}`}>
        <button onClick={() => navigate(-1)} className="p-2 bg-transparent border-none cursor-pointer -ml-2">
          <ChevronLeft color={isDarkMode ? '#f9fafb' : '#111827'} size={24} />
        </button>
        <span className={`text-lg font-semibold ${isDarkMode ? 'text-gray-50' : 'text-gray-900'}`}>My Support Tickets</span>
        <button onClick={createNewTicket} className="p-2 bg-transparent border-none cursor-pointer -mr-2">
          <Plus className="text-primary" size={24} />
        </button>
      </div>

      <div className={`p-4 border-b ${isDarkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'}`}>
        <div className="max-w-4xl mx-auto w-full">
          <div className={`flex flex-row items-center rounded-xl px-3 h-11 mb-3 border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
          <Search size={20} className="text-gray-400" />
          <input
            className="flex-1 ml-2 bg-transparent border-none outline-none text-sm text-text"
            placeholder="Search ticket ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex flex-row gap-2 overflow-x-auto no-scrollbar">
          {(['all', 'open', 'closed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-1.5 rounded-full text-[13px] font-medium border-none cursor-pointer whitespace-nowrap transition-colors
                ${statusFilter === status 
                  ? 'bg-primary text-white' 
                  : isDarkMode 
                    ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' 
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto max-w-4xl mx-auto w-full">
        {loading ? (
          <div className="flex justify-center mt-5">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredChats.length > 0 ? (
          filteredChats.map((item) => (
            <div 
              key={item.id}
              onClick={() => navigate('/chatdetail', { state: { chatId: item.id } })}
              className={`flex flex-row items-center p-4 rounded-xl mb-3 border shadow-sm cursor-pointer hover:opacity-90 transition-opacity ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mr-4 ${isDarkMode ? 'bg-gray-700' : 'bg-blue-50'}`}>
                <MessageCircle className="text-primary" size={24} />
              </div>
              <div className="flex-1">
                <span className="block text-base font-semibold text-text mb-1 m-0">Ticket #{item.id.substring(0, 8)}</span>
                <div className="flex flex-row items-center gap-2">
                  <div className={`px-1.5 py-0.5 rounded ${item.status === 'open' ? 'bg-blue-100/10' : 'bg-gray-500/10'}`}>
                    <span className={`text-[10px] font-bold ${item.status === 'open' ? 'text-blue-600' : 'text-gray-500'}`}>
                      {item.status?.toUpperCase() || 'OPEN'}
                    </span>
                  </div>
                  <span className="text-xs text-textLight">{new Date(item.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <ChevronLeft size={20} className="text-textLight rotate-180" />
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center pt-16">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
              <MessageCircle size={32} className="text-textLight" />
            </div>
            <span className="text-center mb-5 text-base text-textLight">No tickets found</span>
            <button 
              onClick={createNewTicket}
              className="px-5 py-3 rounded-full bg-primary text-white font-semibold border-none cursor-pointer hover:opacity-90 transition-opacity"
            >
              Create New Ticket
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
