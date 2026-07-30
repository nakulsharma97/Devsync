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

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.web.util.HtmlUtils;

@Service
@RequiredArgsConstructor
public class FeedService {

    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final PostLikeRepository postLikeRepository;
    private final UserRepository userRepository;

    @Transactional
    public PostResponse createPost(String userId, PostRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
        String sanitizedContent = HtmlUtils.htmlEscape(request.getContent());
        String sanitizedImageUrl = request.getImageUrl() != null
                ? HtmlUtils.htmlEscape(request.getImageUrl())
                : null;
        Post post = Post.builder()
                .userId(userId).content(sanitizedContent).imageUrl(sanitizedImageUrl)
                .postType(request.getPostType() != null ? request.getPostType() : "TEXT").build();
        post = postRepository.save(post);
        return toPostResponse(post, user);
    }

    @Transactional(readOnly = true)
    public Page<PostResponse> getFeed(int page, int size) {
        Page<Post> posts = postRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(page, size));
        if (posts.isEmpty()) return Page.empty();

        Set<String> postIds = posts.getContent().stream().map(Post::getId).collect(Collectors.toSet());

        // Batch-load users (fixes N+1 user queries)
        Set<String> userIds = posts.getContent().stream().map(Post::getUserId).collect(Collectors.toSet());
        Map<String, User> userMap = userIds.isEmpty() ? Collections.emptyMap()
                : userRepository.findAllById(userIds).stream().collect(Collectors.toMap(User::getId, u -> u));

        // Batch-load like counts
        Map<String, Long> likeCounts = postLikeRepository.countLikesByPostIdIn(postIds).stream()
                .collect(Collectors.toMap(row -> (String) row[0], row -> (Long) row[1]));

        // Batch-load comment counts
        Map<String, Long> commentCounts = commentRepository.countCommentsByPostIdIn(postIds).stream()
                .collect(Collectors.toMap(row -> (String) row[0], row -> (Long) row[1]));

        return posts.map(post -> toPostResponseWithCounts(
                post,
                userMap.get(post.getUserId()),
                likeCounts.getOrDefault(post.getId(), 0L),
                commentCounts.getOrDefault(post.getId(), 0L)));
    }

    @Transactional(readOnly = true)
    public PostResponse getPost(String postId) {
        Post post = postRepository.findById(postId).orElseThrow(() -> new ResourceNotFoundException("Post", postId));
        User user = userRepository.findById(post.getUserId()).orElse(null);
        return toPostResponse(post, user);
    }

    @Transactional
    public void deletePost(String postId, String userId) {
        Post post = postRepository.findById(postId).orElseThrow(() -> new ResourceNotFoundException("Post", postId));
        if (!post.getUserId().equals(userId)) throw new IllegalArgumentException("Cannot delete this post");
        commentRepository.deleteByPostId(postId);
        postRepository.delete(post);
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
        return toCommentResponse(comment, user);
    }

    @Transactional(readOnly = true)
    public List<CommentResponse> getComments(String postId) {
        List<Comment> comments = commentRepository.findByPostIdOrderByCreatedAtAsc(postId);
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
        PostResponse.UserInfo userInfo = user != null
                ? PostResponse.UserInfo.builder().id(user.getId()).fullName(user.getFullName()).email(user.getEmail()).username(user.getUsername()).avatarUrl(user.getAvatarUrl()).build()
                : PostResponse.UserInfo.builder().id(post.getUserId()).fullName("Unknown").email("").build();
        return PostResponse.builder()
                .id(post.getId()).content(post.getContent()).imageUrl(post.getImageUrl()).postType(post.getPostType())
                .likeCount(likeCount).commentCount(commentCount)
                .createdAt(post.getCreatedAt()).updatedAt(post.getUpdatedAt()).user(userInfo)
                .build();
    }

    private PostResponse toPostResponse(Post post, User user) {
        PostResponse.UserInfo userInfo = user != null
                ? PostResponse.UserInfo.builder().id(user.getId()).fullName(user.getFullName()).email(user.getEmail()).username(user.getUsername()).avatarUrl(user.getAvatarUrl()).build()
                : PostResponse.UserInfo.builder().id(post.getUserId()).fullName("Unknown").email("").build();
        return PostResponse.builder()
                .id(post.getId()).content(post.getContent()).imageUrl(post.getImageUrl()).postType(post.getPostType())
                .likeCount(postLikeRepository.countByPostId(post.getId())).commentCount(commentRepository.countByPostId(post.getId()))
                .createdAt(post.getCreatedAt()).updatedAt(post.getUpdatedAt()).user(userInfo)
                .build();
    }

    private CommentResponse toCommentResponse(Comment comment, User user) {
        PostResponse.UserInfo userInfo = user != null
                ? PostResponse.UserInfo.builder().id(user.getId()).fullName(user.getFullName()).email(user.getEmail()).username(user.getUsername()).avatarUrl(user.getAvatarUrl()).build()
                : PostResponse.UserInfo.builder().id(comment.getUserId()).fullName("Unknown").email("").build();
        return CommentResponse.builder()
                .id(comment.getId()).content(comment.getContent()).createdAt(comment.getCreatedAt()).user(userInfo)
                .build();
    }
}
