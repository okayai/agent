import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Trash2, Download } from "lucide-react";
import * as memory from "@/lib/okay/memory";
import type { MemoryItem, MemoryClass } from "@/lib/okay/types";

const CLASSES: MemoryClass[] = ["working", "episodic", "semantic", "procedural"];

const MemoryConsole = () => {
  const [items, setItems] = useState<MemoryItem[]>([]);
  const [filter, setFilter] = useState<MemoryClass | "all">("all");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const refresh = () => setItems(memory.exportAll());
  useEffect(refresh, []);

  const filtered = filter === "all" ? items : items.filter((i) => i.class === filter);

  const startEdit = (item: MemoryItem) => {
    setEditing(item.id);
    setDraft(JSON.stringify(item.value, null, 2));
  };

  const commitEdit = (item: MemoryItem) => {
    try {
      const value = JSON.parse(draft);
      memory.forget(item.id);
      memory.admit(
        { class: item.class, key: item.key, value, sensitivity: item.sensitivity, provenance: item.provenance },
        { userConsented: item.sensitivity === "high" },
      );
      setEditing(null);
      refresh();
    } catch {
      // keep editing on parse error
    }
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "okay-memory.json"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="container mx-auto max-w-4xl px-6 py-10">
        <Link to="/production-ready" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <header className="mb-6">
          <p className="font-mono text-xs uppercase tracking-widest text-primary mb-2">OKAY / memory console</p>
          <h1 className="font-display text-3xl font-bold">Inspect · Edit · Forget · Export</h1>
        </header>

        <div className="flex flex-wrap gap-2 mb-4">
          {(["all", ...CLASSES] as const).map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider border ${
                filter === c ? "bg-primary/15 text-primary border-primary/40" : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {c}
            </button>
          ))}
          <button
            onClick={exportJson}
            className="ml-auto px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider border border-border hover:text-foreground inline-flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>

        <ul className="rounded-xl border border-border divide-y divide-border overflow-hidden bg-card/40">
          {filtered.length === 0 && (
            <li className="px-4 py-10 text-center text-sm text-muted-foreground">No memory items in this scope.</li>
          )}
          {filtered.map((item) => (
            <li key={item.id} className="px-4 py-3">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-secondary text-secondary-foreground">
                  {item.class}
                </span>
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-muted text-muted-foreground">
                  {item.sensitivity}
                </span>
                <span className="font-mono text-sm truncate">{item.key}</span>
                <div className="ml-auto flex gap-1">
                  {editing === item.id ? (
                    <>
                      <button onClick={() => commitEdit(item)} className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground">
                        Save
                      </button>
                      <button onClick={() => setEditing(null)} className="text-xs px-2 py-1 rounded border border-border">
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button onClick={() => startEdit(item)} className="text-xs px-2 py-1 rounded border border-border hover:text-foreground">
                      Edit
                    </button>
                  )}
                  <button
                    onClick={() => { memory.forget(item.id); refresh(); }}
                    className="text-xs px-2 py-1 rounded border border-border hover:text-destructive inline-flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> Forget
                  </button>
                </div>
              </div>
              {editing === item.id ? (
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="w-full font-mono text-xs bg-background border border-border rounded p-2 h-32"
                />
              ) : (
                <pre className="font-mono text-xs text-muted-foreground overflow-x-auto">
                  {JSON.stringify(item.value, null, 2)}
                </pre>
              )}
              {item.provenance && (
                <p className="text-[10px] font-mono text-muted-foreground mt-1">provenance: {item.provenance}</p>
              )}
              {item.expiresAt && (
                <p className="text-[10px] font-mono text-muted-foreground">expires: {item.expiresAt}</p>
              )}
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
};

export default MemoryConsole;
