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

// ═══════════════════════════════════════════
// RENDER RECEIPT TO IMAGE (for send-bill)
// ═══════════════════════════════════════════

export async function renderReceiptToImage(
  receiptElement: HTMLElement,
): Promise<Blob> {
  const html2canvas = (await import("html2canvas")).default;
  const canvas = await html2canvas(receiptElement, {
    width: 576,
    backgroundColor: "#ffffff",
    scale: 1,
  });

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob: Blob | null) =>
        blob ? resolve(blob) : reject(new Error("Cannot convert to blob")),
      "image/jpeg",
      0.6,
    );
  });
}

// ═══════════════════════════════════════════
// PRINT VIA GOLANG LOCAL BRIDGE
// ═══════════════════════════════════════════

export async function printReceipt(
  receiptElement: HTMLElement,
): Promise<{ success: boolean; error?: string; isOffline?: boolean }> {
  try {
    // 1. Ping thử xem Local Bridge có đang online hay không (Timeout 500ms)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 500);
    const statusResp = await fetch("http://localhost:13579/status", {
      signal: controller.signal,
    }).catch(() => null);
    clearTimeout(timeoutId);

    if (statusResp && statusResp.ok) {
      // 2. Bridge hoạt động -> Render HTML sang tệp ảnh JPEG chất lượng cao
      const imageBlob = await renderReceiptToImage(receiptElement);

      // 3. Gửi tệp ảnh in trực tiếp qua cổng POST /print của Bridge
      const formData = new FormData();
      formData.append("image", imageBlob, "receipt.jpg");

      const printResp = await fetch("http://localhost:13579/print", {
        method: "POST",
        body: formData,
      });

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
    }
  } catch (e) {
    return {
      success: false,
      isOffline: true,
      error: "Không tìm thấy chương trình Local Bridge đang chạy ngầm.",
    };
  }

  return {
    success: false,
    isOffline: true,
    error: "Chương trình Local Bridge máy in đang ngoại tuyến (Offline).",
  };
}

