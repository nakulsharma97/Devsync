package com.devsync.activity;

import com.devsync.activity.dto.ActivityResponse;
import com.devsync.common.PageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
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

    @GetMapping("/projects/{projectId}/activities")
    public ResponseEntity<PageResponse<ActivityResponse>> getProjectActivities(
            @PathVariable String projectId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(activityService.getProjectActivities(projectId, page, size));
    }

    @GetMapping("/users/{userId}/activities")
    public ResponseEntity<PageResponse<ActivityResponse>> getUserActivities(
            @PathVariable String userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(activityService.getUserActivities(userId, page, size));
    }
}
