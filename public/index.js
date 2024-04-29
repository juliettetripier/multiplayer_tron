const GAMESTATES = {
    gameStart: 'gameStart',
    gameActive: 'gameActive',
    gameOver: 'gameOver'
};

const ARENASIZES = {
    width: 600,
    height: 600
};

let playerID = 0;



class Client extends EventTarget {
    constructor() {
        super();
        this.ws = new WebSocket('wss://poised-brook-chartreuse.glitch.me/wss');
        this.serverCommands = new Set(['turnUp', 'turnDown', 'turnLeft', 'turnRight', 'game ready'])
        this.ws.addEventListener('open', () => {
            this.dispatchEvent(new Event('ready'));
        })
        this.ws.addEventListener('message', (event) => {
            console.log(event.data);
            if (this.serverCommands.has(event.data)) {
                this.dispatchEvent(new Event(event.data));
            }
        })
    }

    startAIGame() {
        this.ws.send('AI game please');
    }

    startMultiplayerGame() {
        this.ws.send('multiplayer game please');
    }
}

class Local {
    constructor(newClient) {
        this.currentState = GAMESTATES.gameStart;
        this.gameStartState = null;
        this.gameActiveState = null;
        this.gameOverState = null;
        this.newClient = newClient;
        this.opponentCommands = new Set(['turnUp', 'turnDown', 'turnLeft', 'turnRight']);
        this.initializeGame();
    }

    initializeGame() {
        this.canvas = document.querySelector('#main-canvas');
        this.canvas.setAttribute('width', ARENASIZES.width);
        this.canvas.setAttribute('height', ARENASIZES.height);
        this.ctx = this.canvas.getContext('2d');
        this.boundGameLoop = this.gameLoop.bind(this);
        this.opponentCommands.forEach(command => {
            this.newClient.addEventListener(command, (event) => {
                if (this.gameActiveState.opponent) {
                    this.gameActiveState.opponent.processCommand(command);
                }
            });
        });
        this.newClient.addEventListener('game ready', () => {
            console.log('game is ready');
            this.gameStartState.waitingRoomTeardown();
            this.currentState = GAMESTATES.gameActive;
            this.gameActiveState.setUp();
        })
        this.gameStartState = new GameStartState(this.boundGameLoop, this.canvas, this.ctx);
        this.gameOverState = new GameOverState(this.boundGameLoop, this.canvas, this.ctx);
        this.gameActiveState = new GameActiveState(this.newClient, this.boundGameLoop, this.canvas, this.ctx);
        this.gameStartState.addEventListener('start AI game', () => {
            this.gameStartState.tearDown();
            this.currentState = GAMESTATES.gameActive;
            this.gameActiveState.setUp();
            this.newClient.startAIGame();
        });
        this.gameStartState.addEventListener('start multiplayer game', () => {
            this.gameStartState.tearDown();
            this.newClient.startMultiplayerGame();
            this.gameStartState.showWaitingRoomOverlay();
        });
        this.gameActiveState.addEventListener('lose game', () => {
            this.newClient.ws.send('game complete');
            this.gameActiveState.tearDown();
            this.currentState = GAMESTATES.gameOver;
            this.gameOverState.determineWinner('opponent');
            this.gameOverState.setUp();
        });
        this.gameActiveState.addEventListener('win game', () => {
            this.newClient.ws.send('game complete');
            this.gameActiveState.tearDown();
            this.currentState = GAMESTATES.gameOver;
            this.gameOverState.determineWinner('player');
            this.gameOverState.setUp();
        })
        this.gameOverState.addEventListener('show start menu', () => {
            this.gameOverState.tearDown();
            this.currentState = GAMESTATES.gameStart;
            this.gameStartState.setUp();
        })
        this.gameStartState.setUp();
    }

    gameLoop() {
        const gameState = {
            [GAMESTATES.gameActive]: () => this.gameActiveState.tick(),
            [GAMESTATES.gameOver]: () => this.gameOverState.tick(),
            [GAMESTATES.gameStart]: () => this.gameStartState.tick(),
        };
        (gameState[this.currentState])();
    }
}

class GameStartState extends EventTarget {
    constructor(gameLoop, canvas, ctx) {
        super();
        this.gameLoop = gameLoop;
        this.canvas = canvas;
        this.ctx = ctx;
        this.overlay = document.getElementById('start-game-overlay');
        this.overlay.style.width = `${ARENASIZES.width}px`;
        this.overlay.style.height = `${ARENASIZES.height}px`;
        this.waitingRoomOverlay = document.getElementById('waiting-room-overlay');
        this.waitingRoomOverlay.style.width = `${ARENASIZES.width}px`;
        this.waitingRoomOverlay.style.height = `${ARENASIZES.height}px`;
        this.startSoloButton = document.getElementById('start-solo-button');
        this.startMultiButton = document.getElementById('start-multi-button');
        this.boundStartAIGame = this.startAIGame.bind(this);
        this.boundStartMultiplayerGame = this.startMultiplayerGame.bind(this);
    }

    setUp() {
        this.overlay.className = 'startGame overlay';
        this.startSoloButton.className = 'startScreenButton';
        this.startMultiButton.className = 'startScreenButton';
        this.installEventHandlers();
        this.gameLoop();
    }

    installEventHandlers() {
        this.startSoloButton.addEventListener('click', this.boundStartAIGame);
        this.startMultiButton.addEventListener('click', this.boundStartMultiplayerGame);
    }

    tearDown() {
        this.startSoloButton.removeEventListener('click', this.boundStartAIGame);
        this.overlay.className = 'overlay';
    }

    startAIGame() {
        this.dispatchEvent(new Event('start AI game'));
    }

    startMultiplayerGame() {
        this.dispatchEvent(new Event('start multiplayer game'));
    }

    showWaitingRoomOverlay() {
        this.waitingRoomOverlay.className = 'waitingRoom overlay';
    }

    waitingRoomTeardown() {
        this.waitingRoomOverlay.className = 'overlay';
    }

    tick() {
    
    }

}

class GameActiveState extends EventTarget {
    constructor(client, gameLoop, canvas, ctx) {
        super();
        this.client = client;
        this.gameLoop = gameLoop;
        this.canvas = canvas;
        this.ctx = ctx;
        this.entities = [];
        this.eventHandler = null;
        this.keyHandler = (event) => {
            if (event.key == 'ArrowUp') {
                this.client.ws.send('playerTurnUp');
                this.mainPlayer.processCommand('turnUp');
            } 
            else if (event.key == 'ArrowDown') {
                this.client.ws.send('playerTurnDown');
                this.mainPlayer.processCommand('turnDown');
            }
            else if (event.key == 'ArrowLeft') {
                this.client.ws.send('playerTurnLeft');
                this.mainPlayer.processCommand('turnLeft');
            }
            else if (event.key == 'ArrowRight') {
                this.client.ws.send('playerTurnRight');
                this.mainPlayer.processCommand('turnRight');
            }
        };
    }

    addEntity(entity) {
        this.entities.push(entity);
    }

    setUp() {
        const background = new Background();
        this.addEntity(background);
        const player = new Player();
        this.mainPlayer = player;
        const opponent = new Player({'x': 580, 'y': 400}, 'left', '#bd4545');
        this.opponent = opponent;
        console.log(`main player id ${player.playerID}`);
        console.log(`main opponent id is ${opponent.playerID}`);
        this.addEntity(player);
        this.addEntity(opponent);
        player.addOpponent(opponent);
        opponent.addOpponent(player);
        this.installEventHandlers();
        this.gameLoop();
    }

    installEventHandlers() {
        document.addEventListener('keydown', this.keyHandler);
        this.mainPlayer.addEventListener('collision', () => this.loseGame());
        this.opponent.addEventListener('collision', () => this.winGame());
    }

    tearDown() {
        document.removeEventListener('keydown', this.keyHandler);
        this.entities = [];
        this.mainPlayer = null;
        this.opponent = null;
    }

    tick() {
        this.ctx.clearRect(0, 0, ARENASIZES.width, ARENASIZES.height);
        this.entities.forEach((entity) => entity.update());
        this.entities.forEach((entity) => entity.draw(this.ctx));
        window.requestAnimationFrame(() => this.gameLoop());
    }

    loseGame() {
        this.dispatchEvent(new Event('lose game'));
    }

    winGame() {
        this.dispatchEvent(new Event('win game'));
    }
}

class GameOverState extends EventTarget {
    constructor(gameLoop, canvas, ctx) {
        super();
        this.gameLoop = gameLoop;
        this.canvas = canvas;
        this.ctx = ctx;
        this.overlay = document.getElementById('end-game-overlay');
        this.endScreenMessage = document.getElementById('win-or-lose');
        this.menuButton = document.getElementById('back-to-menu-button');
        this.boundReturnToMenu = this.returnToMenu.bind(this);
        this.winner = null;
    }

    setUp() {
        this.ctx.clearRect(0, 0, ARENASIZES.width, ARENASIZES.height);
        this.installEventHandlers();
        this.overlay.style.width = `${ARENASIZES.width}px`;
        this.overlay.style.height = `${ARENASIZES.height}px`;
        switch (this.winner) {
            case('player'):
                this.overlay.className = 'gameWon overlay';
                this.menuButton.className = 'winScreenButton';
                this.endScreenMessage.innerText = "You won!";
                break;
            case('opponent'):
                this.overlay.className = 'gameLost overlay';
                this.menuButton.className = 'loseScreenButton';
                this.endScreenMessage.innerText = "You lose!";
                break;
            default:
                this.endScreenMessage.innerText = "Game over";
                break;
        }
        this.gameLoop();
    }

    installEventHandlers() {
        this.menuButton.addEventListener('click', this.boundReturnToMenu);
    }

    tick() {
        
    }

    determineWinner(player) {
        this.winner = player;
    }

    returnToMenu() {
        this.dispatchEvent(new Event('show start menu'));
    }

    tearDown() {
        this.overlay.className = 'overlay';
        this.menuButton.removeEventListener('click', this.boundReturnToMenu);
    }
}

class Background {
    draw(ctx) {
        ctx.beginPath();
        ctx.rect(0,0,ARENASIZES.width,ARENASIZES.height);
        ctx.fillStyle = '#20073a';
        ctx.fill();
        ctx.closePath();
    }

    update() {}
}

class Player extends EventTarget {
    constructor(playerLocation, initialPlayerDirection='right', color='#f5da45') {
        super();
        this.playerID = playerID;
        playerID += 1;
        if (playerLocation == null) {
            this.playerLocation = {
                x: 20,
                y: 200
            };
        }
        else {
            this.playerLocation = playerLocation;
        }
        this.initialPlayerPos = {...this.playerLocation};
        this.initialPlayerDirection = initialPlayerDirection;
        this.playerDirection = this.initialPlayerDirection;
        this.playerSpeed = 300;
        this.color = color;
        this.opponent = null;
        this.turnHistory = [];
        this.lastUpdated = null;
    }

    addOpponent(opponent) {
        this.opponent = opponent;
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
        ctx.fillStyle = this.color;
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
        ctx.strokeStyle = this.color;
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

    finishLine(endpoint, startTurn) {
        let newLine = null;
        switch(startTurn.direction) {
            case 'up':
            case 'down':
                let topY = null
                let bottomY = null
                if (startTurn.location.y > endpoint.y) {
                    topY = endpoint.y;
                    bottomY = startTurn.location.y;
                }
                else {
                    topY = startTurn.location.y;
                    bottomY = endpoint.y;
                };
                newLine = {
                    'x': startTurn.location.x,
                    'topY': topY,
                    'bottomY': bottomY
                };
                break;
            case 'left':
            case 'right':
                let leftX = null
                let rightX = null
                if (startTurn.location.x > endpoint.x) {
                    leftX = endpoint.x;
                    rightX = startTurn.location.x;
                }
                else {
                    leftX = startTurn.location.x;
                    rightX = endpoint.x;
                };
                newLine = {
                    'y': startTurn.location.y,
                    'leftX': leftX,
                    'rightX': rightX
                };
                break;
            default:
                throw new Error('Ruh roh');
        }
        return newLine;
    }

    trackLines() {
        const orientationHistories = [...this.turnHistory]

        let startPoint = this.initialPlayerPos;
        let lineOrientation = this.initialPlayerDirection;

        const currentLocation = {...this.playerLocation};

        orientationHistories.unshift({'direction': lineOrientation, 
            'location': startPoint});
        
        const finishLineParameters = [];

        let newParameter = null;

        let i = 0;

        while (i < orientationHistories.length) {
            if (orientationHistories[i+1] == null) {
                newParameter = {'startTurn': orientationHistories[i],
                    'endPoint': currentLocation}
            }
            else {
                newParameter = {'startTurn': orientationHistories[i],
                'endPoint': orientationHistories[i+1].location}
            }
            finishLineParameters.push(newParameter);
            i += 1;
        };

        const lines = finishLineParameters.map((parameter) => {
            return this.finishLine(parameter.endPoint, parameter.startTurn)
        });

        return lines;
    }

    grabLineOrientation(line) {
        if (line.x) {
            return 'vertical'
        }
        else {
            return 'horizontal'
        };
    }

    categorizeLines(orientation1, orientation2) {
        const orientationSet = new Set();
        orientationSet.add(orientation1);
        orientationSet.add(orientation2);

        if (orientationSet.size > 1) {
            return 'vertical and horizontal';
        }
        else {
            return orientation1;
        };
    }

    checkVerticalHorizontalIntersection(verticalLine, horizontalLine) {
        if (verticalLine.x > horizontalLine.leftX && verticalLine.x < horizontalLine.rightX) {
            if (horizontalLine.y > verticalLine.topY && horizontalLine.y < verticalLine.bottomY) {
                return true;
            };
        };
        return false;
    }

    getLastLine() {
        const lines = this.trackLines();
        return lines.pop();
    }

    checkLineIntersections(lineHistory) {
        const lines = lineHistory;
        const lastLine = this.getLastLine();
        const lastLineOrientation = this.grabLineOrientation(lastLine);
        let collision = false;
        
        lines.forEach((line) => {
            const currentLineOrientation = this.grabLineOrientation(line);
            const pairing = this.categorizeLines(currentLineOrientation, lastLineOrientation);
            switch(pairing) {
                case 'vertical':
                    if (line.x === lastLine.x) {
                        collision = true;
                    };
                    break;
                case 'horizontal':
                    if (line.y === lastLine.y) {
                        collision = true;
                    }
                    break;
                case 'vertical and horizontal':
                    let intersection = null;
                    if (currentLineOrientation === 'vertical') {
                        intersection = this.checkVerticalHorizontalIntersection(line, lastLine);
                        if (intersection) {
                            collision = true;
                        };
                    }
                    else {
                        intersection = this.checkVerticalHorizontalIntersection(lastLine, line);
                        if (intersection) {
                            collision = true;
                        };
                    };
                    break;
                default:
                    throw new Error('Invalid pairing');
            }
        })
        return collision;
    }

    checkCollisions() {
        // check for collision with walls
        const currentLocation = {...this.playerLocation};
        if (currentLocation.x <= 0 || currentLocation.x >= ARENASIZES.width
            || currentLocation.y <= 0 || currentLocation.y >= ARENASIZES.height) {
                this.dispatchEvent(new Event('collision'));
                console.log('collided with wall');
                console.log(`player id ${this.playerID}`);
        };

        // check for collisions with our own tail
        const playerLines = (this.trackLines().slice(0, -1));
        if (this.checkLineIntersections(playerLines)) {
            this.dispatchEvent(new Event('collision'));
            console.log('collided with own tail');
            console.log(`player id ${this.playerID}`);
        };

        // check for collisions with opponent
        if (this.opponent != null) {
            const opponentLines = this.opponent.trackLines();
            if (this.checkLineIntersections(opponentLines)) {
                this.dispatchEvent(new Event('collision'));
                console.log('collided with opponent');
                console.log(`player id ${this.playerID}`);
            };
        }
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

window.addEventListener('DOMContentLoaded', () => {
    const new_client = new Client();
    window.localGame = new Local(new_client);
})