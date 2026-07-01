package com.devsync.controller;

import com.devsync.dto.*;
import com.devsync.entity.Project;
import com.devsync.entity.User;
import com.devsync.service.ProjectService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;

    @PostMapping
    public ResponseEntity<ApiResponse<Project>> createProject(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody ProjectRequest request) {
        Project project = projectService.createProject(user.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Project created", project));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Project>>> getMyProjects(@AuthenticationPrincipal User user) {
        List<Project> projects = projectService.getUserProjects(user.getId());
        return ResponseEntity.ok(ApiResponse.success(projects));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Project>> getProject(@PathVariable Long id) {
        Project project = projectService.getProjectById(id);
        return ResponseEntity.ok(ApiResponse.success(project));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Project>> updateProject(
            @PathVariable Long id,
            @AuthenticationPrincipal User user,
            @Valid @RequestBody ProjectRequest request) {
        Project project = projectService.updateProject(id, user.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Project updated", project));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteProject(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        projectService.deleteProject(id, user.getId());
        return ResponseEntity.ok(ApiResponse.success("Project deleted", null));
    }
}
