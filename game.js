// Socket.io Verbindung
const socket = io('http://localhost:4000');

document.addEventListener('DOMContentLoaded', () => {
    socket.on('connect', () => {
        console.log('Verbunden mit dem Server');
        /*
        // URL Parameter auslesen und Raum beitreten
        const urlParams = new URLSearchParams(window.location.search);
        const roomId = urlParams.get('roomId');
        const playerName = urlParams.get('name');
        
        if (roomId && playerName) {
            console.log('Joining room:', roomId, 'as player:', playerName);
            socket.emit('joinRoom', { roomId, playerName });
        }
        */
        // RoomID und PlayerName aus localStorage lesen
        const roomId = localStorage.getItem('quickWordsRoomId');
        const playerName = localStorage.getItem('quickWordsPlayerName');
        
        if (!roomId || !playerName) {
            window.location.href = '/index.html';
            return;
        }

        console.log('Joining room:', roomId, 'as player:', playerName);
        socket.emit('joinRoom', { roomId, playerName });
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
    const currentPlayerDisplay = document.getElementById('currentPlayer');

    // Spielerliste erstellen
    const playerList = document.createElement('div');
    playerList.className = 'player-list noto-sans-bold';
    playerList.style.cssText = 'position: absolute; right: calc(50% + 300px); top: calc(57%); transform: translate(0, -50%); background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px; color: white; font-size: 18px;';
    document.body.appendChild(playerList);

    // Spielvariablen
    let timer = 25;
    let isGameActive = false;
    let selectedLetter = null;
    let interval;
    let isCurrentPlayer = false;

    /*
    // URL Parameter
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('roomId');
    */
    const roomId = localStorage.getItem('quickWordsRoomId');

    // Room ID Text setzen
    roomIdDisplay.value = 'Room ID';

    // Copy Button Funktionalität
    copyButton.addEventListener('click', () => {
        if (roomId) {
            navigator.clipboard.writeText(roomId)
                .then(() => console.log('Room ID kopiert:', roomId))
                .catch(err => console.error('Fehler beim Kopieren:', err));
        }
    });

    // Spielerliste aktualisieren
    function updatePlayerList(players, currentPlayer) {
        playerList.innerHTML = '<h3 style="margin-bottom: 15px; font-size: 22px;">Reihenfolge:</h3>';
        players.forEach(player => {
            const playerDiv = document.createElement('div');
            playerDiv.style.cssText = `
                margin: 8px 0;
                font-size: 18px;
                ${!player.isActive ? 'color: red;' : ''}
                ${currentPlayer && player.id === currentPlayer.id ? 'font-weight: bold; color: #FBC638;' : ''}
            `;
            playerDiv.innerHTML = `${!player.isActive ? '<span style="color: red;">✕ </span>' : ''}${currentPlayer && player.id === currentPlayer.id ? '➜ ' : ''}${player.name}`;
            playerList.appendChild(playerDiv);
        });
    }

    // Aktuellen Spieler anzeigen
    function updateCurrentPlayer(player) {
        if (!player) return;
        
        isCurrentPlayer = player.id === socket.id;
        currentPlayerDisplay.style.display = 'block';
        currentPlayerDisplay.textContent = `${player.name} ist dran!`;
        
        if (isCurrentPlayer) {
            enableButtons();
        } else {
            disableButtons();
        }
    }

    function enableButtons() {
        document.querySelectorAll('.letter').forEach(button => {
            if (!button.classList.contains('clicked')) {
                button.style.pointerEvents = 'auto';
            }
        });
        if (isCurrentPlayer) {
            mainButton.style.pointerEvents = 'auto';
            mainButton.disabled = false;
        }
    }

    function disableButtons() {
        document.querySelectorAll('.letter').forEach(button => {
            button.style.pointerEvents = 'none';
        });
        mainButton.style.pointerEvents = 'none';
        mainButton.disabled = true;
    }

    // Socket Events
    socket.on('playerJoined', (data) => {
        console.log('Player joined:', data);
        categoryLabel.textContent = data.category;
        updatePlayerList(data.players, data.currentPlayer);
        updateCurrentPlayer(data.currentPlayer);
    });

    socket.on('playerTurnChanged', (data) => {
        console.log('Player turn changed:', data);
        updateCurrentPlayer(data.currentPlayer);
        updatePlayerList(data.players, data.currentPlayer);
    });

    socket.on('playerEliminated', (data) => {
        if (data.playerId === socket.id) {
            isCurrentPlayer = false;
            disableButtons();
        }
    });

    socket.on('timerStarted', (data) => {
        console.log('Timer started:', data);
        updateCurrentPlayer(data.currentPlayer);
        startGame();
    });

    socket.on('categoryChanged', (data) => {
        console.log('Category changed:', data);
        categoryLabel.textContent = data.category;
        updatePlayerList(data.players, data.currentPlayer);
        updateCurrentPlayer(data.currentPlayer);
        resetGame();
    });

    // Textfeld Funktionen
    function openTextField() {
        wordInput.style.display = 'block';
        hinweis.style.display = 'block';
        wordInput.focus();
    }

    function closeTextField() {
        const textField = document.getElementById('wordInput');
        textField.style.display = 'none';
        textField.value = '';  // Zurücksetzen des Eingabewertes
        hinweis.style.display = 'none';
        if (isCurrentPlayer) {
            socket.emit('nextPlayer', { roomId });
        }
    }

    // Buchstaben-Click Handler
    function handleLetterClick(button) {
        if (!isCurrentPlayer) return;
        if (!isGameActive) return;
        
        const letter = button.getAttribute('data-letter');
        socket.emit('letterClicked', { roomId, letter });
        
        clickSound.play();
        selectedLetter = button;
        button.classList.add('clicked');
        button.disabled = true;
        openTextField();
        disableButtons();
        wordInput.placeholder = `Wort mit ${button.textContent}...`;
    }

    // Timer Funktionen
    function startGame() {
        console.log('Game starting...');
        isGameActive = true;
        timer = 25;
        mainButton.textContent = timer;
        startCountdown();
        if (isCurrentPlayer) {
            countdownSound.play();
            document.querySelectorAll('.letter').forEach(button => {
                if (!button.classList.contains('clicked')) {
                    button.style.pointerEvents = 'auto';
                }
            });
        }
    }

    function resetGame() {
        console.log('Game resetting...');
        isGameActive = false;
        clearInterval(interval);
        timer = 25;
        mainButton.textContent = 'START';
        if (isCurrentPlayer) {
            mainButton.style.pointerEvents = 'auto';
            mainButton.disabled = false;
        }
        document.querySelectorAll('.letter').forEach(button => {
            button.classList.remove('clicked');
            button.disabled = false;
            if (isCurrentPlayer && !isGameActive) {
                button.style.pointerEvents = 'none';
            }
        });
    }

    function startCountdown() {
        clearInterval(interval);
        interval = setInterval(() => {
            timer--;
            mainButton.textContent = timer;

            if (timer <= 0) {
                clearInterval(interval);
                if (isCurrentPlayer) {
                    socket.emit('playerFailed');
                }
                closeTextField();
            }
        }, 1000);
    }

    // Event Listener
    mainButton.addEventListener('click', () => {
        if (isCurrentPlayer && !isGameActive) {
            console.log('Starting timer...');
            socket.emit('startTimer', { roomId });
            mainButton.style.pointerEvents = 'none';
            mainButton.disabled = true;
        }
    });

    nextCategoryBtn.addEventListener('click', (e) => {
        e.preventDefault();
        socket.emit('newCategory', { roomId });
    });

    wordInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && wordInput.value.trim() !== '') {
            closeTextField();
        }
    });

    // Buchstaben-Buttons erstellen
    const allowedLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'R', 'S', 'T', 'W'];
    allowedLetters.forEach(letter => {
        const button = document.createElement('button');
        button.textContent = letter;
        button.classList.add('letter', 'noto-sans-bold');
        button.setAttribute('data-letter', letter);
        button.style.pointerEvents = 'none';

        button.addEventListener('click', () => handleLetterClick(button));
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

    // Letter clicked event
    socket.on('letterClicked', (data) => {
        if (data.letter) {
            const button = document.querySelector(`[data-letter="${data.letter}"]`);
            if (button) {
                button.classList.add('clicked');
                button.disabled = true;
            }
        }
    });
});