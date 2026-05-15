import { useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';

// Detecta quando o app volta do background para o foreground.
// Chama onForeground() toda vez que isso acontece.
export function useAppState(onForeground) {
  const stateRef     = useRef(AppState.currentState);
  const callbackRef  = useRef(onForeground);

  useEffect(() => {
    callbackRef.current = onForeground;
  }, [onForeground]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => {
      const wasBackground = stateRef.current.match(/inactive|background/);
      const isActive      = nextState === 'active';

      if (wasBackground && isActive) {
        callbackRef.current?.();
      }

      stateRef.current = nextState;
    });

    return () => sub.remove();
  }, []);
}
