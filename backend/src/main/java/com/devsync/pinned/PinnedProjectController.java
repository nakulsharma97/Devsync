package com.devsync.pinned;

import com.devsync.pinned.dto.PinnedProjectResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class PinnedProjectController {

    private final PinnedProjectService pinnedProjectService;

    @GetMapping("/pinned")
    public ResponseEntity<List<PinnedProjectResponse>> list(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(pinnedProjectService.list(userDetails.getUsername()));
    }

    @PostMapping("/{projectId}/pin")
    public ResponseEntity<PinnedProjectResponse> pin(
            @PathVariable String projectId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(pinnedProjectService.pin(projectId, userDetails.getUsername()));
    }

    @DeleteMapping("/{projectId}/pin")
    public ResponseEntity<Void> unpin(
            @PathVariable String projectId,
            @AuthenticationPrincipal UserDetails userDetails) {
        pinnedProjectService.unpin(projectId, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }
}
