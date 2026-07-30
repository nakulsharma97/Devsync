package com.devsync.feed.repository;

import com.devsync.feed.entity.PostLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Set;

@Repository
public interface PostLikeRepository extends JpaRepository<PostLike, String> {
    boolean existsByUserIdAndPostId(String userId, String postId);
    long countByPostId(String postId);
    void deleteByUserIdAndPostId(String userId, String postId);

    @Query("SELECT l.postId, COUNT(l) FROM PostLike l WHERE l.postId IN :postIds GROUP BY l.postId")
    List<Object[]> countLikesByPostIdIn(@Param("postIds") Set<String> postIds);
}
