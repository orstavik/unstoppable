import {computePropagationPath, scopedPaths} from "./computePaths.js";
import {upgradeAddEventListener, downgradeAddEventListener,} from "./runEventListener.js";
import {prepareDefaultActions} from "./defaultActions.js";
import {} from "https://cdn.jsdelivr.net/gh/orstavik/nextTick@1/src/nextTick.js"

let getEventListeners;
let clearStopPropagationStateAtTheStartOfDispatchEvent;

function initializeEvent(event, target) {
  if (event.eventPhase !== 0)
    throw new DOMException("Failed to execute 'dispatchEvent' on 'EventTarget': The event is already being dispatched.");
  if (event.isTrusted)
    event = reuseIsTrustedEvents(event);

  //Events stopped before dispatch will still trigger unstoppable event listeners
  //.. yes, it is possible to do var e = new Event("abc"); e.stopPropagation(); element.dispatchEvent(e);
  // if (event.cancelBubble)
  //   return;

  //todo I don't think we need this here, it is a simpler way to build the composed path using .assignedSlot and .host/.parentNode I think
  const fullPath = computePropagationPath(target, event.composed, event.bubbles, event?.cutOff);
  const composedPath = scopedPaths(target, event.composed).flat(Infinity); //todo move the composedPath into the computePropagationPath
  const contexts = composedPath.map(target => {
    const root = target.getRootNode();
    return root === document ? window : root;
  });
  Object.freeze(composedPath);
  Object.freeze(contexts);

  Object.defineProperties(event, {
    target: {
      get: function () {
        let lowest = target;
        for (let t of this.composedPath()) {
          if (t === this.currentTarget)
            return lowest;
          if (t instanceof DocumentFragment && t.mode === "closed")
            lowest = t.host || lowest;
        }
      },
      configurable: true
    },
    composedPath: {
      value: function () {
        return composedPath;
      },
      configurable: true
    },
    composedPathContexts: {
      value: function () {
        return contexts;
      },
      configurable: true
    }
    //timeStamp is when the Event object is created, not when the event is dispatched. This is a pity, this is not good.
  });
  //todo this needs a little work. unsafe, can be modified.
  // should have better names. etc. review if weakmap/weakset should be used
  //todo move this into the defaultAction? or make another method that set
  event.customDefaultActions = [];
  event.preventDefaults = new Set();
  return fullPath;
}

function updateEvent(event, target, phase, tempCapture) {
  Object.defineProperties(event, {
    "currentTarget": {value: target, configurable: true},
    "eventPhase": {value: phase, configurable: true},
    "capture": {value: tempCapture, configurable: true}
  });
}

/**
 * The browser can reuse isTrusted events, ie. dispatch it twice.
 * This is an edge case, very rarely invoked.
 * When the browser reuses isTrusted events, it will re-configure
 * non-configurable properties on the event instance.
 * The event's `.target` and `.composedPath()` are updated for example, while the
 * event object dirty check and timeStamp remain constant.
 * This process cannot be replicated from JS script, one must have "browser privileges" to
 * re-configure non-configurable properties.
 *
 * The alternatives for this method would therefore be to clone the .isTrusted event, or
 * to throw an Error. Because a) a clone would not comply fully (wouldn't work with dirtychecks and
 * get a different timeStamp), and b) the edge case is so rarely used, we simply throw an Error.
 * @param event
 */
function reuseIsTrustedEvents(event) {
  throw new DOMException("The patched EventTarget.dispathEvent() cannot re-dispatch isTrusted events.");
}

function dispatchEventSync(fullPath, event) {
  for (let {target, phase, listenerPhase} of fullPath) {
    updateEvent(event, target, phase);
    for (let listener of getEventListeners(target, event.type, listenerPhase))
      EventTarget.prototype.runEventListener.call(target, event, listener);
  }
  for (let task of prepareDefaultActions(event)) //lists the default actions currently known
    task();
}

async function dispatchEventAsync(fullPath, event) {
  let macrotask = nextMesoTicks([function () {  //todo hack.. problem initiating without knowing the tasks
  }], fullPath.length + 2);

  for (let {target, phase, listenerPhase} of fullPath) {
    updateEvent(event, target, phase);
    let listeners = getEventListeners(target, event.type, listenerPhase);
    const cbs = listeners.map(listener => EventTarget.prototype.runEventListener.bind(target, event, listener));
    await macrotask.nextMesoTick(cbs);
  }
  const defActions = prepareDefaultActions(event);
  if(defActions.length)
    await macrotask.nextMesoTick(defActions);
}

/**
 * Exposes the native dispatchEvent method. The async: true behavior reflect that of native events such as dblclick,
 * and the cutOff root, reflect that of focus elements that are yes, composed, but no, doesn't necessarily pass all the
 * way up to the window.
 *
 * @param event with two new event options: {async: true, cutOff: shadowRoot/document}
 * @returns {Promise<void>}
 */
async function dispatchEvent(event) {
  const fullPath = initializeEvent(event, this);
  if (!fullPath)
    return;
  if (event.async)
    await dispatchEventAsync(fullPath, event);
  else
    dispatchEventSync(fullPath, event);

  //events can be dispatched twice, so we reset the events properties the
  updateEvent(event, null, 0); //call it resetEvent
}

let dispatchEventOG;

export function addDispatchEventOptionAsyncWithDependencies() {
  const upgradeStopPropagation = upgradeAddEventListener();
  getEventListeners = upgradeStopPropagation.getEventListeners;
  clearStopPropagationStateAtTheStartOfDispatchEvent = upgradeStopPropagation.clearStopPropagationStateAtTheStartOfDispatchEvent;
  dispatchEventOG = Object.getOwnPropertyDescriptor(EventTarget.prototype, "dispatchEvent");
  Object.defineProperty(EventTarget.prototype, "dispatchEvent", {value: dispatchEvent});
}

export function removeDispatchEventOptionAsyncWithDependencies() {
  Object.defineProperty(EventTarget.prototype, "dispatchEvent", dispatchEventOG);
  downgradeAddEventListener();
}