import { useState, useRef } from 'react';
import { previewImport, applyImport } from '../api';

export default function ImportModal({ type, label, columns, onDone, onClose }) {
  const [step, setStep] = useState('upload'); // upload | preview | done
  const [rows, setRows] = useState([]);
  const [toDeleteIds, setToDeleteIds] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef();

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const data = await previewImport(type, file);
      setRows(data.rows);
      setToDeleteIds(data.toDeleteIds || []);
      setStep('preview');
    } catch (err) {
      setError(err.response?.data?.error || 'שגיאה בקריאת הקובץ');
    }
    setLoading(false);
  };

  const handleApply = async () => {
    setLoading(true);
    try {
      const data = await applyImport(type, rows.filter(r => r.selected !== false), toDeleteIds);
      setResult(data);
      setStep('done');
      onDone?.();
    } catch (err) {
      setError(err.response?.data?.error || 'שגיאה בהחלה');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h2 className="font-bold text-gray-800">ייבוא {label}</h2>
          <button className="text-gray-400 hover:text-gray-600 text-xl" onClick={onClose}>✕</button>
        </div>

        <div className="flex-1 overflow-auto p-5">
          {step === 'upload' && (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-2">העלה קובץ xlsx עם העמודות הבאות:</p>
              <p className="text-sm text-gray-500 mb-6 font-mono bg-gray-50 rounded p-2">{columns.join(' | ')}</p>
              <button className="btn-primary" onClick={() => fileRef.current.click()} disabled={loading}>
                {loading ? 'קורא...' : 'בחר קובץ'}
              </button>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
              {error && <p className="text-red-600 mt-3 text-sm">{error}</p>}
            </div>
          )}

          {step === 'preview' && (
            <div>
              <p className="text-sm text-gray-600 mb-3">נמצאו <strong>{rows.length}</strong> שורות. בדוק ואשר:</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border border-gray-200 rounded">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="table-header text-center w-8">
                        <input type="checkbox" defaultChecked onChange={e => setRows(r => r.map(x => ({...x, selected: e.target.checked})))} />
                      </th>
                      {columns.map(c => <th key={c} className="table-header">{c}</th>)}
                      {rows[0]?.action && <th className="table-header text-center">פעולה</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={i} className={`hover:bg-gray-50 ${row.selected === false ? 'opacity-40' : ''}`}>
                        <td className="table-cell text-center">
                          <input type="checkbox" checked={row.selected !== false} onChange={e => setRows(r => r.map((x, j) => j === i ? {...x, selected: e.target.checked} : x))} />
                        </td>
                        {columns.map(c => {
                          const key = Object.keys(row).find(k => k === c) || c;
                          return <td key={c} className="table-cell">{String(row[key] ?? '')}</td>;
                        })}
                        {row.action && (
                          <td className="table-cell text-center">
                            <span className={`badge ${
                              row.action === 'create' ? 'bg-green-100 text-green-700' :
                              row.action === 'remove' ? 'bg-red-100 text-red-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {row.action === 'create' ? 'חדש' : row.action === 'remove' ? 'הסרה' : 'עדכון'}
                            </span>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {error && <p className="text-red-600 mt-3 text-sm">{error}</p>}
            </div>
          )}

          {step === 'done' && (
            <div className="text-center py-8">
              <p className="text-green-600 text-lg font-semibold mb-2">✓ יובא בהצלחה</p>
              {result?.created > 0 && <p className="text-sm text-gray-600">נוצרו {result.created} רשומות חדשות</p>}
              {result?.updated > 0 && <p className="text-sm text-gray-600">עודכנו {result.updated} רשומות</p>}
              {result?.removed > 0 && <p className="text-sm text-gray-600">הוגדרו כלא פעילים {result.removed} עובדים</p>}
              {result?.deleted > 0 && <p className="text-sm text-gray-600">הוסרו {result.deleted} עובדים</p>}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t">
          {step === 'preview' && (
            <button className="btn-primary" onClick={handleApply} disabled={loading}>
              {loading ? 'מחיל...' : 'החל שינויים'}
            </button>
          )}
          <button className="btn-secondary" onClick={onClose}>
            {step === 'done' ? 'סגור' : 'ביטול'}
          </button>
        </div>
      </div>
    </div>
  );
}
