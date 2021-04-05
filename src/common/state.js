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
        this._beeMove = new Map([
            ["WHITE", false],
            ["BLACK", false]
    ])
        for (const team in teams) for (const insect of startingInsects) {
            this.stones.push(new Stone(insect, team))
        }
    }

    get team() {
        return this.turnNumber % 2 === 0 ? teams.WHITE : teams.BLACK
    }
    get result() {
        return this.hive.gameResult()
    }
    get moveAllowed() {
        return this._beeMove.get(this.team)
    }
    _getActions() {
        let opts = []
        const dropStones = this.stones.filter(stone => stone.team === this.team)
            .map(i => JSON.stringify(i))
            .filter((s, i, r) => r.indexOf(s) === i)
            .map(i => JSON.parse(i))
            .map(({insect, team}) => new Stone(insect, team))
        if (this.turnNumber === 0) return dropStones.map(stone => new Drop(stone, new Hex(0, 0)))
        else if (this.turnNumber === 1) return dropStones.map(stone => new Drop(stone, new Hex(0, -1)))
        else if (this.turnNumber >= 6 && !this.moveAllowed) {
            [...this.hive.generateDrops(this.team)].forEach(d => opts.push(new Drop(new Stone(insects.BEE, this.team), d)))
        } else {
            if (dropStones.length) {
                [...this.hive.generateDrops(this.team)].forEach(d => dropStones.forEach(ds => opts.push(new Drop(ds, d))))
            }
            // TODO generate drops probably gives to many
            if (this.moveAllowed) {
                this.hive.generateMoves(this.team).forEach(([origin, dest]) => {
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
        // TODO apparently copying/cloning objects is not trivial in JS
        // So maybe just create new instance with the data as arguments
        // let newState = Object.assign(Object.create(Object.getPrototypeOf(this)), this)
        // State is mutable now, apply updates inplace instead of returning a new instance
        console.log(`Applying ${JSON.stringify(action)}`)
        let stone
        if (action instanceof Move) {
            // Remove the stone from the old position and add it at the new one
            stone = this.hive.at(action.origin)
            this.hive.removeStone(action.origin)
            this.hive.addStone(action.destination, stone)
        } else if (action instanceof Drop) {
            stone = action.stone
            if (stone.insect === insects.BEE) {
                // Update that the bee is dropped
                this._beeMove.set(this.team, true)
            }
            // Remove the dropped stone from the availables and add it to the hive
            // TODO the stone is not removed because objects do not compare equal for values
            this.stones.splice(this.stones.indexOf(stone), 1)
            this.hive.addStone(action.destination, stone)
        }
        delete this._actions
        this.turnNumber++
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