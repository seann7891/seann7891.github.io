import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {speed,refract,lens,tubeFrequency,singleIntensity,doubleIntensity,resonance,joint} from '../assets/physics-iii/physics.mjs';
import {mountSim,simulatorNames,interferenceAmplitudeFactor,diffractionHalfAngle,refractedWavefrontSpacing,wallReflectionGeometry,timeDisplacementAt} from '../assets/physics-iii/simulations.mjs';
import {waterAperture,visibleCrest,apparentRay,clipBeforeWall,tubeResponse,tubeLength,filmIntensity} from '../assets/physics-iii/evidence.mjs';
const data=JSON.parse(fs.readFileSync(new URL('../assets/physics-iii/course.json',import.meta.url)));
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('all 15 source sections have sequenced concepts, simulation tasks, and valid checks',()=>{
 assert.equal(data.units.length,15);assert.equal(new Set(data.units.map(u=>u.id)).size,15);
 for(const u of data.units){assert.ok(u.steps.length>=2);for(const s of u.steps){assert.ok(s.concepts.length>0&&s.concepts.length<=5);assert.ok(s.text.length>=2);assert.ok(simulatorNames.includes(s.sim));assert.ok(s.task.length>5);assert.ok(s.correct>=0&&s.correct<s.options.length);assert.ok(s.why.length>10);assert.equal(new Set(s.options).size,s.options.length);}}
});
test('string speed and energy flux at an interface',()=>{
 near(speed(100,.01)/speed(25,.01),2);
 for(const mu of [.25,1,4]){const j=joint(mu);near(j.r*j.r+j.trans*j.trans/j.v2,1);}
 assert.ok(joint(4).r<0);assert.ok(joint(.25).r>0);
});
test('Snell law, normal incidence and critical angle',()=>{
 near(refract(1,1.5,0),0);near(refract(1.5,1,Math.asin(1/1.5)*180/Math.PI),90);
 assert.equal(refract(1.5,1,50),null);assert.ok(refract(1,1.5,80)<80);
});
test('lens cases: real, virtual, concave and focal plane',()=>{
 near(lens(2,6).q,3);near(lens(2,6).m,-.5);near(lens(2,1).q,-2);near(lens(2,1).m,2);
 assert.equal(lens(2,2).q,Infinity);assert.ok(lens(-2,6).q<0);assert.ok(lens(-2,6).m>0&&lens(-2,6).m<1);
});
test('air-column harmonics and closed tube resonance spacing',()=>{
 near(tubeFrequency(343,1,1,false),2*tubeFrequency(343,1,1,true));
 near(tubeFrequency(343,1,2,true)/tubeFrequency(343,1,1,true),3);
 const lambda=343/400;near(3*lambda/4-lambda/4,lambda/2);
});
test('single/double slit central intensities, zeros, phase and finite width',()=>{
 near(singleIntensity(.1,.01,0),1);near(singleIntensity(.1,.01,.1),0);
 near(doubleIntensity(.1,.01,0),1);near(doubleIntensity(.1,.01,0,Math.PI),0);
 near(doubleIntensity(.1,.01,.05),0);near(doubleIntensity(.1,.01,.1),1);
 assert.ok(resonance(1,.1)>resonance(.5,.1));assert.ok(resonance(1,.1)>resonance(1,.3));
});
// Exercise every renderer with actual controls and finite drawing coordinates.
class El{constructor(value=''){this.value=value;this.textContent='';this.attrs={};}setAttribute(k,v){this.attrs[k]=v;}querySelector(){return null;}}
function harness(){const nodes=new Map(),inputs=[],calls=[];let html='';const context=new Proxy({}, {get(t,k){if(k in t)return t[k];return (...args)=>{calls.push({method:k,args,style:t.strokeStyle,fill:t.fillStyle});for(const a of args)if(typeof a==='number')assert.ok(Number.isFinite(a),`${k} received ${a}`);};},set(t,k,v){t[k]=v;return true;}});const canvas=new El();canvas.getContext=()=>context;canvas.setPointerCapture=()=>{};
 const h={set innerHTML(source){html=source;nodes.clear();inputs.length=0;for(const m of source.matchAll(/<(input|select)\b[^>]*data-control="([^"]+)"[^>]*>/g)){const e=new El((m[0].match(/value="([^"]+)"/)||[])[1]);e.tagName=m[1].toUpperCase();e.dataset={control:m[2]};e.min=(m[0].match(/min="([^"]+)"/)||[])[1];e.max=(m[0].match(/max="([^"]+)"/)||[])[1];inputs.push(e);nodes.set(`[data-control="${m[2]}"]`,e);}},get html(){return html;},querySelector(q){if(q==='canvas')return canvas;if(!nodes.has(q))nodes.set(q,new El());return nodes.get(q);},querySelectorAll(){return inputs;}};return {h,inputs,calls};}
globalThis.document={hidden:false,addEventListener(){},removeEventListener(){}};globalThis.cancelAnimationFrame=()=>{};globalThis.requestAnimationFrame=()=>1;
test('every authored simulation renders finite coordinates at initial, mid, end times and slider extremes',()=>{
 for(const u of data.units)for(const s of u.steps){const {h,inputs}=harness();const dispose=mountSim(h,s.sim,s.settings);for(const t of [0,2,4,8]){h.querySelector('[data-time]').value=t;h.querySelector('[data-time]').oninput();}for(const e of inputs){if(e.tagName==='INPUT'){const original=e.value;for(const value of [e.min,e.max]){e.value=value;e.oninput();}e.value=original;e.oninput();}}h.querySelector('[data-reset]').onclick();assert.ok(h.querySelector('.readout').textContent.length>10);dispose();}
});

test('standing-wave lessons separate formation from boundary-selected modes',()=>{
 const steps=data.units.find(u=>u.id==='1-4').steps;
 assert.notEqual(steps[1].sim,steps[2].sim);
 const {h}=harness();let dispose=mountSim(h,steps[1].sim,{});
 const set=(key,value)=>{const e=h.querySelector(`[data-control="${key}"]`);e.value=value;e.oninput();};
 for(const t of [0,.25,.5,1]){h.querySelector('[data-time]').value=t;h.querySelector('[data-time]').oninput();assert.match(h.querySelector('.readout').textContent,/此處合振幅\/A = 0.00/);}
 set('probe',.5);assert.match(h.querySelector('.readout').textContent,/此處合振幅\/A = 2.00/);dispose();
 dispose=mountSim(h,steps[2].sim,{});
 assert.match(h.querySelector('.readout').textContent,/f = 0.500 Hz/);
 set('boundary','mixed');assert.match(h.querySelector('.readout').textContent,/f = 0.250 Hz/);
 set('mode',2);assert.match(h.querySelector('.readout').textContent,/f = 0.750 Hz/);
 set('L',2);assert.match(h.querySelector('.readout').textContent,/f = 0.375 Hz/);dispose();
});

test('all 44 lessons expose their planned controls, at most three main variables',()=>{
 for(const id of data.units.map(u=>u.id))for(const s of data.units.find(u=>u.id===id).steps){const {h,inputs}=harness();mountSim(h,s.sim,s.settings);assert.ok(Array.isArray(s.settings.allowedKeys));assert.ok(s.settings.allowedKeys.length<=3);const visible=[...s.settings.allowedKeys||[]];const advanced=[...s.settings.advancedKeys||[]];assert.deepEqual(inputs.map(e=>e.dataset.control).sort(),[...visible,...advanced].sort(),`${id}: ${s.title}`);if(s.settings.advancedKeys)assert.match(h.html,/進一步比較/);if(s.settings.static)assert.match(h.html,/data-play hidden/);}
});
test('restarting preserves selected values and static lessons hide fake playback',()=>{
 const {h}=harness();mountSim(h,'speed',{allowedKeys:['F'],advancedKeys:['mu'],F:'100',mu:.01});const F=h.querySelector('[data-control="F"]');F.value='25';F.oninput();h.querySelector('[data-restart]').onclick();assert.equal(F.value,'25');assert.equal(h.querySelector('[data-time]').value,0);assert.equal(h.querySelector('[data-play]').textContent,'暫停');
 const {h:staticHost}=harness();mountSim(staticHost,'wavefront',{allowedKeys:['shape'],shape:'sphere',static:true});assert.match(staticHost.html,/data-play hidden/);assert.match(staticHost.html,/<label class="time-control" hidden/);
});
test('wavefront, interference, refraction and diffraction use readable specialist evidence',()=>{
 let {h}=harness();mountSim(h,'wavefront',{allowedKeys:['shape'],shape:'sphere',static:true});assert.match(h.querySelector('.readout').textContent,/平面截面/);
 ({h}=harness());mountSim(h,'wavefront',{allowedKeys:['shape'],shape:'solid',static:true});assert.match(h.querySelector('.readout').textContent,/交成圓/);
 ({h}=harness());mountSim(h,'water',{view:'interference',allowedKeys:['d','lambda'],static:true});assert.match(h.querySelector('.readout').textContent,/穩定節線/);assert.match(h.querySelector('.readout').textContent,/Δr\/λ/);
 ({h}=harness());mountSim(h,'refraction',{water:true,allowedKeys:['ratio'],angle:35});assert.match(h.querySelector('.readout').textContent,/頻率不變/);
 ({h}=harness());mountSim(h,'diffraction',{water:true,allowedKeys:['a'],static:true});assert.match(h.querySelector('.readout').textContent,/俯視示意/);
});
test('wave lesson settings route to reflection and pulse-specific readouts',()=>{
 let {h}=harness();mountSim(h,'water',{view:'reflection',allowedKeys:['angle'],static:true});assert.match(h.querySelector('.readout').textContent,/牆是直線/);assert.doesNotMatch(h.querySelector('.readout').textContent,/圓弧表示/);
 ({h}=harness());mountSim(h,'travel',{shape:'pulse',allowedKeys:['shape']});assert.match(h.querySelector('.readout').textContent,/不指定頻率與波長/);assert.doesNotMatch(h.querySelector('.readout').textContent,/f = .*Hz/);
});
test('wave physics helpers encode stable nodes, reflection geometry, and time traces',()=>{
 near(interferenceAmplitudeFactor(1.5,1),0);near(interferenceAmplitudeFactor(.5,1),0);near(interferenceAmplitudeFactor(1,1),1);
 const g=wallReflectionGeometry(Math.PI/6,540,250,250);near(g.incomingEnd[0],540);near(g.reflectedStart[0],540);assert.ok(g.incomingStart[0]<540&&g.reflectedEnd[0]<540);near(Math.hypot(...g.incident),1);near(Math.hypot(...g.reflected),1);near(g.incident[0],-g.reflected[0]);near(g.incident[1],g.reflected[1]);near(g.normal[1],0);
 near(timeDisplacementAt(3.2,.5),timeDisplacementAt(3.2,.5,2,1));near(timeDisplacementAt(3.2,0),timeDisplacementAt(3.2,1));
 near(refractedWavefrontSpacing(2,.6),1.2);near(refractedWavefrontSpacing(2,1),2);
 assert.ok(diffractionHalfAngle(2)<diffractionHalfAngle(1));near(diffractionHalfAngle(1),Math.PI/2);near(diffractionHalfAngle(.5),Math.PI/2);near(diffractionHalfAngle(2),Math.PI/6);
});

function change(h,key,value){const input=h.querySelector(`[data-control="${key}"]`);input.value=value;input.oninput();}
test('water aperture drawing uses the stated wavelength and gap, including wide and narrow slits',()=>{
 for(const ratio of [.5,1,2,3,5]){const {h,calls}=harness();mountSim(h,'diffraction',{water:true,allowedKeys:['a'],a:ratio});const {gap,wavelength}=waterAperture(ratio);near(gap/wavelength,ratio);const walls=calls.filter(c=>c.method==='fillRect'&&c.args[0]===450);assert.equal(walls.length,2);near(walls[1].args[1]-(walls[0].args[1]+walls[0].args[3]),gap);const starts=calls.filter(c=>c.method==='moveTo'&&c.style==='#58c8ce').map(c=>c.args[0]);near(starts[1]-starts[0],wavelength);}
});
test('apparent depth uses collinear reverse extensions and spreads at oblique observation',()=>{
 for(const n of [1,1.33,1.6])for(const depth of [80,160,240])for(const dx of [10,30,65,120]){const r=apparentRay(depth,n,dx);if(r){near(dx/r.virtualDepth,r.slope);near(n*dx/Math.hypot(depth,dx),Math.sin(r.out));assert.ok(r.virtualDepth<=depth/n+1e-8);}}
 near(apparentRay(160,1.33,0).virtualDepth,160/1.33);
 assert.ok(apparentRay(160,1.33,100).virtualDepth<apparentRay(160,1.33,10).virtualDepth);
 assert.equal(apparentRay(80,1.6,120),null);
});
test('clipped reflection wavefront retains its direction',()=>{
 const original=[520,100,560,140],clipped=clipBeforeWall(...original,530);near((clipped[3]-clipped[1])/(clipped[2]-clipped[0]),1);assert.deepEqual(clipped,[520,100,530,110]);assert.equal(clipBeforeWall(550,100,560,140,530),null);
});
test('visible crest remains in frame through the whole timeline',()=>{
 for(const f of [.5,1,2])for(let t=0;t<=8;t+=.025){const lambda=2/f,x=visibleCrest(t,f,lambda);assert.ok(x>=0&&x<lambda);near(Math.sin(2*Math.PI*(x/lambda-f*t)),1);const dense=visibleCrest(t+.25/f,f,lambda);near(Math.sin(2*Math.PI*(dense/lambda-f*t)),0);assert.ok(Math.cos(2*Math.PI*(dense/lambda-f*t))<0);}
 const {h,calls}=harness();mountSim(h,'travel',{allowedKeys:[],f:1,v:2,shape:'periodic',mode:'transverse'});for(const t of [0,4,8]){changeTime(h,t);const label=calls.filter(c=>c.method==='fillText'&&c.args[0]==='畫面內第一個波峰').at(-1);assert.ok(label.args[1]>=55&&label.args[1]<=850);}
});
function changeTime(h,t){h.querySelector('[data-time]').value=t;h.querySelector('[data-time]').oninput();}
test('critical state can be reached precisely and low-to-high has no critical angle',()=>{
 const settings=data.units.find(u=>u.id==='3-2').steps[0].settings,{h}=harness();mountSim(h,'refraction',settings);h.querySelector('[data-critical]').onclick();assert.match(h.querySelector('.readout').textContent,/目前為臨界狀態/);change(h,'angle',50);assert.match(h.querySelector('.readout').textContent,/沒有傳入/);change(h,'n1',1);change(h,'n2',1.5);h.querySelector('[data-critical]').onclick();assert.match(h.querySelector('.readout').textContent,/必須大於/);
});
test('tube correction shifts both peaks equally, response and student measurements follow length',()=>{
 for(const e of [0,.009]){const a=tubeLength(1,400,e),b=tubeLength(2,400,e);near(b-a,343/400/2);near(tubeResponse(a,400,e),1);assert.ok(tubeResponse(a+.05,400,e)<.5);}
 const settings=data.units.find(u=>u.id==='2-3').steps[1].settings,{h}=harness();mountSim(h,'resonanceTube',settings);change(h,'L',.205);h.querySelector('[data-mark1]').onclick();change(h,'L',.635);h.querySelector('[data-mark2]').onclick();assert.match(h.querySelector('.readout').textContent,/L₂ − L₁ = 0.430/);h.querySelector('[data-theory]').onclick();assert.equal(h.querySelector('[data-theory]').attrs['aria-pressed'],'true');change(h,'e','0');assert.match(h.querySelector('.readout').textContent,/L1 = 尚未記錄/);h.querySelector('[data-reset]').onclick();assert.equal(h.querySelector('[data-theory]').attrs['aria-pressed'],'false');
});
test('thin film has a reflection phase shift and distinct spectral response',()=>{
 near(filmIntensity(0,1.33,550,true),0);near(filmIntensity(0,1.33,550,false),1);near(filmIntensity(550/(4*1.33),1.33,550,true),1);assert.notEqual(filmIntensity(100,1.33,450,true),filmIntensity(100,1.33,650,true));
});
test('task baselines, source reset, screen focusing and incoherent averages are actionable',()=>{
 assert.equal(data.units.find(u=>u.id==='1-6').steps[1].settings.ratio,1);assert.equal(data.units.find(u=>u.id==='3-1').steps[1].settings.n2,1);
 let {h}=harness();mountSim(h,'travel',{source:true,allowedKeys:['shape'],shape:'pulse'});assert.match(h.html,/再發送一次/);changeTime(h,4);change(h,'shape','periodic');assert.equal(h.querySelector('[data-time]').value,0);
 ({h}=harness());mountSim(h,'lens',{screenMode:true,allowedKeys:['p','screen'],p:6,f:2,type:'convex'});change(h,'screen',3);assert.match(h.querySelector('.readout').textContent,/對焦清晰/);change(h,'p',1);assert.match(h.querySelector('.readout').textContent,/沒有可在出射側/);
 ({h}=harness());mountSim(h,'doubleSlit',{allowedKeys:['phase','coherence']});change(h,'phase',180);assert.match(h.querySelector('.readout').textContent,/中心 I\/I同調最大 = 0.00/);change(h,'coherence','random');assert.match(h.querySelector('.readout').textContent,/強度均勻為 0.5/);
});

test('rendered principal rays meet at the computed real or virtual image',()=>{
 for(const p of [1,3,4,6]){const {h,calls}=harness();mountSim(h,'lens',{allowedKeys:['p'],type:'convex',f:2,p});const {q,m}=lens(2,p),fit=Math.min(1,4.8/Math.max(p,Math.abs(q))),imageX=450+70*q*fit,imageY=245-70*m*.85*fit*Math.cos(.43);let count=0;
  for(let i=0;i<calls.length-1;i++){const a=calls[i],b=calls[i+1];if(a.method==='moveTo'&&b.method==='lineTo'&&a.args[0]===450&&Math.abs(b.args[0]-(450+70*5.3))<1e-8){const y=a.args[1]+(imageX-a.args[0])*(b.args[1]-a.args[1])/(b.args[0]-a.args[0]);near(y,imageY);count++;}}
  assert.equal(count,3,`p=${p} has three meridional rays`);
 }
});
test('source produces one local lift and repeated waves start at the source',()=>{
 const {h,calls}=harness();mountSim(h,'travel',{allowedKeys:['shape'],source:true,shape:'pulse'});const sourceAt=()=>calls.filter(c=>c.method==='arc'&&c.args[0]===55&&c.args[2]===10).at(-1).args[1];near(sourceAt(),245);changeTime(h,.15);assert.ok(sourceAt()<245);changeTime(h,.4);near(sourceAt(),245);change(h,'shape','periodic');near(sourceAt(),245);changeTime(h,.25);assert.ok(sourceAt()>245);
});

test('rendered apparent-ray virtual segments are the reverse extension of the exiting segments',()=>{
 const {h,calls}=harness();mountSim(h,'apparent',{allowedKeys:['depth','n'],advancedKeys:['dx'],depth:2,n:1.33,dx:120});const segments=[];
 for(let i=0;i<calls.length-1;i++)if(calls[i].method==='moveTo'&&calls[i+1].method==='lineTo')segments.push({from:calls[i].args,to:calls[i+1].args,style:calls[i].style});
 const virtual=segments.filter(c=>c.style==='#9cdbac');assert.equal(virtual.length,4);
 for(const v of virtual){const real=segments.find(c=>c.style==='#58c8ce'&&c.from[0]===v.from[0]&&c.from[1]===v.from[1]);assert.ok(real);const a=real.to.map((x,i)=>x-real.from[i]),b=v.to.map((x,i)=>x-v.from[i]);near(a[0]*b[1]-a[1]*b[0],0);assert.ok(a[0]*b[0]+a[1]*b[1]<0);}
});
