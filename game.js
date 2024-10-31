// game.js
document.addEventListener('DOMContentLoaded', () => {
    const mainButton = document.getElementById('mainButton');
    const alphabetCircle = document.querySelector('.letter-buttons');
    const wordInput = document.getElementById('wordInput');
    const categoryLabel = document.getElementById('categoryLabel');
    const roomIdDisplay = document.getElementById('roomID-Display');
    const copyButton = document.getElementById('copyButton');
    const clickSound = document.getElementById('clickSound');
    const countdownSound = document.getElementById('countdownSound');
    const hinweis = document.getElementById('hinweis');
  
    let timer = 20;
    let isGameActive = false;
    let selectedLetter = null;
    let interval;
  
    // Generate a random room ID
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    roomIdDisplay.value = `Room ID: ${roomId}`; // Optional: To show room ID as `Room ID: ${roomId}`;
  
    // Copy room ID functionality
    copyButton.addEventListener('click', () => {
      navigator.clipboard.writeText(roomId).then(() => {
        alert('Room ID copied to clipboard!');
      });
    });
  
    // Function to open the text field
    function openTextField() {
      wordInput.style.display = 'block'; // Zeige das Textfeld an
      hinweis.style.display = 'block'; // Zeige den Hinweis an
    }
  
    // Function to close the text field
    function closeTextField() {
      wordInput.style.display = 'none'; // Blende das Textfeld aus
      hinweis.style.display = 'none'; // Blende den Hinweis aus
    }
  
    // Create letter buttons dynamically and make them clickable
    for (let i = 65; i <= 90; i++) {
      const letter = String.fromCharCode(i);
      const button = document.createElement('button');
      button.textContent = letter;
      button.classList.add('letter', 'noto-sans-bold');
      button.addEventListener('click', () => {
        if (!button.disabled) {
          clickSound.play();
          selectedLetter = button;
          button.classList.add('clicked'); // Button turns gray
          button.disabled = true; // Disable button
          openTextField();
          wordInput.placeholder = `Wort mit ${letter}...`; // Update placeholder with letter
        }
      });
      alphabetCircle.appendChild(button);
    }

    // Position letter buttons in a circle
    const letters = document.querySelectorAll('.letter');
    const radius = 190; // Adjust as needed
    letters.forEach((letter, index) => {
      const angle = (index / letters.length) * (2 * Math.PI);
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);
      letter.style.transform = `translate(${x}px, ${y}px)`;
    });
  
    // START button click handler
    mainButton.addEventListener('click', () => {
      if (!isGameActive) {
        startGame();
      } else {
        resetRound();
        closeTextField();
      }
    });
  
    function startGame() {
      isGameActive = true;
      mainButton.textContent = timer;
      startCountdown();
      countdownSound.play();
    }
  
    function resetRound() {
      if (selectedLetter && wordInput.value.trim() !== '') {
        console.log(`Word submitted: ${wordInput.value}`);
        wordInput.value = '';
        selectedLetter.classList.remove('clicked');
        selectedLetter = null;
      }
      clearInterval(interval);
      timer = 20;
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
    }
  
    // Set a sample category
    categoryLabel.textContent = 'Kategorie: Tiere';
  });
  