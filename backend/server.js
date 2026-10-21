const express = require("express");
const cors = require("cors");
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

const PORT = 5000;

app.listen(PORT, () => {

    console.log(
        `BookBridge server running on http://localhost:${PORT}`
    );

});