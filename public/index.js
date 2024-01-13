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

const ws = new WebSocket('wss://poised-brook-chartreuse.glitch.me/wss');

window.addEventListener('DOMContentLoaded', () => {
    const new_client = new Client()
})