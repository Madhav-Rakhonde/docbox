FROM maven:3.9.6-eclipse-temurin-21 AS build

WORKDIR /app

COPY pom.xml .
RUN mvn dependency:go-offline --no-transfer-progress

COPY src ./src
RUN mvn clean package -DskipTests --no-transfer-progress

# ──────────────────────────────────────────────────────────────────────
# STAGE 2 — Runtime image with Tesseract OCR
# Uses Ubuntu Jammy (NOT Alpine) — Tess4J requires glibc, not musl libc
# ──────────────────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jre-jammy

WORKDIR /app

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

# Verify Tesseract — visible in build logs
RUN echo "=== Tesseract version ===" && tesseract --version \
 && echo "=== Installed languages ===" && tesseract --list-langs

# ── Tesseract — find actual tessdata path dynamically ─────────────────
# Ubuntu Jammy installs Tesseract 4.x tessdata at a versioned path.
# We detect the real path at build time so it never breaks on upgrades.
RUN TESSDATA=$(find /usr/share/tesseract-ocr -name "tessdata" -type d | head -1) \
 && echo "Detected tessdata: $TESSDATA" \
 && echo "TESSDATA_PATH=$TESSDATA" > /app/.tessdata_path

ENV TESSDATA_PREFIX=/usr/share/tesseract-ocr/4.00/tessdata
ENV APP_OCR_TESSERACT_DATA_PATH=/usr/share/tesseract-ocr/4.00/tessdata

# ── JVM flags ─────────────────────────────────────────────────────────
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -Djava.awt.headless=true"

# ── Cloudinary — MUST be declared so Render injects them at runtime ───
# These are empty defaults; real values come from Render's Environment tab.
# Without ENV declarations in a multi-stage Docker build, runtime env vars
# from the host (Render) are not guaranteed to be visible to the JVM.
ENV CLOUDINARY_CLOUD_NAME=""
ENV CLOUDINARY_API_KEY=""
ENV CLOUDINARY_API_SECRET=""
ENV CLOUDINARY_URL=""

# ── Spring datasource (declare so Render can inject) ──────────────────
ENV SPRING_DATASOURCE_URL=""
ENV SPRING_DATASOURCE_USERNAME=""
ENV SPRING_DATASOURCE_PASSWORD=""

# ── JWT secret (declare so Render can inject) ─────────────────────────
ENV JWT_SECRET=""

COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

# sh -c expands $JAVA_OPTS and passes all ENV vars to the JVM process
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS \
  -DCLOUDINARY_CLOUD_NAME=${CLOUDINARY_CLOUD_NAME} \
  -DCLOUDINARY_API_KEY=${CLOUDINARY_API_KEY} \
  -DCLOUDINARY_API_SECRET=${CLOUDINARY_API_SECRET} \
  -DCLOUDINARY_URL=${CLOUDINARY_URL} \
  -jar app.jar"]