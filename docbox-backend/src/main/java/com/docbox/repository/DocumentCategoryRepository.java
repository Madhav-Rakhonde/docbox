package com.docbox.repository;

import com.docbox.entity.DocumentCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DocumentCategoryRepository extends JpaRepository<DocumentCategory, Long> {

    Optional<DocumentCategory> findByName(String name);

    List<DocumentCategory> findAllByOrderByDisplayOrderAsc();

    boolean existsByName(String name);
}