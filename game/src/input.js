// HIGHWATER — keyboard + mouse input. The live input reads the canvas;
// the scripted input is a stand-in the autopilot drives (it never touches
// the DOM, so the soak and the screenshot staging share the same sim).
export function createInput(canvas) {
  const input = {
    keys: {},
    pressed: {},
    mouseX: 640,
    mouseY: 360,
    mouseDown: false,
    clicked: null, // {x, y} consumed once per frame
    wheel: 0,
  };
  const rectOf = () => canvas.getBoundingClientRect();
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    input.keys[e.code] = true;
    input.pressed[e.code] = true;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => {
    input.keys[e.code] = false;
  });
  canvas.addEventListener('mousemove', (e) => {
    const r = rectOf();
    input.mouseX = ((e.clientX - r.left) / r.width) * 1280;
    input.mouseY = ((e.clientY - r.top) / r.height) * 720;
  });
  canvas.addEventListener('mousedown', (e) => {
    const r = rectOf();
    input.mouseX = ((e.clientX - r.left) / r.width) * 1280;
    input.mouseY = ((e.clientY - r.top) / r.height) * 720;
    input.mouseDown = true;
    input.clicked = { x: input.mouseX, y: input.mouseY };
  });
  window.addEventListener('mouseup', () => {
    input.mouseDown = false;
  });
  input.endFrame = () => {
    input.pressed = {};
    input.clicked = null;
    input.wheel = 0;
  };
  input.wasPressed = (code) => !!input.pressed[code];
  return input;
}

export function createScriptedInput() {
  const input = {
    keys: {},
    pressed: {},
    mouseX: 640,
    mouseY: 360,
    mouseDown: false,
    clicked: null,
    wheel: 0,
    endFrame() {
      input.pressed = {};
      input.clicked = null;
    },
    wasPressed() {
      return false;
    },
  };
  return input;
}
