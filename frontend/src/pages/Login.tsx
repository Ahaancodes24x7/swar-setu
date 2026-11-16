import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowUpRight, BookOpen, Users, type LucideIcon } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { AuthShell } from "@/components/auth/AuthShell";
import { TeacherAuthForm } from "@/components/auth/TeacherAuthForm";
import { ParentAuthForm } from "@/components/auth/ParentAuthForm";

const ROLES: { type: "parent" | "teacher"; title: string; blurb: string; help: string; icon: LucideIcon }[] = [
  {
    type: "parent",
    title: "Parent or guardian",
    blurb: "Follow your child's learning journey.",
    help: "Pick this if your child's teacher has added your email. You'll see their progress, badges and reports.",
    icon: Users,
  },
  {
    type: "teacher",
    title: "Teacher",
    blurb: "Support students. Manage assessments.",
    help: "Pick this if you run screenings in a classroom. Principals sign in here too.",
    icon: BookOpen,
  },
];

function RolePicker() {
  const navigate = useNavigate();
  const [showHelp, setShowHelp] = useState(false);

  return (
    <>
      <p className="animate-fade-in text-xs font-bold uppercase tracking-[0.2em] text-primary">Your workspace</p>
      <h2 className="animate-fade-in mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl" style={{ animationDelay: "0.05s" }}>
        Welcome to <span className="whitespace-nowrap">Swar-Setu<span className="text-accent">.</span></span>
      </h2>
      <p className="animate-fade-in mt-3 text-lg text-muted-foreground" style={{ animationDelay: "0.1s" }}>
        Choose how you'll be joining us.
      </p>

      <div className="mt-10 space-y-5">
        {ROLES.map(({ type, title, blurb, help, icon: Icon }, i) => (
          <button
            key={type}
            type="button"
            onClick={() => navigate(`/login/${type}`)}
            className="role-card group animate-fade-in flex w-full items-center gap-3 rounded-2xl border-2 border-primary/80 bg-card/70 p-4 text-left sm:gap-6 sm:p-6"
            style={{ animationDelay: `${0.15 + i * 0.08}s` }}
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center text-primary sm:h-14 sm:w-14 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
              <Icon className="h-8 w-8 sm:h-10 sm:w-10" strokeWidth={1.6} />
            </span>
            <span className="hidden h-12 w-px shrink-0 bg-border sm:block" />
            <span className="min-w-0 flex-1">
              <span className="block text-lg font-bold sm:text-2xl">{title}</span>
              <span className="block text-sm text-muted-foreground sm:text-base">{blurb}</span>
              {showHelp && <span className="animate-fade-in mt-2 block text-sm text-primary">{help}</span>}
            </span>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 sm:h-12 sm:w-12 border-primary text-primary transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground group-hover:rotate-45">
              <ArrowUpRight className="h-5 w-5" />
            </span>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setShowHelp((v) => !v)}
        aria-expanded={showHelp}
        className="mt-8 font-semibold text-primary underline decoration-2 underline-offset-4 hover:decoration-accent"
      >
        {showHelp ? "Got it, hide the tips" : "Need help choosing?"}
      </button>
    </>
  );
}

function FormPanel({ eyebrow, title, subtitle, children }: { eyebrow: string; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="max-w-md">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h2>
      <p className="mt-2 mb-8 text-muted-foreground">{subtitle}</p>
      <div className="animate-fade-in rounded-2xl border bg-card p-6 shadow-md">{children}</div>
    </div>
  );
}

export default function Login() {
  const { type } = useParams<{ type?: string }>();

  return (
    <Layout hideFooter={true} hideHeader={true}>
      {type === "parent" ? (
        <AuthShell back={{ to: "/login", label: "Back to roles" }}>
          <FormPanel eyebrow="Parent or guardian" title="Your child's journey" subtitle="Access is linked by your child's teacher.">
            <ParentAuthForm />
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Parent access must be linked by your child's teacher. Contact the school if you haven't received access.
            </p>
          </FormPanel>
        </AuthShell>
      ) : type === "teacher" ? (
        <AuthShell back={{ to: "/login", label: "Back to roles" }}>
          <FormPanel eyebrow="Teacher or principal" title="Your classroom" subtitle="Sign in or create an account to manage your classroom.">
            <TeacherAuthForm />
          </FormPanel>
        </AuthShell>
      ) : (
        <AuthShell back={{ to: "/", label: "Back to home" }}>
          <RolePicker />
        </AuthShell>
      )}
    </Layout>
  );
}
