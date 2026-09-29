// Little things to discover while wandering. Copy is playful microcopy — no claims about the work.
export const SECRETS = [
  'clock',
  'booth',
  'mailbox',
  'frog',
  'bottle',
  'bench',
  'windmill',
  'cactus',
  'robot',
  'typewriter',
  'counter',
  // interiors
  'lever',
  'briefcase',
  'tape',
  'turnstile',
  'clapper',
  'director',
  'guestbook',
  'telescope',
  'lens',
] as const
export type SecretId = (typeof SECRETS)[number]
