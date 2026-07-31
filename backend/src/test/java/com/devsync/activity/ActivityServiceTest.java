package com.devsync.activity;

import com.devsync.activity.dto.ActivityResponse;
import com.devsync.activity.dto.AdminActivityStats;
import com.devsync.activity.entity.Activity;
import com.devsync.activity.entity.ActivityType;
import com.devsync.activity.repository.ActivityRepository;
import com.devsync.common.PageResponse;
import com.devsync.user.entity.User;
import com.devsync.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.Instant;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ActivityServiceTest {

    @Mock private ActivityRepository activityRepository;
    @Mock private UserRepository userRepository;

    @Captor private ArgumentCaptor<Activity> activityCaptor;

    private ActivityService activityService;

    @BeforeEach
    void setUp() {
        activityService = new ActivityService(activityRepository, userRepository);
    }

    private Activity activity(String id, String userId, String projectId, ActivityType type, String title) {
        Activity a = Activity.builder().userId(userId).projectId(projectId).activityType(type).title(title).build();
        a.setId(id);
        a.setCreatedAt(Instant.now());
        return a;
    }

    private User user(String id, String name) {
        User u = User.builder().email(id + "@test.com").fullName(name).username("u" + id).build();
        u.setId(id);
        return u;
    }

    @Test
    void record_shouldPersistActivity() {
        when(activityRepository.save(any(Activity.class))).thenAnswer(inv -> inv.getArgument(0));

        activityService.record("u1", "p1", ActivityType.TASK_CREATED, "Task created", "Build feature", null);

        verify(activityRepository).save(activityCaptor.capture());
        Activity saved = activityCaptor.getValue();
        assertThat(saved.getUserId()).isEqualTo("u1");
        assertThat(saved.getProjectId()).isEqualTo("p1");
        assertThat(saved.getActivityType()).isEqualTo(ActivityType.TASK_CREATED);
        assertThat(saved.getTitle()).isEqualTo("Task created");
    }

    @Test
    void getProjectActivities_shouldReturnPagedResponses_WithBatchLoadedUsers() {
        Activity a1 = activity("a1", "u1", "p1", ActivityType.PROJECT_CREATED, "Project created");
        when(activityRepository.findByProjectIdOrderByCreatedAtDesc(eq("p1"), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(a1), PageRequest.of(0, 20), 1));
        when(userRepository.findAllById(Set.of("u1"))).thenReturn(List.of(user("u1", "Dev User")));

        PageResponse<ActivityResponse> result = activityService.getProjectActivities("p1", 0, 20);

        assertThat(result.getContent()).hasSize(1);
        ActivityResponse item = result.getContent().get(0);
        assertThat(item.getActivityType()).isEqualTo("PROJECT_CREATED");
        assertThat(item.getTitle()).isEqualTo("Project created");
        assertThat(item.getUser().getFullName()).isEqualTo("Dev User");
        // Batch-loaded, not individual lookups
        verify(userRepository).findAllById(anySet());
        verify(userRepository, never()).findById(anyString());
    }

    @Test
    void getUserActivities_shouldReturnPagedResponses() {
        Activity a1 = activity("a1", "u1", null, ActivityType.POST_CREATED, "Post created");
        when(activityRepository.findByUserIdOrderByCreatedAtDesc(eq("u1"), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(a1), PageRequest.of(0, 20), 1));
        when(userRepository.findAllById(anySet())).thenReturn(List.of(user("u1", "Dev User")));

        PageResponse<ActivityResponse> result = activityService.getUserActivities("u1", 0, 20);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getActivityType()).isEqualTo("POST_CREATED");
        assertThat(result.getContent().get(0).getProjectId()).isNull();
    }

    @Test
    void getAdminActivities_shouldApplyFilters() {
        Activity a1 = activity("a1", "u1", "p1", ActivityType.TASK_MOVED, "Task moved");
        when(activityRepository.searchAdminActivities(
                eq("p1"), isNull(), eq(ActivityType.TASK_MOVED), isNull(), isNull(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(a1), PageRequest.of(0, 20), 1));
        when(userRepository.findAllById(anySet())).thenReturn(List.of(user("u1", "Dev User")));

        PageResponse<ActivityResponse> result =
                activityService.getAdminActivities("p1", null, "TASK_MOVED", null, null, 0, 20);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getActivityType()).isEqualTo("TASK_MOVED");
        assertThat(result.getContent().get(0).getUser().getFullName()).isEqualTo("Dev User");
    }

    @Test
    void getAdminActivities_shouldThrow_ForInvalidType() {
        assertThatThrownBy(() -> activityService.getAdminActivities(null, null, "BOGUS", null, null, 0, 20))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Invalid activity type");
    }

    @Test
    void getAdminActivities_shouldThrow_ForInvalidFromDate() {
        assertThatThrownBy(() -> activityService.getAdminActivities(null, null, null, "not-a-date", null, 0, 20))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Invalid from date");
    }

    @Test
    void getAdminActivityStats_shouldReturnCounts() {
        when(activityRepository.countByCreatedAtAfter(any(Instant.class))).thenReturn(10L);
        when(activityRepository.countByActivityTypeInAndCreatedAtAfter(anySet(), any(Instant.class)))
                .thenReturn(3L, 4L, 2L);

        AdminActivityStats stats = activityService.getAdminActivityStats();

        assertThat(stats.getTodayCount()).isEqualTo(10);
        assertThat(stats.getProjects()).isEqualTo(3);
        assertThat(stats.getTasks()).isEqualTo(4);
        assertThat(stats.getMessages()).isEqualTo(2);
    }
}
