import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Loader } from '../components/Loader';
import api from '../services/api';
import {
  Send,
  MessageSquare,
  Sparkles,
  Bot,
  User,
  PlusCircle,
  HelpCircle
} from 'lucide-react';

const SUGGESTIONS = [
  "Why did my expenses increase?",
  "Show my highest spending category.",
  "Summarize this month's finances.",
  "How can I improve profitability?"
];

const Chat = () => {
  const { user } = useAuth();
  
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hello! I am your AI Financial Assistant. I have analyzed your business records, categories, and anomalies.

Ask me questions about your monthly totals, vendor fees, or ask for recommendations on saving costs!`
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendMessage = async (textToSend) => {
    const prompt = textToSend.trim();
    if (!prompt) return;

    // Add user message to state
    const updatedMessages = [...messages, { role: 'user', content: prompt }];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      // Map message roles for backend schema: 'user' / 'assistant'
      const formattedHistory = updatedMessages.slice(0, -1).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await api.post('/api/chat/', {
        message: prompt,
        history: formattedHistory
      });

      setMessages(prev => [...prev, { role: 'assistant', content: response.data.reply }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I'm sorry, I encountered an error communicating with my advisor models. Please verify your connection." 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleSendMessage(input);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] min-h-[450px]">
      
      {/* Title */}
      <div className="mb-4">
        <h1 className="text-2xl font-extrabold text-white dark:text-white tracking-tight flex items-center">
          <MessageSquare className="text-primary-500 mr-2" size={24} />
          <span>AI Chat Assistant</span>
        </h1>
        <p className="text-primary-400 dark:text-primary-300 text-sm mt-1">
          Ask questions directly using your real-time ledger statistics
        </p>
      </div>

      {/* Chat workspace card */}
      <div className="flex-1 glass-card rounded-2xl bg-white dark:bg-[#0d0d0d] border border-primary-900/50 flex flex-col overflow-hidden">
        
        {/* Chat Thread */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {messages.map((msg, idx) => {
            const isBot = msg.role === 'assistant';
            return (
              <div 
                key={idx} 
                className={`flex space-x-3.5 max-w-3xl ${isBot ? 'mr-auto' : 'ml-auto flex-row-reverse space-x-reverse'}`}
              >
                {/* Avatar */}
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${
                  isBot 
                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-400' 
                    : 'bg-slate-100 text-slate-700 dark:bg-[#111111] dark:text-primary-200'
                }`}>
                  {isBot ? <Bot size={16} /> : <User size={16} />}
                </div>

                {/* Message Body */}
                <div className={`p-4 rounded-2xl text-sm leading-relaxed border ${
                  isBot 
                    ? 'bg-[#0d0d0d] dark:bg-black text-primary-100 dark:text-primary-200 border-slate-100 dark:border-slate-850' 
                    : 'bg-primary-600 text-white border-transparent shadow-premium-blue'
                }`}>
                  <div className="whitespace-pre-line font-medium">
                    {msg.content}
                  </div>
                </div>
              </div>
            );
          })}
          
          {loading && (
            <div className="flex space-x-3.5 max-w-3xl mr-auto animate-pulse">
              <div className="h-8 w-8 rounded-full bg-primary-950/20 text-primary-400 flex items-center justify-center">
                <Bot size={16} />
              </div>
              <div className="p-4 rounded-2xl bg-[#0d0d0d] dark:bg-black border border-slate-100 dark:border-slate-850 flex items-center space-x-2">
                <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce"></span>
                <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Suggestion Chips */}
        {messages.length === 1 && (
          <div className="px-6 py-3 bg-[#0d0d0d] dark:bg-black/40 border-t border-slate-100 dark:border-primary-900/80 flex flex-wrap gap-2 items-center">
            <span className="text-[10px] uppercase font-bold text-slate-450 flex items-center mr-1">
              <HelpCircle size={12} className="mr-1" /> Suggestions:
            </span>
            {SUGGESTIONS.map((s, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(s)}
                className="text-xs px-3 py-1 bg-white dark:bg-[#0d0d0d] border border-primary-900 dark:border-primary-900 text-primary-300 dark:text-slate-350 hover:bg-primary-50 dark:hover:bg-[#111111] rounded-lg transition-all"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input form */}
        <form onSubmit={handleFormSubmit} className="p-4 bg-[#0d0d0d] dark:bg-black border-t border-slate-150 dark:border-primary-900 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            placeholder="e.g. How can I lower my utilities bills next month?"
            className="flex-1 bg-white dark:bg-[#0d0d0d] border border-primary-900 dark:border-primary-900 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-xl px-4 py-2.5 text-sm text-slate-850 dark:text-primary-100 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="p-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl transition-all shadow-premium disabled:opacity-50"
          >
            <Send size={16} />
          </button>
        </form>

      </div>

    </div>
  );
};

export default Chat;
