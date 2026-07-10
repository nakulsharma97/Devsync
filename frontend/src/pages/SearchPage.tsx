import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { userService } from "@/services/userService";
import { Input } from "@/components/ui/input";
import { Search, Loader2, User } from "lucide-react";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const { data: users, loading, refetch } = useApi(
    () => query.trim() ? userService.searchUsers(query) : Promise.resolve([]),
    [query]
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Search</h1>
        <p className="text-sm text-muted-foreground mt-1">Find developers and projects</p>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search developers by name or email..."
          className="pl-9 h-10"
        />
      </div>
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-indigo-500" /></div>
      ) : users && users.length > 0 ? (
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/40 hover:border-indigo-500/20 transition-colors">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center text-xs font-bold text-indigo-400">
                {u.fullName.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-medium">{u.fullName}</p>
                <p className="text-xs text-muted-foreground">{u.email}</p>
              </div>
            </div>
          ))}
        </div>
      ) : query.trim() ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          <User className="w-8 h-8 mx-auto mb-2 opacity-40" />
          No users found
        </div>
      ) : null}
    </div>
  );
}
