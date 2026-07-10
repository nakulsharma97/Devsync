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
    public ResponseEntity<TeamRoomResponse> getRoom(@PathVariable String roomId) {
        return ResponseEntity.ok(roomService.getRoom(roomId));
    }

    @PostMapping("/{roomId}/invite")
    public ResponseEntity<TeamRoomResponse> inviteToRoom(
            @PathVariable String roomId,
            @Valid @RequestBody InviteRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(roomService.inviteToRoom(roomId, request, userDetails.getUsername()));
    }

    @GetMapping("/{roomId}/participants")
    public ResponseEntity<List<TeamRoomResponse.ParticipantDto>> getParticipants(@PathVariable String roomId) {
        return ResponseEntity.ok(roomService.getParticipants(roomId));
    }
}
