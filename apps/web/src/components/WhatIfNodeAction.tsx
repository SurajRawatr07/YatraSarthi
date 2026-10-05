'use client';

import { useState } from 'react';
import { Zap, X } from 'lucide-react';
import { CascadeImpactPanel } from '@/components/CascadeImpactPanel';

interface WhatIfNodeActionProps {
  tripId: string;
  node: { id: string; label: string; type: string };
}

/**
 * "What if…?" floating action that appears on D2 (node detail / hover).
 * Opens a side-sheet with the CascadeImpactPanel in targetNode mode.
 * This is a read-only dry-run — nothing in the DB is changed.
 */
export function WhatIfNodeAction({ tripId, node }: WhatIfNodeActionProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all hover:scale-105"
        style={{ background: '#172017', color: '#C5D82D' }}
        title="What if this booking is disrupted?"
      >
        <Zap size={11} />
        What if?
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Side panel */}
          <div
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col"
            style={{ borderLeft: '1px solid #D5D9CC' }}
          >
            <div
              className="flex items-center justify-between px-5 py-4 border-b"
              style={{ borderColor: '#D5D9CC', background: '#F5F2E8' }}
            >
              <div className="flex items-center gap-2">
                <Zap size={16} style={{ color: '#172017' }} />
                <span className="font-bold text-sm" style={{ color: '#172017' }}>
                  What if? — {node.label}
                </span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg"
                style={{ background: '#EDE9D8', color: '#5F665B' }}
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <CascadeImpactPanel
                tripId={tripId}
                targetNode={node}
                onClose={() => setOpen(false)}
              />
            </div>
          </div>
        </>
      )}
    </>
  );
}
