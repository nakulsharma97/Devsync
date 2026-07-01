package com.devsync.controller;

import com.devsync.dto.ApiResponse;
import com.devsync.dto.CommentRequest;
import com.devsync.dto.PostRequest;
import com.devsync.entity.Comment;
import com.devsync.entity.Post;
import com.devsync.entity.User;
import com.devsync.service.CommentService;
import com.devsync.service.PostService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/posts")
@RequiredArgsConstructor
public class PostController {

    private final PostService postService;
    private final CommentService commentService;

    @PostMapping
    public ResponseEntity<ApiResponse<Post>> createPost(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody PostRequest request) {
        Post post = postService.createPost(user.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Post created", post));
    }

    @GetMapping("/feed")
    public ResponseEntity<ApiResponse<Page<Post>>> getFeed(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<Post> feed = postService.getFeed(page, size);
        return ResponseEntity.ok(ApiResponse.success(feed));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Post>> getPost(@PathVariable Long id) {
        Post post = postService.getPostById(id);
        return ResponseEntity.ok(ApiResponse.success(post));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deletePost(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        postService.deletePost(id, user.getId());
        return ResponseEntity.ok(ApiResponse.success("Post deleted", null));
    }

    @PostMapping("/{id}/like")
    public ResponseEntity<ApiResponse<Map<String, Object>>> toggleLike(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        boolean liked = postService.toggleLike(id, user.getId());
        long count = postService.getLikeCount(id);
        return ResponseEntity.ok(ApiResponse.success(Map.of("liked", liked, "count", count)));
    }

    @PostMapping("/{postId}/comments")
    public ResponseEntity<ApiResponse<Comment>> addComment(
            @PathVariable Long postId,
            @AuthenticationPrincipal User user,
            @Valid @RequestBody CommentRequest request) {
        Comment comment = commentService.createComment(postId, user.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Comment added", comment));
    }

    @GetMapping("/{postId}/comments")
    public ResponseEntity<ApiResponse<List<Comment>>> getComments(@PathVariable Long postId) {
        List<Comment> comments = commentService.getPostComments(postId);
        return ResponseEntity.ok(ApiResponse.success(comments));
    }
}
