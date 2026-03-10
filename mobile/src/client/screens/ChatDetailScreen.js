import React, { useState, useEffect, useRef, useContext } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Keyboard,
    Platform,
    ActivityIndicator,
    Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../shared/theme';
import { api } from '../../shared/infrastructure/api';
import { AuthContext } from '../../shared/context/AuthContext';
import { ChevronLeft, Send, Lock, User } from 'lucide-react-native';

const TEAL_BUBBLE = '#0D9488';
const LIGHT_GRAY_BUBBLE = '#E5E7EB';

export default function ChatDetailScreen({ route, navigation }) {
    const insets = useSafeAreaInsets();
    const { user: currentUser } = useContext(AuthContext) || {};
    const { chatId } = route.params || {};
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const [chat, setChat] = useState(null);
    const flatListRef = useRef(null);
    const [keyboardVisible, setKeyboardVisible] = useState(false);

    useEffect(() => {
        const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
        const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
        return () => {
            show.remove();
            hide.remove();
        };
    }, []);

    const inputRowPaddingBottom =
        Platform.OS === 'android' && keyboardVisible
            ? theme.spacing.sm
            : theme.spacing.lg + insets.bottom;

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

    const myName = currentUser?.name || currentUser?.first_name || 'Вы';
    const ownerName = chat?.owner_name || 'Владелец';

    const renderMessage = ({ item }) => {
        const isMe = item.sender === 'me';
        const timeStr = formatTime(item.created_at || item.createdAt);
        return (
            <View style={[styles.messageRow, isMe ? styles.messageRowMe : styles.messageRowThem]}>
                <View style={[styles.messageBubble, isMe ? styles.messageBubbleMe : styles.messageBubbleThem]}>
                    <Text style={[styles.messageText, isMe && styles.messageTextMe]}>{item.text}</Text>
                </View>
                <View style={[styles.messageMeta, isMe ? styles.messageMetaMe : styles.messageMetaThem]}>
                    {!isMe && (
                        <View style={styles.avatarSmallWrap}>
                            {chat?.owner_avatar ? (
                                <Image source={{ uri: chat.owner_avatar }} style={styles.avatarSmall} />
                            ) : (
                                <View style={styles.avatarSmallPlaceholder}>
                                    <User size={12} color={theme.colors.gray500} />
                                </View>
                            )}
                        </View>
                    )}
                    <View style={styles.messageMetaText}>
                        {isMe ? (
                            <>
                                <Text style={styles.messageSender}>{myName}</Text>
                                <Text style={styles.messageTime}>{timeStr}</Text>
                            </>
                        ) : (
                            <Text style={styles.messageMetaLine}>
                                <Text style={styles.messageSender}>{ownerName}</Text>
                                <Text style={styles.messageDot}> · </Text>
                                <Text style={styles.messageSenderRole}>Владелец</Text>
                                <Text style={styles.messageDot}> · </Text>
                                <Text style={styles.messageTime}>{timeStr}</Text>
                            </Text>
                        )}
                    </View>
                    {isMe && (
                        <View style={styles.avatarSmallWrap}>
                            {currentUser?.avatar ? (
                                <Image source={{ uri: currentUser.avatar }} style={styles.avatarSmall} />
                            ) : (
                                <View style={styles.avatarSmallPlaceholder}>
                                    <User size={12} color={theme.colors.gray500} />
                                </View>
                            )}
                        </View>
                    )}
                </View>
            </View>
        );
    };

    const tripLabel =
        chat?.trip_date_formatted ||
        chat?.trip_date ||
        chat?.trip_date_short;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={[styles.header, { paddingTop: insets.top + theme.spacing.xs }]}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
                    <ChevronLeft size={24} color={theme.colors.gray900} />
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
                        style={styles.tripDetailsLink}
                        activeOpacity={0.8}
                        onPress={() => {
                            if (chat?.boat_id) {
                                navigation.navigate('BoatDetail', { boatId: chat.boat_id });
                            }
                        }}
                    >
                        <Text style={styles.tripDetailsText}>См. детали</Text>
                    </TouchableOpacity>
                </View>
            )}

            {!loading && !keyboardVisible && (
                <View style={styles.infoBanner}>
                    <View style={styles.infoIconWrap}>
                        <Lock size={18} color="#FFFFFF" strokeWidth={2} />
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
                <KeyboardAvoidingView
                    style={styles.keyboardWrap}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}
                >
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        renderItem={renderMessage}
                        keyExtractor={item => (item.id || item._id || Math.random()).toString()}
                        contentContainerStyle={styles.messagesList}
                        showsVerticalScrollIndicator={false}
                        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
                        keyboardShouldPersistTaps="handled"
                    />
                    <View style={[styles.inputRow, { paddingBottom: inputRowPaddingBottom }]}>
                        <TextInput
                            style={styles.input}
                            placeholder="Напишите сообщение..."
                            placeholderTextColor={theme.colors.gray400}
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
                    </View>
                </KeyboardAvoidingView>
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
        fontFamily: theme.fonts.semiBold,
        color: theme.colors.gray900,
    },
    headerSpacer: { width: 40 },
    tripHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.gray200,
        backgroundColor: theme.colors.gray50,
    },
    tripInfo: { flex: 1, marginRight: theme.spacing.sm },
    tripBoatTitle: {
        fontSize: 15,
        fontFamily: theme.fonts.semiBold,
        color: theme.colors.gray900,
        marginBottom: 2,
    },
    tripDate: {
        ...theme.typography.caption,
        color: theme.colors.gray500,
    },
    tripDetailsLink: {
        paddingVertical: 4,
        paddingHorizontal: 4,
    },
    tripDetailsText: {
        fontSize: 14,
        color: theme.colors.primary,
        fontFamily: theme.fonts.semiBold,
    },
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: theme.spacing.lg,
        marginTop: 0,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: 0,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.gray200,
        backgroundColor: theme.colors.gray50,
    },
    infoIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: TEAL_BUBBLE,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: theme.spacing.md,
    },
    infoText: {
        flex: 1,
        ...theme.typography.bodySm,
        color: theme.colors.gray900,
    },
    keyboardWrap: {
        flex: 1,
    },
    messagesList: {
        paddingHorizontal: theme.spacing.lg,
        paddingTop: theme.spacing.md,
        paddingBottom: theme.spacing.md,
    },
    messageRow: {
        marginBottom: theme.spacing.lg,
    },
    messageRowMe: {
        alignItems: 'flex-end',
    },
    messageRowThem: {
        alignItems: 'flex-start',
    },
    messageBubble: {
        maxWidth: '80%',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 18,
    },
    messageBubbleMe: {
        backgroundColor: LIGHT_GRAY_BUBBLE,
        borderBottomRightRadius: 4,
    },
    messageBubbleThem: {
        backgroundColor: TEAL_BUBBLE,
        borderBottomLeftRadius: 4,
    },
    messageText: {
        fontSize: 16,
        fontFamily: theme.fonts.regular,
        color: '#FFFFFF',
    },
    messageTextMe: {
        color: theme.colors.gray900,
    },
    messageMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
        maxWidth: '80%',
    },
    messageMetaMe: {
        justifyContent: 'flex-end',
    },
    messageMetaThem: {
        justifyContent: 'flex-start',
    },
    messageMetaText: {
        marginHorizontal: 6,
    },
    messageMetaLine: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    messageSender: {
        fontSize: 13,
        fontFamily: theme.fonts.semiBold,
        color: theme.colors.gray900,
    },
    messageSenderRole: {
        fontSize: 13,
        fontFamily: theme.fonts.regular,
        color: theme.colors.gray500,
    },
    messageTime: {
        fontSize: 12,
        color: theme.colors.gray500,
        marginTop: 1,
    },
    avatarSmallWrap: {
        marginLeft: 0,
        marginRight: 0,
    },
    avatarSmall: {
        width: 24,
        height: 24,
        borderRadius: 12,
    },
    avatarSmallPlaceholder: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: theme.colors.gray200,
        alignItems: 'center',
        justifyContent: 'center',
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
        borderColor: theme.colors.gray200,
        borderRadius: 24,
        paddingHorizontal: 18,
        paddingVertical: 12,
        fontSize: 16,
        fontFamily: theme.fonts.regular,
        color: theme.colors.gray900,
        backgroundColor: '#FFFFFF',
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
