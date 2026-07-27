// ═══════════════════════════════════════════════════════════════════════════
// CapiFit — Edge Function: moderate-image
// Recebe uma foto em base64 e verifica com o Google Cloud Vision (SafeSearch
// Detection) se ela contém conteúdo adulto, violento ou gráfico — exigência
// da Apple Guideline 1.2 (moderação de conteúdo gerado por usuário).
// ═══════════════════════════════════════════════════════════════════════════

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
  'Content-Type': 'application/json',
};

// Escala oficial do SafeSearch: quanto mais alto, mais provável o conteúdo problemático
const LEVELS: Record<string, number> = {
  UNKNOWN: 0, VERY_UNLIKELY: 1, UNLIKELY: 2, POSSIBLE: 3, LIKELY: 4, VERY_LIKELY: 5,
};

// Bloqueia a partir de LIKELY — POSSIBLE é comum demais em fotos inofensivas
// (roupa de academia, praia, etc.) e geraria falsos positivos excessivos.
const BLOCK_THRESHOLD = LEVELS.LIKELY;

const REJECT_MESSAGE = 'Essa imagem contém conteúdo impróprio (adulto, violento ou gráfico) e não pode ser usada.';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ approved: false, reason: 'Imagem inválida.' }),
        { status: 400, headers: CORS }
      );
    }

    const apiKey = Deno.env.get('GOOGLE_VISION_API_KEY');
    if (!apiKey) {
      console.error('moderate-image: GOOGLE_VISION_API_KEY não configurada');
      // Sem a chave configurada não dá pra moderar — não trava o usuário por
      // um problema de infraestrutura nosso, só loga pra investigar depois.
      return new Response(JSON.stringify({ approved: true }), { headers: CORS });
    }

    const visionResp = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image:    { content: imageBase64 },
            features: [{ type: 'SAFE_SEARCH_DETECTION' }],
          }],
        }),
      }
    );

    const data = await visionResp.json();
    const safe = data?.responses?.[0]?.safeSearchAnnotation;
    const apiError = data?.responses?.[0]?.error ?? data?.error;

    if (apiError) {
      console.error('moderate-image: erro da Vision API:', JSON.stringify(apiError));
      return new Response(JSON.stringify({ approved: true }), { headers: CORS });
    }

    if (!safe) {
      return new Response(JSON.stringify({ approved: true }), { headers: CORS });
    }

    // 'medical' e 'spoof' não são alvo da Guideline 1.2 — não bloqueiam
    const flagged = ['adult', 'violence', 'racy'].filter(
      (category) => (LEVELS[safe[category]] ?? 0) >= BLOCK_THRESHOLD
    );

    if (flagged.length > 0) {
      return new Response(
        JSON.stringify({ approved: false, reason: REJECT_MESSAGE, flagged }),
        { headers: CORS }
      );
    }

    return new Response(JSON.stringify({ approved: true }), { headers: CORS });

  } catch (err) {
    console.error('moderate-image error:', err);
    // Falha de rede/infra não deve travar o usuário — aprova e loga o erro
    return new Response(JSON.stringify({ approved: true, error: String(err) }), { headers: CORS });
  }
});
