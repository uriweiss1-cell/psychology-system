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
  const [filter, setFilter] = useState('');

  useEffect(() => {
    axios.get('/api/public/employee-summary')
      .then(r => { setEmployees(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = employees.filter(e =>
    !filter || e.name.includes(filter)
  );

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <div className="bg-blue-900 text-white px-6 py-3 flex items-center justify-between">
        <div>
          <div className="font-semibold text-base">שיבוצי צוותים והדרכות</div>
          <div className="text-xs text-blue-300 mt-0.5">מערכת שיבוץ פסיכולוגים</div>
        </div>
        <input
          type="search"
          placeholder="חיפוש שם..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="bg-white/10 border border-white/20 rounded px-3 py-1.5 text-sm text-white placeholder-white/40 outline-none focus:bg-white/20 w-44"
        />
      </div>

      <div className="max-w-4xl mx-auto p-4">
        {loading && <p className="text-gray-400 text-center py-12">טוען...</p>}

        {!loading && filtered.length === 0 && (
          <p className="text-gray-400 text-center py-12">לא נמצאו עובדים</p>
        )}

        {!loading && (
          <div className="space-y-2">
            {filtered.map(emp => (
              <div key={emp.name} className="bg-white border border-gray-200 rounded-lg px-4 py-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Name */}
                <div className="font-semibold text-gray-800 flex items-center">
                  {emp.name}
                </div>

                {/* Teams */}
                <div>
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">צוותים</div>
                  {emp.teams.length === 0
                    ? <span className="text-sm text-gray-400 italic">—</span>
                    : <div className="flex flex-wrap gap-1">
                        {emp.teams.map((t, i) => (
                          <span key={i} className={`text-xs px-2 py-0.5 rounded font-medium ${
                            t.type === 'educational'
                              ? 'bg-teal-100 text-teal-800'
                              : 'bg-indigo-100 text-indigo-800'
                          }`}>
                            {t.type === 'educational' ? 'חינוכי' : 'קליני'}
                            {t.isHead ? ' (ר"צ)' : ''}
                          </span>
                        ))}
                      </div>
                  }
                </div>

                {/* Supervisions */}
                <div>
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">הדרכות</div>
                  {emp.supReceived.length === 0 && emp.supGiven.length === 0
                    ? <span className="text-sm text-gray-400 italic">—</span>
                    : <div className="flex flex-wrap gap-1">
                        {emp.supReceived.map((s, i) => (
                          <span key={`r${i}`} className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                            מקבל/ת: {supLabel(s)}{s.supervisorName ? ` — ${s.supervisorName}` : ''}
                          </span>
                        ))}
                        {emp.supGiven.map((s, i) => (
                          <span key={`g${i}`} className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-800">
                            נותן/ת: {supLabel(s)}
                            {s.superviseeNames?.length ? ` (${s.superviseeNames.length})` : ''}
                          </span>
                        ))}
                      </div>
                  }
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
