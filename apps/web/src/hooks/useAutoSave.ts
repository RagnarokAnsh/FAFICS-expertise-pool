import { useEffect, useRef, useState, useCallback } from 'react';
import { applicationsApi } from '../lib/api/applications.api';

export function useAutoSave(draftId: string | null) {
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const timeoutRef = useRef<NodeJS.Timeout>();

  const triggerSave = useCallback((data: any) => {
    if (!draftId) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        await applicationsApi.updateDraft(draftId, data);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 3000);
      } catch (error) {
        console.error('Failed to auto-save:', error);
        setSaveStatus('error');
      }
    }, 30000); // 30 seconds of inactivity
  }, [draftId]);

  const cancelSave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  useEffect(() => {
    return () => {
      cancelSave();
    };
  }, []);

  return { saveStatus, triggerSave, setSaveStatus, cancelSave };
}
