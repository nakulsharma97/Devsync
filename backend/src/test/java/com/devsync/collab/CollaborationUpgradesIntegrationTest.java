package com.devsync.collab;

import com.devsync.auth.JwtTokenProvider;
import com.devsync.kanban.entity.Board;
import com.devsync.kanban.entity.BoardColumn;
import com.devsync.kanban.entity.Task;
import com.devsync.kanban.repository.BoardColumnRepository;
import com.devsync.kanban.repository.BoardRepository;
import com.devsync.kanban.repository.TaskRepository;
import com.devsync.notes.entity.ProjectNote;
import com.devsync.notes.repository.ProjectNoteRepository;
import com.devsync.project.entity.Project;
import com.devsync.project.repository.ProjectRepository;
import com.devsync.user.entity.User;
import com.devsync.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end coverage of the collaboration upgrades: create-from-template,
 * shared Markdown notes (concurrency + authorization), the public profile page,
 * and message upgrades (edit / delete / react / threads / search).
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CollaborationUpgradesIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private ProjectRepository projectRepository;
    @Autowired private BoardRepository boardRepository;
    @Autowired private BoardColumnRepository columnRepository;
    @Autowired private TaskRepository taskRepository;
    @Autowired private ProjectNoteRepository noteRepository;
    @Autowired private JwtTokenProvider jwtTokenProvider;

    private String aliceId;
    private String bobId;

    @BeforeEach
    void seed() {
        userRepository.deleteAll();
        projectRepository.deleteAll();
        noteRepository.deleteAll();
        taskRepository.deleteAll();
        columnRepository.deleteAll();
        boardRepository.deleteAll();

        aliceId = createUser("alice@test.dev", "Alice", "alice").getId();
        bobId = createUser("bob@test.dev", "Bob", "bob").getId();
    }

    private User createUser(String email, String name, String username) {
        User user = User.builder()
                .email(email)
                .username(username)
                .fullName(name)
                .password("$2a$10$abcdefghijklmnopqrstuv")
                .emailVerified(true)
                .role(User.Role.USER)
                .build();
        return userRepository.save(user);
    }

    private String bearer(String userId) {
        return "Bearer " + jwtTokenProvider.generateAccessToken(userId, userId + "@test.dev");
    }

    private String createProject(String name, String template) throws Exception {
        String body = "{\"name\": \"" + name + "\", \"description\": \"d\", \"visibility\": \"PRIVATE\""
                + (template == null ? "" : ", \"template\": \"" + template + "\"") + "}";
        String response = mockMvc.perform(post("/api/projects")
                        .header("Authorization", bearer(aliceId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        // Extract the FIRST "id" field — the top-level entity id (nested
        // member DTOs also carry ids, so a greedy match would grab the wrong one).
        return extractId(response);
    }

    private static String extractId(String json) {
        Matcher matcher = Pattern.compile("\"id\"\\s*:\\s*\"([^\"]+)\"").matcher(json);
        if (!matcher.find()) {
            throw new IllegalStateException("No id in response: " + json);
        }
        return matcher.group(1);
    }

    // ---------- Project templates ----------

    @Test
    void createProject_fromSprintTemplate_seedsBoardColumnsAndTasks() throws Exception {
        String projectId = createProject("Sprint", "SPRINT_BOARD");

        List<Board> boards = boardRepository.findByProjectId(projectId);
        assertThat(boards).hasSize(1);
        List<BoardColumn> columns = columnRepository.findByBoardIdOrderByPositionAsc(boards.get(0).getId());
        assertThat(columns).extracting(BoardColumn::getName)
                .containsExactly("To Do", "In Progress", "In Review", "Done");
        assertThat(taskRepository.findByColumnIdOrderByPositionAsc(columns.get(0).getId())).isNotEmpty();
    }

    @Test
    void createProject_withoutTemplate_hasNoBoard() throws Exception {
        String projectId = createProject("Plain", null);
        assertThat(boardRepository.findByProjectId(projectId)).isEmpty();
    }

    @Test
    void createProject_invalidTemplate_isRejected() throws Exception {
        mockMvc.perform(post("/api/projects")
                        .header("Authorization", bearer(aliceId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\": \"Bad\", \"template\": \"NOT_A_TEMPLATE\"}"))
                .andExpect(status().isBadRequest());
    }

    // ---------- Shared notes ----------

    @Test
    void notes_memberCanReadAndSave_withVersionIncrement() throws Exception {
        String projectId = createProject("Notes", null);

        mockMvc.perform(get("/api/projects/" + projectId + "/notes")
                        .header("Authorization", bearer(aliceId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.version").value(0));

        mockMvc.perform(put("/api/projects/" + projectId + "/notes")
                        .header("Authorization", bearer(aliceId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"version\": 0, \"yjsState\": \"SGVsbG8gV29ybGQ=\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.version").value(1))
                .andExpect(jsonPath("$.yjsState").value("SGVsbG8gV29ybGQ="));
    }

    @Test
    void notes_staleSave_isRejectedWithConflict() throws Exception {
        String projectId = createProject("Notes2", null);

        mockMvc.perform(put("/api/projects/" + projectId + "/notes")
                        .header("Authorization", bearer(aliceId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"version\": 0, \"yjsState\": \"dmVyc2lvbi0x\"}"))
                .andExpect(status().isOk());

        // A client still on version 0 cannot clobber the saved version 1.
        mockMvc.perform(put("/api/projects/" + projectId + "/notes")
                        .header("Authorization", bearer(aliceId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"version\": 0, \"yjsState\": \"c3RhbGU=\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("NOTE_CONFLICT"));

        ProjectNote note = noteRepository.findByProjectId(projectId).orElseThrow();
        assertThat(note.getVersion()).isEqualTo(1);
        assertThat(new String(note.getYjsState())).isEqualTo("version-1");
    }

    @Test
    void notes_nonMember_isRejected() throws Exception {
        String projectId = createProject("PrivateNotes", null);

        mockMvc.perform(get("/api/projects/" + projectId + "/notes")
                        .header("Authorization", bearer(bobId)))
                .andExpect(status().isForbidden());
        mockMvc.perform(put("/api/projects/" + projectId + "/notes")
                        .header("Authorization", bearer(bobId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"version\": 0, \"yjsState\": \"eA==\"}"))
                .andExpect(status().isForbidden());
        assertThat(noteRepository.findByProjectId(projectId)).isEmpty();
    }

    @Test
    void notes_archivedProject_rejectsWrites() throws Exception {
        String projectId = createProject("ArchivedNotes", null);
        Project project = projectRepository.findById(projectId).orElseThrow();
        project.setStatus(Project.ProjectStatus.ARCHIVED);
        projectRepository.save(project);

        mockMvc.perform(put("/api/projects/" + projectId + "/notes")
                        .header("Authorization", bearer(aliceId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"version\": 0, \"yjsState\": \"eA==\"}"))
                .andExpect(status().isBadRequest());
    }

    // ---------- Public profile ----------

    @Test
    void publicProfile_exposesOnlySafeFields() throws Exception {
        mockMvc.perform(get("/api/public/users/alice"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.displayName").value("Alice"))
                .andExpect(jsonPath("$.username").value("alice"))
                .andExpect(jsonPath("$.memberSince").exists())
                .andExpect(jsonPath("$.contributions.currentStreak").exists())
                .andExpect(jsonPath("$.email").doesNotExist())
                .andExpect(jsonPath("$.lastLoginAt").doesNotExist())
                .andExpect(jsonPath("$.password").doesNotExist())
                .andExpect(jsonPath("$.role").doesNotExist());
    }

    @Test
    void publicProfile_unknownUser_is404() throws Exception {
        mockMvc.perform(get("/api/public/users/nobody"))
                .andExpect(status().isNotFound());
    }

    // ---------- Message upgrades (DM flow) ----------

    @Test
    void message_editReactThreadSearch_fullFlow() throws Exception {
        String replyTo = extractId(mockMvc.perform(post("/api/messages")
                        .header("Authorization", bearer(aliceId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"receiverId\": \"" + bobId + "\", \"content\": \"Original text\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").value("Original text"))
                .andReturn().getResponse().getContentAsString());

        // Edit — only the sender may.
        mockMvc.perform(put("/api/messages/" + replyTo)
                        .header("Authorization", bearer(aliceId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\": \"Edited text\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.edited").value(true))
                .andExpect(jsonPath("$.content").value("Edited text"));

        // A non-participant cannot edit.
        mockMvc.perform(put("/api/messages/" + replyTo)
                        .header("Authorization", bearer(bobId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\": \"Hijacked\"}"))
                .andExpect(status().isForbidden());

        // Reactions.
        mockMvc.perform(post("/api/messages/" + replyTo + "/reactions")
                        .header("Authorization", bearer(bobId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"emoji\": \"👍\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].emoji").value("👍"))
                .andExpect(jsonPath("$[0].count").value(1))
                .andExpect(jsonPath("$[0].reactedByMe").value(true));

        // Thread reply from Bob.
        mockMvc.perform(post("/api/messages")
                        .header("Authorization", bearer(bobId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"receiverId\": \"" + aliceId + "\", \"content\": \"A reply\", \"parentMessageId\": \""
                                + replyTo + "\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/messages/thread/" + replyTo)
                        .header("Authorization", bearer(aliceId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].content").value("A reply"));

        // Search matches the CURRENT content (edits are reflected) and only
        // returns the caller's own conversations.
        // Search matches the CURRENT content (edits are reflected) and only
        // returns the caller's own conversations.
        mockMvc.perform(get("/api/messages/search")
                        .param("q", "Edited")
                        .header("Authorization", bearer(aliceId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].content").value("Edited text"));

        // The pre-edit text is no longer matchable.
        mockMvc.perform(get("/api/messages/search")
                        .param("q", "Original")
                        .header("Authorization", bearer(aliceId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        // Soft delete removes it from the conversation listing.
        mockMvc.perform(delete("/api/messages/" + replyTo)
                        .header("Authorization", bearer(aliceId)))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/messages/dm/" + bobId)
                        .header("Authorization", bearer(aliceId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }
}
