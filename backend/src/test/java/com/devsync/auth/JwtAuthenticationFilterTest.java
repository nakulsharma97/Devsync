package com.devsync.auth;

import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;

import java.util.Collections;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class JwtAuthenticationFilterTest {

    @Mock private JwtTokenProvider jwtTokenProvider;
    @Mock private UserDetailsService userDetailsService;
    @Mock private HttpServletRequest request;
    @Mock private HttpServletResponse response;
    @Mock private FilterChain filterChain;
    @Mock private UserDetails userDetails;

    private JwtAuthenticationFilter filter;

    @BeforeEach
    void setUp() {
        filter = new JwtAuthenticationFilter(jwtTokenProvider, userDetailsService);
        SecurityContextHolder.clearContext();
    }

    @Test
    void doFilter_shouldSetAuthentication_WhenValidTokenProvided() throws Exception {
        when(request.getHeader("Authorization")).thenReturn("Bearer valid-jwt-token");
        when(jwtTokenProvider.validateToken("valid-jwt-token")).thenReturn(true);
        when(jwtTokenProvider.getUserIdFromToken("valid-jwt-token")).thenReturn("user-123");
        when(userDetailsService.loadUserByUsername("user-123")).thenReturn(userDetails);
        when(userDetails.getAuthorities()).thenReturn(Collections.emptyList());

        filter.doFilterInternal(request, response, filterChain);

        var auth = SecurityContextHolder.getContext().getAuthentication();
        assertThat(auth).isNotNull();
        assertThat(auth.getPrincipal()).isEqualTo(userDetails);
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void doFilter_shouldNotSetAuthentication_WhenNoTokenProvided() throws Exception {
        when(request.getHeader("Authorization")).thenReturn(null);

        filter.doFilterInternal(request, response, filterChain);

        var auth = SecurityContextHolder.getContext().getAuthentication();
        assertThat(auth).isNull();
        verify(filterChain).doFilter(request, response);
        verify(jwtTokenProvider, never()).validateToken(anyString());
    }

    @Test
    void doFilter_shouldNotSetAuthentication_WhenInvalidTokenProvided() throws Exception {
        when(request.getHeader("Authorization")).thenReturn("Bearer invalid-token");
        when(jwtTokenProvider.validateToken("invalid-token")).thenReturn(false);

        filter.doFilterInternal(request, response, filterChain);

        var auth = SecurityContextHolder.getContext().getAuthentication();
        assertThat(auth).isNull();
        verify(filterChain).doFilter(request, response);
        verify(jwtTokenProvider, never()).getUserIdFromToken(anyString());
        verify(userDetailsService, never()).loadUserByUsername(anyString());
    }

    @Test
    void doFilter_shouldNotSetAuthentication_WhenMalformedHeaderProvided() throws Exception {
        when(request.getHeader("Authorization")).thenReturn("NotBearer something");

        filter.doFilterInternal(request, response, filterChain);

        var auth = SecurityContextHolder.getContext().getAuthentication();
        assertThat(auth).isNull();
        verify(filterChain).doFilter(request, response);
        verify(jwtTokenProvider, never()).validateToken(anyString());
    }

    @Test
    void doFilter_shouldNotSetAuthentication_WhenEmptyBearerProvided() throws Exception {
        when(request.getHeader("Authorization")).thenReturn("Bearer ");

        filter.doFilterInternal(request, response, filterChain);

        var auth = SecurityContextHolder.getContext().getAuthentication();
        assertThat(auth).isNull();
        verify(filterChain).doFilter(request, response);
        verify(jwtTokenProvider, never()).validateToken(anyString());
    }

    @Test
    void doFilter_shouldAlwaysCallFilterChain_EvenForInvalidTokens() throws Exception {
        // Regression test: public endpoints should work even with bad tokens
        when(request.getHeader("Authorization")).thenReturn("Bearer bad-token");
        when(jwtTokenProvider.validateToken("bad-token")).thenReturn(false);

        filter.doFilterInternal(request, response, filterChain);

        // The filter must never block the chain — public endpoints depend on this
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void doFilter_shouldAlwaysCallFilterChain_WhenNoToken() throws Exception {
        when(request.getHeader("Authorization")).thenReturn(null);

        filter.doFilterInternal(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
    }
}
