package com.devsync.collab;

import com.devsync.collab.dto.JoinRequestCreateRequest;
import com.devsync.collab.dto.JoinRequestResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class JoinRequestController {

    private final JoinRequestService joinRequestService;

    @PostMapping("/projects/{projectId}/join-request")
    public ResponseEntity<JoinRequestResponse> request(
            @PathVariable String projectId,
            @RequestBody(required = false) JoinRequestCreateRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(joinRequestService.request(projectId, userDetails.getUsername(), request));
    }

    @GetMapping("/projects/{projectId}/join-requests")
    public ResponseEntity<List<JoinRequestResponse>> listForProject(
            @PathVariable String projectId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(joinRequestService.listForProject(projectId, userDetails.getUsername()));
    }

    @PutMapping("/join-requests/{id}/approve")
    public ResponseEntity<Void> approve(
            @PathVariable String id,
            @AuthenticationPrincipal UserDetails userDetails) {
        joinRequestService.approve(id, userDetails.getUsername());
        return ResponseEntity.ok().build();
    }

    @PutMapping("/join-requests/{id}/reject")
    public ResponseEntity<Void> reject(
            @PathVariable String id,
            @AuthenticationPrincipal UserDetails userDetails) {
        joinRequestService.reject(id, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }
}
