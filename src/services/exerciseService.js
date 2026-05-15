// ═══════════════════════════════════════════════════════════════════════════
// Serviço de exercícios — Free Exercise DB (open source, gratuito)
// Imagens: https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/{id}/0.jpg
//
// Para GIFs animados reais: subscreva ExerciseDB no RapidAPI (grátis 100 req/mês)
// e descomente a função fetchExerciseDBGif abaixo.
// ═══════════════════════════════════════════════════════════════════════════

const FREE_DB_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises';
const RAPID_API_KEY = '81ef6801b4msh0dedeee85c45aafp1aa4f6jsn0ee1172047d7';

// ─── Mapeamento: nome em português → ID no Free Exercise DB ──────────────────
export const PT_TO_EXERCISE_ID = {
  // Peito
  'Supino Reto':            'Barbell_Bench_Press_-_Medium_Grip',
  'Supino Inclinado':       'Barbell_Incline_Bench_Press_-_Medium_Grip',
  'Supino Declinado':       'Decline_Barbell_Bench_Press',
  'Supino com Halteres':    'Dumbbell_Bench_Press',
  'Crossover':              'Cable_Crossover',
  'Flexão':                 'Push-Up',
  'Flexão Inclinada':       'Decline_Push-Up',
  'Peck Deck':              'Pec_Deck_Flye',
  'Fly com Halteres':       'Dumbbell_Flyes',
  'Mergulho':               'Dips_-_Triceps_Version',

  // Costas
  'Puxada Frontal':         'Wide-Grip_Lat_Pulldown',
  'Puxada Fechada':         'Close-Grip_Front_Lat_Pulldown',
  'Remada Curvada':         'Bent_Over_Barbell_Row',
  'Remada Unilateral':      'One-Arm_Dumbbell_Row',
  'Remada Sentado':         'Seated_Cable_Rows',
  'Remada Cavalo':          'Bent_Over_Two-Dumbbell_Row',
  'Deadlift':               'Romanian_Deadlift',
  'Barra Fixa':             'Wide-Grip_Barbell_Curl',
  'Face Pull':              'Face_Pull',
  'Hiperextensão':          'Back_Extension',
  'Pulldown':               'Wide-Grip_Lat_Pulldown',

  // Ombros
  'Desenvolvimento':            'Barbell_Shoulder_Press_-_Medium_Grip',
  'Desenvolvimento Halteres':   'Dumbbell_Shoulder_Press',
  'Elevação Lateral':           'Dumbbell_Lateral_Raise',
  'Elevação Frontal':           'Dumbbell_Front_Raise',
  'Elevação Posterior':         'Dumbbell_Rear_Delt_Row',
  'Encolhimento':               'Dumbbell_Shrug',

  // Bíceps
  'Rosca Direta':           'Barbell_Curl',
  'Rosca Direta Halteres':  'Alternate_Hammer_Curl',
  'Rosca Martelo':          'Hammer_Curls',
  'Rosca Concentrada':      'Concentration_Curls',
  'Rosca Scott':            'EZ-Bar_Curl',
  'Rosca 21':               'Barbell_Curl',

  // Tríceps
  'Tríceps Pulley':         'Pushdown',
  'Tríceps Corda':          'Pushdown',
  'Tríceps Testa':          'Lying_Triceps_Press',
  'Tríceps Francês':        'Dumbbell_Tricep_Extension',
  'Tríceps Coice':          'Dumbbell_Kickback',

  // Pernas
  'Agachamento':            'Barbell_Full_Squat',
  'Agachamento Sumô':       'Sumo_Deadlift',
  'Agachamento Hack':       'Hack_Squat',
  'Leg Press':              'Leg_Press',
  'Cadeira Extensora':      'Leg_Extensions',
  'Mesa Flexora':           'Leg_Curl',
  'Stiff':                  'Romanian_Deadlift',
  'Afundo':                 'Barbell_Lunge',
  'Afundo com Halteres':    'Dumbbell_Lunge',
  'Panturrilha':            'Standing_Calf_Raises',
  'Panturrilha Sentado':    'Seated_Calf_Raise',
  'Hip Thrust':             'Barbell_Hip_Thrust',
  'Glúteo 4 Apoios':        'Kneeling_Kickback',
  'Abdução de Quadril':     'Hip_Abduction',

  // Core
  'Prancha':                'Plank',
  'Prancha Lateral':        'Side_Plank',
  'Crunch':                 'Crunch',
  'Crunch Bicicleta':       'Bicycle_Crunch',
  'Leg Raise':              'Leg_Raises',
  'Russian Twist':          'Russian_Twist',
  'Elevação de Pernas':     'Leg_Raises',
  'Abdominal Infra':        'Reverse_Crunch',
  'Superman':               'Back_Extension',
  'Prancha com Alternância': 'Plank',

  // Cardio / Funcional
  'Burpee':                 'Burpee',
  'Jump Squat':             'Jump_Squat',
  'Mountain Climber':       'Mountain_Climber',
  'High Knees':             'High_Knees',
  'Box Jump':               'Box_Jump',
  'Polichinelo':            'Jumping_Jacks',
  'Corrida':                'Run_Sprint',
  'Pular Corda':            'Jump_Rope',
  'Kettlebell Swing':       'Kettlebell_Swing',
  'Thruster':               'Barbell_Thruster',
  'Rowing':                 'Rowing',
  'Bicicleta':              'Stationary_Bike',
  'Elíptico':               'Elliptical',
  'Esteira':                'Treadmill',

  // Aquecimento / Alongamento
  'Aquecimento':            'Run_Sprint',
  'Desaquecimento':         'Run_Sprint',
  'Alongamento Posterior':  '90_90_Hamstring',
  'Mobilidade de Quadril':  'Adductor_Groin',
};

// ─── Retorna URLs das imagens do exercício (posição inicial e final) ─────────
export function getExerciseImages(exerciseNamePT) {
  const id = PT_TO_EXERCISE_ID[exerciseNamePT];
  if (!id) return null;
  return [
    `${FREE_DB_BASE}/${id}/0.jpg`,
    `${FREE_DB_BASE}/${id}/1.jpg`,
  ];
}

// ─── Metadados por exercício ──────────────────────────────────────────────────
const EXERCISE_META = {
  'Supino Reto':       { muscles: ['Peitoral', 'Tríceps', 'Deltóide Anterior'], equipment: 'Barra', level: 'Intermediário', tips: ['Mantenha as escápulas retraídas', 'Barra desce até o peito', 'Cotovelos a 75°'] },
  'Supino Inclinado':  { muscles: ['Peitoral Superior', 'Deltóide Anterior', 'Tríceps'], equipment: 'Barra', level: 'Intermediário', tips: ['Banco a 30-45°', 'Movimento controlado na descida'] },
  'Agachamento':       { muscles: ['Quadríceps', 'Glúteos', 'Isquiotibiais', 'Core'], equipment: 'Barra', level: 'Intermediário', tips: ['Joelhos na linha dos pés', 'Costas neutras', 'Desça até 90°'] },
  'Leg Press':         { muscles: ['Quadríceps', 'Glúteos', 'Isquiotibiais'], equipment: 'Máquina', level: 'Iniciante', tips: ['Joelhos não passam dos pés', 'Não trave os joelhos'] },
  'Puxada Frontal':    { muscles: ['Latíssimo', 'Bíceps', 'Romboides'], equipment: 'Máquina', level: 'Iniciante', tips: ['Puxe até o queixo', 'Cotovelos apontam para baixo'] },
  'Remada Curvada':    { muscles: ['Latíssimo', 'Trapézio', 'Bíceps', 'Romboides'], equipment: 'Barra', level: 'Intermediário', tips: ['Tronco a 45°', 'Puxe até o umbigo', 'Escápulas se aproximam no final'] },
  'Desenvolvimento':   { muscles: ['Deltóide', 'Trapézio', 'Tríceps'], equipment: 'Barra', level: 'Intermediário', tips: ['Não hiperestenda a lombar', 'Core contraído durante todo o movimento'] },
  'Elevação Lateral':  { muscles: ['Deltóide Medial'], equipment: 'Halteres', level: 'Iniciante', tips: ['Leve inclinação para frente', 'Não eleve acima dos ombros', 'Movimento lento e controlado'] },
  'Rosca Direta':      { muscles: ['Bíceps', 'Braquial'], equipment: 'Barra', level: 'Iniciante', tips: ['Cotovelos fixos ao corpo', 'Contração total no topo'] },
  'Rosca Martelo':     { muscles: ['Bíceps', 'Braquiorradial'], equipment: 'Halteres', level: 'Iniciante', tips: ['Pegada neutra (dedos voltados)', 'Movimento alternado ou simultâneo'] },
  'Tríceps Pulley':    { muscles: ['Tríceps (todas as cabeças)'], equipment: 'Cabo', level: 'Iniciante', tips: ['Cotovelos fixos ao corpo', 'Extensão completa'] },
  'Tríceps Testa':     { muscles: ['Tríceps (cabeça longa)'], equipment: 'Barra', level: 'Intermediário', tips: ['Cotovelos não abrem', 'Movimento controlado na descida'] },
  'Prancha':           { muscles: ['Core', 'Transverso Abdominal', 'Glúteos'], equipment: 'Peso corporal', level: 'Iniciante', tips: ['Corpo alinhado', 'Glúteos contraídos', 'Não deixe o quadril cair'] },
  'Crunch':            { muscles: ['Reto Abdominal'], equipment: 'Peso corporal', level: 'Iniciante', tips: ['Não puxe o pescoço', 'Contraia o abdômen no topo'] },
  'Deadlift':          { muscles: ['Isquiotibiais', 'Glúteos', 'Lombar', 'Trapézio'], equipment: 'Barra', level: 'Avançado', tips: ['Barra próxima ao corpo', 'Costas neutras', 'Empurre o chão', 'Core totalmente contraído'] },
  'Hip Thrust':        { muscles: ['Glúteos', 'Isquiotibiais'], equipment: 'Barra', level: 'Iniciante', tips: ['Quadril sobe até ficar alinhado', 'Contração máxima no topo', 'Pés afastados na largura dos ombros'] },
  'Burpee':            { muscles: ['Full Body', 'Cardio'], equipment: 'Peso corporal', level: 'Intermediário', tips: ['Movimento fluido', 'Prancha completa ao abaixar', 'Salto com braços para cima'] },
};

export function getExerciseMeta(exerciseNamePT) {
  return EXERCISE_META[exerciseNamePT] ?? {
    muscles: ['Múltiplos grupos musculares'],
    equipment: 'Variado',
    level: 'Intermediário',
    tips: ['Mantenha a forma correta', 'Respire durante o movimento', 'Aumente a carga progressivamente'],
  };
}

// ─── (Futuro) GIF animado real via ExerciseDB — ative após subscrever ────────
// Para ativar: vá em rapidapi.com, busque "ExerciseDB", assine o plano FREE
export async function fetchExerciseGifUrl(exerciseNamePT) {
  const id = PT_TO_EXERCISE_ID[exerciseNamePT];
  if (!id) return null;

  // Converte ID do free DB para nome de busca no ExerciseDB
  const searchName = id.replace(/_/g, ' ').toLowerCase();
  try {
    const res = await fetch(
      `https://exercisedb.p.rapidapi.com/exercises/name/${encodeURIComponent(searchName)}?limit=1`,
      {
        headers: {
          'x-rapidapi-host': 'exercisedb.p.rapidapi.com',
          'x-rapidapi-key':  RAPID_API_KEY,
        },
      }
    );
    const data = await res.json();
    return data?.[0]?.gifUrl ?? null;
  } catch {
    return null;
  }
}