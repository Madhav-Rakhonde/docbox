package com.docbox.repository;

import com.docbox.entity.FamilyMember;
import com.docbox.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FamilyMemberRepository extends JpaRepository<FamilyMember, Long> {

    List<FamilyMember> findByPrimaryAccount(User primaryAccount);

    List<FamilyMember> findByPrimaryAccountId(Long primaryAccountId);

    Optional<FamilyMember> findByUser(User user);

    Optional<FamilyMember> findByUserId(Long userId);

    @Query("SELECT fm FROM FamilyMember fm WHERE fm.primaryAccount.id = :primaryAccountId AND fm.user IS NOT NULL")
    List<FamilyMember> findSubAccountMembersByPrimaryAccountId(@Param("primaryAccountId") Long primaryAccountId);

    @Query("SELECT fm FROM FamilyMember fm WHERE fm.primaryAccount.id = :primaryAccountId AND fm.user IS NULL")
    List<FamilyMember> findProfileOnlyMembersByPrimaryAccountId(@Param("primaryAccountId") Long primaryAccountId);

    boolean existsByUserAndPrimaryAccount(User user, User primaryAccount);

    // NEW: Count method for analytics
    @Query("SELECT COUNT(fm) FROM FamilyMember fm WHERE fm.primaryAccount.id = :primaryAccountId")
    long countByPrimaryAccountId(@Param("primaryAccountId") Long primaryAccountId);
}