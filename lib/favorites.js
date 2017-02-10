'use babel';
import { Emitter } from 'atom';
import { getCommandsForElement, getActiveElement } from './helpers';

const EVENT_SPLIT = ':';
const EVENT_WILDCARD = '*';

let favorites = new Map();
let blacklist = new Map();
const emitter = new Emitter();

function isNotBlacklisted(type) {
  const [namespace, ...command] = type.split(EVENT_SPLIT);
  return !(blacklist.has(namespace) &&
    (blacklist.get(namespace).has(command.join(EVENT_SPLIT)) ||
      blacklist.get(namespace).has(EVENT_WILDCARD)));
}

function getBlacklistFromStrings(arr) {
  return arr.reduce(
    (memo, entry) => {
      const [namespace, ...command] = entry.split(EVENT_SPLIT);
      if (!memo.has(namespace)) {
        memo.set(namespace, new Map());
      }
      return memo.set(
        namespace,
        memo.get(namespace).set(command.join(EVENT_SPLIT), true),
      );
    },
    new Map(),
  );
}

const EVENTS = { ADD: 'add', CHANGED: 'changed' };

function onFavoritesChanged() {
  emitter.emit(EVENTS.CHANGED, getFavorites());
}

function setConfig(config) {
  blacklist = getBlacklistFromStrings(config.blacklist);
  onFavoritesChanged();
}

function addCommandEvent({ type }) {
  if (!favorites.has(type)){
    favorites.set(type, 1);
  }else{
    favorites.set(type, favorites.get(type) + 1);
  }

  emitter.emit(EVENTS.ADD, event);
  onFavoritesChanged();
}

function clearFavorites() {
  const wasEmpty = history.size === 0;
  favorites = new Map();
  if (!wasEmpty) {
    onFavoritesChanged();
  }
}

function getFavorites() {
  const commandsForActiveElement = getCommandsForElement(getActiveElement());

  const keys = Array.from(favorites.keys());
  const sortFavorites = (a,b) => favorites.get(a) - favorites.get(b);

  return keys
    .sort(sortFavorites)
    .filter(isNotBlacklisted)
    .map((type) => {
      const command = commandsForActiveElement.find(
        ({ name }) => name === type,
      );
      if (command != null) {
        return Object.assign({ counter: favorites.get(type) }, command);
      }
    })
    .filter(item => item);
  }

export default {
  addCommandEvent,
  getFavorites,
  clearFavorites,
  emitter,
  setConfig,
  EVENTS,
};
