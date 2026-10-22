export enum Phase {
  WEEK_BEFORE = "Organizar",
  AFTERNOON_BEFORE = "Esa tarde",
  DURING = "Durante el Thinkglao",
  POST_EVENT = "Fin",
}

export enum Role {
  AMBASSADOR = "Embajador",
  VOLUNTEER_SUPPORT = "Voluntario Apoyo",
  VOLUNTEER_QR = "Voluntario QR",
  VOLUNTEER_CONTENT = "Voluntario Contenido",
  VOLUNTEER_LOGISTICS = "Voluntario Logística",
  VOLUNTEER_3 = "Voluntario 3",
  VOLUNTEER_MAT = "Responsable Material",
  ALL = "Todos",
  UNASSIGNED = "Sin asignar",
}

export interface Task {
  id: string;
  title: string;
  phase: Phase;
  originalRole: string; // The role defined in the prompt text
  assignedTo: string; // The actual person assigned in the app
  isDone: boolean;
  notes: string[];
  isImportant?: boolean; // For key risks or critical steps
  time?: string;
  aiAdvice?: string; // Cache for AI response
}

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
}

export interface AppState {
  tasks: Task[];
  filterPhase: Phase | "ALL";
  filterAssignee: string | "ALL";
  showPendingOnly: boolean;
}

export type ViewMode = "DASHBOARD" | "WORKFLOW" | "TEAM";
