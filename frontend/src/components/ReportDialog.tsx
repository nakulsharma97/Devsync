import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Flag, AlertTriangle } from "lucide-react";
import { adminService } from "@/services/adminService";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";

export type ReportEntityType = "USER" | "PROJECT" | "POST" | "COMMENT" | "MESSAGE";

const REASONS = [
  "SPAM",
  "HARASSMENT",
  "INAPPROPRIATE_CONTENT",
  "FAKE_ACCOUNT",
  "COPYRIGHT",
  "ABUSE",
  "OTHER",
] as const;

/**
 * Moderation report dialog. Submits to POST /api/reports and shows a clear
 * success/error state. Used on user profiles, posts and projects.
 */
export function ReportDialog({
  open,
  onOpenChange,
  entityType,
  entityId,
  entityLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: ReportEntityType;
  entityId: string;
  entityLabel: string;
}) {
  const [reason, setReason] = useState<string>("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setReason("");
    setDescription("");
  };

  const submit = async () => {
    if (!reason || submitting) return;
    setSubmitting(true);
    try {
      await adminService.createReport({
        entityType,
        entityId,
        reason: reason as (typeof REASONS)[number],
        description: description.trim() || undefined,
      });
      toast.success("Report submitted. Our team will review it.");
      onOpenChange(false);
      reset();
    } catch (err) {
      toast.error(getErrorMessage(err, "Unable to submit report."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-red-500" />
            Report {entityLabel}
          </DialogTitle>
          <DialogDescription>
            Tell us what's wrong. Reports are reviewed by our moderation team.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="report-reason" className="text-xs">
              Reason
            </Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="report-reason" className="w-full text-sm">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="report-details" className="text-xs">
              Details <span className="text-muted-foreground/60">(optional)</span>
            </Label>
            <Input
              id="report-details"
              placeholder="Anything else we should know?"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 2000))}
            />
          </div>
          {!reason && (
            <p role="alert" className="flex items-center gap-1.5 text-xs text-red-500">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              Please select a reason.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={!reason || submitting}
            className="bg-red-500 text-white hover:bg-red-600"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Flag className="h-4 w-4 mr-1" />
            )}
            Submit Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
