const roomInput = document.querySelector('.input-RoomID');
const joinGameButton = document.getElementById('join-game-btn');

// Event listener to enable the "Beitreten" button when a Room ID is entered
roomInput.addEventListener('input', function() {
    if (roomInput.value.trim() !== "") {
        joinGameButton.disabled = false;
    } else {
        joinGameButton.disabled = true;
    }
});