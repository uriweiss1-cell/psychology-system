import { useEffect, useState } from 'react';
import { getAssignmentSummary, getEmployees, getAssignments, updateAssignment, getFrameworks, createFramework, updateFramework } from '../api';

const SECTOR_COLORS = {
  'ממלכתי':      'bg-blue-100 text-blue-800',
  'ממ"ד':        'bg-green-100 text-green-800',
  'חמ"ד':        'bg-yellow-100 text-yellow-800',
  'חינוך מיוחד': 'bg-purple-100 text-purple-800',
  'חרדי':        'bg-gray-100 text-gray-700',
};

const SUBTYPE_ORDER = ['יסודי', 'חטיבה', 'תיכון', ''];

export default function Schools() {
  const [summary, setSummary] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [frameworks, setFrameworks] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [editingFw, setEditingFw] = useState(null);

  const load = async () => {
    const [sum, emps, fws, asgns] = await Promise.all([
      getAssignmentSummary(), getEmployees(), getFrameworks(), getAssignments()
    ]);
    setSummary(sum);
    setEmployees(emps);
    setFrameworks(fws);
    setAssignments(asgns);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const getStatusBg = (fw) => {
    if (!fw.allocatedHours) return '';
    const ratio = fw.totalAssigned / fw.allocatedHours;
    if (ratio > 1.05) return 'bg-red-50';
    if (ratio > 0.95) return 'bg-green-50';
    if (fw.totalAssigned === 0) return 'bg-gray-50';
    return 'bg-yellow-50';
  };

  const grouped = SUBTYPE_ORDER.reduce((acc, sub) => {
    const items = summary
      .filter(fw => {
        const matchSub = fw.subType === sub || (!fw.subType && sub === '');
        const matchFilter = !filter || fw.name.includes(filter);
        const matchType = filterType === 'all' || fw.sector === filterType ||
          (filterType === 'special_ed' && fw.type === 'special_ed');
        return matchSub && matchFilter && matchType;
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'he'));
    if (items.length) acc[sub || 'חינוך מיוחד'] = items;
    return acc;
  }, {});

  if (loading) return <div className="p-6 text-gray-500">טוען...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-800">שיבוצי בתי ספר</h1>
        <div className="flex gap-2 items-center">
          <select className="input" value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="all">הכל</option>
            <option value="ממלכתי">ממלכתי</option>
            <option value="ממ&quot;ד">ממ"ד</option>
            <option value="חמ&quot;ד">חמ"ד</option>
            <option value="special_ed">חינוך מיוחד</option>
          </select>
          <input className="input" placeholder="חיפוש מסגרת..." value={filter} onChange={e => setFilter(e.target.value)} />
        </div>
      </div>

      <div className="mb-3 flex gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100 inline-block"></span> מאויש במלואו</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-100 inline-block"></span> אויוש חלקית</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 inline-block"></span> חריגה</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-100 inline-block"></span> לא אויש</span>
      </div>

      {Object.entries(grouped).map(([group, items]) => (
        <div key={group} className="mb-6">
          <h2 className="text-sm font-bold text-gray-600 mb-2 border-b pb-1">
            {group === 'יסודי' ? 'יסודי' : group === 'חטיבה' ? 'חטיבות' : group === 'תיכון' ? 'תיכונים' : group}
            <span className="font-normal text-gray-400 mr-2">({items.length})</span>
          </h2>
          <div className="bg-white rounded shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="table-header">שם מסגרת</th>
                  <th className="table-header">מגזר</th>
                  <th className="table-header text-center">שעות מוקצות</th>
                  <th className="table-header text-center">שעות בי"ס</th>
                  <th className="table-header text-center">שעות ח"מ</th>
                  <th className="table-header text-center">סה"כ שובץ</th>
                  <th className="table-header">פסיכולוגים</th>
                </tr>
              </thead>
              <tbody>
                {items.map(fw => {
                  const asgns = assignments.filter(a => a.frameworkId === fw.id);
                  return (
                    <tr key={fw.id} className={`hover:bg-gray-50 ${getStatusBg(fw)}`}>
                      <td className="table-cell font-medium">{fw.name}</td>
                      <td className="table-cell">
                        <span className={`badge ${SECTOR_COLORS[fw.sector] || 'bg-gray-100'}`}>{fw.sector}</span>
                      </td>
                      <td className="table-cell text-center text-gray-500">{fw.allocatedHours ?? '—'}</td>
                      <td className="table-cell text-center">{fw.assignedSchoolHours || 0}</td>
                      <td className="table-cell text-center">{fw.assignedSpecEdHours || 0}</td>
                      <td className="table-cell text-center font-semibold">
                        {fw.totalAssigned || 0}
                        {fw.allocatedHours && (
                          <span className="text-xs text-gray-400 mr-1">/ {fw.allocatedHours}</span>
                        )}
                      </td>
                      <td className="table-cell">
                        {asgns.map(a => {
                          const emp = employees.find(e => e.id === a.employeeId);
                          return (
                            <span key={a.id} className="badge bg-blue-100 text-blue-800 ml-1">
                              {emp?.displayName} ({(a.hours||0)+(a.specEdHours||0)}ש')
                            </span>
                          );
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
