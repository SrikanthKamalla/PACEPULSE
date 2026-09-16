export const DEFAULT_CONFIG = {
  runSeconds: 120, // 2 minutes
  walkSeconds: 60,  // 1 minute
  rounds: 8,
  isInfinite: false,
};

export const WORKOUT_PRESETS = [
  {
    id: 'c25k',
    name: 'Couch to 5K',
    description: '2m Run / 1m Walk × 8 rounds',
    runSeconds: 120,
    walkSeconds: 60,
    rounds: 8,
    isInfinite: false,
  },
  {
    id: 'hiit',
    name: 'Speed HIIT',
    description: '30s Sprint / 30s Walk × 10 rounds',
    runSeconds: 30,
    walkSeconds: 30,
    rounds: 10,
    isInfinite: false,
  },
  {
    id: 'starter',
    name: 'Beginner Starter',
    description: '1m Run / 2m Walk × 6 rounds',
    runSeconds: 60,
    walkSeconds: 120,
    rounds: 6,
    isInfinite: false,
  },
  {
    id: 'endurance',
    name: 'Endurance Builder',
    description: '3m Run / 1m Walk × 6 rounds',
    runSeconds: 180,
    walkSeconds: 60,
    rounds: 6,
    isInfinite: false,
  },
  {
    id: 'endless',
    name: 'Continuous Jog/Walk',
    description: '2m Run / 1m Walk (Endless)',
    runSeconds: 120,
    walkSeconds: 60,
    rounds: 1,
    isInfinite: true,
  },
];
