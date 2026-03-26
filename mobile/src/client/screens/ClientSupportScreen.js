import React from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Modal, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    ChevronLeft, Mail, AlertTriangle, FileText, Shield, Lock, X,
} from 'lucide-react-native';
import { theme } from '../../shared/theme';
import { api } from '../../shared/infrastructure/api';
import { WebView } from 'react-native-webview';

const BLUE = '#1E40AF';
const TITLE = '#111827';

const LEGAL_MENU = [
    { slug: 'privacy_policy', title: 'Политика конфиденциальности', Icon: Shield },
    { slug: 'terms_of_service', title: 'Условия обслуживания', Icon: FileText },
    { slug: 'personal_data_processing', title: 'Условия обработки персональных данных', Icon: Lock },
];

export default function ClientSupportScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const [legalModalVisible, setLegalModalVisible] = React.useState(false);
    const [legalLoading, setLegalLoading] = React.useState(false);
    const [legalError, setLegalError] = React.useState('');
    const [legalTitle, setLegalTitle] = React.useState('');
    const [legalBody, setLegalBody] = React.useState('');

    const openEmail = () => Linking.openURL('mailto:support@onthewater.ru');
    const openEmergency = () => Linking.openURL('tel:112');
    const buildLegalHtml = React.useCallback((body = '') => {
        const text = String(body || '').trim();
        const escaped = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
        const content = escaped
            ? `<div style="white-space: pre-wrap;">${escaped}</div>`
            : '<p>Текст документа пока не заполнен.</p>';
        return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{margin:0;padding:16px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:16px;line-height:1.55;color:#000;background:#fff;}a{color:#000;}</style></head><body>${content}</body></html>`;
    }, []);

    const openLegalModal = React.useCallback(async (slug, fallbackTitle) => {
        setLegalModalVisible(true);
        setLegalLoading(true);
        setLegalError('');
        setLegalTitle(fallbackTitle);
        setLegalBody('');
        try {
            const { data } = await api.get(`/legal-documents/${encodeURIComponent(slug)}`);
            setLegalTitle(data?.title || fallbackTitle);
            setLegalBody(typeof data?.body === 'string' ? data.body : '');
        } catch (e) {
            setLegalError(e.response?.data?.error || e.message || 'Не удалось загрузить документ');
        } finally {
            setLegalLoading(false);
        }
    }, []);

    return (
        <View style={s.root}>
            <View style={[s.header, { paddingTop: insets.top + 6, height: insets.top + 52 }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                    <ChevronLeft size={22} color={TITLE} />
                </TouchableOpacity>
                <Text style={s.headerTitle}>Поддержка</Text>
                <View style={s.backBtn} />
            </View>

            <ScrollView
                style={s.scroll}
                contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
                showsVerticalScrollIndicator={false}
            >
                <View style={s.section}>
                    <Text style={s.sectionTitle}>Вопросы и поддержка</Text>
                    <TouchableOpacity style={s.row} onPress={openEmail} activeOpacity={0.7}>
                        <Mail size={20} color={BLUE} strokeWidth={1.8} />
                        <Text style={s.rowText}>support@onthewater.ru</Text>
                    </TouchableOpacity>
                </View>

                <View style={s.section}>
                    <Text style={s.sectionTitle}>Экстренные контакты</Text>
                    <TouchableOpacity style={s.row} onPress={openEmergency} activeOpacity={0.7}>
                        <AlertTriangle size={20} color={BLUE} strokeWidth={1.8} />
                        <Text style={s.rowText}>112 — Экстренные службы</Text>
                    </TouchableOpacity>
                </View>

                <View style={s.section}>
                    <Text style={s.sectionTitle}>Юридическая информация</Text>
                    {LEGAL_MENU.map((item, index) => {
                        const Icon = item.Icon;
                        return (
                            <React.Fragment key={item.slug}>
                                <TouchableOpacity
                                    style={s.row}
                                    onPress={() => openLegalModal(item.slug, item.title)}
                                    activeOpacity={0.7}
                                >
                                    <Icon size={20} color={BLUE} strokeWidth={1.8} />
                                    <Text style={s.rowText}>{item.title}</Text>
                                </TouchableOpacity>
                                {index < LEGAL_MENU.length - 1 ? <View style={s.rowDivider} /> : null}
                            </React.Fragment>
                        );
                    })}
                </View>
            </ScrollView>

            <Modal visible={legalModalVisible} animationType="slide" transparent onRequestClose={() => setLegalModalVisible(false)}>
                <View style={s.modalOverlay}>
                    <View style={[s.legalModal, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
                        <View style={s.legalModalHeader}>
                            <Text style={s.legalModalTitle} numberOfLines={2}>{legalTitle || 'Документ'}</Text>
                            <TouchableOpacity onPress={() => setLegalModalVisible(false)} hitSlop={12}>
                                <X size={24} color={theme.colors.gray700} />
                            </TouchableOpacity>
                        </View>
                        {legalLoading ? (
                            <View style={s.legalCentered}>
                                <ActivityIndicator size="large" color={theme.colors.primary} />
                            </View>
                        ) : legalError ? (
                            <View style={s.legalCentered}>
                                <Text style={s.legalErrorText}>{legalError}</Text>
                            </View>
                        ) : (
                            <WebView
                                source={{ html: buildLegalHtml(legalBody) }}
                                style={s.legalWebView}
                                originWhitelist={['*']}
                                startInLoadingState
                                renderLoading={() => (
                                    <View style={s.legalCentered}>
                                        <ActivityIndicator size="large" color={theme.colors.primary} />
                                    </View>
                                )}
                            />
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#FFFFFF' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        backgroundColor: '#FFFFFF',
    },
    backBtn: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        ...theme.typography.h3,
        color: TITLE,
    },
    scroll: { flex: 1 },
    section: {
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    sectionTitle: {
        ...theme.typography.h2,
        color: TITLE,
        marginBottom: 8,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
    },
    rowText: {
        flex: 1,
        marginLeft: 12,
        ...theme.typography.body,
        color: BLUE,
    },
    rowDivider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: '#E5E7EB',
    },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    legalModal: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: '90%',
        overflow: 'hidden',
    },
    legalModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.lg,
        paddingBottom: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.gray100,
    },
    legalModalTitle: {
        flex: 1,
        fontSize: 19,
        fontFamily: theme.fonts.bold,
        color: theme.colors.gray900,
        marginRight: theme.spacing.sm,
    },
    legalWebView: { flex: 1, backgroundColor: '#fff' },
    legalCentered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: theme.spacing.lg,
    },
    legalErrorText: { fontSize: 15, color: theme.colors.error, textAlign: 'center' },
});
