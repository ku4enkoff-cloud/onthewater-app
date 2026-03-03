import React, { useState, useEffect } from 'react';
import api from '../api';
import styles from './Table.module.css';
import Modal from '../components/Modal';
import modalStyles from '../components/Modal.module.css';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Активен' },
  { value: 'moderation', label: 'На модерации' },
  { value: 'blocked', label: 'Заблокирован' },
];

const API_BASE = import.meta.env.VITE_API_URL || '';
function photoUrl(photo) {
  if (!photo) return null;
  return photo.startsWith('http') ? photo : `${API_BASE}${photo.startsWith('/') ? '' : '/'}${photo}`;
}

const defaultForm = () => ({
  title: '', description: '', type_id: '1', type_name: 'Катер', manufacturer: '', model: '',
  year: '', length_m: '', capacity: '',
  location_country: '', location_region: '', location_city: '', location_address: '', location_yacht_club: '',
  lat: '', lng: '', price_per_hour: '', price_per_day: '', price_weekend: '',
  captain_included: false, has_captain_option: false, instant_booking: false,
  rules: '', cancellation_policy: '', status: 'active', amenities: [],
  schedule_min_duration: 60, schedule_work_days: '[]', schedule_weekday_hours: '[]', schedule_weekend_hours: '[]',
  price_tiers: '[]', video_uris: '[]',
});

// Состояние фото: оставляемые URL + новые файлы для загрузки
const defaultPhotos = () => ({ keep: [], newFiles: [] });

function PhotoFilePreview({ file, className, children }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return (
    <div className={modalStyles.photoWrap}>
      <img src={url || ''} alt="" className={className} />
      {children}
    </div>
  );
}

export default function Boats() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm());
  const [photos, setPhotos] = useState(defaultPhotos());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    api.get('/admin/boats').then((r) => setList(r.data || [])).catch(() => setList([])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openEdit = (b) => {
    setEditing(b);
    setForm({
      title: b.title || '',
      description: b.description || '',
      type_id: b.type_id || '1',
      type_name: b.type_name || 'Катер',
      manufacturer: b.manufacturer ?? '',
      model: b.model ?? '',
      year: b.year ?? '',
      length_m: b.length_m ?? '',
      capacity: b.capacity ?? '',
      location_country: b.location_country ?? '',
      location_region: b.location_region ?? '',
      location_city: b.location_city || '',
      location_address: b.location_address || '',
      location_yacht_club: b.location_yacht_club ?? '',
      lat: b.lat ?? '',
      lng: b.lng ?? '',
      price_per_hour: b.price_per_hour ?? '',
      price_per_day: b.price_per_day ?? '',
      price_weekend: b.price_weekend ?? '',
      captain_included: !!b.captain_included,
      has_captain_option: !!b.has_captain_option,
      instant_booking: !!b.instant_booking,
      rules: b.rules || '',
      cancellation_policy: b.cancellation_policy ?? '',
      status: b.status || 'active',
      amenities: Array.isArray(b.amenities) ? b.amenities : [],
      schedule_min_duration: b.schedule_min_duration ?? 60,
      schedule_work_days: Array.isArray(b.schedule_work_days) ? JSON.stringify(b.schedule_work_days, null, 0) : '[]',
      schedule_weekday_hours: Array.isArray(b.schedule_weekday_hours) ? JSON.stringify(b.schedule_weekday_hours, null, 0) : '[]',
      schedule_weekend_hours: Array.isArray(b.schedule_weekend_hours) ? JSON.stringify(b.schedule_weekend_hours, null, 0) : '[]',
      price_tiers: Array.isArray(b.price_tiers) ? JSON.stringify(b.price_tiers, null, 0) : '[]',
      video_uris: Array.isArray(b.video_uris) ? JSON.stringify(b.video_uris, null, 0) : '[]',
    });
    setPhotos({ keep: Array.isArray(b.photos) ? [...b.photos] : [], newFiles: [] });
    setError('');
  };

  const removePhoto = (url) => {
    setPhotos((p) => ({ ...p, keep: p.keep.filter((u) => u !== url) }));
  };

  const removeNewPhoto = (idx) => {
    setPhotos((p) => ({ ...p, newFiles: p.newFiles.filter((_, i) => i !== idx) }));
  };

  const onPhotoFilesChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setPhotos((p) => ({ ...p, newFiles: [...p.newFiles, ...files] }));
    e.target.value = '';
  };

  const setStatus = async (id, status) => {
    try {
      await api.patch(`/admin/boats/${id}`, { status });
      load();
    } catch (e) {
      alert(e.response?.data?.error || 'Ошибка');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!editing) return;
    setError('');
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('photo_urls', JSON.stringify(photos.keep));
      photos.newFiles.forEach((file) => formData.append('photos', file));
      formData.append('title', form.title);
      formData.append('description', form.description);
      formData.append('type_id', form.type_id);
      formData.append('type_name', form.type_name);
      formData.append('year', form.year);
      formData.append('length_m', form.length_m);
      formData.append('capacity', form.capacity);
      formData.append('location_city', form.location_city);
      formData.append('location_region', form.location_region);
      formData.append('location_address', form.location_address);
      formData.append('lat', form.lat === '' ? '' : form.lat);
      formData.append('lng', form.lng === '' ? '' : form.lng);
      formData.append('price_per_hour', form.price_per_hour);
      formData.append('price_per_day', form.price_per_day);
      formData.append('captain_included', form.captain_included ? '1' : '0');
      formData.append('has_captain_option', form.has_captain_option ? '1' : '0');
      formData.append('rules', form.rules);
      formData.append('status', form.status);
      formData.append('amenities', JSON.stringify(form.amenities));
      formData.append('manufacturer', form.manufacturer);
      formData.append('model', form.model);
      formData.append('location_country', form.location_country);
      formData.append('location_yacht_club', form.location_yacht_club);
      formData.append('price_weekend', form.price_weekend);
      formData.append('cancellation_policy', form.cancellation_policy);
      formData.append('instant_booking', form.instant_booking ? '1' : '0');
      formData.append('schedule_min_duration', String(form.schedule_min_duration));
      formData.append('schedule_work_days', typeof form.schedule_work_days === 'string' ? form.schedule_work_days : JSON.stringify(form.schedule_work_days || []));
      formData.append('schedule_weekday_hours', typeof form.schedule_weekday_hours === 'string' ? form.schedule_weekday_hours : JSON.stringify(form.schedule_weekday_hours || []));
      formData.append('schedule_weekend_hours', typeof form.schedule_weekend_hours === 'string' ? form.schedule_weekend_hours : JSON.stringify(form.schedule_weekend_hours || []));
      formData.append('price_tiers', typeof form.price_tiers === 'string' ? form.price_tiers : JSON.stringify(form.price_tiers || []));
      formData.append('video_uris', typeof form.video_uris === 'string' ? form.video_uris : JSON.stringify(form.video_uris || []));

      await api.put(`/admin/boats/${editing.id}`, formData);
      setEditing(null);
      load();
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || 'Ошибка сохранения';
      setError(typeof msg === 'string' ? msg : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className={styles.loading}>Загрузка…</div>;

  return (
    <>
      <h1 className={styles.title}>Катера</h1>
      <p className={styles.desc}>Объявления катеров. Редактирование и смена статуса.</p>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Фото</th>
              <th>ID</th>
              <th>Название</th>
              <th>Город</th>
              <th>Цена/час</th>
              <th>Владелец</th>
              <th>Статус</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map((b) => (
              <tr key={b.id}>
                <td>
                  <img
                    src={photoUrl(b.photos?.[0]) || 'https://placehold.co/60x40?text=—'}
                    alt=""
                    className={styles.thumb}
                  />
                </td>
                <td>{b.id}</td>
                <td>{b.title || '—'}</td>
                <td>{b.location_city || '—'}</td>
                <td>{b.price_per_hour ? `${b.price_per_hour} ₽` : '—'}</td>
                <td>{b.owner_name || `#${b.owner_id}`}</td>
                <td>
                  <select
                    value={b.status || 'active'}
                    onChange={(e) => setStatus(b.id, e.target.value)}
                    className={styles.select}
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <button type="button" className={styles.btn} onClick={() => openEdit(b)}>Редактировать</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && <p className={styles.empty}>Нет катеров</p>}
      </div>

      {editing && (
        <Modal title="Редактировать катер" onClose={() => setEditing(null)}>
          <form onSubmit={handleSave}>
            {error && <p className={modalStyles.error}>{error}</p>}
            <div className={modalStyles.formRow}>
              <label className={modalStyles.label}>Название</label>
              <input className={modalStyles.input} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className={modalStyles.formRow}>
              <label className={modalStyles.label}>Описание</label>
              <textarea className={modalStyles.input} rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className={modalStyles.formRow}>
              <label className={modalStyles.label}>Тип судна</label>
              <input className={modalStyles.input} value={form.type_name} onChange={(e) => setForm({ ...form, type_name: e.target.value })} placeholder="Катер, Яхта, …" />
            </div>
            <div className={modalStyles.formRow}>
              <label className={modalStyles.label}>Страна</label>
              <input className={modalStyles.input} value={form.location_country} onChange={(e) => setForm({ ...form, location_country: e.target.value })} placeholder="Россия" />
            </div>
            <div className={modalStyles.formRow}>
              <label className={modalStyles.label}>Область</label>
              <input className={modalStyles.input} value={form.location_region} onChange={(e) => setForm({ ...form, location_region: e.target.value })} placeholder="Московская" />
            </div>
            <div className={modalStyles.formRow}>
              <label className={modalStyles.label}>Город</label>
              <input className={modalStyles.input} value={form.location_city} onChange={(e) => setForm({ ...form, location_city: e.target.value })} />
            </div>
            <div className={modalStyles.formRow}>
              <label className={modalStyles.label}>Улица, дом</label>
              <input className={modalStyles.input} value={form.location_address} onChange={(e) => setForm({ ...form, location_address: e.target.value })} />
            </div>
            <div className={modalStyles.formRow}>
              <label className={modalStyles.label}>Яхт-клуб</label>
              <input className={modalStyles.input} value={form.location_yacht_club} onChange={(e) => setForm({ ...form, location_yacht_club: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <div className={modalStyles.formRow} style={{ flex: 1 }}>
                <label className={modalStyles.label}>Широта</label>
                <input type="number" step="any" className={modalStyles.input} value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} />
              </div>
              <div className={modalStyles.formRow} style={{ flex: 1 }}>
                <label className={modalStyles.label}>Долгота</label>
                <input type="number" step="any" className={modalStyles.input} value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div className={modalStyles.formRow} style={{ flex: '1 1 100px' }}>
                <label className={modalStyles.label}>Цена/час (₽)</label>
                <input className={modalStyles.input} value={form.price_per_hour} onChange={(e) => setForm({ ...form, price_per_hour: e.target.value })} />
              </div>
              <div className={modalStyles.formRow} style={{ flex: '1 1 100px' }}>
                <label className={modalStyles.label}>Цена/день (₽)</label>
                <input className={modalStyles.input} value={form.price_per_day} onChange={(e) => setForm({ ...form, price_per_day: e.target.value })} />
              </div>
              <div className={modalStyles.formRow} style={{ flex: '1 1 100px' }}>
                <label className={modalStyles.label}>Цена выходные (₽)</label>
                <input className={modalStyles.input} value={form.price_weekend} onChange={(e) => setForm({ ...form, price_weekend: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div className={modalStyles.formRow} style={{ flex: '1 1 120px' }}>
                <label className={modalStyles.label}>Производитель</label>
                <input className={modalStyles.input} value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} />
              </div>
              <div className={modalStyles.formRow} style={{ flex: '1 1 120px' }}>
                <label className={modalStyles.label}>Модель</label>
                <input className={modalStyles.input} value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
              </div>
              <div className={modalStyles.formRow} style={{ flex: '1 1 80px' }}>
                <label className={modalStyles.label}>Год</label>
                <input className={modalStyles.input} value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
              </div>
              <div className={modalStyles.formRow} style={{ flex: '1 1 80px' }}>
                <label className={modalStyles.label}>Длина (м)</label>
                <input className={modalStyles.input} value={form.length_m} onChange={(e) => setForm({ ...form, length_m: e.target.value })} />
              </div>
              <div className={modalStyles.formRow} style={{ flex: '1 1 80px' }}>
                <label className={modalStyles.label}>Вместимость</label>
                <input className={modalStyles.input} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
              </div>
            </div>
            <div className={modalStyles.formRow}>
              <label className={modalStyles.label}>Статус</label>
              <select className={modalStyles.select} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className={modalStyles.formRow}>
              <label className={modalStyles.label}>Удобства (каждое с новой строки)</label>
              <textarea className={modalStyles.input} rows={3} value={Array.isArray(form.amenities) ? form.amenities.join('\n') : ''} onChange={(e) => setForm({ ...form, amenities: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })} placeholder="Туалет, Кондиционер (каждое с новой строки)" />
            </div>
            <div className={modalStyles.formRow}>
              <label className={modalStyles.label}>Правила</label>
              <textarea className={modalStyles.input} rows={2} value={form.rules} onChange={(e) => setForm({ ...form, rules: e.target.value })} />
            </div>
            <div className={modalStyles.formRow}>
              <label className={modalStyles.label}>Политика отмены</label>
              <textarea className={modalStyles.input} rows={2} value={form.cancellation_policy} onChange={(e) => setForm({ ...form, cancellation_policy: e.target.value })} />
            </div>
            <div className={modalStyles.formRow}>
              <label className={modalStyles.label}>Мин. длительность аренды (мин)</label>
              <input type="number" min={15} step={15} className={modalStyles.input} value={form.schedule_min_duration} onChange={(e) => setForm({ ...form, schedule_min_duration: parseInt(e.target.value, 10) || 60 })} />
            </div>
            <div className={modalStyles.formRow}>
              <label className={modalStyles.label}>Тарифы по длительности (JSON)</label>
              <textarea className={modalStyles.input} rows={2} value={form.price_tiers} onChange={(e) => setForm({ ...form, price_tiers: e.target.value })} placeholder='[{"hours":2,"price":5000}]' />
            </div>
            <div className={modalStyles.formRow}>
              <label className={modalStyles.label}>Расписание: рабочие дни (JSON)</label>
              <textarea className={modalStyles.input} rows={1} value={form.schedule_work_days} onChange={(e) => setForm({ ...form, schedule_work_days: e.target.value })} placeholder="[]" />
            </div>
            <div className={modalStyles.formRow}>
              <label className={modalStyles.label}>Часы работы в будни (JSON)</label>
              <input className={modalStyles.input} value={form.schedule_weekday_hours} onChange={(e) => setForm({ ...form, schedule_weekday_hours: e.target.value })} placeholder="[]" />
            </div>
            <div className={modalStyles.formRow}>
              <label className={modalStyles.label}>Часы работы в выходные (JSON)</label>
              <input className={modalStyles.input} value={form.schedule_weekend_hours} onChange={(e) => setForm({ ...form, schedule_weekend_hours: e.target.value })} placeholder="[]" />
            </div>
            <div className={modalStyles.formRow}>
              <label className={modalStyles.label}>Ссылки на видео (JSON)</label>
              <textarea className={modalStyles.input} rows={1} value={form.video_uris} onChange={(e) => setForm({ ...form, video_uris: e.target.value })} placeholder='[]' />
            </div>
            <div className={modalStyles.formRow}>
              <label className={modalStyles.label}>Фотографии</label>
              <div className={modalStyles.photosRow}>
                {photos.keep.map((url) => (
                  <div key={url} className={modalStyles.photoWrap}>
                    <img src={photoUrl(url)} alt="" className={modalStyles.photoThumb} />
                    <button type="button" className={modalStyles.photoRemove} onClick={() => removePhoto(url)} title="Удалить">×</button>
                  </div>
                ))}
                {photos.newFiles.map((file, idx) => (
                  <PhotoFilePreview key={`new-${idx}`} file={file} className={modalStyles.photoThumb}>
                    <button type="button" className={modalStyles.photoRemove} onClick={() => removeNewPhoto(idx)} title="Удалить">×</button>
                  </PhotoFilePreview>
                ))}
                <label className={modalStyles.photoAdd}>
                  <input type="file" accept="image/*" multiple onChange={onPhotoFilesChange} style={{ display: 'none' }} />
                  + Добавить фото
                </label>
              </div>
            </div>
            <div className={modalStyles.formRow}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.captain_included} onChange={(e) => setForm({ ...form, captain_included: e.target.checked })} />
                Капитан включён
              </label>
            </div>
            <div className={modalStyles.formRow}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.has_captain_option} onChange={(e) => setForm({ ...form, has_captain_option: e.target.checked })} />
                Опция с капитаном
              </label>
            </div>
            <div className={modalStyles.formRow}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.instant_booking} onChange={(e) => setForm({ ...form, instant_booking: e.target.checked })} />
                Мгновенное бронирование
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
