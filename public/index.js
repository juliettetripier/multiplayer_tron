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
        this.trackLines();
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
        // takes in end point
        // look at last orientation
        // if orientation was vertical, push an object into 
        // vertical lines with x (startpoint.x), top y(whichever is 
        // smaller, startpoint.y or endpoint.y), bottom y
        // if horizontal, y, left x, right x
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
                    'top y': topY,
                    'bottom y': bottomY
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
                    'left x': leftX,
                    'right x': rightX
                };
                console.log(`leftX = ${leftX}`);
                console.log(`rightX = ${rightX}`);
                break;
            default:
                throw new Error('Ruh roh');
        }
        console.log(`newLine = ${newLine}`);

        return newLine;
    }

    trackLines() {
        const linesByOrientation = {'horizontal': [],
            'vertical': []};

        let startPoint = this.initialPlayerPos;
        let lineOrientation = 'horizontal';

        const currentPosition = {...this.playerLocation};

        if (this.turnHistory.length === 0) {
            return linesByOrientation;
        }

        // for each turn in turn history
        // finish the line you were currently on
        // using turn info, create a new start point for a new line



        const startNewLine = (turn) => {
            startPoint = turn.location;
            if (turn.direction === 'right' || turn.direction === 'left') {
                lineOrientation = 'horizontal';
            }
            else {
                lineOrientation = 'vertical';
            }
        }

        // in our turnHistory for each turn:
        // ends current line
        // starts new line based on current turn
        // outside for each loop
        // end current line again based on current player position

        // this.turnHistory.forEach((turn) => {
        //     if (turn.direction === 'right' || turn.direction === 'left') {
        //         linesByOrientation[lineOrientation].push({'start': startPoint,
        //             'end': turn.location, 'y': startPoint.y});
        //         lineOrientation = 'horizontal';
        //     }
        //     else {
        //         linesByOrientation[lineOrientation].push({'start': startPoint,
        //             'end': turn.location, 'x': startPoint.x})
        //         lineOrientation = 'vertical';
        //     };
        //     startPoint = turn.location;
        //     console.log(linesByOrientation);
        // })

        const lastTurn = this.turnHistory[this.turnHistory.length - 1];

        if (lastTurn.direction === 'right' || lastTurn.direction === 'left') {
            linesByOrientation['horizontal'].push({'start': startPoint,
                'end': currentPosition})
        }
        else {
            linesByOrientation['vertical'].push({'start': startPoint, 
                'end': currentPosition})
        }
        
        return linesByOrientation;
    }

    checkLineIntersections() {
        const linesDict = this.trackLines();

        // going over each horizontal line and checking for
        // intersection with vertical lines
        // first, pull only the vertical lines with an x value that 
        // is within your h-line's x range
        // array.prototype.filter
        // then, see if the v-line has a start point past the
        // h-line's y value and an end point past it too
        // return boolean - true if intersection
        // call checkLineIntersections in checkCollisions

        linesDict['horizontal'].forEach((horizontalLine) => {
            const possibleIntersections = linesDict['vertical'].filter((line) => 
                horizontalLine)

            linesDict['vertical'].forEach((verticalLine) => {
                
            })
        })
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