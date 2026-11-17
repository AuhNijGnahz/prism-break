// PRISM BREAK — player input: mouse position, arrow/A-D keys, and the discrete
// actions (launch, pause, confirm). Keyboard state is polled by the game loop;
// actions are edge-triggered events the main module subscribes to.

export function createInput(canvas) {
  const keys = { left: false, right: false };
  const handlers = { launch: [], pause: [], confirm: [] };
  let mouseX = null;

  function toFieldX(clientX) {
    const rect = canvas.getBoundingClientRect();
    return ((clientX - rect.left) / rect.width) * canvas.width;
  }

  canvas.addEventListener('mousemove', (e) => { mouseX = toFieldX(e.clientX); });
  canvas.addEventListener('mousedown', (e) => {
    mouseX = toFieldX(e.clientX);
    fire('launch');
  });
  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length > 0) mouseX = toFieldX(e.touches[0].clientX);
    fire('launch');
  }, { passive: true });
  canvas.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) mouseX = toFieldX(e.touches[0].clientX);
  }, { passive: true });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') { keys.left = true; e.preventDefault(); }
    if (e.code === 'ArrowRight' || e.code === 'KeyD') { keys.right = true; e.preventDefault(); }
    if (e.code === 'Space') { fire('launch'); e.preventDefault(); }
    if (e.code === 'Enter') fire('confirm');
    if (e.code === 'KeyP' || e.code === 'Escape') fire('pause');
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
  });
  window.addEventListener('blur', () => { keys.left = false; keys.right = false; });

  function fire(name) {
    for (const fn of handlers[name]) fn();
  }

  return {
    keys,
    get mouseX() { return mouseX; },
    on(name, fn) { handlers[name].push(fn); },
  };
}
