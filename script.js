// ============================================================
// BOOKBRIDGE - FRONTEND JAVASCRIPT
// ============================================================

// Backend API
const API_URL = "https://bookbridge-backend-dim3.onrender.com/api/books";
const REQUEST_API_URL = "https://bookbridge-backend-dim3.onrender.com/api/requests";

// Books currently loaded from PostgreSQL
let books = [];

// ============================================================
// LOAD BOOKS FROM POSTGRESQL
// ============================================================

async function loadBooks() {
    try {
        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error("Failed to load books from database.");
        }

        const data = await response.json();

        books = data.map(book => ({
            ...book,
            distance: Number(book.distance) || 0,
            price: Number(book.price) || 0
        }));

        renderBooks();

        console.log("BookBridge books loaded successfully:", books);

    } catch (error) {
        console.error("Could not load books:", error);

        books = [];
        renderBooks();
    }
}

// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    }[character]));
}

// ============================================================
// RENDER BOOKS
// ============================================================

function renderBooks(list = books) {
    const searchInput = document.getElementById("searchInput");
    const filterType = document.getElementById("filterType");
    const searchType = document.getElementById("searchType");
    const distanceFilter = document.getElementById("distanceFilter");

    const grid = document.getElementById("bookGrid");
    const empty = document.getElementById("emptyState");
    const resultCount = document.getElementById("resultCount");

    if (!grid) {
        console.error("Book grid element was not found.");
        return;
    }

    const query = searchInput
        ? searchInput.value.trim().toLowerCase()
        : "";

    const marketplaceType = filterType
        ? filterType.value.toLowerCase()
        : "all";

    const selectedSearchType = searchType
        ? searchType.value.toLowerCase()
        : "all";

    const maxDistance = distanceFilter && distanceFilter.value
        ? Number(distanceFilter.value)
        : Infinity;

    const filtered = list.filter(book => {
        const searchableText = [
            book.title,
            book.author,
            book.subject,
            book.category
        ].join(" ").toLowerCase();

        const matchesSearch =
            !query || searchableText.includes(query);

        // Treat Sell and Buy as equivalent.
        const bookType = String(book.type || "Sell").toLowerCase();
        const normalizedBookType =
            bookType === "sell" ? "buy" : bookType;

        const matchesSearchType =
            selectedSearchType === "all" ||
            normalizedBookType === selectedSearchType ||
            bookType === selectedSearchType;

        const matchesMarketplaceType =
            marketplaceType === "all" ||
            normalizedBookType === marketplaceType ||
            bookType === marketplaceType;

        const matchesDistance =
            Number(book.distance || 0) <= maxDistance;

        return (
            matchesSearch &&
            matchesSearchType &&
            matchesMarketplaceType &&
            matchesDistance
        );
    });

    // Update result count
    if (resultCount) {
        resultCount.textContent =
            `${filtered.length} book${filtered.length === 1 ? "" : "s"} found`;
    }

    // Display book cards
    grid.innerHTML = filtered.map(book => `
        <article class="book-card">

            <div class="book-icon">📖</div>

            <span class="book-type">
                ${escapeHtml(book.type || "Sell")}
            </span>

            <h3>${escapeHtml(book.title)}</h3>

            <p class="author">
                ${escapeHtml(book.author || "Author not provided")}
            </p>

            <div class="meta">
                <span>
                    📍 ${Number(book.distance || 0).toFixed(1)} km
                </span>

                <span class="price">
                    ${
                        Number(book.price) > 0
                            ? "₹" + Number(book.price)
                            : "Free"
                    }
                </span>
            </div>

            <button
                class="card-btn"
                onclick="viewBook(${Number(book.id)})"
            >
                View book
            </button>

        </article>
    `).join("");

    // Show or hide empty state
    if (empty) {
        empty.classList.toggle("hidden", filtered.length !== 0);
    }
}

// ============================================================
// SEARCH BOOKS
// ============================================================

function searchBooks() {
    renderBooks();

    const browse = document.getElementById("browse");

    if (browse) {
        browse.scrollIntoView({
            behavior: "smooth"
        });
    }
}

// ============================================================
// QUICK SEARCH
// ============================================================

function quickSearch(term) {
    const searchInput = document.getElementById("searchInput");

    if (!searchInput) return;

    searchInput.value = term;
    searchBooks();
}

// ============================================================
// VIEW BOOK DETAILS
// ============================================================

function viewBook(id) {
    const book = books.find(
        item => Number(item.id) === Number(id)
    );

    if (!book) return;

    const modalContent = document.getElementById("modalContent");
    const modal = document.getElementById("modal");

    if (!modalContent || !modal) return;

    modalContent.innerHTML = `
        <span class="eyebrow">
            ${escapeHtml(book.type || "Sell")}
        </span>

        <h2>${escapeHtml(book.title)}</h2>

        <p>
            <strong>Author:</strong>
            ${escapeHtml(book.author || "Not provided")}
        </p>

        <p>
            <strong>Subject:</strong>
            ${escapeHtml(book.subject || book.category || "Not provided")}
        </p>

        <p>
            <strong>Condition:</strong>
            ${escapeHtml(book.condition || "Not provided")}
        </p>

        <p>
            <strong>Distance:</strong>
            ${Number(book.distance || 0).toFixed(1)} km away
        </p>

        <p>
            <strong>Owner:</strong>
            ${escapeHtml(book.owner || "Student")}
        </p>

        <p>
            <strong>Price:</strong>
            ${
                Number(book.price) > 0
                    ? "₹" + Number(book.price)
                    : "Free"
            }
        </p>

        <button
            class="primary-btn"
            style="margin-top:18px"
            onclick="requestBook(${Number(book.id)})"
        >
            Request book
        </button>
    `;

    modal.classList.remove("hidden");
}

// ============================================================
// REQUEST BOOK
// ============================================================

function requestBook(id) {
    const book = books.find(
        item => Number(item.id) === Number(id)
    );

    if (!book) return;

    const modalContent = document.getElementById("modalContent");

    if (!modalContent) return;

    modalContent.innerHTML = `
        <h2>Request this book</h2>

        <p>
            <strong>${escapeHtml(book.title)}</strong>
        </p>

        <form onsubmit="submitBookRequest(event, ${Number(book.id)})">

            <label for="requesterName">
                Your name
            </label>

            <input
                type="text"
                id="requesterName"
                placeholder="Enter your name"
                required
                maxlength="100"
                style="width:100%; padding:12px; margin:8px 0 15px;"
            >

            <label for="requestMessage">
                Message to the owner (optional)
            </label>

            <textarea
                id="requestMessage"
                placeholder="Write a message..."
                rows="4"
                maxlength="1000"
                style="width:100%; padding:12px; margin:8px 0 15px;"
            ></textarea>

            <p id="requestMessageStatus"></p>

            <button
                type="submit"
                class="primary-btn"
                style="margin-top:10px"
            >
                Submit Request
            </button>

        </form>
    `;
}


// ============================================================
// SUBMIT BOOK REQUEST TO POSTGRESQL
// ============================================================

async function submitBookRequest(event, bookId) {

    event.preventDefault();

    const nameInput = document.getElementById("requesterName");
    const messageInput = document.getElementById("requestMessage");
    const statusElement = document.getElementById("requestMessageStatus");
    const submitButton = event.currentTarget.querySelector(
        'button[type="submit"]'
    );

    const requesterName = nameInput.value.trim();
    const message = messageInput.value.trim();

    if (!requesterName) {
        statusElement.textContent = "Please enter your name.";
        statusElement.style.color = "#c62828";
        return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Submitting...";

    try {

        const response = await fetch(REQUEST_API_URL, {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                book_id: bookId,
                requester_name: requesterName,
                message: message
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.message || "Could not submit your request."
            );
        }

        const modalContent = document.getElementById("modalContent");

        modalContent.innerHTML = `
            <h2>Request submitted successfully!</h2>

            <p>
                Your request for
                <strong>${escapeHtml(books.find(book => Number(book.id) === Number(bookId))?.title || "the book")}</strong>
                has been saved.
            </p>

            <p>
                Request ID: ${Number(result.request.id)}
            </p>

            <p>
                Status: <strong>${escapeHtml(result.request.status)}</strong>
            </p>

            <button
                class="primary-btn"
                onclick="closeModal()"
            >
                Done
            </button>
        `;

    } catch (error) {

        console.error("Request submission error:", error);

        statusElement.textContent = error.message;
        statusElement.style.color = "#c62828";

        submitButton.disabled = false;
        submitButton.textContent = "Submit Request";

    }
}

// ============================================================
// CLOSE MODAL
// ============================================================

function closeModal() {
    const modal = document.getElementById("modal");

    if (modal) {
        modal.classList.add("hidden");
    }
}

// ============================================================
// SHOW FORM MESSAGE
// ============================================================

function showFormMessage(message, isError = false) {
    const formMessage = document.getElementById("formMessage");

    if (!formMessage) return;

    formMessage.textContent = message;
    formMessage.style.color = isError ? "#c62828" : "#16803c";
}

// ============================================================
// ADD NEW BOOK TO POSTGRESQL
// ============================================================

const bookForm = document.getElementById("bookForm");

if (bookForm) {
    bookForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const formData = new FormData(bookForm);

        const newBook = {
            title: String(formData.get("title") || "").trim(),
            author: String(formData.get("author") || "").trim(),
            subject: String(formData.get("subject") || "").trim(),
            condition: formData.get("condition"),
            type: formData.get("type"),
            price: Number(formData.get("price")) || 0,
            distance: Number(formData.get("distance")) || 0,
            owner: String(formData.get("owner") || "Student").trim()
        };

        if (!newBook.title || !newBook.author) {
            showFormMessage(
                "Please enter the book title and author.",
                true
            );
            return;
        }

        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(newBook)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.message || "Could not add the book."
                );
            }

            // Reload the latest database records
            await loadBooks();

            // Clear the form
            bookForm.reset();

            showFormMessage(
                "Your book has been listed successfully!"
            );

            // Move to Browse section
            const browse = document.getElementById("browse");

            if (browse) {
                browse.scrollIntoView({
                    behavior: "smooth"
                });
            }

        } catch (error) {
            console.error("Error adding book:", error);

            showFormMessage(
                "Could not list your book. Please check the backend server.",
                true
            );
        }
    });
}

// ============================================================
// ENTER KEY SEARCH
// ============================================================

const searchInput = document.getElementById("searchInput");

if (searchInput) {
    searchInput.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            searchBooks();
        }
    });
}

// ============================================================
// INITIAL PAGE LOAD
// ============================================================

loadBooks();