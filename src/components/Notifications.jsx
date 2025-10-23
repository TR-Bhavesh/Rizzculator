// src/components/Notifications.jsx - Beautiful toast notifications
import React from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

const Notifications = ({ notifications, onRemove }) => {
  const getIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-5 h-5" />;
      case 'error': return <AlertCircle className="w-5 h-5" />;
      case 'warning': return <AlertTriangle className="w-5 h-5" />;
      default: return <Info className="w-5 h-5" />;
    }
  };

  const getColors = (type) => {
    switch (type) {
      case 'success': return 'from-green-500 to-emerald-600 border-green-400';
      case 'error': return 'from-red-500 to-rose-600 border-red-400';
      case 'warning': return 'from-yellow-500 to-orange-600 border-yellow-400';
      default: return 'from-blue-500 to-cyan-600 border-blue-400';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-2 max-w-sm w-full px-4 pointer-events-none">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`
            bg-gradient-to-r ${getColors(notification.type)}
            backdrop-blur-xl rounded-2xl p-4 shadow-2xl
            border-2 transform transition-all duration-300
            animate-slide-in-right pointer-events-auto
            hover:scale-105
          `}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 text-white">
              {getIcon(notification.type)}
            </div>
            <p className="flex-1 text-white text-sm font-medium leading-snug">
              {notification.message}
            </p>
            <button
              onClick={() => onRemove(notification.id)}
              className="flex-shrink-0 text-white/80 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}

      <style jsx>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default Notifications;