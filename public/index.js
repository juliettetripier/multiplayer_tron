console.log('Hello world');

const ws = new WebSocket('ws://poised-brook-chartreuse.glitch.me:3000/')

document.addEventListener('keydown', function(event) {
    if (event.key == 'ArrowUp') {
        console.log('Up arrow pressed');
    } 
})