import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../../theme';
import { api } from '../../../infrastructure/api';
import { MessageCircle, User } from 'lucide-react-native';

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

    const renderChatItem = ({ item }) => (
        <TouchableOpacity
            style={styles.chatItem}
            onPress={() => navigation.navigate('ChatDetail', { chatId: item.id })}
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
                    <View style={styles.unreadBadge}>
                        <Text style={styles.unreadBadgeText}>{item.unread_count}</Text>
                    </View>
                )}
            </View>

            <View style={styles.chatContent}>
                <View style={styles.chatHeader}>
                    <Text style={styles.ownerName}>{item.owner_name}</Text>
                    <Text style={styles.timeText}>{item.last_message_date} • {item.last_message_time}</Text>
                </View>
                
                <Text style={styles.boatTitle} numberOfLines={1}>{item.boat_title}</Text>
                
                <View style={styles.messageContainer}>
                    <MessageCircle size={14} color={theme.colors.textMuted} />
                    <Text style={styles.lastMessage} numberOfLines={1}>
                        {item.last_message}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Text style={theme.typography.h1}>Сообщения</Text>
                <Text style={[theme.typography.body, { color: theme.colors.textMuted, marginTop: 4 }]}>
                    Общайтесь с владельцами катеров
                </Text>
            </View>

            {/* Поиск */}
            <View style={styles.searchContainer}>
                <View style={styles.searchInputContainer}>
                    <MessageCircle size={20} color={theme.colors.textMuted} style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Поиск по катерам или владельцам"
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
                contentContainerStyle={[styles.listContainer, { paddingBottom: 100 + insets.bottom }]}
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
        paddingTop: theme.spacing.xl,
        paddingBottom: theme.spacing.md,
    },
    searchContainer: {
        paddingHorizontal: theme.spacing.lg,
        marginBottom: theme.spacing.md,
    },
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.pill,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
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
        paddingBottom: 100,
    },
    chatItem: {
        flexDirection: 'row',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
        ...theme.shadows.card,
    },
    avatarContainer: {
        position: 'relative',
        marginRight: theme.spacing.md,
    },
    avatarPlaceholder: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: theme.colors.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
    },
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
    unreadBadgeText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    chatContent: {
        flex: 1,
        justifyContent: 'center',
    },
    chatHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    ownerName: {
        ...theme.typography.body,
        fontWeight: '600',
    },
    timeText: {
        ...theme.typography.caption,
        color: theme.colors.textMuted,
    },
    boatTitle: {
        ...theme.typography.bodySm,
        color: theme.colors.textMuted,
        marginBottom: 4,
    },
    messageContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    lastMessage: {
        ...theme.typography.bodySm,
        color: theme.colors.textMain,
        marginLeft: 6,
        flex: 1,
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