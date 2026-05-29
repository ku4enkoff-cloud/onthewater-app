import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    TextInput,
    ActivityIndicator,
    ScrollView,
} from 'react-native';
import AppModal from './AppModal';
import { theme } from '../theme';
import { api } from '../infrastructure/api';

const REASONS = [
    { id: 'spam', label: 'Спам' },
    { id: 'harassment', label: 'Оскорбления / угрозы' },
    { id: 'fraud', label: 'Мошенничество' },
    { id: 'other', label: 'Другое' },
];

export default function ReportContentModal({
    visible,
    onClose,
    reportedUserId,
    contentType = 'user',
    contentId = null,
    onSubmitted,
}) {
    const [reason, setReason] = useState('spam');
    const [details, setDetails] = useState('');
    const [loading, setLoading] = useState(false);

    const submit = async () => {
        if (!reportedUserId) return;
        setLoading(true);
        try {
            await api.post('/moderation/reports', {
                reported_user_id: reportedUserId,
                content_type: contentType,
                content_id: contentId,
                reason,
                details: details.trim() || null,
            });
            onSubmitted?.();
            onClose?.();
            setDetails('');
            setReason('spam');
        } catch (e) {
            alert(e.response?.data?.error || 'Не удалось отправить жалобу');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AppModal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.card}>
                    <Text style={styles.title}>Пожаловаться</Text>
                    <ScrollView>
                        {REASONS.map((r) => (
                            <TouchableOpacity
                                key={r.id}
                                style={[styles.reasonRow, reason === r.id && styles.reasonRowActive]}
                                onPress={() => setReason(r.id)}
                            >
                                <Text style={styles.reasonText}>{r.label}</Text>
                            </TouchableOpacity>
                        ))}
                        <TextInput
                            style={styles.input}
                            placeholder="Комментарий (необязательно)"
                            value={details}
                            onChangeText={setDetails}
                            multiline
                            maxLength={500}
                        />
                    </ScrollView>
                    <View style={styles.actions}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={loading}>
                            <Text style={styles.cancelText}>Отмена</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.submitBtn, loading && styles.buttonDisabled]}
                            onPress={submit}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.submitText}>Отправить</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </AppModal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
    },
    card: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        padding: theme.spacing.lg,
        maxHeight: '80%',
    },
    title: { ...theme.typography.h2, marginBottom: theme.spacing.md },
    reasonRow: {
        padding: 12,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginBottom: 8,
    },
    reasonRowActive: { borderColor: theme.colors.primary, backgroundColor: '#E8F0FE' },
    reasonText: { ...theme.typography.body },
    input: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        padding: 12,
        minHeight: 80,
        marginTop: 8,
        textAlignVertical: 'top',
    },
    actions: { flexDirection: 'row', gap: 12, marginTop: theme.spacing.md },
    cancelBtn: { flex: 1, padding: 14, alignItems: 'center' },
    cancelText: { color: theme.colors.textMuted, fontWeight: '600' },
    submitBtn: {
        flex: 1,
        backgroundColor: theme.colors.primary,
        padding: 14,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
    },
    submitText: { color: '#fff', fontWeight: '700' },
    buttonDisabled: { opacity: 0.7 },
});
