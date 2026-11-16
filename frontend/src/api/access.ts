// Premium/freemium parent access, stored by the backend (see backend/routes/access.py).

const API_BASE_URL = import.meta.env.VITE_AI_API_BASE_URL || window.location.origin;

export type AccessTier = "freemium" | "premium";

export interface StudentAccess {
  student_id: string;
  name: string | null;
  grade: string | null;
  parent_email: string | null;
  tier: AccessTier;
  updated_at: string;
}

export interface StudentDetails {
  student_id: string;
  name?: string | null;
  grade?: string | null;
  parent_email?: string | null;
}

/** Registers the student (so the admin panel lists it) and returns its tier.
 *  Throws when the backend can't be reached, so callers can tell "locked" from "unknown". */
export async function checkParentAccess(student: StudentDetails): Promise<AccessTier> {
  const res = await fetch(`${API_BASE_URL}/api/access/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(student),
  });
  if (!res.ok) throw new Error(`Access check failed (${res.status})`);
  const data = await res.json();
  return data.tier === "premium" ? "premium" : "freemium";
}

export class AdminKeyError extends Error {}

async function adminFetch(path: string, adminKey: string, init: RequestInit = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", "X-Admin-Key": adminKey, ...init.headers },
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 || res.status === 503) throw new AdminKeyError(data.error || "Invalid admin key");
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export async function listStudentAccess(adminKey: string): Promise<StudentAccess[]> {
  const data = await adminFetch("/api/admin/access", adminKey);
  return data.students ?? [];
}

export async function setStudentAccess(adminKey: string, student: StudentDetails, tier: AccessTier): Promise<StudentAccess> {
  const { student_id, ...details } = student;
  const data = await adminFetch(`/api/admin/access/${encodeURIComponent(student_id)}`, adminKey, {
    method: "PUT",
    body: JSON.stringify({ tier, ...details }),
  });
  return data.student;
}
