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
 *  1: a) stopImmediatePropagation() has previously been called on the event from an event target in the same DOM context.
 *     b) stopPropagation() or stopImmediatePropagation() has been called on the event before it began propagating.
 *     c) stopPropagation() has previously been called on the event from an event listener attached to another event
 *        target in the same DOM context.
 *  2: stopPropagation() has been called on the event, but in the same DOM context, only on the same currentTarget and
 *     eventPhase as the current event listener.
 *  -1: either .stopImmediatePropagation() or .stopPropagation() or both has been called on the event instance on another
 *     EventTarget during propagation. But. No calls to .stopImmediatePropagation() nor .stopPropagation() has been made on
 *     the event from an event listener attached to the same event target or another event target in the same DOM context.
 *
 * Problem1: The original .cancelBubble returns true if either stopPropagation() or stopImmediatePropagation().
 * So, how to distinguish whether .stopPropagtion() or .stopImmediatePropagtion() has been called on the event?
 * How to see if another, later event listener will be triggered on the same eventTarget and eventPhase?
 *
 * Solution1: Upgrade the return value of .cancelBubble to return 1 if no other event listener will be called and
 * 2 if other event listeners on the same event target and phase will be called. This simply exposes the nuances of the
 * state of the event.
 *
 * Problem 2: Calls to stopPropagation() from an event listener in another DOM, either from
 * a) a lightDOM, capture-phase event listener,
 * b) a shadowDOM, event listener, or
 * c) a slotted DOM context event listener,
 * can block the execution of an event listener in another DOM context and thereby block necessary functionality hard
 * to ensure in other ways. How can we avoid such problems?
 *
 * Solution 2a: disable stopPropagation(), stopImmediatePropagation(), and the cancelBubble setter completely.
 *
 * Solution 2b: scope stopPropagation(), stopImmediatePropagation(), and cancelBubble = true to only apply to event
 * listeners in the same DOM context. This requires a scoped stopPropagation() setup, and a scopedStopPropagation() setup
 * needs to know more precisely from what DOM contexts the call was made.
 *
 * Note 1. When stopPropagation() is called *before* the event has begun propagating,
 *         it will simply function as if stopImmediatePropagation() was called.
 *
 * Note 2. EventTarget.dispatchEvent(event) can be used to dispatch the same event object two or more times.
 *         const e = new Event("i-shall-say-this-only-once");
 *         document.dispatchEvent(e);
 *         window.dispatchEvent(e);
 *
 *         This is not good behavior. But ok. To support it, we need to reset the state of cancelBubble for all event
 *         objects after dispatchEvent is called, but before the event actually begins its propagation.
 *
 * Note 3. To know the DOM context of an event, we cannot use the .getRootNode() of the nodes in the composedPath()
 *         as the nodes might be moved in the DOM. We must therefore use the structure of the composedPath() in itself,
 *         as this is the only structure preserved in the DOM.
 *
 *         But. There is an edge case that the composedPath() doesn't cover.
 *         Two identical composedPath()s can arise from two different DOM compositions:
 *         it is not possible to distinguish between elements that are slotted into a dom or elements that are the
 *         fallback nodes of a slot, by looking at the composedPath() data alone. You would need to check the assigned
 *         nodes of the slot element/the assigned slot of the fallback node/slotted node, to see if they are empty or
 *         set.
 *
 *         But-but. If the fallback nodes are moved out into the slotted position during event propagation. Or if
 *         the slotted elements are moved into the shadowDOM and set as new fallback nodes, then the original state of
 *         the assignedSlot and assignedNodes() are overwritten. This edge case, slotted-becomes-fallback-or-vice-versa, cannot fully be patched.
 *
 *         We therefore use the structure of the composedPath() and look at the assignedNodes() when a <slot> element
 *         arise, and assume that no event listener has performed a slotted-becomes-fallback-or-vice-versa dom manipulation
 *         before we have had a chance to set the context correctly.
 */
export function addEventCancelBubbleUpgrade() {
  stopPropagationOG = Object.getOwnPropertyDescriptor(Event.prototype, "stopPropagation");
  stopImmediatePropagationOG = Object.getOwnPropertyDescriptor(Event.prototype, "stopImmediatePropagation");
  cancelBubbleOG = Object.getOwnPropertyDescriptor(Event.prototype, "cancelBubble");
  dispatchEventOG = Object.getOwnPropertyDescriptor(EventTarget.prototype, "dispatchEvent");

  Object.defineProperty(EventTarget.prototype, "dispatchEvent", {
    value: function (event, ...args) {
      checkStops(this) && dispatchEventOG.call(this, event, ...args);
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
        stopPropagationOG.call(this);
      }
    },
    "stopImmediatePropagation": {
      value: function stopImmediatePropagation() {
        if (this.eventPhase === 0) {
          beforeStops.add(this);
          return;
        }
        immediateStops.add(this);
        stopImmediatePropagationOG.call(this);
      }
    },
    "cancelBubble": {
      get: function () {
        if (immediateStops.has(this))
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

export function removeEventIsStopped() {
  Object.defineProperties(Event.prototype, {
    "stopPropagation": stopPropagationOG,
    "stopImmediatePropagation": stopImmediatePropagationOG,
  });
  delete Event.prototype.isStopped;
  Object.defineProperty(EventTarget.prototype, "dispatchEvent", dispatchEventOG);
}