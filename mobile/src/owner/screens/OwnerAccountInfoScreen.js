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

const GRADIENT = ['#0A3D3D', '#0D5C5C', '#1A7A6E'];
const TEAL = '#0D5C5C';
const NAVY = '#1B365D';
const GOLD = '#E8A838';
const TABS = ['Контакты', 'Адрес', 'Пароль'];

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

function formatDateRu(raw) {
    const d = raw.replace(/\D/g, '').slice(0, 8);
    if (d.length === 0) return '';
    if (d.length <= 2) return d;
    if (d.length <= 4) return `${d.slice(0, 2)}.${d.slice(2)}`;
    return `${d.slice(0, 2)}.${d.slice(2, 4)}.${d.slice(4, 8)}`;
}

function rawDateDigits(formatted) {
    return formatted.replace(/\D/g, '').slice(0, 8);
}

function isValidDateRu(digits) {
    if (digits.length !== 8) return false;
    const day = parseInt(digits.slice(0, 2), 10);
    const month = parseInt(digits.slice(2, 4), 10);
    const year = parseInt(digits.slice(4, 8), 10);
    if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2025) return false;
    const date = new Date(year, month - 1, day);
    return date.getDate() === day && date.getMonth() === month - 1 && date.getFullYear() === year;
}

export default function OwnerAccountInfoScreen({ navigation }) {
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
    const [birthdate, setBirthdate] = useState('');
    const [about, setAbout] = useState('');

    const [addressLine, setAddressLine] = useState('');
    const [addressCity, setAddressCity] = useState('');
    const [addressZip, setAddressZip] = useState('');
    const [addressCountry, setAddressCountry] = useState('');

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    useEffect(() => {
        if (!user) return;
        setFirstName(user.first_name || user.name?.split(' ')[0] || '');
        setLastName(user.last_name || user.name?.split(' ').slice(1).join(' ') || '');
        setEmail(user.email || '');
        setPhone(rawDigits(user.phone || ''));
        setBirthdate(rawDateDigits(user.birthdate || ''));
        setAbout(user.about || '');
        setAddressLine(user.address_line || '');
        setAddressCity(user.address_city || '');
        setAddressZip(user.address_zip || '');
        setAddressCountry(user.address_country || '');
    }, [user]);

    const phoneVerified = !!user?.phone;

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
        if (birthdate.length > 0 && !isValidDateRu(birthdate)) {
            Alert.alert('Ошибка', 'Введите корректную дату рождения (ДД.ММ.ГГГГ)');
            return;
        }
        setSaving(true);
        try {
            await api.patch('/auth/profile', {
                first_name: firstName, last_name: lastName,
                phone: phone.length === 10 ? `+7${phone}` : '',
                birthdate: birthdate.length === 8 ? formatDateRu(birthdate) : '',
                about,
            });
            if (refreshUser) await refreshUser();
            Alert.alert('Сохранено', 'Контактные данные обновлены');
            setEditing(false);
        } catch (e) {
            console.log('saveContact error', e.response?.status, e.response?.data, e.message);
            Alert.alert('Ошибка', getErrorMsg(e));
        } finally { setSaving(false); }
    };

    const saveAddress = async () => {
        setSaving(true);
        try {
            await api.patch('/auth/profile', {
                address_line: addressLine, address_city: addressCity,
                address_zip: addressZip, address_country: addressCountry,
            });
            if (refreshUser) await refreshUser();
            Alert.alert('Сохранено', 'Адрес обновлён');
            setEditing(false);
        } catch (e) {
            console.log('saveAddress error', e.response?.status, e.response?.data, e.message);
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
            console.log('savePassword error', e.response?.status, e.response?.data, e.message);
            Alert.alert('Ошибка', getErrorMsg(e));
        } finally { setSaving(false); }
    };

    const handleEditToggle = () => {
        if (activeTab === 2) {
            savePassword();
        } else if (editing) {
            if (activeTab === 0) saveContact();
            else saveAddress();
        } else {
            setEditing(true);
        }
    };

    const handleDelete = () => {
        Alert.alert('Удаление аккаунта', 'Эта функция пока недоступна.');
    };

    const handleTabChange = (idx) => {
        setActiveTab(idx);
        setEditing(idx === 2);
    };

    /* ===================== VIEW MODE ===================== */

    const renderViewContactTab = () => (
        <View>
            <Text style={s.sectionTitle}>Контактная информация</Text>
            <ViewField label="Имя" value={firstName} />
            <ViewField label="Фамилия" value={lastName} />
            <ViewField label="Email" value={email} />
            <View style={s.viewFieldBlock}>
                <Text style={s.viewFieldLabel}>Телефон</Text>
                {phoneVerified ? (
                    <View style={s.verifiedRow}>
                        <Text style={s.viewFieldValue}>{phone ? formatPhoneRu(phone) : '—'}</Text>
                        <View style={s.verifiedBadge}><Text style={s.verifiedText}>ПОДТВЕРЖДЁН</Text></View>
                    </View>
                ) : (
                    <Text style={s.viewFieldValue}>{phone ? formatPhoneRu(phone) : '—'}</Text>
                )}
            </View>
            <ViewField label="Дата рождения" value={birthdate ? formatDateRu(birthdate) : '—'} />
            <ViewField label="О вас" value={about || '—'} />
        </View>
    );

    const renderViewAddressTab = () => (
        <View>
            <Text style={s.sectionTitle}>Адрес</Text>
            <ViewField label="Улица, дом" value={addressLine || '—'} />
            <ViewField label="Город" value={addressCity || '—'} />
            <ViewField label="Индекс" value={addressZip || '—'} />
            <ViewField label="Страна" value={addressCountry || '—'} />
        </View>
    );

    /* ===================== EDIT MODE ===================== */

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
                    {phoneVerified && (
                        <View style={s.verifiedBadgeSmall}>
                            <Text style={s.verifiedTextSmall}>ПОДТВЕРЖДЁН</Text>
                        </View>
                    )}
                </View>
            </View>
            <View style={s.editFieldWrap}>
                <Text style={s.editFieldLabel}>Дата рождения</Text>
                <View style={s.editFieldRow}>
                    <TextInput
                        style={s.editFieldInput}
                        value={formatDateRu(birthdate)}
                        onChangeText={(txt) => setBirthdate(rawDateDigits(txt))}
                        placeholder="ДД.ММ.ГГГГ"
                        placeholderTextColor={theme.colors.gray400}
                        keyboardType="number-pad"
                        maxLength={10}
                    />
                </View>
            </View>
            <View style={s.aboutWrap}>
                <TextInput
                    style={s.aboutInput}
                    value={about}
                    onChangeText={setAbout}
                    placeholder="О себе"
                    placeholderTextColor={theme.colors.gray400}
                    multiline
                    textAlignVertical="top"
                />
            </View>

            <View style={s.contactHint}>
                <Lock size={14} color={theme.colors.gray400} />
                <Text style={s.contactHintText}>
                    Для обновления — <Text style={s.contactHintLink}>свяжитесь с нами</Text>
                </Text>
            </View>
        </View>
    );

    const renderEditAddressTab = () => (
        <View style={s.editCard}>
            <Text style={s.sectionTitle}>Адрес</Text>
            <EditField label="Улица, дом" value={addressLine} onChangeText={setAddressLine} placeholder="Ул. Примерная, 1" />
            <EditField label="Город" value={addressCity} onChangeText={setAddressCity} placeholder="Москва" />
            <EditField label="Индекс" value={addressZip} onChangeText={setAddressZip} placeholder="101000" keyboardType="number-pad" />
            <EditField label="Страна" value={addressCountry} onChangeText={setAddressCountry} placeholder="Россия" />
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

    const isPasswordTab = activeTab === 2;

    return (
        <View style={s.root}>
            {/* Header */}
            <View style={s.headerWrap}>
                {LinearGradient ? (
                    <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
                ) : (
                    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: TEAL }]} />
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

            {/* Tabs */}
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

            {/* Content */}
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView
                    style={s.scroll}
                    contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: insets.bottom + 100 }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Contact */}
                    {activeTab === 0 && (editing ? renderEditContactTab() : renderViewContactTab())}
                    {/* Address */}
                    {activeTab === 1 && (editing ? renderEditAddressTab() : renderViewAddressTab())}
                    {/* Password — always editable */}
                    {activeTab === 2 && renderPasswordTab()}

                    {/* Bottom action */}
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

/* ===================== SUB-COMPONENTS ===================== */

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

/* ===================== STYLES ===================== */

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#F5F5F5' },

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
    tabActive: { borderBottomColor: TEAL },
    tabText: { fontSize: 14, fontFamily: theme.fonts.medium, color: theme.colors.gray400 },
    tabTextActive: { color: TEAL, fontFamily: theme.fonts.semiBold },

    scroll: { flex: 1 },
    sectionTitle: {
        fontSize: 20, fontFamily: theme.fonts.bold, color: NAVY,
        marginBottom: 16,
    },

    /* ---- VIEW mode ---- */
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
    verifiedRow: { flexDirection: 'row', alignItems: 'center' },
    verifiedBadge: {
        backgroundColor: TEAL, paddingHorizontal: 10, paddingVertical: 3,
        borderRadius: 4, marginLeft: 10,
    },
    verifiedText: {
        fontSize: 11, fontFamily: theme.fonts.bold, color: '#fff', letterSpacing: 0.8,
    },

    editRow: {
        alignItems: 'center', marginTop: 28,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#E5E7EB', paddingBottom: 20,
    },
    editLink: { fontSize: 16, fontFamily: theme.fonts.semiBold, color: TEAL },
    deleteDivider: {
        height: StyleSheet.hairlineWidth, backgroundColor: '#E5E7EB', marginTop: 20,
    },
    deleteText: {
        fontSize: 15, fontFamily: theme.fonts.semiBold, color: '#D94040',
        textAlign: 'center', marginTop: 20,
    },

    /* ---- EDIT mode ---- */
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

    verifiedBadgeSmall: {
        backgroundColor: '#1B7A4A', paddingHorizontal: 8, paddingVertical: 2,
        borderRadius: 4,
    },
    verifiedTextSmall: {
        fontSize: 10, fontFamily: theme.fonts.bold, color: '#fff', letterSpacing: 0.6,
    },

    aboutWrap: {
        borderWidth: 1.2, borderColor: '#E0E4EA', borderRadius: 14,
        paddingHorizontal: 16, paddingVertical: 14,
        marginBottom: 12, backgroundColor: '#fff', minHeight: 100,
    },
    aboutInput: {
        fontSize: 16, fontFamily: theme.fonts.regular, color: NAVY,
        padding: 0, minHeight: 70, textAlignVertical: 'top',
    },

    contactHint: {
        flexDirection: 'row', alignItems: 'center',
        marginTop: 8, marginBottom: 4,
    },
    contactHintText: {
        fontSize: 13, fontFamily: theme.fonts.regular, color: theme.colors.gray400,
        marginLeft: 6,
    },
    contactHintLink: {
        color: TEAL, fontFamily: theme.fonts.semiBold,
    },

    saveBtn: {
        backgroundColor: GOLD, borderRadius: 14, paddingVertical: 18,
        alignItems: 'center', marginTop: 24,
    },
    saveBtnText: {
        fontSize: 15, fontFamily: theme.fonts.bold, color: '#fff',
        letterSpacing: 0.8,
    },
});
