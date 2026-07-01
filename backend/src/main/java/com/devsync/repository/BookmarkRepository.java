package com.devsync.repository;

import com.devsync.entity.Bookmark;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BookmarkRepository extends JpaRepository<Bookmark, Long> {
    List<Bookmark> findByUserIdOrderByCreatedAtDesc(Long userId);
    Optional<Bookmark> findByUserIdAndRepoUrl(Long userId, String repoUrl);
    boolean existsByUserIdAndRepoUrl(Long userId, String repoUrl);

    @Query("SELECT b FROM Bookmark b WHERE b.user.id = :userId AND " +
           "(LOWER(b.repoName) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(b.language) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(b.description) LIKE LOWER(CONCAT('%', :query, '%')))")
    List<Bookmark> searchByUserId(@Param("userId") Long userId, @Param("query") String query);
}
