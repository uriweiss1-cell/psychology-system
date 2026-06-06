import { useEffect, useState } from 'react';
import { getEmployees, updateEmployee, createEmployee, deleteEmployee, getSettings, updateSettings } from '../api';
import ImportModal from '../components/ImportModal';

const STATUS_COLORS = { active: 'bg-green-100 text-green-800', inactive: 'bg-red-100 text-red-700', maternity: 'bg-blue-100 text-blue-700' };

export default function Standards() {
  const [employees, setEmployees] = useState([]);
  const [settings, setSettings] = useState({ approvedPositions: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [editing, setEditing] = useState({});
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [newEmp, setNewEmp] = useState({ firstName: '', lastName: '', ftePercent: 1.0 });
  const [editingApproved, setEditingApproved] = useState(false);
  const [approvedInput, setApprovedInput] = useState('');

  const load = async () => {
    const [emps, sett] = await Promise.all([getEmployees(), getSettings()]);
    setEmployees(emps);
    setSettings(sett);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const setFieldEdit = (id, field, value) =>
    setEditing(prev => ({ ...prev, [`${id}_${field}`]: value }));

  const saveField = async (id, field) => {
    const key = `${id}_${field}`;
    const value = editing[key];
    if (value === undefined) return;
    const val = field === 'ftePercent' ? parseFloat(value) : value;
    await updateEmployee(id, { [field]: val });
    setEditing(prev => { const n = {...prev}; delete n[key]; return n; });
    // Reload all when name changes — other employees' displayNames may have changed too
    if (field === 'firstName' || field === 'lastName') load();
    else {
      const emps = await getEmployees();
      setEmployees(emps);
    }
  };

  const getEditVal = (emp, field) => {
    const key = `${emp.id}_${field}`;
    return editing[key] !== undefined ? editing[key] : emp[field];
  };

  const toggleSubstitute = async (emp) => {
    const updated = await updateEmployee(emp.id, { isSubstitute: !emp.isSubstitute });
    setEmployees(prev => prev.map(e => e.id === emp.id ? { ...e, ...updated } : e));
  };

  const handleAdd = async () => {
    if (!newEmp.firstName.trim()) return;
    const created = await createEmployee(newEmp);
    setEmployees(prev => prev.map(e => created.find ? created : e)); // update whole list (displayNames may have changed)
    load(); // reload all to reflect recalculated displayNames
    setNewEmp({ firstName: '', lastName: '', ftePercent: 1.0 });
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

  const saveApproved = async () => {
    const val = parseFloat(approvedInput);
    if (isNaN(val)) return;
    const updated = await updateSettings({ approvedPositions: val });
    setSettings(updated);
    setEditingApproved(false);
  };

  const saveFreeHoursTarget = async (fte, hours) => {
    const targets = (settings.freeHoursTargets || []).map(t =>
      t.fte === fte ? { ...t, hours: parseFloat(hours) || t.hours } : t
    );
    const updated = await updateSettings({ freeHoursTargets: targets });
    setSettings(updated);
  };

  const filtered = employees.filter(e =>
    !filter || e.displayName?.includes(filter) || e.firstName?.includes(filter) || e.lastName?.includes(filter))
    .sort((a, b) => (a.displayName || '').localeCompare(b.displayName || '', 'he')
  );

  // חישובי לוח סיכום
  const active       = employees.filter(e => (e.status === 'active' || !e.status) && !e.isSubstitute);
  const maternity    = employees.filter(e => e.status === 'maternity');
  const substitutes  = employees.filter(e => e.isSubstitute && e.status !== 'inactive');
  const approved     = settings.approvedPositions || 0;

  const activeSum    = active.reduce((s, e) => s + e.ftePercent, 0);
  const maternitySum = maternity.reduce((s, e) => s + e.ftePercent, 0);
  const subsSum      = substitutes.reduce((s, e) => s + e.ftePercent, 0);
  const vacantPos    = approved - activeSum - maternitySum;
  const vacantSubs   = maternitySum - subsSum;

  const fmt = (n) => Math.round(n * 100) / 100;

  if (loading) return <div className="p-6 text-gray-500">טוען...</div>;

  return (
    <div>
      {showImport && (
        <ImportModal
          type="employees"
          label="עובדים"
          columns={['שם פרטי', 'שם משפחה', 'אחוז משרה']}
          onDone={load}
          onClose={() => setShowImport(false)}
        />
      )}
      {/* לוח סיכום תקנים */}
      <div className="bg-white rounded shadow p-4 mb-4">
        <h2 className="text-base font-bold text-gray-700 mb-3">סיכום תקנים</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <SummaryCard
            label="תקנים מאושרים"
            value={approved}
            color="bg-blue-50 border-blue-200"
            textColor="text-blue-800"
            editable
            onEdit={() => { setApprovedInput(String(approved)); setEditingApproved(true); }}
            editing={editingApproved}
            editValue={approvedInput}
            onEditChange={setApprovedInput}
            onEditSave={saveApproved}
            onEditCancel={() => setEditingApproved(false)}
          />
          <SummaryCard label="תקנים בפועל" value={fmt(activeSum)} color="bg-green-50 border-green-200" textColor="text-green-800"
            sub={`${active.length} עובדים`} />
          <SummaryCard label='משרות בחל"ד' value={fmt(maternitySum)} color="bg-indigo-50 border-indigo-200" textColor="text-indigo-800"
            sub={`${maternity.length} עובדים`} />
          <SummaryCard label="מילוי מקום" value={fmt(subsSum)} color="bg-amber-50 border-amber-200" textColor="text-amber-800"
            sub={`${substitutes.length} עובדים`} />
          <SummaryCard label="תקנים פנויים" value={fmt(vacantPos)} color={vacantPos < 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}
            textColor={vacantPos < 0 ? 'text-red-700' : 'text-gray-700'}
            sub="מאושרים − בפועל − חל״ד" />
          <SummaryCard label='פנוי למ"מ' value={fmt(vacantSubs)} color={vacantSubs < 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}
            textColor={vacantSubs < 0 ? 'text-red-700' : 'text-gray-700'}
            sub='חל"ד − מ"מ' />
        </div>
      </div>

      {/* טבלת שעות פנויות יעד */}
      {settings.freeHoursTargets && (
        <div className="bg-white rounded shadow p-4 mb-4">
          <h2 className="text-base font-bold text-gray-700 mb-3">שעות פנויות יעד לפי אחוז משרה</h2>
          <div className="flex gap-4 flex-wrap">
            {settings.freeHoursTargets.map(t => (
              <div key={t.fte} className="flex items-center gap-2 bg-gray-50 border rounded px-3 py-2">
                <span className="text-sm text-gray-600 w-12">{Math.round(t.fte * 100)}%</span>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  className="input w-16 text-center text-sm py-0.5"
                  defaultValue={t.hours}
                  onBlur={e => saveFreeHoursTarget(t.fte, e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && e.target.blur()}
                />
                <span className="text-xs text-gray-400">ש׳</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-800">תקנים</h1>
        <div className="flex gap-2">
          <input className="input" placeholder="חיפוש..." value={filter} onChange={e => setFilter(e.target.value)} />
          <button className="btn-secondary" onClick={() => setShowImport(true)}>📥 ייבוא מקובץ</button>
          <button className="btn-primary" onClick={() => setShowAdd(true)}>+ עובד חדש</button>
        </div>
      </div>

      {showAdd && (
        <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4">
          <h3 className="font-semibold text-blue-800 mb-3">הוספת עובד חדש</h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 mb-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">שם פרטי *</label>
              <input className="input w-full" value={newEmp.firstName} onChange={e => setNewEmp(p => ({...p, firstName: e.target.value}))} placeholder="אורי" autoFocus />
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
          <div className="flex gap-2">
            <button className="btn-primary" onClick={handleAdd}>הוסף</button>
            <button className="btn-secondary" onClick={() => setShowAdd(false)}>ביטול</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="table-header">שם פרטי</th>
              <th className="table-header">שם משפחה</th>
              <th className="table-header text-center">אחוז משרה</th>
              <th className="table-header text-center">סטטוס</th>
              <th className="table-header text-center">מ"מ</th>
              <th className="table-header">הערות</th>
              <th className="table-header text-center">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(emp => {
              const isInactive = emp.status === 'inactive' || emp.status === 'maternity';
              return (
                <tr key={emp.id} className={`hover:bg-gray-50 ${isInactive ? 'opacity-60' : ''}`}>
                  <td className="table-cell">
                    <EditField id={emp.id} field="firstName" value={getEditVal(emp, 'firstName')} type="text"
                      onChange={v => setFieldEdit(emp.id, 'firstName', v)} onSave={() => saveField(emp.id, 'firstName')} />
                  </td>
                  <td className="table-cell">
                    <EditField id={emp.id} field="lastName" value={getEditVal(emp, 'lastName')} type="text"
                      onChange={v => setFieldEdit(emp.id, 'lastName', v)} onSave={() => saveField(emp.id, 'lastName')} />
                  </td>
                  <td className="table-cell text-center">
                    <EditField id={emp.id} field="ftePercent" value={getEditVal(emp, 'ftePercent')} type="number"
                      onChange={v => setFieldEdit(emp.id, 'ftePercent', v)} onSave={() => saveField(emp.id, 'ftePercent')} />
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
                  <td className="table-cell text-center">
                    <input
                      type="checkbox"
                      checked={!!emp.isSubstitute}
                      onChange={() => toggleSubstitute(emp)}
                      title="מילוי מקום"
                      className="w-4 h-4 cursor-pointer"
                    />
                  </td>
                  <td className="table-cell">
                    <EditField id={emp.id} field="notes" value={getEditVal(emp, 'notes')} type="text"
                      onChange={v => setFieldEdit(emp.id, 'notes', v)} onSave={() => saveField(emp.id, 'notes')} />
                  </td>
                  <td className="table-cell text-center">
                    <button className="text-red-400 hover:text-red-600 text-xs" onClick={() => handleDelete(emp)} title="מחק עובד">🗑️</button>
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

function SummaryCard({ label, value, color, textColor, sub, editable, onEdit, editing, editValue, onEditChange, onEditSave, onEditCancel }) {
  return (
    <div className={`border rounded-lg p-3 ${color}`}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      {editing ? (
        <div className="flex gap-1 items-center">
          <input type="number" step="0.01" className="input py-0.5 text-sm w-16" value={editValue} onChange={e => onEditChange(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') onEditSave(); if (e.key === 'Escape') onEditCancel(); }} autoFocus />
          <button className="text-green-600 text-xs" onClick={onEditSave}>✓</button>
          <button className="text-gray-400 text-xs" onClick={onEditCancel}>✕</button>
        </div>
      ) : (
        <div className="flex items-end gap-1">
          <span className={`text-2xl font-bold ${textColor}`}>{value}</span>
          {editable && <button className="text-gray-400 hover:text-gray-600 text-xs mb-1" onClick={onEdit}>✏️</button>}
        </div>
      )}
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function EditField({ id, field, value, type, onChange, onSave }) {
  return (
    <input type={type} step={type === 'number' ? '0.01' : undefined}
      className="input w-full text-sm py-0.5" value={value ?? ''}
      onChange={e => onChange(e.target.value)} onBlur={onSave}
      onKeyDown={e => e.key === 'Enter' && onSave()} />
  );
}
