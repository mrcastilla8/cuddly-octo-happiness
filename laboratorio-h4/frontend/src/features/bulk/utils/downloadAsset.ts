import type { DownloadResource } from "../services/bulkRepository";

export function triggerDownload(resource: DownloadResource): void {
  const url = URL.createObjectURL(resource.blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = resource.fileName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Revoke object URL after short delay
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1500);
}
