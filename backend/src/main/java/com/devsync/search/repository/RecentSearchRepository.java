package com.devsync.search.repository;

import com.devsync.search.entity.RecentSearch;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RecentSearchRepository extends JpaRepository<RecentSearch, String> {

    List<RecentSearch> findTop10ByUserIdOrderByCreatedAtDesc(String userId);

    Optional<RecentSearch> findByUserIdAndKeyword(String userId, String keyword);

    void deleteByUserId(String userId);
}
