"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/store/useStore";
import { Sparkles, ArrowRight, Globe, Layers, Edit3, Rocket } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const { createProject, isCloning, cloningError } = useStore();
  
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    "Spinning up headless browser...",
    "Crawling page elements, scripts and styles...",
    "Downloading image assets & cleaning fonts...",
    "Parsing DOM tree structure with AI agent...",
    "Extracting editable text components...",
    "Generating Next.js 15 project structure...",
    "Starting live preview environment...",
  ];

  // Dynamic loading text transition
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isCloning) {
      setCurrentStep(0);
      interval = setInterval(() => {
        setCurrentStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [isCloning]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!url) {
      setError("Please enter a valid URL.");
      return;
    }

    try {
      // Basic URL format validation
      new URL(url);
    } catch {
      setError("Please include the protocol (e.g. https://example.com).");
      return;
    }

    const project = await createProject(url, name || undefined);
    if (project) {
      // Redirect to the newly created project workspace
      router.push(`/dashboard/project/${project.id}`);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between overflow-hidden bg-zinc-950 text-zinc-100 selection:bg-purple-600 selection:text-white">
      {/* Background Decorative Gradients */}
      <div className="absolute top-[-20%] left-[-10%] h-[600px] w-[600px] rounded-full bg-purple-900/20 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] h-[600px] w-[600px] rounded-full bg-blue-900/20 blur-[120px]" />

      {/* Navigation Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between border-b border-zinc-900 z-10">
        <div className="flex items-center gap-2 font-semibold text-lg tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
          <Globe className="h-5 w-5 text-purple-400" />
          <span>Website Cloner AI</span>
        </div>
        <button
          onClick={() => router.push("/dashboard")}
          className="text-sm font-medium text-zinc-400 hover:text-white transition-colors"
        >
          Dashboard &rarr;
        </button>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto px-6 py-12 text-center z-10 w-full">
        {isCloning ? (
          /* Cloner Loading State */
          <div className="flex flex-col items-center justify-center py-12 max-w-md w-full">
            <div className="relative h-20 w-20 flex items-center justify-center mb-8">
              <div className="absolute inset-0 rounded-full border-4 border-purple-500/10 border-t-purple-500 animate-spin" />
              <Sparkles className="h-8 w-8 text-purple-400 animate-pulse" />
            </div>
            
            <h2 className="text-xl font-medium text-zinc-100 mb-2">Cloning in Progress</h2>
            <div className="h-5 overflow-hidden w-full text-center">
              <p className="text-sm text-zinc-400 animate-fade-in-out key={currentStep}">
                {steps[currentStep]}
              </p>
            </div>

            <div className="mt-8 w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-full transition-all duration-[4000ms] ease-out" 
                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              />
            </div>
          </div>
        ) : (
          /* Normal Landing State */
          <>
            {/* Tagline */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-500/20 bg-purple-500/5 text-purple-300 text-xs font-medium mb-6">
              <Sparkles className="h-3 w-3" />
              <span>Next.js 15 Website Cloner Engine</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight mb-6 leading-[1.1] max-w-3xl">
              Clone Any Website. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400">
                Edit Text Instantly.
              </span>
            </h1>

            <p className="text-zinc-400 text-base sm:text-lg max-w-2xl mb-10 leading-relaxed">
              Enter any URL to copy its design, compile a runnable Next.js 15 project in seconds, and update copy dynamically with our visual split-screen content editor.
            </p>

            {/* Input Form Card */}
            <div className="w-full max-w-xl p-6 rounded-2xl border border-zinc-900 bg-zinc-900/30 backdrop-blur-xl mb-12 shadow-2xl">
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-zinc-500">
                    <Globe className="h-5 w-5" />
                  </div>
                  <input
                    type="url"
                    required
                    placeholder="Enter website URL (e.g., https://example.com)"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-zinc-800 bg-zinc-950 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-sm"
                  />
                </div>

                <div className="flex gap-4">
                  <input
                    type="text"
                    placeholder="Workspace Name (Optional)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="flex-1 px-4 py-3 rounded-xl border border-zinc-800 bg-zinc-950 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-all text-sm"
                  />
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-purple-500/25 active:scale-95 text-sm whitespace-nowrap"
                  >
                    <span>Clone Now</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </form>

              {/* Error messages */}
              {(error || cloningError) && (
                <div className="mt-4 text-xs font-medium text-red-400 bg-red-950/20 border border-red-900/30 rounded-lg py-2 px-4 text-left">
                  {error || cloningError}
                </div>
              )}
            </div>

            {/* Highlights Section */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full max-w-3xl mt-6 border-t border-zinc-900 pt-10">
              <div className="flex flex-col items-center">
                <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center mb-3">
                  <Globe className="h-5 w-5 text-purple-400" />
                </div>
                <h4 className="text-sm font-semibold mb-1">Playwright Scraping</h4>
                <p className="text-xs text-zinc-500">HTML, CSS, image extraction</p>
              </div>

              <div className="flex flex-col items-center">
                <div className="h-10 w-10 rounded-lg bg-pink-500/10 flex items-center justify-center mb-3">
                  <Layers className="h-5 w-5 text-pink-400" />
                </div>
                <h4 className="text-sm font-semibold mb-1">Next.js 15 Generation</h4>
                <p className="text-xs text-zinc-500">Runnable build pipeline</p>
              </div>

              <div className="flex flex-col items-center">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-3">
                  <Edit3 className="h-5 w-5 text-blue-400" />
                </div>
                <h4 className="text-sm font-semibold mb-1">Inline Content Edits</h4>
                <p className="text-xs text-zinc-500">Live split-view hot-reload</p>
              </div>

              <div className="flex flex-col items-center">
                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center mb-3">
                  <Rocket className="h-5 w-5 text-green-400" />
                </div>
                <h4 className="text-sm font-semibold mb-1">GitHub & Cloud Push</h4>
                <p className="text-xs text-zinc-500">Vercel/Render deploys</p>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-6 text-center border-t border-zinc-900 z-10 text-xs text-zinc-600">
        <p>&copy; {new Date().getFullYear()} Website Cloner AI. Built autonomously for Next.js environments.</p>
      </footer>
    </div>
  );
}
