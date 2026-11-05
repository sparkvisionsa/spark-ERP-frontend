"use client";

import AppShell from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { Avatar, Modal, Progress, Toast } from "@/components/ui";
import { API_URL, ApiError, apiRequest, apiUpload } from "@/lib/api";
import { companies, CompanyKey, Employee } from "@/lib/data";
import { confirmInCurrentLanguage, intlLocale } from "@/lib/i18n";
import { useLanguage } from "@/components/language-provider";
import { TranslatableText } from "@/components/translatable-text";
import {
  AlertTriangle,
  Archive,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  Clock,
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
  Maximize2,
  MessageSquare,
  Mic,
  Minimize2,
  MoreHorizontal,
  Paperclip,
  Pause,
  Pin,
  Play,
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
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

type Role = "SUPER_ADMIN" | "SUPERVISOR" | "EMPLOYEE";
type WorkStatus = "NOT_STARTED" | "IN_PROGRESS" | "PAUSED" | "COMPLETED";
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
  durationDays?: number | null;
  done: boolean;
  attachments: number;
  order: number;
};
type SubtaskNode = {
  _id: string;
  title: string;
  durationDays?: number | null;
  manualStatus: WorkStatus;
  startedAt?: string | null;
  firstStartedAt?: string | null;
  startedById?: string | null;
  elapsedSeconds?: number;
  order: number;
  items: ItemNode[];
  progress: number;
  derivedStatus: WorkStatus;
  completedItems: number;
};
type TaskNode = {
  _id: string;
  title: string;
  durationDays?: number | null;
  description: string;
  assigneeId: string;
  helperIds: string[];
  receivedByIds?: string[];
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
  durationDays?: number | null;
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
  hasStartedWork?: boolean;
  tasks?: TaskNode[];
  deliveries?: DeliveryNode[];
};
type RunningWorkEntry = {
  key: string;
  kind: "task" | "detail";
  projectId: string;
  projectName: string;
  employeeId: string;
  employeeName: string;
  taskId: string;
  taskTitle: string;
  assigneeId: string;
  helperIds: string[];
  status: WorkStatus;
  priority: Priority;
  dueDate?: string | null;
  startedAt?: string | null;
  firstStartedAt?: string | null;
  elapsedSeconds: number;
  plannedDurationDays?: number | null;
  progress: number;
  detailId?: string;
  detailTitle?: string;
};
type WorkNavigationEntry = Pick<
  RunningWorkEntry,
  | "key"
  | "kind"
  | "projectId"
  | "projectName"
  | "employeeId"
  | "employeeName"
  | "taskId"
  | "taskTitle"
  | "detailId"
  | "detailTitle"
>;
type AssignedTaskEntry = {
  key: string;
  projectId: string;
  projectName: string;
  employeeId: string;
  taskId: string;
  taskTitle: string;
  received: boolean;
  status: WorkStatus;
};
type WorkspaceProject = {
  id: string;
  name: string;
  durationDays: number | null;
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
  hasStartedWork: boolean;
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
  "id" | "status" | "progress" | "totalTasks" | "hasStartedWork" | "isPinned" | "isFavorite" | "order"
>;
type TaskDraft = {
  title: string;
  durationDays: number | null;
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
  durationDays: number | null;
  itemTexts: string[];
  manualStatus?: WorkStatus;
};
type ItemDraft = { text: string; durationDays: number | null };
type ProjectSort = "manual" | "due" | "progress" | "name";
type ProjectStatusFilter = "all" | "new" | "active" | "completed" | "overdue" | "archive";
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
function hasProjectWorkStarted(item: ApiProject) {
  if (typeof item.hasStartedWork === "boolean") return item.hasStartedWork;
  return (item.tasks || []).some(
    (task) =>
      task.progress > 0 ||
      task.manualStatus !== "NOT_STARTED" ||
      task.subtasks.some(
        (detail) =>
          detail.progress > 0 ||
          detail.manualStatus !== "NOT_STARTED" ||
          Boolean(detail.startedAt) ||
          Number(detail.elapsedSeconds || 0) > 0 ||
          detail.items.some((executionItem) => executionItem.done),
      ),
  );
}
function toProject(item: ApiProject): WorkspaceProject {
  return {
    id: item._id,
    name: item.name,
    durationDays: item.durationDays ?? null,
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
    hasStartedWork: hasProjectWorkStarted(item),
  };
}
function collectRunningWork(
  apiProjects: ApiProject[],
  employeeNameFor: (employeeId: string) => string,
): RunningWorkEntry[] {
  return apiProjects.flatMap((project) =>
    (project.tasks || []).flatMap((task) => {
      const work: RunningWorkEntry[] = [];
      const details = task.subtasks || [];
      const visibleDetails = details.filter(
        (detail) =>
          detail.manualStatus === "IN_PROGRESS" && detail.progress < 100,
      );
      for (const detail of visibleDetails) {
        const employeeId = detail.startedById || task.assigneeId;
        work.push({
          key: `${project._id}:detail:${detail._id}`,
          kind: "detail",
          projectId: project._id,
          projectName: project.name,
          employeeId,
          employeeName: employeeNameFor(employeeId),
          taskId: task._id,
          taskTitle: task.title,
          assigneeId: task.assigneeId,
          helperIds: task.helperIds || [],
          status: detail.manualStatus,
          priority: task.priority,
          dueDate: task.dueDate,
          startedAt: detail.startedAt,
          firstStartedAt: detail.firstStartedAt || detail.startedAt,
          elapsedSeconds: detail.elapsedSeconds || 0,
          plannedDurationDays: detail.durationDays ?? task.durationDays,
          progress: detail.progress,
          detailId: detail._id,
          detailTitle: detail.title,
        });
      }
      return work;
    }),
  );
}
function collectAssignedTasks(apiProjects: ApiProject[], employeeId?: string): AssignedTaskEntry[] {
  if (!employeeId) return [];
  return apiProjects.flatMap((project) =>
    (project.tasks || [])
      .filter((task) =>
        (task.assigneeId === employeeId || task.helperIds?.includes(employeeId)) &&
        task.manualStatus !== "COMPLETED" && task.progress < 100
      )
      .map((task) => ({
        key: `${project._id}:${task._id}`,
        projectId: project._id,
        projectName: project.name,
        employeeId,
        taskId: task._id,
        taskTitle: task.title,
        received: Boolean(task.receivedByIds?.includes(employeeId)),
        status: task.manualStatus,
      })),
  );
}
function shortDate(value?: string | null) {
  return value
    ? new Intl.DateTimeFormat(intlLocale(), {
        day: "numeric",
        month: "short",
      }).format(new Date(value))
    : "—";
}
function shortDateTime(value?: string | null) {
  return value
    ? new Intl.DateTimeFormat(intlLocale(), {
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(value))
    : "لم يبدأ بعد";
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
function isCompletedProject(project: WorkspaceProject) {
  return project.status === "COMPLETED" || project.progress >= 100;
}
function isProjectOverdue(project: WorkspaceProject) {
  return (
    project.status !== "ARCHIVED" &&
    !isCompletedProject(project) &&
    isOverdue(project.dueDate, project.progress)
  );
}
function matchesProjectStatus(
  project: WorkspaceProject,
  status: ProjectStatusFilter,
) {
  if (status === "all") return true;
  if (status === "archive") return project.status === "ARCHIVED";
  if (project.status === "ARCHIVED") return false;
  if (status === "completed") return isCompletedProject(project);
  if (status === "overdue") return isProjectOverdue(project);
  if (status === "new")
    return !isCompletedProject(project) && !project.hasStartedWork;
  return !isCompletedProject(project) && project.hasStartedWork;
}

export default function ProjectsPage() {
  const { user } = useAuth();
  useLanguage();
  const canManage = user?.role === "SUPER_ADMIN" || user?.role === "SUPERVISOR";
  const canCreateProject = canManage || Boolean(user?.role === "EMPLOYEE" && user.company);
  const [projects, setProjects] = useState<WorkspaceProject[]>([]);
  const [runningWork, setRunningWork] = useState<RunningWorkEntry[]>([]);
  const [assignedTasks, setAssignedTasks] = useState<AssignedTaskEntry[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [workspace, setWorkspace] = useState<WorkspaceTree | null>(null);
  const [projectId, setProjectId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [taskId, setTaskId] = useState("");
  const [subtaskId, setSubtaskId] = useState("");
  const [itemId, setItemId] = useState("");
  const [filter, setFilter] = useState<"all" | CompanyKey>("all");
  const [projectStatusFilter, setProjectStatusFilter] = useState<ProjectStatusFilter>("active");
  const [query, setQuery] = useState("");
  const [projectSort, setProjectSort] = useState<ProjectSort>("manual");
  const [taskQuery, setTaskQuery] = useState("");
  const [taskFilter, setTaskFilter] = useState<TaskFilter>("all");
  const [companyKeys, setCompanyKeys] = useState<CompanyKey[]>([]);
  const [level, setLevel] = useState(0);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [projectModal, setProjectModal] = useState(false);
  const [assignModal, setAssignModal] = useState(false);
  const [taskModal, setTaskModal] = useState(false);
  const [subtaskModal, setSubtaskModal] = useState(false);
  const [itemModal, setItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemNode | null>(null);
  const [editingProject, setEditingProject] = useState<WorkspaceProject | null>(
    null,
  );
  const [editingTask, setEditingTask] = useState<TaskNode | null>(null);
  const [editingSubtask, setEditingSubtask] = useState<SubtaskNode | null>(
    null,
  );
  const [dragged, setDragged] = useState<{ entity: DragEntity; id: string } | null>(null);
  const draggedRef = useRef<{ entity: DragEntity; id: string } | null>(null);
  const workspaceRequestRef = useRef(0);
  const catalogInitializedRef = useRef(false);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2500);
  }
  function showError(caught: unknown, fallback: string) {
    setError(caught instanceof ApiError ? caught.message : fallback);
  }
  const refreshRunningWork = useCallback(async () => {
    try {
      const active = await apiRequest<ApiProject[]>("/projects");
      const employeeNames = new Map(employees.map((employee) => [employee.id, employee.name]));
      for (const project of active) {
        for (const member of project.members) {
          if (typeof member !== "string") employeeNames.set(member._id, member.fullName || "");
        }
      }
      setProjects((current) => [
        ...active.map(toProject),
        ...current.filter((project) => project.status === "ARCHIVED"),
      ]);
      setRunningWork(collectRunningWork(active, (id) => employeeNames.get(id) || ""));
      setAssignedTasks(collectAssignedTasks(active, user?.role === "EMPLOYEE" ? user.id : undefined));
    } catch {
      // Keep the last known global status if a background refresh fails.
    }
  }, [employees, user?.id, user?.role]);

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
      const nextEmployees = employeeList
        .filter(
          (employee) => employee.role !== "SUPER_ADMIN" && employee.company,
        )
        .map(toEmployee);
      const employeeNames = new Map(employeeList.map((employee) => [employee._id, employee.fullName || ""]));
      for (const project of active) {
        for (const member of project.members) {
          if (typeof member !== "string") employeeNames.set(member._id, member.fullName || "");
        }
      }
      setEmployees(nextEmployees);
      setRunningWork(collectRunningWork(active, (id) => employeeNames.get(id) || ""));
      setAssignedTasks(collectAssignedTasks(active, user?.role === "EMPLOYEE" ? user.id : undefined));
      const params = new URLSearchParams(window.location.search);
      const company = params.get("c");
      if (company && organisations.some((entry) => entry.key === company))
        setFilter(company);
      const linkedProjectId = params.get("p");
      const requested =
        preferredId ||
        linkedProjectId ||
        localStorage.getItem("spark-last-project") ||
        "";
      const requestedProject = nextProjects.find(
        (project) => project.id === requested,
      );
      if (!catalogInitializedRef.current) {
        const explicitlyRequestedProject = preferredId || linkedProjectId;
        if (explicitlyRequestedProject && requestedProject) {
          setProjectStatusFilter(
            requestedProject.status === "ARCHIVED"
              ? "archive"
              : isCompletedProject(requestedProject)
                ? "completed"
                : isProjectOverdue(requestedProject)
                  ? "overdue"
                  : matchesProjectStatus(requestedProject, "active")
                    ? "active"
                    : matchesProjectStatus(requestedProject, "new")
                      ? "new"
                    : "all",
          );
          setProjectId(requestedProject.id);
        } else {
          setProjectStatusFilter("active");
          setProjectId(
            requestedProject && matchesProjectStatus(requestedProject, "active")
              ? requestedProject.id
              : nextProjects.find((project) =>
                  matchesProjectStatus(project, "active"),
                )?.id || "",
          );
        }
        catalogInitializedRef.current = true;
      } else {
        setProjectId(
          requestedProject?.id ||
            nextProjects.find((project) =>
              matchesProjectStatus(project, "active"),
            )?.id ||
            "",
        );
      }
    } catch (caught) {
      showError(caught, "تعذر تحميل المشاريع");
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.role]);

  useEffect(() => {
    if (user) void loadCatalog();
  }, [user, loadCatalog]);

  useEffect(() => {
    if (!user) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refreshRunningWork();
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [user?.id, refreshRunningWork]);

  const applyWorkspace = useCallback(
    (tree: WorkspaceTree, useUrl = false) => {
      setWorkspace(tree);
      setProjects((current) =>
        current.map((project) =>
          project.id === tree._id ? toProject(tree) : project,
        ),
      );
      const projectWork = collectRunningWork([tree], (id) =>
        employees.find((employee) => employee.id === id)?.name ||
        tree.members.find((member) => member._id === id)?.fullName ||
        "",
      );
      setRunningWork((current) => [
        ...current.filter((entry) => entry.projectId !== tree._id),
        ...projectWork,
      ]);
      setAssignedTasks((current) => [
        ...current.filter((entry) => entry.projectId !== tree._id),
        ...collectAssignedTasks([tree], user?.role === "EMPLOYEE" ? user.id : undefined),
      ]);
      const params = new URLSearchParams(window.location.search);
      const members = tree.members.map((member) => member._id);
      const nextEmployee =
        (user?.role === "EMPLOYEE"
          ? members.includes(user.id) ? user.id : ""
          : useUrl && members.includes(params.get("e") || "")
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
    [employeeId, taskId, subtaskId, itemId, employees, user?.id, user?.role],
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
    .filter((member): member is Employee => Boolean(member && (canManage || member.id === user?.id)));
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
            (filter === "all" || entry.company === filter) &&
            matchesProjectStatus(entry, projectStatusFilter) &&
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
    [projects, filter, projectStatusFilter, query, projectSort],
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
  const companyProjects = projects.filter(
    (entry) => filter === "all" || entry.company === filter,
  );
  const activeProjectCount = companyProjects.filter(
    (entry) => matchesProjectStatus(entry, "active"),
  ).length;
  const newProjectCount = companyProjects.filter(
    (entry) => matchesProjectStatus(entry, "new"),
  ).length;
  const completedProjectCount = companyProjects.filter(
    (entry) => matchesProjectStatus(entry, "completed"),
  ).length;
  const overdueProjectCount = companyProjects.filter(
    (entry) => matchesProjectStatus(entry, "overdue"),
  ).length;
  const archivedProjectCount = companyProjects.filter(
    (entry) => matchesProjectStatus(entry, "archive"),
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
  const canCreateTask = canManage || Boolean(
    user?.role === "EMPLOYEE" && project?.memberIds.includes(user.id),
  );
  const canCreateSubtask = canManage || Boolean(user?.role === "EMPLOYEE" && canWorkOnTask);
  const receiptEmployeeId = user?.role === "EMPLOYEE" ? user.id : employeeId;

  function syncUrl(
    values: { p?: string; e?: string; t?: string; s?: string; i?: string },
    selectedFilter = filter,
  ) {
    const params = new URLSearchParams();
    if (selectedFilter !== "all") params.set("c", selectedFilter);
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
      (nextFilter === "all" || project.company === nextFilter) &&
      matchesProjectStatus(project, projectStatusFilter),
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
  function chooseProjectStatus(nextStatus: ProjectStatusFilter) {
    const selectedProjectMatches = Boolean(
      project &&
        (filter === "all" || project.company === filter) &&
        matchesProjectStatus(project, nextStatus),
    );
    setProjectStatusFilter(nextStatus);
    if (!selectedProjectMatches) {
      clearWorkspaceSelection(true);
      setLevel(0);
      syncUrl({}, filter);
    } else {
      syncUrl(
        { p: projectId, e: employeeId, t: task?._id, s: subtask?._id, i: item?._id },
        filter,
      );
    }
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
    if (user?.role === "EMPLOYEE" && id !== user.id) return;
    const next = activeWorkspace?.tasks.find(
      (entry) => entry.assigneeId === id || entry.helperIds?.includes(id),
    );
    setEmployeeId(id);
    setTaskId(next?._id || "");
    setSubtaskId(next?.subtasks[0]?._id || "");
    setItemId("");
    setLevel(2);
    syncUrl({ p: projectId, e: id, t: next?._id, s: next?.subtasks[0]?._id });
  }
  function navigateToRunningWork(
    entry: WorkNavigationEntry,
    destination: "project" | "task" | "detail",
  ) {
    const nextLevel = destination === "project" ? 1 : destination === "task" ? 3 : 4;
    setProjectId(entry.projectId);
    setEmployeeId(entry.employeeId);
    setTaskId(destination === "project" ? "" : entry.taskId);
    setSubtaskId(destination === "detail" ? entry.detailId || "" : "");
    setItemId("");
    setLevel(nextLevel);
    setTaskQuery("");
    setTaskFilter("all");
    localStorage.setItem("spark-last-project", entry.projectId);
    const targetProject = projects.find((project) => project.id === entry.projectId);
    const nextFilter = filter === "all" || filter === targetProject?.company
      ? filter
      : targetProject?.company || "all";
    setFilter(nextFilter);
    syncUrl({
      p: entry.projectId,
      e: entry.employeeId,
      t: destination === "project" ? undefined : entry.taskId,
      s: destination === "detail" ? entry.detailId : undefined,
    }, nextFilter);
    if (entry.projectId !== projectId) {
      setWorkspaceLoading(true);
      setWorkspace(null);
    } else if (!activeWorkspace && !workspaceLoading) {
      void loadWorkspace(entry.projectId, true);
    }
  }
  function chooseTask(next: TaskNode) {
    setTaskId(next._id);
    setSubtaskId(next.subtasks[0]?._id || "");
    setItemId("");
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
    setLevel(4);
    syncUrl({ p: projectId, e: employeeId, t: taskId, s: next._id });
  }
  function chooseItem(id: string) {
    setItemId(id);
    setLevel(5);
    syncUrl({ p: projectId, e: employeeId, t: taskId, s: subtaskId, i: id });
  }
  const columnClass = (index: number) =>
    `${level === index ? "flex" : "hidden"} md:flex`;
  function toggleExpandedStep(index: number) {
    setLevel(index);
    setExpandedStep((current) => current === index ? null : index);
  }

  async function saveProject(draft: ProjectDraft) {
    setBusy(true);
    setError("");
    const wasEditing = Boolean(editingProject);
    try {
      const body = {
        name: draft.name,
        company: draft.company,
        durationDays: draft.durationDays,
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
      if (!wasEditing) setProjectStatusFilter("new");
      await loadWorkspace(result._id);
      notify(wasEditing ? "تم تحديث المشروع" : "تم إنشاء المشروع");
    } catch (caught) {
      showError(caught, "تعذر حفظ المشروع");
    } finally {
      setBusy(false);
    }
  }
  async function quickAddProject(name: string) {
    const company = filter !== "all" && allowedCompanies.includes(filter)
      ? filter
      : allowedCompanies[0];
    if (!company || busy) return;
    setBusy(true);
    try {
      const result = await apiRequest<ApiProject>("/projects", {
        method: "POST",
        body: JSON.stringify({ name, company, memberIds: [] }),
      });
      await loadCatalog(result._id);
      setProjectStatusFilter("new");
      await loadWorkspace(result._id);
      notify("تمت إضافة المشروع");
    } catch (caught) {
      showError(caught, "تعذر إضافة المشروع");
      throw caught;
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
      setFilter("all");
      setProjectStatusFilter(status === "ARCHIVED" ? "archive" : "all");
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
      setProjectStatusFilter(status === "COMPLETED" ? "completed" : "all");
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
    if (!target || busy || !confirmInCurrentLanguage(`حذف مشروع «${target.name}»؟`, `Delete project “${target.name}”?`))
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
            durationDays: payload.durationDays,
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
  async function quickAddTask(title: string) {
    if (!project || !employeeId || busy) return;
    setBusy(true);
    try {
      const existingIds = new Set(activeWorkspace?.tasks.map((entry) => entry._id) || []);
      const tree = await apiRequest<WorkspaceTree>("/tasks", {
        method: "POST",
        body: JSON.stringify({
          projectId: project.id,
          title,
          description: "",
          assigneeId: employeeId,
          helperIds: [],
          priority: "NORMAL",
          subtaskTitles: [],
        }),
      });
      const createdTask = tree.tasks.find((entry) => !existingIds.has(entry._id));
      applyWorkspace(tree);
      if (createdTask) {
        setTaskId(createdTask._id);
        setSubtaskId(createdTask.subtasks[0]?._id || "");
        setItemId("");
        setLevel(2);
        syncUrl({ p: project.id, e: employeeId, t: createdTask._id, s: createdTask.subtasks[0]?._id });
      }
      notify("تمت إضافة المهمة");
    } catch (caught) {
      showError(caught, "تعذر إضافة المهمة");
      throw caught;
    } finally {
      setBusy(false);
    }
  }
  async function deleteTask(target: TaskNode) {
    if (
      !project ||
      busy ||
      !confirmInCurrentLanguage(`حذف مهمة «${target.title}» وكل تفاصيلها وتسليماتها؟`, `Delete task “${target.title}” and all its subtasks and deliveries?`)
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
            durationDays: payload.durationDays,
            manualStatus: payload.manualStatus,
          }
        : {
            projectId: project.id,
            title: payload.title,
            durationDays: payload.durationDays,
            itemTexts: payload.itemTexts,
          };
      applyWorkspace(
        await apiRequest<WorkspaceTree>(path, {
          method: editingSubtask ? "PATCH" : "POST",
          body: JSON.stringify(body),
        }),
      );
      await refreshRunningWork();
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
  async function quickAddSubtask(title: string) {
    if (!project || !task || busy) return;
    setBusy(true);
    try {
      const existingIds = new Set(task.subtasks.map((entry) => entry._id));
      const tree = await apiRequest<WorkspaceTree>(`/subtasks/task/${task._id}`, {
        method: "POST",
        body: JSON.stringify({ projectId: project.id, title, itemTexts: [] }),
      });
      const updatedTask = tree.tasks.find((entry) => entry._id === task._id);
      const createdSubtask = updatedTask?.subtasks.find((entry) => !existingIds.has(entry._id));
      applyWorkspace(tree);
      if (createdSubtask) {
        setSubtaskId(createdSubtask._id);
        setItemId("");
        setLevel(3);
        syncUrl({ p: project.id, e: employeeId, t: task._id, s: createdSubtask._id });
      }
      notify("تمت إضافة التفصيل");
    } catch (caught) {
      showError(caught, "تعذر إضافة التفصيل");
      throw caught;
    } finally {
      setBusy(false);
    }
  }
  async function startSubtask(target: SubtaskNode) {
    if (!project || busy || target.manualStatus === "IN_PROGRESS") return;
    setBusy(true);
    try {
      applyWorkspace(await apiRequest<WorkspaceTree>(`/subtasks/${target._id}`, { method: "PATCH", body: JSON.stringify({ projectId: project.id, manualStatus: "IN_PROGRESS" }) }));
      await refreshRunningWork();
      notify("بدأت المرحلة، وتم إيقاف أي تفصيل آخر قيد العمل");
    } catch (caught) { showError(caught, "تعذر بدء المرحلة"); } finally { setBusy(false); }
  }
  async function pauseSubtask(target: SubtaskNode) {
    if (!project || busy || target.manualStatus !== "IN_PROGRESS") return;
    setBusy(true);
    try {
      applyWorkspace(await apiRequest<WorkspaceTree>(`/subtasks/${target._id}`, { method: "PATCH", body: JSON.stringify({ projectId: project.id, manualStatus: "PAUSED" }) }));
      await refreshRunningWork();
      notify("تم إيقاف المرحلة مؤقتًا");
    } catch (caught) { showError(caught, "تعذر إيقاف المرحلة مؤقتًا"); } finally { setBusy(false); }
  }
  async function finishSubtask(target: SubtaskNode) {
    if (!project || busy || target.manualStatus !== "IN_PROGRESS") return;
    setBusy(true);
    try {
      applyWorkspace(
        await apiRequest<WorkspaceTree>(`/subtasks/${target._id}`, {
          method: "PATCH",
          body: JSON.stringify({
            projectId: project.id,
            manualStatus: "COMPLETED",
          }),
        }),
      );
      await refreshRunningWork();
      notify("تم إنهاء التفصيل واعتماد جميع بنود التنفيذ");
    } catch (caught) {
      showError(caught, "تعذر إنهاء التفصيل");
    } finally {
      setBusy(false);
    }
  }
  async function toggleRunningWork(entry: RunningWorkEntry) {
    if (!entry.detailId || busy || entry.status !== "IN_PROGRESS") return;
    setBusy(true);
    try {
      const updated = await apiRequest<WorkspaceTree>(
        `/subtasks/${entry.detailId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            projectId: entry.projectId,
            manualStatus: "PAUSED",
          }),
        },
      );
      if (entry.projectId === projectId) applyWorkspace(updated);
      await refreshRunningWork();
      notify("تم إيقاف العمل مؤقتًا وحفظ المدة");
    } catch (caught) {
      showError(caught, "تعذر إيقاف العمل مؤقتًا");
    } finally {
      setBusy(false);
    }
  }
  async function receiveTask(target: TaskNode) {
    if (!project || busy || !user || target.receivedByIds?.includes(user.id)) return;
    setBusy(true);
    try {
      applyWorkspace(await apiRequest<WorkspaceTree>(`/tasks/${target._id}/receive`, {
        method: "POST",
        body: JSON.stringify({ projectId: project.id }),
      }));
      notify("تم تسجيل استلام المهمة");
    } catch (caught) {
      showError(caught, "تعذر تسجيل استلام المهمة");
    } finally {
      setBusy(false);
    }
  }
  async function receiveAssignedTask(target: AssignedTaskEntry) {
    if (busy || target.received || !user || user.role !== "EMPLOYEE") return;
    setBusy(true);
    try {
      const tree = await apiRequest<WorkspaceTree>(`/tasks/${target.taskId}/receive`, {
        method: "POST",
        body: JSON.stringify({ projectId: target.projectId }),
      });
      if (target.projectId === projectId) applyWorkspace(tree);
      setAssignedTasks((current) => current.map((entry) => entry.key === target.key ? { ...entry, received: true } : entry));
      notify("تم استلام المهمة");
    } catch (caught) {
      showError(caught, "تعذر استلام المهمة");
    } finally {
      setBusy(false);
    }
  }
  async function deleteSubtask(target: SubtaskNode) {
    if (
      !project ||
      busy ||
      !confirmInCurrentLanguage(`حذف «${target.title}» وبنودها وتسليماتها؟`, `Delete “${target.title}” and all its checklist items and deliveries?`)
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
  async function saveExecutionItem(payload: ItemDraft) {
    if (!project || !subtask || busy) return;
    const wasEditing = Boolean(editingItem);
    setBusy(true);
    try {
      const path = editingItem
        ? `/items/${editingItem._id}`
        : `/items/subtask/${subtask._id}`;
      applyWorkspace(await apiRequest<WorkspaceTree>(path, {
        method: editingItem ? "PATCH" : "POST",
        body: JSON.stringify({ projectId: project.id, ...payload }),
      }));
      setItemModal(false);
      setEditingItem(null);
      notify(wasEditing ? "تم تحديث بند التنفيذ" : "تمت إضافة بند التنفيذ");
    } catch (caught) {
      showError(caught, wasEditing ? "تعذر تحديث بند التنفيذ" : "تعذر إضافة بند التنفيذ");
    } finally {
      setBusy(false);
    }
  }
  async function deleteItem(target: ItemNode) {
    if (
      !project ||
      busy ||
      !confirmInCurrentLanguage(`حذف بند «${target.text}» وتسليماته؟`, `Delete checklist item “${target.text}” and its deliveries?`)
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
      !confirmInCurrentLanguage("هل تريد حذف هذا التسليم ومرفقاته؟", "Delete this delivery and its attachments?")
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
      (user?.role === "SUPERVISOR" || user?.role === "EMPLOYEE") && user.company
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
          className="border-b p-2 sm:p-2.5"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-sm">
              <FolderKanban size={17} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold sm:text-xs">مساحة المشاريع والمهام</div>
              <div className="mt-0.5 flex min-w-0 items-center gap-1 overflow-hidden text-[10px]" style={{ color: "var(--muted)" }}>
                {breadcrumbs.length ? breadcrumbs.map((crumb, index) => (
                  <span key={`${crumb}-${index}`} className="flex min-w-0 items-center gap-1">
                    <span className="max-w-[130px] truncate" style={{ color: index === breadcrumbs.length - 1 ? "var(--text)" : undefined }}>
                      <FullNameTooltip text={crumb} className="block truncate" />
                    </span>
                    {index < breadcrumbs.length - 1 && <ChevronLeft size={11} className="shrink-0" />}
                  </span>
                )) : <span>اختر مشروعاً لبدء المتابعة</span>}
              </div>
            </div>
            <div className="hidden items-center gap-1.5 sm:flex">
              <SummaryMetric label="المشاريع" value={activeProjects.length} icon={<FolderKanban size={12} />} />
              <SummaryMetric label="المهام" value={totalTasks} icon={<ClipboardList size={12} />} />
              <SummaryMetric label="الإنجاز" value={`${totalProgress}%`} icon={<CheckCircle2 size={12} />} />
            </div>
            <div className="relative w-full sm:w-48 md:w-56">
              <Search className="absolute end-2.5 top-1/2 -translate-y-1/2" size={14} color="var(--muted)" />
              <input
                className="field h-9 pe-8 text-[11px]"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="ابحث عن مشروع أو عميل"
                aria-label="بحث في المشاريع"
              />
            </div>
            {canCreateProject && (
              <button className="btn-primary h-9 shrink-0 gap-1 px-2.5 text-[11px]" onClick={() => { setEditingProject(null); setProjectModal(true); }}>
                <Plus size={14} /> مشروع جديد
              </button>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t pt-2" style={{ borderColor: "var(--border)" }}>
            <span className="me-0.5 flex items-center gap-1 text-[10px] font-medium" style={{ color: "var(--muted)" }}><Users size={12} />الشركات</span>
            {([
              { key: "all", label: "كل الشركات" },
              ...companyKeys.map((key) => ({ key, label: companyMeta(key).name })),
            ] as Array<{ key: "all" | CompanyKey; label: string }>).map(({ key, label }) => (
              <button key={key} onClick={() => chooseFilter(key)} className={`chip h-7 whitespace-nowrap gap-1.5 px-2.5 text-[10px] ${filter === key ? "chip-active" : ""}`}>
                {key !== "all" ? <span className="h-2 w-2 rounded-full" style={{ background: companyMeta(key).color }} /> : <FolderKanban size={12} />}
                {label}
                <span className="opacity-70">{key === "all" ? projects.length : projects.filter((entry) => entry.company === key).length}</span>
              </button>
            ))}
            <label className="ms-auto flex items-center gap-1.5 text-[10px]" style={{ color: "var(--muted)" }}>
              <ListFilter size={13} />
              <select className="field h-7 w-auto min-w-[112px] px-2 text-[10px]" value={projectSort} onChange={(event) => setProjectSort(event.target.value as ProjectSort)} aria-label="ترتيب المشاريع">
                <option value="manual">ترتيب يدوي</option>
                <option value="due">الأقرب موعداً</option>
                <option value="progress">الأقل إنجازاً</option>
                <option value="name">حسب الاسم</option>
              </select>
            </label>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-6">
            {([
              { key: "all", label: "كل المشاريع", count: companyProjects.length, icon: <FolderKanban size={14} />, color: "var(--primary)" },
              { key: "new", label: "جديد", count: newProjectCount, icon: <Sparkles size={14} />, color: "var(--primary)" },
              { key: "active", label: "قيد التنفيذ", count: activeProjectCount, icon: <Play size={14} />, color: "var(--warning)" },
              { key: "completed", label: "مكتملة", count: completedProjectCount, icon: <CheckCircle2 size={14} />, color: "var(--success)" },
              { key: "overdue", label: "متأخرة", count: overdueProjectCount, icon: <AlertTriangle size={14} />, color: "var(--danger)" },
              { key: "archive", label: "مؤرشفة", count: archivedProjectCount, icon: <Archive size={14} />, color: "var(--muted)" },
            ] as const).map((card) => {
              const selected = projectStatusFilter === card.key;
              return (
                <button
                  key={card.key}
                  type="button"
                  onClick={() => chooseProjectStatus(card.key)}
                  aria-pressed={selected}
                  className="flex min-w-0 items-center gap-2 rounded-xl border px-2.5 py-2 text-start transition hover:-translate-y-px hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand sm:px-3"
                  style={{ borderColor: selected ? `color-mix(in srgb, ${card.color} 35%, var(--border))` : "var(--border)", background: selected ? `color-mix(in srgb, ${card.color} 8%, var(--surface))` : "var(--surface)" }}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ color: card.color, background: `color-mix(in srgb, ${card.color} 12%, var(--surface))` }}>{card.icon}</span>
                  <span className="min-w-0 flex-1 truncate text-[10px] font-medium sm:text-[11px]">{card.label}</span>
                  <b className="text-sm tabular-nums" style={{ color: card.color }}>{card.count}</b>
                </button>
              );
            })}
          </div>
        </div>

        <div className={`mx-2 mt-1.5 grid min-w-0 gap-1.5 ${user?.role === "EMPLOYEE" ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}>
          {user?.role === "EMPLOYEE" && <AssignedTasksSummary
            entries={assignedTasks}
            loading={loading}
            busy={busy}
            onReceive={receiveAssignedTask}
            onNavigate={(entry) => navigateToRunningWork({
              key: entry.key,
              kind: "task",
              projectId: entry.projectId,
              projectName: entry.projectName,
              employeeId: entry.employeeId,
              employeeName: user.fullName || "",
              taskId: entry.taskId,
              taskTitle: entry.taskTitle,
            }, "task")}
          />}
          <RunningWorkSummary
            entries={runningWork}
            loading={loading}
            busy={busy}
            canControl={(entry) =>
              Boolean(
                canManage ||
                  (user &&
                    (entry.assigneeId === user.id ||
                      entry.helperIds.includes(user.id))),
              )
            }
            onNavigate={navigateToRunningWork}
            onToggle={toggleRunningWork}
          />
        </div>

        {project && <ProjectBrief project={project} />}

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
          <div
            className="project-columns min-h-[560px] min-w-0 gap-1.5"
            data-expanded-step={expandedStep === null ? undefined : expandedStep}
          >
            <WorkspaceColumn
              index={1}
              active={level === 0}
              expanded={expandedStep === 0}
              collapsed={expandedStep !== null && expandedStep !== 0}
              onToggleExpand={() => toggleExpandedStep(0)}
              title="المشاريع"
              count={visibleProjects.length}
              className={columnClass(0)}
              onAdd={
                canCreateProject
                  ? () => {
                      setEditingProject(null);
                      setProjectModal(true);
                    }
                  : undefined
              }
            >
              <ColumnHead first="الاسم" second="الإنجاز" />
              {canCreateProject && allowedCompanies.length > 0 && <QuickAddInput placeholder="أضف مشروعًا سريعًا" busy={busy} onAdd={quickAddProject} />}
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
              active={level === 1}
              expanded={expandedStep === 1}
              collapsed={expandedStep !== null && expandedStep !== 1}
              onToggleExpand={() => toggleExpandedStep(1)}
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
              active={level === 2}
              expanded={expandedStep === 2}
              collapsed={expandedStep !== null && expandedStep !== 2}
              onToggleExpand={() => toggleExpandedStep(2)}
              title="المهام"
              count={visibleEmployeeTasks.length}
              className={columnClass(2)}
              onAdd={
                canCreateTask && project
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
              {canCreateTask && project && employeeId && <QuickAddInput placeholder="أضف مهمة سريعة" busy={busy} onAdd={quickAddTask} />}
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
                    canReceive={Boolean(user?.role === "EMPLOYEE" && entry.progress < 100 && entry.manualStatus !== "COMPLETED" && (entry.assigneeId === user.id || entry.helperIds.includes(user.id)))}
                    received={Boolean(receiptEmployeeId && entry.receivedByIds?.includes(receiptEmployeeId))}
                    busy={busy}
                    onSelect={() => chooseTask(entry)}
                    onReceive={() => void receiveTask(entry)}
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
              active={level === 3}
              expanded={expandedStep === 3}
              collapsed={expandedStep !== null && expandedStep !== 3}
              onToggleExpand={() => toggleExpandedStep(3)}
              title="التفاصيل"
              count={task?.subtasks.length || 0}
              className={columnClass(3)}
              onAdd={
                canCreateSubtask && task
                  ? () => {
                      setEditingSubtask(null);
                      setSubtaskModal(true);
                    }
                  : undefined
              }
            >
              <ColumnHead first="المهمة الفرعية" second="البنود" />
              {canCreateSubtask && task && <QuickAddInput placeholder="اسم مرحلة جديدة" busy={busy} onAdd={quickAddSubtask} />}
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
                    canPause={Boolean(canManage || (user && (entry.startedById === user.id || (!entry.startedById && task.assigneeId === user.id))))}
                    busy={busy}
                    onSelect={() => chooseSubtask(entry)}
                    onEdit={() => {
                      setEditingSubtask(entry);
                      setSubtaskModal(true);
                    }}
                    onStart={() => void startSubtask(entry)}
                    onPause={() => void pauseSubtask(entry)}
                    onFinish={() => void finishSubtask(entry)}
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
              active={level === 4}
              expanded={expandedStep === 4}
              collapsed={expandedStep !== null && expandedStep !== 4}
              onToggleExpand={() => toggleExpandedStep(4)}
              title="قائمة التنفيذ"
              count={subtask?.items.length || 0}
              className={columnClass(4)}
              onAdd={canWorkOnTask && subtask ? () => { setEditingItem(null); setItemModal(true); } : undefined}
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
                      <TranslatableText
                        text={entry.text}
                        compact
                        onTextClick={() => chooseItem(entry._id)}
                        className={`flex min-w-0 flex-1 text-start text-xs ${entry.done ? "line-through opacity-60" : ""}`}
                        textClassName="block truncate"
                      />
                      {entry.durationDays ? <span className="shrink-0 text-[9px]" style={{ color: "var(--muted)" }}>{entry.durationDays} أيام</span> : null}
                      {entry.attachments > 0 && (
                        <span
                          className="flex items-center gap-0.5 text-[10px]"
                          style={{ color: "var(--muted)" }}
                        >
                          <Paperclip size={11} />
                          {entry.attachments}
                        </span>
                      )}
                      {canManage && (
                        <span className="hidden shrink-0 gap-0.5 group-hover:flex">
                          <button
                            className="btn-ghost h-6 w-6"
                            title="تعديل البند"
                            onClick={() => {
                              setEditingItem(entry);
                              setItemModal(true);
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
              active={level === 5}
              expanded={expandedStep === 5}
              collapsed={expandedStep !== null && expandedStep !== 5}
              onToggleExpand={() => toggleExpandedStep(5)}
              title="الإنجاز والتسليمات"
              count={selectedDeliveries.length}
              className={columnClass(5)}
            >
              {task ? (
                <DeliveryPanel
                  item={item}
                  deliveries={selectedDeliveries}
                  memberMap={memberMap}
                  canSubmit={canWorkOnTask}
                  canManage={Boolean(canManage)}
                  currentUserId={user?.id || ""}
                  busy={busy}
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

      {canCreateProject && (
        <ProjectModal
          open={projectModal}
          onClose={() => !busy && setProjectModal(false)}
          project={editingProject}
          employees={canManage ? employees : employees.filter((employee) => employee.id === user?.id)}
          fixedMemberId={user?.role === "EMPLOYEE" ? user.id : undefined}
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
      {canCreateTask && project && (
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
      {canCreateSubtask && task && (
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
      {canWorkOnTask && subtask && (
        <ExecutionItemModal
          open={itemModal}
          onClose={() => { if (!busy) { setItemModal(false); setEditingItem(null); } }}
          item={editingItem}
          subtaskTitle={subtask.title}
          busy={busy}
          onSave={saveExecutionItem}
        />
      )}
      <Toast show={Boolean(toast)} message={toast} />
    </AppShell>
  );
}

function FullNameTooltip({ text, className = "" }: { text: string; className?: string }) {
  const { locale } = useLanguage();
  const anchorRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 8, top: 8 });

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    const tooltip = tooltipRef.current;
    if (!anchor || !tooltip) return;
    const anchorRect = anchor.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const margin = 8;
    const gap = 4;
    const leftCandidate = anchorRect.left - tooltipRect.width - gap;
    const fitsLeft = leftCandidate >= margin;
    const left = fitsLeft
      ? leftCandidate
      : Math.max(margin, Math.min(anchorRect.right + gap, window.innerWidth - tooltipRect.width - margin));
    const top = fitsLeft
      ? Math.max(margin, Math.min(anchorRect.top + (anchorRect.height - tooltipRect.height) / 2, window.innerHeight - tooltipRect.height - margin))
      : anchorRect.bottom + tooltipRect.height + gap <= window.innerHeight - margin
        ? anchorRect.bottom + gap
        : Math.max(margin, anchorRect.top - tooltipRect.height - gap);
    setPosition({ left, top });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  const show = () => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const isClipped = anchor.scrollWidth > anchor.clientWidth + 1 || anchor.scrollHeight > anchor.clientHeight + 1;
    if (!isClipped) return;
    setOpen(true);
  };

  return (
    <>
      <span
        ref={anchorRef}
        className={`full-name-anchor ${className}`}
        onMouseEnter={show}
        onMouseLeave={() => setOpen(false)}
        onFocus={show}
        onBlur={() => setOpen(false)}
      >
        {text}
      </span>
      {open && typeof document !== "undefined" && createPortal(
        <span
          ref={tooltipRef}
          className="full-name-tooltip"
          role="tooltip"
          dir={locale === "ar" ? "rtl" : "ltr"}
          style={{ left: position.left, top: position.top }}
        >
          {text}
        </span>,
        document.body,
      )}
    </>
  );
}

function ProjectBrief({ project }: { project: WorkspaceProject }) {
  const completed = isCompletedProject(project);
  const overdue = isProjectOverdue(project);
  return (
    <section
      className="mx-2 mt-1 flex min-h-9 flex-nowrap items-center gap-1.5 overflow-x-auto rounded-lg border px-1.5 py-1"
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
      <h3 className="min-w-[120px] flex-1 text-xs font-medium">
        <TranslatableText text={project.name} compact className="flex w-full" textClassName="block truncate" />
      </h3>
      <span
        className={`status ${completed ? "status-success" : overdue ? "status-danger" : project.hasStartedWork ? "status-warning" : "status-neutral"}`}
      >
        {completed
          ? "مكتمل"
          : overdue
            ? "متأخر"
            : project.hasStartedWork
              ? "قيد التنفيذ"
              : "جديد"}
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
        {project.durationDays ? <> · المدة {project.durationDays} يوم</> : null}
      </span>
    </section>
  );
}

function SummaryMetric({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1 rounded-lg border px-2 py-1 text-[9px]" style={{ borderColor: "var(--border)", color: "var(--muted)", background: "var(--surface-2)" }}>
      <span style={{ color: "var(--primary)" }}>{icon}</span>
      <span>{label}</span>
      <b className="text-[10px]" style={{ color: "var(--text)" }}>{value}</b>
    </span>
  );
}

function AssignedTasksSummary({
  entries,
  loading,
  busy,
  onReceive,
  onNavigate,
}: {
  entries: AssignedTaskEntry[];
  loading: boolean;
  busy: boolean;
  onReceive: (entry: AssignedTaskEntry) => void;
  onNavigate: (entry: AssignedTaskEntry) => void;
}) {
  const receivedCount = entries.filter((entry) => entry.received).length;
  return (
    <details className="group min-w-0 overflow-hidden rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <summary className="flex min-h-9 min-w-0 cursor-pointer list-none items-center gap-1 px-1.5 [&::-webkit-details-marker]:hidden sm:gap-1.5 sm:px-2">
        <ClipboardList size={13} className="shrink-0" color="var(--primary)" />
        <span className="min-w-0 truncate text-[9px] font-semibold sm:text-[11px]">المهام المستلمة</span>
        <span className="ms-auto shrink-0 rounded-full px-1 py-0.5 text-[9px] font-medium sm:px-1.5" style={{ color: "var(--success)", background: "color-mix(in srgb, var(--success) 10%, var(--surface))" }}>
          {receivedCount}/{entries.length}
        </span>
        <ChevronDown size={12} className="shrink-0 transition-transform group-open:rotate-180 sm:h-[13px] sm:w-[13px]" color="var(--muted)" />
      </summary>
      {entries.length ? (
        <div className="grid max-h-36 min-w-0 grid-cols-1 gap-1 border-t p-1.5 lg:grid-cols-2" style={{ borderColor: "var(--border)" }}>
          {entries.map((entry) => (
            <div key={entry.key} className="flex min-w-0 items-center gap-2 rounded-lg border px-2 py-1.5" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: entry.received ? "var(--success)" : "var(--warning)" }} />
              <div className="min-w-0 flex-1">
                <button type="button" onClick={() => onNavigate(entry)} className="block w-full truncate text-start text-[11px] font-medium hover:text-brand" aria-label={`فتح المهمة ${entry.taskTitle} في مشروع ${entry.projectName}`}>
                  <FullNameTooltip text={entry.taskTitle} className="block truncate" />
                </button>
                <button type="button" onClick={() => onNavigate(entry)} className="block w-full truncate text-start text-[9px] hover:text-brand" style={{ color: "var(--muted)" }}>
                  <FullNameTooltip text={entry.projectName} className="block truncate" />
                </button>
              </div>
              {entry.received ? (
                <span className="flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-[9px] font-medium" style={{ color: "var(--success)", background: "color-mix(in srgb, var(--success) 10%, var(--surface))" }}><CheckCircle2 size={11} />تم الاستلام</span>
              ) : (
                <button type="button" className="btn h-7 shrink-0 gap-1 px-2 text-[10px]" disabled={busy} onClick={() => onReceive(entry)}><Check size={11} />استلام</button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-1.5 border-t px-2 py-2 text-[10px]" style={{ color: "var(--muted)", background: "var(--surface-2)", borderColor: "var(--border)" }}>
          {loading ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
          {loading ? "جارٍ التحميل…" : "لا توجد مهام معيّنة لك"}
        </div>
      )}
    </details>
  );
}

function RunningWorkSummary({
  entries,
  loading,
  busy,
  canControl,
  onNavigate,
  onToggle,
}: {
  entries: RunningWorkEntry[];
  loading: boolean;
  busy: boolean;
  canControl: (entry: RunningWorkEntry) => boolean;
  onNavigate: (entry: WorkNavigationEntry, destination: "project" | "task" | "detail") => void;
  onToggle: (entry: RunningWorkEntry) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const activeCount = entries.filter(
    (entry) => entry.status === "IN_PROGRESS",
  ).length;
  return (
    <details
      open={expanded}
      onToggle={(event) => setExpanded(event.currentTarget.open)}
      className="group min-w-0 overflow-hidden rounded-xl border shadow-sm"
      style={{ borderColor: "var(--border)", background: "var(--surface)" }}
    >
      <summary className="flex min-h-11 min-w-0 cursor-pointer list-none items-center gap-2 px-2.5 [&::-webkit-details-marker]:hidden sm:px-3">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
          style={{
            color: "var(--warning)",
            background:
              "color-mix(in srgb, var(--warning) 12%, var(--surface))",
          }}
        >
          <CircleStop size={15} />
        </span>
        <div className="min-w-0">
          <span className="block truncate text-[11px] font-semibold">
            العمل الجاري الآن
          </span>
          <span className="block truncate text-[9px]" style={{ color: "var(--muted)" }}>
            متابعة الوقت والتحكم في العمل مباشرة
          </span>
        </div>
        <div className="ms-auto flex shrink-0 items-center gap-1">
          {activeCount > 0 && (
            <span className="flex items-center gap-1 rounded-full px-1.5 py-1 text-[9px] font-medium" style={{ color: "var(--success)", background: "color-mix(in srgb, var(--success) 10%, var(--surface))" }}>
              <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: "var(--success)" }} />
              {activeCount} نشط
            </span>
          )}
          <ChevronDown size={13} className="transition-transform group-open:rotate-180" color="var(--muted)" />
        </div>
      </summary>
      {entries.length ? (
        <div
          className="grid max-h-[22rem] min-w-0 grid-cols-1 gap-1.5 overflow-y-auto border-t p-1.5 md:grid-cols-2 2xl:grid-cols-3"
          style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
        >
          {entries.map((entry) => (
            <RunningWorkCard
              key={entry.key}
              entry={entry}
              busy={busy}
              canControl={canControl(entry)}
              onNavigate={onNavigate}
              onToggle={onToggle}
            />
          ))}
        </div>
      ) : (
        <div className="flex min-h-16 items-center justify-center gap-2 border-t px-3 py-3 text-[10px]" style={{ color: "var(--muted)", background: "var(--surface-2)", borderColor: "var(--border)" }}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
          {loading ? "جارٍ التحميل…" : "لا يوجد عمل جارٍ"}
        </div>
      )}
    </details>
  );
}

function RunningWorkCard({
  entry,
  busy,
  canControl,
  onNavigate,
  onToggle,
}: {
  entry: RunningWorkEntry;
  busy: boolean;
  canControl: boolean;
  onNavigate: (entry: WorkNavigationEntry, destination: "project" | "task" | "detail") => void;
  onToggle: (entry: RunningWorkEntry) => void;
}) {
  const deadline = runningWorkDeadline(entry.dueDate);
  return (
    <article
      className="relative min-w-0 overflow-hidden rounded-lg border transition hover:-translate-y-px hover:shadow-sm"
      style={{
        borderColor: "color-mix(in srgb, var(--success) 28%, var(--border))",
        background:
          "linear-gradient(145deg, color-mix(in srgb, var(--surface) 96%, var(--primary)), var(--surface))",
      }}
    >
      <span
        className="absolute inset-x-0 top-0 h-0.5"
        style={{
          background: "linear-gradient(90deg, var(--success), var(--primary))",
        }}
      />
      <div className="p-2 pt-2.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[9px] font-bold"
            style={{
              color: "var(--primary)",
              background:
                "color-mix(in srgb, var(--primary) 12%, var(--surface))",
            }}
          >
            {(entry.employeeName || "م").trim().slice(0, 1)}
          </span>
          <div className="min-w-0 flex-1">
            <span className="block truncate text-[9px] font-semibold">
              {entry.employeeName || "موظف"}
            </span>
          </div>
          <span
            className="flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[8px] font-semibold"
            style={{
              color: "var(--success)",
              background: "color-mix(in srgb, var(--success) 10%, var(--surface))",
            }}
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: "currentColor" }} />
            يعمل الآن
          </span>
        </div>

        <div className="mt-1.5 min-w-0">
          <div className="flex min-w-0 items-center gap-1 text-[8px]" style={{ color: "var(--muted)" }}>
            <button type="button" className="truncate hover:text-brand" onClick={() => onNavigate(entry, "project")}>
              <FullNameTooltip text={entry.projectName} className="block truncate" />
            </button>
            <ChevronLeft size={10} className="shrink-0" />
            <button type="button" className="truncate hover:text-brand" onClick={() => onNavigate(entry, "task")}>
              <FullNameTooltip text={entry.taskTitle} className="block truncate" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => onNavigate(entry, entry.detailId ? "detail" : "task")}
            className="mt-0.5 block w-full truncate text-start text-[11px] font-semibold hover:text-brand"
          >
            <FullNameTooltip text={entry.detailTitle || entry.taskTitle} className="block truncate" />
          </button>
        </div>

        <div className="mt-1.5 grid grid-cols-3 gap-1">
          <WorkMetric icon={<Play size={11} />} label="بدأت" value={shortDateTime(entry.firstStartedAt || entry.startedAt)} />
          <WorkMetric icon={<Clock size={11} />} label="المستغرق" value={<RunningWorkTimer entry={entry} />} accent />
          <WorkMetric icon={<CalendarDays size={11} />} label="الموعد" value={deadline.label} danger={deadline.danger} />
        </div>

        <div className="mt-1.5 flex items-center gap-1.5">
          <div className="min-w-0 flex-1">
            <div className="mb-0.5 flex items-center justify-between text-[7px]" style={{ color: "var(--muted)" }}>
              <span>إنجاز التفصيل</span>
              <span>{entry.progress}%</span>
            </div>
            <Progress value={entry.progress} danger={deadline.danger} />
          </div>
          {entry.plannedDurationDays ? (
            <span className="shrink-0 rounded px-1 py-0.5 text-[7px]" style={{ color: "var(--muted)", background: "var(--surface-3)" }}>
              مخطط: {entry.plannedDurationDays} يوم
            </span>
          ) : null}
        </div>

        <div className="mt-1.5 flex items-center gap-1 border-t pt-1.5" style={{ borderColor: "var(--border)" }}>
          <button type="button" className="btn h-6 min-w-0 flex-1 gap-1 px-1.5 text-[8px]" onClick={() => onNavigate(entry, entry.detailId ? "detail" : "task")}>
            <ExternalLink size={11} /> فتح التفاصيل
          </button>
          {canControl && (
            <button
              type="button"
              className="btn h-6 shrink-0 gap-1 px-1.5 text-[8px]"
              disabled={busy}
              onClick={() => onToggle(entry)}
            >
              {busy ? <Loader2 size={11} className="animate-spin" /> : <Pause size={11} />}
              إيقاف مؤقت
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function WorkMetric({
  icon,
  label,
  value,
  accent = false,
  danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  accent?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-md border px-1 py-1" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
      <span className="flex items-center gap-0.5 text-[7px]" style={{ color: danger ? "var(--danger)" : accent ? "var(--success)" : "var(--muted)" }}>
        {icon}{label}
      </span>
      <span className="block truncate text-[8px] font-semibold" style={{ color: danger ? "var(--danger)" : "var(--text)" }}>
        {value}
      </span>
    </div>
  );
}

function RunningWorkTimer({ entry }: { entry: RunningWorkEntry }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (entry.status !== "IN_PROGRESS" || !entry.startedAt) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [entry.status, entry.startedAt]);
  const seconds = Math.max(
    0,
    entry.elapsedSeconds +
      (entry.status === "IN_PROGRESS" && entry.startedAt
        ? Math.floor((now - new Date(entry.startedAt).getTime()) / 1000)
        : 0),
  );
  return <span dir="rtl">{formatDuration(seconds)}</span>;
}

function runningWorkDeadline(value?: string | null) {
  if (!value) return { label: "بدون موعد", danger: false };
  const due = new Date(value);
  const today = new Date();
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const days = Math.round((dueDay.getTime() - todayDay.getTime()) / 86_400_000);
  if (days < 0) return { label: `متأخر ${Math.abs(days)} يوم`, danger: true };
  if (days === 0) return { label: "اليوم", danger: false };
  if (days === 1) return { label: "غدًا", danger: false };
  return { label: `${shortDate(value)} · ${days} يوم`, danger: false };
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
  canReceive,
  received,
  busy,
  onSelect,
  onReceive,
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
  canReceive: boolean;
  received: boolean;
  busy: boolean;
  onSelect: () => void;
  onReceive: () => void;
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
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect();
          }
        }}
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
          <TranslatableText text={task.title} compact className="flex w-full" textClassName="line-clamp-2" />
          <span
            className="mt-0.5 flex items-center gap-1 text-[9px] font-normal"
            style={{
              color:
                task.priority === "URGENT" ? "var(--danger)" : "var(--muted)",
            }}
          >
            {priorityLabel[task.priority]}
            {received && <span className="flex items-center gap-0.5 font-medium" style={{ color: "var(--success)" }}><CheckCircle2 size={10} />تم الاستلام</span>}
            {task.durationDays ? <><span>·</span><span>{task.durationDays} أيام</span></> : null}
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
      </div>
      {selected && task.description && (
        <div className="mx-2.5 border-t py-1.5" style={{ borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)" }}>
          <TranslatableText text={task.description} multiline className="w-full text-[10px] leading-5" />
        </div>
      )}
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
          {canReceive && !received && <button type="button" className="btn h-6 shrink-0 gap-1 px-2 text-[10px]" disabled={busy} onClick={onReceive}><Check size={11} />استلام</button>}
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
  canPause,
  busy,
  onSelect,
  onEdit,
  onStart,
  onPause,
  onFinish,
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
  canPause: boolean;
  busy: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onStart: () => void;
  onPause: () => void;
  onFinish: () => void;
  onDelete: () => void;
  dragging: boolean;
  onDragStart: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  onDrop: (event: React.DragEvent<HTMLDivElement>) => void;
}) {
  const canResume = subtask.manualStatus === "PAUSED";
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
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect();
          }
        }}
        className="flex w-full items-start gap-2 px-2.5 py-2 text-start outline-none hover:bg-[var(--surface-2)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
      >
        <span
          className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
          style={{ background: statusColor(subtask.derivedStatus) }}
        />
        {canManage && <GripVertical className="shrink-0 cursor-grab" size={14} color="var(--muted)" />}
        <span className="min-w-0 flex-1 text-xs font-medium leading-5">
          <TranslatableText text={subtask.title} compact className="flex w-full" textClassName="block truncate" />
          {subtask.durationDays ? <span className="mt-0.5 block text-[9px] font-normal" style={{ color: "var(--muted)" }}>{subtask.durationDays} أيام</span> : null}
          <Progress value={subtask.progress} className="mt-1" />
        </span>
        <span className="text-[10px]" style={{ color: "var(--muted)" }}>
          {subtask.completedItems}/{subtask.items.length}
        </span>
      </div>
      {selected && (canManage || canWork) && (
        <div
          className="mx-2.5 flex flex-wrap justify-end gap-0.5 border-t py-1.5"
          style={{
            borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)",
          }}
        >
          {subtask.manualStatus !== "IN_PROGRESS" && subtask.progress < 100 && <button type="button" className="btn h-6 gap-1 px-2 text-[10px]" disabled={busy} onClick={onStart}>{canResume ? <Play size={11} /> : null}{canResume ? "استئناف" : "بدء"}</button>}
          {(subtask.manualStatus === "IN_PROGRESS" || subtask.manualStatus === "PAUSED" || Boolean(subtask.elapsedSeconds)) && <StageTimer startedAt={subtask.startedAt} elapsedSeconds={subtask.elapsedSeconds || 0} />}
          {subtask.manualStatus === "IN_PROGRESS" && canPause && <button type="button" className="btn h-6 gap-1 px-2 text-[10px]" disabled={busy} onClick={onPause}><Pause size={11} />إيقاف مؤقت</button>}
          {subtask.manualStatus === "IN_PROGRESS" && canPause && <button type="button" className="btn h-6 gap-1 px-2 text-[10px]" disabled={busy} onClick={onFinish}><CheckCircle2 size={11} />إنهاء</button>}
          {canManage && <><MiniButton label="تعديل التفاصيل" disabled={busy} onClick={onEdit}><Edit3 size={11} /></MiniButton><MiniButton label="حذف التفاصيل" disabled={busy} danger onClick={onDelete}><Trash2 size={11} /></MiniButton></>}
        </div>
      )}
    </div>
  );
}

function StageTimer({ startedAt, elapsedSeconds }: { startedAt?: string | null; elapsedSeconds: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const interval = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(interval); }, []);
  const seconds = Math.max(0, elapsedSeconds + (startedAt ? Math.floor((now - new Date(startedAt).getTime()) / 1000) : 0));
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
  active,
  expanded,
  collapsed,
  onToggleExpand,
  title,
  count,
  onAdd,
  className,
  children,
}: {
  index: number;
  active: boolean;
  expanded: boolean;
  collapsed: boolean;
  onToggleExpand: () => void;
  title: string;
  count: number;
  onAdd?: () => void;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <article
      className={`project-column h-[calc(100dvh-154px)] min-h-[520px] min-w-0 flex-col overflow-hidden rounded-lg border transition-[border-color,box-shadow] md:h-[500px] md:min-h-0 lg:h-[540px] 2xl:h-[calc(100dvh-152px)] 2xl:min-h-[560px] ${expanded ? "project-column-expanded" : ""} ${collapsed ? "project-column-collapsed" : ""} ${className}`}
      style={{ borderColor: active ? "color-mix(in srgb, var(--primary) 36%, var(--border))" : "var(--border)", background: "var(--surface)", boxShadow: active ? "0 0 0 1px color-mix(in srgb, var(--primary) 8%, transparent)" : "none" }}
    >
      <header
        className="project-column-header flex h-10 shrink-0 items-center gap-0.5 border-b px-2"
        style={{ borderColor: "var(--border)", background: active ? "color-mix(in srgb, var(--primary) 4%, var(--surface))" : "var(--surface)" }}
      >
        <span
          className="me-1 flex h-5 w-5 items-center justify-center rounded-md text-[9px] font-semibold"
          style={{ background: active ? "var(--primary)" : "var(--surface-3)", color: active ? "white" : "var(--muted)" }}
        >
          {index}
        </span>
        <h3 className={`project-column-title min-w-0 truncate text-xs ${active ? "font-semibold" : "font-medium"}`}>{title}</h3>
        <span
          className="project-column-count ms-1 shrink-0 rounded-full px-1.5 py-0.5 text-[9px]"
          style={{ color: "var(--muted)", background: "var(--surface-2)" }}
        >
          {count}
        </span>
        <button
          type="button"
          className="btn-ghost ms-auto h-7 w-7 shrink-0"
          onClick={onToggleExpand}
          title={expanded ? `إرجاع ${title} إلى الحجم السابق` : `توسيع ${title} على كامل العرض`}
          aria-label={expanded ? `إرجاع ${title} إلى الحجم السابق` : `توسيع ${title} على كامل العرض`}
          aria-pressed={expanded}
        >
          {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
        {onAdd && (
          <button
            className="project-column-add btn-ghost h-7 w-7 shrink-0"
            onClick={onAdd}
            aria-label={`إضافة في ${title}`}
          >
            <Plus size={14} color="#7a2838" />
          </button>
        )}
      </header>
      <div className="project-column-body min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
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
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect();
          }
        }}
        aria-pressed={selected}
        className="block w-full px-2.5 py-2 text-start outline-none transition-colors hover:bg-[var(--surface-2)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
      >
        <span className="flex items-center gap-2">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ background: companyMeta(project.company).color }}
          />
          {canManage && <GripVertical className="shrink-0 cursor-grab" size={14} color="var(--muted)" />}
          <span className="min-w-0 flex-1">
            <TranslatableText
              text={project.name}
              compact
              className="flex w-full"
              textClassName="block truncate text-xs font-medium"
            />
          </span>
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
      </div>
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
function QuickAddInput({
  placeholder,
  busy,
  onAdd,
}: {
  placeholder: string;
  busy: boolean;
  onAdd: (text: string) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const value = text.trim();
    if (!value || busy) return;
    try {
      await onAdd(value);
      setText("");
    } catch {
      // Keep the text available so the user can correct or retry it.
    } finally {
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  };
  return (
    <form onSubmit={(event) => void submit(event)} className="flex gap-1 border-b p-1.5" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
      <input
        ref={inputRef}
        className="field h-7 min-w-0 flex-1 px-2 text-[10px]"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={placeholder}
        disabled={busy}
      />
      <button type="submit" className="btn-primary h-7 shrink-0 px-2 text-[9px]" disabled={busy || !text.trim()}>
        {busy ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
        إضافة
      </button>
    </form>
  );
}

function AddItem({ onAdd }: { onAdd: (text: string) => Promise<void> }) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const submit = async () => {
    if (!text.trim()) return;
    const value = text.trim();
    try {
      await onAdd(value);
      setText("");
    } finally {
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  };
  return (
    <div
      className="flex gap-1 border-b p-1.5"
      style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
    >
      <input
        ref={inputRef}
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
  item,
  deliveries,
  memberMap,
  canSubmit,
  canManage,
  currentUserId,
  busy,
  onDelete,
  onSubmit,
}: {
  item: ItemNode | null;
  deliveries: DeliveryNode[];
  memberMap: Map<string, Employee>;
  canSubmit: boolean;
  canManage: boolean;
  currentUserId: string;
  busy: boolean;
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
  const [composerMode, setComposerMode] = useState<"text" | "files" | "audio" | "link">("text");
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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
      setComposerMode("text");
      setUploadProgress(0);
      clearRecordedAudio(false);
      window.setTimeout(() => textareaRef.current?.focus(), 0);
    } catch {
      setUploadProgress(0);
    }
  }

  return (
    <div className="flex min-h-full flex-col">
      <div
        className="order-2 min-h-0 flex-1 space-y-2 overflow-y-auto p-2.5"
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
            text="لا توجد تسليمات بعد"
          />
        )}
      </div>

      {canSubmit && (
        <div
          className="order-1 shrink-0 border-b p-2"
          style={{
            borderColor: "var(--border)",
            background: "color-mix(in srgb, var(--primary) 3%, var(--surface))",
          }}
        >
          <div
            className="mb-2 grid grid-cols-2 gap-1 sm:grid-cols-4"
            role="toolbar"
            aria-label="أدوات إنشاء التسليم"
          >
            <button
              type="button"
              className={`btn h-8 min-w-0 gap-1 px-2 text-[9px] ${composerMode === "text" ? "chip-active" : ""}`}
              onClick={() => {
                setComposerMode("text");
                window.setTimeout(() => textareaRef.current?.focus(), 0);
              }}
              aria-pressed={composerMode === "text"}
            >
              <MessageSquare size={13} />
              <span className="truncate">رسالة نصية</span>
            </button>
            <button
              type="button"
              className={`btn h-8 min-w-0 gap-1 px-2 text-[9px] ${composerMode === "files" ? "chip-active" : ""}`}
              disabled={recording}
              onClick={() => {
                setComposerMode("files");
                fileInputRef.current?.click();
              }}
              aria-pressed={composerMode === "files"}
            >
              <Paperclip size={13} />
              <span className="truncate">إرفاق مرفقات</span>
            </button>
            <button
              type="button"
              className={`btn h-8 min-w-0 gap-1 px-2 text-[9px] ${composerMode === "audio" || recording || recordedAudio ? "chip-active" : ""}`}
              onClick={() => {
                setComposerMode("audio");
                recording ? stopRecording() : void startRecording();
              }}
              aria-pressed={composerMode === "audio" || recording || Boolean(recordedAudio)}
              style={recording ? { color: "var(--danger)", background: "var(--danger-soft)" } : undefined}
            >
              {recording ? <CircleStop size={13} /> : <Mic size={13} />}
              <span className="truncate">{recording ? "إيقاف التسجيل" : "تسجيل صوتي"}</span>
            </button>
            <button
              type="button"
              className={`btn h-8 min-w-0 gap-1 px-2 text-[9px] ${composerMode === "link" || showLink ? "chip-active" : ""}`}
              disabled={recording}
              onClick={() => {
                setShowLink((current) => {
                  setComposerMode(current ? "text" : "link");
                  return !current;
                });
              }}
              aria-pressed={showLink}
            >
              <Link2 size={13} />
              <span className="truncate">رابط</span>
            </button>
          </div>
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
          <textarea
            ref={textareaRef}
            className="field min-h-[72px] resize-none rounded-xl border-0 py-2.5 text-xs shadow-sm ring-1 ring-[var(--border)] focus:ring-2 focus:ring-[var(--primary)]"
            value={text}
            onChange={(event) => setText(event.target.value)}
            onFocus={() => setComposerMode("text")}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                if (!busy && !recording) void submit();
              }
            }}
            onPaste={(event) => {
              const pasted = Array.from(event.clipboardData.files);
              if (pasted.length) addFiles(pasted);
            }}
            placeholder="اكتب رسالة أو تفاصيل التسليم…"
            aria-label="وصف الإنجاز أو ملاحظات التسليم"
          />

          {(composerMode === "files" || composerMode === "audio" || recording || recordedAudio || files.length > 0) && (
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
            {composerMode === "files" && <button
              type="button"
              className="flex w-full items-center justify-center gap-1.5 py-1 text-[8px]"
              style={{ color: "var(--muted)" }}
              disabled={recording}
              onClick={() => {
                setComposerMode("files");
                fileInputRef.current?.click();
              }}
            >
              <Paperclip size={12} />
              اسحب وأفلت هنا أو اضغط للاختيار · 6 ملفات · 50MB للملف
            </button>}
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
          )}
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
            <FullNameTooltip
              text={authorName}
              className="min-w-0 flex-1 truncate text-[10px] font-medium"
            />
            <time
              className="shrink-0 text-[8px]"
              style={{ color: "var(--muted)" }}
            >
              {new Intl.DateTimeFormat(intlLocale(), {
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
              className="mt-0.5 inline-flex max-w-full rounded px-1.5 py-0.5 text-[8px]"
              style={{ background: "var(--primary-soft)", color: "var(--primary)" }}
            >
              <TranslatableText text={itemName || "بند تنفيذ"} compact className="flex max-w-full" textClassName="truncate" />
            </span>
          )}
        </div>
      </div>
      {delivery.text && (
        <TranslatableText
          text={delivery.text}
          compact
          multiline
          className="mt-1.5 w-full items-start text-[10px] leading-5"
          textClassName="whitespace-pre-wrap break-words"
        />
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
  const totalSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} س`);
  if (minutes > 0 || hours > 0)
    parts.push(`${hours > 0 ? String(minutes).padStart(2, "0") : minutes} د`);
  parts.push(
    `${minutes > 0 || hours > 0 ? String(remainingSeconds).padStart(2, "0") : remainingSeconds} ث`,
  );
  return parts.join(" ");
}

function ProjectModal({
  open,
  onClose,
  project,
  employees,
  fixedMemberId,
  allowedCompanies,
  busy,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  project: WorkspaceProject | null;
  employees: Employee[];
  fixedMemberId?: string;
  allowedCompanies: CompanyKey[];
  busy: boolean;
  onSave: (draft: ProjectDraft) => Promise<void>;
}) {
  const [company, setCompany] = useState<CompanyKey>(allowedCompanies[0]);
  const [name, setName] = useState("");
  const [durationDays, setDurationDays] = useState<number | null>(null);
  const [dueDate, setDueDate] = useState("");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [formError, setFormError] = useState("");
  useEffect(() => {
    if (!open) return;
    setCompany(project?.company || allowedCompanies[0]);
    setName(project?.name || "");
    setDurationDays(project?.durationDays ?? null);
    setDueDate(project?.dueDate || "");
    setMemberIds(project?.memberIds || (fixedMemberId ? [fixedMemberId] : []));
    setDescription(project?.description || "");
    setStartDate(project?.startDate || new Date().toISOString().slice(0, 10));
    setFormError("");
  }, [open, project, allowedCompanies, fixedMemberId]);
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
      durationDays,
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
          <label>
            <span className="label">مدة المشروع بالأيام</span>
            <input
              className="field h-9"
              type="number"
              min={1}
              step={1}
              value={durationDays ?? ""}
              onChange={(event) => setDurationDays(event.target.value ? Number(event.target.value) : null)}
              placeholder="مثال: 30"
            />
          </label>
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
                    disabled={employee.id === fixedMemberId}
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
  const [durationDays, setDurationDays] = useState<number | null>(null);
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
      setDurationDays(task?.durationDays ?? null);
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
      durationDays,
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

          <label>
            <span className="label">مدة المهمة بالأيام</span>
            <input className="field" type="number" min={1} step={1} value={durationDays ?? ""} onChange={(event) => setDurationDays(event.target.value ? Number(event.target.value) : null)} placeholder="مثال: 5" />
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


function ExecutionItemModal({
  open,
  onClose,
  item,
  subtaskTitle,
  busy,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  item: ItemNode | null;
  subtaskTitle: string;
  busy: boolean;
  onSave: (payload: ItemDraft) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [durationDays, setDurationDays] = useState<number | null>(null);
  useEffect(() => {
    if (!open) return;
    setText(item?.text || "");
    setDurationDays(item?.durationDays ?? null);
  }, [open, item]);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!text.trim()) return;
    await onSave({ text: text.trim(), durationDays });
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={item ? "تعديل بند التنفيذ" : "إضافة بند تنفيذ"}
      subtitle={`ضمن المرحلة: ${subtaskTitle}`}
      maxWidth="max-w-xl"
    >
      <form onSubmit={(event) => void submit(event)}>
        <div className="space-y-3 p-4">
          <label>
            <span className="label">اسم بند التنفيذ *</span>
            <input autoFocus className="field" value={text} onChange={(event) => setText(event.target.value)} required />
          </label>
          <label>
            <span className="label">مدة التنفيذ بالأيام</span>
            <input className="field" type="number" min={1} step={1} value={durationDays ?? ""} onChange={(event) => setDurationDays(event.target.value ? Number(event.target.value) : null)} placeholder="مثال: 2" />
          </label>
        </div>
        <ModalFooter busy={busy} onClose={onClose} disabled={!text.trim()} submitLabel={item ? "حفظ التعديلات" : "إضافة بند التنفيذ"} />
      </form>
    </Modal>
  );
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
  const [durationDays, setDurationDays] = useState<number | null>(null);
  const [items, setItems] = useState("");
  const [manualStatus, setManualStatus] = useState<WorkStatus>("NOT_STARTED");
  useEffect(() => {
    if (open) {
      setTitle(subtask?.title || "");
      setDurationDays(subtask?.durationDays ?? null);
      setItems("");
      setManualStatus(subtask?.manualStatus || "NOT_STARTED");
    }
  }, [open, subtask]);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    await onSave({
      title: title.trim(),
      durationDays,
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
          <label>
            <span className="label">مدة المرحلة بالأيام</span>
            <input className="field" type="number" min={1} step={1} value={durationDays ?? ""} onChange={(event) => setDurationDays(event.target.value ? Number(event.target.value) : null)} placeholder="مثال: 3" />
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

