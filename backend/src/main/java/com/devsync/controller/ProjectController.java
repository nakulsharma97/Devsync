package com.devsync.controller;

import com.devsync.dto.*;
import com.devsync.entity.Project;
import com.devsync.entity.User;
import com.devsync.service.ProjectService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
@Tag(name = "Projects", description = "Project showcase CRUD operations")
public class ProjectController {

    private final ProjectService projectService;

    @PostMapping
    @Operation(summary = "Create a project", description = "Creates a new project for the authenticated user")
    public ResponseEntity<ApiResponse<Project>> createProject(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody ProjectRequest request) {
        Project project = projectService.createProject(user.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Project created", project));
    }

    @GetMapping
    @Operation(summary = "Get my projects", description = "Returns all projects for the authenticated user")
    public ResponseEntity<ApiResponse<List<Project>>> getMyProjects(@AuthenticationPrincipal User user) {
        List<Project> projects = projectService.getUserProjects(user.getId());
        return ResponseEntity.ok(ApiResponse.success(projects));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get project by ID", description = "Returns a single project by its ID")
    @ApiResponse(responseCode = "404", description = "Project not found")
    public ResponseEntity<ApiResponse<Project>> getProject(@PathVariable Long id) {
        Project project = projectService.getProjectById(id);
        return ResponseEntity.ok(ApiResponse.success(project));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update project", description = "Updates a project (owner only)")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Project updated"),
        @ApiResponse(responseCode = "403", description = "Not the project owner")
    })
    public ResponseEntity<ApiResponse<Project>> updateProject(
            @PathVariable Long id,
            @AuthenticationPrincipal User user,
            @Valid @RequestBody ProjectRequest request) {
        Project project = projectService.updateProject(id, user.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Project updated", project));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete project", description = "Deletes a project (owner only)")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Project deleted"),
        @ApiResponse(responseCode = "403", description = "Not the project owner")
    })
    public ResponseEntity<ApiResponse<Void>> deleteProject(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        projectService.deleteProject(id, user.getId());
        return ResponseEntity.ok(ApiResponse.success("Project deleted", null));
    }
}
