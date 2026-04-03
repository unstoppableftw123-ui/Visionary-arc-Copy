import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { submitMission } from '../../services/missionService';

const URL_REGEX = /^https?:\/\/.+\..+/;
const NOTE_MAX = 200;

/**
 * SubmitMissionModal
 *
 * Props:
 *   assignment  – mission_assignment row (must have .id)
 *   open        – boolean
 *   onClose     – () => void
 *   onSuccess   – () => void  (refresh parent data)
 */
export default function SubmitMissionModal({ assignment, open, onClose, onSuccess }) {
  const [url, setUrl]     = useState('');
  const [note, setNote]   = useState('');
  const [loading, setLoading] = useState(false);
  const [urlError, setUrlError] = useState('');

  const handleUrlChange = (e) => {
    setUrl(e.target.value);
    if (urlError) setUrlError('');
  };

  const handleSubmit = async () => {
    if (!URL_REGEX.test(url.trim())) {
      setUrlError('Please enter a valid URL (e.g. https://github.com/...)');
      return;
    }

    setLoading(true);
    try {
      await submitMission(assignment.id, url.trim(), note.trim() || undefined);
      toast.success('Work submitted! Awaiting review.');
      setUrl('');
      setNote('');
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err?.message ?? 'Submission failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[#12121A] border border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Submit Your Work</DialogTitle>
          <DialogDescription className="text-gray-400 text-sm">
            Paste a link to your completed work. The company reviewer will check it and award XP.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* URL input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-300 uppercase tracking-wide">
              Project URL <span className="text-red-400">*</span>
            </label>
            <Input
              placeholder="https://github.com/your-project"
              value={url}
              onChange={handleUrlChange}
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-white/30"
            />
            {urlError && (
              <p className="text-xs text-red-400">{urlError}</p>
            )}
          </div>

          {/* Note textarea */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-300 uppercase tracking-wide">
              Note to reviewer{' '}
              <span className="text-gray-500 font-normal normal-case">(optional)</span>
            </label>
            <textarea
              rows={3}
              maxLength={NOTE_MAX}
              placeholder="Anything you want the reviewer to know..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-md bg-white/5 border border-white/10 text-white placeholder:text-gray-500 text-sm px-3 py-2 resize-none focus:outline-none focus:border-white/30 transition-colors"
            />
            <p className="text-xs text-gray-500 text-right">
              {note.length}/{NOTE_MAX}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            className="border-white/10 text-gray-300 hover:bg-white/10 hover:text-white"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !url.trim()}
            className="bg-violet-600 hover:bg-violet-500 text-white"
          >
            {loading ? 'Submitting…' : 'Submit Work'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
