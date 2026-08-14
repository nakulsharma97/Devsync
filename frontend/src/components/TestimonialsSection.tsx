import { Star, Quote, MessageSquarePlus } from "lucide-react";
import { useNavigate } from "react-router";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import type { PublicReviewsResponse } from "@/services/landingService";

function Stars({ rating, className = "w-4 h-4" }: { rating: number; className?: string }) {
  return (
    <div className="flex gap-0.5" role="img" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          aria-hidden
          className={`${className} ${
            i <= rating
              ? "fill-amber-500 text-amber-500 dark:fill-amber-400 dark:text-amber-400"
              : "text-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

/**
 * What developers are saying — powered entirely by APPROVED reviews from
 * GET /api/public/reviews. When no reviews exist yet we show an honest empty
 * state instead of fabricated testimonials.
 */
export default function TestimonialsSection({
  reviews,
}: {
  reviews: PublicReviewsResponse | null;
}) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const loading = reviews === null;
  const all = reviews ? [...reviews.featured, ...reviews.reviews] : [];
  const deduped = all.filter(
    (review, index) => all.findIndex((r) => r.id === review.id) === index
  );
  const hasReviews = deduped.length > 0;
  const summary = reviews?.summary;

  const openFeedback = () => {
    if (isAuthenticated) {
      navigate("/feedback");
    } else {
      navigate("/auth");
    }
  };

  return (
    <section className="relative z-10 py-16 md:py-24 px-4 sm:px-6 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-accent/[0.02] to-transparent pointer-events-none" />
      <div className="mx-auto max-w-7xl relative">
        <ScrollReveal className="text-center mb-10">
          <span className="text-xs font-semibold tracking-[0.2em] uppercase bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 dark:from-amber-400 dark:via-orange-400 dark:to-red-400 bg-clip-text text-transparent mb-4 block">
            Reviews
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
            What developers are saying
          </h2>

          {!loading && summary && summary.totalReviews > 0 && (
            <div className="mt-4 inline-flex flex-col items-center gap-1">
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold tabular-nums">
                  {summary.averageRating.toFixed(1)}
                </span>
                <Stars rating={Math.round(summary.averageRating)} className="w-5 h-5" />
              </div>
              <p className="text-xs text-muted-foreground">
                Based on {summary.totalReviews} approved review{summary.totalReviews === 1 ? "" : "s"}
              </p>
            </div>
          )}
        </ScrollReveal>

        {loading ? (
          <div className="grid md:grid-cols-3 gap-6" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-2xl border border-border/40 bg-card/70 p-6 md:p-8">
                <div className="h-4 w-24 rounded bg-muted/40 animate-pulse mb-4" />
                <div className="space-y-2">
                  <div className="h-3 w-full rounded bg-muted/30 animate-pulse" />
                  <div className="h-3 w-11/12 rounded bg-muted/30 animate-pulse" />
                  <div className="h-3 w-3/4 rounded bg-muted/30 animate-pulse" />
                </div>
                <div className="flex items-center gap-3 pt-4 mt-4 border-t border-border/50">
                  <div className="w-10 h-10 rounded-full bg-muted/40 animate-pulse" />
                  <div className="space-y-1.5">
                    <div className="h-3 w-24 rounded bg-muted/40 animate-pulse" />
                    <div className="h-2.5 w-16 rounded bg-muted/30 animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : !hasReviews ? (
          <div className="max-w-xl mx-auto text-center rounded-2xl border border-border/40 bg-card/70 backdrop-blur-sm p-8 md:p-10">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center ring-1 ring-accent/20 mb-4">
              <MessageSquarePlus className="w-7 h-7 text-accent" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Your feedback can be the first</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              Be one of the first developers to share your DevSync experience.
              Approved reviews appear here on the landing page.
            </p>
            <Button onClick={openFeedback} size="sm">
              Share Your Feedback
            </Button>
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-3 gap-6">
              {deduped.map((review, index) => (
                <ScrollReveal
                  key={review.id}
                  delay={index * 0.1}
                  className="h-full"
                >
                  <div className="relative h-full bg-card/70 backdrop-blur-sm border border-border/40 rounded-2xl p-6 md:p-8 transition-all duration-300 hover:border-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1 group">
                    <Quote
                      aria-hidden
                      className="absolute top-5 right-5 w-8 h-8 text-indigo-500/10 dark:text-indigo-400/10 group-hover:text-indigo-500/25 dark:group-hover:text-indigo-400/25 transition-colors duration-300"
                    />

                    <Stars rating={review.rating} />

                    {review.title && (
                      <h3 className="text-sm font-semibold mt-3">{review.title}</h3>
                    )}

                    <p className="text-sm md:text-base text-foreground leading-relaxed my-3 italic">
                      &ldquo;{review.comment}&rdquo;
                    </p>

                    <div className="flex items-center gap-3 pt-4 border-t border-border/50">
                      <Avatar className="w-10 h-10 ring-1 ring-accent/20">
                        {review.avatarUrl ? <AvatarImage src={review.avatarUrl} alt="" /> : null}
                        <AvatarFallback className="bg-gradient-to-br from-accent/20 to-accent/5 text-xs font-medium text-accent">
                          {initials(review.displayName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {review.displayName}
                        </p>
                        {(review.jobTitle || review.company) && (
                          <p className="text-xs text-muted-foreground truncate">
                            {[review.jobTitle, review.company].filter(Boolean).join(", ")}
                          </p>
                        )}
                        <p className="text-[10px] text-muted-foreground/70">
                          {new Date(review.createdAt).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>

            {/* Star distribution */}
            {summary && summary.totalReviews > 0 && (
              <div className="max-w-md mx-auto mt-10 space-y-1.5">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = summary.distribution?.[String(star)] ?? 0;
                  const pct = summary.totalReviews > 0 ? (count / summary.totalReviews) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-3 text-xs">
                      <span className="w-6 shrink-0 text-muted-foreground flex items-center gap-1">
                        {star} <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                      </span>
                      <div className="flex-1 h-2 rounded-full bg-muted/40 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-amber-500/80"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-8 shrink-0 text-right tabular-nums text-muted-foreground">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="text-center mt-10">
              <Button variant="outline" size="sm" onClick={openFeedback}>
                <MessageSquarePlus className="w-4 h-4 mr-2" />
                Share Your Feedback
              </Button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
