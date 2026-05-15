import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// ─── COLE AQUI AS CREDENCIAIS DO SEU PROJETO FIREBASE ────────────────────────
// Firebase Console → Configurações do projeto → Seus apps → Web app
const firebaseConfig = {
  apiKey:            'COLE_AQUI',
  authDomain:        'COLE_AQUI',
  projectId:         'COLE_AQUI',
  storageBucket:     'COLE_AQUI',
  messagingSenderId: 'COLE_AQUI',
  appId:             'COLE_AQUI',
};
// ─────────────────────────────────────────────────────────────────────────────

const app  = initializeApp(firebaseConfig);
export const db   = getFirestore(app);
export const auth = getAuth(app);
export default app;
