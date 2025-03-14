const game = document.getElementById('game');
const startScreen = document.getElementById('startScreen');
const basket = document.getElementById('basket');
const scoreDisplay = document.getElementById('score');
const livesDisplay = document.getElementById('lives');
const stageDisplay = document.getElementById('stage');
const gameOverScreen = document.getElementById('gameOver');
const soundToggle = document.getElementById('soundToggle');
const backgroundSelect = document.getElementById('backgroundSelect');
const catchSound = document.getElementById('catchSound');
const missSound = document.getElementById('missSound');
const boostSound = document.getElementById('boostSound');
const wormSound = document.getElementById('wormSound');
const slowSound = document.getElementById('slowSound');
const heartSound = document.getElementById('heartSound');
const bgMusic = document.getElementById('bgMusic');
const pauseBtn = document.getElementById('pauseBtn');

let basketX = 50;
let score = 0;
let lives = 4;
let stage = 1;
let gameInterval;
let fruitInterval;
let isGameOver = false;
let fruitSpeed = 5;
let spawnRate = 1000;
let isSlowActive = false;
let slowDuration = 5000;
let isPaused = false;
let basketY = window.innerHeight - 160; // Initial basket Y position
const BASKET_SPEED = 20;
const BASKET_VERTICAL_LIMIT = 100; // Minimum distance from top/bottom

// Premium features state
let isPremium = false;
let premiumFeatures = {
  themes: false,
  powerups: false,
  characters: false
};

const fruits = ['🍎', '🍌', '🍇', '🍓', '🍉', '🍑', '🍒'];
const specialObjects = ['🌟', '🐛', '⏳', '❤️']; // Boost (🌟), Worm (🐛), Slow-Down (⏳), Live Booster (❤️)

const PREMIUM_FRUITS = ['🍕', '🍔', '🍦', '🍩', '🍪', '🥝', '🥑'];
const PREMIUM_POWERUPS = ['🌈', '⚡', '🎯', '🛡️', '💫'];
const PREMIUM_THEMES = {
  'cottagecore': 'background.svg',
  'cyberpunk': 'cyberpunk.svg',
  'fantasy': 'fantasy.svg',
  'space': 'space.svg',
  'underwater': 'underwater.svg'
};

const ICONS = {
  PAUSE: '⏸️',
  PLAY: '▶️'
};

// Add these variables at the top with other declarations
let touchStartX = 0;
let touchStartY = 0;
let touchStartBasketX = 0;
let touchStartBasketY = 0;
const SWIPE_SENSITIVITY = 1.5; // Adjust this value to change swipe sensitivity

// Initialize variables
let gameStarted = false;

// Save game data
async function saveGameData() {
  const gameData = {
    id: 'gameState',
    highScore: score,
    soundEnabled: soundToggle.checked,
    background: backgroundSelect.value,
    isPremium: isPremium,
    premiumFeatures: premiumFeatures,
    timestamp: Date.now()
  };

  try {
    await saveToIndexedDB(gameData);
    // Request background sync if available
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register('sync-scores');
    }
  } catch (error) {
    console.error('Error saving game data:', error);
    // Fallback to localStorage if IndexedDB fails
    localStorage.setItem('fruitCatcherData', JSON.stringify(gameData));
  }
}

// Load game data
async function loadGameData() {
  try {
    const gameData = await getFromIndexedDB('gameState');
    if (gameData) {
      score = gameData.highScore || 0;
      soundToggle.checked = gameData.soundEnabled !== false;
      backgroundSelect.value = gameData.background || 'background.svg';
      isPremium = gameData.isPremium || false;
      premiumFeatures = gameData.premiumFeatures || {
        themes: false,
        powerups: false,
        characters: false
      };
      
      if (isPremium) {
        updatePremiumUI();
      }
      
      scoreDisplay.textContent = `Score: ${score}`;
      document.documentElement.style.setProperty('--bg-image', `url('${backgroundSelect.value}')`);
    }
  } catch (error) {
    console.error('Error loading game data:', error);
    // Fallback to localStorage if IndexedDB fails
    const fallbackData = localStorage.getItem('fruitCatcherData');
    if (fallbackData) {
      const gameData = JSON.parse(fallbackData);
      score = gameData.highScore || 0;
      soundToggle.checked = gameData.soundEnabled !== false;
      backgroundSelect.value = gameData.background || 'background.svg';
      isPremium = gameData.isPremium || false;
      premiumFeatures = gameData.premiumFeatures || {
        themes: false,
        powerups: false,
        characters: false
      };
      
      if (isPremium) {
        updatePremiumUI();
      }
      
      scoreDisplay.textContent = `Score: ${score}`;
      document.documentElement.style.setProperty('--bg-image', `url('${backgroundSelect.value}')`);
    }
  }
}

// Download game assets for offline use
async function downloadGameAssets() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      const cache = await caches.open('fruit-catcher-v1');
      
      // Cache sound files
      const soundFiles = [
        'bell-ringing-05.mp3',
        'fail-trombone-01.mp3',
        'magic-chime-02.mp3',
        'wrong-buzzer-01.mp3',
        'fairy-dust-01.mp3',
        'bensound-relaxing.mp3'
      ];

      for (const file of soundFiles) {
        try {
          await cache.add(file);
        } catch (error) {
          console.warn(`Failed to cache sound file: ${file}`);
        }
      }

      // Cache theme files
      for (const theme of Object.values(PREMIUM_THEMES)) {
        try {
          await cache.add(theme);
        } catch (error) {
          console.warn(`Failed to cache theme: ${theme}`);
        }
      }
    } catch (error) {
      console.error('Failed to cache game assets:', error);
    }
  }
}

// Initialize PWA features
async function initializePWA() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('Service Worker registered with scope:', registration.scope);
      
      // Download assets after service worker is ready
      await downloadGameAssets();
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
}

// Add to home screen prompt
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  
  // Show "Add to Home Screen" button
  const installButton = document.createElement('button');
  installButton.textContent = '📱 Add to Home Screen';
  installButton.classList.add('install-button');
  installButton.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to install prompt: ${outcome}`);
      deferredPrompt = null;
      installButton.style.display = 'none';
    }
  });
  
  document.querySelector('.premium-badge').appendChild(installButton);
});

// Initialize the game
document.addEventListener('DOMContentLoaded', async () => {
  await initializePWA();
  await loadGameData();

  // Initialize pause button
  const pauseBtn = document.getElementById('pauseBtn');
  pauseBtn.textContent = ICONS.PAUSE;

  // Add touch event listeners for pause button
  pauseBtn.addEventListener('touchstart', handlePauseTouch, { passive: false });
  pauseBtn.addEventListener('click', handlePauseClick);

  // Initialize fullscreen button
  const fullscreenBtn = document.getElementById('fullscreenBtn');
  fullscreenBtn.addEventListener('touchstart', handleFullscreenTouch, { passive: false });
  fullscreenBtn.addEventListener('click', handleFullscreenClick);

  // Mobile control buttons
  const controls = {
    up: document.querySelector('.up-btn'),
    down: document.querySelector('.down-btn'),
    left: document.querySelector('.left-btn'),
    right: document.querySelector('.right-btn')
  };

  // Touch events for mobile controls
  Object.entries(controls).forEach(([direction, button]) => {
    let intervalId = null;
    
    button.addEventListener('touchstart', (e) => {
      e.preventDefault();
      intervalId = setInterval(() => moveBasket(direction), 16);
    });

    button.addEventListener('touchend', () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    });
  });

  // Keyboard controls (updated to include vertical movement)
  document.addEventListener('keydown', function(e) {
    if (gameStarted && !isPaused) {
      switch(e.key) {
        case 'ArrowLeft':
          moveBasket('left');
          break;
        case 'ArrowRight':
          moveBasket('right');
          break;
        case 'ArrowUp':
          moveBasket('up');
          break;
        case 'ArrowDown':
          moveBasket('down');
          break;
      }
    }
  });
});

// Move basket with arrow keys (for computers)
document.addEventListener('keydown', (e) => {
  if (isGameOver) return;

  if (e.key === 'ArrowLeft' && basketX > 10) {
    basketX -= 5;
  } else if (e.key === 'ArrowRight' && basketX < 90) {
    basketX += 5;
  } else if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
    togglePause();
  }
  basket.style.left = `${basketX}%`;
});

// Remove old touch event listener and add new swipe controls
game.removeEventListener('touchmove', moveBasket);

// Touch controls for mobile (swipe)
game.addEventListener('touchstart', (e) => {
  if (isGameOver || !gameStarted) return;
  
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
  touchStartBasketX = basketX;
  touchStartBasketY = basketY;
});

game.addEventListener('touchmove', (e) => {
  if (isGameOver || !gameStarted || isPaused) return;
  e.preventDefault();

  const touchX = e.touches[0].clientX;
  const touchY = e.touches[0].clientY;
  const deltaX = touchX - touchStartX;
  const deltaY = touchY - touchStartY;
  const gameRect = game.getBoundingClientRect();

  // Horizontal movement
  const newBasketX = touchStartBasketX + (deltaX / gameRect.width) * 100 * SWIPE_SENSITIVITY;
  basketX = Math.max(0, Math.min(100, newBasketX));

  // Vertical movement
  const newBasketY = touchStartBasketY + (deltaY * SWIPE_SENSITIVITY);
  basketY = Math.max(
    BASKET_VERTICAL_LIMIT,
    Math.min(gameRect.height - 100, newBasketY)
  );

  updateBasketPosition();
});

// Update keyboard controls
document.addEventListener('keydown', (e) => {
  if (isGameOver || !gameStarted || isPaused) return;

  switch (e.key) {
    case 'ArrowLeft':
      basketX = Math.max(0, basketX - BASKET_SPEED);
      break;
    case 'ArrowRight':
      basketX = Math.min(100, basketX + BASKET_SPEED);
      break;
    case 'ArrowUp':
      basketY = Math.max(BASKET_VERTICAL_LIMIT, basketY - BASKET_SPEED);
      break;
    case 'ArrowDown':
      basketY = Math.min(window.innerHeight - 100, basketY + BASKET_SPEED);
      break;
    case 'p':
    case 'P':
    case 'Escape':
      togglePause();
      break;
  }
  updateBasketPosition();
});

// Helper function to update basket position
function updateBasketPosition() {
  const gameRect = game.getBoundingClientRect();
  
  // Update horizontal position
  basket.style.left = `${basketX}%`;
  
  // Update vertical position
  const maxY = gameRect.height - 100; // Leave some space from bottom
  const minY = BASKET_VERTICAL_LIMIT; // Minimum distance from top
  const clampedY = Math.max(minY, Math.min(maxY, basketY));
  
  basket.style.bottom = `${gameRect.height - clampedY}px`;
}

// Create falling fruits
function createFruit() {
  if (isGameOver || isPaused) return;

  const fruit = document.createElement('div');
  fruit.classList.add('fruit');

  // Premium fruits and power-ups
  const isSpecial = Math.random() < (isPremium ? 0.3 : 0.2);
  if (isSpecial) {
    let specialObject;
    if (isPremium && Math.random() < 0.4) {
      specialObject = PREMIUM_POWERUPS[Math.floor(Math.random() * PREMIUM_POWERUPS.length)];
    } else {
      specialObject = specialObjects[Math.floor(Math.random() * specialObjects.length)];
    }
    fruit.textContent = specialObject;
    
    if (PREMIUM_POWERUPS.includes(specialObject)) {
      fruit.classList.add('premium-powerup');
    } else if (specialObject === '🌟') {
      fruit.classList.add('boost');
    } else if (specialObject === '🐛') {
      fruit.classList.add('worm');
    } else if (specialObject === '⏳') {
      fruit.classList.add('slow');
    } else if (specialObject === '❤️') {
      fruit.classList.add('heart');
    }
  } else {
    const availableFruits = isPremium ? [...fruits, ...PREMIUM_FRUITS] : fruits;
    fruit.textContent = availableFruits[Math.floor(Math.random() * availableFruits.length)];
  }

  fruit.style.left = `${Math.random() * 80 + 10}%`;
  fruit.style.top = '-10%';
  game.appendChild(fruit);

  const fruitMoveInterval = setInterval(() => {
    if (isGameOver || isPaused) return;

    const fruitTop = parseFloat(fruit.style.top);
    if (fruitTop > 100) {
      fruit.remove();
      clearInterval(fruitMoveInterval);
      if (!fruit.classList.contains('worm') && !fruit.classList.contains('slow') && !fruit.classList.contains('heart')) {
        if (soundToggle.checked) missSound.play();
      }
    } else {
      const speed = isSlowActive ? fruitSpeed * 0.05 : fruitSpeed * 0.1;
      fruit.style.top = `${fruitTop + speed}%`;
    }

    const basketRect = basket.getBoundingClientRect();
    const fruitRect = fruit.getBoundingClientRect();

    if (
      basketRect.left < fruitRect.right &&
      basketRect.right > fruitRect.left &&
      basketRect.top < fruitRect.bottom &&
      basketRect.bottom > fruitRect.top
    ) {
      fruit.remove();
      clearInterval(fruitMoveInterval);
      triggerBasketWobble();

      let points = 1;
      let soundToPlay = catchSound;

      if (fruit.classList.contains('premium-powerup')) {
        handlePremiumPowerup(fruit.textContent);
        points = 5;
        soundToPlay = boostSound;
      } else if (fruit.textContent === '🌟') {
        points = 5;
        soundToPlay = boostSound;
      } else if (fruit.textContent === '🐛') {
        points = -3;
        lives--;
        livesDisplay.textContent = `Lives: ${lives}`;
        soundToPlay = wormSound;
        if (lives === 0) endGame();
      } else if (fruit.textContent === '⏳') {
        activateSlowDown();
        soundToPlay = slowSound;
      } else if (fruit.textContent === '❤️') {
        lives++;
        livesDisplay.textContent = `Lives: ${lives}`;
        soundToPlay = heartSound;
      } else if (PREMIUM_FRUITS.includes(fruit.textContent)) {
        points = 2;
      }

      score += points;
      scoreDisplay.textContent = `Score: ${score}`;
      
      if (soundToggle.checked) soundToPlay.play();

      if (score % 10 === 0) {
        stage++;
        stageDisplay.textContent = `Stage: ${stage}`;
        fruitSpeed = Math.min(15, fruitSpeed + 1);
        spawnRate = Math.max(300, spawnRate - 100);
        clearInterval(gameInterval);
        gameInterval = setInterval(createFruit, spawnRate);
      }
    }
  }, 20);
}

// Activate slow-down power-up
function activateSlowDown() {
  isSlowActive = true;
  setTimeout(() => {
    isSlowActive = false;
  }, slowDuration);
}

// End the game
function endGame() {
  isGameOver = true;
  clearInterval(gameInterval);
  clearInterval(fruitInterval);
  
  // Show game over screen
  gameOverScreen.style.display = 'block';
  
  // Show game over buttons
  const gameOverButtons = document.querySelector('.game-over-buttons');
  if (gameOverButtons) {
    gameOverButtons.classList.add('visible');
  }
  
  const finalScore = gameOverScreen.querySelector('.final-score');
  const highScore = gameOverScreen.querySelector('.high-score');
  
  finalScore.textContent = `Final Score: ${score}`;
  const savedData = JSON.parse(localStorage.getItem('fruitCatcherData')) || {};
  const previousHigh = savedData.highScore || 0;
  
  if (score > previousHigh) {
    highScore.textContent = `🎉 New High Score! 🎉`;
    highScore.classList.add('new-record');
  } else {
    highScore.textContent = `High Score: ${previousHigh}`;
    highScore.classList.remove('new-record');
  }
  
  bgMusic.pause();
  saveGameData();
}

// Reset the game
function resetGame() {
  isGameOver = false;
  isPaused = false;
  score = 0;
  stage = 1;
  lives = 4;
  fruitSpeed = 5;
  spawnRate = 1000;
  
  // Hide game over screen and buttons
  gameOverScreen.style.display = 'none';
  const gameOverButtons = document.querySelector('.game-over-buttons');
  if (gameOverButtons) {
    gameOverButtons.classList.remove('visible');
  }
  
  // Reset displays
  scoreDisplay.textContent = `Score: ${score}`;
  stageDisplay.textContent = `Stage: ${stage}`;
  livesDisplay.textContent = `Lives: ${lives}`;
  
  // Clear fruits and reset game state
  document.querySelectorAll('.fruit').forEach(fruit => fruit.remove());
  pauseBtn.textContent = ICONS.PAUSE;
  game.classList.remove('paused');
  
  // Start background music
  if (soundToggle.checked) {
    bgMusic.currentTime = 0;
    bgMusic.play();
  }
  
  startGame();
}

// Start the game
function startGame() {
  startScreen.style.display = 'none';
  game.style.display = 'block';
  gameStarted = true;
  document.documentElement.style.setProperty('--bg-image', `url('${backgroundSelect.value}')`);
  
  // Reset game state
  isPaused = false;
  pauseBtn.textContent = ICONS.PAUSE;
  game.classList.remove('paused');
  
  // Initialize sounds
  catchSound.muted = !soundToggle.checked;
  missSound.muted = !soundToggle.checked;
  boostSound.muted = !soundToggle.checked;
  wormSound.muted = !soundToggle.checked;
  slowSound.muted = !soundToggle.checked;
  heartSound.muted = !soundToggle.checked;
  bgMusic.muted = !soundToggle.checked;
  
  if (soundToggle.checked) {
    bgMusic.play();
  }
  
  // Start game loop
  gameInterval = setInterval(createFruit, spawnRate);
}

function triggerBasketWobble() {
  basket.classList.add('wobble');
  basket.addEventListener('animationend', () => {
    basket.classList.remove('wobble');
  }, { once: true });
}

// Pause/Resume game
function togglePause() {
  if (!gameStarted || isGameOver) return;
  
  isPaused = !isPaused;
  const pauseBtn = document.getElementById('pauseBtn');
  
  if (isPaused) {
    pauseBtn.textContent = ICONS.PLAY;
    game.classList.add('paused');
    clearInterval(gameInterval);
    if (fruitInterval) clearInterval(fruitInterval);
    bgMusic.pause();
    
    // Pause all fruit animations
    document.querySelectorAll('.fruit').forEach(fruit => {
      fruit.style.animationPlayState = 'paused';
    });
  } else {
    pauseBtn.textContent = ICONS.PAUSE;
    game.classList.remove('paused');
    gameInterval = setInterval(createFruit, spawnRate);
    if (soundToggle.checked) {
      bgMusic.play();
    }
    
    // Resume all fruit animations
    document.querySelectorAll('.fruit').forEach(fruit => {
      fruit.style.animationPlayState = 'running';
    });
  }
}

// Handle pause button touch
function handlePauseTouch(e) {
  e.preventDefault();
  e.stopPropagation();
  togglePause();
}

// Handle pause button click
function handlePauseClick(e) {
  e.preventDefault();
  e.stopPropagation();
  togglePause();
}

// Handle fullscreen button touch
function handleFullscreenTouch(e) {
  e.preventDefault();
  e.stopPropagation();
  toggleFullscreen();
}

// Handle fullscreen button click
function handleFullscreenClick(e) {
  e.preventDefault();
  e.stopPropagation();
  toggleFullscreen();
}

// Add event listeners for fullscreen changes
document.addEventListener('fullscreenchange', handleFullscreenChange);
document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
document.addEventListener('mozfullscreenchange', handleFullscreenChange);
document.addEventListener('MSFullscreenChange', handleFullscreenChange);

function handleFullscreenChange() {
  const gameContainer = document.getElementById('game');
  if (!document.fullscreenElement && 
      !document.webkitFullscreenElement && 
      !document.msFullscreenElement) {
    gameContainer.classList.remove('fullscreen');
  } else {
    gameContainer.classList.add('fullscreen');
  }
}

// Premium feature handling
function showPremiumModal(feature) {
  const modal = document.getElementById('premiumModal');
  modal.style.display = 'block';
  
  // Customize modal based on feature
  const title = modal.querySelector('h2');
  const benefits = modal.querySelector('.premium-benefits ul');
  
  switch(feature) {
    case 'themes':
      title.textContent = '🎨 Unlock Premium Themes';
      benefits.innerHTML = `
        <li>🌆 Cyberpunk City</li>
        <li>🏰 Fantasy Kingdom</li>
        <li>🚀 Space Adventure</li>
        <li>🌊 Underwater World</li>
        <li>🌈 More themes coming soon!</li>
      `;
      break;
    case 'powerups':
      title.textContent = '⚡ Enhanced Power-ups';
      benefits.innerHTML = `
        <li>🌈 Rainbow Fruit (2x points)</li>
        <li>⚡ Lightning Speed Boost</li>
        <li>🎯 Auto-Catch Ability</li>
        <li>🛡️ Worm Shield</li>
        <li>💫 Score Multiplier</li>
      `;
      break;
    case 'characters':
      title.textContent = '💎 Special Characters';
      benefits.innerHTML = `
        <li>🍕 Pizza (3x points)</li>
        <li>🍔 Burger (2x points)</li>
        <li>🍦 Ice Cream (Extra life)</li>
        <li>🍪 Cookie (Speed boost)</li>
        <li>🥝 Special Fruits Pack</li>
      `;
      break;
    default:
      // Keep default content for 'all' features
      break;
  }
}

function closePremiumModal() {
  document.getElementById('premiumModal').style.display = 'none';
}

function handlePurchase() {
  // Implement your payment processing logic here
  alert('🎉 Thank you for your purchase! Redirecting to payment...');
  // After successful payment:
  unlockPremiumFeatures();
}

function unlockPremiumFeatures() {
  isPremium = true;
  premiumFeatures = {
    themes: true,
    powerups: true,
    characters: true
  };
  
  // Update UI
  updatePremiumUI();
  // Save premium status
  saveGameData();
}

function updatePremiumUI() {
  const startScreen = document.getElementById('startScreen');
  startScreen.classList.add('premium-active');
  
  // Update theme selector
  const backgroundSelect = document.getElementById('backgroundSelect');
  backgroundSelect.innerHTML = '';
  Object.entries(PREMIUM_THEMES).forEach(([name, value]) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = name.charAt(0).toUpperCase() + name.slice(1);
    backgroundSelect.appendChild(option);
  });
  
  // Update unlock buttons
  document.querySelectorAll('.unlock-btn').forEach(btn => {
    btn.textContent = 'Unlocked';
    btn.classList.add('unlocked');
    btn.disabled = true;
  });
}

function handlePremiumPowerup(powerup) {
  switch(powerup) {
    case '🌈': // Rainbow Fruit
      score += 5;
      break;
    case '⚡': // Lightning Speed
      fruitSpeed *= 1.5;
      setTimeout(() => fruitSpeed /= 1.5, 5000);
      break;
    case '🎯': // Auto-Catch
      activateAutoCatch();
      break;
    case '🛡️': // Worm Shield
      activateWormShield();
      break;
    case '💫': // Score Multiplier
      activateScoreMultiplier();
      break;
  }
}

function activateAutoCatch() {
  const autoCatchDuration = 5000;
  const originalPosition = basketX;
  const autoCatchInterval = setInterval(() => {
    if (!isPaused && !isGameOver) {
      const fruits = document.querySelectorAll('.fruit');
      if (fruits.length > 0) {
        const closestFruit = Array.from(fruits).reduce((closest, current) => {
          const currentTop = parseFloat(current.style.top);
          const closestTop = closest ? parseFloat(closest.style.top) : -1;
          return currentTop > closestTop ? current : closest;
        });
        
        if (closestFruit) {
          const fruitLeft = parseFloat(closestFruit.style.left);
          basketX = Math.max(10, Math.min(90, fruitLeft));
          basket.style.left = `${basketX}%`;
        }
      }
    }
  }, 50);

  setTimeout(() => {
    clearInterval(autoCatchInterval);
    basketX = originalPosition;
    basket.style.left = `${basketX}%`;
  }, autoCatchDuration);
}

function activateWormShield() {
  const shieldDuration = 10000;
  basket.classList.add('shield-active');
  const originalLives = lives;
  
  const shieldInterval = setInterval(() => {
    if (lives < originalLives) {
      lives = originalLives;
      livesDisplay.textContent = `Lives: ${lives}`;
    }
  }, 100);

  setTimeout(() => {
    clearInterval(shieldInterval);
    basket.classList.remove('shield-active');
  }, shieldDuration);
}

function activateScoreMultiplier() {
  const multiplierDuration = 10000;
  const originalCreateFruit = createFruit;
  const multiplier = 2;

  createFruit = function() {
    if (isGameOver || isPaused) return;
    const result = originalCreateFruit.apply(this, arguments);
    score += multiplier - 1;
    scoreDisplay.textContent = `Score: ${score}`;
    return result;
  };

  setTimeout(() => {
    createFruit = originalCreateFruit;
  }, multiplierDuration);
}

function shareScore() {
  const text = `🎮 I scored ${score} points in Fruit Catcher Pro! Can you beat my score? 🏆`;
  if (navigator.share) {
    navigator.share({
      title: 'Fruit Catcher Pro Score',
      text: text,
      url: window.location.href
    }).catch(console.error);
  } else {
    // Fallback
    const dummy = document.createElement('textarea');
    document.body.appendChild(dummy);
    dummy.value = text;
    dummy.select();
    document.execCommand('copy');
    document.body.removeChild(dummy);
    alert('Score copied to clipboard! Share it with your friends! 🎮');
  }
}

// Update fullscreen handling
function toggleFullscreen() {
  const gameContainer = document.getElementById('game');
  
  if (!document.fullscreenElement && 
      !document.webkitFullscreenElement && 
      !document.msFullscreenElement) {
    
    // Try all possible methods
    if (gameContainer.requestFullscreen) {
      gameContainer.requestFullscreen();
    } else if (gameContainer.webkitRequestFullscreen) { // Safari
      gameContainer.webkitRequestFullscreen();
    } else if (gameContainer.msRequestFullscreen) { // IE11
      gameContainer.msRequestFullscreen();
    } else if (gameContainer.mozRequestFullScreen) { // Firefox
      gameContainer.mozRequestFullScreen();
    }
    
    // Add fullscreen class
    gameContainer.classList.add('fullscreen');
    // Change orientation to landscape if possible
    if (screen.orientation && screen.orientation.lock) {
      screen.orientation.lock('landscape').catch(() => {
        // Silently fail if orientation lock is not supported
      });
    }
  } else {
    // Exit fullscreen
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    }
    
    // Remove fullscreen class
    gameContainer.classList.remove('fullscreen');
  }
} 