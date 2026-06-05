import { useEffect, useRef, useState, useCallback } from 'react';
import { applicationsApi } from '../lib/api/applications.api';

export function useAutoSave(
  draftId: string | null,
  editToken?: string | null,
  onInvalidDraft?: () => void,
) {
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const triggerSave = useCallback((data: any) => {
    // Without a draft id AND token we can't authorize a save — skip rather than
    // firing a request that would 401.
    if (!draftId || !editToken) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        await applicationsApi.updateDraft(draftId, data, editToken);
        setSaveStatus('saved');
        setLastSavedAt(new Date());
        setTimeout(() => setSaveStatus('idle'), 3000);
      } catch (error: any) {
        console.error('Failed to auto-save:', error);
        setSaveStatus('error');
        // Stale/unauthorized draft → let the owner forget it so the next step
        // creates a fresh one instead of looping on a dead draft.
        if (error?.response?.status === 401 || error?.response?.status === 404) {
          onInvalidDraft?.();
        }
      }
    }, 30000); // 30 seconds of inactivity
  }, [draftId, editToken, onInvalidDraft]);

  const cancelSave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  useEffect(() => {
    return () => {
      cancelSave();
    };
  }, [cancelSave]);

  return { saveStatus, triggerSave, setSaveStatus, cancelSave, lastSavedAt, setLastSavedAt };
}
