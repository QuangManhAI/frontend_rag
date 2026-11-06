import { useEffect, useState } from 'react';

const MOBILE_QUERY = '(max-width: 767px)';

export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(() => globalThis.matchMedia?.(MOBILE_QUERY).matches ?? false);
  useEffect(() => {
    const mq = globalThis.matchMedia?.(MOBILE_QUERY);
    if (!mq) return;
    const on = () => setMobile(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return mobile;
}
