package com.devsync.admin;

import com.devsync.admin.dto.AdminPostResponse;
import com.devsync.admin.dto.AdminUserResponse;
import com.devsync.admin.dto.DashboardResponse;
import com.devsync.common.ResourceNotFoundException;
import com.devsync.feed.entity.Post;
import com.devsync.feed.repository.CommentRepository;
import com.devsync.feed.repository.PostLikeRepository;
import com.devsync.feed.repository.PostRepository;
import com.devsync.kanban.repository.TaskRepository;
import com.devsync.message.repository.MessageRepository;
import com.devsync.project.repository.ProjectRepository;
import com.devsync.teamroom.repository.TeamRoomRepository;
import com.devsync.user.entity.User;
import com.devsync.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private ProjectRepository projectRepository;
    @Mock private TeamRoomRepository teamRoomRepository;
    @Mock private TaskRepository taskRepository;
    @Mock private PostRepository postRepository;
    @Mock private MessageRepository messageRepository;
    @Mock private CommentRepository commentRepository;
    @Mock private PostLikeRepository postLikeRepository;

    private AdminService adminService;

    @BeforeEach
    void setUp() {
        adminService = new AdminService(userRepository, projectRepository, teamRoomRepository,
                taskRepository, postRepository, messageRepository, commentRepository, postLikeRepository);
    }

    @Test
    void getDashboard_shouldAggregateAllCounts() {
        when(userRepository.count()).thenReturn(10L);
        when(userRepository.countActiveUsers(any(Instant.class))).thenReturn(7L);
        when(userRepository.countByBlockedTrue()).thenReturn(2L);
        when(projectRepository.count()).thenReturn(4L);
        when(teamRoomRepository.count()).thenReturn(3L);
        when(taskRepository.count()).thenReturn(25L);
        when(messageRepository.count()).thenReturn(90L);
        when(postRepository.count()).thenReturn(15L);
        when(userRepository.findTop5ByOrderByCreatedAtDesc()).thenReturn(List.of());
        when(projectRepository.findTop5ByOrderByCreatedAtDesc()).thenReturn(List.of());

        DashboardResponse dashboard = adminService.getDashboard();

        assertThat(dashboard.getTotalUsers()).isEqualTo(10);
        assertThat(dashboard.getActiveUsers()).isEqualTo(7);
        assertThat(dashboard.getBlockedUsers()).isEqualTo(2);
        assertThat(dashboard.getTotalProjects()).isEqualTo(4);
        assertThat(dashboard.getTotalTeams()).isEqualTo(3);
        assertThat(dashboard.getTotalTasks()).isEqualTo(25);
        assertThat(dashboard.getTotalMessages()).isEqualTo(90);
        assertThat(dashboard.getTotalPosts()).isEqualTo(15);
    }

    @Test
    void getAllUsers_shouldBatchLoadPostCounts() {
        User u1 = userWithId("u1");
        User u2 = userWithId("u2");
        when(userRepository.findAll()).thenReturn(List.of(u1, u2));
        when(postRepository.countPostsByUserIdIn(anySet()))
                .thenReturn(Collections.singletonList(new Object[]{"u1", 3L}));

        List<AdminUserResponse> users = adminService.getAllUsers();

        assertThat(users).hasSize(2);
        assertThat(users.get(0).getPostCount()).isEqualTo(3);
        assertThat(users.get(1).getPostCount()).isEqualTo(0);
    }

    @Test
    void getAllPosts_shouldBatchLoadAuthorsAndCounts() {
        Post post = Post.builder().userId("u1").content("Hello world").build();
        post.setId("p1");
        User author = userWithId("u1");
        when(postRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(post));
        when(userRepository.findAllById(anySet())).thenReturn(List.of(author));
        when(postLikeRepository.countLikesByPostIdIn(anySet()))
                .thenReturn(Collections.singletonList(new Object[]{"p1", 5L}));
        when(commentRepository.countCommentsByPostIdIn(anySet()))
                .thenReturn(Collections.singletonList(new Object[]{"p1", 2L}));

        List<AdminPostResponse> posts = adminService.getAllPosts();

        assertThat(posts).hasSize(1);
        assertThat(posts.get(0).getLikeCount()).isEqualTo(5);
        assertThat(posts.get(0).getCommentCount()).isEqualTo(2);
        assertThat(posts.get(0).getAuthor().getFullName()).isEqualTo("Dev User");
    }

    @Test
    void updateUserRole_shouldMapLegacyDeveloperRoleToUser() {
        User user = userWithId("u1");
        when(userRepository.findById("u1")).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenReturn(user);
        when(postRepository.countByUserId("u1")).thenReturn(1L);

        AdminUserResponse response = adminService.updateUserRole("u1", "DEVELOPER", "admin-1");

        assertThat(user.getRole()).isEqualTo(User.Role.USER);
        assertThat(response.getRole()).isEqualTo("USER");
    }

    @Test
    void updateUserRole_shouldThrow_ForInvalidRole() {
        User user = userWithId("u1");
        when(userRepository.findById("u1")).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> adminService.updateUserRole("u1", "SUPERADMIN", "admin-1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Invalid role");

        verify(userRepository, never()).save(any());
    }

    @Test
    void updateUserRole_shouldThrow_WhenRemovingOwnAdminRole() {
        User admin = userWithId("admin-1");
        admin.setRole(User.Role.ADMIN);
        when(userRepository.findById("admin-1")).thenReturn(Optional.of(admin));

        assertThatThrownBy(() -> adminService.updateUserRole("admin-1", "USER", "admin-1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("cannot remove your own ADMIN role");

        verify(userRepository, never()).save(any());
    }

    @Test
    void setUserBlocked_shouldThrow_WhenBlockingSelf() {
        User admin = userWithId("admin-1");
        when(userRepository.findById("admin-1")).thenReturn(Optional.of(admin));

        assertThatThrownBy(() -> adminService.setUserBlocked("admin-1", true, "admin-1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("cannot block your own account");

        verify(userRepository, never()).save(any());
    }

    @Test
    void setUserBlocked_shouldUpdateFlag() {
        User user = userWithId("u1");
        when(userRepository.findById("u1")).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenReturn(user);
        when(postRepository.countByUserId("u1")).thenReturn(0L);

        AdminUserResponse response = adminService.setUserBlocked("u1", true, "admin-1");

        assertThat(user.isBlocked()).isTrue();
        assertThat(response.isBlocked()).isTrue();
    }

    @Test
    void deletePost_shouldCleanupLikesAndComments() {
        Post post = Post.builder().userId("u1").content("To delete").build();
        post.setId("p1");
        when(postRepository.findById("p1")).thenReturn(Optional.of(post));

        adminService.deletePost("p1");

        verify(postLikeRepository).deleteByPostId("p1");
        verify(commentRepository).deleteByPostId("p1");
        verify(postRepository).deleteById("p1");
    }

    @Test
    void deletePost_shouldThrow_WhenPostNotFound() {
        when(postRepository.findById("ghost")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> adminService.deletePost("ghost"))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(postLikeRepository, never()).deleteByPostId(anyString());
    }

    private User userWithId(String id) {
        User user = User.builder()
                .email(id + "@test.com")
                .fullName("Dev User")
                .username("user" + id)
                .role(User.Role.USER)
                .build();
        user.setId(id);
        return user;
    }
}
