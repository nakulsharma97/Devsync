package com.devsync.service;

import com.devsync.dto.UserProfileRequest;
import com.devsync.entity.User;
import com.devsync.exception.BadRequestException;
import com.devsync.exception.ResourceNotFoundException;
import com.devsync.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public User getUserById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
    }

    @Transactional(readOnly = true)
    public User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));
    }

    @Transactional
    public User updateProfile(Long userId, UserProfileRequest request) {
        User user = getUserById(userId);

        if (request.getFullName() != null) {
            user.setFullName(request.getFullName());
        }
        if (request.getUsername() != null) {
            if (!request.getUsername().equals(user.getUsername()) &&
                    userRepository.existsByUsername(request.getUsername())) {
                throw new BadRequestException("Username already taken");
            }
            user.setUsername(request.getUsername());
        }
        if (request.getBio() != null) {
            user.setBio(request.getBio());
        }
        if (request.getLocation() != null) {
            user.setLocation(request.getLocation());
        }
        if (request.getGithubUsername() != null) {
            user.setGithubUsername(request.getGithubUsername());
        }
        if (request.getLinkedinLink() != null) {
            user.setLinkedinLink(request.getLinkedinLink());
        }
        if (request.getPortfolioWebsite() != null) {
            user.setPortfolioWebsite(request.getPortfolioWebsite());
        }

        return userRepository.save(user);
    }

    @Transactional
    public void updateAvatar(Long userId, String avatarUrl) {
        User user = getUserById(userId);
        user.setAvatarUrl(avatarUrl);
        userRepository.save(user);
    }

    @Transactional
    public void updateBanner(Long userId, String bannerUrl) {
        User user = getUserById(userId);
        user.setBannerUrl(bannerUrl);
        userRepository.save(user);
    }

    @Transactional(readOnly = true)
    public List<User> searchUsers(String query) {
        return userRepository.search(query);
    }
}
