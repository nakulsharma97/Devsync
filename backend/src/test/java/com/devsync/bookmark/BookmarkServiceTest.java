package com.devsync.bookmark;

import com.devsync.bookmark.dto.BookmarkResponse;
import com.devsync.bookmark.entity.Bookmark;
import com.devsync.bookmark.repository.BookmarkRepository;
import com.devsync.feed.entity.Post;
import com.devsync.feed.repository.PostRepository;
import com.devsync.kanban.entity.Task;
import com.devsync.kanban.repository.TaskRepository;
import com.devsync.project.entity.Project;
import com.devsync.project.repository.ProjectRepository;
import com.devsync.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BookmarkServiceTest {

    @Mock private BookmarkRepository bookmarkRepository;
    @Mock private ProjectRepository projectRepository;
    @Mock private TaskRepository taskRepository;
    @Mock private PostRepository postRepository;
    @Mock private UserRepository userRepository;

    private BookmarkService bookmarkService;

    @BeforeEach
    void setUp() {
        bookmarkService = new BookmarkService(bookmarkRepository, projectRepository, taskRepository,
                postRepository, userRepository);
    }

    @Test
    void add_shouldSaveProjectBookmark() {
        Project project = Project.builder().name("DevSync").ownerId("owner1").build();
        project.setId("p1");
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));
        when(bookmarkRepository.save(any(Bookmark.class))).thenAnswer(inv -> inv.getArgument(0));

        BookmarkResponse response = bookmarkService.add("u1", "PROJECT", "p1");

        assertThat(response.getEntityType()).isEqualTo("PROJECT");
        assertThat(response.getTitle()).isEqualTo("DevSync");
        verify(bookmarkRepository).save(any(Bookmark.class));
    }

    @Test
    void add_shouldReject_WhenAlreadyBookmarked() {
        when(bookmarkRepository.existsByUserIdAndEntityTypeAndEntityId("u1", "PROJECT", "p1"))
                .thenReturn(true);

        assertThatThrownBy(() -> bookmarkService.add("u1", "PROJECT", "p1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Already bookmarked");
        verify(bookmarkRepository, never()).save(any());
    }

    @Test
    void add_shouldReject_InvalidEntityType() {
        assertThatThrownBy(() -> bookmarkService.add("u1", "MESSAGE", "x"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Invalid entityType");
    }

    @Test
    void remove_shouldThrow_WhenNotOwner() {
        Bookmark bookmark = Bookmark.builder().userId("u2").entityType("PROJECT").entityId("p1").build();
        bookmark.setId("b1");
        when(bookmarkRepository.findById("b1")).thenReturn(Optional.of(bookmark));

        assertThatThrownBy(() -> bookmarkService.remove("b1", "u1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Not your bookmark");
        verify(bookmarkRepository, never()).delete(any());
    }

    @Test
    void remove_shouldDelete_WhenOwner() {
        Bookmark bookmark = Bookmark.builder().userId("u1").entityType("PROJECT").entityId("p1").build();
        bookmark.setId("b1");
        when(bookmarkRepository.findById("b1")).thenReturn(Optional.of(bookmark));

        bookmarkService.remove("b1", "u1");

        verify(bookmarkRepository).delete(bookmark);
    }

    @Test
    void list_shouldResolveTitles() {
        Bookmark b1 = Bookmark.builder().userId("u1").entityType("PROJECT").entityId("p1").build();
        b1.setId("b1");
        Bookmark b2 = Bookmark.builder().userId("u1").entityType("TASK").entityId("t1").build();
        b2.setId("b2");
        when(bookmarkRepository.findByUserIdOrderByCreatedAtDesc("u1")).thenReturn(List.of(b1, b2));

        Project project = Project.builder().name("DevSync").ownerId("owner1").build();
        project.setId("p1");
        Task task = Task.builder().title("Fix bug").columnId("c1").boardId("board1").build();
        task.setId("t1");
        when(projectRepository.findAllById(List.of("p1"))).thenReturn(List.of(project));
        when(taskRepository.findAllById(List.of("t1"))).thenReturn(List.of(task));

        List<BookmarkResponse> list = bookmarkService.list("u1");

        assertThat(list).hasSize(2);
        assertThat(list).extracting(BookmarkResponse::getTitle)
                .containsExactlyInAnyOrder("DevSync", "Fix bug");
    }

    @Test
    void isBookmarked_shouldDelegate() {
        when(bookmarkRepository.existsByUserIdAndEntityTypeAndEntityId("u1", "POST", "p1"))
                .thenReturn(true);
        assertThat(bookmarkService.isBookmarked("u1", "post", "p1")).isTrue();
    }
}
