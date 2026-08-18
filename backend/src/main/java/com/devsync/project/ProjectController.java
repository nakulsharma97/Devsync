package com.devsync.project;

import com.devsync.admin.dto.UpdateVisibilityRequest;
import com.devsync.project.dto.CreateProjectRequest;
import com.devsync.project.dto.ProjectResponse;
import com.devsync.project.dto.TransferOwnershipRequest;
import com.devsync.project.dto.UpdateProjectRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;

    @GetMapping
    public ResponseEntity<List<ProjectResponse>> getMyProjects(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(projectService.getUserProjects(userDetails.getUsername()));
    }

    @GetMapping("/discover")
    public ResponseEntity<List<ProjectResponse>> discover(
            @RequestParam(required = false) String search,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(projectService.discoverPublicProjects(search, userDetails.getUsername()));
    }

    @PostMapping
    public ResponseEntity<ProjectResponse> createProject(
            @Valid @RequestBody CreateProjectRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(projectService.createProject(request, userDetails.getUsername()));
    }

    @GetMapping("/{projectId}")
    public ResponseEntity<ProjectResponse> getProject(
            @PathVariable String projectId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(projectService.getProject(projectId, userDetails.getUsername()));
    }

    @PutMapping("/{projectId}")
    public ResponseEntity<ProjectResponse> updateProject(
            @PathVariable String projectId,
            @Valid @RequestBody UpdateProjectRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(projectService.updateProject(projectId, request, userDetails.getUsername()));
    }

    @DeleteMapping("/{projectId}")
    public ResponseEntity<Void> deleteProject(
            @PathVariable String projectId,
            @AuthenticationPrincipal UserDetails userDetails) {
        projectService.deleteProject(projectId, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{projectId}/members")
    public ResponseEntity<Void> addMember(
            @PathVariable String projectId,
            @RequestParam String userId,
            @RequestParam(required = false, defaultValue = "MEMBER") String role,
            @AuthenticationPrincipal UserDetails userDetails) {
        projectService.addMember(projectId, userId, role, userDetails.getUsername());
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{projectId}/members/{userId}")
    public ResponseEntity<Void> removeMember(
            @PathVariable String projectId,
            @PathVariable String userId,
            @AuthenticationPrincipal UserDetails userDetails) {
        projectService.removeMember(projectId, userId, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{projectId}/join")
    public ResponseEntity<Void> join(
            @PathVariable String projectId,
            @AuthenticationPrincipal UserDetails userDetails) {
        projectService.joinPublicProject(projectId, userDetails.getUsername());
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{projectId}/members/{userId}/role")
    public ResponseEntity<Void> updateMemberRole(
            @PathVariable String projectId,
            @PathVariable String userId,
            @RequestParam String role,
            @AuthenticationPrincipal UserDetails userDetails) {
        projectService.updateMemberRole(projectId, userId, role, userDetails.getUsername());
        return ResponseEntity.ok().build();
    }

    /**
     * Transfers project ownership to another existing member. Owner-only; the
     * old owner becomes a regular member and keeps project access.
     */
    @PostMapping("/{projectId}/transfer-ownership")
    public ResponseEntity<ProjectResponse> transferOwnership(
            @PathVariable String projectId,
            @Valid @RequestBody TransferOwnershipRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(projectService.transferOwnership(
                projectId, request.getUserId(), userDetails.getUsername()));
    }

    @PutMapping("/{projectId}/visibility")
    public ResponseEntity<ProjectResponse> changeVisibility(
            @PathVariable String projectId,
            @Valid @RequestBody UpdateVisibilityRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(projectService.changeVisibility(
                projectId, request.getVisibility(), userDetails.getUsername()));
    }
}
