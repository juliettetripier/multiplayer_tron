console.log('Hello world');

class Client {
    constructor() {
        const ui = document.querySelector('#ui');

        ws.addEventListener('message', (event) => {
            ui.innerText = event.data;
        })

        document.addEventListener('keydown', function(event) {
            if (event.key == 'ArrowUp') {
                console.log('Up arrow pressed');
                ws.send('message');
            } 
        })
    }


}

class Local {
    constructor() {
        this.entities = [];
        this.initializeGame();
    }

    initializeGame() {
        this.canvas = document.querySelector('#main-canvas');
        this.ctx = this.canvas.getContext('2d');
        const background = new Background();
        this.addEntity(background);
        const player = new Player();
        this.addEntity(player);
        this.tick();
    }

    addEntity(entity) {
        this.entities.push(entity);
    }

    tick() {
        this.ctx.clearRect(0, 0, 400, 400);
        this.entities.forEach((entity) => entity.update())
        this.entities.forEach((entity) => entity.draw(this.ctx));
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
            y: 20
        };
        this.turnHistory = [];
        this.lastUpdated = null;
    }

    update() {
        console.log(this.lastUpdated);
        this.lastUpdated = Date.now();
        console.log(this.lastUpdated);
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.playerLocation.x, this.playerLocation.y, 10, 0, Math.PI * 2);
        ctx.fillStyle = 'yellow';
        ctx.fill();
        ctx.closePath();
    }
}

const ws = new WebSocket('wss://poised-brook-chartreuse.glitch.me/wss');

window.addEventListener('DOMContentLoaded', () => {
    const new_client = new Client();
    const new_local = new Local();
})