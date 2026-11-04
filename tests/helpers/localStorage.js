// localStorage falso en memoria para Node: los módulos de lógica (storage.js,
// backup.js, habits.js, world.js) usan el global `localStorage`. Se instala al
// importar este módulo y se reinicia antes de cada prueba con resetLocalStorage().

function createFakeStorage() {
  const store = new Map();
  return {
    getItem(key) {
      const k = String(key);
      return store.has(k) ? store.get(k) : null;
    },
    setItem(key, value) {
      store.set(String(key), String(value));
    },
    removeItem(key) {
      store.delete(String(key));
    },
    key(index) {
      const keys = Array.from(store.keys());
      return index >= 0 && index < keys.length ? keys[index] : null;
    },
    clear() {
      store.clear();
    },
    get length() {
      return store.size;
    },
  };
}

const fakeStorage = createFakeStorage();
globalThis.localStorage = fakeStorage;

export function resetLocalStorage() {
  fakeStorage.clear();
}
