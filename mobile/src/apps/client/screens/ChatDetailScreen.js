import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../../theme';
import { api } from '../../../infrastructure/api';
import { ChevronLeft, Send, MessageCircle } from 'lucide-react-native';

export default function ChatDetailScreen({ route, navigation }) {
    const insets = useSafeAreaInsets();
    const { chatId } = route.params || {};
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const [chat, setChat] = useState(null);
    const flatListRef = useRef(null);

    useEffect(() => {
        if (chatId) {
            fetchChat();
            fetchMessages();
        }
    }, [chatId]);

    const fetchChat = async () => {
        try {
            const res = await api.get(`/chats/${chatId}`);
            setChat(res.data);
        } catch (e) {
            console.log('Error fetching chat', e);
            setChat({ boat_title: 'Чат', owner_name: 'Владелец' });
        }
    };

    const fetchMessages = async () => {
        try {
            const res = await api.get(`/chats/${chatId}/messages`);
            setMessages(Array.isArray(res.data) ? res.data : []);
        } catch (e) {
            console.log('Error fetching messages', e);
            setMessages([]);
        } finally {
            setLoading(false);
        }
    };

    const sendMessage = async () => {
        const text = inputText.trim();
        if (!text) return;
        setInputText('');
        try {
            const res = await api.post(`/chats/${chatId}/messages`, { text });
            setMessages(prev => [...prev, res.data]);
            flatListRef.current?.scrollToEnd({ animated: true });
        } catch (e) {
            console.log('Send message error', e);
        }
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    };

    const renderMessage = ({ item }) => {
        const isMe = item.sender === 'me' || item.is_own;
        return (
            <View style={[styles.messageBubble, isMe ? styles.messageBubbleMe : styles.messageBubbleThem]}>
                <Text style={[styles.messageText, isMe && styles.messageTextMe]}>{item.text}</Text>
                <Text style={[styles.messageTime, isMe && styles.messageTimeMe]}>{formatTime(item.created_at || item.createdAt)}</Text>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
                    <ChevronLeft size={24} color={theme.colors.primary} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle} numberOfLines={1}>
                        {chat?.owner_name || 'Владелец'}
                    </Text>
                    <Text style={styles.headerSubtitle} numberOfLines={1}>
                        {chat?.boat_title || 'Чат'}
                    </Text>
                </View>
                <View style={styles.headerSpacer} />
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            ) : (
                <>
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        renderItem={renderMessage}
                        keyExtractor={item => (item.id || item._id || Math.random()).toString()}
                        contentContainerStyle={styles.messagesList}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View style={styles.emptyChat}>
                                <View style={styles.emptyIconWrap}>
                                    <MessageCircle size={48} color={theme.colors.textMuted} />
                                </View>
                                <Text style={styles.emptyTitle}>Пока нет сообщений</Text>
                                <Text style={styles.emptySubtitle}>Напишите первым</Text>
                            </View>
                        }
                    />
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
                        style={[styles.inputRow, { paddingBottom: theme.spacing.lg + insets.bottom }]}
                    >
                        <TextInput
                            style={styles.input}
                            placeholder="Сообщение..."
                            placeholderTextColor={theme.colors.textMuted}
                            value={inputText}
                            onChangeText={setInputText}
                            multiline
                            maxLength={1000}
                        />
                        <TouchableOpacity
                            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
                            onPress={sendMessage}
                            disabled={!inputText.trim()}
                            activeOpacity={0.8}
                        >
                            <Send size={22} color="white" />
                        </TouchableOpacity>
                    </KeyboardAvoidingView>
                </>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.lg,
        paddingBottom: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        backgroundColor: theme.colors.background,
    },
    backButton: { padding: theme.spacing.sm, marginLeft: -theme.spacing.sm },
    headerCenter: { flex: 1, marginLeft: theme.spacing.sm },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.textMain,
    },
    headerSubtitle: {
        ...theme.typography.caption,
        color: theme.colors.textMuted,
        marginTop: 2,
    },
    headerSpacer: { width: 40 },
    messagesList: {
        paddingHorizontal: theme.spacing.lg,
        paddingTop: theme.spacing.lg,
        paddingBottom: theme.spacing.md,
    },
    emptyChat: {
        paddingVertical: theme.spacing.xxl,
        alignItems: 'center',
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
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.textMain,
        marginBottom: theme.spacing.sm,
    },
    emptySubtitle: {
        ...theme.typography.bodySm,
        color: theme.colors.textMuted,
        textAlign: 'center',
    },
    messageBubble: {
        alignSelf: 'flex-start',
        maxWidth: '80%',
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.lg,
        marginBottom: theme.spacing.sm,
        backgroundColor: theme.colors.surface,
        ...theme.shadows.card,
    },
    messageBubbleMe: {
        alignSelf: 'flex-end',
        backgroundColor: theme.colors.primaryLight,
    },
    messageText: { ...theme.typography.body },
    messageTextMe: { color: theme.colors.textMain },
    messageTime: { ...theme.typography.caption, marginTop: 4 },
    messageTimeMe: { color: theme.colors.textMuted },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: theme.spacing.lg,
        paddingTop: theme.spacing.md,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        backgroundColor: theme.colors.background,
    },
    input: {
        flex: 1,
        minHeight: 44,
        maxHeight: 120,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.pill,
        paddingHorizontal: 18,
        paddingVertical: 12,
        fontSize: 16,
        color: theme.colors.textMain,
        backgroundColor: theme.colors.surface,
        marginRight: theme.spacing.sm,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonDisabled: { opacity: 0.5 },
});
