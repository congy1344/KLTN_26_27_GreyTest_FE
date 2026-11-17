import { Tag } from './Tag';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail,
  Bell,
  CheckCircle2,
  CreditCard,
  MessageSquare,
  CheckCheck,
  BellOff,
  ExternalLink,
} from 'lucide-react';
import { useNotifications } from '../../features/notifications/hooks/useNotifications';
import { useLanguage, type Language } from '../i18n/language';
import { parseApiDate } from '../utils/date-time';

function timeAgo(dateStr: string, language: Language): string {
  try {
    const now = new Date();
    const date = parseApiDate(dateStr);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    const relative = new Intl.RelativeTimeFormat(language, { numeric: 'auto' });
    if (seconds < 60) return relative.format(-Math.max(1, seconds), 'second');
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return relative.format(-minutes, 'minute');
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return relative.format(-hours, 'hour');
    const days = Math.floor(hours / 24);
    if (days < 30) return relative.format(-days, 'day');
    const months = Math.floor(days / 30);
    return relative.format(-months, 'month');
  } catch {
    return dateStr;
  }
}

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Đóng dropdown khi nhấn Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleNotificationClick = (item: { id: string; link?: string }) => {
    markAsRead(item.id);
    setIsOpen(false);
    if (item.link) {
      navigate(item.link);
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'ADMIN':
        return (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-brand-softer text-fg-brand-strong dark:text-fg-brand-strong border border-border-brand-subtle">
            <MessageSquare size={15} />
          </div>
        );
      case 'PAYMENT':
        return (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-success-soft text-fg-success-strong dark:text-fg-success-strong border border-border-success-subtle">
            <CreditCard size={15} />
          </div>
        );
      case 'TASK':
      default:
        return (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-brand-softer text-fg-brand-strong border border-border-brand-subtle">
            <CheckCircle2 size={15} />
          </div>
        );
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button: Notification Bell */}
      <button
        type="button"
        data-testid="notification-bell-btn"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative flex h-8 w-8 items-center justify-center rounded-control border border-border-default bg-neutral-secondary-soft text-body-subtle transition-colors hover:border-border-default-strong hover:bg-neutral-secondary-medium hover:text-heading"
        aria-label={t('Thông báo', 'Notifications')}
        title={t('Thông báo hệ thống', 'System notifications')}
        aria-expanded={isOpen}
      >
        <Bell size={15} />
        {unreadCount > 0 && (
          <Tag data-testid="unread-badge" className="absolute -top-1 -right-1 font-mono tabular-nums">
            {unreadCount > 9 ? '9+' : unreadCount}
          </Tag>
        )}
      </button>

      {/* Dropdown Menu Popup */}
      {isOpen && (
        <div
          role="menu"
          data-testid="notification-dropdown-menu"
          className="absolute right-0 mt-2 w-80 sm:w-96 origin-top-right rounded-base border border-border-default bg-neutral-primary-soft p-3 text-body shadow-2xl animate-fade-in z-50"
        >
          {/* Header */}
          <div className="mb-2 flex items-center justify-between border-b border-border-default-subtle pb-2.5 px-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-heading">
                {t('Thông báo', 'Notifications')}
              </span>
              {unreadCount > 0 && (
                <Tag className="font-mono tabular-nums">
                  {unreadCount} {t('chưa đọc', 'unread')}
                </Tag>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                data-testid="mark-all-read-btn"
                onClick={markAllAsRead}
                className="rounded-control flex items-center gap-1 text-xs font-semibold text-fg-brand hover:underline"
              >
                <CheckCheck size={13} />
                <span>{t('Đánh dấu đã đọc', 'Mark all as read')}</span>
              </button>
            )}
          </div>

          {/* List of notifications */}
          <div className="max-h-80 overflow-y-auto space-y-1.5 pr-0.5">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-body-subtle">
                <BellOff size={24} className="mx-auto text-body-subtle mb-1.5" />
                <p className="font-medium text-heading">
                  {t('Không có thông báo nào', 'No notifications')}
                </p>
                <p className="text-xs text-body-subtle mt-0.5">
                  {t('Các tác vụ hoàn thành, thanh toán và thông báo từ admin sẽ xuất hiện ở đây.', 'Completed tasks, payments, and admin notices will appear here.')}
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  data-testid={`notification-item-${item.id}`}
                  onClick={() => handleNotificationClick(item)}
                  className={`group relative flex items-start gap-3 rounded-base p-2.5 text-xs transition-colors cursor-pointer ${
                    !item.read
                      ? 'bg-brand-softer hover:bg-brand-softer border border-border-brand-subtle'
                      : 'hover:bg-neutral-secondary-soft border border-transparent'
                  }`}
                >
                  {getIconForType(item.type)}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="truncate font-semibold text-heading group-hover:text-fg-brand transition-colors">
                        {item.title}
                      </h4>
                      {!item.read && (
                        <Tag variant="status" tone="brand" icon={Mail}>{t('Chưa đọc', 'Unread')}</Tag>
                      )}
                    </div>

                    <p className="mt-0.5 text-xs text-body-subtle line-clamp-2 leading-relaxed">
                      {item.message}
                    </p>

                    <div className="mt-1.5 flex items-center justify-between text-xs text-body-subtle">
                      <span>{timeAgo(item.createdAt, language)}</span>
                      {item.link && (
                        <span className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-fg-brand font-medium">
                          <span>{t('Xem chi tiết', 'Details')}</span>
                          <ExternalLink size={10} />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationDropdown;
