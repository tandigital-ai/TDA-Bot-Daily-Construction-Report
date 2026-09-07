# 🛠️ Chuẩn hóa Kế hoạch Thi công (Construction Plan Normalizer)

> Ứng dụng AI biến tin nhắn Zalo về kế hoạch vận hành thoát nước thành bảng Excel có cấu trúc — chạy 100% trong trình duyệt.

![Version](https://img.shields.io/badge/version-1.1-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Storage](https://img.shields.io/badge/storage-IndexedDB-orange)
![No Backend](https://img.shields.io/badge/backend-none-lightgrey)

**[📘 Hướng dẫn cài đặt & sử dụng đầy đủ (tiếng Việt) → HUONG_DAN.md](./HUONG_DAN.md)**

---

## ✨ Tính năng chính

- 🤖 **8 AI providers** miễn phí: Google Gemini, Groq, Mistral, OpenRouter, NVIDIA NIM, Cerebras, Together AI, Custom OpenAI-compatible
- 🔑 **Quản lý nhiều API key** cho mỗi provider, tự động xoay vòng khi hết quota (round-robin)
- 🧠 **Prompt hệ thống KHÓA** — đảm bảo mọi AI đều trả kết quả cùng schema JSON 14 cột
- 📊 **Bảng kết quả** đầy đủ: filter, sort, tìm kiếm, chỉnh sửa inline, highlight dòng bất thường
- 📤 Xuất **Excel/JSON/PDF/TSV** với style đẹp
- 📈 **Thống kê** trực quan: số chuyến/xe/người/khu vực theo ngày
- 💾 Lưu bằng **IndexedDB** (dung lượng đến hàng GB, thay vì 5-10 MB của localStorage)
- 🌐 **Song ngữ** Tiếng Việt / English
- 🔒 **Không backend** — key & data lưu trong trình duyệt bạn, không gửi lên server nào

## 🚀 Chạy nhanh (30 giây)

```bash
# 1. Clone repo
git clone https://github.com/<username>/<repo>.git
cd <repo>

# 2. Chạy HTTP server (chọn 1 trong 3)
python -m http.server 8080          # Nếu có Python
npx serve -p 8080                   # Nếu có Node.js
# Hoặc mở index.html bằng "Live Server" extension của VS Code

# 3. Mở trình duyệt
open http://localhost:8080
```

Hoặc **[Demo trực tuyến qua GitHub Pages](https://<username>.github.io/<repo>/)** *(sau khi bạn deploy — xem [HUONG_DAN.md](./HUONG_DAN.md))*.

## 🛠️ Cấu trúc

```
├── index.html              Bootstrap React + wiring
├── js/
│   ├── providers.js        8 AI provider adapters
│   ├── prompt.js           LOCKED system prompt (14-field schema)
│   ├── idb_store.js        IndexedDB wrapper
│   ├── keystore.js         Config manager + round-robin
│   ├── ai_client.js        AI pipeline (chunk → call → parse)
│   ├── export.js           Excel/JSON/PDF/TSV export
│   ├── i18n.js             VI/EN dictionary
│   └── components/         React JSX components (6 tabs)
└── HUONG_DAN.md            Hướng dẫn chi tiết tiếng Việt
```

## 🔧 Stack

- **React 18** + Babel Standalone (CDN, no build step)
- **Tailwind CSS** (CDN)
- **SheetJS 0.20** cho Excel I/O
- **IndexedDB** cho lưu trữ

## 📝 Giấy phép

MIT — Xem [LICENSE](./LICENSE)

## 🙌 Đóng góp

Pull requests welcome. Nếu có bug hoặc idea → mở [Issue](../../issues).

---

**Đọc [HUONG_DAN.md](./HUONG_DAN.md) để biết cách deploy lên GitHub Pages, Netlify, Vercel, và tất cả chi tiết sử dụng.**
