package com.devsync.collab;

import com.devsync.collab.dto.InvitationResponse;
import com.devsync.collab.dto.InviteRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class InvitationController {

    private final InvitationService invitationService;

    @PostMapping("/projects/{projectId}/invite")
    public ResponseEntity<InvitationResponse> invite(
            @PathVariable String projectId,
            @Valid @RequestBody InviteRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(invitationService.invite(projectId, request, userDetails.getUsername()));
    }

    @GetMapping("/projects/{projectId}/invitations")
    public ResponseEntity<List<InvitationResponse>> listForProject(
            @PathVariable String projectId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(invitationService.listForProject(projectId, userDetails.getUsername()));
    }

    @GetMapping("/invitations/mine")
    public ResponseEntity<List<InvitationResponse>> mine(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(invitationService.listMine(userDetails.getUsername()));
    }

    @PutMapping("/invitations/{id}/accept")
    public ResponseEntity<InvitationResponse> accept(
            @PathVariable String id,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(invitationService.accept(id, userDetails.getUsername()));
    }

    @PutMapping("/invitations/{id}/decline")
    public ResponseEntity<Void> decline(
            @PathVariable String id,
            @AuthenticationPrincipal UserDetails userDetails) {
        invitationService.decline(id, userDetails.getUsername());
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/invitations/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable String id,
            @AuthenticationPrincipal UserDetails userDetails) {
        invitationService.delete(id, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }
}
