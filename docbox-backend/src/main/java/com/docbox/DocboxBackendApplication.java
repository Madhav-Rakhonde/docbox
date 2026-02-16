package com.docbox;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableJpaAuditing
@EnableScheduling
@EnableAsync
public class DocboxBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(DocboxBackendApplication.class, args);
		System.out.println("==============================================");
		System.out.println("    DocBox Backend Started Successfully!     ");
		System.out.println("    Document Management PWA for Indian Families");
		System.out.println("    Running on: http://localhost:8080          ");
		System.out.println("==============================================");
	}

}
