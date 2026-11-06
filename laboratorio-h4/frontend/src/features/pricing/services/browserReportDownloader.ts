import type { ReportDownloader } from "./pricingRuntime";

export const browserReportDownloader: ReportDownloader = {
  save(file) {
    const url = URL.createObjectURL(file.data);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.filename;
    document.body.append(link);
    link.click();
    link.remove();
    // Release only after the browser has received the navigation/download.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  },
};
