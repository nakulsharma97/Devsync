package com.devsync.bookmark;

import com.devsync.bookmark.dto.BookmarkRequest;
import com.devsync.bookmark.dto.BookmarkResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bookmarks")
@RequiredArgsConstructor
public class BookmarkController {

    private final BookmarkService bookmarkService;

    @GetMapping
    public ResponseEntity<List<BookmarkResponse>> list(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(bookmarkService.list(userDetails.getUsername()));
    }

    @PostMapping
    public ResponseEntity<BookmarkResponse> add(
            @Valid @RequestBody BookmarkRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(bookmarkService.add(
                userDetails.getUsername(), request.getEntityType(), request.getEntityId()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> remove(@PathVariable String id,
                                       @AuthenticationPrincipal UserDetails userDetails) {
        bookmarkService.remove(id, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping
    public ResponseEntity<Void> removeByEntity(
            @RequestParam String entityType,
            @RequestParam String entityId,
            @AuthenticationPrincipal UserDetails userDetails) {
        bookmarkService.removeByEntity(userDetails.getUsername(), entityType, entityId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/status")
    public ResponseEntity<Map<String, Boolean>> status(
            @RequestParam String entityType,
            @RequestParam String entityId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(Map.of("bookmarked",
                bookmarkService.isBookmarked(userDetails.getUsername(), entityType, entityId)));
    }
}
