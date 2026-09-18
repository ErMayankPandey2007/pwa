import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { storage } from '../services/storage';
import { api } from '../services/api';

import { toast } from 'react-toastify';

/**
 * ProtectedRoute:
 * Checks if a citizen/user is registered or logged in with complete profile.
 * If user is not registered/logged in, prompts the registration modal and keeps them on home page.
 */
export default function ProtectedRoute({ children }) {
  const location = useLocation();
  const token = storage.getToken() || api.getToken();
  const user = storage.getUser();

  if (!storage.isRegistered()) {
    toast.warn('ऐप इस्तेमाल करने के लिए रजिस्ट्रेशन करना जरूरी है!', { toastId: 'reg-req' });
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('pwa_open_registration'));
    }, 100);
    return <Navigate to="/home" replace />;
  }

  return children;
}
