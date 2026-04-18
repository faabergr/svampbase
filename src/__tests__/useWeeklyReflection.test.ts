import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWeeklyReflection } from '../hooks/useWeeklyReflection';

const STORAGE_KEY = 'weeklyReflection_dismissed';

// A known Friday at 2pm
const FRIDAY_AFTERNOON = new Date('2026-04-17T14:00:00');
// A known Friday at 11am (before noon)
const FRIDAY_MORNING = new Date('2026-04-17T11:00:00');
// A known Thursday
const THURSDAY = new Date('2026-04-16T14:00:00');

function setNow(date: Date) {
  vi.setSystemTime(date);
}

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useWeeklyReflection', () => {
  it('shows banner on Friday after noon', () => {
    setNow(FRIDAY_AFTERNOON);
    const { result } = renderHook(() => useWeeklyReflection());
    expect(result.current.shouldShow).toBe(true);
  });

  it('hides banner on Friday before noon', () => {
    setNow(FRIDAY_MORNING);
    const { result } = renderHook(() => useWeeklyReflection());
    expect(result.current.shouldShow).toBe(false);
  });

  it('hides banner on non-Friday days', () => {
    setNow(THURSDAY);
    const { result } = renderHook(() => useWeeklyReflection());
    expect(result.current.shouldShow).toBe(false);
  });

  it('hides banner when already dismissed this Friday', () => {
    setNow(FRIDAY_AFTERNOON);
    localStorage.setItem(STORAGE_KEY, '2026-04-17');
    const { result } = renderHook(() => useWeeklyReflection());
    expect(result.current.shouldShow).toBe(false);
  });

  it('shows banner when dismissed on a previous Friday', () => {
    setNow(FRIDAY_AFTERNOON);
    localStorage.setItem(STORAGE_KEY, '2026-04-10'); // last week
    const { result } = renderHook(() => useWeeklyReflection());
    expect(result.current.shouldShow).toBe(true);
  });

  it('dismiss() hides the banner and persists to localStorage', () => {
    setNow(FRIDAY_AFTERNOON);
    const { result } = renderHook(() => useWeeklyReflection());
    expect(result.current.shouldShow).toBe(true);

    act(() => result.current.dismiss());

    expect(result.current.shouldShow).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('2026-04-17');
  });
});
