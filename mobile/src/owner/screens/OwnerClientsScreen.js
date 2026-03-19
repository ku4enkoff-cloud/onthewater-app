import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { UserPlus, Users2, Phone, Mail, Clock } from 'lucide-react-native';
import { theme } from '../../shared/theme';
import { api } from '../../shared/infrastructure/api';

export default function OwnerClientsScreen() {
    const insets = useSafeAreaInsets();
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [form, setForm] = useState({ name: '', phone: '', email: '', note: '' });

    const fetchClients = async () => {
        try {
            const res = await api.get('/owner/clients');
            setClients(Array.isArray(res.data) ? res.data : []);
        } catch (e) {
            console.log('Error fetching owner clients', e?.message);
            setClients([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClients();
    }, []);

    const openAddModal = () => {
        setForm({ name: '', phone: '', email: '', note: '' });
        setModalVisible(true);
    };

    const saveClient = async () => {
        try {
            if (!form.name && !form.phone && !form.email) {
                Alert.alert('Ошибка', 'Укажите хотя бы имя или телефон');
                return;
            }
            const res = await api.post('/owner/clients', form);
            const created = res.data;
            setClients(prev => [created, ...prev]);
            setModalVisible(false);
        } catch (e) {
            const msg = e.response?.data?.error || e.message || 'Не удалось сохранить клиента';
            Alert.alert('Ошибка', msg);
        }
    };

    const renderItem = ({ item }) => (
        <View style={s.card}>
            <View style={s.cardHeader}>
                <View style={s.avatarCircle}>
                    <Users2 size={18} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={s.name} numberOfLines={1}>{item.name || 'Клиент'}</Text>
                    {!!item.last_boat_title && (
                        <Text style={s.subtitle} numberOfLines={1}>Последний катер: {item.last_boat_title}</Text>
                    )}
                    {!!item.bookings_count && (
                        <Text style={s.subtitle}>Бронирований: {item.bookings_count}</Text>
                    )}
                </View>
            </View>
            <View style={s.infoRow}>
                {!!item.phone && (
                    <View style={s.infoItem}>
                        <Phone size={14} color={theme.colors.gray500} />
                        <Text style={s.infoText}>{item.phone}</Text>
                    </View>
                )}
                {!!item.email && (
                    <View style={s.infoItem}>
                        <Mail size={14} color={theme.colors.gray500} />
                        <Text style={s.infoText}>{item.email}</Text>
                    </View>
                )}
            </View>
            {!!item.last_booking_at && (
                <View style={s.infoItem}>
                    <Clock size={14} color={theme.colors.gray400} />
                    <Text style={s.infoText}>
                        Последнее бронирование:{' '}
                        {new Date(item.last_booking_at).toLocaleDateString('ru-RU')}
                    </Text>
                </View>
            )}
            {!!item.note && (
                <Text style={s.note} numberOfLines={2}>{item.note}</Text>
            )}
        </View>
    );

    return (
        <View style={s.root}>
            <View style={[s.header, { paddingTop: insets.top + 12 }]}>
                <Text style={s.headerTitle}>Клиенты</Text>
                <TouchableOpacity style={s.addBtn} onPress={openAddModal} activeOpacity={0.8}>
                    <UserPlus size={18} color="#fff" />
                    <Text style={s.addBtnText}>Добавить клиента</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={s.centered}>
                    <Text style={theme.typography.body}>Загрузка...</Text>
                </View>
            ) : (
                <FlatList
                    data={clients}
                    keyExtractor={(item, index) => String(item.id ?? item.user_id ?? index)}
                    contentContainerStyle={clients.length === 0 ? s.emptyContainer : s.list}
                    renderItem={renderItem}
                    ListEmptyComponent={(
                        <Text style={s.emptyText}>
                            Пока нет клиентов. Они будут появляться здесь после бронирований
                            или вы можете добавить их вручную.
                        </Text>
                    )}
                />
            )}

            <Modal
                visible={modalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={s.modalOverlay}>
                    <View style={s.modalContent}>
                        <Text style={s.modalTitle}>Новый клиент</Text>
                        <TextInput
                            style={s.input}
                            placeholder="Имя"
                            value={form.name}
                            onChangeText={(text) => setForm((f) => ({ ...f, name: text }))}
                        />
                        <TextInput
                            style={s.input}
                            placeholder="Телефон"
                            keyboardType="phone-pad"
                            value={form.phone}
                            onChangeText={(text) => setForm((f) => ({ ...f, phone: text }))}
                        />
                        <TextInput
                            style={s.input}
                            placeholder="Email"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            value={form.email}
                            onChangeText={(text) => setForm((f) => ({ ...f, email: text }))}
                        />
                        <TextInput
                            style={[s.input, s.inputMultiline]}
                            placeholder="Заметка"
                            multiline
                            value={form.note}
                            onChangeText={(text) => setForm((f) => ({ ...f, note: text }))}
                        />
                        <View style={s.modalActions}>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={s.modalCancel}>
                                <Text style={s.modalCancelText}>Отмена</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={saveClient} style={s.modalSave}>
                                <Text style={s.modalSaveText}>Сохранить</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
    header: {
        paddingHorizontal: 20,
        paddingBottom: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 0.5,
        borderBottomColor: '#E5E7EB',
    },
    headerTitle: {
        fontSize: 22,
        fontFamily: theme.fonts.bold,
        color: '#111827',
        marginBottom: 8,
    },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: '#0D5C5C',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        gap: 8,
    },
    addBtnText: {
        fontSize: 13,
        fontFamily: theme.fonts.medium,
        color: '#fff',
    },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    list: { paddingHorizontal: 20, paddingVertical: 12 },
    emptyContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    emptyText: {
        textAlign: 'center',
        fontSize: 14,
        fontFamily: theme.fonts.regular,
        color: theme.colors.gray400,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 14,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    avatarCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#0D5C5C',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    name: {
        fontSize: 15,
        fontFamily: theme.fonts.semiBold,
        color: '#111827',
    },
    subtitle: {
        fontSize: 12,
        fontFamily: theme.fonts.regular,
        color: theme.colors.gray500,
    },
    infoRow: { flexDirection: 'row', marginTop: 4, marginBottom: 4 },
    infoItem: { flexDirection: 'row', alignItems: 'center', marginRight: 12, gap: 4, marginTop: 2 },
    infoText: {
        fontSize: 12,
        fontFamily: theme.fonts.regular,
        color: theme.colors.gray600,
    },
    note: {
        marginTop: 4,
        fontSize: 12,
        fontFamily: theme.fonts.regular,
        color: theme.colors.gray500,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontFamily: theme.fonts.bold,
        color: '#111827',
        marginBottom: 12,
    },
    input: {
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontSize: 14,
        fontFamily: theme.fonts.regular,
        marginBottom: 8,
        backgroundColor: '#F9FAFB',
    },
    inputMultiline: {
        minHeight: 64,
        textAlignVertical: 'top',
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        marginTop: 8,
    },
    modalCancel: { paddingVertical: 8, paddingHorizontal: 12 },
    modalCancelText: {
        fontSize: 14,
        fontFamily: theme.fonts.regular,
        color: theme.colors.gray600,
    },
    modalSave: {
        paddingVertical: 8,
        paddingHorizontal: 14,
        backgroundColor: '#0D5C5C',
        borderRadius: 999,
    },
    modalSaveText: {
        fontSize: 14,
        fontFamily: theme.fonts.medium,
        color: '#fff',
    },
});

