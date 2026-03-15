import { useState, useEffect } from 'react';

type Status = 'checking' | 'online' | 'offline';

export function useBackendStatus(): Status {
  const [status, setStatus] = useState<Status>('checking');

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const res = await fetch('http://localhost:3001/health', { signal: AbortSignal.timeout(2000) });
        if (!cancelled) setStatus(res.ok ? 'online' : 'offline');
      } catch {
        if (!cancelled) setStatus('offline');
      }
    }

    check();
    const interval = setInterval(check, 5000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  return status;
}
