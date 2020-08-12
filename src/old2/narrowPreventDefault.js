nativePreventDefault = Event.prototype.preventDefault;
nativePreventDefaultSettings = Object.getOwnPropertyDescriptor(Event.prototype, "preventDefault");

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
 * To avoid the PreventDefaultBomb, that is that a call to preventDefault from inside a web component,
 * takes control of the event and override the choices of the document in which the web component is used's choices,
 * all calls to .preventDefault() from within a web component should more precisely specify which node it targets.
 * This is called a "narrow preventDefault(target)". The narrow preventDefault() only cancels defaultActions associated
 * with that particular node AND all elements directly under that elements shadowDOM (ie. all elements that are part of
 * that element recursively, except elements slotted into the element from the above context or any fallback nodes for
 * the topmost shadowRoot (because they are simply indistinguishable).
 *
 * @param target
 */
function narrowPreventDefault(target) {
  if (this.listOfNarrowPreventDefaults === undefined)
    ;//patchTheEvent post propagation call
  if (this.listOfNarrowPreventDefaults === true) //no point in bombing the same place twice..
    return;
  if (!target) {                                 //bombs away!
    this.listOfNarrowPreventDefaults = true;
    nativePreventDefault.call(this);
    return;
  }
  this.listOfNarrowPreventDefaults.add(target);  //register needle pricks
  const shadowElements = findAllTheElementsInTheShadowOfElement(target, this.composedPath());
  for (let shadowElement of shadowElements)
    this.preventDefault(shadowElement);
}

Object.defineProperty(Event.prototype, "preventDefault", {value: narrowPreventDefault});