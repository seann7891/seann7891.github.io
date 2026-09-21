import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {speed,refract,lens,tubeFrequency,singleIntensity,doubleIntensity,resonance,joint} from '../assets/physics-iii/physics.mjs';
import {mountSim,simulatorNames} from '../assets/physics-iii/simulations.mjs';
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
function harness(){const nodes=new Map(),inputs=[];const context=new Proxy({}, {get(t,k){if(k in t)return t[k];return (...args)=>{for(const a of args)if(typeof a==='number')assert.ok(Number.isFinite(a),`${k} received ${a}`);};},set(t,k,v){t[k]=v;return true;}});const canvas=new El();canvas.getContext=()=>context;canvas.setPointerCapture=()=>{};
 const h={set innerHTML(html){nodes.clear();inputs.length=0;for(const m of html.matchAll(/<(input|select)\b[^>]*data-control="([^"]+)"[^>]*>/g)){const e=new El((m[0].match(/value="([^"]+)"/)||[])[1]);e.tagName=m[1].toUpperCase();e.dataset={control:m[2]};e.min=(m[0].match(/min="([^"]+)"/)||[])[1];e.max=(m[0].match(/max="([^"]+)"/)||[])[1];inputs.push(e);nodes.set(`[data-control="${m[2]}"]`,e);}},querySelector(q){if(q==='canvas')return canvas;if(!nodes.has(q))nodes.set(q,new El());return nodes.get(q);},querySelectorAll(){return inputs;}};return {h,inputs};}
globalThis.document={hidden:false,addEventListener(){},removeEventListener(){}};globalThis.cancelAnimationFrame=()=>{};globalThis.requestAnimationFrame=()=>1;
test('every authored simulation renders finite coordinates at initial, mid, end times and slider extremes',()=>{
 for(const u of data.units)for(const s of u.steps){const {h,inputs}=harness();const dispose=mountSim(h,s.sim,s.settings);for(const t of [0,2,4,8]){h.querySelector('[data-time]').value=t;h.querySelector('[data-time]').oninput();}for(const e of inputs){if(e.tagName==='INPUT'){const original=e.value;for(const value of [e.min,e.max]){e.value=value;e.oninput();}e.value=original;e.oninput();}}h.querySelector('[data-reset]').onclick();assert.ok(h.querySelector('.readout').textContent.length>10);dispose();}
});
