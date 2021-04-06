import {State} from './common/state.js'

let s = new State()

for (let i=0;i<15;i++) {
    // console.log(s)
    // console.log(s.actions)
    s.step()
}
