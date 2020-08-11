import {upgradeCancelBubble, degradeCancelBubble} from "./upgradeCancelBubble.js";

//target* => cb* => type+" "+capture => cb/wrappedCb
const targetCbWrappers = new WeakMap();

function makeKey(type, options) {
  return (options instanceof Object ? options.capture : options) ? type + " capture" : type;
}

function hasWrapper(target, type, cb, options) {
  const dict = targetCbWrappers.get(target)?.get(cb);
  return dict && makeKey(type, options) in dict;
}

function setWrapper(target, type, cb, options, wrapped) {
  let cbMap = targetCbWrappers.get(target);
  if (!cbMap)
    targetCbWrappers.set(target, cbMap = new WeakMap());
  let typeDict = cbMap.get(cb);
  if (!typeDict)
    cbMap.set(cb, typeDict = {});
  typeDict[makeKey(type, options)] = wrapped;
}

function removeWrapper(target, type, options, cb) {
  const typeDict = targetCbWrappers.get(target)?.get(cb);
  if (!typeDict)
    return null;
  const key = makeKey(type, options);
  const result = typeDict[key];
  delete typeDict[key];
  return result;
}

let addEventListenerOG;
let removeEventListenerOG;
let stopPropagationOG;
let stopImmediatePropagationOG;

function wrapCallbackCheckCancelBubble(cb) {
  return function (e) {
    e.cancelBubble !== 1 && cb.call(this, e);
  };
}

//unstoppable event listeners will not obey any stopPropagations.
/**
 * depends on the upgraded version of cancelBubble
 * that distinguish between stopPropagation() and stopImmediatePropagation()
 */
export function addEventListenerOptionUnstoppable() {

  addEventListenerOG = Object.getOwnPropertyDescriptor(EventTarget.prototype, "addEventListener");
  removeEventListenerOG = Object.getOwnPropertyDescriptor(EventTarget.prototype, "removeEventListener");

  function addEventListenerUnstoppable(type, cb, options) {
    if (hasWrapper(this, type, cb, options))
      return;
    const wrapped = options?.unstoppable ? cb : wrapCallbackCheckCancelBubble(cb);
    setWrapper(this, type, cb, options, wrapped)
    addEventListenerOG.value.call(this, type, wrapped, options);
  }

  function removeEventListenerUnstoppable(type, cb, options) {
    const wrappedCbOrCb = removeWrapper(this, type, options, cb) || cb;
    removeEventListenerOG.value.call(this, type, wrappedCbOrCb, options);
  }

  Object.defineProperties(EventTarget.prototype, {
    addEventListener: {value: addEventListenerUnstoppable},
    removeEventListener: {value: removeEventListenerUnstoppable}
  });

  stopPropagationOG = Object.getOwnPropertyDescriptor(Event.prototype, "stopPropagation");
  stopImmediatePropagationOG = Object.getOwnPropertyDescriptor(Event.prototype, "stopImmediatePropagation");
  Object.defineProperties(Event.prototype, {
    stopPropagation: {value: function(){}},
    stopImmediatePropagation: {value: function(){}}
  });
  upgradeCancelBubble();
}

export function removeEventListenerOptionUnstoppable() {
  degradeCancelBubble();
  Object.defineProperties(Event.prototype, {
    stopPropagation: stopPropagationOG,
    stopImmediatePropagation: stopImmediatePropagationOG
  });
  Object.defineProperties(EventTarget.prototype, {
    addEventListener: addEventListenerOG,
    removeEventListener: removeEventListenerOG
  });
}