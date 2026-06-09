"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore, Project } from "@/store/useStore";
import { Globe, Trash2, ExternalLink, Calendar, Plus, RefreshCw, AlertCircle } from "lucide-react";

export default function Dashboard() {
  const router = useRouter();
  const { projects, isLoadingProjects, fetchProjects, deleteProject } = useStore();

  useEffect(() => {
    fetchProjects();
    // Poll project status periodically to update compiling progress
    const interval = setInterval(fetchProjects, 5000);
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ready":
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Ready</span>;
      case "failed":
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-red-500/10 text-red-400 border border-red-500/20">Failed</span>;
      case "pending":
      case "cloning":
      case "analyzing":
      case "generating":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <RefreshCw className="h-3 w-3 animate-spin" />
            <span className="capitalize">{status}</span>
          </span>
        );
      default:
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-zinc-800 text-zinc-400">{status}</span>;
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Header */}
      <header className="w-full border-b border-zinc-900 bg-zinc-900/10 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div 
            onClick={() => router.push("/")}
            className="flex items-center gap-2 font-semibold text-lg cursor-pointer tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400"
          >
            <Globe className="h-5 w-5 text-purple-400" />
            <span>Website Cloner AI</span>
          </div>
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-white transition-all shadow-md active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Clone New URL</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-7xl mx-auto px-6 py-10 w-full">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Your Cloned Projects</h1>
              <p className="text-sm text-zinc-500 mt-1">Manage and edit your cloned web workspaces.</p>
            </div>
            <button 
              onClick={() => fetchProjects()}
              disabled={isLoadingProjects}
              className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingProjects ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {projects.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center text-center p-16 rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/10">
              <div className="h-12 w-12 rounded-full bg-zinc-900 flex items-center justify-center mb-4 border border-zinc-800">
                <Globe className="h-6 w-6 text-zinc-500" />
              </div>
              <h3 className="text-base font-semibold mb-1">No Projects Cloned Yet</h3>
              <p className="text-xs text-zinc-500 max-w-xs mb-6">Enter a web URL on the home screen to launch your first website clone.</p>
              <button
                onClick={() => router.push("/")}
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-xs font-medium hover:from-purple-600 hover:to-pink-600 transition-colors shadow-lg hover:shadow-purple-500/20"
              >
                Get Started
              </button>
            </div>
          ) : (
            /* Projects Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project: Project) => (
                <div 
                  key={project.id}
                  className="flex flex-col justify-between rounded-xl border border-zinc-900 bg-zinc-900/20 backdrop-blur-xl p-5 hover:border-zinc-800 hover:shadow-xl hover:shadow-black/40 transition-all group"
                >
                  <div className="flex flex-col gap-4">
                    {/* Header line */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-zinc-100 group-hover:text-purple-400 transition-colors truncate">
                          {project.name}
                        </h3>
                        <a 
                          href={project.original_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-400 mt-1 max-w-full"
                        >
                          <span className="truncate max-w-[200px]">{project.original_url}</span>
                          <ExternalLink className="h-2.5 w-2.5 flex-shrink-0" />
                        </a>
                      </div>
                      <div className="flex-shrink-0">
                        {getStatusBadge(project.status)}
                      </div>
                    </div>

                    {/* Meta info */}
                    <div className="flex items-center gap-3 text-xs text-zinc-500 border-t border-zinc-900/60 pt-3">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(project.created_at)}</span>
                      </span>
                    </div>

                    {project.status === "failed" && project.error_message && (
                      <div className="flex gap-2 items-start p-2.5 bg-red-950/20 border border-red-900/30 rounded-lg text-xs text-red-400">
                        <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                        <span className="truncate">{project.error_message}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions footer */}
                  <div className="flex items-center justify-between gap-4 mt-6 border-t border-zinc-900/60 pt-3">
                    <button
                      onClick={() => deleteProject(project.id)}
                      className="p-2 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                      title="Delete Project"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>

                    <button
                      disabled={project.status !== "ready"}
                      onClick={() => router.push(`/dashboard/project/${project.id}`)}
                      className="px-4 py-2 text-xs font-semibold rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-100 hover:text-white transition-all disabled:opacity-50 disabled:pointer-events-none active:scale-95"
                    >
                      Open Workspace &rarr;
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
