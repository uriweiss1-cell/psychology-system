import { useEffect, useState, useCallback } from 'react';
import { getAlerts } from '../api';

export default function AlertsBanner() {
  const [alerts, setAlerts] = useState(null);
  const [open, setOpen] = useState(true);

  const refresh = useCallback(() => {
    getAlerts().then(setAlerts).catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 15000);
    window.addEventListener('focus', refresh);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', refresh);
    };
  }, [refresh]);

  if (!alerts) return null;
  const { unassignedEmployees, unassignedFrameworks, frameworksWithVacancy = [], overBudget } = alerts;
  const total = unassignedEmployees.length + unassignedFrameworks.length + frameworksWithVacancy.length + overBudget.length;
  if (total === 0) return null;

  return (
    <div className="mb-4 border border-red-200 rounded overflow-hidden">
      <button
        className="w-full flex items-center justify-between bg-red-50 px-3 py-2 text-sm font-semibold text-red-800 hover:bg-red-100"
        onClick={() => setOpen(o => !o)}
      >
        <span>⚠️ {total} חוסרים / התראות</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="bg-white p-3 space-y-2 text-sm">
          {unassignedEmployees.length > 0 && (
            <div>
              <p className="font-semibold text-red-700 mb-1">פסיכולוגים ללא שיבוץ ({unassignedEmployees.length}):</p>
              <div className="flex flex-wrap gap-1">
                {unassignedEmployees.map(e => (
                  <span key={e.id} className="badge bg-red-100 text-red-700">{e.displayName}</span>
                ))}
              </div>
            </div>
          )}
          {unassignedFrameworks.length > 0 && (
            <div>
              <p className="font-semibold text-orange-700 mb-1">מסגרות ללא פסיכולוג ({unassignedFrameworks.length}):</p>
              <div className="flex flex-wrap gap-1">
                {unassignedFrameworks.map(f => (
                  <span key={f.id} className="badge bg-orange-100 text-orange-700">{f.name}</span>
                ))}
              </div>
            </div>
          )}
          {frameworksWithVacancy.length > 0 && (
            <div>
              <p className="font-semibold text-yellow-700 mb-1">מסגרות עם חלון פנוי — חסר פסיכולוג מחליף ({frameworksWithVacancy.length}):</p>
              <div className="flex flex-wrap gap-1">
                {frameworksWithVacancy.map(f => (
                  <span key={f.id} className="badge bg-yellow-100 text-yellow-700">{f.name}</span>
                ))}
              </div>
            </div>
          )}
          {overBudget.length > 0 && (
            <div>
              <p className="font-semibold text-yellow-700 mb-1">חריגת שעות ({overBudget.length}):</p>
              <div className="flex flex-wrap gap-1">
                {overBudget.map(e => (
                  <span key={e.id} className="badge bg-yellow-100 text-yellow-700">
                    {e.displayName} ({e.balance} ש׳)
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
