console.log('Hello world');

document.addEventListener('keydown', function(event) {
    console.log(event);
    if (event.key == 'ArrowUp') {
        console.log('Up arrow pressed');
    } 
})