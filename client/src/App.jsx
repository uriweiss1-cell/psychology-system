import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import WorkPlan from './pages/WorkPlan';
import Schools from './pages/Schools';
import Kindergartens from './pages/Kindergartens';
import Teams from './pages/Teams';
import Standards from './pages/Standards';
import Supervisions from './pages/Supervisions';

const NAV = [
  { to: '/standards',     label: 'תקנים' },
  { to: '/work-plan',     label: 'תוכנית עבודה' },
  { to: '/schools',       label: 'שיבוצי בתי ספר' },
  { to: '/kindergartens', label: 'שיבוצי גנים' },
  { to: '/teams',         label: 'צוותים' },
  { to: '/supervisions',  label: 'הדרכות' },
];

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-blue-800 text-white shadow-md">
        <div className="flex items-center gap-1 px-4 py-0">
          <span className="font-bold text-lg px-3 py-3 ml-4 border-l border-blue-600">
            מערכת שיבוץ פסיכולוגים
          </span>
          {NAV.map(n => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `px-4 py-3 text-sm font-medium transition-colors hover:bg-blue-700 ${
                  isActive ? 'bg-blue-900 border-b-2 border-white' : ''
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </div>
      </nav>
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
  );
}
