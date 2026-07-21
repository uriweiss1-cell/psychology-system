import { useEffect, useState, useRef, useContext } from 'react';
import { getSupervisions, createSupervision, updateSupervision, deleteSupervision, getAlerts, getEmployees, getHiddenSupTypes, putHiddenSupTypes, getInterestGroups, createInterestGroup, updateInterestGroup, deleteInterestGroup } from '../api';
import AlertsBanner from '../components/AlertsBanner';
import { EmployeeCardContext } from '../App';
import ClickableName from '../components/ClickableName';

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
  custom:         'קטגוריה חדשה',
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
  custom:         'bg-gray-600',
};

const TYPE_HOURS = {
  educational: 1, clinical: 1, art_therapy: 1.5,
  psychotherapy: 1.5, orientation: 1.5, sup_of_sup: 1.5,
  diagnostics: 1.5, therapist_group: 1.5, exam_prep: 1.5,
  custom: 1.5,
};

const TYPE_IS_GROUP = {
  educational: false, clinical: false, art_therapy: false,
  psychotherapy: true, orientation: true, sup_of_sup: false,
  diagnostics: false, therapist_group: true, exam_prep: false,
};

// Returns the display label for a supervision record
function getLabel(s) {
  if (s.type === 'custom') return s.customLabel || 'קטגוריה חדשה';
  return TYPE_LABELS[s.type] || s.type;
}

function getColor(s) {
  return TYPE_COLORS[s.type] || 'bg-gray-600';
}

export default function Supervisions() {
  const [supervisions, setSupervisions] = useState([]);
  const [hiddenTypes, setHiddenTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [showAdd, setShowAdd] = useState(false);
  const [newSup, setNewSup] = useState({ type: 'educational', customLabel: '', isNewCustomLabel: false, isGroup: false, supervisorName: '', superviseeNames: '', hoursPerSession: 1, isExternal: false, notes: '' });
  const [typeSearch, setTypeSearch] = useState('');
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const typeDropdownRef = useRef(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [addError, setAddError] = useState('');
  const [editError, setEditError] = useState('');
  const [noEdSupervision, setNoEdSupervision] = useState([]);
  const [supAlerts, setSupAlerts] = useState([]);
  const [alertsOpen, setAlertsOpen] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedName, setSelectedName] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef(null);
  const [interestGroups, setInterestGroups] = useState([]);
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [editGroupData, setEditGroupData] = useState({});
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: '', facilitatorNames: '', memberDisplayNames: '' });

  const load = async () => {
    const [sups, alertsData, emps, hidden, groups] = await Promise.all([getSupervisions(), getAlerts(), getEmployees(true), getHiddenSupTypes(), getInterestGroups()]);
    setSupervisions(sups);
    setHiddenTypes(hidden || []);
    setNoEdSupervision(alertsData.noEdSupervision || []);
    setSupAlerts(alertsData.supAlerts || []);
    setEmployees(emps);
    setInterestGroups(groups || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const handler = (e) => {
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(e.target)) {
        setShowTypeDropdown(false);
        setTypeSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const startEdit = (s) => {
    setEditingId(s.id);
    setEditError('');
    setEditData({ ...s, superviseeNamesText: (s.superviseeNames || []).join('\n'), isGroup: s.isGroup ?? false });
  };

  const saveEdit = async () => {
    setEditError('');
    try {
      const updated = await updateSupervision(editingId, {
        ...editData,
        superviseeNames: editData.superviseeNamesText.split('\n').map(x => x.trim()).filter(Boolean),
        hoursPerSession: parseFloat(editData.hoursPerSession) || 1,
      });
      setSupervisions(prev => prev.map(s => s.id === editingId ? updated : s));
      setEditingId(null);
    } catch (e) {
      setEditError(e?.response?.data?.error || 'שגיאה בשמירה');
    }
  };

  const handleTypeSelectChange = (val) => {
    if (val.startsWith('custom::')) {
      const label = val.slice(8);
      if (label === '__new__') {
        setNewSup(p => ({ ...p, type: 'custom', customLabel: '', isNewCustomLabel: true, isGroup: true }));
      } else {
        const existing = supervisions.find(s => s.type === 'custom' && s.customLabel === label);
        setNewSup(p => ({ ...p, type: 'custom', customLabel: label, isNewCustomLabel: false, isGroup: existing?.isGroup ?? true }));
      }
    } else {
      setNewSup(p => ({ ...p, type: val, customLabel: '', isNewCustomLabel: false, isGroup: TYPE_IS_GROUP[val] ?? false }));
    }
  };

  const typeSelectVal = newSup.type !== 'custom' ? newSup.type
    : newSup.isNewCustomLabel ? 'custom::__new__'
    : `custom::${newSup.customLabel}`;

  const handleAdd = async () => {
    setAddError('');
    if (!newSup.supervisorName.trim() && newSup.type !== 'exam_prep') return;
    if (newSup.type === 'custom' && !newSup.customLabel.trim()) {
      setAddError('נא להזין שם קטגוריה');
      return;
    }
    try {
      const created = await createSupervision({
        ...newSup,
        superviseeNames: newSup.superviseeNames.split('\n').map(x => x.trim()).filter(Boolean),
        hoursPerSession: TYPE_HOURS[newSup.type] || 1.5,
      });
      setSupervisions(prev => [...prev, created]);
      setNewSup({ type: 'educational', customLabel: '', isNewCustomLabel: false, isGroup: false, supervisorName: '', superviseeNames: '', hoursPerSession: 1, isExternal: false, notes: '' });
      setShowAdd(false);
    } catch (e) {
      setAddError(e?.response?.data?.error || 'שגיאה בהוספה');
    }
  };

  const handleDeleteCategory = async (typeKey, customLabel) => {
    const label = typeKey === 'custom' ? customLabel : TYPE_LABELS[typeKey];
    if (!confirm(`למחוק את הקטגוריה "${label}" וכל ההדרכות שתחתיה?`)) return;
    const toDelete = supervisions.filter(s =>
      typeKey === 'custom' ? (s.type === 'custom' && s.customLabel === customLabel) : s.type === typeKey
    );
    await Promise.all(toDelete.map(s => deleteSupervision(s.id)));
    setSupervisions(prev => prev.filter(s =>
      typeKey === 'custom' ? !(s.type === 'custom' && s.customLabel === customLabel) : s.type !== typeKey
    ));
    if (typeKey !== 'custom') {
      const updated = [...hiddenTypes, typeKey];
      setHiddenTypes(updated);
      await putHiddenSupTypes(updated);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`למחוק הדרכה של ${name}?`)) return;
    await deleteSupervision(id);
    setSupervisions(prev => prev.filter(s => s.id !== id));
  };

  if (loading) return <div className="p-6 text-gray-500">טוען...</div>;

  // Group: fixed types first, then custom groups by customLabel
  const standardGroups = Object.keys(TYPE_LABELS)
    .filter(t => t !== 'custom' && !hiddenTypes.includes(t))
    .map(type => ({
      key: type,
      typeKey: type,
      customLabel: null,
      label: TYPE_LABELS[type],
      color: TYPE_COLORS[type],
      items: supervisions.filter(s => s.type === type)
        .sort((a, b) => (a.isExternal ? 1 : 0) - (b.isExternal ? 1 : 0)),
    }))
    .filter(g => g.items.length > 0);

  // Custom groups: group by customLabel
  const customSupervisions = supervisions.filter(s => s.type === 'custom');
  const existingCustomLabels = [...new Set(customSupervisions.map(s => s.customLabel || '').filter(Boolean))];
  const customGroups = existingCustomLabels.map(label => ({
    key: 'custom_' + label,
    typeKey: 'custom',
    customLabel: label,
    label,
    color: 'bg-gray-600',
    items: customSupervisions.filter(s => s.customLabel === label),
  }));

  const getGroupIsGroup = (g) => g.items[0]?.isGroup ?? (TYPE_IS_GROUP[g.typeKey] ?? false);

  const handleToggleGroupType = async (g) => {
    const newIsGroup = !getGroupIsGroup(g);
    await Promise.all(g.items.map(s => updateSupervision(s.id, { isGroup: newIsGroup })));
    setSupervisions(prev => prev.map(s =>
      g.items.some(gi => gi.id === s.id) ? { ...s, isGroup: newIsGroup } : s
    ));
  };
  const allGroups = [...standardGroups, ...customGroups]
    .sort((a, b) => (getGroupIsGroup(a) ? 1 : 0) - (getGroupIsGroup(b) ? 1 : 0))
    .filter(g => !typeFilter.trim() || g.label.includes(typeFilter.trim()));

  const renderGroup = (g) => {
    const { key, label, color, items, typeKey, customLabel: cLabel } = g;
    const isGroupVal = getGroupIsGroup(g);
    return (
    <div key={key}>
      <div className={`flex items-center justify-between text-white text-sm font-semibold px-3 py-2 rounded-t ${color}`}>
        <div className="flex items-center gap-2">
          <span>{label}</span>
          <button
            className={`text-xs px-2 py-0.5 rounded-full border border-white/40 opacity-80 hover:opacity-100 ${isGroupVal ? 'bg-purple-800/60' : 'bg-teal-800/60'}`}
            title="לחץ לשינוי פרטני/קבוצתי"
            onClick={() => handleToggleGroupType(g)}
          >
            {isGroupVal ? 'קבוצתי' : 'פרטני'}
          </button>
        </div>
        <button
          className="opacity-60 hover:opacity-100 text-xs px-1"
          title="מחיקת קטגוריה"
          onClick={() => handleDeleteCategory(typeKey, cLabel)}
        >🗑️</button>
      </div>
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
                  {editError && <p className="text-red-600 text-xs mt-1">{editError}</p>}
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
                      : <ClickableName name={s.supervisorName} />
                    : <span className="text-gray-400">—</span>
                  }
                </td>
                <td className="table-cell">
                  {(s.superviseeNames || []).length === 0
                    ? <span className="text-gray-400 italic">—</span>
                    : <div className="flex flex-wrap gap-1">
                        {s.superviseeNames.map((name, i) => (
                          <span key={i} className="badge bg-gray-100 text-gray-700"><ClickableName name={name} /></span>
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
  };

  const totalAlerts = noEdSupervision.length + supAlerts.length;

  return (
    <div>
      <AlertsBanner page="supervisions" />
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-800">הדרכות</h1>
        <div className="flex gap-2 items-center">
          <input
            className="input"
            placeholder="חיפוש סוג הדרכה..."
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
          />
          <div className="relative" ref={searchRef}>
            <input
              className="input"
              placeholder="חיפוש עובד..."
              value={search}
              onChange={e => { setSearch(e.target.value); setSelectedName(''); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            />
            {showSuggestions && search.trim() && (() => {
              const suggestions = employees.filter(e => e.displayName.includes(search.trim()));
              if (!suggestions.length) return null;
              return (
                <ul className="absolute z-50 bg-white border border-gray-200 rounded shadow w-48 mt-1 max-h-48 overflow-y-auto text-sm">
                  {suggestions.map(e => (
                    <li key={e.id} className="px-3 py-1.5 hover:bg-blue-50 cursor-pointer"
                      onMouseDown={() => { setSelectedName(e.displayName); setSearch(e.displayName); setShowSuggestions(false); }}>
                      {e.displayName}
                    </li>
                  ))}
                </ul>
              );
            })()}
          </div>
          <button className="btn-primary" onClick={() => { setShowAdd(true); setAddError(''); }}>+ הדרכה חדשה</button>
        </div>
      </div>

      {selectedName && (() => {
        const q = selectedName;
        const asSupervisee = supervisions.filter(s => (s.superviseeNames || []).some(n => n === q));
        const asSupervisor = supervisions.filter(s => (s.supervisorName || '').trim() === q);
        return (
          <div className="mb-6 border border-blue-200 rounded overflow-hidden">
            <div className="bg-blue-700 text-white text-sm font-semibold px-3 py-2 flex justify-between items-center">
              <span>🔍 {q}</span>
              <button className="text-blue-200 hover:text-white text-xs" onClick={() => { setSelectedName(''); setSearch(''); }}>✕</button>
            </div>
            <div className="bg-white p-4 space-y-4">
              {asSupervisee.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">מודרך/ת ע"י:</p>
                  <div className="space-y-1">
                    {asSupervisee.map(s => (
                      <div key={s.id} className="flex items-center gap-2 text-sm">
                        <span className={`badge text-white text-xs ${getColor(s)}`}>{getLabel(s)}</span>
                        <span className="text-gray-800 font-medium">{s.supervisorName || '—'}</span>
                        {s.isExternal && <span className="text-gray-400 text-xs">(חיצוני)</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {asSupervisor.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">מדריך/ה את:</p>
                  <div className="space-y-1">
                    {asSupervisor.map(s => (
                      <div key={s.id} className="flex items-start gap-2 text-sm">
                        <span className={`badge text-white text-xs mt-0.5 ${getColor(s)}`}>{getLabel(s)}</span>
                        <div className="flex flex-wrap gap-1">
                          {(s.superviseeNames || []).length > 0
                            ? s.superviseeNames.map((n, i) => <span key={i} className="badge bg-gray-100 text-gray-700">{n}</span>)
                            : <span className="text-gray-400">—</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {asSupervisee.length === 0 && asSupervisor.length === 0 && (
                <p className="text-sm text-gray-400">לא נמצאו תוצאות</p>
              )}
            </div>
          </div>
        );
      })()}

      {totalAlerts > 0 && (
        <div className="mb-4 border border-red-200 rounded overflow-hidden">
          <button
            className="w-full flex items-center justify-between bg-red-50 px-3 py-2 text-sm font-semibold text-red-800 hover:bg-red-100"
            onClick={() => setAlertsOpen(o => !o)}
          >
            <span>⚠️ {totalAlerts} התרעות הדרכה</span>
            <span>{alertsOpen ? '▲' : '▼'}</span>
          </button>
          {alertsOpen && (
            <div className="bg-white p-3 space-y-2 text-sm">
              {noEdSupervision.length > 0 && (
                <div>
                  <p className="font-semibold text-teal-700 mb-1">ללא הדרכה חינוכית פרטנית ({noEdSupervision.length}):</p>
                  <div className="flex flex-wrap gap-1">
                    {noEdSupervision.map(e => (
                      <span key={e.id} className="badge bg-teal-100 text-teal-800">{e.displayName}</span>
                    ))}
                  </div>
                </div>
              )}
              {supAlerts.length > 0 && (
                <div>
                  <p className="font-semibold text-purple-700 mb-1">פערים בהדרכות ({supAlerts.length}):</p>
                  <div className="flex flex-wrap gap-1">
                    {supAlerts.map(e => (
                      <span key={e.id} className="badge bg-purple-100 text-purple-800">
                        {e.displayName} —{' '}
                        {e.alerts.map((a, i) => (
                          <span key={i}>
                            {a.field}: {a.gap > 0 ? `+${a.gap}` : a.gap} ש׳{i < e.alerts.length - 1 ? ', ' : ''}
                          </span>
                        ))}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}


      {showAdd && (
        <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4">
          <h3 className="font-semibold text-blue-800 mb-3">הוספת הדרכה</h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="relative" ref={typeDropdownRef}>
              <label className="block text-xs text-gray-600 mb-1">סוג הדרכה</label>
              <div
                className="input w-full cursor-pointer flex items-center justify-between"
                onClick={() => setShowTypeDropdown(o => !o)}
              >
                <span className={typeSelectVal ? 'text-gray-800' : 'text-gray-400'}>
                  {typeSelectVal === 'custom::__new__' ? '➕ קטגוריה חדשה...'
                    : typeSelectVal?.startsWith('custom::') ? typeSelectVal.slice(8)
                    : TYPE_LABELS[typeSelectVal] || 'בחר סוג'}
                </span>
                <span className="text-gray-400 text-xs">▼</span>
              </div>
              {showTypeDropdown && (
                <div className="absolute z-50 bg-white border border-gray-200 rounded shadow-lg w-full mt-1 max-h-64 overflow-y-auto text-sm" dir="rtl">
                  <div className="p-2 border-b border-gray-100">
                    <input
                      className="input w-full text-sm"
                      placeholder="חיפוש סוג..."
                      value={typeSearch}
                      onChange={e => setTypeSearch(e.target.value)}
                      onClick={e => e.stopPropagation()}
                      autoFocus
                    />
                  </div>
                  {(() => {
                    const q = typeSearch.trim();
                    const fixedOptions = Object.entries(TYPE_LABELS)
                      .filter(([k]) => k !== 'custom' && !hiddenTypes.includes(k) && (!q || TYPE_LABELS[k].includes(q)));
                    const customOptions = existingCustomLabels.filter(l => !q || l.includes(q));
                    const showNew = !q || '➕ קטגוריה חדשה'.includes(q);
                    return (
                      <>
                        {fixedOptions.length > 0 && (
                          <>
                            <div className="px-3 py-1 text-xs text-gray-400 bg-gray-50">סוגים קבועים</div>
                            {fixedOptions.map(([k, v]) => (
                              <div key={k} className={`px-3 py-2 cursor-pointer hover:bg-blue-50 ${typeSelectVal === k ? 'bg-blue-100' : ''}`}
                                onMouseDown={() => { handleTypeSelectChange(k); setShowTypeDropdown(false); setTypeSearch(''); }}>
                                {v}
                              </div>
                            ))}
                          </>
                        )}
                        {customOptions.length > 0 && (
                          <>
                            <div className="px-3 py-1 text-xs text-gray-400 bg-gray-50">קטגוריות מותאמות</div>
                            {customOptions.map(label => (
                              <div key={label} className={`px-3 py-2 cursor-pointer hover:bg-blue-50 ${typeSelectVal === `custom::${label}` ? 'bg-blue-100' : ''}`}
                                onMouseDown={() => { handleTypeSelectChange(`custom::${label}`); setShowTypeDropdown(false); setTypeSearch(''); }}>
                                {label}
                              </div>
                            ))}
                          </>
                        )}
                        {showNew && (
                          <div className="px-3 py-2 cursor-pointer hover:bg-blue-50 text-blue-600"
                            onMouseDown={() => { handleTypeSelectChange('custom::__new__'); setShowTypeDropdown(false); setTypeSearch(''); }}>
                            ➕ קטגוריה חדשה...
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
            {newSup.type === 'custom' && newSup.isNewCustomLabel && (
              <>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">שם הקטגוריה</label>
                  <input className="input w-full" value={newSup.customLabel} onChange={e => setNewSup(p => ({...p, customLabel: e.target.value}))} placeholder="שם הקבוצה / קטגוריה" />
                </div>
                <div className="flex items-center gap-4 pt-5">
                  <label className="text-sm text-gray-700 font-medium">סוג:</label>
                  <label className="flex items-center gap-1 text-sm cursor-pointer">
                    <input type="radio" name="isGroup" checked={!newSup.isGroup} onChange={() => setNewSup(p => ({...p, isGroup: false}))} /> פרטני
                  </label>
                  <label className="flex items-center gap-1 text-sm cursor-pointer">
                    <input type="radio" name="isGroup" checked={newSup.isGroup} onChange={() => setNewSup(p => ({...p, isGroup: true}))} /> קבוצתי
                  </label>
                </div>
              </>
            )}
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
          {addError && <p className="text-red-600 text-sm mb-2">{addError}</p>}
          <div className="flex gap-2">
            <button className="btn-primary" onClick={handleAdd}>הוסף</button>
            <button className="btn-secondary" onClick={() => setShowAdd(false)}>ביטול</button>
          </div>
        </div>
      )}

      <div className="space-y-5">
        {allGroups.map(renderGroup)}
      </div>

      {/* קבוצות עניין */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-800">קבוצות עניין</h2>
          <button className="btn-primary text-sm" onClick={() => setShowAddGroup(true)}>+ קבוצה חדשה</button>
        </div>

        {showAddGroup && (
          <div className="bg-purple-50 border border-purple-200 rounded p-4 mb-4">
            <h3 className="font-semibold text-purple-800 mb-3">הוספת קבוצת עניין</h3>
            <div className="grid grid-cols-1 gap-3 mb-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">שם הקבוצה *</label>
                <input className="input w-full" value={newGroup.name} onChange={e => setNewGroup(p => ({...p, name: e.target.value}))} autoFocus />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">מנחים (שם אחד בכל שורה)</label>
                <textarea className="input w-full" rows={2} value={newGroup.facilitatorNames}
                  onChange={e => setNewGroup(p => ({...p, facilitatorNames: e.target.value}))} />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">חברים (שם אחד בכל שורה)</label>
                <textarea className="input w-full" rows={4} value={newGroup.memberDisplayNames}
                  onChange={e => setNewGroup(p => ({...p, memberDisplayNames: e.target.value}))} />
              </div>
            </div>
            <div className="flex gap-2">
              <button className="btn-primary" onClick={async () => {
                if (!newGroup.name.trim()) return;
                const created = await createInterestGroup({
                  name: newGroup.name.trim(),
                  facilitatorNames: newGroup.facilitatorNames.split('\n').map(s => s.trim()).filter(Boolean),
                  memberDisplayNames: newGroup.memberDisplayNames.split('\n').map(s => s.trim()).filter(Boolean),
                });
                setInterestGroups(prev => [...prev, created]);
                setNewGroup({ name: '', facilitatorNames: '', memberDisplayNames: '' });
                setShowAddGroup(false);
              }}>הוסף</button>
              <button className="btn-secondary" onClick={() => setShowAddGroup(false)}>ביטול</button>
            </div>
          </div>
        )}

        {interestGroups.length === 0 && !showAddGroup && (
          <p className="text-sm text-gray-400">אין קבוצות עניין רשומות</p>
        )}

        <div className="space-y-3">
          {interestGroups.map(group => (
            <div key={group.id} className="bg-white border border-purple-100 rounded-lg shadow-sm overflow-hidden">
              {editingGroupId === group.id ? (
                <div className="p-4 space-y-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">שם הקבוצה</label>
                    <input className="input w-full" value={editGroupData.name}
                      onChange={e => setEditGroupData(p => ({...p, name: e.target.value}))} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">מנחים (שם אחד בכל שורה)</label>
                    <textarea className="input w-full" rows={2} value={editGroupData.facilitatorNames}
                      onChange={e => setEditGroupData(p => ({...p, facilitatorNames: e.target.value}))} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">חברים (שם אחד בכל שורה)</label>
                    <textarea className="input w-full" rows={5} value={editGroupData.memberDisplayNames}
                      onChange={e => setEditGroupData(p => ({...p, memberDisplayNames: e.target.value}))} />
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-primary" onClick={async () => {
                      const updated = await updateInterestGroup(group.id, {
                        name: editGroupData.name.trim(),
                        facilitatorNames: editGroupData.facilitatorNames.split('\n').map(s => s.trim()).filter(Boolean),
                        memberDisplayNames: editGroupData.memberDisplayNames.split('\n').map(s => s.trim()).filter(Boolean),
                      });
                      setInterestGroups(prev => prev.map(g => g.id === group.id ? updated : g));
                      setEditingGroupId(null);
                    }}>שמור</button>
                    <button className="btn-secondary" onClick={() => setEditingGroupId(null)}>ביטול</button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="bg-purple-700 text-white px-4 py-2 flex items-center justify-between">
                    <span className="font-semibold">{group.name}</span>
                    <div className="flex gap-2">
                      <button className="text-purple-200 hover:text-white text-xs" onClick={() => {
                        setEditingGroupId(group.id);
                        setEditGroupData({
                          name: group.name,
                          facilitatorNames: (group.facilitatorNames || []).join('\n'),
                          memberDisplayNames: (group.memberDisplayNames || []).join('\n'),
                        });
                      }}>✏️ עריכה</button>
                      <button className="text-purple-200 hover:text-red-300 text-xs" onClick={async () => {
                        if (!confirm(`למחוק את ${group.name}?`)) return;
                        await deleteInterestGroup(group.id);
                        setInterestGroups(prev => prev.filter(g => g.id !== group.id));
                      }}>🗑️</button>
                    </div>
                  </div>
                  <div className="p-3 space-y-2">
                    {group.facilitatorNames?.length > 0 && (
                      <div>
                        <span className="text-xs text-gray-500 ml-1">מנחים:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {group.facilitatorNames.map((n, i) => (
                            <span key={i} className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-medium">{n}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {group.memberDisplayNames?.length > 0 ? (
                      <div>
                        <span className="text-xs text-gray-500">חברים ({group.memberDisplayNames.length}):</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {group.memberDisplayNames.map((n, i) => (
                            <ClickableName key={i} name={n} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded" />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">אין חברים משובצים</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
