import { useEffect, useState } from 'react';
import { getAssignmentSummary, getEmployees, getAssignments, updateAssignment, getFrameworks } from '../api';
import axios from 'axios';

const SECTOR_COLORS = {
  'ממלכתי':       'bg-blue-100 text-blue-800',
  'ממ"ד':         'bg-green-100 text-green-800',
  'חמ"ד':         'bg-yellow-100 text-yellow-800',
  'חינוך מיוחד': 'bg-purple-100 text-purple-800',
  'חרדי':         'bg-gray-100 text-gray-700',
};

const SUBTYPE_ORDER = ['יסודי', 'חטיבה', 'תיכון', 'special_ed', ''];

export default function Schools() {
  const [summary, setSummary]       = useState([]);
  const [employees, setEmployees]   = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState('');
  const [filterType, setFilterType] = useState('all');
  const [editingAsgn, setEditingAsgn] = useState(null); // { id, employeeId, hours, specEdHours }

  const load = async () => {
    const [sum, emps, asgns] = await Promise.all([
      getAssignmentSummary(), getEmployees(true), getAssignments()
    ]);
    setSummary(sum);
    setEmployees(emps);
    setAssignments(asgns);
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
    const sum = await getAssignmentSummary();
    setSummary(sum);
  };

  const deleteAssignment = async (id) => {
    if (!confirm('למחוק שיבוץ זה?')) return;
    await axios.delete(`/api/assignments/${id}`);
    setAssignments(prev => prev.filter(a => a.id !== id));
    const sum = await getAssignmentSummary();
    setSummary(sum);
  };

  const addAssignment = async (frameworkId) => {
    const res = await axios.post('/api/assignments', { frameworkId, employeeId: 0, hours: 0, specEdHours: 0, kinderHours: 0 });
    const newA = res.data;
    setAssignments(prev => [...prev, newA]);
    setEditingAsgn({ ...newA });
  };

  const getStatusBg = (fw) => {
    if (!fw.allocatedHours) return '';
    const ratio = fw.totalAssigned / fw.allocatedHours;
    if (ratio > 1.05) return 'bg-red-50';
    if (ratio >= 0.9) return 'bg-green-50';
    if (fw.totalAssigned === 0) return 'bg-gray-50';
    return 'bg-yellow-50';
  };

  const grouped = SUBTYPE_ORDER.reduce((acc, sub) => {
    const items = summary.filter(fw => {
      const matchSub = sub === 'special_ed' ? fw.type === 'special_ed' : (fw.subType === sub && fw.type !== 'special_ed');
      if (sub === '') return false;
      const matchFilter = !filter || fw.name.includes(filter);
      const matchType = filterType === 'all' || fw.sector === filterType || (filterType === 'special_ed' && fw.type === 'special_ed');
      return matchSub && matchFilter && matchType;
    }).sort((a, b) => a.name.localeCompare(b.name, 'he'));
    const label = sub === 'יסודי' ? 'יסודי' : sub === 'חטיבה' ? 'חטיבות' : sub === 'תיכון' ? 'תיכונים' : sub === 'special_ed' ? 'חינוך מיוחד' : sub;
    if (items.length) acc[label] = items;
    return acc;
  }, {});

  if (loading) return <div className="p-6 text-gray-500">טוען...</div>;

  return (
    <div>
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
        </div>
      </div>

      <div className="mb-3 flex gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100 inline-block"></span>מאויש</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-100 inline-block"></span>חלקי</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 inline-block"></span>חריגה</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-100 inline-block"></span>לא אויש</span>
      </div>

      {Object.entries(grouped).map(([group, items]) => (
        <div key={group} className="mb-6">
          <h2 className="text-sm font-bold text-gray-600 mb-2 border-b pb-1">
            {group} <span className="font-normal text-gray-400 mr-1">({items.length})</span>
          </h2>
          <div className="bg-white rounded shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="table-header">שם מסגרת</th>
                  <th className="table-header">מגזר</th>
                  <th className="table-header text-center">שעות מוקצות</th>
                  <th className="table-header text-center">שובץ</th>
                  <th className="table-header">פסיכולוגים משובצים</th>
                  <th className="table-header w-8"></th>
                </tr>
              </thead>
              <tbody>
                {items.map(fw => {
                  const fwAsgns = assignments.filter(a => a.frameworkId === fw.id);
                  return (
                    <tr key={fw.id} className={`${getStatusBg(fw)}`}>
                      <td className="table-cell font-medium">{fw.name}</td>
                      <td className="table-cell">
                        <span className={`badge ${SECTOR_COLORS[fw.sector] || 'bg-gray-100'}`}>{fw.sector}</span>
                      </td>
                      <td className="table-cell text-center text-gray-500">{fw.allocatedHours ?? '—'}</td>
                      <td className="table-cell text-center font-semibold">
                        {fw.totalAssigned || 0}
                        {fw.allocatedHours ? <span className="text-xs text-gray-400 mr-1">/ {fw.allocatedHours}</span> : ''}
                      </td>
                      <td className="table-cell">
                        <div className="flex flex-wrap gap-1 items-center">
                          {fwAsgns.map(a => (
                            editingAsgn?.id === a.id ? (
                              <div key={a.id} className="flex gap-1 items-center bg-yellow-50 border border-yellow-300 rounded p-1">
                                <select className="input text-xs py-0.5 w-24"
                                  value={editingAsgn.employeeId}
                                  onChange={e => setEditingAsgn(p => ({...p, employeeId: e.target.value}))}>
                                  <option value="0">בחר...</option>
                                  {employees.map(e => <option key={e.id} value={e.id}>{e.displayName}</option>)}
                                </select>
                                <input type="number" className="input text-xs py-0.5 w-12" placeholder="בי&quot;ס"
                                  value={editingAsgn.hours} onChange={e => setEditingAsgn(p => ({...p, hours: e.target.value}))} />
                                <input type="number" className="input text-xs py-0.5 w-12" placeholder="ח&quot;מ"
                                  value={editingAsgn.specEdHours} onChange={e => setEditingAsgn(p => ({...p, specEdHours: e.target.value}))} />
                                <input type="number" className="input text-xs py-0.5 w-12" placeholder="גנים"
                                  value={editingAsgn.kinderHours} onChange={e => setEditingAsgn(p => ({...p, kinderHours: e.target.value}))} />
                                <button className="btn-primary text-xs py-0.5" onClick={saveAssignment}>✓</button>
                                <button className="btn-secondary text-xs py-0.5" onClick={() => setEditingAsgn(null)}>✕</button>
                              </div>
                            ) : (
                              <span key={a.id} className="badge bg-blue-100 text-blue-800 cursor-pointer hover:bg-blue-200 flex items-center gap-1"
                                title="לחץ לעריכה">
                                <span onClick={() => setEditingAsgn({ ...a })}>
                                  {employees.find(e => e.id === a.employeeId)?.displayName || '?'}
                                  {' '}({(a.hours||0)+(a.specEdHours||0)} ש׳)
                                </span>
                                <span className="text-blue-400 hover:text-red-500 mr-1"
                                  onClick={() => setEditingAsgn({ ...a })}>✏️</span>
                                <span className="text-blue-300 hover:text-red-500"
                                  onClick={() => deleteAssignment(a.id)}>✕</span>
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
        </div>
      ))}
    </div>
  );
}
