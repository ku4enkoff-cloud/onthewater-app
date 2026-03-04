import React, { useState, useEffect } from 'react';
import api from '../api';
import styles from './Table.module.css';

const STATUS_LABEL = { pending: 'На модерации', approved: 'Одобрен', rejected: 'Отклонён' };

function getStatusBadgeClass(status) {
  const map = {
    pending: styles.badgePending,
    approved: styles.badgeConfirmed,
    rejected: styles.badgeCancelled,
  };
  return [styles.badge, map[status]].filter(Boolean).join(' ');
}

export default function Reviews() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pending');
  const [actingId, setActingId] = useState(null);

  const load = () => {
    setLoading(true);
    api
      .get('/admin/reviews', { params: tab ? { status: tab } : {} })
      .then((r) => setList(r.data || []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [tab]);

  const setStatus = async (id, status, spam = false) => {
    setActingId(id);
    try {
      await api.patch(`/admin/reviews/${id}`, { status, ...(spam && { spam: true }) });
      load();
    } catch (e) {
      console.error(e);
    } finally {
      setActingId(null);
    }
  };

  if (loading) return <div className={styles.loading}>Загрузка…</div>;

  return (
    <>
      <h1 className={styles.title}>Отзывы</h1>
      <p className={styles.desc}>Модерация отзывов. Одобренные отображаются на катере.</p>

      <div className={styles.tabs}>
        <button
          type="button"
          className={tab === 'pending' ? `${styles.tab} ${styles.tabActive}` : styles.tab}
          onClick={() => setTab('pending')}
        >
          На модерации
        </button>
        <button
          type="button"
          className={tab === 'approved' ? `${styles.tab} ${styles.tabActive}` : styles.tab}
          onClick={() => setTab('approved')}
        >
          Одобренные
        </button>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Катер</th>
              <th>Автор</th>
              <th>Оценка</th>
              <th>Текст</th>
              <th>Статус</th>
              <th>Дата</th>
              {tab === 'pending' && <th>Действия</th>}
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{r.boat_title ?? '—'}</td>
                <td>{r.user_name ?? '—'}</td>
                <td>{r.rating ?? '—'}</td>
                <td style={{ maxWidth: 280 }}>{(r.text || '').slice(0, 120)}{(r.text && r.text.length > 120) ? '…' : ''}</td>
                <td><span className={getStatusBadgeClass(r.status)}>{STATUS_LABEL[r.status] || r.status || '—'}</span></td>
                <td>{r.created_at ? new Date(r.created_at).toLocaleString('ru') : '—'}</td>
                {tab === 'pending' && (
                  <td>
                    <button
                      type="button"
                      className={styles.btn}
                      disabled={actingId === r.id}
                      onClick={() => setStatus(r.id, 'approved')}
                    >
                      {actingId === r.id ? '…' : 'Одобрить'}
                    </button>
                    {' '}
                    <button
                      type="button"
                      className={`${styles.btn} ${styles.badgeCancelled}`}
                      style={{ border: '1px solid #b91c1c', background: '#fee2e2', color: '#b91c1c' }}
                      disabled={actingId === r.id}
                      onClick={() => setStatus(r.id, 'rejected')}
                    >
                      Отклонить
                    </button>
                    {' '}
                    <button
                      type="button"
                      className={styles.btn}
                      style={{ border: '1px solid #64748b', background: '#f1f5f9', color: '#475569' }}
                      disabled={actingId === r.id}
                      onClick={() => setStatus(r.id, 'rejected', true)}
                    >
                      Спам
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && <p className={styles.empty}>Нет отзывов</p>}
      </div>
    </>
  );
}
