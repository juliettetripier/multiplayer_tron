const GAMESTATES = {
    gameActive: 'gameActive',
    gameOver: 'gameOver'
};

class Client {
    constructor() {
        const ui = document.querySelector('#ui');

        ws.addEventListener('message', (event) => {
            ui.innerText = event.data;
        })
    }
}

class Local {
    constructor() {
        this.entities = [];
        this.initializeGame();
        this.currentState = GAMESTATES.gameActive;
    }

    installEventHandlers() {
        document.addEventListener('keydown', (event) => {
            if (event.key == 'ArrowUp') {
                this.mainPlayer.processCommand('turnUp');
            } 
            else if (event.key == 'ArrowDown') {
                this.mainPlayer.processCommand('turnDown');
            }
            else if (event.key == 'ArrowLeft') {
                this.mainPlayer.processCommand('turnLeft');
            }
            else if (event.key == 'ArrowRight') {
                this.mainPlayer.processCommand('turnRight');
            }
        })
    }

    initializeGame() {
        this.canvas = document.querySelector('#main-canvas');
        this.ctx = this.canvas.getContext('2d');
        const background = new Background();
        this.addEntity(background);
        const player = new Player();
        this.mainPlayer = player;
        this.addEntity(player);
        this.installEventHandlers();
        this.gameLoop();
    }

    addEntity(entity) {
        this.entities.push(entity);
    }

    tick() {
        this.ctx.clearRect(0, 0, 400, 400);
        this.entities.forEach((entity) => entity.update());
        this.entities.forEach((entity) => entity.draw(this.ctx));
        // this.entities.forEach((entity) => entity.checkCollisions());
        window.requestAnimationFrame(() => this.tick());
    }

    endGame() {
        
    }

    gameLoop() {
        const gameState = {
            [GAMESTATE.gameActive]: this.tick,
            [GAMESTATE.gameOver]: this.endGame
        };
        (gameState[this.currentState])();
    }
}

class Background {
    draw(ctx) {
        ctx.beginPath();
        ctx.rect(0,0,400,400);
        ctx.fillStyle = 'indigo';
        ctx.fill();
        ctx.closePath();
    }

    update() {}
}

class Player {
    constructor() {
        this.playerLocation = {
            x: 20,
            y: 200
        };
        this.initialPlayerPos = {...this.playerLocation};
        this.playerDirection = 'right';
        this.playerSpeed = 300;
        this.turnHistory = [];
        this.lastUpdated = null;
    }

    update() {
        let delta = 0;
        if (this.lastUpdated != null) {
            delta = Date.now() - this.lastUpdated;
        }
        let deltaSeconds = delta / 1000;
        this.lastUpdated = Date.now();
        
        switch (this.playerDirection) {
            case 'right':
                this.playerLocation.x += this.playerSpeed * deltaSeconds;
                break;
            case 'left':
                this.playerLocation.x -= this.playerSpeed * deltaSeconds;
                break;
            case 'up':
                this.playerLocation.y -= this.playerSpeed * deltaSeconds;
                break;
            case 'down':
                this.playerLocation.y += this.playerSpeed * deltaSeconds;
                break;
            default:
                throw new Error('Invalid direction');
        }

        this.checkCollisions();
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.playerLocation.x, this.playerLocation.y, 10, 0, Math.PI * 2);
        ctx.fillStyle = 'yellow';
        ctx.fill();
        this.drawTrail(ctx);
        ctx.closePath();
    }

    drawTrail(ctx) {
        ctx.moveTo(this.initialPlayerPos.x, this.initialPlayerPos.y);
        this.turnHistory.forEach((turn) => {
            ctx.lineTo(turn.location.x, turn.location.y);
        })
        ctx.lineTo(this.playerLocation.x, this.playerLocation.y);
        ctx.strokeStyle = 'yellow';
        ctx.lineWidth = 10;
        ctx.stroke();
    }

    registerTurn() {
        const currentLocation = {...this.playerLocation};
        const newTurn = {
            direction: this.playerDirection,
            location: currentLocation
        };
        this.turnHistory.push(newTurn);
    }

    checkCollisions() {
        const currentLocation = {...this.playerLocation};
        // if (currentLocation.x <= 0 || currentLocation.x >= 400
        //     || currentLocation.y <= 0 || currentLocation.y >= 400) {
        //     console.log('Collision')};

        // Bug - collisions on the X axis being detected on
        // page load - but not when I refresh quickly?

        if (currentLocation.x <= 0 || currentLocation.x >= 400) {
            console.log('Collision X')
        };
        if (currentLocation.y <= 0 || currentLocation.y >= 400) {
            console.log('Collision Y')
        };
    }

    processCommand(command) {
        switch(command) {
            case 'turnUp':
                this.playerDirection = 'up';
                this.registerTurn();
                break;
            case 'turnDown':
                this.playerDirection = 'down';
                this.registerTurn();
                break;
            case 'turnLeft':
                this.playerDirection = 'left';
                this.registerTurn();
                break;
            case 'turnRight':
                this.playerDirection = 'right';
                this.registerTurn();
                break;
            default:
                throw new Error('Invalid direction uh oh');
        }
    }
}

const ws = new WebSocket('wss://poised-brook-chartreuse.glitch.me/wss');

window.addEventListener('DOMContentLoaded', () => {
    const new_client = new Client();
    const new_local = new Local();
})