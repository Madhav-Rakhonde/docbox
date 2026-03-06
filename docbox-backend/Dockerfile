
FROM maven:3.9.6-eclipse-temurin-21 AS build

WORKDIR /app


COPY pom.xml .
RUN mvn dependency:go-offline --no-transfer-progress

# Copy source and build the JAR
COPY src ./src
RUN mvn clean package -DskipTests --no-transfer-progress

# ──────────────────────────────────────────────────────────────────────
# STAGE 2 — Runtime image with Tesseract OCR
#
# Uses Ubuntu Jammy (NOT Alpine) because:
# Tess4J loads Tesseract as a native C library via JNI.
# Alpine uses musl libc but Tesseract requires glibc.
# Alpine would crash with: "Unable to load library 'tesseract'"
# ──────────────────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jre-jammy

WORKDIR /app

# Install Tesseract + all 3 languages your OCRService uses:
#   eng → English
#   hin → Hindi   (Devanagari pass)
#   mar → Marathi (Devanagari pass)
# Also installs image/PDF processing libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
        tesseract-ocr \
        tesseract-ocr-eng \
        tesseract-ocr-hin \
        tesseract-ocr-mar \
        libtesseract-dev \
        libleptonica-dev \
        libpng-dev \
        libjpeg-dev \
        libtiff-dev \
        ghostscript \
        fontconfig \
        fonts-dejavu-core \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Verify Tesseract installed correctly — visible in build logs
RUN echo "=== Tesseract version ===" && tesseract --version \
 && echo "=== Installed languages ===" && tesseract --list-langs

# Tessdata path — your OCRService auto-detects this path
ENV TESSDATA_PREFIX=/usr/share/tesseract-ocr/4.00/tessdata

# Tells Spring to use this path via @Value("${app.ocr.tesseract-data-path:...}")
ENV APP_OCR_TESSERACT_DATA_PATH=/usr/share/tesseract-ocr/4.00/tessdata

# JVM flags:
# -XX:+UseContainerSupport  → JVM respects Docker memory limits
# -XX:MaxRAMPercentage=75   → use 75% of container RAM for heap
# -Djava.awt.headless=true  → required for BufferedImage/ImageIO (no display in container)
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -Djava.awt.headless=true"

# Copy the built JAR from Stage 1
COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]