import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import AlertsBanner from '../components/AlertsBanner';
import { getAssignmentSummary, getEmployees, getAssignments, updateAssignment, getFrameworks, updateFramework, getSpecEdClasses, createSpecEdClass, updateSpecEdClass, deleteSpecEdClass, advanceSpecEdYear, getAlerts } from '../api';
import axios from 'axios';

// כיתות שמחושבות כ-2 שעות שבועיות: א (כיתה א'), ז (מעבר לחטב"ע), י (מעבר לתיכון)
// הערה: 'י' לבד, לא יא/יב — בדיקה שהתו אחרי האות אינו אות עברית
function gradeHours(grade) {
  for (const letter of ['א', 'ז', 'י']) {
    if (grade.startsWith(letter)) {
      const next = grade[letter.length];
      if (!next || !/[א-ת]/.test(next)) return 2;
    }
  }
  return 1;
}

// חישוב שעות יעד: אם הוגדר ידנית → שימוש בערך; אחרת → נוסחה (v3)
function calcTargetHours(fw, fwSpec) {
  if (fw.targetHours != null) return fw.targetHours;
  if (!fw.allocatedHours) return null;
  const base = Math.ceil(fw.allocatedHours / 100);
  const specEdExtra = fwSpec.reduce((sum, s) => {
    const grades = (s.grades || '').split(',').map(g => g.trim()).filter(Boolean);
    return sum + grades.reduce((gs, grade) => gs + gradeHours(grade), 0);
  }, 0);
  return base + specEdExtra;
}

const SECTOR_COLORS = {
  'ממלכתי':       'bg-blue-100 text-blue-800',
  'ממ"ד':         'bg-green-100 text-green-800',
  'חמ"ד':         'bg-yellow-100 text-yellow-800',
  'חינוך מיוחד': 'bg-purple-100 text-purple-800',
  'חרדי':         'bg-gray-100 text-gray-700',
};

const SUBTYPE_ORDER  = ['יסודי', 'חטיבה', 'תיכון', 'special_ed', ''];
const SECTOR_ORDER   = ['ממלכתי', 'ממ"ד', 'חמ"ד', 'חרדי'];
const SECTORS        = ['ממלכתי', 'ממ"ד', 'חמ"ד', 'חרדי', 'חינוך מיוחד'];

function sectorSort(a, b) {
  const ai = SECTOR_ORDER.indexOf(a.sector);
  const bi = SECTOR_ORDER.indexOf(b.sector);
  const aIdx = ai === -1 ? 99 : ai;
  const bIdx = bi === -1 ? 99 : bi;
  if (aIdx !== bIdx) return aIdx - bIdx;
  return a.name.localeCompare(b.name, 'he');
}

export default function Schools() {
  const [summary, setSummary]         = useState([]);
  const [employees, setEmployees]     = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [specEdClasses, setSpecEdClasses] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [filter, setFilter]           = useState('');
  const [filterType, setFilterType]   = useState('all');
  const [editingAsgn, setEditingAsgn] = useState(null);
  const [editingSpec, setEditingSpec] = useState(null); // { id, frameworkId, grades, classType, psychologistName }
  const [addingSpecFor, setAddingSpecFor] = useState(null); // frameworkId
  const [freeHoursAlerts, setFreeHoursAlerts] = useState([]);
  const [alertsOpen, setAlertsOpen] = useState(true);
  const [overOpen, setOverOpen] = useState(true);
  const [editingTarget, setEditingTarget] = useState(null); // { id, value }

  const load = async () => {
    const [sum, emps, asgns, spec, alertsData] = await Promise.all([
      getAssignmentSummary(), getEmployees(true), getAssignments(), getSpecEdClasses(), getAlerts()
    ]);
    setSummary(sum);
    setEmployees(emps);
    setAssignments(asgns);
    setSpecEdClasses(spec);
    setFreeHoursAlerts(alertsData.freeHoursAlerts || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const saveAssignment = async () => {
    if (!editingAsgn) return;
    const updated = await updateAssignment(editingAsgn.id, {
      employeeId: +editingAsgn.employeeId,
      hours: +editingAsgn.hours || 0,
      specEdHours: +editingAsgn.specEdHours || 0,
      kinderHours: +editingAsgn.kinderHours || 0,
    });
    setAssignments(prev => prev.map(a => a.id === updated.id ? updated : a));
    setEditingAsgn(null);
    setSummary(await getAssignmentSummary());
  };

  const deleteAssignment = async (id) => {
    if (!confirm('למחוק שיבוץ זה?')) return;
    await axios.delete(`/api/assignments/${id}`);
    setAssignments(prev => prev.filter(a => a.id !== id));
    setSummary(await getAssignmentSummary());
  };

  const addAssignment = async (frameworkId) => {
    const res = await axios.post('/api/assignments', { frameworkId, employeeId: 0, hours: 0, specEdHours: 0, kinderHours: 0 });
    setAssignments(prev => [...prev, res.data]);
    setEditingAsgn({ ...res.data });
  };

  const saveTargetHours = async (fwId, value) => {
    const parsed = value === '' ? null : parseFloat(value);
    await updateFramework(fwId, { targetHours: isNaN(parsed) ? null : parsed });
    setSummary(await getAssignmentSummary());
    setEditingTarget(null);
  };

  const saveSpec = async () => {
    if (!editingSpec) return;
    const updated = await updateSpecEdClass(editingSpec.id, editingSpec);
    setSpecEdClasses(prev => prev.map(s => s.id === editingSpec.id ? updated : s));
    setEditingSpec(null);
  };

  const addSpec = async (frameworkId) => {
    const created = await createSpecEdClass({ frameworkId, grades: '', classType: 'ל.ל', psychologistName: '' });
    setSpecEdClasses(prev => [...prev, created]);
    setEditingSpec({ ...created });
    setAddingSpecFor(null);
  };

  const deleteSpec = async (id) => {
    await deleteSpecEdClass(id);
    setSpecEdClasses(prev => prev.filter(s => s.id !== id));
  };

  // מסגרות לא מאוישות = אין שיבוץ עם עובד פעיל
  const activeEmpIds = new Set(employees.map(e => e.id));
  const assignedActiveFwIds = new Set(
    assignments.filter(a => activeEmpIds.has(a.employeeId) && a.employeeId > 0).map(a => a.frameworkId)
  );

  const getGap = (fw) => {
    const fwSpec = specEdClasses.filter(s => s.frameworkId === fw.id);
    const target = calcTargetHours(fw, fwSpec);
    if (target == null) return null;
    const actual = assignments.filter(a => a.frameworkId === fw.id)
      .reduce((sum, a) => sum + (a.hours || 0) + (a.specEdHours || 0), 0);
    return Math.round((actual - target) * 100) / 100;
  };

  const partialCoverage = summary.filter(fw => assignedActiveFwIds.has(fw.id) && (getGap(fw) ?? 0) < 0);
  const overCoverage    = summary.filter(fw => assignedActiveFwIds.has(fw.id) && (getGap(fw) ?? 0) > 0);

  const fwMatchesFilter = (fw) => {
    if (!filter) return true;
    if (fw.name.includes(filter)) return true;
    const psychNames = [
      ...assignments.filter(a => a.frameworkId === fw.id).map(a => employees.find(e => e.id === a.employeeId)?.displayName),
      ...specEdClasses.filter(s => s.frameworkId === fw.id).map(s => s.psychologistName),
    ].filter(Boolean);
    return psychNames.some(n => n.includes(filter));
  };

  const unassignedItems = summary.filter(fw => {
    const matchType = filterType === 'all' || fw.sector === filterType || (filterType === 'special_ed' && fw.type === 'special_ed');
    return !assignedActiveFwIds.has(fw.id) && fwMatchesFilter(fw) && matchType;
  }).sort((a, b) => a.name.localeCompare(b.name, 'he'));

  const grouped = SUBTYPE_ORDER.reduce((acc, sub) => {
    const items = summary.filter(fw => {
      const matchSub = sub === 'special_ed' ? fw.type === 'special_ed' : (fw.subType === sub && fw.type !== 'special_ed');
      if (sub === '') return false;
      const matchType = filterType === 'all' || fw.sector === filterType || (filterType === 'special_ed' && fw.type === 'special_ed');
      return matchSub && fwMatchesFilter(fw) && matchType && assignedActiveFwIds.has(fw.id);
    }).sort(sectorSort);
    const label = sub === 'יסודי' ? 'יסודי' : sub === 'חטיבה' ? 'חטיבות' : sub === 'תיכון' ? 'תיכונים' : sub === 'special_ed' ? 'חינוך מיוחד' : sub;
    if (items.length) acc[label] = items;
    return acc;
  }, {});

  const exportXlsx = () => {
    const rows = summary.map(fw => {
      const fwAsgns = assignments.filter(a => a.frameworkId === fw.id);
      const fwSpec  = specEdClasses.filter(s => s.frameworkId === fw.id);
      const target  = calcTargetHours(fw, fwSpec);
      const actual  = fwAsgns.reduce((sum, a) => sum + (a.hours || 0) + (a.specEdHours || 0), 0);
      const psychs  = fwAsgns.map(a => {
        const emp = employees.find(e => e.id === a.employeeId);
        return emp ? `${emp.displayName} (${(a.hours||0)+(a.specEdHours||0)} ש׳)` : '';
      }).filter(Boolean).join(', ');
      return {
        'שם מסגרת': fw.name,
        'מגזר': fw.sector || '',
        'סוג': fw.subType || fw.type || '',
        'תלמידים': fw.allocatedHours ?? '',
        'שעות יעד': target ?? '',
        'שעות בפועל': actual || '',
        'פער': target != null ? actual - target : '',
        'פסיכולוגים': psychs,
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'שיבוצי בתי ספר');
    XLSX.writeFile(wb, 'שיבוצי_בתי_ספר.xlsx');
  };

  if (loading) return <div className="p-6 text-gray-500">טוען...</div>;

  return (
    <div>
      <AlertsBanner page="schools" />
      {freeHoursAlerts.length > 0 && (
        <div className="mb-4 border border-orange-200 rounded overflow-hidden">
          <button
            className="w-full flex items-center justify-between bg-orange-50 px-3 py-2 text-sm font-semibold text-orange-800 hover:bg-orange-100"
            onClick={() => setAlertsOpen(o => !o)}
          >
            <span>⚠️ חריגה בשעות פנויות ({freeHoursAlerts.length})</span>
            <span>{alertsOpen ? '▲' : '▼'}</span>
          </button>
          {alertsOpen && (
            <div className="bg-white p-3 text-sm">
              <div className="flex flex-wrap gap-1">
                {freeHoursAlerts.map(e => (
                  <span key={e.id} className={`badge ${e.type === 'over' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-700'}`}>
                    {e.displayName} ({e.gap > 0 ? `+${e.gap}` : e.gap} ש׳)
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-800">שיבוצי בתי ספר</h1>
        <div className="flex gap-2 items-center">
          <select className="input" value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="all">הכל</option>
            <option value="ממלכתי">ממלכתי</option>
            <option value='ממ"ד'>ממ"ד</option>
            <option value='חמ"ד'>חמ"ד</option>
            <option value="special_ed">חינוך מיוחד</option>
          </select>
          <input className="input" placeholder="חיפוש..." value={filter} onChange={e => setFilter(e.target.value)} />
          <button className="btn-secondary" onClick={exportXlsx}>📊 ייצוא xlsx</button>
          <button
            className="btn-secondary text-xs py-1 border-amber-400 text-amber-700 hover:bg-amber-50"
            onClick={async () => {
              if (!confirm('לקדם את כל כיתות הח״מ שנה אחת קדימה?\nכיתות שסיימו (ו׳ ביסודי, ט׳ בחטיבה, יב׳ בתיכון) יימחקו.')) return;
              await advanceSpecEdYear();
              load();
            }}
          >
            📅 קידום שנה
          </button>
        </div>
      </div>

      {overCoverage.length > 0 && (
        <div className="mb-4 border border-orange-200 rounded overflow-hidden">
          <button className="w-full flex items-center justify-between bg-orange-50 px-3 py-2 text-sm font-semibold text-orange-800 hover:bg-orange-100"
            onClick={() => setOverOpen(o => !o)}>
            <span>🟠 חריגה מעל יעד ({overCoverage.length})</span>
            <span>{overOpen ? '▲' : '▼'}</span>
          </button>
          {overOpen && (
            <div className="bg-white p-3 text-sm flex flex-wrap gap-1">
              {overCoverage.sort((a,b) => a.name.localeCompare(b.name,'he')).map(fw => (
                <span key={fw.id} className="badge bg-orange-100 text-orange-800">{fw.name} (+{getGap(fw)} ש׳)</span>
              ))}
            </div>
          )}
        </div>
      )}

      {unassignedItems.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-bold text-red-600 mb-2 border-b border-red-200 pb-1">
            ⚠️ לא מאוישות <span className="font-normal text-red-400 mr-1">({unassignedItems.length})</span>
          </h2>
          <SchoolTable items={unassignedItems} assignments={assignments} employees={employees}
            specEdClasses={specEdClasses} editingAsgn={editingAsgn} setEditingAsgn={setEditingAsgn}
            editingSpec={editingSpec} setEditingSpec={setEditingSpec}
            saveAssignment={saveAssignment} deleteAssignment={deleteAssignment} addAssignment={addAssignment}
            saveSpec={saveSpec} addSpec={addSpec} deleteSpec={deleteSpec}
            setSummary={setSummary} editingTarget={editingTarget} setEditingTarget={setEditingTarget}
            saveTargetHours={saveTargetHours} rowBg="bg-red-50/40" />
        </div>
      )}

      {partialCoverage.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-bold text-amber-600 mb-2 border-b border-amber-200 pb-1">
            🟡 כיסוי חלקי <span className="font-normal text-amber-400 mr-1">({partialCoverage.length})</span>
          </h2>
          <SchoolTable items={partialCoverage.slice().sort((a, b) => getGap(a) - getGap(b))} assignments={assignments} employees={employees}
            specEdClasses={specEdClasses} editingAsgn={editingAsgn} setEditingAsgn={setEditingAsgn}
            editingSpec={editingSpec} setEditingSpec={setEditingSpec}
            saveAssignment={saveAssignment} deleteAssignment={deleteAssignment} addAssignment={addAssignment}
            saveSpec={saveSpec} addSpec={addSpec} deleteSpec={deleteSpec}
            setSummary={setSummary} editingTarget={editingTarget} setEditingTarget={setEditingTarget}
            saveTargetHours={saveTargetHours} rowBg="bg-amber-50" />
        </div>
      )}

      {Object.entries(grouped).map(([group, items]) => (
        <div key={group} className="mb-6">
          <h2 className="text-sm font-bold text-gray-600 mb-2 border-b pb-1">
            {group} <span className="font-normal text-gray-400 mr-1">({items.length})</span>
          </h2>
          <SchoolTable items={items} assignments={assignments} employees={employees}
            specEdClasses={specEdClasses} editingAsgn={editingAsgn} setEditingAsgn={setEditingAsgn}
            editingSpec={editingSpec} setEditingSpec={setEditingSpec}
            saveAssignment={saveAssignment} deleteAssignment={deleteAssignment} addAssignment={addAssignment}
            saveSpec={saveSpec} addSpec={addSpec} deleteSpec={deleteSpec}
            setSummary={setSummary} editingTarget={editingTarget} setEditingTarget={setEditingTarget}
            saveTargetHours={saveTargetHours} />
        </div>
      ))}
    </div>
  );
}

function SchoolTable({ items, assignments, employees, specEdClasses, editingAsgn, setEditingAsgn,
  editingSpec, setEditingSpec, saveAssignment, deleteAssignment, addAssignment, setSummary,
  saveSpec, addSpec, deleteSpec, editingTarget, setEditingTarget, saveTargetHours, rowBg = '' }) {
  return (
    <div className="bg-white rounded shadow overflow-x-auto">
      <table className="w-full text-sm min-w-[900px]">
        <thead>
          <tr>
            <th className="table-header">שם מסגרת</th>
            <th className="table-header">מגזר</th>
            <th className="table-header text-center">תלמידים</th>
            <th className="table-header text-center">שעות יעד</th>
            <th className="table-header text-center">שעות בפועל</th>
            <th className="table-header text-center">פער</th>
            <th className="table-header">כתות ח"מ</th>
            <th className="table-header">פסיכולוגים משובצים</th>
            <th className="table-header w-8"></th>
          </tr>
        </thead>
        <tbody>
          {items.map(fw => {
            const fwAsgns = assignments.filter(a => a.frameworkId === fw.id);
            const fwSpec = specEdClasses.filter(s => s.frameworkId === fw.id);
            const target = calcTargetHours(fw, fwSpec);
            const actual = fwAsgns.reduce((sum, a) => sum + (a.hours || 0) + (a.specEdHours || 0), 0);
            const gap = target != null ? Math.round((actual - target) * 100) / 100 : null;
            const gapColor = gap == null ? '' : gap === 0 ? 'text-green-600' : gap > 0 ? 'text-orange-500' : 'text-red-600';
            const rowHighlight = rowBg ||
              (gap != null && gap < 0 ? 'bg-amber-50' : gap != null && gap > 0 ? 'bg-orange-50' : '');
            return (
              <tr key={fw.id} className={`hover:bg-gray-50 align-top ${rowHighlight}`}>
                <td className="table-cell font-medium">
                  <EditableName fw={fw} setSummary={setSummary} />
                </td>
                <td className="table-cell">
                  <select
                    className={`badge border-0 cursor-pointer ${SECTOR_COLORS[fw.sector] || 'bg-gray-100'}`}
                    value={fw.sector || ''}
                    onChange={async e => {
                      await updateFramework(fw.id, { sector: e.target.value });
                      setSummary(await getAssignmentSummary());
                    }}
                  >
                    {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="table-cell text-center">
                  {editingTarget?.id === fw.id && editingTarget.field === 'allocatedHours' ? (
                    <input
                      autoFocus
                      type="number"
                      className="input text-xs py-0.5 w-16 text-center"
                      defaultValue={fw.allocatedHours ?? ''}
                      onBlur={async e => {
                        const val = parseInt(e.target.value) || null;
                        await updateFramework(fw.id, { allocatedHours: val, targetHours: null });
                        setSummary(await getAssignmentSummary());
                        setEditingTarget(null);
                      }}
                      onKeyDown={e => { if (e.key === 'Escape') setEditingTarget(null); }}
                    />
                  ) : (
                    <span
                      className="cursor-pointer hover:bg-blue-50 px-1 rounded"
                      onClick={() => setEditingTarget({ id: fw.id, field: 'allocatedHours' })}
                    >
                      {fw.allocatedHours ?? '—'}
                    </span>
                  )}
                </td>
                <td className="table-cell text-center">
                  {editingTarget?.id === fw.id && editingTarget.field !== 'allocatedHours' ? (
                    <input
                      autoFocus
                      type="number"
                      className="input text-xs py-0.5 w-16 text-center"
                      value={editingTarget.value}
                      onChange={e => setEditingTarget(p => ({ ...p, value: e.target.value }))}
                      onBlur={() => saveTargetHours(fw.id, editingTarget.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') saveTargetHours(fw.id, editingTarget.value);
                        if (e.key === 'Escape') setEditingTarget(null);
                      }}
                    />
                  ) : (
                    <span
                      className="cursor-pointer hover:text-blue-600"
                      title={fw.targetHours != null ? 'ערך ידני — לחץ לעריכה' : 'לחץ לעריכה'}
                      onClick={() => setEditingTarget({ id: fw.id, value: target ?? '' })}
                    >
                      {target != null
                        ? <>{target}{fw.targetHours != null && <span className="text-gray-400 text-xs mr-0.5">*</span>}</>
                        : <span className="text-gray-300">—</span>}
                    </span>
                  )}
                </td>
                <td className="table-cell text-center text-gray-600">{actual > 0 ? actual : '—'}</td>
                <td className={`table-cell text-center font-medium ${gapColor}`}>
                  {gap == null ? '—' : gap === 0 ? '✓' : gap > 0 ? `+${gap}` : gap}
                </td>
                <td className="table-cell">
                  {fwSpec.length === 0 ? (
                    <span className="text-gray-300 text-xs">—</span>
                  ) : (
                    <div className="space-y-1">
                      {fwSpec.map(s => editingSpec?.id === s.id ? (
                        <div key={s.id} className="flex flex-wrap gap-1 items-center bg-yellow-50 border border-yellow-200 rounded p-1">
                          <input className="input text-xs py-0.5 w-28" placeholder="כיתות" value={editingSpec.grades}
                            onChange={e => setEditingSpec(p => ({...p, grades: e.target.value}))} />
                          <select className="input text-xs py-0.5" value={editingSpec.classType}
                            onChange={e => setEditingSpec(p => ({...p, classType: e.target.value}))}>
                            <option>ל.ל</option>
                            <option>תקשורתית</option>
                            <option>ל.ל + תקשורתית</option>
                          </select>
                          <input className="input text-xs py-0.5 w-20" placeholder="פסיכולוג" value={editingSpec.psychologistName}
                            onChange={e => setEditingSpec(p => ({...p, psychologistName: e.target.value}))} />
                          <button className="text-green-600 text-xs" onClick={saveSpec}>✓</button>
                          <button className="text-gray-400 text-xs" onClick={() => { setEditingSpec(null); if (!s.grades) deleteSpec(s.id); }}>✕</button>
                        </div>
                      ) : (
                        <div key={s.id} className="flex items-center gap-1 group">
                          <span className="text-xs text-gray-700">
                            <span className="font-medium">{s.grades}</span>
                            {' '}<span className={`badge text-xs ${s.classType === 'תקשורתית' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}`}>{s.classType}</span>
                            {s.psychologistName && <span className="text-blue-600 mr-1"> {s.psychologistName}</span>}
                          </span>
                          <span className="opacity-0 group-hover:opacity-100 flex gap-0.5">
                            <button className="text-blue-300 hover:text-blue-600 text-xs" onClick={() => setEditingSpec({...s})}>✏️</button>
                            <button className="text-red-300 hover:text-red-600 text-xs" onClick={() => deleteSpec(s.id)}>✕</button>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  <button className="text-xs text-gray-300 hover:text-green-500 mt-0.5 block" onClick={() => addSpec(fw.id)}>+ כיתה</button>
                </td>
                <td className="table-cell">
                  <div className="flex flex-wrap gap-1 items-center">
                    {fwAsgns.map(a => (
                      editingAsgn?.id === a.id ? (
                        <div key={a.id} className="flex gap-1 items-center bg-yellow-50 border border-yellow-300 rounded p-1">
                          <select className="input text-xs py-0.5 w-24" value={editingAsgn.employeeId}
                            onChange={e => setEditingAsgn(p => ({...p, employeeId: e.target.value}))}>
                            <option value="0">בחר...</option>
                            {employees.map(e => <option key={e.id} value={e.id}>{e.displayName}</option>)}
                          </select>
                          <input type="number" className="input text-xs py-0.5 w-12" placeholder='בי"ס'
                            value={editingAsgn.hours} onChange={e => setEditingAsgn(p => ({...p, hours: e.target.value}))} />
                          <input type="number" className="input text-xs py-0.5 w-12" placeholder='ח"מ'
                            value={editingAsgn.specEdHours} onChange={e => setEditingAsgn(p => ({...p, specEdHours: e.target.value}))} />
                          <button className="btn-primary text-xs py-0.5" onClick={saveAssignment}>✓</button>
                          <button className="btn-secondary text-xs py-0.5" onClick={() => setEditingAsgn(null)}>✕</button>
                        </div>
                      ) : (
                        <span key={a.id} className="badge bg-blue-100 text-blue-800 cursor-pointer hover:bg-blue-200 flex items-center gap-1">
                          <span onClick={() => setEditingAsgn({ ...a })}>
                            {employees.find(e => e.id === a.employeeId)?.displayName || '?'}
                            {' '}({(a.hours||0)+(a.specEdHours||0)} ש׳)
                          </span>
                          <span className="text-blue-400 hover:text-blue-600" onClick={() => setEditingAsgn({ ...a })}>✏️</span>
                          <span className="text-blue-300 hover:text-red-500" onClick={() => deleteAssignment(a.id)}>✕</span>
                        </span>
                      )
                    ))}
                    <button className="text-xs text-gray-400 hover:text-green-600 border border-dashed border-gray-300 rounded px-1 py-0.5 hover:border-green-400"
                      onClick={() => addAssignment(fw.id)}>+ שיבוץ</button>
                  </div>
                </td>
                <td className="table-cell"></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function EditableName({ fw, setSummary }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(fw.name);

  const save = async () => {
    setEditing(false);
    if (val.trim() === fw.name) return;
    await updateFramework(fw.id, { name: val.trim() });
    setSummary(await getAssignmentSummary());
  };

  if (!editing) return (
    <span className="cursor-pointer hover:text-blue-600" onClick={() => setEditing(true)} title="לחץ לעריכה">
      {fw.name}
    </span>
  );
  return (
    <input
      autoFocus
      className="input py-0.5 text-sm w-full"
      value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={save}
      onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setEditing(false); setVal(fw.name); } }}
    />
  );
}
