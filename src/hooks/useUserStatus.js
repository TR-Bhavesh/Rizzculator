// src/hooks/useUserStatus.js - Track user online/offline status
import { useState, useEffect } from 'react';
import { doc, updateDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

export const useUserStatus = (userId) => {
  const [isOnline, setIsOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState(null);

  useEffect(() => {
    if (!userId) return;

    const userRef = doc(db, 'users', userId);

    // Listen to user status
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setIsOnline(data.isOnline || false);
        setLastSeen(data.lastSeen?.toDate() || null);
      }
    });

    return () => unsubscribe();
  }, [userId]);

  return { isOnline, lastSeen };
};

export const updateUserStatus = async (userId, isOnline) => {
  if (!userId) return;

  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      isOnline,
      lastSeen: serverTimestamp()
    });
  } catch (err) {
    console.error('Error updating user status:', err);
  }
};

// Hook to auto-update status on mount/unmount
export const useAutoStatus = (userId) => {
  useEffect(() => {
    if (!userId) return;

    // Set online on mount
    updateUserStatus(userId, true);

    // Set offline on unmount or tab close
    const handleOffline = () => updateUserStatus(userId, false);
    
    window.addEventListener('beforeunload', handleOffline);

    return () => {
      handleOffline();
      window.removeEventListener('beforeunload', handleOffline);
    };
  }, [userId]);
};