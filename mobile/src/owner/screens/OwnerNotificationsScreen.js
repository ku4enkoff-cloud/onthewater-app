import React, { useContext, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Lock } from 'lucide-react-native';
import { AuthContext } from '../../shared/context/AuthContext';
import { NotificationsContext } from '../../shared/context/NotificationsContext';
import { theme } from '../../shared/theme';

let LinearGradient;
try { LinearGradient = require('expo-linear-gradient').LinearGradient; } catch (_) {}

const GRADIENT = ['#0A3D3D', '#0D5C5C', '#1A7A6E'];
const TEAL = '#0D5C5C';
const NAVY = '#1B365D';

export default function OwnerNotificationsScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const authCtx = useContext(AuthContext);
    const user = authCtx?.user;
    const { pushEnabled, setPushEnabled } = useContext(NotificationsContext);

    const phone = user?.phone || '';
    const email = user?.email || '';

    const [emailBooking, setEmailBooking] = useState(true);
    const [emailMessages, setEmailMessages] = useState(true);
    const [emailNews, setEmailNews] = useState(true);

    const [smsBooking, setSmsBooking] = useState(true);
    const [smsMessages, setSmsMessages] = useState(true);
    const [smsNews, setSmsNews] = useState(true);

    const trackColor = { false: '#E0E4EA', true: TEAL };

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
                    <Text style={s.headerTitle}>Настройки уведомлений</Text>
                    <View style={{ width: 70 }} />
                </View>
            </View>

            <ScrollView
                style={s.scroll}
                contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
                showsVerticalScrollIndicator={false}
            >
                {/* ======== EMAIL ======== */}
                <View style={s.section}>
                    <Text style={s.sectionTitle}>Email</Text>
                    <Text style={s.sectionSub}>
                        Настройки для: <Text style={s.bold}>{email}</Text>
                    </Text>
                    <Text style={s.sectionHint}>
                        Вы не можете отключить уведомления о бронированиях по email, но можете отключить SMS и Push-уведомления.
                    </Text>

                    <View style={s.toggleRow}>
                        <Text style={s.toggleLabel}>Бронирования</Text>
                        <View style={s.toggleRight}>
                            <Switch
                                value={emailBooking}
                                onValueChange={setEmailBooking}
                                trackColor={trackColor}
                                thumbColor="#fff"
                                disabled
                            />
                            <Lock size={14} color={theme.colors.gray400} style={{ marginLeft: 6 }} />
                        </View>
                    </View>
                    <View style={s.toggleRow}>
                        <Text style={s.toggleLabel}>Уведомления о сообщениях</Text>
                        <Switch value={emailMessages} onValueChange={setEmailMessages} trackColor={trackColor} thumbColor="#fff" />
                    </View>
                    <View style={s.toggleRow}>
                        <Text style={s.toggleLabel}>Новости и акции</Text>
                        <Switch value={emailNews} onValueChange={setEmailNews} trackColor={trackColor} thumbColor="#fff" />
                    </View>
                </View>

                <View style={s.divider} />

                {/* ======== SMS ======== */}
                <View style={s.section}>
                    <Text style={s.sectionTitle}>SMS</Text>
                    <Text style={s.sectionSub}>
                        Номер телефона: <Text style={s.bold}>{phone || 'не указан'}</Text>
                    </Text>
                    <Text style={s.sectionHint}>
                        Ставя отметку в поле SMS, вы соглашаетесь на получение текстовых сообщений от onthewater через автоматизированную систему обмена сообщениями на указанный выше номер телефона. Вы также подтверждаете, что ваше согласие здесь является вашей электронной подписью. Согласие не является условием для приобретения каких-либо услуг. Ответьте HELP для помощи или STOP для отмены. Ознакомьтесь с нашими{' '}
                        <Text style={s.link} onPress={() => {}}>Условиями обслуживания</Text>,{' '}
                        <Text style={s.link} onPress={() => {}}>Политикой конфиденциальности</Text> и{' '}
                        <Text style={s.link} onPress={() => {}}>Политикой SMS-рассылок</Text>.
                    </Text>

                    <View style={s.toggleRow}>
                        <Text style={s.toggleLabel}>Бронирования</Text>
                        <Switch value={smsBooking} onValueChange={setSmsBooking} trackColor={trackColor} thumbColor="#fff" />
                    </View>
                    <View style={s.toggleRow}>
                        <Text style={s.toggleLabel}>Уведомления о сообщениях</Text>
                        <Switch value={smsMessages} onValueChange={setSmsMessages} trackColor={trackColor} thumbColor="#fff" />
                    </View>
                    <View style={s.toggleRow}>
                        <Text style={s.toggleLabel}>Новости и акции</Text>
                        <Switch value={smsNews} onValueChange={setSmsNews} trackColor={trackColor} thumbColor="#fff" />
                    </View>
                </View>

                <View style={s.divider} />

                {/* ======== PUSH ======== */}
                <View style={s.section}>
                    <Text style={s.sectionTitle}>Push</Text>
                    <Text style={s.sectionHint}>
                        Для получения push-уведомлений убедитесь, что они включены в{' '}
                        <Text style={s.link} onPress={() => Linking.openSettings()}>настройках вашего устройства</Text>{' '}
                        и ниже. Отключив — перестанете получать push.
                    </Text>

                    <View style={s.toggleRow}>
                        <Text style={s.toggleLabel}>Push-уведомления</Text>
                        <Switch value={pushEnabled !== false} onValueChange={setPushEnabled} trackColor={trackColor} thumbColor="#fff" />
                    </View>
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
    headerTitle: { fontSize: 16, fontFamily: theme.fonts.bold, color: '#fff' },

    scroll: { flex: 1 },

    section: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 8 },
    sectionTitle: {
        fontSize: 22, fontFamily: theme.fonts.bold, color: NAVY, marginBottom: 8,
    },
    sectionSub: {
        fontSize: 14, fontFamily: theme.fonts.regular, color: NAVY, marginBottom: 8,
    },
    bold: { fontFamily: theme.fonts.bold },
    sectionHint: {
        fontSize: 13, fontFamily: theme.fonts.regular, color: theme.colors.gray500,
        lineHeight: 19, marginBottom: 16,
    },
    link: {
        color: TEAL, fontFamily: theme.fonts.medium,
        textDecorationLine: 'underline',
    },

    toggleRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingVertical: 14,
    },
    toggleRight: { flexDirection: 'row', alignItems: 'center' },
    toggleLabel: {
        fontSize: 16, fontFamily: theme.fonts.regular, color: NAVY, flex: 1,
    },

    divider: {
        height: StyleSheet.hairlineWidth, backgroundColor: '#E5E7EB',
        marginHorizontal: 24,
    },
});
