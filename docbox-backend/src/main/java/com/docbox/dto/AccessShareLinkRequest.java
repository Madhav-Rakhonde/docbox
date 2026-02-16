package com.docbox.dto;

import com.docbox.enums.PermissionLevel;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDateTime;
@Data
class AccessShareLinkRequest {

    @NotBlank(message = "Link token is required")
    private String linkToken;

    private String password; // If link is password-protected
}
