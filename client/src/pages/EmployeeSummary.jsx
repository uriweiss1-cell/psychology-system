import { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';

function CollapsibleMembers({ title, members, color }) {
  const [open, setOpen] = useState(false);
  const bg   = color === 'purple' ? 'bg-purple-50 border-purple-200' : 'bg-blue-50 border-blue-200';
  const chip = color === 'purple' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800';
  const hdr  = color === 'purple' ? 'text-purple-700' : 'text-blue-700';
  return (
    <div className={`border rounded-lg overflow-hidden ${bg}`}>
      <button
        className={`w-full flex items-center justify-between px-3 py-2 text-sm font-semibold ${hdr}`}
        onClick={() => setOpen(o => !o)}
      >
        <span>{title} ({members.length})</span>
        <span className="text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-3 pb-3 flex flex-wrap gap-1">
          {members.length === 0
            ? <span className="text-xs text-gray-400">אין חברים</span>
            : members.map((m, i) => (
                <span key={i} className={`text-xs px-2 py-0.5 rounded ${chip}`}>{m}</span>
              ))
          }
        </div>
      )}
    </div>
  );
}

const SUP_TYPE_LABELS = {
  educational:    'הדרכה חינוכית פרטנית',
  clinical:       'הדרכה קלינית פרטנית',
  art_therapy:    'הדרכת מטפלות באומנות',
  psychotherapy:  'קבוצות פסיכותרפיה',
  orientation:    'קבוצת אוריינטציה',
  sup_of_sup:     'הדרכה על הדרכה',
  diagnostics:    'דיאגנוסטיקה',
  therapist_group:'קבוצות מטפלות',
  exam_prep:      'הכנה לבחינה',
  custom:         'אחר',
};

function supLabel(s) {
  if (s.type === 'custom') return s.customLabel || 'אחר';
  return SUP_TYPE_LABELS[s.type] || s.type;
}

function KinderChip({ garden }) {
  const [popup, setPopup] = useState(null); // null | 'loading' | { data }
  const ref = useRef();

  const handleClick = async () => {
    if (popup) { setPopup(null); return; }
    setPopup('loading');
    try {
      const r = await axios.get(`/api/public/kinder/${garden.id}`);
      setPopup(r.data);
    } catch { setPopup(null); }
  };

  useEffect(() => {
    if (!popup || popup === 'loading') return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setPopup(null); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [popup]);

  return (
    <span ref={ref} className="relative inline-block">
      <button
        onClick={handleClick}
        className="text-xs bg-green-50 text-green-800 border border-green-200 px-2 py-0.5 rounded hover:bg-green-100 transition-colors"
      >
        {garden.name}
      </button>
      {popup && popup !== 'loading' && (
        <div className="absolute z-50 top-full mt-1 right-0 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm min-w-[200px] space-y-1.5" dir="rtl">
          <div className="font-semibold text-gray-800 border-b border-gray-100 pb-1 mb-1">{popup.name}</div>
          {popup.address && (
            <div className="flex gap-1.5 text-gray-600"><span className="text-gray-400">📍</span><span>{popup.address}</span></div>
          )}
          {popup.phone && (
            <div className="flex gap-1.5 text-gray-600"><span className="text-gray-400">☎️</span><a href={`tel:${popup.phone}`} className="text-blue-600 hover:underline">{popup.phone}</a></div>
          )}
          {popup.teacher && (
            <div className="flex gap-1.5 text-gray-600"><span className="text-gray-400">👩‍🏫</span><span>{popup.teacher}</span></div>
          )}
          {popup.teacherPhone && (
            <div className="flex gap-1.5 text-gray-600"><span className="text-gray-400">📱</span><a href={`tel:${popup.teacherPhone}`} className="text-blue-600 hover:underline">{popup.teacherPhone}</a></div>
          )}
        </div>
      )}
      {popup === 'loading' && (
        <div className="absolute z-50 top-full mt-1 right-0 bg-white border border-gray-200 rounded-lg shadow p-2 text-xs text-gray-400">טוען...</div>
      )}
    </span>
  );
}

export default function EmployeeSummary() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    axios.get('/api/public/employee-summary')
      .then(r => { setEmployees(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const results = query.trim().length > 0
    ? employees.filter(e => e.name.includes(query.trim()))
    : [];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" dir="rtl">
      {/* Header */}
      <div className="bg-blue-900 text-white px-6 py-4">
        <div className="font-semibold text-base">שיבוצי צוותים והדרכות</div>
        <div className="text-xs text-blue-300 mt-0.5">מערכת שיבוץ פסיכולוגים</div>
      </div>

      {/* Search */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-lg mx-auto">
          <input
            type="search"
            placeholder="הקלד שם לחיפוש..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Results */}
      <div className="max-w-2xl mx-auto w-full p-4">
        {loading && <p className="text-gray-400 text-center py-12 text-sm">טוען...</p>}

        {!loading && query.trim() === '' && (
          <p className="text-gray-400 text-center py-12 text-sm">הקלד שם כדי לחפש</p>
        )}

        {!loading && query.trim() !== '' && results.length === 0 && (
          <p className="text-gray-400 text-center py-12 text-sm">לא נמצא עובד בשם זה</p>
        )}

        <div className="space-y-3">
          {results.map(emp => (
            <div key={emp.name} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              {/* Name bar */}
              <div className={`${emp.isExternal ? 'bg-purple-800' : emp.isStudent ? 'bg-amber-700' : 'bg-blue-800'} text-white px-4 py-2.5 font-semibold text-base flex items-center justify-between`}>
                <span>{emp.name}</span>
                {emp.isExternal && <span className="text-xs bg-purple-600 px-2 py-0.5 rounded">חיצוני</span>}
                {emp.isStudent && <span className="text-xs bg-amber-600 px-2 py-0.5 rounded">סטודנטית</span>}
              </div>

              <div className="px-4 py-3 space-y-3">
                {/* Teams */}
                <div>
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    {emp.isExternal ? 'צוות קליני' : 'צוותים'}
                  </div>
                  {emp.teams.length === 0
                    ? <span className="text-sm text-gray-400">לא משובץ לצוות</span>
                    : <div className="space-y-1">
                        {emp.teams.map((t, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            {!emp.isExternal && (
                              <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                                t.type === 'educational' ? 'bg-teal-100 text-teal-800' : 'bg-indigo-100 text-indigo-800'
                              }`}>
                                {t.type === 'educational' ? 'חינוכי' : 'קליני'}
                              </span>
                            )}
                            {t.isHead
                              ? <span className="text-gray-600">ראש צוות</span>
                              : <span className="text-gray-600">ראש צוות: <span className="font-medium text-gray-800">{t.headName}</span></span>
                            }
                          </div>
                        ))}
                      </div>
                  }
                </div>

                {/* Schools — internal only */}
                {!emp.isExternal && emp.schools?.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">בתי ספר</div>
                    <div className="flex flex-wrap gap-1">
                      {emp.schools.map((s, i) => (
                        <span key={i} className="text-xs bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded">{s}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Gardens — internal only */}
                {!emp.isExternal && emp.gardens?.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">גנים</div>
                    <div className="flex flex-wrap gap-1">
                      {emp.gardens.map((g, i) => (
                        <KinderChip key={i} garden={g} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Supervisions received */}
                {emp.supReceived.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">הדרכות שאני מקבל/ת</div>
                    <div className="space-y-1">
                      {emp.supReceived.map((s, i) => (
                        <div key={i} className="text-sm text-gray-700 flex items-start gap-2">
                          <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800 whitespace-nowrap mt-0.5">{supLabel(s)}</span>
                          {s.supervisorName && <span className="text-gray-500">מדריך/ה: <span className="text-gray-800 font-medium">{s.supervisorName}</span></span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Supervisions given — internal only */}
                {!emp.isExternal && emp.supGiven.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">הדרכות שאני נותן/ת</div>
                    <div className="space-y-2">
                      {emp.supGiven.map((s, i) => (
                        <div key={i} className="text-sm">
                          <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-800">{supLabel(s)}</span>
                          {(s.superviseeNames || []).length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1 pr-1">
                              {s.superviseeNames.map((n, j) => (
                                <span key={j} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{n}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {emp.supReceived.length === 0 && (emp.isExternal || emp.supGiven.length === 0) && (
                  <div>
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">הדרכות</div>
                    <span className="text-sm text-gray-400">אין הדרכות רשומות</span>
                  </div>
                )}

                {/* Interest group */}
                <div>
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">קבוצת עניין</div>
                  {emp.interestGroup ? (
                    <div className="text-sm">
                      <span className="inline-block bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-medium mb-1">{emp.interestGroup.name}</span>
                      {emp.interestGroup.facilitatorNames?.length > 0 && (
                        <span className="text-gray-500 mr-2">מנחים: {emp.interestGroup.facilitatorNames.join(', ')}</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">לא שובץ לקבוצת עניין</span>
                  )}
                </div>

                {/* Led teams */}
                {(emp.ledTeams || []).map((t, i) => (
                  <CollapsibleMembers
                    key={i}
                    title={`הצוות ה${t.type === 'educational' ? 'חינוכי' : 'קליני'} שלי`}
                    members={t.members}
                    color="blue"
                  />
                ))}

                {/* Led interest groups */}
                {(emp.ledGroups || []).map((g, i) => (
                  <CollapsibleMembers
                    key={i}
                    title={`קבוצת העניין שלי — ${g.name}`}
                    members={g.members}
                    color="purple"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
