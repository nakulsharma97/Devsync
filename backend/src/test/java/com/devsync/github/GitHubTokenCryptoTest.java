package com.devsync.github;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class GitHubTokenCryptoTest {

    private final GitHubTokenCrypto crypto = new GitHubTokenCrypto("test-encryption-key", "unused");

    @Test
    void encrypt_shouldRoundTrip() {
        String ciphertext = crypto.encrypt("gho_real_access_token_123");
        assertThat(crypto.decrypt(ciphertext)).isEqualTo("gho_real_access_token_123");
    }

    @Test
    void encrypt_shouldNeverStorePlaintext() {
        String ciphertext = crypto.encrypt("gho_super_secret_token");
        assertThat(ciphertext).doesNotContain("gho_super_secret_token");
        assertThat(ciphertext).isNotEqualTo("gho_super_secret_token");
    }

    @Test
    void encrypt_shouldBeRandomizedPerCall() {
        String a = crypto.encrypt("same-token");
        String b = crypto.encrypt("same-token");
        assertThat(a).isNotEqualTo(b); // unique IV per encryption
    }

    @Test
    void decrypt_shouldFail_WhenKeyDiffers() {
        String ciphertext = crypto.encrypt("token-with-key-a");
        GitHubTokenCrypto other = new GitHubTokenCrypto("a-different-key", "unused");
        assertThatThrownBy(() -> other.decrypt(ciphertext))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void constructor_shouldRefuseToRun_WithoutAnyKeyMaterial() {
        assertThatThrownBy(() -> new GitHubTokenCrypto("", ""))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("encryption");
    }

    @Test
    void constructor_shouldPreferConfiguredKey_OverJwtSecret() {
        GitHubTokenCrypto configured = new GitHubTokenCrypto("explicit-key", "jwt-secret");
        GitHubTokenCrypto fallback = new GitHubTokenCrypto("", "jwt-secret");
        String c1 = configured.encrypt("t");
        String c2 = fallback.encrypt("t");
        assertThat(c1).isNotEqualTo(c2);
    }
}
