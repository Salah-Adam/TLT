import { runReportNotifications, ReportPeriod } from "./report-notifications";

const period = (process.argv[2] as ReportPeriod) || "daily";
runReportNotifications(period)
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });