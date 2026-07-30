package com.devsync.user;

import com.devsync.common.ResourceNotFoundException;
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

    public UserResponse getUserById(String id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", id));
        return toResponse(user);
    }

    @Transactional
    public UserResponse updateUser(String id, UpdateUserRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", id));

        if (request.getFullName() != null) user.setFullName(request.getFullName());
        if (request.getUsername() != null) {
            if (!user.getUsername().equals(request.getUsername()) &&
                    userRepository.existsByUsername(request.getUsername())) {
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

    public List<UserResponse> searchUsers(String query, String excludeUserId) {
        if (query == null || query.isBlank()) {
            return userRepository.findAll().stream()
                    .filter(u -> !u.getId().equals(excludeUserId))
                    .map(this::toResponse)
                    .toList();
        }
        return userRepository.searchUsers(query, excludeUserId).stream()
                .map(this::toResponse)
                .toList();
    }

    public List<UserResponse> getAllUsers() {
        return userRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    private UserResponse toResponse(User user) {
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
                .build();
    }
}
