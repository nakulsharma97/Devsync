package com.devsync.project;

import com.devsync.activity.ActivityService;
import com.devsync.activity.entity.ActivityType;
import com.devsync.kanban.entity.Board;
import com.devsync.kanban.entity.BoardColumn;
import com.devsync.kanban.entity.Task;
import com.devsync.kanban.repository.BoardColumnRepository;
import com.devsync.kanban.repository.BoardRepository;
import com.devsync.kanban.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Seeds a ready-to-use Kanban board for a project created from a template.
 * Each template defines its own columns and starter tasks — no fabricated
 * users, dates, or fake progress; starter tasks are unassigned "To Do" items.
 */
@Service
@RequiredArgsConstructor
public class ProjectTemplateService {

    private final BoardRepository boardRepository;
    private final BoardColumnRepository columnRepository;
    private final TaskRepository taskRepository;
    private final ActivityService activityService;

    /** Supported template codes, e.g. SPRINT_BOARD, BUG_TRACKER, FEATURE_BACKLOG. */
    public static final String SPRINT_BOARD = "SPRINT_BOARD";
    public static final String BUG_TRACKER = "BUG_TRACKER";
    public static final String FEATURE_BACKLOG = "FEATURE_BACKLOG";

    public boolean supports(String code) {
        return code != null && (code.equals(SPRINT_BOARD) || code.equals(BUG_TRACKER) || code.equals(FEATURE_BACKLOG));
    }

    @Transactional
    public void seed(String projectId, String ownerId, String templateCode) {
        TemplateSpec spec = switch (templateCode) {
            case BUG_TRACKER -> new TemplateSpec("Bug Tracker",
                    List.of("Backlog", "To Do", "In Progress", "In Review", "Done"),
                    List.of(
                            "Reproduce the reported issue",
                            "Write a failing test for the bug",
                            "Identify the root cause",
                            "Apply the fix and open a review"));
            case FEATURE_BACKLOG -> new TemplateSpec("Feature Backlog",
                    List.of("Backlog", "To Do", "In Progress", "In Review", "Done"),
                    List.of(
                            "Define the feature scope and acceptance criteria",
                            "Draft a technical design proposal",
                            "Break the work into small tasks",
                            "Ship the feature behind a toggle"));
            default -> new TemplateSpec("Sprint Board",
                    List.of("To Do", "In Progress", "In Review", "Done"),
                    List.of(
                            "Plan this sprint's goals",
                            "Add tasks for this sprint",
                            "Review the board at the daily standup",
                            "Celebrate a completed sprint 🎉"));
        };

        Board board = boardRepository.save(Board.builder()
                .name(spec.boardName())
                .projectId(projectId)
                .createdBy(ownerId)
                .description("Created from the " + templateCode.replace('_', ' ').toLowerCase() + " template")
                .build());

        List<String> columnIds = new ArrayList<>();
        for (int i = 0; i < spec.columns().size(); i++) {
            BoardColumn column = columnRepository.save(BoardColumn.builder()
                    .boardId(board.getId())
                    .name(spec.columns().get(i))
                    .position(i)
                    .build());
            columnIds.add(column.getId());
        }

        for (int i = 0; i < spec.starterTasks().size(); i++) {
            taskRepository.save(Task.builder()
                    .title(spec.starterTasks().get(i))
                    .boardId(board.getId())
                    .columnId(columnIds.get(0))
                    .position(i)
                    .build());
        }

        activityService.record(ownerId, projectId, ActivityType.PROJECT_UPDATED,
                "Board created from " + templateCode.replace('_', ' ').toLowerCase() + " template",
                spec.boardName(), null);
    }

    private record TemplateSpec(String boardName, List<String> columns, List<String> starterTasks) {}
}
