package com.devsync.admin;

import com.devsync.activity.ActivityService;
import com.devsync.activity.entity.ActivityType;
import com.devsync.admin.dto.AdminActivityItem;
import com.devsync.audit.AuditLogService;
import com.devsync.audit.entity.AuditAction;
import com.devsync.audit.entity.AuditStatus;
import com.devsync.admin.dto.AdminKanbanStats;
import com.devsync.admin.dto.AdminPostAuthor;
import com.devsync.admin.dto.AdminPostResponse;
import com.devsync.admin.dto.AdminProjectDetail;
import com.devsync.admin.dto.AdminProjectListItem;
import com.devsync.admin.dto.AdminProjectMember;
import com.devsync.admin.dto.AdminProjectOwner;
import com.devsync.admin.dto.AdminProjectStats;
import com.devsync.admin.dto.AdminProjectSummary;
import com.devsync.admin.dto.AdminTeamSummary;
import com.devsync.admin.dto.AdminUserDetail;
import com.devsync.admin.dto.AdminUserListItem;
import com.devsync.admin.dto.AdminUserResponse;
import com.devsync.admin.dto.AdminUserSummary;
import com.devsync.admin.dto.DashboardResponse;
import com.devsync.admin.dto.PlatformStatsResponse;
import com.devsync.admin.dto.UserStatus;
import com.devsync.common.PageResponse;
import com.devsync.common.ResourceNotFoundException;
import static com.devsync.common.StringUtils.snippet;
import com.devsync.feed.entity.Post;
import com.devsync.feed.repository.CommentRepository;
import com.devsync.feed.repository.PostLikeRepository;
import com.devsync.feed.repository.PostRepository;
import com.devsync.social.repository.FollowRepository;
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
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminService {

    private static final long ACTIVE_WINDOW_DAYS = 30;
    private static final int MAX_PAGE_SIZE = 100;

    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final TeamRoomRepository teamRoomRepository;
    private final TaskRepository taskRepository;
    private final PostRepository postRepository;
    private final MessageRepository messageRepository;
    private final CommentRepository commentRepository;
    private final PostLikeRepository postLikeRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final BoardRepository boardRepository;
    private final BoardColumnRepository boardColumnRepository;
    private final ActivityService activityService;
    private final AuditLogService auditLogService;
    private final com.devsync.auth.RefreshTokenService refreshTokenService;
    private final FollowRepository followRepository;

    @Transactional(readOnly = true)
    public DashboardResponse getDashboard() {
        long totalUsers = userRepository.count();
        long activeUsers = userRepository.countActiveUsers(Instant.now().minus(ACTIVE_WINDOW_DAYS, ChronoUnit.DAYS));
        long blockedUsers = userRepository.countByBlockedTrue();
        long totalProjects = projectRepository.countByDeletedFalse();
        long totalTeams = teamRoomRepository.count();
        long totalTasks = taskRepository.count();
        long totalMessages = messageRepository.count();
        long totalPosts = postRepository.count();

        List<AdminUserSummary> recentUsers = userRepository.findTop5ByOrderByCreatedAtDesc()
                .stream()
                .map(this::toUserSummary)
                .toList();
        List<AdminProjectSummary> recentProjects = projectRepository.findTop5ByDeletedFalseOrderByCreatedAtDesc()
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
                .totalProjects(projectRepository.countByDeletedFalse())
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
        Map<String, Long> followerCounts = followRepository.countByFollowingIdInGrouped(userIds).stream()
                .collect(Collectors.toMap(row -> (String) row[0], row -> (Long) row[1]));

        return users.stream()
                .map(user -> toAdminUserResponse(user,
                        postCounts.getOrDefault(user.getId(), 0L),
                        followerCounts.getOrDefault(user.getId(), 0L)))
                .toList();
    }

    @Transactional(readOnly = true)
    public PageResponse<AdminUserListItem> getUsersPage(int page, int size, String sortBy, String sortDir,
                                                        String search, String role, String status,
                                                        String from, String to) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        String sortField = normalizeSortField(sortBy);
        Sort.Direction direction = "asc".equalsIgnoreCase(sortDir) ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(safePage, safeSize, Sort.by(direction, sortField));

        User.Role roleFilter = null;
        if (role != null && !role.isBlank()) {
            try {
                roleFilter = User.Role.valueOf(role.toUpperCase());
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("Invalid role filter: " + role);
            }
        }
        String statusFilter = (status == null || status.isBlank()) ? null : status.toUpperCase();
        String searchFilter = (search == null || search.isBlank()) ? null : search.trim();
        Instant fromInstant = parseDate(from, false, "Invalid from date");
        Instant toInstant = parseDate(to, true, "Invalid to date");

        Page<User> users = userRepository.searchAdminUsers(searchFilter, roleFilter, statusFilter,
                fromInstant, toInstant, pageable);

        List<AdminUserListItem> items = users.getContent().stream()
                .map(this::toAdminUserListItem)
                .toList();

        return PageResponse.<AdminUserListItem>builder()
                .content(items)
                .page(users.getNumber())
                .size(users.getSize())
                .totalElements(users.getTotalElements())
                .totalPages(users.getTotalPages())
                .last(users.isLast())
                .build();
    }

    @Transactional(readOnly = true)
    public AdminUserDetail getUserDetail(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        List<AdminProjectSummary> joined = projectRepository.findProjectsByUserId(userId).stream()
                .map(this::toProjectSummary)
                .toList();
        List<AdminProjectSummary> owned = projectRepository.findByOwnerId(userId).stream()
                .map(this::toProjectSummary)
                .toList();
        List<AdminTeamSummary> teams = teamRoomRepository.findRoomsByUserId(userId).stream()
                .map(room -> AdminTeamSummary.builder()
                        .id(room.getId())
                        .name(room.getName())
                        .createdAt(room.getCreatedAt())
                        .build())
                .toList();

        return AdminUserDetail.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .username(user.getUsername())
                .avatarUrl(user.getAvatarUrl())
                .bio(user.getBio())
                .jobTitle(user.getJobTitle())
                .company(user.getCompany())
                .location(user.getLocation())
                .role(user.getRole().name())
                .status(toStatus(user).name())
                .emailVerified(user.isEmailVerified())
                .authProvider(user.getAuthProvider())
                .createdAt(user.getCreatedAt())
                .lastLoginAt(user.getLastLoginAt())
                .projectsJoined(joined)
                .projectsOwned(owned)
                .teams(teams)
                .postsCount(postRepository.countByUserId(userId))
                .messagesCount(messageRepository.countMessagesByUserId(userId))
                .build();
    }

    @Transactional
    public void deleteUser(String userId, String currentUserId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        if (userId.equals(currentUserId)) {
            throw new IllegalArgumentException("You cannot delete your own account");
        }
        ensureNotLastActiveAdmin(user, "delete");

        user.setDeleted(true);
        user.setDeletedAt(Instant.now());
        userRepository.save(user);
        // Deleted accounts must not be able to refresh — kill every live session now.
        refreshTokenService.revokeAllForUser(userId);
        auditLogService.record(currentUserId, userId, AuditAction.USER_DELETED, AuditStatus.SUCCESS,
                "Deleted user: " + user.getEmail() + " (" + userId + ")");
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
        if (newRole != User.Role.ADMIN) {
            ensureNotLastActiveAdmin(user, "demote");
        }

        user.setRole(newRole);
        userRepository.save(user);
        activityService.record(currentUserId, null, ActivityType.ROLE_CHANGED,
                "Role changed", user.getFullName() + " -> " + newRole.name(), null);
        auditLogService.record(currentUserId, userId, AuditAction.ROLE_CHANGED, AuditStatus.SUCCESS,
                "Changed role of " + user.getEmail() + " to " + newRole.name());
        if (newRole == User.Role.ADMIN) {
            auditLogService.record(currentUserId, userId, AuditAction.ADMIN_CREATED, AuditStatus.SUCCESS,
                    "Granted ADMIN role to " + user.getEmail());
        }
        return toAdminUserResponse(user, postRepository.countByUserId(user.getId()),
                followRepository.countByFollowingId(userId));
    }

    @Transactional
    public AdminUserResponse setUserBlocked(String userId, boolean blocked, String currentUserId, String reason) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        if (userId.equals(currentUserId) && blocked) {
            throw new IllegalArgumentException("You cannot block your own account");
        }
        if (blocked) {
            ensureNotLastActiveAdmin(user, "block");
        }

        user.setBlocked(blocked);
        userRepository.save(user);
        if (blocked) {
            // A blocked user must lose every live session immediately — no refresh.
            refreshTokenService.revokeAllForUser(userId);
        }
        String reasonDetail = (reason == null || reason.isBlank()) ? "" : " - Reason: " + reason.trim();
        if (blocked) {
            activityService.record(currentUserId, null, ActivityType.USER_BLOCKED,
                    "User blocked", user.getFullName(), null);
            auditLogService.record(currentUserId, userId, AuditAction.USER_BLOCKED, AuditStatus.SUCCESS,
                    "Blocked user: " + user.getEmail() + reasonDetail);
        } else {
            activityService.record(currentUserId, null, ActivityType.USER_UNBLOCKED,
                    "User unblocked", user.getFullName(), null);
            auditLogService.record(currentUserId, userId, AuditAction.USER_UNBLOCKED, AuditStatus.SUCCESS,
                    "Unblocked user: " + user.getEmail() + reasonDetail);
        }
        return toAdminUserResponse(user, postRepository.countByUserId(user.getId()),
                followRepository.countByFollowingId(userId));
    }

    @Transactional
    public void deletePost(String postId) {
        postRepository.findById(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Post", postId));
        postLikeRepository.deleteByPostId(postId);
        commentRepository.deleteByPostId(postId);
        postRepository.deleteById(postId);
    }

    /**
     * Project statistics for the admin projects header: total / active / archived / public / private.
     */
    @Transactional(readOnly = true)
    public AdminProjectStats getProjectStats() {
        return AdminProjectStats.builder()
                .total(projectRepository.countByDeletedFalse())
                .active(projectRepository.countByStatusAndDeletedFalse(Project.ProjectStatus.ACTIVE))
                .archived(projectRepository.countByStatusAndDeletedFalse(Project.ProjectStatus.ARCHIVED))
                .publicCount(projectRepository.countByVisibilityAndDeletedFalse(Project.ProjectVisibility.PUBLIC))
                .privateCount(projectRepository.countByVisibilityAndDeletedFalse(Project.ProjectVisibility.PRIVATE))
                .build();
    }

    /**
     * Paginated, searchable, filterable admin project list.
     * Filters: search (name/owner name/owner email), visibility, status (incl. DELETED via soft-delete flag).
     * Sorts: newest/oldest/mostActive via JPQL; mostMembers/mostTasks computed in-memory per page.
     * Batch queries only - no N+1.
     */
    @Transactional(readOnly = true)
    public PageResponse<AdminProjectListItem> getProjectsPage(int page, int size, String sortBy, String sortDir,
                                                              String search, String visibility, String status) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        String sortField = normalizeProjectSortField(sortBy);
        Sort.Direction direction = "asc".equalsIgnoreCase(sortDir) ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(safePage, safeSize, Sort.by(direction, sortField));

        Project.ProjectVisibility visFilter = parseVisibility(visibility);
        Project.ProjectStatus statusFilter = parseProjectStatus(status);
        boolean deleted = "DELETED".equalsIgnoreCase(status);
        String searchFilter = (search == null || search.isBlank()) ? null : search.trim();

        Page<Project> projects = projectRepository.searchAdminProjects(searchFilter, visFilter, statusFilter, deleted, pageable);

        List<Project> content = projects.getContent();
        Map<String, Long> memberCounts = memberCounts(content);
        Map<String, Long> taskCounts = taskCounts(content);
        Map<String, Long> postCounts = postCounts(content);
        Map<String, User> ownerMap = ownerMap(content);

        List<AdminProjectListItem> items = content.stream()
                .map(p -> toProjectListItem(p, memberCounts, taskCounts, postCounts, ownerMap))
                .collect(Collectors.toCollection(ArrayList::new));

        String sortKey = sortBy == null ? "" : sortBy.toLowerCase();
        if (sortKey.contains("member")) {
            items.sort(Comparator.comparingLong(AdminProjectListItem::getMembersCount).reversed());
        } else if (sortKey.contains("task")) {
            items.sort(Comparator.comparingLong(AdminProjectListItem::getTasksCount).reversed());
        }

        return PageResponse.<AdminProjectListItem>builder()
                .content(items)
                .page(projects.getNumber())
                .size(projects.getSize())
                .totalElements(projects.getTotalElements())
                .totalPages(projects.getTotalPages())
                .last(projects.isLast())
                .build();
    }

    /**
     * Full admin view of a project: owner, members, kanban stats, posts/messages counts and recent activity.
     * Uses batch queries only - no N+1.
     */
    @Transactional(readOnly = true)
    public AdminProjectDetail getProjectDetail(String projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project", projectId));

        User owner = userRepository.findById(project.getOwnerId()).orElse(null);
        AdminProjectOwner ownerDto = owner != null ? toOwner(owner)
                : AdminProjectOwner.builder().id(project.getOwnerId()).fullName("Unknown").build();

        List<ProjectMember> members = projectMemberRepository.findByProjectId(projectId);
        Map<String, User> userMap = members.isEmpty() ? Collections.emptyMap()
                : userRepository.findAllById(members.stream().map(ProjectMember::getUserId).collect(Collectors.toSet()))
                        .stream().collect(Collectors.toMap(User::getId, u -> u));
        List<AdminProjectMember> memberDtos = members.stream()
                .map(m -> {
                    User memberUser = userMap.get(m.getUserId());
                    return AdminProjectMember.builder()
                            .userId(m.getUserId())
                            .fullName(memberUser != null ? memberUser.getFullName() : "Unknown")
                            .email(memberUser != null ? memberUser.getEmail() : null)
                            .avatarUrl(memberUser != null ? memberUser.getAvatarUrl() : null)
                            .role(m.getRole().name())
                            .build();
                })
                .toList();

        Set<String> memberIds = members.stream().map(ProjectMember::getUserId).collect(Collectors.toSet());
        long postsCount = memberIds.isEmpty() ? 0 : postRepository.countPostsByUserIdIn(memberIds).stream()
                .mapToLong(row -> (Long) row[1])
                .sum();

        return AdminProjectDetail.builder()
                .id(project.getId())
                .name(project.getName())
                .description(project.getDescription())
                .owner(ownerDto)
                .visibility(project.getVisibility() != null ? project.getVisibility().name() : "PUBLIC")
                .status(project.getStatus() != null ? project.getStatus().name() : "ACTIVE")
                .memberCount(members.size())
                .members(memberDtos)
                .kanbanStats(kanbanStats(projectId))
                .postsCount(postsCount)
                .messagesCount(messagesCount(projectId))
                .recentActivity(recentActivity(projectId))
                .createdAt(project.getCreatedAt())
                .updatedAt(project.getUpdatedAt())
                .build();
    }

    @Transactional
    public AdminProjectListItem archiveProject(String projectId, String adminId) {
        Project project = getEditableProject(projectId);
        project.setStatus(Project.ProjectStatus.ARCHIVED);
        projectRepository.save(project);
        activityService.record(adminId, projectId, ActivityType.PROJECT_ARCHIVED,
                "Project archived", project.getName(), null);
        auditLogService.record(adminId, null, AuditAction.PROJECT_ARCHIVED, AuditStatus.SUCCESS,
                "Archived project: " + project.getName() + " (" + projectId + ")");
        return toProjectListItem(project);
    }

    @Transactional
    public AdminProjectListItem restoreProject(String projectId, String adminId) {
        Project project = getEditableProject(projectId);
        project.setStatus(Project.ProjectStatus.ACTIVE);
        projectRepository.save(project);
        activityService.record(adminId, projectId, ActivityType.PROJECT_RESTORED,
                "Project restored", project.getName(), null);
        auditLogService.record(adminId, null, AuditAction.PROJECT_RESTORED, AuditStatus.SUCCESS,
                "Restored project: " + project.getName() + " (" + projectId + ")");
        return toProjectListItem(project);
    }

    @Transactional
    public AdminProjectListItem setProjectVisibility(String projectId, String visibility, String adminId) {
        Project.ProjectVisibility parsed = parseVisibility(visibility);
        if (parsed == null) {
            throw new IllegalArgumentException("Visibility is required");
        }
        Project project = getEditableProject(projectId);
        project.setVisibility(parsed);
        projectRepository.save(project);
        activityService.record(adminId, projectId, ActivityType.PROJECT_UPDATED,
                "Project visibility changed", project.getName(), null);
        auditLogService.record(adminId, null, AuditAction.VISIBILITY_CHANGED, AuditStatus.SUCCESS,
                "Visibility changed to " + parsed + " for project: " + project.getName() + " (" + projectId + ")");
        return toProjectListItem(project);
    }

    @Transactional
    public void deleteProject(String projectId, String adminId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project", projectId));
        project.setDeleted(true);
        project.setDeletedAt(Instant.now());
        projectRepository.save(project);
        activityService.record(adminId, projectId, ActivityType.PROJECT_DELETED,
                "Project deleted", project.getName(), null);
        auditLogService.record(adminId, null, AuditAction.PROJECT_DELETED, AuditStatus.SUCCESS,
                "Deleted project: " + project.getName() + " (" + projectId + ")");
    }

    private Project getEditableProject(String projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project", projectId));
        if (project.isDeleted()) {
            throw new IllegalArgumentException("Project is deleted and cannot be modified");
        }
        return project;
    }

    private Map<String, Long> memberCounts(List<Project> projects) {
        Set<String> ids = projects.stream().map(Project::getId).collect(Collectors.toSet());
        if (ids.isEmpty()) return Collections.emptyMap();
        return projectMemberRepository.countMembersByProjectIdIn(ids).stream()
                .collect(Collectors.toMap(row -> (String) row[0], row -> (Long) row[1]));
    }

    private Map<String, Long> taskCounts(List<Project> projects) {
        Set<String> projectIds = projects.stream().map(Project::getId).collect(Collectors.toSet());
        if (projectIds.isEmpty()) return Collections.emptyMap();
        List<Board> boards = boardRepository.findByProjectIdIn(projectIds);
        if (boards.isEmpty()) return Collections.emptyMap();
        Map<String, Long> perBoard = taskRepository.countTasksByBoardIdIn(
                        boards.stream().map(Board::getId).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(row -> (String) row[0], row -> (Long) row[1]));
        Map<String, Long> result = new HashMap<>();
        for (Board b : boards) {
            result.merge(b.getProjectId(), perBoard.getOrDefault(b.getId(), 0L), Long::sum);
        }
        return result;
    }

    private Map<String, Long> postCounts(List<Project> projects) {
        Set<String> projectIds = projects.stream().map(Project::getId).collect(Collectors.toSet());
        if (projectIds.isEmpty()) return Collections.emptyMap();
        List<ProjectMember> members = projectMemberRepository.findByProjectIdIn(projectIds);
        if (members.isEmpty()) return Collections.emptyMap();
        Map<String, Long> perUser = postRepository.countPostsByUserIdIn(
                        members.stream().map(ProjectMember::getUserId).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(row -> (String) row[0], row -> (Long) row[1]));
        Map<String, Long> result = new HashMap<>();
        for (ProjectMember m : members) {
            result.merge(m.getProjectId(), perUser.getOrDefault(m.getUserId(), 0L), Long::sum);
        }
        return result;
    }

    private Map<String, User> ownerMap(List<Project> projects) {
        Set<String> ownerIds = projects.stream().map(Project::getOwnerId).collect(Collectors.toSet());
        if (ownerIds.isEmpty()) return Collections.emptyMap();
        return userRepository.findAllById(ownerIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u));
    }

    private AdminProjectListItem toProjectListItem(Project p) {
        return toProjectListItem(p, memberCounts(List.of(p)), taskCounts(List.of(p)),
                postCounts(List.of(p)), ownerMap(List.of(p)));
    }

    private AdminProjectListItem toProjectListItem(Project p, Map<String, Long> memberCounts,
                                                   Map<String, Long> taskCounts, Map<String, Long> postCounts,
                                                   Map<String, User> ownerMap) {
        User owner = ownerMap.get(p.getOwnerId());
        return AdminProjectListItem.builder()
                .id(p.getId())
                .name(p.getName())
                .description(p.getDescription())
                .ownerId(p.getOwnerId())
                .ownerName(owner != null ? owner.getFullName() : "Unknown")
                .ownerEmail(owner != null ? owner.getEmail() : null)
                .ownerAvatarUrl(owner != null ? owner.getAvatarUrl() : null)
                .visibility(p.getVisibility() != null ? p.getVisibility().name() : "PUBLIC")
                .status(p.getStatus() != null ? p.getStatus().name() : "ACTIVE")
                .membersCount(memberCounts.getOrDefault(p.getId(), 0L))
                .tasksCount(taskCounts.getOrDefault(p.getId(), 0L))
                .postsCount(postCounts.getOrDefault(p.getId(), 0L))
                .createdAt(p.getCreatedAt())
                .updatedAt(p.getUpdatedAt())
                .build();
    }

    private AdminProjectOwner toOwner(User user) {
        return AdminProjectOwner.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .username(user.getUsername())
                .avatarUrl(user.getAvatarUrl())
                .build();
    }

    private AdminKanbanStats kanbanStats(String projectId) {
        List<Board> boards = boardRepository.findByProjectId(projectId);
        if (boards.isEmpty()) {
            return AdminKanbanStats.builder().totalTasks(0).completedTasks(0).pendingTasks(0).build();
        }
        List<String> boardIds = boards.stream().map(Board::getId).toList();
        Map<String, BoardColumn> columnMap = boardColumnRepository.findByBoardIdIn(boardIds).stream()
                .collect(Collectors.toMap(BoardColumn::getId, c -> c));
        List<Task> tasks = taskRepository.findByBoardIdIn(boardIds);
        long completed = tasks.stream()
                .filter(t -> {
                    BoardColumn col = columnMap.get(t.getColumnId());
                    return col != null && isDoneColumn(col.getName());
                })
                .count();
        return AdminKanbanStats.builder()
                .totalTasks(tasks.size())
                .completedTasks(completed)
                .pendingTasks(tasks.size() - completed)
                .build();
    }

    private boolean isDoneColumn(String name) {
        String n = name == null ? "" : name.toLowerCase();
        return n.contains("done") || n.contains("complete");
    }

    private long messagesCount(String projectId) {
        List<String> roomIds = teamRoomRepository.findByProjectId(projectId).stream()
                .map(TeamRoom::getId)
                .toList();
        if (roomIds.isEmpty()) return 0;
        return messageRepository.countByRoomIdIn(roomIds);
    }

    private List<AdminActivityItem> recentActivity(String projectId) {
        List<Board> boards = boardRepository.findByProjectId(projectId);
        List<String> boardIds = boards.stream().map(Board::getId).toList();
        List<String> roomIds = teamRoomRepository.findByProjectId(projectId).stream()
                .map(TeamRoom::getId)
                .toList();

        List<AdminActivityItem> items = new ArrayList<>();
        if (!boardIds.isEmpty()) {
            taskRepository.findTop5ByBoardIdInOrderByUpdatedAtDesc(boardIds).forEach(t ->
                    items.add(AdminActivityItem.builder()
                            .type("TASK")
                            .title("Task updated: " + t.getTitle())
                            .timestamp(t.getUpdatedAt())
                            .build()));
        }
        if (!roomIds.isEmpty()) {
            messageRepository.findTop5ByRoomIdInOrderByCreatedAtDesc(roomIds).forEach(m ->
                    items.add(AdminActivityItem.builder()
                            .type("MESSAGE")
                            .title("New message: " + snippet(m.getContent(), 60))
                            .timestamp(m.getCreatedAt())
                            .build()));
        }
        items.sort((a, b) -> {
            if (a.getTimestamp() == null && b.getTimestamp() == null) return 0;
            if (a.getTimestamp() == null) return 1;
            if (b.getTimestamp() == null) return -1;
            return b.getTimestamp().compareTo(a.getTimestamp());
        });
        return items.stream().limit(10).toList();
    }



    private Project.ProjectVisibility parseVisibility(String visibility) {
        if (visibility == null || visibility.isBlank()) {
            return null;
        }
        try {
            return Project.ProjectVisibility.valueOf(visibility.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid visibility filter: " + visibility);
        }
    }

    private Project.ProjectStatus parseProjectStatus(String status) {
        if (status == null || status.isBlank() || "DELETED".equalsIgnoreCase(status)) {
            return null;
        }
        try {
            return Project.ProjectStatus.valueOf(status.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid status filter: " + status);
        }
    }

    private String normalizeProjectSortField(String sortBy) {
        if (sortBy == null || sortBy.isBlank()) {
            return "createdAt";
        }
        return switch (sortBy.toLowerCase()) {
            case "name" -> "name";
            case "oldest" -> "createdAt";
            case "mostactive", "most_active", "updatedat", "updated" -> "updatedAt";
            default -> "createdAt";
        };
    }

    /**
     * Rejects operations that would leave the platform with zero active admins.
     * An admin counts as active only when not deleted and not blocked.
     */
    private void ensureNotLastActiveAdmin(User target, String operation) {
        boolean isActiveAdmin = target.getRole() == User.Role.ADMIN
                && !target.isDeleted() && !target.isBlocked();
        if (isActiveAdmin
                && userRepository.countByRoleAndDeletedFalseAndBlockedFalse(User.Role.ADMIN) <= 1) {
            throw new IllegalArgumentException("Cannot " + operation + " the last active admin");
        }
    }

    /**
     * Parses a date filter. Accepts either a full ISO instant or a date-only
     * value (yyyy-MM-dd). Date-only values are resolved in UTC; {@code endOfDay}
     * pushes the bound to the last instant of that day so "to" filters are inclusive.
     */
    private Instant parseDate(String raw, boolean endOfDay, String message) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return Instant.parse(raw);
        } catch (Exception ignored) {
            // fall through to date-only parsing
        }
        try {
            LocalDate date = LocalDate.parse(raw.trim());
            return endOfDay
                    ? date.atTime(LocalTime.MAX).toInstant(ZoneOffset.UTC)
                    : date.atStartOfDay(ZoneOffset.UTC).toInstant();
        } catch (Exception e) {
            throw new IllegalArgumentException(message + ": " + raw);
        }
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

    private String normalizeSortField(String sortBy) {
        if (sortBy == null || sortBy.isBlank()) {
            return "createdAt";
        }
        return switch (sortBy.toLowerCase()) {
            case "fullname", "name" -> "fullName";
            case "username" -> "username";
            case "email" -> "email";
            case "role" -> "role";
            case "lastlogin", "lastloginat" -> "lastLoginAt";
            default -> "createdAt";
        };
    }

    private UserStatus toStatus(User user) {
        if (user.isDeleted()) {
            return UserStatus.DELETED;
        }
        if (user.isBlocked()) {
            return UserStatus.BLOCKED;
        }
        return UserStatus.ACTIVE;
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

    private AdminUserListItem toAdminUserListItem(User user) {
        return AdminUserListItem.builder()
                .id(user.getId())
                .avatarUrl(user.getAvatarUrl())
                .fullName(user.getFullName())
                .username(user.getUsername())
                .email(user.getEmail())
                .role(user.getRole().name())
                .status(toStatus(user).name())
                .createdAt(user.getCreatedAt())
                .lastLoginAt(user.getLastLoginAt())
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

    private AdminUserResponse toAdminUserResponse(User user, long postCount, long followerCount) {
        return AdminUserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .username(user.getUsername())
                .role(user.getRole().name())
                .avatarUrl(user.getAvatarUrl())
                .blocked(user.isBlocked())
                .postCount(postCount)
                .followerCount(followerCount)
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
