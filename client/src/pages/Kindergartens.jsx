import { useEffect, useState } from 'react';
import { getKinder, getEmployees, createKinder, updateKinder, deleteKinder } from '../api';

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

  const grouped = employees.reduce((acc, emp) => {
    const rows = assignments.filter(a => a.employeeId === emp.id &&
      (!filter || a.gardenName.includes(filter) || emp.displayName.includes(filter))
    );
    if (rows.length) acc[emp.id] = { emp, rows };
    return acc;
  }, {});

  const saveEdit = async () => {
    if (!editRow) return;
    const updated = await updateKinder(editRow.id, editRow);
    setAssignments(prev => prev.map(a => a.id === updated.id ? updated : a));
    setEditRow(null);
  };

  const addRow = async () => {
    const created = await createKinder({ ...newRow, employeeId: +newRow.employeeId });
    setAssignments(prev => [...prev, created]);
    setShowAdd(false);
    setNewRow({ employeeId: '', gardenName: '', ageGroup: 'חובה', address: '', phone: '', teacher: '', teacherPhone: '', email: '' });
  };

  const removeRow = async (id, name) => {
    if (!confirm(`למחוק גן ${name}?`)) return;
    await deleteKinder(id);
    setAssignments(prev => prev.filter(a => a.id !== id));
  };

  const printPage = () => window.print();

  if (loading) return <div className="p-6 text-gray-500">טוען...</div>;

  const COLS = [
    { key: 'gardenName',   label: 'שם הגן',   width: 'min-w-[100px]' },
    { key: 'ageGroup',     label: 'גיל',       width: 'min-w-[70px]' },
    { key: 'address',      label: 'כתובת',     width: 'min-w-[160px]' },
    { key: 'phone',        label: 'טלפון בגן', width: 'min-w-[110px]' },
    { key: 'teacher',      label: 'גננת',      width: 'min-w-[120px]' },
    { key: 'teacherPhone', label: 'נייד גננת', width: 'min-w-[110px]' },
    { key: 'email',        label: 'מייל',      width: 'min-w-[160px]' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-800">שיבוצי גנים</h1>
        <div className="flex gap-2 items-center">
          <input className="input" placeholder="חיפוש גן או פסיכולוג..." value={filter} onChange={e => setFilter(e.target.value)} />
          <button className="btn-secondary" onClick={printPage}>🖨️ הדפסה</button>
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
        <div key={emp.id} className="mb-6">
          <h2 className="text-base font-bold text-blue-800 bg-blue-50 px-3 py-2 rounded-t border border-blue-200">
            {emp.displayName}
            <span className="text-sm font-normal text-blue-600 mr-2">({rows.length} גנים)</span>
          </h2>
          <div className="bg-white border border-blue-100 rounded-b shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {COLS.map(c => <th key={c.key} className={`table-header ${c.width}`}>{c.label}</th>)}
                  <th className="table-header"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    {editRow?.id === row.id ? (
                      <>
                        {COLS.map(col => (
                          <td key={col.key} className="table-cell">
                            <input className="input w-full" value={editRow[col.key] || ''} onChange={e => setEditRow(p => ({...p, [col.key]: e.target.value}))} />
                          </td>
                        ))}
                        <td className="table-cell">
                          <button className="btn-primary mr-1 text-xs" onClick={saveEdit}>שמור</button>
                          <button className="btn-secondary text-xs" onClick={() => setEditRow(null)}>ביטול</button>
                        </td>
                      </>
                    ) : (
                      <>
                        {COLS.map(col => (
                          <td key={col.key} className="table-cell">{row[col.key] || '—'}</td>
                        ))}
                        <td className="table-cell">
                          <button className="text-blue-500 hover:text-blue-700 text-xs ml-2" onClick={() => setEditRow({...row})}>עריכה</button>
                          <button className="text-red-400 hover:text-red-600 text-xs" onClick={() => removeRow(row.id, row.gardenName)}>מחק</button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {Object.keys(grouped).length === 0 && (
        <div className="text-center text-gray-400 py-12">לא נמצאו גנים</div>
      )}
    </div>
  );
}
