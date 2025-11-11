// services/users-go/main.go
package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/joho/godotenv"
	"github.com/lib/pq" // The blank import is for the driver's side effects
	"golang.org/x/crypto/bcrypt"
)

// User struct for database data
type User struct {
	ID        string    `json:"id"`
	Username  string    `json:"username"`
	Email     string    `json:"email"`
	Password  string    `json:"-"` // Omit from JSON responses
	CreatedAt time.Time `json:"created_at"`
}

// Global variable for the database connection
var db *sql.DB

// Secret key for JWT signing. In a real app, get this from env variables.
var jwtKey = []byte("your_very_secret_key") // CHANGE THIS!

// Claims struct for JWT
type Claims struct {
	Username string `json:"username"`
	jwt.RegisteredClaims
}

func main() {
	// Load .env file (optional, good for local development when not using Docker)
	err := godotenv.Load()
	if err != nil {
		log.Println("No .env file found, using environment variables provided by Docker Compose")
	}

	// Connect to PostgreSQL
	// This now uses the DB_HOST environment variable, making it flexible for Docker networking.
	connStr := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=5432 sslmode=disable",
		os.Getenv("DB_HOST"),
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_NAME"),
	)

	// Open the database connection
	db, err = sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	// Check if the connection is alive
	err = db.Ping()
	if err != nil {
		log.Fatal("Database connection is not alive:", err)
	}
	log.Println("Successfully connected to the database!")

	// Initialize Gin router
	router := gin.Default()

	// API Routes
	router.POST("/register", registerHandler)
	router.POST("/login", loginHandler)
	// Add more routes here (e.g., GET /user/:id)

	// Start the server
	log.Println("User service starting on port 8081...")
	router.Run(":8081")
}

// --- API Handlers ---

func registerHandler(c *gin.Context) {
	var newUser struct {
		Username string `json:"username" binding:"required"`
		Email    string `json:"email" binding:"required"`
		Password string `json:"password" binding:"required"`
	}

	log.Println("Received request to register a new user.")

	if err := c.ShouldBindJSON(&newUser); err != nil {
		// Enhanced logging and response for the binding error
		log.Printf("Error binding JSON for user registration from Client IP: %s. Details: %v", c.ClientIP(), err)

		// In a production environment, you might want to return a more generic message
		// instead of err.Error() to avoid leaking implementation details.
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid input",
			"details": err.Error(),
		})
		return
	}

	log.Printf("Attempting to register user with email: %s and username: %s", newUser.Email, newUser.Username)

	// Hash the password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newUser.Password), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("Error hashing password for user %s: %v", newUser.Email, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	// Insert user into the database
	var userID string
	err = db.QueryRow(
		"INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id",
		newUser.Username, newUser.Email, string(hashedPassword),
	).Scan(&userID)

	if err != nil {
		// A more specific error check for unique constraint violation
		if pqErr, ok := err.(*pq.Error); ok && pqErr.Code == "23505" {
			log.Printf("Conflict: Attempt to register with existing username or email: %s, %s", newUser.Username, newUser.Email)
			c.JSON(http.StatusConflict, gin.H{"error": "Username or email already exists"})
			return
		}
		log.Printf("Database error during user insertion for email %s: %v", newUser.Email, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user", "details": err.Error()})
		return
	}

	log.Printf("Successfully created user with ID: %s", userID)
	c.JSON(http.StatusCreated, gin.H{"message": "User created successfully", "userID": userID})
}

func loginHandler(c *gin.Context) {
	var credentials struct {
		Email    string `json:"email" binding:"required"`
		Password string `json:"password" binding:"required"`
	}

	log.Println("Received request for user login.")

	if err := c.ShouldBindJSON(&credentials); err != nil {
		log.Printf("Error binding JSON for user login: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	log.Printf("Attempting to log in user with email: %s", credentials.Email)

	var user User
	var passwordHash string
	err := db.QueryRow("SELECT id, username, email, password_hash FROM users WHERE email = $1", credentials.Email).Scan(&user.ID, &user.Username, &user.Email, &passwordHash)
	if err != nil {
		if err == sql.ErrNoRows {
			log.Printf("Login failed: User with email %s not found.", credentials.Email)
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
			return
		}
		log.Printf("Database error during login for email %s: %v", credentials.Email, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	// Compare the stored hashed password with the password provided
	err = bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(credentials.Password))
	if err != nil {
		// If there's an error, it means the passwords don't match
		log.Printf("Login failed: Invalid password for user %s.", credentials.Email)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	log.Printf("Password verified for user: %s", user.Username)

	// --- Create JWT Token ---
	expirationTime := time.Now().Add(24 * time.Hour)
	claims := &Claims{
		Username: user.Username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(jwtKey)
	if err != nil {
		log.Printf("Error creating JWT token for user %s: %v", user.Username, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not create token"})
		return
	}

	log.Printf("Successfully generated JWT token for user: %s", user.Username)

	c.JSON(http.StatusOK, gin.H{"token": tokenString})
}
