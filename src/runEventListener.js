import {downgradeCancelBubble, upgradeCancelBubble} from "./upgradeEvent_capture_cancelBubble.js";

function verifyFirstLast(target, type, options) {
  if (!(options instanceof Object))
    return;
  if (options.last && options.capture)
    throw new Error("last option can only be used with bubble phase (at_target bubble phase) event listeners");
  if (options.first && !options.capture)
    throw new Error("first option can only be used with capture phase (at_target capture phase) event listeners");
  const previousLastEntry = getEventListeners(target, type).filter(listener => listener.last);
  if (options.last && previousLastEntry.length === 1)
    throw new Error("only one event listener {last: true} can be added to the same target and event type.");
  const previousFirstEntry = getEventListeners(target, type).filter(listener => listener.first);
  if (options.first && previousFirstEntry.length === 1)
    throw new Error("only one event listener {first: true} can be added to the same target and event type.");
}

//todo we need to freeze the listener objects.. They can now be mutated.
//this thing returns immutable listeners
function getEventListeners(target, type, phase) {
  const allListeners = listeners.get(target);
  if (!allListeners)
    return [];
  if (!type && !phase) {
    const dictClone = {};
    for (let type in allListeners)
      dictClone[type] = allListeners[type].slice();
    return dictClone;
  }
  if (!allListeners[type])
    return [];
  if (!phase || phase === Event.AT_TARGET)
    return allListeners[type].slice();
  if (phase === Event.CAPTURING_PHASE)
    return allListeners[type].filter(listener => listener.capture);
  if (phase === Event.BUBBLING_PHASE)
    return allListeners[type].filter(listener => !listener.capture);
  throw new Error("Illegal event phase for getEventListeners: phase can only be Event.BUBBLING_PHASE, Event.CAPTURING_PHASE, or Event.AT_TARGET.");
}

function dispatchErrorEvent(error, message) {
  const uncaught = new ErrorEvent('error', {error, message});
  window.dispatchEvent(uncaught);
  !uncaught.defaultPrevented && console.error(uncaught);
}

//todo this function we also want to do in the dispatchEvent method.
function runEventListener(target, event, listener) {
  if (listener.removed)                                  //dynamic removing of event listener during propagation on the same eventTarget.
    return;
  Object.defineProperty(event, "capture", {value: listener.capture, configurable: true}); //cancelBubble rely on capture and currentTarget being up to date
  if (!listener.unstoppable && event.cancelBubble === 1) //stopPropagation()
    return;
  if (listener.once)
    target.removeEventListener(event.type, listener.listener, listener.capture);
  try {
    const cb = listener.listener;
    cb instanceof Function ? cb.call(target, event) : cb.handleEvent(event);
  } catch (error) {
    dispatchErrorEvent(error, 'Uncaught Error: event listener break down');
  }
}

//target*! => type! => {listener}!
// To speed up retrieval of relevant getListeners, we can make an extra map for "type capture" and "type bubble".
// To speed up hasListener check, we can make a //target*! => *cb! => [type capture, type bubble] map.
const listeners = new WeakMap();

function hasEventListener(type, outsideCapture, cb) {
  const dict = listeners.get(this);
  if (!dict)
    return false;
  const list = dict[type];
  return list && list.find(({listener, capture}) => listener === cb && capture === outsideCapture);
}

/**
 * Patches the composedPathContexts at first event listener invocation for this event.
 * @param e
 */
function patchComposedPathContext(e) {
  if (e.composedPathContexts)
    return;
  const composedPathContexts = e.composedPath().map(target => target.getRootNode());
  Object.defineProperty(e, "composedPathContexts", {get: () => composedPathContexts});
}

function genericHandleEventListener(e) {
  patchComposedPathContext(e);    //todo not sure we want to do this.
  // patchStateOfAHrefAttributeAtEventDispatch(e);//todo do we want/need this??? We need this for the defaultAction, we don't need it here..
  runEventListener(this.target, e, this);
}

function makeListener(target, type, cb, capture, options, keys) {
  if (options instanceof Object) {
    const listener = {type, capture, target, listener: cb, handleEvent: genericHandleEventListener};
    for (let key in keys)
      listener[key] = options.hasOwnProperty(key) ? options[key] : keys[key];
    return listener;
  }
  return Object.assign({}, keys, {type, capture, target, listener: cb, handleEvent: genericHandleEventListener});
}

//todo here we need to do a fix for first and last
function addListener(target, listener) {
  let dict = listeners.get(target);
  !dict && listeners.set(target, dict = {});
  const list = dict[listener.type] || (dict[listener.type] = []);
  list.push(listener);
}

//todo here we need to do a fix for first and last
function removeListener(target, type, cb, outsideCapture) {
  const dict = listeners.get(target);
  if (!dict)
    return undefined;
  const list = dict[type];
  if (!list)
    return undefined;
  const listenerIndex = list.findIndex(({listener, capture}) => listener === cb && outsideCapture === capture);
  if (listenerIndex === -1)
    return undefined;
  return list.splice(listenerIndex, 1)[0];
}

let addEventListenerOG;
let removeEventListenerOG;
let stopPropagationOG;
let stopImmediatePropagationOG;

//unstoppable event listeners will not obey any stopPropagations.
/**
 * depends on the upgraded version of cancelBubble
 * that distinguish between stopPropagation() and stopImmediatePropagation()
 */
export function upgradeAddEventListener(eventListenerOptions = {unstoppable: false, first: false, last: false}) {
  eventListenerOptions = Object.assign(
    {},
    {capture: false, once: false, passive: true},
    eventListenerOptions
  );
  addEventListenerOG = Object.getOwnPropertyDescriptor(EventTarget.prototype, "addEventListener");
  removeEventListenerOG = Object.getOwnPropertyDescriptor(EventTarget.prototype, "removeEventListener");
  stopPropagationOG = Object.getOwnPropertyDescriptor(Event.prototype, "stopPropagation");
  stopImmediatePropagationOG = Object.getOwnPropertyDescriptor(Event.prototype, "stopImmediatePropagation");
  Object.defineProperties(Event.prototype, {
    stopPropagation: {
      value: function () {
      }
    },
    stopImmediatePropagation: {
      value: function () {
      }
    }
  });

  function addEventListenerUpgraded(type, cb, options) {
    const capture = !!(options instanceof Object ? options.capture : options);
    if (this.hasEventListener(type, capture, cb))
      return;
    verifyFirstLast(this, type, options);
    const listener = makeListener(this, type, cb, capture, options, eventListenerOptions);
    addListener(this, listener);
    // if(first/last)
    //   thenDoStuff();
    const onceRemoved = Object.assign({}, listener, {once: false}); //runEventListener must override once
    addEventListenerOG.value.call(this, type, listener, onceRemoved);
  }

  function removeEventListenerUpgraded(type, cb, options) {
    const capture = !!(options instanceof Object ? options.capture : options);
    const listener = removeListener(this, type, cb, capture);
    if (!listener)
      return;
    listener.removed = true;
    removeEventListenerOG.value.call(this, type, listener, capture);
  }

  Object.defineProperties(EventTarget.prototype, {
    addEventListener: {value: addEventListenerUpgraded},
    removeEventListener: {value: removeEventListenerUpgraded},
    hasEventListener: {value: hasEventListener, configurable: true}
  });
  const clearStopPropagationStateAtTheStartOfDispatchEvent = upgradeCancelBubble();
  return {
    getEventListeners,
    clearStopPropagationStateAtTheStartOfDispatchEvent,
    runEventListener,
    patchComposedPathContext
  };
}

export function downgradeAddEventListener() {
  downgradeCancelBubble();
  Object.defineProperties(Event.prototype, {
    stopPropagation: stopPropagationOG,
    stopImmediatePropagation: stopImmediatePropagationOG
  });
  Object.defineProperties(EventTarget.prototype, {
    addEventListener: addEventListenerOG,
    removeEventListener: removeEventListenerOG
  });
  delete EventTarget.prototype.hasEventListener;
  delete EventTarget.prototype.runEventListener;
}