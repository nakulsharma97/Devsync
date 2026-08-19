package com.devsync.support;

import com.devsync.common.ApiResponse;
import com.devsync.common.PageResponse;
import com.devsync.support.dto.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Admin-facing support ticket management. Requires ROLE_ADMIN.
 */
@RestController
@RequestMapping("/api/admin/support")
@RequiredArgsConstructor
public class SupportTicketAdminController {

    private final SupportTicketService supportTicketService;

    @GetMapping
    public ResponseEntity<PageResponse<SupportTicketResponse>> getTickets(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String priority,
            @RequestParam(required = false) String assignedTo,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {
        return ResponseEntity.ok(supportTicketService.getAdminTickets(
                page, size, search, status, priority, assignedTo, from, to));
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Long>> getStats() {
        return ResponseEntity.ok(supportTicketService.getAdminStats());
    }

    @GetMapping("/{ticketId}")
    public ResponseEntity<SupportTicketResponse> getTicket(@PathVariable String ticketId) {
        return ResponseEntity.ok(supportTicketService.getAdminTicket(ticketId));
    }

    @GetMapping("/{ticketId}/replies")
    public ResponseEntity<List<SupportTicketReplyResponse>> getTicketReplies(@PathVariable String ticketId) {
        return ResponseEntity.ok(supportTicketService.getAdminTicketReplies(ticketId));
    }

    @PostMapping("/{ticketId}/replies")
    public ResponseEntity<ApiResponse<SupportTicketReplyResponse>> addReply(
            @PathVariable String ticketId,
            @Valid @RequestBody ReplySupportTicketRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        SupportTicketReplyResponse reply = supportTicketService.adminReply(ticketId, userDetails.getUsername(), request);
        return ResponseEntity.ok(ApiResponse.success("Reply added", reply));
    }

    @PutMapping("/{ticketId}/status")
    public ResponseEntity<SupportTicketResponse> updateStatus(
            @PathVariable String ticketId,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDetails userDetails) {
        String status = body.get("status");
        return ResponseEntity.ok(supportTicketService.updateStatus(ticketId, status, userDetails.getUsername()));
    }

    @PutMapping("/{ticketId}/assign")
    public ResponseEntity<SupportTicketResponse> assignTicket(
            @PathVariable String ticketId,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDetails userDetails) {
        String assignedTo = body.get("assignedTo");
        return ResponseEntity.ok(supportTicketService.assignTicket(ticketId, assignedTo, userDetails.getUsername()));
    }
}
