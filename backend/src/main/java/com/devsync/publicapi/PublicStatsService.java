package com.devsync.publicapi;

import com.devsync.github.repository.ProjectGitHubLinkRepository;
import com.devsync.kanban.repository.TaskRepository;
import com.devsync.message.repository.MessageRepository;
import com.devsync.project.entity.Project;
import com.devsync.project.repository.ProjectMemberRepository;
import com.devsync.project.repository.ProjectRepository;
import com.devsync.publicapi.dto.PublicReviewResponse;
import com.devsync.publicapi.dto.PublicReviewsResponse;
import com.devsync.publicapi.dto.PublicStatsResponse;
import com.devsync.publicapi.dto.RatingSummaryResponse;
import com.devsync.review.entity.Review;
import com.devsync.review.entity.ReviewStatus;
import com.devsync.review.repository.ReviewRepository;
import com.devsync.user.entity.User;
import com.devsync.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Public-facing aggregates for the landing page. Every metric is a single COUNT
 * query — nothing is loaded into memory. No personal data is ever exposed.
 */
@Service
@RequiredArgsConstructor
public class PublicStatsService {

    private static final int PUBLIC_REVIEW_LIMIT = 20;

    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final TaskRepository taskRepository;
    private final MessageRepository messageRepository;
    private final ProjectGitHubLinkRepository githubLinkRepository;
    private final ReviewRepository reviewRepository;

    @Transactional(readOnly = true)
    public PublicStatsResponse getStats() {
        long approvedReviews = reviewRepository.countByStatus(ReviewStatus.APPROVED);
        return PublicStatsResponse.builder()
                .users(userRepository.countByDeletedFalse())
                .projects(projectRepository.countByDeletedFalse())
                .publicProjects(projectRepository.countByVisibilityAndDeletedFalse(Project.ProjectVisibility.PUBLIC))
                .completedProjects(projectRepository.countByStatusAndDeletedFalse(Project.ProjectStatus.COMPLETED))
                .tasks(taskRepository.count())
                .tasksCompleted(taskRepository.countCompletedTasks())
                .members(projectMemberRepository.count())
                .messages(messageRepository.count())
                .githubRepos(githubLinkRepository.count())
                .reviews(approvedReviews)
                .averageRating(round1(averageApprovedRating(approvedReviews)))
                .build();
    }

    @Transactional(readOnly = true)
    public PublicReviewsResponse getReviews() {
        List<Review> approved = reviewRepository.findApproved(ReviewStatus.APPROVED, PageRequest.of(0, PUBLIC_REVIEW_LIMIT));
        List<Review> featured = reviewRepository.findFeatured(ReviewStatus.APPROVED, PageRequest.of(0, 6));
        Map<String, User> userMap = loadUsers(approved, featured);

        RatingSummaryResponse summary = RatingSummaryResponse.builder()
                .averageRating(round1(averageApprovedRating(reviewRepository.countByStatus(ReviewStatus.APPROVED))))
                .totalReviews(reviewRepository.countByStatus(ReviewStatus.APPROVED))
                .distribution(distribution())
                .build();

        return PublicReviewsResponse.builder()
                .reviews(approved.stream().map(r -> toPublic(r, userMap.get(r.getUserId()))).toList())
                .featured(featured.stream().map(r -> toPublic(r, userMap.get(r.getUserId()))).toList())
                .summary(summary)
                .build();
    }

    private double averageApprovedRating(long count) {
        if (count == 0) return 0;
        List<Object[]> rows = reviewRepository.countGroupedByRating(ReviewStatus.APPROVED);
        long total = 0;
        long sum = 0;
        for (Object[] row : rows) {
            long rating = ((Number) row[0]).longValue();
            long n = ((Number) row[1]).longValue();
            sum += rating * n;
            total += n;
        }
        if (total == 0) return 0;
        return (double) sum / total;
    }

    private Map<Integer, Long> distribution() {
        Map<Integer, Long> dist = new HashMap<>();
        for (int i = 1; i <= 5; i++) dist.put(i, 0L);
        for (Object[] row : reviewRepository.countGroupedByRating(ReviewStatus.APPROVED)) {
            int rating = ((Number) row[0]).intValue();
            dist.put(rating, ((Number) row[1]).longValue());
        }
        return dist;
    }

    private Map<String, User> loadUsers(List<Review> approved, List<Review> featured) {
        Map<String, String> ids = new HashMap<>();
        for (Review r : approved) ids.putIfAbsent(r.getUserId(), r.getUserId());
        for (Review r : featured) ids.putIfAbsent(r.getUserId(), r.getUserId());
        if (ids.isEmpty()) return Map.of();
        return userRepository.findAllById(ids.keySet()).stream()
                .collect(java.util.stream.Collectors.toMap(User::getId, u -> u));
    }

    private PublicReviewResponse toPublic(Review review, User user) {
        String displayName = user != null ? user.getFullName() : "Anonymous";
        String username = user != null ? user.getUsername() : null;
        return PublicReviewResponse.builder()
                .id(review.getId())
                .rating(review.getRating())
                .title(review.getTitle())
                .comment(review.getComment())
                .category(review.getCategory().name())
                .displayName(displayName)
                .username(username)
                .avatarUrl(user != null ? user.getAvatarUrl() : null)
                .jobTitle(user != null ? user.getJobTitle() : null)
                .company(user != null ? user.getCompany() : null)
                .createdAt(review.getCreatedAt())
                .build();
    }

    private double round1(double value) {
        return Math.round(value * 10.0) / 10.0;
    }
}
