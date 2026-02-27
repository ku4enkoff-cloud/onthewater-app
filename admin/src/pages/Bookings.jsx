import React, { useState, useEffect } from 'react';
import api from '../api';
import styles from './Table.module.css';
import Modal from '../components/Modal';
import modalStyles from '../components/Modal.module.css';

const STATUS_LABEL = { pending: 'Ожидает', confirmed: 'Подтверждено', cancelled: 'Отменено' };
const STATUS_OPTIONS = [
  { value: 'pending', label: 'Ожидает' },
  { value: 'confirmed', label: 'Подтверждено' },
  { value: 'cancelled', label: 'Отменено' },
];

function getStatusBadgeClass(status) {
  const map = {
    pending: styles.badgePending,
    confirmed: styles.badgeConfirmed,
    cancelled: styles.badgeCancelled,
  };
  return [styles.badge, map[status]].filter(Boolean).join(' ');
}

function getBookingEndAt(b) {
  if (b.end_at) return new Date(b.end_at);
  const start = b.start_at ? new Date(b.start_at) : null;
  if (!start || isNaN(start.getTime())) return null;
  const raw = b.hours;
  if (raw == null) return null;
  const n = Number(raw);
  if (Number.isNaN(n)) return null;
  const mins = n <= 24 && n > 0 && n % 1 === 0 ? n * 60 : n;
  return new Date(start.getTime() + mins * 60 * 1000);
}

function toDatetimeLocal(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocal(v) {
  if (!v) return undefined;
  return new Date(v).toISOString();
}

export default function Bookings() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ status: 'pending', start_at: '', end_at: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    api.get('/admin/bookings').then((r) => setList(r.data || [])).catch(() => setList([])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openEdit = (b) => {
    setEditing(b);
    setForm({
      status: b.status || 'pending',
      start_at: toDatetimeLocal(b.start_at),
      end_at: toDatetimeLocal(b.end_at),
    });
    setError('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.patch(`/admin/bookings/${editing.id}`, {
        status: form.status,
        start_at: fromDatetimeLocal(form.start_at),
        end_at: fromDatetimeLocal(form.end_at),
      });
      setEditing(null);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className={styles.loading}>Загрузка…</div>;

  return (
    <>
      <h1 className={styles.title}>Бронирования</h1>
      <p className={styles.desc}>Все бронирования. Редактирование статуса и дат.</p>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Клиент ID</th>
              <th>Имя клиента</th>
              <th>Телефон клиента</th>
              <th>Имя владельца</th>
              <th>Телефон владельца</th>
              <th>Название объявления</th>
              <th>Дата начала</th>
              <th>Дата окончания</th>
              <th>Статус</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map((b) => (
              <tr key={b.id}>
                <td>{b.id}</td>
                <td>{b.user_id ?? '—'}</td>
                <td>{b.client_name ?? '—'}</td>
                <td>{b.client_phone ?? '—'}</td>
                <td>{b.owner_name ?? '—'}</td>
                <td>{b.owner_phone ?? '—'}</td>
                <td>{b.boat_title_display ?? b.boat_title ?? '—'}</td>
                <td>{b.start_at ? new Date(b.start_at).toLocaleString('ru') : '—'}</td>
                <td>{(() => { const end = getBookingEndAt(b) || (b.end_at ? new Date(b.end_at) : null); return end ? end.toLocaleString('ru') : '—'; })()}</td>
                <td><span className={getStatusBadgeClass(b.status)}>{STATUS_LABEL[b.status] || b.status || '—'}</span></td>
                <td>
                  <button type="button" className={styles.btn} onClick={() => openEdit(b)}>Редактировать</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && <p className={styles.empty}>Нет бронирований</p>}
      </div>

      {editing && (
        <Modal title="Редактировать бронирование" onClose={() => setEditing(null)}>
          <form onSubmit={handleSave}>
            {error && <p className={modalStyles.error}>{error}</p>}
            <div className={modalStyles.formRow}>
              <label className={modalStyles.label}>Статус</label>
              <select
                className={modalStyles.select}
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className={modalStyles.formRow}>
              <label className={modalStyles.label}>Дата и время начала</label>
              <input
                type="datetime-local"
                className={modalStyles.input}
                value={form.start_at}
                onChange={(e) => setForm({ ...form, start_at: e.target.value })}
              />
            </div>
            <div className={modalStyles.formRow}>
              <label className={modalStyles.label}>Дата и время окончания</label>
              <input
                type="datetime-local"
                className={modalStyles.input}
                value={form.end_at}
                onChange={(e) => setForm({ ...form, end_at: e.target.value })}
              />
            </div>
            <div className={modalStyles.actions}>
              <button type="button" className={`${modalStyles.btn} ${modalStyles.btnSecondary}`} onClick={() => setEditing(null)}>Отмена</button>
              <button type="submit" className={modalStyles.btn} disabled={saving}>{saving ? 'Сохранение…' : 'Сохранить'}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
