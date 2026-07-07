import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../../theme';
import { api } from '../../../infrastructure/api';
import { getPhotoUrl } from '../../../infrastructure/config';
import { MessageCircle, User } from 'lucide-react-native';
import AppImage from '../../../shared/components/AppImage';

let LinearGradient;
try { LinearGradient = require('expo-linear-gradient').LinearGradient; } catch (_) {}
const GRADIENT = ['#0A3D3D', '#0D5C5C', '#1A7A6E', '#3A9E7A'];

export default function OwnerChatScreen({ navigation }) {
    const [chats, setChats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const insets = useSafeAreaInsets();

    useEffect(() => {
        fetchChats();
        const id = setInterval(() => {
            fetchChats();
        }, 30000);
        return () => clearInterval(id);
    }, []);

    const fetchChats = async (isRefresh = false) => {
        try {
            const res = await api.get('/owner/chats');
            setChats(Array.isArray(res.data) ? res.data : []);
        } catch (e) {
            console.log('Error fetching owner chats', e);
            setChats([]);
        } finally {
            if (isRefresh) setRefreshing(false);
            else setLoading(false);
        }
    };

    const onRefresh = () => {
        if (refreshing) return;
        setRefreshing(true);
        fetchChats(true);
    };

    const filteredChats = chats.filter(
        chat =>
            (chat.user_name || chat.client_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (chat.boat_title || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const normalizeAvatarSrc = (raw) => {
        const val = typeof raw === 'string' ? raw.trim() : '';
        if (!val || val === 'null' || val === 'undefined') return null;
        return getPhotoUrl(val) || val;
    };

    const renderChatItem = ({ item }) => {
        const avatarSrc = normalizeAvatarSrc(item.client_avatar);
        const hasUnread = (item.unread_count || 0) > 0;
        return (
            <TouchableOpacity
                style={[styles.chatItem, hasUnread && styles.chatItemUnread]}
                onPress={() => navigation.navigate('ChatDetail', { chatId: item.id })}
            >
                <View style={styles.avatarContainer}>
                    {avatarSrc ? (
                        <AppImage uri={avatarSrc} style={styles.avatar} />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <User size={24} color={theme.colors.textMuted} />
                        </View>
                    )}
                </View>
                <View style={styles.chatContent}>
                    <View style={styles.chatTopRow}>
                        <View style={styles.nameColumn}>
                            <Text
                                style={[styles.clientName, hasUnread && styles.clientNameUnread]}
                                numberOfLines={1}
                            >
                                {item.user_name || item.client_name || '—'}
                            </Text>
                        </View>
                        <View style={styles.metaRight}>
                            {hasUnread && (
                                <View style={styles.unreadBadgeRight}>
                                    <Text style={styles.unreadBadgeRightText}>
                                        {item.unread_count > 99 ? '99+' : item.unread_count}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                    <Text style={styles.boatTitle} numberOfLines={1}>{item.boat_title || 'Катер'}</Text>
                    <View style={styles.messageContainer}>
                        <MessageCircle size={14} color={hasUnread ? '#1A7A6E' : theme.colors.textMuted} />
                        <Text
                            style={[styles.lastMessage, hasUnread && styles.lastMessageUnread]}
                            numberOfLines={1}
                        >
                            {item.last_message || ''}
                        </Text>
                        {(item.last_message_time || item.last_message_date) ? (
                            <Text style={styles.lastMessageMeta} numberOfLines={1}>
                                {[item.last_message_date, item.last_message_time].filter(Boolean).join(' · ')}
                            </Text>
                        ) : null}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.headerWrap}>
                {LinearGradient ? (
                    <LinearGradient
                        colors={GRADIENT}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFillObject}
                    />
                ) : (
                    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#0D5C5C' }]} />
                )}
                <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                    <Text style={[theme.typography.h1, { color: '#fff' }]}>Сообщения</Text>
                    <Text style={[theme.typography.body, { color: 'rgba(255,255,255,0.82)', marginTop: 4 }]}>
                        Чаты с клиентами
                    </Text>
                </View>
            </View>

            <View style={styles.searchContainer}>
                <View style={styles.searchInputContainer}>
                    <MessageCircle size={18} color={theme.colors.textMuted} style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Поиск по клиентам или катерам"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholderTextColor={theme.colors.textMuted}
                    />
                </View>
            </View>

            {loading ? (
                <View style={styles.centered}><Text style={theme.typography.body}>Загрузка...</Text></View>
            ) : (
                <FlatList
                    data={filteredChats}
                    renderItem={renderChatItem}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={'#0D5C5C'}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <MessageCircle size={64} color={theme.colors.border} />
                            <Text style={[theme.typography.h2, { marginTop: theme.spacing.md, marginBottom: theme.spacing.sm }]}>
                                Нет сообщений
                            </Text>
                            <Text style={[theme.typography.body, { color: theme.colors.textMuted, textAlign: 'center' }]}>
                                Сообщения от клиентов появятся здесь
                            </Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    headerWrap: {
        paddingBottom: theme.spacing.md,
        overflow: 'hidden',
    },
    header: {
        paddingHorizontal: theme.spacing.lg,
        paddingBottom: theme.spacing.md,
    },
    searchContainer: { paddingHorizontal: theme.spacing.md, marginTop: theme.spacing.sm, marginBottom: theme.spacing.sm },
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.pill,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    searchIcon: { marginRight: theme.spacing.xs },
    searchInput: { flex: 1, fontSize: 14, color: theme.colors.textMain, lineHeight: 18 },
    listContainer: { paddingHorizontal: theme.spacing.lg, paddingBottom: 100 },
    chatItem: {
        flexDirection: 'row',
        width: '100%',
        backgroundColor: theme.colors.surface,
        borderRadius: 24,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
    },
    chatItemUnread: { backgroundColor: 'rgba(26, 122, 110, 0.07)' },
    clientNameUnread: { color: '#0A3D3D', fontFamily: theme.fonts.bold },
    chatTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    nameColumn: { flex: 1, minWidth: 0, marginRight: theme.spacing.sm },
    metaRight: { flexShrink: 0 },
    unreadBadgeRight: {
        minWidth: 24,
        height: 24,
        paddingHorizontal: 7,
        borderRadius: 12,
        backgroundColor: '#1A7A6E',
        justifyContent: 'center',
        alignItems: 'center',
    },
    unreadBadgeRightText: { color: '#fff', fontSize: 12, fontFamily: theme.fonts.bold },
    lastMessageUnread: { fontFamily: theme.fonts.bold, color: theme.colors.textMain },
    avatarContainer: { marginRight: theme.spacing.md },
    avatarPlaceholder: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: theme.colors.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatar: { width: 56, height: 56, borderRadius: 28 },
    chatContent: { flex: 1, justifyContent: 'center', minWidth: 0 },
    clientName: { ...theme.typography.body, fontWeight: '600' },
    boatTitle: { ...theme.typography.bodySm, color: theme.colors.textMuted, marginBottom: 4 },
    messageContainer: { flexDirection: 'row', alignItems: 'center', minWidth: 0 },
    lastMessage: {
        ...theme.typography.bodySm,
        color: theme.colors.textMain,
        marginLeft: 6,
        flex: 1,
        minWidth: 0,
    },
    lastMessageMeta: {
        ...theme.typography.caption,
        color: theme.colors.textMuted,
        marginLeft: 8,
        flexShrink: 0,
    },
    emptyState: { alignItems: 'center', paddingVertical: theme.spacing.xl, paddingHorizontal: theme.spacing.xl },
});
