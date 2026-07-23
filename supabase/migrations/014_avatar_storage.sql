-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 014: Foto de perfil visível para outros usuários
--
-- Antes, a foto ficava só em AsyncStorage local (nunca saía do aparelho de quem
-- tirou a foto). Agora ela é enviada para um bucket público do Supabase Storage
-- e a URL é salva em users.avatar_url, para aparecer no ranking, feed, amigos,
-- grupos e duelos de qualquer pessoa.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Bucket público de avatares (leitura pública, escrita restrita ao dono)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "avatars: public read"    ON storage.objects;
DROP POLICY IF EXISTS "avatars: owner insert"   ON storage.objects;
DROP POLICY IF EXISTS "avatars: owner update"   ON storage.objects;
DROP POLICY IF EXISTS "avatars: owner delete"   ON storage.objects;

-- Qualquer pessoa (mesmo anônima) pode LER — precisa aparecer pra todo mundo
CREATE POLICY "avatars: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Só pode enviar dentro da própria pasta: avatars/{auth.uid()}/...
CREATE POLICY "avatars: owner insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatars: owner update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatars: owner delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
