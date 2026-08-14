package com.devsync.billing.repository;

import com.devsync.billing.entity.Plan;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PlanRepository extends JpaRepository<Plan, String> {

    Optional<Plan> findByCode(String code);

    List<Plan> findByActiveTrueOrderByPriceInrAsc();
}
