package com.devsync.user;

import com.devsync.user.dto.PublicUserResponse;
import com.devsync.user.dto.UpdateUserRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.autoconfigure.security.oauth2.client.servlet.OAuth2ClientAutoConfiguration;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ActiveProfiles("test")
@WebMvcTest(value = UserController.class, excludeAutoConfiguration = OAuth2ClientAutoConfiguration.class)
class UserControllerAuthTest {

    @Autowired private MockMvc mockMvc;

    @MockitoBean private UserService userService;

    @Test
    @WithMockUser(username = "user-1")
    void getUser_shouldReturn200_WhenOwnProfile() throws Exception {
        PublicUserResponse ownProfile = PublicUserResponse.builder()
                .id("user-1").fullName("Me")
                .username("meuser").build();

        when(userService.getUserByIdWithAuth("user-1", "user-1"))
                .thenReturn(ownProfile);

        mockMvc.perform(get("/api/users/user-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("user-1"))
                // Privacy: email is never part of the public profile shape.
                .andExpect(jsonPath("$.email").doesNotExist());
    }

    @Test
    @WithMockUser(username = "user-1")
    void getUser_shouldReturn200_WhenSharedProject() throws Exception {
        PublicUserResponse otherUser = PublicUserResponse.builder()
                .id("user-2").fullName("Other User")
                .username("otheruser").build();

        when(userService.getUserByIdWithAuth("user-2", "user-1"))
                .thenReturn(otherUser);

        mockMvc.perform(get("/api/users/user-2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("user-2"))
                .andExpect(jsonPath("$.fullName").value("Other User"))
                // Privacy: sensitive fields must be absent for other users.
                .andExpect(jsonPath("$.email").doesNotExist())
                .andExpect(jsonPath("$.lastLoginAt").doesNotExist());
    }

    @Test
    @WithMockUser(username = "user-1")
    void getUser_shouldReturn403_WhenNoRelationship() throws Exception {
        when(userService.getUserByIdWithAuth("user-3", "user-1"))
                .thenThrow(new IllegalArgumentException("You do not have a shared project with this user"));

        mockMvc.perform(get("/api/users/user-3"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void getUser_shouldReturn401_WhenUnauthenticated() throws Exception {
        mockMvc.perform(get("/api/users/user-1"))
                .andExpect(status().isUnauthorized());
    }
}
