package com.devsync.search;

import com.devsync.search.dto.SearchResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/search")
@RequiredArgsConstructor
public class SearchController {

    private final SearchService searchService;

    @GetMapping
    public ResponseEntity<SearchResponse> search(
            @RequestParam String keyword,
            @RequestParam(required = false) String type,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(searchService.search(keyword, type, page, size, userDetails.getUsername()));
    }

    @GetMapping("/recent")
    public ResponseEntity<List<String>> recent(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(searchService.getRecent(userDetails.getUsername()));
    }

    @DeleteMapping("/recent")
    public ResponseEntity<Void> clearRecent(@AuthenticationPrincipal UserDetails userDetails) {
        searchService.clearRecent(userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }
}
