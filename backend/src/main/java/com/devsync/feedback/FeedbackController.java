package com.devsync.feedback;

import com.devsync.feedback.dto.CreateFeedbackRequest;
import com.devsync.feedback.dto.FeedbackResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Private product feedback. The user id comes from the token — never from the
 * request body. Only the submitting user (and admins) can ever see it.
 */
@RestController
@RequestMapping("/api/feedback")
@RequiredArgsConstructor
public class FeedbackController {

    private final FeedbackService feedbackService;

    @PostMapping
    public ResponseEntity<FeedbackResponse> create(
            @Valid @RequestBody CreateFeedbackRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(feedbackService.create(userDetails.getUsername(), request));
    }

    @GetMapping("/me")
    public ResponseEntity<List<FeedbackResponse>> myFeedback(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(feedbackService.getMyFeedback(userDetails.getUsername()));
    }
}
