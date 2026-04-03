import React, { useState, useEffect, useContext } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    Modal,
} from 'react-native';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../shared/theme';
import { api } from '../../shared/infrastructure/api';
import { getPhotoUrl } from '../../shared/infrastructure/config';
import { AuthContext } from '../../shared/context/AuthContext';
import UnauthorizedCard from '../../shared/components/UnauthorizedCard';
import { MessageCircle, User, Archive, ChevronRight, X, ArchiveRestore, Trash2 } from 'lucide-react-native';
const BLUE_PRIMARY = '#1E5DB8';

export default function ChatScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { user } = useContext(AuthContext);
    const [chats, setChats] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [archiveModalVisible, setArchiveModalVisible] = useState(false);
    const [archivedChats, setArchivedChats] = useState([]);
    const [archivedLoading, setArchivedLoading] = useState(false);

    useEffect(() => { if (user) fetchChats(); else setLoading(false); }, [user]);

    useFocusEffect(
        React.useCallback(() => {
            if (!user) return;
            fetchChats();
        }, [user])
    );

    const openArchiveModal = async () => {
        setArchiveModalVisible(true);
        setArchivedLoading(true);
        try {
            const res = await api.get('/chats?archived=1');
            setArchivedChats(Array.isArray(res.data) ? res.data : []);
        } catch (e) {
            console.log('Error fetching archived chats', e);
            setArchivedChats([]);
        } finally {
            setArchivedLoading(false);
        }
    };

    const fetchChats = async () => {
        try {
            const res = await api.get('/chats');
            const base = Array.isArray(res.data) ? res.data : [];
            const needsAvatar = base.filter((c) => !c?.owner_avatar);
            if (needsAvatar.length > 0) {
                const enriched = await Promise.all(
                    base.map(async (chat) => {
                        if (chat?.owner_avatar) return chat;
                        try {
                            const detail = await api.get(`/chats/${chat.id}`);
                            return { ...chat, owner_avatar: detail?.data?.owner_avatar || null };
                        } catch (_) {
                            return chat;
                        }
                    })
                );
                setChats(enriched);
            } else {
                setChats(base);
            }
        } catch (e) {
            console.log('Error fetching chats', e);
            setChats([]);
        } finally {
            setLoading(false);
        }
    };

    const filteredChats = chats.filter(chat =>
        (chat.boat_title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (chat.owner_name || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleArchiveChat = async (item) => {
        try {
            await api.patch(`/chats/${item.id}/archive`);
            setChats(prev => prev.filter(c => c.id !== item.id));
        } catch (e) {
            console.log('Error archiving chat', e);
        }
    };

    const handleDeleteChat = async (item) => {
        try {
            await api.delete(`/chats/${item.id}`);
            setChats(prev => prev.filter(c => c.id !== item.id));
        } catch (e) {
            console.log('Error deleting chat', e);
        }
    };

    const handleUnarchiveChat = async (item) => {
        try {
            await api.patch(`/chats/${item.id}/unarchive`);
            setArchivedChats(prev => prev.filter(c => c.id !== item.id));
            setChats(prev => [item, ...prev]);
        } catch (e) {
            console.log('Error unarchiving chat', e);
        }
    };

    const renderRightActions = (item) => (
        <View style={styles.swipeActions}>
            <TouchableOpacity
                style={[styles.swipeAction, styles.deleteAction]}
                onPress={() => handleDeleteChat(item)}
                activeOpacity={0.8}
            >
                <Trash2 size={20} color="#fff" strokeWidth={2} />
                <Text style={styles.swipeActionText}>Удалить</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.swipeAction, styles.archiveAction]}
                onPress={() => handleArchiveChat(item)}
                activeOpacity={0.8}
            >
                <Archive size={20} color="#fff" strokeWidth={2} />
                <Text style={styles.swipeActionText}>В архив</Text>
            </TouchableOpacity>
        </View>
    );

    const renderChatItem = ({ item }) => {
        const isLastFromMe = item.last_message_is_own || item.last_message_sender === 'me';
        const lastMessageText = item.last_message || '—';
        const previewText = `${isLastFromMe ? 'Вы: ' : ''}${lastMessageText}`;

        const tripLabel =
            item.trip_date_formatted ||
            item.trip_date ||
            item.trip_date_short ||
            item.boat_title;

        const statusLabel = item.status_label || item.status_text || item.status;

        const hasUnread = (item.unread_count || 0) > 0;

        const ownerAvatarRaw = typeof item.owner_avatar === 'string'
            ? item.owner_avatar.trim()
            : item.owner_avatar;
        const ownerAvatarUri = ownerAvatarRaw && ownerAvatarRaw !== 'null' && ownerAvatarRaw !== 'undefined'
            ? (getPhotoUrl(ownerAvatarRaw) || ownerAvatarRaw)
            : null;
        return (
            <Swipeable
                renderRightActions={() => renderRightActions(item)}
                overshootRight={false}
                friction={2}
            >
            <TouchableOpacity
                style={[styles.chatItem, hasUnread && styles.chatItemUnread]}
                onPress={() => navigation.navigate('ChatDetail', { chatId: item.id })}
                activeOpacity={0.7}
            >
                <View style={styles.avatarContainer}>
                    {ownerAvatarUri ? (
                        <Image source={{ uri: ownerAvatarUri }} style={styles.avatar} />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <User size={24} color={theme.colors.gray400} />
                        </View>
                    )}
                    {hasUnread && (
                        <View style={styles.unreadBadge}>
                            <Text style={styles.unreadBadgeText}>
                                {item.unread_count > 99 ? '99+' : item.unread_count}
                            </Text>
                        </View>
                    )}
                </View>
                <View style={styles.chatContent}>
                    <View style={styles.chatHeader}>
                        <Text style={[styles.ownerName, hasUnread && styles.ownerNameUnread]} numberOfLines={1}>
                            {item.owner_name}
                        </Text>
                        <View style={styles.timeRow}>
                            {!!item.last_message_time && (
                                <Text style={styles.timeText}>{item.last_message_time}</Text>
                            )}
                            <ChevronRight size={18} color={theme.colors.gray400} strokeWidth={2} />
                        </View>
                    </View>
                    <Text style={[styles.lastMessage, hasUnread && styles.lastMessageUnread]} numberOfLines={1}>
                        {previewText}
                    </Text>
                    <View style={styles.tripRow}>
                        <Text style={styles.tripText} numberOfLines={1}>
                            {tripLabel ? `Поездка: ${tripLabel}` : ''}
                        </Text>
                        {!!statusLabel && (
                            <View style={styles.statusPill}>
                                <Text style={styles.statusPillText} numberOfLines={1}>
                                    {statusLabel}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
            </Swipeable>
        );
    };

    if (!user) {
        return (
            <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Сообщения</Text>
                </View>
                <UnauthorizedCard
                    label="У ВАС НЕТ СООБЩЕНИЙ"
                    message="Войдите, чтобы видеть переписку с владельцами катеров"
                    onSignIn={() => navigation.navigate('Login', { fromProfile: true })}
                />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <Text style={styles.headerTitle}>Сообщения</Text>
                <TouchableOpacity
                    style={styles.headerIconButton}
                    onPress={openArchiveModal}
                    activeOpacity={0.7}
                    accessibilityLabel="Архив сообщений"
                >
                    <Archive size={24} color={theme.colors.gray700} strokeWidth={1.5} />
                </TouchableOpacity>
            </View>
            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={filteredChats}
                    renderItem={renderChatItem}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={[styles.listContainer, { paddingBottom: insets.bottom + 88 }]}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIconWrap}>
                                <MessageCircle size={48} color={theme.colors.gray400} />
                            </View>
                            <Text style={styles.emptyTitle}>Нет сообщений</Text>
                            <Text style={styles.emptySubtitle}>
                                Начните общение с владельцем катера после бронирования
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
                                renderItem={({ item }) => (
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
                                            {(() => {
                                                const raw = typeof item.owner_avatar === 'string'
                                                    ? item.owner_avatar.trim()
                                                    : item.owner_avatar;
                                                const uri = raw && raw !== 'null' && raw !== 'undefined'
                                                    ? (getPhotoUrl(raw) || raw)
                                                    : null;
                                                return uri ? (
                                                    <Image source={{ uri }} style={styles.avatar} />
                                                ) : (
                                                    <View style={styles.avatarPlaceholder}>
                                                        <User size={24} color={theme.colors.gray400} />
                                                    </View>
                                                );
                                            })()}
                                        </View>
                                        <View style={styles.chatContent}>
                                            <Text style={styles.ownerName} numberOfLines={1}>{item.owner_name}</Text>
                                            <Text style={styles.lastMessage} numberOfLines={1}>
                                                {item.last_message || '—'}
                                            </Text>
                                            <Text style={styles.tripText} numberOfLines={1}>
                                                {item.boat_title ? `Поездка: ${item.boat_title}` : ''}
                                            </Text>
                                        </View>
                                        <ChevronRight size={18} color={theme.colors.gray400} strokeWidth={2} />
                                    </TouchableOpacity>
                                    </Swipeable>
                                )}
                                keyExtractor={item => item.id.toString()}
                                contentContainerStyle={styles.archiveListContent}
                                showsVerticalScrollIndicator={false}
                            />
                        )}
                    </View>
                </GestureHandlerRootView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.lg,
        paddingBottom: theme.spacing.md,
    },
    headerTitle: { ...theme.typography.h1, color: theme.colors.gray900, flex: 1 },
    headerIconButton: { padding: theme.spacing.xs },
    listContainer: { paddingHorizontal: theme.spacing.lg },
    chatItem: {
        flexDirection: 'row',
        backgroundColor: theme.colors.background,
        paddingVertical: theme.spacing.md,
        paddingRight: 0,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.gray100,
    },
    chatItemUnread: {
        backgroundColor: 'rgba(30, 93, 184, 0.07)',
        borderLeftWidth: 4,
        borderLeftColor: BLUE_PRIMARY,
    },
    avatarContainer: { position: 'relative', marginRight: theme.spacing.md },
    avatarPlaceholder: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: theme.colors.gray100,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        ...theme.shadows.card,
    },
    unreadBadge: {
        position: 'absolute',
        top: -2,
        right: -2,
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        paddingHorizontal: 5,
        backgroundColor: BLUE_PRIMARY,
        justifyContent: 'center',
        alignItems: 'center',
    },
    unreadBadgeText: {
        color: '#fff',
        fontSize: 11,
        fontFamily: theme.fonts.bold,
    },
    chatContent: { flex: 1, justifyContent: 'center', minWidth: 0 },
    chatHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    ownerName: {
        fontSize: 17,
        fontFamily: theme.fonts.semiBold,
        color: theme.colors.gray900,
        flex: 1,
    },
    ownerNameUnread: {
        fontFamily: theme.fonts.bold,
        color: theme.colors.gray900,
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: theme.spacing.sm,
    },
    timeText: { fontSize: 13, color: theme.colors.gray500 },
    lastMessage: {
        fontSize: 14,
        fontFamily: theme.fonts.regular,
        color: theme.colors.gray500,
        marginBottom: 4,
    },
    lastMessageUnread: {
        color: theme.colors.gray900,
        fontFamily: theme.fonts.semiBold,
    },
    tripRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    tripText: {
        fontSize: 13,
        color: theme.colors.gray500,
        flex: 1,
        marginRight: theme.spacing.sm,
    },
    statusPill: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 6,
        backgroundColor: '#E8E4DD',
    },
    statusPillText: {
        fontSize: 11,
        fontFamily: theme.fonts.semiBold,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        color: theme.colors.gray700,
    },
    emptyState: { alignItems: 'center', paddingVertical: theme.spacing.xxl, paddingHorizontal: theme.spacing.xl },
    emptyIconWrap: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: theme.colors.gray100,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: theme.spacing.lg,
    },
    emptyTitle: { ...theme.typography.h2, color: theme.colors.gray900, marginBottom: theme.spacing.sm },
    emptySubtitle: { ...theme.typography.bodySm, color: theme.colors.gray500, textAlign: 'center' },
    swipeActions: { flexDirection: 'row', alignItems: 'stretch' },
    swipeAction: {
        width: 92,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 1,
    },
    deleteAction: { backgroundColor: '#DC2626' },
    archiveAction: { backgroundColor: theme.colors.gray700 },
    swipeActionText: {
        color: '#fff',
        fontSize: 11,
        fontFamily: theme.fonts.semiBold,
        marginTop: 4,
        textAlign: 'center',
    },
    unarchiveAction: {
        backgroundColor: BLUE_PRIMARY,
        justifyContent: 'center',
        alignItems: 'center',
        width: 120,
        marginBottom: 1,
    },
    unarchiveActionText: {
        color: '#fff',
        fontSize: 11,
        fontFamily: theme.fonts.semiBold,
        marginTop: 4,
        textAlign: 'center',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'transparent',
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    archiveModal: {
        backgroundColor: theme.colors.background,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: theme.spacing.lg,
        overflow: 'hidden',
    },
    archiveModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.gray100,
    },
    archiveModalTitle: {
        fontSize: 20,
        fontFamily: theme.fonts.bold,
        color: theme.colors.gray900,
    },
    archiveModalLoading: {
        paddingVertical: 48,
        alignItems: 'center',
    },
    archiveModalEmpty: {
        paddingVertical: 48,
        alignItems: 'center',
    },
    archiveModalEmptyText: {
        marginTop: theme.spacing.md,
        fontSize: 16,
        color: theme.colors.gray500,
    },
    archiveListContent: {
        paddingVertical: theme.spacing.md,
    },
});
