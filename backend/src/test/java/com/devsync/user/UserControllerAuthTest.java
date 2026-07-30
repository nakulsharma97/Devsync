package com.devsync.user;

import com.devsync.user.dto.UserResponse;
import com.devsync.user.dto.UpdateUserRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(UserController.class)
class UserControllerAuthTest {

    @Autowired private MockMvc mockMvc;

    @MockitoBean private UserService userService;

    @Test
    @WithMockUser(username = "user-1")
    void getUser_shouldReturn200_WhenOwnProfile() throws Exception {
        UserResponse ownProfile = UserResponse.builder()
                .id("user-1").email("me@test.com").fullName("Me")
                .username("meuser").role("USER").build();

        when(userService.getUserByIdWithAuth("user-1", "user-1"))
                .thenReturn(ownProfile);

        mockMvc.perform(get("/api/users/user-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("user-1"))
                .andExpect(jsonPath("$.email").value("me@test.com"));
    }

    @Test
    @WithMockUser(username = "user-1")
    void getUser_shouldReturn200_WhenSharedProject() throws Exception {
        UserResponse otherUser = UserResponse.builder()
                .id("user-2").email("other@test.com").fullName("Other User")
                .username("otheruser").role("USER").build();

        when(userService.getUserByIdWithAuth("user-2", "user-1"))
                .thenReturn(otherUser);

        mockMvc.perform(get("/api/users/user-2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("user-2"))
                .andExpect(jsonPath("$.fullName").value("Other User"));
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
