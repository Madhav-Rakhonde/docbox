package com.docbox.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class InvalidShareLinkException extends RuntimeException {
    public InvalidShareLinkException(String message) {
        super(message);
    }
}