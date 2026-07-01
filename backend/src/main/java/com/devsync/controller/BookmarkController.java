package com.devsync.controller;

import com.devsync.dto.ApiResponse;
import com.devsync.dto.BookmarkRequest;
import com.devsync.entity.Bookmark;
import com.devsync.entity.User;
import com.devsync.service.BookmarkService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bookmarks")
@RequiredArgsConstructor
@Tag(name = "Bookmarks", description = "GitHub repository bookmarking")
public class BookmarkController {

    private final BookmarkService bookmarkService;

    @PostMapping
    @Operation(summary = "Create bookmark", description = "Saves a GitHub repository to the user's bookmarks")
    @ApiResponse(responseCode = "400", description = "Repository already bookmarked")
    public ResponseEntity<ApiResponse<Bookmark>> createBookmark(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody BookmarkRequest request) {
        Bookmark bookmark = bookmarkService.createBookmark(
                user.getId(),
                request.getRepoName(),
                request.getRepoUrl(),
                request.getDescription(),
                request.getLanguage(),
                request.getOwner(),
                request.getStars());
        return ResponseEntity.ok(ApiResponse.success("Bookmark created", bookmark));
    }

    @GetMapping
    @Operation(summary = "Get bookmarks", description = "Returns all bookmarks for the authenticated user")
    public ResponseEntity<ApiResponse<List<Bookmark>>> getBookmarks(@AuthenticationPrincipal User user) {
        List<Bookmark> bookmarks = bookmarkService.getUserBookmarks(user.getId());
        return ResponseEntity.ok(ApiResponse.success(bookmarks));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete bookmark", description = "Deletes a bookmark by ID (owner only)")
    @ApiResponse(responseCode = "403", description = "Not the bookmark owner")
    public ResponseEntity<ApiResponse<Void>> deleteBookmark(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        bookmarkService.deleteBookmark(id, user.getId());
        return ResponseEntity.ok(ApiResponse.success("Bookmark deleted", null));
    }
}
