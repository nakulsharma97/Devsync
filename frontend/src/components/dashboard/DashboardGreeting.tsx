import { greeting, todayLabel } from "@/lib/format";

interface DashboardGreetingProps {
  firstName: string;
  isAdmin?: boolean;
}

/**
 * Page header for the dashboard. The name lives in its own element so the
 * greeting line, the wave and the admin chip stay independent of it.
 */
export function DashboardGreeting({ firstName, isAdmin = false }: DashboardGreetingProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <p className="text-[15px] text-muted-foreground">{greeting()},</p>
        <h1 className="mt-1.5 font-display text-[30px] font-bold leading-[1.05] tracking-tight text-foreground sm:text-[34px]">
          <span className="break-words">{firstName}</span>
          <span aria-hidden className="ml-2">
            👋
          </span>
          {isAdmin && (
            <span className="ml-2.5 inline-flex translate-y-[-2px] items-center rounded-full border border-border bg-muted px-2.5 py-0.5 align-middle text-[11px] font-semibold text-secondary-foreground">
              Admin
            </span>
          )}
        </h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          Build. Collaborate. Ship real projects.
        </p>
      </div>
      <p className="shrink-0 text-[13px] text-muted-foreground sm:pb-1.5">{todayLabel()}</p>
    </div>
  );
}

export default DashboardGreeting;
