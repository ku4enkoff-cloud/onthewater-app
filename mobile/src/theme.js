export const theme = {
    colors: {
        primary: '#0F52BA',    // Насыщенный синий (Сапфир), как у Boatsetter
        primaryLight: '#E6F0FA',
        secondary: '#FF5A5F',  // Яркий акцент для кнопок и цен
        background: '#FFFFFF',
        surface: '#F7F7F9',
        textMain: '#222222',
        textMuted: '#717171',
        border: '#EBEBEB',
        success: '#00A699',
        error: '#D93900'
    },
    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
        xxl: 48
    },
    typography: {
        h1: { fontSize: 32, fontWeight: 'bold', color: '#222222' },
        h2: { fontSize: 24, fontWeight: 'bold', color: '#222222' },
        h3: { fontSize: 18, fontWeight: '600', color: '#222222' },
        body: { fontSize: 16, color: '#222222' },
        bodySm: { fontSize: 14, color: '#717171' },
        caption: { fontSize: 12, color: '#717171' }
    },
    borderRadius: {
        sm: 8,
        md: 12,
        lg: 16,
        pill: 9999
    },
    shadows: {
        card: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 3,
        }
    }
};
