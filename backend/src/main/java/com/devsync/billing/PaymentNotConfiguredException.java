package com.devsync.billing;

/** Raised when a checkout is attempted but the payment provider is not configured. */
public class PaymentNotConfiguredException extends RuntimeException {

    public PaymentNotConfiguredException(String message) {
        super(message);
    }
}
