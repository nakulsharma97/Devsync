package com.devsync.service;

import com.devsync.dto.PostRequest;
import com.devsync.entity.Post;
import com.devsync.entity.PostLike;
import com.devsync.entity.User;
import com.devsync.enums.PostType;
import com.devsync.exception.BadRequestException;
import com.devsync.exception.ResourceNotFoundException;
import com.devsync.repository.PostLikeRepository;
import com.devsync.repository.PostRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PostServiceTest {

    @Mock
    private PostRepository postRepository;

    @Mock
    private PostLikeRepository postLikeRepository;

    @Mock
    private UserService userService;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private PostService postService;

    private User testUser;
    private Post testPost;
    private PostRequest validPostRequest;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id(1L)
                .email("user@example.com")
                .fullName("Test User")
                .build();

        validPostRequest = new PostRequest();
        validPostRequest.setContent("Hello DevSync!");
        validPostRequest.setPostType(PostType.TEXT);

        testPost = Post.builder()
                .id(1L)
                .user(testUser)
                .content("Hello DevSync!")
                .postType(PostType.TEXT)
                .build();
    }

    @Test
    void createPost_ShouldSucceed() {
        when(userService.getUserById(1L)).thenReturn(testUser);
        when(postRepository.save(any(Post.class))).thenReturn(testPost);

        Post result = postService.createPost(1L, validPostRequest);

        assertNotNull(result);
        assertEquals("Hello DevSync!", result.getContent());
        assertEquals(PostType.TEXT, result.getPostType());

        ArgumentCaptor<Post> captor = ArgumentCaptor.forClass(Post.class);
        verify(postRepository).save(captor.capture());
        assertEquals(testUser, captor.getValue().getUser());
    }

    @Test
    void createPost_ShouldDefaultToText_WhenPostTypeNull() {
        PostRequest requestNoType = new PostRequest();
        requestNoType.setContent("Just text");

        when(userService.getUserById(1L)).thenReturn(testUser);
        when(postRepository.save(any(Post.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Post result = postService.createPost(1L, requestNoType);

        assertEquals(PostType.TEXT, result.getPostType());
    }

    @Test
    void getFeed_ShouldReturnPagedResults() {
        Page<Post> page = new PageImpl<>(List.of(testPost));
        when(postRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(0, 20))).thenReturn(page);

        Page<Post> result = postService.getFeed(0, 20);

        assertEquals(1, result.getContent().size());
        assertEquals("Hello DevSync!", result.getContent().get(0).getContent());
    }

    @Test
    void getFeed_ShouldReturnEmpty_WhenNoPosts() {
        when(postRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(0, 20)))
                .thenReturn(Page.empty());

        Page<Post> result = postService.getFeed(0, 20);
        assertTrue(result.isEmpty());
    }

    @Test
    void getPostById_ShouldReturnPost() {
        when(postRepository.findById(1L)).thenReturn(Optional.of(testPost));

        Post result = postService.getPostById(1L);
        assertNotNull(result);
        assertEquals("Hello DevSync!", result.getContent());
    }

    @Test
    void getPostById_ShouldThrow_WhenNotFound() {
        when(postRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> postService.getPostById(99L));
    }

    @Test
    void deletePost_ShouldSucceed_WhenOwner() {
        when(postRepository.findById(1L)).thenReturn(Optional.of(testPost));

        postService.deletePost(1L, 1L);

        verify(postRepository).delete(testPost);
    }

    @Test
    void deletePost_ShouldThrow_WhenNotOwner() {
        Post otherPost = Post.builder().id(1L).user(User.builder().id(2L).build()).content("Other").build();
        when(postRepository.findById(1L)).thenReturn(Optional.of(otherPost));

        assertThrows(BadRequestException.class,
                () -> postService.deletePost(1L, 1L));
        verify(postRepository, never()).delete(any());
    }

    @Test
    void toggleLike_ShouldAddLike_WhenNotAlreadyLiked() {
        when(postLikeRepository.existsByUserIdAndPostId(1L, 1L)).thenReturn(false);
        when(postRepository.findById(1L)).thenReturn(Optional.of(testPost));
        when(userService.getUserById(1L)).thenReturn(testUser);
        when(postLikeRepository.save(any(PostLike.class))).thenReturn(null);

        boolean result = postService.toggleLike(1L, 1L);

        assertTrue(result);
        verify(postLikeRepository).save(any(PostLike.class));
        verify(postLikeRepository, never()).deleteByUserIdAndPostId(anyLong(), anyLong());
    }

    @Test
    void toggleLike_ShouldRemoveLike_WhenAlreadyLiked() {
        when(postLikeRepository.existsByUserIdAndPostId(1L, 1L)).thenReturn(true);

        boolean result = postService.toggleLike(1L, 1L);

        assertFalse(result);
        verify(postLikeRepository).deleteByUserIdAndPostId(1L, 1L);
        verify(postLikeRepository, never()).save(any());
    }

    @Test
    void getLikeCount_ShouldReturnCount() {
        when(postLikeRepository.countByPostId(1L)).thenReturn(5L);

        long count = postService.getLikeCount(1L);
        assertEquals(5L, count);
    }
}
