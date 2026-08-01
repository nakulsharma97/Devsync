package com.devsync.bookmark;

import com.devsync.bookmark.dto.BookmarkResponse;
import com.devsync.bookmark.entity.Bookmark;
import com.devsync.bookmark.repository.BookmarkRepository;
import com.devsync.common.ResourceNotFoundException;
import com.devsync.feed.entity.Post;
import com.devsync.feed.repository.PostRepository;
import com.devsync.kanban.entity.Task;
import com.devsync.kanban.repository.TaskRepository;
import com.devsync.project.entity.Project;
import com.devsync.project.repository.ProjectRepository;
import com.devsync.user.entity.User;
import com.devsync.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BookmarkService {

    private static final Set<String> VALID_TYPES = Set.of("PROJECT", "TASK", "POST", "USER");

    private final BookmarkRepository bookmarkRepository;
    private final ProjectRepository projectRepository;
    private final TaskRepository taskRepository;
    private final PostRepository postRepository;
    private final UserRepository userRepository;

    @Transactional
    public BookmarkResponse add(String userId, String entityType, String entityId) {
        String type = normalizeType(entityType);
        if (bookmarkRepository.existsByUserIdAndEntityTypeAndEntityId(userId, type, entityId)) {
            throw new IllegalArgumentException("Already bookmarked");
        }
        Bookmark bookmark = bookmarkRepository.save(Bookmark.builder()
                .userId(userId).entityType(type).entityId(entityId).build());
        return toResponse(bookmark, resolveTitle(type, entityId));
    }

    @Transactional
    public void remove(String bookmarkId, String userId) {
        Bookmark bookmark = bookmarkRepository.findById(bookmarkId)
                .orElseThrow(() -> new ResourceNotFoundException("Bookmark", bookmarkId));
        if (!bookmark.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Not your bookmark");
        }
        bookmarkRepository.delete(bookmark);
    }

    @Transactional
    public void removeByEntity(String userId, String entityType, String entityId) {
        bookmarkRepository.deleteByUserIdAndEntityTypeAndEntityId(userId, normalizeType(entityType), entityId);
    }

    @Transactional(readOnly = true)
    public List<BookmarkResponse> list(String userId) {
        List<Bookmark> bookmarks = bookmarkRepository.findByUserIdOrderByCreatedAtDesc(userId);
        if (bookmarks.isEmpty()) return List.of();

        Map<String, String> titles = resolveTitles(bookmarks);
        return bookmarks.stream()
                .map(b -> toResponse(b, titles.getOrDefault(b.getEntityId(), b.getEntityId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public boolean isBookmarked(String userId, String entityType, String entityId) {
        return bookmarkRepository.existsByUserIdAndEntityTypeAndEntityId(userId, normalizeType(entityType), entityId);
    }

    private Map<String, String> resolveTitles(List<Bookmark> bookmarks) {
        java.util.HashMap<String, String> titles = new java.util.HashMap<>();
        Set<String> projectIds = bookmarks.stream().filter(b -> b.getEntityType().equals("PROJECT"))
                .map(Bookmark::getEntityId).collect(Collectors.toSet());
        Set<String> taskIds = bookmarks.stream().filter(b -> b.getEntityType().equals("TASK"))
                .map(Bookmark::getEntityId).collect(Collectors.toSet());
        Set<String> postIds = bookmarks.stream().filter(b -> b.getEntityType().equals("POST"))
                .map(Bookmark::getEntityId).collect(Collectors.toSet());
        Set<String> userIds = bookmarks.stream().filter(b -> b.getEntityType().equals("USER"))
                .map(Bookmark::getEntityId).collect(Collectors.toSet());

        if (!projectIds.isEmpty()) {
            projectRepository.findAllById(projectIds)
                    .forEach(p -> titles.put(p.getId(), p.getName()));
        }
        if (!taskIds.isEmpty()) {
            taskRepository.findAllById(taskIds)
                    .forEach(t -> titles.put(t.getId(), t.getTitle()));
        }
        if (!postIds.isEmpty()) {
            postRepository.findAllById(postIds)
                    .forEach(p -> titles.put(p.getId(), snippet(p.getContent())));
        }
        if (!userIds.isEmpty()) {
            userRepository.findAllById(userIds)
                    .forEach(u -> titles.put(u.getId(), u.getFullName()));
        }
        return titles;
    }

    private String resolveTitle(String entityType, String entityId) {
        if (entityType.equals("PROJECT")) {
            return projectRepository.findById(entityId).map(Project::getName)
                    .orElseThrow(() -> new ResourceNotFoundException("Project", entityId));
        }
        if (entityType.equals("TASK")) {
            return taskRepository.findById(entityId).map(Task::getTitle)
                    .orElseThrow(() -> new ResourceNotFoundException("Task", entityId));
        }
        if (entityType.equals("POST")) {
            return postRepository.findById(entityId).map(p -> snippet(p.getContent()))
                    .orElseThrow(() -> new ResourceNotFoundException("Post", entityId));
        }
        if (entityType.equals("USER")) {
            return userRepository.findById(entityId).map(User::getFullName)
                    .orElseThrow(() -> new ResourceNotFoundException("User", entityId));
        }
        return entityId;
    }

    private BookmarkResponse toResponse(Bookmark bookmark, String title) {
        return BookmarkResponse.builder()
                .id(bookmark.getId())
                .entityType(bookmark.getEntityType())
                .entityId(bookmark.getEntityId())
                .title(title)
                .subtitle(bookmark.getEntityType().toLowerCase())
                .url(urlFor(bookmark.getEntityType(), bookmark.getEntityId()))
                .createdAt(bookmark.getCreatedAt())
                .build();
    }

    private String urlFor(String entityType, String entityId) {
        return switch (entityType) {
            case "PROJECT" -> "/board/" + entityId;
            case "TASK" -> "/board/" + entityId;
            case "POST" -> "/feed";
            case "USER" -> "/user/" + entityId;
            default -> "#";
        };
    }

    private String snippet(String content) {
        if (content == null) return "";
        String t = content.trim().replaceAll("\\s+", " ");
        return t.length() > 60 ? t.substring(0, 60) + "..." : t;
    }

    private String normalizeType(String entityType) {
        if (entityType == null || !VALID_TYPES.contains(entityType.toUpperCase())) {
            throw new IllegalArgumentException("Invalid entityType (PROJECT, TASK, POST, USER)");
        }
        return entityType.toUpperCase();
    }
}
