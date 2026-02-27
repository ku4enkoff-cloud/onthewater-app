import React from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    ChevronLeft, Phone, Mail, HelpCircle, AlertTriangle, Anchor, FileText, Shield,
} from 'lucide-react-native';
import { theme } from '../../shared/theme';

let LinearGradient;
try { LinearGradient = require('expo-linear-gradient').LinearGradient; } catch (_) {}

const GRADIENT = ['#0A3D3D', '#0D5C5C', '#1A7A6E'];
const TEAL = '#0D5C5C';
const NAVY = '#1B365D';

export default function OwnerSupportScreen({ navigation }) {
    const insets = useSafeAreaInsets();

    const openPhone = () => Linking.openURL('tel:+78001234567');
    const openEmail = () => Linking.openURL('mailto:support@onthewater.ru');
    const openSite = () => Linking.openURL('https://onthewater.ru/support');
    const openEmergency = () => Linking.openURL('tel:112');

    return (
        <View style={s.root}>
            {/* Header */}
            <View style={s.headerWrap}>
                {LinearGradient ? (
                    <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
                ) : (
                    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: TEAL }]} />
                )}
                <View style={[s.headerInner, { paddingTop: insets.top + 4 }]}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                        <ChevronLeft size={24} color="#fff" />
                        <Text style={s.backText}>Назад</Text>
                    </TouchableOpacity>
                    <Text style={s.headerTitle}>Поддержка</Text>
                    <View style={{ width: 70 }} />
                </View>
            </View>

            <ScrollView
                style={s.scroll}
                contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Questions / app support */}
                <View style={s.section}>
                    <Text style={s.sectionTitle}>Вопросы и поддержка</Text>

                    <TouchableOpacity style={s.row} onPress={openPhone} activeOpacity={0.6}>
                        <Phone size={20} color={TEAL} strokeWidth={1.6} />
                        <Text style={s.rowText}>Позвонить: +7 (800) 123-45-67</Text>
                    </TouchableOpacity>
                    <View style={s.rowDivider} />

                    <TouchableOpacity style={s.row} onPress={openEmail} activeOpacity={0.6}>
                        <Mail size={20} color={TEAL} strokeWidth={1.6} />
                        <Text style={s.rowText}>support@onthewater.ru</Text>
                    </TouchableOpacity>
                    <View style={s.rowDivider} />

                    <TouchableOpacity style={s.row} onPress={openSite} activeOpacity={0.6}>
                        <HelpCircle size={20} color={TEAL} strokeWidth={1.6} />
                        <Text style={s.rowText}>Посетить сайт поддержки</Text>
                    </TouchableOpacity>
                    <View style={s.rowDivider} />
                </View>

                {/* Emergency contacts */}
                <View style={s.section}>
                    <Text style={s.sectionTitle}>Экстренные контакты</Text>

                    <TouchableOpacity style={s.row} onPress={openEmergency} activeOpacity={0.6}>
                        <AlertTriangle size={20} color={TEAL} strokeWidth={1.6} />
                        <Text style={s.rowText}>112 — Экстренные службы</Text>
                    </TouchableOpacity>
                    <View style={s.rowDivider} />

                    <TouchableOpacity style={s.row} onPress={() => {}} activeOpacity={0.6}>
                        <Anchor size={20} color={TEAL} strokeWidth={1.6} />
                        <Text style={s.rowText}>ГИМС (поддержка на воде)</Text>
                    </TouchableOpacity>
                    <View style={s.rowDivider} />
                </View>

                {/* Legal */}
                <View style={s.section}>
                    <Text style={s.sectionTitle}>Юридическая информация</Text>

                    <TouchableOpacity style={s.row} onPress={() => {}} activeOpacity={0.6}>
                        <Shield size={20} color={TEAL} strokeWidth={1.6} />
                        <Text style={s.rowText}>Политика конфиденциальности</Text>
                    </TouchableOpacity>
                    <View style={s.rowDivider} />

                    <TouchableOpacity style={s.row} onPress={() => {}} activeOpacity={0.6}>
                        <FileText size={20} color={TEAL} strokeWidth={1.6} />
                        <Text style={s.rowText}>Условия обслуживания</Text>
                    </TouchableOpacity>
                    <View style={s.rowDivider} />
                </View>
            </ScrollView>
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#fff' },

    headerWrap: { overflow: 'hidden' },
    headerInner: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingBottom: 14,
    },
    backBtn: { flexDirection: 'row', alignItems: 'center', width: 70 },
    backText: { fontSize: 15, fontFamily: theme.fonts.regular, color: '#fff', marginLeft: 2 },
    headerTitle: { fontSize: 17, fontFamily: theme.fonts.bold, color: '#fff' },

    scroll: { flex: 1 },

    section: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 4 },
    sectionTitle: {
        fontSize: 20, fontFamily: theme.fonts.bold, color: NAVY, marginBottom: 16,
    },

    row: {
        flexDirection: 'row', alignItems: 'center', paddingVertical: 16,
    },
    rowText: {
        fontSize: 16, fontFamily: theme.fonts.regular, color: TEAL, marginLeft: 16,
    },
    rowDivider: {
        height: StyleSheet.hairlineWidth, backgroundColor: '#E5E7EB',
    },
});
