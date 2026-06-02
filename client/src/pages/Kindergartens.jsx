import { useEffect, useState } from 'react';
import { getKinder, getEmployees, createKinder, updateKinder, deleteKinder } from '../api';

const COLS = [
  { key: 'gardenName',   label: 'שם הגן',    width: 'min-w-[120px]' },
  { key: 'ageGroup',     label: 'גיל',        width: 'min-w-[80px]' },
  { key: 'address',      label: 'כתובת',      width: 'min-w-[160px]' },
  { key: 'phone',        label: 'טלפון בגן',  width: 'min-w-[110px]' },
  { key: 'teacher',      label: 'גננת',       width: 'min-w-[130px]' },
  { key: 'teacherPhone', label: 'נייד גננת',  width: 'min-w-[110px]' },
  { key: 'email',        label: 'מייל',       width: 'min-w-[170px]' },
];

export default function Kindergartens() {
  const [assignments, setAssignments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [editRow, setEditRow] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newRow, setNewRow] = useState({ employeeId: '', gardenName: '', ageGroup: 'חובה', address: '', phone: '', teacher: '', teacherPhone: '', email: '' });

  const load = async () => {
    const [asgns, emps] = await Promise.all([getKinder(), getEmployees()]);
    setAssignments(asgns);
    setEmployees(emps);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // All assignments including ungrouped (no matching employee)
  const filtered = assignments.filter(a =>
    !filter || a.gardenName?.includes(filter) || a.employeeName?.includes(filter)
  );

  const grouped = employees.reduce((acc, emp) => {
    const rows = filtered.filter(a => a.employeeId === emp.id);
    if (rows.length) acc[emp.id] = { emp, rows };
    return acc;
  }, {});

  const unassigned = filtered.filter(a => !employees.find(e => e.id === a.employeeId));

  const saveEdit = async () => {
    if (!editRow) return;
    const updated = await updateKinder(editRow.id, {
      ...editRow,
      employeeId: +editRow.employeeId,
    });
    setAssignments(prev => prev.map(a => a.id === updated.id ? updated : a));
    setEditRow(null);
  };

  const addRow = async () => {
    if (!newRow.gardenName || !newRow.employeeId) return;
    const created = await createKinder({ ...newRow, employeeId: +newRow.employeeId });
    setAssignments(prev => [...prev, created]);
    setShowAdd(false);
    setNewRow({ employeeId: '', gardenName: '', ageGroup: 'חובה', address: '', phone: '', teacher: '', teacherPhone: '', email: '' });
  };

  const removeRow = async (id, name) => {
    if (!confirm(`למחוק גן "${name}"?`)) return;
    await deleteKinder(id);
    setAssignments(prev => prev.filter(a => a.id !== id));
  };

  if (loading) return <div className="p-6 text-gray-500">טוען...</div>;

  const totalGardens = assignments.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">שיבוצי גנים</h1>
          <p className="text-sm text-gray-500">{totalGardens} גנים | {Object.keys(grouped).length} פסיכולוגים</p>
        </div>
        <div className="flex gap-2 items-center">
          <input className="input" placeholder="חיפוש גן או פסיכולוג..." value={filter} onChange={e => setFilter(e.target.value)} />
          <button className="btn-secondary" onClick={() => window.print()}>🖨️ הדפסה</button>
          <button className="btn-primary" onClick={() => setShowAdd(true)}>+ גן חדש</button>
        </div>
      </div>

      {showAdd && (
        <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4">
          <h3 className="font-semibold mb-3">הוספת גן</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">פסיכולוג</label>
              <select className="input w-full" value={newRow.employeeId} onChange={e => setNewRow(p => ({...p, employeeId: e.target.value}))}>
                <option value="">בחר...</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.displayName}</option>)}
              </select>
            </div>
            {COLS.map(col => (
              <div key={col.key}>
                <label className="block text-xs text-gray-600 mb-1">{col.label}</label>
                <input className="input w-full" value={newRow[col.key]} onChange={e => setNewRow(p => ({...p, [col.key]: e.target.value}))} />
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <button className="btn-primary" onClick={addRow}>שמור</button>
            <button className="btn-secondary" onClick={() => setShowAdd(false)}>ביטול</button>
          </div>
        </div>
      )}

      {Object.values(grouped).map(({ emp, rows }) => (
        <div key={emp.id} className="mb-5">
          <h2 className="text-base font-bold text-blue-800 bg-blue-50 px-3 py-2 rounded-t border border-blue-200">
            {emp.displayName}
            <span className="text-sm font-normal text-blue-600 mr-2">({rows.length} גנים)</span>
          </h2>
          <KinderTable rows={rows} employees={employees} editRow={editRow} setEditRow={setEditRow} saveEdit={saveEdit} removeRow={removeRow} />
        </div>
      ))}

      {unassigned.length > 0 && (
        <div className="mb-5">
          <h2 className="text-base font-bold text-gray-600 bg-gray-50 px-3 py-2 rounded-t border border-gray-200">
            לא משובצים
            <span className="text-sm font-normal text-gray-400 mr-2">({unassigned.length} גנים)</span>
          </h2>
          <KinderTable rows={unassigned} employees={employees} editRow={editRow} setEditRow={setEditRow} saveEdit={saveEdit} removeRow={removeRow} />
        </div>
      )}
    </div>
  );
}

function KinderTable({ rows, employees, editRow, setEditRow, saveEdit, removeRow }) {
  return (
    <div className="bg-white border border-blue-100 rounded-b shadow-sm overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="table-header min-w-[120px]">פסיכולוג</th>
            {COLS.map(c => <th key={c.key} className={`table-header ${c.width}`}>{c.label}</th>)}
            <th className="table-header w-20"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.id} className={`hover:bg-gray-50 ${editRow?.id === row.id ? 'bg-yellow-50' : ''}`}>
              {editRow?.id === row.id ? (
                <>
                  <td className="table-cell">
                    <select className="input w-full text-xs" value={editRow.employeeId} onChange={e => setEditRow(p => ({...p, employeeId: +e.target.value}))}>
                      {employees.map(e => <option key={e.id} value={e.id}>{e.displayName}</option>)}
                    </select>
                  </td>
                  {COLS.map(col => (
                    <td key={col.key} className="table-cell">
                      <input className="input w-full text-xs" value={editRow[col.key] || ''} onChange={e => setEditRow(p => ({...p, [col.key]: e.target.value}))} />
                    </td>
                  ))}
                  <td className="table-cell">
                    <button className="btn-primary text-xs ml-1" onClick={saveEdit}>✓</button>
                    <button className="btn-secondary text-xs" onClick={() => setEditRow(null)}>✕</button>
                  </td>
                </>
              ) : (
                <>
                  <td className="table-cell font-medium text-blue-700">{row.employeeName || '—'}</td>
                  {COLS.map(col => (
                    <td key={col.key} className="table-cell text-xs">{row[col.key] || '—'}</td>
                  ))}
                  <td className="table-cell">
                    <button className="text-blue-500 hover:text-blue-700 text-xs ml-2 px-1 py-0.5 rounded hover:bg-blue-50" onClick={() => setEditRow({...row})}>✏️</button>
                    <button className="text-red-400 hover:text-red-600 text-xs px-1 py-0.5 rounded hover:bg-red-50" onClick={() => removeRow(row.id, row.gardenName)}>🗑</button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
