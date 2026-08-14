package com.devsync.notes;

import com.devsync.project.entity.Project;
import com.devsync.project.repository.ProjectMemberRepository;
import com.devsync.project.repository.ProjectRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;

/**
 * Real-time relay for shared Markdown docs. The client sends incremental Yjs
 * updates here; they are broadcast to the project's notes topic — but only
 * after the caller is verified as a member of the project (a non-member can
 * never inject edits into a project's document).
 */
@Controller
@RequiredArgsConstructor
public class NotesWebSocketController {

    private final SimpMessagingTemplate messagingTemplate;
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository memberRepository;

    @MessageMapping("/notes.update")
    public void relayUpdate(@Payload NoteUpdate update, Principal principal) {
        String userId = principal.getName();
        Project project = projectRepository.findById(update.getProjectId())
                .filter(p -> !p.isDeleted())
                .orElseThrow(() -> new com.devsync.common.ResourceNotFoundException("Project", update.getProjectId()));
        if (project.getStatus() == Project.ProjectStatus.ARCHIVED) {
            throw new IllegalArgumentException("Archived projects cannot be edited");
        }
        boolean member = project.getOwnerId().equals(userId)
                || memberRepository.existsByProjectIdAndUserId(project.getId(), userId);
        if (!member) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "You are not a member of this project");
        }
        messagingTemplate.convertAndSend("/topic/projects/" + update.getProjectId() + "/notes", update);
    }

    @Data
    public static class NoteUpdate {
        private String projectId;
        /** Base64-encoded incremental Yjs update. */
        private String update;
    }
}
