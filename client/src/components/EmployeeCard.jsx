import { useEffect, useState } from 'react';
import { getEmployees, getAssignments, getFrameworks, getTeams, getSupervisions } from '../api';

const STATUS_LABELS = { active: 'פעיל', maternity: 'חל"ד', inactive: 'לא פעיל' };
const STATUS_COLORS = { active: 'bg-green-100 text-green-800', inactive: 'bg-red-100 text-red-700', maternity: 'bg-blue-100 text-blue-700' };

export default function EmployeeCard({ empId, onClose }) {
  const [loading, setLoading] = useState(true);
  const [emp, setEmp] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [supReceived, setSupReceived] = useState([]);
  const [supGiven, setSupGiven] = useState([]);

  useEffect(() => {
    if (!empId) return;
    setLoading(true);
    Promise.all([getEmployees(), getAssignments(), getFrameworks(), getTeams(), getSupervisions()])
      .then(([emps, asgns, fws, allTeams, sups]) => {
        const e = emps.find(x => x.id === empId);
        if (!e) { setLoading(false); return; }
        setEmp(e);

        const fwMap = Object.fromEntries(fws.map(f => [f.id, f]));
        const empAsgns = asgns
          .filter(a => a.employeeId === empId && a.frameworkId !== 0)
          .map(a => ({ ...a, framework: fwMap[a.frameworkId] }))
          .filter(a => a.framework);
        setAssignments(empAsgns);

        setTeams(allTeams.filter(t =>
          t.headDisplayName === e.displayName ||
          (t.memberDisplayNames || []).includes(e.displayName)
        ));

        setSupReceived(sups.filter(s => (s.superviseeNames || []).includes(e.displayName)));
        setSupGiven(sups.filter(s => s.supervisorName === e.displayName));
        setLoading(false);
      });
  }, [empId]);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
          <h2 className="text-lg font-bold text-gray-800">
            {loading ? 'טוען...' : emp ? emp.displayName : 'לא נמצא'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl font-bold leading-none">×</button>
        </div>

        {loading && <div className="p-8 text-center text-gray-400">טוען...</div>}
        {!loading && !emp && <div className="p-8 text-center text-red-500">העובד לא נמצא</div>}

        {!loading && emp && (
          <div className="p-6 space-y-5">
            {/* Basic info */}
            <Section title="פרטים">
              <div className="flex flex-wrap gap-3 items-center">
                <span className={`badge ${STATUS_COLORS[emp.status || 'active']}`}>
                  {STATUS_LABELS[emp.status || 'active']}
                </span>
                {emp.isSubstitute && <span className="badge bg-purple-100 text-purple-800">מ"מ</span>}
                <span className="text-sm text-gray-700">{Math.round(emp.ftePercent * 100)}% משרה ({emp.fteHours} ש"ש)</span>
                {emp.phone && <span className="text-sm text-gray-600">📞 {emp.phone}</span>}
                {emp.roleName && <span className="text-sm text-gray-600">תפקיד: {emp.roleName}</span>}
              </div>
              {emp.notes && <p className="text-sm text-gray-500 mt-2 border-t pt-2">{emp.notes}</p>}
            </Section>

            {/* Assignments */}
            <Section title={`שיבוצי מסגרות (${assignments.length})`}>
              {assignments.length === 0
                ? <p className="text-sm text-gray-400">אין שיבוצים</p>
                : <div className="space-y-1">
                    {assignments.map(a => (
                      <div key={a.id} className="flex items-center justify-between text-sm bg-gray-50 rounded px-3 py-1.5">
                        <span className="font-medium text-gray-800">{a.framework.name}</span>
                        <span className="text-gray-500">
                          {a.hours > 0 && <>{a.hours} ש"ש</>}
                          {a.specEdHours > 0 && <> | חינ"מ {a.specEdHours}</>}
                          {a.kinderHours > 0 && <> | גנים {a.kinderHours}</>}
                        </span>
                      </div>
                    ))}
                  </div>
              }
            </Section>

            {/* Teams */}
            <Section title={`צוותים (${teams.length})`}>
              {teams.length === 0
                ? <p className="text-sm text-gray-400">לא משובץ לצוות</p>
                : <div className="space-y-1">
                    {teams.map(t => (
                      <div key={t.id} className="flex items-center gap-2 text-sm bg-gray-50 rounded px-3 py-1.5">
                        <span className={`badge text-xs ${t.type === 'educational' ? 'bg-teal-100 text-teal-800' : 'bg-indigo-100 text-indigo-800'}`}>
                          {t.type === 'educational' ? 'חינוכי' : 'קליני'}
                        </span>
                        {t.headDisplayName === emp.displayName
                          ? <span className="text-gray-700">ראש צוות</span>
                          : <span className="text-gray-600">חבר צוות — ר"צ: {t.headDisplayName}</span>
                        }
                      </div>
                    ))}
                  </div>
              }
            </Section>

            {/* Supervisions received */}
            <Section title={`הדרכות שמקבל (${supReceived.length})`}>
              {supReceived.length === 0
                ? <p className="text-sm text-gray-400">אין הדרכות</p>
                : <div className="space-y-1">
                    {supReceived.map(s => (
                      <div key={s.id} className="text-sm bg-blue-50 rounded px-3 py-1.5">
                        <span className="font-medium text-blue-800">{s.customLabel || s.type}</span>
                        {s.supervisorName && <span className="text-blue-600 mr-2"> — מדריך: {s.supervisorName}</span>}
                        {s.hoursPerSession > 0 && <span className="text-blue-500 text-xs mr-1">({s.hoursPerSession} ש"ש)</span>}
                      </div>
                    ))}
                  </div>
              }
            </Section>

            {/* Supervisions given */}
            <Section title={`הדרכות שנותן (${supGiven.length})`}>
              {supGiven.length === 0
                ? <p className="text-sm text-gray-400">אין הדרכות</p>
                : <div className="space-y-1">
                    {supGiven.map(s => (
                      <div key={s.id} className="text-sm bg-green-50 rounded px-3 py-1.5">
                        <span className="font-medium text-green-800">{s.customLabel || s.type}</span>
                        {(s.superviseeNames || []).length > 0 && (
                          <span className="text-green-600 mr-2"> — מודרכים: {s.superviseeNames.join(', ')}</span>
                        )}
                        {s.hoursPerSession > 0 && <span className="text-green-500 text-xs mr-1">({s.hoursPerSession} ש"ש)</span>}
                      </div>
                    ))}
                  </div>
              }
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">{title}</h3>
      {children}
    </div>
  );
}
