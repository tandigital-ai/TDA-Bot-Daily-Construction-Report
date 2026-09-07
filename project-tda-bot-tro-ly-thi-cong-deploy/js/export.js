// Export module — Excel, JSON, Clipboard, PDF

const COLUMN_ORDER = [
  { key: "date", label: "Ngày", width: 12 },
  { key: "shift", label: "Ca", width: 8 },
  { key: "period", label: "Buổi", width: 8 },
  { key: "task_type", label: "Loại việc", width: 16 },
  { key: "task_description", label: "Nội dung công việc", width: 55 },
  { key: "area", label: "Khu vực", width: 14 },
  { key: "ward", label: "Phường", width: 18 },
  { key: "street", label: "Tuyến đường", width: 25 },
  { key: "vehicle_id", label: "Số xe", width: 10 },
  { key: "vehicle_type", label: "Loại xe", width: 12 },
  { key: "trips", label: "Số chuyến", width: 10 },
  { key: "worker", label: "Người thực hiện", width: 16 },
  { key: "note", label: "Ghi chú", width: 30 },
  { key: "status", label: "Trạng thái", width: 14 },
];

function exportXlsx(rows) {
  const headerRow = COLUMN_ORDER.map(c => c.label);
  const dataRows = rows.map(r => COLUMN_ORDER.map(c => r[c.key] ?? ""));
  const aoa = [headerRow, ...dataRows];

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Auto-width
  ws["!cols"] = COLUMN_ORDER.map(c => ({ wch: c.width }));

  // Freeze row 1
  ws["!freeze"] = { xSplit: 0, ySplit: 1 };
  ws["!views"] = [{ state: "frozen", ySplit: 1 }];

  // Style header (cần XLSX với styles - dùng cellStyles opt khi write)
  // Note: SheetJS Community không hỗ trợ cell styling. Chỉ đảm bảo header là bold thông qua ghi chú.
  const range = XLSX.utils.decode_range(ws["!ref"]);
  for (let C = range.s.c; C <= range.e.c; C++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c: C });
    if (ws[addr]) {
      ws[addr].s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "1E40AF" } },
        alignment: { horizontal: "center", vertical: "center" },
      };
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Kế hoạch thi công");

  // Add metadata sheet
  const metaAoa = [
    ["File", "Chuẩn hóa Kế hoạch Thi công"],
    ["Ngày xuất", new Date().toLocaleString("vi-VN")],
    ["Tổng số dòng", rows.length],
    ["Số ngày", new Set(rows.map(r => r.date).filter(Boolean)).size],
    ["Số người", new Set(rows.map(r => r.worker).filter(Boolean)).size],
    ["Số xe", new Set(rows.map(r => r.vehicle_id).filter(Boolean)).size],
  ];
  const metaWs = XLSX.utils.aoa_to_sheet(metaAoa);
  metaWs["!cols"] = [{ wch: 20 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, metaWs, "Thông tin");

  const fileName = `KeHoachThiCong_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName, { cellStyles: true });
}

function exportJson(rows) {
  const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `KeHoachThiCong_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function copyToClipboard(rows) {
  const headerRow = COLUMN_ORDER.map(c => c.label).join("\t");
  const dataRows = rows.map(r => COLUMN_ORDER.map(c => String(r[c.key] ?? "").replace(/[\t\n\r]+/g, " ")).join("\t")).join("\n");
  const tsv = headerRow + "\n" + dataRows;
  try {
    await navigator.clipboard.writeText(tsv);
    alert("✅ Đã copy " + rows.length + " dòng vào clipboard.\nDán vào Google Sheets / Excel bằng Ctrl+V.");
  } catch (e) {
    // Fallback
    const ta = document.createElement("textarea");
    ta.value = tsv;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    alert("✅ Đã copy (fallback). Ctrl+V để dán.");
  }
}

function exportPdf(rows, t) {
  const w = window.open("", "_blank");
  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Kế hoạch thi công</title>
<style>
body { font-family: 'Segoe UI', Arial, sans-serif; margin: 20px; color: #1e293b; }
h1 { color: #1e40af; font-size: 20px; margin: 0 0 4px; }
.meta { font-size: 11px; color: #64748b; margin-bottom: 16px; }
table { width: 100%; border-collapse: collapse; font-size: 10px; }
th { background: #1e40af; color: white; padding: 6px 4px; text-align: left; border: 1px solid #1e3a8a; font-weight: 600; }
td { padding: 4px; border: 1px solid #cbd5e1; vertical-align: top; }
tr:nth-child(even) td { background: #f8fafc; }
.tag { display: inline-block; padding: 1px 5px; border-radius: 3px; font-size: 9px; }
@media print { body { margin: 10mm; } th { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head>
<body>
<h1>KẾ HOẠCH THI CÔNG - BẢNG CHUẨN HÓA</h1>
<div class="meta">Xuất ngày: ${new Date().toLocaleString("vi-VN")} · Tổng ${rows.length} dòng · ${new Set(rows.map(r=>r.date)).size} ngày</div>
<table>
  <thead><tr>${COLUMN_ORDER.map(c => `<th>${c.label}</th>`).join("")}</tr></thead>
  <tbody>
    ${rows.map(r => `<tr>${COLUMN_ORDER.map(c => `<td>${escapeHtml(String(r[c.key] ?? ""))}</td>`).join("")}</tr>`).join("")}
  </tbody>
</table>
<script>window.onload = () => setTimeout(() => window.print(), 400);</script>
</body></html>`;
  w.document.write(html);
  w.document.close();
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}

window.Exporter = { exportXlsx, exportJson, copyToClipboard, exportPdf };
