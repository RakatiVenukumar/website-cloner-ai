"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useStore, TextBlock } from "@/store/useStore";
import { 
  ArrowLeft, RefreshCw, Smartphone, Monitor, Globe, 
  Search, CloudLightning, ExternalLink, HelpCircle, 
  Settings, Layers, Edit, CheckCircle, AlertTriangle
} from "lucide-react";

// Custom GitHub icon to avoid dependency version errors
const GithubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={props.className}
    {...props}
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const Github = GithubIcon;


export default function ProjectWorkspace() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const { 
    currentProject, fetchProjectDetails, updateBlockContent,
    startPreview, stopPreview, deployProject, apiBase 
  } = useStore();

  const [search, setSearch] = useState("");
  const [activeSection, setActiveSection] = useState("All");
  const [viewportWidth, setViewportWidth] = useState("100%"); // '100%' or '375px'
  const [iframeKey, setIframeKey] = useState(0);
  const [isStartingServer, setIsStartingServer] = useState(false);
  
  // Integrations state
  const [githubConnected, setGithubConnected] = useState(false);
  const [githubRepoName, setGithubRepoName] = useState("");
  const [isSyncingGithub, setIsSyncingGithub] = useState(false);
  const [githubRepoUrl, setGithubRepoUrl] = useState<string | null>(null);

  // Deployments state
  const [activeTab, setActiveTab] = useState<"content" | "deploy">("content");
  const [selectedPlatform, setSelectedPlatform] = useState<"vercel" | "render" | "netlify">("vercel");
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployUrl, setDeployUrl] = useState<string | null>(null);
  
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Load details and initialize preview server
  useEffect(() => {
    if (projectId) {
      loadWorkspace();
    }
  }, [projectId]);

  const loadWorkspace = async () => {
    const proj = await fetchProjectDetails(projectId);
    if (proj && proj.status === "ready" && proj.preview_status !== "running") {
      // Auto start preview server
      handleStartPreview();
    }
  };

  const handleStartPreview = async () => {
    setIsStartingServer(true);
    await startPreview(projectId);
    setIsStartingServer(false);
    // Reload iframe after start
    setIframeKey(prev => prev + 1);
  };

  const handleStopPreview = async () => {
    await stopPreview(projectId);
    setIframeKey(prev => prev + 1);
  };

  const handleTextChange = (key: string, value: string) => {
    updateBlockContent(projectId, key, value);
    // Debounce or slightly delay refreshing the iframe to allow Next.js fast-refresh
    // Since Next.js uses file system watches, fast refresh triggers automatically.
    // We can also force refresh the iframe if it does not hot-reload
    setTimeout(() => {
      if (iframeRef.current) {
        // Option to postMessage or reload. Reload is most reliable to pick up JSON changes.
        // Actually, reloading the page is fast.
      }
    }, 1000);
  };

  const triggerIframeReload = () => {
    setIframeKey(prev => prev + 1);
  };

  // Simulated GitHub integrations
  const handleConnectGithub = () => {
    setGithubConnected(true);
    setGithubRepoName(currentProject?.name.toLowerCase().replace(/[^a-z0-9]/g, "-") || "cloned-site");
  };

  const handleSyncGithub = () => {
    if (!githubRepoName) return;
    setIsSyncingGithub(true);
    setTimeout(() => {
      setIsSyncingGithub(false);
      setGithubRepoUrl(`https://github.com/user/${githubRepoName}`);
    }, 3000);
  };

  // Simulated Deployments
  const handleDeploy = async () => {
    setIsDeploying(true);
    const deploy = await deployProject(projectId, selectedPlatform);
    setTimeout(() => {
      setIsDeploying(false);
      if (deploy) {
        setDeployUrl(deploy.deployment_url);
      }
    }, 4000);
  };

  if (!currentProject) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-100">
        <RefreshCw className="h-8 w-8 animate-spin text-purple-500 mb-4" />
        <p className="text-zinc-400">Loading Workspace...</p>
      </div>
    );
  }

  // Filter sections
  const sections = ["All", ...Array.from(new Set(currentProject.text_blocks?.map(tb => tb.section) || []))];
  
  const filteredBlocks = currentProject.text_blocks?.filter(tb => {
    const matchesSection = activeSection === "All" || tb.section === activeSection;
    const matchesSearch = tb.current_value.toLowerCase().includes(search.toLowerCase()) || 
                          tb.key.toLowerCase().includes(search.toLowerCase());
    return matchesSection && matchesSearch;
  }) || [];

  return (
    <div className="h-screen bg-zinc-950 text-zinc-100 flex flex-col overflow-hidden">
      {/* Workspace Header */}
      <header className="h-14 border-b border-zinc-900 bg-zinc-900/40 backdrop-blur-xl flex items-center justify-between px-6 flex-shrink-0 z-20">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push("/dashboard")}
            className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">{currentProject.name}</span>
              <span className="px-2 py-0.5 text-[10px] rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Active Workspace</span>
            </div>
            <a 
              href={currentProject.original_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-zinc-500 hover:text-zinc-400 flex items-center gap-1"
            >
              <span>Original: {currentProject.original_url}</span>
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </div>
        </div>

        {/* Device frame preview & controls */}
        <div className="flex items-center gap-4">
          {/* Viewport Width Control */}
          <div className="flex items-center gap-1.5 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
            <button 
              onClick={() => setViewportWidth("100%")}
              className={`p-1.5 rounded-md transition-all ${viewportWidth === "100%" ? 'bg-purple-600 text-white' : 'text-zinc-500 hover:text-white'}`}
              title="Desktop Preview"
            >
              <Monitor className="h-4 w-4" />
            </button>
            <button 
              onClick={() => setViewportWidth("375px")}
              className={`p-1.5 rounded-md transition-all ${viewportWidth === "375px" ? 'bg-purple-600 text-white' : 'text-zinc-500 hover:text-white'}`}
              title="Mobile Preview"
            >
              <Smartphone className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {currentProject.preview_status === "running" ? (
              <button 
                onClick={handleStopPreview}
                className="px-3 py-1.5 rounded-lg border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold transition-all"
              >
                Stop Dev Server
              </button>
            ) : (
              <button 
                onClick={handleStartPreview}
                disabled={isStartingServer}
                className="px-3 py-1.5 rounded-lg border border-purple-500/20 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 text-xs font-semibold transition-all disabled:opacity-50"
              >
                {isStartingServer ? "Starting..." : "Start Dev Server"}
              </button>
            )}
            <button
              onClick={triggerIframeReload}
              className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-all"
              title="Reload Frame"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Workspace Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Editor Sidebar */}
        <aside className="w-[420px] border-r border-zinc-900 flex flex-col bg-zinc-900/10 flex-shrink-0">
          {/* Navigation Tabs */}
          <div className="flex border-b border-zinc-900 px-4">
            <button
              onClick={() => setActiveTab("content")}
              className={`flex-1 py-3 text-xs font-semibold text-center border-b-2 transition-all ${activeTab === "content" ? 'border-purple-500 text-purple-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
            >
              Content Editor
            </button>
            <button
              onClick={() => setActiveTab("deploy")}
              className={`flex-1 py-3 text-xs font-semibold text-center border-b-2 transition-all ${activeTab === "deploy" ? 'border-purple-500 text-purple-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
            >
              Publish & Deploy
            </button>
          </div>

          <div className="flex-grow flex flex-col overflow-y-auto">
            {activeTab === "content" ? (
              /* Content Editor Panel */
              <>
                {/* Search & Filter */}
                <div className="p-4 flex flex-col gap-3 border-b border-zinc-900">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
                    <input
                      type="text"
                      placeholder="Search text contents..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-1.5 rounded-lg border border-zinc-800 bg-zinc-950 text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  {/* Section Filters */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                    {sections.map(sec => (
                      <button
                        key={sec}
                        onClick={() => setActiveSection(sec)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-all ${activeSection === sec ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30' : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'}`}
                      >
                        {sec}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Elements Editor List */}
                <div className="p-4 flex flex-col gap-5">
                  {filteredBlocks.length === 0 ? (
                    <div className="text-center py-12 text-zinc-600 text-xs">
                      No matching editable blocks found.
                    </div>
                  ) : (
                    filteredBlocks.map((block: TextBlock) => (
                      <div key={block.id} className="flex flex-col gap-2 p-3 bg-zinc-900/30 border border-zinc-900 rounded-lg hover:border-zinc-800 transition-all">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-500 font-mono">
                            {block.tag_type.toUpperCase()}
                          </span>
                          <span className="text-zinc-600">{block.section}</span>
                        </div>
                        <div className="text-[10px] font-mono text-purple-500 truncate" title={block.selector}>
                          {block.key}
                        </div>
                        <textarea
                          value={block.current_value}
                          onChange={(e) => handleTextChange(block.key, e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white focus:outline-none focus:border-purple-500 resize-none font-sans"
                        />
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              /* Deploy & Publish Panel */
              <div className="p-5 flex flex-col gap-6">
                {/* 1. GitHub Integration */}
                <div className="p-4 rounded-xl border border-zinc-900 bg-zinc-900/30 flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white">
                      <Github className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">GitHub Integration</h3>
                      <p className="text-[10px] text-zinc-500">Push the generated code to GitHub.</p>
                    </div>
                  </div>

                  {!githubConnected ? (
                    <button
                      onClick={handleConnectGithub}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-semibold transition-all active:scale-95 shadow-md"
                    >
                      <Github className="h-4 w-4" />
                      <span>Connect GitHub Account</span>
                    </button>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={githubRepoName}
                          onChange={(e) => setGithubRepoName(e.target.value)}
                          placeholder="repo-name"
                          className="flex-grow px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-950 text-xs focus:outline-none focus:border-purple-500"
                        />
                        <button
                          onClick={handleSyncGithub}
                          disabled={isSyncingGithub}
                          className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-xs font-semibold text-white transition-all active:scale-95"
                        >
                          {isSyncingGithub ? "Syncing..." : "Sync"}
                        </button>
                      </div>

                      {githubRepoUrl && (
                        <div className="flex items-center justify-between p-2 bg-emerald-950/20 border border-emerald-900/30 rounded-lg text-[10px] text-emerald-400">
                          <span className="truncate">Sync Successful: {githubRepoUrl}</span>
                          <a href={githubRepoUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3 hover:text-white" />
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 2. Cloud Providers Deployments */}
                <div className="p-4 rounded-xl border border-zinc-900 bg-zinc-900/30 flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-purple-400">
                      <CloudLightning className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">Cloud Deployments</h3>
                      <p className="text-[10px] text-zinc-500">Deploy the project instantly to the cloud.</p>
                    </div>
                  </div>

                  {/* Platforms selection */}
                  <div className="grid grid-cols-3 gap-2 bg-zinc-950 p-1 rounded-lg border border-zinc-900">
                    {["vercel", "render", "netlify"].map((plat) => (
                      <button
                        key={plat}
                        onClick={() => setSelectedPlatform(plat as any)}
                        className={`py-1.5 rounded-md text-[10px] font-semibold capitalize transition-all ${selectedPlatform === plat ? 'bg-purple-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                      >
                        {plat}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleDeploy}
                    disabled={isDeploying || !githubRepoUrl}
                    className="w-full py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:pointer-events-none text-white text-xs font-semibold shadow-lg hover:shadow-purple-500/20 active:scale-95 transition-all"
                  >
                    {isDeploying ? "Deploying Site..." : `Deploy to ${selectedPlatform.toUpperCase()}`}
                  </button>

                  {!githubRepoUrl && (
                    <div className="flex items-center gap-1.5 text-[10px] text-amber-500">
                      <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                      <span>Please sync with a GitHub repository first.</span>
                    </div>
                  )}

                  {deployUrl && (
                    <div className="p-3 bg-emerald-950/20 border border-emerald-900/30 rounded-lg flex flex-col gap-2">
                      <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                        <CheckCircle className="h-4 w-4" />
                        <span>Deployment Live!</span>
                      </div>
                      <a 
                        href={deployUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[10px] text-zinc-300 hover:text-white flex items-center gap-1.5 truncate underline"
                      >
                        <span>{deployUrl}</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Right Side: Preview Frame Panel */}
        <section className="flex-1 bg-zinc-900/30 flex items-center justify-center p-6 overflow-hidden">
          <div 
            className="h-full bg-black rounded-xl border border-zinc-900 shadow-2xl flex flex-col overflow-hidden transition-all duration-300 relative"
            style={{ width: viewportWidth }}
          >
            {/* Address Bar mock */}
            <div className="h-9 border-b border-zinc-900 bg-zinc-900/50 flex items-center justify-between px-4 flex-shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500/30" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500/30" />
                <span className="h-2.5 w-2.5 rounded-full bg-green-500/30" />
              </div>
              <div className="flex-1 max-w-md bg-zinc-950 border border-zinc-800 rounded-md py-0.5 px-3 mx-4 text-center text-[10px] text-zinc-400 truncate flex items-center justify-center gap-1">
                <Globe className="h-3 w-3 text-zinc-500" />
                <span>localhost:{currentProject.preview_port || "3001"}</span>
              </div>
              <div className="w-10" />
            </div>

            {/* Iframe Viewport */}
            <div className="flex-1 bg-white relative">
              {currentProject.preview_status === "running" ? (
                <iframe
                  key={iframeKey}
                  ref={iframeRef}
                  src={`${apiBase}/api/preview/${projectId}/`}
                  className="w-full h-full border-none"
                  sandbox="allow-scripts allow-same-origin allow-forms"
                />
              ) : (
                /* Stopped Server Overlay */
                <div className="absolute inset-0 bg-zinc-950 flex flex-col items-center justify-center text-center p-6 text-zinc-100">
                  <div className="h-12 w-12 rounded-full bg-zinc-900 flex items-center justify-center mb-4 border border-zinc-800">
                    <Globe className="h-6 w-6 text-zinc-600" />
                  </div>
                  <h3 className="font-semibold text-sm mb-1">Preview Dev Server Offline</h3>
                  <p className="text-[11px] text-zinc-500 max-w-xs mb-4">
                    The Next.js development server is stopped. Click below to start the local process.
                  </p>
                  <button
                    onClick={handleStartPreview}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-lg hover:shadow-purple-500/20 active:scale-95 transition-all"
                  >
                    Start Preview Server
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
