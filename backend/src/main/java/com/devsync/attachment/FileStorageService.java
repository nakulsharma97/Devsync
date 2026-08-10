package com.devsync.attachment;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

/**
 * Stores uploaded files on the local filesystem under app.upload.dir and serves
 * them at /uploads/{storedName} via the static resource handler in WebConfig.
 */
@Service
public class FileStorageService {

    @Value("${app.upload.dir:./uploads}")
    private String uploadDir;

    private Path root;

    @PostConstruct
    public void init() {
        root = Paths.get(uploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(root);
        } catch (IOException e) {
            throw new IllegalStateException("Could not initialize upload directory " + root, e);
        }
    }

    /**
     * Stores the uploaded file and returns the generated stored name.
     */
    public String store(MultipartFile file, String originalName) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }
        String safeName = originalName != null ? originalName.replaceAll("[^a-zA-Z0-9._-]", "_") : "file";
        String storedName = UUID.randomUUID() + "-" + safeName;
        Path target = root.resolve(storedName).normalize();
        if (!target.startsWith(root)) {
            throw new IllegalArgumentException("Invalid file name");
        }
        try {
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new IllegalStateException("Failed to store file", e);
        }
        return storedName;
    }

    /**
     * Stored names are generated server-side (UUID + sanitized original name), so
     * only a strict safe character set is allowed when resolving. Anything else
     * (slashes, backslashes, dot-dot, encoded traversal) is rejected outright.
     */
    private static final java.util.regex.Pattern SAFE_STORED_NAME =
            java.util.regex.Pattern.compile("^[A-Za-z0-9._-]{1,255}$");

    /**
     * Resolves a stored name to a filesystem path, guarding against traversal.
     */
    public Path resolve(String storedName) {
        if (storedName == null || !SAFE_STORED_NAME.matcher(storedName).matches()) {
            throw new IllegalArgumentException("Invalid file name");
        }
        Path target = root.resolve(storedName).normalize();
        if (!target.startsWith(root)) {
            throw new IllegalArgumentException("Invalid file name");
        }
        return target;
    }

    public Path getRoot() {
        return root;
    }
}
