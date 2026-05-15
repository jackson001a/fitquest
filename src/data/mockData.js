export const userData = {
  name: 'Lucas',
  level: 14,
  xp: 3420,
  nextLevelXp: 4000,
  streak: 23,
  longestStreak: 47,
  totalWorkouts: 89,
  weekWorkouts: 3,
  totalHours: 134,
  todayXP: 120,
  dailyGoal: 200,
  league: 'Ouro',
  leagueEmoji: '🥇',
  rank: 4,
  coins: 850,
  gems: 12,
  // Seg, Ter, Qua, Qui, Sex, Sab, Dom — dias que treinou essa semana
  weekTrainingDays: [true, true, false, true, false, false, false],
  streakGoal: 30,
  goalType: 'emagrecer', // 'emagrecer' | 'engordar' | 'manter'
  startWeight: 88,
  currentWeight: 82,
  targetWeight: 75,
};

// ─── Pool de missões diárias — rotaciona a cada dia às 00:00 ─────────────────
const ALL_DAILY_CHALLENGES = [
  { emoji: '🏋️', title: 'Complete um treino',         description: 'Qualquer treino conta!',          xp: 50 },
  { emoji: '💧', title: 'Beba sua meta de água',       description: 'Hidratação é essencial',          xp: 25 },
  { emoji: '🚶', title: '10 min de caminhada',         description: 'Pode ser qualquer hora',          xp: 30 },
  { emoji: '🧘', title: '10 min de alongamento',       description: 'Recuperação é parte do treino!',  xp: 25 },
  { emoji: '🏃', title: '20 min de cardio',            description: 'Coração forte, corpo forte!',     xp: 40 },
  { emoji: '📍', title: 'Faça check-in na academia',   description: 'Prove que você foi!',             xp: 35 },
  { emoji: '⚖️', title: 'Registre seu peso',           description: 'Acompanhe sua evolução',          xp: 15 },
  { emoji: '🥩', title: 'Bata sua meta de proteína',   description: 'Alimente os músculos!',           xp: 25 },
  { emoji: '😴', title: 'Durma 7+ horas',              description: 'Sono = recuperação = crescimento', xp: 20 },
  { emoji: '💪', title: 'Faça 2 exercícios de força',  description: 'Supino, agachamento, qualquer!',  xp: 45 },
  { emoji: '🤸', title: '15 min de mobilidade',        description: 'Se mova, seja flexível!',         xp: 25 },
  { emoji: '🧴', title: 'Use protetor solar',          description: 'Cuidado com a saúde total',       xp: 10 },
  { emoji: '🥗', title: 'Coma 5 porções de vegetais',  description: 'Nutrição é metade do resultado',  xp: 20 },
  { emoji: '🧗', title: 'Suba 5 lances de escada',    description: 'Pequenas escolhas, grande diferença', xp: 15 },
  { emoji: '🏊', title: '20 min de natação ou bike',   description: 'Cardio alternativo conta!',       xp: 40 },
];

export function getDailyChallenges() {
  const now   = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const day   = Math.floor((now - start) / 86400000); // dia do ano
  const pool  = ALL_DAILY_CHALLENGES;
  return [
    { ...pool[day % pool.length],           id: 1, completed: false },
    { ...pool[(day + 5) % pool.length],     id: 2, completed: false },
    { ...pool[(day + 11) % pool.length],    id: 3, completed: false },
  ];
}

export const dailyChallenges = getDailyChallenges();

// ─── Pool de chefes semanais ──────────────────────────────────────────────────
const ALL_BOSSES = [
  { emoji: '🦁', name: 'O Leão de Ferro',      description: 'Complete 5 treinos esta semana!',       total: 5, reward: 500 },
  { emoji: '🐻', name: 'O Urso das Montanhas',  description: 'Faça 4 treinos de força!',              total: 4, reward: 400 },
  { emoji: '🦅', name: 'A Águia da Força',      description: 'Complete 5 treinos em dias diferentes!', total: 5, reward: 450 },
  { emoji: '🐯', name: 'O Tigre Sombrio',       description: 'Complete 6 treinos esta semana!',       total: 6, reward: 600 },
  { emoji: '🦈', name: 'O Tubarão Atlético',    description: 'Faça 5 treinos de cardio!',             total: 5, reward: 500 },
  { emoji: '🦏', name: 'O Rinoceronte',         description: 'Complete 7 treinos esta semana!',       total: 7, reward: 700 },
  { emoji: '🦊', name: 'A Raposa Veloz',        description: 'Faça 3 treinos em 3 dias seguidos!',   total: 3, reward: 350 },
  { emoji: '🐍', name: 'A Serpente Ágil',       description: 'Complete 4 treinos de mobilidade!',    total: 4, reward: 380 },
];

export function getBossOfWeek() {
  const weekNum = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
  const boss    = ALL_BOSSES[weekNum % ALL_BOSSES.length];
  const now     = new Date();
  const dayOfWeek = now.getDay();
  const daysLeft  = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  return {
    ...boss,
    current:  0, // sempre começa do contexto do usuário
    timeLeft: `${daysLeft} dia${daysLeft > 1 ? 's' : ''}`,
  };
}

export const bossData = getBossOfWeek();

// ─── Pool de desafios semanais de treino ──────────────────────────────────────
const ALL_WEEKLY_CHALLENGES = [
  { id: 'wc1', name: 'Força Total',       emoji: '🏋️', gradient: ['#7C3AED','#4C1D95'], xp: 200, description: 'Complete um treino de força de mais de 45min', targetWorkoutCategory: 'Parte Superior', difficulty: 'DIFÍCIL' },
  { id: 'wc2', name: 'Cardio Extremo',    emoji: '🔥', gradient: ['#EF4444','#991B1B'], xp: 180, description: 'Complete um treino de cardio ou full body', targetWorkoutCategory: 'Cardio',        difficulty: 'MÉDIO' },
  { id: 'wc3', name: 'Pernas de Aço',    emoji: '🦵', gradient: ['#2563EB','#1E40AF'], xp: 220, description: 'Complete um treino de pernas ou glúteos', targetWorkoutCategory: 'Parte Inferior', difficulty: 'DIFÍCIL' },
  { id: 'wc4', name: 'Core de Guerreiro',emoji: '⚔️', gradient: ['#059669','#047857'], xp: 160, description: 'Complete um treino de core ou funcional',  targetWorkoutCategory: 'Core',          difficulty: 'MÉDIO' },
  { id: 'wc5', name: 'Full Body Épico',  emoji: '⚡', gradient: ['#F59E0B','#D97706'], xp: 250, description: 'Complete um treino full body completo',    targetWorkoutCategory: 'Full Body',     difficulty: 'DIFÍCIL' },
  { id: 'wc6', name: 'PPL Power',        emoji: '💪', gradient: ['#8B5CF6','#7C3AED'], xp: 190, description: 'Complete qualquer treino do programa PPL',  targetWorkoutCategory: 'PPL',           difficulty: 'MÉDIO' },
  { id: 'wc7', name: 'Hiit Explosivo',   emoji: '💥', gradient: ['#EC4899','#BE185D'], xp: 210, description: 'Complete um treino HIIT ou funcional',     targetWorkoutCategory: 'Funcional',     difficulty: 'DIFÍCIL' },
  { id: 'wc8', name: 'Mobilidade Total', emoji: '🧘', gradient: ['#06B6D4','#0284C7'], xp: 140, description: 'Complete um treino de mobilidade ou recuperação', targetWorkoutCategory: 'Mobilidade', difficulty: 'FÁCIL' },
];

export function getWeeklyWorkoutChallenge() {
  const weekNum = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
  const challenge = ALL_WEEKLY_CHALLENGES[weekNum % ALL_WEEKLY_CHALLENGES.length];
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysLeft  = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  return { ...challenge, weekNum, daysLeft };
}

export const recommendedWorkouts = [
  {
    id: 1,
    name: 'Peito & Tríceps',
    emoji: '💪',
    duration: 45,
    xp: 120,
    difficulty: 'MÉDIO',
    difficultyColor: '#F59E0B',
    gradient: ['#6D28D9', '#4C1D95'],
    category: 'Parte Superior',
    muscles: ['Peito', 'Tríceps', 'Ombro'],
    calories: 280,
    exercises: [
      { name: 'Supino Reto', sets: 4, reps: '12, 10, 8, 8', rest: '90s' },
      { name: 'Supino Inclinado', sets: 3, reps: '12, 10, 8', rest: '90s' },
      { name: 'Crossover', sets: 3, reps: '15, 12, 10', rest: '60s' },
      { name: 'Tríceps Pulley', sets: 4, reps: '15, 12, 10, 10', rest: '60s' },
      { name: 'Tríceps Testa', sets: 3, reps: '12, 10, 8', rest: '60s' },
      { name: 'Mergulho', sets: 3, reps: 'Até falha', rest: '90s' },
    ],
  },
  {
    id: 2,
    name: 'HIIT Explosivo',
    emoji: '⚡',
    duration: 25,
    xp: 90,
    difficulty: 'DIFÍCIL',
    difficultyColor: '#EF4444',
    gradient: ['#DC2626', '#991B1B'],
    category: 'Cardio',
    muscles: ['Full Body', 'Cardio'],
    calories: 350,
    exercises: [
      { name: 'Burpee', sets: 4, reps: '10 reps', rest: '30s' },
      { name: 'Mountain Climber', sets: 4, reps: '30s', rest: '15s' },
      { name: 'Jump Squat', sets: 4, reps: '15 reps', rest: '30s' },
      { name: 'High Knees', sets: 4, reps: '30s', rest: '15s' },
      { name: 'Box Jump', sets: 3, reps: '10 reps', rest: '45s' },
    ],
  },
  {
    id: 3,
    name: 'Core Destruidor',
    emoji: '🔥',
    duration: 30,
    xp: 80,
    difficulty: 'MÉDIO',
    difficultyColor: '#F59E0B',
    gradient: ['#F97316', '#C2410C'],
    category: 'Core',
    muscles: ['Abdômen', 'Oblíquos', 'Lombar'],
    calories: 180,
    exercises: [
      { name: 'Prancha', sets: 4, reps: '45s', rest: '30s' },
      { name: 'Crunch Bicicleta', sets: 3, reps: '20 reps', rest: '45s' },
      { name: 'Russian Twist', sets: 3, reps: '20 reps', rest: '45s' },
      { name: 'Leg Raise', sets: 3, reps: '15 reps', rest: '45s' },
      { name: 'Prancha Lateral', sets: 3, reps: '30s cada', rest: '30s' },
    ],
  },
  {
    id: 4,
    name: 'Pernas & Glúteos',
    emoji: '🦵',
    duration: 55,
    xp: 150,
    difficulty: 'DIFÍCIL',
    difficultyColor: '#EF4444',
    gradient: ['#059669', '#065F46'],
    category: 'Parte Inferior',
    muscles: ['Quadríceps', 'Glúteos', 'Isquiotibiais'],
    calories: 420,
    exercises: [
      { name: 'Agachamento', sets: 5, reps: '12, 10, 8, 6, 6', rest: '120s' },
      { name: 'Leg Press', sets: 4, reps: '15, 12, 10, 8', rest: '90s' },
      { name: 'Cadeira Extensora', sets: 3, reps: '15, 12, 10', rest: '60s' },
      { name: 'Agachamento Sumô', sets: 3, reps: '15, 12, 10', rest: '60s' },
      { name: 'Stiff', sets: 3, reps: '12, 10, 8', rest: '90s' },
      { name: 'Panturrilha', sets: 4, reps: '20 reps', rest: '45s' },
    ],
  },
];

export const allWorkouts = [
  ...recommendedWorkouts,
  {
    id: 5,
    name: 'Costas & Bíceps',
    emoji: '🏊',
    duration: 50,
    xp: 130,
    difficulty: 'MÉDIO',
    difficultyColor: '#F59E0B',
    gradient: ['#2563EB', '#1E40AF'],
    category: 'Parte Superior',
    muscles: ['Costas', 'Bíceps', 'Trapézio'],
    calories: 300,
    exercises: [
      { name: 'Puxada Frontal', sets: 4, reps: '12, 10, 8, 8', rest: '90s' },
      { name: 'Remada Curvada', sets: 4, reps: '12, 10, 8, 8', rest: '90s' },
      { name: 'Remada Unilateral', sets: 3, reps: '12, 10, 8', rest: '60s' },
      { name: 'Rosca Direta', sets: 3, reps: '12, 10, 8', rest: '60s' },
      { name: 'Rosca Martelo', sets: 3, reps: '12, 10, 8', rest: '60s' },
    ],
  },
  {
    id: 6,
    name: 'Ombros Completo',
    emoji: '🎯',
    duration: 40,
    xp: 100,
    difficulty: 'MÉDIO',
    difficultyColor: '#F59E0B',
    gradient: ['#7C3AED', '#5B21B6'],
    category: 'Parte Superior',
    muscles: ['Ombros', 'Trapézio'],
    calories: 220,
    exercises: [
      { name: 'Desenvolvimento', sets: 4, reps: '12, 10, 8, 8', rest: '90s' },
      { name: 'Elevação Lateral', sets: 4, reps: '15, 12, 10, 10', rest: '60s' },
      { name: 'Elevação Frontal', sets: 3, reps: '15, 12, 10', rest: '60s' },
      { name: 'Face Pull', sets: 3, reps: '15 reps', rest: '60s' },
    ],
  },
  {
    id: 7,
    name: 'Treino Iniciante',
    emoji: '⭐',
    duration: 30,
    xp: 60,
    difficulty: 'FÁCIL',
    difficultyColor: '#10B981',
    gradient: ['#10B981', '#047857'],
    category: 'Full Body',
    muscles: ['Full Body'],
    calories: 150,
    exercises: [
      { name: 'Flexão', sets: 3, reps: '10 reps', rest: '60s' },
      { name: 'Agachamento', sets: 3, reps: '15 reps', rest: '60s' },
      { name: 'Prancha', sets: 3, reps: '30s', rest: '45s' },
      { name: 'Polichinelo', sets: 3, reps: '30s', rest: '30s' },
    ],
  },
  {
    id: 8,
    name: 'Corrida Intervalada',
    emoji: '🏃',
    duration: 35,
    xp: 85,
    difficulty: 'MÉDIO',
    difficultyColor: '#F59E0B',
    gradient: ['#EC4899', '#BE185D'],
    category: 'Cardio',
    muscles: ['Cardio', 'Pernas'],
    calories: 400,
    exercises: [
      { name: 'Aquecimento', sets: 1, reps: '5 min leve', rest: '—' },
      { name: 'Sprint 80%', sets: 6, reps: '30s', rest: '90s' },
      { name: 'Corrida moderada', sets: 4, reps: '2 min', rest: '1 min' },
      { name: 'Desaquecimento', sets: 1, reps: '5 min leve', rest: '—' },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // TREINOS EXTRAS — PPL, Iniciante, Avançado, Funcional, Mobilidade
  // ══════════════════════════════════════════════════════════════════════════

  // ── PPL: PUSH (Peito + Ombro + Tríceps) ──────────────────────────────────
  {
    id: 9, name: 'PPL — Empurrar A', emoji: '🚀', duration: 50, xp: 120,
    difficulty: 'MÉDIO', difficultyColor: '#F59E0B',
    gradient: ['#7C3AED','#5B21B6'],
    category: 'PPL', muscles: ['Peito', 'Ombro', 'Tríceps'], calories: 310,
    exercises: [
      { name: 'Supino Reto',          sets: 4, reps: '12, 10, 8, 6',    rest: '90s' },
      { name: 'Supino Inclinado',     sets: 3, reps: '12, 10, 8',       rest: '90s' },
      { name: 'Desenvolvimento',      sets: 3, reps: '12, 10, 8',       rest: '90s' },
      { name: 'Elevação Lateral',     sets: 4, reps: '15, 15, 12, 12',  rest: '60s' },
      { name: 'Tríceps Pulley',       sets: 3, reps: '15, 12, 10',      rest: '60s' },
      { name: 'Tríceps Testa',        sets: 3, reps: '12, 10, 8',       rest: '60s' },
    ],
  },
  // ── PPL: PULL (Costas + Bíceps) ───────────────────────────────────────────
  {
    id: 10, name: 'PPL — Puxar A', emoji: '🦅', duration: 50, xp: 120,
    difficulty: 'MÉDIO', difficultyColor: '#F59E0B',
    gradient: ['#1D4ED8','#1E40AF'],
    category: 'PPL', muscles: ['Costas', 'Bíceps', 'Trapézio'], calories: 290,
    exercises: [
      { name: 'Puxada Frontal',       sets: 4, reps: '12, 10, 8, 8',   rest: '90s' },
      { name: 'Remada Curvada',       sets: 4, reps: '12, 10, 8, 8',   rest: '90s' },
      { name: 'Remada Unilateral',    sets: 3, reps: '12, 10, 10',      rest: '60s' },
      { name: 'Face Pull',            sets: 3, reps: '15, 15, 15',      rest: '60s' },
      { name: 'Rosca Direta',         sets: 3, reps: '12, 10, 8',       rest: '60s' },
      { name: 'Rosca Martelo',        sets: 3, reps: '12, 10, 10',      rest: '60s' },
    ],
  },
  // ── PPL: LEGS A ───────────────────────────────────────────────────────────
  {
    id: 11, name: 'PPL — Pernas A', emoji: '🦵', duration: 60, xp: 150,
    difficulty: 'DIFÍCIL', difficultyColor: '#EF4444',
    gradient: ['#059669','#065F46'],
    category: 'PPL', muscles: ['Quadríceps', 'Posterior', 'Glúteos'], calories: 450,
    exercises: [
      { name: 'Agachamento',          sets: 5, reps: '10, 8, 6, 5, 5',  rest: '120s' },
      { name: 'Leg Press',            sets: 4, reps: '15, 12, 10, 8',   rest: '90s'  },
      { name: 'Stiff',                sets: 3, reps: '12, 10, 8',        rest: '90s'  },
      { name: 'Cadeira Extensora',    sets: 3, reps: '15, 12, 12',       rest: '60s'  },
      { name: 'Mesa Flexora',         sets: 3, reps: '15, 12, 12',       rest: '60s'  },
      { name: 'Panturrilha',          sets: 4, reps: '20, 20, 15, 15',   rest: '45s'  },
    ],
  },

  // ── INICIANTE ─────────────────────────────────────────────────────────────
  {
    id: 12, name: 'Iniciante: Upper Body', emoji: '⭐', duration: 35, xp: 65,
    difficulty: 'FÁCIL', difficultyColor: '#10B981',
    gradient: ['#047857','#065F46'],
    category: 'Iniciante', muscles: ['Peito', 'Costas', 'Ombro'], calories: 170,
    exercises: [
      { name: 'Flexão',               sets: 3, reps: '10 reps',          rest: '60s' },
      { name: 'Remada Sentado',       sets: 3, reps: '12 reps',          rest: '60s' },
      { name: 'Elevação Lateral',     sets: 3, reps: '12 reps',          rest: '60s' },
      { name: 'Rosca Martelo',        sets: 3, reps: '12 reps',          rest: '60s' },
      { name: 'Tríceps Coice',        sets: 3, reps: '12 reps',          rest: '60s' },
    ],
  },
  {
    id: 13, name: 'Iniciante: Lower Body', emoji: '🌱', duration: 35, xp: 65,
    difficulty: 'FÁCIL', difficultyColor: '#10B981',
    gradient: ['#065F46','#064E3B'],
    category: 'Iniciante', muscles: ['Pernas', 'Glúteos', 'Core'], calories: 180,
    exercises: [
      { name: 'Agachamento',          sets: 3, reps: '15 reps',          rest: '60s' },
      { name: 'Afundo com Halteres',  sets: 3, reps: '10 cada',          rest: '60s' },
      { name: 'Hip Thrust',           sets: 3, reps: '15 reps',          rest: '60s' },
      { name: 'Panturrilha',          sets: 3, reps: '20 reps',          rest: '45s' },
      { name: 'Prancha',              sets: 3, reps: '30s',              rest: '45s' },
    ],
  },
  {
    id: 14, name: 'Iniciante: Full Body', emoji: '🌟', duration: 40, xp: 70,
    difficulty: 'FÁCIL', difficultyColor: '#10B981',
    gradient: ['#0D9488','#0F766E'],
    category: 'Iniciante', muscles: ['Full Body'], calories: 200,
    exercises: [
      { name: 'Agachamento',          sets: 3, reps: '15 reps',          rest: '60s' },
      { name: 'Flexão',               sets: 3, reps: '10 reps',          rest: '60s' },
      { name: 'Remada Sentado',       sets: 3, reps: '12 reps',          rest: '60s' },
      { name: 'Hip Thrust',           sets: 3, reps: '15 reps',          rest: '60s' },
      { name: 'Prancha',              sets: 3, reps: '30s',              rest: '45s' },
      { name: 'Polichinelo',          sets: 3, reps: '30s',              rest: '30s' },
    ],
  },

  // ── AVANÇADO ──────────────────────────────────────────────────────────────
  {
    id: 15, name: 'Volume Máximo — Peito', emoji: '🏆', duration: 65, xp: 160,
    difficulty: 'DIFÍCIL', difficultyColor: '#EF4444',
    gradient: ['#9D174D','#831843'],
    category: 'Avançado', muscles: ['Peito', 'Tríceps'], calories: 380,
    exercises: [
      { name: 'Supino Reto',          sets: 5, reps: '10, 8, 6, 4, 4',  rest: '120s' },
      { name: 'Supino Inclinado',     sets: 4, reps: '10, 8, 6, 6',     rest: '90s'  },
      { name: 'Supino Declinado',     sets: 3, reps: '10, 8, 8',        rest: '90s'  },
      { name: 'Fly com Halteres',     sets: 3, reps: '12, 12, 10',      rest: '60s'  },
      { name: 'Crossover',            sets: 3, reps: '15, 12, 12',      rest: '60s'  },
      { name: 'Tríceps Testa',        sets: 4, reps: '10, 8, 8, 6',     rest: '60s'  },
    ],
  },
  {
    id: 16, name: 'Força Pura — Power', emoji: '⚡', duration: 70, xp: 180,
    difficulty: 'DIFÍCIL', difficultyColor: '#EF4444',
    gradient: ['#7F1D1D','#991B1B'],
    category: 'Avançado', muscles: ['Full Body', 'Força'], calories: 500,
    exercises: [
      { name: 'Deadlift',             sets: 5, reps: '5, 4, 3, 2, 1',  rest: '180s' },
      { name: 'Agachamento',          sets: 5, reps: '5, 4, 3, 2, 1',  rest: '180s' },
      { name: 'Supino Reto',          sets: 5, reps: '5, 4, 3, 2, 1',  rest: '180s' },
      { name: 'Remada Curvada',       sets: 4, reps: '6, 5, 4, 4',     rest: '120s' },
      { name: 'Desenvolvimento',      sets: 4, reps: '6, 5, 4, 4',     rest: '120s' },
    ],
  },
  {
    id: 17, name: 'Glúteos & Posterior', emoji: '🍑', duration: 55, xp: 140,
    difficulty: 'MÉDIO', difficultyColor: '#F59E0B',
    gradient: ['#9D174D','#7C3AED'],
    category: 'Parte Inferior', muscles: ['Glúteos', 'Isquiotibiais', 'Abdutores'], calories: 360,
    exercises: [
      { name: 'Hip Thrust',           sets: 4, reps: '12, 10, 10, 8',   rest: '90s'  },
      { name: 'Stiff',                sets: 4, reps: '12, 10, 8, 8',    rest: '90s'  },
      { name: 'Agachamento Sumô',     sets: 3, reps: '15, 12, 10',      rest: '60s'  },
      { name: 'Glúteo 4 Apoios',      sets: 3, reps: '15 cada',         rest: '45s'  },
      { name: 'Abdução de Quadril',   sets: 3, reps: '20, 15, 15',      rest: '45s'  },
      { name: 'Mesa Flexora',         sets: 3, reps: '15, 12, 12',      rest: '60s'  },
    ],
  },
  {
    id: 18, name: 'Abdômen Completo', emoji: '🎯', duration: 30, xp: 75,
    difficulty: 'MÉDIO', difficultyColor: '#F59E0B',
    gradient: ['#D97706','#B45309'],
    category: 'Core', muscles: ['Abdômen', 'Core', 'Oblíquos'], calories: 160,
    exercises: [
      { name: 'Prancha',              sets: 4, reps: '45s',             rest: '30s' },
      { name: 'Crunch',               sets: 3, reps: '25 reps',         rest: '45s' },
      { name: 'Crunch Bicicleta',     sets: 3, reps: '20 reps',         rest: '45s' },
      { name: 'Leg Raise',            sets: 3, reps: '15 reps',         rest: '45s' },
      { name: 'Russian Twist',        sets: 3, reps: '20 reps',         rest: '45s' },
      { name: 'Prancha Lateral',      sets: 3, reps: '30s cada',        rest: '30s' },
    ],
  },

  // ── FUNCIONAL / CROSSFIT ──────────────────────────────────────────────────
  {
    id: 19, name: 'CrossFit Metcon', emoji: '💥', duration: 30, xp: 110,
    difficulty: 'DIFÍCIL', difficultyColor: '#EF4444',
    gradient: ['#DC2626','#B91C1C'],
    category: 'Funcional', muscles: ['Full Body', 'Cardio'], calories: 400,
    exercises: [
      { name: 'Burpee',               sets: 5, reps: '10 reps',         rest: '30s' },
      { name: 'Kettlebell Swing',     sets: 4, reps: '15 reps',         rest: '30s' },
      { name: 'Box Jump',             sets: 4, reps: '10 reps',         rest: '30s' },
      { name: 'Thruster',             sets: 4, reps: '10 reps',         rest: '30s' },
      { name: 'Mountain Climber',     sets: 4, reps: '20 reps',         rest: '15s' },
    ],
  },
  {
    id: 20, name: 'Peso Corporal Total', emoji: '🤸', duration: 35, xp: 85,
    difficulty: 'MÉDIO', difficultyColor: '#F59E0B',
    gradient: ['#0891B2','#0E7490'],
    category: 'Funcional', muscles: ['Full Body'], calories: 280,
    exercises: [
      { name: 'Flexão',               sets: 4, reps: '15, 12, 10, 10',  rest: '60s' },
      { name: 'Afundo com Halteres',  sets: 3, reps: '12 cada',         rest: '60s' },
      { name: 'Burpee',               sets: 3, reps: '10 reps',         rest: '45s' },
      { name: 'Prancha',              sets: 3, reps: '45s',             rest: '30s' },
      { name: 'Jump Squat',           sets: 3, reps: '15 reps',         rest: '60s' },
      { name: 'Mountain Climber',     sets: 3, reps: '30s',             rest: '30s' },
    ],
  },

  // ── MOBILIDADE E RECUPERAÇÃO ──────────────────────────────────────────────
  {
    id: 21, name: 'Mobilidade Completa', emoji: '🧘', duration: 30, xp: 50,
    difficulty: 'FÁCIL', difficultyColor: '#10B981',
    gradient: ['#4338CA','#3730A3'],
    category: 'Mobilidade', muscles: ['Full Body', 'Flexibilidade'], calories: 80,
    exercises: [
      { name: 'Mobilidade de Quadril', sets: 3, reps: '10 cada',        rest: '30s' },
      { name: 'Alongamento Posterior', sets: 3, reps: '30s cada',       rest: '30s' },
      { name: 'Prancha',               sets: 3, reps: '30s',            rest: '30s' },
      { name: 'Elevação Frontal',      sets: 2, reps: '10 reps leve',   rest: '30s' },
    ],
  },
  {
    id: 22, name: 'Recuperação Ativa', emoji: '🌊', duration: 25, xp: 40,
    difficulty: 'FÁCIL', difficultyColor: '#10B981',
    gradient: ['#0369A1','#075985'],
    category: 'Mobilidade', muscles: ['Recuperação'], calories: 60,
    exercises: [
      { name: 'Aquecimento',           sets: 1, reps: '5 min',           rest: '—'   },
      { name: 'Alongamento Posterior', sets: 3, reps: '40s cada',        rest: '20s' },
      { name: 'Mobilidade de Quadril', sets: 3, reps: '10 reps',         rest: '20s' },
      { name: 'Desaquecimento',        sets: 1, reps: '5 min',           rest: '—'   },
    ],
  },
];

export const categories = [
  'Todos', 'Iniciante', 'PPL', 'Parte Superior', 'Parte Inferior',
  'Core', 'Cardio', 'Funcional', 'Avançado', 'Mobilidade', 'Full Body',
];

export const leaderboardData = [
  { rank: 1, name: 'Marina S.', xp: 8920, streak: 65, avatar: 'M', league: '💎', change: 0 },
  { rank: 2, name: 'Pedro A.', xp: 8450, streak: 41, avatar: 'P', league: '💎', change: 1 },
  { rank: 3, name: 'Ana R.', xp: 7800, streak: 38, avatar: 'A', league: '💎', change: -1 },
  { rank: 4, name: 'Lucas (Você)', xp: 7200, streak: 23, avatar: 'L', league: '🥇', change: 2, isUser: true },
  { rank: 5, name: 'Carlos M.', xp: 6900, streak: 30, avatar: 'C', league: '🥇', change: -1 },
  { rank: 6, name: 'Julia F.', xp: 6400, streak: 18, avatar: 'J', league: '🥇', change: 0 },
  { rank: 7, name: 'Rafael B.', xp: 5800, streak: 12, avatar: 'R', league: '🥇', change: 3 },
  { rank: 8, name: 'Beatriz L.', xp: 5200, streak: 9, avatar: 'B', league: '🥈', change: -2 },
  { rank: 9, name: 'Thiago N.', xp: 4900, streak: 15, avatar: 'T', league: '🥈', change: 1 },
  { rank: 10, name: 'Fernanda O.', xp: 4400, streak: 7, avatar: 'F', league: '🥈', change: 0 },
  { rank: 11, name: 'Gabriel C.', xp: 3800, streak: 5, avatar: 'G', league: '🥈', change: -3 },
  { rank: 12, name: 'Isabela M.', xp: 3200, streak: 3, avatar: 'I', league: '🥉', change: 2 },
];

export const achievements = [
  // Streak
  { id: 1,  emoji: '🔥', name: 'Série de 7',    desc: '7 dias seguidos',             unlocked: true,  color: '#F97316', category: 'streak',   xpReward: 100,  unlockedAt: 'Há 16 dias' },
  { id: 2,  emoji: '🔥', name: 'Série de 14',   desc: '14 dias seguidos',            unlocked: true,  color: '#EF4444', category: 'streak',   xpReward: 200,  unlockedAt: 'Há 9 dias' },
  { id: 3,  emoji: '🔥', name: 'Em Chamas',     desc: 'Série de 30 dias',            unlocked: false, color: '#8B5CF6', category: 'streak',   xpReward: 500,  progress: 23, total: 30 },
  { id: 4,  emoji: '🔥', name: 'Indomável',     desc: 'Série de 60 dias',            unlocked: false, color: '#F59E0B', category: 'streak',   xpReward: 1000, progress: 23, total: 60 },
  { id: 5,  emoji: '🔥', name: 'Lenda Viva',    desc: 'Série de 100 dias',           unlocked: false, color: '#06B6D4', category: 'streak',   xpReward: 2000, progress: 23, total: 100 },
  // Treinos
  { id: 6,  emoji: '💪', name: '10 Treinos',    desc: 'Complete 10 treinos',         unlocked: true,  color: '#8B5CF6', category: 'treinos',  xpReward: 150,  unlockedAt: 'Há 2 meses' },
  { id: 7,  emoji: '🏅', name: '50 Treinos',    desc: 'Complete 50 treinos',         unlocked: true,  color: '#F59E0B', category: 'treinos',  xpReward: 400,  unlockedAt: 'Há 3 semanas' },
  { id: 8,  emoji: '💯', name: '100 Treinos',   desc: 'Complete 100 treinos',        unlocked: false, color: '#F59E0B', category: 'treinos',  xpReward: 800,  progress: 89, total: 100 },
  { id: 9,  emoji: '🏆', name: '200 Treinos',   desc: 'Complete 200 treinos',        unlocked: false, color: '#06B6D4', category: 'treinos',  xpReward: 2000, progress: 89, total: 200 },
  // XP
  { id: 10, emoji: '⚡', name: 'Primeiro XP',   desc: 'Ganhe seu primeiro XP',       unlocked: true,  color: '#F59E0B', category: 'xp',       xpReward: 50,   unlockedAt: 'Há 3 meses' },
  { id: 11, emoji: '⚡', name: '1000 XP/dia',   desc: 'Ganhe 1000 XP em um dia',    unlocked: false, color: '#EF4444', category: 'xp',       xpReward: 300,  progress: 120, total: 1000 },
  { id: 12, emoji: '💎', name: '10.000 XP',     desc: 'Acumule 10.000 XP totais',   unlocked: false, color: '#67E8F9', category: 'xp',       xpReward: 1000, progress: 7200, total: 10000 },
  // Especial
  { id: 13, emoji: '🦁', name: 'Caçador',       desc: 'Derrote um chefe semanal',    unlocked: true,  color: '#EF4444', category: 'especial', xpReward: 300,  unlockedAt: 'Há 5 dias' },
  { id: 14, emoji: '🎯', name: 'Focado',        desc: 'Complete 7 desafios diários', unlocked: true,  color: '#10B981', category: 'especial', xpReward: 200,  unlockedAt: 'Há 1 semana' },
  { id: 15, emoji: '👑', name: 'Liga Diamante', desc: 'Alcance a Liga Diamante',     unlocked: false, color: '#67E8F9', category: 'especial', xpReward: 1500 },
  { id: 16, emoji: '🏆', name: 'Top 3',         desc: 'Fique no top 3 do ranking',   unlocked: false, color: '#FFD700', category: 'especial', xpReward: 1000 },
  { id: 17, emoji: '🌙', name: 'Madrugador',    desc: 'Treine às 6h da manhã',       unlocked: false, color: '#6366F1', category: 'especial', xpReward: 200 },
  { id: 18, emoji: '🎽', name: 'Sem Desculpas', desc: 'Treine 5x na mesma semana',   unlocked: false, color: '#10B981', category: 'especial', xpReward: 350,  progress: 3, total: 5 },
];

export const flameTiers = [
  { min: 0,  label: 'Faísca',    color: '#9CA3AF', gradient: ['#374151', '#1F2937'] },
  { min: 7,  label: 'Aquecendo', color: '#F97316', gradient: ['#7C2D12', '#1C0A04'] },
  { min: 14, label: 'Em Chamas', color: '#EF4444', gradient: ['#7F1D1D', '#1C0505'] },
  { min: 21, label: 'Inferno',   color: '#8B5CF6', gradient: ['#4C1D95', '#1C0A3E'] },
  { min: 30, label: 'Lendário',  color: '#F59E0B', gradient: ['#78350F', '#1C0A00'] },
  { min: 60, label: 'Imortal',   color: '#06B6D4', gradient: ['#164E63', '#051020'] },
];

export const groupsData = [
  {
    id: 1,
    name: 'Os Inabaláveis',
    emoji: '🛡️',
    groupStreak: 18,
    daysPerWeek: 5,
    color: '#8B5CF6',
    gradient: ['#7C3AED', '#5B21B6', '#1E1B4B'],
    members: [
      { name: 'Lucas',  avatar: 'L', checkedInToday: true,  isUser: true  },
      { name: 'Ana R.', avatar: 'A', checkedInToday: true,  isUser: false },
      { name: 'Pedro',  avatar: 'P', checkedInToday: false, isUser: false },
      { name: 'Julia',  avatar: 'J', checkedInToday: true,  isUser: false },
    ],
  },
];

export const rivalsData = [
  {
    id: 1,
    name: 'Duelo Semanal',
    rival: {
      name: 'Carlos M.',
      avatar: 'C',
      lastWorkout: 'há 2 dias',
      hasMomentum: false,
      last7Days: [true, true, false, true, false, true, false],
    },
    userScore: 8,
    rivalScore: 6,
    daysPerWeek: 5,
    endDate: '8 Mai',
    totalDays: 14,
    daysLeft: 6,
    userLastWorkout: 'há 1 dia',
    userHasMomentum: true,
    userLast7Days: [true, false, true, true, true, false, true],
    color: '#A78BFA',
    gradient: ['#7C3AED', '#5B21B6', '#2E1065'],
  },
  {
    id: 2,
    name: 'Desafio do Mês',
    rival: {
      name: 'Rafael B.',
      avatar: 'R',
      lastWorkout: 'há 1 dia',
      hasMomentum: true,
      last7Days: [true, true, true, false, true, true, false],
    },
    userScore: 12,
    rivalScore: 14,
    daysPerWeek: 3,
    endDate: '31 Mai',
    totalDays: 31,
    daysLeft: 22,
    userLastWorkout: 'há 3 dias',
    userHasMomentum: false,
    userLast7Days: [false, true, true, false, false, true, false],
    color: '#C084FC',
    gradient: ['#6D28D9', '#4C1D95', '#1E1B4B'],
  },
];

export const seasonData = {
  season: 3,
  name: 'A Provação',
  xp: 1850,
  xpGoal: 3000,
  endDate: '12 Mai',
  rewardTitle: 'Guerreiro Testado',
  rewardEmoji: '🎭',
  weeks: [
    { label: 'O Despertar',  done: true,  active: false },
    { label: 'A Construção', done: true,  active: false },
    { label: 'A Provação',   done: false, active: true  },
    { label: 'A Ascensão',   done: false, active: false },
  ],
};

export const feedData = [
  { id: 1, user: 'Marina S.',  avatar: 'M', type: 'record',      emoji: '🏆', badge: 'Novo Recorde',       detail: '120kg no agachamento 🦵💥',           time: '5 min',   reactions: { party: 12, fire: 8,  heart: 5  } },
  { id: 2, user: 'Pedro A.',   avatar: 'P', type: 'achievement',  emoji: '🔥', badge: 'Série de 14 dias!',  detail: '14 dias seguidos! Imparável 🔥',      time: '1h',      reactions: { party: 8,  fire: 14, heart: 3  } },
  { id: 3, user: 'Ana R.',     avatar: 'A', type: 'water',        emoji: '💧', badge: 'Meta de Hidratação', detail: '3 litros de água hoje — Tubarão 🦈',  time: '2h',      reactions: { party: 5,  fire: 2,  heart: 7  } },
  { id: 4, user: 'Carlos M.',  avatar: 'C', type: 'workout',      emoji: '💪', badge: '50 Treinos!',        detail: 'Monstro do Ferro ativado 🦁',         time: '3h',      reactions: { party: 21, fire: 18, heart: 9  } },
  { id: 5, user: 'Julia F.',   avatar: 'J', type: 'streak',       emoji: '⚡', badge: '30 Dias Seguidos!',  detail: 'Um mês inteiro! Lenda confirmada 👑', time: 'Ontem',   reactions: { party: 34, fire: 28, heart: 15 } },
  { id: 6, user: 'Rafael B.',  avatar: 'R', type: 'achievement',  emoji: '🎯', badge: 'Conquistou Focado',  detail: '7 desafios diários completos!',       time: 'Ontem',   reactions: { party: 7,  fire: 5,  heart: 2  } },
];

export const quotes = [
  { text: 'A dor que você sente hoje é a força que você sentirá amanhã.', author: 'Arnold Schwarzenegger' },
  { text: 'Não pare quando estiver cansado. Pare quando estiver pronto.', author: 'Capi' },
  { text: 'Seu corpo pode aguentar quase tudo. É sua mente que você precisa convencer.', author: 'Capi' },
  { text: 'O sucesso é a soma de pequenos esforços repetidos dia após dia.', author: 'Robert Collier' },
  { text: 'Você não precisa ser ótimo para começar, mas precisa começar para ser ótimo.', author: 'Zig Ziglar' },
  { text: 'Treinar é uma celebração do que seu corpo pode fazer.', author: 'Capi' },
  { text: 'A academia não fica mais fácil. Você fica mais forte.', author: 'Capi' },
];

export const recentActivity = [
  { id: 1, type: 'workout', text: 'Completou Peito & Tríceps', xp: 120, time: '2h atrás', emoji: '💪' },
  { id: 2, type: 'achievement', text: 'Desbloqueou "Em Chamas"', xp: 50, time: 'Ontem', emoji: '🏅' },
  { id: 3, type: 'streak', text: 'Série de 20 dias!', xp: 100, time: 'Ontem', emoji: '🔥' },
  { id: 4, type: 'workout', text: 'Completou Core Destruidor', xp: 80, time: '2 dias atrás', emoji: '🔥' },
  { id: 5, type: 'level', text: 'Subiu para Nível 14!', xp: 0, time: '3 dias atrás', emoji: '⭐' },
];
