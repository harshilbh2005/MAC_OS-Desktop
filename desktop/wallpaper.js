// Live wallpaper. A WebGL shader paints glowing ribbons of silk, one pixel at a time,
// sixty times a second, in the style of the newest macOS wallpapers.

const SHADER = `
precision highp float;
uniform vec2 size;
uniform float time;

// The colour of a ribbon, from the back (0.0) to the front (1.0)
vec3 tint(float k) {
  vec3 indigo = vec3(0.32, 0.30, 0.95);
  vec3 blue = vec3(0.10, 0.42, 1.00);
  vec3 cyan = vec3(0.35, 0.85, 1.00);
  vec3 navy = vec3(0.05, 0.12, 0.45);
  if (k < 0.33) return mix(indigo, blue, k / 0.33);
  if (k < 0.66) return mix(blue, cyan, (k - 0.33) / 0.33);
  return mix(cyan, navy, (k - 0.66) / 0.34);
}

void main() {
  vec2 uv = gl_FragCoord.xy / size;   // 0,0 is bottom left, 1,1 is top right
  float x = uv.x * size.x / size.y;
  float t = time * 0.05;

  // The dark night behind the ribbons
  vec3 color = mix(vec3(0.0, 0.01, 0.05), vec3(0.01, 0.04, 0.14), uv.y);

  for (int i = 0; i < 6; i++) {
    float n = float(i);
    float k = n / 5.0;

    // Where the top edge of this ribbon is
    float edge = 0.78 - k * 0.42 + 0.22 * (x - 0.8) * (1.0 - k * 0.4)
      + 0.10 * sin(x * (1.6 + k * 0.5) + n * 2.1 + t * (1.0 + k))
      + 0.03 * sin(x * 4.0 - n * 1.3 - t * 1.7);
    float d = edge - uv.y;   // more than 0 means we are inside the ribbon

    // A soft shadow on the ribbons behind it
    float shadow = (1.0 - smoothstep(0.0, 0.25, -d)) * step(d, 0.0);
    color *= 1.0 - 0.45 * shadow;

    // The ribbon: see-through silk with a bright line of light along its edge
    vec3 c = tint(k);
    vec3 silk = c * 0.55 * exp(-d * 4.5) + c * 0.08;
    silk += mix(c, vec3(1.0), 0.6) * 0.9 * exp(-d * 90.0);
    color = mix(color, silk + color * 0.25, smoothstep(0.0, 0.002, d));

    // A faint glow around the edge
    color += c * 0.12 * exp(-abs(d) * 30.0);
  }

  // Darker corners and a little film grain
  color *= 1.0 - 0.3 * length(uv - vec2(0.5, 0.6));
  color += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.025;
  gl_FragColor = vec4(color, 1.0);
}`;

const canvas = document.getElementById("wallpaper");
const gl = canvas.getContext("webgl");

function compile(type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
}

const program = gl.createProgram();
gl.attachShader(program, compile(gl.VERTEX_SHADER,
  "attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }"));
gl.attachShader(program, compile(gl.FRAGMENT_SHADER, SHADER));
gl.linkProgram(program);
gl.useProgram(program);

// One big triangle that covers the whole screen
gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

const sizeSlot = gl.getUniformLocation(program, "size");
const timeSlot = gl.getUniformLocation(program, "time");

function paint(ms) {
  const width = Math.round(innerWidth * devicePixelRatio);
  const height = Math.round(innerHeight * devicePixelRatio);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
    gl.viewport(0, 0, width, height);
  }
  gl.uniform2f(sizeSlot, width, height);
  gl.uniform1f(timeSlot, ms / 1000);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  requestAnimationFrame(paint);
}

requestAnimationFrame(paint);
