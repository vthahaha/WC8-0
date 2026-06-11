const fs = require('fs');
const pdf = require('pdf-parse');

let dataBuffer = fs.readFileSync('../SquadLists-English.pdf');

pdf(dataBuffer).then(function(data) {
    const lines = data.text.split('\n');
    for(let i=0; i<50; i++) {
        console.log(lines[i]);
    }
});
