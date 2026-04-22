/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Login from './pages/Login';
import Home from './pages/Home';
// import Network from './pages/Network';
import Events from './pages/Events';
import Boostizy from './pages/Business';
import Services from './pages/Services';
import Profile from './pages/Profile';
import Messages from './pages/Messages';
import Notifications from './pages/Notifications';
import Communities from './pages/Communities';
import ReseauPage from './pages/Reseau';
import Favorites from './pages/Favorites';
import EventWall from './pages/EventWall';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
}

export default function App() {
  useEffect(() => {
    // Health check to verify server connectivity
    const checkHealth = async () => {
      try {
        const response = await fetch('/api/health');
        if (!response.ok) {
          console.error('Server health check failed:', response.statusText);
        } else {
          console.log('Server health check successful');
        }
      } catch (err) {
        console.error('Server health check failed (network error):', err);
      }
    };
    checkHealth();
  }, []);

  return (
    <BrowserRouter>
      <Toaster position="top-center" reverseOrder={false} />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />
        {/* <Route path="/network" element={<PrivateRoute><Network /></PrivateRoute>} /> */}
        <Route path="/events" element={<PrivateRoute><Events /></PrivateRoute>} />
        <Route path="/events/:id" element={<PrivateRoute><EventWall /></PrivateRoute>} />
        <Route path="/business" element={<PrivateRoute><Boostizy /></PrivateRoute>} />
        <Route path="/services" element={<PrivateRoute><Services /></PrivateRoute>} />
        <Route path="/groups" element={<PrivateRoute><Communities /></PrivateRoute>} />
        <Route path="/reseau" element={<PrivateRoute><ReseauPage /></PrivateRoute>} />
        <Route path="/profile/:userId" element={<PrivateRoute><Profile /></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
        <Route path="/favorites" element={<PrivateRoute><Favorites /></PrivateRoute>} />
        <Route path="/messages" element={<PrivateRoute><Messages /></PrivateRoute>} />
        <Route path="/messages/:id" element={<PrivateRoute><Messages /></PrivateRoute>} />
        <Route path="/notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  );
}
