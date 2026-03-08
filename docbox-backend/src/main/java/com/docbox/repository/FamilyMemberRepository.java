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

    // ✅ ALL queries use LEFT JOIN FETCH fm.user + fm.primaryAccount so the
    // controller can safely call fm.getUser().getEmail(), fm.getPrimaryAccount().getId()
    // etc. without a LazyInitializationException after the session closes.

    @Query("SELECT fm FROM FamilyMember fm " +
            "LEFT JOIN FETCH fm.user " +
            "LEFT JOIN FETCH fm.primaryAccount " +
            "WHERE fm.primaryAccount = :primaryAccount")
    List<FamilyMember> findByPrimaryAccount(@Param("primaryAccount") User primaryAccount);

    @Query("SELECT fm FROM FamilyMember fm " +
            "LEFT JOIN FETCH fm.user " +
            "LEFT JOIN FETCH fm.primaryAccount " +
            "WHERE fm.primaryAccount.id = :primaryAccountId " +
            "ORDER BY fm.createdAt DESC")
    List<FamilyMember> findByPrimaryAccountId(@Param("primaryAccountId") Long primaryAccountId);

    @Query("SELECT fm FROM FamilyMember fm " +
            "LEFT JOIN FETCH fm.user " +
            "LEFT JOIN FETCH fm.primaryAccount " +
            "WHERE fm.user = :user")
    Optional<FamilyMember> findByUser(@Param("user") User user);

    @Query("SELECT fm FROM FamilyMember fm " +
            "LEFT JOIN FETCH fm.user " +
            "LEFT JOIN FETCH fm.primaryAccount " +
            "WHERE fm.user.id = :userId")
    Optional<FamilyMember> findByUserId(@Param("userId") Long userId);

    @Query("SELECT fm FROM FamilyMember fm " +
            "LEFT JOIN FETCH fm.user " +
            "LEFT JOIN FETCH fm.primaryAccount " +
            "WHERE fm.primaryAccount.id = :primaryAccountId AND fm.user IS NOT NULL")
    List<FamilyMember> findSubAccountMembersByPrimaryAccountId(@Param("primaryAccountId") Long primaryAccountId);

    @Query("SELECT fm FROM FamilyMember fm " +
            "LEFT JOIN FETCH fm.primaryAccount " +
            "WHERE fm.primaryAccount.id = :primaryAccountId AND fm.user IS NULL")
    List<FamilyMember> findProfileOnlyMembersByPrimaryAccountId(@Param("primaryAccountId") Long primaryAccountId);

    boolean existsByUserAndPrimaryAccount(User user, User primaryAccount);

    @Query("SELECT COUNT(fm) FROM FamilyMember fm WHERE fm.primaryAccount.id = :primaryAccountId")
    long countByPrimaryAccountId(@Param("primaryAccountId") Long primaryAccountId);
}