package com.devsync.controller;

import com.devsync.dto.ApiResponse;
import com.devsync.dto.ApplyTeamRequest;
import com.devsync.dto.TeamRequest;
import com.devsync.entity.Team;
import com.devsync.entity.TeamApplication;
import com.devsync.entity.User;
import com.devsync.service.TeamService;
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
@RequestMapping("/api/teams")
@RequiredArgsConstructor
@Tag(name = "Teams", description = "Team collaboration and applications")
public class TeamController {

    private final TeamService teamService;

    @PostMapping
    @Operation(summary = "Create a team", description = "Creates a new team looking for collaborators")
    public ResponseEntity<ApiResponse<Team>> createTeam(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody TeamRequest request) {
        Team team = teamService.createTeam(
                user.getId(), request.getTitle(), request.getDescription(), request.getRolesNeeded());
        return ResponseEntity.ok(ApiResponse.success("Team created", team));
    }

    @GetMapping
    @Operation(summary = "Get open teams", description = "Returns all teams currently looking for members")
    public ResponseEntity<ApiResponse<List<Team>>> getOpenTeams() {
        List<Team> teams = teamService.getOpenTeams();
        return ResponseEntity.ok(ApiResponse.success(teams));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get team by ID", description = "Returns a single team by its ID")
    @ApiResponse(responseCode = "404", description = "Team not found")
    public ResponseEntity<ApiResponse<Team>> getTeam(@PathVariable Long id) {
        Team team = teamService.getTeamById(id);
        return ResponseEntity.ok(ApiResponse.success(team));
    }

    @PostMapping("/{teamId}/apply")
    @Operation(summary = "Apply to team", description = "Submits an application to join a team")
    @ApiResponse(responseCode = "400", description = "Already applied to this team")
    public ResponseEntity<ApiResponse<TeamApplication>> apply(
            @PathVariable Long teamId,
            @AuthenticationPrincipal User user,
            @Valid @RequestBody ApplyTeamRequest request) {
        TeamApplication application = teamService.applyToTeam(
                teamId, user.getId(), request.getRoleApplied(), request.getMessage());
        return ResponseEntity.ok(ApiResponse.success("Application submitted", application));
    }

    @GetMapping("/{teamId}/applications")
    @Operation(summary = "Get team applications", description = "Returns all applications for a team (owner only)")
    @ApiResponse(responseCode = "403", description = "Only the team owner can view applications")
    public ResponseEntity<ApiResponse<List<TeamApplication>>> getApplications(
            @PathVariable Long teamId,
            @AuthenticationPrincipal User user) {
        List<TeamApplication> applications = teamService.getTeamApplications(teamId, user.getId());
        return ResponseEntity.ok(ApiResponse.success(applications));
    }

    @PostMapping("/applications/{applicationId}/accept")
    @Operation(summary = "Accept application", description = "Accepts a team application (owner only)")
    public ResponseEntity<ApiResponse<TeamApplication>> acceptApplication(
            @PathVariable Long applicationId,
            @AuthenticationPrincipal User user) {
        TeamApplication app = teamService.acceptApplication(applicationId, user.getId());
        return ResponseEntity.ok(ApiResponse.success("Application accepted", app));
    }

    @PostMapping("/applications/{applicationId}/reject")
    @Operation(summary = "Reject application", description = "Rejects a team application (owner only)")
    public ResponseEntity<ApiResponse<TeamApplication>> rejectApplication(
            @PathVariable Long applicationId,
            @AuthenticationPrincipal User user) {
        TeamApplication app = teamService.rejectApplication(applicationId, user.getId());
        return ResponseEntity.ok(ApiResponse.success("Application rejected", app));
    }
}
