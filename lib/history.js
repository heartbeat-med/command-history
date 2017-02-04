'use babel';
import { Emitter } from 'atom';
import { getCommandsForElement, getActiveElement } from './helpers';

const EVENT_SPLIT = ':';
const EVENT_WILDCARD = '*';

let history = [];
let blacklist = new Map();
let maxItems;
const emitter = new Emitter();

function isNotBlacklisted({ type }) {
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

function onHistoryChanged() {
  emitter.emit(EVENTS.CHANGED, getHistory());
}

function setConfig(config) {
  blacklist = getBlacklistFromStrings(config.blacklist);
  maxItems = config.maxItems;
  onHistoryChanged();
}

function addCommandEvent({ type, silentHistory }) {
  if (history.length === 0 || type !== history[history.length - 1].type) {
    const event = { type, date: new Date() };

    // Delete past event with the same type
    const foundIndex = history.findIndex(item => item.type === type);
    if (foundIndex === -1) {
      history = [...history, event];
    } else {
      history = [
        ...history.slice(0, foundIndex),
        ...history.slice(foundIndex + 1),
        event,
      ];
    }

    emitter.emit(EVENTS.ADD, event);
    onHistoryChanged();
  }
}

function clearHistory() {
  const wasEmpty = history.length === 0;
  history = [];
  if (!wasEmpty) {
    onHistoryChanged();
  }
}

function setHistory(newHistory = []) {
  history = newHistory;
  onHistoryChanged();
}

function getRawHistory() {
  return history;
}

function getHistory() {
  const commandsForActiveElement = getCommandsForElement(getActiveElement());
  const filteredHistory = history
    .filter(isNotBlacklisted)
    .map(({ date, type }) => {
      const command = commandsForActiveElement.find(
        ({ name }) => name === type,
      );
      if (command != null) {
        return Object.assign({ date }, command);
      }
    })
    .filter(item => item);

  return filteredHistory.slice(filteredHistory.length - maxItems);
}

export default {
  addCommandEvent,
  getHistory,
  getRawHistory,
  clearHistory,
  setHistory,
  emitter,
  setConfig,
  EVENTS,
};
