import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { useStore } from '../store/useStore';
import { getMonthLabel } from '../services/notificationService';

export default function NotificationBell() {
  const { notifications, unreadNotifications, markNotificationRead, markAllNotificationsRead } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = unreadNotifications.length;

  // Auto-check for new notifications periodically
  useEffect(() => {
    const interval = setInterval(() => {
      // This will be triggered by store updates
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'reminder':
        return '🔔';
      case 'submission_required':
        return '📝';
      case 'overdue':
        return '⚠️';
      default:
        return '📋';
    }
  };

  const handleMarkAsRead = (id: string) => {
    markNotificationRead(id);
  };

  const handleMarkAllRead = () => {
    markAllNotificationsRead();
  };

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-slate-200 z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Notifikasi</h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-red-600 hover:text-red-800 font-medium flex items-center gap-1"
                >
                  <CheckCheck className="w-4 h-4" />
                  Tandai semua sudah dibaca
                </button>
              )}
            </div>

            {/* Notification List */}
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-slate-500">
                  Tidak ada notifikasi
                </div>
              ) : (
                notifications.slice(0, 10).map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleMarkAsRead(notification.id)}
                    className={`px-4 py-3 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors ${
                      !notification.isRead ? 'bg-red-50/30' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!notification.isRead ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-500">{getMonthLabel(notification.bulan)}</span>
                          {!notification.isRead && (
                            <span className="w-2 h-2 bg-red-500 rounded-full" />
                          )}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsRead(notification.id);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-2 border-t border-slate-200 text-center">
                <span className="text-xs text-slate-500">
                  Menampilkan {Math.min(10, notifications.length)} dari {notifications.length} notifikasi
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
