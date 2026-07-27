import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase';

// ─── Modera uma imagem (base64) antes de aceitar upload — exigência Apple
// Guideline 1.2. Em caso de falha de rede/infra, aprova por padrão: um
// problema na nossa moderação não deve impedir o usuário de trocar de foto.
export async function moderateImage(base64) {
  try {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/moderate-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify({ imageBase64: base64 }),
    });
    const data = await resp.json();
    return { approved: data.approved ?? true, reason: data.reason ?? null };
  } catch (e) {
    console.warn('[moderateImage] falha ao verificar imagem:', e.message);
    return { approved: true, reason: null };
  }
}
