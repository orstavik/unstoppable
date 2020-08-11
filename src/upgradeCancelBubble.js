let stopPropagationOG;
let stopImmediatePropagationOG;
let cancelBubbleOG;
let dispatchEventOG;

const stops = new Map();
const immediateStops = new Set();
const beforeStops = new Set();

/**
 * This method checks if stopPropagation() has been called on this element before event begins propagation.
 * The method only checks stopPropagation() calls that are made when the event is not propagating.
 * This enables the dispatchEvent methods to reset stopPropagation() and cancelBubble state when event objects
 * are dispatched twice or more times.
 *
 * @param event
 * @returns {boolean}
 */
export function checkStops(event) {
  const beforeStopped = beforeStops.has(this);
  beforeStops.delete(event);
  stops.delete(event);
  immediateStops.delete(event);
  return beforeStopped;
}

/**
 * Upgrade the Event.prototype.cancelBubble property.
 *
 * event.cancelBubble now returns:
 *  0: no stopPropagation() has been called on the event.
 *     This maps 1:1 to all instances where the original cancelBubble returns false.
 *  1: a) stopImmediatePropagation() has previously been called on the event.
 *     b) stopPropagation() or stopImmediatePropagation() has been called on the event before it began propagating.
 *     c) stopPropagation() has previously been called on the event from an event listener attached to another event
 *        target.
 *  2: stopPropagation() has been called on the event, but at the same currentTarget and eventPhase as the current
 *     event listener.
 *     Values 1 and 2 maps 1:1 to all instances where the original cancelBubble returns true.
 *
 * Problem 1: The original .cancelBubble returns true if either stopPropagation() or stopImmediatePropagation().
 * So, how to distinguish whether .stopPropagtion() or .stopImmediatePropagtion() has been called on the event?
 * How to see if another, later event listener will be triggered on the same eventTarget and eventPhase?
 *
 * Solution: Upgrade the return value of .cancelBubble to return 1 if no other event listener will be called and
 * 2 if other event listeners on the same event target and phase will be called.
 * This exposes the nuances of the state of the event.
 *
 *
 * Note 1. When stopPropagation() is called *before* the event has begun propagating,
 *         it will simply function as if stopImmediatePropagation() was called.
 *
 * Note 2. EventTarget.dispatchEvent(event) can be used to dispatch the same event object two or more times.
 *         let e1;
 *         window.addEventListener("weird-events", e=> console.log(e === e1, e.timeStamp, e1 = e), true);
 *         const e = new Event("weird-events");
 *         document.dispatchEvent(e);
 *         window.dispatchEvent(e);
 *         //false, 10, e
 *         //true, 10, e
 *
 *         This is not good behavior. But ok. To support it, we need to reset the state of cancelBubble for all event
 *         objects after dispatchEvent is called, but before the event actually begins its propagation.
 */
export function upgradeCancelBubble() {
  stopPropagationOG = Object.getOwnPropertyDescriptor(Event.prototype, "stopPropagation");
  stopImmediatePropagationOG = Object.getOwnPropertyDescriptor(Event.prototype, "stopImmediatePropagation");
  cancelBubbleOG = Object.getOwnPropertyDescriptor(Event.prototype, "cancelBubble");
  dispatchEventOG = Object.getOwnPropertyDescriptor(EventTarget.prototype, "dispatchEvent");

  Object.defineProperty(EventTarget.prototype, "dispatchEvent", {
    value: function (event, ...args) {
      !checkStops(this) && dispatchEventOG.value.call(this, event, ...args);
    }
  });
  Object.defineProperties(Event.prototype, {
    "stopPropagation": {
      value: function stopPropagation() {
        if (this.eventPhase === 0) {
          beforeStops.add(this);
          return;
        }
        stops.set(this, {currentTarget: this.currentTarget, eventPhase: this.eventPhase});
        stopPropagationOG.value.call(this);
      }
    },
    "stopImmediatePropagation": {
      value: function stopImmediatePropagation() {
        if (this.eventPhase === 0) {
          beforeStops.add(this);
          return;
        }
        immediateStops.add(this);
        stopImmediatePropagationOG.value.call(this);
      }
    },
    "cancelBubble": {
      get: function () {
        if (immediateStops.has(this) || beforeStops.has(this))
          return 1;
        const stop = stops.get(this);
        if (!stop)
          return 0
        if (stop.currentTarget === this.currentTarget && stop.eventPhase === this.eventPhase)
          return 2;
        return 1;
      },
      set: function (val) {
        val && this.stopPropagation();
      }
    }
  });
}

export function degradeCancelBubble() {
  Object.defineProperties(Event.prototype, {
    "stopPropagation": stopPropagationOG,
    "stopImmediatePropagation": stopImmediatePropagationOG,
    "cancelBubble": cancelBubbleOG,
  });
  Object.defineProperty(EventTarget.prototype, "dispatchEvent", dispatchEventOG);
}

/*
 * Problem 2: Calls to stopPropagation() from an event listener in another DOM, either from
 * a) a lightDOM, capture-phase event listener,
 * b) a shadowDOM, event listener, or
 * c) a slotted DOM context event listener,
 * can block the execution of an event listener in another DOM context and thereby block necessary functionality hard
 * to ensure in other ways. How can we avoid such problems?
 *
 * Solution a: disable stopPropagation(), stopImmediatePropagation(), and the cancelBubble setter completely.
 *
 * Solution b: scope stopPropagation(), stopImmediatePropagation(), and cancelBubble = true to only apply to event
 * listeners in the same DOM context. This requires a scoped stopPropagation() setup, and a scopedStopPropagation() setup
 * needs to know more precisely from what DOM contexts the call was made.
 */