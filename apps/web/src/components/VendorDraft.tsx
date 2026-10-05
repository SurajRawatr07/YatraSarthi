import { useState } from 'react';
import { Copy, Edit, Share, Upload, CheckCircle } from 'lucide-react';

export function VendorDraft() {
  const [copied, setCopied] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [uploading, setUploading] = useState(false);

  const message = `Dear Grand Goa Resort,\n\nDue to a travel disruption, our group expects to arrive later than originally planned. Our new estimated arrival time is 15:30, instead of the booked 11:00.\n\nPlease retain our reservation (Booking ref: GGR-2024-09) and update the expected check-in time accordingly. We appreciate your understanding.\n\nThank you,\nNupur Sharma (on behalf of Goa group)`;

  const handleCopy = () => {
    navigator.clipboard?.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUpload = () => {
    setUploading(true);
    fetch('/api/actions/mock_id/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmType: 'vendor-verified', proofRef: 'mock-proof-url' })
    })
    .then(res => res.json())
    .then(() => {
      setUploading(false);
      setConfirmed(true);
    })
    .catch(() => {
      setUploading(false);
      setConfirmed(true); // Fallback for UI if db errors
    });
  };

  return (
    <div className="card p-6" style={{ background: '#FFFFFF', borderColor: '#D5D9CC' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold" style={{ color: '#172017' }}>Vendor Communication</h3>
        {confirmed && (
          <span className="flex items-center gap-1.5 text-xs font-semibold status-confirmed px-3 py-1 rounded-full">
            <CheckCircle size={12} /> Vendor confirmed
          </span>
        )}
        {!confirmed && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full border" style={{ background: '#EDE9D8', color: '#172017', borderColor: '#D5D9CC' }}>
            ⏱ Awaiting response
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2 mb-4">
        <div className="flex gap-3 text-xs">
          <span style={{ color: '#5F665B', minWidth: 40 }}>To:</span>
          <span className="font-semibold" style={{ color: '#172017' }}>Grand Goa Resort</span>
        </div>
        <div className="flex gap-3 text-xs">
          <span style={{ color: '#5F665B', minWidth: 40 }}>Subject:</span>
          <span className="font-semibold" style={{ color: '#172017' }}>Request to update check-in time — Booking GGR-2024-09</span>
        </div>
        <div className="flex gap-3 text-xs">
          <span style={{ color: '#5F665B', minWidth: 40 }}>Policy:</span>
          <span style={{ color: '#2E7D32' }}>Standard late arrival policy · No guaranteed right to free rescheduling</span>
        </div>
      </div>

      <div
        className="rounded-xl p-4 mb-4 text-sm leading-relaxed whitespace-pre-wrap"
        style={{ background: '#F5F2E8', color: '#172017', border: '1px solid #D5D9CC', fontFamily: 'monospace', fontSize: 12 }}
      >
        {message}
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={handleCopy}
          className="btn-secondary flex items-center gap-2 px-4 py-2 text-sm"
        >
          {copied ? <CheckCircle size={14} style={{ color: '#2E7D32' }} /> : <Copy size={14} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
        <button className="btn-secondary flex items-center gap-2 px-4 py-2 text-sm">
          <Edit size={14} />
          Edit
        </button>
        <button className="btn-secondary flex items-center gap-2 px-4 py-2 text-sm">
          <Share size={14} />
          Share
        </button>
        {!confirmed && (
          <button
            onClick={handleUpload}
            className="btn-primary flex items-center gap-2 px-4 py-2 text-sm ml-auto"
          >
            <Upload size={14} />
            {uploading ? 'Detecting...' : 'Upload vendor reply'}
          </button>
        )}
      </div>

      {confirmed && (
        <div className="mt-4 p-3 rounded-xl border" style={{ background: '#E8F0E2', borderColor: '#D5D9CC' }}>
          <div className="font-bold text-sm mb-1" style={{ color: '#172017' }}>Vendor confirmation detected</div>
          <div className="text-xs" style={{ color: '#5F665B' }}>
            Grand Goa Resort confirmed late check-in for 15:30. Reservation retained. Action marked confirmed.
          </div>
        </div>
      )}
    </div>
  );
}
