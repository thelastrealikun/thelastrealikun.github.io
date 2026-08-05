(function(){
'use strict';
var RM = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ================= 工具 ================= */
var BAYER = [[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]];
function bth(x,y){ return (BAYER[y&3][x&3]+0.5)/16; }
function hex(c){ return [parseInt(c.slice(1,3),16),parseInt(c.slice(3,5),16),parseInt(c.slice(5,7),16)]; }
function lerp(a,b,t){ return a+(b-a)*t; }
function mix(c1,c2,t){ return [lerp(c1[0],c2[0],t)|0, lerp(c1[1],c2[1],t)|0, lerp(c1[2],c2[2],t)|0]; }
function hash(x,y){ var h=(x*374761393+y*668265263)|0; h=(h^(h>>13))|0; h=(h*1274126177)|0; return ((h^(h>>16))>>>0)/4294967295; }

/* ================= 夜空画布 ================= */
var PIX = 3;                 /* 1 个缓冲像素 = 3 个 CSS 像素，颗粒可见 */
var sky = document.getElementById('sky');
var sctx = sky.getContext('2d');
var W=0, H=0;                /* 缓冲分辨率 */
var staticCv = document.createElement('canvas');
var moonSprite = null, moonX=0, moonY=0, moonR=0;
var clouds = [];             /* {cv,x,y,sp} */
var stars = [];              /* 十字星芒 {x,y,size,phase,speed,glow} */

/* 夜幕色带：仅用深蓝灰 */
var SKY_STOPS = [
  [0.00,'#060a14'],
  [0.42,'#0b1120'],
  [0.72,'#121b31'],
  [1.00,'#182645']
];
var PAL = (function(){
  var n=56, out=[], i;
  for(i=0;i<n;i++){
    var t=i/(n-1), s=0;
    while(s<SKY_STOPS.length-2 && t>SKY_STOPS[s+1][0]) s++;
    var a=SKY_STOPS[s], b=SKY_STOPS[s+1];
    var lt=(t-a[0])/(b[0]-a[0]);
    out.push(mix(hex(a[1]),hex(b[1]),Math.max(0,Math.min(1,lt))));
  }
  return out;
})();

function buildStatic(){
  staticCv.width=W; staticCv.height=H;
  var c=staticCv.getContext('2d');
  var img=c.createImageData(W,H), d=img.data, x, y, i;
  for(y=0;y<H;y++){
    var f=(y/(H-1))*(PAL.length-1), i0=Math.floor(f), fr=f-i0;
    if(i0>=PAL.length-1){ i0=PAL.length-2; fr=1; }
    var A=PAL[i0], B=PAL[i0+1];
    for(x=0;x<W;x++){
      /* Bayer 有序抖动过渡 */
      var cc = fr > bth(x,y) ? B : A;
      i=(y*W+x)*4;
      d[i]=cc[0]; d[i+1]=cc[1]; d[i+2]=cc[2]; d[i+3]=255;
    }
  }
  /* 细碎暗星：稀疏、克制 */
  var nStar=Math.floor(W*H*0.0011);
  var cols=[hex('#4a5b82'),hex('#5d7099'),hex('#7c8fb8'),hex('#a9bad9')];
  for(var s=0;s<nStar;s++){
    x=(hash(s,7)*W)|0; y=(hash(s,13)*H)|0;
    var col=cols[(hash(s,29)*cols.length)|0];
    i=(y*W+x)*4;
    d[i]=col[0]; d[i+1]=col[1]; d[i+2]=col[2];
    if(hash(s,41)>0.86 && x+1<W){ i+=4; d[i]=col[0];d[i+1]=col[1];d[i+2]=col[2]; }
  }
  c.putImageData(img,0,0);
}

function buildMoon(){
  moonR=Math.max(20,Math.min(44,Math.round(Math.min(W,H)*0.105)));
  var pad=16, S=(moonR+pad)*2;
  var cv=document.createElement('canvas'); cv.width=S; cv.height=S;
  var c=cv.getContext('2d');
  var img=c.createImageData(S,S), d=img.data, x, y, i;
  var cx=S/2, cy=S/2;
  var light=hex('#f4f7ff'), shade=hex('#bfcbe4'), rim=hex('#8b9cc2');
  /* 环形山：相对坐标 */
  var craters=[[-0.30,-0.20,0.16],[0.14,-0.36,0.11],[0.32,0.14,0.13],[-0.06,0.34,0.09],[-0.46,0.20,0.075],[0.05,-0.05,0.06]];
  var Lx=-0.58, Ly=-0.62;
  for(y=0;y<S;y++) for(x=0;x<S;x++){
    var dx=x-cx, dy=y-cy, dist=Math.sqrt(dx*dx+dy*dy);
    i=(y*S+x)*4;
    if(dist<=moonR){
      var nx=dx/moonR, ny=dy/moonR;
      var lum=0.5-0.5*(nx*Lx+ny*Ly);   /* 全月：仅轻微明暗 */
      var t=Math.min(1,Math.max(0,(lum-0.28)*1.1));
      var col = t>bth(x,y) ? shade : light;
      if(dist>moonR-1) col=rim;         /* 边缘描深 */
      /* 环形山 */
      for(var k=0;k<craters.length;k++){
        var cr=craters[k], px=dx-cr[0]*moonR, py=dy-cr[1]*moonR;
        var cd=Math.sqrt(px*px+py*py), rr=cr[2]*moonR;
        if(cd<=rr){
          if(cd>rr-1.1){ col=hex('#93a3c6'); }        /* 坑沿 */
          else { col = (t+0.12>bth(x,y)) ? hex('#aeb9d6') : hex('#ccd6ec'); }
        }
      }
      d[i]=col[0];d[i+1]=col[1];d[i+2]=col[2];d[i+3]=255;
    }else if(dist<=moonR+pad){
      /* 微弱光晕：抖动稀疏点 */
      var p=(1-(dist-moonR)/pad)*0.85;
      if(p>bth(x,y)){ d[i]=235;d[i+1]=241;d[i+2]=255;d[i+3]=Math.round(38*p); }
    }
  }
  c.putImageData(img,0,0);
  moonSprite=cv;
  moonX=Math.round(W*0.74)-S/2; moonY=Math.round(H*0.26)-S/2;
  if(moonY<6) moonY=6;
}

function makeCloud(w,h,blobs,core,edge,alpha){
  var cv=document.createElement('canvas'); cv.width=w; cv.height=h;
  var c=cv.getContext('2d');
  var img=c.createImageData(w,h), d=img.data, x, y, i;
  var C=hex(core), E=hex(edge);
  for(y=0;y<h;y++) for(x=0;x<w;x++){
    var den=0;
    for(var b=0;b<blobs.length;b++){
      var B=blobs[b], dx=(x-B[0])/B[2], dy=(y-B[1])/B[3];
      den+=Math.exp(-(dx*dx+dy*dy))*B[4];
    }
    den+= (hash(x,y)-0.5)*0.16;
    /* 抖动晕染：密度与 Bayer 阈值比较，形成朦胧边缘 */
    if(den > bth(x,y)*1.05){
      var col = den>0.62 ? C : E;
      i=(y*w+x)*4;
      d[i]=col[0];d[i+1]=col[1];d[i+2]=col[2];
      d[i+3]=Math.round(alpha*Math.min(1,den*1.25)*255);
    }
  }
  c.putImageData(img,0,0);
  return cv;
}

function buildClouds(){
  clouds=[];
  function blobRow(w,h,n,ry){
    var out=[];
    for(var i=0;i<n;i++){
      out.push([w*(0.12+0.76*i/(n-1)), h*(0.5+(hash(i,w)-0.5)*0.3),
                w*(0.16+hash(i,h)*0.12), h*(0.5+hash(i+n,w)*0.3)*ry, 0.5+hash(i,n)*0.5]);
    }
    return out;
  }
  var defs=[
    {w:Math.round(W*0.34),h:26,x:0.06,y:0.14,sp:1.6,a:0.34,core:'#3d4f7a',edge:'#2b3a5e'},
    {w:Math.round(W*0.26),h:20,x:0.50,y:0.07,sp:1.1,a:0.26,core:'#35466e',edge:'#273554'},
    {w:Math.round(W*0.42),h:30,x:0.30,y:0.68,sp:2.3,a:0.30,core:'#3a4c76',edge:'#293757'}
  ];
  for(var i=0;i<defs.length;i++){
    var D=defs[i];
    clouds.push({
      cv:makeCloud(Math.max(60,D.w),D.h,blobRow(Math.max(60,D.w),D.h,4,0.8),D.core,D.edge,D.a),
      x:D.x*W, y:D.y*H, sp:D.sp
    });
  }
}

function buildStars(){
  stars=[];
  var n=8, tries=0;
  while(stars.length<n && tries<400){
    tries++;
    var x=(hash(tries,101)*W)|0, y=(hash(tries,103)*H*0.72)|0;
    var mcx=moonX+moonR+16, mcy=moonY+moonR+16;
    if(Math.sqrt((x-mcx)*(x-mcx)+(y-mcy)*(y-mcy)) < moonR+34) continue;  /* 避开月球 */
    var big = stars.length<3;
    stars.push({
      x:x, y:y,
      size: big?2:1,
      glow: big,
      phase: hash(tries,107)*6.283,
      speed: 0.9+hash(tries,109)*1.4
    });
  }
}

function drawCrossStar(c,t,st){
  var b=0.55+0.45*Math.sin(t*st.speed+st.phase);   /* 明灭闪动 */
  var L=st.size+1+(b>0.86?1:0);
  var a=[Math.round(255*b),Math.round(255*b*0.92),Math.round(255*b*0.8)];
  function px(x,y,alpha,col){
    if(x<0||y<0||x>=W||y>=H||alpha<=0) return;
    c.fillStyle=col||('#ffffff');
    c.globalAlpha=Math.min(1,alpha);
    c.fillRect(x,y,1,1);
  }
  /* 大星：微弱白色光晕（抖动点） */
  if(st.glow){
    for(var gy=-4;gy<=4;gy++) for(var gx=-4;gx<=4;gx++){
      var gd=Math.sqrt(gx*gx+gy*gy);
      if(gd>1.6 && gd<4.4 && (1-(gd-1.6)/2.8)*b > bth(st.x+gx,st.y+gy)*1.35){
        px(st.x+gx,st.y+gy,0.14*b,'#e8eeff');
      }
    }
  }
  /* 十字星芒 */
  for(var k=1;k<=L;k++){
    var fa=b*(1-k/(L+1));
    px(st.x+k,st.y,fa,'#dbe6ff'); px(st.x-k,st.y,fa,'#dbe6ff');
    px(st.x,st.y+k,fa,'#dbe6ff'); px(st.x,st.y-k,fa,'#dbe6ff');
  }
  px(st.x,st.y,Math.min(1,0.75+0.25*b),'#ffffff');
  if(st.size>1){ px(st.x+1,st.y,b*0.9,'#eef3ff'); px(st.x,st.y+1,b*0.9,'#eef3ff'); px(st.x+1,st.y+1,b*0.85,'#e6edff'); }
  c.globalAlpha=1;
}

/* ---- 流星：稀疏的线条状轨迹 ---- */
var meteors=[];              /* {x,y,vx,vy,born,life,trail} */
var nextMeteor=2.5;          /* 下一颗流星的出现时刻（秒） */

function spawnMeteor(t){
  /* 自顶部斜向划过，方向随机 */
  var fromLeft=Math.random()<0.5;
  var ang=(22+Math.random()*16)*Math.PI/180;
  var sp=120+Math.random()*90;
  var dir=fromLeft?1:-1;
  meteors.push({
    x:fromLeft?-14:W+14,
    y:-6+Math.random()*H*0.26,
    vx:Math.cos(ang)*sp*dir,
    vy:Math.sin(ang)*sp,
    born:t,
    life:0.9+Math.random()*0.7,
    trail:9+((Math.random()*8)|0)
  });
  nextMeteor=t+4+Math.random()*7;   /* 4~11 秒一颗，保持稀疏 */
}

function drawMeteors(c,t){
  for(var i=meteors.length-1;i>=0;i--){
    var m=meteors[i], age=t-m.born;
    if(age>m.life){ meteors.splice(i,1); continue; }
    var hx=m.x+m.vx*age, hy=m.y+m.vy*age;
    if(hx<-24||hx>W+24||hy>H+24){ meteors.splice(i,1); continue; }
    var fade=age>m.life-0.35?(m.life-age)/0.35:1;
    var ul=Math.sqrt(m.vx*m.vx+m.vy*m.vy), ux=m.vx/ul, uy=m.vy/ul;
    for(var k=0;k<m.trail;k++){
      var gx=Math.round(hx-ux*k*2), gy=Math.round(hy-uy*k*2);
      if(gx<-2||gy<-2||gx>W+2||gy>H+2) continue;
      var a=fade*(1-k/m.trail);
      if(a<=0.05) continue;
      c.globalAlpha=a*(k===0?0.95:0.72);
      c.fillStyle=k<3?'#ffffff':'#c8d6f4';
      var s2=k===0?2:1;
      c.fillRect(gx,gy,s2,s2);
    }
  }
  c.globalAlpha=1;
}

function drawFrame(t){
  var c=sctx;
  c.imageSmoothingEnabled=false;
  c.clearRect(0,0,W,H);
  c.drawImage(staticCv,0,0);
  if(moonSprite) c.drawImage(moonSprite,moonX,moonY);
  /* 云烟缓慢漂移，回绕 */
  for(var i=0;i<clouds.length;i++){
    var cl=clouds[i], cw=cl.cv.width;
    var x=Math.round(((cl.x + (RM?0:t*cl.sp)) % (W+cw) + (W+cw)) % (W+cw) - cw);
    c.drawImage(cl.cv,x,Math.round(cl.y));
  }
  /* 流星：不时稀疏划过 */
  if(!RM){
    if(t>=nextMeteor) spawnMeteor(t);
    drawMeteors(c,t);
  }
  for(var s=0;s<stars.length;s++) drawCrossStar(c,t,stars[s]);
}

function rebuild(){
  /* 以画布实际显示尺寸为准：移动端地址栏/内置浏览器视口与 innerWidth 不一致时也不变形 */
  var rect=sky.getBoundingClientRect();
  var vw=rect.width||window.innerWidth, vh=rect.height||window.innerHeight;
  W=Math.max(160,Math.ceil(vw/PIX));
  H=Math.max(120,Math.ceil(vh/PIX));
  sky.width=W; sky.height=H;
  meteors=[]; nextMeteor=2+Math.random()*3;
  buildStatic(); buildMoon(); buildClouds(); buildStars();
  drawFrame(0);
}

/* ================= 星粒光标特效 ================= */
var dust=document.getElementById('dust');
var dctx=dust.getContext('2d');
var DW=0, DH=0;
var parts=[];
var lastX=-1, lastY=-1;
var P_COLORS=['#ffffff','#dbe6ff','#a9bce0'];

function dustResize(){
  var rect=dust.getBoundingClientRect();
  DW=dust.width=Math.max(1,Math.round(rect.width||window.innerWidth));
  DH=dust.height=Math.max(1,Math.round(rect.height||window.innerHeight));
}
function spawn(x,y){
  if(parts.length>140) return;
  var n=2+((Math.random()*2)|0);
  for(var i=0;i<n;i++){
    var ang=Math.random()*6.283;
    var sp=26+Math.random()*64;                 /* 短距离飞出 */
    parts.push({
      x:x, y:y,
      vx:Math.cos(ang)*sp, vy:Math.sin(ang)*sp,
      life:0, max:0.32+Math.random()*0.26,
      size:Math.random()<0.72?2:3,
      cross:Math.random()<0.16,
      col:P_COLORS[(Math.random()*P_COLORS.length)|0]
    });
  }
}
function onMove(x,y){
  if(lastX<0){ lastX=x; lastY=y; return; }
  var dx=x-lastX, dy=y-lastY, dist=Math.sqrt(dx*dx+dy*dy);
  if(dist>7){
    var steps=Math.min(3,Math.floor(dist/9)+1);
    for(var s=0;s<steps;s++){
      spawn(lastX+dx*(s+1)/(steps+1), lastY+dy*(s+1)/(steps+1));
    }
    lastX=x; lastY=y;
  }
}
function dustTick(dt){
  dctx.clearRect(0,0,DW,DH);
  for(var i=parts.length-1;i>=0;i--){
    var p=parts[i];
    p.life+=dt;
    if(p.life>=p.max){ parts.splice(i,1); continue; }
    p.x+=p.vx*dt; p.y+=p.vy*dt;
    var drag=Math.pow(0.90,dt*60);
    p.vx*=drag; p.vy*=drag;
    /* 阶梯式透明度，像素感淡出 */
    var k=1-p.life/p.max;
    var a=(Math.floor(k*5)/5)*0.9;
    if(a<=0) continue;
    var gx=Math.round(p.x/2)*2, gy=Math.round(p.y/2)*2;
    dctx.globalAlpha=a;
    dctx.fillStyle=p.col;
    if(p.cross){
      dctx.fillRect(gx-2,gy,2,2); dctx.fillRect(gx+2,gy,2,2);
      dctx.fillRect(gx,gy-2,2,2); dctx.fillRect(gx,gy+2,2,2);
      dctx.fillRect(gx,gy,2,2);
    }else{
      dctx.fillRect(gx,gy,p.size,p.size);
    }
  }
  dctx.globalAlpha=1;
}
if(!RM){
  window.addEventListener('mousemove',function(e){ onMove(e.clientX,e.clientY); },{passive:true});
  window.addEventListener('touchmove',function(e){
    if(e.touches.length) onMove(e.touches[0].clientX,e.touches[0].clientY);
  },{passive:true});
  dustResize();
}

/* ================= 主循环 ================= */
var last=0, acc=0, skyT=0;
function loop(ts){
  requestAnimationFrame(loop);
  var dt=Math.min(0.1,(ts-last)/1000||0.016); last=ts;
  acc+=dt;
  if(acc<1/30) return;      /* 30fps 足够，省电 */
  skyT+=acc; acc=0;
  drawFrame(skyT);
  dustTick(dt*2);
}

/* ================= 入场 reveal ================= */
var io=new IntersectionObserver(function(es){
  es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
},{threshold:0.12});
document.querySelectorAll('.reveal').forEach(function(el){ io.observe(el); });

/* ================= 导航「简历介绍」下拉 ================= */
var navDd=document.getElementById('nav-dd');
var navDdBtn=document.getElementById('nav-dd-btn');
if(navDd && navDdBtn){
  navDdBtn.addEventListener('click',function(e){
    e.stopPropagation();
    var open=navDd.classList.toggle('open');
    navDdBtn.setAttribute('aria-expanded',open?'true':'false');
  });
  document.addEventListener('click',function(e){
    if(!navDd.contains(e.target)){
      navDd.classList.remove('open');
      navDdBtn.setAttribute('aria-expanded','false');
    }
  });
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape'){
      navDd.classList.remove('open');
      navDdBtn.setAttribute('aria-expanded','false');
    }
  });
}

/* ================= 启动 ================= */
var rzT=null;
function scheduleRebuild(){
  clearTimeout(rzT);
  rzT=setTimeout(function(){ rebuild(); if(!RM) dustResize(); },160);
}
window.addEventListener('resize',scheduleRebuild);
window.addEventListener('orientationchange',scheduleRebuild);
/* 监听画布自身显示尺寸变化，移动端地址栏伸缩也能捕获 */
if(window.ResizeObserver){ new ResizeObserver(scheduleRebuild).observe(sky); }
/* 部分移动端浏览器首屏视口延迟确定，补做延迟重构建 */
setTimeout(scheduleRebuild,350);
setTimeout(scheduleRebuild,1500);
rebuild();
if(RM){ drawFrame(0); }
else{ requestAnimationFrame(loop); }
})();
