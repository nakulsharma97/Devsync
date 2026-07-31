package com.devsync.admin;

import com.devsync.activity.ActivityService;
import com.devsync.activity.dto.ActivityResponse;
import com.devsync.activity.dto.AdminActivityStats;
import com.devsync.admin.dto.AdminPostResponse;
import com.devsync.admin.dto.AdminProjectDetail;
import com.devsync.admin.dto.AdminProjectListItem;
import com.devsync.admin.dto.AdminProjectStats;
import com.devsync.admin.dto.AdminUserDetail;
import com.devsync.admin.dto.AdminUserListItem;
import com.devsync.admin.dto.AdminUserResponse;
import com.devsync.admin.dto.DashboardResponse;
import com.devsync.admin.dto.PlatformStatsResponse;
import com.devsync.admin.dto.UpdateRoleRequest;
import com.devsync.admin.dto.UpdateVisibilityRequest;
import com.devsync.audit.AuditLogService;
import com.devsync.audit.dto.AuditLogResponse;
import com.devsync.common.PageResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;
    private final ActivityService activityService;
    private final AuditLogService auditLogService;

    @GetMapping("/dashboard")
    public ResponseEntity<DashboardResponse> getDashboard() {
        return ResponseEntity.ok(adminService.getDashboard());
    }

    @GetMapping("/check")
    public ResponseEntity<Map<String, Boolean>> isAdmin(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(Map.of("isAdmin", adminService.isAdmin(userDetails.getUsername())));
    }

    @GetMapping("/stats")
    public ResponseEntity<PlatformStatsResponse> getPlatformStats() {
        return ResponseEntity.ok(adminService.getPlatformStats());
    }

    @GetMapping("/users")
    public ResponseEntity<List<AdminUserResponse>> getUsers() {
        return ResponseEntity.ok(adminService.getAllUsers());
    }

    @GetMapping("/users/paged")
    public ResponseEntity<PageResponse<AdminUserListItem>> getUsersPage(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String sortDir,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(adminService.getUsersPage(page, size, sortBy, sortDir, search, role, status));
    }

    @GetMapping("/users/{userId}")
    public ResponseEntity<AdminUserDetail> getUserDetail(@PathVariable String userId) {
        return ResponseEntity.ok(adminService.getUserDetail(userId));
    }

    @DeleteMapping("/users/{userId}")
    public ResponseEntity<Void> deleteUser(
            @PathVariable String userId,
            @AuthenticationPrincipal UserDetails userDetails) {
        adminService.deleteUser(userId, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/posts")
    public ResponseEntity<List<AdminPostResponse>> getPosts() {
        return ResponseEntity.ok(adminService.getAllPosts());
    }

    @PutMapping("/users/{userId}/role")
    public ResponseEntity<AdminUserResponse> updateUserRole(
            @PathVariable String userId,
            @Valid @RequestBody UpdateRoleRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(adminService.updateUserRole(userId, request.getRole(), userDetails.getUsername()));
    }

    @PutMapping("/users/{userId}/block")
    public ResponseEntity<AdminUserResponse> blockUser(
            @PathVariable String userId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(adminService.setUserBlocked(userId, true, userDetails.getUsername()));
    }

    @PutMapping("/users/{userId}/unblock")
    public ResponseEntity<AdminUserResponse> unblockUser(
            @PathVariable String userId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(adminService.setUserBlocked(userId, false, userDetails.getUsername()));
    }

    @DeleteMapping("/posts/{postId}")
    public ResponseEntity<Void> deletePost(@PathVariable String postId) {
        adminService.deletePost(postId);
        return ResponseEntity.noContent().build();
    }

    // ---------- Admin Project Management ----------

    @GetMapping("/projects")
    public ResponseEntity<PageResponse<AdminProjectListItem>> getProjectsPage(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String sortDir,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String visibility,
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(adminService.getProjectsPage(page, size, sortBy, sortDir, search, visibility, status));
    }

    @GetMapping("/projects/stats")
    public ResponseEntity<AdminProjectStats> getProjectStats() {
        return ResponseEntity.ok(adminService.getProjectStats());
    }

    @GetMapping("/projects/{projectId}")
    public ResponseEntity<AdminProjectDetail> getProjectDetail(@PathVariable String projectId) {
        return ResponseEntity.ok(adminService.getProjectDetail(projectId));
    }

    @PutMapping("/projects/{projectId}/archive")
    public ResponseEntity<AdminProjectListItem> archiveProject(
            @PathVariable String projectId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(adminService.archiveProject(projectId, userDetails.getUsername()));
    }

    @PutMapping("/projects/{projectId}/restore")
    public ResponseEntity<AdminProjectListItem> restoreProject(
            @PathVariable String projectId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(adminService.restoreProject(projectId, userDetails.getUsername()));
    }

    @PutMapping("/projects/{projectId}/visibility")
    public ResponseEntity<AdminProjectListItem> updateProjectVisibility(
            @PathVariable String projectId,
            @Valid @RequestBody UpdateVisibilityRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(adminService.setProjectVisibility(projectId, request.getVisibility(), userDetails.getUsername()));
    }

    @DeleteMapping("/projects/{projectId}")
    public ResponseEntity<Void> deleteProject(
            @PathVariable String projectId,
            @AuthenticationPrincipal UserDetails userDetails) {
        adminService.deleteProject(projectId, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }

    // ---------- Admin Activity Timeline ----------

    @GetMapping("/activity")
    public ResponseEntity<PageResponse<ActivityResponse>> getAdminActivity(
            @RequestParam(required = false) String projectId,
            @RequestParam(required = false) String userId,
            @RequestParam(required = false) String activityType,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(activityService.getAdminActivities(
                projectId, userId, activityType, from, to, page, size));
    }

    @GetMapping("/activity/stats")
    public ResponseEntity<AdminActivityStats> getAdminActivityStats() {
        return ResponseEntity.ok(activityService.getAdminActivityStats());
    }

    // ---------- Admin Audit Logs ----------

    @GetMapping("/audit-logs")
    public ResponseEntity<PageResponse<AuditLogResponse>> getAuditLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String sortDir,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String adminId,
            @RequestParam(required = false) String userId,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {
        return ResponseEntity.ok(auditLogService.getLogs(
                page, size, sortBy, sortDir, search, action, status, adminId, userId, from, to));
    }

    @GetMapping("/audit-logs/export")
    public ResponseEntity<byte[]> exportAuditLogs(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String adminId,
            @RequestParam(required = false) String userId,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {
        List<AuditLogResponse> logs = auditLogService.exportLogs(search, action, status, adminId, userId, from, to);
        String csv = auditLogService.toCsv(logs);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("text/csv"));
        headers.setContentDisposition(ContentDisposition.attachment().filename("audit-logs.csv").build());
        return new ResponseEntity<>(csv.getBytes(StandardCharsets.UTF_8), headers, HttpStatus.OK);
    }

    @GetMapping("/audit-logs/{id}")
    public ResponseEntity<AuditLogResponse> getAuditLog(@PathVariable String id) {
        return ResponseEntity.ok(auditLogService.getLog(id));
    }
}
