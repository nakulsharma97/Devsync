package com.devsync.attachment.repository;

import com.devsync.attachment.entity.FileAttachment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface FileAttachmentRepository extends JpaRepository<FileAttachment, String> {

    List<FileAttachment> findByContextTypeAndContextId(String contextType, String contextId);

    List<FileAttachment> findByContextIdIn(Collection<String> contextIds);

    List<FileAttachment> findByProjectIdOrderByCreatedAtDesc(String projectId);

    Optional<FileAttachment> findByStoredName(String storedName);
}
