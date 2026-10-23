// Saves a QR canvas as a PNG in a way that works on iPhone/iPad.
// iOS Safari ignores <a download> clicks on data: URLs, so we use the native
// share sheet ("Save Image") when available, then fall back to opening the image.
export async function saveCanvasPng(canvasId: string, fileName: string): Promise<"shared" | "downloaded" | "opened" | "failed"> {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
  if (!canvas) return "failed";
  const blob: Blob | null = await new Promise((r) => canvas.toBlob((b) => r(b), "image/png"));
  if (!blob) return "failed";
  const file = new File([blob], fileName, { type: "image/png" });
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (isIOS && nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: fileName });
      return "shared";
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return "shared";
    }
  }
  const url = URL.createObjectURL(blob);
  if (isIOS) {
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return "opened";
  }
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return "downloaded";
}
