'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Bot, Send, Zap, CheckCircle, Clock, AlertCircle,
  ChevronDown, ChevronUp, Loader, BookOpen, Shield, Train,
  Plane, Hotel, RefreshCw, Info,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  confidenceScore: number | null;
  modelId: string | null;
  source: string | null;
  timestamp: Date;
  loading?: boolean;
}

interface AlignmentState {
  status: 'idle' | 'uploading' | 'processing' | 'completed' | 'error';
  alignmentId: string | null;
  modelId: string | null;
  errorMsg: string | null;
}

// ─── Preset demo questions ────────────────────────────────────────────────────

const DEMO_QUESTIONS = [
  { icon: <Plane size={13} />, label: 'Flight delay compensation', text: 'Can I get compensation if my flight was delayed 5 hours due to heavy rain?' },
  { icon: <Train size={13} />, label: 'Train refund in flood', text: 'My train was delayed 5 hours due to flooding. Can I get a full refund?' },
  { icon: <Shield size={13} />, label: 'Amber status meaning', text: 'What does amber (at-risk) status mean in YatraSarthi?' },
  { icon: <Hotel size={13} />, label: 'Non-refundable hotel', text: 'Is a non-refundable hotel stay covered if there is a natural disaster?' },
  { icon: <BookOpen size={13} />, label: 'Why one option is cheaper', text: 'Why is one recovery option cheaper than another in YatraSarthi?' },
];

// ─── Confidence Badge ─────────────────────────────────────────────────────────

function ConfidenceBadge({ score, source }: { score: number | null; source: string | null }) {
  const isMock = source?.startsWith('mock');
  const isMockAligning = source === 'mock_aligning';

  if (score === null) return null;

  const color = score >= 88
    ? { bg: '#ECFDF5', text: '#059669', bar: '#34D399' }
    : score >= 72
    ? { bg: '#FFFBEB', text: '#D97706', bar: '#FCD34D' }
    : { bg: '#FEF2F2', text: '#DC2626', bar: '#F87171' };

  return (
    <div className="flex items-center gap-2 mt-2.5 flex-wrap">
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
        style={{ background: color.bg, color: color.text }}>
        <Zap size={10} />
        {score.toFixed(1)}% confidence
      </div>
      {/* Bar */}
      <div className="flex-1 min-w-[80px] max-w-[120px] h-1.5 rounded-full bg-gray-200 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, background: color.bar }} />
      </div>
      {isMock && (
        <span className="text-[10px] text-gray-400">
          {isMockAligning ? '⏳ aligning…' : 'mock'}
        </span>
      )}
    </div>
  );
}

// ─── Pipeline Diagram ─────────────────────────────────────────────────────────

function PipelineDiagram({ alignState }: { alignState: AlignmentState }) {
  const isActive = alignState.status === 'processing' || alignState.status === 'uploading';
  const steps = [
    { label: 'Base model', sub: 'qwen-v2p5-0p5b', done: true, icon: <Bot size={12} /> },
    { label: 'Nugen alignment', sub: alignState.alignmentId ? `…${alignState.alignmentId.slice(-8)}` : 'policy corpus', done: alignState.status === 'completed', active: isActive, icon: <Zap size={12} /> },
    { label: 'Domain model', sub: alignState.modelId ? `…${alignState.modelId.slice(-8)}` : 'pending', done: alignState.status === 'completed', icon: <Shield size={12} /> },
    { label: 'YatraSarthi', sub: 'assistant panel', done: alignState.status === 'completed', icon: <BookOpen size={12} /> },
  ];

  return (
    <div className="rounded-2xl border border-[#D5D9CC] p-4" style={{ background: '#fff' }}>
      <p className="text-xs font-semibold text-[#3D3D3D] mb-3 flex items-center gap-1.5">
        <Zap size={11} className="text-yellow-500" />
        Alignment Pipeline
      </p>
      <div className="flex items-center gap-1 flex-wrap">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border transition-all ${
              s.done
                ? 'bg-[#ECFDF5] border-green-200 text-green-700'
                : s.active
                ? 'bg-yellow-50 border-yellow-200 text-yellow-700 animate-pulse'
                : 'bg-gray-50 border-gray-200 text-gray-400'
            }`}>
              {s.active ? <Loader size={10} className="animate-spin" /> : s.done ? <CheckCircle size={10} /> : s.icon}
              <span>{s.label}</span>
              <span className="opacity-60 font-normal">{s.sub}</span>
            </div>
            {i < steps.length - 1 && (
              <span className="text-gray-300 text-xs mx-0.5">→</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main NugenPanel ──────────────────────────────────────────────────────────

export function NugenPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "I'm the YatraSarthi Policy & Recovery Assistant, aligned on DGCA passenger rights, IRCTC refund rules, hotel cancellation policies, and the YatraSarthi recovery ranking engine. Ask me anything about your disrupted trip.",
      confidenceScore: 98.0,
      modelId: 'nugen_yatrasarthi_v1',
      source: 'system',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [alignState, setAlignState] = useState<AlignmentState>({
    // Pre-seed with the running alignment — kicked off during setup
    status: process.env.NEXT_PUBLIC_NUGEN_MODEL_ID ? 'completed' : 'processing',
    alignmentId: process.env.NEXT_PUBLIC_NUGEN_ALIGNMENT_ID ?? 'alignment_01m3g9t1722fy86t',
    modelId: process.env.NEXT_PUBLIC_NUGEN_MODEL_ID ?? null,
    errorMsg: null,
  });
  const [showPipeline, setShowPipeline] = useState(true);
  const [pollingActive, setPollingActive] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Poll alignment status ─────────────────────────────────────────────────
  const pollStatus = useCallback(async (alignmentId: string) => {
    try {
      const res = await fetch(`/api/nugen/status?id=${alignmentId}`);
      const data = await res.json();

      if (data.status === 'COMPLETED') {
        setAlignState(prev => ({
          ...prev,
          status: 'completed',
          modelId: data.model_id,
        }));
        setPollingActive(false);
        setMessages(prev => [...prev, {
          id: `sys_${Date.now()}`,
          role: 'assistant',
          content: `✅ Model alignment complete! The YatraSarthi domain model is now live (ID: ...${(data.model_id ?? '').slice(-8)}). All subsequent answers use the Nugen-aligned model.`,
          confidenceScore: null,
          modelId: data.model_id,
          source: 'system',
          timestamp: new Date(),
        }]);
      } else if (data.status === 'FAILED') {
        setAlignState(prev => ({ ...prev, status: 'error', errorMsg: 'Alignment failed' }));
        setPollingActive(false);
      } else {
        // Still processing — poll again in 15s
        pollTimerRef.current = setTimeout(() => pollStatus(alignmentId), 15000);
      }
    } catch {
      pollTimerRef.current = setTimeout(() => pollStatus(alignmentId), 20000);
    }
  }, []);

  useEffect(() => {
    // If alignment ID is known but not completed, start polling
    if (alignState.alignmentId && alignState.status === 'processing' && !pollingActive) {
      setPollingActive(true);
      pollStatus(alignState.alignmentId);
    }
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, [alignState.alignmentId, alignState.status, pollingActive, pollStatus]);

  // ── Start alignment ───────────────────────────────────────────────────────
  const startAlignment = async () => {
    setAlignState(prev => ({ ...prev, status: 'uploading', errorMsg: null }));
    try {
      const res = await fetch('/api/nugen/align', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setAlignState(prev => ({ ...prev, status: 'error', errorMsg: data.error ?? 'Unknown error' }));
        return;
      }
      setAlignState(prev => ({
        ...prev,
        status: 'processing',
        alignmentId: data.alignment_id,
      }));
      setMessages(prev => [...prev, {
        id: `sys_${Date.now()}`,
        role: 'assistant',
        content: `Alignment job started (ID: ${data.alignment_id}). The model is being aligned to the YatraSarthi policy corpus. This typically takes 5–20 minutes. I'll notify you when it's ready.`,
        confidenceScore: null,
        modelId: null,
        source: 'system',
        timestamp: new Date(),
      }]);
    } catch (e) {
      setAlignState(prev => ({ ...prev, status: 'error', errorMsg: String(e) }));
    }
  };

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || sending) return;

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      content: msg,
      confidenceScore: null,
      modelId: null,
      source: null,
      timestamp: new Date(),
    };

    const loadingId = `a_${Date.now()}`;
    const loadingMsg: ChatMessage = {
      id: loadingId,
      role: 'assistant',
      content: '',
      confidenceScore: null,
      modelId: null,
      source: null,
      timestamp: new Date(),
      loading: true,
    };

    setMessages(prev => [...prev, userMsg, loadingMsg]);
    setInput('');
    setSending(true);

    try {
      const res = await fetch('/api/nugen/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          model_id: alignState.modelId,
        }),
      });
      const data = await res.json();

      setMessages(prev => prev.map(m =>
        m.id === loadingId
          ? {
              ...m,
              content: data.answer ?? data.error ?? 'No response received.',
              confidenceScore: data.confidence_score ?? null,
              modelId: data.model_id ?? null,
              source: data.source ?? null,
              loading: false,
            }
          : m
      ));
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === loadingId
          ? { ...m, content: 'Network error — please try again.', loading: false }
          : m
      ));
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full min-h-[600px] max-w-3xl mx-auto gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#1A1A1A] flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-[#1A1A1A] flex items-center justify-center">
              <Bot size={18} className="text-white" />
            </span>
            Policy Assistant
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#F0F4E8] text-[#3D7A3A]">Task 2</span>
          </h1>
          <p className="text-sm text-[#5F665B] mt-1 ml-11">
            Nugen-aligned model · DGCA rights, IRCTC refunds, recovery logic
          </p>
        </div>

        {/* Alignment control */}
        <div className="flex-shrink-0">
          {alignState.status === 'idle' && (
            <button
              id="start-alignment-btn"
              onClick={startAlignment}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors"
            >
              <Zap size={11} />
              Start Alignment
            </button>
          )}
          {(alignState.status === 'uploading' || alignState.status === 'processing') && (
            <div className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-yellow-50 text-yellow-700 border border-yellow-200">
              <Loader size={11} className="animate-spin" />
              {alignState.status === 'uploading' ? 'Uploading…' : 'Aligning…'}
            </div>
          )}
          {alignState.status === 'completed' && (
            <div className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-green-50 text-green-700 border border-green-200">
              <CheckCircle size={11} />
              Model ready
            </div>
          )}
          {alignState.status === 'error' && (
            <button onClick={startAlignment} className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-red-50 text-red-600 border border-red-200 hover:bg-red-100">
              <RefreshCw size={11} />
              Retry
            </button>
          )}
        </div>
      </div>

      {/* Pipeline diagram (collapsible) */}
      <div>
        <button
          onClick={() => setShowPipeline(p => !p)}
          className="flex items-center gap-1 text-xs text-[#8A9280] font-medium mb-2 hover:text-[#3D3D3D] transition-colors"
        >
          {showPipeline ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {showPipeline ? 'Hide' : 'Show'} alignment pipeline
        </button>
        {showPipeline && <PipelineDiagram alignState={alignState} />}
      </div>

      {/* Demo questions */}
      <div className="flex flex-wrap gap-2">
        {DEMO_QUESTIONS.map((q, i) => (
          <button
            key={i}
            id={`demo-q-${i}`}
            onClick={() => sendMessage(q.text)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-[#D5D9CC] text-[#5F665B] hover:border-[#A8B89C] hover:bg-[#F0F4E8] hover:text-[#2E5C2B] transition-all"
          >
            {q.icon}
            {q.label}
          </button>
        ))}
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto rounded-2xl border border-[#D5D9CC] p-4 flex flex-col gap-3"
        style={{ background: '#FAFAF8', minHeight: 320 }}>
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-[#1A1A1A] flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
                <Bot size={13} className="text-white" />
              </div>
            )}
            <div className={`max-w-[82%] ${msg.role === 'user' ? 'order-1' : ''}`}>
              <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[#1A1A1A] text-white rounded-br-sm'
                  : 'bg-white border border-[#E5E9E0] text-[#1A1A1A] rounded-bl-sm shadow-sm'
              }`}>
                {msg.loading ? (
                  <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                    <Loader size={12} className="animate-spin" />
                    <span>Thinking…</span>
                    <span className="animate-pulse">▋</span>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
              {msg.role === 'assistant' && !msg.loading && (
                <ConfidenceBadge score={msg.confidenceScore} source={msg.source} />
              )}
              <p className="text-[10px] text-gray-400 mt-1 px-0.5">
                {msg.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                {msg.modelId && msg.source === 'nugen_live' && (
                  <span className="ml-1.5 opacity-60">· {msg.modelId.slice(-12)}</span>
                )}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Corpus info card */}
      <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl border border-[#D5D9CC] text-xs text-[#5F665B]" style={{ background: '#fff' }}>
        <Info size={12} className="mt-0.5 text-[#8A9280] flex-shrink-0" />
        <span>
          Aligned on: DGCA passenger rights · IRCTC refund rules · Hotel cancellation policies · YatraSarthi recovery ranking logic · Weather-impact rules
          {alignState.status === 'completed' && alignState.modelId
            ? ` · Model: …${alignState.modelId.slice(-12)}`
            : ' · Model: aligning or awaiting key'}
        </span>
      </div>

      {/* Input */}
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          id="nugen-chat-input"
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about passenger rights, compensation, or recovery options…"
          className="flex-1 px-4 py-3 rounded-2xl border border-[#D5D9CC] text-sm font-medium outline-none focus:border-[#8A9280] transition-colors"
          style={{ background: '#fff', color: '#1A1A1A' }}
          disabled={sending}
        />
        <button
          id="nugen-send-btn"
          onClick={() => sendMessage()}
          disabled={sending || !input.trim()}
          className="w-11 h-11 rounded-2xl flex items-center justify-center transition-all disabled:opacity-40"
          style={{ background: '#1A1A1A' }}
        >
          {sending ? <Loader size={16} className="text-white animate-spin" /> : <Send size={16} className="text-white" />}
        </button>
      </div>
    </div>
  );
}
