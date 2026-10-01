import {TAU,speed,refract,lens,tubeFrequency,singleIntensity,doubleIntensity,resonance,joint} from './physics.mjs';
const C={ink:'#deefef',muted:'#8db2b7',grid:'#31515a',a:'#58c8ce',b:'#cc9cff',sum:'#ffbe74',red:'#fa8d8d',green:'#9cdbac'};
const n=(key,label,min,max,step,value,unit='')=>({key,label,min,max,step,value,unit});
const sel=(key,label,options,value)=>({key,label,options,value});
export const interferenceAmplitudeFactor=(delta,lambda)=>Math.abs(Math.cos(Math.PI*delta/lambda));
export const diffractionHalfAngle=ratio=>Math.min(1.25,.8/ratio);
export const refractedWavefrontSpacing=(lambda1,speedRatio)=>lambda1*speedRatio;
export function wallReflectionGeometry(angle,hitX=540,hitY=250,length=250){const c=Math.cos(angle),s=Math.sin(angle);return{normal:[-1,0],incident:[c,-s],reflected:[-c,-s],incomingStart:[hitX-c*length,hitY+s*length],incomingEnd:[hitX,hitY],reflectedStart:[hitX,hitY],reflectedEnd:[hitX-c*length,hitY-s*length]};}
export const timeDisplacementAt=(x,t,lambda=2,f=1)=>Math.sin(TAU*(x/lambda-f*t));
const defs={
 travel:[sel('shape','波形種類',{periodic:'週期波',pulse:'一次脈衝'},'periodic'),sel('mode','振動方向',{transverse:'橫波',longitudinal:'縱波'},'transverse'),n('f','頻率',.5,2,.1,1,' Hz'),n('v','波速',1,4,.1,2,' m/s')],
 speed:[sel('F','張力（固定線密度）',{'25':'25 N','100':'100 N'},'25'),n('mu','線密度 μ',.01,.04,.001,.01,' kg/m')],
 reflection:[sel('boundary','邊界',{fixed:'固定端',free:'自由端',joint:'兩繩交界'},'fixed'),n('ratio','μ₂/μ₁',.25,4,.25,4)],
 superposition:[sel('sign','第二脈衝方向',{same:'同向位移',opposite:'反向位移'},'opposite')],
 standingFormation:[n('probe','觀察位置 x',0,4,.05,1,' m')],
 standing:[sel('boundary','邊界',{fixed:'兩端固定',mixed:'固定—自由'},'fixed'),n('mode','模式序號',1,4,1,1),n('L','弦長 L',1,2,.1,1,' m')],
 wavefront:[sel('shape','觀察階段',{sphere:'看圓形截面',solid:'看立體球面',local:'看局部近似平面',plane:'看平面波'},'sphere')],
 huygens:[n('v','波速',.5,2,.1,1)],
 water:[sel('view','觀察模式',{single:'單波源',reflection:'直線波反射',interference:'同相雙波源'},'single'),n('lambda','波長',1,3,.1,2),n('d','波源距離',1,5,.1,3),n('yaw','水平視角',-180,180,1,25,'°')],
 sound:[n('f','頻率',200,800,20,400,' Hz'),n('temp','氣溫',0,40,1,20,' °C'),sel('graph','曲線',{displacement:'位移',pressure:'壓力增量'},'displacement'),n('yaw','水平視角',-180,180,1,15,'°')],
 pipe:[sel('end','管口',{closed:'左閉右開',open:'兩端開口'},'closed'),n('mode','模式序號',1,4,1,1),sel('graph','曲線',{displacement:'位移',pressure:'壓力增量'},'displacement'),n('yaw','水平視角',-180,180,1,15,'°')],
 timbre:[n('second','第二諧音比例',0,1,.05,.3),n('third','第三諧音比例',0,1,.05,.2)],
 resonance:[n('r','驅動頻率比 f/f₀',.2,2,.01,.65),n('z','阻尼比 ζ',.05,.5,.01,.12)],
 resonanceTube:[n('L','空氣柱長度',.05,1.4,.005,.2,' m'),n('f','音叉頻率',250,650,10,400,' Hz')],
 refraction:[n('n1','入射側折射率',1,2,.01,1),n('n2','出射側折射率',1,2,.01,1.5),n('angle','入射角',0,80,.1,40,'°'),n('yaw','水平視角',-90,90,1,0,'°')],
 apparent:[n('depth','真深',1,3,.1,2,' m'),n('n','水側折射率',1,1.6,.01,1.33)],
 dispersion:[n('angle','入射角',0,75,1,45,'°')],
 fiber:[n('alpha','光線與纖芯軸夾角',5,65,1,20,'°'),n('core','纖芯折射率',1.4,1.7,.01,1.5),n('clad','包層折射率',1.1,1.5,.01,1.3)],
 lens:[sel('type','透鏡',{convex:'凸透鏡',concave:'凹透鏡'},'convex'),n('p','物距',.5,8,.1,6,' cm'),n('f','焦距量值',1,3,.1,2,' cm'),n('yaw','水平視角',-70,70,1,0,'°')],
 em:[n('pol','偏振方向',0,180,1,0,'°'),n('yaw','水平視角',-180,180,1,25,'°')],
 doubleSlit:[n('lambda','真空波長',400,700,10,550,' nm'),n('d','縫距',.1,.5,.01,.25,' mm'),n('L','屏距',.5,3,.1,1.5,' m'),n('phase','初相位差',0,180,10,0,'°'),n('n','介質折射率',1,1.5,.01,1)],
 diffraction:[n('lambda','波長',400,700,10,550,' nm'),n('a','縫寬',.05,.3,.005,.1,' mm'),n('L','屏距',.5,3,.1,1.5,' m')],
 combined:[n('lambda','波長',400,700,10,550,' nm'),n('d','縫距',.2,.6,.01,.4,' mm'),n('a','每縫寬度',.03,.15,.005,.08,' mm')]
};
export const simulatorNames=Object.keys(defs);
export function mountSim(host,kind,settings={}){
 if(!defs[kind])throw Error(`Unknown simulation: ${kind}`);
 let allControls=defs[kind].map(c=>({...c}));
 if(kind==='diffraction'&&settings.water)allControls=[n('a','縫寬 / 波長',.5,5,.1,2)];
 if(kind==='water'&&settings.waterDiffraction)allControls=[n('a','縫寬 / 波長',.5,5,.1,2)];
 let controls=allControls;
 if(kind==='refraction'&&settings.water)allControls=[n('ratio','第二區/第一區波速',.4,1,.05,.6),n('angle','入射角',0,60,1,35,'°')];
 if(kind==='water'&&settings.view==='reflection')allControls=[n('angle','入射角',15,60,1,30,'°')];
 if(settings.allowedKeys)controls=allControls.filter(c=>settings.allowedKeys.includes(c.key));
 const advancedControls=settings.advancedKeys?allControls.filter(c=>settings.advancedKeys.includes(c.key)):[];
 if(advancedControls.length)controls=controls.filter(c=>!settings.advancedKeys.includes(c.key));
 const values=Object.fromEntries(allControls.map(c=>[c.key,settings[c.key]??c.value]));
 let time=0,playing=false,alive=true,raf=0,last=0,pitch=.43,drag=null;
 const three=controls.some(c=>c.key==='yaw');
 const markup=c=>`<label class="control">${c.label}${c.options?`<select data-control="${c.key}">${Object.entries(c.options).filter(([v])=>!settings.optionKeys||settings.optionKeys.includes(v)).map(([v,t])=>`<option value="${v}" ${values[c.key]===v?'selected':''}>${t}</option>`).join('')}</select>`:`<output data-value="${c.key}"></output><input aria-label="${c.label}" data-control="${c.key}" type="range" min="${c.min}" max="${c.max}" step="${c.step}" value="${values[c.key]}">`}</label>`;
 host.innerHTML=`<canvas class="sim-canvas ${three?'three':''}" width="900" height="500" role="img" aria-label="可操作物理模型。模型內容與數值顯示在畫布下方。"></canvas><p class="legend">${settings.legendText||`${three?'三維投影：拖動畫布旋轉，或使用水平視角滑桿。 ':''}青色／紫色區分成分，橘色標示合成或觀察結果。圖形的大小與速度為教學顯示比例。`}</p>${settings.caption?`<p class="sim-caption">${settings.caption}</p>`:''}<div class="sim-controls">${controls.map(markup).join('')}</div>${advancedControls.length?`<details class="advanced-controls"><summary>進一步比較</summary><div class="sim-controls">${advancedControls.map(markup).join('')}</div></details>`:''}<div class="transport"><button data-play ${settings.static?'hidden':''}>播放</button><button data-step ${settings.static?'hidden':''}>單步 +0.05</button><button data-restart ${settings.static?'hidden':''}>從頭播放</button><button data-reset>恢復預設</button><label class="time-control" ${settings.static?'hidden':''}>模型時間<input aria-label="模型時間" type="range" min="0" max="8" step=".01" value="0" data-time><output data-clock>0.00</output></label></div><div class="readout" aria-label="模型數值"></div>`;
 const canvas=host.querySelector('canvas'),ctx=canvas.getContext('2d'),readout=host.querySelector('.readout'),play=host.querySelector('[data-play]'),slider=host.querySelector('[data-time]'),clock=host.querySelector('[data-clock]');
 const txt=(s,x,y,color=C.ink,size=20)=>{ctx.fillStyle=color;ctx.font=`${size}px system-ui`;ctx.fillText(s,x,y);};
 const line=(x1,y1,x2,y2,color=C.grid,width=2,dashed=false)=>{ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dashed?[7,6]:[]);ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.setLineDash([]);};
 const dot=(x,y,r,color)=>{ctx.beginPath();ctx.fillStyle=color;ctx.arc(x,y,r,0,TAU);ctx.fill();};
 const path=(pts,color=C.a,width=3,dashed=false)=>{ctx.beginPath();ctx.lineWidth=width;ctx.strokeStyle=color;ctx.setLineDash(dashed?[7,6]:[]);pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();ctx.setLineDash([]);};
 const arr=(x1,y1,x2,y2,color=C.a)=>{line(x1,y1,x2,y2,color,3);let a=Math.atan2(y2-y1,x2-x1);line(x2,y2,x2-12*Math.cos(a-.4),y2-12*Math.sin(a-.4),color,3);line(x2,y2,x2-12*Math.cos(a+.4),y2-12*Math.sin(a+.4),color,3);};
 const sample=(f,a,b,N=200)=>Array.from({length:N+1},(_,i)=>f(a+(b-a)*i/N));
 function project(x,y,z=0,scale=70,cx=450,cy=245){let yaw=(values.yaw||0)*Math.PI/180;let X=x*Math.cos(yaw)+z*Math.sin(yaw),Z=-x*Math.sin(yaw)+z*Math.cos(yaw);return [cx+scale*X,cy-scale*(y*Math.cos(pitch)-Z*Math.sin(pitch))];}
 const p3=(pts,color=C.a,width=2,dashed=false)=>path(pts.map(p=>project(...p)),color,width,dashed);
 const label3=(s,p,c=C.ink)=>{const [x,y]=project(...p);txt(s,x+5,y-5,c,17);};
 const line3=(a,b,c=C.a,d=false)=>p3([a,b],c,2,d);
 const gauss=x=>Math.exp(-x*x/0.16);
 function draw(){if(!alive)return;ctx.clearRect(0,0,900,500);ctx.fillStyle='#10272e';ctx.fillRect(0,0,900,500);const v=values;let desc='';
 controls.forEach(c=>{const o=host.querySelector(`[data-value="${c.key}"]`);if(o)o.textContent=`${Number(v[c.key]).toFixed(c.step<.01?3:c.step<1?2:0)}${c.unit||''}`;});slider.value=time;clock.textContent=time.toFixed(2);
 if(kind==='travel'||kind==='speed'){
  let f=v.f||1,vel=kind==='speed'?speed(v.F,v.mu):v.v,lambda=vel/f;const displaySpeed=kind==='speed'?vel/40:vel;let lam=kind==='speed'?displaySpeed/f:lambda;let W=8;
  if(settings.timePlot){
   const x0=3.2,phase=TAU*(x0/2-time),tm=((time%2)+2)%2,px=70+760*x0/8;txt('同一時刻的繩子位置圖',55,45,C.a);line(70,175,830,175,C.muted,1,true);path(sample(x=>[70+760*x/8,175-70*timeDisplacementAt(x,time,2,1)],0,8),C.a,3);line(px,100,px,220,C.sum,1,true);dot(px,175-70*Math.sin(phase),8,C.sum);txt('黃點 x = 3.2 m',px+8,120,C.sum,16);txt('位置 x（m）→',710,205,C.muted,17);
   for(let x=0;x<=8;x+=2){const q=70+760*x/8;line(q,213,q,221,C.muted,1);txt(String(x),q-5,238,C.muted,14);}const lx1=70+760*.5/8,lx2=70+760*2.5/8;line(lx1,85,lx2,85,C.sum,2);line(lx1,79,lx1,92,C.sum,2);line(lx2,79,lx2,92,C.sum,2);txt('λ = 2 m', (lx1+lx2)/2-35,77,C.sum,15);line(lx1,175,lx1,105,C.sum,1,true);line(lx1-6,175,lx1+6,175,C.sum,2);line(lx1-6,105,lx1+6,105,C.sum,2);txt('A',lx1+8,143,C.sum,15);
   line(70,335,830,335,C.muted,1,true);path(sample(t=>[70+380*t,335-70*timeDisplacementAt(x0,t,2,1)],0,2),C.sum,3);const tx=70+380*tm;line(tx,270,tx,410,C.sum,1,true);dot(tx,335-70*timeDisplacementAt(x0,tm,2,1),8,C.sum);txt('同一黃點的位移—時間圖',55,255,C.sum);txt('時間 t（秒）→',700,430,C.muted,17);for(let t=0;t<=2;t++){const q=70+380*t;line(q,410,q,418,C.muted,1);txt(String(t),q-4,440,C.muted,14);}const t1=70,t2=450;line(t1,422,t2,422,C.sum,2);line(t1,416,t1,428,C.sum,2);line(t2,416,t2,428,C.sum,2);txt('T = 1 s',(t1+t2)/2-25,465,C.sum,15);txt(`模型時間 ${time.toFixed(2)} s`,610,465,C.sum,15);desc='上圖顯示整條繩在目前時刻的位置，下圖固定追蹤 x = 3.2 m 的黃點。刻度與括線示範 λ = 2 m、T = 1 s；A 為位移振幅，垂直游標同步標出目前相位。';
  } else {
  line(55,245,850,245,C.muted,1,true);txt('平衡位置',65,232,C.muted,16);arr(700,80,810,80);txt('波的傳播方向',610,55,C.a);const pts=[];
  for(let i=0;i<=100;i++){let x=W*i/100,xi=v.shape==='pulse'||kind==='speed'?.35*gauss(x-(1+displaySpeed*time)):.24*Math.sin(TAU*(x/lam-f*time)),px=55+795*x/W,py=245;if(v.mode==='longitudinal')px+=xi*75;else py-=xi*210;pts.push([px,py]);if(i%2===0)dot(px,py,i===40?8:3,i===40?C.sum:C.a);}
  if(v.mode!=='longitudinal')path(pts,C.a,2);if(kind==='speed'){line(55,355,850,355,C.muted,1,true);path(sample(x=>[55+795*x/W,355-55*.35*gauss(x-(1+speed(25,Number(v.mu))/40*time))],0,W),C.b,3,true);txt('基準：25 N',65,420,C.b,18);txt(`目前：${Number(v.F).toFixed(0)} N`,65,300,C.a,18);}if(settings.periodCompare){path(sample(x=>[55+795*x/W,355-48*Math.sin(TAU*(x/2-time))],0,W),C.b,3,true);txt('虛線：1 Hz 基準（v = 2 m/s）',65,420,C.b,17);const start=55+795*(.5*lam)/W,end=55+795*(1.5*lam)/W;line(start,300,end,300,C.sum,2);line(start,292,start,308,C.sum,2);line(end,292,end,308,C.sum,2);txt(`目前 λ = ${lambda.toFixed(1)} m`,(start+end)/2-55,292,C.sum,16);const b1=55+795*.5/W,b2=55+795*2.5/W;line(b1,438,b2,438,C.b,2);line(b1,432,b1,444,C.b,2);line(b2,432,b2,444,C.b,2);txt('基準 λ₀ = 2 m',(b1+b2)/2-53,460,C.b,16);}const px=55+795*3.2/W,disp=v.shape==='pulse'||kind==='speed'?.35*gauss(3.2-(1+displaySpeed*time)):.24*Math.sin(TAU*(3.2/lam-f*time));line(px,205,px,285,C.sum,1,true);dot(v.mode==='longitudinal'?px+disp*75:px,v.mode==='longitudinal'?245:245-disp*210,8,C.sum);txt('黃點原位置',px+10,295,C.sum,16);if(v.shape==='periodic'){const crest=55+795*((f*time+.25)*lam)/W;dot(crest,35,7,C.b);txt('● 波峰',crest+10,40,C.b,16);}if(v.mode==='longitudinal'){arr(px-40,320,px+40,320,C.sum);arr(px+40,320,px-40,320,C.sum);}else{arr(px-25,210,px-25,280,C.sum);arr(px-25,280,px-25,210,C.sum);}txt('位置 x →',730,290,C.muted);desc=v.shape==='pulse'&&kind!=='speed'?'一次局部脈衝向右傳播；單一脈衝不指定頻率與波長。從頭播放可在保留設定時重播。':kind==='speed'?`v = √(F/μ) = ${vel.toFixed(2)} m/s；虛線基準 v₀ = ${speed(25,Number(v.mu)).toFixed(2)} m/s。同一模型時間比較兩條繩上的波前距離；長度採共同示意比例。`:`v = ${vel.toFixed(2)} m/s；f = ${f.toFixed(2)} Hz；λ = ${lambda.toFixed(2)} m；T = ${(1/f).toFixed(2)} s。黃點是固定介質位置；雙向箭頭表示粒子往返振動的方向。`;
  }
 }
 else if(kind==='reflection'){
  const boundary=v.boundary,L=5,x0=1+time*.9,j=joint(v.ratio),r=boundary==='fixed'?-1:boundary==='free'?1:j.r;
  const X=x=>80+x*105;line(70,260,850,260);if(boundary==='fixed'){ctx.fillStyle='#d99a62';ctx.fillRect(X(L),170,13,180);txt('固定牆',X(L)-25,65,C.sum);}else if(boundary==='free'){line(X(L),90,X(L),390,C.sum,3);dot(X(L),260-70*(gauss(L-x0)+r*gauss(2*L-L-x0)),12,C.green);txt('自由端',X(L)-25,65,C.green);}else{line(X(L),90,X(L),390,C.muted,2,true);txt('交界',X(L)-25,65);}
  const inc=x=>gauss(x-x0),ref=x=>r*gauss(2*L-x-x0);path(sample(x=>[X(x),260-70*inc(x)],0,L),C.a,2);path(sample(x=>[X(x),260-70*ref(x)],0,L),C.b,2);path(sample(x=>[X(x),260-70*(inc(x)+ref(x))],0,L),C.sum,4);
  if(boundary==='joint'){path(sample(x=>[X(x),260-70*j.trans*gauss((x-L)/j.v2+L-x0)],L,7),C.green,4);txt('介質 1',100,360,C.a);txt('介質 2',655,360,C.green);}
  txt('青：入射　紫：反射　橘：左側合位移',65,440,C.ink,19);desc=`${boundary==='fixed'?'固定端':boundary==='free'?'自由端':'兩繩交界'}：反射係數 ${r.toFixed(2)}${boundary==='joint'?`；透射位移係數 ${j.trans.toFixed(2)}；v₂/v₁ = ${j.v2.toFixed(2)}`:''}。拖時間觀察脈衝抵達與離開。`;
 }
 else if(kind==='superposition'){
  const sign=v.sign==='same'?1:-1,a=x=>gauss(x-(1+time*.75)),b=x=>sign*gauss(x-(7-time*.75));
  for(const [cy,f,c,l] of [[115,a,C.a,'波 1 →'],[245,b,C.b,'← 波 2'],[390,x=>a(x)+b(x),C.sum,'合位移']]){line(60,cy,840,cy);path(sample(x=>[60+x*97.5,cy-40*f(x)],0,8),c);txt(l,65,cy-65,c,19);}
  desc=`y = y₁ + y₂。第二脈衝與第一脈衝${sign>0?'同向':'反向'}；t = 4 時兩脈衝中心重合，通過後各自前進。`;
 }
 else if(kind==='standingFormation'){
  const k=Math.PI,omega=Math.PI,A=1,xp=v.probe;
  const y1=x=>A*Math.sin(k*x-omega*time),y2=x=>A*Math.sin(k*x+omega*time);
  for(const [cy,f,c,title] of [[110,y1,C.a,'向右行進波 y₁ →'],[250,y2,C.b,'← 向左行進波 y₂'],[405,x=>y1(x)+y2(x),C.sum,'合成波 y₁ + y₂']]){
   line(70,cy,830,cy);txt(title,70,cy-60,c,19);
   path(sample(x=>[70+190*x,cy-27*f(x)],0,4),c,3);
   line(70+190*xp,cy-50,70+190*xp,cy+50,C.muted,1,true);
   dot(70+190*xp,cy-27*f(xp),6,C.green);
  }
  for(let x=0;x<=4;x++){dot(70+190*x,405,5,C.b);txt('節',62+190*x,477,C.b,16);}
  for(let x=.5;x<4;x++){txt('腹',62+190*x,477,C.sum,16);}
  desc=`λ = 2 m，f = 0.5 Hz，T = 2 s。觀察 x = ${xp.toFixed(2)} m：y₁/A = ${y1(xp).toFixed(2)}，y₂/A = ${y2(xp).toFixed(2)}，合位移/A = ${(y1(xp)+y2(xp)).toFixed(2)}；此處合振幅/A = ${(2*Math.abs(Math.sin(k*xp))).toFixed(2)}。三列使用相同位移比例；綠點標記同一位置。`;
 }
 else if(kind==='standing'){
  const mixed=v.boundary==='mixed',L=v.L,k=mixed?(2*v.mode-1)*Math.PI/2:v.mode*Math.PI;
  const f=k/(TAU*L),f1=(mixed?.25:.5)/L;
  line(70,255,830,255);
  path(sample(x=>[70+760*x,255-100*Math.sin(k*x)*Math.cos(TAU*f*time)],0,1),C.sum,4);
  for(const sign of [-1,1])path(sample(x=>[70+760*x,255+sign*100*Math.sin(k*x)],0,1),C.grid,2,true);
  for(let i=0;i<=v.mode;i++){let x=i*Math.PI/k;if(x<=1+1e-8){dot(70+x*760,255,7,C.b);txt('節',60+x*760,285,C.b,17);}}
  line(70,120,70,375,C.ink,4);if(!mixed)line(830,120,830,375,C.ink,4);else{line(845,120,845,375,C.muted,2,true);dot(830,255-100*Math.sin(k)*Math.cos(TAU*f*time),9,C.green);}
  txt(`模式 ${v.mode}：${mixed?2*v.mode-1:v.mode} 個${mixed?'四分之一':'半'}波長`,60,45);
  txt(`f / f₁ = ${(f/f1).toFixed(0)}；λ = ${(TAU*L/k).toFixed(2)} m`,60,80,C.sum);
  txt('左端固定（節）',60,355,C.muted,19);txt(mixed?'右端自由（腹）':'右端固定（節）',610,355,C.muted,19);
  for(let j=1;j<=4;j++){const ratio=mixed?2*j-1:j;txt(`模式 ${j}：${ratio}f₁`,65+(j-1)*205,425,j===v.mode?C.sum:C.muted,20);}
  txt('同一波速下，弦長越長，同一模式振動越慢。',60,475,C.ink,19);
  desc=`L = ${L.toFixed(1)} m，v = 1 m/s；基頻 f₁ = ${f1.toFixed(3)} Hz；模式 ${v.mode} 的 f = ${f.toFixed(3)} Hz，T = ${(1/f).toFixed(2)} s。時間使用上述實際模型頻率。橫向視野隨弦長縮放，虛線為振幅包絡。`;
 }
 else if(kind==='wavefront'){
  if(v.shape==='sphere'){
   const cx=450,cy=255,rs=[55,110,165];dot(cx,cy,7,C.sum);txt('波源 S',cx+12,cy-12,C.sum,19);rs.forEach((r,i)=>{ctx.beginPath();ctx.strokeStyle=i===1?C.a:C.grid;ctx.lineWidth=i===1?4:2;ctx.arc(cx,cy,r,0,TAU);ctx.stroke();});
   for(const a of [0,Math.PI/2,Math.PI*1.25])arr(cx+125*Math.cos(a),cy+125*Math.sin(a),cx+185*Math.cos(a),cy+185*Math.sin(a),C.sum);
   line(cx+rs[0],cy+8,cx+rs[1],cy+8,C.sum,2);txt('λ：相鄰同類波前距離',cx+40,cy+35,C.sum,18);txt('通過波源 S 的平面截面',45,45);desc='圓是球面波通過波源的平面截面。三支箭頭表示不同位置的徑向傳播方向；波源到波面距離相等時形成球面。';
  } else if(v.shape==='solid'){
   const cx=450,cy=250,r=150;ctx.fillStyle='rgba(88,200,206,.15)';ctx.beginPath();ctx.arc(cx,cy,r,0,TAU);ctx.fill();ctx.strokeStyle=C.a;ctx.lineWidth=3;ctx.beginPath();ctx.arc(cx,cy,r,0,TAU);ctx.stroke();
   ctx.fillStyle='rgba(255,190,116,.13)';ctx.beginPath();ctx.moveTo(cx-r-35,cy-28);ctx.lineTo(cx+r+35,cy-28);ctx.lineTo(cx+r+35,cy+28);ctx.lineTo(cx-r-35,cy+28);ctx.closePath();ctx.fill();line(cx-r-35,cy-28,cx+r+35,cy-28,C.sum,2);line(cx-r-35,cy+28,cx+r+35,cy+28,C.sum,2);
   ctx.beginPath();ctx.ellipse(cx,cy,r,48,0,Math.PI,TAU);ctx.strokeStyle=C.a;ctx.lineWidth=4;ctx.stroke();ctx.beginPath();ctx.ellipse(cx,cy,r,48,0,0,Math.PI);ctx.strokeStyle=C.a;ctx.setLineDash([7,6]);ctx.stroke();ctx.setLineDash([]);dot(cx,cy,7,C.sum);txt('球面（正投影外形）',45,45);txt('穿過球心的截面平面',300,cy+18,C.sum,18);txt('粗線：可辨認的截面圓',300,cy+70,C.a,18);desc='球的正投影外輪廓是圓；穿過球心的平面以色帶表示。截面和球面相交成圓，遠側用虛線表示。';
  } else if(v.shape==='local'){
   const cx=450,cy=245,r=150,t=.68,px=cx+r*Math.cos(t),py=cy+r*Math.sin(t),ux=Math.cos(t),uy=Math.sin(t);
   ctx.beginPath();ctx.arc(cx,cy,r,0,TAU);ctx.strokeStyle=C.grid;ctx.lineWidth=2;ctx.stroke();ctx.beginPath();ctx.arc(cx,cy,r,t-.3,t+.3);ctx.strokeStyle=C.a;ctx.lineWidth=6;ctx.stroke();dot(cx,cy,7,C.ink);dot(px,py,7,C.sum);arr(cx,cy,px,py,C.sum);line(px-uy*85,py+ux*85,px+uy*85,py-ux*85,C.ink,2,true);txt('波源 S',cx-55,cy-14,C.ink,18);txt('P 在圓周上',px+8,py-8,C.sum);txt('局部切線',45,45);desc='P 位於圓形截面波前上。橘色 SP 箭頭表示徑向傳播方向；虛線切線與 SP 垂直。遠離波源的小弧可近似直線。';
  } else {
   for(let x=240;x<=660;x+=105){line(x,105,x,395,C.a,4);arr(x,410,x+60,410,C.sum);}line(160,250,740,250,C.grid,1,true);txt('平行波前',45,45,C.a);txt('共同法線／傳播方向',530,455,C.sum,18);desc='平面波的波前彼此平行；共同法線垂直各條波前，代表一致的傳播方向。';

  }
 }
 else if(kind==='huygens'){
  const r=time*v.v*18,ys=[120,180,250,320,380];line(160,75,160,420,C.a,4);for(const y of ys){ctx.save();ctx.beginPath();ctx.rect(160,y-r-2,760,r*2+4);ctx.clip();ctx.beginPath();ctx.arc(160,y,r,Math.PI*1.5,Math.PI*.5);ctx.strokeStyle=C.b;ctx.lineWidth=2;ctx.stroke();ctx.restore();dot(160,y,4,C.a);}line(160+r,65,160+r,435,C.sum,4);arr(190,455,340,455,C.sum);txt('原波前',55,40,C.a);txt('向前的共同包絡線',Math.min(600,180+r),40,C.sum);desc=`Δt = ${time.toFixed(2)}（模型時間）；每個子波半徑同為 vΔt = ${(time*v.v).toFixed(2)} 示意單位。橘線是向前共同包絡線。`;
 }
 else if(kind==='water'){
  const mode=settings.waterDiffraction?'diffraction':(settings.view??v.view),cx=450,cy=250;
  if(mode==='reflection'){
   const ang=(v.angle??30)*Math.PI/180,g=wallReflectionGeometry(ang,540,cy),cs=Math.cos(ang),sn=Math.sin(ang),hitX=540,hitY=cy,half=78;ctx.fillStyle='#123540';ctx.fillRect(0,0,900,500);line(hitX,65,hitX,435,C.sum,5);line(80,hitY,830,hitY,C.muted,2,true);txt('牆',555,90,C.sum);txt('法線（垂直牆面）',85,hitY-12,C.muted);
   const clipLine=(x1,y1,x2,y2,col)=>line(Math.min(hitX-10,x1),y1,Math.min(hitX-10,x2),y2,col,2);
   for(let j=1;j<=3;j++){let q=j*76,cx=hitX-cs*q,iy=hitY+sn*q;clipLine(cx-half*sn,iy-half*cs,cx+half*sn,iy+half*cs,C.a);let rx=hitX-cs*q,ry=hitY-sn*q;clipLine(rx-half*sn,ry+half*cs,rx+half*sn,ry-half*cs,C.b);}
   arr(...g.incomingStart,...g.incomingEnd,C.a);arr(...g.reflectedStart,...g.reflectedEnd,C.b);ctx.beginPath();ctx.arc(hitX,hitY,52,Math.PI-ang,Math.PI);ctx.strokeStyle=C.a;ctx.lineWidth=2;ctx.stroke();ctx.beginPath();ctx.arc(hitX,hitY,52,Math.PI,Math.PI+ang);ctx.strokeStyle=C.b;ctx.stroke();txt('θᵢ',hitX-64,cy+37,C.a,17);txt('θᵣ',hitX-63,cy-40,C.b,17);desc=`俯視圖：牆是直線，法線垂直牆面。波前垂直傳播方向；入射角與反射角從法線量起且相等。入射角 ${v.angle}°。`;
  } else if(mode==='interference'){
   ctx.fillStyle='#10272e';ctx.fillRect(0,0,900,500);const lam=90*v.lambda,d=90*v.d/2;for(let x=0;x<900;x+=4)for(let y=60;y<445;y+=4){const xx=(x-cx)/90,yy=(y-cy)/90,r1=Math.hypot(xx+v.d/2,yy),r2=Math.hypot(xx-v.d/2,yy),dr=Math.abs(r1-r2)*90;if(interferenceAmplitudeFactor(dr,lam)<.10){ctx.fillStyle='#e8edf0';ctx.fillRect(x,y,3,3);}}
   dot(cx-d,cy,8,C.sum);dot(cx+d,cy,8,C.sum);txt('同相波源 S₁、S₂',45,45,C.sum);const px=650,py=180,r1=Math.hypot(px-(cx-d),py-cy),r2=Math.hypot(px-(cx+d),py-cy),dr=Math.abs(r1-r2);dot(px,py,7,C.sum);line(cx-d,cy,px,py,C.a,1,true);line(cx+d,cy,px,py,C.b,1,true);txt('P',px+10,py,C.sum);desc=`白線是穩定節線（合振幅接近零），不是瞬間水面高度。P 點 Δr/λ = ${(dr/lam).toFixed(2)}；整數波長差加強，半整數波長差抵消。`;
  } else if(mode==='diffraction'){
   const ratio=v.a;ctx.fillStyle='#10272e';ctx.fillRect(0,0,900,500);for(let x=65;x<435;x+=65)line(x,70,x,430,C.a,2);ctx.fillStyle='#d8e8e9';ctx.fillRect(450,70,10,150-ratio*12);ctx.fillRect(450,350+ratio*12,10,80);const gap=Math.max(18,ratio*18);ctx.fillStyle='#d8e8e9';ctx.fillRect(450,70,10,cy-gap/2-70);ctx.fillRect(450,cy+gap/2,10,430-cy-gap/2);for(let r=65;r<380;r+=65){ctx.beginPath();ctx.arc(460,cy,r,-Math.PI/2,Math.PI/2);ctx.strokeStyle=C.sum;ctx.lineWidth=2;ctx.stroke();}txt('入射平行波前',65,45,C.a);txt('窄縫 a',470,cy+7,C.sum);txt('出射波前展開',600,45,C.sum);desc=`俯視圖示意：a/λ = ${ratio.toFixed(1)}。比例越小，窄縫後的波前越向外展開。`;
  } else {
   const x=270,y=cy,rmax=205;dot(x,y,8,C.sum);for(let r=55;r<=rmax;r+=50){ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.strokeStyle=C.a;ctx.lineWidth=2;ctx.stroke();}for(let t=0;t<3;t++)arr(x+110*Math.cos(t*TAU/3),y+110*Math.sin(t*TAU/3),x+165*Math.cos(t*TAU/3),y+165*Math.sin(t*TAU/3),C.sum);txt('波源 S',x+14,y-15,C.sum);txt('同心圓：俯視波前',45,45);desc='圓弧表示同一時刻的波峰波前；離開點波源時向各方向傳播。圖為俯視示意，不代表水面高度。';
  }
 }
 else if(kind==='sound'||kind==='pipe'){
  const isPipe=kind==='pipe',vel=isPipe?343:331+.6*v.temp,L=isPipe?1:1.8,f=isPipe?tubeFrequency(vel,L,v.mode,v.end==='closed'):v.f,k=isPipe?(v.end==='closed'?(2*v.mode-1)*Math.PI/2:v.mode*Math.PI):TAU/(vel/f)*L;
  const xi=x=>isPipe?(v.end==='closed'?Math.sin(k*x):Math.cos(k*x))*Math.cos(TAU*time*.5):Math.cos(k*x-TAU*time*.5);
  const pressure=x=>isPipe?(v.end==='closed'?-Math.cos(k*x):Math.sin(k*x))*Math.cos(TAU*time*.5):Math.sin(k*x-TAU*time*.5);
  for(let i=0;i<=45;i++){let x=i/45;for(let z of [-.5,0,.5])for(let y of [-.4,0,.4]){const p=project(-4+x*8+xi(x)*.14,y+.7,z);dot(...p,i===20&&z===0&&y===0?6:2.8,i===20&&z===0&&y===0?C.sum:C.a);}}
  if(isPipe){for(let z of [-.7,.7])p3([[-4,.1,z],[4,.1,z],[4,1.3,z],[-4,1.3,z]],C.grid,2);if(v.end==='closed')p3([[-4,.1,-.7],[-4,1.3,-.7],[-4,1.3,.7],[-4,.1,.7],[-4,.1,-.7]],C.sum,3);}
  line(70,385,830,385);path(sample(x=>[70+760*x,385-45*(v.graph==='pressure'?pressure(x):xi(x))],0,1),v.graph==='pressure'?C.b:C.sum,3);
  txt('粒子实际沿管軸前後振動（慢動作）',45,40);txt(v.graph==='pressure'?'壓力增量—位置圖':'位移—位置圖',60,310,v.graph==='pressure'?C.b:C.sum,18);txt('位置 →',745,470,C.muted,18);
  desc=isPipe?`${v.end==='closed'?'左閉右開':'兩端開口'}；L = 1 m；模式 ${v.mode}；f = ${f.toFixed(1)} Hz；λ = ${(vel/f).toFixed(2)} m。閉端：位移節／壓力腹；開端相反。`:`T = ${v.temp} °C；v ≈ ${vel.toFixed(1)} m/s；f = ${v.f} Hz；λ = ${(vel/f).toFixed(3)} m。粒子位移已放大，動畫頻率已減慢。`;
 }
 else if(kind==='timbre'){
  const y=x=>Math.sin(x)+v.second*Math.sin(2*x)+v.third*Math.sin(3*x);line(60,255,840,255);path(sample(x=>[60+x/TAU*195,255-65*y(x-time)],0,TAU*4),C.sum,3);path(sample(x=>[60+x/TAU*195,255-65*Math.sin(x-time)],0,TAU*4),C.a,2,true);txt('橘：合成　青虛線：基音',50,55);txt('一段時間的波形 →',540,430,C.muted);desc=`基音頻率固定；第二諧音比例 ${v.second.toFixed(2)}，第三諧音比例 ${v.third.toFixed(2)}。此視覺模型不播放聲音。`;
 }
 else if(kind==='resonance'){
  const scale=23,A=resonance(v.r,v.z);line(70,390,830,390);path(sample(r=>[70+(r-.2)/1.8*760,390-scale*resonance(r,v.z)],.2,2),C.a,3);const px=70+(v.r-.2)/1.8*760,py=390-scale*A;dot(px,py,8,C.sum);line(px,390,px,py,C.sum,1,true);txt('穩態振幅（相對值）',45,45);txt('驅動頻率比 f/f₀ →',580,455,C.muted);dot(450+Math.min(130,A*15)*Math.cos(TAU*v.r*time),110,12,C.sum);desc=`相對穩態振幅 ${A.toFixed(2)}；阻尼比 ${v.z.toFixed(2)}。圓點是穩態振動示意，不顯示起始暫態。`;
 }
 else if(kind==='resonanceTube'){
  const lambda=343/v.f,k=TAU/lambda,amp=1/Math.sqrt(Math.cos(k*v.L)**2+.03),height=v.L/1.4*310;
  line(220,80,220,425,C.muted,5);line(380,80,380,425,C.muted,5);ctx.fillStyle='#1b697a';ctx.fillRect(223,90+height,154,335-height);line(220,90+height,380,90+height,C.a,4);
  for(let j=0;j<30;j++){let x=v.L*j/29;dot(300,90+height-x/1.4*310-4*Math.sin(k*x)*Math.cos(TAU*time),3,C.sum);}txt('開口',235,60);txt('水面（閉端）',390,90+height,C.a,18);
  for(let m=1;m<=5;m++){const len=(2*m-1)*lambda/4;if(len<=1.4){let Y=90+len/1.4*310;line(420,Y,455,Y,C.b,3);txt(`${len.toFixed(3)} m`,465,Y+5,C.b,17);}}
  txt('右側刻度：預期共鳴長度',440,50,C.muted,18);desc=`λ = ${lambda.toFixed(3)} m；相鄰共鳴差 ${(lambda/2).toFixed(3)} m；當前相對反應 ${amp.toFixed(2)}。忽略管口修正；反應峰以有限損耗示意，非聲壓校準。`;
 }
 else if(kind==='refraction'){
  if(settings.water){
   const ratio=v.ratio,ang=v.angle*Math.PI/180,theta=Math.asin(Math.max(-1,Math.min(1,ratio*Math.sin(ang))));ctx.fillStyle='#123540';ctx.fillRect(0,0,900,245);ctx.fillStyle='#1c5660';ctx.fillRect(0,255,900,245);line(55,250,845,250,C.ink,3);line(450,70,450,430,C.muted,2,true);txt('深水：較快',65,70,C.a);txt('淺水：較慢',65,300,C.sum);txt('界面',470,240);txt('法線',462,65,C.muted);
   for(let d=90;d<=360;d+=90){const x=450-d*Math.sin(ang),y=250-d*Math.cos(ang),L=100;line(x-L*Math.cos(ang),y+L*Math.sin(ang),x+L*Math.cos(ang),y-L*Math.sin(ang),C.a,3);const dd=refractedWavefrontSpacing(d,ratio),x2=450+dd*Math.sin(theta),y2=250+dd*Math.cos(theta);line(x2-L*Math.cos(theta),y2+L*Math.sin(theta),x2+L*Math.cos(theta),y2-L*Math.sin(theta),C.sum,3);}
   const incEnd=[450,250],incStart=[450-190*Math.sin(ang),250-190*Math.cos(ang)],outEnd=[450+190*Math.sin(theta),250+190*Math.cos(theta)];arr(...incStart,...incEnd,C.a);arr(...incEnd,...outEnd,C.sum);txt('λ₁',320,155,C.a);txt(ratio<1?'λ₂ 較短':'λ₂ 相同',560,350,C.sum);desc=`v₂/v₁ = ${ratio.toFixed(2)}；入射角固定 ${v.angle}°；折射角 ${((theta*180/Math.PI)).toFixed(1)}°。頻率不變，λ₂/λ₁ = ${ratio.toFixed(2)}。${ratio<1?'此時第二區波速較慢、波長較短。':'兩區波速與波長相同，方向不變。'}`;
  } else {
  const water=settings.water,n1=water?1:v.n1,n2=water?1/v.ratio:v.n2,theta=refract(n1,n2,v.angle),ang=v.angle*Math.PI/180;
  const R=2.7,inc=[-R*Math.sin(ang),R*Math.cos(ang),0],ref=[R*Math.sin(ang),R*Math.cos(ang),0];
  p3([[-4,0,-1.4],[4,0,-1.4],[4,0,1.4],[-4,0,1.4],[-4,0,-1.4]],C.grid,2);line3([0,-3,0],[0,3,0],C.muted,true);line3(inc,[0,0,0],C.a);line3([0,0,0],ref,C.b);label3('入射',inc,C.a);label3('反射',ref,C.b);label3('法線',[0,3,0],C.muted);
  const frac=(time%2)/2;dot(...project(...inc.map(x=>x*(1-frac))),6,C.a);dot(...project(...ref.map(x=>x*frac)),5,C.b);
  if(theta!==null){let r=theta*Math.PI/180,tr=[R*Math.sin(r),-R*Math.cos(r),0];line3([0,0,0],tr,C.sum);label3('折射',tr,C.sum);dot(...project(...tr.map(x=>x*frac)),6,C.sum);
   if(water){for(let d=.6;d<2.6;d+=.6){let x=-d*Math.sin(ang),y=d*Math.cos(ang);line3([x-.65*Math.cos(ang),y-.65*Math.sin(ang),0],[x+.65*Math.cos(ang),y+.65*Math.sin(ang),0],C.a);let a=d*v.ratio;line3([a*Math.sin(r)-.65*Math.cos(r),-a*Math.cos(r)-.65*Math.sin(r),0],[a*Math.sin(r)+.65*Math.cos(r),-a*Math.cos(r)+.65*Math.sin(r),0],C.sum);}}}
  const crit=n1>n2?Math.asin(n2/n1)*180/Math.PI:null;txt(`入射 ${v.angle.toFixed(1)}°`,40,45,C.a);txt(theta===null?'全反射':`折射 ${theta.toFixed(1)}°`,620,45,C.sum);
  desc=`${water?`v₂/v₁ = ${v.ratio.toFixed(2)}；λ₂/λ₁ = ${v.ratio.toFixed(2)}`:`n₁ = ${n1.toFixed(2)}；n₂ = ${n2.toFixed(2)}`}；θᵣ = θᵢ = ${v.angle.toFixed(1)}°。${crit?`臨界角 ${crit.toFixed(2)}°。`:''}${theta===null?'沒有傳入第二介質的傳播光線。':Math.abs(theta-90)<.01?'目前為臨界狀態。':'頻率跨界面不變。'} 光點只標示方向，非光速比例。`;
 }
 }
 else if(kind==='apparent'){
  const cx=430,cy=170,scale=80,real=cy+v.depth*scale,virtual=cy+v.depth/v.n*scale;ctx.fillStyle='#174652';ctx.fillRect(60,cy,780,290);line(60,cy,840,cy,C.a,3);dot(cx,real,9,C.sum);dot(cx,virtual,7,C.b);txt('實物',cx+15,real,C.sum);txt('近軸虛像',cx+15,virtual,C.b);
  for(let dx of [-30,-15,15,30]){const x=cx+dx,i=Math.atan(Math.abs(dx)/(v.depth*scale)),out=Math.asin(v.n*Math.sin(i)),endX=x+Math.sign(dx)*(cy-30)*Math.tan(out);line(cx,real,x,cy,C.sum);line(x,cy,endX,30,C.a);line(x,cy,cx,virtual,C.b,2,true);}txt('空氣：眼睛接收折射光',60,55);desc=`真深 ${v.depth.toFixed(1)} m；近軸視深 ≈ ${(v.depth/v.n).toFixed(2)} m。虛線為近軸反向延長示意，並非光實際向後傳播。`;
 }
 else if(kind==='dispersion'){
  const i=v.angle*Math.PI/180;line(50,200,850,200,C.grid,3);line(430,60,430,450,C.muted,1,true);line(430-170*Math.sin(i),200-170*Math.cos(i),430,200,C.ink,5);
  for(const [n,col] of [[1.50,'#ff8282'],[1.52,'#ffcf80'],[1.54,'#a6e3a5'],[1.56,'#80beff'],[1.58,'#cf9cff']]){const r=Math.asin(Math.sin(i)/n);line(430,200,430+260*Math.sin(r),200+260*Math.cos(r),col,3);}txt('白光入射',50,50);txt('角度差很小：這裡只畫單一界面',50,470,C.muted,19);desc=`入射 ${v.angle}°。本模型 n紅 = 1.50、n紫 = 1.58；紫光折射角更小，較靠近法線。數值為可辨識差異的示意。`;
 }
 else if(kind==='fiber'){
  const angle=90-v.alpha,critical=v.core>v.clad?Math.asin(v.clad/v.core)*180/Math.PI:null,ok=critical!==null&&angle>critical;ctx.fillStyle='#1d4650';ctx.fillRect(60,140,780,190);line(60,140,840,140,C.muted,3);line(60,330,840,330,C.muted,3);let x=60,y=235,dir=-1;let pts=[[x,y]];
  for(let i=0;i<8&&x<840;i++){const target=dir<0?140:330,dx=Math.abs(target-y)/Math.tan(v.alpha*Math.PI/180);if(x+dx>840){pts.push([840,y+dir*(840-x)*Math.tan(v.alpha*Math.PI/180)]);break;}x+=dx;y=target;pts.push([x,y]);if(!ok){let transmitted=refract(v.core,v.clad,angle);const r=(transmitted??angle)*Math.PI/180;pts.push([x+100*Math.sin(r),y+dir*100*Math.cos(r)]);break;}dir*=-1;}path(pts,C.sum,4);txt('包層',65,100,C.muted);txt('纖芯',65,370,C.a);desc=`界面入射角 = ${angle.toFixed(1)}°；${critical?`臨界角 = ${critical.toFixed(1)}°`:'無高到低折射率條件'}；${ok?'符合全反射導光條件':'不符合全反射條件，圖示透射路徑（另仍可能有部分反射）'}。`;
 }
 else if(kind==='lens'){
  const f=v.type==='convex'?v.f:-v.f,{q,m}=lens(f,v.p),p=v.p,scale=1;line3([-5.5,0,0],[5.5,0,0],C.muted);p3(sample(a=>[0,1.6*Math.cos(a),1.6*Math.sin(a)],0,TAU,70),C.b,3);
  // All coordinates share one scale, so geometric intersections match the lens equation.
  const fit=Math.min(1,4.8/Math.max(p,Number.isFinite(q)?Math.abs(q):p));const P=p*fit,F=f*fit,Q=q*fit,H=.85*fit;
  const world=pt=>[pt[0],pt[1],pt[2]||0];
  line3([-P,0,0],[-P,H,0],C.a);label3('物',[-P,H,0],C.a);
  for(let z of [-.55,0,.55]){const Y=z===0?H:0,Z=z;line3([-P,H,0],[0,Y,Z],C.a);const end=4.9;let dy=(Y-H)/P-Y/F,dz=Z/P-Z/F;line3([0,Y,Z],[end,Y+dy*end,Z+dz*end],C.sum);if(q<0)line3([0,Y,Z],[Q,m*H,0],C.b,true);}
  for(let x of [-Math.abs(F),Math.abs(F)]){dot(...project(x,0,0),4,C.sum);label3('F',[x,0,0],C.sum);}
  if(Number.isFinite(q)){line3([Q,0,0],[Q,m*H,0],q>0?C.sum:C.b,q<0);label3(q>0?'實像':'虛像',[Q,m*H,0],q>0?C.sum:C.b);}txt('實線：光線；虛線：反向延長',35,40);desc=`f = ${f.toFixed(1)} cm；p = ${p.toFixed(1)} cm；${Number.isFinite(q)?`q = ${q.toFixed(2)} cm；m = ${m.toFixed(2)}（${m>0?'正立':'倒立'}）`:'p = f，出射光平行，無有限像距'}。近軸薄透鏡；視野隨物像距調整。`;
 }
 else if(kind==='em'){
  const pol=v.pol*Math.PI/180,w=x=>Math.sin(TAU*(x/3-time*.5));line3([-4,0,0],[4,0,0],C.muted);
  p3(sample(x=>[x,w(x)*Math.cos(pol),w(x)*Math.sin(pol)],-4,4),C.a,3);p3(sample(x=>[x,-w(x)*Math.sin(pol),w(x)*Math.cos(pol)],-4,4),C.b,3);
  for(let x=-4;x<=4;x+=.25){line3([x,0,0],[x,w(x)*Math.cos(pol),w(x)*Math.sin(pol)],C.a);line3([x,0,0],[x,-w(x)*Math.sin(pol),w(x)*Math.cos(pol)],C.b);}
  txt('E 電場：青色　B 磁場：紫色',35,45);label3('傳播 +x',[4,0,0],C.sum);desc=`E 與 B 同相且彼此垂直，E × B 指向 +x。偏振角 ${v.pol}°。兩場以各自振幅正規化；高度不代表 E 與 B 的 SI 數值相同。`;
 }
 else if(kind==='diffraction'&&settings.water){
  const ratio=v.a,opening=diffractionHalfAngle(ratio);ctx.fillStyle='#10272e';ctx.fillRect(0,0,900,500);for(let x=65;x<435;x+=65)line(x,70,x,430,C.a,2);const gap=Math.max(18,ratio*18);ctx.fillStyle='#d8e8e9';ctx.fillRect(450,70,10,250-gap/2-70);ctx.fillRect(450,250+gap/2,10,430-250-gap/2);for(let r=65;r<380;r+=65){ctx.beginPath();ctx.arc(460,250,r,-opening,opening);ctx.strokeStyle=C.sum;ctx.lineWidth=2;ctx.stroke();}txt('入射平行波前',65,45,C.a);txt('單縫 a',470,257,C.sum);txt('出射波前展開',600,45,C.sum);desc=`俯視示意：縫寬 a/λ = ${ratio.toFixed(1)}。a/λ 越小，縫後的波前越明顯向外展開。這不是水面高度圖。`;
 }
 else if(['doubleSlit','diffraction','combined'].includes(kind)){
  const water=settings.water,lambda=water?1:(v.lambda*1e-9/(v.n||1)),a=water?v.a:(v.a||.1)*1e-3,d=(v.d||.25)*1e-3,L=v.L||1.5,extent=water?1: .025;
  const intensity=y=>{const sin=water?y: y/Math.hypot(L,y),one=singleIntensity(a,lambda,sin),two=doubleIntensity(d,lambda,sin,(v.phase||0)*Math.PI/180);return kind==='doubleSlit'?two:kind==='combined'?one*two:one;};
  txt(water?'窄縫的遠場角分布':kind==='doubleSlit'?'理想雙縫強度':kind==='combined'?'雙縫細紋 × 單縫包絡':'單縫繞射強度',45,45);
  for(let px=70;px<830;px++){let y=(px-450)/380*extent,I=intensity(y),b=Math.round(255*I);ctx.fillStyle=`rgb(${Math.round(b*.5)},${b},${Math.round(b*.87)})`;ctx.fillRect(px,90,1,85);}
  line(70,420,830,420);path(sample(y=>[450+y/extent*380,420-190*intensity(y)],-extent,extent,600),C.a,3);if(kind==='combined')path(sample(y=>[450+y/extent*380,420-190*singleIntensity(a,lambda,y/Math.hypot(L,y))],-extent,extent,600),C.b,2,true);
  line(450,205,450,430,C.grid,1,true);txt('0',445,452,C.muted,17);txt(water?'sin θ（−1 至 +1）':'屏上位置（−25 至 +25 mm）',510,480,C.muted,18);
  if(water)desc=`a/λ = ${a.toFixed(1)}。圖為均勻孔徑、遠場的角分布示意；a/λ 越小，主峰展開越廣。`;
  else desc=kind==='doubleSlit'?`相鄰亮紋間距 ≈ ${(lambda*L/d*1000).toFixed(2)} mm；中心 I/I最大 = ${intensity(0).toFixed(2)}。窄縫、同調等振幅，忽略單縫包絡。`:kind==='combined'?`細紋間距 ≈ ${(lambda*L/d*1000).toFixed(2)} mm；中央包絡寬 ≈ ${(2*lambda*L/a*1000).toFixed(2)} mm。固定 L = 1.5 m。`:`中央亮紋寬 ≈ ${(2*lambda*L/a*1000).toFixed(2)} mm。強度正規化；縮縫後亮度不宜用此圖直接比較總能量。`;
 }
 readout.textContent=desc;canvas.setAttribute('aria-label',desc);
 }
 function pause(){playing=false;play.textContent='播放';cancelAnimationFrame(raf);}
 function tick(now){if(!alive||!playing)return;let dt=last?Math.min(.05,(now-last)/1000):0;last=now;time+=dt;if(time>=8){time=8;pause();}draw();if(playing)raf=requestAnimationFrame(tick);}
 play.onclick=()=>{if(playing)pause();else{if(time>=8)time=0;playing=true;last=0;play.textContent='暫停';raf=requestAnimationFrame(tick);}};
 host.querySelector('[data-step]').onclick=()=>{pause();time=Math.min(8,time+.05);draw();};const restart=host.querySelector('[data-restart]');if(restart)restart.onclick=()=>{pause();time=0;draw();if(!settings.static)play.onclick();};
 host.querySelector('[data-reset]').onclick=()=>{pause();time=0;pitch=.43;controls.forEach(c=>{values[c.key]=settings[c.key]??c.value;host.querySelector(`[data-control="${c.key}"]`).value=values[c.key];});draw();};
 slider.oninput=()=>{pause();time=Number(slider.value);draw();};host.querySelectorAll('[data-control]').forEach(e=>e.oninput=()=>{values[e.dataset.control]=e.tagName==='SELECT'?e.value:Number(e.value);draw();});
 if(three){canvas.onpointerdown=e=>{drag=[e.clientX,e.clientY,values.yaw,pitch];canvas.setPointerCapture(e.pointerId);};canvas.onpointermove=e=>{if(!drag)return;values.yaw=Math.max(-180,Math.min(180,drag[2]+(e.clientX-drag[0])*.4));pitch=Math.max(-1.2,Math.min(1.2,drag[3]+(e.clientY-drag[1])*.005));host.querySelector('[data-control="yaw"]').value=values.yaw;draw();};canvas.onpointerup=canvas.onpointercancel=()=>drag=null;}
 const onVisibility=()=>{if(document.hidden)pause();};document.addEventListener('visibilitychange',onVisibility);draw();return()=>{alive=false;pause();document.removeEventListener('visibilitychange',onVisibility);};
}
