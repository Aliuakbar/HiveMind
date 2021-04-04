import {insects} from "./insects.js"
import {Stone} from "./stone.js"
import {teams} from "./teams.js"
import {Hex} from "./hexlib.js"
import {Move, Drop, Pass} from "./action.js"
import {Hive} from "./hive.js"

const startingInsects = [
    insects.BEE,
    insects.SPIDER,
    insects.SPIDER,
    insects.ANT,
    insects.ANT,
    insects.ANT,
    insects.GRASSHOPPER,
    insects.GRASSHOPPER,
    insects.GRASSHOPPER,
    insects.BEETLE,
    insects.BEETLE
]

export class State {
    constructor(hive, turnNumber = 0) {
        this.hive = new Hive();
        this.turnNumber = turnNumber
        this.stones = [];
        this._beeMove = [false, false]
        for (const team in teams) for (const insect of startingInsects) {
            this.stones.push(new Stone(insect, team))
        }
    }

    get team() {
        return this.turnNumber % 2 ? teams.WHITE : teams.BLACK
    }
    get result() {
        return this.hive.gameResult()
    }
    get moveAllowed() {
        return this._beeMove[this.team]
    }
    _getActions() {
        let opts = []
        const dropStones = [...new Set(this.stones
            .filter(a => a.team === this.team)
            .map(obj => JSON.stringify(obj)))]
            .map(str => JSON.parse(str))
        if (this.turnNumber === 0) return dropStones.map(stone => new Drop(stone, new Hex(0, 0)))
        else if (this.turnNumber === 1) return dropStones.map(stone => new Drop(stone, new Hex(0, -1)))
        else if (this.turnNumber >= 6 && !this.moveAllowed) {
            [...this.hive.generateDrops(this.team)].forEach(d => opts.push(new Drop(new Stone(insects.BEE, this.team), d)))
        } else {
            if (dropStones.size) {
                [...this.hive.generateDrops(this.team)].forEach(d => dropStones.forEach(ds => opts.push(new Drop(ds, d))))
            }
            if (this.moveAllowed) {
                [...this.hive.generateMoves(this.team)].forEach((origin, dest) => {
                    opts.push(new Move(origin, dest))
                })
            }
        }
        if (opts.length) return opts
        else return [Pass]
    }
    get actions() {
        if (!this._actions) this._actions = this._getActions()
        return this._actions
    }

    isLegal(action) {
        return action in self.actions
    }
    apply(action) {
        // No check for legal action!
        let newState = Object.assign(Object.create(Object.getPrototypeOf(this)), this)
        let stone;
        if (action instanceof Move) {
            // Remove the stone from the old position and add it at the new one
            stone = newStae.hive.at(action.origin)
            newState.hive.removeStone(action.origin)
        } else if (action instanceof Drop) {
            stone = action.stone
            if (stone.insect === insects.BEE) {
                // Update that the bee is dropped
                newState._beeMove[this.team] = true
            }
            // Remove the dropped stone from the availables and add it to the hive
            newState.stones = newState.stones.filter(s => s !== stone)
        }
        newState.hive.addStone(action.destination, stone)
        delete newState._actions
        newState.turnNumber++
        return newState
    }
    children() {
        return this.actions.map(a => this.apply(a))
    }
    step(policy=randomPolicy) {
        return this.apply(policy(this.actions))
    }
}

function randomPolicy(actions) {
    return actions[Math.floor(Math.random() * actions.length)]
}