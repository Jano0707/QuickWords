// Connection zum Server
const socket = io('http://localhost:4000');

socket.on("connect", () => {
    console.log("Connected to server");
});

socket.on("connect_error", (err) => {
    console.error("Connection error:", err);
});

const usernameInput = document.querySelector('.input-username');
const newGameButton = document.getElementById('new-game-btn');
const joinGameButton = document.getElementById('join-game-btn');
const inputRoomIDContainer = document.getElementById('input-RoomID-container');
const inputRoomID = document.getElementById('input-RoomID');

// Aktiviert die "Spiel beitreten" und "Neues Spiel" buttons wenn ein Username eingegeben wurde
usernameInput.addEventListener('input', function() {
    const isUsernameEntered = usernameInput.value.trim() !== "";
    joinGameButton.disabled = !isUsernameEntered;
    newGameButton.disabled = !isUsernameEntered;
});

// Zeigt den Room ID Container an, wenn "Spiel beitreten" geklickt wird
joinGameButton.addEventListener('click', function() {
    inputRoomIDContainer.style.display = 'flex';
});

// Schließt das Modal, wenn außerhalb davon geklickt wird
window.onclick = function(event) {
    if (event.target == inputRoomIDContainer) {
        inputRoomIDContainer.style.display = "none";
    }
};

// Funktion zur Generierung einer zufälligen Room ID
function generateRoomId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Neues Spiel erstellen
newGameButton.addEventListener("click", () => {
    const username = usernameInput.value.trim();
    if (username) {
        const roomId = generateRoomId();
        console.log('Creating new room:', roomId);
        socket.emit("createRoom", roomId);
        socket.on('roomCreated', () => {
            window.location.href = `game.html?roomId=${roomId}&name=${encodeURIComponent(username)}`;
        });
    }
});

// Spiel beitreten
document.querySelector('.join-btn').addEventListener('click', () => {
    const username = usernameInput.value.trim();
    const roomId = inputRoomID.value.trim().toUpperCase();
    if (username && roomId) {
        console.log('Checking room:', roomId);
        socket.emit('checkRoom', roomId);
        
        socket.on('roomExists', (exists) => {
            if (exists) {
                window.location.href = `game.html?roomId=${roomId}&name=${encodeURIComponent(username)}`;
            } else {
                alert('Dieser Raum existiert nicht!');
            }
        });
    }
});