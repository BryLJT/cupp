export const colors = {
  ground: '#EFE7DA', // app background
  surface: '#FBF8F2', // cards, sheets, inputs
  ink: '#2E2119', // primary text
  taupe: '#6E6052', // secondary text
  accent: '#8A5A33', // primary buttons, scan shutter, read chips, rating marks
  onAccent: '#FBF8F2', // text/icons on accent
  line: '#D8CCBB', // borders, dividers
  camera: '#3A3129', // viewfinder backdrop
} as const;

export const radii = { chip: 999, control: 8, card: 10, sheet: 16 } as const;

export const space = (n: number) => n * 4; // 4pt grid

// Font family names — these are the exact loaded family strings from
// @expo-google-fonts/fraunces and @expo-google-fonts/inter. The root layout
// (another work package) calls useFonts to load them; if not yet loaded, text
// falls back to the system font (that must not crash). Use Fraunces (serif) for
// the wordmark, bean names, and big numbers; Inter (sans) for everything else.
export const fonts = {
  serifRegular: 'Fraunces_400Regular',
  serifSemiBold: 'Fraunces_600SemiBold',
  serifBold: 'Fraunces_700Bold',
  sansRegular: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemiBold: 'Inter_600SemiBold',
  sansBold: 'Inter_700Bold',
} as const;
