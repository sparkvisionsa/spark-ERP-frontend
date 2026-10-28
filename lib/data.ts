export type CompanyKey = string;
export type EmployeeStatus = "نشط" | "في إجازة" | "غير نشط";

export const companies: Record<string, { id: string; name: string; subtitle: string; color: string; icon: string }> = {
  spark: { id: "spark", name: "سبارك فيجن", subtitle: "تقييم ومعاينات", color: "#534AB7", icon: "ClipboardCheck" },
  pro: { id: "pro", name: "برو اوبشن", subtitle: "لوجستيات وتقنية", color: "#1D9E75", icon: "Truck" }
};

export type Employee = {
  id: string;
  name: string;
  company: CompanyKey | null;
  department: string;
  title: string;
  status: EmployeeStatus;
  phone: string;
  email: string;
  nationalId: string;
  manager: string;
  hireDate: string;
  birthDate: string;
  contract: string;
  gender: string;
  color: string;
  role?: "SUPER_ADMIN" | "SUPERVISOR" | "EMPLOYEE";
};

export const initialEmployees: Employee[] = [
  { id: "mustafa", name: "مصطفى", company: "spark", department: "إدارة التشغيل", title: "مشغل", status: "نشط", phone: "0551234567", email: "mustafa@spark.sa", nationalId: "1087654321", manager: "عاقب", hireDate: "2025-01-12", birthDate: "1997-05-18", contract: "دوام كامل", gender: "ذكر", color: "#0F6E56" },
  { id: "aqib", name: "عاقب", company: "spark", department: "إدارة التقييم", title: "مشرف معاينات", status: "نشط", phone: "0557654321", email: "aqib@spark.sa", nationalId: "1076543210", manager: "فالح", hireDate: "2023-09-03", birthDate: "1992-02-14", contract: "دوام كامل", gender: "ذكر", color: "#534AB7" },
  { id: "shuaib", name: "شعيب", company: "spark", department: "إدارة التقارير", title: "مراجع تقارير", status: "في إجازة", phone: "0534567890", email: "shuaib@spark.sa", nationalId: "1098765432", manager: "عاقب", hireDate: "2024-04-21", birthDate: "1995-11-08", contract: "دوام كامل", gender: "ذكر", color: "#185FA5" },
  { id: "asim", name: "عاصم", company: "pro", department: "القسم التقني", title: "مطور تطبيقات", status: "نشط", phone: "0567890123", email: "asim@prooption.sa", nationalId: "1065432109", manager: "فالح", hireDate: "2024-08-11", birthDate: "1994-07-22", contract: "دوام كامل", gender: "ذكر", color: "#993C1D" }
];

export type ChecklistItem = { id: string; text: string; done: boolean; attachments?: number };
export type Subtask = { id: string; title: string; items: ChecklistItem[] };
export type Task = { id: string; title: string; assignee: string; due: string; priority: "عادية" | "مهمة" | "عاجلة"; subtasks: Subtask[] };
export type Project = { id: string; name: string; company: CompanyKey; client: string; due: string; members: string[]; tasks: Task[]; archived?: boolean };

export const initialProjects: Project[] = [
  {
    id: "riyadh-factory", name: "تقييم ومعاينة مصنع الرياض", company: "spark", client: "الشركة الصناعية الحديثة", due: "30 أكتوبر 2026", members: ["aqib", "shuaib", "mustafa"],
    tasks: [
      { id: "production-line", title: "معاينة خط الإنتاج", assignee: "aqib", due: "22 أكتوبر", priority: "مهمة", subtasks: [
        { id: "site-entry", title: "الدخول للموقع وتسجيل الحضور", items: [{ id: "gate", text: "تسجيل بيانات بوابة الدخول", done: true }, { id: "attendance", text: "توثيق وقت الحضور", done: true }] },
        { id: "machines", title: "تصوير الآلات وأرقامها التسلسلية", items: [
          { id: "machine-1", text: "تصوير الآلة 1", done: true, attachments: 1 },
          { id: "machine-2", text: "تصوير الآلة 2", done: true, attachments: 1 },
          { id: "machine-3", text: "تصوير الآلة 3", done: true, attachments: 2 },
          { id: "machine-4", text: "تصوير الآلة 4", done: false },
          { id: "machine-5", text: "تصوير الآلة 5", done: false }
        ] },
        { id: "condition", title: "تقدير حالة كل آلة", items: [{ id: "visual", text: "الفحص البصري", done: false }, { id: "operation", text: "اختبار التشغيل", done: false }, { id: "notes", text: "تدوين الملاحظات", done: false }] },
        { id: "summary", title: "كتابة الملخص والتوصيات", items: [{ id: "draft", text: "مسودة التقرير", done: false }, { id: "review", text: "المراجعة النهائية", done: false }] }
      ] },
      { id: "equipment", title: "تقييم الآلات والمعدات", assignee: "shuaib", due: "24 أكتوبر", priority: "عادية", subtasks: [{ id: "equipment-report", title: "إعداد تقرير المعدات", items: [{ id: "eq-1", text: "حصر المعدات", done: true }, { id: "eq-2", text: "رفع التقرير", done: true }] }] },
      { id: "assets", title: "جرد الأصول الثابتة", assignee: "mustafa", due: "26 أكتوبر", priority: "عادية", subtasks: [{ id: "asset-count", title: "الحصر الميداني", items: [{ id: "a-1", text: "حصر مبنى الإدارة", done: false }, { id: "a-2", text: "حصر المستودع", done: false }] }] }
    ]
  },
  { id: "tracking", name: "نظام تتبع الشحنات", company: "pro", client: "برو اوبشن", due: "12 نوفمبر 2026", members: ["asim", "mustafa"], tasks: [{ id: "tracking-ui", title: "تصميم واجهة التتبع", assignee: "asim", due: "29 أكتوبر", priority: "مهمة", subtasks: [{ id: "dashboard", title: "لوحة التتبع", items: [{ id: "map", text: "خريطة المركبات", done: true }, { id: "filters", text: "فلاتر الشحنات", done: false }] }] }] },
  { id: "route", name: "جدولة مسار الرياض – جدة", company: "pro", client: "شبكة النقل", due: "18 أكتوبر 2026", members: ["asim"], tasks: [{ id: "route-plan", title: "بناء جدول المسارات", assignee: "asim", due: "18 أكتوبر", priority: "عاجلة", subtasks: [{ id: "routes", title: "تعريف المسارات", items: [{ id: "r1", text: "المسار الصباحي", done: true }, { id: "r2", text: "المسار المسائي", done: false }, { id: "r3", text: "بدائل الطوارئ", done: false }] }] }] },
  { id: "jeddah-assets", name: "تقييم أصول مستودع جدة", company: "spark", client: "مستودعات الغربية", due: "14 أكتوبر 2026", members: ["aqib", "shuaib"], tasks: [{ id: "final-report", title: "التقرير النهائي", assignee: "shuaib", due: "14 أكتوبر", priority: "عادية", subtasks: [{ id: "publish", title: "المراجعة والنشر", items: [{ id: "p1", text: "مراجعة الأرقام", done: true }, { id: "p2", text: "اعتماد التقرير", done: true }] }] }] },
  { id: "pro-site", name: "موقع برو اوبشن", company: "pro", client: "برو اوبشن", due: "20 ديسمبر 2026", members: ["asim"], tasks: [{ id: "website", title: "تطوير الموقع التعريفي", assignee: "asim", due: "05 نوفمبر", priority: "عادية", subtasks: [{ id: "landing", title: "الصفحة الرئيسية", items: [{ id: "l1", text: "التصميم", done: true }, { id: "l2", text: "التطوير", done: false }, { id: "l3", text: "اختبار الجوال", done: false }] }] }] }
];

export function itemsProgress(items: ChecklistItem[]) {
  if (!items.length) return 0;
  return Math.round((items.filter((item) => item.done).length / items.length) * 100);
}

export function taskProgress(task: Task) {
  if (!task.subtasks.length) return 0;
  return Math.round(task.subtasks.reduce((sum, subtask) => sum + itemsProgress(subtask.items), 0) / task.subtasks.length);
}

export function projectProgress(project: Project) {
  if (!project.tasks.length) return 0;
  return Math.round(project.tasks.reduce((sum, task) => sum + taskProgress(task), 0) / project.tasks.length);
}

export function employeeById(id: string) {
  return initialEmployees.find((employee) => employee.id === id);
}

export const activity = [
  { id: 1, user: "عاقب", action: "أضاف تسليماً جديداً", subject: "تصوير الآلة 3", time: "منذ 12 دقيقة", type: "image" },
  { id: 2, user: "مصطفى", action: "أكمل بنداً", subject: "توثيق وقت الحضور", time: "منذ 38 دقيقة", type: "done" },
  { id: 3, user: "عاصم", action: "حدّث مهمة", subject: "تصميم واجهة التتبع", time: "منذ ساعة", type: "task" },
  { id: 4, user: "شعيب", action: "اعتمد التقرير", subject: "تقييم أصول مستودع جدة", time: "منذ 3 ساعات", type: "done" }
];
