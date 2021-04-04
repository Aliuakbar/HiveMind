export function Move(origin, destination) {
    this.origin = origin
    this.destination = destination
}

export function Drop(stone, destination) {
    this.stone = stone
    this.destination = destination
}
export const Pass = {}