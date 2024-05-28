
//create a synth and connect it to the main output (your speakers)
const synth = new Tone.PolySynth(Tone.Synth);
const filter = new Tone.Filter(10000, "lowpass");
synth.connect(filter);
const comp = new Tone.Compressor(-48, 3).toDestination();
synth.connect(comp);


const canvas = document.getElementById('canvas1');
const ctx = canvas.getContext('2d');

canvas.width = window.innerHeight;
canvas.height = window.innerHeight;

window.addEventListener('resize', function() {
    canvas.width = window.innerHeight;
    canvas.height = window.innerHeight;
});

const xLoc = 0;
const yLoc = 0;
const gridSize = 12;
const cellSize = 38;
let grid = [];
let audioToPlay = [];


class Cell {
    constructor(x, y, alive, note) {
        this.x = x;
        this.y = y;
        this.alive = alive;
        this.note = note;
        this.playing = false;
    }

    draw() {
        if (this.alive) {
            let lightness;
            this.playing ? lightness = 50 : lightness = 100;
            ctx.fillStyle = 'hsl(200, 60%, ' + lightness + '%)';
            ctx.fillRect(this.x, this.y, cellSize, cellSize);
            // synth.triggerAttackRelease("Bb3", "8n");
        }
        else {
            ctx.fillStyle = 'hsl(0, 0%, 0%)';
            ctx.fillRect(this.x, this.y, cellSize, cellSize);
        }
    }

}

const wholeScale = [2, 2, 1, 2, 2, 2, 1];
const diatonicThirds = [4, 3, 4, 3, 3, 4, 3];
// C-Major Scale
// To-do: Allow changing of root in UI
// To-do: Allow for different types of scales
const scaleRoot = 49;

function fillGrid() {
    let base = 0;
    let interval = 0;
    for (let y_i = 0; y_i < gridSize; y_i++) {
        interval = 0;
        for (let x_i = 0; x_i < gridSize; x_i++) {
            let freq = scaleRoot * Math.pow(2, (base + interval) / 12);
            let alive = (Math.random() <= 0.2);
            grid.push(new Cell(x_i * cellSize, y_i * cellSize, alive, freq));
            interval += wholeScale[(x_i + (y_i * 2)) % 7];
            console.log(freq);
        }
        base += diatonicThirds[y_i % 7];
    }
}
fillGrid();

function handleCells() {
    synth.triggerRelease(audioToPlay, Tone.now());
    updateMethod();
    for (let i = 0; i < grid.length; i++) {
        grid[i].draw();
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
    for (let y_i = 0; y_i < gridSize; y_i++) {
        for (let x_i = gridSize - 1; x_i >= 0; x_i--) {
            if (grid[(y_i * gridSize) + x_i].alive) {
                audioToPlay.push(grid[(y_i * gridSize) + x_i].note);
                grid[(y_i * gridSize) + x_i].playing = true;
                x_i = -1;
            }
        }
    }
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
	