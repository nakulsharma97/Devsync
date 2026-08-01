package com.devsync.attachment.entity;

import com.devsync.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "file_attachments", indexes = {
        @Index(name = "idx_att_uploader", columnList = "uploader_id"),
        @Index(name = "idx_att_context", columnList = "context_type, context_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FileAttachment extends BaseEntity {

    @Column(name = "uploader_id", nullable = false)
    private String uploaderId;

    @Column(name = "project_id")
    private String projectId;

    @Enumerated(EnumType.STRING)
    @Column(name = "context_type", nullable = false)
    private AttachmentContext contextType;

    @Column(name = "context_id")
    private String contextId;

    @Column(name = "original_name", nullable = false)
    private String originalName;

    @Column(name = "stored_name", nullable = false)
    private String storedName;

    @Column(name = "content_type")
    private String contentType;

    @Column(nullable = false)
    private long size;

    @Column(nullable = false, length = 500)
    private String url;
}
