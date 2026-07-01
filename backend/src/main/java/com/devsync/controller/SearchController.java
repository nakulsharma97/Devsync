package com.devsync.controller;

import com.devsync.dto.ApiResponse;
import com.devsync.entity.Bookmark;
import com.devsync.entity.Project;
import com.devsync.entity.User;
import com.devsync.service.ProjectService;
import com.devsync.service.UserService;
import com.devsync.service.BookmarkService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/search")
@RequiredArgsConstructor
@Tag(name = "Search", description = "Global search across users, projects, and bookmarks")
public class SearchController {

    private final UserService userService;
    private final ProjectService projectService;
    private final BookmarkService bookmarkService;

    @GetMapping
    @Operation(summary = "Global search", description = "Searches across developers, projects, and bookmarks matching the query")
    public ResponseEntity<ApiResponse<Map<String, Object>>> search(
            @RequestParam String q,
            @AuthenticationPrincipal User user) {
        List<User> developers = userService.searchUsers(q);
        List<Project> projects = projectService.searchProjects(q);
        List<Bookmark> bookmarks = bookmarkService.searchBookmarks(user.getId(), q);

        Map<String, Object> results = Map.of(
                "developers", developers,
                "projects", projects,
                "bookmarks", bookmarks
        );
        return ResponseEntity.ok(ApiResponse.success(results));
    }
}
