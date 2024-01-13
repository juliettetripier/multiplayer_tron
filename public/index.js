console.log('Hello world');

const ws = new WebSocket('wss://poised-brook-chartreuse.glitch.me/wss');

const ui = document.querySelector('ui');

ws.addEventListener('message', (event) => {
    ui.innerText = event.data;
})

document.addEventListener('keydown', function(event) {
    if (event.key == 'ArrowUp') {
        console.log('Up arrow pressed');
        ws.send('message');
    } 
})