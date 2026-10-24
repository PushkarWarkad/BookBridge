const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("./db");

const app = express();


// ============================================================
// MIDDLEWARE
// ============================================================

app.use(cors());
app.use(express.json());


// ============================================================
// TEST ROUTE
// ============================================================

app.get("/", async (req, res) => {

    try {

        const result = await pool.query("SELECT NOW()");

        res.json({
            message: "BookBridge backend is connected to PostgreSQL!",
            databaseTime: result.rows[0].now
        });

    } catch (error) {

        console.error(
            "Database connection error:",
            error.message
        );

        res.status(500).json({
            message: "Database connection failed"
        });

    }

});

// ============================================================
// USER SIGN UP
// ============================================================

app.post("/api/auth/signup", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Validate input
        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Name, email and password are required"
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                message: "Password must be at least 8 characters"
            });
        }

        // Hash password before saving
        const passwordHash = await bcrypt.hash(password, 12);

        // Create user
        const result = await pool.query(
            `INSERT INTO users (name, email, password_hash)
             VALUES ($1, $2, $3)
             RETURNING id, name, email, created_at`,
            [name.trim(), email.trim().toLowerCase(), passwordHash]
        );

        res.status(201).json({
            message: "Account created successfully",
            user: result.rows[0]
        });

    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({
                message: "An account with this email already exists"
            });
        }

        console.error("Signup error:", error.message);

        res.status(500).json({
            message: "Failed to create account"
        });
    }
});

// ============================================================
// USER LOGIN
// ============================================================

app.post("/api/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        // Find registered user
        const result = await pool.query(
            `SELECT id, name, email, password_hash
             FROM users
             WHERE email = $1`,
            [email.trim().toLowerCase()]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const user = result.rows[0];

        // Verify password
        const passwordMatches = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!passwordMatches) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        // Create authentication token
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email
            },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.json({
            message: "Login successful",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        console.error("Login error:", error.message);

        res.status(500).json({
            message: "Login failed"
        });
    }
});

// ============================================================
// GET ALL BOOKS
// ============================================================

app.get("/api/books", async (req, res) => {

    try {

        const result = await pool.query(
            "SELECT * FROM books ORDER BY id ASC"
        );

        res.json(result.rows);

    } catch (error) {

        console.error(
            "Error fetching books:",
            error.message
        );

        res.status(500).json({
            message: "Failed to fetch books"
        });

    }

});


// ============================================================
// ADD A NEW BOOK
// ============================================================

app.post("/api/books", async (req, res) => {

    try {

        const {
            title,
            author,
            subject,
            condition,
            type,
            price,
            distance,
            owner
        } = req.body;


        // ----------------------------------------------------
        // Basic validation
        // ----------------------------------------------------

        if (!title || !title.trim()) {

            return res.status(400).json({
                message: "Book title is required"
            });

        }


        // ----------------------------------------------------
        // Insert book into PostgreSQL
        // ----------------------------------------------------

        const result = await pool.query(

            `INSERT INTO books
            (
                title,
                author,
                subject,
                condition,
                type,
                price,
                distance,
                owner
            )
            VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *`,

            [
                title.trim(),
                author || "",
                subject || "",
                condition || "Good",
                type || "Sell",
                Number(price) || 0,
                Number(distance) || 0,
                owner || "Student"
            ]

        );


        // ----------------------------------------------------
        // Send newly created book back to frontend
        // ----------------------------------------------------

        res.status(201).json({

            message: "Book listed successfully",

            book: result.rows[0]

        });

    } catch (error) {

        console.error(
            "Error adding book:",
            error.message
        );

        res.status(500).json({
            message: "Failed to list book"
        });

    }

});

// ============================================================
// CREATE A BOOK REQUEST
// ============================================================

app.post("/api/requests", async (req, res) => {

    try {

        const { book_id, requester_name, message } = req.body;

        // Validate required information
        if (!book_id || !requester_name || !requester_name.trim()) {
            return res.status(400).json({
                message: "Book ID and requester name are required"
            });
        }

        // Check whether the requested book exists
        const book = await pool.query(
            "SELECT id FROM books WHERE id = $1",
            [book_id]
        );

        if (book.rows.length === 0) {
            return res.status(404).json({
                message: "Book not found"
            });
        }

        // Save request in PostgreSQL
        const result = await pool.query(
            `INSERT INTO requests
            (book_id, requester_name, message)
            VALUES ($1, $2, $3)
            RETURNING *`,
            [
                book_id,
                requester_name.trim(),
                message || ""
            ]
        );

        res.status(201).json({
            message: "Book request submitted successfully",
            request: result.rows[0]
        });

    } catch (error) {

        console.error("Error creating request:", error.message);

        res.status(500).json({
            message: "Failed to submit book request"
        });

    }

});


// ============================================================
// GET ALL BOOK REQUESTS
// ============================================================

app.get("/api/requests", async (req, res) => {

    try {

        const result = await pool.query(
            `SELECT
                requests.*,
                books.title AS book_title,
                books.author AS book_author
            FROM requests
            JOIN books ON requests.book_id = books.id
            ORDER BY requests.id DESC`
        );

        res.json(result.rows);

    } catch (error) {

        console.error("Error fetching requests:", error.message);

        res.status(500).json({
            message: "Failed to fetch requests"
        });

    }

});

// ============================================================
// START SERVER
// ============================================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {

    console.log(
        `BookBridge server running on http://localhost:${PORT}`
    );

});