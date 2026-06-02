import { useEffect, useState } from 'react';
import { getTeams, updateTeam, getUnassigned, getEmployees } from '../api';

const TYPE_LABELS = { educational: 'חינוכי', clinical: 'קליני' };
const TYPE_COLORS = { educational: 'bg-teal-600', clinical: 'bg-indigo-600' };

export default function Teams() {
  const [teams, setTeams] = useState([]);
  const [unassigned, setUnassigned] = useState({ notInEducational: [], notInClinical: [] });
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  const load = async () => {
    const [t, u, emps] = await Promise.all([getTeams(), getUnassigned(), getEmployees()]);
    setTeams(t);
    setUnassigned(u);
    setEmployees(emps);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const startEdit = (team) => {
    setEditingId(team.id);
    setEditData({
      headDisplayName: team.headDisplayName,
      memberNames: (team.memberDisplayNames || []).join('\n'),
      externalNames: (team.externalMembers || []).join('\n'),
    });
  };

  const saveEdit = async () => {
    const updated = await updateTeam(editingId, {
      headDisplayName: editData.headDisplayName,
      memberDisplayNames: editData.memberNames.split('\n').map(s => s.trim()).filter(Boolean),
      externalMembers: editData.externalNames.split('\n').map(s => s.trim()).filter(Boolean),
    });
    setTeams(prev => prev.map(t => t.id === editingId ? updated : t));
    setEditingId(null);
    const u = await getUnassigned();
    setUnassigned(u);
  };

  if (loading) return <div className="p-6 text-gray-500">טוען...</div>;

  const edTeams = teams.filter(t => t.type === 'educational');
  const clTeams = teams.filter(t => t.type === 'clinical');

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-4">צוותים</h1>

      {/* Alerts */}
      {unassigned.notInEducational.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
          <p className="text-sm font-semibold text-yellow-800 mb-1">⚠️ לא שובצו לצוות חינוכי ({unassigned.notInEducational.length}):</p>
          <div className="flex flex-wrap gap-1">
            {unassigned.notInEducational.map(e => (
              <span key={e.id} className="badge bg-yellow-100 text-yellow-800">{e.displayName}</span>
            ))}
          </div>
        </div>
      )}
      {unassigned.notInClinical.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded p-3 mb-4">
          <p className="text-sm font-semibold text-orange-800 mb-1">⚠️ לא שובצו לצוות קליני ({unassigned.notInClinical.length}):</p>
          <div className="flex flex-wrap gap-1">
            {unassigned.notInClinical.map(e => (
              <span key={e.id} className="badge bg-orange-100 text-orange-800">{e.displayName}</span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Educational teams */}
        <div>
          <h2 className="text-base font-bold text-teal-700 mb-3 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-teal-600 inline-block"></span>
            צוותים חינוכיים
          </h2>
          <div className="space-y-4">
            {edTeams.map(team => <TeamCard key={team.id} team={team} editing={editingId === team.id} editData={editData} setEditData={setEditData} onEdit={startEdit} onSave={saveEdit} onCancel={() => setEditingId(null)} />)}
          </div>
        </div>

        {/* Clinical teams */}
        <div>
          <h2 className="text-base font-bold text-indigo-700 mb-3 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-indigo-600 inline-block"></span>
            צוותים קליניים
          </h2>
          <div className="space-y-4">
            {clTeams.map(team => <TeamCard key={team.id} team={team} editing={editingId === team.id} editData={editData} setEditData={setEditData} onEdit={startEdit} onSave={saveEdit} onCancel={() => setEditingId(null)} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

function TeamCard({ team, editing, editData, setEditData, onEdit, onSave, onCancel }) {
  const color = team.type === 'educational' ? 'teal' : 'indigo';
  const allMembers = [team.headDisplayName, ...(team.memberDisplayNames || [])];
  const extMembers = team.externalMembers || [];

  if (editing) {
    return (
      <div className={`border-2 border-${color}-300 rounded-lg p-4 bg-${color}-50`}>
        <div className="mb-3">
          <label className="block text-xs font-semibold text-gray-600 mb-1">ראש צוות</label>
          <input className="input w-full" value={editData.headDisplayName} onChange={e => setEditData(p => ({...p, headDisplayName: e.target.value}))} />
        </div>
        <div className="mb-3">
          <label className="block text-xs font-semibold text-gray-600 mb-1">חברי צוות (שם אחד בכל שורה)</label>
          <textarea className="input w-full h-40 text-sm" value={editData.memberNames} onChange={e => setEditData(p => ({...p, memberNames: e.target.value}))} />
        </div>
        <div className="mb-3">
          <label className="block text-xs font-semibold text-gray-600 mb-1">חיצוניים (שם אחד בכל שורה)</label>
          <textarea className="input w-full h-16 text-sm" value={editData.externalNames} onChange={e => setEditData(p => ({...p, externalNames: e.target.value}))} />
        </div>
        <div className="flex gap-2">
          <button className="btn-primary" onClick={onSave}>שמור</button>
          <button className="btn-secondary" onClick={onCancel}>ביטול</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`border border-${color}-200 rounded-lg overflow-hidden`}>
      <div className={`bg-${color}-600 text-white px-4 py-2 flex items-center justify-between`}>
        <div>
          <span className="text-xs opacity-75">ראש צוות:</span>
          <span className="font-semibold mr-1">{team.headDisplayName}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs opacity-75">{allMembers.length} חברים</span>
          <button className="text-white/80 hover:text-white text-xs" onClick={() => onEdit(team)}>✏️ עריכה</button>
        </div>
      </div>
      <div className="p-3 bg-white">
        <div className="flex flex-wrap gap-1">
          <span className={`badge bg-${color}-100 text-${color}-800 font-semibold`}>
            {team.headDisplayName} (ר"צ)
          </span>
          {(team.memberDisplayNames || []).map((name, i) => (
            <span key={i} className="badge bg-gray-100 text-gray-700">{name}</span>
          ))}
        </div>
        {extMembers.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            <span className="text-xs text-gray-500 ml-1">חיצוניים:</span>
            {extMembers.map((name, i) => (
              <span key={i} className="badge bg-pink-100 text-pink-700 mr-1">{name}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
