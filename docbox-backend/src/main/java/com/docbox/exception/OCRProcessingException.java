package com.docbox.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;


@ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
public class OCRProcessingException extends RuntimeException {
    public OCRProcessingException(String message) {
        super(message);
    }

    public OCRProcessingException(String message, Throwable cause) {
        super(message, cause);
    }
}