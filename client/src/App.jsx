import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { createContext, useContext, useEffect, useState } from 'react';
import WorkPlan from './pages/WorkPlan';
import Schools from './pages/Schools';
import Kindergartens from './pages/Kindergartens';
import Teams from './pages/Teams';
import Standards from './pages/Standards';
import Supervisions from './pages/Supervisions';
import { getDraftStatus, activateDraft, approveDraft, discardDraft } from './api';

export const DraftContext = createContext({ isDraft: false });

const NAV = [
  { to: '/standards',     label: 'תקנים' },
  { to: '/work-plan',     label: 'תוכנית עבודה' },
  { to: '/schools',       label: 'שיבוצי בתי ספר' },
  { to: '/kindergartens', label: 'שיבוצי גנים' },
  { to: '/teams',         label: 'צוותים' },
  { to: '/supervisions',  label: 'הדרכות' },
];

export default function App() {
  const [isDraft, setIsDraft] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);

  useEffect(() => {
    getDraftStatus().then(s => setIsDraft(s.active)).catch(() => {});
  }, []);

  const handleActivate = async () => {
    setDraftLoading(true);
    await activateDraft();
    setIsDraft(true);
    setDraftLoading(false);
  };

  const handleApprove = async () => {
    if (!confirm('לאשר את השיבוץ העתידי ולהפוך אותו לנוכחי?')) return;
    setDraftLoading(true);
    await approveDraft();
    setIsDraft(false);
    setDraftLoading(false);
    window.location.reload();
  };

  const handleDiscard = async () => {
    if (!confirm('לבטל את הטיוטה? כל השינויים יימחקו.')) return;
    setDraftLoading(true);
    await discardDraft();
    setIsDraft(false);
    setDraftLoading(false);
    window.location.reload();
  };

  return (
    <DraftContext.Provider value={{ isDraft }}>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <nav className={`text-white shadow-md ${isDraft ? 'bg-amber-700' : 'bg-blue-800'}`}>
          <div className="flex items-center gap-1 px-4 py-0">
            <span className="font-bold text-lg px-3 py-3 ml-4 border-l border-white/30">
              מערכת שיבוץ פסיכולוגים
            </span>
            {NAV.map(n => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  `px-4 py-3 text-sm font-medium transition-colors hover:bg-white/20 ${
                    isActive ? 'bg-white/30 border-b-2 border-white' : ''
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
            <div className="mr-auto flex items-center gap-2 py-2">
              {isDraft ? (
                <>
                  <span className="text-xs bg-amber-900/50 px-2 py-1 rounded font-semibold">✏️ מצב טיוטה</span>
                  <button className="btn-primary text-xs py-1 bg-green-600 hover:bg-green-700 border-green-700" onClick={handleApprove} disabled={draftLoading}>אשר שיבוץ</button>
                  <button className="btn-secondary text-xs py-1 bg-white/20 hover:bg-white/30 border-white/40 text-white" onClick={handleDiscard} disabled={draftLoading}>בטל טיוטה</button>
                </>
              ) : (
                <button className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded border border-white/30 font-medium" onClick={handleActivate} disabled={draftLoading}>
                  📋 פתח תכנון עתידי
                </button>
              )}
            </div>
          </div>
        </nav>

        {isDraft && (
          <div className="bg-amber-100 border-b border-amber-300 px-4 py-1.5 text-sm text-amber-800 font-medium text-center">
            אתה בוחן שיבוץ עתידי — השינויים לא ישפיעו על השיבוץ הנוכחי עד שתאשר
          </div>
        )}

        <main className="flex-1 p-4">
          <Routes>
            <Route index element={<Navigate to="/standards" replace />} />
            <Route path="/standards"     element={<Standards />} />
            <Route path="/work-plan"     element={<WorkPlan />} />
            <Route path="/schools"       element={<Schools />} />
            <Route path="/kindergartens" element={<Kindergartens />} />
            <Route path="/teams"         element={<Teams />} />
            <Route path="/supervisions"  element={<Supervisions />} />
            <Route path="*"              element={<Navigate to="/standards" replace />} />
          </Routes>
        </main>
      </div>
    </DraftContext.Provider>
  );
}
