package com.devsync.social;

import com.devsync.common.ResourceNotFoundException;
import com.devsync.feed.repository.PostRepository;
import com.devsync.notification.NotificationService;
import com.devsync.social.dto.FollowUserResponse;
import com.devsync.social.dto.SocialProfileResponse;
import com.devsync.social.entity.Follow;
import com.devsync.social.repository.FollowRepository;
import com.devsync.user.entity.User;
import com.devsync.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FollowServiceTest {

    @Mock private FollowRepository followRepository;
    @Mock private UserRepository userRepository;
    @Mock private PostRepository postRepository;
    @Mock private NotificationService notificationService;

    private FollowService followService;
    private User alice;
    private User bob;

    @BeforeEach
    void setUp() {
        followService = new FollowService(followRepository, userRepository, postRepository, notificationService);

        alice = User.builder().email("alice@example.com").fullName("Alice").username("alice").build();
        alice.setId("alice-1");
        alice.setCreatedAt(Instant.now());
        bob = User.builder().email("bob@example.com").fullName("Bob").username("bob").build();
        bob.setId("bob-1");
        bob.setCreatedAt(Instant.now());
    }

    // ── follow ────────────────────────────────────────────────

    @Test
    void follow_shouldCreateRelationshipAndNotify() {
        when(userRepository.findById("bob-1")).thenReturn(Optional.of(bob));
        when(followRepository.existsByFollowerIdAndFollowingId("alice-1", "bob-1")).thenReturn(false);
        when(userRepository.findById("alice-1")).thenReturn(Optional.of(alice));

        boolean created = followService.follow("alice-1", "bob-1");

        assertThat(created).isTrue();
        verify(followRepository).save(argThat(f ->
                f.getFollowerId().equals("alice-1") && f.getFollowingId().equals("bob-1")));
        verify(notificationService).createNotification(
                eq("bob-1"), eq("NEW_FOLLOWER"), eq("New follower"),
                contains("Alice"), eq("alice-1"), eq("Alice"), isNull(),
                eq("alice-1"), eq("user"), eq("/profile/alice"));
    }

    @Test
    void follow_shouldBeIdempotent_WhenAlreadyFollowing() {
        when(userRepository.findById("bob-1")).thenReturn(Optional.of(bob));
        when(followRepository.existsByFollowerIdAndFollowingId("alice-1", "bob-1")).thenReturn(true);

        boolean created = followService.follow("alice-1", "bob-1");

        assertThat(created).isFalse();
        verify(followRepository, never()).save(any());
        verify(notificationService, never()).createNotification(anyString(), anyString(), anyString(), anyString(), anyString(), anyString(), anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void follow_shouldReject_WhenFollowingSelf() {
        assertThatThrownBy(() -> followService.follow("alice-1", "alice-1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("follow yourself");
        verify(followRepository, never()).save(any());
    }

    @Test
    void follow_shouldReject_WhenTargetMissing() {
        when(userRepository.findById("ghost")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> followService.follow("alice-1", "ghost"))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(followRepository, never()).save(any());
    }

    // ── unfollow ──────────────────────────────────────────────

    @Test
    void unfollow_shouldRemoveRelationship() {
        when(followRepository.existsByFollowerIdAndFollowingId("alice-1", "bob-1")).thenReturn(true);

        boolean removed = followService.unfollow("alice-1", "bob-1");

        assertThat(removed).isTrue();
        verify(followRepository).deleteByFollowerIdAndFollowingId("alice-1", "bob-1");
        // No notification on unfollow
        verify(notificationService, never()).createNotification(anyString(), anyString(), anyString(), anyString(), anyString(), anyString(), anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void unfollow_shouldBeIdempotent_WhenNotFollowing() {
        when(followRepository.existsByFollowerIdAndFollowingId("alice-1", "bob-1")).thenReturn(false);

        boolean removed = followService.unfollow("alice-1", "bob-1");

        assertThat(removed).isFalse();
        verify(followRepository, never()).deleteByFollowerIdAndFollowingId(anyString(), anyString());
    }

    // ── reads ─────────────────────────────────────────────────

    @Test
    void counts_shouldReturnRepositoryCounts() {
        when(followRepository.countByFollowingId("alice-1")).thenReturn(5L);
        when(followRepository.countByFollowerId("alice-1")).thenReturn(3L);

        assertThat(followService.getFollowerCount("alice-1")).isEqualTo(5L);
        assertThat(followService.getFollowingCount("alice-1")).isEqualTo(3L);
    }

    @Test
    void getFollowers_shouldAnnotateRelationshipState() {
        Follow f1 = Follow.builder().followerId("bob-1").followingId("alice-1").build();
        f1.setId("f1");
        when(followRepository.findByFollowingIdOrderByCreatedAtDesc("alice-1")).thenReturn(List.of(f1));
        when(userRepository.findAllById(Set.of("bob-1"))).thenReturn(List.of(bob));
        when(followRepository.countByFollowingIdInGrouped(Set.of("bob-1"))).thenReturn(List.<Object[]>of(new Object[]{"bob-1", 2L}));
        when(followRepository.countByFollowerIdInGrouped(Set.of("bob-1"))).thenReturn(List.<Object[]>of(new Object[]{"bob-1", 1L}));
        when(followRepository.findFollowingIds("charlie-1")).thenReturn(List.of("bob-1"));
        when(followRepository.findFollowerIds("charlie-1")).thenReturn(List.of());

        List<FollowUserResponse> followers = followService.getFollowers("alice-1", "charlie-1");

        assertThat(followers).hasSize(1);
        FollowUserResponse row = followers.get(0);
        assertThat(row.getId()).isEqualTo("bob-1");
        assertThat(row.getUsername()).isEqualTo("bob");
        assertThat(row.getFollowerCount()).isEqualTo(2L);
        assertThat(row.getFollowingCount()).isEqualTo(1L);
        assertThat(row.isFollowing()).isTrue();   // charlie follows bob
        assertThat(row.isFollowsYou()).isFalse(); // bob does not follow charlie
        assertThat(row.isSelf()).isFalse();
    }

    @Test
    void getSocialProfile_shouldReturnStatsAndRelationship() {
        when(userRepository.findByUsername("bob")).thenReturn(Optional.of(bob));
        when(postRepository.countByUserId("bob-1")).thenReturn(7L);
        when(followRepository.countByFollowingId("bob-1")).thenReturn(4L);
        when(followRepository.countByFollowerId("bob-1")).thenReturn(2L);
        when(followRepository.existsByFollowerIdAndFollowingId("alice-1", "bob-1")).thenReturn(true);
        when(followRepository.existsByFollowerIdAndFollowingId("bob-1", "alice-1")).thenReturn(false);

        SocialProfileResponse profile = followService.getSocialProfile("bob", "alice-1");

        assertThat(profile.getId()).isEqualTo("bob-1");
        assertThat(profile.getPosts()).isEqualTo(7L);
        assertThat(profile.getFollowerCount()).isEqualTo(4L);
        assertThat(profile.getFollowingCount()).isEqualTo(2L);
        assertThat(profile.isFollowing()).isTrue();
        assertThat(profile.isFollowsYou()).isFalse();
        assertThat(profile.isSelf()).isFalse();
    }

    @Test
    void getSocialProfile_shouldMarkSelf() {
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(alice));

        SocialProfileResponse profile = followService.getSocialProfile("alice", "alice-1");

        assertThat(profile.isSelf()).isTrue();
        assertThat(profile.isFollowing()).isFalse();
        assertThat(profile.isFollowsYou()).isFalse();
    }
}
