// src/hooks/useNotifications.js - Toast notification system
import { useState, useCallback } from 'react';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now() + Math.random();
    const notification = {
      id,
      message,
      type, // 'success', 'error', 'info', 'warning'
      duration
    };

    setNotifications(prev => [...prev, notification]);

    // Auto remove after duration
    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }

    return id;
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const success = useCallback((message) => addNotification(message, 'success'), [addNotification]);
  const error = useCallback((message) => addNotification(message, 'error', 5000), [addNotification]);
  const info = useCallback((message) => addNotification(message, 'info'), [addNotification]);
  const warning = useCallback((message) => addNotification(message, 'warning'), [addNotification]);

  return {
    notifications,
    addNotification,
    removeNotification,
    success,
    error,
    info,
    warning
  };
};