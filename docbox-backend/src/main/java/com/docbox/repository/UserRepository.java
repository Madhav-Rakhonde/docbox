package com.docbox.repository;

import com.docbox.entity.User;
import com.docbox.enums.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    List<User> findByRole(UserRole role);

    List<User> findByPrimaryAccount(User primaryAccount);

    List<User> findByPrimaryAccountAndRole(User primaryAccount, UserRole role);

    @Query("SELECT u FROM User u WHERE u.primaryAccount.id = :primaryAccountId")
    List<User> findSubAccountsByPrimaryAccountId(@Param("primaryAccountId") Long primaryAccountId);

    @Query("SELECT COUNT(u) FROM User u WHERE u.primaryAccount.id = :primaryAccountId AND u.role = 'SUB_ACCOUNT'")
    long countSubAccountsByPrimaryAccountId(@Param("primaryAccountId") Long primaryAccountId);

    @Query("SELECT u FROM User u WHERE u.isActive = true AND u.role = 'PRIMARY_ACCOUNT'")
    List<User> findAllActivePrimaryAccounts();
}