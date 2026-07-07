# FitQuest — Guia do Projeto

## Stack

- **Expo SDK 54** / React Native 0.81.5 / React 19.1.0
- `expo-linear-gradient ~15.0.8` — gradientes em todos os cards
- `@expo/vector-icons ^15.0.3` (Ionicons) — ícones
- `@react-navigation/bottom-tabs ^6.6.1` + stack
- `react-native-safe-area-context`, `react-native-screens`
- Backend: **Supabase** (Postgres) — projeto `kqlgycnpsruxrjhkcgnt`. Migrations em `supabase/migrations/`.
- Idioma da UI: **Português (BR)**

## Acesso ao banco Supabase

- A connection string do Postgres fica em `.env` (gitignored), chave `SUPABASE_DB_URL`. Nunca colar a credencial aqui no CLAUDE.md nem em nenhum arquivo versionado.
- Se `.env` não existir ou a chave estiver ausente, pedir ao usuário a connection string (Dashboard → Project Settings → Database → Connection string URI) antes de tentar rodar migrations.
- Para aplicar uma migration SQL diretamente: usar o pacote `pg` (`npm install --no-save pg` se não estiver instalado) com um script Node que lê `.env` e executa o arquivo `.sql` via `Client.query`. Sempre criar o script em arquivo temporário e apagá-lo depois de usar.

## Regras de Edição (SEGUIR SEMPRE)
- Ler APENAS o arquivo mencionado no pedido
- Não abrir outros arquivos "para entender contexto"
- Não mostrar diff completo — apenas confirmar: "Editei X: fiz Y"
- Não reescrever seções que não foram pedidas

## Tamanho aproximado dos arquivos
- HomeScreen.js ~600 linhas
- LeaderboardScreen.js ~500 linhas  
- WorkoutDetailScreen.js ~350 linhas
- mockData.js ~200 linhas

## Estrutura

```
src/
├── data/mockData.js          — todos os dados mock (ver seção abaixo)
├── navigation/AppNavigator.js — tabs + stacks
├── screens/
│   ├── HomeScreen.js         — dashboard principal
│   ├── WorkoutsScreen.js     — lista/filtro de treinos
│   ├── WorkoutDetailScreen.js — detalhe + timer + XP modal
│   ├── LeaderboardScreen.js  — ranking + grupos + rivais + feed
│   ├── AchievementsScreen.js — 18 conquistas por categoria
│   └── ProfileScreen.js      — perfil + season card + stats
└── theme/index.js            — COLORS, SPACING, RADIUS, SHADOWS
```

## Navegação

Bottom tabs (5): **Início → Treinos → Ranking → Conquistas → Perfil**

- HomeStack: HomeScreen → WorkoutDetailScreen
- WorkoutsStack: WorkoutsScreen → WorkoutDetailScreen
- Leaderboard, Achievements, Profile são telas diretas (sem stack)

Tab bar customizada: ícone roxo + barra superior no tab ativo, filled/outline por foco.

## Tema (`src/theme/index.js`)

```js
COLORS = {
  bg: '#0A0A18', bgSecondary: '#12122A', card: '#1A1A2E', cardAlt: '#16213E', border: '#2A2A4A',
  purple: '#8B5CF6', purpleDark: '#6D28D9', purpleLight: '#A78BFA',
  gold: '#F59E0B', goldLight: '#FCD34D',
  green: '#10B981', greenLight: '#34D399', red: '#EF4444', redLight: '#F87171',
  orange: '#F97316', blue: '#3B82F6', pink: '#EC4899', cyan: '#06B6D4', indigo: '#6366F1',
  white: '#FFFFFF', gray: '#94A3B8', grayDark: '#475569', grayDarker: '#1E293B',
  bronze: '#CD7F32', silver: '#C0C0C0', goldLeague: '#FFD700', platinum: '#E2E8F0', diamond: '#67E8F9',
}
SPACING = { xs:4, sm:8, md:16, lg:24, xl:32, xxl:48 }
RADIUS  = { sm:8, md:12, lg:16, xl:24, full:999 }
SHADOWS = { purple, gold, green }  // shadowColor + elevation:8
```

## Dados Mock (`src/data/mockData.js`)

| Export | Descrição |
|---|---|
| `userData` | Usuário principal: Lucas, level 14, XP 3420, streak 23 |
| `dailyChallenges` | 3 desafios diários (treino, água, caminhada) |
| `bossData` | Boss semanal: O Leão de Ferro |
| `recommendedWorkouts` | 4 treinos em destaque |
| `allWorkouts` | 8 treinos no total |
| `categories` | Filtros: Todos, Parte Superior, Parte Inferior, Core, Cardio, Full Body |
| `leaderboardData` | 12 usuários ranqueados com XP, streak, liga |
| `achievements` | 18 conquistas em 4 categorias (streak, workout, XP, especial) |
| `flameTiers` | 6 tiers de progressão: Faísca → Imortal |
| `groupsData` | 1 grupo: Os Inabaláveis (streak 18 dias, 4 membros) |
| `rivalsData` | 2 duelos: semanal (Carlos M.) e mensal (Rafael B.) |
| `feedData` | 6 posts de feed social (recordes, conquistas, água, treinos) |
| `seasonData` | Season 3 atual, 4 semanas, progresso de XP |
| `quotes` | 7 frases motivacionais em PT-BR |
| `recentActivity` | 5 atividades recentes do usuário |

## Telas — Resumo

### HomeScreen.js
- Stats do usuário (XP, streak, hydration, level)
- Desafios diários com barra de progresso
- Boss battle semanal
- **Competições** (grupos + rivais) — cards com gradiente, avatares, VS circle, score colorido
- Treinos recomendados
- Frases motivacionais
- Modal `CheckinCelebration` (animado com conquistas)

### LeaderboardScreen.js
- 4 tabs: **Geral · Grupos · Rivais · Feed**
- **Geral**: ranking de amigos com liga/XP/streak
- **Grupos** (`GroupCard`): shield box, membros com rings coloridos, barra de status
- **Rivais** (`RivalMatchCard`): arena com avatares 56px, VS circle, scores 40px, barras de progresso
- **Feed** (`FeedSection`): posts com avatar, nome, tempo, badge, reações (🎉🔥❤️) com estado ativo/inativo distinto

### ProfileScreen.js
- Avatar com gradiente + título do usuário (`getUserTitle`)
- Stats rápidos (treinos, streak, XP)
- Season Card (Season 3, 4 semanas, progresso)
- Atividade recente
- Menu de configurações

### WorkoutsScreen.js
- Filtro por categoria (scroll horizontal)
- Cards animados com dificuldade/duração/XP

### WorkoutDetailScreen.js
- Lista de exercícios, timer, marcar como completo
- Modal de recompensa XP ao finalizar

### AchievementsScreen.js
- 18 conquistas com barras de progresso
- Sistema de tiers de chama

## Padrões de Código

- **Estilos**: `StyleSheet.create` inline em cada arquivo, prefixos curtos por seção (ex: `cg` = competition-group, `cr` = competition-rival)
- **Gradientes**: sempre `<LinearGradient colors={[...]} style={...}>` — nunca backgroundColor sólido em cards principais
- **Avatares**: `LinearGradient` circular com letra inicial em `Text`
- **Reações do feed**: estado em `useState({})` keyed por `postId_reactionKey`; ativo = fundo colorido vivo; inativo = `rgba(255,255,255,0.04)` quase invisível
- **Scores de rivais**: verde `#10B981` se ganhando, vermelho `#EF4444` se perdendo
- **Sem comentários**: código auto-explicativo por nomes de variáveis

## Convenções de Importação

```js
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { groupsData, rivalsData, feedData, ... } from '../data/mockData';
```

## app.json

```json
{ "name": "FitQuest", "slug": "fitquest", "orientation": "portrait",
  "userInterfaceStyle": "dark", "newArchEnabled": true,
  "splash": { "backgroundColor": "#0A0A18" },
  "ios": { "bundleIdentifier": "com.fitquest.app" },
  "android": { "package": "com.fitquest.app" } }
```

## Funcionalidades Pendentes / Futuras

- Sistema de convite de amigos para o ranking Geral
- Backend real (atualmente tudo é mockData)
