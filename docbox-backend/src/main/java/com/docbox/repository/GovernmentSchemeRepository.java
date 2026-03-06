package com.docbox.repository;

import com.docbox.entity.GovernmentScheme;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

/**
 * Government Scheme Repository (NEW)
 */
@Repository
public interface GovernmentSchemeRepository extends JpaRepository<GovernmentScheme, Long> {

    List<GovernmentScheme> findByIsActiveTrueOrderByPriorityDesc();

    List<GovernmentScheme> findByCategoryAndIsActiveTrue(String category);

    @Query("SELECT gs FROM GovernmentScheme gs WHERE gs.isActive = true " +
            "AND (gs.applicationEndDate IS NULL OR gs.applicationEndDate >= :currentDate) " +
            "ORDER BY gs.priority DESC, gs.applicationEndDate ASC")
    List<GovernmentScheme> findActiveSchemes(@Param("currentDate") LocalDate currentDate);

    @Query("SELECT gs FROM GovernmentScheme gs WHERE gs.isActive = true " +
            "AND (LOWER(gs.name) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
            "OR LOWER(gs.description) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
            "OR LOWER(gs.tags) LIKE LOWER(CONCAT('%', :searchTerm, '%'))) " +
            "ORDER BY gs.priority DESC")
    List<GovernmentScheme> searchSchemes(@Param("searchTerm") String searchTerm);
}