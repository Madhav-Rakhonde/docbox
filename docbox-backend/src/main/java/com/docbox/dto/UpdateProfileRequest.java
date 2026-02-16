package com.docbox.dto;


import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
class UpdateProfileRequest {

    @Size(min = 2, max = 255)
    private String fullName;

    @Size(max = 15)
    private String phoneNumber;
}