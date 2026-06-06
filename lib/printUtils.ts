/**
 * Print Utilities — Format functions, iframe print, receipt-to-image conversion.
 */

// ═══════════════════════════════════════════
// FORMAT UTILITIES
// ═══════════════════════════════════════════

export function formatPrintDate(dateString?: string): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatPrintTime(dateString?: string): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

export function formatPrintCurrency(amount: number): string {
  return amount.toLocaleString("vi-VN") + " vnđ";
}

// ═══════════════════════════════════════════
// RECEIPT CSS (inline for iframe injection)
// ═══════════════════════════════════════════

export const RECEIPT_CSS = `
  @page {
    size: 80mm auto;
    margin: 0;
  }
  body {
    margin: 0;
    padding: 0;
    background: #fff;
  }
  .receipt {
    width: 576px;
    padding: 0 10px;
    background: white;
    font-family: 'Arial', 'Helvetica', sans-serif;
    color: #000000;
    box-sizing: border-box;
  }
  .receipt .title { font-size: 48px; font-weight: 700; line-height: 48px; }
  .receipt .large { font-size: 40px; font-weight: 400; line-height: 50px; }
  .receipt .normal { font-size: 28px; font-weight: 400; line-height: 36px; }
  .receipt .small { font-size: 20px; font-weight: 400; line-height: 20px; }
  .receipt .bold { font-weight: 700; }
  .receipt .text-center { text-align: center; }
  .receipt .text-left { text-align: left; }
  .receipt .text-right { text-align: right; }
  .receipt .divider {
    border: none;
    border-top: 0.5px solid #000;
    margin: 6px 0;
  }
  .receipt .row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  .receipt .product-item {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  .receipt .product-name {
    flex: 1;
    word-wrap: break-word;
    font-size: 28px;
  }
  .receipt .product-pricing {
    white-space: nowrap;
    font-size: 28px;
    font-weight: 700;
    margin-left: 30px;
  }
`;

// ═══════════════════════════════════════════
// PRINT VIA HIDDEN IFRAME
// ═══════════════════════════════════════════

export function printReceiptHtml(receiptElement: HTMLElement): void {
  const iframe = document.createElement("iframe");
  iframe.style.position = "absolute";
  iframe.style.top = "-10000px";
  iframe.style.left = "-10000px";
  iframe.style.width = "576px";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    return;
  }

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
    <head><style>${RECEIPT_CSS}</style></head>
    <body>${receiptElement.outerHTML}</body>
    </html>
  `);
  doc.close();

  // Wait for content to render, then print
  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    // cleanup after print
    setTimeout(() => {
      if (iframe.parentNode) {
        document.body.removeChild(iframe);
      }
    }, 1000);
  }, 300);
}

// Eager-preload html2canvas ngay khi module này được import lần đầu tiên
// để lần in đầu tiên không phải chờ tải thư viện
let html2canvasInstance: any = null;
let html2canvasLoadPromise: Promise<any> | null = null;

function ensureHtml2Canvas(): Promise<any> {
  if (html2canvasInstance) return Promise.resolve(html2canvasInstance);
  if (!html2canvasLoadPromise && typeof window !== "undefined") {
    html2canvasLoadPromise = import("html2canvas").then((m) => {
      html2canvasInstance = m.default;
      return html2canvasInstance;
    });
  }
  return html2canvasLoadPromise || Promise.resolve(null);
}

// Trigger preload ngay khi file này được import
if (typeof window !== "undefined") {
  ensureHtml2Canvas();
}

export async function renderReceiptToImage(
  receiptElement: HTMLElement,
): Promise<Blob> {
  const h2c = await ensureHtml2Canvas();

  // Tạo và chèn style chứa RECEIPT_CSS vào head của tài liệu để html2canvas áp dụng đúng định dạng chiều rộng (576px)
  const styleEl = document.createElement("style");
  styleEl.innerHTML = RECEIPT_CSS;
  document.head.appendChild(styleEl);

  try {
    const canvas = await h2c(receiptElement, {
      width: 576,
      backgroundColor: "#ffffff",
      scale: 1,
      logging: false,
      useCORS: true,
      imageTimeout: 0, // Không chờ load ảnh bên ngoài
    });

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob: Blob | null) =>
          blob ? resolve(blob) : reject(new Error("Cannot convert to blob")),
        "image/jpeg",
        0.6,
      );
    });
  } finally {
    // Đảm bảo gỡ bỏ style đã chèn sau khi render xong để không ảnh hưởng đến giao diện chính
    if (styleEl.parentNode) {
      document.head.removeChild(styleEl);
    }
  }
}

// ═══════════════════════════════════════════
// PRINT VIA GOLANG LOCAL BRIDGE
// ═══════════════════════════════════════════

export async function printReceipt(
  receiptElement: HTMLElement,
): Promise<{ success: boolean; error?: string; isOffline?: boolean }> {
  try {
    // 1. Render HTML sang tệp ảnh JPEG chất lượng cao trực tiếp (đã tối ưu hóa tốc độ bằng cache)
    const imageBlob = await renderReceiptToImage(receiptElement);

    // 2. Gửi tệp ảnh in trực tiếp qua cổng POST /print của Bridge (bỏ qua bước ping status để tiết kiệm thời gian)
    const formData = new FormData();
    formData.append("image", imageBlob, "receipt.jpg");

    const printResp = await fetch("http://127.0.0.1:13579/print", {
      method: "POST",
      body: formData,
      mode: "cors",
    } as RequestInit);

    if (!printResp.ok) {
      const errJson = await printResp.json().catch(() => ({}));
      return {
        success: false,
        error: errJson.message || `Lỗi máy in: HTTP ${printResp.status}`,
      };
    }

    const printResult = await printResp.json();
    if (printResult.success) {
      return { success: true };
    } else {
      return {
        success: false,
        error: printResult.message || "Lỗi gửi lệnh in thô.",
      };
    }
  } catch (e) {
    // Bất kỳ lỗi kết nối mạng nào (Bridge chưa bật) sẽ được bắt ở đây và trả về trạng thái ngoại tuyến ngay lập tức
    return {
      success: false,
      isOffline: true,
      error: "Không tìm thấy chương trình Local Bridge đang chạy ngầm hoặc kết nối bị từ chối.",
    };
  }
}

