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

/**
 * User-facing support ticket API. Authenticated users only.
 * Admin endpoints live under /api/admin/support (see SupportTicketAdminController).
 */
@RestController
@RequestMapping("/api/support/tickets")
@RequiredArgsConstructor
public class SupportTicketController {

    private final SupportTicketService supportTicketService;

    @GetMapping
    public ResponseEntity<PageResponse<SupportTicketResponse>> getUserTickets(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(supportTicketService.getUserTickets(userDetails.getUsername(), page, size, search));
    }

    @GetMapping("/{ticketId}")
    public ResponseEntity<SupportTicketResponse> getUserTicket(
            @PathVariable String ticketId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(supportTicketService.getUserTicket(ticketId, userDetails.getUsername()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<SupportTicketResponse>> createTicket(
            @Valid @RequestBody CreateSupportTicketRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        SupportTicketResponse ticket = supportTicketService.createTicket(userDetails.getUsername(), request);
        return ResponseEntity.ok(ApiResponse.success("Support ticket created", ticket));
    }

    @GetMapping("/{ticketId}/replies")
    public ResponseEntity<List<SupportTicketReplyResponse>> getTicketReplies(
            @PathVariable String ticketId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(supportTicketService.getTicketReplies(ticketId, userDetails.getUsername()));
    }

    @PostMapping("/{ticketId}/replies")
    public ResponseEntity<ApiResponse<SupportTicketReplyResponse>> addReply(
            @PathVariable String ticketId,
            @Valid @RequestBody ReplySupportTicketRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        SupportTicketReplyResponse reply = supportTicketService.addReply(ticketId, userDetails.getUsername(), request);
        return ResponseEntity.ok(ApiResponse.success("Reply added", reply));
    }
}
