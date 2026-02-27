import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Mail, Anchor } from 'lucide-react-native';
import { theme } from '../../shared/theme';

let LinearGradient;
try {
    LinearGradient = require('expo-linear-gradient').LinearGradient;
} catch (_) {
    LinearGradient = null;
}

const GRADIENT_COLORS = ['#0A3D3D', '#0D5C5C', '#1A7A6E', '#3A9E7A', '#6BBF8A'];
const BUTTON_COLOR = '#E8A838';
const FALLBACK_BG = '#0D5C5C';
const BRAND = 'onthewater';

export default function WelcomeScreen({ navigation }) {
    return (
        <View style={s.container}>
            {LinearGradient ? (
                <LinearGradient
                    colors={GRADIENT_COLORS}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFillObject}
                />
            ) : (
                <View style={[StyleSheet.absoluteFillObject, { backgroundColor: FALLBACK_BG }]} />
            )}

            <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
                <StatusBar style="light" />

                {/* Top spacer */}
                <View style={s.topSpacer} />

                {/* Logo + Welcome */}
                <View style={s.heroBlock}>
                    <View style={s.logoRow}>
                        <View style={s.logoCircle}>
                            <Anchor size={30} color="#fff" strokeWidth={1.8} />
                        </View>
                        <Text style={s.logoText}>{BRAND}</Text>
                    </View>
                    <Text style={s.welcomeText}>Welcome to {BRAND}</Text>
                </View>

                {/* CTA */}
                <View style={s.ctaBlock}>
                    <TouchableOpacity
                        style={s.signUpBtn}
                        onPress={() => navigation.navigate('Register')}
                        activeOpacity={0.85}
                    >
                        <Mail size={20} color="#fff" strokeWidth={2} />
                        <Text style={s.signUpBtnText}>РЕГИСТРАЦИЯ</Text>
                    </TouchableOpacity>

                    <View style={s.divider} />

                    <Text style={s.rentQuestion}>Хотите арендовать катер?</Text>
                    <TouchableOpacity onPress={() => {}} activeOpacity={0.7}>
                        <Text style={s.rentLink}>Скачайте приложение {BRAND}</Text>
                    </TouchableOpacity>
                </View>

                {/* Bottom spacer pushes sign-in down */}
                <View style={s.bottomSpacer} />

                {/* Sign in */}
                <View style={s.signInBlock}>
                    <Text style={s.signInLabel}>Уже есть аккаунт?</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Login')} activeOpacity={0.7}>
                        <Text style={s.signInLink}>Войти</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1 },
    safe: { flex: 1 },

    topSpacer: { flex: 1.2 },

    heroBlock: { alignItems: 'center', paddingHorizontal: 32 },
    logoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    logoCircle: {
        width: 46, height: 46, borderRadius: 23,
        borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)',
        justifyContent: 'center', alignItems: 'center',
        marginRight: 10,
    },
    logoText: {
        fontSize: 28, fontFamily: theme.fonts.semiBold, color: '#fff',
        letterSpacing: 0.3,
    },
    welcomeText: {
        fontSize: 20, fontFamily: theme.fonts.regular, color: '#fff',
        textAlign: 'center', marginTop: 4, opacity: 0.9,
    },

    ctaBlock: { alignItems: 'center', paddingHorizontal: 40, marginTop: 40 },
    signUpBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: BUTTON_COLOR, width: '100%',
        paddingVertical: 16, borderRadius: 12, gap: 10,
    },
    signUpBtnText: {
        fontSize: 16, fontFamily: theme.fonts.bold, color: '#fff',
        letterSpacing: 1,
    },

    divider: {
        width: '90%', height: StyleSheet.hairlineWidth,
        backgroundColor: 'rgba(255,255,255,0.25)', marginVertical: 28,
    },

    rentQuestion: {
        fontSize: 15, fontFamily: theme.fonts.regular, color: '#fff',
        marginBottom: 6,
    },
    rentLink: {
        fontSize: 15, fontFamily: theme.fonts.semiBold, color: '#8CD6B0',
    },

    bottomSpacer: { flex: 2 },

    signInBlock: { alignItems: 'center', paddingBottom: 16 },
    signInLabel: {
        fontSize: 15, fontFamily: theme.fonts.regular,
        color: 'rgba(255,255,255,0.8)', marginBottom: 4,
    },
    signInLink: {
        fontSize: 16, fontFamily: theme.fonts.semiBold, color: '#8CD6B0',
    },
});
