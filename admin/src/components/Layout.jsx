import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { logout } from '../api';
import styles from './Layout.module.css';

export default function Layout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className={styles.wrapper}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>BoatRent</div>
        <p className={styles.subtitle}>Админ-панель</p>
        <nav className={styles.nav}>
          <NavLink to="/admin" end className={({ isActive }) => (isActive ? styles.linkActive : styles.link)}>
            Дашборд
          </NavLink>
          <NavLink to="/admin/users" className={({ isActive }) => (isActive ? styles.linkActive : styles.link)}>
            Пользователи
          </NavLink>
          <NavLink to="/admin/boats" className={({ isActive }) => (isActive ? styles.linkActive : styles.link)}>
            Катера
          </NavLink>
          <NavLink to="/admin/boat-types" className={({ isActive }) => (isActive ? styles.linkActive : styles.link)}>
            Тип судна
          </NavLink>
          <NavLink to="/admin/destinations" className={({ isActive }) => (isActive ? styles.linkActive : styles.link)}>
            Популярные направления
          </NavLink>
          <NavLink to="/admin/amenities" className={({ isActive }) => (isActive ? styles.linkActive : styles.link)}>
            Удобства
          </NavLink>
          <NavLink to="/admin/bookings" className={({ isActive }) => (isActive ? styles.linkActive : styles.link)}>
            Бронирования
          </NavLink>
          <NavLink to="/admin/reviews" className={({ isActive }) => (isActive ? styles.linkActive : styles.link)}>
            Отзывы (модерация)
          </NavLink>
        </nav>
        <button type="button" className={styles.logout} onClick={handleLogout}>
          Выйти
        </button>
      </aside>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
