// WaveRentals — Boatsetter-style palette
const fonts = {
    light: 'Jost_300Light',
    regular: 'Jost_400Regular',
    medium: 'Jost_500Medium',
    semiBold: 'Jost_600SemiBold',
    bold: 'Jost_700Bold',
};

export const theme = {
    fonts,
    colors: {
        primary: '#1B365D',
        primaryLight: '#2A4A7F',
        accent: '#1B365D',
        dark: '#0F2341',
        navy: '#1B365D',
        star: '#fbbf24',
        background: '#FFFFFF',
        backgroundWarm: '#FBF8F3',
        surface: '#F7F4EF',
        gray50: '#F9FAFB',
        gray100: '#F3F4F6',
        gray200: '#E8E5E0',
        gray400: '#9CA3AF',
        gray500: '#6B7280',
        gray700: '#374151',
        gray900: '#111827',
        textMain: '#1B365D',
        textMuted: '#6B7280',
        waveDark: '#1B365D', // фон сплэша и загрузки
        border: '#E5E7EB',
        success: '#10B981',
        error: '#EF4444',
    },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
    typography: {
        h1: { fontSize: 28, fontFamily: fonts.bold, color: '#1B365D' },
        h2: { fontSize: 22, fontFamily: fonts.bold, color: '#1B365D' },
        h3: { fontSize: 18, fontFamily: fonts.semiBold, color: '#1B365D' },
        body: { fontSize: 16, fontFamily: fonts.regular, color: '#374151' },
        bodySm: { fontSize: 14, fontFamily: fonts.regular, color: '#6B7280' },
        caption: { fontSize: 12, fontFamily: fonts.regular, color: '#9CA3AF' },
    },
    borderRadius: { sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, pill: 9999 },
    shadows: {
        card: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
    },
};
