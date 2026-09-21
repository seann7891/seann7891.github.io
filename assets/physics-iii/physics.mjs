export const TAU=2*Math.PI;
export const speed=(F,mu)=>Math.sqrt(F/mu);
export function refract(n1,n2,deg){const s=n1/n2*Math.sin(deg*Math.PI/180);return s>1+1e-12?null:Math.asin(Math.min(1,s))*180/Math.PI;}
export function lens(f,p){if(Math.abs(p-f)<1e-9)return {q:Infinity,m:Infinity};const q=f*p/(p-f);return {q,m:-q/p};}
export function tubeFrequency(v,L,mode,closed){return closed?(2*mode-1)*v/(4*L):mode*v/(2*L);}
export const sinc=x=>Math.abs(x)<1e-8?1:Math.sin(x)/x;
export const singleIntensity=(a,lambda,sinTheta)=>sinc(Math.PI*a*sinTheta/lambda)**2;
export const doubleIntensity=(d,lambda,sinTheta,phase=0)=>Math.cos(Math.PI*d*sinTheta/lambda+phase/2)**2;
export const resonance=(r,zeta)=>1/Math.sqrt((1-r*r)**2+(2*zeta*r)**2);
export function joint(muRatio){const v1=1,v2=1/Math.sqrt(muRatio);return {v2,r:(v2-v1)/(v2+v1),trans:2*v2/(v2+v1)};}
