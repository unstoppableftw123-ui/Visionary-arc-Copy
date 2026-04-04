// ── Career track definitions ────────────────────────────────────────────────
// colors object contains full Tailwind class strings (no dynamic interpolation)

export const TRACKS = [
  {
    id: 'tech-ai',
    name: 'Tech & AI',
    tagline: 'Build the future with code and AI',
    color: 'blue',
    colors: {
      border:  'border-blue-500',
      bg:      'bg-blue-500/10',
      bgSolid: 'bg-blue-500',
      text:    'text-blue-400',
      badge:   'bg-blue-500/20 text-blue-300',
      button:  'bg-blue-600 hover:bg-blue-500 text-white',
      ring:    'ring-blue-500/40',
    },
    description:
      'Design and ship software, AI automations, and developer tools. ' +
      'Work on real-world problems using APIs, prompts, and code.',
    skills: ['Prompt Engineering', 'APIs & Automation', 'App Development', 'Data Analysis', 'AI Tools'],
    icon: 'Cpu',
    xpRange: '200–1,000 XP per project',
  },
  {
    id: 'design-branding',
    name: 'Design & Branding',
    tagline: 'Turn ideas into identity',
    color: 'purple',
    colors: {
      border:  'border-orange-500/30',
      bg:      'bg-orange-600/10',
      bgSolid: 'bg-orange-600',
      text:    'text-orange-400',
      badge:   'bg-orange-600/20 text-orange-400',
      button:  'bg-orange-600 hover:bg-orange-600 text-white',
      ring:    'ring-orange-500/40',
    },
    description:
      'Craft visual identities, UI/UX flows, and brand strategy for real clients. ' +
      'Build a portfolio that shows you can make anything look and feel right.',
    skills: ['UI/UX Design', 'Visual Identity', 'Brand Strategy', 'Graphic Design', 'Typography'],
    icon: 'Palette',
    xpRange: '200–1,000 XP per project',
  },
  {
    id: 'business',
    name: 'Business & Entrepreneurship',
    tagline: 'Think like a founder',
    color: 'amber',
    colors: {
      border:  'border-amber-500',
      bg:      'bg-amber-500/10',
      bgSolid: 'bg-amber-500',
      text:    'text-amber-400',
      badge:   'bg-amber-500/20 text-amber-300',
      button:  'bg-amber-600 hover:bg-amber-500 text-white',
      ring:    'ring-amber-500/40',
    },
    description:
      'Build go-to-market plans, financial models, and sales strategies for growing companies. ' +
      'Learn the language of business by doing real founder-level work.',
    skills: ['Marketing Strategy', 'Pricing & Finance', 'Sales', 'Business Planning', 'Market Research'],
    icon: 'TrendingUp',
    xpRange: '200–1,000 XP per project',
  },
  {
    id: 'content-storytelling',
    name: 'Content & Storytelling',
    tagline: 'Your voice, amplified',
    color: 'pink',
    colors: {
      border:  'border-pink-500',
      bg:      'bg-pink-500/10',
      bgSolid: 'bg-pink-500',
      text:    'text-pink-400',
      badge:   'bg-pink-500/20 text-pink-300',
      button:  'bg-pink-600 hover:bg-pink-500 text-white',
      ring:    'ring-pink-500/40',
    },
    description:
      'Write, script, and produce content that actually gets noticed — newsletters, videos, brand voice guides. ' +
      'Every deliverable here is a portfolio piece you can share.',
    skills: ['Writing & Copywriting', 'Video Production', 'Brand Voice', 'Presentations', 'Social Media'],
    icon: 'Mic2',
    xpRange: '200–1,000 XP per project',
  },
  {
    id: 'social-impact',
    name: 'Social Impact',
    tagline: 'Change starts here',
    color: 'teal',
    colors: {
      border:  'border-teal-500',
      bg:      'bg-teal-500/10',
      bgSolid: 'bg-teal-500',
      text:    'text-teal-400',
      badge:   'bg-teal-500/20 text-teal-300',
      button:  'bg-teal-600 hover:bg-teal-500 text-white',
      ring:    'ring-teal-500/40',
    },
    description:
      'Design campaigns, conduct research, and build community programs that drive real change. ' +
      'Work that matters — and a portfolio that proves it.',
    skills: ['Campaign Design', 'Community Research', 'Leadership', 'Community Organizing', 'Grant Writing'],
    icon: 'Heart',
    xpRange: '200–1,000 XP per project',
  },
];

export function getTrack(id) {
  return TRACKS.find((t) => t.id === id) ?? null;
}
