import { useNavigate, useLocation } from 'react-router-dom';
import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Send, Search, X, Lock, Unlock, Reply, PlusCircle, Paperclip } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../hooks/useTheme';
import { Header } from '../components/Header';

export default function ChatSupportScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const route = { params: location.state };
  const { user } = useAuthStore();
  const { isDarkMode } = useTheme();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [chatId, setChatId] = useState<string | null>(null);
  const [chatStatus, setChatStatus] = useState<'open' | 'closed'>('open');
  const [chatOwnerId, setChatOwnerId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [replyingTo, setReplyingTo] = useState<any | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isTyping, setIsTyping] = useState(false);

  const params = route.params as { chatId?: string; userName?: string; initialMessage?: string; autoSend?: boolean; forceNewTicket?: boolean } | undefined;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    if (params?.initialMessage) {
      setNewMessage(params.initialMessage);
    }
    const initChat = async () => {
      try {
        let existingChat;

        if (params?.forceNewTicket) {
          existingChat = null;
        } else if (params?.chatId) {
          const { data } = await supabase.from('chats').select('id, status, user_id').eq('id', params.chatId).single();
          existingChat = data;
        } else {
          const { data } = await supabase.from('chats').select('id, status, user_id').eq('user_id', user?.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
          existingChat = data;
        }

        if (existingChat) {
          setChatId(existingChat.id);
          setChatStatus(existingChat.status || 'open');
          setChatOwnerId(existingChat.user_id);
        } else {
          const { data: newChat, error: createError } = await supabase.from('chats').insert({ user_id: user?.id, status: 'open' }).select().single();
          if (createError) throw createError;
          setChatId(newChat.id);
          setChatStatus('open');
          setChatOwnerId(newChat.user_id);
        }
      } catch (error) {
        console.error('Error initializing chat:', error);
      }
    };
    initChat();
  }, [params?.chatId, user?.id, params?.forceNewTicket]);

  useEffect(() => {
    if (chatId && params?.autoSend && params?.initialMessage && newMessage === params.initialMessage) {
      sendMessage();
    }
  }, [chatId]);

  useEffect(() => {
    if (!chatId) return;

    const fetchMessages = async () => {
      setLoading(true);
      try {
        const { data: msgs, error: msgError } = await supabase.from('messages').select('*').eq('chat_id', chatId).order('created_at', { ascending: true });
        if (msgError) throw msgError;
        setMessages(msgs || []);
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchMessages();

    const channel = supabase.channel(`chat_messages:${chatId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` }, (payload) => {
        setMessages((prev) => {
          if (prev.some(m => m.id === payload.new.id)) return prev;
          if (payload.new.sender_id !== user?.id) setIsTyping(false);
          return [...prev, payload.new];
        });
      }).subscribe();

    const chatStatusChannel = supabase.channel(`chat_status:${chatId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chats', filter: `id=eq.${chatId}` }, (payload) => {
        if (payload.new.status) setChatStatus(payload.new.status);
      }).subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(chatStatusChannel);
    };
  }, [chatId]);

  const handleTyping = (text: string) => {
    setNewMessage(text);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !chatId) return;

    const msg = newMessage.trim();
    const replyTo = replyingTo;

    const tempId = `temp-${Date.now()}`;
    const tempMessage = {
      id: tempId, chat_id: chatId, sender_id: user?.id, message: msg, reply_to_id: replyTo?.id || null, created_at: new Date().toISOString(),
    };

    setNewMessage('');
    setReplyingTo(null);
    setMessages(prev => [...prev, tempMessage]);

    try {
      const { data: realMessage, error } = await supabase.from('messages').insert({ chat_id: chatId, sender_id: user?.id, message: msg, reply_to_id: replyTo?.id || null }).select().single();
      if (error) throw error;

      setMessages(prev => {
        if (prev.some(m => m.id === realMessage.id)) return prev.filter(m => m.id !== tempId);
        return prev.map(m => m.id === tempId ? realMessage : m);
      });

      if (user?.role === 'admin' && chatOwnerId && chatOwnerId !== user.id) {
        await supabase.from('notifications').insert({ title: 'Support Reply', message: msg, type: 'chat_reply', user_id: chatOwnerId, chat_id: chatId });
      }
    } catch (error) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setNewMessage(msg);
      setReplyingTo(replyTo);
      alert('Error: Failed to send message');
    }
  };

  const createNewTicket = async () => {
    try {
      setLoading(true);
      const { data: newChat, error } = await supabase.from('chats').insert({ user_id: user?.id, status: 'open' }).select().single();
      if (error) throw error;
      setChatId(newChat.id);
      setChatStatus('open');
      setMessages([]);
      setReplyingTo(null);
      setNewMessage('');
    } catch (error) {
      alert('Error: Failed to create new ticket');
    } finally {
      setLoading(false);
    }
  };

  const toggleChatStatus = async () => {
    if (!chatId) return;
    const newStatus = chatStatus === 'open' ? 'closed' : 'open';

    if (newStatus === 'closed') {
      if (window.confirm('Are you sure you want to close this support ticket?')) {
        const { error } = await supabase.from('chats').update({ status: 'closed' }).eq('id', chatId);
        if (!error) setChatStatus('closed');
      }
      return;
    }
    const { error } = await supabase.from('chats').update({ status: newStatus }).eq('id', chatId);
    if (!error) setChatStatus(newStatus);
  };

  const renderItem = (item: any) => {
    const isMe = item.sender_id === user?.id;
    const repliedMessage = messages.find(m => m.id === item.reply_to_id);

    const urlRegex = /((?:https?:\/\/|www\.)[^\s]+)/g;
    const parts = item.message.split(urlRegex);
    const firstUrlMatch = item.message.match(urlRegex);
    let previewUrl = firstUrlMatch ? firstUrlMatch[0] : null;

    if (previewUrl && !previewUrl.startsWith('http')) previewUrl = 'https://' + previewUrl;

    return (
      <div key={item.id} className={`flex flex-col mb-4 max-w-[85%] ${isMe ? 'self-end' : 'self-start'}`}>
        {repliedMessage && (
          <div className={`p-2.5 rounded-xl mb-2 mx-2 border-l-4 ${isMe ? 'bg-white/20 border-white/50 text-white' : isDarkMode ? 'bg-white/5 border-primary text-gray-300' : 'bg-gray-100 border-primary text-gray-700'}`}>
            <span className="block text-xs font-bold mb-1 opacity-90">{repliedMessage.sender_id === user?.id ? 'You' : (params?.userName || 'Support')}</span>
            <span className="block text-xs opacity-80 truncate">{repliedMessage.message}</span>
          </div>
        )}

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
          {previewUrl && <a href={previewUrl} target="_blank" rel="noreferrer" className="block mt-2 text-sm underline opacity-80 break-all">{previewUrl}</a>}
          
          <div className="flex flex-row items-center justify-end mt-1 gap-2">
            <span className="text-[10px] opacity-70">
              {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            {chatStatus === 'open' && (
              <button onClick={() => setReplyingTo(item)} className="bg-transparent border-none p-0 cursor-pointer flex items-center justify-center opacity-70 hover:opacity-100 transition-opacity">
                <Reply size={12} className={isMe ? 'text-white' : 'text-textLight'} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`flex flex-col h-screen ${isDarkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <Header
        title={params?.userName ? params.userName : 'Support Ticket'}
        subtitle={chatId ? `Ticket: #${chatId.substring(0, 8)}` : undefined}
        showBack={true}
        rightComponent={
          <div className="flex flex-row items-center gap-3">
            <button onClick={() => setIsSearchVisible(!isSearchVisible)} className="p-2 bg-transparent border-none cursor-pointer">
              {isSearchVisible ? <X size={24} className="text-text" /> : <Search size={24} className="text-text" />}
            </button>
            {user?.role === 'admin' ? (
              chatStatus === 'open' && (
                <button onClick={toggleChatStatus} className="bg-red-500/10 px-3 py-1.5 rounded-xl border-none cursor-pointer hover:bg-red-500/20 transition-colors">
                  <span className="text-red-500 font-semibold text-xs">Close Ticket</span>
                </button>
              )
            ) : (
              chatStatus === 'open' && (
                <button onClick={toggleChatStatus} className="p-1 bg-transparent border-none cursor-pointer hover:opacity-80 transition-opacity">
                  <Lock size={20} className="text-red-500" />
                </button>
              )
            )}
          </div>
        }
      />

      {isSearchVisible && (
        <div className={`p-3 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
          <div className="max-w-4xl mx-auto w-full">
            <input
              className={`w-full p-2.5 rounded-xl text-base border-none outline-none ${isDarkMode ? 'bg-white/5 text-white' : 'bg-black/5 text-black'}`}
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex-1 flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 flex flex-col max-w-4xl mx-auto w-full">
          {messages.filter(msg => msg.message.toLowerCase().includes(searchQuery.toLowerCase())).map(renderItem)}
          <div ref={messagesEndRef} />
        </div>
      )}

      <div className={`p-3 pb-6 border-t ${isDarkMode ? 'bg-slate-900/80 border-gray-800 backdrop-blur-md' : 'bg-white/80 border-gray-200 backdrop-blur-md'}`}>
        <div className="max-w-4xl mx-auto w-full">
        {chatStatus === 'open' ? (
          <div>
            {replyingTo && (
              <div className={`flex flex-row items-center p-3 rounded-t-2xl ${isDarkMode ? 'bg-white/5' : 'bg-white'}`}>
                <div className="flex-1 mr-2">
                  <span className="block text-xs font-bold text-primary mb-0.5">Replying to {replyingTo.sender_id === user?.id ? 'Yourself' : (params?.userName || 'Support')}</span>
                  <span className="block text-xs text-textLight truncate">{replyingTo.message}</span>
                </div>
                <button onClick={() => setReplyingTo(null)} className="p-1 bg-transparent border-none cursor-pointer">
                  <X size={20} className="text-textLight hover:text-text transition-colors" />
                </button>
              </div>
            )}
            <div className={`flex flex-row items-center rounded-[28px] px-2 py-1 shadow-md ${isDarkMode ? 'bg-white/10' : 'bg-white'} ${replyingTo ? 'rounded-t-none border-t border-gray-200 dark:border-gray-700' : ''}`}>
              <button className="p-2.5 bg-transparent border-none cursor-pointer">
                <Paperclip size={20} className="text-textLight hover:text-text transition-colors" />
              </button>
              <input
                className="flex-1 text-base px-3 py-2.5 bg-transparent border-none outline-none text-text"
                value={newMessage}
                onChange={(e) => handleTyping(e.target.value)}
                placeholder="Type a message..."
                onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
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
        ) : (
          <div className={`flex p-4 rounded-xl items-center ${user?.role === 'admin' ? 'flex-col justify-center' : 'flex-row justify-between'} ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}>
            <div className={`flex flex-row items-center ${user?.role === 'admin' ? 'mb-3' : ''}`}>
              <Lock size={20} className="text-textLight mr-2" />
              <span className="text-textLight font-semibold text-base">This ticket is closed</span>
            </div>
            {user?.role === 'admin' ? (
              <button onClick={toggleChatStatus} className="flex flex-row items-center px-4 py-2 rounded-xl bg-primary/15 border border-primary cursor-pointer hover:bg-primary/25 transition-colors">
                <Unlock size={18} className="text-primary mr-2" />
                <span className="text-primary font-semibold text-sm">Reopen Ticket</span>
              </button>
            ) : (
              <button onClick={createNewTicket} className="flex flex-row items-center px-4 py-2 rounded-full bg-primary border-none cursor-pointer hover:opacity-90 transition-opacity">
                <PlusCircle size={16} className="text-white mr-1" />
                <span className="text-white font-semibold text-sm">New Ticket</span>
              </button>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
