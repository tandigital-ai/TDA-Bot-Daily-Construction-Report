// Tab Bảng Kết Quả — filter, sort, inline edit, export
const { useState: useStateR, useMemo: useMemoR, useEffect: useEffectR } = React;

function ResultTab({ rows, setRows, t }) {
  const [search, setSearch] = useStateR("");
  const [filters, setFilters] = useStateR({ date: "", shift: "", task_type: "", area: "", vehicle_type: "", worker: "", status: "" });
  const [sortBy, setSortBy] = useStateR({ col: "date", dir: "asc" });
  const [editing, setEditing] = useStateR(null); // {rowIdx, col}
  const [showAnomalies, setShowAnomalies] = useStateR(false);

  // Danh sách unique cho dropdown filter
  const uniqueVals = useMemoR(() => {
    const u = { date: new Set(), shift: new Set(), task_type: new Set(), area: new Set(), vehicle_type: new Set(), worker: new Set(), status: new Set() };
    for (const r of rows) {
      for (const k of Object.keys(u)) if (r[k]) u[k].add(r[k]);
    }
    const out = {};
    for (const [k, v] of Object.entries(u)) out[k] = [...v].sort();
    return out;
  }, [rows]);

  const filtered = useMemoR(() => {
    let out = [...rows];
    // Filter
    for (const [k, v] of Object.entries(filters)) {
      if (v) out = out.filter(r => r[k] === v);
    }
    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter(r => Object.values(r).some(v => String(v).toLowerCase().includes(q)));
    }
    // Anomalies
    if (showAnomalies) {
      out = out.filter(r => !r.worker || !r.vehicle_id || !r.date || r.note?.includes("chưa phân công"));
    }
    // Sort
    if (sortBy.col) {
      out.sort((a, b) => {
        const va = a[sortBy.col] || "";
        const vb = b[sortBy.col] || "";
        if (va < vb) return sortBy.dir === "asc" ? -1 : 1;
        if (va > vb) return sortBy.dir === "asc" ? 1 : -1;
        return 0;
      });
    }
    return out;
  }, [rows, filters, search, sortBy, showAnomalies]);

  const toggleSort = (col) => {
    setSortBy(prev => prev.col === col ? { col, dir: prev.dir === "asc" ? "desc" : "asc" } : { col, dir: "asc" });
  };

  const updateCell = (rowGlobalIdx, col, value) => {
    setRows(prev => {
      const next = [...prev];
      next[rowGlobalIdx] = { ...next[rowGlobalIdx], [col]: value };
      return next;
    });
  };

  const deleteRow = (rowGlobalIdx) => {
    if (!confirm("Xóa dòng này?")) return;
    setRows(prev => prev.filter((_, i) => i !== rowGlobalIdx));
  };

  const isAnomaly = (r) => !r.worker || !r.vehicle_id || !r.date || r.note?.includes("chưa phân công");

  const cols = [
    { key: "date", label: t("col_date"), w: "w-28" },
    { key: "shift", label: t("col_shift"), w: "w-16" },
    { key: "period", label: t("col_period"), w: "w-16" },
    { key: "task_type", label: t("col_task_type"), w: "w-32" },
    { key: "task_description", label: t("col_task_description"), w: "min-w-[280px]" },
    { key: "area", label: t("col_area"), w: "w-28" },
    { key: "ward", label: t("col_ward"), w: "w-28" },
    { key: "street", label: t("col_street"), w: "w-40" },
    { key: "vehicle_id", label: t("col_vehicle_id"), w: "w-20" },
    { key: "vehicle_type", label: t("col_vehicle_type"), w: "w-24" },
    { key: "trips", label: t("col_trips"), w: "w-16" },
    { key: "worker", label: t("col_worker"), w: "w-28" },
    { key: "note", label: t("col_note"), w: "min-w-[180px]" },
    { key: "status", label: t("col_status"), w: "w-28" },
  ];

  const statusColor = (s) => {
    if (s === "Hoàn thành" || s === "Done") return "bg-green-100 text-green-800";
    if (s === "Đang thực hiện" || s === "In progress") return "bg-blue-100 text-blue-800";
    if (s === "Hủy" || s === "Cancelled") return "bg-red-100 text-red-800";
    return "bg-slate-100 text-slate-700";
  };

  const taskTypeColor = (t) => {
    if (t === "Vét máng") return "bg-purple-100 text-purple-800";
    if (t === "Nạo vét LHM") return "bg-cyan-100 text-cyan-800";
    if (t === "Sửa chữa") return "bg-amber-100 text-amber-800";
    if (t === "Xử lý sự cố 1022") return "bg-red-100 text-red-800";
    if (t === "Lấy cấu kiện") return "bg-emerald-100 text-emerald-800";
    if (t === "Chở vật tư") return "bg-indigo-100 text-indigo-800";
    return "bg-slate-100 text-slate-700";
  };

  if (rows.length === 0) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">{t("tab_result")}</h1>
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center text-slate-500">
          <div className="text-5xl mb-4">📭</div>
          <div className="text-base">{t("no_data")}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-full">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("tab_result")}</h1>
          <div className="text-sm text-slate-500 mt-0.5">
            {t("total_rows")}: <span className="font-semibold text-blue-700">{filtered.length}</span>
            {filtered.length !== rows.length && <span className="text-slate-400"> / {rows.length}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => window.Exporter.exportXlsx(rows)} className="text-xs px-3 py-2 rounded-md bg-green-600 hover:bg-green-700 text-white font-medium">{t("export_xlsx")}</button>
          <button onClick={() => window.Exporter.exportJson(rows)} className="text-xs px-3 py-2 rounded-md bg-slate-700 hover:bg-slate-800 text-white font-medium">{t("export_json")}</button>
          <button onClick={() => window.Exporter.exportPdf(filtered, t)} className="text-xs px-3 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white font-medium">{t("export_pdf")}</button>
          <button onClick={() => window.Exporter.copyToClipboard(filtered)} className="text-xs px-3 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium">{t("copy_table")}</button>
          <button
            onClick={() => { if (confirm(`Xóa toàn bộ ${rows.length} dòng?`)) setRows([]); }}
            className="text-xs px-3 py-2 rounded-md bg-white border border-slate-300 hover:bg-red-50 hover:text-red-700 hover:border-red-300 text-slate-600 font-medium"
          >🗑️ Xóa tất cả</button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-slate-200 p-3 mb-4">
        <div className="grid grid-cols-8 gap-2 items-end">
          <div className="col-span-2">
            <label className="text-[11px] text-slate-500 block mb-0.5">🔍 {t("search")}</label>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t("search")} className="w-full text-sm border border-slate-300 rounded px-2 py-1.5" />
          </div>
          {["date", "shift", "task_type", "area", "vehicle_type", "worker"].map(f => (
            <div key={f}>
              <label className="text-[11px] text-slate-500 block mb-0.5">{t("col_" + f)}</label>
              <select value={filters[f]} onChange={e => setFilters({...filters, [f]: e.target.value})} className="w-full text-xs border border-slate-300 rounded px-1.5 py-1.5 bg-white">
                <option value="">{t("filter_all")}</option>
                {uniqueVals[f].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          ))}
        </div>
        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
            <input type="checkbox" checked={showAnomalies} onChange={e => setShowAnomalies(e.target.checked)} className="accent-red-600" />
            <span>Chỉ hiện dòng bất thường (thiếu người/xe/ngày)</span>
          </label>
          <button onClick={() => { setFilters({ date:"",shift:"",task_type:"",area:"",vehicle_type:"",worker:"",status:"" }); setSearch(""); setShowAnomalies(false); }} className="text-xs text-blue-600 hover:underline ml-auto">Xóa bộ lọc</button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[calc(100vh-260px)] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-100 sticky top-0 z-10">
              <tr>
                <th className="w-10 px-2 py-2 text-center text-slate-600 font-medium border-b border-slate-200">#</th>
                {cols.map(c => (
                  <th
                    key={c.key}
                    onClick={() => toggleSort(c.key)}
                    className={`${c.w} px-2 py-2 text-left text-slate-700 font-semibold border-b border-slate-200 cursor-pointer hover:bg-slate-200 whitespace-nowrap`}
                  >
                    {c.label}
                    {sortBy.col === c.key && (
                      <span className="ml-1 text-blue-600">{sortBy.dir === "asc" ? "▲" : "▼"}</span>
                    )}
                  </th>
                ))}
                <th className="w-14 px-2 py-2 text-center text-slate-600 font-medium border-b border-slate-200">{t("col_actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => {
                const globalIdx = rows.indexOf(row);
                const anomaly = isAnomaly(row);
                return (
                  <tr key={globalIdx} className={`${anomaly ? "bg-red-50 hover:bg-red-100" : (i % 2 === 0 ? "bg-white" : "bg-slate-50")} hover:bg-blue-50 transition-colors`}>
                    <td className="px-2 py-1.5 text-center text-slate-400 border-b border-slate-100">{i + 1}</td>
                    {cols.map(c => {
                      const val = row[c.key];
                      const isEditing = editing?.rowIdx === globalIdx && editing?.col === c.key;
                      return (
                        <td
                          key={c.key}
                          onDoubleClick={() => setEditing({ rowIdx: globalIdx, col: c.key })}
                          className="px-2 py-1.5 border-b border-slate-100 align-top"
                        >
                          {isEditing ? (
                            <input
                              autoFocus
                              defaultValue={val ?? ""}
                              onBlur={e => { updateCell(globalIdx, c.key, e.target.value); setEditing(null); }}
                              onKeyDown={e => { if (e.key === "Enter") { updateCell(globalIdx, c.key, e.target.value); setEditing(null); } if (e.key === "Escape") setEditing(null); }}
                              className="w-full text-xs border border-blue-400 rounded px-1 py-0.5 outline-none"
                            />
                          ) : c.key === "status" ? (
                            <span className={`text-[11px] px-1.5 py-0.5 rounded ${statusColor(val)}`}>{val}</span>
                          ) : c.key === "task_type" ? (
                            <span className={`text-[11px] px-1.5 py-0.5 rounded ${taskTypeColor(val)}`}>{val}</span>
                          ) : c.key === "vehicle_id" ? (
                            <span className="font-mono text-slate-800">{val}</span>
                          ) : c.key === "worker" ? (
                            <span className="font-medium text-slate-800">{val}</span>
                          ) : c.key === "task_description" ? (
                            <span className="text-slate-700 leading-snug">{val}</span>
                          ) : c.key === "trips" ? (
                            <span className="text-slate-600">{val ?? "—"}</span>
                          ) : (
                            <span className="text-slate-700">{val || <span className="text-slate-300">—</span>}</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-2 py-1.5 text-center border-b border-slate-100">
                      <button onClick={() => deleteRow(globalIdx)} className="text-slate-400 hover:text-red-600 text-sm" title="Xóa">×</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-3 py-2 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500">
          💡 <b>Double-click</b> vào ô để chỉnh sửa · <b>Click</b> vào tiêu đề cột để sắp xếp · Dòng đỏ = thiếu dữ liệu quan trọng
        </div>
      </div>
    </div>
  );
}

window.ResultTab = ResultTab;
