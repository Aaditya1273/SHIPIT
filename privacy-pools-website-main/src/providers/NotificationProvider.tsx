'use client';

import { createContext, useCallback, useState, type ReactNode } from 'react';
import { Notification, NotificationType } from '~/types';

type ContextType = {
  notifications: Notification[];
  addNotification: (type: NotificationType, message: string, txHash?: string) => void;
  removeNotification: (id: string) => void;
  getDefaultErrorMessage: (message?: string) => string;
};

interface StateProps {
  children: ReactNode;
}

export const NotificationContext = createContext({} as ContextType);

export const NotificationProvider = ({ children }: StateProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((notif) => notif.id !== id));
  }, []);

  const getDefaultErrorMessage = useCallback((message?: string) => {
    return message || 'An error occurred. Please try again.';
  }, []);

  const addNotification = useCallback(
    (type: NotificationType, message: string, txHash?: string) => {
      const id = Date.now().toString();
      setNotifications((prev) => [...prev, { id, type, message, txHash }]);
      setTimeout(() => removeNotification(id), 8000);
    },
    [removeNotification],
  );

  return (
    <NotificationContext.Provider
      value={{ notifications, addNotification, removeNotification, getDefaultErrorMessage }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
