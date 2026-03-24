import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import tableStyles from './Table.module.css';
import styles from './Documents.module.css';

function formatUpdated(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return '';
  }
}

export default function Documents() {
  const [docs, setDocs] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingSlug, setSavingSlug] = useState(null);
  const [flash, setFlash] = useState({ type: '', text: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/legal-documents');
      const list = Array.isArray(data) ? data : [];
      setDocs(list);
      setDrafts(Object.fromEntries(list.map((d) => [d.slug, d.body ?? ''])));
    } catch (err) {
      setDocs([]);
      setDrafts({});
      setFlash({ type: 'err', text: err.response?.data?.error || 'Не удалось загрузить документы' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (slug) => {
    setSavingSlug(slug);
    setFlash({ type: '', text: '' });
    try {
      await api.put(`/admin/legal-documents/${slug}`, { body: drafts[slug] ?? '' });
      setFlash({ type: 'ok', text: 'Сохранено' });
      await load();
    } catch (err) {
      setFlash({ type: 'err', text: err.response?.data?.error || 'Ошибка сохранения' });
    } finally {
      setSavingSlug(null);
    }
  };

  if (loading && docs.length === 0) {
    return <div className={tableStyles.loading}>Загрузка…</div>;
  }

  return (
    <>
      <h1 className={tableStyles.title}>Документы</h1>
      <p className={tableStyles.desc}>
        Юридические тексты для приложения (в т.ч. политика, оферта, условия). Доступны публично по API{' '}
        <code style={{ fontSize: '0.85em' }}>/legal-documents</code>.
      </p>
      {flash.text && (
        <p className={flash.type === 'ok' ? styles.flashOk : styles.flashErr}>{flash.text}</p>
      )}

      {docs.map((doc) => (
        <section key={doc.slug} className={styles.section}>
          <h2 className={styles.sectionTitle}>{doc.title}</h2>
          {doc.updated_at && (
            <p className={styles.meta}>Последнее изменение: {formatUpdated(doc.updated_at)}</p>
          )}
          <textarea
            className={styles.textarea}
            value={drafts[doc.slug] ?? ''}
            onChange={(e) => setDrafts((prev) => ({ ...prev, [doc.slug]: e.target.value }))}
            placeholder="Введите текст документа (простой текст или HTML — по согласованию с приложением)."
            disabled={!!savingSlug}
          />
          <div className={styles.actions}>
            <button
              type="button"
              className={tableStyles.btn}
              disabled={!!savingSlug}
              onClick={() => handleSave(doc.slug)}
            >
              {savingSlug === doc.slug ? 'Сохранение…' : 'Сохранить'}
            </button>
            <span className={styles.hint}>Ключ API: {doc.slug}</span>
          </div>
        </section>
      ))}

      {!loading && docs.length === 0 && (
        <p className={tableStyles.desc}>Нет данных. Запустите на сервере миграцию БД: npm run db:migrate</p>
      )}
    </>
  );
}
