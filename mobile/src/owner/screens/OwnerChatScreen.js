import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Image, RefreshControl, Alert, Modal, ActivityIndicator,
} from 'react-native';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../shared/theme';
import { api } from '../../shared/infrastructure/api';
import { getPhotoUrl } from '../../shared/infrastructure/config';
import { MessageCircle, User, Archive, Trash2, X, ArchiveRestore } from 'lucide-react-native';

let LinearGradient;
try { LinearGradient = require('expo-linear-gradient').LinearGradient; } catch (_) {}
const GRADIENT = ['#0A3D3D', '#0D5C5C', '#1A7A6E', '#3A9E7A'];

export default function OwnerChatScreen({ navigation }) {
    const [chats, setChats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [archiveModalVisible, setArchiveModalVisible] = useState(false);
    const [archivedChats, setArchivedChats] = useState([]);
    const [archivedLoading, setArchivedLoading] = useState(false);
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

    const openArchiveModal = async () => {
        setArchiveModalVisible(true);
        setArchivedLoading(true);
        try {
            const res = await api.get('/owner/chats?archived=1');
            setArchivedChats(Array.isArray(res.data) ? res.data : []);
        } catch (e) {
            console.log('Error fetching archived chats', e);
            setArchivedChats([]);
        } finally {
            setArchivedLoading(false);
        }
    };

    const handleUnarchiveChat = async (item) => {
        try {
            await api.patch(`/owner/chats/${item.id}/unarchive`);
            setArchivedChats((prev) => prev.filter((c) => c.id !== item.id));
            setChats((prev) => [item, ...prev]);
        } catch (e) {
            const msg = e.response?.data?.error || e.message || 'Не удалось восстановить чат';
            Alert.alert('Ошибка', msg);
        }
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

    const handleArchive = async (item) => {
        try {
            await api.patch(`/owner/chats/${item.id}/archive`);
            setChats((prev) => prev.filter((c) => c.id !== item.id));
        } catch (e) {
            const data = e.response?.data;
            const msg = data?.error || data?.detail || e.message || 'Не удалось переместить в архив';
            Alert.alert('Ошибка', msg);
        }
    };

    const handleDelete = (item) => {
        Alert.alert(
            'Удалить чат',
            `Удалить чат с «${item.user_name || item.client_name || 'Клиент'}»? Это действие нельзя отменить.`,
            [
                { text: 'Отмена', style: 'cancel' },
                {
                    text: 'Удалить',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.delete(`/owner/chats/${item.id}`);
                            setChats((prev) => prev.filter((c) => c.id !== item.id));
                        } catch (e) {
                            const msg = e.response?.data?.error || e.message || 'Не удалось удалить чат';
                            Alert.alert('Ошибка', msg);
                        }
                    },
                },
            ],
        );
    };

    const renderRightActions = (item) => (
        <View style={styles.swipeActions}>
            <TouchableOpacity
                style={[styles.swipeAction, styles.archiveAction]}
                onPress={() => handleArchive(item)}
            >
                <Archive size={20} color="#fff" />
                <Text style={styles.swipeActionText}>Архив</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.swipeAction, styles.deleteAction]}
                onPress={() => handleDelete(item)}
            >
                <Trash2 size={20} color="#fff" />
                <Text style={styles.swipeActionText}>Удалить</Text>
            </TouchableOpacity>
        </View>
    );

    const renderChatItem = ({ item }) => {
        const avatarSrc = normalizeAvatarSrc(item.client_avatar);
        return (
            <Swipeable renderRightActions={() => renderRightActions(item)} overshootRight={false}>
            <TouchableOpacity
                style={styles.chatItem}
                onPress={() => navigation.navigate('ChatDetail', { chatId: item.id })}
            >
                <View style={styles.avatarContainer}>
                    {avatarSrc ? (
                        <Image source={{ uri: avatarSrc }} style={styles.avatar} />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <User size={24} color={theme.colors.textMuted} />
                        </View>
                    )}
                {item.unread_count > 0 && (
                    <View style={styles.unreadBadge}>
                        <Text style={styles.unreadBadgeText}>{item.unread_count}</Text>
                    </View>
                )}
                </View>
                <View style={styles.chatContent}>
                    <View style={styles.chatHeader}>
                        <Text style={styles.clientName}>{item.user_name || item.client_name || '—'}</Text>
                        <Text style={styles.timeText}>{item.last_message_date || ''} • {item.last_message_time || ''}</Text>
                    </View>
                    <Text style={styles.boatTitle} numberOfLines={1}>{item.boat_title || 'Катер'}</Text>
                    <View style={styles.messageContainer}>
                        <MessageCircle size={14} color={theme.colors.textMuted} />
                        <Text style={styles.lastMessage} numberOfLines={1}>{item.last_message || ''}</Text>
                    </View>
                </View>
            </TouchableOpacity>
            </Swipeable>
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
                    <View style={styles.headerContent}>
                        <View>
                            <Text style={[theme.typography.h1, { color: '#fff' }]}>Сообщения</Text>
                            <Text style={[theme.typography.body, { color: 'rgba(255,255,255,0.82)', marginTop: 4 }]}>
                                Чаты с клиентами
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={styles.archiveIconButton}
                            onPress={openArchiveModal}
                            activeOpacity={0.7}
                            accessibilityLabel="Архив сообщений"
                        >
                            <Archive size={24} color="rgba(255,255,255,0.9)" strokeWidth={1.5} />
                        </TouchableOpacity>
                    </View>
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

            <Modal visible={archiveModalVisible} animationType="slide" transparent onRequestClose={() => setArchiveModalVisible(false)}>
                <GestureHandlerRootView style={styles.modalOverlay}>
                    <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setArchiveModalVisible(false)} />
                    <View style={[styles.archiveModal, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24, maxHeight: '90%' }]}>
                        <View style={styles.archiveModalHeader}>
                            <Text style={styles.archiveModalTitle}>Архив диалогов</Text>
                            <TouchableOpacity onPress={() => setArchiveModalVisible(false)} hitSlop={12}>
                                <X size={24} color={theme.colors.gray700} />
                            </TouchableOpacity>
                        </View>
                        {archivedLoading ? (
                            <View style={styles.archiveModalLoading}>
                                <ActivityIndicator size="large" color={theme.colors.primary} />
                            </View>
                        ) : archivedChats.length === 0 ? (
                            <View style={styles.archiveModalEmpty}>
                                <Archive size={48} color={theme.colors.gray400} />
                                <Text style={styles.archiveModalEmptyText}>Нет заархивированных диалогов</Text>
                            </View>
                        ) : (
                            <FlatList
                                data={archivedChats}
                                renderItem={({ item }) => {
                                    const avatarSrc = normalizeAvatarSrc(item.client_avatar);
                                    return (
                                        <Swipeable
                                            renderRightActions={() => (
                                                <TouchableOpacity
                                                    style={styles.unarchiveAction}
                                                    onPress={() => handleUnarchiveChat(item)}
                                                    activeOpacity={0.8}
                                                >
                                                    <ArchiveRestore size={22} color="#fff" strokeWidth={2} />
                                                    <Text style={styles.unarchiveActionText}>Разархивировать</Text>
                                                </TouchableOpacity>
                                            )}
                                            overshootRight={false}
                                            friction={2}
                                        >
                                            <TouchableOpacity
                                                style={styles.chatItem}
                                                onPress={() => {
                                                    setArchiveModalVisible(false);
                                                    navigation.navigate('ChatDetail', { chatId: item.id });
                                                }}
                                                activeOpacity={0.7}
                                            >
                                                <View style={styles.avatarContainer}>
                                                    {avatarSrc ? (
                                                        <Image source={{ uri: avatarSrc }} style={styles.avatar} />
                                                    ) : (
                                                        <View style={styles.avatarPlaceholder}>
                                                            <User size={24} color={theme.colors.textMuted} />
                                                        </View>
                                                    )}
                                                </View>
                                                <View style={styles.chatContent}>
                                                    <View style={styles.chatHeader}>
                                                        <Text style={styles.clientName}>{item.user_name || item.client_name || '—'}</Text>
                                                    </View>
                                                    <Text style={styles.boatTitle} numberOfLines={1}>{item.boat_title || 'Катер'}</Text>
                                                    <View style={styles.messageContainer}>
                                                        <MessageCircle size={14} color={theme.colors.textMuted} />
                                                        <Text style={styles.lastMessage} numberOfLines={1}>{item.last_message || ''}</Text>
                                                    </View>
                                                </View>
                                            </TouchableOpacity>
                                        </Swipeable>
                                    );
                                }}
                                keyExtractor={(item) => item.id.toString()}
                                contentContainerStyle={styles.archiveListContent}
                            />
                        )}
                    </View>
                </GestureHandlerRootView>
            </Modal>
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
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
    },
    archiveIconButton: { padding: theme.spacing.xs },
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
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
        ...theme.shadows.card,
    },
    avatarContainer: { position: 'relative', marginRight: theme.spacing.md },
    avatarPlaceholder: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: theme.colors.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatar: { width: 56, height: 56, borderRadius: 28 },
    unreadBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: theme.colors.primary,
        borderRadius: theme.borderRadius.pill,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
    },
    unreadBadgeText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
    chatContent: { flex: 1, justifyContent: 'center' },
    chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    clientName: { ...theme.typography.body, fontWeight: '600' },
    timeText: { ...theme.typography.caption, color: theme.colors.textMuted },
    boatTitle: { ...theme.typography.bodySm, color: theme.colors.textMuted, marginBottom: 4 },
    messageContainer: { flexDirection: 'row', alignItems: 'center' },
    lastMessage: { ...theme.typography.bodySm, color: theme.colors.textMain, marginLeft: 6, flex: 1 },
    emptyState: { alignItems: 'center', paddingVertical: theme.spacing.xl, paddingHorizontal: theme.spacing.xl },
    swipeActions: { flexDirection: 'row', alignItems: 'stretch' },
    swipeAction: {
        width: 76,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: theme.borderRadius.lg,
        marginLeft: 2,
    },
    archiveAction: { backgroundColor: '#E67E22', marginLeft: 0 },
    deleteAction: { backgroundColor: '#C0392B' },
    swipeActionText: { color: '#fff', fontSize: 12, marginTop: 4 },
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'transparent' },
    modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
    archiveModal: {
        backgroundColor: theme.colors.background,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        paddingHorizontal: theme.spacing.lg,
        overflow: 'hidden',
    },
    archiveModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    archiveModalTitle: { ...theme.typography.h2, color: theme.colors.textMain },
    archiveModalLoading: { paddingVertical: theme.spacing.xl, alignItems: 'center' },
    archiveModalEmpty: {
        alignItems: 'center',
        paddingVertical: theme.spacing.xl,
    },
    archiveModalEmptyText: { ...theme.typography.body, color: theme.colors.textMuted, marginTop: theme.spacing.sm },
    unarchiveAction: {
        width: 120,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.primary,
        marginBottom: theme.spacing.md,
        borderRadius: theme.borderRadius.lg,
    },
    unarchiveActionText: { color: '#fff', fontSize: 12, marginTop: 4 },
    archiveListContent: { paddingBottom: theme.spacing.xl },
});
