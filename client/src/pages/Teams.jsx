import { useEffect, useState, useContext } from 'react';
import { getTeams, updateTeam, createTeam, deleteTeam, getUnassigned, getEmployees, putExemptions } from '../api';
import { DraftContext } from '../App';
import ClickableName from '../components/ClickableName';

function ExemptableChip({ emp, onExempt }) {
  const [showing, setShowing] = useState(false);
  const [reason, setReason] = useState('');
  const save = () => {
    if (!reason.trim()) return;
    onExempt(emp, reason.trim());
    setShowing(false);
    setReason('');
  };
  return (
    <span className="inline-flex flex-col gap-1">
      <span className="badge bg-yellow-100 text-yellow-800 flex items-center gap-1">
        {emp.displayName}
        <button className="opacity-40 hover:opacity-100 transition-opacity text-xs leading-none pr-0.5" title="הגדר פטור" onClick={() => setShowing(s => !s)}>✕</button>
      </span>
      {showing && (
        <span className="inline-flex items-center gap-1 bg-white border border-yellow-300 rounded px-2 py-1 text-xs">
          <input autoFocus className="outline-none text-gray-800 w-40 bg-transparent placeholder-gray-400" placeholder="סיבה..." value={reason}
            onChange={e => setReason(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setShowing(false); }} />
          <button className="bg-yellow-400 hover:bg-yellow-500 text-white rounded px-2 py-0.5 font-medium" onClick={save}>שמור</button>
          <button className="text-gray-400 hover:text-gray-600" onClick={() => setShowing(false)}>ביטול</button>
        </span>
      )}
    </span>
  );
}

function ExemptedSection({ exemptions, onUnexempt }) {
  const [open, setOpen] = useState(false);
  if (!exemptions.length) return null;
  return (
    <div className="border border-gray-200 rounded text-xs mt-1">
      <button className="w-full flex items-center justify-between px-3 py-1.5 text-gray-500 hover:bg-gray-50" onClick={() => setOpen(o => !o)}>
        <span className="font-medium">פטורים ({exemptions.length})</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="border-t border-gray-100 px-3 py-2 space-y-1 bg-gray-50">
          {exemptions.map(x => (
            <div key={x.empId} className="flex items-baseline gap-2">
              <span className="font-medium text-gray-700">{x.empName}</span>
              <span className="text-gray-400 italic flex-1">{x.reason}</span>
              <button className="text-gray-300 hover:text-red-400 transition-colors" title="בטל פטור" onClick={() => onUnexempt(x.empId)}>↩</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const TYPE_LABELS = { educational: 'חינוכי', clinical: 'קליני' };
const TYPE_COLORS = { educational: 'bg-teal-600', clinical: 'bg-indigo-600' };

export default function Teams() {
  const { isDraft } = useContext(DraftContext);
  const [teams, setTeams] = useState([]);
  const [unassigned, setUnassigned] = useState({ notInEducational: [], notInClinical: [], exemptions: [] });
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

  const handleCreate = async (type) => {
    const team = await createTeam({ type });
    setTeams(prev => [...prev, team]);
    startEdit(team);
  };

  const handleDelete = async (id) => {
    if (!confirm('למחוק צוות זה?')) return;
    await deleteTeam(id);
    setTeams(prev => prev.filter(t => t.id !== id));
    const u = await getUnassigned();
    setUnassigned(u);
  };

  const exemptions = unassigned.exemptions || [];
  const edExemptions = exemptions.filter(x => x.type === 'teamEd');
  const clExemptions = exemptions.filter(x => x.type === 'teamClin');

  const addExemption = async (emp, type, reason) => {
    const next = [...exemptions.filter(x => !(x.empId === emp.id && x.type === type)),
      { empId: emp.id, empName: emp.displayName, type, reason }];
    await putExemptions(next);
    const u = await getUnassigned();
    setUnassigned(u);
  };

  const removeExemption = async (empId, type) => {
    const next = exemptions.filter(x => !(x.empId === empId && x.type === type));
    await putExemptions(next);
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
      {(unassigned.notInEducational.length > 0 || unassigned.notInClinical.length > 0 || edExemptions.length > 0 || clExemptions.length > 0) && (
        <div className="space-y-2 mb-4">
          {(unassigned.notInEducational.length > 0 || edExemptions.length > 0) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
              {unassigned.notInEducational.length > 0 && (
                <>
                  <p className="text-sm font-semibold text-yellow-800 mb-1">⚠️ לא שובצו לצוות חינוכי ({unassigned.notInEducational.length}):</p>
                  <div className="flex flex-wrap gap-1.5 items-start">
                    {unassigned.notInEducational.map(e => (
                      <ExemptableChip key={e.id} emp={e} onExempt={(emp, reason) => addExemption(emp, 'teamEd', reason)} />
                    ))}
                  </div>
                </>
              )}
              <ExemptedSection exemptions={edExemptions} onUnexempt={(empId) => removeExemption(empId, 'teamEd')} />
            </div>
          )}
          {(unassigned.notInClinical.length > 0 || clExemptions.length > 0) && (
            <div className="bg-orange-50 border border-orange-200 rounded p-3">
              {unassigned.notInClinical.length > 0 && (
                <>
                  <p className="text-sm font-semibold text-orange-800 mb-1">⚠️ לא שובצו לצוות קליני ({unassigned.notInClinical.length}):</p>
                  <div className="flex flex-wrap gap-1.5 items-start">
                    {unassigned.notInClinical.map(e => (
                      <ExemptableChip key={e.id} emp={e} onExempt={(emp, reason) => addExemption(emp, 'teamClin', reason)} />
                    ))}
                  </div>
                </>
              )}
              <ExemptedSection exemptions={clExemptions} onUnexempt={(empId) => removeExemption(empId, 'teamClin')} />
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Educational teams */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-teal-700 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-teal-600 inline-block"></span>
              צוותים חינוכיים
            </h2>
            {isDraft && <button className="btn-secondary text-xs py-1" onClick={() => handleCreate('educational')}>+ צוות חדש</button>}
          </div>
          <div className="space-y-4">
            {edTeams.map(team => <TeamCard key={team.id} team={team} editing={editingId === team.id} editData={editData} setEditData={setEditData} onEdit={startEdit} onSave={saveEdit} onCancel={() => setEditingId(null)} isDraft={isDraft} onDelete={handleDelete} />)}
          </div>
        </div>

        {/* Clinical teams */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-indigo-700 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-indigo-600 inline-block"></span>
              צוותים קליניים
            </h2>
            {isDraft && <button className="btn-secondary text-xs py-1" onClick={() => handleCreate('clinical')}>+ צוות חדש</button>}
          </div>
          <div className="space-y-4">
            {clTeams.map(team => <TeamCard key={team.id} team={team} editing={editingId === team.id} editData={editData} setEditData={setEditData} onEdit={startEdit} onSave={saveEdit} onCancel={() => setEditingId(null)} isDraft={isDraft} onDelete={handleDelete} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

function TeamCard({ team, editing, editData, setEditData, onEdit, onSave, onCancel, isDraft, onDelete }) {
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
          <ClickableName name={team.headDisplayName} className="font-semibold mr-1 text-white" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs opacity-75">{allMembers.length} חברים</span>
          <button className="text-white/80 hover:text-white text-xs" onClick={() => onEdit(team)}>✏️ עריכה</button>
          {isDraft && <button className="text-white/60 hover:text-red-300 text-xs" onClick={() => onDelete(team.id)}>🗑️</button>}
        </div>
      </div>
      <div className="p-3 bg-white">
        <div className="flex flex-wrap gap-1">
          <span className={`badge bg-${color}-100 text-${color}-800 font-semibold`}>
            <ClickableName name={team.headDisplayName} /> (ר"צ)
          </span>
          {(team.memberDisplayNames || []).map((name, i) => (
            <span key={i} className="badge bg-gray-100 text-gray-700">
              <ClickableName name={name} />
            </span>
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
