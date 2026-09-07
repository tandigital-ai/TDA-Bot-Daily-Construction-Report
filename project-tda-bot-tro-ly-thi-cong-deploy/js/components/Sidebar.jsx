// Sidebar với danh sách tabs
const { useState } = React;

function Sidebar({ activeTab, setActiveTab, lang, setLang, t, rowsCount, storageInfo }) {
  const fmt = (bytes) => {
    if (!bytes) return "0";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + " MB";
    return (bytes / 1024 / 1024 / 1024).toFixed(2) + " GB";
  };
  const tabs = [
    { id: "input", icon: "📥", label: t("tab_input") },
    { id: "result", icon: "📊", label: t("tab_result"), badge: rowsCount || null },
    { id: "stats", icon: "📈", label: t("tab_stats") },
    { id: "providers", icon: "🔌", label: t("tab_providers") },
    { id: "prompt", icon: "🧠", label: t("tab_prompt") },
    { id: "help", icon: "❓", label: t("tab_help") },
  ];

  return (
    <aside className="w-60 shrink-0 bg-slate-900 text-slate-200 flex flex-col h-screen">
      <div className="px-5 py-5 border-b border-slate-800">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-md bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-sm">DN</div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-white text-[13px] leading-tight truncate">{t("app_title")}</div>
          </div>
        </div>
        <div className="text-[10.5px] text-slate-400 leading-snug mt-1.5">{t("app_subtitle")}</div>
      </div>

      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
              activeTab === tab.id
                ? "bg-blue-600 text-white shadow-sm"
                : "hover:bg-slate-800 text-slate-300"
            }`}
          >
            <span className="text-base">{tab.icon}</span>
            <span className="flex-1 text-left">{tab.label}</span>
            {tab.badge != null && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${activeTab === tab.id ? "bg-blue-800" : "bg-slate-700"}`}>{tab.badge}</span>
            )}
          </button>
        ))}
      </nav>

      <div className="border-t border-slate-800 px-3 py-3">
        <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-2 px-1">Ngôn ngữ / Language</div>
        <div className="flex gap-1 bg-slate-800 rounded-md p-1">
          <button
            onClick={() => setLang("vi")}
            className={`flex-1 py-1.5 text-xs rounded ${lang === "vi" ? "bg-blue-600 text-white" : "text-slate-300"}`}
          >🇻🇳 VI</button>
          <button
            onClick={() => setLang("en")}
            className={`flex-1 py-1.5 text-xs rounded ${lang === "en" ? "bg-blue-600 text-white" : "text-slate-300"}`}
          >🇬🇧 EN</button>
        </div>
        {storageInfo && (
          <div className="mt-3 px-1 text-[10px] text-slate-400">
            <div className="flex justify-between mb-1">
              <span>💾 IndexedDB</span>
              <span className="text-slate-300">{fmt(storageInfo.usage)}</span>
            </div>
            <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500" style={{width: `${Math.min(100, storageInfo.percent)}%`}}></div>
            </div>
            <div className="text-[9px] text-slate-500 mt-0.5 text-right">/ {fmt(storageInfo.quota)}</div>
          </div>
        )}
        <div className="mt-2 text-[10px] text-slate-500 text-center leading-relaxed">
          v1.1 · IndexedDB<br/>Không gửi lên server
        </div>
      </div>
    </aside>
  );
}

window.Sidebar = Sidebar;
