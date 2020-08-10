const contexts = new WeakMap();

function makeContext(path) {
  const res = new Array(path.length);
  res[res.length - 1] = path[path.length - 1];
  const roots = [];
  for (let i = path.length - 2; i >= 0; i--) {
    const pathElement = path[i];
    if (pathElement instanceof shadowRoot) {
      res[i] = pathElement;
      roots.push(pathElement)
      continue;
    }
    res[i] = roots[roots.length-1];
    if (i > 0 && pathElement instanceof HTMLSlotElement && pathElement.assignedNodes().indexOf(path[i + 1]) >= 0)
      roots.pop();
  }
  return res;
}

function getContext(path) {
  const cache = contexts.get(path);
  if (cache)
    return cache;
  const contexts = makeContext(path);
  contexts.set(path, contexts);
  return contexts;
}

/**
 * .domContext(composedPath, target) is a function that returns the domContext node of an event target in a
 * composedPath/propagation path at the time the event was called.
 *
 * As event target nodes can be moved around the DOM during event propagation, it would be
 *
 *
 * To know the DOM context of an event, we cannot use the .getRootNode() of the nodes in the composedPath()
 * as the nodes might be moved in the DOM. We must therefore use the structure of the composedPath() in itself,
 * as this is the only structure preserved in the DOM.
 *
 * But. There is an edge case that the composedPath() doesn't cover.
 * Two identical composedPath()s can arise from two different DOM compositions:
 * it is not possible to distinguish between elements that are slotted into a dom or elements that are the
 * fallback nodes of a slot, by looking at the composedPath() data alone. You would need to check the assigned
 * nodes of the slot element/the assigned slot of the fallback node/slotted node, to see if they are empty or
 * set.
 *
 * But-but. If the fallback nodes are moved out into the slotted position during event propagation. Or if
 * the slotted elements are moved into the shadowDOM and set as new fallback nodes, then the original state of
 * the assignedSlot and assignedNodes() are overwritten. This edge case, slotted-becomes-fallback-or-vice-versa, cannot fully be patched.
 *
 * We therefore use the structure of the composedPath() and look at the assignedNodes() when a <slot> element
 * arise, and assume that no event listener has performed a slotted-becomes-fallback-or-vice-versa dom manipulation
 * before we have had a chance to set the context correctly.
 */
export function domContext(path, target) {
  const context = getContext(path);
  return context[path.indexOf(target)];
}