/*
 * main.js
 *
 * A small platformer game written in plain JavaScript using the HTML5
 * canvas API. The goal of the game is to reach the far right side of
 * the world while collecting coins along the way. When you collect all
 * coins or reach the end, a win message appears. Movement is
 * controlled with the left and right arrow keys (or A/D) and jumping
 * is done with the up arrow, W or the space bar.
 */

window.addEventListener('load', () => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const scoreLabel = document.getElementById('scoreLabel');
  const messageLabel = document.getElementById('message');

  /*
   * Background rendering is handled programmatically. Instead of relying
   * on an external image asset, we draw a sky gradient and a series of
   * parallax hills. Each hill layer scrolls at a different speed to
   * create a sense of depth. See drawBackground() below for details.
   */

  // Track keyboard state; we store booleans keyed by the event.code
  const keys = {};
  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
  });
  window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
  });

  /**
   * Draw the sky and hills. The camera offset is used to shift the
   * hills at different speeds (parallax) relative to the player's
   * movement. Hills are defined below and drawn as semicircles.
   *
   * @param {number} cameraX Current camera offset along the x‑axis.
   */
  function drawBackground(cameraX) {
    // Draw sky gradient
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#37a0ff');      // top: blue sky
    grad.addColorStop(0.5, '#69c6ff');    // mid: lighter blue
    grad.addColorStop(1, '#f9d56e');      // bottom: warm yellow/orange
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Draw far hills
    for (const hill of farHills) {
      const x = hill.x - cameraX * 0.3;
      ctx.beginPath();
      ctx.fillStyle = hill.color;
      ctx.arc(x, hill.y, hill.r, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
    }
    // Draw near hills
    for (const hill of nearHills) {
      const x = hill.x - cameraX * 0.5;
      ctx.beginPath();
      ctx.fillStyle = hill.color;
      ctx.arc(x, hill.y, hill.r, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
    }
  }

  // World dimensions. The game world can be wider than the canvas to
  // allow for scrolling.
  const world = {
    width: 3000,
    height: canvas.height,
    gravity: 0.5,
  };

  // Hill layers for the procedurally drawn background. Far hills
  // appear larger and scroll more slowly, while near hills scroll
  // slightly faster. Each hill is described by its center x
  // coordinate, its baseline y (measured from the top of the canvas),
  // its radius and its fill colour.
  const farHills = [
    { x: 0,    y: canvas.height - 180, r: 400, color: '#e89a7d' },
    { x: 600,  y: canvas.height - 200, r: 500, color: '#d78383' },
    { x: 1200, y: canvas.height - 170, r: 450, color: '#c96f8b' },
    { x: 1800, y: canvas.height - 210, r: 550, color: '#b85b7a' },
    { x: 2400, y: canvas.height - 180, r: 480, color: '#a64969' },
  ];
  const nearHills = [
    { x: 100,  y: canvas.height - 100, r: 250, color: '#78c893' },
    { x: 700,  y: canvas.height - 90,  r: 220, color: '#8cd68c' },
    { x: 1300, y: canvas.height - 80,  r: 240, color: '#6bbc8b' },
    { x: 1900, y: canvas.height - 100, r: 260, color: '#5aa375' },
    { x: 2500, y: canvas.height - 90,  r: 220, color: '#4a8c6a' },
  ];

  // Platform class represents a static block the player can stand on.
  class Platform {
    constructor(x, y, w, h) {
      this.x = x;
      this.y = y;
      this.w = w;
      this.h = h;
    }
    draw(cameraX) {
      const drawX = this.x - cameraX;
      ctx.fillStyle = '#8B4513'; // brown color for platforms
      ctx.fillRect(drawX, this.y, this.w, this.h);
      // Add a lighter top edge for some depth
      ctx.fillStyle = '#A0522D';
      ctx.fillRect(drawX, this.y, this.w, 4);
    }
  }

  // Coin class represents a collectible item. It is drawn as a simple
  // golden circle. When the player touches the coin it disappears
  // and the score increases.
  class Coin {
    constructor(x, y, r = 10) {
      this.x = x;
      this.y = y;
      this.r = r;
    }
    draw(cameraX) {
      const drawX = this.x - cameraX;
      ctx.beginPath();
      ctx.arc(drawX, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = '#ffd700'; // gold color
      ctx.fill();
      ctx.strokeStyle = '#e5c100';
      ctx.stroke();
    }
  }

  // Player class encapsulates the avatar controlled by the player. It
  // handles physics, input and collision detection. The visual
  // representation uses simple shapes drawn in the draw() method.
  class Player {
    constructor() {
      this.w = 40;
      this.h = 60;
      this.x = 50;
      this.y = 0;
      this.vx = 0;
      this.vy = 0;
      this.speed = 4;
      this.jumpStrength = 12;
      this.onGround = false;
    }
    update() {
      // Horizontal movement
      let moving = false;
      if (keys['ArrowLeft'] || keys['KeyA']) {
        this.vx = -this.speed;
        moving = true;
      }
      if (keys['ArrowRight'] || keys['KeyD']) {
        this.vx = this.speed;
        moving = true;
      }
      // Apply friction when no key is pressed
      if (!moving) {
        this.vx *= 0.8;
        if (Math.abs(this.vx) < 0.05) this.vx = 0;
      }
      // Apply horizontal velocity
      this.x += this.vx;

      // Prevent leaving the world horizontally
      if (this.x < 0) {
        this.x = 0;
        this.vx = 0;
      } else if (this.x + this.w > world.width) {
        this.x = world.width - this.w;
        this.vx = 0;
      }

      // Jumping
      if ((keys['ArrowUp'] || keys['KeyW'] || keys['Space']) && this.onGround) {
        this.vy = -this.jumpStrength;
        this.onGround = false;
      }

      // Apply gravity
      this.vy += world.gravity;
      this.y += this.vy;

      // Simple fail condition: if player falls below the canvas, reset
      if (this.y > canvas.height + 200) {
        this.respawn();
      }

      // Collision with platforms
      this.onGround = false;
      for (const plat of platforms) {
        // Only check collisions when falling
        if (
          this.vy >= 0 &&
          this.x + this.w > plat.x &&
          this.x < plat.x + plat.w &&
          this.y + this.h <= plat.y + 5 &&
          this.y + this.h + this.vy >= plat.y
        ) {
          this.y = plat.y - this.h;
          this.vy = 0;
          this.onGround = true;
        }
      }
    }
    respawn() {
      // Reset player position and velocity
      this.x = 50;
      this.y = 0;
      this.vx = 0;
      this.vy = 0;
    }
    draw(cameraX) {
      const drawX = this.x - cameraX;
      const drawY = this.y;
      // Draw body
      ctx.fillStyle = '#e76f51';
      ctx.fillRect(drawX, drawY, this.w, this.h);
      // Draw head (slightly overlapping the body)
      const headSize = this.w * 0.8;
      const headX = drawX + (this.w - headSize) / 2;
      const headY = drawY - headSize * 0.6;
      ctx.fillStyle = '#f4a261';
      ctx.fillRect(headX, headY, headSize, headSize);
      // Eyes
      ctx.fillStyle = '#264653';
      const eyeR = headSize * 0.12;
      // Left eye
      ctx.beginPath();
      ctx.arc(headX + headSize * 0.25, headY + headSize * 0.35, eyeR, 0, Math.PI * 2);
      ctx.fill();
      // Right eye
      ctx.beginPath();
      ctx.arc(headX + headSize * 0.75, headY + headSize * 0.35, eyeR, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Create level geometry and collectibles
  const platforms = [];
  const coins = [];

  function createLevel() {
    // Ground spanning the entire world
    platforms.push(new Platform(0, canvas.height - 50, world.width, 50));
    // Simple stair‑like platforms
    platforms.push(new Platform(250, canvas.height - 120, 120, 20));
    platforms.push(new Platform(500, canvas.height - 200, 120, 20));
    platforms.push(new Platform(800, canvas.height - 150, 120, 20));
    platforms.push(new Platform(1100, canvas.height - 250, 150, 20));
    platforms.push(new Platform(1500, canvas.height - 180, 160, 20));
    platforms.push(new Platform(1850, canvas.height - 100, 100, 20));
    platforms.push(new Platform(2100, canvas.height - 220, 180, 20));
    platforms.push(new Platform(2500, canvas.height - 160, 120, 20));
    // Place coins on platforms
    coins.push(new Coin(300, canvas.height - 160));
    coins.push(new Coin(530, canvas.height - 240));
    coins.push(new Coin(840, canvas.height - 200));
    coins.push(new Coin(1150, canvas.height - 300));
    coins.push(new Coin(1520, canvas.height - 230));
    coins.push(new Coin(1870, canvas.height - 140));
    coins.push(new Coin(2130, canvas.height - 260));
    coins.push(new Coin(2530, canvas.height - 200));
  }

  // Instantiate player and build the level
  const player = new Player();
  createLevel();

  let score = 0;
  let win = false;

  function updateGame() {
    if (!win) {
      player.update();
      // Collect coins
      for (let i = coins.length - 1; i >= 0; i--) {
        const coin = coins[i];
        // AABB collision check simplified by treating coin as a small square
        if (
          player.x < coin.x + coin.r &&
          player.x + player.w > coin.x - coin.r &&
          player.y < coin.y + coin.r &&
          player.y + player.h > coin.y - coin.r
        ) {
          coins.splice(i, 1);
          score += 10;
        }
      }
      // Check for win condition: reach the end of the world
      if (player.x + player.w > world.width - 50) {
        win = true;
        messageLabel.textContent = 'คุณชนะแล้ว!'; // "You Win!" in Thai
      }
    }
    scoreLabel.textContent = 'คะแนน: ' + score; // "Score" in Thai
  }

  function drawGame() {
    // Calculate camera offset so that the player stays centered
    let cameraX = player.x + player.w / 2 - canvas.width / 2;
    cameraX = Math.max(0, Math.min(cameraX, world.width - canvas.width));
    // Draw procedurally generated background using the current camera position
    drawBackground(cameraX);
    // Draw coins
    for (const coin of coins) {
      coin.draw(cameraX);
    }
    // Draw platforms
    for (const plat of platforms) {
      plat.draw(cameraX);
    }
    // Draw player
    player.draw(cameraX);
  }

  function gameLoop() {
    updateGame();
    drawGame();
    requestAnimationFrame(gameLoop);
  }
  // Start the game loop immediately. If the background image isn't
  // loaded yet the fallback color is used until it arrives.
  requestAnimationFrame(gameLoop);
});
