import { useCallback, useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import {
  AdminKeyError,
  listStudentAccess,
  setStudentAccess,
  type AccessTier,
  type StudentAccess,
} from "@/api/access";
import { Crown, Loader2, Lock, LogOut, RefreshCw, Search, ShieldCheck, Users } from "lucide-react";

type Student = Tables<"students">;

const KEY_STORAGE = "swar_setu_admin_key";
const LOCAL_STUDENTS_KEY = "swar_setu_local_students_v1";

interface Row {
  student_id: string;
  name: string | null;
  grade: string | null;
  parent_email: string | null;
  tier: AccessTier;
}

const readKey = () => {
  try {
    return sessionStorage.getItem(KEY_STORAGE) ?? "";
  } catch {
    return "";
  }
};

const writeKey = (key: string) => {
  try {
    if (key) sessionStorage.setItem(KEY_STORAGE, key);
    else sessionStorage.removeItem(KEY_STORAGE);
  } catch {
    // private mode: key just won't be remembered
  }
};

/** Students this browser can see: Supabase (all of them when signed in as a principal) plus the local cache. */
async function visibleStudents(): Promise<Student[]> {
  const found = new Map<string, Student>();
  try {
    const { data } = await supabase.from("students").select("*");
    data?.forEach((s) => found.set(s.id, s));
  } catch {
    // offline: fall back to the local cache only
  }
  try {
    const local: Student[] = JSON.parse(localStorage.getItem(LOCAL_STUDENTS_KEY) || "[]");
    local.forEach((s) => !found.has(s.id) && found.set(s.id, s));
  } catch {
    // ignore a corrupt cache
  }
  return [...found.values()];
}

export default function AdminPanel() {
  const [adminKey, setAdminKey] = useState(readKey);
  const [keyInput, setKeyInput] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | AccessTier>("all");

  const load = useCallback(async (key: string) => {
    setLoading(true);
    try {
      const [access, students] = await Promise.all([listStudentAccess(key), visibleStudents()]);
      const byId = new Map<string, Row>();
      access.forEach((a: StudentAccess) => byId.set(a.student_id, { ...a }));
      students.forEach((s) => {
        const existing = byId.get(s.id);
        byId.set(s.id, {
          student_id: s.id,
          name: s.name ?? existing?.name ?? null,
          grade: s.grade ?? existing?.grade ?? null,
          parent_email: s.parent_email ?? existing?.parent_email ?? null,
          tier: existing?.tier ?? "freemium",
        });
      });
      setRows([...byId.values()].sort((a, b) => (a.name ?? "~").localeCompare(b.name ?? "~")));
      writeKey(key);
      setAdminKey(key);
    } catch (e) {
      if (e instanceof AdminKeyError) {
        writeKey("");
        setAdminKey("");
        toast.error(e.message);
      } else {
        toast.error("Could not reach the backend. Is it running on port 5000?");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (adminKey) load(adminKey);
    // only on first mount; later loads are triggered explicitly
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = async (row: Row, premium: boolean) => {
    const tier: AccessTier = premium ? "premium" : "freemium";
    setSaving(row.student_id);
    try {
      await setStudentAccess(adminKey, row, tier);
      setRows((prev) => prev.map((r) => (r.student_id === row.student_id ? { ...r, tier } : r)));
      toast.success(`${row.name ?? "Student"} is now ${tier === "premium" ? "Premium: parent access on" : "Freemium: parent access off"}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update access");
      if (e instanceof AdminKeyError) setAdminKey("");
    } finally {
      setSaving(null);
    }
  };

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (filter === "all" || r.tier === filter) &&
        (!q || [r.name, r.parent_email, r.grade].some((v) => v?.toLowerCase().includes(q)))
    );
  }, [rows, query, filter]);

  const premiumCount = rows.filter((r) => r.tier === "premium").length;

  if (!adminKey) {
    return (
      <Layout hideFooter>
        <div className="min-h-[70vh] flex items-center justify-center px-4">
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" /> Admin panel
              </CardTitle>
              <CardDescription>Enter the admin key (ADMIN_KEY in .env) to manage parent access.</CardDescription>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (keyInput.trim()) load(keyInput.trim());
                }}
              >
                <Input type="password" placeholder="Admin key" value={keyInput} onChange={(e) => setKeyInput(e.target.value)} autoFocus />
                <Button type="submit" className="w-full" disabled={loading || !keyInput.trim()}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Unlock"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout hideFooter>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <ShieldCheck className="h-7 w-7 text-primary" /> Admin panel
            </h1>
            <p className="text-muted-foreground">Premium kids' parents can open the parent dashboard. Freemium kids' parents see a locked screen.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => load(adminKey)} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { writeKey(""); setAdminKey(""); setRows([]); }}>
              <LogOut className="h-4 w-4 mr-1" /> Lock
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {([
            ["all", "All kids", rows.length, Users],
            ["premium", "Premium", premiumCount, Crown],
            ["freemium", "Freemium", rows.length - premiumCount, Lock],
          ] as const).map(([key, label, count, Icon]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`rounded-xl border p-4 text-left transition-colors ${filter === key ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}
            >
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Icon className="h-4 w-4" /> {label}</div>
              <div className="text-2xl font-bold mt-1">{count}</div>
            </button>
          ))}
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by name, parent email or grade" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>

        <Card>
          <CardContent className="p-0 divide-y">
            {loading && rows.length === 0 ? (
              <div className="p-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : shown.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground text-sm">
                {rows.length === 0
                  ? "No kids yet. Kids show up here once a teacher adds them (sign in as the principal to see all of them) or a parent opens their dashboard."
                  : "No kids match this filter."}
              </div>
            ) : (
              shown.map((r) => (
                <div key={r.student_id} className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <div className="font-medium truncate flex items-center gap-2">
                      {r.name ?? <span className="text-muted-foreground italic">Unnamed</span>}
                      {r.grade && <span className="text-xs text-muted-foreground">Grade {r.grade}</span>}
                    </div>
                    <div className="text-sm text-muted-foreground truncate">{r.parent_email ?? "No parent linked"}</div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge variant={r.tier === "premium" ? "default" : "secondary"} className="w-20 justify-center">
                      {r.tier === "premium" ? "Premium" : "Freemium"}
                    </Badge>
                    {saving === r.student_id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Switch
                        checked={r.tier === "premium"}
                        onCheckedChange={(v) => toggle(r, v)}
                        aria-label={`Parent access for ${r.name ?? r.student_id}`}
                      />
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
