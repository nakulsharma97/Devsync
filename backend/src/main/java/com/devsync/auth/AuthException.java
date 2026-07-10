package com.devsync.auth;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class AuthException extends RuntimeException {
    private final HttpStatus status;

    public AuthException(String message, HttpStatus status) {
        super(message);
        this.status = status;
    }

    public AuthException(String message) {
        super(message);
        this.status = HttpStatus.UNAUTHORIZED;
    }
}
