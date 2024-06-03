
//create a synth and connect it to the main output (your speakers)
const synth = new Tone.PolySynth();
synth.set({ detune: -1200 });
const filter = new Tone.Filter(24200, "lowpass");
const reverb = new Tone.Reverb(.1);
const comp = new Tone.Compressor(-30, 3).toDestination();
synth.chain(filter, reverb, comp);


const canvas = document.getElementById('canvas1');
const ctx = canvas.getContext('2d');

canvas.width = 504;
canvas.height = 504;

/*
window.addEventListener('resize', function() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});
*/

let paused = true;
const xLoc = 0;
const yLoc = 0;
const gridSize = 12;
const cellSize = 42;
let grid = [];
let audioToPlay = [];

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
            ctx.font = '12px Arial';
            ctx.fillStyle = 'white';
            ctx.fillText(this.noteName, this.x + cellSize / 4, this.y + cellSize / 2);
            // synth.triggerAttackRelease("Bb3", "8n");
        }
        else {
            if (isHovered) {
                ctx.fillStyle = 'hsla(50, 50%, 50%, 50%';
                ctx.fillRect(this.x, this.y, cellSize, cellSize);
                ctx.font = '12px Arial';
                ctx.fillStyle = 'white';
                ctx.fillText(this.noteName, this.x + cellSize / 4, this.y + cellSize / 2);
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

const wholeScale = [2, 2, 1, 2, 2, 2, 1];
const diatonicThirds = [4, 3, 4, 3, 3, 4, 3];
/*
const altScale = [2, 2, 1, 2, 2, 3];
const altInts = [4, 3, 5, 4, 3, 5];
*/
let scaleIdx = 0;
// We base at G1 or 48.999 Hz
const scaleRoot = 48.999 * Math.pow(2, (((scaleIdx + 5) % 12) / 12));
function getNoteName(freq) {
    const scale = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
    let basePlusInterval = Math.log2(freq / scaleRoot) * 12;
    let noteName = scale[Math.round(basePlusInterval) % 12];
    let noteOct = Math.floor(Math.round(basePlusInterval) / 12) + 1;
    return noteName + noteOct.toString();
}

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
            console.log(freq);
        }
        base += diatonicThirds[y_i % 7];
    }
}
fillGrid();
handleCells();

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
        const cellLeft = (i % gridSize) - 1 >= 0;
        const cellRight = (i % gridSize) + 1 <= gridSize - 1;
        const cellAbove = i - gridSize >= 0;
        const cellBelow = i + gridSize < (gridSize * gridSize);
        if (cellLeft) {
            if (grid[i - 1].alive) numNeighborsAlive++;
        }
        if (cellRight) {
            if (grid[i + 1].alive) numNeighborsAlive++;
        }
        if (cellAbove) {
            if (grid[i - gridSize].alive) numNeighborsAlive++;
            if (cellLeft) {
                if (grid[i - gridSize - 1].alive) numNeighborsAlive++;
            }
            if (cellRight) {
                if (grid[i - gridSize + 1].alive) numNeighborsAlive++;
            }
        }
        if (cellBelow) {
            if (grid[i + gridSize].alive)  {
                numNeighborsAlive++;
            }
            if (cellLeft) {
                if (grid[i + gridSize - 1].alive) numNeighborsAlive++;
            }
            if (cellRight) {
                if (grid[i + gridSize + 1].alive) numNeighborsAlive++;
            }
        }
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
        requestAnimationFrame(animate);}, 1000);
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
    }
    findRightMost();
}
canvas.addEventListener('click', handleMouseClick);


