package com.devsync.service;

import com.devsync.dto.CommentRequest;
import com.devsync.entity.Comment;
import com.devsync.entity.Post;
import com.devsync.entity.User;
import com.devsync.exception.ResourceNotFoundException;
import com.devsync.repository.CommentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CommentService {

    private final CommentRepository commentRepository;
    private final PostService postService;
    private final UserService userService;

    @Transactional
    public Comment createComment(Long postId, Long userId, CommentRequest request) {
        Post post = postService.getPostById(postId);
        User user = userService.getUserById(userId);

        Comment comment = Comment.builder()
                .user(user)
                .post(post)
                .content(request.getContent())
                .build();

        return commentRepository.save(comment);
    }

    @Transactional(readOnly = true)
    public List<Comment> getPostComments(Long postId) {
        return commentRepository.findByPostIdOrderByCreatedAtAsc(postId);
    }
}
