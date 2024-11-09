// game.js

const socket = io();

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

    // Room ID und Username aus localStorage laden
    const roomId = localStorage.getItem("roomId");
    const username = localStorage.getItem("username");
  
    let timer = 25;
    let isGameActive = false;
    let selectedLetter = null;
    let interval;
    let lettersClicked = 0; // Track the number of clicked letters
    let blinkAfterEnd = false; // Track if blinking should happen after the timer ends
    // Category management
    let categories = [];
    let usedCategories = JSON.parse(localStorage.getItem('usedCategories')) || [];
  
    // Room ID Text anzeigen:
    roomIdDisplay.value = 'Room ID';

    // Copy room ID functionality -> Room ID ist darin gespeichert
    copyButton.addEventListener('click', () => {
      if (roomId) {
        navigator.clipboard.writeText(roomId)
        //.then(() => alert("Room ID kopiert!"))
        .catch(err => console.error("Fehler beim Kopieren der Room ID:", err));
      } else {
        alert("Room ID nicht gefunden.");
      }
    });
  
    // Function to open the text field
    function openTextField() {
      wordInput.style.display = 'block'; // Zeige das Textfeld an
      hinweis.style.display = 'block'; // Zeige den Hinweis an
      wordInput.focus(); //Automatisch im Textfeld
    }
  
    // Function to close the text field
    function closeTextField() {
      wordInput.style.display = 'none'; // Blende das Textfeld aus
      hinweis.style.display = 'none'; // Blende den Hinweis aus
    }
  
    // Create letter buttons dynamically and make them clickable
    const allowedLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'R', 'S', 'T', 'W'];
    allowedLetters.forEach(letter => {
      const button = document.createElement('button');
      button.textContent = letter;
      button.classList.add('letter', 'noto-sans-bold');

      button.style.pointerEvents = 'none'; // Disable interaction initially

      button.addEventListener('click', () => {
        if (isGameActive) {
          clickSound.play();
          selectedLetter = button;
          button.classList.add('clicked'); // Button turns gray
          button.disabled = true; // Disable button
          openTextField();
          wordInput.placeholder = `Wort mit ${letter}...`; // Update placeholder with letter
          lettersClicked++; // Increment the clicked letters count
          checkAllLettersClicked(); // Check if all letters are clicked
        }
      });
      alphabetCircle.appendChild(button);
    });

    // Check if all letters have been clicked -> game is over
    function checkAllLettersClicked() {
      if (lettersClicked === allowedLetters.length) {
          blinkAfterEnd = true;
          mainButton.disabled = true;
      }
    }

    // Function to make letters blink -> if game is over
    function blinkLetters() {
      const originalColors = allowedLetters.map(letter => {
          const button = [...alphabetCircle.children].find(btn => btn.textContent === letter);
          return button.style.color; // Store original color
      });

      let currentIndex = 0;
      const blinkInterval = setInterval(() => {
        if (currentIndex < allowedLetters.length) {
          const button = [...alphabetCircle.children].find(btn => btn.textContent === allowedLetters[currentIndex]);
          button.style.color = 'gold'; // Change color to gold
          currentIndex++;
        } else {
          // Restore original colors
          allowedLetters.forEach((letter, index) => {
            const button = [...alphabetCircle.children].find(btn => btn.textContent === letter);
            button.style.color = originalColors[index]; // Restore original color
          });
        }
      }, 50); // Adjust speed of blinking
    }

    // Handle Enter key for submitting input
    wordInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
          event.preventDefault(); // Prevent form submission if inside a form
          if (wordInput.value.trim() !== '') {
              // Assuming you have a function to handle submission
              resetRound(); // Call reset to start the next round
              closeTextField(); // Close the text field
          }
          if (lettersClicked === allowedLetters.length) {
            blinkLetters(); // Start blinking letters after round ends
            blinkAfterEnd = false;
            endRound(); //Spiel ist zu Ende
          }
      }
    });

    // Position letter buttons in a circle
    const letters = document.querySelectorAll('.letter');
    const radius = 190; // Adjust as needed
    letters.forEach((letter, index) => {
      const angle = (index / letters.length) * (2 * Math.PI) - Math.PI / 2; // Start from the top (A)
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
      document.querySelectorAll('.letter').forEach(button => {
        button.style.pointerEvents = 'auto'; // Enable buttons
      });
      startCountdown();
      countdownSound.play();
    }
  
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
      // Disable buttons after round ends
      document.querySelectorAll('.letter').forEach(button => {
        button.style.pointerEvents = 'none';
      });
      closeTextField(); // Close the text field when the round ends
      if (blinkAfterEnd) {
          blinkLetters(); // Start blinking letters after round ends
          blinkAfterEnd = false; // Reset the flag
      }
    }
  

    // Load categories from JSON
    fetch('categories.json')
        .then(response => response.json())
        .then(data => {
            categories = data.categories;
            chooseRandomCategory();
        })
        .catch(error => console.error('Error loading categories:', error));

    // Function to choose a random category and display it
    function chooseRandomCategory() {
        if (categories.length === usedCategories.length) {
            usedCategories = []; // Reset if all categories are used
        }

        const availableCategories = categories.filter(cat => !usedCategories.includes(cat));
        const randomCategory = availableCategories[Math.floor(Math.random() * availableCategories.length)];

        usedCategories.push(randomCategory); // Mark as used
        categoryLabel.textContent = `${randomCategory}`;
        localStorage.setItem('usedCategories', JSON.stringify(usedCategories)); // Save to localStorage
    }

    // Event listener for "Next Category"
    document.querySelector('.cta').addEventListener('click', (e) => {
        e.preventDefault();
        chooseRandomCategory();
        location.reload(); // Refresh the page
    });
});
  