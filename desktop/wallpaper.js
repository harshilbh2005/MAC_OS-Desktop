// Live wallpaper. A WebGL shader paints soft waves of silk, one pixel at a time,
// sixty times a second. Each wave has a glowing edge and drops a shadow on the next.

const SHADER = `
precision highp float;
uniform vec2 size;
uniform float time;

// The colour of a wave, from the back (0.0) to the front (1.0)
vec3 tint(float k) {
  vec3 plum = vec3(0.22, 0.04, 0.22);
  vec3 berry = vec3(0.70, 0.08, 0.24);
  vec3 red = vec3(0.93, 0.26, 0.10);
  vec3 orange = vec3(1.00, 0.56, 0.16);
  if (k < 0.33) return mix(plum, berry, k / 0.33);
  if (k < 0.66) return mix(berry, red, (k - 0.33) / 0.33);
  return mix(red, orange, (k - 0.66) / 0.34);
}

void main() {
  vec2 uv = gl_FragCoord.xy / size;   // 0,0 is bottom left, 1,1 is top right
  float x = uv.x * size.x / size.y;
  float t = time * 0.06;

  // The night sky behind the waves
  vec3 color = mix(vec3(0.02, 0.05, 0.16), vec3(0.16, 0.03, 0.14), uv.x * 0.6 + (1.0 - uv.y) * 0.5);

  for (int i = 0; i < 7; i++) {
    float n = float(i);
    float k = n / 6.0;

    // Where the top edge of this wave is
    float edge = 1.0 - k * 0.66 + 0.14 * (x - 0.8)
      + 0.13 * sin(x * (1.3 + k * 0.6) + n * 1.7 + t * (1.0 + k))
      + 0.05 * sin(x * 3.3 - n * 2.1 - t * 1.3);
    float d = edge - uv.y;   // more than 0 means we are inside the wave

    // A soft shadow on the waves behind it
    float shadow = (1.0 - smoothstep(0.0, 0.2, -d)) * step(d, 0.0);
    color = mix(color, vec3(0.12, 0.0, 0.08), 0.6 * shadow);

    // The wave: bright along its edge, darker deeper in, lit from the left
    vec3 wave = tint(k) * (0.5 + 0.5 * exp(-d * 3.0)) * (0.8 + 0.35 * (1.0 - uv.x));
    wave += vec3(1.0, 0.78, 0.45) * 0.45 * exp(-d * 45.0);
    color = mix(color, wave, smoothstep(0.0, 0.002, d));
  }

  // Darker corners and a little film grain
  color *= 1.0 - 0.35 * length(uv - 0.5);
  color += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.03;
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
