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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../shared/theme';
import { api } from '../../shared/infrastructure/api';
import { AuthContext } from '../../shared/context/AuthContext';
import { ChevronLeft, Send, Lock, User } from 'lucide-react-native';

let LinearGradient;
try { LinearGradient = require('expo-linear-gradient').LinearGradient; } catch (_) {}

const GRADIENT = ['#0A3D3D', '#0D5C5C', '#1A7A6E', '#3A9E7A'];
const TEAL = '#0D5C5C';
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
    const clientName = chat?.user_name || chat?.client_name || 'Клиент';
    const clientAvatar = chat?.user_avatar || chat?.client_avatar || null;

    const tripLabel =
        chat?.trip_date_formatted ||
        chat?.trip_date ||
        chat?.trip_date_short;

    const headerTitle = currentUser?.role === 'owner'
        ? (chat?.user_name || chat?.client_name || 'Клиент')
        : (chat?.owner_name || 'Владелец');

    const messagesReversed = React.useMemo(() => [...messages].reverse(), [messages]);

    const renderMessage = ({ item, index }) => {
        const nextItem = messagesReversed[index + 1];
        const isLastInGroup = !nextItem || nextItem.sender !== item.sender;
        const isMe = item.sender === (currentUser?.role === 'owner' ? 'owner' : 'me');
        const timeStr = formatTime(item.created_at || item.createdAt);
        const isOwnerSender = item.sender === 'owner';
        const otherName = isOwnerSender ? ownerName : clientName;
        const otherRoleLabel = isOwnerSender ? 'Владелец' : 'Клиент';
        return (
            <View style={[
                styles.messageRow,
                isMe ? styles.messageRowMe : styles.messageRowThem,
                isLastInGroup ? styles.messageRowGroupEnd : styles.messageRowGroupMid,
            ]}>
                <View style={[
                    styles.messageBubble,
                    isMe ? styles.messageBubbleMe : styles.messageBubbleThem,
                    isLastInGroup && isMe && styles.messageBubbleMeTail,
                    isLastInGroup && !isMe && styles.messageBubbleThemTail,
                    !isLastInGroup && styles.messageBubbleGroupMid,
                ]}>
                    <Text style={[styles.messageText, isMe && styles.messageTextMe]}>
                        {item.text || ''}
                        {'  '}
                        <Text style={[styles.bubbleTime, isMe ? styles.bubbleTimeMe : styles.bubbleTimeThem]}>{timeStr}</Text>
                    </Text>
                </View>
                {!isMe && (
                    <View style={[styles.messageMeta, styles.messageMetaThem]}>
                        <View style={styles.avatarSmallWrap}>
                            {isOwnerSender ? (
                                chat?.owner_avatar ? (
                                    <Image source={{ uri: chat.owner_avatar }} style={styles.avatarSmall} />
                                ) : (
                                    <View style={styles.avatarSmallPlaceholder}>
                                        <User size={12} color={theme.colors.gray500} />
                                    </View>
                                )
                            ) : (
                                clientAvatar ? (
                                    <Image source={{ uri: clientAvatar }} style={styles.avatarSmall} />
                                ) : (
                                    <View style={styles.avatarSmallPlaceholder}>
                                        <User size={12} color={theme.colors.gray500} />
                                    </View>
                                )
                            )}
                        </View>
                        <Text style={styles.messageMetaLine}>
                            <Text style={styles.messageSender}>{otherName}</Text>
                            <Text style={styles.messageDot}> · </Text>
                            <Text style={styles.messageSenderRole}>{otherRoleLabel}</Text>
                        </Text>
                    </View>
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={[styles.headerWrap, { paddingTop: insets.top + 12 }]}>
                {LinearGradient ? (
                    <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
                ) : (
                    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: TEAL }]} />
                )}
                <View style={styles.headerContent}>
                    <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
                        <ChevronLeft size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle} numberOfLines={1}>
                        {headerTitle}
                    </Text>
                    <View style={styles.headerSpacer} />
                </View>
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
                        data={messagesReversed}
                        renderItem={renderMessage}
                        keyExtractor={item => (item.id || item._id || Math.random()).toString()}
                        contentContainerStyle={styles.messagesList}
                        showsVerticalScrollIndicator={false}
                        inverted
                        keyboardShouldPersistTaps="handled"
                        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
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
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    headerWrap: {
        overflow: 'hidden',
        paddingBottom: 12,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.lg,
    },
    backButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    headerTitle: {
        flex: 1,
        textAlign: 'center',
        fontSize: 18,
        fontFamily: theme.fonts.semiBold,
        color: '#fff',
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
        flexGrow: 1,
        paddingHorizontal: theme.spacing.lg,
        paddingTop: theme.spacing.md,
        paddingBottom: theme.spacing.md,
    },
    messageRow: {
        marginBottom: 4,
    },
    messageRowGroupEnd: {
        marginBottom: 14,
    },
    messageRowGroupMid: {
        marginBottom: 2,
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
    },
    messageBubbleThem: {
        backgroundColor: TEAL_BUBBLE,
    },
    messageBubbleMeTail: {
        borderBottomRightRadius: 5,
    },
    messageBubbleThemTail: {
        borderBottomLeftRadius: 5,
    },
    messageBubbleGroupMid: {
        borderBottomLeftRadius: 18,
        borderBottomRightRadius: 18,
    },
    messageText: {
        fontSize: 16,
        fontFamily: theme.fonts.regular,
        color: '#FFFFFF',
    },
    messageTextMe: {
        color: theme.colors.gray900,
    },
    bubbleTime: {
        fontSize: 11,
        opacity: 0.85,
    },
    bubbleTimeMe: {
        color: theme.colors.gray500,
    },
    bubbleTimeThem: {
        color: 'rgba(255,255,255,0.8)',
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
        backgroundColor: TEAL,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonDisabled: { opacity: 0.5 },
});
