package com.devsync.activity;

import com.devsync.activity.dto.ActivityResponse;
import com.devsync.common.PageResponse;
import com.devsync.common.ResourceNotFoundException;
import com.devsync.project.entity.Project;
import com.devsync.project.repository.ProjectMemberRepository;
import com.devsync.project.repository.ProjectRepository;
import com.devsync.user.entity.User;
import com.devsync.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ActivityController {

    private final ActivityService activityService;
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final UserRepository userRepository;

    /**
     * Project activity is only visible to project members (or anyone for PUBLIC
     * projects, or platform admins) — a non-member must never enumerate a
     * private project's history by guessing the project id.
     */
    @GetMapping("/projects/{projectId}/activities")
    public ResponseEntity<PageResponse<ActivityResponse>> getProjectActivities(
            @PathVariable String projectId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal UserDetails userDetails) {
        assertCanViewProject(projectId, userDetails.getUsername());
        return ResponseEntity.ok(activityService.getProjectActivities(projectId, page, size));
    }

    /**
     * A user's activity stream is private: only the user themselves or a platform
     * admin may read it.
     */
    @GetMapping("/users/{userId}/activities")
    public ResponseEntity<PageResponse<ActivityResponse>> getUserActivities(
            @PathVariable String userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal UserDetails userDetails) {
        if (!userDetails.getUsername().equals(userId) && !isAdmin(userDetails)) {
            throw new AccessDeniedException("You cannot view this user's activity");
        }
        return ResponseEntity.ok(activityService.getUserActivities(userId, page, size));
    }

    private void assertCanViewProject(String projectId, String userId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project", projectId));
        if (project.getVisibility() == Project.ProjectVisibility.PUBLIC) return;
        if (projectMemberRepository.existsByProjectIdAndUserId(projectId, userId)) return;
        User user = userRepository.findById(userId).orElse(null);
        if (user != null && user.getRole() == User.Role.ADMIN) return;
        throw new AccessDeniedException("You cannot view this project's activity");
    }

    private boolean isAdmin(UserDetails userDetails) {
        return userDetails.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }
}
