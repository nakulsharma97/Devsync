package com.devsync.publicapi;

import com.devsync.analytics.AnalyticsService;
import com.devsync.common.ResourceNotFoundException;
import com.devsync.publicapi.dto.PublicProfileResponse;
import com.devsync.user.entity.User;
import com.devsync.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Serves safe public profile data for the shareable profile page. Only users
 * that exist and are not deleted/blocked are reachable; private fields (email,
 * internal ids, refresh/session data) are never included.
 */
@Service
@RequiredArgsConstructor
public class PublicProfileService {

    private final UserRepository userRepository;
    private final AnalyticsService analyticsService;

    @Transactional(readOnly = true)
    public PublicProfileResponse getPublicProfile(String username) {
        User user = userRepository.findByUsername(username)
                .filter(u -> !u.isDeleted() && !u.isBlocked())
                .orElseThrow(() -> new ResourceNotFoundException("User", username));

        return PublicProfileResponse.builder()
                .username(user.getUsername())
                .displayName(user.getFullName())
                .avatarUrl(user.getAvatarUrl())
                .bio(user.getBio())
                .jobTitle(user.getJobTitle())
                .company(user.getCompany())
                .location(user.getLocation())
                .memberSince(user.getCreatedAt())
                .presenceStatus(user.getPresenceStatus() == null ? null : user.getPresenceStatus().name())
                .contributions(analyticsService.getUserContributions(user.getId()))
                .build();
    }
}
