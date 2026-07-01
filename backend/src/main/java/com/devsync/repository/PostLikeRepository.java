package com.devsync.repository;

import com.devsync.entity.PostLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PostLikeRepository extends JpaRepository<PostLike, Long> {
    Optional<PostLike> findByUserIdAndPostId(Long userId, Long postId);
    boolean existsByUserIdAndPostId(Long userId, Long postId);
    long countByPostId(Long postId);
    void deleteByUserIdAndPostId(Long userId, Long postId);
}
