package com.devsync.feed;

import com.devsync.common.ApiResponse;
import com.devsync.feed.dto.CommentRequest;
import com.devsync.feed.dto.CommentResponse;
import com.devsync.feed.dto.PostRequest;
import com.devsync.feed.dto.PostResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/posts")
@RequiredArgsConstructor
public class FeedController {

    private final FeedService feedService;

    @PostMapping
    public ResponseEntity<ApiResponse<PostResponse>> createPost(
            @Valid @RequestBody PostRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        PostResponse post = feedService.createPost(userDetails.getUsername(), request);
        return ResponseEntity.ok(ApiResponse.success("Post created", post));
    }

    @GetMapping("/feed")
    public ResponseEntity<ApiResponse<Page<PostResponse>>> getFeed(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<PostResponse> feed = feedService.getFeed(page, size);
        return ResponseEntity.ok(ApiResponse.success(feed));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PostResponse>> getPost(@PathVariable String id) {
        PostResponse post = feedService.getPost(id);
        return ResponseEntity.ok(ApiResponse.success(post));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deletePost(
            @PathVariable String id,
            @AuthenticationPrincipal UserDetails userDetails) {
        feedService.deletePost(id, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success("Post deleted", null));
    }

    @PostMapping("/{id}/like")
    public ResponseEntity<ApiResponse<Map<String, Object>>> toggleLike(
            @PathVariable String id,
            @AuthenticationPrincipal UserDetails userDetails) {
        boolean liked = feedService.toggleLike(id, userDetails.getUsername());
        long count = feedService.getLikeCount(id);
        return ResponseEntity.ok(ApiResponse.success(Map.of("liked", liked, "count", count)));
    }

    @PostMapping("/{postId}/comments")
    public ResponseEntity<ApiResponse<CommentResponse>> addComment(
            @PathVariable String postId,
            @Valid @RequestBody CommentRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        CommentResponse comment = feedService.addComment(postId, userDetails.getUsername(), request);
        return ResponseEntity.ok(ApiResponse.success("Comment added", comment));
    }

    @GetMapping("/{postId}/comments")
    public ResponseEntity<ApiResponse<List<CommentResponse>>> getComments(@PathVariable String postId) {
        List<CommentResponse> comments = feedService.getComments(postId);
        return ResponseEntity.ok(ApiResponse.success(comments));
    }
}
