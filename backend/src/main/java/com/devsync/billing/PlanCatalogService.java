package com.devsync.billing;

import com.devsync.billing.dto.PlanResponse;
import com.devsync.billing.entity.Plan;
import com.devsync.billing.repository.PlanRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

/** Public plan catalog for the pricing page (safe fields only). */
@Service
@RequiredArgsConstructor
public class PlanCatalogService {

    private final PlanRepository planRepository;

    public List<PlanResponse> getPlans() {
        return planRepository.findByActiveTrueOrderByPriceInrAsc().stream()
                .map(this::toResponse)
                .toList();
    }

    private PlanResponse toResponse(Plan plan) {
        return PlanResponse.builder()
                .code(plan.getCode())
                .name(plan.getName())
                .description(plan.getDescription())
                .priceInr(plan.getPriceInr())
                .currency(plan.getCurrency())
                .privateProjectLimit(plan.getPrivateProjectLimit())
                .membersPerProject(plan.getMembersPerProject())
                .storageBytes(plan.getStorageBytes())
                .advancedAnalytics(plan.isAdvancedAnalytics())
                .customDomain(plan.isCustomDomain())
                .sso(plan.isSso())
                .auditLevel(plan.getAuditLevel())
                .prioritySupport(plan.isPrioritySupport())
                .build();
    }
}
