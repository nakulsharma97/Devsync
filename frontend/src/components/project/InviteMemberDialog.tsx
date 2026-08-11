import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { userService, type UserDto } from "@/services/userService";
import { projectService, type ProjectMemberDto } from "@/services/projectService";
import { Search, Loader2, UserPlus, Check } from "lucide-react";
import { toast } from "sonner";

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
  /** Existing members — excluded from the candidate list. */
  members: ProjectMemberDto[];
  onInvited?: () => void;
}

export function InviteMemberDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
  members,
  onInvited,
}: InviteMemberDialogProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserDto[]>([]);
  const [searching, setSearching] = useState(false);
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const memberIds = new Set(members.map((m) => m.userId));

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const users = await userService.searchUsers(q.trim());
      setResults(users);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setInvitedIds(new Set());
      return;
    }
    // Reset the per-session "invited" state once the dialog reopens.
    setInvitedIds(new Set());
  }, [open]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, search]);

  const handleInvite = async (user: UserDto) => {
    setInvitingId(user.id);
    try {
      await projectService.invite(projectId, user.username || user.email);
      setInvitedIds((prev) => new Set(prev).add(user.id));
      toast(`Invitation sent to ${user.fullName}`);
      onInvited?.();
    } catch (err: unknown) {
      toast(
        err instanceof Error ? err.message : "Failed to send invitation"
      );
    } finally {
      setInvitingId(null);
    }
  };

  const candidates = results.filter((u) => !memberIds.has(u.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-indigo-400" />
            Invite to {projectName}
          </DialogTitle>
          <DialogDescription>
            Search by name, username or email and send an invitation.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, username or email…"
            className="pl-9"
          />
        </div>

        <div className="space-y-1 max-h-72 overflow-y-auto -mx-2 px-2">
          {searching ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
            </div>
          ) : query.trim() && candidates.length === 0 && !searching ? (
            <p className="text-center text-sm text-muted-foreground py-6">
              No users found{query.trim() ? ` for “${query.trim()}”` : ""}
            </p>
          ) : (
            candidates.map((user) => {
              const isInvited = invitedIds.has(user.id);
              return (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/5 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center shrink-0 overflow-hidden">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-indigo-400">
                        {user.fullName?.charAt(0) || "?"}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user.fullName}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      @{user.username}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={isInvited ? "ghost" : "outline"}
                    disabled={invitingId === user.id || isInvited}
                    onClick={() => handleInvite(user)}
                    className="text-xs shrink-0"
                  >
                    {invitingId === user.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : isInvited ? (
                      <>
                        <Check className="w-3.5 h-3.5 mr-1" /> Invited
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5 mr-1" /> Invite
                      </>
                    )}
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
