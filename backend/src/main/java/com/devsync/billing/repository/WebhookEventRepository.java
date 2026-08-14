package com.devsync.billing.repository;

import com.devsync.billing.entity.WebhookEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface WebhookEventRepository extends JpaRepository<WebhookEvent, String> {

    boolean existsByProviderAndProviderEventId(String provider, String providerEventId);

    Optional<WebhookEvent> findByProviderAndProviderEventId(String provider, String providerEventId);
}
