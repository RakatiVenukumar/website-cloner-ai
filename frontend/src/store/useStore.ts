import { create } from "zustand";

export interface TextBlock {
  id: string;
  project_id: string;
  section: string;
  selector: string;
  key: string;
  tag_type: string;
  original_value: string;
  current_value: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  original_url: string;
  preview_port: number | null;
  preview_status: string;
  status: string;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  text_blocks?: TextBlock[];
}

export interface Deployment {
  id: string;
  project_id: string;
  platform: string;
  deployment_url: string;
  status: string;
  created_at: string;
}

interface StoreState {
  projects: Project[];
  currentProject: Project | null;
  isLoadingProjects: boolean;
  isCloning: boolean;
  cloningError: string | null;
  apiBase: string;

  fetchProjects: () => Promise<void>;
  fetchProjectDetails: (id: string) => Promise<Project | null>;
  createProject: (url: string, name?: string) => Promise<Project | null>;
  deleteProject: (id: string) => Promise<void>;
  updateBlockContent: (projectId: string, key: string, value: string) => Promise<void>;
  startPreview: (projectId: string) => Promise<number | null>;
  stopPreview: (projectId: string) => Promise<void>;
  deployProject: (projectId: string, platform: string) => Promise<Deployment | null>;
}

export const useStore = create<StoreState>((set, get) => ({
  projects: [],
  currentProject: null,
  isLoadingProjects: false,
  isCloning: false,
  cloningError: null,
  apiBase: "http://localhost:8000",

  fetchProjects: async () => {
    set({ isLoadingProjects: true });
    try {
      const res = await fetch(`${get().apiBase}/api/projects`);
      if (res.ok) {
        const data = await res.json();
        set({ projects: data });
      }
    } catch (e) {
      console.error("Failed to fetch projects:", e);
    } finally {
      set({ isLoadingProjects: false });
    }
  },

  fetchProjectDetails: async (id: string) => {
    try {
      const res = await fetch(`${get().apiBase}/api/projects/${id}`);
      if (res.ok) {
        const data = await res.json();
        set({ currentProject: data });
        return data;
      }
    } catch (e) {
      console.error(`Failed to fetch project details for ${id}:`, e);
    }
    return null;
  },

  createProject: async (url: string, name?: string) => {
    set({ isCloning: true, cloningError: null });
    try {
      const res = await fetch(`${get().apiBase}/api/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, name }),
      });
      if (res.ok) {
        const data = await res.json();
        set((state) => ({ projects: [data, ...state.projects] }));
        return data;
      } else {
        const errData = await res.json();
        set({ cloningError: errData.detail || "Failed to clone website" });
      }
    } catch (e) {
      set({ cloningError: "Network connection to backend failed" });
      console.error("Failed to create project:", e);
    } finally {
      set({ isCloning: false });
    }
    return null;
  },

  deleteProject: async (id: string) => {
    try {
      const res = await fetch(`${get().apiBase}/api/projects/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          currentProject: state.currentProject?.id === id ? null : state.currentProject,
        }));
      }
    } catch (e) {
      console.error(`Failed to delete project ${id}:`, e);
    }
  },

  updateBlockContent: async (projectId: string, key: string, value: string) => {
    // Optimistic UI updates in global store
    const current = get().currentProject;
    if (current && current.id === projectId && current.text_blocks) {
      const updatedBlocks = current.text_blocks.map((tb) =>
        tb.key === key ? { ...tb, current_value: value } : tb
      );
      set({ currentProject: { ...current, text_blocks: updatedBlocks } });
    }

    try {
      await fetch(`${get().apiBase}/api/projects/${projectId}/content`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates: { [key]: value } }),
      });
    } catch (e) {
      console.error("Failed to update content on backend:", e);
    }
  },

  startPreview: async (projectId: string) => {
    try {
      const res = await fetch(`${get().apiBase}/api/projects/${projectId}/preview/start`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        const current = get().currentProject;
        if (current && current.id === projectId) {
          set({
            currentProject: {
              ...current,
              preview_status: "running",
              preview_port: data.port,
            },
          });
        }
        return data.port;
      }
    } catch (e) {
      console.error(`Failed to start preview server for ${projectId}:`, e);
    }
    return null;
  },

  stopPreview: async (projectId: string) => {
    try {
      const res = await fetch(`${get().apiBase}/api/projects/${projectId}/preview/stop`, {
        method: "POST",
      });
      if (res.ok) {
        const current = get().currentProject;
        if (current && current.id === projectId) {
          set({
            currentProject: {
              ...current,
              preview_status: "stopped",
            },
          });
        }
      }
    } catch (e) {
      console.error(`Failed to stop preview server for ${projectId}:`, e);
    }
  },

  deployProject: async (projectId: string, platform: string) => {
    try {
      const res = await fetch(`${get().apiBase}/api/projects/${projectId}/deploy?platform=${platform}`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        return data;
      }
    } catch (e) {
      console.error(`Failed to deploy project ${projectId} to ${platform}:`, e);
    }
    return null;
  },
}));
