package com.devsync.attachment.repository;

import com.devsync.attachment.entity.FileAttachment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface FileAttachmentRepository extends JpaRepository<FileAttachment, String> {

    List<FileAttachment> findByContextTypeAndContextId(String contextType, String contextId);

    List<FileAttachment> findByContextIdIn(Collection<String> contextIds);

    List<FileAttachment> findByProjectIdOrderByCreatedAtDesc(String projectId);

    Optional<FileAttachment> findByStoredName(String storedName);

    /** Total bytes stored by a user (storage quota check). Single aggregate query. */
    @Query("SELECT COALESCE(SUM(a.size), 0) FROM FileAttachment a WHERE a.uploaderId = :userId")
    long sumSizeByUploaderId(@Param("userId") String userId);
}
