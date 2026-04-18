interface WeeklyReflectionBannerProps {
  onLaunch: () => void;
  onDismiss: () => void;
  launching: boolean;
}

export function WeeklyReflectionBanner({ onLaunch, onDismiss, launching }: WeeklyReflectionBannerProps) {
  return (
    <div className="bg-emerald-900/40 border border-emerald-700/60 rounded-lg px-4 py-3 flex flex-wrap items-center gap-3 mb-2">
      <div className="flex-1 min-w-0">
        <span className="text-emerald-300 font-semibold text-sm">Weekly Reflection: </span>
        <span className="text-slate-200 text-sm">
          It&rsquo;s Friday — take a few minutes to reflect on your week with Claude.
        </span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={onLaunch}
          disabled={launching}
          className="text-xs bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white px-2.5 py-1 rounded transition-colors"
        >
          {launching ? 'Opening…' : 'Start reflection'}
        </button>
        <button
          onClick={onDismiss}
          className="text-slate-400 hover:text-slate-200 text-sm px-1"
          title="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
