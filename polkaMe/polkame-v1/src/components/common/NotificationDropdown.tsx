import { useState, useRef, useEffect } from "react";
import { useActiveAccount } from "thirdweb/react";
import { getRecentActivity, getSecurityLog } from "../../api";

interface Notification {
  id: string;
  title: string;
  description: string;
  icon: string;
  time: string;
  read: boolean;
  type: "info" | "success" | "warning" | "danger";
}

const TYPE_COLORS: Record<string, string> = {
  info: "text-blue-400",
  success: "text-emerald-400",
  warning: "text-amber-400",
  danger: "text-red-400",
};

export default function NotificationDropdown() {
  const activeAccount = useActiveAccount();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Reload when account changes
  useEffect(() => {
    setLoaded(false);
    setNotifications([]);
  }, [activeAccount?.address]);

  async function loadNotifications() {
    if (!activeAccount?.address) {
      setNotifications([
        {
          id: "connect",
          title: "Connect your wallet",
          description: "Link your wallet to see personalized notifications.",
          icon: "account_balance_wallet",
          time: "",
          read: true,
          type: "info",
        },
      ]);
      setLoaded(true);
      return;
    }

    const notifs: Notification[] = [
      {
        id: "welcome",
        title: "Welcome to PolkaMe!",
        description:
          "Your decentralized identity portal is ready. Start by verifying your wallet.",
        icon: "waving_hand",
        time: "Today",
        read: true,
        type: "info",
      },
    ];

    // Pull from activity log
    const actRes = await getRecentActivity(activeAccount.address);
    if (actRes.success) {
      actRes.data.slice(0, 5).forEach((a, i) => {
        notifs.push({
          id: `act-${i}`,
          title: a.action,
          description: `${a.app} — ${a.status}`,
          icon: a.icon,
          time: a.timestamp,
          read: false,
          type:
            a.status === "success"
              ? "success"
              : a.status === "pending"
                ? "warning"
                : "danger",
        });
      });
    }

    // Pull from security log
    const secRes = await getSecurityLog(activeAccount.address);
    if (secRes.success) {
      secRes.data.slice(0, 3).forEach((s, i) => {
        notifs.push({
          id: `sec-${i}`,
          title: s.event,
          description: s.source,
          icon: "security",
          time: new Date(s.timestamp).toLocaleDateString(),
          read: false,
          type: "info",
        });
      });
    }

    // If no real notifications, add a tip
    if (notifs.length === 1) {
      notifs.push({
        id: "tip",
        title: "Get started",
        description:
          "Create your DID & link social accounts to see activity here.",
        icon: "lightbulb",
        time: "",
        read: true,
        type: "info",
      });
    }

    setNotifications(notifs);
    setLoaded(true);
  }

  function handleToggle() {
    if (!open && !loaded) {
      loadNotifications();
    }
    setOpen(!open);
  }

  function markAllRead() {
    setNotifications((n) => n.map((x) => ({ ...x, read: true })));
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleToggle}
        className="size-10 bg-neutral-muted rounded-lg flex items-center justify-center text-text-muted hover:text-white hover:bg-primary/20 transition-all duration-200 hover:scale-105 relative"
      >
        <span className="material-symbols-outlined">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 size-5 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-background-dark border border-neutral-border rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="p-3 border-b border-neutral-border flex items-center justify-between">
            <h4 className="font-bold text-sm">Notifications</h4>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-primary text-xs font-bold hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-neutral-border">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-text-muted">
                <span className="material-symbols-outlined text-3xl mb-2 block opacity-40">
                  notifications_off
                </span>
                No notifications yet
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-3 flex gap-3 hover:bg-neutral-muted/30 transition-colors ${
                    !n.read ? "bg-primary/5" : ""
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-lg mt-0.5 ${TYPE_COLORS[n.type]}`}
                  >
                    {n.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm ${!n.read ? "font-bold" : "font-medium"}`}
                    >
                      {n.title}
                    </p>
                    <p className="text-xs text-text-muted truncate">
                      {n.description}
                    </p>
                  </div>
                  {n.time && (
                    <span className="text-[10px] text-text-muted whitespace-nowrap mt-1">
                      {n.time}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
