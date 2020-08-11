# Problem: HostNodeTorpedo 

A HostNodeTorpedo is a `.stopPropagation()` call made on a host node. The host node must have a shadowDOM. And the event listener that calls `stopPropagation()` must be added in the capture phase.

Calls to `.stopImmediatePropagation()` is not affected by HostNodeTorpedoes.

## Problem: bubble phase event listeners sometimes run, sometimes not.
                
When:
1. a capture-phase event listener calls `stopPropagation()`
2. on a host node with a shadowDOM, and
3. the host node also has bubble-phase event listeners for the same event type, then depending on the innermost `target` of the event, the bubble-phase event listeners will either run or not run.

If the innermost `target` of the event is the host node itself, then all event listeners will run.
However, if the innermost `target` of the event is a node inside the shadowDOM of the host node, then the bubble-phase event listeners will not run. 

For all event instances, the `.eventPhase === 2` and `.target` will equal the host node for any event listener added in the lightDOM context around the host node.
 
If the host node is in `mode: "closed"`, then even the `.composedPath()` will be identical in both instances, and there would be no way to distinguish between the different scenarios.

Hehehe, try finding those bugs, I dare ya! ;) 

## Demo: HostNodeTorpedo

```html
<closed-comp></closed-comp>

<script>
  (function () {

    class ClosedComp extends HTMLElement {
      constructor() {
        super();
        const shadow = this.attachShadow({mode: "closed"});
        shadow.innerHTML = `<span>Hello</span> sunshine!`;
        this._hello = shadow.children[0];
      }
    }
    customElements.define("closed-comp", ClosedComp);

    const closedComp = document.querySelector("closed-comp");

    closedComp.addEventListener("click", e => console.log("capture listener", e.eventPhase, e.composedPath()), true);
    closedComp.addEventListener("click", e => e.stopPropagation(), true);
    closedComp.addEventListener("click", e => console.log("bubble listener", e.eventPhase, e.composedPath()));

    closedComp._hello.click();  //yields only one event listener, as the target phase is not really true
    console.log("---")
    closedComp.click();         //yields two event listeners, as the target phase is handled as such
  })();
</script>
```

## Solution: Don't call `.stopPropagation()` in the capture phase

Again, the solution is to avoid calling `stopPropagation()` on events in the capture phase.

## References

 *