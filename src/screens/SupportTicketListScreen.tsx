import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, MessageCircle, Search, Plus, ChevronDown, ChevronRight, Menu } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../hooks/useTheme';
import { SupportChatPanel } from '../components/SupportChatPanel';
import { Avatar } from '../components/Avatar';

export default function SupportTicketListScreen() {
  const location = useLocation();
  const routeParams = location.state as { chatId?: string } | undefined;
  
  const { user } = useAuthStore();
  const { isDarkMode } = useTheme();
  const [loading, setLoading] = useState(false);
  const [chats, setChats] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'closed'>('all');
  
  const [selectedChatId, setSelectedChatId] = useState<string | null>(routeParams?.chatId || null);
  const [expandedUsers, setExpandedUsers] = useState<Record<string, boolean>>({});
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    if (user) {
      fetchChats();

      const filter = user.role === 'admin' ? '' : `user_id=eq.${user.id}`;
      const channel = supabase
        .channel(`support_chats_changes_${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'chats',
            ...(filter ? { filter } : {})
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
      let query = supabase
        .from('chats')
        .select('*, users(id, name, profile_image, email)')
        .order('created_at', { ascending: false });
        
      if (user?.role !== 'admin') {
        query = query.eq('user_id', user?.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setChats(data || []);
      
      // Auto-expand all users by default
      if (data) {
        const uniqueUsers = Array.from(new Set(data.map((c: any) => c.user_id)));
        setExpandedUsers(prev => {
          const newExpanded = { ...prev };
          uniqueUsers.forEach((id: string) => {
            if (newExpanded[id] === undefined) newExpanded[id] = true;
          });
          return newExpanded;
        });
      }
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
      setSelectedChatId(newChat.id);
      fetchChats(); // Refresh list to show new ticket
    } catch (error) {
      console.error('Error creating new ticket:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredChats = chats.filter(chat => {
    const matchesSearch = chat.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          chat.users?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    // In 'all' tab, we show open. In 'closed' tab, we show closed.
    const matchesStatus = statusFilter === 'all' ? chat.status === 'open' : chat.status === 'closed';

    return matchesSearch && matchesStatus;
  });

  // Group by user
  const groupedChats = filteredChats.reduce((acc: any, chat: any) => {
    const userId = chat.user_id;
    if (!acc[userId]) {
      acc[userId] = {
        user: chat.users || { name: 'Unknown User', profile_image: null },
        chats: []
      };
    }
    acc[userId].chats.push(chat);
    return acc;
  }, {});

  const toggleUserExpanded = (userId: string) => {
    setExpandedUsers(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  const selectedChat = chats.find(c => c.id === selectedChatId);
  const selectedChatUserName = selectedChat?.users?.name || undefined;

  return (
    <div className={`flex flex-row h-screen overflow-hidden ${isDarkMode ? 'bg-[#0f0f0f] text-gray-50' : 'bg-gray-50 text-gray-900'}`}>
      
      {/* LEFT SIDEBAR */}
      {isSidebarOpen && (
        <div className={`w-[320px] md:w-[380px] flex-shrink-0 flex flex-col border-r ${isDarkMode ? 'border-white/10 bg-[#141414]' : 'border-gray-200 bg-white'} z-10 shadow-sm transition-all duration-300`}>
        <div className="p-4 pt-6 pb-2">
          <div className="flex flex-row items-center justify-between mb-5">
            <h1 className="text-2xl font-bold m-0 tracking-tight">Chats</h1>
            <button onClick={createNewTicket} className={`flex flex-row items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 dark:border-white/10 bg-transparent cursor-pointer transition-colors ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-100'}`}>
              <Plus size={16} className={isDarkMode ? 'text-gray-300' : 'text-gray-700'} />
              <span className={`text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>New Chat</span>
            </button>
          </div>
          
          <div className={`flex flex-row items-center rounded-full px-4 h-11 mb-5 border ${isDarkMode ? 'bg-white/5 border-transparent' : 'bg-gray-100 border-transparent'}`}>
            <Search size={18} className="text-gray-400" />
            <input
              className="flex-1 ml-2 bg-transparent border-none outline-none text-[15px] text-inherit"
              placeholder="Search Contact"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex flex-row gap-2 border-b border-gray-200 dark:border-white/10 pb-4">
            <button
              onClick={() => setStatusFilter('all')}
              className={`flex-1 py-2 rounded-xl text-sm font-bold border-none cursor-pointer transition-colors
                ${statusFilter === 'all' 
                  ? (isDarkMode ? 'bg-white/10 text-white' : 'bg-black text-white')
                  : (isDarkMode ? 'bg-transparent text-gray-400 hover:bg-white/5' : 'bg-transparent text-gray-500 hover:bg-gray-100')
                }`}
            >
              Open
            </button>
            <button
              onClick={() => setStatusFilter('closed')}
              className={`flex-1 py-2 rounded-xl text-sm font-bold border-none cursor-pointer transition-colors
                ${statusFilter === 'closed' 
                  ? (isDarkMode ? 'bg-white/10 text-white' : 'bg-black text-white')
                  : (isDarkMode ? 'bg-transparent text-gray-400 hover:bg-white/5' : 'bg-transparent text-gray-500 hover:bg-gray-100')
                }`}
            >
              Closed
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-4 no-scrollbar">
          <h2 className={`text-[11px] font-bold uppercase tracking-wider mb-3 px-3 mt-3 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Conversations</h2>
          
          {loading ? (
            <div className="flex justify-center mt-5">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : Object.keys(groupedChats).length > 0 ? (
            Object.entries(groupedChats).map(([userId, group]: [string, any]) => {
              const isExpanded = expandedUsers[userId];
              const openTicketsCount = group.chats.filter((c: any) => c.status === 'open').length;
              
              return (
                <div key={userId} className="mb-2">
                  <div 
                    onClick={() => toggleUserExpanded(userId)}
                    className={`flex flex-row items-center p-3 rounded-2xl cursor-pointer transition-colors ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-100'}`}
                  >
                    <div className="relative mr-3">
                      <Avatar uri={group.user.profile_image} name={group.user.name} size={42} />
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#141414]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="block text-[15px] font-bold truncate">{group.user.name}</span>
                        {isExpanded ? <ChevronDown size={18} className="text-gray-400" /> : <ChevronRight size={18} className="text-gray-400" />}
                      </div>
                      <div className="flex items-center mt-0.5 gap-2">
                        <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Multiple Tickets</span>
                        {openTicketsCount > 0 && (
                          <div className="bg-red-500/20 text-red-500 px-1.5 py-0.5 rounded-full flex items-center justify-center">
                            <span className="text-[10px] font-bold">{openTicketsCount}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className={`ml-[26px] mt-1 flex flex-col gap-1 border-l-2 pl-4 py-1 ${isDarkMode ? 'border-white/5' : 'border-gray-200'}`}>
                      {group.chats.map((chat: any) => {
                        const isSelected = selectedChatId === chat.id;
                        return (
                          <div
                            key={chat.id}
                            onClick={() => setSelectedChatId(chat.id)}
                            className={`flex flex-row justify-between items-center p-3 rounded-2xl cursor-pointer transition-colors ${
                              isSelected 
                                ? (isDarkMode ? 'bg-white/10' : 'bg-gray-100') 
                                : (isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50')
                            }`}
                          >
                            <div className="flex flex-col">
                              <span className={`text-[15px] font-bold ${isSelected ? 'text-primary' : ''}`}>Ticket #{chat.id.substring(0, 8)}</span>
                              {chat.status === 'open' && (
                                <span className="text-[10px] font-bold bg-red-500/10 text-red-500 px-2 py-0.5 rounded-md w-max mt-1.5">
                                  {openTicketsCount > 0 ? `${openTicketsCount} new` : 'OPEN'}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-gray-500 font-medium self-start mt-1">
                              {new Date(chat.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })
          ) : (
            <div className="flex flex-col items-center justify-center pt-10 px-4 text-center">
              <MessageCircle size={32} className="text-gray-400 mb-3 opacity-50" />
              <span className="text-sm text-gray-500 font-medium">No conversations found</span>
            </div>
          )}
        </div>
        </div>
      )}

      {/* RIGHT CHAT PANEL */}
      <div className={`flex-1 flex flex-col relative ${isDarkMode ? 'bg-[#0f0f0f]' : 'bg-white'}`}>
        <SupportChatPanel 
          chatId={selectedChatId} 
          userName={selectedChatUserName} 
          onCreateNewTicket={createNewTicket}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />
      </div>
      
    </div>
  );
}
