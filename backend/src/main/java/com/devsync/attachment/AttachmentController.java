package com.devsync.attachment;

import com.devsync.attachment.dto.AttachmentResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/attachments")
@RequiredArgsConstructor
public class AttachmentController {

    private final AttachmentService attachmentService;

    @PostMapping
    public ResponseEntity<AttachmentResponse> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) String contextType,
            @RequestParam(required = false) String contextId,
            @RequestParam(required = false) String projectId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(attachmentService.upload(
                file, contextType, contextId, projectId, userDetails.getUsername()));
    }

    /**
     * Authorized download by attachment id. 401 without a token, 403 for
     * authenticated non-members, 404 for unknown/missing files.
     */
    @GetMapping("/{attachmentId}/download")
    public ResponseEntity<Resource> download(
            @PathVariable String attachmentId,
            @AuthenticationPrincipal UserDetails userDetails) {
        boolean isAdmin = userDetails.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        AttachmentService.AttachmentDownload download =
                attachmentService.download(attachmentId, userDetails.getUsername(), isAdmin);
        return fileResponse(download);
    }

    /**
     * Legacy path for records created before the authenticated download endpoint
     * existed. Same authorization rules as the id-based download.
     */
    @GetMapping("/by-name/{storedName}/download")
    public ResponseEntity<Resource> downloadByStoredName(
            @PathVariable String storedName,
            @AuthenticationPrincipal UserDetails userDetails) {
        boolean isAdmin = userDetails.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        AttachmentService.AttachmentDownload download =
                attachmentService.downloadByStoredName(storedName, userDetails.getUsername(), isAdmin);
        return fileResponse(download);
    }

    @GetMapping
    public ResponseEntity<List<AttachmentResponse>> listByContext(
            @RequestParam String contextType,
            @RequestParam String contextId,
            @AuthenticationPrincipal UserDetails userDetails) {
        boolean isAdmin = userDetails.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        return ResponseEntity.ok(attachmentService.listByContext(
                contextType, contextId, userDetails.getUsername(), isAdmin));
    }

    private ResponseEntity<Resource> fileResponse(AttachmentService.AttachmentDownload download) {
        return ResponseEntity.ok()
                .contentType(download.mediaType())
                .contentLength(download.size())
                // Force download rather than inline rendering to avoid content sniffing.
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + sanitizeHeader(download.originalName()) + "\"")
                .body(download.resource());
    }

    /** Header values must not contain CR/LF — strip anything outside a safe set. */
    private String sanitizeHeader(String value) {
        String safe = value == null ? "file" : value.replaceAll("[^\\x20-\\x7E]", "_");
        return safe.replaceAll("[\\r\\n\"]", "_");
    }
}
