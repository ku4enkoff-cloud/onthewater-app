import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { getToken, getUser } from './api';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Boats from './pages/Boats';
import BoatTypes from './pages/BoatTypes';
import Destinations from './pages/Destinations';
import Amenities from './pages/Amenities';
import Bookings from './pages/Bookings';
import Reviews from './pages/Reviews';

function RequireAuth({ children }) {
  const token = getToken();
  const user = getUser();
  if (!token || !user || user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route
        path="/admin"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="users" element={<Users />} />
        <Route path="boats" element={<Boats />} />
        <Route path="boat-types" element={<BoatTypes />} />
        <Route path="destinations" element={<Destinations />} />
        <Route path="amenities" element={<Amenities />} />
        <Route path="bookings" element={<Bookings />} />
        <Route path="reviews" element={<Reviews />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
