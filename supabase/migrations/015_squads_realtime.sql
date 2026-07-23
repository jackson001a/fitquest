-- ─── Habilita Realtime nos grupos/duplas/duelos ──────────────────────────────
-- Sem isso, criar ou excluir um grupo/dupla no Ranking só refletia na Home
-- depois de fechar e reabrir o app (a Home só buscava esses dados uma vez).
ALTER PUBLICATION supabase_realtime ADD TABLE public.squads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.squad_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rivalries;
