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
import { ChevronLeft, Send, Lock } from 'lucide-react-native';

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
            <View style={[styles.messageRow, isMe ? styles.messageRowMe : styles.messageRowThem]}>
                <View style={[styles.messageBubble, isMe ? styles.messageBubbleMe : styles.messageBubbleThem]}>
                    <Text style={[styles.messageText, isMe && styles.messageTextMe]}>{item.text}</Text>
                </View>
                <Text style={[styles.messageTime, isMe && styles.messageTimeMe]}>
                    {formatTime(item.created_at || item.createdAt)}
                </Text>
            </View>
        );
    };

    const tripLabel =
        chat?.trip_date_formatted ||
        chat?.trip_date ||
        chat?.trip_date_short;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                    activeOpacity={0.7}
                >
                    <ChevronLeft size={24} color={theme.colors.textMain} />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>
                    {chat?.owner_name || 'Владелец'}
                </Text>
                <View style={styles.headerSpacer} />
            </View>

            {!loading && (
                <View style={styles.tripHeader}>
                    <View style={styles.tripInfo}>
                        <Text style={styles.tripBoatTitle} numberOfLines={1}>
                            {chat?.boat_title || 'Чат'}
                        </Text>
                        {!!tripLabel && (
                            <Text style={styles.tripDate} numberOfLines={1}>
                                {tripLabel}
                            </Text>
                        )}
                    </View>
                    <TouchableOpacity
                        style={styles.tripDetailsButton}
                        activeOpacity={0.8}
                        onPress={() => {
                            if (chat?.boat_id) {
                                navigation.navigate('BoatDetail', { boatId: chat.boat_id });
                            }
                        }}
                    >
                        <Text style={styles.tripDetailsText}>Подробнее</Text>
                    </TouchableOpacity>
                </View>
            )}

            {!loading && (
                <View style={styles.infoBanner}>
                    <View style={styles.infoIconWrap}>
                        <Lock size={18} color={theme.colors.primary} strokeWidth={2} />
                    </View>
                    <Text style={styles.infoText}>
                        Для вашей безопасности общайтесь только в приложении.
                    </Text>
                </View>
            )}

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
                        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
                    />
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
                        style={[styles.inputRow, { paddingBottom: theme.spacing.lg + insets.bottom }]}
                    >
                        <TextInput
                            style={styles.input}
                            placeholder="Напишите сообщение..."
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
    headerTitle: {
        flex: 1,
        textAlign: 'center',
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.textMain,
    },
    headerSpacer: { width: 40 },
    tripHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
    },
    tripInfo: { flex: 1, marginRight: theme.spacing.sm },
    tripBoatTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.textMain,
        marginBottom: 2,
    },
    tripDate: {
        ...theme.typography.caption,
        color: theme.colors.textMuted,
    },
    tripDetailsButton: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: 6,
        borderRadius: theme.borderRadius.pill,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    tripDetailsText: {
        ...theme.typography.caption,
        color: theme.colors.primary,
        fontWeight: '600',
    },
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: theme.spacing.lg,
        marginTop: theme.spacing.md,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: 0,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        backgroundColor: theme.colors.background,
    },
    infoIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#B8E6E0',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: theme.spacing.md,
    },
    infoText: {
        flex: 1,
        ...theme.typography.bodySm,
        color: theme.colors.textMain,
    },
    messagesList: {
        paddingHorizontal: theme.spacing.lg,
        paddingTop: theme.spacing.md,
        paddingBottom: theme.spacing.md,
    },
    messageRow: {
        marginBottom: theme.spacing.sm,
    },
    messageRowMe: {
        alignItems: 'flex-end',
    },
    messageRowThem: {
        alignItems: 'flex-start',
    },
    messageBubble: {
        maxWidth: '80%',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: 18,
    },
    messageBubbleMe: {
        backgroundColor: theme.colors.primary,
        borderBottomRightRadius: 4,
    },
    messageBubbleThem: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderBottomLeftRadius: 4,
    },
    messageText: {
        ...theme.typography.body,
        color: theme.colors.textMain,
    },
    messageTextMe: {
        color: 'white',
    },
    messageTime: {
        ...theme.typography.caption,
        color: theme.colors.textMuted,
        marginTop: 4,
    },
    messageTimeMe: {
        color: theme.colors.textMuted,
    },
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
        borderRadius: 22,
        paddingHorizontal: 18,
        paddingVertical: 10,
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
