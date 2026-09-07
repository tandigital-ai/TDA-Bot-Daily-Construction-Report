function HelpTab({ t }) {
  const steps = [
    { icon: "1️⃣", title: "Thêm API Key", body: "Vào tab AI Providers → chọn Provider (Gemini, Groq, Mistral…) → bấm '+ Thêm Key' → dán key → 'Test' để kiểm tra." },
    { icon: "2️⃣", title: "Fetch Models", body: "Bấm 'Fetch Models' để tự động lấy danh sách model từ provider, hoặc thêm tay tên model." },
    { icon: "3️⃣", title: "Dán dữ liệu Zalo", body: "Vào tab Nhập liệu → paste tin nhắn từ Zalo, hoặc upload file .md/.txt/.xlsx. Hệ thống sẽ tự đếm số ngày phát hiện được." },
    { icon: "4️⃣", title: "Chuẩn hóa với AI", body: "Chọn Provider + Model → bấm 'Chuẩn hóa với AI'. AI sẽ xử lý từng ngày một, có progress bar và log realtime." },
    { icon: "5️⃣", title: "Xem & sửa bảng", body: "Tab Bảng Kết Quả → filter theo ngày/ca/người/xe, tìm kiếm toàn văn, sort theo cột, double-click để sửa trực tiếp. Dòng bất thường (thiếu người/xe) được highlight đỏ." },
    { icon: "6️⃣", title: "Xuất", body: "Excel (có style + auto-width), JSON, Copy vào clipboard (dán thẳng Google Sheets), hoặc PDF." },
  ];

  const providers = [
    { name: "Google Gemini", url: "https://aistudio.google.com/apikey", note: "Miễn phí 15 req/phút với 2.0-flash. Chất lượng cao." },
    { name: "Groq", url: "https://console.groq.com/keys", note: "Tốc độ cực nhanh (~500 tok/s). Free tier 30 req/phút." },
    { name: "Mistral AI", url: "https://console.mistral.ai/api-keys/", note: "Có free tier, chất lượng tốt cho tiếng Việt." },
    { name: "OpenRouter", url: "https://openrouter.ai/keys", note: "Nhiều model FREE (deepseek, llama-3.3-70b, gemini)." },
    { name: "NVIDIA NIM", url: "https://build.nvidia.com/", note: "Miễn phí 1000 credits. Có llama-3.1-nemotron-70b." },
    { name: "Cerebras", url: "https://cloud.cerebras.ai/", note: "Nhanh nhất thị trường (~2000 tok/s)." },
    { name: "Together AI", url: "https://api.together.ai/settings/api-keys", note: "Có Llama-3.3-70B-Instruct-Turbo-FREE." },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("tab_help")}</h1>
        <p className="text-sm text-slate-500 mt-1">6 bước để chuẩn hóa dữ liệu Zalo thành bảng Excel</p>
      </div>

      <div className="space-y-3">
        {steps.map((s, i) => (
          <div key={i} className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm flex gap-4">
            <div className="text-3xl">{s.icon}</div>
            <div className="flex-1">
              <div className="font-semibold text-sm text-slate-800">{s.title}</div>
              <div className="text-xs text-slate-600 mt-1 leading-relaxed">{s.body}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
        <div className="text-sm font-semibold text-slate-800 mb-3">🔗 Nơi lấy API Key miễn phí</div>
        <div className="grid grid-cols-2 gap-3">
          {providers.map(p => (
            <a key={p.name} href={p.url} target="_blank" rel="noreferrer" className="block p-3 rounded border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-colors">
              <div className="text-sm font-medium text-blue-700">{p.name} ↗</div>
              <div className="text-xs text-slate-600 mt-1">{p.note}</div>
            </a>
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-5">
        <div className="text-sm font-semibold text-blue-900 mb-2">🧠 Về Prompt Engineering</div>
        <div className="text-xs text-blue-900 leading-relaxed space-y-1.5">
          <div>• <b>System Prompt (khóa)</b>: chứa schema JSON 14 trường, mapping rules cho xe/người/khu vực, few-shot example. Đảm bảo mọi AI đều trả cùng cấu trúc.</div>
          <div>• <b>JSON mode</b> được bật cho các provider hỗ trợ (Groq, Mistral, OpenRouter, Cerebras, Together, Gemini) → giảm nguy cơ AI trả markdown/text thừa.</div>
          <div>• <b>Auto retry + JSON repair</b>: nếu AI lỡ trả không hợp lệ, hệ thống thử parse lại (bỏ fence, trailing comma), rồi gọi lại lần 2 với reminder.</div>
          <div>• <b>Round-robin keys</b>: khi 1 key nhận HTTP 429/503, tự động skip và chuyển key kế tiếp cùng provider.</div>
          <div>• <b>Temperature 0.1</b> mặc định → kết quả nhất quán, cùng input luôn ra cùng output.</div>
        </div>
      </div>
    </div>
  );
}

window.HelpTab = HelpTab;
