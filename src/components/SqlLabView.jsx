import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Play, 
  Copy, 
  Check, 
  Terminal, 
  Code2, 
  Layers, 
  FileText, 
  Sparkles,
  AlertCircle
} from 'lucide-react';

export default function SqlLabView({ onShowToast }) {
  const [examples, setExamples] = useState([]);
  const [selectedExample, setSelectedExample] = useState(null);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [running, setRunning] = useState(false);
  const [queryResult, setQueryResult] = useState(null);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    fetch('/api/sql-examples')
      .then((res) => res.json())
      .then((data) => {
        setExamples(data);
        if (data.length > 0) {
          const firstSelect = data.find((e) => e.isExecutable) || data[0];
          setSelectedExample(firstSelect);
        }
      })
      .catch((err) => {
        setError('Failed to fetch SQL examples from server.');
      });
  }, []);

  const categories = ['ALL', 'DDL', 'DML', 'JOIN', 'Aggregate Functions', 'Subqueries'];

  const filteredExamples = examples.filter((e) => {
    if (activeCategory === 'ALL') return true;
    return e.category === activeCategory;
  });

  const handleCopy = (sql, id) => {
    navigator.clipboard.writeText(sql);
    setCopiedId(id);
    onShowToast('SQL statement copied to clipboard!', 'info');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExecute = async (example) => {
    if (!example.isExecutable) return;
    setRunning(true);
    setError('');
    setQueryResult(null);

    try {
      const res = await fetch(`/api/sql-examples/${example.id}/run`, {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Execution failed');
      setQueryResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-slate-800">SQL Demonstration Workbench</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
              Interactive
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Execute and inspect queries across relations (DDL, DML, Multi-table JOINs, Aggregates, Subqueries)
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              activeCategory === cat
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5 space-y-3 max-h-[750px] overflow-y-auto pr-1">
          {filteredExamples.map((ex) => {
            const isSelected = selectedExample?.id === ex.id;
            return (
              <div
                key={ex.id}
                onClick={() => {
                  setSelectedExample(ex);
                  setQueryResult(null);
                  setError('');
                }}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-white border-indigo-600 ring-2 ring-indigo-500/10 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold uppercase">
                    {ex.category}
                  </span>
                  {ex.isExecutable ? (
                    <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Executable
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                      Syntax Only
                    </span>
                  )}
                </div>

                <h4 className="text-xs font-semibold text-slate-900 mt-2">{ex.title}</h4>
                <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  {ex.description}
                </p>

                <div className="mt-2 text-[11px] font-mono text-slate-400 truncate bg-slate-50 p-1.5 rounded border border-slate-100">
                  {ex.sql.split('\n')[0]}
                </div>
              </div>
            );
          })}
        </div>

        <div className="lg:col-span-7 space-y-4">
          {selectedExample ? (
            <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-md overflow-hidden text-slate-200">
              <div className="px-4 py-3 bg-slate-800/80 border-b border-slate-700/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-semibold text-slate-100">{selectedExample.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(selectedExample.sql, selectedExample.id)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 text-[11px] font-medium text-slate-200 transition-colors"
                  >
                    {copiedId === selectedExample.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy SQL</span>
                      </>
                    )}
                  </button>

                  {selectedExample.isExecutable && (
                    <button
                      onClick={() => handleExecute(selectedExample)}
                      disabled={running}
                      className="flex items-center gap-1.5 px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-[11px] font-semibold text-white shadow-sm transition-colors disabled:opacity-50"
                    >
                      <Play className={`w-3.5 h-3.5 ${running ? 'animate-spin' : ''}`} />
                      <span>{running ? 'Executing...' : 'Run in SQLite'}</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="p-4 bg-slate-950/90 font-mono text-xs overflow-x-auto text-emerald-400 leading-relaxed border-b border-slate-800">
                <pre>{selectedExample.sql}</pre>
              </div>

              <div className="p-3 bg-slate-900 text-xs text-slate-400 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  <strong className="text-slate-200 font-medium">DBMS Concept:</strong> {selectedExample.description}
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
              Select a query from the catalog to inspect.
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {queryResult && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-semibold text-slate-800">Query Output Dataset</span>
                </div>
                <span className="text-[11px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {queryResult.rowCount} tuple{queryResult.rowCount === 1 ? '' : 's'} returned
                </span>
              </div>

              <div className="overflow-x-auto max-h-[350px]">
                {queryResult.rows.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    Query executed successfully. 0 rows returned.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        {queryResult.columns.map((col) => (
                          <th key={col} className="py-2.5 px-3 whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {queryResult.rows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-50">
                          {queryResult.columns.map((col) => (
                            <td key={col} className="py-2 px-3 whitespace-nowrap">
                              {row[col] !== null && row[col] !== undefined ? String(row[col]) : 'NULL'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
