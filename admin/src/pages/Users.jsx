import React, { useState, useEffect } from 'react';
import api from '../api';
import styles from './Table.module.css';
import Modal from '../components/Modal';
import modalStyles from '../components/Modal.module.css';

const ROLE_LABEL = { client: 'Клиент', owner: 'Владелец', admin: 'Администратор' };
const ROLES = [
  { value: 'client', label: 'Клиент' },
  { value: 'owner', label: 'Владелец' },
  { value: 'admin', label: 'Администратор' },
];

const TABS = [
  { id: 'all', label: 'Все пользователи' },
  { id: 'client', label: 'Клиенты' },
  { id: 'owner', label: 'Владельцы' },
];

export default function Users() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [editing, setEditing] = useState(null);
  const emptyForm = () => ({
    name: '', first_name: '', last_name: '', email: '', phone: '',
    birthdate: '', about: '', address_line: '', address_city: '', address_country: '',
    role: 'client', new_password: '',
  });
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    api.get('/admin/users').then((r) => setList(r.data || [])).catch(() => setList([])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filteredList = activeTab === 'all'
    ? list
    : list.filter((u) => u.role === activeTab);

  const openEdit = (u) => {
    setEditing(u);
    setForm({
      name: u.name || '',
      first_name: u.first_name || '',
      last_name: u.last_name || '',
      email: u.email || '',
      phone: u.phone || '',
      birthdate: u.birthdate || '',
      about: u.about || '',
      address_line: u.address_line || '',
      address_city: u.address_city || '',
      address_country: u.address_country || '',
      role: u.role || 'client',
      new_password: '',
    });
    setError('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.new_password?.trim()) delete payload.new_password;
      await api.patch(`/admin/users/${editing.id}`, payload);
      setEditing(null);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editing || !confirm(`Удалить пользователя ${editing.email || editing.id}? Данные будут безвозвратно удалены.`)) return;
    setDeleting(true);
    setError('');
    try {
      await api.delete(`/admin/users/${editing.id}`);
      setEditing(null);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка удаления');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <div className={styles.loading}>Загрузка…</div>;

  return (
    <>
      <h1 className={styles.title}>Пользователи</h1>
      <p className={styles.desc}>Клиенты и владельцы приложений. Редактирование профиля.</p>
      <div className={styles.tabs}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Email</th>
              <th>Имя</th>
              <th>Роль</th>
              <th>Дата регистрации</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredList.map((u) => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.email}</td>
                <td>{u.name || '—'}</td>
                <td><span className={styles.badge}>{ROLE_LABEL[u.role] || u.role}</span></td>
                <td>{u.created_at ? new Date(u.created_at).toLocaleDateString('ru') : '—'}</td>
                <td>
                  <button type="button" className={styles.btn} onClick={() => openEdit(u)}>Редактировать</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredList.length === 0 && <p className={styles.empty}>Нет пользователей</p>}
      </div>

      {editing && (
        <Modal title="Редактировать пользователя" onClose={() => setEditing(null)}>
          <form onSubmit={handleSave} >
            {error && <p className={modalStyles.error}>{error}</p>}
            <div className={modalStyles.formRow}>
              <label className={modalStyles.label}>Отображаемое имя</label>
              <input
                className={modalStyles.input}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Краткое имя"
              />
            </div>
            <div className={modalStyles.formRow}>
              <label className={modalStyles.label}>Имя</label>
              <input
                className={modalStyles.input}
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                placeholder="Имя"
              />
            </div>
            <div className={modalStyles.formRow}>
              <label className={modalStyles.label}>Фамилия</label>
              <input
                className={modalStyles.input}
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                placeholder="Фамилия"
              />
            </div>
            <div className={modalStyles.formRow}>
              <label className={modalStyles.label}>Email</label>
              <input
                type="email"
                className={modalStyles.input}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className={modalStyles.formRow}>
              <label className={modalStyles.label}>Телефон</label>
              <input
                type="tel"
                className={modalStyles.input}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+7 ..."
              />
            </div>
            <div className={modalStyles.formRow}>
              <label className={modalStyles.label}>Дата рождения</label>
              <input
                type="date"
                className={modalStyles.input}
                value={form.birthdate}
                onChange={(e) => setForm({ ...form, birthdate: e.target.value })}
              />
            </div>
            <div className={modalStyles.formRow}>
              <label className={modalStyles.label}>О себе</label>
              <textarea
                className={modalStyles.input}
                rows={3}
                value={form.about}
                onChange={(e) => setForm({ ...form, about: e.target.value })}
                placeholder="О пользователе"
              />
            </div>
            <div className={modalStyles.formRow}>
              <label className={modalStyles.label}>Адрес (строка)</label>
              <input
                className={modalStyles.input}
                value={form.address_line}
                onChange={(e) => setForm({ ...form, address_line: e.target.value })}
                placeholder="Улица, дом"
              />
            </div>
            <div className={modalStyles.formRow}>
              <label className={modalStyles.label}>Город</label>
              <input
                className={modalStyles.input}
                value={form.address_city}
                onChange={(e) => setForm({ ...form, address_city: e.target.value })}
                placeholder="Город"
              />
            </div>
            <div className={modalStyles.formRow}>
              <label className={modalStyles.label}>Страна</label>
              <input
                className={modalStyles.input}
                value={form.address_country}
                onChange={(e) => setForm({ ...form, address_country: e.target.value })}
                placeholder="Страна"
              />
            </div>
            <div className={modalStyles.formRow}>
              <label className={modalStyles.label}>Новый пароль</label>
              <input
                type="password"
                className={modalStyles.input}
                value={form.new_password}
                onChange={(e) => setForm({ ...form, new_password: e.target.value })}
                placeholder="Оставьте пустым, чтобы не менять"
                autoComplete="new-password"
              />
            </div>
            <div className={modalStyles.formRow}>
              <label className={modalStyles.label}>Роль</label>
              <select
                className={modalStyles.select}
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div className={modalStyles.actions}>
              <button
                type="button"
                className={`${modalStyles.btn} ${modalStyles.btnDanger}`}
                onClick={handleDelete}
                disabled={deleting || saving}
                style={{ marginRight: 'auto' }}
              >
                {deleting ? 'Удаление…' : 'Удалить'}
              </button>
              <button type="button" className={`${modalStyles.btn} ${modalStyles.btnSecondary}`} onClick={() => setEditing(null)}>Отмена</button>
              <button type="submit" className={modalStyles.btn} disabled={saving}>{saving ? 'Сохранение…' : 'Сохранить'}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
