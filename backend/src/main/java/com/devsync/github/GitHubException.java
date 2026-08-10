package com.devsync.github;

import org.springframework.http.HttpStatus;

/**
 * GitHub integration errors. Kept distinct so the frontend can react to
 * expired authorization (reconnect) and rate limiting (wait) correctly.
 */
public class GitHubException extends RuntimeException {

    private final HttpStatus status;

    public GitHubException(String message) {
        this(message, HttpStatus.BAD_REQUEST);
    }

    public GitHubException(String message, HttpStatus status) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }

    /** The user's GitHub token is invalid/expired/revoked — they must reconnect. */
    public static class AuthRequired extends GitHubException {
        public AuthRequired(String message) {
            super(message, HttpStatus.UNAUTHORIZED);
        }
    }

    /** GitHub rate limit exceeded. Carries the reset time so the UI can show it. */
    public static class RateLimited extends GitHubException {
        private final long resetEpochSeconds;

        public RateLimited(String message, long resetEpochSeconds) {
            super(message, HttpStatus.TOO_MANY_REQUESTS);
            this.resetEpochSeconds = resetEpochSeconds;
        }

        public long getResetEpochSeconds() {
            return resetEpochSeconds;
        }
    }

    /** The linked repository no longer exists or is no longer accessible. */
    public static class RepoUnavailable extends GitHubException {
        public RepoUnavailable(String message) {
            super(message, HttpStatus.NOT_FOUND);
        }
    }
}
