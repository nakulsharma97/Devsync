package com.devsync.kanban;

import com.devsync.auth.JwtTokenProvider;
import com.devsync.kanban.entity.Board;
import com.devsync.kanban.entity.BoardColumn;
import com.devsync.kanban.entity.Task;
import com.devsync.kanban.repository.BoardColumnRepository;
import com.devsync.kanban.repository.BoardRepository;
import com.devsync.kanban.repository.TaskRepository;
import com.devsync.project.entity.Project;
import com.devsync.project.entity.ProjectMember;
import com.devsync.project.repository.ProjectMemberRepository;
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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end authorization tests for boards and tasks with REAL signed JWTs,
 * the full Spring context and H2. Proves that project membership is enforced
 * for every board/task operation — a user can never reach another project's
 * board by changing projectId or boardId.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class BoardSecurityIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private ProjectRepository projectRepository;
    @Autowired private ProjectMemberRepository projectMemberRepository;
    @Autowired private BoardRepository boardRepository;
    @Autowired private BoardColumnRepository columnRepository;
    @Autowired private TaskRepository taskRepository;
    @Autowired private JwtTokenProvider jwtTokenProvider;

    private String ownerId;
    private String memberId;
    private String viewerId;
    private String strangerId;

    private String project1Id;
    private String board1Id;
    private String column1Id;
    private String task1Id;

    private String project2Id;
    private String board2Id;
    private String column2Id;

    @BeforeEach
    void seed() {
        userRepository.deleteAll();
        projectMemberRepository.deleteAll();
        taskRepository.deleteAll();
        columnRepository.deleteAll();
        boardRepository.deleteAll();
        projectRepository.deleteAll();

        ownerId = createUser("owner@test.com", User.Role.USER).getId();
        memberId = createUser("member@test.com", User.Role.USER).getId();
        viewerId = createUser("viewer@test.com", User.Role.USER).getId();
        strangerId = createUser("stranger@test.com", User.Role.USER).getId();

        // Project 1: owner + MEMBER + VIEWER.
        Project p1 = projectRepository.save(Project.builder()
                .name("Project One").ownerId(ownerId).build());
        project1Id = p1.getId();
        addMember(project1Id, memberId, ProjectMember.Role.MEMBER);
        addMember(project1Id, viewerId, ProjectMember.Role.VIEWER);

        Board b1 = boardRepository.save(Board.builder()
                .name("Board One").projectId(project1Id).createdBy(ownerId).build());
        board1Id = b1.getId();
        BoardColumn c1 = columnRepository.save(BoardColumn.builder()
                .boardId(board1Id).name("To Do").position(0).build());
        column1Id = c1.getId();
        Task t1 = taskRepository.save(Task.builder()
                .title("Task One").columnId(column1Id).boardId(board1Id).position(0).build());
        task1Id = t1.getId();

        // Project 2: a DIFFERENT project the stranger does not belong to.
        Project p2 = projectRepository.save(Project.builder()
                .name("Project Two").ownerId(strangerId).build());
        project2Id = p2.getId();
        Board b2 = boardRepository.save(Board.builder()
                .name("Board Two").projectId(project2Id).createdBy(strangerId).build());
        board2Id = b2.getId();
        BoardColumn c2 = columnRepository.save(BoardColumn.builder()
                .boardId(board2Id).name("To Do").position(0).build());
        column2Id = c2.getId();
    }

    private User createUser(String email, User.Role role) {
        User user = User.builder()
                .email(email)
                .password("$2a$10$abcdefghijklmnopqrstuv")
                .fullName("User " + email)
                .username(email.split("@")[0])
                .role(role)
                .emailVerified(true)
                .authProvider("email")
                .build();
        user.setId(null);
        return userRepository.save(user);
    }

    private void addMember(String projectId, String userId, ProjectMember.Role role) {
        projectMemberRepository.save(ProjectMember.builder()
                .projectId(projectId).userId(userId).role(role).build());
    }

    private String bearer(String userId) {
        String email = userRepository.findById(userId).orElseThrow().getEmail();
        return "Bearer " + jwtTokenProvider.generateAccessToken(userId, email);
    }

    // ── Get board by board id ────────────────────────────────

    @Test
    void getBoard_shouldReturn200_ForOwner() throws Exception {
        mockMvc.perform(get("/api/boards/" + board1Id).header("Authorization", bearer(ownerId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(board1Id));
    }

    @Test
    void getBoard_shouldReturn200_ForMember() throws Exception {
        mockMvc.perform(get("/api/boards/" + board1Id).header("Authorization", bearer(memberId)))
                .andExpect(status().isOk());
    }

    @Test
    void getBoard_shouldReturn200_ForViewer() throws Exception {
        mockMvc.perform(get("/api/boards/" + board1Id).header("Authorization", bearer(viewerId)))
                .andExpect(status().isOk());
    }

    @Test
    void getBoard_shouldReturn403_ForNonMember() throws Exception {
        mockMvc.perform(get("/api/boards/" + board1Id).header("Authorization", bearer(strangerId)))
                .andExpect(status().isForbidden());
    }

    @Test
    void getBoard_shouldReturn401_WithoutToken() throws Exception {
        mockMvc.perform(get("/api/boards/" + board1Id))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void getBoard_shouldReturn404_ForUnknownBoard() throws Exception {
        mockMvc.perform(get("/api/boards/nope").header("Authorization", bearer(ownerId)))
                .andExpect(status().isNotFound());
    }

    // ── Get board by project id (IDOR via projectId) ─────────

    @Test
    void getProjectBoard_shouldReturn200_ForMember() throws Exception {
        mockMvc.perform(get("/api/boards/project/" + project1Id).header("Authorization", bearer(memberId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(board1Id));
    }

    @Test
    void getProjectBoard_shouldReturn403_ForNonMember() throws Exception {
        mockMvc.perform(get("/api/boards/project/" + project1Id).header("Authorization", bearer(strangerId)))
                .andExpect(status().isForbidden());
    }

    @Test
    void getProjectBoard_shouldReturn401_WithoutToken() throws Exception {
        mockMvc.perform(get("/api/boards/project/" + project1Id))
                .andExpect(status().isUnauthorized());
    }

    // ── Create board ─────────────────────────────────────────

    @Test
    void createBoard_shouldReturn200_ForMember() throws Exception {
        mockMvc.perform(post("/api/boards")
                        .param("name", "Sprint 2")
                        .param("projectId", project1Id)
                        .param("columns", "To Do,In Progress,Done")
                        .header("Authorization", bearer(memberId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.projectId").value(project1Id));
    }

    @Test
    void createBoard_shouldReturn400_WhenProjectArchived() throws Exception {
        Project p1 = projectRepository.findById(project1Id).orElseThrow();
        p1.setStatus(Project.ProjectStatus.ARCHIVED);
        projectRepository.save(p1);

        mockMvc.perform(post("/api/boards")
                        .param("name", "Late Board")
                        .param("projectId", project1Id)
                        .header("Authorization", bearer(ownerId)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createBoard_shouldReturn404_WhenProjectDeleted() throws Exception {
        Project p1 = projectRepository.findById(project1Id).orElseThrow();
        p1.setDeleted(true);
        projectRepository.save(p1);

        mockMvc.perform(post("/api/boards")
                        .param("name", "Ghost Board")
                        .param("projectId", project1Id)
                        .header("Authorization", bearer(ownerId)))
                .andExpect(status().isNotFound());
    }

    @Test
    void createBoard_shouldReturn404_ForUnknownProject() throws Exception {
        mockMvc.perform(post("/api/boards")
                        .param("name", "Ghost Board")
                        .param("projectId", "no-such-project")
                        .header("Authorization", bearer(ownerId)))
                .andExpect(status().isNotFound());
    }

    @Test
    void createBoard_shouldReturn403_ForNonMember() throws Exception {
        mockMvc.perform(post("/api/boards")
                        .param("name", "Sneaky")
                        .param("projectId", project1Id)
                        .header("Authorization", bearer(strangerId)))
                .andExpect(status().isForbidden());
    }

    @Test
    void createBoard_shouldReturn401_WithoutToken() throws Exception {
        mockMvc.perform(post("/api/boards").param("name", "X").param("projectId", project1Id))
                .andExpect(status().isUnauthorized());
    }

    // ── Create task ──────────────────────────────────────────

    @Test
    void createTask_shouldReturn200_ForMember() throws Exception {
        mockMvc.perform(post("/api/boards/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Member task\",\"columnId\":\"" + column1Id + "\"}")
                        .header("Authorization", bearer(memberId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Member task"));
    }

    @Test
    void createTask_shouldReturn403_ForViewer() throws Exception {
        mockMvc.perform(post("/api/boards/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Viewer task\",\"columnId\":\"" + column1Id + "\"}")
                        .header("Authorization", bearer(viewerId)))
                .andExpect(status().isForbidden());
    }

    @Test
    void createTask_shouldReturn403_ForNonMember() throws Exception {
        mockMvc.perform(post("/api/boards/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Stranger task\",\"columnId\":\"" + column1Id + "\"}")
                        .header("Authorization", bearer(strangerId)))
                .andExpect(status().isForbidden());
    }

    @Test
    void createTask_shouldReturn401_WithoutToken() throws Exception {
        mockMvc.perform(post("/api/boards/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Anon\",\"columnId\":\"" + column1Id + "\"}"))
                .andExpect(status().isUnauthorized());
    }

    // ── Update task ──────────────────────────────────────────

    @Test
    void updateTask_shouldReturn200_ForMember() throws Exception {
        mockMvc.perform(put("/api/boards/tasks/" + task1Id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Renamed\",\"columnId\":\"" + column1Id + "\"}")
                        .header("Authorization", bearer(memberId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Renamed"));
    }

    @Test
    void updateTask_shouldReturn403_ForNonMember() throws Exception {
        mockMvc.perform(put("/api/boards/tasks/" + task1Id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Hijack\",\"columnId\":\"" + column1Id + "\"}")
                        .header("Authorization", bearer(strangerId)))
                .andExpect(status().isForbidden());
    }

    // ── Delete task ──────────────────────────────────────────

    @Test
    void deleteTask_shouldReturn204_ForMember() throws Exception {
        mockMvc.perform(delete("/api/boards/tasks/" + task1Id)
                        .header("Authorization", bearer(memberId)))
                .andExpect(status().isNoContent());
    }

    @Test
    void deleteTask_shouldReturn403_ForNonMember() throws Exception {
        mockMvc.perform(delete("/api/boards/tasks/" + task1Id)
                        .header("Authorization", bearer(strangerId)))
                .andExpect(status().isForbidden());
    }

    // ── Move / position ──────────────────────────────────────

    @Test
    void updateTaskPosition_shouldReturn200_ForMember() throws Exception {
        BoardColumn done = columnRepository.save(BoardColumn.builder()
                .boardId(board1Id).name("Done").position(1).build());
        mockMvc.perform(put("/api/boards/tasks/position")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"taskId\":\"" + task1Id + "\",\"newColumnId\":\"" + done.getId() + "\",\"newPosition\":0}")
                        .header("Authorization", bearer(memberId)))
                .andExpect(status().isOk());
    }

    @Test
    void updateTaskPosition_shouldReturn200_ForOwner() throws Exception {
        BoardColumn done = columnRepository.save(BoardColumn.builder()
                .boardId(board1Id).name("Done").position(1).build());
        mockMvc.perform(put("/api/boards/tasks/position")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"taskId\":\"" + task1Id + "\",\"newColumnId\":\"" + done.getId() + "\",\"newPosition\":0}")
                        .header("Authorization", bearer(ownerId)))
                .andExpect(status().isOk());
    }

    @Test
    void updateTaskPosition_shouldReturn403_ForNonMember() throws Exception {
        mockMvc.perform(put("/api/boards/tasks/position")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"taskId\":\"" + task1Id + "\",\"newColumnId\":\"" + column1Id + "\",\"newPosition\":0}")
                        .header("Authorization", bearer(strangerId)))
                .andExpect(status().isForbidden());
    }

    @Test
    void updateTaskPosition_shouldReturn403_ForViewer() throws Exception {
        mockMvc.perform(put("/api/boards/tasks/position")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"taskId\":\"" + task1Id + "\",\"newColumnId\":\"" + column1Id + "\",\"newPosition\":0}")
                        .header("Authorization", bearer(viewerId)))
                .andExpect(status().isForbidden());
    }

    @Test
    void updateTaskPosition_shouldReturn404_ForUnknownColumn() throws Exception {
        // Invalid board/task combination: the destination column doesn't exist.
        mockMvc.perform(put("/api/boards/tasks/position")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"taskId\":\"" + task1Id + "\",\"newColumnId\":\"no-such-column\",\"newPosition\":0}")
                        .header("Authorization", bearer(memberId)))
                .andExpect(status().isNotFound());
    }

    @Test
    void updateTaskPosition_shouldReturn404_ForUnknownTask() throws Exception {
        mockMvc.perform(put("/api/boards/tasks/position")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"taskId\":\"no-such-task\",\"newColumnId\":\"" + column1Id + "\",\"newPosition\":0}")
                        .header("Authorization", bearer(memberId)))
                .andExpect(status().isNotFound());
    }

    @Test
    void updateTaskPosition_shouldReject_ColumnFromAnotherProject() throws Exception {
        // member1 tries to move project-1's task into project-2's column.
        mockMvc.perform(put("/api/boards/tasks/position")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"taskId\":\"" + task1Id + "\",\"newColumnId\":\"" + column2Id + "\",\"newPosition\":0}")
                        .header("Authorization", bearer(memberId)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void updateTaskPosition_shouldReturn400_WhenProjectArchived() throws Exception {
        Project p1 = projectRepository.findById(project1Id).orElseThrow();
        p1.setStatus(Project.ProjectStatus.ARCHIVED);
        projectRepository.save(p1);

        mockMvc.perform(put("/api/boards/tasks/position")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"taskId\":\"" + task1Id + "\",\"newColumnId\":\"" + column1Id + "\",\"newPosition\":0}")
                        .header("Authorization", bearer(memberId)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void updateTaskPosition_shouldReturn404_WhenProjectDeleted() throws Exception {
        Project p1 = projectRepository.findById(project1Id).orElseThrow();
        p1.setDeleted(true);
        projectRepository.save(p1);

        mockMvc.perform(put("/api/boards/tasks/position")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"taskId\":\"" + task1Id + "\",\"newColumnId\":\"" + column1Id + "\",\"newPosition\":0}")
                        .header("Authorization", bearer(memberId)))
                .andExpect(status().isNotFound());
    }

    // ── Filter tasks ─────────────────────────────────────────

    @Test
    void filterTasks_shouldReturn200_ForMember() throws Exception {
        mockMvc.perform(get("/api/boards/project/" + project1Id + "/tasks")
                        .header("Authorization", bearer(memberId)))
                .andExpect(status().isOk());
    }

    @Test
    void filterTasks_shouldReturn403_ForNonMember() throws Exception {
        mockMvc.perform(get("/api/boards/project/" + project1Id + "/tasks")
                        .header("Authorization", bearer(strangerId)))
                .andExpect(status().isForbidden());
    }

    // ── Wrong-project IDOR checks ────────────────────────────

    @Test
    void memberOfProjectOne_shouldNotAccess_ProjectTwoBoard() throws Exception {
        // member1 (project 1) tries to read project 2's board by board id.
        mockMvc.perform(get("/api/boards/" + board2Id).header("Authorization", bearer(memberId)))
                .andExpect(status().isForbidden());
    }

    @Test
    void memberOfProjectOne_shouldNotRead_ProjectTwoBoardByProjectId() throws Exception {
        mockMvc.perform(get("/api/boards/project/" + project2Id).header("Authorization", bearer(memberId)))
                .andExpect(status().isForbidden());
    }
}
