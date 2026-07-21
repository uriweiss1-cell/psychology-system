import { useEffect, useState, useCallback } from 'react';
import { getAlerts, putExemptions } from '../api';

function ExemptableChip({ emp, exemptType, onExempt, color }) {
  const [showing, setShowing] = useState(false);
  const [reason, setReason] = useState('');

  const save = () => {
    if (!reason.trim()) return;
    onExempt(emp, exemptType, reason.trim());
    setShowing(false);
    setReason('');
  };

  return (
    <span className="inline-flex flex-col gap-1">
      <span className={`badge ${color} flex items-center gap-1`}>
        {emp.displayName}
        <button
          className="opacity-40 hover:opacity-100 transition-opacity text-xs leading-none pr-0.5"
          title="הגדר פטור"
          onClick={() => setShowing(s => !s)}
        >✕</button>
      </span>
      {showing && (
        <span className="inline-flex items-center gap-1 bg-white border border-yellow-300 rounded px-2 py-1 text-xs">
          <input
            autoFocus
            className="outline-none text-gray-800 w-40 bg-transparent placeholder-gray-400"
            placeholder="סיבה..."
            value={reason}
            onChange={e => setReason(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setShowing(false); }}
          />
          <button className="bg-yellow-400 hover:bg-yellow-500 text-white rounded px-2 py-0.5 font-medium" onClick={save}>שמור</button>
          <button className="text-gray-400 hover:text-gray-600" onClick={() => setShowing(false)}>ביטול</button>
        </span>
      )}
    </span>
  );
}

function ExemptedSection({ exemptions, type, onUnexempt }) {
  const [open, setOpen] = useState(false);
  const filtered = exemptions.filter(x => x.type === type);
  if (!filtered.length) return null;
  return (
    <div className="border border-gray-200 rounded text-xs">
      <button
        className="w-full flex items-center justify-between px-3 py-1.5 text-gray-500 hover:bg-gray-50"
        onClick={() => setOpen(o => !o)}
      >
        <span className="font-medium">פטורים ({filtered.length})</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="border-t border-gray-100 px-3 py-2 space-y-1 bg-gray-50">
          {filtered.map(x => (
            <div key={x.empId} className="flex items-baseline gap-2">
              <span className="font-medium text-gray-700">{x.empName}</span>
              <span className="text-gray-400 italic flex-1">{x.reason}</span>
              <button
                className="text-gray-300 hover:text-red-400 transition-colors"
                title="בטל פטור"
                onClick={() => onUnexempt(x.empId, type)}
              >↩</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
  const {
    unassignedFrameworks, frameworksWithVacancy = [], freeHoursAlerts = [],
    supAlerts = [], noEdSupervision = [], schoolGapAlerts = [], kinderGapAlerts = [],
    exemptions = [], noInterestGroup = [],
  } = alerts;

  const saveExemptions = async (newList) => {
    await putExemptions(newList);
    refresh();
  };

  const addExemption = (emp, type, reason) => {
    const next = [...exemptions.filter(x => !(x.empId === emp.id && x.type === type)),
      { empId: emp.id, empName: emp.displayName, type, reason }];
    saveExemptions(next);
  };

  const removeExemption = (empId, type) => {
    saveExemptions(exemptions.filter(x => !(x.empId === empId && x.type === type)));
  };

  const showSchoolGaps    = page === 'workplan' || page === 'schools';
  const showKinderGaps    = page === 'workplan' || page === 'kinder';
  const showEdSup         = page === 'workplan' || page === 'supervisions';
  const showInterestGroup = page === 'supervisions';
  const showGeneral       = page === 'workplan';

  const visibleSchoolGaps = showSchoolGaps ? schoolGapAlerts : [];
  const visibleKinderGaps = showKinderGaps ? kinderGapAlerts : [];

  const total = (showGeneral ? unassignedFrameworks.length + frameworksWithVacancy.length + freeHoursAlerts.length + supAlerts.length : 0)
    + (showEdSup ? noEdSupervision.length : 0)
    + (showInterestGroup ? noInterestGroup.length : 0)
    + visibleSchoolGaps.length + visibleKinderGaps.length;
  if (total === 0 && !exemptions.some(x => x.type === 'edSupervision')) return null;

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
        <div className="bg-white p-3 space-y-3 text-sm">
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
          {showEdSup && (noEdSupervision.length > 0 || exemptions.some(x => x.type === 'edSupervision')) && (
            <div className="space-y-1">
              <p className="font-semibold text-teal-700 mb-1">ללא הדרכה חינוכית פרטנית ({noEdSupervision.length}):</p>
              {noEdSupervision.length > 0 && (
                <div className="flex flex-wrap gap-1.5 items-start">
                  {noEdSupervision.map(e => (
                    <ExemptableChip key={e.id} emp={e} exemptType="edSupervision"
                      onExempt={addExemption} color="bg-teal-100 text-teal-800" />
                  ))}
                </div>
              )}
              <ExemptedSection exemptions={exemptions} type="edSupervision" onUnexempt={removeExemption} />
            </div>
          )}
          {showInterestGroup && noInterestGroup.length > 0 && (
            <div>
              <p className="font-semibold text-purple-700 mb-1">לא שובצו לקבוצת עניין ({noInterestGroup.length}):</p>
              <div className="flex flex-wrap gap-1">
                {noInterestGroup.map(e => (
                  <span key={e.id} className="badge bg-purple-100 text-purple-800">{e.displayName}</span>
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
        </div>
      )}
    </div>
  );
}
