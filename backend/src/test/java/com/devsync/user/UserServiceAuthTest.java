package com.devsync.user;

import com.devsync.common.ResourceNotFoundException;
import com.devsync.presence.PresenceService;
import com.devsync.project.repository.ProjectMemberRepository;
import com.devsync.social.repository.FollowRepository;
import com.devsync.user.dto.PublicUserResponse;
import com.devsync.user.entity.User;
import com.devsync.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceAuthTest {

    @Mock private UserRepository userRepository;
    @Mock private ProjectMemberRepository projectMemberRepository;
    @Mock private PresenceService presenceService;
    @Mock private FollowRepository followRepository;

    private UserService userService;
    private User targetUser;

    @BeforeEach
    void setUp() {
        userService = new UserService(userRepository, projectMemberRepository, presenceService, followRepository);

        targetUser = User.builder()
                .email("other@example.com")
                .fullName("Other User")
                .username("otheruser")
                .role(User.Role.USER)
                .build();
        targetUser.setId("user-2");
    }

    @Test
    void getUserByIdWithAuth_shouldSucceed_WhenOwnProfile() {
        User me = User.builder()
                .email("me@test.com").fullName("Me")
                .username("meuser").role(User.Role.USER).build();
        me.setId("user-1");

        when(userRepository.findById("user-1")).thenReturn(Optional.of(me));

        PublicUserResponse response = userService.getUserByIdWithAuth("user-1", "user-1");

        assertThat(response.getId()).isEqualTo("user-1");
        assertThat(response.getFullName()).isEqualTo("Me");

        // Should NOT check project membership for own profile
        verify(projectMemberRepository, never()).findProjectIdsByUserId(anyString());
    }

    @Test
    void getUserByIdWithAuth_shouldSucceed_WhenSharedProject() {
        when(userRepository.findById("user-2")).thenReturn(Optional.of(targetUser));

        // Both users are members of the same project
        when(projectMemberRepository.findProjectIdsByUserId("user-1"))
                .thenReturn(List.of("project-1", "project-2"));
        when(projectMemberRepository.findProjectIdsByUserId("user-2"))
                .thenReturn(List.of("project-2", "project-3")); // shares project-2

        PublicUserResponse response = userService.getUserByIdWithAuth("user-2", "user-1");

        assertThat(response.getId()).isEqualTo("user-2");
        assertThat(response.getFullName()).isEqualTo("Other User");
    }

    @Test
    void getUserByIdWithAuth_shouldThrow_WhenNoSharedProject() {
        when(userRepository.findById("user-2")).thenReturn(Optional.of(targetUser));

        // No overlapping projects
        when(projectMemberRepository.findProjectIdsByUserId("user-1"))
                .thenReturn(List.of("project-a", "project-b"));
        when(projectMemberRepository.findProjectIdsByUserId("user-2"))
                .thenReturn(List.of("project-c", "project-d"));

        assertThatThrownBy(() -> userService.getUserByIdWithAuth("user-2", "user-1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("do not have a shared project");
    }

    @Test
    void getUserByIdWithAuth_shouldThrow_WhenTargetUserNotFound() {
        when(userRepository.findById("ghost")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.getUserByIdWithAuth("ghost", "user-1"))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(projectMemberRepository, never()).findProjectIdsByUserId(anyString());
    }

    @Test
    void getUserByIdWithAuth_shouldSucceed_WhenBothHaveNoProjects() {
        // Edge case: neither user is in any project, but they're viewing own profile
        User me = User.builder()
                .email("me@test.com").fullName("Me")
                .username("meuser").role(User.Role.USER).build();
        me.setId("user-1");

        when(userRepository.findById("user-1")).thenReturn(Optional.of(me));

        PublicUserResponse response = userService.getUserByIdWithAuth("user-1", "user-1");

        assertThat(response.getId()).isEqualTo("user-1");
        verify(projectMemberRepository, never()).findProjectIdsByUserId(anyString());
    }

    @Test
    void getUserByIdWithAuth_shouldSucceed_WhenRequestingUserHasNoProjects_ButTargetDoes() {
        // Requesting user has no projects, target user has projects
        // → they cannot share a project → should deny
        when(userRepository.findById("user-2")).thenReturn(Optional.of(targetUser));
        when(projectMemberRepository.findProjectIdsByUserId("user-1"))
                .thenReturn(List.of());
        when(projectMemberRepository.findProjectIdsByUserId("user-2"))
                .thenReturn(List.of("project-x"));

        assertThatThrownBy(() -> userService.getUserByIdWithAuth("user-2", "user-1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("do not have a shared project");
    }
}
