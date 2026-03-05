import React, { useState } from 'react';
import api, { setAuth } from '../api';
import styles from './Login.module.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      if (data.user?.role !== 'admin') {
        setError('Доступ только для администратора');
        return;
      }
      setAuth(data.token, data.user);
      window.location.href = '/panel/admin';
    } catch (err) {
      const msg = err.response?.data?.error || (err.response ? 'Ошибка входа' : 'Нет связи с сервером. Проверьте адрес API (VITE_API_URL).');
      const status = err.response?.status;
      setError(status ? `${msg} (${status})` : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>BoatRent</h1>
        <p className={styles.subtitle}>Админ-панель</p>
        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={styles.input}
            required
          />
          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={styles.input}
            required
          />
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? 'Вход…' : 'Войти'}
          </button>
        </form>
        <p className={styles.hint}>Тестовый аккаунт: admin@test.ru / 123</p>
      </div>
    </div>
  );
}
