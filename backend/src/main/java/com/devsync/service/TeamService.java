package com.devsync.service;

import com.devsync.entity.Team;
import com.devsync.entity.TeamApplication;
import com.devsync.entity.User;
import com.devsync.enums.ApplicationStatus;
import com.devsync.exception.BadRequestException;
import com.devsync.exception.ResourceNotFoundException;
import com.devsync.repository.TeamApplicationRepository;
import com.devsync.repository.TeamRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class TeamService {

    private final TeamRepository teamRepository;
    private final TeamApplicationRepository applicationRepository;
    private final UserService userService;

    @Transactional
    public Team createTeam(Long ownerId, String title, String description, Set<String> rolesNeeded) {
        User owner = userService.getUserById(ownerId);

        Team team = Team.builder()
                .owner(owner)
                .title(title)
                .description(description)
                .rolesNeeded(rolesNeeded)
                .build();

        return teamRepository.save(team);
    }

    @Transactional(readOnly = true)
    public List<Team> getOpenTeams() {
        return teamRepository.findByOpenTrueOrderByCreatedAtDesc();
    }

    @Transactional(readOnly = true)
    public List<Team> getUserTeams(Long userId) {
        return teamRepository.findByOwnerIdOrderByCreatedAtDesc(userId);
    }

    @Transactional(readOnly = true)
    public Team getTeamById(Long teamId) {
        return teamRepository.findById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found with id: " + teamId));
    }

    @Transactional
    public TeamApplication applyToTeam(Long teamId, Long userId, String roleApplied, String message) {
        if (applicationRepository.existsByTeamIdAndApplicantId(teamId, userId)) {
            throw new BadRequestException("You have already applied to this team");
        }

        Team team = getTeamById(teamId);
        User applicant = userService.getUserById(userId);

        TeamApplication application = TeamApplication.builder()
                .team(team)
                .applicant(applicant)
                .roleApplied(roleApplied)
                .message(message)
                .build();

        return applicationRepository.save(application);
    }

    @Transactional(readOnly = true)
    public List<TeamApplication> getTeamApplications(Long teamId, Long ownerId) {
        Team team = getTeamById(teamId);
        if (!team.getOwner().getId().equals(ownerId)) {
            throw new BadRequestException("Only the team owner can view applications");
        }
        return applicationRepository.findByTeamIdOrderByCreatedAtDesc(teamId);
    }

    @Transactional
    public TeamApplication acceptApplication(Long applicationId, Long ownerId) {
        TeamApplication application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found"));

        Team team = application.getTeam();
        if (!team.getOwner().getId().equals(ownerId)) {
            throw new BadRequestException("Only the team owner can accept applications");
        }

        application.setStatus(ApplicationStatus.ACCEPTED);
        return applicationRepository.save(application);
    }

    @Transactional
    public TeamApplication rejectApplication(Long applicationId, Long ownerId) {
        TeamApplication application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found"));

        Team team = application.getTeam();
        if (!team.getOwner().getId().equals(ownerId)) {
            throw new BadRequestException("Only the team owner can reject applications");
        }

        application.setStatus(ApplicationStatus.REJECTED);
        return applicationRepository.save(application);
    }

    @Transactional
    public void closeTeam(Long teamId, Long ownerId) {
        Team team = getTeamById(teamId);
        if (!team.getOwner().getId().equals(ownerId)) {
            throw new BadRequestException("Only the team owner can close this team");
        }
        team.setOpen(false);
        teamRepository.save(team);
    }
}
