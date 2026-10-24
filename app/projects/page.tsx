"use client";

import AppShell from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { Avatar, Modal, Progress, Toast } from "@/components/ui";
import { API_URL, ApiError, apiRequest, apiUpload } from "@/lib/api";
import { companies, CompanyKey, Employee } from "@/lib/data";
import {
  Archive, Check, ChevronLeft, CircleStop, ClipboardList, Download, Edit3,
  ExternalLink, File as FileIcon, FileArchive, FileAudio, FileImage, FileText, FolderKanban,
  Image as ImageIcon, Link2, Loader2, Mic, MoreHorizontal, Paperclip, Plus, RotateCcw,
  Search, Send, Trash2, UserPlus, Users, Video, X,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

type Role = "SUPER_ADMIN" | "SUPERVISOR" | "EMPLOYEE";
type WorkStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
type Priority = "NORMAL" | "IMPORTANT" | "URGENT";
type ProjectStatus = "ACTIVE" | "COMPLETED" | "ARCHIVED";
type ApiEmployee = { _id: string; fullName?: string; phone?: string; email?: string; role: Role; company: CompanyKey | null; department?: string; jobTitle?: string; status: "ACTIVE" | "ON_LEAVE" | "INACTIVE" };
type ItemNode = { _id: string; text: string; done: boolean; attachments: number; order: number };
type SubtaskNode = { _id: string; title: string; manualStatus: WorkStatus; order: number; items: ItemNode[]; progress: number; derivedStatus: WorkStatus; completedItems: number };
type TaskNode = { _id: string; title: string; description: string; assigneeId: string; helperIds: string[]; priority: Priority; dueDate: string; manualStatus: WorkStatus; order: number; subtasks: SubtaskNode[]; progress: number; derivedStatus: WorkStatus };
type DeliveryAttachment = { storageId: string; name: string; mimeType: string; size: number; kind: "image" | "video" | "audio" | "document" | "archive" | "file"; url: string };
type DeliveryNode = { _id: string; authorId: string | ApiEmployee; taskId: string; subtaskId?: string | null; itemId?: string | null; text: string; link?: string; attachmentName?: string; attachmentType?: "image" | "video" | "file" | "link" | ""; attachments?: DeliveryAttachment[]; createdAt: string };
type ApiProject = { _id: string; name: string; company: CompanyKey; client?: string; description?: string; startDate?: string | null; dueDate: string; budget?: number | null; status: ProjectStatus; members: Array<string | ApiEmployee>; progress?: number; totalTasks?: number; tasks?: TaskNode[]; deliveries?: DeliveryNode[] };
type WorkspaceProject = { id: string; name: string; company: CompanyKey; client: string; description: string; startDate: string; dueDate: string; budget: number | null; status: ProjectStatus; memberIds: string[]; progress: number; totalTasks: number };
type WorkspaceTree = Omit<ApiProject, "members"> & { members: ApiEmployee[]; tasks: TaskNode[]; deliveries: DeliveryNode[]; progress: number; totalTasks: number };
type ProjectDraft = Omit<WorkspaceProject, "id" | "status" | "progress" | "totalTasks">;

const colors = ["#534AB7", "#1D9E75", "#185FA5", "#993C1D", "#BA7517"];
const priorityLabel: Record<Priority, string> = { NORMAL: "عادية", IMPORTANT: "مهمة", URGENT: "عاجلة" };

function toEmployee(item: ApiEmployee, index = 0): Employee {
  return { id: item._id, name: item.fullName?.trim() || "موظف", company: item.company, department: item.department || "—", title: item.jobTitle || (item.role === "SUPERVISOR" ? "مشرف" : "موظف"), status: item.status === "ACTIVE" ? "نشط" : item.status === "ON_LEAVE" ? "في إجازة" : "غير نشط", phone: item.phone || "", email: item.email || "", nationalId: "", manager: "", hireDate: "", birthDate: "", contract: "", gender: "", role: item.role, color: colors[index % colors.length] };
}
function toProject(item: ApiProject): WorkspaceProject {
  return { id: item._id, name: item.name, company: item.company, client: item.client || "", description: item.description || "", startDate: item.startDate?.slice(0, 10) || "", dueDate: item.dueDate?.slice(0, 10) || "", budget: item.budget ?? null, status: item.status, memberIds: item.members.map((member) => typeof member === "string" ? member : member._id), progress: item.progress || 0, totalTasks: item.totalTasks || 0 };
}
function shortDate(value?: string) { return value ? new Intl.DateTimeFormat("ar-SA", { day: "numeric", month: "short" }).format(new Date(value)) : "—"; }
function statusColor(status: WorkStatus) { return status === "COMPLETED" ? "var(--success)" : status === "IN_PROGRESS" ? "var(--warning)" : "var(--border-strong)"; }

export default function ProjectsPage() {
  const { user } = useAuth();
  const canManage = user?.role === "SUPER_ADMIN" || user?.role === "SUPERVISOR";
  const [projects, setProjects] = useState<WorkspaceProject[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [workspace, setWorkspace] = useState<WorkspaceTree | null>(null);
  const [projectId, setProjectId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [taskId, setTaskId] = useState("");
  const [subtaskId, setSubtaskId] = useState("");
  const [itemId, setItemId] = useState("");
  const [filter, setFilter] = useState<"all" | CompanyKey | "archive">("all");
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState(0);
  const [loading, setLoading] = useState(true);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [projectModal, setProjectModal] = useState(false);
  const [assignModal, setAssignModal] = useState(false);
  const [taskModal, setTaskModal] = useState(false);
  const [subtaskModal, setSubtaskModal] = useState(false);
  const [editingProject, setEditingProject] = useState<WorkspaceProject | null>(null);
  const workspaceRequestRef = useRef(0);

  function notify(message: string) { setToast(message); window.setTimeout(() => setToast(""), 2500); }
  function showError(caught: unknown, fallback: string) { setError(caught instanceof ApiError ? caught.message : fallback); }

  const loadCatalog = useCallback(async (preferredId?: string) => {
    setLoading(true); setError("");
    try {
      const [active, archived, employeeList] = await Promise.all([apiRequest<ApiProject[]>("/projects"), apiRequest<ApiProject[]>("/projects?archived=true"), apiRequest<ApiEmployee[]>("/employees")]);
      const nextProjects = [...active, ...archived].map(toProject);
      setProjects(nextProjects);
      setEmployees(employeeList.filter((employee) => employee.role !== "SUPER_ADMIN" && employee.company).map(toEmployee));
      const params = new URLSearchParams(window.location.search);
      const company = params.get("c"); if (company === "spark" || company === "pro") setFilter(company);
      const requested = preferredId || params.get("p") || localStorage.getItem("spark-last-project") || "";
      setProjectId(nextProjects.some((project) => project.id === requested) ? requested : nextProjects.find((project) => project.status !== "ARCHIVED")?.id || nextProjects[0]?.id || "");
    } catch (caught) { showError(caught, "تعذر تحميل المشاريع"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (user) void loadCatalog(); }, [user, loadCatalog]);

  const applyWorkspace = useCallback((tree: WorkspaceTree, useUrl = false) => {
    setWorkspace(tree);
    setProjects((current) => current.map((project) => project.id === tree._id ? toProject(tree) : project));
    const params = new URLSearchParams(window.location.search);
    const members = tree.members.map((member) => member._id);
    const nextEmployee = (useUrl && members.includes(params.get("e") || "") ? params.get("e") : members.includes(employeeId) ? employeeId : members[0]) || "";
    const employeeTasks = tree.tasks.filter((task) => task.assigneeId === nextEmployee || task.helperIds?.includes(nextEmployee));
    const nextTask = (useUrl ? tree.tasks.find((task) => task._id === params.get("t")) : tree.tasks.find((task) => task._id === taskId)) || employeeTasks[0] || tree.tasks[0];
    const nextSubtask = (useUrl ? nextTask?.subtasks.find((subtask) => subtask._id === params.get("s")) : nextTask?.subtasks.find((subtask) => subtask._id === subtaskId)) || nextTask?.subtasks[0];
    const nextItem = (useUrl ? nextSubtask?.items.find((item) => item._id === params.get("i")) : nextSubtask?.items.find((item) => item._id === itemId));
    setEmployeeId(nextEmployee); setTaskId(nextTask?._id || ""); setSubtaskId(nextSubtask?._id || ""); setItemId(nextItem?._id || "");
  }, [employeeId, taskId, subtaskId, itemId]);

  const loadWorkspace = useCallback(async (id: string, useUrl = false) => {
    const requestId = ++workspaceRequestRef.current;
    if (!id) { setWorkspace(null); setWorkspaceLoading(false); return; }
    setWorkspaceLoading(true); setError("");
    try {
      const tree = await apiRequest<WorkspaceTree>(`/workspace/tree?projectId=${id}`);
      if (workspaceRequestRef.current !== requestId || tree._id !== id) return;
      applyWorkspace(tree, useUrl);
    }
    catch (caught) { if (workspaceRequestRef.current === requestId) { showError(caught, "تعذر تحميل مساحة المشروع"); setWorkspace(null); } }
    finally { if (workspaceRequestRef.current === requestId) setWorkspaceLoading(false); }
  }, [applyWorkspace]);

  useEffect(() => { if (projectId) void loadWorkspace(projectId, true); }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  const project = projects.find((entry) => entry.id === projectId) || null;
  const activeWorkspace = workspace?._id === projectId ? workspace : null;
  const validWorkspaceMembers = useMemo(() => (activeWorkspace?.members || []).filter((member): member is ApiEmployee => Boolean(member?._id)), [activeWorkspace]);
  const memberMap = useMemo(() => new Map(validWorkspaceMembers.map((member, index) => [member._id, toEmployee(member, index)])), [validWorkspaceMembers]);
  const members = validWorkspaceMembers.map((member) => memberMap.get(member._id)).filter((member): member is Employee => Boolean(member));
  const employeeTasks = activeWorkspace?.tasks.filter((task) => !employeeId || task.assigneeId === employeeId || task.helperIds?.includes(employeeId)) || [];
  const task = activeWorkspace?.tasks.find((entry) => entry._id === taskId) || employeeTasks[0] || null;
  const subtask = task?.subtasks.find((entry) => entry._id === subtaskId) || task?.subtasks[0] || null;
  const item = subtask?.items.find((entry) => entry._id === itemId) || null;
  const selectedDeliveries = (activeWorkspace?.deliveries || []).filter((delivery) => item ? delivery.itemId === item._id : subtask ? delivery.subtaskId === subtask._id : task ? delivery.taskId === task._id : false);
  const visibleProjects = useMemo(() => projects.filter((entry) => (filter === "all" || filter === "archive" || entry.company === filter) && (filter === "archive" ? entry.status === "ARCHIVED" : entry.status !== "ARCHIVED") && (`${entry.name} ${entry.client}`.toLocaleLowerCase("ar").includes(query.trim().toLocaleLowerCase("ar")))), [projects, filter, query]);
  const totalTasks = projects.filter((entry) => entry.status !== "ARCHIVED").reduce((sum, entry) => sum + entry.totalTasks, 0);
  const totalProgress = projects.length ? Math.round(projects.reduce((sum, entry) => sum + entry.progress, 0) / projects.length) : 0;
  const canWorkOnTask = canManage || Boolean(user && task && (task.assigneeId === user.id || task.helperIds?.includes(user.id)));

  function syncUrl(values: { p?: string; e?: string; t?: string; s?: string; i?: string }, selectedFilter = filter) {
    const params = new URLSearchParams(); if (selectedFilter === "spark" || selectedFilter === "pro") params.set("c", selectedFilter);
    if (values.p) params.set("p", values.p); if (values.e) params.set("e", values.e); if (values.t) params.set("t", values.t); if (values.s) params.set("s", values.s); if (values.i) params.set("i", values.i);
    const queryString = params.toString();
    window.history.replaceState({}, "", queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname);
  }
  function clearWorkspaceSelection(clearProject = false) {
    workspaceRequestRef.current += 1;
    if (clearProject) setProjectId("");
    setWorkspace(null); setWorkspaceLoading(false); setEmployeeId(""); setTaskId(""); setSubtaskId(""); setItemId("");
  }
  function chooseFilter(nextFilter: typeof filter) {
    setFilter(nextFilter);
    const keepProject = Boolean(project && (nextFilter === "archive" ? project.status === "ARCHIVED" : project.status !== "ARCHIVED" && (nextFilter === "all" || project.company === nextFilter)));
    if (!keepProject) { clearWorkspaceSelection(true); setLevel(0); syncUrl({}, nextFilter); }
    else syncUrl({ p: projectId, e: employeeId, t: task?._id, s: subtask?._id, i: item?._id }, nextFilter);
  }
  function chooseProject(id: string) { clearWorkspaceSelection(); setWorkspaceLoading(true); setProjectId(id); setLevel(1); localStorage.setItem("spark-last-project", id); syncUrl({ p: id }); }
  function chooseEmployee(id: string) { const next = activeWorkspace?.tasks.find((entry) => entry.assigneeId === id || entry.helperIds?.includes(id)); setEmployeeId(id); setTaskId(next?._id || ""); setSubtaskId(next?.subtasks[0]?._id || ""); setItemId(""); setLevel(2); syncUrl({ p: projectId, e: id, t: next?._id, s: next?.subtasks[0]?._id }); }
  function chooseTask(next: TaskNode) { setTaskId(next._id); setSubtaskId(next.subtasks[0]?._id || ""); setItemId(""); setLevel(3); syncUrl({ p: projectId, e: employeeId, t: next._id, s: next.subtasks[0]?._id }); }
  function chooseSubtask(next: SubtaskNode) { setSubtaskId(next._id); setItemId(""); setLevel(4); syncUrl({ p: projectId, e: employeeId, t: taskId, s: next._id }); }
  function chooseItem(id: string) { setItemId(id); setLevel(5); syncUrl({ p: projectId, e: employeeId, t: taskId, s: subtaskId, i: id }); }
  const columnClass = (index: number) => `${level === index ? "flex" : "hidden"} md:flex`;

  async function saveProject(draft: ProjectDraft) {
    setBusy(true); setError(""); const wasEditing = Boolean(editingProject);
    try {
      const body = { name: draft.name, company: draft.company, client: draft.client || undefined, description: draft.description || undefined, startDate: draft.startDate || undefined, dueDate: draft.dueDate, budget: draft.budget ?? undefined, memberIds: draft.memberIds };
      const result = editingProject ? await apiRequest<ApiProject>(`/projects/${editingProject.id}`, { method: "PATCH", body: JSON.stringify(body) }) : await apiRequest<ApiProject>("/projects", { method: "POST", body: JSON.stringify(body) });
      setProjectModal(false); setEditingProject(null); await loadCatalog(result._id); await loadWorkspace(result._id); notify(wasEditing ? "تم تحديث المشروع" : "تم إنشاء المشروع");
    } catch (caught) { showError(caught, "تعذر حفظ المشروع"); } finally { setBusy(false); }
  }
  async function saveMembers(memberIds: string[]) { if (!project) return; setBusy(true); try { await apiRequest(`/projects/${project.id}/members`, { method: "PATCH", body: JSON.stringify({ memberIds }) }); setAssignModal(false); await loadWorkspace(project.id); notify("تم تحديث فريق المشروع"); } catch (caught) { showError(caught, "تعذر تحديث الفريق"); } finally { setBusy(false); } }
  async function archiveProject(target: WorkspaceProject | null = project) { if (!target || busy) return; setBusy(true); try { const status = target.status === "ARCHIVED" ? "ACTIVE" : "ARCHIVED"; await apiRequest(`/projects/${target.id}`, { method: "PATCH", body: JSON.stringify({ status }) }); await loadCatalog(target.id); setFilter(status === "ARCHIVED" ? "archive" : "all"); notify(status === "ARCHIVED" ? "تمت أرشفة المشروع" : "تمت استعادة المشروع"); } catch (caught) { showError(caught, "تعذر تحديث المشروع"); } finally { setBusy(false); } }
  async function deleteProject(target: WorkspaceProject | null = project) { if (!target || busy || !window.confirm(`حذف مشروع «${target.name}»؟`)) return; setBusy(true); try { await apiRequest(`/projects/${target.id}`, { method: "DELETE" }); if (target.id === projectId) { clearWorkspaceSelection(true); setLevel(0); } await loadCatalog(); notify("تم حذف المشروع"); } catch (caught) { showError(caught, "تعذر حذف المشروع"); } finally { setBusy(false); } }
  async function saveTask(payload: { title: string; description: string; assigneeId: string; helperIds: string[]; priority: Priority; dueDate: string; subtaskTitles: string[] }) { if (!project) return; setBusy(true); try { applyWorkspace(await apiRequest<WorkspaceTree>("/tasks", { method: "POST", body: JSON.stringify({ projectId: project.id, ...payload }) })); setTaskModal(false); notify("تمت إضافة المهمة"); } catch (caught) { showError(caught, "تعذر إضافة المهمة"); } finally { setBusy(false); } }
  async function saveSubtask(payload: { title: string; itemTexts: string[] }) { if (!project || !task) return; setBusy(true); try { applyWorkspace(await apiRequest<WorkspaceTree>(`/subtasks/task/${task._id}`, { method: "POST", body: JSON.stringify({ projectId: project.id, ...payload }) })); setSubtaskModal(false); notify("تمت إضافة المهمة الفرعية"); } catch (caught) { showError(caught, "تعذر إضافة التفاصيل"); } finally { setBusy(false); } }
  async function addItem(text: string) { if (!project || !subtask) return; try { applyWorkspace(await apiRequest<WorkspaceTree>(`/items/subtask/${subtask._id}`, { method: "POST", body: JSON.stringify({ projectId: project.id, text }) })); } catch (caught) { showError(caught, "تعذر إضافة البند"); } }
  async function toggleItem(target: ItemNode) { if (!project || !workspace) return; setWorkspace({ ...workspace, tasks: workspace.tasks.map((entry) => ({ ...entry, subtasks: entry.subtasks.map((sub) => ({ ...sub, items: sub.items.map((row) => row._id === target._id ? { ...row, done: !row.done } : row) })) })) }); try { applyWorkspace(await apiRequest<WorkspaceTree>(`/items/${target._id}`, { method: "PATCH", body: JSON.stringify({ projectId: project.id, done: !target.done }) })); } catch (caught) { await loadWorkspace(project.id); showError(caught, "تعذر تحديث البند"); } }
  async function addDelivery(payload: { text: string; link: string; files: File[]; onProgress: (percent: number) => void }) {
    if (!project || !task) return;
    setBusy(true);
    try {
      let result: WorkspaceTree;
      if (payload.files.length) {
        const form = new FormData();
        form.append("projectId", project.id); form.append("taskId", task._id);
        if (subtask?._id) form.append("subtaskId", subtask._id);
        if (item?._id) form.append("itemId", item._id);
        if (payload.text) form.append("text", payload.text);
        if (payload.link) form.append("link", payload.link);
        payload.files.forEach((file) => form.append("files", file, file.name));
        result = await apiUpload<WorkspaceTree>("/deliveries", form, payload.onProgress);
      } else {
        result = await apiRequest<WorkspaceTree>("/deliveries", { method: "POST", body: JSON.stringify({ projectId: project.id, taskId: task._id, subtaskId: subtask?._id, itemId: item?._id, text: payload.text || undefined, link: payload.link || undefined, attachmentType: payload.link ? "link" : undefined }) });
      }
      applyWorkspace(result);
      notify(payload.files.length ? `تم رفع ${payload.files.length} مرفق وإضافة التسليم` : "تمت إضافة التسليم");
    } catch (caught) { showError(caught, "تعذر إضافة التسليم"); throw caught; }
    finally { setBusy(false); }
  }
  async function deleteDelivery(deliveryId: string) {
    if (!project || busy || !window.confirm("هل تريد حذف هذا التسليم ومرفقاته؟")) return;
    setBusy(true);
    try { applyWorkspace(await apiRequest<WorkspaceTree>(`/deliveries/${deliveryId}?projectId=${project.id}`, { method: "DELETE" })); notify("تم حذف التسليم ومرفقاته"); }
    catch (caught) { showError(caught, "تعذر حذف التسليم"); }
    finally { setBusy(false); }
  }

  const breadcrumbs = [project ? companies[project.company].name : null, project?.name, memberMap.get(employeeId)?.name, task?.title, subtask?.title].filter(Boolean) as string[];
  const stepAvailability = [true, Boolean(project), Boolean(activeWorkspace), Boolean(task), Boolean(subtask), Boolean(task)];
  const allowedCompanies = useMemo<CompanyKey[]>(() => user?.role === "SUPERVISOR" && user.company ? [user.company] : ["spark", "pro"], [user?.role, user?.company]);

  return <AppShell title="مساحة المشاريع" compact>
    <div className="project-workspace min-h-[calc(100vh-48px)] w-full max-w-full overflow-x-hidden border" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
      <div className="flex min-h-12 flex-wrap items-center gap-2 border-b px-3 py-2" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand text-white"><FolderKanban size={15} /></span>
        <div className="min-w-0 basis-[180px] flex flex-1 items-center gap-1 overflow-hidden text-[11px]" style={{ color: "var(--muted)" }}>{breadcrumbs.length ? breadcrumbs.map((crumb, index) => <span key={`${crumb}-${index}`} className="flex min-w-0 items-center gap-1"><span className="max-w-[140px] truncate" style={{ color: index === breadcrumbs.length - 1 ? "var(--text)" : undefined }}>{crumb}</span>{index < breadcrumbs.length - 1 && <ChevronLeft size={12} />}</span>) : <span>اختر مشروعاً لبدء العمل</span>}</div>
        <div className="relative w-full sm:w-40"><Search className="absolute end-2 top-1/2 -translate-y-1/2" size={14} color="var(--muted)" /><input className="field h-8 pe-8 text-xs" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="بحث سريع" /></div>
        <span className="whitespace-nowrap text-[11px]" style={{ color: "var(--muted)" }}><b style={{ color: "var(--text)" }}>{projects.filter((entry) => entry.status !== "ARCHIVED").length}</b> مشاريع · <b style={{ color: "var(--text)" }}>{totalTasks}</b> مهمة · <b style={{ color: "var(--text)" }}>{totalProgress}%</b> إنجاز</span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 px-3 py-2">{([ ["all", "الكل"], ["spark", "سبارك فيجن"], ["pro", "برو اوبشن"], ["archive", "الأرشيف"] ] as const).map(([key, label]) => <button key={key} onClick={() => chooseFilter(key)} className={`chip whitespace-nowrap ${filter === key ? "chip-active" : ""}`}>{key === "archive" ? <Archive size={13} /> : key !== "all" && <span className="h-2 w-2 rounded-full" style={{ background: companies[key].color }} />}{label}</button>)}</div>

      {error && <div className="mx-3 mb-2 flex items-center justify-between rounded-lg px-3 py-2 text-xs" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}><span>{error}</span><button onClick={() => setError("")}><X size={14} /></button></div>}
      <MobileSteps level={level} available={stepAvailability} onChange={setLevel} />

      <div className="project-columns-wrap w-full max-w-full overflow-x-hidden px-3 pb-3"><div className="project-columns min-h-[560px] min-w-0 gap-2">
        <WorkspaceColumn index={1} title="المشاريع" count={visibleProjects.length} className={columnClass(0)} onAdd={canManage ? () => { setEditingProject(null); setProjectModal(true); } : undefined}>
          <ColumnHead first="الاسم" second="الإنجاز" />
          {loading ? <LoadingRows /> : visibleProjects.length ? visibleProjects.map((entry) => <ProjectRow key={entry.id} project={entry} selected={projectId === entry.id} canManage={Boolean(canManage)} busy={busy} onSelect={() => chooseProject(entry.id)} onEdit={() => { setEditingProject(entry); setProjectModal(true); }} onAssign={() => setAssignModal(true)} onAddTask={() => setTaskModal(true)} onArchive={() => void archiveProject(entry)} onDelete={() => void deleteProject(entry)} />) : <ColumnEmpty icon={<FolderKanban size={20} />} text="لا توجد مشاريع" />}
        </WorkspaceColumn>

        <WorkspaceColumn index={2} title="الفريق" count={members.length} className={columnClass(1)} onAdd={canManage && project ? () => setAssignModal(true) : undefined}>
          <ColumnHead first="الموظف" second="المهام" />
          {!project ? <ColumnEmpty icon={<Users size={20} />} text="اختر مشروعاً" /> : workspaceLoading ? <LoadingRows /> : members.length ? members.map((member) => { const assigned = activeWorkspace?.tasks.filter((entry) => entry.assigneeId === member.id || entry.helperIds?.includes(member.id)) || []; return <button key={member.id} onClick={() => chooseEmployee(member.id)} className="flex w-full items-center gap-2 border-b px-2.5 py-2 text-start" style={{ borderColor: "var(--border)", background: employeeId === member.id ? "var(--primary-soft)" : "transparent", boxShadow: employeeId === member.id ? "inset -3px 0 var(--primary)" : "none" }}><Avatar name={member.name} color={member.color} size="sm" /><span className="min-w-0 flex-1 truncate text-xs font-medium">{member.name}</span><span className="text-[10px]" style={{ color: "var(--muted)" }}>{assigned.filter((entry) => entry.progress === 100).length}/{assigned.length}</span></button>; }) : <ColumnEmpty icon={<Users size={20} />} text="لا يوجد فريق" />}
        </WorkspaceColumn>

        <WorkspaceColumn index={3} title="المهام" count={employeeTasks.length} className={columnClass(2)} onAdd={canManage && project ? () => setTaskModal(true) : undefined}>
          <ColumnHead first="المهمة" second="الموعد · %" />
          {!project ? <ColumnEmpty icon={<ClipboardList size={20} />} text="اختر مشروعاً" /> : !employeeId && members.length ? <ColumnEmpty icon={<Users size={20} />} text="اختر موظفاً" /> : employeeTasks.length ? employeeTasks.map((entry) => <button key={entry._id} onClick={() => chooseTask(entry)} className="flex w-full items-start gap-2 border-b px-2.5 py-2 text-start" style={{ borderColor: "var(--border)", background: task?._id === entry._id ? "var(--primary-soft)" : "transparent", boxShadow: task?._id === entry._id ? "inset -3px 0 var(--primary)" : "none" }}><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: statusColor(entry.derivedStatus) }} /><span className="min-w-0 flex-1 text-xs font-medium leading-5">{entry.title}<span className="block text-[9px] font-normal" style={{ color: entry.priority === "URGENT" ? "var(--danger)" : "var(--muted)" }}>{priorityLabel[entry.priority]}</span></span><span className="whitespace-nowrap text-[10px]" style={{ color: "var(--muted)" }}>{shortDate(entry.dueDate)}</span><span className="w-7 text-left text-[10px]">{entry.progress}%</span></button>) : <ColumnEmpty icon={<ClipboardList size={20} />} text="لا توجد مهام" />}
        </WorkspaceColumn>

        <WorkspaceColumn index={4} title="التفاصيل" count={task?.subtasks.length || 0} className={columnClass(3)} onAdd={canManage && task ? () => setSubtaskModal(true) : undefined}>
          <ColumnHead first="المهمة الفرعية" second="البنود" />
          {!task ? <ColumnEmpty icon={<ClipboardList size={20} />} text="اختر مهمة" /> : task.subtasks.length ? task.subtasks.map((entry) => <button key={entry._id} onClick={() => chooseSubtask(entry)} className="flex w-full items-start gap-2 border-b px-2.5 py-2 text-start" style={{ borderColor: "var(--border)", background: subtask?._id === entry._id ? "var(--primary-soft)" : "transparent", boxShadow: subtask?._id === entry._id ? "inset -3px 0 var(--primary)" : "none" }}><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: statusColor(entry.derivedStatus) }} /><span className="min-w-0 flex-1 text-xs font-medium leading-5">{entry.title}</span><span className="text-[10px]" style={{ color: "var(--muted)" }}>{entry.completedItems}/{entry.items.length}</span></button>) : <ColumnEmpty icon={<ClipboardList size={20} />} text="هذه مهمة بلا تفاصيل فرعية" />}
        </WorkspaceColumn>

        <WorkspaceColumn index={5} title="قائمة التنفيذ" count={subtask?.items.length || 0} className={columnClass(4)}>
          {subtask ? <><div className="border-b px-2.5 py-2" style={{ borderColor: "var(--border)" }}><div className="mb-1 flex items-center justify-between text-[10px]" style={{ color: "var(--muted)" }}><span>{subtask.completedItems} من {subtask.items.length}</span><span>{subtask.progress}%</span></div><Progress value={subtask.progress} /></div>{subtask.items.map((entry) => <div key={entry._id} className="flex items-center gap-2 border-b px-2.5 py-2" style={{ borderColor: "var(--border)", background: itemId === entry._id ? "var(--primary-soft)" : "transparent", boxShadow: itemId === entry._id ? "inset -3px 0 var(--primary)" : "none" }}><button disabled={!canWorkOnTask} onClick={() => void toggleItem(entry)} className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border" style={{ borderColor: entry.done ? "var(--success)" : "var(--border-strong)", background: entry.done ? "var(--success)" : "transparent", color: "white" }}>{entry.done && <Check size={12} strokeWidth={3} />}</button><button onClick={() => chooseItem(entry._id)} className={`min-w-0 flex-1 text-start text-xs ${entry.done ? "opacity-60" : ""}`}>{entry.text}</button>{entry.attachments > 0 && <span className="flex items-center gap-0.5 text-[10px]" style={{ color: "var(--muted)" }}><Paperclip size={11} />{entry.attachments}</span>}</div>)}{canWorkOnTask && <AddItem onAdd={addItem} />}</> : <ColumnEmpty icon={<Check size={20} />} text={task && !task.subtasks.length ? "هذه مهمة بلا تفاصيل فرعية" : "اختر مهمة فرعية لعرض بنود تنفيذها"} />}
        </WorkspaceColumn>

        <WorkspaceColumn index={6} title="الإنجاز والتسليمات" count={selectedDeliveries.length} className={columnClass(5)}>
          {task ? <DeliveryPanel task={task} subtask={subtask} item={item} deliveries={selectedDeliveries} memberMap={memberMap} canSubmit={canWorkOnTask} canManage={Boolean(canManage)} currentUserId={user?.id || ""} busy={busy} onCancelItem={() => setItemId("")} onDelete={deleteDelivery} onSubmit={addDelivery} /> : <ColumnEmpty icon={<Send size={20} />} text="اختر مهمة لعرض التسليمات" />}
        </WorkspaceColumn>
      </div></div>
    </div>

    {canManage && <ProjectModal open={projectModal} onClose={() => !busy && setProjectModal(false)} project={editingProject} employees={employees} allowedCompanies={allowedCompanies} busy={busy} onSave={saveProject} />}
    {canManage && project && <AssignMembersModal open={assignModal} onClose={() => !busy && setAssignModal(false)} project={project} employees={employees} busy={busy} onSave={saveMembers} />}
    {canManage && project && <TaskModal open={taskModal} onClose={() => !busy && setTaskModal(false)} members={members} projectName={project.name} busy={busy} onSave={saveTask} />}
    {canManage && task && <SubtaskModal open={subtaskModal} onClose={() => !busy && setSubtaskModal(false)} taskTitle={task.title} busy={busy} onSave={saveSubtask} />}
    <Toast show={Boolean(toast)} message={toast} />
  </AppShell>;
}

function MobileSteps({ level, available, onChange }: { level: number; available: boolean[]; onChange: (level: number) => void }) { return <div className="mx-3 mb-2 flex items-center gap-1 rounded-lg p-1 md:hidden" style={{ background: "var(--surface-3)" }}>{["المشاريع", "الفريق", "المهام", "التفاصيل", "التنفيذ", "التسليم"].map((label, index) => <button key={label} disabled={!available[index]} onClick={() => onChange(index)} className="flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-md px-0.5 py-1 text-[8px] disabled:cursor-not-allowed disabled:opacity-40" style={{ background: level === index ? "var(--surface)" : "transparent", color: level === index ? "var(--primary)" : "var(--muted)" }}><span className="flex h-4 w-4 items-center justify-center rounded-full text-[8px] text-white" style={{ background: available[index] && level >= index ? "var(--primary)" : "var(--border-strong)" }}>{available[index] && level > index ? <Check size={9} /> : index + 1}</span>{label}</button>)}</div>; }
function WorkspaceColumn({ index, title, count, onAdd, className, children }: { index: number; title: string; count: number; onAdd?: () => void; className: string; children: React.ReactNode }) { return <article className={`h-[calc(100dvh-190px)] min-h-[520px] min-w-0 flex-col overflow-hidden rounded-xl border md:h-[460px] md:min-h-0 lg:h-[500px] 2xl:h-[calc(100dvh-180px)] 2xl:min-h-[540px] ${className}`} style={{ borderColor: "var(--border)", background: "var(--surface)" }}><header className="flex h-11 shrink-0 items-center border-b px-2.5" style={{ borderColor: "var(--border)" }}><span className="me-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand text-[10px] text-white">{index}</span><h3 className="min-w-0 truncate text-xs font-medium">{title}</h3><span className="ms-1 shrink-0 text-[10px]" style={{ color: "var(--muted)" }}>({count})</span>{onAdd && <button className="btn-ghost ms-auto h-7 w-7 shrink-0" onClick={onAdd} aria-label={`إضافة في ${title}`}><Plus size={15} color="var(--primary)" /></button>}</header><div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden">{children}</div></article>; }
function ColumnHead({ first, second }: { first: string; second: string }) { return <div className="flex justify-between border-b px-2.5 py-1.5 text-[10px]" style={{ borderColor: "var(--border)", background: "var(--surface-2)", color: "var(--muted)" }}><span>{first}</span><span>{second}</span></div>; }
function ColumnEmpty({ icon, text }: { icon: React.ReactNode; text: string }) { return <div className="flex min-h-40 flex-col items-center justify-center gap-2 px-3 text-center text-xs" style={{ color: "var(--muted)" }}><span className="rounded-lg p-2" style={{ background: "var(--surface-3)" }}>{icon}</span>{text}</div>; }
function LoadingRows() { return <div className="space-y-2 p-2">{[1, 2, 3, 4].map((row) => <div key={row} className="h-10 animate-pulse rounded-lg" style={{ background: "var(--surface-3)" }} />)}</div>; }
function ProjectRow({ project, selected, canManage, busy, onSelect, onEdit, onAssign, onAddTask, onArchive, onDelete }: { project: WorkspaceProject; selected: boolean; canManage: boolean; busy: boolean; onSelect: () => void; onEdit: () => void; onAssign: () => void; onAddTask: () => void; onArchive: () => void; onDelete: () => void }) {
  const overdue = project.dueDate < new Date().toISOString().slice(0, 10) && project.progress < 100;
  return <div className="border-b transition-colors" style={{ borderColor: "var(--border)", background: selected ? "var(--primary-soft)" : "transparent", boxShadow: selected ? "inset -3px 0 var(--primary)" : "none" }}>
    <button type="button" onClick={onSelect} aria-pressed={selected} className="block w-full px-2.5 py-2 text-start outline-none transition-colors hover:bg-[var(--surface-2)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand">
      <span className="flex items-center gap-2"><span className="h-2 w-2 shrink-0 rounded-full" style={{ background: companies[project.company].color }} /><span className="min-w-0 flex-1 truncate text-xs font-medium">{project.name}</span><Progress value={project.progress} className="w-10 shrink-0" danger={overdue} /><span className="w-7 text-left text-[10px]" style={{ color: project.progress === 100 ? "var(--success)" : overdue ? "var(--danger)" : "var(--muted)" }}>{project.progress}%</span></span>
    </button>
    {selected && <div className="mx-2.5 flex items-center justify-between gap-2 border-t py-2" style={{ borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)" }}><span className="min-w-0 truncate text-[10px]" style={{ color: "var(--muted)" }}>{project.memberIds.length} موظفين · {shortDate(project.dueDate)}</span>{canManage && <div className="flex shrink-0 gap-0.5" role="group" aria-label={`إجراءات مشروع ${project.name}`}><MiniButton label="تعديل" disabled={busy} onClick={onEdit}><Edit3 size={12} /></MiniButton><MiniButton label="إضافة موظف" disabled={busy} onClick={onAssign}><UserPlus size={12} /></MiniButton><MiniButton label="إضافة مهمة" disabled={busy} onClick={onAddTask}><ClipboardList size={12} /></MiniButton><MiniButton label={project.status === "ARCHIVED" ? "استعادة" : "أرشفة"} disabled={busy} onClick={onArchive}>{project.status === "ARCHIVED" ? <RotateCcw size={12} /> : <Archive size={12} />}</MiniButton><MiniButton label="حذف" disabled={busy} danger onClick={onDelete}><Trash2 size={12} /></MiniButton></div>}</div>}
  </div>;
}
function MiniButton({ children, label, onClick, disabled = false, danger = false }: { children: React.ReactNode; label: string; onClick?: () => void; disabled?: boolean; danger?: boolean }) { return <button type="button" disabled={disabled} className="btn-ghost h-6 w-6 border disabled:cursor-not-allowed disabled:opacity-50" style={{ borderColor: danger ? "color-mix(in srgb, var(--danger) 30%, var(--border))" : "var(--border)", color: danger ? "var(--danger)" : undefined }} title={label} aria-label={label} onClick={onClick}>{children}</button>; }
function AddItem({ onAdd }: { onAdd: (text: string) => Promise<void> }) { const [text, setText] = useState(""); const submit = async () => { if (!text.trim()) return; const value = text.trim(); setText(""); await onAdd(value); }; return <div className="p-2"><div className="flex items-center gap-1.5 rounded-lg border border-dashed px-2" style={{ borderColor: "var(--border-strong)" }}><Plus size={13} color="var(--muted)" /><input className="h-8 min-w-0 flex-1 bg-transparent text-[10px] outline-none" value={text} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void submit(); } }} placeholder="أضف بنداً واضغط Enter" /></div></div>; }

function DeliveryPanel({ task, subtask, item, deliveries, memberMap, canSubmit, canManage, currentUserId, busy, onCancelItem, onDelete, onSubmit }: { task: TaskNode; subtask: SubtaskNode | null; item: ItemNode | null; deliveries: DeliveryNode[]; memberMap: Map<string, Employee>; canSubmit: boolean; canManage: boolean; currentUserId: string; busy: boolean; onCancelItem: () => void; onDelete: (id: string) => Promise<void>; onSubmit: (payload: { text: string; link: string; files: File[]; onProgress: (percent: number) => void }) => Promise<void> }) {
  const [text, setText] = useState("");
  const [link, setLink] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [recordedAudio, setRecordedAudio] = useState<{ file: File; url: string; duration: number } | null>(null);
  const [composerError, setComposerError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingStartedAtRef = useRef(0);
  const discardRecordingRef = useRef(false);
  const recordedAudioRef = useRef<{ file: File; url: string; duration: number } | null>(null);
  const filesRef = useRef<File[]>([]);
  const owner = memberMap.get(task.assigneeId);
  const orderedDeliveries = useMemo(() => [...deliveries].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)), [deliveries]);
  const attachmentCount = deliveries.reduce((sum, delivery) => sum + (delivery.attachments?.length || (delivery.link ? 1 : 0)), 0);

  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => setRecordSeconds(Math.max(1, Math.floor((Date.now() - recordingStartedAtRef.current) / 1000))), 250);
    return () => window.clearInterval(timer);
  }, [recording]);
  useEffect(() => () => {
    discardRecordingRef.current = true;
    recorderRef.current?.state !== "inactive" && recorderRef.current?.stop();
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    if (recordedAudioRef.current) URL.revokeObjectURL(recordedAudioRef.current.url);
  }, []);

  function addFiles(incoming: File[]) {
    setComposerError("");
    const next = [...filesRef.current];
    for (const file of incoming) {
      if (file.size > 50 * 1024 * 1024) { setComposerError(`الملف ${file.name} يتجاوز 50 ميجابايت`); continue; }
      if (!next.some((entry) => entry.name === file.name && entry.size === file.size && entry.lastModified === file.lastModified)) next.push(file);
    }
    if (next.length > 6) { setComposerError("يمكن إرفاق 6 ملفات كحد أقصى في التسليم الواحد"); next.splice(6); }
    if (next.reduce((sum, file) => sum + file.size, 0) > 120 * 1024 * 1024) { setComposerError("إجمالي الملفات يجب ألا يتجاوز 120 ميجابايت"); return; }
    filesRef.current = next;
    setFiles(next);
  }

  function removeFile(file: File) {
    const next = filesRef.current.filter((entry) => entry !== file);
    filesRef.current = next;
    setFiles(next);
    if (recordedAudioRef.current?.file === file) clearRecordedAudio(false);
  }

  function clearRecordedAudio(removeFromFiles = true) {
    const current = recordedAudioRef.current;
    if (!current) return;
    if (removeFromFiles) {
      const next = filesRef.current.filter((entry) => entry !== current.file);
      filesRef.current = next;
      setFiles(next);
    }
    URL.revokeObjectURL(current.url);
    recordedAudioRef.current = null;
    setRecordedAudio(null);
  }

  async function startRecording() {
    setComposerError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") { setComposerError("التسجيل الصوتي غير مدعوم في هذا المتصفح"); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      const preferred = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4"].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, preferred ? { mimeType: preferred } : undefined);
      recordingChunksRef.current = []; recordingStreamRef.current = stream; recorderRef.current = recorder; discardRecordingRef.current = false; recordingStartedAtRef.current = Date.now(); setRecordSeconds(0);
      recorder.ondataavailable = (event) => { if (event.data.size) recordingChunksRef.current.push(event.data); };
      recorder.onstop = () => {
        const shouldDiscard = discardRecordingRef.current;
        const mimeType = recorder.mimeType || "audio/webm";
        const extension = mimeType.includes("ogg") ? "ogg" : mimeType.includes("mp4") ? "m4a" : "webm";
        const blob = new Blob(recordingChunksRef.current, { type: mimeType });
        if (!shouldDiscard && blob.size) {
          const previous = recordedAudioRef.current;
          const file = new File([blob], `تسجيل-صوتي-${new Date().toISOString().replace(/[:.]/g, "-")}.${extension}`, { type: mimeType });
          const baseFiles = filesRef.current.filter((entry) => entry !== previous?.file);
          if (baseFiles.length >= 6) setComposerError("احذف أحد المرفقات أولاً لإضافة التسجيل الصوتي");
          else if (baseFiles.reduce((sum, entry) => sum + entry.size, 0) + file.size > 120 * 1024 * 1024) setComposerError("لا توجد مساحة كافية لإضافة التسجيل ضمن حد 120 ميجابايت");
          else {
            if (previous) URL.revokeObjectURL(previous.url);
            const preview = { file, url: URL.createObjectURL(file), duration: Math.max(1, Math.round((Date.now() - recordingStartedAtRef.current) / 1000)) };
            const next = [...baseFiles, file];
            filesRef.current = next;
            recordedAudioRef.current = preview;
            setFiles(next);
            setRecordedAudio(preview);
          }
        }
        stream.getTracks().forEach((track) => track.stop()); recordingStreamRef.current = null;
      };
      recorder.start(500); setRecording(true);
    } catch { setComposerError("تعذر الوصول إلى الميكروفون. تحقق من إذن المتصفح ثم حاول مجددًا"); }
  }
  function stopRecording() { if (recorderRef.current?.state === "recording") recorderRef.current.stop(); setRecording(false); }
  function cancelRecording() { discardRecordingRef.current = true; stopRecording(); setRecordSeconds(0); }
  async function submit() {
    if (!text.trim() && !link.trim() && !files.length) return;
    setComposerError(""); setUploadProgress(files.length ? 1 : 0);
    try {
      await onSubmit({ text: text.trim(), link: link.trim(), files, onProgress: setUploadProgress });
      setText(""); setLink(""); filesRef.current = []; setFiles([]); setShowLink(false); setUploadProgress(0);
      clearRecordedAudio(false);
    } catch { setUploadProgress(0); }
  }

  return <div className="flex min-h-full flex-col">
    <div className="border-b px-2.5 py-2" style={{ borderColor: "var(--border)" }}>
      <div className="flex items-start justify-between gap-2"><div className="min-w-0"><div className="mb-1 flex items-center gap-1.5"><span className={`status ${task.derivedStatus === "COMPLETED" ? "status-success" : task.derivedStatus === "IN_PROGRESS" ? "status-warning" : "status-neutral"}`}>{task.derivedStatus === "COMPLETED" ? "مكتملة" : task.derivedStatus === "IN_PROGRESS" ? "قيد التنفيذ" : "لم تبدأ"}</span><span className="text-[9px]" style={{ color: "var(--muted)" }}>{deliveries.length} تسليم · {attachmentCount} مرفق</span></div><p className="truncate text-xs font-medium">{item?.text || subtask?.title || task.title}</p><p className="mt-0.5 text-[9px]" style={{ color: "var(--muted)" }}>{subtask?.title || task.title} · المسؤول: {owner?.name || "—"}</p></div><MoreHorizontal className="shrink-0" size={14} color="var(--muted)" /></div>
    </div>

    <div className="max-h-[360px] flex-1 space-y-2 overflow-y-auto p-2.5" aria-live="polite">
      {orderedDeliveries.length ? orderedDeliveries.map((delivery) => {
        const authorId = typeof delivery.authorId === "string" ? delivery.authorId : delivery.authorId?._id || "";
        const populatedName = typeof delivery.authorId === "object" ? delivery.authorId?.fullName : undefined;
        const authorName = populatedName?.trim() || memberMap.get(authorId)?.name || "موظف";
        return <DeliveryCard key={delivery._id} delivery={delivery} authorName={authorName} itemName={item?.text} canDelete={canManage || authorId === currentUserId} busy={busy} onDelete={() => void onDelete(delivery._id)} />;
      }) : <ColumnEmpty icon={<Send size={18} />} text="لا توجد تسليمات بعد — أضف وصف الإنجاز أو اسحب ملفاتك هنا" />}
    </div>

    {canSubmit && <div className="mt-auto border-t p-2.5" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
      <div className="mb-1.5 flex items-center justify-between gap-2 text-[9px]" style={{ color: "var(--muted)" }}><span className="min-w-0 truncate">التسليم على: <b style={{ color: "var(--primary)" }}>{item?.text || subtask?.title || task.title}</b></span>{item && <button type="button" onClick={onCancelItem} className="shrink-0" style={{ color: "var(--danger)" }}>إلغاء الربط</button>}</div>
      <textarea className="field min-h-[64px] resize-none py-2 text-xs" value={text} onChange={(event) => setText(event.target.value)} onPaste={(event) => { const pasted = Array.from(event.clipboardData.files); if (pasted.length) addFiles(pasted); }} aria-label="وصف الإنجاز أو ملاحظات التسليم" />

      <div onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false); }} onDrop={(event) => { event.preventDefault(); setDragging(false); addFiles(Array.from(event.dataTransfer.files)); }} className="mt-1.5 rounded-lg border border-dashed p-2 transition-colors" style={{ borderColor: dragging ? "var(--primary)" : "var(--border-strong)", background: dragging ? "var(--primary-soft)" : "var(--surface)" }}>
        <input ref={fileInputRef} type="file" multiple className="hidden" accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z" onChange={(event) => { addFiles(Array.from(event.target.files || [])); event.currentTarget.value = ""; }} />
        <div className="flex flex-wrap items-center gap-1" role="toolbar" aria-label="خيارات إرفاق التسليم">
          <button type="button" className="btn-ghost h-8 w-8 p-0" disabled={recording} onClick={() => fileInputRef.current?.click()} title="إرفاق ملفات" aria-label="إرفاق ملفات"><Paperclip size={15} /></button>
          <button type="button" className="btn-ghost relative h-8 w-8 p-0" onClick={() => recording ? stopRecording() : void startRecording()} style={{ color: recording ? "var(--danger)" : recordedAudio ? "var(--primary)" : undefined, background: recording ? "var(--danger-soft)" : recordedAudio ? "var(--primary-soft)" : undefined }} title={recording ? "إيقاف التسجيل" : recordedAudio ? "إعادة التسجيل الصوتي" : "تسجيل صوتي"} aria-label={recording ? `إيقاف التسجيل بعد ${formatDuration(recordSeconds)}` : recordedAudio ? "إعادة التسجيل الصوتي" : "تسجيل صوتي"}>{recording ? <CircleStop size={15} /> : <Mic size={15} />}{recording && <span className="absolute end-0.5 top-0.5 h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />}</button>
          <button type="button" className="btn-ghost h-8 w-8 p-0" disabled={recording} onClick={() => setShowLink((value) => !value)} style={{ color: showLink ? "var(--primary)" : undefined, background: showLink ? "var(--primary-soft)" : undefined }} title="إضافة رابط" aria-label={showLink ? "إخفاء حقل الرابط" : "إضافة رابط"} aria-pressed={showLink}><Link2 size={15} /></button>
          <span className="ms-auto text-[8px]" style={{ color: "var(--muted)" }}>اسحب وأفلت · 6 ملفات · 50MB للملف</span>
        </div>
        {recording && <div className="mt-2 flex items-center gap-2 rounded-lg border px-2 py-2" style={{ borderColor: "color-mix(in srgb, var(--danger) 35%, var(--border))", background: "var(--danger-soft)" }} role="status"><span className="h-2 w-2 shrink-0 animate-pulse rounded-full" style={{ background: "var(--danger)" }} /><span className="text-[9px] font-medium" style={{ color: "var(--danger)" }}>جارٍ التسجيل</span><span className="font-mono text-[10px]" dir="ltr">{formatDuration(recordSeconds)}</span><div className="ms-auto flex gap-1"><button type="button" className="btn-ghost h-7 w-7 p-0" onClick={stopRecording} title="إيقاف وحفظ التسجيل" aria-label="إيقاف وحفظ التسجيل"><CircleStop size={14} /></button><button type="button" className="btn-ghost h-7 w-7 p-0" onClick={cancelRecording} title="إلغاء التسجيل" aria-label="إلغاء التسجيل" style={{ color: "var(--danger)" }}><Trash2 size={13} /></button></div></div>}
        {recordedAudio && !recording && <div className="mt-2 overflow-hidden rounded-lg border p-2" style={{ borderColor: "color-mix(in srgb, var(--primary) 28%, var(--border))", background: "var(--primary-soft)" }}><div className="mb-1.5 flex items-center gap-2"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full" style={{ background: "var(--surface)", color: "var(--primary)" }}><FileAudio size={14} /></span><span className="min-w-0 flex-1"><b className="block text-[9px] font-medium">معاينة التسجيل قبل الإرسال</b><span className="block text-[8px]" style={{ color: "var(--muted)" }}>{formatDuration(recordedAudio.duration)} · {formatBytes(recordedAudio.file.size)}</span></span><button type="button" className="btn-ghost h-7 w-7 shrink-0 p-0" onClick={() => clearRecordedAudio()} title="حذف التسجيل" aria-label="حذف التسجيل الصوتي" style={{ color: "var(--danger)" }}><Trash2 size={13} /></button></div><audio src={recordedAudio.url} controls preload="metadata" className="h-8 w-full min-w-0 max-w-full" aria-label="تشغيل معاينة التسجيل الصوتي" /></div>}
        {files.some((file) => file !== recordedAudio?.file) && <div className="mt-1.5 flex flex-wrap gap-1">{files.filter((file) => file !== recordedAudio?.file).map((file) => <span key={`${file.name}-${file.lastModified}`} className="flex max-w-full items-center gap-1 rounded-md border px-1.5 py-1 text-[8px]" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>{fileIcon(file.type, 11)}<span className="max-w-[130px] truncate">{file.name}</span><span style={{ color: "var(--muted)" }}>{formatBytes(file.size)}</span><button type="button" aria-label={`إزالة ${file.name}`} onClick={() => removeFile(file)}><X size={10} /></button></span>)}</div>}
      </div>
      {showLink && <div className="relative mt-1.5"><Link2 className="absolute start-2 top-1/2 -translate-y-1/2" size={12} color="var(--muted)" /><input className="field h-8 ps-7 text-[10px]" dir="ltr" value={link} onChange={(event) => setLink(event.target.value)} placeholder="https:// رابط خارجي متعلق بالتسليم" /></div>}
      {composerError && <p className="mt-1 text-[9px]" style={{ color: "var(--danger)" }}>{composerError}</p>}
      {uploadProgress > 0 && <div className="mt-1.5"><div className="mb-0.5 flex justify-between text-[8px]" style={{ color: "var(--muted)" }}><span>جارٍ رفع المرفقات بأمان…</span><span>{uploadProgress}%</span></div><Progress value={uploadProgress} /></div>}
      <button type="button" className="btn-primary mt-2 h-8 w-full px-3 text-[10px]" disabled={busy || recording || (!text.trim() && !link.trim() && !files.length)} onClick={() => void submit()}>{busy ? <Loader2 className="animate-spin" size={13} /> : <Send size={13} />}{busy ? "جارٍ حفظ التسليم…" : `إرسال التسليم${files.length ? ` (${files.length} مرفق)` : ""}`}</button>
    </div>}
  </div>;
}

function DeliveryCard({ delivery, authorName, itemName, canDelete, busy, onDelete }: { delivery: DeliveryNode; authorName: string; itemName?: string; canDelete: boolean; busy: boolean; onDelete: () => void }) {
  return <article className="rounded-lg border p-2" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
    <div className="flex gap-2"><Avatar name={authorName} color="#534AB7" size="sm" /><div className="min-w-0 flex-1"><div className="flex items-center gap-1"><b className="min-w-0 flex-1 truncate text-[10px] font-medium">{authorName}</b><time className="shrink-0 text-[8px]" style={{ color: "var(--muted)" }}>{new Intl.DateTimeFormat("ar-SA", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(delivery.createdAt))}</time>{canDelete && <button type="button" disabled={busy} className="shrink-0 rounded p-0.5 disabled:opacity-40" style={{ color: "var(--danger)" }} title="حذف التسليم" aria-label="حذف التسليم" onClick={onDelete}><Trash2 size={11} /></button>}</div>{delivery.itemId && <span className="mt-0.5 inline-block max-w-full truncate rounded px-1.5 py-0.5 text-[8px]" style={{ background: "var(--primary-soft)", color: "var(--primary)" }}>{itemName || "بند تنفيذ"}</span>}</div></div>
    {delivery.text && <p className="mt-1.5 whitespace-pre-wrap break-words text-[10px] leading-5" style={{ color: "var(--text)" }}>{delivery.text}</p>}
    {delivery.attachments?.length ? <div className="mt-1.5 grid gap-1.5">{delivery.attachments.map((attachment) => <DeliveryAttachmentView key={attachment.storageId} attachment={attachment} />)}</div> : null}
    {delivery.link && <a href={delivery.link} target="_blank" rel="noopener noreferrer" className="mt-1.5 flex items-center gap-2 rounded-lg border p-1.5" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}><span className="flex h-7 w-8 shrink-0 items-center justify-center rounded-md" style={{ background: "var(--primary-soft)", color: "var(--primary)" }}>{delivery.attachmentType === "video" ? <Video size={13} /> : delivery.attachmentType === "image" ? <ImageIcon size={13} /> : <Link2 size={13} />}</span><span className="min-w-0 flex-1 truncate text-[9px]" dir="ltr">{delivery.attachmentName || delivery.link}</span><ExternalLink size={11} color="var(--muted)" /></a>}
  </article>;
}

function DeliveryAttachmentView({ attachment }: { attachment: DeliveryAttachment }) {
  const source = `${API_URL}${attachment.url}`;
  const download = `${source}?download=1`;
  if (attachment.kind === "image") return <div className="group relative overflow-hidden rounded-lg border" style={{ borderColor: "var(--border)" }}><a href={source} target="_blank" rel="noreferrer"><img src={source} alt={attachment.name} loading="lazy" className="max-h-44 w-full bg-black/5 object-contain" /></a><AttachmentActions attachment={attachment} download={download} /></div>;
  if (attachment.kind === "video") return <div className="overflow-hidden rounded-lg border" style={{ borderColor: "var(--border)" }}><video src={source} controls preload="metadata" playsInline className="max-h-48 w-full bg-black" /><AttachmentMeta attachment={attachment} download={download} /></div>;
  if (attachment.kind === "audio") return <div className="min-w-0 overflow-hidden rounded-lg border p-2" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}><div className="mb-1 flex min-w-0 items-center gap-1.5"><FileAudio className="shrink-0" size={14} color="var(--primary)" /><span className="min-w-0 flex-1 truncate text-[9px]">{attachment.name}</span><a className="shrink-0" href={download} title="تنزيل" aria-label={`تنزيل ${attachment.name}`}><Download size={12} /></a></div><audio src={source} controls preload="metadata" className="h-8 w-full min-w-0 max-w-full" /></div>;
  return <a href={download} className="flex items-center gap-2 rounded-lg border p-2" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md" style={{ background: "var(--primary-soft)", color: "var(--primary)" }}>{attachmentIcon(attachment.kind, 15)}</span><span className="min-w-0 flex-1"><span className="block truncate text-[9px] font-medium">{attachment.name}</span><span className="text-[8px]" style={{ color: "var(--muted)" }}>{formatBytes(attachment.size)} · {attachment.mimeType}</span></span><Download size={13} color="var(--muted)" /></a>;
}
function AttachmentActions({ attachment, download }: { attachment: DeliveryAttachment; download: string }) { return <div className="absolute bottom-1 end-1 flex items-center gap-1 rounded-md bg-black/65 px-1.5 py-1 text-[8px] text-white"><span className="max-w-[130px] truncate">{attachment.name}</span><span className="opacity-70">{formatBytes(attachment.size)}</span><a href={download} title="تنزيل" aria-label={`تنزيل ${attachment.name}`}><Download size={11} /></a></div>; }
function AttachmentMeta({ attachment, download }: { attachment: DeliveryAttachment; download: string }) { return <div className="flex items-center gap-1.5 px-2 py-1 text-[8px]"><span className="min-w-0 flex-1 truncate">{attachment.name}</span><span style={{ color: "var(--muted)" }}>{formatBytes(attachment.size)}</span><a href={download} title="تنزيل" aria-label={`تنزيل ${attachment.name}`}><Download size={11} /></a></div>; }
function attachmentIcon(kind: DeliveryAttachment["kind"], size: number) { return kind === "document" ? <FileText size={size} /> : kind === "archive" ? <FileArchive size={size} /> : kind === "audio" ? <FileAudio size={size} /> : kind === "image" ? <FileImage size={size} /> : kind === "video" ? <Video size={size} /> : <FileIcon size={size} />; }
function fileIcon(mime: string, size: number) { return mime.startsWith("image/") ? <FileImage size={size} /> : mime.startsWith("video/") ? <Video size={size} /> : mime.startsWith("audio/") ? <FileAudio size={size} /> : mime.includes("zip") || mime.includes("rar") || mime.includes("7z") ? <FileArchive size={size} /> : mime.includes("pdf") || mime.startsWith("text/") ? <FileText size={size} /> : <FileIcon size={size} />; }
function formatBytes(bytes: number) { if (!bytes) return "0 B"; const units = ["B", "KB", "MB", "GB"]; const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1); return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`; }
function formatDuration(seconds: number) { return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`; }

function ProjectModal({ open, onClose, project, employees, allowedCompanies, busy, onSave }: { open: boolean; onClose: () => void; project: WorkspaceProject | null; employees: Employee[]; allowedCompanies: CompanyKey[]; busy: boolean; onSave: (draft: ProjectDraft) => Promise<void> }) {
  const [company, setCompany] = useState<CompanyKey>(allowedCompanies[0]); const [name, setName] = useState(""); const [client, setClient] = useState(""); const [dueDate, setDueDate] = useState(""); const [memberIds, setMemberIds] = useState<string[]>([]); const [more, setMore] = useState(false); const [description, setDescription] = useState(""); const [budget, setBudget] = useState(""); const [startDate, setStartDate] = useState("");
  useEffect(() => { if (!open) return; setCompany(project?.company || allowedCompanies[0]); setName(project?.name || ""); setClient(project?.client || ""); setDueDate(project?.dueDate || ""); setMemberIds(project?.memberIds || []); setDescription(project?.description || ""); setBudget(project?.budget == null ? "" : String(project.budget)); setStartDate(project?.startDate || ""); setMore(Boolean(project?.description || project?.budget || project?.startDate)); }, [open, project, allowedCompanies]);
  const available = employees.filter((employee) => employee.company === company && employee.status !== "غير نشط");
  const changeCompany = (next: CompanyKey) => { setCompany(next); setMemberIds((current) => current.filter((id) => employees.find((employee) => employee.id === id)?.company === next)); };
  const submit = async (event: FormEvent) => { event.preventDefault(); if (!name.trim() || !dueDate) return; await onSave({ name: name.trim(), company, client: client.trim(), dueDate, memberIds, description: description.trim(), budget: budget ? Number(budget) : null, startDate }); };
  return <Modal open={open} onClose={onClose} title={project ? "تعديل المشروع" : "مشروع جديد"} subtitle="أنشئ المشروع ثم أضف مهامه من مساحة العمل" maxWidth="max-w-2xl"><form onSubmit={(event) => void submit(event)}><div className="space-y-4 p-5"><div><span className="label">الشركة *</span><div className="grid grid-cols-2 gap-2">{allowedCompanies.map((key) => <button type="button" key={key} onClick={() => changeCompany(key)} className="flex items-center gap-2 rounded-lg border p-3 text-start" style={{ borderColor: company === key ? companies[key].color : "var(--border)", background: company === key ? `${companies[key].color}12` : "transparent" }}><span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `${companies[key].color}18`, color: companies[key].color }}>{key === "spark" ? <ClipboardList size={16} /> : <Users size={16} />}</span><span><b className="block text-xs font-medium">{companies[key].name}</b><span className="text-[9px]" style={{ color: "var(--muted)" }}>{companies[key].subtitle}</span></span>{company === key && <Check className="ms-auto" size={14} color={companies[key].color} />}</button>)}</div></div><label><span className="label">اسم المشروع *</span><input className="field" value={name} onChange={(event) => setName(event.target.value)} placeholder="مثال: تقييم ومعاينة مصنع الرياض" required /></label><div className="grid gap-3 sm:grid-cols-2"><label><span className="label">العميل</span><input className="field" value={client} onChange={(event) => setClient(event.target.value)} placeholder="اسم العميل" /></label><label><span className="label">تاريخ التسليم *</span><input className="field" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} required /></label></div><div><span className="label">فريق المشروع</span>{available.length ? <div className="flex flex-wrap gap-1.5">{available.map((employee) => <button type="button" key={employee.id} onClick={() => setMemberIds((current) => current.includes(employee.id) ? current.filter((id) => id !== employee.id) : [...current, employee.id])} className={`chip h-9 ${memberIds.includes(employee.id) ? "chip-active" : ""}`}><Avatar name={employee.name} color={employee.color} size="sm" />{employee.name}{memberIds.includes(employee.id) && <Check size={12} />}</button>)}</div> : <p className="rounded-lg p-3 text-xs" style={{ background: "var(--surface-2)", color: "var(--muted)" }}>لا يوجد موظفون في هذه الشركة.</p>}</div><button type="button" className="flex w-full items-center justify-between rounded-lg border p-3 text-xs" style={{ borderColor: "var(--border)", color: "var(--muted)" }} onClick={() => setMore(!more)}>خيارات إضافية: الوصف والميزانية وتاريخ البداية<ChevronLeft size={14} className={`transition-transform ${more ? "-rotate-90" : ""}`} /></button>{more && <div className="grid gap-3 sm:grid-cols-2"><label className="sm:col-span-2"><span className="label">الوصف</span><textarea className="field min-h-16 resize-none py-2" value={description} onChange={(event) => setDescription(event.target.value)} /></label><label><span className="label">الميزانية</span><input className="field" type="number" min="0" value={budget} onChange={(event) => setBudget(event.target.value)} /></label><label><span className="label">تاريخ البداية</span><input className="field" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label></div>}</div><ModalFooter busy={busy} onClose={onClose} disabled={!name.trim() || !dueDate} submitLabel={project ? "حفظ التعديلات" : "إنشاء المشروع"} /></form></Modal>;
}

function AssignMembersModal({ open, onClose, project, employees, busy, onSave }: { open: boolean; onClose: () => void; project: WorkspaceProject; employees: Employee[]; busy: boolean; onSave: (ids: string[]) => Promise<void> }) {
  const [selected, setSelected] = useState<string[]>([]); const [query, setQuery] = useState("");
  useEffect(() => { if (open) { setSelected(project.memberIds); setQuery(""); } }, [open, project]);
  const available = employees.filter((employee) => employee.company === project.company && employee.name.includes(query));
  return <Modal open={open} onClose={onClose} title="إضافة موظفين للمشروع" subtitle={`${project.name} · ${companies[project.company].name}`}><div className="border-b p-3" style={{ borderColor: "var(--border)" }}><div className="relative"><Search className="absolute end-3 top-1/2 -translate-y-1/2" size={15} color="var(--muted)" /><input className="field pe-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث عن موظف" /></div></div><div className="max-h-[360px] space-y-1.5 overflow-y-auto p-3">{available.map((employee) => { const checked = selected.includes(employee.id); return <button type="button" key={employee.id} onClick={() => setSelected((current) => checked ? current.filter((id) => id !== employee.id) : [...current, employee.id])} className="flex w-full items-center gap-2 rounded-lg border p-2 text-start" style={{ borderColor: checked ? "var(--primary)" : "var(--border)", background: checked ? "var(--primary-soft)" : "transparent" }}><Avatar name={employee.name} color={employee.color} size="sm" /><span className="min-w-0 flex-1"><b className="block truncate text-xs font-medium">{employee.name}</b><span className="text-[10px]" style={{ color: "var(--muted)" }}>{employee.title} · {employee.department}</span></span><span className="flex h-5 w-5 items-center justify-center rounded border" style={{ borderColor: checked ? "var(--primary)" : "var(--border-strong)", background: checked ? "var(--primary)" : "transparent", color: "white" }}>{checked && <Check size={12} />}</span></button>; })}</div><footer className="flex items-center justify-between border-t p-3" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}><span className="text-xs" style={{ color: "var(--muted)" }}>{selected.length} محدد</span><div className="flex gap-2"><button className="btn" onClick={onClose} disabled={busy}>إلغاء</button><button className="btn-primary" onClick={() => void onSave(selected)} disabled={busy}>{busy && <Loader2 size={14} className="animate-spin" />}حفظ الفريق</button></div></footer></Modal>;
}

function TaskModal({ open, onClose, members, projectName, busy, onSave }: { open: boolean; onClose: () => void; members: Employee[]; projectName: string; busy: boolean; onSave: (payload: { title: string; description: string; assigneeId: string; helperIds: string[]; priority: Priority; dueDate: string; subtaskTitles: string[] }) => Promise<void> }) {
  const [title, setTitle] = useState(""); const [description, setDescription] = useState(""); const [assigneeId, setAssigneeId] = useState(""); const [helperIds, setHelperIds] = useState<string[]>([]); const [priority, setPriority] = useState<Priority>("NORMAL"); const [dueDate, setDueDate] = useState(""); const [subtasks, setSubtasks] = useState<string[]>([]); const [nextSubtask, setNextSubtask] = useState("");
  useEffect(() => { if (open) { setTitle(""); setDescription(""); setAssigneeId(members[0]?.id || ""); setHelperIds([]); setPriority("NORMAL"); setDueDate(""); setSubtasks([]); setNextSubtask(""); } }, [open, members]);
  const addSubtask = () => { if (nextSubtask.trim()) { setSubtasks((current) => [...current, nextSubtask.trim()]); setNextSubtask(""); } };
  const submit = async (event: FormEvent) => { event.preventDefault(); if (!title.trim() || !assigneeId || !dueDate) return; await onSave({ title: title.trim(), description: description.trim(), assigneeId, helperIds, priority, dueDate, subtaskTitles: subtasks }); };
  return <Modal open={open} onClose={onClose} title="مهمة جديدة" subtitle={`ضمن مشروع: ${projectName}`} maxWidth="max-w-2xl"><form onSubmit={(event) => void submit(event)}><div className="space-y-4 p-5"><label><span className="label">عنوان المهمة *</span><input className="field" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="ماذا يجب إنجازه؟" required /></label><label><span className="label">الوصف</span><textarea className="field min-h-16 resize-none py-2" value={description} onChange={(event) => setDescription(event.target.value)} /></label><div className="grid gap-3 sm:grid-cols-2"><label><span className="label">الموظف المسؤول *</span><select className="field" value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)}><option value="">اختر موظفاً</option>{members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label><label><span className="label">الموعد *</span><input className="field" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} required /></label></div><div><span className="label">الأولوية</span><div className="flex gap-1.5">{(["NORMAL", "IMPORTANT", "URGENT"] as Priority[]).map((value) => <button type="button" key={value} onClick={() => setPriority(value)} className={`chip ${priority === value ? "chip-active" : ""}`} style={priority === value && value === "URGENT" ? { background: "var(--danger-soft)", color: "var(--danger)" } : undefined}>{priorityLabel[value]}</button>)}</div></div><div><span className="label">الفريق المساعد</span><div className="flex flex-wrap gap-1.5">{members.filter((member) => member.id !== assigneeId).map((member) => <button type="button" key={member.id} onClick={() => setHelperIds((current) => current.includes(member.id) ? current.filter((id) => id !== member.id) : [...current, member.id])} className={`chip ${helperIds.includes(member.id) ? "chip-active" : ""}`}>{member.name}</button>)}</div></div><div><span className="label">التفاصيل (مهام فرعية)</span><div className="flex gap-1.5"><input className="field" value={nextSubtask} onChange={(event) => setNextSubtask(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addSubtask(); } }} placeholder="اكتب مهمة فرعية واضغط Enter" /><button type="button" className="btn" onClick={addSubtask}><Plus size={15} /></button></div><div className="mt-2 space-y-1">{subtasks.map((value, index) => <div key={`${value}-${index}`} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs" style={{ background: "var(--surface-2)" }}><ClipboardList size={13} color="var(--primary)" />{value}<button type="button" className="ms-auto" onClick={() => setSubtasks((current) => current.filter((_, position) => position !== index))}><X size={13} /></button></div>)}</div></div></div><ModalFooter busy={busy} onClose={onClose} disabled={!title.trim() || !assigneeId || !dueDate} submitLabel="إضافة المهمة" /></form></Modal>;
}

function SubtaskModal({ open, onClose, taskTitle, busy, onSave }: { open: boolean; onClose: () => void; taskTitle: string; busy: boolean; onSave: (payload: { title: string; itemTexts: string[] }) => Promise<void> }) {
  const [title, setTitle] = useState(""); const [items, setItems] = useState("");
  useEffect(() => { if (open) { setTitle(""); setItems(""); } }, [open]);
  const submit = async (event: FormEvent) => { event.preventDefault(); if (!title.trim()) return; await onSave({ title: title.trim(), itemTexts: items.split("\n").map((item) => item.trim()).filter(Boolean) }); };
  return <Modal open={open} onClose={onClose} title="مهمة فرعية جديدة" subtitle={`ضمن: ${taskTitle}`}><form onSubmit={(event) => void submit(event)}><div className="space-y-4 p-5"><label><span className="label">العنوان *</span><input className="field" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="مثال: تصوير الآلات وأرقامها" required /></label><label><span className="label">بنود التنفيذ <span style={{ color: "var(--subtle)" }}>(بند في كل سطر)</span></span><textarea className="field min-h-32 resize-none py-2" value={items} onChange={(event) => setItems(event.target.value)} placeholder={"تصوير الآلة 1\nتصوير الآلة 2\nتوثيق الرقم التسلسلي"} /></label></div><ModalFooter busy={busy} onClose={onClose} disabled={!title.trim()} submitLabel="إضافة التفاصيل" /></form></Modal>;
}

function ModalFooter({ busy, onClose, disabled, submitLabel }: { busy: boolean; onClose: () => void; disabled: boolean; submitLabel: string }) { return <footer className="flex justify-end gap-2 border-t p-3" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}><button type="button" className="btn" onClick={onClose} disabled={busy}>إلغاء</button><button className="btn-primary" disabled={busy || disabled}>{busy && <Loader2 size={14} className="animate-spin" />}{submitLabel}</button></footer>; }
