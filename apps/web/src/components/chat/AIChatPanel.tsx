"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Check, X, Loader2 } from 'lucide-react';
import type { ChatMessage } from '@yatrasarthi/types';

export function AIChatPanel({ tripId }: { tripId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sessionId: 'session-1',
      role: 'user',
      content: input.trim(),
      ts: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId, messages: [...messages, userMsg] })
      });
      
      const data = await res.json();
      if (data.message) {
        setMessages(prev => [...prev, data.message]);
      }
    } catch (err) {
      console.error('Chat error', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToolConfirm = async (messageId: string, toolCallId: string, confirmed: boolean) => {
    // Update local state to show it's confirmed/rejected
    const updatedMessages = messages.map(m => {
      if (m.id === messageId && m.toolCalls) {
        return {
          ...m,
          toolCalls: m.toolCalls.map((tc: any) => tc.id === toolCallId ? { ...tc, confirmed } : tc)
        };
      }
      return m;
    });
    setMessages(updatedMessages);

    if (confirmed) {
      // Find the specific tool call
      const msg = messages.find(m => m.id === messageId);
      const toolCall = msg?.toolCalls?.find((tc: any) => tc.id === toolCallId);
      
      if (!toolCall) return;

      setIsLoading(true);
      try {
        const res = await fetch('/api/chat/execute-tool', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tripId, toolCall })
        });
        const data = await res.json();
        
        // Add tool result message
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          sessionId: 'session-1',
          role: 'tool',
          content: JSON.stringify(data.result),
          ts: new Date().toISOString()
        }]);
      } catch (err) {
        console.error('Tool execution error', err);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="flex flex-col h-[500px] w-full max-w-md bg-white rounded-2xl border border-[#D5D9CC] shadow-lg overflow-hidden flex-shrink-0">
      <div className="bg-[#172017] text-[#C5D82D] p-4 flex items-center gap-2">
        <Bot size={20} />
        <h3 className="font-bold text-sm">YatraSarthi AI Orchestrator</h3>
      </div>
      
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-[#F5F2E8]/30">
        {messages.length === 0 && (
          <div className="text-center text-[#5F665B] text-sm mt-10">
            Ask me to edit the itinerary or find alternatives!
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-3 text-sm ${msg.role === 'user' ? 'bg-[#DCE8D2] text-[#172017]' : 'bg-white border border-[#D5D9CC] text-[#172017]'}`}>
              <div className="font-semibold text-xs mb-1 opacity-60 flex items-center gap-1">
                {msg.role === 'user' ? <><User size={12}/> You</> : <><Bot size={12}/> AI Assistant</>}
              </div>
              <div className="whitespace-pre-wrap">{msg.content}</div>
              
              {/* Tool Calls rendering requiring explicit confirm */}
              {msg.toolCalls && msg.toolCalls.map((tc: any) => (
                <div key={tc.id} className="mt-3 p-3 bg-[#F5F2E8] border border-[#D5D9CC] rounded-xl text-xs">
                  <div className="font-bold text-[#B03028] mb-1 flex items-center gap-1">
                    ⚠️ Action Required: {tc.name}
                  </div>
                  <pre className="overflow-x-auto text-[10px] bg-white p-2 rounded border border-[#D5D9CC] mb-2">
                    {JSON.stringify(tc.arguments, null, 2)}
                  </pre>
                  {tc.confirmed === undefined ? (
                    <div className="flex gap-2">
                      <button onClick={() => handleToolConfirm(msg.id, tc.id, true)} className="flex-1 bg-[#172017] text-[#C5D82D] py-1.5 rounded-lg flex items-center justify-center gap-1 font-bold">
                        <Check size={14}/> Confirm
                      </button>
                      <button onClick={() => handleToolConfirm(msg.id, tc.id, false)} className="flex-1 bg-white border border-[#D5D9CC] text-[#5F665B] py-1.5 rounded-lg flex items-center justify-center gap-1 font-bold">
                        <X size={14}/> Reject
                      </button>
                    </div>
                  ) : (
                    <div className={`font-bold ${tc.confirmed ? 'text-[#4E8752]' : 'text-[#D93829]'}`}>
                      {tc.confirmed ? 'Confirmed ✓' : 'Rejected ✗'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-[#5F665B] text-xs p-2">
            <Loader2 size={14} className="animate-spin" /> Orchestrating...
          </div>
        )}
      </div>

      <form onSubmit={sendMessage} className="p-3 bg-white border-t border-[#D5D9CC] flex items-center gap-2">
        <input 
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2 bg-[#F5F2E8]/50 border border-[#D5D9CC] rounded-xl text-sm outline-none focus:border-[#C5D82D]"
          disabled={isLoading}
        />
        <button type="submit" disabled={!input.trim() || isLoading} className="p-2.5 bg-[#172017] text-[#C5D82D] rounded-xl disabled:opacity-50">
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
