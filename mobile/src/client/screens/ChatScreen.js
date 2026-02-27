import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../shared/theme';
import { api } from '../../shared/infrastructure/api';
import { AuthContext } from '../../shared/context/AuthContext';
import UnauthorizedCard from '../../shared/components/UnauthorizedCard';
import { MessageCircle, User, Search } from 'lucide-react-native';

export default function ChatScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { user } = useContext(AuthContext);
    const [chats, setChats] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => { if (user) fetchChats(); else setLoading(false); }, [user]);

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
        <TouchableOpacity style={styles.chatItem} onPress={() => navigation.navigate('ChatDetail', { chatId: item.id })} activeOpacity={0.7}>
            <View style={styles.avatarContainer}>
                {item.owner_avatar ? <Image source={{ uri: item.owner_avatar }} style={styles.avatar} /> : <View style={styles.avatarPlaceholder}><User size={24} color={theme.colors.gray400} /></View>}
                {item.unread_count > 0 && <View style={styles.unreadDot} />}
            </View>
            <View style={styles.chatContent}>
                <View style={styles.chatHeader}>
                    <Text style={styles.ownerName}>{item.owner_name}</Text>
                    <Text style={styles.timeText}>{item.last_message_time || item.last_message_date}</Text>
                </View>
                <Text style={styles.boatTitle} numberOfLines={1}>{item.boat_title}</Text>
                <Text style={styles.lastMessage} numberOfLines={1}>{item.last_message || '—'}</Text>
            </View>
        </TouchableOpacity>
    );

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
            </View>
            <View style={styles.searchContainer}>
                <View style={styles.searchInputContainer}>
                    <Search size={20} color={theme.colors.gray400} style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Поиск..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholderTextColor={theme.colors.gray400}
                    />
                </View>
            </View>
            {loading ? (
                <View style={styles.centered}><ActivityIndicator size="large" color={theme.colors.primary} /></View>
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
                            <Text style={styles.emptySubtitle}>Начните общение с владельцем катера после бронирования</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.sm },
    headerTitle: { ...theme.typography.h1, color: theme.colors.gray900 },
    searchContainer: { paddingHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md },
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
    searchIcon: { marginRight: theme.spacing.sm },
    searchInput: { flex: 1, fontSize: 16, fontFamily: theme.fonts.regular, color: theme.colors.gray900 },
    listContainer: { paddingHorizontal: theme.spacing.lg },
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
    avatarContainer: { position: 'relative', marginRight: theme.spacing.md },
    avatarPlaceholder: { width: 52, height: 52, borderRadius: 26, backgroundColor: theme.colors.gray100, justifyContent: 'center', alignItems: 'center' },
    avatar: { width: 52, height: 52, borderRadius: 26 },
    unreadDot: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: theme.colors.primary,
    },
    chatContent: { flex: 1, justifyContent: 'center', minWidth: 0 },
    chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
    ownerName: { fontSize: 16, fontFamily: theme.fonts.semiBold, color: theme.colors.gray900 },
    timeText: { fontSize: 12, color: theme.colors.gray400 },
    boatTitle: { fontSize: 14, color: theme.colors.primary, marginBottom: 2 },
    lastMessage: { fontSize: 14, color: theme.colors.gray500 },
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
});
