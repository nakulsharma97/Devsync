import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { X, Users, FolderKanban, Loader2, Image as ImageIcon, ChevronRight } from "lucide-react";
import type { ConversationDto, MessageDto } from "@/services/messageService";
import type { PublicUserDto } from "@/services/userService";
import type { TeamRoomDto } from "@/services/roomService";
import { timeAgo } from "@/lib/format";
import { AuthorizedImage, FileRow, isImageAttachment } from "./AttachmentView";
import { cn } from "@/lib/utils";

interface ConversationDetailsProps {
  conversation: ConversationDto | null;
  /** Real profile fetched by the page (GET /users/{id}) — shared with the composer flow. */
  profile: PublicUserDto | null;
  /** Real room data fetched by the page (GET /rooms/{id}) — shared with the composer flow. */
  room: TeamRoomDto | null;
  loading: boolean;
  messages: MessageDto[];
  presence: Record<string, string>;
  onClose?: () => void;
}

function presenceText(status: string | null | undefined, lastActiveAt?: string | null): string {
  switch (status) {
    case "ONLINE":
      return "Online";
    case "AWAY":
      return "Away";
    default:
      return lastActiveAt ? `Active ${timeAgo(lastActiveAt, "")} ago` : "Offline";
  }
}

export function ConversationDetails({
  conversation,
  profile,
  room,
  loading,
  messages,
  presence,
  onClose,
}: ConversationDetailsProps) {
  const navigate = useNavigate();
  const [showAllMedia, setShowAllMedia] = useState(false);
  const [showAllFiles, setShowAllFiles] = useState(false);

  const isRoom = conversation?.type === "room";
  const peerId = conversation?.otherUserId ?? null;

  // Shared media/files are derived from the loaded messages' attachments —
  // no extra API calls, and authorization is inherited from the messages.
  const media = useMemo(
    () => messages.filter((m) => m.attachment && isImageAttachment(m.attachment)),
    [messages]
  );
  const files = useMemo(
    () => messages.filter((m) => m.attachment && !isImageAttachment(m.attachment)),
    [messages]
  );

  const onlineStatus =
    presence[peerId || ""] ?? profile?.presenceStatus ?? conversation?.otherUserPresence ?? "OFFLINE";
  const displayName = profile?.fullName || conversation?.name || "";
  const displayUsername = profile?.username ? `@${profile.username}` : "";
  const avatarUrl = profile?.avatarUrl || conversation?.avatarUrl || null;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border/40">
        <h3 className="text-sm font-semibold tracking-tight">Details</h3>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close details"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {!conversation ? (
          <p className="text-xs text-muted-foreground text-center py-10">Select a conversation</p>
        ) : loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
          </div>
        ) : (
          <div className="space-y-5 px-4 py-4">
            {/* Identity */}
            <div className="flex flex-col items-center text-center">
              <span className="relative">
                <span className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center text-2xl font-bold text-indigo-400 overflow-hidden">
                  {isRoom ? (
                    <Users className="w-8 h-8" />
                  ) : avatarUrl ? (
                    <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                  ) : (
                    displayName?.charAt(0)?.toUpperCase() || "?"
                  )}
                </span>
                {!isRoom && (
                  <span
                    className={cn(
                      "absolute bottom-1 right-1 w-4 h-4 rounded-full ring-4 ring-background",
                      onlineStatus === "ONLINE"
                        ? "bg-emerald-500"
                        : onlineStatus === "AWAY"
                          ? "bg-amber-500"
                          : "bg-muted-foreground/40"
                    )}
                  />
                )}
              </span>
              <h4 className="mt-3 text-base font-semibold text-foreground">{displayName}</h4>
              {!isRoom && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {displayUsername}
                  <span className="mx-1.5 text-muted-foreground/40">·</span>
                  <span
                    className={
                      onlineStatus === "ONLINE"
                        ? "text-emerald-500"
                        : onlineStatus === "AWAY"
                          ? "text-amber-500"
                          : ""
                    }
                  >
                    {presenceText(onlineStatus, profile?.lastActiveAt ?? conversation?.otherUserLastActiveAt)}
                  </span>
                </p>
              )}
              {isRoom && room && (
                <p className="text-xs text-muted-foreground mt-0.5">{room.participantCount} members</p>
              )}
            </div>

            {/* About — real profile data only */}
            {!isRoom &&
              profile &&
              (profile.bio || profile.jobTitle || profile.company || profile.location) && (
                <section className="rounded-xl border border-border/40 p-3.5">
                  <h5 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60 mb-2">
                    About
                  </h5>
                  <div className="space-y-1 text-sm">
                    {profile.jobTitle && (
                      <p className="text-foreground/90">
                        {[profile.jobTitle, profile.company].filter(Boolean).join(" at ")}
                      </p>
                    )}
                    {profile.location && <p className="text-xs text-muted-foreground">{profile.location}</p>}
                    {profile.bio && (
                      <p className="text-xs text-muted-foreground leading-relaxed">{profile.bio}</p>
                    )}
                  </div>
                </section>
              )}

            {/* Room description */}
            {isRoom && room?.description && (
              <section className="rounded-xl border border-border/40 p-3.5">
                <h5 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60 mb-1.5">
                  About
                </h5>
                <p className="text-sm text-foreground/90 leading-relaxed">{room.description}</p>
              </section>
            )}

            {/* Members (rooms) */}
            {isRoom && room && room.participants.length > 0 && (
              <section>
                <h5 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60 mb-2">
                  Members · {room.participants.length}
                </h5>
                <div className="flex -space-x-2">
                  {room.participants.slice(0, 6).map((p) => (
                    <span
                      key={p.userId}
                      title={p.fullName}
                      className="w-8 h-8 rounded-full ring-2 ring-background bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-400 flex items-center justify-center text-[10px] font-bold overflow-hidden"
                    >
                      {p.avatarUrl ? (
                        <img src={p.avatarUrl} alt={p.fullName} className="w-full h-full object-cover" />
                      ) : (
                        p.fullName?.charAt(0)?.toUpperCase() || "?"
                      )}
                    </span>
                  ))}
                  {room.participants.length > 6 && (
                    <span className="w-8 h-8 rounded-full ring-2 ring-background bg-muted text-muted-foreground flex items-center justify-center text-[10px] font-bold">
                      +{room.participants.length - 6}
                    </span>
                  )}
                </div>
              </section>
            )}

            {/* Project (rooms) */}
            {isRoom && room?.projectId && (
              <section className="rounded-xl border border-border/40 p-3.5">
                <h5 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60 mb-2">
                  Project
                </h5>
                <button
                  onClick={() => navigate(`/board/${room.projectId}`)}
                  className="flex items-center gap-2.5 w-full text-left group"
                >
                  <span className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <FolderKanban className="w-4 h-4" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium truncate">
                      {room.projectName || "Project"}
                    </span>
                    <span className="block text-[11px] text-indigo-500 group-hover:underline">
                      View Project <ChevronRight className="w-3 h-3 inline" />
                    </span>
                  </span>
                </button>
              </section>
            )}

            {/* Shared media */}
            {media.length > 0 && (
              <section>
                <h5 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60 mb-2">
                  Shared media
                </h5>
                <div className="grid grid-cols-3 gap-1.5">
                  {(showAllMedia ? media : media.slice(0, 9)).map((m) => (
                    <AuthorizedImage
                      key={m.id}
                      url={m.attachment!.url}
                      alt={m.attachment!.fileName}
                      className="w-full aspect-square object-cover rounded-lg border border-border/40"
                    />
                  ))}
                </div>
                {media.length > 9 && (
                  <button
                    onClick={() => setShowAllMedia((v) => !v)}
                    className="mt-2 text-[11px] text-indigo-500 hover:underline"
                  >
                    {showAllMedia ? "Show less" : `View all (${media.length})`}
                  </button>
                )}
              </section>
            )}

            {/* Shared files */}
            {files.length > 0 && (
              <section>
                <h5 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60 mb-2">
                  Shared files
                </h5>
                <div className="space-y-1.5">
                  {(showAllFiles ? files : files.slice(0, 5)).map((m) => (
                    <FileRow key={m.id} attachment={m.attachment!} />
                  ))}
                </div>
                {files.length > 5 && (
                  <button
                    onClick={() => setShowAllFiles((v) => !v)}
                    className="mt-2 text-[11px] text-indigo-500 hover:underline"
                  >
                    {showAllFiles ? "Show less" : `View all (${files.length})`}
                  </button>
                )}
              </section>
            )}

            {media.length === 0 && files.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6 flex items-center justify-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5" /> No shared files yet
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
