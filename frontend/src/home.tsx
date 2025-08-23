// frontend/src/home.tsx

import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Copy, Lightbulb, CheckCircle, AlertTriangle, Zap, Database, Loader2, RotateCcw } from "lucide-react";

// Types
interface ApiResponse {
  question: string;
  answer: string;
  source: "verbatim" | "lm";
}

// This is the single, correct declaration of the Home component
const Home: React.FC = () => {
  const [question, setQuestion] = useState<string>("");
  const [fullAnswer, setFullAnswer] = useState<string>("");
  const [displayed, setDisplayed] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [copyText, setCopyText] = useState<string>("Copy");
  const [source, setSource] = useState<string>("");
  const [history, setHistory] = useState<string[]>([]);
  const { toast } = useToast();

  // Typewriter effect
  useEffect(() => {
    if (!fullAnswer) return;
    let i = 0;
    const tokens = fullAnswer.split(" ");
    setDisplayed("");
    const id = setInterval(() => {
      if (i >= tokens.length) {
        clearInterval(id);
        return;
      }
      const nextToken = tokens[i];
      if (nextToken !== undefined) {
        setDisplayed((prev) => (i > 0 ? `${prev} ` : "") + nextToken);
      }
      i += 1;
    }, 35);
    return () => clearInterval(id);
  }, [fullAnswer]);

  const askServer = async (currentQuestion: string) => {
    const q = currentQuestion.trim();
    if (!q) return;

    setIsLoading(true);
    setFullAnswer("");
    setDisplayed("");
    setError("");
    setSource("");

    try {
      const res = await fetch("http://127.0.0.1:8000/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: q }),
      });

      const text = await res.text();
      let data: ApiResponse | { detail?: string } = {};
      try {
        data = JSON.parse(text);
      } catch {
        if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
      }

      if (!res.ok) {
        const detail = (data as { detail?: string })?.detail || text || `HTTP ${res.status}`;
        throw new Error(detail);
      }

      const payload = data as ApiResponse;
      if (!payload.answer) throw new Error("Empty answer from server.");
      setFullAnswer(payload.answer);
      setSource(payload.source ?? "lm");

      setHistory((prev) => {
        const next = [q, ...prev.filter((h) => h !== q)];
        return next.slice(0, 5);
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      console.error("Ask error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    askServer(question);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      askServer(question);
    }
  };

  const handleHistoryClick = (q: string) => {
    setQuestion(q);
    askServer(q);
  };

  const handleCopy = () => {
    if (!fullAnswer) return;
    navigator.clipboard.writeText(fullAnswer);
    setCopyText("Copied!");
    toast({
      title: "Copied",
      description: "Answer copied to clipboard.",
      duration: 2000,
    });
    setTimeout(() => setCopyText("Copy"), 1500);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans antialiased">
      <header className="pt-8 pb-6 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Lightbulb className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-500 to-blue-400 leading-tight">
              AI Answer Generator
            </h1>
          </div>
          <p className="text-slate-400 text-lg font-medium">
            Powered by RAG Pipeline with <span className="text-purple-400 font-semibold">Flan‑T5</span>
          </p>
          <div className="mt-4 flex items-center justify-center gap-3 text-xs text-slate-500">
            <Badge variant="secondary" className="bg-slate-800/70 border border-slate-700/60">
              <CheckCircle className="w-3.5 h-3.5 mr-1" />
              Knowledge Base
            </Badge>
            <Badge variant="secondary" className="bg-slate-800/70 border border-slate-700/60">
              <Database className="w-3.5 h-3.5 mr-1" />
              Chroma
            </Badge>
          </div>
        </div>
      </header>

      <main className="px-4 pb-16">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50 rounded-2xl p-6 mb-8 shadow-lg">
            <form onSubmit={handleSubmit} className="space-y-3">
              <label className="block text-sm font-medium text-slate-300">
                Ask a question about machine learning
              </label>
              <div className="relative">
                <Textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder='Try: "What is Machine Learning?" or "Explain SVM kernel trick"'
                  rows={3}
                  className="w-full p-4 pr-32 rounded-xl bg-slate-900/80 border-slate-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-white placeholder-slate-400"
                />
                <Button
                  type="submit"
                  disabled={isLoading || !question.trim()}
                  className="absolute right-3 top-1/2 -translate-y-1/2 px-6 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-40"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Generating…
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Generate
                    </>
                  )}
                </Button>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>
                  Shortcut: <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700">Ctrl</kbd> +{" "}
                  <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700">Enter</kbd>
                </span>
                <span>{question.trim().length} chars</span>
              </div>
            </form>
          </Card>

          {history.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-3">
                <h3 className="text-lg font-semibold text-slate-300">Recent Questions</h3>
                <div className="flex-1 h-px bg-slate-700" />
              </div>
              <div className="flex flex-wrap gap-2">
                {history.map((h) => (
                  <Button
                    key={h}
                    onClick={() => handleHistoryClick(h)}
                    variant="ghost"
                    className="px-3 py-1.5 bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600/50 rounded-full text-xs text-slate-300 hover:text-white"
                  >
                    {h.length > 60 ? `${h.slice(0, 60)}…` : h}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="min-h-[200px]">
            {isLoading && (
              <Card className="bg-slate-800/50 border-slate-700/50 rounded-2xl p-8 shadow-lg">
                <div className="flex flex-col items-center gap-4 text-slate-300">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                  <div className="text-center">
                    <p className="font-medium">Generating answer…</p>
                    <p className="text-sm text-slate-500">Searching knowledge base and composing response</p>
                  </div>
                </div>
              </Card>
            )}

            {!isLoading && error && (
              <Card className="bg-red-950/30 border-red-500/30 rounded-2xl p-6 shadow-lg">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-300" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-red-300 font-semibold mb-1">Something went wrong</h3>
                    <p className="text-red-200 text-sm mb-4">{error}</p>
                    <Button
                      onClick={() => askServer(question)}
                      variant="outline"
                      className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border-red-500/40 text-red-200"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Try again
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {!isLoading && !error && fullAnswer && (
              <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50 rounded-2xl p-8 shadow-lg relative">
                <Button
                  onClick={handleCopy}
                  variant="ghost"
                  className="absolute top-6 right-6 flex items-center gap-2 px-3 py-2 bg-slate-700/40 hover:bg-slate-600/50 text-slate-300 hover:text-white"
                >
                  <Copy className="w-4 h-4" />
                  <span className="text-sm">{copyText}</span>
                </Button>

                <div className="flex items-center gap-3 mb-5">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-200">Answer</h2>
                </div>

                <div className="prose prose-invert max-w-none">
                  <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{displayed}</p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-700/50 flex items-center gap-2 text-sm text-slate-500">
                  <Database className="w-4 h-4" />
                  <span>
                    Source:{" "}
                    <span className="font-medium">
                      {source === "verbatim" ? "Knowledge base (exact match)" : "Language model"}
                    </span>
                  </span>
                </div>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;