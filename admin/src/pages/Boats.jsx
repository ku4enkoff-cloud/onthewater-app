import React, { useState, useEffect, useMemo } from 'react';
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

function parseCoord(value) {
  const normalized = String(value ?? '').trim().replace(',', '.');
  if (!normalized) return null;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

const defaultForm = () => ({
  title: '', description: '', type_id: '1', type_name: 'Катер', manufacturer: '', model: '',
  year: '', length_m: '', capacity: '',
  location_country: '', location_region: '', location_city: '', location_address: '', location_yacht_club: '',
  lat: '', lng: '', price_per_hour: '', price_per_day: '', price_weekend: '',
  captain_included: false, has_captain_option: false, instant_booking: false,
  rules: '', payment_policy: '', cancellation_policy: '', status: 'active', amenities: [],
  schedule_min_duration: 60, schedule_weekday_hours: '[]', schedule_weekend_hours: '[]',
  price_tiers: '[]',
});

// Состояние фото: оставляемые URL + новые файлы для загрузки
const defaultPhotos = () => ({ keep: [], newFiles: [] });
const defaultVideos = () => ({ keep: [], newFiles: [] });

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const WEEKDAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

/** Как в приложении владельца (EditBoatScreen / BoatScheduleScreen) */
const DURATION_OPTIONS = [
  { value: 30, label: '30 мин' },
  { value: 60, label: '1 час' },
  { value: 120, label: '2 часа' },
  { value: 180, label: '3 часа' },
  { value: 240, label: '4 часа' },
  { value: 300, label: '5 часов' },
];

function normalizeMinDuration(mins) {
  const v = Number(mins) || 60;
  if (DURATION_OPTIONS.some((o) => o.value === v)) return v;
  let best = 60;
  let bestDist = Infinity;
  for (const o of DURATION_OPTIONS) {
    const d = Math.abs(o.value - v);
    if (d < bestDist) {
      bestDist = d;
      best = o.value;
    }
  }
  return best;
}

function toDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getCalendarGrid(monthDate) {
  const y = monthDate.getFullYear();
  const m = monthDate.getMonth();
  const first = new Date(y, m, 1);
  let start = new Date(first);
  const dow = first.getDay();
  const toMonday = dow === 0 ? 6 : dow - 1;
  start.setDate(start.getDate() - toMonday);
  const grid = [];
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 7; col++) {
      const cell = new Date(start);
      cell.setDate(start.getDate() + row * 7 + col);
      grid.push({
        date: cell,
        isCurrentMonth: cell.getMonth() === m,
      });
    }
  }
  return grid;
}

/** Нормализация элемента массива дат из API (строка, ISO, timestamp) */
function normalizeDateKeyEntry(entry) {
  if (entry == null) return null;
  if (typeof entry === 'string') {
    const s = entry.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    try {
      const d = new Date(s);
      if (!Number.isNaN(d.getTime())) return toDateKey(d);
    } catch {
      return null;
    }
    return null;
  }
  if (entry instanceof Date && !Number.isNaN(entry.getTime())) return toDateKey(entry);
  if (typeof entry === 'number' && Number.isFinite(entry)) {
    const d = new Date(entry);
    if (!Number.isNaN(d.getTime())) return toDateKey(d);
  }
  return null;
}

function parseScheduleWorkDaysToKeys(raw) {
  let wd = raw;
  if (wd == null || wd === '') return [];

  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(wd)) {
    try {
      wd = JSON.parse(wd.toString('utf8'));
    } catch {
      return [];
    }
  }

  let unwrap = 0;
  while (typeof wd === 'string' && unwrap < 4) {
    unwrap += 1;
    try {
      wd = JSON.parse(wd);
    } catch {
      return [];
    }
  }

  if (Array.isArray(wd)) {
    const keys = wd.map(normalizeDateKeyEntry).filter(Boolean);
    return [...new Set(keys)].sort();
  }
  if (typeof wd !== 'object' || wd === null) return [];

  let datesRaw = wd.dates;
  if (typeof datesRaw === 'string') {
    try {
      datesRaw = JSON.parse(datesRaw);
    } catch {
      datesRaw = null;
    }
  }
  if (Array.isArray(datesRaw)) {
    const keys = datesRaw.map(normalizeDateKeyEntry).filter(Boolean);
    return [...new Set(keys)].sort();
  }

  const workDaysMap = { mon: true, tue: true, wed: true, thu: true, fri: true, sat: true, sun: false, ...wd };
  const generated = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < 180; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const key = WEEKDAY_KEYS[d.getDay()];
    if (workDaysMap[key] === true) generated.push(toDateKey(d));
  }
  return [...new Set(generated)].sort();
}

function PhotoFilePreview({ file, className, children, onOpen }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return (
    <div className={modalStyles.photoWrap}>
      <img
        src={url || ''}
        alt=""
        className={className}
        onClick={() => onOpen?.(url)}
        style={{ cursor: 'zoom-in' }}
      />
      {children}
    </div>
  );
}

function VideoFilePreview({ file, className, children }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return (
    <div className={modalStyles.photoWrap}>
      <video src={url || ''} className={className} controls muted playsInline />
      {children}
    </div>
  );
}

export default function Boats() {
  const [list, setList] = useState([]);
  const [amenitiesList, setAmenitiesList] = useState([]);
  const [boatTypes, setBoatTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm());
  const [photos, setPhotos] = useState(defaultPhotos());
  const [videos, setVideos] = useState(defaultVideos());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState('');
  const [workDateKeys, setWorkDateKeys] = useState([]);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const workDateSet = useMemo(() => new Set(workDateKeys), [workDateKeys]);
  const typeOptions = (() => {
    const base = Array.isArray(boatTypes) ? boatTypes : [];
    const currentId = String(form.type_id || '');
    if (!currentId) return base;
    if (base.some((t) => String(t.id) === currentId)) return base;
    return [{ id: currentId, name: form.type_name || `Тип #${currentId}` }, ...base];
  })();
  const latNum = parseCoord(form.lat);
  const lngNum = parseCoord(form.lng);
  const hasCoords = latNum != null && lngNum != null;
  const yandexMapsUrl = hasCoords ? `https://yandex.ru/maps/?ll=${lngNum},${latNum}&z=14&pt=${lngNum},${latNum},pm2rdm` : '';
  const yandexStaticMapUrl = hasCoords
    ? `https://static-maps.yandex.ru/1.x/?ll=${lngNum},${latNum}&size=650,220&z=14&l=map&pt=${lngNum},${latNum},pm2rdm`
    : '';

  const load = () => {
    api.get('/admin/boats').then((r) => setList(r.data || [])).catch(() => setList([])).finally(() => setLoading(false));
  };
  const loadAmenities = () => {
    api.get('/admin/amenities').then((r) => setAmenitiesList(r.data || [])).catch(() => setAmenitiesList([]));
  };
  const loadBoatTypes = () => {
    api.get('/admin/boat-types').then((r) => setBoatTypes(r.data || [])).catch(() => setBoatTypes([]));
  };

  useEffect(() => {
    load();
    loadAmenities();
    loadBoatTypes();
  }, []);

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
      payment_policy: b.payment_policy ?? '',
      cancellation_policy: b.cancellation_policy ?? '',
      status: b.status || 'active',
      amenities: Array.isArray(b.amenities) ? b.amenities : [],
      schedule_min_duration: normalizeMinDuration(b.schedule_min_duration ?? 60),
      schedule_weekday_hours: Array.isArray(b.schedule_weekday_hours) ? JSON.stringify(b.schedule_weekday_hours, null, 0) : '[]',
      schedule_weekend_hours: Array.isArray(b.schedule_weekend_hours) ? JSON.stringify(b.schedule_weekend_hours, null, 0) : '[]',
      price_tiers: Array.isArray(b.price_tiers) ? JSON.stringify(b.price_tiers, null, 0) : '[]',
    });
    setPhotos({ keep: Array.isArray(b.photos) ? [...b.photos] : [], newFiles: [] });
    setVideos({ keep: Array.isArray(b.video_uris) ? [...b.video_uris] : [], newFiles: [] });
    const keys = parseScheduleWorkDaysToKeys(b.schedule_work_days);
    setWorkDateKeys(keys);
    if (keys.length > 0) {
      const parts = keys[0].split('-').map(Number);
      const [y, mo] = parts;
      setCalendarMonth(new Date(y, mo - 1, 1));
    } else {
      const d = new Date();
      setCalendarMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    }
    setError('');
  };

  const toggleWorkDate = (date) => {
    const key = toDateKey(date);
    setWorkDateKeys((prev) => {
      const s = new Set(prev);
      if (s.has(key)) s.delete(key);
      else s.add(key);
      return [...s].sort();
    });
  };

  const selectAllWorkDaysInMonth = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const grid = getCalendarGrid(calendarMonth);
    const keys = grid
      .filter(({ date, isCurrentMonth }) => isCurrentMonth && date >= today)
      .map(({ date }) => toDateKey(date));
    setWorkDateKeys((prev) => {
      const next = new Set(prev);
      keys.forEach((k) => next.add(k));
      return [...next].sort();
    });
  };

  const clearAllWorkDays = () => setWorkDateKeys([]);

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

  const removeVideo = (url) => {
    setVideos((p) => ({ ...p, keep: p.keep.filter((u) => u !== url) }));
  };

  const removeNewVideo = (idx) => {
    setVideos((p) => ({ ...p, newFiles: p.newFiles.filter((_, i) => i !== idx) }));
  };

  const onVideoFilesChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setVideos((p) => ({ ...p, newFiles: [...p.newFiles, ...files] }));
    e.target.value = '';
  };

  const toggleAmenity = (name) => {
    setForm((prev) => {
      const current = Array.isArray(prev.amenities) ? prev.amenities : [];
      const exists = current.includes(name);
      return {
        ...prev,
        amenities: exists ? current.filter((x) => x !== name) : [...current, name],
      };
    });
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
      formData.append('video_urls', JSON.stringify(videos.keep));
      videos.newFiles.forEach((file) => formData.append('videos', file));
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
      formData.append('payment_policy', form.payment_policy);
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
      const sortedWorkKeys = [...workDateKeys].sort();
      const scheduleWorkDays = sortedWorkKeys.length > 0
        ? { dates: sortedWorkKeys }
        : { mon: true, tue: true, wed: true, thu: true, fri: true, sat: true, sun: false };
      formData.append('schedule_work_days', JSON.stringify(scheduleWorkDays));
      formData.append('schedule_weekday_hours', typeof form.schedule_weekday_hours === 'string' ? form.schedule_weekday_hours : JSON.stringify(form.schedule_weekday_hours || []));
      formData.append('schedule_weekend_hours', typeof form.schedule_weekend_hours === 'string' ? form.schedule_weekend_hours : JSON.stringify(form.schedule_weekend_hours || []));
      formData.append('price_tiers', typeof form.price_tiers === 'string' ? form.price_tiers : JSON.stringify(form.price_tiers || []));

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
        <Modal title="Редактировать катер" wide onClose={() => setEditing(null)}>
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
              <select
                className={modalStyles.select}
                value={String(form.type_id || '')}
                onChange={(e) => {
                  const selectedId = String(e.target.value || '');
                  const selectedType = boatTypes.find((t) => String(t.id) === selectedId);
                  setForm({
                    ...form,
                    type_id: selectedId,
                    type_name: selectedType?.name || form.type_name || 'Катер',
                  });
                }}
              >
                {typeOptions.length === 0 ? (
                  <option value={String(form.type_id || '')}>{form.type_name || 'Катер'}</option>
                ) : (
                  typeOptions.map((t) => (
                    <option key={t.id} value={String(t.id)}>
                      {t.name || `Тип #${t.id}`}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div className={modalStyles.formRow}>
              <label className={modalStyles.label}>Характеристики судна</label>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div className={modalStyles.formRow} style={{ flex: '1 1 140px', marginBottom: 0 }}>
                  <label className={modalStyles.label}>Производитель</label>
                  <input className={modalStyles.input} value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} />
                </div>
                <div className={modalStyles.formRow} style={{ flex: '1 1 140px', marginBottom: 0 }}>
                  <label className={modalStyles.label}>Модель</label>
                  <input className={modalStyles.input} value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
                </div>
                <div className={modalStyles.formRow} style={{ flex: '1 1 90px', marginBottom: 0 }}>
                  <label className={modalStyles.label}>Год</label>
                  <input className={modalStyles.input} value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
                </div>
                <div className={modalStyles.formRow} style={{ flex: '1 1 90px', marginBottom: 0 }}>
                  <label className={modalStyles.label}>Длина (м)</label>
                  <input className={modalStyles.input} value={form.length_m} onChange={(e) => setForm({ ...form, length_m: e.target.value })} />
                </div>
                <div className={modalStyles.formRow} style={{ flex: '1 1 90px', marginBottom: 0 }}>
                  <label className={modalStyles.label}>Вместимость</label>
                  <input className={modalStyles.input} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
                </div>
              </div>
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
            <div className={modalStyles.formRow}>
              <label className={modalStyles.label}>Местоположение на Яндекс Картах</label>
              {hasCoords ? (
                <a href={yandexMapsUrl} target="_blank" rel="noreferrer" style={{ display: 'block' }}>
                  <img
                    src={yandexStaticMapUrl}
                    alt="Местоположение судна на карте"
                    style={{ width: '100%', borderRadius: 10, border: '1px solid #e2e8f0', display: 'block' }}
                  />
                </a>
              ) : (
                <p style={{ margin: 0, opacity: 0.75 }}>Укажите корректные широту и долготу, чтобы увидеть карту.</p>
              )}
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
            <div className={modalStyles.formRow}>
              <label className={modalStyles.label}>Статус</label>
              <select className={modalStyles.select} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className={modalStyles.formRow}>
              <label className={modalStyles.label}>Удобства</label>
              {amenitiesList.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.5rem 0.75rem' }}>
                  {amenitiesList.map((item) => {
                    const checked = Array.isArray(form.amenities) && form.amenities.includes(item.name);
                    return (
                      <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleAmenity(item.name)}
                        />
                        <span>{item.name}</span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <p style={{ margin: 0, opacity: 0.75 }}>Нет доступных удобств. Добавьте их в разделе «Удобства».</p>
              )}
            </div>
            <div className={modalStyles.formRow}>
              <label className={modalStyles.label}>Правила</label>
              <textarea className={modalStyles.input} rows={2} value={form.rules} onChange={(e) => setForm({ ...form, rules: e.target.value })} />
            </div>
            <div className={modalStyles.formRow}>
              <label className={modalStyles.label}>Порядок оплаты</label>
              <textarea className={modalStyles.input} rows={2} value={form.payment_policy} onChange={(e) => setForm({ ...form, payment_policy: e.target.value })} />
            </div>
            <div className={modalStyles.formRow}>
              <label className={modalStyles.label}>Политика отмены</label>
              <textarea className={modalStyles.input} rows={2} value={form.cancellation_policy} onChange={(e) => setForm({ ...form, cancellation_policy: e.target.value })} />
            </div>
            <div className={modalStyles.formRow}>
              <label className={modalStyles.label}>Мин. длительность аренды</label>
              <select
                className={modalStyles.select}
                value={form.schedule_min_duration}
                onChange={(e) => setForm({ ...form, schedule_min_duration: Number(e.target.value) })}
              >
                {DURATION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className={modalStyles.formRow}>
              <label className={modalStyles.label}>Расписание: рабочие дни</label>
              <p className={modalStyles.workCalHint} style={{ marginTop: 0 }}>Выберите даты, когда катер доступен для аренды (как в приложении владельца).</p>
              <div className={modalStyles.workCalWrap}>
                <div className={modalStyles.workCalMonthRow}>
                  <button type="button" className={modalStyles.workCalArrow} onClick={() => setCalendarMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))} aria-label="Предыдущий месяц">‹</button>
                  <p className={modalStyles.workCalMonthTitle}>{calendarMonth.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}</p>
                  <button type="button" className={modalStyles.workCalArrow} onClick={() => setCalendarMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))} aria-label="Следующий месяц">›</button>
                </div>
                <div className={modalStyles.workCalWeekdays}>
                  {WEEKDAY_LABELS.map((label, i) => (
                    <div key={label} className={`${modalStyles.workCalWeekday} ${i === 5 || i === 6 ? modalStyles.workCalWeekdayWeekend : ''}`}>{label}</div>
                  ))}
                </div>
                <div className={modalStyles.workCalGrid}>
                  {getCalendarGrid(calendarMonth).map(({ date, isCurrentMonth }, idx) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const isPast = date < today;
                    const key = toDateKey(date);
                    const selected = workDateSet.has(key);
                    const selectable = isCurrentMonth && !isPast;
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                    let dayClass = modalStyles.workCalDay;
                    if (!isCurrentMonth) dayClass += ` ${modalStyles.workCalDayOther}`;
                    else if (!selectable) dayClass += ` ${modalStyles.workCalDayPast}`;
                    else dayClass += ` ${modalStyles.workCalDaySelectable}`;
                    if (selected) dayClass += isWeekend ? ` ${modalStyles.workCalDaySelectedWeekend}` : ` ${modalStyles.workCalDaySelected}`;
                    return (
                      <button
                        key={idx}
                        type="button"
                        className={dayClass}
                        disabled={!selectable}
                        onClick={() => selectable && toggleWorkDate(date)}
                      >
                        {date.getDate()}
                      </button>
                    );
                  })}
                </div>
                <div className={modalStyles.workCalActions}>
                  <button type="button" className={modalStyles.workCalActionBtn} onClick={selectAllWorkDaysInMonth}>Выбрать все</button>
                  <button type="button" className={modalStyles.workCalActionBtn} onClick={clearAllWorkDays}>Очистить все</button>
                </div>
              </div>
              {workDateKeys.length > 0 && (
                <p className={modalStyles.workCalHint}>Выбрано дней: {workDateKeys.length}</p>
              )}
            </div>
            <div className={modalStyles.formRow}>
              <label className={modalStyles.label}>Тарифы по длительности (JSON)</label>
              <textarea className={modalStyles.input} rows={2} value={form.price_tiers} onChange={(e) => setForm({ ...form, price_tiers: e.target.value })} placeholder='[{"hours":2,"price":5000}]' />
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
              <label className={modalStyles.label}>Фотографии</label>
              <div className={modalStyles.photosRow}>
                {photos.keep.map((url) => (
                  <div key={url} className={modalStyles.photoWrap}>
                    <img
                      src={photoUrl(url)}
                      alt=""
                      className={modalStyles.photoThumb}
                      onClick={() => setPhotoPreviewUrl(photoUrl(url) || '')}
                      style={{ cursor: 'zoom-in' }}
                    />
                    <button type="button" className={modalStyles.photoRemove} onClick={(e) => { e.stopPropagation(); removePhoto(url); }} title="Удалить">×</button>
                  </div>
                ))}
                {photos.newFiles.map((file, idx) => (
                  <PhotoFilePreview key={`new-${idx}`} file={file} className={modalStyles.photoThumb} onOpen={setPhotoPreviewUrl}>
                    <button type="button" className={modalStyles.photoRemove} onClick={(e) => { e.stopPropagation(); removeNewPhoto(idx); }} title="Удалить">×</button>
                  </PhotoFilePreview>
                ))}
                <label className={modalStyles.photoAdd}>
                  <input type="file" accept="image/*" multiple onChange={onPhotoFilesChange} style={{ display: 'none' }} />
                  + Добавить фото
                </label>
              </div>
            </div>
            <div className={modalStyles.formRow}>
              <label className={modalStyles.label}>Видео</label>
              <div className={modalStyles.photosRow}>
                {videos.keep.map((url) => (
                  <div key={url} className={modalStyles.photoWrap}>
                    <video src={photoUrl(url)} className={modalStyles.photoThumb} controls muted playsInline />
                    <button type="button" className={modalStyles.photoRemove} onClick={() => removeVideo(url)} title="Удалить">×</button>
                  </div>
                ))}
                {videos.newFiles.map((file, idx) => (
                  <VideoFilePreview key={`new-video-${idx}`} file={file} className={modalStyles.photoThumb}>
                    <button type="button" className={modalStyles.photoRemove} onClick={() => removeNewVideo(idx)} title="Удалить">×</button>
                  </VideoFilePreview>
                ))}
                <label className={modalStyles.photoAdd}>
                  <input type="file" accept="video/*" multiple onChange={onVideoFilesChange} style={{ display: 'none' }} />
                  + Добавить видео
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
      {photoPreviewUrl && (
        <Modal title="Просмотр фото" onClose={() => setPhotoPreviewUrl('')}>
          <img
            src={photoPreviewUrl}
            alt="Фото катера"
            style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 8 }}
          />
        </Modal>
      )}
    </>
  );
}
