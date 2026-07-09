import { useEffect, useState } from 'react';
import axios from 'axios';

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
              <div className="bg-blue-800 text-white px-4 py-2.5 font-semibold text-base">
                {emp.name}
              </div>

              <div className="px-4 py-3 space-y-3">
                {/* Teams */}
                <div>
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">צוותים</div>
                  {emp.teams.length === 0
                    ? <span className="text-sm text-gray-400">לא משובץ לצוות</span>
                    : <div className="space-y-1">
                        {emp.teams.map((t, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                              t.type === 'educational' ? 'bg-teal-100 text-teal-800' : 'bg-indigo-100 text-indigo-800'
                            }`}>
                              {t.type === 'educational' ? 'חינוכי' : 'קליני'}
                            </span>
                            {t.isHead
                              ? <span className="text-gray-600">ראש צוות</span>
                              : <span className="text-gray-600">ראש צוות: <span className="font-medium text-gray-800">{t.headName}</span></span>
                            }
                          </div>
                        ))}
                      </div>
                  }
                </div>

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

                {/* Supervisions given */}
                {emp.supGiven.length > 0 && (
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

                {emp.supReceived.length === 0 && emp.supGiven.length === 0 && (
                  <div>
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">הדרכות</div>
                    <span className="text-sm text-gray-400">אין הדרכות רשומות</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
