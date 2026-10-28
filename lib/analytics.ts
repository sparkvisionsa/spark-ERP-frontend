import { CompanyKey } from "./data";

export type AnalyticsSummary = {
  activeProjects: number; newProjects: number; overdueTasks: number; deliveriesToday: number; periodDeliveries: number;
  activeEmployees: number; totalEmployees: number; onLeaveEmployees: number; completionRate: number;
  completedTasks: number; totalTasks: number; averageTaskAgeDays: number;
};
export type CompanyAnalytics = {
  key: CompanyKey; activeProjects: number; projects: number; employees: number; activeEmployees: number;
  totalTasks: number; completedTasks: number; overdueTasks: number; deliveries: number; completionRate: number;
  trend: Array<{ date: string; value: number }>;
};
export type AnalyticsProject = {
  id: string; name: string; company: CompanyKey; client: string; dueDate?: string | null; status: "ACTIVE" | "COMPLETED" | "ARCHIVED";
  progress: number; totalTasks: number; completedTasks: number;
};
export type AttentionItem = {
  id: string; projectId: string; taskId: string; title: string; projectName: string; company: CompanyKey;
  assignee: string; dueDate: string; daysOverdue: number; progress: number; priority: "NORMAL" | "IMPORTANT" | "URGENT";
};
export type ActivityItem = {
  id: string; type: "video" | "image" | "delivery" | "project"; user: string; action: string; subject: string;
  createdAt: string; projectId: string; taskId?: string;
};
export type AnalyticsOverview = {
  generatedAt: string;
  period: { days: number; from: string; to: string };
  summary: AnalyticsSummary;
  companies: CompanyAnalytics[];
  projects: AnalyticsProject[];
  attention: AttentionItem[];
  activity: ActivityItem[];
  weekly: Array<{ date: string; added: number; done: number }>;
};

export function relativeTime(value: string) {
  const difference = new Date(value).getTime() - Date.now();
  const formatter = new Intl.RelativeTimeFormat("ar", { numeric: "auto" });
  const minutes = Math.round(difference / 60_000);
  if (Math.abs(minutes) < 60) return formatter.format(minutes, "minute");
  const hours = Math.round(difference / 3_600_000);
  if (Math.abs(hours) < 24) return formatter.format(hours, "hour");
  return formatter.format(Math.round(difference / 86_400_000), "day");
}
