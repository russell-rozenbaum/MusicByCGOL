
//create a synth and connect it to the main output (your speakers)
const synth = new Tone.PolySynth();
synth.set({ detune: -1200 });
const filter = new Tone.Filter(24200, "lowpass");
const reverb = new Tone.Reverb(.1);
const comp = new Tone.Compressor(-30, 3).toDestination();
synth.chain(filter, reverb, comp);


const canvas = document.getElementById('canvas1');
const ctx = canvas.getContext('2d');

canvas.width = 576;
canvas.height = 576;

/*
window.addEventListener('resize', function() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});
*/

let paused = true;
let bpm = 88;
const xLoc = 0;
const yLoc = 0;
const gridSize = 16;
const cellSize = 36;
let grid = [];
let audioToPlay = [];

const scaleInput = document.getElementById('scaleInput');
const scaleValue = document.getElementById('scaleValue');
let scaleIdx = Number(scaleInput.value);
let scaleRoot = 32.703 * Math.pow(2, (scaleIdx / 12));
scaleInput.addEventListener('input', function() {
    scaleIdx = Number(scaleInput.value);
    scaleRoot = 32.703 * Math.pow(2, (scaleIdx / 12));
    fixGrid();
});

const tempoInput = document.getElementById('tempoInput');
const tempoValue = document.getElementById('tempoValue');
bpm = Number(tempoInput.value);
tempoValue.textContent = tempoInput.value;
// This line solves issues of notes being dropped when maxPolyph is exceeded
synth.maxPolyphony = 2 * gridSize * ((bpm - (bpm % 20)) / 20);
tempoInput.addEventListener('input', function() {
    bpm = Number(tempoInput.value);
    tempoValue.textContent = tempoInput.value;
    synth.maxPolyphony = 2 * gridSize * ((bpm - (bpm % 20)) / 20);
    console.log(synth.maxPolyphony);
});
console.log(synth.maxPolyphony);


class Cell {
    constructor(x, y, alive, note) {
        this.x = x;
        this.y = y;
        this.alive = alive;
        this.note = note;
        this.noteName = getNoteName(note);
        this.playing = false;
    }

    draw(isHovered) {
        if (this.alive) {
            let lightness;
            this.playing ? lightness = 50 : lightness = 100;
            ctx.fillStyle = 'hsl(200, 60%, ' + lightness + '%)';
            ctx.fillRect(this.x, this.y, cellSize, cellSize);
            ctx.font = '14px Arial';
            ctx.fillStyle = 'white';
            ctx.fillText(this.noteName, this.x + cellSize / 3.5, this.y + cellSize / 1.7);
            // synth.triggerAttackRelease("Bb3", "8n");
        }
        else {
            if (isHovered) {
                ctx.fillStyle = 'hsla(50, 50%, 50%, 50%';
                ctx.fillRect(this.x, this.y, cellSize, cellSize);
                ctx.font = '14px Arial';
                ctx.fillStyle = 'white';
                ctx.fillText(this.noteName, this.x + cellSize / 3.5, this.y + cellSize / 1.7);
            }
            else {
                ctx.fillStyle = 'hsl(0, 0%, 0%)';
                ctx.fillRect(this.x, this.y, cellSize, cellSize);
            }
        }

        ctx.strokeStyle = 'rgba(120, 120, 120, 0.5)';
        ctx.strokeRect(this.x, this.y, cellSize, cellSize);
    }
}



function getNoteName(freq) {
    const scale = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
    let basePlusInterval = (Math.log2(freq / scaleRoot) * 12) + scaleIdx;
    let noteName = scale[Math.round(basePlusInterval) % 12];
    let noteOct = Math.floor(Math.round(basePlusInterval) / 12) + 1;
    return noteName + noteOct.toString();
}
const wholeScale = [2, 2, 1, 2, 2, 2, 1];
const diatonicThirds = [4, 3, 4, 3, 3, 4, 3];
/*
const altScale = [2, 2, 1, 2, 2, 3];
const altInts = [4, 3, 5, 4, 3, 5];
*/
function fillGrid() {
    let base = 0;
    let interval = 0;
    for (let y_i = 0; y_i < gridSize; y_i++) {
        interval = 0;
        for (let x_i = 0; x_i < gridSize; x_i++) {
            let freq = scaleRoot * Math.pow(2, (base + interval) / 12);
            let alive = false;
            grid.push(new Cell(x_i * cellSize, y_i * cellSize, alive, freq));
            interval += wholeScale[(x_i + (y_i * 2)) % 7];
        }
        base += diatonicThirds[y_i % 7];
    }
}
fillGrid();
handleCells();
function fixGrid() {
    let base = 0;
    let interval = 0;
    for (let y_i = 0; y_i < gridSize; y_i++) {
        interval = 0;
        for (let x_i = 0; x_i < gridSize; x_i++) {
            let freq = scaleRoot * Math.pow(2, (base + interval) / 12);
            grid[(y_i * gridSize) + x_i].note = freq;
            grid[(y_i * gridSize) + x_i].noteName = getNoteName(freq);
            interval += wholeScale[(x_i + (y_i * 2)) % 7];
        }
        base += diatonicThirds[y_i % 7];
    }
}



function handleCells() {
    synth.triggerRelease(audioToPlay, Tone.now());
    updateMethod();
    for (let i = 0; i < grid.length; i++) {
        grid[i].draw(false);
    }
}

function findRightMost() {
    for (let y_i = 0; y_i < gridSize; y_i++) {
        for (let x_i = gridSize - 1; x_i >= 0; x_i--) {
            if (grid[(y_i * gridSize) + x_i].alive) {
                audioToPlay.push(grid[(y_i * gridSize) + x_i].note);
                grid[(y_i * gridSize) + x_i].playing = true;
                x_i = -1;
            }
        }
    }
}

function updateMethod() {
    audioToPlay = [];
    let newGrid = [];
    for (let i = 0; i < grid.length; i++) {
        let numNeighborsAlive = 0;
        let alive = grid[i].alive;
        // Gather information on neighboring cells
        function leftIdx(idx) {
            return (i % gridSize) - 1 >= 0 ? idx - 1 : idx - 1 + gridSize;
        } 
        function rightIdx(idx) {
            return (i % gridSize) + 1 <= gridSize - 1 ? idx + 1 : idx + 1 - gridSize;
        } 
        const aboveIdx = (i - gridSize + (gridSize * gridSize)) % (gridSize * gridSize);
        const belowIdx = (i + gridSize) % (gridSize * gridSize);
        
        if (grid[aboveIdx].alive) numNeighborsAlive++;
        if (grid[leftIdx(aboveIdx)].alive) numNeighborsAlive++;
        if (grid[rightIdx(aboveIdx)].alive) numNeighborsAlive++;
        
        if (grid[leftIdx(i)].alive) numNeighborsAlive++;
        if (grid[rightIdx(i)].alive) numNeighborsAlive++;

        if (grid[belowIdx].alive) numNeighborsAlive++;
        if (grid[leftIdx(belowIdx)].alive) numNeighborsAlive++;
        if (grid[rightIdx(belowIdx)].alive) numNeighborsAlive++;
        
        // We handle survival here
        if (alive && (numNeighborsAlive >= 2 && numNeighborsAlive <= 3)) {
            alive = true;
        }
        else if (!alive && (numNeighborsAlive >= 3 && numNeighborsAlive <= 3)) {
            alive = true;
        }
        else {
            alive = false;
        }
        newGrid.push(new Cell(grid[i].x, grid[i].y, alive, grid[i].note));
        // if (alive && !grid[i].alive) audioToPlay.push(grid[i].note);
    }
    for (let i = 0; i < grid.length; i++) {
        grid[i] = newGrid[i];
    }
    findRightMost();
    synth.triggerAttack(audioToPlay, Tone.now());
}

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // ctx.fillStyle = 'grey';
    // ctx.fillRect(xLoc - 5, yLoc - 5, gridSize * cellSize + 10, gridSize * cellSize + 10);
    ctx.fillStyle = 'black';
    ctx.fillRect(xLoc,yLoc, gridSize * cellSize, gridSize * cellSize);
    handleCells();
    setTimeout(() => {
        requestAnimationFrame(animate);}, (1 / bpm) * 60000); // Convert beat/min to ms/beat
}

window.addEventListener('keydown', async(event) => {
    if (event.key === 'Enter') { 
        paused = false;
        try {
            // Prompt the user to allow audio playback
            await Tone.start();
            console.log('Audio is ready');
            setTimeout(() => {
                animate();}, 500);
          } catch (error) {
            console.error('Failed to initialize audio:', error);
          }
    }
});
	
function handleMouseHover(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const col = Math.floor(x / cellSize);
    const row = Math.floor(y / cellSize);
    const cellIndex = row * gridSize + col;

    for (let i = 0; i < grid.length; i++) {
        const isHovered = i === cellIndex;
        grid[i].draw(isHovered);
    }
}
canvas.addEventListener('mousemove', handleMouseHover);

function handleMouseClick(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const col = Math.floor(x / cellSize);
    const row = Math.floor(y / cellSize);
    const cellIndex = row * gridSize + col;

    for (let i = 0; i < grid.length; i++) {
        if (i === cellIndex) {
            grid[i].alive = !grid[i].alive;
            grid[i].draw();
        }
        grid[i].playing = false;
    }
    findRightMost();
}
canvas.addEventListener('click', handleMouseClick);


