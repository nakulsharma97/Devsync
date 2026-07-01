package com.devsync.service;

import com.devsync.entity.Bookmark;
import com.devsync.entity.User;
import com.devsync.exception.BadRequestException;
import com.devsync.exception.ResourceNotFoundException;
import com.devsync.repository.BookmarkRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class BookmarkService {

    private final BookmarkRepository bookmarkRepository;

    @Transactional
    public Bookmark createBookmark(Long userId, String repoName, String repoUrl,
                                    String description, String language, String owner, int stars) {
        if (bookmarkRepository.existsByUserIdAndRepoUrl(userId, repoUrl)) {
            throw new BadRequestException("Repository already bookmarked");
        }

        Bookmark bookmark = Bookmark.builder()
                .user(User.builder().id(userId).build())
                .repoName(repoName)
                .repoUrl(repoUrl)
                .description(description)
                .language(language)
                .owner(owner)
                .stars(stars)
                .build();

        return bookmarkRepository.save(bookmark);
    }

    @Transactional(readOnly = true)
    public List<Bookmark> getUserBookmarks(Long userId) {
        return bookmarkRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @Transactional(readOnly = true)
    public List<Bookmark> searchBookmarks(Long userId, String query) {
        return bookmarkRepository.searchByUserId(userId, query);
    }

    @Transactional
    public void deleteBookmark(Long bookmarkId, Long userId) {
        Bookmark bookmark = bookmarkRepository.findById(bookmarkId)
                .orElseThrow(() -> new ResourceNotFoundException("Bookmark not found"));

        if (!bookmark.getUser().getId().equals(userId)) {
            throw new BadRequestException("You don't have permission to delete this bookmark");
        }

        bookmarkRepository.delete(bookmark);
    }
}
