// Tab Prompt AI — hiện Locked System Prompt (read-only) + User Prompt (edit)
const { useState: useStatePr } = React;

function PromptTab({ cfg, setCfg, t }) {
  const [userPrompt, setUserPrompt] = useStatePr(cfg.userPrompt);

  const savePrompt = () => {
    const c = { ...cfg, userPrompt };
    window.KeyStore.saveConfig(c);
    setCfg(c);
    alert("✅ Đã lưu");
  };

  const resetDefault = () => {
    if (!confirm("Khôi phục prompt mặc định?")) return;
    setUserPrompt(window.DEFAULT_USER_PROMPT_TEMPLATE);
    const c = { ...cfg, userPrompt: window.DEFAULT_USER_PROMPT_TEMPLATE };
    window.KeyStore.saveConfig(c);
    setCfg(c);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("tab_prompt")}</h1>
        <p className="text-sm text-slate-500 mt-1">Prompt hệ thống được KHÓA để đảm bảo mọi AI đều trả kết quả nhất quán. Bạn chỉ có thể tùy chỉnh User Prompt.</p>
      </div>

      {/* Locked System Prompt */}
      <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden shadow-sm">
        <div className="px-4 py-3 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔒</span>
            <div>
              <div className="text-sm font-semibold text-white">{t("system_prompt")}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Bao gồm schema JSON, mapping rules, few-shot example. Không thể chỉnh sửa.</div>
            </div>
          </div>
          <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-1 rounded font-medium">READ ONLY</span>
        </div>
        <pre className="p-4 text-[11px] leading-relaxed text-green-200 font-mono max-h-96 overflow-y-auto whitespace-pre-wrap">{window.LOCKED_SYSTEM_PROMPT}</pre>
      </div>

      {/* Editable User Prompt */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">✏️</span>
            <div>
              <div className="text-sm font-semibold text-slate-800">{t("user_prompt")}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Dùng <code className="bg-slate-100 px-1 rounded text-blue-700">{"{{RAW_DATA}}"}</code> làm placeholder cho dữ liệu thô.</div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={resetDefault} className="text-xs px-2.5 py-1.5 rounded border border-slate-300 hover:bg-slate-50 text-slate-700">↩️ {t("reset_default")}</button>
            <button onClick={savePrompt} className="text-xs px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium">💾 {t("save")}</button>
          </div>
        </div>
        <textarea
          value={userPrompt}
          onChange={e => setUserPrompt(e.target.value)}
          className="w-full h-48 p-4 text-xs font-mono resize-none focus:outline-none text-slate-800 leading-relaxed"
          spellCheck={false}
        />
      </div>

      {/* Settings */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
        <div className="text-sm font-semibold text-slate-800 mb-3">⚙️ Cài đặt xử lý</div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-slate-600 block mb-1">Temperature: <b>{cfg.settings.temperature}</b></label>
            <input
              type="range" min="0" max="1" step="0.05" value={cfg.settings.temperature}
              onChange={e => { const c = {...cfg, settings:{...cfg.settings, temperature: parseFloat(e.target.value)}}; window.KeyStore.saveConfig(c); setCfg(c); }}
              className="w-full accent-blue-600"
            />
            <div className="text-[10px] text-slate-500 mt-1">0-0.2: ổn định · 0.5+: sáng tạo</div>
          </div>
          <div>
            <label className="text-xs text-slate-600 block mb-1">Số lần retry khi lỗi</label>
            <input
              type="number" min="1" max="10" value={cfg.settings.maxRetries}
              onChange={e => { const c = {...cfg, settings:{...cfg.settings, maxRetries: parseInt(e.target.value) || 3}}; window.KeyStore.saveConfig(c); setCfg(c); }}
              className="w-full text-sm border border-slate-300 rounded px-2 py-1"
            />
            <div className="text-[10px] text-slate-500 mt-1">Xoay key khi 429 hoặc lỗi mạng</div>
          </div>
          <div>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox" checked={cfg.settings.chunkPerDay}
                onChange={e => { const c = {...cfg, settings:{...cfg.settings, chunkPerDay: e.target.checked}}; window.KeyStore.saveConfig(c); setCfg(c); }}
                className="mt-0.5 accent-blue-600"
              />
              <div>
                <div className="text-xs font-medium text-slate-700">Chunk theo ngày</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Mỗi ngày = 1 request AI. Tắt để gửi tất cả trong 1 lần (rủi ro vượt token).</div>
              </div>
            </label>
          </div>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-xs text-amber-900">
        <div className="font-semibold text-sm mb-1">📌 Vì sao khóa System Prompt?</div>
        <div className="leading-relaxed">
          System Prompt chứa <b>schema JSON</b>, <b>mapping rules</b> (tên xe → loại xe, tên người → chuẩn hóa, đường → khu vực), và <b>few-shot example</b>.
          Đây là "bản ràng buộc" đảm bảo bất kỳ AI nào (Gemini, Groq, Mistral, OpenRouter…) đều đọc-hiểu và trả về đúng cùng một cấu trúc.
          Nếu bạn cần điều chỉnh mapping rules, hãy liên hệ để chỉnh sửa file <code className="bg-amber-100 px-1 rounded">js/prompt.js</code>.
        </div>
      </div>
    </div>
  );
}

window.PromptTab = PromptTab;
