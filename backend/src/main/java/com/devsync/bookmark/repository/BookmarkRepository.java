package com.devsync.bookmark.repository;

import com.devsync.bookmark.entity.Bookmark;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BookmarkRepository extends JpaRepository<Bookmark, String> {

    List<Bookmark> findByUserIdOrderByCreatedAtDesc(String userId);

    Optional<Bookmark> findByUserIdAndEntityTypeAndEntityId(String userId, String entityType, String entityId);

    boolean existsByUserIdAndEntityTypeAndEntityId(String userId, String entityType, String entityId);

    void deleteByUserIdAndEntityTypeAndEntityId(String userId, String entityType, String entityId);

    List<Bookmark> findByUserIdAndEntityTypeInAndEntityIdIn(String userId, java.util.List<String> entityTypes, java.util.Collection<String> entityIds);
}
