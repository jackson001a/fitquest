import React from 'react';
import { useUser } from '../context/UserContext';
import AchievementUnlockModal from './AchievementUnlockModal';
import LevelUpModal from './LevelUpModal';

// Orquestra os popups de "conquista desbloqueada" e "subiu de nível" a partir
// da fila unificada do UserContext — nunca mais de um por vez. Sem isso, duas
// comemorações que aconteciam juntas (ex: treino que desbloqueia conquista E
// sobe de nível) disputavam a tela como dois <Modal> nativos simultâneos, e só
// uma (às vezes nenhuma visualmente, só o som) realmente aparecia.
//
// Também respeita `celebrationsPaused`: telas com seu próprio modal de
// resultado (resumo do treino, comemoração de check-in) pausam a fila
// enquanto o modal delas estiver aberto, e essa fila só desfila depois.
export default function CelebrationOverlay() {
  const { celebrationQueue, advanceCelebration, celebrationsPaused } = useUser();
  const current = !celebrationsPaused ? celebrationQueue?.[0] : null;

  return (
    <>
      <AchievementUnlockModal
        achievement={current?.kind === 'achievement' ? current.achievement : null}
        onDismiss={advanceCelebration}
      />
      <LevelUpModal
        level={current?.kind === 'levelup' ? current.level : null}
        onDismiss={advanceCelebration}
      />
    </>
  );
}
