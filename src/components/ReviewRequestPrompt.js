import { useEffect, useRef } from 'react';
import * as StoreReview from 'expo-store-review';
import { useUser } from '../context/UserContext';

// Não renderiza nada visível — o próprio StoreReview.requestReview() já
// mostra o prompt nativo do sistema (iOS/Android decidem se exibem ou não).
// Entra na fila de comemorações como qualquer outro popup (conquista, level
// up), então nunca aparece simultâneo a eles nem ao paywall.
export default function ReviewRequestPrompt({ active, onDismiss }) {
  const { markReviewRequested } = useUser();
  const firedRef = useRef(false);

  useEffect(() => {
    if (!active || firedRef.current) return;
    firedRef.current = true;
    (async () => {
      // isAvailableAsync() falha (simulador) e hasAction() falha quando a
      // Apple já bateu o limite de 3 exibições por 365 dias — em ambos os
      // casos requestReview() não mostra nada. Só marcamos has_requested_review
      // quando o popup nativo realmente teve chance de aparecer; senão o
      // usuário perderia a única tentativa sem nunca ter visto o prompt.
      try {
        const available = await StoreReview.isAvailableAsync();
        const actionable = available && await StoreReview.hasAction();
        if (actionable) {
          await StoreReview.requestReview();
          await markReviewRequested();
        }
      } catch (e) { console.warn('[ReviewRequestPrompt] falha ao pedir avaliação:', e.message); }
      onDismiss();
    })();
  }, [active]);

  useEffect(() => {
    if (!active) firedRef.current = false;
  }, [active]);

  return null;
}
