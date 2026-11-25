import React, { useState } from 'react';
import type { Space } from '../types';

interface IssueModalProps {
  isOpen: boolean;
  levels: string[];
  spaces: Space[];
  selectedSpace: Space | null;
  onClose: () => void;
  onSubmit: (title: string, level: string, spaceId: string | null) => Promise<{ id: string } | null>;
}

export const IssueModal: React.FC<IssueModalProps> = ({
  isOpen,
  levels,
  spaces,
  selectedSpace,
  onClose,
  onSubmit,
}) => {
  const initialLevel = selectedSpace && levels.includes(selectedSpace.level)
    ? selectedSpace.level
    : (levels[0] || '');
  const initialSpaceId = selectedSpace && levels.includes(selectedSpace.level)
    ? selectedSpace.id
    : '';

  const [title, setTitle] = useState('');
  const [level, setLevel] = useState(initialLevel);
  const [spaceId, setSpaceId] = useState<string>(initialSpaceId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [createdIssueId, setCreatedIssueId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const trimmed = title.trim();
    if (!trimmed) {
      setValidationError('Title is required.');
      return;
    }
    if (trimmed.length > 120) {
      setValidationError('Title must be 120 characters or fewer.');
      return;
    }
    if (!level) {
      setValidationError('Please select a building level.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await onSubmit(trimmed, level, spaceId || null);
      if (res && res.id) {
        setCreatedIssueId(res.id);
        setTitle('');
      }
    } catch (err: unknown) {
      setValidationError((err as Error).message || 'Failed to submit issue.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDone = () => {
    setCreatedIssueId(null);
    onClose();
  };

  const spacesForLevel = spaces.filter((s) => !level || s.level === level);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-gutter-lg" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-light-surface-container-lowest dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant rounded-md shadow-2xl p-gutter-xl flex flex-col gap-gutter-lg text-light-on-surface dark:text-dark-on-surface"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-light-outline-variant dark:border-dark-outline-variant pb-gutter-md">
          <div className="flex items-center gap-gutter-sm">
            <span className="material-symbols-outlined text-light-primary dark:text-dark-primary" aria-hidden="true">
              flag
            </span>
            <h2 className="font-headline text-headline-md font-semibold">Report an Issue</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="min-w-[44px] min-h-[44px] -mr-2 inline-flex items-center justify-center rounded text-light-outline dark:text-dark-outline hover:text-light-on-surface dark:hover:text-dark-on-surface hover:bg-light-surface-container-high dark:hover:bg-dark-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>

        {createdIssueId ? (
          <div className="flex flex-col items-center text-center gap-gutter-md py-gutter-lg">
            <div className="w-12 h-12 rounded-full bg-success-container text-on-success-container flex items-center justify-center font-bold text-xl">
              ✓
            </div>
            <h3 className="font-headline text-headline-md">Issue Logged Successfully</h3>
            <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
              The issue has been registered with reference ID:
            </p>
            <code className="p-gutter-sm rounded bg-light-surface-container-high dark:bg-dark-surface-container font-mono text-mono-sm text-light-secondary dark:text-dark-secondary font-bold">
              {createdIssueId}
            </code>
            <button
              type="button"
              onClick={handleDone}
              className="mt-gutter-md w-full min-h-[44px] py-gutter-sm rounded bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-label text-label-lg"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-gutter-md">
            {validationError && (
              <div className="p-gutter-sm rounded bg-light-error-container text-light-error-text font-body text-body-sm">
                {validationError}
              </div>
            )}

            <div className="flex flex-col gap-gutter-xs">
              <div className="flex justify-between items-center">
                <label htmlFor="issue-title" className="font-label text-label-lg">
                  Issue Title *
                </label>
                <span className={`font-mono text-mono-sm text-xs ${title.length > 120 ? 'text-light-error font-bold' : 'text-light-on-surface-variant dark:text-dark-on-surface-variant'}`}>
                  {title.length}/120
                </span>
              </div>
              <input
                id="issue-title"
                type="text"
                required
                maxLength={130}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Beam deflection observed in loading bay ceiling"
                className="w-full min-h-[44px] px-gutter-md py-gutter-sm rounded bg-light-surface-container-lowest dark:bg-dark-surface-container text-light-on-surface dark:text-dark-on-surface border border-light-outline-variant dark:border-dark-outline-variant font-body text-base focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-gutter-xs">
              <label htmlFor="issue-level" className="font-label text-label-lg">
                Building Level *
              </label>
              <select
                id="issue-level"
                value={level}
                onChange={(e) => {
                  setLevel(e.target.value);
                  const stillValid = spaces.some((s) => s.id === spaceId && s.level === e.target.value);
                  if (!stillValid) setSpaceId('');
                }}
                className="w-full min-h-[44px] px-gutter-md py-gutter-sm rounded bg-light-surface-container-lowest dark:bg-dark-surface-container text-light-on-surface dark:text-dark-on-surface border border-light-outline-variant dark:border-dark-outline-variant font-body text-base focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
              >
                {levels.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-gutter-xs">
              <label htmlFor="issue-space" className="font-label text-label-lg">
                Associated Space (Optional)
              </label>
              <select
                id="issue-space"
                value={spaceId}
                onChange={(e) => setSpaceId(e.target.value)}
                className="w-full min-h-[44px] px-gutter-md py-gutter-sm rounded bg-light-surface-container-lowest dark:bg-dark-surface-container text-light-on-surface dark:text-dark-on-surface border border-light-outline-variant dark:border-dark-outline-variant font-body text-base focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
              >
                <option value="">General Project Area</option>
                {spacesForLevel.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.use})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-gutter-sm mt-gutter-md pt-gutter-md border-t border-light-outline-variant dark:border-dark-outline-variant">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] px-gutter-lg py-gutter-sm rounded bg-light-surface-container-low dark:bg-dark-surface-container text-light-on-surface dark:text-dark-on-surface border border-light-outline-variant dark:border-dark-outline-variant font-label text-label-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="min-h-[44px] px-gutter-lg py-gutter-sm rounded bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-label text-label-lg hover:bg-light-primary-container dark:hover:bg-dark-primary-container transition-colors"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Issue'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
