package com.devsync.service;

import com.devsync.dto.PostRequest;
import com.devsync.entity.Post;
import com.devsync.entity.PostLike;
import com.devsync.entity.User;
import com.devsync.enums.NotificationType;
import com.devsync.enums.PostType;
import com.devsync.exception.BadRequestException;
import com.devsync.exception.ResourceNotFoundException;
import com.devsync.repository.PostLikeRepository;
import com.devsync.repository.PostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PostService {

    private final PostRepository postRepository;
    private final PostLikeRepository postLikeRepository;
    private final UserService userService;
    private final NotificationService notificationService;

    @Transactional
    public Post createPost(Long userId, PostRequest request) {
        User user = userService.getUserById(userId);

        Post post = Post.builder()
                .user(user)
                .content(request.getContent())
                .imageUrl(request.getImageUrl())
                .postType(request.getPostType() != null ? request.getPostType() : PostType.TEXT)
                .build();

        return postRepository.save(post);
    }

    @Transactional(readOnly = true)
    public Page<Post> getFeed(int page, int size) {
        return postRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(page, size));
    }

    @Transactional(readOnly = true)
    public Post getPostById(Long postId) {
        return postRepository.findById(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Post not found with id: " + postId));
    }

    @Transactional
    public void deletePost(Long postId, Long userId) {
        Post post = getPostById(postId);
        if (!post.getUser().getId().equals(userId)) {
            throw new BadRequestException("You don't have permission to delete this post");
        }
        postRepository.delete(post);
    }

    @Transactional
    public boolean toggleLike(Long postId, Long userId) {
        if (postLikeRepository.existsByUserIdAndPostId(userId, postId)) {
            postLikeRepository.deleteByUserIdAndPostId(userId, postId);
            return false;
        } else {
            Post post = getPostById(postId);
            User user = userService.getUserById(userId);

            PostLike like = PostLike.builder()
                    .user(user)
                    .post(post)
                    .build();
            postLikeRepository.save(like);
            return true;
        }
    }

    @Transactional(readOnly = true)
    public long getLikeCount(Long postId) {
        return postLikeRepository.countByPostId(postId);
    }
}
