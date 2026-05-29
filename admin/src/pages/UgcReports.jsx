import React, { useState, useEffect } from 'react';
import api from '../api';
import styles from './Table.module.css';

const STATUS_LABEL = { open: 'Открыта', resolved: 'Закрыта', dismissed: 'Отклонена' };
const REASON_LABEL = {
    spam: 'Спам',
    harassment: 'Оскорбления',
    fraud: 'Мошенничество',
    other: 'Другое',
    user_blocked: 'Блокировка',
};

function isOverSla(createdAt) {
    if (!createdAt) return false;
    const age = Date.now() - new Date(createdAt).getTime();
    return age > 24 * 60 * 60 * 1000;
}

export default function UgcReports() {
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('open');
    const [actingId, setActingId] = useState(null);

    const load = () => {
        setLoading(true);
        api
            .get('/admin/ugc-reports', { params: { status: tab } })
            .then((r) => setList(r.data || []))
            .catch(() => setList([]))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        load();
    }, [tab]);

    const patchReport = async (id, body) => {
        setActingId(id);
        try {
            await api.patch(`/admin/ugc-reports/${id}`, body);
            load();
        } catch (e) {
            console.error(e);
            alert(e.response?.data?.error || 'Ошибка');
        } finally {
            setActingId(null);
        }
    };

    const deleteMessage = async (report) => {
        if (!report.content_id || report.content_type !== 'message') return;
        if (!window.confirm('Удалить сообщение?')) return;
        setActingId(report.id);
        try {
            await api.delete(`/admin/ugc-reports/${report.id}/messages/${report.content_id}`);
            await patchReport(report.id, { status: 'resolved' });
        } catch (e) {
            alert(e.response?.data?.error || 'Ошибка удаления');
            setActingId(null);
        }
    };

    if (loading) return <div className={styles.loading}>Загрузка…</div>;

    return (
        <>
            <h1 className={styles.title}>Жалобы UGC</h1>
            <p className={styles.desc}>
                Жалобы на чаты и пользователей. Открытые старше 24 ч подсвечены. Обработайте в течение 24 часов.
            </p>

            <div className={styles.tabs}>
                <button
                    type="button"
                    className={tab === 'open' ? `${styles.tab} ${styles.tabActive}` : styles.tab}
                    onClick={() => setTab('open')}
                >
                    Открытые
                </button>
                <button
                    type="button"
                    className={tab === 'resolved' ? `${styles.tab} ${styles.tabActive}` : styles.tab}
                    onClick={() => setTab('resolved')}
                >
                    Закрытые
                </button>
                <button
                    type="button"
                    className={tab === 'dismissed' ? `${styles.tab} ${styles.tabActive}` : styles.tab}
                    onClick={() => setTab('dismissed')}
                >
                    Отклонённые
                </button>
            </div>

            <div className={styles.tableWrap}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Дата</th>
                            <th>От кого</th>
                            <th>На кого</th>
                            <th>Тип</th>
                            <th>Причина</th>
                            <th>Сообщение</th>
                            <th>Статус</th>
                            {tab === 'open' && <th>Действия</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {list.map((r) => (
                            <tr
                                key={r.id}
                                style={tab === 'open' && isOverSla(r.created_at) ? { background: '#fef3c7' } : undefined}
                            >
                                <td>{r.id}</td>
                                <td>{r.created_at ? new Date(r.created_at).toLocaleString('ru') : '—'}</td>
                                <td className={styles.cellTruncate} title={r.reporter_email || ''}>
                                    {r.reporter_name || r.reporter_email || r.reporter_id}
                                </td>
                                <td className={styles.cellTruncate} title={r.reported_email || ''}>
                                    {r.reported_name || r.reported_email || r.reported_user_id}
                                </td>
                                <td>{r.content_type}{r.content_id ? ` #${r.content_id}` : ''}</td>
                                <td>{REASON_LABEL[r.reason] || r.reason}</td>
                                <td className={styles.cellWrap}>{(r.message_text || r.details || '—').slice(0, 120)}</td>
                                <td>{STATUS_LABEL[r.status] || r.status}</td>
                                {tab === 'open' && (
                                    <td>
                                        <button
                                            type="button"
                                            className={styles.btn}
                                            disabled={actingId === r.id}
                                            onClick={() => patchReport(r.id, { status: 'resolved' })}
                                        >
                                            Закрыть
                                        </button>
                                        {' '}
                                        <button
                                            type="button"
                                            className={styles.btn}
                                            disabled={actingId === r.id}
                                            onClick={() => patchReport(r.id, { status: 'dismissed' })}
                                        >
                                            Отклонить
                                        </button>
                                        {r.content_type === 'message' && r.content_id ? (
                                            <>
                                                {' '}
                                                <button
                                                    type="button"
                                                    className={styles.btn}
                                                    disabled={actingId === r.id}
                                                    onClick={() => deleteMessage(r)}
                                                >
                                                    Удалить сообщение
                                                </button>
                                            </>
                                        ) : null}
                                        {' '}
                                        <button
                                            type="button"
                                            className={`${styles.btn} ${styles.badgeCancelled}`}
                                            style={{ border: '1px solid #b91c1c', background: '#fee2e2', color: '#b91c1c' }}
                                            disabled={actingId === r.id}
                                            onClick={() => {
                                                if (!window.confirm('Заблокировать пользователя на платформе?')) return;
                                                patchReport(r.id, { status: 'resolved', suspend_user: true });
                                            }}
                                        >
                                            Заблокировать
                                        </button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
                {list.length === 0 && <p className={styles.empty}>Нет жалоб</p>}
            </div>
        </>
    );
}
