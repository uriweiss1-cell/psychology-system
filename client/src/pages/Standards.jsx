import { useEffect, useState } from 'react';
import { getEmployees, updateEmployee, createEmployee, deleteEmployee } from '../api';
import AlertsBanner from '../components/AlertsBanner';
import ImportModal from '../components/ImportModal';

const STATUS_LABELS = { active: 'פעיל', inactive: 'לא פעיל', maternity: 'חל"ד' };
const STATUS_COLORS = { active: 'bg-green-100 text-green-800', inactive: 'bg-red-100 text-red-700', maternity: 'bg-blue-100 text-blue-700' };

export default function Standards() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [editing, setEditing] = useState({});
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [newEmp, setNewEmp] = useState({ displayName: '', firstName: '', lastName: '', ftePercent: 1.0, type: 'expert' });

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
    const val = field === 'ftePercent' ? parseFloat(value) : value;
    const updated = await updateEmployee(id, { [field]: val });
    setEmployees(prev => prev.map(e => e.id === id ? { ...e, ...updated } : e));
    setEditing(prev => { const n = {...prev}; delete n[key]; return n; });
  };

  const getEditVal = (emp, field) => {
    const key = `${emp.id}_${field}`;
    return editing[key] !== undefined ? editing[key] : emp[field];
  };

  const handleAdd = async () => {
    if (!newEmp.displayName.trim()) return;
    const created = await createEmployee(newEmp);
    setEmployees(prev => [...prev, created]);
    setNewEmp({ displayName: '', firstName: '', lastName: '', ftePercent: 1.0, type: 'expert' });
    setShowAdd(false);
  };

  const handleDelete = async (emp) => {
    if (!confirm(`למחוק את ${emp.displayName}? הפעולה תמחק גם את כל השיבוצים שלו.`)) return;
    await deleteEmployee(emp.id);
    setEmployees(prev => prev.filter(e => e.id !== emp.id));
  };

  const handleStatus = async (emp, status) => {
    const updated = await updateEmployee(emp.id, { status });
    setEmployees(prev => prev.map(e => e.id === emp.id ? { ...e, ...updated } : e));
  };

  const filtered = employees.filter(e =>
    !filter || e.displayName.includes(filter) || e.firstName?.includes(filter) || e.lastName?.includes(filter)
  );

  const activeEmps = employees.filter(e => e.status === 'active' || !e.status);
  const totalFTE = activeEmps.reduce((s, e) => s + e.ftePercent, 0);

  if (loading) return <div className="p-6 text-gray-500">טוען...</div>;

  return (
    <div>
      {showImport && (
        <ImportModal
          type="employees"
          label="עובדים"
          columns={['שם תצוגה', 'שם פרטי', 'שם משפחה', 'אחוז משרה', 'סוג']}
          onDone={load}
          onClose={() => setShowImport(false)}
        />
      )}
      <AlertsBanner />
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">תקנים</h1>
          <p className="text-sm text-gray-500">
            {activeEmps.length} פעילים | {totalFTE.toFixed(2)} משרות | {Math.ceil(totalFTE * 40)} שעות שבועיות
          </p>
        </div>
        <div className="flex gap-2">
          <input className="input" placeholder="חיפוש..." value={filter} onChange={e => setFilter(e.target.value)} />
          <button className="btn-secondary" onClick={() => setShowImport(true)}>📥 ייבוא מקובץ</button>
          <button className="btn-primary" onClick={() => setShowAdd(true)}>+ עובד חדש</button>
        </div>
      </div>

      {showAdd && (
        <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4">
          <h3 className="font-semibold text-blue-800 mb-3">הוספת עובד חדש</h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 mb-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">שם תצוגה *</label>
              <input className="input w-full" value={newEmp.displayName} onChange={e => setNewEmp(p => ({...p, displayName: e.target.value}))} placeholder="אורי" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">שם פרטי</label>
              <input className="input w-full" value={newEmp.firstName} onChange={e => setNewEmp(p => ({...p, firstName: e.target.value}))} />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">שם משפחה</label>
              <input className="input w-full" value={newEmp.lastName} onChange={e => setNewEmp(p => ({...p, lastName: e.target.value}))} />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">אחוז משרה</label>
              <input className="input w-full" type="number" step="0.01" min="0.1" max="2" value={newEmp.ftePercent} onChange={e => setNewEmp(p => ({...p, ftePercent: parseFloat(e.target.value)}))} />
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <select className="input" value={newEmp.type} onChange={e => setNewEmp(p => ({...p, type: e.target.value}))}>
              <option value="expert">מומחה/ית</option>
              <option value="trainee">מתמחה</option>
            </select>
            <button className="btn-primary" onClick={handleAdd}>הוסף</button>
            <button className="btn-secondary" onClick={() => setShowAdd(false)}>ביטול</button>
          </div>
        </div>
      )}

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
              <th className="table-header text-center">סטטוס</th>
              <th className="table-header">הערות</th>
              <th className="table-header text-center">מאזן</th>
              <th className="table-header text-center">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(emp => {
              const isInactive = emp.status === 'inactive' || emp.status === 'maternity';
              return (
                <tr key={emp.id} className={`hover:bg-gray-50 ${isInactive ? 'opacity-50' : ''}`}>
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
                    {Math.ceil(emp.ftePercent * 40)}
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
                  <td className="table-cell text-center">
                    <select
                      className={`input text-xs py-0.5 ${STATUS_COLORS[emp.status || 'active']}`}
                      value={emp.status || 'active'}
                      onChange={e => handleStatus(emp, e.target.value)}
                    >
                      <option value="active">פעיל</option>
                      <option value="maternity">חל"ד</option>
                      <option value="inactive">לא פעיל</option>
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
                  <td className="table-cell text-center">
                    <button
                      className="text-red-400 hover:text-red-600 text-xs"
                      onClick={() => handleDelete(emp)}
                      title="מחק עובד"
                    >🗑️</button>
                  </td>
                </tr>
              );
            })}
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
