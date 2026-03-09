import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../shared/theme';
import { api } from '../../shared/infrastructure/api';
import { MessageCircle, User } from 'lucide-react-native';

let LinearGradient;
try { LinearGradient = require('expo-linear-gradient').LinearGradient; } catch (_) {}
const GRADIENT = ['#0A3D3D', '#0D5C5C', '#1A7A6E', '#3A9E7A'];

export default function OwnerChatScreen({ navigation }) {
    const [chats, setChats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchChats();
    }, []);

    const fetchChats = async () => {
        try {
            const res = await api.get('/owner/chats');
            setChats(Array.isArray(res.data) ? res.data : []);
        } catch (e) {
            console.log('Error fetching owner chats', e);
            setChats([]);
        } finally {
            setLoading(false);
        }
    };

    const filteredChats = chats.filter(
        chat =>
            (chat.client_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (chat.boat_title || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderChatItem = ({ item }) => (
        <TouchableOpacity
            style={styles.chatItem}
            onPress={() => navigation.navigate('ChatDetail', { chatId: item.id })}
        >
            <View style={styles.avatarContainer}>
                {item.client_avatar ? (
                    <Image source={{ uri: item.client_avatar }} style={styles.avatar} />
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
                    <Text style={styles.clientName}>{item.client_name || 'Клиент'}</Text>
                    <Text style={styles.timeText}>{item.last_message_date || ''} • {item.last_message_time || ''}</Text>
                </View>
                <Text style={styles.boatTitle} numberOfLines={1}>{item.boat_title || 'Катер'}</Text>
                <View style={styles.messageContainer}>
                    <MessageCircle size={14} color={theme.colors.textMuted} />
                    <Text style={styles.lastMessage} numberOfLines={1}>{item.last_message || ''}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
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
                <View style={styles.header}>
                    <Text style={[theme.typography.h1, { color: '#fff' }]}>Сообщения</Text>
                    <Text style={[theme.typography.body, { color: 'rgba(255,255,255,0.82)', marginTop: 4 }]}>
                        Чаты с клиентами
                    </Text>
                </View>
            </View>

            <View style={styles.searchContainer}>
                <View style={styles.searchInputContainer}>
                    <MessageCircle size={20} color={theme.colors.textMuted} style={styles.searchIcon} />
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
        </SafeAreaView>
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
        paddingTop: theme.spacing.xl,
        paddingBottom: theme.spacing.md,
    },
    searchContainer: { paddingHorizontal: theme.spacing.lg, marginTop: theme.spacing.md, marginBottom: theme.spacing.md },
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
    searchIcon: { marginRight: theme.spacing.sm },
    searchInput: { flex: 1, fontSize: 16, color: theme.colors.textMain },
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
});
