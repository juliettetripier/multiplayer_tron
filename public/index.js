const GAMESTATES = {
    gameActive: 'gameActive',
    gameOver: 'gameOver'
};

const ARENASIZES = {
    width: 600,
    height: 600
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
        this.currentState = GAMESTATES.gameActive;
        this.initializeGame();
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
        });
        this.mainPlayer.addEventListener('collision', () => this.loseGame());
    }

    initializeGame() {
        this.canvas = document.querySelector('#main-canvas');
        this.canvas.setAttribute('width', ARENASIZES.width);
        this.canvas.setAttribute('height', ARENASIZES.height);
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
        this.ctx.clearRect(0, 0, ARENASIZES.width, ARENASIZES.height);
        this.entities.forEach((entity) => entity.update());
        this.entities.forEach((entity) => entity.draw(this.ctx));
        window.requestAnimationFrame(() => this.gameLoop());
    }

    loseGame() {
        this.currentState = GAMESTATES.gameOver;
        console.log(this.currentState);
    }

    endGame() {

    }

    gameLoop() {
        const gameState = {
            [GAMESTATES.gameActive]: () => this.tick(),
            [GAMESTATES.gameOver]: () => this.endGame()
        };
        (gameState[this.currentState])();
    }
}

class Background {
    draw(ctx) {
        ctx.beginPath();
        ctx.rect(0,0,ARENASIZES.width,ARENASIZES.height);
        ctx.fillStyle = 'indigo';
        ctx.fill();
        ctx.closePath();
    }

    update() {}
}

class Player extends EventTarget {
    constructor() {
        super();
        this.playerLocation = {
            x: 20,
            y: 200
        };
        this.initialPlayerPos = {...this.playerLocation};
        this.initialPlayerDirection = 'right';
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
        this.checkLineIntersections();
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

    checkLineIntersections() {
        const lines = this.trackLines();
        const lastLine = lines.pop();
        const lastLineOrientation = this.grabLineOrientation(lastLine);
        let collision = false;
        
        lines.forEach((line) => {
            const currentLineOrientation = this.grabLineOrientation(line);
            const pairing = this.categorizeLines(currentLineOrientation, lastLineOrientation);
            let intersection = null;
            switch(pairing) {
                case 'vertical':
                    break;
                case 'horizontal':
                    break;
                case 'vertical and horizontal':
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

        // for horizontal + vertical case:
            // is the vertical line horizontally within the left and right points?
            // if vertical line's x value is between the horizontal line's 
            // start and end points x value,
            // and the horizontal line's y value is between the vertical's
            // start and end y values,
            // we know there's a collision
    }

    checkCollisions() {
        const currentLocation = {...this.playerLocation};
        if (currentLocation.x <= 0 || currentLocation.x >= ARENASIZES.width
            || currentLocation.y <= 0 || currentLocation.y >= ARENASIZES.height) {
                this.dispatchEvent(new Event('collision'));
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
    window.localGame = new Local();
})