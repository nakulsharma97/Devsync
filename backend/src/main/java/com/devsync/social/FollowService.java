package com.devsync.social;

import com.devsync.common.ResourceNotFoundException;
import com.devsync.notification.NotificationService;
import com.devsync.social.dto.FollowUserResponse;
import com.devsync.social.dto.SocialProfileResponse;
import com.devsync.social.entity.Follow;
import com.devsync.social.repository.FollowRepository;
import com.devsync.feed.repository.PostRepository;
import com.devsync.user.entity.User;
import com.devsync.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FollowService {

    private final FollowRepository followRepository;
    private final UserRepository userRepository;
    private final PostRepository postRepository;
    private final NotificationService notificationService;

    // ── Actions ─────────────────────────────────────────────────────────

    /**
     * Makes {@code followerId} follow {@code followingId}. Enforces:
     *  - cannot follow yourself
     *  - the target user must exist
     *  - no duplicate relationships (unique constraint + idempotent check)
     * Sends a "started following you" notification only when a new follow is
     * created (never on unfollow or no-op).
     */
    @Transactional
    public boolean follow(String followerId, String followingId) {
        if (followerId.equals(followingId)) {
            throw new IllegalArgumentException("You cannot follow yourself");
        }
        User target = userRepository.findById(followingId)
                .orElseThrow(() -> new ResourceNotFoundException("User", followingId));
        if (followRepository.existsByFollowerIdAndFollowingId(followerId, followingId)) {
            return false; // already following — idempotent no-op
        }
        followRepository.save(Follow.builder()
                .followerId(followerId).followingId(followingId).build());

        User actor = userRepository.findById(followerId).orElse(null);
        notificationService.createNotification(
                followingId, "FOLLOW", "New follower",
                (actor != null ? actor.getFullName() : "Someone") + " started following you.",
                followerId,
                actor != null ? actor.getFullName() : "",
                actor != null ? actor.getAvatarUrl() : null,
                followerId, "user",
                actor != null && actor.getUsername() != null
                        ? "/profile/" + actor.getUsername() : null);
        return true;
    }

    @Transactional
    public boolean unfollow(String followerId, String followingId) {
        if (followRepository.existsByFollowerIdAndFollowingId(followerId, followingId)) {
            followRepository.deleteByFollowerIdAndFollowingId(followerId, followingId);
            return true;
        }
        return false; // idempotent no-op
    }

    // ── Reads ───────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public boolean isFollowing(String followerId, String followingId) {
        return followRepository.existsByFollowerIdAndFollowingId(followerId, followingId);
    }

    @Transactional(readOnly = true)
    public List<String> getFollowingIds(String userId) {
        return followRepository.findFollowingIds(userId);
    }

    @Transactional(readOnly = true)
    public long getFollowerCount(String userId) {
        return followRepository.countByFollowingId(userId);
    }

    @Transactional(readOnly = true)
    public long getFollowingCount(String userId) {
        return followRepository.countByFollowerId(userId);
    }

    /**
     * Followers list (users who follow {@code userId}), annotated with the
     * requesting user's relationship to each listed user.
     */
    @Transactional(readOnly = true)
    public List<FollowUserResponse> getFollowers(String userId, String requestingUserId) {
        List<Follow> follows = followRepository.findByFollowingIdOrderByCreatedAtDesc(userId);
        return toUserResponses(follows.stream().map(Follow::getFollowerId).toList(), requestingUserId);
    }

    /**
     * Following list (users {@code userId} follows), annotated with the
     * requesting user's relationship to each listed user.
     */
    @Transactional(readOnly = true)
    public List<FollowUserResponse> getFollowing(String userId, String requestingUserId) {
        List<Follow> follows = followRepository.findByFollowerIdOrderByCreatedAtDesc(userId);
        return toUserResponses(follows.stream().map(Follow::getFollowingId).toList(), requestingUserId);
    }

    /**
     * Authenticated profile view: profile fields + social stats + the
     * requesting user's relationship to the profile owner.
     */
    @Transactional(readOnly = true)
    public SocialProfileResponse getSocialProfile(String username, String requestingUserId) {
        User user = userRepository.findByUsername(username)
                .filter(u -> !u.isDeleted())
                .orElseThrow(() -> new ResourceNotFoundException("User", username));
        boolean isSelf = user.getId().equals(requestingUserId);
        return SocialProfileResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .displayName(user.getFullName())
                .avatarUrl(user.getAvatarUrl())
                .bio(user.getBio())
                .jobTitle(user.getJobTitle())
                .company(user.getCompany())
                .location(user.getLocation())
                .memberSince(user.getCreatedAt())
                .posts(postRepository.countByUserId(user.getId()))
                .followerCount(followRepository.countByFollowingId(user.getId()))
                .followingCount(followRepository.countByFollowerId(user.getId()))
                .isFollowing(!isSelf && followRepository.existsByFollowerIdAndFollowingId(requestingUserId, user.getId()))
                .followsYou(!isSelf && followRepository.existsByFollowerIdAndFollowingId(user.getId(), requestingUserId))
                .isSelf(isSelf)
                .build();
    }

    // ── Mapping helpers ─────────────────────────────────────────────────

    private List<FollowUserResponse> toUserResponses(List<String> userIds, String requestingUserId) {
        if (userIds.isEmpty()) return List.of();
        Set<String> uniqueIds = userIds.stream().collect(Collectors.toSet());
        Map<String, User> userMap = userRepository.findAllById(uniqueIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u));

        // Batch counts for every listed user.
        Map<String, Long> followerCounts = followRepository.countByFollowingIdInGrouped(uniqueIds).stream()
                .collect(Collectors.toMap(row -> (String) row[0], row -> (Long) row[1]));
        Map<String, Long> followingCounts = followRepository.countByFollowerIdInGrouped(uniqueIds).stream()
                .collect(Collectors.toMap(row -> (String) row[0], row -> (Long) row[1]));

        // Requesting user's follow state against each listed user, plus who follows them back.
        Set<String> requesterFollows = followRepository.findFollowingIds(requestingUserId).stream().collect(Collectors.toSet());
        Set<String> requesterFollowers = followRepository.findFollowerIds(requestingUserId).stream().collect(Collectors.toSet());

        return userIds.stream()
                .map(id -> {
                    User u = userMap.get(id);
                    if (u == null) return null;
                    return FollowUserResponse.builder()
                            .id(u.getId())
                            .username(u.getUsername())
                            .fullName(u.getFullName())
                            .avatarUrl(u.getAvatarUrl())
                            .bio(u.getBio())
                            .followerCount(followerCounts.getOrDefault(id, 0L))
                            .followingCount(followingCounts.getOrDefault(id, 0L))
                            .isFollowing(requesterFollows.contains(id))
                            .followsYou(requesterFollowers.contains(id))
                            .isSelf(id.equals(requestingUserId))
                            .build();
                })
                .filter(java.util.Objects::nonNull)
                .toList();
    }
}
