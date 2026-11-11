var Qt=Object.defineProperty;var eo=(e,t,n)=>t in e?Qt(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n;var O=(e,t,n)=>eo(e,typeof t!="symbol"?t+"":t,n);import{a as y,j as S}from"./markdown-Dm-6lqqj.js";import{u as ee,a as Z,C as to,T as oo,B as no,P as ao,S as so,b as ro}from"./r3f-BU0ptLta.js";import{r as io,m as Fe,u as _,C as tt,a as lo,f as oe,c as le,b as D,d as K,e as V,L as De,t as G,g as fe,h as Tt,i as Q,n as ae,p as me,j as co,S as $e,k as xe,l as Me,o as I,R as ot,q as qe,s as Ge,v as nt,w as ue,x as _t,Q as be,y as uo,z as he,P as fo,A as J,B as ye,D as at,E as st,F as ho,G as po,H as mo,I as go,J as Pe,K as We,M as vo,N as xo,O as Ce,T as rt,U as Et,V as yo,W as wo,X as bo,Y as So}from"./index-D6-A2pwy.js";import{l as ne,m as E,a6 as Oe,i as se,h as W,V as te,R as Mo,a as zt,t as ko,a7 as Ke,j as Ye,F as jt,G as Ze,a3 as Be,K as It,I as Ao,s as ke,a8 as Fo,a9 as Po,aa as Co,ab as Ae,ac as Ro,ad as To,ae as it,af as lt,ag as _o,ah as Eo,o as zo,J as jo,ai as ct,aj as Io,ak as Dt,al as Gt,N as Do}from"./three-BRWR5OvQ.js";import{E as ut,B as ft,V as dt}from"./r3f-postprocessing-B_lm7v5q.js";const Go=Fe(30*Math.PI/180),Oo=Fe(35*Math.PI/180),Bo=20,ce=[26,22,26],Lo=80;function Le(e,t={}){const n=t.aspect!==void 0&&t.aspect<1?1.45:1;switch(e){case"overview":{const o=228*n,s=[0,48,0],{re:i,im:l}=Go;return{position:[o*i*.5,s[1]+o*l,o*i*.87],target:s}}case"canopy":return{position:[0,150*n,118*n],target:[0,98,0]};case"ground":return{position:[58*n,9,62*n],target:[0,-7,0]};case"follow":{const o=t.point??[0,90,0],s=Math.hypot(o[0],o[2]),i=s>6?[o[0]/s,o[2]/s]:[ce[0]/Math.hypot(ce[0],ce[2]),ce[2]/Math.hypot(ce[0],ce[2])],l=Lo*n;return{position:[o[0]+i[0]*l,o[1]+ce[1],o[2]+i[1]*l],target:o}}case"focus":{const o=t.point??[0,90,0];let s=o[0],i=o[2];const l=Math.hypot(s,i);l<1e-6?(s=1,i=0):(s/=l,i/=l);const[f,r]=io(s,i,Oo),c=.85,g=Math.hypot(f,c,r),d=Bo*n/g;return{position:[o[0]+f*d,o[1]+c*d,o[2]+r*d],target:o}}}}const Uo=e=>e<.5?4*e*e*e:1-Math.pow(-2*e+2,3)/2;function Vo(){const e=y.useRef(null),t=_(a=>a.cameraMode),n=_(a=>a.cameraTarget),o=_(a=>a.settings.reduceMotion),s=ee(a=>a.size.width/Math.max(1,a.size.height)),i=ee(a=>a.size),l=ee(a=>a.camera),f=_(a=>a.chatOpen),r=_(a=>a.panelPaperId!==null),c=ee(a=>a.clock),g=y.useRef(!0),d=y.useRef({from:0,to:0,value:0,start:0,duration:tt}),h=y.useRef({chatOpen:!1,panelOpen:!1});y.useEffect(()=>{const a=i.width,x=f?Math.min(520,Math.max(340,a*.32))+12:0,p=r?Math.max(320,Math.min(420,a*.34))+12:0,v=a<768?0:(x-p)/2,b=h.current,w=b.chatOpen!==f,m=b.panelOpen!==r;h.current={chatOpen:f,panelOpen:r};const M=d.current;if(o||!w&&!m){Object.assign(M,{from:v,to:v,value:v});return}Object.assign(M,{from:M.value,to:v,start:c.elapsedTime+(w?lo:0),duration:w?tt:.5})},[i.width,f,r,o,c]);const u=y.useRef({value:NaN,w:0,h:0});return Z(()=>{const a=d.current;if(a.value!==a.to){const b=Math.min(1,Math.max(0,(c.elapsedTime-a.start)/a.duration));a.value=b>=1?a.to:a.from+(a.to-a.from)*Uo(b)}const{width:x,height:p}=i,v=u.current;v.value===a.value&&v.w===x&&v.h===p||(Object.assign(v,{value:a.value,w:x,h:p}),Math.abs(a.value)<.5?l.clearViewOffset():l.setViewOffset(x,p,-a.value,0,x,p),l.updateProjectionMatrix())}),y.useEffect(()=>{const a=e.current;if(!a||t==="follow")return;const x=Le(t,{point:n,aspect:s});a.setLookAt(...x.position,...x.target,!o&&!g.current),g.current=!1},[t,n,o,s]),Z(()=>{const a=e.current;if(!a||t!=="follow")return;const x=Le("follow",{point:oe.active?oe.position:n,aspect:s});a.setLookAt(...x.position,...x.target,!o)}),S.jsx(to,{ref:e,makeDefault:!0,minDistance:2.5,maxDistance:520,smoothTime:t==="follow"?.9:1.15,draggingSmoothTime:.12,maxPolarAngle:Math.PI*.62})}const re={comparing:2,topK:3,focused:4};function ie(e){const t=e.replace("#","").slice(0,6),n=parseInt(t.length===3?t.replace(/./g,o=>o+o):t,16);return[(n>>16&255)/255,(n>>8&255)/255,(n&255)/255]}function Ot(e){let t=(e|0)+2654435769;return t=Math.imul(t^t>>>16,2246822507),t=Math.imul(t^t>>>13,3266489909),t^=t>>>16,(t>>>0)/4294967296}function No(e){const t=Math.min(1,Math.max(0,e));return .6+(1.8-.6)*Math.sqrt(t)}function Ue(e,t,n=new Float32Array(e.positions.length),o=0){const s=new Map;for(let i=o;i<e.count;i++){const l=e.categories[i];let f=s.get(l);f||(f=ie(le(l,t)),s.set(l,f)),n[i*3]=f[0],n[i*3+1]=f[1],n[i*3+2]=f[2]}return n}function Ho(e,t){const n=e.positions.length/3,o={position:e.positions,color:Ue(e,t,new Float32Array(n*3)),size:new Float32Array(n),phase:new Float32Array(n),state:new Float32Array(n),year:new Float32Array(n)};return Bt(e,o,0),o}function Bt(e,t,n){for(let o=n;o<e.count;o++)t.size[o]=No(e.authority[o]),t.phase[o]=Ot(o),t.year[o]=e.years[o]}function $o(e,t,n){const o=[];if(t)for(let s=0;s<t.length;s++)e[t[s]]=2;if(n)for(let s=0;s<n.length;s++){const i=n[s];e[i]===2?e[i]=1:e[i]===0&&(e[i]=1,o.push(i))}if(t)for(let s=0;s<t.length;s++){const i=t[s];e[i]===2&&(e[i]=0,o.push(i))}return o}function qo(e,t,n){const o=[];for(const s of t.keys())!n.has(s)&&s>=0&&s<e.length&&e[s]!==0&&(e[s]=0,o.push(s));for(const[s,i]of n)s<0||s>=e.length||e[s]===i||(e[s]=i,o.push(s));return o}function Lt(e,t=512,n=32){if(e.length===0)return[];const o=Int32Array.from(e).sort();let s=[],i=o[0],l=o[0];for(let f=1;f<o.length;f++){const r=o[f];r-l<=t?l=r:(s.push([i,l-i+1]),i=l=r)}return s.push([i,l-i+1]),s.length>n&&(s=[[o[0],o[o.length-1]-o[0]+1]]),s}function Wo(e,t=3){const n=e.length/3,o=[1/0,1/0,1/0],s=[-1/0,-1/0,-1/0];for(let h=0;h<n;h++)for(let u=0;u<3;u++){const a=e[h*3+u];a<o[u]&&(o[u]=a),a>s[u]&&(s[u]=a)}n===0&&(o.fill(0),s.fill(0));const i=[0,1,2].map(h=>Math.max(1,Math.floor((s[h]-o[h])/t)+1)),l=i[0]*i[1]*i[2],f=new Uint32Array(n),r=new Uint32Array(l+1);for(let h=0;h<n;h++){const u=Math.min(i[0]-1,Math.floor((e[h*3]-o[0])/t)),a=Math.min(i[1]-1,Math.floor((e[h*3+1]-o[1])/t)),p=(Math.min(i[2]-1,Math.floor((e[h*3+2]-o[2])/t))*i[1]+a)*i[0]+u;f[h]=p,r[p+1]++}for(let h=0;h<l;h++)r[h+1]+=r[h];const c=r,g=c.slice(0,l),d=new Uint32Array(n);for(let h=0;h<n;h++)d[g[f[h]]++]=h;return{cellSize:t,min:o,dims:i,start:c,items:d,positions:e,stamp:new Uint32Array(l),query:0}}function Ko(e,t,n,o,s,i,l){l.length=0,++e.query===4294967295&&(e.stamp.fill(0),e.query=1);const f=e.query,r=e.cellSize,[c,g,d]=n,h=o;let u=Math.max(0,s),a=i;for(let F=0;F<3;F++){const T=t[F],A=n[F],P=e.min[F]-h,R=e.min[F]+e.dims[F]*r+h;if(Math.abs(A)<1e-12){if(T<P||T>R)return l;continue}let j=(P-T)/A,z=(R-T)/A;if(j>z&&([j,z]=[z,j]),u=Math.max(u,j),a=Math.min(a,z),u>a)return l}const x=Math.ceil(o/r),p=o*o,v=e.positions,b=(F,T,A)=>{for(let P=A-x;P<=A+x;P++)if(!(P<0||P>=e.dims[2])){for(let R=T-x;R<=T+x;R++)if(!(R<0||R>=e.dims[1]))for(let j=F-x;j<=F+x;j++){if(j<0||j>=e.dims[0])continue;const z=(P*e.dims[1]+R)*e.dims[0]+j;if(e.stamp[z]!==f){e.stamp[z]=f;for(let N=e.start[z];N<e.start[z+1];N++){const B=e.items[N],U=v[B*3]-t[0],H=v[B*3+1]-t[1],$=v[B*3+2]-t[2],q=Math.max(0,U*c+H*g+$*d),X=U-c*q,ge=H-g*q,Qe=$-d*q,et=X*X+ge*ge+Qe*Qe;et>p||q<s||q>i||l.push({index:B,distance:q,distanceToRay:Math.sqrt(et)})}}}}},w=[0,0,0],m=[0,0,0],M=[0,0,0],k=[0,0,0];for(let F=0;F<3;F++){const T=t[F]+n[F]*u;w[F]=Math.min(e.dims[F]-1,Math.max(0,Math.floor((T-e.min[F])/r))),n[F]>0?(m[F]=1,M[F]=u+(e.min[F]+(w[F]+1)*r-T)/n[F],k[F]=r/n[F]):n[F]<0?(m[F]=-1,M[F]=u+(e.min[F]+w[F]*r-T)/n[F],k[F]=-r/n[F]):(m[F]=0,M[F]=1/0,k[F]=1/0)}let C=u;for(let F=0;F<4096&&C<=a;F++){b(w[0],w[1],w[2]);const T=M[0]<M[1]?M[0]<M[2]?0:2:M[1]<M[2]?1:2;if(C=M[T],M[T]+=k[T],w[T]+=m[T],w[T]<-x||w[T]>=e.dims[T]+x)break}return l}function Yo(e,t,n,o,s,i,l,f,r){const c=i*i;for(let g=t;g<n;g++){const d=e[g*3]-o[0],h=e[g*3+1]-o[1],u=e[g*3+2]-o[2],a=Math.max(0,d*s[0]+h*s[1]+u*s[2]),x=d-s[0]*a,p=h-s[1]*a,v=u-s[2]*a,b=x*x+p*p+v*v;b>c||a<l||a>f||r.push({index:g,distance:a,distanceToRay:Math.sqrt(b)})}return r}function Zo(e,t){e.sort((i,l)=>i.distance-l.distance);let n=null,o=1/0;const s=Math.min(64,e.length);for(let i=0;i<s;i++){const l=e[i];t(l.index)&&l.distanceToRay<o&&(o=l.distanceToRay,n=l.index)}return n}const Xo=.2,Jo=3,ht=.12,Y={value:0},Ut=e=>ht+(1-ht)*e;function Qo(){const e=_(n=>n.settings.reduceMotion),t=y.useRef(0);return y.useEffect(()=>{Y.value=0},[]),Z((n,o)=>{if(Y.value>=1)return;t.current+=Math.min(o,.1);const s=Math.min(1,Math.max(0,(t.current-Xo)/Jo));Y.value=e?1:s*s*(3-2*s)},-1),null}function pe(e){e.uniforms.uSceneIntro=Y;const t=e.fragmentShader.lastIndexOf("}");return e.fragmentShader=`uniform float uSceneIntro;
${e.fragmentShader.slice(0,t)}  gl_FragColor *= uSceneIntro;
${e.fragmentShader.slice(t)}`,e}const en=`
  attribute vec3 color;
  attribute float size;
  attribute float phase;
  attribute float state;
  attribute float year;
  attribute float inFilter;
  attribute float born;
  uniform float uFilter;
  uniform float uDimRest;
  uniform float uClock;
  uniform float uFootprint;
  uniform float uTime;
  uniform float uScale;
  uniform float uPixelRatio;
  uniform float uMaxYear;
  uniform float uMinPx;
  uniform float uMaxPx;
  uniform float uTwinkle;
  uniform float uSizeMul;
  uniform float uFlower;
  uniform vec3 uSunDir;
  uniform float uSunGlow;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vState;
  varying float vFoot;
  varying float vPhase;
  varying float vGlint;
  varying vec3 vSunV;
  varying float vBack;

  void main() {
    vPhase = phase;
    vGlint = 0.0;
    vSunV = vec3(0.0, 0.0, 1.0);
    vBack = 0.0;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    // Frustum & near-plane culling: prune points behind camera plane
    if (mv.z >= -0.1) {
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      gl_PointSize = 0.0;
      vColor = vec3(0.0);
      vAlpha = 0.0;
      vState = 0.0;
      vFoot = 0.0;
      return;
    }

    vec4 clip = projectionMatrix * mv;
    // Guard-band frustum culling: early out if point center is outside screen bounds
    if (abs(clip.x) > clip.w * 1.25 || abs(clip.y) > clip.w * 1.25) {
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      gl_PointSize = 0.0;
      vColor = vec3(0.0);
      vAlpha = 0.0;
      vState = 0.0;
      vFoot = 0.0;
      return;
    }

    // Filter: points outside the active selection are drawn dimmed unless the overlay set a state.
    float st = state;
    if (st < 0.5 && uFilter > 0.5 && inFilter < 0.5) st = 1.0;
    float s = size * uSizeMul;
    float alpha = 0.9;
    float boost = 0.0;
    float maxPx = uMaxPx;
    if (st > 0.5 && st < 1.5) { alpha = 0.1; s *= 0.65; }
    // Spotlight after a search (eased 0 → 1): plain points fade back, the found ranks keep their boost.
    else if (st < 0.5) { alpha = mix(0.9, 0.08, uDimRest); s *= mix(1.0, 0.6, uDimRest); }
    else if (st > 1.5 && st < 2.5) { s *= 1.7; boost = 0.45; maxPx *= 1.6; }
    else if (st > 2.5 && st < 3.5) { s *= 2.4; boost = 0.7; maxPx *= 2.2; }
    else if (st > 3.5) { s *= 3.0 * (1.0 + 0.18 * sin(uTime * 4.5)); boost = 0.8; maxPx *= 2.8; }
    // Spotlight: the found ranks grow and brighten further while everything else dims.
    if (st > 1.5) { s *= 1.0 + 0.7 * uDimRest; maxPx *= 1.0 + 0.6 * uDimRest; boost += 0.35 * uDimRest; }
    float tw = 1.0;
    if (uTwinkle > 0.05) tw += uTwinkle * 0.18 * sin(uTime * (1.2 + phase) + phase * 6.2831);
    // Flowers: each one catches the sun now and then (a brief star glint, ~5% of the time, own rhythm).
    if (uFlower > 0.5 && uTwinkle > 0.05) {
      float w = sin(uTime * (0.6 + fract(phase * 7.31) * 1.7) + phase * 97.0);
      vGlint = pow(max(w, 0.0), 48.0) * uTwinkle;
      tw += vGlint * 0.3;
    }
    float px = clamp(s * tw * uScale / -mv.z, uMinPx, maxPx) * uPixelRatio;
    if (year > uMaxYear) { px = 0.0; alpha = 0.0; }
    // Papers added by the live crawl pop in (scale 0 → 1 with a small overshoot) at their birth time.
    if (born > 0.0) {
      float g = clamp((uClock - born) / 0.9, 0.0, 1.0);
      if (g <= 0.0) { px = 0.0; alpha = 0.0; }
      else { px *= g * (1.0 + 0.6 * sin(g * 3.14159)); alpha *= min(1.0, g * 2.0); }
    }
    // Big glow sprites overlap and saturate when the camera is close: fade them a little (flowers stay opaque).
    if (st < 1.5 && uFlower < 0.5) alpha *= clamp(10.0 / max(px / uPixelRatio, 1.0), 0.4, 1.0);
    // Halo footprint: the faint tail beyond 80% of the radius is not rasterised (fewer blended
    // fragments into the bloom target); the focused point keeps its full outer ring.
    // Sunlight (flowers): the sun's direction in view space drives the petal highlight, and looking
    // toward the sun lights the petals from behind (translucency), so the crown brightens as it is orbited.
    if (uFlower > 0.5) {
      vSunV = normalize((viewMatrix * vec4(uSunDir, 0.0)).xyz);
      vec3 toPoint = normalize((modelMatrix * vec4(position, 1.0)).xyz - cameraPosition);
      vBack = pow(max(dot(toPoint, uSunDir), 0.0), 5.0) * uSunGlow;
    }
    vFoot = st > 3.5 ? 1.0 : uFootprint;
    gl_PointSize = min(px * vFoot, 48.0 * uPixelRatio);
    gl_Position = clip;
    // Glow dots brighten toward white when ranked; flowers keep their petal color and only grow.
    float lift = boost * (1.0 - uFlower);
    vColor = mix(color, vec3(1.0), lift * 0.35) * (1.0 + lift);
    vAlpha = alpha;
    vState = st;
  }
`,tn=`
  uniform float uGlow;
  uniform float uAlphaCut;
  uniform vec3 uOutlineColor;
  uniform float uOutline;
  uniform float uFlower;
  uniform vec3 uPistil;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vState;
  varying float vFoot;
  varying float vPhase;
  varying float vGlint;
  varying vec3 vSunV;
  varying float vBack;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    if (uFlower > 0.5) {
      // Five-petal flower filling the sprite: petal edge r(a) = 0.42 + 0.56 * |cos(2.5 a)|^0.7.
      float r = length(c) * 2.0;
      if (r > 1.0) discard;
      float a = atan(c.y, c.x) + vPhase * 6.2831;
      float petal = pow(abs(cos(2.5 * a)), 0.7);
      float edge = 0.42 + 0.56 * petal;
      float aa = fwidth(r) * 1.2 + 0.02;
      float body = 1.0 - smoothstep(edge - aa, edge, r);
      // Petal shading: lighter toward the tip, a faint darker vein along each petal's spine.
      vec3 col = vColor * (0.78 + 0.32 * smoothstep(0.15, edge, r));
      col *= 1.0 - 0.18 * petal * smoothstep(0.2, 0.9, r) * (1.0 - smoothstep(0.9, 1.0, petal));
      // Gloss: treat each petal as a shallow satin dome lit by the sun from the upper left
      // (gl_PointCoord's y points down), Blinn-Phong highlight + soft diffuse falloff.
      vec2 q = c * 2.0;
      float rr = clamp(r / edge, 0.0, 1.0);
      vec3 n = normalize(vec3(q * 0.85, sqrt(1.0 - rr * rr) + 0.3));
      // Light comes from the real sun (view space; gl_PointCoord's y points down). When the sun is behind
      // the flower it still grazes the dome from its side, weaker.
      float front = clamp(vSunV.z, 0.0, 1.0);
      vec3 sunL = normalize(vec3(vSunV.x, -vSunV.y, max(vSunV.z, 0.2)));
      float spec = pow(max(dot(n, normalize(sunL + vec3(0.0, 0.0, 1.0))), 0.0), 26.0) * (0.45 + 0.75 * front);
      col *= 0.8 + 0.32 * max(dot(n, sunL), 0.0);
      col += vec3(1.0) * spec * 0.6;
      // Back-lit petals: light passing through them glows warm, strongest on the thin edges.
      col += (vColor * 0.7 + vec3(0.32, 0.28, 0.18)) * vBack * (0.55 + 0.8 * smoothstep(0.55, 1.0, rr));
      float pistil = 1.0 - smoothstep(0.14, 0.14 + aa, r);
      col = mix(col, uPistil * (1.0 + 0.5 * spec), pistil);
      // Sparkle: a four-point star (plus a soft core) when this flower catches the sun.
      float star = exp(-abs(q.x) * 16.0) * exp(-abs(q.y) * 2.4) + exp(-abs(q.y) * 16.0) * exp(-abs(q.x) * 2.4) + exp(-dot(q, q) * 14.0);
      float g = vGlint * star;
      col += vec3(1.0, 0.98, 0.9) * g * 1.8;
      float fa = max(body, min(g, 1.0)) * vAlpha;
      if (vState > 3.5) {
        float ring = smoothstep(0.86, 0.92, r) * (1.0 - smoothstep(0.96, 1.0, r));
        col = mix(col, vColor * 0.6, ring);
        fa = max(fa, ring * 0.9);
      }
      if (fa < uAlphaCut) discard;
      gl_FragColor = vec4(col, fa);
      return;
    }
    float d = length(c) * 2.0 * vFoot;
    if (d > vFoot) discard;
    float core = smoothstep(0.5, 0.05, d);
    float halo = exp(-d * d * 4.5) * uGlow;
    vec3 col = vColor * (core * 1.25 + halo * 0.9);
    float a = (core + halo * 0.55) * vAlpha;
    float ring = smoothstep(0.38, 0.5, d) * (1.0 - smoothstep(0.5, 0.66, d)) * uOutline;
    col = mix(col, uOutlineColor, ring * 0.85);
    a = max(a, ring * vAlpha);
    if (vState > 3.5) {
      float r2 = smoothstep(0.7, 0.8, d) * (1.0 - smoothstep(0.85, 0.95, d));
      col += vColor * r2 * 1.5;
      a = max(a, r2 * 0.9);
    }
    if (a < uAlphaCut) discard;
    gl_FragColor = vec4(col, a);
  }
`,Xe=[-.179,-.174,-.968],on=[-30,160,-160],nn=[90,170,70],an=30,sn=6e3;function rn(){const e=D(p=>p.vectors),t=D(p=>p.vectorsVersion),n=(e==null?void 0:e.positions)??null,o=K(),s=_(p=>p.highlights),i=_(p=>p.maxYear),l=_(p=>p.settings.reduceMotion),f=V(p=>p.overlay),{size:r,camera:c,gl:g}=ee(),d=y.useMemo(()=>{const p=D.getState().vectors;if(!p)return null;const v=p.positions.length/3,b=Ho(p,o),w=new ne;w.setAttribute("position",new E(b.position,3)),w.setAttribute("color",new E(b.color,3)),w.setAttribute("size",new E(b.size,1)),w.setAttribute("phase",new E(b.phase,1)),w.setAttribute("state",new E(b.state,1).setUsage(Oe)),w.setAttribute("year",new E(b.year,1)),w.setAttribute("inFilter",new E(new Uint8Array(v),1).setUsage(Oe));const m=new Float32Array(v);return m.set(D.getState().bornAt.subarray(0,Math.min(v,D.getState().bornAt.length))),w.setAttribute("born",new E(m,1)),w.setDrawRange(0,p.count),w.computeBoundingSphere(),w},[n]),h=y.useRef(0);y.useEffect(()=>{var p;h.current=((p=D.getState().vectors)==null?void 0:p.count)??0},[d]),y.useEffect(()=>{const p=D.getState().vectors;if(!d||!p||p.count<=h.current)return;const v=h.current,b=p.count-v,w=m=>d.getAttribute(m);Ue(p,o,w("color").array,v),Bt(p,{size:w("size").array,phase:w("phase").array,year:w("year").array},v),w("born").array.set(D.getState().bornAt.subarray(v,p.count),v);for(const m of["position","color","size","phase","year","born"]){const M=w(m);M.clearUpdateRanges(),M.addUpdateRange(v*M.itemSize,b*M.itemSize),M.needsUpdate=!0}d.setDrawRange(0,p.count),h.current=p.count},[t,d]);const u=y.useMemo(()=>pe(new se({vertexShader:en,fragmentShader:tn,transparent:!0,depthWrite:!1,uniforms:{uTime:{value:0},uScale:{value:500},uPixelRatio:{value:1},uMaxYear:{value:9999},uMinPx:{value:1.6},uMaxPx:{value:16},uTwinkle:{value:1},uSizeMul:{value:1},uFlower:{value:0},uPistil:{value:new W},uSunDir:{value:new te(...Xe).normalize()},uSunGlow:{value:0},uGlow:{value:1},uOutlineColor:{value:new W},uOutline:{value:0},uFilter:{value:0},uDimRest:{value:0},uClock:{value:0},uFootprint:{value:De?1:.8},uAlphaCut:{value:De?0:.08}}})),[]);y.useEffect(()=>{const p=D.getState().vectors;if(!d||!p)return;const v=d.getAttribute("color");Ue(p,o,v.array),v.clearUpdateRanges(),v.needsUpdate=!0,u.uniforms.uGlow.value=o.vectorGlow,u.uniforms.uOutline.value=o.vectorOutlineStrength,u.uniforms.uOutlineColor.value.copy(G(o.vectorOutline)),u.uniforms.uFlower.value=o.vectorFlowers?1:0,u.uniforms.uSizeMul.value=o.vectorSize,u.uniforms.uPistil.value.copy(G(o.sap)),u.uniforms.uSunGlow.value=o.sunGlow,u.blending=fe(o),u.needsUpdate=!0},[o,d,u]),y.useEffect(()=>{u.uniforms.uMaxYear.value=i??9999},[i,u]),y.useEffect(()=>{u.uniforms.uTwinkle.value=l?0:1},[l,u]);const a=y.useRef({highlights:null,overlay:new Map}),x=y.useRef(null);return y.useEffect(()=>{d&&(x.current!==d&&(x.current=d,a.current={highlights:null,overlay:new Map}),Tt("diffStates",()=>{const p=(w,m)=>{if(m.length!==0){w.clearUpdateRanges();for(const[M,k]of Lt(m))w.addUpdateRange(M,k);w.needsUpdate=!0}},v=d.getAttribute("inFilter"),b=d.getAttribute("state");s!==a.current.highlights&&p(v,$o(v.array,a.current.highlights,s)),f!==a.current.overlay&&p(b,qo(b.array,a.current.overlay,f)),u.uniforms.uFilter.value=s?1:0,a.current={highlights:s,overlay:f}}))},[d,s,f,u]),y.useEffect(()=>()=>{d==null||d.dispose()},[d]),y.useEffect(()=>()=>u.dispose(),[u]),Z((p,v)=>{u.uniforms.uTime.value+=l?0:v,u.uniforms.uClock.value=ae();const b=V.getState().dim,w=u.uniforms.uDimRest;w.value=l?b:w.value+(b-w.value)*Math.min(1,v*2.5),u.uniforms.uScale.value=me(r.height,c.fov),u.uniforms.uPixelRatio.value=g.getPixelRatio()}),d?S.jsxs(S.Fragment,{children:[S.jsx("points",{geometry:d,material:u,raycast:()=>null}),S.jsx(ln,{})]}):null}function ln(){const{camera:e,gl:t,get:n}=ee();D(d=>d.vectors);const o=y.useRef(null),s=d=>{const h=o.current;return(!h||h.buffer!==d.positions.buffer||d.count-h.count>sn)&&(o.current={grid:Wo(d.positions.subarray(0,d.count*3),3),count:d.count,buffer:d.positions.buffer}),o.current},i=y.useMemo(()=>new Mo,[]),l=y.useMemo(()=>new zt,[]),f=y.useMemo(()=>new te,[]),r=y.useMemo(()=>[],[]),c=y.useRef(0),g=y.useRef(null);return y.useEffect(()=>{const d=t.domElement,h=v=>{const b=D.getState().vectors;if(!b)return null;const{grid:w,count:m}=s(b),M=d.getBoundingClientRect();l.set((v.clientX-M.left)/M.width*2-1,-((v.clientY-M.top)/M.height)*2+1),i.setFromCamera(l,e);const k=n().controls;k!=null&&k.getTarget?k.getTarget(f):f.set(0,70,0);const C=ko.clamp(e.position.distanceTo(f)*.0065,.18,1.6),{origin:F,direction:T}=i.ray,A=[F.x,F.y,F.z],P=[T.x,T.y,T.z];Ko(w,A,P,C,i.near,i.far,r),b.count>m&&Yo(b.positions,m,b.count,A,P,C,i.near,i.far,r);const R=_.getState().maxYear??9999;return Zo(r,j=>b.years[j]<=R)},u=v=>{if(v.buttons!==0)return;const b=performance.now();if(b-c.current<an)return;c.current=b;const w=Tt("pick",()=>h(v)),m=_.getState();w!==null?(m.setHovered(w,{kind:"vector",id:w,x:v.clientX,y:v.clientY}),d.style.cursor="pointer"):m.hoveredVectorIndex!==null&&(m.setHovered(null,null),d.style.cursor="")},a=v=>g.current=[v.clientX,v.clientY],x=v=>{const b=g.current;if(g.current=null,!b||Math.hypot(v.clientX-b[0],v.clientY-b[1])>5)return;const w=h(v);if(w===null)return;const m=D.getState().vectorIds[w],M=Q.getState();_.getState().focusPaper(m,{context:{citationChecks:M.current.citationChecks,grounded:M.current.grounded_chunks}})},p=()=>{_.getState().hoveredVectorIndex!==null&&_.getState().setHovered(null,null)};return d.addEventListener("pointermove",u),d.addEventListener("pointerdown",a),d.addEventListener("pointerup",x),d.addEventListener("pointerleave",p),()=>{d.removeEventListener("pointermove",u),d.removeEventListener("pointerdown",a),d.removeEventListener("pointerup",x),d.removeEventListener("pointerleave",p)}},[t,e,n,i,l,f,r]),null}const cn=`
  attribute float aPhase;
  attribute float aSpeed;
  uniform float uTime;
  uniform float uScale;
  uniform float uPixelRatio;
  uniform vec3 uColor;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float t = uTime * aSpeed;
    float ph = aPhase * 6.2831;
    vec3 p = position + vec3(sin(t + ph) * 4.0, sin(t * 0.7 + ph * 2.0) * 2.5, cos(t * 0.9 + ph * 1.5) * 4.0);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float flicker = 0.55 + 0.45 * sin(uTime * 2.3 + ph * 3.0);
    gl_PointSize = clamp(0.55 * uScale / -mv.z, 1.5, 14.0) * uPixelRatio * (0.7 + 0.3 * flicker);
    gl_Position = projectionMatrix * mv;
    vColor = uColor;
    vAlpha = flicker;
  }
`;function un({count:e=320}){const t=K(),n=_(r=>r.settings.reduceMotion),{size:o,camera:s,gl:i}=ee(),l=y.useMemo(()=>{const r=xe(42),c=new Float32Array(e*3),g=new Float32Array(e),d=new Float32Array(e);for(let u=0;u<e;u++){const a=co(r),x=12+Math.sqrt(r())*62;c.set([a.re*x,40+r()*80,a.im*x],u*3),g[u]=r(),d[u]=.25+r()*.5}const h=new ne;return h.setAttribute("position",new E(c,3)),h.setAttribute("aPhase",new E(g,1)),h.setAttribute("aSpeed",new E(d,1)),h.computeBoundingSphere(),h.boundingSphere&&(h.boundingSphere.radius+=10),h},[e]),f=y.useMemo(()=>pe(new se({vertexShader:cn,fragmentShader:$e,transparent:!0,depthWrite:!1,uniforms:{uTime:{value:0},uScale:{value:500},uPixelRatio:{value:1},uColor:{value:new W}}})),[]);return y.useEffect(()=>{f.uniforms.uColor.value.copy(G(t.firefly)).multiplyScalar(t.additiveGlow?1.6:1),f.blending=fe(t),f.needsUpdate=!0},[t,f]),y.useEffect(()=>()=>{l.dispose(),f.dispose()},[l,f]),Z((r,c)=>{n||(f.uniforms.uTime.value+=c),f.uniforms.uScale.value=me(o.height,s.fov),f.uniforms.uPixelRatio.value=i.getPixelRatio()}),S.jsx("points",{geometry:l,material:f})}class fn{constructor(){O(this,"buckets",new Map)}add(t){const n=`${t.stage}:${t.crate_id}`,o=this.buckets.get(n);o?o.count+=t.count:this.buckets.set(n,{...t})}flush(){const t=[...this.buckets.values()];return this.buckets.clear(),t}get size(){return this.buckets.size}}const dn={high:22,low:8},hn={high:120,low:30},pn={high:2e4,low:5e3};function mn(e,t){const n=Math.round(Math.log2(1+Math.max(0,e))*dn[t]);return Math.min(hn[t],Math.max(1,n))}class gn{constructor(t){O(this,"next",0);O(this,"emitted",0);this.size=t}emit(){const t=this.next;return this.next=(this.next+1)%this.size,this.emitted++,t}get used(){return Math.min(this.emitted,this.size)}get total(){return this.emitted}}const vn=`
  attribute vec2 corner;
  attribute float aPath;
  attribute float aStart;
  attribute float aDur;
  attribute vec2 aJit;
  attribute vec3 aColor;
  attribute vec2 aShape;
  uniform sampler2D uPaths;
  uniform float uRows;
  uniform float uSamples;
  uniform float uNow;
  uniform float uScale;
  uniform float uSize;
  uniform float uMinPx;
  uniform float uSpread;
  uniform float uConverge;
  uniform float uFadeIn;
  uniform vec3 uTail;
  uniform float uTailMix;
  uniform float uSparkle;
  varying vec3 vColor;
  varying float vAlpha;
  varying vec2 vUv;
  varying float vGlint;

  vec3 pathAt(float t) {
    float f = clamp(t, 0.0, 1.0) * (uSamples - 1.0);
    float i0 = floor(f);
    float v = (aPath + 0.5) / uRows;
    vec3 a = texture2D(uPaths, vec2((i0 + 0.5) / uSamples, v)).xyz;
    vec3 b = texture2D(uPaths, vec2((min(i0 + 1.0, uSamples - 1.0) + 0.5) / uSamples, v)).xyz;
    return mix(a, b, f - i0);
  }

  void main() {
    float t = (uNow - aStart) / aDur;
    vUv = corner;
    // Sparkle (light theme): each streak's head flashes on its own rhythm, seeded by its start time
    // and jitter, ~8% of the time.
    float seed = fract(aStart * 7.13 + aJit.x * 3.7 + aJit.y * 5.3);
    vGlint = uSparkle * pow(max(sin(uNow * (4.0 + seed * 6.0) + seed * 80.0), 0.0), 18.0);
    if (t < 0.0 || t > 1.0) {
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      vAlpha = 0.0;
      vColor = vec3(0.0);
      vGlint = 0.0;
      return;
    }
    // uConverge 1: wide at the start, converging onto the path end; 0: constant width.
    float spread = mix(1.0, (1.0 - t) * (1.0 - t), uConverge) * uSpread;
    vec3 p = pathAt(t);
    p.xz += aJit * spread;
    vec3 back = pathAt(t - 0.02);
    back.xz += aJit * spread;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vec3 dir = (modelViewMatrix * vec4(p - back, 0.0)).xyz;
    float dl = length(dir);
    dir = dl > 1e-5 ? dir / dl : vec3(0.0, 1.0, 0.0);
    // Camera-facing streak: the long side follows the motion, the short side faces the viewer.
    vec3 side = cross(dir, normalize(mv.xyz));
    float sl = length(side);
    side = sl > 1e-4 ? side / sl : vec3(1.0, 0.0, 0.0);
    // Never thinner than uMinPx CSS pixels (world units per CSS pixel at this depth = -z / uScale).
    float width = max(uSize * aShape.x, uMinPx * -mv.z / uScale);
    float len = width * aShape.y;
    mv.xyz += side * (corner.y * width * 0.5) - dir * (corner.x * len);
    gl_Position = projectionMatrix * mv;
    vColor = mix(aColor, uTail, smoothstep(0.35, 0.9, t) * uTailMix) * (1.0 + 0.7 * smoothstep(0.85, 1.0, t));
    vAlpha = smoothstep(0.0, uFadeIn, t) * (1.0 - smoothstep(0.93, 1.0, t));
  }
`,xn=`
  varying vec3 vColor;
  varying float vAlpha;
  varying vec2 vUv;
  varying float vGlint;
  uniform float uGain;
  void main() {
    // x: 0 head → 1 tail; y: -1..1 across.
    float across = 1.0 - vUv.y * vUv.y;
    float tail = pow(clamp(1.0 - vUv.x, 0.0, 1.0), 1.6);
    float head = pow(clamp(1.0 - vUv.x, 0.0, 1.0), 6.0);
    float a = across * tail * vAlpha;
    if (a < 0.004) discard;
    vec3 col = vColor * (0.8 + 1.4 * head * across) * uGain;
    // Glint: the head turns white-hot (above 1.0, so the bloom pass gives it a star-like glare).
    float g = vGlint * head * across * vAlpha;
    col += vec3(1.0, 0.98, 0.92) * g * 3.0;
    gl_FragColor = vec4(col, max(a, min(g, 1.0)));
  }
`;class Vt{constructor(t,n,o){O(this,"object");O(this,"material");O(this,"geometry",new Fo);O(this,"pathData");O(this,"pathTex");O(this,"pool");O(this,"aPath");O(this,"aStart");O(this,"aDur");O(this,"aJit");O(this,"aColor");O(this,"aShape");O(this,"touched",[]);O(this,"pathsDirty",!1);this.size=t,this.rows=n,this.samples=o,this.pool=new gn(t),this.pathData=new Float32Array(n*o*4),this.pathTex=new Ke(this.pathData,o,n,Ye,jt),this.pathTex.magFilter=this.pathTex.minFilter=Ze,this.pathTex.needsUpdate=!0;const s=(i,l,f=0)=>new Po(new Float32Array(i*l).fill(f),l).setUsage(Oe);this.aPath=s(t,1),this.aStart=s(t,1,-1e6),this.aDur=s(t,1,1),this.aJit=s(t,2),this.aColor=s(t,3),this.aShape=s(t,2,1),this.geometry.setAttribute("corner",new Be([0,-1,0,1,1,-1,1,1],2)),this.geometry.setAttribute("position",new Be(new Float32Array(12),3)),this.geometry.setIndex([0,2,1,1,2,3]),this.geometry.setAttribute("aPath",this.aPath),this.geometry.setAttribute("aStart",this.aStart),this.geometry.setAttribute("aDur",this.aDur),this.geometry.setAttribute("aJit",this.aJit),this.geometry.setAttribute("aColor",this.aColor),this.geometry.setAttribute("aShape",this.aShape),this.geometry.instanceCount=t,this.material=pe(new se({vertexShader:vn,fragmentShader:xn,transparent:!0,depthWrite:!1,side:It,uniforms:{uPaths:{value:this.pathTex},uRows:{value:n},uSamples:{value:o},uNow:{value:0},uScale:{value:500},uSize:{value:.3},uMinPx:{value:1.6},uSpread:{value:2.5},uConverge:{value:1},uFadeIn:{value:.05},uTail:{value:new W},uTailMix:{value:0},uGain:{value:1},uSparkle:{value:0}}})),this.object=new Ao(this.geometry,this.material),this.geometry.boundingSphere=new ke(new te(0,-40,0),120),this.object.frustumCulled=!0,this.object.raycast=()=>{}}get used(){return this.pool.used}setPath(t,n){const o=t*this.samples*4;for(let s=0;s<this.samples;s++){const i=n[Math.min(n.length-1,s)];this.pathData[o+s*4]=i[0],this.pathData[o+s*4+1]=i[1],this.pathData[o+s*4+2]=i[2],this.pathData[o+s*4+3]=1}this.pathsDirty=!0}emit(t,n,o,s,i,l,f=1,r=4){const c=this.pool.emit();this.aPath.array[c]=t,this.aStart.array[c]=o,this.aDur.array[c]=s,this.aJit.array[c*2]=i,this.aJit.array[c*2+1]=l,this.aColor.array[c*3]=n[0],this.aColor.array[c*3+1]=n[1],this.aColor.array[c*3+2]=n[2],this.aShape.array[c*2]=f,this.aShape.array[c*2+1]=r,this.touched.push(c)}commit(){if(this.pathsDirty&&(this.pathTex.needsUpdate=!0,this.pathsDirty=!1),this.touched.length===0)return;const t=Lt(this.touched,64,16);this.touched=[];for(const n of[this.aPath,this.aStart,this.aDur,this.aJit,this.aColor,this.aShape]){n.clearUpdateRanges();for(const[o,s]of t)n.addUpdateRange(o*n.itemSize,s*n.itemSize);n.needsUpdate=!0}}dispose(){this.geometry.dispose(),this.material.dispose(),this.pathTex.dispose()}}const yn=4e3,pt=128,mt=40,wn=[[0,0,0],[0,12,0],[0,24,0],[0,35,0]];function bn(){const e=D(l=>l.ground),t=D(l=>l.nodesById),n=K(),{size:o,camera:s}=ee(),i=y.useMemo(()=>new Vt(yn,pt,mt),[]);return y.useEffect(()=>{i.material.blending=fe(n),i.material.uniforms.uSize.value=.18,i.material.uniforms.uSpread.value=.4,i.material.uniforms.uTail.value.copy(G(n.sap)),i.material.uniforms.uTailMix.value=.6,i.material.uniforms.uSparkle.value=n.sparkle,i.material.needsUpdate=!0},[n,i]),y.useEffect(()=>{if(!e)return;const l=new Map(e.roots.map(u=>[u.crate_id,u.path])),f=new Map,r=[];let c=0;const g=xe(17),d=(u,a)=>{const x=`${u}:${a}`,p=f.get(x);if(p!==void 0)return p;const v=l.get(u),b=t.get(a),w=b?t.get(b.parent_id??-1):void 0;if(!v||!b||!w)return null;const m=c;return c=(c+1)%pt,r[m]&&f.delete(r[m]),r[m]=x,f.set(x,m),i.setPath(m,qe([...v,...wn.slice(1),...w.path.slice(1),...b.path.slice(1)],mt)),m},h=(u,a)=>{const x=new Map;for(const p of u){const v=`${p.crate_id}:${p.twig_id}`,b=x.get(v);b?b.n++:x.set(v,{crate:p.crate_id,twig:p.twig_id,cat:p.category_index,n:1})}for(const p of x.values()){const v=d(p.crate,p.twig);if(v===null)continue;const b=ie(le(p.cat,n)),w=Math.min(5,1+Math.floor(p.n/2));for(let m=0;m<w;m++){const M=m*.07+g()*.05;i.emit(v,b,a-ot+M,ot-M,g()-.5,g()-.5)}}a>I.lastEnd&&(I.lastEnd=a),i.commit()};return Me.vectors.add(h),I.riseLive=!0,()=>{I.riseLive=!1,Me.vectors.delete(h)}},[e,t,i,n]),y.useEffect(()=>()=>i.dispose(),[i]),Z(()=>{const l=i.material.uniforms;l.uNow.value=ae(),l.uScale.value=me(o.height,s.fov)}),S.jsx("primitive",{object:i.object})}function Nt(){const e=_(n=>n.settings.quality),t=_(n=>n.qualityTier);return e==="low"||e==="auto"&&t>=2?"low":"high"}function Sn(){const e=Ge(s=>s.visualActive),t=Ge(s=>s.showRise),n=_(s=>s.settings.reduceMotion),o=Nt();return e?S.jsx("group",{name:"crawl",children:!n&&t&&o==="high"&&S.jsx(bn,{})}):null}const Re=12,Mn=y.forwardRef(function(t,n){const o=K(),s=y.useRef(null),i=y.useRef(0),{line:l,trace:f}=y.useMemo(()=>{const r=new ne;r.setAttribute("position",new E(new Float32Array(6),3));const c=new Co(r,new Ae({transparent:!0,opacity:.95,toneMapped:!1,depthWrite:!1}));r.boundingSphere=new ke(new te(0,60,0),120),c.visible=!1;const g=new ne;g.setAttribute("position",new E(new Float32Array(Re*6),3)),g.setDrawRange(0,0);const d=new Ro(g,new Ae({transparent:!0,opacity:.28,toneMapped:!1,depthWrite:!1}));return g.boundingSphere=new ke(new te(0,60,0),120),{line:c,trace:d}},[]);return y.useEffect(()=>{const r=G(o.thread).multiplyScalar(o.additiveGlow?2.2:1);l.material.color.copy(r),f.material.color.copy(r)},[o,l,f]),y.useEffect(()=>()=>{l.geometry.dispose(),l.material.dispose(),f.geometry.dispose(),f.material.dispose()},[l,f]),y.useImperativeHandle(n,()=>({show:(r,c,g)=>{s.current=c;const d=l.geometry.getAttribute("position");d.setXYZ(0,r[0],r[1],r[2]),d.setXYZ(1,c[0],c[1],c[2]),d.needsUpdate=!0,l.visible=!0;const h=f.geometry.getAttribute("position"),u=i.current%Re;h.setXYZ(u*2,r[0],r[1],r[2]),h.setXYZ(u*2+1,c[0],c[1],c[2]),h.needsUpdate=!0,i.current++,f.geometry.setDrawRange(0,Math.min(Re,i.current)*2),nt.show(c,g.toFixed(3))},follow:r=>{if(!l.visible||!s.current)return;const c=l.geometry.getAttribute("position");c.setXYZ(0,r[0],r[1],r[2]),c.needsUpdate=!0},hide:()=>{l.visible=!1,s.current=null,i.current=0,f.geometry.setDrawRange(0,0),nt.hide()}}),[l,f]),S.jsxs(S.Fragment,{children:[S.jsx("primitive",{object:l}),S.jsx("primitive",{object:f})]})}),Te=36,kn=`
  attribute float aPhase;
  uniform vec3 uEnd;
  uniform float uTime;
  uniform float uScale;
  uniform float uPixelRatio;
  uniform vec3 uColor;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float t = fract(uTime * 0.55 + aPhase);
    float e = t * t;
    vec3 mid = mix(position, uEnd, 0.5) + vec3(0.0, 3.0, 0.0);
    vec3 p = mix(mix(position, mid, e), mix(mid, uEnd, e), e);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = clamp(0.6 * uScale / -mv.z, 1.5, 10.0) * uPixelRatio;
    gl_Position = projectionMatrix * mv;
    vColor = uColor;
    vAlpha = smoothstep(0.0, 0.1, t) * (1.0 - smoothstep(0.85, 1.0, t));
  }
`;function An(){const e=V(g=>g.topK),t=V(g=>g.anchor),n=D(g=>g.vectors),o=_(g=>g.settings.reduceMotion),s=K(),{size:i,camera:l,gl:f}=ee(),r=y.useMemo(()=>{if(!n||e.length===0)return null;const g=e.length*Te,d=new Float32Array(g*3),h=new Float32Array(g);e.forEach((a,x)=>{for(let p=0;p<Te;p++){const v=x*Te+p;d.set([n.positions[a.index*3],n.positions[a.index*3+1],n.positions[a.index*3+2]],v*3),h[v]=Ot(v*7+x)}});const u=new ne;return u.setAttribute("position",new E(d,3)),u.setAttribute("aPhase",new E(h,1)),u.computeBoundingSphere(),u.boundingSphere&&(u.boundingSphere.radius+=15),u},[e,n]),c=y.useMemo(()=>new se({vertexShader:kn,fragmentShader:$e,transparent:!0,depthWrite:!1,uniforms:{uEnd:{value:new te},uTime:{value:0},uScale:{value:500},uPixelRatio:{value:1},uColor:{value:new W}}}),[]);return y.useEffect(()=>{c.uniforms.uColor.value.copy(G(s.queryOrbHalo)).multiplyScalar(s.additiveGlow?1.8:1),c.blending=fe(s),c.needsUpdate=!0},[s,c]),y.useEffect(()=>{t&&c.uniforms.uEnd.value.set(...t)},[t,c]),y.useEffect(()=>()=>r==null?void 0:r.dispose(),[r]),y.useEffect(()=>()=>c.dispose(),[c]),Z((g,d)=>{o||(c.uniforms.uTime.value+=d),c.uniforms.uScale.value=me(i.height,l.fov),c.uniforms.uPixelRatio.value=f.getPixelRatio()}),!r||!t?null:S.jsx("points",{geometry:r,material:c,raycast:()=>null})}const Fn=`
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`,Pn=`
  uniform vec3 uColor;
  uniform float uStrength;
  varying vec2 vUv;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    float a = exp(-d * d * 5.0) * uStrength * (1.0 - smoothstep(0.85, 1.0, d));
    gl_FragColor = vec4(uColor, a);
  }
`,Cn=y.forwardRef(function({size:t=1},n){const o=K(),s=y.useMemo(()=>new se({vertexShader:Fn,fragmentShader:Pn,transparent:!0,depthWrite:!1,uniforms:{uColor:{value:new W},uStrength:{value:1}}}),[]);y.useEffect(()=>{s.uniforms.uColor.value.copy(G(o.queryOrbHalo)),s.uniforms.uStrength.value=o.additiveGlow?.75:.5,s.blending=fe(o),s.needsUpdate=!0},[o,s]),y.useEffect(()=>()=>s.dispose(),[s]);const i=y.useMemo(()=>G(o.queryOrb).multiplyScalar(o.additiveGlow?2:1),[o]);return S.jsxs("group",{ref:n,visible:!1,children:[S.jsx(oo,{width:2.4*t,length:8,color:ue(o.queryOrbHalo),attenuation:l=>l*l,decay:1,children:S.jsxs("mesh",{children:[S.jsx("sphereGeometry",{args:[1.05*t,14,14]}),S.jsx("meshBasicMaterial",{color:i,toneMapped:!1})]})}),S.jsx(no,{children:S.jsx("mesh",{material:s,renderOrder:5,children:S.jsx("planeGeometry",{args:[5.5*t,5.5*t]})})}),o.additiveGlow&&S.jsx("pointLight",{intensity:260*t,distance:28,color:ue(o.queryOrbHalo)})]})});function Rn(){const e=V(c=>c.topK),t=V(c=>c.anchor),n=D(c=>c.vectors),o=Q(c=>c.visualPhase),s=Q(c=>c.current.citationChecks),i=K(),l=!!(t&&n&&e.length>0&&(o==="found"||o==="generating"||o==="done")),{geometry:f,material:r}=y.useMemo(()=>{const c=new ne,g=new Ae({vertexColors:!0,transparent:!0,depthWrite:!1,toneMapped:!1});return{geometry:c,material:g}},[]);return y.useEffect(()=>()=>{f.dispose(),r.dispose()},[f,r]),y.useEffect(()=>{if(!l||!t||!n){f.setDrawRange(0,0);return}const c=new Set(s.filter(x=>x.status==="verified").map(x=>x.paper_id)),g=e.length,d=new Float32Array(g*6),h=new Float32Array(g*6),u=G(i.thread),a=i.additiveGlow?1.5:1;e.forEach((x,p)=>{const v=_t(n,x.index),w=(o==="done"&&!c.has(x.paper_id)?.2:.95)*a,m=u.r*w,M=u.g*w,k=u.b*w,C=p*6;d[C]=t[0],d[C+1]=t[1],d[C+2]=t[2],h[C]=m,h[C+1]=M,h[C+2]=k,d[C+3]=v[0],d[C+4]=v[1],d[C+5]=v[2],h[C+3]=m,h[C+4]=M,h[C+5]=k}),f.setAttribute("position",new E(d,3)),f.setAttribute("color",new E(h,3)),f.setDrawRange(0,g*2),f.computeBoundingSphere()},[l,t,n,e,o,s,i,f]),l?S.jsx("lineSegments",{geometry:f,material:r,frustumCulled:!0}):null}const Se=12,Tn=.9,gt=[0,80,0],vt=()=>({stage:"idle",t:0,done:!1,instant:!1,plan:null,orbPos:be,orbScale:0,forked:!1,slot:-1,handled:"idle"});function xt(e){const t=[e[0]-gt[0],0,e[2]-gt[2]],n=Math.hypot(t[0],t[2])||1;return[e[0]+t[0]/n*2.2,e[1]+1.4,e[2]+t[2]/n*2.2]}function _n(e){const{phase:t,current:n}=Q.getState(),o=he(t)>he(e)||t==="error";return e==="flying"?n.route.length>0||o:e==="comparing"?n.compare.length>0||o:e==="found"?n.grounded_chunks.length>0||o:!0}function _e(){const{route:e}=Q.getState().current,t=D.getState().nodesById,n=new Map,o=[];for(const s of e){const i=new Set(s.chosen);for(const l of s.candidates)s.depth===2&&!e.some(f=>{var r;return f.depth===1&&f.chosen.includes(((r=t.get(l.node_id))==null?void 0:r.parent_id)??-1)})||(n.set(l.node_id,i.has(l.node_id)?1:2),o.push({node_id:l.node_id,score:l.score,chosen:i.has(l.node_id)}))}V.getState().setBranchMarks(n),V.getState().setRouteLabels(o)}function En(){const e=Q.getState().current.route.find(o=>o.depth===1);if(!e)return;const t=new Set(e.chosen),n=new Map(e.candidates.map(o=>[o.node_id,t.has(o.node_id)?1:2]));V.getState().setBranchMarks(n),V.getState().setRouteLabels(e.candidates.map(o=>({node_id:o.node_id,score:o.score,chosen:t.has(o.node_id)})))}function yt(e,t){if(!_n(e))return null;const{current:n}=Q.getState(),o=D.getState(),s=o.vectors;switch(e){case"embedding":return{kind:"embedding"};case"flying":{const i=go(n.route,o.nodesById).slice(0,Se),l=Math.max(1,...i.map(Pe)),f=Math.min(J.flightMax,Math.max(J.flightMin,l/J.flightSpeed)),r=i[0],c=r&&r.length>3?Pe(r.slice(0,3))/Pe(r):.6;return{kind:"flying",paths:i,duration:f,forkAt:c}}case"comparing":{if(!s)return{kind:"comparing",stops:[],hovers:[],slots:[],from:t};const i=po(n.compare,s,o.vectorIndexByPaperId),l=i.map(c=>xt(c.position));let f=0;const r=i.map((c,g)=>{const d=mo(g,i.length,J.compareFirstDwell,J.compareLastDwell),h={start:f,travel:f+d*J.compareTravelShare,end:f+d};return f+=d,h});return{kind:"comparing",stops:i,hovers:l,slots:r,from:t}}case"found":{const i=ho(n.grounded_chunks),l=[];i.forEach((c,g)=>{const d=o.vectorIndexByPaperId.get(c.paper_id);if(d===void 0){console.warn(`[flight] grounded paper ${c.paper_id} has no vector — skipped`);return}l.push({paper_id:c.paper_id,index:d,rank:g+1,final_score:c.best.final_score,chunkCount:c.chunks.length})});const f=l[0],r=f&&s?(()=>{const c=xt(_t(s,f.index));return[c[0],c[1]+3.2,c[2]]})():t;return{kind:"found",topK:l,anchor:r,from:t}}case"generating":return{kind:"generating"};case"done":return{kind:"done"};default:return null}}function zn(){const e=Q(h=>h.runId),t=Q(h=>h.visualPhase),n=Q(h=>h.skipToken),o=Q(h=>h.current.query),s=y.useRef([]),i=y.useRef(null),l=y.useRef(vt()),f=(h,u,a=1)=>{const x=s.current[h];if(x){if(!u||a<=.001){x.visible=!1;return}x.visible=!0,x.position.set(u[0],u[1],u[2]),x.scale.setScalar(a)}},r=()=>s.current.forEach((h,u)=>f(u,null));y.useEffect(()=>{var h;V.getState().reset(),oe.active=!1,(h=i.current)==null||h.hide(),l.current=vt(),r()},[e]),y.useEffect(()=>{var x;const h=l.current,u=Q.getState();h.stage=t,h.t=0,h.done=!1,h.plan=null,h.slot=-1,h.instant=u.skipped||_.getState().settings.reduceMotion;const a=_.getState();t==="embedding"?(a.setCameraMode("canopy"),h.orbPos=be):t==="flying"||t==="comparing"?(V.getState().setDim(Tn),oe.active=!0,oe.position=[...h.orbPos],a.setCameraMode("follow",h.orbPos)):(t==="generating"||t==="done")&&V.getState().topK.length>0&&V.getState().dim<1?(oe.active=!1,(a.cameraMode==="focus"||a.cameraMode==="follow"||a.cameraMode==="canopy")&&a.setCameraMode("overview"),a.panelPaperId===null&&_.setState({focusedPaperId:null}),V.getState().setDim(1)):t==="error"&&(oe.active=!1,(x=i.current)==null||x.hide(),r(),V.getState().reset(),a.cameraMode==="follow"&&a.setCameraMode("canopy"))},[t,e]),y.useEffect(()=>{n!==0&&(l.current.instant=!0)},[n]);const c=h=>{var a;const u=h.plan;if(u)switch(u.kind){case"embedding":h.orbScale=1,f(0,be,1);break;case"flying":_e(),u.paths.forEach((x,p)=>f(p,x[x.length-1],u.paths.length>1?.65:1)),u.paths[0]&&(h.orbPos=u.paths[0][u.paths[0].length-1]),oe.position=[...h.orbPos];break;case"comparing":{(a=i.current)==null||a.hide();const x=u.stops.map(p=>[p.index,re.comparing]);V.getState().setOverlay(new Map(x)),u.hovers.length>0&&(h.orbPos=u.hovers[u.hovers.length-1]);for(let p=1;p<Se;p++)f(p,null);f(0,h.orbPos,1),oe.position=[...h.orbPos];break}case"found":h.orbPos=u.anchor,f(0,u.anchor,1);break}},g=h=>{var p,v;const u=h.plan;if(!u)return;const a=V.getState(),x=Q.getState();switch(u.kind!=="embedding"&&x.current.route.length>0&&a.branchMarks.size===0&&_e(),u.kind){case"flying":En(),h.forked=!1;break;case"comparing":a.setRouteLabels([]),(p=i.current)==null||p.hide();break;case"found":{(v=i.current)==null||v.hide(),a.setRouteLabels([]),a.setFound(u.topK,u.anchor);const b=new Map;u.topK.forEach((m,M)=>b.set(m.index,M===0?re.focused:re.topK)),a.setOverlay(b);const w=D.getState();a.setPulsingCrates(new Set(u.topK.map(m=>{var M;return((M=w.vectors)==null?void 0:M.crateIds[m.index])??-1}).filter(m=>m>=0))),oe.active=!1,u.topK[0]&&(_.getState().focusPaper(u.topK[0].paper_id,{openPanel:!1,context:{citationChecks:x.current.citationChecks,grounded:x.current.grounded_chunks}}),_.getState().cameraMode==="focus"&&_.getState().setCameraMode("follow",u.anchor));break}case"done":{const b=x.current.citationChecks,w=new Set(b.filter(k=>k.status==="verified").map(k=>k.paper_id)),m=new Map;a.topK.forEach((k,C)=>m.set(k.index,C===0&&w.has(k.paper_id)?re.focused:w.has(k.paper_id)?re.topK:re.comparing)),a.topK[0]&&!w.has(a.topK[0].paper_id)&&m.set(a.topK[0].index,re.focused),a.setOverlay(m);const M=D.getState().vectors;a.setPulsingCrates(new Set(a.topK.filter(k=>w.has(k.paper_id)).map(k=>(M==null?void 0:M.crateIds[k.index])??-1).filter(k=>k>=0))),_.setState({focusContext:{citationChecks:b,grounded:x.current.grounded_chunks}}),h.orbScale=.6;break}}h.instant&&(c(h),h.done=!0)};Z((h,u)=>{var b,w;const a=l.current,x=h.clock.elapsedTime,p=1+.09*Math.sin(x*Math.PI*2/J.breathe);if(a.stage==="idle"||a.stage==="error")return;if(!a.plan){const m=yt(a.stage,a.orbPos);if(!m){f(0,a.orbPos,Math.max(.3,a.orbScale)*p);return}const M=a.instant;for(let k=he(a.handled)+1;k<he(a.stage);k++){const C=yt(fo[k],a.orbPos);C&&(a.plan=C,a.instant=!0,g(a))}a.instant=M,a.done=!1,a.plan=m,a.handled=a.stage,g(a)}a.t+=u;const v=a.plan;if(a.done)f(0,a.orbPos,(a.stage==="done"?.6:1)*p);else if(a.instant)c(a),a.done=!0;else{switch(v.kind){case"embedding":{const m=ye((a.t-J.embedding*.45)/(J.embedding*.45));a.orbScale=m,f(0,be,m*p),a.t>=J.embedding&&(a.done=!0);break}case"flying":{const m=Math.min(1,a.t/v.duration),M=ye(m);v.paths.forEach((k,C)=>f(C,st(k,M),v.paths.length>1&&M>v.forkAt*.5?.65:1)),v.paths[0]&&(a.orbPos=st(v.paths[0],M),oe.position=[...a.orbPos]),!a.forked&&M>=v.forkAt&&(a.forked=!0,_e()),m>=1&&(a.done=!0);break}case"comparing":{for(let A=1;A<Se;A++){const P=s.current[A];if(P!=null&&P.visible){const R=P.scale.x*Math.max(0,1-u*4);f(A,[P.position.x,P.position.y,P.position.z],R<.05?0:R)}}const m=v.stops.length,M=m>0?v.slots[m-1].end:0;if(m===0||a.t>=M){a.done=!0;break}let k=v.slots.findIndex(A=>a.t<A.end);k<0&&(k=m-1);const C=v.slots[k],F=k===0?v.from:v.hovers[k-1],T=Math.min(1,(a.t-C.start)/Math.max(.001,C.travel-C.start));if(a.orbPos=at(F,v.hovers[k],ye(T)),f(0,a.orbPos,1),oe.position=[...a.orbPos],T>=1&&a.slot<k){a.slot=k;const A=v.stops[k];V.getState().patchOverlay([[A.index,re.comparing]]),(b=i.current)==null||b.show(a.orbPos,A.position,A.score)}else(w=i.current)==null||w.follow(a.orbPos);break}case"found":{const m=ye(a.t/(J.found*.5));a.orbPos=at(v.from,v.anchor,m),f(0,a.orbPos,1),a.t>=J.found&&(a.done=!0);break}case"generating":f(0,a.orbPos,p),a.t>=J.generatingMin&&(a.done=!0);break;case"done":a.done=!0;break}a.done&&c(a)}if(a.done&&a.stage!=="done"){const m=Q.getState(),M=a.instant?_.getState().settings.reduceMotion?J.reducedHold:.12:0;m.runId===e&&a.t>=M&&he(m.phase)>he(m.visualPhase)&&m.advanceVisual()}});const d=t==="embedding"&&o.length>0;return S.jsxs("group",{children:[Array.from({length:Se},(h,u)=>S.jsx(Cn,{size:u===0?1:.8,ref:a=>void(s.current[u]=a)},u)),d&&S.jsx(uo,{text:o},`t${e}`),S.jsx(Mn,{ref:i}),S.jsx(Rn,{}),t==="generating"&&S.jsx(An,{})]})}const jn=Fe(2.39996),L=16,Ht=48,$t=-2,Ee=-150,In=.25,wt=.55,qt=(e,t)=>`${e},${t}`;function Wt(e){const t=new Map;for(const n of e.crates){const o=t.get(n.category_index);o?o.push(n):t.set(n.category_index,[n])}return[...t].sort((n,o)=>n[0]-o[0]).slice(0,L).map(([n,o],s)=>{const i=o.map(c=>We(c.cell,e.grid_size,e.tile_size)),l=i.reduce((c,g)=>c+g[0],0)/i.length,f=i.reduce((c,g)=>c+g[2],0)/i.length;let r=0;for(let c=1;c<i.length;c++)Math.hypot(i[c][0]-l,i[c][2]-f)<Math.hypot(i[r][0]-l,i[r][2]-f)&&(r=c);return{index:s,category_index:n,crates:o,cells:new Set(o.map(c=>qt(c.cell[0],c.cell[1]))),plug:[i[r][0],i[r][2]],papers:o.reduce((c,g)=>c+g.paper_count,0)}})}function Dn(e,t){return xo(e,t,5,16)}function Ve(e,t,n){const o=1.6*Math.max(1,...e.map(s=>s.papers));for(const s of e){let i=s.papers;for(const l of s.crates)i+=t.get(l.id)??0;n[s.index]=Dn(i,o)}return n}function Gn(e,t,n,o,s){const i=1-s,l=i*i*i,f=3*i*i*s,r=3*i*s*s,c=s*s*s;return[l*e[0]+f*t[0]+r*n[0]+c*o[0],l*e[1]+f*t[1]+r*n[1]+c*o[1],l*e[2]+f*t[2]+r*n[2]+c*o[2]]}const bt=[.5,.87];function On(e,t,n=Ht){const[o,s]=e.plug,i=Math.hypot(o,s),l=i>1?null:vo(jn,e.category_index),f=l?l.re:o/i,r=l?l.im:s/i,c=55+i*1.2,g=[o+f*c+bt[0]*45,Ee,s+r*c+bt[1]*45],d=[g[0]+(o-g[0])*.2,Ee+(t-Ee)*.45,g[2]+(s-g[2])*.2],h=[o,t-30,s],u=[o,t-9,s],a=[];for(let x=0;x<=240;x++)a.push(Gn(g,d,h,u,x/240));return a.push([o,t,s]),qe(a,n)}function Bn(e){const t=Math.min(1,Math.max(0,(e-wt)/(1-wt)));return t*t*(3-2*t)}function St(e,t){const n=e.length-1;return e.map((o,s)=>[o[0],o[1]+t*Bn(n===0?1:s/n),o[2]])}const Ln=[[1,0],[-1,0],[0,1],[0,-1]];function Un(e,t,n=.12){const o=[],s=[],i=[],l=[],f=[],r=[],c=[],g=t.tile_size,d=g/2,h=(a,x,p,v)=>{const b=o.length/3;for(const w of a)o.push(w[0],w[1],w[2]),s.push(x[0],x[1],x[2]),i.push(p),l.push(v);f.push(b,b+1,b+2,b,b+2,b+3)},u=(a,x,p)=>{r.push(a[0],a[1],a[2],x[0],x[1],x[2]),c.push(p,p)};for(const a of e){const x=(v,b)=>a.cells.has(qt(v,b)),p=new Set;for(const v of a.crates){const[b,w]=v.cell,[m,,M]=We(v.cell,t.grid_size,g),k=(P,R)=>!x(b+P,w+R),C=m-d+(k(-1,0)?n:0),F=m+d-(k(1,0)?n:0),T=M-d+(k(0,-1)?n:0),A=M+d-(k(0,1)?n:0);h([[C,0,T],[C,0,A],[F,0,A],[F,0,T]],[0,1,0],a.index,0),h([[C,1,T],[F,1,T],[F,1,A],[C,1,A]],[0,-1,0],a.index,1);for(const[P,R]of Ln){if(!k(P,R))continue;const j=P===0,z=[-1,1].map($=>{const q=b+(j?$:0),X=w+(j?0:$);return x(q,X)?x(q+P,X+R)?{off:n,corner:!0}:{off:0,corner:!1}:{off:-n,corner:!0}}),N=P!==0?m+P*(d-n):M+R*(d-n),B=(j?m:M)-d-z[0].off,U=(j?m:M)+d+z[1].off,H=($,q)=>j?[$,q,N]:[N,q,$];h([H(B,0),H(U,0),H(U,1),H(B,1)],[P,0,R],a.index,2),u(H(B,0),H(U,0),a.index),u(H(B,1),H(U,1),a.index),[B,U].forEach(($,q)=>{if(!z[q].corner)return;const X=H($,0),ge=`${X[0].toFixed(3)},${X[2].toFixed(3)}`;p.has(ge)||(p.add(ge),u(X,H($,1),a.index))})}}}return{position:new Float32Array(o),normal:new Float32Array(s),zone:new Float32Array(i),face:new Float32Array(l),index:new Uint32Array(f),edges:new Float32Array(r),edgeZone:new Float32Array(c)}}class Je{constructor(t,n,o=4,s=0){O(this,"pulses");O(this,"next");O(this,"arrived");O(this,"cursor");O(this,"hits",[]);O(this,"started",[]);this.zones=t,this.rng=n,this.slots=o,this.pulses=new Float32Array(t*o*2).fill(-1e6),this.next=new Float64Array(t),this.arrived=new Uint8Array(t*o).fill(1),this.cursor=new Uint8Array(t);for(let i=0;i<t;i++)this.next[i]=s+this.rng()*3}static interval(t,n){return(1.5+t*1.5)/(1+3*Math.min(1,Math.max(0,n)))}update(t,n,o){this.hits.length=0,this.started.length=0;for(let s=0;s<this.zones;s++){if(t>=this.next[s]){this.started.push(s);const i=this.cursor[s];this.cursor[s]=(i+1)%this.slots;const l=(s*this.slots+i)*2;this.pulses[l]=t,this.pulses[l+1]=o[s],this.arrived[s*this.slots+i]=0,this.next[s]=t+Je.interval(this.rng(),n[s])}for(let i=0;i<this.slots;i++){const l=s*this.slots+i;this.arrived[l]||t>=this.pulses[l*2]+this.pulses[l*2+1]&&(this.arrived[l]=1,this.hits.push(s))}}return this.hits}}const ze=.6,Vn=`
  attribute float aZone;
  attribute float aFace;
  uniform float uTop;
  uniform float uHeight[${L}];
  varying vec3 vN;
  varying vec3 vV;
  varying vec3 vW;
  varying float vDepth;
  varying float vZone;
  varying float vFace;
  void main() {
    int z = int(aZone + 0.5);
    vec3 p = vec3(position.x, uTop - position.y * uHeight[z], position.z);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    vW = p;
    vDepth = position.y;
    vZone = aZone;
    vFace = aFace;
    gl_Position = projectionMatrix * mv;
  }
`,Kt=`
  uniform float uTime;
  uniform float uLight;
  uniform vec3 uColors[${L}];
  uniform float uRise[${L}];
  uniform float uFlash[${L}];
  uniform float uActive[${L}];
  // Light rising from the bottom (depth 1) to the top (0) in RISE_S, then fading out.
  float riseAt(int z, float depth) {
    float age = uTime - uRise[z];
    if (age < 0.0 || age > 2.0) return 0.0;
    float front = 1.0 - clamp(age / ${ze.toFixed(2)}, 0.0, 1.0);
    float filled = step(front, depth) * exp(-max(0.0, age - ${ze.toFixed(2)}) * 2.6);
    float bd = (depth - front) / 0.07;
    float band = exp(-bd * bd) * step(age, ${ze.toFixed(2)} + 0.1);
    return filled * 0.55 + band * 1.3;
  }
`,Nn=`
  ${Kt}
  uniform vec2 uPlug[${L}];
  uniform float uBody;
  uniform float uRim;
  uniform float uSparkle;
  varying vec3 vN;
  varying vec3 vV;
  varying vec3 vW;
  varying float vDepth;
  varying float vZone;
  varying float vFace;
  // Glitter: the glass is cut into ~0.9-unit cells; about one cell in five holds a tiny speck that
  // flashes on its own rhythm (white-hot, so the bloom turns it into a star).
  float glitter(vec3 w) {
    vec3 cell = floor(w * 1.1);
    vec3 h = fract(sin(vec3(dot(cell, vec3(127.1, 311.7, 74.7)), dot(cell, vec3(269.5, 183.3, 246.1)), dot(cell, vec3(113.5, 271.9, 124.6)))) * 43758.5453);
    if (h.x < 0.8) return 0.0;
    vec3 speck = (cell + 0.2 + 0.6 * h) / 1.1;
    float d = length(w - speck) * 1.1;
    float flash = pow(max(sin(uTime * (1.5 + h.y * 3.0) + h.z * 40.0), 0.0), 12.0);
    return exp(-d * d * 90.0) * flash;
  }
  void main() {
    int z = int(vZone + 0.5);
    vec3 c = uColors[z];
    float ndv = min(1.0, abs(dot(normalize(vN), normalize(vV))));
    float fres = pow(1.0 - ndv, 3.0);
    // Colour strongest at the top, thinning toward the bottom; a light inner haze.
    float grad = mix(1.0, 0.3, vDepth);
    float haze = 0.05 + 0.04 * sin(vW.x * 0.7 + vW.z * 0.5 + vDepth * 5.0 + uTime * 0.3);
    float rise = riseAt(z, vDepth);
    float glow = uFlash[z] + uActive[z] * 0.35;
    // Bottom face: a bright plug and a ring spreading out from it.
    float plugGlow = 0.0;
    if (vFace > 0.5 && vFace < 1.5) {
      float d = distance(vW.xz, uPlug[z]);
      float rr = mod(uTime * 2.2, 7.0);
      float rd = (d - rr) / 0.6;
      float ring = exp(-rd * rd) * (1.0 - rr / 7.0);
      plugGlow = exp(-d * d / 3.0) * 1.0 + ring * 0.7;
    }
    vec3 rgb;
    float cover;
    if (uLight > 0.5) {
      cover = (uBody * grad + fres * uRim * 0.6 + haze) * (1.0 + glow * 0.5) + rise * 0.25 + plugGlow * 0.25;
      rgb = c * cover + mix(c, vec3(1.0), 0.5) * (rise + plugGlow) * 0.35;
      // Sparkle: glitter specks plus a moving glint sweeping across the faces.
      float sweep = pow(max(sin(vW.x * 0.35 + vW.y * 0.5 - vW.z * 0.25 - uTime * 1.3), 0.0), 40.0) * fres;
      float spark = uSparkle * (glitter(vW) * 3.0 + sweep * 0.9);
      rgb += vec3(1.0, 0.98, 0.94) * spark;
      cover += spark * 0.6;
    } else {
      // Several glass faces overlap on screen: keep each one faint so the stack doesn't blow out.
      rgb = c * (uBody * grad * (1.0 + glow) + fres * uRim * grad + haze * 0.4) + mix(c, vec3(1.0), 0.35) * (rise * 0.25 + plugGlow * 0.4);
      cover = uBody * 1.5 * grad + fres * 0.1;
    }
    gl_FragColor = vec4(rgb, clamp(cover, 0.0, 1.0));
  }
`,Hn=`
  attribute float aZone;
  uniform float uTop;
  uniform float uHeight[${L}];
  varying float vDepth;
  varying float vZone;
  void main() {
    int z = int(aZone + 0.5);
    vec3 p = vec3(position.x, uTop - position.y * uHeight[z], position.z);
    vDepth = position.y;
    vZone = aZone;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`,$n=`
  ${Kt}
  uniform float uEdge;
  varying float vDepth;
  varying float vZone;
  void main() {
    int z = int(vZone + 0.5);
    vec3 c = uColors[z];
    float grad = mix(1.0, 0.35, vDepth);
    float k = uEdge * grad * (1.0 + uFlash[z] + uActive[z] * 0.5) + riseAt(z, vDepth) * 0.8;
    gl_FragColor = uLight > 0.5 ? vec4(c * 0.45 * min(1.0, k), min(1.0, k)) : vec4(mix(c, vec3(1.0), 0.25) * k, 0.0);
  }
`;function Mt(e){e.blending=To,e.blendSrc=it,e.blendDst=lt,e.blendSrcAlpha=it,e.blendDstAlpha=lt}function qn(){const e=D(r=>r.ground),t=K(),n=_(r=>r.settings.reduceMotion),o=y.useMemo(()=>e?Wt(e):[],[e]),s=y.useMemo(()=>{if(!e)return null;const r=Un(o,e),c=new ne;c.setAttribute("position",new E(r.position,3)),c.setAttribute("normal",new E(r.normal,3)),c.setAttribute("aZone",new E(r.zone,1)),c.setAttribute("aFace",new E(r.face,1)),c.setIndex(new E(r.index,1));const g=new ne;return g.setAttribute("position",new E(r.edges,3)),g.setAttribute("aZone",new E(r.edgeZone,1)),c.computeBoundingSphere(),c.boundingSphere&&(c.boundingSphere.radius+=35),g.computeBoundingSphere(),g.boundingSphere&&(g.boundingSphere.radius+=35),{body:c,edges:g}},[e,o]),i=y.useMemo(()=>({uTime:{value:0},uTop:{value:$t},uLight:{value:0},uHeight:{value:new Float32Array(L).fill(1)},uColors:{value:Array.from({length:L},()=>new W)},uRise:{value:new Float32Array(L).fill(-1e6)},uFlash:{value:new Float32Array(L)},uActive:{value:I.zoneActivity}}),[]),l=y.useMemo(()=>{const r=new se({vertexShader:Vn,fragmentShader:Nn,transparent:!0,depthWrite:!1,side:It,uniforms:{...i,uPlug:{value:Array.from({length:L},()=>new zt)},uBody:{value:.2},uRim:{value:1},uSparkle:{value:0}}}),c=new se({vertexShader:Hn,fragmentShader:$n,transparent:!0,depthWrite:!1,uniforms:{...i,uEdge:{value:1}}});return Mt(pe(r)),Mt(pe(c)),{body:r,edges:c}},[i]);y.useEffect(()=>{o.forEach(c=>{i.uColors.value[c.index].copy(G(le(c.category_index,t))),l.body.uniforms.uPlug.value[c.index].set(c.plug[0],c.plug[1])});const r=t.additiveGlow;i.uLight.value=r?0:1,l.body.uniforms.uBody.value=r?.07:.16,l.body.uniforms.uRim.value=r?.45:.55,l.edges.uniforms.uEdge.value=r?.95:.85,l.body.uniforms.uSparkle.value=n?0:t.sparkle},[t,o,i,l,n]),y.useEffect(()=>()=>{s==null||s.body.dispose(),s==null||s.edges.dispose()},[s]),y.useEffect(()=>()=>{l.body.dispose(),l.edges.dispose()},[l]);const f=y.useMemo(()=>({height:-1}),[]);return Z(()=>{const r=ae();I.heightVersion!==f.height&&(f.height=I.heightVersion,Ve(o,I.extra,i.uHeight.value)),n||(i.uTime.value=r);const c=i.uFlash.value;if(c.fill(0),I.flash.size>0)for(const d of o)for(const h of d.crates){const u=I.flash.get(h.id);u!==void 0&&(c[d.index]=Math.max(c[d.index],Math.exp(-(r-u)*2.5)*(t.additiveGlow?.55:.45)))}const g=i.uRise.value;for(let d=0;d<L;d++)g[d]=n?-1e6:I.zoneRise[d]}),!s||o.length===0?null:S.jsxs("group",{name:"knowledge-blocks",children:[S.jsx("mesh",{geometry:s.body,material:l.body,raycast:()=>null,renderOrder:1}),S.jsx("lineSegments",{geometry:s.edges,material:l.edges,raycast:()=>null,renderOrder:1})]})}const we=2.4,de=[0,0],kt=3.6,At=2.2,Wn={high:40,low:12},Kn={high:14,low:6},je=250;function Yn(){const e=D(u=>u.ground),t=K(),n=_(u=>u.settings.reduceMotion),o=Nt(),{size:s,camera:i}=ee(),l=y.useMemo(()=>e?Wt(e):[],[e]),f=y.useMemo(()=>{const u=Ve(l,I.extra,new Float32Array(L)),a=l.map(x=>On(x,$t-u[x.index]));return{heights:u,paths:a}},[l]),r=y.useMemo(()=>n?null:new Vt(pn[o],L,Ht),[n,o]),c=y.useMemo(()=>new Je(L,xe(23),4,ae()),[]),g=y.useMemo(()=>({travel:new Float32Array(L).fill(At),seenHeight:-1,heights:new Float32Array(L),lift:new Float32Array(L)}),[]),d=y.useMemo(()=>xe(5),[]),h=y.useMemo(()=>l.map(u=>{const[a,x,p]=ie(le(u.category_index,t)),v=t.additiveGlow?1.5:.8;return[a*v,x*v,p*v]}),[l,t]);return y.useEffect(()=>{if(!r)return;const u=r.material.uniforms;u.uSize.value=t.additiveGlow?.6:.65,u.uGain.value=t.additiveGlow?1.6:.75,u.uSpread.value=1,u.uConverge.value=0,u.uFadeIn.value=In,u.uMinPx.value=2.2,u.uSparkle.value=t.sparkle,r.material.blending=fe(t),r.material.needsUpdate=!0},[r,t]),y.useEffect(()=>{if(!r||l.length===0)return;const u=(m,M,k,C)=>{const F=(1+(d()*2-1)*.4)*k,T=kt/F;rt(d,de);const A=h[m],P=C!==1?[A[0]*C,A[1]*C,A[2]*C]:A;return r.emit(m,P,M,T,de[0]*we,de[1]*we,(1+(d()*2-1)*.4)*(C>1?1.3:1),3+d()*3),M+T};l.forEach(m=>r.setPath(m.index,St(f.paths[m.index],g.lift[m.index]))),r.commit();const a=new Map(l.map(m=>[m.category_index,m])),x=new Float32Array(L),p=new fn,v=m=>p.add(m);Me.batch.add(v);let b=0;const w=setInterval(()=>{const m=ae(),M=I.zoneActivity;for(const k of l)for(x[k.index]+=Wn[o]*(je/1e3)*(1+M[k.index]);x[k.index]>=1;)x[k.index]-=1,u(k.index,m+d()*(je/1e3),1+.6*M[k.index],1);if(++b%3===0){const k=new Map;for(const C of p.flush()){if(C.stage!=="fetched")continue;const F=a.get(C.category_index);if(!F){Ce(C.crate_id,C.count,m);continue}k.set(F.index,(k.get(F.index)??0)+C.count),M[F.index]=Math.min(1,M[F.index]+.12*Math.log2(1+C.count)),Ce(C.crate_id,C.count,m+kt/Math.min(2.2,1+.25*Math.log2(1+C.count)))}for(const[C,F]of k){const T=mn(F,o),A=Math.min(2.2,1+.25*Math.log2(1+F));let P=m;for(let R=0;R<T;R++)P=Math.max(P,u(C,m+R/T*1.2,A,1.5));P>I.lastEnd&&(I.lastEnd=P)}}r.commit(),I.poolUsed=r.used},je);return I.streamsLive=!0,()=>{I.streamsLive=!1,clearInterval(w),Me.batch.delete(v);for(const m of p.flush())m.stage==="fetched"&&Ce(m.crate_id,m.count,ae())}},[r,l,f,h,d,o,g]),y.useEffect(()=>()=>r==null?void 0:r.dispose(),[r]),Z((u,a)=>{const x=ae(),p=I.zoneActivity,v=Math.exp(-a/2.5);for(let m=0;m<L;m++)p[m]*=v;if(I.heightVersion!==g.seenHeight){g.seenHeight=I.heightVersion,Ve(l,I.extra,g.heights);for(const m of l){const M=f.heights[m.index]-g.heights[m.index];Math.abs(M-g.lift[m.index])<.001||(g.lift[m.index]=M,r==null||r.setPath(m.index,St(f.paths[m.index],M)))}}if(!r)return;for(let m=0;m<L;m++)g.travel[m]=At/(1+.8*p[m]);const b=c.update(x,p,g.travel);for(const m of c.started){if(m>=l.length)continue;const M=h[m];for(let k=0;k<Kn[o];k++)rt(d,de),r.emit(m,[M[0]*2.2,M[1]*2.2,M[2]*2.2],x-d()*.06,g.travel[m],de[0]*we*.35,de[1]*we*.35,1.5+d()*.5,5+d()*2)}c.started.length>0&&r.commit();for(const m of b){const M=l[m];M&&(I.zoneRise[m]=x,I.zoneFlash.set(M.category_index,x))}const w=r.material.uniforms;w.uNow.value=x,w.uScale.value=me(s.height,i.fov)}),!r||l.length===0?null:S.jsx("primitive",{object:r.object})}const Ft=.3;function Zn(e){var l,f;const t=_.getState(),n=D.getState();if(((l=t.highlightLabel)==null?void 0:l.kind)==="crate"&&t.highlightLabel.id===e){t.setHighlights(null,null);return}const o=(f=n.ground)==null?void 0:f.crates.find(r=>r.id===e),s=n.vectorsByCrate.get(e)??new Uint32Array(0),i=o?n.categories[o.category_index]:void 0;t.setHighlights(s,{kind:"crate",id:e,label:`Thùng #${e} · ${(i==null?void 0:i.code)??"?"} · ${s.length} bài`})}function Xn(){const e=D(A=>A.ground),t=K(),n=_(A=>A.cameraMode),o=_(A=>{var P,R;return((P=A.highlightLabel)==null?void 0:P.kind)==="crate"?A.highlightLabel.id:((R=A.highlightLabel)==null?void 0:R.kind)==="category"?-2-A.highlightLabel.id:-1}),s=V(A=>A.pulsingCrates),i=Ge(A=>A.visualActive&&!A.fading),l=y.useRef(null),f=y.useRef(-1),r=(e==null?void 0:e.grid_size[0])??1,c=(e==null?void 0:e.grid_size[1])??1,g=(e==null?void 0:e.tile_size)??1,d=r*c,h=y.useMemo(()=>{const A=new Int32Array(d).fill(-1);return e==null||e.crates.forEach(P=>A[P.cell[1]*r+P.cell[0]]=P.id),A},[e,d,r]),u=y.useMemo(()=>new Map((e==null?void 0:e.crates.map(A=>[A.id,A.cell[1]*r+A.cell[0]]))??[]),[e,r]),a=y.useRef(new Float32Array(d*3)),x=y.useMemo(()=>{const A=new Map;return e==null||e.crates.forEach(P=>{const R=A.get(P.category_index)??[];R.push(P.cell[1]*r+P.cell[0]),A.set(P.category_index,R)}),A},[e,r]),p=y.useMemo(()=>new _o(g*.93,Ft,g*.93),[g]),v=y.useMemo(()=>new Eo({transparent:!0,opacity:.94}),[]),b=y.useMemo(()=>{const A=[],P=r*g/2,R=c*g/2;for(let z=0;z<=r;z++)A.push(-P+z*g,.02,-R,-P+z*g,.02,R);for(let z=0;z<=c;z++)A.push(-P,.02,-R+z*g,P,.02,-R+z*g);const j=new ne;return j.setAttribute("position",new Be(A,3)),j},[r,c,g]),w=y.useMemo(()=>new Ae({transparent:!0,toneMapped:!1}),[]),m=y.useRef(0);y.useLayoutEffect(()=>{const A=l.current;if(!A||!e)return;const P=new zo;for(let R=0;R<c;R++)for(let j=0;j<r;j++){const[z,,N]=We([j,R],e.grid_size,g);P.position.set(z,-Ft/2,N),P.updateMatrix(),A.setMatrixAt(R*r+j,P.matrix)}A.instanceMatrix.needsUpdate=!0},[e,c,r,g]),y.useEffect(()=>{const A=l.current;if(!A||!e)return;const P=G(t.groundBase),R=new W,j=new Map(e.crates.map(z=>[z.id,z]));for(let z=0;z<d;z++){const N=h[z]>=0?j.get(h[z]):void 0;if(N){R.copy(G(le(N.category_index,t))).multiplyScalar(t.tileSaturation);const B=o===N.id||o===-2-N.category_index;o!==-1&&!B&&R.lerp(P,.6),B&&R.multiplyScalar(t.additiveGlow?1.6:1.1)}else R.copy(P);a.current.set([R.r,R.g,R.b],z*3),A.setColorAt(z,R)}A.instanceColor&&(A.instanceColor.needsUpdate=!0),w.color.copy(G(t.groundLine)),m.current=(t.additiveGlow?.55:.8)*.6,w.opacity=m.current*Y.value},[t,e,d,h,o,w]),y.useEffect(()=>()=>{p.dispose(),v.dispose(),b.dispose(),w.dispose()},[p,v,b,w]);const M=y.useRef(new Set),k=y.useMemo(()=>new W,[]);if(Z((A,P)=>{const R=l.current;if(!R)return;const j=(n==="ground"?t.groundSeeThrough:i?Math.min(t.groundOpacity,.62):t.groundOpacity)*Y.value;Y.value<1&&(w.opacity=m.current*Y.value),v.opacity+=(j-v.opacity)*Math.min(1,P*9),v.depthWrite=v.opacity>.8;const z=A.clock.elapsedTime;let N=!1;for(const B of M.current){if(s.has(B))continue;const U=u.get(B);U!==void 0&&(k.fromArray(a.current,U*3),R.setColorAt(U,k),N=!0)}M.current=s;for(const B of s){const U=u.get(B);if(U===void 0)continue;const H=1+(t.additiveGlow?1.4:.35)*(.5+.5*Math.sin(z*5+B));k.fromArray(a.current,U*3).multiplyScalar(H),R.setColorAt(U,k),N=!0}if(I.flash.size>0){const B=ae();for(const[U,H]of I.flash){const $=u.get(U);if($===void 0||s.has(U))continue;const q=B-H;k.fromArray(a.current,$*3),q<1.2&&k.multiplyScalar(1+(t.additiveGlow?1.8:.18)*Math.exp(-q*3)),R.setColorAt($,k),N=!0}}if(I.zoneFlash.size>0){const B=ae();for(const[U,H]of I.zoneFlash){const $=B-H,q=$<.9?1+(t.additiveGlow?.45:.08)*Math.exp(-$*4):1;for(const X of x.get(U)??[])s.has(h[X])||I.flash.has(h[X])||(k.fromArray(a.current,X*3).multiplyScalar(q),R.setColorAt(X,k));$>=.9&&I.zoneFlash.delete(U),N=!0}}N&&R.instanceColor&&(R.instanceColor.needsUpdate=!0)}),!e)return null;const C=A=>{const P=A.instanceId??-1,R=_.getState();if(R.hoveredVectorIndex!==null)return;const j=P>=0?h[P]:-1;j>=0?(R.setTooltip({kind:"crate",id:j,x:A.nativeEvent.clientX,y:A.nativeEvent.clientY}),document.body.style.cursor="pointer"):f.current>=0&&(R.setTooltip(null),document.body.style.cursor=""),f.current=j},F=()=>{var A;f.current=-1,((A=_.getState().tooltip)==null?void 0:A.kind)==="crate"&&_.getState().setTooltip(null),document.body.style.cursor=""},T=A=>{if(A.delta>4||_.getState().hoveredVectorIndex!==null)return;const P=A.instanceId??-1,R=P>=0?h[P]:-1;R<0||(A.stopPropagation(),Zn(R))};return S.jsxs("group",{children:[S.jsx("instancedMesh",{ref:l,args:[p,v,d],onPointerMove:C,onPointerOut:F,onClick:T,renderOrder:2}),S.jsx("lineSegments",{geometry:b,material:w,renderOrder:3})]})}const Jn=[90,170,70];function Qn(){const e=K(),t=e.daySky;return S.jsxs(S.Fragment,{children:[S.jsx("ambientLight",{intensity:e.ambient}),S.jsx("hemisphereLight",{args:[ue(e.bgHorizon),ue(e.groundBase),e.ambient*1.4]}),S.jsx("directionalLight",{position:[...t?on:Jn],intensity:e.sun,color:t?ue(e.sunColor):void 0}),t&&S.jsx("directionalLight",{position:[...nn],intensity:e.sun*.45}),S.jsx("directionalLight",{position:[-80,60,-90],intensity:e.sun*.35,color:ue(e.uiAccent)}),S.jsx("pointLight",{position:[0,90,0],intensity:e.name==="dark"?1800:400,distance:160,color:ue(e.trunkVein)})]})}function ea(){const e=K(),t=_(o=>o.qualityTier);if(t>=3)return null;const n=t>=2;if(De){const o=e.name==="dark"?{intensity:1.35,threshold:.18}:{intensity:.35,threshold:.75};return S.jsxs(ut,{multisampling:4,children:[S.jsx(ft,{mipmapBlur:!0,intensity:o.intensity,luminanceThreshold:o.threshold,luminanceSmoothing:.25,radius:.72}),S.jsx(dt,{eskil:!1,offset:.28,darkness:e.name==="dark"?.62:.22})]})}return S.jsxs(ut,{multisampling:0,enableNormalPass:!1,children:[S.jsx(ft,{mipmapBlur:!0,resolutionScale:n?.25:.35,levels:n?3:4,intensity:e.bloomIntensity,luminanceThreshold:e.bloomThreshold,luminanceSmoothing:.2,radius:.72}),S.jsx(dt,{eskil:!1,offset:.28,darkness:e.name==="dark"?.62:.22})]})}const ta={high:0,low:2};function oa(e,t){return Math.min(e===0?1.15:1,t)}const na=2500;function aa(){const e=_(f=>f.settings.quality),t=_(f=>f.qualityTier),n=ee(f=>f.set),o=ee(f=>f.setDpr);y.useEffect(()=>{_.getState().setQualityTier(e==="auto"?0:ta[e])},[e]),y.useEffect(()=>{const f=oa(t,globalThis.devicePixelRatio||1);n(r=>({viewport:{...r.viewport,initialDpr:f}})),o(f)},[t,n,o]);const[s,i]=y.useState(!1);y.useEffect(()=>{const f=setTimeout(()=>i(!0),na);return()=>clearTimeout(f)},[]);const l=f=>{const r=_.getState().qualityTier;_.getState().setQualityTier(Math.min(3,Math.max(0,r+f)))};return S.jsx(S.Fragment,{children:e==="auto"&&s&&S.jsx(ao,{bounds:f=>f>100?[75,115]:[40,58],flipflops:4,onDecline:()=>l(1),onIncline:()=>l(-1),onFallback:()=>_.getState().setQualityTier(2)})})}const Ie=120,Ne=new Set;function sa(e){return Ne.add(e),()=>{Ne.delete(e)}}let Yt=null;function ra(){const e=y.useMemo(()=>({deltas:new Float32Array(Ie),head:0,count:0,lastLog:0,lastRender:0}),[]);return Z(({gl:t})=>{const n=performance.now();if(e.lastRender===0){e.lastRender=n;return}const o=n-e.lastRender;if(e.lastRender=n,o<=0||o>1e3)return;const s=e.head%Ie;if(e.deltas[s]=o,e.head++,e.count<Ie&&e.count++,e.head%10===0&&e.count>10){const i=e.count;let l=0,f=0,r=1/0,c=0;for(let b=0;b<i;b++){const w=e.deltas[b],m=1e3/w;l+=w,f+=m,m<r&&(r=m),m>c&&(c=m)}const g=l/i,d=f/i;let h=0,u=0;for(let b=0;b<i;b++){const w=e.deltas[b],m=1e3/w;h+=(w-g)*(w-g),u+=(m-d)*(m-d)}const a=Math.sqrt(h/i),x=Math.sqrt(u/i),p=1e3/o,v={fps:p,meanFps:d,devFps:x,minFps:r,maxFps:c,frameTimeMs:o,meanFrameTimeMs:g,devFrameTimeMs:a,drawCalls:t.info.render.calls,triangles:t.info.render.triangles,tier:_.getState().qualityTier,dpr:t.getPixelRatio()};Yt=v,window.__rktPerf={getSnapshot:()=>v};for(const b of Ne)b(v);n-e.lastLog>2e3&&(e.lastLog=n,console.info(`[PERF REALTIME] FPS: ${p.toFixed(1)} | Mean: ${d.toFixed(1)} ± ${x.toFixed(1)} | Min: ${r.toFixed(1)} | FrameTime: ${g.toFixed(1)}ms ± ${a.toFixed(1)}ms | Calls: ${t.info.render.calls} | Tris: ${t.info.render.triangles} | Tier: ${v.tier} (DPR ${v.dpr.toFixed(2)})`))}}),null}function ia({defaultOpen:e=!0}){const[t,n]=y.useState(()=>e||new URLSearchParams(window.location.search).has("perf")),[o,s]=y.useState(()=>Yt),i=_(r=>r.setQualityTier),l=_(r=>r.updateSettings);if(y.useEffect(()=>{const r=c=>{c.shiftKey&&(c.key==="P"||c.key==="p")&&n(g=>!g)};return window.addEventListener("keydown",r),()=>window.removeEventListener("keydown",r)},[]),y.useEffect(()=>sa(r=>{s(r)}),[]),!t||!o)return null;const f=o.fps>=90?"text-cyan-400":o.fps>=58?"text-emerald-400":o.fps>=40?"text-amber-400":"text-rose-400";return S.jsxs("div",{style:{position:"fixed",bottom:"16px",right:"16px",zIndex:99999,pointerEvents:"auto"},className:"bg-black/85 backdrop-blur-md border border-white/15 rounded-md p-3 text-xs font-mono text-neutral-200 shadow-2xl select-none min-w-[240px]",children:[S.jsxs("div",{className:"flex items-baseline justify-between border-b border-white/10 pb-2 mb-2",children:[S.jsxs("div",{className:"flex items-baseline gap-2",children:[S.jsx("span",{className:`text-2xl font-bold ${f}`,children:o.fps.toFixed(1)}),S.jsx("span",{className:"text-micro text-neutral-400 font-sans tracking-wide uppercase",children:"FPS"})]}),S.jsxs("div",{className:"text-right",children:[S.jsxs("div",{className:"text-neutral-300 font-semibold",children:["Mean: ",o.meanFps.toFixed(1)," ",S.jsxs("span",{className:"text-neutral-400 font-normal",children:["± ",o.devFps.toFixed(1)]})]}),S.jsxs("div",{className:"text-micro text-neutral-400",children:["Min: ",o.minFps.toFixed(1)," · Max: ",o.maxFps.toFixed(1)]})]})]}),S.jsxs("div",{className:"flex justify-between items-center py-0.5 text-neutral-300",children:[S.jsx("span",{className:"text-neutral-400",children:"Frame Time:"}),S.jsxs("span",{children:[o.meanFrameTimeMs.toFixed(1)," ms ",S.jsxs("span",{className:"text-neutral-400",children:["± ",o.devFrameTimeMs.toFixed(1)," ms"]})]})]}),S.jsxs("div",{className:"flex justify-between items-center py-0.5 text-neutral-300",children:[S.jsx("span",{className:"text-neutral-400",children:"Draw Calls / Tris:"}),S.jsxs("span",{children:[o.drawCalls," / ",(o.triangles/1e3).toFixed(1),"k"]})]}),S.jsxs("div",{className:"flex justify-between items-center py-0.5 text-neutral-300",children:[S.jsx("span",{className:"text-neutral-400",children:"Tier / DPR:"}),S.jsxs("span",{children:["Tier ",o.tier," · DPR ",o.dpr.toFixed(2)]})]}),S.jsxs("div",{className:"mt-2 pt-2 border-t border-white/10 flex items-center justify-between gap-1 text-micro",children:[S.jsx("span",{className:"text-neutral-400 font-sans",children:"Quick Tier:"}),S.jsxs("div",{className:"flex gap-1",children:[S.jsx("button",{onClick:()=>{l({quality:"high"}),i(0)},className:`px-1.5 py-0.5 rounded-xs ${o.tier===0?"bg-indigo-600 text-white font-bold":"bg-neutral-800 hover:bg-neutral-700 text-neutral-300"}`,title:"Tier 0: Full Bloom",children:"T0"}),S.jsx("button",{onClick:()=>{l({quality:"auto"}),i(1)},className:`px-1.5 py-0.5 rounded-xs ${o.tier===1?"bg-indigo-600 text-white font-bold":"bg-neutral-800 hover:bg-neutral-700 text-neutral-300"}`,title:"Tier 1: DPR 1.0 + Bloom",children:"T1"}),S.jsx("button",{onClick:()=>{l({quality:"low"}),i(2)},className:`px-1.5 py-0.5 rounded-xs ${o.tier===2?"bg-indigo-600 text-white font-bold":"bg-neutral-800 hover:bg-neutral-700 text-neutral-300"}`,title:"Tier 2: Light Bloom",children:"T2"}),S.jsx("button",{onClick:()=>{i(3)},className:`px-1.5 py-0.5 rounded-xs ${o.tier===3?"bg-emerald-600 text-white font-bold":"bg-neutral-800 hover:bg-neutral-700 text-neutral-300"}`,title:"Tier 3: Max Speed (No PostFX - 100+ FPS)",children:"Max"})]})]})]})}const la=`
  varying vec3 vDir;
  varying vec3 vView;
  void main() {
    vDir = normalize(position);
    // Day sky is seen from the eye: horizon at eye level and the sun exactly where the light comes from.
    vView = (modelMatrix * vec4(position, 1.0)).xyz - cameraPosition;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`,ca=`
  uniform vec3 uTop;
  uniform vec3 uHorizon;
  uniform vec3 uBottom;
  uniform float uDay;
  uniform vec3 uHaze;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  varying vec3 vDir;
  varying vec3 vView;
  void main() {
    vec3 d = uDay > 0.5 ? normalize(vView) : normalize(vDir);
    float h = d.y;
    if (uDay < 0.5) {
      vec3 c = h > 0.0 ? mix(uHorizon, uTop, pow(clamp(h, 0.0, 1.0), 0.55)) : mix(uHorizon, uBottom, pow(clamp(-h, 0.0, 1.0), 0.4));
      gl_FragColor = vec4(c, 1.0);
      return;
    }
    // Clear daytime sky. Rayleigh scattering: the air path shrinks fast above the horizon, so the blue
    // deepens within a few degrees and saturates toward the zenith.
    float up = max(h, 0.0);
    vec3 c = mix(uHorizon, uTop, 1.0 - exp(-up * 5.5));
    // The world floats in the sky: below the horizon the same clear blue returns, a little lighter.
    float down = max(-h, 0.0);
    c = h < 0.0 ? mix(uHorizon, mix(uTop, uHorizon, 0.35), 1.0 - exp(-down * 4.0)) : c;
    // Aerial perspective: a thin, almost white haze line right at the horizon.
    c = mix(c, uHaze, exp(-abs(h) * 28.0) * 0.7);
    // The sun lifts the whole sky: a broad, bright blue-white bloom over a large part of the dome …
    float mu = max(dot(d, uSunDir), 0.0);
    c = mix(c, mix(uHorizon, vec3(1.0), 0.45), pow(mu, 3.0) * 0.55);
    // … Mie forward scattering (aureole + corona) …
    c += uSunColor * (pow(mu, 24.0) * 0.35 + pow(mu, 260.0) * 0.9);
    // … and the disc itself, far above 1.0 so the bloom pass turns it into a glare.
    float disc = smoothstep(0.99955, 0.99975, mu);
    c = mix(c, uSunColor * 4.0, disc);
    // Dither away 8-bit banding in the smooth gradient.
    c += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
    gl_FragColor = vec4(c, 1.0);
  }
`;function ua(){const e=K(),t=ee(o=>o.scene),n=y.useMemo(()=>new se({vertexShader:la,fragmentShader:ca,side:jo,depthWrite:!1,fog:!1,uniforms:{uTop:{value:new W},uHorizon:{value:new W},uBottom:{value:new W},uDay:{value:0},uHaze:{value:new W},uSunDir:{value:new te(...Xe).normalize()},uSunColor:{value:new W}}}),[]);return y.useEffect(()=>{n.uniforms.uTop.value.copy(G(e.bgTop)),n.uniforms.uHorizon.value.copy(G(e.bgHorizon)),n.uniforms.uBottom.value.copy(G(e.fog)),n.uniforms.uDay.value=e.daySky?1:0,n.uniforms.uHaze.value.copy(G(e.skyHaze)),n.uniforms.uSunColor.value.copy(G(e.sunColor)),t.fog instanceof ct?(t.fog.color.copy(G(e.fog)),t.fog.near=e.fogNear,t.fog.far=e.fogFar):t.fog=new ct(G(e.fog),e.fogNear,e.fogFar),t.background=G(e.bg)},[e,n,t]),y.useEffect(()=>()=>n.dispose(),[n]),S.jsxs(S.Fragment,{children:[S.jsx("mesh",{material:n,renderOrder:-10,frustumCulled:!1,children:S.jsx("sphereGeometry",{args:[1400,32,16]})}),e.stars&&S.jsx(so,{radius:700,depth:300,count:2500,factor:9,saturation:.6,fade:!0,speed:.4})]})}function fa(e,t,n){const o=Math.min(1,Math.max(0,(n-e)/(t-e)));return o*o*(3-2*o)}function da(e,t=.15,n=1.2){const o=Math.min(1,Math.max(0,e));return t+(n*.35-t)*o*o}function ha(e,t,n){const o=fa(.3,.9,e);return[t[0]+(n[0]-t[0])*o,t[1]+(n[1]-t[1])*o,t[2]+(n[2]-t[2])*o]}function Zt(e,t){const n=t.tubularSegments??24,o=t.radialSegments??8,s=e.map(w=>new te(w[0],w[1],w[2]));s.length===1&&s.push(s[0].clone().add(new te(0,.01,0)));const i=new Io(s,!1,"centripetal"),l=i.computeFrenetFrames(n,!1),f=(n+1)*(o+1),r=new Float32Array(f*3),c=new Float32Array(f*3),g=new Float32Array(f*2),d=new Float32Array(f*3),h=new Float32Array(f).fill(t.branchId??0),u=new te,a=new te,x=Et(o);let p=0;for(let w=0;w<=n;w++){const m=w/n;i.getPointAt(m,u);const M=t.radius(m),k=l.normals[w],C=l.binormals[w],F=t.color?t.color(m):[1,1,1];for(let T=0;T<=o;T++){const A=x[T*2+1],P=-x[T*2];a.set(P*k.x+A*C.x,P*k.y+A*C.y,P*k.z+A*C.z).normalize(),r[p*3]=u.x+M*a.x,r[p*3+1]=u.y+M*a.y,r[p*3+2]=u.z+M*a.z,c[p*3]=a.x,c[p*3+1]=a.y,c[p*3+2]=a.z,g[p*2]=T/o,g[p*2+1]=m,d[p*3]=F[0],d[p*3+1]=F[1],d[p*3+2]=F[2],p++}}const v=[];for(let w=0;w<n;w++)for(let m=0;m<o;m++){const M=w*(o+1)+m,k=(w+1)*(o+1)+m;v.push(M,k,M+1,k,k+1,M+1)}const b=new ne;return b.setAttribute("position",new E(r,3)),b.setAttribute("normal",new E(c,3)),b.setAttribute("uv",new E(g,2)),b.setAttribute("color",new E(d,3)),b.setAttribute("branchId",new E(h,1)),b.setIndex(v),b}function pa(e,t,n){return Math.sin(e*5+t*.35+n)*.5+Math.sin(e*11-t*.9+n*2.1)*.3+Math.sin(e*23+t*2.3+n*.7)*.2}function ma(e){const t=e.height,n=e.baseRadius,o=e.topRadius,s=e.radialSegments??40,i=e.heightSegments??48,l=e.seed??1.7,f=i+2,r=f*(s+1),c=new Float32Array(r*3),g=new Float32Array(r*2),d=new Float32Array(r*3),h=Et(s);let u=0;for(let p=0;p<f;p++){const v=p===f-1,b=Math.min(1,p/i),w=v?t+1.5:b*t-.6,m=b*1.1,M=Fe(m);for(let k=0;k<=s;k++){const C=k/s*Math.PI*2,F=3.4*Math.exp(-Math.max(0,w)/2.6)*(.75+.25*Math.sin(C*5+l));let T=n+(o-n)*Math.pow(b,.8)+F+pa(C+m,w,l)*.32*(1-b*.4);v&&(T=.5);const A=yo({re:h[k*2],im:h[k*2+1]},M);c[u*3]=A.re*T,c[u*3+1]=w,c[u*3+2]=A.im*T,g[u*2]=k/s,g[u*2+1]=v?1:b,d[u*3]=e.color[0],d[u*3+1]=e.color[1],d[u*3+2]=e.color[2],u++}}const a=[];for(let p=0;p<f-1;p++)for(let v=0;v<s;v++){const b=p*(s+1)+v,w=(p+1)*(s+1)+v;a.push(b,w,b+1,w,w+1,b+1)}const x=new ne;return x.setAttribute("position",new E(c,3)),x.setAttribute("uv",new E(g,2)),x.setAttribute("color",new E(d,3)),x.setAttribute("branchId",new E(new Float32Array(r),1)),x.setIndex(a),x.computeVertexNormals(),x}function ga(e,t,n=Math.random){const o=e.length*t,s=new Float32Array(o),i=new Float32Array(o),l=new Float32Array(o);let f=0;for(let r=0;r<e.length;r++)for(let c=0;c<t;c++)s[f]=r,i[f]=(c+n()*.8)/t,l[f]=.045+n()*.04,f++;return{pathIndex:s,phase:i,speed:l,count:o}}const va=35,Xt=4.2,Jt=2.1;function xa(){return ma({height:va,baseRadius:Xt,topRadius:Jt,color:[1,1,1]})}function ya(){const e=D(d=>d.tree),t=D(d=>d.nodesById),n=K(),o=V(d=>d.branchMarks),s=_(d=>d.settings.reduceMotion),i=y.useMemo(()=>e.reduce((d,h)=>Math.max(d,h.id),0),[e]),l=y.useMemo(()=>{const d=new Ke(new Uint8Array((i+1)*4),i+1,1,Ye);return d.magFilter=d.minFilter=Ze,d.needsUpdate=!0,d},[i]),f=y.useMemo(()=>({uTime:{value:0},uMarks:{value:l},uMarkCount:{value:i+1},uVeinColor:{value:new W},uVeinIntensity:{value:1},uSelfGlow:{value:.2},uChosenColor:{value:new W},uBarkGrain:{value:0},uSunView:{value:new te(0,0,1)},uSunColor:{value:new W},uSunGlow:{value:0},uIntro:Y}),[l,i]),{geometry:r,ranges:c}=y.useMemo(()=>{var x;const d=[xa()],h=[{start:0,count:d[0].attributes.position.count,depth:0,category:-1}];let u=h[0].count;for(const p of e){if(p.depth===0||p.path.length<2)continue;const v=p.depth===1?Jt*.85:(((x=t.get(p.parent_id??-1))==null?void 0:x.radius)??1)*.8,b=Zt(p.path,{radius:m=>v+(p.radius-v)*Math.pow(m,.7),tubularSegments:p.depth===1?22:12,radialSegments:p.depth===1?10:6,branchId:p.id});d.push(b);const w=b.attributes.position.count;h.push({start:u,count:w,depth:p.depth,category:p.dominant_category}),u+=w}const a=Dt(d,!1);return d.forEach(p=>p.dispose()),a.computeBoundingSphere(),{geometry:a,ranges:h}},[e,t]),g=y.useMemo(()=>{const d=new Gt({vertexColors:!0,roughness:.88,metalness:.02});return d.onBeforeCompile=h=>{Object.assign(h.uniforms,f),h.vertexShader=h.vertexShader.replace("#include <common>",`#include <common>
          attribute float branchId;
          uniform sampler2D uMarks;
          uniform float uMarkCount;
          varying float vMark;
          varying vec2 vBarkUv;`).replace("#include <begin_vertex>",`#include <begin_vertex>
          vMark = floor(texture2D(uMarks, vec2((branchId + 0.5) / uMarkCount, 0.5)).r * 255.0 + 0.5);
          vBarkUv = uv;`),h.fragmentShader=h.fragmentShader.replace("#include <common>",`#include <common>
          uniform float uTime;
          uniform vec3 uVeinColor;
          uniform float uVeinIntensity;
          uniform float uSelfGlow;
          uniform vec3 uChosenColor;
          uniform float uBarkGrain;
          uniform vec3 uSunView;
          uniform vec3 uSunColor;
          uniform float uSunGlow;
          uniform float uIntro;
          varying float vMark;
          varying vec2 vBarkUv;`).replace("#include <color_fragment>",`#include <color_fragment>
          // Wood grain (light theme): wavy dark furrows running along the branch + finer streaks.
          float bend = sin(vBarkUv.y * 23.0 + sin(vBarkUv.x * 31.4) * 1.3) * 0.035;
          float furrow = pow(abs(sin((vBarkUv.x + bend) * 6.2831 * 7.0)), 5.0);
          float streak = 0.5 + 0.5 * sin((vBarkUv.x + bend * 2.0) * 6.2831 * 23.0 + vBarkUv.y * 9.0);
          diffuseColor.rgb *= 1.0 - uBarkGrain * (0.4 * furrow + 0.1 * streak);
          float rejected = step(1.5, vMark);
          diffuseColor.rgb *= 1.0 - rejected * 0.6;`).replace("#include <emissivemap_fragment>",`#include <emissivemap_fragment>
          float chosen = step(0.5, vMark) * (1.0 - step(1.5, vMark));
          float wob = sin(vBarkUv.y * 17.0 + vBarkUv.x * 9.0) * 0.08;
          float vein = pow(abs(sin((vBarkUv.x + wob) * 6.2831 * 4.0)), 36.0);
          float flow = 0.45 + 0.55 * pow(0.5 + 0.5 * sin(vBarkUv.y * 34.0 - uTime * 2.6), 2.0);
          totalEmissiveRadiance += uVeinColor * uVeinIntensity * vein * flow * (1.0 + chosen * 1.2) * (1.0 - rejected * 0.85);
          totalEmissiveRadiance += vColor.rgb * uSelfGlow * (1.0 - rejected * 0.8);
          totalEmissiveRadiance += uChosenColor * chosen * (0.3 + 0.15 * sin(uTime * 5.0));
          // Day sunlight that depends on the view: a rim of light along the silhouette, much stronger when
          // the tree stands between the camera and the sun, plus a soft sheen on bark facing the sun.
          vec3 eyeV = normalize(vViewPosition);
          float rimL = pow(1.0 - clamp(dot(normal, eyeV), 0.0, 1.0), 3.0);
          float backL = pow(max(dot(-eyeV, uSunView), 0.0), 3.0);
          float faceL = pow(max(dot(normal, uSunView), 0.0), 2.0);
          totalEmissiveRadiance += uSunColor * uSunGlow * (rimL * (0.18 + 1.2 * backL) + faceL * 0.12) * (1.0 - rejected * 0.7);
          totalEmissiveRadiance *= uIntro;`)},d.customProgramCacheKey=()=>"ancient-tree-v3",d},[f]);return y.useEffect(()=>{const d=r.getAttribute("color"),h=r.getAttribute("uv"),u=ie(n.trunk);for(const a of c){const x=a.category>=0?ie(le(a.category,n)):u;for(let p=a.start;p<a.start+a.count;p++){const v=h.getY(p),b=(a.depth===0?0:a.depth===1?.18+.25*v:.4+.4*v)*n.branchTint;d.setXYZ(p,u[0]+(x[0]-u[0])*b,u[1]+(x[1]-u[1])*b,u[2]+(x[2]-u[2])*b)}}d.needsUpdate=!0,f.uVeinColor.value.copy(G(n.trunkVein)),f.uVeinIntensity.value=n.veinIntensity,f.uBarkGrain.value=n.barkGrain,f.uSunColor.value.copy(G(n.sunColor)),f.uSunGlow.value=n.sunGlow,f.uSelfGlow.value=n.additiveGlow?.22:.04,f.uChosenColor.value.copy(G(n.thread)).multiplyScalar(n.additiveGlow?.8:.5)},[n,r,c,f]),y.useEffect(()=>{const d=l.image.data;d.fill(0);for(const[h,u]of o)h<=i&&(d[h*4]=u);l.needsUpdate=!0},[o,l,i]),y.useEffect(()=>()=>{r.dispose(),g.dispose(),l.dispose()},[r,g,l]),Z(({camera:d},h)=>{s||(f.uTime.value+=h),f.uSunGlow.value>0&&f.uSunView.value.set(...Xe).transformDirection(d.matrixWorldInverse),(g.color.r!==1||Y.value<1)&&g.color.setScalar(Ut(Y.value))}),S.jsx("mesh",{geometry:r,material:g,raycast:()=>null})}const wa=28,ba=6;function Sa(){const e=D(f=>f.ground),t=K(),n=y.useMemo(()=>({value:0}),[]),o=y.useRef(.4),{geometry:s,ranges:i}=y.useMemo(()=>{var h;if(!e||e.roots.length===0)return{geometry:null,ranges:[]};const f=new Map(e.crates.map(u=>[u.id,u])),r=[],c=[];let g=0;for(const u of e.roots){const a=Zt(u.path,{radius:p=>da(p,.12,Xt),tubularSegments:wa,radialSegments:ba});r.push(a);const x=a.attributes.position.count;c.push({start:g,count:x,category:((h=f.get(u.crate_id))==null?void 0:h.category_index)??-1}),g+=x}const d=Dt(r,!1);return r.forEach(u=>u.dispose()),d.computeBoundingSphere(),{geometry:d,ranges:c}},[e]),l=y.useMemo(()=>{const f=new Gt({vertexColors:!0,roughness:.7,metalness:.05});return wo(f,n,"roots"),f},[n]);return y.useEffect(()=>{if(!s)return;const f=s.getAttribute("color"),r=s.getAttribute("uv"),c=ie(t.trunk);for(const g of i){const d=ie(le(g.category,t));for(let h=g.start;h<g.start+g.count;h++){const[u,a,x]=ha(r.getY(h),d,c);f.setXYZ(h,u,a,x)}}f.needsUpdate=!0,o.current=t.additiveGlow?.55:.12,n.value=o.current*Y.value},[t,s,i,n]),y.useEffect(()=>()=>{s==null||s.dispose(),l.dispose()},[s,l]),Z(()=>{l.color.r===1&&Y.value>=1||(n.value=o.current*Y.value,l.color.setScalar(Ut(Y.value)))}),s?S.jsx("mesh",{geometry:s,material:l,raycast:()=>null}):null}const ve=48,Pt=5,Ma=`
  attribute float aPath;
  attribute float aPhase;
  attribute float aSpeed;
  attribute vec3 aColor;
  uniform sampler2D uPaths;
  uniform float uSamples;
  uniform float uPathCount;
  uniform float uTime;
  uniform float uScale;
  uniform float uPixelRatio;
  uniform vec3 uSapColor;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float t = fract(uTime * aSpeed + aPhase);
    float f = t * (uSamples - 1.0);
    float i0 = floor(f);
    float v = (aPath + 0.5) / uPathCount;
    vec3 a = texture2D(uPaths, vec2((i0 + 0.5) / uSamples, v)).xyz;
    vec3 b = texture2D(uPaths, vec2((min(i0 + 1.0, uSamples - 1.0) + 0.5) / uSamples, v)).xyz;
    vec4 mv = modelViewMatrix * vec4(mix(a, b, f - i0), 1.0);
    gl_PointSize = clamp(0.75 * uScale / -mv.z, 1.5, 9.0) * uPixelRatio;
    gl_Position = projectionMatrix * mv;
    vColor = mix(aColor, uSapColor, smoothstep(0.12, 0.4, t));
    vAlpha = smoothstep(0.0, 0.04, t) * (1.0 - smoothstep(0.9, 1.0, t));
  }
`;function ka(){const e=D(g=>g.ground),t=D(g=>g.tree),n=D(g=>g.nodesById),o=K(),s=_(g=>g.settings.reduceMotion),{size:i,camera:l,gl:f}=ee(),r=y.useMemo(()=>{if(!e||t.length===0)return null;const g=xe(11),d=t.filter(M=>M.depth===2),h=new Map;d.forEach(M=>h.set(M.dominant_category,[...h.get(M.dominant_category)??[],M]));const u=[[0,0,0],[0,12,0],[0,24,0],[0,35,0]],a=new Map(e.crates.map(M=>[M.id,M.category_index])),x=[],p=[];for(const M of e.roots){const k=a.get(M.crate_id)??-1,C=h.get(k)??d,F=C[Math.floor(g()*C.length)],T=F?n.get(F.parent_id??-1):void 0;!F||!T||(x.push(qe([...M.path,...u.slice(1),...T.path.slice(1),...F.path.slice(1)],ve)),p.push(k))}const v=new Float32Array(ve*x.length*4);x.forEach((M,k)=>M.forEach((C,F)=>v.set([C[0],C[1],C[2],1],(k*ve+F)*4)));const b=new Ke(v,ve,Math.max(1,x.length),Ye,jt);b.magFilter=b.minFilter=Ze,b.needsUpdate=!0;const w=ga(x,Pt,g),m=new ne;return m.setAttribute("position",new E(new Float32Array(w.count*3),3)),m.setAttribute("aPath",new E(w.pathIndex,1)),m.setAttribute("aPhase",new E(w.phase,1)),m.setAttribute("aSpeed",new E(w.speed,1)),m.setAttribute("aColor",new E(new Float32Array(w.count*3),3)),m.boundingSphere=new ke(new te(0,50,0),85),{geometry:m,tex:b,cats:p,pathCount:x.length}},[e,t,n]),c=y.useMemo(()=>pe(new se({vertexShader:Ma,fragmentShader:$e,transparent:!0,depthWrite:!1,uniforms:{uPaths:{value:null},uSamples:{value:ve},uPathCount:{value:1},uTime:{value:0},uScale:{value:500},uPixelRatio:{value:1},uSapColor:{value:new W}}})),[]);return y.useEffect(()=>{r&&(c.uniforms.uPaths.value=r.tex,c.uniforms.uPathCount.value=Math.max(1,r.pathCount))},[r,c]),y.useEffect(()=>{if(!r)return;const g=r.geometry.getAttribute("aColor");for(let d=0;d<g.count;d++){const[h,u,a]=ie(le(r.cats[Math.floor(d/Pt)],o));g.setXYZ(d,h,u,a)}g.needsUpdate=!0,c.uniforms.uSapColor.value.copy(G(o.sap)).multiplyScalar(o.additiveGlow?1.5:1),c.blending=fe(o),c.needsUpdate=!0},[o,r,c]),y.useEffect(()=>()=>{r==null||r.geometry.dispose(),r==null||r.tex.dispose()},[r]),y.useEffect(()=>()=>c.dispose(),[c]),Z((g,d)=>{s||(c.uniforms.uTime.value+=d),c.uniforms.uScale.value=me(i.height,l.fov),c.uniforms.uPixelRatio.value=f.getPixelRatio()}),r?S.jsx("points",{geometry:r.geometry,material:c,raycast:()=>null}):null}function Aa(){return S.jsxs("group",{children:[S.jsx(Sa,{}),S.jsx(ya,{}),S.jsx(ka,{})]})}var Rt;const He=new URLSearchParams(((Rt=globalThis.location)==null?void 0:Rt.search)??""),Ct=He.has("perf")||He.has("bench"),Fa=He.has("nofx"),Pa=Le("overview");function ja(){return S.jsxs(S.Fragment,{children:[S.jsxs(ro,{dpr:[1,1.15],camera:{fov:45,near:.5,far:3e3,position:[...Pa.position]},gl:{antialias:!1,alpha:!1,stencil:!1,powerPreference:"high-performance",toneMapping:Do},performance:{min:.6,debounce:250},onPointerMissed:()=>{},"data-testid":"world-canvas",onCreated:({gl:e,scene:t,camera:n})=>{e.debug.checkShaderErrors=!1,So&&Object.assign(globalThis,{__rktGl:e})},children:[S.jsx(Qo,{}),S.jsx(ua,{}),S.jsx(Qn,{}),S.jsxs("group",{name:"ground",children:[S.jsx(Xn,{}),S.jsx(qn,{}),S.jsx(Yn,{})]}),S.jsx("group",{name:"tree",children:S.jsx(Aa,{})}),S.jsx("group",{name:"canopy",children:S.jsx(rn,{})}),S.jsxs("group",{name:"fx",children:[S.jsx(un,{}),S.jsx(zn,{}),S.jsx(Sn,{})]}),S.jsx(Vo,{}),S.jsx(bo,{}),S.jsx(aa,{}),!Fa&&S.jsx(ea,{}),Ct&&S.jsx(ra,{})]}),Ct&&S.jsx(ia,{})]})}export{ja as default};
