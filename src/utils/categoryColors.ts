const categoryColors: Record<string, string> = {
  // Food
  utensils:           '#f97316',
  'utensils-crossed': '#f97316',
  pizza:              '#f97316',
  'chef-hat':         '#f97316',
  coffee:             '#92400e',
  // Transport
  car:                '#3b82f6',
  bus:                '#3b82f6',
  'train-front':      '#3b82f6',
  plane:              '#3b82f6',
  fuel:               '#3b82f6',
  // Shopping
  'shopping-cart':    '#ec4899',
  'shopping-bag':     '#ec4899',
  gift:               '#ec4899',
  // Entertainment
  film:               '#8b5cf6',
  music:              '#8b5cf6',
  ticket:             '#8b5cf6',
  'gamepad-2':        '#8b5cf6',
  tv:                 '#8b5cf6',
  // Health
  heart:              '#10b981',
  pill:               '#10b981',
  dumbbell:           '#10b981',
  hospital:           '#10b981',
  // Home
  house:              '#84cc16',
  sofa:               '#84cc16',
  'lamp-desk':        '#84cc16',
  // Finance / Bills
  'credit-card':      '#4f46e5',
  wallet:             '#4f46e5',
  banknote:           '#4f46e5',
  landmark:           '#4f46e5',
  // Education
  book:               '#06b6d4',
  'book-open':        '#06b6d4',
  'graduation-cap':   '#06b6d4',
  // Travel
  globe:              '#0ea5e9',
  luggage:            '#0ea5e9',
  // Pets
  dog:                '#f59e0b',
  cat:                '#f59e0b',
  // Income / positive
  'chart-bar':        '#059669',
  briefcase:          '#059669',
  // Default fallback
  default:            '#94a3b8',
};

export function getCategoryColor(iconName: string | null | undefined): string {
  if (!iconName) return categoryColors['default']!;
  return categoryColors[iconName] ?? categoryColors['default']!;
}
