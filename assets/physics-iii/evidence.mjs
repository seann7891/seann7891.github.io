// Geometry and measurements shared by the drawing code and physics checks.
export const waterAperture=ratio=>({wavelength:40,gap:40*ratio,halfAngle:Math.asin(Math.min(1,1/ratio))});
export const visibleCrest=(t,f,lambda)=>(((f*t+.25)*lambda%lambda)+lambda)%lambda;
export function apparentRay(depthPx,n,dx){
 const sin=n*dx/Math.hypot(depthPx,dx);
 if(Math.abs(sin)>=1)return null;
 const out=Math.asin(sin),virtualDepth=Math.abs(dx)<1e-10?depthPx/n:dx/Math.tan(out);
 return {out,virtualDepth,slope:Math.tan(out)};
}
export function clipBeforeWall(x1,y1,x2,y2,wall){
 if(x1>wall&&x2>wall)return null;
 if(x1>wall){const t=(wall-x2)/(x1-x2);y1=y2+t*(y1-y2);x1=wall;}
 if(x2>wall){const t=(wall-x1)/(x2-x1);y2=y1+t*(y2-y1);x2=wall;}
 return [x1,y1,x2,y2];
}
export const tubeResponse=(L,f,e=0)=>Math.sqrt(.03)/Math.sqrt(Math.cos(2*Math.PI*(L+e)*f/343)**2+.03);
export const tubeLength=(mode,f,e=0)=>(2*mode-1)*343/f/4-e;
export const filmIntensity=(t,n,lambda,halfWave=true)=>(1+Math.cos(4*Math.PI*n*t/lambda+(halfWave?Math.PI:0)))/2;
// Display colors, not a colorimetric prediction of a real spectrum.
export function wavelengthRGB(w){
 if(w<440)return [(440-w)/60,0,1];
 if(w<490)return [0,(w-440)/50,1];
 if(w<510)return [0,1,(510-w)/20];
 if(w<580)return [(w-510)/70,1,0];
 if(w<645)return [1,(645-w)/65,0];
 return [1,0,0];
}
