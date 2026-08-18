package com.devsync.social;

import com.devsync.common.ApiResponse;
import com.devsync.social.dto.FollowUserResponse;
import com.devsync.social.dto.SocialProfileResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Social follow system. All endpoints derive the actor from the authenticated
 * user (JWT principal) — never from a client-supplied id.
 *
 * The paths match the pre-existing frontend connectionService contract
 * (/api/connections/...), which the Network page already uses.
 */
@RestController
@RequestMapping("/api/connections")
@RequiredArgsConstructor
public class FollowController {

    private final FollowService followService;

    @PostMapping("/follow")
    public ResponseEntity<ApiResponse<Map<String, Object>>> follow(
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDetails userDetails) {
        String followingId = body.get("followingId");
        if (followingId == null || followingId.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("followingId is required"));
        }
        boolean created = followService.follow(userDetails.getUsername(), followingId);
        return ResponseEntity.ok(ApiResponse.success("Followed", Map.of("created", created)));
    }

    @PostMapping("/unfollow")
    public ResponseEntity<ApiResponse<Map<String, Object>>> unfollow(
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDetails userDetails) {
        String followingId = body.get("followingId");
        if (followingId == null || followingId.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("followingId is required"));
        }
        boolean removed = followService.unfollow(userDetails.getUsername(), followingId);
        return ResponseEntity.ok(ApiResponse.success("Unfollowed", Map.of("removed", removed)));
    }

    @GetMapping("/is-following/{followingId}")
    public ResponseEntity<Map<String, Boolean>> isFollowing(
            @PathVariable String followingId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(Map.of("isFollowing",
                followService.isFollowing(userDetails.getUsername(), followingId)));
    }

    /** Ids of users the authenticated user follows (bare array — legacy contract). */
    @GetMapping("/following")
    public ResponseEntity<List<String>> myFollowingIds(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(followService.getFollowingIds(userDetails.getUsername()));
    }

    /** Full following list (users the authenticated user follows) with user info. */
    @GetMapping("/following/me")
    public ResponseEntity<List<FollowUserResponse>> myFollowing(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(followService.getFollowing(userDetails.getUsername(), userDetails.getUsername()));
    }

    /** Full followers list (users who follow the authenticated user) with user info. */
    @GetMapping("/followers/me")
    public ResponseEntity<List<FollowUserResponse>> myFollowers(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(followService.getFollowers(userDetails.getUsername(), userDetails.getUsername()));
    }

    /** Users who follow {@code userId}. */
    @GetMapping("/followers/{userId}")
    public ResponseEntity<List<FollowUserResponse>> followers(
            @PathVariable String userId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(followService.getFollowers(userId, userDetails.getUsername()));
    }

    /** Users {@code userId} follows. */
    @GetMapping("/following/{userId}")
    public ResponseEntity<List<FollowUserResponse>> following(
            @PathVariable String userId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(followService.getFollowing(userId, userDetails.getUsername()));
    }

    @GetMapping("/followers/count/{userId}")
    public ResponseEntity<Map<String, Long>> followerCount(@PathVariable String userId) {
        return ResponseEntity.ok(Map.of("count", followService.getFollowerCount(userId)));
    }

    @GetMapping("/following/count/{userId}")
    public ResponseEntity<Map<String, Long>> followingCount(@PathVariable String userId) {
        return ResponseEntity.ok(Map.of("count", followService.getFollowingCount(userId)));
    }

    /** Authenticated profile view: social stats + follow relationship. */
    @GetMapping("/profile/{username}")
    public ResponseEntity<SocialProfileResponse> socialProfile(
            @PathVariable String username,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(followService.getSocialProfile(username, userDetails.getUsername()));
    }
}
