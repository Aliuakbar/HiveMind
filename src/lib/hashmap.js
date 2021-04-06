export class HashMap extends Map {
    get(key){
        return super.get(JSON.stringify(key));
    }
    set(key, value){
        return super.set(JSON.stringify(key), value);
    }
    delete(key){
        return super.delete(JSON.stringify(key));
    }
    has(key){
      return super.has(JSON.stringify(key));
    }
    *keys(){
      for (const key of super.keys()) {
        yield JSON.parse(key)
      }
    }
}
export class HashSet extends Set {
    add(key, value){
        return super.add(JSON.stringify(key), value);
    }
    has(key){
      return super.has(JSON.stringify(key));
    }
    *values(){
      for (const key of super.values()) {
        yield JSON.parse(key)
      }
    }
}