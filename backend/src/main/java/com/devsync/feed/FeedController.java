package com.devsync.feed;

import com.devsync.common.ApiResponse;
import com.devsync.feed.dto.CommentRequest;
import com.devsync.feed.dto.CommentResponse;
import com.devsync.feed.dto.PostRequest;
import com.devsync.feed.dto.PostResponse;
import com.devsync.feed.dto.UpdatePostImageRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

// Note: The frontend calls /api/posts/* endpoints, so we keep this path even though
// the README documents /api/feed. Both paths work — the service layer is the same.
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
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal UserDetails userDetails) {
        String userId = userDetails != null ? userDetails.getUsername() : null;
        Page<PostResponse> feed = feedService.getFeed(page, size, userId);
        return ResponseEntity.ok(ApiResponse.success(feed));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PostResponse>> getPost(@PathVariable String id) {
        PostResponse post = feedService.getPost(id);
        return ResponseEntity.ok(ApiResponse.success(post));
    }

    /**
     * Updates a post's content. Author-only — the authenticated user must own
     * the post (403 otherwise). Preserves the post id; never duplicates.
     */
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<PostResponse>> updatePost(
            @PathVariable String id,
            @Valid @RequestBody PostRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        PostResponse post = feedService.updatePost(id, userDetails.getUsername(), request);
        return ResponseEntity.ok(ApiResponse.success("Post updated", post));
    }

    /**
     * Sets or clears the image on an existing post (author-only). The image is
     * uploaded first via the attachment system, then this endpoint records the
     * returned attachment URL on the post.
     */
    @PutMapping("/{id}/image")
    public ResponseEntity<ApiResponse<PostResponse>> updatePostImage(
            @PathVariable String id,
            @RequestBody UpdatePostImageRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        PostResponse post = feedService.updatePostImage(id, request.getImageUrl(), userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success("Post image updated", post));
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

    /**
     * Deletes a comment. The authenticated user must be the comment author OR
     * the owner of the post — otherwise 403.
     */
    @DeleteMapping("/comments/{commentId}")
    public ResponseEntity<ApiResponse<Void>> deleteComment(
            @PathVariable String commentId,
            @AuthenticationPrincipal UserDetails userDetails) {
        feedService.deleteComment(commentId, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success("Comment deleted", null));
    }

    /** Posts authored by a specific user (My Posts page, profile post lists). */
    @GetMapping("/user/{userId}")
    public ResponseEntity<ApiResponse<Page<PostResponse>>> getPostsByUser(
            @PathVariable String userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal UserDetails userDetails) {
        String currentUserId = userDetails != null ? userDetails.getUsername() : null;
        Page<PostResponse> posts = feedService.getPostsByUser(userId, page, size, currentUserId);
        return ResponseEntity.ok(ApiResponse.success(posts));
    }
}
