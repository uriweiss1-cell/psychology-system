import { useEffect, useState } from 'react';
import { getSupervisions, createSupervision, updateSupervision, deleteSupervision } from '../api';

const TYPE_LABELS = {
  educational:    'הדרכה חינוכית פרטנית',
  clinical:       'הדרכה קלינית פרטנית',
  art_therapy:    'הדרכת מטפלות באומנות',
  psychotherapy:  'קבוצות פסיכותרפיה',
  orientation:    'קבוצת אוריינטציה',
  sup_of_sup:     'הדרכה על הדרכה',
  diagnostics:    'דיאגנוסטיקה',
  therapist_group:'קבוצות מטפלות',
  exam_prep:      'הכנה לבחינה',
};

const TYPE_COLORS = {
  educational:    'bg-teal-700',
  clinical:       'bg-indigo-700',
  art_therapy:    'bg-pink-700',
  psychotherapy:  'bg-purple-700',
  orientation:    'bg-amber-700',
  sup_of_sup:     'bg-orange-700',
  diagnostics:    'bg-red-700',
  therapist_group:'bg-rose-700',
  exam_prep:      'bg-sky-700',
};

const TYPE_HOURS = {
  educational: 1, clinical: 1, art_therapy: 1.5,
  psychotherapy: 1.5, orientation: 1.5, sup_of_sup: 1.5,
  diagnostics: 1.5, therapist_group: 1.5, exam_prep: 1.5,
};

export default function Supervisions() {
  const [supervisions, setSupervisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [showAdd, setShowAdd] = useState(false);
  const [newSup, setNewSup] = useState({ type: 'educational', supervisorName: '', superviseeNames: '', hoursPerSession: 1, isExternal: false, notes: '' });

  const load = async () => {
    setSupervisions(await getSupervisions());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const startEdit = (s) => {
    setEditingId(s.id);
    setEditData({ ...s, superviseeNamesText: (s.superviseeNames || []).join('\n') });
  };

  const saveEdit = async () => {
    const updated = await updateSupervision(editingId, {
      ...editData,
      superviseeNames: editData.superviseeNamesText.split('\n').map(x => x.trim()).filter(Boolean),
      hoursPerSession: parseFloat(editData.hoursPerSession) || 1,
    });
    setSupervisions(prev => prev.map(s => s.id === editingId ? updated : s));
    setEditingId(null);
  };

  const handleAdd = async () => {
    if (!newSup.supervisorName.trim() && newSup.type !== 'exam_prep') return;
    const created = await createSupervision({
      ...newSup,
      superviseeNames: newSup.superviseeNames.split('\n').map(x => x.trim()).filter(Boolean),
      hoursPerSession: TYPE_HOURS[newSup.type] || 1,
    });
    setSupervisions(prev => [...prev, created]);
    setNewSup({ type: 'educational', supervisorName: '', superviseeNames: '', hoursPerSession: 1, isExternal: false, notes: '' });
    setShowAdd(false);
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`למחוק הדרכה של ${name}?`)) return;
    await deleteSupervision(id);
    setSupervisions(prev => prev.filter(s => s.id !== id));
  };

  if (loading) return <div className="p-6 text-gray-500">טוען...</div>;

  const grouped = Object.keys(TYPE_LABELS).reduce((acc, t) => {
    acc[t] = supervisions
      .filter(s => s.type === t)
      .sort((a, b) => (a.isExternal ? 1 : 0) - (b.isExternal ? 1 : 0));
    return acc;
  }, {});

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-800">הדרכות</h1>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>+ הדרכה חדשה</button>
      </div>

      {showAdd && (
        <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4">
          <h3 className="font-semibold text-blue-800 mb-3">הוספת הדרכה</h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">סוג הדרכה</label>
              <select className="input w-full" value={newSup.type} onChange={e => setNewSup(p => ({...p, type: e.target.value}))}>
                {Object.entries(TYPE_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">מדריך/ה</label>
              <input className="input w-full" value={newSup.supervisorName} onChange={e => setNewSup(p => ({...p, supervisorName: e.target.value}))} placeholder="שם המדריך" />
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input type="checkbox" id="ext" checked={newSup.isExternal} onChange={e => setNewSup(p => ({...p, isExternal: e.target.checked}))} />
              <label htmlFor="ext" className="text-sm text-gray-700">חיצוני</label>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">הערות</label>
              <input className="input w-full" value={newSup.notes} onChange={e => setNewSup(p => ({...p, notes: e.target.value}))} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-600 mb-1">מודרכים (שם אחד בכל שורה)</label>
              <textarea className="input w-full h-24 text-sm" value={newSup.superviseeNames} onChange={e => setNewSup(p => ({...p, superviseeNames: e.target.value}))} />
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn-primary" onClick={handleAdd}>הוסף</button>
            <button className="btn-secondary" onClick={() => setShowAdd(false)}>ביטול</button>
          </div>
        </div>
      )}

      <div className="space-y-5">
        {Object.entries(TYPE_LABELS).map(([type, label]) => {
          const items = grouped[type] || [];
          if (items.length === 0) return null;
          const color = TYPE_COLORS[type];
          return (
            <div key={type}>
              <h2 className={`text-white text-sm font-semibold px-3 py-2 rounded-t ${color}`}>
                {label}
              </h2>
              <div className="bg-white border border-gray-200 rounded-b overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="table-header w-36">מדריך/ה</th>
                      <th className="table-header">מודרכים</th>
                      <th className="table-header w-48">הערות</th>
                      <th className="table-header text-center w-20">פעולות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(s => editingId === s.id ? (
                      <tr key={s.id} className="bg-yellow-50">
                        <td className="table-cell">
                          <input className="input w-full text-sm" value={editData.supervisorName} onChange={e => setEditData(p => ({...p, supervisorName: e.target.value}))} />
                        </td>
                        <td className="table-cell">
                          <textarea className="input w-full text-sm h-20" value={editData.superviseeNamesText} onChange={e => setEditData(p => ({...p, superviseeNamesText: e.target.value}))} />
                        </td>
                        <td className="table-cell">
                          <input className="input w-full text-sm" value={editData.notes} onChange={e => setEditData(p => ({...p, notes: e.target.value}))} />
                        </td>
                        <td className="table-cell text-center">
                          <button className="text-green-600 text-xs ml-1" onClick={saveEdit}>✓</button>
                          <button className="text-gray-500 text-xs" onClick={() => setEditingId(null)}>✕</button>
                        </td>
                      </tr>
                    ) : (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="table-cell font-medium">
                          {s.supervisorName
                            ? s.isExternal
                              ? <span className="text-gray-400 italic">{s.supervisorName} (חיצוני)</span>
                              : s.supervisorName
                            : <span className="text-gray-400">—</span>
                          }
                        </td>
                        <td className="table-cell">
                          {(s.superviseeNames || []).length === 0
                            ? <span className="text-gray-400 italic">—</span>
                            : <div className="flex flex-wrap gap-1">
                                {s.superviseeNames.map((name, i) => (
                                  <span key={i} className="badge bg-gray-100 text-gray-700">{name}</span>
                                ))}
                              </div>
                          }
                        </td>
                        <td className="table-cell text-gray-500 text-xs">{s.notes}</td>
                        <td className="table-cell text-center">
                          <button className="text-blue-400 hover:text-blue-600 text-xs ml-1" onClick={() => startEdit(s)}>✏️</button>
                          <button className="text-red-400 hover:text-red-600 text-xs" onClick={() => handleDelete(s.id, s.supervisorName || 'הרשומה')}>🗑️</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
