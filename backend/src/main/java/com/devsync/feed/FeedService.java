package com.devsync.feed;

import com.devsync.common.ResourceNotFoundException;
import com.devsync.feed.dto.CommentRequest;
import com.devsync.feed.dto.CommentResponse;
import com.devsync.feed.dto.PostRequest;
import com.devsync.feed.dto.PostResponse;
import com.devsync.feed.entity.Comment;
import com.devsync.feed.entity.Post;
import com.devsync.feed.entity.PostLike;
import com.devsync.feed.repository.CommentRepository;
import com.devsync.feed.repository.PostLikeRepository;
import com.devsync.feed.repository.PostRepository;
import com.devsync.user.entity.User;
import com.devsync.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class FeedService {

    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final PostLikeRepository postLikeRepository;
    private final UserRepository userRepository;

    // ── Posts ──────────────────────────────────────────────────

    @Transactional
    public PostResponse createPost(String userId, PostRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        Post post = Post.builder()
                .userId(userId)
                .content(request.getContent())
                .imageUrl(request.getImageUrl())
                .postType(request.getPostType() != null ? request.getPostType() : "TEXT")
                .build();

        post = postRepository.save(post);
        return toPostResponse(post, user);
    }

    @Transactional(readOnly = true)
    public Page<PostResponse> getFeed(int page, int size) {
        Page<Post> posts = postRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(page, size));
        return posts.map(this::toPostResponse);
    }

    @Transactional(readOnly = true)
    public PostResponse getPost(String postId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Post", postId));
        return toPostResponse(post);
    }

    @Transactional
    public void deletePost(String postId, String userId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Post", postId));
        if (!post.getUserId().equals(userId)) {
            throw new IllegalArgumentException("You don't have permission to delete this post");
        }
        commentRepository.deleteByPostId(postId);
        postRepository.delete(post);
    }

    @Transactional
    public boolean toggleLike(String postId, String userId) {
        if (postLikeRepository.existsByUserIdAndPostId(userId, postId)) {
            postLikeRepository.deleteByUserIdAndPostId(userId, postId);
            return false;
        } else {
            PostLike like = PostLike.builder()
                    .userId(userId)
                    .postId(postId)
                    .build();
            postLikeRepository.save(like);
            return true;
        }
    }

    @Transactional(readOnly = true)
    public long getLikeCount(String postId) {
        return postLikeRepository.countByPostId(postId);
    }

    // ── Comments ───────────────────────────────────────────────

    @Transactional
    public CommentResponse addComment(String postId, String userId, CommentRequest request) {
        postRepository.findById(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Post", postId));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        Comment comment = Comment.builder()
                .userId(userId)
                .postId(postId)
                .content(request.getContent())
                .build();

        comment = commentRepository.save(comment);
        return toCommentResponse(comment, user);
    }

    @Transactional(readOnly = true)
    public List<CommentResponse> getComments(String postId) {
        return commentRepository.findByPostIdOrderByCreatedAtAsc(postId).stream()
                .map(comment -> {
                    User user = userRepository.findById(comment.getUserId()).orElse(null);
                    return toCommentResponse(comment, user);
                })
                .toList();
    }

    // ── Response builders ──────────────────────────────────────

    private PostResponse toPostResponse(Post post) {
        User user = userRepository.findById(post.getUserId()).orElse(null);
        return toPostResponse(post, user);
    }

    private PostResponse toPostResponse(Post post, User user) {
        PostResponse.UserInfo userInfo = user != null
                ? PostResponse.UserInfo.builder()
                        .id(user.getId())
                        .fullName(user.getFullName())
                        .email(user.getEmail())
                        .username(user.getUsername())
                        .avatarUrl(user.getAvatarUrl())
                        .build()
                : PostResponse.UserInfo.builder()
                        .id(post.getUserId())
                        .fullName("Unknown")
                        .email("")
                        .build();

        return PostResponse.builder()
                .id(post.getId())
                .content(post.getContent())
                .imageUrl(post.getImageUrl())
                .postType(post.getPostType())
                .likeCount(postLikeRepository.countByPostId(post.getId()))
                .commentCount(commentRepository.countByPostId(post.getId()))
                .createdAt(post.getCreatedAt())
                .updatedAt(post.getUpdatedAt())
                .user(userInfo)
                .build();
    }

    private CommentResponse toCommentResponse(Comment comment, User user) {
        PostResponse.UserInfo userInfo = user != null
                ? PostResponse.UserInfo.builder()
                        .id(user.getId())
                        .fullName(user.getFullName())
                        .email(user.getEmail())
                        .username(user.getUsername())
                        .avatarUrl(user.getAvatarUrl())
                        .build()
                : PostResponse.UserInfo.builder()
                        .id(comment.getUserId())
                        .fullName("Unknown")
                        .email("")
                        .build();

        return CommentResponse.builder()
                .id(comment.getId())
                .content(comment.getContent())
                .createdAt(comment.getCreatedAt())
                .user(userInfo)
                .build();
    }
}
