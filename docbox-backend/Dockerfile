FROM maven:3.9.6-eclipse-temurin-21 AS build

WORKDIR /app

COPY pom.xml .
RUN mvn dependency:go-offline --no-transfer-progress

COPY src ./src
RUN mvn clean package -DskipTests --no-transfer-progress

# ──────────────────────────────────────────────────────────────────────
# STAGE 2 — Runtime image with Tesseract OCR + Devanagari languages
# ──────────────────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jre-jammy

WORKDIR /app

# ── System packages ───────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
        tesseract-ocr \
        tesseract-ocr-eng \
        wget \
        ca-certificates \
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

# ── Detect tessdata path at build time ───────────────────────────────
# Ubuntu Jammy (Tesseract 4.x) installs to /usr/share/tesseract-ocr/4.00/tessdata
# We detect it dynamically so this works even if the path changes.
RUN TESSDATA=$(find /usr/share/tesseract-ocr -name "tessdata" -type d | head -1) \
 && echo "Detected tessdata directory: $TESSDATA" \
 && echo "$TESSDATA" > /tmp/tessdata_path

# ── Download hin + mar traineddata directly from GitHub ──────────────
# Reason: tesseract-ocr-hin and tesseract-ocr-mar are in Ubuntu universe
# repo which is sometimes unavailable or missing in container builds.
# Downloading directly from the official Tesseract repo is more reliable.
RUN TESSDATA=$(cat /tmp/tessdata_path) \
 && echo "Installing Hindi traineddata to $TESSDATA" \
 && wget -q --show-progress \
        https://github.com/tesseract-ocr/tessdata/raw/main/hin.traineddata \
        -O "$TESSDATA/hin.traineddata" \
 && echo "Installing Marathi traineddata to $TESSDATA" \
 && wget -q --show-progress \
        https://github.com/tesseract-ocr/tessdata/raw/main/mar.traineddata \
        -O "$TESSDATA/mar.traineddata" \
 && echo "Download complete. Listing tessdata:" \
 && ls -lh "$TESSDATA/"

# ── Verify all required languages are recognised by Tesseract ─────────
RUN echo "=== Tesseract version ===" \
 && tesseract --version \
 && echo "=== Installed languages ===" \
 && tesseract --list-langs \
 && COUNT=$(tesseract --list-langs 2>&1 | grep -E "^(eng|hin|mar)$" | wc -l) \
 && echo "Found $COUNT of 3 required languages" \
 && [ "$COUNT" -eq 3 ] && echo "All 3 languages verified" || (echo "MISSING LANGUAGES — expected eng hin mar" && exit 1)

# ── Set tessdata path env vars ─────────────────────────────────────────
# TESSDATA_PREFIX: used by Tesseract CLI
# APP_OCR_TESSERACT_DATA_PATH: read by OCRService @Value
RUN TESSDATA=$(cat /tmp/tessdata_path) \
 && echo "TESSDATA=$TESSDATA"
ENV TESSDATA_PREFIX=/usr/share/tesseract-ocr/4.00/tessdata
ENV APP_OCR_TESSERACT_DATA_PATH=/usr/share/tesseract-ocr/4.00/tessdata

# ── JVM flags ─────────────────────────────────────────────────────────
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -Djava.awt.headless=true"

# ── Cloudinary ────────────────────────────────────────────────────────
ENV CLOUDINARY_CLOUD_NAME=""
ENV CLOUDINARY_API_KEY=""
ENV CLOUDINARY_API_SECRET=""
ENV CLOUDINARY_URL=""

# ── Spring datasource ─────────────────────────────────────────────────
ENV SPRING_DATASOURCE_URL=""
ENV SPRING_DATASOURCE_USERNAME=""
ENV SPRING_DATASOURCE_PASSWORD=""

# ── JWT ───────────────────────────────────────────────────────────────
ENV JWT_SECRET=""

COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS \
  -DCLOUDINARY_CLOUD_NAME=${CLOUDINARY_CLOUD_NAME} \
  -DCLOUDINARY_API_KEY=${CLOUDINARY_API_KEY} \
  -DCLOUDINARY_API_SECRET=${CLOUDINARY_API_SECRET} \
  -DCLOUDINARY_URL=${CLOUDINARY_URL} \
  -jar app.jar"]