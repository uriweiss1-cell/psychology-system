import { useEffect, useState } from 'react';
import { getEmployees, updateEmployee, createEmployee, deleteEmployee } from '../api';

export default function Standards() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [editing, setEditing] = useState({});

  const load = async () => {
    const emps = await getEmployees();
    setEmployees(emps);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const setFieldEdit = (id, field, value) => {
    setEditing(prev => ({ ...prev, [`${id}_${field}`]: value }));
  };

  const saveField = async (id, field) => {
    const key = `${id}_${field}`;
    const value = editing[key];
    if (value === undefined) return;
    const updated = await updateEmployee(id, { [field]: field === 'ftePercent' ? parseFloat(value) : value });
    setEmployees(prev => prev.map(e => e.id === id ? { ...e, ...updated } : e));
    setEditing(prev => { const n = {...prev}; delete n[key]; return n; });
  };

  const getEditVal = (emp, field) => {
    const key = `${emp.id}_${field}`;
    return editing[key] !== undefined ? editing[key] : emp[field];
  };

  const filtered = employees.filter(e =>
    !filter || e.displayName.includes(filter) || e.firstName?.includes(filter) || e.lastName?.includes(filter)
  );

  const totalFTE = employees.reduce((s, e) => s + e.ftePercent, 0);

  if (loading) return <div className="p-6 text-gray-500">טוען...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">תקנים</h1>
          <p className="text-sm text-gray-500">
            סה"כ {employees.length} עובדים | {totalFTE.toFixed(2)} משרות | {(totalFTE * 40).toFixed(1)} שעות שבועיות
          </p>
        </div>
        <input className="input" placeholder="חיפוש..." value={filter} onChange={e => setFilter(e.target.value)} />
      </div>

      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="table-header">שם תצוגה</th>
              <th className="table-header">שם פרטי</th>
              <th className="table-header">שם משפחה</th>
              <th className="table-header text-center">אחוז משרה</th>
              <th className="table-header text-center">שעות שבועיות</th>
              <th className="table-header text-center">סוג</th>
              <th className="table-header">הערות</th>
              <th className="table-header text-center">מאזן שעות</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(emp => (
              <tr key={emp.id} className="hover:bg-gray-50">
                <td className="table-cell font-medium">
                  <EditField id={emp.id} field="displayName" value={getEditVal(emp, 'displayName')} type="text"
                    onChange={v => setFieldEdit(emp.id, 'displayName', v)}
                    onSave={() => saveField(emp.id, 'displayName')} />
                </td>
                <td className="table-cell">
                  <EditField id={emp.id} field="firstName" value={getEditVal(emp, 'firstName')} type="text"
                    onChange={v => setFieldEdit(emp.id, 'firstName', v)}
                    onSave={() => saveField(emp.id, 'firstName')} />
                </td>
                <td className="table-cell">
                  <EditField id={emp.id} field="lastName" value={getEditVal(emp, 'lastName')} type="text"
                    onChange={v => setFieldEdit(emp.id, 'lastName', v)}
                    onSave={() => saveField(emp.id, 'lastName')} />
                </td>
                <td className="table-cell text-center">
                  <EditField id={emp.id} field="ftePercent" value={getEditVal(emp, 'ftePercent')} type="number"
                    onChange={v => setFieldEdit(emp.id, 'ftePercent', v)}
                    onSave={() => saveField(emp.id, 'ftePercent')} />
                </td>
                <td className="table-cell text-center font-semibold">
                  {(emp.ftePercent * 40).toFixed(1)}
                </td>
                <td className="table-cell text-center">
                  <select
                    className="input text-xs py-0.5"
                    value={emp.type}
                    onChange={async e => {
                      const updated = await updateEmployee(emp.id, { type: e.target.value });
                      setEmployees(prev => prev.map(x => x.id === emp.id ? {...x, ...updated} : x));
                    }}
                  >
                    <option value="expert">מומחה/ית</option>
                    <option value="trainee">מתמחה</option>
                  </select>
                </td>
                <td className="table-cell">
                  <EditField id={emp.id} field="notes" value={getEditVal(emp, 'notes')} type="text"
                    onChange={v => setFieldEdit(emp.id, 'notes', v)}
                    onSave={() => saveField(emp.id, 'notes')} />
                </td>
                <td className="table-cell text-center">
                  {emp.balance < -0.1
                    ? <span className="badge bg-red-100 text-red-700">{emp.balance} חריגה</span>
                    : emp.balance > 0.1
                    ? <span className="badge bg-yellow-100 text-yellow-700">+{emp.balance} פנוי</span>
                    : <span className="badge bg-green-100 text-green-700">מאוזן</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EditField({ id, field, value, type, onChange, onSave }) {
  return (
    <input
      type={type}
      step={type === 'number' ? '0.01' : undefined}
      className="input w-full text-sm py-0.5"
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      onBlur={onSave}
      onKeyDown={e => e.key === 'Enter' && onSave()}
    />
  );
}
