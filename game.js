// Socket.io Verbindung
const socket = io('http://localhost:4000');

document.addEventListener('DOMContentLoaded', () => {
    socket.on('connect', () => {
        console.log('Verbunden mit dem Server');
        // URL Parameter auslesen und Raum beitreten
        const urlParams = new URLSearchParams(window.location.search);
        const roomId = urlParams.get('roomId');
        const playerName = urlParams.get('name');
        
        if (roomId && playerName) {
            console.log('Joining room:', roomId, 'as player:', playerName);
            socket.emit('joinRoom', { roomId, playerName });
            closeTextField();
        }
    });

    socket.on('connect_error', (err) => {
        console.error('Verbindungsfehler:', err);
    });

    // DOM Elemente
    const mainButton = document.getElementById('mainButton');
    const alphabetCircle = document.querySelector('.letter-buttons');
    const wordInput = document.getElementById('wordInput');
    const categoryLabel = document.getElementById('categoryLabel');
    const roomIdDisplay = document.getElementById('roomID-Display');
    const copyButton = document.getElementById('copyButton');
    const clickSound = document.getElementById('clickSound');
    const countdownSound = document.getElementById('countdownSound');
    const hinweis = document.getElementById('hinweis');
    const nextCategoryBtn = document.querySelector('.cta');

    // Spielvariablen
    let timer = 25;
    let isGameActive = false;
    let selectedLetter = null;
    let interval;
    let lettersClicked = 0;
    let blinkAfterEnd = false;

    // URL Parameter
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('roomId');

    // Room ID Text setzen
    roomIdDisplay.value = 'Room ID';

    // Copy Button Funktionalität
    copyButton.addEventListener('click', () => {
        if (roomId) {
            navigator.clipboard.writeText(roomId)
                .then(() => {
                    console.log('Room ID kopiert:', roomId);
                })
                .catch(err => {
                    console.error('Fehler beim Kopieren:', err);
                });
        }
    });

    // Textfeld Funktionen
    function openTextField() {
        wordInput.style.display = 'block';
        hinweis.style.display = 'block';
        wordInput.focus();
    }

    function closeTextField() {
        wordInput.style.display = 'none';
        hinweis.style.display = 'none';
    }

    // Buchstaben-Buttons erstellen
    const allowedLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'R', 'S', 'T', 'W'];
    allowedLetters.forEach(letter => {
        const button = document.createElement('button');
        button.textContent = letter;
        button.classList.add('letter', 'noto-sans-bold');
        button.setAttribute('data-letter', letter);
        button.style.pointerEvents = 'none';

        button.addEventListener('click', () => {
            if (isGameActive) {
                socket.emit("letterClicked", { roomId, letter });
                handleLetterClick(button);
            }
        });
        alphabetCircle.appendChild(button);
    });

    // Position der Buchstaben im Kreis
    const letters = document.querySelectorAll('.letter');
    const radius = 190;
    letters.forEach((letter, index) => {
        const angle = (index / letters.length) * (2 * Math.PI) - Math.PI / 2;
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);
        letter.style.transform = `translate(${x}px, ${y}px)`;
    });

    // Buchstaben-Click Handler
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

    // Prüfen ob alle Buchstaben geklickt wurden
    function checkAllLettersClicked() {
        if (lettersClicked === allowedLetters.length) {
            blinkAfterEnd = true;
            mainButton.disabled = true;
        }
    }

    // Buchstaben blinken lassen
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

    // Wort-Eingabe Handler
    wordInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            if (wordInput.value.trim() !== '') {
                socket.emit('submitWord', { 
                    word: wordInput.value.trim(), 
                    letter: selectedLetter.textContent,
                    roomId: roomId
                });
                resetRound();
                closeTextField();
            }
            if (lettersClicked === allowedLetters.length) {
                blinkLetters();
                blinkAfterEnd = false;
                endRound();
            }
        }
    });

    // Main Button Handler
    mainButton.addEventListener('click', () => {
        console.log('Main button clicked, isGameActive:', isGameActive);
        if (!isGameActive && roomId) {
            console.log('Emitting startTimer event with roomId:', roomId);
            socket.emit('startTimer', { roomId });
        }
    });

    // Nächste Kategorie Button Handler
    nextCategoryBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (roomId) {
            console.log('Requesting new category for room:', roomId);
            socket.emit('newCategory', { roomId });
        }
    });

    // Timer Funktionen
    function startGame() {
        isGameActive = true;
        mainButton.textContent = timer;
        document.querySelectorAll('.letter').forEach(button => {
            button.style.pointerEvents = 'auto';
        });
        startCountdown();
        countdownSound.play();
    }

    function resetRound() {
        if (selectedLetter && wordInput.value.trim() !== '') {
            wordInput.value = '';
            selectedLetter = null;
        }
        clearInterval(interval);
        timer = 25;
        mainButton.textContent = timer;
        startCountdown();
    }

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

    // Socket Events
    socket.on('playerJoined', (data) => {
        console.log('Player joined:', data);
        if (data.category) {
            categoryLabel.textContent = data.category;
        }
    });

    socket.on('timerStarted', (data) => {
        console.log('Timer started event received:', data);
        startGame();
    });

    socket.on('categoryChanged', (data) => {
        console.log('Category changed event received:', data);
        categoryLabel.textContent = data.category;
    });

    socket.on('letterClicked', (data) => {
        console.log('Letter clicked event received:', data);
        if (data.letter) {
            const button = document.querySelector(`[data-letter="${data.letter}"]`);
            if (button) {
                handleLetterClick(button);
            }
        }
    });
});