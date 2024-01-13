console.log('Hello world');

const ws = new WebSocket('wss://poised-brook-chartreuse.glitch.me:3000/wss')

document.addEventListener('keydown', function(event) {
    if (event.key == 'ArrowUp') {
        console.log('Up arrow pressed');
    } 
})