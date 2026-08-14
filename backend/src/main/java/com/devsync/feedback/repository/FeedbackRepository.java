package com.devsync.feedback.repository;

import com.devsync.feedback.entity.Feedback;
import com.devsync.feedback.entity.FeedbackCategory;
import com.devsync.feedback.entity.FeedbackStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface FeedbackRepository extends JpaRepository<Feedback, String> {

    List<Feedback> findByUserIdOrderByCreatedAtDesc(String userId);

    long countByStatus(FeedbackStatus status);

    @Query("SELECT f FROM Feedback f JOIN User u ON f.userId = u.id WHERE " +
            "(:status IS NULL OR f.status = :status) AND " +
            "(:category IS NULL OR f.category = :category) AND " +
            "(:search IS NULL OR LOWER(f.message) LIKE LOWER(CONCAT('%', :search, '%')) " +
            "OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :search, '%')) " +
            "OR LOWER(COALESCE(u.username, '')) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Feedback> searchAdminFeedback(@Param("search") String search,
                                       @Param("status") FeedbackStatus status,
                                       @Param("category") FeedbackCategory category,
                                       Pageable pageable);
}
