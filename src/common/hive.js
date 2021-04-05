import {insects} from "./insects.js"
import {teams} from "./teams.js"
import {Hex} from "./hexlib.js"


export class Hive {
    constructor() {
        this.map = new Map()
    }
    at(hex) {
        const ar = this.map.get(hex)
        return ar[ar.length - 1]
    }

    removeStone(hex) {
        this.map.get(hex).pop()
        if (!this.map.get(hex).length) {
            delete this.map.get(hex)
        }
    }

    addStone(hex, stone){
        this.root = hex
        if (!this.map.has(hex)) this.map.set(hex, [stone])
        else this.map.get(hex).push(stone)
    }

    gameResult() {
        let whiteLost = false
        let blackLost = false
        for (const hex of this.map.keys()) {
            const stone = this.map.get(hex)[0]
            if (stone.insect === insects.BEE) {
                if (this.neighbors(hex).length === 6) {
                    if (stone.team === teams.WHITE) whiteLost = true
                    else blackLost = true
                }
            }
        }
        if (whiteLost && blackLost) return 0
        else if (whiteLost) return 1
        else if (blackLost) return -1
    }

    neighbors(hex) {
        return [...hex.neighbors()].filter(n => this.map.has(n))
    }
    height(hex) {
        if (this.map.has(hex)) return this.map.get(hex).length
        return 0
    }
    generateSingleWalks(hex, ignore=null) {
        let result = []
        for (const [a, b, c] of hex.circleIterator()) {
            if (this.map.has(b)) continue
            if (ignore === null) {
                if (this.map.has(a) ^ this.map.has(c)) result.push(b)
            } else {
                // ignore was probably not working because object comparison
                if (this.map.has(a) && (a.compare(ignore)) ^ (this.map.has(c) && c.compare(ignore))) result.push(b)
            }
        }
        return result
    }
    generateWalks(hex, target=-1) {
        let visited = new Set()
        let distance = new Map()
        let queue = []
        let result = []
        queue.push(hex)
        distance.set(hex, 0)
        visited.add(hex)
        while (queue.length) {
            let vertex = queue.shift()
            visited.add(vertex)
            if (target === -1 && vertex !== hex) result.push(vertex)
            else {
                let d = distance.get(vertex)
                if (d > target) continue
                if (d === target) result.push(vertex)
            }
            for (const n of this.generateSingleWalks(vertex, hex)) {
                if (visited.has(n)) continue
                distance.set(n, distance.get(vertex) + 1)
                queue.push(n)
            }
        }
        return result
    }
    generateSpiderWalks(hex) {
        return this.generateWalks(hex, 3)
    }
    generateJumps(hex) {
        let result = []
        for (const offset of Hex.directions) {
            if (this.map.has(hex.add(offset))) {
                let i = 2
                while (this.map.has(hex.add(offset.scale(i)))) i++
                result.push(hex.add(offset.scale(i)))
            }
        }
        return result
    }
    generateClimbs(hex) {
        let result = []
        let hh = this.height(hex)
        if (hh > 1) {
            for ([a, b, c] of hex.circleIterator()){
                if (this.height(b) < hh) {
                    if ((this.height(a) < hh) || (this.height(c) < hh)) result.push(b)
                }
            }
        } else result.concat(this.generateSingleWalks(hex))
        for (const [a, b, c] of hex.circleIterator()) {
            let ha = this.height(a)
            let hb = this.height(b)
            let hc = this.height(c)
            if ((hb >= hh) && !(ha > hh && hc > hh)) result.push(b)
        }
        return result
    }

    _checkNeighborTeam(hex, team) {
        return this.neighbors(hex).every(n => this.at(n).team === team)
    }
    generateDrops(team) {
        let candidates = new Set()
        for (const hex of this.map.keys()) {
            [... hex.neighbors()]
                .filter(e => !this.map.has(e))
                .forEach(e => candidates.add(e))
        }
        return [...candidates].filter(e => this._checkNeighborTeam(e, team))
    }

    _oneHive() {
        let lowLink = new Map()
        let visited = new Set()
        let index = new Map()
        let articulation_points = new Set()
        let dfs = (node, parent, counter) => {
            visited.add(node)
            counter++
            index.set(node, counter)
            lowLink.set(node, counter)
            let children = 0
            for (const n of this.neighbors(node)) {
                if (n === parent) continue
                if (visited.has(n)) lowLink.set(node, Math.min(lowLink.get(node), index.get(n)))
                else {
                    dfs(n, node, counter)
                    lowLink.set(node, Math.min(lowLink.get(node), lowLink.get(n)))
                    if (lowLink.get(n) >= index.get(node) && parent !== null) articulation_points.add(node)
                    children++
                }
            }
            if (parent === null && children >= 2) articulation_points.add(node)
        }
        // Need call because otherwise this is not bound in the nested function>
        if (this.root !== undefined) dfs.call(this, this.root, null, 0)
        return articulation_points
    }

    generateMovesFrom(hex) {
        // insects.BEE ... instead of 0 ... causes error. Why?
        const moveMap = {
            BEE: this.generateSingleWalks,
            SPIDER: this.generateSpiderWalks,
            ANT: this.generateWalks,
            GRASSHOPPER: this.generateJumps,
            BEETLE: this.generateClimbs
        }
        console.log(this.at(hex).insect)
        console.log(moveMap[this.at(hex).insect].call(this, hex))
        return moveMap[this.at(hex).insect].call(this, hex)
    }

    generateMoves(team) {
        let result = []
        const articulation_points = this._oneHive()
        for (const hex of this.map.keys()) {
            if (this.at(hex).team === team) {
                if (this.height(hex) > 1 || !articulation_points.has(hex)) {
                    for (const dest of this.generateMovesFrom(hex)) {
                        console.log([hex, dest])
                        result.push([hex, dest])
                    }
                }
            }
        }
        return result
    }
}