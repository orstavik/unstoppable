import {lastPropagationTarget} from "./computePaths.js";
import {nativeDefaultActions} from "https://cdn.jsdelivr.net/gh/orstavik/nativeDefaultActions/src/nativeDefaultActions.js";
import {} from "https://cdn.jsdelivr.net/gh/orstavik/nextTick@1/src/nextTick.js"

let preventDefaultOG;
let defaultPreventedOG;

function markPreventedActions(actions, preventeds) {
  if (!preventeds)
    return;
  for (let defAct of actions) {
    if (!defAct.irreversible && (preventeds === true || preventeds.indexOf(defAct.host) >= 0))
      defAct.prevented = true;
  }
}

function excludeActions(actions) {
  let firstExclusive;
  for (let defAct of actions) {
    if (defAct.additive)
      continue;
    if (!firstExclusive)
      firstExclusive = defAct;
    else
      defAct.excluded = true;
  }
}

export function getDefaultActions(event) {
  //1. merge the native and the custom default actions, native wins
  const defActs = [].concat(nativeDefaultActions(event)).concat(event.customDefaultActions);
  //2. sort in order of the propagation path, lowest wins
  defActs.sort((a, b) => a.index <= b.index);
  //3. mark prevent defActs
  markPreventedActions(defActs);
  //4. mark excluded defActs
  excludeActions(defActs);
  return defActs;
}

export function prepareDefaultActions(event) {
  if (event.defaultPrevented === true)
    return [];
  const allDefaultActions = getDefaultActions(event);
  if (allDefaultActions.find(defAct => defAct.native && (defAct.excluded || defAct.prevented)))
    preventDefaultOG.call(event);
  return allDefaultActions.filter(defAct => !defAct.native && !defAct.prevented && !defAct.excluded).map(({task}) => task);
}

// default actions that are set before the event begins propagating, is set as the last priority/at the end of the array.
// the first default action added will be chosen. You cannot override default action for the same element.
/**
 * The default action represents a state change that the inner element wishes to do based on an event occuring from
 * its outside. This state change happens in the shadowDOM context of the element (event though the custom element
 * doesn't need to have a shadowDOM in order to process an event in what would principally be its shadowDOM (yes,
 * "a href", i am looking at you!).
 *
 * The default action is supposed to be controlled by the outside lightDOM. the default action is therefore conceptually
 * passed from the inner shadowDOM context to the outer lightDOM context. This is implemented by associating the call
 * to setDefault() with the host node of the custom element adding it to the event. This has one positive consequences:
 * 1. if a custom element wishes to call preventDefault on a default action from one of its shadowDOM elements, and
 *    then add its own, it can do so by calling preventDefault on (or on an element inside ) its shadowDOM root node,
 *    and then adding the default action to its host node. The call to preventDefault would be on an inner DOM context,
 *    while the setDefaultAction would be on an outer DOM context.
 */

/**
 * implicitly relies on last and unstoppable event listener options..
 * can run alongside the polyfill for dispatchEvent, but doesn't depend on this polyfill.
 * you can run it without last and unstoppable options, but then the default actions can be torpedoed and
 * later added dynamic event listeners will run after the default actions.
 */
export function upgradeDefaultAction() {
  preventDefaultOG = Object.getOwnPropertyDescriptor(Event.prototype, "preventDefault");
  defaultPreventedOG = Object.getOwnPropertyDescriptor(Event.prototype, "defaultPrevented");
  Object.defineProperties(Event.prototype, {
    preventDefault: {
      value: function (target) {
        this.customDefaultActions || patchDefaultAction(this);
        if (this.preventDefaults === true) //no point in bombing the same place twice..
          return;
        if (!target) {                                 //bombs away!
          this.preventDefaults = true;
          preventDefaultOG.call(this);
          //todo remove event listener for the post propagation runDefaultAction
          return;
        }
        this.preventDefaults.add(target);  //register needle pricks
        const shadowElements = findAllTheElementsInTheShadowOfElement(target, this.composedPath());
        for (let shadowElement of shadowElements)
          this.preventDefaults.add(shadowElement);
      }
    },
    defaultPrevented: {
      get: function () {
        return this.preventDefaults;
      }
    },
    addDefault: {
      value: function (task, host, options = {additive: false, irreversible: false}) {
        if (!(task instanceof Function))
          throw new Error("A defaultAction task must be a (bound) function.");
        if (!host)
          throw new Error("You must associate a host element with the defaultAction task. This host element is usually the host node of a web component.");
        this.customDefaultActions || patchDefaultAction(this);
        this.defaultActions.push(Object.assign({}, options, {task, host}));
      }
    }
  });
}

function runDefaultActions(e) {
  const tasks = prepareDefaultActions(e);
  if (e.async)
    nextMesoTicks(tasks);
  else {
    for (let task of tasks)
      task();
  }
}

export function patchDefaultAction(event) {
  event.customDefaultActions = [];              //todo weakmaps outside of the event object, so they cannot be manipulated.
  event.preventDefaults = new Set();
  //patch the post propagation callback for processing the default action
  const lastNode = lastPropagationTarget(event);
  let async = false;                           //patch the async property of the native event
  Promise.resolve().then(() => async = true);
  lastNode.addEventListener(event.type, runDefaultActions, {unstoppable: true, last: true, once: true});
}

export function downgradeDefaultAction() {
  delete Event.prototype.addDefault;
  Object.defineProperty(Event.prototype, "preventDefault", preventDefaultOG);
  Object.defineProperty(Event.prototype, "defaultPrevented", defaultPreventedOG);
}

//todo make this based on the event.composedPathContexts()
function findAllTheElementsInTheShadowOfElement(target, path) {
  path = path.slice(0, path.indexOf(target) - 1); //this would be the shadowRoot and below. closed-mode would break it.
  if (!path.length)
    return path;
  let shadowRoot = path[path.length - 1];
  if (!(shadowRoot instanceof ShadowRoot))
    return [];
  let shadows = 0;
  for (let i = path.length - 2; i >= 0; i--) {
    const pathElement = path[i];
    if (pathElement instanceof ShadowRoot)
      shadows++;
    if (pathElement instanceof HTMLSlotElement && shadows === 0)
      return path.slice(i);
    if (pathElement instanceof HTMLSlotElement)
      shadows--;
  }
  return path;
}


/**
 * defaultPrevented gives a snapshot to see if the event has been stopped in this or a higher DOM context.
 * The problem is if you are calling preventDefault inside a slotted DOM context.
 * Should this preventDefault() apply to the flattenedDOM? or should it only apply to the slotted DOM context?
 *
 * The .preventDefault() should be slotted as well, that is it should work on slotted default actions.
 * The reasons for this are:
 * 1. It is no problem to use other means to avoid adding a default action inside the
 * slotted context by simply "not adding" the default action in certain circumstances.
 * 2. If you have a slot-matroschka that you want to disable the default action of the inner slot in the dom context
 * of the outer slot, then you should use a property on the inner slotting element to disable the default action,
 * instead of calling preventDefault().
 * 3. There is no other way than using preventDefault() to have a html element filter out default actions coming into its
 * slotted context. Leaving the preventDefault to function in the flattened DOM context provides a mechanism for those
 * usecases.
 *
 * The problem with using a property, is that it is not a "once" property, but it is sticky, it might stay with the element
 * longer than is intended, and requires the element that needs to "once" disable the default action to queue a function
 * call that will remove the disabled marker again.
 *
 * maybe we need a .preventDefault(scoped) or .preventDefault(slottedOnly).
 *
 * body                                                1. main
 *   my-a[disabled]                                    1. main
 *     #shadowRoot                                     2. my-a
 *       <div>         .preventDefault()               2. my-a
 *         <slot>                         defAct       2. my-a
 *           <checkbox                    defAct       1. main
 *
 *
 * <body                                               1. main
 *   <ivar-a[disabled]                                 1. main
 *     #shadowRoot                                     11. ivar-a
 *       <div>                                         11. ivar-a
 *         <max-a[disabled]                            11. ivar-a
 *           #shadowRoot                               111. max-a
 *             <div>                                   111. max-a
 *               <slot>                  defAct        111. max-a
 *                 <slot>                defAct        11. ivar-a
 *                   <checkbox           defAct        1. main
 *
 *
 * <body                                               1.   body                                 defaultAction
 *   <ivar-a                                           1.   body
 *     #shadowRoot                                     11.  #ivar-a           ..preventDefault
 *       <div>                                         11.  #ivar-a           ..preventDefault
 *         <max-a                                      11.  #ivar-a           .preventDefault
 *           #shadowRoot                               111. #max-a            ...preventDefault
 *             <div>                                   111. #max-a            ...preventDefault
 *               <slot>                  defAct        111. #max-a            ...preventDefault
 *                 <slot>                defAct        11.  #ivar-a           ..preventDefault
 *                   <my-checkbox                      1.   body
 *                     #shadowRoot                     12.  #my-checkbox
 *                       <div             defAct       12.  #my-checkbox
 */

/**
 *   path                  prevents   actions
 *   ---------------------------------------------------
 * window
 *   #document
 *     body
 *       a href                       func
 *         web-comp
 *           #shadow        true
 *             details                func
 *               summary
 */