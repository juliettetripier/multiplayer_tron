console.log('Hello world');

document.addEventListener('keydown', function(event) {
    console.log(event);
    if (event.key == 38) {
        console.log('Up arrow pressed');
    } 
})