import { useEffect, useState } from 'react';
import { getAssignmentSummary, getEmployees, getAssignments, updateAssignment, getFrameworks, getSpecEdClasses, createSpecEdClass, updateSpecEdClass, deleteSpecEdClass, advanceSpecEdYear } from '../api';
import axios from 'axios';
import AlertsBanner from '../components/AlertsBanner';

const SECTOR_COLORS = {
  'ממלכתי':       'bg-blue-100 text-blue-800',
  'ממ"ד':         'bg-green-100 text-green-800',
  'חמ"ד':         'bg-yellow-100 text-yellow-800',
  'חינוך מיוחד': 'bg-purple-100 text-purple-800',
  'חרדי':         'bg-gray-100 text-gray-700',
};

const SUBTYPE_ORDER = ['יסודי', 'חטיבה', 'תיכון', 'special_ed', ''];

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

  const load = async () => {
    const [sum, emps, asgns, spec] = await Promise.all([
      getAssignmentSummary(), getEmployees(true), getAssignments(), getSpecEdClasses()
    ]);
    setSummary(sum);
    setEmployees(emps);
    setAssignments(asgns);
    setSpecEdClasses(spec);
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

  const unassignedItems = summary.filter(fw => {
    const matchFilter = !filter || fw.name.includes(filter);
    const matchType = filterType === 'all' || fw.sector === filterType || (filterType === 'special_ed' && fw.type === 'special_ed');
    return !assignedActiveFwIds.has(fw.id) && matchFilter && matchType;
  }).sort((a, b) => a.name.localeCompare(b.name, 'he'));

  const grouped = SUBTYPE_ORDER.reduce((acc, sub) => {
    const items = summary.filter(fw => {
      const matchSub = sub === 'special_ed' ? fw.type === 'special_ed' : (fw.subType === sub && fw.type !== 'special_ed');
      if (sub === '') return false;
      const matchFilter = !filter || fw.name.includes(filter);
      const matchType = filterType === 'all' || fw.sector === filterType || (filterType === 'special_ed' && fw.type === 'special_ed');
      return matchSub && matchFilter && matchType && assignedActiveFwIds.has(fw.id);
    }).sort((a, b) => a.name.localeCompare(b.name, 'he'));
    const label = sub === 'יסודי' ? 'יסודי' : sub === 'חטיבה' ? 'חטיבות' : sub === 'תיכון' ? 'תיכונים' : sub === 'special_ed' ? 'חינוך מיוחד' : sub;
    if (items.length) acc[label] = items;
    return acc;
  }, {});

  if (loading) return <div className="p-6 text-gray-500">טוען...</div>;

  return (
    <div>
      <AlertsBanner />
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

      {unassignedItems.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-bold text-red-600 mb-2 border-b border-red-200 pb-1">
            ⚠️ לא מאוישות <span className="font-normal text-red-400 mr-1">({unassignedItems.length})</span>
          </h2>
          <SchoolTable items={unassignedItems} assignments={assignments} employees={employees}
            specEdClasses={specEdClasses} editingAsgn={editingAsgn} setEditingAsgn={setEditingAsgn}
            editingSpec={editingSpec} setEditingSpec={setEditingSpec}
            saveAssignment={saveAssignment} deleteAssignment={deleteAssignment} addAssignment={addAssignment}
            saveSpec={saveSpec} addSpec={addSpec} deleteSpec={deleteSpec} rowBg="bg-red-50/40" />
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
            saveSpec={saveSpec} addSpec={addSpec} deleteSpec={deleteSpec} />
        </div>
      ))}
    </div>
  );
}

function SchoolTable({ items, assignments, employees, specEdClasses, editingAsgn, setEditingAsgn,
  editingSpec, setEditingSpec, saveAssignment, deleteAssignment, addAssignment,
  saveSpec, addSpec, deleteSpec, rowBg = '' }) {
  return (
    <div className="bg-white rounded shadow overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="table-header">שם מסגרת</th>
            <th className="table-header">מגזר</th>
            <th className="table-header text-center">מספר תלמידים</th>
            <th className="table-header">כתות ח"מ</th>
            <th className="table-header">פסיכולוגים משובצים</th>
            <th className="table-header w-8"></th>
          </tr>
        </thead>
        <tbody>
          {items.map(fw => {
            const fwAsgns = assignments.filter(a => a.frameworkId === fw.id);
            const fwSpec = specEdClasses.filter(s => s.frameworkId === fw.id);
            return (
              <tr key={fw.id} className={`hover:bg-gray-50 align-top ${rowBg}`}>
                <td className="table-cell font-medium">{fw.name}</td>
                <td className="table-cell">
                  <span className={`badge ${SECTOR_COLORS[fw.sector] || 'bg-gray-100'}`}>{fw.sector}</span>
                </td>
                <td className="table-cell text-center text-gray-500">{fw.allocatedHours ?? '—'}</td>
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
                          <input type="number" className="input text-xs py-0.5 w-12" placeholder="גנים"
                            value={editingAsgn.kinderHours} onChange={e => setEditingAsgn(p => ({...p, kinderHours: e.target.value}))} />
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
