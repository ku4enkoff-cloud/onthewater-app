import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    Image,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../../theme';
import { api } from '../../../infrastructure/api';
import { MessageCircle, User, Search } from 'lucide-react-native';

export default function ChatScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const [chats, setChats] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchChats();
    }, []);

    const fetchChats = async () => {
        try {
            const res = await api.get('/chats');
            setChats(Array.isArray(res.data) ? res.data : []);
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

        return (
            <TouchableOpacity
                style={styles.chatItem}
                onPress={() => navigation.navigate('ChatDetail', { chatId: item.id })}
                activeOpacity={0.8}
            >
                <View style={styles.avatarContainer}>
                    {item.owner_avatar ? (
                        <Image source={{ uri: item.owner_avatar }} style={styles.avatar} />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <User size={24} color={theme.colors.textMuted} />
                        </View>
                    )}
                    {item.unread_count > 0 && (
                        <View style={styles.unreadDot} />
                    )}
                </View>

                <View style={styles.chatContent}>
                    <View style={styles.chatHeader}>
                        <Text style={styles.ownerName} numberOfLines={1}>
                            {item.owner_name}
                        </Text>
                        {!!item.last_message_time && (
                            <Text style={styles.timeText}>{item.last_message_time}</Text>
                        )}
                    </View>

                    <Text style={styles.lastMessage} numberOfLines={1}>
                        {previewText}
                    </Text>

                    <View style={styles.tripRow}>
                        <Text style={styles.tripText} numberOfLines={1}>
                            {tripLabel}
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
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <Text style={styles.headerTitle}>Сообщения</Text>
            </View>

            <View style={styles.searchContainer}>
                <View style={styles.searchInputContainer}>
                    <Search size={20} color={theme.colors.textMuted} style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Поиск..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholderTextColor={theme.colors.textMuted}
                    />
                </View>
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
                                <MessageCircle size={48} color={theme.colors.textMuted} />
                            </View>
                            <Text style={styles.emptyTitle}>Нет сообщений</Text>
                            <Text style={styles.emptySubtitle}>
                                Начните общение с владельцем катера после бронирования
                            </Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        paddingHorizontal: theme.spacing.lg,
        paddingBottom: theme.spacing.sm,
    },
    headerTitle: {
        ...theme.typography.h1,
        color: theme.colors.textMain,
    },
    searchContainer: {
        paddingHorizontal: theme.spacing.lg,
        marginBottom: theme.spacing.md,
    },
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    searchIcon: {
        marginRight: theme.spacing.sm,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: theme.colors.textMain,
    },
    listContainer: {
        paddingHorizontal: theme.spacing.lg,
    },
    chatItem: {
        flexDirection: 'row',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.sm,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.card,
    },
    avatarContainer: {
        position: 'relative',
        marginRight: theme.spacing.md,
    },
    avatarPlaceholder: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: theme.colors.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
    },
    unreadDot: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: theme.colors.primary,
    },
    chatContent: {
        flex: 1,
        justifyContent: 'center',
        minWidth: 0,
    },
    chatHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 2,
    },
    ownerName: {
        ...theme.typography.body,
        fontWeight: '600',
    },
    timeText: {
        ...theme.typography.caption,
        color: theme.colors.textMuted,
        marginLeft: theme.spacing.sm,
    },
    lastMessage: {
        ...theme.typography.bodySm,
        color: theme.colors.textMain,
        marginBottom: 4,
    },
    tripRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    tripText: {
        ...theme.typography.bodySm,
        color: theme.colors.textMuted,
        flex: 1,
        marginRight: theme.spacing.sm,
    },
    statusPill: {
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 4,
        borderRadius: theme.borderRadius.pill,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
    },
    statusPillText: {
        ...theme.typography.caption,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        color: theme.colors.textMuted,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: theme.spacing.xxl,
        paddingHorizontal: theme.spacing.xl,
    },
    emptyIconWrap: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: theme.colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: theme.spacing.lg,
    },
    emptyTitle: {
        ...theme.typography.h2,
        marginBottom: theme.spacing.sm,
    },
    emptySubtitle: {
        ...theme.typography.body,
        color: theme.colors.textMuted,
        textAlign: 'center',
    },
});