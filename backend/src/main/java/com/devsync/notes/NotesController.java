package com.devsync.notes;

import com.devsync.notes.dto.NoteResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/projects/{projectId}/notes")
@RequiredArgsConstructor
public class NotesController {

    private final NotesService notesService;

    @GetMapping
    public ResponseEntity<NoteResponse> getNote(
            @PathVariable String projectId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(notesService.getNote(projectId, userDetails.getUsername()));
    }

    @PutMapping
    public ResponseEntity<NoteResponse> saveNote(
            @PathVariable String projectId,
            @Valid @RequestBody SaveNoteRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(notesService.saveNote(
                projectId, userDetails.getUsername(), request.getVersion(), request.getYjsState()));
    }
}
