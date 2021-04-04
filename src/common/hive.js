import {insects} from "./insects.js"
import {teams} from "./teams.js"
import {Hex} from "./hexlib.js"


export class Hive {
    constructor(map = {}) {
        this.map = map
    }
    at(hex) {
        return this.map[hex][-1]
    }

    removeStone(hex) {
        this.map[hex].pop()
        if (!this.map[hex].length) {
            delete this.map[hex]
        }
    }

    addStone(hex, stone){
        this.root = stone
        if (!(hex in this.map)) this.map[hex] = [stone]
        else this.map[hex].push(stone)
    }

    gameResult() {
        let whiteLost = false
        let blackLost = false
        for (const hex in this.map) {
            const stone = this.map[hex][0]
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
        return [...hex.neighbors()].filter(n => n in this.map)
    }
    height(hex) {
        return this.map[hex].length
    }
    *generateSingleWalks(hex, ignore=null) {
        for ([a, b, c] of hex.circleIterator) {
            if (b in this.map) continue
            if (ignore === null) {
                if ((a in this.map) ^ (c in this.map)) yield b
            } else {
                if ((a in this.map) && (a!==ignore) ^ (c in this.map && c!==ignore)) yield b
            }
        }
    }

    *generateWalks(hex, target) {
        let visited = new Set()
        let distance = {}
        let queue = []
        queue.push(hex)
        distance[hex] = 0
        visited.add(hex)
        while (queue.length) {
            let vertex = queue.shift()
            visited.add(vertex)
            if (target === undefined && vertex !== hex) yield vertex
            else {
                let d = distance[vertex]
                if (d > target) continue
                if (d === target) yield vertex
            }
            for (let n of this.generateSingleWalks(vertex, hex)) {
                if (visited.has(n)) continue
                distance[n] = distance[vertex] + 1
                queue.push(n)
            }
        }
    }
    *generateSpiderWalks(hex) {
        return this.generateWalks(hex, 3)
    }
    
    *generateJumps(hex) {
        for (const d of Hex.directions) {
            let offset = new Hex(...d)
            if (hex.add(offset) in this.map) {
                let i = 2
                while (hex.add(offset.scale(i)) in this.map) i++
                yield hex.add(offset.scale(i))
            }
        }
    }
    *generateClimbs(hex) {
        let hh = this.height(hex)
        if (hh > 1) {
            for ([a, b, c] of hex.circleIterator()){
                if (this.height(b) < hh) {
                    if ((this.height(a) < hh) || (this.height(c) < hh)) yield b
                }
            }
        } else for (const i of this.generateSingleWalks()) yield i
        for ([a, b, c] of hex.circleIterator()) {
            let ha = this.height(b)
            let hb = this.height(b)
            let hc = this.height(c)
            if ((hb >= hh) && !(ha > hh && hc > hh)) yield b
        }
    }
    _checkNeighborTeam(hex, team) {
        return this.neighbors(hex).every(n => this.at(n).team === team)
    }
    generateDrops(team) {
        let candidates = new Set()
        for (const node in this.map) {
            [...node.neighbors()]
                .filter(e => ! e in this.map)
                .forEach(e => candidates.add(e))
        }
        return [...candidates].filter(e => this._checkNeighborTeam(e, team))
    }

    _oneHive() {
        let lowlink = {}
        let visited = new Set()
        let index = {}
        let articulation_points = new Set()
        let dfs = (node, parent, counter) => {
            visited.add(node)
            counter++
            index[node] = counter
            lowlink[node] = counter
            let children = 0
            for (n of this.neighbors) {
                if (n === parent) continue
                if (visited.has(n)) lowlink[node] = Math.min(lowlink[node], index[n])
                else {
                    dfs(n, node, counter)
                    lowlink[node] = Math.min(lowlink[node], lowlink[n])
                    if (lowlink[n] >= index[node] && parent !== null) articulation_points.add(node)
                    children++
                }
            }
            if (parent === null && children >= 2) articulation_points.add(node)
        }
        if (this.root !== undefined) dfs(this.root, null, 0)
        return articulation_points
    }

    *_generateMovesFrom(hex) {
        // insects.BEE ... instead of 0 ... causes error. Why?
        const moveMap = {
            0: this.generateSingleWalks,
            1: this.generateSpiderWalks,
            2: this.generateWalks,
            3: this.generateJumps,
            4: this.generateClimbs
        }
        for (const i of [...moveMap[this.at(hex).insect](hex)]) yield i
    }

    *generateMoves(team) {
        const articulation_points = this._oneHive()
        let starts = this.map
            .filter(hex => this.at(hex).team === team)
            .filter(e => this.height(hex) > 1 || !articulation_points.has(e))
        for (const hex of starts) {
            for (const dest of this._generateMovesFrom(hex)) yield [hex, dest]
        }
    }
}