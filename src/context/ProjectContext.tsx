import { createContext, useContext, useReducer, useCallback, useEffect, type ReactNode, type Dispatch } from 'react';
import type { Project, ProjectSettings, Board, ComponentInstance, Automation } from '../types';

// ── Default state ──

const defaultSettings: ProjectSettings = {
  name: 'my-esp-device',
  friendlyName: 'My ESP Device',
  wifiSsid: '',
  wifiPassword: '',
  useSecretsWifi: false,
  useSecretsApi: false,
  useSecretsOta: false,
  useSecretsMqtt: false,
  staticIpEnabled: false,
  staticIp: '',
  gateway: '',
  subnet: '255.255.255.0',
  dns: '',
  useAddress: '',
  apiEnabled: true,
  apiKey: '',
  otaEnabled: true,
  otaPassword: '',
  mqttEnabled: false,
  mqttBroker: '',
  mqttPort: 1883,
  mqttUsername: '',
  mqttPassword: '',
  webServerEnabled: false,
  webServerPort: 80,
  loggerEnabled: true,
  loggerLevel: 'DEBUG',
  espFramework: 'arduino',
  captivePortalEnabled: true,
  fallbackApEnabled: true,
  fallbackApSsid: '',
  fallbackApPassword: '',
  useSecretsFallbackApSsid: false,
  useSecretsFallbackApPassword: false,
  statusLedPin: '',
  timeEnabled: false,
  timeTimezone: '',
  timeServers: '',
};

const STORAGE_KEY = 'espforge_autosave';

function loadFromStorage(): Project | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Project;
  } catch {
    return null;
  }
}

const initialProject: Project = {
  board: null,
  settings: defaultSettings,
  components: [],
  automations: [],
};

// ── Actions ──

type Action =
  | { type: 'SET_BOARD'; board: Board }
  | { type: 'RESET_PROJECT' }
  | { type: 'UPDATE_SETTINGS'; settings: Partial<ProjectSettings> }
  | { type: 'ADD_COMPONENT'; component: ComponentInstance }
  | { type: 'UPDATE_COMPONENT'; id: string; changes: Partial<ComponentInstance> }
  | { type: 'REMOVE_COMPONENT'; id: string }
  | { type: 'MOVE_COMPONENT'; id: string; direction: 'up' | 'down' }
  | { type: 'ADD_AUTOMATION'; automation: Automation }
  | { type: 'UPDATE_AUTOMATION'; id: string; automation: Automation }
  | { type: 'REMOVE_AUTOMATION'; id: string }
  | { type: 'LOAD_PROJECT'; project: Project };

function projectReducer(state: Project, action: Action): Project {
  switch (action.type) {
    case 'SET_BOARD':
      return {
        ...state,
        board: action.board,
        components: (action.board.defaultComponents ?? []).map((dc) => ({
          ...dc,
          id: generateId('comp'),
        })),
        automations: [],
      };

    case 'RESET_PROJECT':
      return initialProject;

    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.settings } };

    case 'ADD_COMPONENT':
      return { ...state, components: [...state.components, action.component] };

    case 'UPDATE_COMPONENT':
      return {
        ...state,
        components: state.components.map((c) =>
          c.id === action.id ? { ...c, ...action.changes } : c,
        ),
      };

    case 'REMOVE_COMPONENT': {
      const removedId = action.id;
      return {
        ...state,
        components: state.components.filter((c) => c.id !== removedId),
        automations: state.automations.filter(
          (a) => a.trigger.componentId !== removedId &&
            !a.actions.some((act) => act.config.targetId === removedId),
        ),
      };
    }

    case 'MOVE_COMPONENT': {
      const idx = state.components.findIndex((c) => c.id === action.id);
      if (idx === -1) return state;
      const newIdx = action.direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= state.components.length) return state;
      const arr = [...state.components];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return { ...state, components: arr };
    }

    case 'ADD_AUTOMATION':
      return { ...state, automations: [...state.automations, action.automation] };

    case 'UPDATE_AUTOMATION':
      return {
        ...state,
        automations: state.automations.map((a) =>
          a.id === action.id ? action.automation : a,
        ),
      };

    case 'REMOVE_AUTOMATION':
      return { ...state, automations: state.automations.filter((a) => a.id !== action.id) };

    case 'LOAD_PROJECT': {
      const maxId = action.project.components.reduce((max, c) => {
        const match = c.id.match(/_(\d+)$/);
        return match ? Math.max(max, Number(match[1])) : max;
      }, 0);
      _nextId = maxId + 1;
      return action.project;
    }

    default:
      return state;
  }
}

// ── Undo / Redo ──

const MAX_HISTORY = 50;

interface HistoryState {
  past: Project[];
  present: Project;
  future: Project[];
}

type HistoryAction =
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'PROJECT_ACTION'; action: Action };

function historyReducer(state: HistoryState, histAction: HistoryAction): HistoryState {
  switch (histAction.type) {
    case 'UNDO': {
      if (state.past.length === 0) return state;
      const prev = state.past[state.past.length - 1];
      return {
        past: state.past.slice(0, -1),
        present: prev,
        future: [state.present, ...state.future],
      };
    }
    case 'REDO': {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      return {
        past: [...state.past, state.present],
        present: next,
        future: state.future.slice(1),
      };
    }
    case 'PROJECT_ACTION': {
      const newPresent = projectReducer(state.present, histAction.action);
      if (newPresent === state.present) return state;
      // Don't push settings changes to undo stack (too noisy from typing)
      if (histAction.action.type === 'UPDATE_SETTINGS') {
        return { ...state, present: newPresent };
      }
      return {
        past: [...state.past.slice(-(MAX_HISTORY - 1)), state.present],
        present: newPresent,
        future: [],
      };
    }
    default:
      return state;
  }
}

// ── Context ──

interface ProjectContextValue {
  project: Project;
  dispatch: Dispatch<Action>;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ children }: { children: ReactNode }) {
  // Load from localStorage on first render, but only if no share link in URL
  const hasShareLink = window.location.hash.startsWith('#project=');
  const savedProject = !hasShareLink ? loadFromStorage() : null;

  const [historyState, historyDispatch] = useReducer(historyReducer, {
    past: [],
    present: savedProject ?? initialProject,
    future: [],
  });

  // Auto-save to localStorage whenever the project changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(historyState.present));
    } catch {
      // storage quota exceeded — ignore
    }
  }, [historyState.present]);

  const dispatch = useCallback((action: Action) => {
    historyDispatch({ type: 'PROJECT_ACTION', action });
  }, []);

  const undo = useCallback(() => historyDispatch({ type: 'UNDO' }), []);
  const redo = useCallback(() => historyDispatch({ type: 'REDO' }), []);

  return (
    <ProjectContext.Provider value={{
      project: historyState.present,
      dispatch,
      undo,
      redo,
      canUndo: historyState.past.length > 0,
      canRedo: historyState.future.length > 0,
    }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject(): ProjectContextValue {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProject must be used within ProjectProvider');
  return ctx;
}

// ── Helpers ──

let _nextId = 1;
export function generateId(prefix: string): string {
  return `${prefix}_${_nextId++}`;
}
