// Tab Thống kê
const { useMemo: useMemoS } = React;

function StatsTab({ rows, t }) {
  const stats = useMemoS(() => {
    if (rows.length === 0) return null;
    const byWorker = {}, byVehicle = {}, byTaskType = {}, byArea = {}, byDate = {};
    let totalTrips = 0;
    for (const r of rows) {
      if (r.worker) byWorker[r.worker] = (byWorker[r.worker] || 0) + 1;
      if (r.vehicle_id) byVehicle[r.vehicle_id] = (byVehicle[r.vehicle_id] || 0) + 1;
      if (r.task_type) byTaskType[r.task_type] = (byTaskType[r.task_type] || 0) + 1;
      if (r.area) byArea[r.area] = (byArea[r.area] || 0) + 1;
      if (r.date) byDate[r.date] = (byDate[r.date] || 0) + 1;
      if (r.trips) totalTrips += Number(r.trips) || 0;
    }
    return { byWorker, byVehicle, byTaskType, byArea, byDate, totalTrips, totalRows: rows.length, totalDays: Object.keys(byDate).length };
  }, [rows]);

  if (!stats) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">{t("tab_stats")}</h1>
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center text-slate-500">
          <div className="text-5xl mb-4">📊</div>
          <div>{t("no_data")}</div>
        </div>
      </div>
    );
  }

  const Bar = ({ data, color = "bg-blue-500", max: maxVal }) => {
    const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
    const max = maxVal || Math.max(...entries.map(e => e[1]), 1);
    return (
      <div className="space-y-1.5">
        {entries.map(([k, v]) => (
          <div key={k} className="flex items-center gap-2 text-xs">
            <div className="w-28 truncate text-slate-700 font-medium" title={k}>{k}</div>
            <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden relative">
              <div className={`h-full ${color} rounded-full transition-all flex items-center justify-end pr-2 text-[11px] font-semibold text-white`} style={{ width: `${Math.max(8, (v / max) * 100)}%` }}>{v}</div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("tab_stats")}</h1>
        <p className="text-sm text-slate-500 mt-1">Tổng hợp dữ liệu vận hành</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard label={t("stat_total_days")} value={stats.totalDays} icon="📅" color="bg-blue-500" />
        <StatCard label={t("stat_total_tasks")} value={stats.totalRows} icon="📋" color="bg-emerald-500" />
        <StatCard label={t("stat_total_trips")} value={stats.totalTrips} icon="🚛" color="bg-amber-500" />
        <StatCard label="Người tham gia" value={Object.keys(stats.byWorker).length} icon="👷" color="bg-purple-500" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
          <div className="text-sm font-semibold text-slate-800 mb-3">👷 {t("stat_by_worker")}</div>
          <Bar data={stats.byWorker} color="bg-blue-500" />
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
          <div className="text-sm font-semibold text-slate-800 mb-3">🚛 {t("stat_by_vehicle")}</div>
          <Bar data={stats.byVehicle} color="bg-amber-500" />
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
          <div className="text-sm font-semibold text-slate-800 mb-3">🛠️ {t("stat_by_task_type")}</div>
          <Bar data={stats.byTaskType} color="bg-emerald-500" />
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
          <div className="text-sm font-semibold text-slate-800 mb-3">📍 {t("stat_by_area")}</div>
          <Bar data={stats.byArea} color="bg-purple-500" />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
        <div className="text-sm font-semibold text-slate-800 mb-3">📅 Theo ngày</div>
        <Bar data={stats.byDate} color="bg-cyan-500" />
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center text-xl`}>{icon}</div>
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wide">{label}</div>
          <div className="text-2xl font-bold text-slate-900">{value}</div>
        </div>
      </div>
    </div>
  );
}

window.StatsTab = StatsTab;
