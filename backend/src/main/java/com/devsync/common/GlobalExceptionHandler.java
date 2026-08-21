package com.devsync.common;

import lombok.extern.slf4j.Slf4j;
import com.devsync.auth.AuthException;
import com.devsync.auth.EmailService.EmailNotConfiguredException;
import com.devsync.billing.FeatureLimitException;
import com.devsync.billing.PaymentNotConfiguredException;
import com.devsync.github.GitHubException;
import com.devsync.notes.NoteConflictException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.time.Instant;
import java.util.List;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
        List<String> details = ex.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .toList();
        return ResponseEntity.badRequest().body(ErrorResponse.builder()
                .status(400)
                .error("Validation Failed")
                .message("Invalid request parameters")
                .timestamp(Instant.now())
                .details(details)
                .build());
    }

    @ExceptionHandler(AuthException.class)
    public ResponseEntity<ErrorResponse> handleAuth(AuthException ex) {
        return ResponseEntity.status(ex.getStatus()).body(ErrorResponse.builder()
                .status(ex.getStatus().value())
                .error(ex.getStatus().getReasonPhrase())
                .message(ex.getMessage())
                .timestamp(Instant.now())
                .build());
    }

    @ExceptionHandler(GitHubException.class)
    public ResponseEntity<ErrorResponse> handleGitHub(GitHubException ex) {
        var status = ex.getStatus();
        String message = ex.getMessage();
        if (ex instanceof GitHubException.RateLimited rateLimited) {
            message += " (resets at " + rateLimited.getResetEpochSeconds() + ")";
        }
        return ResponseEntity.status(status).body(ErrorResponse.builder()
                .status(status.value())
                .error(status.getReasonPhrase())
                .message(message)
                .timestamp(Instant.now())
                .build());
    }

    @ExceptionHandler(FeatureLimitException.class)
    public ResponseEntity<ErrorResponse> handleFeatureLimit(FeatureLimitException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ErrorResponse.builder()
                .status(403)
                .error("Plan Limit Reached")
                .message(ex.getMessage())
                .timestamp(Instant.now())
                .code(ex.getCode())
                .build());
    }

    @ExceptionHandler(EmailNotConfiguredException.class)
    public ResponseEntity<ErrorResponse> handleEmailNotConfigured(EmailNotConfiguredException ex) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(ErrorResponse.builder()
                .status(503)
                .error("Email Not Configured")
                .message(ex.getMessage())
                .timestamp(Instant.now())
                .code("EMAIL_NOT_CONFIGURED")
                .build());
    }

    @ExceptionHandler(PaymentNotConfiguredException.class)
    public ResponseEntity<ErrorResponse> handlePaymentNotConfigured(PaymentNotConfiguredException ex) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(ErrorResponse.builder()
                .status(503)
                .error("Payment Not Configured")
                .message(ex.getMessage())
                .timestamp(Instant.now())
                .code("PAYMENT_NOT_CONFIGURED")
                .build());
    }

    @ExceptionHandler(NoteConflictException.class)
    public ResponseEntity<ErrorResponse> handleNoteConflict(NoteConflictException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(ErrorResponse.builder()
                .status(409)
                .error("Conflict")
                .message(ex.getMessage())
                .timestamp(Instant.now())
                .code("NOTE_CONFLICT")
                .details(List.of("currentVersion=" + ex.getCurrentVersion()))
                .build());
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ErrorResponse.builder()
                .status(403)
                .error("Forbidden")
                .message("You don't have permission to perform this action")
                .timestamp(Instant.now())
                .build());
    }

    @ExceptionHandler(ForbiddenException.class)
    public ResponseEntity<ErrorResponse> handleForbidden(ForbiddenException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ErrorResponse.builder()
                .status(403)
                .error("Forbidden")
                .message(ex.getMessage())
                .timestamp(Instant.now())
                .build());
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(ResourceNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ErrorResponse.builder()
                .status(404)
                .error("Not Found")
                .message(ex.getMessage())
                .timestamp(Instant.now())
                .build());
    }

    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<ErrorResponse> handleConflict(ConflictException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(ErrorResponse.builder()
                .status(409)
                .error("Conflict")
                .message(ex.getMessage())
                .timestamp(Instant.now())
                .code(ex.getCode())
                .build());
    }

    @ExceptionHandler(ObjectOptimisticLockingFailureException.class)
    public ResponseEntity<ErrorResponse> handleOptimisticLock(ObjectOptimisticLockingFailureException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(ErrorResponse.builder()
                .status(409)
                .error("Conflict")
                .message("This resource was modified by another request. Please reload and try again.")
                .timestamp(Instant.now())
                .code("RESOURCE_MODIFIED")
                .build());
    }

    @ExceptionHandler({NoHandlerFoundException.class, NoResourceFoundException.class})
    public ResponseEntity<ErrorResponse> handleNoHandler(Exception ex) {
        // Unknown paths must be 404 — not swallowed into a 500 by the catch-all.
        String url = ex instanceof NoHandlerFoundException noHandler
                ? noHandler.getRequestURL()
                : ((NoResourceFoundException) ex).getResourcePath();
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ErrorResponse.builder()
                .status(404)
                .error("Not Found")
                .message("No endpoint found for " + url)
                .timestamp(Instant.now())
                .build());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleBadRequest(IllegalArgumentException ex) {
        return ResponseEntity.badRequest().body(ErrorResponse.builder()
                .status(400)
                .error("Bad Request")
                .message(ex.getMessage())
                .timestamp(Instant.now())
                .build());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneral(Exception ex) {
        // Never leak internals to the client, but DO log the full stack trace so
        // the real cause is visible in the backend log instead of being hidden
        // behind the generic message.
        log.error("Unhandled exception", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ErrorResponse.builder()
                .status(500)
                .error("Internal Server Error")
                .message("An unexpected error occurred")
                .timestamp(Instant.now())
                .build());
    }
}
