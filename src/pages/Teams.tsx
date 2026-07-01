import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Users, Plus, Check, X } from "lucide-react";
import {
  teamService,
  type Team,
  type TeamApplication,
} from "@/services/teamService";
import { useDevSyncAuth } from "@/contexts/AuthContext";

export default function Teams() {
  const { user } = useDevSyncAuth();
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showApply, setShowApply] = useState<number | null>(null);
  const [showApplicants, setShowApplicants] = useState<number | null>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    rolesNeeded: "",
  });
  const [applyForm, setApplyForm] = useState({ roleApplied: "", message: "" });
  const [creating, setCreating] = useState(false);

  const fetchTeams = async () => {
    try {
      const data = await teamService.getOpen();
      setTeams(data);
    } catch {
      // API not available
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    setCreating(true);
    try {
      await teamService.create({
        title: form.title,
        description: form.description,
        rolesNeeded: form.rolesNeeded
          ? form.rolesNeeded.split(",").map((r) => r.trim())
          : [],
      });
      setShowCreate(false);
      setForm({ title: "", description: "", rolesNeeded: "" });
      await fetchTeams();
    } catch (err) {
      console.error("Failed to create team:", err);
    } finally {
      setCreating(false);
    }
  };

  const handleApply = async (teamId: number) => {
    try {
      await teamService.apply(teamId, applyForm);
      setShowApply(null);
      setApplyForm({ roleApplied: "", message: "" });
    } catch (err) {
      console.error("Failed to apply:", err);
    }
  };

  const loadApplications = async (teamId: number) => {
    setShowApplicants(teamId);
    try {
      const data = await teamService.getApplications(teamId);
      setApplications(data);
    } catch {
      setApplications([]);
    }
  };

  const handleAccept = async (appId: number) => {
    try {
      await teamService.acceptApplication(appId);
      if (showApplicants) loadApplications(showApplicants);
    } catch (err) {
      console.error(err);
    }
  };

  const handleReject = async (appId: number) => {
    try {
      await teamService.rejectApplication(appId);
      if (showApplicants) loadApplications(showApplicants);
    } catch (err) {
      console.error(err);
    }
  };

  const isOwner = (team: any) =>
    team.owner?.id === user?.id || team.ownerId === user?.id;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Team Finder
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Find collaborators for your next project
          </p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)} className="text-sm">
          <Plus className="w-4 h-4 mr-1.5" />
          New Team
        </Button>
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="border border-border rounded-lg p-5 animate-pulse"
            >
              <div className="h-3 bg-secondary rounded w-1/4 mb-3" />
              <div className="h-2 bg-secondary rounded w-2/3" />
            </div>
          ))}
        </div>
      )}

      {!loading && teams.length === 0 && (
        <div className="border border-border rounded-lg p-12 flex flex-col items-center text-center gap-3">
          <Users className="w-8 h-8 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">
            No teams looking for members
          </h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            Create a team and find collaborators.
          </p>
          <Button
            size="sm"
            onClick={() => setShowCreate(true)}
            className="mt-2 text-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Create Team
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {teams.map((team: any) => (
          <div key={team.id} className="border border-border rounded-lg p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-foreground">
                  {team.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {team.description}
                </p>
                {team.rolesNeeded && team.rolesNeeded.length > 0 && (
                  <div className="flex gap-1.5 mt-3 flex-wrap">
                    {team.rolesNeeded.map((role: string) => (
                      <span
                        key={role}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground"
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2 ml-4 shrink-0">
                {isOwner(team) ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadApplications(team.id)}
                    className="text-xs"
                  >
                    Applicants
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => setShowApply(team.id)}
                    className="text-xs"
                  >
                    Apply
                  </Button>
                )}
              </div>
            </div>

            {/* Applicants Panel */}
            {showApplicants === team.id && (
              <div className="mt-4 pt-3 border-t border-border space-y-2">
                <p className="text-xs font-medium text-foreground">
                  Applications
                </p>
                {applications.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No applications yet.
                  </p>
                )}
                {applications.map((app: any) => (
                  <div
                    key={app.id}
                    className="flex items-center justify-between py-2"
                  >
                    <div>
                      <p className="text-xs text-foreground">
                        {app.roleApplied || "General"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {app.message}
                      </p>
                      <span
                        className={`text-[10px] ${
                          app.status === "PENDING"
                            ? "text-yellow-600"
                            : app.status === "ACCEPTED"
                              ? "text-green-600"
                              : "text-red-600"
                        }`}
                      >
                        {app.status}
                      </span>
                    </div>
                    {app.status === "PENDING" && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleAccept(app.id)}
                          className="p-1 hover:text-green-600 transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleReject(app.id)}
                          className="p-1 hover:text-red-600 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Create Team Modal */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold tracking-tight">
              New Team
            </DialogTitle>
            <DialogDescription className="text-sm">
              Find collaborators for your project.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Title
              </label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="text-sm"
                placeholder="Build a web app"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Description
              </label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={3}
                className="text-sm resize-none"
                placeholder="What are you building?"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Roles Needed (comma-separated)
              </label>
              <Input
                value={form.rolesNeeded}
                onChange={(e) =>
                  setForm({ ...form, rolesNeeded: e.target.value })
                }
                className="text-sm"
                placeholder="React Dev, Designer, PM"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCreate(false)}
                className="text-sm"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={creating}
                className="text-sm"
              >
                {creating ? "Creating..." : "Create Team"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Apply Modal */}
      <Dialog
        open={showApply !== null}
        onOpenChange={() => setShowApply(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold tracking-tight">
              Apply to Team
            </DialogTitle>
            <DialogDescription className="text-sm">
              Tell them why you'd be a great fit.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Role
              </label>
              <Input
                value={applyForm.roleApplied}
                onChange={(e) =>
                  setApplyForm({ ...applyForm, roleApplied: e.target.value })
                }
                className="text-sm"
                placeholder="Frontend Developer"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Message
              </label>
              <Textarea
                value={applyForm.message}
                onChange={(e) =>
                  setApplyForm({ ...applyForm, message: e.target.value })
                }
                rows={3}
                className="text-sm resize-none"
                placeholder="I'd love to join because..."
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowApply(null)}
                className="text-sm"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => showApply && handleApply(showApply)}
                className="text-sm"
              >
                Submit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
