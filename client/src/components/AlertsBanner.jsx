import { useEffect, useState, useCallback } from 'react';
import { getAlerts } from '../api';

export default function AlertsBanner({ page = 'workplan' }) {
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
  const { unassignedFrameworks, frameworksWithVacancy = [], overBudget, freeHoursAlerts = [], supAlerts = [], noEdSupervision = [], schoolGapAlerts = [], kinderGapAlerts = [] } = alerts;

  const showSchoolGaps = page === 'workplan' || page === 'schools';
  const showKinderGaps = page === 'workplan' || page === 'kinder';
  const showGeneral    = page === 'workplan';

  const visibleSchoolGaps = showSchoolGaps ? schoolGapAlerts : [];
  const visibleKinderGaps = showKinderGaps ? kinderGapAlerts : [];

  const total = (showGeneral ? unassignedFrameworks.length + frameworksWithVacancy.length + overBudget.length + freeHoursAlerts.length + supAlerts.length + noEdSupervision.length : 0)
    + visibleSchoolGaps.length + visibleKinderGaps.length;
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
          {visibleSchoolGaps.length > 0 && (
            <div>
              <p className="font-semibold text-blue-700 mb-1">פער בשעות בתי ספר ({visibleSchoolGaps.length}):</p>
              <div className="flex flex-wrap gap-1">
                {visibleSchoolGaps.map(e => (
                  <span key={e.id} className="badge bg-blue-100 text-blue-800">
                    {e.displayName}: מתוכנן {e.planned} / בפועל {e.actual} ({e.gap > 0 ? `+${e.gap}` : e.gap} ש׳)
                  </span>
                ))}
              </div>
            </div>
          )}
          {visibleKinderGaps.length > 0 && (
            <div>
              <p className="font-semibold text-green-700 mb-1">פער בשעות גנים ({visibleKinderGaps.length}):</p>
              <div className="flex flex-wrap gap-1">
                {visibleKinderGaps.map(e => (
                  <span key={e.id} className="badge bg-green-100 text-green-800">
                    {e.displayName}: מתוכנן {e.planned} / בפועל {e.actual} ({e.gap > 0 ? `+${e.gap}` : e.gap} ש׳)
                  </span>
                ))}
              </div>
            </div>
          )}
          {showGeneral && noEdSupervision.length > 0 && (
            <div>
              <p className="font-semibold text-teal-700 mb-1">ללא הדרכה חינוכית פרטנית ({noEdSupervision.length}):</p>
              <div className="flex flex-wrap gap-1">
                {noEdSupervision.map(e => (
                  <span key={e.id} className="badge bg-teal-100 text-teal-800">{e.displayName}</span>
                ))}
              </div>
            </div>
          )}
          {showGeneral && supAlerts.length > 0 && (
            <div>
              <p className="font-semibold text-purple-700 mb-1">פערים בהדרכות ({supAlerts.length}):</p>
              <div className="flex flex-wrap gap-1">
                {supAlerts.map(e => (
                  <span key={e.id} className="badge bg-purple-100 text-purple-800">
                    {e.displayName} —{' '}
                    {e.alerts.map((a, i) => (
                      <span key={i}>
                        {a.field}: {a.gap > 0 ? `+${a.gap}` : a.gap} ש׳{i < e.alerts.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </span>
                ))}
              </div>
            </div>
          )}
          {showGeneral && freeHoursAlerts.length > 0 && (
            <div>
              <p className="font-semibold text-orange-700 mb-1">חריגה בשעות פנויות ({freeHoursAlerts.length}):</p>
              <div className="flex flex-wrap gap-1">
                {freeHoursAlerts.map(e => (
                  <span key={e.id} className={`badge ${e.type === 'over' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-700'}`}>
                    {e.displayName} ({e.gap > 0 ? `+${e.gap}` : e.gap} ש׳)
                  </span>
                ))}
              </div>
            </div>
          )}
          {showGeneral && unassignedFrameworks.length > 0 && (
            <div>
              <p className="font-semibold text-orange-700 mb-1">מסגרות ללא פסיכולוג ({unassignedFrameworks.length}):</p>
              <div className="flex flex-wrap gap-1">
                {unassignedFrameworks.map(f => (
                  <span key={f.id} className="badge bg-orange-100 text-orange-700">{f.name}</span>
                ))}
              </div>
            </div>
          )}
          {showGeneral && frameworksWithVacancy.length > 0 && (
            <div>
              <p className="font-semibold text-yellow-700 mb-1">מסגרות עם חלון פנוי — חסר פסיכולוג מחליף ({frameworksWithVacancy.length}):</p>
              <div className="flex flex-wrap gap-1">
                {frameworksWithVacancy.map(f => (
                  <span key={f.id} className="badge bg-yellow-100 text-yellow-700">{f.name}</span>
                ))}
              </div>
            </div>
          )}
          {showGeneral && overBudget.length > 0 && (
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
