package com.devsync.admin;

import com.devsync.admin.dto.AdminPostAuthor;
import com.devsync.admin.dto.AdminPostResponse;
import com.devsync.admin.dto.AdminProjectSummary;
import com.devsync.admin.dto.AdminUserResponse;
import com.devsync.admin.dto.AdminUserSummary;
import com.devsync.admin.dto.DashboardResponse;
import com.devsync.admin.dto.PlatformStatsResponse;
import com.devsync.common.ResourceNotFoundException;
import com.devsync.feed.entity.Post;
import com.devsync.feed.repository.CommentRepository;
import com.devsync.feed.repository.PostLikeRepository;
import com.devsync.feed.repository.PostRepository;
import com.devsync.kanban.repository.TaskRepository;
import com.devsync.message.repository.MessageRepository;
import com.devsync.project.entity.Project;
import com.devsync.project.repository.ProjectRepository;
import com.devsync.teamroom.repository.TeamRoomRepository;
import com.devsync.user.entity.User;
import com.devsync.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminService {

    private static final long ACTIVE_WINDOW_DAYS = 30;

    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final TeamRoomRepository teamRoomRepository;
    private final TaskRepository taskRepository;
    private final PostRepository postRepository;
    private final MessageRepository messageRepository;
    private final CommentRepository commentRepository;
    private final PostLikeRepository postLikeRepository;

    @Transactional(readOnly = true)
    public DashboardResponse getDashboard() {
        long totalUsers = userRepository.count();
        long activeUsers = userRepository.countActiveUsers(Instant.now().minus(ACTIVE_WINDOW_DAYS, ChronoUnit.DAYS));
        long blockedUsers = userRepository.countByBlockedTrue();
        long totalProjects = projectRepository.count();
        long totalTeams = teamRoomRepository.count();
        long totalTasks = taskRepository.count();
        long totalMessages = messageRepository.count();
        long totalPosts = postRepository.count();

        List<AdminUserSummary> recentUsers = userRepository.findTop5ByOrderByCreatedAtDesc()
                .stream()
                .map(this::toUserSummary)
                .toList();
        List<AdminProjectSummary> recentProjects = projectRepository.findTop5ByOrderByCreatedAtDesc()
                .stream()
                .map(this::toProjectSummary)
                .toList();

        return DashboardResponse.builder()
                .totalUsers(totalUsers)
                .activeUsers(activeUsers)
                .blockedUsers(blockedUsers)
                .totalProjects(totalProjects)
                .totalTeams(totalTeams)
                .totalTasks(totalTasks)
                .totalMessages(totalMessages)
                .totalPosts(totalPosts)
                .recentUsers(recentUsers)
                .recentProjects(recentProjects)
                .build();
    }

    @Transactional(readOnly = true)
    public boolean isAdmin(String userId) {
        return userRepository.findById(userId)
                .map(user -> user.getRole() == User.Role.ADMIN)
                .orElse(false);
    }

    @Transactional(readOnly = true)
    public PlatformStatsResponse getPlatformStats() {
        return PlatformStatsResponse.builder()
                .totalUsers(userRepository.count())
                .totalPosts(postRepository.count())
                .totalProjects(projectRepository.count())
                .totalTeams(teamRoomRepository.count())
                .totalConnections(0)
                .build();
    }

    @Transactional(readOnly = true)
    public List<AdminUserResponse> getAllUsers() {
        List<User> users = userRepository.findAll();
        if (users.isEmpty()) {
            return List.of();
        }

        Set<String> userIds = users.stream().map(User::getId).collect(Collectors.toSet());
        Map<String, Long> postCounts = postRepository.countPostsByUserIdIn(userIds).stream()
                .collect(Collectors.toMap(row -> (String) row[0], row -> (Long) row[1]));

        return users.stream()
                .map(user -> toAdminUserResponse(user, postCounts.getOrDefault(user.getId(), 0L)))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AdminPostResponse> getAllPosts() {
        List<Post> posts = postRepository.findAllByOrderByCreatedAtDesc();
        if (posts.isEmpty()) {
            return List.of();
        }

        Set<String> postIds = posts.stream().map(Post::getId).collect(Collectors.toSet());
        Set<String> userIds = posts.stream().map(Post::getUserId).collect(Collectors.toSet());

        Map<String, User> userMap = userIds.isEmpty() ? Collections.emptyMap()
                : userRepository.findAllById(userIds).stream().collect(Collectors.toMap(User::getId, u -> u));
        Map<String, Long> likeCounts = postLikeRepository.countLikesByPostIdIn(postIds).stream()
                .collect(Collectors.toMap(row -> (String) row[0], row -> (Long) row[1]));
        Map<String, Long> commentCounts = commentRepository.countCommentsByPostIdIn(postIds).stream()
                .collect(Collectors.toMap(row -> (String) row[0], row -> (Long) row[1]));

        return posts.stream()
                .map(post -> toAdminPostResponse(post,
                        userMap.get(post.getUserId()),
                        likeCounts.getOrDefault(post.getId(), 0L),
                        commentCounts.getOrDefault(post.getId(), 0L)))
                .toList();
    }

    @Transactional
    public AdminUserResponse updateUserRole(String userId, String requestedRole, String currentUserId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        User.Role newRole = normalizeRole(requestedRole);

        if (userId.equals(currentUserId) && newRole != User.Role.ADMIN) {
            throw new IllegalArgumentException("You cannot remove your own ADMIN role");
        }

        user.setRole(newRole);
        userRepository.save(user);
        return toAdminUserResponse(user, postRepository.countByUserId(user.getId()));
    }

    @Transactional
    public AdminUserResponse setUserBlocked(String userId, boolean blocked, String currentUserId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        if (userId.equals(currentUserId) && blocked) {
            throw new IllegalArgumentException("You cannot block your own account");
        }

        user.setBlocked(blocked);
        userRepository.save(user);
        return toAdminUserResponse(user, postRepository.countByUserId(user.getId()));
    }

    @Transactional
    public void deletePost(String postId) {
        postRepository.findById(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Post", postId));
        postLikeRepository.deleteByPostId(postId);
        commentRepository.deleteByPostId(postId);
        postRepository.deleteById(postId);
    }

    private User.Role normalizeRole(String role) {
        if (role == null || role.isBlank()) {
            throw new IllegalArgumentException("Role is required");
        }
        if (role.equalsIgnoreCase("DEVELOPER")) {
            return User.Role.USER;
        }
        try {
            return User.Role.valueOf(role.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid role: " + role);
        }
    }

    private AdminUserSummary toUserSummary(User user) {
        return AdminUserSummary.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .username(user.getUsername())
                .avatarUrl(user.getAvatarUrl())
                .role(user.getRole().name())
                .blocked(user.isBlocked())
                .createdAt(user.getCreatedAt())
                .build();
    }

    private AdminProjectSummary toProjectSummary(Project project) {
        return AdminProjectSummary.builder()
                .id(project.getId())
                .name(project.getName())
                .status(project.getStatus().name())
                .ownerId(project.getOwnerId())
                .createdAt(project.getCreatedAt())
                .build();
    }

    private AdminUserResponse toAdminUserResponse(User user, long postCount) {
        return AdminUserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .username(user.getUsername())
                .role(user.getRole().name())
                .avatarUrl(user.getAvatarUrl())
                .blocked(user.isBlocked())
                .postCount(postCount)
                .followerCount(0)
                .createdAt(user.getCreatedAt())
                .build();
    }

    private AdminPostResponse toAdminPostResponse(Post post, User author, long likeCount, long commentCount) {
        AdminPostAuthor authorInfo = author != null
                ? AdminPostAuthor.builder()
                        .id(author.getId()).fullName(author.getFullName())
                        .email(author.getEmail()).username(author.getUsername())
                        .avatarUrl(author.getAvatarUrl()).build()
                : AdminPostAuthor.builder().id(post.getUserId()).fullName("Unknown").email("").build();
        return AdminPostResponse.builder()
                .id(post.getId())
                .content(post.getContent())
                .imageUrl(post.getImageUrl())
                .postType(post.getPostType())
                .likeCount(likeCount)
                .commentCount(commentCount)
                .createdAt(post.getCreatedAt())
                .author(authorInfo)
                .build();
    }
}
