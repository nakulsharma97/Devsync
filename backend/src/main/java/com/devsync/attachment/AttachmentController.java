package com.devsync.attachment;

import com.devsync.attachment.dto.AttachmentResponse;
import lombok.RequiredArgsConstructor;
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

    @GetMapping
    public ResponseEntity<List<AttachmentResponse>> listByContext(
            @RequestParam String contextType,
            @RequestParam String contextId) {
        return ResponseEntity.ok(attachmentService.listByContext(contextType, contextId));
    }
}
