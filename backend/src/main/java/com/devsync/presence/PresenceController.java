package com.devsync.presence;

import com.devsync.presence.dto.PresenceUpdateRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/presence")
@RequiredArgsConstructor
public class PresenceController {

    private final PresenceService presenceService;

    @PutMapping
    public ResponseEntity<Void> updateStatus(
            @Valid @RequestBody PresenceUpdateRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        presenceService.updateStatus(userDetails.getUsername(), request.getStatus());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/heartbeat")
    public ResponseEntity<Map<String, String>> heartbeat(@AuthenticationPrincipal UserDetails userDetails) {
        presenceService.touch(userDetails.getUsername());
        return ResponseEntity.ok(Map.of("status", "ok"));
    }
}
