package com.devsync.attachment.repository;

import com.devsync.attachment.entity.AttachmentContext;
import com.devsync.attachment.entity.FileAttachment;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Import;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.test.context.ActiveProfiles;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Real-JPA regression test: the context-type column is an enum, so Spring Data
 * binds query parameters as the enum type. Passing a String used to fail with
 * "did not match parameter type [AttachmentContext]" at runtime — this test
 * locks in the correct enum-typed binding.
 */
@DataJpaTest
@ActiveProfiles("test")
@Import(FileAttachmentRepositoryTest.AuditingConfig.class)
class FileAttachmentRepositoryTest {

    @Autowired
    private FileAttachmentRepository attachmentRepository;

    @TestConfiguration
    @EnableJpaAuditing
    static class AuditingConfig {
    }

    @Test
    void findByContextTypeAndContextId_shouldMatch_ByEnumContext() {
        attachmentRepository.save(attachment(AttachmentContext.POST, "post-1"));
        attachmentRepository.save(attachment(AttachmentContext.MESSAGE, "room-1"));

        List<FileAttachment> posts =
                attachmentRepository.findByContextTypeAndContextId(AttachmentContext.POST, "post-1");
        List<FileAttachment> messages =
                attachmentRepository.findByContextTypeAndContextId(AttachmentContext.MESSAGE, "room-1");

        assertThat(posts).extracting(FileAttachment::getContextId).containsExactly("post-1");
        assertThat(posts).allMatch(a -> a.getContextType() == AttachmentContext.POST);
        assertThat(messages).extracting(FileAttachment::getContextId).containsExactly("room-1");
        assertThat(messages).allMatch(a -> a.getContextType() == AttachmentContext.MESSAGE);
    }

    @Test
    void findByContextTypeAndContextId_shouldReturnEmpty_WhenNoMatch() {
        attachmentRepository.save(attachment(AttachmentContext.POST, "post-1"));

        assertThat(attachmentRepository.findByContextTypeAndContextId(
                AttachmentContext.POST, "nope")).isEmpty();
    }

    private FileAttachment attachment(AttachmentContext context, String contextId) {
        return FileAttachment.builder()
                .uploaderId("u1")
                .contextType(context)
                .contextId(contextId)
                .originalName("photo.png")
                .storedName("stored-any.png")
                .contentType("image/png")
                .size(100)
                .url("/api/attachments/any/download")
                .build();
    }
}
