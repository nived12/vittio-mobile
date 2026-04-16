// All values in dp (density-independent pixels), equivalent to pt on iOS
export const spacing = {
  // Base scale (matches web --spacing-* tokens)
  xs:  4,   // micro gaps, icon-to-text
  sm:  8,   // tight gaps, icon padding, badge padding
  md:  16,  // standard gap, section horizontal padding
  lg:  24,  // card padding, section vertical gaps
  xl:  32,  // large section gaps, form field spacing
  xxl: 48,  // hero gaps, above-the-fold spacing

  // Semantic aliases (component-specific)
  screenPaddingH:   24, // horizontal padding on all screens
  screenPaddingTop: 16, // top padding below safe area
  cardPadding:      16, // inner padding of standard cards
  cardPaddingLg:    20, // inner padding of large/hero cards
  formFieldGap:     16, // vertical gap between form fields
  listItemGap:      12, // vertical gap between list rows
  sectionGap:       24, // vertical gap between sections
  tabBarHeight:     49, // tab bar visible height (before safe area)
  headerHeight:     56, // custom header height

  // Touch minimum
  touchTarget: 44, // minimum touch target size (WCAG)
} as const;
