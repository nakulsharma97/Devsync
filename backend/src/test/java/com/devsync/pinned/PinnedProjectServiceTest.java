package com.devsync.pinned;

import com.devsync.pinned.dto.PinnedProjectResponse;
import com.devsync.pinned.entity.PinnedProject;
import com.devsync.pinned.repository.PinnedProjectRepository;
import com.devsync.project.entity.Project;
import com.devsync.project.repository.ProjectMemberRepository;
import com.devsync.project.repository.ProjectRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PinnedProjectServiceTest {

    @Mock private PinnedProjectRepository pinnedRepository;
    @Mock private ProjectRepository projectRepository;
    @Mock private ProjectMemberRepository memberRepository;

    private PinnedProjectService pinnedProjectService;

    @BeforeEach
    void setUp() {
        pinnedProjectService = new PinnedProjectService(pinnedRepository, projectRepository, memberRepository);
    }

    @Test
    void pin_shouldSave() {
        Project project = Project.builder().name("DevSync").ownerId("owner1").build();
        project.setId("p1");
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));
        when(pinnedRepository.save(any(PinnedProject.class))).thenAnswer(inv -> inv.getArgument(0));

        PinnedProjectResponse response = pinnedProjectService.pin("p1", "u1");

        assertThat(response.getProjectId()).isEqualTo("p1");
        assertThat(response.getName()).isEqualTo("DevSync");
        verify(pinnedRepository).save(any(PinnedProject.class));
    }

    @Test
    void pin_shouldReject_WhenAlreadyPinned() {
        Project project = Project.builder().name("DevSync").ownerId("owner1").build();
        project.setId("p1");
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));
        when(pinnedRepository.existsByUserIdAndProjectId("u1", "p1")).thenReturn(true);

        assertThatThrownBy(() -> pinnedProjectService.pin("p1", "u1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("already pinned");
    }

    @Test
    void pin_shouldReject_WhenLimitReached() {
        Project project = Project.builder().name("DevSync").ownerId("owner1").build();
        project.setId("p1");
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));
        when(pinnedRepository.countByUserId("u1")).thenReturn(5L);

        assertThatThrownBy(() -> pinnedProjectService.pin("p1", "u1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("5");
        verify(pinnedRepository, never()).save(any());
    }

    @Test
    void unpin_shouldDelete() {
        when(pinnedRepository.existsByUserIdAndProjectId("u1", "p1")).thenReturn(true);

        pinnedProjectService.unpin("p1", "u1");

        verify(pinnedRepository).deleteByUserIdAndProjectId("u1", "p1");
    }

    @Test
    void unpin_shouldThrow_WhenNotPinned() {
        when(pinnedRepository.existsByUserIdAndProjectId("u1", "p1")).thenReturn(false);

        assertThatThrownBy(() -> pinnedProjectService.unpin("p1", "u1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("not pinned");
    }

    @Test
    void list_shouldReturnPinnedProjects() {
        PinnedProject pin = PinnedProject.builder().userId("u1").projectId("p1").position(0).build();
        pin.setId("pin1");
        when(pinnedRepository.findByUserIdOrderByPositionAsc("u1")).thenReturn(List.of(pin));

        Project project = Project.builder().name("DevSync").ownerId("owner1").build();
        project.setId("p1");
        // The service dedupes ids into a Set before resolving — stub the Set.
        when(projectRepository.findAllById(Set.of("p1"))).thenReturn(List.of(project));
        when(memberRepository.countMembersByProjectIdIn(Set.of("p1")))
                .thenReturn(Collections.singletonList(new Object[]{"p1", 3L}));

        List<PinnedProjectResponse> list = pinnedProjectService.list("u1");

        assertThat(list).hasSize(1);
        assertThat(list.get(0).getName()).isEqualTo("DevSync");
        assertThat(list.get(0).getMemberCount()).isEqualTo(3);
    }
}
