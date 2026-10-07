export const halls = [
  {id: 'ai', icon: 'landmark', available: true},
  {id: 'prompts', icon: 'sparkles', available: true},
  {id: 'tools', icon: 'shapes', available: true},
  {id: 'games', icon: 'gamepad', available: true}
] as const;
export type HallId = (typeof halls)[number]['id'];
