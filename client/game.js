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

        playerTurn.innerHTML = `Current Player: <div class="piece ${this.currentPlayer}" style="display: inline-block; width: 15px; height: 15px; margin-bottom: -2px;"></div>`;
        gamePhase.textContent = this.waitingForRemoval ? 
            'Remove opponent\'s piece' : 
            `Phase: ${this.phase.charAt(0).toUpperCase() + this.phase.slice(1)}`;

        const whitePiecesOnBoard = this.placedPieces.filter(p => p.player === 'white').length;
        const blackPiecesOnBoard = this.placedPieces.filter(p => p.player === 'black').length;

        whiteCount.innerHTML = `White<br><br>Remaining: ${this.pieces.white}<br>On Board: ${whitePiecesOnBoard}`;
        blackCount.innerHTML = `Black<br><br>Remaining: ${this.pieces.black}<br>On Board: ${blackPiecesOnBoard}`;
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
                try {
                    this.removePiece(pointId);
                } catch (error) {
                    this.log('Error removing piece:', error);
                }
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
                this.log('Piece selected for movement', {
                    player: this.currentPlayer,
                    pointId: pointId
                });
            }
        } else {
            // Handle piece movement or deselection
            if (pointId === this.selectedPiece.pointId) {
                this.clearSelection();
                this.log('Piece deselected');
                return;
            }
    
            const playerPieces = this.placedPieces.filter(p => p.player === this.currentPlayer).length;
            const canFlyNow = playerPieces === 3;
    
            if (this.isValidMove(pointId) && (canFlyNow || this.isValidMovement(this.selectedPiece.pointId, pointId))) {
                this.movePiece(this.selectedPiece.pointId, pointId);
                this.clearSelection();
                
                // Check win condition
                if (this.checkWinCondition()) {
                    this.handleGameWin();
                    return;
                }
                
                this.updateStatus();
            } else {
                // Invalid move, deselect the piece
                this.clearSelection();
                this.log('Invalid move, piece deselected');
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
            8: [9, 11],       9: [1, 8, 10, 17], 10: [9, 12],
            11: [3, 8, 13],   12: [4, 10, 15, 20],
            13: [11, 14],     14: [6, 13, 15, 22], 15: [12, 14],

            // Inner square (16-23)
            16: [17, 19],     17: [9, 16, 18],   18: [17, 20],
            19: [11, 16, 21], 20: [12, 18, 23],
            21: [19, 22],     22: [14, 21, 23],  23: [20, 22]
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
            this.updateStatus(); // Add this line
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
            if (index >= 16) {
                point.classList.add('inner-point');
            }
            point.style.left = pos.x + '%';
            point.style.top = pos.y + '%';
            point.dataset.pointId = index;
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

        // Add win condition check here
        const opponent = this.currentPlayer === 'white' ? 'black' : 'white';
        const opponentTotalPieces = this.pieces[opponent] + 
            this.placedPieces.filter(p => p.player === opponent).length;
        
        if (opponentTotalPieces < 3) {
            this.handleGameWin();
            return false;
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

        // Check if the piece is in a mill
        const isInMill = this.mills.some(mill => {
            if (mill.includes(pointId)) {
                return mill.every(id => {
                    const piece = this.placedPieces.find(p => p.pointId === id);
                    return piece && piece.player === opponent;
                });
            }
            return false;
        });

        // If piece is not in a mill, it can be removed
        if (!isInMill) {
            return true;
        }

        // If piece is in a mill, check if all opponent's pieces are in mills
        const opponentPieces = this.placedPieces.filter(p => p.player === opponent);
        const allInMills = opponentPieces.every(piece => {
            return this.mills.some(mill => {
                if (mill.includes(piece.pointId)) {
                    return mill.every(id => {
                        const p = this.placedPieces.find(p => p.pointId === id);
                        return p && p.player === opponent;
                    });
                }
                return false;
            });
        });

        // If all pieces are in mills, then pieces in mills can be removed
        return allInMills;
    }

more     // Add after canRemovePiece method and before the class end
    // Update handlePointClick to include error handling
    handlePointClick(point) {
        const pointId = parseInt(point.dataset.pointId);
        this.log(`Point clicked: ${pointId}`);

        if (this.waitingForRemoval) {
            const pieceToRemove = this.placedPieces.find(p => 
                p.pointId === pointId && 
                p.player !== this.currentPlayer
            );
            
            if (pieceToRemove && this.canRemovePiece(pointId)) {
                try {
                    this.removePiece(pointId);
                } catch (error) {
                    this.log('Error removing piece:', error);
                }
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

    // Add these new methods after clearSelection() method
    
    highlightValidMoves(pointId) {
        const points = document.querySelectorAll('.point');
        const playerPieces = this.placedPieces.filter(p => p.player === this.currentPlayer).length;
        const canFlyNow = playerPieces === 3;
    
        points.forEach(point => {
            const targetId = parseInt(point.dataset.pointId);
            if (this.isValidMove(targetId)) {
                if (canFlyNow || this.isValidMovement(pointId, targetId)) {
                    point.classList.add('valid-move');
                }
            }
        });
        this.log(`Highlighted valid moves for piece ${pointId}`, {
            canFly: canFlyNow,
            currentPlayer: this.currentPlayer,
            piecesCount: playerPieces
        });
    }
    
    // Update handleMovementPhase method
    handleMovementPhase(pointId) {
        if (!this.selectedPiece) {
            // Select piece to move
            const piece = this.placedPieces.find(p => p.pointId === pointId && p.player === this.currentPlayer);
            if (piece) {
                this.selectedPiece = piece;
                document.querySelector(`.piece[data-point-id="${pointId}"]`).classList.add('selected');
                this.highlightValidMoves(pointId);
                this.log('Piece selected for movement', {
                    player: this.currentPlayer,
                    pointId: pointId
                });
            }
        } else {
            // Handle piece movement or deselection
            if (pointId === this.selectedPiece.pointId) {
                this.clearSelection();
                this.log('Piece deselected');
                return;
            }
    
            const playerPieces = this.placedPieces.filter(p => p.player === this.currentPlayer).length;
            const canFlyNow = playerPieces === 3;
    
            if (this.isValidMove(pointId) && (canFlyNow || this.isValidMovement(this.selectedPiece.pointId, pointId))) {
                this.movePiece(this.selectedPiece.pointId, pointId);
                this.clearSelection();
                
                // Check win condition
                if (this.checkWinCondition()) {
                    this.handleGameWin();
                    return;
                }
                
                this.updateStatus();
            } else {
                // Invalid move, deselect the piece
                this.clearSelection();
                this.log('Invalid move, piece deselected');
            }
        }
    }
    
    checkWinCondition() {
        const opponent = this.currentPlayer === 'white' ? 'black' : 'white';
        const opponentPieces = this.placedPieces.filter(p => p.player === opponent).length;
        
        // Win if opponent has less than 3 pieces
        if (opponentPieces < 3) {
            return true;
        }
        
        // Check if opponent has any valid moves
        return !this.placedPieces.some(piece => {
            if (piece.player !== opponent) return false;
            
            // For each opponent piece
            return [...Array(24).keys()].some(targetId => {
                if (!this.isValidMove(targetId)) return false;
                
                // Check if they can move normally or fly
                const canFly = opponentPieces === 3;
                return canFly || this.isValidMovement(piece.pointId, targetId);
            });
        });
    }
    
    handleGameWin() {
        const winner = this.currentPlayer;
        this.phase = 'game-over';
        this.log('Game Over', {
            winner: winner,
            finalState: {
                whitePieces: this.placedPieces.filter(p => p.player === 'white').length,
                blackPieces: this.placedPieces.filter(p => p.player === 'black').length
            }
        });
        alert(`Game Over! ${winner.charAt(0).toUpperCase() + winner.slice(1)} wins!`);
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

        // Add win condition check here
        const opponent = this.currentPlayer === 'white' ? 'black' : 'white';
        const opponentTotalPieces = this.pieces[opponent] + 
            this.placedPieces.filter(p => p.player === opponent).length;
        
        if (opponentTotalPieces < 3) {
            this.handleGameWin();
            return false;
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

        // Check if the piece is in a mill
        const isInMill = this.mills.some(mill => {
            if (mill.includes(pointId)) {
                return mill.every(id => {
                    const piece = this.placedPieces.find(p => p.pointId === id);
                    return piece && piece.player === opponent;
                });
            }
            return false;
        });

        // If piece is not in a mill, it can be removed
        if (!isInMill) {
            return true;
        }

        // If piece is in a mill, check if all opponent's pieces are in mills
        const opponentPieces = this.placedPieces.filter(p => p.player === opponent);
        const allInMills = opponentPieces.every(piece => {
            return this.mills.some(mill => {
                if (mill.includes(piece.pointId)) {
                    return mill.every(id => {
                        const p = this.placedPieces.find(p => p.pointId === id);
                        return p && p.player === opponent;
                    });
                }
                return false;
            });
        });

        // If all pieces are in mills, then pieces in mills can be removed
        return allInMills;
    }

more     // Add after canRemovePiece method and before the class end
    // Update removePiece with better error handling and logging
    removePiece(pointId) {
        try {
            // Remove the piece from the DOM
            const pieceElement = document.querySelector(`.piece[data-point-id="${pointId}"]`);
            if (!pieceElement) {
                throw new Error(`Piece element not found for pointId: ${pointId}`);
            }
            pieceElement.remove();

            // Remove the piece from our tracking array
            const initialLength = this.placedPieces.length;
            this.placedPieces = this.placedPieces.filter(p => p.pointId !== pointId);
            
            if (this.placedPieces.length === initialLength) {
                throw new Error(`Piece not found in tracking array for pointId: ${pointId}`);
            }

            // Clear any highlighting
            document.querySelectorAll('.piece.in-mill').forEach(p => p.classList.remove('in-mill'));
            document.querySelectorAll('.piece.removable').forEach(p => p.classList.remove('removable'));

            // Reset removal state and switch players
            this.waitingForRemoval = false;
            this.switchPlayer();
            this.updateStatus();

            this.log(`Piece removed successfully`, {
                pointId,
                remainingPieces: this.placedPieces.length
            });
        } catch (error) {
            this.log('Error in removePiece:', error);
            throw error; // Re-throw to maintain error handling chain
        }
    }

} // End of class GameBoard

// Initialize the game when the page loads
window.addEventListener('load', () => {
    const game = new GameBoard();
});