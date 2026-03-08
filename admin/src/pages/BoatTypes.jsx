import React, { useState, useEffect } from 'react';
import api from '../api';
import styles from './Table.module.css';
import Modal from '../components/Modal';
import modalStyles from '../components/Modal.module.css';

const API_BASE = import.meta.env.VITE_API_URL || '';
function photoUrl(photo) {
  if (!photo) return null;
  return photo.startsWith('http') ? photo : `${API_BASE}${photo.startsWith('/') ? '' : '/'}${photo}`;
}

function PhotoFilePreview({ file, onRemove }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return (
    <div style={{ marginBottom: '0.5rem' }}>
      <img src={url || ''} alt="" className={modalStyles.photoThumb} style={{ width: 160, height: 120 }} />
      <button type="button" className={`${modalStyles.btn} ${modalStyles.btnSecondary}`} style={{ marginTop: 4 }} onClick={onRemove}>Убрать</button>
    </div>
  );
}

export default function BoatTypes() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '' });
  const [photoFile, setPhotoFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [reordering, setReordering] = useState(false);

  const load = () => {
    api.get('/admin/boat-types').then((r) => setList(r.data || [])).catch(() => setList([])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditing({ id: null });
    setForm({ name: '' });
    setPhotoFile(null);
    setError('');
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({ name: item.name || '' });
    setPhotoFile(null);
    setError('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    const name = form.name.trim();
    if (!name) {
      setError('Укажите название типа');
      return;
    }
    setSaving(true);
    try {
      if (editing.id) {
        const formData = new FormData();
        formData.append('name', name);
        if (photoFile) formData.append('photo', photoFile);
        await api.put(`/admin/boat-types/${editing.id}`, formData);
      } else {
        const formData = new FormData();
        formData.append('name', name);
        if (photoFile) formData.append('photo', photoFile);
        await api.post('/admin/boat-types', formData);
      }
      setEditing(null);
      load();
    } catch (err) {
      const data = err.response?.data;
      setError(data?.detail || data?.error || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Удалить этот тип судна?')) return;
    try {
      await api.delete(`/admin/boat-types/${id}`);
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
      await api.patch('/admin/boat-types/reorder', { ids: newList.map((x) => x.id) });
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
      <h1 className={styles.title}>Тип судна</h1>
      <p className={styles.desc}>Категории катеров на главном экране приложения. Можно изменить название и фото.</p>
      <div style={{ marginBottom: '1rem' }}>
        <button type="button" className={styles.btn} onClick={openAdd}>Добавить тип</button>
      </div>
      {reordering && <p className={styles.loading} style={{ margin: '0 0 0.5rem' }}>Сохранение порядка…</p>}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ width: 32 }}></th>
              <th>Фото</th>
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
                <td>
                  <img
                    src={photoUrl(item.image) || 'https://placehold.co/60x40?text=—'}
                    alt=""
                    className={styles.thumb}
                  />
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
        {list.length === 0 && <p className={styles.empty}>Нет типов. Добавьте первый.</p>}
      </div>

      {editing && (
        <Modal title={editing.id ? 'Редактировать тип судна' : 'Добавить тип судна'} onClose={() => setEditing(null)}>
          <form onSubmit={handleSave}>
            {error && <p className={modalStyles.error}>{error}</p>}
            <div className={modalStyles.formRow}>
              <label className={modalStyles.label}>Название категории</label>
              <input
                className={modalStyles.input}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Катер, Яхта, Гидроцикл…"
              />
            </div>
            <div className={modalStyles.formRow}>
              <label className={modalStyles.label}>Фото</label>
              {editing.id && editing.image && !photoFile && (
                <div style={{ marginBottom: '0.5rem' }}>
                  <img src={photoUrl(editing.image)} alt="" className={modalStyles.photoThumb} style={{ width: 160, height: 120 }} />
                  <p className={modalStyles.label} style={{ marginTop: 4 }}>Загрузите новый файл, чтобы заменить фото</p>
                </div>
              )}
              {photoFile && <PhotoFilePreview file={photoFile} onRemove={() => setPhotoFile(null)} />}
              <label className={modalStyles.photoAdd} style={{ width: 'auto', padding: '0.5rem 1rem' }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                  style={{ display: 'none' }}
                />
                {photoFile ? 'Заменить фото' : 'Выбрать фото'}
              </label>
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
