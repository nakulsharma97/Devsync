package com.devsync.feed.repository;

import com.devsync.feed.entity.Post;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Collection;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Set;

@Repository
public interface PostRepository extends JpaRepository<Post, String> {
    Page<Post> findAllByOrderByCreatedAtDesc(Pageable pageable);
    List<Post> findAllByOrderByCreatedAtDesc();
    List<Post> findByUserIdOrderByCreatedAtDesc(String userId);
    Page<Post> findByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);
    long countByUserId(String userId);

    @Query("SELECT p.userId, COUNT(p) FROM Post p WHERE p.userId IN :userIds GROUP BY p.userId")
    List<Object[]> countPostsByUserIdIn(@Param("userIds") Set<String> userIds);

    @Query("SELECT p FROM Post p WHERE p.hidden = false AND " +
            "(:keyword IS NULL OR LOWER(p.content) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    List<Post> searchPosts(@Param("keyword") String keyword, Pageable pageable);

    long countByUserIdIn(Collection<String> userIds);

}
