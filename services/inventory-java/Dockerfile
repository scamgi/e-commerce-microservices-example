# services/inventory-java/Dockerfile

# --- Stage 1: Build the application ---
# CHANGE THIS LINE: Use the temurin-21 image to match your project's Java version
FROM maven:3.9-eclipse-temurin-21 AS builder

WORKDIR /app

# Copy the pom.xml and download dependencies
COPY pom.xml .
RUN mvn dependency:go-offline

# Copy the rest of the source code
COPY src ./src

# Build the application, skipping tests for faster builds
RUN mvn package -DskipTests

# --- Stage 2: Create the final, smaller image ---
# ALSO CHANGE THIS LINE: The runtime environment should match the compile environment
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Copy the executable .jar file from the builder stage
COPY --from=builder /app/target/*.jar app.jar

EXPOSE 8083

# Run the application
ENTRYPOINT ["java", "-jar", "app.jar"]