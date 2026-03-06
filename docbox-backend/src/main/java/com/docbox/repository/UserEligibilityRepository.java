package com.docbox.repository;

import com.docbox.entity.GovernmentScheme;
import com.docbox.entity.User;
import com.docbox.entity.UserEligibility;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * User Eligibility Repository (NEW)
 */
@Repository
public interface UserEligibilityRepository extends JpaRepository<UserEligibility, Long> {

    List<UserEligibility> findByUserOrderByCreatedAtDesc(User user);

    List<UserEligibility> findByUserAndIsEligibleTrueOrderByEligibilityScoreDesc(User user);

    Optional<UserEligibility> findByUserAndScheme(User user, GovernmentScheme scheme);

    @Query("SELECT ue FROM UserEligibility ue WHERE ue.user = :user " +
            "AND ue.isEligible = true AND ue.viewedAt IS NULL " +
            "ORDER BY ue.eligibilityScore DESC, ue.createdAt DESC")
    List<UserEligibility> findUnviewedEligibleSchemes(@Param("user") User user);

    @Query("SELECT COUNT(ue) FROM UserEligibility ue WHERE ue.user = :user " +
            "AND ue.isEligible = true AND ue.viewedAt IS NULL")
    Long countUnviewedEligibleSchemes(@Param("user") User user);

    @Query("SELECT ue FROM UserEligibility ue WHERE ue.user = :user " +
            "AND ue.scheme.category = :category " +
            "ORDER BY ue.eligibilityScore DESC")
    List<UserEligibility> findByUserAndCategory(
            @Param("user") User user,
            @Param("category") String category
    );
}