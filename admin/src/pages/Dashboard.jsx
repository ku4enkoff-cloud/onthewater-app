import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import styles from './Dashboard.module.css';

export default function Dashboard() {
  const [stats, setStats] = useState({ users: 0, boats: 0, bookings: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [u, b, bk] = await Promise.all([
          api.get('/admin/users'),
          api.get('/admin/boats'),
          api.get('/admin/bookings'),
        ]);
        setStats({
          users: u.data?.length ?? 0,
          boats: b.data?.length ?? 0,
          bookings: bk.data?.length ?? 0,
        });
      } catch {
        setStats({ users: 0, boats: 0, bookings: 0 });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return <div className={styles.loading}>Загрузка…</div>;
  }

  return (
    <>
      <h1 className={styles.title}>Дашборд</h1>
      <p className={styles.desc}>Управление приложением BoatRent: клиенты, владельцы, катера и бронирования.</p>
      <div className={styles.cards}>
        <Link to="/admin/users" className={styles.card}>
          <span className={styles.cardValue}>{stats.users}</span>
          <span className={styles.cardLabel}>Пользователи</span>
        </Link>
        <Link to="/admin/boats" className={styles.card}>
          <span className={styles.cardValue}>{stats.boats}</span>
          <span className={styles.cardLabel}>Катера</span>
        </Link>
        <Link to="/admin/bookings" className={styles.card}>
          <span className={styles.cardValue}>{stats.bookings}</span>
          <span className={styles.cardLabel}>Бронирования</span>
        </Link>
      </div>
    </>
  );
}
