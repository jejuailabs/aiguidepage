export const halls = [
  {id: 'ai', icon: 'landmark', available: true},
  {id: 'prompts', icon: 'sparkles', available: false},
  {id: 'tools', icon: 'shapes', available: false},
  {id: 'games', icon: 'gamepad', available: false}
] as const;
export type HallId = (typeof halls)[number]['id'];
