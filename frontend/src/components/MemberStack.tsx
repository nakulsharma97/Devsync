export interface MemberStackMember {
  id: string;
  fullName: string;
  avatarUrl: string | null;
}

/** Overlapping avatar stack (up to 3) with a "+N" overflow badge. */
export function MemberStack({ members }: { members: MemberStackMember[] }) {
  if (!members || members.length === 0) return null;
  return (
    <div className="flex -space-x-1.5">
      {members.slice(0, 3).map((m) => (
        <div
          key={m.id}
          title={m.fullName}
          className="w-5 h-5 rounded-full ring-2 ring-card bg-gradient-to-br from-indigo-500/30 to-purple-500/30 flex items-center justify-center text-[8px] font-bold text-indigo-600 dark:text-indigo-300 overflow-hidden shrink-0"
        >
          {m.avatarUrl ? (
            <img src={m.avatarUrl} alt={m.fullName} className="w-full h-full object-cover" />
          ) : (
            m.fullName?.charAt(0) || "?"
          )}
        </div>
      ))}
      {members.length > 3 && (
        <div className="w-5 h-5 rounded-full ring-2 ring-card bg-muted flex items-center justify-center text-[8px] font-bold text-muted-foreground shrink-0">
          +{members.length - 3}
        </div>
      )}
    </div>
  );
}
