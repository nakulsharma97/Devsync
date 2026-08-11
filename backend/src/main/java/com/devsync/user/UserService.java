package com.devsync.user;

import com.devsync.common.ResourceNotFoundException;
import com.devsync.presence.PresenceService;
import com.devsync.project.repository.ProjectMemberRepository;
import com.devsync.user.dto.PublicUserResponse;
import com.devsync.user.dto.UpdateUserRequest;
import com.devsync.user.dto.UserResponse;
import com.devsync.user.entity.User;
import com.devsync.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final PresenceService presenceService;

    public UserResponse getUserById(String id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", id));
        return toResponse(user);
    }

    /**
     * Looks up a user profile but only allows access if the requesting user
     * has a relationship (shared project) with the target user, or is viewing
     * their own profile. Other users always get the privacy-scoped
     * {@link PublicUserResponse} — email and account metadata stay private.
     */
    public PublicUserResponse getUserByIdWithAuth(String targetUserId, String requestingUserId) {
        User user = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", targetUserId));

        // Allow viewing own profile
        if (targetUserId.equals(requestingUserId)) {
            return toPublicResponse(user);
        }

        // Check for shared project membership
        List<String> requestingProjectIds = projectMemberRepository.findProjectIdsByUserId(requestingUserId);
        List<String> targetProjectIds = projectMemberRepository.findProjectIdsByUserId(targetUserId);

        boolean shareProject = requestingProjectIds.stream().anyMatch(targetProjectIds::contains);
        if (!shareProject) {
            throw new IllegalArgumentException("You do not have a shared project with this user");
        }

        return toPublicResponse(user);
    }

    @Transactional
    public UserResponse updateUser(String id, UpdateUserRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", id));

        if (request.getFullName() != null) user.setFullName(request.getFullName());
        if (request.getUsername() != null) {
            if (!user.getUsername().equals(request.getUsername()) &&
                    userRepository.countByUsername(request.getUsername()) > 0) {
                throw new IllegalArgumentException("Username already taken");
            }
            user.setUsername(request.getUsername());
        }
        if (request.getAvatarUrl() != null) user.setAvatarUrl(request.getAvatarUrl());
        if (request.getBio() != null) user.setBio(request.getBio());
        if (request.getJobTitle() != null) user.setJobTitle(request.getJobTitle());
        if (request.getCompany() != null) user.setCompany(request.getCompany());
        if (request.getLocation() != null) user.setLocation(request.getLocation());
        if (request.getGithubUrl() != null) user.setGithubUrl(request.getGithubUrl());
        if (request.getTwitterUrl() != null) user.setTwitterUrl(request.getTwitterUrl());
        if (request.getWebsiteUrl() != null) user.setWebsiteUrl(request.getWebsiteUrl());

        user = userRepository.save(user);
        return toResponse(user);
    }

    /**
     * Public directory search — results are privacy-scoped and never include
     * email, account metadata or login timestamps.
     */
    public List<PublicUserResponse> searchUsers(String query, String excludeUserId) {
        if (query == null || query.isBlank()) {
            // Deleted accounts are hidden from normal user searches; the query
            // runs in the database rather than loading the whole users table.
            return userRepository.findActiveUsers().stream()
                    .filter(u -> !u.getId().equals(excludeUserId))
                    .map(this::toPublicResponse)
                    .toList();
        }
        return userRepository.searchUsers(query, excludeUserId).stream()
                .map(this::toPublicResponse)
                .toList();
    }

    public List<UserResponse> getAllUsers() {
        return userRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    /** Full account view — reserved for the account owner and platform admins. */
    public UserResponse toResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .username(user.getUsername())
                .avatarUrl(user.getAvatarUrl())
                .bio(user.getBio())
                .jobTitle(user.getJobTitle())
                .company(user.getCompany())
                .location(user.getLocation())
                .githubUrl(user.getGithubUrl())
                .twitterUrl(user.getTwitterUrl())
                .websiteUrl(user.getWebsiteUrl())
                .role(user.getRole().name())
                .emailVerified(user.isEmailVerified())
                .authProvider(user.getAuthProvider())
                .createdAt(user.getCreatedAt())
                .lastLoginAt(user.getLastLoginAt())
                .presenceStatus(presenceService.effectiveStatus(user))
                .lastActiveAt(user.getLastActiveAt())
                .build();
    }

    /** Privacy-scoped profile for search results and other users. */
    public PublicUserResponse toPublicResponse(User user) {
        return PublicUserResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .fullName(user.getFullName())
                .avatarUrl(user.getAvatarUrl())
                .bio(user.getBio())
                .jobTitle(user.getJobTitle())
                .company(user.getCompany())
                .location(user.getLocation())
                .githubUrl(user.getGithubUrl())
                .twitterUrl(user.getTwitterUrl())
                .websiteUrl(user.getWebsiteUrl())
                .createdAt(user.getCreatedAt())
                .presenceStatus(presenceService.effectiveStatus(user))
                .lastActiveAt(user.getLastActiveAt())
                .build();
    }
}
