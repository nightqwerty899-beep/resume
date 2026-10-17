(() => {
  "use strict";
  const p = window.PROFILE;
  if (!p) return;
  const $ = (id) => document.getElementById(id);
  const put = (id, value) => {
    $(id).textContent = value || "";
  };

  function webUrl(value) {
    try {
      const u = new URL(value);
      return ["https:", "http:"].includes(u.protocol) ? u.href : "";
    } catch {
      return "";
    }
  }
  function externalLink(node, value) {
    const url = webUrl(value);
    if (url) node.href = url;
    else node.hidden = true;
  }
  document.title = `${p.fullName} · ${p.direction}`;
  document.querySelector('meta[name="description"]').content =
    `${p.fullName}. ${p.direction}. Образование, опыт и контакты.`;
  put(
    "initials",
    p.fullName
      .replace(/[\[\]]/g, "")
      .split(/\s+/)
      .slice(0, 2)
      .map((s) => s[0] || "")
      .join(""),
  );
  const hero = $("hero-name");
  hero.replaceChildren();
  (p.displayName.length ? p.displayName : [p.fullName]).forEach((line, index, lines) => {
    const span = document.createElement("span");
    span.className = "name-line";
    span.textContent = line;
    if (index === lines.length - 1) {
      const dot = document.createElement("span");
      dot.className = "orange";
      dot.textContent = ".";
      span.append(dot);
    }
    hero.append(span);
  });
  [
    ["direction", p.direction],
    ["intro", p.intro],
    ["about-text", p.about],
    ["location", p.city],
    ["availability", p.availability],
    ["availability-short", p.availabilityShort],
    ["work-format", p.workFormat],
    ["contact-note", p.contactNote],
    ["footer-name", p.fullName],
    ["year", new Date().getFullYear()],
  ].forEach(([id, value]) => put(id, value));
  p.skills.forEach((skill) => {
    const node = document.createElement("span");
    node.className = "skill";
    node.textContent = skill;
    $("skills").append(node);
  });
  function text(tag, content, className) {
    const el = document.createElement(tag);
    el.textContent = content || "";
    if (className) el.className = className;
    return el;
  }
  function entry(parent, period) {
    const article = document.createElement("article");
    article.className = "entry";
    const body = document.createElement("div");
    article.append(text("div", period, "entry-period"), body);
    parent.append(article);
    return body;
  }

  function githubRepository(value) {
    if (typeof value !== "string" || !value.trim()) return null;
    try {
      const url = new URL(value.trim());
      if (
        url.protocol !== "https:" ||
        url.hostname !== "github.com" ||
        url.username ||
        url.password ||
        url.port
      )
        return null;
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts.length < 2) return null;
      const [owner, rawName] = parts;
      const name = rawName.replace(/\.git$/i, "");
      if (
        !/^[a-z\d](?:[a-z\d-]*[a-z\d])?$/i.test(owner) ||
        !/^[a-z\d_.-]+$/i.test(name) ||
        /^\.+$/.test(name)
      )
        return null;
      return { owner, name, url: `https://github.com/${owner}/${name}` };
    } catch {
      return null;
    }
  }
  const projects = (p.experience || []).map(githubRepository).filter(Boolean);
  projects.forEach((project) => {
    const body = entry($("experience-list"), "GitHub");
    body.append(
      text("h3", project.name),
      text("p", `${project.owner} / ${project.name}`, "entry-company"),
    );
    const link = text("a", "Открыть репозиторий ↗", "entry-link");
    link.href = project.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    body.append(link);
  });
  if (!projects.length)
    $("experience-list").append(text("p", "Проекты пока не добавлены.", "empty-state"));
  p.education.forEach((item) => {
    const body = entry($("education-list"), item.period);
    body.append(
      text("h3", item.school),
      text("p", item.program, "entry-company"),
      text("p", item.details, "entry-description"),
    );
  });
  if (!p.education.length)
    $("education-list").append(
      text("p", "Информация об образовании пока не добавлена.", "empty-state"),
    );
  document.querySelectorAll(".github-link").forEach((link) => externalLink(link, p.github));
  externalLink($("telegram-link"), p.telegram);
  const email = (p.email || "").trim();
  if (email) {
    put("email-link", email);
    $("email-link").href = `mailto:${email}`;
  } else {
    put("email-link", "[Ваша электронная почта]");
    $("copy-email").hidden = true;
  }
  if (p.phone) {
    put("phone-link", p.phone);
    $("phone-link").href = `tel:${p.phone.replace(/[^\d+]/g, "")}`;
  } else $("phone-link").hidden = true;
  $("copy-email").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(email);
      put("copy-status", "Почта скопирована");
    } catch {
      put("copy-status", "Выделите и скопируйте адрес выше");
    }
  });
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  if ("IntersectionObserver" in window && !reduce.matches) {
    document.documentElement.classList.add("motion-ready");
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            observer.unobserve(e.target);
          }
        }),
      { threshold: 0.08 },
    );
    document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
  }

  const canvas = $("sculpture"),
    visual = $("visual");
  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: true,
    premultipliedAlpha: false,
  });
  if (!gl) {
    visual.classList.add("no-webgl");
    return;
  }
  const vertexSource = `
    attribute vec3 aPosition;
    attribute vec3 aNormal;
    uniform mat4 uProjection;
    uniform mat4 uModel;
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main(){
      vec4 world=uModel*vec4(aPosition,1.0);
      vPosition=world.xyz;
      vNormal=mat3(uModel)*aNormal;
      gl_Position=uProjection*world;
    }
  `;
  const fragmentSource = `
    precision mediump float;
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main(){
      vec3 n=normalize(vNormal);
      vec3 eye=normalize(-vPosition);
      vec3 key=normalize(vec3(-3.,5.,5.));
      vec3 fill=normalize(vec3(4.,1.,2.));
      float d=max(dot(n,key),0.);
      float f=max(dot(n,fill),0.);
      float spec=pow(max(dot(n,normalize(key+eye)),0.),42.);
      float broad=pow(max(dot(n,normalize(fill+eye)),0.),9.);
      float edge=pow(1.-max(dot(n,eye),0.),3.);
      vec3 base=vec3(.19,.215,.18);
      vec3 color=base*(.28+d*.95)+vec3(.79,.81,.74)*spec*.85;
      color+=vec3(.28,.32,.27)*broad*.35;
      color+=vec3(.80,.26,.10)*pow(max(dot(n,normalize(vec3(3.,-2.,0.))),0.),4.)*.55;
      color+=vec3(.48,.52,.45)*edge*.3;
      gl_FragColor=vec4(pow(color,vec3(.85)),1.);
    }
  `;
  function shader(type, source) {
    const s = gl.createShader(type);
    gl.shaderSource(s, source);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  let program;
  try {
    program = gl.createProgram();
    gl.attachShader(program, shader(gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(program, shader(gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("WebGL link");
  } catch {
    visual.classList.add("no-webgl");
    return;
  }
  gl.useProgram(program);
  const norm = (v) => {
    const l = Math.hypot(...v) || 1;
    return v.map((x) => x / l);
  };
  const cross = (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
  const center = (t) => {
    const r = 1.12 + 0.38 * Math.cos(3 * t);
    return [r * Math.cos(2 * t), r * Math.sin(2 * t), 0.55 * Math.sin(3 * t)];
  };
  const vertices = [],
    normals = [],
    indices = [];
  const segments = 240,
    sides = 28,
    radius = 0.255;
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2,
      c = center(t),
      next = center(t + 0.001);
    const tangent = norm(next.map((v, j) => v - c[j]));
    const normal = norm(cross(tangent, [0, 0, 1]));
    const binormal = norm(cross(tangent, normal));
    for (let j = 0; j <= sides; j++) {
      const angle = (j / sides) * Math.PI * 2;
      const n = normal.map((v, k) => v * Math.cos(angle) + binormal[k] * Math.sin(angle));
      vertices.push(...c.map((v, k) => v + radius * n[k]));
      normals.push(...n);
      if (i < segments && j < sides) {
        const a = i * (sides + 1) + j,
          b = a + sides + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }
  function attribute(name, data) {
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, name);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, 0, 0);
  }
  attribute("aPosition", vertices);
  attribute("aNormal", normals);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
  const projection = gl.getUniformLocation(program, "uProjection"),
    model = gl.getUniformLocation(program, "uModel");
  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0, 0, 0, 0);
  function multiply(a, b) {
    const out = new Float32Array(16);
    for (let c = 0; c < 4; c++)
      for (let r = 0; r < 4; r++)
        for (let k = 0; k < 4; k++) out[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
    return out;
  }
  let pointerX = 0,
    pointerY = 0,
    rx = 0.45,
    ry = -0.35;
  visual.addEventListener("pointermove", (e) => {
    if (reduce.matches) return;
    const r = visual.getBoundingClientRect();
    pointerX = (e.clientX - r.left) / r.width - 0.5;
    pointerY = (e.clientY - r.top) / r.height - 0.5;
  });
  visual.addEventListener("pointerleave", () => {
    pointerX = 0;
    pointerY = 0;
  });
  let frameId = 0,
    active = true,
    lastTime = null,
    elapsed = 0;
  function render(now) {
    frameId = 0;
    if (!active || document.hidden) {
      lastTime = null;
      return;
    }
    if (lastTime !== null && !reduce.matches) elapsed += Math.min(now - lastTime, 50) / 1000;
    lastTime = now;
    const width = Math.max(canvas.clientWidth, 1),
      height = Math.max(canvas.clientHeight, 1),
      dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    const ratio = width / height,
      f = 1 / Math.tan((35 * Math.PI) / 360),
      near = 0.1,
      far = 100;
    gl.uniformMatrix4fv(
      projection,
      false,
      new Float32Array([
        f / ratio,
        0,
        0,
        0,
        0,
        f,
        0,
        0,
        0,
        0,
        (far + near) / (near - far),
        -1,
        0,
        0,
        (2 * far * near) / (near - far),
        0,
      ]),
    );
    rx += (0.5 + pointerY * 0.35 - rx) * 0.045;
    ry += (-0.35 + pointerX * 0.5 - ry) * 0.045;
    const x = rx + elapsed * 0.075,
      y = ry + elapsed * 0.1,
      z = -0.2;
    const cx = Math.cos(x),
      sx = Math.sin(x),
      cy = Math.cos(y),
      sy = Math.sin(y),
      cz = Math.cos(z),
      sz = Math.sin(z);
    const mx = [1, 0, 0, 0, 0, cx, sx, 0, 0, -sx, cx, 0, 0, 0, 0, 1];
    const my = [cy, 0, -sy, 0, 0, 1, 0, 0, sy, 0, cy, 0, 0, 0, 0, 1];
    const mz = [cz, sz, 0, 0, -sz, cz, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    const m = multiply(multiply(my, mx), mz);
    m[13] = 0.06;
    m[14] = ratio < 0.85 ? -7.4 : -6.8;
    gl.uniformMatrix4fv(model, false, m);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
    if (!reduce.matches) frameId = requestAnimationFrame(render);
  }
  function requestFrame() {
    if (!frameId && active && !document.hidden) frameId = requestAnimationFrame(render);
  }
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      (entries) => {
        active = entries[0].isIntersecting;
        if (active) requestFrame();
        else {
          cancelAnimationFrame(frameId);
          frameId = 0;
          lastTime = null;
        }
      },
      { rootMargin: "80px" },
    ).observe(canvas);
  }
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelAnimationFrame(frameId);
      frameId = 0;
      lastTime = null;
    } else requestFrame();
  });
  window.addEventListener("resize", requestFrame);
  reduce.addEventListener("change", () => {
    lastTime = null;
    requestFrame();
  });
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    cancelAnimationFrame(frameId);
    visual.classList.add("no-webgl");
  });
  requestFrame();
})();
