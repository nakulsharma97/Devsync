package com.devsync.audit;

import com.devsync.audit.dto.AuditLogResponse;
import com.devsync.audit.entity.AuditAction;
import com.devsync.audit.entity.AuditLog;
import com.devsync.audit.entity.AuditStatus;
import com.devsync.audit.repository.AuditLogRepository;
import com.devsync.common.PageResponse;
import com.devsync.common.ResourceNotFoundException;
import com.devsync.user.entity.User;
import com.devsync.user.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.Instant;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AuditLogService {

    private static final int MAX_PAGE_SIZE = 100;
    private static final int EXPORT_LIMIT = 5000;

    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;

    /**
     * Records an audit entry. IP / device / browser are captured from the current
     * HTTP request when available (null-safe in unit tests and background jobs).
     */
    @Transactional
    public void record(String performedBy, String targetUserId, AuditAction action,
                       AuditStatus status, String details) {
        String userAgent = userAgent();
        auditLogRepository.save(AuditLog.builder()
                .performedBy(performedBy)
                .targetUser(targetUserId)
                .action(action)
                .status(status)
                .ipAddress(clientIp())
                .device(device(userAgent))
                .browser(browser(userAgent))
                .details(details)
                .build());
    }

    @Transactional(readOnly = true)
    public PageResponse<AuditLogResponse> getLogs(int page, int size, String sortBy, String sortDir,
                                                  String search, String action, String status,
                                                  String adminId, String userId, String from, String to) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        String sortField = normalizeSortField(sortBy);
        Sort.Direction direction = "asc".equalsIgnoreCase(sortDir) ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(safePage, safeSize, Sort.by(direction, sortField));

        AuditAction actionFilter = parseAction(action);
        AuditStatus statusFilter = parseStatus(status);
        Instant fromInstant = parseInstant(from, "Invalid from date");
        Instant toInstant = parseInstant(to, "Invalid to date");
        String searchFilter = (search == null || search.isBlank()) ? null : search.trim();

        // Resolve user-name/email search to IDs to avoid cross-table collation issues
        Set<String> userSearchIds = resolveUserSearchIds(searchFilter);

        Page<AuditLog> logs = auditLogRepository.searchAdminLogs(
                actionFilter, blankToNull(adminId), blankToNull(userId), statusFilter,
                fromInstant, toInstant, searchFilter, userSearchIds, pageable);

        List<AuditLog> content = logs.getContent();
        Map<String, User> userMap = batchUsers(content);

        List<AuditLogResponse> items = content.stream()
                .map(l -> toResponse(l, userMap))
                .toList();

        return PageResponse.<AuditLogResponse>builder()
                .content(items)
                .page(logs.getNumber())
                .size(logs.getSize())
                .totalElements(logs.getTotalElements())
                .totalPages(logs.getTotalPages())
                .last(logs.isLast())
                .build();
    }

    @Transactional(readOnly = true)
    public AuditLogResponse getLog(String id) {
        AuditLog log = auditLogRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("AuditLog", id));
        Map<String, User> userMap = batchUsers(List.of(log));
        return toResponse(log, userMap);
    }

    /**
     * Exports filtered audit logs (capped at EXPORT_LIMIT rows) as a response list.
     */
    @Transactional(readOnly = true)
    public List<AuditLogResponse> exportLogs(String search, String action, String status,
                                             String adminId, String userId, String from, String to) {
        AuditAction actionFilter = parseAction(action);
        AuditStatus statusFilter = parseStatus(status);
        Instant fromInstant = parseInstant(from, "Invalid from date");
        Instant toInstant = parseInstant(to, "Invalid to date");
        String searchFilter = (search == null || search.isBlank()) ? null : search.trim();
        Set<String> userSearchIds = resolveUserSearchIds(searchFilter);

        Page<AuditLog> logs = auditLogRepository.searchAdminLogs(
                actionFilter, blankToNull(adminId), blankToNull(userId), statusFilter,
                fromInstant, toInstant, searchFilter, userSearchIds,
                PageRequest.of(0, EXPORT_LIMIT, Sort.by(Sort.Direction.DESC, "createdAt")));

        Map<String, User> userMap = batchUsers(logs.getContent());
        return logs.getContent().stream()
                .map(l -> toResponse(l, userMap))
                .toList();
    }

    public String toCsv(List<AuditLogResponse> logs) {
        StringBuilder sb = new StringBuilder();
        sb.append("id,created_at,action,status,performed_by,performed_by_name,target_user,target_user_name,ip_address,device,browser,details\n");
        for (AuditLogResponse l : logs) {
            sb.append(csv(l.getId())).append(',')
                    .append(csv(l.getCreatedAt() != null ? l.getCreatedAt().toString() : "")).append(',')
                    .append(csv(l.getAction())).append(',')
                    .append(csv(l.getStatus())).append(',')
                    .append(csv(l.getPerformedBy())).append(',')
                    .append(csv(l.getPerformedByName())).append(',')
                    .append(csv(l.getTargetUserId())).append(',')
                    .append(csv(l.getTargetUserName())).append(',')
                    .append(csv(l.getIpAddress())).append(',')
                    .append(csv(l.getDevice())).append(',')
                    .append(csv(l.getBrowser())).append(',')
                    .append(csv(l.getDetails())).append('\n');
        }
        return sb.toString();
    }

    private String csv(String value) {
        if (value == null) return "";
        String escaped = value.replace("\"", "\"\"");
        if (escaped.contains(",") || escaped.contains("\"") || escaped.contains("\n")) {
            return "\"" + escaped + "\"";
        }
        return escaped;
    }

    /**
     * Resolves a user-name/email search term to matching user IDs.
     * Returns null if no search term is provided (meaning "no user-name filter").
     * Returns an empty set if the search term doesn't match any users (meaning "no results").
     */
    private Set<String> resolveUserSearchIds(String search) {
        if (search == null || search.isBlank()) return null;
        // Search users by fullName or email (case-insensitive via LOWER in JPQL)
        List<User> matched = userRepository
                .findByFullNameContainingIgnoreCaseOrEmailContainingIgnoreCase(search, search);
        if (matched.isEmpty()) return Set.of(); // No matching users → no results
        return matched.stream().map(User::getId).collect(Collectors.toSet());
    }

    private Map<String, User> batchUsers(List<AuditLog> logs) {
        if (logs.isEmpty()) return Collections.emptyMap();
        Set<String> ids = new HashSet<>();
        logs.forEach(l -> {
            if (l.getPerformedBy() != null) ids.add(l.getPerformedBy());
            if (l.getTargetUser() != null) ids.add(l.getTargetUser());
        });
        if (ids.isEmpty()) return Collections.emptyMap();
        return userRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(User::getId, u -> u));
    }

    private AuditLogResponse toResponse(AuditLog log, Map<String, User> userMap) {
        User performer = log.getPerformedBy() != null ? userMap.get(log.getPerformedBy()) : null;
        User target = log.getTargetUser() != null ? userMap.get(log.getTargetUser()) : null;
        return AuditLogResponse.builder()
                .id(log.getId())
                .performedBy(log.getPerformedBy())
                .performedByName(performer != null ? performer.getFullName() : null)
                .targetUserId(log.getTargetUser())
                .targetUserName(target != null ? target.getFullName() : null)
                .action(log.getAction().name())
                .status(log.getStatus().name())
                .ipAddress(log.getIpAddress())
                .device(log.getDevice())
                .browser(log.getBrowser())
                .details(log.getDetails())
                .createdAt(log.getCreatedAt())
                .build();
    }

    private String clientIp() {
        try {
            ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs == null) return null;
            HttpServletRequest request = attrs.getRequest();
            String forwarded = request.getHeader("X-Forwarded-For");
            if (forwarded != null && !forwarded.isBlank()) {
                return forwarded.split(",")[0].trim();
            }
            return request.getRemoteAddr();
        } catch (Exception e) {
            return null;
        }
    }

    private String userAgent() {
        try {
            ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs == null) return null;
            return attrs.getRequest().getHeader("User-Agent");
        } catch (Exception e) {
            return null;
        }
    }

    private String browser(String userAgent) {
        if (userAgent == null) return null;
        String ua = userAgent.toLowerCase();
        if (ua.contains("edg/") || ua.contains("edge")) return "Edge";
        if (ua.contains("chrome")) return "Chrome";
        if (ua.contains("firefox")) return "Firefox";
        if (ua.contains("safari")) return "Safari";
        return "Unknown";
    }

    private String device(String userAgent) {
        if (userAgent == null) return null;
        String ua = userAgent.toLowerCase();
        if (ua.contains("ipad") || ua.contains("tablet")) return "Tablet";
        if (ua.contains("mobile") || ua.contains("android") || ua.contains("iphone")) return "Mobile";
        return "Desktop";
    }

    private AuditAction parseAction(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return AuditAction.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid action filter: " + raw);
        }
    }

    private AuditStatus parseStatus(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return AuditStatus.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid status filter: " + raw);
        }
    }

    private Instant parseInstant(String raw, String message) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return Instant.parse(raw);
        } catch (Exception e) {
            throw new IllegalArgumentException(message + ": " + raw);
        }
    }

    private String blankToNull(String value) {
        return (value == null || value.isBlank()) ? null : value.trim();
    }

    private String normalizeSortField(String sortBy) {
        if (sortBy == null || sortBy.isBlank()) return "createdAt";
        return switch (sortBy.toLowerCase()) {
            case "action" -> "action";
            case "status" -> "status";
            case "performedby" -> "performedBy";
            default -> "createdAt";
        };
    }
}
