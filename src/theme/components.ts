export const components = {

  // ─────────────────────────────────────────
  // Buttons
  // ─────────────────────────────────────────
  button: {
    heightLg:     52,  // primary CTA, form submit
    heightMd:     44,  // standard button
    heightSm:     36,  // compact button, inline action
    borderRadius: 12,
    paddingH:     20,
    fontStyle: {
      fontFamily:    'Inter_600SemiBold',
      fontSize:      16,
      lineHeight:    22,
      letterSpacing: 0.1,
    },
    primary: {
      backgroundColor: '#4f46e5',
      color:           '#ffffff',
      pressedBg:       '#4338ca',
      disabledBg:      '#e2e8f0',
      disabledColor:   '#94a3b8',
    },
    secondary: {
      backgroundColor: '#ffffff',
      color:           '#4f46e5',
      borderColor:     '#c7d2fe',
      borderWidth:     1,
      pressedBg:       '#f5f3ff',
    },
    destructive: {
      backgroundColor: '#e11d48',
      color:           '#ffffff',
      pressedBg:       '#be123c',
    },
    ghost: {
      backgroundColor: 'transparent',
      color:           '#4f46e5',
    },
  },

  // ─────────────────────────────────────────
  // Inputs / Form Fields
  // ─────────────────────────────────────────
  input: {
    height:       52,
    borderRadius: 12,
    paddingH:     16,
    paddingV:     14,
    fontSize:     16,
    lineHeight:   22,
    fontFamily:   'Inter_400Regular',
    resting: {
      backgroundColor:  '#f1f5f9', // slate-100
      borderColor:      'transparent',
      borderWidth:      1,
      color:            '#0f172a',
      placeholderColor: '#94a3b8',
    },
    focused: {
      backgroundColor: '#ffffff',
      borderColor:     '#c7d2fe', // indigo-200
      borderWidth:     1,
      color:           '#0f172a',
    },
    error: {
      backgroundColor: '#fff1f2',
      borderColor:     '#fca5a5', // red-300
      borderWidth:     1,
      color:           '#0f172a',
    },
    disabled: {
      backgroundColor: '#f1f5f9',
      borderColor:     'transparent',
      color:           '#94a3b8',
    },
    label: {
      fontFamily:    'Inter_500Medium',
      fontSize:      11,
      lineHeight:    14,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.8,
      color:         '#475569',
      marginBottom:  6,
    },
    errorText: {
      fontFamily: 'Inter_400Regular',
      fontSize:   12,
      lineHeight: 16,
      color:      '#f43f5e',
      marginTop:  4,
    },
  },

  // ─────────────────────────────────────────
  // Cards
  // ─────────────────────────────────────────
  card: {
    standard: {
      backgroundColor: '#ffffff',
      borderRadius:    12,
      borderWidth:     1,
      borderColor:     '#e2e8f0',
      padding:         16,
    },
    large: {
      backgroundColor: '#ffffff',
      borderRadius:    16,
      borderWidth:     1,
      borderColor:     '#e2e8f0',
      padding:         20,
    },
    hero: {
      borderRadius: 24,
      padding:      20,
    },
  },

  // ─────────────────────────────────────────
  // Transaction Row
  // ─────────────────────────────────────────
  transactionRow: {
    minHeight:            72,
    paddingH:             16,
    paddingV:             12,
    iconSize:             40,
    iconBorderRadius:     12,
    amountFontFamily:     'Inter_600SemiBold',
    amountFontSize:       15,
    descriptionFontSize:  15,
    descriptionFontFamily:'Inter_400Regular',
    metaFontSize:         12,
    metaFontFamily:       'Inter_400Regular',
    metaColor:            '#94a3b8',
  },

  // ─────────────────────────────────────────
  // Navigation
  // ─────────────────────────────────────────
  tabBar: {
    height:           49,
    totalHeight:      83,
    iconSize:         24,
    labelFontSize:    11,
    labelFontFamily:  'Inter_500Medium',
    activeTint:       '#4f46e5',
    inactiveTint:     '#94a3b8',
    backgroundColor:  '#ffffff',
    borderTopWidth:   1,
    borderTopColor:   '#e2e8f0',
  },
  fab: {
    size:            56,
    borderRadius:    28,
    iconSize:        26,
    marginBottom:    20,
    backgroundColor: '#4f46e5',
    iconColor:       '#ffffff',
  },

  // ─────────────────────────────────────────
  // Toasts
  // ─────────────────────────────────────────
  toast: {
    borderRadius: 12,
    paddingH:     16,
    paddingV:     12,
    iconSize:     18,
    fontSize:     14,
    fontFamily:   'Inter_500Medium',
    bottomOffset: 99, // 83 (tabBar) + 16 (gap)
    maxWidth:     343,
    error: {
      backgroundColor: '#fff1f2',
      borderColor:     '#fca5a5',
      borderWidth:     1,
      textColor:       '#be123c',
      iconColor:       '#f43f5e',
    },
    success: {
      backgroundColor: '#ecfdf5',
      borderColor:     '#6ee7b7',
      borderWidth:     1,
      textColor:       '#065f46',
      iconColor:       '#10b981',
    },
    warning: {
      backgroundColor: '#fffbeb',
      borderColor:     '#fde68a',
      borderWidth:     1,
      textColor:       '#92400e',
      iconColor:       '#d97706',
    },
    info: {
      backgroundColor: '#eff6ff',
      borderColor:     '#bfdbfe',
      borderWidth:     1,
      textColor:       '#1e40af',
      iconColor:       '#3b82f6',
    },
  },

  // ─────────────────────────────────────────
  // Badges / Pills
  // ─────────────────────────────────────────
  badge: {
    paddingH:     8,
    paddingV:     3,
    borderRadius: 9999,
    fontSize:     11,
    fontFamily:   'Inter_500Medium',
    lineHeight:   14,
  },

  // ─────────────────────────────────────────
  // Skeleton / Loading Shimmer
  // ─────────────────────────────────────────
  skeleton: {
    baseColor:         '#e2e8f0', // slate-200
    highlightColor:    '#f1f5f9', // slate-100
    borderRadius:      8,
    animationDuration: 1200,      // ms, linear loop
  },

  // ─────────────────────────────────────────
  // Avatar / Icon Circles
  // ─────────────────────────────────────────
  avatar: {
    sm: { size: 32, borderRadius: 16, iconSize: 16 },
    md: { size: 40, borderRadius: 20, iconSize: 20 },
    lg: { size: 48, borderRadius: 24, iconSize: 24 },
    xl: { size: 64, borderRadius: 32, iconSize: 32 },
  },

} as const;
