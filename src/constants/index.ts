// Maps restriction codes to their corresponding Tailwind background and text styles.
// Used primarily for rendering badges consistently.
export const restrictionColorMap: Record<string, { bg: string; text: string }> = {
  'JPN': { bg: 'bg-red-100', text: 'text-red-700' },
  'UK': { bg: 'bg-blue-100', text: 'text-blue-700' },
  'USA': { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  'GER': { bg: 'bg-amber-100', text: 'text-amber-700' },
};

// Friendly country/region names mapped from ISO-like codes.
export const restrictionLabels: Record<string, string> = {
  'JPN': 'Japan',
  'GER': 'Germany',
  'SUI': 'Switzerland',
  'AUT': 'Austria',
  'UK': 'United Kingdom',
  'USA': 'United States of America',
};
