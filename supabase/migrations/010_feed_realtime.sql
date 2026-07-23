-- ─── Habilita Realtime no feed social ────────────────────────────────────────
-- Sem isso, o app só via novos posts ao recarregar a tela (fechar/abrir de novo).
ALTER PUBLICATION supabase_realtime ADD TABLE public.feed_posts;
