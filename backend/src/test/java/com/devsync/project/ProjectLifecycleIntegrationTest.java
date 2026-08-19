package com.devsync.project;

import com.devsync.attachment.entity.AttachmentContext;
import com.devsync.attachment.entity.FileAttachment;
import com.devsync.attachment.repository.FileAttachmentRepository;
import com.devsync.auth.JwtTokenProvider;
import com.devsync.collab.InvitationService;
import com.devsync.collab.dto.InviteRequest;
import com.devsync.collab.repository.ProjectInvitationRepository;
import com.devsync.github.entity.ProjectGitHubLink;
import com.devsync.github.repository.ProjectGitHubLinkRepository;
import com.devsync.kanban.entity.Board;
import com.devsync.kanban.repository.BoardRepository;
import com.devsync.message.entity.Message;
import com.devsync.message.repository.MessageRepository;
import com.devsync.project.dto.CreateProjectRequest;
import com.devsync.project.entity.Project;
import com.devsync.project.entity.ProjectMember;
import com.devsync.project.repository.ProjectMemberRepository;
import com.devsync.project.repository.ProjectRepository;
import com.devsync.teamroom.entity.TeamRoom;
import com.devsync.teamroom.repository.TeamRoomParticipantRepository;
import com.devsync.teamroom.repository.TeamRoomRepository;
import com.devsync.user.entity.User;
import com.devsync.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Project lifecycle audit: ARCHIVE must keep the project readable to authorized
 * members while blocking modifications; DELETE must be a soft delete that
 * renders the project unreachable (404 on every read path) while preserving all
 * related records — members, boards, rooms, messages, attachments, invitations
 * and GitHub links — so no orphan or accidentally destroyed data is left behind.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ProjectLifecycleIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private ProjectRepository projectRepository;
    @Autowired private ProjectMemberRepository memberRepository;
    @Autowired private ProjectService projectService;
    @Autowired private InvitationService invitationService;
    @Autowired private BoardRepository boardRepository;
    @Autowired private TeamRoomRepository teamRoomRepository;
    @Autowired private TeamRoomParticipantRepository participantRepository;
    @Autowired private MessageRepository messageRepository;
    @Autowired private FileAttachmentRepository attachmentRepository;
    @Autowired private ProjectGitHubLinkRepository githubLinkRepository;
    @Autowired private ProjectInvitationRepository invitationRepository;
    @Autowired private JwtTokenProvider jwtTokenProvider;

    private String ownerId;
    private String memberId;
    private String inviteeId;
    private String projectId;
    private String roomId;
    private String messageId;

    @BeforeEach
    void seed() {
        userRepository.deleteAll();
        memberRepository.deleteAll();
        boardRepository.deleteAll();
        teamRoomRepository.deleteAll();
        participantRepository.deleteAll();
        messageRepository.deleteAll();
        attachmentRepository.deleteAll();
        githubLinkRepository.deleteAll();
        invitationRepository.deleteAll();
        projectRepository.deleteAll();

        ownerId = createUser("owner@test.dev", "Owner").getId();
        memberId = createUser("member@test.dev", "Member").getId();
        inviteeId = createUser("invitee@test.dev", "Invitee").getId();

        CreateProjectRequest req = new CreateProjectRequest();
        req.setName("Lifecycle Project");
        req.setVisibility("PRIVATE");
        projectId = projectService.createProject(req, ownerId).getId();

        projectService.addMember(projectId, memberId, "MEMBER", ownerId);

        Board board = boardRepository.save(Board.builder()
                .name("Board").projectId(projectId).createdBy(ownerId).build());

        // Project creation auto-created the team chat and both members are
        // already participants, so use the auto-created room as the fixture.
        TeamRoom room = teamRoomRepository
                .findFirstByProjectIdOrderByCreatedAtAsc(projectId)
                .orElseThrow();
        roomId = room.getId();

        Message msg = messageRepository.save(Message.builder()
                .senderId(ownerId).roomId(roomId).content("Hello team").build());
        messageId = msg.getId();

        attachmentRepository.save(FileAttachment.builder()
                .uploaderId(ownerId).projectId(projectId)
                .contextType(AttachmentContext.MESSAGE).contextId(messageId)
                .originalName("design.png").storedName("design-abc.png")
                .contentType("image/png").size(1024).url("/files/design-abc.png")
                .build());

        githubLinkRepository.save(ProjectGitHubLink.builder()
                .projectId(projectId).repoId(987654321L)
                .repoFullName("devsync/devsync").repoUrl("https://github.com/devsync/devsync")
                .linkedBy(ownerId).linkedAt(Instant.now())
                .build());

        InviteRequest invite = new InviteRequest();
        invite.setUserId(inviteeId);
        invitationService.invite(projectId, invite, ownerId);
    }

    private User createUser(String email, String name) {
        return userRepository.save(User.builder()
                .email(email)
                .username(email.split("@")[0])
                .fullName(name)
                .password("$2a$10$abcdefghijklmnopqrstuv")
                .emailVerified(true)
                .lastLoginAt(Instant.now())
                .build());
    }

    private String bearer(String userId) {
        return "Bearer " + jwtTokenProvider.generateAccessToken(userId, userId + "@test.dev");
    }

    @Test
    void archive_keepsMemberReadAccess_butBlocksModification() throws Exception {
        mockMvc.perform(put("/api/projects/" + projectId)
                        .header("Authorization", bearer(ownerId))
                        .contentType(APPLICATION_JSON)
                        .content("{\"status\":\"ARCHIVED\"}"))
                .andExpect(status().isOk());

        // Archived projects remain visible to authorized members
        mockMvc.perform(get("/api/projects/" + projectId).header("Authorization", bearer(memberId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ARCHIVED"));

        // Archived projects must not be editable
        mockMvc.perform(put("/api/projects/" + projectId)
                        .header("Authorization", bearer(ownerId))
                        .contentType(APPLICATION_JSON)
                        .content("{\"name\":\"Renamed\"}"))
                .andExpect(status().isBadRequest());

        Project archived = projectRepository.findById(projectId).orElseThrow();
        assertThat(archived.getStatus()).isEqualTo(Project.ProjectStatus.ARCHIVED);
        assertThat(archived.isDeleted()).isFalse();
    }

    @Test
    void ownerDelete_softDeletes_andBlocksAllAccess() throws Exception {
        mockMvc.perform(delete("/api/projects/" + projectId)
                        .header("Authorization", bearer(ownerId)))
                .andExpect(status().isNoContent());

        // Row is retained as a soft delete — not physically removed
        Project deleted = projectRepository.findById(projectId).orElseThrow();
        assertThat(deleted.isDeleted()).isTrue();
        assertThat(deleted.getDeletedAt()).isNotNull();

        // Access after delete → 404 for owner and members alike
        mockMvc.perform(get("/api/projects/" + projectId).header("Authorization", bearer(ownerId)))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/projects/" + projectId).header("Authorization", bearer(memberId)))
                .andExpect(status().isNotFound());

        // Deleted projects disappear from "My Projects"
        mockMvc.perform(get("/api/projects").header("Authorization", bearer(ownerId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == '" + projectId + "')]").isEmpty());

        // Pending invitations to a deleted project cannot be accepted
        String invitationId = invitationRepository.findByProjectId(projectId).get(0).getId();
        mockMvc.perform(put("/api/invitations/" + invitationId + "/accept")
                        .header("Authorization", bearer(inviteeId)))
                .andExpect(status().isNotFound());

        // The invitee must not have become a member through the stale invitation
        assertThat(memberRepository.existsByProjectIdAndUserId(projectId, inviteeId)).isFalse();
    }

    @Test
    void delete_preservesAllRelatedRecords() throws Exception {
        mockMvc.perform(delete("/api/projects/" + projectId)
                        .header("Authorization", bearer(ownerId)))
                .andExpect(status().isNoContent());

        // No uncontrolled orphan cleanup / no accidental data destruction:
        // every related record still exists and still references the project row.
        assertThat(projectRepository.findById(projectId)).isPresent();
        assertThat(memberRepository.countByProjectId(projectId)).isEqualTo(2);
        assertThat(boardRepository.findByProjectId(projectId)).isNotEmpty();
        assertThat(teamRoomRepository.findByProjectId(projectId)).isNotEmpty();
        assertThat(messageRepository.countByRoomIdIn(List.of(roomId))).isEqualTo(1);
        assertThat(attachmentRepository.findByProjectIdOrderByCreatedAtDesc(projectId)).isNotEmpty();
        assertThat(githubLinkRepository.findByProjectId(projectId)).isPresent();
        assertThat(invitationRepository.findByProjectId(projectId)).isNotEmpty();
    }

    @Test
    void delete_isRejected_ForNonOwner() throws Exception {
        mockMvc.perform(delete("/api/projects/" + projectId)
                        .header("Authorization", bearer(memberId)))
                .andExpect(status().isForbidden());

        Project unchanged = projectRepository.findById(projectId).orElseThrow();
        assertThat(unchanged.isDeleted()).isFalse();
        assertThat(memberRepository.countByProjectId(projectId)).isEqualTo(2);
    }

    @Test
    void ownerCanRemoveMember_andRemovedMemberLosesTeamChatAccess() throws Exception {
        mockMvc.perform(delete("/api/projects/" + projectId + "/members/" + memberId)
                        .header("Authorization", bearer(ownerId)))
                .andExpect(status().isNoContent());

        // Membership is gone and the removed user is out of the team chat.
        assertThat(memberRepository.existsByProjectIdAndUserId(projectId, memberId)).isFalse();
        TeamRoom room = teamRoomRepository.findFirstByProjectIdOrderByCreatedAtAsc(projectId)
                .orElseThrow();
        assertThat(participantRepository.existsByRoomIdAndUserId(room.getId(), memberId)).isFalse();
        // The owner and the other member keep their chat access.
        assertThat(participantRepository.existsByRoomIdAndUserId(room.getId(), ownerId)).isTrue();
        assertThat(participantRepository.existsByRoomIdAndUserId(room.getId(), inviteeId)).isFalse();

        // Removing the owner is rejected (business rule → 400).
        mockMvc.perform(delete("/api/projects/" + projectId + "/members/" + ownerId)
                        .header("Authorization", bearer(ownerId)))
                .andExpect(status().isBadRequest());
        assertThat(memberRepository.existsByProjectIdAndUserId(projectId, ownerId)).isTrue();

        // A regular member cannot remove anyone — owner-only, HTTP 403.
        mockMvc.perform(delete("/api/projects/" + projectId + "/members/" + memberId)
                        .header("Authorization", bearer(memberId)))
                .andExpect(status().isForbidden());
    }

    @Test
    void ownerCanTransferOwnership_toMember() throws Exception {
        mockMvc.perform(post("/api/projects/" + projectId + "/transfer-ownership")
                        .header("Authorization", bearer(ownerId))
                        .contentType(APPLICATION_JSON)
                        .content("{\"userId\":\"" + memberId + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ownerId").value(memberId))
                .andExpect(jsonPath("$.currentUserRole").value("MEMBER"));

        Project updated = projectRepository.findById(projectId).orElseThrow();
        assertThat(updated.getOwnerId()).isEqualTo(memberId);

        // Exactly one owner in the member table; roles swapped, membership kept.
        java.util.List<ProjectMember> members = memberRepository.findByProjectId(projectId);
        assertThat(members.stream()
                .filter(m -> m.getRole() == ProjectMember.Role.OWNER).count()).isEqualTo(1);
        assertThat(members.stream()
                .filter(m -> m.getUserId().equals(memberId))
                .findFirst().orElseThrow().getRole()).isEqualTo(ProjectMember.Role.OWNER);
        assertThat(members.stream()
                .filter(m -> m.getUserId().equals(ownerId))
                .findFirst().orElseThrow().getRole()).isEqualTo(ProjectMember.Role.MEMBER);

        // Team chat membership is preserved for both parties.
        TeamRoom room = teamRoomRepository.findFirstByProjectIdOrderByCreatedAtAsc(projectId)
                .orElseThrow();
        assertThat(participantRepository.existsByRoomIdAndUserId(room.getId(), ownerId)).isTrue();
        assertThat(participantRepository.existsByRoomIdAndUserId(room.getId(), memberId)).isTrue();

        // The old owner (now a MEMBER) can no longer transfer ownership — 403.
        mockMvc.perform(post("/api/projects/" + projectId + "/transfer-ownership")
                        .header("Authorization", bearer(ownerId))
                        .contentType(APPLICATION_JSON)
                        .content("{\"userId\":\"" + memberId + "\"}"))
                .andExpect(status().isForbidden());

        // The new owner has full control and can transfer back.
        mockMvc.perform(post("/api/projects/" + projectId + "/transfer-ownership")
                        .header("Authorization", bearer(memberId))
                        .contentType(APPLICATION_JSON)
                        .content("{\"userId\":\"" + ownerId + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ownerId").value(ownerId));

        Project back = projectRepository.findById(projectId).orElseThrow();
        assertThat(back.getOwnerId()).isEqualTo(ownerId);
    }

    @Test
    void transferOwnership_isRejected_ForNonMemberTarget_andNonOwner() throws Exception {
        // A user from outside the project cannot be made owner (business rule).
        String outsiderId = createUser("outsider@test.dev", "Outsider").getId();
        mockMvc.perform(post("/api/projects/" + projectId + "/transfer-ownership")
                        .header("Authorization", bearer(ownerId))
                        .contentType(APPLICATION_JSON)
                        .content("{\"userId\":\"" + outsiderId + "\"}"))
                .andExpect(status().isBadRequest());
        assertThat(projectRepository.findById(projectId).orElseThrow().getOwnerId())
                .isEqualTo(ownerId);

        // A regular member cannot transfer ownership — owner-only, HTTP 403.
        mockMvc.perform(post("/api/projects/" + projectId + "/transfer-ownership")
                        .header("Authorization", bearer(memberId))
                        .contentType(APPLICATION_JSON)
                        .content("{\"userId\":\"" + memberId + "\"}"))
                .andExpect(status().isForbidden());
        assertThat(projectRepository.findById(projectId).orElseThrow().getOwnerId())
                .isEqualTo(ownerId);
    }

    @Test
    void addMember_rejects_OWNER_role_toPrevent_twoOwnerExploit() throws Exception {
        // The owner should NOT be able to add a member with OWNER role,
        // which would break the single-owner invariant.
        String newUserId = createUser("newuser@test.dev", "New User").getId();

        mockMvc.perform(post("/api/projects/" + projectId + "/members")
                        .header("Authorization", bearer(ownerId))
                        .param("userId", newUserId)
                        .param("role", "OWNER"))
                .andExpect(status().isBadRequest());

        // Verify no OWNER-role member was created
        java.util.Optional<ProjectMember> newMember =
                memberRepository.findByProjectIdAndUserId(projectId, newUserId);
        assertThat(newMember).isEmpty();

        // Exactly one owner remains
        long ownerCount = memberRepository.findByProjectId(projectId).stream()
                .filter(m -> m.getRole() == ProjectMember.Role.OWNER)
                .count();
        assertThat(ownerCount).isEqualTo(1);
    }

    @Test
    void addMember_rejects_invalidRole() throws Exception {
        String newUserId = createUser("invalidrole@test.dev", "Invalid Role").getId();

        mockMvc.perform(post("/api/projects/" + projectId + "/members")
                        .header("Authorization", bearer(ownerId))
                        .param("userId", newUserId)
                        .param("role", "SUPERADMIN"))
                .andExpect(status().isBadRequest());

        assertThat(memberRepository.findByProjectIdAndUserId(projectId, newUserId)).isEmpty();
    }

    @Test
    void unauthenticatedAccess_toProjectResources_isRejected() throws Exception {
        mockMvc.perform(get("/api/projects/" + projectId))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(delete("/api/projects/" + projectId))
                .andExpect(status().isUnauthorized());
    }
}
