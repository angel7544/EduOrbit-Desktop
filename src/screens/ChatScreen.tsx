import { useNavigate, useLocation } from 'react-router-dom';
import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Send, User, Paperclip, Smile, RefreshCcw } from 'lucide-react';
import { Header } from '../components/Header';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../hooks/useTheme';

export default function ChatScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const route = { params: location.state };
  const { user } = useAuthStore();
  const { isDarkMode } = useTheme();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [chatId, setChatId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const params = route.params as { chatId?: string; userName?: string; userImage?: string } | undefined;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const fetchMessages = async (currentChatId: string, showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const { data: msgs, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', currentChatId)
        .order('created_at', { ascending: true });

      if (msgError) throw msgError;
      setMessages(msgs || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      if (showLoader) setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    if (chatId) {
      setRefreshing(true);
      fetchMessages(chatId, false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        let currentChatId = params?.chatId;

        if (!currentChatId) {
          const { data: existingChat } = await supabase
            .from('chats')
            .select('id')
            .eq('user_id', user?.id)
            .single();

          if (existingChat) {
            currentChatId = existingChat.id;
          } else {
            const { data: newChat, error: createError } = await supabase
              .from('chats')
              .insert({ user_id: user?.id })
              .select()
              .single();

            if (createError) throw createError;
            currentChatId = newChat.id;
          }
        }

        if (mounted) {
          setChatId(currentChatId || null);
          if (currentChatId) {
            await fetchMessages(currentChatId, true);
          } else {
            setLoading(false);
          }
        }
      } catch (error) {
        console.error('Error initializing chat:', error);
        if (mounted) setLoading(false);
      }
    };
    init();
    return () => { mounted = false; };
  }, [params?.chatId, user?.id]);

  useEffect(() => {
    if (!chatId) return;

    const channel = supabase
      .channel(`chat:${chatId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMessage = payload.new;
            if (newMessage.chat_id === chatId) {
              setMessages((prev) => {
                if (prev.some(m => m.id === newMessage.id)) return prev;
                return [...prev, newMessage];
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedMessage = payload.new;
            if (updatedMessage.chat_id === chatId) {
              setMessages((prev) => prev.map(m => m.id === updatedMessage.id ? updatedMessage : m));
            }
          } else if (payload.eventType === 'DELETE') {
            setMessages((prev) => prev.filter(m => m.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [chatId]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !chatId || !user) return;
    const msg = newMessage.trim();
    setNewMessage('');

    const tempId = `temp-${Date.now()}`;
    const tempMessage = {
      id: tempId,
      chat_id: chatId,
      sender_id: user.id,
      message: msg,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempMessage]);

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({ chat_id: chatId, sender_id: user.id, message: msg })
        .select()
        .single();

      if (error) throw error;

      setMessages((prev) => {
        if (prev.some(m => m.id === data.id)) return prev.filter(m => m.id !== tempId);
        return prev.map(m => m.id === tempId ? data : m);
      });

      setIsTyping(true);
      setTimeout(() => setIsTyping(false), 3000);
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(msg);
      setMessages((prev) => prev.filter(m => m.id !== tempId));
    }
  };

  const renderItem = (item: any) => {
    const isMe = item.sender_id === user?.id;
    const urlRegex = /((?:https?:\/\/|www\.)[^\s]+)/g;
    const parts = item.message.split(urlRegex);
    const firstUrlMatch = item.message.match(urlRegex);
    let previewUrl = firstUrlMatch ? firstUrlMatch[0] : null;

    if (previewUrl && !previewUrl.startsWith('http')) {
      previewUrl = 'https://' + previewUrl;
    }

    return (
      <div key={item.id} className={`flex flex-col mb-4 max-w-[85%] ${isMe ? 'self-end' : 'self-start'}`}>
        <div className={`p-3.5 px-4 rounded-2xl shadow-sm break-words ${isMe ? 'bg-primary text-white rounded-br-none' : isDarkMode ? 'bg-gray-800 text-gray-100 rounded-bl-none border border-gray-700' : 'bg-white text-gray-900 rounded-bl-none border border-gray-200'}`}>
          <p className="text-[15px] leading-[22px] m-0">
            {parts.map((part: string, index: number) => {
              if (part.match(urlRegex)) {
                let href = part.startsWith('http') ? part : 'https://' + part;
                return <a key={index} href={href} target="_blank" rel="noreferrer" className={isMe ? 'text-blue-200 underline' : 'text-primary underline'}>{part}</a>;
              }
              return <span key={index}>{part}</span>;
            })}
          </p>
          {previewUrl && (
             <a href={previewUrl} target="_blank" rel="noreferrer" className="block mt-2 text-sm underline opacity-80 break-all">
                {previewUrl}
             </a>
          )}
          <span className={`text-[10px] block text-right mt-1 opacity-70`}>
            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className={`flex flex-col h-screen ${isDarkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <Header
        title={params?.userName ? params.userName : 'Support'}
        titleImage={params?.userImage}
        showBack={true}
        rightComponent={
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className={`p-2 rounded-full border-none cursor-pointer flex items-center justify-center transition-opacity ${refreshing ? 'opacity-50' : 'opacity-100'} ${isDarkMode ? 'bg-white/10' : 'bg-black/5'}`}
          >
            <RefreshCcw size={18} className="text-text" />
          </button>
        }
      />

      {loading ? (
        <div className="flex-1 flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 flex flex-col max-w-4xl mx-auto w-full">
          {messages.map(renderItem)}
          {isTyping && (
             <div className="self-start max-w-[85%] mb-4">
                 <div className={`p-3.5 px-4 rounded-2xl rounded-bl-none border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <span className="text-xs text-textLight italic">Typing...</span>
                 </div>
             </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      <div className={`p-3 pb-6 border-t ${isDarkMode ? 'bg-slate-900/80 border-gray-800 backdrop-blur-md' : 'bg-white/80 border-gray-200 backdrop-blur-md'}`}>
        <div className="max-w-4xl mx-auto w-full">
          <div className={`flex flex-row items-center rounded-[28px] px-2 py-1 shadow-md ${isDarkMode ? 'bg-white/10' : 'bg-white'}`}>
            <button className="p-2.5 bg-transparent border-none cursor-pointer">
            <Paperclip size={20} className="text-textLight hover:text-text transition-colors" />
          </button>

          <input
            className="flex-1 text-base px-3 py-2.5 bg-transparent border-none outline-none text-text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                sendMessage();
              }
            }}
          />

          <button
            className={`w-11 h-11 rounded-full flex items-center justify-center ml-1 border-none cursor-pointer transition-all ${newMessage.trim() ? 'bg-primary scale-100 opacity-100' : 'bg-primary/60 scale-90 opacity-60'}`}
            onClick={sendMessage}
            disabled={!newMessage.trim()}
          >
            <Send color="#fff" size={20} />
          </button>
        </div>
      </div>
    </div>
    </div>
  );
}
