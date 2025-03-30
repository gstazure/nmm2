class GameBoard {
    constructor() {
        this.currentPlayer = 'white';
        this.phase = 'placement';
        this.pieces = {
            white: 9,
            black: 9
        };
        this.placedPieces = [];
        this.waitingForRemoval = false;
        this.selectedPiece = null;
        this.mills = this.defineMillCombinations();
        this.initializeBoard();
        this.addEventListeners();
        this.updateStatus();
        this.enableLogging = true;
        this.log('Game initialized');
    }

    log(message, data = null) {
        if (!this.enableLogging) return;
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] ${message}`);
        if (data) console.log(data);
    }

    defineMillCombinations() {
        return [
            // Horizontal mills
            [0, 1, 2],     // Outer square top
            [5, 6, 7],     // Outer square bottom
            [8, 9, 10],    // Middle square top
            [13, 14, 15],  // Middle square bottom
            [16, 17, 18],  // Inner square top
            [21, 22, 23],  // Inner square bottom

            // Vertical mills
            [0, 3, 5],     // Outer square left
            [2, 4, 7],     // Outer square right
            [8, 11, 13],   // Middle square left
            [10, 12, 15],  // Middle square right
            [16, 19, 21],  // Inner square left
            [18, 20, 23],  // Inner square right

            // Cross-square mills
            [1, 9, 17],    // Top middle vertical
            [3, 11, 19],   // Left middle vertical
            [4, 12, 20],   // Right middle vertical
            [6, 14, 22]    // Bottom middle vertical
        ];
    }

    updateStatus() {
        const playerTurn = document.getElementById('player-turn');
        const gamePhase = document.getElementById('game-phase');
        const whiteCount = document.getElementById('white-count');
        const blackCount = document.getElementById('black-count');

        playerTurn.textContent = `Current Player: ${this.currentPlayer.charAt(0).toUpperCase() + this.currentPlayer.slice(1)}`;
        gamePhase.textContent = this.waitingForRemoval ? 
            'Remove opponent\'s piece' : 
            `Phase: ${this.phase.charAt(0).toUpperCase() + this.phase.slice(1)}`;

        whiteCount.textContent = this.pieces.white;
        blackCount.textContent = this.pieces.black;
    }

    // Remove the second defineMillCombinations method (around line 200)
    // Keep only the first one at the beginning of the class

    // Add this method to help debug point clicks
    handlePointClick(point) {
        const pointId = parseInt(point.dataset.pointId);
        this.log(`Point clicked: ${pointId}`);

        if (this.waitingForRemoval) {
            const pieceToRemove = this.placedPieces.find(p => 
                p.pointId === pointId && 
                p.player !== this.currentPlayer
            );
            
            if (pieceToRemove && this.canRemovePiece(pointId)) {
                this.removePiece(pointId);
            } else {
                this.log('Invalid removal target - piece is in mill or belongs to current player');
            }
            return;
        }

        if (this.phase === 'placement') {
            this.log(`Attempting placement at point ${pointId}`);
            if (this.isValidMove(pointId)) {
                const newMill = this.placePiece(pointId);
                this.log(`Piece placed at ${pointId}`, {
                    player: this.currentPlayer,
                    remainingPieces: this.pieces[this.currentPlayer],
                    formedMill: newMill ? 'yes' : 'no'
                });
                if (newMill) {
                    this.waitingForRemoval = true;
                    this.highlightRemovablePieces();
                } else {
                    this.switchPlayer();
                }
                this.updateStatus();
            }
        } else if (this.phase === 'movement') {
            this.handleMovementPhase(pointId);
        }
    }

    handleMovementPhase(pointId) {
        if (!this.selectedPiece) {
            // Select piece to move
            const piece = this.placedPieces.find(p => p.pointId === pointId && p.player === this.currentPlayer);
            if (piece) {
                this.selectedPiece = piece;
                document.querySelector(`.piece[data-point-id="${pointId}"]`).classList.add('selected');
                this.highlightValidMoves(pointId);
            }
        } else {
            // Try to move selected piece
            if (this.isValidMove(pointId) && this.isValidMovement(this.selectedPiece.pointId, pointId)) {
                this.movePiece(this.selectedPiece.pointId, pointId);
                this.clearSelection();
                this.updateStatus();
            }
        }
    }

    isValidMovement(fromId, toId) {
        const adjacentPoints = {
            // Outer square (0-7)
            0: [1, 3],        1: [0, 2, 9],      2: [1, 4],
            3: [0, 5, 11],    4: [2, 7, 12],
            5: [3, 6],        6: [5, 7, 14],     7: [4, 6],

            // Middle square (8-15)
            8: [9, 11],       9: [1, 8, 10],     10: [9, 12],
            11: [3, 8, 13],   12: [4, 10, 15],
            13: [11, 14],     14: [6, 13, 15],   15: [12, 14],

            // Inner square (16-23)
            16: [17, 19],     17: [16, 18],      18: [17, 20],
            19: [16, 21],     20: [18, 23],
            21: [19, 22],     22: [21, 23],      23: [20, 22]
        };

        return adjacentPoints[fromId].includes(toId);
    }

    movePiece(fromId, toId) {
        const piece = document.querySelector(`.piece[data-point-id="${fromId}"]`);
        const toPoint = document.querySelector(`.point[data-point-id="${toId}"]`);
        
        piece.style.left = toPoint.style.left;
        piece.style.top = toPoint.style.top;
        piece.dataset.pointId = toId;

        const pieceIndex = this.placedPieces.findIndex(p => p.pointId === fromId);
        this.placedPieces[pieceIndex].pointId = toId;

        const newMill = this.checkForMill(toId);
        if (newMill) {
            this.waitingForRemoval = true;
            this.highlightMill(newMill);
            this.highlightRemovablePieces();
        } else {
            this.switchPlayer();
        }
    }

    clearSelection() {
        this.selectedPiece = null;
        document.querySelectorAll('.piece.selected').forEach(p => p.classList.remove('selected'));
        document.querySelectorAll('.point.valid-move').forEach(p => p.classList.remove('valid-move'));
    }

    initializeBoard() {
        const pointsContainer = document.querySelector('.points');
        const boardPositions = this.getBoardPositions();

        boardPositions.forEach((pos, index) => {
            const point = document.createElement('div');
            point.className = 'point';
            // Add inner-point class for points 16-23
            if (index >= 16) {
                point.classList.add('inner-point');
            }
            point.style.left = pos.x + '%';
            point.style.top = pos.y + '%';
            point.dataset.pointId = index;
            
            const numberDisplay = document.createElement('span');
            numberDisplay.className = 'point-number';
            numberDisplay.textContent = index;
            point.appendChild(numberDisplay);
            
            pointsContainer.appendChild(point);
        });
    }

    getBoardPositions() {
        return [
            // Outer square (0-7)
            {x: 2, y: 2}, {x: 50, y: 2}, {x: 98, y: 2},      // Top (0,1,2)
            {x: 2, y: 50}, {x: 98, y: 50},                    // Middle (3,4)
            {x: 2, y: 98}, {x: 50, y: 98}, {x: 98, y: 98},   // Bottom (5,6,7)

            // Middle square (8-15)
            {x: 18, y: 18}, {x: 50, y: 18}, {x: 82, y: 18},  // Top (8,9,10)
            {x: 18, y: 50}, {x: 82, y: 50},                   // Middle (11,12)
            {x: 18, y: 82}, {x: 50, y: 82}, {x: 82, y: 82},  // Bottom (13,14,15)

            // Inner square (16-23)
            {x: 34, y: 34}, {x: 50, y: 34}, {x: 66, y: 34},  // Top (16,17,18)
            {x: 34, y: 50}, {x: 66, y: 50},                   // Middle (19,20)
            {x: 34, y: 66}, {x: 50, y: 66}, {x: 66, y: 66}   // Bottom (21,22,23)
        ];
    }

    defineMillCombinations() {
        return [
            // Horizontal mills
            [0, 1, 2],     // Outer square top
            [5, 6, 7],     // Outer square bottom
            [8, 9, 10],    // Middle square top
            [13, 14, 15],  // Middle square bottom
            [16, 17, 18],  // Inner square top
            [21, 22, 23],  // Inner square bottom

            // Vertical mills
            [0, 3, 5],     // Outer square left
            [2, 4, 7],     // Outer square right
            [8, 11, 13],   // Middle square left
            [10, 12, 15],  // Middle square right
            [16, 19, 21],  // Inner square left
            [18, 20, 23],  // Inner square right

            // Cross-square mills
            [1, 9, 17],    // Top middle vertical
            [3, 11, 19],   // Left middle vertical
            [4, 12, 20],   // Right middle vertical
            [6, 14, 22]    // Bottom middle vertical
        ];
    }

    isValidMove(pointId) {
        // Check if the point is already occupied
        const isOccupied = this.placedPieces.some(piece => piece.pointId === pointId);
        return !isOccupied && pointId >= 0 && pointId <= 23;
    }

    addEventListeners() {
        document.querySelector('.board').addEventListener('click', (e) => {
            let targetPoint = null;
            
            // Check if we clicked directly on a point
            if (e.target.classList.contains('point')) {
                targetPoint = e.target;
            }
            // Check if we clicked on a point number
            else if (e.target.classList.contains('point-number')) {
                targetPoint = e.target.parentElement;
            }
            // Check if we need to look for a closer point
            else {
                targetPoint = e.target.closest('.point');
            }
            
            if (targetPoint) {
                console.log('Click detected:', {
                    element: e.target.className,
                    pointId: targetPoint.dataset.pointId,
                    coordinates: {
                        x: e.clientX,
                        y: e.clientY
                    }
                });
                this.handlePointClick(targetPoint);
            }
        });
    }

    // Add this method before the closing brace of the class
    checkForMill(pointId) {
        const currentPiece = this.placedPieces.find(p => p.pointId === pointId);
        if (!currentPiece) return false;

        return this.mills.find(mill => {
            if (mill.includes(pointId)) {
                return mill.every(id => {
                    const piece = this.placedPieces.find(p => p.pointId === id);
                    return piece && piece.player === currentPiece.player;
                });
            }
            return false;
        });
    }

    // Modify placePiece method to ensure proper turn switching
    placePiece(pointId) {
        this.log(`Placing piece`, {
            player: this.currentPlayer,
            pointId: pointId,
            remainingPieces: this.pieces[this.currentPlayer]
        });
        const point = document.querySelector(`[data-point-id="${pointId}"]`);
        const piece = document.createElement('div');
        piece.className = `piece ${this.currentPlayer}`;
        piece.dataset.pointId = pointId;
        
        piece.style.left = point.style.left;
        piece.style.top = point.style.top;
        
        document.querySelector('.board').appendChild(piece);
        
        this.placedPieces.push({
            pointId,
            player: this.currentPlayer
        });
        
        this.pieces[this.currentPlayer]--;
        
        if (this.pieces.white === 0 && this.pieces.black === 0) {
            this.phase = 'movement';
        }

        const formedMill = this.checkForMill(pointId);
        if (formedMill) {
            this.highlightMill(formedMill);
        }
        return formedMill;  // This will be used by handlePointClick to determine turn switching
    }

    switchPlayer() {
        const oldPlayer = this.currentPlayer;
        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';
        this.log(`Player switched`, {
            from: oldPlayer,
            to: this.currentPlayer
        });
        this.updateStatus();
    }

    highlightMill(mill) {
        mill.forEach(pointId => {
            const piece = document.querySelector(`.piece[data-point-id="${pointId}"]`);
            if (piece) {
                piece.classList.add('in-mill');
            }
        });
    }

    highlightRemovablePieces() {
        const opponent = this.currentPlayer === 'white' ? 'black' : 'white';
        this.placedPieces.forEach(piece => {
            if (piece.player === opponent && this.canRemovePiece(piece.pointId)) {
                const pieceElement = document.querySelector(`.piece[data-point-id="${piece.pointId}"]`);
                if (pieceElement) {
                    pieceElement.classList.add('removable');
                }
            }
        });
    }

    canRemovePiece(pointId) {
        const opponent = this.currentPlayer === 'white' ? 'black' : 'white';
        const targetPiece = this.placedPieces.find(p => p.pointId === pointId);
        
        if (!targetPiece || targetPiece.player === this.currentPlayer) {
            return false;
        }

        const isInMill = this.mills.some(mill => {
            if (mill.includes(pointId)) {
                const piecesInMill = mill.map(id => 
                    this.placedPieces.find(p => p.pointId === id)
                );
                return piecesInMill.every(p => p && p.player === opponent);
            }
            return false;
        });

        if (!isInMill) {
            return true;
        }

        const opponentPieces = this.placedPieces.filter(p => p.player === opponent);
        return opponentPieces.every(piece => {
            return this.mills.some(mill => {
                if (mill.includes(piece.pointId)) {
                    const piecesInMill = mill.map(id => 
                        this.placedPieces.find(p => p.pointId === id)
                    );
                    return piecesInMill.every(p => p && p.player === opponent);
                }
                return false;
            });
        });
    }

} // End of class GameBoard

// Initialize the game when the page loads
window.addEventListener('load', () => {
    const game = new GameBoard();
});