package com.devsync.collab.dto;

import lombok.Data;

@Data
public class InviteRequest {

    /**
     * Preferred: resolve the invitee by user id (search results no longer expose
     * email, so the UI sends the id it already has).
     */
    private String userId;

    /** Legacy: username or email, used when userId is not supplied. */
    private String usernameOrEmail;

    private String message;
}
