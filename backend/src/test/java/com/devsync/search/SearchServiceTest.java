package com.devsync.search;

import com.devsync.feed.repository.PostRepository;
import com.devsync.kanban.repository.TaskRepository;
import com.devsync.message.repository.MessageRepository;
import com.devsync.project.entity.Project;
import com.devsync.project.repository.ProjectRepository;
import com.devsync.search.dto.SearchResponse;
import com.devsync.search.entity.RecentSearch;
import com.devsync.search.repository.RecentSearchRepository;
import com.devsync.teamroom.repository.TeamRoomRepository;
import com.devsync.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SearchServiceTest {

    @Mock private ProjectRepository projectRepository;
    @Mock private TaskRepository taskRepository;
    @Mock private UserRepository userRepository;
    @Mock private TeamRoomRepository teamRoomRepository;
    @Mock private PostRepository postRepository;
    @Mock private MessageRepository messageRepository;
    @Mock private RecentSearchRepository recentSearchRepository;

    private SearchService searchService;

    @BeforeEach
    void setUp() {
        searchService = new SearchService(projectRepository, taskRepository, userRepository,
                teamRoomRepository, postRepository, messageRepository, recentSearchRepository);
    }

    @Test
    void search_shouldReturnEmpty_WhenKeywordTooShort() {
        SearchResponse response = searchService.search("a", null, 0, 20, "u1");

        assertThat(response.getTotal()).isZero();
        assertThat(response.getItems()).isEmpty();
        verifyNoInteractions(projectRepository);
    }

    @Test
    void search_shouldFindPublicProjects() {
        Project project = Project.builder().name("DevSync")
                .description("Team sync platform").ownerId("owner1").build();
        project.setId("p1");
        when(projectRepository.searchProjectsForUser(eq("dev"), eq("u1"),
                eq(Project.ProjectVisibility.PUBLIC), any(Pageable.class)))
                .thenReturn(List.of(project));

        SearchResponse response = searchService.search("dev", "PROJECT", 0, 20, "u1");

        assertThat(response.getTotal()).isEqualTo(1);
        assertThat(response.getItems().get(0).getType()).isEqualTo("PROJECT");
        assertThat(response.getItems().get(0).getTitle()).isEqualTo("DevSync");
    }

    @Test
    void recordRecent_shouldDeduplicate() {
        RecentSearch existing = RecentSearch.builder().userId("u1").keyword("dev").build();
        existing.setId("r1");
        when(recentSearchRepository.findByUserIdAndKeyword("u1", "dev")).thenReturn(Optional.of(existing));
        when(recentSearchRepository.save(any(RecentSearch.class))).thenAnswer(inv -> inv.getArgument(0));

        searchService.recordRecent("u1", "dev");

        verify(recentSearchRepository).delete(existing);
        verify(recentSearchRepository).save(any(RecentSearch.class));
    }

    @Test
    void getRecent_shouldReturnKeywords() {
        RecentSearch r1 = RecentSearch.builder().userId("u1").keyword("dev").build();
        RecentSearch r2 = RecentSearch.builder().userId("u1").keyword("task").build();
        when(recentSearchRepository.findTop10ByUserIdOrderByCreatedAtDesc("u1"))
                .thenReturn(List.of(r1, r2));

        assertThat(searchService.getRecent("u1")).containsExactly("dev", "task");
    }

    @Test
    void clearRecent_shouldDeleteAll() {
        searchService.clearRecent("u1");
        verify(recentSearchRepository).deleteByUserId("u1");
    }
}
