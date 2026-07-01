package com.devsync.repository;

import com.devsync.entity.Team;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TeamRepository extends JpaRepository<Team, Long> {
    List<Team> findByOpenTrueOrderByCreatedAtDesc();
    List<Team> findByOwnerIdOrderByCreatedAtDesc(Long ownerId);
}
