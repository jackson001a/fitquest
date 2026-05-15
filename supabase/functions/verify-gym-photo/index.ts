// ═══════════════════════════════════════════════════════════════════════════
// CapiFit — Edge Function: verify-gym-photo
// Recebe uma foto em base64 e verifica com Claude Vision se é uma academia.
// ═══════════════════════════════════════════════════════════════════════════

import Anthropic from 'npm:@anthropic-ai/sdk@0.27.3';

const client = new Anthropic({
  apiKey: Deno.env.get('ANTHROPIC_API_KEY')!,
});

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
  'Content-Type': 'application/json',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  try {
    const { imageBase64, mimeType = 'image/jpeg' } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'imageBase64 obrigatório' }),
        { status: 400, headers: CORS }
      );
    }

    const response = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 150,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type:       'base64',
              media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/webp',
              data:       imageBase64,
            },
          },
          {
            type: 'text',
            text: `Você é um verificador de check-in para um aplicativo de academia chamado CapiFit.
Analise a foto e determine se ela foi tirada DENTRO de uma academia de ginástica.

Considere uma academia válida: salas com equipamentos de musculação, barras, anilhas, halteres, esteiras, bicicletas ergométricas, aparelhos de ginástica, tatames de luta, piscinas de academia, vestiários de academia, ou qualquer ambiente claramente identificado como academia/fitness center.

NÃO considere academia: ruas, parques, casas, escritórios, restaurantes, etc.

Responda APENAS em JSON válido, sem markdown, sem explicação extra:
{"isGym": true, "confidence": 95, "message": "Academia confirmada! Pode fazer o check-in 💪"}
ou
{"isGym": false, "confidence": 90, "message": "Não identificamos uma academia nessa foto. Tire a foto dentro da academia para confirmar sua presença!"}`,
          },
        ],
      }],
    });

    const raw  = response.content[0].type === 'text' ? response.content[0].text : '';
    const json = raw.match(/\{[\s\S]*\}/)?.[0] ?? '{}';
    const result = JSON.parse(json);

    // Segurança: garante campos obrigatórios
    return new Response(
      JSON.stringify({
        isGym:      result.isGym      ?? false,
        confidence: result.confidence ?? 0,
        message:    result.message    ?? (result.isGym
          ? 'Academia confirmada! 💪'
          : 'Não identificamos uma academia. Tente novamente de dentro da academia.'),
      }),
      { headers: CORS }
    );

  } catch (err) {
    console.error('verify-gym-photo error:', err);
    return new Response(
      JSON.stringify({
        isGym:   false,
        message: 'Não foi possível verificar a foto. Tente novamente.',
        error:   String(err),
      }),
      { status: 500, headers: CORS }
    );
  }
});