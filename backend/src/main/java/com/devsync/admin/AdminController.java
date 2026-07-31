package com.devsync.admin;

import com.devsync.admin.dto.AdminPostResponse;
import com.devsync.admin.dto.AdminUserResponse;
import com.devsync.admin.dto.DashboardResponse;
import com.devsync.admin.dto.PlatformStatsResponse;
import com.devsync.admin.dto.UpdateRoleRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;

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
}
