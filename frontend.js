const socket = io();

// Socket connection
socket.on("connect", () => {
    console.log("Connected to server");
});

socket.on("connect_error", (err) => {
    console.error("Connection error:", err);
});


if (window.location.pathname === '/') {
    //DOM Elements
    const usernameInput = document.querySelector('.input-username');
    const newGameButton = document.getElementById('new-game-btn');
    const inputRoomID = document.querySelector('.input-RoomID');
    const joinGameButton = document.getElementById('join-game-btn');
    const inputRoomIDContainer = document.getElementById('input-RoomID-container');

    /* 
    Setup Room + User
    */

    // Handle username input
    usernameInput.addEventListener('input', function () {
        const isUsernameEntered = usernameInput.value.trim() !== "";
        joinGameButton.disabled = !isUsernameEntered;
        newGameButton.disabled = !isUsernameEntered;
    });

    // Show the room input for joining a game
    joinGameButton.addEventListener('click', function () {
        inputRoomIDContainer.style.display = 'flex';
    });

    // Hide room input if clicked outside
    window.onclick = function (event) {
        if (event.target == inputRoomIDContainer) {
            inputRoomIDContainer.style.display = "none";
        }
    };

    // Start a new game
    newGameButton.addEventListener("click", () => {
        const username = usernameInput.value.trim();
        if (username) {
            socket.emit("createRoom", username);
        }
    });

    // Room creation response
    socket.on("roomCreated", (roomId) => {
        // Save room ID and username to localStorage
        localStorage.setItem("roomId", roomId);
        localStorage.setItem("username", usernameInput.value.trim());
        
        window.location.href = "game.html";
    });

    // Join an existing room
    document.getElementById("join-game-final-btn").addEventListener("click", () => {
        const username = usernameInput.value.trim();
        const roomId = inputRoomID.value.trim();
        if (username && roomId) {
            socket.emit("joinRoom", { username, roomId });
        }
    });

    // User joined the room
    socket.on("userJoined", ({ username, roomId }) => {
        localStorage.setItem("roomId", roomId);
        localStorage.setItem("username", username);
        window.location.href = "game.html";
    });
}

if (window.location.pathname === '/game.html') {
    // DOM Elements
    const mainButton = document.getElementById('mainButton');
    const alphabetCircle = document.querySelector('.letter-buttons');
    const wordInput = document.getElementById('wordInput');
    const categoryLabel = document.getElementById('categoryLabel');
    const roomIdDisplay = document.getElementById('roomID-Display');
    const copyButton = document.getElementById('copyButton');
    const clickSound = document.getElementById('clickSound');
    const countdownSound = document.getElementById('countdownSound');
    const hinweis = document.getElementById('hinweis');

    // Global game state
    let isGameActive = false;
    let timer = 25;
    let selectedLetter = null;
    let interval;
    let lettersClicked = 0; // Track the number of clicked letters
    let blinkAfterEnd = false; // Track if blinking should happen after the timer ends
    let categories = [];
    let usedCategories = JSON.parse(localStorage.getItem('usedCategories')) || [];

    /* 
        Game Logik
    */

    // Setup initial roomId and username
    if (localStorage.getItem("roomId")) {
        roomIdDisplay.value = localStorage.getItem("roomId");
    } else {
        roomIdDisplay.value = 'Room ID'; // Default if not found
    }


    // Copy room ID functionality
    copyButton.addEventListener('click', () => {
        if (roomId) {
            navigator.clipboard.writeText(roomId)
                .catch(err => console.error("Fehler beim Kopieren der Room ID:", err));
        } else {
            alert("Room ID nicht gefunden.");
        }
    });

    // Handle letter clicks
    const allowedLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'R', 'S', 'T', 'W'];
    allowedLetters.forEach(letter => {
        const button = document.createElement('button');
        button.textContent = letter;
        button.classList.add('letter', 'noto-sans-bold');
        button.setAttribute('data-letter', letter);

        button.style.pointerEvents = 'none'; // Disable interaction initially

        button.addEventListener('click', () => {
            if (isGameActive) {
                socket.emit("letterClicked", { roomId, letter });
                handleLetterClick(button);
            }
        });
        alphabetCircle.appendChild(button);
    });

    // Handle letter button click
    function handleLetterClick(button) {
        clickSound.play();
        selectedLetter = button;
        button.classList.add('clicked');
        button.disabled = true;
        openTextField();
        wordInput.placeholder = `Wort mit ${button.textContent}...`;
        lettersClicked++;
        checkAllLettersClicked();
    }

    // Open text input field
    function openTextField() {
        wordInput.style.display = 'block';
        hinweis.style.display = 'block';
        wordInput.focus();
    }

    // Close text input field
    function closeTextField() {
        wordInput.style.display = 'none';
        hinweis.style.display = 'none';
    }

    // Check if all letters have been clicked (game over)
    function checkAllLettersClicked() {
        if (lettersClicked === allowedLetters.length) {
            blinkAfterEnd = true;
            mainButton.disabled = true;
        }
    }

    // Blink letters after the game ends
    function blinkLetters() {
        const originalColors = allowedLetters.map(letter => {
            const button = [...alphabetCircle.children].find(btn => btn.textContent === letter);
            return button.style.color;
        });

        let currentIndex = 0;
        const blinkInterval = setInterval(() => {
            if (currentIndex < allowedLetters.length) {
                const button = [...alphabetCircle.children].find(btn => btn.textContent === allowedLetters[currentIndex]);
                button.style.color = 'gold';
                currentIndex++;
            } else {
                allowedLetters.forEach((letter, index) => {
                    const button = [...alphabetCircle.children].find(btn => btn.textContent === letter);
                    button.style.color = originalColors[index];
                });
            }
        }, 50);
    }

    // Synchronize text input
    wordInput.addEventListener('input', () => {
        const text = wordInput.value;
        socket.emit("textInput", { roomId, text });
    });

    // Update word input with other player's text
    socket.on("textUpdate", (text) => {
        wordInput.value = text;
    });

    // Main button click handler
    mainButton.addEventListener('click', () => {
        if (!isGameActive) {
            startGame();
            socket.emit("mainButtonPressed", roomId);
        } else {
            resetRound();
            closeTextField();
        }
    });

    // Update the main button state
    socket.on("mainButtonUpdate", () => {
        if (!isGameActive) {
            startGame();
        } else {
            resetRound();
            closeTextField();
        }
    });

    // Start the game
    function startGame() {
        isGameActive = true;
        mainButton.textContent = timer;
        document.querySelectorAll('.letter').forEach(button => {
            button.style.pointerEvents = 'auto'; // Enable buttons
        });
        startCountdown();
        countdownSound.play();
    }

    // Reset the round
    function resetRound() {
        if (selectedLetter && wordInput.value.trim() !== '') {
            console.log(`Word submitted: ${wordInput.value}`);
            wordInput.value = '';
            selectedLetter = null;
        }
        clearInterval(interval);
        timer = 25;
        mainButton.textContent = timer;
        startCountdown();
    }

    // Start countdown
    function startCountdown() {
        clearInterval(interval);
        interval = setInterval(() => {
            timer--;
            mainButton.textContent = timer;
            if (timer === 0) {
                clearInterval(interval);
                endRound();
            }
        }, 1000);
    }

    // End round
    function endRound() {
        isGameActive = false;
        mainButton.textContent = 'START';
        countdownSound.pause();
        countdownSound.currentTime = 0;
        document.querySelectorAll('.letter').forEach(button => {
            button.style.pointerEvents = 'none';
        });
        closeTextField();
        if (blinkAfterEnd) {
            blinkLetters();
            blinkAfterEnd = false;
        }
    }

    // Load categories
    fetch('categories.json')
        .then(response => response.json())
        .then(data => {
            categories = data.categories;
            chooseRandomCategory();
        })
        .catch(error => console.error('Error loading categories:', error));

    // Choose a random category
    function chooseRandomCategory() {
        if (categories.length === usedCategories.length) {
            usedCategories = []; // Reset if all categories are used
        }

        const availableCategories = categories.filter(cat => !usedCategories.includes(cat));
        const randomCategory = availableCategories[Math.floor(Math.random() * availableCategories.length)];

        usedCategories.push(randomCategory);
        categoryLabel.textContent = `${randomCategory}`;
        localStorage.setItem('usedCategories', JSON.stringify(usedCategories));
    }

    // Event listener for "Next Category"
    document.querySelector('.cta').addEventListener('click', (e) => {
        e.preventDefault();
        chooseRandomCategory();
        location.reload();
    });

}