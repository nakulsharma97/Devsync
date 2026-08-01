package com.devsync.attachment;

import com.devsync.activity.ActivityService;
import com.devsync.attachment.dto.AttachmentResponse;
import com.devsync.attachment.entity.FileAttachment;
import com.devsync.attachment.repository.FileAttachmentRepository;
import com.devsync.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AttachmentServiceTest {

    @Mock private FileAttachmentRepository attachmentRepository;
    @Mock private FileStorageService fileStorageService;
    @Mock private UserRepository userRepository;
    @Mock private ActivityService activityService;

    private AttachmentService attachmentService;

    @BeforeEach
    void setUp() {
        attachmentService = new AttachmentService(attachmentRepository, fileStorageService,
                userRepository, activityService);
        ReflectionTestUtils.setField(attachmentService, "maxSize", 10L * 1024 * 1024);
    }

    @Test
    void upload_shouldStore_AndReturnResponse() {
        MultipartFile file = mock(MultipartFile.class);
        when(file.isEmpty()).thenReturn(false);
        when(file.getSize()).thenReturn(1024L);
        when(file.getOriginalFilename()).thenReturn("photo.png");
        when(file.getContentType()).thenReturn("image/png");
        when(fileStorageService.store(file, "photo.png")).thenReturn("abc-photo.png");
        when(attachmentRepository.save(any(FileAttachment.class))).thenAnswer(inv -> {
            FileAttachment a = inv.getArgument(0);
            a.setId("att-1");
            a.setCreatedAt(Instant.now());
            return a;
        });

        AttachmentResponse response = attachmentService.upload(file, "MESSAGE", "ctx-1", "p1", "u1");

        assertThat(response.getId()).isEqualTo("att-1");
        assertThat(response.getFileName()).isEqualTo("photo.png");
        assertThat(response.getUrl()).startsWith("/uploads/");
        assertThat(response.getContextId()).isEqualTo("ctx-1");
        verify(activityService).record(eq("u1"), eq("p1"), any(), any(), any(), any());
    }

    @Test
    void upload_shouldReject_WhenEmpty() {
        MultipartFile file = mock(MultipartFile.class);
        when(file.isEmpty()).thenReturn(true);

        assertThatThrownBy(() -> attachmentService.upload(file, "MESSAGE", null, null, "u1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("empty");
        verify(attachmentRepository, never()).save(any());
    }

    @Test
    void upload_shouldReject_WhenTooLarge() {
        MultipartFile file = mock(MultipartFile.class);
        when(file.isEmpty()).thenReturn(false);
        when(file.getSize()).thenReturn(20L * 1024 * 1024);

        assertThatThrownBy(() -> attachmentService.upload(file, "MESSAGE", null, null, "u1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("maximum");
    }

    @Test
    void upload_shouldReject_WhenUnsupportedType() {
        MultipartFile file = mock(MultipartFile.class);
        when(file.isEmpty()).thenReturn(false);
        when(file.getSize()).thenReturn(1024L);
        when(file.getOriginalFilename()).thenReturn("virus.exe");

        assertThatThrownBy(() -> attachmentService.upload(file, "MESSAGE", null, null, "u1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Unsupported");
        verify(fileStorageService, never()).store(any(), any());
    }
}
