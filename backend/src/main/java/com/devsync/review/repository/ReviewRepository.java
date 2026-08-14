package com.devsync.review.repository;

import com.devsync.review.entity.Review;
import com.devsync.review.entity.ReviewStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ReviewRepository extends JpaRepository<Review, String> {

    Optional<Review> findByUserId(String userId);

    boolean existsByUserId(String userId);

    long countByStatus(ReviewStatus status);

    List<Review> findByStatusOrderByCreatedAtDesc(ReviewStatus status);

    @Query("SELECT r FROM Review r WHERE r.status = :status AND r.featured = true ORDER BY r.createdAt DESC")
    List<Review> findFeatured(@Param("status") ReviewStatus status, Pageable pageable);

    @Query("SELECT r FROM Review r WHERE r.status = :status ORDER BY r.createdAt DESC")
    List<Review> findApproved(@Param("status") ReviewStatus status, Pageable pageable);

    /** Star distribution (1..5) among reviews in a given status — single GROUP BY query. */
    @Query("SELECT r.rating, COUNT(r) FROM Review r WHERE r.status = :status GROUP BY r.rating")
    List<Object[]> countGroupedByRating(@Param("status") ReviewStatus status);

    @Query("SELECT r FROM Review r JOIN User u ON r.userId = u.id WHERE " +
            "(:status IS NULL OR r.status = :status) AND " +
            "(:search IS NULL OR LOWER(r.comment) LIKE LOWER(CONCAT('%', :search, '%')) " +
            "OR LOWER(COALESCE(r.title, '')) LIKE LOWER(CONCAT('%', :search, '%')) " +
            "OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :search, '%')) " +
            "OR LOWER(COALESCE(u.username, '')) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Review> searchAdminReviews(@Param("search") String search,
                                    @Param("status") ReviewStatus status,
                                    Pageable pageable);
}
