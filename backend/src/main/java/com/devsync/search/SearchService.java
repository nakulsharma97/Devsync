package com.devsync.search;

import com.devsync.feed.entity.Post;
import com.devsync.feed.repository.PostRepository;
import com.devsync.kanban.entity.Task;
import com.devsync.kanban.repository.TaskRepository;
import com.devsync.message.entity.Message;
import com.devsync.message.repository.MessageRepository;
import com.devsync.project.entity.Project;
import com.devsync.project.repository.ProjectRepository;
import com.devsync.search.dto.SearchResponse;
import com.devsync.search.dto.SearchResultItem;
import com.devsync.search.entity.RecentSearch;
import com.devsync.search.repository.RecentSearchRepository;
import com.devsync.teamroom.entity.TeamRoom;
import com.devsync.teamroom.repository.TeamRoomRepository;
import com.devsync.user.entity.User;
import com.devsync.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class SearchService {

    private static final List<String> TYPES = List.of("PROJECT", "TASK", "USER", "TEAM", "POST", "MESSAGE");
    private static final int CAP = 50;

    private final ProjectRepository projectRepository;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final TeamRoomRepository teamRoomRepository;
    private final PostRepository postRepository;
    private final MessageRepository messageRepository;
    private final RecentSearchRepository recentSearchRepository;

    @Transactional(readOnly = true)
    public SearchResponse search(String keyword, String type, int page, int size, String userId) {
        String kw = keyword == null ? "" : keyword.trim();
        if (kw.length() < 2) {
            return SearchResponse.builder().items(List.of()).page(page).size(size).total(0).totalPages(0).build();
        }
        recordRecent(userId, kw);

        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 50);
        String lower = kw.toLowerCase(Locale.ROOT);
        String requestedType = type == null ? "" : type.toUpperCase(Locale.ROOT);

        List<SearchResultItem> all = new ArrayList<>();
        if (requestedType.isEmpty() || requestedType.equals("PROJECT")) {
            projectRepository.searchProjectsForUser(kw, userId, Project.ProjectVisibility.PUBLIC, PageRequest.of(0, CAP))
                    .forEach(p -> all.add(SearchResultItem.builder()
                            .type("PROJECT").id(p.getId()).title(p.getName())
                            .subtitle(p.getDescription() != null ? p.getDescription() : "Project")
                            .url("/board/" + p.getId()).build()));
        }
        if (requestedType.isEmpty() || requestedType.equals("TASK")) {
            taskRepository.searchTasksForUser(kw, userId, PageRequest.of(0, CAP))
                    .forEach(t -> all.add(SearchResultItem.builder()
                            .type("TASK").id(t.getId()).title(t.getTitle())
                            .subtitle("Task")
                            .url("/board/" + t.getBoardId()).build()));
        }
        if (requestedType.isEmpty() || requestedType.equals("USER")) {
            userRepository.searchUsers(kw, userId).stream().limit(CAP)
                    .forEach(u -> all.add(SearchResultItem.builder()
                            .type("USER").id(u.getId()).title(u.getFullName())
                            .subtitle("@" + (u.getUsername() != null ? u.getUsername() : u.getEmail()))
                            .url("/user/" + u.getId()).build()));
        }
        if (requestedType.isEmpty() || requestedType.equals("TEAM")) {
            teamRoomRepository.searchRoomsForUser(kw, userId, PageRequest.of(0, CAP))
                    .forEach(r -> all.add(SearchResultItem.builder()
                            .type("TEAM").id(r.getId()).title(r.getName())
                            .subtitle("Team room")
                            .url("/messages/room_" + r.getId()).build()));
        }
        if (requestedType.isEmpty() || requestedType.equals("POST")) {
            postRepository.searchPosts(kw, PageRequest.of(0, CAP))
                    .forEach(p -> all.add(SearchResultItem.builder()
                            .type("POST").id(p.getId()).title(snippet(p.getContent()))
                            .subtitle("Post")
                            .url("/feed").build()));
        }
        if (requestedType.isEmpty() || requestedType.equals("MESSAGE")) {
            messageRepository.searchMessagesForUser(kw, userId, PageRequest.of(0, CAP))
                    .forEach(m -> all.add(SearchResultItem.builder()
                            .type("MESSAGE").id(m.getId()).title(snippet(m.getContent()))
                            .subtitle("Message")
                            .url("/messages").build()));
        }

        // Sort: exact prefix matches first, then alphabetically
        all.sort(Comparator
                .comparing((SearchResultItem i) -> i.getTitle().toLowerCase(Locale.ROOT).startsWith(lower) ? 0 : 1)
                .thenComparing(i -> i.getTitle().toLowerCase(Locale.ROOT)));

        int total = all.size();
        int from = Math.min(safePage * safeSize, total);
        int to = Math.min(from + safeSize, total);
        int totalPages = safeSize == 0 ? 0 : (int) Math.ceil((double) total / safeSize);

        return SearchResponse.builder()
                .items(all.subList(from, to))
                .page(safePage).size(safeSize).total(total).totalPages(totalPages)
                .build();
    }

    @Transactional
    public void recordRecent(String userId, String keyword) {
        if (keyword == null || keyword.isBlank()) return;
        recentSearchRepository.findByUserIdAndKeyword(userId, keyword).ifPresent(recentSearchRepository::delete);
        recentSearchRepository.save(RecentSearch.builder().userId(userId).keyword(keyword).build());
    }

    @Transactional(readOnly = true)
    public List<String> getRecent(String userId) {
        return recentSearchRepository.findTop10ByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(RecentSearch::getKeyword)
                .toList();
    }

    @Transactional
    public void clearRecent(String userId) {
        recentSearchRepository.deleteByUserId(userId);
    }

    private String snippet(String content) {
        if (content == null) return "";
        String t = content.trim().replaceAll("\\s+", " ");
        return t.length() > 80 ? t.substring(0, 80) + "..." : t;
    }
}
