const usernameInput = document.querySelector('.input-username');
const newGameButton = document.getElementById('new-game-btn');
const inputRoomID = document.querySelector('.input-RoomID');
const joinGameButton = document.getElementById('join-game-btn');
const inputRoomIDContainer = document.getElementById('input-RoomID-container');

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