package com.devsync.controller;

import com.devsync.dto.ApiResponse;
import com.devsync.dto.ApplyTeamRequest;
import com.devsync.dto.TeamRequest;
import com.devsync.entity.Team;
import com.devsync.entity.TeamApplication;
import com.devsync.entity.User;
import com.devsync.service.TeamService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/teams")
@RequiredArgsConstructor
public class TeamController {

    private final TeamService teamService;

    @PostMapping
    public ResponseEntity<ApiResponse<Team>> createTeam(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody TeamRequest request) {
        Team team = teamService.createTeam(
                user.getId(), request.getTitle(), request.getDescription(), request.getRolesNeeded());
        return ResponseEntity.ok(ApiResponse.success("Team created", team));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Team>>> getOpenTeams() {
        List<Team> teams = teamService.getOpenTeams();
        return ResponseEntity.ok(ApiResponse.success(teams));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Team>> getTeam(@PathVariable Long id) {
        Team team = teamService.getTeamById(id);
        return ResponseEntity.ok(ApiResponse.success(team));
    }

    @PostMapping("/{teamId}/apply")
    public ResponseEntity<ApiResponse<TeamApplication>> apply(
            @PathVariable Long teamId,
            @AuthenticationPrincipal User user,
            @Valid @RequestBody ApplyTeamRequest request) {
        TeamApplication application = teamService.applyToTeam(
                teamId, user.getId(), request.getRoleApplied(), request.getMessage());
        return ResponseEntity.ok(ApiResponse.success("Application submitted", application));
    }

    @GetMapping("/{teamId}/applications")
    public ResponseEntity<ApiResponse<List<TeamApplication>>> getApplications(
            @PathVariable Long teamId,
            @AuthenticationPrincipal User user) {
        List<TeamApplication> applications = teamService.getTeamApplications(teamId, user.getId());
        return ResponseEntity.ok(ApiResponse.success(applications));
    }

    @PostMapping("/applications/{applicationId}/accept")
    public ResponseEntity<ApiResponse<TeamApplication>> acceptApplication(
            @PathVariable Long applicationId,
            @AuthenticationPrincipal User user) {
        TeamApplication app = teamService.acceptApplication(applicationId, user.getId());
        return ResponseEntity.ok(ApiResponse.success("Application accepted", app));
    }

    @PostMapping("/applications/{applicationId}/reject")
    public ResponseEntity<ApiResponse<TeamApplication>> rejectApplication(
            @PathVariable Long applicationId,
            @AuthenticationPrincipal User user) {
        TeamApplication app = teamService.rejectApplication(applicationId, user.getId());
        return ResponseEntity.ok(ApiResponse.success("Application rejected", app));
    }
}
