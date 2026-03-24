import React, { useEffect, useState, useMemo } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import { theme } from '../../shared/theme';
import { api } from '../../shared/infrastructure/api';

const TEAL = '#0D5C5C';

let LinearGradient;
try { LinearGradient = require('expo-linear-gradient').LinearGradient; } catch (_) {}
const GRADIENT = ['#0A3D3D', '#0D5C5C', '#1A7A6E'];

function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function looksLikeHtml(s) {
    const t = (s || '').trim();
    return t.startsWith('<') && />/.test(t);
}

function buildHtmlDocument(body) {
    const raw = (body || '').trim();
    if (!raw) {
        return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>body{margin:0;font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:16px;padding:16px;color:#64748b;line-height:1.5;}</style></head>
<body><p>Текст документа пока не заполнен. Его можно добавить в админ-панели (раздел «Документы»).</p></body></html>`;
    }
    const inner = looksLikeHtml(raw)
        ? raw
        : `<div style="white-space:pre-wrap;">${escapeHtml(raw)}</div>`;
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>body{margin:0;font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:16px;color:#0d5c5c;line-height:1.55;padding:16px;} a{color:#0d5c5c;}</style></head><body>${inner}</body></html>`;
}

export default function OwnerLegalDocumentScreen({ navigation, route }) {
    const insets = useSafeAreaInsets();
    const slug = route.params?.slug;
    const initialTitle = route.params?.title || 'Документ';

    const [title, setTitle] = useState(initialTitle);
    const [body, setBody] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!slug) {
            setError('Не указан документ');
            setLoading(false);
            return;
        }
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError('');
            try {
                const { data } = await api.get(`/legal-documents/${encodeURIComponent(slug)}`);
                if (cancelled) return;
                if (data?.title) setTitle(data.title);
                setBody(typeof data?.body === 'string' ? data.body : '');
            } catch (e) {
                if (!cancelled) {
                    setError(e.response?.data?.error || e.message || 'Не удалось загрузить документ');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [slug]);

    const htmlSource = useMemo(() => ({ html: buildHtmlDocument(body) }), [body]);

    return (
        <View style={s.root}>
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
                    <Text style={s.headerTitle} numberOfLines={1}>{title}</Text>
                    <View style={{ width: 70 }} />
                </View>
            </View>

            {loading ? (
                <View style={s.centered}>
                    <ActivityIndicator size="large" color={TEAL} />
                </View>
            ) : error ? (
                <ScrollView contentContainerStyle={[s.centered, { padding: 24, paddingBottom: insets.bottom + 24 }]}>
                    <Text style={s.errorText}>{error}</Text>
                </ScrollView>
            ) : (
                <WebView
                    source={htmlSource}
                    style={s.webview}
                    originWhitelist={['*']}
                    startInLoadingState
                    renderLoading={() => (
                        <View style={s.centered}>
                            <ActivityIndicator size="large" color={TEAL} />
                        </View>
                    )}
                />
            )}
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
    headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontFamily: theme.fonts.bold, color: '#fff', marginHorizontal: 8 },
    webview: { flex: 1, backgroundColor: '#fff' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    errorText: { fontSize: 15, fontFamily: theme.fonts.regular, color: '#b91c1c', textAlign: 'center' },
});
