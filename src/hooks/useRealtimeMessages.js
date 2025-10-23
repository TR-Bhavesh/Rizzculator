// src/hooks/useRealtimeMessages.js - Real-time messaging hook
import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';

export const useRealtimeMessages = (currentUserId, selectedUserId) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!currentUserId || !selectedUserId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Query for messages between current user and selected user
    const messagesRef = collection(db, 'messages');
    const q = query(
      messagesRef,
      where('participants', 'array-contains', currentUserId),
      orderBy('timestamp', 'asc')
    );

    // Real-time listener
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const msgs = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          // Only include messages between these two users
          if (
            (data.from === currentUserId && data.to === selectedUserId) ||
            (data.from === selectedUserId && data.to === currentUserId)
          ) {
            msgs.push({
              id: doc.id,
              ...data,
              timestamp: data.timestamp?.toDate() || new Date()
            });
          }
        });
        setMessages(msgs);
        setLoading(false);
      },
      (err) => {
        console.error('Error loading messages:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUserId, selectedUserId]);

  const sendMessage = async (text) => {
    if (!text.trim() || !currentUserId || !selectedUserId) return;

    try {
      await addDoc(collection(db, 'messages'), {
        from: currentUserId,
        to: selectedUserId,
        text: text.trim(),
        participants: [currentUserId, selectedUserId],
        read: false,
        timestamp: serverTimestamp()
      });
    } catch (err) {
      console.error('Error sending message:', err);
      throw err;
    }
  };

  const markAsRead = async (messageId) => {
    try {
      await updateDoc(doc(db, 'messages', messageId), {
        read: true
      });
    } catch (err) {
      console.error('Error marking message as read:', err);
    }
  };

  return { messages, loading, error, sendMessage, markAsRead };
};

// Hook for unread message count
export const useUnreadCount = (currentUserId) => {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!currentUserId) return;

    const messagesRef = collection(db, 'messages');
    const q = query(
      messagesRef,
      where('to', '==', currentUserId),
      where('read', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadCount(snapshot.size);
    });

    return () => unsubscribe();
  }, [currentUserId]);

  return unreadCount;
};

// Hook for conversation list
export const useConversations = (currentUserId) => {
  const [conversations, setConversations] = useState([]);

  useEffect(() => {
    if (!currentUserId) return;

    const messagesRef = collection(db, 'messages');
    const q = query(
      messagesRef,
      where('participants', 'array-contains', currentUserId),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const convMap = new Map();

      snapshot.forEach((doc) => {
        const data = doc.data();
        const otherUserId = data.from === currentUserId ? data.to : data.from;

        if (!convMap.has(otherUserId)) {
          convMap.set(otherUserId, {
            userId: otherUserId,
            lastMessage: data.text,
            timestamp: data.timestamp?.toDate() || new Date(),
            unread: data.to === currentUserId && !data.read
          });
        }
      });

      setConversations(Array.from(convMap.values()));
    });

    return () => unsubscribe();
  }, [currentUserId]);

  return conversations;
};