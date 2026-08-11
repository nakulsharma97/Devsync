package com.devsync.auth;

import com.devsync.user.entity.User;
import com.devsync.user.repository.UserRepository;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.charset.StandardCharsets;
import java.util.Date;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end security tests with REAL signed JWTs against the full Spring
 * context and H2 database. No service mocking.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SecurityIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private JwtTokenProvider jwtTokenProvider;

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    private String normalUserId;
    private String otherUserId;
    private String adminId;

    @BeforeEach
    void seed() {
        userRepository.deleteAll();
        normalUserId = createUser("normal@test.com", User.Role.USER).getId();
        otherUserId = createUser("other@test.com", User.Role.USER).getId();
        adminId = createUser("admin@test.com", User.Role.ADMIN).getId();
    }

    private User createUser(String email, User.Role role) {
        User user = User.builder()
                .email(email)
                .password("$2a$10$abcdefghijklmnopqrstuv")
                .fullName("User " + email)
                .username(email.split("@")[0])
                .role(role)
                .emailVerified(true)
                .authProvider("email")
                .build();
        user.setId(null);
        return userRepository.save(user);
    }

    private String bearer(String token) {
        return "Bearer " + token;
    }

    // ── Authentication: 401 ─────────────────────────────────

    @Test
    void protectedEndpoint_shouldReturn401_WhenNoToken() throws Exception {
        mockMvc.perform(get("/api/users/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void protectedEndpoint_shouldReturn401_WhenMalformedToken() throws Exception {
        mockMvc.perform(get("/api/users/me")
                        .header("Authorization", bearer("not-a-jwt")))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void protectedEndpoint_shouldReturn401_WhenTokenSignedWithWrongKey() throws Exception {
        String forged = Jwts.builder()
                .issuer("devsync")
                .subject(normalUserId)
                .claim("type", "access")
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + 60_000))
                .signWith(Keys.hmacShaKeyFor(
                        "attacker-controlled-secret-key-that-is-long-enough-for-hmac-sha-256".getBytes(StandardCharsets.UTF_8)))
                .compact();
        mockMvc.perform(get("/api/users/me")
                        .header("Authorization", bearer(forged)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void protectedEndpoint_shouldReturn401_WhenTokenExpired() throws Exception {
        String expired = Jwts.builder()
                .issuer("devsync")
                .subject(normalUserId)
                .claim("type", "access")
                .issuedAt(new Date(System.currentTimeMillis() - 10_000))
                .expiration(new Date(System.currentTimeMillis() - 5_000))
                .signWith(Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8)))
                .compact();
        mockMvc.perform(get("/api/users/me")
                        .header("Authorization", bearer(expired)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void protectedEndpoint_shouldReturn401_WhenRefreshTokenUsedAsAccessToken() throws Exception {
        // The refresh token is cryptographically valid — but must never authenticate requests.
        String refresh = jwtTokenProvider.generateRefreshToken(normalUserId);
        mockMvc.perform(get("/api/users/me")
                        .header("Authorization", bearer(refresh)))
                .andExpect(status().isUnauthorized());
    }

    // ── Blocked / deleted accounts ──────────────────────────

    @Test
    void protectedEndpoint_shouldReturn401_WhenUserBlocked() throws Exception {
        User blocked = userRepository.findById(normalUserId).orElseThrow();
        blocked.setBlocked(true);
        userRepository.save(blocked);

        String token = jwtTokenProvider.generateAccessToken(normalUserId, "normal@test.com");
        mockMvc.perform(get("/api/users/me")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void protectedEndpoint_shouldReturn401_WhenUserDeleted() throws Exception {
        User deleted = userRepository.findById(normalUserId).orElseThrow();
        deleted.setDeleted(true);
        userRepository.save(deleted);

        String token = jwtTokenProvider.generateAccessToken(normalUserId, "normal@test.com");
        mockMvc.perform(get("/api/users/me")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isUnauthorized());
    }

    // ── Authorization: 403 / escalation ─────────────────────

    @Test
    void adminEndpoint_shouldReturn403_ForNormalUser() throws Exception {
        String token = jwtTokenProvider.generateAccessToken(normalUserId, "normal@test.com");
        mockMvc.perform(get("/api/admin/analytics")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminEndpoint_shouldReturn401_WithoutToken() throws Exception {
        mockMvc.perform(get("/api/admin/analytics"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void adminEndpoint_shouldReturn200_ForAdmin() throws Exception {
        String token = jwtTokenProvider.generateAccessToken(adminId, "admin@test.com");
        mockMvc.perform(get("/api/admin/analytics")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalUsers").value(3));
    }

    // ── IDOR ────────────────────────────────────────────────

    @Test
    void userProfile_shouldBeVisible_ToOwner() throws Exception {
        String token = jwtTokenProvider.generateAccessToken(normalUserId, "normal@test.com");
        mockMvc.perform(get("/api/users/" + normalUserId)
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(normalUserId));
    }

    @Test
    void userProfile_shouldNotLeak_ToUnrelatedUser() throws Exception {
        // User A must not read user B's profile when they share no project.
        String token = jwtTokenProvider.generateAccessToken(normalUserId, "normal@test.com");
        mockMvc.perform(get("/api/users/" + otherUserId)
                        .header("Authorization", bearer(token)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("You do not have a shared project with this user"));
    }

    @Test
    void removedOAuthCallbackEndpoint_shouldReturn404() throws Exception {
        // Client-supplied email login was removed — must not exist anymore.
        mockMvc.perform(get("/api/auth/oauth/callback"))
                .andExpect(status().isNotFound());
    }

    // ── Attachment download authorization ────────────────────

    @Test
    void attachmentDownload_shouldReturn401_WithoutToken() throws Exception {
        mockMvc.perform(get("/api/attachments/att-1/download"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void attachmentDownload_shouldReturn404_ForUnknownAttachment() throws Exception {
        String token = jwtTokenProvider.generateAccessToken(normalUserId, "normal@test.com");
        mockMvc.perform(get("/api/attachments/does-not-exist/download")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isNotFound());
    }

    @Test
    void attachmentUploadThenDownload_authorizesByOwner() throws Exception {
        String uploader = jwtTokenProvider.generateAccessToken(normalUserId, "normal@test.com");
        byte[] png = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D};

        String body = mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .multipart("/api/attachments")
                        .file(new org.springframework.mock.web.MockMultipartFile(
                                "file", "photo.png", "image/png", png))
                        .param("contextType", "MESSAGE")
                        .param("contextId", "dm_" + otherUserId)
                        .header("Authorization", bearer(uploader)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        String id = com.jayway.jsonpath.JsonPath.read(body, "$.id");
        // The response URL must point at the authenticated endpoint — never /uploads.
        assertThat(com.jayway.jsonpath.JsonPath.read(body, "$.url").toString())
                .isEqualTo("/api/attachments/" + id + "/download");

        // Uploader downloads it.
        mockMvc.perform(get("/api/attachments/" + id + "/download")
                        .header("Authorization", bearer(uploader)))
                .andExpect(status().isOk());

        // A different user (no shared project, not the uploader) is forbidden.
        String other = jwtTokenProvider.generateAccessToken(otherUserId, "other@test.com");
        mockMvc.perform(get("/api/attachments/" + id + "/download")
                        .header("Authorization", bearer(other)))
                .andExpect(status().isForbidden());
    }

    // ── Actuator exposure ────────────────────────────────────

    @Test
    void actuatorHealth_shouldBePublic() throws Exception {
        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk());
    }

    @Test
    void actuatorSensitiveEndpoints_shouldNotBeExposed() throws Exception {
        // Only health/info are exposed; env/configprops must stay behind auth.
        mockMvc.perform(get("/actuator/env"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/actuator/configprops"))
                .andExpect(status().isUnauthorized());
    }
}
