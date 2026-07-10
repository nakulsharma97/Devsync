package com.devsync.feed.repository;

import com.devsync.feed.entity.PostLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PostLikeRepository extends JpaRepository<PostLike, String> {
    boolean existsByUserIdAndPostId(String userId, String postId);
    long countByPostId(String postId);
    void deleteByUserIdAndPostId(String userId, String postId);
}
