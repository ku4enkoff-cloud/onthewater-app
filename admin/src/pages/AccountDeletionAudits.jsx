import React, { useState, useEffect } from 'react';
import api from '../api';
import styles from './Table.module.css';

const ROLE_LABEL = { client: 'Клиент', owner: 'Владелец', admin: 'Администратор' };

export default function AccountDeletionAudits() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/admin/account-deletion-audits', { params: { limit: 300 } })
      .then((r) => setList(r.data || []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, []);

  const formatDt = (v) => {
    if (!v) return '—';
    try {
      return new Date(v).toLocaleString('ru-RU');
    } catch (_) {
      return String(v);
    }
  };

  if (loading) return <div className={styles.loading}>Загрузка…</div>;

  return (
    <>
      <h1 className={styles.title}>Удалённые аккаунты (журнал)</h1>
      <p className={styles.desc}>
        Записи создаются при самоудалении аккаунта из приложения (владелец или клиент). Хранится снимок данных до удаления.
      </p>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ID записи</th>
              <th>Был user_id</th>
              <th>Email</th>
              <th>Имя</th>
              <th>Телефон</th>
              <th>Роль</th>
              <th>Регистрация (до)</th>
              <th>Удалён</th>
              <th>IP</th>
              <th>Источник</th>
              <th>Админ (id)</th>
              <th>User-Agent</th>
            </tr>
          </thead>
          <tbody>
            {list.map((row) => (
              <tr key={row.id}>
                <td>{row.id}</td>
                <td>{row.user_id}</td>
                <td>{row.email || '—'}</td>
                <td>{row.name || '—'}</td>
                <td>{row.phone || '—'}</td>
                <td><span className={styles.badge}>{ROLE_LABEL[row.role] || row.role || '—'}</span></td>
                <td>{formatDt(row.user_created_at)}</td>
                <td>{formatDt(row.deleted_at)}</td>
                <td>{row.ip_address || '—'}</td>
                <td>{row.source || '—'}</td>
                <td>{row.admin_actor_id ?? '—'}</td>
                <td style={{ maxWidth: 220, wordBreak: 'break-all', fontSize: 12 }}>
                  {row.user_agent ? `${String(row.user_agent).slice(0, 120)}${String(row.user_agent).length > 120 ? '…' : ''}` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && <p className={styles.empty}>Записей нет или миграция ещё не применена (npm run db:migrate).</p>}
      </div>
    </>
  );
}
