package com.devsync.social.repository;

import com.devsync.social.entity.Follow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Repository
public interface FollowRepository extends JpaRepository<Follow, String> {

    Optional<Follow> findByFollowerIdAndFollowingId(String followerId, String followingId);

    boolean existsByFollowerIdAndFollowingId(String followerId, String followingId);

    long countByFollowingId(String followingId);

    long countByFollowerId(String followerId);

    /** Users who follow {@code userId} (the "followers" list). */
    List<Follow> findByFollowingIdOrderByCreatedAtDesc(String followingId);

    /** Users {@code userId} follows (the "following" list). */
    List<Follow> findByFollowerIdOrderByCreatedAtDesc(String followerId);

    /** Ids of every user {@code userId} follows. */
    @Query("SELECT f.followingId FROM Follow f WHERE f.followerId = :userId")
    List<String> findFollowingIds(@Param("userId") String userId);

    /** Ids of users who follow {@code userId}. */
    @Query("SELECT f.followerId FROM Follow f WHERE f.followingId = :userId")
    List<String> findFollowerIds(@Param("userId") String userId);

    /** All follow rows involving any of the given users (used for batch mutual-state checks). */
    @Query("SELECT f FROM Follow f WHERE f.followerId IN :userIds OR f.followingId IN :userIds")
    List<Follow> findByEitherUserIdIn(@Param("userIds") Collection<String> userIds);

    void deleteByFollowerIdAndFollowingId(String followerId, String followingId);

    long countByFollowingIdIn(Collection<String> followingIds);

    long countByFollowerIdIn(Collection<String> followerIds);

    /** (followingId, COUNT) — followers per user for a batch of users. */
    @Query("SELECT f.followingId, COUNT(f) FROM Follow f WHERE f.followingId IN :userIds GROUP BY f.followingId")
    List<Object[]> countByFollowingIdInGrouped(@Param("userIds") Set<String> userIds);

    /** (followerId, COUNT) — following count per user for a batch of users. */
    @Query("SELECT f.followerId, COUNT(f) FROM Follow f WHERE f.followerId IN :userIds GROUP BY f.followerId")
    List<Object[]> countByFollowerIdInGrouped(@Param("userIds") Set<String> userIds);
}
