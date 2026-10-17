import React, { useState } from 'react';
import type { RentalListing } from '../../domain/types';
import { api } from '../services/api';
import { toast } from './ToastStack';
import {
  Sparkles,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
} from 'lucide-react';

export interface QuickIngestModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onIngestSuccess: (listing: RentalListing) => void;
}

interface IngestFeedback {
  readonly success: boolean;
  readonly message: string;
  readonly filtered?: boolean | undefined;
  readonly listing?: RentalListing | undefined;
}

/**
 * Modal dialog for testing and ingesting a single Facebook or Telegram rental post.
 */
export const QuickIngestModal: React.FC<QuickIngestModalProps> = ({
  isOpen,
  onClose,
  onIngestSuccess,
}) => {
  const [ingestText, setIngestText] = useState('');
  const [ingestUrl, setIngestUrl] = useState('');
  const [ingestImages, setIngestImages] = useState('');
  const [ingestLoading, setIngestLoading] = useState(false);
  const [ingestResult, setIngestResult] = useState<IngestFeedback | null>(null);

  if (!isOpen) return null;

  const handleQuickIngest = async (bypassFilters: boolean = false) => {
    if (!ingestText.trim() || ingestLoading) return;
    setIngestLoading(true);
    setIngestResult(null);

    try {
      const imageUrlsList = ingestImages
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.startsWith('http'));

      const res = await api.parseSinglePost(
        ingestText.trim(),
        ingestUrl.trim() || undefined,
        imageUrlsList.length > 0 ? imageUrlsList : undefined,
        bypassFilters,
      );

      if (res._tag === 'err') {
        setIngestResult({ success: false, message: `Error: ${res.error.message}` });
        return;
      }

      const data = res.value;
      if (data.filtered) {
        const msg = `Filter Rejection: ${data.reason || 'Post did not match location/criteria'}`;
        toast.warning(msg);
        setIngestResult({
          success: false,
          filtered: true,
          message: msg,
        });
        return;
      }

      if (data.success && data.listing) {
        const newListing = data.listing;
        const msg = `Ingested & Ranked! Score: ${newListing.score} pts (${newListing.tier})`;
        toast.success(msg);
        setIngestResult({
          success: true,
          message: msg,
          listing: newListing,
        });
        setIngestText('');
        setIngestUrl('');
        setIngestImages('');
        onIngestSuccess(newListing);
      } else {
        const errMsg = data.error || 'Failed to parse post details';
        toast.error(errMsg);
        setIngestResult({
          success: false,
          message: errMsg,
        });
      }
    } finally {
      setIngestLoading(false);
    }
  };

  return (
    <dialog
      open
      aria-modal="true"
      aria-labelledby="quick-ingest-modal-title"
      className="fixed inset-0 z-50 m-0 h-full w-full max-w-none max-h-none flex items-center justify-center p-4 bg-[#090A0F]/85 backdrop-blur-md border-0"
    >
      <div className="bg-[#11131A] w-full max-w-xl p-6 rounded-3xl border border-white/[0.08] shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 id="quick-ingest-modal-title" className="text-base font-bold text-white">
                Test / Ingest Rental Post
              </h3>
              <p className="text-xs text-slate-400">
                Paste raw Facebook or Telegram text to test Bangalore locality extraction & commute scoring
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close ingest modal"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/[0.06] text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label htmlFor="ingest-raw-text" className="block text-slate-300 font-semibold mb-1">
              Raw Post Text <span className="text-rose-400">*</span>
            </label>
            <textarea
              id="ingest-raw-text"
              value={ingestText}
              onChange={(e) => setIngestText(e.target.value)}
              placeholder="e.g. 1 Room available in 3BHK flat in Kadubeesanahalli near Cessna. Rent ₹22,000, deposit ₹45,000. Attached washroom, swimming pool, power backup. Contact: 9845012345"
              rows={5}
              className="w-full bg-[#090A0F] border border-white/[0.08] rounded-xl p-3 text-slate-200 focus:outline-none focus:border-cyan-500 font-sans leading-relaxed"
            />
          </div>

          <div>
            <label htmlFor="ingest-post-url" className="block text-slate-300 font-semibold mb-1">
              Original Post URL <span className="text-slate-500">(Optional)</span>
            </label>
            <input
              id="ingest-post-url"
              type="text"
              value={ingestUrl}
              onChange={(e) => setIngestUrl(e.target.value)}
              placeholder="https://www.facebook.com/groups/... or https://t.me/..."
              className="w-full bg-[#090A0F] border border-white/[0.08] rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono text-[11px]"
            />
          </div>

          <div>
            <label htmlFor="ingest-image-urls" className="block text-slate-300 font-semibold mb-1">
              Image URLs <span className="text-slate-500">(Optional, comma separated)</span>
            </label>
            <input
              id="ingest-image-urls"
              type="text"
              value={ingestImages}
              onChange={(e) => setIngestImages(e.target.value)}
              placeholder="https://...image1.jpg, https://...image2.jpg"
              className="w-full bg-[#090A0F] border border-white/[0.08] rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono text-[11px]"
            />
          </div>
        </div>

        {ingestResult && (
          <div
            className={`p-3.5 rounded-xl text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border ${
              ingestResult.success
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {ingestResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              )}
              <span>{ingestResult.message}</span>
            </div>

            {!ingestResult.success && ingestResult.filtered && (
              <button
                type="button"
                onClick={() => handleQuickIngest(true)}
                disabled={ingestLoading}
                className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] shrink-0 transition-colors shadow"
              >
                Force Ingest Anyway
              </button>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors duration-140 ease-[var(--ease-out)] active:scale-[0.97]"
          >
            Close
          </button>

          <button
            type="button"
            onClick={() => handleQuickIngest(false)}
            disabled={!ingestText.trim() || ingestLoading}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-[background-color,box-shadow,transform] duration-140 ease-[var(--ease-out)] active:scale-[0.97]"
          >
            {ingestLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Parsing & Scoring...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Parse & Ingest</span>
              </>
            )}
          </button>
        </div>
      </div>
    </dialog>
  );
};
