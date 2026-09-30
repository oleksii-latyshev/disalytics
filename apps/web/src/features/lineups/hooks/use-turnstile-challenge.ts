import { useEffect, useRef, useState } from 'react';
import { loadTurnstile, uploadSiteKey } from '../helpers/upload-image';

export function useTurnstileChallenge(enabled: boolean) {
  const [siteKey, setSiteKey] = useState<string | null | undefined>();
  const [challengeToken, setChallengeToken] = useState('');
  const challengeRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    setSiteKey(undefined);
    void uploadSiteKey().then((key) => {
      if (active) setSiteKey(key);
    });
    return () => {
      active = false;
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !siteKey || !challengeRef.current) return;
    let active = true;
    let widget: string | null = null;
    void loadTurnstile()
      .then((turnstile) => {
        if (!active || !challengeRef.current) return;
        try {
          widget = turnstile.render(challengeRef.current, {
            sitekey: siteKey,
            callback: setChallengeToken,
            'expired-callback': () => setChallengeToken(''),
            'error-callback': () => {
              setChallengeToken('');
              if (active) setSiteKey(null);
            },
          });
          widgetRef.current = widget;
        } catch {
          if (active) setSiteKey(null);
        }
      })
      .catch(() => {
        if (active) setSiteKey(null);
      });
    return () => {
      active = false;
      if (widget && window.turnstile) {
        try {
          window.turnstile.remove(widget);
        } catch {}
      }
      widgetRef.current = null;
    };
  }, [enabled, siteKey]);

  return { siteKey, challengeToken, challengeRef, widgetRef, setChallengeToken };
}
