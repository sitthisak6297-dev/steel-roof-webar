import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
const $=id=>document.getElementById(id), reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const state={ready:false,gatesOpen:false,roofVisible:true};
let renderer,scene,camera,controls,model,roof,gates=[],bounds,gateTween,cameraTween,raf=0,dirty=true;
const announce=text=>$('status').textContent=text;
function invalidate(){dirty=true;if(!raf)raf=requestAnimationFrame(draw);}
const ease=t=>t*t*(3-2*t);
function draw(now){
 raf=0;let moving=false;
 if(gateTween){const t=Math.min(1,(now-gateTween.start)/gateTween.duration);gates.forEach((g,i)=>g.node.quaternion.slerpQuaternions(gateTween.from[i],gateTween.to[i],ease(t)));moving=t<1;dirty=true;if(t===1){gateTween=null;announce(state.gatesOpen?'เปิดประตูทั้งสองบานแล้ว':'ปิดประตูทั้งสองบานแล้ว');}}
 if(cameraTween){const t=Math.min(1,(now-cameraTween.start)/cameraTween.duration);camera.position.lerpVectors(cameraTween.from,cameraTween.to,ease(t));controls.target.lerpVectors(cameraTween.targetFrom,cameraTween.targetTo,ease(t));dirty=true;moving ||= t<1;if(t===1)cameraTween=null;}
 const changed=controls?.update();if(dirty||changed){renderer.render(scene,camera);dirty=false;}if(moving||changed)invalidate();
}
function fitPose(){
 // Use a stable box that includes the full gate swing, even when the roof is hidden.
 const target=bounds.getCenter(new THREE.Vector3());const direction=new THREE.Vector3(.16,.50,1).normalize();
 const right=new THREE.Vector3().crossVectors(camera.up,direction).normalize(),up=new THREE.Vector3().crossVectors(direction,right).normalize();
 const vtan=Math.tan(THREE.MathUtils.degToRad(camera.fov/2)),htan=vtan*camera.aspect;let distance=0;
 for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){const p=new THREE.Vector3(x,y,z).sub(target);distance=Math.max(distance,p.dot(direction)+Math.abs(p.dot(right))/htan,p.dot(direction)+Math.abs(p.dot(up))/vtan);}
 return {target,position:target.clone().addScaledVector(direction,distance*1.13)};
}
function resetView(animate=true){
 if(!state.ready)return;controls.enableDamping=false;controls.update();controls.enableDamping=true;
 const p=fitPose();if(animate&&!reduced)cameraTween={start:performance.now(),duration:650,from:camera.position.clone(),to:p.position,targetFrom:controls.target.clone(),targetTo:p.target};else{cameraTween=null;camera.position.copy(p.position);controls.target.copy(p.target);controls.update();}
 $('view-label').textContent='มุมเริ่มต้น';announce('รีเซ็ตมุมมองแล้ว');invalidate();
}
function setGates(open){
 if(!state.ready)return;state.gatesOpen=open;gateTween={start:performance.now(),duration:reduced?1:850,from:gates.map(g=>g.node.quaternion.clone()),to:gates.map(g=>(open?g.open:g.closed).clone())};
 $('gates').setAttribute('aria-pressed',String(open));$('gate-label').textContent=open?'ปิดประตู':'เปิดประตู';announce(open?'กำลังเปิดประตู':'กำลังปิดประตู');invalidate();
}
function setRoof(visible){if(!state.ready)return;roof.visible=visible;state.roofVisible=visible;$('roof').setAttribute('aria-pressed',String(!visible));$('roof-label').textContent=visible?'ถอดหลังคา':'ใส่หลังคา';announce(visible?'ใส่แผ่นหลังคาแล้ว':'ถอดเฉพาะแผ่นหลังคาแล้ว โครงเหล็กยังแสดงอยู่');invalidate();}
function resize(){if(!renderer)return;const w=$('canvas-host').clientWidth,h=$('canvas-host').clientHeight;if(!w||!h)return;renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();if(state.ready)resetView(false);invalidate();}
function fail(error){console.error('[SteelRoof]',error);$('loading').hidden=false;$('load-title').textContent='เปิดโมเดลไม่สำเร็จ';$('load-detail').textContent='กรุณาเปิดผ่านเซิร์ฟเวอร์ในเครื่อง แล้วลองใหม่';$('progress').hidden=true;$('retry').hidden=false;document.querySelector('.spinner').hidden=true;}
$('gates').onclick=()=>setGates(!state.gatesOpen);$('roof').onclick=()=>setRoof(!state.roofVisible);$('reset').onclick=()=>resetView();$('retry').onclick=()=>location.reload();
$('ar').onclick=()=>{
 $('ar-message').textContent=window.isSecureContext?'เปิดหน้า AR บนมือถือที่รองรับ เพื่อวางโมเดลบนพื้นจริง กล้องจะขอสิทธิ์เมื่อเริ่ม AR':'หน้า 3D ใช้งานในเครือข่ายบ้านได้ แต่การวาง AR ต้องเปิดผ่าน HTTPS บนมือถือที่รองรับ';
 $('ar-dialog').showModal();
};$('ar-close').onclick=()=>$('ar-dialog').close();
async function start(){
 renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setClearColor('#f1f5f3');renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
 renderer.domElement.setAttribute('aria-label','โมเดล 3D ลากเพื่อหมุน ใช้สองนิ้วเพื่อซูมและเลื่อน');renderer.domElement.tabIndex=0;$('canvas-host').append(renderer.domElement);
 scene=new THREE.Scene();const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();scene.environment=pmrem.fromScene(room,.04).texture;room.dispose();pmrem.dispose();scene.environmentIntensity=.7;
 scene.add(new THREE.HemisphereLight(0xf1f6ff,0x65796e,2));const sun=new THREE.DirectionalLight(0xfff5df,2.2);sun.position.set(-4,8,5);scene.add(sun);
 camera=new THREE.PerspectiveCamera(40,1,.02,200);controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.09;controls.minDistance=1.2;controls.maxDistance=35;controls.maxPolarAngle=Math.PI*.95;controls.minPolarAngle=.03;controls.screenSpacePanning=true;controls.touches.ONE=THREE.TOUCH.ROTATE;controls.touches.TWO=THREE.TOUCH.DOLLY_PAN;controls.listenToKeyEvents(renderer.domElement);
 controls.addEventListener('change',invalidate);controls.addEventListener('start',()=>{cameraTween=null;$('view-label').textContent='มุมอิสระ';});renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();fail(new Error('WebGL context lost'));});
 new ResizeObserver(resize).observe($('canvas-host'));resize();
 const gltf=await new GLTFLoader().loadAsync('./models/SteelRoof_New_From_Drawing.glb',e=>$('progress').value=Math.min(99,Math.round(e.loaded/(e.total||556252)*100)));
 model=gltf.scene;roof=model.getObjectByName('Roof_Sheets');if(!roof)throw new Error('Missing Roof_Sheets');
 gates=['Gate_Left','Gate_Right'].map((name,i)=>{const node=model.getObjectByName(name);if(!node||node.children.length!==7)throw new Error('Invalid gate hierarchy: '+name);const closed=node.quaternion.clone();const degrees=node.userData.open_angle_degrees??(i===0?-90:90);return {node,closed,open:closed.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),THREE.MathUtils.degToRad(degrees)))};});
 scene.add(model);bounds=new THREE.Box3().setFromObject(model);bounds.max.z=Math.max(bounds.max.z,3.85);roof.visible=true;state.ready=true;$('loading').hidden=true;for(const id of ['gates','roof','reset','ar'])$(id).disabled=false;resetView(false);announce('ประตูปิด · ใส่หลังคา');
 // Read-only diagnostics for QA; interactions still use the same UI handlers.
 window.steelRoofDiagnostics=()=>{model.updateMatrixWorld(true);return {...state,gateAnimating:!!gateTween,cameraAnimating:!!cameraTween,camera:camera.position.toArray(),target:controls.target.toArray(),roofChildren:roof.children.map(n=>n.name),gates:gates.map(g=>({name:g.node.name,quaternion:g.node.quaternion.toArray(),position:g.node.position.toArray(),children:g.node.children.map(n=>n.name),meeting:g.node.getObjectByName(g.node.name+'_MeetingStile').getWorldPosition(new THREE.Vector3()).toArray()})),steelVisible:model.getObjectByName('Truss400_Left_Top')?.visible,meshCount:(()=>{let n=0;model.traverse(o=>{if(o.isMesh)n++;});return n;})()};};
 if(document.modelContext?.registerTool){try{await document.modelContext.registerTool({name:'set_steel_roof_view',description:'Open or close both gates, show or hide roof sheets, or reset camera in the current steel roof viewer.',inputSchema:{type:'object',properties:{action:{type:'string',enum:['open_gates','close_gates','hide_roof','show_roof','reset_view']}},required:['action'],additionalProperties:false},execute:async input=>{if(!input||Object.keys(input).length!==1||!['open_gates','close_gates','hide_roof','show_roof','reset_view'].includes(input.action))throw new Error('Invalid action');const actions={open_gates:()=>setGates(true),close_gates:()=>setGates(false),hide_roof:()=>setRoof(false),show_roof:()=>setRoof(true),reset_view:()=>resetView()};actions[input.action]();await new Promise(resolve=>{const done=()=>gateTween||cameraTween?requestAnimationFrame(done):resolve();requestAnimationFrame(done);});return {...state};}},{signal:lifecycle.signal});}catch(error){console.warn('Optional modelContext unavailable',error);}}
}
const lifecycle=new AbortController();window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});start().catch(fail);
