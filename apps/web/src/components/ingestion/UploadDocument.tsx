'use client';

import { useState } from 'react';
import type { Node } from '@yatrasarthi/types';
import { ChevronLeft, UploadCloud, Camera, Type, File as FileIcon, X } from 'lucide-react';

type Tab = 'photo' | 'file' | 'text';

interface UploadDocumentProps {
  tripId: string;
  onUploaded: (node: Node) => void;
  onBack: () => void;
}

export default function UploadDocument({ tripId, onUploaded, onBack }: UploadDocumentProps) {
  const [tab, setTab] = useState<Tab>('file');
  const [pastedText, setPastedText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const handleExtract = async () => {
    setError('');
    setLoading(true);
    try {
      const form = new FormData();
      form.append('tripId', tripId);
      if (tab === 'text' && pastedText) {
        form.append('text', pastedText);
      } else if (file) {
        form.append('file', file);
      } else {
        setError('Please provide a file or paste some text.');
        setLoading(false);
        return;
      }

      const res = await fetch('/api/ingest/upload', { method: 'POST', body: form });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error?.message || "We couldn't read that clearly. Try a clearer photo, or enter the details yourself.");
        return;
      }

      onUploaded(json.data as Node);
    } catch {
      setError("We couldn't read that clearly. Try a clearer photo, or enter the details yourself.");
    } finally {
      setLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-8 font-sans animate-fade-in">
      <button 
        onClick={onBack} 
        className="flex items-center gap-1.5 text-sm font-semibold text-[#5F665B] hover:text-[#172017] transition-colors mb-6 cursor-pointer"
      >
        <ChevronLeft size={18} /> Back
      </button>

      <div className="mb-8">
        <h2 className="text-3xl font-extrabold text-[#172017] tracking-tight mb-2">Upload a booking</h2>
        <p className="text-[#5F665B] font-medium">We'll automatically extract the details and connect it to your trip.</p>
      </div>

      {/* Tabs */}
      <div className="flex bg-[#F1F5F9] p-1.5 rounded-2xl mb-8 border border-[#E2E8F0]">
        {(['file', 'photo', 'text'] as Tab[]).map(t => {
          const isActive = tab === t;
          const icons = { file: <UploadCloud size={18} />, photo: <Camera size={18} />, text: <Type size={18} /> };
          const labels = { file: 'Upload File', photo: 'Take Photo', text: 'Paste Text' };
          
          return (
            <button 
              key={t} 
              onClick={() => { setTab(t); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-[15px] font-bold transition-all cursor-pointer ${
                isActive 
                  ? 'bg-[#C5D82D] text-[#172017] shadow-sm border border-[#B5C82A]' 
                  : 'text-[#64748B] hover:text-[#172017] hover:bg-[#E2E8F0]/50 border border-transparent'
              }`}
            >
              <span className={isActive ? 'text-[#172017]' : ''}>{icons[t]}</span>
              {labels[t]}
            </button>
          );
        })}
      </div>

      {/* Input area */}
      <div className="mb-8">
        {tab === 'text' ? (
          <div className="relative">
            <textarea
              className="w-full h-72 p-6 rounded-3xl border-2 transition-all focus:outline-none text-[15px] leading-relaxed shadow-inner"
              style={{ 
                background: '#F8FAFC', 
                borderColor: pastedText ? '#C5D82D' : '#E2E8F0',
                color: '#172017'
              }}
              placeholder="Paste your SMS, PNR, email text, or booking details here..."
              value={pastedText}
              onChange={e => setPastedText(e.target.value)}
            />
          </div>
        ) : (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative flex flex-col items-center justify-center h-72 border-2 border-dashed rounded-3xl transition-all overflow-hidden ${
              isDragging ? 'bg-[#F2F7E6] border-[#C5D82D] scale-[1.02]' : 'bg-[#F8FAFC] border-[#CBD5E1] hover:bg-[#F1F5F9]'
            }`}
          >
            {/* Background Glow */}
            {isDragging && <div className="absolute inset-0 bg-[#C5D82D]/10 blur-2xl pointer-events-none" />}
            
            <label className="absolute inset-0 w-full h-full cursor-pointer flex flex-col items-center justify-center z-10">
              <input
                type="file"
                accept={tab === 'photo' ? 'image/*' : 'application/pdf,image/*'}
                capture={tab === 'photo' ? 'environment' : undefined}
                className="hidden"
                onChange={e => {
                  if (e.target.files && e.target.files.length > 0) {
                    setFile(e.target.files[0]);
                  }
                }}
              />
              
              {file ? (
                <div className="flex flex-col items-center gap-4 text-center px-6 animate-scale-up">
                  <div className="w-20 h-20 rounded-2xl bg-white shadow-md flex items-center justify-center border border-[#E2E8F0]">
                    {file.type.includes('image') ? <Camera size={32} className="text-[#3B82F6]" /> : <FileIcon size={32} className="text-[#EF4444]" />}
                  </div>
                  <div>
                    <p className="text-lg font-bold text-[#172017] mb-1 truncate max-w-[300px]">{file.name}</p>
                    <p className="text-sm font-medium text-[#64748B]">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <button 
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setFile(null); }}
                    className="mt-2 text-sm font-bold text-[#EF4444] hover:text-[#DC2626] bg-[#FEF2F2] px-4 py-1.5 rounded-full z-20 relative cursor-pointer"
                  >
                    Remove file
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 text-center px-6 pointer-events-none">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-colors ${isDragging ? 'bg-[#C5D82D]' : 'bg-white shadow-sm border border-[#E2E8F0]'}`}>
                    {tab === 'photo' ? <Camera size={32} className={isDragging ? 'text-[#172017]' : 'text-[#94A3B8]'} /> : <UploadCloud size={32} className={isDragging ? 'text-[#172017]' : 'text-[#94A3B8]'} />}
                  </div>
                  <div>
                    <p className="text-xl font-bold text-[#172017] mb-2">
                      {tab === 'photo' ? 'Take or choose a photo' : 'Drag & drop a file here'}
                    </p>
                    <p className="text-[15px] font-medium text-[#64748B]">
                      {tab === 'photo' ? 'Ensure text is clear and readable' : 'or click to browse from your device (PDF, JPG, PNG)'}
                    </p>
                  </div>
                </div>
              )}
            </label>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-[#FEF2F2] border border-[#FCA5A5] flex items-start gap-3 animate-slide-up">
          <div className="mt-0.5"><X size={18} className="text-[#DC2626]" /></div>
          <div>
            <p className="text-sm font-bold text-[#991B1B]">{error}</p>
            <button onClick={onBack} className="mt-1 text-xs font-bold text-[#DC2626] hover:underline cursor-pointer">
              Enter details manually instead
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="mb-6 text-center animate-pulse">
          <p className="text-[15px] font-bold text-[#4E8752] bg-[#E8F0E2] border border-[#DCE8D2] inline-block px-5 py-2.5 rounded-full shadow-sm">
            ✨ Extracting booking details...
          </p>
        </div>
      )}

      <button 
        className={`w-full py-4 rounded-2xl text-lg font-extrabold flex items-center justify-center gap-2 transition-all shadow-md ${
          loading 
            ? 'bg-[#E2E8F0] text-[#94A3B8] cursor-not-allowed' 
            : 'bg-[#172017] text-[#C5D82D] hover:bg-[#2D3F2D] hover:-translate-y-1 hover:shadow-lg cursor-pointer'
        }`}
        onClick={handleExtract} 
        disabled={loading}
      >
        {loading ? 'Processing...' : 'Extract Details'}
      </button>
    </div>
  );
}
