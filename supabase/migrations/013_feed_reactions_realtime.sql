-- ─── Habilita Realtime nas reações do feed ───────────────────────────────────
-- Sem isso, quando outro usuário reage a um post, quem já está com o feed aberto
-- só via a contagem atualizada recarregando a tela manualmente.
ALTER PUBLICATION supabase_realtime ADD TABLE public.feed_reactions;
