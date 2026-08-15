import { useEffect, useState, type FormEvent } from "react";
import { Star, MessageSquarePlus, Send, Loader2, CheckCircle2, Clock, XCircle } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";
import {
  reviewService,
  type CreateFeedbackInput,
  type CreateReviewInput,
  type MyFeedback,
  type MyReview,
} from "@/services/reviewService";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const REVIEW_CATEGORIES = [
  { value: "OVERALL_EXPERIENCE", label: "Overall Experience" },
  { value: "PROJECT_MANAGEMENT", label: "Project Management" },
  { value: "MESSAGING", label: "Messaging" },
  { value: "KANBAN", label: "Kanban" },
  { value: "GITHUB_INTEGRATION", label: "GitHub Integration" },
  { value: "UI_UX", label: "UI/UX" },
  { value: "PERFORMANCE", label: "Performance" },
  { value: "OTHER", label: "Other" },
] as const;

const FEEDBACK_CATEGORIES = [
  { value: "BUG", label: "Bug" },
  { value: "FEATURE_REQUEST", label: "Feature Request" },
  { value: "UI_UX", label: "UI/UX" },
  { value: "PERFORMANCE", label: "Performance" },
  { value: "SECURITY", label: "Security" },
  { value: "GENERAL", label: "General" },
] as const;

const REVIEW_STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  APPROVED: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  REJECTED: "bg-red-500/10 text-red-500 border-red-500/20",
};

const FEEDBACK_STATUS_STYLES: Record<string, string> = {
  OPEN: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  IN_REVIEW: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  RESOLVED: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  CLOSED: "bg-muted text-muted-foreground border-border/50",
};

function StarInput({
  value,
  onChange,
  disabled,
  ariaLabel,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  ariaLabel: string;
}) {
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label={ariaLabel}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${ariaLabel}: ${star} star${star === 1 ? "" : "s"}`}
          disabled={disabled}
          onClick={() => onChange(star)}
          className="p-0.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60"
        >
          <Star
            className={`w-7 h-7 transition-colors ${
              star <= value
                ? "fill-amber-500 text-amber-500"
                : "text-muted-foreground/40 hover:text-amber-500/70"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export default function Feedback() {
  const { user } = useAuth();

  // ── Public review state ──
  const [loadingReview, setLoadingReview] = useState(true);
  const [myReview, setMyReview] = useState<MyReview | null>(null);
  const [editing, setEditing] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewCategory, setReviewCategory] = useState("OVERALL_EXPERIENCE");
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [submittingReview, setSubmittingReview] = useState(false);

  // ── Private feedback state ──
  const [feedbackCategory, setFeedbackCategory] = useState("GENERAL");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [myFeedback, setMyFeedback] = useState<MyFeedback[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([reviewService.getMyReview(), reviewService.getMyFeedback()])
      .then(([review, feedback]) => {
        if (cancelled) return;
        setMyReview(review);
        setMyFeedback(feedback);
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load your feedback");
      })
      .finally(() => {
        if (!cancelled) setLoadingReview(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const startEdit = () => {
    if (!myReview) return;
    setReviewRating(myReview.rating);
    setReviewTitle(myReview.title ?? "");
    setReviewComment(myReview.comment);
    setReviewCategory(myReview.category);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setReviewError(null);
  };

  const submitReview = async (e: FormEvent) => {
    e.preventDefault();
    setReviewError(null);

    if (reviewRating < 1 || reviewRating > 5) {
      setReviewError("Please select a rating between 1 and 5 stars.");
      return;
    }
    if (!reviewComment.trim()) {
      setReviewError("Please write a short review.");
      return;
    }
    if (reviewComment.trim().length > 2000) {
      setReviewError("Review must be at most 2000 characters.");
      return;
    }

    const input: CreateReviewInput = {
      rating: reviewRating,
      title: reviewTitle.trim() || undefined,
      comment: reviewComment.trim(),
      category: reviewCategory,
    };

    setSubmittingReview(true);
    try {
      const updated = editing
        ? await reviewService.updateMyReview(input)
        : await reviewService.submitReview(input);
      setMyReview(updated);
      setEditing(false);
      toast.success("Review submitted. It will appear on the landing page once approved.");
    } catch (err) {
      const message = getErrorMessage(err, "Failed to submit review");
      if (message.includes("already submitted")) {
        // The server says we already have a review — load it and switch to edit mode.
        try {
          const existing = await reviewService.getMyReview();
          if (existing) {
            setMyReview(existing);
            setReviewRating(existing.rating);
            setReviewTitle(existing.title ?? "");
            setReviewComment(existing.comment);
            setReviewCategory(existing.category);
            setEditing(true);
            setReviewError("You already submitted feedback. You can edit your existing review instead.");
            return;
          }
        } catch {
          /* ignore */
        }
      }
      setReviewError(message);
    } finally {
      setSubmittingReview(false);
    }
  };

  const submitFeedback = async (e: FormEvent) => {
    e.preventDefault();
    setFeedbackError(null);

    if (!feedbackMessage.trim()) {
      setFeedbackError("Please describe your feedback.");
      return;
    }
    if (feedbackMessage.trim().length > 4000) {
      setFeedbackError("Feedback must be at most 4000 characters.");
      return;
    }

    const input: CreateFeedbackInput = {
      category: feedbackCategory,
      message: feedbackMessage.trim(),
      rating: feedbackRating > 0 ? feedbackRating : undefined,
    };

    setSubmittingFeedback(true);
    try {
      const saved = await reviewService.submitFeedback(input);
      setMyFeedback((prev) => [saved, ...prev]);
      setFeedbackMessage("");
      setFeedbackRating(0);
      toast.success("Thank you — your feedback has been sent to the team.");
    } catch (err) {
      setFeedbackError(getErrorMessage(err, "Failed to submit feedback"));
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const reviewStatusBadge = (status: string) => (
    <Badge variant="outline" className={REVIEW_STATUS_STYLES[status] || ""}>
      {status === "PENDING" && <Clock className="w-3 h-3 mr-1" />}
      {status === "APPROVED" && <CheckCircle2 className="w-3 h-3 mr-1" />}
      {status === "REJECTED" && <XCircle className="w-3 h-3 mr-1" />}
      {status === "PENDING" ? "Pending approval" : status === "APPROVED" ? "Published" : "Not approved"}
    </Badge>
  );

  if (loadingReview) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
          <p className="text-sm text-muted-foreground">Loading your feedback...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative space-y-8 max-w-3xl">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-5 h-5 rounded-md bg-accent/10 flex items-center justify-center">
            <MessageSquarePlus className="w-3 h-3 text-accent" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Feedback</h1>
        </div>
        <p className="ml-7 text-sm text-muted-foreground">
          Share your experience with DevSync and help shape what we build next
        </p>
      </div>

      {/* ── Public review ── */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-foreground">Public Review</CardTitle>
          <CardDescription className="text-xs">
            Approved reviews appear on the DevSync landing page. One review per account — you can edit it anytime.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {myReview && !editing ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <StarInput value={myReview.rating} onChange={() => {}} disabled ariaLabel="Review rating" />
                  {myReview.title && (
                    <p className="text-sm font-semibold mt-2">{myReview.title}</p>
                  )}
                  <p className="text-sm text-muted-foreground mt-1 italic">
                    &ldquo;{myReview.comment}&rdquo;
                  </p>
                </div>
                {reviewStatusBadge(myReview.status)}
              </div>
              {myReview.status === "REJECTED" && (
                <p className="text-xs text-muted-foreground">
                  Your review was not approved. You can edit it and resubmit.
                </p>
              )}
              <Button size="sm" variant="outline" onClick={startEdit}>
                Edit Review
              </Button>
            </div>
          ) : (
            <form onSubmit={submitReview} className="space-y-4" noValidate>
              <div>
                <Label htmlFor="review-rating" className="mb-1.5 block text-xs">
                  Rating <span className="text-destructive">*</span>
                </Label>                  <StarInput value={reviewRating} onChange={setReviewRating} disabled={submittingReview} ariaLabel="Review rating" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="review-title" className="mb-1.5 block text-xs">
                    Title <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="review-title"
                    value={reviewTitle}
                    onChange={(e) => setReviewTitle(e.target.value)}
                    maxLength={120}
                    placeholder="e.g. Smooth onboarding"
                    disabled={submittingReview}
                  />
                </div>
                <div>
                  <Label htmlFor="review-category" className="mb-1.5 block text-xs">
                    Category <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Select
                    value={reviewCategory}
                    onValueChange={setReviewCategory}
                    disabled={submittingReview}
                  >
                    <SelectTrigger id="review-category" className="w-full">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {REVIEW_CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="review-comment" className="mb-1.5 block text-xs">
                  Review <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="review-comment"
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={4}
                  maxLength={2000}
                  placeholder="What has your experience with DevSync been like?"
                  disabled={submittingReview}
                />
                <p className="text-[10px] text-muted-foreground mt-1 text-right">
                  {reviewComment.length}/2000
                </p>
              </div>

              {reviewError && (
                <p className="text-xs text-destructive" role="alert">
                  {reviewError}
                </p>
              )}

              <div className="flex items-center gap-2">
                <Button type="submit" size="sm" disabled={submittingReview}>
                  {submittingReview ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
                  ) : (
                    <Send className="w-3.5 h-3.5 mr-2" />
                  )}
                  {editing ? "Update Review" : "Submit Review"}
                </Button>
                {editing && (
                  <Button type="button" size="sm" variant="ghost" onClick={cancelEdit} disabled={submittingReview}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* ── Private feedback ── */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-foreground">Private Feedback</CardTitle>
          <CardDescription className="text-xs">
            Private feedback is only visible to the DevSync team — it never appears on the landing page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submitFeedback} className="space-y-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="feedback-category" className="mb-1.5 block text-xs">
                  Category <span className="text-destructive">*</span>
                </Label>
                <Select value={feedbackCategory} onValueChange={setFeedbackCategory} disabled={submittingFeedback}>
                  <SelectTrigger id="feedback-category" className="w-full">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {FEEDBACK_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="feedback-rating" className="mb-1.5 block text-xs">
                  Rating <span className="text-muted-foreground">(optional)</span>
                </Label>
                <StarInput value={feedbackRating} onChange={setFeedbackRating} disabled={submittingFeedback} ariaLabel="Feedback rating" />
              </div>
            </div>

            <div>
              <Label htmlFor="feedback-message" className="mb-1.5 block text-xs">
                Message <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="feedback-message"
                value={feedbackMessage}
                onChange={(e) => setFeedbackMessage(e.target.value)}
                rows={4}
                maxLength={4000}
                placeholder="Tell us about a bug, a feature you'd love, or anything else..."
                disabled={submittingFeedback}
              />
            </div>

            {feedbackError && (
              <p className="text-xs text-destructive" role="alert">
                {feedbackError}
              </p>
            )}

            <Button type="submit" size="sm" variant="outline" disabled={submittingFeedback}>
              {submittingFeedback ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
              ) : (
                <Send className="w-3.5 h-3.5 mr-2" />
              )}
              Submit Feedback
            </Button>
          </form>

          {myFeedback.length > 0 && (
            <div className="mt-6 space-y-3">
              <p className="text-xs font-semibold text-foreground">Your submissions</p>
              {myFeedback.map((f) => (
                <div key={f.id} className="border border-border/40 rounded-xl p-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap mb-1.5">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {FEEDBACK_CATEGORIES.find((c) => c.value === f.category)?.label ?? f.category}
                      </Badge>
                      {f.rating ? (
                        <span className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <Star
                              key={i}
                              aria-hidden
                              className={`w-3 h-3 ${
                                i <= (f.rating ?? 0)
                                  ? "fill-amber-500 text-amber-500"
                                  : "text-muted-foreground/30"
                              }`}
                            />
                          ))}
                        </span>
                      ) : null}
                    </div>
                    <Badge variant="outline" className={FEEDBACK_STATUS_STYLES[f.status] || ""}>
                      {f.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <p className="text-sm text-foreground">{f.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-1.5">
                    Submitted {new Date(f.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Signed in as {user?.fullName || user?.email}
      </p>
    </div>
  );
}
