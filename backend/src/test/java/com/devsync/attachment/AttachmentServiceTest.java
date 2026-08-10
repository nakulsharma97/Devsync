package com.devsync.attachment;

import com.devsync.activity.ActivityService;
import com.devsync.attachment.dto.AttachmentResponse;
import com.devsync.attachment.entity.FileAttachment;
import com.devsync.attachment.repository.FileAttachmentRepository;
import com.devsync.common.ResourceNotFoundException;
import com.devsync.message.entity.Message;
import com.devsync.message.repository.MessageRepository;
import com.devsync.project.repository.ProjectMemberRepository;
import com.devsync.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AttachmentServiceTest {

    @Mock private FileAttachmentRepository attachmentRepository;
    @Mock private FileStorageService fileStorageService;
    @Mock private UserRepository userRepository;
    @Mock private ActivityService activityService;
    @Mock private ProjectMemberRepository projectMemberRepository;
    @Mock private MessageRepository messageRepository;

    @TempDir
    Path tempDir;

    private AttachmentService attachmentService;
    private FileStorageService realStorage;

    /** Minimal valid PNG signature: 0x89 P N G 0x0D 0x0A 0x1A 0x0A */
    private static final byte[] PNG_BYTES = {
            (byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D
    };
    /** DOS MZ executable header. */
    private static final byte[] MZ_BYTES = {'M', 'Z', 0x10, 0x00, 0x03, 0x00};
    /** ZIP local file header. */
    private static final byte[] ZIP_BYTES = {'P', 'K', 0x03, 0x04, 0x14, 0x00};
    /** PDF header. */
    private static final byte[] PDF_BYTES = {'%', 'P', 'D', 'F', '-', '1', '.', '7'};

    @BeforeEach
    void setUp() throws Exception {
        realStorage = new FileStorageService();
        ReflectionTestUtils.setField(realStorage, "uploadDir", tempDir.toString());
        realStorage.init();

        attachmentService = new AttachmentService(attachmentRepository, realStorage,
                userRepository, activityService, projectMemberRepository, messageRepository);
        ReflectionTestUtils.setField(attachmentService, "maxSize", 10L * 1024 * 1024);
    }

    private MockMultipartFile png(String name) {
        return new MockMultipartFile("file", name, "image/png", PNG_BYTES);
    }

    @Test
    void upload_shouldStore_AndReturnResponse() {
        MockMultipartFile file = png("photo.png");
        when(attachmentRepository.save(any(FileAttachment.class))).thenAnswer(inv -> {
            FileAttachment a = inv.getArgument(0);
            a.setId("att-1");
            a.setCreatedAt(Instant.now());
            return a;
        });

        AttachmentResponse response = attachmentService.upload(file, "MESSAGE", "ctx-1", "p1", "u1");

        assertThat(response.getId()).isEqualTo("att-1");
        assertThat(response.getFileName()).isEqualTo("photo.png");
        assertThat(response.getUrl()).isEqualTo("/api/attachments/att-1/download");
        assertThat(response.getContextId()).isEqualTo("ctx-1");
        verify(activityService).record(eq("u1"), eq("p1"), any(), any(), any(), any());
    }

    @Test
    void upload_shouldReject_WhenEmpty() {
        MockMultipartFile file = new MockMultipartFile("file", "empty.png", "image/png", new byte[0]);

        assertThatThrownBy(() -> attachmentService.upload(file, "MESSAGE", null, null, "u1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("empty");
        verify(attachmentRepository, never()).save(any());
    }

    @Test
    void upload_shouldReject_WhenTooLarge() {
        MockMultipartFile file = new MockMultipartFile("file", "big.png", "image/png",
                new byte[20 * 1024 * 1024]);

        assertThatThrownBy(() -> attachmentService.upload(file, "MESSAGE", null, null, "u1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("maximum");
    }

    @Test
    void upload_shouldReject_WhenUnsupportedExtension() {
        MockMultipartFile file = png("virus.exe");

        assertThatThrownBy(() -> attachmentService.upload(file, "MESSAGE", null, null, "u1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Unsupported");
        verify(fileStorageService, never()).store(any(), any());
    }

    @Test
    void upload_shouldReject_SingleCharExtensionThatWasPreviouslyAcceptedBySubstringMatch() {
        // Regression: the old allowlist used String.contains, so "evil.m" passed
        // because "m" appears inside "bmp"/"md". Exact matching must reject it.
        MockMultipartFile file = new MockMultipartFile("file", "evil.m", "text/plain",
                "just some text".getBytes(StandardCharsets.UTF_8));

        assertThatThrownBy(() -> attachmentService.upload(file, "MESSAGE", null, null, "u1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Unsupported");
        verify(fileStorageService, never()).store(any(), any());
    }

    @Test
    void upload_shouldReject_ExecutableDisguisedAsPng() {
        MockMultipartFile file = new MockMultipartFile("file", "photo.png", "image/png", MZ_BYTES);

        assertThatThrownBy(() -> attachmentService.upload(file, "MESSAGE", null, null, "u1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Executable");
        verify(fileStorageService, never()).store(any(), any());
    }

    @Test
    void upload_shouldReject_ExecutableDisguisedAsPdf() {
        MockMultipartFile file = new MockMultipartFile("file", "report.pdf", "application/pdf", MZ_BYTES);

        assertThatThrownBy(() -> attachmentService.upload(file, "MESSAGE", null, null, "u1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Executable");
    }

    @Test
    void upload_shouldReject_ContentMismatchingExtension() {
        // PNG bytes claimed as a PDF
        MockMultipartFile file = new MockMultipartFile("file", "report.pdf", "application/pdf", PNG_BYTES);

        assertThatThrownBy(() -> attachmentService.upload(file, "MESSAGE", null, null, "u1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("does not match");
        verify(fileStorageService, never()).store(any(), any());
    }

    @Test
    void upload_shouldReject_ExecutableBytesClaimedAsText() {
        // Text extension but executable content - caught by the executable check
        // before the extension/content consistency check.
        MockMultipartFile file = new MockMultipartFile("file", "notes.txt", "text/plain", MZ_BYTES);

        assertThatThrownBy(() -> attachmentService.upload(file, "MESSAGE", null, null, "u1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Executable");
    }

    @Test
    void upload_shouldAccept_ValidPdf() {
        MockMultipartFile file = new MockMultipartFile("file", "doc.pdf", "application/pdf", PDF_BYTES);
        when(attachmentRepository.save(any(FileAttachment.class))).thenAnswer(inv -> {
            FileAttachment a = inv.getArgument(0);
            a.setId("att-2");
            a.setCreatedAt(Instant.now());
            return a;
        });

        AttachmentResponse response = attachmentService.upload(file, "MESSAGE", "ctx-1", "p1", "u1");

        assertThat(response.getFileName()).isEqualTo("doc.pdf");
        assertThat(response.getContentType()).isEqualTo("application/pdf");
    }

    @Test
    void upload_shouldAccept_ValidZipContainerForDocx() {
        MockMultipartFile file = new MockMultipartFile("file", "doc.docx",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ZIP_BYTES);
        when(attachmentRepository.save(any(FileAttachment.class))).thenAnswer(inv -> {
            FileAttachment a = inv.getArgument(0);
            a.setId("att-3");
            a.setCreatedAt(Instant.now());
            return a;
        });

        AttachmentResponse response = attachmentService.upload(file, "MESSAGE", "ctx-1", "p1", "u1");

        assertThat(response.getFileName()).isEqualTo("doc.docx");
    }

    @Test
    void upload_shouldAccept_PlainTextFile() {
        MockMultipartFile file = new MockMultipartFile("file", "notes.md", "text/markdown",
                "# Hello\n\nSome **notes**.".getBytes(StandardCharsets.UTF_8));
        when(attachmentRepository.save(any(FileAttachment.class))).thenAnswer(inv -> {
            FileAttachment a = inv.getArgument(0);
            a.setId("att-4");
            a.setCreatedAt(Instant.now());
            return a;
        });

        AttachmentResponse response = attachmentService.upload(file, "MESSAGE", "ctx-1", "p1", "u1");

        assertThat(response.getFileName()).isEqualTo("notes.md");
    }

    // ── Download authorization ──────────────────────────────────────────

    private FileAttachment projectAttachment(String id, String storedName, String projectId, String uploaderId) {
        FileAttachment a = FileAttachment.builder()
                .uploaderId(uploaderId)
                .projectId(projectId)
                .contextType(com.devsync.attachment.entity.AttachmentContext.MESSAGE)
                .contextId("msg-1")
                .originalName("photo.png")
                .storedName(storedName)
                .contentType("image/png")
                .size(PNG_BYTES.length)
                .build();
        a.setId(id);
        return a;
    }

    @Test
    void download_shouldAllow_ProjectMember() throws Exception {
        Files.write(tempDir.resolve("abc-photo.png"), PNG_BYTES);
        FileAttachment attachment = projectAttachment("att-1", "abc-photo.png", "p1", "u-uploader");
        when(attachmentRepository.findById("att-1")).thenReturn(java.util.Optional.of(attachment));
        when(projectMemberRepository.existsByProjectIdAndUserId("p1", "u-member")).thenReturn(true);

        AttachmentService.AttachmentDownload download =
                attachmentService.download("att-1", "u-member", false);

        assertThat(download.resource().getFile()).exists();
        assertThat(download.originalName()).isEqualTo("photo.png");
    }

    @Test
    void download_shouldReject_NonMember() throws Exception {
        Files.write(tempDir.resolve("abc-photo.png"), PNG_BYTES);
        FileAttachment attachment = projectAttachment("att-1", "abc-photo.png", "p1", "u-uploader");
        when(attachmentRepository.findById("att-1")).thenReturn(java.util.Optional.of(attachment));
        when(projectMemberRepository.existsByProjectIdAndUserId("p1", "u-stranger")).thenReturn(false);

        assertThatThrownBy(() -> attachmentService.download("att-1", "u-stranger", false))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void download_shouldAllow_Uploader() throws Exception {
        Files.write(tempDir.resolve("abc-photo.png"), PNG_BYTES);
        FileAttachment attachment = projectAttachment("att-1", "abc-photo.png", "p1", "u-uploader");
        when(attachmentRepository.findById("att-1")).thenReturn(java.util.Optional.of(attachment));

        AttachmentService.AttachmentDownload download =
                attachmentService.download("att-1", "u-uploader", false);

        assertThat(download.resource().getFile()).exists();
    }

    @Test
    void download_shouldAllow_GlobalAdmin() throws Exception {
        Files.write(tempDir.resolve("abc-photo.png"), PNG_BYTES);
        FileAttachment attachment = projectAttachment("att-1", "abc-photo.png", "p1", "u-uploader");
        when(attachmentRepository.findById("att-1")).thenReturn(java.util.Optional.of(attachment));

        AttachmentService.AttachmentDownload download =
                attachmentService.download("att-1", "u-admin", true);

        assertThat(download.resource().getFile()).exists();
    }

    @Test
    void download_shouldThrow_WhenAttachmentMissing() {
        when(attachmentRepository.findById("att-missing")).thenReturn(java.util.Optional.empty());

        assertThatThrownBy(() -> attachmentService.download("att-missing", "u1", false))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void download_shouldThrow_WhenStoredFileMissing() throws Exception {
        FileAttachment attachment = projectAttachment("att-1", "abc-photo.png", "p1", "u-uploader");
        when(attachmentRepository.findById("att-1")).thenReturn(java.util.Optional.of(attachment));

        assertThatThrownBy(() -> attachmentService.download("att-1", "u-uploader", false))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void downloadByStoredName_shouldReject_Traversal() {
        // Traversal input never reaches the filesystem: it is only used as a DB
        // lookup key (records always carry a server-generated stored name), so a
        // traversal attempt yields 404 — same as any unknown name, no info leak.
        when(attachmentRepository.findByStoredName("../../etc/passwd")).thenReturn(java.util.Optional.empty());
        when(attachmentRepository.findByStoredName("..%2F..%2Fetc%2Fpasswd")).thenReturn(java.util.Optional.empty());

        assertThatThrownBy(() -> attachmentService.downloadByStoredName("../../etc/passwd", "u-uploader", false))
                .isInstanceOf(ResourceNotFoundException.class);
        assertThatThrownBy(() -> attachmentService.downloadByStoredName("..%2F..%2Fetc%2Fpasswd", "u-uploader", false))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void download_shouldReject_TraversalThroughStoredName() throws Exception {
        FileAttachment attachment = projectAttachment("att-1", "..%2F..%2Fetc%2Fpasswd", "p1", "u-uploader");
        when(attachmentRepository.findById("att-1")).thenReturn(java.util.Optional.of(attachment));

        // %2F stays a literal in the stored name and fails the safe charset check.
        assertThatThrownBy(() -> attachmentService.download("att-1", "u-uploader", false))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void download_shouldAllow_DmParticipant() throws Exception {
        Files.write(tempDir.resolve("abc-photo.png"), PNG_BYTES);
        FileAttachment attachment = FileAttachment.builder()
                .uploaderId("u-alice")
                .projectId(null)
                .contextType(com.devsync.attachment.entity.AttachmentContext.MESSAGE)
                .contextId("msg-1")
                .originalName("photo.png")
                .storedName("abc-photo.png")
                .contentType("image/png")
                .size(PNG_BYTES.length)
                .build();
        attachment.setId("att-dm");
        when(attachmentRepository.findById("att-dm")).thenReturn(java.util.Optional.of(attachment));
        Message dm = Message.builder().senderId("u-alice").receiverId("u-bob").build();
        when(messageRepository.findByAttachmentId("att-dm")).thenReturn(List.of(dm));

        AttachmentService.AttachmentDownload download =
                attachmentService.download("att-dm", "u-bob", false);

        assertThat(download.resource().getFile()).exists();
    }

    @Test
    void download_shouldReject_DmStranger() throws Exception {
        Files.write(tempDir.resolve("abc-photo.png"), PNG_BYTES);
        FileAttachment attachment = FileAttachment.builder()
                .uploaderId("u-alice")
                .projectId(null)
                .contextType(com.devsync.attachment.entity.AttachmentContext.MESSAGE)
                .contextId("msg-1")
                .originalName("photo.png")
                .storedName("abc-photo.png")
                .contentType("image/png")
                .size(PNG_BYTES.length)
                .build();
        attachment.setId("att-dm");
        when(attachmentRepository.findById("att-dm")).thenReturn(java.util.Optional.of(attachment));
        when(messageRepository.findByAttachmentId("att-dm")).thenReturn(List.of());

        assertThatThrownBy(() -> attachmentService.download("att-dm", "u-mallory", false))
                .isInstanceOf(AccessDeniedException.class);
    }
}
