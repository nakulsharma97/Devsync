package com.devsync.feed;

import com.devsync.activity.ActivityService;
import com.devsync.common.ResourceNotFoundException;
import com.devsync.feed.dto.CommentRequest;
import com.devsync.feed.dto.CommentResponse;
import com.devsync.feed.dto.PostRequest;
import com.devsync.feed.dto.PostResponse;
import com.devsync.feed.entity.Comment;
import com.devsync.feed.entity.Post;
import com.devsync.feed.repository.CommentRepository;
import com.devsync.feed.repository.PostLikeRepository;
import com.devsync.feed.entity.PostLike;
import com.devsync.feed.repository.PostRepository;
import com.devsync.user.entity.User;
import com.devsync.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FeedServiceTest {

    @Mock private PostRepository postRepository;
    @Mock private CommentRepository commentRepository;
    @Mock private PostLikeRepository postLikeRepository;
    @Mock private UserRepository userRepository;
    @Mock private com.devsync.bookmark.repository.BookmarkRepository bookmarkRepository;
    @Mock private ActivityService activityService;
    @Mock private com.devsync.attachment.repository.FileAttachmentRepository fileAttachmentRepository;
    @Mock private com.devsync.attachment.FileStorageService fileStorageService;

    @Captor private ArgumentCaptor<Post> postCaptor;

    private FeedService feedService;
    private User testUser;
    private Post testPost;
    private PostRequest postRequest;
    private Comment testComment;
    private CommentRequest commentRequest;

    @BeforeEach
    void setUp() {
        feedService = new FeedService(postRepository, commentRepository, postLikeRepository, userRepository, bookmarkRepository, activityService, fileAttachmentRepository, fileStorageService);

        testUser = User.builder()
                .email("user@example.com")
                .fullName("Test User")
                .username("testuser")
                .avatarUrl("https://avatar.example.com/user-1")
                .bio("A test user")
                .build();
        testUser.setId("user-1");

        // BaseEntity sets id via @GeneratedValue, but for mocks we construct directly
        testPost = Post.builder()
                .userId("user-1")
                .content("Hello DevSync!")
                .imageUrl("https://example.com/image.png")
                .postType("TEXT")
                .build();
        // Set id and timestamps via reflection since BaseEntity uses @GeneratedValue
        testPost.setId("post-1");
        testPost.setCreatedAt(Instant.now());
        testPost.setUpdatedAt(Instant.now());

        testComment = Comment.builder()
                .userId("user-1")
                .postId("post-1")
                .content("Great post!")
                .build();
        testComment.setId("comment-1");
        testComment.setCreatedAt(Instant.now());

        postRequest = new PostRequest();
        postRequest.setContent("Hello DevSync!");
        postRequest.setImageUrl("https://example.com/image.png");
        postRequest.setPostType("TEXT");

        commentRequest = new CommentRequest();
        commentRequest.setContent("Great post!");
    }

    // ── createPost ────────────────────────────────────────────

    @Test
    void createPost_shouldSaveAndReturnPostResponse() {
        when(userRepository.findById("user-1")).thenReturn(Optional.of(testUser));
        when(postRepository.save(any(Post.class))).thenAnswer(invocation -> {
            Post saved = invocation.getArgument(0);
            saved.setId("post-1");
            saved.setCreatedAt(Instant.now());
            saved.setUpdatedAt(Instant.now());
            return saved;
        });
        when(postLikeRepository.countByPostId("post-1")).thenReturn(0L);
        when(commentRepository.countByPostId("post-1")).thenReturn(0L);

        PostResponse response = feedService.createPost("user-1", postRequest);

        assertThat(response).isNotNull();
        assertThat(response.getContent()).isEqualTo("Hello DevSync!");
        assertThat(response.getImageUrl()).isEqualTo("https://example.com/image.png");
        assertThat(response.getPostType()).isEqualTo("TEXT");
        assertThat(response.getLikeCount()).isZero();
        assertThat(response.getCommentCount()).isZero();
        assertThat(response.getUser().getId()).isEqualTo("user-1");
        assertThat(response.getUser().getFullName()).isEqualTo("Test User");

        verify(postRepository).save(postCaptor.capture());
        Post saved = postCaptor.getValue();
        assertThat(saved.getUserId()).isEqualTo("user-1");
        // Content is HTML-escaped but there's nothing to escape, so should be same
        assertThat(saved.getContent()).isEqualTo("Hello DevSync!");
    }

    @Test
    void createPost_shouldSanitizeXssContent() {
        PostRequest xssRequest = new PostRequest();
        xssRequest.setContent("<script>alert(1)</script>");
        xssRequest.setPostType("TEXT");

        when(userRepository.findById("user-1")).thenReturn(Optional.of(testUser));
        when(postRepository.save(any(Post.class))).thenAnswer(invocation -> {
            Post saved = invocation.getArgument(0);
            saved.setId("post-2");
            saved.setCreatedAt(Instant.now());
            saved.setUpdatedAt(Instant.now());
            return saved;
        });
        when(postLikeRepository.countByPostId("post-2")).thenReturn(0L);
        when(commentRepository.countByPostId("post-2")).thenReturn(0L);

        PostResponse response = feedService.createPost("user-1", xssRequest);

        // Verify content is HTML-escaped
        assertThat(response.getContent()).doesNotContain("<script>");
        assertThat(response.getContent()).contains("&lt;script&gt;");
    }

    @Test
    void createPost_shouldDefaultPostTypeToText() {
        PostRequest noTypeRequest = new PostRequest();
        noTypeRequest.setContent("Just text");

        when(userRepository.findById("user-1")).thenReturn(Optional.of(testUser));
        when(postRepository.save(any(Post.class))).thenAnswer(invocation -> {
            Post saved = invocation.getArgument(0);
            saved.setId("post-3");
            saved.setCreatedAt(Instant.now());
            saved.setUpdatedAt(Instant.now());
            return saved;
        });
        when(postLikeRepository.countByPostId("post-3")).thenReturn(0L);
        when(commentRepository.countByPostId("post-3")).thenReturn(0L);

        PostResponse response = feedService.createPost("user-1", noTypeRequest);
        assertThat(response.getPostType()).isEqualTo("TEXT");
    }

    @Test
    void createPost_shouldThrowWhenUserNotFound() {
        when(userRepository.findById("unknown-user")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> feedService.createPost("unknown-user", postRequest))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("User not found with id: unknown-user");

        verify(postRepository, never()).save(any());
    }

    // ── getFeed ───────────────────────────────────────────────

    @Test
    void getFeed_shouldReturnPagedResultsWithBatchLoadedData() {
        Post post2 = Post.builder().userId("user-2").content("Second post").postType("TEXT").build();
        post2.setId("post-2");
        post2.setCreatedAt(Instant.now());
        post2.setUpdatedAt(Instant.now());

        User user2 = User.builder().email("user2@example.com").fullName("User Two").build();
        user2.setId("user-2");

        Page<Post> page = new PageImpl<>(List.of(testPost, post2));
        when(postRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(0, 20))).thenReturn(page);

        // Batch-loading mocks
        when(userRepository.findAllById(Set.of("user-1", "user-2"))).thenReturn(List.of(testUser, user2));
        when(postLikeRepository.countLikesByPostIdIn(Set.of("post-1", "post-2")))
                .thenReturn(List.of(
                        new Object[]{"post-1", 5L},
                        new Object[]{"post-2", 3L}
                ));
        when(commentRepository.countCommentsByPostIdIn(Set.of("post-1", "post-2")))
                .thenReturn(List.of(
                        new Object[]{"post-1", 2L},
                        new Object[]{"post-2", 1L}
                ));

        Page<PostResponse> result = feedService.getFeed(0, 20);

        assertThat(result.getContent()).hasSize(2);

        PostResponse first = result.getContent().get(0);
        assertThat(first.getId()).isEqualTo("post-1");
        assertThat(first.getLikeCount()).isEqualTo(5L);
        assertThat(first.getCommentCount()).isEqualTo(2L);
        assertThat(first.getUser().getFullName()).isEqualTo("Test User");

        PostResponse second = result.getContent().get(1);
        assertThat(second.getId()).isEqualTo("post-2");
        assertThat(second.getLikeCount()).isEqualTo(3L);
        assertThat(second.getCommentCount()).isEqualTo(1L);
        assertThat(second.getUser().getFullName()).isEqualTo("User Two");

        // Verify batch-loading methods were called (not individual countByPostId)
        verify(postLikeRepository).countLikesByPostIdIn(anySet());
        verify(postLikeRepository, never()).countByPostId(anyString());
        verify(commentRepository).countCommentsByPostIdIn(anySet());
        verify(commentRepository, never()).countByPostId(anyString());
    }

    @Test
    void getFeed_shouldReturnEmpty_WhenNoPosts() {
        when(postRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(0, 20)))
                .thenReturn(Page.empty());

        Page<PostResponse> result = feedService.getFeed(0, 20);
        assertThat(result).isEmpty();

        // Should not query anything else when feed is empty
        verify(userRepository, never()).findAllById(anySet());
        verify(postLikeRepository, never()).countLikesByPostIdIn(anySet());
        verify(commentRepository, never()).countCommentsByPostIdIn(anySet());
    }

    @Test
    void getFeed_shouldHandlePostsByDeletedUsers() {
        when(postRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(0, 20)))
                .thenReturn(new PageImpl<>(List.of(testPost)));

        // User not found (deleted account)
        when(userRepository.findAllById(Set.of("user-1"))).thenReturn(List.of());
        when(postLikeRepository.countLikesByPostIdIn(Set.of("post-1"))).thenReturn(List.of());
        when(commentRepository.countCommentsByPostIdIn(Set.of("post-1"))).thenReturn(List.of());

        Page<PostResponse> result = feedService.getFeed(0, 20);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getUser().getFullName()).isEqualTo("Unknown");
        assertThat(result.getContent().get(0).getLikeCount()).isZero();
        assertThat(result.getContent().get(0).getCommentCount()).isZero();
    }

    // ── getPost ───────────────────────────────────────────────

    @Test
    void getPost_shouldReturnPostResponse() {
        when(postRepository.findById("post-1")).thenReturn(Optional.of(testPost));
        when(userRepository.findById("user-1")).thenReturn(Optional.of(testUser));
        when(postLikeRepository.countByPostId("post-1")).thenReturn(5L);
        when(commentRepository.countByPostId("post-1")).thenReturn(3L);

        PostResponse response = feedService.getPost("post-1");

        assertThat(response.getId()).isEqualTo("post-1");
        assertThat(response.getLikeCount()).isEqualTo(5L);
        assertThat(response.getCommentCount()).isEqualTo(3L);
        assertThat(response.getUser().getFullName()).isEqualTo("Test User");
    }

    @Test
    void getPost_shouldThrowWhenNotFound() {
        when(postRepository.findById("nonexistent")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> feedService.getPost("nonexistent"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Post not found with id: nonexistent");
    }

    // ── deletePost ────────────────────────────────────────────

    @Test
    void deletePost_shouldSucceed_WhenOwner() {
        when(postRepository.findById("post-1")).thenReturn(Optional.of(testPost));

        feedService.deletePost("post-1", "user-1");

        verify(commentRepository).deleteByPostId("post-1");
        verify(postRepository).delete(testPost);
    }

    @Test
    void deletePost_shouldThrow_WhenNotOwner() {
        Post otherPost = Post.builder().userId("user-2").content("Other").postType("TEXT").build();
        otherPost.setId("post-1");

        when(postRepository.findById("post-1")).thenReturn(Optional.of(otherPost));

        assertThatThrownBy(() -> feedService.deletePost("post-1", "user-1"))
                .isInstanceOf(com.devsync.common.ForbiddenException.class)
                .hasMessageContaining("author");

        verify(postRepository, never()).delete(any());
    }

    @Test
    void deletePost_shouldThrow_WhenPostNotFound() {
        when(postRepository.findById("ghost")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> feedService.deletePost("ghost", "user-1"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ── toggleLike ────────────────────────────────────────────

    @Test
    void toggleLike_shouldAddLike_WhenNotAlreadyLiked() {
        when(postLikeRepository.existsByUserIdAndPostId("user-1", "post-1")).thenReturn(false);

        boolean result = feedService.toggleLike("post-1", "user-1");

        assertThat(result).isTrue();
        verify(postLikeRepository).save(any(PostLike.class));
        verify(postLikeRepository, never()).deleteByUserIdAndPostId(anyString(), anyString());
    }

    @Test
    void toggleLike_shouldRemoveLike_WhenAlreadyLiked() {
        when(postLikeRepository.existsByUserIdAndPostId("user-1", "post-1")).thenReturn(true);

        boolean result = feedService.toggleLike("post-1", "user-1");

        assertThat(result).isFalse();
        verify(postLikeRepository).deleteByUserIdAndPostId("user-1", "post-1");
        verify(postLikeRepository, never()).save(any());
    }

    // ── getLikeCount ──────────────────────────────────────────

    @Test
    void getLikeCount_shouldReturnCount() {
        when(postLikeRepository.countByPostId("post-1")).thenReturn(7L);

        long count = feedService.getLikeCount("post-1");
        assertThat(count).isEqualTo(7L);
    }

    @Test
    void getLikeCount_shouldReturnZero_WhenNoLikes() {
        when(postLikeRepository.countByPostId("unpopular")).thenReturn(0L);

        assertThat(feedService.getLikeCount("unpopular")).isZero();
    }

    // ── addComment ────────────────────────────────────────────

    @Test
    void addComment_shouldSaveAndReturnCommentResponse() {
        when(postRepository.findById("post-1")).thenReturn(Optional.of(testPost));
        when(userRepository.findById("user-1")).thenReturn(Optional.of(testUser));
        when(commentRepository.save(any(Comment.class))).thenAnswer(invocation -> {
            Comment saved = invocation.getArgument(0);
            saved.setId("comment-1");
            saved.setCreatedAt(Instant.now());
            return saved;
        });

        CommentResponse response = feedService.addComment("post-1", "user-1", commentRequest);

        assertThat(response.getId()).isEqualTo("comment-1");
        assertThat(response.getContent()).isEqualTo("Great post!");
        assertThat(response.getUser().getId()).isEqualTo("user-1");
        assertThat(response.getUser().getFullName()).isEqualTo("Test User");
    }

    @Test
    void addComment_shouldThrow_WhenPostNotFound() {
        when(postRepository.findById("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> feedService.addComment("missing", "user-1", commentRequest))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Post not found with id: missing");

        verify(commentRepository, never()).save(any());
    }

    @Test
    void addComment_shouldThrow_WhenUserNotFound() {
        when(postRepository.findById("post-1")).thenReturn(Optional.of(testPost));
        when(userRepository.findById("ghost-user")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> feedService.addComment("post-1", "ghost-user", commentRequest))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("User not found with id: ghost-user");

        verify(commentRepository, never()).save(any());
    }

    // ── getComments ───────────────────────────────────────────

    @Test
    void getComments_shouldReturnCommentsWithBatchLoadedUsers() {
        User user2 = User.builder().email("user2@example.com").fullName("User Two").username("user2").build();
        user2.setId("user-2");
        Comment c2 = Comment.builder().userId("user-2").postId("post-1").content("Nice!").build();
        c2.setId("comment-2");
        c2.setCreatedAt(Instant.now());

        when(commentRepository.findByPostIdOrderByCreatedAtAsc("post-1"))
                .thenReturn(List.of(testComment, c2));

        // Batch-load authors in one query
        when(userRepository.findAllById(Set.of("user-1", "user-2"))).thenReturn(List.of(testUser, user2));

        List<CommentResponse> comments = feedService.getComments("post-1");

        assertThat(comments).hasSize(2);
        assertThat(comments.get(0).getContent()).isEqualTo("Great post!");
        assertThat(comments.get(0).getUser().getFullName()).isEqualTo("Test User");
        assertThat(comments.get(1).getContent()).isEqualTo("Nice!");
        assertThat(comments.get(1).getUser().getFullName()).isEqualTo("User Two");

        // Verify batch loading: only ONE call to findAllById, NOT N individual findById calls
        verify(userRepository).findAllById(Set.of("user-1", "user-2"));
        verify(userRepository, never()).findById(anyString());
    }

    @Test
    void getComments_shouldReturnEmpty_WhenNoComments() {
        when(commentRepository.findByPostIdOrderByCreatedAtAsc("post-empty"))
                .thenReturn(List.of());

        List<CommentResponse> comments = feedService.getComments("post-empty");
        assertThat(comments).isEmpty();

        verify(userRepository, never()).findAllById(anySet());
        verify(userRepository, never()).findById(anyString());
    }

    @Test
    void getComments_shouldHandleDeletedUsers() {
        Comment orphanComment = Comment.builder().userId("deleted-user").postId("post-1").content("Orphan").build();
        orphanComment.setId("comment-3");
        orphanComment.setCreatedAt(Instant.now());

        when(commentRepository.findByPostIdOrderByCreatedAtAsc("post-1"))
                .thenReturn(List.of(orphanComment));
        when(userRepository.findAllById(Set.of("deleted-user"))).thenReturn(List.of());

        List<CommentResponse> comments = feedService.getComments("post-1");

        assertThat(comments).hasSize(1);
        assertThat(comments.get(0).getUser().getFullName()).isEqualTo("Unknown");
    }

    // ── updatePostImage ───────────────────────────────────────

    @Test
    void updatePostImage_shouldSetImage_WhenAuthor() {
        when(postRepository.findById("post-1")).thenReturn(Optional.of(testPost));
        when(postRepository.save(any(Post.class))).thenAnswer(inv -> inv.getArgument(0));
        when(userRepository.findById("user-1")).thenReturn(Optional.of(testUser));

        PostResponse response = feedService.updatePostImage(
                "post-1", "/api/attachments/att-9/download", "user-1");

        assertThat(testPost.getImageUrl()).isEqualTo("/api/attachments/att-9/download");
        assertThat(response.getImageUrl()).isEqualTo("/api/attachments/att-9/download");
        verify(postRepository).save(testPost);
    }

    @Test
    void updatePostImage_shouldClearImage_WhenBlank() {
        when(postRepository.findById("post-1")).thenReturn(Optional.of(testPost));
        when(postRepository.save(any(Post.class))).thenAnswer(inv -> inv.getArgument(0));
        when(userRepository.findById("user-1")).thenReturn(Optional.of(testUser));

        PostResponse response = feedService.updatePostImage("post-1", "   ", "user-1");

        assertThat(testPost.getImageUrl()).isNull();
        assertThat(response.getImageUrl()).isNull();
    }

    @Test
    void updatePostImage_shouldThrow_WhenNotAuthor() {
        when(postRepository.findById("post-1")).thenReturn(Optional.of(testPost));

        assertThatThrownBy(() -> feedService.updatePostImage(
                "post-1", "/api/attachments/att-9/download", "user-2"))
                .isInstanceOf(com.devsync.common.ForbiddenException.class)
                .hasMessageContaining("author");
        verify(postRepository, never()).save(any());
    }

    @Test
    void updatePostImage_shouldThrow_WhenPostNotFound() {
        when(postRepository.findById("ghost")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> feedService.updatePostImage("ghost", null, "user-1"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ── updatePost ────────────────────────────────────────────

    @Test
    void updatePost_shouldUpdateContent_WhenAuthor() {
        when(postRepository.findById("post-1")).thenReturn(Optional.of(testPost));
        when(postRepository.save(any(Post.class))).thenAnswer(inv -> inv.getArgument(0));
        when(userRepository.findById("user-1")).thenReturn(Optional.of(testUser));
        when(postLikeRepository.countByPostId("post-1")).thenReturn(2L);
        when(commentRepository.countByPostId("post-1")).thenReturn(3L);

        PostRequest edit = new PostRequest();
        edit.setContent("Edited content");

        PostResponse response = feedService.updatePost("post-1", "user-1", edit);

        assertThat(testPost.getContent()).isEqualTo("Edited content");
        assertThat(response.getId()).isEqualTo("post-1"); // id preserved, no duplicate
        assertThat(response.getContent()).isEqualTo("Edited content");
        assertThat(response.getLikeCount()).isEqualTo(2L);
        assertThat(response.getCommentCount()).isEqualTo(3L);
        verify(postRepository, times(1)).save(testPost);
    }

    @Test
    void updatePost_shouldThrow403_WhenNotAuthor() {
        when(postRepository.findById("post-1")).thenReturn(Optional.of(testPost));

        PostRequest edit = new PostRequest();
        edit.setContent("Hijacked edit");

        assertThatThrownBy(() -> feedService.updatePost("post-1", "user-2", edit))
                .isInstanceOf(com.devsync.common.ForbiddenException.class)
                .hasMessageContaining("author");
        verify(postRepository, never()).save(any());
    }

    @Test
    void updatePost_shouldThrow_WhenPostNotFound() {
        when(postRepository.findById("ghost")).thenReturn(Optional.empty());

        PostRequest edit = new PostRequest();
        edit.setContent("x");

        assertThatThrownBy(() -> feedService.updatePost("ghost", "user-1", edit))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ── deletePost (403 + attachment cleanup) ─────────────────

    @Test
    void deletePost_shouldRemoveAttachedImage_WhenPostHasImage() throws Exception {
        when(postRepository.findById("post-1")).thenReturn(Optional.of(testPost));
        var att = com.devsync.attachment.entity.FileAttachment.builder()
                .uploaderId("user-1")
                .contextType(com.devsync.attachment.entity.AttachmentContext.POST)
                .contextId("post-1")
                .originalName("photo.png")
                .storedName("stored-photo.png")
                .contentType("image/png")
                .size(100)
                .url("/api/attachments/att-1/download")
                .build();
        att.setId("att-1");
        when(fileAttachmentRepository.findByContextTypeAndContextId(
                com.devsync.attachment.entity.AttachmentContext.POST, "post-1"))
                .thenReturn(java.util.List.of(att));
        when(fileStorageService.resolve("stored-photo.png")).thenReturn(java.nio.file.Path.of("/tmp/stored-photo.png"));

        feedService.deletePost("post-1", "user-1");

        verify(fileAttachmentRepository).delete(att);
        verify(commentRepository).deleteByPostId("post-1");
        verify(postRepository).delete(testPost);
    }

    @Test
    void deletePost_shouldReturn403_WhenNotOwner() {
        Post otherPost = Post.builder().userId("user-2").content("Other").postType("TEXT").build();
        otherPost.setId("post-1");
        when(postRepository.findById("post-1")).thenReturn(Optional.of(otherPost));

        assertThatThrownBy(() -> feedService.deletePost("post-1", "user-1"))
                .isInstanceOf(com.devsync.common.ForbiddenException.class)
                .hasMessageContaining("author");
        verify(postRepository, never()).delete(any());
        verify(fileAttachmentRepository, never()).delete(any());
    }

    // ── deleteComment ─────────────────────────────────────────

    @Test
    void deleteComment_shouldSucceed_WhenCommentAuthor() {
        when(commentRepository.findById("comment-1")).thenReturn(Optional.of(testComment));
        when(postRepository.findById("post-1")).thenReturn(Optional.of(testPost));

        feedService.deleteComment("comment-1", "user-1");

        verify(commentRepository).delete(testComment);
    }

    @Test
    void deleteComment_shouldSucceed_WhenPostOwner() {
        // Post owner is user-1; comment author is user-2.
        Comment otherComment = Comment.builder().userId("user-2").postId("post-1").content("Mine").build();
        otherComment.setId("comment-2");
        when(commentRepository.findById("comment-2")).thenReturn(Optional.of(otherComment));
        when(postRepository.findById("post-1")).thenReturn(Optional.of(testPost));

        feedService.deleteComment("comment-2", "user-1");

        verify(commentRepository).delete(otherComment);
    }

    @Test
    void deleteComment_shouldThrow403_WhenNeitherAuthorNorPostOwner() {
        // Comment by user-2 on user-1's post; user-3 tries to delete it.
        Comment otherComment = Comment.builder().userId("user-2").postId("post-1").content("Mine").build();
        otherComment.setId("comment-2");
        when(commentRepository.findById("comment-2")).thenReturn(Optional.of(otherComment));
        when(postRepository.findById("post-1")).thenReturn(Optional.of(testPost));

        assertThatThrownBy(() -> feedService.deleteComment("comment-2", "user-3"))
                .isInstanceOf(com.devsync.common.ForbiddenException.class)
                .hasMessageContaining("comment author");
        verify(commentRepository, never()).delete(any());
    }

    @Test
    void deleteComment_shouldThrow_WhenCommentNotFound() {
        when(commentRepository.findById("ghost")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> feedService.deleteComment("ghost", "user-1"))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(commentRepository, never()).delete(any());
    }

    // ── getPostsByUser ────────────────────────────────────────

    @Test
    void getPostsByUser_shouldReturnOnlyThatUsersPosts() {
        Page<Post> page = new PageImpl<>(List.of(testPost), PageRequest.of(0, 20), 1);
        when(postRepository.findByUserIdOrderByCreatedAtDesc("user-1", PageRequest.of(0, 20)))
                .thenReturn(page);
        when(userRepository.findById("user-1")).thenReturn(Optional.of(testUser));
        when(postLikeRepository.countLikesByPostIdIn(Set.of("post-1"))).thenReturn(List.of());
        when(commentRepository.countCommentsByPostIdIn(Set.of("post-1"))).thenReturn(List.of());

        Page<PostResponse> result = feedService.getPostsByUser("user-1", 0, 20);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getId()).isEqualTo("post-1");
        assertThat(result.getContent().get(0).getUser().getUsername()).isEqualTo("testuser");
        verify(postRepository).findByUserIdOrderByCreatedAtDesc("user-1", PageRequest.of(0, 20));
    }

    @Test
    void getPostsByUser_shouldReturnEmptyPage_WhenNoVisiblePosts() {
        Post hidden = Post.builder().userId("user-1").content("Hidden").postType("TEXT").build();
        hidden.setId("post-2");
        hidden.setHidden(true);
        Page<Post> page = new PageImpl<>(List.of(hidden), PageRequest.of(0, 20), 1);
        when(postRepository.findByUserIdOrderByCreatedAtDesc("user-1", PageRequest.of(0, 20)))
                .thenReturn(page);

        Page<PostResponse> result = feedService.getPostsByUser("user-1", 0, 20);

        assertThat(result.getContent()).isEmpty();
        verify(postRepository, never()).findAllById(any());
    }
}
