package com.devsync.github;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

/**
 * Exchanges the GitHub authorization code for an access token. Kept separate so
 * the connection service can be tested without hitting GitHub.
 */
@Component
public class GitHubOAuthClient {

    private static final String OAUTH_TOKEN = "https://github.com/login/oauth/access_token";

    private final RestClient restClient = RestClient.builder().build();

    public record TokenExchange(String token, String scopes) {}

    public TokenExchange exchangeCode(String code, String clientId, String clientSecret, String redirectUri) {
        JsonNode body = restClient.post()
                .uri(OAUTH_TOKEN)
                .header(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body("client_id=" + encode(clientId)
                        + "&client_secret=" + encode(clientSecret)
                        + "&code=" + encode(code)
                        + "&redirect_uri=" + encode(redirectUri))
                .retrieve()
                .body(JsonNode.class);
        if (body == null || body.has("error")) {
            String err = body == null ? "empty response"
                    : body.path("error_description").asText(body.path("error").asText());
            throw new GitHubException("GitHub OAuth exchange failed: " + err);
        }
        return new TokenExchange(
                body.path("access_token").asText(),
                body.path("scope").asText("repo,read:user,user:email"));
    }

    private static String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
