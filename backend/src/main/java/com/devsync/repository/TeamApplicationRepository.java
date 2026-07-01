package com.devsync.repository;

import com.devsync.entity.TeamApplication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TeamApplicationRepository extends JpaRepository<TeamApplication, Long> {
    List<TeamApplication> findByTeamIdOrderByCreatedAtDesc(Long teamId);
    List<TeamApplication> findByApplicantIdOrderByCreatedAtDesc(Long applicantId);
    Optional<TeamApplication> findByTeamIdAndApplicantId(Long teamId, Long applicantId);
    boolean existsByTeamIdAndApplicantId(Long teamId, Long applicantId);
}
