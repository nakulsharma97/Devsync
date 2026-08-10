package com.devsync.activity;

import com.devsync.activity.dto.ActivityResponse;
import com.devsync.activity.dto.ActivityUserDto;
import com.devsync.activity.dto.AdminActivityStats;
import com.devsync.activity.entity.Activity;
import com.devsync.activity.entity.ActivityType;
import com.devsync.activity.repository.ActivityRepository;
import com.devsync.common.PageResponse;
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
import java.time.ZoneOffset;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ActivityService {

    private static final int MAX_PAGE_SIZE = 100;
    private static final int EXPORT_LIMIT = 5000;

    private static final Set<ActivityType> PROJECT_TYPES = Set.of(
            ActivityType.PROJECT_CREATED, ActivityType.PROJECT_UPDATED,
            ActivityType.PROJECT_ARCHIVED, ActivityType.PROJECT_RESTORED, ActivityType.PROJECT_DELETED);
    private static final Set<ActivityType> TASK_TYPES = Set.of(
            ActivityType.TASK_CREATED, ActivityType.TASK_ASSIGNED, ActivityType.TASK_UPDATED,
            ActivityType.TASK_MOVED, ActivityType.TASK_COMPLETED, ActivityType.TASK_DELETED);

    private final ActivityRepository activityRepository;
    private final UserRepository userRepository;

    /**
     * Records a new activity event. Called from domain services after the underlying
     * operation succeeds (joins the caller's transaction).
     */
    @Transactional
    public void record(String userId, String projectId, ActivityType activityType,
                       String title, String description, String metadata) {
        activityRepository.save(Activity.builder()
                .userId(userId)
                .projectId(projectId)
                .activityType(activityType)
                .title(title)
                .description(description)
                .metadata(metadata)
                .build());
    }

    @Transactional(readOnly = true)
    public PageResponse<ActivityResponse> getProjectActivities(String projectId, int page, int size) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        Page<Activity> activities = activityRepository.findByProjectIdOrderByCreatedAtDesc(
                projectId, PageRequest.of(safePage, safeSize));
        return toPageResponse(activities);
    }

    @Transactional(readOnly = true)
    public PageResponse<ActivityResponse> getUserActivities(String userId, int page, int size) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        Page<Activity> activities = activityRepository.findByUserIdOrderByCreatedAtDesc(
                userId, PageRequest.of(safePage, safeSize));
        return toPageResponse(activities);
    }

    /**
     * Admin activity feed with filters: project, user, activity type, date range.
     * All queries are batched - no N+1.
     */
    @Transactional(readOnly = true)
    public PageResponse<ActivityResponse> getAdminActivities(String projectId, String userId, String activityType,
                                                             String from, String to, int page, int size) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        ActivityType type = parseType(activityType);
        Instant fromInstant = parseInstant(from, "Invalid from date");
        Instant toInstant = parseInstant(to, "Invalid to date");
        Pageable pageable = PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<Activity> activities = activityRepository.searchAdminActivities(
                blankToNull(projectId), blankToNull(userId), type, fromInstant, toInstant, pageable);
        return toPageResponse(activities);
    }

    /**
     * Exports filtered activities (capped at EXPORT_LIMIT rows) for CSV download.
     * Same filters as getAdminActivities.
     */
    @Transactional(readOnly = true)
    public List<ActivityResponse> exportActivities(String projectId, String userId, String activityType,
                                                   String from, String to) {
        ActivityType type = parseType(activityType);
        Instant fromInstant = parseInstant(from, "Invalid from date");
        Instant toInstant = parseInstant(to, "Invalid to date");

        Page<Activity> activities = activityRepository.searchAdminActivities(
                blankToNull(projectId), blankToNull(userId), type, fromInstant, toInstant,
                PageRequest.of(0, EXPORT_LIMIT, Sort.by(Sort.Direction.DESC, "createdAt")));

        Map<String, User> userMap = batchUsers(activities.getContent());
        return activities.getContent().stream()
                .map(a -> toResponse(a, userMap.get(a.getUserId())))
                .toList();
    }

    public String toCsv(List<ActivityResponse> activities) {
        StringBuilder sb = new StringBuilder();
        sb.append("id,created_at,activity_type,title,description,user_id,user_name,project_id\n");
        for (ActivityResponse a : activities) {
            sb.append(csv(a.getId())).append(',')
                    .append(csv(a.getCreatedAt() != null ? a.getCreatedAt().toString() : "")).append(',')
                    .append(csv(a.getActivityType())).append(',')
                    .append(csv(a.getTitle())).append(',')
                    .append(csv(a.getDescription())).append(',')
                    .append(csv(a.getUser() != null ? a.getUser().getId() : null)).append(',')
                    .append(csv(a.getUser() != null ? a.getUser().getFullName() : null)).append(',')
                    .append(csv(a.getProjectId())).append('\n');
        }
        return sb.toString();
    }

    private String csv(String value) {
        if (value == null) return "";
        String escaped = value.replace("\"", "\"\"");
        if (escaped.contains(",") || escaped.contains("\"") || escaped.contains("\n")) {
            return "\"" + escaped + "\"";
        }
        return escaped;
    }

    @Transactional(readOnly = true)
    public AdminActivityStats getAdminActivityStats() {
        Instant startOfToday = LocalDate.now().atStartOfDay().toInstant(ZoneOffset.UTC);
        return AdminActivityStats.builder()
                .todayCount(activityRepository.countByCreatedAtAfter(startOfToday))
                .projects(activityRepository.countByActivityTypeInAndCreatedAtAfter(PROJECT_TYPES, startOfToday))
                .tasks(activityRepository.countByActivityTypeInAndCreatedAtAfter(TASK_TYPES, startOfToday))
                .messages(activityRepository.countByActivityTypeInAndCreatedAtAfter(
                        Set.of(ActivityType.MESSAGE_SENT), startOfToday))
                .build();
    }

    private PageResponse<ActivityResponse> toPageResponse(Page<Activity> activities) {
        List<Activity> content = activities.getContent();
        Map<String, User> userMap = batchUsers(content);

        List<ActivityResponse> items = content.stream()
                .map(a -> toResponse(a, userMap.get(a.getUserId())))
                .toList();

        return PageResponse.<ActivityResponse>builder()
                .content(items)
                .page(activities.getNumber())
                .size(activities.getSize())
                .totalElements(activities.getTotalElements())
                .totalPages(activities.getTotalPages())
                .last(activities.isLast())
                .build();
    }

    private Map<String, User> batchUsers(List<Activity> activities) {
        if (activities.isEmpty()) return Collections.emptyMap();
        Set<String> ids = activities.stream().map(Activity::getUserId).collect(Collectors.toSet());
        return userRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(User::getId, u -> u));
    }

    private ActivityResponse toResponse(Activity a, User user) {
        ActivityUserDto userDto = user != null
                ? ActivityUserDto.builder().id(user.getId()).fullName(user.getFullName())
                        .username(user.getUsername()).avatarUrl(user.getAvatarUrl()).build()
                : ActivityUserDto.builder().id(a.getUserId()).fullName("Unknown").build();
        return ActivityResponse.builder()
                .id(a.getId())
                .user(userDto)
                .projectId(a.getProjectId())
                .activityType(a.getActivityType().name())
                .title(a.getTitle())
                .description(a.getDescription())
                .createdAt(a.getCreatedAt())
                .build();
    }

    private ActivityType parseType(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return ActivityType.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid activity type: " + raw);
        }
    }

    private Instant parseInstant(String raw, String message) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return Instant.parse(raw);
        } catch (Exception e) {
            throw new IllegalArgumentException(message + ": " + raw);
        }
    }

    private String blankToNull(String value) {
        return (value == null || value.isBlank()) ? null : value.trim();
    }
}
