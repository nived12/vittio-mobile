export const radius = {
  // Named scale
  sm:   6,    // chips, small badges, pill inner elements
  md:   8,    // buttons, form inputs (standard), icon containers
  lg:   12,   // cards (standard), input fields (auth screens), modals
  xl:   16,   // large cards, dashboard metric cards, bottom sheets top corners
  xxl:  24,   // hero card (balance), onboarding cards
  full: 9999, // pills, badges, FAB, avatar circles, circular icons

  // Semantic aliases
  button:      12,   // all primary/secondary buttons
  input:       12,   // all form inputs
  card:        12,   // standard card container
  cardLg:      16,   // large card container
  heroCard:    24,   // balance hero card
  badge:       9999, // status badges, category tags
  fab:         9999, // FAB is a circle (56dp circle)
  avatar:      9999, // user avatar, account icon circles
  bottomSheet: 24,   // top corners of bottom sheet modals
  toast:       12,   // toast notifications
} as const;
