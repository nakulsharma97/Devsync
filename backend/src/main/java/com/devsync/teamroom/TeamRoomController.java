package com.devsync.teamroom;

import com.devsync.teamroom.dto.CreateRoomRequest;
import com.devsync.teamroom.dto.InviteRequest;
import com.devsync.teamroom.dto.TeamRoomResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/rooms")
@RequiredArgsConstructor
public class TeamRoomController {

    private final TeamRoomService roomService;

    @GetMapping
    public ResponseEntity<List<TeamRoomResponse>> getMyRooms(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(roomService.getMyRooms(userDetails.getUsername()));
    }

    @PostMapping
    public ResponseEntity<TeamRoomResponse> createRoom(
            @Valid @RequestBody CreateRoomRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(roomService.createRoom(request, userDetails.getUsername()));
    }

    @GetMapping("/{roomId}")
    public ResponseEntity<TeamRoomResponse> getRoom(
            @PathVariable String roomId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(roomService.getRoom(roomId, userDetails.getUsername()));
    }

    @PostMapping("/{roomId}/invite")
    public ResponseEntity<TeamRoomResponse> inviteToRoom(
            @PathVariable String roomId,
            @Valid @RequestBody InviteRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(roomService.inviteToRoom(roomId, request, userDetails.getUsername()));
    }

    @PostMapping("/{roomId}/join")
    public ResponseEntity<Void> joinRoom(
            @PathVariable String roomId,
            @AuthenticationPrincipal UserDetails userDetails) {
        roomService.joinRoom(roomId, userDetails.getUsername());
        return ResponseEntity.ok().build();
    }

    /**
     * Find-or-create the team chat for a project (used by the workspace).
     * Idempotent: returns the existing room when one already exists.
     */
    @PostMapping("/project/{projectId}")
    public ResponseEntity<TeamRoomResponse> getOrCreateProjectRoom(
            @PathVariable String projectId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(roomService.getOrCreateProjectRoom(projectId, userDetails.getUsername()));
    }

    @GetMapping("/{roomId}/participants")
    public ResponseEntity<List<TeamRoomResponse.ParticipantDto>> getParticipants(
            @PathVariable String roomId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(roomService.getParticipants(roomId, userDetails.getUsername()));
    }
}
