package com.devsync.review;

import com.devsync.review.dto.CreateReviewRequest;
import com.devsync.review.dto.ReviewResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

/**
 * Review submission endpoints. The authenticated user id is always taken from
 * the token — never from the request body — so a user cannot create a review
 * for someone else.
 */
@RestController
@RequestMapping("/api/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    @PostMapping
    public ResponseEntity<ReviewResponse> create(
            @Valid @RequestBody CreateReviewRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(reviewService.createReview(userDetails.getUsername(), request));
    }

    @GetMapping("/me")
    public ResponseEntity<ReviewResponse> myReview(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(reviewService.getMyReview(userDetails.getUsername()));
    }

    @PutMapping("/me")
    public ResponseEntity<ReviewResponse> update(
            @Valid @RequestBody CreateReviewRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(reviewService.updateMyReview(userDetails.getUsername(), request));
    }
}
