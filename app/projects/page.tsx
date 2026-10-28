"use client";

import AppShell from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { Avatar, Modal, Progress, Toast } from "@/components/ui";
import { API_URL, ApiError, apiRequest, apiUpload } from "@/lib/api";
import { companies, CompanyKey, Employee } from "@/lib/data";
import {
  AlertTriangle,
  Archive,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  CircleStop,
  ClipboardList,
  Download,
  Edit3,
  ExternalLink,
  File as FileIcon,
  FileArchive,
  FileAudio,
  FileImage,
  FileText,
  FolderKanban,
  GripVertical,
  Image as ImageIcon,
  Link2,
  ListFilter,
  Loader2,
  Mic,
  MoreHorizontal,
  Paperclip,
  Pin,
  Plus,
  RotateCcw,
  Search,
  Send,
  Sparkles,
  Star,
  Trash2,
  UserPlus,
  Users,
  Video,
  X,
} from "lucide-react";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

type Role = "SUPER_ADMIN" | "SUPERVISOR" | "EMPLOYEE";
type WorkStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
type Priority = "NORMAL" | "IMPORTANT" | "URGENT";
type ProjectStatus = "ACTIVE" | "COMPLETED" | "ARCHIVED";
type ApiEmployee = {
  _id: string;
  fullName?: string;
  phone?: string;
  email?: string;
  role: Role;
  company: CompanyKey | null;
  department?: string;
  jobTitle?: string;
  status: "ACTIVE" | "ON_LEAVE" | "INACTIVE";
};
type Organisation = {
  key: string;
  name: string;
  color?: string;
  departments?: Array<{ name: string }>;
};
type ItemNode = {
  _id: string;
  text: string;
  done: boolean;
  attachments: number;
  order: number;
};
type SubtaskNode = {
  _id: string;
  title: string;
  manualStatus: WorkStatus;
  startedAt?: string | null;
  order: number;
  items: ItemNode[];
  progress: number;
  derivedStatus: WorkStatus;
  completedItems: number;
};
type TaskNode = {
  _id: string;
  title: string;
  description: string;
  assigneeId: string;
  helperIds: string[];
  priority: Priority;
  dueDate?: string | null;
  manualStatus: WorkStatus;
  order: number;
  subtasks: SubtaskNode[];
  progress: number;
  derivedStatus: WorkStatus;
};
type DeliveryAttachment = {
  storageId: string;
  name: string;
  mimeType: string;
  size: number;
  kind: "image" | "video" | "audio" | "document" | "archive" | "file";
  url: string;
};
type DeliveryNode = {
  _id: string;
  authorId: string | ApiEmployee;
  taskId: string;
  subtaskId?: string | null;
  itemId?: string | null;
  text: string;
  link?: string;
  attachmentName?: string;
  attachmentType?: "image" | "video" | "file" | "link" | "";
  attachments?: DeliveryAttachment[];
  createdAt: string;
};
type ApiProject = {
  _id: string;
  name: string;
  company: CompanyKey;
  client?: string;
  description?: string;
  startDate?: string | null;
  dueDate?: string | null;
  budget?: number | null;
  status: ProjectStatus;
  isPinned?: boolean;
  isFavorite?: boolean;
  order?: number;
  members: Array<string | ApiEmployee>;
  progress?: number;
  totalTasks?: number;
  tasks?: TaskNode[];
  deliveries?: DeliveryNode[];
};
type WorkspaceProject = {
  id: string;
  name: string;
  company: CompanyKey;
  client: string;
  description: string;
  startDate: string;
  dueDate: string;
  budget: number | null;
  status: ProjectStatus;
  isPinned: boolean;
  isFavorite: boolean;
  order: number;
  memberIds: string[];
  progress: number;
  totalTasks: number;
};
type WorkspaceTree = Omit<ApiProject, "members"> & {
  members: ApiEmployee[];
  tasks: TaskNode[];
  deliveries: DeliveryNode[];
  progress: number;
  totalTasks: number;
};
type ProjectDraft = Omit<
  WorkspaceProject,
  "id" | "status" | "progress" | "totalTasks" | "isPinned" | "isFavorite" | "order"
>;
type TaskDraft = {
  title: string;
  description: string;
  assigneeId: string;
  helperIds: string[];
  priority: Priority;
  dueDate: string;
  subtaskTitles: string[];
  manualStatus?: WorkStatus;
};
type SubtaskDraft = {
  title: string;
  itemTexts: string[];
  manualStatus?: WorkStatus;
};
type ProjectSort = "manual" | "due" | "progress" | "name";
type TaskFilter = "all" | "open" | "late" | Priority;
type DragEntity = "project" | "member" | "task" | "subtask" | "item";

const colors = ["#534AB7", "#1D9E75", "#185FA5", "#993C1D", "#BA7517"];
const priorityLabel: Record<Priority, string> = {
  NORMAL: "عادية",
  IMPORTANT: "مهمة",
  URGENT: "عاجلة",
};

function companyMeta(key: CompanyKey) {
  return (
    companies[key] || {
      id: key,
      name: key,
      subtitle: "",
      color: "#7A2838",
      icon: "Building2",
    }
  );
}

function toEmployee(item: ApiEmployee, index = 0): Employee {
  return {
    id: item._id,
    name: item.fullName?.trim() || "موظف",
    company: item.company,
    department: item.department || "—",
    title: item.jobTitle || (item.role === "SUPERVISOR" ? "مشرف" : "موظف"),
    status:
      item.status === "ACTIVE"
        ? "نشط"
        : item.status === "ON_LEAVE"
          ? "في إجازة"
          : "غير نشط",
    phone: item.phone || "",
    email: item.email || "",
    nationalId: "",
    manager: "",
    hireDate: "",
    birthDate: "",
    contract: "",
    gender: "",
    role: item.role,
    color: colors[index % colors.length],
  };
}
function toProject(item: ApiProject): WorkspaceProject {
  return {
    id: item._id,
    name: item.name,
    company: item.company,
    client: item.client || "",
    description: item.description || "",
    startDate: item.startDate?.slice(0, 10) || "",
    dueDate: item.dueDate?.slice(0, 10) || "",
    budget: item.budget ?? null,
    status: item.status,
    isPinned: Boolean(item.isPinned),
    isFavorite: Boolean(item.isFavorite),
    order: item.order || 0,
    memberIds: item.members.map((member) =>
      typeof member === "string" ? member : member._id,
    ),
    progress: item.progress || 0,
    totalTasks: item.totalTasks || 0,
  };
}
function shortDate(value?: string | null) {
  return value
    ? new Intl.DateTimeFormat("ar-SA", {
        day: "numeric",
        month: "short",
      }).format(new Date(value))
    : "—";
}
function statusColor(status: WorkStatus) {
  return status === "COMPLETED"
    ? "var(--success)"
    : status === "IN_PROGRESS"
      ? "var(--warning)"
      : "var(--border-strong)";
}
function isOverdue(value: string | null | undefined, progress: number) {
  return (
    Boolean(value) &&
    value! < new Date().toISOString().slice(0, 10) &&
    progress < 100
  );
}

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
  const [projectSort, setProjectSort] = useState<ProjectSort>("manual");
  const [attentionOnly, setAttentionOnly] = useState(false);
  const [taskQuery, setTaskQuery] = useState("");
  const [taskFilter, setTaskFilter] = useState<TaskFilter>("all");
  const [companyKeys, setCompanyKeys] = useState<CompanyKey[]>([]);
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
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [editingProject, setEditingProject] = useState<WorkspaceProject | null>(
    null,
  );
  const [editingTask, setEditingTask] = useState<TaskNode | null>(null);
  const [editingSubtask, setEditingSubtask] = useState<SubtaskNode | null>(
    null,
  );
  const [editingItemId, setEditingItemId] = useState("");
  const [editingItemText, setEditingItemText] = useState("");
  const [dragged, setDragged] = useState<{ entity: DragEntity; id: string } | null>(null);
  const draggedRef = useRef<{ entity: DragEntity; id: string } | null>(null);
  const workspaceRequestRef = useRef(0);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2500);
  }
  function showError(caught: unknown, fallback: string) {
    setError(caught instanceof ApiError ? caught.message : fallback);
  }

  const loadCatalog = useCallback(async (preferredId?: string) => {
    setLoading(true);
    setError("");
    try {
      const [active, archived, employeeList, organisations] = await Promise.all([
        apiRequest<ApiProject[]>("/projects"),
        apiRequest<ApiProject[]>("/projects?archived=true"),
        apiRequest<ApiEmployee[]>("/employees"),
        apiRequest<Organisation[]>("/companies"),
      ]);
      organisations.forEach((entry) => {
        companies[entry.key] = {
          id: entry.key,
          name: entry.name,
          subtitle: "",
          color: entry.color || "#7A2838",
          icon: "Building2",
        };
      });
      setCompanyKeys(organisations.map((entry) => entry.key));
      const nextProjects = [...active, ...archived].map(toProject);
      setProjects(nextProjects);
      setEmployees(
        employeeList
          .filter(
            (employee) => employee.role !== "SUPER_ADMIN" && employee.company,
          )
          .map(toEmployee),
      );
      const params = new URLSearchParams(window.location.search);
      const company = params.get("c");
      if (company && organisations.some((entry) => entry.key === company))
        setFilter(company);
      const requested =
        preferredId ||
        params.get("p") ||
        localStorage.getItem("spark-last-project") ||
        "";
      setProjectId(
        nextProjects.some((project) => project.id === requested)
          ? requested
          : nextProjects.find((project) => project.status !== "ARCHIVED")?.id ||
              nextProjects[0]?.id ||
              "",
      );
    } catch (caught) {
      showError(caught, "تعذر تحميل المشاريع");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) void loadCatalog();
  }, [user, loadCatalog]);

  const applyWorkspace = useCallback(
    (tree: WorkspaceTree, useUrl = false) => {
      setWorkspace(tree);
      setProjects((current) =>
        current.map((project) =>
          project.id === tree._id ? toProject(tree) : project,
        ),
      );
      const params = new URLSearchParams(window.location.search);
      const members = tree.members.map((member) => member._id);
      const nextEmployee =
        (useUrl && members.includes(params.get("e") || "")
          ? params.get("e")
          : members.includes(employeeId)
            ? employeeId
            : members[0]) || "";
      const employeeTasks = tree.tasks.filter(
        (task) =>
          task.assigneeId === nextEmployee ||
          task.helperIds?.includes(nextEmployee),
      );
      const nextTask =
        (useUrl
          ? tree.tasks.find((task) => task._id === params.get("t"))
          : tree.tasks.find((task) => task._id === taskId)) ||
        employeeTasks[0] ||
        tree.tasks[0];
      const nextSubtask =
        (useUrl
          ? nextTask?.subtasks.find(
              (subtask) => subtask._id === params.get("s"),
            )
          : nextTask?.subtasks.find((subtask) => subtask._id === subtaskId)) ||
        nextTask?.subtasks[0];
      const nextItem = useUrl
        ? nextSubtask?.items.find((item) => item._id === params.get("i"))
        : nextSubtask?.items.find((item) => item._id === itemId);
      setEmployeeId(nextEmployee);
      setTaskId(nextTask?._id || "");
      setSubtaskId(nextSubtask?._id || "");
      setItemId(nextItem?._id || "");
    },
    [employeeId, taskId, subtaskId, itemId],
  );

  const loadWorkspace = useCallback(
    async (id: string, useUrl = false) => {
      const requestId = ++workspaceRequestRef.current;
      if (!id) {
        setWorkspace(null);
        setWorkspaceLoading(false);
        return;
      }
      setWorkspaceLoading(true);
      setError("");
      try {
        const tree = await apiRequest<WorkspaceTree>(
          `/workspace/tree?projectId=${id}`,
        );
        if (workspaceRequestRef.current !== requestId || tree._id !== id)
          return;
        applyWorkspace(tree, useUrl);
      } catch (caught) {
        if (workspaceRequestRef.current === requestId) {
          showError(caught, "تعذر تحميل مساحة المشروع");
          setWorkspace(null);
        }
      } finally {
        if (workspaceRequestRef.current === requestId)
          setWorkspaceLoading(false);
      }
    },
    [applyWorkspace],
  );

  useEffect(() => {
    if (projectId) void loadWorkspace(projectId, true);
  }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  const project = projects.find((entry) => entry.id === projectId) || null;
  const activeWorkspace = workspace?._id === projectId ? workspace : null;
  const validWorkspaceMembers = useMemo(
    () =>
      (activeWorkspace?.members || []).filter((member): member is ApiEmployee =>
        Boolean(member?._id),
      ),
    [activeWorkspace],
  );
  const memberMap = useMemo(
    () =>
      new Map(
        validWorkspaceMembers.map((member, index) => [
          member._id,
          toEmployee(member, index),
        ]),
      ),
    [validWorkspaceMembers],
  );
  const members = validWorkspaceMembers
    .map((member) => memberMap.get(member._id))
    .filter((member): member is Employee => Boolean(member));
  const employeeTasks =
    activeWorkspace?.tasks.filter(
      (task) =>
        !employeeId ||
        task.assigneeId === employeeId ||
        task.helperIds?.includes(employeeId),
    ) || [];
  const task =
    activeWorkspace?.tasks.find((entry) => entry._id === taskId) ||
    employeeTasks[0] ||
    null;
  const subtask =
    task?.subtasks.find((entry) => entry._id === subtaskId) ||
    task?.subtasks[0] ||
    null;
  const item = subtask?.items.find((entry) => entry._id === itemId) || null;
  // Deliveries belong to execution items only; stages are never delivery targets.
  const selectedDeliveries = item
    ? (activeWorkspace?.deliveries || []).filter(
        (delivery) => delivery.itemId === item._id,
      )
    : [];
  const visibleProjects = useMemo(
    () =>
      projects
        .filter(
          (entry) =>
            (filter === "all" ||
              filter === "archive" ||
              entry.company === filter) &&
            (filter === "archive"
              ? entry.status === "ARCHIVED"
              : entry.status !== "ARCHIVED") &&
            (!attentionOnly || isOverdue(entry.dueDate, entry.progress)) &&
            `${entry.name} ${entry.client} ${companyMeta(entry.company).name}`
              .toLocaleLowerCase("ar")
              .includes(query.trim().toLocaleLowerCase("ar")),
        )
        .sort((a, b) =>
          Number(b.isPinned) - Number(a.isPinned) ||
          (projectSort === "manual"
            ? a.order - b.order
            : projectSort === "name"
              ? a.name.localeCompare(b.name, "ar")
              : projectSort === "progress"
                ? a.progress - b.progress
                : (a.dueDate || "9999-12-31").localeCompare(
                    b.dueDate || "9999-12-31",
                  )),
        ),
    [projects, filter, query, attentionOnly, projectSort],
  );
  const totalTasks = projects
    .filter((entry) => entry.status !== "ARCHIVED")
    .reduce((sum, entry) => sum + entry.totalTasks, 0);
  const activeProjects = projects.filter(
    (entry) => entry.status !== "ARCHIVED",
  );
  const totalProgress = activeProjects.length
    ? Math.round(
        activeProjects.reduce((sum, entry) => sum + entry.progress, 0) /
          activeProjects.length,
      )
    : 0;
  const overdueProjects = activeProjects.filter((entry) =>
    isOverdue(entry.dueDate, entry.progress),
  ).length;
  const visibleEmployeeTasks = useMemo(
    () =>
      employeeTasks.filter((entry) => {
        const matchesQuery = `${entry.title} ${entry.description}`
          .toLocaleLowerCase("ar")
          .includes(taskQuery.trim().toLocaleLowerCase("ar"));
        const matchesFilter =
          taskFilter === "all" ||
          (taskFilter === "open" && entry.progress < 100) ||
          (taskFilter === "late" && isOverdue(entry.dueDate, entry.progress)) ||
          entry.priority === taskFilter;
        return matchesQuery && matchesFilter;
      }),
    [employeeTasks, taskQuery, taskFilter],
  );
  const canWorkOnTask =
    canManage ||
    Boolean(
      user &&
      task &&
      (task.assigneeId === user.id || task.helperIds?.includes(user.id)),
    );

  function syncUrl(
    values: { p?: string; e?: string; t?: string; s?: string; i?: string },
    selectedFilter = filter,
  ) {
    const params = new URLSearchParams();
    if (selectedFilter !== "all" && selectedFilter !== "archive")
      params.set("c", selectedFilter);
    if (values.p) params.set("p", values.p);
    if (values.e) params.set("e", values.e);
    if (values.t) params.set("t", values.t);
    if (values.s) params.set("s", values.s);
    if (values.i) params.set("i", values.i);
    const queryString = params.toString();
    window.history.replaceState(
      {},
      "",
      queryString
        ? `${window.location.pathname}?${queryString}`
        : window.location.pathname,
    );
  }
  function clearWorkspaceSelection(clearProject = false) {
    workspaceRequestRef.current += 1;
    if (clearProject) setProjectId("");
    setWorkspace(null);
    setWorkspaceLoading(false);
    setEmployeeId("");
    setTaskId("");
    setSubtaskId("");
    setItemId("");
  }
  function chooseFilter(nextFilter: typeof filter) {
    setFilter(nextFilter);
    const keepProject = Boolean(
      project &&
      (nextFilter === "archive"
        ? project.status === "ARCHIVED"
        : project.status !== "ARCHIVED" &&
          (nextFilter === "all" || project.company === nextFilter)),
    );
    if (!keepProject) {
      clearWorkspaceSelection(true);
      setLevel(0);
      syncUrl({}, nextFilter);
    } else
      syncUrl(
        {
          p: projectId,
          e: employeeId,
          t: task?._id,
          s: subtask?._id,
          i: item?._id,
        },
        nextFilter,
      );
  }
  function chooseProject(id: string) {
    // Selecting the active project must not clear its already loaded workflow.
    // React ignores setting the same project id, which previously left the columns empty.
    if (id === projectId) {
      setLevel(1);
      localStorage.setItem("spark-last-project", id);
      syncUrl({ p: id, e: employeeId, t: taskId, s: subtaskId, i: itemId });
      if (!activeWorkspace && !workspaceLoading) void loadWorkspace(id, true);
      return;
    }
    clearWorkspaceSelection();
    setWorkspaceLoading(true);
    setProjectId(id);
    setTaskQuery("");
    setTaskFilter("all");
    setLevel(1);
    localStorage.setItem("spark-last-project", id);
    syncUrl({ p: id });
  }
  function chooseEmployee(id: string) {
    const next = activeWorkspace?.tasks.find(
      (entry) => entry.assigneeId === id || entry.helperIds?.includes(id),
    );
    setEmployeeId(id);
    setTaskId(next?._id || "");
    setSubtaskId(next?.subtasks[0]?._id || "");
    setItemId("");
    setEditingItemId("");
    setLevel(2);
    syncUrl({ p: projectId, e: id, t: next?._id, s: next?.subtasks[0]?._id });
  }
  function chooseTask(next: TaskNode) {
    setTaskId(next._id);
    setSubtaskId(next.subtasks[0]?._id || "");
    setItemId("");
    setEditingItemId("");
    setLevel(3);
    syncUrl({
      p: projectId,
      e: employeeId,
      t: next._id,
      s: next.subtasks[0]?._id,
    });
  }
  function chooseSubtask(next: SubtaskNode) {
    setSubtaskId(next._id);
    setItemId("");
    setEditingItemId("");
    setLevel(4);
    syncUrl({ p: projectId, e: employeeId, t: taskId, s: next._id });
  }
  function chooseItem(id: string) {
    setItemId(id);
    setEditingItemId("");
    setLevel(5);
    syncUrl({ p: projectId, e: employeeId, t: taskId, s: subtaskId, i: id });
  }
  const columnClass = (index: number) =>
    `${level === index ? "flex" : "hidden"} md:flex`;

  async function saveProject(draft: ProjectDraft) {
    setBusy(true);
    setError("");
    const wasEditing = Boolean(editingProject);
    try {
      const body = {
        name: draft.name,
        company: draft.company,
        description: draft.description || undefined,
        startDate: draft.startDate || undefined,
        dueDate: draft.dueDate || null,
        memberIds: draft.memberIds,
      };
      const result = editingProject
        ? await apiRequest<ApiProject>(`/projects/${editingProject.id}`, {
            method: "PATCH",
            body: JSON.stringify(body),
          })
        : await apiRequest<ApiProject>("/projects", {
            method: "POST",
            body: JSON.stringify(body),
          });
      setProjectModal(false);
      setEditingProject(null);
      await loadCatalog(result._id);
      await loadWorkspace(result._id);
      notify(wasEditing ? "تم تحديث المشروع" : "تم إنشاء المشروع");
    } catch (caught) {
      showError(caught, "تعذر حفظ المشروع");
    } finally {
      setBusy(false);
    }
  }
  async function saveMembers(memberIds: string[]) {
    if (!project) return;
    setBusy(true);
    try {
      await apiRequest(`/projects/${project.id}/members`, {
        method: "PATCH",
        body: JSON.stringify({ memberIds }),
      });
      setAssignModal(false);
      await loadWorkspace(project.id);
      notify("تم تحديث فريق المشروع");
    } catch (caught) {
      showError(caught, "تعذر تحديث الفريق");
    } finally {
      setBusy(false);
    }
  }
  async function archiveProject(target: WorkspaceProject | null = project) {
    if (!target || busy) return;
    setBusy(true);
    try {
      const status = target.status === "ARCHIVED" ? "ACTIVE" : "ARCHIVED";
      await apiRequest(`/projects/${target.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await loadCatalog(target.id);
      setFilter(status === "ARCHIVED" ? "archive" : "all");
      notify(
        status === "ARCHIVED" ? "تمت أرشفة المشروع" : "تمت استعادة المشروع",
      );
    } catch (caught) {
      showError(caught, "تعذر تحديث المشروع");
    } finally {
      setBusy(false);
    }
  }
  async function toggleProjectCompletion() {
    if (!project || busy) return;
    setBusy(true);
    try {
      const status: ProjectStatus =
        project.status === "COMPLETED" ? "ACTIVE" : "COMPLETED";
      await apiRequest(`/projects/${project.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await loadCatalog(project.id);
      await loadWorkspace(project.id);
      notify(
        status === "COMPLETED"
          ? "تم اعتماد المشروع كمكتمل"
          : "أُعيد المشروع إلى حالة نشطة",
      );
    } catch (caught) {
      showError(caught, "تعذر تحديث حالة المشروع");
    } finally {
      setBusy(false);
    }
  }
  async function toggleProjectFlag(field: "isPinned" | "isFavorite") {
    if (!project || busy) return;
    setBusy(true);
    try {
      await apiRequest(`/projects/${project.id}`, {
        method: "PATCH",
        body: JSON.stringify({ [field]: !project[field] }),
      });
      await loadCatalog(project.id);
      await loadWorkspace(project.id);
      notify(field === "isPinned" ? (project.isPinned ? "تم إلغاء تثبيت المشروع" : "تم تثبيت المشروع في الأعلى") : (project.isFavorite ? "تمت إزالة المشروع من المفضلة" : "تمت إضافة المشروع إلى المفضلة"));
    } catch (caught) {
      showError(caught, "تعذر تحديث المشروع");
    } finally { setBusy(false); }
  }
  function beginDrag(event: React.DragEvent, entity: DragEntity, id: string) {
    const payload = { entity, id };
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/x-spark-erp-node", JSON.stringify(payload));
    event.dataTransfer.setData("text/plain", `${entity}:${id}`);
    draggedRef.current = payload;
    setDragged(payload);
  }
  function endDrag() {
    draggedRef.current = null;
    setDragged(null);
  }
  async function dropOn(event: React.DragEvent, entity: DragEntity, targetId: string) {
    event.preventDefault();
    event.stopPropagation();
    let source = draggedRef.current;
    const transferred = event.dataTransfer.getData("application/x-spark-erp-node");
    if (transferred) {
      try {
        source = JSON.parse(transferred) as { entity: DragEntity; id: string };
      } catch {
        source = draggedRef.current;
      }
    }
    draggedRef.current = null;
    setDragged(null);
    if (!source || source.entity !== entity || source.id === targetId || busy) return;
    setBusy(true);
    try {
      if (entity === "project") {
        await apiRequest(`/projects/${source.id}/move`, { method: "PATCH", body: JSON.stringify({ targetId }) });
        setProjectSort("manual");
        await loadCatalog(projectId || source.id);
      } else if (project) {
        applyWorkspace(await apiRequest<WorkspaceTree>("/workspace/reorder", { method: "PATCH", body: JSON.stringify({ projectId: project.id, entity, id: source.id, targetId }) }));
      }
    } catch (caught) { showError(caught, "تعذر تغيير الترتيب بالسحب"); } finally { setBusy(false); }
  }
  async function deleteProject(target: WorkspaceProject | null = project) {
    if (!target || busy || !window.confirm(`حذف مشروع «${target.name}»؟`))
      return;
    setBusy(true);
    try {
      await apiRequest(`/projects/${target.id}`, { method: "DELETE" });
      if (target.id === projectId) {
        clearWorkspaceSelection(true);
        setLevel(0);
      }
      await loadCatalog();
      notify("تم حذف المشروع");
    } catch (caught) {
      showError(caught, "تعذر حذف المشروع");
    } finally {
      setBusy(false);
    }
  }
  async function saveTask(payload: TaskDraft) {
    if (!project) return;
    const wasEditing = Boolean(editingTask);
    setBusy(true);
    try {
      const path = editingTask ? `/tasks/${editingTask._id}` : "/tasks";
      const body = editingTask
        ? {
            projectId: project.id,
            title: payload.title,
            description: payload.description,
            assigneeId: payload.assigneeId,
            helperIds: payload.helperIds,
            priority: payload.priority,
            dueDate: payload.dueDate || null,
            manualStatus: payload.manualStatus,
          }
        : {
            projectId: project.id,
            ...payload,
            dueDate: payload.dueDate || null,
          };
      applyWorkspace(
        await apiRequest<WorkspaceTree>(path, {
          method: editingTask ? "PATCH" : "POST",
          body: JSON.stringify(body),
        }),
      );
      setTaskModal(false);
      setEditingTask(null);
      notify(wasEditing ? "تم تحديث المهمة" : "تمت إضافة المهمة");
    } catch (caught) {
      showError(caught, wasEditing ? "تعذر تحديث المهمة" : "تعذر إضافة المهمة");
    } finally {
      setBusy(false);
    }
  }
  async function deleteTask(target: TaskNode) {
    if (
      !project ||
      busy ||
      !window.confirm(`حذف مهمة «${target.title}» وكل تفاصيلها وتسليماتها؟`)
    )
      return;
    setBusy(true);
    try {
      applyWorkspace(
        await apiRequest<WorkspaceTree>(
          `/tasks/${target._id}?projectId=${project.id}`,
          { method: "DELETE" },
        ),
      );
      notify("تم حذف المهمة");
    } catch (caught) {
      showError(caught, "تعذر حذف المهمة");
    } finally {
      setBusy(false);
    }
  }
  async function saveSubtask(payload: SubtaskDraft) {
    if (!project || !task) return;
    const wasEditing = Boolean(editingSubtask);
    setBusy(true);
    try {
      const path = editingSubtask
        ? `/subtasks/${editingSubtask._id}`
        : `/subtasks/task/${task._id}`;
      const body = editingSubtask
        ? {
            projectId: project.id,
            title: payload.title,
            manualStatus: payload.manualStatus,
          }
        : {
            projectId: project.id,
            title: payload.title,
            itemTexts: payload.itemTexts,
          };
      applyWorkspace(
        await apiRequest<WorkspaceTree>(path, {
          method: editingSubtask ? "PATCH" : "POST",
          body: JSON.stringify(body),
        }),
      );
      setSubtaskModal(false);
      setEditingSubtask(null);
      notify(wasEditing ? "تم تحديث التفاصيل" : "تمت إضافة المهمة الفرعية");
    } catch (caught) {
      showError(
        caught,
        wasEditing ? "تعذر تحديث التفاصيل" : "تعذر إضافة التفاصيل",
      );
    } finally {
      setBusy(false);
    }
  }
  async function startSubtask(target: SubtaskNode) {
    if (!project || busy || target.manualStatus === "IN_PROGRESS") return;
    setBusy(true);
    try {
      applyWorkspace(await apiRequest<WorkspaceTree>(`/subtasks/${target._id}`, { method: "PATCH", body: JSON.stringify({ projectId: project.id, manualStatus: "IN_PROGRESS" }) }));
      notify("بدأ توقيت المرحلة");
    } catch (caught) { showError(caught, "تعذر بدء المرحلة"); } finally { setBusy(false); }
  }
  async function deleteSubtask(target: SubtaskNode) {
    if (
      !project ||
      busy ||
      !window.confirm(`حذف «${target.title}» وبنودها وتسليماتها؟`)
    )
      return;
    setBusy(true);
    try {
      applyWorkspace(
        await apiRequest<WorkspaceTree>(
          `/subtasks/${target._id}?projectId=${project.id}`,
          { method: "DELETE" },
        ),
      );
      notify("تم حذف التفاصيل");
    } catch (caught) {
      showError(caught, "تعذر حذف التفاصيل");
    } finally {
      setBusy(false);
    }
  }
  async function addItem(text: string) {
    if (!project || !subtask) return;
    try {
      applyWorkspace(
        await apiRequest<WorkspaceTree>(`/items/subtask/${subtask._id}`, {
          method: "POST",
          body: JSON.stringify({ projectId: project.id, text }),
        }),
      );
    } catch (caught) {
      showError(caught, "تعذر إضافة البند");
    }
  }
  async function saveItem(target: ItemNode) {
    const text = editingItemText.trim();
    if (!project || !text || busy) return;
    setBusy(true);
    try {
      applyWorkspace(
        await apiRequest<WorkspaceTree>(`/items/${target._id}`, {
          method: "PATCH",
          body: JSON.stringify({ projectId: project.id, text }),
        }),
      );
      setEditingItemId("");
      setEditingItemText("");
      notify("تم تحديث بند التنفيذ");
    } catch (caught) {
      showError(caught, "تعذر تحديث البند");
    } finally {
      setBusy(false);
    }
  }
  async function deleteItem(target: ItemNode) {
    if (
      !project ||
      busy ||
      !window.confirm(`حذف بند «${target.text}» وتسليماته؟`)
    )
      return;
    setBusy(true);
    try {
      applyWorkspace(
        await apiRequest<WorkspaceTree>(
          `/items/${target._id}?projectId=${project.id}`,
          { method: "DELETE" },
        ),
      );
      setEditingItemId("");
      notify("تم حذف بند التنفيذ");
    } catch (caught) {
      showError(caught, "تعذر حذف البند");
    } finally {
      setBusy(false);
    }
  }
  async function toggleItem(target: ItemNode) {
    if (!project || !workspace) return;
    setWorkspace({
      ...workspace,
      tasks: workspace.tasks.map((entry) => ({
        ...entry,
        subtasks: entry.subtasks.map((sub) => ({
          ...sub,
          items: sub.items.map((row) =>
            row._id === target._id ? { ...row, done: !row.done } : row,
          ),
        })),
      })),
    });
    try {
      applyWorkspace(
        await apiRequest<WorkspaceTree>(`/items/${target._id}`, {
          method: "PATCH",
          body: JSON.stringify({ projectId: project.id, done: !target.done }),
        }),
      );
    } catch (caught) {
      await loadWorkspace(project.id);
      showError(caught, "تعذر تحديث البند");
    }
  }
  async function addDelivery(payload: {
    text: string;
    link: string;
    files: File[];
    onProgress: (percent: number) => void;
  }) {
    if (!project || !task) return;
    setBusy(true);
    try {
      let result: WorkspaceTree;
      if (payload.files.length) {
        const form = new FormData();
        form.append("projectId", project.id);
        form.append("taskId", task._id);
        if (item?._id) form.append("itemId", item._id);
        if (payload.text) form.append("text", payload.text);
        if (payload.link) form.append("link", payload.link);
        payload.files.forEach((file) => form.append("files", file, file.name));
        result = await apiUpload<WorkspaceTree>(
          "/deliveries",
          form,
          payload.onProgress,
        );
      } else {
        result = await apiRequest<WorkspaceTree>("/deliveries", {
          method: "POST",
          body: JSON.stringify({
            projectId: project.id,
            taskId: task._id,
            itemId: item?._id,
            text: payload.text || undefined,
            link: payload.link || undefined,
            attachmentType: payload.link ? "link" : undefined,
          }),
        });
      }
      applyWorkspace(result);
      const created = result.deliveries[result.deliveries.length - 1];
      if (created?.itemId) {
        const targetTask = result.tasks.find((entry) => entry._id === task._id);
        const targetSubtask = targetTask?.subtasks.find((entry) => entry.items.some((entry) => entry._id === created.itemId));
        setTaskId(task._id);
        setSubtaskId(targetSubtask?._id || "");
        setItemId(created.itemId);
        setLevel(5);
      }
      notify(
        payload.files.length
          ? `تم رفع ${payload.files.length} مرفق وإضافة التسليم`
          : "تمت إضافة التسليم",
      );
    } catch (caught) {
      showError(caught, "تعذر إضافة التسليم");
      throw caught;
    } finally {
      setBusy(false);
    }
  }
  async function deleteDelivery(deliveryId: string) {
    if (
      !project ||
      busy ||
      !window.confirm("هل تريد حذف هذا التسليم ومرفقاته؟")
    )
      return;
    setBusy(true);
    try {
      applyWorkspace(
        await apiRequest<WorkspaceTree>(
          `/deliveries/${deliveryId}?projectId=${project.id}`,
          { method: "DELETE" },
        ),
      );
      notify("تم حذف التسليم ومرفقاته");
    } catch (caught) {
      showError(caught, "تعذر حذف التسليم");
    } finally {
      setBusy(false);
    }
  }

  const breadcrumbs = [
    project ? companyMeta(project.company).name : null,
    project?.name,
    memberMap.get(employeeId)?.name,
    task?.title,
    subtask?.title,
  ].filter(Boolean) as string[];
  const stepAvailability = [
    true,
    Boolean(project),
    Boolean(activeWorkspace),
    Boolean(task),
    Boolean(subtask),
    Boolean(task),
  ];
  const allowedCompanies = useMemo<CompanyKey[]>(
    () =>
      user?.role === "SUPERVISOR" && user.company
        ? [user.company]
        : companyKeys,
    [user?.role, user?.company, companyKeys],
  );

  return (
    <AppShell title="المشاريع والمهام" compact>
      <div
        className="project-workspace min-h-[calc(100vh-48px)] w-full max-w-full overflow-x-hidden border"
        style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
      >
        <div
          className="flex min-h-11 flex-wrap items-center gap-2 border-b px-2.5 py-1.5"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand text-white">
            <FolderKanban size={16} />
          </span>
          <div
            className="min-w-0 flex flex-1 items-center gap-1 overflow-hidden text-[10px]"
            style={{ color: "var(--muted)" }}
          >
            {breadcrumbs.length ? (
              breadcrumbs.map((crumb, index) => (
                <span
                  key={`${crumb}-${index}`}
                  className="flex min-w-0 items-center gap-1"
                >
                  <span
                    className="max-w-[135px] truncate"
                    style={{
                      color:
                        index === breadcrumbs.length - 1
                          ? "var(--text)"
                          : undefined,
                    }}
                  >
                    {crumb}
                  </span>
                  {index < breadcrumbs.length - 1 && <ChevronLeft size={11} />}
                </span>
              ))
            ) : (
              <span>اختر مشروعاً</span>
            )}
          </div>
          <span
            className="hidden whitespace-nowrap text-[10px] lg:block"
            style={{ color: "var(--muted)" }}
          >
            <b style={{ color: "var(--text)" }}>{activeProjects.length}</b>{" "}
            مشروع · <b style={{ color: "var(--text)" }}>{totalTasks}</b> مهمة ·{" "}
            <b style={{ color: "var(--text)" }}>{totalProgress}%</b>
          </span>
          <div className="relative order-last w-full sm:order-none sm:w-52">
            <Search
              className="absolute end-2 top-1/2 -translate-y-1/2"
              size={13}
              color="var(--muted)"
            />
            <input
              className="field h-8 pe-7 text-[11px]"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="بحث في المشاريع"
            />
          </div>
          {canManage && (
            <button
              className="btn-primary h-8 px-2 sm:hidden"
              onClick={() => {
                setEditingProject(null);
                setProjectModal(true);
              }}
            >
              <Plus size={13} />
              جديد
            </button>
          )}
        </div>

        <div
          className="flex flex-wrap items-center gap-1 border-b px-2 py-1.5"
          style={{ borderColor: "var(--border)" }}
        >
          {([
            { key: "all", label: "الكل" },
            ...companyKeys.map((key) => ({ key, label: companyMeta(key).name })),
            { key: "archive", label: "الأرشيف" },
          ] as Array<{ key: "all" | "archive" | CompanyKey; label: string }>).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => chooseFilter(key)}
              className={`chip h-7 whitespace-nowrap px-2 ${filter === key ? "chip-active" : ""}`}
            >
              {key === "archive" ? (
                <Archive size={12} />
              ) : (
                key !== "all" && (
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: companyMeta(key).color }}
                  />
                )
              )}
              {label}
            </button>
          ))}
          <button
            onClick={() => setAttentionOnly((value) => !value)}
            className={`chip h-7 whitespace-nowrap px-2 ${attentionOnly ? "chip-active" : ""}`}
            style={
              attentionOnly
                ? { background: "var(--danger-soft)", color: "var(--danger)" }
                : undefined
            }
          >
            <AlertTriangle size={12} />
            متأخرة{overdueProjects ? ` ${overdueProjects}` : ""}
          </button>
          <label className="ms-auto flex items-center gap-1">
            <ListFilter size={12} color="var(--muted)" />
            <select
              className="field h-7 w-auto min-w-[96px] px-1.5 text-[9px]"
              value={projectSort}
              onChange={(event) =>
                setProjectSort(event.target.value as ProjectSort)
              }
              aria-label="ترتيب المشاريع"
            >
              <option value="manual">الترتيب اليدوي</option>
              <option value="due">الأقرب موعداً</option>
              <option value="progress">الأقل إنجازاً</option>
              <option value="name">حسب الاسم</option>
            </select>
          </label>
        </div>

        {project && (
          <ProjectBrief project={project} />
        )}

        {error && (
          <div
            className="mx-3 mb-2 flex items-center justify-between rounded-lg px-3 py-2 text-xs"
            style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
          >
            <span>{error}</span>
            <button onClick={() => setError("")}>
              <X size={14} />
            </button>
          </div>
        )}
        <MobileSteps
          level={level}
          available={stepAvailability}
          onChange={setLevel}
        />

        <div className="project-columns-wrap w-full max-w-full overflow-x-hidden px-2 pb-2">
          <div className="project-columns min-h-[560px] min-w-0 gap-1.5">
            <WorkspaceColumn
              index={1}
              title="المشاريع"
              count={visibleProjects.length}
              className={columnClass(0)}
              onAdd={
                canManage
                  ? () => {
                      setEditingProject(null);
                      setProjectModal(true);
                    }
                  : undefined
              }
            >
              <ColumnHead first="الاسم" second="الإنجاز" />
              {loading ? (
                <LoadingRows />
              ) : visibleProjects.length ? (
                visibleProjects.map((entry) => (
                  <ProjectRow
                    key={entry.id}
                    project={entry}
                    selected={projectId === entry.id}
                    canManage={Boolean(canManage)}
                    busy={busy}
                    onSelect={() => chooseProject(entry.id)}
                    onEdit={() => {
                      setEditingProject(entry);
                      setProjectModal(true);
                    }}
                    onAssign={() => setAssignModal(true)}
                    onAddTask={() => { setEditingTask(null); setTaskModal(true); }}
                    onArchive={() => void archiveProject(entry)}
                    onDelete={() => void deleteProject(entry)}
                    dragging={dragged?.entity === "project" && dragged.id === entry.id}
                    onDragStart={(event) => beginDrag(event, "project", entry.id)}
                    onDragEnd={endDrag}
                    onDrop={(event) => void dropOn(event, "project", entry.id)}
                    onToggleComplete={() => void toggleProjectCompletion()}
                    onTogglePin={() => void toggleProjectFlag("isPinned")}
                    onToggleFavorite={() => void toggleProjectFlag("isFavorite")}
                  />
                ))
              ) : (
                <ColumnEmpty
                  icon={<FolderKanban size={20} />}
                  text="لا توجد مشاريع"
                />
              )}
            </WorkspaceColumn>

            <WorkspaceColumn
              index={2}
              title="الفريق"
              count={members.length}
              className={columnClass(1)}
              onAdd={
                canManage && project ? () => setAssignModal(true) : undefined
              }
            >
              <ColumnHead first="الموظف" second="المهام" />
              {!project ? (
                <ColumnEmpty icon={<Users size={20} />} text="اختر مشروعاً" />
              ) : workspaceLoading ? (
                <LoadingRows />
              ) : members.length ? (
                members.map((member) => {
                  const assigned =
                    activeWorkspace?.tasks.filter(
                      (entry) =>
                        entry.assigneeId === member.id ||
                        entry.helperIds?.includes(member.id),
                    ) || [];
                  return (
                    <button
                      key={member.id}
                      draggable={Boolean(canManage)}
                      onDragStart={(event) => beginDrag(event, "member", member.id)}
                      onDragEnd={endDrag}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => void dropOn(event, "member", member.id)}
                      onClick={() => chooseEmployee(member.id)}
                      className="flex w-full items-center gap-2 border-b px-2.5 py-2 text-start"
                      style={{
                        borderColor: "var(--border)",
                        background:
                          employeeId === member.id
                            ? "var(--workspace-active)"
                            : "transparent",
                        color: employeeId === member.id ? "var(--workspace-active-text)" : "var(--text)",
                        boxShadow:
                          employeeId === member.id
                            ? "inset -3px 0 var(--workspace-active-strong)"
                            : "none",
                      }}
                    >
                      {canManage && (
                        <GripVertical
                          className="hidden shrink-0 cursor-grab sm:block"
                          size={14}
                          color="var(--muted)"
                        />
                      )}
                      <span className="min-w-0 flex-1 text-xs font-medium">
                        <FullNameTooltip
                          text={member.name}
                          className="block truncate"
                        />
                      </span>
                      <span
                        className="shrink-0 text-[10px]"
                        style={{ color: "var(--muted)" }}
                      >
                        {
                          assigned.filter((entry) => entry.progress === 100)
                            .length
                        }
                        /{assigned.length}
                      </span>
                    </button>
                  );
                })
              ) : (
                <ColumnEmpty icon={<Users size={20} />} text="لا يوجد فريق" />
              )}
            </WorkspaceColumn>

            <WorkspaceColumn
              index={3}
              title="المهام"
              count={visibleEmployeeTasks.length}
              className={columnClass(2)}
              onAdd={
                canManage && project
                  ? () => {
                      setEditingTask(null);
                      setTaskModal(true);
                    }
                  : undefined
              }
            >
              <TaskToolbar
                query={taskQuery}
                filter={taskFilter}
                onQuery={setTaskQuery}
                onFilter={setTaskFilter}
              />
              {!project ? (
                <ColumnEmpty
                  icon={<ClipboardList size={20} />}
                  text="اختر مشروعاً"
                />
              ) : !employeeId && members.length ? (
                <ColumnEmpty icon={<Users size={20} />} text="اختر موظفاً" />
              ) : visibleEmployeeTasks.length ? (
                visibleEmployeeTasks.map((entry) => (
                  <TaskRow
                    key={entry._id}
                    task={entry}
                    selected={task?._id === entry._id}
                    canManage={Boolean(canManage)}
                    busy={busy}
                    onSelect={() => chooseTask(entry)}
                    onEdit={() => {
                      setEditingTask(entry);
                      setTaskModal(true);
                    }}
                    onDelete={() => void deleteTask(entry)}
                    dragging={dragged?.entity === "task" && dragged.id === entry._id}
                    onDragStart={(event) => beginDrag(event, "task", entry._id)}
                    onDragEnd={endDrag}
                    onDrop={(event) => void dropOn(event, "task", entry._id)}
                  />
                ))
              ) : (
                <ColumnEmpty
                  icon={<Search size={20} />}
                  text={
                    employeeTasks.length
                      ? "لا توجد مهام مطابقة للتصفية"
                      : "لا توجد مهام لهذا الموظف"
                  }
                />
              )}
            </WorkspaceColumn>

            <WorkspaceColumn
              index={4}
              title="التفاصيل"
              count={task?.subtasks.length || 0}
              className={columnClass(3)}
              onAdd={
                canManage && task
                  ? () => {
                      setAddingSubtask(true);
                    }
                  : undefined
              }
            >
              <ColumnHead first="المهمة الفرعية" second="البنود" />
              {addingSubtask && task && (
                <InlineStageForm
                  busy={busy}
                  onCancel={() => setAddingSubtask(false)}
                  onSave={async (payload) => {
                    await saveSubtask(payload);
                    setAddingSubtask(false);
                  }}
                />
              )}
              {!task ? (
                <ColumnEmpty
                  icon={<ClipboardList size={20} />}
                  text="اختر مهمة"
                />
              ) : task.subtasks.length ? (
                task.subtasks.map((entry) => (
                  <SubtaskRow
                    key={entry._id}
                    subtask={entry}
                    selected={subtask?._id === entry._id}
                    canManage={Boolean(canManage)}
                    canWork={canWorkOnTask}
                    busy={busy}
                    onSelect={() => chooseSubtask(entry)}
                    onEdit={() => {
                      setEditingSubtask(entry);
                      setSubtaskModal(true);
                    }}
                    onStart={() => void startSubtask(entry)}
                    onDelete={() => void deleteSubtask(entry)}
                    dragging={dragged?.entity === "subtask" && dragged.id === entry._id}
                    onDragStart={(event) => beginDrag(event, "subtask", entry._id)}
                    onDragEnd={endDrag}
                    onDrop={(event) => void dropOn(event, "subtask", entry._id)}
                  />
                ))
              ) : (
                <ColumnEmpty
                  icon={<ClipboardList size={20} />}
                  text="هذه المهمة بلا تفاصيل — أضف أول مرحلة عمل"
                />
              )}
            </WorkspaceColumn>

            <WorkspaceColumn
              index={5}
              title="قائمة التنفيذ"
              count={subtask?.items.length || 0}
              className={columnClass(4)}
            >
              {subtask ? (
                <>
                  <div
                    className="border-b px-2 py-1.5"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <div
                      className="mb-1 flex items-center justify-between text-[9px]"
                      style={{ color: "var(--muted)" }}
                    >
                      <span>
                        {subtask.completedItems}/{subtask.items.length} منجزة
                      </span>
                      <span>{subtask.progress}%</span>
                    </div>
                    <Progress value={subtask.progress} />
                  </div>
                  {canWorkOnTask && <AddItem onAdd={addItem} />}
                  {subtask.items.map((entry) => (
                    <div
                      key={entry._id}
                      draggable={Boolean(canManage)}
                      onDragStart={(event) => beginDrag(event, "item", entry._id)}
                      onDragEnd={endDrag}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => void dropOn(event, "item", entry._id)}
                      className="group flex items-center gap-1.5 border-b px-2 py-1.5"
                      style={{
                        borderColor: "var(--border)",
                        background:
                          itemId === entry._id
                            ? "var(--workspace-active)"
                            : "transparent",
                        color: itemId === entry._id ? "var(--workspace-active-text)" : "var(--text)",
                        boxShadow:
                          itemId === entry._id
                            ? "inset -3px 0 var(--workspace-active-strong)"
                            : "none",
                      }}
                    >
                      {canManage && <GripVertical className="shrink-0 cursor-grab" size={13} color="var(--muted)" />}
                      <button
                        disabled={!canWorkOnTask}
                        onClick={() => void toggleItem(entry)}
                        className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border"
                        style={{
                          borderColor: entry.done
                            ? "var(--success)"
                            : "var(--border-strong)",
                          background: entry.done
                            ? "var(--success)"
                            : "transparent",
                          color: "white",
                        }}
                      >
                        {entry.done && <Check size={12} strokeWidth={3} />}
                      </button>
                      {editingItemId === entry._id ? (
                        <input
                          autoFocus
                          className="field h-7 min-w-0 flex-1 px-2 text-[10px]"
                          value={editingItemText}
                          onChange={(event) =>
                            setEditingItemText(event.target.value)
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter") void saveItem(entry);
                            if (event.key === "Escape") setEditingItemId("");
                          }}
                          onBlur={() => {
                            if (
                              editingItemText.trim() &&
                              editingItemText.trim() !== entry.text
                            )
                              void saveItem(entry);
                            else setEditingItemId("");
                          }}
                        />
                      ) : (
                        <button
                          onClick={() => chooseItem(entry._id)}
                          className={`min-w-0 flex-1 text-start text-xs ${entry.done ? "line-through opacity-60" : ""}`}
                        >
                          <FullNameTooltip
                            text={entry.text}
                            className="block truncate"
                          />
                        </button>
                      )}
                      {entry.attachments > 0 && (
                        <span
                          className="flex items-center gap-0.5 text-[10px]"
                          style={{ color: "var(--muted)" }}
                        >
                          <Paperclip size={11} />
                          {entry.attachments}
                        </span>
                      )}
                      {canManage && editingItemId !== entry._id && (
                        <span className="hidden shrink-0 gap-0.5 group-hover:flex">
                          <button
                            className="btn-ghost h-6 w-6"
                            title="تعديل البند"
                            onClick={() => {
                              setEditingItemId(entry._id);
                              setEditingItemText(entry.text);
                            }}
                          >
                            <Edit3 size={11} />
                          </button>
                          <button
                            className="btn-ghost h-6 w-6"
                            title="حذف البند"
                            style={{ color: "var(--danger)" }}
                            onClick={() => void deleteItem(entry)}
                          >
                            <Trash2 size={11} />
                          </button>
                        </span>
                      )}
                    </div>
                  ))}
                </>
              ) : (
                <ColumnEmpty
                  icon={<Check size={20} />}
                  text={
                    task && !task.subtasks.length
                      ? "هذه مهمة بلا تفاصيل فرعية"
                      : "اختر مهمة فرعية لعرض بنود تنفيذها"
                  }
                />
              )}
            </WorkspaceColumn>

            <WorkspaceColumn
              index={6}
              title="الإنجاز والتسليمات"
              count={selectedDeliveries.length}
              className={columnClass(5)}
            >
              {task ? (
                <DeliveryPanel
                  task={task}
                  item={item}
                  deliveries={selectedDeliveries}
                  memberMap={memberMap}
                  canSubmit={canWorkOnTask}
                  canManage={Boolean(canManage)}
                  currentUserId={user?.id || ""}
                  busy={busy}
                  onCancelItem={() => setItemId("")}
                  onDelete={deleteDelivery}
                  onSubmit={addDelivery}
                />
              ) : (
                <ColumnEmpty
                  icon={<Send size={20} />}
                  text="اختر مهمة لعرض التسليمات"
                />
              )}
            </WorkspaceColumn>
          </div>
        </div>
      </div>

      {canManage && (
        <ProjectModal
          open={projectModal}
          onClose={() => !busy && setProjectModal(false)}
          project={editingProject}
          employees={employees}
          allowedCompanies={allowedCompanies}
          busy={busy}
          onSave={saveProject}
        />
      )}
      {canManage && project && (
        <AssignMembersModal
          open={assignModal}
          onClose={() => !busy && setAssignModal(false)}
          project={project}
          employees={employees}
          busy={busy}
          onSave={saveMembers}
        />
      )}
      {canManage && project && (
        <TaskModal
          open={taskModal}
          onClose={() => {
            if (!busy) {
              setTaskModal(false);
              setEditingTask(null);
            }
          }}
          members={members}
          project={project}
          task={editingTask}
          busy={busy}
          onSave={saveTask}
        />
      )}
      {canManage && task && (
        <SubtaskModal
          open={subtaskModal}
          onClose={() => {
            if (!busy) {
              setSubtaskModal(false);
              setEditingSubtask(null);
            }
          }}
          taskTitle={task.title}
          subtask={editingSubtask}
          busy={busy}
          onSave={saveSubtask}
        />
      )}
      <Toast show={Boolean(toast)} message={toast} />
    </AppShell>
  );
}

function FullNameTooltip({ text, className = "" }: { text: string; className?: string }) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const showTimerRef = useRef<number | null>(null);
  const [position, setPosition] = useState<{
    left: number;
    top: number;
    placement: "top" | "bottom";
  } | null>(null);

  const hide = useCallback(() => {
    if (showTimerRef.current !== null) window.clearTimeout(showTimerRef.current);
    showTimerRef.current = null;
    setPosition(null);
  }, []);

  const place = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const placement = rect.bottom + 100 < window.innerHeight ? "bottom" : "top";
    setPosition({
      left: Math.min(Math.max(rect.left + rect.width / 2, 170), window.innerWidth - 170),
      top: placement === "bottom" ? rect.bottom + 10 : rect.top - 10,
      placement,
    });
  }, []);

  const scheduleShow = useCallback(() => {
    if (showTimerRef.current !== null) window.clearTimeout(showTimerRef.current);
    showTimerRef.current = window.setTimeout(() => {
      showTimerRef.current = null;
      place();
    }, 180);
  }, [place]);

  useEffect(() => {
    if (!position) return;
    const handleViewportChange = () => hide();
    window.addEventListener("scroll", handleViewportChange, true);
    window.addEventListener("resize", handleViewportChange);
    return () => {
      window.removeEventListener("scroll", handleViewportChange, true);
      window.removeEventListener("resize", handleViewportChange);
    };
  }, [position, hide]);

  useEffect(() => {
    const anchor = anchorRef.current;
    const focusTarget = anchor?.closest<HTMLElement>("button, a, [tabindex]");
    if (!focusTarget) return;
    focusTarget.addEventListener("focus", scheduleShow);
    focusTarget.addEventListener("blur", hide);
    return () => {
      focusTarget.removeEventListener("focus", scheduleShow);
      focusTarget.removeEventListener("blur", hide);
    };
  }, [scheduleShow, hide]);

  useEffect(() => () => {
    if (showTimerRef.current !== null) window.clearTimeout(showTimerRef.current);
  }, []);

  return (
    <>
      <span
        ref={anchorRef}
        className={`full-name-anchor ${className}`}
        onMouseEnter={scheduleShow}
        onMouseLeave={hide}
      >
        {text}
      </span>
      {position && createPortal(
        <span
          role="tooltip"
          dir="rtl"
          className="full-name-tooltip"
          data-placement={position.placement}
          style={{ left: position.left, top: position.top }}
        >
          <Sparkles size={13} aria-hidden="true" />
          <span>{text}</span>
        </span>,
        document.body,
      )}
    </>
  );
}

function ProjectBrief({ project }: { project: WorkspaceProject }) {
  const overdue = isOverdue(project.dueDate, project.progress);
  return (
    <section
      className="mx-2 mt-1.5 flex min-h-10 flex-wrap items-center gap-2 rounded-lg border px-2 py-1.5"
      style={{
        borderColor: overdue
          ? "color-mix(in srgb, var(--danger) 35%, var(--border))"
          : "var(--border)",
        background: "var(--surface)",
      }}
    >
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ background: companyMeta(project.company).color }}
      />
      <h3 className="min-w-[120px] flex-1 truncate text-xs font-medium">
        <FullNameTooltip text={project.name} className="block truncate" />
      </h3>
      <span
        className={`status ${project.status === "COMPLETED" || project.progress === 100 ? "status-success" : overdue ? "status-danger" : "status-warning"}`}
      >
        {project.status === "COMPLETED" || project.progress === 100
          ? "مكتمل"
          : overdue
            ? "متأخر"
            : "نشط"}
      </span>
      <div className="flex w-24 items-center gap-1.5">
        <Progress
          value={project.progress}
          danger={overdue}
          className="flex-1"
        />
        <b className="text-[9px]">{project.progress}%</b>
      </div>
      <span
        className="flex items-center gap-1 whitespace-nowrap text-[9px]"
        style={{ color: overdue ? "var(--danger)" : "var(--muted)" }}
      >
        <CalendarDays size={11} />
        {project.dueDate ? shortDate(project.dueDate) : "بدون موعد"} ·{" "}
        {project.memberIds.length} موظفين
      </span>
    </section>
  );
}

function TaskToolbar({
  query,
  filter,
  onQuery,
  onFilter,
}: {
  query: string;
  filter: TaskFilter;
  onQuery: (value: string) => void;
  onFilter: (value: TaskFilter) => void;
}) {
  return (
    <div
      className="grid grid-cols-[minmax(0,1fr)_auto] gap-1.5 border-b p-2"
      style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
    >
      <div className="relative">
        <Search
          className="absolute end-2 top-1/2 -translate-y-1/2"
          size={11}
          color="var(--muted)"
        />
        <input
          className="field h-7 pe-7 text-[9px]"
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder="ابحث في مهام الموظف"
        />
      </div>
      <select
        className="field h-7 w-[82px] px-1 text-[9px]"
        value={filter}
        onChange={(event) => onFilter(event.target.value as TaskFilter)}
        aria-label="تصفية المهام"
      >
        <option value="all">الكل</option>
        <option value="open">المفتوحة</option>
        <option value="late">المتأخرة</option>
        <option value="URGENT">العاجلة</option>
        <option value="IMPORTANT">المهمة</option>
        <option value="NORMAL">العادية</option>
      </select>
    </div>
  );
}

function TaskRow({
  task,
  selected,
  canManage,
  busy,
  onSelect,
  onEdit,
  onDelete,
  dragging,
  onDragStart,
  onDragEnd,
  onDrop,
}: {
  task: TaskNode;
  selected: boolean;
  canManage: boolean;
  busy: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  dragging: boolean;
  onDragStart: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  onDrop: (event: React.DragEvent<HTMLDivElement>) => void;
}) {
  const overdue = isOverdue(task.dueDate, task.progress);
  return (
    <div draggable={canManage} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragOver={(event) => event.preventDefault()} onDrop={onDrop}
      className="border-b"
      style={{
        borderColor: "var(--border)",
        background: dragging ? "var(--surface-3)" : selected ? "var(--workspace-active)" : "transparent",
        boxShadow: selected ? "inset -3px 0 var(--workspace-active-strong)" : "none",
        color: selected ? "var(--workspace-active-text)" : "var(--text)",
      }}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex w-full items-start gap-2 px-2.5 py-2 text-start outline-none hover:bg-[var(--surface-2)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
      >
        <span
          className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
          style={{
            background: overdue
              ? "var(--danger)"
              : statusColor(task.derivedStatus),
          }}
        />
        {canManage && <GripVertical className="shrink-0 cursor-grab" size={14} color="var(--muted)" />}
        <span className="min-w-0 flex-1 text-xs font-medium leading-5">
          <FullNameTooltip text={task.title} className="line-clamp-2" />
          <span
            className="mt-0.5 flex items-center gap-1 text-[9px] font-normal"
            style={{
              color:
                task.priority === "URGENT" ? "var(--danger)" : "var(--muted)",
            }}
          >
            {priorityLabel[task.priority]}
            {overdue && (
              <>
                <span>·</span>
                <span>متأخرة</span>
              </>
            )}
          </span>
        </span>
        <span
          className="whitespace-nowrap text-[9px]"
          style={{ color: overdue ? "var(--danger)" : "var(--muted)" }}
        >
          {shortDate(task.dueDate)}
        </span>
        <span className="w-7 text-left text-[10px] font-medium">
          {task.progress}%
        </span>
      </button>
      {selected && (
        <div
          className="mx-2.5 flex items-center gap-1 border-t py-1.5"
          style={{
            borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)",
          }}
        >
          <span
            className="min-w-0 flex-1 truncate text-[9px]"
            style={{ color: "var(--muted)" }}
          >
            {task.subtasks.length} تفاصيل · {task.helperIds.length + 1} مسؤولون
          </span>
          {canManage && (
            <>
              <MiniButton label="تعديل المهمة" disabled={busy} onClick={onEdit}>
                <Edit3 size={11} />
              </MiniButton>
              <MiniButton
                label="حذف المهمة"
                disabled={busy}
                danger
                onClick={onDelete}
              >
                <Trash2 size={11} />
              </MiniButton>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SubtaskRow({
  subtask,
  selected,
  canManage,
  canWork,
  busy,
  onSelect,
  onEdit,
  onStart,
  onDelete,
  dragging,
  onDragStart,
  onDragEnd,
  onDrop,
}: {
  subtask: SubtaskNode;
  selected: boolean;
  canManage: boolean;
  canWork: boolean;
  busy: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onStart: () => void;
  onDelete: () => void;
  dragging: boolean;
  onDragStart: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  onDrop: (event: React.DragEvent<HTMLDivElement>) => void;
}) {
  return (
    <div draggable={canManage} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragOver={(event) => event.preventDefault()} onDrop={onDrop}
      className="border-b"
      style={{
        borderColor: "var(--border)",
        background: dragging ? "var(--surface-3)" : selected ? "var(--workspace-active)" : "transparent",
        boxShadow: selected ? "inset -3px 0 var(--workspace-active-strong)" : "none",
        color: selected ? "var(--workspace-active-text)" : "var(--text)",
      }}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex w-full items-start gap-2 px-2.5 py-2 text-start outline-none hover:bg-[var(--surface-2)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
      >
        <span
          className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
          style={{ background: statusColor(subtask.derivedStatus) }}
        />
        {canManage && <GripVertical className="shrink-0 cursor-grab" size={14} color="var(--muted)" />}
        <span className="min-w-0 flex-1 text-xs font-medium leading-5">
          <FullNameTooltip text={subtask.title} className="block truncate" />
          <Progress value={subtask.progress} className="mt-1" />
        </span>
        <span className="text-[10px]" style={{ color: "var(--muted)" }}>
          {subtask.completedItems}/{subtask.items.length}
        </span>
      </button>
      {selected && (canManage || canWork) && (
        <div
          className="mx-2.5 flex justify-end gap-0.5 border-t py-1.5"
          style={{
            borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)",
          }}
        >
          {subtask.manualStatus !== "IN_PROGRESS" && subtask.progress < 100 && <button type="button" className="btn h-6 px-2 text-[10px]" disabled={busy} onClick={onStart}>بدء</button>}
          {subtask.manualStatus === "IN_PROGRESS" && subtask.startedAt && <StageTimer startedAt={subtask.startedAt} />}
          {canManage && <><MiniButton label="تعديل التفاصيل" disabled={busy} onClick={onEdit}><Edit3 size={11} /></MiniButton><MiniButton label="حذف التفاصيل" disabled={busy} danger onClick={onDelete}><Trash2 size={11} /></MiniButton></>}
        </div>
      )}
    </div>
  );
}

function StageTimer({ startedAt }: { startedAt: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const interval = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(interval); }, []);
  const seconds = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  return <span className="flex items-center px-1 text-[10px] font-medium" style={{ color: "#7a2838" }} title="مدة العمل الحالية">{formatDuration(seconds)}</span>;
}

function MobileSteps({
  level,
  available,
  onChange,
}: {
  level: number;
  available: boolean[];
  onChange: (level: number) => void;
}) {
  return (
    <div
      className="mx-3 mb-2 flex items-center gap-1 rounded-lg p-1 md:hidden"
      style={{ background: "var(--surface-3)" }}
    >
      {["المشاريع", "الفريق", "المهام", "التفاصيل", "التنفيذ", "التسليم"].map(
        (label, index) => (
          <button
            key={label}
            disabled={!available[index]}
            onClick={() => onChange(index)}
            className="flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-md px-0.5 py-1 text-[8px] disabled:cursor-not-allowed disabled:opacity-40"
            style={{
              background: level === index ? "var(--workspace-active)" : "transparent",
              color: level === index ? "var(--workspace-active-text)" : "var(--muted)",
            }}
          >
            <span
              className="flex h-4 w-4 items-center justify-center rounded-full text-[8px] text-white"
              style={{
                background:
                  available[index] && level >= index
                    ? "var(--workspace-active-strong)"
                    : "var(--border-strong)",
              }}
            >
              {available[index] && level > index ? (
                <Check size={9} />
              ) : (
                index + 1
              )}
            </span>
            {label}
          </button>
        ),
      )}
    </div>
  );
}
function WorkspaceColumn({
  index,
  title,
  count,
  onAdd,
  className,
  children,
}: {
  index: number;
  title: string;
  count: number;
  onAdd?: () => void;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <article
      className={`h-[calc(100dvh-154px)] min-h-[520px] min-w-0 flex-col overflow-hidden rounded-lg border md:h-[500px] md:min-h-0 lg:h-[540px] 2xl:h-[calc(100dvh-152px)] 2xl:min-h-[560px] ${className}`}
      style={{ borderColor: "var(--border)", background: "var(--surface)" }}
    >
      <header
        className="flex h-10 shrink-0 items-center border-b px-2"
        style={{ borderColor: "var(--border)" }}
      >
        <span
          className="me-1.5 flex h-5 w-5 items-center justify-center rounded-full text-[10px] text-white"
          style={{ background: "#7a2838" }}
        >
          {index}
        </span>
        <h3 className="min-w-0 truncate text-xs font-medium">{title}</h3>
        <span
          className="ms-1 shrink-0 text-[10px]"
          style={{ color: "var(--muted)" }}
        >
          {count}
        </span>
        {onAdd && (
          <button
            className="btn-ghost ms-auto h-7 w-7 shrink-0"
            onClick={onAdd}
            aria-label={`إضافة في ${title}`}
          >
            <Plus size={14} color="#7a2838" />
          </button>
        )}
      </header>
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
        {children}
      </div>
    </article>
  );
}
function ColumnHead({ first, second }: { first: string; second: string }) {
  return (
    <div
      className="flex justify-between border-b px-2.5 py-1.5 text-[10px]"
      style={{
        borderColor: "var(--border)",
        background: "var(--surface-2)",
        color: "var(--muted)",
      }}
    >
      <span>{first}</span>
      <span>{second}</span>
    </div>
  );
}
function ColumnEmpty({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div
      className="flex min-h-40 flex-col items-center justify-center gap-2 px-3 text-center text-xs"
      style={{ color: "var(--muted)" }}
    >
      <span
        className="rounded-lg p-2"
        style={{ background: "var(--surface-3)" }}
      >
        {icon}
      </span>
      {text}
    </div>
  );
}
function LoadingRows() {
  return (
    <div className="space-y-2 p-2">
      {[1, 2, 3, 4].map((row) => (
        <div
          key={row}
          className="h-10 animate-pulse rounded-lg"
          style={{ background: "var(--surface-3)" }}
        />
      ))}
    </div>
  );
}
function ProjectRow({
  project,
  selected,
  canManage,
  busy,
  onSelect,
  onEdit,
  onAssign,
  onAddTask,
  onArchive,
  onDelete,
  dragging,
  onDragStart,
  onDragEnd,
  onDrop,
  onToggleComplete,
  onTogglePin,
  onToggleFavorite,
}: {
  project: WorkspaceProject;
  selected: boolean;
  canManage: boolean;
  busy: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onAssign: () => void;
  onAddTask: () => void;
  onArchive: () => void;
  onDelete: () => void;
  dragging: boolean;
  onDragStart: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  onDrop: (event: React.DragEvent<HTMLDivElement>) => void;
  onToggleComplete: () => void;
  onTogglePin: () => void;
  onToggleFavorite: () => void;
}) {
  const overdue = isOverdue(project.dueDate, project.progress);
  const [actionsOpen, setActionsOpen] = useState(false);
  return (
    <div draggable={canManage} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragOver={(event) => event.preventDefault()} onDrop={onDrop}
      className="border-b transition-colors"
      style={{
        borderColor: "var(--border)",
        background: dragging ? "var(--surface-3)" : selected ? "var(--workspace-active)" : "transparent",
        boxShadow: selected ? "inset -3px 0 var(--workspace-active-strong)" : "none",
        color: selected ? "var(--workspace-active-text)" : "var(--text)",
      }}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className="block w-full px-2.5 py-2 text-start outline-none transition-colors hover:bg-[var(--surface-2)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
      >
        <span className="flex items-center gap-2">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ background: companyMeta(project.company).color }}
          />
          {canManage && <GripVertical className="shrink-0 cursor-grab" size={14} color="var(--muted)" />}
          <FullNameTooltip
            text={project.name}
            className="min-w-0 flex-1 truncate text-xs font-medium"
          />
          {project.isPinned && <Pin size={11} fill="currentColor" style={{ color: "var(--primary)" }} />}
          {project.isFavorite && <Star size={11} fill="currentColor" style={{ color: "#BA7517" }} />}
          <Progress
            value={project.progress}
            className="w-10 shrink-0"
            danger={overdue}
          />
          <span
            className="w-7 text-left text-[10px]"
            style={{
              color:
                project.progress === 100
                  ? "var(--success)"
                  : overdue
                    ? "var(--danger)"
                    : "var(--muted)",
            }}
          >
            {project.progress}%
          </span>
        </span>
      </button>
      {selected && (
        <div
          className="mx-2.5 flex items-center justify-between gap-2 border-t py-2"
          style={{
            borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)",
          }}
        >
          <span
            className="min-w-0 truncate text-[10px]"
            style={{ color: "var(--muted)" }}
          >
            {project.memberIds.length} موظفين · {shortDate(project.dueDate)}
          </span>
          {canManage && (
            <div
              className="relative flex shrink-0 gap-0.5"
              role="group"
              aria-label={`إجراءات مشروع ${project.name}`}
            >
              <MiniButton label="تعديل" disabled={busy} onClick={onEdit}>
                <Edit3 size={12} />
              </MiniButton>
              <MiniButton label="حذف" disabled={busy} danger onClick={onDelete}>
                <Trash2 size={12} />
              </MiniButton>
              <MiniButton label="إجراءات المشروع" disabled={busy} onClick={() => setActionsOpen((value) => !value)}>
                <MoreHorizontal size={14} />
              </MiniButton>
              {actionsOpen && <div className="absolute end-0 top-7 z-20 w-44 overflow-hidden rounded-lg border p-1 shadow-lg" style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--text)" }}>
                <ProjectAction label="إدارة الفريق" icon={<UserPlus size={13} />} onClick={() => { setActionsOpen(false); onAssign(); }} />
                <ProjectAction label="إضافة مهمة" icon={<ClipboardList size={13} />} onClick={() => { setActionsOpen(false); onAddTask(); }} />
                <ProjectAction label={project.status === "COMPLETED" ? "إعادة فتح المشروع" : "اعتماد المشروع"} icon={project.status === "COMPLETED" ? <RotateCcw size={13} /> : <CheckCircle2 size={13} />} onClick={() => { setActionsOpen(false); onToggleComplete(); }} />
                <ProjectAction label={project.isPinned ? "إلغاء تثبيت المشروع" : "تثبيت المشروع في الأعلى"} icon={<Pin size={13} fill={project.isPinned ? "currentColor" : "none"} />} onClick={() => { setActionsOpen(false); onTogglePin(); }} />
                <ProjectAction label={project.isFavorite ? "إزالة من المفضلة" : "إضافة إلى المفضلة"} icon={<Star size={13} fill={project.isFavorite ? "currentColor" : "none"} />} onClick={() => { setActionsOpen(false); onToggleFavorite(); }} />
                <ProjectAction label={project.status === "ARCHIVED" ? "استعادة المشروع" : "أرشفة المشروع"} icon={project.status === "ARCHIVED" ? <RotateCcw size={13} /> : <Archive size={13} />} onClick={() => { setActionsOpen(false); onArchive(); }} />
              </div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
function MiniButton({
  children,
  label,
  onClick,
  disabled = false,
  danger = false,
}: {
  children: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className="btn-ghost h-6 w-6 border disabled:cursor-not-allowed disabled:opacity-50"
      style={{
        borderColor: danger
          ? "color-mix(in srgb, var(--danger) 30%, var(--border))"
          : "var(--border)",
        color: danger ? "var(--danger)" : undefined,
      }}
      title={label}
      aria-label={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
function ProjectAction({ label, icon, onClick }: { label: string; icon: React.ReactNode; onClick: () => void }) {
  return <button type="button" className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-right text-[10px] transition-colors hover:bg-[var(--workspace-active)]" onClick={onClick}><span className="shrink-0" style={{ color: "var(--workspace-active-strong)" }}>{icon}</span><span className="flex-1">{label}</span></button>;
}
function AddItem({ onAdd }: { onAdd: (text: string) => Promise<void> }) {
  const [text, setText] = useState("");
  const submit = async () => {
    if (!text.trim()) return;
    const value = text.trim();
    setText("");
    await onAdd(value);
  };
  return (
    <div
      className="flex gap-1 border-b p-1.5"
      style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
    >
      <input
        className="field h-7 min-w-0 flex-1 px-2 text-[10px]"
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            void submit();
          }
        }}
        placeholder="بند تنفيذ جديد"
      />
      <button
        type="button"
        className="btn-primary h-7 px-2 text-[9px]"
        onClick={() => void submit()}
        disabled={!text.trim()}
      >
        <Plus size={11} />
        إضافة
      </button>
    </div>
  );
}

function DeliveryPanel({
  task,
  item,
  deliveries,
  memberMap,
  canSubmit,
  canManage,
  currentUserId,
  busy,
  onCancelItem,
  onDelete,
  onSubmit,
}: {
  task: TaskNode;
  item: ItemNode | null;
  deliveries: DeliveryNode[];
  memberMap: Map<string, Employee>;
  canSubmit: boolean;
  canManage: boolean;
  currentUserId: string;
  busy: boolean;
  onCancelItem: () => void;
  onDelete: (id: string) => Promise<void>;
  onSubmit: (payload: {
    text: string;
    link: string;
    files: File[];
    onProgress: (percent: number) => void;
  }) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [link, setLink] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [recordedAudio, setRecordedAudio] = useState<{
    file: File;
    url: string;
    duration: number;
  } | null>(null);
  const [composerError, setComposerError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingStartedAtRef = useRef(0);
  const discardRecordingRef = useRef(false);
  const recordedAudioRef = useRef<{
    file: File;
    url: string;
    duration: number;
  } | null>(null);
  const filesRef = useRef<File[]>([]);
  const orderedDeliveries = useMemo(
    () =>
      [...deliveries].sort(
        (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
      ),
    [deliveries],
  );
  const attachmentCount = deliveries.reduce(
    (sum, delivery) =>
      sum + (delivery.attachments?.length || (delivery.link ? 1 : 0)),
    0,
  );

  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(
      () =>
        setRecordSeconds(
          Math.max(
            1,
            Math.floor((Date.now() - recordingStartedAtRef.current) / 1000),
          ),
        ),
      250,
    );
    return () => window.clearInterval(timer);
  }, [recording]);
  useEffect(
    () => () => {
      discardRecordingRef.current = true;
      recorderRef.current?.state !== "inactive" && recorderRef.current?.stop();
      recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
      if (recordedAudioRef.current)
        URL.revokeObjectURL(recordedAudioRef.current.url);
    },
    [],
  );

  function addFiles(incoming: File[]) {
    setComposerError("");
    const next = [...filesRef.current];
    for (const file of incoming) {
      if (file.size > 50 * 1024 * 1024) {
        setComposerError(`الملف ${file.name} يتجاوز 50 ميجابايت`);
        continue;
      }
      if (
        !next.some(
          (entry) =>
            entry.name === file.name &&
            entry.size === file.size &&
            entry.lastModified === file.lastModified,
        )
      )
        next.push(file);
    }
    if (next.length > 6) {
      setComposerError("يمكن إرفاق 6 ملفات كحد أقصى في التسليم الواحد");
      next.splice(6);
    }
    if (next.reduce((sum, file) => sum + file.size, 0) > 120 * 1024 * 1024) {
      setComposerError("إجمالي الملفات يجب ألا يتجاوز 120 ميجابايت");
      return;
    }
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
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setComposerError("التسجيل الصوتي غير مدعوم في هذا المتصفح");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      const preferred = [
        "audio/webm;codecs=opus",
        "audio/ogg;codecs=opus",
        "audio/mp4",
      ].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(
        stream,
        preferred ? { mimeType: preferred } : undefined,
      );
      recordingChunksRef.current = [];
      recordingStreamRef.current = stream;
      recorderRef.current = recorder;
      discardRecordingRef.current = false;
      recordingStartedAtRef.current = Date.now();
      setRecordSeconds(0);
      recorder.ondataavailable = (event) => {
        if (event.data.size) recordingChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const shouldDiscard = discardRecordingRef.current;
        const mimeType = recorder.mimeType || "audio/webm";
        const extension = mimeType.includes("ogg")
          ? "ogg"
          : mimeType.includes("mp4")
            ? "m4a"
            : "webm";
        const blob = new Blob(recordingChunksRef.current, { type: mimeType });
        if (!shouldDiscard && blob.size) {
          const previous = recordedAudioRef.current;
          const file = new File(
            [blob],
            `تسجيل-صوتي-${new Date().toISOString().replace(/[:.]/g, "-")}.${extension}`,
            { type: mimeType },
          );
          const baseFiles = filesRef.current.filter(
            (entry) => entry !== previous?.file,
          );
          if (baseFiles.length >= 6)
            setComposerError("احذف أحد المرفقات أولاً لإضافة التسجيل الصوتي");
          else if (
            baseFiles.reduce((sum, entry) => sum + entry.size, 0) + file.size >
            120 * 1024 * 1024
          )
            setComposerError(
              "لا توجد مساحة كافية لإضافة التسجيل ضمن حد 120 ميجابايت",
            );
          else {
            if (previous) URL.revokeObjectURL(previous.url);
            const preview = {
              file,
              url: URL.createObjectURL(file),
              duration: Math.max(
                1,
                Math.round((Date.now() - recordingStartedAtRef.current) / 1000),
              ),
            };
            const next = [...baseFiles, file];
            filesRef.current = next;
            recordedAudioRef.current = preview;
            setFiles(next);
            setRecordedAudio(preview);
          }
        }
        stream.getTracks().forEach((track) => track.stop());
        recordingStreamRef.current = null;
      };
      recorder.start(500);
      setRecording(true);
    } catch {
      setComposerError(
        "تعذر الوصول إلى الميكروفون. تحقق من إذن المتصفح ثم حاول مجددًا",
      );
    }
  }
  function stopRecording() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    setRecording(false);
  }
  function cancelRecording() {
    discardRecordingRef.current = true;
    stopRecording();
    setRecordSeconds(0);
  }
  async function submit() {
    if (!text.trim() && !link.trim() && !files.length) return;
    setComposerError("");
    setUploadProgress(files.length ? 1 : 0);
    try {
      await onSubmit({
        text: text.trim(),
        link: link.trim(),
        files,
        onProgress: setUploadProgress,
      });
      setText("");
      setLink("");
      filesRef.current = [];
      setFiles([]);
      setShowLink(false);
      setUploadProgress(0);
      clearRecordedAudio(false);
    } catch {
      setUploadProgress(0);
    }
  }

  return (
    <div className="flex min-h-full flex-col">
      <div
        className="flex items-center gap-2 border-b px-2 py-1.5"
        style={{ borderColor: "var(--border)" }}
      >
        <p className="min-w-0 flex-1 truncate text-xs font-medium">
          {item?.text || "بند تنفيذ تلقائي عند الإرسال"}
        </p>
        <span
          className={`status shrink-0 ${task.derivedStatus === "COMPLETED" ? "status-success" : task.derivedStatus === "IN_PROGRESS" ? "status-warning" : "status-neutral"}`}
        >
          {task.derivedStatus === "COMPLETED"
            ? "مكتملة"
            : task.derivedStatus === "IN_PROGRESS"
              ? "قيد التنفيذ"
              : "لم تبدأ"}
        </span>
        <span className="shrink-0 text-[9px]" style={{ color: "var(--muted)" }}>
          {deliveries.length}/{attachmentCount}
        </span>
      </div>

      <div
        className="max-h-[360px] flex-1 space-y-2 overflow-y-auto p-2.5"
        aria-live="polite"
      >
        {orderedDeliveries.length ? (
          orderedDeliveries.map((delivery) => {
            const authorId =
              typeof delivery.authorId === "string"
                ? delivery.authorId
                : delivery.authorId?._id || "";
            const populatedName =
              typeof delivery.authorId === "object"
                ? delivery.authorId?.fullName
                : undefined;
            const authorName =
              populatedName?.trim() || memberMap.get(authorId)?.name || "موظف";
            return (
              <DeliveryCard
                key={delivery._id}
                delivery={delivery}
                authorName={authorName}
                itemName={item?.text}
                canDelete={canManage || authorId === currentUserId}
                busy={busy}
                onDelete={() => void onDelete(delivery._id)}
              />
            );
          })
        ) : (
          <ColumnEmpty
            icon={<Send size={18} />}
            text="لا توجد تسليمات بعد — أضف وصف الإنجاز أو اسحب ملفاتك هنا"
          />
        )}
      </div>

      {canSubmit && (
        <div
          className="mt-auto border-t p-2.5"
          style={{
            borderColor: "var(--border)",
            background: "var(--surface-2)",
          }}
        >
          <div
            className="mb-1.5 flex items-center justify-between gap-2 text-[9px]"
            style={{ color: "var(--muted)" }}
          >
            <span className="min-w-0 truncate">
              التسليم على:{" "}
              <b style={{ color: "var(--primary)" }}>
                {item?.text || "بند تنفيذ تلقائي عند الإرسال"}
              </b>
            </span>
            {item && (
              <button
                type="button"
                onClick={onCancelItem}
                className="shrink-0"
                style={{ color: "var(--danger)" }}
              >
                إلغاء الربط
              </button>
            )}
          </div>
          {!item && <p className="mb-1.5 text-[9px]" style={{ color: "var(--muted)" }}>سيُنشئ النظام بند تنفيذ تلقائياً ومرقماً عند إرسال هذا التسليم.</p>}
          <textarea
            className="field min-h-[64px] resize-none py-2 text-xs"
            value={text}
            onChange={(event) => setText(event.target.value)}
            onPaste={(event) => {
              const pasted = Array.from(event.clipboardData.files);
              if (pasted.length) addFiles(pasted);
            }}
            aria-label="وصف الإنجاز أو ملاحظات التسليم"
          />

          <div
            onDragEnter={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node))
                setDragging(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              addFiles(Array.from(event.dataTransfer.files));
            }}
            className="mt-1.5 rounded-lg border border-dashed p-2 transition-colors"
            style={{
              borderColor: dragging ? "var(--primary)" : "var(--border-strong)",
              background: dragging ? "var(--primary-soft)" : "var(--surface)",
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z"
              onChange={(event) => {
                addFiles(Array.from(event.target.files || []));
                event.currentTarget.value = "";
              }}
            />
            <div
              className="flex flex-wrap items-center gap-1"
              role="toolbar"
              aria-label="خيارات إرفاق التسليم"
            >
              <button
                type="button"
                className="btn-ghost h-8 w-8 p-0"
                disabled={recording}
                onClick={() => fileInputRef.current?.click()}
                title="إرفاق ملفات"
                aria-label="إرفاق ملفات"
              >
                <Paperclip size={15} />
              </button>
              <button
                type="button"
                className="btn-ghost relative h-8 w-8 p-0"
                onClick={() =>
                  recording ? stopRecording() : void startRecording()
                }
                style={{
                  color: recording
                    ? "var(--danger)"
                    : recordedAudio
                      ? "var(--primary)"
                      : undefined,
                  background: recording
                    ? "var(--danger-soft)"
                    : recordedAudio
                      ? "var(--primary-soft)"
                      : undefined,
                }}
                title={
                  recording
                    ? "إيقاف التسجيل"
                    : recordedAudio
                      ? "إعادة التسجيل الصوتي"
                      : "تسجيل صوتي"
                }
                aria-label={
                  recording
                    ? `إيقاف التسجيل بعد ${formatDuration(recordSeconds)}`
                    : recordedAudio
                      ? "إعادة التسجيل الصوتي"
                      : "تسجيل صوتي"
                }
              >
                {recording ? <CircleStop size={15} /> : <Mic size={15} />}
                {recording && (
                  <span className="absolute end-0.5 top-0.5 h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                )}
              </button>
              <button
                type="button"
                className="btn-ghost h-8 w-8 p-0"
                disabled={recording}
                onClick={() => setShowLink((value) => !value)}
                style={{
                  color: showLink ? "var(--primary)" : undefined,
                  background: showLink ? "var(--primary-soft)" : undefined,
                }}
                title="إضافة رابط"
                aria-label={showLink ? "إخفاء حقل الرابط" : "إضافة رابط"}
                aria-pressed={showLink}
              >
                <Link2 size={15} />
              </button>
              <span
                className="ms-auto text-[8px]"
                style={{ color: "var(--muted)" }}
              >
                اسحب وأفلت · 6 ملفات · 50MB للملف
              </span>
            </div>
            {recording && (
              <div
                className="mt-2 flex items-center gap-2 rounded-lg border px-2 py-2"
                style={{
                  borderColor:
                    "color-mix(in srgb, var(--danger) 35%, var(--border))",
                  background: "var(--danger-soft)",
                }}
                role="status"
              >
                <span
                  className="h-2 w-2 shrink-0 animate-pulse rounded-full"
                  style={{ background: "var(--danger)" }}
                />
                <span
                  className="text-[9px] font-medium"
                  style={{ color: "var(--danger)" }}
                >
                  جارٍ التسجيل
                </span>
                <span className="font-mono text-[10px]" dir="ltr">
                  {formatDuration(recordSeconds)}
                </span>
                <div className="ms-auto flex gap-1">
                  <button
                    type="button"
                    className="btn-ghost h-7 w-7 p-0"
                    onClick={stopRecording}
                    title="إيقاف وحفظ التسجيل"
                    aria-label="إيقاف وحفظ التسجيل"
                  >
                    <CircleStop size={14} />
                  </button>
                  <button
                    type="button"
                    className="btn-ghost h-7 w-7 p-0"
                    onClick={cancelRecording}
                    title="إلغاء التسجيل"
                    aria-label="إلغاء التسجيل"
                    style={{ color: "var(--danger)" }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )}
            {recordedAudio && !recording && (
              <div
                className="mt-2 overflow-hidden rounded-lg border p-2"
                style={{
                  borderColor:
                    "color-mix(in srgb, var(--primary) 28%, var(--border))",
                  background: "var(--primary-soft)",
                }}
              >
                <div className="mb-1.5 flex items-center gap-2">
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                    style={{
                      background: "var(--surface)",
                      color: "var(--primary)",
                    }}
                  >
                    <FileAudio size={14} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <b className="block text-[9px] font-medium">
                      معاينة التسجيل قبل الإرسال
                    </b>
                    <span
                      className="block text-[8px]"
                      style={{ color: "var(--muted)" }}
                    >
                      {formatDuration(recordedAudio.duration)} ·{" "}
                      {formatBytes(recordedAudio.file.size)}
                    </span>
                  </span>
                  <button
                    type="button"
                    className="btn-ghost h-7 w-7 shrink-0 p-0"
                    onClick={() => clearRecordedAudio()}
                    title="حذف التسجيل"
                    aria-label="حذف التسجيل الصوتي"
                    style={{ color: "var(--danger)" }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                <audio
                  src={recordedAudio.url}
                  controls
                  preload="metadata"
                  className="h-8 w-full min-w-0 max-w-full"
                  aria-label="تشغيل معاينة التسجيل الصوتي"
                />
              </div>
            )}
            {files.some((file) => file !== recordedAudio?.file) && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {files
                  .filter((file) => file !== recordedAudio?.file)
                  .map((file) => (
                    <span
                      key={`${file.name}-${file.lastModified}`}
                      className="flex max-w-full items-center gap-1 rounded-md border px-1.5 py-1 text-[8px]"
                      style={{
                        borderColor: "var(--border)",
                        background: "var(--surface-2)",
                      }}
                    >
                      {fileIcon(file.type, 11)}
                      <span className="max-w-[130px] truncate">
                        {file.name}
                      </span>
                      <span style={{ color: "var(--muted)" }}>
                        {formatBytes(file.size)}
                      </span>
                      <button
                        type="button"
                        aria-label={`إزالة ${file.name}`}
                        onClick={() => removeFile(file)}
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
              </div>
            )}
          </div>
          {showLink && (
            <div className="relative mt-1.5">
              <Link2
                className="absolute start-2 top-1/2 -translate-y-1/2"
                size={12}
                color="var(--muted)"
              />
              <input
                className="field h-8 ps-7 text-[10px]"
                dir="ltr"
                value={link}
                onChange={(event) => setLink(event.target.value)}
                placeholder="https:// رابط خارجي متعلق بالتسليم"
              />
            </div>
          )}
          {composerError && (
            <p className="mt-1 text-[9px]" style={{ color: "var(--danger)" }}>
              {composerError}
            </p>
          )}
          {uploadProgress > 0 && (
            <div className="mt-1.5">
              <div
                className="mb-0.5 flex justify-between text-[8px]"
                style={{ color: "var(--muted)" }}
              >
                <span>جارٍ رفع المرفقات بأمان…</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          )}
          <button
            type="button"
            className="btn-primary mt-2 h-8 w-full px-3 text-[10px]"
            disabled={
              busy ||
              recording ||
              (!text.trim() && !link.trim() && !files.length)
            }
            onClick={() => void submit()}
          >
            {busy ? (
              <Loader2 className="animate-spin" size={13} />
            ) : (
              <Send size={13} />
            )}
            {busy
              ? "جارٍ حفظ التسليم…"
              : `إرسال التسليم${files.length ? ` (${files.length} مرفق)` : ""}`}
          </button>
        </div>
      )}
    </div>
  );
}

function DeliveryCard({
  delivery,
  authorName,
  itemName,
  canDelete,
  busy,
  onDelete,
}: {
  delivery: DeliveryNode;
  authorName: string;
  itemName?: string;
  canDelete: boolean;
  busy: boolean;
  onDelete: () => void;
}) {
  return (
    <article
      className="rounded-lg border p-2"
      style={{ borderColor: "var(--border)", background: "var(--surface)" }}
    >
      <div className="flex gap-2">
        <Avatar name={authorName} color="#534AB7" size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <b className="min-w-0 flex-1 truncate text-[10px] font-medium">
              {authorName}
            </b>
            <time
              className="shrink-0 text-[8px]"
              style={{ color: "var(--muted)" }}
            >
              {new Intl.DateTimeFormat("ar-SA", {
                day: "numeric",
                month: "short",
                hour: "numeric",
                minute: "2-digit",
              }).format(new Date(delivery.createdAt))}
            </time>
            {canDelete && (
              <button
                type="button"
                disabled={busy}
                className="shrink-0 rounded p-0.5 disabled:opacity-40"
                style={{ color: "var(--danger)" }}
                title="حذف التسليم"
                aria-label="حذف التسليم"
                onClick={onDelete}
              >
                <Trash2 size={11} />
              </button>
            )}
          </div>
          {delivery.itemId && (
            <span
              className="mt-0.5 inline-block max-w-full truncate rounded px-1.5 py-0.5 text-[8px]"
              style={{
                background: "var(--primary-soft)",
                color: "var(--primary)",
              }}
            >
              {itemName || "بند تنفيذ"}
            </span>
          )}
        </div>
      </div>
      {delivery.text && (
        <p
          className="mt-1.5 whitespace-pre-wrap break-words text-[10px] leading-5"
          style={{ color: "var(--text)" }}
        >
          {delivery.text}
        </p>
      )}
      {delivery.attachments?.length ? (
        <div className="mt-1.5 grid gap-1.5">
          {delivery.attachments.map((attachment) => (
            <DeliveryAttachmentView
              key={attachment.storageId}
              attachment={attachment}
            />
          ))}
        </div>
      ) : null}
      {delivery.link && (
        <a
          href={delivery.link}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1.5 flex items-center gap-2 rounded-lg border p-1.5"
          style={{
            borderColor: "var(--border)",
            background: "var(--surface-2)",
          }}
        >
          <span
            className="flex h-7 w-8 shrink-0 items-center justify-center rounded-md"
            style={{
              background: "var(--primary-soft)",
              color: "var(--primary)",
            }}
          >
            {delivery.attachmentType === "video" ? (
              <Video size={13} />
            ) : delivery.attachmentType === "image" ? (
              <ImageIcon size={13} />
            ) : (
              <Link2 size={13} />
            )}
          </span>
          <span className="min-w-0 flex-1 truncate text-[9px]" dir="ltr">
            {delivery.attachmentName || delivery.link}
          </span>
          <ExternalLink size={11} color="var(--muted)" />
        </a>
      )}
    </article>
  );
}

function DeliveryAttachmentView({
  attachment,
}: {
  attachment: DeliveryAttachment;
}) {
  const source = `${API_URL}${attachment.url}`;
  const download = `${source}?download=1`;
  if (attachment.kind === "image")
    return (
      <div
        className="group relative overflow-hidden rounded-lg border"
        style={{ borderColor: "var(--border)" }}
      >
        <a href={source} target="_blank" rel="noreferrer">
          <img
            src={source}
            alt={attachment.name}
            loading="lazy"
            className="max-h-44 w-full bg-black/5 object-contain"
          />
        </a>
        <AttachmentActions attachment={attachment} download={download} />
      </div>
    );
  if (attachment.kind === "video")
    return (
      <div
        className="overflow-hidden rounded-lg border"
        style={{ borderColor: "var(--border)" }}
      >
        <video
          src={source}
          controls
          preload="metadata"
          playsInline
          className="max-h-48 w-full bg-black"
        />
        <AttachmentMeta attachment={attachment} download={download} />
      </div>
    );
  if (attachment.kind === "audio")
    return (
      <div
        className="min-w-0 overflow-hidden rounded-lg border p-2"
        style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
      >
        <div className="mb-1 flex min-w-0 items-center gap-1.5">
          <FileAudio className="shrink-0" size={14} color="var(--primary)" />
          <span className="min-w-0 flex-1 truncate text-[9px]">
            {attachment.name}
          </span>
          <a
            className="shrink-0"
            href={download}
            title="تنزيل"
            aria-label={`تنزيل ${attachment.name}`}
          >
            <Download size={12} />
          </a>
        </div>
        <audio
          src={source}
          controls
          preload="metadata"
          className="h-8 w-full min-w-0 max-w-full"
        />
      </div>
    );
  return (
    <a
      href={download}
      className="flex items-center gap-2 rounded-lg border p-2"
      style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
    >
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
        style={{ background: "var(--primary-soft)", color: "var(--primary)" }}
      >
        {attachmentIcon(attachment.kind, 15)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[9px] font-medium">
          {attachment.name}
        </span>
        <span className="text-[8px]" style={{ color: "var(--muted)" }}>
          {formatBytes(attachment.size)} · {attachment.mimeType}
        </span>
      </span>
      <Download size={13} color="var(--muted)" />
    </a>
  );
}
function AttachmentActions({
  attachment,
  download,
}: {
  attachment: DeliveryAttachment;
  download: string;
}) {
  return (
    <div className="absolute bottom-1 end-1 flex items-center gap-1 rounded-md bg-black/65 px-1.5 py-1 text-[8px] text-white">
      <span className="max-w-[130px] truncate">{attachment.name}</span>
      <span className="opacity-70">{formatBytes(attachment.size)}</span>
      <a href={download} title="تنزيل" aria-label={`تنزيل ${attachment.name}`}>
        <Download size={11} />
      </a>
    </div>
  );
}
function AttachmentMeta({
  attachment,
  download,
}: {
  attachment: DeliveryAttachment;
  download: string;
}) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 text-[8px]">
      <span className="min-w-0 flex-1 truncate">{attachment.name}</span>
      <span style={{ color: "var(--muted)" }}>
        {formatBytes(attachment.size)}
      </span>
      <a href={download} title="تنزيل" aria-label={`تنزيل ${attachment.name}`}>
        <Download size={11} />
      </a>
    </div>
  );
}
function attachmentIcon(kind: DeliveryAttachment["kind"], size: number) {
  return kind === "document" ? (
    <FileText size={size} />
  ) : kind === "archive" ? (
    <FileArchive size={size} />
  ) : kind === "audio" ? (
    <FileAudio size={size} />
  ) : kind === "image" ? (
    <FileImage size={size} />
  ) : kind === "video" ? (
    <Video size={size} />
  ) : (
    <FileIcon size={size} />
  );
}
function fileIcon(mime: string, size: number) {
  return mime.startsWith("image/") ? (
    <FileImage size={size} />
  ) : mime.startsWith("video/") ? (
    <Video size={size} />
  ) : mime.startsWith("audio/") ? (
    <FileAudio size={size} />
  ) : mime.includes("zip") || mime.includes("rar") || mime.includes("7z") ? (
    <FileArchive size={size} />
  ) : mime.includes("pdf") || mime.startsWith("text/") ? (
    <FileText size={size} />
  ) : (
    <FileIcon size={size} />
  );
}
function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
}
function formatDuration(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function ProjectModal({
  open,
  onClose,
  project,
  employees,
  allowedCompanies,
  busy,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  project: WorkspaceProject | null;
  employees: Employee[];
  allowedCompanies: CompanyKey[];
  busy: boolean;
  onSave: (draft: ProjectDraft) => Promise<void>;
}) {
  const [company, setCompany] = useState<CompanyKey>(allowedCompanies[0]);
  const [name, setName] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [formError, setFormError] = useState("");
  useEffect(() => {
    if (!open) return;
    setCompany(project?.company || allowedCompanies[0]);
    setName(project?.name || "");
    setDueDate(project?.dueDate || "");
    setMemberIds(project?.memberIds || []);
    setDescription(project?.description || "");
    setStartDate(project?.startDate || new Date().toISOString().slice(0, 10));
    setFormError("");
  }, [open, project, allowedCompanies]);
  const available = employees.filter(
    (employee) => employee.company === company && employee.status !== "غير نشط",
  );
  const changeCompany = (next: CompanyKey) => {
    setCompany(next);
    setMemberIds((current) =>
      current.filter(
        (id) =>
          employees.find((employee) => employee.id === id)?.company === next,
      ),
    );
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError("");
    if (!name.trim()) return;
    if (startDate && dueDate && startDate > dueDate) {
      setFormError("تاريخ التسليم يجب أن يكون بعد تاريخ البداية");
      return;
    }
    await onSave({
      name: name.trim(),
      company,
      client: "",
      dueDate,
      memberIds,
      description: description.trim(),
      budget: null,
      startDate,
    });
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={project ? "تعديل بيانات المشروع" : "إنشاء مشروع جديد"}
      maxWidth="max-w-3xl"
    >
      <form onSubmit={(event) => void submit(event)}>
        <div className="max-h-[72vh] space-y-2 overflow-y-auto p-3">
          <div>
            <span className="label">الشركة *</span>
            <div className="grid grid-cols-2 gap-2">
              {allowedCompanies.map((key) => (
                <button
                  type="button"
                  key={key}
                  onClick={() => changeCompany(key)}
                  className="flex items-center gap-2 rounded-lg border p-2.5 text-start"
                  style={{
                    borderColor:
                      company === key ? companyMeta(key).color : "var(--border)",
                    background:
                      company === key
                        ? `${companyMeta(key).color}12`
                        : "transparent",
                  }}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: companyMeta(key).color }}
                  />
                  <b className="text-xs font-medium">{companyMeta(key).name}</b>
                  {company === key && (
                    <Check
                      className="ms-auto"
                      size={14}
                      color={companyMeta(key).color}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
          <label>
            <span className="label">اسم المشروع *</span>
            <input
              autoFocus
              className="field h-9"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            <label>
              <span className="label">تاريخ البداية</span>
              <input
                className="field h-9"
                type="date"
                value={startDate}
                max={dueDate || undefined}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </label>
            <label>
              <span className="label">
                تاريخ التسليم{" "}
                <small style={{ color: "var(--subtle)" }}>(اختياري)</small>
              </span>
              <input
                className="field h-9"
                type="date"
                min={startDate || undefined}
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </label>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="label mb-0">فريق المشروع</span>
              <span className="text-[10px]" style={{ color: "var(--muted)" }}>
                {memberIds.length} محدد
              </span>
            </div>
            {available.length ? (
              <div
                className="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto rounded-lg border p-2"
                style={{ borderColor: "var(--border)" }}
              >
                {available.map((employee) => (
                  <button
                    type="button"
                    key={employee.id}
                    onClick={() =>
                      setMemberIds((current) =>
                        current.includes(employee.id)
                          ? current.filter((id) => id !== employee.id)
                          : [...current, employee.id],
                      )
                    }
                    className={`chip h-9 ${memberIds.includes(employee.id) ? "chip-active" : ""}`}
                  >
                    <Avatar
                      name={employee.name}
                      color={employee.color}
                      size="sm"
                    />
                    {employee.name}
                    {memberIds.includes(employee.id) && <Check size={12} />}
                  </button>
                ))}
              </div>
            ) : (
              <p
                className="rounded-lg p-3 text-xs"
                style={{
                  background: "var(--surface-2)",
                  color: "var(--muted)",
                }}
              >
                لا يوجد موظفون نشطون في هذه الشركة.
              </p>
            )}
          </div>
          <label>
            <span className="label">وصف المشروع</span>
            <textarea
              className="field min-h-16 resize-none py-2"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="وصف مختصر للمشروع"
            />
          </label>
          {formError && (
            <p
              className="rounded-lg px-3 py-2 text-xs"
              style={{
                background: "var(--danger-soft)",
                color: "var(--danger)",
              }}
            >
              {formError}
            </p>
          )}
        </div>
        <ModalFooter
          busy={busy}
          onClose={onClose}
          disabled={!name.trim()}
          submitLabel={project ? "حفظ التعديلات" : "إنشاء المشروع"}
        />
      </form>
    </Modal>
  );
}

function AssignMembersModal({
  open,
  onClose,
  project,
  employees,
  busy,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  project: WorkspaceProject;
  employees: Employee[];
  busy: boolean;
  onSave: (ids: string[]) => Promise<void>;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  useEffect(() => {
    if (open) {
      setSelected(project.memberIds);
      setQuery("");
    }
  }, [open, project]);
  const available = employees.filter(
    (employee) =>
      employee.company === project.company && employee.name.includes(query),
  );
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="إضافة موظفين للمشروع"
      subtitle={`${project.name} · ${companyMeta(project.company).name}`}
    >
      <div className="border-b p-3" style={{ borderColor: "var(--border)" }}>
        <div className="relative">
          <Search
            className="absolute end-3 top-1/2 -translate-y-1/2"
            size={15}
            color="var(--muted)"
          />
          <input
            className="field pe-9"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ابحث عن موظف"
          />
        </div>
      </div>
      <div className="max-h-[360px] space-y-1.5 overflow-y-auto p-3">
        {available.map((employee) => {
          const checked = selected.includes(employee.id);
          return (
            <button
              type="button"
              key={employee.id}
              onClick={() =>
                setSelected((current) =>
                  checked
                    ? current.filter((id) => id !== employee.id)
                    : [...current, employee.id],
                )
              }
              className="flex w-full items-center gap-2 rounded-lg border p-2 text-start"
              style={{
                borderColor: checked ? "var(--primary)" : "var(--border)",
                background: checked ? "var(--primary-soft)" : "transparent",
              }}
            >
              <Avatar name={employee.name} color={employee.color} size="sm" />
              <span className="min-w-0 flex-1">
                <b className="block truncate text-xs font-medium">
                  {employee.name}
                </b>
                <span className="text-[10px]" style={{ color: "var(--muted)" }}>
                  {employee.title} · {employee.department}
                </span>
              </span>
              <span
                className="flex h-5 w-5 items-center justify-center rounded border"
                style={{
                  borderColor: checked
                    ? "var(--primary)"
                    : "var(--border-strong)",
                  background: checked ? "var(--primary)" : "transparent",
                  color: "white",
                }}
              >
                {checked && <Check size={12} />}
              </span>
            </button>
          );
        })}
      </div>
      <footer
        className="flex items-center justify-between border-t p-3"
        style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
      >
        <span className="text-xs" style={{ color: "var(--muted)" }}>
          {selected.length} محدد
        </span>
        <div className="flex gap-2">
          <button className="btn" onClick={onClose} disabled={busy}>
            إلغاء
          </button>
          <button
            className="btn-primary"
            onClick={() => void onSave(selected)}
            disabled={busy}
          >
            {busy && <Loader2 size={14} className="animate-spin" />}حفظ الفريق
          </button>
        </div>
      </footer>
    </Modal>
  );
}

function TaskModal({
  open,
  onClose,
  members,
  project,
  task,
  busy,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  members: Employee[];
  project: WorkspaceProject;
  task: TaskNode | null;
  busy: boolean;
  onSave: (payload: TaskDraft) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [helperIds, setHelperIds] = useState<string[]>([]);
  const [priority, setPriority] = useState<Priority>("NORMAL");
  const [dueDate, setDueDate] = useState("");
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [nextSubtask, setNextSubtask] = useState("");
  const [manualStatus, setManualStatus] = useState<WorkStatus>("NOT_STARTED");
  const [formError, setFormError] = useState("");
  useEffect(() => {
    if (open) {
      setTitle(task?.title || "");
      setDescription(task?.description || "");
      setAssigneeId(task?.assigneeId || members[0]?.id || "");
      setHelperIds(task?.helperIds || []);
      setPriority(task?.priority || "NORMAL");
      setDueDate(task?.dueDate?.slice(0, 10) || "");
      setSubtasks([]);
      setNextSubtask("");
      setManualStatus(task?.manualStatus || "NOT_STARTED");
      setFormError("");
    }
  }, [open, members, task]);
  const addSubtask = () => {
    const value = nextSubtask.trim();
    if (value && !subtasks.includes(value)) {
      setSubtasks((current) => [...current, value]);
      setNextSubtask("");
    }
  };
  const applyTemplate = (template: { title: string; subtasks: string[] }) => {
    setTitle(template.title);
    setSubtasks(template.subtasks);
  };
  const templates: Array<{ title: string; subtasks: string[] }> = [];
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError("");
    if (!title.trim() || !assigneeId) return;
    if (project.dueDate && dueDate && dueDate > project.dueDate) {
      setFormError("موعد المهمة لا يمكن أن يتجاوز موعد تسليم المشروع");
      return;
    }
    await onSave({
      title: title.trim(),
      description: description.trim(),
      assigneeId,
      helperIds: helperIds.filter((id) => id !== assigneeId),
      priority,
      dueDate,
      subtaskTitles: [],
      manualStatus: task ? manualStatus : undefined,
    });
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={task ? "تعديل المهمة" : "إنشاء مهمة جديدة"}
      subtitle={`ضمن مشروع: ${project.name}`}
      maxWidth="max-w-3xl"
    >
      <form onSubmit={(event) => void submit(event)}>
        <div className="max-h-[72vh] space-y-2 overflow-y-auto p-3">
          {false && !task && (
            <div>
              <span className="label flex items-center gap-1">
                <Sparkles size={13} color="var(--primary)" />
                ابدأ بقالب اختياري
              </span>
              <div className="grid gap-2 sm:grid-cols-3">
                {templates.map((template) => (
                  <button
                    type="button"
                    key={template.title}
                    className="rounded-xl border p-2.5 text-start transition-colors hover:border-brand"
                    style={{
                      borderColor:
                        title === template.title
                          ? "var(--primary)"
                          : "var(--border)",
                      background:
                        title === template.title
                          ? "var(--primary-soft)"
                          : "var(--surface-2)",
                    }}
                    onClick={() => applyTemplate(template)}
                  >
                    <b className="block text-[11px] font-medium">
                      {template.title}
                    </b>
                    <span
                      className="mt-1 block text-[9px]"
                      style={{ color: "var(--muted)" }}
                    >
                      {template.subtasks.length} مراحل جاهزة
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-[1.4fr_.6fr]">
            <label>
              <span className="label">عنوان المهمة *</span>
              <input
                autoFocus
                className="field"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="نتيجة واضحة قابلة للإنجاز"
                required
              />
            </label>
            <div>
              <span className="label">الأولوية</span>
              <div className="grid grid-cols-3 gap-1">
                {(["NORMAL", "IMPORTANT", "URGENT"] as Priority[]).map(
                  (value) => (
                    <button
                      type="button"
                      key={value}
                      onClick={() => setPriority(value)}
                      className={`chip justify-center px-1 ${priority === value ? "chip-active" : ""}`}
                      style={
                        priority === value && value === "URGENT"
                          ? {
                              background: "var(--danger-soft)",
                              color: "var(--danger)",
                            }
                          : undefined
                      }
                    >
                      {priorityLabel[value]}
                    </button>
                  ),
                )}
              </div>
            </div>
          </div>
          <label>
            <span className="label">الوصف ومعيار الإتمام</span>
            <textarea
              className="field min-h-20 resize-none py-2"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="اشرح المطلوب والنتيجة التي تعني أن المهمة اكتملت…"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              <span className="label">المسؤول *</span>
              <select
                className="field"
                value={assigneeId}
                onChange={(event) => {
                  setAssigneeId(event.target.value);
                  setHelperIds((current) =>
                    current.filter((id) => id !== event.target.value),
                  );
                }}
                required
              >
                <option value="">اختر موظفاً</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} — {member.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="label">موعد المهمة (اختياري)</span>
              <input
                className="field"
                type="date"
                max={project.dueDate || undefined}
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </label>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="label mb-0">مسؤولون إضافيون</span>
              <span className="text-[9px]" style={{ color: "var(--muted)" }}>
                {helperIds.length ? `${helperIds.length} مسؤولين` : "اختياري"}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {members
                .filter((member) => member.id !== assigneeId)
                .map((member) => (
                  <button
                    type="button"
                    key={member.id}
                    onClick={() =>
                      setHelperIds((current) =>
                        current.includes(member.id)
                          ? current.filter((id) => id !== member.id)
                          : [...current, member.id],
                      )
                    }
                    className={`chip ${helperIds.includes(member.id) ? "chip-active" : ""}`}
                  >
                    <Avatar name={member.name} color={member.color} size="sm" />
                    {member.name}
                    {helperIds.includes(member.id) && <Check size={11} />}
                  </button>
                ))}
            </div>
          </div>
          {task ? (
            <div>
              <span className="label">حالة المهمة اليدوية</span>
              <div className="grid grid-cols-3 gap-2">
                {(
                  ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"] as WorkStatus[]
                ).map((status) => (
                  <button
                    type="button"
                    key={status}
                    className={`chip justify-center ${manualStatus === status ? "chip-active" : ""}`}
                    onClick={() => setManualStatus(status)}
                  >
                    {status === "NOT_STARTED"
                      ? "لم تبدأ"
                      : status === "IN_PROGRESS"
                        ? "قيد التنفيذ"
                        : "مكتملة"}
                  </button>
                ))}
              </div>
              <p
                className="mt-1.5 text-[9px]"
                style={{ color: "var(--muted)" }}
              >
                تظل نسبة الإنجاز محسوبة آليًا من بنود التنفيذ.
              </p>
            </div>
          ) : !task && false ? (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="label mb-0">مراحل العمل</span>
                <span className="text-[9px]" style={{ color: "var(--muted)" }}>
                  {subtasks.length} مضافة
                </span>
              </div>
              <div className="flex gap-1.5">
                <input
                  className="field"
                  value={nextSubtask}
                  onChange={(event) => setNextSubtask(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addSubtask();
                    }
                  }}
                  placeholder="أضف مرحلة واضغط Enter"
                />
                <button type="button" className="btn h-10" onClick={addSubtask}>
                  <Plus size={15} />
                  إضافة
                </button>
              </div>
              <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                {subtasks.map((value, index) => (
                  <div
                    key={`${value}-${index}`}
                    className="flex items-center gap-2 rounded-lg border px-2 py-2 text-xs"
                    style={{
                      borderColor: "var(--border)",
                      background: "var(--surface-2)",
                    }}
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand text-[9px] text-white">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{value}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setSubtasks((current) =>
                          current.filter((_, position) => position !== index),
                        )
                      }
                      aria-label={`حذف ${value}`}
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {formError && (
            <p
              className="rounded-lg px-3 py-2 text-xs"
              style={{
                background: "var(--danger-soft)",
                color: "var(--danger)",
              }}
            >
              {formError}
            </p>
          )}
        </div>
        <ModalFooter
          busy={busy}
          onClose={onClose}
          disabled={!title.trim() || !assigneeId}
          submitLabel={task ? "حفظ تعديلات المهمة" : "إنشاء المهمة"}
        />
      </form>
    </Modal>
  );
}

function InlineStageForm({ busy, onCancel, onSave }: { busy: boolean; onCancel: () => void; onSave: (payload: SubtaskDraft) => Promise<void> }) {
  const [title, setTitle] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    await onSave({ title: title.trim(), itemTexts: [] });
  };
  return <form onSubmit={(event) => void submit(event)} className="border-b p-2" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}><input autoFocus className="field h-8 text-xs" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="اسم مرحلة العمل" required /><div className="mt-1.5 flex justify-end gap-1"><button type="button" className="btn h-7 px-2 text-[10px]" onClick={onCancel} disabled={busy}>إلغاء</button><button className="btn-primary h-7 px-2 text-[10px]" disabled={busy || !title.trim()}>{busy && <Loader2 size={12} className="animate-spin" />}إضافة المرحلة</button></div></form>;
}

function SubtaskModal({
  open,
  onClose,
  taskTitle,
  subtask,
  busy,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  taskTitle: string;
  subtask: SubtaskNode | null;
  busy: boolean;
  onSave: (payload: SubtaskDraft) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [items, setItems] = useState("");
  const [manualStatus, setManualStatus] = useState<WorkStatus>("NOT_STARTED");
  useEffect(() => {
    if (open) {
      setTitle(subtask?.title || "");
      setItems("");
      setManualStatus(subtask?.manualStatus || "NOT_STARTED");
    }
  }, [open, subtask]);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    await onSave({
      title: title.trim(),
      itemTexts: items
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
      manualStatus: subtask ? manualStatus : undefined,
    });
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={subtask ? "تعديل مرحلة العمل" : "إضافة مرحلة عمل"}
      subtitle={`ضمن مهمة: ${taskTitle}`}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={(event) => void submit(event)}>
        <div className="space-y-4 p-5">
          <label>
            <span className="label">اسم المرحلة *</span>
            <input
              autoFocus
              className="field"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="مثال: المعاينة والتوثيق الميداني"
              required
            />
          </label>
          {subtask ? (
            <div>
              <span className="label">حالة المرحلة</span>
              <div className="grid grid-cols-3 gap-2">
                {(
                  ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"] as WorkStatus[]
                ).map((status) => (
                  <button
                    type="button"
                    key={status}
                    className={`chip justify-center ${manualStatus === status ? "chip-active" : ""}`}
                    onClick={() => setManualStatus(status)}
                  >
                    {status === "NOT_STARTED"
                      ? "لم تبدأ"
                      : status === "IN_PROGRESS"
                        ? "قيد التنفيذ"
                        : "مكتملة"}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div
                className="rounded-xl border p-3"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--surface-2)",
                }}
              >
                <div className="flex items-start gap-2">
                  <ListFilter size={15} color="var(--primary)" />
                  <div>
                    <b className="block text-xs font-medium">
                      حوّل المرحلة إلى قائمة قابلة للتنفيذ
                    </b>
                    <p
                      className="mt-1 text-[10px] leading-5"
                      style={{ color: "var(--muted)" }}
                    >
                      اكتب كل إجراء في سطر مستقل. يستطيع الفريق تحديد المنجز
                      وربط التسليم بالبند نفسه.
                    </p>
                  </div>
                </div>
              </div>
              <label>
                <span className="label">
                  بنود التنفيذ{" "}
                  <span style={{ color: "var(--subtle)" }}>
                    (بند في كل سطر)
                  </span>
                </span>
                <textarea
                  className="field min-h-40 resize-none py-2"
                  value={items}
                  onChange={(event) => setItems(event.target.value)}
                  placeholder={
                    "التأكد من المتطلبات\nتنفيذ العمل وتوثيقه\nمراجعة النتيجة\nرفع التسليم النهائي"
                  }
                />
              </label>
              <p className="text-[10px]" style={{ color: "var(--muted)" }}>
                {items.split("\n").filter((value) => value.trim()).length} بنود
                ستُنشأ
              </p>
            </>
          )}
        </div>
        <ModalFooter
          busy={busy}
          onClose={onClose}
          disabled={!title.trim()}
          submitLabel={subtask ? "حفظ التعديلات" : "إضافة المرحلة والبنود"}
        />
      </form>
    </Modal>
  );
}

function FormSectionTitle({
  number,
  title,
  text,
}: {
  number: number;
  title: string;
  text: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-medium text-white"
        style={{ background: "#7a2838" }}
      >
        {number}
      </span>
      <span>
        <b className="block text-xs font-medium">{title}</b>
        <small className="text-[9px]" style={{ color: "var(--muted)" }}>
          {text}
        </small>
      </span>
      <span
        className="ms-2 h-px flex-1"
        style={{ background: "var(--border)" }}
      />
    </div>
  );
}
function ModalFooter({
  busy,
  onClose,
  disabled,
  submitLabel,
}: {
  busy: boolean;
  onClose: () => void;
  disabled: boolean;
  submitLabel: string;
}) {
  return (
    <footer
      className="flex justify-end gap-2 border-t p-3"
      style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
    >
      <button type="button" className="btn" onClick={onClose} disabled={busy}>
        إلغاء
      </button>
      <button className="btn-primary" disabled={busy || disabled}>
        {busy && <Loader2 size={14} className="animate-spin" />}
        {submitLabel}
      </button>
    </footer>
  );
}
