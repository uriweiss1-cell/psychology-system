import { useEffect, useState, useCallback } from 'react';
import { getEmployees, updateEmployee, getAssignments, updateAssignment, getFrameworks, deleteEmployee } from '../api';
import AlertsBanner from '../components/AlertsBanner';

const HOURS_FIELDS = [
  { key: 'meetingHours',       label: 'ישיבות' },
  { key: 'supReceivedHours',   label: 'הדרכה - מקבל' },
  { key: 'supGivenHours',      label: 'הדרכה - נותן' },
  { key: 'therapyHours',       label: 'טיפול' },
  { key: 'roleHours',          label: 'תפקיד' },
];

function FreeHoursBadge({ freeHours }) {
  if (Math.abs(freeHours) < 0.1) return <span className="badge bg-green-100 text-green-800">0</span>;
  if (freeHours > 0) return <span className="badge bg-blue-100 text-blue-800">+{freeHours}</span>;
  return <span className="badge bg-red-100 text-red-800">{freeHours}</span>;
}

function EditableCell({ value, onSave, type = 'number' }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);

  useEffect(() => { setVal(value); }, [value]);

  if (!editing) {
    return (
      <span
        className="cursor-pointer hover:bg-blue-50 px-1 rounded min-w-[2rem] inline-block text-center"
        onClick={() => setEditing(true)}
        title="לחץ לעריכה"
      >
        {(val !== undefined && val !== null && val !== '') ? val : '—'}
      </span>
    );
  }
  return (
    <input
      autoFocus
      type={type}
      step="0.5"
      className="input w-16 text-center"
      value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={() => { setEditing(false); onSave(type === 'number' ? (parseFloat(val) || 0) : val); }}
      onKeyDown={e => {
        if (e.key === 'Enter') { setEditing(false); onSave(type === 'number' ? (parseFloat(val) || 0) : val); }
        if (e.key === 'Escape') { setEditing(false); setVal(value); }
      }}
    />
  );
}

export default function WorkPlan() {
  const [employees, setEmployees] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [frameworks, setFrameworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const load = useCallback(async () => {
    const [emps, asgns, fws] = await Promise.all([getEmployees(true), getAssignments(), getFrameworks()]);
    setEmployees(emps);
    setAssignments(asgns);
    setFrameworks(fws);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveEmpField = async (id, field, value) => {
    const updated = await updateEmployee(id, { [field]: value });
    setEmployees(prev => prev.map(e => e.id === id ? { ...e, ...updated } : e));
  };

  const saveAsgn = async (empId, field, value) => {
    const asgn = assignments.find(a => a.employeeId === empId && a.frameworkId === 0);
    if (!asgn) return;
    const updated = await updateAssignment(asgn.id, { [field]: value });
    setAssignments(prev => prev.map(a => a.id === asgn.id ? updated : a));
    const emps = await getEmployees(true);
    setEmployees(emps);
  };

  const removeEmployee = async (id, name) => {
    if (!confirm(`למחוק את ${name}?`)) return;
    await deleteEmployee(id);
    setEmployees(prev => prev.filter(e => e.id !== id));
  };

  const filtered = employees.filter(e =>
    !filter || e.displayName.includes(filter) || e.firstName?.includes(filter) || e.lastName?.includes(filter)
  ).sort((a, b) => (a.displayName || '').localeCompare(b.displayName || '', 'he'));

  if (loading) return <div className="p-6 text-gray-500">טוען...</div>;

  const getAsgn = (empId) => assignments.find(a => a.employeeId === empId && a.frameworkId === 0) || {};
  const getAllFwNames = (empId) => {
    const names = assignments
      .filter(a => a.employeeId === empId && a.frameworkId > 0)
      .map(a => frameworks.find(f => f.id === a.frameworkId)?.name)
      .filter(Boolean);
    return names.length ? names.join(' + ') : '—';
  };

  const overBudget = employees.filter(e => e.freeHours < -0.1);

  return (
    <div>
      <AlertsBanner />
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-800">תוכנית עבודה</h1>
        <div className="flex gap-2 items-center">
          {overBudget.length > 0 && (
            <span className="badge bg-red-100 text-red-800">
              ⚠️ {overBudget.length} עובדים בחריגה
            </span>
          )}
          <input
            className="input"
            placeholder="חיפוש עובד..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
        </div>
      </div>

      <div className="overflow-x-auto bg-white rounded shadow">
        <table className="w-full text-sm" style={{ minWidth: '1100px' }}>
          <thead>
            <tr className="text-right">
              <th className="table-header sticky right-0 bg-gray-50 z-10 min-w-[100px]">פסיכולוג</th>
              <th className="table-header text-center">ש׳ משרה</th>
              <th className="table-header text-center bg-blue-50">ישיבות</th>
              <th className="table-header text-center bg-blue-50">הדרכה<br/>מקבל</th>
              <th className="table-header text-center bg-blue-50">הדרכה<br/>נותן</th>
              <th className="table-header text-center bg-blue-50">טיפול</th>
              <th className="table-header text-center bg-blue-50">תפקיד</th>
              <th className="table-header text-center bg-blue-100">סה"כ פנימי</th>
              <th className="table-header text-center bg-green-50">בי"ס</th>
              <th className="table-header text-center bg-green-50">ח"מ</th>
              <th className="table-header text-center bg-green-50">גנים</th>
              <th className="table-header text-center bg-green-100">סה"כ מסגרות</th>
              <th className="table-header text-center">שם בי"ס/מסגרת</th>
              <th className="table-header text-center">שעות פנויות</th>
              <th className="table-header"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(emp => {
              const asgn = getAsgn(emp.id);
              const rowBg = emp.balance < -0.1 ? 'bg-red-50' : '';
              return (
                <tr key={emp.id} className={`hover:bg-gray-50 ${rowBg}`}>
                  <td className="table-cell sticky right-0 bg-white font-medium">
                    {emp.displayName}
                  </td>
                  <td className="table-cell text-center font-semibold">{emp.fteHours}</td>
                  {HOURS_FIELDS.map(f => (
                    <td key={f.key} className="table-cell text-center bg-blue-50/30">
                      <EditableCell value={emp[f.key]} onSave={v => saveEmpField(emp.id, f.key, v)} />
                    </td>
                  ))}
                  <td className="table-cell text-center bg-blue-50 font-semibold">{emp.totalInternal}</td>
                  <td className="table-cell text-center bg-green-50/40">
                    <EditableCell value={asgn.hours ?? 0} onSave={v => saveAsgn(emp.id, 'hours', v)} />
                  </td>
                  <td className="table-cell text-center bg-green-50/40">
                    <EditableCell value={asgn.specEdHours ?? 0} onSave={v => saveAsgn(emp.id, 'specEdHours', v)} />
                  </td>
                  <td className="table-cell text-center bg-green-50/40">
                    <EditableCell value={asgn.kinderHours ?? 0} onSave={v => saveAsgn(emp.id, 'kinderHours', v)} />
                  </td>
                  <td className="table-cell text-center bg-green-50 font-semibold">{emp.totalFrameworks}</td>
                  <td className="table-cell text-center text-xs text-gray-500">{getAllFwNames(emp.id)}</td>
                  <td className="table-cell text-center"><FreeHoursBadge freeHours={emp.freeHours} /></td>
                  <td className="table-cell">
                    <button className="text-red-400 hover:text-red-600 text-xs" onClick={() => removeEmployee(emp.id, emp.displayName)}>מחק</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 mt-2">לחץ פעמיים על תא כדי לערוך</p>
    </div>
  );
}
