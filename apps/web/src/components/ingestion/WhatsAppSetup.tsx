'use client';

import { useState } from 'react';
import { ChevronLeft, Copy, Check, MessageCircle, Link2, Sparkles } from 'lucide-react';

interface WhatsAppSetupProps {
  tripId: string;
  joinCode: string;
  onBack: () => void;
}

export default function WhatsAppSetup({ joinCode, onBack }: WhatsAppSetupProps) {
  const waNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '+1 (555) 000-0000';
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedNumber, setCopiedNumber] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(joinCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyNumber = () => {
    navigator.clipboard.writeText(waNumber);
    setCopiedNumber(true);
    setTimeout(() => setCopiedNumber(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-8 font-sans animate-fade-in">
      <button 
        onClick={onBack} 
        className="flex items-center gap-1.5 text-sm font-semibold text-[#5F665B] hover:text-[#172017] transition-colors mb-6 cursor-pointer"
      >
        <ChevronLeft size={18} /> Back
      </button>

      <div className="mb-10">
        <h2 className="text-3xl font-extrabold text-[#172017] tracking-tight mb-2">Forward via WhatsApp</h2>
        <p className="text-[#5F665B] font-medium text-[15px]">Simply forward your tickets and confirmations. We'll instantly extract the details and sync them with your trip.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        {/* Join code Card */}
        <div className="bg-white border border-[#D5D9CC] rounded-3xl p-6 shadow-sm flex flex-col justify-between hover:-translate-y-1 hover:shadow-xl transition-all cursor-default relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#DCE8D2] to-[#C5D82D]" />
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-full bg-[#E8F0E2] flex items-center justify-center text-[#4E8752]">
                <Link2 size={18} />
              </div>
              <h3 className="text-[11px] font-bold text-[#5F665B] uppercase tracking-widest">Step 1: Link Account</h3>
            </div>
            <p className="text-sm text-[#5F665B] mb-5 leading-relaxed">Send this unique join code once to our WhatsApp number to link your account securely.</p>
            
            <div className="flex items-center justify-between bg-[#F8FAFC] border border-[#E2E8F0] p-4 rounded-2xl">
              <span className="text-2xl font-black text-[#172017] tracking-wider">{joinCode}</span>
              <button 
                onClick={handleCopyCode}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer shadow-sm ${copiedCode ? 'bg-[#C5D82D] text-[#172017]' : 'bg-[#172017] text-[#C5D82D] hover:bg-[#2D3F2D]'}`}
              >
                {copiedCode ? <Check size={16} /> : <Copy size={16} />}
                {copiedCode ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </div>

        {/* WhatsApp number Card */}
        <div className="bg-white border border-[#D5D9CC] rounded-3xl p-6 shadow-sm flex flex-col justify-between hover:-translate-y-1 hover:shadow-xl transition-all cursor-default relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#4E8752] to-[#25D366]" />
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-full bg-[#E8FDF0] flex items-center justify-center text-[#25D366]">
                <MessageCircle size={18} />
              </div>
              <h3 className="text-[11px] font-bold text-[#5F665B] uppercase tracking-widest">Step 2: Forward Docs</h3>
            </div>
            <p className="text-sm text-[#5F665B] mb-5 leading-relaxed">Save our WhatsApp number and forward PDFs, images, or text messages directly.</p>
            
            <div className="flex items-center justify-between bg-[#F8FAFC] border border-[#E2E8F0] p-4 rounded-2xl">
              <span className="text-lg font-extrabold text-[#172017] tracking-wide">{waNumber}</span>
              <button 
                onClick={handleCopyNumber}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer shadow-sm ${copiedNumber ? 'bg-[#25D366] text-white' : 'bg-[#172017] text-[#25D366] hover:bg-[#2D3F2D]'}`}
              >
                {copiedNumber ? <Check size={16} /> : <Copy size={16} />}
                {copiedNumber ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-[#E8F0E2] border border-[#DCE8D2] rounded-3xl p-6 flex items-start gap-4 shadow-sm animate-slide-up">
        <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center flex-shrink-0 text-[#4E8752]">
          <Sparkles size={24} />
        </div>
        <div>
          <h4 className="text-lg font-extrabold text-[#172017] mb-1">Smart Extraction Magic</h4>
          <p className="text-[15px] font-medium text-[#4E8752] leading-relaxed">
            Our AI automatically scans the documents you forward. We'll extract flight numbers, PNRs, hotel details, and timings, then send a message back asking you to confirm before adding them to this trip.
          </p>
        </div>
      </div>

    </div>
  );
}
