const usernameInput = document.querySelector('.input-username');
const newGameButton = document.getElementById('new-game-btn');
const inputRoomID = document.querySelector('.input-RoomID');
const joinGameButton = document.getElementById('join-game-btn');
const inputRoomIDContainer = document.getElementById('input-RoomID-container');
const socket = io();

socket.on("connect", () => {
    console.log("Connected to server");
});
socket.on("connect_error", (err) => {
    console.error("Connection error:", err);
});

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

// username im Backend speichern (für Spiel) und create Room
newGameButton.addEventListener("click", () => {
    const username = usernameInput.value.trim();
    if (username) {
        socket.emit("createRoom", username);
    }
})

// Erhalte von Backend Room
socket.on("roomCreated", (roomId) => {
    alert(`Raum erstellt! Room ID: ${roomId}`);
    // Wechsel zu game.html und speichere Room ID und Username
    localStorage.setItem("roomId", roomId);
    localStorage.setItem("username", usernameInput.value.trim());
    window.location.href = "game.html";
});

// Room joinen
document.getElementById("join-game-final-btn").addEventListener("click", () => {
    const username = usernameInput.value.trim();
    const roomId = inputRoomID.value.trim();
    if (username && roomId) {
        socket.emit("joinRoom", { username, roomId });
    }
});

// Room joinen erfolgreich? -> wenn ja, Room wurde gejoint
socket.on("userJoined", ({ username, roomId }) => {
    console.log(`${username} ist dem Raum ${roomId} beigetreten.`);
    // Wechsel zu game.html und speichere die Room ID
    localStorage.setItem("roomId", roomId);
    localStorage.setItem("username", username);
    window.location.href = "game.html";
});