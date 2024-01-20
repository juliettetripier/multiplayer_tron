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
        this.initializeGame();
    }

    initializeGame() {
        const canvas = document.querySelector('#main-canvas');
        const ctx = canvas.getContext('2d');

        ctx.beginPath();
        ctx.rect(0,0,400,400);
        ctx.fillStyle = 'indigo';
        ctx.fill();
        ctx.closePath();
    }
}

const ws = new WebSocket('wss://poised-brook-chartreuse.glitch.me/wss');

window.addEventListener('DOMContentLoaded', () => {
    const new_client = new Client();
    const new_local = new Local();
})