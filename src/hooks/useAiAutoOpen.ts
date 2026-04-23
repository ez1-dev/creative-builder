import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

interface Options {
  enabled: boolean;
  canUseAi: boolean;
  isOpen: boolean;
  hasSuggestions: boolean;
  onAutoOpen: () => void;
}

const LS_LAST_CLOSE = 'ai:last_close_at';
const LS_OPENS_TODAY = 'ai:auto_opens_today';
const LS_SNOOZE_PREFIX = 'ai:snoozed_until:';
const LS_OPENED_ROUTE_DATE = 'ai:opened_route_date:';

const COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes
const MAX_PER_DAY = 3;
const FIRST_VISIT_DELAY_MS = 1500;

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function isTypingTarget(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (el.isContentEditable) return true;
  return false;
}

function isOverlayOpen(): boolean {
  // Radix portals typically use [data-state="open"]; dialogs, drawers, sheets
  const open = document.querySelector(
    '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]'
  );
  return !!open;
}

function getOpensToday(): { date: string; routes: string[] } {
  try {
    const raw = localStorage.getItem(LS_OPENS_TODAY);
    if (!raw) return { date: todayKey(), routes: [] };
    const parsed = JSON.parse(raw);
    if (parsed.date !== todayKey()) return { date: todayKey(), routes: [] };
    return parsed;
  } catch {
    return { date: todayKey(), routes: [] };
  }
}

function recordOpen(route: string) {
  const cur = getOpensToday();
  if (!cur.routes.includes(route)) {
    cur.routes.push(route);
    localStorage.setItem(LS_OPENS_TODAY, JSON.stringify(cur));
  }
  localStorage.setItem(LS_OPENED_ROUTE_DATE + route, todayKey());
}

/**
 * Decides if and when to auto-open the AI assistant on a given route.
 *
 * Rules:
 * - Only if `enabled && canUseAi && !isOpen`.
 * - Skip if route was snoozed (24h after explicit close).
 * - Skip if global cooldown (<30 min since last close).
 * - Skip if reached daily limit (3 distinct routes/day).
 * - Skip if user is typing or a modal is open.
 * - Trigger on first visit per route per day (with small delay) when there are suggestions.
 */
export function useAiAutoOpen({ enabled, canUseAi, isOpen, hasSuggestions, onAutoOpen }: Options) {
  const location = useLocation();
  const route = location.pathname;
  const triggeredRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !canUseAi || isOpen) return;
    if (!route || route === '/' || route.startsWith('/login')) return;
    if (triggeredRef.current === route) return;

    // Snoozed?
    const snoozeRaw = localStorage.getItem(LS_SNOOZE_PREFIX + route);
    if (snoozeRaw && Number(snoozeRaw) > Date.now()) return;

    // Already opened on this route today?
    if (localStorage.getItem(LS_OPENED_ROUTE_DATE + route) === todayKey()) return;

    // Global cooldown after explicit close
    const lastClose = Number(localStorage.getItem(LS_LAST_CLOSE) || 0);
    if (lastClose && Date.now() - lastClose < COOLDOWN_MS) return;

    // Daily limit
    const opens = getOpensToday();
    if (opens.routes.length >= MAX_PER_DAY) return;

    // Need at least suggestions to be useful (avoids opening on empty modules)
    if (!hasSuggestions) return;

    const id = window.setTimeout(() => {
      if (isTypingTarget() || isOverlayOpen()) return;
      triggeredRef.current = route;
      recordOpen(route);
      onAutoOpen();
    }, FIRST_VISIT_DELAY_MS);

    return () => window.clearTimeout(id);
  }, [route, enabled, canUseAi, isOpen, hasSuggestions, onAutoOpen]);
}

/** Call when user explicitly closes the chat (X button). */
export function recordAiClose(route: string | null, snoozeRoute = true) {
  localStorage.setItem(LS_LAST_CLOSE, String(Date.now()));
  if (route && snoozeRoute) {
    localStorage.setItem(LS_SNOOZE_PREFIX + route, String(Date.now() + 24 * 60 * 60 * 1000));
  }
}
