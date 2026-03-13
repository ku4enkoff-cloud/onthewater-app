import React, { useContext, useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert,
    KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Lock } from 'lucide-react-native';
import { AuthContext } from '../../shared/context/AuthContext';
import { api } from '../../shared/infrastructure/api';
import { theme } from '../../shared/theme';

let LinearGradient;
try { LinearGradient = require('expo-linear-gradient').LinearGradient; } catch (_) {}

const NAVY = theme.colors.primary;
const GRADIENT = [theme.colors.primary, theme.colors.primaryLight || '#2A4A7F'];
const TABS = ['Контакты', 'Пароль'];

function formatPhoneRu(raw) {
    const digits = raw.replace(/\D/g, '').replace(/^[78]/, '');
    const d = digits.slice(0, 10);
    if (d.length === 0) return '+7 ';
    if (d.length <= 3) return `+7 (${d}`;
    if (d.length <= 6) return `+7 (${d.slice(0, 3)}) ${d.slice(3)}`;
    if (d.length <= 8) return `+7 (${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
    return `+7 (${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 8)}-${d.slice(8, 10)}`;
}

function rawDigits(formatted) {
    return formatted.replace(/\D/g, '').replace(/^[78]/, '').slice(0, 10);
}

export default function ClientAccountInfoScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const authCtx = useContext(AuthContext);
    const user = authCtx?.user;
    const refreshUser = authCtx?.refreshUser;
    const [activeTab, setActiveTab] = useState(0);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    useEffect(() => {
        if (!user) return;
        setFirstName(user.first_name || user.name?.split(' ')[0] || '');
        setLastName(user.last_name || user.name?.split(' ').slice(1).join(' ') || '');
        setEmail(user.email || '');
        setPhone(rawDigits(user.phone || ''));
    }, [user]);

    const getErrorMsg = (e) => {
        if (e.response?.data?.error) return e.response.data.error;
        if (e.response?.status === 401) return 'Сессия истекла. Перезайдите в аккаунт.';
        if (e.message?.includes('Network')) return 'Нет связи с сервером. Проверьте подключение.';
        return e.message || 'Не удалось сохранить';
    };

    const saveContact = async () => {
        if (phone.length > 0 && phone.length !== 10) {
            Alert.alert('Ошибка', 'Введите корректный российский номер (10 цифр)');
            return;
        }
        setSaving(true);
        try {
            await api.patch('/auth/profile', {
                first_name: firstName, last_name: lastName,
                phone: phone.length === 10 ? `+7${phone}` : '',
            });
            if (refreshUser) await refreshUser();
            Alert.alert('Сохранено', 'Контактные данные обновлены');
            setEditing(false);
        } catch (e) {
            Alert.alert('Ошибка', getErrorMsg(e));
        } finally { setSaving(false); }
    };

    const savePassword = async () => {
        if (!currentPassword || !newPassword) {
            Alert.alert('Ошибка', 'Заполните все поля'); return;
        }
        if (newPassword !== confirmPassword) {
            Alert.alert('Ошибка', 'Новый пароль и подтверждение не совпадают'); return;
        }
        setSaving(true);
        try {
            await api.patch('/auth/password', { current_password: currentPassword, new_password: newPassword });
            Alert.alert('Готово', 'Пароль изменён');
            setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
        } catch (e) {
            Alert.alert('Ошибка', getErrorMsg(e));
        } finally { setSaving(false); }
    };

    const handleEditToggle = () => {
        if (activeTab === 1) {
            savePassword();
        } else if (editing) {
            saveContact();
        } else {
            setEditing(true);
        }
    };

    const handleDelete = () => {
        Alert.alert('Удаление аккаунта', 'Эта функция пока недоступна.');
    };

    const handleTabChange = (idx) => {
        setActiveTab(idx);
        setEditing(idx === 1);
    };

    const renderViewContactTab = () => (
        <View>
            <Text style={s.sectionTitle}>Контактная информация</Text>
            <ViewField label="Имя" value={firstName} />
            <ViewField label="Фамилия" value={lastName} />
            <ViewField label="Email" value={email} />
            <ViewField label="Телефон" value={phone ? formatPhoneRu(phone) : '—'} />
        </View>
    );

    const renderEditContactTab = () => (
        <View style={s.editCard}>
            <Text style={s.sectionTitle}>Контактная информация</Text>
            <EditField label="Имя" value={firstName} onChangeText={setFirstName} />
            <EditField label="Фамилия" value={lastName} onChangeText={setLastName} />
            <EditField label="Email" value={email} editable={false} showLock />
            <View style={s.editFieldWrap}>
                <Text style={s.editFieldLabel}>Номер телефона</Text>
                <View style={s.editFieldRow}>
                    <TextInput
                        style={s.editFieldInput}
                        value={formatPhoneRu(phone)}
                        onChangeText={(txt) => setPhone(rawDigits(txt))}
                        placeholder="+7 (___) ___-__-__"
                        placeholderTextColor={theme.colors.gray400}
                        keyboardType="phone-pad"
                        maxLength={18}
                    />
                </View>
            </View>
            <View style={s.contactHint}>
                <Lock size={14} color={theme.colors.gray400} />
                <Text style={s.contactHintText}>
                    Для обновления email — <Text style={s.contactHintLink}>свяжитесь с нами</Text>
                </Text>
            </View>
        </View>
    );

    const renderPasswordTab = () => (
        <View style={s.editCard}>
            <Text style={s.sectionTitle}>Смена пароля</Text>
            <EditField label="Текущий пароль" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry />
            <EditField label="Новый пароль" value={newPassword} onChangeText={setNewPassword} secureTextEntry />
            <EditField label="Подтвердите пароль" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
        </View>
    );

    const isPasswordTab = activeTab === 1;

    return (
        <View style={s.root}>
            <View style={s.headerWrap}>
                {LinearGradient ? (
                    <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
                ) : (
                    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: NAVY }]} />
                )}
                <View style={[s.headerInner, { paddingTop: insets.top + 4 }]}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                        <ChevronLeft size={24} color="#fff" />
                        <Text style={s.backText}>Назад</Text>
                    </TouchableOpacity>
                    <Text style={s.headerTitle}>Данные аккаунта</Text>
                    <View style={{ width: 70 }} />
                </View>
            </View>

            <View style={s.tabsRow}>
                {TABS.map((tab, idx) => (
                    <TouchableOpacity
                        key={tab}
                        style={[s.tab, activeTab === idx && s.tabActive]}
                        onPress={() => handleTabChange(idx)}
                        activeOpacity={0.7}
                    >
                        <Text style={[s.tabText, activeTab === idx && s.tabTextActive]}>{tab}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView
                    style={s.scroll}
                    contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: insets.bottom + 100 }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {activeTab === 0 && (editing ? renderEditContactTab() : renderViewContactTab())}
                    {activeTab === 1 && renderPasswordTab()}

                    {editing || isPasswordTab ? (
                        <TouchableOpacity
                            style={[s.saveBtn, saving && { opacity: 0.5 }]}
                            onPress={handleEditToggle}
                            disabled={saving}
                            activeOpacity={0.85}
                        >
                            <Text style={s.saveBtnText}>
                                {saving ? 'СОХРАНЕНИЕ...' : 'СОХРАНИТЬ ИЗМЕНЕНИЯ'}
                            </Text>
                        </TouchableOpacity>
                    ) : (
                        <>
                            <View style={s.editRow}>
                                <TouchableOpacity onPress={handleEditToggle} activeOpacity={0.6}>
                                    <Text style={s.editLink}>Редактировать</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={s.deleteDivider} />
                            <TouchableOpacity onPress={handleDelete} activeOpacity={0.6}>
                                <Text style={s.deleteText}>Удалить аккаунт</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

function ViewField({ label, value }) {
    return (
        <View style={s.viewFieldBlock}>
            <Text style={s.viewFieldLabel}>{label}</Text>
            <Text style={s.viewFieldValue}>{value || '—'}</Text>
        </View>
    );
}

function EditField({ label, value, onChangeText, placeholder, editable = true, secureTextEntry, keyboardType, showLock = false }) {
    return (
        <View style={s.editFieldWrap}>
            <Text style={s.editFieldLabel}>{label}</Text>
            <View style={s.editFieldRow}>
                <TextInput
                    style={[s.editFieldInput, !editable && { color: theme.colors.gray400 }]}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor={theme.colors.gray400}
                    editable={editable}
                    secureTextEntry={secureTextEntry}
                    keyboardType={keyboardType}
                />
                {showLock && <Lock size={16} color={theme.colors.gray400} />}
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.gray50 || '#F5F5F5' },
    headerWrap: { overflow: 'hidden' },
    headerInner: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingBottom: 14,
    },
    backBtn: { flexDirection: 'row', alignItems: 'center', width: 70 },
    backText: { fontSize: 15, fontFamily: theme.fonts.regular, color: '#fff', marginLeft: 2 },
    headerTitle: { fontSize: 17, fontFamily: theme.fonts.bold, color: '#fff' },
    tabsRow: {
        flexDirection: 'row', backgroundColor: '#fff',
        borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB',
    },
    tab: {
        flex: 1, alignItems: 'center', paddingVertical: 14,
        borderBottomWidth: 2.5, borderBottomColor: 'transparent',
    },
    tabActive: { borderBottomColor: NAVY },
    tabText: { fontSize: 14, fontFamily: theme.fonts.medium, color: theme.colors.gray400 },
    tabTextActive: { color: NAVY, fontFamily: theme.fonts.semiBold },
    scroll: { flex: 1 },
    sectionTitle: {
        fontSize: 20, fontFamily: theme.fonts.bold, color: NAVY,
        marginBottom: 16,
    },
    viewFieldBlock: {
        borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB',
        paddingBottom: 14, paddingTop: 14,
    },
    viewFieldLabel: {
        fontSize: 13, fontFamily: theme.fonts.regular, color: theme.colors.gray400,
        marginBottom: 4,
    },
    viewFieldValue: {
        fontSize: 17, fontFamily: theme.fonts.medium, color: NAVY,
    },
    editRow: {
        alignItems: 'center', marginTop: 28,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#E5E7EB', paddingBottom: 20,
    },
    editLink: { fontSize: 16, fontFamily: theme.fonts.semiBold, color: NAVY },
    deleteDivider: {
        height: StyleSheet.hairlineWidth, backgroundColor: '#E5E7EB', marginTop: 20,
    },
    deleteText: {
        fontSize: 15, fontFamily: theme.fonts.semiBold, color: theme.colors.error || '#D94040',
        textAlign: 'center', marginTop: 20,
    },
    editCard: {
        backgroundColor: '#fff', borderRadius: 20, padding: 20,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
    },
    editFieldWrap: {
        borderWidth: 1.2, borderColor: '#E0E4EA', borderRadius: 14,
        paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12,
        marginBottom: 12, backgroundColor: '#fff',
    },
    editFieldLabel: {
        fontSize: 12, fontFamily: theme.fonts.regular, color: theme.colors.gray400,
        marginBottom: 2,
    },
    editFieldRow: { flexDirection: 'row', alignItems: 'center' },
    editFieldInput: {
        flex: 1, fontSize: 17, fontFamily: theme.fonts.medium, color: NAVY,
        padding: 0,
    },
    contactHint: {
        flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 4,
    },
    contactHintText: {
        fontSize: 13, fontFamily: theme.fonts.regular, color: theme.colors.gray400, marginLeft: 6,
    },
    contactHintLink: { color: NAVY, fontFamily: theme.fonts.semiBold },
    saveBtn: {
        backgroundColor: NAVY, borderRadius: 14, paddingVertical: 18,
        alignItems: 'center', marginTop: 24,
    },
    saveBtnText: {
        fontSize: 15, fontFamily: theme.fonts.bold, color: '#fff', letterSpacing: 0.8,
    },
});
