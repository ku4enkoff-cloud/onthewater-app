import React, { useState, useEffect } from 'react';
import api from '../api';
import styles from './Table.module.css';
import Modal from '../components/Modal';
import modalStyles from '../components/Modal.module.css';

export default function Amenities() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [reordering, setReordering] = useState(false);

  const load = () => {
    api.get('/admin/amenities').then((r) => setList(r.data || [])).catch(() => setList([])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditing({ id: null });
    setForm({ name: '' });
    setError('');
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({ name: item.name || '' });
    setError('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    const name = form.name.trim();
    if (!name) {
      setError('Укажите название удобства');
      return;
    }
    setSaving(true);
    try {
      if (editing.id) {
        await api.put(`/admin/amenities/${editing.id}`, { name });
      } else {
        await api.post('/admin/amenities', { name });
      }
      setEditing(null);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Удалить это удобство?')) return;
    try {
      await api.delete(`/admin/amenities/${id}`);
      load();
    } catch (e) {
      alert(e.response?.data?.error || 'Ошибка удаления');
    }
  };

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
    e.target.closest('tr')?.classList.add(styles.dragging);
  };

  const handleDragEnd = (e) => {
    setDraggedIndex(null);
    e.target.closest('tr')?.classList.remove(styles.dragging);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, dropIndex) => {
    e.preventDefault();
    if (draggedIndex == null || draggedIndex === dropIndex) return;
    const newList = [...list];
    const [removed] = newList.splice(draggedIndex, 1);
    newList.splice(dropIndex, 0, removed);
    setList(newList);
    setDraggedIndex(null);
    setReordering(true);
    try {
      await api.patch('/admin/amenities/reorder', { ids: newList.map((x) => x.id) });
    } catch (err) {
      load();
      alert(err.response?.data?.error || 'Ошибка сохранения порядка');
    } finally {
      setReordering(false);
    }
  };

  if (loading) return <div className={styles.loading}>Загрузка…</div>;

  return (
    <>
      <h1 className={styles.title}>Удобства</h1>
      <p className={styles.desc}>Список удобств для катеров. Владельцы выбирают их при добавлении катера.</p>
      <div style={{ marginBottom: '1rem' }}>
        <button type="button" className={styles.btn} onClick={openAdd}>Добавить удобство</button>
      </div>
      {reordering && <p className={styles.loading} style={{ margin: '0 0 0.5rem' }}>Сохранение порядка…</p>}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ width: 32 }}></th>
              <th>ID</th>
              <th>Название</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map((item, index) => (
              <tr
                key={item.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
                className={styles.draggableRow}
              >
                <td
                  className={styles.dragHandle}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragEnd={handleDragEnd}
                  title="Перетащите для изменения порядка"
                >
                  <span aria-hidden>≡</span>
                </td>
                <td>{item.id}</td>
                <td>{item.name || '—'}</td>
                <td>
                  <button type="button" className={styles.btn} onClick={() => openEdit(item)} style={{ marginRight: '0.5rem' }}>Изменить</button>
                  <button type="button" className={`${styles.btn} ${modalStyles.btnSecondary}`} onClick={() => handleDelete(item.id)}>Удалить</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && <p className={styles.empty}>Нет удобств. Добавьте первое.</p>}
      </div>

      {editing && (
        <Modal title={editing.id ? 'Редактировать удобство' : 'Добавить удобство'} onClose={() => setEditing(null)}>
          <form onSubmit={handleSave}>
            {error && <p className={modalStyles.error}>{error}</p>}
            <div className={modalStyles.formRow}>
              <label className={modalStyles.label}>Название</label>
              <input
                className={modalStyles.input}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Туалет, Кондиционер, Wi-Fi…"
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
