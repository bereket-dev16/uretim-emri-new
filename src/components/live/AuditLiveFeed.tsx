'use client';

import { Activity, Flame } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { CLIENT_POLL_INTERVAL_MS, CLIENT_POLL_JITTER_MS } from '@/shared/config/client-polling';
import styles from './AuditLiveFeed.module.css';

interface AuditItem {
  id: string;
  actionType: string;
  entityType: string;
  actorUsername: string | null;
  createdAt: string;
  summary: string;
}

interface AuditTempo {
  totalToday: number;
  lastHour: number;
  topActionType: string | null;
  topActionCount: number;
  pace: 'sakin' | 'orta' | 'yogun';
}

interface AuditStreamResponse {
  items: AuditItem[];
  tempo: AuditTempo;
}

interface FeedToast extends AuditItem {
  localId: string;
}

interface AuditLiveFeedProps {
  currentUsername: string;
}

const TOAST_LIFETIME_MS = 10000;
const MAX_TOASTS = 5;

function tempoLabel(tempo: AuditTempo['pace']): string {
  switch (tempo) {
    case 'yogun':
      return 'Yoğun';
    case 'orta':
      return 'Orta';
    default:
      return 'Sakin';
  }
}

function topActionLabel(actionType: string | null): string {
  if (!actionType) {
    return '-';
  }

  switch (actionType) {
    case 'LOGIN_SUCCESS':
      return 'Giriş';
    case 'LOGIN_FAILED':
      return 'Hatalı Giriş';
    case 'STOCK_CREATED':
      return 'Stok Oluşturma';
    case 'STOCK_UPDATED':
      return 'Stok Güncelleme';
    case 'STOCK_DELETED':
      return 'Stok Silme';
    case 'USER_CREATED':
      return 'Kullanıcı Oluşturma';
    case 'USER_UPDATED':
      return 'Kullanıcı Güncelleme';
    case 'USER_DELETED':
      return 'Kullanıcı Silme';
    case 'USER_PASSWORD_RESET':
      return 'Şifre Sıfırlama';
    default:
      return actionType.toLowerCase();
  }
}

function formatTime(value: string): string {
  const date = new Date(value);

  return date.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function actorLabel(username: string | null): string {
  if (!username) {
    return 'sistem';
  }

  if (username.length <= 12) {
    return username;
  }

  return `${username.slice(0, 12)}...`;
}

function tempoBadgeClass(tempo: AuditTempo['pace']): string {
  if (tempo === 'yogun') {
    return `${styles.tempoBadge} ${styles.tempoYogun}`;
  }

  if (tempo === 'orta') {
    return `${styles.tempoBadge} ${styles.tempoOrta}`;
  }

  return `${styles.tempoBadge} ${styles.tempoSakin}`;
}

export function AuditLiveFeed({ currentUsername }: AuditLiveFeedProps) {
  const [isMounted, setIsMounted] = useState(false);
  const pollIntervalMs = useMemo(
    () => CLIENT_POLL_INTERVAL_MS + Math.floor(Math.random() * (CLIENT_POLL_JITTER_MS + 1)),
    []
  );
  const normalizedCurrentUsername = currentUsername.trim().toLocaleLowerCase('tr-TR');
  const [tempo, setTempo] = useState<AuditTempo>({
    totalToday: 0,
    lastHour: 0,
    topActionType: null,
    topActionCount: 0,
    pace: 'sakin'
  });
  const [toasts, setToasts] = useState<FeedToast[]>([]);
  const knownIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);
  const timeoutIdsRef = useRef<number[]>([]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) {
      return;
    }

    let disposed = false;
    let inFlight = false;

    function scheduleToastRemoval(localId: string): void {
      const timeoutId = window.setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.localId !== localId));
      }, TOAST_LIFETIME_MS);
      timeoutIdsRef.current.push(timeoutId);
    }

    async function syncFeed(): Promise<void> {
      if (disposed || inFlight || document.visibilityState === 'hidden') {
        return;
      }

      inFlight = true;

      try {
        const response = await fetch('/api/audit/stream?limit=12', {
          method: 'GET',
          credentials: 'same-origin',
          cache: 'no-store'
        });

        if (!response.ok || disposed) {
          return;
        }

        const payload = (await response.json()) as AuditStreamResponse;
        setTempo(payload.tempo);

        const incoming = payload.items;
        const visibleIncoming = incoming.filter((item) => {
          const actor = item.actorUsername?.trim().toLocaleLowerCase('tr-TR');
          return !actor || actor !== normalizedCurrentUsername;
        });

        if (!initializedRef.current) {
          for (const item of incoming) {
            knownIdsRef.current.add(item.id);
          }
          initializedRef.current = true;
          return;
        }

        const freshItems = visibleIncoming
          .filter((item) => !knownIdsRef.current.has(item.id))
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        if (freshItems.length === 0) {
          return;
        }

        for (const item of incoming) {
          knownIdsRef.current.add(item.id);
        }
        if (knownIdsRef.current.size > 500) {
          knownIdsRef.current = new Set(incoming.map((item) => item.id));
        }

        const nextToasts = freshItems.slice(-MAX_TOASTS).map((item) => ({
          ...item,
          localId: `${item.id}-${Date.now()}`
        }));

        setToasts((prev) => [...prev, ...nextToasts].slice(-MAX_TOASTS));
        for (const item of nextToasts) {
          scheduleToastRemoval(item.localId);
        }
      } catch {
        // Silent stream hedeflendiği icin polling hatalari kullaniciya yansitilmiyor.
      } finally {
        inFlight = false;
      }
    }

    const intervalId = window.setInterval(syncFeed, pollIntervalMs);

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        void syncFeed();
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    void syncFeed();

    return () => {
      disposed = true;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      for (const timeoutId of timeoutIdsRef.current) {
        window.clearTimeout(timeoutId);
      }
      timeoutIdsRef.current = [];
    };
  }, [isMounted, normalizedCurrentUsername, pollIntervalMs]);

  if (!isMounted) {
    return null;
  }

  return (
    <aside className={styles.root} aria-live="polite" aria-label="Canlı işlem bildirimi">
      <div className={styles.feed}>
        {toasts.map((item) => (
          <article key={item.localId} className={styles.toast}>
            <div className={styles.toastTop}>
              <span className={styles.toastTitle}>
                <span className={styles.toastDot} />
                {item.summary}
              </span>
              <span className={styles.toastMeta}>{actorLabel(item.actorUsername)}</span>
            </div>
            <div className={styles.toastTime}>{formatTime(item.createdAt)}</div>
          </article>
        ))}
      </div>

      <section className={styles.panel}>
        <div className={styles.titleRow}>
          <span className={styles.title}>
            <Activity size={14} />
            Canlı İşlem Akışı
          </span>
          <span className={tempoBadgeClass(tempo.pace)}>
            <Flame size={11} className="inline-block mr-1" />
            {tempoLabel(tempo.pace)}
          </span>
        </div>

        <div className={styles.metrics}>
          <div className={styles.metricItem}>
            <span className={styles.metricLabel}>Bugünkü Toplam</span>
            <strong className={styles.metricValue}>{tempo.totalToday} işlem</strong>
          </div>
          <div className={styles.metricItem}>
            <span className={styles.metricLabel}>Son 1 Saat</span>
            <strong className={styles.metricValue}>{tempo.lastHour} işlem</strong>
          </div>
          <div className={styles.metricItem}>
            <span className={styles.metricLabel}>En Sık İşlem</span>
            <strong className={styles.metricValue}>{topActionLabel(tempo.topActionType)}</strong>
            <span className={styles.metricSub}>{tempo.topActionCount} kez</span>
          </div>
        </div>
      </section>
    </aside>
  );
}
