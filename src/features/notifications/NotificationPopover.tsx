import React, { useEffect, useRef } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Activity,
  CheckCheck,
  Trash2,
  X
} from 'lucide-react';
import { useNotificationStore, type AppNotification } from '../../store/useNotificationStore';
import { useTimeStore } from '../../store/useTimeStore';
import { useScenarioStore } from '../../store/useScenarioStore';
import { Icon } from '../../ui/Icon';

interface NotificationPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

export function NotificationPopover({
  isOpen,
  onClose,
  triggerRef
}: NotificationPopoverProps): React.JSX.Element | null {
  const popoverRef = useRef<HTMLDivElement>(null);

  const {
    notifications,
    filter,
    setFilter,
    markAllRead,
    clearAll,
    setRead
  } = useNotificationStore();

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Filter items
  const filteredItems = notifications.filter((item) => {
    if (filter === 'alert') return item.type === 'alert';
    if (filter === 'system') return item.type === 'system' || item.type === 'user';
    return true;
  });

  // Handle escape key and outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        triggerRef.current?.focus();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  const handleItemClick = (item: AppNotification) => {
    if (item.simTimestampMs) {
      useTimeStore.getState().setTime(new Date(item.simTimestampMs));
    }
    if (item.siteId) {
      useScenarioStore.getState().setActiveSiteId(item.siteId);
    }
    setRead(item.id, true);
  };

  return (
    <>
      {/* Mobile backdrop under 820px */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 min-[820px]:hidden"
        onClick={() => {
          onClose();
          triggerRef.current?.focus();
        }}
        aria-hidden="true"
      />

      <div
        ref={popoverRef}
        role="dialog"
        aria-label={`Notifications (${unreadCount} unread)`}
        aria-modal="true"
        className="max-[819px]:fixed max-[819px]:inset-x-0 max-[819px]:bottom-0 max-[819px]:w-full max-[819px]:max-h-[85vh] max-[819px]:rounded-t-2xl max-[819px]:rounded-b-none min-[820px]:absolute min-[820px]:right-0 min-[820px]:top-full min-[820px]:mt-2 min-[820px]:w-[360px] min-[820px]:rounded-2xl z-50 flex flex-col border border-panel-border bg-[#141210]/95 backdrop-blur-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-panel-border px-4 py-3 bg-[#181614]/80">
          <div className="flex items-center gap-2">
            <h3 className="font-sans text-sm font-bold text-ink">Notifications</h3>
            <span className="font-mono text-xs font-semibold text-amber">
              ({unreadCount})
            </span>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="flex items-center gap-1 font-mono text-[11px] text-muted hover:text-ink transition-colors focus:outline-none"
                title="Mark all as read"
              >
                <Icon icon={CheckCheck} size={16} className="text-amber" />
                <span>Mark read</span>
              </button>
            )}
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="flex items-center gap-1 font-mono text-[11px] text-muted hover:text-warning transition-colors focus:outline-none ml-1.5"
                title="Clear all notifications"
              >
                <Icon icon={Trash2} size={16} />
                <span>Clear</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                onClose();
                triggerRef.current?.focus();
              }}
              className="rounded-md p-1 text-muted hover:text-ink hover:bg-[#221F1C] transition-colors focus:outline-none min-[820px]:hidden ml-1"
              aria-label="Close notifications"
            >
              <Icon icon={X} size={16} />
            </button>
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-1.5 border-b border-panel-border px-3 py-2 bg-[#12110F]/60">
          {(
            [
              { key: 'all', label: 'All' },
              { key: 'alert', label: 'Alerts' },
              { key: 'system', label: 'System' }
            ] as const
          ).map((chip) => {
            const isActive = filter === chip.key;
            return (
              <button
                key={chip.key}
                type="button"
                onClick={() => setFilter(chip.key)}
                className={`rounded-lg px-2.5 py-1 font-mono text-[11px] font-medium transition-all focus:outline-none ${
                  isActive
                    ? 'bg-amber text-ground shadow-xs'
                    : 'bg-[#1C1A18] text-muted hover:text-ink hover:bg-[#25221F] border border-panel-border/60'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        {/* Notification Feed List */}
        <div className="max-h-[380px] overflow-y-auto space-y-2 p-3 select-none">
          {filteredItems.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <p className="font-mono text-xs text-muted leading-relaxed">
                No notifications yet.
                <br />
                Events appear as the simulation runs.
              </p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const severityBarColor =
                item.severity === 'critical'
                  ? 'bg-rose-500'
                  : item.severity === 'warning'
                  ? 'bg-amber'
                  : item.severity === 'success'
                  ? 'bg-emerald-500'
                  : 'bg-sky-400';

              const itemIcon =
                item.type === 'user'
                  ? Activity
                  : item.severity === 'critical' || item.severity === 'warning'
                  ? AlertTriangle
                  : item.severity === 'success'
                  ? CheckCircle2
                  : Info;

              const iconColor =
                item.severity === 'critical'
                  ? 'text-rose-500'
                  : item.severity === 'warning'
                  ? 'text-amber'
                  : item.severity === 'success'
                  ? 'text-emerald-500'
                  : 'text-sky-400';

              return (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleItemClick(item)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleItemClick(item);
                    }
                  }}
                  className={`group relative flex items-start gap-2.5 rounded-xl border p-2.5 transition-all cursor-pointer ${
                    item.read
                      ? 'border-panel-border/60 bg-[#141210]/90 hover:bg-[#1B1917] hover:border-panel-border'
                      : 'border-amber/40 bg-[#1A1714] hover:bg-[#201D1A] shadow-sm'
                  }`}
                >
                  {/* Severity color bar on the left */}
                  <span
                    className={`w-1 self-stretch rounded-full shrink-0 ${severityBarColor}`}
                    aria-hidden="true"
                  />

                  {/* Icon */}
                  <div className="mt-0.5 shrink-0">
                    <Icon icon={itemIcon} size={16} className={iconColor} />
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1.5">
                      <span
                        className={`font-sans text-xs font-semibold leading-tight truncate ${
                          item.read ? 'text-ink' : 'text-ink font-bold'
                        }`}
                      >
                        {item.title}
                      </span>
                      {!item.read && (
                        <span
                          className="h-1.5 w-1.5 rounded-full bg-amber shrink-0"
                          title="Unread"
                        />
                      )}
                    </div>

                    <p className="mt-1 font-sans text-[11px] text-muted leading-snug line-clamp-2">
                      {item.detail}
                    </p>

                    {/* Timestamp row: simulation time + relative real time */}
                    <div className="mt-1.5 flex items-center justify-between font-mono text-[9px] text-muted">
                      <span className="truncate">SIM {item.simTime}</span>
                      <span className="shrink-0 ml-2">
                        {formatRelativeTime(item.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
