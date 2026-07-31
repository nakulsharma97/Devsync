package com.devsync.admin;

import com.devsync.admin.dto.AdminPostResponse;
import com.devsync.admin.dto.AdminProjectDetail;
import com.devsync.admin.dto.AdminProjectListItem;
import com.devsync.admin.dto.AdminProjectStats;
import com.devsync.admin.dto.AdminUserDetail;
import com.devsync.admin.dto.AdminUserListItem;
import com.devsync.admin.dto.AdminUserResponse;
import com.devsync.admin.dto.DashboardResponse;
import com.devsync.common.PageResponse;
import com.devsync.common.ResourceNotFoundException;
import com.devsync.feed.entity.Post;
import com.devsync.feed.repository.CommentRepository;
import com.devsync.feed.repository.PostLikeRepository;
import com.devsync.feed.repository.PostRepository;
import com.devsync.kanban.entity.Board;
import com.devsync.kanban.entity.BoardColumn;
import com.devsync.kanban.entity.Task;
import com.devsync.kanban.repository.BoardColumnRepository;
import com.devsync.kanban.repository.BoardRepository;
import com.devsync.kanban.repository.TaskRepository;
import com.devsync.message.repository.MessageRepository;
import com.devsync.project.entity.Project;
import com.devsync.project.entity.ProjectMember;
import com.devsync.project.repository.ProjectMemberRepository;
import com.devsync.project.repository.ProjectRepository;
import com.devsync.teamroom.entity.TeamRoom;
import com.devsync.teamroom.repository.TeamRoomRepository;
import com.devsync.user.entity.User;
import com.devsync.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

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
    @Mock private ProjectMemberRepository projectMemberRepository;
    @Mock private BoardRepository boardRepository;
    @Mock private BoardColumnRepository boardColumnRepository;

    private AdminService adminService;

    @BeforeEach
    void setUp() {
        adminService = new AdminService(userRepository, projectRepository, teamRoomRepository,
                taskRepository, postRepository, messageRepository, commentRepository, postLikeRepository,
                projectMemberRepository, boardRepository, boardColumnRepository);
    }

    @Test
    void getDashboard_shouldAggregateAllCounts() {
        when(userRepository.count()).thenReturn(10L);
        when(userRepository.countActiveUsers(any(Instant.class))).thenReturn(7L);
        when(userRepository.countByBlockedTrue()).thenReturn(2L);
        when(projectRepository.countByDeletedFalse()).thenReturn(4L);
        when(teamRoomRepository.count()).thenReturn(3L);
        when(taskRepository.count()).thenReturn(25L);
        when(messageRepository.count()).thenReturn(90L);
        when(postRepository.count()).thenReturn(15L);
        when(userRepository.findTop5ByOrderByCreatedAtDesc()).thenReturn(List.of());
        when(projectRepository.findTop5ByOrderByCreatedAtDescAndDeletedFalse()).thenReturn(List.of());

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
    void getUsersPage_shouldReturnPagedResults() {
        User u1 = userWithId("u1");
        User u2 = userWithId("u2");
        PageImpl<User> page = new PageImpl<>(List.of(u1, u2), PageRequest.of(0, 10), 2);
        when(userRepository.searchAdminUsers(isNull(), isNull(), isNull(), any(Pageable.class)))
                .thenReturn(page);

        PageResponse<AdminUserListItem> result = adminService.getUsersPage(0, 10, "createdAt", "desc", null, null, null);

        assertThat(result.getContent()).hasSize(2);
        assertThat(result.getPage()).isZero();
        assertThat(result.getSize()).isEqualTo(10);
        assertThat(result.getTotalElements()).isEqualTo(2);
        assertThat(result.getTotalPages()).isEqualTo(1);
        assertThat(result.isLast()).isTrue();
    }

    @Test
    void getUsersPage_shouldMapStatusFromBlockedFlag() {
        User blocked = userWithId("u1");
        blocked.setBlocked(true);
        PageImpl<User> page = new PageImpl<>(List.of(blocked), PageRequest.of(0, 10), 1);
        when(userRepository.searchAdminUsers(isNull(), isNull(), eq("BLOCKED"), any(Pageable.class)))
                .thenReturn(page);

        PageResponse<AdminUserListItem> result = adminService.getUsersPage(0, 10, null, null, null, null, "blocked");

        assertThat(result.getContent().get(0).getStatus()).isEqualTo("BLOCKED");
    }

    @Test
    void getUsersPage_shouldThrow_ForInvalidRoleFilter() {
        assertThatThrownBy(() -> adminService.getUsersPage(0, 10, null, null, null, "SUPERADMIN", null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Invalid role filter");
    }

    @Test
    void getUserDetail_shouldAggregateProjectsTeamsAndCounts() {
        User user = userWithId("u1");
        when(userRepository.findById("u1")).thenReturn(Optional.of(user));
        when(projectRepository.findProjectsByUserId("u1")).thenReturn(List.of());
        when(projectRepository.findByOwnerId("u1")).thenReturn(List.of());
        when(teamRoomRepository.findRoomsByUserId("u1")).thenReturn(List.of());
        when(postRepository.countByUserId("u1")).thenReturn(5L);
        when(messageRepository.countMessagesByUserId("u1")).thenReturn(12L);

        AdminUserDetail detail = adminService.getUserDetail("u1");

        assertThat(detail.getId()).isEqualTo("u1");
        assertThat(detail.getPostsCount()).isEqualTo(5);
        assertThat(detail.getMessagesCount()).isEqualTo(12);
        assertThat(detail.getStatus()).isEqualTo("ACTIVE");
        assertThat(detail.getProjectsJoined()).isEmpty();
        assertThat(detail.getProjectsOwned()).isEmpty();
        assertThat(detail.getTeams()).isEmpty();
    }

    @Test
    void getUserDetail_shouldThrow_WhenUserNotFound() {
        when(userRepository.findById("ghost")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> adminService.getUserDetail("ghost"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void deleteUser_shouldSoftDeleteUser() {
        User user = userWithId("u1");
        when(userRepository.findById("u1")).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenReturn(user);

        adminService.deleteUser("u1", "admin-1");

        assertThat(user.isDeleted()).isTrue();
        assertThat(user.getDeletedAt()).isNotNull();
        verify(userRepository).save(user);
    }

    @Test
    void deleteUser_shouldThrow_WhenSelfDelete() {
        User admin = userWithId("admin-1");
        when(userRepository.findById("admin-1")).thenReturn(Optional.of(admin));

        assertThatThrownBy(() -> adminService.deleteUser("admin-1", "admin-1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("cannot delete your own account");

        verify(userRepository, never()).save(any());
    }

    @Test
    void deleteUser_shouldThrow_WhenUserNotFound() {
        when(userRepository.findById("ghost")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> adminService.deleteUser("ghost", "admin-1"))
                .isInstanceOf(ResourceNotFoundException.class);
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

    // ---------- Admin Project Management tests ----------

    @Test
    void getProjectsPage_shouldReturnPagedProjectsWithCounts() {
        Project p1 = projectWithId("p1", "owner1");
        PageImpl<Project> page = new PageImpl<>(List.of(p1), PageRequest.of(0, 10), 1);
        when(projectRepository.searchAdminProjects(isNull(), isNull(), isNull(), eq(false), any(Pageable.class)))
                .thenReturn(page);
        when(projectMemberRepository.countMembersByProjectIdIn(anySet()))
                .thenReturn(Collections.singletonList(new Object[]{"p1", 3L}));
        when(boardRepository.findByProjectIdIn(anySet()))
                .thenReturn(Collections.singletonList(boardWithId("b1", "p1")));
        when(taskRepository.countTasksByBoardIdIn(anySet()))
                .thenReturn(Collections.singletonList(new Object[]{"b1", 7L}));
        when(projectMemberRepository.findByProjectIdIn(anySet()))
                .thenReturn(Collections.singletonList(memberWithId("p1", "u2")));
        when(postRepository.countPostsByUserIdIn(anySet()))
                .thenReturn(Collections.singletonList(new Object[]{"u2", 2L}));
        when(userRepository.findAllById(anySet())).thenReturn(Collections.singletonList(userWithId("owner1")));

        PageResponse<AdminProjectListItem> result = adminService.getProjectsPage(0, 10, "newest", "desc", null, null, null);

        assertThat(result.getContent()).hasSize(1);
        AdminProjectListItem item = result.getContent().get(0);
        assertThat(item.getId()).isEqualTo("p1");
        assertThat(item.getName()).isEqualTo("DevSync");
        assertThat(item.getMembersCount()).isEqualTo(3);
        assertThat(item.getTasksCount()).isEqualTo(7);
        assertThat(item.getPostsCount()).isEqualTo(2);
        assertThat(item.getStatus()).isEqualTo("ACTIVE");
        assertThat(item.getVisibility()).isEqualTo("PUBLIC");
    }

    @Test
    void getProjectsPage_shouldSortByMostMembersInMemory() {
        Project p1 = projectWithId("p1", "owner1");
        Project p2 = projectWithId("p2", "owner2");
        PageImpl<Project> page = new PageImpl<>(List.of(p1, p2), PageRequest.of(0, 10), 2);
        when(projectRepository.searchAdminProjects(isNull(), isNull(), isNull(), eq(false), any(Pageable.class)))
                .thenReturn(page);
        when(projectMemberRepository.countMembersByProjectIdIn(anySet()))
                .thenReturn(List.of(new Object[]{"p1", 5L}, new Object[]{"p2", 1L}));

        PageResponse<AdminProjectListItem> result = adminService.getProjectsPage(0, 10, "mostMembers", "desc", null, null, null);

        assertThat(result.getContent().get(0).getId()).isEqualTo("p1");
        assertThat(result.getContent().get(0).getMembersCount()).isEqualTo(5);
        assertThat(result.getContent().get(1).getId()).isEqualTo("p2");
    }

    @Test
    void getProjectsPage_shouldThrow_ForInvalidVisibilityFilter() {
        assertThatThrownBy(() -> adminService.getProjectsPage(0, 10, null, null, null, "SECRET", null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Invalid visibility filter");
    }

    @Test
    void getProjectStats_shouldReturnAllCounts() {
        when(projectRepository.countByDeletedFalse()).thenReturn(10L);
        when(projectRepository.countByStatusAndDeletedFalse(Project.ProjectStatus.ACTIVE)).thenReturn(7L);
        when(projectRepository.countByStatusAndDeletedFalse(Project.ProjectStatus.ARCHIVED)).thenReturn(2L);
        when(projectRepository.countByVisibilityAndDeletedFalse(Project.ProjectVisibility.PUBLIC)).thenReturn(6L);
        when(projectRepository.countByVisibilityAndDeletedFalse(Project.ProjectVisibility.PRIVATE)).thenReturn(4L);

        AdminProjectStats stats = adminService.getProjectStats();

        assertThat(stats.getTotal()).isEqualTo(10);
        assertThat(stats.getActive()).isEqualTo(7);
        assertThat(stats.getArchived()).isEqualTo(2);
        assertThat(stats.getPublicCount()).isEqualTo(6);
        assertThat(stats.getPrivateCount()).isEqualTo(4);
    }

    @Test
    void getProjectDetail_shouldAggregateMembersKanbanAndCounts() {
        Project p1 = projectWithId("p1", "owner1");
        when(projectRepository.findById("p1")).thenReturn(Optional.of(p1));
        when(userRepository.findById("owner1")).thenReturn(Optional.of(userWithId("owner1")));
        when(projectMemberRepository.findByProjectId("p1"))
                .thenReturn(Collections.singletonList(memberWithId("p1", "u2")));
        when(userRepository.findAllById(anySet())).thenReturn(Collections.singletonList(userWithId("u2")));
        when(postRepository.countPostsByUserIdIn(anySet()))
                .thenReturn(Collections.singletonList(new Object[]{"u2", 3L}));

        when(boardRepository.findByProjectId("p1"))
                .thenReturn(Collections.singletonList(boardWithId("b1", "p1")));
        BoardColumn done = BoardColumn.builder().boardId("b1").name("Done").position(2).build();
        done.setId("col-done");
        BoardColumn todo = BoardColumn.builder().boardId("b1").name("To Do").position(0).build();
        todo.setId("col-todo");
        when(boardColumnRepository.findByBoardIdIn(anySet())).thenReturn(List.of(done, todo));
        Task t1 = Task.builder().title("Ship").columnId("col-done").boardId("b1").build();
        Task t2 = Task.builder().title("Plan").columnId("col-todo").boardId("b1").build();
        when(taskRepository.findByBoardIdIn(anySet())).thenReturn(List.of(t1, t2));

        TeamRoom room = TeamRoom.builder().projectId("p1").createdBy("owner1").build();
        room.setId("r1");
        when(teamRoomRepository.findByProjectId("p1")).thenReturn(Collections.singletonList(room));
        when(messageRepository.countByRoomIdIn(anySet())).thenReturn(5L);

        AdminProjectDetail detail = adminService.getProjectDetail("p1");

        assertThat(detail.getId()).isEqualTo("p1");
        assertThat(detail.getMemberCount()).isEqualTo(1);
        assertThat(detail.getMembers()).hasSize(1);
        assertThat(detail.getKanbanStats().getTotalTasks()).isEqualTo(2);
        assertThat(detail.getKanbanStats().getCompletedTasks()).isEqualTo(1);
        assertThat(detail.getKanbanStats().getPendingTasks()).isEqualTo(1);
        assertThat(detail.getPostsCount()).isEqualTo(3);
        assertThat(detail.getMessagesCount()).isEqualTo(5);
        assertThat(detail.getOwner().getFullName()).isEqualTo("Dev User");
    }

    @Test
    void getProjectDetail_shouldThrow_WhenProjectNotFound() {
        when(projectRepository.findById("ghost")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> adminService.getProjectDetail("ghost"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void archiveProject_shouldSetStatusArchived() {
        Project p1 = projectWithId("p1", "owner1");
        when(projectRepository.findById("p1")).thenReturn(Optional.of(p1));
        when(projectRepository.save(any(Project.class))).thenReturn(p1);

        AdminProjectListItem item = adminService.archiveProject("p1");

        assertThat(p1.getStatus()).isEqualTo(Project.ProjectStatus.ARCHIVED);
        assertThat(item.getStatus()).isEqualTo("ARCHIVED");
    }

    @Test
    void restoreProject_shouldSetStatusActive() {
        Project p1 = projectWithId("p1", "owner1");
        p1.setStatus(Project.ProjectStatus.ARCHIVED);
        when(projectRepository.findById("p1")).thenReturn(Optional.of(p1));
        when(projectRepository.save(any(Project.class))).thenReturn(p1);

        AdminProjectListItem item = adminService.restoreProject("p1");

        assertThat(p1.getStatus()).isEqualTo(Project.ProjectStatus.ACTIVE);
        assertThat(item.getStatus()).isEqualTo("ACTIVE");
    }

    @Test
    void setProjectVisibility_shouldUpdateVisibility() {
        Project p1 = projectWithId("p1", "owner1");
        when(projectRepository.findById("p1")).thenReturn(Optional.of(p1));
        when(projectRepository.save(any(Project.class))).thenReturn(p1);

        AdminProjectListItem item = adminService.setProjectVisibility("p1", "PRIVATE");

        assertThat(p1.getVisibility()).isEqualTo(Project.ProjectVisibility.PRIVATE);
        assertThat(item.getVisibility()).isEqualTo("PRIVATE");
    }

    @Test
    void setProjectVisibility_shouldThrow_WhenBlank() {
        assertThatThrownBy(() -> adminService.setProjectVisibility("p1", " "))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Visibility is required");
    }

    @Test
    void deleteProject_shouldSoftDeleteProject() {
        Project p1 = projectWithId("p1", "owner1");
        when(projectRepository.findById("p1")).thenReturn(Optional.of(p1));
        when(projectRepository.save(any(Project.class))).thenReturn(p1);

        adminService.deleteProject("p1");

        assertThat(p1.isDeleted()).isTrue();
        assertThat(p1.getDeletedAt()).isNotNull();
        verify(projectRepository).save(p1);
    }

    @Test
    void deleteProject_shouldThrow_WhenProjectNotFound() {
        when(projectRepository.findById("ghost")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> adminService.deleteProject("ghost"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void archiveProject_shouldThrow_WhenProjectDeleted() {
        Project p1 = projectWithId("p1", "owner1");
        p1.setDeleted(true);
        when(projectRepository.findById("p1")).thenReturn(Optional.of(p1));

        assertThatThrownBy(() -> adminService.archiveProject("p1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("deleted");
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

    private Project projectWithId(String id, String ownerId) {
        Project project = Project.builder()
                .name("DevSync")
                .ownerId(ownerId)
                .build();
        project.setId(id);
        return project;
    }

    private Board boardWithId(String id, String projectId) {
        Board board = Board.builder()
                .name("Board")
                .projectId(projectId)
                .createdBy("owner1")
                .build();
        board.setId(id);
        return board;
    }

    private ProjectMember memberWithId(String projectId, String userId) {
        ProjectMember member = ProjectMember.builder()
                .projectId(projectId)
                .userId(userId)
                .role(ProjectMember.Role.MEMBER)
                .build();
        member.setId("m-" + userId);
        return member;
    }
}
