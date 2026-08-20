package com.devsync.feed;

import com.devsync.activity.ActivityService;
import com.devsync.activity.entity.ActivityType;
import com.devsync.attachment.FileStorageService;
import com.devsync.attachment.entity.AttachmentContext;
import com.devsync.attachment.repository.FileAttachmentRepository;
import com.devsync.common.ForbiddenException;
import com.devsync.common.ResourceNotFoundException;
import com.devsync.feed.dto.CommentRequest;
import com.devsync.feed.dto.CommentResponse;
import com.devsync.feed.dto.PostRequest;
import com.devsync.feed.dto.PostResponse;
import com.devsync.bookmark.repository.BookmarkRepository;
import com.devsync.feed.entity.Comment;
import com.devsync.feed.entity.Post;
import com.devsync.feed.entity.PostLike;
import com.devsync.feed.repository.CommentRepository;
import com.devsync.feed.repository.PostLikeRepository;
import com.devsync.feed.repository.PostRepository;
import com.devsync.user.entity.User;
import com.devsync.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import java.nio.file.Files;
import java.nio.file.Path;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class FeedService {

    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final PostLikeRepository postLikeRepository;
    private final UserRepository userRepository;
    private final BookmarkRepository bookmarkRepository;
    private final ActivityService activityService;
    private final FileAttachmentRepository fileAttachmentRepository;
    private final FileStorageService fileStorageService;

    @Transactional
    public PostResponse createPost(String userId, PostRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
        // Content is NOT escaped here — React auto-escapes in JSX by default,
        // which is safe for plain-text rendering and avoids double-escaping on
        // the frontend (e.g. "a < b" displaying as literal "a &lt; b").
        Post post = Post.builder()
                .userId(userId).content(request.getContent()).imageUrl(request.getImageUrl())
                .postType(request.getPostType() != null ? request.getPostType() : "TEXT").build();
        post = postRepository.save(post);
        activityService.record(userId, null, ActivityType.POST_CREATED,
                "Post created", snippet(post.getContent()), null);
        return toPostResponse(post, user);
    }

    @Transactional(readOnly = true)
    public Page<PostResponse> getFeed(int page, int size) {
        return getFeed(page, size, null);
    }

    @Transactional(readOnly = true)
    public Page<PostResponse> getFeed(int page, int size, String currentUserId) {
        // Filter hidden posts at the query level so that totalElements/
        // totalPages in the Page metadata reflect the true count.
        Page<Post> posts = postRepository.findByHiddenFalseOrderByCreatedAtDesc(PageRequest.of(page, size));
        List<Post> visible = posts.getContent();
        if (visible.isEmpty()) return Page.empty();

        Set<String> postIds = visible.stream().map(Post::getId).collect(Collectors.toSet());

        // Batch-load users (fixes N+1 user queries)
        Set<String> userIds = visible.stream().map(Post::getUserId).collect(Collectors.toSet());
        Map<String, User> userMap = userIds.isEmpty() ? Collections.emptyMap()
                : userRepository.findAllById(userIds).stream().collect(Collectors.toMap(User::getId, u -> u));

        // Batch-load like counts
        Map<String, Long> likeCounts = postLikeRepository.countLikesByPostIdIn(postIds).stream()
                .collect(Collectors.toMap(row -> (String) row[0], row -> (Long) row[1]));

        // Batch-load comment counts
        Map<String, Long> commentCounts = commentRepository.countCommentsByPostIdIn(postIds).stream()
                .collect(Collectors.toMap(row -> (String) row[0], row -> (Long) row[1]));

        // Batch-load bookmark status for the authenticated user
        Set<String> bookmarkedPostIds = (currentUserId != null && !postIds.isEmpty())
                ? bookmarkRepository.findByUserIdAndEntityTypeInAndEntityIdIn(
                        currentUserId, java.util.List.of("POST"), postIds).stream()
                        .map(b -> b.getEntityId()).collect(Collectors.toSet())
                : Collections.emptySet();

        return new org.springframework.data.domain.PageImpl<>(visible.stream()
                .map(post -> toPostResponseWithCounts(
                        post,
                        userMap.get(post.getUserId()),
                        likeCounts.getOrDefault(post.getId(), 0L),
                        commentCounts.getOrDefault(post.getId(), 0L),
                        bookmarkedPostIds.contains(post.getId())))
                .toList(), posts.getPageable(), posts.getTotalElements());
    }

    @Transactional(readOnly = true)
    public PostResponse getPost(String postId) {
        Post post = postRepository.findById(postId).orElseThrow(() -> new ResourceNotFoundException("Post", postId));
        if (post.isHidden()) throw new ResourceNotFoundException("Post", postId);
        User user = userRepository.findById(post.getUserId()).orElse(null);
        return toPostResponse(post, user);
    }

    @Transactional
    public void deletePost(String postId, String userId) {
        Post post = postRepository.findById(postId).orElseThrow(() -> new ResourceNotFoundException("Post", postId));
        if (!post.getUserId().equals(userId)) {
            // Security: ownership is derived from the authenticated user — never
            // from a client-supplied userId. 403, not a generic 400.
            throw new ForbiddenException("Only the post author can delete this post");
        }
        // Remove the post's uploaded image (attachment row + stored file) so we
        // don't orphan files; comments/likes go with the post.
        fileAttachmentRepository.findByContextTypeAndContextId(AttachmentContext.POST, postId)
                .forEach(att -> {
                    try {
                        Path path = fileStorageService.resolve(att.getStoredName());
                        Files.deleteIfExists(path);
                    } catch (Exception e) {
                        log.warn("Could not remove stored file for attachment {}: {}", att.getId(), e.getMessage());
                    }
                    fileAttachmentRepository.delete(att);
                });
        commentRepository.deleteByPostId(postId);
        postRepository.delete(post);
    }

    /**
     * Updates an existing post's content. Author-only: the authenticated user
     * must own the post (403 otherwise). The post id is preserved — this never
     * creates a duplicate. The edited timestamp is refreshed automatically by
     * the entity's {@code @LastModifiedDate} auditing.
     */
    @Transactional
    public PostResponse updatePost(String postId, String userId, PostRequest request) {
        Post post = postRepository.findById(postId).orElseThrow(() -> new ResourceNotFoundException("Post", postId));
        if (!post.getUserId().equals(userId)) {
            throw new ForbiddenException("Only the post author can edit this post");
        }
        // See createPost() for why content is stored unescaped.
        post.setContent(request.getContent());
        post = postRepository.save(post);
        User user = userRepository.findById(post.getUserId()).orElse(null);
        return toPostResponse(post, user);
    }

    /**
     * Sets (or clears) the image on an existing post. Author-only: the post's
     * image is attached via the existing attachment system AFTER the post exists
     * (upload authorization requires the post id), then this endpoint records the
     * returned attachment URL on the post.
     */
    @Transactional
    public PostResponse updatePostImage(String postId, String imageUrl, String userId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Post", postId));
        if (!post.getUserId().equals(userId)) {
            throw new ForbiddenException("Only the post author can change its image");
        }
        // See createPost() for why content is stored unescaped.
        post.setImageUrl(imageUrl != null && !imageUrl.isBlank()
                ? imageUrl.trim()
                : null);
        post = postRepository.save(post);
        User user = userRepository.findById(post.getUserId()).orElse(null);
        return toPostResponse(post, user);
    }

    @Transactional
    public boolean toggleLike(String postId, String userId) {
        if (postLikeRepository.existsByUserIdAndPostId(userId, postId)) {
            postLikeRepository.deleteByUserIdAndPostId(userId, postId);
            return false;
        } else {
            postLikeRepository.save(PostLike.builder().userId(userId).postId(postId).build());
            return true;
        }
    }

    @Transactional(readOnly = true)
    public long getLikeCount(String postId) { return postLikeRepository.countByPostId(postId); }

    @Transactional
    public CommentResponse addComment(String postId, String userId, CommentRequest request) {
        postRepository.findById(postId).orElseThrow(() -> new ResourceNotFoundException("Post", postId));
        User user = userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User", userId));
        Comment comment = commentRepository.save(Comment.builder().userId(userId).postId(postId).content(request.getContent()).build());
        activityService.record(userId, null, ActivityType.COMMENT_ADDED,
                "Comment added", snippet(comment.getContent()), null);
        return toCommentResponse(comment, user);
    }

    /**
     * Deletes a comment. Authorized when the authenticated user is the comment
     * author OR the owner of the post the comment belongs to. Anyone else gets
     * 403 — the ownership is derived from the JWT principal, never from a
     * client-supplied userId.
     */
    @Transactional
    public void deleteComment(String commentId, String userId) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comment", commentId));
        Post post = postRepository.findById(comment.getPostId())
                .orElseThrow(() -> new ResourceNotFoundException("Post", comment.getPostId()));
        boolean isAuthor = comment.getUserId().equals(userId);
        boolean isPostOwner = post.getUserId().equals(userId);
        if (!isAuthor && !isPostOwner) {
            throw new ForbiddenException("Only the comment author or the post owner can delete this comment");
        }
        commentRepository.delete(comment);
    }

    /**
     * Posts authored by a specific user (for the "My Posts" page and public
     * profile post lists). Hidden posts are always excluded.
     */
    @Transactional(readOnly = true)
    public Page<PostResponse> getPostsByUser(String userId, int page, int size) {
        return getPostsByUser(userId, page, size, null);
    }

    @Transactional(readOnly = true)
    public Page<PostResponse> getPostsByUser(String userId, int page, int size, String currentUserId) {
        // Filter hidden posts at the query level so that totalElements/
        // totalPages in the Page metadata reflect the true count.
        Page<Post> posts = postRepository.findByUserIdAndHiddenFalseOrderByCreatedAtDesc(userId, PageRequest.of(page, size));
        List<Post> visible = posts.getContent();
        if (visible.isEmpty()) return Page.empty();

        Set<String> postIds = visible.stream().map(Post::getId).collect(Collectors.toSet());
        Map<String, User> userMap = userRepository.findById(userId).stream()
                .collect(Collectors.toMap(User::getId, u -> u));
        Map<String, Long> likeCounts = postLikeRepository.countLikesByPostIdIn(postIds).stream()
                .collect(Collectors.toMap(row -> (String) row[0], row -> (Long) row[1]));
        Map<String, Long> commentCounts = commentRepository.countCommentsByPostIdIn(postIds).stream()
                .collect(Collectors.toMap(row -> (String) row[0], row -> (Long) row[1]));

        Set<String> bookmarkedPostIds = (currentUserId != null && !postIds.isEmpty())
                ? bookmarkRepository.findByUserIdAndEntityTypeInAndEntityIdIn(
                        currentUserId, java.util.List.of("POST"), postIds).stream()
                        .map(b -> b.getEntityId()).collect(Collectors.toSet())
                : Collections.emptySet();

        return new org.springframework.data.domain.PageImpl<>(visible.stream()
                .map(post -> toPostResponseWithCounts(
                        post,
                        userMap.get(post.getUserId()),
                        likeCounts.getOrDefault(post.getId(), 0L),
                        commentCounts.getOrDefault(post.getId(), 0L),
                        bookmarkedPostIds.contains(post.getId())))
                .toList(), posts.getPageable(), posts.getTotalElements());
    }

    @Transactional(readOnly = true)
    public List<CommentResponse> getComments(String postId) {
        List<Comment> comments = commentRepository.findByPostIdOrderByCreatedAtAsc(postId).stream()
                .filter(c -> !c.isHidden())
                .toList();
        if (comments.isEmpty()) return List.of();

        // Batch-load all comment authors (fixes remaining N+1 queries)
        Set<String> userIds = comments.stream().map(Comment::getUserId).collect(Collectors.toSet());
        Map<String, User> userMap = userIds.isEmpty() ? Collections.emptyMap()
                : userRepository.findAllById(userIds).stream().collect(Collectors.toMap(User::getId, u -> u));

        return comments.stream()
                .map(c -> toCommentResponse(c, userMap.get(c.getUserId())))
                .toList();
    }

    private PostResponse toPostResponseWithCounts(Post post, User user, long likeCount, long commentCount) {
        return toPostResponseWithCounts(post, user, likeCount, commentCount, false);
    }

    private PostResponse toPostResponseWithCounts(Post post, User user, long likeCount, long commentCount, boolean bookmarked) {
        PostResponse.UserInfo userInfo = user != null
                ? PostResponse.UserInfo.builder().id(user.getId()).fullName(user.getFullName()).username(user.getUsername()).avatarUrl(user.getAvatarUrl()).build()
                : PostResponse.UserInfo.builder().id(post.getUserId()).fullName("Unknown").build();
        return PostResponse.builder()
                .id(post.getId()).content(post.getContent()).imageUrl(post.getImageUrl()).postType(post.getPostType())
                .likeCount(likeCount).commentCount(commentCount).isBookmarked(bookmarked)
                .createdAt(post.getCreatedAt()).updatedAt(post.getUpdatedAt()).user(userInfo)
                .build();
    }

    private PostResponse toPostResponse(Post post, User user) {
        // Reuse the batch-counting infrastructure to avoid N+1 queries.
        // For a single post, we still use the batch method with a singleton set.
        Set<String> postIds = Set.of(post.getId());
        Map<String, Long> likeCounts = postLikeRepository.countLikesByPostIdIn(postIds).stream()
                .collect(Collectors.toMap(row -> (String) row[0], row -> (Long) row[1]));
        Map<String, Long> commentCounts = commentRepository.countCommentsByPostIdIn(postIds).stream()
                .collect(Collectors.toMap(row -> (String) row[0], row -> (Long) row[1]));
        return toPostResponseWithCounts(
                post, user,
                likeCounts.getOrDefault(post.getId(), 0L),
                commentCounts.getOrDefault(post.getId(), 0L));
    }

    private String snippet(String content) {
        if (content == null) return "";
        String trimmed = content.trim().replaceAll("\\s+", " ");
        return trimmed.length() > 80 ? trimmed.substring(0, 80) + "..." : trimmed;
    }

    private CommentResponse toCommentResponse(Comment comment, User user) {
        PostResponse.UserInfo userInfo = user != null
                ? PostResponse.UserInfo.builder().id(user.getId()).fullName(user.getFullName()).username(user.getUsername()).avatarUrl(user.getAvatarUrl()).build()
                : PostResponse.UserInfo.builder().id(comment.getUserId()).fullName("Unknown").build();
        return CommentResponse.builder()
                .id(comment.getId()).content(comment.getContent()).createdAt(comment.getCreatedAt()).user(userInfo)
                .build();
    }
}
