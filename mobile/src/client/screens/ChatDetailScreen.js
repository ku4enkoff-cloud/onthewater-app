import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
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
    InteractionManager,
    Alert,
    ActionSheetIOS,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../shared/theme';
import { api } from '../../shared/infrastructure/api';
import { getPhotoUrl } from '../../shared/infrastructure/config';
import { AuthContext } from '../../shared/context/AuthContext';
import { ChevronLeft, Send, Lock, User, MoreVertical } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import ReportContentModal from '../../shared/components/ReportContentModal';
import { filterMessageText } from '../../shared/utils/contentFilter';

/** Клиент — синие пузыри; владелец — палитра как на OwnerChatScreen / остальных экранах владельца. */
const BLUE = '#1E5DB8';
const BLUE_BUBBLE = '#2B74D8';
const LIGHT_GRAY_BUBBLE = '#E5E7EB';
const OWNER_GRADIENT = ['#0A3D3D', '#0D5C5C', '#1A7A6E', '#3A9E7A'];
const OWNER_TEAL = '#0D5C5C';
const OWNER_BUBBLE_INCOMING = '#1A7A6E';
const OWNER_LINK = '#1A7A6E';

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
    const [reportVisible, setReportVisible] = useState(false);
    const [reportTarget, setReportTarget] = useState({ contentType: 'user', contentId: null });

    const scrollToBottom = useCallback((animated = false) => {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                flatListRef.current?.scrollToEnd({ animated });
            });
        });
    }, []);

    useEffect(() => {
        const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
        const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
        return () => {
            show.remove();
            hide.remove();
        };
    }, []);

    useEffect(() => {
        const id = setTimeout(() => scrollToBottom(keyboardVisible), 50);
        return () => clearTimeout(id);
    }, [keyboardVisible, messages.length, scrollToBottom]);

    useEffect(() => {
        if (loading) return;
        const task = InteractionManager.runAfterInteractions(() => {
            setTimeout(() => scrollToBottom(false), Platform.OS === 'android' ? 80 : 40);
        });
        return () => task.cancel();
    }, [loading, messages.length, scrollToBottom]);

    useFocusEffect(
        useCallback(() => {
            if (loading) return undefined;
            const id = setTimeout(() => scrollToBottom(false), 120);
            return () => clearTimeout(id);
        }, [loading, messages.length, scrollToBottom])
    );

    const inputRowPaddingBottom = keyboardVisible
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

    const otherUserId =
        currentUser?.role === 'owner'
            ? chat?.user_id
            : chat?.owner_id;

    const openReport = (contentType, contentId = null) => {
        if (!otherUserId) {
            Alert.alert('Ошибка', 'Не удалось определить пользователя');
            return;
        }
        setReportTarget({ contentType, contentId });
        setReportVisible(true);
    };

    const blockUser = () => {
        if (!otherUserId) return;
        Alert.alert(
            'Заблокировать пользователя?',
            'Вы больше не увидите сообщения от этого пользователя. Жалоба будет отправлена модераторам.',
            [
                { text: 'Отмена', style: 'cancel' },
                {
                    text: 'Заблокировать',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.post(`/moderation/users/${otherUserId}/block`);
                            Alert.alert('Готово', 'Пользователь заблокирован. Жалоба отправлена модераторам.');
                            navigation.goBack();
                        } catch (e) {
                            Alert.alert('Ошибка', e.response?.data?.error || 'Не удалось заблокировать');
                        }
                    },
                },
            ]
        );
    };

    const showChatMenu = () => {
        const lastOtherMessage = [...messages].reverse().find((m) => {
            const isMe = m.sender === (currentUser?.role === 'owner' ? 'owner' : 'me');
            return !isMe;
        });
        const options = [];
        const handlers = [];
        if (lastOtherMessage?.id) {
            options.push('Пожаловаться на последнее сообщение');
            handlers.push(() => openReport('message', lastOtherMessage.id));
        }
        options.push('Пожаловаться на пользователя', 'Заблокировать пользователя', 'Отмена');
        handlers.push(
            () => openReport('user', null),
            blockUser,
            () => {}
        );
        const cancelIndex = options.length - 1;
        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                { options, cancelButtonIndex: cancelIndex, destructiveButtonIndex: options.length - 2 },
                (i) => { if (i >= 0 && i < handlers.length) handlers[i](); }
            );
        } else {
            Alert.alert('Действия', undefined, [
                ...options.slice(0, -1).map((label, i) => ({
                    text: label,
                    style: label.includes('Заблокировать') ? 'destructive' : 'default',
                    onPress: handlers[i],
                })),
                { text: 'Отмена', style: 'cancel' },
            ]);
        }
    };

    const sendMessage = async () => {
        const text = inputText.trim();
        if (!text) return;
        const validation = filterMessageText(text);
        if (!validation.ok) {
            Alert.alert('Сообщение не отправлено', validation.error);
            return;
        }
        setInputText('');
        try {
            const res = await api.post(`/chats/${chatId}/messages`, { text });
            setMessages(prev => [...prev, res.data]);
            scrollToBottom(true);
        } catch (e) {
            const msg = e.response?.data?.error || 'Не удалось отправить сообщение';
            Alert.alert('Ошибка', msg);
            setInputText(text);
        }
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    };

    const myName = currentUser?.name || currentUser?.first_name || 'Вы';
    const ownerName = chat?.owner_name || 'Владелец';
    const clientName = chat?.user_name || chat?.client_name || 'Клиент';
    const clientAvatar = getPhotoUrl(chat?.user_avatar || chat?.client_avatar) || chat?.user_avatar || chat?.client_avatar || null;
    const ownerAvatar = getPhotoUrl(chat?.owner_avatar) || chat?.owner_avatar || null;

    const tripLabel =
        chat?.trip_date_formatted ||
        chat?.trip_date ||
        chat?.trip_date_short;

    const headerTitle = currentUser?.role === 'owner'
        ? (chat?.user_name || chat?.client_name || 'Клиент')
        : (chat?.owner_name || 'Владелец');

    /** Один компонент для client + owner; визуальные отличия только для роли owner (макет бирюза). */
    const isOwnerApp = currentUser?.role === 'owner';

    const renderMessage = ({ item, index }) => {
        const nextItem = messages[index + 1];
        const isLastInGroup = !nextItem || nextItem.sender !== item.sender;
        const isMe = item.sender === (currentUser?.role === 'owner' ? 'owner' : 'me');
        const timeStr = formatTime(item.created_at || item.createdAt);
        const isOwnerSender = item.sender === 'owner';
        const otherName = isOwnerSender ? ownerName : clientName;
        const otherRoleLabel = isOwnerSender ? 'Владелец' : 'Клиент';
        const themBubbleStyle = isOwnerApp
            ? { backgroundColor: OWNER_BUBBLE_INCOMING }
            : styles.messageBubbleThem;
        const bubble = (
                <View style={[
                    styles.messageBubble,
                    isMe ? styles.messageBubbleMe : themBubbleStyle,
                    isLastInGroup && isMe && styles.messageBubbleMeTail,
                    isLastInGroup && !isMe && (isOwnerApp ? styles.messageBubbleThemTailOwner : styles.messageBubbleThemTail),
                    !isLastInGroup && styles.messageBubbleGroupMid,
                ]}>
                    <Text style={[styles.messageText, isMe && styles.messageTextMe]}>
                        {item.text || ''}
                        {'  '}
                        <Text style={[styles.bubbleTime, isMe ? styles.bubbleTimeMe : styles.bubbleTimeThem]}>{timeStr}</Text>
                    </Text>
                </View>
        );
        return (
            <View style={[
                styles.messageRow,
                isMe ? styles.messageRowMe : styles.messageRowThem,
                isLastInGroup ? styles.messageRowGroupEnd : styles.messageRowGroupMid,
            ]}>
                {!isMe ? (
                    <TouchableOpacity
                        activeOpacity={0.9}
                        onLongPress={() => item.id && openReport('message', item.id)}
                        delayLongPress={400}
                    >
                        {bubble}
                    </TouchableOpacity>
                ) : (
                    bubble
                )}
                {!isMe && (
                    <View style={[styles.messageMeta, styles.messageMetaThem, isOwnerApp && styles.messageMetaThemOwner]}>
                        {!isOwnerApp && (
                            <View style={styles.avatarSmallWrap}>
                                {isOwnerSender ? (
                                    ownerAvatar ? (
                                        <Image source={{ uri: ownerAvatar }} style={styles.avatarSmall} />
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
                        )}
                        <Text style={[styles.messageMetaLine, isOwnerApp && styles.messageMetaLineOwner]}>
                            <Text style={styles.messageSender}>{otherName}</Text>
                            <Text style={styles.messageDot}> · </Text>
                            <Text style={styles.messageSenderRole}>{otherRoleLabel}</Text>
                        </Text>
                    </View>
                )}
            </View>
        );
    };

    const headerTitleColor = isOwnerApp ? '#FFFFFF' : theme.colors.gray900;
    const backIconColor = isOwnerApp ? '#FFFFFF' : theme.colors.gray900;

    return (
        <View style={styles.container}>
            {isOwnerApp ? (
                <View style={styles.headerWrapOwner}>
                    <LinearGradient
                        colors={OWNER_GRADIENT}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFillObject}
                    />
                    <View style={[styles.headerInnerOwner, { paddingTop: insets.top + 12 }]}>
                        <View style={styles.headerContent}>
                            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
                                <ChevronLeft size={24} color={backIconColor} />
                            </TouchableOpacity>
                            <Text style={[styles.headerTitle, { color: headerTitleColor }]} numberOfLines={1}>
                                {headerTitle}
                            </Text>
                            <TouchableOpacity style={styles.menuButton} onPress={showChatMenu} accessibilityLabel="Меню чата">
                                <MoreVertical size={22} color={backIconColor} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            ) : (
                <View style={[styles.headerWrap, { paddingTop: insets.top + 12 }]}>
                    <View style={styles.headerContent}>
                        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
                            <ChevronLeft size={24} color={backIconColor} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle} numberOfLines={1}>
                            {headerTitle}
                        </Text>
                        <TouchableOpacity style={styles.menuButton} onPress={showChatMenu} accessibilityLabel="Меню чата">
                            <MoreVertical size={22} color={backIconColor} />
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            <ReportContentModal
                visible={reportVisible}
                onClose={() => setReportVisible(false)}
                reportedUserId={otherUserId}
                contentType={reportTarget.contentType}
                contentId={reportTarget.contentId}
                onSubmitted={() => Alert.alert('Спасибо', 'Жалоба отправлена. Мы рассмотрим её в течение 24 часов.')}
            />

            {!loading && (
                <View style={[styles.tripHeader, isOwnerApp && styles.tripHeaderOwner]}>
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
                        <Text style={[styles.tripDetailsText, isOwnerApp && styles.tripDetailsTextOwner]}>См. детали</Text>
                    </TouchableOpacity>
                </View>
            )}

            {!loading && !keyboardVisible && (
                <View style={[styles.infoBanner, isOwnerApp && styles.infoBannerOwner]}>
                    <View style={[styles.infoIconWrap, isOwnerApp && styles.infoIconWrapOwner]}>
                        <Lock size={18} color="#FFFFFF" strokeWidth={2} />
                    </View>
                    <Text style={[styles.infoText, isOwnerApp && styles.infoTextOwner]}>
                        Для вашей безопасности общайтесь только в приложении.
                    </Text>
                </View>
            )}

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={isOwnerApp ? OWNER_TEAL : theme.colors.primary} />
                </View>
            ) : (
                <KeyboardAvoidingView
                    style={styles.keyboardWrap}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    keyboardVerticalOffset={0}
                >
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        renderItem={renderMessage}
                        keyExtractor={item => (item.id || item._id || Math.random()).toString()}
                        contentContainerStyle={[styles.messagesList, isOwnerApp && styles.messagesListOwner]}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        onContentSizeChange={() => {
                            if (!loading) scrollToBottom(keyboardVisible);
                        }}
                    />
                    <View style={[styles.inputRow, { paddingBottom: inputRowPaddingBottom }, isOwnerApp && styles.inputRowOwner]}>
                        <TextInput
                            style={[styles.input, isOwnerApp && styles.inputOwner]}
                            placeholder="Напишите сообщение..."
                            placeholderTextColor={theme.colors.gray400}
                            value={inputText}
                            onChangeText={setInputText}
                            multiline
                            maxLength={1000}
                        />
                        <TouchableOpacity
                            style={[
                                styles.sendButton,
                                isOwnerApp && styles.sendButtonOwner,
                                !inputText.trim() && styles.sendButtonDisabled,
                            ]}
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
        backgroundColor: '#FFFFFF',
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
        elevation: 6,
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
        color: theme.colors.gray900,
    },
    headerSpacer: { width: 40 },
    menuButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerWrapOwner: {
        overflow: 'hidden',
        paddingBottom: theme.spacing.md,
    },
    headerInnerOwner: {
        paddingHorizontal: theme.spacing.lg,
        paddingBottom: theme.spacing.md,
    },
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
    tripHeaderOwner: {
        backgroundColor: '#FFFFFF',
        borderBottomColor: theme.colors.gray200,
        borderBottomWidth: 1,
    },
    tripDetailsTextOwner: {
        color: OWNER_LINK,
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
        backgroundColor: BLUE_BUBBLE,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: theme.spacing.md,
    },
    infoBannerOwner: {
        backgroundColor: theme.colors.gray100,
        marginHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.md,
        borderRadius: 12,
        borderBottomWidth: 0,
        marginTop: theme.spacing.sm,
        marginBottom: theme.spacing.xs,
    },
    infoIconWrapOwner: {
        backgroundColor: OWNER_TEAL,
    },
    infoTextOwner: {
        color: theme.colors.gray700,
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
        justifyContent: 'flex-end',
        paddingHorizontal: theme.spacing.lg,
        paddingTop: theme.spacing.md,
        paddingBottom: theme.spacing.md,
    },
    messagesListOwner: {
        backgroundColor: '#FAFAFA',
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
        backgroundColor: BLUE_BUBBLE,
    },
    messageBubbleMeTail: {
        borderBottomRightRadius: 5,
    },
    messageBubbleThemTail: {
        borderBottomLeftRadius: 5,
    },
    messageBubbleThemTailOwner: {
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
    messageMetaThemOwner: {
        paddingLeft: 4,
    },
    messageMetaLineOwner: {
        marginLeft: 0,
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
    inputRowOwner: {
        backgroundColor: '#FFFFFF',
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
    inputOwner: {
        backgroundColor: '#FFFFFF',
        borderColor: theme.colors.gray200,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: BLUE,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonOwner: {
        backgroundColor: OWNER_TEAL,
    },
    sendButtonDisabled: { opacity: 0.5 },
});
