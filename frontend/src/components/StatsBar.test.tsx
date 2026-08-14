import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import StatsBar from "./StatsBar";
import type { PublicStats } from "@/services/landingService";

// The count-up animation runs over ~1.6s via rAF; mock it to render the final
// value immediately so assertions are deterministic.
vi.mock("@/hooks/useCountUp", () => ({
  useCountUp: (target: number) => target.toLocaleString("en-US"),
}));

const sampleStats: PublicStats = {
  users: 127,
  projects: 42,
  publicProjects: 15,
  completedProjects: 8,
  tasks: 318,
  tasksCompleted: 141,
  members: 96,
  messages: 1540,
  githubRepos: 7,
  reviews: 3,
  averageRating: 4.7,
};

describe("StatsBar", () => {
  it("renders the real server-computed numbers", () => {
    render(<StatsBar stats={sampleStats} />);

    expect(screen.getByText("Registered Developers")).toBeInTheDocument();
    expect(screen.getByText("127")).toBeInTheDocument();
    expect(screen.getByText("Projects")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("Tasks Completed")).toBeInTheDocument();
    expect(screen.getByText("141")).toBeInTheDocument();
    expect(screen.getByText("Messages Sent")).toBeInTheDocument();
    expect(screen.getByText("1,540")).toBeInTheDocument();
  });

  it("renders derived sub-labels from real data", () => {
    render(<StatsBar stats={sampleStats} />);
    expect(screen.getByText("15 public projects")).toBeInTheDocument();
    expect(screen.getByText("8 completed")).toBeInTheDocument();
    expect(screen.getByText("of 318 total tasks")).toBeInTheDocument();
    expect(screen.getByText("96 collaborators")).toBeInTheDocument();
  });

  it("handles zero data honestly without fabricated numbers", () => {
    render(
      <StatsBar
        stats={{
          users: 0,
          projects: 0,
          publicProjects: 0,
          completedProjects: 0,
          tasks: 0,
          tasksCompleted: 0,
          members: 0,
          messages: 0,
          githubRepos: 0,
          reviews: 0,
          averageRating: 0,
        }}
      />
    );

    expect(screen.getAllByText("0").length).toBeGreaterThanOrEqual(4);
    expect(screen.queryByText(/50,000|12,000|99.99/)).not.toBeInTheDocument();
  });

  it("shows skeleton placeholders while stats are loading", () => {
    render(<StatsBar stats={null} />);
    // No hardcoded numbers while loading.
    expect(screen.queryByText(/50,000|12,000|Registered Developers/)).not.toBeInTheDocument();
  });
});
