import { useEffect, useState } from 'react';
import { InteractionManager } from 'react-native';

/**
 * Returns `true` once the current navigation/animation interaction finishes.
 * Use to gate non-critical work (secondary queries, heavy computations) so
 * the JS thread is free for the first paint after a screen mount.
 */
export function useDeferredReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const handle = InteractionManager.runAfterInteractions(() => setReady(true));
    return () => handle.cancel();
  }, []);
  return ready;
}
