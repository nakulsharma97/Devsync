package com.devsync.config;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtStompChannelInterceptor jwtStompChannelInterceptor;

    @Value("${app.cors.allowed-origins:http://localhost:5173,http://localhost:3000}")
    private String allowedOrigins;

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        // Authenticate CONNECT frames with the access JWT and enforce
        // subscription authorization before any message reaches the broker.
        registration.interceptors(jwtStompChannelInterceptor);
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic", "/queue");
        config.setApplicationDestinationPrefixes("/app");
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        String[] origins = allowedOrigins.split(",");

        // Native WebSocket endpoint (used by modern browsers)
        registry.addEndpoint("/ws")
                .setAllowedOrigins(origins);

        // SockJS fallback endpoint (for legacy environments)
        registry.addEndpoint("/ws")
                .setAllowedOrigins(origins)
                .withSockJS();
    }
}
