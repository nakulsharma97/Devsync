package com.devsync.auth;

import com.devsync.auth.repository.PendingRegistrationRepository;
import com.devsync.auth.repository.RefreshTokenRepository;
import com.devsync.user.entity.User;
import com.devsync.user.repository.UserRepository;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end registration and OTP-login lifecycle over HTTP against the real
 * stack (H2, full Spring context). EmailService is mocked so the OTP code can
 * be captured from the sent email and replayed into the verify endpoints.
 *
 * This pins the contract the frontend AuthContext depends on: /auth/register/*
 * confirms registration codes, /auth/otp/* confirms login codes, and the two
 * are not interchangeable.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class RegistrationFlowIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private PendingRegistrationRepository pendingRegistrationRepository;
    @Autowired private RefreshTokenRepository refreshTokenRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    @MockitoBean private EmailService emailService;

    private static final String EMAIL = "reg@test.dev";
    private static final String PASSWORD = "Secure1@pass";
    private static final String REGISTER_BODY =
            "{\"email\":\"" + EMAIL + "\",\"password\":\"" + PASSWORD
            + "\",\"fullName\":\"Reg User\",\"username\":\"reguser\"}";

    @BeforeEach
    void clean() {
        userRepository.deleteAll();
        pendingRegistrationRepository.deleteAll();
        refreshTokenRepository.deleteAll();
    }

    /** Drives initiate and returns the OTP captured from the (mocked) email. */
    private String initiateAndCaptureOtp() throws Exception {
        mockMvc.perform(post("/api/auth/register/initiate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(REGISTER_BODY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Verification code sent to your email"));

        ArgumentCaptor<String> otp = ArgumentCaptor.forClass(String.class);
        verify(emailService).sendOtpEmail(anyString(), otp.capture());
        assertThat(otp.getValue()).matches("\\d{6}");
        return otp.getValue();
    }

    @Test
    void registrationLifecycle_wrongOtpRejected_thenCorrectOtpCreatesAccount_sessionAndLoginWork() throws Exception {
        String otp = initiateAndCaptureOtp();
        String wrongOtp = otp.equals("000000") ? "000001" : "000000";

        // A wrong code must be rejected and must not create the account.
        mockMvc.perform(post("/api/auth/register/verify")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + EMAIL + "\",\"otp\":\"" + wrongOtp + "\"}"))
                .andExpect(status().isUnauthorized());
        assertThat(userRepository.findByEmail(EMAIL)).isEmpty();

        // The correct code creates the account and opens the session via cookies.
        MvcResult verified = mockMvc.perform(post("/api/auth/register/verify")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + EMAIL + "\",\"otp\":\"" + otp + "\"}"))
                .andExpect(status().isOk())
                // Cookie-based auth: tokens travel as HttpOnly cookies, not the body.
                .andExpect(jsonPath("$.accessToken").doesNotExist())
                .andExpect(jsonPath("$.refreshToken").doesNotExist())
                .andExpect(jsonPath("$.user.email").value(EMAIL))
                .andExpect(jsonPath("$.user.username").value("reguser"))
                .andExpect(cookie().exists(AccessTokenCookie.NAME))
                .andExpect(cookie().exists(RefreshTokenCookie.NAME))
                .andReturn();

        // The pending registration is consumed and the account persisted with the
        // pre-hashed password — stored hashed exactly once, still verifiable.
        assertThat(pendingRegistrationRepository.findByEmail(EMAIL)).isEmpty();
        User user = userRepository.findByEmail(EMAIL).orElseThrow();
        assertThat(user.getUsername()).isEqualTo("reguser");
        assertThat(passwordEncoder.matches(PASSWORD, user.getPassword())).isTrue();

        // The new access token authorizes API calls.
        Cookie accessCookie = verified.getResponse().getCookie(AccessTokenCookie.NAME);
        assertThat(accessCookie).isNotNull();
        mockMvc.perform(get("/api/users/me").header("Authorization", "Bearer " + accessCookie.getValue()))
                .andExpect(status().isOk());

        // After logout, the same credentials must work for a normal password login.
        mockMvc.perform(post("/api/auth/logout")
                        .cookie(verified.getResponse().getCookie(RefreshTokenCookie.NAME))
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + EMAIL + "\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isOk())
                .andExpect(cookie().exists(RefreshTokenCookie.NAME));
    }

    @Test
    void registrationInitiate_rejectsExistingAccount_andSendsNoEmail() throws Exception {
        userRepository.save(User.builder()
                .email(EMAIL)
                .password(passwordEncoder.encode("Existing1@pass"))
                .fullName("Existing User")
                .username("existing")
                .role(User.Role.USER)
                .emailVerified(true)
                .authProvider("email")
                .build());

        // The initiate path reports "email already in use" as a plain AuthException
        // (401) — unlike registerWithHashedPassword, which uses 409. Either way the
        // account must not be revealed via an OTP email being sent.
        mockMvc.perform(post("/api/auth/register/initiate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(REGISTER_BODY))
                .andExpect(status().is4xxClientError());

        verify(emailService, never()).sendOtpEmail(anyString(), anyString());
    }

    @Test
    void registrationResend_withoutPendingRegistration_isRejected() throws Exception {
        mockMvc.perform(post("/api/auth/register/resend")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + EMAIL + "\"}"))
                .andExpect(status().isUnauthorized());

        verify(emailService, never()).sendOtpEmail(anyString(), anyString());
    }

    @Test
    void registrationInitiate_whenSmtpUnavailable_failsWithoutCreatingAnything() throws Exception {
        doThrow(new EmailService.EmailNotConfiguredException("SMTP down"))
                .when(emailService).sendOtpEmail(anyString(), anyString());

        // The failure must propagate (never a 200 "check your email" lie).
        mockMvc.perform(post("/api/auth/register/initiate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(REGISTER_BODY))
                .andExpect(status().is5xxServerError());

        // No account can exist from a registration that never sent its code.
        assertThat(userRepository.findByEmail(EMAIL)).isEmpty();
    }

    @Test
    void otpLoginLifecycle_sendThenVerify_opensSession() throws Exception {
        userRepository.save(User.builder()
                .email("login@test.dev")
                .password(passwordEncoder.encode("whatever1@pass"))
                .fullName("Login User")
                .username("loginuser")
                .role(User.Role.USER)
                .emailVerified(true)
                .authProvider("email")
                .build());

        mockMvc.perform(post("/api/auth/otp/send?email=login@test.dev"))
                .andExpect(status().isOk());

        ArgumentCaptor<String> otp = ArgumentCaptor.forClass(String.class);
        verify(emailService).sendOtpEmail(anyString(), otp.capture());

        // The login code is confirmed by /auth/otp/verify — NOT /auth/register/verify.
        mockMvc.perform(post("/api/auth/otp/verify")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"login@test.dev\",\"otp\":\"" + otp.getValue() + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.email").value("login@test.dev"))
                .andExpect(cookie().exists(RefreshTokenCookie.NAME));
    }
}
